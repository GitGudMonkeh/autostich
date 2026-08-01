// Cross-Block-Aggregat für den Report. Liest mehrere Eval-JSONs (report-b*.json) und fasst je Option
// über die Blöcke zusammen: in wie vielen Blöcken sie auftaucht, mittlere winRate/applicableRate, Median
// der median-Δ, mittlerer typischer %-Effekt. Robuste Optionen = viele Blöcke + hohe (bedingte) winRate.
//
//   node sim/report-aggregate.js sim/out/report-bA.json sim/out/report-bB.json …
import { readFileSync, writeFileSync } from "node:fs";

const files = process.argv.slice(2);
if (!files.length) { console.error("Bitte Eval-JSON-Dateien angeben."); process.exit(1); }
const blocks = files.map((f) => JSON.parse(readFileSync(f, "utf8")));

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
const meanOf = (xs) => (xs.length ? xs.reduce((t, v) => t + v, 0) / xs.length : 0);

// Blockprofil: Full-Score-Median (explosiv vs. mild).
const blockProfiles = blocks.map((b, i) => ({ block: i, fullMedian: b.fullScore?.p50 ?? 0, evalRuns: b.evalRuns, exploreRuns: b.exploreRuns }));

// Je Option über Blöcke sammeln.
const byId = new Map();
blocks.forEach((b) => {
  for (const m of b.marginals || []) {
    if (!byId.has(m.id)) byId.set(m.id, { id: m.id, kind: m.kind, winRates: [], applicable: [], medians: [], pcts: [], exploreMeans: [] });
    const e = byId.get(m.id);
    e.winRates.push(m.marginal.winRate);
    e.applicable.push(m.marginal.applicableRate);
    e.medians.push(m.marginal.median);
    e.pcts.push(m.marginal.pctEffect);
    e.exploreMeans.push(m.exploreMean);
  }
});

const rows = [...byId.values()].map((e) => ({
  id: e.id,
  kind: e.kind,
  blocks: e.winRates.length,
  winRate: meanOf(e.winRates), // mittlere bedingte winRate über die Blöcke, in denen die Option ablatiert wurde
  applicableRate: meanOf(e.applicable),
  medianDelta: median(e.medians), // Median der median-Δ (robust gegen den explosiven Block)
  pctEffect: median(e.pcts),
  exploreMean: meanOf(e.exploreMeans),
}));

// Sortierung: „robust stark" = in möglichst vielen Blöcken UND hohe winRate. Kombinierter Schlüssel.
rows.sort((a, b) => b.blocks - a.blocks || b.winRate - a.winRate);

const pct = (x) => `${(x * 100).toFixed(0)}%`;
const f = (x) => Math.round(x).toLocaleString("en-US");
console.log(`Cross-Block-Aggregat über ${blocks.length} Blöcke`);
console.log(`Blockprofile (Full-Score-Median): ${blockProfiles.map((p) => f(p.fullMedian)).join("  |  ")}`);
console.log(`  ${"id".padEnd(16)} ${"kind".padEnd(8)} ${"#Bl".padStart(3)}  ${"winRate".padStart(7)}  ${"typ.%".padStart(6)}  ${"anwendb.".padStart(8)}  ${"median-Δ".padStart(12)}`);
for (const r of rows) {
  const tag = r.winRate >= 0.65 ? "★" : r.winRate <= 0.45 ? "✗" : "·";
  console.log(`  ${r.id.padEnd(16)} ${r.kind.padEnd(8)} ${String(r.blocks).padStart(3)}  ${pct(r.winRate).padStart(7)}  ${(r.pctEffect * 100).toFixed(0).padStart(5)}%  ${pct(r.applicableRate).padStart(8)}  ${f(r.medianDelta).padStart(12)}  ${tag}`);
}

const out = "sim/out/report-aggregate.json";
writeFileSync(out, JSON.stringify({ blocks: blockProfiles, options: rows }, null, 2));
console.log(`→ ${out}`);
