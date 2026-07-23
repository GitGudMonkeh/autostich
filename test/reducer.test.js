import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, initialState, menuState } from "../src/game/reducer.js";
import { STAT_IDS } from "../src/game/stats.js";

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

  it("L7 Königsmacher (#71): Karten ≥13 einmalig +2 — beim Pick und nach späteren Aufwertungen", () => {
    const deck = [
      { id: "A", suit: "R", baseRank: 0, value: 13 },
      { id: "B", suit: "R", baseRank: 1, value: 11 },
      { id: "C", suit: "R", baseRank: 2, value: 1 },
    ];
    let s = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L7"], deck, perks: [], level: 5, pendingLevelUps: 0 };
    s = reducer(s, { type: "PICK_PERK", perkId: "L7", rng: makeRng(1) });
    expect(s.deck.find((c) => c.id === "A").value).toBe(15); // 13 → +2
    expect(s.deck.find((c) => c.id === "B").value).toBe(11); // <13 → unverändert
    expect(s.kingBoosted).toEqual(["A"]);
    // Spätere Aufwertung (L1 „Überladung": alle +2) hebt B auf 13 → Königsmacher +2 → 15; A schon geboostet.
    s = { ...s, phase: "levelup", offer: ["L1"], pendingLevelUps: 0 };
    s = reducer(s, { type: "PICK_PERK", perkId: "L1", rng: makeRng(1) });
    expect(s.deck.find((c) => c.id === "B").value).toBe(15); // 11 +2(L1)=13 → +2(König)
    expect(s.deck.find((c) => c.id === "A").value).toBe(17); // 15 +2(L1)=17, kein Doppel-Boost
    expect(new Set(s.kingBoosted)).toEqual(new Set(["A", "B"]));
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
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["A1", "C1", "E2"] };
    const s1 = reducer(s0, { type: "PICK_PERK", perkId: "C1", rng });
    expect(s1.phase).toBe("play");
    expect(s1.offer).toBeNull();
    expect(s1.perks).toEqual(["C1"]);
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
    expect(s.statCritChance).toBeCloseTo(0.02);
  });
  it("stapelt additiv über mehrere Picks", () => {
    const s = reducer(statState({ statStreakMult: 0.005 }), { type: "PICK_STAT", statId: "streakMult", rng });
    expect(s.statStreakMult).toBeCloseTo(0.01);
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
