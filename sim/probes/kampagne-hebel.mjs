// What is a single power lever worth? Campaign rewards have to grab something the game already has
// (docs/kampagne.md §4), and the budget probe says how big the grab must be — this one says which
// lever delivers it.
//
// Each variant turns exactly one SIM_* constant and replays the SAME seeds as the baseline, so the
// comparison is paired: the reported factor is the median of the per-seed ratios, which survives the
// factor-100 spread between runs that an unpaired mean does not.
//
// Constants are read at module load, so a variant cannot be switched inside one process — the parent
// spawns one child per variant. That is what KAMPAGNE_CHILD marks.
//
//   N=24 node sim/probes/kampagne-hebel.mjs
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ALL4 = ["lightning", "fire", "ice", "plant"];
const N = Number(process.env.N || 24);
const SELF = fileURLToPath(import.meta.url);

// One lever per line: label and the constant it turns. Three obvious candidates are NOT here because
// turning them leaves the end score byte-identical, and the reason differs per lever (measured
// 2026-09-22, docs/kampagne.md §8): SIM_SKILL_SLOTS — exp holds skills without a binding cap
// (reducer.js:901 falls back to SKILL_SLOT_LIMIT = 99), so there is no limit to lift;
// SIM_SKILLS_OFFERED — 12/4 archetypes already sits ON the per-archetype cap of 3 (skills.js:537);
// SIM_BASE_REROLLS — reaches the state, but the sim policies never spend a reroll, so this one is a
// gap in the harness, not a statement about the game.
const VARIANTS = [
  ["Basis", {}],
  ["Basispunkte 400>0", { SIM_SCORE_PER_WIN: "0" }],                 // wieviel traegt die Basis ueberhaupt
  ["Basispunkte 400>800", { SIM_SCORE_PER_WIN: "800" }],             // +400 flach — ein flacher Reward
  ["Serien-Schritt 2>3 %", { SIM_STREAK_BASE_STEP: "0.03" }],
  ["Serien-Deckel 150>200 %", { SIM_STREAK_BASE_CAP: "2.0" }],
  ["Crit-Basis 2,25>2,75", { SIM_CRIT_BASE_MULT: "2.75" }],
  ["Crit-Deckel 8>12", { SIM_CRIT_MULT_CAP: "12" }],
  ["Legendaere Skills x2", { SIM_SKILL_LEGENDARY_PER_SLOT: "0.07" }],
];

async function child() {
  const { makeRng } = await import("../../src/game/deck.js");
  const { reducer } = await import("../../src/game/reducer.js");
  const { randomPolicy } = await import("../policies/random.js");
  const { factionPolicy } = await import("../policies/faction.js");
  const play = (pol, seed) => {
    const rng = makeRng(seed);
    let s = reducer(null, { type: "START_RUN", rng, architect: true, archetypes: ALL4 });
    let guard = 0;
    while (s.phase !== "gameover") {
      if (++guard > 200000) throw new Error("stuck at seed " + seed);
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
    }
    return s.score || 0;
  };
  const out = {};
  for (const [name, mk] of [["naiv", () => randomPolicy({ architectGreedy: true })],
      ...ALL4.map((f) => [f, () => factionPolicy(f, { architectGreedy: true })])]) {
    out[name] = Array.from({ length: N }, (_, i) => play(mk(), i + 1));
  }
  process.stdout.write(JSON.stringify(out));
}

if (process.env.KAMPAGNE_CHILD) {
  await child();
} else {
  const median = (xs) => { const b = [...xs].sort((a, c) => a - c); const h = b.length >> 1;
    return b.length % 2 ? b[h] : (b[h - 1] + b[h]) / 2; };
  const runVariant = (env) => {
    const r = spawnSync(process.execPath, [SELF],
      { env: { ...process.env, ...env, KAMPAGNE_CHILD: "1", N: String(N) }, maxBuffer: 1 << 24 });
    if (r.status !== 0) throw new Error(String(r.stderr));
    return JSON.parse(r.stdout.toString());
  };

  let base = null;
  const pad = (s, n) => String(s).padStart(n);
  console.log("Gepaarter Vergleich, " + N + " Seeds je Spielweise, " + (N * 5) + " Laeufe je Variante.");
  console.log("Faktor = Median der Verhaeltnisse Seed fuer Seed gegen die Basis.\n");
  console.log("Hebel".padEnd(24) + ["alle", "naiv", "Blitz", "Feuer", "Eis", "Pflanze"].map((s) => pad(s, 9)).join(""));
  for (const [label, env] of VARIANTS) {
    const cur = runVariant(env);
    if (!base) { base = cur; console.log(label.padEnd(24) + pad("—", 9).repeat(6)); continue; }
    const styles = Object.keys(cur);
    const all = styles.flatMap((s) => cur[s].map((v, i) => (base[s][i] > 0 ? v / base[s][i] : 1)));
    console.log(label.padEnd(24) + pad("x" + median(all).toFixed(2), 9)
      + styles.map((s) => pad("x" + median(cur[s].map((v, i) => (base[s][i] > 0 ? v / base[s][i] : 1))).toFixed(2), 9)).join(""));
  }
}
