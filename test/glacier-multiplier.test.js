import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";

// Eis-Neudesign: der Gletscher-Bruch profitiert vom VOLLEN Sieg-Stack, WENN die Gletscher-Karte ihren Stich gewinnt
// (Serie × Perk × Formation × Crit × …). Bei Niederlage bleibt es der Basis-Burst (×1).
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const rep = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: rep(12), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});

describe("Gletscher-Bruch × Sieg-Stack", () => {
  it("Bruch bei Sieg in Formation zahlt mehr aus als derselbe Bruch bei Niederlage", () => {
    // Gletscher an pos 1 mit voller Masse (bricht). rep(12) → pos 1 steht in einer Wiederholungs-Formation (Mult > 1).
    const glacierLocked = falses(); glacierLocked[1] = true;
    const gm = zeros(); gm[1] = 12;

    // Sieg: Gegnerwert 1 → unsere 12 gewinnt; der Bruch nimmt Formation/Serie mit.
    let win = scen({ oppDeck: oppOf(1), glacierMass: gm, glacierLocked });
    win = resolveTrick(win, noCrit); // pos 0
    win = resolveTrick(win, noCrit); // pos 1 — Gletscher bricht IM Sieg + Formation
    expect(win.lastTrick.formationMult).toBeGreaterThan(1);

    // Niederlage: Gegnerwert 99 → wir verlieren; derselbe Bruch, aber ×1 (kein Sieg-Stack).
    let loss = scen({ oppDeck: oppOf(99), glacierMass: gm, glacierLocked });
    loss = resolveTrick(loss, noCrit); // pos 0
    loss = resolveTrick(loss, noCrit); // pos 1 — Gletscher bricht IN der Niederlage

    expect(loss.glacierYield).toBeGreaterThan(0);               // Basis-Burst fällt auch bei Niederlage an
    expect(win.glacierYield).toBeGreaterThan(loss.glacierYield); // Sieg-Stack hebt den Bruch
  });

  it("ohne Sieg ist der Bruch der reine Basis-Burst (kein Multiplikator)", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const gm = zeros(); gm[0] = 12;
    // pos 0 ist die erste Karte (Formationsfaktor 1) und verliert → glacierWinMult = 1.
    const s = resolveTrick(scen({ oppDeck: oppOf(99), glacierMass: gm, glacierLocked }), noCrit);
    // Basis-Burst = payout[0] aus der Precompute; glacierYield entspricht exakt diesem (×1).
    expect(s.glacierYield).toBe(s.glacierPre.payout[0]);
  });
});
