import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, initLightning, lightningCritRaw, maxChargeFor, lightningCritMult,
  ionizeCountFor, chargeConsumerCount, hasDoubleDischarge, hasDurchschlag } from "../src/game/skills.js";

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
