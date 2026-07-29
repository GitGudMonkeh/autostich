import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, isGreen, greenCount, growthRipe, plantSkillCount, ARCHETYPE_ORDER } from "../src/game/skills.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialState, reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { computeFormations } from "../src/game/formations.js";

/* Pflanze-Fraktion (v0, 4. Fraktion) — Registrierung + reine Helfer + Engine-Integration.
   Wachstum (nur steigend) → Reife (grün, card.green) → Farbblock → Score. Wert-Deckel 11. */
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const scen = (pVal, oVal, over = {}) => ({ ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal), playerOrder: identity(), oppOrder: identity(), activeArchetypes: ["plant"], ...over });
const green0 = (v) => constDeck(v).map((c, i) => (i === 0 ? { ...c, green: true } : c));
const noCrit = () => 0.99;
const B = C.SCORE_PER_WIN;
const PLANT_IDS = [
  "SK_PLANT_01", "SK_PLANT_02", "SK_PLANT_03", "SK_PLANT_04", "SK_PLANT_05", "SK_PLANT_06", "SK_PLANT_07",
  "SK_PLANT_08", "SK_PLANT_09", "SK_PLANT_10", "SK_PLANT_11", "SK_PLANT_12", "SK_PLANT_13", "SK_PLANT_14",
  "SK_PLANT_15", "SK_PLANT_16", "SK_PLANT_17", "SK_PLANT_L01", "SK_PLANT_L02", "SK_PLANT_L03", "SK_PLANT_L04",
];

describe("Pflanze-Fraktion v0 — Roster + Verdrahtung", () => {
  it("21 Pflanze-Skills: 17 normal + 4 legendär, alle archetype=plant, alle registriert", () => {
    const plant = Object.values(SKILL_DEFS).filter((s) => s.archetype === "plant");
    expect(plant).toHaveLength(21);
    expect(plant.filter((s) => s.legendary)).toHaveLength(4);
    for (const id of PLANT_IDS) {
      expect(SKILL_DEFS[id], `${id} fehlt im Registry`).toBeTruthy();
      expect(SKILL_DEFS[id].archetype).toBe("plant");
    }
  });
  it("4. Archetyp verdrahtet (ARCHETYPE_ORDER enthält plant)", () => {
    expect(ARCHETYPE_ORDER).toContain("plant");
    expect(plantSkillCount(["SK_PLANT_02", "SK_PLANT_05"])).toBe(2);
  });
});

describe("Pflanze-Fraktion v0 — reine Helfer", () => {
  it("isGreen/greenCount: Grün ist ein Karten-Flag (card.green)", () => {
    expect(isGreen({ green: true })).toBe(true);
    expect(isGreen({})).toBe(false);
    expect(greenCount([{ green: true }, {}, { green: true }])).toBe(2);
  });
  it("growthRipe: Reife ab der Wachstums-Schwelle", () => {
    expect(growthRipe(C.PLANT_GREEN_THRESHOLD - 1)).toBe(false);
    expect(growthRipe(C.PLANT_GREEN_THRESHOLD)).toBe(true);
  });
});

describe("Pflanze-Fraktion v0 — Engine-Integration", () => {
  it("Wachstum: Sieg → +1; an der Reife-Schwelle wird die Karte grün", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_PLANT_05"], growth: { X0: C.PLANT_GREEN_THRESHOLD - 1 } }), noCrit);
    expect(s.growth.X0).toBe(C.PLANT_GREEN_THRESHOLD);
    expect(s.deck[0].green).toBe(true);
  });
  it("Wurzeltiefe: Sieg einer grünen Karte gibt Wurzeln-Score (Flat)", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_PLANT_02"], deck: green0(12), growth: { X0: 4 } }), noCrit);
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + C.WURZELTIEFE_SCORE) * 1.02);
  });
  it("Aussaat: Sieg einer grünen Karte sät den (rechten) Nachbarn (+Wachstum)", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_PLANT_05"], deck: green0(12) }), noCrit);
    expect(s.growth.X1).toBe(C.AUSSAAT_GROWTH);
  });
  it("Ranken: Sieg einer grünen Karte färbt einen grauen Nachbarn grün", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_PLANT_09"], deck: green0(12) }), noCrit);
    expect(s.deck[1].green).toBe(true);
  });
  it("Ausläufer: Sieg einer grünen Karte kolonisiert eine Gegnerkarte", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_PLANT_15"], deck: green0(12) }), noCrit);
    expect(Object.keys(s.colonized)).toHaveLength(1);
  });
  it("Grün → Farbblock: 3 benachbarte grüne Karten bilden einen Farbblock (effSuit G)", () => {
    const deck = constDeck(5).map((c, i) => (i < 3 ? { ...c, green: true } : c));
    const forms = computeFormations(identity(), deck, {}, [], ["SK_PLANT_12"], [], {});
    const hasFarbblock = forms.some((f) => (f.formations || []).some((x) => x.type === "farbblock"));
    expect(hasFarbblock).toBe(true);
  });
});

describe("Pflanze-Fraktion v0 — Aktivierung (Alter Anker)", () => {
  it("erster Pflanze-Skill → 1 Karte startet reif (grün, Wert 11)", () => {
    const base = initialState(makeRng(1));
    const st = { ...base, phase: "levelup", skillOffer: ["SK_PLANT_02"], skills: [], activeArchetypes: [] };
    const s = reducer(st, { type: "PICK_SKILL", skillId: "SK_PLANT_02", rng: makeRng(1) });
    expect(s.activeArchetypes).toContain("plant");
    const green = s.deck.filter((c) => c.green);
    expect(green.length).toBeGreaterThanOrEqual(1);
    expect(green[0].value).toBe(C.PLANT_ANCHOR_VALUE);
  });
});
