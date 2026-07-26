import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { ionizeCards, ionizeCardsWithCatch, hasBlitzcatcher, hasVoltageArc, initHeat, heatLossFor, fireScoreFor } from "../src/game/skills.js";
import { ION_MAX_STACKS } from "../src/game/constants.js";

/* ============================================================
   #165 Skills (Spec §5) — je Archetyp +2 neue Skills + Balance-Änderungen.
   KEIN Raritätssystem für Skills. Ionisierung stapelt max 5.
   ============================================================ */

// --- Test-Helfer (konstante Decks; pos 0 → Formations-Mult 1) ---
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
function scen(pVal, oVal, over = {}) {
  return { ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal),
    playerOrder: identity(), oppOrder: identity(), ...over };
}
const noCrit = () => 0.99; // > jeder kleinen Blitz-Crit-Chance → kein Crit
const zero = () => 0;      // < jeder Crit-Chance → Crit; picks index 0 aus Pools
const light = (over = {}) => ({ active: true, charge: 0, maxCharge: 10, armed: false, stormCritBonus: 0, stormScoreWinsRemaining: 0, dischargeArmed: false, ...over });
const ION = "SK_LIGHTNING_02", CATCHER = "SK_LIGHTNING_11", ARC = "SK_LIGHTNING_12";

describe("#165 Blitz — Ionisierungs-Cap 5", () => {
  it("Cap ist 5 (Spec §5.1)", () => { expect(ION_MAX_STACKS).toBe(5); });

  it("Sieg mit ionisierter Karte: 4 → 5 Stapel (nicht mehr bei 4 gedeckelt)", () => {
    const deck = constDeck(12).map((c, i) => (i === 0 ? { ...c, ionStacks: 4 } : c));
    const s = resolveTrick(scen(12, 0, { skills: [ION], deck, lightning: light() }), noCrit);
    expect(s.deck[0].ionStacks).toBe(5);
  });
  it("Sieg mit voller (5) Karte: bleibt 5", () => {
    const deck = constDeck(12).map((c, i) => (i === 0 ? { ...c, ionStacks: 5 } : c));
    const s = resolveTrick(scen(12, 0, { skills: [ION], deck, lightning: light() }), noCrit);
    expect(s.deck[0].ionStacks).toBe(5);
  });
});

describe("#165 Blitz — Blitzfänger (SK_LIGHTNING_11)", () => {
  it("Flag-Prädikat", () => {
    expect(hasBlitzcatcher([CATCHER])).toBe(true);
    expect(hasBlitzcatcher([ION])).toBe(false);
  });
  it("ionizeCardsWithCatch: volle Karte wird nicht ionisiert, sondern gefangen", () => {
    const deck = [{ id: "A", ionStacks: 5 }, { id: "B", ionStacks: 0 }];
    const res = ionizeCardsWithCatch(deck, [0], 1, makeRng(1)); // Einziel-Pool → deterministisch
    expect(res.catchIds).toEqual(["A"]);
    expect(res.deck[0].ionStacks).toBe(5); // unverändert
  });
  it("ionizeCardsWithCatch: nicht-volle Karte wird normal ionisiert (kein Fang)", () => {
    const deck = [{ id: "A", ionStacks: 5 }, { id: "B", ionStacks: 0 }];
    const res = ionizeCardsWithCatch(deck, [1], 1, makeRng(1));
    expect(res.catchIds).toEqual([]);
    expect(res.deck[1].ionStacks).toBe(1);
  });
  it("ionizeCards (ohne Fang) unverändert: volle Karte bleibt gedeckelt, kein Fang", () => {
    const deck = [{ id: "A", ionStacks: 5 }, { id: "B", ionStacks: 0 }];
    const out = ionizeCards(deck, [0], 1, makeRng(1));
    expect(out[0].ionStacks).toBe(5);
  });
  it("Engine: voller Ladungsverbrauch trifft volle Karte → +2 temp Wert & +1 Ladung statt Ionisierung", () => {
    // pos 38 spielt, undrawn = [39]; Karte 39 ist voll (5). Crit füllt die Ladung (9→10) → Ionisierung.
    const deck = constDeck(12).map((c, i) => (i === 39 ? { ...c, ionStacks: 5 } : c));
    const s = resolveTrick(scen(12, 0, { skills: [ION, CATCHER], deck, lightning: light({ charge: 9 }), pos: 38 }), zero);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.deck[39].ionStacks).toBe(5);      // nicht weiter ionisiert
    expect(s.iceTemp.X39).toBe(2);             // +2 temporärer Wert (nächstes Auftauchen)
    expect(s.lightning.charge).toBe(1);        // Verbrauch auf 0, Fang gibt +1 Ladung
  });
});

describe("#165 Blitz — Spannungsbogen (SK_LIGHTNING_12)", () => {
  it("Flag-Prädikat", () => {
    expect(hasVoltageArc([ARC])).toBe(true);
    expect(hasVoltageArc([ION])).toBe(false);
  });
  it("Sieg mit ionisierter Karte: direkter Nachfolger +1 Stapel", () => {
    const deck = constDeck(12).map((c, i) => (i === 0 ? { ...c, ionStacks: 1 } : c));
    const s = resolveTrick(scen(12, 0, { skills: [ARC], deck, lightning: light() }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    expect(s.deck[1].ionStacks).toBe(1);       // Nachfolger ionisiert
    expect(s.deck[0].ionStacks).toBe(2);       // Siegkarte selbst +1 (bestehende Regel)
  });
  it("Voller Nachfolger wird übersprungen → nächste noch nicht volle Karte", () => {
    const deck = constDeck(12).map((c, i) =>
      i === 0 ? { ...c, ionStacks: 1 } : i === 1 ? { ...c, ionStacks: 5 } : c);
    const s = resolveTrick(scen(12, 0, { skills: [ARC], deck, lightning: light() }), noCrit);
    expect(s.deck[1].ionStacks).toBe(5);       // voll → übersprungen
    expect(s.deck[2].ionStacks).toBe(1);       // nächste erhält +1
  });
  it("Nicht-ionisierte Siegkarte löst Spannungsbogen NICHT aus", () => {
    const s = resolveTrick(scen(12, 0, { skills: [ARC], lightning: light() }), noCrit);
    expect(s.deck[1].ionStacks || 0).toBe(0);
  });
});

// ============================================================ FEUER (§5.3)
const heat = (over = {}) => ({ ...initHeat(), active: true, ...over });
const F4 = "SK_FIRE_04", F6 = "SK_FIRE_06", F13 = "SK_FIRE_13", F14 = "SK_FIRE_14";

describe("#165 Feuer — Glühende Klinge (SK_FIRE_06, geändert)", () => {
  it("Wertbonus ab 50 % Hitze nur noch +1", () => {
    const s = resolveTrick(scen(10, 0, { skills: [F6], heat: heat({ value: 50 }) }), noCrit);
    expect(s.lastTrick.pValue).toBe(11);
  });
  it("unter 50 % kein Wertbonus", () => {
    const s = resolveTrick(scen(10, 0, { skills: [F6], heat: heat({ value: 49 }) }), noCrit);
    expect(s.lastTrick.pValue).toBe(10);
  });
  it("Niederlagen verursachen +10 % Hitzeverlust, solange aktiv (Hitze ≥ 50)", () => {
    expect(heatLossFor(10, [F6], false, 50)).toBe(11);  // 10 × 1,10
    expect(heatLossFor(10, [F6], false, 49)).toBe(10);  // Hitze < 50 → kein Modifikator
    expect(heatLossFor(10, [F6, F4], false, 50)).toBe(5); // × 1,10 = 11, dann Hitzeschild × 0,5 → floor 5
  });
});

describe("#165 Feuer — Überhitzt (SK_FIRE_13)", () => {
  it("Wertbonus: ab 80 % zusätzlich +2 (mit Glühender Klinge insgesamt +3)", () => {
    expect(resolveTrick(scen(10, 0, { skills: [F6, F13], heat: heat({ value: 80 }) }), noCrit).lastTrick.pValue).toBe(13); // +1 +2
    expect(resolveTrick(scen(10, 0, { skills: [F13], heat: heat({ value: 80 }) }), noCrit).lastTrick.pValue).toBe(12);     // nur +2
    expect(resolveTrick(scen(10, 0, { skills: [F6, F13], heat: heat({ value: 79 }) }), noCrit).lastTrick.pValue).toBe(11); // Ü < 80 inaktiv, GK +1
  });
  it("Hitzeverlust-Modifikatoren ADDIEREN vor Hitzeschild (§5.6-6)", () => {
    expect(heatLossFor(10, [F6], false, 80)).toBe(11);        // nur GK × 1,10
    expect(heatLossFor(10, [F13], false, 80)).toBe(15);       // nur Ü × 1,50
    expect(heatLossFor(10, [F6, F13], false, 80)).toBe(16);   // beide × 1,60
    expect(heatLossFor(10, [F6, F13, F4], false, 80)).toBe(8); // × 1,60 = 16, dann Hitzeschild × 0,5 → 8
    expect(heatLossFor(10, [F6, F13], false, 79)).toBe(11);   // Ü inaktiv (< 80), nur GK
    expect(heatLossFor(10, [F6, F13], false, 49)).toBe(10);   // beide inaktiv
  });
});

describe("#165 Feuer — Funkenflug (SK_FIRE_14)", () => {
  it("Sieg mit ≥8 Vorsprung speichert 25 % des Feuer-Flat-Scores (bei leerem Speicher)", () => {
    // constDeck(12) vs 0 → Vorsprung 12; Feuer-Flat = fireScoreFor(12,[F14]) = 250; Speicher = floor(250×0,25) = 62.
    const s = resolveTrick(scen(12, 0, { skills: [F14], heat: heat({ value: 50 }) }), noCrit);
    expect(fireScoreFor(12, [F14])).toBe(250);
    expect(s.heat.sparkStore).toBe(62);
  });
  it("Vorsprung < 8 speichert nicht", () => {
    const s = resolveTrick(scen(5, 0, { skills: [F14], heat: heat({ value: 50 }) }), noCrit); // Vorsprung 5 < 8
    expect(s.heat.sparkStore).toBe(0);
  });
  it("nächster Sieg zahlt den Speicher als Flat aus und erzeugt keinen neuen", () => {
    // Speicher 100 → scoreBase = 100 + Feuer-Flat 250 + Auszahlung 100 = 450; × streakBaseMult(1)=1,02.
    const s = resolveTrick(scen(12, 0, { skills: [F14], heat: heat({ value: 50, sparkStore: 100 }) }), noCrit);
    expect(s.lastTrick.gained).toBeCloseTo(450 * 1.02);
    expect(s.heat.sparkStore).toBe(0); // ausgezahlt, kein neuer Speicher trotz Vorsprung ≥ 8
  });
  it("Niederlage löscht den Speicher nicht", () => {
    const s = resolveTrick(scen(0, 12, { skills: [F14], heat: heat({ value: 50, sparkStore: 100 }) }), noCrit);
    expect(s.lastTrick.result).toBe("loss");
    expect(s.heat.sparkStore).toBe(100);
  });
});
