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
const SENTINELS = new Set(["__decline__"]); // Nicht-Wahl-Arme gehören nicht in den Priority-Build

function quantile(xs, q) {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return 0;
  const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
function mean(xs) { return xs.length ? xs.reduce((t, v) => t + v, 0) / xs.length : 0; }
function meanStd(xs) {
  const n = xs.length, m = mean(xs);
  const varr = n > 1 ? xs.reduce((t, v) => t + (v - m) ** 2, 0) / (n - 1) : 0;
  return { n, mean: m, ci95: n ? 1.96 * (Math.sqrt(varr) / Math.sqrt(n)) : 0 };
}

// Heavy-tail-robuste Marginal-Statistik aus gepaarten Läufen (full vs. dropped je Seed).
// TIE-BEWUSST: delta==0 heißt bit-identischer Run → die Option kam gar nicht ins Spiel (nicht angeboten/
// nicht gewählt). Solche No-op-Seeds würden Median/win% verwässern, daher werden Kennzahlen BEDINGT auf die
// „applicable" Läufe (delta≠0) berechnet — der Effekt, WENN die Option im Spiel ist.
//  - applicableRate: Anteil Läufe, in denen das Weglassen etwas geändert hat (Kontext-Häufigkeit)
//  - winRate: unter den applicable Läufen der Anteil full>dropped (Vorzeichen-Test, magnitude-immun)
//  - median: Median-Δ unter den applicable Läufen (robuster Effekt, wenn im Spiel)
//  - pctEffect: exp(median(log(full/dropped))) − 1 über applicable = typischer MULTIPLIKATIVER Effekt
//  - mean/ci95: über ALLE Läufe, nur zum Vergleich (das rausch-anfällige alte Maß)
export function robustDelta(deltas, ratios) {
  const n = deltas.length;
  const wins = deltas.filter((d) => d > 0).length;
  const losses = deltas.filter((d) => d < 0).length;
  const applicable = wins + losses;
  const nzDeltas = deltas.filter((d) => d !== 0);
  const nzRatios = ratios.filter((_, i) => deltas[i] !== 0);
  return {
    n,
    applicableRate: n ? applicable / n : 0,
    winRate: applicable ? wins / applicable : 0, // bedingt auf applicable
    median: quantile(nzDeltas.length ? nzDeltas : [0], 0.5),
    pctEffect: Math.exp(quantile(nzRatios.length ? nzRatios : [0], 0.5)) - 1,
    mean: mean(deltas),
    ci95: meanStd(deltas).ci95,
  };
}

// EXPLORE-Schritt (S2) als eigene Einheit: spielt `exploreRuns` UCB-Läufe und leitet daraus die nach Stärke
// geordnete Options-Rangliste ab. Geteilt von computeEval (S3) und perk-impact.mjs (Legendär-Messung) → EINE
// Quelle für „was ist ein realistischer Referenz-Build", kein Drift zwischen den beiden Werkzeugen.
export function explorePriority({ seed0 = 1, exploreRuns = 1500, c = 1.4, env = {} } = {}) {
  const mem = newMemory();
  // Explore optimiert die Aufstellung mit, wenn env.solveFormations (faire Bewertung von Eis & Co.).
  const explorePol = ucbPolicy({ c, solveFormations: !!env.solveFormations });
  for (let i = 0; i < exploreRuns; i++) runOne(seed0 + i, explorePol, mem);
  // #267: die Arme sind je (kind, id, bucket) geführt → ein id verteilt sein n auf mehrere Buckets. Früher trugen die
  // Stat-Arme (grober Bucket, jede Stat-Runde dieselben 4 ids) den hohen n; ohne Stats erreicht kein einzelner
  // Perk-/Skill-Bucket mehr MIN_N. Daher n JE ID über die Buckets AGGREGIEREN (Gate), den besten Bucket-Mittelwert behalten.
  const byId = new Map();
  for (const kind of ["perk", "skill"]) {
    for (const r of mem.ranking(kind)) {
      if (SENTINELS.has(r.id)) continue;
      const cur = byId.get(r.id);
      if (!cur) byId.set(r.id, { id: r.id, kind, mean: r.mean, n: r.n });
      else { cur.n += r.n; if (r.mean > cur.mean) cur.mean = r.mean; }
    }
  }
  const ranked = [...byId.values()].filter((x) => x.n >= MIN_N).sort((a, b) => b.mean - a.mean);
  return { ranked, priority: ranked.map((x) => x.id) };
}

// Rein: liefert Priority-Build + Full-Score-Verteilung + Marginalwerte. Deterministisch (Seed-Sequenz).
// env = { solveFormations, buyShop } geht identisch in full UND ablatierte Policy (faire gepaarte Umgebung).
export function computeEval({ seed0 = 1, exploreRuns = 1500, evalRuns = 300, topK = 6, c = 1.4, env = {} } = {}) {
  // 1) EXPLORE → Priority-Build (bestes mean je id über die Buckets, nur ausreichend gesampelt).
  const { ranked, priority } = explorePriority({ seed0, exploreRuns, c, env });

  // 2) EVAL auf frischen, disjunkten Seeds. full einmal, dann je Top-K-Option gepaart ablatieren.
  const evalSeed0 = seed0 + exploreRuns;
  const full = fixedPolicy(priority, { ...env });
  const fullScores = [];
  for (let i = 0; i < evalRuns; i++) fullScores.push(runOne(evalSeed0 + i, full).score);

  const marginals = ranked.slice(0, topK).map((t) => {
    const abl = fixedPolicy(priority, { ...env, drop: t.id });
    const deltas = [], ratios = [];
    for (let i = 0; i < evalRuns; i++) {
      const dScore = runOne(evalSeed0 + i, abl).score;
      deltas.push(fullScores[i] - dScore);
      ratios.push(Math.log(Math.max(1, fullScores[i]) / Math.max(1, dScore))); // Log-Verhältnis (clamp gegen 0)
    }
    return { id: t.id, kind: t.kind, exploreMean: t.mean, exploreN: t.n, marginal: robustDelta(deltas, ratios) };
  });
  marginals.sort((a, b) => b.marginal.median - a.marginal.median); // nach ROBUSTEM Zentralwert

  const fullScore = { n: fullScores.length, mean: mean(fullScores), p50: quantile(fullScores, 0.5), p90: quantile(fullScores, 0.9) };
  return { exploreRuns, evalRuns, c, evalSeed0, priority, fullScore, marginals };
}

export function runEval({ arg, seed0, c, f, write }) {
  const res = computeEval({
    seed0,
    exploreRuns: Number(arg("--explore", 1500)),
    evalRuns: Number(arg("--runs", 300)),
    topK: Number(arg("--ablate", 6)),
    c,
    // buyShop default AN (Shop-Items sind jetzt Teil des Build & werden ablatiert); --shop 0 schaltet ab.
    // solveFormations default AUS (O(n²)-Solver, --formations 1 aktiviert).
    env: { solveFormations: arg("--formations", "0") === "1", buyShop: arg("--shop", "1") !== "0" },
  });
  console.log(`sim 'eval': explore ${res.exploreRuns} (seeds ${seed0}..${seed0 + res.exploreRuns - 1}), eval ${res.evalRuns} (seeds ${res.evalSeed0}..${res.evalSeed0 + res.evalRuns - 1}), c=${c}`);
  console.log(`  fixed(priority) full-score: median ${f(res.fullScore.p50)}  mean ${f(res.fullScore.mean)}  p90 ${f(res.fullScore.p90)}`);
  console.log(`  Priority-Build (Top 10 nach explore-mean): ${res.priority.slice(0, 10).join(", ")}`);
  console.log(`  Marginalbeitrag, ROBUST & bedingt auf „im Spiel" (gepaart je Seed) — sortiert nach Median-Δ:`);
  console.log(`    ${"id".padEnd(16)} ${"kind".padEnd(6)}  ${"Median-Δ".padStart(12)}  ${"win%".padStart(5)}  ${"typ.%".padStart(6)}  ${"anwendb.".padStart(8)}   ${"[mean-Δ]".padStart(12)}`);
  for (const m of res.marginals) {
    const mg = m.marginal;
    const tag = mg.applicableRate < 0.05 ? "  (selten)" : mg.winRate >= 0.6 ? "" : mg.winRate <= 0.4 ? " (schadet)" : "  (neutral)";
    console.log(`    ${m.id.padEnd(16)} ${m.kind.padEnd(6)}  ${f(mg.median).padStart(12)}  ${(mg.winRate * 100).toFixed(0).padStart(4)}%  ${(mg.pctEffect * 100).toFixed(0).padStart(5)}%  ${(mg.applicableRate * 100).toFixed(0).padStart(7)}%   ${f(mg.mean).padStart(12)}${tag}`);
  }
  write(res);
}
