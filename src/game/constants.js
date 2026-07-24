/* ============================================================
   TUNING-BLOCK  — hier dreht der Dev im Playtest
   ============================================================ */
export const MAX_CYCLES       = 44;     // Shop-Spec (§2.1): fester Run über genau so viele Deck-Durchläufe, danach Ende [TUNING]
export const SCORE_PER_WIN    = 100;    // Basispunkte je Sieg (Perks/Formationen skalieren darauf) [TUNING]
export const CRIT_BASE_MULT   = 1.5;    // V2 (§22.3): Basis-Crit-Multiplikator; der Crit-Mult-Stat baut darauf auf [TUNING]
export const PERKS_OFFERED    = 3;      // Perks pro Level-Up-Auswahl [TUNING]

// Stat-System (V2 §22.3) — bei jedem Stat-Pick alle vier angeboten, einer gewählt; additiv, keine Caps [TUNING]
export const STAT_CRIT_CHANCE_STEP = 0.05;  // Crit-Chance: +5 Prozentpunkte je Pick (#94)
export const STAT_CRIT_MULT_STEP   = 0.2;   // Crit-Multiplikator: +0,2× je Pick (auf Basis 1,5) (#94)
export const STAT_FORM_MULT_STEP   = 0.05;  // Formations-Mult: +5 % Score bei aktiver Formation je Pick (max 1×/Stich)
export const STAT_STREAK_MULT_STEP = 0.02;  // Serien-Mult: +2 % Score je aktuellem Serienpunkt je Pick (#94)
export const STAT_ECONOMY_STEP     = 1;     // Einkommen (Shop-Spec §4): +1 Münze je abgeschlossenem Durchlauf je Pick

// Entscheidungsplan (Shop-Spec §2.2): Typ der Entscheidung VOR Durchlauf n (1-indexiert) = DECISION_SCHEDULE[n-1].
// Fester 44-Einträge-Plan (ersetzt den alten zyklischen DECISION_CYCLE). Engine liest DECISION_SCHEDULE[cycle]
// (nach cycle += 1); der Start-Entscheid (Index 0 = "stat") läuft über START_RUN.
// Verteilung: 11 Stat · 11 Perk · 8 Formation · 8 Shop · 6 Skill.
// Shop-Zeitpunkte (Durchlauf): 5, 11, 16, 22, 27, 33, 38, 42 · Skill-Zeitpunkte: 6, 12, 19, 28, 34, 41.
export const DECISION_SCHEDULE = [
  "stat", "perk", "formation", "stat", "shop", "skill", "perk", "formation", "stat", "perk",   //  1–10
  "shop", "skill", "formation", "stat", "perk", "shop", "formation", "stat", "skill", "perk",  // 11–20
  "stat", "shop", "perk", "stat", "formation", "perk", "shop", "skill", "stat", "formation",   // 21–30
  "perk", "stat", "shop", "skill", "formation", "perk", "stat", "shop", "formation", "perk",   // 31–40
  "skill", "shop", "stat", "perk",                                                             // 41–44
];

// Shop-Münzökonomie (Shop-Spec §3) [TUNING]
export const STARTING_COINS       = 2;   // Startmünzen bei Run-Beginn
export const BASE_COINS_PER_CYCLE = 2;   // Münzen je vollständig abgeschlossenem Durchlauf (+ Einkommen-Level)

// Shop-Angebot (Shop-Spec §5) [TUNING]
export const SHOP_CATEGORIES         = ["cards", "anchors", "formations", "planning"]; // Reihenfolge = Anzeige-Reihenfolge
export const SHOP_ITEMS_PER_CATEGORY = 2;    // je Kategorie werden genau so viele Items angeboten
export const SHOP_ITEMS_OFFERED      = 8;    // = SHOP_CATEGORIES.length × SHOP_ITEMS_PER_CATEGORY
export const SHOP_LEGENDARY_CHANCE   = 0.10; // Chance je Shop auf EIN legendäres Angebot (ersetzt ein normales)
// Vier feste Preisstufen (Spec §5.5) — keine Zwischenpreise.
export const SHOP_PRICE = { cheap: 8, strong: 12, premium: 18, legendary: 30 };
// Anzeige-Labels der Kategorien (UI) — geteilte Quelle für ShopScreen/Tests.
export const SHOP_CATEGORY_LABELS = { cards: "Karten", anchors: "Anker", formations: "Formationen", planning: "Planung" };

// Shop-Positionsanker (Shop-Spec §8) — hängen an der Deckposition (0–39), nicht an card.id. [TUNING]
export const ANCHOR_POWER_VALUE = 2;    // Kraftanker (A1): +temp Wert der Karte auf der Position
export const ANCHOR_SCORE       = 150;  // Punkteanker (A2): +Flat-Score bei Sieg auf der Position
export const ANCHOR_CRIT_CHANCE = 0.15; // Kritanker (A3): +Crit-Chance (Prozentpunkte) für den Stich auf der Position
export const ANCHOR_FORM_FACTOR = 1.25; // Formationsanker (A5): Position zählt als Anker ×1,25 (stapelt nicht mit E7/E8)

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
export const SKILLS_OFFERED     = 6;   // Skills je Skill-Runde (Prototyp: 2+2+2 — alle 3 Archetypen immer im Angebot)
export const MAX_ARCHETYPES     = 3;   // Prototyp: alle 3 Archetypen gleichzeitig aktivierbar (Cap aufgehoben)
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
// Blitz-Rework (#93 F2) — exklusiver Ladungs-Konsument + neue Skills/Legendäre [TUNING]
export const LIGHTNING_MAX_CHARGE_THUNDER = 15;  // Donnergott (L): hebt das Ladungsmaximum 10 → 15
export const THUNDER_CRIT_MULT = 1.0;  // Donnergott (L): dauerhafter +Crit-Multiplikator
export const STATIC_CHARGE     = 1;    // Statische Aufladung: Ladung je Sieg OHNE Crit
export const CONDUCT_CHARGE    = 2;    // Leitfähigkeit: Zusatzladung bei Crit neben ionisierter Karte
export const DISCHARGE_SCORE   = 500;  // Entladung: +Flat beim nächsten Crit nach vollem Verbrauch

// Feuer-Archetyp (#93 F1) — Hitzeleiste 0–100 (Sonnenkern 150). Belohnt totale Überlegenheit. [TUNING]
export const HEAT_MAX          = 100;  // Standard-Hitzemaximum
export const HEAT_MAX_SUN      = 150;  // Maximum mit Sonnenkern (L, Überschuss über 100 bleibt)
export const HEAT_MIN_MARGIN   = 3;    // Mindest-Wertvorsprung für Hitzegewinn & Feuer-Score
export const HEAT_PER_POINT    = 2;    // % Hitze je relevantem Differenzpunkt (Vorsprung−2)
export const HEAT_LOSS_MAX     = 10;   // max Hitzeverlust je Niederlage (%)
export const FIRE_SCORE_BASE   = 25;   // Feuer-Flat-Score je Punkt (erster Feuer-Skill)
export const FIRE_SCORE_PER_SKILL = 5; // +Feuer-Flat je Punkt je weiterem Feuer-Skill
export const BURN_BONUS        = 10;   // Verbrennung: +Feuer-Flat je Punkt
export const EMBER_MULT        = 1.5;  // Glut: Hitzegewinn ×1,5 (kaufmännisch gerundet)
export const FUEL_BONUS        = 5;    // Brennstoff: +% Hitze bei Sieg mit Dauerwert ≥ FUEL_MIN_VALUE
export const FUEL_MIN_VALUE    = 8;
export const ACCEL_BONUS       = 15;   // Brandbeschleuniger: +% Hitze bei Vorsprung ≥ ACCEL_MIN_MARGIN
export const ACCEL_MIN_MARGIN  = 10;
export const GLOWING_THRESHOLD = 50;   // Glühende Klinge: ab dieser Hitze alle Karten +GLOWING_VALUE
export const GLOWING_VALUE     = 2;
export const FIREROLL_MAX      = 5;    // Feuerwalze: nächste Karte +1 je Siegsserie, bis +5
export const CONFLAGRATION_SCORE = 1000; // Flächenbrand (Konsument): +Flat bei Sieg mit voller Hitze …
export const CONFLAGRATION_COST  = 100;  // …          … verbraucht exakt 100 Hitze
export const MELT_COST         = 10;   // Schmelzpunkt (Konsument): −% Hitze je Stich …
export const MELT_VALUE        = 3;    // …          … dafür eigene Karte +Wert
export const PHOENIX_VALUE     = 10;   // Phönixfeuer (L): nach Konsumenten-Auslösung nächste Karte +Wert

// Eis-Archetyp (#93 F3) — Kontroll-/Aufstellungs-Archetyp. Kein Konsument, keine verbrauchbare Ressource. [TUNING]
export const ICE_BASE_FREEZE     = 2;    // erster Eis-Skill friert so viele eigene Karten ein
export const FROST_GRIP_BONUS    = 2;    // Frostgriff: so viele zusätzliche eingefrorene Karten
export const KAELTERESERVE_VALUE = 4;    // Kältereserve: +temp Wert beim nächsten Auftauchen einer verlorenen Frostkarte
export const KALTFRONT_VALUE     = 3;    // Kaltfront: +temp Wert der eingefrorenen Karte im nächsten Durchlauf nach Frosttausch
export const FROSTSPUR_VALUE      = 2;   // Frostspur: +temp Wert des neuen Nachfolgers im nächsten Durchlauf nach Frosttausch
export const EISANKER_FACTOR     = 1.25; // Eisanker: eingefrorene Karte als Anker ×1,25 (zählt als Formation)
export const STILLSTAND_SCORE    = 200;  // Stillstand: +Flat, wenn eine Frostkarte in ≥1 aktiver Formation gewinnt
export const CRYSTAL_OFFSET      = 1;    // Kristallform/Eisschritt: ±Wert-Flex für Formationen
export const FROSTBISS_COUNT     = 2;    // Frostbiss: so viele Gegnerkarten des nächsten Durchlaufs betroffen
export const FROSTBISS_DEBUFF    = 3;    // Frostbiss: −temp Wert je betroffener Gegnerkarte (nie < 0)
export const PERMAFROST_VALUE    = 2;    // Permafrost: +Dauerwert eingefrorener Karten

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
