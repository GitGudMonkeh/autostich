import { describe, it, expect } from "vitest";
import { formationBorder } from "../src/ui/formationStyle.js";

// Rahmen-Helfer (Issue #95): Farbe = Anzahl Formations-Mitgliedschaften (1 grün · 2 blau · 3 lila · 4 gold),
// Stil = gestrichelt nur ohne wirksamen Multiplikator. Durch den Überlappungsbonus (#95) hat jede Karte
// mit ≥2 Formationen stets einen Multiplikator → nur einzelne Faktor-1-Läufe bleiben gestrichelt.
const GREEN = "#5ab87a", BLUE = "#5a8ade", PURPLE = "#8a7de0", GOLD = "#d4a63a";
const OVERLAP = { 2: 1.5, 3: 2, 4: 3 };
const pf = (...factors) => {
  let mult = 1;
  for (const f of factors) if (f > 1) mult *= f;
  const c = Math.min(factors.length, 4);
  if (c >= 2) mult *= OVERLAP[c];
  return { formations: factors.map((f) => ({ type: "x", factor: f })), mult };
};

describe("formationBorder (#95.4/8)", () => {
  it("keine Formation → kein Sonderrahmen", () => {
    expect(formationBorder({ formations: [], mult: 1 })).toEqual({ color: null, dashed: false, active: 0 });
    expect(formationBorder(null)).toEqual({ color: null, dashed: false, active: 0 });
  });

  it("Farbe richtet sich nach der Anzahl Formationen", () => {
    expect(formationBorder(pf(1.3)).color).toBe(GREEN);
    expect(formationBorder(pf(1, 1.25)).color).toBe(BLUE);
    expect(formationBorder(pf(1.3, 1.25, 1.25)).color).toBe(PURPLE);
    expect(formationBorder(pf(2, 2, 2, 2)).color).toBe(GOLD);
  });

  it("gestrichelt nur bei EINER Formation ohne Multiplikator; ab 2 gibt der Überlappungsbonus stets ein ×", () => {
    expect(formationBorder(pf(1))).toEqual({ color: GREEN, dashed: true, active: 1 });    // 1 Formation, kein ×
    expect(formationBorder(pf(1.3))).toEqual({ color: GREEN, dashed: false, active: 1 });  // 1 Formation mit ×
    expect(formationBorder(pf(1, 1))).toEqual({ color: BLUE, dashed: false, active: 2 });  // 2 → Überlappung ×1,5 → solid
    expect(formationBorder(pf(1, 1, 1))).toEqual({ color: PURPLE, dashed: false, active: 3 });
  });

  it("Anzahl bei 4 gedeckelt (gold)", () => {
    expect(formationBorder(pf(1, 1, 1, 1, 1))).toMatchObject({ color: GOLD, dashed: false, active: 4 });
  });
});
