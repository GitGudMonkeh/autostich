// Pacing-Analyse (Sim S6). Misst, WANN im Run der Score entsteht — die Verteilung über die
// 44 Cycles (Runden), nicht nur den Endscore. Ziel-Frage des Balance-Redesigns:
//   „Fühlt sich Early/Mid befriedigend an, und explodiert das Late-Game NUR bei guten Builds
//    (nicht mehr flächendeckend)?"
//
// Dafür braucht es Verteilungs-Kennzahlen, keine bloßen Mediane:
//  - cumShare[c]      Anteil des Endscores, der bis Ende Cycle c erreicht ist (Median-Kurve = Typ-Run).
//  - last10Share      Anteil des Endscores in den letzten 10 Cycles (35–44) — je Run.
//  - spikeFactor      Ø-Score/Cycle der letzten 10 ÷ Ø-Score/Cycle der ersten 34 (1 = flach, hoch = spät).
//  Für last10Share / spikeFactor berichten wir p10/p50/p90 ÜBER die Runs:
//    p50 hoch  → der TYPISCHE Run ist spät-lastig (schlecht fürs Mid-Game-Gefühl).
//    p90≫p50   → nur die besten Builds explodieren spät (erwünscht).
//    p10 hoch  → sogar schwache Runs explodieren spät → „durch die Bank" (unerwünscht).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { runOne } from "./run.js";
import { randomPolicy } from "./policies/random.js";
import { ucbPolicy } from "./policies/ucb.js";
import { factionPolicy } from "./policies/faction.js";
import { newMemory } from "./memory.js";
import { MAX_CYCLES, TRICKS_PER_CYCLE } from "../src/game/constants.js";

const CYCLES = MAX_CYCLES;      // 44
const TPC = TRICKS_PER_CYCLE;   // 40

function quantile(sorted, q) {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const pctl = (vals, q) => quantile([...vals].sort((a, b) => a - b), q);

// EINEN Run mit Pro-Cycle-Score-Kurve. Nutzt den kanonischen runOne-Loop (Determinismus-treu)
// und sammelt via onTrick-Hook den kumulativen Score am Ende jedes Cycles.
function runWithCurve(seed, policy, mem = null) {
  const cum = new Array(CYCLES + 1).fill(0);
  const res = runOne(seed, policy, mem, {
    onTrick: (s) => {
      if (s.trickNo % TPC === 0) {
        const c = s.trickNo / TPC;
        if (c >= 1 && c <= CYCLES) cum[c] = s.score;
      }
    },
  });
  for (let c = 1; c <= CYCLES; c++) if (cum[c] === 0 && c > 1) cum[c] = cum[c - 1]; // Lücken monoton füllen
  cum[CYCLES] = res.score;
  return { seed, final: res.score, cum };
}

// Fenster relativ zur Rundenlänge (statt fest „letzte 10 von 44") → 44/60/80 werden vergleichbar.
const TAIL = Math.max(1, Math.round(CYCLES * 0.2));   // Schwanz = letztes Fünftel des Runs
const TAIL_START = CYCLES - TAIL;                     // cum-Index, ab dem der Schwanz zählt
const HALF = Math.max(1, Math.round(CYCLES * 0.5));

// Verteilungs-Metriken für einen Satz Runs.
function metrics(runs) {
  const finals = runs.map((r) => r.final);
  const dist = (vals) => ({ p10: pctl(vals, 0.1), p50: pctl(vals, 0.5), p90: pctl(vals, 0.9) });
  // Median-Kurve: cumShare[c] als Median über Runs (0..1).
  const cumShareMedian = [];
  for (let c = 0; c <= CYCLES; c++) {
    cumShareMedian[c] = c === 0 ? 0 : pctl(runs.map((r) => r.cum[c] / (r.final || 1)), 0.5);
  }
  const shareBy = (c) => runs.map((r) => r.cum[c] / (r.final || 1));
  const tailShare = runs.map((r) => 1 - r.cum[TAIL_START] / (r.final || 1));     // Anteil im letzten Fünftel
  const spike = runs.map((r) => {
    const early = r.cum[TAIL_START] / TAIL_START;                                // Ø-Score/Cycle vor dem Schwanz
    const late = (r.final - r.cum[TAIL_START]) / TAIL;                           // Ø-Score/Cycle im Schwanz
    return early > 0 ? late / early : 0;
  });
  // Pro-Run-Kurvenform (Score-Zuwachs je Cycle) → beantwortet direkt „hört man auf, wenn's gut wird?":
  //   peakC       Cycle mit dem HÖCHSTEN Einzel-Cycle-Score (wo das Build am meisten liefert).
  //   onlineC     erster Cycle, dessen Zuwachs ≥ 50 % des Peaks trägt („Build kommt online").
  //   stillRising Score/Cycle steigt IM LETZTEN Cycle noch → der Payoff wird vom Run-Ende abgeschnitten.
  //   endAccel    Score/Cycle[N] ÷ [N-1] (> 1 = am Schluss noch beschleunigend).
  // peakC/onlineC auch als Anteil der Rundenlänge (peakFrac/onlineFrac) → über 44/60/80 vergleichbar.
  const shape = runs.map((r) => {
    const inc = new Array(CYCLES + 1).fill(0);
    for (let c = 1; c <= CYCLES; c++) inc[c] = r.cum[c] - r.cum[c - 1];
    let peakC = 1, peakV = inc[1];
    for (let c = 2; c <= CYCLES; c++) if (inc[c] > peakV) { peakV = inc[c]; peakC = c; }
    let onlineC = peakC;
    for (let c = 1; c <= CYCLES; c++) if (inc[c] >= 0.5 * peakV) { onlineC = c; break; }
    const endAccel = inc[CYCLES - 1] > 0 ? inc[CYCLES] / inc[CYCLES - 1] : 0;
    return { peakC, onlineC, endAccel, rising: inc[CYCLES] > inc[CYCLES - 1] ? 1 : 0,
             peakFrac: peakC / CYCLES, onlineFrac: onlineC / CYCLES };
  });
  const pick = (k) => shape.map((s) => s[k]);
  // „Flächendeckend?"-Indikator: Anteil der Runs, deren Schwanz > 45 % des Endscores trägt.
  const share45 = tailShare.filter((v) => v > 0.45).length / (runs.length || 1);
  return {
    cyclesN: CYCLES, tailN: TAIL,
    finalP50: pctl(finals, 0.5), finalP90: pctl(finals, 0.9),
    cumShareMedian,
    byHalf: dist(shareBy(HALF)), byTailStart: dist(shareBy(TAIL_START)),
    tailShare: dist(tailShare), spike: dist(spike),
    peakCycle: dist(pick("peakC")), peakFrac: dist(pick("peakFrac")),
    onlineCycle: dist(pick("onlineC")), onlineFrac: dist(pick("onlineFrac")),
    endAccel: dist(pick("endAccel")),
    stillRisingShare: pick("rising").reduce((a, b) => a + b, 0) / (runs.length || 1),
    lateHeavyShare: share45,
  };
}

// Vergleich mehrerer Rundenlängen nebeneinander: `--mode pacing --cycles 44,60,80 [--factions]`.
// Jede Länge läuft in EINEM eigenen Node-Subprozess (echte Modul-Isolation → keine mutable Globals;
// MAX_CYCLES/DECISION_SCHEDULE werden pro Prozess frisch aus SIM_MAX_CYCLES gebaut). Wir lesen das je Länge
// geschriebene JSON und stellen die Kernzahlen je Fraktion gegenüber. Beantwortet die Design-Frage:
// „Fängt ein längerer Run den Payoff ein — oder bläst er nur den Late-Spike auf?"
function runPacingCompare({ arg, seed0, f }) {
  const list = String(arg("--cycles", "44,60,80")).split(",").map((x) => parseInt(x.trim(), 10)).filter((n) => n > 0);
  const N = Number(arg("--runs", 300));
  const factions = !!arg("--factions", "");
  const pctS = (x) => `${(x * 100).toFixed(1)}%`;
  const data = {};
  console.log(`Pacing-Vergleich — Rundenlängen ${list.join(", ")} · ${N} Runs je Länge${factions ? " · je Fraktion" : ""}`);
  for (const n of list) {
    const outFile = `sim/out/cmp-pacing-${n}.json`;
    const a = ["sim/batch.js", "--mode", "pacing", "--runs", String(N), "--seed", String(seed0), "--out", outFile];
    if (factions) a.push("--factions", "1");
    console.log(`  … ${n} Cycles`);
    execFileSync(process.execPath, a, { env: { ...process.env, SIM_MAX_CYCLES: String(n) }, stdio: ["ignore", "ignore", "inherit"] });
    data[n] = JSON.parse(readFileSync(outFile, "utf8"));
  }
  const keys = factions ? [["FEUER", "fire"], ["BLITZ", "lightning"], ["EIS", "ice"], ["MIX", "mix"]]
                        : [["RANDOM", "random"], ["UCB", "ucb"]];
  const rows = [
    ["Endscore p50",       (m) => f(m.finalP50)],
    ["Peak-Cycle% p50",    (m) => pctS(m.peakFrac.p50)],       // wo liefert das Build am meisten (Anteil des Runs)
    ["Build-online% p50",  (m) => pctS(m.onlineFrac.p50)],     // ab wann liefert es (Anteil des Runs)
    ["Schwanz-Anteil p50", (m) => pctS(m.tailShare.p50)],      // Score-Anteil im letzten Fünftel
    ["Spike p50",          (m) => `${m.spike.p50.toFixed(1)}×`],
    ["Payoff-gekappt%",    (m) => pctS(m.stillRisingShare)],   // Runs, die noch beschleunigend enden
  ];
  for (const [rLabel, fmt] of rows) {
    console.log(`\n${rLabel}`);
    console.log(`  ${"Fraktion".padEnd(10)}${list.map((n) => `${n}c`.padStart(11)).join("")}`);
    for (const [flabel, fkey] of keys)
      console.log(`  ${flabel.padEnd(10)}${list.map((n) => String(fmt(data[n][fkey])).padStart(11)).join("")}`);
  }
  console.log(`\nLesart: Peak-Cycle% & Payoff-gekappt% hoch (Peak am Run-Ende, Runs enden noch beschleunigend) → der`);
  console.log(`Build peakt NACH dem Run-Ende → längerer Run fängt Payoff ein. Sinkt Peak-Cycle% mit längerem Run &`);
  console.log(`bleibt Spike moderat → Verlängern hilft. Steigt nur der Spike, Peak-Cycle% bleibt am Ende → Runaway (Caps statt Länge).`);
  return data;
}

export function runPacing({ arg, seed0, c, f, write }) {
  if (arg("--cycles", "")) return runPacingCompare({ arg, seed0, f });
  const N = Number(arg("--runs", 400));
  const pctS = (x) => `${(x * 100).toFixed(1)}%`;

  const collect = (policyFactory, seedBase, warm) => {
    const runs = [];
    if (warm) { // UCB: erst Memory aufwärmen, dann auf frischen Seeds messen
      const mem = newMemory(); const p = policyFactory(mem);
      for (let i = 0; i < N; i++) runWithCurve(seed0 + i, p.policy, mem);
      for (let i = 0; i < N; i++) runs.push(runWithCurve(seedBase + i, p.policy, mem));
    } else {
      const p = policyFactory(null);
      for (let i = 0; i < N; i++) runs.push(runWithCurve(seed0 + i, p.policy, null));
    }
    return runs;
  };

  const cp = [0.25, 0.5, 0.75, 0.9].map((fr) => Math.max(1, Math.round(CYCLES * fr)));
  const report = (label, runs) => {
    const m = metrics(runs);
    console.log(`\n=== ${label} — ${N} Runs · ${CYCLES} Cycles ===`);
    console.log(`  Endscore   p50 ${f(m.finalP50)}   p90 ${f(m.finalP90)}   (Spread p90/p50 ${(m.finalP90 / (m.finalP50 || 1)).toFixed(2)}×)`);
    console.log(`  Kumulativer Score-Anteil (Median-Run) — Cycle ${cp.join("/")}:`);
    console.log(`      ${cp.map((cc) => `${cc}:${pctS(m.cumShareMedian[cc])}`).join("   ")}`);
    const line = (name, d) => console.log(`  ${name.padEnd(18)} p10 ${pctS(d.p10).padStart(6)}   p50 ${pctS(d.p50).padStart(6)}   p90 ${pctS(d.p90).padStart(6)}`);
    line(`Anteil bis C${TAIL_START}`, m.byTailStart);
    line(`Anteil Schwanz (${TAIL})`, m.tailShare);
    console.log(`  Spike-Faktor       p10 ${m.spike.p10.toFixed(1)}×    p50 ${m.spike.p50.toFixed(1)}×    p90 ${m.spike.p90.toFixed(1)}×   (Ø-Cycle Schwanz ÷ davor)`);
    // Payoff-Timing: WO liefert das Build, und wird der Payoff vom Run-Ende gekappt?
    const asCyc = (v) => `C${Math.round(v)} (${pctS(v / CYCLES)})`;
    console.log(`  Build online       p50 ${asCyc(m.onlineCycle.p50)}   ·   Peak-Cycle p50 ${asCyc(m.peakCycle.p50)}  p90 ${asCyc(m.peakCycle.p90)}`);
    console.log(`  Payoff gekappt?    ${pctS(m.stillRisingShare)} der Runs enden noch beschleunigend (Score/Cycle am Schluss steigend) · End-Accel p50 ${m.endAccel.p50.toFixed(2)}×`);
    console.log(`  „durch die Bank":  ${pctS(m.lateHeavyShare)} der Runs holen >45 % im Schwanz`);
    return m;
  };

  // --factions 1 → Pacing JE FRAKTION (fraktions-biased) statt random+ucb; Mix als Referenz.
  if (arg("--factions", "")) {
    const payload = { mode: "pacing-factions", runs: N, seedFrom: seed0, cycles: CYCLES };
    for (const [label, target] of [["FEUER", "fire"], ["BLITZ", "lightning"], ["EIS", "ice"]])
      payload[target] = report(label, collect(() => ({ policy: factionPolicy(target) }), seed0, false));
    payload.mix = report("MIX (Random-Referenz)", collect(() => ({ policy: randomPolicy() }), seed0, false));
    write(payload);
    console.log(`\nHinweis: Ziel je Fraktion = Schwanz-Anteil p50 ~30–33 % (Typ-Run nicht spät-lastig), Peak-Cycle p50 nicht am Run-Ende.`);
    return payload;
  }

  const random = collect(() => ({ policy: randomPolicy() }), seed0, false);
  const ucb = collect(() => ({ policy: ucbPolicy({ c }) }), 10_000_000 + seed0, true);
  const payload = {
    mode: "pacing", runs: N, seedFrom: seed0, cycles: CYCLES,
    random: report("RANDOM (naiver Build)", random),
    ucb: report("UCB aufgewärmt (starke Builds)", ucb),
  };
  write(payload);
  console.log(`\nHinweis: Ziel = Schwanz-Anteil p50 runter (Typ-Run flacher) + p90 darf hoch bleiben (gute Builds explodieren).`);
  return payload;
}
