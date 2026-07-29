/* ============================================================
   TUNING-BLOCK  — hier dreht der Dev im Playtest
   ============================================================ */
// SIM-TUNING-HAKEN (nur test/sim): Pacing-Schlüsselkonstanten lassen sich per Umgebungsvariable
// überschreiben (Default = aktueller Wert → in der App ohne gesetzte ENV KEINE Auswirkung, `process`
// existiert im Browser gar nicht). So kann der Sim-Sweep Werte reproduzierbar durchprobieren, ohne den
// Code zu editieren: z. B. `SIM_STREAK_STAT_CAP=1 node sim/batch.js --mode pacing`. Siehe docs/sim-harness-plan.md.
const envNum = (name, def) => {
  const v = (typeof process !== "undefined" && process.env) ? process.env[name] : undefined;
  const n = v == null || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : def;
};
export const MAX_CYCLES       = 44;     // Shop-Spec (§2.1): fester Run über genau so viele Deck-Durchläufe, danach Ende [TUNING]
// Merge test/sim←main: ENV-Sweep-Haken bleibt, Default = main's Live-Balance (SPW 100→400, Pacing-Pass Sim-validiert).
export const SCORE_PER_WIN    = envNum("SIM_SCORE_PER_WIN", 400);    // Basispunkte je Sieg (Perks/Formationen skalieren darauf) [TUNING · Default = Live-Balance 400]
export const CRIT_BASE_MULT   = envNum("SIM_CRIT_BASE_MULT", 1.5);   // V2 (§22.3): Basis-Crit-Multiplikator; der Crit-Mult-Stat baut darauf auf [TUNING]
export const PERKS_OFFERED    = 3;      // Perks pro Level-Up-Auswahl [TUNING]

// Stat-System (V2 §22.3) — bei jedem Stat-Pick alle vier angeboten, einer gewählt; additiv, keine Caps [TUNING]
export const STAT_CRIT_CHANCE_STEP = envNum("SIM_STAT_CRIT_CHANCE_STEP", 0.07);  // Crit-Chance: +7 Prozentpunkte je Pick (#94; #161 FB-6: 0,05→0,07)
export const STAT_CRIT_MULT_STEP   = envNum("SIM_STAT_CRIT_MULT_STEP", 0.25);    // Crit-Multiplikator: +0,25× je Pick (auf Basis 1,5) [#Pass3: 0,2→0,25 Crit-Buff]
export const STAT_FORM_MULT_STEP   = envNum("SIM_STAT_FORM_MULT_STEP", 0.05);    // Formations-Mult: +5 % Score bei aktiver Formation je Pick (max 1×/Stich)
export const STAT_STREAK_MULT_STEP = envNum("SIM_STAT_STREAK_MULT_STEP", 0.02);  // Serien-Mult: +2 % Score je aktuellem Serienpunkt je Pick (#94)
export const STAT_ECONOMY_STEP     = 1;     // Einkommen: je Pick +1 Level (Bonus = Level × SHOP_INCOME_PER_LEVEL Münzen/Shop)

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
export const BASE_COINS_PER_CYCLE = 2;   // Münzen je vollständig abgeschlossenem Durchlauf (KONSTANT, ohne Einkommen)
export const PERK_DECLINE_COINS   = 2;   // #138/#183: Perk-Angebot komplett ablehnen → feste Münzen (Runde nie „verschwendet")
// Einkommens-Stat (überarbeitet): der Bonus wird PRO SHOP-BESUCH gutgeschrieben, nicht je Durchlauf —
// +3 Münzen je Einkommen-Pick, gilt für jeden Shop nach der Wahl (auch den direkt bevorstehenden). [TUNING]
export const SHOP_INCOME_PER_LEVEL = 3;

// Shop-Angebot (Shop-Spec §5) [TUNING]
export const SHOP_CATEGORIES         = ["cards", "anchors", "planning"]; // Reihenfolge = Anzeige-Reihenfolge (#179: „formations" zu Perks migriert)
export const SHOP_ITEMS_PER_CATEGORY = 2;    // je Kategorie werden genau so viele Items angeboten
export const SHOP_ITEMS_OFFERED      = SHOP_CATEGORIES.length * SHOP_ITEMS_PER_CATEGORY; // = 6 (#179: 3 Kategorien × 2)
export const SHOP_LEGENDARY_CHANCE   = 0.03; // Chance je Shop auf EIN legendäres Angebot (ersetzt ein normales) [0,15→0,03 — Legendaries seltener]
// Vier feste Preisstufen (Spec §5.5) — keine Zwischenpreise.
export const SHOP_PRICE = { cheap: 8, strong: 12, premium: 18, legendary: 30 };
// Anzeige-Labels der Kategorien (UI) — geteilte Quelle für ShopScreen/Tests.
export const SHOP_CATEGORY_LABELS = { cards: "Karten", anchors: "Anker", planning: "Planung" }; // #195: „formations" entfernt (#179 zu Perks migriert)

// Shop-Positionsanker (Shop-Spec §8) — hängen an der Deckposition (0–39), nicht an card.id. [TUNING]
// (#189: ANCHOR_POWER_VALUE/ANCHOR_SCORE/ANCHOR_CRIT_CHANCE entfernt — die Anker-FAMILIEN in shopFamilies.js
//  tragen ihre Stärke je Stufe selbst; nur der Formationsanker-Fallback bleibt.)
export const ANCHOR_FORM_FACTOR = 1.25; // Formationsanker (A5): Position zählt als Anker ×1,25 (stapelt nicht mit E7/E8)

// Shop-Formationsitems (Shop-Spec §9). [TUNING]
export const FORMATION_CORE_FACTOR = 1.50; // Formationskern (F-L1): jede aktive Formation des gewählten Typs zusätzlich ×1,50

// Formationsphase (V2 §22.8): Energie je Phase; jeder beliebige Tausch zweier Karten kostet 1. [TUNING]
export const FORMATION_ENERGY = 4;
// Startdeck-Formations-Band (#Pass6): die Start-playerOrder wird neu gemischt, bis die Summe der Formations-
// Boni Σ(mult−1) der (unmodifizierten) Anordnung im Band [MIN,MAX] liegt → begrenzt die Start-Varianz des
// Formations-Potentials (Median zufälliger Starts ≈ 5,6; enges Band = gleichmäßigere Runs). [TUNING]
export const FORMATION_START_MIN   = 4.5;
export const FORMATION_START_MAX   = 6.5;
export const FORMATION_START_TRIES = 200;   // max Neumischungen; danach potential-nächste Anordnung (Fallback)
// TRICKS_PER_CYCLE wird weiter unten aus der Deckgröße abgeleitet (SUIT_ORDER × RANKS, #34) — kein Drift.

// Basis-Siegesserie (#39): jede Serie hebt den Score-Mult leicht. [TUNING]
export const STREAK_BASE_STEP = envNum("SIM_STREAK_BASE_STEP", 0.02); // +2 % je Serienstufe [TUNING]
export const STREAK_BASE_CAP  = envNum("SIM_STREAK_BASE_CAP", 1.50);  // … gedeckelt bei +150 % (Cap ab Serie 75, #100) [TUNING]
// Serien-STAT (statStreakMult): war ungedeckelt → mit langen Serien Runaway-Treiber (Sim-Befund).
// Deckel des Stat-Beitrags analog zum Basis-Cap; bewusst großzügig, damit starke Serien-Builds stark
// bleiben, aber nicht unbegrenzt eskalieren. [TUNING · Balance-Pass 1]
export const STREAK_STAT_CAP  = envNum("SIM_STREAK_STAT_CAP", 3.00); // Stat-Serien-Faktor höchstens +300 %
// (D3_HIGH_MIN/D4_LOW_MAX entfernt — die Score-Perks sind zu Familien migriert, #167; Schwellen jetzt je Stufe in families.js.)

// Raritäts-System (#33) [TUNING]
export const RARITY_WEIGHTS            = { common: 100, rare: 25, legendary: 9 }; // 3-Stufen-Rarität; „common" = normal [TUNING]
// Perk-Auswahl nach jeder Runde: KEINE Level-Gates — alle Seltenheiten sofort, nur gewichtet.
export const MAX_LEGENDARIES_PER_OFFER = 1;    // höchstens so viele Legendaries je Angebot

// Legendär-Roll (Shop-Spec §10 P5/P6): expliziter Wurf vor jedem Perk-/Skill-Angebot. Bei Erfolg wird genau
// EIN Legendäres erzwungen, sonst enthält das Angebot keins. Chance = Basis + Bonus (P5/P6, je +5 pp), Bonus-Cap. [TUNING]
export const PERK_LEGENDARY_BASE       = 0.03; // Basis-Legendär-Chance Perk-Angebot [0,08→0,03]
export const SKILL_LEGENDARY_BASE      = 0.03; // Basis-Legendär-Chance Skill-Angebot [0,08→0,03]
export const MAX_LEGENDARY_CHANCE_BONUS = 0.15; // Cap des additiven Bonus (P5/P6): max +15 pp

// Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md) [TUNING]
export const SKILL_SLOTS       = envNum("SIM_SKILL_SLOTS", 4);    // max gleichzeitig gehaltene Skills [SIM-Sweep-Haken: Slot-Experiment (Autostich_Test testet 6); Default = main-Stand 4]
export const SKILLS_OFFERED     = 6;   // Skills je Skill-Runde (Prototyp: 2+2+2 — alle 3 Archetypen immer im Angebot)
export const MAX_ARCHETYPES     = 3;   // Prototyp: alle 3 Archetypen gleichzeitig aktivierbar (Cap aufgehoben)
export const SKILL_EVERY_CYCLES = 3;   // jede N-te Runde ist eine Skill-Runde (3, 6, 9 …), sonst Perk
export const LIGHTNING_CRIT_BASE      = 0.05; // Blitz: Aktivierungs-Sockel Crit-Chance (Abschnitt 2a)
export const LIGHTNING_CRIT_PER_SKILL = envNum("SIM_LIGHTNING_CRIT_PER_SKILL", 0.08); // Blitz: je gehaltenem Blitz-Skill [Default = Live-Balance 0,08 (Pacing-Buff), SIM-Sweep-Haken]
export const LIGHTNING_MAX_CHARGE     = 10;   // Blitz: Ladungsmaximum
// Ionisierung (Stufe B) — dauerhafte Kartenmarkierung
export const ION_SCORE_PER_STACK  = envNum("SIM_ION_SCORE_PER_STACK", 25); // +Score je Ionisierungsstapel bei Sieg mit der Karte [SIM-Tuning]
export const ION_MAX_STACKS       = 5;  // max Stapel je Karte [#165 Skills-Spec §5.1: 4→5]
export const ION_BASE_COUNT       = 2;  // Ionisierung: ionisierte Karten je Verbrauch
export const BLITZFAENGER_VALUE   = 2;  // Blitzfänger (#165): eine bereits volle Karte (5 Stapel) statt zu ionisieren +temp Wert (+ 1 Ladung)
export const KETTENBLITZ_COUNT    = 2;  // Kettenblitz: zusätzlich ionisierte Karten (nur mit Ionisierung)
export const UEBERSPANNUNG_CHARGE = 3;  // Überspannung: Zusatzladung bei Crit mit ionisierter Karte
// Reaktoren + Geladene Serie (Stufe C)
export const REST_CHARGE_FLOOR = 3;    // Reststrom: Ladungsboden nach jedem Verbrauch (statt 0)
export const STORM_CRIT_STEP   = 0.02; // Gewitterfront: +Crit-Chance je Verbrauch …
export const STORM_CRIT_CAP    = 0.20; // …          … gedeckelt
export const STORM_SCORE       = envNum("SIM_STORM_SCORE", 100);  // Gewitterfront nach Cap: +Score je Sieg … [SIM-Tuning]
export const STORM_SCORE_WINS  = 3;    // …          … für so viele folgende Siege
/* ============================================================
   BLITZ-REWORK v0 — „Der Sturm, der sich selbst nährt." 4 Währungen (⚡Crit · 🔋Ladung · 🧲Ionisierung ·
   📈Serie) + 🔗Kaskade. Blitz BESITZT die Crit-Erzeugung. Werte v0, cross-archetype Sim-Pass. [v0 · tunebar]
   ============================================================ */
export const LIGHTNING_MAX_CHARGE_THUNDER = 15;  // Donnergott (L): hebt das Ladungsmaximum 10 → 15
export const THUNDER_CRIT_MULT = 1.0;  // Donnergott (L): dauerhafter +Crit-Multiplikator
export const STATIC_CHARGE     = envNum("SIM_STATIC_CHARGE", 1); // Statische Aufladung: Ladung je Sieg OHNE Crit // v0
// UEBERSPANNUNG_CHARGE (oben, =3) = Kaskade: Crit auf/neben ionisierter Karte → Zusatzladung (merge 04+09).
export const ENTLADUNG_CRIT_MULT      = 1.0;  // Entladung: nächster Crit nach vollem Verbrauch +1,0× Crit-Mult   // v0 — tunebar
export const KURZSCHLUSS_CHARGE_PER_STACK = 1; // Kurzschluss: volle (5) Siegkarte entlädt alle Stapel → +1 Ladung je Stapel // v0
export const SPANNUNGSSTAU_STEP       = 0.05; // Spannungsstau: +5 pp Crit-Chance je Sieg ohne Crit (ein Crit resettet) // v0
export const SPANNUNGSSTAU_CAP        = 0.50; // Spannungsstau: … bis +50 pp                                       // v0 — tunebar
export const UEBERSCHLAG_PER          = 10;   // Überschlag: Crit-Chance-Überschuss (>100 %) ×10 → Ladung (0,3 → +3) // v0
export const BLITZSCHLAG_STACKS       = 1;    // Blitzschlag: ein Crit ionisiert die Siegkarte (+1 Stapel)          // v0
export const DAUERSTROM_PER_STREAK    = 3;    // Dauerstrom: je 3 Serienpunkte +1 Ladung je Sieg in Folge           // v0
export const DAUERSTROM_MAX           = 3;    // Dauerstrom: … höchstens +3 Ladung/Sieg                             // v0 — tunebar
export const WETTERLEUCHTEN_THRESHOLD = 5;    // Wetterleuchten: bei jeder 5. Serienstufe ionisieren                // v0
export const WETTERLEUCHTEN_COUNT     = 2;    // Wetterleuchten: … so viele Karten                                  // v0 — tunebar
export const DOPPELENTLADUNG_FACTOR   = 2;    // Doppelentladung (L): Konsumenten feuern ×2 (Ionisierungs-Anzahl ×2) // v0
export const DURCHSCHLAG_CRIT_MULT    = 0.25; // Durchschlag (L): volle Ionis. (5) + Crit → dauerhaft +0,25× Crit-Mult // v0 — tunebar
export const DURCHSCHLAG_MULT_CAP     = 2.0;  // Durchschlag: Deckel des dauerhaften Crit-Mult-Bonus (Anti-Runaway v0.1: uncapped → +100× im Smoke)

/* ============================================================
   FEUER-REWORK v0 — Hitzeleiste 0–100. „Hitze belohnt totale Überlegenheit."
   Alle Zahlen sind Vorschlags-Startwerte (v0), geerdet an der bestehenden Hitze-Ökonomie
   (Gewinn ≈ (Vorsprung−2) %, Score-Basis 400). Werte-Tuning: cross-archetype Sim-Pass. [v0 · tunebar]
   ============================================================ */
// Grundmechanik (passiv)
export const HEAT_MAX          = 100;  // Hitzemaximum (fix)
export const HEAT_MIN_MARGIN   = 3;    // Mindest-Wertvorsprung für margen-basierten Hitzegewinn & Feuer-Score
export const HEAT_PER_POINT    = 1;    // % Hitze je (Vorsprung−2)  // v0 — tunebar, cross-archetype Sim-Pass
export const HEAT_MARGIN_CAP   = 8;    // Deckel des effektiven Vorsprungs im Hitzegewinn (Late-Game-Runaway)
export const HEAT_LOSS_MAX     = 10;   // max Hitzeverlust je Niederlage (%)
export const FIRE_SCORE_BASE   = 25;   // Feuer-Flat-Score je Punkt (erster Feuer-Skill)  // v0 — tunebar
export const FIRE_SCORE_PER_SKILL = 5; // +Feuer-Flat je Punkt je weiterem Feuer-Skill    // v0 — tunebar
// Linie 1 — Generation (Marge · Konstanz · Serie)
export const EMBER_MULT        = 1.5;  // Glut: Hitzegewinn ×1,5                            // v0 — tunebar
export const ZUNDER_HEAT       = 2;    // Zunder: +2 % Hitze je Sieg (auch knappe Siege)   // v0 — tunebar
export const FEUERSTURM_STEP   = 1;    // Feuersturm: +1 % Hitze je Serienstufe            // v0 — tunebar
export const FEUERSTURM_CAP    = 5;    // Feuersturm: … bis +5 %                            // v0 — tunebar
// Linie 2 — Verteidigung (abschirmen · kontern)
export const GLUTBETT_MULT       = 0.5; // Glutbett: Hitzeverlust ×0,5                       // v0 — tunebar
export const GLUTBETT_FREE_BELOW = 30;  // Glutbett: unter 30 % Hitze gar kein Verlust      // v0 — tunebar
export const RUECKZUENDUNG_HEAT_PER_DEFICIT = 1; // Rückzündung: +1 % Hitze je Rückstandspunkt (Sieg nach Niederlage) // v0
export const RUECKZUENDUNG_VALUE = 2;   // Rückzündung: … und die Siegkarte +2 Wert         // v0 — tunebar
// Linie 3 — Schwellen-Payoffs (hohe Hitze → Belohnung)
export const GLOWING_T1_HEAT = 40, GLOWING_T1_VALUE = 1; // Glühende Klinge: +1 Wert ab 40 % // v0 — tunebar
export const GLOWING_T2_HEAT = 70, GLOWING_T2_VALUE = 2; //                 +2 Wert ab 70 %  // v0 — tunebar
export const GLOWING_T3_HEAT = 100, GLOWING_T3_VALUE = 3;//                 +3 Wert bei 100 % // v0 — tunebar
export const WHITEHEAT_PER_POINT = 10;  // Weißglut: +10 Score je überlaufendem Hitzepunkt   // v0 — tunebar
// Linie 4 — Wert-/Score-Motoren
export const FIREROLL_MIN_HEAT = 40;    // Feuerwalze: erst ab 40 % Hitze                    // v0 — tunebar
export const FIREROLL_MAX       = 3;    // Feuerwalze: +1 Wert je Sieg in Folge, bis +3      // v0 — tunebar
export const VERBRENNUNG_T1_MARGIN = 8,  VERBRENNUNG_T1_MULT = 1.5; // Verbrennung: Feuer-Score ×1,5 ab 8 Vorsprung // v0
export const VERBRENNUNG_T2_MARGIN = 12, VERBRENNUNG_T2_MULT = 2.0; // Verbrennung: Feuer-Score ×2 ab 12 Vorsprung  // v0
export const SPARKFLIGHT_MIN_MARGIN = 8;  // Funkenflug: Sieg ≥8 Vorsprung entlädt den Speicher voll // v0 — tunebar
export const SPARKFLIGHT_LOSS_KEEP  = 0.5;// Funkenflug: Niederlage halbiert den Speicher     // v0 — tunebar
// Linie 5 — Konsumenten (max 1 im Build — Burst vs. Drip)
export const CONFLAG_MIN_HEAT = 80;     // Flächenbrand: ab 80 % Hitze bewaffnet             // v0 — tunebar
export const CONFLAG_PER_HEAT = 12;     // Flächenbrand: +12 Score je verbrannten Hitzepunkt (verbrennt die GANZE Hitze) // v0
export const MELT_COST        = 10;     // Schmelzpunkt: −10 % Hitze je Stich                // v0 — tunebar
export const MELT_PER_HEAT    = 5;      // Schmelzpunkt: +5 Score je verbrauchtem Hitzepunkt // v0 — tunebar
// Linie 6 — Verbrennen → Schmieden (Brand · Asche · Schmiede)
export const BRAND_VALUE      = 1;      // Brandmal: brandmarkierte Gegnerkarte −1 Wert (v0.1: 2→1, Brand-Winrate-Tail zähmen) // tunebar
export const BRAND_ASH        = 1;      // Brandmal/Lauffeuer: +1 Asche je Brand              // v0 — tunebar
export const BRAND_SPREAD_VALUE = 1;    // Lauffeuer: Übergriff auf eine Nachbarkarte −1 Wert // v0 — tunebar
export const FORGE_COST       = 5;      // Ascheschmiede: 5 Asche je Schmiedung               // v0 — tunebar
export const FORGE_VALUE      = 2;      // Ascheschmiede: niedrigste Karte +2 Dauerwert       // v0 — tunebar
export const FORGE_MAX_PER_CARD = 6;    // Schmieden: Deckel geschmiedeter Dauerwert je Karte (Anti-Runaway v0.1: sonst R1→+20)
export const GLUTSTAHL_PER_VALUE = 20;  // Glutstahl: +20 Score je geschmiedetem Wert bei Sieg // v0 — tunebar
export const SCHMELZOFEN_MIN_HEAT = 50; // Schmelzofen: ab 50 % Hitze …                       // v0 — tunebar
export const SCHMELZOFEN_BRAND_BONUS = 1;   // … Brände −1 extra Wert & +1 extra Asche         // v0 — tunebar
export const SCHMELZOFEN_FORGE_DISCOUNT = 1;// … Schmieden kostet 1 Asche weniger              // v0 — tunebar
// Legendäre (Verstärker, kein Motor)
export const SUNCORE_PER_HEAT = 5;      // Sonnenkern: +5 Score je verbrauchtem Hitzepunkt (zusätzlich zum Konsum) // v0
export const PHOENIX_REIGNITE = 0.40;   // Phönixfeuer: verbrauchte Hitze entzündet neu (+40 % zurück), 1×/Durchlauf // v0
export const SUNWRATH_MIN_HEAT = 80;    // Sonnenzorn: ab 80 % Hitze sind alle Feuer-Effekte verstärkt … // v0 — tunebar
export const SUNWRATH_GLOWING_BONUS  = 1;   // … Glühende Klinge +1 Stufe                      // v0 — tunebar
export const SUNWRATH_WHITEHEAT_MULT = 2;   // … Weißglut ×2                                    // v0 — tunebar
export const SUNWRATH_FIRESCORE_MULT = 1.25;// … Feuer-Score ×1,25                              // v0 — tunebar
export const DAMASCUS_FORGE_GROWTH = 1; // Damaststahl: geschmiedete Karten +1 Dauerwert je Durchlauf (Asche verfällt nie) // v0

/* ============================================================
   EIS-REWORK v0 — „Was du richtig stellst, erstarrt für immer und wächst." Gletscher: Architektur × Permanenz.
   Spine: SCHICHTEN je Frostkarte (permanent, unverlierbar). KEINE Konsumenten. Werte v0, cross-archetype Sim-Pass.
   ============================================================ */
// Grundmechanik / Zugang
export const ICE_BASE_FREEZE   = 2;    // erster Eis-Skill friert so viele eigene Karten ein
export const FROST_GRIP_BONUS  = 2;    // Frostgriff: +2 eingefrorene Karten
export const GLEITFROST_EXTRA_SWAP = 1;// Gleitfrost: 2. kostenloser Frosttausch (mehr Bank)             // v0
// Schichten (der Spine) — permanenter Dauerwert je Frostkarte
export const ICE_LAYER_VALUE   = 1;    // je Schicht +1 Dauerwert (Gletscher macht es superlinear)        // v0 — tunebar
export const ICE_LAYER_MAX     = 12;   // Deckel wirksamer Schichten je Karte (Wert/Eisdruck/Vergletscherung) // Anti-Runaway v0.1: Bank-Pfad → 32 Schichten/Karte
export const ICE_ABLAGE_A_LAYER = 1;   // Ablage A: Frostkarte siegt in ≥1 Formation → +1 Schicht          // v0
export const ICE_ABLAGE_SCORE_PER_LAYER = 20; // Frost-Sieg: +Flat-Score je (gedeckelter ≤12) Schicht — „tiefe Pfeiler scoren groß" // v0.2: 8→20 (Ceiling-Blick: Eis an beiden Enden schwächste)
export const PERMAFROST_LAYER_BONUS = 1; // Permafrost (L): +1 Schicht je Ablage                           // v0
export const BESTAENDIGKEIT_LAYER = 1; // Beständigkeit: Sieg in Formation wie im Vordurchlauf → +1 Schicht // v0
export const VERSCHRAENKUNG_LAYERS = 2;// Verschränkung: Sieg in ≥3 Formationen → +2 Schichten             // v0 — tunebar
export const KAELTERESERVE_LAYER = 1;  // Kältereserve: Frostkarte verliert → +1 Schicht (bankt)           // v0
export const EISBLUETE_LAYER   = 1;    // Eisblüte: gefrorene Nachbarn einer ≥2-Formations-Siegkarte → +1 Schicht // v0
// Ablage B (Bank) — ungenutzte Frosttausche
export const ICE_UNUSED_SWAP_LAYER = 1;// ungenutzter Frosttausch → +1 Schicht                            // v0
export const VERDICHTUNG_FACTOR = 2;   // Verdichtung: Ablage-B-Fortschritt ×2                             // v0 — tunebar
// Architektur (Frosttausch meißelt Formationen → Permanenz)
export const GLACIER_PUSH_LAYER = 1;   // Gletscherschub: Frosttausch schafft Formation → +1 Schicht        // v0
export const VERZAHNUNG_LAYER  = 1;    // Verzahnung: Frosttausch → 2. Formation (Überlappung) → +1 Schicht // v0
export const KALTFRONT_VALUE   = 3;    // Kaltfront: getauschte Karte + neuer Nachbar +3 temp Wert (Platzierhilfe) // v0
// Schicht-Schwellen
export const EISDRUCK_STEP     = 0.05; // Eisdruck: +5 % Formationsfaktor je Schicht der Siegkarte          // v0 — tunebar
export const KRISTALLINE_THRESHOLD = 20; // Kristalline Masse: Summe aller Schichten ≥ Schwelle …           // v0 — tunebar
export const KRISTALLINE_VALUE = 2;    // … → alle Frostkarten +2 Wert                                      // v0
// Formations-Interface / Anker
export const CRYSTAL_OFFSET    = 2;    // Kristallform: ±2 Wert-Flex (Joker; Layer-Skalierung v0 aufgeschoben) // v0
export const EISANKER_FACTOR   = 1.25; // Eisanker: Frostkarte als Anker ×1,25 (+ garantierte Schicht)      // v0
export const STILLSTAND_SCORE  = 200;  // Stillstand: +200 Flat, wenn eine Frostkarte in ≥1 Formation siegt  // v0 — tunebar
// Legendäre (Gletscher / Vergletscherung / Architekt)
export const VERGLETSCHERUNG_COUNT     = 2; // Vergletscherung: so viele Gegnerkarten je Frost-Sieg          // v0
export const VERGLETSCHERUNG_PER_LAYER = 1; // … −Wert je Schicht der Siegkarte (min 1)                      // v0 — tunebar
export const ARCHITEKT_STEP    = 0.15; // Architekt: +15 % je zusätzlicher Frostkarte in derselben Spalte (pos%5) // v0 — tunebar

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
