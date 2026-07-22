import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, initialState } from "../src/game/reducer.js";

const rng = makeRng(1);

describe("Reducer", () => {
  it("initialState: play-Phase, volle Leben, Level 1, leerer Build", () => {
    const s = initialState(makeRng(1));
    expect(s.phase).toBe("play");
    expect(s.life).toBe(2000);
    expect(s.level).toBe(1);
    expect(s.perks).toEqual([]);
    expect(s.deck).toHaveLength(52);
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
    expect(reducer(s0, { type: "PICK_PERK", perkId: "E2", rng }).speedPct).toBe(20);
  });

  it("PICK_PERK ignoriert Perks außerhalb des Angebots", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["A1", "C1", "E2"] };
    expect(reducer(s0, { type: "PICK_PERK", perkId: "D5", rng })).toBe(s0);
  });

  it("RESET beginnt einen frischen Lauf", () => {
    const dirty = { ...initialState(makeRng(1)), score: 999, level: 8, perks: ["A1", "D1"] };
    const fresh = reducer(dirty, { type: "RESET", rng });
    expect(fresh.score).toBe(0);
    expect(fresh.level).toBe(1);
    expect(fresh.perks).toEqual([]);
  });
});
