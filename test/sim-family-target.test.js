import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { fixedPolicy } from "../sim/policies/fixed.js";
import { greedyFormationStep } from "../sim/formation.js";
import { familyTargetStep } from "../sim/families-policy.js";
import { FAMILY_DEFS } from "../src/game/families.js";
import { FORMATION_TYPES, computeFormations } from "../src/game/formations.js";
import { SUIT_ORDER } from "../src/game/constants.js";

// Same oracle the policy uses, restated here so the guard compares against the RULES rather than against
// the policy's own helper — a guard that called bestAlliance would only prove it equals itself.
const score = (s, roles) =>
  computeFormations(s.playerOrder, s.deck, roles, s.perks, s.skills, s.shop?.anchors || [],
    s.familyTiers, s.architectEnabled ? s.architect : null,
    { skillTiers: s.skillTiers || {}, growth: s.growth || {} })
    .reduce((t, f) => t + (f?.mult || 1), 0);

const E = Object.values(FAMILY_DEFS).filter((f) => f.cat === "E");
const PRIO = [];
for (const t of [4, 3, 2, 1]) for (const f of E) PRIO.push(`FAM:${f.id}:${t}`);

// Play E-heavy runs and collect every choice the target step makes, with the state it made it in.
function collectTargetChoices(seeds) {
  const out = { core: [], alliance: [] };
  const pol = fixedPolicy(PRIO, { solveFormations: true, architectGreedy: true });
  for (const seed of seeds) {
    const rng = makeRng(seed);
    let s = reducer(null, { type: "START_RUN", rng, architect: true });
    let guard = 0;
    while (s.phase !== "gameover" && guard++ < 200000) {
      if (s.phase === "play") { s = reducer(s, { type: "RESOLVE_TRICK", rng }); continue; }
      if (s.phase === "family-target") {
        const ft = s.familyTarget, a = familyTargetStep(s, rng);
        if (ft?.kind === "formationType" && a.type === "FAMILY_TARGET_FORMATION_TYPE") out.core.push({ s, chosen: a.formationType });
        if (ft?.kind === "suits" && ft.familyId === "E_COLOR_ALLIANCE" && a.type === "FAMILY_TARGET_SUIT" && !ft.suits.length) {
          out.alliance.push({ s, chosen: a.suit, need: ft.need });
        }
        s = reducer(s, a);
        continue;
      }
      s = reducer(s, s.phase === "formation" ? greedyFormationStep(s) : pol.act(s, rng));
    }
  }
  return out;
}

const SEEDS = [300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311];

describe("sim family-target picks a target it can actually see", () => {
  const choices = collectTargetChoices(SEEDS);

  it("Formationskern takes the type that scores highest on the current board", () => {
    expect(choices.core.length).toBeGreaterThan(0);
    for (const { s, chosen } of choices.core) {
      const best = Math.max(...FORMATION_TYPES.map((t) => score(s, { ...(s.roles || {}), E_CORE: [t] })));
      expect(score(s, { ...(s.roles || {}), E_CORE: [chosen] })).toBeCloseTo(best, 9);
    }
  });

  it("Farballianz does not simply take the first colours in SUIT_ORDER", () => {
    expect(choices.alliance.length).toBeGreaterThan(0);
    // The blind pick was always SUIT_ORDER[0]. Requiring that it differs at least once over these runs is
    // what fails if the oracle is removed; requiring it EVERY time would only encode this deal's shuffle.
    expect(choices.alliance.some((c) => c.chosen !== SUIT_ORDER[0])).toBe(true);
  });
});
