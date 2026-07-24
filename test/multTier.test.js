import { describe, it, expect } from "vitest";
import { multTierColor } from "../src/ui/multTier.js";

const GREY = "#8a8a95", GREEN = "#5ab87a", BLUE = "#5a8ade", PURPLE = "#8a7de0", GOLD = "#d4a63a";

describe("multTierColor (#100): Serien-/Score-Mult-Farbe nach Höhe", () => {
  it("×1,00 (kein Bonus) → grau", () => {
    expect(multTierColor(1)).toBe(GREY);
    expect(multTierColor(1.0005)).toBe(GREY);
  });
  it("Tier-Grenzen grün/blau/lila/gold", () => {
    expect(multTierColor(1.02)).toBe(GREEN);  // >×1,00
    expect(multTierColor(1.29)).toBe(GREEN);
    expect(multTierColor(1.30)).toBe(BLUE);   // ab ×1,30
    expect(multTierColor(1.69)).toBe(BLUE);
    expect(multTierColor(1.70)).toBe(PURPLE); // ab ×1,70
    expect(multTierColor(2.09)).toBe(PURPLE);
    expect(multTierColor(2.10)).toBe(GOLD);   // ab ×2,10
    expect(multTierColor(2.50)).toBe(GOLD);
  });
});
