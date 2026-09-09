import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { precomputeGlacier, uebergletscherPool, ROLES, GROSSE_LAWINE_EVERY, SCHILD_NEIGHBORS } from "../src/game/glacier.js";
import { iceSnapshotOpts } from "../src/game/factions/ice.js";
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
  it("die Snapshot-Optionen setzen grosseLawine NICHT als Dauer-Flag (One-Shot läuft über die Engine)", () => {
    expect(iceSnapshotOpts([ROLES.L_LAWINE]).grosseLawine).toBeUndefined();
  });
});

describe("Ewiges Schild — das ganze Feld als ein Übergletscher", () => {
  /* §5.19: DURCHSCHNITT statt Maximum. Das Maximum erschuf Masse — 30 Gletscher, einer auf 18, der Rest auf 2, danach
     alle auf 18: 480 Masse je Durchlauf aus dem Nichts, und danach brachen ALLE jede Runde statt nur der eine. */
  it("uebergletscherPool teilt EINE Masse aufs Feld — die Summe bleibt erhalten", () => {
    const out = uebergletscherPool(withMass([[0, 0], [posOf(4, 4), 12]]), set(0, posOf(4, 4)));
    expect(out[0]).toBe(6);               // hochgezogen, obwohl NICHT benachbart
    expect(out[posOf(4, 4)]).toBe(6);     // der Stärkste gibt an sein Feld ab
  });
  it("das Pooling erschafft keine Masse — auch nicht auf einem großen Feld", () => {
    const ps = Array.from({ length: 20 }, (_, i) => i);
    const mass = withMass([[0, 18], ...ps.slice(1).map((p) => [p, 2])]);
    const vorher = ps.reduce((t, p) => t + mass[p], 0);
    const out = uebergletscherPool(mass, set(...ps));
    expect(ps.reduce((t, p) => t + out[p], 0)).toBeCloseTo(vorher, 6);
  });
  it("Kaskade rechnet mit der Feldgröße (auch bei nicht benachbarten Gletschern)", () => {
    // zwei WEIT getrennte Gletscher, gleiche Masse — ohne Schild kein Kaskade-Bonus, mit Schild schon.
    const mass = withMass([[0, 12], [posOf(7, 4), 12]]);
    const locked = set(0, posOf(7, 4));
    const base = precomputeGlacier(mass, locked);
    const schild = precomputeGlacier(mass, locked, iceSnapshotOpts([ROLES.L_SCHILD]));
    expect(schild.payout[0]).toBeGreaterThan(base.payout[0]);
  });

  /* §5.19: … aber GEDECKELT. Die Kaskade gibt +25 % je Nachbar und war für höchstens 4 (mit Eisbrücke 8) gebaut;
     „alle anderen" fütterte sie bei 40 Gletschern mit 39. Der Feld-Score wuchs damit im QUADRAT der Feldgröße. */
  it("die Kaskade wächst nicht mehr mit dem ganzen Feld — ab dem Deckel steht sie still", () => {
    const feld = (n) => {
      const ps = Array.from({ length: n }, (_, i) => i);
      const mass = withMass(ps.map((p) => [p, 12]));
      return precomputeGlacier(mass, set(...ps), iceSnapshotOpts([ROLES.L_SCHILD])).payout[0];
    };
    expect(feld(SCHILD_NEIGHBORS + 1)).toBeGreaterThan(feld(4));   // bis zum Deckel wächst sie
    expect(feld(30)).toBe(feld(SCHILD_NEIGHBORS + 1));             // darüber nicht mehr
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
  it("Große Lawine feuert im TAKT (§5.8): nur im Lawinen-Durchlauf bricht das Feld", () => {
    const cycle = (s0) => { let s = s0; for (let i = 0; i < 40; i++) s = resolveTrick(s, noCrit); return s; };
    // Unter-Schwelle-Masse, alle Stiche verloren (nur Ewiger Frost) → ohne Lawine bräche nichts.
    const opts = { glacierLocked: lockAt(0, 1, 2), glacierMass: withMass([[0, 5], [1, 5], [2, 5]]), glacierRoles: [ROLES.L_LAWINE], oppDeck: oppOf(99) };
    const quiet = cycle(scen({ ...opts, cycle: 0 }));                            // cycle 0: kein Lawinen-Durchlauf
    expect(quiet.glacierYield).toBe(0);
    const beat = cycle(scen({ ...opts, cycle: GROSSE_LAWINE_EVERY - 1 }));        // der Takt-Durchlauf
    expect(beat.glacierYield).toBeGreaterThan(0);
    const next = cycle(scen({ ...opts, cycle: 2 * GROSSE_LAWINE_EVERY - 1 }));    // und er wiederholt sich
    expect(next.glacierYield).toBeGreaterThan(0);
  });
});
