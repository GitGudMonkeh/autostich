import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { glacierGeometry, ROLES, GEO_BLOCK, GEO_KREUZ, GEO_LINIE, GEO_FLAECHE } from "../src/game/glacier.js";
import { EIS_TIERS as EIS } from "../src/game/skills.js";
import { posOf } from "../src/game/architect.js";

// Eis-Neudesign Phase 4 — 2D-Geometrie-Formationen (unique Deck-Passiv, docs §2.7/§9) + Eiswall.
const falses = () => new Array(40).fill(false);
const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };

describe("glacierGeometry — Formen erkennen", () => {
  it("keine Form → alle Faktoren 1", () => {
    expect(glacierGeometry(lockAt(0)).every((x) => x === 1)).toBe(true);
  });
  it("Block (2×2) → GEO_BLOCK auf den vier Feldern", () => {
    const f = glacierGeometry(lockAt(0, 1, 5, 6)); // posOf(0,0/0,1/1,0/1,1)
    for (const p of [0, 1, 5, 6]) expect(f[p]).toBeCloseTo(GEO_BLOCK);
    expect(f[2]).toBe(1);
  });
  it("Kreuz (Zentrum + 4 orthogonale) → GEO_KREUZ im Zentrum", () => {
    const c = posOf(1, 1);
    const f = glacierGeometry(lockAt(c, posOf(0, 1), posOf(2, 1), posOf(1, 0), posOf(1, 2)));
    expect(f[c]).toBeCloseTo(GEO_KREUZ);
  });
  it("Linie: volle Reihe → GEO_LINIE; Eiswall hebt sie auf den Faktor seiner Stufe", () => {
    const row = lockAt(0, 1, 2, 3, 4);
    expect(glacierGeometry(row)[0]).toBeCloseTo(GEO_LINIE);
    expect(glacierGeometry(row, { eiswallLinie: EIS.eiswall[0].linie })[0]).toBeCloseTo(EIS.eiswall[0].linie);
    expect(glacierGeometry(row, { eiswallLinie: EIS.eiswall[3].linie })[0]).toBeCloseTo(EIS.eiswall[3].linie); // Episch höher
  });
  it("Linie: volle Spalte (8 Zeilen) → GEO_LINIE", () => {
    const col = lockAt(0, 5, 10, 15, 20, 25, 30, 35); // col 0, alle 8 Zeilen
    expect(glacierGeometry(col)[0]).toBeCloseTo(GEO_LINIE);
  });
  it("Große Fläche (3×3) → GEO_FLAECHE; überlappende Formen stapeln NICHT (§5.6: die stärkste zählt)", () => {
    const cells = [0, 1, 2, 5, 6, 7, 10, 11, 12];
    const f = glacierGeometry(lockAt(...cells));
    for (const p of cells) expect(f[p]).toBeGreaterThan(1);
    // Das Zentrum liegt in Fläche, Kreuz und vier Blöcken zugleich. Früher multiplizierte sich das; jetzt zählt die
    // stärkste Form — und keine Zelle kommt über den größten Einzelfaktor hinaus.
    expect(f[posOf(1, 1)]).toBeCloseTo(GEO_FLAECHE);
    const strongest = Math.max(GEO_BLOCK, GEO_KREUZ, GEO_LINIE, GEO_FLAECHE);
    for (const p of cells) expect(f[p]).toBeLessThanOrEqual(strongest);
  });
});

describe("Engine — Eiswall verstärkt die Linie", () => {
  const identity = () => Array.from({ length: 40 }, (_, i) => i);
  const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
  const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
  const zeros = () => new Array(40).fill(0);
  const noCrit = () => 0.99;
  const rowMass = () => { const m = zeros(); for (const p of [0, 1, 2, 3, 4]) m[p] = 12; return m; };
  const scen = (over) => ({
    ...initialState(makeRng(1)), deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
    activeArchetypes: ["ice"], glacierMass: rowMass(), glacierLocked: lockAt(0, 1, 2, 3, 4), glacierRoles: [], ...over,
  });
  it("volle Reihe: mit Eiswall bricht pos0 stärker als ohne", () => {
    const base = resolveTrick(scen({}), noCrit);
    const wall = resolveTrick(scen({ glacierRoles: [ROLES.EISWALL] }), noCrit);
    expect(base.lastTrick.breakdown.glacierDirect).toBeGreaterThan(0); // Linie-Passiv wirkt schon
    expect(wall.lastTrick.breakdown.glacierDirect).toBeGreaterThan(base.lastTrick.breakdown.glacierDirect);
  });
});
