import { describe, it, expect } from "vitest";
import {
  neighbors4, tierOf, dropAfterBreak, overflowOf, precomputeGlacier, ewigerFrostTick,
  THRESHOLDS, TOP, EWIGER_FROST,
} from "../src/game/glacier.js";
import { N_POS, posOf } from "../src/game/architect.js";

// Eis-Neudesign Fundament (docs/eis-rework.md §2). Reine Logik, isoliert vom alten Eis-Archetyp.
// Zahlen sind Platzhalter → Tests prüfen v.a. STRUKTUR & RELATIONEN, nicht magische Beträge.

const zeros = () => new Array(N_POS).fill(0);
const withMass = (pairs) => { const m = zeros(); for (const [p, v] of pairs) m[p] = v; return m; };
const lockedSet = (...ps) => new Set(ps);

describe("Geometrie — neighbors4 (4 orthogonal auf 8×5)", () => {
  it("Mitte hat 4 Nachbarn, Ecke 2, Rand 3", () => {
    expect(neighbors4(posOf(3, 2)).sort((a, b) => a - b)).toEqual(
      [posOf(2, 2), posOf(4, 2), posOf(3, 1), posOf(3, 3)].sort((a, b) => a - b));
    expect(neighbors4(posOf(0, 0))).toHaveLength(2);      // Ecke oben-links
    expect(neighbors4(posOf(7, 4))).toHaveLength(2);      // Ecke unten-rechts
    expect(neighbors4(posOf(0, 2))).toHaveLength(3);      // oberer Rand
    expect(neighbors4(posOf(3, 0))).toHaveLength(3);      // linker Rand
  });
  it("keine Diagonalen", () => {
    expect(neighbors4(posOf(3, 2))).not.toContain(posOf(2, 1));
    expect(neighbors4(posOf(3, 2))).not.toContain(posOf(4, 3));
  });
});

describe("Stufen / Reset / Überlauf", () => {
  it("tierOf: 3→0, 4→1, 8→2, 12→3", () => {
    expect([3, 4, 7, 8, 11, 12, 20].map(tierOf)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
  it("dropAfterBreak: 12→8, 8→4, 4→0 (eine Stufe runter)", () => {
    expect(dropAfterBreak(3)).toBe(THRESHOLDS[1]); // 8
    expect(dropAfterBreak(2)).toBe(THRESHOLDS[0]); // 4
    expect(dropAfterBreak(1)).toBe(0);
  });
  it("overflowOf: nur über der höchsten Stufe", () => {
    expect(overflowOf(TOP)).toBe(0);
    expect(overflowOf(TOP + 5)).toBe(5);
    expect(overflowOf(3)).toBe(0);
  });
});

describe("precomputeGlacier — Snapshot", () => {
  it("unter erster Schwelle: kein Bruch, Masse unverändert, kein Payout", () => {
    const { payout, resetMass, breaks } = precomputeGlacier(withMass([[10, 3]]), lockedSet(10));
    expect(breaks).toHaveLength(0);
    expect(payout[10]).toBe(0);
    expect(resetMass[10]).toBe(3);
  });

  it("ab Schwelle: bricht, zahlt aus, fällt eine Stufe runter", () => {
    const { payout, resetMass, breaks } = precomputeGlacier(withMass([[10, 8]]), lockedSet(10));
    expect(breaks).toHaveLength(1);
    expect(payout[10]).toBeGreaterThan(0);
    expect(resetMass[10]).toBe(dropAfterBreak(tierOf(8))); // 8er (Stufe 2) → 4
  });

  it("nicht-gefrorene Felder brechen nie, auch mit Masse", () => {
    const { payout, breaks } = precomputeGlacier(withMass([[10, 20]]), lockedSet()); // 10 nicht gelockt
    expect(breaks).toHaveLength(0);
    expect(payout[10]).toBe(0);
  });

  it("Kaskade: mehr Gletscher-Nachbarn → größerer Burst (gleiche Masse)", () => {
    // isoliertes Feld vs. Feld mit einem Gletscher-Nachbarn, beide Masse 8
    const solo = precomputeGlacier(withMass([[posOf(0, 0), 8]]), lockedSet(posOf(0, 0)));
    const paired = precomputeGlacier(
      withMass([[posOf(0, 0), 8], [posOf(0, 1), 8]]),
      lockedSet(posOf(0, 0), posOf(0, 1)));
    expect(paired.payout[posOf(0, 0)]).toBeGreaterThan(solo.payout[posOf(0, 0)]);
  });

  it("höhere Stufe → überlinear mehr Burst pro Masse-Einheit", () => {
    const t1 = precomputeGlacier(withMass([[10, 4]]), lockedSet(10)); // Stufe 1
    const t2 = precomputeGlacier(withMass([[10, 8]]), lockedSet(10)); // Stufe 2
    const per1 = t1.payout[10] / 4;
    const per2 = t2.payout[10] / 8;
    expect(per2).toBeGreaterThan(per1); // Anhäufen lohnt sich
  });

  it("Überlauf: Masse über der höchsten Stufe fließt als Payout, Reset bleibt gedeckelt", () => {
    const { payout, resetMass } = precomputeGlacier(withMass([[10, TOP + 6]]), lockedSet(10));
    expect(payout[10]).toBeGreaterThanOrEqual(6);        // mind. der Überlauf
    expect(resetMass[10]).toBe(dropAfterBreak(3));        // Stufe 3 bricht → 8, nicht 18
  });

  it("Immutabilität: Eingabe-Array wird nicht mutiert", () => {
    const m = withMass([[10, 8]]);
    const snapshot = m.slice();
    precomputeGlacier(m, lockedSet(10));
    expect(m).toEqual(snapshot);
  });

  it("opts überschreiben Tuning (Rissbildung: erste Schwelle runter → bricht früher)", () => {
    const base = precomputeGlacier(withMass([[10, 2]]), lockedSet(10));
    const riss = precomputeGlacier(withMass([[10, 2]]), lockedSet(10), { thresholds: [2, 8, 12] });
    expect(base.breaks).toHaveLength(0);   // Masse 2 < 4: kein Bruch
    expect(riss.breaks).toHaveLength(1);   // mit gesenkter Schwelle: bricht
  });
});

describe("Ewiger Frost — Fraktions-Passiv", () => {
  it("addiert bedingungslos auf jeden Gletscher, lässt Nicht-Gletscher unberührt", () => {
    const out = ewigerFrostTick(withMass([[10, 5], [11, 0]]), lockedSet(10));
    expect(out[10]).toBe(5 + EWIGER_FROST);
    expect(out[11]).toBe(0);              // 11 ist kein Gletscher
  });
  it("mutiert die Eingabe nicht", () => {
    const m = withMass([[10, 5]]);
    ewigerFrostTick(m, lockedSet(10));
    expect(m[10]).toBe(5);
  });
});
