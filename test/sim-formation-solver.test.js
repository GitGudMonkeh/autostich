import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { randomPolicy } from "../sim/policies/random.js";
import { greedyFormationStep } from "../sim/formation.js";
import { DECISION_SCHEDULE } from "../src/game/constants.js";
import { SEGMENT_SIZE, computeFormations, openBorderInfo } from "../src/game/formations.js";

const formScore = (s) => (s.formations || []).reduce((t, f) => t + (f?.mult || 1), 0);
const segOf = (p) => Math.floor(p / SEGMENT_SIZE);

// Drive a run and hand every formation-phase state to `onPhase`; the solver itself plays that phase.
function runWithFormationPhases(seed, onPhase) {
  const rng = makeRng(seed);
  let s = reducer(null, { type: "START_RUN", rng, architect: true });
  const base = randomPolicy({ architectGreedy: true });
  let guard = 0;
  while (s.phase !== "gameover" && guard++ < 200000) {
    if (s.phase === "play") { s = reducer(s, { type: "RESOLVE_TRICK", rng }); continue; }
    if (s.phase === "formation") { s = reducer(s, onPhase(s)); continue; }
    s = reducer(s, base.act(s, rng));
  }
  return s;
}

// Same state, but the player holds Segmentarbeit III (all boundaries open). `formations` is recomputed so the
// solver's baseline matches the rules it is about to search under.
function withOpenBoundaries(s) {
  const familyTiers = { ...(s.familyTiers || {}), E_SEGMENT: 3 };
  const formations = computeFormations(s.playerOrder, s.deck, s.roles, s.perks, s.skills,
    s.shop?.anchors || [], familyTiers, s.architectEnabled ? s.architect : null,
    { skillTiers: s.skillTiers || {}, growth: s.growth || {} });
  return { ...s, familyTiers, formations };
}

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
    // exp skill rework: eine Formationsentscheidung je Formationsphase des Plans (50-Plan §7.14: 12; der 40-Plan hatte 10).
    expect(phasesChecked).toBe(DECISION_SCHEDULE.filter((d) => d === "formation").length);
  });

  // The neighbourhood is bounded by the OPEN region, not by the segment. These two tests pin both directions:
  // no change where nothing is open, and a genuinely new move where something is.
  it("stays inside the segment while no boundary is open", () => {
    let steps = 0;
    runWithFormationPhases(7, (s) => {
      const info = openBorderInfo(s.playerOrder, s.deck, s.skills || [], s.skillTiers || {}, s.familyTiers || {},
        s.architectEnabled ? s.architect : null);
      const a = greedyFormationStep(s);
      if (!info.active && a.type === "SWAP_CARDS") {
        const frozen = s.deck[s.playerOrder[a.i]]?.frozen || s.deck[s.playerOrder[a.j]]?.frozen;
        if (!frozen) { expect(segOf(a.i)).toBe(segOf(a.j)); steps++; } // frozen keeps its own cross-region licence
      }
      return a;
    });
    expect(steps).toBeGreaterThan(0); // the assertion above must actually have run
  });

  it("crosses an open boundary when Segmentarbeit holds it open", () => {
    let crossed = 0, checked = 0;
    // Same run as the guard above, but every phase is additionally probed with all boundaries open. Counting
    // swaps over a whole run keeps this off a single lucky deal; `frozen` pairs are excluded so the count can
    // only come from the open-region neighbourhood — with the segment-bound search it is 0 by construction.
    runWithFormationPhases(7, (s) => {
      const a = greedyFormationStep(withOpenBoundaries(s));
      if (a.type === "SWAP_CARDS") {
        checked++;
        const frozen = s.deck[s.playerOrder[a.i]]?.frozen || s.deck[s.playerOrder[a.j]]?.frozen;
        if (!frozen && segOf(a.i) !== segOf(a.j)) crossed++;
      }
      return greedyFormationStep(s); // the run itself plays unmodified
    });
    expect(checked).toBeGreaterThan(0);
    expect(crossed).toBeGreaterThan(0);
  });
});
