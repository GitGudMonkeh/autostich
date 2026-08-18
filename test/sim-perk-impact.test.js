import { describe, it, expect } from "vitest";
import { computePerkImpact, LEGENDARY_IDS } from "../sim/perk-impact.mjs";
import { PERK_LIST, isLegendary } from "../src/game/perks.js";

// Klein gehalten (explore 0, wenige Seeds): geprüft werden Determinismus, Abdeckung und die
// Struktur-Invarianten — NICHT die Effektstärken. Die hängen an SIM_PERK_LEGENDARY_BASE und wären
// als Assertion nur flaky; das Urteil liefert der bewusste Messlauf (`npm run impact`).
const ARGS = { seed0: 1, runs: 4, exploreRuns: 0 };

/* Jeder dieser Tests fährt echte Sim-Läufe über den ganzen Legendär-Pool — 6–13 s reine, SYNCHRONE
   Rechenzeit. Das globale Vitest-Limit von 5 s reicht dafür nicht. Bis Vitest 2 fiel das nicht auf,
   weil ein synchroner Testkörper nie am Timeout scheiterte; ab Vitest 4 wird es gemeldet. Das Limit
   steht deshalb ausdrücklich HIER und nicht global: die übrigen ~1350 Tests sollen weiter nach 5 s
   auffliegen, wenn sich jemand eine Endlosschleife einhandelt. */
const SIM_TIMEOUT = 60_000;

describe("sim perk-impact (Legendär-Ablation)", () => {
  it("deckt exakt den legendären Perk-Pool ab, in Definitionsreihenfolge", () => {
    expect(LEGENDARY_IDS).toEqual(PERK_LIST.filter((p) => isLegendary(p.id)).map((p) => p.id));
    expect(LEGENDARY_IDS.length).toBeGreaterThan(0);
    const res = computePerkImpact(ARGS);
    expect(res.perks.map((p) => p.id).sort()).toEqual([...LEGENDARY_IDS].sort());
  }, SIM_TIMEOUT);

  it("ist deterministisch: gleiche Argumente → identisches Ergebnis", () => {
    expect(computePerkImpact(ARGS)).toEqual(computePerkImpact(ARGS));
  }, SIM_TIMEOUT);

  it("`only` misst die Teilmenge, ohne den Referenz-Arm zu verändern", () => {
    const one = computePerkImpact({ ...ARGS, only: ["L_HENK"] });
    expect(one.perks.map((p) => p.id)).toEqual(["L_HENK"]);
    // Der full-Arm hängt nur an priority (immer ALLE Legendären vorn) → identisch zum vollen Lauf.
    // Das ist die Voraussetzung dafür, dass ein --only-Regressionscheck mit dem Gesamtlauf vergleichbar bleibt.
    expect(one.fullScore).toEqual(computePerkImpact(ARGS).fullScore);
  }, SIM_TIMEOUT);

  it("liefert konsistente Kennzahlen je Perk (n ≤ runs, ratio = 1 + pctEffect, sortiert)", () => {
    const res = computePerkImpact(ARGS);
    for (const p of res.perks) {
      expect(p.applicableN).toBeLessThanOrEqual(ARGS.runs);
      expect(p.marginal.n).toBe(ARGS.runs);
      expect(p.ratio).toBeCloseTo(1 + p.marginal.pctEffect, 10);
      expect(p.applicableN / ARGS.runs).toBeCloseTo(p.marginal.applicableRate, 10);
    }
    const ratios = res.perks.map((p) => p.ratio);
    expect([...ratios].sort((a, b) => b - a)).toEqual(ratios); // absteigend nach typ.×
  }, SIM_TIMEOUT);

  it("mutiert die Legendär-Chance NICHT beim blossen Import (nur der CLI-Pfad setzt die ENV)", () => {
    // Sonst würde ein Import dieses Moduls constants.js für andere Sim-Tests im selben Worker verbiegen.
    expect(process.env.SIM_PERK_LEGENDARY_BASE).toBeUndefined();
  });
});
