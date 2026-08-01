import { describe, it, expect } from "vitest";
import { runOne } from "../sim/run.js";
import { randomPolicy } from "../sim/policies/random.js";
import { MAX_CYCLES, TRICKS_PER_CYCLE } from "../src/game/constants.js";

// S0-Kernzusicherung des Sim-Harness: der Treiber ist deterministisch (gleicher Seed →
// exakt gleiche Telemetrie) und spielt einen vollständigen Run bis gameover durch.
describe("sim harness (S0)", () => {
  it("ist deterministisch: gleicher Seed → identische Telemetrie", () => {
    const a = runOne(12345, randomPolicy());
    const b = runOne(12345, randomPolicy());
    expect(b).toEqual(a);
  });

  it("verschiedene Seeds liefern verschiedene Scores", () => {
    const a = runOne(1, randomPolicy());
    const b = runOne(2, randomPolicy());
    expect(a.score).not.toBe(b.score);
  });

  it("spielt einen vollständigen Run bis gameover (MAX_CYCLES Durchläufe)", () => {
    const r = runOne(7, randomPolicy());
    expect(r.cycles).toBe(MAX_CYCLES);
    // Baseline kauft kein Zeitsegment → genau TRICKS_PER_CYCLE je Durchlauf.
    expect(r.tricks).toBe(MAX_CYCLES * TRICKS_PER_CYCLE);
    expect(r.wins + r.losses + r.ties).toBe(r.tricks);
  });

  it("Per-Karte-Ledger (S1) stimmt mit den Rundenkennzahlen überein", () => {
    const r = runOne(7, randomPolicy());
    const sum = (f) => r.cards.reduce((t, c) => t + f(c), 0);
    // Jeder Stich hat genau eine gespielte Spielerkarte → Summe der Auftritte = Stiche.
    expect(sum((c) => c.appearances)).toBe(r.tricks);
    // Ledger-Aggregate müssen die Run-Aggregate exakt reproduzieren.
    expect(sum((c) => c.wins)).toBe(r.wins);
    expect(sum((c) => c.losses)).toBe(r.losses);
    expect(sum((c) => c.ties)).toBe(r.ties);
    expect(sum((c) => c.crits)).toBe(r.crits);
    // Score-Summe stimmt bis auf Float-Rundung (Engine summiert stichweise, Ledger je Karte → andere Reihenfolge).
    expect(Math.abs(sum((c) => c.score) - r.score)).toBeLessThanOrEqual(Math.abs(r.score) * 1e-9 + 1e-6);
    // Winrate/Anteil sind gültige Verhältnisse.
    for (const c of r.cards) {
      expect(c.winrate).toBeGreaterThanOrEqual(0);
      expect(c.winrate).toBeLessThanOrEqual(1);
    }
    expect(r.formationWinRate).toBeGreaterThanOrEqual(0);
    expect(r.formationWinRate).toBeLessThanOrEqual(1);
  });
});
