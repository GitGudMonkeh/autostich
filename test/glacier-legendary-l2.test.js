import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { eiszeitTick, ROLES, EISZEIT_FLOOD } from "../src/game/glacier.js";
import { N_POS } from "../src/game/architect.js";

// Eis-Neudesign Phase 5 (L2) — Legendäre: Eiszeit (Flut + Auto-Lock) + Erstarrung (Gegner-Reichweite).
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(N_POS).fill(0);
const falses = () => new Array(40).fill(false);
const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };
const withMass = (pairs) => { const m = zeros(); for (const [p, v] of pairs) m[p] = v; return m; };
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["glacier"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});
const runCycle = (s0) => { let s = s0; for (let i = 0; i < 40; i++) s = resolveTrick(s, noCrit); return s; };

describe("eiszeitTick — Flut + Auto-Lock", () => {
  it("flutet alle ungefrorenen Felder und friert das höchste ein", () => {
    const { mass, locked } = eiszeitTick(zeros(), lockAt(0)); // pos0 Gletscher, Rest frei
    expect(mass[39]).toBe(EISZEIT_FLOOD);          // geflutet
    expect(locked[1]).toBe(true);                  // niedrigstes-höchstes freies Feld (pos1) friert ein
    expect(locked.filter(Boolean).length).toBe(2); // pos0 + neu gefroren
  });
});

describe("Eiszeit — Engine", () => {
  it("über einen Durchlauf: Brett geflutet + ein Feld neu eingefroren", () => {
    const s = runCycle(scen({ glacierLocked: lockAt(0), glacierRoles: [ROLES.L_EISZEIT], oppDeck: oppOf(99) }));
    expect(s.glacierMass[39]).toBe(EISZEIT_FLOOD);         // ungefrorenes Feld geflutet
    expect(s.glacierLocked.filter(Boolean).length).toBe(2); // ein Feld ist neu zum Gletscher geworden
  });
});

describe("Erstarrung — Gegner einfrieren mit Reichweite", () => {
  it("ein brechender Gletscher friert die getroffene Gegnerkarte UND die Nachbar-Gegnerkarten ein", () => {
    const s = resolveTrick(scen({ glacierLocked: lockAt(0), glacierMass: withMass([[0, 8]]), glacierRoles: [ROLES.L_ERSTARRUNG] }), noCrit);
    expect(s.frozenOppPending["O0"]).toBe(true); // die an pos0 getroffene Karte
    expect(s.frozenOppPending["O1"]).toBe(true); // Nachbar pos1 (Reichweite +1)
    expect(s.frozenOppPending["O5"]).toBe(true); // Nachbar pos5 (Reichweite +1)
  });
});
