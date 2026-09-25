// Legendäre im Vergleich (--mode legendaries, exp skill rework): jedes Legendäre zur SELBEN Skill-Phase „bekommen".
// Owner-Frage (2026-09-06): „alle Legendären im Vergleich, wenn man sie gegen Mitte des Runs bekommt."
//
//   1) EXPLORE wie --mode skills (stufenbewusste UCB-Läufe) → eingefrorene Wertetabelle des gierigen Spielers.
//   2) BASIS: `runs` gierige Läufe auf frischen Seeds, ohne Eingriff.
//   3) JE LEGENDÄREM: dieselben Seeds noch einmal; in Skill-Phase `at` (Default: die mittlere, bei 13 Phasen die 7. =
//      Runde 25) liegt das Legendäre auf dem ersten Platz von Tür 1, der Spieler öffnet sie und nimmt es. Hält er es
//      schon (natürlich gewürfelt), passiert nichts — das Paar bleibt gültig (Δ 0). Der Eingriff ersetzt einen normalen
//      Pick, mehr nicht: Angebot, rng und alle übrigen Züge laufen wie im Basislauf, bis die Builds sich trennen.
//   Gepaart je Seed (robustDelta): Median-Δ, typischer multiplikativer Effekt, Vorzeichen-Quote; dazu die Quote, in der
//   das Legendäre am Laufende gehalten wird, und wie oft der Basislauf es ohnehin hatte.
// Bewusst OHNE Zeitstempel im JSON (gleicher Seed-Satz → byte-gleiche Datei).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { runOne } from "./run.js";
import { newMemory } from "./memory.js";
import { greedyPolicy, buildValueTable, valueTableRows, valueTableFromRows } from "./policies/greedy.js";
import { atDoors, canAddSkill } from "./policies/random.js";
import { robustDelta } from "./eval.js";
import { SKILL_LIST, SKILL_DEFS, archetypeOf } from "../src/game/skills.js";
import { DECISION_SCHEDULE } from "../src/game/constants.js";

const NAME = { fire: "Feuer", lightning: "Blitz", ice: "Eis", plant: "Pflanze", stance: "Prisma" };
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return 0; const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
const mean = (a) => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : 0);
const stats = (a) => ({ n: a.length, median: quantile(a, 0.5), mean: mean(a), p90: quantile(a, 0.9) });

// Skill-Phasen des Plans (1-basiert) → Runde (1-indexiert), z. B. Phase 7 → Runde 25 im 50-Plan.
export const skillPhaseRounds = (schedule = DECISION_SCHEDULE) => schedule.map((d, i) => (d === "skill" ? i + 1 : null)).filter(Boolean);
export const middleSkillPhase = (schedule = DECISION_SCHEDULE) => Math.ceil(skillPhaseRounds(schedule).length / 2);

/* Eingriff für EINEN Lauf. Zählt die Türstufen (eine je Skill-Phase; der Neuwurf würfelt Skills, keine Türen) und legt in
   Phase `at` das Legendäre auf den ersten Platz von Tür 1 — die Stufe des ersetzten Skills fällt weg, Legendäre haben
   keine. Die umhüllte Policy öffnet dort Tür 1 und nimmt das Legendäre; danach spielt sie wieder wie zuvor. */
export function legendaryInjection(id, at, policy) {
  let phase = 0, injected = false, pending = false, alreadyHeld = false, blocked = false;
  const hooks = {
    beforeAct(s) {
      if (!atDoors(s)) return s;
      phase += 1;
      if (phase !== at) return s;
      if (s.skills.includes(id)) { alreadyHeld = true; return s; }
      const doors = s.skillDoors.map((d, i) => {
        if (i !== 0) return d;
        const tiers = { ...(d.tiers || {}) };
        delete tiers[d.skills[0]];
        return { ...d, skills: [id, ...d.skills.slice(1)], tiers };
      });
      injected = true; pending = true;
      return { ...s, skillDoors: doors };
    },
  };
  const wrapped = {
    name: `${policy.name}+${id}@${at}`,
    act(s, rng, mem) {
      if (pending) {
        if (atDoors(s)) return { type: "CHOOSE_DOOR", index: 0 };
        pending = false; // die Türstufe ist vorbei — nehmen, wenn es im Angebot liegt, sonst weiter wie gewohnt
        /* `canAddSkill` statt nur „liegt im Angebot": bei FÜNF Fraktionen in der Welt kann der Bau schon vier
           Archetypen halten, und dann lehnt der Reducer den Pick ab — die Action brächte keinen Fortschritt und
           runOne würfe. Dieser Lauf bleibt dann Zug für Zug der Basislauf (Δ 0) und wird als `blocked` gezählt,
           damit die Quote im Bericht steht statt still zu verschwinden. */
        if (s.phase === "levelup" && s.skillOffer && s.skillOffer.includes(id) && !s.skills.includes(id)) {
          if (canAddSkill(s, id)) return { type: "PICK_SKILL", skillId: id, rng };
          blocked = true;
        }
      }
      return policy.act(s, rng, mem);
    },
  };
  return { hooks, policy: wrapped, result: () => ({ injected, alreadyHeld, blocked }) };
}

export function computeLegendaries({ seed0 = 1, exploreRuns = 600, runs = 150, arch = ["fire", "lightning"], at = null, c = 1.4, solveFormations = true, tableFile = null, log = null } = {}) {
  const opts = { archetypes: arch };
  const say = (m) => { if (log) log(m); };
  /* 1) Explore → Wertetabelle (dieselbe Mechanik wie --mode skills). Mit `tableFile` wird sie einmal erkundet und
        danach wiederverwendet: eine geänderte Konstante soll die Zeile IHRES Legendären verschieben, nicht die Welt
        (§6.12 — ohne die geteilte Tabelle schwankten unberührte Zeilen um den Faktor 2). */
  let table;
  if (tableFile && existsSync(tableFile)) {
    table = valueTableFromRows(JSON.parse(readFileSync(tableFile, "utf8")));
    say(`  Wertetabelle aus ${tableFile}`);
  } else {
    const mem = newMemory();
    const ex = greedyPolicy({ explore: true, c, solveFormations });
    for (let i = 0; i < exploreRuns; i++) {
      runOne(seed0 + i, ex, mem, null, opts);
      if ((i + 1) % 200 === 0) say(`  explore ${i + 1}/${exploreRuns}`);
    }
    table = buildValueTable(mem);
    if (tableFile) {
      mkdirSync(dirname(tableFile), { recursive: true });
      writeFileSync(tableFile, JSON.stringify(valueTableRows(mem)));
      say(`  Wertetabelle → ${tableFile}`);
    }
  }
  const greedy = () => greedyPolicy({ explore: false, table, solveFormations });
  // 2) Basis auf frischen Seeds.
  const evalSeed0 = seed0 + exploreRuns;
  const base = Array.from({ length: runs }, (_, i) => runOne(evalSeed0 + i, greedy(), null, null, opts));
  say(`  greedy ${runs} Läufe`);
  // 3) Je Legendärem: dieselben Seeds mit dem Eingriff in Phase `at`.
  const phase = at || middleSkillPhase();
  const rounds = skillPhaseRounds();
  const ids = SKILL_LIST.filter((s) => s.legendary && arch.includes(s.archetype)).map((s) => s.id);
  const baseScores = base.map((r) => r.score);
  const rows = ids.map((id) => {
    const deltas = [], ratios = [], scores = [], takeable = [];
    let injected = 0, alreadyHeld = 0, heldAtEnd = 0, blocked = 0;
    for (let i = 0; i < runs; i++) {
      const inj = legendaryInjection(id, phase, greedy());
      const r = runOne(evalSeed0 + i, inj.policy, null, inj.hooks, opts);
      const st = inj.result();
      if (st.injected) injected += 1;
      if (st.alreadyHeld) alreadyHeld += 1;
      if (st.blocked) blocked += 1;
      takeable.push(!st.blocked);
      if (r.build.skills.includes(id)) heldAtEnd += 1;
      scores.push(r.score);
      deltas.push(r.score - baseScores[i]);
      ratios.push(Math.log(Math.max(1, r.score) / Math.max(1, baseScores[i])));
    }
    say(`  ${SKILL_DEFS[id].name}`);
    return {
      id, name: SKILL_DEFS[id].name, arch: archetypeOf(id),
      injectedRate: injected / runs, alreadyHeldRate: alreadyHeld / runs, heldAtEndRate: heldAtEnd / runs,
      blockedRate: blocked / runs, // Archetyp-Deckel erreicht: der Pick war nicht legal, der Lauf bleibt der Basislauf
      naturalRate: base.filter((r) => r.build.skills.includes(id)).length / runs, // im Basislauf ohnehin gehalten (natürlich gewürfelt)
      score: stats(scores), lift: mean(scores) / (mean(baseScores) || 1), marginal: robustDelta(deltas, ratios),
      /* Zweite Lesart: nur die Läufe, in denen der Pick überhaupt legal war. Ein gesperrter Lauf ist Zug für Zug
         der Basislauf und trägt Δ 0 — bei 38 % Sperrquote (Eis in der Fünfer-Welt) sitzt der Median dann in der
         Nullmasse und misst den Deckel statt das Legendäre. Beide Spalten stehen im Bericht. */
      marginalTaken: robustDelta(deltas.filter((_, i) => takeable[i]), ratios.filter((_, i) => takeable[i])),
    };
  });
  rows.sort((a, b) => b.marginal.median - a.marginal.median);
  return { arch, exploreRuns, runs, evalSeed0, c, tableFile, at: phase, round: rounds[phase - 1] || null, skillPhases: rounds.length, baseScore: stats(baseScores), rows };
}

export function runLegendaries({ arg, seed0, c, f, write }) {
  const fmt = f || ((n) => Math.round(n).toLocaleString("de-DE"));
  const res = computeLegendaries({
    seed0,
    exploreRuns: Number(arg("--explore", 600)),
    runs: Number(arg("--runs", 150)),
    arch: String(arg("--arch", "fire,lightning")).split(",").filter(Boolean),
    at: arg("--at", "") ? Number(arg("--at", "")) : null,
    tableFile: arg("--table", "") || null,
    c,
    log: (m) => console.log(m),
  });
  const pct = (x) => `${(x * 100).toFixed(0)} %`;
  console.log(`\n=== LEGENDÄRE ${res.arch.map((a) => NAME[a] || a).join(" / ")} — in Skill-Phase ${res.at} von ${res.skillPhases} (Runde ${res.round}) bekommen; explore ${res.exploreRuns}, gierig ${res.runs} Läufe (Seeds ${res.evalSeed0}..${res.evalSeed0 + res.runs - 1}), gepaart ===`);
  console.log(`  Basis (ohne Eingriff): Median ${fmt(res.baseScore.median)}  Mean ${fmt(res.baseScore.mean)}  p90 ${fmt(res.baseScore.p90)}`);
  console.log(`  ${"Legendär".padEnd(16)} ${"Frak.".padEnd(6)} ${"Median-Δ".padStart(12)}  ${"typ.".padStart(6)}  ${"besser in".padStart(9)}  ${"Median mit".padStart(12)}  ${"Lift".padStart(5)}  ${"gehalten".padStart(8)}  ${"ohnehin".padStart(7)}  ${"gesperrt".padStart(8)}  ${"typ.|frei".padStart(9)}`);
  for (const r of res.rows) {
    const m = r.marginal;
    console.log(`  ${r.name.padEnd(16)} ${(NAME[r.arch] || r.arch).padEnd(6)} ${fmt(m.median).padStart(12)}  ${`${m.pctEffect >= 0 ? "+" : ""}${(m.pctEffect * 100).toFixed(0)} %`.padStart(6)}  ${pct(m.winRate).padStart(9)}  ${fmt(r.score.median).padStart(12)}  ${r.lift.toFixed(2).padStart(5)}  ${pct(r.heldAtEndRate).padStart(8)}  ${pct(r.naturalRate).padStart(7)}  ${pct(r.blockedRate).padStart(8)}  ${`${r.marginalTaken.pctEffect >= 0 ? "+" : ""}${(r.marginalTaken.pctEffect * 100).toFixed(0)} %`.padStart(9)}`);
  }
  console.log(`  Lesart: „Median-Δ" = Score mit dem Legendären minus derselbe Seed ohne (gepaart); „typ." = typischer multiplikativer Effekt; „besser in" = Anteil der Seeds mit Gewinn;`);
  console.log(`  „gesperrt" = Anteil der Läufe, in denen der Archetyp-Deckel (MAX_ARCHETYPES) den Pick verhinderte — dort bleibt der Lauf der Basislauf, Δ 0;`);
  console.log(`  „typ.|frei" = derselbe typische Effekt, aber NUR über die Läufe, in denen der Pick legal war. Bei hoher Sperrquote ist das die belastbarere Spalte.`);
  console.log(`  „gehalten" = das Legendäre steht am Laufende im Build (Eingriff + natürlich); „ohnehin" = der Basislauf hatte es schon ohne Eingriff.`);
  write(res);
}
