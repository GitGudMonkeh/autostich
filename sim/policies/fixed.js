// Fixed-Policy (Sim S3, Eval-Modus): wählt aus jedem Angebot die höchstpriorisierte Option gemäß
// `priority` (geordnete id-Liste, kleiner Index = höhere Priorität). Kein `memory`, kein Lernen — für
// unverzerrte, gepaarte Ablationsläufe. `drop` = eine id, die NIE gewählt wird (Ablations-Kontrafaktum).
//
// Deterministisch: bei fehlender Priorität greift ein fester Fallback (erste zulässige Option), damit
// zwei Läufe mit demselben Seed nur an der ablatierten Stelle divergieren.
import { randomPolicy, canAddSkill, atDoors, bestDoor } from "./random.js";
import { greedyFormationStep, frontLoadFormationStep } from "../formation.js";
import { perkOptionId, perkActionFor } from "../families-policy.js";
import { VABANQUE_TRICKS } from "../../src/game/constants.js";

// solveFormations/buyShop: realistischeres Starkspiel (Formations-Solver + Shop-Käufe). Default AUS:
// der Formations-Solver ist O(n²)·computeFormations je Formationsphase und für Massenläufe zu teuer
// (~0,3 s/Run statt ~ms). Opt-in via Batch-Flags (--formations/--shop) für fokussierte, kleinere Läufe.
// Bei Ablation MÜSSEN full und dropped dieselben Opts nutzen (faire, gepaarte Umgebung).
//
// frontLoad: statt des Formations-Solvers den Eröffnungs-Missbrauchsfall fahren (stärkste Karten nach vorn,
//   s. frontLoadFormationStep). Schließt solveFormations aus — beide belegen die Formationsphase.
// gate { id, fromCycle }: `id` ist vor Durchlauf `fromCycle` nicht wählbar. Damit lässt sich der EINFLUSS DES
//   PICK-ZEITPUNKTS messen (früh vs. spät erworben) — bei gedeckelten oder früh-lastigen Perks ist das ein
//   eigener Balance-Hebel und nicht aus dem Gesamt-Marginalwert ablesbar.
// architectGreedy: die Architekt-Phase mit der planenden Greedy-Policy statt zufällig bauen. Default AUS (Bestand),
//   ABER für alles Gebäude-Bezogene Pflicht: mit Zufallsbau werden Strukturen kaum geschlossen und der Baufeld-Deckel
//   nie erreicht → Gebäude-Perks (Richtfest/Bauhütte, Familien mit needsArchitect) messen sich systematisch auf 0.
// exclude: ids, die NIE gewählt werden (mehrere Ablationen zugleich — z. B. „Feuer ohne jeden Hitze-Verstärker").
export function fixedPolicy(priority, { drop = null, exclude = [], solveFormations = false, frontLoad = false, gate = null, architectGreedy = false } = {}) {
  const base = randomPolicy({ architectGreedy });
  const rank = new Map(priority.map((id, i) => [id, i]));
  const openTricks = typeof frontLoad === "number" ? frontLoad : VABANQUE_TRICKS;
  const never = new Set([drop, ...(exclude || [])].filter(Boolean));
  // Gesperrt = ablatiert (drop/exclude) ODER durch das Pick-Zeitfenster (gate) noch nicht freigegeben.
  const blocked = (id, s) => never.has(id) || (!!gate && id === gate.id && (s.cycle || 0) < gate.fromCycle);
  const bestOf = (ids, s) => {
    let best = null, bestR = Infinity;
    for (const id of ids) {
      if (blocked(id, s)) continue;
      const r = rank.has(id) ? rank.get(id) : Infinity;
      if (r < bestR) { bestR = r; best = id; }
    }
    return best; // null, wenn keine id priorisiert (dann Fallback beim Aufrufer)
  };
  const tag = [drop && `drop=${drop}`, exclude && exclude.length && `exclude=${exclude.length}`, gate && `gate=${gate.id}@${gate.fromCycle}`, frontLoad && "frontload"].filter(Boolean).join(",");
  return {
    name: tag ? `fixed(${tag})` : "fixed",
    act(s, rng) {
      switch (s.phase) {
        case "levelup": {
          // exp skill rework: die Tür mit dem bestpriorisierten wählbaren Skill (kleinster Rang gewinnt); nichts priorisiert →
          // die erste Tür mit einem wählbaren Skill, sonst Tür 0. Deterministisch, damit Ablationspaare nur an der Ablation divergieren.
          if (atDoors(s)) return { type: "CHOOSE_DOOR", index: bestDoor(s, (ids) => {
            const ok = ids.filter((id) => !blocked(id, s) && canAddSkill(s, id));
            if (!ok.length) return -Infinity;
            return -Math.min(...ok.map((id) => (rank.has(id) ? rank.get(id) : Infinity)));
          }) };
          if (s.skillOffer) {
            const addable = s.skillOffer.filter((id) => !blocked(id, s) && canAddSkill(s, id));
            const pick = bestOf(addable, s) ?? addable[0];
            return pick ? { type: "PICK_SKILL", skillId: pick, rng } : { type: "DECLINE_SKILL", rng };
          }
          // Perk-Angebot gemischt (#167): auf Options-IDs priorisieren/ablatieren, dann zurück auf Eintrag.
          if (s.offer) {
            const ids = s.offer.map(perkOptionId);
            const pickId = bestOf(ids, s) ?? ids.find((id) => !blocked(id, s)) ?? ids[0];
            return perkActionFor(s.offer[ids.indexOf(pickId)], rng);
          }
          return { type: "RESOLVE_TRICK", rng };
        }
        case "formation":
          if (frontLoad) return frontLoadFormationStep(s, openTricks);
          return solveFormations ? greedyFormationStep(s) : base.act(s, rng);
        default:
          return base.act(s, rng);
      }
    },
  };
}
