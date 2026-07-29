// Pacing-Analyse (Sim S6). Misst, WANN im Run der Score entsteht — die Verteilung über die
// 44 Cycles (Runden), nicht nur den Endscore. Ziel-Frage des Balance-Redesigns:
//   „Fühlt sich Early/Mid befriedigend an, und explodiert das Late-Game NUR bei guten Builds
//    (nicht mehr flächendeckend)?"
//
// Dafür braucht es Verteilungs-Kennzahlen, keine bloßen Mediane:
//  - cumShare[c]      Anteil des Endscores, der bis Ende Cycle c erreicht ist (Median-Kurve = Typ-Run).
//  - last10Share      Anteil des Endscores in den letzten 10 Cycles (35–44) — je Run.
//  - spikeFactor      Ø-Score/Cycle der letzten 10 ÷ Ø-Score/Cycle der ersten 34 (1 = flach, hoch = spät).
//  Für last10Share / spikeFactor berichten wir p10/p50/p90 ÜBER die Runs:
//    p50 hoch  → der TYPISCHE Run ist spät-lastig (schlecht fürs Mid-Game-Gefühl).
//    p90≫p50   → nur die besten Builds explodieren spät (erwünscht).
//    p10 hoch  → sogar schwache Runs explodieren spät → „durch die Bank" (unerwünscht).
import { runOne } from "./run.js";
import { randomPolicy } from "./policies/random.js";
import { ucbPolicy } from "./policies/ucb.js";
import { factionPolicy } from "./policies/faction.js";
import { newMemory } from "./memory.js";
import { MAX_CYCLES, TRICKS_PER_CYCLE } from "../src/game/constants.js";

const CYCLES = MAX_CYCLES;      // 44
const TPC = TRICKS_PER_CYCLE;   // 40

function quantile(sorted, q) {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const pctl = (vals, q) => quantile([...vals].sort((a, b) => a - b), q);

// EINEN Run mit Pro-Cycle-Score-Kurve. Nutzt den kanonischen runOne-Loop (Determinismus-treu)
// und sammelt via onTrick-Hook den kumulativen Score am Ende jedes Cycles.
function runWithCurve(seed, policy, mem = null) {
  const cum = new Array(CYCLES + 1).fill(0);
  const res = runOne(seed, policy, mem, {
    onTrick: (s) => {
      if (s.trickNo % TPC === 0) {
        const c = s.trickNo / TPC;
        if (c >= 1 && c <= CYCLES) cum[c] = s.score;
      }
    },
  });
  for (let c = 1; c <= CYCLES; c++) if (cum[c] === 0 && c > 1) cum[c] = cum[c - 1]; // Lücken monoton füllen
  cum[CYCLES] = res.score;
  return { seed, final: res.score, cum };
}

// Verteilungs-Metriken für einen Satz Runs.
function metrics(runs) {
  const finals = runs.map((r) => r.final);
  // Median-Kurve: cumShare[c] als Median über Runs (0..1).
  const cumShareMedian = [];
  for (let c = 0; c <= CYCLES; c++) {
    cumShareMedian[c] = c === 0 ? 0 : pctl(runs.map((r) => r.cum[c] / (r.final || 1)), 0.5);
  }
  const shareBy = (c) => runs.map((r) => r.cum[c] / (r.final || 1));
  const last10 = runs.map((r) => 1 - r.cum[34] / (r.final || 1));      // Cycles 35–44
  const last5 = runs.map((r) => 1 - r.cum[39] / (r.final || 1));       // Cycles 40–44
  const spike = runs.map((r) => {
    const early = r.cum[34] / 34;                                       // Ø-Score/Cycle Cycles 1–34
    const late = (r.final - r.cum[34]) / 10;                            // Ø-Score/Cycle Cycles 35–44
    return early > 0 ? late / early : 0;
  });
  const dist = (vals) => ({ p10: pctl(vals, 0.1), p50: pctl(vals, 0.5), p90: pctl(vals, 0.9) });
  // „Flächendeckend?"-Indikator: Anteil der Runs, deren letzte 10 Cycles > 45 % des Endscores tragen.
  const share45 = last10.filter((v) => v > 0.45).length / (runs.length || 1);
  return {
    finalP50: pctl(finals, 0.5), finalP90: pctl(finals, 0.9),
    cumShareMedian,
    by20: dist(shareBy(20)), by30: dist(shareBy(30)),
    last10: dist(last10), last5: dist(last5), spike: dist(spike),
    lateHeavyShare: share45,
  };
}

export function runPacing({ arg, seed0, c, f, write }) {
  const N = Number(arg("--runs", 400));
  const pctS = (x) => `${(x * 100).toFixed(1)}%`;

  const collect = (policyFactory, seedBase, warm) => {
    const runs = [];
    if (warm) { // UCB: erst Memory aufwärmen, dann auf frischen Seeds messen
      const mem = newMemory(); const p = policyFactory(mem);
      for (let i = 0; i < N; i++) runWithCurve(seed0 + i, p.policy, mem);
      for (let i = 0; i < N; i++) runs.push(runWithCurve(seedBase + i, p.policy, mem));
    } else {
      const p = policyFactory(null);
      for (let i = 0; i < N; i++) runs.push(runWithCurve(seed0 + i, p.policy, null));
    }
    return runs;
  };

  const report = (label, runs) => {
    const m = metrics(runs);
    console.log(`\n=== ${label} — ${N} Runs ===`);
    console.log(`  Endscore   p50 ${f(m.finalP50)}   p90 ${f(m.finalP90)}   (Spread p90/p50 ${(m.finalP90 / (m.finalP50 || 1)).toFixed(2)}×)`);
    console.log(`  Kumulativer Score-Anteil (Median-Run) — Cycle 10/20/30/34/40:`);
    console.log(`      ${[10, 20, 30, 34, 40].map((cc) => `${cc}:${pctS(m.cumShareMedian[cc])}`).join("   ")}`);
    const line = (name, d) => console.log(`  ${name.padEnd(16)} p10 ${pctS(d.p10).padStart(6)}   p50 ${pctS(d.p50).padStart(6)}   p90 ${pctS(d.p90).padStart(6)}`);
    line("Anteil bis C30", m.by30);
    line("Anteil letzte 10", m.last10);
    line("Anteil letzte 5", m.last5);
    console.log(`  Spike-Faktor     p10 ${m.spike.p10.toFixed(1)}×    p50 ${m.spike.p50.toFixed(1)}×    p90 ${m.spike.p90.toFixed(1)}×   (Ø-Cycle letzte 10 ÷ erste 34)`);
    console.log(`  „durch die Bank": ${pctS(m.lateHeavyShare)} der Runs holen >45 % in den letzten 10 Cycles`);
    return m;
  };

  // --factions 1 → Pacing JE FRAKTION (fraktions-biased) statt random+ucb; Mix als Referenz.
  if (arg("--factions", "")) {
    const payload = { mode: "pacing-factions", runs: N, seedFrom: seed0, cycles: CYCLES };
    for (const [label, target] of [["FEUER", "fire"], ["BLITZ", "lightning"], ["EIS", "ice"]])
      payload[target] = report(label, collect(() => ({ policy: factionPolicy(target) }), seed0, false));
    payload.mix = report("MIX (Random-Referenz)", collect(() => ({ policy: randomPolicy() }), seed0, false));
    write(payload);
    console.log(`\nHinweis: Ziel je Fraktion = „letzte 10" p50 ~30–33 % (Typ-Run nicht spät-lastig), by-C30 ≥ ~55 %.`);
    return payload;
  }

  const random = collect(() => ({ policy: randomPolicy() }), seed0, false);
  const ucb = collect(() => ({ policy: ucbPolicy({ c }) }), 10_000_000 + seed0, true);
  const payload = {
    mode: "pacing", runs: N, seedFrom: seed0, cycles: CYCLES,
    random: report("RANDOM (naiver Build)", random),
    ucb: report("UCB aufgewärmt (starke Builds)", ucb),
  };
  write(payload);
  console.log(`\nHinweis: Ziel = p50 „letzte 10" runter (Typ-Run flacher) + p90 darf hoch bleiben (gute Builds explodieren).`);
  return payload;
}
