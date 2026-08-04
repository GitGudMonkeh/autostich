import { describe, it, expect } from "vitest";
import { buildSchedule, DECISION_SCHEDULE, MAX_CYCLES } from "../src/game/constants.js";

// buildSchedule(n) erzeugt den Entscheidungsplan variabler Länge. Live-Ziel = 50 Durchläufe (#272, war 45 #267;
// Commitment-Funnel Skill→Perk→Aufstellen→Architekt + einmalige Legendär-Phase). Für n < 50 wird ein exaktes Prefix
// gespielt, für n > 50 wächst der Schwanz aus TAIL_BLOCK (nur SIM_MAX_CYCLES-Sweeps, ohne Legendär). Design-Invariante:
// jede Formationsphase (Aufstellen) wird direkt von einer Architekt-Phase (shop) gefangen (erst Brett, dann Gebäude).
const TYPES = ["perk", "formation", "shop", "skill", "legendary"]; // #267: „stat" entfernt · #272: „legendary" ergänzt
const count = (arr, t) => arr.filter((d) => d === t).length;

describe("buildSchedule", () => {
  it("Default (kein Arg) == DECISION_SCHEDULE und respektiert MAX_CYCLES (= 50)", () => {
    expect(buildSchedule()).toEqual(DECISION_SCHEDULE);
    expect(DECISION_SCHEDULE).toHaveLength(MAX_CYCLES);
    expect(MAX_CYCLES).toBe(50);
  });

  it("50-Plan-Verteilung = 9 Skill · 13 Perk · 13 Formation · 14 Shop · 1 Legendär (keine Stats)", () => {
    const s = buildSchedule(50);
    expect(s).toHaveLength(50);
    expect(s[0]).toBe("skill"); // Start-Entscheid = Skill (Runde 1, Blind-Commit)
    expect([count(s, "skill"), count(s, "perk"), count(s, "formation"), count(s, "shop"), count(s, "legendary")])
      .toEqual([9, 13, 13, 14, 1]);
    expect(count(s, "stat")).toBe(0); // die Stat-Phase ist entfernt
  });

  it("#272: genau EINE Legendär-Phase, spätes Mid-Game (Runde 29)", () => {
    const s = buildSchedule(50);
    const legRounds = s.map((d, i) => (d === "legendary" ? i + 1 : null)).filter(Boolean);
    expect(legRounds).toEqual([29]);
  });

  it("Design-Invariante: jede Formationsphase wird direkt vom Architekten (shop) gefangen", () => {
    const s = buildSchedule(50);
    s.forEach((d, i) => {
      if (d === "formation" && i + 1 < s.length) expect(s[i + 1]).toBe("shop"); // F→A: erst Brett, dann Gebäude
    });
  });

  it("Skill-Runden: front-loaded (6 füllen die Slots), dann drei Tausch-Fenster", () => {
    const s = buildSchedule(50);
    const skillRounds = s.map((d, i) => (d === "skill" ? i + 1 : null)).filter(Boolean);
    expect(skillRounds).toEqual([1, 5, 9, 13, 17, 21, 25, 33, 41]);
  });

  it("n < 50: exaktes Prefix des 50-Plans", () => {
    const base = buildSchedule(50);
    expect(buildSchedule(30)).toEqual(base.slice(0, 30));
    expect(buildSchedule(20)).toEqual(base.slice(0, 20));
  });

  it("n > 50: Prefix stabil, Länge exakt, nur bekannte Entscheidungstypen", () => {
    const base50 = buildSchedule(50);
    for (const n of [51, 60, 80, 120]) {
      const sched = buildSchedule(n);
      expect(sched).toHaveLength(n);
      expect(sched.slice(0, 50)).toEqual(base50); // 50-Plan unangetastet
      expect(sched.every((d) => TYPES.includes(d))).toBe(true);
    }
  });

  it("Schwanz (> 50) hält grob das Mix-Verhältnis (kein Stat, kein Legendär im Schwanz)", () => {
    const tail = buildSchedule(100).slice(50); // 50 erzeugte Cycles
    const share = (t) => count(tail, t) / tail.length;
    expect(count(tail, "stat")).toBe(0);
    expect(count(tail, "legendary")).toBe(0); // die eine Legendär-Phase steckt fest im Basis-Plan
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
