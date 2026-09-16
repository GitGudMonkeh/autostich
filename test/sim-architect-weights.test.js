import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { randomPolicy } from "../sim/policies/random.js";
import { greedyFormationStep } from "../sim/formation.js";
import { DEFAULT_WEIGHTS } from "../sim/architect-policy.js";
import { ARCH_SPACE } from "../sim/tune.js";

// Play a run and record only what the architect phase did — that is the sequence the weights steer.
function architectTrace(seed, architectWeights) {
  const rng = makeRng(seed);
  let s = reducer(null, { type: "START_RUN", rng, architect: true });
  const base = randomPolicy({ architectGreedy: true, architectWeights });
  const trace = [];
  let guard = 0;
  while (s.phase !== "gameover" && guard++ < 200000) {
    if (s.phase === "play") { s = reducer(s, { type: "RESOLVE_TRICK", rng }); continue; }
    const a = s.phase === "formation" ? greedyFormationStep(s) : base.act(s, rng);
    if (s.phase === "architect") trace.push(`${a.type}:${a.familyId || a.buildingId || ""}:${(a.footprint || []).join("-")}`);
    const next = reducer(s, a);
    if (next === s) break;
    s = next;
  }
  return { trace, score: s.score };
}

describe("sim architect weights", () => {
  it("changes nothing when the hand-set values are passed explicitly", () => {
    // The refactor that made the eleven constants injectable must not move the baseline. Comparing the
    // architect ACTIONS, not just the score, catches a drift that happens to end on the same total.
    const implicit = architectTrace(6100, null);
    const explicit = architectTrace(6100, DEFAULT_WEIGHTS);
    expect(explicit.trace).toEqual(implicit.trace);
    expect(explicit.score).toBe(implicit.score);
    expect(implicit.trace.length).toBeGreaterThan(0);
  });

  it("actually steers the build when a weight moves", () => {
    // Columns pay more than rows by default (200 vs 100). Flipping that has to change what gets built —
    // this is what fails if a weight stops being threaded and the policy silently reads its own default.
    const flipped = architectTrace(6100, { ...DEFAULT_WEIGHTS, row: 400, col: 0 });
    expect(flipped.trace).not.toEqual(architectTrace(6100, null).trace);
  });

  it("keeps the tuner's axes and the policy's weights in step", () => {
    // A renamed weight would leave the tuner optimising a key nobody reads, and every run would look
    // identical — a silent no-op rather than an error.
    expect(ARCH_SPACE.map((p) => p.key).sort()).toEqual(Object.keys(DEFAULT_WEIGHTS).sort());
    for (const p of ARCH_SPACE) {
      expect(p.init).toBe(DEFAULT_WEIGHTS[p.key]); // the search starts at the incumbent, not beside it
      expect(p.init).toBeGreaterThanOrEqual(p.lo);
      expect(p.init).toBeLessThanOrEqual(p.hi);
    }
  });
});
