import { describe, it, expect } from "vitest";
import { runOne } from "../sim/run.js";
import { randomPolicy } from "../sim/policies/random.js";

// Balance-Guard (docs/sim-harness-plan.md §9): Random-Policy über feste Seeds → Median UND Mean im Band.
// Fängt versehentlichen Power-Creep bei Tuning-Änderungen. WICHTIG: BEIDE Kennzahlen prüfen —
// der Median ist gegen Heavy Tails robust (der #121-Feuer-Runaway bewegte den Median kaum), der
// Mean reagiert dagegen stark auf Tail-Runaway. Nur zusammen fangen sie die relevanten Regressionen.
//
// Stand: NEU ZENTRIERT auf den #267-Boden — MAX_CYCLES-Default 45 + Stat-Phase ENTFERNT (kein Crit-/Formations-/
// Serien-Stat-Booster mehr; Crit kommt aus Präzision-Familien/Blitz) + SKILL_SLOTS 6 + 4 Fraktionen. Random-Policy
// über Seeds 1..40: Median ~1,42M, Mean ~1,49M (deutlich unter dem alten 60-Cycle/Stat-Stand ~2,82M/~3,82M — kürzerer
// Lauf + keine Stat-Multiplikatoren). Bei ABSICHTLICHER Balance-Änderung (Feuer #268 / Eis #269) neu zentrieren.
describe("sim balance guard", () => {
  const SEEDS = 40; // feste Seeds 1..40 → deterministischer Median/Mean
  const scores = Array.from({ length: SEEDS }, (_, i) => runOne(1 + i, randomPolicy()).score).sort((a, b) => a - b);
  const median = (scores[19] + scores[20]) / 2;
  const mean = scores.reduce((t, v) => t + v, 0) / SEEDS;

  it("Median-Score im erwarteten Band (breite Power-Verschiebung)", () => {
    // Ist-Wert ~1,42M (#267-Boden: 45 Cycles, keine Stats). Band toleriert normales Tuning, schlägt bei ~±30 % an.
    expect(median).toBeGreaterThan(1_000_000);
    expect(median).toBeLessThan(1_900_000);
  });

  it("Mean-Score im erwarteten Band (Tail-Runaway-Fänger)", () => {
    // Ist-Wert ~1,49M (#267-Boden). Obergrenze fängt einen Runaway (Mean ginge deutlich höher).
    expect(mean).toBeGreaterThan(1_050_000);
    expect(mean).toBeLessThan(2_300_000);
  });
});
