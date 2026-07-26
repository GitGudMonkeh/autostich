import { describe, it, expect } from "vitest";
import {
  TIERS, TIER_META, TIER_WEIGHTS, ROMAN,
  priceOfTier, romanOf, rarityKeyOf, tierColor, tierLabel,
  canOfferFamilyTier, offerableTiers,
  familyTierOf, withFamilyTier, familyComplete,
  buildFamilyOffer, UPGRADE_TYPES,
} from "../src/game/rarity.js";

// Deterministischer PRNG (mulberry32) — wie in den übrigen Suites: gleicher Seed → gleiche Züge.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("Stufen-Metadaten (Spec §1)", () => {
  it("vier Stufen mit festen Preisen 8/12/18/30", () => {
    expect(TIERS).toEqual([1, 2, 3, 4]);
    expect([1, 2, 3, 4].map(priceOfTier)).toEqual([8, 12, 18, 30]);
  });
  it("interne Rarität normal/uncommon/rare/epic; sichtbares Etikett Stufe IV = Rar", () => {
    expect([1, 2, 3, 4].map(rarityKeyOf)).toEqual(["normal", "uncommon", "rare", "epic"]);
    expect(TIER_META[4].label).toBe("Rar");
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
  it("offerableTiers: Rang 2 → [3,4]; Rang 4 → [] (abgeschlossen)", () => {
    const fam = { id: "F", tiers: [1, 2, 3, 4] };
    expect(offerableTiers(fam, 0)).toEqual([1, 2, 3, 4]);
    expect(offerableTiers(fam, 2)).toEqual([3, 4]);
    expect(offerableTiers(fam, 4)).toEqual([]);
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
    expect(familyComplete({ A: 4 }, "A")).toBe(true);
    expect(familyComplete({ A: 3 }, "A")).toBe(false);
  });
});

describe("buildFamilyOffer (Spec §2)", () => {
  const fams = [
    { id: "A", tiers: [1, 2, 3, 4] },
    { id: "B", tiers: [1, 2, 3, 4] },
    { id: "C", tiers: [1, 2, 3, 4] },
    { id: "D", tiers: [1, 2, 3, 4] },
  ];

  it("deterministisch bei gleichem Seed", () => {
    const a = buildFamilyOffer(fams, {}, makeRng(7), 3);
    const b = buildFamilyOffer(fams, {}, makeRng(7), 3);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
  });

  it("liefert VERSCHIEDENE Familien (keine Dublette je Angebot)", () => {
    const off = buildFamilyOffer(fams, {}, makeRng(3), 4);
    const ids = off.map((o) => o.familyId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("bietet nur Stufen über dem aktuellen Rang; jede gewählte Stufe ist anbietbar", () => {
    const ft = { A: 2, B: 4, C: 0, D: 3 };
    const off = buildFamilyOffer(fams, ft, makeRng(11), 4);
    expect(off.some((o) => o.familyId === "B")).toBe(false); // Rang IV → nie angeboten
    for (const o of off) {
      const cur = ft[o.familyId] || 0;
      expect(o.tier).toBeGreaterThan(cur);
    }
  });

  it("überspringt deaktivierte Familien und respektiert count", () => {
    const withDisabled = [...fams, { id: "E", tiers: [1, 2, 3, 4], enabled: false }];
    const off = buildFamilyOffer(withDisabled, {}, makeRng(5), 10);
    expect(off.some((o) => o.familyId === "E")).toBe(false);
    expect(off).toHaveLength(4); // nur A–D verfügbar
  });

  it("leeres Angebot, wenn alle Familien abgeschlossen sind", () => {
    expect(buildFamilyOffer(fams, { A: 4, B: 4, C: 4, D: 4 }, makeRng(1), 3)).toEqual([]);
  });
});

describe("Upgrade-Typen (Spec §2.3)", () => {
  it("drei Marker", () => {
    expect(UPGRADE_TYPES).toEqual({ REPLACEMENT: "replacement", CUMULATIVE: "cumulative", ROLE: "role" });
    expect(TIER_WEIGHTS[1]).toBeGreaterThan(TIER_WEIGHTS[4]); // höhere Stufe seltener
  });
});
