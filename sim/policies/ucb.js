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
import { randomPolicy, canAddSkill } from "./random.js";
import { buyableOffers, shopTargetStep } from "../shop-policy.js";
import { greedyFormationStep } from "../formation.js";
import { armKey } from "../memory.js";

const DECLINE = "__decline__"; // Skill-Ablehnung als eigener Arm (auch „nichts nehmen" ist eine Entscheidung)
const SHOP_LEAVE = "__leave__"; // Shop verlassen als eigener Arm (Nicht-Kauf ist auch eine Entscheidung)
export const byArchetype = (s) => [...(s.activeArchetypes || [])].sort().join(",") || "none";

// solveFormations: optimiert auch im Explore die Aufstellung (Greedy-Solver). Wichtig für eine faire
// Bewertung formationszentrierter Archetypen (Eis: gratis Frosttausche + Joker-Formationen) — sonst wird
// Eis strukturell unterbewertet, weil der Explore ohne Formationsspiel nie einen guten Eis-Build sieht.
export function ucbPolicy({ c = 1.4, bucket = byArchetype, solveFormations = false } = {}) {
  const base = randomPolicy(); // Fallback für target/shop/shop-target

  function ucbPick(kind, ids, s, mem) {
    const N = mem.totalPicks(kind) + 1;
    let best = null, bestU = -Infinity;
    for (const id of ids) {
      const key = armKey(kind, id, bucket(s));
      const a = mem.peek(key); // nur lesen — legt keinen Arm an
      const mean = a.n ? a.sum / a.n : 0;
      const explore = a.n ? c * Math.sqrt(Math.log(N) / a.n) : Infinity; // ungesehen → sicher probieren
      const u = mean + explore;
      if (u > bestU) { bestU = u; best = { id, key }; }
    }
    mem.pulled(kind, best.key); // merken; Reward (Run-Score) bucht der Treiber am Run-Ende
    return best.id;
  }

  return {
    name: "ucb",
    act(s, rng, mem) {
      switch (s.phase) {
        case "levelup": {
          if (s.statOffer) return { type: "PICK_STAT", statId: ucbPick("stat", s.statOffer, s, mem) };
          if (s.skillOffer) {
            const addable = s.skillOffer.filter((id) => canAddSkill(s, id));
            const cands = addable.length ? [...addable, DECLINE] : [DECLINE];
            const choice = ucbPick("skill", cands, s, mem);
            return choice === DECLINE ? { type: "DECLINE_SKILL", rng } : { type: "PICK_SKILL", skillId: choice, rng };
          }
          if (s.offer) return { type: "PICK_PERK", perkId: ucbPick("perk", s.offer, s, mem), rng };
          return { type: "RESOLVE_TRICK", rng };
        }
        case "shop": {
          // UCB über {jetzt kaufbare Item-ids} + „verlassen". So bekommt jedes Shop-Item einen eigenen Arm.
          const buyable = buyableOffers(s);
          if (!buyable.length) return { type: "LEAVE_SHOP" };
          const cands = [...new Set(buyable.map((o) => o.itemId)), SHOP_LEAVE];
          const choice = ucbPick("shopitem", cands, s, mem);
          if (choice === SHOP_LEAVE) return { type: "LEAVE_SHOP" };
          return { type: "BUY_ITEM", offerId: buyable.find((o) => o.itemId === choice).offerId, rng };
        }
        case "shop-target":
          return shopTargetStep(s); // Ziel-Fluss deterministisch füllen (S4)
        case "formation":
          return solveFormations ? greedyFormationStep(s) : base.act(s, rng);
        default:
          return base.act(s, rng); // target: Baseline-Verhalten
      }
    },
  };
}
