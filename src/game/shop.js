import * as C from "./constants.js";
import { SEGMENT_SIZE } from "./formations.js";

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

/* ---- Deck-Helfer für Kartenitems (S2) — immutabel, alle Marker bleiben an card.id. ---- */
const bumpCards = (deck, ids, delta) => deck.map((c) => (ids.includes(c.id) ? { ...c, value: c.value + delta } : c));
const recolor   = (deck, colors) => deck.map((c) => (colors[c.id] ? { ...c, suit: colors[c.id] } : c));
function swapPair(deck, ids, key) { // Werte- bzw. Farb-Tausch zweier Karten (K3/K4)
  const [a, b] = ids;
  const ca = deck.find((c) => c.id === a), cb = deck.find((c) => c.id === b);
  if (!ca || !cb || a === b) return deck;
  return deck.map((c) => (c.id === a ? { ...c, [key]: cb[key] } : c.id === b ? { ...c, [key]: ca[key] } : c));
}
// Segmentveredelung (K-L1): Karten auf den Positionen des Segments (aktuelle Reihenfolge) +delta — an card.id,
// wandert also bei späterer Umordnung mit der Karte mit (Spec §7 K-L1).
function segmentBump(deck, order, segIndex, delta) {
  const start = segIndex * SEGMENT_SIZE, ids = new Set();
  for (let k = start; k < start + SEGMENT_SIZE && k < order.length; k++) ids.add(deck[order[k]].id);
  return deck.map((c) => (ids.has(c.id) ? { ...c, value: c.value + delta } : c));
}

/* Konkrete Shop-Items (Shop-Spec §7 Kartenitems; Anker/Formationen/Planung folgen S3–S5).
   `target` = Ziel-Bedarf für den Target-Flow: { cards?: N, color?: bool (Farbe je gewählter Karte), segment?: bool }.
   apply(state, target, rng) -> Patch (hier stets { deck }); target = { cardIds, colors: { id: suit }, segment }. */
export const SHOP_ITEM_DEFS = {
  K1:  { id: "K1", category: "cards", name: "Feinschliff", tier: "cheap", repeatable: true,
         targetMode: "single-card", target: { cards: 1 },
         description: "Wähle eine Karte. Sie erhält dauerhaft +1 Wert.",
         apply: (s, t) => ({ deck: bumpCards(s.deck, t.cardIds, 1) }) },
  K2:  { id: "K2", category: "cards", name: "Umlackierung", tier: "cheap", repeatable: true,
         targetMode: "card-and-new-color", target: { cards: 1, color: true },
         description: "Wähle eine Karte und eine der drei anderen Farben. Die Karte erhält dauerhaft diese Farbe.",
         apply: (s, t) => ({ deck: recolor(s.deck, t.colors) }) },
  K3:  { id: "K3", category: "cards", name: "Werttausch", tier: "cheap", repeatable: true,
         targetMode: "two-distinct-cards", target: { cards: 2 },
         description: "Wähle zwei Karten. Sie tauschen ihre aktuellen Dauerwerte.",
         apply: (s, t) => ({ deck: swapPair(s.deck, t.cardIds, "value") }) },
  K4:  { id: "K4", category: "cards", name: "Farbtausch", tier: "cheap", repeatable: true,
         targetMode: "two-distinct-cards", target: { cards: 2 },
         description: "Wähle zwei Karten. Sie tauschen ihre Farben.",
         apply: (s, t) => ({ deck: swapPair(s.deck, t.cardIds, "suit") }) },
  K5:  { id: "K5", category: "cards", name: "Verstärkung", tier: "strong", repeatable: true,
         targetMode: "single-card", target: { cards: 1 },
         description: "Wähle eine Karte. Sie erhält dauerhaft +2 Wert.",
         apply: (s, t) => ({ deck: bumpCards(s.deck, t.cardIds, 2) }) },
  K6:  { id: "K6", category: "cards", name: "Doppelter Feinschliff", tier: "strong", repeatable: true,
         targetMode: "two-distinct-cards", target: { cards: 2 },
         description: "Wähle zwei Karten. Beide erhalten dauerhaft +1 Wert.",
         apply: (s, t) => ({ deck: bumpCards(s.deck, t.cardIds, 1) }) },
  K7:  { id: "K7", category: "cards", name: "Farbduo", tier: "strong", repeatable: true,
         targetMode: "two-cards-and-colors", target: { cards: 2, color: true },
         description: "Wähle zwei Karten und lege für jede eine neue Farbe fest (dieselbe erlaubt).",
         apply: (s, t) => ({ deck: recolor(s.deck, t.colors) }) },
  K8:  { id: "K8", category: "cards", name: "Meisterstück", tier: "premium", repeatable: true,
         targetMode: "single-card", target: { cards: 1 },
         description: "Wähle eine Karte. Sie erhält dauerhaft +3 Wert.",
         apply: (s, t) => ({ deck: bumpCards(s.deck, t.cardIds, 3) }) },
  K9:  { id: "K9", category: "cards", name: "Dreifacher Feinschliff", tier: "premium", repeatable: true,
         targetMode: "three-distinct-cards", target: { cards: 3 },
         description: "Wähle drei Karten. Alle erhalten dauerhaft +1 Wert.",
         apply: (s, t) => ({ deck: bumpCards(s.deck, t.cardIds, 1) }) },
  K10: { id: "K10", category: "cards", name: "Farbtrio", tier: "premium", repeatable: true,
         targetMode: "three-cards-and-colors", target: { cards: 3, color: true },
         description: "Wähle drei Karten und lege für jede eine neue Farbe fest.",
         apply: (s, t) => ({ deck: recolor(s.deck, t.colors) }) },
  "K-L1": { id: "K-L1", category: "cards", name: "Segmentveredelung", tier: "legendary", legendary: true, repeatable: false,
         targetMode: "segment", target: { segment: true },
         description: "Wähle eines der acht Segmente. Alle fünf Karten dieses Segments erhalten dauerhaft +1 Wert (bleibt an den Karten).",
         apply: (s, t) => ({ deck: segmentBump(s.deck, s.playerOrder, t.segment, 1) }) },
};

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

  // Legendäre Ersetzung (§5.7) ZUERST (max 1): einmal je Shop würfeln; bei Erfolg eine Kategorie mit
  // verfügbarem Legendär wählen und eines ihrer Angebote ersetzen. Vor der Cheap-Garantie, damit diese
  // danach nicht wieder überschrieben werden kann (sonst könnte ein Shop ohne günstiges Item enden).
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

  // Cheap-Garantie (§5.6) ZULETZT: fehlt ein günstiges Item, ein NICHT-legendäres Angebot deterministisch
  // durch ein zufällig gezogenes günstiges ersetzen (das gesetzte Legendär bleibt so erhalten).
  if (!offers.some((o) => o.tier === "cheap")) {
    const cheapPool = avail.filter((d) => !d.legendary && d.tier === "cheap");
    const slots = offers.map((o, i) => (o.legendary ? -1 : i)).filter((i) => i >= 0);
    if (cheapPool.length && slots.length) {
      const repl = cheapPool[Math.floor(rng() * cheapPool.length)];
      offers[slots[Math.floor(rng() * slots.length)]] = mk(repl);
    }
  }
  return offers;
}
