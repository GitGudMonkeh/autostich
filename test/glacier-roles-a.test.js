import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { precomputeGlacier, ROLES, RESET_TO } from "../src/game/glacier.js";
import { iceSnapshotOpts } from "../src/game/factions/ice.js";
import { EIS_TIERS as EIS } from "../src/game/skills.js"; // §5.3: die Zahlen stehen in der Stufenleiter (Normal = Zeile 0)


// Eis-Neudesign Phase 3.2 Gruppe A — Snapshot-Modifikatoren (Rissbildung/Abbruchkante). §5.2: Zermalmen gestrichen.
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
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});

describe("iceSnapshotOpts — Rollen und Stufe → Snapshot-opts", () => {
  it("baut opts nur für aktive Rollen, komponiert additiv", () => {
    expect(iceSnapshotOpts([])).toEqual({});
    expect(iceSnapshotOpts([ROLES.RISSBILDUNG]).burstAt).toBe(EIS.rissbildung[0].burstAt);
    const all = iceSnapshotOpts([ROLES.RISSBILDUNG, ROLES.ABBRUCHKANTE]);
    expect(all).toHaveProperty("burstAt");
    expect(all).toHaveProperty("tierMult");
  });
});

describe("Rissbildung — senkt die Berst-Schwelle (Tempo)", () => {
  it("bricht schon an seiner gesenkten Schwelle, wo ein normaler Gletscher noch hält", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = EIS.rissbildung[0].burstAt;
    const base = resolveTrick(scen({ glacierLocked, glacierMass }), noCrit);
    const riss = resolveTrick(scen({ glacierLocked, glacierMass, glacierRoles: [ROLES.RISSBILDUNG] }), noCrit);
    expect(base.lastTrick.breakdown?.glacierDirect ?? 0).toBe(0); // unter der normalen Schwelle 12: hält
    expect(riss.lastTrick.breakdown.glacierDirect).toBeGreaterThan(0);
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
  it("bricht an seiner gesenkten Schwelle und kalbt auf RESET_TO zurück", () => {
    const { resetMass, breaks } = precomputeGlacier(
      (() => { const m = zeros(); m[0] = EIS.rissbildung[0].burstAt; return m; })(), new Set([0]), iceSnapshotOpts([ROLES.RISSBILDUNG]));
    expect(breaks).toHaveLength(1);
    expect(resetMass[0]).toBe(RESET_TO);
  });
});
