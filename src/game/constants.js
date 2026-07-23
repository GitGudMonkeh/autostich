/* ============================================================
   TUNING-BLOCK  — hier dreht der Dev im Playtest
   ============================================================ */
export const START_LIFE       = 2000;   // Leben = Run-Timer [TUNING]
export const DMG_PER_LOSS     = 2;      // Basis-Schaden je Niederlage im 1. Durchlauf — sanfter Auftakt (#87) [TUNING]
// Anti-Infinity (#87, cycle-basiert, Umbau von #85/#59): der ZUSATZSCHADEN PRO NIEDERLAGE eskaliert je
// Deck-DURCHLAUF (nicht Echtzeit) → Tempo/Turbo beeinflusst den Score nicht mehr. Aufschlag = round(0,5·n²),
// n = cycle (0-indiziert): +0, +0, +2, +5, +8, +13, +18 … kein Cap. Ziel: Run-Bogen über ~20 Durchläufe.
// Voll deterministisch — die Engine leitet n aus `cycle` ab (kein Date, kein App-Payload nötig).
export const LIFE_DRAIN_BASE        = 0.5;             // Aufschlag pro Niederlage = round(LIFE_DRAIN_BASE · cycle²) [TUNING]
export const XP_PER_WIN       = 10;     // XP je gewonnenem Stich [TUNING]
export const SCORE_PER_WIN    = 100;    // Basispunkte je Sieg (Perks/Tempo skalieren darauf) [TUNING]
export const TEMPO_SCORE_FACTOR = 0.005; // je %-Punkt speedPct +0,5 % Stichscore [TUNING]
export const CRIT_BASE_MULT   = 2;      // Crit verdoppelt den Stichscore [TUNING]
export const PERKS_OFFERED    = 3;      // Perks pro Level-Up-Auswahl [TUNING]
// TRICKS_PER_CYCLE wird weiter unten aus der Deckgröße abgeleitet (SUIT_ORDER × RANKS, #34) — kein Drift.

// Score-Perk-Magnituden (Kategorie D) [TUNING]
export const D1_BONUS_PCT = 15;   // D1  +15 % Score je Sieg
export const D2_STEP      = 0.10; // D2  Siegesserie: +10 % je Serien-Stufe, eskalierend — KEIN Cap (#31)
// Basis-Siegesserie (#39): jede Serie hebt den Score-Mult leicht — AUCH ohne D2. D2 verstärkt zusätzlich.
export const STREAK_BASE_STEP = 0.02; // +2 % je Serienstufe [TUNING]
export const STREAK_BASE_CAP  = 0.30; // … gedeckelt bei +30 % [TUNING]
export const D3_HIGH_MIN  = 8;    // gemeinsame „hohe Karte"-Schwelle für D3, C2 & D7 (#34: 10→8 auf Skala 1–10)
export const D3_BONUS     = 60;   // D3  Flat-Bonus
export const D4_LOW_MAX   = 3;    // D4  „Außenseiter" bis zu diesem Wert
export const D4_MULT      = 3;    // D4  Score-Faktor
export const D5_BONUS     = 300;  // D5  jeder 10. Sieg: Flat-Bonus

// Seltene Per-Durchlauf-Perks (#71 Phase 2d) [TUNING]
export const SURVIVAL_PER_CARD  = 4;   // C7 Überlebensvorteil: Heilung je eigener Karte mit hohem Wert …
export const SURVIVAL_MIN_VALUE = 13;  // …          … ab diesem Kartenwert
export const SURVIVAL_CAP       = 60;  // …          … gedeckelt je Durchlauf
export const CLEAN_RUN_HEAL     = 15;  // C8 Sauberer Durchlauf: Heilung nach …
export const CLEAN_RUN_TRICKS   = 10;  // …          … so vielen Stichen in Folge ohne echten Lebensverlust
export const SACRIFICE_LIFE     = 30;  // C9 Opfergabe: Leben-Kosten je Durchlauf-Beginn (kann nicht töten)
export const SACRIFICE_SCORE_MULT = 1.20; // C9 …    … dafür +20 % Score, solange gehalten
export const EMERGENCY_HEAL     = 40;  // C10 Notfallration: Sofortheilung, 1× je Durchlauf bei ≤25 % Leben

// Seltene Tempo/Crit-Perks (#71 Phase 2e) [TUNING]
export const RAMP_TEMPO_STEP = 2;   // E9 Hochlauf: +% temporäres Tempo je Sieg …
export const RAMP_TEMPO_CAP  = 40;  // …          … gedeckelt
export const RAMP_TEMPO_LOSS = 10;  // …          … Abzug je Niederlage
export const CALM_TRICKS     = 5;   // E10 Ruhe vor dem Sturm: so viele Stiche nach einem Gleichstand …
export const CALM_TEMPO_PCT  = 50;  // …          … um so viel % schneller (zählt auch für Tempo-Score)
export const SUPERCRIT_MULT_FACTOR = 1.5; // D19 Überschusskrit: Faktor auf den Crit-Multiplikator (×2→×3, ×4→×6)

// Legendäre Perks & Raritäts-System (#33) [TUNING]
export const RARITY_WEIGHTS            = { common: 100, rare: 25, legendary: 4 }; // 3-Stufen-Rarität (#71); „common" = normal
export const RARE_MIN_LEVEL            = 2;    // Seltene Perks erst ab diesem Level im Angebot (#71)
export const LEGENDARY_MIN_LEVEL       = 5;    // Legendaries erst ab diesem Level im Angebot (#71)
export const MAX_LEGENDARIES_PER_OFFER = 1;    // höchstens so viele Legendaries je Angebot
export const L4_CRIT_STEP = 0.01;  // L4 Kritische Masse: +1 pp Crit-Chance je Crit
export const L4_CRIT_CAP  = 0.30;  // L4  … dauerhaft gedeckelt bei +30 pp

// Neue Legendaries (#71 Phase 3) [TUNING]
export const KINGMAKER_THRESHOLD = 13; // L7 Königsmacher: ab diesem (permanenten) Wert …
export const KINGMAKER_BONUS     = 2;  // …          … erhält eine Karte einmalig dauerhaft +2
export const FATE_CARD_BONUS     = 8;  // L8 Schicksalsmaschine: Wert-Bonus auf Karten des Schicksalswerts (je Durchlauf)
export const FATE_SCORE_MULT     = 2;  // L8 …          … und ×2 Score bei Sieg mit einer solchen Karte
export const BLOOD_SACRIFICE     = 100;  // L9 Blutvertrag: Leben-Opfer je Durchlauf (nur bei >100 Leben → kann nicht töten)
export const BLOOD_SCORE_STEP    = 0.20; // L9 …          … dafür je Stapel +20 % Score …
export const BLOOD_MAX_STACKS    = 5;    // L9 …          … max 5 Stapel (+100 %)
export const CHAIN_MAX_STAGES    = 3;    // L10 Kettenreaktion: max Zusatz-Crit-Stufen (Chance = halbe finale Crit-Chance)
export const ZEITRAFFER_SCORE_STEP = 0.10; // L11 Zeitraffer: je vollem Durchlauf +10 % Score …
export const ZEITRAFFER_MAX_STACKS = 5;    // L11 …          … max +50 %; Tempo-Boni ×2 auf reale Speed (App)

// Geist (Rekord-Vergleich): Score-Stützstelle alle N Stiche [TUNING]
export const GHOST_STEP = 13;

// Werte dürfen unbegrenzt über 10 steigen (Design-Entscheid: Deck-Mods sollen den
// Gegner-Maximalwert überbieten können) — kein Cap.
export const VALUE_CAP = null;

// Tempo — Basis „langsam" ist fest; Beschleunigung nur über die Tempo-Perks (E-Linie,
// speedPct), kein manueller Regler (#2, Design-Doc §5.3).
export const BASE_FLIP_MS = 1750;   // ms je Stich bei 0 % Speed (Basis-Tempo, etwas flotter; Turbo/Perks oben drauf) [TUNING]

// Aufschlag pro Niederlage im n-ten Deck-Durchlauf (n = cycle, ≥0) — quadratisch, gerundet, kein Cap. Rein.
// Die Engine ruft lifeDrainAt(cycle) direkt im Niederlage-Zweig auf; kein Date/Payload nötig (#87).
export const lifeDrainAt = (n) => Math.round(LIFE_DRAIN_BASE * n * n);

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

// Ansage-System (#36): vor jedem neuen Durchlauf schätzt der Spieler seine Siege (0..40). [TUNING]
export const PREDICTION_MIN = 0;
export const PREDICTION_MAX = TRICKS_PER_CYCLE;   // abgeleitet → kein Doppel-Pflegen bei Deckgröße
export const PREDICTION_EXACT_MULT    = 3.0;      // Abweichung 0 → Rundenscore ×3
export const PREDICTION_NEAR_ONE_MULT = 1.75;     // Abweichung 1 → ×1,75
export const PREDICTION_NEAR_TWO_MULT = 1.25;     // Abweichung 2 → ×1,25
export const PREDICTION_MISS_MULT     = 1.0;      // Abweichung ≥3 → kein Bonus
export const suitName  = (s) => (s ? SUITS[s].name : "—");
export const suitColor = (s) => (s ? SUITS[s].color : "#888");
