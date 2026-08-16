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
import { archetypeOf, heatConsumerCount, chargeConsumerCount, isLegendarySkill } from "../../src/game/skills.js";
import { SKILL_SLOTS, MAX_ARCHETYPES } from "../../src/game/constants.js";
import { perkActionFor, familyTargetStep } from "../families-policy.js";
import { architectStep } from "../architect-policy.js"; // #202: Architekt-Phase (random/greedy platzieren)

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// Kann dieser Skill in einen freien Slot? Spiegelt die Free-Slot-Bedingungen von PICK_SKILL.
export function canAddSkill(s, id) {
  if (s.skills.includes(id)) return false;
  // Slot-Deckel vom STATE lesen, nicht die Konstante: das Legendäre „Meisterhand" (v0.3) und die Wochen-Mod
  // „Skill-Fülle" (#370) heben ihn zur Laufzeit. Mit der Konstante würde die Policy den Extra-Slot nie füllen und
  // der Perk misst sich auf 1,00× — genau der Fehler, der bei Bauhütte/maxCover schon einmal passiert ist.
  if (s.skills.filter((sid) => !isLegendarySkill(sid)).length >= (s.skillSlots || SKILL_SLOTS)) return false; // #272: der 7. Legendär-Slot zählt nicht gegen SKILL_SLOTS
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

        // Frostwahl (#265): die niedrigsten `need` nicht-gefrorenen Karten wählen (spiegelt das alte Auto-Verhalten →
        // Balance/Determinismus erhalten), dann bestätigen.
        case "frost-select": {
          const fs = s.frostSelect || { need: 0, chosen: [] };
          if (fs.chosen.length < fs.need) {
            const pool = s.deck.filter((c) => !c.frozen && !fs.chosen.includes(c.id))
              .sort((a, b) => a.value - b.value || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
            if (pool.length) return { type: "FROST_SELECT_TOGGLE", cardId: pool[0].id };
          }
          return { type: "FROST_SELECT_CONFIRM" };
        }

        // #272 Legendär-Phase (Runde 29): einen der 2 angebotenen Legendäre in den 7. Slot (build-defining). Baseline:
        // zufällig aus dem Angebot (das schon nur aus aktiven Fraktionen stammt); leer → ablehnen (→ normale Skill-Wahl).
        case "legendary":
          return s.legendaryOffer && s.legendaryOffer.length
            ? { type: "PICK_LEGENDARY", legendaryId: pick(s.legendaryOffer, rng), rng }
            : { type: "DECLINE_LEGENDARY", rng };

        case "formation":
          return { type: "CONFIRM_FORMATION" }; // Baseline: Reihenfolge unangetastet lassen

        case "architect": // Architekt-Phase (#202, ersetzt den Shop): random oder greedy platzieren, dann fertig.
          return architectStep(s, rng, { greedy: architectGreedy });

        // Eis-Neudesign: nach jedem Eis-Skill-Pick genau 1 Karte als Gletscher festfrieren (Pflicht). Baseline:
        // erstes freies Feld (deterministisch); bei ≤7 Locks immer < Feldgröße.
        case "glacier-target": {
          const locked = s.glacierLocked || [];
          let pos = 0; while (pos < s.playerOrder.length && locked[pos]) pos++;
          return { type: "GLACIER_LOCK", pos };
        }

        default:
          return null; // runOne bricht mit klarer Meldung ab
      }
    },
  };
}
