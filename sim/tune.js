/* PARAMETER-TUNING per CEM (Cross-Entropy Method) — der Koordinator.

     node sim/tune.js [--gens 12] [--pop 16] [--seeds 24] [--holdout 60] [--seed 1] [--jobs <Kerne>]

   Warum CEM und nicht noch ein Bandit: die Arme der vorhandenen Lerner (ucb.js, greedy.js) werden
   UNABHÄNGIG gemittelt, je Archetyp-Bucket. Ein Hebel, der allein schadet und in Kombination trägt, landet
   dort zuverlässig unten — gemessen an der Münzbörse: alle vier Flächen gierig zu kaufen bringt +64 %,
   dieselben vier mit einem Boden für die Aufwertungen +91 %. CEM zieht den GANZEN Vektor gemeinsam und
   sieht solche Wechselwirkungen per Konstruktion.

   Zielgröße ist der MEDIAN über den Seed-Satz, nicht das Mittel: die Score-Verteilung hat p90/Median ≈ 5,
   ein einziger Ausreißer-Lauf würde einen Kandidaten sonst nach oben tragen (sim-harness-plan.md §7).

   Redlichkeit: optimiert wird auf dem TRAININGS-Seed-Satz, berichtet wird auf einem DISJUNKTEN Holdout —
   sonst misst man, wie gut der Vektor diese Seeds auswendig kann. Derselbe Schnitt, den Explore und Eval
   schon zwischen sich ziehen (§S3). */
import { fork } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { makeRng } from "../src/game/deck.js";
import { ALL_BUYS } from "./coin-policy.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKER = join(HERE, "tune-worker.js");
const arg = (name, def) => { const i = process.argv.indexOf(name); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def; };

const GENS = Number(arg("--gens", 12));
const POP = Number(arg("--pop", 16));
const SEEDS = Number(arg("--seeds", 24));
const HOLDOUT = Number(arg("--holdout", 60));
const SEED0 = Number(arg("--seed", 1));
const JOBS = Math.max(1, Number(arg("--jobs", availableParallelism())));
const OUT = arg("--out", "sim/out/tune.json");

/* Der Suchraum. `sd` ist die ANFANGS-Streuung — groß genug, dass die erste Generation den Raum wirklich
   abtastet statt um den Startwert zu zittern. `depth`/`famFirst` sind Schalter, die als Zahl geführt und
   bei 0,5 geschnitten werden: CEM braucht stetige Achsen, die Policy einen Boolean. */
const SPACE = [
  { key: "reserve",       lo: 0, hi: 150, init: 40, sd: 45 },
  { key: "reserveEnergy", lo: 0, hi: 150, init: 40, sd: 45 },
  { key: "depth",         lo: 0, hi: 1,   init: 0,  sd: 0.5 },
  { key: "famFirst",      lo: 0, hi: 1,   init: 0,  sd: 0.5 },
];
const SD_FLOOR = SPACE.map((p) => p.sd * 0.08); // gegen vorzeitigen Kollaps auf einen Punkt
const ELITE = Math.max(2, Math.round(POP * 0.25));
const ALPHA = 0.7; // Glättung: so viel vom Elite-Mittel geht in den neuen Mittelwert

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const toBuys = (v) => ({
  energy: true, cover: true, upgradeSkill: true, upgradeFamily: true,
  reserve: Math.round(v[0]), reserveEnergy: Math.round(v[1]), depth: v[2] >= 0.5, famFirst: v[3] >= 0.5,
});

/* Trainings- und Holdout-Seeds, an EINER Stelle gebaut und exportiert, damit ein Test die Trennung
   festhalten kann: überlappen sie, misst der Holdout nur noch, wie gut der Vektor diese Seeds auswendig
   kann — und das fiele nirgends auf, weil die Zahlen dann besonders gut aussehen. */
export const seedSets = (seed0, nTrain, nHold) => ({
  train: Array.from({ length: nTrain }, (_, i) => 100000 + seed0 * 1000 + i),
  hold: Array.from({ length: nHold }, (_, i) => 900000 + seed0 * 1000 + i),
});
const show = (v) => `Reserve ${Math.round(v[0])} · Energie-Reserve ${Math.round(v[1])} · ${v[2] >= 0.5 ? "tief" : "breit"} · ${v[3] >= 0.5 ? "Familie zuerst" : "Skill zuerst"}`;
const median = (a) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return 0;
  const m = (s.length - 1) / 2; return s.length % 2 ? s[m] : (s[Math.floor(m)] + s[Math.ceil(m)]) / 2; };
const fmt = (n) => Math.round(n).toLocaleString("de-DE");

// Box-Muller aus dem geseedeten Strom → die ganze Tuning-Fahrt ist reproduzierbar.
const rng = makeRng(SEED0);
const gauss = () => { const u = Math.max(1e-12, rng()), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const { train: trainSeeds, hold: holdSeeds } = seedSets(SEED0, SEEDS, HOLDOUT);

/* Auftrags-Pool über `JOBS` Kindprozesse. Jeder Auftrag ist ein Kandidat auf einem festen Seed-Satz und
   damit deterministisch an seine Seeds gebunden — die Reihenfolge der Erledigung ändert das Ergebnis nicht. */
function runPool(jobs) {
  return new Promise((resolve, reject) => {
    const out = new Array(jobs.length);
    let next = 0, done = 0;
    const kids = Array.from({ length: Math.min(JOBS, jobs.length) }, () => fork(WORKER));
    const feed = (kid) => {
      if (next >= jobs.length) { kid.kill(); return; }
      kid.send(jobs[next++]);
    };
    for (const kid of kids) {
      kid.on("message", (msg) => {
        if (msg.error) { kids.forEach((k) => k.kill()); reject(new Error(msg.error)); return; }
        out[msg.id] = msg.scores;
        if (++done === jobs.length) { kids.forEach((k) => k.kill()); resolve(out); return; }
        feed(kid);
      });
      kid.on("error", reject);
      feed(kid);
    }
  });
}

const evaluate = async (vectors, seeds) => {
  const scores = await runPool(vectors.map((v, id) => ({ id, seeds, buys: toBuys(v) })));
  return scores.map(median);
};

async function main() {
  console.log(`CEM: ${GENS} Generationen × ${POP} Kandidaten × ${SEEDS} Seeds, ${JOBS} Prozesse`);
  console.log(`Training-Seeds ${trainSeeds[0]}..${trainSeeds[SEEDS - 1]} · Holdout ${holdSeeds[0]}..${holdSeeds[HOLDOUT - 1]}\n`);
  let mean = SPACE.map((p) => p.init), sd = SPACE.map((p) => p.sd);
  const history = [];
  for (let g = 0; g < GENS; g++) {
    const vectors = Array.from({ length: POP }, () =>
      SPACE.map((p, d) => clamp(mean[d] + sd[d] * gauss(), p.lo, p.hi)));
    vectors[0] = mean.slice(); // der aktuelle Mittelwert läuft immer mit (Elitismus)
    const fit = await evaluate(vectors, trainSeeds);
    const order = fit.map((f, i) => [f, i]).sort((a, b) => b[0] - a[0]).slice(0, ELITE).map(([, i]) => i);
    const elites = order.map((i) => vectors[i]);
    mean = SPACE.map((_, d) => ALPHA * (elites.reduce((t, e) => t + e[d], 0) / ELITE) + (1 - ALPHA) * mean[d]);
    sd = SPACE.map((_, d) => {
      const m = elites.reduce((t, e) => t + e[d], 0) / ELITE;
      return Math.max(SD_FLOOR[d], Math.sqrt(elites.reduce((t, e) => t + (e[d] - m) ** 2, 0) / ELITE));
    });
    history.push({ gen: g + 1, best: fit[order[0]], mean: mean.slice() });
    console.log(`  Gen ${String(g + 1).padStart(2)}  bester Median ${fmt(fit[order[0]]).padStart(12)}   → ${show(mean)}`);
  }

  // Urteil auf dem HOLDOUT: getunter Vektor gegen den Bestand (ALL_BUYS) und gegen gar keinen Kauf.
  const tuned = toBuys(mean);
  const [mTuned, mDefault, mNone] = await Promise.all([
    runPool([{ id: 0, seeds: holdSeeds, buys: tuned }]).then((r) => median(r[0])),
    runPool([{ id: 0, seeds: holdSeeds, buys: ALL_BUYS }]).then((r) => median(r[0])),
    runPool([{ id: 0, seeds: holdSeeds, buys: null }]).then((r) => median(r[0])),
  ]);
  console.log(`\n=== Holdout (${HOLDOUT} disjunkte Seeds) ===`);
  console.log(`  kein Kauf          ${fmt(mNone).padStart(12)}`);
  console.log(`  Bestand ALL_BUYS   ${fmt(mDefault).padStart(12)}   ${((mDefault / mNone - 1) * 100).toFixed(0)} % über „kein Kauf"`);
  console.log(`  getunt             ${fmt(mTuned).padStart(12)}   ${((mTuned / mNone - 1) * 100).toFixed(0)} % über „kein Kauf", ${((mTuned / mDefault - 1) * 100).toFixed(0)} % über Bestand`);
  console.log(`  Vektor: ${show(mean)}`);

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ gens: GENS, pop: POP, seeds: SEEDS, holdoutSeeds: HOLDOUT, seed: SEED0,
    space: SPACE, history, tuned, holdout: { none: mNone, default: mDefault, tuned: mTuned } }, null, 2));
  console.log(`  → ${OUT}`);
}

// Nur als Programm laufen, nicht beim Import: die Helfer oben sind testbar, und ein Test, der sie holt,
// darf keine Tuning-Fahrt starten.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
