import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { firnDrawTick, eiszeitFlood, precomputeGlacier, ROLES, EISZEIT_FLOOD, FIRN_DRAW, EISZEIT_BURST_PER } from "../src/game/glacier.js";
import { iceSnapshotOpts } from "../src/game/factions/ice.js";
import { N_POS, posOf } from "../src/game/architect.js";

// Eis-Neudesign Phase 5 (L2) — Legendär Eiszeit (Flut + Auto-Lock). §5.2: Erstarrung gestrichen; die
// Gegner-Reichweite lebt als Stufenleiter von Einfrieren weiter (test/glacier-einfrieren.test.js).
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(N_POS).fill(0);
const falses = () => new Array(40).fill(false);
const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };
const noCrit = () => 0.99;
const mid = posOf(1, 1); // Innenfeld mit vier Nachbarn
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});
const runCycle = (s0) => { let s = s0; for (let i = 0; i < 40; i++) s = resolveTrick(s, noCrit); return s; };

/* §5.18: der ZUG ist Fundament geworden. Er gehörte bis dahin allein der Eiszeit — und ohne sie hatte die Reserve
   überhaupt keinen Ausgang außer „dieses Feld friert später ein" (gemessen 65 % totes Kapital, §5.17). Jetzt teilen
   sich Schneetreiben, Dauerfrost und die Eiszeit eine Währung, die immer ankommt. */
describe("Firn-Zug — jedes offene Feld gibt an den nächsten Gletscher", () => {
  it("ein einzelner Gletscher zieht vom GANZEN Brett, auch von fernen Feldern", () => {
    const reserve = new Array(40).fill(FIRN_DRAW);
    expect(firnDrawTick(reserve, zeros(), lockAt(0)).mass[0]).toBe(39 * FIRN_DRAW);
    // Der Punkt des Schritts: vorher endete der Zug am Ring, und Dauerfrost (Abstand ≥ 2) kam nie an.
    const fern = new Array(40).fill(0);
    fern[39] = FIRN_DRAW;                   // maximal weit von pos0 entfernt
    expect(firnDrawTick(fern, zeros(), lockAt(0)).mass[0]).toBe(FIRN_DRAW);
  });

  it("ein Feld gibt nur EINMAL ab, an den nächsten — nicht an jeden", () => {
    const reserve = new Array(40).fill(0);
    reserve[1] = FIRN_DRAW;                 // pos1 liegt zwischen pos0 und pos2, gleich weit
    const { mass } = firnDrawTick(reserve, zeros(), lockAt(0, 2));
    expect(mass[0] + mass[2]).toBe(FIRN_DRAW);
    // und näher gewinnt: pos1 liegt direkt an pos0, pos30 ist weit weg
    const r2 = new Array(40).fill(0); r2[1] = FIRN_DRAW;
    const m2 = firnDrawTick(r2, zeros(), lockAt(0, 30)).mass;
    expect(m2[0]).toBe(FIRN_DRAW);
    expect(m2[30]).toBe(0);
  });

  it("ohne Gletscher bleibt die Reserve liegen", () => {
    const reserve = new Array(40).fill(FIRN_DRAW);
    const { firn, mass } = firnDrawTick(reserve, zeros(), falses());
    expect(firn).toEqual(reserve);
    expect(mass.every((v) => v === 0)).toBe(true);
  });
});

describe("Eiszeit — die Flut (§5.15)", () => {
  it("flutet jedes ungefrorene Feld und friert dabei nichts ein", () => {
    const firn = eiszeitFlood(zeros(), lockAt(0));
    expect(firn[39]).toBe(EISZEIT_FLOOD);
    expect(firn[0]).toBe(0);                // unter dem Gletscher wird nicht geflutet
  });
});

describe("Eiszeit — Berstkraft aus offenem Boden (§5.16)", () => {
  it("der Bruch skaliert mit den OFFENEN Nachbarn — der Spiegel der Dichte-Kaskade", () => {
    const mass = new Array(40).fill(0); mass[mid] = 12;
    const opts = iceSnapshotOpts([ROLES.L_EISZEIT]);
    const frei = precomputeGlacier(mass, new Set([mid]), opts).payout[mid];       // vier offene Nachbarn
    const plain = precomputeGlacier(mass, new Set([mid]), {}).payout[mid];
    expect(frei / plain).toBeCloseTo(1 + 4 * EISZEIT_BURST_PER, 5);
    // Ecke pos0: nur zwei Nachbarn, also nur zwei Viertel Wucht.
    const eckMass = new Array(40).fill(0); eckMass[0] = 12;
    const ecke = precomputeGlacier(eckMass, new Set([0]), opts).payout[0];
    expect(ecke / precomputeGlacier(eckMass, new Set([0]), {}).payout[0]).toBeCloseTo(1 + 2 * EISZEIT_BURST_PER, 5);
  });

  it("auf vollem Brett gibt die Eiszeit nichts — die exakte Umkehrung des Ewigen Schilds", () => {
    const all = new Set(); for (let p = 0; p < 40; p++) all.add(p);
    const mass = new Array(40).fill(12);
    const mit = precomputeGlacier(mass, all, iceSnapshotOpts([ROLES.L_EISZEIT])).payout[mid];
    const ohne = precomputeGlacier(mass, all, {}).payout[mid];
    expect(mit).toBe(ohne);
  });
});

describe("Eiszeit — Engine", () => {
  it("über einen Durchlauf: Reserve geflutet, Masse gewachsen, kein Feld eingefroren", () => {
    const s = runCycle(scen({ glacierLocked: lockAt(0), glacierRoles: [ROLES.L_EISZEIT], oppDeck: oppOf(99) }));
    expect(s.firnStack[39]).toBeGreaterThan(0);            // #386: offener Boden sammelt Reserve
    expect(s.glacierLocked.filter(Boolean).length).toBe(1); // §5.15: die Eiszeit friert nichts mehr ein
    const ohne = runCycle(scen({ glacierLocked: lockAt(0), glacierRoles: [], oppDeck: oppOf(99) }));
    expect(s.glacierMass[0]).toBeGreaterThan(ohne.glacierMass[0]); // der Zug aus dem Boden schlägt bis in die Masse durch
  });
});
