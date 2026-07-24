import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState, reducer } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import {
  initHeat, heatMaxFor, heatConsumerOf, heatConsumerCount, activeFireCount, fireFlag,
  heatGainFor, heatLossFor, fireScoreFor,
} from "../src/game/skills.js";

// Feuer-Skill-IDs (Flags siehe skills.js): F1 Glut · F2 Brennstoff · F3 Brandbeschleuniger · F4 Hitzeschild
// F5 Nachglut · F6 Glühende Klinge · F7 Verbrennung · F8 Feuerwalze · F9 Flächenbrand · F10 Schmelzpunkt
// F11 Sonnenkern · F12 Phönixfeuer.
const F1 = "SK_FIRE_01", F2 = "SK_FIRE_02", F3 = "SK_FIRE_03", F4 = "SK_FIRE_04",
  F5 = "SK_FIRE_05", F6 = "SK_FIRE_06", F7 = "SK_FIRE_07", F8 = "SK_FIRE_08",
  F9 = "SK_FIRE_09", F10 = "SK_FIRE_10", F11 = "SK_FIRE_11", F12 = "SK_FIRE_12";

describe("Feuer — reine Helfer (#93 F1)", () => {
  it("heatGainFor: Basis (min(Vorsprung,8)−2)×1, Mindestvorsprung 3, sonst 0 (#121)", () => {
    expect(heatGainFor(2, [F4], 5)).toBe(0);    // Vorsprung < 3
    expect(heatGainFor(3, [F4], 5)).toBe(1);    // (3−2)×1
    expect(heatGainFor(8, [F4], 5)).toBe(6);    // (8−2)×1
  });
  it("heatGainFor: effektiver Vorsprung ist bei 8 gedeckelt (#121 Late-Game-Runaway)", () => {
    expect(heatGainFor(20, [F4], 5)).toBe(6);   // min(20,8)=8 → wie Vorsprung 8, kein Runaway
    expect(heatGainFor(20, [F1], 5)).toBe(9);   // 6 ×1,5 → nur ~9 % statt früher ~54 %
  });
  it("heatGainFor: Glut ×1,5, Brennstoff +5 (Wert≥8), Brandbeschleuniger +10 (Vorsprung≥10) (#121)", () => {
    expect(heatGainFor(12, [F1], 5)).toBe(9);   // (8−2)×1 = 6, ×1,5 → 9
    expect(heatGainFor(12, [F2], 8)).toBe(11);  // 6 + 5 (Wert 8 ≥ 8)
    expect(heatGainFor(12, [F2], 7)).toBe(6);   // Wert < 8 → kein Bonus
    expect(heatGainFor(12, [F3], 5)).toBe(16);  // 6 + 10 (Vorsprung 12 ≥ 10, gedeckelte Basis)
    expect(heatGainFor(9, [F3], 5)).toBe(6);    // (min(9,8)−2)×1 = 6, Vorsprung < 10 → kein Accel
  });
  it("heatLossFor: min(Rückstand,10); Nachglut→0; Hitzeschild halbiert (abgerundet)", () => {
    expect(heatLossFor(5, [], false)).toBe(5);
    expect(heatLossFor(20, [], false)).toBe(10);   // Cap 10
    expect(heatLossFor(20, [], true)).toBe(0);     // Nachglut fängt ab
    expect(heatLossFor(5, [F4], false)).toBe(2);   // Hitzeschild floor(5/2)
    expect(heatLossFor(20, [F4], false)).toBe(5);  // floor(10/2)
  });
  it("fireScoreFor: (Vorsprung−2)×(25 + 5×(n−1) + Verbrennung 10); 0 ohne Feuer-Skill / Vorsprung<3", () => {
    expect(fireScoreFor(12, [])).toBe(0);          // kein Feuer-Skill
    expect(fireScoreFor(2, [F4])).toBe(0);         // Vorsprung < 3
    expect(fireScoreFor(12, [F4])).toBe(250);      // 10 × 25 (1 Skill)
    expect(fireScoreFor(12, [F4, F1])).toBe(300);  // 10 × 30 (2 Skills)
    expect(fireScoreFor(12, [F7])).toBe(350);      // 10 × (25 + Verbrennung 10)
  });
  it("heatMaxFor / heatConsumerOf / heatConsumerCount / activeFireCount / fireFlag", () => {
    expect(heatMaxFor([F4])).toBe(100);
    expect(heatMaxFor([F11])).toBe(150);           // Sonnenkern
    expect(heatConsumerOf([F4])).toBe(null);
    expect(heatConsumerOf([F9])).toBe("conflagration");
    expect(heatConsumerOf([F10])).toBe("melt");
    expect(heatConsumerCount([F9, F10])).toBe(2);
    expect(heatConsumerCount([F9, F4])).toBe(1);
    expect(activeFireCount([F1, F4, "SK_LIGHTNING_01"])).toBe(2); // nur Feuer zählt
    expect(fireFlag([F1], "emberBoost")).toBe(true);
    expect(fireFlag([F4], "emberBoost")).toBe(false);
  });
  it("initHeat: inert (active:false), Standardmaximum 100", () => {
    expect(initHeat()).toMatchObject({ active: false, value: 0, max: 100, afterglowArmed: false, fireRoll: 0 });
  });
});

// --- Engine-Integration: konstante Decks (pos 0 → Formations-Mult 1, streakBaseMult(1)=1,02) ---
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
function scen(pVal, oVal, over = {}) {
  return { ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal),
    playerOrder: identity(), oppOrder: identity(), ...over };
}
const rng = makeRng(9);
const heat = (over = {}) => ({ ...initHeat(), active: true, ...over });

describe("Feuer — Engine-Integration (#93 F1)", () => {
  it("ohne Feuer bleibt heat null (inert)", () => {
    expect(resolveTrick(scen(12, 0, { skills: [] }), rng).heat).toBeNull();
  });
  it("Sieg: Hitzegewinn (min(Vorsprung,8)−2)×1 und Feuer-Flat-Score in der multiplizierten Basis (#121)", () => {
    const s = resolveTrick(scen(12, 0, { skills: [F4], heat: heat() }), rng);
    expect(s.heat.value).toBe(6);                        // (min(12,8)−2)×1 — Feuer-Flat-Score bleibt unverändert
    expect(s.lastTrick.breakdown.flats).toBe(250);        // Feuer-Flat 10×25
    expect(s.lastTrick.gained).toBeCloseTo(350 * 1.02);   // (100 + 250) × streakBaseMult(1)
  });
  it("Niederlage: Hitzeverlust = min(Rückstand,10)", () => {
    expect(resolveTrick(scen(0, 12, { skills: [F7], heat: heat({ value: 50 }) }), rng).heat.value).toBe(40);
  });
  it("Nachglut: armierte Niederlage 0 Verlust, danach entschärft", () => {
    const s = resolveTrick(scen(0, 12, { skills: [F5], heat: heat({ value: 50, afterglowArmed: true }) }), rng);
    expect(s.heat.value).toBe(50);
    expect(s.heat.afterglowArmed).toBe(false);
  });
  it("Nachglut: Sieg armiert die nächste Niederlage", () => {
    expect(resolveTrick(scen(12, 0, { skills: [F5], heat: heat() }), rng).heat.afterglowArmed).toBe(true);
  });
  it("Flächenbrand: Sieg bei voller Hitze → +1000 Score, verbraucht exakt 100", () => {
    const s = resolveTrick(scen(12, 0, { skills: [F9], heat: heat({ value: 100 }) }), rng);
    expect(s.heat.value).toBe(0);                         // 100 (+6 Gewinn, gedeckelt 100) − 100 verbraucht
    expect(s.lastTrick.breakdown.flats).toBe(1250);       // Feuer-Flat 250 + Flächenbrand 1000
  });
  it("Glühende Klinge: ab 50 % Hitze +2 Kartenwert (kippt eine knappe Niederlage zum Sieg)", () => {
    const s = resolveTrick(scen(12, 13, { skills: [F6], heat: heat({ value: 50 }) }), rng);
    expect(s.lastTrick.pValue).toBe(14);
    expect(s.lastTrick.result).toBe("win");
  });
  it("Glühende Klinge: unter 50 % Hitze kein Bonus", () => {
    const s = resolveTrick(scen(12, 13, { skills: [F6], heat: heat({ value: 49 }) }), rng);
    expect(s.lastTrick.pValue).toBe(12);
    expect(s.lastTrick.result).toBe("loss");
  });
  it("Schmelzpunkt: −10 Hitze vor dem Stich, dafür +3 Kartenwert", () => {
    const s = resolveTrick(scen(12, 14, { skills: [F10], heat: heat({ value: 50 }) }), rng);
    expect(s.lastTrick.pValue).toBe(15);                 // 12 + 3
    expect(s.heat.value).toBe(40);                        // 50 − 10 (Vorsprung 1 < 3 → kein Gewinn)
  });
  it("Feuerwalze: Stapel wirkt auf die Karte, Sieg erhöht ihn, Niederlage setzt zurück", () => {
    const win = resolveTrick(scen(12, 0, { skills: [F8], heat: heat({ fireRoll: 2 }) }), rng);
    expect(win.lastTrick.pValue).toBe(14);               // 12 + Stapel 2
    expect(win.heat.fireRoll).toBe(3);                    // Sieg → +1
    const lose = resolveTrick(scen(0, 12, { skills: [F8], heat: heat({ fireRoll: 4 }) }), rng);
    expect(lose.heat.fireRoll).toBe(0);                   // Niederlage → zurück
  });
  it("Feuerwalze: Stapel bei +5 gedeckelt", () => {
    expect(resolveTrick(scen(12, 0, { skills: [F8], heat: heat({ fireRoll: 5 }) }), rng).heat.fireRoll).toBe(5);
  });
  it("Sonnenkern: Hitze darf über 100 bis 150 steigen (Rest bleibt, Cap 150)", () => {
    const s = resolveTrick(scen(52, 0, { skills: [F11], heat: heat({ value: 148, max: 150 }) }), rng);
    expect(s.heat.max).toBe(150);
    expect(s.heat.value).toBe(150);                       // 148 + Gewinn 6 → 154, gedeckelt 150 (Überschuss über 100 bleibt)
  });
  it("Phönixfeuer: Schmelzpunkt armiert Phönix; nächster Stich +10, dann entschärft", () => {
    const a = resolveTrick(scen(12, 0, { skills: [F10, F12], heat: heat({ value: 30 }) }), rng);
    expect(a.heat.phoenixArmed).toBe(true);              // Schmelzpunkt löste aus → armiert
    // Hitze 5 < 10 → Schmelzpunkt feuert nicht (re-armt nicht); Phönix gibt +10
    const b = resolveTrick(scen(5, 12, { skills: [F10, F12], heat: heat({ value: 5, phoenixArmed: true }) }), rng);
    expect(b.lastTrick.pValue).toBe(15);                 // 5 + Phönix 10
    expect(b.heat.phoenixArmed).toBe(false);
  });
});

describe("Feuer — Reducer-Aktivierung (#93 F1)", () => {
  const skillState = (over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", skillOffer: [F4], ...over });
  it("PICK_SKILL aktiviert den Feuer-Archetyp und initialisiert die Hitzeleiste", () => {
    const s = reducer(skillState(), { type: "PICK_SKILL", skillId: F4, rng });
    expect(s.skills).toEqual([F4]);
    expect(s.activeArchetypes).toEqual(["fire"]);
    expect(s.heat).toMatchObject({ active: true, value: 0, max: 100 });
    expect(s.phase).toBe("play");
  });
  it("Sonnenkern hebt das Hitzemaximum bei Aktivierung auf 150", () => {
    const s = reducer(skillState({ skillOffer: [F11] }), { type: "PICK_SKILL", skillId: F11, rng });
    expect(s.heat.max).toBe(150);
  });
  it("blockt einen zweiten Hitze-Konsument, erlaubt aber das Ersetzen des bestehenden", () => {
    // Flächenbrand gehalten, freier Slot → Schmelzpunkt wäre der 2. Konsument → no-op.
    const withConf = skillState({ skills: [F9], activeArchetypes: ["fire"], heat: heat(), skillOffer: [F10] });
    expect(reducer(withConf, { type: "PICK_SKILL", skillId: F10, rng })).toBe(withConf);
    // volle Slots, replaceId = Flächenbrand → erlaubt (bleibt bei genau 1 Konsument).
    const full = skillState({ skills: [F9, F1, F4, F7], activeArchetypes: ["fire"], heat: heat(), skillOffer: [F10] });
    const s = reducer(full, { type: "PICK_SKILL", skillId: F10, replaceId: F9, rng });
    expect(s.skills).toContain(F10);
    expect(s.skills).not.toContain(F9);
  });
});
