import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rankHighscores, loadGhost, saveGhost, loadHighscores, recordHighscore,
  loadOptions, loadUsername, saveUsername, loadSeenGuide, saveSeenGuide,
  recordRun, loadProfile, isNoRerollRun,
  monoArchetypeOf, isAllArchetypesRun, migrateProfile, PROFILE_SCHEMA_VERSION,
  isGottgleichRun, isMeisterNoRerollRun, GOTTGLEICH_TRICK_MIN,
  saveActiveRun, loadActiveRun, clearActiveRun, ACTIVE_RUN_SCHEMA,
  saveProfile, wipeProfileStorage, saveOptions } from "../src/game/storage.js";
import { GHOST_STEP } from "../src/game/constants.js";
import { ONBOARDING_LINKS, NODE_IDS } from "../src/game/progression.js";

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
const DEFAULT_OPTIONS = { skin: "crt", muted: false, sfxVol: 0.4, musicVol: 0.2, deckId: "default", battlefieldId: "default", reducedFx: "aus", haptics: true, archShowCombos: true, archShowForms: true, collapseScoreSource: true, collapseScoreTrend: true, fxFrameGlow: false, fxHoloSwipe: false, fxHologrid: false, fxLaserSlice: false, fxBlackhole: false, fxLasergrid: false, fxBurnBeam: false, fxOverload: false, fxDisperse: false, fxFireworks: false, fxGoldRain: false, fxPrismaWave: false };

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
    const legacy = { games: 3, bestScore: 500, bestStreak: 7, monoArchetypeRuns: { fire: true } };
    const m = migrateProfile(legacy);
    expect(m.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
    expect(m.games).toBe(3);
    expect(m.bestScore).toBe(500);
    expect(m.bestStreak).toBe(7);
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
    expect(p.bestStreak).toBe(0);            // fehlendes Feld aus DEFAULT_PROFILE ergänzt
    expect(p.monoArchetypeRuns).toEqual({});
  });
  it("recordRun persistiert die Schema-Version im Profil", () => {
    const { profile } = recordRun({ score: 100, ts: 1, completed: true, statPicks: [] });
    expect(profile.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
    expect(loadProfile().schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
  });
});

describe("Progression/Upgrades — Profil-Felder, Migration, SP-Ernte, Onboarding (docs §1/§4/§6)", () => {
  beforeEach(() => { global.localStorage = mockLS(); });
  afterEach(() => { delete global.localStorage; });

  const runRec = (over = {}) => ({ score: 0, ts: 1, completed: true, ...over });

  it("frisches Profil trägt die neuen Felder mit Nullwerten", () => {
    const p = loadProfile();
    expect(p.stichPoints).toBe(0);
    expect(p.stichSpent).toBe(0);
    expect(p.nodes).toEqual({});
    expect(p.onboarding).toBe(0);
    expect(p.spRuns).toBe(0);
    expect(p.ownedCosmetics).toEqual({});
    expect(p.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
  });

  it("Migration v1 → v3 seedet die neuen Felder ohne Altfelder zu verlieren", () => {
    const v1 = { schemaVersion: 1, games: 4, bestScore: 700, bestStreak: 5 };
    const m = migrateProfile(v1);
    expect(m.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
    expect(m.games).toBe(4);
    expect(m.bestStreak).toBe(5);         // Altfeld erhalten
    expect(m.stichPoints).toBe(0);
    expect(m.nodes).toEqual({});
    expect(m.onboarding).toBe(0);
    expect(m.spRuns).toBe(0);
    expect(m.ownedCosmetics).toEqual({}); // v2 → v3: Deck-Werkstatt-Besitz
    expect(m.deckPoints).toBe(0);         // v3 → v4: DP-Ökonomie
    expect(m.deckSpent).toBe(0);
  });

  it("Migration v2 → v3 ergänzt die Kosmetik-Besitz-Map", () => {
    const m = migrateProfile({ schemaVersion: 2, stichPoints: 7, nodes: { B1: 1 } });
    expect(m.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
    expect(m.stichPoints).toBe(7);        // Altfeld erhalten
    expect(m.nodes).toEqual({ B1: 1 });
    expect(m.ownedCosmetics).toEqual({});
  });

  it("gespeicherte SP-/Baum-/Onboarding-Werte überleben migrateProfile (nicht überschrieben)", () => {
    const v2 = { schemaVersion: 2, stichPoints: 12, stichSpent: 5, nodes: { B1: 1 }, onboarding: 6, spRuns: 3 };
    const m = migrateProfile(v2);
    expect(m.stichPoints).toBe(12);
    expect(m.nodes).toEqual({ B1: 1 });
    expect(m.onboarding).toBe(6);
    expect(m.spRuns).toBe(3);
  });

  it("Leer-/Korrupt-Pfad liefert frische nodes-Referenz (kein geteilter Modul-Default)", () => {
    const a = loadProfile();
    a.nodes.HACK = 1; // mutiere die eine Instanz
    delete global.localStorage;
    const b = loadProfile();
    expect(b.nodes).toEqual({}); // NICHT von a vergiftet
  });

  it("Onboarding rückt nur bei natürlichem Abschluss vor, gedeckelt bei 6", () => {
    let p;
    for (let i = 1; i <= ONBOARDING_LINKS; i++) {
      p = recordRun(runRec({ ts: i })).profile;
      expect(p.onboarding).toBe(i);
    }
    // 7. abgeschlossener Lauf → bleibt bei 6.
    p = recordRun(runRec({ ts: 7 })).profile;
    expect(p.onboarding).toBe(6);
    // Vorzeitiges Beenden rückt nicht vor (frisches Profil).
    global.localStorage = mockLS();
    const q = recordRun(runRec({ completed: false })).profile;
    expect(q.onboarding).toBe(0);
    expect(q.games).toBe(1); // games zählt trotzdem
  });

  it("während des Onboardings gibt es NULL SP; danach Grundstock + Meilensteine", () => {
    // 6 Onboarding-Läufe mit riesigem Score → immer noch 0 SP.
    let p;
    for (let i = 1; i <= ONBOARDING_LINKS; i++) p = recordRun(runRec({ ts: i, score: 100_000_000 })).profile;
    expect(p.onboarding).toBe(6);
    expect(p.stichPoints).toBe(0);
    expect(p.spRuns).toBe(0);
    // 1. Lauf NACH dem Onboarding: +1 Grundstock + 5 Meilenstein-SP (100 Mio) = 6.
    p = recordRun(runRec({ ts: 7, score: 100_000_000 })).profile;
    expect(p.stichPoints).toBe(6);
    expect(p.spRuns).toBe(1);
    // Nächster, kleiner Lauf: nur +1.
    p = recordRun(runRec({ ts: 8, score: 10_000 })).profile;
    expect(p.stichPoints).toBe(7);
    expect(p.spRuns).toBe(2);
  });

  it("Treue-Drip: der 10. SP-Lauf gibt +5 extra", () => {
    let p;
    for (let i = 1; i <= ONBOARDING_LINKS; i++) p = recordRun(runRec({ ts: i })).profile; // Onboarding fertig
    // 9 SP-Läufe à +1 → 9 SP.
    for (let i = 0; i < 9; i++) p = recordRun(runRec({ ts: 100 + i })).profile;
    expect(p.stichPoints).toBe(9);
    expect(p.spRuns).toBe(9);
    // 10. SP-Lauf → +1 Grundstock + 5 Drip = +6 → 15.
    p = recordRun(runRec({ ts: 200 })).profile;
    expect(p.spRuns).toBe(10);
    expect(p.stichPoints).toBe(15);
  });

  it("#299 §2: Onboarding-Abschluss (6/6) schenkt das Genesis-Pack + meldet unlocks", () => {
    let res, p;
    for (let i = 1; i <= ONBOARDING_LINKS - 1; i++) p = recordRun(runRec({ ts: i })).profile; // 5/6
    expect(p.ownedCosmetics["pack:genesis"]).toBeUndefined();
    res = recordRun(runRec({ ts: 6 })); // 6/6 → Abschluss
    expect(res.profile.onboarding).toBe(6);
    expect(res.profile.ownedCosmetics["pack:genesis"]).toBe(true);
    expect(res.unlocks.some((u) => u.type === "onboardingDone" && u.target === "workshop")).toBe(true);
    // ein weiterer Lauf danach meldet keine neuen Onboarding-Unlocks mehr
    expect(recordRun(runRec({ ts: 7 })).unlocks).toEqual([]);
  });

  it("#299 DP: nach Onboarding native DP = floor(score/10M); SP laufen normal weiter", () => {
    let p;
    for (let i = 1; i <= ONBOARDING_LINKS; i++) p = recordRun(runRec({ ts: i })).profile; // Onboarding fertig
    expect(p.deckPoints).toBe(0);
    p = recordRun(runRec({ ts: 7, score: 55_000_000 })).profile;
    expect(p.deckPoints).toBe(5);          // 55 Mio → 5 DP (native)
    expect(p.stichPoints).toBe(1 + 2);     // SP weiter: +1 Grundstock + 2 Meilensteine (25M+50M)
  });

  it("#299 DP: bei vollem Baum zahlt die SP-Ökonomie DP statt SP; SP-Rest wird zu DP gefegt", () => {
    const allNodes = Object.fromEntries(NODE_IDS.map((id) => [id, 1]));
    saveProfile({ ...loadProfile(), onboarding: 6, nodes: allNodes, stichPoints: 100 });
    const p = recordRun(runRec({ ts: 1, score: 100_000_000 })).profile;
    expect(p.stichPoints).toBe(0);         // SP nutzlos → Rest zu DP gefegt
    expect(p.deckPoints).toBe(100 + 10 + 6); // gefegte 100 SP + native 10 + SP-Ökonomie (1+5) als DP
  });

  it("recordRun lässt gekaufte Knoten + ausgegebene SP unangetastet (nur Kauf/Respec ändern sie)", () => {
    // Profil mit einem gekauften Knoten + Onboarding fertig vorbereiten.
    saveProfile({ ...loadProfile(), onboarding: 6, stichPoints: 3, stichSpent: 2, nodes: { B1: 1 } });
    const p = recordRun(runRec({ ts: 1, score: 0 })).profile;
    expect(p.nodes).toEqual({ B1: 1 }); // Knoten bleiben
    expect(p.stichSpent).toBe(2);        // ausgegeben bleibt
    expect(p.stichPoints).toBe(4);       // +1 Grundstock (Onboarding war fertig)
  });

  it("saveProfile rundet durch localStorage und stempelt die Schema-Version", () => {
    const saved = saveProfile({ stichPoints: 20, nodes: { A1: 1 }, onboarding: 6 });
    expect(saved.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
    const p = loadProfile();
    expect(p.stichPoints).toBe(20);
    expect(p.nodes).toEqual({ A1: 1 });
    expect(p.onboarding).toBe(6);
  });

  it("wipeProfileStorage (Test-Code `reset`): löscht Fortschritt → Erstbesuch, behält Präferenzen", () => {
    // Fortschritt + Präferenzen anlegen.
    saveProfile({ stichPoints: 50, nodes: { B1: 1 }, onboarding: 6 });
    recordHighscore({ score: 500, level: 1, tricks: 9, cycles: 0, ts: 1 });
    saveGhost([10, 20], 200);
    saveSeenGuide();
    saveOptions({ ...DEFAULT_OPTIONS, musicVol: 0.9 });
    saveUsername("Bruder");

    wipeProfileStorage();

    // Fortschritt weg → Defaults.
    expect(loadProfile().onboarding).toBe(0);
    expect(loadProfile().stichPoints).toBe(0);
    expect(loadProfile().nodes).toEqual({});
    expect(loadHighscores()).toEqual([]);
    expect(loadGhost().total).toBe(0);
    expect(loadSeenGuide()).toBe(false); // Anleitung erscheint wieder
    // Präferenzen bleiben bewusst erhalten.
    expect(loadOptions().musicVol).toBe(0.9);
    expect(loadUsername()).toBe("Bruder");
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
    expect(o.reducedFx).toBe("aus"); // #200: Alt-Optionen ohne den Schlüssel bekommen den Default (jetzt „aus" = volle Effekte)
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

  // #303 Challenge-Decks
  it("isGottgleichRun (#303): bester Einzelstich ≥ Stufe-4-Schwelle — auch ohne Abschluss", () => {
    expect(isGottgleichRun({ bestTrickScore: GOTTGLEICH_TRICK_MIN })).toBe(true);          // genau an der Schwelle
    expect(isGottgleichRun({ bestTrickScore: GOTTGLEICH_TRICK_MIN - 1 })).toBe(false);     // knapp darunter
    expect(isGottgleichRun({ completed: false, bestTrickScore: GOTTGLEICH_TRICK_MIN + 9 })).toBe(true); // Abbruch zählt
    expect(isGottgleichRun({ completed: true })).toBe(false);                               // bestTrickScore fehlt → 0
    expect(isGottgleichRun(null)).toBe(false);
  });
  it("isMeisterNoRerollRun (#303 Sparfuchs): abgeschlossener Meisterrang-Lauf ohne Reroll", () => {
    expect(isMeisterNoRerollRun({ completed: true, ranked: "meister", rerollsUsed: 0 })).toBe(true);
    expect(isMeisterNoRerollRun({ completed: true, ranked: "meister", rerollsUsed: 1 })).toBe(false); // gererollt
    expect(isMeisterNoRerollRun({ completed: true, ranked: "standard", rerollsUsed: 0 })).toBe(false); // nicht Meister
    expect(isMeisterNoRerollRun({ completed: false, ranked: "meister", rerollsUsed: 0 })).toBe(false); // vorzeitig
    expect(isMeisterNoRerollRun({ completed: true, ranked: "meister" })).toBe(true);        // rerollsUsed fehlt → 0
    expect(isMeisterNoRerollRun(null)).toBe(false);
  });

  describe("recordRun setzt + persistiert die sticky Flags", () => {
    beforeEach(() => { global.localStorage = mockLS(); });
    afterEach(() => { delete global.localStorage; });

    it("frisches Profil: Flags sind false", () => {
      expect(loadProfile().hadNoRerollRun).toBe(false); // #214
      expect(loadProfile().hadGottgleichRun).toBe(false);       // #303
      expect(loadProfile().hadMeisterNoRerollRun).toBe(false);  // #303
      expect(loadProfile().hadChampionWeek).toBe(false);        // #303 (Trigger folgt mit dem Champion-Board)
    });

    it("#303: Gottgleich-Stich setzt hadGottgleichRun (sticky), auch bei abgebrochenem Lauf", () => {
      const { profile } = recordRun({ score: 100, ts: 1, completed: false, bestTrickScore: GOTTGLEICH_TRICK_MIN });
      expect(profile.hadGottgleichRun).toBe(true);
      expect(loadProfile().hadGottgleichRun).toBe(true);
      // bleibt sticky, auch wenn ein Folgelauf die Schwelle nicht erreicht
      const later = recordRun({ score: 50, ts: 2, completed: true, bestTrickScore: 10 });
      expect(later.profile.hadGottgleichRun).toBe(true);
    });

    it("#303 Sparfuchs: nur ein abgeschlossener Meisterrang-Lauf ohne Reroll setzt hadMeisterNoRerollRun", () => {
      const a = recordRun({ score: 100, ts: 1, completed: true, ranked: "standard", rerollsUsed: 0 });
      expect(a.profile.hadMeisterNoRerollRun).toBe(false); // kein Meister
      const b = recordRun({ score: 100, ts: 2, completed: true, ranked: "meister", rerollsUsed: 2 });
      expect(b.profile.hadMeisterNoRerollRun).toBe(false); // gererollt
      const c = recordRun({ score: 100, ts: 3, completed: true, ranked: "meister", rerollsUsed: 0 });
      expect(c.profile.hadMeisterNoRerollRun).toBe(true);
      expect(loadProfile().hadMeisterNoRerollRun).toBe(true);
    });

    it("#303: hadChampionWeek bleibt (mangels Trigger) false und wird nicht versehentlich gesetzt", () => {
      const { profile } = recordRun({ score: 999, ts: 1, completed: true, ranked: "meister", rerollsUsed: 0, bestTrickScore: GOTTGLEICH_TRICK_MIN });
      expect(profile.hadChampionWeek).toBe(false);
    });

    it("#214: noReroll-Lauf setzt hadNoRerollRun (persistiert), ein Reroll-Lauf nicht", () => {
      const { profile } = recordRun({ score: 100, ts: 1, completed: true, rerollsUsed: 0, statPicks: [] });
      expect(profile.hadNoRerollRun).toBe(true);
      expect(loadProfile().hadNoRerollRun).toBe(true);
      global.localStorage = mockLS(); // frisches Profil
      const later = recordRun({ score: 100, ts: 2, completed: true, rerollsUsed: 3, statPicks: [] });
      expect(later.profile.hadNoRerollRun).toBe(false);
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

describe("Aktiver Lauf (Resume / Auto-Save)", () => {
  beforeEach(() => { global.localStorage = mockLS(); });
  afterEach(() => { delete global.localStorage; });

  const runState = (over = {}) => ({ phase: "play", deck: [{ id: "R1", value: 3 }], cycle: 4, score: 1234, ...over });

  it("saveActiveRun → loadActiveRun rundet State + meta zurück", () => {
    const s = runState();
    saveActiveRun(s, { timeBase: 5000, runId: 42, currentTraj: [1, 2] });
    const r = loadActiveRun();
    expect(r.state).toEqual(s);
    expect(r.meta).toEqual({ timeBase: 5000, runId: 42, currentTraj: [1, 2] });
  });

  it("speichert KEINEN Menü-/Gameover-Snapshot (nicht fortsetzbar)", () => {
    saveActiveRun(runState({ phase: "menu" }));
    expect(loadActiveRun()).toBeNull();
    saveActiveRun(runState({ phase: "gameover" }));
    expect(loadActiveRun()).toBeNull();
  });

  it("ohne Deck wird nicht gespeichert", () => {
    saveActiveRun({ phase: "play", cycle: 1 });
    expect(loadActiveRun()).toBeNull();
  });

  it("falsches Schema wird verworfen (inkompatibler Snapshot nach Deploy)", () => {
    global.localStorage.setItem("as_activerun", JSON.stringify({ schema: ACTIVE_RUN_SCHEMA + 99, state: runState(), meta: {} }));
    expect(loadActiveRun()).toBeNull();
  });

  it("kaputter Blob → null (kein Absturz)", () => {
    global.localStorage.setItem("as_activerun", "{kaputt");
    expect(loadActiveRun()).toBeNull();
  });

  it("clearActiveRun entfernt den Snapshot", () => {
    saveActiveRun(runState());
    expect(loadActiveRun()).not.toBeNull();
    clearActiveRun();
    expect(loadActiveRun()).toBeNull();
  });
});
