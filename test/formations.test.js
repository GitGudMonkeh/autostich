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
  it("kein Cap — ab der 4. je +0,50 (#95)", () => {
    // Fünf gleiche Werte (Farben R/B/G/Y/R, nicht 3 gleiche nebeneinander → kein Farbblock).
    expect(mults([["R", 5], ["B", 5], ["G", 5], ["Y", 5], ["R", 5]])).toEqual([1, 1.3, 1.6, 2.0, 2.5]);
  });
});

describe("Farbblock (≥3 gleiche Farbe)", () => {
  it("ab der 3. Karte ×1,30, je weitere +0,20; <3 kein Bonus", () => {
    // Werte 5,7,6,8: enge Schritte (<4) → kein Wechsel; keine 3er-Steigung → keine Treppe → isolierter Farbblock.
    expect(mults([["R", 5], ["R", 7], ["R", 6], ["R", 8]])).toEqual([1, 1, 1.3, 1.5]);
    expect(mults([["R", 5], ["R", 2]])).toEqual([1, 1]); // len 2 → nichts
  });
});

describe("Treppe (≥3 streng steigend)", () => {
  it("ab der 3. Karte ×1,25, je weitere +0,20", () => {
    // Unterschiedliche Farben → kein Farbblock; Schritte +2 (<4) → kein Wechsel.
    expect(mults([["R", 1], ["B", 3], ["G", 5], ["Y", 7]])).toEqual([1, 1, 1.25, 1.45]);
  });
  it("ein Rückschritt beendet die Treppe", () => {
    expect(mults([["R", 1], ["B", 3], ["G", 2], ["Y", 4], ["R", 6]])).toEqual([1, 1, 1, 1, 1.25]);
  });
});

describe("Wechsel (Zick-Zack: Nachbardifferenz ≥4, alternierende Richtung)", () => {
  it("alternierende große Sprünge ab der 3. Karte ×1,25, je weitere +0,20", () => {
    expect(mults([["R", 2], ["B", 9], ["G", 1], ["Y", 8]])).toEqual([1, 1, 1.25, 1.45]);
  });
  it("große Sprünge OHNE Richtungswechsel sind KEIN Wechsel (nur Treppe)", () => {
    // 1,7,13: streng steigend (Treppe) + Schritte je +6 — aber gleiche Richtung → kein Wechsel.
    const f = forms([["R", 1], ["B", 7], ["G", 13]]);
    expect(typesAt([["R", 1], ["B", 7], ["G", 13]], 2)).toEqual(["treppe"]);
    expect(+f[2].mult.toFixed(3)).toBe(1.25);
  });
  it("findet auch einen Zick-Zack, der erst nach einem gleichgerichteten Sprung beginnt", () => {
    // 2,9,15,8: 2→9(+7) 9→15(+6, gleiche Richtung → Wechsel-Bruch), aber 9,15,8 ist ein gültiger Zick-Zack.
    // Zusätzlich ist 2,9,15 eine Treppe (Schritte +7/+6 ≥4). Karten in 2 Formationen → Überlappung ×1,5.
    const deck = [["R", 2], ["B", 9], ["G", 15], ["Y", 8]];
    // pos0 Treppe(1) · pos1 Treppe(1)+Wechsel(1)→×1,5 · pos2 Treppe(1,25)+Wechsel(1)→×1,875 · pos3 Wechsel(1,25).
    expect(mults(deck)).toEqual([1, 1.5, 1.875, 1.25]);
    expect(typesAt(deck, 2)).toEqual(["treppe", "wechsel"]);
    expect(typesAt(deck, 3)).toEqual(["wechsel"]);      // 9,15,8 Zick-Zack via Restart, 3. Karte → 1,25
  });
});

describe("Segment = Arena (Formationen enden an Segmentgrenzen)", () => {
  it(`Segmentgröße ${SEGMENT_SIZE}; ein Farbblock über die Grenze zählt nicht`, () => {
    expect(SEGMENT_SIZE).toBe(5);
    // Vier R-Karten ganz in Segment 0 → Farbblock.
    expect(mults([["R", 5], ["R", 7], ["R", 6], ["R", 8]])).toEqual([1, 1, 1.3, 1.5]);
    // Vier R-Karten über die Grenze 4|5 gelegt (Pos 3–6) → in zwei Hälften à 2 → kein Farbblock.
    // Enge Werte (Diff <4, keine 3er-Steigung) → auch kein Wechsel/keine Treppe.
    const straddle = [["R", 6], ["B", 5], ["G", 7], ["R", 6], ["R", 8], ["R", 5], ["R", 7]];
    expect(mults(straddle)).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });
});

describe("Stapelung mehrerer Formationen (Produkt × Überlappungsbonus)", () => {
  it("gleichfarbig + streng steigend → Farbblock × Treppe × Überlappung auf der 3. Karte", () => {
    const deck = [["R", 1], ["R", 3], ["R", 5]]; // alle R (Farbblock) + streng steigend (Treppe)
    expect(typesAt(deck, 2)).toEqual(["farbblock", "treppe"]);
    // pos2: Farbblock ×1,30 · Treppe ×1,25 · Überlappung (2 Formationen) ×1,5 = 2,4375.
    expect(+forms(deck)[2].mult.toFixed(4)).toBeCloseTo(1.3 * 1.25 * 1.5);
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

describe("Rollen-Eingriffe: Joker (C8) & Bindeglied (C10)", () => {
  it("Joker zählt als Farbe des direkten Vorgängers → bildet einen Farbblock", () => {
    const deck = [["R", 5], ["R", 2], ["B", 8]].map(card); // B ist Joker → alle „rot"
    const roles = { C8: [deck[2].id] };
    const f = computeFormations(idOrder(3), deck, roles);
    expect(f[2].formations.some((x) => x.type === "farbblock")).toBe(true);
    expect(+f[2].mult.toFixed(2)).toBe(1.30);
    // ohne Rolle: kein Farbblock (Farben R,R,B)
    expect(computeFormations(idOrder(3), deck)[2].formations.some((x) => x.type === "farbblock")).toBe(false);
  });
  it("Bindeglied darf für die Treppe als ±1 gelten", () => {
    const deck = [["R", 3], ["B", 3], ["G", 5]].map(card); // 3,3,5: normal keine Treppe (3→3 nicht steigend)
    expect(computeFormations(idOrder(3), deck)[2].formations.some((x) => x.type === "treppe")).toBe(false);
    const roles = { C10: [deck[1].id] }; // mittlere Karte darf als 4 gelten → 3<4<5
    expect(computeFormations(idOrder(3), deck, roles)[2].formations.some((x) => x.type === "treppe")).toBe(true);
  });
});

describe("Formationswerkzeuge (V2 §22.6 E)", () => {
  const f = (arr, perks) => computeFormations(idOrder(arr.length), arr.map(card), {}, perks);
  const hasType = (g, pos, t) => g[pos].formations.some((x) => x.type === t);

  it("E7 Kontrollverlust: Position 10/20/30/40 werden Anker (×1,25)", () => {
    const deck = Array.from({ length: 10 }, (_, i) => [i % 2 ? "B" : "R", i % 2 ? 1 : 3]); // formationsneutral
    const g = f(deck, ["E7"]);
    expect(hasType(g, 9, "anker")).toBe(true); // Position 10
    expect(g[9].mult).toBeCloseTo(1.25);
    expect(hasType(f(deck, []), 9, "anker")).toBe(false);
  });
  it("E8 Schnellschuss: Position 5/15/25/35 werden Anker", () => {
    const deck = Array.from({ length: 6 }, (_, i) => [i % 2 ? "B" : "R", i % 2 ? 1 : 3]);
    expect(hasType(f(deck, ["E8"]), 4, "anker")).toBe(true); // Position 5
  });
  it("E9 Segmentarbeit: Farbblock läuft über die Segmentgrenze", () => {
    const deck = [["B", 4], ["G", 1], ["Y", 3], ["R", 5], ["R", 2], ["R", 8], ["R", 3]]; // R-Block Pos 4–7 über Grenze
    expect(hasType(f(deck, []), 5, "farbblock")).toBe(false);
    expect(hasType(f(deck, ["E9"]), 5, "farbblock")).toBe(true);
  });
  it("E5 Pendelwerk: Wechsel schon ab 2 Karten erkannt", () => {
    const deck = [["R", 2], ["B", 9]];
    expect(hasType(f(deck, []), 1, "wechsel")).toBe(false);
    expect(hasType(f(deck, ["E5"]), 1, "wechsel")).toBe(true);
  });
  it("E1 Schrittmacher: Wiederholung mit einer fremden Karte dazwischen (fremde zählt nicht)", () => {
    const deck = [["R", 5], ["B", 8], ["G", 5]]; // 5,8,5
    expect(hasType(f(deck, []), 2, "wiederholung")).toBe(false);
    const g = f(deck, ["E1"]);
    expect(hasType(g, 2, "wiederholung")).toBe(true);
    expect(hasType(g, 1, "wiederholung")).toBe(false); // die 8 ist kein Mitglied
  });
  it("E3 Sanfter Anstieg: Treppe darf einmal gleich sein", () => {
    const deck = [["R", 3], ["B", 5], ["G", 5], ["Y", 7]]; // 3,5,5,7 (einmal gleich)
    expect(hasType(f(deck, []), 3, "treppe")).toBe(false);
    expect(hasType(f(deck, ["E3"]), 3, "treppe")).toBe(true);
  });
  it("E4 Großer Schritt: Treppe darf einmal einen Rückschritt enthalten", () => {
    const deck = [["R", 3], ["B", 7], ["G", 5], ["Y", 9]]; // 3,7,5,9
    expect(hasType(f(deck, ["E4"]), 3, "treppe")).toBe(true);
  });
});
