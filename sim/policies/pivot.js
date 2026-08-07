// ERKUNDUNG: „bank-then-pivot"-Policy. Modelliert den Skill-Ceiling-Move, den eine Fixed-Split-Policy NICHT sieht:
//   Phase 1 (cycle < pivotCycle): reines Mono `primary` → bankt permanente Gewinne (z. B. Pflanze-Kartenwert, gebacken).
//   Phase 2 (ab pivotCycle): baut `secondary` auf, indem primary-Skills ERSETZT werden — bis nur noch `keepPrimary`
//                            primary-Skills gehalten werden. keepPrimary=0 → voller Pivot (primary ganz raus; gebackener
//                            Wert bleibt, Grün/Wachstum gehen bei Deaktivierung verloren).
// Rest (Formation greedy, Gletscher-Ziel, Präzision-Perks) wie factionPolicy — apfel-zu-apfel.
import { archetypeOf, isLegendarySkill } from "../../src/game/skills.js";
import { randomPolicy, canAddSkill } from "./random.js";
import { greedyFormationStep } from "../formation.js";
import { isFamilyOffer, perkActionFor } from "../families-policy.js";

const isPrecisionOffer = (e) => isFamilyOffer(e) && String(e.familyId).startsWith("P_");

export function pivotPolicy(primary, secondary, { pivotCycle = 22, keepPrimary = 4, architectGreedy = true } = {}) {
  const base = randomPolicy({ architectGreedy });
  return {
    name: `pivot:${primary}->${secondary}@${pivotCycle}k${keepPrimary}`,
    act(s, rng, mem) {
      if (s.phase === "levelup" && s.skillOffer) {
        const heldPrimary = s.skills.filter((id) => archetypeOf(id) === primary && !isLegendarySkill(id));
        const offerAdd = (arch) => s.skillOffer.filter((id) => canAddSkill(s, id) && archetypeOf(id) === arch);

        if (s.cycle < pivotCycle) {
          // Phase 1 — reines Mono primary.
          const add = offerAdd(primary);
          if (add.length) return { type: "PICK_SKILL", skillId: add[Math.floor(rng() * add.length)], rng };
          // Eis bankt Gletscher: bei vollen Slots weiter Eis-Skills TAUSCHEN → jeder Pick friert eine weitere Karte (mehr Gletscher).
          if (primary === "ice") {
            const iceOffered = s.skillOffer.filter((id) => archetypeOf(id) === "ice" && !s.skills.includes(id));
            if (iceOffered.length && heldPrimary.length) {
              const drop = heldPrimary[Math.floor(rng() * heldPrimary.length)];
              return { type: "PICK_SKILL", skillId: iceOffered[Math.floor(rng() * iceOffered.length)], replaceId: drop, rng };
            }
          }
          return { type: "DECLINE_SKILL", rng };
        }

        // Phase 2 — Pivot auf secondary.
        const secOffered = s.skillOffer.filter((id) => archetypeOf(id) === secondary && !s.skills.includes(id));
        if (secOffered.length) {
          const pick = secOffered[Math.floor(rng() * secOffered.length)];
          if (s.skills.length < 6 && canAddSkill(s, pick)) return { type: "PICK_SKILL", skillId: pick, rng };
          // Slots voll → einen primary-Skill ersetzen, solange über keepPrimary.
          if (heldPrimary.length > keepPrimary) {
            const drop = heldPrimary[heldPrimary.length - 1];
            return { type: "PICK_SKILL", skillId: pick, replaceId: drop, rng };
          }
        }
        return { type: "DECLINE_SKILL", rng };
      }
      if (s.phase === "levelup" && s.offer) {
        const prec = s.offer.filter(isPrecisionOffer);
        if (prec.length) return perkActionFor(prec[Math.floor(rng() * prec.length)], rng);
      }
      if (s.phase === "glacier-target") {
        const cluster = [0, 1, 2, 5, 6, 7, 10, 11, 12];
        const next = cluster.find((p) => !(s.glacierLocked && s.glacierLocked[p]));
        const pos = next != null ? next : (s.glacierLocked || []).findIndex((v) => !v);
        return { type: "GLACIER_LOCK", pos: pos < 0 ? 0 : pos };
      }
      if (s.phase === "formation") return greedyFormationStep(s);
      return base.act(s, rng, mem);
    },
  };
}
