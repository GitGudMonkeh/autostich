import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import {
  neighbors4, neighbors8, glacierClusters, packeisTick, verzahnungTick, ROLES, EWIGER_FROST,
  PACKEIS_RADIUS as R, PACKEIS_RADIUS_BRIDGE as R_BRIDGE,
} from "../src/game/glacier.js";
import { iceNeighborFn, icePackeisRadius } from "../src/game/factions/ice.js";
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

/* §5.31 (Owner): Packeis hat die Seite gewechselt — es zählt die OFFENEN Nachbarn, nicht die gefrorenen. Es war der
   reinste Mono-Skill der Fraktion (+24 % mono, −8 %/−8 % im Mix); jetzt ist es die zweite Masse-Quelle eines dünn
   gebauten Eis-Anteils. Die Wächter halten die Umkehr fest, damit sie nicht versehentlich zurückkippt. */
describe("Packeis — Masse je offenem Feld im Umkreis", () => {
  it("WENIGER Gletscher in Reichweite → mehr Masse", () => {
    const allein = packeisTick(zeros(), lockAt(0), R, PACKEIS_PER_NEIGHBOR);
    const zuZweit = packeisTick(zeros(), lockAt(0, 1), R, PACKEIS_PER_NEIGHBOR);
    expect(allein[0]).toBe(8 * PACKEIS_PER_NEIGHBOR);   // Ecke pos0, Umkreis 2: Zeilen 0-2 × Spalten 0-2 minus sich selbst
    expect(zuZweit[0]).toBe(7 * PACKEIS_PER_NEIGHBOR);  // eines davon ist jetzt Eis
    expect(zuZweit[0]).toBeLessThan(allein[0]);
  });
  /* Owner-Runde 2026-09-12: „voll umschlossen zahlt gar nichts" war die alte Zusicherung und ist AUFGEHOBEN —
     genau darin bestand der Deckel, der Packeis zum Schlusslicht machte (ein Gletscher grenzt an höchstens vier
     Felder, also stand sein Einkommen bei zwölf geballten Gletschern auf demselben Wert wie bei sechs). Die
     Umkehr aus §5.31 gilt weiter und wird hier weiter gehalten, nur als Verhältnis statt als Null. */
  it("dicht gebaut zahlt weniger als allein, aber nicht mehr null", () => {
    const mid = posOf(1, 1);
    const allein = packeisTick(zeros(), lockAt(mid), R, PACKEIS_PER_NEIGHBOR);
    const dicht = packeisTick(zeros(), lockAt(mid, posOf(0, 1), posOf(2, 1), posOf(1, 0), posOf(1, 2)), R, PACKEIS_PER_NEIGHBOR);
    expect(allein[mid]).toBe(15 * PACKEIS_PER_NEIGHBOR);       // Umkreis 2 um (1,1): 4×4 Felder minus sich selbst
    expect(dicht[mid]).toBe(11 * PACKEIS_PER_NEIGHBOR);        // vier davon sind jetzt Eis
    expect(dicht[mid]).toBeLessThan(allein[mid]);
    expect(dicht[mid]).toBeGreaterThan(0);
  });
  it("Eisbrücke schiebt den Umkreis eine Stufe weiter (Ecke pos0: 8 → 15 Felder)", () => {
    expect(icePackeisRadius([])).toBe(R);
    expect(icePackeisRadius([ROLES.EISBRUECKE])).toBe(R_BRIDGE);
    const ortho = packeisTick(zeros(), lockAt(0), icePackeisRadius([]), PACKEIS_PER_NEIGHBOR);
    const bridge = packeisTick(zeros(), lockAt(0), icePackeisRadius([ROLES.EISBRUECKE]), PACKEIS_PER_NEIGHBOR);
    expect(ortho[0]).toBe(8 * PACKEIS_PER_NEIGHBOR);
    expect(bridge[0]).toBe(15 * PACKEIS_PER_NEIGHBOR);
  });
  it("Engine: Packeis lädt am Durchlauf-Ende zusätzlich zu Ewiger Frost", () => {
    /* §8: die absolute Masse enthält jetzt auch die Boden-Abgabe (Zug). Gemessen wird deshalb der UNTERSCHIED
       zwischen Lauf mit und ohne die Rolle — das ist genau, was der Wächter benennt, und er hält auch dann,
       wenn am Einkommen weiter geschraubt wird. */
    const bau = (roles) => runCycle(scen({ glacierLocked: lockAt(0, 1), glacierRoles: roles, oppDeck: oppOf(99) }));
    const mit = bau([ROLES.PACKEIS]), ohne = bau([]);
    expect(mit.glacierMass[0] - ohne.glacierMass[0]).toBeCloseTo(7 * PACKEIS_PER_NEIGHBOR, 6); // Ecke pos0 mit Eis auf pos1: 7 offene Felder im Umkreis 2
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
