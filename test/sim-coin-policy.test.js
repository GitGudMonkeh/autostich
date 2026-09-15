import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { randomPolicy } from "../sim/policies/random.js";
import { greedyFormationStep } from "../sim/formation.js";
import { withCoins, coinStep, ALL_BUYS } from "../sim/coin-policy.js";

const basePolicy = () => {
  const b = randomPolicy({ architectGreedy: true });
  return { name: "base", act: (s, rng, mem) => (s.phase === "formation" ? greedyFormationStep(s) : b.act(s, rng, mem)) };
};

// Play a run and record what each dispatched action did — the driver aborts on an action that does not
// move the state, so "every buy applies" is the invariant that actually matters here.
function play(seed, policy) {
  const rng = makeRng(seed);
  let s = reducer(null, { type: "START_RUN", rng, architect: true });
  const actions = [];
  let spent = 0, prev = s.coins || 0, guard = 0;
  while (s.phase !== "gameover" && guard++ < 200000) {
    const a = s.phase === "play" ? { type: "RESOLVE_TRICK", rng } : policy.act(s, rng, null);
    const next = reducer(s, a);
    actions.push({ type: a.type, phase: s.phase, applied: next !== s });
    const c = next.coins || 0;
    if (c < prev) spent += prev - c;
    prev = c;
    if (next === s) break; // let the assertion report it instead of spinning
    s = next;
  }
  return { state: s, actions, spent };
}

const BUY_TYPES = ["BUY_ENERGY", "BUY_COVER", "UPGRADE_SKILL", "UPGRADE_FAMILY"];

describe("sim coin policy", () => {
  it("every purchase it proposes is accepted by the reducer", () => {
    const { actions } = play(4242, withCoins(basePolicy(), ALL_BUYS));
    const buys = actions.filter((a) => BUY_TYPES.includes(a.type));
    expect(buys.length).toBeGreaterThan(0);
    expect(buys.filter((a) => !a.applied)).toEqual([]); // a rejected buy would abort runOne
  });

  it("spends the purse instead of letting it expire", () => {
    const off = play(4242, basePolicy());
    const on = play(4242, withCoins(basePolicy(), ALL_BUYS));
    expect(off.spent).toBe(0);                                  // the untouched baseline
    expect(on.spent).toBeGreaterThan(0);
    expect(on.state.coins).toBeLessThan(off.state.coins);        // coins expire at run end
  });

  it("is a byte-for-byte no-op while every surface is off", () => {
    const none = { energy: false, cover: false, upgradeSkill: false, upgradeFamily: false };
    const plain = play(4242, basePolicy());
    const wrapped = play(4242, withCoins(basePolicy(), none));
    expect(wrapped.state.score).toBe(plain.state.score);
    expect(wrapped.actions.map((a) => a.type)).toEqual(plain.actions.map((a) => a.type));
  });

  it("holds the reserve back from cover and energy", () => {
    // Cover costs 20; with a reserve of 1e9 no purse can ever clear it, so the architect phase must stay dry
    // while the level-up upgrades still run. This is what fails if `affordable` stops reading the reserve.
    const { actions } = play(4242, withCoins(basePolicy(), { ...ALL_BUYS, reserve: 1e9 }));
    expect(actions.some((a) => a.type === "BUY_COVER" || a.type === "BUY_ENERGY")).toBe(false);
    expect(actions.some((a) => a.type === "UPGRADE_SKILL")).toBe(true);
  });

  it("proposes nothing outside the three spending phases", () => {
    const rng = makeRng(7);
    const s = reducer(null, { type: "START_RUN", rng, architect: true });
    expect(coinStep({ ...s, phase: "play" }, rng, ALL_BUYS)).toBeNull();
    expect(coinStep({ ...s, phase: "gameover" }, rng, ALL_BUYS)).toBeNull();
  });
});
