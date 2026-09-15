import { describe, it, expect } from "vitest";
import { toBuys, seedSets } from "../sim/tune.js";

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
