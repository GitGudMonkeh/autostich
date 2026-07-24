// Fixed-Policy (Sim S3, Eval-Modus): wählt aus jedem Angebot die höchstpriorisierte Option gemäß
// `priority` (geordnete id-Liste, kleiner Index = höhere Priorität). Kein `memory`, kein Lernen — für
// unverzerrte, gepaarte Ablationsläufe. `drop` = eine id, die NIE gewählt wird (Ablations-Kontrafaktum).
//
// Deterministisch: bei fehlender Priorität greift ein fester Fallback (erste zulässige Option), damit
// zwei Läufe mit demselben Seed nur an der ablatierten Stelle divergieren.
import { randomPolicy, canAddSkill } from "./random.js";

export function fixedPolicy(priority, { drop = null } = {}) {
  const base = randomPolicy(); // target/formation/shop/shop-target unverändert
  const rank = new Map(priority.map((id, i) => [id, i]));
  const bestOf = (ids) => {
    let best = null, bestR = Infinity;
    for (const id of ids) {
      if (id === drop) continue;
      const r = rank.has(id) ? rank.get(id) : Infinity;
      if (r < bestR) { bestR = r; best = id; }
    }
    return best; // null, wenn keine id priorisiert (dann Fallback beim Aufrufer)
  };
  return {
    name: drop ? `fixed(drop=${drop})` : "fixed",
    act(s, rng) {
      switch (s.phase) {
        case "levelup": {
          if (s.statOffer) {
            const pick = bestOf(s.statOffer) ?? s.statOffer.find((id) => id !== drop) ?? s.statOffer[0];
            return { type: "PICK_STAT", statId: pick };
          }
          if (s.skillOffer) {
            const addable = s.skillOffer.filter((id) => id !== drop && canAddSkill(s, id));
            const pick = bestOf(addable) ?? addable[0];
            return pick ? { type: "PICK_SKILL", skillId: pick, rng } : { type: "DECLINE_SKILL", rng };
          }
          if (s.offer) {
            const pick = bestOf(s.offer) ?? s.offer.find((id) => id !== drop) ?? s.offer[0];
            return { type: "PICK_PERK", perkId: pick, rng };
          }
          return { type: "RESOLVE_TRICK", rng };
        }
        default:
          return base.act(s, rng);
      }
    },
  };
}
