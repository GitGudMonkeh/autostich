import { describe, it, expect } from "vitest";
import { runOne } from "../sim/run.js";
import { randomPolicy } from "../sim/policies/random.js";

// Balance-Guard (docs/sim-harness-plan.md §9): Random-Policy über feste Seeds → Median UND Mean im Band.
// Fängt versehentlichen Power-Creep bei Tuning-Änderungen. WICHTIG: BEIDE Kennzahlen prüfen —
// der Median ist gegen Heavy Tails robust (der #121-Feuer-Runaway bewegte den Median kaum), der
// Mean reagiert dagegen stark auf Tail-Runaway. Nur zusammen fangen sie die relevanten Regressionen.
//
// Stand: NEU ZENTRIERT nach Legendär-Angleich (v0/v0.2/v0.3) + Trimmen (#288). Ausgangspunkt war der #272-Stand
// (MAX_CYCLES 45→50 + garantierter Legendär in Runde 29 → Median ~2,55M, Mean ~2,73M). Zwei ABSICHTLICHE Buffs haben
// das Niveau seither angehoben: (a) der Legendär-Angleich (Trap-Picks hoch, Mittelfeld Richtung +45 %) brachte den
// Random-Policy-Median auf ~3,12M; (b) Trimmen (#288) legt beim Ersetzen von Wachstums-Skills einen Wurzel-/Blüten-
// Multiplikator auf — die Random-Policy tauscht Skills weit aggressiver als echtes Pivot-Spiel, treibt trimCount hoch
// und hebt den Median um ~+11,6 % auf ~3,49M (Mean ~3,44M). Beides ist gewollt; die Bänder sind darauf neu zentriert.
// Bei weiterem Balance-Tuning erneut neu zentrieren. WICHTIG: BEIDE Kennzahlen prüfen (Median tail-robust, Mean
// tail-sensitiv) — nur zusammen fangen sie die relevanten Regressionen.
//
// exp skill rework, Phase 1 (docs/skill-rework.md §7): 40 statt 50 Durchläufe, keine Legendär-Phase (Legendäre als
// fünfte Seltenheit im Angebot), Slots unbegrenzt. Gemessen mit der Random-Policy über Seeds 1..40: Median ≈ 1,97M,
// Mean ≈ 2,33M; nach den Blitz-/Feuer-Modulen und der Tarierung (§7.5) ≈ 1,47M / 2,11M.
//
// exp skill rework, Türen (docs/skill-rework.md §7.7): die Welt ist Feuer + Blitz (Eis/Pflanze warten auf ihre Runde),
// das Angebot sind zwei Türen à drei Skills. Gemessen mit der Random-Policy über Seeds 1..40: Median ≈ 1,13M,
// Mean ≈ 1,34M (Seeds 1..200: 1,23M / 1,73M — dasselbe Niveau wie das flache Feuer/Blitz-Angebot davor, 1,23M / 1,87M).
// Die Bänder sind darauf zentriert (≈ ±35 %); nach der Eis-/Pflanze-Runde erneut zentrieren.
// §7.10 (Kühlung 2 → 6, Vorsprung-Offset 2 → 1): Seeds 1..40 Median ≈ 1,04M, Mean ≈ 1,23M — im Band, nicht neu zentriert.
//
// §7.14 (Owner, 2026-09-06): 50 statt 40 Durchläufe (gleiche Phasenfolge, 13 Skill-Phasen), Schmiede ohne Preis, Stapel-Score
// 60 → 75 für die Parität. Der Score wächst überlinear mit den Runden: Seeds 1..40 Median ≈ 2,34M, Mean ≈ 4,45M (Seeds
// 1..200: 2,49M / 5,69M — der Mean hängt am schweren Schwanz). Die Bänder sind auf die 40 Seeds neu zentriert (≈ ±35 %).
//
// §7.16 (Owner, 2026-09-06): Schmelzpunkt als Überlauf-Wandler, Flächenbrand gestrichen, Glut 50/60/70/90, Zunder 2–5.
// Ohne die beiden Fallen und mit dem Wandler (Feuersturm × Schmelzpunkt, s. Doku) steigt der Zufallsspieler: Seeds 1..40
// Median ≈ 3,40M, Mean ≈ 5,94M (Seeds 1..200: 3,39M / 8,18M). Bänder darauf zentriert; nach dem Feuersturm-Entscheid
// und der Blitz-Runde erneut zentrieren.
// §7.17 (Feuersturm = Serie zu Score bei voller Leiste, 0,1–0,3 % je Serienpunkt): Seeds 1..40 Median ≈ 3,60M, Mean ≈ 6,14M —
// im Band, nicht neu zentriert. §7.18 (Blitz-Runde): Median ≈ 3,53M, Mean ≈ 6,52M — im Band.
// §7.19 (Owner, 2026-09-06): Ionenfeld 3/3/4/5, Kettenblitz jede Leiste +1/2/3/4, Überspannung als Dauerwert je Leiste,
// Crit-Deckel 8 → 12, Überschlag gestrichen, Phönixfeuer und Sonnenzorn gehoben. Der Zufallsspieler steigt (Ionenfeld und
// der Dauerwert tragen, s. Doku): Seeds 1..40 Median ≈ 5,67M, Mean ≈ 9,28M (Seeds 1..200: 4,51M / 10,65M). Bänder darauf
// zentriert (≈ ±35 %). §7.20 (Owner): Ionenfeld 2/3/4/5, Überspannung 1/2/3/4, Deckel zurück auf 8, Donnergott über die
// Stapel, Phönixfeuer-Überlauf, Sonnenzorn 0,05 und ×2 unter der Spitze — Seeds 1..40 Median ≈ 5,64M, Mean ≈ 8,89M, im Band.
// §7.21 (Owner): Ewige Glut ersetzt Phönixfeuer (Rampe +0,05 je heiße Runde nach Sweep, Boden 50 % der Spitze) — Seeds
// 1..40 Median ≈ 5,64M, Mean ≈ 9,19M, im Band. §7.22 (Owner): Rückzündung als Konter, acht Episch-Extras — Seeds 1..40
// Median ≈ 5,48M, Mean ≈ 8,95M, im Band.
// §7.23 (Owner, 2026-09-06): Ladungsserie ÷10 (0,1–0,25 % Crit je Serienpunkt statt 1–2,5 %) und Feuerlinie statt Glut.
// Der Zufallsspieler fällt mit dem Serien-Crit (s. Doku): Seeds 1..40 Median ≈ 4,05M, Mean ≈ 5,91M (Seeds 1..200: 3,48M /
// 6,71M). Bänder darauf neu zentriert (≈ ±35 %).
// §7.24 (Owner, 2026-09-06): Überspannung verwertet den Deckel-Überschuss, Rückzündung im Takt, und der Dauerwert je Leiste
// ist Blitz-Passiv (+1 auf die ionisierte Karte, ION_VALUE_PER_BAR) — jeder Blitz-Build bekommt ihn, der Zufallsspieler
// steigt: Seeds 1..40 Median ≈ 4,72M, Mean ≈ 7,90M. Bänder darauf neu zentriert (≈ ±35 %).
// §7.25 (Resonanz statt Durchschlag): im Band. §7.27 (Owner, 2026-09-06): Brandschneise ersetzt Feuerwalze — der
// Dauerbonus „+2 Wert nach jedem Sieg" fällt weg, dafür ×2,5 auf 3–6 von 40 Positionen (Satz nach Sweep, Parität im
// Duell 1,00×). Der Zufallsspieler fällt: Seeds 1..40 Median ≈ 2,64M, Mean ≈ 5,90M (Seeds 1..200: 3,50M / 7,01M).
// Bänder darauf neu zentriert (≈ ±35 %).
// §6.12 (Owner, 2026-09-07): Sonnenzorn zurück statt Damaststahl, und die neun Legendären auf ein Band gebracht. Für den
// Zufallsspieler zählt vor allem die gehobene Unterkante (Hochspannung, Doppelentladung, Ewige Glut, Sonnenzorn,
// Resonanz) — die gesenkte Oberkante (Sonnenkern, Baumreihe) trifft ihn kaum, weil er den Formations-Motor selten baut.
// Seeds 1..40 Median ≈ 4,01M, Mean ≈ 8,76M. Bänder darauf neu zentriert (≈ ±35 %).
// §6.16 (Owner, 2026-09-07): die Pflanze kommt ins Angebot (SKILL_OFFER_ARCHETYPES). Der Zufallsspieler FÄLLT — er
// zieht jetzt Pflanze-Skills, deren Motor (Wachstum über Formationen) ein gebauter Build ist, und verdünnt damit
// seine Feuer-/Blitz-Linien. Seeds 1..40 Median ≈ 2,98M, Mean ≈ 4,82M. Bänder darauf neu zentriert (≈ ±35 %).
// §6.19 (Owner, 2026-09-07): blühende Karten zählen in den vier Formations-Score-Skills wie 5/5/6/7 grüne (Parität
// der Pflanze). Seeds 1..40 Median ≈ 3,29M, Mean ≈ 5,30M — der Zufallsspieler steigt nur leicht, weil er blühende
// Karten selten in Formationen stehen hat. Bänder darauf neu zentriert (≈ ±35 %).
// §5.4 (Owner, 2026-09-07): Eis kommt ins Angebot — alle vier Fraktionen stehen jetzt an den Türen. Der Zufallsspieler
// FÄLLT im Median und STEIGT im Mean: Eis-Gletscher zahlen unabhängig vom Rest des Builds (der Bruch hängt an der
// Masse, nicht am Stich), verdünnen aber die Feuer-/Blitz-Linien, die er sonst zusammenbekäme. Seeds 1..40
// Median ≈ 2,87M, Mean ≈ 5,92M (Seeds 1..200: 2,68M / 4,55M). Bänder darauf neu zentriert (≈ ±35 %).
// §5.5 (Owner, 2026-09-07): der weiche Deckel auf den Einzelbruch ist gestrichen (§1: keine Deckel), dafür steht die
// Grundzahl bei 170 statt 340 und die Gletscherzahl bei höchstens 12. Der Median fällt leicht, der MEAN steigt deutlich:
// Seeds 1..40 Median ≈ 2,52M, Mean ≈ 10,20M (Seeds 1..200: 2,31M / 10,72M). Das ist die gewollte Folge — ohne Deckel
// hat ein dichtes Gletscherfeld wieder eine offene Decke, und der Zufallsspieler trifft es in wenigen Seeds. Die
// Obergrenze des Mean-Bandes wandert damit mit; sie fängt weiterhin einen ECHTEN Blowup (ohne Gletscher-Deckel lag der
// Mean bei 352M, mit Deckel 16 bei 330M — beides schlägt hier weiter an).
// §5.6 (Owner, 2026-09-07): überlappende Gletscher-Formen stapeln nicht mehr, die stärkste zählt. Das war der
// eigentliche Runaway: der Schwanz kommt fast auf den Stand vor dem Eingriff zurück, während die Grundzahl wieder
// höher stehen darf (170 → 250, Parität unverändert). Seeds 1..40 Median ≈ 2,78M, Mean ≈ 6,24M (Seeds 1..200:
// 2,55M / 4,47M). Bänder darauf neu zentriert (≈ ±35 %).
// §5.18 (Owner, 2026-09-09): der Eis-Umbau — Zug im Fundament, vierte Schwelle 18, liegenbleibender Überschuss,
// Gletscherzunge und Sprödbruch statt Rissbildung/Eispanzer. ZWEI Messungen haben hier eingegriffen: ohne Deckel auf
// den liegenbleibenden Überschuss lag der Mean bei 48,25M (ein Seed auf 959M) — der Deckel (KEEP_MAX 6) drückt ihn auf
// 9,47M, ohne den Median zu bewegen (3,95 → 3,94M). Danach stand Eis mono im Duell bei 1,65× Feuer; BURST_SCALE
// 250 → 150 bringt den Median auf 1,04×. Endstand Seeds 1..40: Median ≈ 3,36M, Mean ≈ 7,70M — BEIDE im bestehenden
// Band, die Grenzen sind deshalb unverändert geblieben.
// §5.29 (Owner, 2026-09-09): die Stufenleiter ist über die vierte Schwelle hinaus geöffnet (Schwellen 4/8/12/18/27/40/60),
// das Boden-Einkommen steht bei 0,6 und BURST_SCALE bei 20. Der Zufallsspieler steigt: seine Gletscher zahlen
// unabhängig vom Rest des Builds, und die neuen Sprossen verwerten angesammelte Masse, die vorher linear verfiel.
// Seeds 1..40 Median ≈ 3,79M, Mean ≈ 8,35M (Seeds 1..200: 3,98M / 8,41M — dasselbe Niveau, der Mean hängt also
// nicht an einem einzelnen Ausreißer). Das Median-Band ist darauf neu zentriert (≈ ±35 %), das Mean-Band bleibt.
describe("sim balance guard", () => {
  const SEEDS = 40; // feste Seeds 1..40 → deterministischer Median/Mean
  const scores = Array.from({ length: SEEDS }, (_, i) => runOne(1 + i, randomPolicy()).score).sort((a, b) => a - b);
  const median = (scores[19] + scores[20]) / 2;
  const mean = scores.reduce((t, v) => t + v, 0) / SEEDS;

  it("Median-Score im erwarteten Band (breite Power-Verschiebung)", () => {
    /* Ist-Wert ≈ 3,79M (exp §5.29). Band toleriert normales Tuning, schlägt bei grober Verschiebung an.
       Neu zentriert mit Beleg statt auf Verdacht: die alte Obergrenze 3,75M war um 1 % überschritten, und der
       Wert ist über Seeds 1..200 mit 3,98M auf demselben Niveau — es ist kein Ausreißer, sondern die gewollte
       Folge der offenen Stufenleiter. Der Mean (Guard darunter) bleibt bei 8,35M im bestehenden Band. */
    expect(median).toBeGreaterThan(2_450_000);
    expect(median).toBeLessThan(5_150_000);
  });

  it("Mean-Score im erwarteten Band (Tail-Runaway-Fänger)", () => {
    // Ist-Wert ≈ 8,84M (exp §7.30, Blitz-Sockel + Ladungsserie/Serienschutz umgebaut; auf origin/exp davor 6,39M).
    // Obergrenze 8,5 → 10,5M nachgezogen, und zwar mit Beleg statt auf Verdacht: über 40 Seeds trägt EIN Lauf (129M)
    // den Mean, ohne ihn stehen 5,75M; über Seeds 1..200 liegt der Mean bei 6,48M, also mitten im Band. Der Median
    // (Guard darüber) wandert von 2,59 auf 3,12M und bleibt im Band. Die Obergrenze fängt weiterhin einen ECHTEN Blowup
    // (mit stapelnder Geometrie und ohne Gletscher-Deckel lag der Mean bei 352M) — sie ist um den Faktor 33 entfernt.
    expect(mean).toBeGreaterThan(4_000_000);
    expect(mean).toBeLessThan(10_500_000);
  });
});
