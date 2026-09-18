import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { ROLES } from "../src/game/glacier.js";

/* Eis-Neudesign Phase 3.2d — Einfrieren (Frostgriff): bricht ein Gletscher, verlieren Gegnerkarten ihren nächsten
   Stich garantiert. Gegner-Marker (pending → active), spiegelt das Frostbiss-Muster.
   §5.25 (Owner): der Griff nimmt die HÖCHSTEN Karten des Gegnerdecks statt der zufällig getroffenen. */
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

// Gegnerdeck mit einer klaren Rangfolge: O0 ist die höchste Karte, O39 die niedrigste.
const oppRanked = () => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: 40 - i, value: 40 - i }));
// Gegnerdeck mit EINER Spitze, die woanders liegt als der Gletscher: O7 ist hoch, alle übrigen gleich niedrig.
const oppPeakAt7 = () => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: i === 7 ? 40 : 3, value: i === 7 ? 40 : 3 }));

describe("Einfrieren — Markierung beim Bruch", () => {
  it("ein brechender Gletscher friert die HÖCHSTE Gegnerkarte ein, nicht die getroffene", () => {
    // Der Gletscher liegt auf pos0 und trifft dort O0 — eingefroren wird trotzdem die stärkste Karte des Decks (O7).
    const s = resolveTrick(scen({ oppDeck: oppPeakAt7(), glacierLocked: lockAt(0), glacierMass: withMass([[0, 12]]), glacierRoles: [ROLES.EINFRIEREN] }), noCrit);
    expect(s.frozenOppPending["O7"]).toBe(true);
    expect(s.frozenOppPending["O0"]).toBeUndefined();
  });
  it("die Stufe entscheidet, wie viele der höchsten Karten es trifft", () => {
    const griff = (tier) => resolveTrick(scen({
      oppDeck: oppRanked(), glacierLocked: lockAt(0), glacierMass: withMass([[0, 12]]),
      glacierRoles: [ROLES.EINFRIEREN], glacierRoleTiers: { [ROLES.EINFRIEREN]: tier },
    }), noCrit).frozenOppPending;
    expect(Object.keys(griff(0))).toEqual(["O0"]);                        // Normal: eine Karte
    expect(Object.keys(griff(3)).sort()).toEqual(["O0", "O1", "O2", "O3", "O4"]); // Episch: die fünf höchsten
  });
  it("ohne Einfrieren wird nicht markiert", () => {
    const s = resolveTrick(scen({ oppDeck: oppRanked(), glacierLocked: lockAt(0), glacierMass: withMass([[0, 12]]) }), noCrit);
    expect(Object.keys(s.frozenOppPending)).toHaveLength(0);
  });
  it("ein Gletscher, der NICHT bricht, friert nichts ein", () => {
    const s = resolveTrick(scen({ oppDeck: oppRanked(), glacierLocked: lockAt(0), glacierMass: withMass([[0, 2]]), glacierRoles: [ROLES.EINFRIEREN] }), noCrit);
    expect(Object.keys(s.frozenOppPending)).toHaveLength(0); // Masse 2 < Schwelle → kein Bruch
  });

  /* Der Grund, warum schon markierte Karten übersprungen werden: sonst griffe jeder weitere Bruch im selben
     Durchlauf dieselbe höchste Karte, und die Stufe wäre für einen Mehrfach-Bruch wertlos. */
  it("ein zweiter Bruch im selben Durchlauf nimmt die NÄCHSTE Karte, nicht dieselbe", () => {
    let s = scen({ oppDeck: oppRanked(), glacierLocked: lockAt(0, 1), glacierMass: withMass([[0, 12], [1, 12]]), glacierRoles: [ROLES.EINFRIEREN] });
    s = resolveTrick(s, noCrit);   // pos0 bricht → O0
    s = resolveTrick(s, noCrit);   // pos1 bricht → O1
    expect(Object.keys(s.frozenOppPending).sort()).toEqual(["O0", "O1"]);
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
