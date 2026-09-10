// Was liest Spannungsfeld (§7.43) real? Blitz mono, Fraktions-Policy. Je 10-Runden-Block: die Mitgliederzahl der
// Formation (Vereinigung, so wie `formationStacks` sie bildet), wie viele davon IONISIERT sind, und die Stapelsumme.
//
// Die Frage dahinter (§7.46 D): der Skill zahlt heute je STAPEL der Formation, also nach Tiefe. Zaehlte er die
// ionisierten KARTEN, waere er nach oben durch die Formationsgroesse begrenzt. Diese Sonde liefert die Zahlen,
// die eine Rate dafuer braucht.
//
//   N=100 node sim/probes/spannungsfeld.mjs
//
// Lesart wie bei blitz-ramp: die Block-Spalten sind direkte Beobachtungen, ein Median-Score waere es nicht.
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import { formationStacks, L } from "../../src/game/factions/lightning.js";

const N = Number(process.env.N || 100);
const SEED0 = Number(process.env.SEED0 || 1);
const NB = 5; // Bloecke zu 10 Runden

const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return 0; const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
const mean = (a) => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : 0);

const B = Array.from({ length: NB }, () => ({ n: 0, mem: 0, ion: 0, stacks: 0, maxCard: 0, held: 0, tricks: 0 }));
const lateMem = [], lateIon = [], lateStacks = [], lateMax = [];

for (let i = 0; i < N; i++) {
  runOne(SEED0 + i, factionPolicy("lightning"), null, { onTrick: (s) => {
    const k = Math.min(NB - 1, Math.floor((s.cycle || 0) / 10));
    const b = B[k];
    b.tricks += 1;
    if ((s.skills || []).includes(L.SPANNUNGSFELD)) b.held += 1;
    const t = s.lastTrick;
    if (!t || !t.breakdown || t.breakdown.lightMult == null) return; // nur Siege mit Formation
    // Die Sicht des Skills nachbilden: Mitglieder der Position, jede Karte genau einmal.
    const slot = t.originalPosition;
    const order = s.playerOrder || [];
    const deck = s.deck || [];
    const card = deck[order[slot]];
    const members = formationStacks(card, { formations: t.formations || [] }, slot, (p) => deck[order[p]]);
    if (!members.length) return;
    const ion = members.filter((m) => m.stacks > 0).length;
    const sum = members.reduce((x, m) => x + m.stacks, 0);
    const mx = Math.max(...members.map((m) => m.stacks));
    b.n += 1; b.mem += members.length; b.ion += ion; b.stacks += sum; b.maxCard += mx;
    if (k === NB - 1) { lateMem.push(members.length); lateIon.push(ion); lateStacks.push(sum); lateMax.push(mx); }
  } }, { archetypes: ["lightning"] });
}

console.log(`Spannungsfeld — Blitz mono, ${N} Laeufe, Fraktions-Policy`);
console.log("");
console.log("| Runden | gehalten | Formations-Siege | Ø Mitglieder | Ø davon ionisiert | Ø Stapelsumme | Ø tiefste Karte |");
console.log("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
B.forEach((b, k) => {
  if (!b.tricks) return;
  console.log(`| ${k * 10 + 1}–${k * 10 + 10} | ${Math.round((b.held / b.tricks) * 100)} % | ${b.n} | ${b.n ? (b.mem / b.n).toFixed(2) : "-"} | ${b.n ? (b.ion / b.n).toFixed(2) : "-"} | ${b.n ? (b.stacks / b.n).toFixed(1) : "-"} | ${b.n ? (b.maxCard / b.n).toFixed(1) : "-"} |`);
});
console.log("");
if (lateMem.length) {
  const q = (a) => `Median ${quantile(a, 0.5).toFixed(1)} · Ø ${mean(a).toFixed(2)} · p90 ${quantile(a, 0.9).toFixed(1)} · p99 ${quantile(a, 0.99).toFixed(1)} · max ${Math.max(...a)}`;
  console.log("Runden 41–50, je Formations-Sieg:");
  console.log(`  Mitglieder:      ${q(lateMem)}`);
  console.log(`  davon ionisiert: ${q(lateIon)}`);
  console.log(`  Stapelsumme:     ${q(lateStacks)}`);
  console.log(`  tiefste Karte:   ${q(lateMax)}`);
}
