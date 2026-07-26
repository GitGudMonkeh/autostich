import { UPGRADE_TYPES, TIER_META, TIERS, romanOf, priceOfTier } from "./rarity.js";
import { shuffle } from "./deck.js";
import { SEGMENT_SIZE } from "./formations.js";

/* ============================================================
   SHOP-FAMILIEN-REGISTRY (Rarität-Umbau #164, Spec docs/rarity-system.md §4).
   Bisher flache Shop-Items (SHOP_ITEM_DEFS in shop.js) als aufwertbare FAMILIEN mit vier Stufen (I–IV) —
   analog zum Perk-Familien-Umbau (#163, families.js), aber im SHOP-Domänenmodell:
     - Preis/Farbe richten sich nach der ZIELSTUFE (rarity.js TIER_META: 8/12/18/30 Münzen).
     - Angeboten werden nur Stufen ECHT über dem aktuellen Familienrang; IV schließt ab (Spec §4.1/§2.1).
     - Vier Shop-Kategorien wie bisher: cards · anchors · formations · planning.

   Diese Datei ist ADDITIV und wird von Shop-Angebot/Kauf ERST mit der schrittweisen Umstellung konsumiert
   (Wiring folgt kategorieweise). Reine Logik — kein Math.random / Date (rng wird injiziert).

   Schema:
     SHOP_FAMILY_DEFS[id] = {
       id, cat ∈ "cards"|"anchors"|"formations"|"planning",
       name, upgradeType ∈ UPGRADE_TYPES, repeatable: boolean,
       legacyIds: [...]      // die flachen Shop-Item-IDs (K/A/F/P), die diese Familie ablöst — Migrationsbezug
       tiers: { 1: TierDef, 2: TierDef, 3: TierDef, 4: TierDef },
     }
   TierDef trägt `desc` + je nach Kategorie/Effektart Hooks bzw. Parameter:
     - cards (CUMULATIVE Deck-Paket, Spec §2.3): `pickTarget` (was der Ziel-Flow einsammelt) + `onPick(deck, rng,
       target) → deck`. Gleiche Shape wie die A-/C_SACRIFICE-Familien in families.js → im Wiring über den
       generalisierten `applyFamilyPick` (mit dieser Registry) wiederverwendbar.
     - anchors/formations/planning: folgen in den nächsten Schritten (Marker/Parameter je Domäne).

   §10-Näherungen dieses Schritts (Spec ließ die genaue Interaktion offen — beim Wiring bestätigen):
     - Werttausch IV „Werte frei zwischen beiden verteilen" ≈ Werttausch + beide +1 (freie Aufteilung braucht
       ein Betrags-UI → deferiert).
     - Farbtausch II „…oder beiden dieselbe gewählte Farbe" ≈ nur die Tausch-Variante (Alternativ-Modus deferiert).
     - Farbtausch IV „Farben frei neu verteilen" ≈ zyklische Permutation der gewählten Karten (freie Permutation
       braucht ein Zuordnungs-UI → deferiert).
   ============================================================ */

const { CUMULATIVE, REPLACEMENT } = UPGRADE_TYPES;

/* ---- Immutable Deck-Helfer (rein, kein rng außer wo injiziert) — an card.id, damit Boni bei späterer
        Umordnung mitwandern (Spec §7 K-Items). Bewusst lokal (keine Kopplung an shop.js-Interna). ---- */
const bumpCards = (deck, ids, delta) => deck.map((c) => (ids.includes(c.id) ? { ...c, value: c.value + delta } : c));
const recolor   = (deck, colors) => deck.map((c) => (colors[c.id] ? { ...c, suit: colors[c.id] } : c));
// Werte zweier Karten tauschen (K3). ids = genau zwei verschiedene Karten-IDs.
function swapValues(deck, ids) {
  const [a, b] = ids;
  const ca = deck.find((c) => c.id === a), cb = deck.find((c) => c.id === b);
  if (!ca || !cb || a === b) return deck;
  return deck.map((c) => (c.id === a ? { ...c, value: cb.value } : c.id === b ? { ...c, value: ca.value } : c));
}
// Farben zweier Karten tauschen (K4).
function swapSuits(deck, ids) {
  const [a, b] = ids;
  const ca = deck.find((c) => c.id === a), cb = deck.find((c) => c.id === b);
  if (!ca || !cb || a === b) return deck;
  return deck.map((c) => (c.id === a ? { ...c, suit: cb.suit } : c.id === b ? { ...c, suit: ca.suit } : c));
}
// Wertetausch + danach erhält die (nach dem Tausch) niedrigerwertige der beiden +1 (Werttausch II).
function swapValuesThenBumpLower(deck, ids) {
  const swapped = swapValues(deck, ids);
  const [a, b] = ids;
  const ca = swapped.find((c) => c.id === a), cb = swapped.find((c) => c.id === b);
  if (!ca || !cb) return swapped;
  const lower = ca.value <= cb.value ? a : b;
  return bumpCards(swapped, [lower], 1);
}
// Zwei Paare (4 IDs → [0,1] und [2,3]) tauschen jeweils untereinander `key` (value/suit) — Werttausch/Farbtausch III.
function swapTwoPairs(deck, ids, kind) {
  if ((ids || []).length !== 4) return deck;
  const swap = kind === "suit" ? swapSuits : swapValues;
  return swap(swap(deck, [ids[0], ids[1]]), [ids[2], ids[3]]);
}
// Farben der gewählten Karten zyklisch weiterreichen (Karte k bekommt Farbe von k−1) — §10-Näherung für Farbtausch IV.
function cycleSuits(deck, ids) {
  const list = (ids || []).map((id) => deck.find((c) => c.id === id)).filter(Boolean);
  if (list.length < 2) return deck;
  const rotated = {}; // id → neue Farbe (die des Vorgängers in der Auswahlreihenfolge)
  for (let k = 0; k < list.length; k++) rotated[list[k].id] = list[(k - 1 + list.length) % list.length].suit;
  return deck.map((c) => (rotated[c.id] ? { ...c, suit: rotated[c.id] } : c));
}

/* ---- Segment-Helfer (K-L1 Segmentveredelung) — `order` = playerOrder, `seg` = Segmentindex. Bump an card.id. ---- */
const segmentCardIds = (deck, order, seg) => {
  const start = seg * SEGMENT_SIZE, ids = [];
  for (let k = start; k < start + SEGMENT_SIZE && k < order.length; k++) if (deck[order[k]]) ids.push(deck[order[k]].id);
  return ids;
};
const segmentBump = (deck, order, seg, delta) => bumpCards(deck, segmentCardIds(deck, order, seg), delta);
// n zufällige Karten des Segments je +delta (deterministisch über injizierten rng).
const segmentBumpRandom = (deck, order, seg, n, delta, rng) =>
  bumpCards(deck, shuffle(segmentCardIds(deck, order, seg), rng).slice(0, n), delta);

/* ---- Feinschliff (SF_REFINE) — „Differenz-Aufwertung" (Spec §4.2): eine gewählte Karte erreicht dauerhaft den
        Zielwert der Stufe (I +1 · II +2 · III +3 · IV +5). Beim Upgrade wird nur die DIFFERENZ zur gehaltenen
        Stufe verstärkt; ein direkter Drop gibt den vollen Zielwert. `refineDelta(prev,target)` berechnet den
        anzuwendenden Bump — das Wiring liest den gehaltenen Rang und legt ihn als `target.refineDelta` in den
        Ziel-Deskriptor (onPick unten). ---- */
export const REFINE_TOTAL = { 1: 1, 2: 2, 3: 3, 4: 5 };
export const refineDelta = (prevTier, targetTier) => (REFINE_TOTAL[targetTier] || 0) - (REFINE_TOTAL[prevTier] || 0);

const SHOP_CARD_FAMILIES = {
  SF_REFINE: {
    id: "SF_REFINE", cat: "cards", name: "Feinschliff", upgradeType: CUMULATIVE, repeatable: true,
    legacyIds: ["K1", "K5", "K8"], refineDiff: true,
    // onPick nutzt die vom Wiring gelieferte Differenz (target.refineDelta); direkter Drop = refineDelta(0,target).
    tiers: {
      1: { desc: "Wähle eine Karte: sie erhält dauerhaft +1 Wert.", refineTotal: 1, pickTarget: { cards: 1 }, onPick: (d, _r, t) => bumpCards(d, t.cardIds, t.refineDelta ?? REFINE_TOTAL[1]) },
      2: { desc: "Wähle eine Karte: sie erhält dauerhaft +2 Wert.", refineTotal: 2, pickTarget: { cards: 1 }, onPick: (d, _r, t) => bumpCards(d, t.cardIds, t.refineDelta ?? REFINE_TOTAL[2]) },
      3: { desc: "Wähle eine Karte: sie erhält dauerhaft +3 Wert.", refineTotal: 3, pickTarget: { cards: 1 }, onPick: (d, _r, t) => bumpCards(d, t.cardIds, t.refineDelta ?? REFINE_TOTAL[3]) },
      4: { desc: "Wähle eine Karte: sie erhält dauerhaft +5 Wert.", refineTotal: 5, pickTarget: { cards: 1 }, onPick: (d, _r, t) => bumpCards(d, t.cardIds, t.refineDelta ?? REFINE_TOTAL[4]) },
    },
  },
  SF_MULTI_REFINE: {
    id: "SF_MULTI_REFINE", cat: "cards", name: "Mehrfacher Feinschliff", upgradeType: CUMULATIVE, repeatable: true,
    legacyIds: ["K6", "K9"],
    // Kumulativ: jede gekaufte Stufe verstärkt IHR eigenes Kartenpaket (+1 je gewählter Karte); frühere bleiben.
    tiers: {
      1: { desc: "Wähle 1 Karte: sie erhält dauerhaft +1 Wert.",       pickTarget: { cards: 1 }, onPick: (d, _r, t) => bumpCards(d, t.cardIds, 1) },
      2: { desc: "Wähle 2 Karten: sie erhalten dauerhaft je +1 Wert.", pickTarget: { cards: 2 }, onPick: (d, _r, t) => bumpCards(d, t.cardIds, 1) },
      3: { desc: "Wähle 3 Karten: sie erhalten dauerhaft je +1 Wert.", pickTarget: { cards: 3 }, onPick: (d, _r, t) => bumpCards(d, t.cardIds, 1) },
      4: { desc: "Wähle 5 Karten: sie erhalten dauerhaft je +1 Wert.", pickTarget: { cards: 5 }, onPick: (d, _r, t) => bumpCards(d, t.cardIds, 1) },
    },
  },
  SF_RECOLOR: {
    id: "SF_RECOLOR", cat: "cards", name: "Umlackierung", upgradeType: CUMULATIVE, repeatable: true,
    legacyIds: ["K2", "K7", "K10"],
    // Je gewählter Karte eine neue Farbe (target.colors: { id → suit }). Kumulativ; frühere Umfärbungen bleiben.
    tiers: {
      1: { desc: "Wähle 1 Karte und eine neue Farbe.",  pickTarget: { cards: 1, color: true }, onPick: (d, _r, t) => recolor(d, t.colors) },
      2: { desc: "Wähle 2 Karten und je eine neue Farbe.", pickTarget: { cards: 2, color: true }, onPick: (d, _r, t) => recolor(d, t.colors) },
      3: { desc: "Wähle 3 Karten und je eine neue Farbe.", pickTarget: { cards: 3, color: true }, onPick: (d, _r, t) => recolor(d, t.colors) },
      4: { desc: "Wähle 5 Karten und je eine neue Farbe.", pickTarget: { cards: 5, color: true }, onPick: (d, _r, t) => recolor(d, t.colors) },
    },
  },
  SF_VALUE_SWAP: {
    id: "SF_VALUE_SWAP", cat: "cards", name: "Werttausch", upgradeType: CUMULATIVE, repeatable: true,
    legacyIds: ["K3"],
    tiers: {
      1: { desc: "Wähle 2 Karten: sie tauschen ihre Dauerwerte.", pickTarget: { cards: 2 }, onPick: (d, _r, t) => swapValues(d, t.cardIds) },
      2: { desc: "Wähle 2 Karten: sie tauschen ihre Dauerwerte, danach erhält die niedrigere +1 Wert.", pickTarget: { cards: 2 }, onPick: (d, _r, t) => swapValuesThenBumpLower(d, t.cardIds) },
      3: { desc: "Wähle 2 Paare (4 Karten): jedes Paar tauscht seine Dauerwerte.", pickTarget: { cards: 4 }, onPick: (d, _r, t) => swapTwoPairs(d, t.cardIds, "value") },
      // §10-Näherung: freie Wertaufteilung ≈ Tausch + beide +1 (Betrags-UI deferiert).
      4: { desc: "Wähle 2 Karten: sie tauschen ihre Dauerwerte, danach erhalten beide +1 Wert.", pickTarget: { cards: 2 }, onPick: (d, _r, t) => bumpCards(swapValues(d, t.cardIds), t.cardIds, 1) },
    },
  },
  SF_COLOR_SWAP: {
    id: "SF_COLOR_SWAP", cat: "cards", name: "Farbtausch", upgradeType: CUMULATIVE, repeatable: true,
    legacyIds: ["K4"],
    tiers: {
      1: { desc: "Wähle 2 Karten: sie tauschen ihre Farben.", pickTarget: { cards: 2 }, onPick: (d, _r, t) => swapSuits(d, t.cardIds) },
      // §10-Näherung: „…oder beiden dieselbe Farbe" ≈ nur die Tausch-Variante (Alternativ-Modus deferiert).
      2: { desc: "Wähle 2 Karten: sie tauschen ihre Farben.", pickTarget: { cards: 2 }, onPick: (d, _r, t) => swapSuits(d, t.cardIds) },
      3: { desc: "Wähle 2 Paare (4 Karten): jedes Paar tauscht seine Farben.", pickTarget: { cards: 4 }, onPick: (d, _r, t) => swapTwoPairs(d, t.cardIds, "suit") },
      // §10-Näherung: freie Neuverteilung ≈ zyklische Permutation der gewählten Farben (Zuordnungs-UI deferiert).
      4: { desc: "Wähle bis zu 4 Karten: ihre Farben werden zyklisch neu verteilt.", pickTarget: { cards: 4 }, onPick: (d, _r, t) => cycleSuits(d, t.cardIds) },
    },
  },
  SF_SEGMENT_REFINE: {
    id: "SF_SEGMENT_REFINE", cat: "cards", name: "Segmentveredelung", upgradeType: CUMULATIVE, repeatable: false,
    legacyIds: ["K-L1"],
    // onPick nutzt target.segment + target.order (= playerOrder). I/II verstärken zufällige Karten des Segments.
    tiers: {
      1: { desc: "Wähle 1 Segment: zwei zufällige Karten darin erhalten dauerhaft +1 Wert.", pickTarget: { segment: true }, onPick: (d, rng, t) => segmentBumpRandom(d, t.order, t.segment, 2, 1, rng) },
      2: { desc: "Wähle 1 Segment: drei zufällige Karten darin erhalten dauerhaft +1 Wert.", pickTarget: { segment: true }, onPick: (d, rng, t) => segmentBumpRandom(d, t.order, t.segment, 3, 1, rng) },
      3: { desc: "Wähle 1 Segment: alle fünf Karten darin erhalten dauerhaft +1 Wert.",      pickTarget: { segment: true }, onPick: (d, _r, t) => segmentBump(d, t.order, t.segment, 1) },
      4: { desc: "Wähle 1 Segment: alle fünf Karten darin erhalten dauerhaft +2 Wert.",      pickTarget: { segment: true }, onPick: (d, _r, t) => segmentBump(d, t.order, t.segment, 2) },
    },
  },
};

/* ---- Anker-Familien (Shop-Spec §4.2 Ankerfamilien, #164) — REGELERSETZUNG, positionsgebunden. Je Familie EIN
        Anker eines Typs, dessen Stärke = Stufe; die Position wird beim Kauf/Upgrade (neu) gewählt (Spec: „Position
        bleibt; darf beim Kauf neu gewählt werden"). `anchorType` = der bestehende Engine-Anker-Typ. Nutzer-Entscheid
        #164: repeatable:false → jede Anker-Familie schließt bei IV ab (kein Nachkauf). Der Anker im `shop.anchors`
        trägt `{ type, position, tier, familyId }`; Engine/formations lesen die Stufen-Stärke über `anchorTierDef`.
        Alle pickTarget = { position: true } (Positions-Ziel-Flow, bestehende SHOP_TARGET_POSITION).
        §10-Näherung: Serienanker I „jeder zweite Sieg" ≈ gedrosselt über die globale Siegzahl-Parität (kein
        per-Position-Zähler nötig). ---- */
const SHOP_ANCHOR_FAMILIES = {
  SF_A_POWER: {
    id: "SF_A_POWER", cat: "anchors", name: "Kraftanker", upgradeType: REPLACEMENT, repeatable: false,
    anchorType: "power", legacyIds: ["A1"],
    tiers: {
      1: { desc: "Wähle 1 Position: +1 temporärer Wert im Stich.", pickTarget: { position: true }, power: 1 },
      2: { desc: "Wähle 1 Position: +2 temporärer Wert im Stich.", pickTarget: { position: true }, power: 2 },
      3: { desc: "Wähle 1 Position: +4 temporärer Wert im Stich.", pickTarget: { position: true }, power: 4 },
      4: { desc: "Wähle 1 Position: +6 temporärer Wert; bei Sieg zusätzlich +100 Score.", pickTarget: { position: true }, power: 6, winScore: 100 },
    },
  },
  SF_A_SCORE: {
    id: "SF_A_SCORE", cat: "anchors", name: "Punkteanker", upgradeType: REPLACEMENT, repeatable: false,
    anchorType: "score", legacyIds: ["A2"],
    tiers: {
      1: { desc: "Wähle 1 Position: ein Sieg dort gibt +100 Flat-Score.", pickTarget: { position: true }, score: 100 },
      2: { desc: "Wähle 1 Position: ein Sieg dort gibt +200 Flat-Score.", pickTarget: { position: true }, score: 200 },
      3: { desc: "Wähle 1 Position: ein Sieg dort gibt +350 Flat-Score.", pickTarget: { position: true }, score: 350 },
      4: { desc: "Wähle 1 Position: ein Sieg dort gibt +600 Flat-Score.", pickTarget: { position: true }, score: 600 },
    },
  },
  SF_A_CRIT: {
    id: "SF_A_CRIT", cat: "anchors", name: "Kritanker", upgradeType: REPLACEMENT, repeatable: false,
    anchorType: "crit", legacyIds: ["A3"],
    tiers: {
      1: { desc: "Wähle 1 Position: +10 Prozentpunkte Crit-Chance (nur dieser Stich).", pickTarget: { position: true }, crit: 0.10 },
      2: { desc: "Wähle 1 Position: +15 Prozentpunkte Crit-Chance.", pickTarget: { position: true }, crit: 0.15 },
      3: { desc: "Wähle 1 Position: +25 Prozentpunkte Crit-Chance.", pickTarget: { position: true }, crit: 0.25 },
      4: { desc: "Wähle 1 Position: +40 Prozentpunkte Crit-Chance; ein Crit dort gibt zusätzlich +250 Score.", pickTarget: { position: true }, crit: 0.40, critScore: 250 },
    },
  },
  SF_A_STREAK: {
    id: "SF_A_STREAK", cat: "anchors", name: "Serienanker", upgradeType: REPLACEMENT, repeatable: false,
    anchorType: "streak", legacyIds: ["A4"],
    // streak = Serienpunkte je Sieg dort. everySecond (§10): nur bei gerader globaler Siegzahl (≈ „jeder zweite Sieg").
    // noReset (IV): eine Niederlage auf dieser Position setzt die Serie nicht zurück.
    tiers: {
      1: { desc: "Wähle 1 Position: jeder zweite Sieg dort gibt +1 Serienpunkt.", pickTarget: { position: true }, streak: 1, everySecond: true },
      2: { desc: "Wähle 1 Position: jeder Sieg dort gibt +1 Serienpunkt.", pickTarget: { position: true }, streak: 1 },
      3: { desc: "Wähle 1 Position: ein Sieg dort gibt +2 Serienpunkte.", pickTarget: { position: true }, streak: 2 },
      4: { desc: "Wähle 1 Position: ein Sieg dort gibt +2 Serienpunkte; eine Niederlage dort setzt die Serie nicht zurück.", pickTarget: { position: true }, streak: 2, noReset: true },
    },
  },
  SF_A_FORMATION: {
    id: "SF_A_FORMATION", cat: "anchors", name: "Formationsanker", upgradeType: REPLACEMENT, repeatable: false,
    anchorType: "formation", legacyIds: ["A5"],
    tiers: {
      1: { desc: "Wähle 1 Position: zählt als aktive Formation, bei Sieg ×1,15.", pickTarget: { position: true }, factor: 1.15 },
      2: { desc: "Wähle 1 Position: zählt als aktive Formation, bei Sieg ×1,25.", pickTarget: { position: true }, factor: 1.25 },
      3: { desc: "Wähle 1 Position: zählt als aktive Formation, bei Sieg ×1,40.", pickTarget: { position: true }, factor: 1.40 },
      4: { desc: "Wähle 1 Position: zählt als aktive Formation, bei Sieg ×1,60 (überlappt mit natürlichen Formationen).", pickTarget: { position: true }, factor: 1.60 },
    },
  },
  SF_A_JOKER: {
    id: "SF_A_JOKER", cat: "anchors", name: "Jokeranker", upgradeType: REPLACEMENT, repeatable: false,
    anchorType: "joker", legacyIds: ["A6"],
    // jokerTypes = Basisformationen, für die die Karte den benötigten Wert/die Farbe annehmen darf (bildet allein keine Formation).
    tiers: {
      1: { desc: "Wähle 1 Position: Joker nur für Wiederholungen.", pickTarget: { position: true }, jokerTypes: ["wiederholung"] },
      2: { desc: "Wähle 1 Position: Joker für Wiederholung oder Treppe.", pickTarget: { position: true }, jokerTypes: ["wiederholung", "treppe"] },
      3: { desc: "Wähle 1 Position: Joker für Wiederholung, Treppe und Farbblock.", pickTarget: { position: true }, jokerTypes: ["wiederholung", "treppe", "farbblock"] },
      4: { desc: "Wähle 1 Position: Joker für alle Basisformationen.", pickTarget: { position: true }, jokerTypes: ["wiederholung", "treppe", "farbblock", "wechsel"] },
    },
  },
};

export const SHOP_FAMILY_DEFS = {
  ...SHOP_CARD_FAMILIES,
  ...SHOP_ANCHOR_FAMILIES,
};

// Anker-Familie zu einem Engine-Anker-Typ (power/score/crit/streak/formation/joker) — für die Stufen-Auflösung.
export const ANCHOR_FAMILY_BY_TYPE = Object.fromEntries(
  Object.values(SHOP_ANCHOR_FAMILIES).map((f) => [f.anchorType, f]));
// Stufen-Def eines Ankers (Typ + gehaltene/gesetzte Stufe) — Engine/formations lesen daraus die Stärke-Parameter.
export const anchorTierDef = (anchorType, tier) => ANCHOR_FAMILY_BY_TYPE[anchorType]?.tiers?.[tier] || null;
export const anchorTierParam = (anchorType, tier, key) => { const d = anchorTierDef(anchorType, tier); return d ? d[key] : undefined; };

export const SHOP_FAMILY_LIST = Object.values(SHOP_FAMILY_DEFS);
export const shopFamilyDef = (id) => SHOP_FAMILY_DEFS[id] || null;
export const shopFamilyCategory = (id) => SHOP_FAMILY_DEFS[id]?.cat || null;

/* ---- Anzeige-/Angebots-Helfer (Spec §4.1) ---- */
// Sichtbares Etikett „Name III" + Preis/Farbe der Zielstufe (rarity.js).
export const shopFamilyTierLabel = (id, tier) => { const f = SHOP_FAMILY_DEFS[id]; return f ? `${f.name} ${romanOf(tier)}` : ""; };
export const shopFamilyTierPrice = (tier) => priceOfTier(tier);
export const shopFamilyTierMeta  = (tier) => TIER_META[tier] || null;
// Beschreibung der Zielstufe.
export const shopFamilyTierDesc = (id, tier) => SHOP_FAMILY_DEFS[id]?.tiers?.[tier]?.desc || "";
// Anbietbare Stufen einer Shop-Familie beim aktuellen Rang (leer, sobald IV erreicht → abgeschlossen; Spec §4.1).
export const offerableShopTiers = (id, currentTier) => TIERS.filter((t) => t > (currentTier || 0));
