/* ============================================================
   TUNING-BLOCK  — hier dreht der Dev im Playtest
   ============================================================ */
export const START_LIFE       = 2000;   // Leben = Run-Timer [TUNING]
export const DMG_PER_LOSS     = 10;     // Basis-Schaden je Niederlage (Stufe 0) [TUNING]
// Anti-Infinity (#32): Niederlagenkosten eskalieren mit der AKTIVEN Laufzeit — Basis 10,
// +5 je 5 Minuten, ungedeckelt (0–5min→10, 5–10→15, 10–15→20, 15–20→25 …). Beide tunbar.
export const LOSS_COST_STEP     = 5;               // +Schaden je Stufe [TUNING]
export const LOSS_COST_STEP_MS  = 5 * 60 * 1000;   // Stufenlänge: 5 Min aktiver Spielzeit [TUNING]
export const XP_PER_WIN       = 10;     // XP je gewonnenem Stich [TUNING]
export const SCORE_PER_WIN    = 100;    // Basispunkte je Sieg (Perks/Tempo skalieren darauf) [TUNING]
export const TEMPO_SCORE_FACTOR = 0.005; // je %-Punkt speedPct +0,5 % Stichscore [TUNING]
export const CRIT_BASE_MULT   = 2;      // Crit verdoppelt den Stichscore [TUNING]
export const PERKS_OFFERED    = 3;      // Perks pro Level-Up-Auswahl [TUNING]
// TRICKS_PER_CYCLE wird weiter unten aus der Deckgröße abgeleitet (SUIT_ORDER × RANKS, #34) — kein Drift.

// Score-Perk-Magnituden (Kategorie D) [TUNING]
export const D1_BONUS_PCT = 15;   // D1  +15 % Score je Sieg
export const D2_STEP      = 0.10; // D2  Siegesserie: +10 % je Serien-Stufe, eskalierend — KEIN Cap (#31)
export const D3_HIGH_MIN  = 8;    // gemeinsame „hohe Karte"-Schwelle für D3, C2 & D7 (#34: 10→8 auf Skala 1–10)
export const D3_BONUS     = 60;   // D3  Flat-Bonus
export const D4_LOW_MAX   = 3;    // D4  „Außenseiter" bis zu diesem Wert
export const D4_MULT      = 3;    // D4  Score-Faktor
export const D5_BONUS     = 300;  // D5  jeder 10. Sieg: Flat-Bonus

// Legendäre Perks & Raritäts-System (#33) [TUNING]
export const RARITY_WEIGHTS            = { common: 100, legendary: 8 }; // Ziehgewichte je Seltenheit
export const LEGENDARY_MIN_LEVEL       = 5;    // Legendaries erst ab diesem Level im Angebot
export const MAX_LEGENDARIES_PER_OFFER = 1;    // höchstens so viele Legendaries je Angebot
export const L4_CRIT_STEP = 0.01;  // L4 Kritische Masse: +1 pp Crit-Chance je Crit
export const L4_CRIT_CAP  = 0.30;  // L4  … dauerhaft gedeckelt bei +30 pp

// Geist (Rekord-Vergleich): Score-Stützstelle alle N Stiche [TUNING]
export const GHOST_STEP = 13;

// Werte dürfen unbegrenzt über 10 steigen (Design-Entscheid: Deck-Mods sollen den
// Gegner-Maximalwert überbieten können) — kein Cap.
export const VALUE_CAP = null;

// Tempo — Basis „langsam" ist fest; Beschleunigung nur über die Tempo-Perks (E-Linie,
// speedPct), kein manueller Regler (#2, Design-Doc §5.3).
export const BASE_FLIP_MS = 1750;   // ms je Stich bei 0 % Speed (Basis-Tempo, etwas flotter; Turbo/Perks oben drauf) [TUNING]

// Anti-Infinity (#32): Stufe & Schaden für eine gegebene AKTIVE Laufzeit. Pure Funktionen im
// game/-Layer (Determinismus-Invariante: kein Date/Wall-Clock hier — elapsedMs wird injiziert,
// analog zum rng-Payload). App.jsx reicht lossCostFor(elapsedMs) in die RESOLVE_TRICK-Action.
export const lossTierFor = (elapsedMs) => Math.floor(Math.max(0, elapsedMs) / LOSS_COST_STEP_MS);
export const lossCostFor = (elapsedMs) => DMG_PER_LOSS + LOSS_COST_STEP * lossTierFor(elapsedMs);

/* ============================================================
   DECK / FARBEN
   ============================================================ */
export const SUITS = {
  R: { key: "R", name: "Rot",  color: "#e0605a" },
  B: { key: "B", name: "Blau", color: "#5a8ade" },
  G: { key: "G", name: "Grün", color: "#5ab87a" },
  Y: { key: "Y", name: "Gelb", color: "#d4a63a" },
};
export const SUIT_ORDER = ["R", "B", "G", "Y"];
export const RANKS = Array.from({ length: 10 }, (_, i) => i + 1); // 1..10 (#34: 40 Karten, keine schwache 0)
// Stiche je Deck-Durchlauf = Deckgröße (4 Farben × 10 Werte = 40). Abgeleitet → folgt RANKS automatisch (#34).
export const TRICKS_PER_CYCLE = SUIT_ORDER.length * RANKS.length;
export const suitName  = (s) => (s ? SUITS[s].name : "—");
export const suitColor = (s) => (s ? SUITS[s].color : "#888");
