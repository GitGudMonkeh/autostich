import { describe, it, expect } from "vitest";
import {
  MASTERY_MAX_GRADE, MASTERY_THRESHOLDS, advanceGrade, masteryProgress, nextThreshold, thresholdForGrade,
  masteryRerollBonus, masteryCoverBonus, masteryRareShift, masteryLegendMult, masteryLegendGuaranteed,
  masteryGradeLabel, canChallenge,
} from "../src/game/mastery.js";

const [T1, T2, T3, T4, T5] = MASTERY_THRESHOLDS;

describe("advanceGrade — sequentiell, ein Grad pro Lauf", () => {
  it("Grad 0 + Score unter T1 → bleibt 0 (No-op)", () => {
    expect(advanceGrade(0, 0)).toBe(0);
    expect(advanceGrade(0, T1 - 1)).toBe(0);
  });
  it("Grad 0 + Score ≥ T1 → 1", () => {
    expect(advanceGrade(0, T1)).toBe(1);
  });
  it("KEIN Multi-Sprung: Grad 0 + riesiger Score → nur 1", () => {
    expect(advanceGrade(0, T5 * 10)).toBe(1);
  });
  it("Grad II + 100 M → nur III (Beispiel aus dem Issue)", () => {
    expect(advanceGrade(2, 100_000_000)).toBe(3);
  });
  it("prüft immer gegen die NÄCHSTE Schwelle (Grad+1)", () => {
    expect(advanceGrade(3, T4 - 1)).toBe(3); // knapp unter T4 → kein Aufstieg
    expect(advanceGrade(3, T4)).toBe(4);     // erreicht T4 → IV
  });
  it("Höchstgrad bleibt stabil", () => {
    expect(advanceGrade(MASTERY_MAX_GRADE, T5 * 100)).toBe(MASTERY_MAX_GRADE);
  });
  it("robust gegen ungültige Eingaben", () => {
    expect(advanceGrade(undefined, undefined)).toBe(0);
    expect(advanceGrade(-3, T1)).toBe(1);
    expect(advanceGrade(99, T5)).toBe(MASTERY_MAX_GRADE);
  });
});

describe("Schwellen-Helfer", () => {
  it("nextThreshold folgt dem aktuellen Grad", () => {
    expect(nextThreshold(0)).toBe(T1);
    expect(nextThreshold(4)).toBe(T5);
    expect(nextThreshold(5)).toBe(null); // Höchstgrad: kein Ziel mehr
  });
  it("thresholdForGrade gibt die Grad-eigene Schwelle", () => {
    expect(thresholdForGrade(1)).toBe(T1);
    expect(thresholdForGrade(5)).toBe(T5);
  });
});

describe("masteryProgress — grober Balken 0..1", () => {
  it("halbe Schwelle → 0,5", () => {
    expect(masteryProgress(0, T1 / 2)).toBeCloseTo(0.5, 5);
  });
  it("über der Schwelle → auf 1 gedeckelt", () => {
    expect(masteryProgress(0, T1 * 3)).toBe(1);
  });
  it("Höchstgrad → 1 (Balken voll/ausgeblendet)", () => {
    expect(masteryProgress(5, 0)).toBe(1);
  });
});

describe("Reward-Ableitungen — Grad 0 = Basiswerte (No-op)", () => {
  it("Reroll-Bonus: 0/1/2/3/3/3 (Pool 2→3/4/5, gedeckelt)", () => {
    expect([0, 1, 2, 3, 4, 5].map(masteryRerollBonus)).toEqual([0, 1, 2, 3, 3, 3]);
  });
  it("Baufeld-Bonus: +2 je Grad ab II (0/0/2/4/6/8)", () => {
    expect([0, 1, 2, 3, 4, 5].map(masteryCoverBonus)).toEqual([0, 0, 2, 4, 6, 8]);
  });
  it("Rarität-Shift: 0 bis Grad II, 1 bei III, 2 ab IV", () => {
    expect([0, 1, 2, 3, 4, 5].map(masteryRareShift)).toEqual([0, 0, 0, 1, 2, 2]);
  });
  it("Legendär-Multiplikator: ×1 bis Grad III, ×3 ab IV", () => {
    expect([0, 1, 2, 3, 4, 5].map(masteryLegendMult)).toEqual([1, 1, 1, 1, 3, 3]);
  });
  it("Garantierter Legendär erst ab Grad V", () => {
    expect([0, 1, 2, 3, 4, 5].map(masteryLegendGuaranteed)).toEqual([false, false, false, false, false, true]);
  });
});

describe("canChallenge — Gating bis eigener Max-Grad", () => {
  it("Eintrags-Grad ≤ Spieler-Grad → herausforderbar", () => {
    expect(canChallenge(2, 3)).toBe(true);
    expect(canChallenge(3, 3)).toBe(true);
    expect(canChallenge(0, 0)).toBe(true);
  });
  it("Eintrags-Grad > Spieler-Grad → gesperrt", () => {
    expect(canChallenge(5, 2)).toBe(false);
    expect(canChallenge(1, 0)).toBe(false);
  });
});

describe("Anzeige-Label", () => {
  it("Rang 0 → 'Kein Rang', sonst römisch", () => {
    expect(masteryGradeLabel(0)).toBe("Kein Rang");
    expect(masteryGradeLabel(3)).toBe("Rang III");
    expect(masteryGradeLabel(5)).toBe("Rang V");
  });
});
