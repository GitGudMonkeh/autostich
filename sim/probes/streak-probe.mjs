// Serienlängen in der Sim: längste Serie je Lauf (bestStreak) für Feuer mono, Blitz mono und den Zufallsmix — der Boden
// für alles, was „je Serienpunkt" zahlt (§7.23: Feuer mono Median 614, Blitz mono 41). N Läufe je Welt (Default 150).
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import { randomPolicy } from "../policies/random.js";
const N = Number(process.env.N || 150);
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))]; };
const f = (x) => Math.round(x).toLocaleString("en-US");
const worlds = [
  ["Feuer mono", () => factionPolicy("fire"), ["fire"]],
  ["Blitz mono", () => factionPolicy("lightning"), ["lightning"]],
  ["Mix zufällig", () => randomPolicy(), ["fire", "lightning"]],
];
for (const [name, mk, arch] of worlds) {
  const bs = [], sc = [], wr = [];
  for (let i = 0; i < N; i++) {
    const r = runOne(1 + i, mk(), null, null, { archetypes: arch });
    bs.push(r.bestStreak); sc.push(r.score); wr.push(r.wins / Math.max(1, r.wins + r.losses));
  }
  const over = (k) => Math.round((bs.filter((b) => b >= k).length / N) * 100);
  console.log(`${name.padEnd(13)} (${N} Läufe): beste Serie p10 ${q(bs, 0.1)} · p50 ${q(bs, 0.5)} · p90 ${q(bs, 0.9)} · max ${Math.max(...bs)} · ≥75: ${over(75)} % · ≥200: ${over(200)} % · ≥500: ${over(500)} % · Siegquote p50 ${Math.round(q(wr, 0.5) * 100)} % · Score p50 ${f(q(sc, 0.5))}`);
}
