// Duell-Diagnose Feuer/Blitz (--mode duel): die Welt OHNE Eis und Pflanze (beide warten auf ihre Runde), damit die zwei
// umgebauten Fraktionen gegeneinander tariert werden können. Reine Fraktion je Ziel, der Slot-Split beider Ziele und
// die Random-Baseline — alle mit dem Archetyp-Allowlist-Haken (runOne opts.archetypes), greedy Aufstellung/Architekt.
// Die aktiven Sim-Regler stehen im Kopf, damit ein Sweep (`SIM_ION_SCORE_PER_STACK=15 npm run sim -- --mode duel`)
// seine Ausgabe selbst beschriftet.
import { runOne } from "./run.js";
import { randomPolicy } from "./policies/random.js";
import { factionPolicy } from "./policies/faction.js";
import { archetypeOf } from "../src/game/skills.js";
import * as C from "../src/game/constants.js";

const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
const median = (a) => quantile(a, 0.5);
const mean = (a) => a.reduce((t, v) => t + v, 0) / a.length;
const fmt = (n) => Math.round(n).toLocaleString("de-DE");
const NAME = { fire: "Feuer", lightning: "Blitz", ice: "Eis", plant: "Pflanze" };

export function measurePolicy(policy, runs, seed0, opts) {
  const results = Array.from({ length: runs }, (_, i) => runOne(seed0 + i, policy, null, null, opts));
  const scores = results.map((r) => r.score);
  const held = {};
  for (const a of opts.archetypes || []) held[a] = mean(results.map((r) => r.build.skills.filter((id) => archetypeOf(id) === a).length));
  return { median: median(scores), mean: mean(scores), p90: quantile(scores, 0.9), p95: quantile(scores, 0.95),
    winrate: mean(results.map((r) => r.wins / r.tricks)), held };
}

export function runDuel({ arg, seed0 } = {}) {
  const runs = Number((arg && arg("--runs", 200)) || 200);
  const arch = String((arg && arg("--arch", "fire,lightning")) || "fire,lightning").split(",").filter(Boolean);
  const opts = { archetypes: arch };
  const policies = arch.map((a) => [`${NAME[a] || a} mono`, factionPolicy(a)]);
  if (arch.length >= 2) policies.push([`${arch.map((a) => NAME[a] || a).join("+")} Split`, factionPolicy(arch)]);
  policies.push(["Mix (Random)", randomPolicy({ architectGreedy: true })]);
  console.log(`\n=== DUELL ${arch.map((a) => NAME[a] || a).join(" / ")} (${runs} Läufe, Seeds ${seed0}..${seed0 + runs - 1}) ===`);
  console.log(`  Regler: Stapel-Score ${C.ION_SCORE_PER_STACK} · Crit je Blitz-Skill ${C.LIGHTNING_CRIT_PER_SKILL} · Leiste ${C.LIGHTNING_MAX_CHARGE} · Hitze-Mult je 10 % ${C.HEAT_MULT_PER_10} · Hitze je Punkt ${C.HEAT_PER_POINT} · Kühlung ${C.HEAT_LOSS} · Sonnenkern ${C.SONNENKERN_SCORE_PER_BRAND}`);
  console.log(`  Build              Median      Mean        p90         p95      Siegquote  Ø Skills`);
  const rows = {};
  for (const [name, policy] of policies) {
    const r = measurePolicy(policy, runs, seed0, opts);
    rows[name] = r;
    const heldTxt = Object.entries(r.held).map(([a, n]) => `${(NAME[a] || a).slice(0, 2)} ${n.toFixed(1)}`).join(" ");
    console.log(`  ${name.padEnd(17)} ${fmt(r.median).padStart(10)} ${fmt(r.mean).padStart(10)} ${fmt(r.p90).padStart(11)} ${fmt(r.p95).padStart(11)}   ${(r.winrate * 100).toFixed(1).padStart(5)} %  ${heldTxt}`);
  }
  if (arch.length >= 2) {
    const a = rows[`${NAME[arch[0]] || arch[0]} mono`], b = rows[`${NAME[arch[1]] || arch[1]} mono`];
    console.log(`  Floor ${NAME[arch[0]] || arch[0]} ÷ ${NAME[arch[1]] || arch[1]}: ${(a.median / b.median).toFixed(2)}×   Mean: ${(a.mean / b.mean).toFixed(2)}×   p90: ${(a.p90 / b.p90).toFixed(2)}×`);
  }
  return rows;
}
