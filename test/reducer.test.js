import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, initialState, menuState } from "../src/game/reducer.js";
import { TRICKS_PER_CYCLE, PREDICTION_MAX } from "../src/game/constants.js";

const rng = makeRng(1);

describe("Reducer", () => {
  it("initialState: play-Phase, volle Leben, Level 1, leerer Build", () => {
    const s = initialState(makeRng(1));
    expect(s.phase).toBe("play");
    expect(s.life).toBe(2000);
    expect(s.level).toBe(1);
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
    expect(s1.deck.filter((c) => c.value === 5)).toHaveLength(0); // A1 hat 5→7 gemacht
  });

  it("PICK_PERK für Tempo-Perk erhöht speedPct", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["E2", "A1", "C1"] };
    expect(reducer(s0, { type: "PICK_PERK", perkId: "E2", rng }).speedPct).toBe(30);
  });

  it("PICK_PERK für C5 gewährt sofort 50 Schildpunkte", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["C5", "A1", "D1"] };
    expect(reducer(s0, { type: "PICK_PERK", perkId: "C5", rng }).shield).toBe(50);
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

  it("RESET beginnt einen frischen Lauf", () => {
    const dirty = { ...initialState(makeRng(1)), score: 999, level: 8, perks: ["A1", "D1"] };
    const fresh = reducer(dirty, { type: "RESET", rng });
    expect(fresh.score).toBe(0);
    expect(fresh.level).toBe(1);
    expect(fresh.perks).toEqual([]);
  });

  it("START_RUN startet aus dem Menü einen frischen Lauf in play", () => {
    const s = reducer(menuState(), { type: "START_RUN", rng });
    expect(s.phase).toBe("play");
    expect(s.trickNo).toBe(0);
    expect(s.perks).toEqual([]);
  });

  it("TO_MENU verlässt den Lauf zurück ins Menü", () => {
    expect(reducer(initialState(makeRng(1)), { type: "TO_MENU" }).phase).toBe("menu");
  });
});

describe("Reducer — Ansage-System (#36)", () => {
  const predState = () => ({ ...initialState(makeRng(1)), phase: "prediction", predictionDue: true, cycleWins: 22, cycleBaseScore: 500 });

  it("PREDICTION_MAX leitet sich aus TRICKS_PER_CYCLE (40) ab", () => {
    expect(PREDICTION_MAX).toBe(TRICKS_PER_CYCLE);
    expect(PREDICTION_MAX).toBe(40);
  });

  it("SUBMIT_PREDICTION (gültig) → phase play, Ansage gesetzt, Zyklus-Akkus zurückgesetzt", () => {
    const s = reducer(predState(), { type: "SUBMIT_PREDICTION", prediction: 25, rng });
    expect(s.phase).toBe("play");
    expect(s.prediction).toBe(25);
    expect(s.predictionDue).toBe(false);
    expect(s.pos).toBe(0);
    expect(s.cycleWins).toBe(0);
    expect(s.cycleBaseScore).toBe(0);
  });

  it("SUBMIT_PREDICTION lehnt < 0, > 40 und nicht-ganzzahlige Werte ab (bleibt in prediction)", () => {
    for (const bad of [-1, 41, 5.5]) {
      const s = reducer(predState(), { type: "SUBMIT_PREDICTION", prediction: bad, rng });
      expect(s.phase).toBe("prediction");
      expect(s.prediction).toBeNull();
    }
    expect(reducer(predState(), { type: "SUBMIT_PREDICTION", prediction: 0, rng }).prediction).toBe(0);   // Rand gültig
    expect(reducer(predState(), { type: "SUBMIT_PREDICTION", prediction: 40, rng }).prediction).toBe(40); // Rand gültig
  });

  it("SUBMIT_PREDICTION außerhalb der prediction-Phase wird ignoriert", () => {
    const play = initialState(makeRng(1));
    expect(reducer(play, { type: "SUBMIT_PREDICTION", prediction: 10, rng })).toBe(play);
  });

  it("Ansage bleibt den ganzen Durchlauf unverändert (RESOLVE_TRICK ändert sie nicht)", () => {
    const play = { ...initialState(makeRng(1)), prediction: 25 };
    expect(reducer(play, { type: "RESOLVE_TRICK", rng }).prediction).toBe(25);
  });
});

describe("Level-Up-Queue — PICK_PERK (#57)", () => {
  it("bei pendingLevelUps > 0 folgt ein weiteres Angebot mit dem neuen Build", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", level: 4, offer: ["A1", "C1", "E2"], pendingLevelUps: 2 };
    const s1 = reducer(s0, { type: "PICK_PERK", perkId: "A1", rng });
    expect(s1.perks).toEqual(["A1"]);
    expect(s1.phase).toBe("levelup");
    expect(s1.offer.length).toBeGreaterThan(0);
    expect(s1.pendingLevelUps).toBe(1);
  });
  it("letztes Level-Up (pendingLevelUps 0) → zurück in play, offer null", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", level: 4, offer: ["A1", "C1", "E2"], pendingLevelUps: 0 };
    const s1 = reducer(s0, { type: "PICK_PERK", perkId: "A1", rng });
    expect(s1.phase).toBe("play");
    expect(s1.offer).toBeNull();
    expect(s1.pendingLevelUps).toBe(0);
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
