import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, layerValue, layerScore, kristallineBonus, totalLayers, frozenTargetFor, freezeCards, iceSkillCount } from "../src/game/skills.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { computeFormations } from "../src/game/formations.js";

// #269 Eis-Rework — Schichten als Payoff-Engine. Test-Decks:
//   flat(frozen)  → an pos 0 KEINE Formation (Werte 12/11, Farben R/B alternierend) → isoliert die Schicht-Mechanik.
//   rep(v,frozen) → an pos 0 GENAU EINE Formation (Wiederholung: alle Karten Wert v).
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = (frozen = [0]) => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12, frozen: frozen.includes(i) }));
const rep = (v, frozen = [0]) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v, frozen: frozen.includes(i) }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const scen = (deck, oVal, over = {}) => ({ ...initialState(makeRng(1)), deck, oppDeck: oppOf(oVal), playerOrder: identity(), oppOrder: identity(), activeArchetypes: ["ice"], ...over });
const noCrit = () => 0.99;
const tri = (m) => m * (m + 1) / 2;
// Die Engine berechnet Formationen nur bei pos 0 → für pos-1-Tests die Formationen explizit vorberechnen.
const formsOf = (deck, skills = []) => computeFormations(identity(), deck, {}, [], skills, [], {});

const ICE_IDS = [
  "SK_ICE_01", "SK_ICE_02", "SK_ICE_03", "SK_ICE_04", "SK_ICE_05", "SK_ICE_06", "SK_ICE_07",
  "SK_ICE_08", "SK_ICE_09", "SK_ICE_10", "SK_ICE_11", "SK_ICE_12", "SK_ICE_13", "SK_ICE_14",
  "SK_ICE_15", "SK_ICE_16", "SK_ICE_17", "SK_ICE_L01", "SK_ICE_L02", "SK_ICE_L03", "SK_ICE_L04",
];

describe("Eis-Rework #269 — Roster", () => {
  it("21 Eis-Skills: 17 normal + 4 legendär, alle archetype=ice, KEIN Konsument", () => {
    const ice = Object.values(SKILL_DEFS).filter((s) => s.archetype === "ice");
    expect(ice).toHaveLength(21);
    expect(ice.filter((s) => s.legendary)).toHaveLength(4);
    for (const id of ICE_IDS) {
      expect(SKILL_DEFS[id], `${id} fehlt im Registry`).toBeTruthy();
      expect(SKILL_DEFS[id].archetype).toBe("ice");
      expect(SKILL_DEFS[id].heatConsumer).toBeUndefined();
      expect(SKILL_DEFS[id].onFullCharge).toBeUndefined();
    }
  });
});

describe("Eis-Rework #269 — reine Helfer", () => {
  it("layerValue: linear, gedeckelt bei ICE_LAYER_VALUE_CAP", () => {
    expect(layerValue(0)).toBe(0);
    expect(layerValue(3)).toBe(3 * C.ICE_LAYER_VALUE);
    expect(layerValue(C.ICE_LAYER_VALUE_CAP + 5)).toBe(C.ICE_LAYER_VALUE_CAP * C.ICE_LAYER_VALUE); // Deckel
  });
  it("layerScore: DREIECKIG m(m+1)/2 × K, plateaut bei P", () => {
    expect(layerScore(0)).toBe(0);
    expect(layerScore(3)).toBe(tri(3) * C.ICE_LAYER_SCORE_K);
    expect(layerScore(C.ICE_LAYER_SCORE_PLATEAU)).toBe(tri(C.ICE_LAYER_SCORE_PLATEAU) * C.ICE_LAYER_SCORE_K);
    expect(layerScore(C.ICE_LAYER_SCORE_PLATEAU + 10)).toBe(tri(C.ICE_LAYER_SCORE_PLATEAU) * C.ICE_LAYER_SCORE_K); // Plateau
  });
  it("kristallineBonus: skaliert je KRISTALLINE_STEP, gedeckelt", () => {
    expect(kristallineBonus(C.KRISTALLINE_STEP - 1)).toBe(0);
    expect(kristallineBonus(C.KRISTALLINE_STEP * 2)).toBe(2);
    expect(kristallineBonus(C.KRISTALLINE_STEP * (C.KRISTALLINE_MAX_VALUE + 5))).toBe(C.KRISTALLINE_MAX_VALUE); // Deckel
  });
  it("totalLayers / frozenTargetFor / freezeCards (Frostwahl niedrigste)", () => {
    expect(totalLayers({ a: 2, b: 3, c: 0 })).toBe(5);
    expect(frozenTargetFor(["SK_ICE_15"])).toBe(C.ICE_BASE_FREEZE);
    expect(frozenTargetFor(["SK_ICE_01"])).toBe(C.ICE_BASE_FREEZE + C.FROST_GRIP_BONUS);
    const deck = [{ id: "a", value: 8 }, { id: "b", value: 2 }, { id: "c", value: 5 }, { id: "d", value: 1 }];
    expect(freezeCards(deck, 2, () => 0.5, true).filter((c) => c.frozen).map((c) => c.id).sort()).toEqual(["b", "d"]);
  });
});

describe("Eis-Rework #269 — Kern: Motor immer an + dreieckiger Schicht→Score", () => {
  it("Motor IMMER AN: ein Frost-Sieg lagert +1 Schicht ab — AUCH ohne Formation", () => {
    const s = resolveTrick(scen(flat(), 6, { skills: ["SK_ICE_15"], layers: {} }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    expect(s.layers.F0).toBe(C.ICE_WIN_LAYER); // formationslos → nur der Motor-Layer
  });
  it("Formations-Sieg gibt eine BONUS-Schicht obendrauf (Motor + Ablage A)", () => {
    // pos 1 = 2. Karte der Wiederholung → hat den Formations-Mult (positionHasFormation true).
    const deck = rep(12, [1]);
    const s = resolveTrick(scen(deck, 6, { skills: ["SK_ICE_15"], pos: 1, formations: formsOf(deck) }), noCrit);
    expect(s.layers.X1).toBe(C.ICE_WIN_LAYER + C.ICE_ABLAGE_A_LAYER);
  });
  it("Schicht→Score DREIECKIG und DIREKT (iceDirect), aus den Schichten VOR dem Sieg", () => {
    const s = resolveTrick(scen(flat(), 6, { skills: ["SK_ICE_15"], layers: { F0: 5 } }), noCrit);
    expect(s.lastTrick.breakdown.iceDirect).toBeCloseTo(layerScore(5)); // tri(5)*K
    // Plateau: 20 Schichten zahlen wie P
    const sP = resolveTrick(scen(flat(), 6, { skills: ["SK_ICE_15"], layers: { F0: 20 } }), noCrit);
    expect(sP.lastTrick.breakdown.iceDirect).toBeCloseTo(layerScore(C.ICE_LAYER_SCORE_PLATEAU));
  });
  it("Schicht→Dauerwert: gedeckelt bei ICE_LAYER_VALUE_CAP", () => {
    const s = resolveTrick(scen(flat(), 10, { skills: ["SK_ICE_15"], layers: { F0: 3 } }), noCrit);
    expect(s.lastTrick.pValue).toBe(12 + layerValue(3)); // Werte auf pos 0 = 12
  });
  it("Kältereserve: Frostkarte VERLIERT → bankt trotzdem eine Schicht", () => {
    const s = resolveTrick(scen(flat(), 20, { skills: ["SK_ICE_07"] }), noCrit);
    expect(s.lastTrick.result).toBe("loss");
    expect(s.layers.F0).toBe(C.KAELTERESERVE_LAYER);
  });
});

describe("Eis-Rework #269 — Skill-Reworks", () => {
  it("Stillstand (RETUNE): Formations-Frost-Sieg → +Score ∝ Schichten (obendrauf auf den dreieckigen Basis-Score)", () => {
    // pos 1 (in Formation), 4 Schichten. Eisanker (kein Stillstand) = nur der dreieckige Basis-Score; Stillstand +∝.
    const deck = rep(12, [1]), forms = formsOf(deck);
    const base = resolveTrick(scen(deck, 6, { skills: ["SK_ICE_14"], layers: { X1: 4 }, pos: 1, formations: forms }), noCrit).lastTrick.breakdown.iceDirect;
    const still = resolveTrick(scen(deck, 6, { skills: ["SK_ICE_15"], layers: { X1: 4 }, pos: 1, formations: forms }), noCrit).lastTrick.breakdown.iceDirect;
    expect(still - base).toBeCloseTo(4 * C.STILLSTAND_PER_LAYER); // ∝ 4 Schichten
  });
  it("Verschränkung (V-B): je Frost-Sieg zahlt ein Anteil der TIEFSTEN ANDEREN Frostkarte mit (Score)", () => {
    // Siegkarte F0 mit 2 Schichten, tiefste ANDERE Frostkarte F2 mit 8 Schichten.
    const s = resolveTrick(scen(flat([0, 2]), 6, { skills: ["SK_ICE_17"], layers: { F0: 2, F2: 8 } }), noCrit);
    const borrowed = Math.floor(Math.min(8, C.ICE_LAYER_SCORE_PLATEAU) * C.VERSCHRAENKUNG_SHARE);
    expect(s.lastTrick.breakdown.iceDirect).toBeCloseTo(layerScore(2) + borrowed * C.ICE_LAYER_SCORE_K);
  });
  it("Kälteleitung (Kaltfront REWORK): nicht-gefrorene Siegkarte neben Frostkarte leiht Anteil von Score UND Wert", () => {
    // F1 (nicht gefroren) siegt neben F0 (gefroren, 8 Schichten). Leiht KALTFRONT_SHARE von Score + Wert.
    const s = resolveTrick(scen(flat([0]), 6, { skills: ["SK_ICE_06"], layers: { F0: 8 }, pos: 1 }), noCrit);
    expect(s.lastTrick.breakdown.iceDirect).toBeCloseTo(Math.floor(layerScore(8) * C.KALTFRONT_SHARE));
    expect(s.lastTrick.pValue).toBe(11 + Math.floor(layerValue(8) * C.KALTFRONT_SHARE)); // pos 1 Wert = 11
  });
  it("Kristalline Masse (skalierend): je KRISTALLINE_STEP Σ-Schichten alle Frostkarten +1 Wert", () => {
    const layers = { F0: C.KRISTALLINE_STEP * 2, F2: 0 }; // Σ = 2×STEP → +2 Wert
    const s = resolveTrick(scen(flat([0, 2]), 6, { skills: ["SK_ICE_11"], layers }), noCrit);
    // pValue = Basis 12 + Schicht-Dauerwert(min(2*STEP,10)) + Kristalline(2)
    expect(s.lastTrick.pValue).toBe(12 + layerValue(C.KRISTALLINE_STEP * 2) + 2);
  });
  it("Eisblüte (%-Spread): ≥2-Formations-Sieg → gefrorene Nachbarn banken Anteil der Siegkarten-Schichten (min 1)", () => {
    // Deck mit 2 Formationen an pos 0 (Wiederholung + Farbblock: 0,1,2 alle R, alle Wert 12) — Nachbar F1 gefroren.
    const deck = Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: i < 3 ? "R" : ["B", "G", "Y"][i % 3], baseRank: 12, value: 12, frozen: i === 0 || i === 1 }));
    const s = resolveTrick(scen(deck, 6, { skills: ["SK_ICE_16"], layers: { X0: 8, X1: 0 } }), noCrit);
    const spread = Math.max(1, Math.floor(8 * C.EISBLUETE_SHARE));
    expect(s.layers.X1).toBe(0 + spread); // gefrorener Nachbar X1 bankt den Anteil
  });
});

/* Eis-Legendär-Reshape — die ÜBERLAUF-Tiefe (Schichten über dem Plateau) zahlt für Legendär-Halter DIREKT, hart
   gedeckelt. Isoliert: die SIEGKARTE hat 0 Schichten (Basis-Score 0), eine SEPARATE tiefe Frostkarte hält den Überlauf. */
describe("Eis-Legendär-Reshape — Überlauf-Dividende (iceDirect)", () => {
  const commit1 = Math.min(1, 1 / C.SKILL_SLOTS);
  it("generisches Eis (ohne Legendäre): kein iceDirect aus Überlauf-Tiefe (nur der dreieckige Basis-Score)", () => {
    const s = resolveTrick(scen(flat([0, 2]), 6, { skills: ["SK_ICE_15"], layers: { F0: 0, F2: C.ICE_LAYER_MAX + 30 } }), noCrit);
    expect(s.lastTrick.breakdown.iceDirect || 0).toBe(0); // Siegkarte F0 hat 0 Schichten → 0
  });
  it("Gletscher: Überlauf des TIEFSTEN Pfeilers → superlinearer iceDirect (Plateau-gedeckelt)", () => {
    const ov = 8;
    const s = resolveTrick(scen(flat([0, 2]), 6, { skills: ["SK_ICE_L02"], layers: { F0: 0, F2: C.ICE_LAYER_MAX + ov } }), noCrit);
    expect(s.lastTrick.breakdown.iceDirect).toBeCloseTo(tri(ov) * C.GLETSCHER_DIRECT * commit1);
    const cap = C.GLETSCHER_OVERFLOW_CAP;
    const sCap = resolveTrick(scen(flat([0, 2]), 6, { skills: ["SK_ICE_L02"], layers: { F0: 0, F2: C.ICE_LAYER_MAX + cap + 25 } }), noCrit);
    expect(sCap.lastTrick.breakdown.iceDirect).toBeCloseTo(tri(cap) * C.GLETSCHER_DIRECT * commit1);
  });
  it("Permafrost: SUMME der Überlauf-Tiefe → linearer iceDirect", () => {
    const ov = 8;
    const s = resolveTrick(scen(flat([0, 2]), 6, { skills: ["SK_ICE_L01"], layers: { F0: 0, F2: C.ICE_LAYER_MAX + ov } }), noCrit);
    expect(s.lastTrick.breakdown.iceDirect).toBeCloseTo(Math.min(ov, C.PERMAFROST_OVERFLOW_CAP) * C.PERMAFROST_DIRECT * commit1);
  });
  it("Vergletscherung: markiert Gegnerkarten (−Wert ∝ Schichten) + Σ-Debuff-Dividende", () => {
    const mark = resolveTrick(scen(flat(), 6, { skills: ["SK_ICE_L03"], layers: { F0: 4 } }), noCrit);
    expect(Object.values(mark.frostbitePending)).toHaveLength(C.VERGLETSCHERUNG_COUNT);
    expect(Object.values(mark.frostbitePending)[0]).toBe(4 * C.VERGLETSCHERUNG_PER_LAYER);
    const div = resolveTrick(scen(flat(), 6, { skills: ["SK_ICE_L03"], layers: { F0: 0 }, frostbiteActive: { Z1: 5, Z2: 7 } }), noCrit);
    expect(div.lastTrick.breakdown.iceDirect).toBeCloseTo(Math.min(12, C.VERGLETSCHERUNG_DEBUFF_CAP) * C.VERGLETSCHERUNG_DIRECT * commit1);
  });
});

describe("Kristallform — CRYSTAL_OFFSET (Eis-Ceiling-Hebel)", () => {
  const card = (id, suit, value, frozen = false) => ({ id, suit, baseRank: value, value, frozen });
  const order3 = [0, 1, 2];
  const hasWechsel = (forms) => forms.some((p) => (p.formations || []).some((f) => f.type === "wechsel"));
  it("getunter Wert und Beschreibung driftfrei", () => {
    expect(SKILL_DEFS.SK_ICE_12.desc).toContain(`±${C.CRYSTAL_OFFSET} Wert-Flex`);
  });
  it("±1-Flex überbrückt einen Wechsel nur MIT Kristallform", () => {
    const deckA = [card("a", "R", 10), card("b", "B", 6, true), card("c", "Y", 9)];
    expect(hasWechsel(computeFormations(order3, deckA, {}, [], ["SK_ICE_12"], [], {}))).toBe(true);
    expect(hasWechsel(computeFormations(order3, deckA, {}, [], [], [], {}))).toBe(false);
  });
});
