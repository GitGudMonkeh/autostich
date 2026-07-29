// Slot-Analyse (4 vs 6): Skill-Variation + Skill-Viability im vollen Build-Kontext.
// Nutzt runOne (voller Run: Stats/Perks/Items/Formationen werden von der Policy mitgepickt) und wertet die
// finalen Builds aus. SIM_SKILL_SLOTS steuert die Slotzahl (am Modul-Import gebunden). Reiner Analyse-Report → stdout.
//   node analyze-slots.mjs <policy=random|ucb> <runs=4000>
import { runOne } from "./sim/run.js";
import { randomPolicy } from "./sim/policies/random.js";
import { ucbPolicy } from "./sim/policies/ucb.js";
import { newMemory } from "./sim/memory.js";
import { SKILL_DEFS, archetypeOf } from "./src/game/skills.js";
import { SKILL_SLOTS } from "./src/game/constants.js";

const policyName = process.argv[2] || "random";
const N = Number(process.argv[3] || 4000);

// Runs sammeln (UCB mit geteiltem Bandit-Gedächtnis wie im Explore-Modus; Random ohne).
const builds = [];
if (policyName === "ucb") {
  const mem = newMemory(); const pol = ucbPolicy({ c: 1.4 });
  for (let i = 0; i < N; i++) builds.push(runOne(1 + i, pol, mem));
} else {
  const pol = randomPolicy();
  for (let i = 0; i < N; i++) builds.push(runOne(1 + i, pol));
}

const ln = (x) => Math.log1p(Math.max(0, x));
const mean = (a) => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : 0);
const quant = (a, q) => { const s = [...a].sort((x, y) => x - y); const p = (s.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (p - lo); };
const ALL_SKILLS = Object.keys(SKILL_DEFS);

// ---- Score ----
const scores = builds.map((b) => b.score);
const score = { p50: Math.round(quant(scores, 0.5)), p90: Math.round(quant(scores, 0.9)), mean: Math.round(mean(scores)) };

// ---- Skill-VARIATION ----
const usage = new Map();          // skill -> Anzahl Runs, die ihn halten
const archMix = { 1: 0, 2: 0, 3: 0 }; // #distinkte Archetypen je Run
let slotsFilled = 0;
for (const b of builds) {
  slotsFilled += b.build.skills.length;
  const na = Math.min(3, Math.max(1, (b.build.archetypes || []).length || 1));
  archMix[na] += 1;
  for (const s of b.build.skills) usage.set(s, (usage.get(s) || 0) + 1);
}
const totalPicks = [...usage.values()].reduce((t, v) => t + v, 0);
const distinctUsed = [...usage.values()].filter((v) => v > 0).length;
// Normierte Usage-Entropie über ALLE Skills (Shares); 1 = maximal gleichverteilt, 0 = auf einen konzentriert.
const shares = ALL_SKILLS.map((s) => (usage.get(s) || 0) / (totalPicks || 1));
const H = -shares.filter((p) => p > 0).reduce((t, p) => t + p * Math.log(p), 0) / Math.log(ALL_SKILLS.length);
const sortedShares = [...shares].sort((a, b) => b - a);
const top5Share = sortedShares.slice(0, 5).reduce((t, v) => t + v, 0);
const variation = {
  avgSkillsPerRun: +(slotsFilled / builds.length).toFixed(2),
  distinctSkillsUsed: `${distinctUsed}/${ALL_SKILLS.length}`,
  usageEntropyNorm: +H.toFixed(3),
  top5UsageShare: +(top5Share * 100).toFixed(1),
  archetypeMixPct: { mono: +(100 * archMix[1] / builds.length).toFixed(1), dual: +(100 * archMix[2] / builds.length).toFixed(1), tri: +(100 * archMix[3] / builds.length).toFixed(1) },
};

// ---- Skill-VIABILITY: Inklusions-Lift = e^(Ø ln(1+score) MIT − OHNE) − 1, in % ----
const lnWith = new Map(); const lnAll = builds.map((b) => ln(b.score));
for (const s of ALL_SKILLS) lnWith.set(s, []);
for (const b of builds) { const l = ln(b.score); for (const s of new Set(b.build.skills)) lnWith.get(s).push(l); }
const sumLnAll = lnAll.reduce((t, v) => t + v, 0);
const viability = ALL_SKILLS.map((s) => {
  const w = lnWith.get(s); const n = w.length;
  if (n < 20) return { id: s, arch: archetypeOf(s), n, liftPct: null }; // zu wenig Daten
  const withMean = mean(w);
  const withoutMean = (sumLnAll - w.reduce((t, v) => t + v, 0)) / (builds.length - n);
  return { id: s, arch: archetypeOf(s), n, liftPct: +((Math.exp(withMean - withoutMean) - 1) * 100).toFixed(1) };
}).filter((r) => r.liftPct != null).sort((a, b) => b.liftPct - a.liftPct);
const positive = viability.filter((r) => r.liftPct > 0).length;

// ---- KONTEXT: Ø Stats + Formations-Sieg-Rate (verschieben 6 Slots die anderen Systeme?) ----
const avgStat = (f) => +mean(builds.map((b) => b.build.stats[f])).toFixed(2);
const context = {
  statCritChance: avgStat("critChance"), statCritMult: avgStat("critMult"), statFormMult: avgStat("formMult"),
  statStreakMult: avgStat("streakMult"), economy: avgStat("economy"),
  formationWinRatePct: +(100 * mean(builds.map((b) => b.formationWinRate))).toFixed(1),
  avgPerks: +mean(builds.map((b) => b.build.perks.length)).toFixed(1),
  critsMedian: Math.round(quant(builds.map((b) => b.crits), 0.5)),
};

console.log(JSON.stringify({ policy: policyName, slots: SKILL_SLOTS, runs: builds.length, score, variation, viabilityPositiveOfScored: `${positive}/${viability.length}`, viabilityTop8: viability.slice(0, 8), viabilityBottom6: viability.slice(-6), context }, null, 2));
