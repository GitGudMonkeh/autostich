/* PLATZHALTER DER LEKTIONSTEXTE — eine Liste, zwei Leser.

   Die Schale löst sie zur Anzeigezeit auf, der Wächter in test/tutorial-sections.test.js rechnet
   mit ihnen die Höhe einer Lektion nach. Zwei Kopien wären genau der Ort, an dem ein Wächter etwas
   anderes misst als der Leser sieht: das Modell rechnete mit „{skillsOffered}" (15 Zeichen), auf
   dem Schirm steht die Zahl (2). Über eine ganze Lektion sind das mehrere Zeilen Unterschied.

   NIE ABGETIPPT — text-style-guide.md §4. Ein hingeschriebenes „50 Durchläufe" ist beim nächsten
   Balancing still falsch. Alles hier kommt aus den Konstanten oder wird aus ihnen gezählt.

   Nur ganze Zahlen. Was ein Dezimaltrennzeichen oder eine Tausendertrennung braucht, hängt an der
   SPRACHE und kann deshalb nicht in einer Modulkonstante stehen — das steht in TutorialSections.jsx
   als `localeVars(locale)`. */
import * as C from "../../game/constants.js";
import { SEGMENT_SIZE, WECHSEL_MIN_DIFF, MAX_TREPPE_STEP } from "../../game/formations.js";
import { ENERGY_FLOOR, NODES } from "../../game/progression.js";

/* Wie oft welche Entscheidung im Lauf vorkommt — GEZÄHLT aus DECISION_SCHEDULE, nicht gesetzt.
   `shop` ist die Architekten-Phase; das steht so im Plan-Kommentar in constants.js. */
export function countSchedule(schedule = C.DECISION_SCHEDULE) {
  const n = { nSkill: 0, nPerk: 0, nForm: 0, nShop: 0, nLeg: 0 };
  const bucket = { skill: "nSkill", perk: "nPerk", formation: "nForm", shop: "nShop", legendary: "nLeg" };
  for (const d of schedule) if (bucket[d]) n[bucket[d]] += 1;
  return n;
}

export const VARS = {
  cards: C.TRICKS_PER_CYCLE, cycles: C.MAX_CYCLES, segment: SEGMENT_SIZE,
  /* ENERGY_FLOOR, NICHT C.FORMATION_ENERGY. Die Engine-Konstante ist 4 und gilt für Sim-, Standard-
     und Dev-Läufe; ein normaler Lauf mit Profil startet bei 3 und kommt über den Baum auf 5
     (progression.js §„Böden"). Der ausgelieferte Text sagte deshalb 4, wo der Spieler 3 hat —
     dieselbe Falle wie beim Baufeld, wo COVER_FLOOR 20 und ARCH_MAX_COVER 24 ist. */
  energy: ENERGY_FLOOR,
  energyMax: ENERGY_FLOOR + NODES.reduce((n, x) => n + (x.energy || 0), 0),
  cycle: C.LEG_PHASE_CYCLE, slots: C.SKILL_SLOTS,
  // Die Formationsregeln, die eine Lektion nennt. Aus formations.js, nie abgetippt.
  wechselDiff: WECHSEL_MIN_DIFF, treppeStep: MAX_TREPPE_STEP,
  segments: C.TRICKS_PER_CYCLE / SEGMENT_SIZE,
  suits: C.SUIT_ORDER.length, rankMin: C.RANKS[0], rankMax: C.RANKS[C.RANKS.length - 1],
  perksOffered: C.PERKS_OFFERED, skillsOffered: C.SKILLS_OFFERED,
  ...countSchedule(),
};

/* Was der Wächter zusätzlich braucht: die Zahlen mit Nachkomma, in ihrer LÄNGSTEN Schreibweise.
   Deutsch schreibt „2,25", Englisch „2.25" — gleich lang; die Tausendertrennung ist es ebenso.
   Für eine Höhenschätzung reicht deshalb eine Sprache, und Deutsch ist die längere Textsprache. */
export const MEASURE_VARS = {
  ...VARS,
  base: String(C.SCORE_PER_WIN),
  streakPct: String(Math.round(C.STREAK_BASE_STEP * 100)),
  critMult: C.CRIT_BASE_MULT.toFixed(2),
};
