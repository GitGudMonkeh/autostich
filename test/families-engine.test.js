import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState, reducer } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { applyFamilyPick } from "../src/game/families.js";

/* Engine-Verdrahtung des Raritätssystems (Epic #167, Schritt 1): der End-to-End-Nachweis, dass eine
   gehaltene Familien-Stufe (state.familyTiers) über resolveTrick genauso in die multiplizierte Score-Basis
   fließt wie ein flacher D-Perk — additiv, ohne Doppel-Trigger. Teststil analog engine.test.js. */

// Konstantes Deck: gleicher Wert bildet nur eine Wiederholung, KEINEN Farbblock; Pos 0 hat keinen
// Formations-Mult (wie in engine.test.js verankert) → isoliert die Score-Flats.
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
function scenario(pVal, oVal, over = {}) {
  return {
    ...initialState(makeRng(1)),
    deck: constDeck(pVal), oppDeck: constDeck(oVal),
    playerOrder: identity(), oppOrder: identity(),
    ...over,
  };
}
const rng = makeRng(9);

describe("Familien-Engine-Verdrahtung — Kategorie D über resolveTrick (Schritt 1)", () => {
  it("D_HIGH IV: Stufe zahlt scoreFlat in die multiplizierte Basis (Wert ≥6)", () => {
    // Wert 6 ≥ Schwelle 6 → +350; (100+350)×streakBaseMult(1)=1,02
    expect(resolveTrick(scenario(6, 0, { familyTiers: { D_HIGH: 4 } }), rng).score).toBeCloseTo(459);
    // Wert 5 < 6 → nur Basis
    expect(resolveTrick(scenario(5, 0, { familyTiers: { D_HIGH: 4 } }), rng).score).toBeCloseTo(102);
  });

  it("nur die gehaltene Stufe zählt — kein Doppel-Trigger über Stufen (Spec §2.3/§9)", () => {
    // D_HIGH auf Rang 2: Schwelle ≥8/+150. Rang 1 (≥9/+100) darf NICHT zusätzlich zählen.
    expect(resolveTrick(scenario(8, 0, { familyTiers: { D_HIGH: 2 } }), rng).score).toBeCloseTo(255); // (100+150)×1,02
    expect(resolveTrick(scenario(7, 0, { familyTiers: { D_HIGH: 2 } }), rng).score).toBeCloseTo(102);
  });

  it("scoreFlatOnCrit-Familie (D_CRIT_SCORE) zahlt nur bei einem Crit", () => {
    // erzwungener Crit via statCritChance:1 → Rang 2 gibt +175 in die Basis, dann Crit-Faktor.
    const s = resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_SCORE: 2 }, statCritChance: 1 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.gained).toBeCloseTo((100 + 175) * 1.02 * s.lastTrick.critMultiplier);
    // Ohne Crit (keine Crit-Chance) trägt die Familie nichts bei → nur Basis.
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_SCORE: 2 } }), rng).score).toBeCloseTo(102);
  });

  it("Familie UND flacher Perk gleichzeitig — additiv, kein gegenseitiges Überschreiben", () => {
    // Flacher D3 (Wert ≥8 → +125) + Familie D_HIGH IV (Wert ≥6 → +350) auf einem Sieg mit Wert 8.
    const s = resolveTrick(scenario(8, 0, { perks: ["D3"], familyTiers: { D_HIGH: 4 } }), rng);
    expect(s.score).toBeCloseTo((100 + 125 + 350) * 1.02);
  });

  it("leere familyTiers verändern den Score nicht (reine Additivität)", () => {
    expect(resolveTrick(scenario(12, 0, { familyTiers: {} }), rng).score).toBeCloseTo(102);
    expect(resolveTrick(scenario(12, 0), rng).score).toBeCloseTo(102); // Feld ganz weggelassen
  });
});

describe("Reducer PICK_FAMILY (Schritt 1)", () => {
  it("setzt familyTiers[id] auf die Zielstufe und kehrt ins Spiel zurück", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup" };
    const s1 = reducer(s0, { type: "PICK_FAMILY", familyId: "D_HIGH", tier: 3, rng });
    expect(s1.familyTiers.D_HIGH).toBe(3);
    expect(s1.phase).toBe("play");
  });

  it("Upgrade ersetzt die gehaltene Stufe (nur höchste aktiv)", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", familyTiers: { D_HIGH: 1 } };
    const s1 = reducer(s0, { type: "PICK_FAMILY", familyId: "D_HIGH", tier: 3, rng });
    expect(s1.familyTiers.D_HIGH).toBe(3);
    expect(Object.keys(s1.familyTiers)).toEqual(["D_HIGH"]); // kein zweiter Rang derselben Familie
  });

  it("ignoriert unbekannte Familie, Stufe 0 und die falsche Phase", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup" };
    expect(reducer(s0, { type: "PICK_FAMILY", familyId: "NOPE", tier: 2, rng })).toBe(s0);
    expect(reducer(s0, { type: "PICK_FAMILY", familyId: "D_HIGH", tier: 0, rng })).toBe(s0);
    const play = { ...initialState(makeRng(1)), phase: "play" };
    expect(reducer(play, { type: "PICK_FAMILY", familyId: "D_HIGH", tier: 2, rng })).toBe(play);
  });

  it("initialState trägt ein leeres familyTiers", () => {
    expect(initialState(makeRng(1)).familyTiers).toEqual({});
  });
});

describe("applyFamilyPick — reines Patch (Spec §2.4)", () => {
  it("REPLACEMENT: nur familyTiers ändert sich, Deck/Rollen unangetastet", () => {
    const deck = [{ id: "a", value: 3 }];
    const roles = { X: ["a"] };
    const out = applyFamilyPick("D_HIGH", 2, { familyTiers: { D_STREAK: 1 }, deck, roles }, rng);
    expect(out.familyTiers).toEqual({ D_STREAK: 1, D_HIGH: 2 });
    expect(out.deck).toBe(deck);   // identische Referenz → keine Deckmod bei REPLACEMENT
    expect(out.roles).toBe(roles);
  });

  it("No-Op bei unbekannter Familie / Stufe 0", () => {
    expect(applyFamilyPick("NOPE", 2, { familyTiers: { D_HIGH: 1 } }, rng).familyTiers).toEqual({ D_HIGH: 1 });
    expect(applyFamilyPick("D_HIGH", 0, { familyTiers: { D_HIGH: 1 } }, rng).familyTiers).toEqual({ D_HIGH: 1 });
  });
});
