// Fraktions-biased Policy (Balance-Diagnose A). Baut eine möglichst REINE Fraktion — ODER eine gezielte
// Kombi aus 2–3 Fraktionen (Cross-Archetype) —, indem sie beim Skill-Angebot nur Skills der Ziel-Archetypen
// aufnimmt (sonst ablehnen → Perk-Angebot). Stat/Perk/Shop/Ziel-Flüsse laufen über die Random-Baseline; die
// FORMATIONSPHASE nutzt den Greedy-Solver (S4, greedyFormationStep) statt naivem CONFIRM — sonst werden
// formations-lastige Fraktionen (Eis-Architekt, Pflanze-Grünblöcke, Positions-Anker) massiv unterschätzt.
//
//   factionPolicy("fire")           → reine Fraktion (wie bisher)
//   factionPolicy(["fire","ice"])   → Kombi mit SLOT-SPLIT: bevorzugt beim Pick das Ziel mit den WENIGSTEN
//                                     aktuell gehaltenen Skills → balanciert (6 Slots: 2 Ziele → 3+3, 3 → 2+2+2).
import { archetypeOf } from "../../src/game/skills.js";
import { randomPolicy, canAddSkill } from "./random.js";
import { greedyFormationStep } from "../formation.js";

export function factionPolicy(target) {
  const targets = Array.isArray(target) ? target : [target];
  const base = randomPolicy();
  return {
    name: `faction:${targets.join("+")}`,
    act(s, rng, mem) {
      if (s.phase === "levelup" && s.skillOffer) {
        // Nur Ziel-Archetyp-Skills, die in einen freien Slot passen (NIE einen Fremd-Archetyp aufnehmen).
        const addable = s.skillOffer.filter((id) => canAddSkill(s, id) && targets.includes(archetypeOf(id)));
        if (!addable.length) return { type: "DECLINE_SKILL", rng };
        // Slot-Split: das Ziel mit den wenigsten bereits gehaltenen Skills bevorzugen → balancierte Kombi.
        const held = Object.fromEntries(targets.map((t) => [t, s.skills.filter((id) => archetypeOf(id) === t).length]));
        const minHeld = Math.min(...addable.map((id) => held[archetypeOf(id)]));
        const pref = addable.filter((id) => held[archetypeOf(id)] === minHeld);
        return { type: "PICK_SKILL", skillId: pref[Math.floor(rng() * pref.length)], rng };
      }
      // Aufstellung aktiv lösen (S4-Solver) statt naiv bestätigen → Eis/Pflanze/Anker fair abgebildet.
      if (s.phase === "formation") return greedyFormationStep(s);
      return base.act(s, rng, mem);
    },
  };
}
