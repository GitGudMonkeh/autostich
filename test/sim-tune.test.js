import { describe, it, expect } from "vitest";
import { toBuys, seedSets, pairedEffect } from "../sim/tune.js";

describe("sim tune (CEM)", () => {
  it("keeps training and holdout seeds disjoint", () => {
    // The honesty of the whole method rests on this: an overlap would make the holdout report how well the
    // vector memorised its own training seeds, and the numbers would look BETTER, not worse, for it.
    for (const seed of [1, 2, 7, 42]) {
      const { train, hold } = seedSets(seed, 200, 200);
      expect(new Set([...train, ...hold]).size).toBe(train.length + hold.length);
    }
  });

  it("keeps one tuning seed's sets apart from another's", () => {
    const a = seedSets(1, 50, 50), b = seedSets(2, 50, 50);
    const all = [...a.train, ...a.hold, ...b.train, ...b.hold];
    expect(new Set(all).size).toBe(all.length); // two tuning runs must not share a seed either
  });

  it("cuts the switch axes at 0.5 and rounds the coin axes", () => {
    const lo = toBuys([12.4, 33.6, 0.49, 0.5]);
    expect(lo.reserve).toBe(12);
    expect(lo.reserveEnergy).toBe(34);
    expect(lo.depth).toBe(false);
    expect(lo.famFirst).toBe(true);
  });

  it("always hands the policy every surface, so the reserves alone decide", () => {
    const b = toBuys([0, 0, 0, 0]);
    expect([b.energy, b.cover, b.upgradeSkill, b.upgradeFamily]).toEqual([true, true, true, true]);
  });
});

describe("sim tune — paired selection statistic", () => {
  it("reads zero when nothing changed", () => {
    expect(pairedEffect([10, 500, 3e7], [10, 500, 3e7])).toBe(0);
  });

  it("recovers a uniform shift exactly", () => {
    const ref = [1e6, 5e6, 2e7, 8e7];
    expect(Math.exp(pairedEffect(ref.map((v) => v * 1.1), ref)) - 1).toBeCloseTo(0.1, 12);
  });

  it("ignores a single runaway seed", () => {
    // This is WHY the statistic is a median of log-ratios and not a mean of deltas: one tail run is worth
    // more than every other seed combined here, and a mean would hand the generation to whoever caught it.
    const ref = [1e6, 1e6, 1e6, 1e6, 1e6];
    const lucky = [1e6, 1e6, 1e6, 1e6, 1e9]; // 1000x on one seed, identical on the rest
    expect(pairedEffect(lucky, ref)).toBe(0);
    const meanDelta = lucky.reduce((t, v, i) => t + (v - ref[i]), 0) / ref.length;
    expect(meanDelta).toBeGreaterThan(1e8); // what the naive statistic would have seen
  });

  it("scores a consistent small gain above a lucky single seed", () => {
    const ref = [1e6, 1e6, 1e6, 1e6, 1e6];
    const steady = ref.map((v) => v * 1.05);        // +5 % on every seed
    const lucky = [1e6, 1e6, 1e6, 1e6, 1e9];        // one jackpot, flat otherwise
    expect(pairedEffect(steady, ref)).toBeGreaterThan(pairedEffect(lucky, ref));
  });
});
