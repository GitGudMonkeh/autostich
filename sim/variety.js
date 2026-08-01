// Build-Variety-Diagnose je Fraktion (--mode variety). Pro Skill der „Lift" = Ø-Score der Runs, die den Skill
// halten, ÷ Gesamt-Ø der Fraktion. Flache Lifts (nah 1) → echte Auswahl; wenige hohe Lifts + toter Tail (<1)
// → dieselben wenigen Combos dominieren. Misst mit der fraktions-biased Policy (zufällige Fraktions-Skills).
import { runOne } from "./run.js";
import { factionPolicy } from "./policies/faction.js";
import { SKILL_DEFS } from "../src/game/skills.js";

const FACTIONS = { Feuer: ["fire", "SK_FIRE"], Blitz: ["lightning", "SK_LIGHTNING"], Eis: ["ice", "SK_ICE"], Pflanze: ["plant", "SK_PLANT"] };
const fmt = (n) => Math.round(n).toLocaleString("de-DE");

export function runVariety({ arg, seed0 } = {}) {
  const N = Number((arg && arg("--runs", 200)) || 200);
  console.log(`\n=== BUILD-VARIETY (fraktions-biased, ${N} Runs/Fraktion) — Lift = Ø-Score-mit-Skill ÷ Gesamt-Ø ===`);
  for (const [name, [target, prefix]] of Object.entries(FACTIONS)) {
    const p = factionPolicy(target);
    const runs = Array.from({ length: N }, (_, i) => {
      const r = runOne(seed0 + i, p);
      return { score: r.score, skills: r.build.skills.filter((id) => id.startsWith(prefix)) };
    });
    const overall = runs.reduce((t, r) => t + r.score, 0) / runs.length;
    const rows = Object.keys(SKILL_DEFS).filter((id) => id.startsWith(prefix)).map((id) => {
      const held = runs.filter((r) => r.skills.includes(id));
      return { name: SKILL_DEFS[id].name, held: held.length, lift: held.length ? (held.reduce((t, r) => t + r.score, 0) / held.length) / overall : null };
    }).filter((r) => r.held >= 8).sort((a, b) => b.lift - a.lift);
    const lifts = rows.map((r) => r.lift);
    const med = lifts[Math.floor(lifts.length / 2)];
    console.log(`\n  ${name} (Ø ${fmt(overall)}, ${rows.length} Skills):  Lift top ${lifts[0].toFixed(2)}× · median ${med.toFixed(2)}× · bottom ${lifts[lifts.length - 1].toFixed(2)}×  (top/median ${(lifts[0] / med).toFixed(2)}×)`);
    console.log(`    Muss-Picks (Lift ≥1,10): ${rows.filter((r) => r.lift >= 1.10).map((r) => `${r.name} ${r.lift.toFixed(2)}`).join(" · ") || "keine"}`);
    console.log(`    Schwach (Lift <0,95):    ${rows.filter((r) => r.lift < 0.95).map((r) => `${r.name} ${r.lift.toFixed(2)}`).join(" · ") || "keine"}`);
  }
  console.log(`\nHinweis: misst ZUFÄLLIGE Builds — mit gezieltem Bauen (Synergien) ist die echte Vielfalt höher. Enabler-Gating hebt den toten Verstärker-Tail.`);
}
