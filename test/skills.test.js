import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { SKILL_DEFS, skillSum, initLightning, lightningCritRaw, addCharge, buildSkillOffer, archetypeOf,
  ionScoreFor, consumesCharge, ionizeCountFor, consumeCharge, ionizeCards } from "../src/game/skills.js";
import { LIGHTNING_CRIT_BASE, LIGHTNING_CRIT_PER_SKILL, LIGHTNING_MAX_CHARGE } from "../src/game/constants.js";

const LR = "SK_LIGHTNING_01";
const ALL = Object.keys(SKILL_DEFS);
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
  it("liefert count distinkte, nicht-gehaltene Skills, deterministisch bei festem Seed", () => {
    const off = buildSkillOffer([], makeRng(1), 3);
    expect(off).toEqual(buildSkillOffer([], makeRng(1), 3));
    expect(off).toHaveLength(3);
    expect(new Set(off).size).toBe(3);
    expect(off.every((id) => SKILL_DEFS[id])).toBe(true);
  });
  it("bereits gehaltene werden nicht erneut angeboten; leerer Pool → []", () => {
    expect(buildSkillOffer([LR], makeRng(1), 3)).not.toContain(LR);
    expect(buildSkillOffer(ALL, makeRng(1), 3)).toEqual([]);
  });
});

describe("Ionisierung — Helfer (Stufe B)", () => {
  const I = "SK_LIGHTNING_02", K = "SK_LIGHTNING_03";
  const mkDeck = (stacks) => stacks.map((s, i) => ({ id: `c${i}`, suit: "R", baseRank: 1, value: 1, ...(s ? { ionStacks: s } : {}) }));

  it("ionScoreFor: +25 je Stapel (0 ohne / null)", () => {
    expect(ionScoreFor({ ionStacks: 3 })).toBe(75);
    expect(ionScoreFor({ ionStacks: 0 })).toBe(0);
    expect(ionScoreFor({})).toBe(0);
    expect(ionScoreFor(null)).toBe(0);
  });
  it("consumesCharge nur mit Ionisierung; ionizeCountFor = 2 (+2 mit Kettenblitz)", () => {
    expect(consumesCharge([I])).toBe(true);
    expect(consumesCharge([K])).toBe(false);   // Kettenblitz allein ist kein Verbraucher
    expect(consumesCharge([])).toBe(false);
    expect(ionizeCountFor([I])).toBe(2);
    expect(ionizeCountFor([I, K])).toBe(4);
  });
  it("consumeCharge setzt auf den Boden (Default 0, Stufe C: Reststrom)", () => {
    expect(consumeCharge(active({ charge: 10 })).charge).toBe(0);
    expect(consumeCharge(active({ charge: 10 }), 3).charge).toBe(3);
  });
  it("ionizeCards: count distinkte ungespielte Karten je +1 (immutabel)", () => {
    const deck = mkDeck([0, 0, 0, 0, 0]);
    const out = ionizeCards(deck, [1, 2, 3, 4], 2, makeRng(1));
    const bumped = out.filter((c) => (c.ionStacks || 0) > 0);
    expect(bumped).toHaveLength(2);
    expect(bumped.every((c) => c.ionStacks === 1)).toBe(true);
    expect(deck.every((c) => !c.ionStacks)).toBe(true); // Original unverändert
  });
  it("ionizeCards Fallback: zu wenige ungespielte Karten → Rest auf bereits ionisierte", () => {
    const deck = mkDeck([2, 0, 0]); // c0 schon ionisiert, nur c1 ungespielt
    const out = ionizeCards(deck, [1], 3, makeRng(1));
    const total = out.reduce((s, c) => s + (c.ionStacks || 0), 0);
    expect(total).toBe(2 + 3); // 3 Stapel verteilt, nichts verloren
  });
});
