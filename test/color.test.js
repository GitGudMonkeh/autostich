import { describe, it, expect } from "vitest";
import { effColor, colorsAllied, colorMatches } from "../src/game/color.js";
import { precomputeArchitect, architectValueBonus, architectScore } from "../src/game/architect.js";
import { FAMILY_DEFS } from "../src/game/families.js";
import { makeRng } from "../src/game/deck.js";

// #289: Farb-Matching Single Source — grün („G") + Farballianz (verbündete Farben zählen als eine).
describe("#289 Farb-Hilfe (color.js)", () => {
  it("effColor: gruen wird G, sonst rohe Suit", () => {
    expect(effColor({ suit: "R", green: false })).toBe("R");
    expect(effColor({ suit: "R", green: true })).toBe("G"); // grün überschreibt
    expect(effColor(null)).toBe(null);
  });
  it("colorsAllied: gleich · verbündet · nicht verbündet", () => {
    expect(colorsAllied("R", "R", [])).toBe(true);
    expect(colorsAllied("R", "B", [["R", "B"]])).toBe(true);
    expect(colorsAllied("R", "B", [])).toBe(false);
    expect(colorsAllied("R", "G", [["R", "B"]])).toBe(false); // andere Gruppe
  });
  it("colorMatches: grün- UND allianz-bewusst", () => {
    expect(colorMatches({ suit: "R" }, "R", [])).toBe(true);
    expect(colorMatches({ suit: "B" }, "R", [["R", "B"]])).toBe(true);   // verbündet
    expect(colorMatches({ suit: "B" }, "R", [])).toBe(false);
    expect(colorMatches({ suit: "X", green: true }, "R", [])).toBe(false); // grün „G" ≠ R
    expect(colorMatches({ suit: "X", green: true }, "R", [["R", "G"]])).toBe(true); // grün „G" verbündet mit R
  });
});

describe("#289 Architekt-Farbgebäude respektieren Farballianz", () => {
  const deck = Array.from({ length: 40 }, (_, i) => ({ id: `c${i}`, value: 5, suit: "B", green: false }));
  const order = deck.map((_, i) => i);
  const cardR = { suit: "R", value: 5, green: false };
  const cardB = { suit: "B", value: 5, green: false };
  const cardG = { suit: "X", value: 5, green: true };

  it("Buntglas (Wert·color): verbündete Farbe bekommt den Bonus", () => {
    const pre = precomputeArchitect({ buildings: [{ id: 1, familyId: "A_BUNTGLAS", tier: 1, footprint: [0, 1, 2, 3], colorChoice: "R" }] }, order, deck);
    expect(architectValueBonus(pre, 0, cardR, [])).toBeGreaterThan(0);           // direkt R
    expect(architectValueBonus(pre, 0, cardB, [])).toBe(0);                       // B ohne Allianz → nichts
    expect(architectValueBonus(pre, 0, cardB, [["R", "B"]])).toBeGreaterThan(0);  // B verbündet mit R → Bonus (der Bug-Fix)
    expect(architectValueBonus(pre, 0, cardG, [])).toBe(0);                       // grün „G" ≠ R
    expect(architectValueBonus(pre, 0, cardG, [["R", "G"]])).toBeGreaterThan(0);  // grün „G" verbündet → Bonus
  });

  it("Zunfthaus (Score·color): verbündete Farbe bekommt den Flat-Score", () => {
    const pre = precomputeArchitect({ buildings: [{ id: 1, familyId: "A_ZUNFTHAUS", tier: 1, footprint: [0, 1, 2, 3], colorChoice: "R" }] }, order, deck);
    const flat = (suit, alliance) => architectScore(pre, 0, { isCrit: false, serieStreak: 0, suit }, {}, alliance).flat;
    expect(flat("R", [])).toBeGreaterThan(0);          // direkt R (ctx.suit ist die effektive Farbe)
    expect(flat("B", [])).toBe(0);                     // B ohne Allianz
    expect(flat("B", [["R", "B"]])).toBeGreaterThan(0); // B verbündet mit R → Flat
  });
});

describe("#291 Farbduell (A_SUIT_DUEL onPick) ist grün-bewusst", () => {
  const card = (id, value, suit, green = false) => ({ id, value, suit, green, baseRank: value });
  it("grüner Gewinner (+3) trifft pflanzen-grüne Karten (green-Flag) UND Basis-G", () => {
    const deck = [card("g1", 0, "R", true), card("g2", 5, "G", false), card("y1", 6, "Y", false)];
    // Stufe III: Gewinner = grün („G"); der Verlierer ist eine zufällige NICHT-grüne Farbe (≠ up).
    const out = FAMILY_DEFS.A_SUIT_DUEL.tiers[3].onPick(deck, makeRng(1), { suits: ["G"] });
    expect(out[0].value).toBe(3); // green-Flag (Basis R) zählt als „G" → 0 + 3 (das war der Bug: vorher 0 geblieben)
    expect(out[1].value).toBe(8); // Basis-G → 5 + 3
    // y1 ist weder Gewinner noch (garantiert) Verlierer — nur sicher: der grüne Gewinner ließ keine grüne 0-Karte zurück.
    expect(out[0].value).toBeGreaterThan(0);
  });
});
