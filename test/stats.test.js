import { describe, it, expect } from "vitest";
import { statStreakFactor, statFormFactor } from "../src/game/stats.js";
import { STREAK_STAT_CAP, STAT_STREAK_MULT_STEP, STAT_FORM_MULT_STEP } from "../src/game/constants.js";

// #153: der Serien-Stat-Faktor wird bei STREAK_STAT_CAP (Balance-Pass 1) gedeckelt, um Score-Runaway bei
// langen Serien zu stoppen. Bisher nur indirekt mit winzigen Serien geprüft → der Cap-Rand war ungetestet.
describe("statStreakFactor — Serien-Stat-Cap (#153)", () => {
  it("unter dem Cap: linear 1 + statStreakMult × Serie", () => {
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, 10)).toBeCloseTo(1 + STAT_STREAK_MULT_STEP * 10); // 0,02×10 = 0,20
    expect(statStreakFactor(0.05, 20)).toBeCloseTo(1 + 1.0);                                          // 0,05×20 = 1,0 < Cap
  });
  it("Serie 0 bzw. mult 0/undefined → neutral ×1", () => {
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, 0)).toBe(1);
    expect(statStreakFactor(0, 50)).toBe(1);
    expect(statStreakFactor(undefined, undefined)).toBe(1);
  });
  it("am Cap-Rand: ab dem Rand gedeckelt, eins darunter noch linear (cap-relativ)", () => {
    // Randserie aus dem Cap ableiten (nicht hart verdrahten) → hält bei jedem STREAK_STAT_CAP-Tuning.
    const atCap = Math.ceil(STREAK_STAT_CAP / STAT_STREAK_MULT_STEP); // kleinste Serie, die den Cap erreicht
    const below = atCap - 1;                                          // eins darunter → strikt unter dem Cap
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, atCap)).toBeCloseTo(1 + STREAK_STAT_CAP);
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, below)).toBeCloseTo(1 + STAT_STREAK_MULT_STEP * below);
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, below)).toBeLessThan(1 + STREAK_STAT_CAP);
  });
  it("weit über dem Cap bleibt exakt ×(1 + CAP) — Regressionswächter gegen Cap-Löschen/-Anheben", () => {
    // Zwei sehr verschiedene Über-Cap-Serien liefern NUR wegen des Caps denselben Faktor.
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, 200)).toBeCloseTo(1 + STREAK_STAT_CAP);
    expect(statStreakFactor(STAT_STREAK_MULT_STEP, 200)).toBeCloseTo(statStreakFactor(STAT_STREAK_MULT_STEP, 400));
    expect(statStreakFactor(0.5, 11)).toBeCloseTo(1 + STREAK_STAT_CAP); // 0,5×11 = 5,5 → über jedem Cap → gedeckelt
    // Ohne Cap wäre der Beitrag deutlich größer als STREAK_STAT_CAP — der Cap senkt den Score echt.
    expect(STAT_STREAK_MULT_STEP * 200).toBeGreaterThan(STREAK_STAT_CAP);
  });
});

describe("statFormFactor — Formations-Stat skaliert mit ANZAHL Formationen (#153, Count-Rework)", () => {
  it("greift nur mit Formation, sonst neutral (boolean-Aufrufer bleiben gültig: true→1, false→0)", () => {
    expect(statFormFactor(STAT_FORM_MULT_STEP, true)).toBeCloseTo(1 + STAT_FORM_MULT_STEP); // 1 Formation → +5 %
    expect(statFormFactor(STAT_FORM_MULT_STEP, false)).toBe(1);
    expect(statFormFactor(STAT_FORM_MULT_STEP, 0)).toBe(1);
    expect(statFormFactor(0.15, true)).toBeCloseTo(1.15);
    expect(statFormFactor(0, true)).toBe(1);
  });
  it("mehrere Formationen an der Siegposition → linearer Zuwachs (Spezialisierungs-Rampe)", () => {
    expect(statFormFactor(STAT_FORM_MULT_STEP, 2)).toBeCloseTo(1 + 2 * STAT_FORM_MULT_STEP); // 2 Formationen → +10 %
    expect(statFormFactor(STAT_FORM_MULT_STEP, 3)).toBeCloseTo(1 + 3 * STAT_FORM_MULT_STEP); // 3 → +15 %
    expect(statFormFactor(0.05, 4)).toBeCloseTo(1.20);
  });
});
