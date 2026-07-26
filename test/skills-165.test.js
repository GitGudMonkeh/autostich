import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { ionizeCards, ionizeCardsWithCatch, hasBlitzcatcher, hasVoltageArc } from "../src/game/skills.js";
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
