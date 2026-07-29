import { describe, it, expect } from "vitest";
import { buildSchedule, DECISION_SCHEDULE, MAX_CYCLES } from "../src/game/constants.js";

// buildSchedule(n) erzeugt den Entscheidungsplan variabler Länge (SIM_MAX_CYCLES-Sweeps über 60–80 Cycles).
// Kern-Invariante: Cycles 1–44 bleiben byte-identisch zum handgesetzten Live-Plan — Sweeps über die Rundenlänge
// variieren AUSSCHLIESSLICH den Schwanz ab Cycle 45. Der Schwanz hält das Mix-Verhältnis der Basis und clustert nicht.
const TYPES = ["stat", "perk", "formation", "shop", "skill"];

describe("buildSchedule", () => {
  it("Default (kein Arg) == DECISION_SCHEDULE und respektiert MAX_CYCLES", () => {
    expect(buildSchedule()).toEqual(DECISION_SCHEDULE);
    expect(DECISION_SCHEDULE).toHaveLength(MAX_CYCLES);
  });

  it("n ≤ 44: exaktes Prefix des Basisplans (Live-Balance unverändert)", () => {
    const base44 = buildSchedule(44);
    expect(base44).toHaveLength(44);
    expect(base44[0]).toBe("stat");     // Start-Entscheid
    expect(base44[2]).toBe("formation"); // Sanity (deckt sich mit engine.test)
    // Bekannte Live-Verteilung: 11 Stat · 11 Perk · 8 Formation · 8 Shop · 6 Skill.
    const count = (t) => base44.filter((d) => d === t).length;
    expect([count("stat"), count("perk"), count("formation"), count("shop"), count("skill")]).toEqual([11, 11, 8, 8, 6]);
    expect(buildSchedule(30)).toEqual(base44.slice(0, 30));
  });

  it("n > 44: Prefix stabil, Länge exakt, nur bekannte Entscheidungstypen", () => {
    for (const n of [45, 60, 80, 120]) {
      const sched = buildSchedule(n);
      expect(sched).toHaveLength(n);
      expect(sched.slice(0, 44)).toEqual(buildSchedule(44)); // Early/Mid unangetastet
      expect(sched.every((d) => TYPES.includes(d))).toBe(true);
    }
  });

  it("Schwanz hält grob das Basis-Verhältnis (Stat/Perk je ~25 %, Skill ~13 %)", () => {
    const sched = buildSchedule(80);
    const tail = sched.slice(44); // 36 erzeugte Cycles
    const share = (t) => tail.filter((d) => d === t).length / tail.length;
    expect(share("stat")).toBeGreaterThanOrEqual(0.20);
    expect(share("stat")).toBeLessThanOrEqual(0.30);
    expect(share("perk")).toBeGreaterThanOrEqual(0.20);
    expect(share("perk")).toBeLessThanOrEqual(0.30);
    expect(share("skill")).toBeGreaterThanOrEqual(0.08);
    expect(share("skill")).toBeLessThanOrEqual(0.18);
    expect(share("shop")).toBeGreaterThanOrEqual(0.12);
    expect(share("shop")).toBeLessThanOrEqual(0.25);
  });

  it("kein Cluster: nie zwei Shop- oder Skill-Entscheidungen hintereinander (auch über Blockgrenzen)", () => {
    const sched = buildSchedule(80);
    for (let i = 1; i < sched.length; i++) {
      if (sched[i] === "shop") expect(sched[i - 1]).not.toBe("shop");
      if (sched[i] === "skill") expect(sched[i - 1]).not.toBe("skill");
    }
  });
});
