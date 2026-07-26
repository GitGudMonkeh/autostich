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
export const TIER_WEIGHTS = { 1: 100, 2: 46, 3: 20, 4: 8 };

export const tierMeta   = (tier) => TIER_META[tier] || null;
export const priceOfTier = (tier) => TIER_META[tier]?.price ?? 0;
export const romanOf    = (tier) => ROMAN[tier] || String(tier);
export const rarityKeyOf = (tier) => TIER_META[tier]?.rarity || null;
export const tierColor  = (tier) => TIER_META[tier]?.color || "#8a8a95";
// Sichtbares Etikett „Name III" (Spec §8). Leere/0-Stufe → nur der Name.
export const tierLabel  = (name, tier) => (tier ? `${name} ${romanOf(tier)}` : name);

/* Angebotsfilter (Spec §2.4): eine Stufe darf nur angeboten werden, wenn sie ECHT über dem
   aktuellen Familienrang liegt. currentTier 0 = Familie noch nicht besessen. */
export function canOfferFamilyTier(currentTier, offeredTier) {
  return offeredTier > (currentTier || 0);
}

// Anbietbare Stufen einer Familie beim aktuellen Rang (leer, sobald IV erreicht → Familie abgeschlossen).
export function offerableTiers(family, currentTier) {
  return (family?.tiers || TIERS).filter((t) => canOfferFamilyTier(currentTier, t));
}

/* Familienzustand: { [familyId]: currentTier }. Reine Helfer (immutabel). */
export const familyTierOf = (familyTiers, id) => (familyTiers || {})[id] || 0;
export const withFamilyTier = (familyTiers, id, tier) => ({ ...(familyTiers || {}), [id]: tier });
export const familyComplete = (familyTiers, id) => familyTierOf(familyTiers, id) >= 4;

/* Familien-/stufenbewusstes Angebot (Spec §2): bis zu `count` VERSCHIEDENE Familien; jede erscheint
   auf genau EINER anbietbaren Stufe, gewichtet nach TIER_WEIGHTS[tier]. Legendäre laufen NICHT hierüber.
   Deterministisch über den injizierten rng (ein rng()-Zug je gewählter Familie) — kein Math.random hier.
   `families`: [{ id, tiers?: number[], enabled?: boolean }]. `familyTiers`: aktueller Rang je Familie.
   Rückgabe: [{ familyId, tier }] (leer, wenn kein anbietbares Paar existiert). */
export function buildFamilyOffer(families = [], familyTiers = {}, rng = Math.random, count = 3) {
  let pool = [];
  for (const f of families) {
    if (!f || f.enabled === false) continue;
    const cur = familyTierOf(familyTiers, f.id);
    for (const t of offerableTiers(f, cur)) pool.push({ id: f.id, tier: t, weight: TIER_WEIGHTS[t] || 0 });
  }
  const chosen = [];
  while (chosen.length < count && pool.length > 0) {
    const total = pool.reduce((a, x) => a + x.weight, 0);
    if (total <= 0) break;
    let r = rng() * total, i = 0;
    while (i < pool.length - 1 && r >= pool[i].weight) { r -= pool[i].weight; i += 1; }
    const pick = pool[i];
    chosen.push({ familyId: pick.id, tier: pick.tier });
    pool = pool.filter((x) => x.id !== pick.id); // eine Familie höchstens einmal je Angebot (Spec §15)
  }
  return chosen;
}

/* Upgrade-Verhalten (Spec §2.3) — Marker-Konstanten für die Familien-Definitionen (#163/#164):
   - replacement: nur die Regel der höchsten gehaltenen Stufe ist aktiv (keine parallelen Trigger).
   - cumulative:  jede tatsächlich gewählte Stufe führt EINMAL ihr Paket aus; Deckänderungen bleiben.
   - role:        Zielkarten behalten ihre Rolle; Zahlen/Regeln steigen, zusätzliche Ziele neu wählen. */
export const UPGRADE_TYPES = { REPLACEMENT: "replacement", CUMULATIVE: "cumulative", ROLE: "role" };
