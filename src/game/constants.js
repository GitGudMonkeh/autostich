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
// Ziel-Rundenlänge = 60 Durchläufe (game-feel-Entscheid; der handgesetzte 60-Plan unten ist darauf ausgelegt).
// SIM-Sweep-Haken: per ENV übersteuerbar (im Browser existiert `process` nicht → immer 60). `SIM_MAX_CYCLES=80
// node sim/batch.js …` verlängert für Diagnose; für n ≤ 60 wird ein Prefix des 60-Plans gespielt, darüber
// hinaus wächst DECISION_SCHEDULE über buildSchedule() via TAIL_BLOCK weiter.
export const MAX_CYCLES       = envNum("SIM_MAX_CYCLES", 60);     // Shop-Spec (§2.1): Run über so viele Deck-Durchläufe, danach Ende [TUNING · Sim-übersteuerbar]
// Architekt (#202, Shop-Ersatz): Modul-Default-Schalter. Das Spiel startet den Lauf mit architect:true (START_RUN, App.jsx);
// dieser Default greift nur, wenn keine Action-Flag gesetzt ist (Sim ohne A/B). Im Browser existiert `process` nicht → false.
export const ARCHITECT_ENABLED = (typeof process !== "undefined" && process.env && (process.env.ARCHITECT === "1" || process.env.ARCHITECT === "true")) || false;
// #202/#214: Baseline des geteilten Reroll-Pools (Perk+Skill) je Lauf. Fix, kein Nachschub — Rerolls sind die Belohnungs-
// Fläche für die Meistergrade (#217). Rang-Bonus fädelt später über einen erhöhten Startwert ein.
export const BASE_REROLLS      = envNum("SIM_BASE_REROLLS", 2);
// Feuer-Ziel-Hebel (#202): Verstärkung, mit der eine volle Architekt-Struktur die Glutdividende hebt
// (fireDirect × (1+(struktMult−1)×AMP)). Isoliert Feuer (fireDirect=0 sonst) [Sim-getunt amp=2].
export const FIRE_STRUCT_DIVIDEND_AMP = envNum("SIM_FIRE_STRUCT_DIV_AMP", 2);
// Merge test/sim←main: ENV-Sweep-Haken bleibt, Default = main's Live-Balance (SPW 100→400, Pacing-Pass Sim-validiert).
export const SCORE_PER_WIN    = envNum("SIM_SCORE_PER_WIN", 400);    // Basispunkte je Sieg (Perks/Formationen skalieren darauf) [TUNING · Default = Live-Balance 400]
export const CRIT_BASE_MULT   = envNum("SIM_CRIT_BASE_MULT", 1.5);   // V2 (§22.3): Basis-Crit-Multiplikator; der Crit-Mult-Stat baut darauf auf [TUNING]
export const PERKS_OFFERED    = 3;      // Perks pro Level-Up-Auswahl [TUNING]
// SIM-SÄTTIGUNGSHEBEL (Pacing-Experiment, Default AUS): weicher Deckel auf den Score JE SIEG. Ab dem Knie
// WIN_SOFTCAP (Score/Sieg) zählt nur noch WIN_SOFTCAP_SLOPE des Überschusses (gained' = K + (gained−K)×slope).
// Ziel: die Per-Sieg-Auszahlung SÄTTIGT → die Per-Cycle-Kurve bekommt einen Mid-Run-Peak statt reinem
// Compounding. Anders als Per-Faktor-Caps (Serie/Crit) greift der Deckel am ERGEBNIS, egal welcher Faktor
// explodiert. Nur test/sim: K=0 → No-op (im Browser gibt es kein `process.env` → immer aus).
// Sweep: `SIM_WIN_SOFTCAP=5000 SIM_WIN_SOFTCAP_SLOPE=0.2 node sim/batch.js --mode pacing …`.
export const WIN_SOFTCAP       = envNum("SIM_WIN_SOFTCAP", 0);          // 0 = aus; >0 = Knie K in Score/Sieg
export const WIN_SOFTCAP_SLOPE = envNum("SIM_WIN_SOFTCAP_SLOPE", 0.25); // Rest-Steigung über dem Knie (0…1)

// Stat-System (V2 §22.3) — bei jedem Stat-Pick alle vier angeboten, einer gewählt; additiv, keine Caps [TUNING]
export const STAT_CRIT_CHANCE_STEP = envNum("SIM_STAT_CRIT_CHANCE_STEP", 0.07);  // Crit-Chance: +7 Prozentpunkte je Pick (#94; #161 FB-6: 0,05→0,07)
export const STAT_CRIT_MULT_STEP   = envNum("SIM_STAT_CRIT_MULT_STEP", 0.25);    // Crit-Multiplikator: +0,25× je Pick (auf Basis 1,5) [#Pass3: 0,2→0,25 Crit-Buff]
export const STAT_FORM_MULT_STEP   = envNum("SIM_STAT_FORM_MULT_STEP", 0.05);    // Formations-Mult: +5 % Score JE aktiver Formation an der Siegposition je Pick (count-skaliert, statFormFactor)
export const STAT_STREAK_MULT_STEP = envNum("SIM_STAT_STREAK_MULT_STEP", 0.02);  // Serien-Mult: +2 % Score je aktuellem Serienpunkt je Pick (#94)

// Entscheidungsplan (Shop-Spec §2.2): Typ der Entscheidung VOR Durchlauf n (1-indexiert) = DECISION_SCHEDULE[n-1].
// Fester 60-Einträge-Plan (Ziel-Rundenlänge, vom Dev handgesetzt — löst den alten 44-Plan ab). Engine liest
// DECISION_SCHEDULE[cycle] (nach cycle += 1); der Start-Entscheid (Index 0 = "stat") läuft über START_RUN.
// Verteilung: 13 Stat · 13 Perk · 12 Formation · 12 Shop (Architekt) · 10 Skill (≈ 21,7/21,7/20/20/16,7 %) —
// bewusste Verschiebung Richtung Brett+Skill (mehr „bauen & Motoren", weniger Regler drehen).
// Shop-Zeitpunkte (Durchlauf): 4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 58 · Skill: 7, 12, 18, 25, 32, 38, 43, 50, 55, 59.
// Design-Invariante (Architekt→Aufstellung): JEDES Shop-Fenster wird exakt 2 Durchläufe später von einer
// Formationsphase gefangen (4→6, 9→11, …, 58→60) = die Bauzeit-Einheit für den geplanten Architekt-Umbau.
// „Shop" bleibt vorerst der bestehende Anker-Shop (das Architekt-Redesign ist noch in Planung).
const BASE_SCHEDULE = [
  "stat", "perk", "stat", "shop", "perk", "formation", "skill", "stat", "shop", "perk",           //  1–10
  "formation", "skill", "stat", "shop", "perk", "formation", "stat", "skill", "shop", "perk",      // 11–20
  "formation", "stat", "perk", "shop", "skill", "formation", "stat", "perk", "shop", "stat",       // 21–30
  "formation", "skill", "perk", "shop", "stat", "formation", "perk", "skill", "shop", "stat",      // 31–40
  "formation", "perk", "skill", "shop", "stat", "formation", "perk", "stat", "shop", "skill",      // 41–50
  "formation", "perk", "stat", "shop", "skill", "formation", "perk", "shop", "skill", "formation", // 51–60
];
// Schwanz-Block für Runs ÜBER 60 Cycles hinaus (nur SIM_MAX_CYCLES > 60, reine Sweep-Diagnose). Hält grob das
// 60er-Mix-Verhältnis, clustert nicht (nie zwei Shop/Skill hintereinander) und doppelt nicht an der 60/61-Grenze
// (Cycle 60 = formation → Block-Start = perk).
const TAIL_BLOCK = [
  "perk", "stat", "formation", "shop", "perk", "skill", "stat", "formation", "shop", "perk", "stat", "skill",
];
// Entscheidungsplan der Länge n: für n ≤ 60 ein exaktes Prefix des handgesetzten 60-Plans; darüber hinaus wird
// TAIL_BLOCK wiederholt (nur für SIM_MAX_CYCLES-Sweeps > 60). Pur & testbar; die Engine liest ausschließlich
// das daraus gebaute DECISION_SCHEDULE.
export function buildSchedule(n = MAX_CYCLES) {
  if (n <= BASE_SCHEDULE.length) return BASE_SCHEDULE.slice(0, n);
  const out = BASE_SCHEDULE.slice();
  for (let i = 0; out.length < n; i++) out.push(TAIL_BLOCK[i % TAIL_BLOCK.length]);
  return out;
}
export const DECISION_SCHEDULE = buildSchedule(MAX_CYCLES);
// Erste Skill-Runde (1-indexierter Durchlauf), driftfest aus dem festen Plan abgeleitet — für UI-Texte, die dem
// Spieler sagen, ab wann Skills wählbar sind. Ändert sich der Plan, wandert die Zahl automatisch mit.
export const FIRST_SKILL_CYCLE = DECISION_SCHEDULE.indexOf("skill") + 1;

// (#229: Shop-Münzökonomie + Shop-Angebots-Konstanten entfernt — der Shop ist weg, es gibt keine Münzen/Angebote mehr.)
// Anzeige-Labels der (ex-Shop-)Kategorien — von der Chronik-Ziel-Beschriftung noch referenziert.
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
export const STREAK_STAT_CAP  = envNum("SIM_STREAK_STAT_CAP", 1.75); // Stat-Serien-Faktor höchstens +175 % [Balance: 3,0→1,75 — deckelte den Sustained-Streak-Rekord-Runaway (Pflanze-Paare, Serie 262); Median/p95/andere Fraktionen unberührt, Sim-validiert]
// Crit-Multiplikator-STAT-Cap (Pendant zum Serien-Cap): statCritMult war der LETZTE ungedeckelte Stat-Multiplikator
// → Crit-Runaway-Treiber (Bl+Pf). Default Infinity = kein Cap (Bestandsverhalten, im Browser inaktiv). Nur die
// STAT-Zutat wird gedeckelt, nicht Basis-Crit/Perks/Donnergott. Sweep: `SIM_STAT_CRIT_MULT_CAP=1 node …`.
export const STAT_CRIT_MULT_CAP = envNum("SIM_STAT_CRIT_MULT_CAP", Infinity); // max additiver Crit-Mult aus dem Stat
// (D3_HIGH_MIN/D4_LOW_MAX entfernt — die Score-Perks sind zu Familien migriert, #167; Schwellen jetzt je Stufe in families.js.)

// Raritäts-System (#33) [TUNING]
export const RARITY_WEIGHTS            = { common: 100, rare: 25, legendary: 9 }; // 3-Stufen-Rarität; „common" = normal [TUNING]
// Perk-Auswahl nach jeder Runde: KEINE Level-Gates — alle Seltenheiten sofort, nur gewichtet.
export const MAX_LEGENDARIES_PER_OFFER = 1;    // höchstens so viele Legendaries je Angebot

// Legendär-Roll (Shop-Spec §10 P5/P6): expliziter Wurf vor jedem Perk-/Skill-Angebot. Bei Erfolg wird genau
// EIN Legendäres erzwungen, sonst enthält das Angebot keins. Chance = Basis + Bonus (P5/P6, je +5 pp), Bonus-Cap. [TUNING]
export const PERK_LEGENDARY_BASE       = envNum("SIM_PERK_LEGENDARY_BASE", 0.03); // Basis-Legendär-Chance Perk-Angebot [0,08→0,03; Sim-tunebar für Legendär-Perk-Messung]
export const SKILL_LEGENDARY_BASE      = envNum("SIM_SKILL_LEGENDARY_BASE", 0.03); // Basis-Legendär-Chance Skill-Angebot = 3 %, JE ARCHETYP gewürfelt (#263: 0,04→0,03 zurück; #247-Mechanik bleibt: eigener Wurf pro Fraktion → mehrere Legendäre je Angebot möglich)
export const MAX_LEGENDARY_CHANCE_BONUS = 0.15; // Cap des additiven Bonus (P5/P6): max +15 pp

/* ============================================================
   LEGENDÄR-PERKS-REWORK (#203, 2026-07-30): 11 generische Legendäre (nach Hook, kein Archetyp).
   3 behalten (Unaufhaltsam/Raserei/Kritische Masse), 8 neu. Alle Knöpfe ENV-tunebar (Default = v0-Startwert).
   ============================================================ */
// v0.1-Balance (2026-07-30, perk-impact.mjs @ SIM_PERK_LEGENDARY_BASE=0.7, je nativem Skill-Lean): Ziel-Band ~1,2–1,7×
// Grenzbeitrag = Median(mit Perk) ÷ Median(gleicher Lean ohne Legendäre). Erreicht: Krit.Masse 1,51 · Unaufhaltsam 1,49 ·
// Sammler 1,31 · Vabanque 1,31 (nativ=Front-Load, s. u.) · Brennpunkt 1,28 · Henker 1,26 · Umverteilung 1,25 · Echo 1,22 ·
// Patt 1,20 · Zinseszins 1,19 · Raserei 1,14 (Favorit, ikonische +5 %/Serie belassen). Runaway-Check (Max forced-0.7 ÷
// Baseline-Max): ×-Cluster (Brennpunkt/Henker/Sammler) CLEAN (0,51–1,12× — feste ×-Multiplikatoren gedeckelt). Winrate-
// Hebel Patt/Unaufhaltsam/Umverteilung tragen erwartete Fat-Tails (Serien-Snowball, von STREAK_STAT_CAP gebändigt, abs. in
// der Elementar-Chase-Decke ~73M, Max-Ratio < Elementar-Max-Spread 7,47×). Straffungs-Knöpfe: PATT_MARGIN, UNAUFHALTSAM_VALUE.
// VABANQUE: nativer Kontext ist FRONT-LOAD (stärkste Karten nach vorn → Eröffnung sichern); ohne Aufstellung ~1,11× (falscher
// Kontext). `playerOrder` ist persistent+arrangierbar → ohne Deckel per-Durchlauf-Exploit (~24×/Lauf, +8,4M). VABANQUE_MAX_
// PAYOUTS deckelt hart: Front-Load max 3× (1,31×), Greedy natürlich ~2× → Exploit erschlagen, Front-Load kaum voraus.
export const UNAUFHALTSAM_VALUE  = envNum("SIM_UNAUFHALTSAM_VALUE", 3);   // Unaufhaltsam (Serie): nächste Karte +Wert solange Serie läuft [4→3: war 2,03× überzogen]
export const KRITMASSE_VALUE     = envNum("SIM_KRITMASSE_VALUE", 3);      // Kritische Masse (Crit): Dauerwert je Crit, Deckel [4→3: war 1,74×]
export const RASEREI_CRIT_STEP   = envNum("SIM_RASEREI_CRIT_STEP", 0.05); // Raserei (Serie): +Crit-Chance je Sieg-Folge [Favorit, unverändert]
export const ZINSESZINS_STEP     = envNum("SIM_ZINSESZINS_STEP", 1600);   // Zinseszins (Durchlauf-Bilanz): +flacher Dauer-Score je positivem Durchlauf (stapelt, KEIN Mult) [900→1600]
export const VABANQUE_SCORE      = envNum("SIM_VABANQUE_SCORE", 400000);  // Vabanque (Eröffnung): erste N Stiche eines Durchlaufs in Folge → +Score [3000→400000: per Durchlauf, s. engine.js]
export const VABANQUE_TRICKS     = envNum("SIM_VABANQUE_TRICKS", 5);      // …          … so viele Eröffnungs-Stiche
export const VABANQUE_MAX_PAYOUTS = envNum("SIM_VABANQUE_MAX_PAYOUTS", 3); // … Lauf-Deckel: so oft zahlt Vabanque max je Lauf (Anti-Front-Load-Exploit; s. engine.js)
export const HENKER_MULT         = envNum("SIM_HENKER_MULT", 2.0);        // Henker (Segment-Finale): Score × in der End-Zone + garantierter Crit
export const HENKER_ZONE_START   = 35;                                    // … ab Deck-Position 36 (Index 35) = letztes Segment 36–40
export const SAMMLER_STEP        = envNum("SIM_SAMMLER_STEP", 0.15);      // Sammler (Formationsvielfalt): +Formations-Mult je distinct Formationsart im Durchlauf
export const SAMMLER_MAX         = envNum("SIM_SAMMLER_MAX", 5);          // … höchstens so viele Arten gezählt
export const BRENNPUNKT_MULT     = envNum("SIM_BRENNPUNKT_MULT", 2.5);    // Brennpunkt (Formations-Tiefe): Score × wenn Karte in ≥ MIN gleichzeitigen Formationen gewinnt [2,0→2,5]
export const BRENNPUNKT_MIN_FORMS = envNum("SIM_BRENNPUNKT_MIN_FORMS", 3);// … Mindestzahl gleichzeitiger Formationen
export const PATT_MARGIN         = envNum("SIM_PATT_MARGIN", 2);          // Patt (knappe Niederlage): Niederlage um ≤ diese Marge zählt als Sieg [1→2]
export const ECHO_FACTOR         = envNum("SIM_ECHO_FACTOR", 1.6);        // Echo (bester Stich): am Durchlauf-Ende den höchsten Stich × diesem Faktor nochmal gutschreiben [1,0→1,6]
export const MONOCHROM_STEP      = envNum("SIM_MONOCHROM_STEP", 0.15);    // Monochrom (Farbserie): +Score-Mult je Folgesieg derselben Farbe (Zusatzfaktor, multiplikativ)
export const MONOCHROM_CAP       = envNum("SIM_MONOCHROM_CAP", 1.5);      // … Deckel des Zusatz-Mults (+150 % → Peak ×2,5 bei Farbserie 11); Farbwechsel/Niederlage setzt zurück
export const RICHTFEST_STEP      = envNum("SIM_RICHTFEST_STEP", 250);     // Richtfest (Gebäude-Struktur): +dauerhafter Score je vollendeter Struktur/Durchlauf (stapelt, Auszahlung je Durchlauf-Ende, kein Mult)
export const BAUHUETTE_COVER     = envNum("SIM_BAUHUETTE_COVER", 8);      // Bauhütte (Gebäude-Baufeld): hebt beim Pick den Baufeld-Deckel (maxCover) dauerhaft um so viele Zellen

// Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md) [TUNING]
export const SKILL_SLOTS       = envNum("SIM_SKILL_SLOTS", 6);    // max gleichzeitig gehaltene Skills [Default 6 = echtes Spiel (Autostich_Test); ENV-Sweep-Haken SIM_SKILL_SLOTS z. B. =4 für den alten main-Stand]
export const SKILLS_OFFERED     = envNum("SIM_SKILLS_OFFERED", 12);   // Skills je Skill-Runde [Default 12 = 3+3+3+3 (je 3 pro Fraktion, alle 4 im Angebot); ENV-Sweep-Haken, z. B. =6 für den alten 2+2+2-Stand]
export const MAX_ARCHETYPES     = envNum("SIM_MAX_ARCHETYPES", 4);    // gleichzeitig aktive Fraktionen [Default 4 = alle 4 mischbar; ENV-Sweep-Haken, z. B. =3 für den Sim-validierten 3-von-4-Stand (Cross-Vergleich)]
// (vestigial entfernt: SKILL_EVERY_CYCLES — Skill-Runden kommen nicht mehr „jede 3.", sondern aus dem festen DECISION_SCHEDULE; siehe FIRST_SKILL_CYCLE)
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
// Reaktoren (Reststrom-Boden + Gewitterfront)
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
// Ladungsserie (ehem. Geladene Serie) — Serie speist die Crit-Maschine (kein Konsument mehr): je Serienpunkt +Crit-Chance (Cap).
export const SERIESCRIT_STEP          = 0.02; // Ladungsserie: +2 pp Crit-Chance je Serienpunkt                     // v0 — tunebar
export const SERIESCRIT_CAP           = 0.30; // Ladungsserie: … bis +30 pp                                          // v0 — tunebar
// On-Consume-Passives (jeder volle Ladungsverbrauch): Statische Aufladung (Flat-Score), Blitzableiter (Ladung zurück), Dauerstrom (Crit-Rampe).
export const CONSUME_SCORE            = 40;   // Statische Aufladung: +Score bei jedem vollen Ladungsverbrauch      // v0 — tunebar
export const BLITZABLEITER_CONSUME_CHARGE = 1;// Blitzableiter: +Ladung zurück bei jedem vollen Verbrauch           // v0 — tunebar
export const DAUERSTROM_CONSUME_CRIT  = 0.02; // Dauerstrom: +2 pp Crit-Chance je vollem Verbrauch (dauerhaft)      // v0 — tunebar
export const DAUERSTROM_CONSUME_CRIT_CAP = 0.20; // Dauerstrom: … gedeckelt bei +20 pp                              // v0 — tunebar
export const WETTERLEUCHTEN_THRESHOLD = 5;    // Wetterleuchten: bei jeder 5. Serienstufe ionisieren                // v0
export const WETTERLEUCHTEN_COUNT     = 2;    // Wetterleuchten: … so viele Karten                                  // v0 — tunebar
export const DOPPELENTLADUNG_FACTOR   = envNum("SIM_DOPPELENTLADUNG_FACTOR", 3);    // Doppelentladung (L): Konsumenten feuern FACTOR-fach (Ionisierungs-Anzahl x FACTOR) [Legendaer-Buff v1: 2->3]
export const DURCHSCHLAG_CRIT_MULT    = 0.25; // Durchschlag (L): volle Ionis. (5) + Crit → dauerhaft +0,25× Crit-Mult // v0 — tunebar
export const DURCHSCHLAG_MULT_CAP     = 2.0;  // Durchschlag: Deckel des dauerhaften Crit-Mult-Bonus (Anti-Runaway v0.1: uncapped → +100× im Smoke)
// Blitz-Legendär-Reshape (2026-07-30): die Ionisierung FLUTET (blitz-economy.mjs: alle Karten @Deckel 5, ~ganzes Deck ab Cycle 20)
// → „mehr Ionis."-Legendäre (Doppelentladung/Flächenionisation) waren tot (1,01×/0,90×). Sie lesen jetzt den BESTAND des
// gesättigten Feldes und zahlen je IONISIERTEM Sieg DIREKT (post-stack, hart gedeckelt = Plateau, bekenntnis-skaliert = cross-health).
// Nur Legendär-Halter → generisches Blitz (ION_SCORE_PER_STACK) unberührt. Analog zur Eis-Überlauf-Dividende.
export const FLAECHENION_DIRECT       = envNum("SIM_FLAECHENION_DIRECT", 70);  // Flächenionisation (Sturmzelle, BREITE): DIREKTer Score je ionisiertem Sieg × #ionisierte Karten [reshape 1,30×]
export const FLAECHENION_FIELD_CAP    = envNum("SIM_FLAECHENION_FIELD_CAP", 30); // … gedeckelte Feldbreite (max gezählte ionisierte Karten)
export const DOPPELENT_DIRECT         = envNum("SIM_DOPPELENT_DIRECT", 16);    // Doppelentladung (endloser Sturm, ENERGIE): DIREKTer Score je ionisiertem Sieg × Σ Stapel im Feld [reshape ~1,28×]
export const DOPPELENT_FIELD_CAP      = envNum("SIM_DOPPELENT_FIELD_CAP", 120); // … gedeckelte Feldenergie (max gezählte Σ Stapel)

/* ============================================================
   FEUER-REWORK v0 — Hitzeleiste 0–100. „Hitze belohnt totale Überlegenheit."
   Alle Zahlen sind Vorschlags-Startwerte (v0), geerdet an der bestehenden Hitze-Ökonomie
   (Gewinn ≈ (Vorsprung−2) %, Score-Basis 400). Werte-Tuning: cross-archetype Sim-Pass. [v0 · tunebar]
   ============================================================ */
// Grundmechanik (passiv)
export const HEAT_MAX          = 100;  // Hitzemaximum (fix)
export const HEAT_MIN_MARGIN   = envNum("SIM_HEAT_MIN_MARGIN", 3);    // Mindest-Wertvorsprung für margen-basierten Hitzegewinn & Feuer-Score [Sim-tunebar]
export const HEAT_PER_POINT    = envNum("SIM_HEAT_PER_POINT", 1);    // % Hitze je (Vorsprung−2) [Sim-tunebar]
export const HEAT_MARGIN_CAP   = envNum("SIM_HEAT_MARGIN_CAP", 8);    // Deckel des effektiven Vorsprungs im Hitzegewinn [Sim-tunebar]
export const HEAT_LOSS_MAX     = envNum("SIM_HEAT_LOSS_MAX", 10);   // max Hitzeverlust je Niederlage (%) [Sim-tunebar: Kühlung fürs Halte-Playstyle]
export const HEAT_LOSS_PCT     = envNum("SIM_HEAT_LOSS_PCT", 0.25); // zusätzl. Hitzeverlust je Niederlage = Anteil der AKTUELLEN Hitze — hält hohe Hitze nicht-trivial (beißt NUR bei hoher Hitze → Konsum-Builds unberührt; Halte-Playstyle muss Hitze durch Siege halten) [Fire-Heat-Fix]
export const FIRE_SCORE_BASE   = envNum("SIM_FIRE_SCORE_BASE", 25);   // Feuer-Flat-Score je Punkt (erster Feuer-Skill) [Sim-tunebar]
export const FIRE_SCORE_PER_SKILL = 5; // +Feuer-Flat je Punkt je weiterem Feuer-Skill    // v0 — tunebar
export const FIRE_MARGIN_OFFSET = envNum("SIM_FIRE_MARGIN_OFFSET", 2); // Feuer-Score-Offset: s = (Vorsprung − OFFSET) × Basis; kleiner = knappe Siege zahlen (Floor-Hebel) [Sim-tunebar]
// GLUTDIVIDENDE (Feuer-Rework, FLOOR-Hebel): ein DIREKTER Score je Feuer-Sieg, der NICHT durch den Serien/Crit/
// Formations-Stack multipliziert wird (er zählt flach NACH der Multiplikation). Damit hebt er den Median (kleine
// Mults → der flache Aufschlag ist relativ groß) deutlich stärker als das Ceiling (riesige Mults → der Aufschlag
// verschwindet relativ). ∝ gehaltener Hitze beim Sieg, gedeckelt bei FIRE_DIVIDEND_HEAT_CAP (Sättigung: Top-Runs
// mit Vollhitze ziehen den Deckel nicht weiter hoch → floor-clean). Das ist Feuers fehlende „Immer-an-Engine".
export const FIRE_HEAT_DIVIDEND     = envNum("SIM_FIRE_HEAT_DIVIDEND", 48);      // direkter Score je Hitze-% je Feuer-Sieg (0 = aus), skaliert mit Feuer-Bekenntnis; Sweep 60c → reines Feuer ≈ Blitz-Parität, Ceiling ~flat [TUNING · Feuer-Floor]
export const FIRE_DIVIDEND_HEAT_CAP = envNum("SIM_FIRE_DIVIDEND_HEAT_CAP", 45);  // Hitze-Deckel für die Dividende (Sättigung → floor-clean) [TUNING · Feuer-Floor]
// Linie 1 — Generation (Marge · Konstanz · Serie)
export const EMBER_MULT        = 1.5;  // Glut: Hitzegewinn ×1,5                            // v0 — tunebar
export const ZUNDER_HEAT       = envNum("SIM_ZUNDER_HEAT", 2);    // Zunder: +2 % Hitze je Sieg (auch knappe Siege) [Sim-tunebar]
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
export const CONFLAG_MIN_HEAT = envNum("SIM_CONFLAG_MIN_HEAT", 80);     // Flächenbrand: ab 80 % Hitze bewaffnet [Sim-tunebar]
export const CONFLAG_PER_HEAT = 12;     // Flächenbrand: +12 Score je verbrannten Hitzepunkt (verbrennt die GANZE Hitze) // v0
export const MELT_COST        = 10;     // Schmelzpunkt: −10 % Hitze je Stich                // v0 — tunebar
export const MELT_PER_HEAT    = 5;      // Schmelzpunkt: +5 Score je verbrauchtem Hitzepunkt // v0 — tunebar
// Linie 6 — Verbrennen → Schmieden (Brand · Asche · Schmiede)
export const BRAND_VALUE      = 1;      // Brandmal: brandmarkierte Gegnerkarte −1 Wert (v0.1: 2→1, Brand-Winrate-Tail zähmen) // tunebar
export const BRAND_ASH        = 1;      // Brandmal/Lauffeuer: +1 Asche je Brand              // v0 — tunebar
export const BRAND_SPREAD_VALUE = 1;    // Lauffeuer: Übergriff auf eine Nachbarkarte −1 Wert // v0 — tunebar
export const FORGE_COST       = 5;      // Ascheschmiede: 5 Asche je Schmiedung               // v0 — tunebar
export const FORGE_VALUE      = envNum("SIM_FORGE_VALUE", 2);      // Ascheschmiede: niedrigste Karte +2 Dauerwert [Sim-tunebar]
export const FORGE_MAX_PER_CARD = 6;    // Schmieden: Deckel geschmiedeter Dauerwert je Karte (Anti-Runaway v0.1: sonst R1→+20)
export const FORGE_MAX_CARDS    = 10;   // Schmieden: max Anzahl VERSCHIEDENER geschmiedeter Karten (v0.2: Ascheschmiede = Boden heben, nicht ganzes Deck buffen → Winrate-Snowball)
// Asche-Dividende (v0.3): ungenutzte Asche (Schmieden ist gedeckelt → Asche stapelt tot) gibt einen kleinen DIREKTen
// Score je Feuer-Sieg — post-stack, GEDECKELT (kein Hort-Runaway), bekenntnis-skaliert (kein Splash-Abuse). [Sim-tunebar]
export const ASH_DIVIDEND      = envNum("SIM_ASH_DIVIDEND", 2); // Score je gehaltener Asche pro Feuer-Sieg (kleiner Buff ~+8 %)
export const ASH_DIVIDEND_CAP  = envNum("SIM_ASH_DIVIDEND_CAP", 300); // Deckel der gezählten Asche (darüber kein weiterer Wert → Hort lohnt nicht)
export const GLUTSTAHL_PER_VALUE = 12;  // Glutstahl: +Score je geschmiedetem Wert bei Sieg // v0.2: 20→12 (Feuer-Ceiling-Trim, Brand+Schmiede-Explosion)
export const SCHMELZOFEN_MIN_HEAT = 50; // Schmelzofen: ab 50 % Hitze …                       // v0 — tunebar
export const SCHMELZOFEN_BRAND_BONUS = 1;   // … Brände −1 extra Wert & +1 extra Asche         // v0 — tunebar
export const SCHMELZOFEN_FORGE_DISCOUNT = 1;// … Schmieden kostet 1 Asche weniger              // v0 — tunebar
// Legendäre — UMGEFORMT (dauerhaft/compoundend/direkt statt situativ), vier verschiedene Achsen.
// Sonnenzorn (L) — SCORE-Mult ∝ HÖCHSTER je gehaltener Hitze (heat.peak): dauerhafter Feuer-Score-Multiplikator.
export const SUNWRATH_PEAK_STEP    = envNum("SIM_SUNWRATH_PEAK_STEP", 0.010); // +GESAMT-Score je Peak-Hitze-% (Peak 100 → ×2,0) [Legendär-Umbau]
// Sonnenkern (L) — WIN-CONDITION: endet ein Durchlauf mit hoher Hitze, brennt sie sich dauerhaft in ALLE Karten (+Wert).
export const SONNENKERN_MIN_HEAT   = envNum("SIM_SONNENKERN_MIN_HEAT", 70);   // ab dieser End-Hitze brennt Sonnenkern ein [Legendär-Umbau]
export const SONNENKERN_VALUE      = envNum("SIM_SONNENKERN_VALUE", 1);       // +Dauerwert je heißem Durchlauf (auf Karten unter dem Deckel) [Legendär-Umbau]
export const SONNENKERN_CARD_CAP   = envNum("SIM_SONNENKERN_CARD_CAP", 7);    // nur Karten UNTER diesem Wert brennen ein → hebt den Deck-BODEN (selbst-limitierend, kein Auto-Sieg) [Legendär-Umbau]
// Phönixfeuer (L) — KONSISTENZ: Niederlagen GEBEN Hitze (+je Rückstandspunkt) statt sie zu nehmen; + Reignite bei Konsum-0.
export const PHOENIX_LOSS_HEAT     = envNum("SIM_PHOENIX_LOSS_HEAT", 8);      // +Hitze je Rückstandspunkt bei Niederlage (statt Verlust) [Legendär-Umbau]
export const PHOENIX_REIGNITE      = envNum("SIM_PHOENIX_REIGNITE", 0.40);    // verbrauchte Hitze entzündet neu (Anteil zurück), 1×/Durchlauf
// Damaststahl (L) — DIREKT-SCORE: geschmiedete Siegkarte → direkter Score ∝ geschmiedetem Wert (am Stack vorbei); Deckel entfällt; Asche verfällt nie.
export const DAMASCUS_MAX_FORGED   = envNum("SIM_DAMASCUS_MAX_FORGED", 4);    // Selbst-Schmiede deckelt auf so viele Karten (gegen 60-Runden-Compounding) [Legendär-Umbau]
export const DAMASCUS_FORGE_GROWTH = envNum("SIM_DAMASCUS_FORGE_GROWTH", 0);  // geschmiedete Karten +Dauerwert je Durchlauf (0 = kein Compounding) [Legendär-Umbau]
export const DAMASCUS_DIRECT       = envNum("SIM_DAMASCUS_DIRECT", 16);        // direkter Score je Punkt GESAMT-Schmiedewert, je Sieg (Damast-Dividende) [Legendär-Umbau]
export const DAMASCUS_COMBAT       = envNum("SIM_DAMASCUS_COMBAT", 5);        // Underdog: geschmiedete Karten kämpfen mit +Wert (schlagen über ihrem Gewicht) [Legendär-Umbau]
// (Sonnenzorns alte ≥MIN_HEAT-Verstärkungen ausgebaut → Glühende Klinge/Weißglut sind jetzt reine Nicht-Legendär-Skills.)

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
export const ICE_ABLAGE_SCORE_PER_LAYER = envNum("SIM_ICE_ABLAGE_SCORE_PER_LAYER", 12); // Frost-Sieg: +Flat-Score je (gedeckelter ≤12) Schicht [Balance: 20→12 — der v0.2-Buff 8→20 war solver-los fehlkalibriert (Eis sah schwach aus), mit Aufstellung korrigiert; Sim-tunebar]
export const PERMAFROST_LAYER_BONUS = envNum("SIM_PERMAFROST_LAYER_BONUS", 2); // Permafrost (L): +Schichten je Ablage [Legendär-Buff v1: 1→2]
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
export const EISDRUCK_STEP     = envNum("SIM_EISDRUCK_STEP", 0.05); // Eisdruck: +% Formationsfaktor je Schicht der Siegkarte [Sim-tunebar]
export const KRISTALLINE_THRESHOLD = 20; // Kristalline Masse: Summe aller Schichten ≥ Schwelle …           // v0 — tunebar
export const KRISTALLINE_VALUE = 2;    // … → alle Frostkarten +2 Wert                                      // v0
// Formations-Interface / Anker
export const CRYSTAL_OFFSET    = envNum("SIM_CRYSTAL_OFFSET", 1);    // Kristallform: ±N Wert-Flex (Joker) [Balance: 2→1 — der ±2-Joker war ein Ceiling-Monster (Eis-Max −70 %, Median fast unberührt); Sim-tunebar] // v0
export const EISANKER_FACTOR   = 1.25; // Eisanker: Frostkarte als Anker ×1,25 (+ garantierte Schicht)      // v0
export const STILLSTAND_SCORE  = 200;  // Stillstand: +200 Flat, wenn eine Frostkarte in ≥1 Formation siegt  // v0 — tunebar
// Legendäre (Gletscher / Vergletscherung / Architekt)
export const VERGLETSCHERUNG_COUNT     = 2; // Vergletscherung: so viele Gegnerkarten je Frost-Sieg          // v0
export const VERGLETSCHERUNG_PER_LAYER = 1; // … −Wert je Schicht der Siegkarte (min 1)                      // v0 — tunebar
export const ARCHITEKT_STEP    = envNum("SIM_ARCHITEKT_STEP", 0.55); // Architekt (L): +% je zusätzlicher Frostkarte in derselben Spalte (pos%5) [Legendär-Reshape: 0,35→0,55 — die einzige Geometrie-Legendäre (nicht deckel-limitiert), hebt 1,14→Band]
// ── Legendär-Reshape (2026-07-30): Tiefe über die Legendären wiederbeleben. Die ÜBERLAUF-Tiefe (Schichten über
//    ICE_LAYER_MAX) ist generisch verschwendet (~58 von 70/Karte). Gletscher/Permafrost verwandeln sie in DIREKTEN,
//    post-stack, HART gedeckelten Score (Damaststahl-Lektion: permanente Akkumulation über 60 Runden = Plateau, kein
//    Wachstum). Nur Legendär-Halter → generisches Eis (Deckel 12, #1-Floor) bleibt unberührt. Bekenntnis-skaliert (cross-health).
export const GLETSCHER_DIRECT        = envNum("SIM_GLETSCHER_DIRECT", 68);       // Gletscher: Score je DREIECKS-Einheit m(m+1)/2 der Tiefe des TIEFSTEN Pfeilers (superlinear, Konzentration), je Frost-Sieg [Sweep: →1,32×]
export const GLETSCHER_OVERFLOW_CAP  = envNum("SIM_GLETSCHER_OVERFLOW_CAP", 20); // … gedeckelte Pfeiler-Tiefe (Plateau — tieferer Pfeiler zahlt superlinear mehr, dann flach → kein Runaway)
export const PERMAFROST_DIRECT       = envNum("SIM_PERMAFROST_DIRECT", 270);     // Permafrost: Score je Überlauf-Schicht — SUMME über alle Frostkarten (Breite — viele banken), je Frost-Sieg
export const PERMAFROST_OVERFLOW_CAP = envNum("SIM_PERMAFROST_OVERFLOW_CAP", 60);// … gedeckelte Gesamt-Überlauf-Summe (Plateau)
export const VERGLETSCHERUNG_DIRECT  = envNum("SIM_VERGLETSCHERUNG_DIRECT", 130);// Vergletscherung: Bonus-Score je Punkt GESAMTER aktiver Gegner-Vergletscherung (Σ frostbiteActive), je Frost-Sieg [Sweep: →1,29×]
export const VERGLETSCHERUNG_DEBUFF_CAP = envNum("SIM_VERGLETSCHERUNG_DEBUFF_CAP", 60); // … gedeckelte Debuff-Summe (Plateau)
// Eis-Ceiling-Hebel (2026-07-30): Eis' Ceiling (p90 ~2,4× Feld) ist ZU 100 % `formBaseMult` — dichte Formations-
// Überlappung (Kristallform-Joker + Frostbrücke) treibt den Frost-Sieg-formBase auf 4-6 (Autopsie Top5% 4,39 vs
// Median 2,32; formStat/iceForm/streak/crit alle flach). Weicher Deckel NUR für Frostkarten, NUR ÜBER der Schwelle:
// Median (formBase < Schwelle) und generisches Nicht-Eis bleiben unberührt → Floor gehalten, nur die Spitze glatt.
// Sweep (60c, N=250): Floor & Ceiling teilen sich dieselbe Formations-Engine → ein Ceiling-Schnitt kostet Floor.
// User-Ziel: Eis auf das Niveau der anderen bringen, nur ein klein wenig darüber. 2,0/0,3 landet Eis-Floor 4,17M
// (Pflanze 4,01M +4 %, klar aber knapp #1), Ceiling p90 12,4M→7,98M (Spread 2,39×→1,54×), Winrates unverändert.
export const ICE_FORMBASE_SOFTCAP = envNum("SIM_ICE_FORMBASE_SOFTCAP", 2.0);  // Schwelle: ab hier greifen Diminishing Returns (0 = aus)
export const ICE_FORMBASE_SLOPE   = envNum("SIM_ICE_FORMBASE_SLOPE", 0.3);    // Anteil des Überschusses über der Schwelle, der noch zählt (0 = harter Deckel, 1 = kein Effekt)

/* ============================================================
   PFLANZE-FRAKTION v0 — „Der Garten, der sich selbst überwuchert." NEU (4. Fraktion). Wachstum (nur steigend) →
   Reife (grün — Farbe, nicht Kraft) → Farbblock → Score. Wert-Deckel 11 (kein Runaway). Werte v0. [v0 · tunebar]
   ============================================================ */
export const PLANT_GREEN_THRESHOLD = envNum("SIM_PLANT_GREEN_THRESHOLD", 8);   // Wachstum-Schwelle für Reife (grün) [Sim-tunebar: höher = Feld ergrünt langsamer → Winrate sättigt weniger] // v0 — tunebar
// Skill-Gate fürs Win-Wachstum (v0.3, Anti-Splash): pro Sieg wächst eine Karte um min(1, PflanzenSkills / REF). Bei REF=3
// volle +1/Sieg ab 3 Pflanzen-Skills; 1 Splash-Skill = 1/3 Speed. Hohes Wachstum ist so an Pflanzen-Deck-COMMITMENT
// (Skill-Anzahl) gegatet, statt 1 Skill zur Pflicht für alle Decks zu machen. [Sim-tunebar]
export const PLANT_GROWTH_SKILL_REF = envNum("SIM_PLANT_GROWTH_SKILL_REF", 3);
export const PLANT_VALUE_CAP       = envNum("SIM_PLANT_VALUE_CAP", 11);  // Wert-Deckel grüner Karten (Auto-Sieg; Tiefe zahlt dann in Score) [Sim-tunebar: 10 = kein Auto-Sieg mehr] // v0
export const PLANT_ANCHOR_VALUE    = 11;  // Alter Anker: Aktivierung startet 1 Karte reif (grün, Wert 11)      // v0
export const PLANT_GREEN_FARBBLOCK_CAP = 3;// Grün-Farbblock-Cap: der eskalierende Farbblock-Faktor grüner Karten wird bei dieser Ordinalzahl gedeckelt (v0.3: ganzes Feld grün → 40er-Block ×8+ war der Runaway) // tunebar
// Linie 1 — Wurzeln (Tiefe: Wert & Wurzeln-Score)
export const WURZELSCHLAG_PER_GROWTH = envNum("SIM_WURZELSCHLAG_PER_GROWTH", 4); // Wurzelschlag: +1 Dauerwert je N Wachstum (grüne Karte, bis Deckel) [Sim-tunebar: höher = Wert wächst langsamer → Auto-Sieg später] // v0
export const WURZELTIEFE_SCORE     = 12;  // Wurzeltiefe: Flat-Score je Sieg einer grünen Karte (Wurzeln-Score) // v0 — tunebar
export const PFAHLWURZEL_MULT      = 2;   // Pfahlwurzel: Wurzeln-Score ×2 bei Formations-Sieg                  // v0
export const JAHRESRINGE_PER_GROWTH = 10; // Jahresringe: je 10 Wachstum der Karte +Wurzeln-Score              // v0
export const JAHRESRINGE_SCORE     = 30;  // … so viel je 10er-Stufe                                            // v0 — tunebar
// Linie 2 — Aussaat (Breite: Wachstum verbreiten)
export const AUSSAAT_GROWTH        = 1;   // Aussaat: +Wachstum je Nachbar bei Sieg einer grünen Karte          // v0
export const SETZLINGSBEET_GROWTH  = 3;   // Setzlingsbeet: niedrigste Karte je Segment startet +3 Wachstum     // v0
export const ZAEHER_HALM_GROWTH    = 1;   // Zäher Halm: graue Karten wachsen +1 auch bei Niederlage            // v0
// Linie 3 — Ranken/Blüte (Grün verbreiten)
export const BLUETE_SCORE          = 15;  // Blüte: +Score je grüner Karte im Segment (wenn Nachbarn grün)      // v0 — tunebar
export const BLUETEZEIT_MULT       = 2;   // Blütezeit: Blüte-Score ×2 bei Formations-Sieg                      // v0
// Linie 4 — Überwucherung (Mono-Grün-Payoff)
export const PHOTOSYNTHESE_MULT    = 1.08;// Photosynthese: grüne Karte in Formation → ×1,08 Score              // v0 — tunebar
export const BLAETTERDACH_MIN      = 4;   // Blätterdach: ab 4er-Grün-Farbblock …                               // v0
export const BLAETTERDACH_SCORE    = envNum("SIM_BLAETTERDACH_SCORE", 4);  // … +Score je Karte im Block [Sim-tunebar] // v0 — tunebar
export const BLAETTERDACH_CARD_CAP = 10;  // Blätterdach: max so viele Karten im Block zählen (Deckel gegen Riesenblock) // v0
export const UEBERWUCHERUNG_FIELD  = 0.66;// Überwucherung: ab 66 % Feld grün …                                 // v0 — tunebar
export const UEBERWUCHERUNG_FACTOR = envNum("SIM_UEBERWUCHERUNG_FACTOR", 0.20);// … alle Farbblöcke +0,20 Faktor [Sim-tunebar: der feldweite multiplikative Compounder] // v0
// Linie 5 — Ausläufer (Gegnerdeck: kolonisieren & ernten)
export const AUSLAEUFER_HARVEST    = 2;   // Ausläufer: Ernte einer kolonisierten Gegnerkarte → +Wachstum       // v0 — tunebar
export const ERNTEDANK_SCORE       = 70; // Erntedank: Ernte mit reifer Karte → +großer Flat-Score             // v0 — tunebar
// Legendäre (Verstärker, meist mit Nachteil)
export const WELTENBAUM_PER_GREEN  = envNum("SIM_WELTENBAUM_PER_GREEN", 5);  // Weltenbaum (L): +1 Wachstum je N grüne Karten im Feld (Durchlauf-Ende) [Legendär-Buff v1: 10→5]
export const EWIGER_FRUEHLING_FARBBLOCK = 2; // Ewiger Frühling: Farbblock zählt Grün ab 2 Karten               // v0
export const EWIGER_FRUEHLING_FIELD = envNum("SIM_EWIGER_FRUEHLING_FIELD", 0.25);  // Ewiger Frühling (L): Überwucherung ab diesem Feld-Anteil [Legendär-Buff v1: 0,33→0,25]
// Pflanze-Legendär-Reshape (2026-07-30): Pflanze hat DREI flutende Währungen (plant-economy.mjs: Grün→100% ab Cy28,
// Wachstum weit über den Wert-Deckel = „alter Wald" Σ-Überlauf 1441-4061 verschwendet, Kolonie→40) → alle 4 „mach-mehr"-
// Legendären tot (0,86-1,00×). Sie lesen jetzt den verschwendeten BESTAND und zahlen je GRÜNEM Sieg DIREKT (post-stack,
// floor-clean/ceiling-safe, hart gedeckelt = Plateau, bekenntnis-skaliert plantSkillCount/SKILL_SLOTS). Nur Legendär-Halter
// → generisches Pflanze (die eben bestätigte Balance) unberührt. Analog Eis-Überlauf-Dividende (Permafrost/Gletscher/…).
export const WELTENBAUM_DIRECT       = envNum("SIM_WELTENBAUM_DIRECT", 2.6);  // Weltenbaum (BREITE): DIREKT je grünem Sieg × Σ Überlauf-Wachstum (der ganze alte Wald) [reshape 1,35×]
export const WELTENBAUM_OVERFLOW_CAP = envNum("SIM_WELTENBAUM_OVERFLOW_CAP", 600); // … gedeckelte Waldgröße
export const MUTTERBAUM_DIRECT       = envNum("SIM_MUTTERBAUM_DIRECT", 55);   // Mutterbaum (TIEFE): DIREKT je grünem Sieg × Überlauf-Wachstum des TIEFSTEN Baums (Konzentration) [reshape 1,36×]
export const MUTTERBAUM_OVERFLOW_CAP = envNum("SIM_MUTTERBAUM_OVERFLOW_CAP", 60); // … gedeckelte Tiefe des einen Mutterbaums
export const DORNENKOENIG_DIRECT     = envNum("SIM_DORNENKOENIG_DIRECT", 85);  // Dornenkönig (KOLONIE): DIREKT je grünem Sieg × #kolonisierte Gegnerkarten (~konstante Flut → höherer Satz)
export const DORNENKOENIG_COLON_CAP  = envNum("SIM_DORNENKOENIG_COLON_CAP", 40); // … gedeckelte Kolonie-Breite (ganzes Gegnerdeck)
export const EWIGER_FRUEHLING_DIRECT = envNum("SIM_EWIGER_FRUEHLING_DIRECT", 54); // Ewiger Frühling (GRÜN-FELD): DIREKT je grünem Sieg × #grüne Karten (das ewige Feld) [reshape 1,26×]
export const EWIGER_FRUEHLING_FIELD_CAP = envNum("SIM_EWIGER_FRUEHLING_FIELD_CAP", 30); // … gedeckelte Feldgröße

// Geist (Rekord-Vergleich): Score-Stützstelle alle N Stiche [TUNING]
export const GHOST_STEP = 13;

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
