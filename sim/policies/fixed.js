// Fixed-Policy (Sim S3, Eval-Modus): wählt aus jedem Angebot die höchstpriorisierte Option gemäß
// `priority` (geordnete id-Liste, kleiner Index = höhere Priorität). Kein `memory`, kein Lernen — für
// unverzerrte, gepaarte Ablationsläufe. `drop` = eine id, die NIE gewählt wird (Ablations-Kontrafaktum).
//
// Deterministisch: bei fehlender Priorität greift ein fester Fallback (erste zulässige Option), damit
// zwei Läufe mit demselben Seed nur an der ablatierten Stelle divergieren.
import { randomPolicy, canAddSkill } from "./random.js";
import { greedyFormationStep } from "../formation.js";
import { buyableOffers, shopTargetStep } from "../shop-policy.js";
import { perkOptionId, perkActionFor, shopOptionId } from "../families-policy.js";

// solveFormations/buyShop: realistischeres Starkspiel (Formations-Solver + Shop-Käufe). Default AUS:
// der Formations-Solver ist O(n²)·computeFormations je Formationsphase und für Massenläufe zu teuer
// (~0,3 s/Run statt ~ms). Opt-in via Batch-Flags (--formations/--shop) für fokussierte, kleinere Läufe.
// Bei Ablation MÜSSEN full und dropped dieselben Opts nutzen (faire, gepaarte Umgebung).
export function fixedPolicy(priority, { drop = null, solveFormations = false, buyShop = false } = {}) {
  const base = randomPolicy();
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
          // Perk-Angebot gemischt (#167): auf Options-IDs priorisieren/ablatieren, dann zurück auf Eintrag.
          if (s.offer) {
            const ids = s.offer.map(perkOptionId);
            const pickId = bestOf(ids) ?? ids.find((id) => id !== drop) ?? ids[0];
            return perkActionFor(s.offer[ids.indexOf(pickId)], rng);
          }
          return { type: "RESOLVE_TRICK", rng };
        }
        case "formation":
          return solveFormations ? greedyFormationStep(s) : base.act(s, rng);
        case "shop": {
          if (!buyShop) return base.act(s, rng);
          const buyable = buyableOffers(s).filter((o) => shopOptionId(o) !== drop);
          const pick = bestOf(buyable.map(shopOptionId)); // höchstpriorisierte kaufbare Shop-Option (Item/Familie)
          return pick
            ? { type: "BUY_ITEM", offerId: buyable.find((o) => shopOptionId(o) === pick).offerId, rng }
            : { type: "LEAVE_SHOP" }; // nichts aus dem Build kaufbar → verlassen (Build-fokussiert)
        }
        case "shop-target":
          return buyShop ? shopTargetStep(s, rng) : base.act(s, rng);
        default:
          return base.act(s, rng);
      }
    },
  };
}
