import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rankHighscores, loadGhost, saveGhost, loadHighscores, recordHighscore,
  loadOptions, loadUsername, saveUsername, loadSeenGuide, saveSeenGuide } from "../src/game/storage.js";
import { GHOST_STEP } from "../src/game/constants.js";

// #152: node-Env hat kein localStorage → die Persistenz-Funktionen fielen bisher nur in ihre try/catch-Defaults
// und blieben ungetestet. Minimaler Map-basierter Mock, den die bare-`localStorage`-Zugriffe in storage.js sehen.
function mockLS() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
  };
}
const DEFAULT_OPTIONS = { skin: "crt", muted: false, sfxVol: 0.4, musicVol: 0.2 };

describe("rankHighscores", () => {
  it("sortiert nach Score↓ und behält Top 5", () => {
    let list = [];
    for (const sc of [50, 300, 120, 90, 400, 10, 260]) {
      list = rankHighscores(list, { score: sc, level: 1, tricks: 1, cycles: 0, ts: sc });
    }
    expect(list.map((e) => e.score)).toEqual([400, 300, 260, 120, 90]);
  });

  it("bricht Score-Gleichstand über mehr Stiche, dann jünger", () => {
    const list = rankHighscores(
      [{ score: 100, level: 2, tricks: 40, cycles: 0, ts: 1 }],
      { score: 100, level: 2, tricks: 55, cycles: 1, ts: 2 },
    );
    expect(list[0].tricks).toBe(55);
  });
});

describe("Geist-Persistenz + Versions-Migration (#152)", () => {
  beforeEach(() => { global.localStorage = mockLS(); });
  afterEach(() => { delete global.localStorage; });

  it("saveGhost → loadGhost rundet mit passendem step zurück", () => {
    saveGhost([10, 20, 30], 300);
    expect(loadGhost()).toEqual({ traj: [10, 20, 30], total: 300, step: GHOST_STEP });
  });
  it("veralteter step invalidiert die Trajektorie (die einzige echte Migration)", () => {
    global.localStorage.setItem("as_ghost", JSON.stringify({ traj: [1, 2, 3], total: 99, step: GHOST_STEP + 1 }));
    expect(loadGhost()).toEqual({ traj: [], total: 0, step: GHOST_STEP }); // verworfen → Defaults
  });
  it("passender step rundtrippt; korrupter JSON → Defaults", () => {
    global.localStorage.setItem("as_ghost", JSON.stringify({ traj: [7], total: 7, step: GHOST_STEP }));
    expect(loadGhost()).toEqual({ traj: [7], total: 7, step: GHOST_STEP });
    global.localStorage.setItem("as_ghost", "{kaputt");
    expect(loadGhost()).toEqual({ traj: [], total: 0, step: GHOST_STEP });
  });
});

describe("Optionen-Merge, Highscores & Flags (#152)", () => {
  beforeEach(() => { global.localStorage = mockLS(); });
  afterEach(() => { delete global.localStorage; });

  it("loadOptions backfillt fehlende Schlüssel aus DEFAULT_OPTIONS", () => {
    global.localStorage.setItem("as_options", JSON.stringify({ muted: true })); // nur EIN Feld gespeichert
    const o = loadOptions();
    expect(o.muted).toBe(true);   // gespeichertes bleibt
    expect(o.skin).toBe("crt");   // fehlender Default aufgefüllt
    expect(o.sfxVol).toBe(0.4);
    expect(o.musicVol).toBe(0.2);
  });
  it("loadOptions: korrupter JSON → reine Defaults", () => {
    global.localStorage.setItem("as_options", "nope");
    expect(loadOptions()).toEqual(DEFAULT_OPTIONS);
  });
  it("recordHighscore persistiert; loadHighscores liest zurück, Nicht-Array → []", () => {
    recordHighscore({ score: 100, level: 1, tricks: 5, cycles: 0, ts: 1 });
    recordHighscore({ score: 200, level: 1, tricks: 5, cycles: 0, ts: 2 });
    expect(loadHighscores().map((e) => e.score)).toEqual([200, 100]);
    global.localStorage.setItem("as_highscores", JSON.stringify({ not: "an array" }));
    expect(loadHighscores()).toEqual([]);
  });
  it("Username & SeenGuide runden durch localStorage", () => {
    expect(loadUsername()).toBe("");
    saveUsername("Tester");
    expect(loadUsername()).toBe("Tester");
    expect(loadSeenGuide()).toBe(false);
    saveSeenGuide();
    expect(loadSeenGuide()).toBe(true);
  });
  it("ohne localStorage fallen alle Leser sauber auf Defaults zurück (node-Default)", () => {
    delete global.localStorage;
    expect(loadGhost()).toEqual({ traj: [], total: 0, step: GHOST_STEP });
    expect(loadOptions()).toEqual(DEFAULT_OPTIONS);
    expect(loadHighscores()).toEqual([]);
    expect(loadUsername()).toBe("");
    expect(loadSeenGuide()).toBe(false);
  });
});

describe("VITE_PREVIEW-Präfix trennt Namespaces (#152)", () => {
  afterEach(() => { vi.unstubAllEnvs(); delete global.localStorage; });
  it("Preview-Build schreibt unter preview_… und lässt den echten Namespace unberührt", async () => {
    global.localStorage = mockLS();
    vi.resetModules();
    vi.stubEnv("VITE_PREVIEW", "1");
    const mod = await import("../src/game/storage.js"); // frisch → P = "preview_"
    mod.saveUsername("PreviewUser");
    expect(global.localStorage.getItem("preview_as_username")).toBe("PreviewUser");
    expect(global.localStorage.getItem("as_username")).toBeNull(); // echter Namespace isoliert
  });
});
