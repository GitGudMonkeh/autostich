// Arbeiter der Bestandsaufnahme (sim/survey.js). Bekommt je Auftrag ein Job-Objekt über IPC, spielt die Läufe und
// schickt das Roh-Ergebnis zurück. Rechnet bewusst NICHTS aus, was der Koordinator zusammenführen muss (Lift, Ablation) —
// hier laufen nur Läufe, damit die Kennzahlen an genau einer Stelle entstehen.
import { runOne } from "./run.js";
import { newMemory } from "./memory.js";
import { greedyPolicy, valueTableRows, valueTableFromRows } from "./policies/greedy.js";
import { factionPolicy } from "./policies/faction.js";
import { randomPolicy } from "./policies/random.js";
import { greedyFormationStep } from "./formation.js";
import { archetypeOf } from "../src/game/skills.js";

const ARCHES = ["fire", "lightning", "ice", "plant"];

/* Der planlose Spieler: greift bei Skills/Perks blind zu, stellt aber wie jeder andere gemessene Build greedy auf und
   baut greedy. Ohne den Formations-Solver wären Eis und Pflanze im Zufalls-Mix systematisch benachteiligt (§S4). */
function mixPolicy() {
  const base = randomPolicy({ architectGreedy: true });
  return { name: "mix+forms", act(s, rng, mem) { return s.phase === "formation" ? greedyFormationStep(s) : base.act(s, rng, mem); } };
}

const heldByArch = (results) => Object.fromEntries(ARCHES.map((a) => [a,
  results.reduce((t, r) => t + r.build.skills.filter((id) => archetypeOf(id) === a).length, 0) / results.length]));

// Die eingefrorene Wertetabelle je Welt einmal pro Arbeiter bauen — dieselbe Welt kommt hier hunderte Male vorbei.
let tableCache = { key: null, table: null };
function tableFor(job) {
  if (tableCache.key !== job.world) tableCache = { key: job.world, table: valueTableFromRows(job.tableRows) };
  return tableCache.table;
}

function handle(job) {
  if (job.kind === "cross") {
    const policy = job.members ? factionPolicy(job.members) : mixPolicy();
    const results = Array.from({ length: job.runs }, (_, i) => runOne(job.seed0 + i, policy));
    return { scores: results.map((r) => r.score), winrate: results.reduce((t, r) => t + r.wins / r.tricks, 0) / results.length,
      held: heldByArch(results), skillsHeld: results.reduce((t, r) => t + r.build.skills.length, 0) / results.length };
  }
  const opts = { archetypes: job.arch };
  if (job.kind === "explore") {
    const mem = newMemory();
    const policy = greedyPolicy({ explore: true, c: job.c, solveFormations: true });
    const rows = [];
    for (let i = 0; i < job.runs; i++) {
      const r = runOne(job.seed0 + i, policy, mem, null, opts);
      rows.push({ score: r.score, skills: r.build.skills, tiers: r.build.skillTiers });
    }
    return { rows, tableRows: valueTableRows(mem) };
  }
  if (job.kind === "greedy") {
    const policy = greedyPolicy({ explore: false, table: tableFor(job), solveFormations: true });
    const results = Array.from({ length: job.runs }, (_, i) => runOne(job.seed0 + i, policy, null, null, opts));
    return { rows: results.map((r) => ({ score: r.score, skills: r.build.skills, tiers: r.build.skillTiers, winrate: r.wins / r.tricks })),
      held: heldByArch(results) };
  }
  if (job.kind === "ablate") {
    const policy = greedyPolicy({ explore: false, table: tableFor(job), drop: job.skillId, solveFormations: true });
    const scores = Array.from({ length: job.runs }, (_, i) => runOne(job.seed0 + i, policy, null, null, opts).score);
    return { scores };
  }
  throw new Error(`unbekannte Job-Art '${job.kind}'`);
}

process.on("message", (job) => {
  try {
    process.send({ ok: true, ...handle(job) });
  } catch (e) {
    process.send({ error: `${job.kind} ${job.world || ""} ${job.skillId || job.label || ""}: ${e.message}` });
  }
});
