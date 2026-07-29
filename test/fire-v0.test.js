import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, heatGainFor, heatLossFor, fireScoreFor, verbrennungMult,
  glowingValueFor, whiteHeatScore, forgeCostFor, initHeat } from "../src/game/skills.js";

/* Feuer-Rework (v0) — Registrierungs- + Smoke-Tests. Nennt ALLE 21 Feuer-Ids (Registry-Coverage-Gate)
   und prüft die reinen Feuer-Helfer auf plausible v0-Zahlen. Behavioral-Vollabdeckung (Engine/Reducer)
   folgt im gesammelten cross-archetype Tuning-Pass — hier bewusst nur Roster + reine Helfer. */
const FIRE_IDS = [
  "SK_FIRE_01", "SK_FIRE_02", "SK_FIRE_03", "SK_FIRE_04", "SK_FIRE_05", "SK_FIRE_06", "SK_FIRE_07",
  "SK_FIRE_08", "SK_FIRE_09", "SK_FIRE_10", "SK_FIRE_11", "SK_FIRE_12", "SK_FIRE_13", "SK_FIRE_14",
  "SK_FIRE_15", "SK_FIRE_16", "SK_FIRE_17", "SK_FIRE_L01", "SK_FIRE_L02", "SK_FIRE_L03", "SK_FIRE_L04",
];

describe("Feuer-Rework v0 — Roster", () => {
  it("21 Feuer-Skills: 17 normal + 4 legendär, alle archetype=fire, alle registriert", () => {
    const fire = Object.values(SKILL_DEFS).filter((s) => s.archetype === "fire");
    expect(fire).toHaveLength(21);
    expect(fire.filter((s) => s.legendary)).toHaveLength(4);
    for (const id of FIRE_IDS) {
      expect(SKILL_DEFS[id], `${id} fehlt im Registry`).toBeTruthy();
      expect(SKILL_DEFS[id].archetype).toBe("fire");
      expect(typeof SKILL_DEFS[id].desc).toBe("string");
    }
  });
  it("genau ein Konsument-Paar (Flächenbrand Burst / Schmelzpunkt Drip)", () => {
    expect(SKILL_DEFS.SK_FIRE_11.heatConsumer).toBe("conflagration");
    expect(SKILL_DEFS.SK_FIRE_12.heatConsumer).toBe("melt");
  });
});

describe("Feuer-Rework v0 — reine Helfer", () => {
  it("heatGainFor: Marge×Glut + Zunder + Feuersturm(Serie) + Rückzündung(Rückstand)", () => {
    expect(heatGainFor(6, [], {})).toBe(4);                              // (min(6,8)−2)×1
    expect(heatGainFor(6, ["SK_FIRE_01"], {})).toBe(6);                  // Glut ×1,5 → round(4×1,5)
    expect(heatGainFor(1, ["SK_FIRE_02"], {})).toBe(C.ZUNDER_HEAT);      // Zunder auch bei knappem Sieg (Marge<3)
    expect(heatGainFor(3, ["SK_FIRE_03"], { winStreak: 3 })).toBe(1 + 3);        // Basis 1 + Feuersturm 3
    expect(heatGainFor(3, ["SK_FIRE_03"], { winStreak: 99 })).toBe(1 + C.FEUERSTURM_CAP); // Cap
    expect(heatGainFor(3, ["SK_FIRE_05"], { lostLast: true, deficit: 4 })).toBe(1 + 4);    // Rückzündung
    expect(heatGainFor(3, ["SK_FIRE_05"], { lostLast: false, deficit: 4 })).toBe(1);       // nur nach Niederlage
  });
  it("heatLossFor: Glutbett halbiert / unter 30 % gratis / Deckel", () => {
    expect(heatLossFor(8, [])).toBe(8);
    expect(heatLossFor(8, ["SK_FIRE_04"], 50)).toBe(4);   // ×0,5
    expect(heatLossFor(8, ["SK_FIRE_04"], 20)).toBe(0);   // unter 30 % → kein Verlust
    expect(heatLossFor(20, [])).toBe(C.HEAT_LOSS_MAX);    // Deckel
  });
  it("fireScoreFor + Verbrennung(≥8/≥12) + Sonnenzorn(≥80 %)", () => {
    expect(fireScoreFor(6, ["SK_FIRE_09"], 0)).toBe((6 - 2) * 25);          // Marge<8 → ×1
    expect(fireScoreFor(10, ["SK_FIRE_09"], 0)).toBe(Math.round((10 - 2) * 25 * 1.5));
    expect(fireScoreFor(12, ["SK_FIRE_09"], 0)).toBe(Math.round((12 - 2) * 25 * 2));
    expect(fireScoreFor(6, ["SK_FIRE_L03"], 80)).toBe(Math.round((6 - 2) * 25 * 1.25)); // Sonnenzorn ≥80 % → ×1,25
    expect(fireScoreFor(6, ["SK_FIRE_L03"], 0)).toBe((6 - 2) * 25);                       // unter 80 % kein Sonnenzorn
    expect(verbrennungMult(7)).toBe(1);
    expect(verbrennungMult(8)).toBe(C.VERBRENNUNG_T1_MULT);
    expect(verbrennungMult(12)).toBe(C.VERBRENNUNG_T2_MULT);
  });
  it("glowingValueFor: Stufen 40/70/100 + Sonnenzorn +1 Stufe", () => {
    expect(glowingValueFor(39, ["SK_FIRE_06"])).toBe(0);
    expect(glowingValueFor(40, ["SK_FIRE_06"])).toBe(1);
    expect(glowingValueFor(70, ["SK_FIRE_06"])).toBe(2);
    expect(glowingValueFor(100, ["SK_FIRE_06"])).toBe(3);
    expect(glowingValueFor(100, ["SK_FIRE_06", "SK_FIRE_L03"])).toBe(4); // +Sonnenzorn
  });
  it("whiteHeatScore: +10/Punkt, Sonnenzorn ×2", () => {
    expect(whiteHeatScore(3, ["SK_FIRE_07"], 100)).toBe(30);
    expect(whiteHeatScore(3, ["SK_FIRE_07", "SK_FIRE_L03"], 100)).toBe(60);
    expect(whiteHeatScore(3, [], 100)).toBe(0); // ohne Weißglut
  });
  it("forgeCostFor: 5, Schmelzofen-Rabatt ab 50 %", () => {
    expect(forgeCostFor(["SK_FIRE_15"], 0)).toBe(C.FORGE_COST);
    expect(forgeCostFor(["SK_FIRE_15", "SK_FIRE_17"], 60)).toBe(C.FORGE_COST - 1);
    expect(forgeCostFor(["SK_FIRE_15", "SK_FIRE_17"], 20)).toBe(C.FORGE_COST); // unter 50 % kein Rabatt
  });
  it("initHeat: frischer Substate", () => {
    expect(initHeat()).toMatchObject({ active: false, value: 0, fireRoll: 0, sparkStore: 0, phoenixUsed: false });
  });
});
