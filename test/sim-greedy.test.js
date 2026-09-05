import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { archetypeOf } from "../src/game/skills.js";
import { runOne } from "../sim/run.js";
import { newMemory } from "../sim/memory.js";
import { greedyPolicy, buildValueTable, tierKey, skillOfOption, tierOfOption, DECLINE } from "../sim/policies/greedy.js";
import { flagFor } from "../sim/skills-eval.js";

/* exp skill rework — Sim-Nähte der großen Auswertung: Archetyp-Allowlist je Lauf, stufenbewusste Arme, Greedy-
   Determinismus und die gepaarte Ablation (drop). Kleine Läufe (Formations-Solver aus), damit der Test schnell bleibt. */
const ARCH = ["fire", "lightning"];
const opts = { archetypes: ARCH };

describe("Sim — Archetyp-Allowlist je Lauf (START_RUN action.archetypes)", () => {
  it("das Erst-Angebot enthält nur Skills der genannten Archetypen; ohne Angabe bleibt der Pool offen", () => {
    const s = reducer(null, { type: "START_RUN", rng: makeRng(1), architect: true, archetypes: ARCH });
    expect(s.unlockedArchetypes).toEqual(ARCH);
    expect(s.skillOffer.length).toBeGreaterThan(0);
    expect(s.skillOffer.every((id) => ARCH.includes(archetypeOf(id)))).toBe(true);
    expect(reducer(null, { type: "START_RUN", rng: makeRng(1), architect: true }).unlockedArchetypes).toBe(null);
    expect(reducer(null, { type: "START_RUN", rng: makeRng(1), architect: true, archetypes: [] }).unlockedArchetypes).toBe(null);
  });
  it("ein ganzer Lauf hält nur Feuer- und Blitz-Skills", () => {
    const r = runOne(7, greedyPolicy({ explore: true, solveFormations: false }), newMemory(), null, opts);
    expect(r.build.skills.length).toBeGreaterThan(0);
    expect(r.build.skills.every((id) => ARCH.includes(archetypeOf(id)))).toBe(true);
    expect(r.build.archetypes.every((a) => ARCH.includes(a))).toBe(true);
    for (const id of r.build.skills) if (!id.includes("_L")) expect(Number.isInteger(r.build.skillTiers[id])).toBe(true);
  });
});

describe("Sim — greedyPolicy (stufenbewusst)", () => {
  it("tierKey/skillOfOption/tierOfOption: Skill und Stufe, Legendäre ohne Stufe, fehlende Stufe = Normal", () => {
    expect(tierKey("SK_FIRE_01", 2)).toBe("SK_FIRE_01@2");
    expect(tierKey("SK_FIRE_01", undefined)).toBe("SK_FIRE_01@0");
    expect(tierKey("SK_FIRE_L01", 3)).toBe("SK_FIRE_L01@L");
    expect(skillOfOption("SK_LIGHTNING_03@1")).toBe("SK_LIGHTNING_03");
    expect(tierOfOption("SK_LIGHTNING_03@1")).toBe(1);
    expect(tierOfOption("SK_FIRE_L02@L")).toBe("L");
    expect(DECLINE).toBe("__decline__");
  });
  it("explore lernt Arme je (Skill, Stufe); der Greedy-Lauf ist deterministisch, meidet den ablatierten Skill und bleibt in der Welt", () => {
    const mem = newMemory();
    for (let i = 0; i < 4; i++) runOne(100 + i, greedyPolicy({ explore: true, solveFormations: false }), mem, null, opts);
    const arms = mem.ranking("skill");
    expect(arms.length).toBeGreaterThan(0);
    expect(arms.some((r) => /@[0-3]$/.test(r.id))).toBe(true);
    const table = buildValueTable(mem);
    expect(table.rows().length).toBe(arms.length + mem.ranking("perk").length);
    const g = greedyPolicy({ explore: false, table, solveFormations: false });
    const a = runOne(200, g, null, null, opts);
    const b = runOne(200, g, null, null, opts);
    expect(a.score).toBe(b.score);
    expect(a.build.skills).toEqual(b.build.skills);
    expect(a.build.skills.every((id) => ARCH.includes(archetypeOf(id)))).toBe(true);
    const victim = a.build.skills[0];
    if (victim) {
      const d = runOne(200, greedyPolicy({ explore: false, table, drop: victim, solveFormations: false }), null, null, opts);
      expect(d.build.skills).not.toContain(victim);
    }
    expect(() => greedyPolicy({ explore: false })).toThrow();
  });
  it("flagFor: stark / tot / schadet / selten / Leiter aus Marginal und Stufen-Lifts", () => {
    const row = (marginal, tiers = []) => ({ legendary: !tiers.length, tiers, marginal });
    expect(flagFor(row({ applicableRate: 0.5, pctEffect: 0.3, winRate: 0.7 }))).toBe("stark");
    expect(flagFor(row({ applicableRate: 0.5, pctEffect: 0.01, winRate: 0.5 }))).toBe("tot");
    expect(flagFor(row({ applicableRate: 0.5, pctEffect: -0.1, winRate: 0.3 }))).toBe("schadet");
    expect(flagFor(row({ applicableRate: 0.02, pctEffect: 0.5, winRate: 0.9 }))).toBe("selten");
    const kipp = [{ n: 20, lift: 1.1 }, { n: 20, lift: 1.0 }, { n: 5, lift: 0.5 }, { n: 20, lift: 1.2 }];
    expect(flagFor(row({ applicableRate: 0.5, pctEffect: 0.1, winRate: 0.65 }, kipp))).toBe("Leiter");
    expect(flagFor(row(null, [{ n: 20, lift: 1.0 }, { n: 20, lift: 1.05 }, { n: 20, lift: 1.1 }, { n: 20, lift: 1.2 }]))).toBe("");
  });
});
