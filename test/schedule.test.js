import { describe, it, expect } from "vitest";
import { buildSchedule, DECISION_SCHEDULE, MAX_CYCLES } from "../src/game/constants.js";

// buildSchedule(n) erzeugt den Entscheidungsplan variabler Länge. Live-Ziel = 60 Durchläufe (handgesetzter Plan);
// für n < 60 wird ein exaktes Prefix gespielt, für n > 60 wächst der Schwanz aus TAIL_BLOCK (nur SIM_MAX_CYCLES-
// Sweeps). Der 60-Plan trägt eine Design-Invariante: jedes Shop-Fenster (Architekt) wird 2 Durchläufe später von
// einer Formationsphase gefangen (die Bauzeit-Einheit für den geplanten Architekt-Umbau).
const TYPES = ["stat", "perk", "formation", "shop", "skill"];
const count = (arr, t) => arr.filter((d) => d === t).length;

describe("buildSchedule", () => {
  it("Default (kein Arg) == DECISION_SCHEDULE und respektiert MAX_CYCLES (= 60)", () => {
    expect(buildSchedule()).toEqual(DECISION_SCHEDULE);
    expect(DECISION_SCHEDULE).toHaveLength(MAX_CYCLES);
    expect(MAX_CYCLES).toBe(60);
  });

  it("60-Plan-Verteilung = 13 Stat · 13 Perk · 12 Formation · 12 Shop · 10 Skill", () => {
    const s = buildSchedule(60);
    expect(s).toHaveLength(60);
    expect(s[0]).toBe("stat"); // Start-Entscheid
    expect([count(s, "stat"), count(s, "perk"), count(s, "formation"), count(s, "shop"), count(s, "skill")])
      .toEqual([13, 13, 12, 12, 10]);
  });

  it("Design-Invariante: jedes Shop-Fenster wird exakt 2 Durchläufe später von einer Formation gefangen", () => {
    const s = buildSchedule(60);
    s.forEach((d, i) => {
      if (d === "shop") expect(s[i + 2]).toBe("formation"); // 4→6, 9→11, …, 58→60
    });
  });

  it("n < 60: exaktes Prefix des 60-Plans", () => {
    const base = buildSchedule(60);
    expect(buildSchedule(44)).toEqual(base.slice(0, 44));
    expect(buildSchedule(30)).toEqual(base.slice(0, 30));
  });

  it("n > 60: Prefix stabil, Länge exakt, nur bekannte Entscheidungstypen", () => {
    const base60 = buildSchedule(60);
    for (const n of [61, 72, 80, 120]) {
      const sched = buildSchedule(n);
      expect(sched).toHaveLength(n);
      expect(sched.slice(0, 60)).toEqual(base60); // 60-Plan unangetastet
      expect(sched.every((d) => TYPES.includes(d))).toBe(true);
    }
  });

  it("Schwanz (> 60) hält grob das 60er-Verhältnis (Stat/Perk je ~22 %, Skill ~17 %, Shop ~20 %)", () => {
    const tail = buildSchedule(120).slice(60); // 60 erzeugte Cycles
    const share = (t) => count(tail, t) / tail.length;
    expect(share("stat")).toBeGreaterThanOrEqual(0.17);
    expect(share("stat")).toBeLessThanOrEqual(0.30);
    expect(share("perk")).toBeGreaterThanOrEqual(0.17);
    expect(share("perk")).toBeLessThanOrEqual(0.30);
    expect(share("skill")).toBeGreaterThanOrEqual(0.10);
    expect(share("skill")).toBeLessThanOrEqual(0.22);
    expect(share("shop")).toBeGreaterThanOrEqual(0.12);
    expect(share("shop")).toBeLessThanOrEqual(0.25);
  });

  it("kein Cluster: nie zwei Shop- oder Skill-Entscheidungen hintereinander (auch über Blockgrenzen)", () => {
    const sched = buildSchedule(120);
    for (let i = 1; i < sched.length; i++) {
      if (sched[i] === "shop") expect(sched[i - 1]).not.toBe("shop");
      if (sched[i] === "skill") expect(sched[i - 1]).not.toBe("skill");
    }
  });
});
