import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rankHighscores, loadGhost, saveGhost, loadHighscores, recordHighscore,
  loadOptions, loadUsername, saveUsername, loadSeenGuide, saveSeenGuide,
  recordRun, loadProfile, isNoBuyRun, isMonoStatRun, MONO_STAT_MIN,
  monoArchetypeOf, isAllArchetypesRun } from "../src/game/storage.js";
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
const DEFAULT_OPTIONS = { skin: "crt", muted: false, sfxVol: 0.4, musicVol: 0.2, deckId: "default", battlefieldId: "default", reducedFx: "auto" };

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
    expect(o.reducedFx).toBe("auto"); // #200: Alt-Optionen ohne den Schlüssel bekommen den Default
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

describe("#190 Challenge-Erkennung (rein) + sticky Flags", () => {
  const monoPicks = Array.from({ length: MONO_STAT_MIN }, () => "statCritChance");

  it("isNoBuyRun: nur natürlicher Abschluss mit 0 Käufen", () => {
    expect(isNoBuyRun({ completed: true, shopPurchases: 0 })).toBe(true);
    expect(isNoBuyRun({ completed: true, shopPurchases: 3 })).toBe(false); // gekauft
    expect(isNoBuyRun({ completed: false, shopPurchases: 0 })).toBe(false); // vorzeitig beendet
    expect(isNoBuyRun({ completed: true })).toBe(true); // shopPurchases fehlt → 0
    expect(isNoBuyRun(null)).toBe(false);
  });

  it("isMonoStatRun: kompletter Lauf, alle Stat-Picks identisch, Mindestanzahl", () => {
    expect(isMonoStatRun({ completed: true, statPicks: monoPicks })).toBe(true);
    expect(isMonoStatRun({ completed: true, statPicks: [...monoPicks.slice(1), "statFormMult"] })).toBe(false); // gemischt
    expect(isMonoStatRun({ completed: false, statPicks: monoPicks })).toBe(false); // vorzeitig beendet
    expect(isMonoStatRun({ completed: true, statPicks: ["statCritChance"] })).toBe(false); // < MONO_STAT_MIN
    expect(isMonoStatRun({ completed: true, statPicks: [] })).toBe(false);
    expect(isMonoStatRun({ completed: true })).toBe(false); // statPicks fehlt
  });

  // #215 Archetyp-Decks
  it("monoArchetypeOf: genau EIN Archetyp → dessen id, sonst null (nur natürlicher Abschluss)", () => {
    expect(monoArchetypeOf({ completed: true, archetypes: ["fire"] })).toBe("fire");
    expect(monoArchetypeOf({ completed: true, archetypes: ["fire", "fire"] })).toBe("fire"); // Duplikate egal
    expect(monoArchetypeOf({ completed: true, archetypes: ["fire", "ice"] })).toBe(null);     // gemischt
    expect(monoArchetypeOf({ completed: true, archetypes: [] })).toBe(null);
    expect(monoArchetypeOf({ completed: false, archetypes: ["fire"] })).toBe(null);           // vorzeitig beendet
    expect(monoArchetypeOf({ completed: true })).toBe(null);                                   // archetypes fehlt
    expect(monoArchetypeOf(null)).toBe(null);
  });

  it("isAllArchetypesRun: alle vier Fraktionen im selben Lauf", () => {
    expect(isAllArchetypesRun({ completed: true, archetypes: ["fire", "lightning", "ice", "plant"] })).toBe(true);
    expect(isAllArchetypesRun({ completed: true, archetypes: ["fire", "lightning", "ice"] })).toBe(false); // nur drei
    expect(isAllArchetypesRun({ completed: false, archetypes: ["fire", "lightning", "ice", "plant"] })).toBe(false); // vorzeitig
    expect(isAllArchetypesRun({ completed: true })).toBe(false);
  });

  describe("recordRun setzt + persistiert die sticky Flags", () => {
    beforeEach(() => { global.localStorage = mockLS(); });
    afterEach(() => { delete global.localStorage; });

    it("frisches Profil: Flags sind false", () => {
      expect(loadProfile().hadNoBuyRun).toBe(false);
      expect(loadProfile().hadMonoStatRun).toBe(false);
    });

    it("noBuy-Lauf setzt hadNoBuyRun und persistiert", () => {
      const { profile } = recordRun({ score: 100, ts: 1, completed: true, shopPurchases: 0, statPicks: [] });
      expect(profile.hadNoBuyRun).toBe(true);
      expect(profile.hadMonoStatRun).toBe(false);
      expect(loadProfile().hadNoBuyRun).toBe(true);
    });

    it("Mono-Stat-Lauf (mit Käufen) setzt nur hadMonoStatRun", () => {
      const { profile } = recordRun({ score: 100, ts: 1, completed: true, shopPurchases: 2, statPicks: monoPicks });
      expect(profile.hadMonoStatRun).toBe(true);
      expect(profile.hadNoBuyRun).toBe(false);
    });

    it("Flags bleiben sticky — ein späterer Lauf, der die Bedingung NICHT erfüllt, setzt sie nicht zurück", () => {
      recordRun({ score: 100, ts: 1, completed: true, shopPurchases: 0, statPicks: monoPicks }); // beide erfüllt
      const { profile } = recordRun({ score: 50, ts: 2, completed: false, shopPurchases: 5, statPicks: [] }); // nichts erfüllt
      expect(profile.hadNoBuyRun).toBe(true);
      expect(profile.hadMonoStatRun).toBe(true);
      expect(profile.games).toBe(2);
    });

    it("#215: Mono-Map + Bund-Flag werden sticky fortgeschrieben (schaltet deck_c5..c9)", () => {
      const base = { completed: true, score: 100, bestStreak: 1, crits: 0, durationMs: 1, ts: 1 };
      recordRun({ ...base, archetypes: ["fire"] });                              // Mono-Feuer
      expect(loadProfile().monoArchetypeRuns.fire).toBe(true);
      expect(loadProfile().hadAllArchetypesRun).toBe(false);
      recordRun({ ...base, archetypes: ["fire", "lightning", "ice", "plant"] }); // Element-Bund
      expect(loadProfile().monoArchetypeRuns.fire).toBe(true);                   // sticky: bleibt
      expect(loadProfile().hadAllArchetypesRun).toBe(true);
    });
  });
});
