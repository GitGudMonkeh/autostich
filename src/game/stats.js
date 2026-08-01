import * as C from "./constants.js";

/* ============================================================
   STAT-REGISTRY (V2 §22.3) — die vier Kern-Stats. Bei jeder Stat-Runde werden IMMER
   alle vier angeboten; der Spieler wählt genau einen. Additiv, keine Seltenheiten,
   keine Caps, keine Diminishing Returns, beliebig oft wählbar.

   Basiswerte (Startzustand): Crit-Chance 0 %, Crit-Multiplikator 1,5×, Score/Sieg 400 (#178 Pacing 100→400).
   Jeder Pick addiert `step` auf das State-Feld `field`; die Engine liest die Summen.
   ============================================================ */
// #151/desc-check.md: Tuning-Zahlen NICHT doppelt hartkodieren, sondern aus den Konstanten interpolieren
// (Text ↔ Code bleibt automatisch synchron). pp() = Prozentpunkte als ganze Zahl; de() formatiert deutsch (0,25 / 1,5).
const pp = (x) => Math.round(x * 100);
const de = (x) => String(x).replace(".", ",");

export const STAT_DEFS = {
  critChance: { id: "critChance", label: "Crit-Chance",           field: "statCritChance", step: C.STAT_CRIT_CHANCE_STEP, blurb: `+${pp(C.STAT_CRIT_CHANCE_STEP)} pp`,      desc: `+${pp(C.STAT_CRIT_CHANCE_STEP)} Prozentpunkte Crit-Chance.` },
  critMult:   { id: "critMult",   label: "Crit-Multiplikator",    field: "statCritMult",   step: C.STAT_CRIT_MULT_STEP,   blurb: `+${de(C.STAT_CRIT_MULT_STEP)}×`,    desc: `+${de(C.STAT_CRIT_MULT_STEP)}× Crit-Multiplikator (auf Basis ${de(C.CRIT_BASE_MULT)}×).` },
  formMult:   { id: "formMult",   label: "Formations-Multiplikator", field: "statFormMult", step: C.STAT_FORM_MULT_STEP, blurb: `+${pp(C.STAT_FORM_MULT_STEP)} %/Formation`, desc: `+${pp(C.STAT_FORM_MULT_STEP)} % Score je aktiver Formation an der Siegposition (mehrere gleichzeitige Formationen stapeln).` },
  streakMult: { id: "streakMult", label: "Serien-Multiplikator",  field: "statStreakMult", step: C.STAT_STREAK_MULT_STEP, blurb: `+${pp(C.STAT_STREAK_MULT_STEP)} %/Serie`, desc: `+${pp(C.STAT_STREAK_MULT_STEP)} % Score je aktuellem Serienpunkt (bis +${pp(C.STREAK_STAT_CAP)} %).` },
  // (Einkommen-Stat #229 entfernt — der Shop ist weg; es gibt keine Münzen mehr.)
};

// Reihenfolge des Angebots — die VIER angebotenen Kern-Stats (Einkommen entfernt → kommt beim Shop-Rework wieder).
export const STAT_IDS = ["critChance", "critMult", "formMult", "streakMult"];

// Serien-Stat-Faktor auf den Stichscore: 1 + Σ(+2 %/Pick) × aktueller Serienpunkt, gedeckelt bei
// STREAK_STAT_CAP (Balance-Pass 1: war ungedeckelt → Runaway-Treiber bei langen Serien).
export const statStreakFactor = (statStreakMult, serieStreak) => 1 + Math.min((statStreakMult || 0) * (serieStreak || 0), C.STREAK_STAT_CAP);

// Formations-Stat-Faktor: 1 + Σ(Step) × ANZAHL der Formationen an der Siegposition (Count-Skalierung —
// belohnt Formations-Builds mit MEHREREN gleichzeitigen/überlappenden Formationen je Sieg = echte
// Spezialisierung; 0 Formationen → neutral ×1). Boolean-Aufrufer bleiben numerisch gültig (true→1, false→0).
export const statFormFactor = (statFormMult, formCount) => 1 + (statFormMult || 0) * (formCount || 0);
