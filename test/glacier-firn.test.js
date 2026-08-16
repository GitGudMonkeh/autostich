import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { reducer, initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { ROLES, DAUERFROST_FAR, TOP } from "../src/game/glacier.js";

// #386 Firn-Boden-Reserve — glacierMass (Gletscher-Eigenmasse) und firnStack (Boden-Reserve) sind getrennt: ein gefrorener
// Gletscher zieht zum Rundenstart aus seiner Reserve wieder auf die volle Masse (TOP=12) auf, nur die Differenz. Die Reserve
// ist ungedeckelt und leert sich Runde für Runde. Firn wird NIE unter einen Gletscher gesät.
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), firnStack: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});
const runCycle = (s0) => { let s = s0; for (let i = 0; i < 40; i++) s = resolveTrick(s, noCrit); return s; };

describe("#386 Runden-Start-Nachschub — Reserve füllt den Gletscher auf 12", () => {
  it("zieht am Rundenstart nur die DIFFERENZ zur Zielmasse aus der Reserve (Gletscher an pos3, noch nicht ausgezahlt)", () => {
    const glacierLocked = falses(); glacierLocked[3] = true;
    const glacierMass = zeros(); glacierMass[3] = 3;   // Eigenmasse aus der Vorrunde
    const firnStack = zeros(); firnStack[3] = 20;       // reichlich Reserve
    const s = resolveTrick(scen({ glacierMass, firnStack, glacierLocked }), noCrit); // pos0: Nachschub, pos3 noch nicht dran
    expect(s.glacierMass[3]).toBe(TOP);                 // 3 → 12 (nachgefüllt, vor dem Bruch sichtbar)
    expect(s.firnStack[3]).toBe(20 - (TOP - 3));        // nur die Differenz (9) gezogen → Reserve 11
  });

  it("nie über 12: eine riesige Reserve füllt exakt auf TOP, nicht höher", () => {
    const glacierLocked = falses(); glacierLocked[3] = true;
    const firnStack = zeros(); firnStack[3] = 100;
    const s = resolveTrick(scen({ firnStack, glacierLocked }), noCrit);
    expect(s.glacierMass[3]).toBe(TOP);                 // gedeckelt auf 12
    expect(s.firnStack[3]).toBe(100 - TOP);             // nur 12 gezogen, Rest bleibt Reserve
  });

  it("kein Nachschub ohne Reserve (leerer firnStack → Masse unverändert)", () => {
    const glacierLocked = falses(); glacierLocked[3] = true;
    const glacierMass = zeros(); glacierMass[3] = 4;
    const s = resolveTrick(scen({ glacierMass, glacierLocked }), noCrit); // firnStack default 0
    expect(s.glacierMass[3]).toBe(4);
    expect(s.firnStack[3]).toBe(0);
  });
});

describe("#386 Reserve leert sich über die Runden bis leer", () => {
  it("ein burstender Gletscher (pos3) zieht jede Runde nach, bis die Reserve aufgebraucht ist", () => {
    const glacierLocked = falses(); glacierLocked[3] = true;
    const firnStack = zeros(); firnStack[3] = 30;
    let s = scen({ firnStack, glacierLocked, oppDeck: oppOf(99) }); // alles verlieren → keine Sieg-Masse
    const reserves = [];
    // Zwischen den Durchläufen die (im echten Spiel per Level-Up-Entscheidung erledigte) Rückkehr in die play-Phase simulieren.
    for (let c = 0; c < 4; c++) { s = runCycle({ ...s, phase: "play" }); reserves.push(s.firnStack[3]); }
    // Reserve nimmt monoton ab und erreicht 0; die Masse bleibt dabei stets ≤ 12.
    for (let i = 1; i < reserves.length; i++) expect(reserves[i]).toBeLessThanOrEqual(reserves[i - 1]);
    expect(reserves[0]).toBeGreaterThan(0);      // nach Runde 1 noch Reserve übrig
    expect(reserves[reserves.length - 1]).toBe(0); // am Ende leer
  });
});

describe("#386 Firn wird nie unter einen Gletscher gesät", () => {
  it("Dauerfrost lädt offenen Boden in die Reserve, aber nicht das Gletscher-Feld selbst", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const s = runCycle(scen({ oppDeck: oppOf(99), glacierLocked, glacierRoles: [ROLES.DAUERFROST] }));
    expect(s.firnStack[0]).toBe(0);              // Gletscher-Feld bekommt keinen Firn
    expect(s.firnStack[39]).toBe(DAUERFROST_FAR); // fernes offenes Feld schon
  });

  it("Schneetreiben sät nichts, wenn alle Nachbarn Gletscher sind (kein Firn unter Eis)", () => {
    const glacierLocked = falses(); glacierLocked[0] = true; glacierLocked[1] = true; glacierLocked[5] = true; // beide Nachbarn von pos0 gefroren
    const glacierMass = zeros(); glacierMass[0] = 5; // Masse >0 → additiver Verwehungs-Zweig
    const s = resolveTrick(scen({ glacierMass, glacierLocked, glacierRoles: [ROLES.SCHNEETREIBEN] }), noCrit);
    expect(s.firnStack.every((v) => v === 0)).toBe(true); // nirgends Firn gesät
  });
});

describe("#386 Einfrieren übernimmt die Boden-Reserve, Gletscher startet leer", () => {
  it("GLACIER_LOCK setzt glacierMass[p]=0 und behält firnStack[p] als Reserve", () => {
    const firnStack = zeros(); firnStack[3] = 8;
    const st = { ...initialState(makeRng(1)), phase: "glacier-target", activeArchetypes: ["ice"],
      deck: flat(), playerOrder: identity(), glacierLocked: falses(), glacierMass: zeros(), firnStack };
    const s = reducer(st, { type: "GLACIER_LOCK", pos: 3 });
    expect(s.glacierLocked[3]).toBe(true);
    expect(s.glacierMass[3]).toBe(0);   // Gletscher startet leer
    expect(s.firnStack[3]).toBe(8);     // die angesammelte Reserve bleibt erhalten
  });

  it("nach dem Einfrieren füllt der Rundenstart den Gletscher aus der übernommenen Reserve", () => {
    const firnStack = zeros(); firnStack[3] = 8;
    const glacierLocked = falses(); glacierLocked[3] = true; // frisch gefroren, Masse 0
    const s = resolveTrick(scen({ firnStack, glacierLocked }), noCrit); // pos0-Nachschub
    expect(s.glacierMass[3]).toBe(8);   // aus der Reserve auf 8 gezogen (< 12 → alles)
    expect(s.firnStack[3]).toBe(0);     // Reserve aufgebraucht
  });
});
