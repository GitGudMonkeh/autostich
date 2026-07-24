import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, initialState, menuState } from "../src/game/reducer.js";
import { STAT_IDS } from "../src/game/stats.js";
import { computeFormations } from "../src/game/formations.js";

const rng = makeRng(1);

describe("Reducer", () => {
  it("initialState: play-Phase, kein Leben mehr (V2), leerer Build (Basis-State)", () => {
    const s = initialState(makeRng(1));
    expect(s.phase).toBe("play");
    expect(s.life).toBeUndefined(); // V2: Leben restlos entfernt
    expect(s.perks).toEqual([]);
    expect(s.deck).toHaveLength(40);
  });

  it("PICK_PERK wendet eine Deck-Mod an und kehrt in play zurück", () => {
    const base = initialState(makeRng(1));
    const s0 = { ...base, phase: "levelup", offer: ["A1", "C1", "E2"] };
    const s1 = reducer(s0, { type: "PICK_PERK", perkId: "A1", rng });
    expect(s1.phase).toBe("play");
    expect(s1.perks).toEqual(["A1"]);
    expect(s1.offer).toBeNull();
    expect(s1.deck.filter((c) => c.value === 5)).toHaveLength(0); // A1 hat die 5er hochgezogen
  });

  it("PICK_PERK ignoriert Perks außerhalb des Angebots", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["A1", "C1", "E2"] };
    expect(reducer(s0, { type: "PICK_PERK", perkId: "D5", rng })).toBe(s0);
  });

  it("L1 Überladung (Ziel-Perk): CONFIRM_TARGET gibt 5 gewählten Karten +6", () => {
    let s = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L1"] };
    s = reducer(s, { type: "PICK_PERK", perkId: "L1", rng: makeRng(1) });
    expect(s.phase).toBe("target");
    const ids = s.playerOrder.slice(0, 5).map((di) => s.deck[di].id);
    const vals = ids.map((id) => s.deck.find((c) => c.id === id).value);
    s = reducer(s, { type: "CONFIRM_TARGET", cardIds: ids });
    ids.forEach((id, i) => expect(s.deck.find((c) => c.id === id).value).toBe(vals[i] + 6));
  });
  it("L5 Jackpot (Zufalls-Rolle): PICK_PERK setzt 4 zufällige Karten als Rolle und geht direkt in play", () => {
    let s = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L5"] };
    s = reducer(s, { type: "PICK_PERK", perkId: "L5", rng: makeRng(1) });
    expect(s.phase).toBe("play");
    expect(s.roles.L5).toHaveLength(4);
    expect(new Set(s.roles.L5).size).toBe(4);
  });

  it("RESET beginnt einen frischen Lauf mit Start-Pick = Stat (V2 §22.2)", () => {
    const dirty = { ...initialState(makeRng(1)), score: 999, perks: ["A1", "D1"] };
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
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["A1", "B1", "D1"] };
    const s1 = reducer(s0, { type: "PICK_PERK", perkId: "B1", rng });
    expect(s1.phase).toBe("play");
    expect(s1.offer).toBeNull();
    expect(s1.perks).toEqual(["B1"]);
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
    expect(s.statCritChance).toBeCloseTo(0.05); // #94: +5 pp je Pick
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
    const four = ["SK_LIGHTNING_01", "SK_LIGHTNING_02", "SK_LIGHTNING_03", "SK_LIGHTNING_04"];
    const NEW = "SK_LIGHTNING_05";
    const full = skillState({ skills: four, skillOffer: [NEW], lightning: { active: true, charge: 0, maxCharge: 10 } });
    // ohne Ersetzungsziel → unverändert (das war der Bug: bei vollen Slots tat der Klick nichts)
    expect(reducer(full, { type: "PICK_SKILL", skillId: NEW, rng })).toBe(full);
    // ungültiges Ziel (nicht gehalten) → unverändert
    expect(reducer(full, { type: "PICK_SKILL", skillId: NEW, replaceId: "SK_LIGHTNING_07", rng })).toBe(full);
    // gültiges Ziel → ersetzt genau diesen Slot, Reihenfolge bleibt, zurück in play
    const s = reducer(full, { type: "PICK_SKILL", skillId: NEW, replaceId: "SK_LIGHTNING_02", rng });
    expect(s.skills).toEqual(["SK_LIGHTNING_01", NEW, "SK_LIGHTNING_03", "SK_LIGHTNING_04"]);
    expect(s.phase).toBe("play");
  });

  it("PICK_SKILL blockt einen dritten Archetyp (Max 2, #93 F0)", () => {
    // Zwei Archetypen schon aktiv (Mock-Werte) → ein Blitz-Skill wäre der dritte, also nicht wählbar.
    const twoActive = skillState({ activeArchetypes: ["fire", "ice"], skillOffer: [LR] });
    expect(reducer(twoActive, { type: "PICK_SKILL", skillId: LR, rng })).toBe(twoActive);
    // ein bereits aktiver Archetyp bleibt wählbar
    const withLightning = skillState({ activeArchetypes: ["lightning"], lightning: { active: true, charge: 0, maxCharge: 10 }, skillOffer: [LR] });
    expect(reducer(withLightning, { type: "PICK_SKILL", skillId: LR, rng }).skills).toContain(LR);
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
    expect(s.formationSwaps).toEqual([{ i: 1, j: 2 }]);
    expect(s.formations[1].mult).toBeCloseTo(1.30);      // 2. Karte des neuen Wiederholungspaars
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

describe("Kartenrollen — Zielauswahl PICK_PERK/CONFIRM_TARGET (V2 §22.6 C)", () => {
  const lvl = (over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", offer: ["C1", "A1", "D1"], ...over });

  it("PICK_PERK eines Ziel-Perks öffnet die Zielauswahl (phase target)", () => {
    const s = reducer(lvl(), { type: "PICK_PERK", perkId: "C1", rng });
    expect(s.phase).toBe("target");
    expect(s.targetPerk).toBe("C1");
    expect(s.perks).toEqual(["C1"]); // Perk bereits gehalten
  });
  it("CONFIRM_TARGET setzt die Rolle und geht in play", () => {
    let s = reducer(lvl(), { type: "PICK_PERK", perkId: "C1", rng });
    const ids = s.playerOrder.slice(0, 3).map((di) => s.deck[di].id);
    s = reducer(s, { type: "CONFIRM_TARGET", cardIds: ids });
    expect(s.phase).toBe("play");
    expect(s.targetPerk).toBeNull();
    expect(s.roles.C1).toEqual(ids);
  });
  it("CONFIRM_TARGET verlangt genau needsTarget unterschiedliche Karten", () => {
    const s = reducer(lvl(), { type: "PICK_PERK", perkId: "C1", rng });
    const two = s.playerOrder.slice(0, 2).map((di) => s.deck[di].id);
    expect(reducer(s, { type: "CONFIRM_TARGET", cardIds: two })).toBe(s); // zu wenige → wirkungslos
  });
  it("C9 Opfergabe: gewählte Karte −3, direkter Nachfolger +5 (dauerhaft)", () => {
    let s = { ...initialState(makeRng(1)), phase: "levelup", offer: ["C9", "A1", "D1"] };
    s = reducer(s, { type: "PICK_PERK", perkId: "C9", rng });
    const targetDi = s.playerOrder[0], succDi = s.playerOrder[1];
    const tv = s.deck[targetDi].value, sv = s.deck[succDi].value;
    s = reducer(s, { type: "CONFIRM_TARGET", cardIds: [s.deck[targetDi].id] });
    expect(s.deck[targetDi].value).toBe(Math.max(0, tv - 3));
    expect(s.deck[succDi].value).toBe(sv + 5);
  });

  it("L9 Blutvertrag: 4 gewählte Karten −2, ihre direkten Nachfolger +6 (dauerhaft)", () => {
    let s = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L9", "A1", "D1"] };
    s = reducer(s, { type: "PICK_PERK", perkId: "L9", rng: makeRng(1) });
    expect(s.phase).toBe("target");
    const order = s.playerOrder;
    const targetPos = [0, 2, 4, 6];                          // nicht benachbart → Nachfolger disjunkt von den Zielen
    const ids = targetPos.map((p) => s.deck[order[p]].id);
    const before = s.deck.map((c) => c.value);
    s = reducer(s, { type: "CONFIRM_TARGET", cardIds: ids });
    for (const p of targetPos) {
      expect(s.deck[order[p]].value).toBe(Math.max(0, before[order[p]] - 2)); // Ziel −2 (Boden 0)
      expect(s.deck[order[p + 1]].value).toBe(before[order[p + 1]] + 6);      // direkter Nachfolger +6
    }
  });
});
