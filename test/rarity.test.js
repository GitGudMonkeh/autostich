import { describe, it, expect } from "vitest";
import {
  TIERS, TIER_META, TIER_WEIGHTS, ROMAN,
  priceOfTier, romanOf, tierColor, tierLabel,
  canOfferFamilyTier,
  familyTierOf, withFamilyTier,
  UPGRADE_TYPES,
} from "../src/game/rarity.js";

describe("Stufen-Metadaten (Spec §1)", () => {
  it("vier Stufen mit festen Preisen 8/12/18/30", () => {
    expect(TIERS).toEqual([1, 2, 3, 4]);
    expect([1, 2, 3, 4].map(priceOfTier)).toEqual([8, 12, 18, 30]);
  });
  // Sprachprüfung: Stufe IV heißt sichtbar „Episch" (vorher „Rar" — steigerte gegen „Sehr selten"
  // rückwärts, beides Synonyme). Die INTERNE Kennung bleibt "epic" und darf sich nicht mitändern.
  it("interne Rarität normal/uncommon/rare/epic; sichtbare Leiter steigert Normal→Episch", () => {
    expect([1, 2, 3, 4].map((t) => TIER_META[t].rarity)).toEqual(["normal", "uncommon", "rare", "epic"]);
    expect([1, 2, 3, 4].map((t) => TIER_META[t].label)).toEqual(["Normal", "Selten", "Sehr selten", "Episch"]);
  });
  it("Farbskala Grau/Grün/Blau/Lila", () => {
    expect([1, 2, 3, 4].map(tierColor)).toEqual(["#8a8a95", "#4ade80", "#5a8ade", "#a855f7"]);
  });
  it("römische Stufe im Etikett: Momentum III; Rang 0 → nur Name", () => {
    expect(romanOf(3)).toBe("III");
    expect(tierLabel("Momentum", 3)).toBe("Momentum III");
    expect(tierLabel("Momentum", 0)).toBe("Momentum");
    expect(ROMAN[4]).toBe("IV");
  });
});

describe("Angebotsfilter (Spec §2.4)", () => {
  it("nur Stufen ECHT über dem aktuellen Rang", () => {
    expect(canOfferFamilyTier(0, 1)).toBe(true);
    expect(canOfferFamilyTier(2, 2)).toBe(false); // gleich zählt nicht
    expect(canOfferFamilyTier(2, 1)).toBe(false); // niedriger nicht
    expect(canOfferFamilyTier(2, 3)).toBe(true);
    expect(canOfferFamilyTier(4, 4)).toBe(false); // IV schließt ab
  });
});

describe("Familienzustand (immutabel)", () => {
  it("lesen/schreiben ohne Mutation", () => {
    const ft = { A: 2 };
    expect(familyTierOf(ft, "A")).toBe(2);
    expect(familyTierOf(ft, "B")).toBe(0);
    const ft2 = withFamilyTier(ft, "B", 3);
    expect(ft2).toEqual({ A: 2, B: 3 });
    expect(ft).toEqual({ A: 2 }); // Original unverändert
  });
});

describe("Upgrade-Typen (Spec §2.3)", () => {
  it("drei Marker", () => {
    expect(UPGRADE_TYPES).toEqual({ REPLACEMENT: "replacement", CUMULATIVE: "cumulative", ROLE: "role" });
    expect(TIER_WEIGHTS[1]).toBeGreaterThan(TIER_WEIGHTS[4]); // höhere Stufe seltener
  });
});
