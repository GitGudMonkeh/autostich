// Sim-Batch-Runner (S0). Spielt N Runs mit der Random-Baseline gegen den aktuellen Build
// und schreibt Aggregat + Roh-Runs als JSON.
//
//   npm run sim -- --runs 500 --seed 1 --out sim/out/random.json
//
// Bewusst OHNE Zeitstempel im Output → gleicher Seed-Satz erzeugt byte-gleiches JSON
// (Reproduzierbarkeit, docs/sim-harness-plan.md §9).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { runOne } from "./run.js";
import { randomPolicy } from "./policies/random.js";

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

const N = Number(arg("--runs", 200));
const seed0 = Number(arg("--seed", 1));
const out = arg("--out", "sim/out/random.json");

function quantile(sorted, q) {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
function stats(values) {
  const s = [...values].sort((a, b) => a - b);
  const sum = s.reduce((t, v) => t + v, 0);
  return {
    n: s.length,
    mean: s.length ? sum / s.length : 0,
    min: s[0] ?? 0,
    p50: quantile(s, 0.5),
    p90: quantile(s, 0.9),
    max: s[s.length - 1] ?? 0,
  };
}

// Per-Karte-Ledger über alle Runs zusammenziehen (S1). Bucketing nach Build-Fingerprint kommt in S2.
function aggregateCards(runs) {
  const acc = new Map();
  for (const r of runs) {
    for (const c of r.cards || []) {
      let a = acc.get(c.id);
      if (!a) { a = { id: c.id, suit: c.suit, appearances: 0, wins: 0, crits: 0, score: 0 }; acc.set(c.id, a); }
      a.appearances += c.appearances;
      a.wins += c.wins;
      a.crits += c.crits;
      a.score += c.score;
    }
  }
  const totalScore = [...acc.values()].reduce((s, a) => s + a.score, 0) || 1;
  return [...acc.values()]
    .map((a) => ({
      ...a,
      winrate: a.appearances ? a.wins / a.appearances : 0,
      critRate: a.wins ? a.crits / a.wins : 0,
      avgScorePerWin: a.wins ? a.score / a.wins : 0,
      scoreShare: a.score / totalScore,
    }))
    .sort((x, y) => y.scoreShare - x.scoreShare); // stärkste Score-Träger zuerst
}

const policy = randomPolicy();
const runs = [];
for (let i = 0; i < N; i++) runs.push(runOne(seed0 + i, policy));

const agg = {
  score: stats(runs.map((r) => r.score)),
  wins: stats(runs.map((r) => r.wins)),
  crits: stats(runs.map((r) => r.crits)),
  bestStreak: stats(runs.map((r) => r.bestStreak)),
  bestTrickScore: stats(runs.map((r) => r.bestTrickScore)),
  formationWinRate: stats(runs.map((r) => r.formationWinRate)),
};
const cardAgg = aggregateCards(runs);

// Roh-Runs ohne das schwere Per-Karte-Ledger schreiben (das steckt aggregiert in cardAgg).
const samples = runs.map(({ cards, ...rest }) => rest);
const payload = { policy: policy.name, runs: N, seedFrom: seed0, seedTo: seed0 + N - 1, agg, cardAgg, samples };
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(payload, null, 2));

const f = (x) => Math.round(x).toLocaleString("en-US");
const pct = (x) => `${(x * 100).toFixed(1)}%`;
console.log(`sim '${policy.name}': ${N} runs (seeds ${seed0}..${seed0 + N - 1})`);
console.log(`  score   median ${f(agg.score.p50)}  p90 ${f(agg.score.p90)}  mean ${f(agg.score.mean)}  [${f(agg.score.min)} .. ${f(agg.score.max)}]`);
console.log(`  wins    median ${f(agg.wins.p50)}   crits median ${f(agg.crits.p50)}   bestStreak median ${f(agg.bestStreak.p50)}   formation-wins ${pct(agg.formationWinRate.p50)}`);
const line = (c) => `    ${c.id.padEnd(4)} winrate ${pct(c.winrate).padStart(6)}  scoreShare ${pct(c.scoreShare).padStart(6)}  crit/win ${pct(c.critRate).padStart(6)}  avg/win ${f(c.avgScorePerWin)}`;
console.log(`  Karten — Top 5 nach Score-Anteil:`);
cardAgg.slice(0, 5).forEach((c) => console.log(line(c)));
const byWinrate = [...cardAgg].sort((a, b) => a.winrate - b.winrate);
console.log(`  Karten — schwächste 3 nach Winrate:`);
byWinrate.slice(0, 3).forEach((c) => console.log(line(c)));
console.log(`  → ${out}`);
