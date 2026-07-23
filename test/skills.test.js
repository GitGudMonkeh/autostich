import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { SKILL_DEFS, skillSum, initLightning, lightningCritRaw, addCharge, buildSkillOffer, archetypeOf } from "../src/game/skills.js";
import { LIGHTNING_CRIT_BASE, LIGHTNING_CRIT_PER_SKILL, LIGHTNING_MAX_CHARGE } from "../src/game/constants.js";

const LR = "SK_LIGHTNING_01";
const active = (over = {}) => ({ active: true, charge: 0, maxCharge: LIGHTNING_MAX_CHARGE, ...over });

describe("skills — Blitz-Registry", () => {
  it("Blitzableiter: Hooks (critChance/chargeOnCrit/scoreFlatOnCrit) + archetype", () => {
    expect(SKILL_DEFS[LR].critChance()).toBeCloseTo(LIGHTNING_CRIT_PER_SKILL);
    expect(SKILL_DEFS[LR].chargeOnCrit()).toBe(1);
    expect(SKILL_DEFS[LR].scoreFlatOnCrit()).toBe(50);
    expect(archetypeOf(LR)).toBe("lightning");
  });
  it("skillSum summiert einen Hook über die gehaltenen Skills (fehlender Hook → 0)", () => {
    expect(skillSum([LR], "chargeOnCrit", {})).toBe(1);
    expect(skillSum([], "chargeOnCrit", {})).toBe(0);
    expect(skillSum([LR], "healOnWin", {})).toBe(0);
  });
});

describe("lightningCritRaw — Crit-Basis (Abschnitt 2a)", () => {
  it("0, solange der Archetyp inaktiv ist", () => {
    expect(lightningCritRaw(null, [])).toBe(0);
    expect(lightningCritRaw(initLightning(), [LR])).toBe(0); // active:false
  });
  it("Sockel + je Skill, wenn aktiv", () => {
    expect(lightningCritRaw(active(), [])).toBeCloseTo(LIGHTNING_CRIT_BASE);                              // nur Sockel
    expect(lightningCritRaw(active(), [LR])).toBeCloseTo(LIGHTNING_CRIT_BASE + LIGHTNING_CRIT_PER_SKILL); // → 0,10
  });
});

describe("addCharge — gedeckelt & immutabel", () => {
  it("no-op, solange inaktiv", () => {
    expect(addCharge(initLightning(), 3).charge).toBe(0);
    expect(addCharge(null, 3)).toBe(null);
  });
  it("erhöht und deckelt auf maxCharge", () => {
    expect(addCharge(active({ charge: 5 }), 2).charge).toBe(7);
    expect(addCharge(active({ charge: 9 }), 5).charge).toBe(LIGHTNING_MAX_CHARGE);
  });
  it("lässt das Original unverändert", () => {
    const l = active({ charge: 3 });
    addCharge(l, 2);
    expect(l.charge).toBe(3);
  });
});

describe("buildSkillOffer", () => {
  it("liefert nicht-gehaltene Skills, deterministisch bei festem Seed", () => {
    expect(buildSkillOffer([], makeRng(1), 3)).toEqual(buildSkillOffer([], makeRng(1), 3));
    expect(buildSkillOffer([], makeRng(1), 3)).toContain(LR);
  });
  it("leerer Pool (alles gehalten) → []", () => {
    expect(buildSkillOffer([LR], makeRng(1), 3)).toEqual([]);
  });
});
