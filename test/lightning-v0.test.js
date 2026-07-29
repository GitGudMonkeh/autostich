import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, initLightning, lightningCritRaw, maxChargeFor, lightningCritMult,
  ionizeCountFor, chargeConsumerCount, hasDoubleDischarge, hasDurchschlag,
  ionizeCardsWithCatch } from "../src/game/skills.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";

// Engine-Test-Helfer (konstante Decks; pos 0 → Formations-Mult 1).
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const scen = (pVal, oVal, over = {}) => ({ ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal), playerOrder: identity(), oppOrder: identity(), ...over });
const light = (over = {}) => ({ ...initLightning(), active: true, ...over });
const noCrit = () => 0.99, zero = () => 0;
const ION = "SK_LIGHTNING_02", ARC = "SK_LIGHTNING_12";

/* Blitz-Rework (v0) — Registrierungs- + Smoke-Tests. Nennt ALLE 21 Blitz-Ids (Registry-Coverage-Gate)
   und prüft die reinen Blitz-Helfer. Engine-Verhalten (4 Währungen + Kaskade) folgt im Tuning-Pass. */
const LIGHTNING_IDS = [
  "SK_LIGHTNING_01", "SK_LIGHTNING_02", "SK_LIGHTNING_03", "SK_LIGHTNING_04", "SK_LIGHTNING_05",
  "SK_LIGHTNING_06", "SK_LIGHTNING_07", "SK_LIGHTNING_08", "SK_LIGHTNING_09", "SK_LIGHTNING_10",
  "SK_LIGHTNING_11", "SK_LIGHTNING_12", "SK_LIGHTNING_13", "SK_LIGHTNING_14", "SK_LIGHTNING_15",
  "SK_LIGHTNING_16", "SK_LIGHTNING_17", "SK_LIGHTNING_L01", "SK_LIGHTNING_L02", "SK_LIGHTNING_L03", "SK_LIGHTNING_L04",
];

describe("Blitz-Rework v0 — Roster", () => {
  it("21 Blitz-Skills: 17 normal + 4 legendär, alle archetype=lightning, jeder trägt Crit-Chance bei", () => {
    const light = Object.values(SKILL_DEFS).filter((s) => s.archetype === "lightning");
    expect(light).toHaveLength(21);
    expect(light.filter((s) => s.legendary)).toHaveLength(4);
    for (const id of LIGHTNING_IDS) {
      expect(SKILL_DEFS[id], `${id} fehlt im Registry`).toBeTruthy();
      expect(SKILL_DEFS[id].archetype).toBe("lightning");
      expect(SKILL_DEFS[id].critChance()).toBe(C.LIGHTNING_CRIT_PER_SKILL); // Blitz besitzt die Crit-Erzeugung
    }
  });
  it("genau ein Ladungs-Konsument-Paar (Ionisierung/Geladene Serie)", () => {
    expect(SKILL_DEFS.SK_LIGHTNING_02.onFullCharge).toBe("ionize");
    expect(SKILL_DEFS.SK_LIGHTNING_07.onFullCharge).toBe("protectStreak");
    expect(chargeConsumerCount(["SK_LIGHTNING_02", "SK_LIGHTNING_07"])).toBe(2); // Reducer blockt >1 beim Pick
  });
});

describe("Blitz-Rework v0 — reine Helfer", () => {
  it("initLightning: frischer Substate inkl. neuer Kaskade-/Crit-Maschine-Felder", () => {
    expect(initLightning()).toMatchObject({ active: false, charge: 0, dischargeArmed: false, stauBonus: 0, durchschlagMult: 0 });
  });
  it("lightningCritRaw: Sockel + je Skill + Sturm + Spannungsstau-Rampe", () => {
    const l = { active: true, stormCritBonus: 0.04, stauBonus: 0.1 };
    expect(lightningCritRaw(l, ["SK_LIGHTNING_01"])).toBeCloseTo(C.LIGHTNING_CRIT_BASE + C.LIGHTNING_CRIT_PER_SKILL + 0.04 + 0.1, 6);
    expect(lightningCritRaw({ active: false }, ["SK_LIGHTNING_01"])).toBe(0); // inaktiv → 0
  });
  it("maxChargeFor / lightningCritMult: Donnergott 10→15 & +1,0×", () => {
    expect(maxChargeFor([])).toBe(C.LIGHTNING_MAX_CHARGE);
    expect(maxChargeFor(["SK_LIGHTNING_L01"])).toBe(C.LIGHTNING_MAX_CHARGE_THUNDER);
    expect(lightningCritMult(["SK_LIGHTNING_L01"])).toBe(C.THUNDER_CRIT_MULT);
    expect(lightningCritMult([])).toBe(0);
  });
  it("ionizeCountFor: Ionisierung 2 + Kettenblitz +2", () => {
    expect(ionizeCountFor(["SK_LIGHTNING_02"])).toBe(C.ION_BASE_COUNT);
    expect(ionizeCountFor(["SK_LIGHTNING_02", "SK_LIGHTNING_03"])).toBe(C.ION_BASE_COUNT + C.KETTENBLITZ_COUNT);
  });
  it("Legendär-Prädikate", () => {
    expect(hasDoubleDischarge(["SK_LIGHTNING_L02"])).toBe(true);
    expect(hasDurchschlag(["SK_LIGHTNING_L04"])).toBe(true);
    expect(hasDoubleDischarge(["SK_LIGHTNING_01"])).toBe(false);
  });
});

describe("Blitz-Rework v0 — Engine-Integration", () => {
  it("Ionis-Cap 5: Sieg mit ionisierter Karte 4→5; volle Karte bleibt 5", () => {
    const d4 = constDeck(12).map((c, i) => (i === 0 ? { ...c, ionStacks: 4 } : c));
    expect(resolveTrick(scen(12, 0, { skills: [ION], deck: d4, lightning: light() }), noCrit).deck[0].ionStacks).toBe(5);
    const d5 = constDeck(12).map((c, i) => (i === 0 ? { ...c, ionStacks: 5 } : c));
    expect(resolveTrick(scen(12, 0, { skills: [ION], deck: d5, lightning: light() }), noCrit).deck[0].ionStacks).toBe(5);
  });
  it("Blitzfänger: ionizeCardsWithCatch fängt eine volle Karte statt sie zu ionisieren", () => {
    const res = ionizeCardsWithCatch([{ id: "A", ionStacks: 5 }, { id: "B", ionStacks: 0 }], [0], 1, makeRng(1));
    expect(res.catchIds).toEqual(["A"]);
    expect(res.deck[0].ionStacks).toBe(5);
  });
  it("Spannungsbogen: Sieg mit ionisierter Karte → direkter Nachfolger +1 Stapel", () => {
    const deck = constDeck(12).map((c, i) => (i === 0 ? { ...c, ionStacks: 1 } : c));
    const s = resolveTrick(scen(12, 0, { skills: [ARC], deck, lightning: light() }), noCrit);
    expect(s.deck[1].ionStacks).toBe(1); // Nachfolger
    expect(s.deck[0].ionStacks).toBe(2); // Siegkarte selbst +1
  });
  it("Spannungsstau: Sieg ohne Crit rampt die Crit-Chance; ein Crit resettet", () => {
    const noC = resolveTrick(scen(12, 0, { skills: ["SK_LIGHTNING_13"], lightning: light() }), noCrit);
    expect(noC.lightning.stauBonus).toBeCloseTo(C.SPANNUNGSSTAU_STEP);
    const crit = resolveTrick(scen(12, 0, { skills: ["SK_LIGHTNING_13"], statCritChance: 1, lightning: light({ stauBonus: 0.3 }) }), zero);
    expect(crit.lastTrick.isCrit).toBe(true);
    expect(crit.lightning.stauBonus).toBe(0);
  });
  it("Kurzschluss: Sieg mit voller (5) Karte entlädt alle Stapel → +Ladung-Burst, Karte auf 0", () => {
    const deck = constDeck(12).map((c, i) => (i === 0 ? { ...c, ionStacks: 5 } : c));
    const s = resolveTrick(scen(12, 0, { skills: ["SK_LIGHTNING_09"], deck, lightning: light() }), noCrit);
    expect(s.deck[0].ionStacks).toBe(0);
    expect(s.lightning.charge).toBe(5 * C.KURZSCHLUSS_CHARGE_PER_STACK);
  });
  it("Blitzschlag: ein Crit ionisiert die gewonnene Karte (+1 Stapel)", () => {
    const s = resolveTrick(scen(12, 0, { skills: ["SK_LIGHTNING_15"], statCritChance: 1, lightning: light() }), zero);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.deck[0].ionStacks).toBe(C.BLITZSCHLAG_STACKS);
  });
});
