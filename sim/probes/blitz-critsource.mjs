// Where does the lightning crit chance actually come from? Per 10-round block, split by source: the passive (per
// lightning skill held), the Gewitterfront ramp, Ladungsserie (streak), Lichtbogen (stacks on the played card) and
// the rest (perks/families/anchor). Only wins — that is where the chance is rolled.
// Answers the design question behind "crit takes too long to get going": which lever is asleep, and until when.
//
// Output stays German: these tables are pasted into docs/skill-rework.md, which is the owner's German document.
//
//   N=100 node sim/probes/blitz-critsource.mjs
//
// The columns are the RAW sum before the 100 % clamp, so they add up to more than the displayed chance late in a run.
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import { L, lightParam, effectiveStacks } from "../../src/game/factions/lightning.js";
import { SKILL_LIST, activeLightningCount } from "../../src/game/skills.js";
import * as C from "../../src/game/constants.js";

const N = Number(process.env.N || 100);
const SEED0 = Number(process.env.SEED0 || 1);
const LEG = new Set(SKILL_LIST.filter((s) => s.legendary).map((s) => s.id));
const NB = 5;
const mean = (a) => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : 0);

function oneRun(seed) {
  const B = Array.from({ length: NB }, () => ({ wins: 0, passive: 0, storm: 0, serie: 0, bogen: 0, rest: 0, total: 0 }));
  let last = null;
  runOne(seed, factionPolicy("lightning"), null, { onTrick: (s) => {
    last = s;
    const t = s.lastTrick; if (!t || !(t.result === "win" || t.result === "win_tie")) return;
    const b = B[Math.min(NB - 1, Math.floor((s.cycle || 0) / 10))];
    const total = t.critChance || 0; // clamped to 1 by the engine
    b.wins += 1; b.total += total;
    if (!(s.lightning || {}).active) { b.rest += total; return; }
    const sk = s.skills, ti = s.skillTiers || {};
    const passive = activeLightningCount(sk) * C.LIGHTNING_CRIT_PER_SKILL;
    const storm = s.lightning.stormCritBonus || 0;
    const serie = (lightParam(sk, ti, L.LADUNGSSERIE, "critPerStreak") || 0) * Math.max(0, t.winStreak || 0);
    const bogen = (lightParam(sk, ti, L.LICHTBOGEN, "critPerStack") || 0) * effectiveStacks(t.pCard, sk, ti);
    b.passive += passive; b.storm += storm; b.serie += serie; b.bogen += bogen;
    b.rest += Math.max(0, total - Math.min(1, passive + storm + serie + bogen)); // perks/families/anchor, lower bound
  } }, { archetypes: ["lightning"] });
  return { B, leg: (last.skills || []).some((id) => LEG.has(id)) };
}

const rows = Array.from({ length: N }, (_, i) => oneRun(SEED0 + i));

function table(label, pool) {
  if (!pool.length) return;
  console.log(`\n=== ${label} (${pool.length} Läufe) — Crit-Chance auf Siegen nach Quelle (Rohsumme, vor der 100-%-Klemme) ===`);
  console.log(`  Runden   Passiv   Gewitterfront   Ladungsserie   Lichtbogen   Rest (Perks)   angezeigt (geklemmt)`);
  for (let k = 0; k < NB; k++) {
    const bs = pool.map((r) => r.B[k]).filter((b) => b.wins > 0);
    if (!bs.length) continue;
    const g = (key) => mean(bs.map((b) => b[key] / b.wins)) * 100;
    console.log(`  ${String(k * 10 + 1).padStart(2)}–${String(k * 10 + 10).padStart(2)}  ${g("passive").toFixed(1).padStart(5)} %   ${g("storm").toFixed(1).padStart(11)} %   ${g("serie").toFixed(1).padStart(10)} %   ${g("bogen").toFixed(1).padStart(8)} %   ${g("rest").toFixed(1).padStart(10)} %   ${g("total").toFixed(1).padStart(17)} %`);
  }
}

table("Alle Läufe", rows);
table("OHNE Legendäres", rows.filter((r) => !r.leg));
