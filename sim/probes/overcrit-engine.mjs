// Wie oft steht die Crit-Chance im echten Lauf AN oder ÜBER 100 %? Die Sonde overcrit-probe.mjs rechnet nur den
// Blitz-Anteil (Passiv + Rampen) und ist damit eine Untergrenze; hier zählt der Stich selbst: `lastTrick.critChance`
// ist auf 1 geklemmt, „= 1" heißt also „roh ≥ 100 %". Dazu der Ø Crit-Multiplikator und der Anteil am Deckel.
// Je Runden-Block über N Läufe, Blitz mono und Zufallsmix. (§7.28: die Größe der Systemregel „Überschuss über 100 %".)
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import { randomPolicy } from "../policies/random.js";
import * as C from "../../src/game/constants.js";
const N = Number(process.env.N || 100);
const worlds = [["Blitz mono", () => factionPolicy("lightning"), ["lightning"]], ["Mix zufällig", () => randomPolicy(), ["fire", "lightning"]]];
for (const [name, mk, arch] of worlds) {
  const B = Array.from({ length: 5 }, () => ({ n: 0, at1: 0, crits: 0, capped: 0, multSum: 0 }));
  for (let i = 0; i < N; i++) {
    runOne(1 + i, mk(), null, { onTrick: (s) => {
      const t = s.lastTrick; if (!t) return;
      const b = B[Math.min(4, Math.floor((s.cycle || 0) / 10))];
      b.n += 1;
      if ((t.critChance || 0) >= 1) b.at1 += 1;
      if (t.isCrit) { b.crits += 1; b.multSum += t.critMultiplier || 0; if ((t.critMultiplier || 0) >= C.CRIT_MULT_CAP - 1e-9) b.capped += 1; }
    } }, { archetypes: arch });
  }
  console.log(`${name} (${N} Läufe), Stiche mit Crit-Chance ≥ 100 % und der Multiplikator:`);
  B.forEach((b, k) => { if (!b.n) return; console.log(`  Runden ${k * 10 + 1}–${k * 10 + 10}: ≥ 100 %: ${Math.round((b.at1 / b.n) * 100)} % der Stiche · Crits ${b.crits} · Ø Mult ${b.crits ? (b.multSum / b.crits).toFixed(2) : "0"}× · am Deckel (${C.CRIT_MULT_CAP}×): ${b.crits ? Math.round((b.capped / b.crits) * 100) : 0} %`); });
}
