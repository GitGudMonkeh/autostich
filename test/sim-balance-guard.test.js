import { describe, it, expect } from "vitest";
import { runOne } from "../sim/run.js";
import { randomPolicy } from "../sim/policies/random.js";

// Balance-Guard (docs/sim-harness-plan.md §9): Random-Policy über feste Seeds → Median UND Mean im Band.
// Fängt versehentlichen Power-Creep bei Tuning-Änderungen. WICHTIG: BEIDE Kennzahlen prüfen —
// der Median ist gegen Heavy Tails robust (der #121-Feuer-Runaway bewegte den Median kaum), der
// Mean reagiert dagegen stark auf Tail-Runaway. Nur zusammen fangen sie die relevanten Regressionen.
//
// Stand: aktuelle Balance (Autostich_Test @ 3d00602). Bei ABSICHTLICHER Balance-Änderung neu zentrieren.
describe("sim balance guard", () => {
  const SEEDS = 40; // feste Seeds 1..40 → deterministischer Median/Mean
  const scores = Array.from({ length: SEEDS }, (_, i) => runOne(1 + i, randomPolicy()).score).sort((a, b) => a - b);
  const median = (scores[19] + scores[20]) / 2;
  const mean = scores.reduce((t, v) => t + v, 0) / SEEDS;

  it("Median-Score im erwarteten Band (breite Power-Verschiebung)", () => {
    // Ist-Wert ~576k. Band toleriert normales Tuning, schlägt bei ~±35 % Verschiebung an.
    expect(median).toBeGreaterThan(420_000);
    expect(median).toBeLessThan(760_000);
  });

  it("Mean-Score im erwarteten Band (Tail-Runaway-Fänger)", () => {
    // Ist-Wert ~633k. Obergrenze fängt einen Feuer-artigen Runaway (Mean ginge in die Millionen).
    expect(mean).toBeGreaterThan(430_000);
    expect(mean).toBeLessThan(1_200_000);
  });
});
