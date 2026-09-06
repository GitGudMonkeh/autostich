// Lifts je Skill im reinen Fraktions-Build (Fraktions-Policy, Welt nur diese Fraktion): Median und Mittelwert mit ÷ ohne,
// je Stufe (N/S/X/E). ARCH=fire|lightning (Default fire), N Läufe (Default 400).
// NOLEG=1: Lifts der normalen Skills nur über Läufe ohne Legendäres — sonst ist die „ohne"-Gruppe mit Legendär-Haltern
// (Sonnenkern 2,6) angereichert und jeder Füller misst < 1 (docs/skill-rework.md §7.22).
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import { SKILL_LIST } from "../../src/game/skills.js";
const ARCH = process.env.ARCH === "lightning" ? "lightning" : "fire";
const LABEL = ARCH === "fire" ? "Feuer" : "Blitz";
const N = Number(process.env.N || 400);
const rows = [];
for (let i = 0; i < N; i++) { const r = runOne(1 + i, factionPolicy(ARCH), null, null, { archetypes: [ARCH] }); rows.push({ score: r.score, skills: r.build.skills, tiers: r.build.skillTiers }); }
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const mean = (a) => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : 0);
const f = (x) => Math.round(x).toLocaleString("en-US");
console.log(`${LABEL}-Fraktion, ${N} Läufe: Median ${f(median(rows.map((r) => r.score)))}  Mean ${f(mean(rows.map((r) => r.score)))}`);
const LEG = new Set(SKILL_LIST.filter((s) => s.legendary).map((s) => s.id));
const base = process.env.NOLEG ? rows.filter((r) => !r.skills.some((id) => LEG.has(id))) : rows;
if (process.env.NOLEG) console.log(`  (Lifts normaler Skills über ${base.length} Läufe ohne Legendäres)`);
const out = [];
for (const s of SKILL_LIST.filter((s) => s.archetype === ARCH)) {
  const pool = s.legendary ? rows : base;
  const w = pool.filter((r) => r.skills.includes(s.id)), wo = pool.filter((r) => !r.skills.includes(s.id));
  if (!w.length || !wo.length) continue;
  const tiers = s.legendary ? "" : [0, 1, 2, 3].map((t) => { const ww = w.filter((r) => (r.tiers || {})[s.id] === t); return `${"NSXE"[t]} ${ww.length ? (median(ww.map((r) => r.score)) / median(wo.map((r) => r.score))).toFixed(2) : "—"}`; }).join(" ");
  out.push({ name: s.name, held: w.length / N, lm: mean(w.map((r) => r.score)) / mean(wo.map((r) => r.score)), lmed: median(w.map((r) => r.score)) / median(wo.map((r) => r.score)), tiers });
}
out.sort((a, b) => b.lmed - a.lmed);
for (const o of out) console.log(`  ${o.name.padEnd(16)} held ${(o.held * 100).toFixed(0).padStart(3)}%  Lift Mean ${o.lm.toFixed(2)}  Median ${o.lmed.toFixed(2)}   ${o.tiers}`);
