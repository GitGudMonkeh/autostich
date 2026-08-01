// Perk-Force-Policy (Legendär-Perks-Rework #203). Analog zur faction-/Legendär-Skill-Messung: über eine hohe
// SIM_PERK_LEGENDARY_BASE (z. B. 0.7) wird ein Legendäres ins Perk-Angebot erzwungen; diese Policy PICKT das
// Ziel-Legendäre, sobald es angeboten wird. Sonst (und im Baseline-Lauf target=null) wählt sie ein NICHT-legendäres
// Angebot (Familie ODER flacher Normal-Perk) bzw. lehnt ein rein-legendäres Angebot ab → der Baseline bleibt
// legendär-frei. Skills lehnt sie optional an einen Archetyp an (der native Kontext, in dem der Perk-Hook feuert),
// OHNE Skill-Legendäre (deren Direkt-Dividenden würden die Perk-Messung verfälschen). Formation = greedy Solver.
import { randomPolicy, canAddSkill } from "./random.js";
import { isLegendary } from "../../src/game/perks.js";
import { archetypeOf, SKILL_DEFS } from "../../src/game/skills.js";
import { perkActionFor, isFamilyOffer } from "../families-policy.js";
import { greedyFormationStep } from "../formation.js";

const isSkillLeg = (id) => !!SKILL_DEFS[id]?.legendary;

// target = zu greifender Legendär-Perk (oder null = Baseline ohne Legendäre). lean = Archetyp-Bias für Skills (oder null).
export function perkPolicy(target = null, lean = null) {
  const base = randomPolicy();
  return {
    name: `perk:${target || "base"}${lean ? "/" + lean : ""}`,
    act(s, rng, mem) {
      // Perk-Angebot: Ziel-Legendäres greifen, sonst NICHT-legendäres wählen (Baseline legendär-frei halten).
      if (s.phase === "levelup" && s.offer) {
        if (target && s.offer.includes(target)) return { type: "PICK_PERK", perkId: target, rng };
        const nonLeg = s.offer.filter((e) => isFamilyOffer(e) || !isLegendary(e));
        if (nonLeg.length) return perkActionFor(nonLeg[Math.floor(rng() * nonLeg.length)], rng);
        return { type: "DECLINE_PERK" }; // nur Legendäre & keins ist das Ziel → ablehnen (hält legendär-frei)
      }
      // Skill-Angebot: an den nativen Archetyp anlehnen, ohne Skill-Legendäre (kein Mess-Confounder).
      if (s.phase === "levelup" && s.skillOffer) {
        let mine = s.skillOffer.filter((id) => canAddSkill(s, id) && !isSkillLeg(id));
        if (lean) { const leaned = mine.filter((id) => archetypeOf(id) === lean); if (leaned.length) mine = leaned; }
        if (!mine.length) return { type: "DECLINE_SKILL", rng };
        return { type: "PICK_SKILL", skillId: mine[Math.floor(rng() * mine.length)], rng };
      }
      if (s.phase === "formation") return greedyFormationStep(s);
      return base.act(s, rng, mem); // Stat/Ziel/Familien-Ziel/Shop unverändert
    },
  };
}
