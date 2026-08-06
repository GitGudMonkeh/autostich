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
  it("heatGainFor: über dem Knie √-Schwanz statt hartem Deckel (uncapped, diminishing)", () => {
    const knee = C.HEAT_MARGIN_CAP;
    expect(heatGainFor(knee, [], {})).toBe(knee - 2);                         // am Knie noch linear
    // über dem Knie: (Knie−2) + round(K·√(Marge−Knie)) — mehr als der alte harte Deckel, aber abnehmend.
    const tail = (m) => Math.round((knee - 2) + C.HEAT_MARGIN_TAIL_K * Math.sqrt(m - knee));
    expect(heatGainFor(knee + 4, [], {})).toBe(tail(knee + 4));
    expect(heatGainFor(knee + 8, [], {})).toBe(tail(knee + 8));
    expect(heatGainFor(knee + 8, [], {})).toBeGreaterThan(heatGainFor(knee, [], {})); // hoher Vorsprung generiert weiter Hitze
  });
  it("heatLossFor: Glutbett halbiert / unter 30 % gratis / Deckel", () => {
    expect(heatLossFor(8, [])).toBe(8);
    expect(heatLossFor(8, ["SK_FIRE_04"], 50)).toBe(Math.floor((Math.min(8, C.HEAT_LOSS_MAX) + 50 * C.HEAT_LOSS_PCT) * C.GLUTBETT_MULT)); // (Basis + %-Kühlung) × Glutbett 0,5
    expect(heatLossFor(8, ["SK_FIRE_04"], 20)).toBe(0);   // unter 30 % → kein Verlust
    expect(heatLossFor(20, [])).toBe(C.HEAT_LOSS_MAX);    // Deckel
  });
  it("fireScoreFor: lineare Linie + additiver √-Bonus (Wurzeltiefe-Muster) + Verbrennung(≥8/≥12)", () => {
    // roher Feuer-Score (vor Verbrennung): (Marge−OFFSET)·Basis + Basis·K·√(Marge−OFFSET), uncapped.
    const rawFire = (m, base) => {
      const over = m - C.FIRE_MARGIN_OFFSET;
      return over * base + base * C.FIRE_SCORE_SQRT_K * Math.sqrt(over);
    };
    expect(fireScoreFor(6, ["SK_FIRE_09"], 0)).toBe(Math.round(rawFire(6, 25)));                       // Marge<8 → Verbrennung ×1
    expect(fireScoreFor(10, ["SK_FIRE_09"], 0)).toBe(Math.round(rawFire(10, 25) * C.VERBRENNUNG_T1_MULT));
    expect(fireScoreFor(12, ["SK_FIRE_09"], 0)).toBe(Math.round(rawFire(12, 25) * C.VERBRENNUNG_T2_MULT));
    expect(fireScoreFor(6, ["SK_FIRE_L03"], 100)).toBe(Math.round(rawFire(6, 25)));                    // Sonnenzorn verstärkt den Helfer NICHT mehr
    // √-Bonus hebt den Score strikt über die alte lineare Linie (kein Deckel).
    expect(fireScoreFor(12, ["SK_FIRE_09"], 0)).toBeGreaterThan(Math.round((12 - 2) * 25 * C.VERBRENNUNG_T2_MULT));
    expect(verbrennungMult(7)).toBe(1);
    expect(verbrennungMult(8)).toBe(C.VERBRENNUNG_T1_MULT);
    expect(verbrennungMult(12)).toBe(C.VERBRENNUNG_T2_MULT);
  });
  it("glowingValueFor: Stufen 40/70/100 (reiner Nicht-Legendär-Skill, kein Sonnenzorn-Bonus mehr)", () => {
    expect(glowingValueFor(39, ["SK_FIRE_06"])).toBe(0);
    expect(glowingValueFor(40, ["SK_FIRE_06"])).toBe(1);
    expect(glowingValueFor(70, ["SK_FIRE_06"])).toBe(2);
    expect(glowingValueFor(100, ["SK_FIRE_06"])).toBe(3);
    expect(glowingValueFor(100, ["SK_FIRE_06", "SK_FIRE_L03"])).toBe(3); // Sonnenzorn hebt die Stufe nicht mehr
  });
  it("whiteHeatScore: +10/Punkt (reiner Nicht-Legendär-Skill, kein Sonnenzorn ×2 mehr)", () => {
    expect(whiteHeatScore(3, ["SK_FIRE_07"], 100)).toBe(30);
    expect(whiteHeatScore(3, ["SK_FIRE_07", "SK_FIRE_L03"], 100)).toBe(30);
    expect(whiteHeatScore(3, [], 100)).toBe(0); // ohne Weißglut
  });
  it("forgeCostFor: FORGE_COST, Schmelzofen-Rabatt als Faktor ab 50 % (#268)", () => {
    expect(forgeCostFor(["SK_FIRE_15"], 0)).toBe(C.FORGE_COST);
    // #268: Rabatt ist ein FAKTOR (−25 %), skaliert mit den Kosten (20 → 15), ganzzahlig gerundet.
    expect(forgeCostFor(["SK_FIRE_15", "SK_FIRE_17"], 60)).toBe(Math.round(C.FORGE_COST * (1 - C.SCHMELZOFEN_FORGE_DISCOUNT)));
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
    // Feuer-Score (lineare Linie + √-Bonus) in der multiplizierten Basis + Glutdividende (direkt, Hitze × Satz × Feuer-Bekenntnis 1/6).
    const fs1 = Math.round((6 - 2) * 25 + 25 * C.FIRE_SCORE_SQRT_K * Math.sqrt(6 - 2));
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + fs1) * 1.02 + Math.min(s.heat.value, C.FIRE_DIVIDEND_HEAT_CAP) * C.FIRE_HEAT_DIVIDEND * Math.min(1, 1 / C.SKILL_SLOTS));
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
    // Überlauf 4 → +40; Feuer-Score (2 Skills, Basis 30) = lineare Linie + √-Bonus; + Glutdividende (direkt, Hitze × Satz × Bekenntnis 2/6).
    const fs2 = Math.round((6 - 2) * 30 + 30 * C.FIRE_SCORE_SQRT_K * Math.sqrt(6 - 2));
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + fs2 + 40) * 1.02 + Math.min(s.heat.value, C.FIRE_DIVIDEND_HEAT_CAP) * C.FIRE_HEAT_DIVIDEND * Math.min(1, 2 / C.SKILL_SLOTS));
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
  // #268 Asche-Ökonomie: einen vollen Durchlauf (40 Stiche) spielen → am Durchlauf-Ende greift die Ascheschmiede.
  const playCycle = (s) => { let g = 0; while (s.cycle === 0 && g++ < 100) s = resolveTrick(s, noCrit); return s; };
  it("#268 Ascheschmiede: Kosten 20 / Value 3 — floor(Asche/Kosten) Schmiedungen je Durchlauf-Ende, Rest-Asche bleibt", () => {
    // 45 gebankte Asche, leere Schmiede, kein Brand (Asche wächst im Durchlauf nicht) → 45/20 = 2 Schmiedungen, Rest 5.
    const s = playCycle(scen(12, 0, { skills: ["SK_FIRE_15"], heat: heat({ value: 0 }), ash: 45 }));
    expect(s.ash).toBe(45 - 2 * C.FORGE_COST);                 // 5 < Kosten → bleibt liegen (banken)
    expect(Object.keys(s.forged)).toHaveLength(2);             // zwei verschiedene (die je aktuell niedrigsten) Karten
    expect(Object.values(s.forged).every((v) => v === C.FORGE_VALUE)).toBe(true); // je +3 Dauerwert
    expect(s.deck.find((c) => c.id === "X0").value).toBe(12 + C.FORGE_VALUE);
  });
  it("#268 Weißglut-Überlauf: bei voller Schmiede-Kapazität wird Rest-Asche in Score-Häppchen verbrannt (Asche < Kosten)", () => {
    // Kapazität voll: alle FORGE_MAX_CARDS Karten am Per-Karte-Deckel → keine Schmiedung mehr → Stufe 2 (Weißglut).
    const forged = {}; for (let i = 0; i < C.FORGE_MAX_CARDS; i++) forged[`X${i}`] = C.FORGE_MAX_PER_CARD;
    const s = playCycle(scen(12, 0, { skills: ["SK_FIRE_15"], heat: heat({ value: 0 }), ash: 50, forged: { ...forged } }));
    expect(s.ash).toBe(50 - 2 * C.FORGE_COST);                 // 2 Portionen à 20 verbrannt → 10 < Kosten
    expect(Object.keys(s.forged)).toHaveLength(C.FORGE_MAX_CARDS); // keine NEUE Karte geschmiedet (Kapazität voll)
    // Der Weißglut-Burst (2 × FORGE_OVERFLOW_SCORE) steckt im Durchlauf-Score des letzten Stichs.
    expect(s.lastCycleScore).toBeGreaterThanOrEqual(2 * C.FORGE_OVERFLOW_SCORE);
  });
});
