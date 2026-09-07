import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, PFLANZE_TIERS as PT, ARCHETYPE_ORDER, SKILL_TIER_COUNT } from "../src/game/skills.js";
import { P, plantStage, greenCount, applyGrowth, growthOnWin, setzlingsbeetGains, plantValueBonus, plantFormMult } from "../src/game/factions/plant.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialState, reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { computeFormations, SEGMENT_SIZE } from "../src/game/formations.js";

/* ============================================================
   PFLANZE (exp skill rework, docs/skill-rework.md §6) — Passiv, die 15 Skills, die vier Formationshebel und die vier
   Legendären. Ersetzt plant-v0.test.js: die alte Ökonomie (Wertachse mit Auto-Sieg bei 11, Direkt-Score, Trimmen,
   Bekenntnis-Skalierung, Kolonisierung des Gegnerdecks, enabler-Verstärker) ist mit dem Rework gestrichen — mit ihr
   die Wächter, die sie schützten. Was hier steht, prüft die neuen Invarianten:
     Wachstum je Karte (+1 je Sieg, +1 je Formation), grau → grün → blühend, Score aus grünen Formationen,
     Hebel ändern die ERKENNUNG, und ohne gehaltenen Pflanzen-Skill ändert sich an der Formations-Engine nichts.
   ============================================================ */

const N = 40;
const deckOf = (f) => Array.from({ length: N }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: 5, value: 5, ...f(i) }));
const constDeck = (v) => Array.from({ length: N }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: N }, (_, i) => i);
const noCrit = () => 0.99;
// Formations-Sicht je Position: ohne Formation, bzw. mit EINEM Lauf über `members` (die Mitglieder liegen auf dem
// Eintrag — genau das liest die Fraktion). Die Engine rechnet Formationen nur an Position 0 neu → Tests laufen auf
// Position 1 mit injizierter Sicht (docs/engineering/testing.md, Falle „Formationen nur an Position 0").
const noForm = () => Array.from({ length: N }, () => ({ mult: 1, baseMult: 1, formations: [] }));
const withRun = (members, type = "farbblock", factor = 1.35) => {
  const f = noForm();
  members.forEach((p, i) => { f[p] = { mult: factor, baseMult: factor, formations: [{ type, ordinal: i + 1, factor, members }] }; });
  return f;
};
const scen = (over = {}) => ({
  ...initialState(makeRng(1)), deck: constDeck(5), oppDeck: constDeck(0), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["plant"], pos: 1, formations: noForm(), ...over,
});
const win = (over = {}) => resolveTrick(scen(over), noCrit);
const G = C.PLANT_GREEN_THRESHOLD, B = C.PLANT_BLOOM_THRESHOLD;

describe("Pflanze — Register und Stufenleitern (§6.7, §6.8)", () => {
  const plant = Object.values(SKILL_DEFS).filter((s) => s.archetype === "plant");
  it("18 Pflanze-Skills: 15 normale mit vier Stufenzeilen + 3 Legendäre ohne Stufe", () => {
    expect(plant).toHaveLength(18);
    const normal = plant.filter((s) => !s.legendary), leg = plant.filter((s) => s.legendary);
    expect(normal).toHaveLength(15);
    expect(leg, "§6.11 (Owner): drei Legendäre je Fraktion").toHaveLength(3);
    expect(SKILL_DEFS.SK_PLANT_L01, "Weltenbaum gestrichen — eine Rampe ohne eigene Auszahlung").toBeUndefined();
    for (const s of normal) expect(Array.isArray(s.tiers) && s.tiers.length === SKILL_TIER_COUNT, `${s.id} ohne Stufentabelle`).toBe(true);
    for (const s of leg) expect(s.tiers).toBeUndefined();
    expect(SKILL_DEFS.SK_PLANT_02, "Wurzeltiefe gestrichen (§6.3)").toBeUndefined();
    expect(SKILL_DEFS.SK_PLANT_18, "Kernholz gestrichen — die Wertachse ist weg (§6.1)").toBeUndefined();
    expect(ARCHETYPE_ORDER).toContain("plant");
  });
  it("jeder Platz trägt seinen Skill — die ID ist der Fügepunkt zum Emblem (skillArt.js)", () => {
    const byId = Object.fromEntries(plant.map((s) => [s.id, s.name]));
    expect(byId).toEqual({
      SK_PLANT_03: "Spalier", SK_PLANT_04: "Jahresringe", SK_PLANT_05: "Aussaat", SK_PLANT_06: "Wildwuchs",
      SK_PLANT_07: "Setzlingsbeet", SK_PLANT_08: "Zäher Halm", SK_PLANT_09: "Ranken", SK_PLANT_10: "Hecke",
      SK_PLANT_11: "Windung", SK_PLANT_12: "Lichtung", SK_PLANT_13: "Blätterdach", SK_PLANT_14: "Überwucherung",
      SK_PLANT_15: "Lücke", SK_PLANT_16: "Rankgerüst", SK_PLANT_17: "Blütenlese",
      SK_PLANT_L02: "Wurzelgeflecht", SK_PLANT_L03: "Baumreihe", SK_PLANT_L04: "Ewiger Frühling",
    });
  });
  it("jeder Skill trägt genau einen Effekt und keine Verstärker-Bindung (§6.1)", () => {
    for (const s of plant) {
      expect(s.enabler, `${s.id} ist ein Verstärker`).toBeUndefined();
      expect(s.trimGrowth, `${s.id} trägt noch die Trimm-Klausel`).toBeUndefined();
    }
  });
  it("Leitern steigen bzw. Schwellen fallen mit der Stufe, keine zwei Stufen sind gleich (§1)", () => {
    const asc = (rows, key) => rows.every((r, i) => i === 0 || r[key] >= rows[i - 1][key]);
    const desc = (rows, key) => rows.every((r, i) => i === 0 || r[key] <= rows[i - 1][key]);
    for (const k of ["aussaat", "ranken", "halm", "bluetenlese"]) expect(asc(PT[k], "growth"), k).toBe(true);
    for (const k of ["blaetterdach", "rankgeruest", "hecke", "windung", "jahresringe", "bluetenlese"]) expect(asc(PT[k], "score"), k).toBe(true);
    expect(asc(PT.spalier, "borders")).toBe(true);
    expect(asc(PT.wildwuchs, "jokers")).toBe(true);
    expect(asc(PT.luecke, "gaps")).toBe(true);
    expect(asc(PT.lichtung, "extra")).toBe(true);
    expect(desc(PT.ueberwucherung, "field")).toBe(true);
    for (const rows of Object.values(PT)) {
      const seen = rows.map((r) => JSON.stringify(r));
      expect(new Set(seen).size, `zwei gleiche Stufen: ${seen[0]}`).toBe(rows.length);
    }
  });
  it("die Sätze sind nach der Länge des Formationstyps gestaffelt (§6.8)", () => {
    // Ein grüner Farbblock wird am längsten, der Wechsel bleibt am kürzesten → je Karte zahlt er am meisten.
    expect(PT.blaetterdach[0].score).toBeLessThan(PT.rankgeruest[0].score);
    expect(PT.rankgeruest[0].score).toBeLessThan(PT.windung[0].score);
    expect(PT.hecke[0].score).toBe(PT.rankgeruest[0].score);
  });
  it("die Texte interpolieren die Tabellen (kein Drift zwischen Regel und Beschreibung)", () => {
    expect(SKILL_DEFS[P.AUSSAAT].desc).toContain(`+${PT.aussaat[0].growth}`);
    expect(SKILL_DEFS[P.BLAETTERDACH].descTiers[3]).toContain("Blühende Karten zählen doppelt");
    expect(SKILL_DEFS[P.UEBERWUCHERUNG].desc).toContain(`Ab ${Math.round(PT.ueberwucherung[0].field * 100)} %`);
    expect(SKILL_DEFS[P.JAHRESRINGE].descTiers[3]).toContain(`über ${B}`);
  });
});

describe("Pflanze — Passiv: Wachstum, Zustände, Blüten-Score (§6.2)", () => {
  it("ein Sieg gibt +1 Wachstum, dazu +1 je Formation an der Siegposition", () => {
    expect(win().growth.X1).toBe(C.PLANT_GROWTH_WIN);
    const s = win({ formations: withRun([0, 1, 2]) });
    expect(s.growth.X1).toBe(C.PLANT_GROWTH_WIN + C.PLANT_GROWTH_PER_FORMATION);
    // zwei Formationen an derselben Position → dreimal so schnell wie ein Sieg ohne Aufstellung
    const two = withRun([0, 1, 2]);
    two[1].formations.push({ type: "treppe", ordinal: 2, factor: 1.35, members: [0, 1, 2] });
    expect(win({ formations: two }).growth.X1).toBe(3);
  });
  it("eine Niederlage gibt nichts, Wachstum fällt nie", () => {
    const s = resolveTrick(scen({ deck: constDeck(0), oppDeck: constDeck(9), growth: { X1: 12 } }), noCrit);
    expect(s.lastTrick.result).toBe("loss");
    expect(s.growth.X1).toBe(12);
  });
  it("Schwellen: ab G grün, ab B blühend — beides in die Karte gebacken", () => {
    expect(plantStage(G - 1)).toBe("grey");
    expect(plantStage(G)).toBe("green");
    expect(plantStage(B)).toBe("bloom");
    const s = win({ growth: { X1: G - 1 } });
    expect(s.deck[1].green).toBe(true);
    expect(s.deck[1].bloom).toBeFalsy();
    const s2 = win({ growth: { X1: B - 1 } });
    expect(s2.deck[1].bloom).toBe(true);
  });
  it("eine blühende Siegkarte zahlt Basis-Score je grüner Karte in ihren Formationen", () => {
    const deck = deckOf((i) => (i <= 2 ? { green: true, bloom: i === 1 } : {}));
    const s = resolveTrick(scen({ deck, growth: { X1: B }, formations: withRun([0, 1, 2]) }), noCrit);
    expect(s.plantBase).toBe(3 * C.PLANT_BLOOM_SCORE_PER_GREEN);
    // ohne Formation zahlt sie nichts — die Fraktion zahlt für die Aufstellung, nicht für den Sieg
    expect(resolveTrick(scen({ deck, growth: { X1: B } }), noCrit).plantBase).toBe(0);
  });
  it("ohne aktiven Pflanze-Archetyp wächst nichts", () => {
    const s = resolveTrick(scen({ activeArchetypes: [] }), noCrit);
    expect(s.growth.X1).toBeUndefined();
  });
  it("applyGrowth ist immutabel und meldet die Grün-Übertritte", () => {
    const deck = constDeck(5);
    const r = applyGrowth({ X0: G - 1 }, deck, [{ id: "X0", amount: 1 }]);
    expect(r.becameGreen).toEqual(["X0"]);
    expect(r.deck[0].green).toBe(true);
    expect(deck[0].green, "das Eingangs-Deck bleibt unberührt").toBeUndefined();
  });
});

describe("Pflanze — die Wachstums-Skills (§6.8)", () => {
  const tier = (id, t) => ({ skills: [id], skillTiers: { [id]: t } });
  it("Aussaat: gewinnt eine GRÜNE Karte, wachsen beide Nachbarn", () => {
    const deck = deckOf((i) => (i === 1 ? { green: true } : {}));
    const s = resolveTrick(scen({ deck, growth: { X1: G }, ...tier(P.AUSSAAT, 0) }), noCrit);
    expect(s.growth.X0).toBe(PT.aussaat[0].growth);
    expect(s.growth.X2).toBe(PT.aussaat[0].growth);
    // graue Siegkarte sät nicht
    expect(resolveTrick(scen({ ...tier(P.AUSSAAT, 0) }), noCrit).growth.X0).toBeUndefined();
  });
  it("Aussaat Episch: auch die zweiten Nachbarn", () => {
    const deck = deckOf((i) => (i === 2 ? { green: true } : {}));
    const s = resolveTrick(scen({ deck, pos: 2, growth: { X2: G }, ...tier(P.AUSSAAT, 3) }), noCrit);
    expect(s.growth.X0).toBe(PT.aussaat[3].second);
    expect(s.growth.X1).toBe(PT.aussaat[3].growth);
  });
  it("Ranken: wird eine Karte grün, wachsen ihre grauen Nachbarn", () => {
    const s = resolveTrick(scen({ growth: { X1: G - 1 }, ...tier(P.RANKEN, 0) }), noCrit);
    expect(s.deck[1].green).toBe(true);
    expect(s.growth.X0).toBe(PT.ranken[0].growth);
    expect(s.growth.X2).toBe(PT.ranken[0].growth);
  });
  it("Ranken Episch kettet: eine dadurch grün gewordene Karte steckt ihre Nachbarn an", () => {
    const step = PT.ranken[3].growth;
    const s = resolveTrick(scen({ growth: { X1: G - 1, X2: G - step, X3: 0 }, ...tier(P.RANKEN, 3) }), noCrit);
    expect(s.deck[2].green, "X2 wird durch den Ruck grün").toBe(true);
    expect(s.growth.X3, "und steckt X3 an").toBe(step);
    // Normal kettet nicht
    const s2 = resolveTrick(scen({ growth: { X1: G - 1, X2: G - PT.ranken[0].growth, X3: 0 }, ...tier(P.RANKEN, 0) }), noCrit);
    expect(s2.growth.X3 || 0).toBe(0);
  });
  it("Lichtung: ein Formations-Sieg wächst zusätzlich, Episch je Formation", () => {
    const base = C.PLANT_GROWTH_WIN + C.PLANT_GROWTH_PER_FORMATION;
    expect(win({ formations: withRun([0, 1, 2]), ...tier(P.LICHTUNG, 0) }).growth.X1).toBe(base + PT.lichtung[0].extra);
    expect(win({ ...tier(P.LICHTUNG, 0) }).growth.X1, "ohne Formation kein Zuschlag").toBe(C.PLANT_GROWTH_WIN);
    const two = withRun([0, 1, 2]);
    two[1].formations.push({ type: "treppe", ordinal: 2, factor: 1.35, members: [0, 1, 2] });
    expect(win({ formations: two, ...tier(P.LICHTUNG, 3) }).growth.X1).toBe(1 + 2 + 2 * PT.lichtung[3].extra);
  });
  it("Zäher Halm: graue Karten wachsen bei einer Niederlage, Episch auch grüne", () => {
    const lose = (over) => resolveTrick(scen({ deck: constDeck(0), oppDeck: constDeck(9), ...over }), noCrit);
    expect(lose(tier(P.ZAEHER_HALM, 0)).growth.X1).toBe(PT.halm[0].growth);
    const greenDeck = deckOf((i) => (i === 1 ? { green: true, value: 0, baseRank: 0 } : { value: 0, baseRank: 0 }));
    expect(lose({ deck: greenDeck, growth: { X1: G }, ...tier(P.ZAEHER_HALM, 0) }).growth.X1, "grün ohne Episch: nichts").toBe(G);
    expect(lose({ deck: greenDeck, growth: { X1: G }, ...tier(P.ZAEHER_HALM, 3) }).growth.X1).toBe(G + PT.halm[3].greenToo);
  });
  it("Setzlingsbeet: der Kaltstart je Segment, deterministisch die niedrigste Karte", () => {
    const deck = deckOf((i) => ({ value: i % SEGMENT_SIZE === 3 ? 1 : 9 })); // je Segment ist Position 3 die niedrigste
    const gains = setzlingsbeetGains([P.SETZLINGSBEET], { [P.SETZLINGSBEET]: 0 }, { order: identity(), deck, segmentSize: SEGMENT_SIZE });
    expect(gains).toHaveLength(N / SEGMENT_SIZE);
    expect(gains[0]).toEqual({ id: "X3", amount: PT.setzlingsbeet[0].growth });
    expect(setzlingsbeetGains([P.SETZLINGSBEET], { [P.SETZLINGSBEET]: 3 }, { order: identity(), deck, segmentSize: SEGMENT_SIZE })).toHaveLength(2 * N / SEGMENT_SIZE);
  });
  it("der erste Pflanzen-Pick legt den Kaltstart an (Reducer)", () => {
    const base = { ...initialState(makeRng(1)), phase: "levelup", skillOffer: [P.SETZLINGSBEET], skillOfferTiers: { [P.SETZLINGSBEET]: 0 } };
    const s = reducer(base, { type: "PICK_SKILL", skillId: P.SETZLINGSBEET, rng: makeRng(2) });
    expect(s.activeArchetypes).toContain("plant");
    expect(Object.keys(s.growth)).toHaveLength(N / SEGMENT_SIZE);
    expect(Object.values(s.growth).every((g) => g === PT.setzlingsbeet[0].growth)).toBe(true);
  });
});

describe("Pflanze — Score aus grünen Formationen (§6.8)", () => {
  const tier = (id, t) => ({ skills: [id], skillTiers: { [id]: t } });
  const greenRun = () => deckOf((i) => (i <= 2 ? { green: true } : {}));
  it("Blätterdach zahlt je grüner Karte im Farbblock, Episch zählen blühende doppelt", () => {
    const s = resolveTrick(scen({ deck: greenRun(), growth: { X1: G }, formations: withRun([0, 1, 2]), ...tier(P.BLAETTERDACH, 0) }), noCrit);
    expect(s.plantBase).toBe(3 * PT.blaetterdach[0].score);
    const bloomDeck = deckOf((i) => (i <= 2 ? { green: true, bloom: i === 0 } : {}));
    const s2 = resolveTrick(scen({ deck: bloomDeck, growth: { X1: G }, formations: withRun([0, 1, 2]), ...tier(P.BLAETTERDACH, 3) }), noCrit);
    expect(s2.plantBase).toBe(4 * PT.blaetterdach[3].score);
  });
  it("je Formationstyp liest genau ein Skill — eine Treppe zahlt Rankgerüst, nicht Blätterdach", () => {
    const treppe = withRun([0, 1, 2], "treppe");
    expect(resolveTrick(scen({ deck: greenRun(), growth: { X1: G }, formations: treppe, ...tier(P.RANKGERUEST, 0) }), noCrit).plantBase).toBe(3 * PT.rankgeruest[0].score);
    expect(resolveTrick(scen({ deck: greenRun(), growth: { X1: G }, formations: treppe, ...tier(P.BLAETTERDACH, 0) }), noCrit).plantBase).toBe(0);
  });
  it("eine graue Siegkarte zahlt nicht, auch nicht in einer grünen Formation", () => {
    const deck = deckOf((i) => (i === 0 || i === 2 ? { green: true } : {}));
    expect(resolveTrick(scen({ deck, formations: withRun([0, 1, 2]), ...tier(P.BLAETTERDACH, 0) }), noCrit).plantBase).toBe(0);
  });
  it("Jahresringe zahlt je Wachstumsstufe der Siegkarte, Episch zählt über der Blüh-Schwelle doppelt", () => {
    const deck = deckOf((i) => (i === 1 ? { green: true } : {}));
    const s = resolveTrick(scen({ deck, growth: { X1: 41 }, ...tier(P.JAHRESRINGE, 0) }), noCrit);
    expect(s.plantBase).toBe(Math.floor(42 / PT.jahresringe[0].per) * PT.jahresringe[0].score); // 41 + 1 Sieg
    const s2 = resolveTrick(scen({ deck, growth: { X1: B + 19 }, ...tier(P.JAHRESRINGE, 3) }), noCrit);
    const g = B + 20;
    expect(s2.plantBase).toBe(Math.floor((g + (g - B)) / 10) * PT.jahresringe[3].score);
  });
  it("Blütenlese: eine REIN grüne Formation zahlt einmal und lässt alle Karten darin wachsen", () => {
    const s = resolveTrick(scen({ deck: greenRun(), growth: { X1: G }, formations: withRun([0, 1, 2]), ...tier(P.BLUETENLESE, 0) }), noCrit);
    expect(s.plantBase).toBe(PT.bluetenlese[0].score);
    expect(s.growth.X0).toBe(PT.bluetenlese[0].growth);
    expect(s.growth.X2).toBe(PT.bluetenlese[0].growth);
    // eine gemischte Formation zahlt nichts
    const mixed = deckOf((i) => (i <= 1 ? { green: true } : {}));
    expect(resolveTrick(scen({ deck: mixed, growth: { X1: G }, formations: withRun([0, 1, 2]), ...tier(P.BLUETENLESE, 0) }), noCrit).plantBase).toBe(0);
  });
});

describe("Pflanze — die vier Formationshebel (§6.7, formations.js)", () => {
  const ord = (n) => Array.from({ length: n }, (_, i) => i);
  const bag = (id, t, growth = {}) => ({ skillTiers: { [id]: t }, growth });
  const forms = (deck, skills, plant) => computeFormations(ord(deck.length), deck, {}, [], skills, [], {}, null, plant);
  const hasType = (f, pos, type) => (f[pos].formations || []).some((x) => x.type === type);

  it("Gegenprobe: ohne gehaltenen Pflanzen-Skill ändert das Bündel nichts", () => {
    const deck = Array.from({ length: 10 }, (_, i) => ({ id: `C${i}`, suit: "R", value: 3 + i, green: true, bloom: true }));
    const a = JSON.stringify(forms(deck, [], null));
    expect(JSON.stringify(forms(deck, [], bag(P.SPALIER, 3, {})))).toBe(a);
    expect(JSON.stringify(forms(deck, ["SK_FIRE_01"], bag(P.WILDWUCHS, 3, {})))).toBe(a);
  });
  it("Spalier öffnet die Segmentgrenze mit den meisten grünen Karten daneben", () => {
    // Ein durchgehender Farbblock über die Grenze bei Position 4/5 — ohne Spalier endet er am Segment.
    const deck = Array.from({ length: 10 }, (_, i) => ({ id: `C${i}`, suit: "R", value: 5, green: true }));
    const before = forms(deck, [], null);
    const fb = (f, p) => (f[p].formations || []).find((x) => x.type === "farbblock");
    expect(fb(before, 4).len).toBe(5);
    const after = forms(deck, [P.SPALIER], bag(P.SPALIER, 0));
    expect(fb(after, 4).len).toBe(10);
  });
  it("Wildwuchs macht die am weitesten gewachsene blühende Karte zum Joker", () => {
    // Zwei gleiche Werte mit einer Fremdkarte dazwischen: erst der Joker verbindet sie zur Wiederholung.
    const deck = [
      { id: "A", suit: "R", value: 7 },
      { id: "J", suit: "B", value: 2, green: true, bloom: true },
      { id: "B", suit: "R", value: 7 },
    ];
    expect(hasType(forms(deck, [], null), 0, "wiederholung")).toBe(false);
    const f = forms(deck, [P.WILDWUCHS], bag(P.WILDWUCHS, 0, { J: 90 }));
    expect(hasType(f, 0, "wiederholung")).toBe(true);
    expect(f[0].formations.find((x) => x.type === "wiederholung").members).toEqual([0, 1, 2]);
  });
  it("Lücke lässt einen grünen Lauf eine fremde Karte überspringen und meldet sie", () => {
    const deck = [
      { id: "A", suit: "R", value: 5, green: true },
      { id: "F", suit: "B", value: 5 },
      { id: "B", suit: "R", value: 5, green: true },
      { id: "C", suit: "R", value: 5, green: true },
    ];
    expect(hasType(forms(deck, [], null), 0, "farbblock")).toBe(false);
    const f = forms(deck, [P.LUECKE], bag(P.LUECKE, 0));
    const fb = f[0].formations.find((x) => x.type === "farbblock");
    expect(fb.members).toEqual([0, 2, 3]);
    expect(fb.gapped).toEqual([1]);
  });
  it("Überwucherung senkt die Mindestlänge REIN grüner Formationen, nie unter zwei", () => {
    const deck = [
      { id: "A", suit: "R", value: 5, green: true },
      { id: "B", suit: "R", value: 5, green: true },
      { id: "C", suit: "Y", value: 9 },
      { id: "D", suit: "Y", value: 3 },
    ];
    expect(hasType(forms(deck, [], null), 0, "farbblock")).toBe(false); // Farbblock erst ab 3
    const f = forms(deck, [P.UEBERWUCHERUNG], bag(P.UEBERWUCHERUNG, 2)); // 50 % Feld grün → Schwelle erreicht
    expect(hasType(f, 0, "farbblock")).toBe(true);
    expect(f[0].formations.find((x) => x.type === "farbblock").members).toEqual([0, 1]);
    // unter der Feldschwelle bleibt alles beim Alten
    expect(hasType(forms(deck, [P.UEBERWUCHERUNG], bag(P.UEBERWUCHERUNG, 0)), 0, "farbblock")).toBe(false);
  });
});

describe("Pflanze — die vier Legendären (§6.5)", () => {
  const ord = (n) => Array.from({ length: n }, (_, i) => i);
  const forms = (deck, skills, plant = null) => computeFormations(ord(deck.length), deck, {}, [], skills, [], {}, null, plant);
  it("Baumreihe: blühende Karten bilden eine positionsfreie Wiederholung", () => {
    const deck = Array.from({ length: 8 }, (_, i) => ({ id: `C${i}`, suit: ["R", "B"][i % 2], value: i + 2, bloom: i % 4 === 0, green: i % 4 === 0 }));
    expect(forms(deck, [])[0].formations.some((f) => f.type === "wiederholung")).toBe(false);
    const f = forms(deck, [P.BAUMREIHE]);
    const w = f[0].formations.find((x) => x.type === "wiederholung");
    expect(w.members).toEqual([0, 4]);
    expect(f[4].mult).toBeGreaterThan(1); // die zweite blühende Karte trägt den Wiederholungs-Faktor
  });
  it("Wurzelgeflecht: JEDE blühende Karte zählt in jeder Formation ihres Segments mit", () => {
    // Treppe 3-5-7 aus grünen Karten; die blühende Karte auf Platz 3 bricht sie (7 → 7) und ist NICHT ihr Mitglied.
    const seg0 = [
      { id: "A", suit: "R", value: 3, green: true },
      { id: "B", suit: "R", value: 5, green: true },
      { id: "C", suit: "R", value: 7, green: true },
      { id: "M", suit: "R", value: 7, green: true, bloom: true },
      { id: "X", suit: "Y", value: 1 },
    ];
    const plain = forms(seg0, []);
    expect(plain[3].formations.some((f) => f.type === "treppe")).toBe(false);
    const f = forms(seg0, [P.WURZELGEFLECHT]);
    expect(f[3].formations.some((x) => x.type === "treppe")).toBe(true);
    expect(f[0].formations.find((x) => x.type === "treppe").members).toContain(3);
    // Das NÄCHSTE Segment bleibt unberührt: die Treppe dort kennt die blühende Karte aus Segment 0 nicht.
    const wide = [...seg0.map((c) => ({ ...c })),
      { id: "D", suit: "Y", value: 2 }, { id: "E", suit: "Y", value: 4 }, { id: "F", suit: "Y", value: 6 }];
    const f2 = forms(wide, [P.WURZELGEFLECHT]);
    expect(f2[5].formations.some((x) => x.type === "treppe")).toBe(true);
    expect(f2[5].formations.every((x) => !x.members.includes(3))).toBe(true);
  });
  it("Ewiger Frühling: ist das Feld vollständig grün, blüht alles", () => {
    const deck = deckOf((i) => (i === 1 ? {} : { green: true }));
    const s = resolveTrick(scen({ deck, skills: [P.EWIGER_FRUEHLING], growth: { X1: G - 1 } }), noCrit);
    expect(greenCount(s.deck)).toBe(N);
    expect(s.deck.every((c) => c.bloom)).toBe(true);
  });
  it("Ewiger Frühling (§6.13): blühende Karten kämpfen stärker — der einzige Wert-Hebel der Fraktion", () => {
    // Reiner Helfer: nur blühend und nur mit dem Skill.
    const bloomCard = { id: "X1", bloom: true }, greenCard = { id: "X1", green: true };
    expect(plantValueBonus([P.EWIGER_FRUEHLING], bloomCard)).toBe(C.EWIGER_FRUEHLING_BLOOM_VALUE);
    expect(plantValueBonus([P.EWIGER_FRUEHLING], greenCard)).toBe(0);   // grün reicht nicht
    expect(plantValueBonus([P.BAUMREIHE], bloomCard)).toBe(0);          // ohne den Skill nichts
    expect(plantValueBonus([], null)).toBe(0);
    // In der Engine: dieselbe blühende Karte gewinnt den Stich, den sie ohne den Skill verliert.
    const deck = deckOf((i) => (i === 1 ? { bloom: true, green: true } : {}));
    const bonus = C.EWIGER_FRUEHLING_BLOOM_VALUE;
    const over = { deck, oppDeck: constDeck(5 + bonus - 1), growth: { X1: B } };
    const with_ = resolveTrick(scen({ ...over, skills: [P.EWIGER_FRUEHLING] }), noCrit);
    expect(with_.lastTrick.pValue).toBe(5 + bonus);
    expect(with_.lastTrick.result).toBe("win");
    const without = resolveTrick(scen({ ...over, skills: [P.BAUMREIHE] }), noCrit);
    expect(without.lastTrick.pValue).toBe(5);
    expect(without.lastTrick.result).not.toBe("win");
  });
  it("Ewiger Frühling (§6.15): ein Sieg mit blühender Karte zählt je Formation mehr — der einzige Multiplikator der Fraktion", () => {
    const m = C.EWIGER_FRUEHLING_FORM_MULT;
    const two = { mult: 1, baseMult: 1, formations: [
      { type: "farbblock", ordinal: 2, factor: 1.35, members: [0, 1] },
      { type: "treppe", ordinal: 2, factor: 1.35, members: [1, 2] },
      { type: "anker", ordinal: 1, factor: 1.25 }, // Meta-Faktor ohne Mitglieder: zählt für die Pflanze nicht
    ] };
    const bloomCard = { id: "X1", bloom: true };
    expect(plantFormMult([P.EWIGER_FRUEHLING], bloomCard, two)).toBeCloseTo(1 + 2 * m, 9);
    expect(plantFormMult([P.EWIGER_FRUEHLING], bloomCard, noForm()[0])).toBe(1);       // ohne Formation
    expect(plantFormMult([P.EWIGER_FRUEHLING], { id: "X1", green: true }, two)).toBe(1); // grün reicht nicht
    expect(plantFormMult([P.BAUMREIHE], bloomCard, two)).toBe(1);                      // ohne den Skill
    // In der Engine: derselbe Faktor steht im Sieg-Stack.
    const deck = deckOf((i) => (i === 1 ? { bloom: true, green: true } : {}));
    const f = withRun([0, 1, 2]);
    const over = { deck, formations: f, growth: { X1: B } };
    const on = resolveTrick(scen({ ...over, skills: [P.EWIGER_FRUEHLING] }), noCrit);
    expect(on.lastTrick.breakdown.plantMult).toBeCloseTo(1 + m, 9); // ein Lauf an der Position
    expect(resolveTrick(scen({ ...over, skills: [P.BAUMREIHE] }), noCrit).lastTrick.breakdown.plantMult).toBe(1);
  });
});

describe("Pflanze — reine Helfer", () => {
  it("growthOnWin: Passiv-Satz plus Satz je Formation", () => {
    expect(growthOnWin([], {}, { formCount: 0 })).toBe(C.PLANT_GROWTH_WIN);
    expect(growthOnWin([], {}, { formCount: 3 })).toBe(C.PLANT_GROWTH_WIN + 3 * C.PLANT_GROWTH_PER_FORMATION);
  });
  it("greenCount zählt die Karten mit Grün-Flag", () => {
    expect(greenCount([{ green: true }, {}, { green: true, bloom: true }])).toBe(2);
  });
});
