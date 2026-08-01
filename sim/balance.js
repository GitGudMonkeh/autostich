// Balance-Diagnose A (cross-archetype): reine Fraktionen (fraktions-biased Policy) vs. Mix-Baseline über feste Seeds.
// Median/Mean-Score + Winrate + Ø gehaltene Fraktions-Skills. Apfel-zu-apfel: alle nutzen die normale Ökonomie
// (Perks/Stats/Shop/Formation über die Random-Baseline); nur die Skill-Wahl ist auf die Fraktion gebogen.
import { runOne } from "./run.js";
import { randomPolicy } from "./policies/random.js";
import { factionPolicy } from "./policies/faction.js";

const median = (a) => quantile(a, 0.5);
const mean = (a) => a.reduce((t, v) => t + v, 0) / a.length;
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
const fmt = (n) => Math.round(n).toLocaleString("de-DE");
const PREFIX = { "Feuer": "SK_FIRE", "Blitz": "SK_LIGHTNING", "Eis": "SK_ICE", "Pflanze": "SK_PLANT" };

export function runBalance({ arg, seed0 } = {}) {
  const runs = Number((arg && arg("--runs", 40)) || 40);
  const policies = { "Mix (Random)": randomPolicy(), "Feuer": factionPolicy("fire"), "Blitz": factionPolicy("lightning"), "Eis": factionPolicy("ice"), "Pflanze": factionPolicy("plant") };
  const rows = {};
  for (const [name, policy] of Object.entries(policies)) {
    const results = Array.from({ length: runs }, (_, i) => runOne(seed0 + i, policy));
    const scores = results.map((r) => r.score);
    const pfx = PREFIX[name] || "SK_";
    rows[name] = {
      median: median(scores), mean: mean(scores), p90: quantile(scores, 0.9), p95: quantile(scores, 0.95),
      winrate: mean(results.map((r) => r.wins / r.tricks)),
      skillsHeld: mean(results.map((r) => r.build.skills.filter((id) => id.startsWith(pfx)).length)),
    };
  }
  const baseMed = rows["Mix (Random)"].median;
  console.log(`\n=== BALANCE (fraktions-biased, ${runs} Runs, Seeds ${seed0}..${seed0 + runs - 1}) ===`);
  console.log("  Fraktion        Median(Floor)  vs.Mix   p90(Ceil)  p95     Winrate");
  for (const [name, r] of Object.entries(rows)) {
    console.log(`  ${name.padEnd(15)} ${fmt(r.median).padStart(9)}   ${(r.median / baseMed).toFixed(2) + "×"}   ${fmt(r.p90).padStart(9)} ${fmt(r.p95).padStart(9)}  ${(r.winrate * 100).toFixed(1).padStart(5)}%`);
  }
  const facMeds = ["Feuer", "Blitz", "Eis", "Pflanze"].map((n) => rows[n].median);
  const facP90 = ["Feuer", "Blitz", "Eis", "Pflanze"].map((n) => rows[n].p90);
  console.log(`  Spread reine Fraktionen — Floor(Median): ${(Math.max(...facMeds) / Math.min(...facMeds)).toFixed(2)}×   Ceiling(p90): ${(Math.max(...facP90) / Math.min(...facP90)).toFixed(2)}×`);
  return rows;
}
