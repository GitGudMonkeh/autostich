import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import {
  neighbors4, neighbors8, glacierClusters, packeisTick, verzahnungTick, ROLES, EWIGER_FROST,
} from "../src/game/glacier.js";
import { iceNeighborFn } from "../src/game/factions/ice.js";
import { EIS_TIERS as EIS } from "../src/game/skills.js"; // §5.3: die Zahlen stehen in der Stufenleiter (Normal = Zeile 0)
const PACKEIS_PER_NEIGHBOR = EIS.packeis[0].per, VERZAHNUNG_PER = EIS.verzahnung[0].per;
import { posOf } from "../src/game/architect.js";

// Eis-Neudesign Phase 3.2 Gruppe C1 — Cluster/Dichte (Packeis/Verzahnung) + Eisbrücke-Adjazenz. §5.2: Verschmelzen gestrichen.
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});
const runCycle = (s0) => { let s = s0; for (let i = 0; i < 40; i++) s = resolveTrick(s, noCrit); return s; };

describe("Nachbarschaft & Cluster", () => {
  it("neighbors8: Mitte 8, Ecke 3, Rand 5", () => {
    expect(neighbors8(posOf(3, 2))).toHaveLength(8);
    expect(neighbors8(posOf(0, 0))).toHaveLength(3);
    expect(neighbors8(posOf(0, 2))).toHaveLength(5);
  });
  it("glacierClusters: orthogonal verbunden = 1 Cluster; diagonal nur mit 8-Nachbarschaft", () => {
    expect(glacierClusters(lockAt(0, 1), neighbors4)).toHaveLength(1);       // pos0-pos1 orthogonal
    expect(glacierClusters(lockAt(0, posOf(1, 1)), neighbors4)).toHaveLength(2); // diagonal getrennt
    expect(glacierClusters(lockAt(0, posOf(1, 1)), neighbors8)).toHaveLength(1); // diagonal verbunden
  });
  it("iceNeighborFn: Eisbrücke → 8er, sonst 4er", () => {
    expect(iceNeighborFn([])).toBe(neighbors4);
    expect(iceNeighborFn([ROLES.EISBRUECKE])).toBe(neighbors8);
  });
});

describe("Packeis — Dichte-Bonus je Nachbar", () => {
  it("mehr Gletscher-Nachbarn → mehr Masse", () => {
    const out = packeisTick(zeros(), lockAt(0, 1), neighbors4, PACKEIS_PER_NEIGHBOR);
    expect(out[0]).toBe(PACKEIS_PER_NEIGHBOR);   // 1 Nachbar
  });
  it("Eisbrücke zählt Diagonalen (pos0 & pos(1,1))", () => {
    const ortho = packeisTick(zeros(), lockAt(0, posOf(1, 1)), neighbors4, PACKEIS_PER_NEIGHBOR);
    const bridge = packeisTick(zeros(), lockAt(0, posOf(1, 1)), neighbors8, PACKEIS_PER_NEIGHBOR);
    expect(ortho[0]).toBe(0);                     // diagonal zählt ohne Eisbrücke nicht
    expect(bridge[0]).toBe(PACKEIS_PER_NEIGHBOR); // mit Eisbrücke schon
  });
  it("Engine: Packeis lädt am Durchlauf-Ende zusätzlich zu Ewiger Frost", () => {
    /* §8: die absolute Masse enthält jetzt auch die Boden-Abgabe (Zug). Gemessen wird deshalb der UNTERSCHIED
       zwischen Lauf mit und ohne die Rolle — das ist genau, was der Wächter benennt, und er hält auch dann,
       wenn am Einkommen weiter geschraubt wird. */
    const bau = (roles) => runCycle(scen({ glacierLocked: lockAt(0, 1), glacierRoles: roles, oppDeck: oppOf(99) }));
    const mit = bau([ROLES.PACKEIS]), ohne = bau([]);
    expect(mit.glacierMass[0] - ohne.glacierMass[0]).toBeCloseTo(PACKEIS_PER_NEIGHBOR, 6);
    expect(ohne.glacierMass[0]).toBeGreaterThan(EWIGER_FROST); // ohne Rolle trägt der Boden bereits
  });
});

describe("Verzahnung — Cluster-Größe skaliert", () => {
  it("größeres Cluster → mehr Masse je Gletscher", () => {
    const small = verzahnungTick(zeros(), lockAt(0), neighbors4, VERZAHNUNG_PER);          // Cluster-Größe 1
    const big = verzahnungTick(zeros(), lockAt(0, 1, 2), neighbors4, VERZAHNUNG_PER);      // Cluster-Größe 3 (pos0-1-2 in Zeile 0)
    expect(small[0]).toBe(VERZAHNUNG_PER * 1);
    expect(big[0]).toBe(VERZAHNUNG_PER * 3);
    expect(big[0]).toBeGreaterThan(small[0]);
  });
});
