// Familien-Policy-Helfer (Rarität #167). Nach dem Umbau ist ein Perk-Angebotseintrag ENTWEDER ein flacher
// (Legendär-)perkId-String ODER ein Familien-Objekt `{familyId, tier}`; Shop-Angebote sind flache Items
// (`o.itemId`) ODER Shop-Familien (`o.family` + `o.familyId`/`o.famTier`). Bandit/Priority/Ablation arbeiten
// alle auf STRING-Options-IDs — diese Helfer bilden Einträge auf stabile IDs ab und zurück auf die Action.
import { SUIT_ORDER } from "../src/game/constants.js";
import { SHOP_FAMILY_DEFS } from "../src/game/shopFamilies.js";
import { FORMATION_TYPES } from "../src/game/formations.js";

export const isFamilyOffer = (e) => !!(e && typeof e === "object" && e.familyId);

// Stabile Options-ID eines Perk-Angebotseintrags (für Bandit-Arm / Priority / drop). Familien: je (Familie,Stufe).
export const perkOptionId = (e) => (isFamilyOffer(e) ? `FAM:${e.familyId}:${e.tier}` : e);

// Passende Dispatch-Action zu einem Perk-Angebotseintrag.
export const perkActionFor = (e, rng) =>
  isFamilyOffer(e)
    ? { type: "PICK_FAMILY", familyId: e.familyId, tier: e.tier, rng }
    : { type: "PICK_PERK", perkId: e, rng };

// Stabile Options-ID eines Shop-Angebots (flaches Item vs. Shop-Familie je (Familie,Stufe)).
export const shopOptionId = (o) => (o.family ? `SF:${o.familyId}:${o.famTier}` : o.itemId);

// Hat diese Shop-Familien-Stufe einen Ziel-Fluss (öffnet shop-target)?
export const shopFamilyHasTarget = (o) =>
  !!(o.family && SHOP_FAMILY_DEFS[o.familyId]?.tiers?.[o.famTier]?.pickTarget);

// Deterministischer Ziel-Füllschritt für die family-target-Phase (Perk-Familien A/C, Spec §2.3/§2.4).
// Ein Schritt pro Aufruf: der Reihe nach die nötigen Farben bzw. Karten wählen, dann CONFIRM (mit rng —
// der CONFIRM wendet den Familien-Pick an und kann rng nutzen). Bricht nie ab: bei 40 Karten/4 Farben ist
// `need` (≤5 Karten bzw. ≤2 Farben) immer erfüllbar.
export function familyTargetStep(s, rng) {
  const ft = s.familyTarget;
  if (!ft) return { type: "FAMILY_TARGET_CONFIRM", rng };
  if (ft.kind === "suits") {
    if (ft.suits.length < ft.need) {
      const suit = SUIT_ORDER.find((su) => !ft.suits.includes(su));
      if (suit) return { type: "FAMILY_TARGET_SUIT", suit };
    }
    return { type: "FAMILY_TARGET_CONFIRM", rng };
  }
  // kind === "formationType" (#179 E_CORE): genau EINEN Formationstyp wählen, dann CONFIRM (Antippen schaltet um).
  if (ft.kind === "formationType") {
    if (!ft.formationType) return { type: "FAMILY_TARGET_FORMATION_TYPE", formationType: FORMATION_TYPES[0] };
    return { type: "FAMILY_TARGET_CONFIRM", rng };
  }
  // kind === "cards": gültiges Zusatz-Ziel = existierende Karte, die keine Rolle DIESER Familie ist.
  if (ft.cards.length < ft.need) {
    const held = new Set((s.roles || {})[ft.familyId] || []);
    const chosen = new Set(ft.cards);
    const next = s.deck.find((c) => !chosen.has(c.id) && !held.has(c.id));
    if (next) return { type: "FAMILY_TARGET_CARD", cardId: next.id };
  }
  return { type: "FAMILY_TARGET_CONFIRM", rng };
}
