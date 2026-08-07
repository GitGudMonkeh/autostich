import { describe, it, expect } from "vitest";
import {
  MASTERY_MAX_GRADE, MASTERY_MEISTER_MAX, MASTERY_THRESHOLDS, advanceGrade, masteryProgress, nextThreshold, thresholdForGrade,
  masteryRerollBonus, masteryCoverBonus, masteryRareShift, masteryLegendMult, masteryLegendGuaranteed,
  masteryGradeLabel, canChallenge, difficultyForGrade, isGrandmaster, rankRoman, MASTERY_REWARD_LABELS,
} from "../src/game/mastery.js";

const [T1, _T2, _T3, T4, T5] = MASTERY_THRESHOLDS;

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
    expect(nextThreshold(5)).toBe(T5);   // Grad V → nächstes Ziel = Großmeister I (50 M)
    expect(nextThreshold(MASTERY_MAX_GRADE)).toBe(null); // absoluter Höchstgrad: kein Ziel mehr
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
  it("Höchstgrad → 1 (Balken voll)", () => {
    expect(masteryProgress(MASTERY_MAX_GRADE, 0)).toBe(1);
    expect(masteryProgress(5, 0)).toBe(0); // Grad V ist NICHT mehr Max (Großmeister folgt)
  });
});

describe("#226 Großmeister — Tier über Meister V (Grade 6..10)", () => {
  it("isGrandmaster / rankRoman: Meister I–V vs Großmeister I–V", () => {
    expect([5, 6, 10].map(isGrandmaster)).toEqual([false, true, true]);
    expect([3, 6, 10].map(rankRoman)).toEqual(["III", "I", "V"]);
    expect(masteryGradeLabel(6)).toBe("Großmeister I");
    expect(masteryGradeLabel(10)).toBe("Großmeister V");
  });
  it("MASTERY_MAX_GRADE = 10, MEISTER_MAX = 5; alle Großmeister-Schwellen = 50 M (Ziel bleibt)", () => {
    expect(MASTERY_MAX_GRADE).toBe(10);
    expect(MASTERY_MEISTER_MAX).toBe(5);
    expect(MASTERY_THRESHOLDS.slice(5)).toEqual([50_000_000, 50_000_000, 50_000_000, 50_000_000, 50_000_000]);
  });
  it("difficultyForGrade: Meister → null; Großmeister → validierte kombinierte Leiter (oppValue + Ramp + kürzere Läufe)", () => {
    expect(difficultyForGrade(5)).toBe(null);
    expect(difficultyForGrade(6)).toEqual({ oppValue: 1 });                                    // GI
    expect(difficultyForGrade(8)).toEqual({ oppValue: 2, oppRampEvery: 15 });                  // GIII
    expect(difficultyForGrade(10)).toEqual({ oppValue: 3, oppRampEvery: 12, maxCycles: 54 });  // GV (härtester)
  });
  it("Rewards steigen NUR bis Meister V (kein Entzug, kein Zuwachs bei Großmeister)", () => {
    expect(masteryCoverBonus(10)).toBe(masteryCoverBonus(5)); // Baufeld bleibt 32 (kein Brett-Overflow)
    expect([5, 6, 10].map(masteryLegendGuaranteed)).toEqual([true, true, true]);
    expect([5, 6, 10].map(masteryRareShift)).toEqual([2, 2, 2]);
  });
  it("Aufstieg ab Meister V nur AUF dem aktuellen Max-Rang gespielt (Anti-Farm-Gate)", () => {
    expect(advanceGrade(5, T5, 5)).toBe(6);  // Meister V gespielt → Großmeister I frei
    expect(advanceGrade(5, T5, 3)).toBe(5);  // auf leichterem Rang III gefarmt → KEIN Aufstieg
    expect(advanceGrade(6, T5, 6)).toBe(7);  // Großmeister I gespielt → II frei
    expect(advanceGrade(6, T5, 4)).toBe(6);  // leichter gespielt → blockiert
    expect(advanceGrade(4, T5, 1)).toBe(5);  // Meister I–IV bleibt ungegatet (Ramp-frei, altes Verhalten)
    expect(advanceGrade(10, T5 * 100, 10)).toBe(10); // absoluter Höchstgrad stabil
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
  it("Reward-Labels führen das Baufeld je Rang passend zu masteryCoverBonus (ab II)", () => {
    expect(MASTERY_REWARD_LABELS[1].some((r) => /Baufeld/.test(r))).toBe(false); // Rang I = Basis (24), kein Baufeld-Label
    for (const n of [2, 3, 4, 5]) {
      expect(MASTERY_REWARD_LABELS[n]).toContain(`+${masteryCoverBonus(n)} Baufeld`); // +2/+4/+6/+8
    }
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
