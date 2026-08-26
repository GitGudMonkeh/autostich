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
import { SEGMENT_SIZE, WECHSEL_MIN_DIFF, MAX_TREPPE_STEP, ESKALATION_STEP, WIED_STEP } from "../../game/formations.js";
import { ENERGY_FLOOR, COVER_FLOOR, NODES, SP_PER_RUN, SP_LOYALTY_EVERY, SP_LOYALTY_SP, WELCOME_DP } from "../../game/progression.js";
import { ARCHITECT_FAMILIES, tierNum, DISTRICT_BONUS, DISTRICT_CAP, ROWS, HAEUSERZEILE_FACTOR, SPALTE_FACTOR } from "../../game/architect.js";
import { FAMILY_DEFS } from "../../game/families.js";
import { THRESHOLDS, TIER_MULT, BURST_AT, WIN_MASS, EWIGER_FROST, DECLINE_MIN_SKILLS } from "../../game/glacier.js";

/* Der Grundwert eines Gebäudes steckt in einem OBJEKT, nicht in einer Zahl: `{ kind: "flat",
   score: 35 }` bei Score-Gebäuden, `{ kind: "flat", value: 1 }` bei Wert-Gebäuden. */
const basis = (id) => {
  const f = ARCHITECT_FAMILIES[id];
  return f ? (f.base?.score ?? f.base?.value ?? 0) : 0;
};
/* Die Stufenwerte der beiden Gebäude, die die Tabelle in „Deine Hauptaktion" zeigt — GERECHNET
   mit `tierNum`, nicht abgetippt. Verschiebt ein Balancing TIER_FACTOR oder den Grundwert, wandert
   die Tabelle mit. */
const stufen = (id, praefix) => Object.fromEntries(
  [1, 2, 3, 4].map((t) => [praefix + t, tierNum(basis(id), t)]));

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
  rows: ROWS,
  // Baufeld wie Energie: der Boden steht in progression.js, nicht in der Engine-Konstante.
  cover: COVER_FLOOR,
  coverMax: COVER_FLOOR + NODES.reduce((n, x) => n + (x.cover || 0), 0),
  firstShop: C.DECISION_SCHEDULE.indexOf("shop") + 1,
  districtPct: Math.round(DISTRICT_BONUS * 100), districtCap: DISTRICT_CAP,
  ...stufen("A_ZOLLHAUS", "zoll"), ...stufen("A_KONTOR", "kontor"),
  /* Die Namen selbst, fuer den Hoehenwaechter. Die Anzeige holt sie über das Register in der
     aktiven Sprache (TutorialSections.jsx); hier steht die deutsche Form, weil das Modell die
     LAENGE braucht und Deutsch die längere der beiden gemessenen Sprachen ist. */
  segWork: FAMILY_DEFS.E_SEGMENT?.name ?? "",
  pillar: ARCHITECT_FAMILIES.A_PFEILER?.name ?? "",
  zollhaus: ARCHITECT_FAMILIES.A_ZOLLHAUS?.name ?? "",
  kontor: ARCHITECT_FAMILIES.A_KONTOR?.name ?? "",
  // Perk-Familien: GEZAEHLT, damit die Zahl mitwandert, wenn eine Familie dazukommt.
  perkFamilies: Object.keys(FAMILY_DEFS).length,
  /* Blitz. Der erste Skill gibt Sockel PLUS Beitrag, jeder weitere nur den Beitrag — deshalb 13
     und 8, und deshalb steht hier eine Rechnung und keine abgetippte Zahl. */
  critFirst: Math.round((C.LIGHTNING_CRIT_BASE + C.LIGHTNING_CRIT_PER_SKILL) * 100),
  critPerSkill: Math.round(C.LIGHTNING_CRIT_PER_SKILL * 100),
  charge: C.LIGHTNING_MAX_CHARGE,
  ionMax: C.ION_MAX_STACKS, ionCap: C.ION_CRIT_STACK_CAP,
  ionCapPct: Math.round(C.ION_CRIT_STACK_CAP * C.ION_CRIT_PP_PER_STACK * 100),
  // Feuer
  heatMax: C.HEAT_MAX, heatMinMargin: C.HEAT_MIN_MARGIN, heatLossMax: C.HEAT_LOSS_MAX,
  firePerSkill: C.FIRE_SCORE_PER_SKILL, dividendCap: C.FIRE_DIVIDEND_HEAT_CAP,
  glowT1: C.GLOWING_T1_HEAT, glowT2: C.GLOWING_T2_HEAT, glowT3: C.GLOWING_T3_HEAT,
  glowV1: C.GLOWING_T1_VALUE, glowV2: C.GLOWING_T2_VALUE, glowV3: C.GLOWING_T3_VALUE,
  forgeCost: C.FORGE_COST, forgeValue: C.FORGE_VALUE, brandAsh: C.BRAND_ASH,
  // Pflanze
  plantGreen: C.PLANT_GREEN_THRESHOLD, plantCap: C.PLANT_VALUE_CAP,
  plantSkillRef: C.PLANT_GROWTH_SKILL_REF, plantPerValue: C.WURZELSCHLAG_PER_GROWTH,
  // Der Zuwachs je Schritt ist eins; als Platzhalter, weil im Text keine Ziffer stehen darf.
  plantPerValue2: 1,
  // Eis
  massBurst: BURST_AT, massT1: THRESHOLDS[0], massT2: THRESHOLDS[1], massT3: THRESHOLDS[2],
  iceWin: WIN_MASS, iceTick: EWIGER_FROST, iceDeclineMin: DECLINE_MIN_SKILLS,
  // Nach dem Lauf
  spPerRun: SP_PER_RUN, loyaltyEvery: SP_LOYALTY_EVERY, loyaltySp: SP_LOYALTY_SP, welcomeDp: WELCOME_DP,
  // Fortgeschritten: die Vorsprungs-Schwellen der Gluehenden Klinge
  glowM2: C.GLOWING_T2_MARGIN, glowM3: C.GLOWING_T3_MARGIN,
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
  critMultPerSkill: C.LIGHTNING_CRIT_MULT_PER_SKILL.toFixed(1),
  wucht1: TIER_MULT[1].toFixed(1), wucht2: TIER_MULT[2].toFixed(1), wucht3: TIER_MULT[3].toFixed(1),
  /* Die vier Faktoren der Glut-Lektion. Der verstärkte ist GERECHNET:
     1 + (Struktur − 1) × FIRE_STRUCT_DIVIDEND_AMP. Wandert das Balancing, wandert der Text mit. */
  rowFactor: "×" + HAEUSERZEILE_FACTOR.toFixed(2),
  colFactor: "×" + SPALTE_FACTOR.toFixed(2),
  rowAmp: "×" + (1 + (HAEUSERZEILE_FACTOR - 1) * C.FIRE_STRUCT_DIVIDEND_AMP).toFixed(2),
  colAmp: "×" + (1 + (SPALTE_FACTOR - 1) * C.FIRE_STRUCT_DIVIDEND_AMP).toFixed(2),
  eskStep: ESKALATION_STEP.toFixed(2), wiedStep: WIED_STEP.toFixed(2),
};
