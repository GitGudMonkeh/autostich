// Wie viel Crit-Multiplikator liegt über dem Deckel 8? Mit SIM_CRIT_MULT_CAP=1000 fahren (der Deckel greift dann nicht,
// lastTrick.critMultiplier ist der ungedeckelte Wert); je Runden-Block: Crits, Anteil über 8×, Ø Überschuss dort.
// Nur eine Verteilungsschätzung — die Fraktions-Policy wählt nicht nach Score, die Picks bleiben dieselben. (§7.24:
// Blitz mono Runden 41–50 29 % der Crits, Ø +14×; Mix 5–11 %, Ø +31…39× — die Quelle der Überspannung.)
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import { randomPolicy } from "../policies/random.js";
import * as C from "../../src/game/constants.js";
const N = Number(process.env.N || 100);
const CAP = 8;
console.log(`(SIM_CRIT_MULT_CAP=${C.CRIT_MULT_CAP} — Messung des ungedeckelten Multiplikators gegen ${CAP}×)`);
const worlds = [["Blitz mono", () => factionPolicy("lightning"), ["lightning"]], ["Mix zufällig", () => randomPolicy(), ["fire", "lightning"]]];
for (const [name, mk, arch] of worlds) {
  const B = Array.from({ length: 5 }, () => ({ crits: 0, over: 0, overSum: 0, sum: 0 }));
  for (let i = 0; i < N; i++) {
    runOne(1 + i, mk(), null, { onTrick: (s) => {
      const t = s.lastTrick; if (!t || !t.isCrit) return;
      const b = B[Math.min(4, Math.floor((s.cycle || 0) / 10))];
      const m = t.critMultiplier || 0;
      b.crits += 1; b.sum += m;
      if (m > CAP) { b.over += 1; b.overSum += m - CAP; }
    } }, { archetypes: arch });
  }
  console.log(`${name} (${N} Läufe), Crit-Multiplikator je Crit:`);
  B.forEach((b, k) => { if (!b.crits) return; console.log(`  Runden ${k * 10 + 1}–${k * 10 + 10}: Crits ${b.crits} · Ø ${(b.sum / b.crits).toFixed(2)}× · über ${CAP}×: ${Math.round((b.over / b.crits) * 100)} % · Ø Überschuss dort +${b.over ? (b.overSum / b.over).toFixed(2) : "0"}×`); });
}
