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

describe("fetchGlobalTop — 4-stufige Fallback-Kaskade (#154/#169 FB-8/#global)", () => {
  it("tree_nodes fehlt → fällt NUR eine Stufe (die FB-8-Spalten bleiben)", async () => {
    // #global: Der Baumstand hat eine eigene Stufe. Läge er in COLS_FULL, nähme ein fehlendes
    // `tree_nodes` alle FB-8-Detailspalten mit — genau der Datenverlust aus #197, nur eine Ebene höher.
    const { fetchGlobalTop } = await loadBoard();
    const urls = [];
    global.fetch = vi.fn(async (url) => {
      urls.push(url);
      if (urls.length === 1) return { status: 400, ok: false };                       // tree_nodes fehlt
      return { status: 200, ok: true, json: async () => [{ name: "A", score: 5 }] };
    });
    expect(await fetchGlobalTop(3)).toEqual([{ name: "A", score: 5 }]);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("tree_nodes");                                           // oberste Stufe
    expect(urls[1]).not.toContain("tree_nodes");
    expect(urls[1]).toContain("best_streak");                                          // FB-8 überlebt den Rückfall
    expect(urls[1]).toContain("limit=3");
  });
  it("FB-8-Spalten fehlen → fällt auf die archetypes-Zwischenstufe zurück (Icons bleiben)", async () => {
    const { fetchGlobalTop } = await loadBoard();
    const urls = [];
    global.fetch = vi.fn(async (url) => {
      urls.push(url);
      if (urls.length < 3) return { status: 400, ok: false };                         // TREE + FULL beide 400
      return { status: 200, ok: true, json: async () => [{ name: "A", score: 5 }] };
    });
    expect(await fetchGlobalTop(3)).toEqual([{ name: "A", score: 5 }]);
    expect(urls).toHaveLength(3);
    expect(urls[2]).toContain("archetypes");                                           // Zwischenstufe: archetypes bleibt
    expect(urls[2]).not.toContain("best_streak");                                      // aber ohne FB-8-Spalten
  });
  it("auch archetypes fehlt → fällt weiter auf die Basis-Spalten zurück", async () => {
    const { fetchGlobalTop } = await loadBoard();
    const urls = [];
    global.fetch = vi.fn(async (url) => {
      urls.push(url);
      if (urls.length < 4) return { status: 400, ok: false };                         // TREE + FULL + ARCH alle 400
      return { status: 200, ok: true, json: async () => [] };
    });
    expect(await fetchGlobalTop()).toEqual([]);
    expect(urls).toHaveLength(4);
    expect(urls[3]).not.toContain("archetypes");                                       // Basis-Stufe
    expect(urls[3]).toContain("select=id,name,score,level,tricks,cycles,created_at");   // #229 N2: id vorangestellt
  });

  /* #global: Das Global-Board zeigt NUR Casual-Läufe (board is null) — Ranglisten-Läufe fahren auf fixer
     Baseline und gehören ins Wochen-Board. Der Filter ist die ZWEITE Achse, an der die Abfrage scheitern
     kann; sie ist von den Spalten unabhängig und braucht deshalb ihren eigenen Rückfall. */
  it("filtert auf Casual-Läufe (board is null)", async () => {
    const { fetchGlobalTop } = await loadBoard();
    const urls = [];
    global.fetch = vi.fn(async (url) => { urls.push(url); return { status: 200, ok: true, json: async () => [] }; });
    await fetchGlobalTop();
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("board=is.null");
  });
  it("fehlt die board-Spalte ganz, läuft die Kaskade OHNE Filter noch einmal (statt leer zu bleiben)", async () => {
    const { fetchGlobalTop } = await loadBoard();
    const urls = [];
    global.fetch = vi.fn(async (url) => {
      urls.push(url);
      // Jede gefilterte Anfrage 400t — nicht an den Spalten, sondern am board=is.null.
      if (String(url).includes("board=is.null")) return { status: 400, ok: false };
      return { status: 200, ok: true, json: async () => [{ name: "A", score: 5 }] };
    });
    expect(await fetchGlobalTop()).toEqual([{ name: "A", score: 5 }]);
    expect(urls.filter((u) => u.includes("board=is.null"))).toHaveLength(4);  // erst alle Spalten-Stufen …
    expect(urls[4]).not.toContain("board=is.null");                           // … dann ohne Filter, oberste Stufe
    expect(urls[4]).toContain("tree_nodes");
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

describe("fetchSeedTop — Challenge-Board (Top-N pro Seed, #205)", () => {
  it("fragt genau den Seed ab (seed=eq.N), Score-sortiert + limit", async () => {
    const { fetchSeedTop } = await loadBoard();
    let url;
    global.fetch = vi.fn(async (u) => { url = u; return { status: 200, ok: true, json: async () => [{ id: 1, name: "A", score: 9, seed: 123 }] }; });
    const rows = await fetchSeedTop(123, 3);
    expect(rows).toEqual([{ id: 1, name: "A", score: 9, seed: 123 }]);
    expect(url).toContain("seed=eq.123");
    expect(url).toContain("order=score.desc");
    expect(url).toContain("limit=3");
  });
  it("ungültiger Seed → [] ohne fetch", async () => {
    const { fetchSeedTop } = await loadBoard();
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    expect(await fetchSeedTop(undefined)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("fetchBoardTop — getrennte Ranglisten-Boards (§7)", () => {
  it("fragt genau das Board ab (board=eq.<board>), Score-sortiert + limit", async () => {
    const { fetchBoardTop } = await loadBoard();
    let url;
    global.fetch = vi.fn(async (u) => { url = u; return { status: 200, ok: true, json: async () => [{ id: 1, name: "S", score: 9 }] }; });
    const rows = await fetchBoardTop("standard", 7);
    expect(rows).toEqual([{ id: 1, name: "S", score: 9 }]);
    expect(url).toContain("board=eq.standard");
    expect(url).toContain("order=score.desc");
    expect(url).toContain("limit=7");
  });
  it("degradiert graceful: fehlt die `board`-Spalte (400 auf allen Stufen) → [] statt Fehler", async () => {
    const { fetchBoardTop } = await loadBoard();
    global.fetch = vi.fn(async () => ({ status: 400, ok: false }));
    expect(await fetchBoardTop("meister")).toEqual([]);
  });
  it("wirft bei echtem Serverfehler (5xx, kein Schema-Problem)", async () => {
    const { fetchBoardTop } = await loadBoard();
    global.fetch = vi.fn(async () => ({ status: 500, ok: false }));
    await expect(fetchBoardTop("standard")).rejects.toThrow(/500/);
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
  // #195: die FB-8-Strip-Kaskade (voll → ohne FB-8 → ohne archetypes) war ungetestet — beide bisherigen Tests
  // schickten Einträge OHNE FB-8-Felder (hasFb8 immer false). Ein echter Run mit FB-8-Feldern gegen eine DB ohne
  // FB-8-Spalten würde sonst 3× 400en und (via .catch der Aufrufer) still nie veröffentlichen, ohne dass ein Test anschlägt.
  const fb8Entry = () => ({
    name: "X", score: 9, level: 2, tricks: 3, cycles: 2, archetypes: "fire,ice",
    best_streak: 7, perks: "a", skills: "b", max_formations: 4, formation_score: 100,
    crits: 2, wins: 30, crit_bonus_score: 500, best_trick_score: 900,
  });
  /* #global: `tree_nodes` bekommt eine EIGENE Strip-Stufe VOR den FB-8-Feldern. Steckte der Baumstand in
     EXTRA_FIELDS, nähme eine fehlende `tree_nodes`-Spalte die kompletten FB-8-Detailfelder mit — dieselbe
     Klasse stillen Datenverlusts wie #197, nur eine Ebene höher. */
  it("#global-Strip-Kaskade: voll → ohne tree_nodes (FB-8 bleibt) → ohne FB-8 → ohne archetypes", async () => {
    const { publishRun } = await loadBoard();
    const bodies = [];
    global.fetch = vi.fn(async (_url, opts) => {
      bodies.push(JSON.parse(opts.body));
      return bodies.length < 4 ? { status: 400, ok: false } : { status: 201, ok: true };
    });
    await publishRun({ ...fb8Entry(), tree_nodes: 24 });
    expect(bodies).toHaveLength(4);
    expect(bodies[0].tree_nodes).toBe(24);                 // Stufe 1: alles
    expect(bodies[1].tree_nodes).toBeUndefined();          // Stufe 2: NUR der Baumstand fällt …
    expect(bodies[1].best_streak).toBe(7);                 // … die FB-8-Felder überleben
    expect(bodies[1].archetypes).toBe("fire,ice");
    expect(bodies[2].best_streak).toBeUndefined();         // Stufe 3: FB-8 gestript
    expect(bodies[2].archetypes).toBe("fire,ice");
    expect(bodies[3].archetypes).toBeUndefined();          // Stufe 4: Basis
    expect(bodies[3].name).toBe("X");
  });
  it("#global: ohne tree_nodes im Payload entfällt die Extra-Stufe (kein Leerlauf-Retry)", async () => {
    const { publishRun } = await loadBoard();
    const bodies = [];
    global.fetch = vi.fn(async (_url, opts) => {
      bodies.push(JSON.parse(opts.body));
      return bodies.length < 2 ? { status: 400, ok: false } : { status: 201, ok: true };
    });
    await publishRun(fb8Entry());                          // Alt-Aufrufer ohne Baumstand
    expect(bodies).toHaveLength(2);
    expect(bodies[1].best_streak).toBeUndefined();         // direkt die FB-8-Stufe, keine tree-Zwischenrunde
    expect(bodies[1].archetypes).toBe("fire,ice");
  });
  it("FB-8-Strip-Kaskade #195: voll → ohne FB-8 (archetypes bleibt) → ohne archetypes (Basis)", async () => {
    const { publishRun } = await loadBoard();
    const bodies = [];
    global.fetch = vi.fn(async (_url, opts) => {
      bodies.push(JSON.parse(opts.body));
      return bodies.length < 3 ? { status: 400, ok: false } : { status: 201, ok: true };
    });
    await publishRun(fb8Entry());
    expect(bodies).toHaveLength(3);
    // Stufe 1: volles Schema (FB-8-Felder + archetypes vorhanden)
    expect(bodies[0].best_streak).toBe(7);
    expect(bodies[0].crit_bonus_score).toBe(500);
    expect(bodies[0].archetypes).toBe("fire,ice");
    // Stufe 2: FB-8 gestript, archetypes UND Basisfelder bleiben erhalten
    expect(bodies[1].best_streak).toBeUndefined();
    expect(bodies[1].crit_bonus_score).toBeUndefined();
    expect(bodies[1].archetypes).toBe("fire,ice");
    expect(bodies[1].name).toBe("X");
    expect(bodies[1].score).toBe(9);
    // Stufe 3: auch archetypes gestript → Basis
    expect(bodies[2].archetypes).toBeUndefined();
    expect(bodies[2].best_streak).toBeUndefined();
    expect(bodies[2].name).toBe("X");
  });
  it("FB-8-Strip-Kaskade #195: Stopp auf Stufe 2, sobald der FB-8-gestripte Insert greift (kein archetypes-Strip)", async () => {
    const { publishRun } = await loadBoard();
    const bodies = [];
    global.fetch = vi.fn(async (_url, opts) => {
      bodies.push(JSON.parse(opts.body));
      return bodies.length === 1 ? { status: 400, ok: false } : { status: 201, ok: true };
    });
    await publishRun(fb8Entry());
    expect(bodies).toHaveLength(2);          // kein dritter Versuch
    expect(bodies[1].best_streak).toBeUndefined(); // FB-8 gestript
    expect(bodies[1].archetypes).toBe("fire,ice"); // archetypes bleibt (Icons erhalten)
  });

  // #229 N2: publishRun gibt die eingefügte Zeile (mit server-seitiger id) zurück (return=representation),
  // damit der Aufrufer den eigenen Lauf im Board EINDEUTIG markieren kann statt per name+score-Heuristik.
  it("#229 N2: gibt die eingefügte Zeile (mit id) zurück", async () => {
    const { publishRun } = await loadBoard();
    global.fetch = vi.fn(async () => ({ status: 201, ok: true, json: async () => [{ id: 77, name: "X", score: 9 }] }));
    const saved = await publishRun({ name: "X", score: 9, level: 1, tricks: 1, cycles: 1 });
    expect(saved).toEqual({ id: 77, name: "X", score: 9 });
  });
  it("#229 N2: fehlender representation-Body → null, ohne zu werfen (defensiv)", async () => {
    const { publishRun } = await loadBoard();
    global.fetch = vi.fn(async () => ({ status: 201, ok: true })); // kein json()
    await expect(publishRun({ name: "X", score: 9, level: 1, tricks: 1, cycles: 1 })).resolves.toBeNull();
  });
  it("strippt die FB-8-Felder + seed bei 400 (fehlende Spalten), archetypes bleibt", async () => {
    const { publishRun } = await loadBoard();
    const bodies = [];
    global.fetch = vi.fn(async (_u, opts) => {
      bodies.push(JSON.parse(opts.body));
      return bodies.length === 1 ? { status: 400, ok: false } : { status: 201, ok: true };
    });
    await publishRun({ name: "M", score: 9, level: 1, tricks: 1, cycles: 1, archetypes: "fire",
      best_streak: 3, seed: 42, board: "standard" });
    expect(bodies).toHaveLength(2);
    expect(bodies[0].best_streak).toBe(3);             // Stufe 1: voll (mit FB-8)
    expect(bodies[0].seed).toBe(42);                   // ... inkl. #205 seed
    expect(bodies[0].board).toBe("standard");          // ... inkl. §7 board
    expect(bodies[1].seed).toBeUndefined();            // Stufe 2: seed gestript
    expect(bodies[1].board).toBeUndefined();           // §7 board ebenfalls gestript (Spalte fehlt)
    expect(bodies[1].best_streak).toBeUndefined();     // FB-8 ebenfalls gestript
    expect(bodies[1].archetypes).toBe("fire");         // archetypes bleibt (Icons)
  });
});
