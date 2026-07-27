import { describe, it, expect } from "vitest";
import { computeFormations, positionHasFormation, formationPotential, SEGMENT_SIZE, openSegmentInfo } from "../src/game/formations.js";

// Karten aus [suit, value]-Paaren; identity-Reihenfolge → Position i = deck[i].
const card = ([s, v], i) => ({ id: `${s}${v}_${i}`, suit: s, baseRank: v, value: v });
const idOrder = (n) => Array.from({ length: n }, (_, i) => i);
const forms = (arr) => computeFormations(idOrder(arr.length), arr.map(card));
const mults = (arr) => forms(arr).map((f) => +f.mult.toFixed(3));
const typesAt = (arr, pos) => forms(arr)[pos].formations.map((f) => f.type).sort();

describe("Wiederholung (≥2 gleiche Werte)", () => {
  it("Paar → 2. Karte ×1,25; Rest 1 [#Pass4]", () => {
    // Vier gleiche Werte, unterschiedliche Farben → isolierte Wiederholung (kein Farbblock/Treppe/Wechsel).
    expect(mults([["R", 5], ["B", 5], ["G", 5], ["Y", 5]])).toEqual([1, 1.25, 1.5, 1.8]);
  });
  it("Länge 2 → nur die 2. Karte bekommt Bonus", () => {
    expect(mults([["R", 7], ["B", 7]])).toEqual([1, 1.25]);
  });
  it("kein Cap — ab der 4. je +0,40 (#Pass4)", () => {
    // Fünf gleiche Werte (Farben R/B/G/Y/R, nicht 3 gleiche nebeneinander → kein Farbblock).
    expect(mults([["R", 5], ["B", 5], ["G", 5], ["Y", 5], ["R", 5]])).toEqual([1, 1.25, 1.5, 1.8, 2.2]);
  });
});

describe("Farbblock (≥3 gleiche Farbe)", () => {
  it("ab der 3. Karte ×1,35, je weitere +0,20; <3 kein Bonus [#Pass4]", () => {
    // Werte 5,7,6,8: enge Schritte (<5) → kein Wechsel; keine 3er-Steigung → keine Treppe → isolierter Farbblock.
    expect(mults([["R", 5], ["R", 7], ["R", 6], ["R", 8]])).toEqual([1, 1, 1.35, 1.55]);
    expect(mults([["R", 5], ["R", 2]])).toEqual([1, 1]); // len 2 → nichts
  });
});

describe("Treppe (≥3 streng steigend, Schritt ≤3 [#161 FB-5])", () => {
  it("ab der 3. Karte ×1,35, je weitere +0,20", () => {
    // Unterschiedliche Farben → kein Farbblock; Schritte +2 (≤3 gültige Treppe, <5 → kein Wechsel).
    expect(mults([["R", 1], ["B", 3], ["G", 5], ["Y", 7]])).toEqual([1, 1, 1.35, 1.55]);
  });
  it("ein Rückschritt beendet die Treppe", () => {
    expect(mults([["R", 1], ["B", 3], ["G", 2], ["Y", 4], ["R", 6]])).toEqual([1, 1, 1, 1, 1.35]);
  });
  it("ein Schritt größer als 3 beendet die Treppe [#161 FB-5]", () => {
    // 1→5 = +4 > 3 → keine Treppe über Pos 0; 5,7,9 (Schritte +2) bilden ab Pos 1 eine.
    expect(mults([["R", 1], ["B", 5], ["G", 7], ["Y", 9]])).toEqual([1, 1, 1, 1.35]);
  });
});

describe("Wechsel (Zick-Zack: Nachbardifferenz ≥5, alternierende Richtung [#161 FB-5])", () => {
  it("alternierende große Sprünge ab der 3. Karte ×1,40, je weitere +0,20", () => {
    expect(mults([["R", 2], ["B", 9], ["G", 1], ["Y", 8]])).toEqual([1, 1, 1.4, 1.6]);
  });
  it("große gleichgerichtete Sprünge sind weder Wechsel (keine Richtungsänderung) noch Treppe (Schritt >3)", () => {
    // 1,7,13: streng steigend, aber Schritte je +6 → keine Treppe (>3) und ohne Richtungswechsel kein Wechsel.
    expect(typesAt([["R", 1], ["B", 7], ["G", 13]], 2)).toEqual([]);
    expect(mults([["R", 1], ["B", 7], ["G", 13]])).toEqual([1, 1, 1]);
  });
  it("findet einen Zick-Zack, der erst nach einem gleichgerichteten Sprung beginnt", () => {
    // 2,9,15,8: 2→9(+7) 9→15(+6, gleiche Richtung → Wechsel-Bruch); der Neustart 9,15,8 ist ein gültiger Zick-Zack.
    // Keine Treppe (Schritte +7/+6 > 3). Nur der Wechsel 9,15,8 zahlt auf seiner 3. Karte (×1,40).
    const deck = [["R", 2], ["B", 9], ["G", 15], ["Y", 8]];
    expect(mults(deck)).toEqual([1, 1, 1, 1.4]);
    expect(typesAt(deck, 2)).toEqual(["wechsel"]);
    expect(typesAt(deck, 3)).toEqual(["wechsel"]);
  });
});

describe("Segment = Arena (Formationen enden an Segmentgrenzen)", () => {
  it(`Segmentgröße ${SEGMENT_SIZE}; ein Farbblock über die Grenze zählt nicht`, () => {
    expect(SEGMENT_SIZE).toBe(5);
    // Vier R-Karten ganz in Segment 0 → Farbblock.
    expect(mults([["R", 5], ["R", 7], ["R", 6], ["R", 8]])).toEqual([1, 1, 1.35, 1.55]);
    // Vier R-Karten über die Grenze 4|5 gelegt (Pos 3–6) → in zwei Hälften à 2 → kein Farbblock.
    // Enge Werte (Diff <5, keine 3er-Steigung) → auch kein Wechsel/keine Treppe.
    const straddle = [["R", 6], ["B", 5], ["G", 7], ["R", 6], ["R", 8], ["R", 5], ["R", 7]];
    expect(mults(straddle)).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });
});

describe("Stapelung mehrerer Formationen (Produkt × Überlappungsbonus)", () => {
  it("gleichfarbig + streng steigend → Farbblock × Treppe × Überlappung auf der 3. Karte", () => {
    const deck = [["R", 1], ["R", 3], ["R", 5]]; // alle R (Farbblock) + streng steigend, Schritte +2 (Treppe)
    expect(typesAt(deck, 2)).toEqual(["farbblock", "treppe"]);
    // pos2: Farbblock ×1,35 · Treppe ×1,35 · Überlappung (2 Formationen) ×1,5. [#161 FB-5: Treppe 1,25→1,35]
    expect(+forms(deck)[2].mult.toFixed(4)).toBeCloseTo(1.35 * 1.35 * 1.5);
  });
});

// #155: bisher war nur die 2-fach-Überlappung (×1,5) gegen ein echtes Deck geprüft. OVERLAP_BONUS = {2:1,5, 3:2, 4:3};
// die großen Multiplikatoren ×2 (3 Formationen) und ×3 (4) hatten keinen Real-Deck-Regressionswächter.
describe("Überlappungsbonus gegen echtes Deck: ×2 (3 Formationen) & ×3 (4) (#155)", () => {
  // [R5,R5,R7,R9]: Pos 1 liegt gleichzeitig in Wiederholung (2. Karte), Farbblock (2. Karte) und Treppe (5,7,9)
  // → 3 gleichzeitige Basis-Formationen auf EINER Position → OVERLAP_BONUS[3] = ×2.
  const deck3 = [["R", 5], ["R", 5], ["R", 7], ["R", 9]];
  it("3 Basis-Formationen auf einer Position → Überlappung ×2", () => {
    expect(typesAt(deck3, 1)).toEqual(["farbblock", "treppe", "wiederholung"]);
    // Faktor > 1 trägt nur die Wiederholung (2. Karte ×1,25); Farbblock@2/Treppe@1 sind noch ×1.
    // Produkt 1,25 × Überlappung ×2 = 2,5.
    expect(+forms(deck3)[1].mult.toFixed(4)).toBeCloseTo(1.25 * 2);
  });
  it("4 Formationen auf einer Position → Überlappung ×3 (3 Basis + Formationsanker)", () => {
    // Ein Shop-Formationsanker (§4.2) auf Pos 1 ergänzt die 4. Mitgliedschaft (×1,60) → OVERLAP_BONUS[4] = ×3.
    const deck = deck3.map(card);
    const g = computeFormations(idOrder(4), deck, {}, [], [], [{ type: "formation", position: 1, factor: 1.6 }], {});
    expect(g[1].formations.map((f) => f.type).sort()).toEqual(["anker", "farbblock", "treppe", "wiederholung"]);
    // Faktoren > 1: Wiederholung ×1,25 · Anker ×1,60; Produkt × Überlappung ×3 = 6,0.
    expect(+g[1].mult.toFixed(4)).toBeCloseTo(1.25 * 1.6 * 3);
  });
});

describe("positionHasFormation (speist den Formations-Stat)", () => {
  it("true nur bei wirksamem Multiplikator (>1)", () => {
    const f = forms([["R", 5], ["B", 5], ["G", 5]]); // Wiederholung: pos0 mult 1, pos1 1,25, pos2 1,50
    expect(positionHasFormation(f[0])).toBe(false);
    expect(positionHasFormation(f[1])).toBe(true);
    expect(positionHasFormation(undefined)).toBe(false);
  });
});

describe("formationPotential (Startdeck-Band, #Pass6)", () => {
  it("= Σ(mult−1) über alle Positionen der Anordnung", () => {
    // Vier gleiche Werte → Wiederholung mults [1, 1.25, 1.5, 1.8] → Σ(mult−1) = 0,25+0,5+0,8 = 1,55.
    const deck = [["R", 5], ["B", 5], ["G", 5], ["Y", 5]].map(card);
    expect(+formationPotential(idOrder(4), deck).toFixed(4)).toBeCloseTo(1.55);
  });
  it("= 0 für eine formationsfreie Anordnung", () => {
    // 1,2,1: die beiden 1er sind nicht benachbart (kein Paar), Diffs <5 (kein Wechsel), keine Treppe, Farben verschieden.
    const deck = [["R", 1], ["B", 2], ["G", 1]].map(card);
    expect(formationPotential(idOrder(3), deck)).toBe(0);
  });
});

// Joker (C8) & Bindeglied (C10) sind zu den Familien C_JOKER/C_BRIDGE migriert (#167) — Tests direkt darunter.

describe("Rollen-Familien (Rarität #167): C_JOKER & C_BRIDGE über familyTiers", () => {
  const withFam = (deck, roles, familyTiers) => computeFormations(idOrder(deck.length), deck, roles, [], [], [], familyTiers);
  it("C_JOKER I (pred): zählt als Vorgängerfarbe (wie flach C8)", () => {
    const deck = [["R", 5], ["R", 2], ["B", 8]].map(card); // B als R → Farbblock R,R,R
    expect(withFam(deck, { C_JOKER: [deck[2].id] }, { C_JOKER: 1 })[2].formations.some((x) => x.type === "farbblock")).toBe(true);
  });
  it("C_JOKER IV (free): zählt als beliebige Farbe — auch mitten im Block", () => {
    const deck = [["R", 5], ["B", 2], ["R", 8]].map(card); // R,B,R: normal kein Farbblock
    expect(computeFormations(idOrder(3), deck)[2].formations.some((x) => x.type === "farbblock")).toBe(false);
    // B (Mitte) als freier Joker → R,(R),R = Farbblock
    expect(withFam(deck, { C_JOKER: [deck[1].id] }, { C_JOKER: 4 })[2].formations.some((x) => x.type === "farbblock")).toBe(true);
  });
  it("C_BRIDGE: Span je Stufe (I ±1 reicht nicht, III ±2 erlaubt die steilere Treppe)", () => {
    const deck = [["R", 3], ["B", 8], ["G", 9]].map(card); // 3→8 zu steil (Schritt 5 > 3); Bindeglied auf der 8
    expect(withFam(deck, { C_BRIDGE: [deck[1].id] }, { C_BRIDGE: 1 })[2].formations.some((x) => x.type === "treppe")).toBe(false); // ±1
    expect(withFam(deck, { C_BRIDGE: [deck[1].id] }, { C_BRIDGE: 3 })[2].formations.some((x) => x.type === "treppe")).toBe(true);  // ±2 → 8 zählt als 6 → 3,6,9
  });
});

describe("Formationsfamilien (Rarität #167 Kat. E über familyTiers)", () => {
  // E1–E9 sind zu Familien migriert (#167); computeFormations liest sie über familyTiers (8. Param). Stufe II ≈ das
  // frühere flache Verhalten.
  const withE = (arr, familyTiers) => computeFormations(idOrder(arr.length), arr.map(card), {}, [], [], [], familyTiers);
  const hasType = (g, pos, t) => g[pos].formations.some((x) => x.type === t);

  it("E_LOSS: Segment-Anker (II: Position 10/20/30/40 ×1,25; IV ×1,35)", () => {
    const deck = Array.from({ length: 10 }, (_, i) => [i % 2 ? "B" : "R", i % 2 ? 1 : 3]); // formationsneutral
    expect(hasType(withE(deck, { E_LOSS: 2 }), 9, "anker")).toBe(true); // Position 10
    expect(withE(deck, { E_LOSS: 2 })[9].mult).toBeCloseTo(1.25);
    expect(hasType(withE(deck, {}), 9, "anker")).toBe(false);
    expect(withE(deck, { E_LOSS: 4 })[9].mult).toBeCloseTo(1.35); // IV ×1,35
  });
  it("E_QUICKSHOT: Anker (II: Position 5/15/25/35)", () => {
    const deck = Array.from({ length: 6 }, (_, i) => [i % 2 ? "B" : "R", i % 2 ? 1 : 3]);
    expect(hasType(withE(deck, { E_QUICKSHOT: 2 }), 4, "anker")).toBe(true); // Position 5
    expect(hasType(withE(deck, { E_QUICKSHOT: 1 }), 4, "anker")).toBe(true); // Position 5 auch bei I
  });
  it("E_SEGMENT: Farbblock läuft über die geöffnete Segmentgrenze (I öffnet die ERSTE, III alle)", () => {
    const deck = [["B", 4], ["G", 1], ["Y", 3], ["R", 5], ["R", 2], ["R", 8], ["R", 3]]; // R-Block Pos 4–7 über 1. Grenze
    expect(hasType(withE(deck, {}), 5, "farbblock")).toBe(false);
    expect(hasType(withE(deck, { E_SEGMENT: 1 }), 5, "farbblock")).toBe(true); // Stufe I öffnet bereits die erste Grenze
    expect(hasType(withE(deck, { E_SEGMENT: 3 }), 5, "farbblock")).toBe(true);
  });
  it("E_PENDULUM: Wechsel ab 2 Karten (II Marker/Faktor 1); IV Faktor bereits ab Länge 2 (×1,35)", () => {
    const deck = [["R", 2], ["B", 9]];
    expect(hasType(withE(deck, {}), 1, "wechsel")).toBe(false);
    const g2 = withE(deck, { E_PENDULUM: 2 });
    expect(hasType(g2, 1, "wechsel")).toBe(true);
    expect(g2[1].formations.find((x) => x.type === "wechsel").factor).toBe(1); // #99: 2-Karten-Wechsel nur Marker
    expect(positionHasFormation(g2[1])).toBe(false);
    expect(withE(deck, { E_PENDULUM: 4 })[1].mult).toBeCloseTo(1.35);           // IV: aktive Formation ab Länge 2
  });
  it("E_PACE: Wiederholung mit fremder Karte; Gap-Budget je Stufe (I 1, III 2)", () => {
    const deck = [["R", 5], ["B", 8], ["G", 5]]; // 5,8,5
    expect(hasType(withE(deck, {}), 2, "wiederholung")).toBe(false);
    const g = withE(deck, { E_PACE: 2 });
    expect(hasType(g, 2, "wiederholung")).toBe(true);
    expect(hasType(g, 1, "wiederholung")).toBe(false); // die 8 ist kein Mitglied
    // 5,8,5,9,5: I erlaubt nur EINEN Gap (Lauf endet nach dem 2. Fünfer), III erlaubt zwei (alle drei Fünfer).
    const d2 = [["R", 5], ["B", 8], ["G", 5], ["Y", 9], ["R", 5]];
    expect(hasType(withE(d2, { E_PACE: 1 }), 4, "wiederholung")).toBe(false);
    expect(hasType(withE(d2, { E_PACE: 3 }), 4, "wiederholung")).toBe(true);
  });
  it("E_GENTLE: Treppe darf einen Gleichstand enthalten", () => {
    const deck = [["R", 3], ["B", 5], ["G", 5], ["Y", 7]]; // 3,5,5,7
    expect(hasType(withE(deck, {}), 3, "treppe")).toBe(false);
    expect(hasType(withE(deck, { E_GENTLE: 2 }), 3, "treppe")).toBe(true);
  });
  it("E_BIGSTEP: Treppe darf einen Rückschritt enthalten", () => {
    const deck = [["R", 3], ["B", 5], ["G", 4], ["Y", 6]]; // 3,5,4,6: ein Rückschritt (5→4)
    expect(hasType(withE(deck, {}), 3, "treppe")).toBe(false);
    expect(hasType(withE(deck, { E_BIGSTEP: 2 }), 3, "treppe")).toBe(true);
  });
});

// #FB openSegmentInfo: EINE Quelle für „welche Segmentgrenzen sind offen" (Engine canExtendSeg + UI-Verbinder).
// Grenze g liegt zwischen Segment g und g+1 (0-basiert); Stufe I/II öffnen die ersten 1/2 von vorne, III/IV alle.
describe("openSegmentInfo (Segmentarbeit-Sichtbarkeit)", () => {
  it("ohne E_SEGMENT: inaktiv, keine Grenze offen", () => {
    const s = openSegmentInfo({});
    expect(s.active).toBe(false);
    expect(s.all).toBe(false);
    expect(s.isOpen(0)).toBe(false);
  });
  it("Stufe I: aktiv, nur die ERSTE Grenze (g=0) offen", () => {
    const s = openSegmentInfo({ E_SEGMENT: 1 });
    expect(s.active).toBe(true);
    expect(s.all).toBe(false);
    expect(s.count).toBe(1);
    expect([s.isOpen(0), s.isOpen(1), s.isOpen(2)]).toEqual([true, false, false]);
  });
  it("Stufe II: die ersten ZWEI Grenzen (g=0,1) offen", () => {
    const s = openSegmentInfo({ E_SEGMENT: 2 });
    expect([s.isOpen(0), s.isOpen(1), s.isOpen(2)]).toEqual([true, true, false]);
  });
  it("Stufe III & IV: ALLE Grenzen offen", () => {
    for (const t of [3, 4]) {
      const s = openSegmentInfo({ E_SEGMENT: t });
      expect(s.all).toBe(true);
      expect([s.isOpen(0), s.isOpen(5), s.isOpen(99)]).toEqual([true, true, true]);
    }
  });
});
