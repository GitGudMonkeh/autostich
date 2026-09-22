// End-of-run score distribution — the reference for every campaign score threshold (docs/kampagne.md §6).
// Plays whole runs (50 rounds each) through the real reducer, one series per playstyle, and reports
// two things: the percentile spread, and the share of runs that clear a candidate threshold.
//
// The last column is the one the campaign hangs on: four runs in a row, a single loss resets the
// campaign, so the per-run rates multiply. It measures a run WITHOUT campaign rewards.
//
// Raw scores are cached in sim/out/kampagne-schwelle.json so a different threshold ladder can be
// queried without replaying 200 runs (REUSE=1). Output stays German: the tables go into
// docs/kampagne.md, which is the owner's German document.
//
//   N=40 node sim/probes/kampagne-schwelle.mjs      # play and report
//   REUSE=1 node sim/probes/kampagne-schwelle.mjs   # report again from the cache
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { makeRng } from "../../src/game/deck.js";
import { reducer } from "../../src/game/reducer.js";
import { randomPolicy } from "../policies/random.js";
import { factionPolicy } from "../policies/faction.js";

const ALL4 = ["lightning", "fire", "ice", "plant"];
const N = Number(process.env.N || 40);
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out", "kampagne-schwelle.json");
const LADDER = (process.env.LADDER || "5,10,15,20,30,50,100").split(",").map(Number);

function runOne(pol, seed) {
  const rng = makeRng(seed);
  let s = reducer(null, { type: "START_RUN", rng, architect: true, archetypes: ALL4 });
  let guard = 0;
  while (s.phase !== "gameover") {
    if (++guard > 200000) throw new Error("stuck at seed " + seed);
    s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
  }
  return s.score || 0;
}

function play() {
  const out = {};
  for (const [name, mk] of [["naiv", () => randomPolicy({ architectGreedy: true })],
      ...ALL4.map((f) => [f, () => factionPolicy(f, { architectGreedy: true })])]) {
    out[name] = Array.from({ length: N }, (_, i) => runOne(mk(), i + 1));
    process.stderr.write(name + " fertig (" + N + ")\n");
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out));
  return out;
}

const data = process.env.REUSE ? JSON.parse(readFileSync(OUT, "utf8")) : play();
const styles = Object.keys(data);
const pooled = styles.flatMap((k) => data[k]);
const M = 1e6;
const share = (xs, t) => (100 * xs.filter((x) => x >= t).length) / xs.length;
const mio = (n) => Math.round(n / M).toLocaleString("de-DE");
const pctOf = (xs, p) => { const b = [...xs].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const row = (label, cells) => console.log(label.padEnd(11) + cells.map((c) => String(c).padStart(9)).join(""));

console.log("Endscore eines ganzen Laufs, " + data[styles[0]].length + " Seeds je Spielweise, "
  + pooled.length + " Laeufe. Alle Zahlen in Mio.\n");
row("Spielweise", ["p10", "p25", "p50", "p75", "p90", "max"]);
for (const k of [...styles, "alle"]) {
  const xs = k === "alle" ? pooled : data[k];
  row(k, [...[.10, .25, .50, .75, .90].map((p) => mio(pctOf(xs, p))), mio(Math.max(...xs))]);
}

console.log("\nAnteil Laeufe mit Endscore >= Schwelle, ohne Kampagnen-Rewards (%):\n");
row("Schwelle", [...styles, "alle", "4x"]);
for (const t of LADDER.map((m) => m * M)) {
  const all = share(pooled, t);
  const chain = 100 * Math.pow(all / 100, 4);   // vier Laeufe am Stueck, ein Fehlschlag setzt zurueck
  row(mio(t) + " Mio", [...styles.map((k) => share(data[k], t).toFixed(0)), all.toFixed(0), chain.toFixed(1)]);
}
