import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState, reducer } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import {
  maxChargeFor, lightningCritMult, chargeConsumerCount, chargeConsumerOf,
  hasStaticCharge, hasConductivity, hasEndlessStorm, hasDischarge, hasThunderGod,
} from "../src/game/skills.js";

// Blitz-Skill-IDs (F2): 01 Blitzableiter · 02 Ionisierung(K) · 05 Reststrom · 07 Geladene Serie(K)
// 08 Statische Aufladung · 09 Leitfähigkeit · 10 Entladung · L01 Donnergott · L02 Endloser Sturm.
const BLITZ = "SK_LIGHTNING_01", ION = "SK_LIGHTNING_02", REST = "SK_LIGHTNING_05", PROT = "SK_LIGHTNING_07",
  STATIC = "SK_LIGHTNING_08", COND = "SK_LIGHTNING_09", DISCH = "SK_LIGHTNING_10",
  THUNDER = "SK_LIGHTNING_L01", STORM = "SK_LIGHTNING_L02";

describe("Blitz-Rework — reine Helfer (#93 F2)", () => {
  it("maxChargeFor / lightningCritMult: Donnergott hebt Max auf 15 und Crit-Mult um 1,0", () => {
    expect(maxChargeFor([])).toBe(10);
    expect(maxChargeFor([THUNDER])).toBe(15);
    expect(lightningCritMult([])).toBe(0);
    expect(lightningCritMult([THUNDER])).toBe(1.0);
  });
  it("chargeConsumerCount / chargeConsumerOf: nur Ionisierung & Geladene Serie sind Ladungs-Konsumenten", () => {
    expect(chargeConsumerCount([ION, PROT])).toBe(2);
    expect(chargeConsumerCount([ION, BLITZ])).toBe(1);
    expect(chargeConsumerCount(["SK_LIGHTNING_03"])).toBe(0); // Kettenblitz ist kein Konsument
    expect(chargeConsumerOf([PROT])).toBe("protectStreak");
    expect(chargeConsumerOf([ION])).toBe("ionize");
    expect(chargeConsumerOf([BLITZ])).toBe(null);
  });
  it("Flag-Prädikate der neuen Skills", () => {
    expect(hasStaticCharge([STATIC])).toBe(true);
    expect(hasConductivity([COND])).toBe(true);
    expect(hasEndlessStorm([STORM])).toBe(true);
    expect(hasDischarge([DISCH])).toBe(true);
    expect(hasThunderGod([THUNDER])).toBe(true);
    expect(hasStaticCharge([BLITZ])).toBe(false);
  });
});

// --- Engine-Integration: konstante Decks (pos 0 → Formations-Mult 1) ---
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
function scen(pVal, oVal, over = {}) {
  return { ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal),
    playerOrder: identity(), oppOrder: identity(), ...over };
}
const rng = makeRng(9);
const noCrit = () => 0.99; // > jeder kleinen Blitz-Crit-Chance → kein Crit
const light = (over = {}) => ({ active: true, charge: 0, maxCharge: 10, armed: false, stormCritBonus: 0, stormScoreWinsRemaining: 0, dischargeArmed: false, ...over });

describe("Blitz-Rework — Engine (#93 F2)", () => {
  it("Statische Aufladung: Sieg OHNE Crit erzeugt 1 Ladung", () => {
    const s = resolveTrick(scen(12, 0, { skills: [STATIC], lightning: light({ charge: 3 }) }), noCrit);
    expect(s.lastTrick.isCrit).toBe(false);
    expect(s.lightning.charge).toBe(4);
  });
  it("Statische Aufladung: Sieg MIT Crit nutzt die Crit-Ladung, stapelt nicht mit der statischen", () => {
    const s = resolveTrick(scen(12, 0, { statCritChance: 1, skills: [STATIC], lightning: light({ charge: 3 }) }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(4); // nur Crit-Basis +1
  });
  it("Leitfähigkeit: Crit neben ionisierter Karte gibt 2 zusätzliche Ladungen", () => {
    const deck = constDeck(12).map((c, i) => (i === 1 ? { ...c, ionStacks: 1 } : c)); // Nachbar (pos+1) ionisiert
    const s = resolveTrick(scen(12, 0, { deck, statCritChance: 1, skills: [COND], lightning: light() }), rng);
    expect(s.lightning.charge).toBe(3); // Basis 1 + Leitfähigkeit 2
  });
  it("Leitfähigkeit: ohne ionisierten Nachbarn nur die Basis-Ladung", () => {
    const s = resolveTrick(scen(12, 0, { statCritChance: 1, skills: [COND], lightning: light() }), rng);
    expect(s.lightning.charge).toBe(1);
  });
  it("#145 Leitfähigkeit unter Zeitsegment: Nachbar über actualPos statt pos", () => {
    // Zeitsegment 0 (Tier 4) → Segment 0–4 wird wiederholt, seq hat 45 Einträge; bei Stich pos=40 ist
    // actualPos=35. Der ionisierte Nachbar sitzt auf actualPos+1 (deck[36]). Der alte Bug las playerOrder[pos+1]
    // = playerOrder[41] = undefined → Bonus fiel stumm aus. Der Fix findet den Nachbarn über actualPos.
    const deck = constDeck(12).map((c, i) => (i === 36 ? { ...c, ionStacks: 1 } : c));
    const s0 = scen(12, 0, { deck, statCritChance: 1, skills: [COND], lightning: light() });
    s0.shop = { ...s0.shop, timeSegmentIndex: 0, timeSegmentTier: 4 };
    s0.pos = 40; // Post-Wiederholung: pos 40 → actualPos 35 (pos+1 läuft ins Leere)
    const s = resolveTrick(s0, rng);
    expect(s.lastTrick.originalPosition).toBe(35); // actualPos korrekt gemappt
    expect(s.lightning.charge).toBe(3);            // Basis 1 + Leitfähigkeit 2 (nur über actualPos gefunden)
  });
  it("Donnergott: +1,0× Crit-Multiplikator (Basis 1,5 → 2,5)", () => {
    const base = resolveTrick(scen(12, 0, { statCritChance: 1, skills: [BLITZ], lightning: light() }), rng);
    const thunder = resolveTrick(scen(12, 0, { statCritChance: 1, skills: [THUNDER], lightning: light({ maxCharge: 15 }) }), rng);
    expect(base.lastTrick.critMultiplier).toBeCloseTo(1.5);
    expect(thunder.lastTrick.critMultiplier).toBeCloseTo(2.5);
  });
  it("Entladung: nach vollem Verbrauch armiert; der nächste Crit zahlt +500, dann entschärft", () => {
    // Stich A: volle Ladung + Crit → Ionisierung verbraucht → dischargeArmed
    const a = resolveTrick(scen(12, 0, { statCritChance: 1, skills: [ION, DISCH], lightning: light({ charge: 10 }) }), rng);
    expect(a.lightning.dischargeArmed).toBe(true);
    // Stich B: armiert + Crit → +500 in den Flats, danach entschärft
    const b = resolveTrick(scen(12, 0, { statCritChance: 1, skills: [ION, DISCH], lightning: light({ charge: 0, dischargeArmed: true }) }), rng);
    expect(b.lastTrick.breakdown.flats).toBe(500);
    expect(b.lightning.dischargeArmed).toBe(false);
  });
  it("Endloser Sturm: nach vollem Verbrauch springt die Ladung auf 50 % des Max (aufgerundet)", () => {
    const s = resolveTrick(scen(12, 0, { statCritChance: 1, skills: [ION, STORM], lightning: light({ charge: 10 }) }), rng);
    expect(s.lightning.charge).toBe(5); // ceil(10/2)
  });
  it("Endloser Sturm + Reststrom: der höhere resultierende Stand gilt (nicht additiv)", () => {
    const s = resolveTrick(scen(12, 0, { statCritChance: 1, skills: [ION, REST, STORM], lightning: light({ charge: 10 }) }), rng);
    expect(s.lightning.charge).toBe(5); // max(Reststrom 3, Sturm 5)
  });
  it("Endloser Sturm bei Max 15 (Donnergott) → 8", () => {
    const s = resolveTrick(scen(12, 0, { statCritChance: 1, skills: [ION, THUNDER, STORM], lightning: light({ charge: 15, maxCharge: 15 }) }), rng);
    expect(s.lightning.charge).toBe(8); // ceil(15/2)
  });
  it("Donnergott: Konsument löst erst bei 15 aus, nicht schon bei 10", () => {
    // Ladung 10 (< Max 15) + Crit → +1 = 11, kein Verbrauch → Serie noch nicht geschützt
    const s = resolveTrick(scen(12, 0, { statCritChance: 1, skills: [PROT, THUNDER], lightning: light({ charge: 10, maxCharge: 15 }) }), rng);
    expect(s.lightning.charge).toBe(11);
    expect(s.lightning.armed).toBe(false);
  });
});

describe("Blitz-Rework — Reducer-Konsumenten (#93 F2)", () => {
  const skillState = (over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", skillOffer: [BLITZ], ...over });
  const activeLight = { active: true, charge: 0, maxCharge: 10, armed: false, stormCritBonus: 0, stormScoreWinsRemaining: 0, dischargeArmed: false };

  it("Donnergott-Pick aktiviert Blitz und hebt das Ladungsmaximum auf 15", () => {
    const s = reducer(skillState({ skillOffer: [THUNDER] }), { type: "PICK_SKILL", skillId: THUNDER, rng });
    expect(s.lightning.active).toBe(true);
    expect(s.lightning.maxCharge).toBe(15);
  });
  it("blockt einen zweiten Ladungs-Konsument, erlaubt aber das Ersetzen des bestehenden", () => {
    // Ionisierung gehalten, freier Slot → Geladene Serie wäre 2. Konsument → no-op.
    const withIon = skillState({ skills: [ION], activeArchetypes: ["lightning"], lightning: activeLight, skillOffer: [PROT] });
    expect(reducer(withIon, { type: "PICK_SKILL", skillId: PROT, rng })).toBe(withIon);
    // volle Slots, replaceId = Ionisierung → erlaubt (bleibt bei genau 1 Konsument).
    const full = skillState({ skills: [ION, BLITZ, "SK_LIGHTNING_04", REST], activeArchetypes: ["lightning"], lightning: activeLight, skillOffer: [PROT] });
    const s = reducer(full, { type: "PICK_SKILL", skillId: PROT, replaceId: ION, rng });
    expect(s.skills).toContain(PROT);
    expect(s.skills).not.toContain(ION);
  });
  it("gezieltes Ersetzen greift auch bei freiem Slot (Konsumenten-Dialog #93)", () => {
    // Ionisierung gehalten, freie Slots da; replaceId = Ionisierung → Geladene Serie ERSETZT sie (kein 2. Konsument).
    const withIon = skillState({ skills: [ION], activeArchetypes: ["lightning"], lightning: activeLight, skillOffer: [PROT] });
    const s = reducer(withIon, { type: "PICK_SKILL", skillId: PROT, replaceId: ION, rng });
    expect(s.skills).toEqual([PROT]);
  });
});
