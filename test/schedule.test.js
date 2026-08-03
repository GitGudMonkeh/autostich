import { describe, it, expect } from "vitest";
import { buildSchedule, DECISION_SCHEDULE, MAX_CYCLES } from "../src/game/constants.js";

// buildSchedule(n) erzeugt den Entscheidungsplan variabler Länge. Live-Ziel = 45 Durchläufe (#267 Struktur-Rework,
// Commitment-Funnel Skill→Perk→Aufstellen→Architekt); für n < 45 wird ein exaktes Prefix gespielt, für n > 45 wächst
// der Schwanz aus TAIL_BLOCK (nur SIM_MAX_CYCLES-Sweeps). Der 45-Plan trägt eine Design-Invariante: jede
// Formationsphase (Aufstellen) wird direkt von einer Architekt-Phase gefangen (erst Brett stellen, dann Gebäude drauf).
const TYPES = ["perk", "formation", "shop", "skill"]; // #267: „stat" entfernt
const count = (arr, t) => arr.filter((d) => d === t).length;

describe("buildSchedule", () => {
  it("Default (kein Arg) == DECISION_SCHEDULE und respektiert MAX_CYCLES (= 45)", () => {
    expect(buildSchedule()).toEqual(DECISION_SCHEDULE);
    expect(DECISION_SCHEDULE).toHaveLength(MAX_CYCLES);
    expect(MAX_CYCLES).toBe(45);
  });

  it("45-Plan-Verteilung = 8 Skill · 13 Perk · 12 Formation · 12 Shop (keine Stats)", () => {
    const s = buildSchedule(45);
    expect(s).toHaveLength(45);
    expect(s[0]).toBe("skill"); // Start-Entscheid = Skill (Runde 1, Blind-Commit)
    expect([count(s, "skill"), count(s, "perk"), count(s, "formation"), count(s, "shop")])
      .toEqual([8, 13, 12, 12]);
    expect(count(s, "stat")).toBe(0); // die Stat-Phase ist entfernt
  });

  it("Design-Invariante: jede Formationsphase wird direkt vom Architekten (shop) gefangen", () => {
    const s = buildSchedule(45);
    s.forEach((d, i) => {
      if (d === "formation" && i + 1 < s.length) expect(s[i + 1]).toBe("shop"); // F→A: erst Brett, dann Gebäude
    });
  });

  it("Skill-Runden: front-loaded, letzter Core-Slot bei 22, zwei Tausch-Fenster (31 & 41)", () => {
    const s = buildSchedule(45);
    const skillRounds = s.map((d, i) => (d === "skill" ? i + 1 : null)).filter(Boolean);
    expect(skillRounds).toEqual([1, 5, 9, 13, 17, 22, 31, 41]);
  });

  it("n < 45: exaktes Prefix des 45-Plans", () => {
    const base = buildSchedule(45);
    expect(buildSchedule(30)).toEqual(base.slice(0, 30));
    expect(buildSchedule(20)).toEqual(base.slice(0, 20));
  });

  it("n > 45: Prefix stabil, Länge exakt, nur bekannte Entscheidungstypen", () => {
    const base45 = buildSchedule(45);
    for (const n of [46, 60, 80, 120]) {
      const sched = buildSchedule(n);
      expect(sched).toHaveLength(n);
      expect(sched.slice(0, 45)).toEqual(base45); // 45-Plan unangetastet
      expect(sched.every((d) => TYPES.includes(d))).toBe(true);
    }
  });

  it("Schwanz (> 45) hält grob das 45er-Verhältnis (kein Stat mehr)", () => {
    const tail = buildSchedule(90).slice(45); // 45 erzeugte Cycles
    const share = (t) => count(tail, t) / tail.length;
    expect(count(tail, "stat")).toBe(0);
    expect(share("perk")).toBeGreaterThanOrEqual(0.15);
    expect(share("perk")).toBeLessThanOrEqual(0.30);
    expect(share("skill")).toBeGreaterThanOrEqual(0.10);
    expect(share("skill")).toBeLessThanOrEqual(0.22);
    expect(share("shop")).toBeGreaterThanOrEqual(0.15);
    expect(share("shop")).toBeLessThanOrEqual(0.30);
    expect(share("formation")).toBeGreaterThanOrEqual(0.20);
    expect(share("formation")).toBeLessThanOrEqual(0.40);
  });

  it("kein Cluster: nie zwei Shop- oder Skill-Entscheidungen hintereinander (auch über Blockgrenzen)", () => {
    const sched = buildSchedule(120);
    for (let i = 1; i < sched.length; i++) {
      if (sched[i] === "shop") expect(sched[i - 1]).not.toBe("shop");
      if (sched[i] === "skill") expect(sched[i - 1]).not.toBe("skill");
    }
  });
});
