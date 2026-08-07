/* ============================================================
   RARITÄTSSYSTEM — Fundament (Epic #167 / Sub-Issue #162, Spec docs/rarity-system.md).
   Vier reguläre Stufen (I–IV) als Datenmodell + familien-/stufenbewusste Angebotslogik.
   ADDITIVE Schicht: dieses Modul bricht das bestehende flache Perk-/Shop-System NICHT — die
   eigentliche Umstellung der Registries (Perks #163 / Shop #164) baut hierauf auf.

   Begriffe (Spec §1/§2):
   - Familie: Perk oder Shop-Item als aufwertbare Einheit mit bis zu vier regulären Stufen.
   - Rang/Stufe im Run: 0 (nicht besessen) | 1 | 2 | 3 | 4. Pro Familie genau einer.
   - Angebot: nur Stufen ECHT ÜBER dem aktuellen Rang (canOfferFamilyTier); Stufe IV schließt ab.
   - Legendäre bleiben AUSSERHALB dieses Systems (eigener Legendär-Wurf, unverändert).

   Interne Bezeichnung Stufe IV = "epic" (technisch sauber); die sichtbare deutsche Bezeichnung
   bleibt "Rar" (Spec §10). Drop-Gewichte + Preise sind Tuning-Konstanten.
   ============================================================ */

export const TIERS = [1, 2, 3, 4];

// Stufen-Metadaten (Spec §1 + §8). `rarity` = interner Schlüssel, `label` = sichtbarer deutscher Name,
// `color` = UI-Farbe (I Grau · II Grün · III Blau · IV Lila), `price` = Shoppreis der Zielstufe.
export const TIER_META = {
  1: { tier: 1, rarity: "normal",   label: "Normal",       color: "#8a8a95", price: 8 },
  2: { tier: 2, rarity: "uncommon", label: "Ungewöhnlich", color: "#4ade80", price: 12 },
  3: { tier: 3, rarity: "rare",     label: "Selten",       color: "#5a8ade", price: 18 },
  4: { tier: 4, rarity: "epic",     label: "Rar",          color: "#a855f7", price: 30 },
};

// Römische Stufe direkt hinter dem Familiennamen (Spec §8: „Momentum III").
export const ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV" };

// Drop-Gewichte je Stufe (Spec §10, offen → tunebar). Höhere Stufen seltener. [TUNING]
// Summe = 100 → Gewichte entsprechen direkt den Ziel-Prozenten I 60 / II 25 / III 12 / IV 3.
// #217 Meistergrade — Rarität-Shift: höhere Grade verschieben Gewicht zu Selten/Rar. shift 0 = Basis,
// 1 (Grad III) / 2 (Grad IV+). Tabellen IDENTISCH zu architect.js (Single Source hier → kein Drift; der
// Sim-Env-Hook SIM_RARE_SHIFT und der Grad-Reward greifen auf dieselbe Skala zu).
const TIER_WEIGHTS_BY_SHIFT = {
  0: { 1: 60, 2: 25, 3: 12, 4: 3 },
  1: { 1: 52, 2: 25, 3: 16, 4: 7 },
  2: { 1: 40, 2: 23, 3: 25, 4: 12 },
};
export const tierWeightsForShift = (shift) => TIER_WEIGHTS_BY_SHIFT[shift] || TIER_WEIGHTS_BY_SHIFT[0];
export const TIER_WEIGHTS = TIER_WEIGHTS_BY_SHIFT[0]; // Basis (shift 0) — unveränderte Bestandssemantik

export const tierMeta   = (tier) => TIER_META[tier] || null;
export const priceOfTier = (tier) => TIER_META[tier]?.price ?? 0;
export const romanOf    = (tier) => ROMAN[tier] || String(tier);
export const tierColor  = (tier) => TIER_META[tier]?.color || "#8a8a95";
// Sichtbares Etikett „Name III" (Spec §8). Leere/0-Stufe → nur der Name.
export const tierLabel  = (name, tier) => (tier ? `${name} ${romanOf(tier)}` : name);

/* Angebotsfilter (Spec §2.4): eine Stufe darf nur angeboten werden, wenn sie ECHT über dem
   aktuellen Familienrang liegt. currentTier 0 = Familie noch nicht besessen. */
export function canOfferFamilyTier(currentTier, offeredTier) {
  return offeredTier > (currentTier || 0);
}

/* Familienzustand: { [familyId]: currentTier }. Reine Helfer (immutabel). */
export const familyTierOf = (familyTiers, id) => (familyTiers || {})[id] || 0;
export const withFamilyTier = (familyTiers, id, tier) => ({ ...(familyTiers || {}), [id]: tier });

/* #195: `offerableTiers` + `buildFamilyOffer` (früher generischer Angebots-Builder) sowie `rarityKeyOf`/
   `familyComplete` entfernt — kein Prod-Aufrufer. Die echten Angebots-Ziehungen laufen kategorie-spezifisch über
   drawFamilyOffers (shop.js) bzw. buildPerkOffer (perks.js); `offerableTiers` trug zudem einen latenten Schema-Bug
   (erwartete `tiers` als Array, echte Familien nutzen ein Objekt). `canOfferFamilyTier` bleibt (von perks.js genutzt). */

/* Upgrade-Verhalten (Spec §2.3) — Marker-Konstanten für die Familien-Definitionen (#163/#164):
   - replacement: nur die Regel der höchsten gehaltenen Stufe ist aktiv (keine parallelen Trigger).
   - cumulative:  jede tatsächlich gewählte Stufe führt EINMAL ihr Paket aus; Deckänderungen bleiben.
   - role:        Zielkarten behalten ihre Rolle; Zahlen/Regeln steigen, zusätzliche Ziele neu wählen. */
export const UPGRADE_TYPES = { REPLACEMENT: "replacement", CUMULATIVE: "cumulative", ROLE: "role" };
