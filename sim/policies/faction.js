// Fraktions-biased Policy (Balance-Diagnose A). Baut eine möglichst REINE Fraktion — ODER eine gezielte
// Kombi aus 2–3 Fraktionen (Cross-Archetype) —, indem sie beim Skill-Angebot nur Skills der Ziel-Archetypen
// aufnimmt (sonst ablehnen → Perk-Angebot). Stat/Perk/Shop/Ziel-Flüsse laufen über die Random-Baseline; die
// FORMATIONSPHASE nutzt den Greedy-Solver (S4, greedyFormationStep) statt naivem CONFIRM — sonst werden
// formations-lastige Fraktionen (Eis-Architekt, Pflanze-Grünblöcke, Positions-Anker) massiv unterschätzt.
//
//   factionPolicy("fire")           → reine Fraktion (wie bisher)
//   factionPolicy(["fire","ice"])   → Kombi mit SLOT-SPLIT: bevorzugt beim Pick das Ziel mit den WENIGSTEN
//                                     aktuell gehaltenen Skills → balanciert (6 Slots: 2 Ziele → 3+3, 3 → 2+2+2).
import { archetypeOf, isLegendarySkill } from "../../src/game/skills.js";
import { randomPolicy, canAddSkill } from "./random.js";
import { greedyFormationStep } from "../formation.js";
import { isFamilyOffer, perkOptionId, perkActionFor } from "../families-policy.js";

// #267: Crit lebt jetzt in der Perk-FAMILIE „Präzision" (Kat. P) statt in der entfernten Stat-Phase. Angebotseinträge
// dieser Familien haben die Form { familyId, tier } mit familyId-Präfix "P_" (P_SHARPNESS/P_FORCE/P_AIM/P_LENS/P_COLORFOCUS).
const isPrecisionOffer = (e) => isFamilyOffer(e) && String(e.familyId).startsWith("P_");

// #267: die Architekt-Phase ist jetzt 12 von 45 Runden (großes Gewicht) — eine committete Fraktion baut ihre Gebäude
// GREEDY (Struktur-orientiert), nicht zufällig. Default architectGreedy:true bildet einen kompetenten Spieler ab;
// `factionPolicy(target, { architectGreedy:false })` fällt auf random-Platzierung zurück (greedy-vs-random-Vergleich).
// drop/prefer (v0.3): gepaarte Ablation IM Fraktionskontext. Nötig, weil manche Perks nur in einem committeten
// Build Sinn ergeben — „Meisterhand" (+1 Skill-Slot) misst sich mit der breit wählenden fixedPolicy negativ, weil
// die den Extra-Slot in einen DRITTEN Archetyp steckt und commitScale genau das bestraft. Ein Fraktionsspieler
// vertieft stattdessen. Ohne beide Optionen bleibt das Perk-Verhalten unverändert (Bestandsmessungen unberührt).
export function factionPolicy(target, { architectGreedy = true, drop = null, prefer = null } = {}) {
  const targets = Array.isArray(target) ? target : [target];
  const base = randomPolicy({ architectGreedy });
  const ablating = !!(drop || prefer);
  return {
    name: `faction:${targets.join("+")}${architectGreedy ? "+arch" : ""}${drop ? `(drop=${drop})` : prefer ? `(prefer=${prefer})` : ""}`,
    act(s, rng, mem) {
      if (s.phase === "levelup" && s.skillOffer) {
        // Nur Ziel-Archetyp-Skills, die in einen freien Slot passen (NIE einen Fremd-Archetyp aufnehmen).
        const addable = s.skillOffer.filter((id) => canAddSkill(s, id) && targets.includes(archetypeOf(id)));
        if (!addable.length) {
          // Eis-Neudesign: JEDER Eis-Skill-Pick (auch ERSETZEN) öffnet die Gletscher-Wahl → ein Eis-Spieler tauscht bei
          // vollen Slots weiter Eis-Skills, um mehr Gletscher zu sammeln. Für treue Eis-Balance modelliert (sonst
          // unterschätzt die Sim die echte Eis-Decke). Nur Eis; andere Fraktionen gewinnen durch Tauschen nichts → ablehnen.
          if (targets.includes("ice")) {
            const iceOffered = s.skillOffer.filter((id) => archetypeOf(id) === "ice" && !s.skills.includes(id));
            const iceHeld = s.skills.filter((id) => archetypeOf(id) === "ice" && !isLegendarySkill(id));
            if (iceOffered.length && iceHeld.length) {
              const drop = iceHeld[Math.floor(rng() * iceHeld.length)];
              return { type: "PICK_SKILL", skillId: iceOffered[Math.floor(rng() * iceOffered.length)], replaceId: drop, rng };
            }
          }
          return { type: "DECLINE_SKILL", rng };
        }
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
        // Ablations-Modus: DETERMINISTISCH wählen, damit zwei Arme auf demselben Seed nur an der ablatierten
        // Stelle divergieren (der Zufallsgriff unten würde schon durch das gefilterte Angebot anders ziehen).
        if (ablating) {
          const ids = s.offer.map(perkOptionId);
          const pickId = (prefer && ids.includes(prefer) && prefer !== drop)
            ? prefer
            : (ids.find((id) => id !== drop) ?? ids[0]);
          return perkActionFor(s.offer[ids.indexOf(pickId)], rng);
        }
        const prec = s.offer.filter(isPrecisionOffer);
        if (prec.length) return perkActionFor(prec[Math.floor(rng() * prec.length)], rng);
      }
      // Eis-Neudesign: nach jedem Eis-Skill-Pick friert genau 1 Karte fest (Phase "glacier-target"). Der Gletscher-Build
      // zielt auf einen 3×3-Cluster — über die (bis zu 7) Eis-Skill-Picks wird er der Reihe nach aufgebaut; ist der Cluster
      // voll/erschöpft, das erste freie Feld. Die Aufstellung läuft dann greedy (gelockte Felder sind unverschiebbar).
      if (s.phase === "glacier-target") {
        const cluster = [0, 1, 2, 5, 6, 7, 10, 11, 12];
        const next = cluster.find((p) => !(s.glacierLocked && s.glacierLocked[p]));
        const pos = next != null ? next : (s.glacierLocked || []).findIndex((v) => !v);
        return { type: "GLACIER_LOCK", pos: pos < 0 ? 0 : pos };
      }
      if (s.phase === "formation") return greedyFormationStep(s);
      // Skill-Ablehnung, Ziel, family-target (inkl. P_COLORFOCUS-Farbwahl), Architekt/Shop → Random-Baseline.
      return base.act(s, rng, mem);
    },
  };
}
