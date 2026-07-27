import { describe, it, expect } from "vitest";
import { statStreakFactor, statFormFactor } from "../src/game/stats.js";
import { STREAK_STAT_CAP, STAT_STREAK_MULT_STEP, STAT_FORM_MULT_STEP } from "../src/game/constants.js";

// #153: der Serien-Stat-Faktor wird bei STREAK_STAT_CAP (Balance-Pass 1) gedeckelt, um Score-Runaway bei
// langen Serien zu stoppen. Bisher nur indirekt mit winzigen Serien geprüft → der Cap-Rand war ungetestet.
describe("statStreakFactor — Serien-Stat-Cap (#153)", () => {
  it("unter dem Cap: linear 1 + statStreakMult × Serie", () => {
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, 10)).toBeCloseTo(1 + STAT_STREAK_MULT_STEP * 10); // 0,02×10 = 0,20
    expect(statStreakFactor(0.05, 20)).toBeCloseTo(1 + 1.0);                                          // 0,05×20 = 1,0 < 3
  });
  it("Serie 0 bzw. mult 0/undefined → neutral ×1", () => {
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, 0)).toBe(1);
    expect(statStreakFactor(0, 50)).toBe(1);
    expect(statStreakFactor(undefined, undefined)).toBe(1);
  });
  it("am Cap-Rand: exakt bei STREAK_STAT_CAP gedeckelt, eins darunter noch linear", () => {
    // Grenze: 0,02 × 150 = 3,0 = STREAK_STAT_CAP → genau ×(1 + CAP).
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, 150)).toBeCloseTo(1 + STREAK_STAT_CAP);
    // Eins unter dem Rand (0,02 × 149 = 2,98) → NICHT gedeckelt, echt kleiner.
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, 149)).toBeCloseTo(1 + STAT_STREAK_MULT_STEP * 149);
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, 149)).toBeLessThan(1 + STREAK_STAT_CAP);
  });
  it("weit über dem Cap bleibt exakt ×(1 + CAP) — Regressionswächter gegen Cap-Löschen/-Anheben", () => {
    // Zwei sehr verschiedene Über-Cap-Serien liefern NUR wegen des Caps denselben Faktor.
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, 200)).toBeCloseTo(1 + STREAK_STAT_CAP);
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, 200)).toBeCloseTo(statStreakFactor(STAT_STREAK_MULT_STEP, 400));
    expect(statStreakFactor(0.5, 11)).toBeCloseTo(1 + STREAK_STAT_CAP); // 0,5×11 = 5,5 → gedeckelt auf 3,0
    // Ohne Cap wäre der Beitrag deutlich größer als STREAK_STAT_CAP — der Cap senkt den Score echt.
    expect(STAT_STREAK_MULT_STEP * 200).toBeGreaterThan(STREAK_STAT_CAP);
  });
});

describe("statFormFactor — Formations-Stat nur bei aktiver Formation (#153)", () => {
  it("greift nur mit Formation, sonst neutral", () => {
    expect(statFormFactor(STAT_FORM_MULT_STEP, true)).toBeCloseTo(1 + STAT_FORM_MULT_STEP); // +5 %
    expect(statFormFactor(STAT_FORM_MULT_STEP, false)).toBe(1);
    expect(statFormFactor(0.15, true)).toBeCloseTo(1.15);
    expect(statFormFactor(0, true)).toBe(1);
  });
});
