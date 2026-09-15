// UCB-Explore-Policy (Sim S2). Wählt Stat/Perk/Skill über einen UCB1-Banditen aus dem Cross-Run-
// `memory`: mean(normalisierter Score) + c·√(ln N / n). Ungesehene Arme haben explore=∞ → werden
// sicher probiert (Coverage). Der Mittelwert-Term baut nebenbei die grobe Stärke-Rangliste.
//
// WICHTIG (docs/sim-harness-plan.md §7): UCB-Means = Coverage + grobe Rangliste, KEIN Urteil.
// Das echte Urteil liefert die Ablation (S3). Kontext-Bucket = aktive Archetypen (Perk-Wert ist
// kontextabhängig: Blitz-Konsument ohne Generator ist tot).
//
// Nicht-Angebots-Phasen (target/formation/shop/shop-target) delegiert die Policy an die Baseline —
// so bleibt S2 auf die Auswahl-Arme fokussiert; der Formations-/Shop-Ausbau kommt in S4.
import { randomPolicy, canAddSkill, atDoors, bestDoor } from "./random.js";
import { greedyFormationStep } from "../formation.js";
import { armKey } from "../memory.js";
import { perkOptionId, perkActionFor } from "../families-policy.js";

const DECLINE = "__decline__"; // Skill-Ablehnung als eigener Arm (auch „nichts nehmen" ist eine Entscheidung)
export const byArchetype = (s) => [...(s.activeArchetypes || [])].sort().join(",") || "none";

// solveFormations: optimiert auch im Explore die Aufstellung (Greedy-Solver). Wichtig für eine faire
// Bewertung formationszentrierter Archetypen (Eis: gratis Frosttausche + Joker-Formationen) — sonst wird
// Eis strukturell unterbewertet, weil der Explore ohne Formationsspiel nie einen guten Eis-Build sieht.
export function ucbPolicy({ c = 1.4, bucket = byArchetype, solveFormations = false } = {}) {
  const base = randomPolicy(); // Fallback für target/shop/shop-target

  // UCB-Wert eines Arms (nur lesen — legt keinen Arm an); ungesehen → ∞ (sicher probieren).
  const ucbOf = (kind, id, s, mem, N) => {
    const a = mem.peek(armKey(kind, id, bucket(s)));
    return a.n ? a.sum / a.n + c * Math.sqrt(Math.log(N) / a.n) : Infinity;
  };
  function ucbPick(kind, ids, s, mem) {
    const N = mem.totalPicks(kind) + 1;
    let best = null, bestU = -Infinity;
    for (const id of ids) {
      const u = ucbOf(kind, id, s, mem, N);
      if (u > bestU) { bestU = u; best = { id, key: armKey(kind, id, bucket(s)) }; }
    }
    mem.pulled(kind, best.key); // merken; Reward (Run-Score) bucht der Treiber am Run-Ende
    return best.id;
  }

  return {
    name: "ucb",
    act(s, rng, mem) {
      switch (s.phase) {
        case "levelup": {
          // exp skill rework: die Tür mit dem höchsten UCB-Arm dahinter (nur lesen, gezogen wird erst auf dem Angebot).
          if (atDoors(s)) {
            const N = mem.totalPicks("skill") + 1;
            return { type: "CHOOSE_DOOR", index: bestDoor(s, (ids) => Math.max(-Infinity, ...ids.filter((id) => canAddSkill(s, id)).map((id) => ucbOf("skill", id, s, mem, N)))) };
          }
          if (s.skillOffer) {
            const addable = s.skillOffer.filter((id) => canAddSkill(s, id));
            const cands = addable.length ? [...addable, DECLINE] : [DECLINE];
            const choice = ucbPick("skill", cands, s, mem);
            return choice === DECLINE ? { type: "DECLINE_SKILL", rng } : { type: "PICK_SKILL", skillId: choice, rng };
          }
          // Perk-Angebot gemischt (#167): über Options-IDs banditen, dann zurück auf Eintrag → PICK_PERK/PICK_FAMILY.
          if (s.offer) {
            const ids = s.offer.map(perkOptionId);
            const choice = ucbPick("perk", ids, s, mem);
            return perkActionFor(s.offer[ids.indexOf(choice)], rng);
          }
          return { type: "RESOLVE_TRICK", rng };
        }
        case "formation":
          return solveFormations ? greedyFormationStep(s) : base.act(s, rng);
        default:
          return base.act(s, rng); // target: Baseline-Verhalten
      }
    },
  };
}
