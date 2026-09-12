// Wie sieht das Feld einer Pflanze im Lauf aus? (§6.8 Messliste, Owner: „in der Sim schauen, wie viele blühende man hat")
// Gemessen wird je Durchlauf über eine Pflanze-mono-Policy:
//   - grüne und blühende Karten im Feld (die Grundgröße der Fraktion),
//   - der LÄNGSTE grüne Farbblock (Blätterdach-Satz und die offene Deckel-Frage aus §6.2 hängen daran),
//   - der Anteil der Stiche, die eine blühende Karte gewinnt (das Passiv zahlt nur dort),
//   - wie oft Spalier das Deck zu einer durchgehenden Reihe macht (Farbblock ≥ 20 Karten).
// Legendäre bleiben draußen (SIM_SKILL_LEGENDARY_PER_SLOT=0 setzen), sie werden neu entworfen.
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";

const N = Number(process.env.N || 60);
const buckets = new Map(); // cycle → Summen
const endBloom = [];

const longestGreenBlock = (s) => {
  let best = 0;
  const forms = s.formations || [];
  for (let p = 0; p < forms.length; p++) {
    const card = s.deck[s.playerOrder[p]];
    if (!card || !card.green) continue;
    for (const f of forms[p].formations || []) if (f.type === "farbblock" && (f.len || 0) > best) best = f.len;
  }
  return best;
};

for (let i = 0; i < N; i++) {
  let cycle = -1, winsBloom = 0, wins = 0;
  const flush = (s) => {
    if (cycle < 0) return;
    const b = buckets.get(cycle) || { runs: 0, green: 0, bloom: 0, block: 0, growth: 0, winsBloom: 0, wins: 0, wide: 0 };
    b.runs += 1;
    b.green += s.deck.filter((c) => c.green).length;
    b.bloom += s.deck.filter((c) => c.bloom).length;
    const len = longestGreenBlock(s);
    b.block += len;
    if (len >= 20) b.wide += 1;
    b.growth += Object.values(s.growth || {}).reduce((t, g) => t + g, 0) / Math.max(1, s.deck.length);
    b.winsBloom += winsBloom; b.wins += wins;
    buckets.set(cycle, b);
  };
  let lastBloom = 0;
  runOne(1 + i, factionPolicy("plant"), null, { onTrick: (s) => {
    const t = s.lastTrick; if (!t) return;
    lastBloom = s.deck.filter((c) => c.bloom).length;
    const c = s.cycle || 0;
    if (c !== cycle) { flush(s); cycle = c; winsBloom = 0; wins = 0; }
    if (t.result === "win" || t.result === "win_tie") { wins += 1; if (t.pCard && t.pCard.bloom) winsBloom += 1; }
  } }, { archetypes: ["plant"] });
  endBloom.push(lastBloom);
}

const rows = [...buckets.keys()].sort((a, b) => a - b);
console.log(`Pflanze mono, ${N} Läufe — Feld je Durchlauf (Ø)\n`);
console.log("Durchlauf │  grün │ blühend │ Ø Wachstum │ längster grüner Block │ Siege mit blühender Karte │ Reihe (Block ≥ 20)");
console.log("──────────┼───────┼─────────┼────────────┼───────────────────────┼───────────────────────────┼───────────────────");
for (const c of rows) {
  if (c % 5 !== 0 && c !== rows[rows.length - 1]) continue;
  const b = buckets.get(c);
  const pct = b.wins ? (100 * b.winsBloom / b.wins) : 0;
  console.log(`  ${String(c + 1).padStart(6)}  │ ${(b.green / b.runs).toFixed(1).padStart(5)} │ ${(b.bloom / b.runs).toFixed(1).padStart(7)} │ ${(b.growth / b.runs).toFixed(1).padStart(10)} │ ${(b.block / b.runs).toFixed(1).padStart(21)} │ ${`${pct.toFixed(1)} %`.padStart(25)} │ ${`${(100 * b.wide / b.runs).toFixed(0)} %`.padStart(18)}`);
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))]; };
console.log(`\nBlühende Karten am Laufende: Median ${q(endBloom, 0.5)} · p10 ${q(endBloom, 0.1)} · p90 ${q(endBloom, 0.9)} · max ${Math.max(...endBloom)} (von 40)`);
