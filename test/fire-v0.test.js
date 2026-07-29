import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, heatGainFor, heatLossFor, fireScoreFor, verbrennungMult,
  glowingValueFor, whiteHeatScore, forgeCostFor, initHeat } from "../src/game/skills.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";

// Engine-Test-Helfer (konstante Decks; pos 0 → Formations-Mult 1, wie in den Bestandstests).
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const scen = (pVal, oVal, over = {}) => ({ ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal), playerOrder: identity(), oppOrder: identity(), ...over });
const heat = (over = {}) => ({ ...initHeat(), active: true, ...over });
const noCrit = () => 0.99;
const B = C.SCORE_PER_WIN;

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

describe("Feuer-Rework v0 — Engine-Integration", () => {
  it("Feuer-Score bei Sieg fließt in die multiplizierte Basis (Grund-Payoff)", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_01"], heat: heat() }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + (6 - 2) * 25) * 1.02); // 1 Feuer-Skill → (Vorsprung−2)×25
  });
  it("Hitzegewinn: Glut ×1,5 auf die Marge (Vorsprung 6 → +6 %)", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_01"], heat: heat({ value: 0 }) }), noCrit);
    expect(s.heat.value).toBe(6); // round((min(6,8)−2)×1 × 1,5)
  });
  it("Glühende Klinge: +3 Wert bei 100 % Hitze macht einen Rückstand zum Sieg", () => {
    const s = resolveTrick(scen(8, 10, { skills: ["SK_FIRE_06"], heat: heat({ value: 100 }) }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.pValue).toBe(11); // 8 + 3
  });
  it("Weißglut: Hitze-Überlauf über 100 wird zu Score (+10/Punkt)", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_01", "SK_FIRE_07"], heat: heat({ value: 98 }) }), noCrit);
    expect(s.heat.value).toBe(100);
    // Überlauf 4 → +40; Feuer-Score (2 Skills) (6−2)×30 = 120
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + 120 + 40) * 1.02);
  });
  it("Brandmal: Sieg brandmarkt die geschlagene Gegnerkarte (nächster Durchlauf) + Asche", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_13"], heat: heat() }), noCrit);
    expect(s.brandPending[s.lastTrick.oCard.id]).toBe(C.BRAND_VALUE);
    expect(s.ash).toBe(C.BRAND_ASH);
  });
  it("Flächenbrand (Konsument): Sieg ab 80 % Hitze verbrennt die ganze Hitze (+12/Punkt Burst)", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_01", "SK_FIRE_11"], heat: heat({ value: 90 }) }), noCrit);
    expect(s.heat.value).toBe(0);
    expect(s.lastTrick.scoreGain).toBeGreaterThan(B + 1000);
  });
});
