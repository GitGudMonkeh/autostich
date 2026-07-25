import * as C from "./constants.js";

/* ============================================================
   STAT-REGISTRY (V2 §22.3) — die vier Kern-Stats. Bei jeder Stat-Runde werden IMMER
   alle vier angeboten; der Spieler wählt genau einen. Additiv, keine Seltenheiten,
   keine Caps, keine Diminishing Returns, beliebig oft wählbar.

   Basiswerte (Startzustand): Crit-Chance 0 %, Crit-Multiplikator 1,5×, Score/Sieg 100.
   Jeder Pick addiert `step` auf das State-Feld `field`; die Engine liest die Summen.
   ============================================================ */
export const STAT_DEFS = {
  critChance: { id: "critChance", label: "Crit-Chance",           field: "statCritChance", step: C.STAT_CRIT_CHANCE_STEP, blurb: "+5 pp",      desc: "+5 Prozentpunkte Crit-Chance." },
  critMult:   { id: "critMult",   label: "Crit-Multiplikator",    field: "statCritMult",   step: C.STAT_CRIT_MULT_STEP,   blurb: "+0,2×",     desc: "+0,2× Crit-Multiplikator (auf Basis 1,5×)." },
  formMult:   { id: "formMult",   label: "Formations-Multiplikator", field: "statFormMult", step: C.STAT_FORM_MULT_STEP, blurb: "+5 %",       desc: "+5 % Score auf einen Sieg mit mindestens einer aktiven Formation (höchstens 1× pro Stich)." },
  streakMult: { id: "streakMult", label: "Serien-Multiplikator",  field: "statStreakMult", step: C.STAT_STREAK_MULT_STEP, blurb: "+2 %/Serie", desc: "+2 % Score pro aktuellem Serienpunkt." },
  // Einkommen (Shop-Spec §4) — additiv, stapelbar, kein Cap; gibt +3 Münzen bei JEDEM zukünftigen Shopbesuch je Pick.
  economy:    { id: "economy",    label: "Einkommen",             field: "economyStatLevel", step: C.STAT_ECONOMY_STEP,   blurb: "+3 Münzen",  desc: "+3 Münzen bei jedem zukünftigen Shopbesuch." },
};

// Reihenfolge des Angebots (immer alle Stats). Shop-Spec §4.3: fünf Stats inkl. Einkommen.
export const STAT_IDS = ["critChance", "critMult", "formMult", "streakMult", "economy"];

// Serien-Stat-Faktor auf den Stichscore: 1 + Σ(+2 %/Pick) × aktueller Serienpunkt, gedeckelt bei
// STREAK_STAT_CAP (Balance-Pass 1: war ungedeckelt → Runaway-Treiber bei langen Serien).
export const statStreakFactor = (statStreakMult, serieStreak) => 1 + Math.min((statStreakMult || 0) * (serieStreak || 0), C.STREAK_STAT_CAP);

// Formations-Stat-Faktor: 1 + Σ(+5 %/Pick), nur wenn der Stich eine aktive Formation trägt (ab Phase 3).
export const statFormFactor = (statFormMult, hasFormation) => (hasFormation ? 1 + (statFormMult || 0) : 1);
