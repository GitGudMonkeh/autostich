// Legendär-Perk-Impact (Ersatz für das verschollene perk-impact.mjs, das constants.js:165 als Quelle des
// v0.1-Balance-Bands „~1,2–1,7×" zitiert). Misst je legendärem Perk den MULTIPLIKATIVEN Score-Effekt per
// gepaarter Ablation — dieselbe Methodik wie sim/eval.js (S3), nur auf den Legendär-Pool fokussiert.
//
//   npm run impact                                  # Default: 14 Legendäre, 80 Seeds, Explore-Referenzbuild
//   npm run impact -- --runs 200 --explore 400      # mehr Statistik
//   npm run impact -- --only L_HENK,L_PATT          # nur einzelne Perks (schneller Regressionscheck)
//   npm run impact -- --legchance 0.7 --band 1.2,1.7
//
// WARUM EIN EIGENES WERKZEUG (und nicht `--mode eval`):
// `eval` ablatiert die Top-K des Explore-Builds. Legendäre kommen dort praktisch nie vor — bei der
// Live-Chance PERK_LEGENDARY_BASE = 0,03 enthalten nur ~22 % der Läufe überhaupt einen legendären Perk und
// die Hälfte des Pools taucht in 40 Läufen KEIN EINZIGES Mal auf. Ohne angehobene Angebots-Chance ist jede
// Legendär-Messung reines Rauschen. Dieses Skript hebt daher SIM_PERK_LEGENDARY_BASE an (Default 0,7) —
// das verzerrt die HÄUFIGKEIT (die ist ohnehin ein separater Knopf), nicht die STÄRKE des einzelnen Perks.
//
// METHODIK (gepaarte Ablation, ein Referenz-Arm für alle):
//   priority = [alle Legendären …, Explore-Build …] → „nimm das Legendäre, wenn es angeboten wird, sonst
//   folge dem erkundeten Build". Da MAX_LEGENDARIES_PER_OFFER = 1 ist, liegt je Angebot HÖCHSTENS EIN
//   Legendäres — die Reihenfolge der Legendären in `priority` ist damit wirkungslos und der `full`-Arm ist
//   für ALLE Perks derselbe (einmal gerechnet). Je Perk L läuft nur der `drop`-Arm neu: identischer Seed,
//   identische Policy, einziger Unterschied ist, dass L nie gewählt wird. Kosten: (1 + n) × runs Läufe.
//
// LESART DER SPALTEN (alle bedingt auf „im Spiel", d. h. Δ ≠ 0 — siehe robustDelta in eval.js):
//   typ.×      exp(median(log(full/drop))) = typischer multiplikativer Effekt → DAS ist die Band-Zahl
//   Median-Δ   robuster absoluter Score-Beitrag
//   win%       Anteil der Läufe mit full > drop (Vorzeichentest, immun gegen Ausreißer)
//   anwendb.   Anteil der Seeds, in denen L überhaupt ins Spiel kam (Kontext-Häufigkeit, KEINE Stärke)
//   n          absolute Zahl dieser anwendbaren Läufe — unter ~15 ist das Urteil nicht belastbar
//
// Bewusst OHNE Zeitstempel im Output → gleicher Seed-Satz erzeugt byte-gleiches JSON (Reproduzierbarkeit, §9).

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

// Die Legendär-Chance MUSS vor dem Laden von constants.js stehen (envNum liest process.env beim Modul-Load).
// Darum unten dynamische Importe statt statischer — und die Mutation NUR im CLI-Pfad, damit ein Test, der
// dieses Modul importiert, nicht die globale Konstante für andere Sim-Module im selben Worker verbiegt.
const IS_CLI = !!process.argv[1] && process.argv[1].endsWith("perk-impact.mjs");
if (IS_CLI && !process.env.SIM_PERK_LEGENDARY_BASE) process.env.SIM_PERK_LEGENDARY_BASE = arg("--legchance", "0.7");

const { mkdirSync, writeFileSync } = await import("node:fs");
const { dirname } = await import("node:path");
const { runOne } = await import("./run.js");
const { fixedPolicy } = await import("./policies/fixed.js");
const { explorePriority, robustDelta } = await import("./eval.js");
const { PERK_LIST, isLegendary, PERK_DEFS } = await import("../src/game/perks.js");
const C = await import("../src/game/constants.js");

// Stabile Definitionsreihenfolge (PERK_LIST) → reproduzierbare Ausgabe unabhängig von Objekt-Iteration.
export const LEGENDARY_IDS = PERK_LIST.filter((p) => isLegendary(p.id)).map((p) => p.id);

// Rein & testbar (Analogon zu computeEval): deterministisch über die Seed-Sequenz.
//  seed0/exploreRuns  Explore-Phase (Referenzbuild). exploreRuns 0 → kein Explore, reiner Legendär-Vorrang.
//  runs               gepaarte Eval-Läufe je Perk, auf FRISCHEN, zu Explore disjunkten Seeds.
//  only               optionale id-Teilmenge (Default: alle Legendären).
//  pickFrom           optionaler Pick-Zeitpunkt: die gemessenen Perks sind erst ab diesem Durchlauf wählbar
//                     (früh vs. spät erworben). Gilt in BEIDEN Armen → die Ablation bleibt gepaart und fair.
export function computePerkImpact({ seed0 = 1, runs = 80, exploreRuns = 300, c = 1.4, env = {}, only = null, pickFrom = 0 } = {}) {
  const ids = only && only.length ? LEGENDARY_IDS.filter((id) => only.includes(id)) : LEGENDARY_IDS;

  // 1) Referenzbuild aus dem Explore (dieselbe Quelle wie `--mode eval` → kein Drift der Vergleichsbasis).
  //    Das Explore läuft OHNE gate (es soll den Referenzbuild finden, nicht den Zeitpunkt testen).
  const { priority: explored } = exploreRuns > 0 ? explorePriority({ seed0, exploreRuns, c, env }) : { priority: [] };
  // Legendäre GANZ nach vorn: sie sind der Messgegenstand und sollen immer gewählt werden, wenn angeboten.
  const tail = explored.filter((id) => !LEGENDARY_IDS.includes(id));
  const priority = [...LEGENDARY_IDS, ...tail];

  // 2) Referenz-Arm. Ohne pickFrom EINMAL für alle Perks (s. Methodik oben: höchstens ein Legendäres je Angebot).
  //    MIT pickFrom hängt der full-Arm am gegateten Perk → je Perk ein eigener Referenz-Arm (Kosten 2n × runs).
  const evalSeed0 = seed0 + exploreRuns;
  const gateFor = (id) => (pickFrom > 0 ? { id, fromCycle: pickFrom } : null);
  const scoresFor = (pol) => { const out = []; for (let i = 0; i < runs; i++) out.push(runOne(evalSeed0 + i, pol).score); return out; };
  const sharedFull = pickFrom > 0 ? null : scoresFor(fixedPolicy(priority, { ...env }));

  // 3) Je Perk der drop-Arm auf denselben Seeds.
  let lastFull = sharedFull;
  const perks = ids.map((id) => {
    const fullScores = sharedFull ?? scoresFor(fixedPolicy(priority, { ...env, gate: gateFor(id) }));
    lastFull = fullScores;
    const abl = fixedPolicy(priority, { ...env, drop: id, gate: gateFor(id) });
    const deltas = [], ratios = [];
    for (let i = 0; i < runs; i++) {
      const dScore = runOne(evalSeed0 + i, abl).score;
      deltas.push(fullScores[i] - dScore);
      ratios.push(Math.log(Math.max(1, fullScores[i]) / Math.max(1, dScore))); // Log-Verhältnis (clamp gegen 0)
    }
    const marginal = robustDelta(deltas, ratios);
    return {
      id,
      label: PERK_DEFS[id].label,
      cat: PERK_DEFS[id].cat,
      needsArchitect: !!PERK_DEFS[id].needsArchitect,
      applicableN: deltas.filter((d) => d !== 0).length, // absolute Stichprobe hinter allen bedingten Maßen
      ratio: 1 + marginal.pctEffect,                     // typischer multiplikativer Effekt = die Band-Zahl
      marginal,
    };
  });
  perks.sort((a, b) => b.ratio - a.ratio);

  // Score-Verteilung des Referenz-Arms. Mit pickFrom gibt es je Perk einen eigenen — dann ist es der des zuletzt
  // gemessenen (bei --only die einzig relevante Zahl; bei mehreren Perks nur grobe Diagnose, daher so markiert).
  const sorted = [...(lastFull || [])].sort((a, b) => a - b);
  const p = (q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * q))] : 0);
  return {
    legendaryChance: C.PERK_LEGENDARY_BASE,
    seed0, exploreRuns, runs, evalSeed0, c, pickFrom,
    fullScoreShared: !pickFrom, // false = fullScore stammt vom zuletzt gemessenen Perk, nicht von allen
    fullScore: { n: sorted.length, mean: sorted.reduce((t, v) => t + v, 0) / (sorted.length || 1), p50: p(0.5), p90: p(0.9) },
    priorityTail: tail.slice(0, 10), // Referenzbuild ohne die vorangestellten Legendären (Diagnose)
    perks,
  };
}

/* ---- CLI ---- */
if (IS_CLI) {
  const MIN_APPLICABLE = 15; // darunter ist das bedingte Urteil zu dünn → als „dünn" markieren, nicht werten
  const band = String(arg("--band", "1.2,1.7")).split(",").map(Number);
  const only = arg("--only", null);
  const out = arg("--out", "sim/out/perk-impact.json");
  const res = computePerkImpact({
    seed0: Number(arg("--seed", 1)),
    runs: Number(arg("--runs", 80)),
    exploreRuns: Number(arg("--explore", 300)),
    c: Number(arg("--c", 1.4)),
    // architectGreedy default AN: mit Zufallsbau schließt der Architekt median 1 statt 6 Strukturen, womit sich
    // JEDER Gebäude-Perk gegen ein kaputtes Brett misst (Richtfest/Bauhütte lasen sich deshalb als 1,00×).
    // Der Baufeld-Deckel wird in beiden Modi voll ausgereizt (24/24) — es ist die PLANUNG, die fehlt, nicht die Fläche.
    env: { solveFormations: arg("--formations", "0") === "1", frontLoad: arg("--frontload", "0") === "1", architectGreedy: arg("--greedyarch", "1") !== "0" },
    only: only ? only.split(",").map((s) => s.trim()).filter(Boolean) : null,
    pickFrom: Number(arg("--pickfrom", 0)),
  });

  const f = (x) => Math.round(x).toLocaleString("en-US");
  console.log(`sim 'perk-impact': Legendär-Chance ${res.legendaryChance} · explore ${res.exploreRuns} (seeds ${res.seed0}..${res.seed0 + res.exploreRuns - 1}) · eval ${res.runs} (seeds ${res.evalSeed0}..${res.evalSeed0 + res.runs - 1})`);
  const ctx = [arg("--frontload", "0") === "1" && "FRONT-LOAD-Gegner", arg("--formations", "0") === "1" && "Formations-Solver", res.pickFrom > 0 && `Pick erst ab Durchlauf ${res.pickFrom}`].filter(Boolean).join(" · ");
  if (ctx) console.log(`  Kontext: ${ctx}`);
  console.log(`  Referenz-Arm full-score${res.fullScoreShared ? "" : " (zuletzt gemessener Perk)"}: median ${f(res.fullScore.p50)}  mean ${f(res.fullScore.mean)}  p90 ${f(res.fullScore.p90)}`);
  console.log(`  Referenzbuild (Top 10 nach explore-mean, ohne Legendäre): ${res.priorityTail.join(", ") || "—"}`);
  console.log(`  Ziel-Band ${band[0]}–${band[1]}× (constants.js:165). Sortiert nach typ.× :`);
  console.log(`    ${"id".padEnd(9)} ${"Perk".padEnd(16)} ${"typ.×".padStart(7)}  ${"Median-Δ".padStart(12)}  ${"win%".padStart(5)}  ${"anwendb.".padStart(8)}  ${"n".padStart(4)}   Verdikt`);
  for (const pk of res.perks) {
    const m = pk.marginal;
    const verdict = pk.applicableN < MIN_APPLICABLE ? "dünn — mehr --runs"
      : pk.ratio < band[0] ? "UNTER Band"
      : pk.ratio > band[1] ? "ÜBER Band"
      : "im Band";
    console.log(`    ${pk.id.padEnd(9)} ${(pk.label + (pk.needsArchitect ? " ⚑" : "")).padEnd(16)} ${pk.ratio.toFixed(2).padStart(6)}×  ${f(m.median).padStart(12)}  ${(m.winRate * 100).toFixed(0).padStart(4)}%  ${(m.applicableRate * 100).toFixed(0).padStart(7)}%  ${String(pk.applicableN).padStart(4)}   ${verdict}`);
  }
  const thin = res.perks.filter((pk) => pk.applicableN < MIN_APPLICABLE).length;
  if (thin) console.log(`  Hinweis: ${thin} Perk(s) unter ${MIN_APPLICABLE} anwendbaren Läufen — für ein Urteil --runs erhöhen.`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(res, null, 2));
  console.log(`  → ${out}`);
}
