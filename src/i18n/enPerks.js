/* ============================================================
   PERK CATALOG — ENGLISH. Legendary perks + perk categories.
   Mirrors src/game/perks.js; the numbers are the SAME expressions, never typed out
   (see enSkills.js for the reasoning and the guard that enforces it).

   Terminology (§3.5): perk · category · trick value · card value · margin · streak ·
   crit chance / crit multiplier · structure · build space · segment · suit streak.
   ============================================================ */
import * as C from "../game/constants.js";

const num = (x) => String(x);
const pct = (x) => Math.round(x * 100);
const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export default {
  /* ---- Perk categories (chips on the offer cards — keep the names SHORT) ---- */
  "perkcat.A.name": "Deck",
  "perkcat.A.desc": "Permanent card values",
  "perkcat.B.name": "Trick",
  "perkcat.B.desc": "Trick effects",
  "perkcat.C.name": "Role",
  "perkcat.C.desc": "Card roles",
  "perkcat.D.name": "Score",
  "perkcat.D.desc": "Score",
  "perkcat.E.name": "Form",
  "perkcat.E.desc": "Formation tools",
  "perkcat.P.name": "Precision",
  "perkcat.P.desc": "Crit chance & crit multiplier",

  /* ---- Legendary perks ---- */
  "perk.L2.label": "Unstoppable",
  "perk.L2.desc": `While you keep winning, the next card gets +${C.UNAUFHALTSAM_VALUE} trick value (until you lose).`,
  "perk.L6.label": "Frenzy",
  "perk.L6.desc": `Every win in a row gives +${pct(C.RASEREI_CRIT_STEP)}% crit chance. If your total crit chance passes 100%, the surplus also raises the crit multiplier: +0.01× per percentage point above, at most +1.00×.`,
  "perk.L4.label": "Critical Mass",
  "perk.L4.desc": `Every crit permanently gives that card +1 card value (at most +${C.KRITMASSE_VALUE}).`,
  "perk.L_UMV.label": "Redistribution",
  "perk.L_UMV.desc": "Immediately: every card permanently takes on the deck's average card value (no card is removed). Strong on a lopsided deck.",
  "perk.L_ZINS.label": "Compound Interest",
  "perk.L_ZINS.desc": `The bank: every trick you win puts ${pct(C.ZINS_DEPOSIT)}% of its score into the capital. If a cycle ends with at least ${pct(C.ZINS_HURDLE_RATE)}% wins, it pays out capital × interest rate and the rate rises by ${pct(C.ZINS_RATE_STEP)} percentage points (starting at ${pct(C.ZINS_RATE_START)}%, at most ${pct(C.ZINS_RATE_MAX)}%) — the capital stays. Miss the quota and the account crashes: ${pct(1 - C.ZINS_CRASH_KEEP)}% of the capital is gone and the rate drops back by ${pct(C.ZINS_RATE_STEP * C.ZINS_CRASH_STEPS)} percentage points.`,
  "perk.L_VAB.label": "All In",
  "perk.L_VAB.desc": `Opening bet: win the first ${C.VABANQUE_TRICKS} tricks of a cycle in a row and you get +${grp(C.VABANQUE_SCORE)} score (up to ${C.VABANQUE_MAX_PAYOUTS} times per run).`,
  "perk.L_HENK.label": "Executioner",
  "perk.L_HENK.desc": `In the last segment (positions ${C.HENKER_ZONE_START + 1}–40) every win counts ${num(C.HENKER_MULT)}× and is a guaranteed crit.`,
  "perk.L_ECHO.label": "Echo",
  "perk.L_ECHO.desc": `At the end of every cycle, your highest-scoring trick of that cycle is credited once more at ×${num(C.ECHO_FACTOR)}.`,
  "perk.L_SAMM.label": "Collector",
  "perk.L_SAMM.desc": `Every distinct formation type that wins during a cycle (at most ${C.SAMMLER_MAX}) gives +${num(C.SAMMLER_STEP)} formation multiplier for the rest of that cycle.`,
  "perk.L_BRENN.label": "Focal Point",
  "perk.L_BRENN.desc": `When a card wins inside at least ${C.BRENNPUNKT_MIN_FORMS} formations at once, the trick counts ×${num(C.BRENNPUNKT_MULT)}.`,
  "perk.L_PATT.label": "Stalemate",
  "perk.L_PATT.desc": `A loss by ${C.PATT_MARGIN} value or less counts as a win instead.`,
  "perk.L_MONO.label": "Monochrome",
  "perk.L_MONO.desc": `Consecutive wins in the same suit: +${pct(C.MONOCHROM_STEP)}% score per follow-up win, at most +${pct(C.MONOCHROM_CAP)}%. A change of suit or a loss resets the suit streak.`,
  "perk.L_RICHT.label": "Topping Out",
  "perk.L_RICHT.desc": `+${C.RICHTFEST_STEP} permanent score per completed structure (full row, column or diagonal). The accumulated bonus is paid out flat at the end of every cycle — without a multiplier.`,
  "perk.L_BAUH.label": "Masons' Lodge",
  "perk.L_BAUH.desc": `Immediately: the Architect's build space permanently grows by ${C.BAUHUETTE_COVER} cells — you can place more buildings.`,
};
