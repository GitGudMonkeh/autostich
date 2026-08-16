import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { precomputeGlacier, glacierOpts, uebergletscherPool, ROLES, SCHILD_BONUS } from "../src/game/glacier.js";
import { N_POS, posOf } from "../src/game/architect.js";

// Eis-Neudesign Phase 5 (L1) — Legendäre: Große Lawine (alles bricht) + Ewiges Schild (Übergletscher).
const zeros = () => new Array(N_POS).fill(0);
const withMass = (pairs) => { const m = zeros(); for (const [p, v] of pairs) m[p] = v; return m; };
const set = (...ps) => new Set(ps);

describe("Große Lawine — alles bricht auf einen Schlag (One-Shot)", () => {
  it("mit grosseLawine-opt brechen auch Unter-Schwelle-Gletscher (Schwellen ignoriert)", () => {
    const mass = withMass([[0, 2], [1, 3], [2, 1]]); // alle unter der Berst-Schwelle
    const base = precomputeGlacier(mass, set(0, 1, 2));
    const lawine = precomputeGlacier(mass, set(0, 1, 2), { grosseLawine: true });
    expect(base.breaks).toHaveLength(0);
    expect(lawine.breaks).toHaveLength(3);
    for (const p of [0, 1, 2]) expect(lawine.payout[p]).toBeGreaterThan(0);
  });
  it("glacierOpts setzt grosseLawine NICHT als Dauer-Flag (One-Shot läuft über die Engine)", () => {
    expect(glacierOpts([ROLES.L_LAWINE]).grosseLawine).toBeUndefined();
  });
});

describe("Ewiges Schild — das ganze Feld als ein Übergletscher", () => {
  it("uebergletscherPool hebt alle Gletscher aufs MAXIMUM + Feld-Bonus (nie fallend)", () => {
    const out = uebergletscherPool(withMass([[0, 0], [posOf(4, 4), 12]]), set(0, posOf(4, 4)));
    expect(out[0]).toBe(12 + SCHILD_BONUS);              // aufs Max (12) gehoben + additiver Feld-Bonus, obwohl NICHT benachbart
    expect(out[posOf(4, 4)]).toBe(12 + SCHILD_BONUS);    // war Max, bekommt den Bonus (nie fallend)
  });
  it("Kaskade rechnet mit der vollen Feldgröße (auch bei nicht benachbarten Gletschern)", () => {
    // zwei WEIT getrennte Gletscher, gleiche Masse — ohne Schild kein Kaskade-Bonus, mit Schild schon.
    const mass = withMass([[0, 12], [posOf(7, 4), 12]]);
    const locked = set(0, posOf(7, 4));
    const base = precomputeGlacier(mass, locked);
    const schild = precomputeGlacier(mass, locked, glacierOpts([ROLES.L_SCHILD]));
    expect(schild.payout[0]).toBeGreaterThan(base.payout[0]);
  });
});

describe("Engine-Verdrahtung (L1)", () => {
  const identity = () => Array.from({ length: 40 }, (_, i) => i);
  const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
  const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
  const falses = () => new Array(40).fill(false);
  const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };
  const noCrit = () => 0.99;
  const scen = (over) => ({
    ...initialState(makeRng(1)), deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
    activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
  });
  it("Ewiges Schild poolt im Snapshot: ein leerer Gletscher neben einem vollen bricht", () => {
    const glacierLocked = lockAt(0, posOf(7, 4)); const glacierMass = withMass([[posOf(7, 4), 24]]); // pos0 leer, weit weg voll → Pool-Schnitt 12
    const base = resolveTrick(scen({ glacierLocked, glacierMass }), noCrit);
    const schild = resolveTrick(scen({ glacierLocked, glacierMass, glacierRoles: [ROLES.L_SCHILD] }), noCrit);
    expect(base.lastTrick.breakdown?.glacierDirect ?? 0).toBe(0);        // pos0 leer → kein Bruch
    expect(schild.lastTrick.breakdown.glacierDirect).toBeGreaterThan(0); // auf 6 gepoolt → bricht
  });
  it("Große Lawine feuert erst im LETZTEN Durchlauf (nicht früher), One-Shot", () => {
    const cycle = (s0) => { let s = s0; for (let i = 0; i < 40; i++) s = resolveTrick(s, noCrit); return s; };
    // maxCycles=2 → letzter Durchlauf = cycle 1. Unter-Schwelle-Masse, alle verlieren (nur Ewiger Frost) → ohne Lawine bräche nichts.
    const opts = { maxCycles: 2, glacierLocked: lockAt(0, 1, 2), glacierMass: withMass([[0, 5], [1, 5], [2, 5]]), glacierRoles: [ROLES.L_LAWINE], oppDeck: oppOf(99) };
    const early = cycle(scen({ ...opts, cycle: 0 }));  // NICHT letzter Durchlauf → feuert nicht
    expect(early.grosseLawineFired).toBe(false);
    expect(early.glacierYield).toBe(0);
    const last = cycle(scen({ ...opts, cycle: 1 }));   // letzter Durchlauf → Große Lawine feuert, alles bricht
    expect(last.glacierYield).toBeGreaterThan(0);
    expect(last.grosseLawineFired).toBe(true);
  });
});
