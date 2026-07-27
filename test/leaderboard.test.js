import { describe, it, expect, vi, afterEach } from "vitest";

// #154: leaderboard.js hatte 0 % Coverage — inkl. der Schema-Fallback-Zweige, die eine noch nicht migrierte
// DB-Spalte (`archetypes`) abfangen. Bricht ein Fallback, fällt die ganze Bestenliste still aus (alle Aufrufer
// schlucken Fehler). BASE/KEY/PREVIEW werden beim MODUL-Laden aus import.meta.env gelesen → je Konfiguration
// frisch importieren (vi.resetModules + vi.stubEnv), damit die Konstanten neu ausgewertet werden.
async function loadBoard({ preview = false } = {}) {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", "https://db.test");
  vi.stubEnv("VITE_SUPABASE_KEY", "anon-key");
  vi.stubEnv("VITE_PREVIEW", preview ? "1" : "0");
  return import("../src/game/leaderboard.js");
}

const realFetch = global.fetch;
afterEach(() => { vi.unstubAllEnvs(); global.fetch = realFetch; });

describe("fetchGlobalTop — 3-stufige Fallback-Kaskade (#154/#169 FB-8)", () => {
  it("FB-8-Spalten fehlen → fällt auf die archetypes-Zwischenstufe zurück (Icons bleiben)", async () => {
    const { fetchGlobalTop } = await loadBoard();
    const urls = [];
    global.fetch = vi.fn(async (url) => {
      urls.push(url);
      if (urls.length === 1) return { status: 400, ok: false };                       // FB-8-Spalten fehlen
      return { status: 200, ok: true, json: async () => [{ name: "A", score: 5 }] };
    });
    expect(await fetchGlobalTop(3)).toEqual([{ name: "A", score: 5 }]);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("best_streak");                                          // volle Stufe zuerst (FB-8-Spalten)
    expect(urls[1]).toContain("archetypes");                                           // Zwischenstufe: archetypes bleibt
    expect(urls[1]).not.toContain("best_streak");                                      // aber ohne FB-8-Spalten
    expect(urls[1]).toContain("limit=3");
  });
  it("auch archetypes fehlt → fällt weiter auf die Basis-Spalten zurück", async () => {
    const { fetchGlobalTop } = await loadBoard();
    const urls = [];
    global.fetch = vi.fn(async (url) => {
      urls.push(url);
      if (urls.length < 3) return { status: 400, ok: false };                         // FULL + ARCH beide 400
      return { status: 200, ok: true, json: async () => [] };
    });
    expect(await fetchGlobalTop()).toEqual([]);
    expect(urls).toHaveLength(3);
    expect(urls[2]).not.toContain("archetypes");                                       // Basis-Stufe
    expect(urls[2]).toContain("select=name,score,level,tricks,cycles,created_at");
  });
  it("bei 200 direkt die Zeilen, kein Retry", async () => {
    const { fetchGlobalTop } = await loadBoard();
    const fetchMock = vi.fn(async () => ({ status: 200, ok: true, json: async () => [] }));
    global.fetch = fetchMock;
    expect(await fetchGlobalTop()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("wirft bei nicht-400-Fehler (kein Fallback)", async () => {
    const { fetchGlobalTop } = await loadBoard();
    global.fetch = vi.fn(async () => ({ status: 500, ok: false }));
    await expect(fetchGlobalTop()).rejects.toThrow(/500/);
  });
});

describe("publishRun — PREVIEW-Short-Circuit + archetypes-Strip (#154)", () => {
  it("PREVIEW=1 schreibt NIE ins echte Board (Short-Circuit vor fetch)", async () => {
    const { publishRun } = await loadBoard({ preview: true });
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    await publishRun({ name: "X", score: 1, level: 1, tricks: 1, cycles: 1, archetypes: "fire" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("postet den Lauf; bei 400 erneut OHNE `archetypes` (gestript, Rest bleibt)", async () => {
    const { publishRun } = await loadBoard();
    const bodies = [];
    global.fetch = vi.fn(async (_url, opts) => {
      bodies.push(JSON.parse(opts.body));
      return bodies.length === 1 ? { status: 400, ok: false } : { status: 201, ok: true };
    });
    await publishRun({ name: "X", score: 9, level: 2, tricks: 3, cycles: 2, archetypes: "fire,ice" });
    expect(bodies).toHaveLength(2);
    expect(bodies[0].archetypes).toBe("fire,ice"); // erst MIT
    expect(bodies[1].archetypes).toBeUndefined();   // dann OHNE (gestript)
    expect(bodies[1].name).toBe("X");               // übrige Felder bleiben erhalten
    expect(bodies[1].score).toBe(9);
  });
  it("ohne `archetypes`-Feld kein Strip-Retry bei 400 (wirft direkt)", async () => {
    const { publishRun } = await loadBoard();
    const fetchMock = vi.fn(async () => ({ status: 400, ok: false }));
    global.fetch = fetchMock;
    await expect(publishRun({ name: "X", score: 1, level: 1, tricks: 1, cycles: 1 })).rejects.toThrow(/400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
