// Sim-Batch-Runner. Modi:
//   npm run sim -- --mode baseline --runs 500 --seed 1     Random-Baseline: Score-Aggregat + Per-Karte-Ledger
//   npm run sim -- --mode explore  --runs 2000 --seed 1    UCB-Explore: Coverage + Stärke-Rangliste je Option
//   npm run sim -- --mode eval     --runs 300 --explore 1500  Fixed-Policy + paarweise Ablation → Marginalwerte
//   npm run sim -- --mode pacing   --runs 400                 Score-Verteilung über die 44 Cycles (Early/Mid/Late-Balance)
//
// Bewusst OHNE Zeitstempel im Output → gleicher Seed-Satz erzeugt byte-gleiches JSON (Reproduzierbarkeit, §9).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { runOne } from "./run.js";
import { randomPolicy } from "./policies/random.js";
import { ucbPolicy } from "./policies/ucb.js";
import { newMemory } from "./memory.js";

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

const mode = arg("--mode", "baseline");
const N = Number(arg("--runs", 200));
const seed0 = Number(arg("--seed", 1));
const c = Number(arg("--c", 1.4));
const out = arg("--out", `sim/out/${mode}.json`);

function quantile(sorted, q) {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
function stats(values) {
  const s = [...values].sort((a, b) => a - b);
  const sum = s.reduce((t, v) => t + v, 0);
  return { n: s.length, mean: s.length ? sum / s.length : 0, min: s[0] ?? 0, p50: quantile(s, 0.5), p90: quantile(s, 0.9), max: s[s.length - 1] ?? 0 };
}

const f = (x) => Math.round(x).toLocaleString("en-US");
const pct = (x) => `${(x * 100).toFixed(1)}%`;
function write(payload) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log(`  → ${out}`);
}

// ---- Baseline (S0/S1): Random-Policy, Score-Aggregat + Per-Karte-Ledger ----
function aggregateCards(runs) {
  const acc = new Map();
  for (const r of runs) for (const cd of r.cards || []) {
    let a = acc.get(cd.id);
    if (!a) { a = { id: cd.id, suit: cd.suit, appearances: 0, wins: 0, crits: 0, score: 0 }; acc.set(cd.id, a); }
    a.appearances += cd.appearances; a.wins += cd.wins; a.crits += cd.crits; a.score += cd.score;
  }
  const totalScore = [...acc.values()].reduce((s, a) => s + a.score, 0) || 1;
  return [...acc.values()]
    .map((a) => ({ ...a, winrate: a.appearances ? a.wins / a.appearances : 0, critRate: a.wins ? a.crits / a.wins : 0, avgScorePerWin: a.wins ? a.score / a.wins : 0, scoreShare: a.score / totalScore }))
    .sort((x, y) => y.scoreShare - x.scoreShare);
}

function runBaseline() {
  const policy = randomPolicy();
  const runs = [];
  for (let i = 0; i < N; i++) runs.push(runOne(seed0 + i, policy));
  const agg = {
    score: stats(runs.map((r) => r.score)), wins: stats(runs.map((r) => r.wins)), crits: stats(runs.map((r) => r.crits)),
    bestStreak: stats(runs.map((r) => r.bestStreak)), bestTrickScore: stats(runs.map((r) => r.bestTrickScore)), formationWinRate: stats(runs.map((r) => r.formationWinRate)),
  };
  const cardAgg = aggregateCards(runs);
  const samples = runs.map(({ cards, ...rest }) => rest);
  console.log(`sim 'random': ${N} runs (seeds ${seed0}..${seed0 + N - 1})`);
  console.log(`  score   median ${f(agg.score.p50)}  p90 ${f(agg.score.p90)}  mean ${f(agg.score.mean)}  [${f(agg.score.min)} .. ${f(agg.score.max)}]`);
  console.log(`  wins    median ${f(agg.wins.p50)}   crits median ${f(agg.crits.p50)}   bestStreak median ${f(agg.bestStreak.p50)}   formation-wins ${pct(agg.formationWinRate.p50)}`);
  const line = (cd) => `    ${cd.id.padEnd(4)} winrate ${pct(cd.winrate).padStart(6)}  scoreShare ${pct(cd.scoreShare).padStart(6)}  crit/win ${pct(cd.critRate).padStart(6)}  avg/win ${f(cd.avgScorePerWin)}`;
  console.log(`  Karten — Top 5 nach Score-Anteil:`);
  cardAgg.slice(0, 5).forEach((cd) => console.log(line(cd)));
  console.log(`  Karten — schwächste 3 nach Winrate:`);
  [...cardAgg].sort((a, b) => a.winrate - b.winrate).slice(0, 3).forEach((cd) => console.log(line(cd)));
  // Formations-Häufigkeit (naives Spiel = natürliche Auftrittsrate je Typ → „wie leicht per Zufall").
  const ftypes = {};
  let anyRate = 0;
  for (const r of runs) {
    anyRate += r.formations.anyRate;
    for (const [t, v] of Object.entries(r.formations.types)) ftypes[t] = (ftypes[t] || 0) + v;
  }
  anyRate /= N;
  const freq = Object.entries(ftypes).map(([type, sum]) => ({ type, rate: sum / N })).sort((a, b) => b.rate - a.rate);
  console.log(`  Formations-Häufigkeit (naiv, Anteil gespielter Positionen mit Typ) — ${pct(anyRate)} irgendeine:`);
  freq.forEach((f) => console.log(`    ${f.type.padEnd(16)} ${pct(f.rate).padStart(6)}`));
  write({ policy: "random", runs: N, seedFrom: seed0, seedTo: seed0 + N - 1, agg, cardAgg, formationFreq: { anyRate, types: freq }, samples });
}

// ---- Explore (S2): UCB + geteiltes memory → Coverage + Rangliste je Option ----
const MIN_N = 5; // Arme mit weniger Ziehungen gelten als untergesampelt
function runExplore() {
  const mem = newMemory();
  const policy = ucbPolicy({ c });
  const scores = [];
  for (let i = 0; i < N; i++) scores.push(runOne(seed0 + i, policy, mem).score);
  const rankings = { stat: mem.ranking("stat"), perk: mem.ranking("perk"), skill: mem.ranking("skill"), shopitem: mem.ranking("shopitem") };
  const scoreAgg = stats(scores);
  console.log(`sim 'ucb' explore: ${N} runs (seeds ${seed0}..${seed0 + N - 1}), c=${c}`);
  console.log(`  score   median ${f(scoreAgg.p50)}  p90 ${f(scoreAgg.p90)}  mean ${f(scoreAgg.mean)}`);
  const row = (r) => `    ${r.id.padEnd(16)} ${String(r.bucket).padEnd(14)} n=${String(r.n).padStart(4)}  mean ${r.mean.toFixed(3)}`;
  for (const kind of ["stat", "perk", "skill", "shopitem"]) {
    const rows = rankings[kind];
    const confident = rows.filter((r) => r.n >= MIN_N); // nur ausreichend gesampelte Arme sind aussagekräftig
    const under = rows.length - confident.length;
    console.log(`  ${kind} — ${rows.length} Arme (${under} untergesampelt, n<${MIN_N}); Top 6 (n≥${MIN_N}) nach mean:`);
    confident.slice(0, 6).forEach((r) => console.log(row(r)));
    if (confident.length > 6) { console.log(`  ${kind} — schwächste 3 (n≥${MIN_N}):`); confident.slice(-3).forEach((r) => console.log(row(r))); }
  }
  write({ mode: "explore", runs: N, seedFrom: seed0, seedTo: seed0 + N - 1, c, minN: MIN_N, scoreAgg, rankings });
}

if (mode === "baseline") runBaseline();
else if (mode === "explore") runExplore();
else if (mode === "eval") {
  const { runEval } = await import("./eval.js"); // S3: lazy, damit baseline/explore ohne eval.js laufen
  runEval({ arg, seed0, c, f, write });
} else if (mode === "pacing") {
  const { runPacing } = await import("./pacing.js"); // S6: lazy, wie eval
  runPacing({ arg, seed0, c, f, write });
} else if (mode === "balance") {
  const { runBalance } = await import("./balance.js"); // Balance-Diagnose A (reine Fraktionen vs. Mix)
  runBalance({ arg, seed0 });
} else { console.error(`Unbekannter --mode '${mode}' (baseline|explore|eval|pacing|balance)`); process.exit(1); }
