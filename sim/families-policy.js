// Familien-Policy-Helfer (Rarität #167). Nach dem Umbau ist ein Perk-Angebotseintrag ENTWEDER ein flacher
// (Legendär-)perkId-String ODER ein Familien-Objekt `{familyId, tier}`; Shop-Angebote sind flache Items
// (`o.itemId`) ODER Shop-Familien (`o.family` + `o.familyId`/`o.famTier`). Bandit/Priority/Ablation arbeiten
// alle auf STRING-Options-IDs — diese Helfer bilden Einträge auf stabile IDs ab und zurück auf die Action.
import { SUIT_ORDER } from "../src/game/constants.js";
import { FORMATION_TYPES, computeFormations } from "../src/game/formations.js";

export const isFamilyOffer = (e) => !!(e && typeof e === "object" && e.familyId);

// Stabile Options-ID eines Perk-Angebotseintrags (für Bandit-Arm / Priority / drop). Familien: je (Familie,Stufe).
export const perkOptionId = (e) => (isFamilyOffer(e) ? `FAM:${e.familyId}:${e.tier}` : e);

// Passende Dispatch-Action zu einem Perk-Angebotseintrag.
export const perkActionFor = (e, rng) =>
  isFamilyOffer(e)
    ? { type: "PICK_FAMILY", familyId: e.familyId, tier: e.tier, rng }
    : { type: "PICK_PERK", perkId: e, rng };


// Deterministischer Ziel-Füllschritt für die family-target-Phase (Perk-Familien A/C, Spec §2.3/§2.4).
// Ein Schritt pro Aufruf: der Reihe nach die nötigen Farben bzw. Karten wählen, dann CONFIRM (mit rng —
// der CONFIRM wendet den Familien-Pick an und kann rng nutzen). Bricht nie ab: bei 40 Karten/4 Farben ist
// `need` (≤5 Karten bzw. ≤2 Farben) immer erfüllbar.
/* ORACLE for role-based targets. `computeFormations` is pure and rng-free, so the policy may score a
   candidate choice against the CURRENT board before committing it — the same trick the formation solver
   uses on `SWAP_CARDS`. Only works for targets that act through `roles` (Farballianz, Formationskern);
   the deck-editing colour families apply in `onPick` at CONFIRM and are invisible here. */
const boardScore = (s, roles) =>
  computeFormations(s.playerOrder, s.deck, roles, s.perks, s.skills, s.shop?.anchors || [],
    s.familyTiers, s.architectEnabled ? s.architect : null,
    { skillTiers: s.skillTiers || {}, growth: s.growth || {} })
    .reduce((t, f) => t + (f?.mult || 1), 0);

const combinations = (arr, k) => (k === 0 ? [[]]
  : k > arr.length ? []
  : [...combinations(arr.slice(1), k - 1).map((c) => [arr[0], ...c]), ...combinations(arr.slice(1), k)]);

/* Farballianz: WHICH colours are merged decides which positions form a Farbblock, so the arbitrary pick
   this helper used to make was measuring the policy, not the family. At most C(4,2)=6 candidates. */
const bestAlliance = (s, need) => {
  let best = null, bestScore = -Infinity;
  for (const combo of combinations(SUIT_ORDER, need)) {
    const v = boardScore(s, { ...(s.roles || {}), E_COLOR_ALLIANCE: combo });
    if (v > bestScore) { bestScore = v; best = combo; }
  }
  return best || SUIT_ORDER.slice(0, need);
};

export function familyTargetStep(s, rng) {
  const ft = s.familyTarget;
  if (!ft) return { type: "FAMILY_TARGET_CONFIRM", rng };
  if (ft.kind === "suits") {
    if (ft.suits.length < ft.need) {
      // Farballianz wirkt über `roles` → messbar. Die übrigen Farbfamilien (A_SUIT_BOOST/A_SUIT_DUEL/
      // P_COLORFOCUS) editieren im onPick das Deck; bei gleichverteiltem Deck (10 Karten je Farbe) ist ihre
      // Wahl anzahl-neutral, deshalb bleibt es dort bei der festen Reihenfolge (Determinismus §9).
      const order = ft.familyId === "E_COLOR_ALLIANCE" ? bestAlliance(s, ft.need) : SUIT_ORDER;
      const suit = order.find((su) => !ft.suits.includes(su)) || SUIT_ORDER.find((su) => !ft.suits.includes(su));
      if (suit) return { type: "FAMILY_TARGET_SUIT", suit };
    }
    return { type: "FAMILY_TARGET_CONFIRM", rng };
  }
  // kind === "formationType" (#179 E_CORE): genau EINEN Formationstyp wählen, dann CONFIRM (Antippen schaltet um).
  // Gewählt wird der Typ, der auf dem AKTUELLEN Brett am meisten trägt — der feste FORMATION_TYPES[0] verstärkte
  // immer „Wiederholung", auch in einem Build, der Treppen spielt.
  if (ft.kind === "formationType") {
    if (!ft.formationType) {
      let best = FORMATION_TYPES[0], bestScore = -Infinity;
      for (const t of FORMATION_TYPES) {
        const v = boardScore(s, { ...(s.roles || {}), E_CORE: [t] });
        if (v > bestScore) { bestScore = v; best = t; }
      }
      return { type: "FAMILY_TARGET_FORMATION_TYPE", formationType: best };
    }
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
