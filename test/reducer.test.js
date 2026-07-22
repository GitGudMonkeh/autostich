import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, initialState, menuState } from "../src/game/reducer.js";

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

  it("RESOLVE_TRICK reicht action.lossCost an die Engine durch (#32)", () => {
    const constDeck = (v) => Array.from({ length: 52 }, (_, i) => ({ id: `X${i}`, suit: "R", baseRank: v, value: v }));
    const id52 = Array.from({ length: 52 }, (_, i) => i);
    // Erzwungene Niederlage (Spieler 0 vs. Gegner 12).
    const losing = { ...initialState(makeRng(1)), deck: constDeck(0), oppDeck: constDeck(12), playerOrder: id52, oppOrder: id52, life: 100 };
    expect(reducer(losing, { type: "RESOLVE_TRICK", rng, lossCost: 25 }).life).toBe(75);
    expect(reducer(losing, { type: "RESOLVE_TRICK", rng }).life).toBe(90); // ohne Payload → Default 10
  });
});
