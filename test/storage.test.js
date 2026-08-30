import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rankHighscores, loadGhost, saveGhost, loadHighscores, recordHighscore,
  loadOptions, loadUsername, saveUsername, loadTutorialProgress, saveTutorialProgress, tutorialOpened,
  recordRun, recordChampionWeeks, loadProfile, isNoRerollRun, RUN_COMPLETE_DP,
  monoArchetypeOf, isAllArchetypesRun, migrateProfile, PROFILE_SCHEMA_VERSION,
  isGottgleichRun, isMeisterNoRerollRun, GOTTGLEICH_TRICK_MIN,
  saveActiveRun, loadActiveRun, clearActiveRun, ACTIVE_RUN_SCHEMA,
  saveProfile, wipeProfileStorage, saveOptions,
  maybeResetForEpoch, RESET_EPOCH,
  migrateReducedFx, deviceDefaultReducedFx } from "../src/game/storage.js";
import { GHOST_STEP } from "../src/game/constants.js";
import { WELCOME_DP, ONBOARDING_LINKS, NODE_IDS, SP_PER_RUN } from "../src/game/progression.js";

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
const DEFAULT_OPTIONS = {
  lang: null, // #sprache: noch nicht gewählt → die UI nimmt beim ersten Start die Browsersprache
  skin: "crt", muted: false, sfxVol: 0.4, musicVol: 0.2, deckId: "deck_onboarding", battlefieldId: "bf_onboarding",
  /* #arch-default: Combos AN, Formationen AUS. Die Formationsrahmen gehören der Aufstellung; auf dem
     Bau-Brett liegen sie als zweite Rahmenlage über demselben Feld. `archFormsDefaultLift` unten ist
     der Marker der EINMALIGEN Absenkung bestehender Stände (s. storage.js `liftArchFormsDefault`). */
  reducedFx: "aus", haptics: true, archShowCombos: true, archShowForms: false,
  calmMusic: false,
  telemetry: true, // #telemetrie: anonyme Lauf-Daten, Default an (Opt-out in den Optionen)
  collapseScoreSource: true, collapseScoreTrend: true, finisher: "standard", archColor: "standard",
  lvWingDeck: true, lvWingStats: true, // #lv-fluegel: Seitenleisten der Level-up-Karte (nur ab 1280 px)
  lvPassive: false, // #lv-fluegel: Passiv-Beschreibung der Skill-Wahl — gemerkt, Default zu
  lvHeld: true, // #held-merken: „Deine Skills" in Perk-/Skill-Wahl — gemerkt, Default auf
  lvWingBuildings: false, // #lv-gebaeude: Gebäude-Liste im linken Flügel — gemerkt, Default zu
  hideFloatScore: false, hideFloatMult: false, hideFloatWinLose: false,
  hideBreakdown: false, // Stich-Aufschlüsselung (§17) unter dem Feld — Default sichtbar
  numScale: 0.75,
  randomDeckEachRun: false,
  tierSel: {},
  fxAurora: false, fxNeonsurf: false, fxStarfield: false, fxCubeMatrix: false,
  fxEdgeGlow: false, fxHolo: false, fxGlitch: false,
  fxSonnenPuls: true, fxLaserFaecher: false, fxPrismaKaskade: false, fxHoloCube: false, fxSupernova: false,
  fxCubeMatrixSun: true, fxCubeMatrixWire: false,
  /* #fx-deckdefault (19.08.2026): die dreizehn Farbmodus-Flags standen auf `false` (= Standardton) und
     stehen jetzt auf `true` (= Deckfarbe). `fxDeckDefaultLift` ist der Marker der einmaligen Anhebung
     bestehender Stände und MUSS hier false sein — er kommt aus den Defaults UNTER den gespeicherten Stand. */
  fxAuroraDeck: true, fxNeonsurfDeck: true, fxStarfieldDeck: true, fxCubeMatrixDeck: true,
  fxScorchDeck: true, fxBlackholeDeck: true, fxKlingeDeck: true, fxHologridDeck: true,
  fxSonnenPulsDeck: true, fxLaserFaecherDeck: true, fxPrismaKaskadeDeck: true, fxHoloCubeDeck: true, fxSupernovaDeck: true,
  fxGottStandardDeck: true, // #vorschau-deck: Farbmodus für „Gottgleich · Standard“
  fxDeckDefaultLift: false,
  archFormsDefaultLift: false,
};

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

  it("frisches Profil: Onboarding fertig (6/6), 0 DP, 0 SP (R22: Startbonus gestrichen)", () => {
    const p = loadProfile();
    expect(p.stichPoints).toBe(0);
    expect(p.stichSpent).toBe(0);
    expect(p.nodes).toEqual({});
    expect(p.onboarding).toBe(ONBOARDING_LINKS); // #316: kein Onboarding mehr → direkt „fertig"
    expect(p.spRuns).toBe(0);
    expect(p.deckPoints).toBe(0);                // Runde 2, R22: kein Startbonus mehr — erste DP via WELCOME_DP
    expect(p.ownedCosmetics).toEqual({});
    expect(p.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
  });

  it("Migration v1 → v6 seedet die neuen Felder + hebt Onboarding auf fertig, ohne Altfelder zu verlieren", () => {
    const v1 = { schemaVersion: 1, games: 4, bestScore: 700, bestStreak: 5 };
    const m = migrateProfile(v1);
    expect(m.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
    expect(m.games).toBe(4);
    expect(m.bestStreak).toBe(5);                    // Altfeld erhalten
    expect(m.stichPoints).toBe(0);
    expect(m.nodes).toEqual({});
    expect(m.onboarding).toBe(ONBOARDING_LINKS);     // #316: Migration hebt auf „fertig"
    expect(m.spRuns).toBe(0);
    expect(m.ownedCosmetics).toEqual({}); // v2 → v3: Deck-Werkstatt-Besitz
    expect(m.deckPoints).toBe(0);         // Migration gibt KEINEN 50-DP-Bonus (nur frische Profile)
    expect(m.deckSpent).toBe(0);
  });

  it("Migration v2 → v3 ergänzt die Kosmetik-Besitz-Map; v7 leert den Alt-Baum", () => {
    const m = migrateProfile({ schemaVersion: 2, stichPoints: 7, nodes: { B1: 1 } });
    expect(m.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
    expect(m.stichPoints).toBe(7);        // Altfeld erhalten (kein stichSpent → keine Rückbuchung)
    expect(m.nodes).toEqual({});          // #369 v7: Alt-Baum-Knoten (tote IDs) geleert
    expect(m.ownedCosmetics).toEqual({});
  });

  it("v7 (#369): Alt-Baum wird geleert, investierte SP (stichSpent) fließen zurück aufs Guthaben", () => {
    const v2 = { schemaVersion: 2, stichPoints: 12, stichSpent: 5, nodes: { B1: 1 }, onboarding: 6, spRuns: 3 };
    const m = migrateProfile(v2);
    expect(m.stichPoints).toBe(17);       // 12 + 5 (gratis Respec beim Umstieg, kein SP-Verlust)
    expect(m.stichSpent).toBe(0);
    expect(m.nodes).toEqual({});          // Alt-Knoten geleert
    expect(m.onboarding).toBe(6);         // übrige Felder unberührt
    expect(m.spRuns).toBe(3);
  });

  it("Leer-/Korrupt-Pfad liefert frische nodes-Referenz (kein geteilter Modul-Default)", () => {
    const a = loadProfile();
    a.nodes.HACK = 1; // mutiere die eine Instanz
    delete global.localStorage;
    const b = loadProfile();
    expect(b.nodes).toEqual({}); // NICHT von a vergiftet
  });

  it("#316: kein Onboarding mehr — frisches Profil ist fertig (6/6) und bleibt es", () => {
    let p = recordRun(runRec({ ts: 1 })).profile;
    expect(p.onboarding).toBe(ONBOARDING_LINKS);          // schon fertig, kein Vorrücken
    p = recordRun(runRec({ ts: 2 })).profile;
    expect(p.onboarding).toBe(ONBOARDING_LINKS);
    // Vorzeitiges Beenden ändert nichts.
    const q = recordRun(runRec({ completed: false })).profile;
    expect(q.onboarding).toBe(ONBOARDING_LINKS);
    expect(q.games).toBe(3); // games zählt jeden Lauf
  });

  /* #hirsch-abgeschlossen — die zwei Zähler dürfen NICHT dasselbe zählen.

     `games` ist die Statistik „begonnene Läufe" und zählt Abbrüche mit; daran hingen bis dahin die
     Freischaltungen über eine Laufzahl, und ein abgebrochener Lauf trug damit eine Belohnung
     (gemeldet an „Insert Coin", dieselbe Ursache an der Hirsch-Leiter). `runsCompleted` ist der neue
     Zähler und darf ausschließlich bei `completed === true` steigen — das ist der ganze Fix. */
  it("runsCompleted zählt NUR abgeschlossene Läufe, games zählt jeden begonnenen", () => {
    let p = recordRun(runRec({ ts: 1 })).profile;                       // abgeschlossen
    expect(p.games).toBe(1);
    expect(p.runsCompleted).toBe(1);
    p = recordRun(runRec({ ts: 2, completed: false })).profile;         // Abbruch
    expect(p.games, "der Abbruch zählt als begonnener Lauf").toBe(2);
    expect(p.runsCompleted, "aber NICHT als abgeschlossener").toBe(1);
    p = recordRun(runRec({ ts: 3 })).profile;                           // wieder abgeschlossen
    expect(p.games).toBe(3);
    expect(p.runsCompleted).toBe(2);
  });

  /* Die SP-Tests unten messen den LAUF-Ertrag. Der einmalige Willkommensbonus (WELCOME_DP, fällt nach
     dem ersten abgeschlossenen Lauf) würde jede dieser Zahlen um 50 verschieben und die eigentliche
     Aussage verdecken — deshalb wird er hier vorweg als „schon ausgezahlt" markiert. Der Bonus selbst
     hat einen eigenen Test weiter unten. */
  const veteran = (extra = {}) => saveProfile({ ...loadProfile(), welcomeBonusPaid: true, ...extra });

  it("#316: SP werden ab dem ERSTEN abgeschlossenen Lauf verdient (kein Onboarding-Delay)", () => {
    veteran();
    /* Der Grundstock steht als SP_PER_RUN, nicht als Zahl: geprüft wird, DASS jeder abgeschlossene
       Lauf ihn genau einmal zahlt, nicht wie hoch er gerade steht. Bis 23.08.2026 stand hier die 1
       ausgeschrieben, und eine Balance-Drehung (playtest-fixes: 1 → 5) machte fünf Tests rot, die
       über den Grundstock gar nichts aussagen wollten. Die Meilensteine bleiben ausgeschrieben —
       ihre Staffel IST die Aussage dieses Tests. */
    // 1. Lauf: Grundstock + 6 Meilenstein-SP (100 Mio: 1+1+1+1+2).
    let p = recordRun(runRec({ ts: 1, score: 100_000_000 })).profile;
    expect(p.stichPoints).toBe(SP_PER_RUN + 6);
    expect(p.spRuns).toBe(1);
    // Nächster, kleiner Lauf: nur der Grundstock.
    p = recordRun(runRec({ ts: 2, score: 10_000 })).profile;
    expect(p.stichPoints).toBe(SP_PER_RUN * 2 + 6);
    expect(p.spRuns).toBe(2);
  });

  it("Treue-Drip: der 10. SP-Lauf gibt +5 extra", () => {
    veteran();
    let p;
    // 9 SP-Läufe à Grundstock (kein Onboarding-Vorlauf mehr — jeder abgeschlossene Lauf ist ein SP-Lauf).
    for (let i = 0; i < 9; i++) p = recordRun(runRec({ ts: 100 + i })).profile;
    expect(p.stichPoints).toBe(SP_PER_RUN * 9);
    expect(p.spRuns).toBe(9);
    // 10. SP-Lauf → Grundstock + 5 Drip. Die 5 ist die Aussage des Tests und bleibt ausgeschrieben.
    p = recordRun(runRec({ ts: 200 })).profile;
    expect(p.spRuns).toBe(10);
    expect(p.stichPoints).toBe(SP_PER_RUN * 10 + 5);
  });

  it("#316: frisches Profil ist bereits 6/6 — recordRun meldet keine Onboarding-Unlocks; Genesis via onboardingDone frei", () => {
    const res = recordRun(runRec({ ts: 1 }));
    expect(res.profile.onboarding).toBe(ONBOARDING_LINKS);
    expect(res.profile.ownedCosmetics["pack:genesis"]).toBeUndefined(); // kein Pack-Grant — Genesis via onboardingDone frei
    expect(res.unlocks).toEqual([]); // keine Onboarding-Glied-Unlocks mehr (Startprofil ist schon fertig)
  });

  it("DP: Score-DP = SP-Meilensteine ab dem ersten Lauf; SP laufen normal (auf den 50-DP-Startbonus)", () => {
    veteran();
    let p = loadProfile();
    expect(p.deckPoints).toBe(0);          // R22: frisch = 0 DP
    p = recordRun(runRec({ ts: 1, score: 55_000_000 })).profile;
    expect(p.deckPoints).toBe(3 + 5);      // 55 Mio → +3 DP (Meilensteine 10M+25M+50M) + #382 Abschluss-Bonus 5
    expect(p.stichPoints).toBe(SP_PER_RUN + 3);     // Grundstock + 3 Meilensteine (10M+25M+50M)
  });

  it("#382 Abschluss-Bonus: +5 DP je abgeschlossenem Nicht-Ranked-Lauf (nicht bei Abbruch)", () => {
    veteran();   // ohne das läge der einmalige Willkommensbonus (DP) mit im Delta
    const done = recordRun(runRec({ ts: 1, score: 0 })).profile;                        // R22: Start 0 + Abschluss 5
    expect(done.deckPoints).toBe(5);
    const aborted = recordRun(runRec({ ts: 2, score: 0, completed: false })).profile;   // Abbruch → kein Bonus
    expect(aborted.deckPoints).toBe(5);                                                 // unverändert
  });

  it("#299 DP: bei vollem Baum zahlt die SP-Ökonomie DP statt SP; SP-Rest wird zu DP gefegt", () => {
    const allNodes = Object.fromEntries(NODE_IDS.map((id) => [id, 1]));
    veteran({ onboarding: 6, nodes: allNodes, stichPoints: 100, deckPoints: 0 });
    const p = recordRun(runRec({ ts: 1, score: 100_000_000 })).profile;
    expect(p.stichPoints).toBe(0);         // SP nutzlos → Rest zu DP gefegt
    expect(p.deckPoints).toBe(100 + 6 + SP_PER_RUN + 5); // gefegte 100 SP + 6 Meilenstein-DP + der Grundstock der SP-Ökonomie + #382 Abschluss-Bonus 5
  });

  it("recordRun lässt gekaufte Knoten + ausgegebene SP unangetastet (nur Kauf/Respec ändern sie)", () => {
    // Profil mit einem gekauften Knoten + Onboarding fertig vorbereiten.
    veteran({ onboarding: 6, stichPoints: 3, stichSpent: 2, nodes: { B1: 1 } });
    const p = recordRun(runRec({ ts: 1, score: 0 })).profile;
    expect(p.nodes).toEqual({ B1: 1 }); // Knoten bleiben
    expect(p.stichSpent).toBe(2);        // ausgegeben bleibt
    expect(p.stichPoints).toBe(3 + SP_PER_RUN);       // Grundstock auf die 3 mitgegebenen (Onboarding war fertig)
  });

  /* Runde 4, V4 (Owner-Fund): der Endscreen zeigte „+0 DP" auf einem abgeschlossenen Lauf,
     weil earn.dpGross nur die Meilenstein-DP trug — der Abschluss-Bonus war unsichtbar. Die
     angezeigte Zahl muss dem echten Konto-Zuwachs OHNE Willkommensbonus entsprechen (der hat
     seine eigene Endscreen-Zeile). */
  it("V4: die angezeigte DP-Zahl trägt den Abschluss-Bonus (und deckt den Konto-Zuwachs)", () => {
    veteran();
    const dp0 = loadProfile().deckPoints;
    // Abgeschlossener Lauf ohne Meilenstein: sichtbar ist der Abschluss-Bonus, nicht „+0".
    const done = recordRun(runRec({ ts: 1, score: 10_000 }));
    expect(done.earn.dpGross).toBe(RUN_COMPLETE_DP);
    expect(done.earn.dpNet).toBe(done.earn.dpGross);
    expect(done.profile.deckPoints - dp0).toBe(done.earn.dpGross);
    // Abbruch: kein Abschluss-Bonus, Anzeige und Konto bleiben bei 0.
    const aborted = recordRun(runRec({ ts: 2, score: 10_000, completed: false }));
    expect(aborted.earn.dpGross).toBe(0);
    expect(aborted.profile.deckPoints).toBe(done.profile.deckPoints);
  });

  /* ---- Willkommensbonus (WELCOME_DP) ---- */

  it("Willkommensbonus: einmalig DECKPUNKTE nach dem ERSTEN abgeschlossenen Lauf, danach nie wieder", () => {
    const dp0 = loadProfile().deckPoints;                 // Fresh-Start-Guthaben (START_DECK_POINTS)
    expect(loadProfile().welcomeBonusPaid).toBe(false);   // frisches Profil hat ihn noch offen
    // Erster abgeschlossener Lauf: Bonus auf die DP, SP bekommen nur ihren Grundstock.
    const first = recordRun(runRec({ ts: 1, score: 0 }));
    expect(first.earn.welcomeDp).toBe(WELCOME_DP);
    expect(first.profile.stichPoints).toBe(SP_PER_RUN);   // der Bonus liegt NICHT mehr auf den SP
    expect(first.profile.welcomeBonusPaid).toBe(true);
    // Zweiter Lauf: kein Bonus mehr. Gemessen wird die DIFFERENZ der beiden Läufe — beide tragen den
    // #382-Abschluss-Bonus, der Unterschied ist also genau der Willkommensbonus.
    const second = recordRun(runRec({ ts: 2, score: 0 }));
    expect(second.earn.welcomeDp).toBe(0);
    const d1 = first.profile.deckPoints - dp0;
    const d2 = second.profile.deckPoints - first.profile.deckPoints;
    expect(d1 - d2).toBe(WELCOME_DP);
    expect(second.profile.stichPoints).toBe(SP_PER_RUN * 2);
  });

  it("Willkommensbonus hängt an ABGESCHLOSSEN — ein Abbruch löst ihn nicht aus", () => {
    const aborted = recordRun(runRec({ ts: 1, score: 0, completed: false }));
    expect(aborted.earn.welcomeDp).toBe(0);
    expect(aborted.profile.welcomeBonusPaid).toBe(false);  // bleibt offen
    // Der nächste ABGESCHLOSSENE Lauf holt ihn dann nach.
    const done = recordRun(runRec({ ts: 2, score: 0 }));
    expect(done.earn.welcomeDp).toBe(WELCOME_DP);
  });

  it("Migration v7→v8: wer schon gespielt hat, gilt als ausgezahlt — ohne Nachschlag", () => {
    // Alt-Profil ohne das Flag, aber mit Spielhistorie.
    global.localStorage.setItem("as_profile", JSON.stringify({ schemaVersion: 7, games: 12, stichPoints: 30 }));
    const p = loadProfile();
    expect(p.welcomeBonusPaid).toBe(true);
    expect(p.stichPoints).toBe(30);        // KEIN rückwirkender Grant (wie v5→v6)
    // Ein Alt-Profil, das noch nie einen Lauf beendet hat, bekommt den Bonus dagegen regulär.
    global.localStorage.setItem("as_profile", JSON.stringify({ schemaVersion: 7, games: 0, stichPoints: 0 }));
    expect(loadProfile().welcomeBonusPaid).toBe(false);
  });

  it("Migration v9→v10: das Flag wird ÜBERNOMMEN, der Bonus nicht ein zweites Mal ausgezahlt", () => {
    // Wer den Bonus damals in SP bekam, bekommt ihn nicht noch einmal in DP — und die SP bleiben liegen.
    global.localStorage.setItem("as_profile", JSON.stringify({ schemaVersion: 9, games: 3, welcomeSpPaid: true, stichPoints: 55, deckPoints: 0 }));
    const p = loadProfile();
    expect(p.welcomeBonusPaid).toBe(true);
    expect(p.welcomeSpPaid).toBeUndefined();   // der irreführende Name ist weg
    expect(p.stichPoints).toBe(55);            // nichts zurückgeholt
    expect(p.deckPoints).toBe(0);              // nichts nachgereicht
    // Wer ihn noch offen hatte, behält ihn offen und bekommt ihn beim nächsten Lauf in DP.
    global.localStorage.setItem("as_profile", JSON.stringify({ schemaVersion: 9, games: 0, welcomeSpPaid: false }));
    expect(loadProfile().welcomeBonusPaid).toBe(false);
  });

  /* ---- Tutorial-Angebot (hadCompletedRun) ---- */

  it("hadCompletedRun kippt beim ersten ABGESCHLOSSENEN Lauf und bleibt danach stehen", () => {
    expect(loadProfile().hadCompletedRun).toBe(false);
    // Ein Abbruch zählt nicht: wer nach zwei Stichen rausgeht, hat die Schleife nicht gesehen.
    expect(recordRun(runRec({ ts: 1, score: 0, completed: false })).profile.hadCompletedRun).toBe(false);
    expect(recordRun(runRec({ ts: 2, score: 0 })).profile.hadCompletedRun).toBe(true);
    // Sticky — ein späterer Abbruch nimmt die Flagge nicht wieder weg.
    expect(recordRun(runRec({ ts: 3, score: 0, completed: false })).profile.hadCompletedRun).toBe(true);
  });

  it("Migration v8→v9: Alt-Profile mit Spielhistorie gelten als „hat schon gespielt“", () => {
    global.localStorage.setItem("as_profile", JSON.stringify({ schemaVersion: 8, games: 3, welcomeBonusPaid: true }));
    expect(loadProfile().hadCompletedRun).toBe(true);
    global.localStorage.setItem("as_profile", JSON.stringify({ schemaVersion: 8, games: 0, welcomeBonusPaid: false }));
    expect(loadProfile().hadCompletedRun).toBe(false);
  });

  it("saveProfile rundet durch localStorage und stempelt die Schema-Version", () => {
    const saved = saveProfile({ stichPoints: 20, nodes: { A1: 1 }, onboarding: 6 });
    expect(saved.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
    const p = loadProfile();
    expect(p.stichPoints).toBe(20);
    expect(p.nodes).toEqual({ A1: 1 });
    expect(p.onboarding).toBe(6);
  });

  it("wipeProfileStorage (Test-Code `reset`): löscht Fortschritt UND Namen → echte Erstbesuch-Maske", () => {
    // Fortschritt + Präferenzen anlegen.
    saveProfile({ stichPoints: 50, nodes: { B1: 1 }, onboarding: 6 });
    recordHighscore({ score: 500, level: 1, tricks: 9, cycles: 0, ts: 1 });
    saveGhost([10, 20], 200);
    saveTutorialProgress({ seen: ["grundlagen/wasist"], last: "grundlagen/wasist" });
    saveOptions({ ...DEFAULT_OPTIONS, musicVol: 0.9 });
    saveUsername("Bruder");

    wipeProfileStorage();

    // Fortschritt weg → Defaults (R22: frisches Profil ist wieder 6/6 fertig mit 0 DP, 0 SP).
    expect(loadProfile().onboarding).toBe(ONBOARDING_LINKS);
    expect(loadProfile().deckPoints).toBe(0);
    expect(loadProfile().stichPoints).toBe(0);
    expect(loadProfile().nodes).toEqual({});
    expect(loadHighscores()).toEqual([]);
    expect(loadGhost().total).toBe(0);
    expect(loadTutorialProgress()).toEqual({ seen: [], last: null }); // das Tutorial wird wieder angeboten
    expect(tutorialOpened()).toBe(false);
    // Der Name geht MIT: „reset" soll den Erstbesuch herstellen, und der beginnt bei der
    // Namenseingabe — die zeigt sich genau dann, wenn kein Name gespeichert ist.
    expect(loadUsername()).toBe("");
    // Die übrigen Präferenzen (Lautstärke, Haptik, Sprache) bleiben bewusst erhalten: sie hängen
    // nicht am Fortschritt, und die Sprache lässt sich im Namens-Dialog direkt wieder wählen.
    expect(loadOptions().musicVol).toBe(0.9);
  });
});

describe("#reset maybeResetForEpoch — einmaliger Rollout-Reset", () => {
  beforeEach(() => { global.localStorage = mockLS(); });
  afterEach(() => { delete global.localStorage; });

  it("gate=false rührt NICHTS an (echte Hauptseite bleibt unberührt)", () => {
    saveProfile({ stichPoints: 99, onboarding: 6 });
    expect(maybeResetForEpoch(false)).toBe(false);
    expect(loadProfile().stichPoints).toBe(99);        // Fortschritt bleibt
    expect(localStorage.getItem("as_reset_epoch")).toBe(null); // kein Stempel gesetzt
  });

  it("gate=true setzt genau EINMAL zurück, dann nie wieder (Epoch-Stempel)", () => {
    saveProfile({ stichPoints: 99, nodes: { B1: 1 } });
    recordHighscore({ score: 500, level: 1, tricks: 9, cycles: 0, ts: 1 });
    saveUsername("Bruder");

    expect(maybeResetForEpoch(true)).toBe(true);        // erster Lauf → Reset
    expect(loadProfile().stichPoints).toBe(0);          // Fortschritt weg
    expect(loadHighscores()).toEqual([]);
    expect(loadUsername()).toBe("");
    expect(localStorage.getItem("as_reset_epoch")).toBe(RESET_EPOCH);

    // Neuer Fortschritt nach dem Reset darf NICHT erneut weggewischt werden.
    saveProfile({ stichPoints: 7 });
    expect(maybeResetForEpoch(true)).toBe(false);        // Stempel passt → No-op
    expect(loadProfile().stichPoints).toBe(7);
  });

  it("ein GEÄNDERTER RESET_EPOCH löst erneut aus (alter Stempel ≠ neuer)", () => {
    saveProfile({ stichPoints: 42 });
    localStorage.setItem("as_reset_epoch", "alt-2000-01-01");
    expect(maybeResetForEpoch(true)).toBe(true);         // alter Stempel → erneuter Reset
    expect(loadProfile().stichPoints).toBe(0);
    expect(localStorage.getItem("as_reset_epoch")).toBe(RESET_EPOCH);
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
  // #363: „Effekte reduziert" auf 3 Zustände (aus|mobile|an); auto/ausgewogen werden migriert.
  it("migrateReducedFx: gültige Zustände bleiben, ausgewogen→mobile, auto/ungültig→Gerätedefault", () => {
    const dev = deviceDefaultReducedFx();
    expect(["aus", "mobile"]).toContain(dev);      // Node/jsdom: kein coarse pointer → „aus"
    expect(migrateReducedFx("aus")).toBe("aus");
    expect(migrateReducedFx("mobile")).toBe("mobile");
    expect(migrateReducedFx("an")).toBe("an");
    expect(migrateReducedFx("ausgewogen")).toBe("mobile");
    expect(migrateReducedFx("auto")).toBe(dev);    // kein „auto" mehr
    expect(migrateReducedFx(undefined)).toBe(dev); // fehlender Schlüssel → Gerätedefault
    expect(migrateReducedFx("quatsch")).toBe(dev);
  });
  it("loadOptions migriert reducedFx und schreibt den Alt-Wert einmalig zurück (kein auto/ausgewogen im Profil)", () => {
    global.localStorage.setItem("as_options", JSON.stringify({ reducedFx: "ausgewogen" }));
    expect(loadOptions().reducedFx).toBe("mobile");
    expect(JSON.parse(global.localStorage.getItem("as_options")).reducedFx).toBe("mobile"); // persistiert
    global.localStorage.setItem("as_options", JSON.stringify({ reducedFx: "auto" }));
    const r = loadOptions().reducedFx;
    expect(r).not.toBe("auto");
    expect(["aus", "mobile"]).toContain(r);
    expect(JSON.parse(global.localStorage.getItem("as_options")).reducedFx).not.toBe("auto");
  });
  it("recordHighscore persistiert; loadHighscores liest zurück, Nicht-Array → []", () => {
    recordHighscore({ score: 100, level: 1, tricks: 5, cycles: 0, ts: 1 });
    recordHighscore({ score: 200, level: 1, tricks: 5, cycles: 0, ts: 2 });
    expect(loadHighscores().map((e) => e.score)).toEqual([200, 100]);
    global.localStorage.setItem("as_highscores", JSON.stringify({ not: "an array" }));
    expect(loadHighscores()).toEqual([]);
  });
  it("Username & Tutorial-Fortschritt runden durch localStorage", () => {
    expect(loadUsername()).toBe("");
    saveUsername("Tester");
    expect(loadUsername()).toBe("Tester");
    expect(loadTutorialProgress()).toEqual({ seen: [], last: null });
    saveTutorialProgress({ seen: ["a/b", "a/b", "c/d"], last: "c/d" });
    expect(loadTutorialProgress()).toEqual({ seen: ["a/b", "c/d"], last: "c/d" }); // Doppelte fallen weg
    expect(tutorialOpened()).toBe(true);
    saveTutorialProgress({ seen: [], last: null }); // „nie geöffnet" bleibt herstellbar (Wiederholbarkeit)
    expect(tutorialOpened()).toBe(false);
  });

  /* Der Altschlüssel des geführten Laufs wird nur noch GELESEN: wer ihn gesetzt hat, bekommt das laute
     Erstkontakt-Angebot nicht erneut. Eine Zeile statt einer Migration. */
  it("der Altschlüssel des geführten Laufs zählt weiter als schon geöffnet", () => {
    expect(tutorialOpened()).toBe(false);
    localStorage.setItem("as_tutorial_done", "1");
    expect(tutorialOpened()).toBe(true);
  });
  it("ohne localStorage fallen alle Leser sauber auf Defaults zurück (node-Default)", () => {
    delete global.localStorage;
    expect(loadGhost()).toEqual({ traj: [], total: 0, step: GHOST_STEP });
    expect(loadOptions()).toEqual(DEFAULT_OPTIONS);
    expect(loadHighscores()).toEqual([]);
    expect(loadUsername()).toBe("");
    expect(loadTutorialProgress()).toEqual({ seen: [], last: null });
    expect(tutorialOpened()).toBe(false);
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
      expect(loadProfile().hadChampionWeek).toBe(false);        // #303
      expect(loadProfile().championWeeks).toBe(0);              // #303 Ranglisten-Decks (gestuft)
    });

    it("#303 Ranglisten-Decks: recordChampionWeeks zählt monoton hoch und überlebt spätere Läufe", () => {
      expect(recordChampionWeeks(1).championWeeks).toBe(1);
      expect(loadProfile().hadChampionWeek).toBe(true);        // Alt-Flag bleibt synchron
      expect(recordChampionWeeks(3).championWeeks).toBe(3);
      // Monoton: ein kürzeres Archiv-Fenster / fehlgeschlagener Abruf nimmt nichts weg.
      expect(recordChampionWeeks(1).championWeeks).toBe(3);
      expect(recordChampionWeeks(0).championWeeks).toBe(3);
      // Ein normaler Lauf trägt den Zähler unverändert weiter.
      const { profile } = recordRun({ score: 100, ts: 1, completed: true });
      expect(profile.championWeeks).toBe(3);
      expect(loadProfile().championWeeks).toBe(3);
    });

    it("#303 Ranglisten-Decks: Alt-Profil mit hadChampionWeek erbt einen Sieg (Migration)", () => {
      expect(migrateProfile({ schemaVersion: 4, hadChampionWeek: true }).championWeeks).toBe(1);
      expect(migrateProfile({ schemaVersion: 4, hadChampionWeek: false }).championWeeks).toBe(0);
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

    it("#370 Ranked-Wochenbonus + Freischalt-Tracker (erste abgeschlossene Ranked-Runde/Woche gibt +5 DP)", () => {
      saveProfile({ ...loadProfile(), welcomeBonusPaid: true }); // sonst liegt der einmalige Willkommensbonus im Delta
      const p0 = loadProfile();
      // Erste Ranked-Runde der Woche (Seed 111): Bonus + Tracker. score 0 → native DP 0, sauberes Bonus-Delta.
      const a = recordRun({ score: 0, ts: 1, completed: true, ranked: "ranked", seed: 111, archetypes: ["fire", "ice"] });
      expect(a.profile.lastRankedWeekSeed).toBe(111);
      expect(a.profile.archetypeRunsCompleted).toEqual({ fire: 1, ice: 1 });
      const dA = a.profile.deckPoints - p0.deckPoints;
      // Zweite Ranked-Runde DERSELBEN Woche (gleicher Seed) → kein Bonus mehr, Tracker zählt weiter.
      const b = recordRun({ score: 0, ts: 2, completed: true, ranked: "ranked", seed: 111, archetypes: ["fire"] });
      expect(b.profile.lastRankedWeekSeed).toBe(111);
      expect(b.profile.archetypeRunsCompleted.fire).toBe(2);
      const dB = b.profile.deckPoints - a.profile.deckPoints;
      expect(dA - dB).toBe(5); // +5 DP nur beim ersten Lauf der Woche
      // Neue Woche (anderer Seed) → wieder Bonus.
      const c = recordRun({ score: 0, ts: 3, completed: true, ranked: "ranked", seed: 222, archetypes: ["fire"] });
      expect(c.profile.lastRankedWeekSeed).toBe(222);
      expect((c.profile.deckPoints - b.profile.deckPoints) - dB).toBe(5);
      // Nicht-Ranked completed Lauf zählt für den Tracker, setzt aber KEINE Wochen-Marke.
      const d = recordRun({ score: 0, ts: 4, completed: true, archetypes: ["plant"] });
      expect(d.profile.archetypeRunsCompleted.plant).toBe(1);
      expect(d.profile.lastRankedWeekSeed).toBe(222);
      // Unvollständiger Lauf zählt NICHT für den Tracker.
      const e = recordRun({ score: 0, ts: 5, completed: false, archetypes: ["lightning"] });
      expect(e.profile.archetypeRunsCompleted.lightning).toBeUndefined();
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

    it("#215/#310: Mono-Map ZÄHLT je Fraktion + Bund-Flag sticky", () => {
      const base = { completed: true, score: 100, bestStreak: 1, crits: 0, durationMs: 1, ts: 1 };
      recordRun({ ...base, archetypes: ["fire"] });                              // Mono-Feuer #1
      expect(loadProfile().monoArchetypeRuns.fire).toBe(1);
      expect(loadProfile().hadAllArchetypesRun).toBe(false);
      recordRun({ ...base, archetypes: ["fire"] });                              // Mono-Feuer #2 → Zähler steigt
      expect(loadProfile().monoArchetypeRuns.fire).toBe(2);
      recordRun({ ...base, archetypes: ["fire", "lightning", "ice", "plant"] }); // Element-Bund (nicht mono)
      expect(loadProfile().monoArchetypeRuns.fire).toBe(2);                      // sticky: bleibt bei 2
      expect(loadProfile().hadAllArchetypesRun).toBe(true);
    });
  });
});

describe("#349 Datenintegrität (storage)", () => {
  beforeEach(() => { global.localStorage = mockLS(); });
  afterEach(() => { delete global.localStorage; });

  it("recordRun übernimmt ALLE Profilfelder via Spread (kein Feld-Drift)", () => {
    const base = loadProfile();                 // frisches Profil = {...DEFAULT_PROFILE, ...}
    saveProfile({ ...base, zukunftsFeld: 42 });  // ein künftig ergänztes Feld simulieren
    const { profile } = recordRun({ score: 1000, ts: 1, completed: true });
    for (const key of Object.keys(base)) expect(profile, `Feld ${key} bleibt erhalten`).toHaveProperty(key);
    expect(profile.zukunftsFeld, "künftiges Profilfeld überlebt den Laufabschluss").toBe(42);
  });

  it("migrateProfile lässt ein Profil aus neuerem Build (schemaVersion > aktuell) unangetastet", () => {
    const future = { schemaVersion: PROFILE_SCHEMA_VERSION + 1, deckPoints: 999, zukunft: "x" };
    const out = migrateProfile(future);
    expect(out.schemaVersion, "nicht heruntergestuft").toBe(PROFILE_SCHEMA_VERSION + 1);
    expect(out.zukunft).toBe("x");
  });

  it("recordRun beschneidet die Historie bei QuotaExceeded (älteste deckSnapshots weg, jüngste bleiben) + signalisiert", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const many = Array.from({ length: 12 }, (_, i) => ({ score: i, ts: i, deckSnapshot: { cards: [1, 2, 3] } }));
    global.localStorage.setItem("as_runhistory", JSON.stringify(many));
    const real = global.localStorage;
    let threw = false;
    global.localStorage = {
      getItem: (kk) => real.getItem(kk), removeItem: (kk) => real.removeItem(kk), clear: () => real.clear(),
      setItem: (kk, v) => { if (kk === "as_runhistory" && !threw) { threw = true; const e = new Error("voll"); e.name = "QuotaExceededError"; throw e; } return real.setItem(kk, v); },
    };
    recordRun({ score: 999, ts: 999, completed: true, deckSnapshot: { cards: [9] } });
    const saved = JSON.parse(global.localStorage.getItem("as_runhistory"));
    expect(saved[0].deckSnapshot, "jüngster Lauf behält den Snapshot").toBeTruthy();
    expect(saved[saved.length - 1].deckSnapshot, "ältester Lauf wird beschnitten").toBeUndefined();
    expect(warn, "Quota-Fehler wird signalisiert (nicht stumm)").toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("Aktiver Lauf (Resume / Auto-Save)", () => {
  beforeEach(() => { global.localStorage = mockLS(); });
  afterEach(() => { delete global.localStorage; });

  // #349 B: vollständiger Kern-Shape (Pflichtfelder, die isResumableRunState prüft).
  const runState = (over = {}) => ({ phase: "play", deck: [{ id: "R1", value: 3 }], oppDeck: [{ id: "O1", value: 2 }],
    perks: [], skills: [], pos: 0, cycle: 4, trickNo: 0, score: 1234, ...over });

  // #349 B: Alt-/inkompatibler Snapshot (Kern-Pflichtfeld fehlt/verrutscht) → sauber verwerfen statt in den Reducer laden.
  it("verwirft Snapshot mit kaputtem State-Shape (Pflichtfeld fehlt) → null", () => {
    global.localStorage.setItem("as_activerun", JSON.stringify({ schema: ACTIVE_RUN_SCHEMA, state: runState({ deck: "nope" }) }));
    expect(loadActiveRun()).toBeNull(); // deck kein Array
    global.localStorage.setItem("as_activerun", JSON.stringify({ schema: ACTIVE_RUN_SCHEMA, state: runState({ score: undefined }) }));
    expect(loadActiveRun()).toBeNull(); // Pflicht-Zahl fehlt (undefined wird von JSON verworfen)
    global.localStorage.setItem("as_activerun", JSON.stringify({ schema: ACTIVE_RUN_SCHEMA, state: runState({ skills: null }) }));
    expect(loadActiveRun()).toBeNull(); // skills kein Array
  });

  // #370/v2: Ein Ranked-Snapshot ohne weekMods lief bis v1 durch — alle Wochen-Modifikatoren wären still aus
  // gewesen, der Lauf aber trotzdem mit Wochen-Seed auf die Rangliste gegangen. Jetzt verworfen.
  it("verwirft Ranked-Snapshot ohne weekMods, behält ihn mit weekMods", () => {
    global.localStorage.setItem("as_activerun", JSON.stringify({ schema: ACTIVE_RUN_SCHEMA, state: runState({ ranked: "ranked" }) }));
    expect(loadActiveRun()).toBeNull();
    const ok = runState({ ranked: "ranked", weekMods: [{ id: "noReroll", effect: "noReroll", sign: "neg", mag: null }] });
    global.localStorage.setItem("as_activerun", JSON.stringify({ schema: ACTIVE_RUN_SCHEMA, state: ok }));
    expect(loadActiveRun().state).toEqual(ok);
    // Nicht-Ranked bleibt ohne weekMods fortsetzbar (Casual/Challenge kennt keine Wochen-Mods).
    global.localStorage.setItem("as_activerun", JSON.stringify({ schema: ACTIVE_RUN_SCHEMA, state: runState() }));
    expect(loadActiveRun()).not.toBeNull();
  });

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
