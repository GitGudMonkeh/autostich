import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { ROLES, WIN_MASS, ANFRIEREN_WIN, ANFRIEREN_FORM, SCHNEETREIBEN_DRIFT, DAUERFROST_BASE, EWIGER_FROST } from "../src/game/glacier.js";

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
  activeArchetypes: ["glacier"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
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

describe("Schneetreiben — Verwehung aufs Nachbarfeld", () => {
  it("gewinnt ein Gletscher, verweht er Masse auf ein NICHT-Gletscher-Nachbarfeld", () => {
    const glacierLocked = falses(); glacierLocked[0] = true; // Nachbarn von pos0: pos5 (unten), pos1 (rechts) — beide frei
    const s = resolveTrick(scen({ glacierLocked, glacierRoles: [ROLES.SCHNEETREIBEN] }), noCrit);
    // Baseline-Sieg +1 Masse, dann Verwehung von 1 → Gletscher netto 0, Nachbar +1.
    const drifted = s.glacierMass[5] + s.glacierMass[1];
    expect(drifted).toBe(SCHNEETREIBEN_DRIFT);
    expect(s.glacierMass[0]).toBe(WIN_MASS - SCHNEETREIBEN_DRIFT); // 1 − 1 = 0
  });
});

describe("Dauerfrost — offener Boden friert am tiefsten", () => {
  it("fernes freies Feld lädt voll, Feld neben einem Gletscher gedämpft; ohne Rolle bleibt 0", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;            // ein Gletscher an pos0
    const s = runCycle(scen({ oppDeck: oppOf(99), glacierLocked, glacierRoles: [ROLES.DAUERFROST] })); // alles verlieren → nur Boden-Frost
    expect(s.glacierMass[39]).toBe(DAUERFROST_BASE);                    // fern, 0 Gletscher-Nachbarn → voll
    expect(s.glacierMass[1]).toBeGreaterThan(0);                        // pos1 grenzt an pos0 → gedämpft
    expect(s.glacierMass[1]).toBeLessThan(s.glacierMass[39]);           // näher am Gletscher = weniger
    expect(s.glacierMass[0]).toBe(EWIGER_FROST);                        // der Gletscher selbst lädt über Ewiger Frost, nicht Dauerfrost
  });
  it("ohne Dauerfrost bleiben ungefrorene Felder leer", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const s = runCycle(scen({ oppDeck: oppOf(99), glacierLocked }));
    expect(s.glacierMass[39]).toBe(0);
  });
});
