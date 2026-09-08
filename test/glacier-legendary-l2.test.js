import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { eiszeitTick, ROLES, EISZEIT_FLOOD, EISZEIT_DRAW } from "../src/game/glacier.js";
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

describe("eiszeitTick — Flut + Zug aus dem offenen Boden (§5.15)", () => {
  it("flutet jedes ungefrorene Feld und friert dabei nichts ein", () => {
    const locked = lockAt(0);
    const { firn, mass } = eiszeitTick(zeros(), zeros(), locked);
    expect(firn[39]).toBe(EISZEIT_FLOOD);   // fernes offenes Feld: geflutet, unangetastet
    expect(firn[0]).toBe(0);                // unter dem Gletscher wird nicht geflutet
    expect(mass.some((v, i) => i !== 0 && v > 0)).toBe(false); // kein zweiter Gletscher entstanden
  });

  it("der Gletscher zieht seine offenen Nachbarn leer — je mehr offener Boden, desto mehr Masse", () => {
    // pos0 (Ecke) hat zwei offene Nachbarn, das Innenfeld vier. Reserve reicht überall für den vollen Zug.
    const reserve = new Array(40).fill(EISZEIT_DRAW);
    const ecke = eiszeitTick(reserve, zeros(), lockAt(0));
    const innen = eiszeitTick(reserve, zeros(), lockAt(mid));
    expect(ecke.mass[0]).toBe(2 * EISZEIT_DRAW);
    expect(innen.mass[mid]).toBe(4 * EISZEIT_DRAW);
    // Was der Gletscher zieht, fehlt danach im Boden — die Reserve ist ein Vorrat, keine Quelle.
    expect(ecke.firn[1]).toBe(EISZEIT_DRAW + EISZEIT_FLOOD - EISZEIT_DRAW);
  });

  it("ein Feld gibt nur her, was es hat — zwei Gletscher teilen sich denselben Nachbarn", () => {
    const reserve = new Array(40).fill(0);
    reserve[1] = EISZEIT_DRAW;              // pos1 liegt zwischen pos0 und pos2
    const { mass } = eiszeitTick(reserve, zeros(), lockAt(0, 2), 0); // ohne Flut, damit nur der Vorrat zählt
    expect(mass[0] + mass[2]).toBe(EISZEIT_DRAW);
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
