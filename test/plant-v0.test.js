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
  it("Wachstum: ab SKILL_REF Pflanzen-Skills gibt Sieg +1; an der Reife-Schwelle wird die Karte grün", () => {
    // Skill-Gate: Win-Wachstum = min(1, PflanzenSkills/REF). Ab REF Skills volle +1 → Schwelle → grün.
    const s = resolveTrick(scen(12, 6, { skills: ["SK_PLANT_01", "SK_PLANT_02", "SK_PLANT_05"], growth: { X0: C.PLANT_GREEN_THRESHOLD - 1 } }), noCrit);
    expect(s.growth.X0).toBe(C.PLANT_GREEN_THRESHOLD);
    expect(s.deck[0].green).toBe(true);
  });
  it("Skill-Gate: mit nur 1 Pflanzen-Skill wächst ein Sieg nur 1/REF (Anti-Splash)", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_PLANT_05"], growth: { X0: 0 } }), noCrit);
    expect(s.growth.X0).toBeCloseTo(1 / C.PLANT_GROWTH_SKILL_REF); // 1 Skill / 3 = 0,333
    expect(s.deck[0].green).toBeFalsy(); // grau bleibt grau — 1/3 < Schwelle
  });
  it("Wurzeltiefe: Sieg einer grünen Karte gibt Wurzeln-Score (Flat)", () => {
    // growth 0 → keine Tiefe über dem Wert-Deckel → das superlineare Wurzel-Ceiling (#Ceiling) zündet nicht → reiner Flat.
    const s = resolveTrick(scen(12, 6, { skills: ["SK_PLANT_02"], deck: green0(12), growth: { X0: 0 } }), noCrit);
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

/* Pflanze-Legendär-Reshape (2026-07-30) — Pflanze hat drei flutende Währungen (plant-economy.mjs: Grün→100 %,
   Überlauf-Wachstum „alter Wald" verschwendet, Kolonie→40); alle 4 „mach-mehr"-Legendären waren tot (0,86-1,00×).
   Sie lesen jetzt den verschwendeten BESTAND und zahlen je GRÜNEM Sieg DIREKT (post-stack, breakdown.plantDirect),
   hart gedeckelt, bekenntnis-skaliert (plantSkillCount/SKILL_SLOTS). Generisches Pflanze bleibt unberührt. */
describe("Pflanze-Legendär-Reshape — Fluten-Dividende (plantDirect)", () => {
  const commit1 = Math.min(1, 1 / C.SKILL_SLOTS); // 1 Pflanze-Skill (nur die Legendäre) gehalten
  const greenDeck = (n) => constDeck(C.PLANT_VALUE_CAP).map((c, i) => (i < n ? { ...c, green: true } : c)); // erste n grün, Wert=Deckel (need=0)
  const growthMap = (n, v) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`X${i}`, v]));
  const sumOverflow = (deck, growth) => { let s = 0; for (const c of deck) if (c.green) { const ov = (growth[c.id] || 0) - Math.max(0, C.PLANT_VALUE_CAP - c.value) * C.WURZELSCHLAG_PER_GROWTH; if (ov > 0) s += ov; } return s; };
  const maxOverflow = (deck, growth) => { let m = 0; for (const c of deck) if (c.green) { const ov = (growth[c.id] || 0) - Math.max(0, C.PLANT_VALUE_CAP - c.value) * C.WURZELSCHLAG_PER_GROWTH; if (ov > m) m = ov; } return m; };

  it("#Ceiling Wurzel/TIEFE: tiefe Bäume zahlen generisch einen superlinearen (dreieckigen) Direktscore", () => {
    const s = resolveTrick(scen(C.PLANT_VALUE_CAP, 0, { skills: ["SK_PLANT_02"], deck: greenDeck(10), growth: growthMap(10, 40) }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    // Siegkarte: Wert=Deckel (need=0), Wachstum 40+Zuwachs → Tiefe am Deckel PLANT_ROOT_DEEP_CAP → dreieckig × K × Bekenntnis.
    const g = 40 + Math.min(1, 1 / C.PLANT_GROWTH_SKILL_REF);
    const depth = Math.min(Math.floor(g), C.PLANT_ROOT_DEEP_CAP);
    expect(s.lastTrick.breakdown.plantDirect).toBeCloseTo((depth * (depth + 1) / 2) * C.PLANT_ROOT_DEEP_K * commit1);
  });
  it("Weltenbaum (BREITE): Σ Überlauf-Wachstum × WELTENBAUM_DIRECT je grünem Sieg (gedeckelt, bekenntnis-skaliert)", () => {
    const s = resolveTrick(scen(C.PLANT_VALUE_CAP, 0, { skills: ["SK_PLANT_L01"], deck: greenDeck(5), growth: growthMap(5, 30) }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.breakdown.plantDirect).toBeCloseTo(Math.min(sumOverflow(s.deck, s.growth), C.WELTENBAUM_OVERFLOW_CAP) * C.WELTENBAUM_DIRECT * commit1);
  });
  it("Mutterbaum (TIEFE): max Überlauf-Wachstum des tiefsten Baums × MUTTERBAUM_DIRECT je grünem Sieg (gedeckelt)", () => {
    const s = resolveTrick(scen(C.PLANT_VALUE_CAP, 0, { skills: ["SK_PLANT_L02"], deck: greenDeck(5), growth: { X0: 45, X1: 30, X2: 20, X3: 10, X4: 5 } }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.breakdown.plantDirect).toBeCloseTo(Math.min(maxOverflow(s.deck, s.growth), C.MUTTERBAUM_OVERFLOW_CAP) * C.MUTTERBAUM_DIRECT * commit1);
  });
  it("Dornenkönig (KOLONIE): #kolonisierte Gegnerkarten × DORNENKOENIG_DIRECT je grünem Sieg (gedeckelt)", () => {
    const colonized = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`X${i}`, true]));
    const s = resolveTrick(scen(C.PLANT_VALUE_CAP, 0, { skills: ["SK_PLANT_L03"], deck: greenDeck(3), growth: growthMap(3, 10), colonized }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.breakdown.plantDirect).toBeCloseTo(Math.min(Object.keys(s.colonized).length, C.DORNENKOENIG_COLON_CAP) * C.DORNENKOENIG_DIRECT * commit1);
  });
  it("Ewiger Frühling (GRÜN-FELD): #grüne Karten × EWIGER_FRUEHLING_DIRECT je grünem Sieg (gedeckelt)", () => {
    const s = resolveTrick(scen(C.PLANT_VALUE_CAP, 0, { skills: ["SK_PLANT_L04"], deck: greenDeck(12), growth: growthMap(12, 5) }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.breakdown.plantDirect).toBeCloseTo(Math.min(greenCount(s.deck), C.EWIGER_FRUEHLING_FIELD_CAP) * C.EWIGER_FRUEHLING_DIRECT * commit1);
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

/* Die zwei getunten Farbblock-Regler der Pflanze (v0.3-Parität — der voll-grüne ×8-Riesenblock war der Runaway):
   PLANT_GREEN_FARBBLOCK_CAP deckelt die Ordinalzahl grüner Karten, UEBERWUCHERUNG_FACTOR hebt ab ≥66 % grün die
   Farbblock-Basis. Beide bislang ohne Guard. Werte über computeFormations gemessen (gleiche Farbe → ein Lauf). */
describe("Pflanze-Farbblock — getunte Regler (Grün-Cap + Überwucherung)", () => {
  const greenRun = (n, value = 5) => Array.from({ length: n }, (_, i) => ({ id: `G${i}`, suit: "R", baseRank: value, value, green: true }));
  const plainRun = (n, value = 5) => Array.from({ length: n }, (_, i) => ({ id: `P${i}`, suit: "R", baseRank: value, value }));
  const ord = (n) => Array.from({ length: n }, (_, i) => i);
  const farbFactors = (forms) => forms.flatMap((p) => (p.formations || []).filter((f) => f.type === "farbblock").map((f) => f.factor));
  const distinctAbove1 = (a) => new Set(a.filter((f) => f > 1).map((f) => f.toFixed(4))).size;

  it("Grün-Cap: der grüne Farbblock plateaut ab Ordinal PLANT_GREEN_FARBBLOCK_CAP, ein ungrüner eskaliert weiter", () => {
    const n = 5; // ein Segment (SEGMENT_SIZE 5) → ein zusammenhängender Lauf, gleicher Wert → nur Farbblock (keine Treppe/Wechsel)
    const green = farbFactors(computeFormations(ord(n), greenRun(n), {}, [], [], [], {}));
    const plain = farbFactors(computeFormations(ord(n), plainRun(n), {}, [], [], [], {}));
    expect(distinctAbove1(green)).toBe(1);                       // grün: ab dem Cap flach → genau ein wirksamer Faktor
    expect(distinctAbove1(plain)).toBeGreaterThan(1);            // ungrün: eskaliert weiter → mehrere Faktoren
    expect(Math.max(...green)).toBeLessThan(Math.max(...plain)); // der Cap drückt die grüne Decke
  });

  it("Überwucherung: ab ≥66 % grün hebt SK_PLANT_14 die Farbblock-Basis um genau UEBERWUCHERUNG_FACTOR", () => {
    const n = 4; // 100 % grün → über der 66-%-Schwelle
    const withUeb = farbFactors(computeFormations(ord(n), greenRun(n), {}, [], ["SK_PLANT_14"], [], {}));
    const without = farbFactors(computeFormations(ord(n), greenRun(n), {}, [], [], [], {}));
    expect(Math.max(...withUeb) - Math.max(...without)).toBeCloseTo(C.UEBERWUCHERUNG_FACTOR);
  });
});

/* QA-Sweep #216 → Issue #228: zwei Pflanze-Correctness-Bugs, wo die Engine vom Skill-Text/Glossar abwich.
   Assertion über `breakdown.flats` (= plantFlat in einem reinen Pflanze-Szenario) statt scoreGain — so ist der
   Flat-Score isoliert, unabhängig vom Formations-Multiplikator (mehrere grüne Nachbarn bilden Wiederholung/Farbblock
   → Überlappungs-Bonus verzerrte den Gesamt-Score). Sieg immer an Pos 0 (grün, Wert 12 > Gegner 6). */
describe("Pflanze-Correctness #228 (QA #216)", () => {
  const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i); // [a, b)
  const greenAt = (idx, v = 12) => { const set = new Set(idx); return constDeck(v).map((c, i) => (set.has(i) ? { ...c, green: true } : c)); };
  const flats = (skills, deck) => resolveTrick(scen(12, 6, { skills, deck }), noCrit).lastTrick.breakdown.flats;

  it("C1 — Überwucherung verdoppelt die Blüte NUR bei ≥66 % grünem Feld, nicht schon bei Skill-Besitz", () => {
    // Blüte an Pos 0 (grün, rechter Nachbar grün); Segment-Grün gs = 2 → Blüte-Flat = 2×BLUETE_SCORE.
    const low = greenAt([0, 1]);                       // 2/40 grün = 5 % → unter 66 %
    const high = greenAt([0, 1, ...range(10, 36)]);    // 28/40 grün = 70 % → über 66 % (Extra-Grün außerhalb Segment 0)
    const bluete = C.BLUETE_SCORE * 2;                 // gs = 2
    expect(flats(["SK_PLANT_10", "SK_PLANT_14"], low)).toBeCloseTo(bluete);   // niedriges Feld: NICHT verdoppelt (der Bug verdoppelte hier immer)
    expect(flats(["SK_PLANT_10"], low)).toBeCloseTo(bluete);                  // == ohne Überwucherung → Skill wirkungslos bei zu wenig Grün
    expect(flats(["SK_PLANT_10", "SK_PLANT_14"], high)).toBeCloseTo(bluete * 2); // hohes Feld (≥66 %): verdoppelt
  });

  it("C2 — Blätterdach zahlt nach Farbblock-Blockgröße, nicht nach deckweiter Grünzahl", () => {
    // Grüner 4er-Block an Pos 0–3 (Sieg an Pos 0). Extra-Grün AUSSERHALB des Blocks darf den Score NICHT erhöhen.
    const base = flats(["SK_PLANT_13"], greenAt([0, 1, 2, 3]));                       // Block 4, deckweit 4 grün
    const withExtra = flats(["SK_PLANT_13"], greenAt([0, 1, 2, 3, ...range(20, 30)])); // Block bleibt 4, deckweit 14 grün
    expect(base).toBeCloseTo(4 * C.BLAETTERDACH_SCORE); // je Karte IM BLOCK, Block = 4
    expect(withExtra).toBeCloseTo(base);                 // deckweites Grün außerhalb des Blocks ändert nichts (der Bug zahlte hier 10×Score)
  });

  it("C2 — Blätterdach löst NICHT bei einem 3er-Block aus, auch wenn das Deck ≥4 grüne Karten hat", () => {
    const deck = greenAt([0, 1, 2, ...range(20, 30)]); // 3er-Block an Pos 0 + 10 Grün woanders → deckweit 13 grün
    expect(flats(["SK_PLANT_13"], deck)).toBeCloseTo(0); // Block 3 < BLAETTERDACH_MIN → inert (der Bug löste hier aus)
  });

  it("C2 — Blätterdach skaliert mit der echten Blockgröße (je Karte im Block)", () => {
    // 5er-Block (füllt ein Segment) → 5×Score. Farbblöcke sind an Segmentgrenzen begrenzt (SEGMENT_SIZE 5),
    // der Deckel BLAETTERDACH_CARD_CAP greift erst bei geöffneten Segmenten (Architekt/E_SEGMENT).
    expect(flats(["SK_PLANT_13"], greenAt(range(0, 5)))).toBeCloseTo(5 * C.BLAETTERDACH_SCORE);
  });
});
