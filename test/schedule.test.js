import { describe, it, expect } from "vitest";
import { buildSchedule, DECISION_SCHEDULE, MAX_CYCLES, FIRST_SKILL_CYCLE } from "../src/game/constants.js";

// exp skill rework (docs/skill-rework.md §1, §7): buildSchedule(n) erzeugt den Entscheidungsplan variabler Länge.
// Live-Ziel = 40 Durchläufe in zehn Blöcken Skill→Perk→Aufstellen→Architekt (war 50 mit einmaliger Legendär-Phase
// in Runde 29 — Legendäre sind jetzt die fünfte Seltenheit des Skill-Angebots, skills.js rollSkillOfferTiers).
// Für n < 40 wird ein exaktes Prefix gespielt, für n > 40 wächst der Schwanz aus TAIL_BLOCK (nur SIM_MAX_CYCLES-Sweeps).
// Design-Invariante: jede Formationsphase (Aufstellen) wird direkt von einer Architekt-Phase (shop) gefangen.
const TYPES = ["skill", "perk", "formation", "shop"];
const count = (arr, t) => arr.filter((d) => d === t).length;

describe("buildSchedule", () => {
  it("Default (kein Arg) == DECISION_SCHEDULE und respektiert MAX_CYCLES (= 40)", () => {
    expect(buildSchedule()).toEqual(DECISION_SCHEDULE);
    expect(DECISION_SCHEDULE).toHaveLength(MAX_CYCLES);
    expect(MAX_CYCLES).toBe(40);
  });

  it("40-Plan-Verteilung = 10 Skill · 10 Perk · 10 Formation · 10 Shop (kein Legendär, keine Stats)", () => {
    const s = buildSchedule(40);
    expect(s).toHaveLength(40);
    expect(s[0]).toBe("skill"); // Start-Entscheid = Skill (Runde 1, Blind-Commit)
    expect([count(s, "skill"), count(s, "perk"), count(s, "formation"), count(s, "shop")]).toEqual([10, 10, 10, 10]);
    expect(count(s, "legendary")).toBe(0); // die Legendär-Phase ist entfernt
    expect(count(s, "stat")).toBe(0);      // die Stat-Phase ist entfernt
    expect(s.every((d) => TYPES.includes(d))).toBe(true);
  });

  it("Skill-Runden: zehn Skill-Phasen bei 1, 5, 9 … 37 — alle vier Runden", () => {
    const s = buildSchedule(40);
    const skillRounds = s.map((d, i) => (d === "skill" ? i + 1 : null)).filter(Boolean);
    expect(skillRounds).toEqual([1, 5, 9, 13, 17, 21, 25, 29, 33, 37]);
    expect(FIRST_SKILL_CYCLE).toBe(1);
  });

  it("Design-Invariante: jede Formationsphase wird direkt vom Architekten (shop) gefangen", () => {
    const s = buildSchedule(40);
    s.forEach((d, i) => {
      if (d === "formation" && i + 1 < s.length) expect(s[i + 1]).toBe("shop"); // F→A: erst Brett, dann Gebäude
    });
  });

  it("n < 40: exaktes Prefix des 40-Plans", () => {
    const base = buildSchedule(40);
    expect(buildSchedule(30)).toEqual(base.slice(0, 30));
    expect(buildSchedule(20)).toEqual(base.slice(0, 20));
  });

  it("n > 40: Prefix stabil, Länge exakt, nur bekannte Entscheidungstypen", () => {
    const base40 = buildSchedule(40);
    for (const n of [41, 60, 80, 120]) {
      const sched = buildSchedule(n);
      expect(sched).toHaveLength(n);
      expect(sched.slice(0, 40)).toEqual(base40); // 40-Plan unangetastet
      expect(sched.every((d) => TYPES.includes(d))).toBe(true);
    }
  });

  it("Schwanz (> 40) hält grob das Mix-Verhältnis (kein Stat, kein Legendär im Schwanz)", () => {
    const tail = buildSchedule(100).slice(40); // 60 erzeugte Cycles
    const share = (t) => count(tail, t) / tail.length;
    expect(count(tail, "stat")).toBe(0);
    expect(count(tail, "legendary")).toBe(0);
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
