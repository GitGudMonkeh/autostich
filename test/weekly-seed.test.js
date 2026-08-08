import { describe, it, expect } from "vitest";
import { isoWeek, weekSeed, weekEndUTC, msUntilWeekEnd, currentWeek, pastWeeks, weekLabel } from "../src/game/weeklySeed.js";

const U = (...a) => new Date(Date.UTC(...a));

describe("weeklySeed — ISO-Woche (UTC)", () => {
  it("Standard-Fälle", () => {
    expect(isoWeek(U(2026, 0, 1))).toEqual({ week: 1, year: 2026 });   // Do 01.01.2026 → Woche 1
    expect(isoWeek(U(2026, 0, 4))).toEqual({ week: 1, year: 2026 });   // So 04.01. → noch Woche 1 (ISO-Woche endet So)
    expect(isoWeek(U(2026, 0, 5))).toEqual({ week: 2, year: 2026 });   // Mo 05.01. → Woche 2
  });
  it("Jahreswechsel-Edgecases (ISO-Jahr ≠ Kalenderjahr)", () => {
    expect(isoWeek(U(2021, 0, 1))).toEqual({ week: 53, year: 2020 });  // Fr 01.01.2021 → gehört zu Woche 53/2020
    expect(isoWeek(U(2025, 11, 29))).toEqual({ week: 1, year: 2026 }); // Mo 29.12.2025 → schon Woche 1/2026
  });
});

describe("weeklySeed — Seed-Ableitung", () => {
  it("deterministisch + uint32 + nie 0", () => {
    const wy = { week: 32, year: 2026 };
    const s = weekSeed(wy);
    expect(weekSeed(wy)).toBe(s);                 // stabil
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBe(s >>> 0);                      // uint32
    expect(s).toBeGreaterThan(0);
  });
  it("verschiedene Wochen → verschiedene Seeds", () => {
    const seeds = new Set();
    for (let w = 1; w <= 53; w++) seeds.add(weekSeed({ week: w, year: 2026 }));
    expect(seeds.size).toBe(53);                  // keine Kollision im Jahr
    expect(weekSeed({ week: 5, year: 2026 })).not.toBe(weekSeed({ week: 5, year: 2027 }));
  });
});

describe("weeklySeed — Wochengrenze / Countdown", () => {
  it("Ende = Sonntag 23:59:59.999 UTC der ISO-Woche", () => {
    const end = weekEndUTC(U(2026, 0, 1));        // Do 01.01. → So 04.01.
    expect(end.getTime()).toBe(U(2026, 0, 4, 23, 59, 59, 999).getTime());
  });
  it("An einem Sonntag endet die Woche noch am selben Tag", () => {
    const end = weekEndUTC(U(2026, 0, 4, 12, 0, 0));
    expect(end.getTime()).toBe(U(2026, 0, 4, 23, 59, 59, 999).getTime());
  });
  it("msUntilWeekEnd ist nie negativ", () => {
    expect(msUntilWeekEnd(U(2026, 0, 4, 23, 59, 59, 999))).toBe(0);
    expect(msUntilWeekEnd(U(2026, 0, 1, 0, 0, 0))).toBeGreaterThan(0);
  });
});

describe("weeklySeed — currentWeek & pastWeeks", () => {
  it("currentWeek bündelt Woche/Seed/Label konsistent", () => {
    const now = U(2026, 0, 5, 10, 0, 0);          // Mo → Woche 2/2026
    const cw = currentWeek(now);
    expect({ week: cw.week, year: cw.year }).toEqual({ week: 2, year: 2026 });
    expect(cw.seed).toBe(weekSeed({ week: 2, year: 2026 }));
    expect(cw.label).toBe(weekLabel({ week: 2, year: 2026 }));
  });
  it("pastWeeks liefert die letzten n abgeschlossenen Wochen, jüngste zuerst", () => {
    const now = U(2026, 0, 5, 10, 0, 0);          // aktuelle Woche = 2/2026
    const pw = pastWeeks(now, 2);
    expect(pw.map((w) => ({ week: w.week, year: w.year }))).toEqual([
      { week: 1, year: 2026 },   // Vorwoche
      { week: 52, year: 2025 },  // die davor
    ]);
    expect(pw[0].seed).toBe(weekSeed({ week: 1, year: 2026 }));
  });
});
