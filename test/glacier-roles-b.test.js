import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { ROLES, WIN_MASS, ANFRIEREN_WIN, ANFRIEREN_FORM, SCHNEETREIBEN_SEED, DAUERFROST_NEAR, DAUERFROST_FAR, EWIGER_FROST } from "../src/game/glacier.js";

// Eis-Neudesign Phase 3.2b — Masse-Quellen (Anfrieren / Schneetreiben / Dauerfrost). Getrieben über glacierRoles.
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const rep = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});
const runCycle = (s0) => { let s = s0; for (let i = 0; i < 40; i++) s = resolveTrick(s, noCrit); return s; };

describe("Anfrieren — Sieg → +Masse extra", () => {
  it("Sieg eines Gletschers addiert ANFRIEREN_WIN über die Baseline", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const base = resolveTrick(scen({ glacierLocked }), noCrit);                                  // pos 0, Sieg
    const anf = resolveTrick(scen({ glacierLocked, glacierRoles: [ROLES.ANFRIEREN] }), noCrit);
    expect(base.glacierMass[0]).toBe(WIN_MASS);                                                  // Baseline: nur +1
    expect(anf.glacierMass[0]).toBe(WIN_MASS + ANFRIEREN_WIN);                                   // +Anfrieren
  });
  it("Formations-Sieg friert doppelt an (ANFRIEREN_FORM obendrauf)", () => {
    // pos 0 = erste Wiederholungskarte (factor 1, zählt noch nicht als in-Formation); ab pos 1 greift die Formation.
    const glacierLocked = falses(); glacierLocked[1] = true;
    let s = scen({ deck: rep(12), glacierLocked, glacierRoles: [ROLES.ANFRIEREN] });
    s = resolveTrick(s, noCrit); // pos 0 (Snapshot; kein Gletscher hier)
    s = resolveTrick(s, noCrit); // pos 1 — Gletscher gewinnt IN Formation
    expect(s.lastTrick.formationMult).toBeGreaterThan(1);
    expect(s.glacierMass[1]).toBe(WIN_MASS + ANFRIEREN_WIN + ANFRIEREN_FORM);
  });
});

describe("Schneetreiben — additive Verwehung aufs Nachbarfeld", () => {
  it("leerer Gletscher (0 Masse) gibt seine Sieg-Masse ab (Transfer, netto 0)", () => {
    const glacierLocked = falses(); glacierLocked[0] = true; // Nachbarn von pos0: pos5 (unten), pos1 (rechts) — beide frei
    const s = resolveTrick(scen({ glacierLocked, glacierRoles: [ROLES.SCHNEETREIBEN] }), noCrit);
    expect(s.glacierMass[5] + s.glacierMass[1]).toBe(WIN_MASS); // Sieg-Masse wandert aufs Nachbarfeld
    expect(s.glacierMass[0]).toBe(0);                          // Gletscher netto 0
  });
  it("Gletscher mit Masse sät ADDITIV +SEED und behält seine Sieg-Masse", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const gm = zeros(); gm[0] = 5;
    const s = resolveTrick(scen({ glacierMass: gm, glacierLocked, glacierRoles: [ROLES.SCHNEETREIBEN] }), noCrit);
    expect(s.glacierMass[0]).toBe(5 + WIN_MASS);              // Gletscher behält seinen Sieg
    expect(s.glacierMass[5] + s.glacierMass[1]).toBe(SCHNEETREIBEN_SEED); // Nachbar zusätzlich +2
  });
});

describe("Dauerfrost — Firn-Boden nach Abstand zum Gletscher", () => {
  it("Abstand ≥3 → FAR, Abstand 2 → NEAR, 8er-Ring → 0; Gletscher lädt über Ewiger Frost", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;            // ein Gletscher an pos0 (0,0)
    const s = runCycle(scen({ oppDeck: oppOf(99), glacierLocked, glacierRoles: [ROLES.DAUERFROST] })); // alles verlieren → nur Boden-Frost
    expect(s.glacierMass[39]).toBe(DAUERFROST_FAR);                    // pos39 (7,4), Abstand 7 → +2
    expect(s.glacierMass[2]).toBe(DAUERFROST_NEAR);                    // pos2 (0,2), Abstand 2 → +1
    expect(s.glacierMass[1]).toBe(0);                                  // pos1 (0,1), Abstand 1 (8er-Ring) → 0
    expect(s.glacierMass[0]).toBe(EWIGER_FROST);                       // der Gletscher selbst lädt über Ewiger Frost, nicht Dauerfrost
  });
  it("ohne Dauerfrost bleiben ungefrorene Felder leer", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const s = runCycle(scen({ oppDeck: oppOf(99), glacierLocked }));
    expect(s.glacierMass[39]).toBe(0);
  });
});
