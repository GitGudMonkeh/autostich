import * as C from "./constants.js";
import { SEGMENT_SIZE, FORMATION_TYPE_LABELS } from "./formations.js";
import { TIERS, TIER_WEIGHTS, priceOfTier } from "./rarity.js";
import { SHOP_FAMILY_DEFS, timeSegmentDepth } from "./shopFamilies.js";

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

/* ---- Shop-Positionsanker (Shop-Spec §8) — an der Deckposition (0–39), nicht an card.id. ---- */
// Anker-Typ auf einer Position (max 1 Anker je Position) bzw. ob die Position belegt ist.
export const anchorTypeAt   = (anchors, pos) => (anchors || []).find((a) => a.position === pos)?.type || null;
// Ganzer Anker-Eintrag auf einer Position ({ type, position, tier, familyId }) — Engine/formations lesen die Stufe (#164).
export const anchorAt       = (anchors, pos) => (anchors || []).find((a) => a.position === pos) || null;
export const positionOccupied = (anchors, pos) => (anchors || []).some((a) => a.position === pos);
// F4 Farballianz (#125): Partner-Farbe (Suit-Key) einer Farbe, wenn eine Allianz aktiv ist — sonst null.
// Rein für die UI (diagonaler Zweifarben-Split); ändert keine Regel.
export const linkedPartnerOf = (pe, suit) => {
  const lc = (pe && pe.linkedColors) || [];
  if (lc.length !== 2) return null;
  if (suit === lc[0]) return lc[1];
  if (suit === lc[1]) return lc[0];
  return null;
};

/* Konkrete Shop-Items (Anker/Formationen/Planung — Kategorie `cards` ist zu Shop-FAMILIEN migriert, #164;
   die flachen K-Items sind entfernt, siehe src/game/shopFamilies.js SHOP_FAMILY_DEFS).
   `target` = Ziel-Bedarf für den Target-Flow. apply(state, target, rng) -> Patch. */
export const SHOP_ITEM_DEFS = {
  // ---- Anker (Shop-Spec §8) — Kategorie KOMPLETT zu Shop-FAMILIEN migriert (#164): die Positions-Anker A1–A6 und
  //      das Zeitsegment A-L1 sind entfernt (shopFamilies.js SHOP_ANCHOR_FAMILIES). Der Anker-Eintrag in shop.anchors
  //      trägt jetzt zusätzlich `tier` (Stärke) + `familyId`; das Zeitsegment setzt shop.timeSegmentIndex + …Tier. ----

  // ---- Formationen (Shop-Spec §9) — KOMPLETT zu Shop-FAMILIEN migriert (#164, shopFamilies.js
  //      SHOP_FORMATION_FAMILIES; sie setzen tier-abhängige permEffects bzw. lösen Ziele dorthin auf). ----

  // ---- Planung (Shop-Spec §10) — KOMPLETT zu Shop-FAMILIEN migriert (#164, shopFamilies.js SHOP_PLANNING_FAMILIES:
  //      Perk-/Skill-Neuwurf, Legendensuche, Schicksalskontrolle, Warenwechsel, Reservierung). ----
  // ⇒ SHOP_ITEM_DEFS ist damit LEER: alle vier Shop-Kategorien werden aus SHOP_FAMILY_DEFS bespielt.
};

// Legendär-Chance (Shop-Spec §10 P5/P6): Basis + additiver Bonus (bis Cap), für den expliziten Legendär-Roll
// in buildOffer/buildSkillOffer. Ohne P5/P6-Käufe = reine Basis.
export const perkLegendaryChance  = (shop = {}) => C.PERK_LEGENDARY_BASE  + Math.min(shop.perkLegendaryBonus  || 0, C.MAX_LEGENDARY_CHANCE_BONUS);
export const skillLegendaryChance = (shop = {}) => C.SKILL_LEGENDARY_BASE + Math.min(shop.skillLegendaryBonus || 0, C.MAX_LEGENDARY_CHANCE_BONUS);
// Kostenloser Neuwurf je Perk-/Skill-Auswahl (#164): Schicksalskontrolle IV (fateControl, beide) ODER die
// typ-spezifische Regel (perkFreeReroll aus Perk-Neuwurf IV / Schicksalskontrolle III; skillFreeReroll aus Skill-Neuwurf IV).
export const perkFateReroll  = (shop = {}) => !!(shop.fateControl || shop.perkFreeReroll);
export const skillFateReroll = (shop = {}) => !!(shop.fateControl || shop.skillFreeReroll);

// Aktive dauerhafte Shop-Verbesserungen als Label-Liste (Chronik-Übersicht, §S6 Politur). Rein & anzeige-orientiert:
// leitet die aktiven permanenten Regeländerungen (§9) + Anker-Legendäre + Planungs-Boni aus dem Shop-State ab.
export function activeShopUpgrades(shop = {}) {
  const pe = shop.permanentEffects || {};
  const pp = (x) => `+${Math.round(x * 100)} pp`;
  const out = [];
  if (pe.descendingStraights) out.push("Abstieg");                                                       // F1
  if (pe.switchMinDifference != null && pe.switchMinDifference < 4) out.push("Enger Wechsel");            // F2
  if (pe.repetitionSecondFactorBonus > 0) out.push("Verstärkte Wiederholung");                            // F3
  if ((pe.linkedColors || []).length === 2) out.push(`Farballianz ${pe.linkedColors.join("+")}`);         // F4
  if ((pe.openSegmentBoundaries || []).length) out.push(`Offene Grenze ×${pe.openSegmentBoundaries.length}`); // F5
  if (pe.formationAfterglow) out.push("Nachhall");                                                        // F6
  if (pe.formationCoreType) out.push(`Formationskern: ${FORMATION_TYPE_LABELS[pe.formationCoreType] || pe.formationCoreType}`); // F-L1
  if (shop.timeSegmentIndex != null) out.push(`Zeitsegment ${shop.timeSegmentIndex + 1}`);                // A-L1
  if (shop.fateControl) out.push("Schicksalskontrolle");                                                  // Schicksalskontrolle IV
  if (shop.perkFreeReroll && !shop.fateControl) out.push("Perk-Gratis-Neuwurf");                          // #164 Perk-Neuwurf IV / Schicksalskontrolle III
  if (shop.skillFreeReroll && !shop.fateControl) out.push("Skill-Gratis-Neuwurf");                        // #164 Skill-Neuwurf IV
  if (shop.perkLegendaryBonus > 0) out.push(`Perk-Legendär ${pp(shop.perkLegendaryBonus)}`);              // P5
  if (shop.skillLegendaryBonus > 0) out.push(`Skill-Legendär ${pp(shop.skillLegendaryBonus)}`);           // P6
  return out;
}

/* ---- Zeitsegment (Shop-Spec §8 A-L1) — Spielreihenfolge der Positionen eines Durchlaufs. ---- */
// Ohne Zeitsegment: 0..tricks-1. Mit Zeitsegment wird das gewählte Segment (5 Positionen) DIREKT nach seinem
// ersten Spielen ein zweites Mal eingefügt → tricks+5 Stiche. Positionsgebundene Effekte nutzen die zurückgegebene
// Deckposition (Wiederholung „zählt erneut", Spec §8). Rein & deterministisch.
export function playSequence(timeSegIdx, tricks = C.TRICKS_PER_CYCLE, segSize = SEGMENT_SIZE, depth = segSize) {
  const seq = Array.from({ length: tricks }, (_, p) => p);
  if (timeSegIdx == null) return seq;
  const start = timeSegIdx * segSize, end = Math.min(start + segSize, tricks);
  const d = Math.min(depth, end - start); // #164: nur die LETZTEN `depth` Segmentkarten wiederholen (Stufe I=1 … III/IV=5)
  seq.splice(end, 0, ...Array.from({ length: d }, (_, k) => end - d + k)); // Wiederholung nach der letzten Segmentposition
  return seq;
}
// Stichzahl eines Durchlaufs je Build: 40, mit Zeitsegment +Wiederholungstiefe (Stufe I=+1 … III/IV=+5).
export const cycleLenFor = (shop) => C.TRICKS_PER_CYCLE + (shop && shop.timeSegmentIndex != null ? timeSegmentDepth(shop.timeSegmentTier) : 0);

// Preis einer Stufe (Spec §5.5) — nur vier feste Preise.
export const priceOf = (tier) => C.SHOP_PRICE[tier] ?? 0;

// Schließbare Segmentgrenzen (Shop F5): Position k, an der ein Segment endet (Grenze zwischen k und k+1),
// also 4,9,…,34 (= 5|6 … 35|36). Die Deckgrenze bei 39 zählt nicht. Abgeleitet → kein Drift.
export const SEGMENT_BOUNDARIES = Array.from({ length: C.TRICKS_PER_CYCLE / SEGMENT_SIZE - 1 }, (_, i) => (i + 1) * SEGMENT_SIZE - 1);

// Frischer Shop-Substate bei Run-Beginn. Felder für spätere Phasen sind schon angelegt (Defaults inert),
// damit das State-Shape stabil bleibt und keine Phase es später umbauen muss.
// Kauf-Log-Eintrag (#127) — reine Anzeige-Daten, append-only. target=null bei Sofort-Items, sonst der
// aufgelöste Ziel-Deskriptor (Position/Segment/Farbpaar/Grenze/Formationstyp/Kategorie/Karten). Pur.
export const purchaseLogEntry = (def, price, cycle, target = null) =>
  ({ itemId: def.id, category: def.category, tier: def.tier, price, cycle, target });
// #164: Kauf-Log-Eintrag einer Shop-Familie — `tier` ist die numerische Zielstufe (1–4), `family` markiert ihn
// für die familienbewusste Anzeige (ChronikOverview). itemId = familyId (Name-Auflösung über SHOP_FAMILY_DEFS).
export const familyPurchaseLogEntry = (familyId, category, tier, price, cycle, target = null) =>
  ({ itemId: familyId, category, tier, price, cycle, target, family: true });

export function initialShop() {
  return {
    coins: C.STARTING_COINS,        // §3: globaler Run-State, kein Cap, nie negativ
    familyTiers: {},                // #164: Rang je Shop-Familie { [familyId]: 1|2|3|4 } (Angebotsfilter; getrennt von den Perk-Familien)
    purchaseLog: [],                // #127: run-langes Kauf-Protokoll (append-only, reine Anzeige)
    offers: null,                   // aktuelles Shop-Angebot (Array von Angebots-Instanzen) oder null außerhalb des Shops
    purchasedOfferIds: [],          // in DIESEM Shop gekaufte Angebots-Instanzen (offerId)
    boughtLegendaryIds: [],         // §5.7: pro Run einmalig gekaufte Legendäre (nie wieder)
    boughtNonRepeatableIds: [],     // §15: gekaufte nicht-wiederholbare Items (nie wieder angeboten)
    reservedItem: null,             // P4: reserviertes Item fürs nächste Angebot
    perkRerolls: 0, skillRerolls: 0, // P1/P2: gespeicherte Neuwürfe
    fateControl: false,             // Schicksalskontrolle IV: je Perk-/Skill-Auswahl ein kostenloser Neuwurf
    perkFreeReroll: false, skillFreeReroll: false, // #164: typ-spezifischer Gratis-Neuwurf (Perk-/Skill-Neuwurf IV, Schicksalskontrolle III)
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
    timeSegmentIndex: null,         // Zeitsegment (#164): gewähltes Segment
    timeSegmentTier: null,          // Zeitsegment-Stufe (Wiederholungstiefe/-tiefe der Effekte)
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

/* ---- Shop-Familien (Shop-Spec §4.1, #164) — Angebots-/Reroll-Ziehung analog zu den flachen Items, aber als
        {familyId, famTier}-Angebote (Preis/Farbe richten sich nach der Zielstufe). Eine Kategorie ist
        „familiengetrieben", sobald `familyDefs` Familien mit dieser Kategorie enthält (Default {} → rein flach
        wie bisher, damit bestehende Aufrufe/Fixtures unverändert bleiben). ---- */
const familyCatsOf = (familyDefs) => new Set(Object.values(familyDefs || {}).map((f) => f.cat));
// Anbietbare Stufen einer Shop-Familie beim Rang `cur`: alle echt darüber (§4.1). Ist die Familie abgeschlossen
// (IV erreicht) UND wiederholbar (nur Karten-Familien, Nutzer-Entscheid #164), bleibt IV im Pool (Nachkauf).
function offerableFamilyTiers(fam, cur) {
  const base = TIERS.filter((t) => t > (cur || 0));
  return base.length ? base : (fam && fam.repeatable ? [4] : []);
}
// `n` verschiedene Familien einer Kategorie ziehen (gewichtet nach TIER_WEIGHTS[tier]; eine Familie höchstens
// einmal je Angebot, §2.1). `exclude` = bereits präsente Familien-IDs (Reroll). `mk(familyId, tier)` baut das Angebot.
function drawFamilyOffers(cat, familyDefs, familyTiers, rng, n, mk, exclude) {
  const skip = exclude || new Set();
  let pool = [];
  for (const fam of Object.values(familyDefs || {})) {
    if (fam.cat !== cat || skip.has(fam.id)) continue;
    for (const t of offerableFamilyTiers(fam, (familyTiers || {})[fam.id] || 0))
      pool.push({ id: fam.id, tier: t, weight: TIER_WEIGHTS[t] || 0 });
  }
  const out = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((a, x) => a + x.weight, 0);
    if (total <= 0) break;
    let r = rng() * total, i = 0;
    while (i < pool.length - 1 && r >= pool[i].weight) { r -= pool[i].weight; i += 1; }
    const pick = pool[i];
    out.push(mk(pick.id, pick.tier));
    pool = pool.filter((x) => x.id !== pick.id); // eine Familie höchstens einmal je Angebot
  }
  return out;
}

/* Ein Shop-Angebot ziehen (Spec §5): pro Kategorie SHOP_ITEMS_PER_CATEGORY normale Items, dann
   Cheap-Garantie (§5.6) und höchstens EINE legendäre Ersetzung (§5.7). Deterministisch über den
   injizierten rng. Leere/zu kleine Pools → entsprechend weniger Angebote. `itemDefs` wird injiziert
   (Engine: SHOP_ITEM_DEFS; Tests: Fixtures). Rückgabe: Array von Angebots-Instanzen mit stabiler offerId. */
export function buildShopOffer(itemDefs, shop = {}, rng = Math.random, perks = [], familyDefs = {}) {
  const famCats = familyCatsOf(familyDefs);
  const all = Object.values(itemDefs || {});
  const avail = all.filter((d) => isItemAvailable(d, shop, perks));
  const byCat = {};
  for (const d of avail) if (!famCats.has(d.category)) (byCat[d.category] = byCat[d.category] || []).push(d); // familiengetriebene Kategorien nicht aus flachen Items

  let counter = 0;
  const mk = (d) => ({ offerId: `o${counter++}`, itemId: d.id, category: d.category, tier: d.tier, price: priceOf(d.tier), legendary: !!d.legendary });
  const mkFam = (cat) => (familyId, famTier) => ({ offerId: `o${counter++}`, category: cat, familyId, famTier, price: priceOfTier(famTier), family: true, legendary: false });

  const offers = [];
  for (const cat of C.SHOP_CATEGORIES) {
    if (famCats.has(cat)) offers.push(...drawFamilyOffers(cat, familyDefs, shop.familyTiers, rng, C.SHOP_ITEMS_PER_CATEGORY, mkFam(cat)));
    else { const normals = (byCat[cat] || []).filter((d) => !d.legendary); for (const d of drawDistinct(normals, C.SHOP_ITEMS_PER_CATEGORY, rng)) offers.push(mk(d)); }
  }
  if (offers.length === 0) return offers;

  // Legendäre Ersetzung (§5.7) ZUERST (max 1): einmal je Shop würfeln; bei Erfolg eine Kategorie mit
  // verfügbarem Legendär wählen und eines ihrer Angebote ersetzen. Vor der Cheap-Garantie, damit diese
  // danach nicht wieder überschrieben werden kann (sonst könnte ein Shop ohne günstiges Item enden).
  // Familien-Kategorien haben keine Legendäre (Legendäre sind dort in Stufe IV aufgegangen) → nur flache Kategorien.
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

  // Cheap-Garantie (§5.6) ZULETZT: fehlt ein günstiges Angebot (Preis 8 — flache Stufe „cheap" ODER Familien-Stufe I),
  // ein NICHT-legendäres, NICHT-Familien-Angebot deterministisch durch ein günstiges FLACHES Item ersetzen (das
  // gesetzte Legendär und die Familien-Karten bleiben so erhalten).
  if (!offers.some((o) => o.price === C.SHOP_PRICE.cheap)) {
    const cheapPool = avail.filter((d) => !d.legendary && d.tier === "cheap" && !famCats.has(d.category));
    const slots = offers.map((o, i) => (o.legendary || o.family ? -1 : i)).filter((i) => i >= 0);
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
export function rerollCategory(shop = {}, category, itemDefs = {}, rng = Math.random, perks = [], excludeItemId = null, familyDefs = {}) {
  const offers = shop.offers || [];
  const purchased = new Set(shop.purchasedOfferIds || []);
  const kept = offers.filter((o) => o.category !== category || purchased.has(o.offerId) || o.itemId === excludeItemId);
  const keptInCat = kept.filter((o) => o.category === category).length;
  const need = C.SHOP_ITEMS_PER_CATEGORY - keptInCat;
  if (need <= 0) return shop;                                // in dieser Kategorie ist nichts zu würfeln
  const used = new Set(offers.map((o) => o.offerId));        // neue offerIds kollidieren nicht mit bestehenden
  let n = 0;
  const nextId = () => { let id; do { id = `o${n++}`; } while (used.has(id)); used.add(id); return id; };
  // Familiengetriebene Kategorie (#164): Familien-Angebote neu ziehen, bereits präsente Familien ausschließen.
  if (familyCatsOf(familyDefs).has(category)) {
    const present = new Set(kept.filter((o) => o.category === category && o.family).map((o) => o.familyId));
    const drawn = drawFamilyOffers(category, familyDefs, shop.familyTiers, rng, need,
      (familyId, famTier) => ({ offerId: nextId(), category, familyId, famTier, price: priceOfTier(famTier), family: true, legendary: false }), present);
    return { ...shop, offers: [...kept, ...drawn] };
  }
  const presentIds = new Set(kept.map((o) => o.itemId));
  const legElsewhere = kept.some((o) => o.legendary);        // ein Legendär bleibt woanders → hier keins (§5.7)
  const pool = Object.values(itemDefs).filter((d) => d.category === category && d.id !== excludeItemId
    && !presentIds.has(d.id) && isItemAvailable(d, shop, perks));
  const normals = pool.filter((d) => !d.legendary);
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
export function withReservedOffer(shop = {}, itemDefs = {}, perks = [], familyDefs = {}) {
  const reserved = shop.reservedItem;
  if (!reserved) return shop;
  const offers = shop.offers || [];
  const used = new Set(offers.map((o) => o.offerId));
  let id = "oRes", k = 0; while (used.has(id)) id = `oRes${k++}`;
  let extra = [];
  if (reserved.family) { // #164: reservierte Shop-Familie — nur anhängen, solange die Zielstufe noch anbietbar ist.
    const fam = familyDefs[reserved.familyId];
    if (fam && offerableFamilyTiers(fam, (shop.familyTiers || {})[reserved.familyId] || 0).includes(reserved.famTier))
      extra = [{ offerId: id, category: reserved.category, familyId: reserved.familyId, famTier: reserved.famTier, price: reserved.price, family: true, legendary: false, reserved: true }];
  } else {
    const def = itemDefs[reserved.itemId];
    if (def && isItemAvailable(def, shop, perks))
      extra = [{ offerId: id, itemId: reserved.itemId, category: reserved.category, tier: reserved.tier, price: reserved.price, legendary: !!reserved.legendary, reserved: true }];
  }
  // #164 Reservierung: `shopsLeft` = für wie viele weitere Shops die Reservierung bestehen bleibt (Stufe I–IV = 1–4).
  // Nach dem Anhängen herunterzählen; bei >1 bleibt sie für den nächsten Shop erhalten, sonst verfällt sie.
  const left = (reserved.shopsLeft || 1) - 1;
  const nextReserved = extra.length && left > 0 ? { ...reserved, shopsLeft: left } : null;
  return { ...shop, offers: [...offers, ...extra], reservedItem: nextReserved };
}
