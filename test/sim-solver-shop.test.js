import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { runOne } from "../sim/run.js";
import { randomPolicy } from "../sim/policies/random.js";
import { fixedPolicy } from "../sim/policies/fixed.js";
import { greedyFormationStep } from "../sim/formation.js";
import { MAX_CYCLES, TRICKS_PER_CYCLE } from "../src/game/constants.js";

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
    expect(phasesChecked).toBe(8); // 8 Formationsentscheidungen je Run (DECISION_SCHEDULE)
  });
});

describe("sim shop buying policy (S4)", () => {
  it("kauft Ziel-Items und schließt den Run ohne Endlosschleife ab", () => {
    // fixedPolicy mit buyShop+solveFormations: betritt shop-target UND die Formationsphase — der
    // canComplete-Guard verhindert Kauf→Abbruch-Schleifen. Voller Run bis gameover beweist Terminierung.
    const r = runOne(5, fixedPolicy([], { solveFormations: true, buyShop: true }));
    expect(r.cycles).toBe(MAX_CYCLES);
    expect(r.tricks).toBeGreaterThanOrEqual(MAX_CYCLES * TRICKS_PER_CYCLE); // ≥, da ein Zeitsegment-Kauf verlängert
    expect(r.wins + r.losses + r.ties).toBe(r.tricks);
  });

  it("ist deterministisch (gleicher Seed → gleiche Telemetrie)", () => {
    const p = () => fixedPolicy(["L4"], { solveFormations: true, buyShop: true });
    expect(runOne(5, p())).toEqual(runOne(5, p()));
  });
});
