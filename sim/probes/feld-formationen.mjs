// Wie viele FORMATIONEN einer Position tragen mindestens eine ionisierte Karte? Das ist der Kennwert, auf den
// Spannungsfeld nach dem Owner-Entscheid zaehlen soll — gegen den bisherigen "je ionisierter KARTE".
// Die Frage dahinter: eine einzelne ionisierte Karte kann MEHRERE Formationen zugleich erhellen, der Kennwert
// sollte also FRUEH schon zuenden, wo ionisierte Karten noch selten sind (Runden 1–20: 3 bzw. 19 % der Karten,
// blitz-ramp). Die letzte Spalte zeigt die alte Lesart daneben, damit die zwei Kennwerte vergleichbar sind.
//
//   N=60 node sim/probes/feld-formationen.mjs
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";

const N = Number(process.env.N || 60);
const NB = 5;
const B = Array.from({ length: NB }, () => ({ n: 0, forms: 0, litForms: 0, litCards: 0, anyLit: 0 }));

for (let i = 0; i < N; i++) {
  runOne(1 + i, factionPolicy("lightning"), null, { onTrick: (s) => {
    const t = s.lastTrick;
    if (!t || t.result !== "win") return;
    const forms = (t.formations || []).filter((f) => Array.isArray(f.members) && f.members.length);
    if (!forms.length) return;
    const b = B[Math.min(NB - 1, Math.floor((s.cycle || 0) / 10))];
    const order = s.playerOrder || [], deck = s.deck || [];
    const slot = t.originalPosition;
    const own = (deck[order[slot]]?.ionStacks || 0) > 0;
    b.n += 1; b.forms += forms.length;
    let litForms = 0;
    for (const f of forms) if (own || f.members.some((p) => (deck[order[p]]?.ionStacks || 0) > 0)) litForms += 1;
    b.litForms += litForms;
    if (litForms) b.anyLit += 1;
    // alte Lesart zum Vergleich: ionisierte KARTEN der Vereinigung, jede genau einmal
    const seen = new Set([slot]);
    let cards = own ? 1 : 0;
    for (const f of forms) for (const p of f.members) {
      if (seen.has(p)) continue;
      seen.add(p);
      if ((deck[order[p]]?.ionStacks || 0) > 0) cards += 1;
    }
    b.litCards += cards;
  } }, { archetypes: ["lightning"] });
}

console.log(`Spannungsfeld — Formations-Siege, ${N} Laeufe, Blitz mono`);
console.log("");
console.log("| Runden | Siege | Ø Formationen | Ø erleuchtet (neu) | Ø ion. Karten (alt) | Siege mit >=1 erleuchteter |");
console.log("| --- | ---: | ---: | ---: | ---: | ---: |");
B.forEach((b, k) => {
  if (!b.n) return;
  console.log(`| ${k * 10 + 1}–${k * 10 + 10} | ${b.n} | ${(b.forms / b.n).toFixed(2)} | ${(b.litForms / b.n).toFixed(2)} | ${(b.litCards / b.n).toFixed(2)} | ${Math.round((b.anyLit / b.n) * 100)} % |`);
});
