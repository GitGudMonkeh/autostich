import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, menuState } from "../src/game/reducer.js";
import { BASE_REROLLS } from "../src/game/constants.js";

// Challenge-Lauf starten (profil-los → normalRerolls = BASE_REROLLS, damit die C1-Nullung sichtbar wird).
const start = (challengeMods, seed = 20260809) =>
  reducer(menuState(), { type: "START_RUN", rng: makeRng(seed), architect: true, seed, profile: null, challengeMods });

describe("Challenge-Verdrahtung (#301) im Reducer", () => {
  it("ohne Challenge: Reroll-Pools = BASE_REROLLS, keine gesperrten Felder", () => {
    const s = start([]);
    expect(s.rerollsPerk).toBe(BASE_REROLLS);
    expect(s.rerollsArch).toBe(BASE_REROLLS);
    expect(s.rerollsSkill).toBe(BASE_REROLLS);
    expect(s.challengeMods).toEqual([]);
    expect(s.challengeBlockArch).toEqual([]);
    expect(s.challengeBlockForm).toEqual([]);
  });

  it("C1 (Keine Rerolls): alle Reroll-Pools genullt (inkl. Legendär)", () => {
    const s = start(["c1"]);
    expect(s.rerollsPerk).toBe(0);
    expect(s.rerollsArch).toBe(0);
    expect(s.rerollsSkill).toBe(0);
    expect(s.rerollsLeg).toBe(0);
    expect(s.challengeMods).toEqual(["c1"]);
    expect(s.challengeBlockArch).toEqual([]); // ohne C2 kein Bau-Lock
  });

  it("C2: 10 gesperrte Bau-Zellen, deterministisch aus dem Seed", () => {
    const s = start(["c1", "c2"]);
    expect(s.challengeBlockArch).toHaveLength(10);
    expect(new Set(s.challengeBlockArch).size).toBe(10);           // verschieden
    for (const p of s.challengeBlockArch) { expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThan(40); }
    expect([...s.challengeBlockArch]).toEqual([...s.challengeBlockArch].sort((a, b) => a - b)); // sortiert
    expect(s.challengeBlockForm).toEqual([]);                       // ohne C3 kein Aufstell-Lock
    // gleicher Seed → gleiche Felder
    expect(start(["c1", "c2"]).challengeBlockArch).toEqual(s.challengeBlockArch);
  });

  it("C3: 10 gesperrte Aufstell-Zellen; unabhängig von den Bau-Zellen", () => {
    const s = start(["c1", "c2", "c3"]);
    expect(s.challengeBlockForm).toHaveLength(10);
    expect(new Set(s.challengeBlockForm).size).toBe(10);
    // eigener Adress-Strom → i. d. R. andere Felder als der Bau-Lock
    expect(s.challengeBlockForm.join(",")).not.toBe(s.challengeBlockArch.join(","));
    expect(start(["c1", "c2", "c3"]).challengeBlockForm).toEqual(s.challengeBlockForm);
  });

  it("verschiedene Seeds → (meist) verschiedene gesperrte Felder", () => {
    const a = start(["c1", "c2"], 111).challengeBlockArch.join(",");
    const b = start(["c1", "c2"], 222).challengeBlockArch.join(",");
    expect(a).not.toBe(b);
  });

  it("ungültiges Präfix (C2 ohne C1) → keine Modifikatoren aktiv", () => {
    const s = start(["c2"]);
    expect(s.challengeMods).toEqual([]);
    expect(s.challengeBlockArch).toEqual([]);
    expect(s.rerollsPerk).toBe(BASE_REROLLS); // C1 nicht aktiv → Rerolls normal
  });

  it("C3-Gate: SWAP_CARDS auf einer gesperrten Aufstell-Zelle wird abgelehnt (unverändert)", () => {
    const st = { phase: "formation", playerOrder: [0, 1, 2], deck: [{ id: "a" }, { id: "b" }, { id: "c" }],
      glacierLocked: [false, false, false], challengeBlockForm: [1], formationEnergy: 5, formationSwaps: [],
      roles: {}, perks: [], skills: [], familyTiers: {}, shop: { anchors: [] } };
    // i=1 ist gesperrt → identischer State zurück (Guard greift vor dem Energie-Verbrauch)
    expect(reducer(st, { type: "SWAP_CARDS", i: 0, j: 1 })).toBe(st);
    expect(reducer(st, { type: "SWAP_CARDS", i: 1, j: 2 })).toBe(st);
  });

  it("C3-Gate: GLACIER_LOCK auf einer gesperrten Zelle wird abgelehnt; freie Zelle friert normal ein", () => {
    const base = { phase: "glacier-target", activeArchetypes: ["ice"], playerOrder: [0, 1, 2],
      glacierLocked: [false, false, false], challengeBlockForm: [1], pendingPerkOffer: null };
    expect(reducer(base, { type: "GLACIER_LOCK", pos: 1 })).toBe(base); // gesperrt → abgelehnt
    const frozen = reducer(base, { type: "GLACIER_LOCK", pos: 0 });     // frei → friert ein
    expect(frozen.glacierLocked[0]).toBe(true);
    expect(frozen.phase).toBe("play");
  });
});
