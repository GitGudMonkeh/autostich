import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { randomPolicy } from "../sim/policies/random.js";
import { greedyFormationStep } from "../sim/formation.js";

const formScore = (s) => (s.formations || []).reduce((t, f) => t + (f?.mult || 1), 0);

describe("sim formation solver (S4)", () => {
  it("wählt in jeder Formationsphase einen strikt verbessernden Tausch, sonst CONFIRM", () => {
    const rng = makeRng(3);
    let s = reducer(null, { type: "START_RUN", rng });
    const base = randomPolicy();
    let phasesChecked = 0;
    let guard = 0;
    while (s.phase !== "gameover" && guard++ < 200000) {
      if (s.phase === "play") { s = reducer(s, { type: "RESOLVE_TRICK", rng }); continue; }
      if (s.phase === "formation") {
        const before = formScore(s);
        const a = greedyFormationStep(s);
        const next = reducer(s, a);
        if (a.type === "SWAP_CARDS") expect(formScore(next)).toBeGreaterThan(before); // greedy = strikt besser
        else expect(a.type).toBe("CONFIRM_FORMATION");
        if (a.type === "CONFIRM_FORMATION") phasesChecked++; // eine Phase abgeschlossen
        s = next;
        continue;
      }
      s = reducer(s, base.act(s, rng));
    }
    expect(s.phase).toBe("gameover");
    expect(phasesChecked).toBe(13); // #272: 13 Formationsentscheidungen je Run (50-Plan, DECISION_SCHEDULE)
  });
});
