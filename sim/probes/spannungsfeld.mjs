// Was macht Spannungsfeld (§7.43) im Lauf? Blitz mono, Fraktions-Policy. Je 10-Runden-Block: gehaltene Stufe,
// `lightMult` des Stichs (der neue Blitz-Faktor im Score-Produkt), die Stapelsumme auf dem Deck und der Anteil
// Stapel, den die Episch-Nachladung erzeugt hat. Die Frage dahinter: der Episch-Anhang legt JE SIEG einen Stapel
// nach, und dieser Stapel erhoeht `lightMult` selbst — waechst der Faktor dadurch ueber den Lauf quadratisch?
//
//   N=100 node sim/probes/spannungsfeld.mjs
//
// Lesart wie bei blitz-ramp: die Block-Spalten sind direkte Beobachtungen, der Median-Score ist es nicht.
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import { tierOf, boostedTier } from "../../src/game/skills.js";
import { L } from "../../src/game/factions/lightning.js";

const N = Number(process.env.N || 100);
const SEED0 = Number(process.env.SEED0 || 1);
const NB = 5; // Bloecke zu 10 Runden
const TIER = ["N", "S", "SS", "E"];

const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return 0; const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
const mean = (a) => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : 0);
const f = (x) => Math.round(x).toLocaleString("de-DE");

const B = Array.from({ length: NB }, () => ({ wins: 0, lightSum: 0, lightMax: 0, stackSum: 0, n: 0, held: 0, tierSum: 0, tierN: 0 }));
const finalLight = [];
const finalStacks = [];

for (let i = 0; i < N; i++) {
  runOne(SEED0 + i, factionPolicy("lightning"), null, { onTrick: (s) => {
    const b = B[Math.min(NB - 1, Math.floor((s.cycle || 0) / 10))];
    b.n += 1;
    const skills = s.skills || [];
    if (skills.includes(L.SPANNUNGSFELD)) {
      b.held += 1;
      b.tierSum += boostedTier(skills, tierOf(s, L.SPANNUNGSFELD) || 0);
      b.tierN += 1;
    }
    b.stackSum += (s.deck || []).reduce((t, c) => t + (c.ionStacks || 0), 0);
    const bd = s.lastTrick && s.lastTrick.breakdown;
    if (bd && bd.lightMult != null) {
      b.wins += 1;
      b.lightSum += bd.lightMult;
      if (bd.lightMult > b.lightMax) b.lightMax = bd.lightMult;
      if (b === B[NB - 1]) finalLight.push(bd.lightMult);
    }
  } }, { archetypes: ["lightning"] });
  // Stapelsumme am Ende des Laufs sammelt der letzte Block schon; hier nur der Spitzenwert je Lauf.
  finalStacks.push(B[NB - 1].n ? B[NB - 1].stackSum / B[NB - 1].n : 0);
}

console.log(`Spannungsfeld — Blitz mono, ${N} Laeufe, Fraktions-Policy`);
console.log("");
console.log("| Runden | gehalten | Ø Stufe | Ø lightMult | max lightMult | Ø Stapel auf dem Deck |");
console.log("| --- | ---: | ---: | ---: | ---: | ---: |");
B.forEach((b, k) => {
  if (!b.n) return;
  const tier = b.tierN ? TIER[Math.round(b.tierSum / b.tierN)] : "-";
  console.log(`| ${k * 10 + 1}–${k * 10 + 10} | ${Math.round((b.held / b.n) * 100)} % | ${tier} | ${b.wins ? (b.lightSum / b.wins).toFixed(2) : "-"}× | ${b.lightMax.toFixed(1)}× | ${f(b.stackSum / b.n)} |`);
});
console.log("");
if (finalLight.length) {
  console.log(`Runden 41–50, lightMult je Sieg: Median ${quantile(finalLight, 0.5).toFixed(2)}× · Ø ${mean(finalLight).toFixed(2)}× · p90 ${quantile(finalLight, 0.9).toFixed(2)}× · p99 ${quantile(finalLight, 0.99).toFixed(2)}× · max ${Math.max(...finalLight).toFixed(1)}×`);
}
