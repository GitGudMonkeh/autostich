import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rankHighscores, loadGhost, saveGhost, loadHighscores, recordHighscore,
  loadOptions, loadUsername, saveUsername, loadSeenGuide, saveSeenGuide,
  recordRun, loadProfile, isNoRerollRun,
  monoArchetypeOf, isAllArchetypesRun, migrateProfile, PROFILE_SCHEMA_VERSION } from "../src/game/storage.js";
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
const DEFAULT_OPTIONS = { skin: "crt", muted: false, sfxVol: 0.4, musicVol: 0.2, deckId: "default", battlefieldId: "default", reducedFx: "auto", haptics: true, archShowCombos: true, archShowForms: true, collapseScoreSource: true, collapseScoreTrend: true };

describe("rankHighscores", () => {
  it("sortiert nach Score↓ und behält die Top 20", () => {
    let list = [];
    // 25 Läufe (Scores 1..25) → nur die 20 besten (25..6) bleiben, absteigend.
    for (let sc = 1; sc <= 25; sc++) {
      list = rankHighscores(list, { score: sc, level: 1, tricks: 1, cycles: 0, ts: sc });
    }
    expect(list).toHaveLength(20);
    expect(list[0].score).toBe(25);
    expect(list[19].score).toBe(6);
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

describe("#229 T11 — Profil-Schema-Version + Migration", () => {
  beforeEach(() => { global.localStorage = mockLS(); });
  afterEach(() => { delete global.localStorage; });

  it("migrateProfile stempelt ein unversioniertes Alt-Profil auf die aktuelle Version, ohne Felder zu verlieren", () => {
    const legacy = { games: 3, bestScore: 500, masteryGrade: 2, monoArchetypeRuns: { fire: true } };
    const m = migrateProfile(legacy);
    expect(m.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
    expect(m.games).toBe(3);
    expect(m.bestScore).toBe(500);
    expect(m.masteryGrade).toBe(2);
    expect(m.monoArchetypeRuns).toEqual({ fire: true });
  });
  it("migrateProfile ist idempotent (aktuelles Profil bleibt unverändert)", () => {
    const cur = { schemaVersion: PROFILE_SCHEMA_VERSION, games: 1 };
    expect(migrateProfile(cur)).toEqual(cur);
  });
  it("migrateProfile gibt Nicht-Objekte unverändert zurück (defensiv)", () => {
    expect(migrateProfile(null)).toBe(null);
    expect(migrateProfile(undefined)).toBe(undefined);
  });
  it("loadProfile migriert ein gespeichertes Alt-Profil (kein schemaVersion) hoch + füllt Default-Felder", () => {
    global.localStorage.setItem("as_profile", JSON.stringify({ games: 7, bestScore: 900 }));
    const p = loadProfile();
    expect(p.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
    expect(p.games).toBe(7);
    expect(p.bestScore).toBe(900);
    expect(p.masteryGrade).toBe(0);          // fehlendes Feld aus DEFAULT_PROFILE ergänzt
    expect(p.monoArchetypeRuns).toEqual({});
  });
  it("recordRun persistiert die Schema-Version im Profil", () => {
    const { profile } = recordRun({ score: 100, ts: 1, completed: true, statPicks: [] });
    expect(profile.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
    expect(loadProfile().schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
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
    expect(o.haptics).toBe(true);     // #207: dito für den Haptik-Schlüssel
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
  // (#267: die Mono-Stat-Challenge ist entfernt — die Stat-Phase ist weg.)

  it("isNoRerollRun (#214 Sparfuchs): nur natürlicher Abschluss ohne benutzten Reroll", () => {
    expect(isNoRerollRun({ completed: true, rerollsUsed: 0 })).toBe(true);
    expect(isNoRerollRun({ completed: true, rerollsUsed: 2 })).toBe(false); // gererollt
    expect(isNoRerollRun({ completed: false, rerollsUsed: 0 })).toBe(false); // vorzeitig beendet
    expect(isNoRerollRun({ completed: true })).toBe(true); // rerollsUsed fehlt → 0
    expect(isNoRerollRun(null)).toBe(false);
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
      expect(loadProfile().hadNoRerollRun).toBe(false); // #214
    });

    it("#214: noReroll-Lauf setzt hadNoRerollRun (persistiert), ein Reroll-Lauf nicht", () => {
      const { profile } = recordRun({ score: 100, ts: 1, completed: true, rerollsUsed: 0, statPicks: [] });
      expect(profile.hadNoRerollRun).toBe(true);
      expect(loadProfile().hadNoRerollRun).toBe(true);
      global.localStorage = mockLS(); // frisches Profil
      const later = recordRun({ score: 100, ts: 2, completed: true, rerollsUsed: 3, statPicks: [] });
      expect(later.profile.hadNoRerollRun).toBe(false);
    });

    it("#217 Rang-Leiter: nur Meister-Läufe schalten den nächsten Rang frei (sequentiell)", () => {
      // Normaler Lauf mit riesigem Score → Rang bleibt 0 (zählt nicht).
      let p = recordRun({ score: 999_000_000, ts: 1, completed: true, statPicks: [] }).profile;
      expect(p.masteryGrade).toBe(0);
      // Meister-Lauf ≥ Rang-I-Schwelle → Rang 1 (nur EIN Rang trotz riesigem Score).
      p = recordRun({ score: 999_000_000, ts: 2, completed: true, statPicks: [], masterRun: true }).profile;
      expect(p.masteryGrade).toBe(1);
      // Normaler Lauf dazwischen ändert den Rang NICHT.
      p = recordRun({ score: 999_000_000, ts: 3, completed: true, statPicks: [] }).profile;
      expect(p.masteryGrade).toBe(1);
      // Nächster Meister-Lauf → Rang 2.
      p = recordRun({ score: 999_000_000, ts: 4, completed: true, statPicks: [], masterRun: true }).profile;
      expect(p.masteryGrade).toBe(2);
    });

    it("Flag bleibt sticky — ein späterer Lauf, der die Bedingung NICHT erfüllt, setzt es nicht zurück", () => {
      recordRun({ score: 100, ts: 1, completed: true, rerollsUsed: 0 }); // noReroll erfüllt
      const { profile } = recordRun({ score: 50, ts: 2, completed: false, rerollsUsed: 5 }); // nichts erfüllt
      expect(profile.hadNoRerollRun).toBe(true);
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
