// Fraktions-biased Policy (Balance-Diagnose A). Baut eine möglichst REINE Fraktion, indem sie beim
// Skill-Angebot nur Skills des Ziel-Archetyps aufnimmt (sonst ablehnen → Perk-Angebot). Alle anderen
// Phasen (Stat/Perk/Shop/Formation/Ziel-Flüsse) laufen über die Random-Baseline → normale Ökonomie,
// damit die Fraktionen mit Perks/Stats/Formationen APFEL-ZU-APFEL gegen die Baseline vergleichbar sind.
import { archetypeOf } from "../../src/game/skills.js";
import { randomPolicy, canAddSkill } from "./random.js";

export function factionPolicy(target) {
  const base = randomPolicy();
  return {
    name: `faction:${target}`,
    act(s, rng, mem) {
      if (s.phase === "levelup" && s.skillOffer) {
        const addable = s.skillOffer.filter((id) => canAddSkill(s, id) && archetypeOf(id) === target);
        // Ziel-Archetyp-Skill vorhanden → nehmen; sonst ablehnen (NIE einen Fremd-Archetyp aufnehmen).
        return addable.length
          ? { type: "PICK_SKILL", skillId: addable[Math.floor(rng() * addable.length)], rng }
          : { type: "DECLINE_SKILL", rng };
      }
      return base.act(s, rng, mem);
    },
  };
}
