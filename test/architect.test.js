import { describe, it, expect } from "vitest";
import {
  ARCHITECT_FAMILIES, familyDef, shapeRotations, enumeratePlacements, isValidFootprint, occupiedCells,
  buildArchitectOffer, initialArchitect, precomputeArchitect, architectValueBonus, architectScore,
  architectFormSpec, summarizeArchitect, tierNum, tierFactor, ARCHITECT_OFFER, MAX_TIER, HAEUSERZEILE_FACTOR,
  posOf, rowOf, colOf, N_POS,
} from "../src/game/architect.js";
import { computeFormations } from "../src/game/formations.js";
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { runOne } from "../sim/run.js";
import { randomPolicy } from "../sim/policies/random.js";

// Fake-Deck: 40 Karten, Wert/Farbe per Callback (order = Identität, damit position == deck-Index).
function fakeDeck(valOf = () => 5, suitOf = () => "R") {
  return Array.from({ length: N_POS }, (_, i) => ({ id: `c${i}`, value: valOf(i), suit: suitOf(i) }));
}
const idOrder = Array.from({ length: N_POS }, (_, i) => i);
const B = (familyId, footprint, tier = 1, extra = {}) => ({ id: 1, familyId, tier, footprint: [...footprint].sort((a, b) => a - b), colorChoice: null, ...extra });

describe("Architekt — Geometrie & Platzierung", () => {
  it("Positions-Mapping ist 8×5 (row*5+col)", () => {
    expect(posOf(0, 0)).toBe(0);
    expect(posOf(7, 4)).toBe(39);
    expect(rowOf(12)).toBe(2); expect(colOf(12)).toBe(2);
  });

  it("Rotation: line4 hat eine horizontale UND eine vertikale Lage", () => {
    const rots = shapeRotations("line4");
    expect(rots.length).toBe(2);
    const horiz = rots.some((cells) => cells.every(([r]) => r === 0));
    const vert = rots.some((cells) => cells.every(([, c]) => c === 0));
    expect(horiz).toBe(true); expect(vert).toBe(true);
  });

  it("zeile rotiert nicht (nur eine Lage, ganze Zeile)", () => {
    expect(shapeRotations("zeile").length).toBe(1);
  });

  it("enumeratePlacements bleibt im Gitter und überlappt nicht", () => {
    const occ = [B("A_STUETZE", [0, 1])];
    const places = enumeratePlacements("domino", occ);
    for (const fp of places) {
      for (const p of fp) expect(p).toBeGreaterThanOrEqual(0), expect(p).toBeLessThan(N_POS);
      expect(fp.some((p) => p === 0 || p === 1)).toBe(false); // keine belegte Zelle
    }
    // Domino wickelt nie über den Zeilenrand (col 4 → col 0 der nächsten Zeile).
    expect(places.some((fp) => fp.includes(4) && fp.includes(5))).toBe(false);
  });

  it("isValidFootprint akzeptiert echte Platzierungen und lehnt Überlappung/Form-Bruch ab", () => {
    expect(isValidFootprint("domino", [0, 1], [])).toBe(true);
    expect(isValidFootprint("domino", [0, 1], [B("A_STUETZE", [1, 2])])).toBe(false); // Overlap an 1
    expect(isValidFootprint("domino", [0, 2], [])).toBe(false);                       // keine gültige Domino-Form
    expect(isValidFootprint("domino", [4, 5], [])).toBe(false);                       // Zeilen-Wrap
  });

  it("occupiedCells sammelt alle Footprint-Zellen", () => {
    expect(occupiedCells([B("A_STUETZE", [0, 1]), { footprint: [10, 11] }]).size).toBe(4);
  });
});

describe("Architekt — Angebot (deterministisch)", () => {
  it("gleicher Seed → identisches Angebot; ARCHITECT_OFFER Baupläne; keine doppelte Familie", () => {
    const a = initialArchitect();
    const o1 = buildArchitectOffer(a, makeRng(42));
    const o2 = buildArchitectOffer(a, makeRng(42));
    expect(o1).toEqual(o2);
    expect(o1.length).toBe(ARCHITECT_OFFER);
    expect(new Set(o1.map((o) => o.familyId)).size).toBe(o1.length);
  });

  it("höchstens EIN legendäres Angebot", () => {
    let maxLeg = 0;
    for (let s = 0; s < 200; s++) {
      const off = buildArchitectOffer(initialArchitect(), makeRng(s));
      maxLeg = Math.max(maxLeg, off.filter((o) => o.legendary).length);
    }
    expect(maxLeg).toBeLessThanOrEqual(1);
  });
});

describe("Architekt — value-Effekte (Precompute + Anwendung)", () => {
  it("flat (Stützbalken): alle abgedeckten +N, stufen-skaliert", () => {
    const deck = fakeDeck();
    const pre = precomputeArchitect({ buildings: [B("A_STUETZE", [0, 1], 3)] }, idOrder, deck);
    const amt = tierNum(ARCHITECT_FAMILIES.A_STUETZE.base.value, 3);
    expect(architectValueBonus(pre, 0, deck[0])).toBe(amt);
    expect(architectValueBonus(pre, 1, deck[1])).toBe(amt);
    expect(architectValueBonus(pre, 2, deck[2])).toBe(0); // nicht abgedeckt
  });

  it("lowValue (Rampe): nur bei Kartenwert ≤ Schwelle", () => {
    const deck = fakeDeck((i) => (i === 0 ? 3 : 9));
    const pre = precomputeArchitect({ buildings: [B("A_RAMPE", [0, 1, 2, 3], 1)] }, idOrder, deck);
    expect(architectValueBonus(pre, 0, deck[0])).toBe(tierNum(ARCHITECT_FAMILIES.A_RAMPE.base.value, 1)); // Wert 3 ≤ 5
    expect(architectValueBonus(pre, 1, deck[1])).toBe(0);             // Wert 9 > 5
  });

  it("color (Buntglas): nur bei passender Farbe (colorChoice)", () => {
    const deck = fakeDeck(() => 5, (i) => (i === 0 ? "R" : "B"));
    const pre = precomputeArchitect({ buildings: [B("A_BUNTGLAS", [0, 1, 2, 3], 1, { colorChoice: "R" })] }, idOrder, deck);
    expect(architectValueBonus(pre, 0, deck[0])).toBe(tierNum(ARCHITECT_FAMILIES.A_BUNTGLAS.base.value, 1)); // R == choice
    expect(architectValueBonus(pre, 1, deck[1])).toBe(0);             // B != choice
  });

  it("target highest/lowest: Effekt liegt nur auf der Ziel-Position", () => {
    const deck = fakeDeck((i) => [2, 9, 4, 7][i] ?? 0); // Werte an 0..3
    const hi = precomputeArchitect({ buildings: [B("A_FIRST", [0, 1, 2, 3], 1)] }, idOrder, deck);
    expect(architectValueBonus(hi, 1, deck[1])).toBe(tierNum(ARCHITECT_FAMILIES.A_FIRST.base.value, 1)); // 9 = höchste
    expect(architectValueBonus(hi, 3, deck[3])).toBe(0);
    const lo = precomputeArchitect({ buildings: [B("A_SOCKEL", [0, 1, 2, 3], 1)] }, idOrder, deck);
    expect(architectValueBonus(lo, 0, deck[0])).toBe(tierNum(ARCHITECT_FAMILIES.A_SOCKEL.base.value, 1)); // 2 = niedrigste
  });
});

describe("Architekt — score-Effekte", () => {
  const deck = fakeDeck(() => 5, () => "R");
  it("flat (Zollhaus): +N bei Sieg", () => {
    const pre = precomputeArchitect({ buildings: [B("A_ZOLLHAUS", [0, 1], 2)] }, idOrder, deck);
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 3, suit: "R" }, {}).flat).toBe(tierNum(ARCHITECT_FAMILIES.A_ZOLLHAUS.base.score, 2));
  });
  it("streak (Reihenhaus): +N × Serie", () => {
    const pre = precomputeArchitect({ buildings: [B("A_REIHENHAUS", [0, 1, 2, 3], 1)] }, idOrder, deck);
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 4, suit: "R" }, {}).flat).toBe(tierNum(ARCHITECT_FAMILIES.A_REIHENHAUS.base.score, 1) * 4);
  });
  it("crit (Zinne): nur bei Crit", () => {
    const pre = precomputeArchitect({ buildings: [B("A_ZINNE", [0, 1, 2, 3], 1)] }, idOrder, deck);
    expect(architectScore(pre, 0, { isCrit: true, serieStreak: 1, suit: "R" }, {}).flat).toBe(tierNum(ARCHITECT_FAMILIES.A_ZINNE.base.score, 1));
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, {}).flat).toBe(0);
  });
  it("mult (Schatzkammer, legendär): ×Faktor auf Siege", () => {
    const pre = precomputeArchitect({ buildings: [B("A_SCHATZ", [0, 1, 2, 3], "legendary")] }, idOrder, deck);
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, {}).mult).toBeCloseTo(ARCHITECT_FAMILIES.A_SCHATZ.base.factor);
  });
  it("milestone (Meilenstein): jeder 5. Sieg zahlt", () => {
    const pre = precomputeArchitect({ buildings: [B("A_MEILENSTEIN", [0, 1, 5, 6], 1)] }, idOrder, deck);
    const r4 = architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, { 1: 4 }); // next = 5 → zahlt
    expect(r4.flat).toBe(tierNum(ARCHITECT_FAMILIES.A_MEILENSTEIN.base.score, 1)); expect(r4.bump).toBe(1);
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, { 1: 0 }).flat).toBe(0); // next = 1
  });
  it("Häuserzeile: volle Segment-Zeile → ×Faktor auf Siege im Segment", () => {
    const pre = precomputeArchitect({ buildings: [B("A_STUETZE", [0, 1, 2, 3, 4], 1)] }, idOrder, deck);
    expect(architectScore(pre, 0, { isCrit: false, serieStreak: 1, suit: "R" }, {}).mult).toBeCloseTo(HAEUSERZEILE_FACTOR);
    expect(architectScore(pre, 10, { isCrit: false, serieStreak: 1, suit: "R" }, {}).mult).toBeCloseTo(1); // andere Zeile
  });
});

describe("Architekt — formation-Direktiven & computeFormations", () => {
  it("architectFormSpec sammelt Joker/Bind/CrossSeg/Anker/FormMult", () => {
    const deck = fakeDeck();
    const spec = architectFormSpec({ buildings: [
      B("A_KLAMMER", [0, 1]), B("A_KREUZGANG", [10, 15, 16], 3), B("A_PFEILER", [0, 5, 10, 15]),
      B("A_GRUNDSTEIN", [20, 21, 25, 26]), B("A_KATHEDRALE", [30, 31, 32, 33, 34], "legendary"),
    ] }, idOrder, deck);
    expect(spec.jokerF.has(0)).toBe(true);        // Klammer → Farbblock-Joker
    expect(spec.bind[10]).toBe(2);                // Kreuzgang Stufe 3 → Span 2
    expect(spec.crossSeg.has(0)).toBe(true);      // Pfeiler → Zeile 0 offen (rowOf(0))
    expect(spec.anker[20]).toBeGreaterThan(1);    // Grundstein → Anker-Faktor
    expect(spec.formMult[30]).toBe(ARCHITECT_FAMILIES.A_KATHEDRALE.base.factor); // Kathedrale → ×Faktor
  });

  it("Grundstein macht abgedeckte Positionen zu Ankern (Formation)", () => {
    const deck = fakeDeck(() => 5, (i) => ["R", "B", "G", "Y"][i % 4]); // bewusst keine natürliche Formation
    const architect = { buildings: [B("A_GRUNDSTEIN", [0, 1, 5, 6], 1)] };
    const forms = computeFormations(idOrder, deck, {}, [], [], [], {}, architect);
    expect(forms[0].formations.some((f) => f.type === "anker")).toBe(true);
    expect(forms[0].mult).toBeGreaterThan(1);
  });

  it("Klammer (Farbblock-Joker) überbrückt eine fremde Farbe zum Farbblock", () => {
    // Zeile 0: R, B, R, R, R → ohne Joker Farbblock nur 2..4; mit Joker auf Position 1 läuft 0..4.
    const deck = fakeDeck(() => 5, (i) => (i === 1 ? "B" : "R"));
    const withJoker = computeFormations(idOrder, deck, {}, [], [], [], {}, { buildings: [B("A_KLAMMER", [1, 2], 1)] });
    const without = computeFormations(idOrder, deck, {}, [], [], [], {});
    const inFarbblock = (forms, p) => (forms[p].formations || []).some((f) => f.type === "farbblock");
    expect(inFarbblock(without, 0)).toBe(false);  // Position 0 (R) hängt ohne Joker nicht am Farbblock (B-Lücke bei 1)
    expect(inFarbblock(withJoker, 0)).toBe(true);  // Joker verbindet 0 über die B-Lücke mit 2..4
  });
});

describe("Architekt — Reducer-Aktionen", () => {
  const start = () => reducer(null, { type: "START_RUN", rng: makeRng(1), architect: true });
  // Zustand künstlich in die Architekt-Phase mit Angebot bringen.
  function inArchitectPhase() {
    const s = start();
    const offers = [{ familyId: "A_STUETZE", tier: 2, used: false }, { familyId: "A_ZINNE", tier: 1, used: false }, { familyId: "A_KLAMMER", tier: 1, used: false }];
    return { ...s, phase: "architect", architect: { ...s.architect, offers } };
  }

  it("BUILD errichtet, verbraucht die Hauptaktion und den Bauplan", () => {
    const s = inArchitectPhase();
    const s2 = reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_STUETZE", tier: 2, footprint: [0, 1] });
    expect(s2.architect.buildings.length).toBe(1);
    expect(s2.architect.buildings[0].tier).toBe(2);
    expect(s2.architect.actedMain).toBe(true);
    // zweite Hauptaktion wird abgelehnt (EXKLUSIV)
    const s3 = reducer(s2, { type: "ARCHITECT_BUILD", familyId: "A_ZINNE", tier: 1, footprint: [10, 11, 12, 13] });
    expect(s3).toBe(s2);
  });

  it("BUILD lehnt ungültige Platzierung ab", () => {
    const s = inArchitectPhase();
    expect(reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_STUETZE", tier: 2, footprint: [0, 2] })).toBe(s); // keine Domino
  });

  it("colorLocked-Familie braucht eine Farbe", () => {
    const s = { ...inArchitectPhase(), architect: { ...inArchitectPhase().architect, offers: [{ familyId: "A_BUNTGLAS", tier: 1, used: false }] } };
    expect(reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_BUNTGLAS", tier: 1, footprint: [0, 1, 2, 11] })).toBe(s); // ohne colorChoice → abgelehnt
  });

  it("UPGRADE hebt die Stufe; legendär/Max wird abgelehnt", () => {
    let s = inArchitectPhase();
    s = reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_STUETZE", tier: 2, footprint: [0, 1] });
    const id = s.architect.buildings[0].id;
    // frische Phase simulieren (actedMain zurück)
    s = { ...s, architect: { ...s.architect, actedMain: false } };
    const up = reducer(s, { type: "ARCHITECT_UPGRADE", buildingId: id });
    expect(up.architect.buildings[0].tier).toBe(3);
    expect(up.architect.actedMain).toBe(true);
  });

  it("MOVE genau einmal; DEMOLISH unbegrenzt; DONE → play", () => {
    let s = inArchitectPhase();
    s = reducer(s, { type: "ARCHITECT_BUILD", familyId: "A_STUETZE", tier: 2, footprint: [0, 1] });
    const id = s.architect.buildings[0].id;
    const moved = reducer(s, { type: "ARCHITECT_MOVE", buildingId: id, footprint: [10, 11] });
    expect(moved.architect.buildings[0].footprint).toEqual([10, 11]);
    expect(moved.architect.moved).toBe(true);
    expect(reducer(moved, { type: "ARCHITECT_MOVE", buildingId: id, footprint: [20, 21] })).toBe(moved); // 2. Move abgelehnt
    const demo = reducer(moved, { type: "ARCHITECT_DEMOLISH", buildingId: id });
    expect(demo.architect.buildings.length).toBe(0);
    expect(reducer(demo, { type: "ARCHITECT_DONE" }).phase).toBe("play");
  });
});

describe("Architekt — Voll-Run", () => {
  it("Determinismus: gleicher Seed + Architekt → identischer Score", () => {
    const p = () => randomPolicy({ architectGreedy: true });
    const a = runOne(7, p(), null, null, { architect: true });
    const b = runOne(7, p(), null, null, { architect: true });
    expect(a.score).toBe(b.score);
    expect(a.fingerprint).toEqual(b.fingerprint);
    expect(a.architect).not.toBeNull();
    expect(a.architect.buildings).toBeGreaterThan(0);
  });

  it("Architekt AUS entspricht Voll-Run ohne Architekt-Telemetrie", () => {
    const off = runOne(7, randomPolicy(), null, null, { architect: false });
    expect(off.architect).toBeNull();
    expect(off.score).toBeGreaterThan(0);
  });

  it("summarizeArchitect meldet plausible Abdeckung/Kategorien", () => {
    const a = { buildings: [B("A_STUETZE", [0, 1]), { id: 2, familyId: "A_ZINNE", tier: 3, footprint: [10, 11, 12, 16] }] };
    const sum = summarizeArchitect(a);
    expect(sum.buildings).toBe(2);
    expect(sum.byCategory.value).toBe(1);
    expect(sum.byCategory.score).toBe(1);
    expect(sum.coverage).toBeCloseTo(6 / N_POS);
  });
});
