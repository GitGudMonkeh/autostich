import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, initialState, menuState } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialShop, coinsPerCycle, buildShopOffer, canAfford, isItemAvailable, priceOf, SHOP_ITEM_DEFS } from "../src/game/shop.js";
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
  it("coinsPerCycle: Basis + Einkommen-Level, additiv, nie negativ", () => {
    expect(BASE_COINS_PER_CYCLE).toBe(2);
    expect(coinsPerCycle(0)).toBe(2);
    expect(coinsPerCycle(1)).toBe(3);
    expect(coinsPerCycle(3)).toBe(5);
    expect(coinsPerCycle(-5)).toBe(2); // defensiv: negatives Level zählt als 0
  });
  it("+2 Münzen nach abgeschlossenem Durchlauf bei Einkommen 0", () => {
    const s = resolveTrick(atCycleEnd({ cycle: 0 }), rng);
    expect(s.cycle).toBe(1);
    expect(s.shop.coins).toBe(STARTING_COINS + 2); // 2 Start + 2
  });
  it("+3 Münzen bei Einkommen 1 (stackbar/additiv)", () => {
    const s = resolveTrick(atCycleEnd({ cycle: 0, economyStatLevel: 1 }), rng);
    expect(s.shop.coins).toBe(STARTING_COINS + 3); // 2 Start + 3
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
  it("isItemAvailable filtert gekaufte Legendäre und gekaufte nicht-wiederholbare Items (§15)", () => {
    expect(isItemAvailable({ id: "X_L", legendary: true, repeatable: false }, { boughtLegendaryIds: ["X_L"] })).toBe(false);
    expect(isItemAvailable({ id: "F1", repeatable: false }, { boughtNonRepeatableIds: ["F1"] })).toBe(false);
    expect(isItemAvailable({ id: "F1", repeatable: false }, {})).toBe(true);
  });
});

describe("Shop-Kauf — BUY_ITEM (Shop-Spec §5.4)", () => {
  it("Engine zieht bei Shop-Eintritt ein Angebot (Array; leer solange keine Items registriert)", () => {
    const s = resolveTrick(atCycleEnd({ cycle: 3 }), rng); // → Shop-Runde
    expect(s.phase).toBe("shop");
    expect(Array.isArray(s.shop.offers)).toBe(true);
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
