import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";

// bestGlacierTrickScore: der beste Gletscher-Stich wird SEPARAT vom „besten Stich" geführt (der Bruch-Score fließt
// erst nach der bestTrickScore-Buchung in `gained`). Harness wie glacier-v0.test.js.
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(5), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), ...over,
});

describe("bestGlacierTrickScore — bester Gletscher-Stich (separat)", () => {
  it("ein Gletscher-Bruch setzt den besten Gletscher-Stich (voller gained inkl. Bruch)", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 12;
    const s = resolveTrick(scen({ oppDeck: oppOf(1), glacierLocked, glacierMass }), noCrit); // Sieg mit Bruch
    expect(s.lastTrick.breakdown.glacierDirect).toBeGreaterThan(0);
    expect(s.bestGlacierTrickScore).toBeGreaterThanOrEqual(s.lastTrick.breakdown.glacierDirect);
    expect(s.bestGlacierTrickScore).toBeGreaterThan(0);
  });

  it("Bruch bei Niederlage zählt auch (Burst ist ausgangsunabhängig)", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 12;
    const s = resolveTrick(scen({ oppDeck: oppOf(99), glacierLocked, glacierMass }), noCrit); // Niederlage, aber Bruch
    expect(s.lastTrick.result).toBe("loss");
    expect(s.bestGlacierTrickScore).toBeGreaterThan(0);
  });

  it("ohne Bruch bleibt der beste Gletscher-Stich 0 (auch bei normalem Sieg)", () => {
    const s = resolveTrick(scen({ oppDeck: oppOf(1) }), noCrit); // Sieg, aber kein Gletscher
    expect(s.lastTrick.result).toBe("win");
    expect(s.bestGlacierTrickScore).toBe(0);
  });

  it("ohne Eis-Archetyp inert (kein Gletscher-Stich getrackt)", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 12;
    const s = resolveTrick(scen({ activeArchetypes: [], oppDeck: oppOf(1), glacierLocked, glacierMass }), noCrit);
    expect(s.bestGlacierTrickScore).toBe(0);
  });
});
