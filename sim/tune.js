/* PARAMETER-TUNING per CEM (Cross-Entropy Method) — der Koordinator.

     node sim/tune.js [--space arch|coins|all] [--gens 12] [--pop 16] [--seeds 24] [--pool 240]
                      [--holdout 60] [--seed 1] [--jobs <Kerne>]

   Warum CEM und nicht noch ein Bandit: die Arme der vorhandenen Lerner (ucb.js, greedy.js) werden
   UNABHÄNGIG gemittelt, je Archetyp-Bucket. Ein Hebel, der allein schadet und in Kombination trägt, landet
   dort zuverlässig unten — gemessen an der Münzbörse: alle vier Flächen gierig zu kaufen bringt +64 %,
   dieselben vier mit einem Boden für die Aufwertungen +91 %. CEM zieht den GANZEN Vektor gemeinsam und
   sieht solche Wechselwirkungen per Konstruktion.

   ZIELGRÖSSE: der GEPAARTE Vergleich gegen den Amtsinhaber, nicht der rohe Median. Gemessen schwankt der
   Median über 16 Seeds um 151 %, OHNE dass sich die Policy ändert — ein roher Median wählt damit die
   Kandidaten aus, die zufällig zu diesem Seed-Block passen, und der erste Architekt-Lauf landete prompt
   4 % UNTER dem handgesetzten Bestand. Seed für Seed gegen den Amtsinhaber gerechnet heben sich die
   Seed-Eigenheiten weg; gewertet wird der Median der Log-Verhältnisse (robust gegen die schweren Schwänze,
   maßstabsfrei). Dieselbe Statistik, die in der Ablation Effekte von wenigen Prozent aufgelöst hat.

   Dazu wird der Seed-Satz JE GENERATION neu aus einem größeren Trainings-Pool gezogen: ein fester Block
   lädt zum Auswendiglernen ein, und der Amtsinhaber läuft ohnehin in jeder Generation mit.

   Redlichkeit: optimiert wird auf dem TRAININGS-Pool, berichtet wird auf einem DISJUNKTEN Holdout — und
   dort gepaart mit Vorzeichentest, damit „besser" nicht wieder Rauschen heißt. Derselbe Schnitt, den
   Explore und Eval schon zwischen sich ziehen (§S3). */
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
const SEEDS = Number(arg("--seeds", 24));   // Seeds JE Generation (aus dem Pool gezogen)
const POOL = Number(arg("--pool", 240));    // Trainings-Pool, aus dem je Generation neu gezogen wird
const HOLDOUT = Number(arg("--holdout", 60));
const SEED0 = Number(arg("--seed", 1));
const JOBS = Math.max(1, Number(arg("--jobs", availableParallelism())));
const OUT = arg("--out", "sim/out/tune.json");

/* Der Suchraum. `sd` ist die ANFANGS-Streuung — groß genug, dass die erste Generation den Raum wirklich
   abtastet statt um den Startwert zu zittern. `depth`/`famFirst` sind Schalter, die als Zahl geführt und
   bei 0,5 geschnitten werden: CEM braucht stetige Achsen, die Policy einen Boolean. */
export const COIN_SPACE = [
  { key: "reserve",       lo: 0, hi: 150, init: 40, sd: 45 },
  { key: "reserveEnergy", lo: 0, hi: 150, init: 40, sd: 45 },
  { key: "depth",         lo: 0, hi: 1,   init: 0,  sd: 0.5 },
  { key: "famFirst",      lo: 0, hi: 1,   init: 0,  sd: 0.5 },
];
/* Die elf Architekt-Gewichte (sim/architect-policy.js, DEFAULT_WEIGHTS). `init` ist jeweils der handgesetzte
   Wert — der Lauf startet also beim Bestand und muss ihn schlagen, statt ihn zufällig zu treffen. Einzeln sagt
   keines der Gewichte etwas, weil sie gegeneinander gewichten; genau dafür ist CEM da. */
export const ARCH_SPACE = [
  { key: "row",           lo: 0, hi: 400, init: 100, sd: 120 },
  { key: "col",           lo: 0, hi: 400, init: 200, sd: 120 },
  { key: "diag",          lo: 0, hi: 400, init: 150, sd: 120 },
  { key: "partial",       lo: 0, hi: 1,   init: 0.3, sd: 0.3 },
  { key: "struct",        lo: 0, hi: 30,  init: 5,   sd: 8 },
  { key: "val",           lo: 0, hi: 15,  init: 1.5, sd: 4 },
  { key: "cat",           lo: 0, hi: 50,  init: 10,  sd: 15 },
  { key: "tier",          lo: 0, hi: 30,  init: 5,   sd: 8 },
  { key: "swapGain",      lo: 0, hi: 60,  init: 12,  sd: 18 },
  { key: "moveGain",      lo: 0, hi: 60,  init: 10,  sd: 18 },
  { key: "maxVictimTier", lo: 0, hi: 4,   init: 2,   sd: 1.5, round: true },
];
const WHICH = arg("--space", "arch"); // coins | arch | all
const SPACE = WHICH === "coins" ? COIN_SPACE : WHICH === "all" ? [...COIN_SPACE, ...ARCH_SPACE] : ARCH_SPACE;
const COIN_DIMS = SPACE === ARCH_SPACE ? 0 : COIN_SPACE.length;
const SD_FLOOR = SPACE.map((p) => p.sd * 0.08); // gegen vorzeitigen Kollaps auf einen Punkt
const ELITE = Math.max(2, Math.round(POP * 0.25));
const ALPHA = 0.7; // Glättung: so viel vom Elite-Mittel geht in den neuen Mittelwert

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const toBuys = (v) => ({
  energy: true, cover: true, upgradeSkill: true, upgradeFamily: true,
  reserve: Math.round(v[0]), reserveEnergy: Math.round(v[1]), depth: v[2] >= 0.5, famFirst: v[3] >= 0.5,
});
// Der Architekt-Teil des Vektors → Gewichts-Objekt. `round` nur, wo die Policy ganze Stufen vergleicht.
export const toWeights = (v, space = ARCH_SPACE) =>
  Object.fromEntries(space.map((p, i) => [p.key, p.round ? Math.round(v[i]) : v[i]]));

/* Trainings- und Holdout-Seeds, an EINER Stelle gebaut und exportiert, damit ein Test die Trennung
   festhalten kann: überlappen sie, misst der Holdout nur noch, wie gut der Vektor diese Seeds auswendig
   kann — und das fiele nirgends auf, weil die Zahlen dann besonders gut aussehen. */
export const seedSets = (seed0, nTrain, nHold) => ({
  train: Array.from({ length: nTrain }, (_, i) => 100000 + seed0 * 1000 + i),
  hold: Array.from({ length: nHold }, (_, i) => 900000 + seed0 * 1000 + i),
});
// Kandidaten-Vektor → die zwei Stellschrauben-Objekte, die der Arbeiter der Policy gibt.
const toParams = (v) => ({
  buys: COIN_DIMS ? toBuys(v.slice(0, COIN_DIMS)) : ALL_BUYS,
  weights: SPACE.length > COIN_DIMS ? toWeights(v.slice(COIN_DIMS), ARCH_SPACE) : null,
});
const show = (v) => SPACE.map((p, i) => `${p.key} ${p.hi <= 1 ? v[i].toFixed(2) : Math.round(v[i])}`).join(" · ");
const median = (a) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return 0;
  const m = (s.length - 1) / 2; return s.length % 2 ? s[m] : (s[Math.floor(m)] + s[Math.ceil(m)]) / 2; };
const fmt = (n) => Math.round(n).toLocaleString("de-DE");
// Exakter zweiseitiger Vorzeichentest gegen p=0,5 — für das Schluss-Urteil auf dem Holdout.
const lf = (n) => { let t = 0; for (let i = 2; i <= n; i++) t += Math.log(i); return t; };
function binomP(k, n) {
  if (!n) return 1;
  const pmf = (i) => Math.exp(lf(n) - lf(i) - lf(n - i) - n * Math.LN2);
  const obs = pmf(k) * (1 + 1e-9);
  let p = 0; for (let i = 0; i <= n; i++) if (pmf(i) <= obs) p += pmf(i);
  return Math.min(1, p);
}
/* Gepaarter Effekt eines Kandidaten gegen die Referenz: Median der Log-Verhältnisse je Seed. Maßstabsfrei,
   robust gegen die schweren Schwänze, und die Seed-Eigenheiten kürzen sich heraus. */
export const pairedEffect = (cand, ref) => median(cand.map((v, i) => Math.log(Math.max(1, v) / Math.max(1, ref[i]))));

// Box-Muller aus dem geseedeten Strom → die ganze Tuning-Fahrt ist reproduzierbar.
const rng = makeRng(SEED0);
const gauss = () => { const u = Math.max(1e-12, rng()), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const { train: trainPool, hold: holdSeeds } = seedSets(SEED0, POOL, HOLDOUT);
// Je Generation SEEDS Stück aus dem Pool ziehen (ohne Zurücklegen), aus dem geseedeten Strom → reproduzierbar.
function drawSeeds() {
  const p = trainPool.slice();
  for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return p.slice(0, SEEDS);
}

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

const evaluate = (vectors, seeds) => runPool(vectors.map((v, id) => ({ id, seeds, ...toParams(v) })));

async function main() {
  console.log(`CEM (${WHICH}, ${SPACE.length} Achsen): ${GENS} Generationen × ${POP} Kandidaten × ${SEEDS} Seeds, ${JOBS} Prozesse`);
  console.log(`Trainings-Pool ${trainPool[0]}..${trainPool[POOL - 1]} (${SEEDS} je Generation) · Holdout ${holdSeeds[0]}..${holdSeeds[HOLDOUT - 1]}\n`);
  let mean = SPACE.map((p) => p.init), sd = SPACE.map((p) => p.sd);
  const history = [];
  for (let g = 0; g < GENS; g++) {
    const seeds = drawSeeds();                                   // frischer Satz je Generation
    const vectors = Array.from({ length: POP }, () =>
      SPACE.map((p, d) => clamp(mean[d] + sd[d] * gauss(), p.lo, p.hi)));
    vectors[0] = mean.slice();                                   // der Amtsinhaber ist Kandidat 0 UND Referenz
    const scores = await evaluate(vectors, seeds);
    const ref = scores[0];
    // Gepaart gegen den Amtsinhaber: der Seed-Satz selbst kürzt sich heraus, nur der Unterschied zählt.
    const fit = scores.map((sc) => pairedEffect(sc, ref));
    const order = fit.map((f, i) => [f, i]).sort((a, b) => b[0] - a[0]).slice(0, ELITE).map(([, i]) => i);
    const elites = order.map((i) => vectors[i]);
    mean = SPACE.map((_, d) => ALPHA * (elites.reduce((t, e) => t + e[d], 0) / ELITE) + (1 - ALPHA) * mean[d]);
    sd = SPACE.map((_, d) => {
      const m = elites.reduce((t, e) => t + e[d], 0) / ELITE;
      return Math.max(SD_FLOOR[d], Math.sqrt(elites.reduce((t, e) => t + (e[d] - m) ** 2, 0) / ELITE));
    });
    const gain = Math.exp(fit[order[0]]) - 1;
    history.push({ gen: g + 1, bestGain: gain, mean: mean.slice() });
    console.log(`  Gen ${String(g + 1).padStart(2)}  bester gepaarter Effekt ${((gain >= 0 ? "+" : "") + (gain * 100).toFixed(1) + " %").padStart(8)}   → ${show(mean)}`);
  }

  // Urteil auf dem HOLDOUT: getunter Vektor gegen den Bestand (ALL_BUYS) und gegen gar keinen Kauf.
  const tuned = toParams(mean);
  const [sTuned, sDefault] = await Promise.all([
    runPool([{ id: 0, seeds: holdSeeds, ...tuned }]).then((r) => r[0]),
    runPool([{ id: 0, seeds: holdSeeds, buys: ALL_BUYS, weights: null }]).then((r) => r[0]),
  ]);
  // Gepaart und mit Vorzeichentest, damit „besser" nicht wieder Rauschen heißen kann.
  const deltas = sTuned.map((v, i) => v - sDefault[i]);
  const nz = deltas.filter((d) => d !== 0).length;
  const wins = deltas.filter((d) => d > 0).length;
  const effect = Math.exp(pairedEffect(sTuned, sDefault)) - 1;
  const pv = binomP(wins, nz);
  console.log(`\n=== Holdout (${HOLDOUT} disjunkte Seeds, gepaart gegen den Bestand) ===`);
  console.log(`  Bestand (Hand)  Median ${fmt(median(sDefault)).padStart(12)}`);
  console.log(`  getunt          Median ${fmt(median(sTuned)).padStart(12)}`);
  console.log(`  gepaarter Effekt ${((effect >= 0 ? "+" : "") + (effect * 100).toFixed(1) + " %").padStart(8)}   Siege ${wins}/${nz}   p = ${pv < 0.0001 ? "<0,0001" : pv.toFixed(4)}`);
  console.log(`  Urteil: ${pv < 0.05 ? (effect > 0 ? "der getunte Vektor ist besser" : "der getunte Vektor ist SCHLECHTER") : "kein belegbarer Unterschied — der Bestand bleibt"}`);
  console.log(`  Vektor: ${show(mean)}`);

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ space: WHICH, gens: GENS, pop: POP, seeds: SEEDS, holdoutSeeds: HOLDOUT, seed: SEED0,
    axes: SPACE, history, tuned,
    holdout: { defaultMedian: median(sDefault), tunedMedian: median(sTuned), effect, wins, n: nz, p: pv } }, null, 2));
  console.log(`  → ${OUT}`);
}

// Nur als Programm laufen, nicht beim Import: die Helfer oben sind testbar, und ein Test, der sie holt,
// darf keine Tuning-Fahrt starten.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
