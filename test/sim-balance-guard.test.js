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
describe("sim balance guard", () => {
  const SEEDS = 40; // feste Seeds 1..40 → deterministischer Median/Mean
  const scores = Array.from({ length: SEEDS }, (_, i) => runOne(1 + i, randomPolicy()).score).sort((a, b) => a - b);
  const median = (scores[19] + scores[20]) / 2;
  const mean = scores.reduce((t, v) => t + v, 0) / SEEDS;

  it("Median-Score im erwarteten Band (breite Power-Verschiebung)", () => {
    // Ist-Wert ≈ 1,13M (exp Türen, Feuer/Blitz). Band toleriert normales Tuning, schlägt bei grober Verschiebung an.
    expect(median).toBeGreaterThan(750_000);
    expect(median).toBeLessThan(1_550_000);
  });

  it("Mean-Score im erwarteten Band (Tail-Runaway-Fänger)", () => {
    // Ist-Wert ≈ 1,34M (exp Türen). Die Obergrenze fängt weiterhin einen ECHTEN Tail-Blowup (Mean ginge dann deutlich höher).
    expect(mean).toBeGreaterThan(870_000);
    expect(mean).toBeLessThan(1_850_000);
  });
});
