// Eval-Modus (Sim S3): das EIGENTLICHE Urteil per paarweiser Ablation (docs/sim-harness-plan.md §6/§7).
//
// Ablauf:
//  1) EXPLORE (eigenes memory, eigene Seeds) → leitet aus den Top-Armen einen Priority-Build ab.
//  2) EVAL (KEIN memory, feste Policy, FRISCHE Seeds): `fixed(priority)` vs. `fixed(priority, {drop:id})`,
//     gepaart auf denselben Seeds → Marginalbeitrag jeder Top-Option = Σ(full − dropped)/n.
//
// Explore- und Eval-Seeds sind disjunkt (kein Feedback-Bias): mit denselben Runs steuern UND urteilen
// verzerrt. UCB-Means finden Kandidaten, die Ablation urteilt. `computeEval` ist rein/testbar; `runEval`
// hängt nur Konsolen-Report + JSON-Schreiben dran.
import { runOne } from "./run.js";
import { ucbPolicy } from "./policies/ucb.js";
import { newMemory } from "./memory.js";
import { fixedPolicy } from "./policies/fixed.js";

const MIN_N = 5;
const DECLINE = "__decline__";

function quantile(xs, q) {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return 0;
  const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
function meanStd(xs) {
  const n = xs.length;
  const mean = n ? xs.reduce((t, v) => t + v, 0) / n : 0;
  const varr = n > 1 ? xs.reduce((t, v) => t + (v - mean) ** 2, 0) / (n - 1) : 0;
  const std = Math.sqrt(varr);
  return { n, mean, std, ci95: n ? 1.96 * (std / Math.sqrt(n)) : 0 };
}

// Rein: liefert Priority-Build + Full-Score-Verteilung + Marginalwerte. Deterministisch (Seed-Sequenz).
export function computeEval({ seed0 = 1, exploreRuns = 1500, evalRuns = 300, topK = 6, c = 1.4 } = {}) {
  // 1) EXPLORE → Priority-Build (bestes mean je id über die Buckets, nur ausreichend gesampelt).
  const mem = newMemory();
  const explorePol = ucbPolicy({ c });
  for (let i = 0; i < exploreRuns; i++) runOne(seed0 + i, explorePol, mem);
  const bestById = new Map();
  for (const kind of ["stat", "perk", "skill"]) {
    for (const r of mem.ranking(kind)) {
      if (r.n < MIN_N || r.id === DECLINE) continue;
      const cur = bestById.get(r.id);
      if (!cur || r.mean > cur.mean) bestById.set(r.id, { id: r.id, kind, mean: r.mean, n: r.n });
    }
  }
  const ranked = [...bestById.values()].sort((a, b) => b.mean - a.mean);
  const priority = ranked.map((x) => x.id);

  // 2) EVAL auf frischen, disjunkten Seeds. full einmal, dann je Top-K-Option gepaart ablatieren.
  const evalSeed0 = seed0 + exploreRuns;
  const full = fixedPolicy(priority);
  const fullScores = [];
  for (let i = 0; i < evalRuns; i++) fullScores.push(runOne(evalSeed0 + i, full).score);

  const marginals = ranked.slice(0, topK).map((t) => {
    const abl = fixedPolicy(priority, { drop: t.id });
    const deltas = [];
    for (let i = 0; i < evalRuns; i++) deltas.push(fullScores[i] - runOne(evalSeed0 + i, abl).score);
    return { id: t.id, kind: t.kind, exploreMean: t.mean, exploreN: t.n, marginal: meanStd(deltas) };
  });
  marginals.sort((a, b) => b.marginal.mean - a.marginal.mean);

  const fullScore = { n: fullScores.length, mean: meanStd(fullScores).mean, p50: quantile(fullScores, 0.5), p90: quantile(fullScores, 0.9) };
  return { exploreRuns, evalRuns, c, evalSeed0, priority, fullScore, marginals };
}

export function runEval({ arg, seed0, c, f, write }) {
  const res = computeEval({
    seed0,
    exploreRuns: Number(arg("--explore", 1500)),
    evalRuns: Number(arg("--runs", 300)),
    topK: Number(arg("--ablate", 6)),
    c,
  });
  console.log(`sim 'eval': explore ${res.exploreRuns} (seeds ${seed0}..${seed0 + res.exploreRuns - 1}), eval ${res.evalRuns} (seeds ${res.evalSeed0}..${res.evalSeed0 + res.evalRuns - 1}), c=${c}`);
  console.log(`  fixed(priority) full-score: median ${f(res.fullScore.p50)}  mean ${f(res.fullScore.mean)}  p90 ${f(res.fullScore.p90)}`);
  console.log(`  Priority-Build (Top 10 nach explore-mean): ${res.priority.slice(0, 10).join(", ")}`);
  console.log(`  Marginalbeitrag (full − ohne Option, gepaart; ± 95%-CI):`);
  for (const m of res.marginals) {
    const sig = Math.abs(m.marginal.mean) > m.marginal.ci95 ? "" : "  (n.s.)";
    console.log(`    ${m.id.padEnd(16)} ${m.kind.padEnd(6)}  Δ ${f(m.marginal.mean).padStart(12)} ± ${f(m.marginal.ci95).padStart(10)}${sig}`);
  }
  write(res);
}
