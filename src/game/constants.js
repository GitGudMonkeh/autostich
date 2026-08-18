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
// Ziel-Rundenlänge = 45 Durchläufe (#267 Struktur-Rework; Ziel-Band 40–50). Der handgesetzte 45-Plan unten
// (Commitment-Funnel Skill→Perk→Aufstellen→Architekt) ist darauf ausgelegt — Builds kommen früher online.
// SIM-Sweep-Haken: per ENV übersteuerbar (im Browser existiert `process` nicht → immer 45). `SIM_MAX_CYCLES=50
// node sim/batch.js …` verlängert/verkürzt für Diagnose; für n ≤ 45 wird ein Prefix des 45-Plans gespielt, darüber
// hinaus wächst DECISION_SCHEDULE über buildSchedule() via TAIL_BLOCK weiter.
export const MAX_CYCLES       = envNum("SIM_MAX_CYCLES", 50);     // #272: Run über so viele Deck-Durchläufe (45→50), danach Ende [TUNING · Sim-übersteuerbar]
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
// BACKSTOP (Crit-Bändigung 2026-08-15): harter Deckel auf den fertigen Crit-Multiplikator, egal aus welchen Kanälen er
// kommt. Die legitime Summe aller gedeckelten Quellen liegt bei ~7,4× (Basis 2,25 + Wucht IV 0,90 + 6 Blitz-Skills 0,60
// + Donnergott 0,40 + Durchschlag 2,00 + Entladung 1,00 + Raserei 1,00) → der Deckel bindet einen ehrlichen Build NICHT,
// fängt aber jede künftige Kombi ab, die wieder eine unbegrenzte Größe in den Multiplikator kippt.
export const CRIT_MULT_CAP    = envNum("SIM_CRIT_MULT_CAP", 8);
// D_OVERCRIT IV (Überschusskrit): höchstens so viele Prozentpunkte Crit-Überschuss zahlen den Zuschlag je Punkt aus.
export const OVERCRIT_EXCESS_PP_CAP = envNum("SIM_OVERCRIT_EXCESS_PP_CAP", 100);
export const CRIT_BASE_MULT   = envNum("SIM_CRIT_BASE_MULT", 2.25);  // Basis-Crit-Multiplikator. #268: 1,5→2,25 — jetzt wo Crit aus der Stat-Phase raus ist, hilft der höhere Basis-Mult differenziell dem Crit-Archetyp Blitz (Sim: Blitz-Floor 1,47×→1,93× Mix), Nicht-Blitz nur schwach (RNG-gegateter Präzision-Crit) [TUNING · Sim-übersteuerbar]
export const PERKS_OFFERED    = 3;      // Perks pro Level-Up-Auswahl [TUNING]
// SIM-SÄTTIGUNGSHEBEL (Pacing-Experiment, Default AUS): weicher Deckel auf den Score JE SIEG. Ab dem Knie
// WIN_SOFTCAP (Score/Sieg) zählt nur noch WIN_SOFTCAP_SLOPE des Überschusses (gained' = K + (gained−K)×slope).
// Ziel: die Per-Sieg-Auszahlung SÄTTIGT → die Per-Cycle-Kurve bekommt einen Mid-Run-Peak statt reinem
// Compounding. Anders als Per-Faktor-Caps (Serie/Crit) greift der Deckel am ERGEBNIS, egal welcher Faktor
// explodiert. Nur test/sim: K=0 → No-op (im Browser gibt es kein `process.env` → immer aus).
// Sweep: `SIM_WIN_SOFTCAP=5000 SIM_WIN_SOFTCAP_SLOPE=0.2 node sim/batch.js --mode pacing …`.
export const WIN_SOFTCAP       = envNum("SIM_WIN_SOFTCAP", 0);          // 0 = aus; >0 = Knie K in Score/Sieg
export const WIN_SOFTCAP_SLOPE = envNum("SIM_WIN_SOFTCAP_SLOPE", 0.25); // Rest-Steigung über dem Knie (0…1)

// (#267 Struktur-Rework: die Stat-Phase ist entfernt. Die vier Kern-Stats — Crit-Chance/Crit-Mult/Formations-Mult/
//  Serien-Mult — waren eine „gelöste" Entscheidung; Formation & Serie behalten ihre BASIS-Systeme (Formationsfaktoren,
//  STREAK_BASE), nur der Stat-Booster obendrauf verschwindet. Crit-Chance/-Mult kommen jetzt aus der Perk-Familie
//  „Präzision" (siehe PRECISION_* unten) bzw. aus Blitz. Basis-Crit = 0. STAT_*_STEP/STREAK_STAT_CAP/STAT_CRIT_MULT_CAP
//  sind damit obsolet und entfernt.)

// Entscheidungsplan (#272): Typ der Entscheidung VOR Durchlauf n (1-indexiert) = DECISION_SCHEDULE[n-1].
// Fester 50-Einträge-Plan (Commitment-Funnel Skill→Perk→Aufstellen→Architekt, vom Dev handgesetzt — löst den 45-Plan
// #267 ab). Engine liest DECISION_SCHEDULE[cycle] (nach cycle += 1); der Start-Entscheid (Index 0 = "skill",
// Runde 1) läuft über START_RUN. Bewusster Blind-Commit: das Deck ist noch vanilla, kein Infoverlust.
// Verteilung: 9 Skill · 13 Perk · 13 Formation (Aufstellen) · 14 Shop (Architekt) · 1 LEGENDÄR. Skills sind
// front-loaded (Runden 1,5,9,13,17,22 füllen die 6 Slots) und tapern aus (31,40,48 = Tausch-Fenster).
// #272 Legendär-Phase (Runde 29, spätes Mid-Game, build-defining): 2 Legendäre aus AKTIVEN Archetypen → fixer
// 7. Slot (kein Tausch); ablehnen → normale Skill-Wahl. Legendäre kommen NUR hier, nicht mehr im Skill-Angebot.
// Ein Block = Skill→Perk→Aufstellen→Architekt: erst Brett stellen, dann das Gebäude drauf. Indizes = sim-tunebar.
const BASE_SCHEDULE = [
  "skill", "perk", "formation", "shop", "skill", "perk", "formation", "shop", "skill", "perk",         //  1–10
  "formation", "shop", "skill", "perk", "formation", "shop", "skill", "perk", "formation", "shop",     // 11–20
  "skill", "perk", "formation", "shop", "skill", "perk", "formation", "shop", "legendary", "perk",     // 21–30
  "formation", "shop", "skill", "shop", "perk", "formation", "shop", "perk", "skill", "shop",          // 31–40  (#293: R39 Aufstellung→Skill)
  "formation", "perk", "skill", "formation", "shop", "perk", "formation", "shop", "perk", "formation", // 41–50  (#293: R43 Skill eingeschoben → alles ab 43 rutscht +1, alter R50-Architekt fällt hinten raus)
];
// Schwanz-Block für Runs ÜBER 50 Cycles hinaus (nur SIM_MAX_CYCLES > 50, reine Sweep-Diagnose). Hält grob das
// 50er-Mix-Verhältnis (ohne Legendär — die eine Legendär-Phase steckt fest im Basis-Plan), clustert nicht
// (nie zwei Shop/Skill hintereinander) und doppelt nicht an der 50/51-Grenze (Cycle 50 = perk → Block-Start = formation).
const TAIL_BLOCK = [
  "formation", "shop", "skill", "perk", "formation", "shop", "perk", "skill", "formation", "shop", "perk", "formation",
];
// Entscheidungsplan der Länge n: für n ≤ 50 ein exaktes Prefix des handgesetzten 50-Plans; darüber hinaus wird
// TAIL_BLOCK wiederholt (nur für SIM_MAX_CYCLES-Sweeps > 50). Pur & testbar; die Engine liest ausschließlich
// das daraus gebaute DECISION_SCHEDULE.
export function buildSchedule(n = MAX_CYCLES) {
  if (n <= BASE_SCHEDULE.length) return BASE_SCHEDULE.slice(0, n);
  const out = BASE_SCHEDULE.slice();
  for (let i = 0; out.length < n; i++) out.push(TAIL_BLOCK[i % TAIL_BLOCK.length]);
  return out;
}
export const DECISION_SCHEDULE = buildSchedule(MAX_CYCLES);
// Welche Perk-Phase (1-basiert) ist der 0-indexierte Cycle `c` im Plan? 0 = keine Perk-Entscheidung.
// Für die 2.-Perk-Phase-Boni (Progression M4/M5): perkPhaseAt(schedule, c) === LEG_PERK2_PHASE.
export const perkPhaseAt = (schedule, c) => (schedule[c] === "perk" ? schedule.slice(0, c + 1).filter((d) => d === "perk").length : 0);
export const LEG_PERK2_PHASE = envNum("PROG_LEG_PERK2_PHASE", 2); // die „2. Perk-Phase" (Runde 6 im 50er-Plan) [TUNING]
export const LEG_OFFER_PER_ARCH_BONUS = envNum("PROG_LEG_OFFER_PER_ARCH_BONUS", 1); // M2: +N R29-Kandidaten je Archetyp [TUNING]
// Erste Skill-Runde (1-indexierter Durchlauf), driftfest aus dem festen Plan abgeleitet — für UI-Texte, die dem
// Spieler sagen, ab wann Skills wählbar sind. Ändert sich der Plan, wandert die Zahl automatisch mit.
export const FIRST_SKILL_CYCLE = DECISION_SCHEDULE.indexOf("skill") + 1;
// Legendär-Phase (1-indexierter Durchlauf), ebenfalls aus dem Plan abgeleitet — für UI-/Glossartexte, die sie
// benennen. Verschiebt sich die Phase im Plan, wandert die Zahl automatisch mit (kein „R29" im Text hartkodiert).
export const LEG_PHASE_CYCLE = DECISION_SCHEDULE.indexOf("legendary") + 1;

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
// Architekt-Serien-Score (Reihenhaus): der streak-Flat skaliert LINEAR mit der Serie und wird ab der Schwelle
// verdoppelt. Wurzelfix gegen den Runaway = KEIN Doppel-Dip: der streakFlat läuft in der Engine am globalen
// Serien-Mult (streakBaseMult) VORBEI (sonst zählt die Serie zweimal → quadratisch). Dieser Cap ist die zusätzliche
// Absicherung gegen pathologische Extremserien (Pflanze-Paare, Serie 262). Cap = Serie 50: normale Serienbuilds
// (Serie ≤ 50) bleiben voll linear/stark, nur der Extremtail wird gekappt. [Balance: 75 → 50]
export const ARCH_STREAK_CAP  = envNum("SIM_ARCH_STREAK_CAP", 50);
// (#267: STREAK_STAT_CAP / STAT_CRIT_MULT_CAP entfernt — die Stat-Booster (Serien-Stat / Crit-Mult-Stat) sind mit der
//  Stat-Phase weg. Serie skaliert nur noch über STREAK_BASE (oben) + Perks; Crit-Mult über Basis 1,5 + Präzision/Blitz.)

/* ============================================================
   PRÄZISION — Crit als Perk-Kategorie (#267 Teil 2). Basis-Crit 0; Crit-Chance/-Mult, die früher aus dem Stat kamen,
   kommen jetzt als RNG-gegatete Perk-FAMILIEN (fünf 4-stufige Familien, KEIN Legendär). Blitz bleibt der verlässliche
   Crit-Archetyp (self-generiert); Präzision ist additiv und für jeden Build wählbar, aber zufalls-abhängig.
   Werte v0 · sim-tunebar. HAUPT-Hebel = Verfügbarkeit/Rarität (PRECISION_OFFER_WEIGHT), NICHT die pp-Stärke:
   zu häufig/stark → Crit wird wieder universell; zu selten → Nicht-Blitz-Crit passiert nie.
   ============================================================ */
// Angebots-Gewicht der Präzision-Familien im Perk-Angebot (multipliziert das Stufen-Gewicht). <1 = seltener, >1 = häufiger.
// Der kritische Balance-Knopf (#267 Haupt-Hebel). Default 1 = normale Familien-Rarität.
export const PRECISION_OFFER_WEIGHT = envNum("SIM_PRECISION_OFFER_WEIGHT", 1);
// Globale Stärke-Skalen (Feintuning obendrauf; 1 = v0-Werte).
export const PRECISION_CHANCE_SCALE = envNum("SIM_PRECISION_CHANCE_SCALE", 1); // skaliert alle Präzision-Crit-CHANCE-pp
export const PRECISION_MULT_SCALE   = envNum("SIM_PRECISION_MULT_SCALE", 1);   // skaliert alle Präzision-Crit-MULT-Boni
// Schärfe (flat +Crit-Chance auf alle Karten) — Grund-Crit-Motor (Stat-Ersatz). pp je Stufe I/II/III/IV.
export const PRECISION_SHARP_PP   = [0.06, 0.09, 0.12, 0.15];
// Wucht (+Crit-Multiplikator auf Basis 1,5) — der Mult-Stat-Ersatz. ×-Bonus je Stufe.
export const PRECISION_FORCE_MULT = [0.25, 0.40, 0.60, 0.90];
// Zielsicherheit (+Crit-Chance auf HOHE Karten; Schwelle weitet sich) — Hochwert-/Überlegenheits-Builds (Feuer-Marge).
export const PRECISION_AIM_THRESH = [9, 8, 7, 6];   // Karten ≥ Schwelle je Stufe
export const PRECISION_AIM_PP     = 0.15;           // … je qualifizierender Karte
// Brennglas (Variante B, gewählt): +Crit-Chance JE Formation ab der 2. an der Siegposition, Cap +3 Extra-Formationen.
// Belohnt Tiefe, nicht bloße Präsenz (der Chase). pp je Formation >1 je Stufe.
export const PRECISION_LENS_PP    = [0.06, 0.08, 0.10, 0.13];
export const PRECISION_LENS_CAP   = 3;              // max gezählte Extra-Formationen (Anti-Runaway)
// Farbfokus (Farbe wählen → +Crit-Chance auf diese Farbe). IV-Twist: statt höherer pp eine ZWEITE wählbare Farbe
// (beide auf Stufe-III-Wert). pp je Stufe (III/IV gleich; IV wählt zwei Farben).
export const PRECISION_COLOR_PP   = [0.10, 0.14, 0.18, 0.18];

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
// NACHMESSEN: `npm run impact` (sim/perk-impact.mjs — hebt SIM_PERK_LEGENDARY_BASE auf 0,7, sonst sind Legendäre
// im Angebot zu selten für ein Urteil). Spalte „typ.×" ist die Band-Zahl unten. Bei jeder Änderung an einem der
// folgenden Knöpfe erneut laufen lassen.
// v0.1-Balance (2026-07-30, perk-impact.mjs @ SIM_PERK_LEGENDARY_BASE=0.7, je nativem Skill-Lean): Ziel-Band ~1,2–1,7×
// Grenzbeitrag = Median(mit Perk) ÷ Median(gleicher Lean ohne Legendäre). Erreicht: Krit.Masse 1,51 · Unaufhaltsam 1,49 ·
// Sammler 1,31 · Vabanque 1,31 (nativ=Front-Load, s. u.) · Brennpunkt 1,28 · Henker 1,26 · Umverteilung 1,25 · Echo 1,22 ·
// Patt 1,20 · Zinseszins 1,19 · Raserei 1,14 (Favorit, ikonische +5 %/Serie belassen). Runaway-Check (Max forced-0.7 ÷
// Baseline-Max): ×-Cluster (Brennpunkt/Henker/Sammler) CLEAN (0,51–1,12× — feste ×-Multiplikatoren gedeckelt). Winrate-
// Hebel Patt/Unaufhaltsam/Umverteilung tragen erwartete Fat-Tails (Serien-Snowball, von STREAK_STAT_CAP gebändigt, abs. in
// der Elementar-Chase-Decke ~73M, Max-Ratio < Elementar-Max-Spread 7,47×). Straffungs-Knöpfe: PATT_MARGIN, UNAUFHALTSAM_VALUE.
//
// VABANQUE v0.2 (2026-08-15, `npm run impact`) — zwei Defekte, beide gemessen statt geschätzt:
//  1) FLACH → SELBSTSKALIEREND. VABANQUE_SCORE lief post-stack am ganzen Multiplikator-Stapel vorbei und war auf
//     1,03× abgesunken, während die Läufe auf 100–200M gewachsen sind. Ein fester Betrag KANN das Band über die
//     Run-Spanne nicht halten (18M sind auf 45M +40 %, auf 150M +12 %) → VABANQUE_MULT × eigener Eröffnungs-Score.
//  2) DECKEL RAUS. VABANQUE_MAX_PAYOUTS (3) band in 90 % der Läufe: gefegt werden median 16 von 50 Eröffnungen, und
//     die Sweeps liegen SPÄT (Durchlauf 31–50: 686 von 940 beobachteten). Die 3 Auszahlungen griffen also die
//     frühesten und kleinsten ab, danach war der Perk tot — bei 13 weiter sichtbar erfüllten Bedingungen. Genau das
//     „triggert selten, fühlt sich danach nutzlos an". Der Front-Load-Missbrauch, gegen den der Deckel stand, trägt
//     sich heute selbst nicht mehr: mit frontLoadFormationStep steigen die Sweeps auf 38/50, der Median-Score fällt
//     dabei aber von 38,2M auf 25,2M (Sortieren nach Kartenwert zerlegt die Formationen im ersten Segment).
// Messreihen (--only L_VAB --runs 150 --explore 400), alle mit `npm run impact`:
//   MIT Deckel:   MULT 10 → 1,17× · 20 → 1,36× · 25 → 1,41× · 30 → 1,63×  (Formations-Solver bei 25: 1,37×)
//   OHNE Deckel:  MULT 0,4/0,8 → ~1,03× (Rauschen) · 3 → 1,32× · 4 → 1,36× · 6 → 1,49×  → gewählt: 4
//   Front-Load-Gegner bei MULT 3: 1,55× — höher (mehr Sweeps), aber im Band, und der Front-Loader bezahlt es mit
//     ~34 % Gesamt-Score. Kein Exploit, kein Deckel nötig.
//   PICK-ZEITPUNKT (--pickfrom): früh 1,36× · ab Durchlauf 30 1,23× · ab 40 1,19× (anwendbar 86 %→75 %→58 %).
//     Monoton fallend = gesund: je früher erworben, desto mehr Eröffnungen bleiben. Unter dem alten Deckel war das
//     GENAU UMGEKEHRT (die 3 Auszahlungen griffen die frühesten, kleinsten Sweeps ab, ein später Pick bekam die
//     großen) — nicht nachgemessen, aber die direkte Folge aus Deckel + später Sweep-Verteilung.
// ACHTUNG Wechselwirkung: die Auszahlung geht über `gained` in cycleBestTrick ein, also multipliziert ECHO (×1,6 am
// Durchlauf-Ende) sie mit. Bei MULT 6 zeigte sich das im Schwanz (p90 des Referenz-Arms 100M → 299M); bei 4 liegt der
// p90 wieder bei 114M (Median 45M) = Baseline-Niveau. Wer MULT anhebt, muss den p90 mitlesen.
// Derselbe Flat-Defekt traf ZINSESZINS_STEP (1,02×) und RICHTFEST_STEP (1,00×). Beide sind inzwischen weg:
// Richtfest siehe unten (Anteil am Durchlauf-Ertrag), Zinseszins wurde parallel zur „Bank" umgebaut (Kapital ×
// Zinssatz, Block oben) — dieselbe Diagnose, unabhängig gefunden. Damit ist im Legendär-Pool kein flacher,
// post-stack laufender Score-Betrag mehr übrig.
export const UNAUFHALTSAM_VALUE  = envNum("SIM_UNAUFHALTSAM_VALUE", 3);   // Unaufhaltsam (Serie): nächste Karte +Wert solange Serie läuft [4→3: war 2,03× überzogen]
export const KRITMASSE_VALUE     = envNum("SIM_KRITMASSE_VALUE", 3);      // Kritische Masse (Crit): Dauerwert je Crit, Deckel [4→3: war 1,74×]
export const RASEREI_CRIT_STEP   = envNum("SIM_RASEREI_CRIT_STEP", 0.05); // Raserei (Serie): +Crit-Chance je Sieg-Folge [Favorit, unverändert]
// ---- Zinseszins-Rework (2026-08-15): „die Bank" statt flacher Dauerdividende. -------------------------------------
// Befund der Sonde (sim/zins-probe.mjs, 150 UCB-Runs à 50 Durchläufe): der ALTE flache Bonus (+1600 je positiver
// Bilanz) hob den BODEN und verschwand bei starken Builds — schwache Runs 1,49× / starke Runs 1,17×. Für einen
// Legendär exakt verkehrt herum, weil eine flache Konstante gegen eine multiplikative Score-Kurve nicht skaliert.
// Neues Modell: Kapital (= Anteil des Stich-Scores, skaliert also MIT dem Build) × Zinssatz (= steigt mit Beständigkeit).
// Kalibrierung: Auszahlung ≈ Einlagesatz × Ø-Zinssatz × Σ(kumulativer Score-Anteil ≈ 14,5) × Endscore.
// Gemessener Satz D: alle 1,25× · schwache Runs 1,06× · starke Runs 1,42× → Defekt umgedreht. Siege je Durchlauf
// liegen bei p50 24/40 (60 %); die Hürde 65 % wird selbst in der zweiten Run-Hälfte noch in ~37 % der Durchläufe
// VERFEHLT → der Perk bleibt bis zum Schluss eine Anspannung statt eines Zählers.
// WICHTIG: Auszahlungen zahlen NICHT wieder ein (kein Selbst-Compounding) → kein Runaway, das Wachstum kommt
// ausschließlich aus dem mitwachsenden Score und dem steigenden Satz.
export const ZINS_DEPOSIT        = envNum("SIM_ZINS_DEPOSIT", 0.12);      // Zinseszins: Anteil des Stich-Scores, der bei Sieg aufs Kapital wandert
export const ZINS_RATE_START     = envNum("SIM_ZINS_RATE_START", 0.12);   // … Start-Zinssatz
export const ZINS_RATE_STEP      = envNum("SIM_ZINS_RATE_STEP", 0.04);    // … Anstieg je Durchlauf, der die Hürde nimmt
export const ZINS_RATE_MAX       = envNum("SIM_ZINS_RATE_MAX", 0.40);     // … Deckel des Zinssatzes
export const ZINS_HURDLE_RATE    = envNum("SIM_ZINS_HURDLE_RATE", 0.65);  // … nötiger Sieg-Anteil eines Durchlaufs für die Auszahlung (× Durchlauf-Länge, aufgerundet)
export const ZINS_CRASH_KEEP     = envNum("SIM_ZINS_CRASH_KEEP", 0.75);   // … Crash (Hürde verfehlt): so viel Kapital bleibt
export const ZINS_CRASH_STEPS    = envNum("SIM_ZINS_CRASH_STEPS", 1);     // … Crash: um so viele Stufen fällt der Zinssatz (min. Startwert)
export const VABANQUE_MULT       = envNum("SIM_VABANQUE_MULT", 4);        // Vabanque (Eröffnung): JEDE gefegte Eröffnung zahlt MULT × ihren eigenen Score [4 = 1,36×, s. Messreihe oben; nach dem Deckel-Wegfall neu kalibriert]
export const VABANQUE_TRICKS     = envNum("SIM_VABANQUE_TRICKS", 5);      // …          … so viele Eröffnungs-Stiche
// (entfernt: VABANQUE_MAX_PAYOUTS — der Lauf-Deckel band in 90 % der Läufe und tötete den Perk nach 3 der median 16
// gefegten Eröffnungen. Der Front-Load-Missbrauch, den er abwehren sollte, kostet im heutigen Build mehr Score als er
// einbringt (38,2M → 25,2M Median bei 16 → 38 Sweeps). Belegt mit sim/formation.js frontLoadFormationStep.)
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
export const RICHTFEST_STEP      = envNum("SIM_RICHTFEST_STEP", 0.05);    // Richtfest (Gebäude-Struktur): Anteil des Durchlauf-Ertrags je vollendeter Struktur [flach 250 → selbstskalierend, s. u.]
// RICHTFEST v0.2 (2026-08-15): derselbe Flat-Defekt wie Vabanque — 250 Score je Struktur waren gegen Läufe um 78M
// bedeutungslos (1,08× auch mit korrekt bauendem Architekten und median 10 Strukturen). Jetzt ein ANTEIL am
// Stich-Ertrag des Durchlaufs. Bezugsgröße bewusst cycleScoreSum und NICHT cycleEndScore, damit Zinseszins/Echo/
// Richtfest nicht übereinander multiplizieren (s. die Vabanque×Echo-Kaskade beim MULT-Knopf oben).
// Der frühere 1,00×-Messwert war zusätzlich durch zwei Sim-Bugs verfälscht (Zufallsbau + ignorierter Baufeld-Deckel);
// die sind separat gefixt. Bauhütte brauchte danach GAR KEINE Änderung mehr (1,00× → 1,32×, im Band).
// Messreihe (--only L_RICHT --runs 150 --explore 400): STEP 0,03 → 1,20× · 0,05 → 1,27×. Gewählt 0,05 — bewusst in
// der unteren Bandhälfte (Bandmitte läge bei ~0,07): die Dividende wächst LINEAR mit structureCount, und den heben
// sowohl Bauhütte (+8 Zellen ⇒ 6→10 Strukturen) als auch der Fortschrittsbaum (treeCover). Wer STEP anhebt, sollte
// gegen einen Bauhütte-Build gegenmessen, nicht nur gegen den Referenzbuild.
export const BAUHUETTE_COVER     = envNum("SIM_BAUHUETTE_COVER", 8);      // Bauhütte (Gebäude-Baufeld): hebt beim Pick den Baufeld-Deckel (maxCover) dauerhaft um so viele Zellen

/* ============================================================
   LEGENDÄR-ERWEITERUNG v0.3 (2026-08-15): 7 neue Legendäre gegen die gemessenen Lücken im Pool.
   Vorher: Präzision 0 Legendäre · Skill-/Angebots-Ökonomie unbesetzt · KEIN einziger Perk mit Nachteil,
   obwohl #33 sie als „mächtig, aber mit Nachteil" definiert. Ziel-Band 1,2–1,7×.

   KALIBRIERT (2026-08-15, `npm run impact --runs 150 --explore 400`, Ziel Bandmitte):
     Hochseil   ×1,2  → 1,08×  ·  ×1,45 → 1,41×
     Fundament  +0,25 → 1,09×  ·  +0,5  → 1,36×  ·  +0,75 → 1,59×  [GESETZT: +0,75, Design-Entscheidung]
     Taktschlag ×2,0  → 1,10×  ·  ×2,5  → 1,19×  ·  ×3,5 → 1,35×   [GESETZT: ×2,5, Design-Entscheidung]
     Schmiede   +1    → 1,05×  ·  +2 → 1,12×  ·  +3 → 1,39×  ·  +4 → 1,65×
     Opfergang  −2/×1,8 → 0,92× (NEGATIV) · −1/×1,8 → 1,31×
     Ballast    unverändert 2/×1,5 → 1,28×
   Der Kostenpunkt bei Opfergang war der Fehler, nicht die Gegenleistung: −2 auf JEDE Karte senkt die Winrate,
   und die treibt Serien, Formationen und Crits gleichzeitig — der Nachteil wirkt dreifach, der Mult nur einmal.

   Taktschlag liegt mit ×2,5 bei 1,19× einen Hundertstel unter dem Bandboden — bei n≈83 und ~55 % Anwendbarkeit
   ist das von 1,20× nicht unterscheidbar, also kein echter Ausreißer, sondern die untere Bandkante. Fundament
   liegt mit +0,75 in der oberen Bandhälfte; die Strukturfaktoren multiplizieren sich je Position übereinander,
   deshalb beim weiteren Anheben den p90 des Referenz-Arms mitlesen.

   ACHTUNG Verdünnung: mit 21 statt 14 Legendären im Pool fiel die Anwendbarkeit je Perk von ~85 % auf ~50 %
   (n ~130 → ~75). Die v0.3-Zahlen sind daher gröber als die der 14 Bestands-Perks und mit ihnen nur bedingt
   vergleichbar — für ein schärferes Urteil --runs erhöhen.
   ============================================================ */
export const MEISTERHAND_SLOTS   = envNum("SIM_MEISTERHAND_SLOTS", 1);    // Meisterhand (Ausbau): +Skill-Slots, dauerhaft ab Pick (SKILL_SLOTS 6 → 7)
// ⚠ MEISTERHAND MISST SICH NEGATIV UND DER KNOPF HILFT NICHT: 1 Slot → 0,96× · 2 Slots → 0,94× (schlechter!) ·
// im reinen Blitz-Build (--faction lightning) → 0,98×. Es ist also KEIN Policy-Artefakt, sondern mechanisch:
//   (a) commitScale ist bei SKILL_SLOTS Skills schon gedeckelt (min(1, count/6)) → ein 7. Skill der Hauptfraktion
//       bringt nur noch seinen Eigeneffekt, keine zusätzliche Bekenntnis-Skalierung;
//   (b) der marginale Skill ist definitionsgemäß der SCHWÄCHSTE noch verfügbare;
//   (c) in breiten Builds zieht der Extra-Slot einen DRITTEN Archetyp herein (gemessen 2 → 3), was commitScale
//       aller beteiligten Fraktionen senkt — deshalb ist 2 Slots schlechter als 1.
// Die Ablation vergleicht gegen „stattdessen die nächstbeste Familie nehmen"; ein Grenz-Skill schlägt eine
// Familienstufe schlicht nicht.
// ENTSCHEIDUNG (2026-08-15): Perk bleibt UNVERÄNDERT im Pool. Bewusst gegen die Sim-Zahl — echte Spieldaten sollen
// entscheiden. Ein Mensch wählt seinen 7. Skill anders als jede Policy hier (er kennt seinen Plan), und die
// Ablation misst nur den Tausch gegen die nächstbeste Familie, nicht den Wert von Flexibilität an sich.
// Also NICHT „reparieren", ohne vorher Spieldaten gesehen zu haben. Falls die den Befund bestätigen, ist der
// naheliegende Umbau: commitScale-Deckel für den Perk-Halter aufheben (belohnt Vertiefen statt Verbreitern).
export const SCHMIEDE_STEP       = envNum("SIM_SCHMIEDE_STEP", 3);        // Schmiede (Deck): +Kartenwert auf die SCHWÄCHSTE Deckkarte je Durchlauf-Ende. BEWUSST OHNE DECKEL (Entscheidung 2026-08-15) — über 50 Durchläufe bis zu +50 auf ein Deck mit Gesamtwert ~220
export const HOCHSEIL_MULT       = envNum("SIM_HOCHSEIL_MULT", 1.45);      // Hochseil (Score): Sieg-× solange der Durchlauf OHNE Niederlage ist. Spätspiel-Perk: Anteil niederlagenfreier Durchläufe steigt 0 % (1–10) → 70 % (41–50), greift also genau in der Score-Explosion → niedrig ansetzen
export const OPFERGANG_VALUE     = envNum("SIM_OPFERGANG_VALUE", 1);      // Opfergang (Deck, NACHTEIL): so viel Kartenwert verlieren ALLE Karten dauerhaft beim Pick (Klemmung bei 1 — #34 hat die 0 bewusst entfernt)
export const OPFERGANG_MULT      = envNum("SIM_OPFERGANG_MULT", 1.8);     // … dafür dieser dauerhafte Sieg-Score-× (scoreMult-Hook, läuft automatisch über prodHook)
export const TAKTSCHLAG_MULT     = envNum("SIM_TAKTSCHLAG_MULT", 2.5);    // Taktschlag (Segment): Score-× auf den ABSCHLUSS-Stich eines komplett gewonnenen Segments (5/5). 8 Chancen je Durchlauf — Vabanques Idee eine Skalenebene tiefer
export const BALLAST_ENERGY      = envNum("SIM_BALLAST_ENERGY", 2);       // Ballast (Form, NACHTEIL): so viel Formationsenergie WENIGER je Aufstellphase (von FORMATION_ENERGY 4)
export const BALLAST_FORM_MULT   = envNum("SIM_BALLAST_FORM_MULT", 1.5);  // … dafür dieser × auf den Formations-Multiplikator
export const FUNDAMENT_BONUS     = envNum("SIM_FUNDAMENT_BONUS", 0.75);   // Fundament (Gebäude): additiv auf JEDEN Strukturfaktor (Zeile 1,35 · Spalte 1,75 · Diagonale 1,62). ACHTUNG: die Faktoren multiplizieren sich je Position übereinander → Ausreißer-Potenzial, p90 beim Messen mitlesen

// Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md) [TUNING]
export const SKILL_SLOTS       = envNum("SIM_SKILL_SLOTS", 6);    // max gleichzeitig gehaltene Skills [Default 6 = echtes Spiel (Autostich_Test); ENV-Sweep-Haken SIM_SKILL_SLOTS z. B. =4 für den alten main-Stand]
export const SKILLS_OFFERED     = envNum("SIM_SKILLS_OFFERED", 12);   // Skills je Skill-Runde [Default 12 = 3+3+3+3 (je 3 pro Fraktion, alle 4 im Angebot); ENV-Sweep-Haken, z. B. =6 für den alten 2+2+2-Stand]
export const MAX_ARCHETYPES     = envNum("SIM_MAX_ARCHETYPES", 4);    // gleichzeitig aktive Fraktionen [Default 4 = alle 4 mischbar; ENV-Sweep-Haken, z. B. =3 für den Sim-validierten 3-von-4-Stand (Cross-Vergleich)]
// ERKUNDUNG (Cross-Balance): Hebel 7 — Exponent auf die Commitment-Scaler (plant/fire/lightCommit = min(1, count/SKILL_SLOTS)^EXP).
// 1 = linear (aktuell, neutral); >1 = konvex → Verdünnung kostet superlinear (naives Mischen ≤ Mono deutlicher). [ENV-Sweep-Haken]
export const COMMIT_EXP        = envNum("SIM_COMMIT_EXP", 1);
// ERKUNDUNG: Hebel 3c — Pflanze-Wert-Passive-Gate. 0 = Mono-Gate (aktuell, neutral: nur reine Pflanze); >0 = Schwellen-Knick:
// Passive aktiv ab dieser Pflanzen-Skill-Zahl, UNABHÄNGIG von Fremd-Skills (belohnt Deep-Split statt Reinheit). [ENV-Sweep-Haken]
export const PLANT_PASSIVE_MIN_SKILLS = envNum("SIM_PLANT_PASSIVE_MIN_SKILLS", 0);
// (vestigial entfernt: SKILL_EVERY_CYCLES — Skill-Runden kommen nicht mehr „jede 3.", sondern aus dem festen DECISION_SCHEDULE; siehe FIRST_SKILL_CYCLE)
export const LIGHTNING_CRIT_BASE      = 0.05; // Blitz: Aktivierungs-Sockel Crit-Chance (Abschnitt 2a)
export const LIGHTNING_CRIT_PER_SKILL = envNum("SIM_LIGHTNING_CRIT_PER_SKILL", 0.08); // Blitz: je gehaltenem Blitz-Skill [v0.5 Rework-Tune: 0,10→0,08 fürs Pflanze-Band, SIM-Sweep-Haken]
export const LIGHTNING_CRIT_MULT_PER_SKILL = envNum("SIM_LIGHTNING_CRIT_MULT_PER_SKILL", 0.1); // Blitz: +Crit-Multiplikator je gehaltenem Blitz-Skill (additiv, dauerhaft; kein Deckel) [SIM-Sweep-Haken]
export const LIGHTNING_MAX_CHARGE     = 10;   // Blitz: Ladungsmaximum
// Ionisierung (Stufe B) — dauerhafte Kartenmarkierung
export const ION_SCORE_PER_STACK  = envNum("SIM_ION_SCORE_PER_STACK", 12); // +Score je Ionisierungsstapel bei Sieg mit der Karte [#271: 25→12, Wert wandert in den Crit-Kanal · Sim-tunebar]
// #271: Ionisierung speist die Crit-Maschine (feldweit/Breite) — Σ Ionisierungsstapel im Deck heben die Crit-Chance
// JEDER Siegkarte (gedeckelt, nur bei aktivem Blitz). Der Überschuss über 100 % fließt via Überschlag als Ladung zurück
// → schließt den Sturm-Loop. Nur Ionisierung erzeugt Stapel → generisches Nicht-Blitz unberührt. Werte aus Sim-Sweep
// (Konfig D): leistungsneutral zum Alt-Blitz (Floor +0,5 %, p90 −1 %, Spread 1,18× = Baseline). [Sim-tunebar]
export const ION_CRIT_PP_PER_STACK = envNum("SIM_ION_CRIT_PP_PER_STACK", 0.015); // +Crit-Chance je Feld-Ionisierungsstapel [v0.5 Rework-Tune: 0,02→0,015]
export const ION_CRIT_STACK_CAP    = envNum("SIM_ION_CRIT_STACK_CAP", 12);      // gedeckelte gezählte Σ-Feldstapel (→ max +12 pp; zähmt den Heavy-Build-Tail)
export const ION_MAX_STACKS       = 5;  // max Stapel je Karte [#165 Skills-Spec §5.1: 4→5]
export const ION_BASE_COUNT       = 2;  // Ionisierung: ionisierte Karten je Verbrauch
// Sturm-Sättigung (Blitz-Rework v0.5) — zwei Stufen als Board-Zustand (global, bedingt, nur bei aktivem Blitz):
//   Breite  = Anteil Karten mit ≥1 Stapel ≥ FRAC → alle Karten zählen +ION_SATURATION_VALUE Wert.
//   Tiefe   = Anteil Karten voll (ION_MAX_STACKS) ≥ FRAC → Crit-Überschuss (>100 %) kippt via Überschlag von Ladung auf Crit-Mult.
export const ION_SAT_BREADTH_FRAC = envNum("SIM_ION_SAT_BREADTH_FRAC", 0.85); // Anteil ionisierter Karten für „Breite voll" [Sim-tunebar]
export const ION_SAT_DEPTH_FRAC   = envNum("SIM_ION_SAT_DEPTH_FRAC", 0.85);   // Anteil voller (5-Stapel-)Karten für „Tiefe voll" [Sim-tunebar]
export const ION_SATURATION_VALUE = envNum("SIM_ION_SATURATION_VALUE", 1);    // +Wert auf alle Karten solange Breite voll [v0.5 Rework-Tune: 2→1, der Runaway-Fix · Sim-tunebar]
// (entfallen 2026-08-15: UEBERSCHLAG_EXCESS_TO_MULT — der Überschuss ging ab Voll-Tiefe UNGEDECKELT in den Crit-
//  Multiplikator; genau der Verstärker, der aus einer unbegrenzten Chance einen unbegrenzten Multiplikator machte.
//  Überschuss fließt jetzt AUSSCHLIESSLICH in Ladung; Voll-Tiefe verdoppelt nur noch die Ausbeute. s. UEBERSCHLAG_*_PER)
// Ionisierungs-Geschwindigkeit ∝ Blitz-Skills (Mono): Breite je Verbrauch steigt mit jedem Blitz-Skill über der Schwelle.
export const ION_SPEED_MIN_SKILLS = envNum("SIM_ION_SPEED_MIN_SKILLS", 2);    // ab dieser Blitz-Skill-Zahl skaliert die Ionisierungs-Breite
export const ION_SPEED_PER_SKILL  = envNum("SIM_ION_SPEED_PER_SKILL", 1);     // +ionisierte Karten je Verbrauch je Blitz-Skill über der Schwelle
export const BLITZFAENGER_VALUE   = 2;  // Blitzfänger (#165): eine bereits volle Karte (5 Stapel) statt zu ionisieren +temp Wert (+ 1 Ladung)
export const KETTENBLITZ_COUNT    = 2;  // Kettenblitz: zusätzlich ionisierte Karten (nur mit Ionisierung)
export const UEBERSPANNUNG_CHARGE = 3;  // Überspannung: Zusatzladung bei Crit mit ionisierter Karte
// Reaktoren (Reststrom-Boden + Gewitterfront)
export const REST_CHARGE_FLOOR = envNum("SIM_REST_CHARGE_FLOOR", 4);    // Reststrom: Ladungsboden nach jedem Verbrauch [v0.5: 3→4, Rapid-Fire-Hebel]
export const STORM_CRIT_STEP   = envNum("SIM_STORM_CRIT_STEP", 0.01); // Gewitterfront: +Crit-Chance-Momentum je Verbrauch [v0.5 Rework-Tune: 0,02→0,01 · Sim-tunebar]
export const STORM_CRIT_CAP    = envNum("SIM_STORM_CRIT_CAP", 0.50);  // … Deckel der Rampe (Crit-Bändigung 2026-08-15: war UNGEDECKELT, erreichte +325 pp @p90)
/* ============================================================
   BLITZ-REWORK v0 — „Der Sturm, der sich selbst nährt." 4 Währungen (⚡Crit · 🔋Ladung · 🧲Ionisierung ·
   📈Serie) + 🔗Kaskade. Blitz BESITZT die Crit-Erzeugung. Werte v0, cross-archetype Sim-Pass. [v0 · tunebar]
   ============================================================ */
export const THUNDER_CRIT_MULT = envNum("SIM_THUNDER_CRIT_MULT", 0.4);  // Donnergott (L, v0.5 Turbo): dauerhafter +Crit-Multiplikator [1,4→0,4, dafür Frequenz-Turbo]
export const DONNERGOTT_THRESHOLD_FRAC = envNum("SIM_DONNERGOTT_THRESHOLD_FRAC", 0.7); // Donnergott (L, v0.5 Turbo): Konsumenten lösen schon bei diesem Anteil der Ladung aus (öfter entladen)
export const STATIC_CHARGE     = envNum("SIM_STATIC_CHARGE", 1); // Statische Aufladung: Ladung je Sieg OHNE Crit // v0
// UEBERSPANNUNG_CHARGE (oben, =3) = Kaskade: Crit auf/neben ionisierter Karte → Zusatzladung (merge 04+09).
export const ENTLADUNG_MULT_STEP      = envNum("SIM_ENTLADUNG_MULT_STEP", 0.10); // Entladung (v0.5): +Crit-Multiplikator-Momentum je vollem Verbrauch (dauerhaft) // Sim-tunebar
export const ENTLADUNG_MULT_CAP       = envNum("SIM_ENTLADUNG_MULT_CAP", 1.0);   // Entladung (v0.5): weicher Deckel des Multi-Momentums (kein Ventil für Multi) [Rework-Tune: 2,0→1,0] // Sim-tunebar
// Kurzschluss (Rework): eine VOLLE (5) Siegkarte gibt bei JEDEM Sieg einen Burst — OHNE die Stapel zu opfern (Payoff fürs
// Maxen statt Sättigung entladen). Wiederkehrend, weil die Stapel bleiben → weiter Flat-Score + Feld-Crit (#271). [Sim-tunebar]
export const KURZSCHLUSS_SCORE  = envNum("SIM_KURZSCHLUSS_SCORE", 250); // Direkt-Score-Burst (post-stack) je Sieg mit voller Karte [Sim: Blitz-Aggregat unempfindlich → Feel-Wert]
export const KURZSCHLUSS_CHARGE = envNum("SIM_KURZSCHLUSS_CHARGE", 3);  // + Ladungs-Burst je Sieg mit voller Karte
export const SPANNUNGSSTAU_STEP       = 0.05; // Spannungsstau: +5 pp Crit-Chance je Sieg ohne Crit (ein Crit resettet) // v0
export const SPANNUNGSSTAU_CAP        = 0.50; // Spannungsstau: … bis +50 pp                                       // v0 — tunebar
// Überschlag = das Ventil der Crit-Maschine: Crit-Chance über 100 % ist für den Wurf tot (der Crit ist ohnehin sicher)
// und wird in Ladung umgewandelt. Lesbare Regel: je UEBERSCHLAG_PP_PER_CHARGE Prozentpunkte über 100 % → +1 Ladung bei
// jedem Sieg; ab Voll-Tiefe (ION_SAT_DEPTH_FRAC) reicht die Hälfte. Das Ladungsdach (LIGHTNING_MAX_CHARGE) deckelt die
// Ausbeute von selbst → echtes Ventil statt Verstärker.
export const UEBERSCHLAG_PP_PER_CHARGE       = envNum("SIM_UEBERSCHLAG_PP_PER_CHARGE", 10); // Prozentpunkte Überschuss je +1 Ladung
export const UEBERSCHLAG_DEPTH_PP_PER_CHARGE = envNum("SIM_UEBERSCHLAG_DEPTH_PP_PER_CHARGE", 5); // … ab Voll-Tiefe (doppelte Ausbeute)
export const BLITZSCHLAG_STACKS       = 1;    // Blitzschlag: ein Crit ionisiert die Siegkarte (+1 Stapel)          // v0
export const DAUERSTROM_PER_STREAK    = 3;    // Dauerstrom: je 3 Serienpunkte +1 Ladung je Sieg in Folge           // v0
export const DAUERSTROM_MAX           = 3;    // Dauerstrom: … höchstens +3 Ladung/Sieg                             // v0 — tunebar
// Ladungsserie (ehem. Geladene Serie) — Serie speist die Crit-Maschine (kein Konsument mehr): je Serienpunkt +Crit-Chance (Cap).
export const SERIESCRIT_STEP          = 0.02; // Ladungsserie: +2 pp Crit-Chance je Serienpunkt                     // v0 — tunebar
export const SERIESCRIT_CAP           = 0.30; // Ladungsserie: … bis +30 pp                                          // v0 — tunebar
// On-Consume-Passives (jeder volle Ladungsverbrauch): Statische Aufladung (Flat-Score), Blitzableiter (Ladung zurück), Dauerstrom (Crit-Rampe).
export const CONSUME_SCORE            = 40;   // Statische Aufladung: +Score bei jedem vollen Ladungsverbrauch      // v0 — tunebar
export const BLITZABLEITER_CONSUME_CHARGE = 1;// Blitzableiter: +Ladung zurück bei jedem vollen Verbrauch           // v0 — tunebar
export const DAUERSTROM_CONSUME_CRIT  = 0.02; // Dauerstrom: +2 pp Crit-Chance je vollem Verbrauch (dauerhaft)         // v0 — tunebar
export const DAUERSTROM_CRIT_CAP      = envNum("SIM_DAUERSTROM_CRIT_CAP", 0.40); // … Deckel der Rampe (Crit-Bändigung 2026-08-15: war UNGEDECKELT, erreichte +1.844 pp im Maximum)
export const SERIENSCHUTZ_COST_FRAC   = envNum("SIM_SERIENSCHUTZ_COST_FRAC", 0.5); // Serienschutz (v0.5, ex-Wetterleuchten): Niederlage mit ≥ diesem Anteil der Max-Ladung → Serie hält, Anteil verbraucht // Sim-tunebar
export const DOPPELENTLADUNG_FACTOR   = envNum("SIM_DOPPELENTLADUNG_FACTOR", 3);    // Doppelentladung (L): Konsumenten feuern FACTOR-fach (Ionisierungs-Anzahl x FACTOR) [Legendaer-Buff v1: 2->3]
export const DURCHSCHLAG_CRIT_MULT    = envNum("SIM_DURCHSCHLAG_CRIT_MULT", 0.18); // Durchschlag (L): volle Ionis. (5) + Crit → dauerhaft +Crit-Mult [Legendär-Angleich: 0,25→0,18 — Spitze kappen, Sim unterschätzt Crit]
export const DURCHSCHLAG_MULT_CAP     = envNum("SIM_DURCHSCHLAG_MULT_CAP", 2.0);  // Durchschlag: Deckel des dauerhaften Crit-Mult-Bonus (Anti-Runaway v0.1: uncapped → +100× im Smoke)
// Blitz-Legendär-Reshape (2026-07-30): die Ionisierung FLUTET (blitz-economy.mjs: alle Karten @Deckel 5, ~ganzes Deck ab Cycle 20)
// → „mehr Ionis."-Legendäre (Doppelentladung/Flächenionisation) waren tot (1,01×/0,90×). Sie lesen jetzt den BESTAND des
// gesättigten Feldes und zahlen je IONISIERTEM Sieg DIREKT (post-stack, hart gedeckelt = Plateau, bekenntnis-skaliert = cross-health).
// Nur Legendär-Halter → generisches Blitz (ION_SCORE_PER_STACK) unberührt. Analog zur Eis-Überlauf-Dividende.
export const FLAECHENION_DIRECT       = envNum("SIM_FLAECHENION_DIRECT", 130);  // Flächenionisation (Sturmzelle, BREITE): DIREKTer Score je ionisiertem Sieg × #ionisierte Karten [Legendär-Angleich: 70→130]
export const FLAECHENION_FIELD_CAP    = envNum("SIM_FLAECHENION_FIELD_CAP", 30); // … gedeckelte Feldbreite (max gezählte ionisierte Karten)
export const DOPPELENT_DIRECT         = envNum("SIM_DOPPELENT_DIRECT", 40);    // Doppelentladung (endloser Sturm, ENERGIE): DIREKTer Score je ionisiertem Sieg × Σ Stapel im Feld [Legendär-Angleich: 16→40 — Trap-Pick heben]
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
export const HEAT_MARGIN_CAP   = envNum("SIM_HEAT_MARGIN_CAP", 8);    // WEICHES KNIE des margen-Hitzegewinns: bis hier linear, darüber √-Schwanz (kein harter Deckel mehr) [Sim-tunebar]
export const HEAT_MARGIN_TAIL_K = envNum("SIM_HEAT_MARGIN_TAIL_K", 1.5); // Skalar des √-Schwanzes über dem Knie: Margen-Hitze = (Knie−2) + K·√(Marge−Knie), uncapped/diminishing (wie Wurzeltiefe) [Sim-tunebar]
export const HEAT_LOSS_MAX     = envNum("SIM_HEAT_LOSS_MAX", 10);   // max Hitzeverlust je Niederlage (%) [Sim-tunebar: Kühlung fürs Halte-Playstyle]
export const HEAT_LOSS_PCT     = envNum("SIM_HEAT_LOSS_PCT", 0.25); // zusätzl. Hitzeverlust je Niederlage = Anteil der AKTUELLEN Hitze — hält hohe Hitze nicht-trivial (beißt NUR bei hoher Hitze → Konsum-Builds unberührt; Halte-Playstyle muss Hitze durch Siege halten) [Fire-Heat-Fix]
export const FIRE_SCORE_BASE   = envNum("SIM_FIRE_SCORE_BASE", 25);   // Feuer-Flat-Score je Punkt (erster Feuer-Skill) [Sim-tunebar]
export const FIRE_SCORE_PER_SKILL = 5; // +Feuer-Flat je Punkt je weiterem Feuer-Skill    // v0 — tunebar
export const FIRE_MARGIN_OFFSET = envNum("SIM_FIRE_MARGIN_OFFSET", 2); // Feuer-Score-Offset: s = (Vorsprung − OFFSET) × Basis; kleiner = knappe Siege zahlen (Floor-Hebel) [Sim-tunebar]
// Feuer-Score √-Bonus (wie Wurzeltiefe): additiv oben auf die lineare Linie, Basis·K·√(Vorsprung−OFFSET). Uncapped,
// abnehmender Ertrag → großer Wertvorsprung bringt weiter mehr, ohne Deckel; kleine Margen bleiben ungestraft. [Sim-tunebar]
export const FIRE_SCORE_SQRT_K  = envNum("SIM_FIRE_SCORE_SQRT_K", 1.0);
// GLUTDIVIDENDE (Feuer-Rework, FLOOR-Hebel): ein DIREKTER Score je Feuer-Sieg, der NICHT durch den Serien/Crit/
// Formations-Stack multipliziert wird (er zählt flach NACH der Multiplikation). Damit hebt er den Median (kleine
// Mults → der flache Aufschlag ist relativ groß) deutlich stärker als das Ceiling (riesige Mults → der Aufschlag
// verschwindet relativ). ∝ gehaltener Hitze beim Sieg, gedeckelt bei FIRE_DIVIDEND_HEAT_CAP (Sättigung: Top-Runs
// mit Vollhitze ziehen den Deckel nicht weiter hoch → floor-clean). Das ist Feuers fehlende „Immer-an-Engine".
// #fire-consumer 44 → 32: FRAKTIONS-Trimm, nachdem die drei Bauweisen gleichgezogen waren. Die Parität hatte Feuer
// insgesamt auf 13,69 Mio gehoben (über Eis 11,74) — sie ist aber eine ANDERE Schraube als das Niveau, und beide
// mussten gemeinsam gedreht werden: die Dividende allein zu senken bricht die Parität sofort (Spanne 1,02× → 1,31×
// bei 22), weil der Halte-Build von ihr lebt und die Konsumenten nicht. FIRE_SCORE_BASE taugt dafür NICHT — 25 → 10
// bewegt Feuer nur von 13,69 auf 13,10, der Grund-Score ist inzwischen ein kleiner Posten. Gefittet wurde deshalb
// das Tripel Dividende/Flächenbrand/Schmelzpunkt gemeinsam (700 Läufe je Punkt):
//   44/25/15 → 13,69 (Spanne 1,02×) · 32/17/9 → 11,02 (1,07×) · 30/15/8 → 10,54 (1,10×) · 28/13/7 → 10,01 (1,14×)
export const FIRE_HEAT_DIVIDEND     = envNum("SIM_FIRE_HEAT_DIVIDEND", 32);      // direkter Score je Hitze-% je Feuer-Sieg (0 = aus), skaliert mit Feuer-Bekenntnis. #268: 48→44 (Feuer-Floor leicht runter: 2,17×→2,05× Mix) [TUNING · Feuer-Floor]
// #fire-balance 45 → 70: der Deckel machte die OBERE LEISTENHÄLFTE wertlos. Über 45 % zahlte die Dividende nichts
// mehr, und oberhalb lagen nur noch bedingte Skills (Glühende Klinge 70/100 · Schmelzofen 50 · Sonnenkern 60 ·
// Weißglut 100) — Hitze zu HALTEN lohnte also strukturell nicht, genau die Klage „niemand spielt es als
// Halte-Mechanik". Gemessen (700 reine Feuer-Läufe je Stand): Median 8,20 → 9,32 Mio bei 70, 9,97 bei 100. 70
// gewählt, weil Feuer damit auf Blitz-Niveau landet, statt es zu überholen — alle vier Fraktionen bei n=700:
// Feuer 9,95 · Blitz 9,93 · Pflanze 11,07 · Eis 11,74 (Spread 1,18× statt 1,88× vor dem Feuer-Pass).
// ACHTUNG bei Nachmessungen: mit n=120 las derselbe Feuer-Stand 7,07 statt 8,20 — der Median dieser
// Verteilung ist unter ~500 Läufen nicht belastbar.
export const FIRE_DIVIDEND_HEAT_CAP = envNum("SIM_FIRE_DIVIDEND_HEAT_CAP", 70);  // Hitze-Deckel für die Dividende (Sättigung → floor-clean) [TUNING · Feuer-Floor]
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
// #fire-balance: die OBEREN Stufen verlangen zusätzlich einen dominanten letzten Sieg. Grund: Hitze allein war zu
// leicht oben zu halten — zusammen mit Feuerwalze (+3) lag dauerhaft +6 Wert auf JEDER Karte, was die Margen
// aufblies, die die Hitze erzeugen (Rückkopplung). Die Stufe liest darum den Vorsprung des LETZTEN Siegs mit;
// eine Niederlage setzt ihn auf 0 → die Klinge fällt ohne eigene Regel auf die Sockelstufe zurück. Die zwei Zahlen
// sind bewusst die schon vorhandenen Fraktions-Schwellen (8 = groß · 12 = überlegen: Verbrennung, Funkenflug),
// damit Feuer EINE Sprache spricht. Feuerwalze bleibt an der SERIE — die beiden trennen sich damit sauber:
// eine Serie knapper Siege gibt Feuerwalze +3 und der Klinge nur +1.
export const GLOWING_T2_MARGIN = 8;     // Glühende Klinge: +2 erst mit letztem Sieg ≥8 Vorsprung   // #fire-balance — tunebar
export const GLOWING_T3_MARGIN = 12;    // Glühende Klinge: +3 erst mit letztem Sieg ≥12 Vorsprung  // #fire-balance — tunebar
// WEISSGLUT → ÜBERHITZUNG (#fire-balance). Eigener Sub-Akku `heat.over` (0…OVERHEAT_MAX) NEBEN `heat.value` —
// bewusst ein zweites Feld statt `heat.max = 150`: alles, was heat.value liest (Sonnenzorn-Peak, Glutdividende,
// Glühende Klinge, Flächenbrand, Schmelzofen), bleibt damit OHNE eine einzige Zeile Sonderfall bei 100 gedeckelt.
// Die Zone ist strukturell isoliert, nicht per Ausnahme. Die Leiste zeigt sie als 0–150 %.
// Alt war „+10 Score je überlaufendem Hitzepunkt“ — ein flacher Betrag, der bei exakt 100 % Hitze ~160 Score gab und
// mit dem Build nicht mitwuchs. Jetzt ist der Überlauf ein ZUSTAND mit steigenden Zuflusskosten und einem Hebel.
export const OVERHEAT_MAX        = envNum("SIM_OVERHEAT_MAX", 50);   // Überhitzung max (= Leiste bis 150 %)                    // #fire-balance — tunebar
export const OVERHEAT_COST_K     = envNum("SIM_OVERHEAT_COST_K", 10);   // Zuflusskosten: ankommender Anteil = 1/(1+Überhitzung/K) → tiefe Überhitzung verlangt echten Wertvorsprung, nicht Masse
export const OVERHEAT_DECAY      = envNum("SIM_OVERHEAT_DECAY", 2);    // Abbau je Stich — KONTINUIERLICH (nicht nur bei Niederlage): nicht gefüttert = fällt auf 100 % zurück
export const OVERHEAT_DECAY_LOSS = 5;    // Abbau bei Niederlage
export const OVERHEAT_SCORE_STEP = envNum("SIM_OVERHEAT_SCORE_STEP", 0.02); // +2 % auf den GESAMTEN Feuer-Score je Punkt Überhitzung (bei MAX also ×2)
// #fire-balance, 3. Durchgang — die 2 % waren richtig, mein Zwischenschritt auf 3,5 % beruhte auf einer FALSCHEN
// MESSUNG: gemessen wurde in zufälligen Feuer-Builds, und in 46/47 % davon steckte Flächenbrand bzw. Schmelzpunkt.
// Beide leeren genau die Leiste, von der Weißglut lebt — der Skill konnte dort per Konstruktion nicht wirken.
// In SEINER Umgebung (reines Feuer OHNE Konsumenten, 700 Läufe) steigt sein Wert monoton mit der Siegquote:
//   Siegquote 52–67 % → −0,4 Mio · 67–74 % → −0,6 · 74–79 % → +2,0 · 79–92 % → +5,2 · oberste 10 % → +11,8
// Das ist die gewollte Bekenntnis-Wette: unten kostet der Slot, oben zahlt er groß. Mit 3,5 % wären es +3,7/+7,8/
// +17,1 — dramatischer, aber der Skill braucht die Hilfe nicht, und es hob nur die Decke (p99 40,4 → 45,6).
// NEBENBEI: pct() rundet für die Anzeige, 0,035 stand in der Beschreibung als „+4 %" statt 3,5 — bei 0,02 exakt.
// Linie 4 — Wert-/Score-Motoren
export const FIREROLL_MIN_HEAT = 40;    // Feuerwalze: erst ab 40 % Hitze                    // v0 — tunebar
export const FIREROLL_MAX       = 3;    // Feuerwalze: +1 Wert je Sieg in Folge, bis +3      // v0 — tunebar
export const VERBRENNUNG_T1_MARGIN = 8,  VERBRENNUNG_T1_MULT = 1.5; // Verbrennung: Feuer-Score ×1,5 ab 8 Vorsprung // v0
export const VERBRENNUNG_T2_MARGIN = 12, VERBRENNUNG_T2_MULT = 2.0; // Verbrennung: Feuer-Score ×2 ab 12 Vorsprung  // v0
export const SPARKFLIGHT_MIN_MARGIN = 8;  // Funkenflug: Sieg ≥8 Vorsprung entlädt den Speicher voll // v0 — tunebar
export const SPARKFLIGHT_LOSS_KEEP  = 0.5;// Funkenflug: Niederlage halbiert den Speicher     // v0 — tunebar
// #fire-balance: der Speicher bekam bisher eine 1:1-Kopie des Feuer-Scores kleiner Siege — und der ist bei kleiner
// Marge naturgemäß klein (unter HEAT_MIN_MARGIN sogar exakt 0, ein Sieg mit 1–2 Vorsprung legte also NICHTS ein).
// Jetzt das Doppelte plus einen bekenntnis-skalierten Sockel, damit auch der knappste Sieg sichtbar einzahlt.
export const SPARKFLIGHT_BANK_MULT       = 2;  // Einlage = Vielfaches des Feuer-Scores des kleinen Siegs
export const SPARKFLIGHT_FLOOR_BASE      = 60; // + Sockel je kleinem Sieg (erster Feuer-Skill)
export const SPARKFLIGHT_FLOOR_PER_SKILL = 20; // + je weiterem Feuer-Skill (6 Skills → 160), Muster wie FIRE_SCORE_PER_SKILL
// Linie 5 — Konsumenten (max 1 im Build — Burst vs. Drip)
export const CONFLAG_MIN_HEAT = envNum("SIM_CONFLAG_MIN_HEAT", 80);     // Flächenbrand: ab 80 % Hitze bewaffnet [Sim-tunebar]
// #fire-balance: Flächenbrand verbrannte die GANZE Leiste für einen flachen Satz. Der Verbrauch war nicht bezahlbar —
// unten liegen VIER Dinge (Feuerwalze ≥40, Glühende Klinge 40/70/100, Glutdividende, Weißglut-Zufluss), und der
// Wiederaufbau von 0 auf 80 dauert ~10 Siege. Jetzt: BODEN statt Totalverbrennung + bekenntnis-skalierter Satz.
export const CONFLAG_KEEP     = envNum("SIM_CONFLAG_KEEP", 40);     // Boden: brennt bis hierher herunter, nicht auf 0 (Feuerwalze + Klingen-Sockel überleben; wieder scharf in ~3 Siegen statt ~10)
export const CONFLAG_PER_HEAT = 20;     // Flächenbrand: Score je verbranntem Hitzepunkt (erster Feuer-Skill)
// #fire-consumer: 5 → 25. GEMESSENE Parität — der Konsumenten-Weg war nicht „etwas schwach", er war schlechter als
// GAR KEIN Konsument (700 Läufe: ohne Konsument 13,73 Mio · nur Flächenbrand 10,65 · nur Schmelzpunkt 8,07), und die
// Angebots-Garantie (needsConsumer, s. buildSkillOffer) drückt ihn 93 % aller Feuer-Builds auf. Satz-Sweep über
// dieselben 700 Seeds: 45/Punkt → 10,65 · 95 → 12,13 · 145 → 13,65 · 195 → 15,09. Bei 145 (= 20 + 25×5) sitzt der
// Median auf dem Halte-Build. Die Decke läuft dabei NICHT davon — im Gegenteil: p99 36,3 gegen 56,3 des
// Halte-Builds. Der Halte-Weg skaliert über Weißglut und den Sonnenzorn-Peak mit der Siegquote und hat deshalb die
// extremen Läufe; der Burst zahlt gleichmäßig. Zwei Wege mit verschiedenem Risikoprofil statt zweier Kurvenvarianten.
// 25 → 17 im Fraktions-Trimm (s. FIRE_HEAT_DIVIDEND): die Parität wurde bei 25 gemessen, das NIVEAU danach gemeinsam
// gesenkt. Wer einen der drei Werte allein dreht, verschiebt nicht das Niveau, sondern die Wahl zwischen den Bauweisen.
export const CONFLAG_PER_SKILL = envNum("SIM_CONFLAG_PER_SKILL", 17);    // … + je weiterem Feuer-Skill (6 Skills → 105/Punkt), Muster wie FIRE_SCORE_PER_SKILL
// #fire-balance Schmelzpunkt: kostete 10 %/Stich — MEHR, als ein durchschnittlicher Sieg erzeugt (~16 % bei vollem
// Feuer-Build, aber gezahlt wurde auch bei Niederlagen) — und gab dafür 50 Score. Er konnte gar nicht funktionieren.
// Jetzt billiger UND mit einem Satz, der an der GEHALTENEN Hitze hängt: der Skill zahlt genau dann, wenn du oben
// bleibst, und bremst sich selbst, wenn die Leiste leerläuft. Damit ist er erst die Halte-Mechanik, als die er gemeint war.
export const MELT_COST           = envNum("SIM_MELT_COST", 4);   // Schmelzpunkt: −4 % Hitze je SIEG (nicht mehr je Stich)     // #fire-balance — tunebar
export const MELT_SCORE_BASE     = 10;  // Score je verbranntem Punkt: Sockel …                     // #fire-balance — tunebar
// Der Tropf geht in die MULTIPLIZIERTE Basis. Er lag zwischenzeitlich als Direkt-Score post-stack — das zähmt die
// Decke sichtbar (p99/Median 3,3× gegen 4,5×), ist aber die falsche Bauform: ein fester Betrag verliert in einer
// Ökonomie, deren Multiplikatoren über den Lauf davonziehen, laufend an Gewicht. Grundsatz: so wenig Direkt-Score
// wie möglich. Der Preis ist gemessen und bewusst bezahlt — bei gleichem Median kostet der Wechsel rund ein Drittel
// mehr Decke (Feuer p99 35,3 → 47,5). Gemessene Parität bei 6 (700 Läufe, Schmelzpunkt-Build / Feuer gesamt):
//   Satz 5 → 10,17 / 10,88 · 6 → 10,86 / 11,06 · 7 → 11,64 / 11,22 · 8 → 12,26 / 11,35
export const MELT_SCORE_PER_HEAT = envNum("SIM_MELT_SCORE_PER_HEAT", 6); // … + je % gehaltener Hitze           // #fire-consumer — tunebar
// #fire-consumer: der Tropf hängt zusätzlich an der SIEGESSERIE. Ein Konsument, der jeden Sieg denselben Betrag
// zahlt, hat keine eigene Kurve — Flächenbrand baut sichtbar eine Leiste auf und wirft sie ab, Schmelzpunkt tat
// nichts dergleichen. Jetzt wächst sein Satz mit der Serie: dieselbe Auflade-Fantasie, nur kontinuierlich statt in
// Bursts, und eine Niederlage kostet wirklich etwas (die Serie fällt). Der Deckel hält die Spitze endlich.
// (Der zwischenzeitliche eigene SERIEN-Faktor am Tropf ist wieder entfallen. Er war als Gegenstück zu Flächenbrands
//  Auflade-Leiste gedacht, ist aber redundant, seit der Tropf in der multiplizierten Basis liegt: dort skaliert er
//  über streakBaseMult bereits mit der Serie. Ein zweiter Faktor darauf war ein Doppel-Dip und hat nur den Schwanz
//  aufgebläht — gemessen p99/Median 5,8× mit gegen 4,5× ohne, bei gleichem Median.)
// Linie 6 — Verbrennen → Schmieden (Brand · Asche · Schmiede)
export const BRAND_VALUE      = 1;      // Brandmal: brandmarkierte Gegnerkarte −1 Wert (v0.1: 2→1, Brand-Winrate-Tail zähmen) // tunebar
export const BRAND_ASH        = 1;      // Brandmal/Lauffeuer: +1 Asche je Brand              // v0 — tunebar
export const BRAND_SPREAD_VALUE = 1;    // Lauffeuer: Übergriff auf eine Nachbarkarte −1 Wert // v0 — tunebar
// #268 Asche-Ökonomie: Asche als KNAPPE, vollständig verbrauchte Ressource. Kosten hoch (≈ ein Durchlauf-Einkommen je
// Schmiedung), Wert hoch (echter Payoff) → „früh nehmen, horten, später ernten". Am Durchlauf-Ende floor(Asche/Kosten)
// Schmiedungen; Rest fließt über den Weißglut-Überlauf (unten) in Score → kein toter Haufen mehr.
export const FORGE_COST       = envNum("SIM_FORGE_COST", 20);     // Ascheschmiede: 20 Asche je Schmiedung (≈ ein 50 %-Durchlauf-Einkommen) [#268 · Sim-tunebar]
export const FORGE_VALUE      = envNum("SIM_FORGE_VALUE", 3);     // Ascheschmiede: niedrigste Karte +3 Dauerwert (echter Payoff) [#268 · Sim-tunebar]
export const FORGE_MAX_PER_CARD = envNum("SIM_FORGE_MAX_PER_CARD", 9); // Schmieden: Deckel geschmiedeter Dauerwert je Karte (3 Schmiedungen/Karte bei Value 3) [#268: 6→9]
export const FORGE_MAX_CARDS    = 10;   // Schmieden: max Anzahl VERSCHIEDENER geschmiedeter Karten (Boden heben, nicht ganzes Deck buffen)
// Weißglut-Überlauf (#268, Variante A — ersetzt die alte Asche-Dividende): ist die Schmiede-Kapazität voll, wird die
// RESTLICHE Asche am Durchlauf-Ende in Score-Häppchen (je FORGE_COST) verbrannt → „die Schmiede glüht weiß". Asche wird so
// jeden Durchlauf auf < Kosten heruntergefahren (vollständig ausgegeben), mit konkretem Effekt. [#268 · Haupt-Balance-Hebel]
export const FORGE_OVERFLOW_SCORE = envNum("SIM_FORGE_OVERFLOW_SCORE", 2000); // Score je FORGE_COST-Portion überlaufender Asche
export const GLUTSTAHL_PER_VALUE = 12;  // Glutstahl: +Score je geschmiedetem Wert bei Sieg // v0.2: 20→12 (Feuer-Ceiling-Trim, Brand+Schmiede-Explosion)
export const SCHMELZOFEN_MIN_HEAT = 50; // Schmelzofen: ab 50 % Hitze …                       // v0 — tunebar
export const SCHMELZOFEN_BRAND_BONUS = 1;   // … Brände −1 extra Wert & +1 extra Asche         // v0 — tunebar
export const SCHMELZOFEN_FORGE_DISCOUNT = envNum("SIM_SCHMELZOFEN_FORGE_DISCOUNT", 0.25); // … Schmieden −25 % Kosten (FAKTOR, skaliert mit den Kosten: 20→15) [#268: flat 1 → Faktor]
// Legendäre — UMGEFORMT (dauerhaft/compoundend/direkt statt situativ), vier verschiedene Achsen.
// Sonnenzorn (L) — SCORE-Mult ∝ HÖCHSTER je gehaltener Hitze (heat.peak): dauerhafter Feuer-Score-Multiplikator.
// #fire-leg: der Peak zählt jetzt Hitze + ÜBERHITZUNG (heat.peak liest `value + over`) — Sonnenzorn ist damit an
// Weißglut gekoppelt. Grund: 100 % Peak erreicht JEDER Feuer-Build nebenbei, der Multiplikator war praktisch ein
// Fixwert. Die Zone darüber ist dagegen teuer erkauft (gedrosselter Zufluss, Abbau je Stich) und trägt deshalb den
// dreifachen Satz. Zwei Sätze bewusst: der leichte Teil wird billiger (×2,3 → ×2,0), der schwere ist der Preis.
//   Peak 100 (ohne Weißglut) → ×2,0 · Peak 125 → ×2,75 · Peak 150 (volle Überhitzung) → ×3,5
// (Dreht die frühere „isolierte Zone"-Entscheidung NUR für den Peak. Glutdividende und Glühende Klinge lesen
//  heat.value und bleiben unberührt.)
export const SUNWRATH_PEAK_STEP    = envNum("SIM_SUNWRATH_PEAK_STEP", 0.010); // +GESAMT-Score je Peak-Hitze-% bis HEAT_MAX
export const SUNWRATH_OVER_STEP    = envNum("SIM_SUNWRATH_OVER_STEP", 0.030); // … je Punkt Peak DARÜBER (Überhitzung)
// Sonnenkern (L) — WIN-CONDITION: endet ein Durchlauf mit hoher Hitze, brennt sie sich dauerhaft in ALLE Karten (+Wert).
export const SONNENKERN_MIN_HEAT   = envNum("SIM_SONNENKERN_MIN_HEAT", 60);   // ab dieser End-Hitze brennt Sonnenkern ein [Legendär-Angleich: 70→60 — häufiger auslösen]
export const SONNENKERN_VALUE      = envNum("SIM_SONNENKERN_VALUE", 2);       // +Dauerwert je heißem Durchlauf (auf Karten unter dem Deckel) [Legendär-Angleich: 1→2]
export const SONNENKERN_CARD_CAP   = envNum("SIM_SONNENKERN_CARD_CAP", 9);    // nur Karten UNTER diesem Wert brennen ein → hebt den Deck-BODEN [Legendär-Angleich: 7→9 — mehr Karten]
// #fire-leg: Sonnenkern war ein SCHALTER ohne jede Interaktion — Hitze ≥ Schwelle am Durchlauf-Ende, alle Karten
// unter dem Deckel +Wert, Hitze unangetastet, keine Entscheidung. Jetzt brennt die Sonne in BEIDE Decks: endet der
// Durchlauf heiß, VERFALLEN die Brände dieses Durchlaufs nicht (normal hält ein Brand genau einen Durchlauf,
// `brandActive = brandPending`), sondern stapeln sich auf den Gegnerkarten. Damit hängt er an der Brand-Linie
// (Brandmal/Lauffeuer/Schmelzofen liefern das Material) UND weiter an der Hitze — endet ein Durchlauf kalt, fällt
// der Stapel auf den normalen Ein-Durchlauf-Brand zurück. Der Deckel verhindert, dass ein Gegnerdeck auf 0 sinkt.
export const SONNENKERN_BRAND_CAP   = envNum("SIM_SONNENKERN_BRAND_CAP", 4);   // max gestapelte Brände je Gegnerkarte
// Der Stapel zahlt in SCORE, nicht in Wert: ein −4-Abzug würde die Gegnerkarte praktisch ausradieren (zusammen mit
// dem +2 auf der eigenen Seite doppelt). Der Wert-Abzug bleibt deshalb auf dem normalen Brandmaß gedeckelt
// (BRAND_VALUE_CAP), und die ANZAHL der Brände wird zur Score-Quelle: jeder Sieg gegen eine gebrandmarkte Karte
// zahlt je Brand darauf. Das macht den Stapel sichtbar wertvoll, ohne den Gegner zu entwerten.
// Gemessen (Halte-Build, 700 Laeufe je Punkt): Satz 100 -> Sonnenkern 16,63 Mio · 200 -> 17,90 · 350 -> 19,13.
// 100 gewaehlt: das ist praktisch das Niveau der verworfenen −4-Fassung (16,20), also gleiche Staerke bei besserer
// Mechanik. Nebenbefund derselben Messung: SONNENKERN_VALUE von 2 auf 1 bewegt nur 0,04 Mio — die alte
// „+Kartenwert"-Passive ist fast wirkungslos, der Brand-Score traegt den Skill.
export const SONNENKERN_BRAND_SCORE = envNum("SIM_SONNENKERN_BRAND_SCORE", 100); // Score je Brand auf der geschlagenen Karte
// Deckel des WERT-Abzugs durch Brände — genau das bisherige Maximum (Brandmal + Schmelzofen-Bonus). Ohne Sonnenkern
// stapeln Brände ohnehin nicht; der Deckel greift also nur für den Stapel und hält den Gegner spielbar.
export const BRAND_VALUE_CAP        = BRAND_VALUE + SCHMELZOFEN_BRAND_BONUS;
// Phönixfeuer (L) — KONSISTENZ: Niederlagen GEBEN Hitze (+je Rückstandspunkt) statt sie zu nehmen; + Reignite bei Konsum-0.
export const PHOENIX_LOSS_HEAT     = envNum("SIM_PHOENIX_LOSS_HEAT", 8);      // +Hitze je Rückstandspunkt bei Niederlage (statt Verlust) [Legendär-Umbau]
export const PHOENIX_REIGNITE      = envNum("SIM_PHOENIX_REIGNITE", 0.40);    // verbrauchte Hitze entzündet neu (Anteil zurück), 1×/Durchlauf
// #fire-balance: Auslöser war allein „Hitze ≤ 0“. Seit Flächenbrand einen Boden hat (CONFLAG_KEEP), gibt es das aus
// einem Konsum nicht mehr — die Klausel wäre still gestorben. Sie zündet jetzt zusätzlich nach einem GROSSEN Einzel-
// verbrauch; der kleine Schmelzpunkt-Tropf (MELT_COST) liegt bewusst darunter, sonst verpuffte das 1×/Durchlauf sofort.
export const PHOENIX_MIN_BURN      = 25;                                     // … oder: so viel Hitze auf einmal verbrannt
// Damaststahl (L) — DIREKT-SCORE: geschmiedete Siegkarte → direkter Score ∝ geschmiedetem Wert (am Stack vorbei); Deckel entfällt; Asche verfällt nie.
// #fire-nodirect 4 → 10: Damaststahl war mit -0,83 der schwaechste Feuer-Legendaer, und der Grund lag NICHT beim
// Satz (4 → 14 bewegte sein Delta nur von -1,12 auf -0,83). Er lag hier: bei 4 Karten und FORGE_GROWTH = 0 ist der
// Gesamt-Schmiedewert nach vier Durchlaeufen fuer immer 12 — die Damast-Dividende steht damit bei 12 x 14 = 168 je
// Sieg, egal wie lange der Lauf noch geht. Der Deckel begrenzt seit dem Umbau auf GROWTH = 0 nur noch die BREITE,
// nicht mehr das Compounding, gegen das er urspruenglich gesetzt wurde. Gemessen (700 Laeufe, Delta des Skills):
//   4 Karten / kein Wachstum  -0,83  ·  10 / kein Wachstum  +2,16  ·  4 / +1 je Durchlauf  +2,29  ·  8 / +1  +6,81
// 10 ohne Wachstum gewaehlt: Legendaer-Niveau (Sonnenzorn +1,63 · Sonnenkern +4,19), Decke unveraendert (p99 48,7),
// und kein Compounding-Pfad zurueck.
export const DAMASCUS_MAX_FORGED   = envNum("SIM_DAMASCUS_MAX_FORGED", 10);   // Selbst-Schmiede deckelt auf so viele Karten (Breite, nicht Compounding) [#fire-nodirect]
export const DAMASCUS_FORGE_GROWTH = envNum("SIM_DAMASCUS_FORGE_GROWTH", 0);  // geschmiedete Karten +Dauerwert je Durchlauf (0 = kein Compounding) [Legendär-Umbau]
// #fire-nodirect: war „DAMASCUS_DIRECT = 14", ein DIREKTER Score am Multiplikator-Stack vorbei. Umgestellt auf die
// multiplizierte Basis (Name mitgezogen — „DIRECT" stimmte danach nicht mehr, und ein falscher Name ist schlimmer
// als gar keiner). Grund ist derselbe wie beim Schmelzpunkt-Tropf: ein fester Betrag verliert gegen die über den
// Lauf wachsenden Multiplikatoren. Gemessen am Feuer-Lauf: der Direkt-Anteil am Stich-Ertrag steigt bis Durchlauf
// 20–29 auf 32,6 % und fällt danach auf 19,4 % — als kleiner Bonus (Glutdividende) trägt er, als Motor nicht.
// Der Satz ist danach neu eingestellt, s. u. — multipliziert ist derselbe Zahlenwert ein Vielfaches wert.
export const DAMASCUS_PER_VALUE    = envNum("SIM_DAMASCUS_PER_VALUE", 14);     // Score je Punkt GESAMT-Schmiedewert, je Sieg (Damast-Dividende), in der multiplizierten Basis
export const DAMASCUS_COMBAT       = envNum("SIM_DAMASCUS_COMBAT", 5);        // Underdog: geschmiedete Karten kämpfen mit +Wert (schlagen über ihrem Gewicht) [Legendär-Umbau]
// (Sonnenzorns alte ≥MIN_HEAT-Verstärkungen ausgebaut → Glühende Klinge/Weißglut sind jetzt reine Nicht-Legendär-Skills.)

/* ============================================================
   EIS-REWORK v0 — „Was du richtig stellst, erstarrt für immer und wächst." Gletscher: Architektur × Permanenz.
   Spine: SCHICHTEN je Frostkarte (permanent, unverlierbar). KEINE Konsumenten. Werte v0, cross-archetype Sim-Pass.
   ============================================================ */
// HINWEIS: Der alte Schicht-/Frost-Spine (ICE_BASE_FREEZE, ICE_LAYER_*, KRISTALLINE_*, EISKALT_*, GLETSCHER_*,
// PERMAFROST_*, VERGLETSCHERUNG_*, ARCHITEKT_STEP, EISBLUETE/STILLSTAND/EISDRUCK/… ) wurde entfernt — der Eis-Archetyp
// läuft jetzt vollständig über glacier.js (Masse/Rollen). Keine Alt-Eis-Konstanten mehr nötig.

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
// Pflanze-Fraktions-Passive „Wurzelschlag" (v0.5: vom Skill zur MONO-gegateten Archetyp-Passive — nur aktiv, solange
// ausschließlich Pflanzen-Skills gehalten werden). Wert wird aus Wachstum ABGELEITET (nicht verbraucht): +1 je N-Schwelle.
export const WURZELSCHLAG_PER_GROWTH = envNum("SIM_WURZELSCHLAG_PER_GROWTH", 4); // Passive: +1 Dauerwert je N abgeleitetem Wachstum (grüne Karte, bis Deckel) [Sim-tunebar: höher = Wert wächst langsamer → Auto-Sieg später]
export const WURZELSCHLAG_LOSS_EVERY = envNum("SIM_WURZELSCHLAG_LOSS_EVERY", 2); // Passive: je N Niederlagen einer Karte wächst sie trotzdem +1 Zuwachs (Zähler je card.id) [Sim-tunebar: höher = seltener Trostwachstum]
export const WURZELSCHLAG_LOSS_MIN_SKILLS = envNum("SIM_WURZELSCHLAG_LOSS_MIN_SKILLS", 4); // Niederlage-Klausel erst ab N gehaltenen Pflanzen-Skills [Sim-tunebar]
// Linie 4 — „Kernholz" (Mono-Grün-Payoff): grüner Sieg → +Score je Kartenwert-Punkt ÜBER dem Startwert (baseRank).
// Schließt den Loop Wachstum→Wert→Score (die Passive baut Wert, Kernholz erntet ihn). [Sim-tunebar]
export const KERNHOLZ_SCORE_PER_VALUE = envNum("SIM_KERNHOLZ_SCORE_PER_VALUE", 15);
export const WURZELTIEFE_SCORE     = envNum("SIM_WURZELTIEFE_SCORE", 15);  // Wurzeltiefe: Flat-Score je Sieg einer grünen Karte (Wurzeln-Score) [Pflanze-Buff: 12→15]
// Wurzeltiefe-Feldtiefe (Buff): Bonus je grünem Sieg, der mit dem GESAMTWACHSTUM des Feldes skaliert — aber mit
// √-Kennlinie (abnehmender Ertrag) und Deckel, damit tiefe Wälder nicht durchdrehen (Anti-Runaway). Bonus = K·√(ΣWachstum), gedeckelt.
export const WURZELTIEFE_FIELD_K   = envNum("SIM_WURZELTIEFE_FIELD_K", 1.05);  // Skalar auf √(Gesamtwachstum) [gespreizt: Deckel erst am Top-Peak ~Σ13k statt früh]
export const WURZELTIEFE_FIELD_CAP = envNum("SIM_WURZELTIEFE_FIELD_CAP", 120); // Deckel des Feldtiefe-Terms je Sieg
export const PFAHLWURZEL_MULT      = 2;   // Pfahlwurzel: Wurzeln-Score ×2 bei Formations-Sieg                  // v0
export const JAHRESRINGE_PER_GROWTH = 10; // Jahresringe: je 10 Wachstum der Karte +Wurzeln-Score              // v0
export const JAHRESRINGE_SCORE     = envNum("SIM_JAHRESRINGE_SCORE", 35);  // … so viel je 10er-Stufe [Pflanze-Buff: 30→35]
// #Ceiling-Buff (Pflanze): der strukturelle Grund fürs niedrige Ceiling ist, dass die generischen Payoffs LINEAR/flach
// sind (anders als Eis' dreieckiger Schicht-Score). Beide Achsen bekommen daher einen SUPERLINEAREN (dreieckigen) High-
// End-Anteil — additiv oben drauf, nur am oberen Rand → reines Ceiling, Floor unberührt, beide Skills bleiben Picks.
// Wurzel/TIEFE: dreieckig in der Wachstums-Tiefe der Siegkarte (Wachstum über dem Wert-Deckel). Nur mit Wurzeltiefe.
export const PLANT_ROOT_DEEP_K     = envNum("SIM_PLANT_ROOT_DEEP_K", 5);   // Score je Dreiecks-Einheit m(m+1)/2 der Siegkarten-Tiefe [Sim-tunebar]
export const PLANT_ROOT_DEEP_CAP   = envNum("SIM_PLANT_ROOT_DEEP_CAP", 25); // gedeckelte gezählte Tiefe (Plateau, kein Runaway)
// Blüte/BREITE: dreieckig im vollen grünen Feld (greenCount). Nur mit Blüte UND wenn das Feld überwuchert ist (Gating wie Überwucherung).
export const PLANT_BLOOM_FIELD_K   = envNum("SIM_PLANT_BLOOM_FIELD_K", 5);   // Score je Dreiecks-Einheit m(m+1)/2 der Feldgröße [Sim-tunebar]
export const PLANT_BLOOM_FIELD_CAP = envNum("SIM_PLANT_BLOOM_FIELD_CAP", 25); // gedeckelte gezählte Feldgröße (Plateau)
// #288 „Trimmen": der Grow→Ernte-Pivot. Wird ein WACHSTUMS-stützender Skill (Aussaat/Flugsamen/Setzlingsbeet/Zäher Halm)
// ERSETZT, zählt das global als Trimmung → dauerhafter Multiplikator auf Wurzel- & Blüten-Score, je mehr Trimmungen desto
// höher (gedeckelt). Wachstums-Skills sterben so nicht, sie veredeln die Payoff-Phase. [Sim-tunebar]
export const TRIM_STEP = envNum("SIM_TRIM_STEP", 0.20); // +Anteil Wurzel-/Blüten-Score je Trimmung [Pflanze-Tune: zurück auf 20 %/Trimmung (25→20) im v0.5-Rework]
export const TRIM_CAP  = envNum("SIM_TRIM_CAP", 1.5);   // Deckel des Trimm-Multiplikator-Bonus [Pflanze-Buff: 1,0→1,5 = max +150 % → ×2,5]
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
export const BLAETTERDACH_SCORE    = envNum("SIM_BLAETTERDACH_SCORE", 8);  // … +Score je Karte im Block [Pflanze-Buff: 4→8]
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
export const WELTENBAUM_DIRECT       = envNum("SIM_WELTENBAUM_DIRECT", 6.5);  // Weltenbaum (BREITE): DIREKT je grünem Sieg × Σ Überlauf-Wachstum (der ganze alte Wald) [Legendär-Angleich: 2,6→6,5]
export const WELTENBAUM_OVERFLOW_CAP = envNum("SIM_WELTENBAUM_OVERFLOW_CAP", 600); // … gedeckelte Waldgröße
export const MUTTERBAUM_DIRECT       = envNum("SIM_MUTTERBAUM_DIRECT", 68);   // Mutterbaum (TIEFE): DIREKT je grünem Sieg × Überlauf-Wachstum des TIEFSTEN Baums (Konzentration) [sim-gelockt ins Band: 55→68 nach Floor-Buff]
export const MUTTERBAUM_OVERFLOW_CAP = envNum("SIM_MUTTERBAUM_OVERFLOW_CAP", 60); // … gedeckelte Tiefe des einen Mutterbaums
// Baumreihe (Dornenkönig umgewidmet — 4-Lane-Redesign): voll ausgewachsene grüne Karten (Wert PLANT_VALUE_CAP) bilden eine
// POSITIONSFREIE Wiederholung — je 11er auf dem Brett ein Faktor auf die Stiche DIESER Karten (Position egal → Doppelnutzung
// mit lokalen Formationen). Gedeckelt, weil positionsfrei + doppelt wirkend stark ist (anders als die ungedeckelte Normal-Wiederholung).
export const BAUMREIHE_BASE = envNum("SIM_BAUMREIHE_BASE", 1.3);  // Faktor ab 2 voll ausgewachsenen grünen Karten [sim-gelockt ins +45 %-Band]
export const BAUMREIHE_STEP = envNum("SIM_BAUMREIHE_STEP", 0.15); // + je weiterer voll ausgewachsener grüner Karte
export const BAUMREIHE_CAP  = envNum("SIM_BAUMREIHE_CAP", 2.0);   // Deckel des Baumreihen-Faktors
export const EWIGER_FRUEHLING_DIRECT = envNum("SIM_EWIGER_FRUEHLING_DIRECT", 80); // Ewiger Frühling (GRÜN-FELD): DIREKT je grünem Sieg × #grüne Karten (das ewige Feld) [Rework sim-gelockt: 150→80 wegen Full-Green-Double]
export const EWIGER_FRUEHLING_FIELD_CAP = envNum("SIM_EWIGER_FRUEHLING_FIELD_CAP", 40); // … gedeckelte Feldgröße
export const EWIGER_FRUEHLING_FULLGREEN_MULT = envNum("SIM_EWIGER_FRUEHLING_FULLGREEN_MULT", 1.5); // Rework: bei VOLL grünem Feld zählt der Feld-Bonus ×1,5 (der Schwellen-Rider war bei grünem Feld tot) [sim-gelockt]

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
/* Brett-Positionen eines Durchlaufs — dieselbe Zahl, aber ein anderer Begriff: positions-indizierte Zustände
   (Gletscher-Masse, Firn-Reserve, Gletscher-Lock, gesperrte Zellen) meinen eine BRETTGRÖSSE, keine Stichzahl.
   Eigener Name statt `new Array(40)` an vier Stellen im Reducer; abgeleitet → kein Drift, wenn das Deck wächst.
   Deckungsgleich mit architect.N_POS (ROWS × COLS) — das Gebäude-Overlay liegt über genau diesen Positionen. */
export const BOARD_POSITIONS = TRICKS_PER_CYCLE;

export const suitName  = (s) => (s ? SUITS[s].name : "—");
export const suitColor = (s) => (s ? SUITS[s].color : "#888");

/* ============================================================
   FORMATIONS-ANZEIGENAMEN — EINE Quelle für alle Spielertexte (Sprachprüfung A12/E1).
   Liegt hier im Blatt-Modul, weil sowohl formations.js als auch architect.js sie brauchen und
   formations.js bereits architect.js importiert (ein Import in die Gegenrichtung wäre ein Zyklus).
   Vorher: die Basistypen standen in formations.js, alle acht (+ Kürzel) noch einmal in ui/formationLabels.js,
   und der Architekt gab die ROHEN Schlüssel aus („Formations-Joker (wiederholung/farbblock)").
   ============================================================ */
export const FORMATION_LABELS = {
  wiederholung:   "Wiederholung",
  farbblock:      "Farbblock",
  treppe:         "Treppe",
  wechsel:        "Wechsel",
  anker:          "Anker",
  nachhall:       "Nachhall",
  formationskern: "Kern",
  grenzbonus:     "Grenzbonus",
};
// Anzeigename eines Formationstyps (Fallback: der rohe Typ, falls je ein neuer ohne Eintrag auftaucht).
export const formationLabel = (type) => FORMATION_LABELS[type] ?? type;
