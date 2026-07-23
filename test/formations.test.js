import { describe, it, expect } from "vitest";
import { computeFormations, positionHasFormation, SEGMENT_SIZE } from "../src/game/formations.js";

// Karten aus [suit, value]-Paaren; identity-Reihenfolge → Position i = deck[i].
const card = ([s, v], i) => ({ id: `${s}${v}_${i}`, suit: s, baseRank: v, value: v });
const idOrder = (n) => Array.from({ length: n }, (_, i) => i);
const forms = (arr) => computeFormations(idOrder(arr.length), arr.map(card));
const mults = (arr) => forms(arr).map((f) => +f.mult.toFixed(3));
const typesAt = (arr, pos) => forms(arr)[pos].formations.map((f) => f.type).sort();

describe("Wiederholung (≥2 gleiche Werte)", () => {
  it("Paar → 2. Karte ×1,30; Rest 1", () => {
    // Vier gleiche Werte, unterschiedliche Farben → isolierte Wiederholung (kein Farbblock/Treppe/Wechsel).
    expect(mults([["R", 5], ["B", 5], ["G", 5], ["Y", 5]])).toEqual([1, 1.3, 1.6, 2.0]);
  });
  it("Länge 2 → nur die 2. Karte bekommt Bonus", () => {
    expect(mults([["R", 7], ["B", 7]])).toEqual([1, 1.3]);
  });
});

describe("Farbblock (≥3 gleiche Farbe)", () => {
  it("ab der 3. Karte ×1,30, je weitere +0,15; <3 kein Bonus", () => {
    // Werte 5,2,8,3: kein Treppe/Wechsel/Wiederholung → isolierter Farbblock.
    expect(mults([["R", 5], ["R", 2], ["R", 8], ["R", 3]])).toEqual([1, 1, 1.3, 1.45]);
    expect(mults([["R", 5], ["R", 2]])).toEqual([1, 1]); // len 2 → nichts
  });
});

describe("Treppe (≥3 streng steigend)", () => {
  it("ab der 3. Karte ×1,25, je weitere +0,15", () => {
    // Unterschiedliche Farben → kein Farbblock; kleine Schritte → kein Wechsel.
    expect(mults([["R", 1], ["B", 3], ["G", 5], ["Y", 7]])).toEqual([1, 1, 1.25, 1.4]);
  });
  it("ein Rückschritt beendet die Treppe", () => {
    expect(mults([["R", 1], ["B", 3], ["G", 2], ["Y", 4], ["R", 6]])).toEqual([1, 1, 1, 1, 1.25]);
  });
});

describe("Wechsel (Zick-Zack: Nachbardifferenz ≥6, alternierende Richtung)", () => {
  it("alternierende große Sprünge ab der 3. Karte ×1,25", () => {
    expect(mults([["R", 2], ["B", 9], ["G", 1], ["Y", 8]])).toEqual([1, 1, 1.25, 1.4]);
  });
  it("große Sprünge OHNE Richtungswechsel sind KEIN Wechsel (nur Treppe)", () => {
    // 1,7,13: streng steigend (Treppe) + Schritte je +6 — aber gleiche Richtung → kein Wechsel.
    const f = forms([["R", 1], ["B", 7], ["G", 13]]);
    expect(typesAt([["R", 1], ["B", 7], ["G", 13]], 2)).toEqual(["treppe"]);
    expect(+f[2].mult.toFixed(3)).toBe(1.25);
  });
  it("findet auch einen Zick-Zack, der erst nach einem gleichgerichteten Sprung beginnt", () => {
    // 2,9,15,8: 2→9(+7) 9→15(+6, gleiche Richtung → Wechsel-Bruch), aber 9,15,8 ist ein gültiger Zick-Zack.
    // Zusätzlich ist 2,9,15 eine Treppe → pos2 trägt Treppe (1,25), pos3 den Wechsel (1,25).
    const deck = [["R", 2], ["B", 9], ["G", 15], ["Y", 8]];
    expect(mults(deck)).toEqual([1, 1, 1.25, 1.25]);
    // pos2 (=15) ist 3. der Treppe (2,9,15 → 1,25) UND 2. des Wechsels (9,15,8 → Faktor 1).
    expect(typesAt(deck, 2)).toEqual(["treppe", "wechsel"]);
    expect(typesAt(deck, 3)).toEqual(["wechsel"]);      // 9,15,8 Zick-Zack via Restart, 3. Karte → 1,25
  });
});

describe("Segment = Arena (Formationen enden an Segmentgrenzen)", () => {
  it(`Segmentgröße ${SEGMENT_SIZE}; ein Farbblock über die Grenze zählt nicht`, () => {
    expect(SEGMENT_SIZE).toBe(5);
    // Vier R-Karten ganz in Segment 0 → Farbblock.
    expect(mults([["R", 5], ["R", 2], ["R", 8], ["R", 3]])).toEqual([1, 1, 1.3, 1.45]);
    // Dieselben vier R-Karten über die Grenze 4|5 gelegt (Pos 3–6) → in zwei Hälften à 2 → kein Farbblock.
    const straddle = [["R", 10], ["B", 1], ["G", 6], ["R", 5], ["R", 2], ["R", 8], ["R", 3]];
    expect(mults(straddle)).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });
});

describe("Stapelung mehrerer Formationen (Produkt der Pro-Karte-Faktoren)", () => {
  it("gleichfarbig + streng steigend → Farbblock × Treppe auf der 3. Karte", () => {
    const deck = [["R", 1], ["R", 3], ["R", 5]];
    expect(typesAt(deck, 2)).toEqual(["farbblock", "treppe"]);
    expect(+forms(deck)[2].mult.toFixed(4)).toBeCloseTo(1.3 * 1.25); // 1,625
  });
});

describe("positionHasFormation (speist den Formations-Stat)", () => {
  it("true nur bei wirksamem Multiplikator (>1)", () => {
    const f = forms([["R", 5], ["B", 5], ["G", 5]]); // Wiederholung: pos0 mult 1, pos1 1,30, pos2 1,60
    expect(positionHasFormation(f[0])).toBe(false);
    expect(positionHasFormation(f[1])).toBe(true);
    expect(positionHasFormation(undefined)).toBe(false);
  });
});
