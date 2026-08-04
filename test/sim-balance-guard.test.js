import { describe, it, expect } from "vitest";
import { runOne } from "../sim/run.js";
import { randomPolicy } from "../sim/policies/random.js";

// Balance-Guard (docs/sim-harness-plan.md §9): Random-Policy über feste Seeds → Median UND Mean im Band.
// Fängt versehentlichen Power-Creep bei Tuning-Änderungen. WICHTIG: BEIDE Kennzahlen prüfen —
// der Median ist gegen Heavy Tails robust (der #121-Feuer-Runaway bewegte den Median kaum), der
// Mean reagiert dagegen stark auf Tail-Runaway. Nur zusammen fangen sie die relevanten Regressionen.
//
// Stand: NEU ZENTRIERT auf den #272-Stand — MAX_CYCLES 45→50 + einmalige Legendär-Phase (Runde 29, garantierter
// build-defining Legendär im 7. Slot; Random-Policy nimmt immer einen). Beides hebt das Niveau spürbar: Random-Policy
// über Seeds 1..40 → Median ~2,55M, Mean ~2,73M (vorher #267-Boden ~1,42M/~1,49M bei 45 Cycles ohne garantierten
// Legendär). Das ist ABSICHTLICH (Feature #272) — die Bänder sind darauf neu zentriert; bei weiterem Balance-Tuning
// neu zentrieren. WICHTIG: BEIDE Kennzahlen prüfen (Median tail-robust, Mean tail-sensitiv).
describe("sim balance guard", () => {
  const SEEDS = 40; // feste Seeds 1..40 → deterministischer Median/Mean
  const scores = Array.from({ length: SEEDS }, (_, i) => runOne(1 + i, randomPolicy()).score).sort((a, b) => a - b);
  const median = (scores[19] + scores[20]) / 2;
  const mean = scores.reduce((t, v) => t + v, 0) / SEEDS;

  it("Median-Score im erwarteten Band (breite Power-Verschiebung)", () => {
    // Ist-Wert ~2,55M (#272: 50 Cycles + garantierter Legendär). Band toleriert normales Tuning, schlägt bei ~±30 % an.
    expect(median).toBeGreaterThan(1_700_000);
    expect(median).toBeLessThan(3_400_000);
  });

  it("Mean-Score im erwarteten Band (Tail-Runaway-Fänger)", () => {
    // Ist-Wert ~2,73M (#272). Obergrenze fängt einen Runaway (Mean ginge deutlich höher).
    expect(mean).toBeGreaterThan(1_800_000);
    expect(mean).toBeLessThan(3_800_000);
  });
});
