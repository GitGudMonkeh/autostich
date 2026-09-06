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
describe("sim balance guard", () => {
  const SEEDS = 40; // feste Seeds 1..40 → deterministischer Median/Mean
  const scores = Array.from({ length: SEEDS }, (_, i) => runOne(1 + i, randomPolicy()).score).sort((a, b) => a - b);
  const median = (scores[19] + scores[20]) / 2;
  const mean = scores.reduce((t, v) => t + v, 0) / SEEDS;

  it("Median-Score im erwarteten Band (breite Power-Verschiebung)", () => {
    // Ist-Wert ≈ 4,05M (exp §7.23, 50 Runden, Feuer/Blitz). Band toleriert normales Tuning, schlägt bei grober Verschiebung an.
    expect(median).toBeGreaterThan(2_600_000);
    expect(median).toBeLessThan(5_500_000);
  });

  it("Mean-Score im erwarteten Band (Tail-Runaway-Fänger)", () => {
    // Ist-Wert ≈ 5,91M (exp §7.23). Die Obergrenze fängt weiterhin einen ECHTEN Tail-Blowup (Mean ginge dann deutlich höher).
    expect(mean).toBeGreaterThan(3_800_000);
    expect(mean).toBeLessThan(8_000_000);
  });
});
