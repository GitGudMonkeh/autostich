// Shop-Kaufpolitik (Sim S4). Schließt die Baseline-Lücke „Ziel-Items werden ignoriert": kauft auch
// Items MIT Zielauswahl, indem es die `shopTarget`-Felder gemäß `def.target`-Spec deterministisch füllt
// und bestätigt. Ein Schritt pro Aufruf (der Treiber ruft wiederholt).
//
// Terminierung: `shopStep` kauft ein Ziel-Item nur, wenn es NACHWEISLICH abschließbar ist (`canComplete`
// simuliert den Ziel-Fluss per Reducer-Orakel — rng-frei, determinismus-sicher). So gibt es keine
// Kauf→Abbruch→Kauf-Schleife bei unerfüllbaren Zielen (z. B. keine freie Position mehr).
import { reducer } from "../src/game/reducer.js";
import { SHOP_ITEM_DEFS, positionOccupied, SEGMENT_BOUNDARIES } from "../src/game/shop.js";
import { FORMATION_TYPES } from "../src/game/formations.js";
import { SUIT_ORDER, SHOP_CATEGORIES } from "../src/game/constants.js";

// Nächster Ziel-Füllschritt für die shop-target-Phase (feste Reihenfolge). Gibt eine SHOP_TARGET_*-Action,
// SHOP_TARGET_CONFIRM (alles gefüllt) oder SHOP_TARGET_CANCEL (unerfüllbar) zurück.
export function shopTargetStep(s) {
  const st = s.shopTarget;
  const spec = SHOP_ITEM_DEFS[st.itemId]?.target || {};

  if (spec.cards && st.cards.length < spec.cards) {
    const chosen = new Set(st.cards);
    const next = s.deck.find((c) => !chosen.has(c.id));
    return next ? { type: "SHOP_TARGET_CARD", cardId: next.id } : { type: "SHOP_TARGET_CANCEL" };
  }
  if (spec.color) {
    const missing = st.cards.find((id) => !st.colors[id]);
    if (missing) {
      const card = s.deck.find((c) => c.id === missing);
      return { type: "SHOP_TARGET_COLOR", cardId: missing, color: SUIT_ORDER.find((su) => su !== card.suit) };
    }
  }
  if (spec.segment && st.segment == null) return { type: "SHOP_TARGET_SEGMENT", segment: 0 };
  if (spec.position && st.position == null) {
    let p = -1;
    for (let k = 0; k < s.playerOrder.length; k++) if (!positionOccupied(s.shop?.anchors, k)) { p = k; break; }
    return p < 0 ? { type: "SHOP_TARGET_CANCEL" } : { type: "SHOP_TARGET_POSITION", position: p };
  }
  if (spec.colorPair && (st.colorPair || []).length < 2) {
    const pair = st.colorPair || [];
    return { type: "SHOP_TARGET_COLOR_PAIR", color: SUIT_ORDER.find((su) => !pair.includes(su)) };
  }
  if (spec.boundary && st.boundary == null) {
    const open = new Set(s.shop?.permanentEffects?.openSegmentBoundaries || []);
    const b = SEGMENT_BOUNDARIES.find((x) => !open.has(x));
    return b == null ? { type: "SHOP_TARGET_CANCEL" } : { type: "SHOP_TARGET_BOUNDARY", boundary: b };
  }
  if (spec.formationType && st.formationType == null) return { type: "SHOP_TARGET_FORMATION_TYPE", formationType: FORMATION_TYPES[0] };
  if (spec.category && st.category == null) return { type: "SHOP_TARGET_CATEGORY", category: SHOP_CATEGORIES[0] };
  if (spec.offer && st.targetOfferId == null) {
    const purchased = new Set(s.shop?.purchasedOfferIds || []);
    const other = (s.shop?.offers || []).find((o) => o.offerId !== st.offerId && !purchased.has(o.offerId));
    return other ? { type: "SHOP_TARGET_OFFER", offerId: other.offerId } : { type: "SHOP_TARGET_CANCEL" };
  }
  return { type: "SHOP_TARGET_CONFIRM" };
}

// Kann dieses Ziel-Item vollständig gefüllt werden? Simuliert BUY_ITEM → shopTargetStep… bis CONFIRM/CANCEL.
function canComplete(s, offer) {
  let t = reducer(s, { type: "BUY_ITEM", offerId: offer.offerId }); // Ziel-Item: rng-frei, geht in shop-target
  if (t.phase !== "shop-target") return false;
  for (let guard = 0; guard < 200; guard++) {
    const a = shopTargetStep(t);
    if (a.type === "SHOP_TARGET_CONFIRM") return true;
    if (a.type === "SHOP_TARGET_CANCEL") return false;
    const nt = reducer(t, a);
    if (nt === t) return false;
    t = nt;
  }
  return false;
}

// Shop-Phase: erstes bezahlbares, abschließbares Angebot kaufen (Sofort- ODER Ziel-Item), sonst verlassen.
export function shopStep(s, rng) {
  const shop = s.shop || {};
  const purchased = new Set(shop.purchasedOfferIds || []);
  const coins = shop.coins || 0;
  for (const o of shop.offers || []) {
    if (purchased.has(o.offerId) || coins < o.price) continue;
    const def = SHOP_ITEM_DEFS[o.itemId];
    if (!def?.target) return { type: "BUY_ITEM", offerId: o.offerId, rng }; // Sofort-Item
    if (canComplete(s, o)) return { type: "BUY_ITEM", offerId: o.offerId, rng }; // abschließbares Ziel-Item
  }
  return { type: "LEAVE_SHOP" };
}
