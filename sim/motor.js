// Motor-Diagnose Feuer/Blitz (--mode motor): WIE die beiden Passive im Lauf tatsächlich arbeiten — nicht was ein Skill
// wert ist (das ist --mode skills), sondern ob die Hitze gehalten wird und ob die Ionisierung den Score trägt.
//
//   Feuer:  Hitze je Stich (Verteilung, Anteil ≥ 100 %, Anteil am Anschlag der Leiste, Stiche bis zur ersten vollen
//           Leiste), Vorsprung-Siege (nur die geben Passiv-Hitze), Hitze-Budget je Runde (Passiv-Gewinn gegen Kühlung),
//           Anteil des Hitze-Multiplikators am Score. Vier feste Builds neben der Fraktions-Policy: ohne jeden
//           Hitze-Verstärker, mit Glut, mit Zunder, mit allen vier — beantwortet „ist ein Verstärker nötig?".
//   Blitz:  Crits und volle Leisten je Lauf, Stiche je Leiste, Ionisierungen (Stapel) je Lauf, Stapel je Karte am Ende,
//           Stapel der Siegkarte, Crit-Anteil am Score (critBonusScore) und der Stapel-Anteil am Score als GEPAARTE
//           Ablation: derselbe Lauf in einem Unterprozess mit SIM_ION_SCORE_PER_STACK=0 (die Picks hängen nicht am
//           Score, also pairen die Seeds).
// Welt je Fraktion allein (Allowlist), greedy Aufstellung und Architekt wie die Fraktions-Policy. Determinismus: feste Seeds.
import { execFileSync } from "node:child_process";
import { runOne } from "./run.js";
import { factionPolicy } from "./policies/faction.js";
import { fixedPolicy } from "./policies/fixed.js";
import { F } from "../src/game/factions/fire.js";
import { L } from "../src/game/factions/lightning.js";
import * as C from "../src/game/constants.js";

const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return 0; const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
const median = (a) => quantile(a, 0.5);
const mean = (a) => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : 0);
const fmt = (n) => Math.round(n).toLocaleString("de-DE");
const pct = (x) => `${(x * 100).toFixed(1).padStart(5)} %`;
const TPC = C.TRICKS_PER_CYCLE;

// ---- Feuer ----
const RATE = [F.GLUT, F.ZUNDER, F.RUECKZUENDUNG]; // die drei Hitze-Verstärker (Rate; Feuersturm ist seit §7.17 Serie zu Score)
const CORE = [F.KLINGE, F.WEISSGLUT, F.VERBRENNUNG, F.BRANDMAL, F.LAUFFEUER, F.GLUTSTAHL, F.FEUERWALZE, F.GLUTBETT, F.SCHMIEDE, F.SCHMELZPUNKT, F.FEUERSTURM];
const fixedOpts = { solveFormations: true, architectGreedy: true };
export const FIRE_BUILDS = [
  ["Fraktion (zufällig)", () => factionPolicy("fire")],
  ["ohne Verstärker", () => fixedPolicy(CORE, { ...fixedOpts, exclude: RATE })],
  ["Glut + Kern", () => fixedPolicy([F.GLUT, ...CORE], { ...fixedOpts, exclude: RATE.filter((id) => id !== F.GLUT) })],
  ["Zunder + Kern", () => fixedPolicy([F.ZUNDER, ...CORE], { ...fixedOpts, exclude: RATE.filter((id) => id !== F.ZUNDER) })],
  ["alle Verstärker + Kern", () => fixedPolicy([...RATE, ...CORE], fixedOpts)],
];

// Ein Feuer-Lauf mit Hitze-Beobachtung je Stich (nur solange die Hitze aktiv ist).
export function fireRun(seed, policy) {
  const a = { tricks: 0, sum: 0, b: [0, 0, 0, 0, 0], full: 0, cap: 0, first100: null, from: null, wins: 0, marginWins: 0, marginGain: 0, losses: 0, last: null };
  runOne(seed, policy, null, { onTrick: (s) => {
    a.last = s;
    const h = s.heat; if (!h || !h.active) return;
    if (a.from == null) a.from = s.trickNo;
    const v = h.value || 0;
    a.tricks += 1; a.sum += v;
    a.b[v < 20 ? 0 : v < 50 ? 1 : v < 80 ? 2 : v < C.HEAT_MAX ? 3 : 4] += 1;
    if (v >= C.HEAT_MAX) a.full += 1;
    if (v >= (h.max || C.HEAT_MAX) - 1e-9) a.cap += 1;
    if (a.first100 == null && v >= C.HEAT_MAX) a.first100 = s.trickNo - a.from;
    const t = s.lastTrick; if (!t) return;
    if (t.result === "win" || t.result === "win_tie") {
      a.wins += 1;
      const m = t.pValue - t.oValue;
      if (m >= C.HEAT_MIN_MARGIN) { a.marginWins += 1; a.marginGain += (m - C.HEAT_MARGIN_OFFSET) * C.HEAT_PER_POINT; }
    } else if (t.result === "loss") a.losses += 1;
  } }, { archetypes: ["fire"] });
  const s = a.last, cycles = Math.max(1, a.tricks / TPC);
  return {
    seed, score: s.score, active: a.tricks > 0,
    heatMean: a.tricks ? a.sum / a.tricks : 0, fullShare: a.tricks ? a.full / a.tricks : 0, capShare: a.tricks ? a.cap / a.tricks : 0,
    buckets: a.b.map((n) => (a.tricks ? n / a.tricks : 0)), first100: a.first100,
    marginWinShare: a.wins ? a.marginWins / a.wins : 0, winShare: a.tricks ? a.wins / a.tricks : 0,
    gainPerCycle: a.marginGain / cycles, coolPerCycle: (a.losses * C.HEAT_LOSS) / cycles,
    heatMultShare: s.score ? (s.fireHeat || 0) / s.score : 0, fireBaseShare: s.score ? (s.fireBase || 0) / s.score : 0,
    weissglut: s.skills.includes(F.WEISSGLUT), rateHeld: RATE.filter((id) => s.skills.includes(id)).length, held: s.skills.length,
  };
}

// ---- Blitz ----
const STACK_BUILD = [L.KETTENBLITZ, L.BLITZSCHLAG, L.ABLEITER, L.IONENFELD, L.RESTSTROM, L.KURZSCHLUSS, L.BLITZFAENGER, L.UEBERSPANNUNG, L.LADUNGSSERIE, L.VORENTLADUNG, L.GEWITTERFRONT, L.ENTLADUNG, L.UEBERSCHLAG, L.SPANNUNGSSTAU, L.SERIENSCHUTZ];
const CRIT_BUILD = [L.LADUNGSSERIE, L.VORENTLADUNG, L.GEWITTERFRONT, L.ENTLADUNG, L.UEBERSCHLAG, L.SPANNUNGSSTAU, L.ABLEITER, L.RESTSTROM, L.IONENFELD, L.BLITZSCHLAG, L.KETTENBLITZ, L.KURZSCHLUSS, L.BLITZFAENGER, L.UEBERSPANNUNG, L.SERIENSCHUTZ];
export const LIGHTNING_BUILDS = [
  ["Fraktion (zufällig)", () => factionPolicy("lightning")],
  ["Stapel zuerst", () => fixedPolicy(STACK_BUILD, fixedOpts)],
  ["Crit zuerst", () => fixedPolicy(CRIT_BUILD, fixedOpts)],
];

export function lightningRun(seed, policy) {
  const a = { wins: 0, winStacks: 0, winWithStack: 0, capHits: 0, critMultSum: 0, critN: 0, last: null };
  runOne(seed, policy, null, { onTrick: (s) => {
    a.last = s;
    const t = s.lastTrick; if (!t || !(t.result === "win" || t.result === "win_tie")) return;
    a.wins += 1; const st = (t.pCard && t.pCard.ionStacks) || 0; a.winStacks += st; if (st > 0) a.winWithStack += 1;
    // §7.18: Crit-Multiplikator am 8×-Deckel? (Rampen Gewitterfront/Entladung/Überschlag können dann nichts mehr zeigen.)
    if (t.isCrit) { a.critN += 1; a.critMultSum += t.critMultiplier || 0; if ((t.critMultiplier || 0) >= C.CRIT_MULT_CAP - 1e-9) a.capHits += 1; }
  } }, { archetypes: ["lightning"] });
  const s = a.last, li = s.lightning || {};
  const stacks = (s.deck || []).map((c) => c.ionStacks || 0);
  return {
    seed, score: s.score, tricks: s.trickNo, wins: s.wins, crits: s.crits, critRate: s.wins ? s.crits / s.wins : 0,
    bars: li.bars || 0, tricksPerBar: li.bars ? s.trickNo / li.bars : Infinity, ionTotal: s.ionTotal || 0,
    stacksPerCard: mean(stacks), ionizedShare: stacks.filter((n) => n > 0).length / (stacks.length || 1), maxStacks: Math.max(0, ...stacks),
    winStacksMean: a.wins ? a.winStacks / a.wins : 0, winWithStackShare: a.wins ? a.winWithStack / a.wins : 0,
    critShare: s.score ? (s.critBonusScore || 0) / s.score : 0, ionFlatShare: s.score ? (s.lightYield || 0) / s.score : 0,
    capShare: a.critN ? a.capHits / a.critN : 0, critMultMean: a.critN ? a.critMultSum / a.critN : 0,
    held: s.skills.length,
  };
}

// Unterprozess-Teil: nur die Scores je Build (für die gepaarte Stapel-Ablation mit SIM_ION_SCORE_PER_STACK=0).
function lightningScoresJson(runs, seed0) {
  const out = {};
  for (const [name, make] of LIGHTNING_BUILDS) out[name] = Array.from({ length: runs }, (_, i) => runOne(seed0 + i, make(), null, null, { archetypes: ["lightning"] }).score);
  process.stdout.write(JSON.stringify(out));
}

export function runMotor({ arg, seed0, write } = {}) {
  const runs = Number((arg && arg("--runs", 100)) || 100);
  if (arg && arg("--part", "") === "lightning-scores") return lightningScoresJson(runs, seed0);
  const only = arg ? String(arg("--arch", "fire,lightning")) : "fire,lightning";
  const payload = { mode: "motor", runs, seedFrom: seed0, knobs: { ION_SCORE_PER_STACK: C.ION_SCORE_PER_STACK, LIGHTNING_CRIT_PER_SKILL: C.LIGHTNING_CRIT_PER_SKILL, HEAT_MULT_PER_10: C.HEAT_MULT_PER_10, HEAT_PER_POINT: C.HEAT_PER_POINT, HEAT_LOSS: C.HEAT_LOSS, HEAT_MIN_MARGIN: C.HEAT_MIN_MARGIN } };

  if (only.includes("fire")) {
    console.log(`\n=== MOTOR Feuer — Hitze im Lauf (${runs} Läufe, Seeds ${seed0}..${seed0 + runs - 1}, Welt nur Feuer) ===`);
    console.log(`  Passiv: ab Vorsprung ${C.HEAT_MIN_MARGIN} je Punkt über ${C.HEAT_MARGIN_OFFSET} +${C.HEAT_PER_POINT} % Hitze · Niederlage −${C.HEAT_LOSS} % · je 10 % +${Math.round(C.HEAT_MULT_PER_10 * 100)} % Score`);
    console.log(`  Build                  Median      Ø Hitze  ≥100 %   Anschlag  bis 100   Vorspr.-Siege  +Hitze/Rd  −Kühl/Rd  Mult-Anteil  Weißglut`);
    payload.fire = {};
    for (const [name, make] of FIRE_BUILDS) {
      const rs = Array.from({ length: runs }, (_, i) => fireRun(seed0 + i, make())).filter((r) => r.active);
      const row = {
        n: rs.length, median: median(rs.map((r) => r.score)), heatMean: mean(rs.map((r) => r.heatMean)), fullShare: mean(rs.map((r) => r.fullShare)),
        capShare: mean(rs.map((r) => r.capShare)), first100: median(rs.filter((r) => r.first100 != null).map((r) => r.first100)),
        reached100: rs.filter((r) => r.first100 != null).length / (rs.length || 1),
        marginWinShare: mean(rs.map((r) => r.marginWinShare)), winShare: mean(rs.map((r) => r.winShare)),
        gainPerCycle: mean(rs.map((r) => r.gainPerCycle)), coolPerCycle: mean(rs.map((r) => r.coolPerCycle)),
        heatMultShare: mean(rs.map((r) => r.heatMultShare)), fireBaseShare: mean(rs.map((r) => r.fireBaseShare)),
        weissglut: mean(rs.map((r) => (r.weissglut ? 1 : 0))), rateHeld: mean(rs.map((r) => r.rateHeld)),
        buckets: [0, 1, 2, 3, 4].map((k) => mean(rs.map((r) => r.buckets[k]))),
      };
      payload.fire[name] = row;
      console.log(`  ${name.padEnd(22)} ${fmt(row.median).padStart(10)}   ${row.heatMean.toFixed(0).padStart(5)} %  ${pct(row.fullShare)}  ${pct(row.capShare)}  ${String(Math.round(row.first100)).padStart(4)} St.  ${pct(row.marginWinShare)}       ${row.gainPerCycle.toFixed(0).padStart(4)} %    ${row.coolPerCycle.toFixed(0).padStart(4)} %   ${pct(row.heatMultShare)}   ${pct(row.weissglut)}`);
      console.log(`    Hitze-Verteilung je Stich: <20 ${pct(row.buckets[0])} · 20–50 ${pct(row.buckets[1])} · 50–80 ${pct(row.buckets[2])} · 80–100 ${pct(row.buckets[3])} · ≥100 ${pct(row.buckets[4])}   (Läufe mit 100 erreicht: ${pct(row.reached100)}, Ø Verstärker gehalten ${row.rateHeld.toFixed(1)}, Siegquote ${pct(row.winShare)})`);
    }
    console.log(`  Lesart: „Anschlag" = Hitze auf der Leistenlänge des Builds (100, mit Weißglut 200); „≥100 %" = voller Passiv-Multiplikator (×${(1 + 10 * C.HEAT_MULT_PER_10).toFixed(2)}).`);
    console.log(`  „+Hitze/Rd" = Passiv-Gewinn aus Vorsprung-Siegen je Runde OHNE Verstärker (Glut wäre ×Stufe darauf), „−Kühl/Rd" = Niederlagen × ${C.HEAT_LOSS}.`);
  }

  if (only.includes("lightning")) {
    console.log(`\n=== MOTOR Blitz — Ionisierung im Lauf (${runs} Läufe, Seeds ${seed0}..${seed0 + runs - 1}, Welt nur Blitz) ===`);
    console.log(`  Passiv: +${Math.round(C.LIGHTNING_CRIT_PER_SKILL * 100)} % Crit je Skill · Leiste ${C.LIGHTNING_MAX_CHARGE} · Stapel-Score ${C.ION_SCORE_PER_STACK} in die Basis · +${C.ION_CRIT_MULT_PER_STACK}× Crit-Mult je Stapel`);
    // Gepaarte Stapel-Ablation im Unterprozess (Stapel-Score 0, sonst identisch).
    let ablated = null;
    try {
      // Beide Stapel-Wirkungen aus (§7.12: Basis-Score UND Crit-Multiplikator), sonst identischer Lauf.
      const raw = execFileSync(process.execPath, ["sim/batch.js", "--mode", "motor", "--part", "lightning-scores", "--runs", String(runs), "--seed", String(seed0)],
        { env: { ...process.env, SIM_ION_SCORE_PER_STACK: "0", SIM_ION_CRIT_MULT_PER_STACK: "0" }, stdio: ["ignore", "pipe", "inherit"], maxBuffer: 64 * 1024 * 1024 }).toString();
      ablated = JSON.parse(raw);
    } catch (e) { console.log(`  (Stapel-Ablation im Unterprozess fehlgeschlagen: ${e.message})`); }
    console.log(`  Build                  Median      Crits/Lauf  Crit-Rate  Leisten/Lauf  Stiche/Leiste  Stapel/Lauf  Stapel/Karte  ionisiert  Siegkarte Ø  Crit-Anteil  Stapel-Anteil   Crit-Mult Ø  am Deckel`);
    payload.lightning = {};
    for (const [name, make] of LIGHTNING_BUILDS) {
      const rs = Array.from({ length: runs }, (_, i) => lightningRun(seed0 + i, make()));
      const scores = rs.map((r) => r.score);
      const abl = ablated && ablated[name];
      const paired = abl ? rs.map((r, i) => (r.score > 0 ? (r.score - abl[i]) / r.score : 0)) : null;
      const row = {
        n: rs.length, median: median(scores), crits: mean(rs.map((r) => r.crits)), critRate: mean(rs.map((r) => r.critRate)),
        bars: mean(rs.map((r) => r.bars)), tricksPerBar: rs.reduce((t, r) => t + r.tricks, 0) / Math.max(1, rs.reduce((t, r) => t + r.bars, 0)),
        ionTotal: mean(rs.map((r) => r.ionTotal)), stacksPerCard: mean(rs.map((r) => r.stacksPerCard)), ionizedShare: mean(rs.map((r) => r.ionizedShare)),
        maxStacks: mean(rs.map((r) => r.maxStacks)), winStacksMean: mean(rs.map((r) => r.winStacksMean)), winWithStackShare: mean(rs.map((r) => r.winWithStackShare)),
        critShare: mean(rs.map((r) => r.critShare)), ionFlatShare: mean(rs.map((r) => r.ionFlatShare)),
        stackShareMean: paired ? mean(paired) : null, stackShareMedian: paired ? median(paired) : null, ablatedMedian: abl ? median(abl) : null,
        capShare: mean(rs.map((r) => r.capShare)), critMultMean: mean(rs.map((r) => r.critMultMean)),
        held: mean(rs.map((r) => r.held)),
      };
      payload.lightning[name] = row;
      console.log(`  ${name.padEnd(22)} ${fmt(row.median).padStart(10)}   ${row.crits.toFixed(0).padStart(6)}     ${pct(row.critRate)}   ${row.bars.toFixed(1).padStart(8)}     ${row.tricksPerBar.toFixed(1).padStart(8)}     ${row.ionTotal.toFixed(0).padStart(6)}      ${row.stacksPerCard.toFixed(1).padStart(6)}     ${pct(row.ionizedShare)}    ${row.winStacksMean.toFixed(1).padStart(6)}     ${pct(row.critShare)}   ${paired ? `${pct(row.stackShareMedian)} (Ø ${pct(row.stackShareMean).trim()})` : "n/a"}   ${row.critMultMean.toFixed(2).padStart(8)}×  ${pct(row.capShare)}`);
    }
    console.log(`  Lesart: „Stapel-Anteil" = Score-Verlust desselben Laufs ohne jede Stapel-Wirkung (Stapel-Score 0 und Crit-Mult je Stapel 0; gepaart, Median und Ø je Lauf); „Crit-Anteil" = critBonusScore ÷ Score.`);
    console.log(`  „am Deckel" = Anteil der Crits, deren fertiger Crit-Multiplikator am Deckel ${C.CRIT_MULT_CAP}× stand (§7.18: dort zeigen Gewitterfront, Entladung und Überschlag nichts mehr).`);
    console.log(`  „Siegkarte Ø" = Stapel auf der gespielten Karte bei einem Sieg; „ionisiert" = Anteil der Karten mit ≥ 1 Stapel am Laufende.`);
  }
  if (write) write(payload);
  return payload;
}
