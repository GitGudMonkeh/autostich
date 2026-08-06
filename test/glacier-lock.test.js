import { describe, it, expect } from "vitest";
import { reducer, initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";

// Eis-Neudesign Phase 3.1 — Pick/Lock (docs §2.1): eine Karte als Gletscher picken fixiert sie STARR auf ihrer Zelle;
// eine gefrorene Position ist in künftigen Aufstellungen (SWAP_CARDS) unverschiebbar.
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const formState = (over = {}) => ({
  ...initialState(makeRng(1)),
  phase: "formation", activeArchetypes: ["ice"], deck: flat(), playerOrder: identity(),
  formationEnergy: 5, formationSwaps: [], glacierLocked: new Array(40).fill(false), ...over,
});

describe("GLACIER_LOCK — Gletscher picken", () => {
  it("fixiert die Position in der Formationsphase bei aktivem Gletscher", () => {
    const s = reducer(formState(), { type: "GLACIER_LOCK", pos: 3 });
    expect(s.glacierLocked[3]).toBe(true);
    expect(s.glacierLocked[2]).toBe(false);
  });
  it("No-op außerhalb der Formationsphase", () => {
    const s = formState({ phase: "play" });
    expect(reducer(s, { type: "GLACIER_LOCK", pos: 3 })).toBe(s);
  });
  it("No-op ohne aktiven Gletscher-Archetyp", () => {
    const s = formState({ activeArchetypes: [] });
    expect(reducer(s, { type: "GLACIER_LOCK", pos: 3 })).toBe(s);
  });
  it("No-op bei ungültiger Position", () => {
    const s = formState();
    expect(reducer(s, { type: "GLACIER_LOCK", pos: 40 })).toBe(s);
    expect(reducer(s, { type: "GLACIER_LOCK", pos: -1 })).toBe(s);
  });
  it("idempotent: schon gefroren → unveränderter State", () => {
    const s1 = reducer(formState(), { type: "GLACIER_LOCK", pos: 3 });
    expect(reducer(s1, { type: "GLACIER_LOCK", pos: 3 })).toBe(s1);
  });
});

describe("SWAP_CARDS — Fixierung respektieren", () => {
  it("verweigert den Tausch, wenn Position i ein gefrorener Gletscher ist", () => {
    const locked = reducer(formState(), { type: "GLACIER_LOCK", pos: 0 });
    expect(reducer(locked, { type: "SWAP_CARDS", i: 0, j: 1 })).toBe(locked);
  });
  it("verweigert den Tausch, wenn Position j ein gefrorener Gletscher ist", () => {
    const locked = reducer(formState(), { type: "GLACIER_LOCK", pos: 1 });
    expect(reducer(locked, { type: "SWAP_CARDS", i: 0, j: 1 })).toBe(locked);
  });
  it("erlaubt den Tausch zweier freier Positionen, auch wenn andere gefroren sind", () => {
    const locked = reducer(formState(), { type: "GLACIER_LOCK", pos: 0 });
    const s = reducer(locked, { type: "SWAP_CARDS", i: 2, j: 3 });
    expect(s.playerOrder[2]).toBe(3);
    expect(s.playerOrder[3]).toBe(2);
    expect(s.glacierLocked[0]).toBe(true); // Fixierung unberührt
  });
});
