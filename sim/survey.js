// BESTANDSAUFNAHME — der Ist-Stand aller vier Fraktionen auf einmal, parallel über mehrere Prozesse.
//
//   node sim/survey.js [--explore 800] [--runs 150] [--cross 500] [--seed 1] [--jobs <Kerne>] [--out sim/out/survey.json]
//
// Zwei Fragen, zwei Messungen:
//   A) WO STEHT EINE FRAKTION?  16 Builds auf denselben Seeds — 4 rein, 6 Paare, 4 Tripel, der Vierer und der
//      planlose Zufalls-Mix. Alle mit demselben Nicht-Skill-Verhalten (greedy Aufstellung + Architekt), damit der
//      Unterschied wirklich aus der Fraktionswahl kommt und nicht aus der Spielstärke drumherum.
//   B) WIE STEHT EIN SKILL IN SEINER KOMBI?  14 Welten (4 mono, 6 Paare, 4 Tripel): in jeder Welt derselbe Dreischritt
//      wie in --mode skills (Explore → eingefrorene Wertetabelle → Greedy → gepaarte Ablation je Skill). Ein Skill wird
//      dadurch siebenmal gemessen: einmal mono, dreimal im Paar, dreimal im Tripel.
//
// Parallelisierung: ein Auftrags-Pool über `--jobs` Kindprozesse (sim/survey-worker.js). Die Aufträge hängen
// voneinander ab (Explore → Greedy → Ablation je Welt), deshalb wächst die Warteschlange während des Laufs.
// Jeder Auftrag ist deterministisch an seine Seeds gebunden → die Reihenfolge der Erledigung ändert das Ergebnis nicht.
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { SKILL_DEFS, archetypeOf, isLegendarySkill, SKILL_TIER_COUNT } from "../src/game/skills.js";
import { robustDelta } from "./eval.js";
import { flagFor } from "./skills-eval.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKER = join(HERE, "survey-worker.js");
const ARCHES = ["fire", "lightning", "ice", "plant"];
const NAME = { fire: "Feuer", lightning: "Blitz", ice: "Eis", plant: "Pflanze" };
const SHORT = { fire: "Fe", lightning: "Bl", ice: "Ei", plant: "Pf" };
const TIER_LABEL = ["N", "S", "SS", "E"];

const arg = (name, def) => { const i = process.argv.indexOf(name); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def; };
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return 0; const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
const mean = (a) => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : 0);
const stats = (a) => ({ n: a.length, median: quantile(a, 0.5), mean: mean(a), p90: quantile(a, 0.9), p95: quantile(a, 0.95), max: Math.max(...a) });
const fmt = (n) => Math.round(n).toLocaleString("de-DE");
const pct = (x) => `${(x * 100).toFixed(0)}%`;
const combos = (arr, k) => (k === 0 ? [[]] : k > arr.length ? [] : [...combos(arr.slice(1), k - 1).map((c) => [arr[0], ...c]), ...combos(arr.slice(1), k)]);

const EXPLORE = Number(arg("--explore", 800));
const RUNS = Number(arg("--runs", 150));
const CROSS = Number(arg("--cross", 500));
const SEED0 = Number(arg("--seed", 1));
const JOBS = Number(arg("--jobs", Math.max(1, availableParallelism())));
const C = Number(arg("--c", 1.4));
const OUT = arg("--out", "sim/out/survey.json");

// ---- Welten (B) und Builds (A) ----
const worldList = [...combos(ARCHES, 1), ...combos(ARCHES, 2), ...combos(ARCHES, 3)];
const keyOf = (arch) => arch.map((a) => SHORT[a]).join("+");
const skillsOf = (arch) => Object.keys(SKILL_DEFS).filter((id) => arch.includes(archetypeOf(id)));
const worlds = new Map(worldList.map((arch) => [keyOf(arch), { key: keyOf(arch), arch, size: arch.length, ids: skillsOf(arch), explore: null, greedy: null, ablate: new Map() }]));
const crossBuilds = [...combos(ARCHES, 1), ...combos(ARCHES, 2), ...combos(ARCHES, 3), ...combos(ARCHES, 4)]
  .map((members) => ({ label: keyOf(members), members }));
crossBuilds.push({ label: "Zufalls-Mix", members: null });

// ---- Auftrags-Warteschlange, nach Dringlichkeit gestaffelt (Explore schaltet die große Ablationswelle frei) ----
const ready = [[], [], [], []];
const push = (prio, job) => ready[prio].push(job);
const take = () => { for (const b of ready) if (b.length) return b.shift(); return null; };
const pending = () => ready.reduce((t, b) => t + b.length, 0);

for (const w of worlds.values()) push(0, { kind: "explore", world: w.key, arch: w.arch, runs: EXPLORE, seed0: SEED0, c: C });
for (const b of crossBuilds) push(3, { kind: "cross", label: b.label, members: b.members, runs: CROSS, seed0: SEED0 });

const plannedRuns = worldList.reduce((t, arch) => t + EXPLORE + RUNS + skillsOf(arch).length * RUNS, 0) + crossBuilds.length * CROSS;
const cross = new Map();
let doneRuns = 0;
const t0 = Date.now();

function onResult(job, res) {
  doneRuns += job.runs;
  if (job.kind === "cross") { cross.set(job.label, res); return; }
  const w = worlds.get(job.world);
  if (job.kind === "explore") {
    w.explore = res.rows;
    w.tableRows = res.tableRows;
    push(1, { kind: "greedy", world: w.key, arch: w.arch, runs: RUNS, seed0: SEED0 + EXPLORE, tableRows: res.tableRows });
    return;
  }
  if (job.kind === "greedy") {
    w.greedy = res.rows;
    w.greedyHeld = res.held;
    for (const id of w.ids) push(2, { kind: "ablate", world: w.key, arch: w.arch, skillId: id, runs: RUNS, seed0: SEED0 + EXPLORE, tableRows: w.tableRows });
    return;
  }
  w.ablate.set(job.skillId, res.scores);
}

function progress(job) {
  const share = doneRuns / plannedRuns;
  const el = (Date.now() - t0) / 1000;
  const eta = share > 0.01 ? (el / share) * (1 - share) : NaN;
  const what = job.kind === "cross" ? `cross ${job.label}` : `${job.kind} ${job.world}${job.skillId ? ` ${SKILL_DEFS[job.skillId].name}` : ""}`;
  console.log(`  [${(share * 100).toFixed(1).padStart(5)}%  +${(el / 60).toFixed(0)}m  noch ~${Number.isFinite(eta) ? (eta / 60).toFixed(0) : "?"}m]  ${what}`);
}

function runPool() {
  return new Promise((resolve, reject) => {
    const kids = Array.from({ length: JOBS }, () => fork(WORKER, [], { stdio: ["ignore", "inherit", "inherit", "ipc"] }));
    const busy = new Map();
    let stopped = false;
    const stop = (fn) => { if (stopped) return; stopped = true; for (const k of kids) k.kill(); fn(); };
    const pump = () => {
      for (const kid of kids) {
        if (busy.has(kid)) continue;
        const job = take();
        if (!job) break;
        busy.set(kid, job);
        kid.send(job);
      }
      if (!busy.size && !pending()) stop(resolve);
    };
    for (const kid of kids) {
      kid.on("message", (res) => {
        const job = busy.get(kid);
        busy.delete(kid);
        if (res.error) return stop(() => reject(new Error(res.error)));
        onResult(job, res);
        progress(job);
        pump();
      });
      kid.on("exit", (code) => { if (code) stop(() => reject(new Error(`Arbeiter beendet mit Code ${code}`))); });
    }
    pump();
  });
}

// ---- Auswertung je Welt: dieselben Kennzahlen wie --mode skills (Lift je Stufe, Haltequote, gepaarte Ablation) ----
const holds = (row, id, tier) => row.skills.includes(id) && (tier == null || isLegendarySkill(id) || ((row.tiers || {})[id] ?? 0) === tier);

function evaluateWorld(w) {
  const overall = mean(w.explore.map((r) => r.score));
  const liftOf = (pred) => { const held = w.explore.filter(pred); return { n: held.length, lift: held.length ? mean(held.map((r) => r.score)) / overall : null }; };
  const heldRate = (id, tier) => mean(w.greedy.map((r) => (holds(r, id, tier) ? 1 : 0)));
  const skills = w.ids.map((id) => {
    const legendary = isLegendarySkill(id);
    const tiers = legendary
      ? [{ tier: "L", ...liftOf((r) => holds(r, id, null)), heldRate: heldRate(id, null) }]
      : Array.from({ length: SKILL_TIER_COUNT }, (_, t) => ({ tier: TIER_LABEL[t], ...liftOf((r) => holds(r, id, t)), heldRate: heldRate(id, t) }));
    const any = liftOf((r) => holds(r, id, null));
    const abl = w.ablate.get(id);
    const deltas = w.greedy.map((r, i) => r.score - abl[i]);
    const ratios = w.greedy.map((r, i) => Math.log(Math.max(1, r.score) / Math.max(1, abl[i])));
    const row = { id, name: SKILL_DEFS[id].name, arch: archetypeOf(id), legendary, tiers, lift: any.lift, n: any.n,
      heldRate: heldRate(id, null), marginal: robustDelta(deltas, ratios) };
    row.flags = flagFor(row);
    return row;
  });
  skills.sort((a, b) => b.marginal.median - a.marginal.median);
  return { key: w.key, arch: w.arch, size: w.size,
    exploreScore: stats(w.explore.map((r) => r.score)),
    greedyScore: stats(w.greedy.map((r) => r.score)),
    greedyWinrate: mean(w.greedy.map((r) => r.winrate)),
    greedySkillsHeld: mean(w.greedy.map((r) => r.skills.length)),
    greedyHeld: w.greedyHeld, skills };
}

// Ein Skill über seine sieben Messungen: mono, die drei Paare, die drei Tripel.
function verdicts(byWorld) {
  const out = [];
  for (const id of Object.keys(SKILL_DEFS)) {
    const a = archetypeOf(id);
    const rows = byWorld.filter((w) => w.arch.includes(a)).map((w) => ({ size: w.size, key: w.key, row: w.skills.find((s) => s.id === id) })).filter((e) => e.row);
    const group = (size) => {
      const g = rows.filter((e) => e.size === size).map((e) => e.row);
      const lifts = g.map((r) => r.lift).filter((v) => v != null);
      return { n: g.length, held: mean(g.map((r) => r.heldRate)), lift: lifts.length ? mean(lifts) : null,
        pctEffect: mean(g.map((r) => r.marginal.pctEffect)), winRate: mean(g.map((r) => r.marginal.winRate)),
        flags: g.map((r) => r.flags) };
    };
    const all = rows.map((e) => e.row);
    const bad = all.filter((r) => /tot|schadet|selten/.test(r.flags)).length;
    const strong = all.filter((r) => /stark/.test(r.flags)).length;
    out.push({ id, name: SKILL_DEFS[id].name, arch: a, legendary: isLegendarySkill(id),
      mono: group(1), pair: group(2), triple: group(3),
      worlds: rows.map((e) => ({ key: e.key, size: e.size, held: e.row.heldRate, lift: e.row.lift, pctEffect: e.row.marginal.pctEffect, winRate: e.row.marginal.winRate, median: e.row.marginal.median, flags: e.row.flags })),
      badWorlds: bad, strongWorlds: strong, nWorlds: all.length,
      heldAll: mean(all.map((r) => r.heldRate)), pctAll: mean(all.map((r) => r.marginal.pctEffect)) });
  }
  return out.sort((x, y) => y.pctAll - x.pctAll);
}

// ---- Bericht auf der Konsole (die volle Auflösung liegt im JSON) ----
function report(byWorld, verd) {
  console.log(`\n=== A) WO STEHT WELCHER BUILD (${CROSS} Läufe je Build, Seeds ${SEED0}..${SEED0 + CROSS - 1}) ===`);
  const rows = crossBuilds.map((b) => ({ ...b, m: cross.get(b.label) })).map((b) => ({ ...b, s: stats(b.m.scores) }));
  const mono = Object.fromEntries(ARCHES.map((a) => [a, rows.find((r) => r.label === SHORT[a]).s.median]));
  const mix = rows.find((r) => r.label === "Zufalls-Mix").s.median;
  console.log(`  ${"Build".padEnd(14)} ${"Median".padStart(12)} ${"Mean".padStart(12)} ${"p90".padStart(12)}  Siege  ÷Mix  ÷b.Rein  Split`);
  for (const b of [...rows].sort((x, y) => y.s.median - x.s.median)) {
    const best = b.members ? Math.max(...b.members.map((a) => mono[a])) : null;
    const split = b.members ? b.members.map((a) => `${SHORT[a]} ${b.m.held[a].toFixed(1)}`).join(" ") : `Ø ${b.m.skillsHeld.toFixed(1)} Skills`;
    console.log(`  ${b.label.padEnd(14)} ${fmt(b.s.median).padStart(12)} ${fmt(b.s.mean).padStart(12)} ${fmt(b.s.p90).padStart(12)}  ${pct(b.m.winrate).padStart(4)}  ${(b.s.median / mix).toFixed(2)}×  ${best ? `${(b.s.median / best).toFixed(2)}×` : "  — "}    ${split}`);
  }

  console.log(`\n=== B) DIE 14 WELTEN (Explore ${EXPLORE} · Greedy/Ablation ${RUNS}) ===`);
  console.log(`  ${"Welt".padEnd(10)} ${"Greedy-Median".padStart(14)} ${"p90".padStart(13)}  Siege  Ø Skills  Aufteilung`);
  for (const w of byWorld) {
    const split = w.arch.map((a) => `${SHORT[a]} ${w.greedyHeld[a].toFixed(1)}`).join(" ");
    console.log(`  ${w.key.padEnd(10)} ${fmt(w.greedyScore.median).padStart(14)} ${fmt(w.greedyScore.p90).padStart(13)}  ${pct(w.greedyWinrate).padStart(4)}  ${w.greedySkillsHeld.toFixed(1).padStart(7)}   ${split}`);
  }

  for (const a of ARCHES) {
    console.log(`\n  — ${NAME[a].toUpperCase()} — je Skill über mono / Paar / Tripel (Halte · Lift · typ. Effekt); rot = tot/schadet/selten`);
    console.log(`    ${"Skill".padEnd(17)} ${"mono".padStart(20)} ${"Paar (Ø 3)".padStart(20)} ${"Tripel (Ø 3)".padStart(20)}   Urteil`);
    const g = (x) => `${pct(x.held).padStart(4)} ${(x.lift == null ? "—" : x.lift.toFixed(2)).padStart(5)} ${`${(x.pctEffect * 100).toFixed(0)}%`.padStart(6)}`;
    for (const v of verd.filter((v) => v.arch === a)) {
      const urteil = v.badWorlds === v.nWorlds ? "ÜBERALL SCHWACH" : v.strongWorlds === v.nWorlds ? "überall stark" : v.badWorlds ? `schwach in ${v.badWorlds}/${v.nWorlds}` : "";
      console.log(`    ${v.name.padEnd(17)} ${g(v.mono).padStart(20)} ${g(v.pair).padStart(20)} ${g(v.triple).padStart(20)}   ${urteil}`);
    }
  }

  const always = verd.filter((v) => v.badWorlds === v.nWorlds);
  const never = verd.filter((v) => v.strongWorlds === v.nWorlds);
  console.log(`\n  überall schwach (${always.length}): ${always.map((v) => `${v.name} (${SHORT[v.arch]})`).join(" · ") || "keiner"}`);
  console.log(`  überall stark   (${never.length}): ${never.map((v) => `${v.name} (${SHORT[v.arch]})`).join(" · ") || "keiner"}`);
}

// ---- Lauf ----
console.log(`BESTANDSAUFNAHME — ${JOBS} Prozesse · ${worldList.length} Welten · ${crossBuilds.length} Builds · geplant ${plannedRuns.toLocaleString("de-DE")} Läufe`);
await runPool();
const byWorld = [...worlds.values()].sort((a, b) => a.size - b.size || a.key.localeCompare(b.key)).map(evaluateWorld);
const verd = verdicts(byWorld);
report(byWorld, verd);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({
  params: { explore: EXPLORE, runs: RUNS, cross: CROSS, seed0: SEED0, c: C, jobs: JOBS },
  cross: crossBuilds.map((b) => ({ label: b.label, members: b.members, ...cross.get(b.label), scores: undefined, stats: stats(cross.get(b.label).scores) })),
  worlds: byWorld, verdicts: verd,
}, null, 2));
console.log(`\n  → ${OUT}   (${((Date.now() - t0) / 60000).toFixed(0)} min)`);
