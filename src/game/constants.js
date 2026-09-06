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
export const MAX_CYCLES       = envNum("SIM_MAX_CYCLES", 50);     // exp skill rework: 50 rounds (owner, §7.14; was 40), 13 skill phases (docs/skill-rework.md §1) [TUNING · Sim-übersteuerbar]
// Architekt (#202, Shop-Ersatz): Modul-Default-Schalter. Das Spiel startet den Lauf mit architect:true (START_RUN, App.jsx);
// dieser Default greift nur, wenn keine Action-Flag gesetzt ist (Sim ohne A/B). Im Browser existiert `process` nicht → false.
export const ARCHITECT_ENABLED = (typeof process !== "undefined" && process.env && (process.env.ARCHITECT === "1" || process.env.ARCHITECT === "true")) || false;
// #202/#214: Baseline des geteilten Reroll-Pools (Perk+Skill) je Lauf. Fix, kein Nachschub — Rerolls sind die Belohnungs-
// Fläche für die Meistergrade (#217). Rang-Bonus fädelt später über einen erhöhten Startwert ein.
export const BASE_REROLLS      = envNum("SIM_BASE_REROLLS", 2);
// Merge test/sim←main: ENV-Sweep-Haken bleibt, Default = main's Live-Balance (SPW 100→400, Pacing-Pass Sim-validiert).
export const SCORE_PER_WIN    = envNum("SIM_SCORE_PER_WIN", 400);    // Basispunkte je Sieg (Perks/Formationen skalieren darauf) [TUNING · Default = Live-Balance 400]
// BACKSTOP (Crit-Bändigung 2026-08-15): harter Deckel auf den fertigen Crit-Multiplikator, egal aus welchen Kanälen er
// kommt. Die legitime Summe aller gedeckelten Quellen liegt bei ~7,4× (Basis 2,25 + Wucht IV 0,90 + 6 Blitz-Skills 0,60
// + Donnergott 0,40 + Durchschlag 2,00 + Entladung 1,00 + Raserei 1,00) → der Deckel bindet einen ehrlichen Build NICHT,
// fängt aber jede künftige Kombi ab, die wieder eine unbegrenzte Größe in den Multiplikator kippt.
export const CRIT_MULT_CAP    = envNum("SIM_CRIT_MULT_CAP", 8); // exp §7.20 (Owner): zurück auf 8 — der Deckel 12 (§7.19) gab die Luft den Stapeln, nicht den Rampen (Duell: ein Viertel des Blitz-Schwanzes, gierig ein Fünftel des Medians)
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
// exp skill rework (docs/skill-rework.md §1, §7.14): the block Skill→Perk→Aufstellen→Architekt repeats for the
// whole run — 50 rounds by default, so skills sit at rounds 1, 5, 9 … 49 (13 skill phases); every formation phase
// is caught by an architect phase, no two shop/skill decisions in a row. The same block order holds for any
// length (SIM_MAX_CYCLES sweeps included; the owner set 50 with the order unchanged, 2026-09-06). The engine reads
// DECISION_SCHEDULE[cycle] (after cycle += 1); the start decision (index 0 = "skill", round 1) runs through START_RUN.
// The dedicated legendary phase (old round 29) is gone: legendaries are the fifth rarity of the skill offer roll
// (skills.js, rollSkillOfferTiers).
const BLOCK = ["skill", "perk", "formation", "shop"];
// Decision plan of length n: the block repeated, cut to n. Pure and testable; the engine reads only the
// DECISION_SCHEDULE built from it.
export function buildSchedule(n = MAX_CYCLES) {
  return Array.from({ length: Math.max(0, n) }, (_, i) => BLOCK[i % BLOCK.length]);
}
export const DECISION_SCHEDULE = buildSchedule(MAX_CYCLES);
// Welche Perk-Phase (1-basiert) ist der 0-indexierte Cycle `c` im Plan? 0 = keine Perk-Entscheidung.
// Für die 2.-Perk-Phase-Boni (Progression M4/M5): perkPhaseAt(schedule, c) === LEG_PERK2_PHASE.
export const perkPhaseAt = (schedule, c) => (schedule[c] === "perk" ? schedule.slice(0, c + 1).filter((d) => d === "perk").length : 0);
export const LEG_PERK2_PHASE = envNum("PROG_LEG_PERK2_PHASE", 2); // die „2. Perk-Phase" (Runde 6 im 50er-Plan) [TUNING]
// Erste Skill-Runde (1-indexierter Durchlauf), driftfest aus dem festen Plan abgeleitet — für UI-Texte, die dem
// Spieler sagen, ab wann Skills wählbar sind. Ändert sich der Plan, wandert die Zahl automatisch mit.
export const FIRST_SKILL_CYCLE = DECISION_SCHEDULE.indexOf("skill") + 1;
// Legendär-Phase (1-indexierter Durchlauf), aus dem Plan abgeleitet. exp skill rework: der Plan kennt keine
// Legendär-Phase mehr → 0. Der Export bleibt nur für die inaktiven Kataloge (en/es), die ihn noch nennen.
export const LEG_PHASE_CYCLE = DECISION_SCHEDULE.indexOf("legendary") + 1;

// (#229: Shop-Münzökonomie + Shop-Angebots-Konstanten entfernt — der Shop ist weg, es gibt keine Münzen/Angebote mehr.)
// Anzeige-Labels der (ex-Shop-)Kategorien — von der Chronik-Ziel-Beschriftung noch referenziert.

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
// exp skill rework (docs/skill-rework.md §1, §3.7): every offered skill rolls a rarity tier — Normal / Selten /
// Sehr selten / Episch with these weights — and, before that, a legendary chance PER SLOT: a hit replaces the slot
// with an unowned legendary of the same faction (fifth rarity, no gate, no replacing). Owner start value 3–4 %.
export const SKILL_TIER_WEIGHTS        = [62, 25, 10, 3];
export const SKILL_LEGENDARY_PER_SLOT  = envNum("SIM_SKILL_LEGENDARY_PER_SLOT", 0.035);
// Door offer (docs/skill-rework.md §1): a skill phase shows SKILL_DOORS doors, each hiding SKILL_DOOR_SIZE skills
// drawn from at most SKILL_DOOR_FACTIONS factions (repetition allowed). The door shows only the faction symbols;
// the tiers are rolled with the door and revealed after it is opened. The pool is SKILL_OFFER_ARCHETYPES while
// Eis and Pflanze wait for their rework — widen the list when a faction joins (skills.js buildSkillDoors).
export const SKILL_DOORS               = 2;
export const SKILL_DOOR_SIZE           = 3;
export const SKILL_DOOR_FACTIONS       = 2;
export const SKILL_OFFER_ARCHETYPES    = ["fire", "lightning"];
// Held skills are unlimited on exp (owner decision). The reducer and the screens treat a limit at or above this
// value as "no limit"; SKILL_SLOTS below stays the reference count for the plant commitment scaler and legacy texts.
export const SKILL_SLOT_LIMIT          = envNum("SIM_SKILL_SLOT_LIMIT", 99);
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
/* ============================================================
   BLITZ — exp skill rework (docs/skill-rework.md §3). Hier stehen NUR die Passiv-Größen und die Sim-Regler; die Zahlen
   der 15 Skills liegen in ihren Stufentabellen (skills.js SKILL_DEFS[…].tiers, gelesen von factions/lightning.js).
   Startwerte für die Sim (Phase 5). [TUNING]
   ============================================================ */
// docs/skill-rework.md §7.12 (owner: ionisation carries, via the crit multiplier): crit per skill 0.05 → 0.04 so the
// single skill matters again, and every stack on the winning card adds ION_CRIT_MULT_PER_STACK to the crit multiplier.
// Sweep (100 runs): 0.1×/4 % floor 1.01×, stack build 2.76M < crit build 2.91M · 0.15×/4 % floor 0.98×, stack build
// 2.97M ≈ crit build 2.95M, stacks 18 % of a random build's score · 0.2×/3 % floor 1.11×, fewer crits fill fewer bars.
export const LIGHTNING_CRIT_PER_SKILL = envNum("SIM_LIGHTNING_CRIT_PER_SKILL", 0.04); // Passiv: +Crit-Chance je gehaltenem Blitz-Skill (nicht gestuft)
export const ION_CRIT_MULT_PER_STACK  = envNum("SIM_ION_CRIT_MULT_PER_STACK", 0.15);  // +Crit-Multiplikator je Stapel auf der Siegkarte (Kurzschluss zählt die Stapel ab der Schwelle doppelt)
export const LIGHTNING_MAX_CHARGE     = envNum("SIM_LIGHTNING_MAX_CHARGE", 10);       // Leiste: so viele Ladungen (= Crits) bis zur Ionisierung
export const DONNERGOTT_MAX_CHARGE    = envNum("SIM_DONNERGOTT_MAX_CHARGE", 7);       // Donnergott (L): die Leiste ist bei 7 voll (Sim-Wachpunkt: ~8)
export const DONNERGOTT_ION_CRIT_MULT_PER_STACK = envNum("SIM_DONNERGOTT_ION_CRIT_MULT_PER_STACK", 0.25); // Donnergott (L, §7.20): Stapel der Siegkarte zählen so viel Crit-Multiplikator statt ION_CRIT_MULT_PER_STACK (vorher flach +0,4×)
// Tariert 2026-09-05 (docs/skill-rework.md §7.5): 12 → 60. Gemessen in der Feuer/Blitz-Welt (--mode duel, 200 Läufe):
// Blitz mono 2,15M bei 12, 2,37M bei 60 gegen Feuer mono 2,40M; bei 12 trugen die Stapel nur ~8 % der Basis (Ø 2,6 je
// Karte am Laufende), der Regler war praktisch tot. Crit je Skill (0,07 → 2,43M) wäre der andere Weg; der Stapel-Weg
// macht die Leiste und die Stapel-Skills (Kettenblitz, Kurzschluss, Blitzfänger) spürbar.
export const ION_SCORE_PER_STACK      = envNum("SIM_ION_SCORE_PER_STACK", 75);        // +Score (Basis, vor den Multiplikatoren) je Stapel bei Sieg mit der Karte — der Paritäts-Regler Feuer/Blitz (§7.14: 60 → 75 bei 50 Runden; Duell-Sweep 60/75/80/90/120: Floor 1,16/1,07/1,03/0,99/0,88×, Mean 1,04/0,95/0,92/0,87/0,75×)
export const ION_VALUE_PER_BAR        = envNum("SIM_ION_VALUE_PER_BAR", 0);         // SIM-SONDE (§7.24, Default 0 = aus): Dauerwert je volle Leiste auf die ionisierte Karte als Blitz-Passiv — der Dauerwert war bis §7.23 Überspannung und trug Blitz mono; Duell-Sweep 1/2 in der Doku
export const ION_MAX_STACKS           = 5;  // NUR ANZEIGE (Karten-Pips, „voll ionisiert"-Effekte): Stapel sind seit dem Rework ohne Deckel
export const OVERCRIT_MULT_PER_PP     = envNum("SIM_OVERCRIT_MULT_PER_PP", 0.002);    // Systemregel (alle Fraktionen): Crit-Chance über 100 % → +Crit-Mult je Prozentpunkt (sehr klein; Größe in der Sim)
export const DOPPELENTLADUNG_STACKS   = envNum("SIM_DOPPELENTLADUNG_STACKS", 2);      // Doppelentladung (L): Stapel je Ionisierung (statt 1)
export const DOPPELENTLADUNG_STRIKE   = envNum("SIM_DOPPELENTLADUNG_STRIKE", 2);      // Doppelentladung (L): Crit mit ionisierter Karte → der Stich zählt so oft (Sim-Regler, ggf. 1,5)

/* ============================================================
   FEUER — exp skill rework (docs/skill-rework.md §4). Passiv: Siege mit Abstand erzeugen Hitze, Niederlagen kühlen,
   je 10 % gehaltener Hitze +2 % Score als eigener Multiplikator. Die 15 Skills lesen ihre Kennwerte aus den
   Stufentabellen in skills.js (FEUER_TIERS); hier stehen nur die Passiv-Größen und die Legendär-Regler (Sim-Startwerte).
   ============================================================ */
export const HEAT_MAX            = 100;                                            // Leiste des Passivs (fix)
export const WEISSGLUT_HEAT_MAX  = envNum("SIM_WEISSGLUT_HEAT_MAX", 200);          // Leiste mit Weißglut (Skala, kein Rampen-Deckel)
export const HEAT_MIN_MARGIN     = envNum("SIM_HEAT_MIN_MARGIN", 3);               // Mindest-Vorsprung für Passiv-Hitze
// docs/skill-rework.md §7.10 (owner: heat must drain faster so the boosters matter): cooling 2 → 6 per loss makes a
// single booster worth +10 % (Glut) to +23 % (Zunder) over the core build; offset 2 → 1 gives every margin win one more
// point and brings Feuer mono back level with Blitz mono (floor 1.00×). Rejected: cooling 4 (Glut still flat), a
// steeper multiplier slope (barely moves the floor, decimal display).
export const HEAT_MARGIN_OFFSET  = envNum("SIM_HEAT_MARGIN_OFFSET", 1);            // Hitze = (Vorsprung − Offset) × je Punkt
export const HEAT_PER_POINT      = envNum("SIM_HEAT_PER_POINT", 1);                // % Hitze je Vorsprungspunkt über dem Offset, linear ohne Knie
export const HEAT_LOSS           = envNum("SIM_HEAT_LOSS", 6);                     // % Hitze je Niederlage (flach)
export const HEAT_MULT_PER_10    = envNum("SIM_HEAT_MULT_PER_10", 0.02);           // Score-Multiplikator je volle 10 % gehaltener Hitze (×1,2 bei 100)
export const FORGE_VALUE         = envNum("SIM_FORGE_VALUE", 3);                   // Schmiede/Damaststahl: +Dauerwert je Schmiedung
// Legendäre (§4.7): keine Stufe, zwei Effekte, jedes läuft allein.
export const SONNENKERN_BRAND           = 1;                                                   // Sonnenkern: jeder Sieg brandmarkt −1 (stapelt über die Runden)
export const SONNENKERN_SCORE_PER_BRAND = envNum("SIM_SONNENKERN_SCORE_PER_BRAND", 20);        // Sonnenkern: Basis-Score je Brandpunkt auf der geschlagenen Karte
export const EWIGE_GLUT_MULT_PER_ROUND  = envNum("SIM_EWIGE_GLUT_MULT_PER_ROUND", 0.05);       // Ewige Glut (L, §7.21, ersetzt Phönixfeuer): jede Runde, die mit voller Leiste endet, +so viel auf den Hitze-Multiplikator, dauerhaft (Rampe ohne Deckel). Sweep 0,03/0,05/0,08 zur Laufmitte: 1,02/1,14/1,32 gepaart
export const EWIGE_GLUT_FLOOR_FRAC      = envNum("SIM_EWIGE_GLUT_FLOOR_FRAC", 0.5);            // Ewige Glut (L): die Hitze fällt nie unter diesen Anteil der Spitze (Kaltstart nur einmal)
export const SONNENZORN_MULT_PER_10     = envNum("SIM_SONNENZORN_MULT_PER_10", 0.05);          // Sonnenzorn: Hitze-Multiplikator je 10 % Spitzen-Hitze (statt HEAT_MULT_PER_10; §7.20: 0,04 → 0,05)
export const SONNENZORN_HEAT_MULT       = envNum("SIM_SONNENZORN_HEAT_MULT", 2);               // Sonnenzorn (§7.20): unter der Spitze zählt die Hitze aus Siegen ×

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
