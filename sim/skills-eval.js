// Große Auswertung Feuer/Blitz (--mode skills): realistische Läufe, gierige Picks, gemischte Builds, JE STUFE.
//
//  1) EXPLORE: stufenbewusste UCB-Läufe (greedyPolicy explore) in der Welt der genannten Archetypen — jeder Arm
//     (Skill, Stufe, Bucket) wird sicher probiert. Daraus: Lift je Skill und Stufe = Ø-Score der Läufe, die die Stufe
//     halten, ÷ Ø aller Explore-Läufe (Deckung über die Raritäten, Ausreißer nach oben und unten je Stufe).
//  2) GREEDY: auf frischen Seeds spielt der „kompetente Spieler" (Greedy nach der eingefrorenen Wertetabelle) — die
//     Score-Verteilung realer, gemischter Läufe plus die Haltequote je Skill (nimmt ihn ein guter Spieler?).
//  3) ABLATION: je Skill der Greedy-Lauf ohne diesen Skill (alle Stufen) auf denselben Seeds, gepaart → Marginalwert
//     (robustDelta aus eval.js): Median-Δ, typischer multiplikativer Effekt, Vorzeichen-Quote, Anwendbarkeit.
//  Flags: „stark" (typ. ≥ +25 % oder win ≥ 80 %), „tot" (|typ.| < 3 % bei win 42–58 %), „schadet" (typ. ≤ −5 % oder
//  win ≤ 40 %), „selten" (unter 5 % der Läufe im Spiel), „Leiter" (eine höhere Stufe liegt im Lift ≥ 5 % unter einer
//  niedrigeren, je n ≥ 8). Bewusst OHNE Zeitstempel im JSON (gleicher Seed-Satz → byte-gleiche Datei).
import { runOne } from "./run.js";
import { newMemory } from "./memory.js";
import { greedyPolicy, buildValueTable } from "./policies/greedy.js";
import { randomPolicy } from "./policies/random.js";
import { greedyFormationStep } from "./formation.js";
import { robustDelta } from "./eval.js";
import { SKILL_DEFS, archetypeOf, isLegendarySkill, SKILL_TIER_COUNT } from "../src/game/skills.js";

/* --policy random (Owner, 2026-09-05): dieselbe Auswertung mit ZUFÄLLIGEN Picks statt gieriger — „ein besseres Gefühl"
   dafür, was ein Skill im gewöhnlichen Lauf tut, nicht im optimierten. Der Zufallsspieler nimmt aus jeder Tür und jedem
   Angebot irgendetwas; Aufstellung und Architekt spielt er greedy wie der gierige Spieler (sonst vergliche man zwei
   Dinge auf einmal). Lift je Stufe aus den Zufallsläufen (mit ÷ ohne), die Ablation = Zufallsspieler, der den Skill nie
   nimmt, auf denselben Seeds — seine übrigen Züge verschieben sich dadurch, das Paar ist also lockerer als beim Greedy. */
function randomPlayer({ exclude = [] } = {}) {
  const base = randomPolicy({ architectGreedy: true, exclude });
  return { name: exclude.length ? `random(exclude=${exclude[0]})` : "random+forms",
    act(s, rng, mem) { return s.phase === "formation" ? greedyFormationStep(s) : base.act(s, rng, mem); } };
}

const TIER_LABEL = ["N", "S", "SS", "E"];
const NAME = { fire: "Feuer", lightning: "Blitz", ice: "Eis", plant: "Pflanze" };
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return 0; const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
const mean = (a) => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : 0);
const stats = (a) => ({ n: a.length, median: quantile(a, 0.5), mean: mean(a), p90: quantile(a, 0.9), p95: quantile(a, 0.95) });

const holds = (row, id, tier) => row.skills.includes(id) && (tier == null || isLegendarySkill(id) || ((row.tiers || {})[id] ?? 0) === tier);

export function flagFor(row) {
  const m = row.marginal;
  const flags = [];
  if (m) {
    if (m.applicableRate < 0.05) flags.push("selten");
    else if (m.pctEffect >= 0.25 || m.winRate >= 0.8) flags.push("stark");
    else if (m.pctEffect <= -0.05 || m.winRate <= 0.4) flags.push("schadet");
    else if (Math.abs(m.pctEffect) < 0.03 && m.winRate > 0.42 && m.winRate < 0.58) flags.push("tot");
  }
  if (!row.legendary) {
    const lifts = row.tiers.map((t) => (t.n >= 8 ? t.lift : null));
    for (let i = 1; i < lifts.length; i++) {
      const lower = lifts.slice(0, i).filter((x) => x != null);
      if (lifts[i] != null && lower.length && lifts[i] < Math.max(...lower) - 0.05) { flags.push("Leiter"); break; }
    }
  }
  return flags.join(",");
}

export function computeSkillsEval({ seed0 = 1, exploreRuns = 1200, runs = 200, arch = ["fire", "lightning"], ablate = true, c = 1.4, solveFormations = true, policy = "greedy", log = null } = {}) {
  const opts = { archetypes: arch };
  const say = (m) => { if (log) log(m); };
  const random = policy === "random";
  // 1) Explore — stufenbewusst, mit Gedächtnis (random: schlichte Zufallsläufe, das Gedächtnis bleibt leer).
  const mem = newMemory();
  const ex = random ? randomPlayer() : greedyPolicy({ explore: true, c, solveFormations });
  const exploreRows = [];
  for (let i = 0; i < exploreRuns; i++) {
    const r = runOne(seed0 + i, ex, mem, null, opts);
    exploreRows.push({ score: r.score, skills: r.build.skills, tiers: r.build.skillTiers });
    if ((i + 1) % 200 === 0) say(`  explore ${i + 1}/${exploreRuns}`);
  }
  const table = random ? null : buildValueTable(mem);
  // 2) Greedy — frische Seeds, eingefrorene Tabelle, kein Lernen (random: weitere Zufallsläufe auf frischen Seeds).
  const evalSeed0 = seed0 + exploreRuns;
  const greedy = random ? randomPlayer() : greedyPolicy({ explore: false, table, solveFormations });
  const evalRows = [];
  for (let i = 0; i < runs; i++) {
    const r = runOne(evalSeed0 + i, greedy, null, null, opts);
    evalRows.push({ score: r.score, skills: r.build.skills, tiers: r.build.skillTiers, winrate: r.wins / r.tricks });
  }
  say(`  ${random ? "random" : "greedy"} ${runs} Läufe`);
  // 3) Je Skill: Lift je Stufe (Explore), Haltequote (Greedy), Ablation (Greedy, gepaart).
  const ids = Object.keys(SKILL_DEFS).filter((id) => arch.includes(archetypeOf(id)));
  const overall = mean(exploreRows.map((r) => r.score));
  const liftOf = (pred) => { const held = exploreRows.filter(pred); return { n: held.length, lift: held.length ? mean(held.map((r) => r.score)) / overall : null }; };
  const skills = ids.map((id, k) => {
    const legendary = isLegendarySkill(id);
    const tierRows = legendary
      ? [{ tier: "L", ...liftOf((r) => holds(r, id, null)), heldRate: mean(evalRows.map((r) => (holds(r, id, null) ? 1 : 0))) }]
      : Array.from({ length: SKILL_TIER_COUNT }, (_, t) => ({ tier: TIER_LABEL[t], ...liftOf((r) => holds(r, id, t)), heldRate: mean(evalRows.map((r) => (holds(r, id, t) ? 1 : 0))) }));
    const any = liftOf((r) => holds(r, id, null));
    const row = { id, name: SKILL_DEFS[id].name, arch: archetypeOf(id), legendary, tiers: tierRows,
      lift: any.lift, n: any.n, heldRate: mean(evalRows.map((r) => (holds(r, id, null) ? 1 : 0))), marginal: null };
    if (ablate) {
      const abl = random ? randomPlayer({ exclude: [id] }) : greedyPolicy({ explore: false, table, drop: id, solveFormations });
      const deltas = [], ratios = [];
      for (let i = 0; i < runs; i++) {
        const d = runOne(evalSeed0 + i, abl, null, null, opts).score;
        deltas.push(evalRows[i].score - d);
        ratios.push(Math.log(Math.max(1, evalRows[i].score) / Math.max(1, d)));
      }
      row.marginal = robustDelta(deltas, ratios);
      say(`  ablation ${k + 1}/${ids.length} ${row.name}`);
    }
    row.flags = flagFor(row);
    return row;
  });
  skills.sort((a, b) => (b.marginal ? b.marginal.median : b.lift) - (a.marginal ? a.marginal.median : a.lift));
  return { arch, policy, exploreRuns, runs, evalSeed0, c, exploreScore: stats(exploreRows.map((r) => r.score)),
    greedyScore: stats(evalRows.map((r) => r.score)), greedyWinrate: mean(evalRows.map((r) => r.winrate)),
    greedySkillsHeld: mean(evalRows.map((r) => r.skills.length)), skills };
}

export function runSkillsEval({ arg, seed0, c, f, write }) {
  const res = computeSkillsEval({
    seed0,
    exploreRuns: Number(arg("--explore", 1200)),
    runs: Number(arg("--runs", 200)),
    arch: String(arg("--arch", "fire,lightning")).split(",").filter(Boolean),
    ablate: arg("--ablate", "1") !== "0",
    solveFormations: arg("--formations", "1") !== "0",
    policy: arg("--policy", "greedy") === "random" ? "random" : "greedy",
    c,
    log: (m) => console.log(m),
  });
  const pct = (x) => `${(x * 100).toFixed(0)}%`;
  const who = res.policy === "random" ? "Random" : "Greedy";
  console.log(`\n=== SKILLS ${res.arch.map((a) => NAME[a] || a).join(" / ")} — ${res.policy === "random" ? "random" : "explore"} ${res.exploreRuns} (Seeds ${seed0}..${seed0 + res.exploreRuns - 1}), ${who.toLowerCase()} ${res.runs} (Seeds ${res.evalSeed0}..${res.evalSeed0 + res.runs - 1}) ===`);
  console.log(`  ${res.policy === "random" ? "Random-Score (Lift-Läufe)" : "Explore-Score"}: Median ${f(res.exploreScore.median)}  Mean ${f(res.exploreScore.mean)}  p90 ${f(res.exploreScore.p90)}`);
  console.log(`  ${who}-Score:  Median ${f(res.greedyScore.median)}  Mean ${f(res.greedyScore.mean)}  p90 ${f(res.greedyScore.p90)}  p95 ${f(res.greedyScore.p95)}  Siegquote ${pct(res.greedyWinrate)}  Ø Skills ${res.greedySkillsHeld.toFixed(1)}`);
  const tierTxt = (r) => r.tiers.map((t) => `${t.tier}${t.lift == null ? " —" : ` ${t.lift.toFixed(2)}`}${t.n < 8 ? "?" : ""}`).join(" ");
  for (const a of res.arch) {
    console.log(`\n  ${(NAME[a] || a).toUpperCase()} — sortiert nach Median-Δ der Ablation (${who}, gepaart); Lift je Stufe aus den ${res.policy === "random" ? "Zufallsläufen" : "Explore-Läufen"} (? = n<8)`);
    console.log(`    ${"Skill".padEnd(17)} ${"Halte".padStart(5)}  ${"Lift".padStart(5)}  ${"Median-Δ".padStart(11)}  ${"typ.".padStart(6)}  ${"win".padStart(4)}  ${"anw.".padStart(4)}  Stufen (Lift)                          Flag`);
    for (const r of res.skills.filter((s) => s.arch === a)) {
      const m = r.marginal;
      console.log(`    ${r.name.padEnd(17)} ${pct(r.heldRate).padStart(5)}  ${(r.lift == null ? "—" : r.lift.toFixed(2)).padStart(5)}  ${(m ? f(m.median) : "—").padStart(11)}  ${(m ? `${(m.pctEffect * 100).toFixed(0)}%` : "—").padStart(6)}  ${(m ? pct(m.winRate) : "—").padStart(4)}  ${(m ? pct(m.applicableRate) : "—").padStart(4)}  ${tierTxt(r).padEnd(38)} ${r.flags}`);
    }
  }
  const list = (flag) => res.skills.filter((s) => s.flags.split(",").includes(flag)).map((s) => `${s.name} (${(NAME[s.arch] || s.arch).slice(0, 2)})`).join(" · ") || "keine";
  console.log(`\n  stark:   ${list("stark")}`);
  console.log(`  tot:     ${list("tot")}`);
  console.log(`  schadet: ${list("schadet")}`);
  console.log(`  selten:  ${list("selten")}`);
  console.log(`  Leiter:  ${list("Leiter")}`);
  write(res);
}
