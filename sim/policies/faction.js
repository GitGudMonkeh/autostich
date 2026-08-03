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
import { isFamilyOffer, perkActionFor } from "../families-policy.js";

// #267: Crit lebt jetzt in der Perk-FAMILIE „Präzision" (Kat. P) statt in der entfernten Stat-Phase. Angebotseinträge
// dieser Familien haben die Form { familyId, tier } mit familyId-Präfix "P_" (P_SHARPNESS/P_FORCE/P_AIM/P_LENS/P_COLORFOCUS).
const isPrecisionOffer = (e) => isFamilyOffer(e) && String(e.familyId).startsWith("P_");

// #267: die Architekt-Phase ist jetzt 12 von 45 Runden (großes Gewicht) — eine committete Fraktion baut ihre Gebäude
// GREEDY (Struktur-orientiert), nicht zufällig. Default architectGreedy:true bildet einen kompetenten Spieler ab;
// `factionPolicy(target, { architectGreedy:false })` fällt auf random-Platzierung zurück (greedy-vs-random-Vergleich).
export function factionPolicy(target, { architectGreedy = true } = {}) {
  const targets = Array.isArray(target) ? target : [target];
  const base = randomPolicy({ architectGreedy });
  return {
    name: `faction:${targets.join("+")}${architectGreedy ? "+arch" : ""}`,
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
      // Perk-Angebot (#267): eine angebotene Präzision-Crit-Familie (P_*) IMMER greifen → Crit taucht in Fraktionsläufen auf.
      // PICK_FAMILY dispatcht perkActionFor → {type:"PICK_FAMILY", familyId, tier, rng}; P_COLORFOCUS trägt pickTarget.suits,
      // der Reducer wechselt dann in die "family-target"-Phase, die die Random-Baseline unten deterministisch füllt
      // (familyTargetStep: FAMILY_TARGET_SUIT je Farbe, dann FAMILY_TARGET_CONFIRM). Sonst normales Baseline-Perk-Verhalten.
      if (s.phase === "levelup" && s.offer) {
        const prec = s.offer.filter(isPrecisionOffer);
        if (prec.length) return perkActionFor(prec[Math.floor(rng() * prec.length)], rng);
      }
      // Aufstellung aktiv lösen (S4-Solver) statt naiv bestätigen → Eis/Pflanze/Anker fair abgebildet.
      if (s.phase === "formation") return greedyFormationStep(s);
      // Skill-Ablehnung, Ziel, family-target (inkl. P_COLORFOCUS-Farbwahl), Architekt/Shop → Random-Baseline.
      return base.act(s, rng, mem);
    },
  };
}
