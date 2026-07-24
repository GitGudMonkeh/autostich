// Random-Baseline-Policy (Sim S0). Trifft an jeder Entscheidungsphase eine gültige,
// FORTSCHRITT garantierende Wahl — der Treiber (run.js) verlässt sich darauf, dass jede
// zurückgegebene Action vom Reducer akzeptiert wird (sonst bricht runOne bewusst ab).
//
// Bewusst simpel (Baseline, kein Bot):
//  - Skills: nur in freie Slots aufnehmen, solange Archetyp-/Konsumentenregeln passen; sonst ablehnen.
//    (Slot-Ersetzung ist eine spätere Verfeinerung — S2/S5.)
//  - Formation: sofort bestätigen (keine Tausch-Optimierung — das ist der S4-Solver).
//  - Shop: gierig alle bezahlbaren Items OHNE Zielauswahl kaufen, dann verlassen.
//    (Ziel-Items bleiben in S0 außen vor; das hält die shop-target-Phase draußen.)
import { PERK_DEFS } from "../../src/game/perks.js";
import { archetypeOf, heatConsumerCount, chargeConsumerCount } from "../../src/game/skills.js";
import { SHOP_ITEM_DEFS, canAfford } from "../../src/game/shop.js";
import { SKILL_SLOTS, MAX_ARCHETYPES } from "../../src/game/constants.js";

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// Kann dieser Skill in einen freien Slot? Spiegelt die Free-Slot-Bedingungen von PICK_SKILL.
function canAddSkill(s, id) {
  if (s.skills.includes(id)) return false;
  if (s.skills.length >= SKILL_SLOTS) return false;
  const a = archetypeOf(id);
  const active = s.activeArchetypes || [];
  if (a && !active.includes(a) && active.length >= MAX_ARCHETYPES) return false;
  const next = [...s.skills, id];
  return heatConsumerCount(next) <= 1 && chargeConsumerCount(next) <= 1;
}

export function randomPolicy() {
  return {
    name: "random",
    act(s, rng) {
      switch (s.phase) {
        case "levelup": {
          if (s.statOffer) return { type: "PICK_STAT", statId: pick(s.statOffer, rng) };
          if (s.skillOffer) {
            const addable = s.skillOffer.filter((id) => canAddSkill(s, id));
            return addable.length
              ? { type: "PICK_SKILL", skillId: pick(addable, rng), rng }
              : { type: "DECLINE_SKILL", rng }; // immer akzeptiert → Perk-Angebot oder weiterspielen
          }
          if (s.offer) return { type: "PICK_PERK", perkId: pick(s.offer, rng), rng };
          return { type: "RESOLVE_TRICK", rng }; // sollte nicht vorkommen; harmloser Fallback
        }

        case "target": {
          const need = PERK_DEFS[s.targetPerk]?.needsTarget || 0;
          const cardIds = s.deck.slice(0, need).map((c) => c.id); // erste N (distinkt) — CONFIRM prüft nur Anzahl/Distinktheit
          return { type: "CONFIRM_TARGET", cardIds };
        }

        case "formation":
          return { type: "CONFIRM_FORMATION" }; // Baseline: Reihenfolge unangetastet lassen

        case "shop": {
          const shop = s.shop || {};
          const purchased = new Set(shop.purchasedOfferIds || []);
          const buyable = (shop.offers || []).filter(
            (o) => !purchased.has(o.offerId) && canAfford(shop, o) && !SHOP_ITEM_DEFS[o.itemId]?.target,
          );
          return buyable.length ? { type: "BUY_ITEM", offerId: buyable[0].offerId, rng } : { type: "LEAVE_SHOP" };
        }

        case "shop-target":
          return { type: "SHOP_TARGET_CANCEL" }; // Sicherheitsnetz: S0 betritt diese Phase nicht

        default:
          return null; // runOne bricht mit klarer Meldung ab
      }
    },
  };
}
