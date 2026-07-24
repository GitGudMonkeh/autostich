import * as C from "./constants.js";

/* ============================================================
   SHOP-SYSTEM (Shop-Spec) — reine Logik, kein Math.random / Date.
   S0: Run-State + Münzökonomie.  S1: Angebots-Ziehung (2/Kategorie, Cheap-Garantie, Legendär-Ersetzung).
   Die konkreten Items (K/A/F/P) folgen ab S2 in SHOP_ITEM_DEFS — die Ziehung ist registry-agnostisch
   (itemDefs wird injiziert), damit sie schon jetzt gegen Fixtures testbar ist.
   Trennung (Spec §6): Geld · Angebot · Planungsressourcen · permanente Regeländerungen ·
   Positionsanker · gekaufte Legendäre.

   Item-Schema (Spec §6.1) — reine Daten, KEINE UI-Logik:
     { id, category ∈ SHOP_CATEGORIES, name, description, tier ∈ {cheap,strong,premium,legendary},
       legendary?, repeatable, targetMode?, apply(state, target, rng) -> Patch }
   apply() gibt ein State-Patch zurück (z. B. { deck }, { shop:{…} }); die Münz-/Kauf-Buchhaltung macht
   der Reducer generisch (BUY_ITEM). Ziel-Items (targetMode) laufen über den Target-Flow (ab S2).
   ============================================================ */

// Konkrete Shop-Items — ab S2 gefüllt (Karten K1–K10/K-L1, Anker, Formationen, Planung).
export const SHOP_ITEM_DEFS = {};

// Preis einer Stufe (Spec §5.5) — nur vier feste Preise.
export const priceOf = (tier) => C.SHOP_PRICE[tier] ?? 0;

// Frischer Shop-Substate bei Run-Beginn. Felder für spätere Phasen sind schon angelegt (Defaults inert),
// damit das State-Shape stabil bleibt und keine Phase es später umbauen muss.
export function initialShop() {
  return {
    coins: C.STARTING_COINS,        // §3: globaler Run-State, kein Cap, nie negativ
    offers: null,                   // aktuelles Shop-Angebot (Array von Angebots-Instanzen) oder null außerhalb des Shops
    purchasedOfferIds: [],          // in DIESEM Shop gekaufte Angebots-Instanzen (offerId)
    boughtLegendaryIds: [],         // §5.7: pro Run einmalig gekaufte Legendäre (nie wieder)
    boughtNonRepeatableIds: [],     // §15: gekaufte nicht-wiederholbare Items (nie wieder angeboten)
    reservedItem: null,             // P4: reserviertes Item fürs nächste Angebot
    perkRerolls: 0, skillRerolls: 0, // P1/P2: gespeicherte Neuwürfe
    fateControl: false,             // P-L1: je Perk-/Skill-Auswahl ein kostenloser Neuwurf
    perkLegendaryBonus: 0, skillLegendaryBonus: 0, // P5/P6: additive Legendär-Chance (Cap in S5)
    permanentEffects: {},           // S4: F-Items (Regeländerungen der Formationserkennung)
    anchors: [],                    // S3: Positionsanker (an Position, nicht card.id)
    timeSegmentIndex: null,         // A-L1: gewähltes Zeitsegment
  };
}

// Münzen je vollständig abgeschlossenem Durchlauf (Spec §3.2): Basis + Einkommen-Level. Nie negativ.
export function coinsPerCycle(economyStatLevel = 0) {
  return C.BASE_COINS_PER_CYCLE + Math.max(0, economyStatLevel || 0);
}

// Kann der Spieler dieses Angebot bezahlen?
export const canAfford = (shop, offer) => !!offer && (shop?.coins || 0) >= offer.price;

// Pool-Filter (§15): ein Item ist verfügbar, solange ein gekauftes Legendär bzw. ein gekauftes
// nicht-wiederholbares Item nicht schon aus dem Pool geflogen ist. Weitere Filter (Cap/kein Ziel/
// Redundanz) kommen mit den jeweiligen Items in S3–S5 dazu.
export function isItemAvailable(def, shop = {}) {
  if (!def) return false;
  if (def.legendary && (shop.boughtLegendaryIds || []).includes(def.id)) return false;
  if (def.repeatable === false && (shop.boughtNonRepeatableIds || []).includes(def.id)) return false;
  return true;
}

// `n` verschiedene Items aus `pool` ziehen (deterministisch, immutabel). Weniger als n → so viele wie da sind
// (Spec §15: keine Dubletten im selben Angebot).
function drawDistinct(pool, n, rng) {
  const a = pool.slice();
  const out = [];
  for (let k = 0; k < n && a.length; k++) out.push(a.splice(Math.floor(rng() * a.length), 1)[0]);
  return out;
}

/* Ein Shop-Angebot ziehen (Spec §5): pro Kategorie SHOP_ITEMS_PER_CATEGORY normale Items, dann
   Cheap-Garantie (§5.6) und höchstens EINE legendäre Ersetzung (§5.7). Deterministisch über den
   injizierten rng. Leere/zu kleine Pools → entsprechend weniger Angebote. `itemDefs` wird injiziert
   (Engine: SHOP_ITEM_DEFS; Tests: Fixtures). Rückgabe: Array von Angebots-Instanzen mit stabiler offerId. */
export function buildShopOffer(itemDefs, shop = {}, rng = Math.random) {
  const all = Object.values(itemDefs || {});
  if (all.length === 0) return [];
  const avail = all.filter((d) => isItemAvailable(d, shop));
  const byCat = {};
  for (const d of avail) (byCat[d.category] = byCat[d.category] || []).push(d);

  let counter = 0;
  const mk = (d) => ({ offerId: `o${counter++}`, itemId: d.id, category: d.category, tier: d.tier, price: priceOf(d.tier), legendary: !!d.legendary });

  const offers = [];
  for (const cat of C.SHOP_CATEGORIES) {
    const normals = (byCat[cat] || []).filter((d) => !d.legendary);
    for (const d of drawDistinct(normals, C.SHOP_ITEMS_PER_CATEGORY, rng)) offers.push(mk(d));
  }
  if (offers.length === 0) return offers;

  // Cheap-Garantie (§5.6): fehlt ein günstiges Item, ein normales Angebot deterministisch durch ein
  // zufällig gezogenes günstiges ersetzen.
  if (!offers.some((o) => o.tier === "cheap")) {
    const cheapPool = avail.filter((d) => !d.legendary && d.tier === "cheap");
    if (cheapPool.length) {
      const repl = cheapPool[Math.floor(rng() * cheapPool.length)];
      offers[Math.floor(rng() * offers.length)] = mk(repl);
    }
  }

  // Legendäre Ersetzung (§5.7): einmal je Shop würfeln; bei Erfolg eine Kategorie mit verfügbarem
  // Legendär wählen und eines ihrer Angebote ersetzen. Höchstens EIN Legendär pro Shop.
  if (rng() < C.SHOP_LEGENDARY_CHANCE) {
    const legByCat = {};
    for (const d of avail) if (d.legendary) (legByCat[d.category] = legByCat[d.category] || []).push(d);
    const cats = C.SHOP_CATEGORIES.filter((c) => legByCat[c] && offers.some((o) => o.category === c));
    if (cats.length) {
      const cat = cats[Math.floor(rng() * cats.length)];
      const leg = legByCat[cat][Math.floor(rng() * legByCat[cat].length)];
      const slots = offers.map((o, i) => (o.category === cat ? i : -1)).filter((i) => i >= 0);
      offers[slots[Math.floor(rng() * slots.length)]] = mk(leg);
    }
  }
  return offers;
}
