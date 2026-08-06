import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { ROLES, WIN_MASS, EISPANZER_MASS } from "../src/game/glacier.js";

// Eis-Neudesign Phase 3.2b2 — Eispanzer (Frostgriff): Niederlage NEBEN einem Gletscher ist folgenlos (Serie hält)
// und füttert Masse in die angrenzenden Gletscher. Loss-Branch.
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
// Gegner: pos0 schwach (Spieler-Sieg, baut Serie), pos1 stark (Spieler-Niederlage).
const oppMixed = () => { const o = Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: 1, value: 1 })); o[1] = { ...o[1], value: 99, baseRank: 99 }; return o; };
const falses = () => new Array(40).fill(false);
const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppMixed(), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: new Array(40).fill(0), glacierLocked: falses(), glacierRoles: [], ...over,
});
// pos0 spielen (Sieg → Serie 1), dann pos1 (Niederlage).
const winThenLose = (over) => { let s = resolveTrick(scen(over), noCrit); s = resolveTrick(s, noCrit); return s; };

describe("Eispanzer — abgeschirmte Nachbar-Niederlage", () => {
  it("Niederlage neben Gletscher hält die Serie UND füttert Masse in den Gletscher", () => {
    const s = winThenLose({ glacierLocked: lockAt(0), glacierRoles: [ROLES.EISPANZER] }); // Gletscher pos0, Niederlage pos1 (angrenzend)
    expect(s.lastTrick.result).toBe("loss");
    expect(s.winStreak).toBe(1);                          // Serie gehalten (folgenlos)
    expect(s.glacierMass[0]).toBe(WIN_MASS + EISPANZER_MASS); // pos0-Sieg (+1) + Eispanzer-Fütterung (+1)
  });

  it("ohne Eispanzer bricht dieselbe Niederlage die Serie und füttert nichts", () => {
    const s = winThenLose({ glacierLocked: lockAt(0) });
    expect(s.winStreak).toBe(0);
    expect(s.glacierMass[0]).toBe(WIN_MASS);              // nur der pos0-Sieg
  });

  it("Niederlage NICHT neben einem Gletscher wird nicht abgeschirmt", () => {
    const s = winThenLose({ glacierLocked: lockAt(39), glacierRoles: [ROLES.EISPANZER] }); // Gletscher fern (pos39)
    expect(s.winStreak).toBe(0);                          // pos1 grenzt nicht an pos39 → kein Schild
    expect(s.glacierMass[39]).toBe(0);
  });
});
