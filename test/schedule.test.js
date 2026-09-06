import { describe, it, expect } from "vitest";
import { buildSchedule, DECISION_SCHEDULE, MAX_CYCLES, FIRST_SKILL_CYCLE } from "../src/game/constants.js";

// exp skill rework (docs/skill-rework.md §1, §7.14): buildSchedule(n) erzeugt den Entscheidungsplan variabler Länge —
// der Block Skill→Perk→Aufstellen→Architekt wiederholt sich über den ganzen Lauf. Live-Ziel = 50 Durchläufe (Owner,
// 2026-09-06; davor 40), die Reihenfolge der Phasen bleibt für jede Länge dieselbe (auch SIM_MAX_CYCLES-Sweeps).
// Legendäre sind die fünfte Seltenheit des Skill-Angebots (skills.js rollSkillOfferTiers), es gibt keine eigene Phase.
// Design-Invariante: jede Formationsphase (Aufstellen) wird direkt von einer Architekt-Phase (shop) gefangen.
const TYPES = ["skill", "perk", "formation", "shop"];
const count = (arr, t) => arr.filter((d) => d === t).length;

describe("buildSchedule", () => {
  it("Default (kein Arg) == DECISION_SCHEDULE und respektiert MAX_CYCLES (= 50)", () => {
    expect(buildSchedule()).toEqual(DECISION_SCHEDULE);
    expect(DECISION_SCHEDULE).toHaveLength(MAX_CYCLES);
    expect(MAX_CYCLES).toBe(50);
  });

  it("50-Plan-Verteilung = 13 Skill · 13 Perk · 12 Formation · 12 Shop (kein Legendär, keine Stats)", () => {
    const s = buildSchedule(50);
    expect(s).toHaveLength(50);
    expect(s[0]).toBe("skill"); // Start-Entscheid = Skill (Runde 1, Blind-Commit)
    expect([count(s, "skill"), count(s, "perk"), count(s, "formation"), count(s, "shop")]).toEqual([13, 13, 12, 12]);
    expect(count(s, "legendary")).toBe(0); // die Legendär-Phase ist entfernt
    expect(count(s, "stat")).toBe(0);      // die Stat-Phase ist entfernt
    expect(s.every((d) => TYPES.includes(d))).toBe(true);
  });

  it("Skill-Runden: dreizehn Skill-Phasen bei 1, 5, 9 … 49 — alle vier Runden", () => {
    const s = buildSchedule(50);
    const skillRounds = s.map((d, i) => (d === "skill" ? i + 1 : null)).filter(Boolean);
    expect(skillRounds).toEqual([1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49]);
    expect(FIRST_SKILL_CYCLE).toBe(1);
  });

  it("Design-Invariante: jede Formationsphase wird direkt vom Architekten (shop) gefangen", () => {
    const s = buildSchedule(50);
    s.forEach((d, i) => {
      if (d === "formation" && i + 1 < s.length) expect(s[i + 1]).toBe("shop"); // F→A: erst Brett, dann Gebäude
    });
  });

  it("Reihenfolge der Phasen bleibt für jede Länge gleich: der 40-Plan ist ein Prefix des 50-Plans, kürzere Pläne ein Prefix davon", () => {
    const base = buildSchedule(50);
    expect(buildSchedule(40)).toEqual(base.slice(0, 40)); // der alte 40-Plan (zehn Skill-Phasen) liegt unverändert vorne
    expect(count(buildSchedule(40), "skill")).toBe(10);
    expect(buildSchedule(30)).toEqual(base.slice(0, 30));
    expect(buildSchedule(20)).toEqual(base.slice(0, 20));
    expect(buildSchedule(0)).toEqual([]);
  });

  it("n > 50: Prefix stabil, Länge exakt, derselbe Block, nur bekannte Entscheidungstypen", () => {
    const base50 = buildSchedule(50);
    for (const n of [51, 60, 80, 120]) {
      const sched = buildSchedule(n);
      expect(sched).toHaveLength(n);
      expect(sched.slice(0, 50)).toEqual(base50); // 50-Plan unangetastet
      expect(sched.every((d) => TYPES.includes(d))).toBe(true);
      sched.forEach((d, i) => expect(d).toBe(TYPES[i % 4])); // Skill, Perk, Aufstellen, Architekt — immer in dieser Reihenfolge
    }
  });

  it("kein Cluster: nie zwei Shop- oder Skill-Entscheidungen hintereinander (auch über Blockgrenzen)", () => {
    const sched = buildSchedule(120);
    for (let i = 1; i < sched.length; i++) {
      if (sched[i] === "shop") expect(sched[i - 1]).not.toBe("shop");
      if (sched[i] === "skill") expect(sched[i - 1]).not.toBe("skill");
    }
  });
});
