// Wie oft stehen die Tore von Feuersturm und Schmelzpunkt offen, mit und ohne Weißglut im Bestand? (§7.26 C)
// Beide lesen heute „volle Leiste" als die Leiste des BUILDS — mit Weißglut also 200 statt 100:
//   Feuersturm N/S/SS zündet ab value >= max (100 bzw. 200), Feuersturm Episch ab value >= 90 (absolut).
//   Schmelzpunkt wandelt, was über max hinausgeht — er braucht die volle Leiste des Builds.
// Gruppiert wird JE STICH nach dem Bestand in diesem Moment (Weißglut wird meist zur Laufmitte gezogen, die
// „ohne"-Gruppe ist darum überwiegend die frühe Laufhälfte — kein sauberer A/B-Vergleich, sondern die Frage:
// welche Hitzestände erreicht ein Feuer-Lauf, wenn Weißglut liegt?). Fraktions-Policy, sie wählt nicht nach Score.
import { runOne } from "../run.js";
import { factionPolicy } from "../policies/faction.js";
import { F } from "../../src/game/factions/fire.js";
import * as C from "../../src/game/constants.js";

const N = Number(process.env.N || 150);
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : "–");
const mk = () => ({ tricks: 0, ge90: 0, ge100: 0, geMax: 0, sum: 0 });
const G = { mit: mk(), ohne: mk() };
let runsWithWeissglut = 0;

for (let i = 0; i < N; i++) {
  let sawWeissglut = false;
  runOne(1 + i, factionPolicy("fire"), null, { onTrick: (s) => {
    if (!s.heat || !s.heat.active) return;
    const has = (s.skills || []).includes(F.WEISSGLUT);
    if (has) sawWeissglut = true;
    const b = G[has ? "mit" : "ohne"];
    const v = s.heat.value || 0;
    b.tricks += 1; b.sum += v;
    if (v >= 90) b.ge90 += 1;
    if (v >= C.HEAT_MAX) b.ge100 += 1;
    if (v >= (s.heat.max || C.HEAT_MAX)) b.geMax += 1; // volle Leiste DES BUILDS — das heutige Tor
  } }, { archetypes: ["fire"] });
  if (sawWeissglut) runsWithWeissglut += 1;
}

console.log(`Feuer mono, ${N} Läufe (${runsWithWeissglut} ziehen Weißglut) — Hitzestand je Stich\n`);
for (const [k, b] of Object.entries(G)) {
  if (!b.tricks) { console.log(`${k}: keine Stiche`); continue; }
  const barMax = k === "mit" ? C.WEISSGLUT_HEAT_MAX : C.HEAT_MAX;
  console.log(`Stiche ${k === "mit" ? "MIT" : "OHNE"} Weißglut im Bestand: ${b.tricks} · Ø Hitze ${(b.sum / b.tricks).toFixed(1)} % · Leiste ${barMax}`);
  console.log(`  >= 90 %          : ${pct(b.ge90, b.tricks).padStart(5)}  → Feuersturm Episch (Tor 90, absolut)`);
  console.log(`  >= 100 %         : ${pct(b.ge100, b.tricks).padStart(5)}  → Tor, wenn beide auf ${C.HEAT_MAX} % lesen würden`);
  console.log(`  >= ${String(barMax).padEnd(3)} (voll)   : ${pct(b.geMax, b.tricks).padStart(5)}  → Feuersturm N/S/SS und Schmelzpunkt heute`);
  console.log("");
}
