import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { precomputeGlacier, glacierOpts, ROLES } from "../src/game/glacier.js";
import { N_POS, posOf } from "../src/game/architect.js";

// Eis-Neudesign Phase 3.2 Gruppe C2 — Snapshot-Bruch-Mechanik (Kettenbruch/Gletschersturz/Eisbrücke-Kaskade).
const zeros = () => new Array(N_POS).fill(0);
const withMass = (pairs) => { const m = zeros(); for (const [p, v] of pairs) m[p] = v; return m; };
const set = (...ps) => new Set(ps);

describe("Kettenbruch — Bruch reißt Nachbarn mit", () => {
  it("ein brechender Gletscher zwingt einen angrenzenden Unter-Schwelle-Gletscher mitzubrechen", () => {
    const mass = withMass([[0, 8], [1, 2]]);          // pos0 bricht (Stufe 2), pos1 (Masse 2) läge unter der Schwelle
    const base = precomputeGlacier(mass, set(0, 1));
    const kette = precomputeGlacier(mass, set(0, 1), glacierOpts([ROLES.KETTENBRUCH]));
    expect(base.payout[1]).toBe(0);                    // allein bricht pos1 nicht
    expect(kette.payout[1]).toBeGreaterThan(0);        // Kettenbruch reißt es mit (erzwungen, Stufe ≥ 1)
    expect(kette.breaks.find((b) => b.pos === 1).forced).toBe(true);
  });
});

describe("Gletschersturz — je mehr brechen, desto stärker jeder Bruch", () => {
  it("zwei gleichzeitig brechende Gletscher verstärken sich mit Gletschersturz", () => {
    const mass = withMass([[0, 8], [1, 8]]);
    const base = precomputeGlacier(mass, set(0, 1));
    const sturz = precomputeGlacier(mass, set(0, 1), glacierOpts([ROLES.GLETSCHERSTURZ]));
    expect(sturz.payout[0]).toBeGreaterThan(base.payout[0]);
  });
  it("mehr gleichzeitige Brüche → stärkere Amp (3 vs 1)", () => {
    const one = precomputeGlacier(withMass([[0, 8]]), set(0), glacierOpts([ROLES.GLETSCHERSTURZ]));
    const three = precomputeGlacier(withMass([[0, 8], [1, 8], [2, 8]]), set(0, 1, 2), glacierOpts([ROLES.GLETSCHERSTURZ]));
    expect(three.payout[0] / 8).toBeGreaterThan(one.payout[0] / 8); // pro Masse-Einheit stärker
  });
});

describe("Eisbrücke — Diagonalen zählen für die Kaskade", () => {
  it("diagonal benachbarte Gletscher verstärken den Burst nur mit Eisbrücke", () => {
    const mass = withMass([[0, 8], [posOf(1, 1), 8]]);  // pos0 und pos(1,1) diagonal
    const base = precomputeGlacier(mass, set(0, posOf(1, 1)));
    const bridge = precomputeGlacier(mass, set(0, posOf(1, 1)), glacierOpts([ROLES.EISBRUECKE]));
    expect(bridge.payout[0]).toBeGreaterThan(base.payout[0]); // Diagonale zählt → Kaskade greift
  });
});

describe("Engine-Verdrahtung — glacierOpts erreicht precompute", () => {
  const identity = () => Array.from({ length: 40 }, (_, i) => i);
  const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
  const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
  const falses = () => new Array(40).fill(false);
  const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };
  const noCrit = () => 0.99;
  it("Kettenbruch über glacierRoles: der erzwungene Nachbar zahlt an seinem Stich aus", () => {
    let s = {
      ...initialState(makeRng(1)), deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
      activeArchetypes: ["glacier"], glacierMass: withMass([[0, 8], [1, 2]]), glacierLocked: lockAt(0, 1), glacierRoles: [ROLES.KETTENBRUCH],
    };
    s = resolveTrick(s, noCrit); // pos0 bricht
    s = resolveTrick(s, noCrit); // pos1 — erzwungener Bruch
    expect(s.lastTrick.breakdown.glacierDirect).toBeGreaterThan(0);
  });
});
