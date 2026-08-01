import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, initialState, menuState } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { STAT_IDS } from "../src/game/stats.js";
import { computeFormations, formationPotential } from "../src/game/formations.js";
import { FORMATION_START_MIN, FORMATION_START_MAX } from "../src/game/constants.js";

const rng = makeRng(1);

describe("Reducer", () => {
  it("initialState: play-Phase, kein Leben mehr (V2), leerer Build (Basis-State)", () => {
    const s = initialState(makeRng(1));
    expect(s.phase).toBe("play");
    expect(s.life).toBeUndefined(); // V2: Leben restlos entfernt
    expect(s.perks).toEqual([]);
    expect(s.deck).toHaveLength(40);
  });

  it("Startdeck-Formations-Band (#Pass6): playerOrder-Potential liegt im Band, deterministisch", () => {
    for (const seed of [1, 2, 3, 7, 42, 123, 777]) {
      const s = initialState(makeRng(seed));
      const pot = formationPotential(s.playerOrder, s.deck);
      expect(pot).toBeGreaterThanOrEqual(FORMATION_START_MIN);
      expect(pot).toBeLessThanOrEqual(FORMATION_START_MAX);
    }
    // gleicher Seed → identische Anordnung (Rejection-Sampling bleibt deterministisch)
    expect(initialState(makeRng(5)).playerOrder).toEqual(initialState(makeRng(5)).playerOrder);
    // #156: verschiedene Seeds → (meist) verschiedene Anordnung — der Seed treibt das Sampling wirklich.
    const orders = new Set([5, 6, 7, 11].map((s) => initialState(makeRng(s)).playerOrder.join(",")));
    expect(orders.size).toBeGreaterThan(1);
  });

  // Deck-Mods beim Pick (früher flache Kat.-A-Perks) sind zu KUMULATIVEN Familien migriert (#167) — der
  // Familien-Pick + Ziel-Fluss ist in test/families-engine.test.js geprüft; PICK_PERK verändert das Deck nicht mehr.
  it("PICK_PERK ignoriert Perks außerhalb des Angebots", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L_UMV", "L2", "L4"] };
    expect(reducer(s0, { type: "PICK_PERK", perkId: "L_VAB", rng })).toBe(s0); // nicht im Angebot → No-Op
  });

  it("L_UMV Umverteilung: PICK_PERK setzt alle Karten dauerhaft auf den Deck-Durchschnitt und geht direkt in play (#203)", () => {
    let s = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L_UMV"] };
    const deckLen = s.deck.length;
    const avg = Math.round(s.deck.reduce((t, c) => t + c.value, 0) / deckLen);
    s = reducer(s, { type: "PICK_PERK", perkId: "L_UMV", rng: makeRng(1) });
    expect(s.phase).toBe("play");                             // kein Ziel-Schritt
    expect(s.perks).toEqual(["L_UMV"]);
    expect(s.deck.every((c) => c.value === avg)).toBe(true);  // alle Karten auf den Durchschnitt
    expect(s.deck).toHaveLength(deckLen);                     // KEINE Karte entfernt
  });

  it("RESET beginnt einen frischen Lauf mit Start-Pick = Stat (V2 §22.2)", () => {
    const dirty = { ...initialState(makeRng(1)), score: 999, perks: ["L2", "L4"] };
    const fresh = reducer(dirty, { type: "RESET", rng });
    expect(fresh.score).toBe(0);
    expect(fresh.perks).toEqual([]);
    expect(fresh.phase).toBe("levelup"); // Start-Entscheidung (Durchlauf 0) = Stat
    expect(fresh.statOffer).toEqual(STAT_IDS);
    expect(fresh.offer).toBeNull();
  });

  it("START_RUN startet aus dem Menü einen frischen Lauf mit Start-Pick = Stat", () => {
    const s = reducer(menuState(), { type: "START_RUN", rng });
    expect(s.phase).toBe("levelup");
    expect(s.statOffer).toEqual(STAT_IDS);
    expect(s.offer).toBeNull();
    expect(s.trickNo).toBe(0);
    expect(s.perks).toEqual([]);
  });

  it("TO_MENU verlässt den Lauf zurück ins Menü", () => {
    expect(reducer(initialState(makeRng(1)), { type: "TO_MENU" }).phase).toBe("menu");
  });
});

describe("PICK_PERK — nach jeder Runde zurück in play (Neuer Loop)", () => {
  it("Wahl aus dem levelup-Angebot → play, offer null, Perk übernommen", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L_UMV", "L2", "L4"] };
    const s1 = reducer(s0, { type: "PICK_PERK", perkId: "L2", rng }); // L2: cardBonus, kein needsTarget → direkt play
    expect(s1.phase).toBe("play");
    expect(s1.offer).toBeNull();
    expect(s1.perks).toEqual(["L2"]);
  });
});

describe("END_RUN — Beenden → Endscreen", () => {
  it("aus dem laufenden Spiel → gameover (Score/State bleiben für den Endscreen erhalten)", () => {
    const play = { ...initialState(makeRng(1)), score: 1234, trickNo: 50 };
    const r = reducer(play, { type: "END_RUN" });
    expect(r.phase).toBe("gameover");
    expect(r.score).toBe(1234);
    expect(r.trickNo).toBe(50);
  });
  it("aus Menü/gameover unberührt (kein Effekt)", () => {
    const menu = menuState();
    expect(reducer(menu, { type: "END_RUN" })).toBe(menu);
    const over = { ...initialState(makeRng(1)), phase: "gameover" };
    expect(reducer(over, { type: "END_RUN" })).toBe(over);
  });
});

describe("Stat-Auswahl — PICK_STAT (V2 §22.3)", () => {
  const statState = (over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", statOffer: STAT_IDS, ...over });

  it("addiert den Step aufs Summenfeld und kehrt in play zurück", () => {
    const s = reducer(statState(), { type: "PICK_STAT", statId: "critChance", rng });
    expect(s.phase).toBe("play");
    expect(s.statOffer).toBeNull();
    expect(s.statCritChance).toBeCloseTo(0.07); // #94/#161 FB-6: +7 pp je Pick
  });
  it("stapelt additiv über mehrere Picks", () => {
    const s = reducer(statState({ statStreakMult: 0.02 }), { type: "PICK_STAT", statId: "streakMult", rng });
    expect(s.statStreakMult).toBeCloseTo(0.04); // #94: +2 %/Pick, zweiter Pick → 0,04
  });
  it("ignoriert unbekannte Stats und Picks außerhalb der Stat-Auswahl", () => {
    const s0 = statState();
    expect(reducer(s0, { type: "PICK_STAT", statId: "nope", rng })).toBe(s0);
    const play = initialState(makeRng(1)); // phase play, kein statOffer
    expect(reducer(play, { type: "PICK_STAT", statId: "critChance", rng })).toBe(play);
  });
  it("#190: hängt den gewählten Stat an statPicks an (Mono-Stat-Challenge-Tracking)", () => {
    expect(initialState(makeRng(1)).statPicks).toEqual([]); // frischer Lauf startet leer
    const s1 = reducer(statState(), { type: "PICK_STAT", statId: "critChance", rng });
    expect(s1.statPicks).toEqual(["critChance"]);
    const s2 = reducer({ ...s1, phase: "levelup", statOffer: STAT_IDS }, { type: "PICK_STAT", statId: "critChance", rng });
    const s3 = reducer({ ...s2, phase: "levelup", statOffer: STAT_IDS }, { type: "PICK_STAT", statId: "formMult", rng });
    expect(s3.statPicks).toEqual(["critChance", "critChance", "formMult"]); // Reihenfolge bleibt erhalten
  });
});

describe("Skill-Auswahl — PICK_SKILL / DECLINE_SKILL (Stufe A)", () => {
  const LR = "SK_LIGHTNING_01";
  const skillState = (over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", skillOffer: [LR], ...over });

  it("PICK_SKILL fügt den Skill hinzu, aktiviert den Blitz-Archetyp und kehrt in play zurück", () => {
    const s = reducer(skillState(), { type: "PICK_SKILL", skillId: LR, rng });
    expect(s.phase).toBe("play");
    expect(s.skillOffer).toBeNull();
    expect(s.skills).toEqual([LR]);
    expect(s.lightning.active).toBe(true);
    expect(s.activeArchetypes).toEqual(["lightning"]);
  });

  it("PICK_SKILL ignoriert Skills außerhalb des Angebots und bereits gehaltene", () => {
    const s0 = skillState();
    expect(reducer(s0, { type: "PICK_SKILL", skillId: "SK_UNKNOWN", rng })).toBe(s0);
    const held = skillState({ skills: [LR], lightning: { active: true, charge: 0, maxCharge: 10 } });
    expect(reducer(held, { type: "PICK_SKILL", skillId: LR, rng })).toBe(held);
  });

  it("PICK_SKILL bei vollen Slots: ohne replaceId no-op, mit gültigem Ziel wird ersetzt (#95)", () => {
    // SKILL_SLOTS = 6 (echtes Spiel): volle Slots = 6 gehaltene Skills. Nur 02 (Ionisierung) ist Konsument.
    const six = ["SK_LIGHTNING_01", "SK_LIGHTNING_02", "SK_LIGHTNING_03", "SK_LIGHTNING_04", "SK_LIGHTNING_05", "SK_LIGHTNING_06"];
    const NEW = "SK_LIGHTNING_10"; // Entladung — kein Konsument, kollidiert also nicht mit dem verbleibenden 02
    const full = skillState({ skills: six, skillOffer: [NEW], lightning: { active: true, charge: 0, maxCharge: 10 } });
    // ohne Ersetzungsziel → unverändert (das war der Bug: bei vollen Slots tat der Klick nichts)
    expect(reducer(full, { type: "PICK_SKILL", skillId: NEW, rng })).toBe(full);
    // ungültiges Ziel (nicht gehalten) → unverändert
    expect(reducer(full, { type: "PICK_SKILL", skillId: NEW, replaceId: "SK_LIGHTNING_09", rng })).toBe(full);
    // gültiges Ziel → ersetzt genau diesen Slot, Reihenfolge bleibt, zurück in play
    const s = reducer(full, { type: "PICK_SKILL", skillId: NEW, replaceId: "SK_LIGHTNING_04", rng });
    expect(s.skills).toEqual(["SK_LIGHTNING_01", "SK_LIGHTNING_02", "SK_LIGHTNING_03", NEW, "SK_LIGHTNING_05", "SK_LIGHTNING_06"]);
    expect(s.phase).toBe("play");
  });

  it("PICK_SKILL erlaubt einen dritten Archetyp (Prototyp: Cap 3 aufgehoben)", () => {
    // Zwei Archetypen schon aktiv (mit gehaltenen Skills) → ein Blitz-Skill ist der dritte und jetzt WÄHLBAR.
    const twoActive = skillState({ skills: ["SK_FIRE_01", "SK_ICE_01"], activeArchetypes: ["fire", "ice"], skillOffer: [LR] });
    const s = reducer(twoActive, { type: "PICK_SKILL", skillId: LR, rng });
    expect(s.skills).toContain(LR);
    expect(s.activeArchetypes).toEqual(["fire", "ice", "lightning"]);
  });

  it("#140 letzter Feuer-Skill ersetzt → Hitzeleiste weg, Feuer deaktiviert (Blitz bleibt)", () => {
    const st = skillState({
      skills: ["SK_FIRE_01", "SK_LIGHTNING_01", "SK_LIGHTNING_03", "SK_LIGHTNING_04"],
      skillOffer: ["SK_LIGHTNING_05"], activeArchetypes: ["fire", "lightning"],
      heat: { active: true, value: 60, max: 100 }, lightning: { active: true, charge: 4, maxCharge: 10 },
    });
    const s = reducer(st, { type: "PICK_SKILL", skillId: "SK_LIGHTNING_05", replaceId: "SK_FIRE_01", rng });
    expect(s.skills).not.toContain("SK_FIRE_01");
    expect(s.heat).toBeNull();
    expect(s.activeArchetypes).toEqual(["lightning"]);
    expect(s.lightning.active).toBe(true);
  });

  it("#140 letzter Eis-Skill ersetzt → eigene Karten auftauen, Gegner-Frostbiss + Frost-Marker weg", () => {
    const base = initialState(makeRng(1));
    const deck = base.deck.map((c, i) => (i < 3 ? { ...c, frozen: true } : c));
    const st = { ...base, phase: "levelup",
      skills: ["SK_ICE_01", "SK_LIGHTNING_01", "SK_LIGHTNING_03", "SK_LIGHTNING_04"],
      skillOffer: ["SK_LIGHTNING_05"], activeArchetypes: ["ice", "lightning"],
      lightning: { active: true, charge: 2, maxCharge: 10 },
      deck, iceTemp: { x: 3 }, frostSwapsUsed: ["a"], frostbitePending: { oX: 3 }, frostbiteActive: { oY: 3 },
      layers: { c1: 4 }, frostFormPrev: ["c1"] }; // Eis-Rework (v0): Vergletscherung als Map, Schichten + Beständigkeits-Historie
    const s = reducer(st, { type: "PICK_SKILL", skillId: "SK_LIGHTNING_05", replaceId: "SK_ICE_01", rng });
    expect(s.skills).not.toContain("SK_ICE_01");
    expect(s.deck.some((c) => c.frozen)).toBe(false);
    expect(s.frostbitePending).toEqual({});
    expect(s.frostbiteActive).toEqual({});
    expect(s.iceTemp).toEqual({});
    expect(s.frostSwapsUsed).toEqual([]);
    expect(s.layers).toEqual({});          // Schichten weg
    expect(s.frostFormPrev).toEqual([]);   // Beständigkeits-Historie weg
    expect(s.activeArchetypes).toEqual(["lightning"]);
  });

  it("#140 letzter Blitz-Skill ersetzt → Ladungsleiste zurückgesetzt/inaktiv", () => {
    const st = skillState({
      skills: ["SK_LIGHTNING_01", "SK_ICE_01", "SK_ICE_03", "SK_ICE_04"],
      skillOffer: ["SK_ICE_05"], activeArchetypes: ["lightning", "ice"],
      lightning: { active: true, charge: 8, maxCharge: 10 },
    });
    const s = reducer(st, { type: "PICK_SKILL", skillId: "SK_ICE_05", replaceId: "SK_LIGHTNING_01", rng });
    expect(s.skills).not.toContain("SK_LIGHTNING_01");
    expect(s.lightning.active).toBe(false);
    expect(s.lightning.charge).toBe(0);
    expect(s.activeArchetypes).toEqual(["ice"]);
  });

  it("#140 gleicher Archetyp ersetzt (nicht der letzte) → Leiste bleibt erhalten", () => {
    const st = skillState({
      skills: ["SK_LIGHTNING_01", "SK_LIGHTNING_03", "SK_ICE_01", "SK_ICE_03"],
      skillOffer: ["SK_LIGHTNING_04"], activeArchetypes: ["lightning", "ice"],
      lightning: { active: true, charge: 6, maxCharge: 10 },
    });
    const s = reducer(st, { type: "PICK_SKILL", skillId: "SK_LIGHTNING_04", replaceId: "SK_LIGHTNING_03", rng });
    expect(s.lightning.active).toBe(true);
    expect(s.lightning.charge).toBe(6);
    expect(new Set(s.activeArchetypes)).toEqual(new Set(["lightning", "ice"]));
  });

  it("DECLINE_SKILL tauscht das Skill-Angebot gegen ein Perk-Angebot (Runde nicht verschwendet)", () => {
    const s = reducer(skillState(), { type: "DECLINE_SKILL", rng });
    expect(s.phase).toBe("levelup");
    expect(s.skillOffer).toBeNull();
    expect(s.offer).toHaveLength(3);
  });

  it("PICK_SKILL/DECLINE_SKILL sind außerhalb der Skill-Auswahl wirkungslos", () => {
    const play = initialState(makeRng(1)); // phase play, kein skillOffer
    expect(reducer(play, { type: "PICK_SKILL", skillId: LR, rng })).toBe(play);
    expect(reducer(play, { type: "DECLINE_SKILL", rng })).toBe(play);
  });
});

describe("DECLINE_PERK — Perk-Angebot ablehnen (#138)", () => {
  const perkLevelup = (over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", offer: ["L_UMV", "L2", "L4"], ...over });

  it("verwirft das Angebot und kehrt in play zurück", () => {
    const s = reducer(perkLevelup(), { type: "DECLINE_PERK" });
    expect(s.phase).toBe("play");
    expect(s.offer).toBeNull();
  });

  it("ist außerhalb der Perk-Auswahl wirkungslos (falsche Phase oder kein Angebot)", () => {
    const play = { ...initialState(makeRng(1)), phase: "play", offer: null };
    expect(reducer(play, { type: "DECLINE_PERK" })).toBe(play);
    const noOffer = { ...initialState(makeRng(1)), phase: "levelup", offer: null };
    expect(reducer(noOffer, { type: "DECLINE_PERK" })).toBe(noOffer);
  });

  it("funktioniert auch ohne shop-State", () => {
    const s = reducer(perkLevelup({ shop: undefined }), { type: "DECLINE_PERK" });
    expect(s.offer).toBeNull();
    expect(s.phase).toBe("play");
  });
});

describe("Formationsphase — SWAP/UNDO/RESET/CONFIRM (V2 §22.8)", () => {
  // 5 Karten (ein Segment). Werte 5,8,5,2,3 → ohne Formation; Tausch von Pos 1↔2 baut ein Wiederholungspaar (5,5).
  const deck = [
    { id: "a", suit: "R", baseRank: 5, value: 5 },
    { id: "b", suit: "B", baseRank: 8, value: 8 },
    { id: "c", suit: "G", baseRank: 5, value: 5 },
    { id: "d", suit: "Y", baseRank: 2, value: 2 },
    { id: "e", suit: "R", baseRank: 3, value: 3 },
  ];
  const formState = (over = {}) => ({
    ...initialState(makeRng(1)), phase: "formation", deck,
    playerOrder: [0, 1, 2, 3, 4], formationEnergy: 4, formationSwaps: [],
    formations: computeFormations([0, 1, 2, 3, 4], deck), ...over,
  });

  it("SWAP_CARDS tauscht, kostet 1 Energie, merkt den Tausch, berechnet Formationen neu", () => {
    const s = reducer(formState(), { type: "SWAP_CARDS", i: 1, j: 2 });
    expect(s.playerOrder).toEqual([0, 2, 1, 3, 4]);      // Werte jetzt 5,5,8,2,3
    expect(s.formationEnergy).toBe(3);
    expect(s.formationSwaps).toEqual([{ i: 1, j: 2, free: false, frozenId: null, idA: "b", idB: "c" }]); // #93 F3: Frost-Info · #201.4: getauschte Karten-IDs
    expect(s.formations[1].mult).toBeCloseTo(1.25);      // 2. Karte des neuen Wiederholungspaars
  });
  it("SWAP_CARDS ohne Energie oder mit i==j ist wirkungslos", () => {
    const noE = formState({ formationEnergy: 0 });
    expect(reducer(noE, { type: "SWAP_CARDS", i: 0, j: 1 })).toBe(noE);
    const s0 = formState();
    expect(reducer(s0, { type: "SWAP_CARDS", i: 2, j: 2 })).toBe(s0);
  });
  it("UNDO_SWAP macht den letzten Tausch rückgängig und erstattet Energie", () => {
    let s = reducer(formState(), { type: "SWAP_CARDS", i: 1, j: 2 });
    s = reducer(s, { type: "UNDO_SWAP" });
    expect(s.playerOrder).toEqual([0, 1, 2, 3, 4]);
    expect(s.formationEnergy).toBe(4);
    expect(s.formationSwaps).toEqual([]);
  });
  it("RESET_FORMATION nimmt alle Tausche zurück und stellt die volle Energie her", () => {
    let s = reducer(formState(), { type: "SWAP_CARDS", i: 0, j: 1 });
    s = reducer(s, { type: "SWAP_CARDS", i: 2, j: 3 });
    expect(s.formationEnergy).toBe(2);
    s = reducer(s, { type: "RESET_FORMATION" });
    expect(s.playerOrder).toEqual([0, 1, 2, 3, 4]);
    expect(s.formationEnergy).toBe(4);
    expect(s.formationSwaps).toEqual([]);
  });
  it("CONFIRM_FORMATION geht in play, die aufgestellte Reihenfolge bleibt", () => {
    let s = reducer(formState(), { type: "SWAP_CARDS", i: 1, j: 2 });
    s = reducer(s, { type: "CONFIRM_FORMATION" });
    expect(s.phase).toBe("play");
    expect(s.playerOrder).toEqual([0, 2, 1, 3, 4]);
    expect(s.formationEnergy).toBe(0);
  });
  it("Aktionen außerhalb der Formationsphase sind wirkungslos", () => {
    const play = initialState(makeRng(1));
    expect(reducer(play, { type: "SWAP_CARDS", i: 0, j: 1 })).toBe(play);
    expect(reducer(play, { type: "CONFIRM_FORMATION" })).toBe(play);
  });
});

// Kat.-C-Rollen (inkl. C9 Opfergabe) sind zu Familien migriert (#167) → laufen über den Familien-Ziel-Fluss
// (FAMILY_TARGET_*, geprüft in families-engine.test.js). Die Ziel-Legendären (L1 Überladung / L9 Blutvertrag,
// needsTarget/permMod) sind im Legendär-Perks-Rework (#203) entfernt; der einzige deck-umformende Legendär ist jetzt
// Umverteilung (L_UMV, KEIN Ziel-Schritt, oben geprüft). Das flache CONFIRM_TARGET/needsTarget bleibt als (aktuell
// ungenutzte) Reducer-Infrastruktur für die spätere UI (TargetSelect) erhalten.

describe("RESOLVE_TRICK — Reducer-Dispatch (#158)", () => {
  it("dispatcht auf resolveTrick und reicht action.rng durch", () => {
    const play = initialState(makeRng(1)); // phase play
    // Bislang riefen alle Engine-Tests resolveTrick direkt auf; die Case-Verdrahtung + action.rng-Weitergabe im
    // Reducer war ungetestet. Gleiche Eingaben (frischer rng gleichen Seeds) → deep-gleiches Ergebnis.
    const viaReducer = reducer(play, { type: "RESOLVE_TRICK", rng: makeRng(3) });
    expect(viaReducer).toEqual(resolveTrick(play, makeRng(3)));
    expect(viaReducer.lastTrick).toBeTruthy();          // ein Stich wurde aufgelöst
    expect(viaReducer.trickNo).toBe((play.trickNo || 0) + 1);
  });
  it("außerhalb der play-Phase No-Op (resolveTrick gibt den State zurück)", () => {
    const menu = { ...initialState(makeRng(1)), phase: "menu" };
    expect(reducer(menu, { type: "RESOLVE_TRICK", rng })).toBe(menu);
  });
});

describe("PICK_STAT — Formations-/Crit-Mult-Felder (#158)", () => {
  const statState = (over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", statOffer: STAT_IDS, ...over });
  it("formMult addiert den Step aufs statFormMult-Feld", () => {
    const s = reducer(statState(), { type: "PICK_STAT", statId: "formMult", rng });
    expect(s.statFormMult).toBeCloseTo(0.05); // STAT_FORM_MULT_STEP
    expect(s.phase).toBe("play");
  });
  it("critMult addiert (stapelnd) aufs statCritMult-Feld", () => {
    const s = reducer(statState({ statCritMult: 0.25 }), { type: "PICK_STAT", statId: "critMult", rng });
    expect(s.statCritMult).toBeCloseTo(0.5); // 0,25 + STAT_CRIT_MULT_STEP (0,25)
  });
});
