import { describe, it, expect } from "vitest";
import { formationBorder } from "../src/ui/formationStyle.js";

// Rahmen-Helfer (Issue #95, Punkte 4 & 8): Farbe = Anzahl Formations-Mitgliedschaften
// (1 grün · 2 blau · 3 lila · 4 gold), Stil = gestrichelt ohne Multiplikator, solid mit.
const GREEN = "#5ab87a", BLUE = "#5a8ade", PURPLE = "#8a7de0", GOLD = "#d4a63a";
const pf = (...factors) => ({ formations: factors.map((f) => ({ type: "x", factor: f })) });

describe("formationBorder (#95.4/8)", () => {
  it("keine Formation → kein Sonderrahmen", () => {
    expect(formationBorder({ formations: [] })).toEqual({ color: null, dashed: false, active: 0 });
    expect(formationBorder(null)).toEqual({ color: null, dashed: false, active: 0 });
  });

  it("Farbe richtet sich nach der Anzahl Formationen — auch bei gestrichelten (ohne Multiplikator)", () => {
    expect(formationBorder(pf(1))).toEqual({ color: GREEN, dashed: true, active: 1 });   // 1 Formation, kein ×
    expect(formationBorder(pf(1, 1))).toEqual({ color: BLUE, dashed: true, active: 2 });  // 2 Formationen, kein ×
    expect(formationBorder(pf(1, 1, 1))).toEqual({ color: PURPLE, dashed: true, active: 3 });
    expect(formationBorder(pf(1, 1, 1, 1))).toEqual({ color: GOLD, dashed: true, active: 4 });
  });

  it("solid, sobald mindestens eine Formation einen Multiplikator gibt; Farbe weiter nach Anzahl", () => {
    expect(formationBorder(pf(1.3))).toEqual({ color: GREEN, dashed: false, active: 1 });
    expect(formationBorder(pf(1, 1.25))).toEqual({ color: BLUE, dashed: false, active: 2 });   // Mitglied in 2, eine mit ×
    expect(formationBorder(pf(1.3, 1.25, 1.25))).toEqual({ color: PURPLE, dashed: false, active: 3 });
  });

  it("Anzahl bei 4 gedeckelt (gold)", () => {
    expect(formationBorder(pf(1, 1, 1, 1, 1))).toEqual({ color: GOLD, dashed: true, active: 4 });
    expect(formationBorder(pf(2, 2, 2, 2, 2))).toEqual({ color: GOLD, dashed: false, active: 4 });
  });
});
