// Where does the lightning CRIT MULTIPLIER come from, and how much of it does the 8x cap throw away?
// Companion to blitz-critsource.mjs (which does the same for the crit CHANCE). Per 10-round block, on crits only:
// the base, the Entladung ramp, the Spannungsstau, Vorentladung, the stacks on the winning card, and the rest
// (Precision "Wucht", Raserei, the over-100 % rule) — plus the built total against what the cap actually pays out.
//
// Output stays German: these tables are pasted into docs/skill-rework.md, which is the owner's German document.
//
//   SIM_CRIT_MULT_CAP=1000 N=60 node sim/probes/blitz-multsource.mjs
//
// Run it with the cap lifted (SIM_CRIT_MULT_CAP=1000), otherwise lastTrick.critMultiplier is already clipped and the
// question — how much is being cut — cannot be seen. The faction policy does not choose by score, so lifting the cap
// leaves the picks alone and the distribution stays comparable.
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import { L, lightParam, ionCritMultFor } from "../../src/game/factions/lightning.js";
import * as C from "../../src/game/constants.js";

const N = Number(process.env.N || 60);
const SEED0 = Number(process.env.SEED0 || 1);
const CAP = 8; // der Deckel, gegen den gemessen wird — auch wenn er für den Lauf angehoben ist
const NB = 5;
const mean = (a) => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : 0);

function oneRun(seed) {
  const B = Array.from({ length: NB }, () => ({ crits: 0, base: 0, ent: 0, stau: 0, vor: 0, stack: 0, rest: 0, total: 0, paid: 0 }));
  runOne(seed, factionPolicy("lightning"), null, { onTrick: (s) => {
    const t = s.lastTrick; if (!t || !t.isCrit) return;
    const b = B[Math.min(NB - 1, Math.floor((s.cycle || 0) / 10))];
    const li = s.lightning || {};
    const sk = s.skills, ti = s.skillTiers || {};
    const streak = t.winStreak || 0;
    const vMin = lightParam(sk, ti, L.VORENTLADUNG, "minStreak");
    const vor = (vMin != null && streak >= vMin) ? streak * (lightParam(sk, ti, L.VORENTLADUNG, "multPerStreak") || 0) : 0;
    const parts = { base: C.CRIT_BASE_MULT, ent: li.entladungMult || 0, stau: li.stauBonus || 0, vor,
      stack: ionCritMultFor(t.pCard, sk, ti) };
    const total = t.critMultiplier || 0;
    const known = parts.base + parts.ent + parts.stau + parts.vor + parts.stack;
    b.crits += 1; b.total += total; b.paid += Math.min(total, CAP);
    for (const k of Object.keys(parts)) b[k] += parts[k];
    b.rest += Math.max(0, total - known); // Präzision, Raserei, Überschuss über 100 % — als Rest, nicht einzeln
  } }, { archetypes: ["lightning"] });
  return B;
}

const rows = Array.from({ length: N }, (_, i) => oneRun(SEED0 + i));
console.log(`Blitz mono, ${N} Läufe — Crit-Multiplikator je Crit nach Quelle (Deckel im Lauf: ${C.CRIT_MULT_CAP}×, gemessen gegen ${CAP}×)`);
console.log(`  Runden   Basis   Entladung   Stau   Vorentladung   Stapel   Rest   gebaut   davon ausgezahlt   verworfen`);
for (let k = 0; k < NB; k++) {
  const bs = rows.map((r) => r[k]).filter((b) => b.crits > 0);
  if (!bs.length) continue;
  const g = (key) => mean(bs.map((b) => b[key] / b.crits));
  const total = g("total"), paid = g("paid");
  console.log(`  ${String(k * 10 + 1).padStart(2)}–${String(k * 10 + 10).padStart(2)}  ${g("base").toFixed(2).padStart(6)}× ${g("ent").toFixed(2).padStart(10)}× ${g("stau").toFixed(2).padStart(6)}× ${g("vor").toFixed(2).padStart(13)}× ${g("stack").toFixed(2).padStart(8)}× ${g("rest").toFixed(2).padStart(6)}× ${total.toFixed(2).padStart(8)}× ${paid.toFixed(2).padStart(18)}× ${`${Math.round((1 - paid / (total || 1)) * 100)} %`.padStart(11)}`);
}
