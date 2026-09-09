// When does a faction start earning? Median score after rounds 10/20/30/40/50 and its share of the final score, per
// faction (mono world, faction policy), split by whether the run ended up holding a legendary. Two readings:
// the share column says how back-loaded a faction is, the "mit ÷ ohne" line how much it leans on a legendary.
//
// Output stays German: these tables are pasted into docs/skill-rework.md, which is the owner's German document.
//
//   N=60 node sim/probes/faction-pacing.mjs
//
// Reading rule: the legendary split is OBSERVED, not paired — the group is whoever happened to be offered and take
// one. For a paired number use `npm run sim -- --mode legendaries`.
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import { SKILL_LIST } from "../../src/game/skills.js";
import { MAX_CYCLES } from "../../src/game/constants.js";

const N = Number(process.env.N || 60);
const SEED0 = Number(process.env.SEED0 || 1);
const LEG = new Set(SKILL_LIST.filter((s) => s.legendary).map((s) => s.id));
const MARKS = [10, 20, 30, 40, MAX_CYCLES];
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const f = (x) => Math.round(x).toLocaleString("de-DE");

function oneRun(arch, seed) {
  const at = {};
  let last = null;
  runOne(seed, factionPolicy(arch), null, { onTrick: (s) => { last = s; const c = s.cycle || 0; if (MARKS.includes(c)) at[c] = at[c] ?? s.score; } }, { archetypes: [arch] });
  at[MAX_CYCLES] = last.score;
  return { score: last.score, at, leg: (last.skills || []).some((id) => LEG.has(id)) };
}

function row(label, rows) {
  if (!rows.length) return;
  const end = median(rows.map((r) => r.score)) || 1;
  const cells = MARKS.map((m) => { const v = median(rows.map((r) => r.at[m] ?? r.score)); return `${f(v).padStart(14)} (${((v / end) * 100).toFixed(1).padStart(5)} %)`; });
  console.log(`  ${label.padEnd(22)} ${cells.join("  ")}`);
}

console.log(`Score-Stand nach Runde (Median über ${N} Läufe, in Klammern der Anteil am Endscore)`);
console.log(`  ${"".padEnd(22)} ${MARKS.map((m) => `nach Runde ${String(m).padEnd(11)}`).join(" ")}`);
for (const arch of ["fire", "lightning", "ice", "plant"]) {
  const rows = Array.from({ length: N }, (_, i) => oneRun(arch, SEED0 + i));
  const wo = rows.filter((r) => !r.leg), wi = rows.filter((r) => r.leg);
  row(arch, rows); row("  ohne Legendäres", wo); row("  mit Legendärem", wi);
  console.log(`    Legendär-Quote ${Math.round((wi.length / rows.length) * 100)} % · Median mit ÷ ohne = ${wo.length && wi.length ? (median(wi.map((r) => r.score)) / median(wo.map((r) => r.score))).toFixed(1) : "—"}×`);
}
