// How ionized is the card you actually WIN with? That number sets the decay of the reworked SK_LIGHTNING_07
// (§7.60: "+S % crit chance on a win, minus D per stack on the played card"). Everything else about the skill is
// decided; the decay is the one knob that needs the real distribution, because it decides in which round the skill
// switches itself off — too slow and it pushes past the 100 % clamp late, where every point over becomes crit
// MULTIPLIER (OVERCRIT_MULT_PER_PP), which is not what a cold-start skill is for.
//
// Per 10-round block, over the wins of N runs: mean / median / p75 / p90 stacks on the played card, raw and
// EFFECTIVE (Kurzschluss counts stacks above its threshold twice — Lichtbogen reads the effective number, so the
// decay would too). Then the derived table that is the actual question: for S = 40 and a few candidate decay rates,
// how much of the bonus survives per block, and on what share of wins it is still alive at all.
//
// Output stays German: these tables are pasted into docs/skill-rework.md, which is the owner's German document.
//
//   N=60 node sim/probes/zuendspannung.mjs
//   N=60 S=50 node sim/probes/zuendspannung.mjs      # size the epic tier instead
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import { effectiveStacks } from "../../src/game/factions/lightning.js";

const N = Number(process.env.N || 60);
const SEED0 = Number(process.env.SEED0 || 1);
const S = Number(process.env.S || 40);          // start value of the crit-chance bonus, in points
const DECAYS = (process.env.D || "3,4,5,6").split(",").map(Number);
const NB = 5;                                    // blocks of 10 rounds

const mean = (a) => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : 0);
const q = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

// Stacks on the played card of every WIN, bucketed by 10-round block. Crit only resolves on a win (the crit roll
// sits in the win branch of resolveTrick), so a loss carries no bonus and must not dilute the mean.
function oneRun(seed) {
  const raw = Array.from({ length: NB }, () => []);
  const eff = Array.from({ length: NB }, () => []);
  runOne(seed, factionPolicy("lightning"), null, { onTrick: (s) => {
    const t = s.lastTrick;
    if (!t || (t.result !== "win" && t.result !== "win_tie")) return;
    const k = Math.min(NB - 1, Math.floor((s.cycle || 0) / 10));
    raw[k].push(t.pCard?.ionStacks || 0);
    eff[k].push(effectiveStacks(t.pCard, s.skills || [], s.skillTiers || {}));
  } }, { archetypes: ["lightning"] });
  return { raw, eff };
}

const rows = Array.from({ length: N }, (_, i) => oneRun(SEED0 + i));
const pool = (pick) => Array.from({ length: NB }, (_, k) => rows.flatMap((r) => pick(r)[k]));
const RAW = pool((r) => r.raw), EFF = pool((r) => r.eff);

console.log(`\n=== Stapel auf der GESPIELTEN Karte bei Sieg (${N} Läufe, Blitz-Welt) ===`);
console.log(`  Runden   Siege   Ø roh   Median   p75   p90   Ø wirksam   Anteil ohne Stapel`);
for (let k = 0; k < NB; k++) {
  const a = RAW[k]; if (!a.length) continue;
  const cell = [
    String(a.length).padStart(6),
    mean(a).toFixed(1).padStart(6),
    String(q(a, 0.5)).padStart(7),
    String(q(a, 0.75)).padStart(5),
    String(q(a, 0.9)).padStart(5),
    mean(EFF[k]).toFixed(1).padStart(10),
    `${((a.filter((v) => v === 0).length / a.length) * 100).toFixed(0).padStart(15)} %`,
  ];
  console.log(`  ${String(k * 10 + 1).padStart(2)}–${String(k * 10 + 10).padStart(2)}  ${cell.join("  ")}`);
}

/* Die eigentliche Frage: was bleibt vom Satz übrig? Gerechnet wird auf den WIRKSAMEN Stapeln (wie Lichtbogen).
   „Ø Rest" ist der Mittelwert über alle Siege des Blocks, „lebt" der Anteil der Siege mit Rest > 0. */
console.log(`\n=== Was bei Satz ${S} und Abfall D je Stapel übrig bleibt (wirksame Stapel) ===`);
console.log(`  Runden  ` + DECAYS.map((d) => `D=${d}: Ø Rest / lebt`.padStart(22)).join(""));
for (let k = 0; k < NB; k++) {
  const a = EFF[k]; if (!a.length) continue;
  const cells = DECAYS.map((d) => {
    const rest = a.map((v) => Math.max(0, S - d * v));
    return `${mean(rest).toFixed(1)} / ${((rest.filter((v) => v > 0).length / a.length) * 100).toFixed(0)} %`.padStart(22);
  });
  console.log(`  ${String(k * 10 + 1).padStart(2)}–${String(k * 10 + 10).padStart(2)}  ${cells.join("")}`);
}
console.log(`\n  Lesart: „lebt" ist der Anteil der Siege, auf denen der Skill überhaupt noch etwas gibt. Fällt er früh`);
console.log(`  gegen 0, ist der Skill eine reine Rampenhilfe; bleibt er spät hoch, schiebt er über die 100-%-Klemme`);
console.log(`  und wird über OVERCRIT_MULT_PER_PP still zum Crit-Multiplikator.`);
