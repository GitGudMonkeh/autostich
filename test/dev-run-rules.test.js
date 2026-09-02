import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, initialState, menuState } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { buildSkillOffer, offerArchetypes, archetypeOf, SKILL_DEFS, SKILL_OFFER_PER_ARCH_CAP } from "../src/game/skills.js";
import { DEFAULT_RULES, RULE_LIMITS, sanitizeRules, runRules, perksOfferedFor, skillOfferParams } from "../src/game/rules.js";
import { MAX_ARCHETYPES, SKILL_SLOTS, SKILLS_OFFERED, PERKS_OFFERED, TRICKS_PER_CYCLE, LEG_PHASE_CYCLE, buildSchedule } from "../src/game/constants.js";
import { DECISION_TOKENS, PLAN_TOKENS, MIN_ROUNDS, MAX_ROUNDS, distribute, legendaryRoundOf, withLegendaryAt,
  defaultConfig, normalizeConfig, toDevAction } from "../src/ui/devRunConfig.js";
import { loadDevRunLast, saveDevRunLast, loadDevRunPresets, saveDevRunPresets, upsertDevRunPreset, removeDevRunPreset,
  DEVRUN_PRESET_MAX, RESET_KEYS } from "../src/game/storage.js";

/* exp: rules per run (rules.js) — the Dev-Run's knobs for the core loop. Three promises are tested here:
   1. without state.rules every reader returns the constants (Sim/standard/ranked byte-identical),
   2. with rules the offers, caps and slots follow them,
   3. the panel's config survives junk, presets and the START_RUN round trip. */

const ALL4 = ["lightning", "fire", "ice", "plant"];
const archsOf = (offer) => new Set(offer.map(archetypeOf));

describe("rules.js — defaults are the constants", () => {
  it("DEFAULT_RULES mirrors constants.js (12 skills = 3 per archetype × 4)", () => {
    expect(DEFAULT_RULES).toEqual({ skillsPerArch: Math.floor(SKILLS_OFFERED / MAX_ARCHETYPES), maxArchetypes: MAX_ARCHETYPES, skillSlots: SKILL_SLOTS, perksOffered: PERKS_OFFERED });
    expect(DEFAULT_RULES.skillsPerArch).toBe(SKILL_OFFER_PER_ARCH_CAP);
  });
  it("runRules: no rules → defaults; junk ignored; numbers floored and clamped to RULE_LIMITS", () => {
    expect(runRules(null)).toEqual(DEFAULT_RULES);
    expect(runRules({ rules: null })).toEqual(DEFAULT_RULES);
    expect(runRules({ rules: { bogus: 9, skillSlots: "abc" } })).toEqual(DEFAULT_RULES);
    expect(sanitizeRules({ bogus: 9 })).toBeNull();
    expect(sanitizeRules("nope")).toBeNull();
    const r = sanitizeRules({ skillsPerArch: 99, maxArchetypes: 0, skillSlots: "4.9", perksOffered: -3, extra: 1 });
    expect(r).toEqual({ skillsPerArch: RULE_LIMITS.skillsPerArch[1], maxArchetypes: RULE_LIMITS.maxArchetypes[0], skillSlots: 4, perksOffered: RULE_LIMITS.perksOffered[0] });
  });
  it("perksOfferedFor / skillOfferParams: constants without rules, week mods stay above the rule", () => {
    expect(perksOfferedFor(initialState(makeRng(1)))).toBe(PERKS_OFFERED);
    expect(skillOfferParams(initialState(makeRng(1)))).toEqual({ count: SKILLS_OFFERED, maxArchetypes: MAX_ARCHETYPES, perArchCap: SKILL_OFFER_PER_ARCH_CAP });
    const dev = { rules: { skillsPerArch: 2, maxArchetypes: 3, perksOffered: 5 } };
    expect(perksOfferedFor(dev)).toBe(5);
    expect(skillOfferParams(dev)).toEqual({ count: 6, maxArchetypes: 3, perArchCap: 2 });
    // Ranked scarcity: exactly the legacy tuple (1 perk · count 4 under the builder's own cap), rule or not.
    const scarce = { ...dev, weekMods: [{ effect: "scarcePerks" }, { effect: "scarceSkills" }] };
    expect(perksOfferedFor(scarce)).toBe(1);
    expect(skillOfferParams(scarce)).toEqual({ count: 4, maxArchetypes: 3, perArchCap: SKILL_OFFER_PER_ARCH_CAP });
  });
});

describe("skills.js — offer builder takes the caps as parameters", () => {
  it("offerArchetypes: explicit max, default = MAX_ARCHETYPES (byte-identical)", () => {
    expect(offerArchetypes([], ALL4, makeRng(3), 2)).toHaveLength(2);
    expect(offerArchetypes(["fire", "ice"], ALL4, makeRng(3), 1)).toEqual(["fire"]); // active first, then cut
    expect(offerArchetypes([], ALL4, makeRng(3))).toEqual(offerArchetypes([], ALL4, makeRng(3), MAX_ARCHETYPES));
  });
  it("buildSkillOffer: explicit defaults reproduce the legacy call exactly", () => {
    for (const seed of [1, 2, 3]) {
      expect(buildSkillOffer([], [], makeRng(seed), SKILLS_OFFERED))
        .toEqual(buildSkillOffer([], [], makeRng(seed), SKILLS_OFFERED, 0, false, null, MAX_ARCHETYPES, SKILL_OFFER_PER_ARCH_CAP));
    }
  });
  it("buildSkillOffer: 2 archetypes × 2 skills → 4 skills from at most 2 archetypes; 5 per archetype lifts the old cap of 3", () => {
    const small = buildSkillOffer([], [], makeRng(5), 4, 0, false, null, 2, 2);
    expect(small).toHaveLength(4);
    expect(archsOf(small).size).toBe(2);
    const wide = buildSkillOffer([], [], makeRng(5), 20, 0, false, null, 4, 5);
    expect(wide).toHaveLength(20);
    for (const a of ALL4) expect(wide.filter((id) => archetypeOf(id) === a)).toHaveLength(5);
  });
});

describe("reducer — START_RUN with action.dev.rules", () => {
  const dev = (over = {}) => ({ rounds: 30, schedule: buildSchedule(30), cover: 10, energy: 4, fullCatalog: false,
    rules: { skillsPerArch: 2, maxArchetypes: 2, skillSlots: 4, perksOffered: 5 }, ...over });
  it("sanitised rules land in the state; slots, catalog switch and the config for a restart follow", () => {
    const s = reducer(menuState(), { type: "START_RUN", rng: makeRng(1), dev: dev() });
    expect(s.rules).toEqual({ skillsPerArch: 2, maxArchetypes: 2, skillSlots: 4, perksOffered: 5 });
    expect(s.skillSlots).toBe(4);
    expect(s.devMode).toBe(false);                 // random offers, not the full catalog
    expect(s.maxCycles).toBe(30);
    expect(s.devSchedule).toHaveLength(30);
    expect(s.legPhaseEnabled).toBe(true);
    expect(s.devConfig).toEqual({ rounds: 30, schedule: buildSchedule(30), cover: 10, energy: 4, fullCatalog: false, rules: s.rules });
    // First decision = skill: the offer already follows the rules (2 × 2).
    expect(s.phase).toBe("levelup");
    expect(s.skillOffer).toHaveLength(4);
    expect(archsOf(s.skillOffer).size).toBe(2);
    // Restart with devConfig reproduces the same rules.
    const again = reducer(menuState(), { type: "START_RUN", rng: makeRng(2), dev: s.devConfig });
    expect(again.rules).toEqual(s.rules);
    expect(again.devConfig).toEqual(s.devConfig);
  });
  it("legacy contract: a dev action without fullCatalog/rules is the old full-catalog test layout", () => {
    const s = reducer(menuState(), { type: "START_RUN", rng: makeRng(1), dev: { rounds: 40, schedule: [], cover: 10, energy: 4 } });
    expect(s.devMode).toBe(true);
    expect(s.rules).toBeNull();
    expect(s.skillSlots).toBe(SKILL_SLOTS);
    expect(s.devConfig.fullCatalog).toBe(true);
  });
  it("unknown plan tokens fall back to the standard plan (no silent round without a decision)", () => {
    const s = reducer(menuState(), { type: "START_RUN", rng: makeRng(1), dev: dev({ schedule: ["skill", "bogus", 7, null] }) });
    expect(s.devSchedule.slice(0, 4)).toEqual(["skill", buildSchedule(30)[1], buildSchedule(30)[2], buildSchedule(30)[3]]);
    expect(s.devSchedule.every((tk) => DECISION_TOKENS.includes(tk))).toBe(true);
  });
  it("normal START_RUN carries no rules and keeps the constants", () => {
    const s = reducer(menuState(), { type: "START_RUN", rng: makeRng(1) });
    expect(s.rules).toBeNull();
    expect(s.devConfig).toBeNull();
    expect(s.skillOffer).toHaveLength(SKILLS_OFFERED);
  });
});

describe("reducer — PICK_SKILL honours rules.maxArchetypes", () => {
  const iceSkill = Object.keys(SKILL_DEFS).find((id) => archetypeOf(id) === "ice" && !SKILL_DEFS[id].legendary && !SKILL_DEFS[id].enabler);
  const base = (rules) => ({ ...initialState(makeRng(1)), phase: "levelup", skillOffer: [iceSkill], skills: [], activeArchetypes: ["fire"], rules });
  it("cap 1 with fire active → an ice skill is not pickable; cap 2 → it is", () => {
    const blocked = base({ maxArchetypes: 1 });
    expect(reducer(blocked, { type: "PICK_SKILL", skillId: iceSkill, rng: makeRng(1) })).toBe(blocked);
    const open = reducer(base({ maxArchetypes: 2 }), { type: "PICK_SKILL", skillId: iceSkill, rng: makeRng(1) });
    expect(open.skills).toEqual([iceSkill]);
    expect(open.activeArchetypes).toContain("ice"); // (the pick recomputes the list from the held skills — fire held none)
  });
});

describe("engine — cycle end reads the rules", () => {
  // Constant decks make every trick a win; phase forced back to play skips the decision screens.
  const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
  const identity = () => Array.from({ length: 40 }, (_, i) => i);
  function playCycle(s, rng) {
    for (let k = 0; k < TRICKS_PER_CYCLE; k++) {
      if (s.phase !== "play") s = { ...s, phase: "play" };
      s = resolveTrick(s, rng);
    }
    return s;
  }
  const withSchedule = (decision, rules) => ({
    ...initialState(makeRng(1)), deck: constDeck(10), oppDeck: constDeck(1), playerOrder: identity(), oppOrder: identity(),
    architectEnabled: true, devSchedule: ["skill", decision, "perk"], maxCycles: 3, rules,
  });
  it("perk decision offers rules.perksOffered perks (5), default 3", () => {
    const s5 = playCycle(withSchedule("perk", { perksOffered: 5 }), makeRng(7));
    expect(s5.phase).toBe("levelup");
    expect(s5.offer).toHaveLength(5);
    const s3 = playCycle(withSchedule("perk", null), makeRng(7));
    expect(s3.offer).toHaveLength(PERKS_OFFERED);
  });
  it("skill decision offers skillsPerArch × maxArchetypes (1 × 4 = 4), default 12", () => {
    const s4 = playCycle(withSchedule("skill", { skillsPerArch: 1, maxArchetypes: 4 }), makeRng(7));
    expect(s4.phase).toBe("levelup");
    expect(s4.skillOffer).toHaveLength(4);
    expect(archsOf(s4.skillOffer).size).toBe(4);
    const s12 = playCycle(withSchedule("skill", null), makeRng(7));
    expect(s12.skillOffer).toHaveLength(SKILLS_OFFERED);
  });
  it("a legendary decision in a Dev-Run plan opens the legendary phase (active archetype required)", () => {
    const fire = Object.keys(SKILL_DEFS).find((id) => archetypeOf(id) === "fire" && !SKILL_DEFS[id].legendary);
    const s = playCycle({ ...withSchedule("legendary", null), skills: [fire], activeArchetypes: ["fire"] }, makeRng(7));
    expect(s.phase).toBe("legendary");
    expect(s.legendaryOffer.length).toBeGreaterThan(0);
  });
});

describe("devRunConfig.js — the panel's data", () => {
  it("defaultConfig is the real game: MAX_CYCLES rounds, the standard plan with its legendary phase, constants as rules", () => {
    const d = defaultConfig();
    expect(d.schedule).toEqual(buildSchedule(d.rounds));
    expect(legendaryRoundOf(d.schedule)).toBe(LEG_PHASE_CYCLE);
    expect(d.rules).toEqual(DEFAULT_RULES);
    expect(d.fullCatalog).toBe(false);
    expect(d.enabled).toEqual(DECISION_TOKENS);
  });
  it("normalizeConfig: junk → defaults; rounds clamped and the plan cut/extended; disabled types replaced; rules clamped", () => {
    expect(normalizeConfig(null)).toEqual(defaultConfig());
    expect(normalizeConfig("x")).toEqual(defaultConfig());
    const big = normalizeConfig({ rounds: 999, schedule: ["skill"] });
    expect(big.rounds).toBe(MAX_ROUNDS);
    expect(big.schedule).toHaveLength(MAX_ROUNDS);
    expect(big.schedule[0]).toBe("skill");
    expect(big.schedule.slice(1)).toEqual(buildSchedule(MAX_ROUNDS).slice(1)); // extension = standard plan
    const tiny = normalizeConfig({ rounds: 1 });
    expect(tiny.rounds).toBe(MIN_ROUNDS);
    const noShop = normalizeConfig({ rounds: 50, enabled: ["skill", "perk", "formation", "legendary"], schedule: buildSchedule(50) });
    expect(noShop.schedule.includes("shop")).toBe(false);
    expect(noShop.schedule.filter((tk) => tk === "legendary")).toHaveLength(1);
    expect(noShop.schedule[LEG_PHASE_CYCLE - 1]).toBe("legendary");
    const junkPlan = normalizeConfig({ rounds: 20, schedule: ["bogus", 3] });
    expect(junkPlan.schedule).toEqual(buildSchedule(20));
    const clamped = normalizeConfig({ rules: { skillSlots: 99, perksOffered: "2" }, cover: -5, energy: 999, fullCatalog: "yes" });
    expect(clamped.rules).toEqual({ ...DEFAULT_RULES, skillSlots: RULE_LIMITS.skillSlots[1], perksOffered: 2 });
    expect(clamped.cover).toBe(0);
    expect(clamped.fullCatalog).toBe(true);
    // No plan type enabled at all → back to every type (the panel never lets it happen, a hand-edited record could).
    expect(normalizeConfig({ enabled: ["legendary"] }).enabled).toEqual(DECISION_TOKENS);
  });
  it("distribute never places the legendary phase; withLegendaryAt moves it, 0 removes it", () => {
    const rr = distribute(8, DECISION_TOKENS);
    expect(rr).toEqual(["skill", "perk", "formation", "shop", "skill", "perk", "formation", "shop"]);
    expect(distribute(3, [])).toEqual(["perk", "perk", "perk"]);
    expect(PLAN_TOKENS).not.toContain("legendary");
    const moved = withLegendaryAt(buildSchedule(50), 10, buildSchedule(50));
    expect(legendaryRoundOf(moved)).toBe(10);
    expect(moved.filter((tk) => tk === "legendary")).toHaveLength(1);
    expect(moved[LEG_PHASE_CYCLE - 1]).toBe("perk"); // the standard slot itself is legendary → perk fallback
    const none = withLegendaryAt(buildSchedule(50), 0, rr.concat(rr, rr, rr, rr, rr, rr));
    expect(legendaryRoundOf(none)).toBe(0);
  });
  it("toDevAction carries exactly what the reducer reads and round-trips through START_RUN", () => {
    const cfg = normalizeConfig({ rounds: 25, rules: { skillsPerArch: 2 }, fullCatalog: false });
    const act = toDevAction(cfg);
    expect(Object.keys(act).sort()).toEqual(["cover", "energy", "fullCatalog", "rounds", "rules", "schedule"]);
    expect(act.schedule).toHaveLength(25);
    const s = reducer(menuState(), { type: "START_RUN", rng: makeRng(1), dev: act });
    expect(s.devConfig).toEqual(act);
    expect(s.rules).toEqual(act.rules);
  });
});

describe("storage.js — Dev-Run presets and last config", () => {
  let ls;
  beforeEach(() => { ls = new Map(); vi.stubGlobal("localStorage", { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k), clear: () => ls.clear() }); });
  afterEach(() => vi.unstubAllGlobals());
  it("last config round-trips; junk in storage reads as null", () => {
    expect(loadDevRunLast()).toBeNull();
    saveDevRunLast({ rounds: 30 });
    expect(loadDevRunLast()).toEqual({ rounds: 30 });
    for (const key of ls.keys()) ls.set(key, "{not json");
    expect(loadDevRunLast()).toBeNull();
  });
  it("presets: upsert replaces by name, appends new, keeps at most DEVRUN_PRESET_MAX; remove filters; junk entries dropped on load", () => {
    let list = upsertDevRunPreset([], "  Kurz ", { rounds: 20 });
    expect(list).toEqual([{ name: "Kurz", cfg: { rounds: 20 } }]);
    list = upsertDevRunPreset(list, "Kurz", { rounds: 25 });
    expect(list).toEqual([{ name: "Kurz", cfg: { rounds: 25 } }]);
    expect(upsertDevRunPreset(list, "   ", {})).toBe(list); // empty name → unchanged (same reference)
    for (let i = 0; i < DEVRUN_PRESET_MAX + 3; i++) list = upsertDevRunPreset(list, `P${i}`, { rounds: i });
    expect(list).toHaveLength(DEVRUN_PRESET_MAX);
    expect(list[list.length - 1].name).toBe(`P${DEVRUN_PRESET_MAX + 2}`);
    expect(removeDevRunPreset(list, "P5").some((p) => p.name === "P5")).toBe(false);
    saveDevRunPresets([{ name: "ok", cfg: { rounds: 30 } }, { name: 3 }, null, { cfg: {} }]);
    expect(loadDevRunPresets()).toEqual([{ name: "ok", cfg: { rounds: 30 } }]);
  });
  it("presets are not profile data: neither key is in RESET_KEYS", () => {
    expect(RESET_KEYS).not.toContain("as_devrun_presets");
    expect(RESET_KEYS).not.toContain("as_devrun_last");
  });
});
