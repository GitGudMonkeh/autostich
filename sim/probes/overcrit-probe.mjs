// Wie viel Crit-Chance über 100 % gibt es im Lauf? Blitz mono (Fraktions-Policy) und Zufallsmix, je Stich die
// Blitz-Roh-Crit-Chance (Passiv je Skill + Gewitterfront-Rampe + Ladungsserie) — Perk-/Präzisions-Crit fehlt hier,
// die Zahlen sind eine Untergrenze. Ausgabe je Runden-Block: Ø Roh-Crit, Anteil Stiche über 100 %, Ø Überschuss dort.
// (§7.24: seit Ladungsserie ÷10 fast nur noch in den Runden 41–50.)
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import { randomPolicy } from "../policies/random.js";
import { lightningCritChance } from "../../src/game/factions/lightning.js";
const N = Number(process.env.N || 100);
const worlds = [["Blitz mono", () => factionPolicy("lightning"), ["lightning"]], ["Mix zufällig", () => randomPolicy(), ["fire", "lightning"]]];
for (const [name, mk, arch] of worlds) {
  const B = Array.from({ length: 5 }, () => ({ n: 0, sum: 0, over: 0, overSum: 0, crits: 0, critsOver: 0 }));
  for (let i = 0; i < N; i++) {
    runOne(1 + i, mk(), null, { onTrick: (s) => {
      if (!s.lightning || !s.lightning.active) return;
      const b = B[Math.min(4, Math.floor((s.cycle || 0) / 10))];
      const raw = lightningCritChance(s.lightning, s.skills, s.skillTiers || {}, (s.winStreak || 0) + 1);
      b.n += 1; b.sum += raw;
      if (raw > 1) { b.over += 1; b.overSum += raw - 1; }
      const t = s.lastTrick; if (t && t.isCrit) { b.crits += 1; if (raw > 1) b.critsOver += 1; }
    } }, { archetypes: arch });
  }
  console.log(`${name} (${N} Läufe), Blitz-Roh-Crit je Stich (ohne Perk-/Präzisions-Crit):`);
  B.forEach((b, k) => { if (!b.n) return; console.log(`  Runden ${k * 10 + 1}–${k * 10 + 10}: Ø ${Math.round((b.sum / b.n) * 100)} % · über 100 %: ${Math.round((b.over / b.n) * 100)} % der Stiche · Ø Überschuss dort ${b.over ? Math.round((b.overSum / b.over) * 100) : 0} pp · Crits ${b.crits}, davon über 100 %: ${b.crits ? Math.round((b.critsOver / b.crits) * 100) : 0} %`); });
}
