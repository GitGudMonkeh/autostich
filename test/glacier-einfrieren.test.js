import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { ROLES } from "../src/game/glacier.js";

// Eis-Neudesign Phase 3.2d — Einfrieren (Frostgriff): bricht ein Gletscher, verliert die getroffene Gegnerkarte
// ihren nächsten Stich garantiert. Gegner-Marker (pending → active), spiegelt das Frostbiss-Muster.
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };
const withMass = (pairs) => { const m = zeros(); for (const [p, v] of pairs) m[p] = v; return m; };
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});

describe("Einfrieren — Markierung beim Bruch", () => {
  it("ein brechender Gletscher friert die an seiner Position getroffene Gegnerkarte ein (pending)", () => {
    const s = resolveTrick(scen({ glacierLocked: lockAt(0), glacierMass: withMass([[0, 12]]), glacierRoles: [ROLES.EINFRIEREN] }), noCrit);
    expect(s.frozenOppPending["O0"]).toBe(true); // oCard an pos0 = O0
  });
  it("ohne Einfrieren wird nicht markiert", () => {
    const s = resolveTrick(scen({ glacierLocked: lockAt(0), glacierMass: withMass([[0, 12]]) }), noCrit);
    expect(s.frozenOppPending["O0"]).toBeUndefined();
  });
  it("ein Gletscher, der NICHT bricht, friert nichts ein", () => {
    const s = resolveTrick(scen({ glacierLocked: lockAt(0), glacierMass: withMass([[0, 2]]), glacierRoles: [ROLES.EINFRIEREN] }), noCrit);
    expect(s.frozenOppPending["O0"]).toBeUndefined(); // Masse 2 < Schwelle → kein Bruch
  });
});

describe("Einfrieren — Wirkung", () => {
  it("eingefrorene Gegnerkarte verliert ihren Stich garantiert (auch bei höherem Wert)", () => {
    const s = resolveTrick(scen({ oppDeck: oppOf(99), frozenOppActive: { O0: true } }), noCrit); // pos0: Spieler 12 vs Gegner 99
    expect(s.lastTrick.result).toBe("win");
  });
  it("ohne aktiven Gletscher-Archetyp greift die Marke nicht", () => {
    const s = resolveTrick(scen({ activeArchetypes: [], oppDeck: oppOf(99), frozenOppActive: { O0: true } }), noCrit);
    expect(s.lastTrick.result).toBe("loss");
  });
});
