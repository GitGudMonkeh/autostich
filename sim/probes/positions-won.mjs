// Wie schnell sind ALLE Positionen schon einmal gewonnen? (§7.27, Owner-Einwand zur Brandschneise)
// Owner: „bedenke das später in der Runde mit hohen Werten alle Positionen gewonnen werden." Die Sonde misst,
// ab welchem Durchlauf die Bedingung „an dieser Position schon einmal gewonnen" nichts mehr aussiebt:
//   - kumulativ: wie viele der 40 Positionen im Lauf bis hierher mindestens einmal gewonnen wurden,
//   - je Durchlauf: wie viele der 40 Positionen in DIESEM Durchlauf gewonnen wurden (die Siegquote je Durchlauf),
//   - Positionen, die in den letzten 10 Durchläufen NIE verloren haben (die „immer gewonnen"-Menge).
// Fraktions-Policy Feuer (der Kandidat steht auf einem Feuer-Platz), sie wählt nicht nach Score.
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import * as C from "../../src/game/constants.js";

const N = Number(process.env.N || 100);
const SLOTS = 40;
const buckets = new Map(); // cycle → { runs, cumSum, wonSum }

for (let i = 0; i < N; i++) {
  const everWon = new Set();
  let cycle = -1, wonThis = new Set();
  const flush = () => {
    if (cycle < 0) return;
    const b = buckets.get(cycle) || { runs: 0, cumSum: 0, wonSum: 0 };
    b.runs += 1; b.cumSum += everWon.size; b.wonSum += wonThis.size;
    buckets.set(cycle, b);
  };
  runOne(1 + i, factionPolicy("fire"), null, { onTrick: (s) => {
    const t = s.lastTrick; if (!t) return;
    const c = s.cycle || 0;
    if (c !== cycle) { flush(); cycle = c; wonThis = new Set(); }
    const pos = t.originalPosition;
    if (pos == null) return;
    if (t.result === "win" || t.result === "win_tie") { everWon.add(pos); wonThis.add(pos); }
  } }, { archetypes: ["fire"] });
  flush();
}

console.log(`Feuer mono, ${N} Läufe — von ${SLOTS} Positionen (Ø über die Läufe)\n`);
console.log("Durchlauf │ je schon gewonnen │ in diesem Durchlauf gewonnen");
console.log("──────────┼───────────────────┼─────────────────────────────");
for (const c of [...buckets.keys()].sort((a, b) => a - b)) {
  const b = buckets.get(c);
  if (!b.runs || c >= C.MAX_CYCLES) continue; // der Abschluss-Flush hinter dem letzten Durchlauf ist kein Durchlauf
  const cum = b.cumSum / b.runs, won = b.wonSum / b.runs;
  const bar = "█".repeat(Math.round((cum / SLOTS) * 20));
  console.log(`${String(c + 1).padStart(9)} │ ${cum.toFixed(1).padStart(5)} / ${SLOTS}  ${bar.padEnd(20)} │ ${won.toFixed(1).padStart(5)} / ${SLOTS}`);
}
