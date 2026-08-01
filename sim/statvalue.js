// Stat-Wert-Diagnose (--mode stats). Misst den KONDITIONALEN Marginalwert der 5 Stats: für jede Stat-Strategie
// (mono je Stat + Crit-Paar + Random-Baseline) den End-Score in drei Build-Kontexten — Mix (neutral), Blitz
// (Crit-Kontext), Eis (Formations-/Serien-Kontext). Der „Lift" = Median ÷ Random-Stat-Median DESSELBEN Kontexts.
//   Lift flach-hoch über alle Kontexte → universeller Auto-Pick (ungesund).
//   Lift spitzt in EINEM Kontext         → echte Spezialisierung (gesund).
import { runOne } from "./run.js";
import { randomPolicy } from "./policies/random.js";
import { factionPolicy } from "./policies/faction.js";
import { statPolicy, activePolicy } from "./policies/stat.js";

const median = (a) => quantile(a, 0.5);
const mean = (a) => a.reduce((t, v) => t + v, 0) / a.length;
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
const fmt = (n) => Math.round(n).toLocaleString("de-DE");

// Kontexte = Build-Basis (Skills), über die die Stat-Strategie gelegt wird.
const CONTEXTS = [
  ["Mix", () => randomPolicy()],
  ["Blitz", () => factionPolicy("lightning")],
  ["Eis", () => factionPolicy("ice")],
];
// Strategien (Zeilen). "random" = Referenz je Kontext.
const STRATS = [
  ["random", "Random-Stat (Ref.)"],
  ["critChance", "Crit-Chance solo"],
  ["critMult", "Crit-Mult solo"],
  ["crit-pair", "Crit-Paar (Chance+Mult)"],
  ["formMult", "Formation solo"],
  ["streakMult", "Serie solo"],
];

function measure(strategy, baseFactory, runs, seed0) {
  const policy = statPolicy(strategy, baseFactory());
  const results = Array.from({ length: runs }, (_, i) => runOne(seed0 + i, policy));
  const scores = results.map((r) => r.score);
  return {
    median: median(scores), mean: mean(scores),
    winrate: mean(results.map((r) => r.wins / r.tricks)),
    critRate: mean(results.map((r) => (r.wins ? r.crits / r.wins : 0))), // Crits je Sieg → erklärt Crit-Stat-Wert
  };
}

export function runStats({ arg, seed0 } = {}) {
  const runs = Number((arg && arg("--runs", 200)) || 200);
  console.log(`\n=== STAT-WERT (Stat-Strategie über Build-Kontext, ${runs} Runs, Seeds ${seed0}..${seed0 + runs - 1}) ===`);

  // Matrix: [strategy][context] → measure. Baseline je Kontext = "random".
  const cell = {};
  for (const [sid] of STRATS) { cell[sid] = {}; for (const [cName, cFac] of CONTEXTS) cell[sid][cName] = measure(sid, cFac, runs, seed0); }
  const baseMed = Object.fromEntries(CONTEXTS.map(([cName]) => [cName, cell["random"][cName].median]));

  // Pro Kontext: Median · Lift · Winrate · Crit/Sieg.
  for (const [cName] of CONTEXTS) {
    console.log(`\n  — Kontext ${cName}${cName === "Mix" ? " (neutral)" : cName === "Blitz" ? " (Crit-Erzeuger)" : " (Formation/Serie)"} · Random-Stat-Median ${fmt(baseMed[cName])} —`);
    console.log(`    Strategie                 Median     Lift    Winrate  Crit/Sieg`);
    for (const [sid, label] of STRATS) {
      const m = cell[sid][cName];
      const lift = m.median / baseMed[cName];
      const flag = sid === "random" ? "" : lift >= 1.10 ? "  ▲" : lift <= 0.97 ? "  ▽" : "";
      console.log(`    ${label.padEnd(24)} ${fmt(m.median).padStart(9)}  ${lift.toFixed(2)}×   ${(m.winrate * 100).toFixed(1).padStart(5)}%   ${m.critRate.toFixed(2)}${flag}`);
    }
  }

  // QUERVERGLEICH: Lift je Strategie über die Kontexte — die Kern-Sicht.
  console.log(`\n  === QUERVERGLEICH — Lift (Median ÷ Random-Stat) je Kontext ===`);
  console.log(`    Strategie                 ${CONTEXTS.map(([c]) => c.padStart(7)).join("  ")}    Signatur`);
  for (const [sid, label] of STRATS) {
    if (sid === "random") continue;
    const lifts = CONTEXTS.map(([cName]) => cell[sid][cName].median / baseMed[cName]);
    const min = Math.min(...lifts), max = Math.max(...lifts);
    // universell = überall ≥1,08; spezialisiert = Spanne groß (max/min); tot = überall ≤1,0.
    const sig = min >= 1.08 ? "universell (Auto-Pick-Verdacht)" : max / min >= 1.15 ? "spezialisiert (kontext-abhängig)" : max <= 1.03 ? "schwach/tot" : "moderat";
    console.log(`    ${label.padEnd(24)} ${lifts.map((l) => (l.toFixed(2) + "×").padStart(7)).join("  ")}    ${sig}`);
  }
  // LEAVE-ONE-OUT: balancierter Random-Build OHNE je einen Stat → Defizit vs. voller Random-Build = Marginalbeitrag.
  // Sauberer als Mono (kein Über-Investment): großes Defizit überall = universeller Must-Have (Auto-Pick).
  const STATS_LOO = ["critChance", "critMult", "formMult", "streakMult"];
  const LABEL = { critChance: "ohne Crit-Chance", critMult: "ohne Crit-Mult", formMult: "ohne Formation", streakMult: "ohne Serie" };
  console.log(`\n  === LEAVE-ONE-OUT — Defizit ggü. vollem Random-Build (fehlender Stat = Marginalbeitrag) ===`);
  console.log(`    Weggelassen               ${CONTEXTS.map(([c]) => c.padStart(8)).join("  ")}    Signatur`);
  for (const sid of STATS_LOO) {
    const defs = CONTEXTS.map(([cName, cFac]) => 1 - measure(`not:${sid}`, cFac, runs, seed0).median / baseMed[cName]);
    const min = Math.min(...defs), max = Math.max(...defs);
    // positives Defizit = fehlt → beiträgt; universell = überall ≥6 %; spezialisiert = Spanne groß.
    const sig = min >= 0.06 ? "Must-Have (universell)" : max - min >= 0.08 ? "spezialisiert (kontext-abhängig)" : max <= 0.03 ? "entbehrlich" : "moderat";
    console.log(`    ${LABEL[sid].padEnd(24)} ${defs.map((d) => ((d >= 0 ? "−" : "+") + Math.abs(d * 100).toFixed(0) + "%").padStart(8)).join("  ")}    ${sig}`);
  }
  console.log(`\n  Lesart: ▲ Lift ≥1,10 · ▽ Lift ≤0,97. „Crit/Sieg" = Ø Crits/Sieg. LOO: −X % = Score fällt ohne den Stat (= er trägt bei); +X % = Build ist ohne ihn sogar besser.`);

  // AKTIV-SPIEL-KONTEXT: Formations-Solver + Ziel-Shop über Eis. Fairer Test für Formation-/Shop-Stats,
  // die bei naiver Basis nichts zu greifen haben. Teurer (Solver) → eigener, kleinerer Run-Count.
  const aRuns = Number((arg && arg("--activeRuns", 100)) || 100);
  const aFac = () => activePolicy(factionPolicy("ice"), { solveFormations: true, buyShop: true });
  console.log(`\n  === AKTIV-SPIEL (Eis + Formations-Solver + Ziel-Shop, ${aRuns} Runs) — fairer Test für Formation/Shop ===`);
  const aBase = measure("random", aFac, aRuns, seed0);
  console.log(`    Random-Stat-Median ${fmt(aBase.median)} · Formations-Winrate ${(aBase.winrate * 100).toFixed(1)}%`);
  console.log(`    Strategie                 Median     Lift   (naiv-Eis zum Vergleich)`);
  const naiveEis = { formMult: cell["formMult"]["Eis"].median / baseMed["Eis"], streakMult: cell["streakMult"]["Eis"].median / baseMed["Eis"], "crit-pair": cell["crit-pair"]["Eis"].median / baseMed["Eis"] };
  for (const [sid, label] of [["formMult", "Formation solo"], ["streakMult", "Serie solo"], ["crit-pair", "Crit-Paar (Referenz)"]]) {
    const m = measure(sid, aFac, aRuns, seed0);
    const lift = m.median / aBase.median;
    const flag = lift >= 1.10 ? "  ▲" : lift <= 0.97 ? "  ▽" : "";
    const cmp = naiveEis[sid] != null ? `naiv ${naiveEis[sid].toFixed(2)}×` : "";
    console.log(`    ${label.padEnd(24)} ${fmt(m.median).padStart(9)}  ${lift.toFixed(2)}×${flag.padEnd(4)}  ${cmp}`);
  }
  const defForm = 1 - measure("not:formMult", aFac, aRuns, seed0).median / aBase.median;
  console.log(`    LOO ohne Formation:  ${(defForm >= 0 ? "−" : "+") + Math.abs(defForm * 100).toFixed(0) + "%"} Defizit`);
  console.log(`    → Hebt die Count-Skalierung den Formations-Stat im Formations-Kontext aus dem toten Bereich? (vorher naiv 0,92× / aktiv 1,01×)`);
  return cell;
}
