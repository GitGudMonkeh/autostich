import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { WIN_MASS, EWIGER_FROST, TOP, RESET_TO } from "../src/game/glacier.js";

// Eis-Neudesign Phase 2 — Engine-Verdrahtung (isoliert über activeArchetypes "glacier").
// Deck bewusst flach (alternierende Farben/Werte) → an pos 0 KEINE Formation → isoliert die Gletscher-Mechanik.
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const noCrit = () => 0.99;

const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(5), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), ...over,
});
// Ganzen Durchlauf (40 Stiche) fahren, State zurückführen.
const runCycle = (s0) => { let s = s0; for (let i = 0; i < 40; i++) s = resolveTrick(s, noCrit); return s; };

describe("Gletscher — Snapshot & Auszahlung (Phase B)", () => {
  it("Gletscher über Schwelle bricht → Burst-Score landet im breakdown (Sieg) & im Ertrag-Kanal", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 12;         // reif (Berst-Schwelle)
    const s = resolveTrick(scen({ oppDeck: oppOf(1), glacierLocked, glacierMass }), noCrit); // pos 0, Spieler gewinnt
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.breakdown.glacierDirect).toBeGreaterThan(0);
    expect(s.glacierYield).toBe(s.lastTrick.breakdown.glacierDirect);
  });

  it("Bruch ist unabhängig vom Stich-Ausgang — zahlt auch bei Niederlage", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 12;
    const s = resolveTrick(scen({ oppDeck: oppOf(99), glacierLocked, glacierMass }), noCrit); // Spieler verliert
    expect(s.lastTrick.result).toBe("loss");
    expect(s.lastTrick.breakdown).toBeNull();                // Niederlage: kein Sieg-breakdown
    expect(s.lastTrick.gained).toBeGreaterThan(0);           // aber der Burst wurde ausgezahlt
    expect(s.glacierYield).toBeGreaterThan(0);
  });

  it("Nicht-gefrorenes Feld mit Masse bricht nie", () => {
    const glacierMass = zeros(); glacierMass[0] = 20;         // Masse, aber KEIN Lock
    const s = resolveTrick(scen({ oppDeck: oppOf(1), glacierMass }), noCrit);
    expect(s.lastTrick.breakdown.glacierDirect ?? 0).toBe(0);
    expect(s.glacierYield).toBe(0);
  });
});

describe("Gletscher — Masse-Fortschreibung", () => {
  it("Abkalben (RESET_TO) + Sieg-Masse am gebrochenen Feld: 12 → 0 (Reset) + 1 (Sieg)", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 12;
    const s = resolveTrick(scen({ oppDeck: oppOf(1), glacierLocked, glacierMass }), noCrit); // pos 0, Sieg
    expect(s.glacierMass[0]).toBe(RESET_TO + WIN_MASS); // 0 + 1
  });

  it("Ewiger Frost tickt genau einmal je Durchlauf (am Durchlauf-Ende)", () => {
    const glacierLocked = falses(); glacierLocked[5] = true;
    const glacierMass = zeros(); glacierMass[5] = 1;          // unter Schwelle → kein Bruch, keine Sieg-Masse (Feld 5 verliert vs opp 5? egal)
    const s = runCycle(scen({ oppDeck: oppOf(99), glacierLocked, glacierMass })); // alle Stiche verlieren → nur Ewiger Frost wirkt
    expect(s.glacierMass[5]).toBe(1 + EWIGER_FROST);
  });

  it("Überlauf über die höchste Stufe fließt als Score, Masse bleibt gedeckelt", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = TOP + 6;    // Stufe 3 + Überlauf 6
    const s = resolveTrick(scen({ oppDeck: oppOf(1), glacierLocked, glacierMass }), noCrit);
    expect(s.lastTrick.breakdown.glacierDirect).toBeGreaterThanOrEqual(6); // mind. der Überlauf
    expect(s.glacierMass[0]).toBe(RESET_TO + WIN_MASS);                    // abgekalbt (0) + 1, nicht 18
  });
});

describe("Baseline-Invarianz", () => {
  it("Ohne 'glacier'-Archetyp ist die Mechanik komplett inert (kein glacierDirect, keine Masse-Änderung)", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 12;
    const s = resolveTrick(scen({ activeArchetypes: [], oppDeck: oppOf(1), glacierLocked, glacierMass }), noCrit);
    expect(s.lastTrick.breakdown?.glacierDirect ?? 0).toBe(0);
    expect(s.glacierYield).toBe(0);
    expect(s.glacierMass[0]).toBe(12); // unangetastet
  });
});
