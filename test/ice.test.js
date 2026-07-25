import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState, reducer } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { computeFormations } from "../src/game/formations.js";
import { frozenTargetFor, freezeCards, iceSkillCount, frozenCount, hasFrostGrip, hasPermafrost } from "../src/game/skills.js";

// Eis-Skill-IDs: 01 Frostgriff · 02 Kalte Präzision · 03 Eisschritt · 04 Frostbrücke · 05 Kältereserve
// 06 Kaltfront · 07 Eisanker · 08 Frostspur · 09 Stillstand · 10 Kristallform · L01 Frostbiss · L02 Permafrost.
const I01 = "SK_ICE_01", I02 = "SK_ICE_02", I03 = "SK_ICE_03", I04 = "SK_ICE_04", I05 = "SK_ICE_05",
  I06 = "SK_ICE_06", I07 = "SK_ICE_07", I08 = "SK_ICE_08", I09 = "SK_ICE_09", I10 = "SK_ICE_10",
  FROSTBISS = "SK_ICE_L01", PERMAFROST = "SK_ICE_L02";

const card = (id, suit, value, frozen = false) => ({ id, suit, baseRank: value, value, ...(frozen ? { frozen: true } : {}) });
const ord = (n) => Array.from({ length: n }, (_, i) => i);

describe("Eis — reine Helfer (#93 F3)", () => {
  it("frozenTargetFor: erster Skill friert 2, je weiterer +1, Frostgriff +2", () => {
    expect(frozenTargetFor([])).toBe(0);
    expect(frozenTargetFor([I02])).toBe(2);
    expect(frozenTargetFor([I02, I03])).toBe(3);
    expect(frozenTargetFor([I01])).toBe(4);        // Frostgriff: 2 + 2
    expect(frozenTargetFor([I01, I02])).toBe(5);   // 2 Skills (3) + Frostgriff (2)
    expect(hasFrostGrip([I01])).toBe(true);
    expect(iceSkillCount([I02, I03, "SK_LIGHTNING_01"])).toBe(2);
  });
  it("freezeCards friert count noch nicht eingefrorene Karten ein (immutabel)", () => {
    const deck = ord(5).map((i) => card(`c${i}`, "R", i + 1));
    const out = freezeCards(deck, 2, makeRng(1));
    expect(frozenCount(out)).toBe(2);
    expect(frozenCount(deck)).toBe(0); // Original unverändert
  });
});

describe("Eis — Formations-Wildcards (#93 F3)", () => {
  it("Kalte Präzision: eingefrorene Karte zählt für Wiederholung als Vorgängerwert", () => {
    const deck = [card("a", "R", 5), card("b", "B", 6, true)];
    expect(computeFormations([0, 1], deck, {}, [], [])[1].mult).toBeCloseTo(1);       // ohne Eis kein Paar
    expect(computeFormations([0, 1], deck, {}, [], [I02])[1].mult).toBeCloseTo(1.25); // 6→5 → Wiederholung
  });
  it("Eisschritt: eingefrorene Karte zählt für Treppen als ±1", () => {
    const deck = [card("a", "R", 3), card("b", "B", 5), card("c", "G", 5, true)];
    expect(computeFormations(ord(3), deck, {}, [], [])[0].formations.some((f) => f.type === "treppe")).toBe(false);
    expect(computeFormations(ord(3), deck, {}, [], [I03])[0].formations.some((f) => f.type === "treppe")).toBe(true);
  });
  it("Frostbrücke: eingefrorene Karte unterbricht keinen Farbblock (zählt selbst nicht)", () => {
    const deck = [card("a", "R", 1), card("b", "R", 2), card("c", "B", 3, true), card("d", "R", 4)];
    expect(computeFormations(ord(4), deck, {}, [], [])[0].formations.some((f) => f.type === "farbblock")).toBe(false);
    const withIce = computeFormations(ord(4), deck, {}, [], [I04]);
    expect(withIce.filter((p) => p.formations.some((f) => f.type === "farbblock")).length).toBe(3); // a,b,d
    expect(withIce[2].formations.some((f) => f.type === "farbblock")).toBe(false);                   // c (frozen) kein Mitglied
  });
  it("Kristallform: eingefrorene Karte zählt für Wiederholung als ±1", () => {
    const deck = [card("a", "R", 5), card("b", "B", 6, true)];
    expect(computeFormations([0, 1], deck, {}, [], [I10])[1].mult).toBeCloseTo(1.25); // 6→5
  });
  it("Kristallform: eingefrorene Karte ermöglicht einen Wechsel via ±1", () => {
    const deck = [card("a", "R", 10), card("b", "B", 5), card("c", "G", 8, true)]; // 5→8 = +3 (kein Wechsel)
    expect(computeFormations(ord(3), deck, {}, [], [])[0].formations.some((f) => f.type === "wechsel")).toBe(false);
    expect(computeFormations(ord(3), deck, {}, [], [I10])[0].formations.some((f) => f.type === "wechsel")).toBe(true); // 8→9 → +4
  });
  it("Permafrost: eingefrorene Karte ist Joker für Wiederholung", () => {
    const deck = [card("a", "R", 5), card("b", "B", 9, true)];
    expect(computeFormations([0, 1], deck, {}, [], [PERMAFROST])[0].formations.some((f) => f.type === "wiederholung")).toBe(true);
  });
  it("Eisanker: eingefrorene Karte ist ein Anker (×1,25, zählt als Formation)", () => {
    const deck = [card("a", "R", 5), card("b", "B", 9, true)];
    const out = computeFormations([0, 1], deck, {}, [], [I07]);
    expect(out[1].formations.some((f) => f.type === "anker")).toBe(true);
    expect(out[1].mult).toBeCloseTo(1.25);
    expect(out[0].formations.some((f) => f.type === "anker")).toBe(false); // pos 0 nicht eingefroren
  });
  it("ohne Eis-Skills bleiben eingefrorene Karten formationsneutral", () => {
    const deck = [card("a", "R", 5), card("b", "B", 9, true)];
    expect(computeFormations([0, 1], deck, {}, [], [])[1].mult).toBeCloseTo(1);
  });
});

// --- Engine-Integration ---
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const freezeFirst = (v) => constDeck(v).map((c, i) => (i === 0 ? { ...c, frozen: true } : c));
function scen(pVal, oVal, over = {}) {
  return { ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal),
    playerOrder: ord(40), oppOrder: ord(40), ...over };
}
const rng = makeRng(9);

describe("Eis — Engine-Integration (#93 F3)", () => {
  it("Permafrost: eingefrorene Karte +2 Kampfwert", () => {
    const s = resolveTrick(scen(10, 11, { deck: freezeFirst(10), skills: [PERMAFROST] }), rng);
    expect(s.lastTrick.pValue).toBe(12);
    expect(s.lastTrick.result).toBe("win");
  });
  it("Stillstand: eingefrorene Karte gewinnt in einer Formation → +200 Flat", () => {
    const s = resolveTrick(scen(10, 0, { deck: freezeFirst(10), skills: [I07, I09] }), rng); // Eisanker liefert die Formation
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.breakdown.flats).toBe(200);
  });
  it("Kältereserve: Niederlage mit eingefrorener Karte setzt +4 temp Wert (iceTemp)", () => {
    const deck = freezeFirst(5);
    const s = resolveTrick(scen(5, 12, { deck, skills: [I05] }), rng);
    expect(s.lastTrick.result).toBe("loss");
    expect(s.iceTemp[deck[0].id]).toBe(4);
  });
  it("iceTemp wird beim nächsten Auftauchen als Wertbonus angewandt und verbraucht", () => {
    const deck = freezeFirst(5);
    const s = resolveTrick(scen(5, 3, { deck, iceTemp: { [deck[0].id]: 4 } }), rng);
    expect(s.lastTrick.pValue).toBe(9);                 // 5 + 4
    expect(s.iceTemp[deck[0].id]).toBeUndefined();      // verbraucht
  });
  it("Frostbiss: Sieg mit eingefrorener Karte markiert 2 Gegnerkarten (pending)", () => {
    const s = resolveTrick(scen(12, 0, { deck: freezeFirst(12), skills: [FROSTBISS] }), rng);
    expect(s.lastTrick.result).toBe("win");
    expect(s.frostbitePending.length).toBe(2);
  });
  it("Frostbiss: aktive Marke senkt den Gegnerwert um 3 (nie < 0)", () => {
    expect(resolveTrick(scen(12, 5, { frostbiteActive: ["X0"] }), rng).lastTrick.oValue).toBe(2);
    expect(resolveTrick(scen(12, 2, { frostbiteActive: ["X0"] }), rng).lastTrick.oValue).toBe(0);
  });
});

// --- Reducer: Einfrieren & Frosttausche ---
const mkDeck = () => Array.from({ length: 40 }, (_, i) => ({ id: `d${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: (i % 10) + 1, value: (i % 10) + 1 }));
const iceLvl = (over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", deck: mkDeck(), playerOrder: ord(40), skillOffer: [I02], ...over });

describe("Eis — Reducer: Einfrieren & Frosttausche (#93 F3)", () => {
  it("erster Eis-Skill aktiviert Eis und friert 2 Karten ein", () => {
    const s = reducer(iceLvl(), { type: "PICK_SKILL", skillId: I02, rng });
    expect(s.activeArchetypes).toEqual(["ice"]);
    expect(frozenCount(s.deck)).toBe(2);
  });
  it("Frostgriff friert insgesamt 4 Karten ein (beim ersten Pick)", () => {
    const s = reducer(iceLvl({ skillOffer: [I01] }), { type: "PICK_SKILL", skillId: I01, rng });
    expect(frozenCount(s.deck)).toBe(4);
  });
  it("ein zweiter Eis-Skill friert genau eine weitere Karte ein (2 → 3)", () => {
    const first = reducer(iceLvl(), { type: "PICK_SKILL", skillId: I02, rng });
    const second = reducer({ ...first, phase: "levelup", skillOffer: [I03] }, { type: "PICK_SKILL", skillId: I03, rng });
    expect(frozenCount(second.deck)).toBe(3);
  });

  const frostForm = (over = {}) => {
    const deck = mkDeck().map((c, i) => (i === 0 ? { ...c, frozen: true } : c));
    return { ...initialState(makeRng(1)), phase: "formation", deck, playerOrder: [0, 1, 2, 3, 4],
      formationEnergy: 4, formationSwaps: [], frostSwapsUsed: [], skills: [I02],
      formations: computeFormations([0, 1, 2, 3, 4], deck, {}, [], [I02]), ...over };
  };
  it("Frosttausch ist kostenlos und markiert die Frostkarte; zweiter Tausch derselben Karte kostet Energie", () => {
    const st = frostForm();
    const free = reducer(st, { type: "SWAP_CARDS", i: 0, j: 3 }); // Karte 0 (frozen) tauschen
    expect(free.formationEnergy).toBe(4);                          // keine Energie verbraucht
    expect(free.frostSwapsUsed).toEqual([st.deck[0].id]);
    // die Frostkarte liegt jetzt an Position 3; erneut tauschen → bezahlt
    const paid = reducer(free, { type: "SWAP_CARDS", i: 3, j: 1 });
    expect(paid.formationEnergy).toBe(3);
  });
  it("UNDO gibt den freien Frosttausch zurück (keine Energie erstattet)", () => {
    const free = reducer(frostForm(), { type: "SWAP_CARDS", i: 0, j: 3 });
    const undone = reducer(free, { type: "UNDO_SWAP" });
    expect(undone.frostSwapsUsed).toEqual([]);
    expect(undone.formationEnergy).toBe(4);
    expect(undone.playerOrder).toEqual([0, 1, 2, 3, 4]);
  });
  it("Kaltfront setzt beim Bestätigen +3 temp Wert auf die getauschte Frostkarte", () => {
    const st = frostForm({ skills: [I02, I06] });
    const free = reducer(st, { type: "SWAP_CARDS", i: 0, j: 3 });
    const done = reducer(free, { type: "CONFIRM_FORMATION" });
    expect(done.phase).toBe("play");
    expect(done.iceTemp[st.deck[0].id]).toBe(3);
  });
});
