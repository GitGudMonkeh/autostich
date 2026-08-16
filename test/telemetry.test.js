import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* #telemetrie: telemetry.js liest BASE/KEY/PREVIEW beim MODUL-Laden aus import.meta.env (wie leaderboard.js)
   → je Konfiguration frisch importieren. Zusätzlich braucht das Modul einen localStorage (Node-Umgebung hat
   keinen) — hier ein minimaler In-Memory-Ersatz, damit Install-ID und Retry-Queue echt getestet werden. */
function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
}

async function loadTelemetry({ preview = false, configured = true } = {}) {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", configured ? "https://db.test" : "");
  vi.stubEnv("VITE_SUPABASE_KEY", configured ? "anon-key" : "");
  vi.stubEnv("VITE_PREVIEW", preview ? "1" : "0");
  return import("../src/game/telemetry.js");
}

const realFetch = global.fetch;
beforeEach(() => { global.localStorage = fakeStorage(); });
afterEach(() => { vi.unstubAllEnvs(); global.fetch = realFetch; delete global.localStorage; });

const STATE = {
  seed: 42, cycle: 30, trickNo: 300, score: 1234567.8, skills: ["SK_A"], perks: ["P_A"],
  familyTiers: { F_X: 2 }, glacierYield: 500.4, rerollsUsed: 3,
  decisionLog: [{ c: 1, k: "perk", o: ["P_A", "P_B"], p: "P_A" }],
  architectEnabled: true,
  architect: { buildings: [{ familyId: "AF_1", tier: 2, footprint: [0, 1, 2] }] },
};
const PROFILE = { nodes: { n1: 2 }, stichPoints: 4, deckPoints: 10, games: 12, ownedCosmetics: { "sunset:deck": true } };
const OPTIONS = { deckId: "deck_x", battlefieldId: "bf_x", telemetry: true, reducedFx: "aus" };

describe("buildRunPayload — reiner Payload-Bau", () => {
  it("rundet alle bigint-Felder (Float-Insert wäre ein 400 → stiller Datenverlust wie #241)", async () => {
    const { buildRunPayload } = await loadTelemetry();
    const p = buildRunPayload({ state: STATE, localEntry: {}, profile: PROFILE, options: OPTIONS,
      outcome: "completed", durationMs: 900123, runId: 1700000000000 });
    expect(p.score).toBe(1234568);
    expect(p.channels.glacier).toBe(500);
    expect(Number.isInteger(p.score) && Number.isInteger(p.channels.glacier)).toBe(true);
  });

  it("übernimmt Entscheidungs-Log, Baum und Kosmetik", async () => {
    const { buildRunPayload } = await loadTelemetry();
    const p = buildRunPayload({ state: STATE, localEntry: { archetypes: ["ice"] }, profile: PROFILE,
      options: OPTIONS, outcome: "completed", runId: 1 });
    expect(p.decisions).toEqual(STATE.decisionLog);
    expect(p.tree).toMatchObject({ nodes: { n1: 2 }, sp: 4, dp: 10, games: 12 });
    expect(p.cosmetics).toMatchObject({ owned: ["sunset:deck"], deck: "deck_x", battlefield: "bf_x" });
    expect(p.archetypes).toEqual(["ice"]);
    expect(p.buildings).toEqual([{ f: "AF_1", t: 2, n: 3 }]);
  });

  it("verträgt einen leeren/halben Lauf ohne zu werfen (Abbruch mitten im Spiel)", async () => {
    const { buildRunPayload } = await loadTelemetry();
    const p = buildRunPayload({ state: {}, localEntry: null, profile: null, options: null, outcome: "abandoned" });
    expect(p.outcome).toBe("abandoned");
    expect(p.decisions).toEqual([]);
    expect(p.score).toBeNull();
  });
});

describe("recordRun — Opt-out, Queue, Versand", () => {
  it("sendet den Lauf an die Telemetrie-Tabelle (nicht ans Leaderboard)", async () => {
    const t = await loadTelemetry();
    let url = null, body = null;
    global.fetch = vi.fn(async (u, opt) => { url = u; body = JSON.parse(opt.body); return { ok: true, status: 201 }; });
    t.recordRun({ enabled: true, state: STATE, profile: PROFILE, options: OPTIONS, outcome: "completed", runId: 7 });
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(url).toBe("https://db.test/rest/v1/autostich_telemetry");
    expect(body[0].install_id).toBeTruthy();   // pseudonyme ID gesetzt
    expect(body[0].run_id).toBe(7);
    expect(JSON.stringify(body)).not.toContain("autostich_scores");
  });

  it("Preview-Build schreibt in die Dev-Tabelle (Beta-Datensatz bleibt sauber)", async () => {
    const t = await loadTelemetry({ preview: true });
    let url = null;
    global.fetch = vi.fn(async (u) => { url = u; return { ok: true, status: 201 }; });
    t.recordRun({ enabled: true, state: STATE, profile: PROFILE, options: OPTIONS, runId: 1 });
    await vi.waitFor(() => expect(url).toBe("https://db.test/rest/v1/autostich_telemetry_dev"));
  });

  it("Opt-out: kein Netzverkehr UND nichts in der Warteschlange", async () => {
    const t = await loadTelemetry();
    global.fetch = vi.fn(async () => ({ ok: true, status: 201 }));
    const ok = t.recordRun({ enabled: false, state: STATE, profile: PROFILE, options: OPTIONS, runId: 1 });
    expect(ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
    expect([...global.localStorage._map.keys()].some((k) => k.includes("queue"))).toBe(false);
  });

  it("Netzfehler → Lauf bleibt für den nächsten Start in der Queue liegen", async () => {
    const t = await loadTelemetry();
    global.fetch = vi.fn(async () => { throw new Error("offline"); });
    t.recordRun({ enabled: true, state: STATE, profile: PROFILE, options: OPTIONS, runId: 1 });
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const q = JSON.parse(global.localStorage.getItem("as_telemetry_queue"));
    expect(q).toHaveLength(1);
    // Zweiter Start: Netz wieder da → Queue geht raus und ist danach leer.
    global.fetch = vi.fn(async () => ({ ok: true, status: 201 }));
    await t.flush();
    expect(JSON.parse(global.localStorage.getItem("as_telemetry_queue"))).toEqual([]);
  });

  it("4xx (Schema-Drift/RLS) verwirft den Batch, statt ihn ewig zu wiederholen", async () => {
    // Sonst blockiert EINE kaputte Zeile für immer alle nachfolgenden Läufe.
    const t = await loadTelemetry();
    global.fetch = vi.fn(async () => ({ ok: false, status: 400 }));
    t.recordRun({ enabled: true, state: STATE, profile: PROFILE, options: OPTIONS, runId: 1 });
    await vi.waitFor(() => expect(JSON.parse(global.localStorage.getItem("as_telemetry_queue"))).toEqual([]));
  });

  it("purge() leert die Warteschlange (Abschalten heißt wirklich aus)", async () => {
    const t = await loadTelemetry();
    global.fetch = vi.fn(async () => { throw new Error("offline"); });
    t.recordRun({ enabled: true, state: STATE, profile: PROFILE, options: OPTIONS, runId: 1 });
    await vi.waitFor(() => expect(global.localStorage.getItem("as_telemetry_queue")).toBeTruthy());
    t.purge();
    expect(global.localStorage.getItem("as_telemetry_queue")).toBeNull();
  });

  it("ohne konfiguriertes Supabase passiert gar nichts (lokaler Build)", async () => {
    const t = await loadTelemetry({ configured: false });
    global.fetch = vi.fn();
    expect(t.telemetryConfigured).toBe(false);
    expect(t.recordRun({ enabled: true, state: STATE, runId: 1 })).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("Install-ID bleibt über Läufe stabil (verkettet Läufe desselben Geräts)", async () => {
    const t = await loadTelemetry();
    expect(t.installId()).toBe(t.installId());
  });
});

describe("recordAbandoned — Abbruch beim Schließen des Tabs", () => {
  it("meldet genau EINMAL je Lauf", async () => {
    const t = await loadTelemetry();
    global.fetch = vi.fn(async () => ({ ok: true, status: 201 }));
    expect(t.recordAbandoned({ enabled: true, state: STATE, profile: PROFILE, options: OPTIONS, runId: 99 })).toBe(true);
    expect(t.recordAbandoned({ enabled: true, state: STATE, profile: PROFILE, options: OPTIONS, runId: 99 })).toBe(false);
  });

  it("ignoriert einen nie gestarteten Lauf (kein einziger Stich)", async () => {
    const t = await loadTelemetry();
    global.fetch = vi.fn();
    expect(t.recordAbandoned({ enabled: true, state: { trickNo: 0 }, runId: 5 })).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
