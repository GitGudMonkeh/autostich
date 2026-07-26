import { describe, it, expect } from "vitest";
import { makeRng, buildDeck } from "../src/game/deck.js";
import {
  SHOP_FAMILY_DEFS, SHOP_FAMILY_LIST, shopFamilyDef, shopFamilyCategory,
  REFINE_TOTAL, refineDelta, offerableShopTiers, shopFamilyTierLabel, shopFamilyTierPrice, shopFamilyTierDesc,
  ANCHOR_FAMILY_BY_TYPE, anchorTierDef, anchorTierParam,
} from "../src/game/shopFamilies.js";
import { formationEnergyBonus } from "../src/game/shopFamilies.js";
import { UPGRADE_TYPES, TIERS } from "../src/game/rarity.js";
import { SUIT_ORDER } from "../src/game/constants.js";
import { SEGMENT_SIZE, computeFormations } from "../src/game/formations.js";

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

describe("Anker-Shop-Familien (Spec §4.2 Ankerfamilien)", () => {
  it("sieben Anker-Familien, REPLACEMENT, repeatable:false, mit anchorType + Ziel (Position bzw. Segment beim Zeitsegment)", () => {
    const anchors = SHOP_FAMILY_LIST.filter((f) => f.cat === "anchors");
    expect(anchors).toHaveLength(7); // 6 Positions-Anker + Zeitsegment
    for (const fam of anchors) {
      expect(fam.upgradeType).toBe(UPGRADE_TYPES.REPLACEMENT);
      expect(fam.repeatable).toBe(false); // Nutzer-Entscheid #164: Anker schließen bei IV ab
      expect(typeof fam.anchorType).toBe("string");
      const expected = fam.anchorType === "time" ? { segment: true } : { position: true };
      for (const t of TIERS) expect(fam.tiers[t].pickTarget).toEqual(expected);
    }
  });
  it("ANCHOR_FAMILY_BY_TYPE + anchorTierParam lösen die Stufen-Stärke auf", () => {
    expect(ANCHOR_FAMILY_BY_TYPE.power.id).toBe("SF_A_POWER");
    expect([1, 2, 3, 4].map((t) => anchorTierParam("power", t, "power"))).toEqual([1, 2, 4, 6]);
    expect([1, 2, 3, 4].map((t) => anchorTierParam("score", t, "score"))).toEqual([100, 200, 350, 600]);
    expect([1, 2, 3, 4].map((t) => anchorTierParam("crit", t, "crit"))).toEqual([0.10, 0.15, 0.25, 0.40]);
    expect([1, 2, 3, 4].map((t) => anchorTierParam("streak", t, "streak"))).toEqual([1, 1, 2, 2]);
    expect([1, 2, 3, 4].map((t) => anchorTierParam("formation", t, "factor"))).toEqual([1.15, 1.25, 1.40, 1.60]);
    expect(anchorTierDef("does-not-exist", 1)).toBe(null);
  });
  it("IV-Boni + Serien-Nuancen liegen auf der Stufe", () => {
    expect(anchorTierParam("power", 4, "winScore")).toBe(100);   // Kraftanker IV: Sieg +100 Score
    expect(anchorTierParam("crit", 4, "critScore")).toBe(250);   // Kritanker IV: Crit +250 Score
    expect(anchorTierParam("streak", 1, "everySecond")).toBe(true); // §10: jeder zweite Sieg
    expect(anchorTierParam("streak", 4, "noReset")).toBe(true);  // IV: Niederlage setzt Serie nicht zurück
  });
  it("Jokeranker: erlaubte Formationstypen wachsen je Stufe", () => {
    expect(anchorTierParam("joker", 1, "jokerTypes")).toEqual(["wiederholung"]);
    expect(anchorTierParam("joker", 2, "jokerTypes")).toEqual(["wiederholung", "treppe"]);
    expect(anchorTierParam("joker", 3, "jokerTypes")).toEqual(["wiederholung", "treppe", "farbblock"]);
    expect(anchorTierParam("joker", 4, "jokerTypes")).toEqual(["wiederholung", "treppe", "farbblock", "wechsel"]);
  });
  it("Anker-Familien schließen bei IV ab (kein Nachkauf)", () => {
    expect(offerableShopTiers("SF_A_POWER", 4)).toEqual([]); // repeatable:false → IV schließt ab
    expect(offerableShopTiers("SF_A_POWER", 2)).toEqual([3, 4]);
  });
});

describe("Formations-Shop-Familien (Spec §4.2 Formationsfamilien + §4.3)", () => {
  const seqDeck = (vals) => vals.map((v, i) => ({ id: "Z" + i, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
  const ord = (n) => Array.from({ length: n }, (_, i) => i);
  const pe = (id, tier) => SHOP_FAMILY_DEFS[id].tiers[tier].pe;
  const cf = (deck, permEffects) => computeFormations(ord(deck.length), deck, {}, [], [], [], permEffects);

  it("Formations-Familien: REPLACEMENT, repeatable:false, Stufen-pe bzw. Feinjustierung-Energie", () => {
    const forms = SHOP_FAMILY_LIST.filter((f) => f.cat === "formations");
    for (const fam of forms) {
      expect(fam.upgradeType).toBe(UPGRADE_TYPES.REPLACEMENT);
      expect(fam.repeatable).toBe(false);
      for (const t of TIERS) {
        const td = fam.tiers[t];
        expect(td.pe || td.energyBonus != null).toBeTruthy(); // permEffects-Patch ODER Energie
      }
    }
  });
  it("Verstärkte Wiederholung III/IV: 3. Karte +0,10 bzw. alle Faktoren ×1,20", () => {
    const deck = seqDeck([5, 5, 5, 1, 9]); // 3er-Wiederholung auf Pos 0–2
    const base = cf(deck, {});
    expect(base[2].formations.find((f) => f.type === "wiederholung").factor).toBeCloseTo(1.50);
    const iii = cf(deck, pe("SF_F_STRONG_REP", 3));
    expect(iii[2].formations.find((f) => f.type === "wiederholung").factor).toBeCloseTo(1.60); // 1,50 + 0,10
    expect(iii[1].formations.find((f) => f.type === "wiederholung").factor).toBeCloseTo(1.35); // 2. Karte 1,25+0,10
    const iv = cf(deck, pe("SF_F_STRONG_REP", 4));
    expect(iv[1].formations.find((f) => f.type === "wiederholung").factor).toBeCloseTo(1.35 * 1.20); // ×1,20 auf alle
  });
  it("Enger Wechsel: Mindestdifferenz je Stufe (I=4, III=2)", () => {
    const d3 = seqDeck([5, 8, 5, 8, 5]); // |Diff| 3
    expect(cf(d3, {})[0].formations.some((f) => f.type === "wechsel")).toBe(false);         // Basis 5 → nein
    expect(cf(d3, pe("SF_F_TIGHT_SWITCH", 1))[0].formations.some((f) => f.type === "wechsel")).toBe(false); // I=4 → nein
    expect(cf(d3, pe("SF_F_TIGHT_SWITCH", 3))[0].formations.some((f) => f.type === "wechsel")).toBe(true);  // III=2 → ja
  });
  it("Nachhall I: Cap ×1,20 + nur Wiederholungen (Farbblock-Nachhall unterdrückt)", () => {
    const rep = seqDeck([30, 29, 28, 22, 22, 20]); // Wiederholung [22,22] endet Pos 4 → Nachhall auf Pos 5
    const on = cf(rep, pe("SF_F_AFTERGLOW", 1));
    const nh = on[5].formations.find((f) => f.type === "nachhall");
    expect(nh && nh.factor).toBeCloseTo(1.20); // gekappt (Wiederholung-Endfaktor 1,25 → 1,20)
    // Farbblock-Nachhall bei Stufe I unterdrückt (repsOnly)
    const fb = [{ id: "a", suit: "R", value: 1 }, { id: "b", suit: "R", value: 20 }, { id: "c", suit: "R", value: 9 }, { id: "d", suit: "B", value: 3 }];
    expect(cf(fb, pe("SF_F_AFTERGLOW", 1))[3].formations.some((f) => f.type === "nachhall")).toBe(false);
  });
  it("Nachhall IV: hält für die nächsten zwei Karten (hold 2)", () => {
    const rep = seqDeck([30, 29, 28, 22, 22, 20, 19]); // Wiederholung endet Pos 4 → Nachhall auf Pos 5 UND Pos 6
    const on = cf(rep, pe("SF_F_AFTERGLOW", 4));
    expect(on[5].formations.some((f) => f.type === "nachhall")).toBe(true);
    expect(on[6].formations.some((f) => f.type === "nachhall")).toBe(true);
  });
  it("Feinjustierung: Energiebonus je Stufe (I §10 nur gerade Durchläufe)", () => {
    expect(formationEnergyBonus({ SF_F_TUNING: 2 }, 0)).toBe(1);
    expect(formationEnergyBonus({ SF_F_TUNING: 3 }, 0)).toBe(2);
    expect(formationEnergyBonus({ SF_F_TUNING: 4 }, 0)).toBe(3);
    expect(formationEnergyBonus({ SF_F_TUNING: 1 }, 0)).toBe(1); // gerader Durchlauf → +1
    expect(formationEnergyBonus({ SF_F_TUNING: 1 }, 1)).toBe(0); // ungerader → 0 (jede zweite Phase)
    expect(formationEnergyBonus({}, 0)).toBe(0);
  });
});
