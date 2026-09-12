import { describe, it, expect } from "vitest";
import {
  neighbors4, precomputeGlacier, ewigerFrostTick,
  TOP, EWIGER_FROST, BURST_AT, THRESHOLDS,
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

describe("precomputeGlacier — Snapshot", () => {
  it("unter erster Schwelle: kein Bruch, Masse unverändert, kein Payout", () => {
    const { payout, resetMass, breaks } = precomputeGlacier(withMass([[10, 3]]), lockedSet(10));
    expect(breaks).toHaveLength(0);
    expect(payout[10]).toBe(0);
    expect(resetMass[10]).toBe(3);
  });

  it("ab Berst-Schwelle: bricht, zahlt aus, kalbt genau die Schwelle ab", () => {
    const { payout, resetMass, breaks } = precomputeGlacier(withMass([[10, BURST_AT]]), lockedSet(10));
    expect(breaks).toHaveLength(1);
    expect(payout[10]).toBeGreaterThan(0);
    expect(resetMass[10]).toBe(0); // genau auf der Schwelle: Masse − BURST_AT = 0
  });

  it("nicht-gefrorene Felder brechen nie, auch mit Masse", () => {
    const { payout, breaks } = precomputeGlacier(withMass([[10, 20]]), lockedSet()); // 10 nicht gelockt
    expect(breaks).toHaveLength(0);
    expect(payout[10]).toBe(0);
  });

  it("Kaskade: mehr Gletscher-Nachbarn → größerer Burst (gleiche Masse)", () => {
    // isoliertes Feld vs. Feld mit einem Gletscher-Nachbarn, beide reif (Masse 12)
    const solo = precomputeGlacier(withMass([[posOf(0, 0), 12]]), lockedSet(posOf(0, 0)));
    const paired = precomputeGlacier(
      withMass([[posOf(0, 0), 12], [posOf(0, 1), 12]]),
      lockedSet(posOf(0, 0), posOf(0, 1)));
    expect(paired.payout[posOf(0, 0)]).toBeGreaterThan(solo.payout[posOf(0, 0)]);
  });

  it("hält unter der Berst-Schwelle, bricht erst ab ihr (selten + gewaltig)", () => {
    const below = precomputeGlacier(withMass([[10, 11]]), lockedSet(10));
    const at = precomputeGlacier(withMass([[10, 12]]), lockedSet(10));
    expect(below.breaks).toHaveLength(0);          // Masse 11 < 12: hält & wächst weiter
    expect(at.breaks).toHaveLength(1);             // Masse 12: bricht
    expect(at.payout[10]).toBeGreaterThan(0);
  });

  /* §5.18: der Überlauf-Score ist gestorben, der ÜBERSCHUSS bleibt liegen. Beide Hälften der Regel stehen hier —
     die Masse über der Berst-Schwelle geht in die Wucht UND trägt in den nächsten Durchlauf. */
  it("Überschuss: Masse über der Berst-Schwelle bleibt liegen und zählt in der Wucht mit", () => {
    const knapp = precomputeGlacier(withMass([[10, BURST_AT]]), lockedSet(10));
    const drueber = precomputeGlacier(withMass([[10, BURST_AT + 6]]), lockedSet(10));
    expect(drueber.resetMass[10]).toBe(6);                                  // genau der Überschuss bleibt
    expect(drueber.payout[10]).toBeGreaterThan(knapp.payout[10]);           // und er hat mitgeschlagen
  });

  /* §5.29: die Leiter endet nicht mehr bei der vierten Schwelle — sie läuft weiter, damit ANSAMMELN bezahlbar wird.
     Der Wächter prüft deshalb die Beziehung (die oberste Sprosse liegt genau eine über der darunter) statt fester
     Stufen-Indizes, und hält zusätzlich fest, dass jede Sprosse der Leiter wirklich erreichbar ist. */
  it("die oberste Schwelle greift: ab TOP birst derselbe Gletscher auf einer höheren Stufe", () => {
    const unten = precomputeGlacier(withMass([[10, TOP - 1]]), lockedSet(10));
    const oben = precomputeGlacier(withMass([[10, TOP]]), lockedSet(10));
    expect(oben.breaks[0].tier).toBe(unten.breaks[0].tier + 1);
    expect(oben.breaks[0].tier).toBe(THRESHOLDS.length);
    expect(oben.payout[10]).toBeGreaterThan(unten.payout[10]);
  });

  it("jede erreichbare Sprosse ist eine eigene Stufe — keine Lücke, keine doppelte", () => {
    const reach = THRESHOLDS.filter((t) => t >= BURST_AT);   // darunter bricht der Gletscher gar nicht
    const tiers = reach.map((t) => precomputeGlacier(withMass([[10, t]]), lockedSet(10)).breaks[0].tier);
    expect(tiers).toEqual(reach.map((t) => THRESHOLDS.filter((x) => x <= t).length));
  });

  it("Immutabilität: Eingabe-Array wird nicht mutiert", () => {
    const m = withMass([[10, 12]]);
    const snapshot = m.slice();
    precomputeGlacier(m, lockedSet(10));
    expect(m).toEqual(snapshot);
  });

  it("opts überschreiben Tuning (Rissbildung: senkt die Berst-Schwelle → bricht früher)", () => {
    const base = precomputeGlacier(withMass([[10, 6]]), lockedSet(10));
    const riss = precomputeGlacier(withMass([[10, 6]]), lockedSet(10), { burstAt: 6 });
    expect(base.breaks).toHaveLength(0);   // Masse 6 < 12: hält
    expect(riss.breaks).toHaveLength(1);   // mit gesenkter Berst-Schwelle: bricht früh
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
