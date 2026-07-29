import { describe, it, expect } from "vitest";
import { runOne } from "../sim/run.js";
import { randomPolicy } from "../sim/policies/random.js";

// Balance-Guard (docs/sim-harness-plan.md §9): Random-Policy über feste Seeds → Median UND Mean im Band.
// Fängt versehentlichen Power-Creep bei Tuning-Änderungen. WICHTIG: BEIDE Kennzahlen prüfen —
// der Median ist gegen Heavy Tails robust (der #121-Feuer-Runaway bewegte den Median kaum), der
// Mean reagiert dagegen stark auf Tail-Runaway. Nur zusammen fangen sie die relevanten Regressionen.
//
// Stand: NEU ZENTRIERT auf MAX_CYCLES-Default 60 (Ziel-Rundenlänge) + SKILL_SLOTS 6 + 4 Fraktionen (Feuer/Blitz/
// Eis/Pflanze). Median ~2,67M, Mean ~3,50M über Seeds 1..40. (Bei 44 Cycles war es ~1,12M/~1,14M — die längere
// Runde compoundet deutlich höher.) Bei ABSICHTLICHER Balance-Änderung neu zentrieren.
describe("sim balance guard", () => {
  const SEEDS = 40; // feste Seeds 1..40 → deterministischer Median/Mean
  const scores = Array.from({ length: SEEDS }, (_, i) => runOne(1 + i, randomPolicy()).score).sort((a, b) => a - b);
  const median = (scores[19] + scores[20]) / 2;
  const mean = scores.reduce((t, v) => t + v, 0) / SEEDS;

  it("Median-Score im erwarteten Band (breite Power-Verschiebung)", () => {
    // Ist-Wert ~2,67M (60 Cycles). Band toleriert normales Tuning, schlägt bei ~±30 % Verschiebung an.
    expect(median).toBeGreaterThan(1_900_000);
    expect(median).toBeLessThan(3_600_000);
  });

  it("Mean-Score im erwarteten Band (Tail-Runaway-Fänger)", () => {
    // Ist-Wert ~3,50M (60 Cycles). Obergrenze fängt einen Runaway (Mean ginge deutlich höher).
    expect(mean).toBeGreaterThan(2_400_000);
    expect(mean).toBeLessThan(5_300_000);
  });
});
