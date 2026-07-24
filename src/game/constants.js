/* ============================================================
   TUNING-BLOCK  — hier dreht der Dev im Playtest
   ============================================================ */
export const MAX_CYCLES       = 40;     // V2 (§22.1): fester Run über genau so viele Deck-Durchläufe, danach Ende [TUNING]
export const SCORE_PER_WIN    = 100;    // Basispunkte je Sieg (Perks/Formationen skalieren darauf) [TUNING]
export const CRIT_BASE_MULT   = 1.5;    // V2 (§22.3): Basis-Crit-Multiplikator; der Crit-Mult-Stat baut darauf auf [TUNING]
export const PERKS_OFFERED    = 3;      // Perks pro Level-Up-Auswahl [TUNING]

// Stat-System (V2 §22.3) — bei jedem Stat-Pick alle vier angeboten, einer gewählt; additiv, keine Caps [TUNING]
export const STAT_CRIT_CHANCE_STEP = 0.05;  // Crit-Chance: +5 Prozentpunkte je Pick (#94)
export const STAT_CRIT_MULT_STEP   = 0.2;   // Crit-Multiplikator: +0,2× je Pick (auf Basis 1,5) (#94)
export const STAT_FORM_MULT_STEP   = 0.05;  // Formations-Mult: +5 % Score bei aktiver Formation je Pick (max 1×/Stich)
export const STAT_STREAK_MULT_STEP = 0.02;  // Serien-Mult: +2 % Score je aktuellem Serienpunkt je Pick (#94)

// Entscheidungszyklus (V2 §22.2): Typ der Entscheidung VOR Durchlauf n = DECISION_CYCLE[n % 6].
// Über 40 Durchläufe: 14 Stat · 13 Perk · 7 Formation · 6 Skill.
export const DECISION_CYCLE = ["stat", "perk", "formation", "stat", "perk", "skill"];

// Formationsphase (V2 §22.8): Energie je Phase; jeder beliebige Tausch zweier Karten kostet 1. [TUNING]
export const FORMATION_ENERGY = 4;
// TRICKS_PER_CYCLE wird weiter unten aus der Deckgröße abgeleitet (SUIT_ORDER × RANKS, #34) — kein Drift.

// Basis-Siegesserie (#39): jede Serie hebt den Score-Mult leicht. [TUNING]
export const STREAK_BASE_STEP = 0.02; // +2 % je Serienstufe [TUNING]
export const STREAK_BASE_CAP  = 1.50; // … gedeckelt bei +150 % (Cap ab Serie 75, #100) [TUNING]
// Gemeinsame Schwellen für Score-Perks (Kategorie D) [TUNING]
export const D3_HIGH_MIN  = 8;    // „hohe Karte"-Schwelle für D3/D5 (#34: Skala 1–10)
export const D4_LOW_MAX   = 3;    // „Außenseiter" bis zu diesem Wert

// Raritäts-System (#33) [TUNING]
export const RARITY_WEIGHTS            = { common: 100, rare: 25, legendary: 9 }; // 3-Stufen-Rarität; „common" = normal [TUNING]
// Perk-Auswahl nach jeder Runde: KEINE Level-Gates — alle Seltenheiten sofort, nur gewichtet.
export const MAX_LEGENDARIES_PER_OFFER = 1;    // höchstens so viele Legendaries je Angebot

// Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md) [TUNING]
export const SKILL_SLOTS       = 4;    // max gleichzeitig gehaltene Skills
export const SKILLS_OFFERED     = 4;   // Skills je Skill-Runde-Auswahl (#93 F0: 2+2 nach Archetyp)
export const MAX_ARCHETYPES     = 2;   // #93: max gleichzeitig aktive Skill-Archetypen pro Run
export const SKILL_EVERY_CYCLES = 3;   // jede N-te Runde ist eine Skill-Runde (3, 6, 9 …), sonst Perk
export const LIGHTNING_CRIT_BASE      = 0.05; // Blitz: Aktivierungs-Sockel Crit-Chance (Abschnitt 2a)
export const LIGHTNING_CRIT_PER_SKILL = 0.05; // Blitz: je gehaltenem Blitz-Skill
export const LIGHTNING_MAX_CHARGE     = 10;   // Blitz: Ladungsmaximum
// Ionisierung (Stufe B) — dauerhafte Kartenmarkierung
export const ION_SCORE_PER_STACK  = 25; // +Score je Ionisierungsstapel bei Sieg mit der Karte
export const ION_MAX_STACKS       = 4;  // max Stapel je Karte
export const ION_BASE_COUNT       = 2;  // Ionisierung: ionisierte Karten je Verbrauch
export const KETTENBLITZ_COUNT    = 2;  // Kettenblitz: zusätzlich ionisierte Karten (nur mit Ionisierung)
export const UEBERSPANNUNG_CHARGE = 3;  // Überspannung: Zusatzladung bei Crit mit ionisierter Karte
// Reaktoren + Geladene Serie (Stufe C)
export const REST_CHARGE_FLOOR = 3;    // Reststrom: Ladungsboden nach jedem Verbrauch (statt 0)
export const STORM_CRIT_STEP   = 0.02; // Gewitterfront: +Crit-Chance je Verbrauch …
export const STORM_CRIT_CAP    = 0.20; // …          … gedeckelt
export const STORM_SCORE       = 100;  // Gewitterfront nach Cap: +Score je Sieg …
export const STORM_SCORE_WINS  = 3;    // …          … für so viele folgende Siege

// Geist (Rekord-Vergleich): Score-Stützstelle alle N Stiche [TUNING]
export const GHOST_STEP = 13;

// Werte dürfen unbegrenzt über 10 steigen (Design-Entscheid: Deck-Mods sollen den
// Gegner-Maximalwert überbieten können) — kein Cap.
export const VALUE_CAP = null;

// Tempo — Basis „langsam" ist fest; die Speed-Stufen (1×–4×) sind rein Anzeige und score-neutral
// (V2 gelockte Entscheidung #5). Kein manueller Regler beeinflusst den Score.
export const BASE_FLIP_MS = 1750;   // ms je Stich bei Speed 1× (Turbo teilt nur die Anzeigedauer) [TUNING]

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
