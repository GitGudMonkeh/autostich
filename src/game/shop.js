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

/* ---- Shop-Positionsanker (Shop-Spec §8) — an der Deckposition (0–39), nicht an card.id. ---- */
// Anker-Typ auf einer Position (max 1 Anker je Position) bzw. ob die Position belegt ist.
export const anchorTypeAt   = (anchors, pos) => (anchors || []).find((a) => a.position === pos)?.type || null;
export const positionOccupied = (anchors, pos) => (anchors || []).some((a) => a.position === pos);
// Einen Anker anlegen (immutabel) — der Reducer stellt sicher, dass die Position frei ist.
const addAnchor = (shop, type, position) => ({ ...shop, anchors: [...(shop.anchors || []), { type, position }] });
// Permanente Formations-Regeländerung setzen (Shop §9 F-Items).
const setPE = (shop, patch) => ({ ...shop, permanentEffects: { ...(shop.permanentEffects || {}), ...patch } });

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

  // ---- Anker (Shop-Spec §8) — Positionsanker; apply legt {type,position} in shop.anchors an. targetMode "position". ----
  A1: { id: "A1", category: "anchors", name: "Kraftanker", tier: "cheap", repeatable: true, anchorType: "power",
        targetMode: "position", target: { position: true },
        description: "Wähle eine Position. Die Karte auf dieser Position erhält im Stich +2 temporären Wert.",
        apply: (s, t) => ({ shop: addAnchor(s.shop, "power", t.position) }) },
  A2: { id: "A2", category: "anchors", name: "Punkteanker", tier: "cheap", repeatable: true, anchorType: "score",
        targetMode: "position", target: { position: true },
        description: "Wähle eine Position. Ein Sieg auf dieser Position gibt +150 Flat-Score.",
        apply: (s, t) => ({ shop: addAnchor(s.shop, "score", t.position) }) },
  A3: { id: "A3", category: "anchors", name: "Kritanker", tier: "strong", repeatable: true, anchorType: "crit",
        targetMode: "position", target: { position: true },
        description: "Wähle eine Position. Die Karte auf dieser Position erhält +15 Prozentpunkte Crit-Chance (nur dieser Stich).",
        apply: (s, t) => ({ shop: addAnchor(s.shop, "crit", t.position) }) },
  A4: { id: "A4", category: "anchors", name: "Serienanker", tier: "strong", repeatable: true, anchorType: "streak",
        targetMode: "position", target: { position: true },
        description: "Wähle eine Position. Ein Sieg auf dieser Position erhöht die Siegesserie um einen zusätzlichen Punkt.",
        apply: (s, t) => ({ shop: addAnchor(s.shop, "streak", t.position) }) },
  A5: { id: "A5", category: "anchors", name: "Formationsanker", tier: "premium", repeatable: true, anchorType: "formation",
        targetMode: "position", target: { position: true },
        description: "Wähle eine Position. Sie zählt als aktive Formation und gibt bei Sieg ×1,25 (stapelt nicht mit E7/E8).",
        apply: (s, t) => ({ shop: addAnchor(s.shop, "formation", t.position) }) },
  "A-L1": { id: "A-L1", category: "anchors", name: "Zeitsegment", tier: "legendary", legendary: true, repeatable: false,
        targetMode: "segment", target: { segment: true },
        description: "Wähle ein Segment. Nachdem seine fünf Karten gespielt wurden, wird das Segment sofort ein zweites Mal gespielt (Durchlauf = 45 Stiche).",
        apply: (s, t) => ({ shop: { ...s.shop, timeSegmentIndex: t.segment } }) },

  // ---- Formationen (Shop-Spec §9) — permanente Regeländerungen (kein Ziel, nicht wiederholbar). ----
  F1: { id: "F1", category: "formations", name: "Abstieg", tier: "cheap", repeatable: false,
        description: "Treppen dürfen streng steigend oder streng fallend verlaufen (innerhalb einer Formation ohne Richtungswechsel).",
        apply: (s) => ({ shop: setPE(s.shop, { descendingStraights: true }) }) },
  F2: { id: "F2", category: "formations", name: "Enger Wechsel", tier: "cheap", repeatable: false,
        description: "Die benötigte Nachbardifferenz für Wechsel sinkt von 4 auf 3.",
        apply: (s) => ({ shop: setPE(s.shop, { switchMinDifference: 3 }) }) },
  F3: { id: "F3", category: "formations", name: "Verstärkte Wiederholung", tier: "strong", repeatable: false,
        description: "Der Faktor der zweiten Karte einer Wiederholung steigt von ×1,30 auf ×1,40.",
        apply: (s) => ({ shop: setPE(s.shop, { repetitionSecondFactorBonus: 0.10 }) }) },
  F4: { id: "F4", category: "formations", name: "Farballianz", tier: "strong", repeatable: false,
        targetMode: "two-colors", target: { colorPair: true },
        description: "Wähle zwei Farben. Für Farbblöcke zählen diese beiden Farben als dieselbe Farbe.",
        apply: (s, t) => ({ shop: setPE(s.shop, { linkedColors: t.colorPair }) }) },
  F5: { id: "F5", category: "formations", name: "Offene Grenze", tier: "premium", repeatable: true,
        targetMode: "boundary", target: { boundary: true },
        description: "Wähle eine Segmentgrenze. Formationen dürfen diese Grenze überschreiten.",
        // Nur anbieten, solange E9 nicht alle Grenzen global öffnet UND noch eine Grenze geschlossen ist (§15).
        available: (shop, perks) => !(perks || []).includes("E9") && ((shop.permanentEffects?.openSegmentBoundaries || []).length < SEGMENT_BOUNDARIES.length),
        apply: (s, t) => ({ shop: setPE(s.shop, { openSegmentBoundaries: [...(s.shop.permanentEffects?.openSegmentBoundaries || []), t.boundary] }) }) },
  F6: { id: "F6", category: "formations", name: "Nachhall", tier: "premium", repeatable: false,
        description: "Endet eine Formation, erhält die direkt folgende Karte deren stärksten Einzelfaktor als eigene Formation (überschreitet Segmentgrenzen).",
        apply: (s) => ({ shop: setPE(s.shop, { formationAfterglow: true }) }) },
  "F-L1": { id: "F-L1", category: "formations", name: "Formationskern", tier: "legendary", legendary: true, repeatable: false,
        targetMode: "formation-type", target: { formationType: true },
        description: "Wähle einen Formationstyp. Jede aktive Formation dieses Typs (inkl. Nachhall) erhält zusätzlich ×1,50.",
        apply: (s, t) => ({ shop: setPE(s.shop, { formationCoreType: t.formationType }) }) },

  // ---- Planung (Shop-Spec §10) — Neuwürfe/Reservierung; kein Score-Effekt, wirkt auf Angebote/Auswahlen. ----
  P1: { id: "P1", category: "planning", name: "Perk-Neuwurf", tier: "cheap", repeatable: true,
        description: "Erhalte einen gespeicherten Neuwurf für eine zukünftige Perk-Auswahl.",
        apply: (s) => ({ shop: { ...s.shop, perkRerolls: (s.shop.perkRerolls || 0) + 1 } }) },
  P2: { id: "P2", category: "planning", name: "Skill-Neuwurf", tier: "cheap", repeatable: true,
        description: "Erhalte einen gespeicherten Neuwurf für eine zukünftige Skill-Auswahl.",
        apply: (s) => ({ shop: { ...s.shop, skillRerolls: (s.shop.skillRerolls || 0) + 1 } }) },
  P3: { id: "P3", category: "planning", name: "Warenwechsel", tier: "cheap", repeatable: true,
        targetMode: "category", target: { category: true },
        description: "Würfle eine Kategorie des aktuellen Shops einmal neu (nicht gekaufte Angebote werden ersetzt).",
        apply: (s, t, rng) => ({ shop: rerollCategory(s.shop, t.category, SHOP_ITEM_DEFS, rng, s.perks, "P3") }) },
  P4: { id: "P4", category: "planning", name: "Reservierung", tier: "strong", repeatable: true,
        targetMode: "offer", target: { offer: true },
        description: "Wähle ein anderes, noch nicht gekauftes Shop-Item. Es wird im nächsten Shop zusätzlich angeboten.",
        available: (shop) => !shop.reservedItem, // §10 P4: höchstens ein Item gleichzeitig reserviert
        apply: (s, t) => {
          const off = (s.shop.offers || []).find((o) => o.offerId === t.offerId);
          if (!off) return {};
          return { shop: { ...s.shop, reservedItem: { itemId: off.itemId, category: off.category, tier: off.tier, price: off.price, legendary: !!off.legendary } } };
        } },
  "P-L1": { id: "P-L1", category: "planning", name: "Schicksalskontrolle", tier: "legendary", legendary: true, repeatable: false,
        description: "Bei jeder zukünftigen Perk- und Skill-Auswahl darf das Angebot einmal kostenlos neu gewürfelt werden.",
        apply: (s) => ({ shop: { ...s.shop, fateControl: true } }) },
};

/* ---- Zeitsegment (Shop-Spec §8 A-L1) — Spielreihenfolge der Positionen eines Durchlaufs. ---- */
// Ohne Zeitsegment: 0..tricks-1. Mit Zeitsegment wird das gewählte Segment (5 Positionen) DIREKT nach seinem
// ersten Spielen ein zweites Mal eingefügt → tricks+5 Stiche. Positionsgebundene Effekte nutzen die zurückgegebene
// Deckposition (Wiederholung „zählt erneut", Spec §8). Rein & deterministisch.
export function playSequence(timeSegIdx, tricks = C.TRICKS_PER_CYCLE, segSize = SEGMENT_SIZE) {
  const seq = Array.from({ length: tricks }, (_, p) => p);
  if (timeSegIdx == null) return seq;
  const start = timeSegIdx * segSize, end = Math.min(start + segSize, tricks);
  seq.splice(end, 0, ...Array.from({ length: end - start }, (_, k) => start + k)); // Wiederholung nach der letzten Segmentposition
  return seq;
}
// Stichzahl eines Durchlaufs je Build: 40, mit Zeitsegment 45.
export const cycleLenFor = (shop) => C.TRICKS_PER_CYCLE + (shop && shop.timeSegmentIndex != null ? SEGMENT_SIZE : 0);

// Preis einer Stufe (Spec §5.5) — nur vier feste Preise.
export const priceOf = (tier) => C.SHOP_PRICE[tier] ?? 0;

// Schließbare Segmentgrenzen (Shop F5): Position k, an der ein Segment endet (Grenze zwischen k und k+1),
// also 4,9,…,34 (= 5|6 … 35|36). Die Deckgrenze bei 39 zählt nicht. Abgeleitet → kein Drift.
export const SEGMENT_BOUNDARIES = Array.from({ length: C.TRICKS_PER_CYCLE / SEGMENT_SIZE - 1 }, (_, i) => (i + 1) * SEGMENT_SIZE - 1);

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
    permanentEffects: {             // §9 F-Items: permanente Regeländerungen der Formationserkennung
      descendingStraights: false,       // F1: Treppen auch fallend
      switchMinDifference: 4,           // F2: Wechsel-Mindestdifferenz (→ 3)
      repetitionSecondFactorBonus: 0,   // F3: 2. Wiederholungskarte +0,10
      linkedColors: [],                 // F4: zwei Farben zählen als eine (Farbblock)
      openSegmentBoundaries: [],        // F5: geöffnete Segmentgrenzen
      formationAfterglow: false,        // F6: Nachhall
      formationCoreType: null,          // F-L1: Formationskern-Typ
    },
    anchors: [],                    // S3: Positionsanker (an Position, nicht card.id)
    timeSegmentIndex: null,         // A-L1: gewähltes Zeitsegment
  };
}

// Münzen je vollständig abgeschlossenem Durchlauf: konstante Basis (das Einkommen wirkt jetzt am Shop, nicht je Durchlauf).
export function coinsPerCycle() {
  return C.BASE_COINS_PER_CYCLE;
}
// Einkommensbonus, der beim Öffnen EINES Shops gutgeschrieben wird: +SHOP_INCOME_PER_LEVEL je Einkommen-Level. Nie negativ.
export const shopIncomeFor = (economyStatLevel = 0) => Math.max(0, economyStatLevel || 0) * C.SHOP_INCOME_PER_LEVEL;

// Kann der Spieler dieses Angebot bezahlen?
export const canAfford = (shop, offer) => !!offer && (shop?.coins || 0) >= offer.price;

// Pool-Filter (§15): ein Item ist verfügbar, solange ein gekauftes Legendär bzw. ein gekauftes
// nicht-wiederholbares Item nicht schon aus dem Pool geflogen ist. Weitere Filter (Cap/kein Ziel/
// Redundanz) kommen mit den jeweiligen Items in S3–S5 dazu.
export function isItemAvailable(def, shop = {}, perks = []) {
  if (!def) return false;
  if (def.legendary && (shop.boughtLegendaryIds || []).includes(def.id)) return false;
  if (def.repeatable === false && (shop.boughtNonRepeatableIds || []).includes(def.id)) return false;
  if (def.available && !def.available(shop, perks)) return false; // item-spezifisch (z. B. F5: Grenzen offen / E9 aktiv)
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
export function buildShopOffer(itemDefs, shop = {}, rng = Math.random, perks = []) {
  const all = Object.values(itemDefs || {});
  if (all.length === 0) return [];
  const avail = all.filter((d) => isItemAvailable(d, shop, perks));
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

/* Warenwechsel (Shop-Spec §10 P3): eine Kategorie des aktuellen Angebots neu würfeln. Behalten bleiben alle
   Angebote AUSSERHALB der Kategorie sowie in der Kategorie gekaufte Angebote (und `excludeItemId` = das gerade
   gekaufte Warenwechsel-Item selbst, das im Angebot als „gekauft" stehen bleibt und nicht erneut gezogen wird).
   Die restlichen Slots der Kategorie werden mit neuen gültigen Items aufgefüllt. Legendär-Regeln (§5.7): höchstens
   EIN Legendär im Shop — liegt bereits eines woanders, erscheint hier keins; die Cheap-Garantie wird NICHT erneut
   global erzwungen. Deterministisch über den injizierten rng. */
export function rerollCategory(shop = {}, category, itemDefs = {}, rng = Math.random, perks = [], excludeItemId = null) {
  const offers = shop.offers || [];
  const purchased = new Set(shop.purchasedOfferIds || []);
  const kept = offers.filter((o) => o.category !== category || purchased.has(o.offerId) || o.itemId === excludeItemId);
  const keptInCat = kept.filter((o) => o.category === category).length;
  const need = C.SHOP_ITEMS_PER_CATEGORY - keptInCat;
  if (need <= 0) return shop;                                // in dieser Kategorie ist nichts zu würfeln
  const presentIds = new Set(kept.map((o) => o.itemId));
  const legElsewhere = kept.some((o) => o.legendary);        // ein Legendär bleibt woanders → hier keins (§5.7)
  const pool = Object.values(itemDefs).filter((d) => d.category === category && d.id !== excludeItemId
    && !presentIds.has(d.id) && isItemAvailable(d, shop, perks));
  const normals = pool.filter((d) => !d.legendary);
  const used = new Set(offers.map((o) => o.offerId));        // neue offerIds kollidieren nicht mit bestehenden
  let n = 0;
  const nextId = () => { let id; do { id = `o${n++}`; } while (used.has(id)); used.add(id); return id; };
  const mk = (d) => ({ offerId: nextId(), itemId: d.id, category: d.category, tier: d.tier, price: priceOf(d.tier), legendary: !!d.legendary });
  const drawn = drawDistinct(normals, need, rng).map(mk);
  // Legendär-Ersetzung (§5.7) nur wenn erlaubt: einmal würfeln, einen neu gezogenen Normal-Slot ersetzen.
  if (!legElsewhere && drawn.length && rng() < C.SHOP_LEGENDARY_CHANCE) {
    const legs = pool.filter((d) => d.legendary);
    if (legs.length) drawn[Math.floor(rng() * drawn.length)] = mk(legs[Math.floor(rng() * legs.length)]);
  }
  return { ...shop, offers: [...kept, ...drawn] };
}

/* Reservierung einlösen (Shop-Spec §10 P4): hängt beim Öffnen eines Shops das im letzten Shop reservierte Item
   als zusätzliches Angebot in seiner Kategorie an (behält Preis & Identität) und LÖSCHT die Reservierung — sie
   verfällt mit diesem Shop, unabhängig davon, ob gekauft wird. Nur anhängen, wenn das Item generell noch verfügbar
   ist (z. B. nicht inzwischen als Legendär/nicht-wiederholbar vergriffen). */
export function withReservedOffer(shop = {}, itemDefs = {}, perks = []) {
  const reserved = shop.reservedItem;
  if (!reserved) return shop;
  const offers = shop.offers || [];
  const used = new Set(offers.map((o) => o.offerId));
  let id = "oRes", k = 0; while (used.has(id)) id = `oRes${k++}`;
  const def = itemDefs[reserved.itemId];
  const extra = def && isItemAvailable(def, shop, perks)
    ? [{ offerId: id, itemId: reserved.itemId, category: reserved.category, tier: reserved.tier, price: reserved.price, legendary: !!reserved.legendary, reserved: true }]
    : [];
  return { ...shop, offers: [...offers, ...extra], reservedItem: null };
}
