// Explodiert der Pflanzen-Score, wenn sich in einem Segment mehrere grüne Formationen überlappen?
// (Owner-Frage 2026-09-07 zu §6.20.) Der Verdacht ist eine QUADRATISCHE Kopplung: die vier Score-Skills zahlen je
// Formation einen Flat, dieser Flat landet in `scoreBase` — und derselbe `formMult` an der Position, der die
// Überlappung belohnt (Formationsfaktoren mal OVERLAP_BONUS: 2 → ×1,5, 3 → ×2, 4 → ×3), multipliziert ihn danach.
// Dieselbe Überlappung erzeugt den Flat also und vervielfacht ihn.
//
// Gemessen wird je SIEG einer Pflanze-mono-Policy:
//   - die Zahl echter Formationen an der Siegposition (nur Läufe mit Mitgliedern; Anker und andere Meta-Faktoren
//     zählen für die Fraktion nicht — dieselbe Regel wie plantFormations in factions/plant.js),
//   - der Pflanzen-Flat dieses Stichs (Differenz von state.plantBase),
//   - der Formations-Multiplikator und der Endscore des Stichs.
// Ausgewertet nach Formationszahl: Anteil der Siege, Ø Flat, Ø Multiplikator, Ø Score — und vor allem, welchen
// ANTEIL AM GESAMTSCORE die Siege mit 3 und 4 Formationen tragen. Dazu der größte Stich je Lauf mit seiner
// Formationszahl: liegt die Spitze systematisch bei der maximalen Überlappung, ist die Kopplung der Motor des
// Schwanzes (§6.10 D: p95 265M gegen Median 9,1M).
//
// Legendäre bleiben draußen: SIM_SKILL_LEGENDARY_PER_SLOT=0 setzen (sie würden die Erkennung zusätzlich biegen).
//   SIM_SKILL_LEGENDARY_PER_SLOT=0 node sim/probes/plant-overlap.mjs
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";

const N = Number(process.env.N || 100);
const MAX_BUCKET = 4; // 4 = „vier oder mehr" (mehr als vier echte Läufe an einer Position gibt es praktisch nicht)

// Ein Eimer je Formationszahl plus die Gesamtsumme, damit sich Anteile ohne zweiten Durchgang bilden lassen.
const bucket = Array.from({ length: MAX_BUCKET + 1 }, () => ({ wins: 0, flat: 0, mult: 0, score: 0, bloomWins: 0 }));
let totalScore = 0, totalWins = 0;
const topForms = []; // Formationszahl des größten Stichs je Lauf
const topShare = []; // Anteil des größten Stichs am Lauf-Score

for (let i = 0; i < N; i++) {
  let prevPlant = 0, best = { score: -1, n: 0 }, runScore = 0;
  runOne(1 + i, factionPolicy("plant"), null, { onTrick: (s) => {
    const t = s.lastTrick;
    const plant = s.plantBase || 0;
    const flat = Math.max(0, plant - prevPlant);
    prevPlant = plant;
    if (!t || !t.breakdown || (t.result !== "win" && t.result !== "win_tie")) return;
    const n = Math.min(MAX_BUCKET, (t.formations || []).filter((f) => Array.isArray(f.members)).length);
    const b = bucket[n];
    b.wins += 1; b.flat += flat; b.mult += t.breakdown.formMult || 1; b.score += t.breakdown.total || 0;
    if (t.pCard && t.pCard.bloom) b.bloomWins += 1;
    totalScore += t.breakdown.total || 0; totalWins += 1;
    runScore += t.breakdown.total || 0;
    if ((t.breakdown.total || 0) > best.score) best = { score: t.breakdown.total || 0, n };
  } }, { archetypes: ["plant"] });
  if (best.score >= 0) { topForms.push(best.n); topShare.push(runScore > 0 ? best.score / runScore : 0); }
}

const fmt = (x) => Math.round(x).toLocaleString("de-DE");
const pct = (x) => `${(100 * x).toFixed(1)} %`;
console.log(`Pflanze mono, ${N} Läufe — Siege nach Zahl echter Formationen an der Siegposition\n`);
console.log("Formationen │ Anteil Siege │ Ø Pflanzen-Flat │ Ø Formations-Mult │      Ø Score │ Anteil am Gesamtscore │ blühend");
console.log("────────────┼──────────────┼─────────────────┼───────────────────┼──────────────┼───────────────────────┼────────");
for (let n = 0; n <= MAX_BUCKET; n++) {
  const b = bucket[n];
  if (!b.wins) continue;
  const label = n === MAX_BUCKET ? `${n}+` : `${n}`;
  console.log(`  ${label.padStart(9)} │ ${pct(b.wins / totalWins).padStart(12)} │ ${fmt(b.flat / b.wins).padStart(15)} │ ${(b.mult / b.wins).toFixed(2).padStart(17)} │ ${fmt(b.score / b.wins).padStart(12)} │ ${pct(b.score / totalScore).padStart(21)} │ ${pct(b.bloomWins / b.wins).padStart(7)}`);
}

const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))]; };
const share3plus = bucket.slice(3).reduce((t, b) => t + b.score, 0) / totalScore;
const wins3plus = bucket.slice(3).reduce((t, b) => t + b.wins, 0) / totalWins;
console.log(`\n  Siege mit 3+ Formationen: ${pct(wins3plus)} der Siege, ${pct(share3plus)} des Scores.`);
const hist = {};
for (const n of topForms) hist[n] = (hist[n] || 0) + 1;
console.log(`  Größter Stich je Lauf — Formationszahl: ${Object.keys(hist).sort().map((k) => `${k}: ${pct(hist[k] / topForms.length)}`).join(" · ")}`);
console.log(`  Anteil dieses einen Stichs am Lauf-Score: Median ${pct(q(topShare, 0.5))} · p90 ${pct(q(topShare, 0.9))} · max ${pct(Math.max(...topShare))}`);
console.log(`\n  Lesart: Trägt eine kleine Minderheit der Siege den Großteil des Scores, ist die Überlappung der Motor des`);
console.log(`  Schwanzes. Ein einzelner Stich, der allein einen zweistelligen Prozentsatz des Laufs ausmacht, ist der Beleg.`);
