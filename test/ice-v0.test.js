import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, layerValue, totalLayers, frozenTargetFor, freezeCards, iceSkillCount } from "../src/game/skills.js";

/* Eis-Rework (v0) — Registrierungs- + Smoke-Tests. Nennt ALLE 21 Eis-Ids (Registry-Coverage-Gate) und prüft die
   reinen Eis-Helfer (Schicht-Dauerwert, Frostwahl-Einfrieren). Der Schicht-Spine (Ablage A/B, Eisdruck, Vergletscherung,
   Architekt) wird im Engine-/Reducer-Verhalten getragen — Vollabdeckung folgt im gesammelten Tuning-Pass. */
const ICE_IDS = [
  "SK_ICE_01", "SK_ICE_02", "SK_ICE_03", "SK_ICE_04", "SK_ICE_05", "SK_ICE_06", "SK_ICE_07",
  "SK_ICE_08", "SK_ICE_09", "SK_ICE_10", "SK_ICE_11", "SK_ICE_12", "SK_ICE_13", "SK_ICE_14",
  "SK_ICE_15", "SK_ICE_16", "SK_ICE_17", "SK_ICE_L01", "SK_ICE_L02", "SK_ICE_L03", "SK_ICE_L04",
];

describe("Eis-Rework v0 — Roster", () => {
  it("21 Eis-Skills: 17 normal + 4 legendär, alle archetype=ice, alle registriert, KEIN Konsument", () => {
    const ice = Object.values(SKILL_DEFS).filter((s) => s.archetype === "ice");
    expect(ice).toHaveLength(21);
    expect(ice.filter((s) => s.legendary)).toHaveLength(4);
    for (const id of ICE_IDS) {
      expect(SKILL_DEFS[id], `${id} fehlt im Registry`).toBeTruthy();
      expect(SKILL_DEFS[id].archetype).toBe("ice");
      expect(SKILL_DEFS[id].heatConsumer).toBeUndefined();     // Eis kennt keine Konsumenten
      expect(SKILL_DEFS[id].onFullCharge).toBeUndefined();
    }
  });
});

describe("Eis-Rework v0 — reine Helfer", () => {
  it("layerValue: linear, Gletscher superlinear (dreieckig)", () => {
    expect(layerValue(0)).toBe(0);
    expect(layerValue(3)).toBe(3 * C.ICE_LAYER_VALUE);            // linear
    expect(layerValue(3, true)).toBe((3 * 4 / 2) * C.ICE_LAYER_VALUE); // Gletscher: 1+2+3 = 6
    expect(layerValue(5, true)).toBe(15 * C.ICE_LAYER_VALUE);
  });
  it("totalLayers: Summe über alle Frostkarten", () => {
    expect(totalLayers({})).toBe(0);
    expect(totalLayers({ a: 2, b: 3, c: 0 })).toBe(5);
  });
  it("frozenTargetFor: Basis + je Eis-Skill + Frostgriff", () => {
    expect(frozenTargetFor([])).toBe(0);
    expect(frozenTargetFor(["SK_ICE_15"])).toBe(C.ICE_BASE_FREEZE);                 // 1 Skill, kein Frostgriff
    expect(frozenTargetFor(["SK_ICE_01"])).toBe(C.ICE_BASE_FREEZE + C.FROST_GRIP_BONUS); // Frostgriff +2
    expect(iceSkillCount(["SK_ICE_01", "SK_ICE_15"])).toBe(2);
  });
  it("freezeCards Frostwahl: friert gezielt die niedrigsten Karten (preferLowest)", () => {
    const deck = [{ id: "a", value: 8 }, { id: "b", value: 2 }, { id: "c", value: 5 }, { id: "d", value: 1 }];
    const frozen = freezeCards(deck, 2, () => 0.5, true).filter((c) => c.frozen).map((c) => c.id).sort();
    expect(frozen).toEqual(["b", "d"]); // die zwei niedrigsten (1, 2)
  });
});
