// ERKUNDUNG-Harness: „bank-then-pivot" vs. Mono vs. naiver Fixed-Split.
// Usage: node sim/pivot-explore.js [runs] [primary] [secondary]   (Default 50 plant lightning).
// ENV-Haken (SIM_COMMIT_EXP / SIM_PLANT_PASSIVE_MIN_SKILLS) wirken.
import { runOne } from "./run.js";
import { factionPolicy } from "./policies/faction.js";
import { pivotPolicy } from "./policies/pivot.js";
import { archetypeOf } from "../src/game/skills.js";

const RUNS = Number(process.argv[2] || 50);
const PRIMARY = process.argv[3] || "plant";
const SECONDARY = process.argv[4] || "lightning";
const SEED0 = 1;
const SHORT = { fire: "Fe", lightning: "Bl", ice: "Ei", plant: "Pf" };
const NAME = { fire: "Feuer", lightning: "Blitz", ice: "Eis", plant: "Pflanze" };
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
const fmt = (n) => Math.round(n).toLocaleString("de-DE");
const cnt = (skills, arch) => skills.filter((id) => archetypeOf(id) === arch).length;

function evalPolicy(label, policy) {
  const res = Array.from({ length: RUNS }, (_, i) => runOne(SEED0 + i, policy));
  const scores = res.map((r) => r.score);
  const med = quantile(scores, 0.5), p90 = quantile(scores, 0.9);
  const wr = res.reduce((t, r) => t + r.wins / r.tricks, 0) / RUNS;
  const pp = res.reduce((t, r) => t + cnt(r.build.skills, PRIMARY), 0) / RUNS;
  const ss = res.reduce((t, r) => t + cnt(r.build.skills, SECONDARY), 0) / RUNS;
  return { label, med, p90, wr, pp, ss };
}

const cfg = `COMMIT_EXP=${process.env.SIM_COMMIT_EXP || 1} · PLANT_PASSIVE_MIN=${process.env.SIM_PLANT_PASSIVE_MIN_SKILLS || 0}`;
console.log(`\n=== PIVOT ${NAME[PRIMARY]}→${NAME[SECONDARY]} (${RUNS} Runs) · ${cfg} ===`);

const P = PRIMARY, S = SECONDARY;
const rows = [
  evalPolicy(`Mono ${NAME[P]}`, factionPolicy(P)),
  evalPolicy(`Mono ${NAME[S]}`, factionPolicy(S)),
  evalPolicy(`Naiv ${SHORT[S]}+${SHORT[P]} (fixed)`, factionPolicy([S, P])),
  evalPolicy(`Pivot @18 keep4`, pivotPolicy(P, S, { pivotCycle: 18, keepPrimary: 4 })),
  evalPolicy(`Pivot @25 keep4`, pivotPolicy(P, S, { pivotCycle: 25, keepPrimary: 4 })),
  evalPolicy(`Pivot @32 keep4`, pivotPolicy(P, S, { pivotCycle: 32, keepPrimary: 4 })),
  evalPolicy(`Pivot @25 keep2`, pivotPolicy(P, S, { pivotCycle: 25, keepPrimary: 2 })),
];

const monoBest = Math.max(rows[0].med, rows[1].med);
console.log(`  Policy                     Median      p90        Winrate  Ø${SHORT[P]} Ø${SHORT[S]}  vs.bestMono`);
for (const r of rows) {
  console.log(`  ${r.label.padEnd(25)} ${fmt(r.med).padStart(10)} ${fmt(r.p90).padStart(10)}   ${(r.wr * 100).toFixed(1)}%   ${r.pp.toFixed(1)} ${r.ss.toFixed(1)}   ${(r.med / monoBest).toFixed(2)}×`);
}
console.log(`  (vs.bestMono = Median ÷ beste reine Fraktion = ${fmt(monoBest)}; >1,0× = schlägt Mono)`);
