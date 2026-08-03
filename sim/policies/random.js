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
import { SKILL_SLOTS, MAX_ARCHETYPES } from "../../src/game/constants.js";
import { perkActionFor, familyTargetStep } from "../families-policy.js";
import { architectStep } from "../architect-policy.js"; // #202: Architekt-Phase (random/greedy platzieren)

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// Kann dieser Skill in einen freien Slot? Spiegelt die Free-Slot-Bedingungen von PICK_SKILL.
export function canAddSkill(s, id) {
  if (s.skills.includes(id)) return false;
  if (s.skills.length >= SKILL_SLOTS) return false;
  const a = archetypeOf(id);
  const active = s.activeArchetypes || [];
  if (a && !active.includes(a) && active.length >= MAX_ARCHETYPES) return false;
  const next = [...s.skills, id];
  return heatConsumerCount(next) <= 1 && chargeConsumerCount(next) <= 1;
}

export function randomPolicy({ architectGreedy = false } = {}) {
  return {
    name: architectGreedy ? "random+arch" : "random",
    act(s, rng) {
      switch (s.phase) {
        case "levelup": {
          if (s.skillOffer) {
            const addable = s.skillOffer.filter((id) => canAddSkill(s, id));
            return addable.length
              ? { type: "PICK_SKILL", skillId: pick(addable, rng), rng }
              : { type: "DECLINE_SKILL", rng }; // immer akzeptiert → Perk-Angebot oder weiterspielen
          }
          // Perk-Angebot ist gemischt (#167): flacher Legendär-String → PICK_PERK, {familyId,tier} → PICK_FAMILY.
          if (s.offer) return perkActionFor(pick(s.offer, rng), rng);
          return { type: "RESOLVE_TRICK", rng }; // sollte nicht vorkommen; harmloser Fallback
        }

        case "target": {
          const need = PERK_DEFS[s.targetPerk]?.needsTarget || 0;
          const cardIds = s.deck.slice(0, need).map((c) => c.id); // erste N (distinkt) — CONFIRM prüft nur Anzahl/Distinktheit
          return { type: "CONFIRM_TARGET", cardIds };
        }

        // Familien-Ziel-Fluss (#167, Kat. A/C): Farb-/Karten-Ziele deterministisch füllen, dann bestätigen.
        case "family-target":
          return familyTargetStep(s, rng);

        case "formation":
          return { type: "CONFIRM_FORMATION" }; // Baseline: Reihenfolge unangetastet lassen

        case "architect": // Architekt-Phase (#202, ersetzt den Shop): random oder greedy platzieren, dann fertig.
          return architectStep(s, rng, { greedy: architectGreedy });

        default:
          return null; // runOne bricht mit klarer Meldung ab
      }
    },
  };
}
