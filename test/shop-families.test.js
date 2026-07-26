import { describe, it, expect } from "vitest";
import { makeRng, buildDeck } from "../src/game/deck.js";
import {
  SHOP_FAMILY_DEFS, SHOP_FAMILY_LIST, shopFamilyDef, shopFamilyCategory,
  REFINE_TOTAL, refineDelta, offerableShopTiers, shopFamilyTierLabel, shopFamilyTierPrice, shopFamilyTierDesc,
} from "../src/game/shopFamilies.js";
import { UPGRADE_TYPES, TIERS } from "../src/game/rarity.js";
import { SUIT_ORDER } from "../src/game/constants.js";
import { SEGMENT_SIZE } from "../src/game/formations.js";

const UPGRADE_SET = new Set(Object.values(UPGRADE_TYPES));
// Kleines, deterministisches Test-Deck: 8 Karten mit bekannten Werten/Farben/IDs.
const mkDeck = () => [
  { id: "c0", value: 5, suit: "R", baseRank: 5 },
  { id: "c1", value: 3, suit: "B", baseRank: 3 },
  { id: "c2", value: 9, suit: "G", baseRank: 9 },
  { id: "c3", value: 1, suit: "Y", baseRank: 1 },
  { id: "c4", value: 7, suit: "R", baseRank: 7 },
  { id: "c5", value: 2, suit: "B", baseRank: 2 },
  { id: "c6", value: 8, suit: "G", baseRank: 8 },
  { id: "c7", value: 4, suit: "Y", baseRank: 4 },
];
const valOf = (deck, id) => deck.find((c) => c.id === id).value;
const suitOf = (deck, id) => deck.find((c) => c.id === id).suit;

describe("Shop-Familien-Registry — Struktur (Spec §4)", () => {
  it("jede Familie hat genau vier Stufen I–IV mit Beschreibung", () => {
    for (const fam of SHOP_FAMILY_LIST) {
      expect(Object.keys(fam.tiers).map(Number).sort()).toEqual([1, 2, 3, 4]);
      for (const t of TIERS) expect(typeof fam.tiers[t].desc).toBe("string");
    }
  });
  it("jede Familie trägt id/name/cat/upgradeType/repeatable + Legacy-Bezug", () => {
    for (const fam of SHOP_FAMILY_LIST) {
      expect(fam.id).toBeTruthy();
      expect(fam.name).toBeTruthy();
      expect(["cards", "anchors", "formations", "planning"]).toContain(fam.cat);
      expect(UPGRADE_SET.has(fam.upgradeType)).toBe(true);
      expect(typeof fam.repeatable).toBe("boolean");
      expect(Array.isArray(fam.legacyIds) && fam.legacyIds.length > 0).toBe(true);
    }
  });
  it("Registry-Schlüssel == fam.id; Helfer lösen korrekt auf", () => {
    for (const [key, fam] of Object.entries(SHOP_FAMILY_DEFS)) {
      expect(fam.id).toBe(key);
      expect(shopFamilyDef(key)).toBe(fam);
      expect(shopFamilyCategory(key)).toBe(fam.cat);
    }
    expect(shopFamilyDef("does-not-exist")).toBe(null);
  });
  it("Preis richtet sich nach der Zielstufe (8/12/18/30)", () => {
    expect(TIERS.map(shopFamilyTierPrice)).toEqual([8, 12, 18, 30]);
  });
  it("Angebotsfilter: nur Stufen echt über dem Rang, IV schließt ab (§4.1)", () => {
    expect(offerableShopTiers("SF_REFINE", 0)).toEqual([1, 2, 3, 4]);
    expect(offerableShopTiers("SF_REFINE", 2)).toEqual([3, 4]);
    expect(offerableShopTiers("SF_REFINE", 4)).toEqual([]);
  });
  it("Label + Desc lösen die Zielstufe auf", () => {
    expect(shopFamilyTierLabel("SF_REFINE", 3)).toBe("Feinschliff III");
    expect(shopFamilyTierDesc("SF_REFINE", 4)).toMatch(/\+5/);
  });
});

describe("Karten-Shop-Familien — Deck-Effekte (Spec §4.2 Kartenfamilien)", () => {
  it("SF_REFINE: Differenz-Aufwertung (direkter Drop = Zielwert, Upgrade = Differenz)", () => {
    expect(REFINE_TOTAL).toEqual({ 1: 1, 2: 2, 3: 3, 4: 5 });
    expect(refineDelta(0, 3)).toBe(3);   // direkter Drop III → +3
    expect(refineDelta(1, 3)).toBe(2);   // Upgrade I→III → +2
    expect(refineDelta(3, 4)).toBe(2);   // Upgrade III→IV → +2 (Gesamt 5)
    const d = mkDeck();
    const after = SHOP_FAMILY_DEFS.SF_REFINE.tiers[3].onPick(d, makeRng(1), { cardIds: ["c1"], refineDelta: refineDelta(1, 3) });
    expect(valOf(after, "c1")).toBe(3 + 2); // held I, upgrade auf III → +2
    // Fallback ohne refineDelta = voller Zielwert (direkter Drop).
    const drop = SHOP_FAMILY_DEFS.SF_REFINE.tiers[4].onPick(mkDeck(), makeRng(1), { cardIds: ["c3"] });
    expect(valOf(drop, "c3")).toBe(1 + 5);
  });
  it("SF_MULTI_REFINE: verstärkt genau die gewählten Karten je +1", () => {
    const after = SHOP_FAMILY_DEFS.SF_MULTI_REFINE.tiers[3].onPick(mkDeck(), makeRng(1), { cardIds: ["c0", "c2", "c5"] });
    expect([valOf(after, "c0"), valOf(after, "c2"), valOf(after, "c5")]).toEqual([6, 10, 3]);
    expect(valOf(after, "c1")).toBe(3); // nicht gewählt → unverändert
  });
  it("SF_RECOLOR: färbt je gewählter Karte auf die Zielfarbe um", () => {
    const after = SHOP_FAMILY_DEFS.SF_RECOLOR.tiers[2].onPick(mkDeck(), makeRng(1), { cardIds: ["c0", "c1"], colors: { c0: "G", c1: "Y" } });
    expect([suitOf(after, "c0"), suitOf(after, "c1")]).toEqual(["G", "Y"]);
    expect(valOf(after, "c0")).toBe(5); // Wert unverändert
  });
  it("SF_VALUE_SWAP I: tauscht Dauerwerte zweier Karten", () => {
    const after = SHOP_FAMILY_DEFS.SF_VALUE_SWAP.tiers[1].onPick(mkDeck(), makeRng(1), { cardIds: ["c0", "c3"] });
    expect([valOf(after, "c0"), valOf(after, "c3")]).toEqual([1, 5]); // 5<->1
  });
  it("SF_VALUE_SWAP II: nach dem Tausch erhält die niedrigere Karte +1", () => {
    const after = SHOP_FAMILY_DEFS.SF_VALUE_SWAP.tiers[2].onPick(mkDeck(), makeRng(1), { cardIds: ["c0", "c3"] });
    // c0: 5→1, c3: 1→5; niedrigere ist c0 (1) → +1 = 2.
    expect([valOf(after, "c0"), valOf(after, "c3")]).toEqual([2, 5]);
  });
  it("SF_VALUE_SWAP III: zwei Paare tauschen jeweils untereinander", () => {
    const after = SHOP_FAMILY_DEFS.SF_VALUE_SWAP.tiers[3].onPick(mkDeck(), makeRng(1), { cardIds: ["c0", "c1", "c2", "c3"] });
    expect([valOf(after, "c0"), valOf(after, "c1")]).toEqual([3, 5]); // Paar 1: 5<->3
    expect([valOf(after, "c2"), valOf(after, "c3")]).toEqual([1, 9]); // Paar 2: 9<->1
  });
  it("SF_VALUE_SWAP IV (§10): Tausch + beide +1", () => {
    const after = SHOP_FAMILY_DEFS.SF_VALUE_SWAP.tiers[4].onPick(mkDeck(), makeRng(1), { cardIds: ["c0", "c3"] });
    expect([valOf(after, "c0"), valOf(after, "c3")]).toEqual([2, 6]); // 5→1+1, 1→5+1
  });
  it("SF_COLOR_SWAP I: tauscht Farben zweier Karten", () => {
    const after = SHOP_FAMILY_DEFS.SF_COLOR_SWAP.tiers[1].onPick(mkDeck(), makeRng(1), { cardIds: ["c0", "c1"] });
    expect([suitOf(after, "c0"), suitOf(after, "c1")]).toEqual(["B", "R"]); // R<->B
  });
  it("SF_COLOR_SWAP III: zwei Paare tauschen Farben", () => {
    const after = SHOP_FAMILY_DEFS.SF_COLOR_SWAP.tiers[3].onPick(mkDeck(), makeRng(1), { cardIds: ["c0", "c1", "c2", "c3"] });
    expect([suitOf(after, "c0"), suitOf(after, "c1")]).toEqual(["B", "R"]);
    expect([suitOf(after, "c2"), suitOf(after, "c3")]).toEqual(["Y", "G"]);
  });
  it("SF_COLOR_SWAP IV (§10): zyklische Farbpermutation der gewählten Karten", () => {
    const after = SHOP_FAMILY_DEFS.SF_COLOR_SWAP.tiers[4].onPick(mkDeck(), makeRng(1), { cardIds: ["c0", "c1", "c2", "c3"] });
    // c0←c3(Y), c1←c0(R), c2←c1(B), c3←c2(G)
    expect([suitOf(after, "c0"), suitOf(after, "c1"), suitOf(after, "c2"), suitOf(after, "c3")]).toEqual(["Y", "R", "B", "G"]);
    // Alle vier Farben bleiben erhalten (nur permutiert).
    expect(["c0", "c1", "c2", "c3"].map((id) => suitOf(after, id)).sort()).toEqual(["B", "G", "R", "Y"]);
  });
  it("SF_SEGMENT_REFINE III/IV: alle fünf Segmentkarten je +1 / +2", () => {
    const deck = buildDeck();
    const order = deck.map((_, i) => i); // identische Ordnung → Segment 1 = Positionen 5..9
    const seg = 1;
    const ids = order.slice(seg * SEGMENT_SIZE, seg * SEGMENT_SIZE + SEGMENT_SIZE).map((di) => deck[di].id);
    const base = ids.map((id) => valOf(deck, id));
    const afterIII = SHOP_FAMILY_DEFS.SF_SEGMENT_REFINE.tiers[3].onPick(deck, makeRng(1), { segment: seg, order });
    expect(ids.map((id) => valOf(afterIII, id))).toEqual(base.map((v) => v + 1));
    const afterIV = SHOP_FAMILY_DEFS.SF_SEGMENT_REFINE.tiers[4].onPick(deck, makeRng(1), { segment: seg, order });
    expect(ids.map((id) => valOf(afterIV, id))).toEqual(base.map((v) => v + 2));
  });
  it("SF_SEGMENT_REFINE I/II: genau zwei bzw. drei Karten des Segments werden verstärkt", () => {
    const deck = buildDeck();
    const order = deck.map((_, i) => i);
    const seg = 2;
    const segIds = new Set(order.slice(seg * SEGMENT_SIZE, seg * SEGMENT_SIZE + SEGMENT_SIZE).map((di) => deck[di].id));
    const countBumped = (after) => [...segIds].filter((id) => valOf(after, id) > valOf(deck, id)).length;
    expect(countBumped(SHOP_FAMILY_DEFS.SF_SEGMENT_REFINE.tiers[1].onPick(deck, makeRng(3), { segment: seg, order }))).toBe(2);
    expect(countBumped(SHOP_FAMILY_DEFS.SF_SEGMENT_REFINE.tiers[2].onPick(deck, makeRng(3), { segment: seg, order }))).toBe(3);
  });
  it("SF_RECOLOR erhält Karten-Marker (Ionisierung/Frost) bei Farbänderung", () => {
    const deck = mkDeck().map((c) => (c.id === "c0" ? { ...c, ionStacks: 2, frozen: true } : c));
    const after = SHOP_FAMILY_DEFS.SF_RECOLOR.tiers[1].onPick(deck, makeRng(1), { cardIds: ["c0"], colors: { c0: "G" } });
    const c = after.find((x) => x.id === "c0");
    expect([c.suit, c.ionStacks, c.frozen]).toEqual(["G", 2, true]);
  });
  it("Karten-Effekte sind immutabel (Original-Deck unverändert)", () => {
    const deck = mkDeck();
    const snapshot = JSON.stringify(deck);
    SHOP_FAMILY_DEFS.SF_MULTI_REFINE.tiers[2].onPick(deck, makeRng(1), { cardIds: ["c0", "c1"] });
    SHOP_FAMILY_DEFS.SF_VALUE_SWAP.tiers[2].onPick(deck, makeRng(1), { cardIds: ["c0", "c1"] });
    expect(JSON.stringify(deck)).toBe(snapshot);
  });
  it("Kartenfamilien-Ziel-Deskriptoren (pickTarget) sind gesetzt", () => {
    expect(SHOP_FAMILY_DEFS.SF_REFINE.tiers[1].pickTarget).toEqual({ cards: 1 });
    expect(SHOP_FAMILY_DEFS.SF_RECOLOR.tiers[4].pickTarget).toEqual({ cards: 5, color: true });
    expect(SHOP_FAMILY_DEFS.SF_SEGMENT_REFINE.tiers[1].pickTarget).toEqual({ segment: true });
  });
  it("alle Kartenfamilien sind CUMULATIVE (Spec §4.2: einmaliges Kartenpaket je Stufe)", () => {
    for (const fam of SHOP_FAMILY_LIST.filter((f) => f.cat === "cards")) {
      expect(fam.upgradeType).toBe(UPGRADE_TYPES.CUMULATIVE);
    }
  });
});
