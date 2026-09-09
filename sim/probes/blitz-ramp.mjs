// When does the lightning engine come online? Per 10-round block over N runs: lightning skills held, crit chance on
// wins, crit rate, cumulative full bars, stack depth on the deck, and the share of wins whose played card actually
// carries a stack — the metric that says whether ionization pays. Plus milestones (round of the 1st/5th/10th bar,
// round the crit chance first crosses 25 %/50 %). Groups: all runs · runs WITHOUT a legendary · runs WITH one.
// The lightning-only world with the faction policy, like the other faction probes.
//
// Output stays German: these tables are pasted into docs/skill-rework.md, which is the owner's German document.
//
//   N=100 node sim/probes/blitz-ramp.mjs
//   N=100 SIM_LIGHTNING_CRIT_PER_SKILL=0.06 node sim/probes/blitz-ramp.mjs     # sweep a knob
//   N=100 SIM_LIGHTNING_CRIT_SOCKET=0.08 SIM_LIGHTNING_CRIT_PER_SKILL=0.03 \
//     node --import ./sim/probes/lightning-socket-hook.mjs sim/probes/blitz-ramp.mjs   # unbuilt socket variant
//
// Milestones are medians over the runs that REACH them, so a later milestone can read earlier than an earlier one
// when the slow runs drop out — the share in brackets is what says whether that happened.
// Reading rule: the per-block columns are direct observations and stable across seed sets. The MEDIAN SCORE is not —
// a changed crit chance flips other tricks to crits and the whole run runs differently (§7.28 F), and the
// "without legendary" group is not the same set of runs between variants. Compare the ramp, not the median.
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import { SKILL_LIST, archetypeOf, isLegendarySkill } from "../../src/game/skills.js";
import { BOARD_POSITIONS } from "../../src/game/constants.js";

const N = Number(process.env.N || 100);
const SEED0 = Number(process.env.SEED0 || 1);
const LEG = new Set(SKILL_LIST.filter((s) => s.legendary).map((s) => s.id));
const NB = 5; // blocks of 10 rounds

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const mean = (a) => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : 0);
const f = (x) => Math.round(x).toLocaleString("de-DE");

function oneRun(seed) {
  const B = Array.from({ length: NB }, () => ({ n: 0, wins: 0, crits: 0, chSum: 0, skillSum: 0, stackSum: 0, medSum: 0, ionCards: 0, winWithStack: 0, barsAt: 0 }));
  const ms = { ion1: null, bar1: null, bar5: null, bar10: null, ch25: null, ch50: null };
  let last = null;
  runOne(seed, factionPolicy("lightning"), null, { onTrick: (s) => {
    last = s;
    const cyc = s.cycle || 0;
    const b = B[Math.min(NB - 1, Math.floor(cyc / 10))];
    const bars = (s.lightning || {}).bars || 0;
    const arr = (s.deck || []).map((c) => c.ionStacks || 0);
    const stacks = arr.reduce((t, v) => t + v, 0);
    const sorted = [...arr].sort((x, y) => x - y);
    b.n += 1; b.barsAt = bars;
    b.skillSum += (s.skills || []).filter((id) => archetypeOf(id) === "lightning" && !isLegendarySkill(id)).length;
    b.stackSum += stacks; b.medSum += sorted[Math.floor(sorted.length / 2)] || 0;
    b.ionCards += arr.filter((v) => v > 0).length / (arr.length || 1);
    const t = s.lastTrick;
    if (t && (t.result === "win" || t.result === "win_tie")) {
      b.wins += 1; b.chSum += t.critChance || 0; if (t.isCrit) b.crits += 1;
      if (((t.pCard && t.pCard.ionStacks) || 0) > 0) b.winWithStack += 1;
      if (ms.ch25 == null && (t.critChance || 0) >= 0.25) ms.ch25 = cyc + 1;
      if (ms.ch50 == null && (t.critChance || 0) >= 0.5) ms.ch50 = cyc + 1;
    }
    if (ms.ion1 == null && stacks > 0) ms.ion1 = cyc + 1;
    if (ms.bar1 == null && bars >= 1) ms.bar1 = cyc + 1;
    if (ms.bar5 == null && bars >= 5) ms.bar5 = cyc + 1;
    if (ms.bar10 == null && bars >= 10) ms.bar10 = cyc + 1;
  } }, { archetypes: ["lightning"] });
  const deckStacks = (last.deck || []).map((c) => c.ionStacks || 0);
  return { score: last.score, B, ms, bars: (last.lightning || {}).bars || 0,
    held: (last.skills || []).filter((id) => archetypeOf(id) === "lightning" && !isLegendarySkill(id)).length,
    leg: (last.skills || []).some((id) => LEG.has(id)),
    sumStacks: deckStacks.reduce((t, v) => t + v, 0), maxStacks: Math.max(0, ...deckStacks) };
}

const rows = Array.from({ length: N }, (_, i) => oneRun(SEED0 + i));

function table(label, pool) {
  if (!pool.length) return;
  console.log(`\n=== ${label} (${pool.length} Läufe) — Median-Score ${f(median(pool.map((r) => r.score)))} ===`);
  console.log(`  Runden   Blitz-Skills   Ø Crit-Chance   Crit-Quote   Leisten kumuliert   Ø Stapel/Karte   Median-Karte   ionisiert   Siege mit Stapel`);
  for (let k = 0; k < NB; k++) {
    const bs = pool.map((r) => r.B[k]).filter((b) => b.n > 0);
    if (!bs.length) continue;
    const w = bs.filter((b) => b.wins);
    const cell = [
      mean(bs.map((b) => b.skillSum / b.n)).toFixed(1).padStart(10),
      `${(mean(w.map((b) => b.chSum / b.wins)) * 100).toFixed(1).padStart(12)} %`,
      `${(mean(w.map((b) => b.crits / b.wins)) * 100).toFixed(1).padStart(9)} %`,
      String(median(bs.map((b) => b.barsAt))).padStart(15),
      (mean(bs.map((b) => b.stackSum / b.n)) / BOARD_POSITIONS).toFixed(1).padStart(13),
      mean(bs.map((b) => b.medSum / b.n)).toFixed(1).padStart(12),
      `${(mean(bs.map((b) => b.ionCards / b.n)) * 100).toFixed(0).padStart(8)} %`,
      `${(mean(w.map((b) => b.winWithStack / b.wins)) * 100).toFixed(0).padStart(15)} %`,
    ];
    console.log(`  ${String(k * 10 + 1).padStart(2)}–${String(k * 10 + 10).padStart(2)}  ${cell.join("   ")}`);
  }
  const at = (key) => { const v = pool.map((r) => r.ms[key]).filter((x) => x != null); return v.length ? `${median(v)} (${Math.round((v.length / pool.length) * 100)} %)` : "nie"; };
  console.log(`  Meilensteine (Median-Runde, in Klammern der Anteil der Läufe, die ihn erreichen):`);
  console.log(`    1. Ionisierung ${at("ion1")} · 1. Leiste ${at("bar1")} · 5. Leiste ${at("bar5")} · 10. Leiste ${at("bar10")} · Crit-Chance ≥ 25 % ${at("ch25")} · ≥ 50 % ${at("ch50")}`);
  console.log(`  Laufende: Ø ${mean(pool.map((r) => r.bars)).toFixed(1)} Leisten · Ø ${mean(pool.map((r) => r.sumStacks)).toFixed(1)} Stapel auf dem Deck · tiefste Karte Ø ${mean(pool.map((r) => r.maxStacks)).toFixed(1)} · Ø ${mean(pool.map((r) => r.held)).toFixed(1)} Blitz-Skills`);
}

table("Alle Läufe", rows);
table("OHNE Legendäres", rows.filter((r) => !r.leg));
table("MIT Legendärem", rows.filter((r) => r.leg));
console.log(`\nLegendär-Quote: ${Math.round((rows.filter((r) => r.leg).length / rows.length) * 100)} % der Läufe`);
