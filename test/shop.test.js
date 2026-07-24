import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, initialState, menuState } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialShop, coinsPerCycle, shopIncomeFor, buildShopOffer, canAfford, isItemAvailable, priceOf, SHOP_ITEM_DEFS, playSequence, cycleLenFor, SEGMENT_BOUNDARIES } from "../src/game/shop.js";
import { computeFormations } from "../src/game/formations.js";
import { STAT_IDS } from "../src/game/stats.js";
import { MAX_CYCLES, DECISION_SCHEDULE, STARTING_COINS, BASE_COINS_PER_CYCLE,
  SHOP_CATEGORIES, SHOP_ITEMS_PER_CATEGORY, SHOP_ITEMS_OFFERED, SHOP_PRICE, SHOP_LEGENDARY_CHANCE } from "../src/game/constants.js";

const rng = makeRng(9);
// Zustand am Durchlauf-Ende (pos 39 = letzter Stich) — der Stich schließt den Durchlauf ab und vergibt Münzen.
const atCycleEnd = (over = {}) => ({ ...initialState(makeRng(1)), pos: 39, ...over });

describe("Shop-Rhythmus — Entscheidungsplan (Shop-Spec §2)", () => {
  it("Run hat genau 44 Durchläufe und einen 44-Einträge-Plan", () => {
    expect(MAX_CYCLES).toBe(44);
    expect(DECISION_SCHEDULE).toHaveLength(44);
  });
  it("Verteilung ist 11 Stat · 11 Perk · 8 Formation · 8 Shop · 6 Skill (§2.3)", () => {
    const count = (t) => DECISION_SCHEDULE.filter((d) => d === t).length;
    expect(count("stat")).toBe(11);
    expect(count("perk")).toBe(11);
    expect(count("formation")).toBe(8);
    expect(count("shop")).toBe(8);
    expect(count("skill")).toBe(6);
  });
  it("Shop-Zeitpunkte = 5, 11, 16, 22, 27, 33, 38, 42 (§2.4)", () => {
    const at = DECISION_SCHEDULE.map((d, i) => (d === "shop" ? i + 1 : null)).filter(Boolean);
    expect(at).toEqual([5, 11, 16, 22, 27, 33, 38, 42]);
  });
  it("Skill-Zeitpunkte = 6, 12, 19, 28, 34, 41 (§2.5)", () => {
    const at = DECISION_SCHEDULE.map((d, i) => (d === "skill" ? i + 1 : null)).filter(Boolean);
    expect(at).toEqual([6, 12, 19, 28, 34, 41]);
  });
  it("erster Plan-Eintrag ist Stat (Start-Entscheid via START_RUN)", () => {
    expect(DECISION_SCHEDULE[0]).toBe("stat");
  });
});

describe("Münzökonomie (Shop-Spec §3)", () => {
  it("initialShop startet mit 2 Münzen (STARTING_COINS)", () => {
    expect(STARTING_COINS).toBe(2);
    expect(initialShop().coins).toBe(2);
    expect(initialState(makeRng(1)).shop.coins).toBe(2);
  });
  it("coinsPerCycle ist konstant die Basis; Einkommen wirkt jetzt am Shop (+3 je Pick)", () => {
    expect(BASE_COINS_PER_CYCLE).toBe(2);
    expect(coinsPerCycle()).toBe(2);
    expect(shopIncomeFor(0)).toBe(0);
    expect(shopIncomeFor(1)).toBe(3);
    expect(shopIncomeFor(2)).toBe(6);
    expect(shopIncomeFor(-5)).toBe(0); // defensiv: negatives Level zählt als 0
  });
  it("+2 Münzen je abgeschlossenem Durchlauf — einkommensunabhängig", () => {
    expect(resolveTrick(atCycleEnd({ cycle: 0 }), rng).shop.coins).toBe(STARTING_COINS + 2);
    expect(resolveTrick(atCycleEnd({ cycle: 0, economyStatLevel: 3 }), rng).shop.coins).toBe(STARTING_COINS + 2); // cycle 0→1 = Perk, kein Shop
  });
  it("Einkommensbonus wird beim Öffnen des Shops gutgeschrieben (+3 je Pick, pro Shop)", () => {
    // cycle 3 → nächste Entscheidung ist der Shop (§2.2).
    const base = resolveTrick(atCycleEnd({ cycle: 3, economyStatLevel: 0 }), rng);
    const boosted = resolveTrick(atCycleEnd({ cycle: 3, economyStatLevel: 2 }), rng);
    expect(base.phase).toBe("shop");
    expect(boosted.shop.coins - base.shop.coins).toBe(6); // +3 × 2 Picks
  });
  it("Münzen werden auch nach dem letzten Durchlauf noch vergeben (§3.5) und der Run endet", () => {
    const s = resolveTrick(atCycleEnd({ cycle: MAX_CYCLES - 1 }), rng);
    expect(s.phase).toBe("gameover");
    expect(s.shop.coins).toBe(STARTING_COINS + 2);
  });
  it("kein Einkommen bei Aufgabe mitten im Durchlauf (END_RUN vergibt nichts)", () => {
    const mid = { ...initialState(makeRng(1)), trickNo: 5, pos: 5, shop: { ...initialShop(), coins: 7 } };
    const r = reducer(mid, { type: "END_RUN" });
    expect(r.phase).toBe("gameover");
    expect(r.shop.coins).toBe(7); // unverändert
  });
});

describe("Einkommens-Stat (Shop-Spec §4)", () => {
  const statState = (over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", statOffer: STAT_IDS, ...over });
  it("Stat-Angebot enthält fünf Stats inkl. Einkommen (§4.3)", () => {
    expect(STAT_IDS).toHaveLength(5);
    expect(STAT_IDS).toContain("economy");
  });
  it("PICK_STAT economy erhöht economyStatLevel um 1 und kehrt in play zurück", () => {
    const s = reducer(statState(), { type: "PICK_STAT", statId: "economy", rng });
    expect(s.phase).toBe("play");
    expect(s.economyStatLevel).toBe(1);
  });
  it("stapelt additiv über mehrere Picks", () => {
    const s = reducer(statState({ economyStatLevel: 2 }), { type: "PICK_STAT", statId: "economy", rng });
    expect(s.economyStatLevel).toBe(3);
  });
});

describe("Shop-Phase — Reducer (Shop-Spec §2.6)", () => {
  it("LEAVE_SHOP kehrt aus der Shop-Phase in play zurück", () => {
    const shop = { ...initialState(makeRng(1)), phase: "shop" };
    expect(reducer(shop, { type: "LEAVE_SHOP" }).phase).toBe("play");
  });
  it("LEAVE_SHOP ist außerhalb der Shop-Phase wirkungslos", () => {
    const play = initialState(makeRng(1));
    expect(reducer(play, { type: "LEAVE_SHOP" })).toBe(play);
    const menu = menuState();
    expect(reducer(menu, { type: "LEAVE_SHOP" })).toBe(menu);
  });
});

// --- S1 Angebots-Fixtures (echte Items folgen ab S2; die Ziehung ist registry-agnostisch) ---
const fxClean = () => { // je Kategorie genau 2 günstige Normale → saubere 2/Kategorie-Struktur, kein Legendär
  const f = {};
  for (const cat of SHOP_CATEGORIES) {
    f[`${cat}_a`] = { id: `${cat}_a`, category: cat, tier: "cheap", name: `${cat} a`, repeatable: true };
    f[`${cat}_b`] = { id: `${cat}_b`, category: cat, tier: "cheap", name: `${cat} b`, repeatable: true };
  }
  return f;
};
const fxLeg = () => { // je Kategorie 2 günstige Normale + 1 Legendär (repeatable:false)
  const f = fxClean();
  for (const cat of SHOP_CATEGORIES) f[`${cat}_L`] = { id: `${cat}_L`, category: cat, tier: "legendary", name: `${cat} L`, legendary: true, repeatable: false };
  return f;
};
const fxNoCheap = () => { // je Kategorie 2 starke Normale; ein günstiges Item außerhalb der Kategorien (nur via Garantie erreichbar)
  const f = {};
  for (const cat of SHOP_CATEGORIES) {
    f[`${cat}_s1`] = { id: `${cat}_s1`, category: cat, tier: "strong", name: `${cat} s1`, repeatable: true };
    f[`${cat}_s2`] = { id: `${cat}_s2`, category: cat, tier: "strong", name: `${cat} s2`, repeatable: true };
  }
  f.misc_cheap = { id: "misc_cheap", category: "misc", tier: "cheap", name: "misc cheap", repeatable: true };
  return f;
};
const legCount = (offers) => offers.filter((o) => o.legendary).length;

describe("Shop-Angebot — Ziehung (Shop-Spec §5)", () => {
  it("genau 2 Angebote je Kategorie, 8 insgesamt, ohne Dublette je Kategorie (§5.2)", () => {
    const off = buildShopOffer(fxClean(), initialShop(), makeRng(4));
    expect(off).toHaveLength(SHOP_ITEMS_OFFERED);
    for (const cat of SHOP_CATEGORIES) {
      const inCat = off.filter((o) => o.category === cat);
      expect(inCat).toHaveLength(SHOP_ITEMS_PER_CATEGORY);
      expect(new Set(inCat.map((o) => o.itemId)).size).toBe(inCat.length);
    }
  });
  it("leere Registry → leeres Angebot", () => {
    expect(buildShopOffer({}, initialShop(), makeRng(1))).toEqual([]);
  });
  it("Preise sind ausschließlich die vier festen Stufen (§5.5)", () => {
    const off = buildShopOffer(fxLeg(), initialShop(), makeRng(2));
    for (const o of off) expect(Object.values(SHOP_PRICE)).toContain(o.price);
    expect(priceOf("cheap")).toBe(8);
    expect(priceOf("legendary")).toBe(30);
  });
  it("Cheap-Garantie: jeder Shop enthält mindestens ein günstiges Item (§5.6)", () => {
    for (let seed = 1; seed <= 40; seed++)
      expect(buildShopOffer(fxNoCheap(), initialShop(), makeRng(seed)).some((o) => o.tier === "cheap")).toBe(true);
  });
  it("höchstens EIN Legendär je Shop (§5.7)", () => {
    for (let seed = 1; seed <= 120; seed++)
      expect(legCount(buildShopOffer(fxLeg(), initialShop(), makeRng(seed)))).toBeLessThanOrEqual(1);
  });
  it("Legendäre können erscheinen (Ersetzung ~10 %) …", () => {
    let any = false;
    for (let seed = 1; seed <= 150 && !any; seed++)
      if (legCount(buildShopOffer(fxLeg(), initialShop(), makeRng(seed))) === 1) any = true;
    expect(any).toBe(true);
  });
  it("… aber gekaufte Legendäre erscheinen nie wieder (§5.7)", () => {
    const shop = { ...initialShop(), boughtLegendaryIds: SHOP_CATEGORIES.map((c) => `${c}_L`) };
    for (let seed = 1; seed <= 120; seed++) expect(legCount(buildShopOffer(fxLeg(), shop, makeRng(seed)))).toBe(0);
  });
  it("gleicher Seed → identisches Angebot (deterministisch, §5.3)", () => {
    expect(buildShopOffer(fxLeg(), initialShop(), makeRng(7))).toEqual(buildShopOffer(fxLeg(), initialShop(), makeRng(7)));
  });
  it("Cheap-Garantie überlebt die Legendär-Ersetzung (§5.6 + §5.7, auch bei nur einer Kategorie)", () => {
    // Wie live in S2: nur 'cards' bestückt, mit günstig/stark/premium/legendär. Beide Garantien müssen gelten.
    const fx = {
      c: { id: "c", category: "cards", tier: "cheap", repeatable: true },
      s: { id: "s", category: "cards", tier: "strong", repeatable: true },
      p: { id: "p", category: "cards", tier: "premium", repeatable: true },
      L: { id: "L", category: "cards", tier: "legendary", legendary: true, repeatable: false },
    };
    for (let seed = 1; seed <= 200; seed++) {
      const off = buildShopOffer(fx, initialShop(), makeRng(seed));
      expect(off.some((o) => o.tier === "cheap")).toBe(true);
      expect(legCount(off)).toBeLessThanOrEqual(1);
    }
  });
  it("isItemAvailable filtert gekaufte Legendäre und gekaufte nicht-wiederholbare Items (§15)", () => {
    expect(isItemAvailable({ id: "X_L", legendary: true, repeatable: false }, { boughtLegendaryIds: ["X_L"] })).toBe(false);
    expect(isItemAvailable({ id: "F1", repeatable: false }, { boughtNonRepeatableIds: ["F1"] })).toBe(false);
    expect(isItemAvailable({ id: "F1", repeatable: false }, {})).toBe(true);
  });
});

describe("Shop-Kauf — BUY_ITEM (Shop-Spec §5.4)", () => {
  it("Engine zieht bei Shop-Eintritt ein volles Angebot (S5: alle 4 Kategorien → 8 Angebote)", () => {
    const s = resolveTrick(atCycleEnd({ cycle: 3 }), rng); // → Shop-Runde
    expect(s.phase).toBe("shop");
    expect(s.shop.offers).toHaveLength(SHOP_ITEMS_OFFERED); // Karten/Anker/Formationen/Planung je 2
    expect(s.shop.offers.every((o) => SHOP_CATEGORIES.includes(o.category))).toBe(true);
    expect(s.shop.purchasedOfferIds).toEqual([]);
  });
  it("LEAVE_SHOP leert das Angebot (nicht gekaufte Items verworfen, §5.4)", () => {
    const st = { ...initialState(makeRng(1)), phase: "shop",
      shop: { ...initialShop(), offers: [{ offerId: "o0", itemId: "X", category: "cards", tier: "cheap", price: 8, legendary: false }], purchasedOfferIds: ["o0"] } };
    const r = reducer(st, { type: "LEAVE_SHOP" });
    expect(r.phase).toBe("play");
    expect(r.shop.offers).toBe(null);
    expect(r.shop.purchasedOfferIds).toEqual([]);
  });
  it("zieht den Preis ab, markiert verkauft und wendet den Effekt an; nicht zweimal kaufbar", () => {
    SHOP_ITEM_DEFS.TESTBUY = { id: "TESTBUY", category: "planning", tier: "cheap", repeatable: true,
      apply: (s) => ({ shop: { ...s.shop, perkRerolls: (s.shop.perkRerolls || 0) + 1 } }) };
    try {
      const offer = { offerId: "o0", itemId: "TESTBUY", category: "planning", tier: "cheap", price: 8, legendary: false };
      const st = { ...initialState(makeRng(1)), phase: "shop", shop: { ...initialShop(), coins: 10, offers: [offer] } };
      const r = reducer(st, { type: "BUY_ITEM", offerId: "o0", rng: makeRng(1) });
      expect(r.shop.coins).toBe(2);
      expect(r.shop.purchasedOfferIds).toEqual(["o0"]);
      expect(r.shop.perkRerolls).toBe(1);
      expect(reducer(r, { type: "BUY_ITEM", offerId: "o0", rng: makeRng(1) })).toBe(r); // schon gekauft → unverändert
    } finally { delete SHOP_ITEM_DEFS.TESTBUY; }
  });
  it("ohne Deckung / außerhalb Shop / unbekanntes Item: unverändert", () => {
    SHOP_ITEM_DEFS.TESTBUY2 = { id: "TESTBUY2", category: "cards", tier: "strong", repeatable: true, apply: () => ({}) };
    try {
      const offer = { offerId: "o0", itemId: "TESTBUY2", category: "cards", tier: "strong", price: 12, legendary: false };
      const poor = { ...initialState(makeRng(1)), phase: "shop", shop: { ...initialShop(), coins: 5, offers: [offer] } };
      expect(reducer(poor, { type: "BUY_ITEM", offerId: "o0", rng: makeRng(1) })).toBe(poor); // 5 < 12
      const unknown = { ...poor, shop: { ...poor.shop, coins: 50, offers: [{ ...offer, itemId: "GHOST" }] } };
      expect(reducer(unknown, { type: "BUY_ITEM", offerId: "o0" })).toBe(unknown); // Item nicht in DEFS
      const play = initialState(makeRng(1));
      expect(reducer(play, { type: "BUY_ITEM", offerId: "o0" })).toBe(play); // nicht in Shop-Phase
    } finally { delete SHOP_ITEM_DEFS.TESTBUY2; }
  });
  it("canAfford: Münzen ≥ Preis", () => {
    expect(canAfford({ coins: 8 }, { price: 8 })).toBe(true);
    expect(canAfford({ coins: 7 }, { price: 8 })).toBe(false);
  });
});

describe("Shop-Kartenitems — Effekte (Shop-Spec §7)", () => {
  const base = () => initialState(makeRng(1));
  const val = (deck, id) => deck.find((c) => c.id === id).value;
  const suit = (deck, id) => deck.find((c) => c.id === id).suit;

  it("K1/K5/K8 Wertbonus +1/+2/+3 auf die gewählte Karte", () => {
    const s = base(), v = val(s.deck, "R5");
    expect(val(SHOP_ITEM_DEFS.K1.apply(s, { cardIds: ["R5"] }).deck, "R5")).toBe(v + 1);
    expect(val(SHOP_ITEM_DEFS.K5.apply(s, { cardIds: ["R5"] }).deck, "R5")).toBe(v + 2);
    expect(val(SHOP_ITEM_DEFS.K8.apply(s, { cardIds: ["R5"] }).deck, "R5")).toBe(v + 3);
  });
  it("K6/K9 mehrere Karten je +1", () => {
    const s = base();
    const d6 = SHOP_ITEM_DEFS.K6.apply(s, { cardIds: ["R1", "B2"] }).deck;
    expect(val(d6, "R1")).toBe(2); expect(val(d6, "B2")).toBe(3);
    const d9 = SHOP_ITEM_DEFS.K9.apply(s, { cardIds: ["R1", "B2", "G3"] }).deck;
    expect([val(d9, "R1"), val(d9, "B2"), val(d9, "G3")]).toEqual([2, 3, 4]);
  });
  it("K3 tauscht Dauerwerte, K4 tauscht Farben", () => {
    const s = base();
    const d3 = SHOP_ITEM_DEFS.K3.apply(s, { cardIds: ["R1", "R10"] }).deck; // Werte 1 <-> 10
    expect([val(d3, "R1"), val(d3, "R10")]).toEqual([10, 1]);
    const d4 = SHOP_ITEM_DEFS.K4.apply(s, { cardIds: ["R1", "B1"] }).deck;  // Farben R <-> B
    expect([suit(d4, "R1"), suit(d4, "B1")]).toEqual(["B", "R"]);
  });
  it("K2/K7/K10 färben die gewählten Karten um", () => {
    const s = base();
    expect(suit(SHOP_ITEM_DEFS.K2.apply(s, { colors: { R5: "G" } }).deck, "R5")).toBe("G");
    const d7 = SHOP_ITEM_DEFS.K7.apply(s, { colors: { R5: "G", B6: "Y" } }).deck;
    expect([suit(d7, "R5"), suit(d7, "B6")]).toEqual(["G", "Y"]);
  });
  it("K-L1 verstärkt die fünf Karten des Segments um +1 (an card.id)", () => {
    const s = base(), seg = 2; // Positionen 11–15
    const ids = s.playerOrder.slice(seg * 5, seg * 5 + 5).map((di) => s.deck[di].id);
    const d = SHOP_ITEM_DEFS["K-L1"].apply(s, { segment: seg }).deck;
    for (const id of ids) expect(val(d, id)).toBe(val(s.deck, id) + 1);
    const outside = s.deck.find((c) => !ids.includes(c.id));
    expect(val(d, outside.id)).toBe(val(s.deck, outside.id));
  });
  it("Marker (Ionisierung/Frost) bleiben bei Farbänderung an der Karte", () => {
    const s = base();
    s.deck = s.deck.map((c) => (c.id === "R5" ? { ...c, ionStacks: 2, frozen: true } : c));
    const c = SHOP_ITEM_DEFS.K2.apply(s, { colors: { R5: "G" } }).deck.find((x) => x.id === "R5");
    expect([c.suit, c.ionStacks, c.frozen]).toEqual(["G", 2, true]);
  });
});

describe("Shop-Ziel-Flow — Kauf mit Zielauswahl (Shop-Spec §12.2)", () => {
  const shopWith = (itemId, price, tier = "cheap") => {
    const offer = { offerId: "o0", itemId, category: "cards", tier, price, legendary: tier === "legendary" };
    return { ...initialState(makeRng(1)), phase: "shop", shop: { ...initialShop(), coins: 30, offers: [offer] } };
  };
  it("BUY_ITEM eines Ziel-Items öffnet die shop-target-Phase ohne Münzabzug", () => {
    const r = reducer(shopWith("K1", 8), { type: "BUY_ITEM", offerId: "o0" });
    expect(r.phase).toBe("shop-target");
    expect(r.shopTarget).toMatchObject({ offerId: "o0", itemId: "K1", cards: [] });
    expect(r.shop.coins).toBe(30);
    expect(r.shop.purchasedOfferIds).toEqual([]);
  });
  it("SHOP_TARGET_CARD: Einzelziel schaltet um / wählt ab", () => {
    let s = reducer(shopWith("K1", 8), { type: "BUY_ITEM", offerId: "o0" });
    s = reducer(s, { type: "SHOP_TARGET_CARD", cardId: "R1" }); expect(s.shopTarget.cards).toEqual(["R1"]);
    s = reducer(s, { type: "SHOP_TARGET_CARD", cardId: "R2" }); expect(s.shopTarget.cards).toEqual(["R2"]);
    s = reducer(s, { type: "SHOP_TARGET_CARD", cardId: "R2" }); expect(s.shopTarget.cards).toEqual([]);
  });
  it("Zwei-Karten-Limit: dritte Auswahl wird ignoriert", () => {
    let s = reducer(shopWith("K6", 12, "strong"), { type: "BUY_ITEM", offerId: "o0" });
    s = reducer(s, { type: "SHOP_TARGET_CARD", cardId: "R1" });
    s = reducer(s, { type: "SHOP_TARGET_CARD", cardId: "R2" });
    s = reducer(s, { type: "SHOP_TARGET_CARD", cardId: "R3" });
    expect(s.shopTarget.cards).toEqual(["R1", "R2"]);
  });
  it("CONFIRM unvollständig → unverändert; vollständig → kauft, zieht Preis ab, verkauft markiert, wendet an", () => {
    let s = reducer(shopWith("K5", 12, "strong"), { type: "BUY_ITEM", offerId: "o0" });
    expect(reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) })).toBe(s); // 0 Karten → unverändert
    s = reducer(s, { type: "SHOP_TARGET_CARD", cardId: "R5" });
    const before = s.deck.find((c) => c.id === "R5").value;
    const r = reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) });
    expect(r.phase).toBe("shop");
    expect(r.shop.coins).toBe(18); // 30 - 12
    expect(r.shop.purchasedOfferIds).toEqual(["o0"]);
    expect(r.shopTarget).toBe(null);
    expect(r.deck.find((c) => c.id === "R5").value).toBe(before + 2);
  });
  it("CANCEL → zurück in den Shop, Münzen & Angebot unverändert", () => {
    let s = reducer(shopWith("K1", 8), { type: "BUY_ITEM", offerId: "o0" });
    s = reducer(s, { type: "SHOP_TARGET_CARD", cardId: "R1" });
    const r = reducer(s, { type: "SHOP_TARGET_CANCEL" });
    expect(r.phase).toBe("shop");
    expect(r.shopTarget).toBe(null);
    expect(r.shop.coins).toBe(30);
    expect(r.shop.purchasedOfferIds).toEqual([]);
  });
  it("Farb-Item: CONFIRM erst mit gültiger (anderer) Farbe je Karte", () => {
    let s = reducer(shopWith("K2", 8), { type: "BUY_ITEM", offerId: "o0" });
    s = reducer(s, { type: "SHOP_TARGET_CARD", cardId: "R5" });
    expect(reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) })).toBe(s);          // Farbe fehlt
    expect(reducer(s, { type: "SHOP_TARGET_COLOR", cardId: "R5", color: "R" })).toBe(s);   // gleiche Farbe → abgelehnt
    s = reducer(s, { type: "SHOP_TARGET_COLOR", cardId: "R5", color: "G" });
    const r = reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) });
    expect(r.phase).toBe("shop");
    expect(r.deck.find((c) => c.id === "R5").suit).toBe("G");
  });
  it("Segment-Legendär K-L1: verstärkt das Segment, fliegt aus dem Pool (legendär + nicht wiederholbar)", () => {
    let s = reducer(shopWith("K-L1", 30, "legendary"), { type: "BUY_ITEM", offerId: "o0" });
    expect(s.phase).toBe("shop-target");
    s = reducer(s, { type: "SHOP_TARGET_SEGMENT", segment: 1 });
    const ids = s.playerOrder.slice(5, 10).map((di) => s.deck[di].id);
    const r = reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) });
    expect(r.shop.coins).toBe(0);
    expect(r.shop.boughtLegendaryIds).toEqual(["K-L1"]);
    expect(r.shop.boughtNonRepeatableIds).toEqual(["K-L1"]);
    for (const id of ids) expect(r.deck.find((c) => c.id === id).value).toBe(s.deck.find((c) => c.id === id).value + 1);
  });
});

// --- S3a Positionsanker-Helfer ---
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const never = () => 0.99; // Crit-Wurf schlägt nie an
// Zustand mit einem Anker auf `pos`, Stich läuft auf `pos` (Anker greift), Standard-Deck 5 vs 6.
const withAnchor = (type, pos, over = {}) => ({
  ...initialState(makeRng(1)),
  deck: constDeck(5), oppDeck: constDeck(6), playerOrder: identity(), oppOrder: identity(),
  pos, shop: { ...initialShop(), anchors: [{ type, position: pos }] }, ...over,
});

describe("Shop-Positionsanker — Wirkung (Shop-Spec §8)", () => {
  it("A1 Kraftanker: +2 Wert auf der Position (macht aus 5 vs 6 einen Sieg)", () => {
    const s = resolveTrick(withAnchor("power", 3), rng);
    expect(s.lastTrick.pValue).toBe(7);
    expect(s.wins).toBe(1);
    expect(resolveTrick({ ...withAnchor("power", 3), shop: initialShop() }, rng).losses).toBe(1); // ohne Anker: Niederlage
  });
  it("A1 wirkt NUR auf der Ankerposition", () => {
    expect(resolveTrick({ ...withAnchor("power", 3), pos: 0 }, rng).lastTrick.pValue).toBe(5);
  });
  it("A2 Punkteanker: +150 Flat-Score bei Sieg auf der Position", () => {
    const s = resolveTrick(withAnchor("score", 2, { deck: constDeck(12), oppDeck: constDeck(0) }), never);
    expect(s.lastTrick.breakdown.flats).toBe(150);
  });
  it("A3 Kritanker: +15 pp Crit-Chance auf der Position", () => {
    const s = resolveTrick(withAnchor("crit", 2, { deck: constDeck(12), oppDeck: constDeck(0) }), never);
    expect(s.lastTrick.critChance).toBeCloseTo(0.15);
  });
  it("A4 Serienanker: Sieg auf der Position gibt +1 zusätzlichen Serienpunkt", () => {
    const win = { deck: constDeck(12), oppDeck: constDeck(0) };
    expect(resolveTrick(withAnchor("streak", 2, win), never).winStreak).toBe(2); // 1 Sieg + 1 Anker
    expect(resolveTrick({ ...withAnchor("streak", 2, win), shop: initialShop() }, never).winStreak).toBe(1);
  });
  it("A5 Formationsanker: Position zählt als Anker ×1,25 (nicht auf anderen Positionen)", () => {
    const deck = initialState(makeRng(1)).deck;
    const out = computeFormations(identity(), deck, {}, [], [], [{ type: "formation", position: 5 }]);
    const anker = out[5].formations.find((f) => f.type === "anker");
    expect(anker && anker.factor).toBe(1.25);
    expect(out[6].formations.some((f) => f.type === "anker")).toBe(false);
  });
});

describe("Shop-Anker — Kauf & Platzierung (Shop-Spec §8)", () => {
  const anchorShop = (itemId, anchors = []) => ({
    ...initialState(makeRng(1)), phase: "shop",
    shop: { ...initialShop(), coins: 10, offers: [{ offerId: "o0", itemId, category: "anchors", tier: "cheap", price: 8, legendary: false }], anchors },
  });
  it("Kauf öffnet Positions-Auswahl; CONFIRM legt den Anker an und zieht den Preis ab", () => {
    let s = reducer(anchorShop("A1"), { type: "BUY_ITEM", offerId: "o0" });
    expect(s.phase).toBe("shop-target");
    expect(reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) })).toBe(s); // ohne Position → unverändert
    s = reducer(s, { type: "SHOP_TARGET_POSITION", position: 12 });
    const r = reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) });
    expect(r.phase).toBe("shop");
    expect(r.shop.coins).toBe(2);
    expect(r.shop.anchors).toEqual([{ type: "power", position: 12 }]);
    expect(r.shop.purchasedOfferIds).toEqual(["o0"]);
  });
  it("belegte Position wird abgelehnt (max 1 Anker je Position, §8.1)", () => {
    let s = reducer(anchorShop("A2", [{ type: "power", position: 7 }]), { type: "BUY_ITEM", offerId: "o0" });
    expect(reducer(s, { type: "SHOP_TARGET_POSITION", position: 7 })).toBe(s); // belegt → ignoriert
    s = reducer(s, { type: "SHOP_TARGET_POSITION", position: 8 });
    const r = reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) });
    expect(r.shop.anchors.map((a) => a.position).sort((a, b) => a - b)).toEqual([7, 8]);
  });
});

// Einen kompletten Durchlauf abspielen und die Stichzahl zählen (bis der Durchlauf endet / cycle steigt).
const runCycle = (state) => {
  let s = state, tricks = 0;
  while (s.cycle === state.cycle && s.phase === "play" && tricks < 60) { s = resolveTrick(s, makeRng(tricks + 1)); tricks++; }
  return { s, tricks };
};

describe("Zeitsegment — A-L1 (Shop-Spec §8)", () => {
  it("playSequence: ohne → 40; mit Segment 1 werden Positionen 5–9 direkt wiederholt (→ 45)", () => {
    expect(playSequence(null)).toHaveLength(40);
    const seq = playSequence(1);
    expect(seq).toHaveLength(45);
    expect(seq.slice(0, 15)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 5, 6, 7, 8, 9]);
  });
  it("cycleLenFor: 40 ohne, 45 mit Zeitsegment", () => {
    expect(cycleLenFor({ timeSegmentIndex: null })).toBe(40);
    expect(cycleLenFor({ timeSegmentIndex: 2 })).toBe(45);
    expect(cycleLenFor(null)).toBe(40);
  });
  it("ein Durchlauf hat 45 Stiche mit Zeitsegment, sonst 40", () => {
    expect(runCycle(initialState(makeRng(1))).tricks).toBe(40);
    const withSeg = { ...initialState(makeRng(1)), shop: { ...initialShop(), timeSegmentIndex: 1 } };
    const { s, tricks } = runCycle(withSeg);
    expect(tricks).toBe(45);
    expect(s.cycle).toBe(1);
  });
  it("das wiederholte Segment spielt dieselben Spieler- und Gegnerkarten; Stich ist als Wiederholung markiert", () => {
    let s = { ...initialState(makeRng(1)), shop: { ...initialShop(), timeSegmentIndex: 1 } }; // Segment 1 = Positionen 5–9
    const t = [];
    for (let i = 0; i < 15; i++) { s = resolveTrick(s, makeRng(i + 1)); t.push(s.lastTrick); }
    expect(t[4].isRepeatedSegmentTrick).toBe(false);       // Position 4 (vor dem Segment)
    expect(t[10].isRepeatedSegmentTrick).toBe(true);       // Stich-Index 10 = Wiederholung von Position 5
    expect(t[10].originalPosition).toBe(5);
    expect(t[10].segmentIndex).toBe(1);
    expect(t[10].pCard.id).toBe(t[5].pCard.id);
    expect(t[10].oCard.id).toBe(t[5].oCard.id);
  });
  it("positionsgebundene Effekte lösen im wiederholten Segment erneut aus (Anker auf Position 6)", () => {
    let s = { ...initialState(makeRng(1)), deck: constDeck(5), oppDeck: constDeck(6), playerOrder: identity(), oppOrder: identity(),
      shop: { ...initialShop(), timeSegmentIndex: 1, anchors: [{ type: "power", position: 6 }] } };
    const t = [];
    for (let i = 0; i < 12; i++) { s = resolveTrick(s, makeRng(i + 1)); t.push(s.lastTrick); }
    expect(t[6].pValue).toBe(7);   // Position 6 (5+2 Kraftanker)
    expect(t[11].pValue).toBe(7);  // Wiederholung von Position 6 → wieder +2
    expect(t[11].originalPosition).toBe(6);
  });
  it("Kauf von A-L1 setzt timeSegmentIndex (einmalig, legendär + nicht wiederholbar)", () => {
    const offer = { offerId: "o0", itemId: "A-L1", category: "anchors", tier: "legendary", price: 30, legendary: true };
    let s = { ...initialState(makeRng(1)), phase: "shop", shop: { ...initialShop(), coins: 30, offers: [offer] } };
    s = reducer(s, { type: "BUY_ITEM", offerId: "o0" });
    expect(s.phase).toBe("shop-target");
    s = reducer(s, { type: "SHOP_TARGET_SEGMENT", segment: 3 });
    const r = reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) });
    expect(r.shop.timeSegmentIndex).toBe(3);
    expect(r.shop.coins).toBe(0);
    expect(r.shop.boughtLegendaryIds).toEqual(["A-L1"]);
    expect(r.shop.boughtNonRepeatableIds).toEqual(["A-L1"]);
  });
});

// Deck mit vorgegebenen Werten (distinkte Farben → kein ungewollter Farbblock).
const seqDeck = (vals) => vals.map((v, i) => ({ id: `Z${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const ord = (n) => Array.from({ length: n }, (_, i) => i);
const hasForm = (out, pos, type) => out[pos].formations.some((f) => f.type === type);

describe("Shop-Formationsitems — F1/F2/F3 (Shop-Spec §9)", () => {
  it("F1 Abstieg: fallende Werte bilden erst mit descendingStraights eine Treppe", () => {
    const deck = seqDeck([10, 7, 4, 2, 9]); // 10>7>4>2 fallend
    expect(hasForm(computeFormations(ord(5), deck), 0, "treppe")).toBe(false);
    expect(hasForm(computeFormations(ord(5), deck, {}, [], [], [], { descendingStraights: true }), 0, "treppe")).toBe(true);
  });
  it("F2 Enger Wechsel: Nachbardifferenz 3 zählt erst mit switchMinDifference 3", () => {
    const deck = seqDeck([5, 8, 5, 8, 5]); // Zick-Zack mit |Diff| 3
    expect(hasForm(computeFormations(ord(5), deck), 0, "wechsel")).toBe(false);
    expect(hasForm(computeFormations(ord(5), deck, {}, [], [], [], { switchMinDifference: 3 }), 0, "wechsel")).toBe(true);
  });
  it("F3 Verstärkte Wiederholung: zweite Karte ×1,30 → ×1,40 (dritte bleibt ×1,60)", () => {
    const deck = seqDeck([5, 5, 1, 1, 1]);
    const base = computeFormations(ord(5), deck);
    expect(base[1].formations.find((f) => f.type === "wiederholung").factor).toBeCloseTo(1.30);
    const buffed = computeFormations(ord(5), deck, {}, [], [], [], { repetitionSecondFactorBonus: 0.10 });
    expect(buffed[1].formations.find((f) => f.type === "wiederholung").factor).toBeCloseTo(1.40);
    expect(buffed[4].formations.find((f) => f.type === "wiederholung").factor).toBeCloseTo(1.60); // 3. Karte (Ordinal 3) unverändert
  });
  it("Kauf eines F-Items (kein Ziel): setzt permanentEffects, zieht Preis ab, ist nicht wiederholbar", () => {
    const offer = { offerId: "o0", itemId: "F2", category: "formations", tier: "cheap", price: 8, legendary: false };
    const s = { ...initialState(makeRng(1)), phase: "shop", shop: { ...initialShop(), coins: 10, offers: [offer] } };
    const r = reducer(s, { type: "BUY_ITEM", offerId: "o0", rng: makeRng(1) });
    expect(r.phase).toBe("shop");
    expect(r.shop.coins).toBe(2);
    expect(r.shop.permanentEffects.switchMinDifference).toBe(3);
    expect(r.shop.boughtNonRepeatableIds).toEqual(["F2"]);
    expect(Array.isArray(r.formations)).toBe(true); // Formationen wurden neu berechnet
  });
});

describe("Shop-Formationsitems — F4/F5 (Shop-Spec §9)", () => {
  it("F4 Farballianz: zwei verlinkte Farben bilden zusammen einen Farbblock", () => {
    const deck = [{ id: "c0", suit: "R", value: 2 }, { id: "c1", suit: "B", value: 7 }, { id: "c2", suit: "R", value: 3 }];
    expect(hasForm(computeFormations(ord(3), deck), 0, "farbblock")).toBe(false); // R,B,R → kein Block
    expect(hasForm(computeFormations(ord(3), deck, {}, [], [], [], { linkedColors: ["R", "B"] }), 0, "farbblock")).toBe(true);
  });
  it("F5 Offene Grenze: ein Farbblock überschreitet die Grenze erst, wenn sie geöffnet ist", () => {
    const deck = [
      { id: "a", suit: "G", value: 1 }, { id: "b", suit: "Y", value: 2 }, { id: "c", suit: "B", value: 3 },
      { id: "d", suit: "R", value: 5 }, { id: "e", suit: "R", value: 1 }, { id: "f", suit: "R", value: 5 }, { id: "g", suit: "R", value: 1 },
    ]; // R-Block auf Positionen 3–6, Grenze bei Position 4 (4|5)
    expect(hasForm(computeFormations(ord(7), deck), 5, "farbblock")).toBe(false); // Grenze blockt → je Segment nur 2
    expect(hasForm(computeFormations(ord(7), deck, {}, [], [], [], { openSegmentBoundaries: [4] }), 5, "farbblock")).toBe(true);
  });
  it("Kauf F4: zwei Farben wählen → linkedColors gesetzt (Preis erst bei CONFIRM)", () => {
    const offer = { offerId: "o0", itemId: "F4", category: "formations", tier: "strong", price: 12, legendary: false };
    let s = { ...initialState(makeRng(1)), phase: "shop", shop: { ...initialShop(), coins: 12, offers: [offer] } };
    s = reducer(s, { type: "BUY_ITEM", offerId: "o0" });
    expect(s.phase).toBe("shop-target");
    expect(reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) })).toBe(s); // < 2 Farben → unverändert
    s = reducer(s, { type: "SHOP_TARGET_COLOR_PAIR", color: "R" });
    s = reducer(s, { type: "SHOP_TARGET_COLOR_PAIR", color: "B" });
    const r = reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) });
    expect(r.shop.permanentEffects.linkedColors).toEqual(["R", "B"]);
    expect(r.shop.coins).toBe(0);
  });
  it("Kauf F5: eine Grenze öffnen → openSegmentBoundaries; wiederholbar", () => {
    const offer = { offerId: "o0", itemId: "F5", category: "formations", tier: "premium", price: 18, legendary: false };
    let s = { ...initialState(makeRng(1)), phase: "shop", shop: { ...initialShop(), coins: 18, offers: [offer] } };
    s = reducer(s, { type: "BUY_ITEM", offerId: "o0" });
    s = reducer(s, { type: "SHOP_TARGET_BOUNDARY", boundary: 9 });
    const r = reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) });
    expect(r.shop.permanentEffects.openSegmentBoundaries).toEqual([9]);
    expect(r.shop.boughtNonRepeatableIds).toEqual([]); // wiederholbar
  });
  it("F5 wird abgelehnt bei bereits offener Grenze; verschiedene Grenzen stapeln", () => {
    const offer = { offerId: "o0", itemId: "F5", category: "formations", tier: "premium", price: 18, legendary: false };
    const base = { ...initialState(makeRng(1)), phase: "shop",
      shop: { ...initialShop(), coins: 18, offers: [offer], permanentEffects: { ...initialShop().permanentEffects, openSegmentBoundaries: [4] } } };
    let s = reducer(base, { type: "BUY_ITEM", offerId: "o0" });
    expect(reducer(s, { type: "SHOP_TARGET_BOUNDARY", boundary: 4 })).toBe(s); // schon offen → ignoriert
    s = reducer(s, { type: "SHOP_TARGET_BOUNDARY", boundary: 9 });
    const r = reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) });
    expect([...r.shop.permanentEffects.openSegmentBoundaries].sort((a, b) => a - b)).toEqual([4, 9]);
  });
  it("F5-Verfügbarkeit (§15): nicht bei E9, nicht wenn alle Grenzen offen", () => {
    expect(isItemAvailable(SHOP_ITEM_DEFS.F5, initialShop(), [])).toBe(true);
    expect(isItemAvailable(SHOP_ITEM_DEFS.F5, initialShop(), ["E9"])).toBe(false);
    const allOpen = { ...initialShop(), permanentEffects: { openSegmentBoundaries: [...SEGMENT_BOUNDARIES] } };
    expect(isItemAvailable(SHOP_ITEM_DEFS.F5, allOpen, [])).toBe(false);
  });
});

describe("Shop-Formationsitem — F6 Nachhall (Shop-Spec §9)", () => {
  it("die direkt folgende Karte erbt den Endfaktor als eigene Formation (bare Karte trägt sie)", () => {
    const deck = seqDeck([20, 20, 19, 18, 17]); // Wiederholung [20,20] endet auf Pos 1, Rest fällt (keine weitere Formation)
    const off = computeFormations(ord(5), deck);
    expect(off[2].formations.some((f) => f.type === "nachhall")).toBe(false); // ohne F6 kein Nachhall
    const on = computeFormations(ord(5), deck, {}, [], [], [], { formationAfterglow: true });
    const nh = on[2].formations.find((f) => f.type === "nachhall");
    expect(nh).toBeTruthy();
    expect(nh.factor).toBeCloseTo(1.30);       // wiederholungFactor(2)
    expect(nh.sourceType).toBe("wiederholung"); // trägt Ursprungstyp mit (für F-L1)
    expect(on[2].mult).toBeCloseTo(1.30);
    expect(on[2].afterglowFactor).toBeCloseTo(1.30);
    expect(on[3].formations.some((f) => f.type === "nachhall")).toBe(false); // kein Kaskadieren: Empfänger sendet nicht weiter
  });
  it("nimmt den höchsten Einzel-Endfaktor (Farbblock 1,30 vor Treppe 1,25)", () => {
    const deck = [
      { id: "a", suit: "R", value: 1 }, { id: "b", suit: "R", value: 2 }, { id: "c", suit: "R", value: 3 },
      { id: "d", suit: "B", value: 20 }, { id: "e", suit: "G", value: 9 },
    ]; // Pos 0–2: Farbblock UND Treppe, beide enden auf Pos 2
    const on = computeFormations(ord(5), deck, {}, [], [], [], { formationAfterglow: true });
    const nh = on[3].formations.find((f) => f.type === "nachhall");
    expect(nh.factor).toBeCloseTo(1.30);
    expect(nh.sourceType).toBe("farbblock");
  });
  it("überschreitet Segmentgrenzen — Empfänger im nächsten Segment", () => {
    const deck = seqDeck([30, 29, 28, 22, 22, 21, 20]); // Wiederholung [22,22] endet auf Pos 4 (Grenze 4|5)
    const on = computeFormations(ord(7), deck, {}, [], [], [], { formationAfterglow: true });
    const nh = on[5].formations.find((f) => f.type === "nachhall"); // Pos 5 = erstes Feld des Folgesegments
    expect(nh && nh.factor).toBeCloseTo(1.30);
  });
  it("endet die Formation auf der letzten Position, gibt es keinen Empfänger", () => {
    const deck = seqDeck([30, 29, 28, 27, 22, 22]); // Wiederholung [22,22] endet auf Pos 5 (= letzte Position)
    const on = computeFormations(ord(6), deck, {}, [], [], [], { formationAfterglow: true });
    expect(on.every((p) => !p.formations.some((f) => f.type === "nachhall"))).toBe(true);
  });
  it("Kauf F6 (kein Ziel): setzt formationAfterglow, ist nicht wiederholbar", () => {
    const offer = { offerId: "o0", itemId: "F6", category: "formations", tier: "premium", price: 18, legendary: false };
    const s = { ...initialState(makeRng(1)), phase: "shop", shop: { ...initialShop(), coins: 18, offers: [offer] } };
    const r = reducer(s, { type: "BUY_ITEM", offerId: "o0", rng: makeRng(1) });
    expect(r.phase).toBe("shop");
    expect(r.shop.coins).toBe(0);
    expect(r.shop.permanentEffects.formationAfterglow).toBe(true);
    expect(r.shop.boughtNonRepeatableIds).toEqual(["F6"]);
  });
});

describe("Shop-Formationsitem — F-L1 Formationskern (Shop-Spec §9)", () => {
  it("jede Position des gewählten Typs erhält zusätzlich ×1,50 als eigener Faktor", () => {
    const deck = [
      { id: "a", suit: "R", value: 30 }, { id: "b", suit: "R", value: 20 }, { id: "c", suit: "R", value: 10 }, { id: "d", suit: "B", value: 5 },
    ]; // Farbblock [0,1,2] (fallende Werte → keine Treppe/Wechsel), Pos 3 andersfarbig
    const off = computeFormations(ord(4), deck);
    expect(off[2].coreFactor).toBe(1);
    const on = computeFormations(ord(4), deck, {}, [], [], [], { formationCoreType: "farbblock" });
    expect(on[0].coreFactor).toBeCloseTo(1.50); // Ordinal-1-Mitglied zählt auch als „Teil des Typs"
    expect(on[2].coreFactor).toBeCloseTo(1.50);
    expect(on[2].mult).toBeCloseTo(1.30 * 1.50);
    expect(on[0].formations.some((f) => f.type === "formationskern")).toBe(true);
    expect(on[3].coreFactor).toBe(1); // Pos 3 ist kein Farbblock → kein Kern
  });
  it("wird auch durch Nachhall des Ursprungstyps ausgelöst (nicht bei anderem Kern-Typ)", () => {
    const deck = seqDeck([20, 20, 19, 18, 17]); // Nachhall auf Pos 2 trägt sourceType 'wiederholung'
    const same = computeFormations(ord(5), deck, {}, [], [], [], { formationAfterglow: true, formationCoreType: "wiederholung" });
    expect(same[2].afterglowFactor).toBeCloseTo(1.30);
    expect(same[2].coreFactor).toBeCloseTo(1.50);          // Nachhall(wiederholung) triggert Kern(wiederholung)
    expect(same[2].mult).toBeCloseTo(1.30 * 1.50);
    const other = computeFormations(ord(5), deck, {}, [], [], [], { formationAfterglow: true, formationCoreType: "treppe" });
    expect(other[2].coreFactor).toBe(1);                   // Nachhall ist wiederholung, Kern ist treppe → kein Trigger
  });
  it("Kauf F-L1: Formationstyp wählen → formationCoreType gesetzt (legendär + nicht wiederholbar)", () => {
    const offer = { offerId: "o0", itemId: "F-L1", category: "formations", tier: "legendary", price: 30, legendary: true };
    let s = { ...initialState(makeRng(1)), phase: "shop", shop: { ...initialShop(), coins: 30, offers: [offer] } };
    s = reducer(s, { type: "BUY_ITEM", offerId: "o0" });
    expect(s.phase).toBe("shop-target");
    expect(reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) })).toBe(s);                 // ohne Typ → unverändert
    expect(reducer(s, { type: "SHOP_TARGET_FORMATION_TYPE", formationType: "bogus" })).toBe(s);   // ungültiger Typ → ignoriert
    s = reducer(s, { type: "SHOP_TARGET_FORMATION_TYPE", formationType: "treppe" });
    const r = reducer(s, { type: "SHOP_TARGET_CONFIRM", rng: makeRng(1) });
    expect(r.phase).toBe("shop");
    expect(r.shop.permanentEffects.formationCoreType).toBe("treppe");
    expect(r.shop.coins).toBe(0);
    expect(r.shop.boughtLegendaryIds).toEqual(["F-L1"]);
    expect(r.shop.boughtNonRepeatableIds).toEqual(["F-L1"]);
  });
});

describe("Shop-Planungsitems — S5a Rerolls (Shop-Spec §10)", () => {
  it("P1/P2/P-L1 apply setzen Rerolls bzw. fateControl", () => {
    const s = initialState(makeRng(1));
    expect(SHOP_ITEM_DEFS.P1.apply(s).shop.perkRerolls).toBe(1);
    expect(SHOP_ITEM_DEFS.P2.apply(s).shop.skillRerolls).toBe(1);
    expect(SHOP_ITEM_DEFS["P-L1"].apply(s).shop.fateControl).toBe(true);
  });
  it("Kauf P1 (kein Ziel): +1 Perk-Neuwurf-Token, Preis abgezogen", () => {
    const offer = { offerId: "o0", itemId: "P1", category: "planning", tier: "cheap", price: 8, legendary: false };
    const s = { ...initialState(makeRng(1)), phase: "shop", shop: { ...initialShop(), coins: 8, offers: [offer] } };
    const r = reducer(s, { type: "BUY_ITEM", offerId: "o0", rng: makeRng(1) });
    expect(r.phase).toBe("shop");
    expect(r.shop.coins).toBe(0);
    expect(r.shop.perkRerolls).toBe(1);
  });
  it("Kauf P-L1 Schicksalskontrolle: fateControl (legendär + nicht wiederholbar)", () => {
    const offer = { offerId: "o0", itemId: "P-L1", category: "planning", tier: "legendary", price: 30, legendary: true };
    const s = { ...initialState(makeRng(1)), phase: "shop", shop: { ...initialShop(), coins: 30, offers: [offer] } };
    const r = reducer(s, { type: "BUY_ITEM", offerId: "o0", rng: makeRng(1) });
    expect(r.shop.fateControl).toBe(true);
    expect(r.shop.boughtLegendaryIds).toEqual(["P-L1"]);
    expect(r.shop.boughtNonRepeatableIds).toEqual(["P-L1"]);
  });

  const levelupPerk = (over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", offer: ["A1", "A2", "A3"], ...over });

  it("REROLL_PERK verbraucht einen Token und baut ein neues Angebot", () => {
    const s = levelupPerk({ shop: { ...initialShop(), perkRerolls: 2 } });
    const r = reducer(s, { type: "REROLL_PERK", rng: makeRng(5) });
    expect(r.shop.perkRerolls).toBe(1);
    expect(Array.isArray(r.offer)).toBe(true);
    expect(r.offer.length).toBeGreaterThan(0);
  });
  it("REROLL_PERK nutzt den gratis Reroll (fateControl) ZUERST, Token bleibt unangetastet", () => {
    const s = levelupPerk({ freePerkReroll: true, shop: { ...initialShop(), perkRerolls: 2 } });
    const r = reducer(s, { type: "REROLL_PERK", rng: makeRng(5) });
    expect(r.freePerkReroll).toBe(false); // gratis verbraucht
    expect(r.shop.perkRerolls).toBe(2);   // Token unangetastet
  });
  it("REROLL_PERK ohne Ressource ist wirkungslos", () => {
    const s = levelupPerk({ shop: initialShop() }); // 0 Token, kein gratis
    expect(reducer(s, { type: "REROLL_PERK", rng: makeRng(5) })).toBe(s);
  });
  it("REROLL_SKILL verbraucht einen Token und baut ein neues Skill-Angebot", () => {
    const s = { ...initialState(makeRng(1)), phase: "levelup", skillOffer: ["SK_LIGHTNING_01"],
      activeArchetypes: ["lightning"], skills: [], shop: { ...initialShop(), skillRerolls: 1 } };
    const r = reducer(s, { type: "REROLL_SKILL", rng: makeRng(3) });
    expect(r.shop.skillRerolls).toBe(0);
    expect(r.skillOffer.length).toBeGreaterThan(0);
  });
  it("REROLL_SKILL nutzt den gratis Reroll zuerst (Token unangetastet)", () => {
    const s = { ...initialState(makeRng(1)), phase: "levelup", skillOffer: ["SK_LIGHTNING_01"],
      activeArchetypes: ["lightning"], skills: [], freeSkillReroll: true, shop: { ...initialShop(), skillRerolls: 1 } };
    const r = reducer(s, { type: "REROLL_SKILL", rng: makeRng(3) });
    expect(r.freeSkillReroll).toBe(false);
    expect(r.shop.skillRerolls).toBe(1);
  });

  it("Engine setzt freePerkReroll beim Perk-Angebot nur mit aktiver Schicksalskontrolle", () => {
    const withFate = resolveTrick(atCycleEnd({ cycle: 0, shop: { ...initialShop(), fateControl: true } }), rng); // cycle 0→1 = Perk
    expect(withFate.phase).toBe("levelup");
    expect(withFate.offer).toBeTruthy();
    expect(withFate.freePerkReroll).toBe(true);
    const without = resolveTrick(atCycleEnd({ cycle: 0 }), rng);
    expect(without.freePerkReroll).toBe(false);
  });
  it("Engine setzt freeSkillReroll beim Skill-Angebot mit aktiver Schicksalskontrolle", () => {
    const s = resolveTrick(atCycleEnd({ cycle: 4, activeArchetypes: ["lightning"], // cycle 4→5 = Skill
      shop: { ...initialShop(), fateControl: true } }), rng);
    expect(s.phase).toBe("levelup");
    expect(s.skillOffer).toBeTruthy();
    expect(s.freeSkillReroll).toBe(true);
  });
});
