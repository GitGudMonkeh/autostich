import { describe, it, expect } from "vitest";
import { anchorTypeAt, anchorAt, linkedPartnerOf, perkLegendaryChance, skillLegendaryChance, cycleLenFor, initialShop } from "../src/game/shop.js";
import { PERK_LEGENDARY_BASE, SKILL_LEGENDARY_BASE, MAX_LEGENDARY_CHANCE_BONUS, TRICKS_PER_CYCLE } from "../src/game/constants.js";

/* #347/6: pure Shop-Residuen-Helfer (pro Stich/Render genutzt), bisher ungetestet. */

describe("Positionsanker (anchorTypeAt / anchorAt)", () => {
  const anchors = [{ position: 3, type: "boost" }, { position: 7, type: "duel" }];
  it("findet Typ/Objekt an der Deckposition, sonst null", () => {
    expect(anchorTypeAt(anchors, 3)).toBe("boost");
    expect(anchorTypeAt(anchors, 7)).toBe("duel");
    expect(anchorTypeAt(anchors, 5)).toBeNull();
    expect(anchorAt(anchors, 3)).toEqual({ position: 3, type: "boost" });
    expect(anchorAt(anchors, 5)).toBeNull();
  });
  it("robust bei leeren/fehlenden Ankern (Architekt-Spiel: anchors immer [])", () => {
    expect(anchorTypeAt([], 0)).toBeNull();
    expect(anchorTypeAt(null, 0)).toBeNull();
    expect(anchorTypeAt(undefined, 0)).toBeNull();
    expect(anchorAt(null, 0)).toBeNull();
  });
});

describe("linkedPartnerOf (Farballianz-UI)", () => {
  it("liefert die Partnerfarbe innerhalb der Allianz-Gruppe, sonst null", () => {
    const view = { linkedGroups: [["R", "B"], ["G", "Y"]] };
    expect(linkedPartnerOf(view, "R")).toBe("B");
    expect(linkedPartnerOf(view, "B")).toBe("R");
    expect(linkedPartnerOf(view, "G")).toBe("Y");
    expect(linkedPartnerOf(view, "X")).toBeNull(); // nicht in einer Gruppe
  });
  it("kompatibel zum Altfeld linkedColors (nur bei genau 2 Farben)", () => {
    expect(linkedPartnerOf({ linkedColors: ["R", "B"] }, "R")).toBe("B");
    expect(linkedPartnerOf({ linkedColors: ["R", "B", "G"] }, "R")).toBeNull(); // 3er → kein 2er-Paar
    expect(linkedPartnerOf({}, "R")).toBeNull();
    expect(linkedPartnerOf(null, "R")).toBeNull();
  });
});

describe("Legendär-Chancen + Zykluslänge", () => {
  it("perkLegendaryChance = Basis + additiver Bonus, gedeckelt", () => {
    expect(perkLegendaryChance({})).toBeCloseTo(PERK_LEGENDARY_BASE, 10);
    expect(perkLegendaryChance()).toBeCloseTo(PERK_LEGENDARY_BASE, 10);
    expect(perkLegendaryChance({ perkLegendaryBonus: 0.05 })).toBeCloseTo(PERK_LEGENDARY_BASE + 0.05, 10);
    expect(perkLegendaryChance({ perkLegendaryBonus: 999 })).toBeCloseTo(PERK_LEGENDARY_BASE + MAX_LEGENDARY_CHANCE_BONUS, 10); // Cap
  });
  it("skillLegendaryChance = reine Basis (Pity-Feld entfernt)", () => {
    expect(skillLegendaryChance()).toBeCloseTo(SKILL_LEGENDARY_BASE, 10);
  });
  it("cycleLenFor = konstante Zykluslänge; initialShop nur inerte Anker", () => {
    expect(cycleLenFor()).toBe(TRICKS_PER_CYCLE);
    expect(initialShop()).toEqual({ anchors: [] });
  });
});
