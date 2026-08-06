import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { initialArchitect } from "../src/game/architect.js";
import { ROLES } from "../src/game/glacier.js";

// Eis-Neudesign Phase 3.2d — Verdichtung (Firn, Architekt-gekoppelt): der Gebäude-Wertbonus auf einem Gletscher
// wird im Kampf unterdrückt und stattdessen in Masse getankt.
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };
const noCrit = () => 0.99;
const B = (familyId, footprint, tier = 1) => ({ id: 1, familyId, tier, footprint: [...footprint].sort((a, b) => a - b), colorChoice: null });
// A_STUETZE gibt flachen Wert auf seine Abdeckung (pos 0,1) — unbedingt.
const withArch = () => ({ ...initialArchitect(), buildings: [B("A_STUETZE", [0, 1], 3)] });
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: lockAt(0), glacierRoles: [],
  architectEnabled: true, architect: withArch(), ...over,
});

describe("Verdichtung — Bauwert → Masse", () => {
  it("tankt den Architekt-Wertbonus auf dem Gletscher als Masse (mehr als ohne)", () => {
    const base = resolveTrick(scen({}), noCrit);                                   // Bauwert boostet Kampf, keine Konversion
    const verd = resolveTrick(scen({ glacierRoles: [ROLES.VERDICHTUNG] }), noCrit); // Bauwert → Masse
    expect(verd.glacierMass[0]).toBeGreaterThan(base.glacierMass[0]);
  });
  it("unterdrückt den Bauwert im Kampf (niedrigerer Kartenwert an der Position)", () => {
    const base = resolveTrick(scen({}), noCrit);
    const verd = resolveTrick(scen({ glacierRoles: [ROLES.VERDICHTUNG] }), noCrit);
    expect(verd.lastTrick.pValue).toBeLessThan(base.lastTrick.pValue); // Gebäude-Bonus im Kampf weg (in Masse gekippt)
  });
  it("ohne Gebäude auf dem Gletscher keine Extra-Masse", () => {
    const noArch = resolveTrick(scen({ architectEnabled: false, glacierRoles: [ROLES.VERDICHTUNG] }), noCrit);
    // pos0-Sieg gibt nur die Baseline-Win-Masse (kein Bauwert zum Tanken)
    expect(noArch.glacierMass[0]).toBe(1);
  });
});
