import { describe, it, expect } from "vitest";
import {
  MIN_SAMPLE, hasEnoughData, scoreOrigin, avgScoreOrigin, pickRates,
  archetypeUsage, bestArchetype, scoreLift, topRunsOrigin, bestRun,
} from "../src/game/runStats.js";

// Kompakter Lauf-Record-Builder — nur die Felder, die die Aggregation liest.
const run = (o = {}) => ({ score: 0, formationScore: 0, critBonusScore: 0, bestStreak: 0, crits: 0, perks: [], skills: [], archetypes: [], ...o });

describe("scoreOrigin", () => {
  it("zerlegt in Formationen/Crits/Übrige und deckelt am Score", () => {
    expect(scoreOrigin(run({ score: 1000, formationScore: 400, critBonusScore: 300 })))
      .toEqual({ formations: 400, crits: 300, rest: 300, total: 1000 });
  });
  it("wird nie negativ, wenn Teil-Scores > Gesamt (Alt-/Rundungsdaten)", () => {
    const o = scoreOrigin(run({ score: 500, formationScore: 400, critBonusScore: 300 }));
    expect(o.formations + o.crits + o.rest).toBe(500);
    expect(o.rest).toBeGreaterThanOrEqual(0);
  });
  it("fehlende Felder → 0", () => {
    expect(scoreOrigin({ score: 200 })).toEqual({ formations: 0, crits: 0, rest: 200, total: 200 });
  });
});

describe("avgScoreOrigin", () => {
  it("mittelt absolute Werte und liefert Anteile, die zu 1 summieren", () => {
    const h = [run({ score: 1000, formationScore: 500, critBonusScore: 0 }), run({ score: 1000, formationScore: 0, critBonusScore: 500 })];
    const a = avgScoreOrigin(h);
    expect(a.formations).toBe(250);
    expect(a.crits).toBe(250);
    expect(a.rest).toBe(500);
    expect(a.shares.formations + a.shares.crits + a.shares.rest).toBeCloseTo(1, 6);
  });
  it("leere Historie → Nullen ohne Division durch 0", () => {
    expect(avgScoreOrigin([])).toEqual({ formations: 0, crits: 0, rest: 0, total: 0, shares: { formations: 0, crits: 0, rest: 0 } });
  });
});

describe("pickRates", () => {
  it("zählt je Lauf einmal (Duplikate im selben Lauf ignoriert) und sortiert nach Häufigkeit", () => {
    const h = [run({ perks: ["A1", "A1", "B2"] }), run({ perks: ["A1"] }), run({ perks: ["B2"] })];
    const r = pickRates(h, "perks");
    expect(r[0]).toEqual({ id: "A1", count: 2, rate: 2 / 3 });
    expect(r.find((x) => x.id === "B2").count).toBe(2);
  });
});

describe("archetypeUsage / bestArchetype", () => {
  const h = [
    run({ score: 1000, archetypes: ["fire"] }),
    run({ score: 3000, archetypes: ["fire"] }),
    run({ score: 2000, archetypes: ["fire"] }),
    run({ score: 100, archetypes: ["ice"] }),
    run({ score: 100, archetypes: ["ice"] }),
  ];
  it("zählt Läufe je Archetyp mit Ø-Score", () => {
    const u = archetypeUsage(h);
    const fire = u.find((x) => x.arch === "fire");
    expect(fire.count).toBe(3);
    expect(fire.avgScore).toBe(2000);
  });
  it("bestArchetype filtert Kleinserien (< minRuns) heraus", () => {
    const best = bestArchetype(h, { minRuns: 3 });
    expect(best.map((x) => x.arch)).toEqual(["fire"]); // ice hat nur 2 Läufe → raus
  });
});

describe("scoreLift", () => {
  it("berechnet Lift MIT vs OHNE und ignoriert 'immer gewählt' (kein Ohne-Sample)", () => {
    const h = [
      run({ score: 3000, perks: ["G1"] }),
      run({ score: 3000, perks: ["G1"] }),
      run({ score: 2800, perks: ["G1"] }),
      run({ score: 1000, perks: [] }),
      run({ score: 1200, perks: [] }),
      run({ score: 500, perks: ["ALWAYS"] }), // taucht nur… s.u.
    ];
    // ALWAYS in nur 1 Lauf (< minWith 3) → gefiltert; G1 in 3 Läufen mit Ohne-Sample → drin.
    const lifts = scoreLift(h, "perks", { minWith: 3 });
    const g1 = lifts.find((x) => x.id === "G1");
    expect(g1).toBeTruthy();
    expect(g1.count).toBe(3);
    expect(g1.lift).toBeGreaterThan(0);
    expect(lifts.find((x) => x.id === "ALWAYS")).toBeFalsy();
  });
});

describe("topRunsOrigin / bestRun", () => {
  const h = [run({ score: 100 }), run({ score: 900, formationScore: 450 }), run({ score: 500 })];
  it("bestRun liefert den höchsten Score", () => {
    expect(bestRun(h).score).toBe(900);
    expect(bestRun([])).toBeNull();
  });
  it("topRunsOrigin nimmt nur die besten n Läufe", () => {
    const t = topRunsOrigin(h, 1);
    expect(t.runs).toBe(1);
    expect(t.formations).toBe(450);
  });
});

describe("hasEnoughData", () => {
  it("Kleinserien-Schwelle", () => {
    expect(hasEnoughData(Array(MIN_SAMPLE - 1).fill(run()))).toBe(false);
    expect(hasEnoughData(Array(MIN_SAMPLE).fill(run()))).toBe(true);
  });
});
