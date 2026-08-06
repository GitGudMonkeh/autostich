import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { precomputeGlacier, glacierOpts, ROLES, RESET_TO } from "../src/game/glacier.js";

// Eis-Neudesign Phase 3.2 Gruppe A — Snapshot-Modifikatoren (Rissbildung/Zermalmen/Abbruchkante).
// Getrieben über state.glacierRoles (noch nicht im Skill-Angebots-Pool → kein 5.-Archetyp-Leak). Werte Platzhalter.
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["glacier"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});

describe("glacierOpts — Rollen → Snapshot-opts", () => {
  it("baut opts nur für aktive Rollen, komponiert additiv", () => {
    expect(glacierOpts([])).toEqual({});
    expect(glacierOpts([ROLES.RISSBILDUNG])).toHaveProperty("burstAt");
    const all = glacierOpts([ROLES.RISSBILDUNG, ROLES.ZERMALMEN, ROLES.ABBRUCHKANTE]);
    expect(all).toHaveProperty("burstAt");
    expect(all).toHaveProperty("kollisionMult");
    expect(all).toHaveProperty("tierMult");
  });
});

describe("Rissbildung — senkt die Berst-Schwelle (Tempo)", () => {
  it("bricht schon bei Masse 6 (statt erst ab 12)", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 6;
    const base = resolveTrick(scen({ glacierLocked, glacierMass }), noCrit);
    const riss = resolveTrick(scen({ glacierLocked, glacierMass, glacierRoles: [ROLES.RISSBILDUNG] }), noCrit);
    expect(base.lastTrick.breakdown?.glacierDirect ?? 0).toBe(0); // Masse 6 < 12: hält
    expect(riss.lastTrick.breakdown.glacierDirect).toBeGreaterThan(0);
  });
});

describe("Zermalmen — Kollision stärker", () => {
  it("mit Gletscher-Nachbar größerer Burst als ohne Zermalmen", () => {
    const glacierLocked = falses(); glacierLocked[0] = true; glacierLocked[1] = true; // Nachbarn (pos 0,1 = Zeile 0)
    const glacierMass = zeros(); glacierMass[0] = 12; glacierMass[1] = 12;
    const base = resolveTrick(scen({ glacierLocked, glacierMass }), noCrit);
    const zerm = resolveTrick(scen({ glacierLocked, glacierMass, glacierRoles: [ROLES.ZERMALMEN] }), noCrit);
    expect(zerm.lastTrick.breakdown.glacierDirect).toBeGreaterThan(base.lastTrick.breakdown.glacierDirect);
  });
});

describe("Abbruchkante — steilere Stufen", () => {
  it("höhere Stufe zahlt mit Abbruchkante mehr als ohne", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 12; // Stufe 3
    const base = resolveTrick(scen({ glacierLocked, glacierMass }), noCrit);
    const abb = resolveTrick(scen({ glacierLocked, glacierMass, glacierRoles: [ROLES.ABBRUCHKANTE] }), noCrit);
    expect(abb.lastTrick.breakdown.glacierDirect).toBeGreaterThan(base.lastTrick.breakdown.glacierDirect);
  });
});

describe("Rissbildung — Abkalben nach frühem Bruch", () => {
  it("bricht bei Masse 6 und kalbt auf RESET_TO zurück", () => {
    const { resetMass, breaks } = precomputeGlacier(
      (() => { const m = zeros(); m[0] = 6; return m; })(), new Set([0]), glacierOpts([ROLES.RISSBILDUNG]));
    expect(breaks).toHaveLength(1);
    expect(resetMass[0]).toBe(RESET_TO);
  });
});
