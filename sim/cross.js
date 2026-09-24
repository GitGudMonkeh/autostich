// Cross-Archetype-Diagnose (--mode cross): GEMISCHTE Builds (2–4 Fraktionen) vs. reine Fraktionen + Mix.
// Nutzt die Multi-Target-factionPolicy (Slot-Split → 6 Slots: Paar 3+3, Tripel 2+2+2, Quartett 2+2+1+1);
// alles außer der Skill-Wahl läuft über die Random-Baseline → apfel-zu-apfel wie --mode balance.
//
// KERN-KENNZAHL je Kombi: Floor(Median) ÷ Floor des BESTEN reinen Members ("vs.bReiner").
//   ≈ 1,0  → Spezialisieren vs. Mischen bleibt gesund (Referenz vor Rework ≈ 1,03×).
//   >~1,15 → echte multiplikative Cross-Synergie, Mischen dominiert (Tuning-Kandidat).
//   <~0,9  → Mischen verwässert die Slots (Falle).
//
// --dist 1: zusätzlich die SCORE-RAUM-VERTEILUNG — volle Perzentile + Max + Upside (max/median) je Build,
//   Spreads über alle Builds (Floor/Ceiling/Max) und Elite-Tier-Besetzung (globale Top-5 %) → „decken viele
//   verschiedene Kombis eine große Score-Fläche ab, oder monopolisiert ein Build die Spitze?"
import { runOne } from "./run.js";
import { randomPolicy } from "./policies/random.js";
import { factionPolicy } from "./policies/faction.js";
import { archetypeOf } from "../src/game/skills.js";

const median = (a) => quantile(a, 0.5);
const mean = (a) => a.reduce((t, v) => t + v, 0) / a.length;
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
const fmt = (n) => Math.round(n).toLocaleString("de-DE");

const ARCHES = ["fire", "lightning", "ice", "plant", "stance"];
const NAME  = { fire: "Feuer", lightning: "Blitz", ice: "Eis", plant: "Pflanze", stance: "Prisma" };
const SHORT = { fire: "Fe", lightning: "Bl", ice: "Ei", plant: "Pf", stance: "Pr" };

// alle k-elementigen Teilmengen von arr (C(5,2)=10 Paare, C(5,3)=10 Tripel, C(5,4)=5 Quartette).
function combos(arr, k) {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const [head, ...rest] = arr;
  return [...combos(rest, k - 1).map((c) => [head, ...c]), ...combos(rest, k)];
}

function measure(policy, runs, seed0, world = null) {
  const opts = world ? { archetypes: world } : {};
  const results = Array.from({ length: runs }, (_, i) => runOne(seed0 + i, policy, null, null, opts));
  const scores = results.map((r) => r.score);
  return {
    scores,
    median: median(scores), mean: mean(scores),
    p90: quantile(scores, 0.9), p95: quantile(scores, 0.95), max: Math.max(...scores), min: Math.min(...scores),
    winrate: mean(results.map((r) => r.wins / r.tricks)),
    // Ø gehaltene Skills je Ziel-Archetyp (Slot-Split-Kontrolle: hat die Policy wirklich balanciert?).
    heldByArch: Object.fromEntries(ARCHES.map((a) => [a, mean(results.map((r) => r.build.skills.filter((id) => archetypeOf(id) === a).length))])),
  };
}

/* --world own (Default) | all — aus welchem Topf zieht das Skill-Angebot?
   „own": jeder Build bekommt GENAU seine Mitglieder ins Angebot (Mono 1, Paar 2, Tripel 3, Quartett 4). So lief
   die Bestandsmessung in docs/haltungen-fraktion.md §6.11/§6.12, und nur so sind die Zeilen dort vergleichbar.
   Jeder Build füllt seine Slots voll auf Ziel — verglichen wird der BUILD, nicht das Angebotsglück.
   „all": alle fünf Fraktionen im Topf, die Policy filtert (die historische cross-Welt, damals mit vier).
   Der Mix läuft IMMER im vollen Fünfer-Topf — er ist die unbiaste Referenz und hat keine Mitglieder. */
export function runCross({ arg, seed0 } = {}) {
  const runs = Number((arg && arg("--runs", 120)) || 120);
  const wantDist = arg && arg("--dist", "");
  const ownWorld = (arg && arg("--world", "own")) !== "all";
  const worldFor = (members) => (ownWorld ? members : ARCHES);
  console.log(`\n=== CROSS-ARCHETYPE (Multi-Target Slot-Split, ${runs} Runs, Seeds ${seed0}..${seed0 + runs - 1}, Angebot: ${ownWorld ? "eigene Mitglieder je Build" : "alle fünf Fraktionen"}) ===`);

  // Alle 31 Builds messen: 5 reine Fraktionen + Mix + Kombis (10 Paare, 10 Tripel, 5 Quartette) — gleiche Seeds.
  // Die Quartette sind die BIASED, solver-gespielten 4-Fraktions-Builds (Slot-Split ~2+2+1+1 über 6 Slots) — das
  // gezielte Gegenstück zum unbiasten „Mix (Random)". Sie messen die Synergie-Decke, die MAX_ARCHETYPES=4 im
  // Live-Spiel überhaupt erst zulässt; bei fünf Fraktionen ist jedes Quartett zugleich ein „ohne X".
  const pure = {};
  for (const a of ARCHES) pure[a] = measure(factionPolicy(a), runs, seed0, worldFor([a]));
  const mix = measure(randomPolicy(), runs, seed0, ARCHES);
  const mixFloor = mix.median;
  const pureFloorMax = (members) => Math.max(...members.map((a) => pure[a].median));

  const comboRows = [...combos(ARCHES, 2), ...combos(ARCHES, 3), ...combos(ARCHES, 4)]
    .map((members) => ({ members, m: measure(factionPolicy(members), runs, seed0, worldFor(members)) }))
    .map(({ members, m }) => ({ members, m, vsPure: m.median / pureFloorMax(members), vsMix: m.median / mixFloor }))
    .sort((a, b) => b.m.median - a.m.median);

  const hdr = "  Build            Floor(Med)  vs.Mix  vs.bReiner   p90        p95    Winrate  Split(Ø Skills)";
  const splitStr = (m, members) => members.map((a) => `${SHORT[a]} ${m.heldByArch[a].toFixed(1)}`).join(" ");

  console.log(`\n  — Referenz (reine Fraktionen + Mix) —`);
  console.log(hdr);
  for (const a of ARCHES) {
    const m = pure[a];
    console.log(`  ${NAME[a].padEnd(15)} ${fmt(m.median).padStart(9)}  ${(m.median / mixFloor).toFixed(2)}×    —        ${fmt(m.p90).padStart(9)} ${fmt(m.p95).padStart(9)} ${(m.winrate * 100).toFixed(1).padStart(5)}%  ${splitStr(m, [a])}`);
  }
  console.log(`  ${"Mix (Random)".padEnd(15)} ${fmt(mix.median).padStart(9)}  1,00×    —        ${fmt(mix.p90).padStart(9)} ${fmt(mix.p95).padStart(9)} ${(mix.winrate * 100).toFixed(1).padStart(5)}%`);

  console.log(`\n  — Kombis (Paare 3+3 · Tripel 2+2+2 · Quartette 2+2+1+1), nach Floor —`);
  console.log(hdr);
  for (const { members, m, vsPure, vsMix } of comboRows) {
    const label = members.map((a) => SHORT[a]).join("+");
    console.log(`  ${label.padEnd(15)} ${fmt(m.median).padStart(9)}  ${vsMix.toFixed(2)}×   ${vsPure.toFixed(2)}×     ${fmt(m.p90).padStart(9)} ${fmt(m.p95).padStart(9)} ${(m.winrate * 100).toFixed(1).padStart(5)}%  ${splitStr(m, members)}`);
  }

  const vsPures = comboRows.map((e) => e.vsPure);
  const topFloor = comboRows[0];
  const topCeil = [...comboRows].sort((a, b) => b.m.p90 - a.m.p90)[0];
  const pureSpread = Math.max(...ARCHES.map((a) => pure[a].median)) / Math.min(...ARCHES.map((a) => pure[a].median));
  console.log(`\n  === GESUNDHEIT ===`);
  console.log(`  Floor-Spread reine Fraktionen:            ${pureSpread.toFixed(2)}×`);
  console.log(`  bester Kombi-Floor ÷ bester reiner Member: ${Math.max(...vsPures).toFixed(2)}×  (gesund ≈ 1,0 · Referenz vor Rework ≈ 1,03× · >~1,15× = Mischen dominiert)`);
  console.log(`  Spannweite vs.bReiner über alle Kombis:    ${Math.min(...vsPures).toFixed(2)}× .. ${Math.max(...vsPures).toFixed(2)}×`);
  console.log(`  Top-Floor-Kombi:   ${topFloor.members.map((a) => SHORT[a]).join("+")} — ${fmt(topFloor.m.median)} (${topFloor.vsPure.toFixed(2)}× bReiner, ${topFloor.vsMix.toFixed(2)}× Mix)`);
  console.log(`  Top-Ceiling-Kombi: ${topCeil.members.map((a) => SHORT[a]).join("+")} — p90 ${fmt(topCeil.m.p90)} / p95 ${fmt(topCeil.m.p95)}`);

  // Alle Builds in EINE Liste (für Verteilungs-/Elite-Analyse).
  const all = [
    ...ARCHES.map((a) => ({ label: NAME[a], m: pure[a] })),
    { label: "Mix", m: mix },
    ...comboRows.map(({ members, m }) => ({ label: members.map((a) => SHORT[a]).join("+"), m })),
  ];

  if (wantDist) printDist(all, runs);
  return { pure, mix, combos: comboRows, all };
}

// SCORE-RAUM-VERTEILUNG: wie breit decken die Builds den Score-Raum ab, und wer besetzt die Spitze?
function printDist(all, runs) {
  console.log(`\n  === SCORE-RAUM-VERTEILUNG (--dist, ${runs} Runs/Build) ===`);
  // Per-Build, nach MAX sortiert: zeigt die fetten Tails („Jagd-Builds": hoher Max bei moderatem Median).
  const byMax = [...all].map((b) => ({ ...b, upside: b.m.max / (b.m.median || 1) })).sort((x, y) => y.m.max - x.m.max);
  console.log(`\n  — Verteilung je Build (nach Max) —`);
  console.log(`  Build            Median      p90        p95        Max      Upside(max/med)`);
  for (const b of byMax) {
    console.log(`  ${b.label.padEnd(15)} ${fmt(b.m.median).padStart(9)} ${fmt(b.m.p90).padStart(10)} ${fmt(b.m.p95).padStart(10)} ${fmt(b.m.max).padStart(10)}    ${b.upside.toFixed(2)}×`);
  }

  // Spreads über ALLE Builds — misst, ob die Builds den Raum breit abdecken oder flach zusammenliegen.
  const meds = all.map((b) => b.m.median), p95s = all.map((b) => b.m.p95), maxs = all.map((b) => b.m.max);
  console.log(`\n  — Abdeckung über alle ${all.length} Builds —`);
  console.log(`  Floor-Spread (Median):   ${(Math.max(...meds) / Math.min(...meds)).toFixed(2)}×   [${fmt(Math.min(...meds))} .. ${fmt(Math.max(...meds))}]`);
  console.log(`  Ceiling-Spread (p95):    ${(Math.max(...p95s) / Math.min(...p95s)).toFixed(2)}×   [${fmt(Math.min(...p95s))} .. ${fmt(Math.max(...p95s))}]`);
  console.log(`  Max-Spread (Ausreißer):  ${(Math.max(...maxs) / Math.min(...maxs)).toFixed(2)}×   [${fmt(Math.min(...maxs))} .. ${fmt(Math.max(...maxs))}]`);

  // Elite-Tier: alle Runs poolen, globale Top-5-%-Schwelle, Anteil je Build → Spitze monopolisiert oder geteilt?
  const pool = all.flatMap((b) => b.m.scores.map((s) => ({ s, label: b.label })));
  const thresh = quantile(pool.map((p) => p.s), 0.95);
  const elite = pool.filter((p) => p.s >= thresh);
  const share = {};
  for (const e of elite) share[e.label] = (share[e.label] || 0) + 1;
  const shareRows = Object.entries(share).map(([label, n]) => ({ label, n, pct: n / elite.length })).sort((a, b) => b.n - a.n);
  const distinctElite = shareRows.length;
  console.log(`\n  — Elite-Tier (globale Top 5 %, Schwelle ${fmt(thresh)}; ${elite.length} Runs) —`);
  console.log(`  ${distinctElite} von ${all.length} Builds erreichen die Spitze:`);
  console.log(`    ${shareRows.map((r) => `${r.label} ${(r.pct * 100).toFixed(0)}%`).join(" · ")}`);
  const top3 = shareRows.slice(0, 3).reduce((t, r) => t + r.pct, 0);
  console.log(`  Konzentration: Top-3-Builds halten ${(top3 * 100).toFixed(0)}% des Elite-Tiers  (niedrig = viele Jagd-Builds, hoch = Monopol)`);

  // „Jagd-Builds": höchste Upside (Max ÷ Median) — moderater Alltag, spektakuläre Spitze.
  const chase = [...byMax].sort((a, b) => b.upside - a.upside).slice(0, 4);
  console.log(`\n  — Jagd-Builds (höchste Upside max/median) —`);
  for (const b of chase) console.log(`    ${b.label.padEnd(12)} Median ${fmt(b.m.median).padStart(9)} → Max ${fmt(b.m.max).padStart(9)}   (${b.upside.toFixed(2)}×)`);
}
