import { describe, it, expect } from "vitest";
import { reducer, initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";

// Eis-Neudesign (docs §2.1): Gletscher-Wahl läuft nach JEDEM Eis-Skill-Pick (Phase "glacier-target", Pflicht, genau 1).
// GLACIER_LOCK bestätigt die Wahl → Karte STARR auf ihrer Zelle, danach zurück zu "play".
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const lockedArr = (...idx) => { const a = new Array(40).fill(false); for (const i of idx) a[i] = true; return a; };
// Gletscher-Wahl-Schritt (nach Eis-Skill-Pick).
const pickState = (over = {}) => ({
  ...initialState(makeRng(1)),
  phase: "glacier-target", activeArchetypes: ["ice"], deck: flat(), playerOrder: identity(),
  glacierLocked: new Array(40).fill(false), ...over,
});
// Formationsphase (für die Starr-Respektierung von SWAP).
const formState = (over = {}) => ({
  ...initialState(makeRng(1)),
  phase: "formation", activeArchetypes: ["ice"], deck: flat(), playerOrder: identity(),
  formationEnergy: 5, formationSwaps: [], glacierLocked: new Array(40).fill(false), ...over,
});

describe("PICK_SKILL — Eis öffnet die Gletscher-Wahl", () => {
  it("ein Eis-Skill-Pick geht in die glacier-target-Phase", () => {
    const st = { ...initialState(makeRng(1)), phase: "levelup", skills: [], skillOffer: ["SK_ICE_01"], activeArchetypes: [] };
    const s = reducer(st, { type: "PICK_SKILL", skillId: "SK_ICE_01" });
    expect(s.skills).toContain("SK_ICE_01");
    expect(s.activeArchetypes).toContain("ice");
    expect(s.phase).toBe("glacier-target");
  });
  it("ein Nicht-Eis-Skill-Pick geht direkt zu play", () => {
    const st = { ...initialState(makeRng(1)), phase: "levelup", skills: [], skillOffer: ["SK_LIGHTNING_01"], activeArchetypes: [] };
    const s = reducer(st, { type: "PICK_SKILL", skillId: "SK_LIGHTNING_01" });
    expect(s.phase).toBe("play");
  });
});

describe("GLACIER_LOCK — Gletscher-Wahl bestätigen", () => {
  it("fixiert die Position und geht zurück zu play", () => {
    const s = reducer(pickState(), { type: "GLACIER_LOCK", pos: 3 });
    expect(s.glacierLocked[3]).toBe(true);
    expect(s.glacierLocked[2]).toBe(false);
    expect(s.phase).toBe("play");
  });
  it("No-op außerhalb der glacier-target-Phase", () => {
    const s = pickState({ phase: "formation" });
    expect(reducer(s, { type: "GLACIER_LOCK", pos: 3 })).toBe(s);
  });
  it("No-op ohne aktiven Gletscher-Archetyp", () => {
    const s = pickState({ activeArchetypes: [] });
    expect(reducer(s, { type: "GLACIER_LOCK", pos: 3 })).toBe(s);
  });
  it("No-op bei ungültiger Position", () => {
    const s = pickState();
    expect(reducer(s, { type: "GLACIER_LOCK", pos: 40 })).toBe(s);
    expect(reducer(s, { type: "GLACIER_LOCK", pos: -1 })).toBe(s);
  });
  it("ungültige Wahl: schon gefrorenes Feld → unveränderter State", () => {
    const s = pickState({ glacierLocked: lockedArr(3) });
    expect(reducer(s, { type: "GLACIER_LOCK", pos: 3 })).toBe(s);
  });
});

describe("DECLINE_SKILL — Ablehnen ab genug Eis-Skills friert trotzdem einen Gletscher", () => {
  const ice6 = ["SK_ICE_01", "SK_ICE_02", "SK_ICE_03", "SK_ICE_04", "SK_ICE_05", "SK_ICE_06"];
  const levelupIce = (skills, over = {}) => ({
    ...initialState(makeRng(1)),
    phase: "levelup", activeArchetypes: ["ice"], deck: flat(), playerOrder: identity(),
    skills, skillOffer: ["SK_ICE_10"], glacierLocked: new Array(40).fill(false), ...over,
  });
  it("ab der Schwelle (4 Eis-Skills): Ablehnen öffnet die Gletscher-Wahl, danach kommt das Perk-Angebot", () => {
    let s = reducer(levelupIce(ice6.slice(0, 4)), { type: "DECLINE_SKILL", rng: makeRng(2) });
    expect(s.phase).toBe("glacier-target");
    expect(s.pendingPerkOffer).toBeTruthy();          // Perk geparkt
    s = reducer(s, { type: "GLACIER_LOCK", pos: 0 });
    expect(s.glacierLocked[0]).toBe(true);            // Gletscher gesetzt
    expect(s.phase).toBe("levelup");                  // Perk-Angebot wird aufgemacht
    expect(s.offer).toBeTruthy();
    expect(s.pendingPerkOffer).toBeNull();            // geparktes Angebot verbraucht
  });
  it("unter der Schwelle (3 Eis-Skills): Ablehnen gibt nur ein Perk, keinen Gletscher", () => {
    const s = reducer(levelupIce(ice6.slice(0, 3)), { type: "DECLINE_SKILL", rng: makeRng(2) });
    expect(s.phase).not.toBe("glacier-target");
    expect((s.glacierLocked || []).filter(Boolean).length).toBe(0);
  });
  it("kein freies Feld mehr → kein Gletscher (fällt auf das normale Perk-Angebot zurück)", () => {
    const s = reducer(levelupIce(ice6, { glacierLocked: new Array(40).fill(true) }), { type: "DECLINE_SKILL", rng: makeRng(2) });
    expect(s.phase).not.toBe("glacier-target");
  });
});

describe("SWAP_CARDS — Fixierung respektieren", () => {
  it("verweigert den Tausch, wenn Position i ein gefrorener Gletscher ist", () => {
    const locked = formState({ glacierLocked: lockedArr(0) });
    expect(reducer(locked, { type: "SWAP_CARDS", i: 0, j: 1 })).toBe(locked);
  });
  it("verweigert den Tausch, wenn Position j ein gefrorener Gletscher ist", () => {
    const locked = formState({ glacierLocked: lockedArr(1) });
    expect(reducer(locked, { type: "SWAP_CARDS", i: 0, j: 1 })).toBe(locked);
  });
  it("erlaubt den Tausch zweier freier Positionen, auch wenn andere gefroren sind", () => {
    const locked = formState({ glacierLocked: lockedArr(0) });
    const s = reducer(locked, { type: "SWAP_CARDS", i: 2, j: 3 });
    expect(s.playerOrder[2]).toBe(3);
    expect(s.playerOrder[3]).toBe(2);
    expect(s.glacierLocked[0]).toBe(true); // Fixierung unberührt
  });
});
