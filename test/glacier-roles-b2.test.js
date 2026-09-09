import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { ROLES } from "../src/game/glacier.js";
import { EIS_TIERS as EIS } from "../src/game/skills.js"; // §5.3: die Zahlen stehen in der Stufenleiter (Normal = Zeile 0)

/* §5.18 — Sprödbruch (Frostgriff, SK_ICE_17) ersetzt den Eispanzer: Masse wird CRIT-CHANCE.
   Warum diese Achse: der Crit-Multiplikator steckt in glacierWinMult, ein Crit auf der Gletscherkarte vervielfacht
   also auch ihren Bruch. Das ist der größte Hebel, den Eis auf seinen Payoff hat — und vor §5.18 bediente ihn kein
   einziger Eis-Skill, während Eis von Haus aus 0 % Crit-Chance hat.
   Gemessen wird über den Crit-WURF: `resolveTrick(state, rng)` liest den Wurf, und ohne Crit-Quelle liegt die Chance
   bei 0, also crittet auch ein sehr niedriger Wurf nicht. */
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
const massAt = (p, v) => { const m = zeros(); m[p] = v; return m; };
// Stufe je Rolle setzen (Normal ist Zeile 0, also der Default eines Szenarios ohne glacierRoleTiers).
const at = (role, tier) => ({ glacierRoles: [role], glacierRoleTiers: { [role]: tier } });
// Die Würfe kommen AUS der Stufenleiter, nicht aus abgetippten Prozenten — sonst rostet der Wächter bei jeder
// Neutarierung (§5.20 hat die Zeile verdoppelt und genau das ausgelöst).
const CRIT = EIS.sproedbruch[0].crit;                 // Crit-Chance je Punkt Masse, Normal
const chance = (masse) => masse * CRIT;
const knappDrunter = (masse) => chance(masse) - 0.001; // trifft
const knappDrueber = (masse) => chance(masse) + 0.001; // trifft nicht

describe("Sprödbruch — Masse wird Crit-Chance", () => {
  it("ein Wurf unter der Massen-Chance crittet, derselbe Wurf ohne den Skill nicht", () => {
    const base = { glacierLocked: lockAt(0), glacierMass: massAt(0, 10) };
    const roll = () => knappDrunter(10);
    const ohne = resolveTrick(scen(base), roll);
    const mit = resolveTrick(scen({ ...base, glacierRoles: [ROLES.SPROEDBRUCH] }), roll);
    expect(ohne.crits).toBe(0);                    // Eis hat ohne Skill 0 % Grund-Crit
    expect(mit.crits).toBe(1);
  });

  it("knapp über der Chance crittet auch mit Skill nicht — es ist eine Chance, kein Schalter", () => {
    const s = resolveTrick(scen({ glacierLocked: lockAt(0), glacierMass: massAt(0, 10), glacierRoles: [ROLES.SPROEDBRUCH] }), () => knappDrueber(10));
    expect(s.crits).toBe(0);
  });

  it("ohne Masse keine Chance — der Skill hängt an der Ressource", () => {
    const s = resolveTrick(scen({ glacierLocked: lockAt(0), glacierRoles: [ROLES.SPROEDBRUCH] }), () => 0.0001);
    expect(s.crits).toBe(0);
  });

  it("mehr Masse, mehr Chance: derselbe Wurf trifft erst ab genug Masse", () => {
    const roll = () => knappDrunter(10);   // liegt zwischen der Chance bei 4 und der bei 10 Masse
    const wenig = resolveTrick(scen({ glacierLocked: lockAt(0), glacierMass: massAt(0, 4), glacierRoles: [ROLES.SPROEDBRUCH] }), roll);
    const viel = resolveTrick(scen({ glacierLocked: lockAt(0), glacierMass: massAt(0, 10), glacierRoles: [ROLES.SPROEDBRUCH] }), roll);
    expect(wenig.crits).toBe(0);                   // die Chance bei 4 Masse liegt unter dem Wurf
    expect(viel.crits).toBe(1);                    // die bei 10 darüber
  });

  it("nur der Gletscher selbst — eine freie Karte bekommt nichts", () => {
    const s = resolveTrick(scen({ glacierLocked: lockAt(1), glacierMass: massAt(1, 20), glacierRoles: [ROLES.SPROEDBRUCH] }), () => knappDrunter(10));
    expect(s.crits).toBe(0);                       // gespielt wird pos0, und pos0 ist kein Gletscher
  });
});

describe("Sprödbruch Episch — der Crit friert wieder an", () => {
  it("ein Crit gibt dem Gletscher die Episch-Masse zurück", () => {
    const base = { glacierLocked: lockAt(0), glacierMass: massAt(0, 10) };
    const { critMass } = EIS.sproedbruch[3];
    const normal = resolveTrick(scen({ ...base, ...at(ROLES.SPROEDBRUCH, 0) }), () => knappDrunter(10));
    const episch = resolveTrick(scen({ ...base, ...at(ROLES.SPROEDBRUCH, 3) }), () => knappDrunter(10));
    expect(normal.crits).toBe(1);
    expect(episch.crits).toBe(1);
    expect(episch.glacierMass[0] - normal.glacierMass[0]).toBe(critMass);
  });

  it("ohne Crit keine Rückgabe", () => {
    const base = { glacierLocked: lockAt(0), glacierMass: massAt(0, 10) };
    const normal = resolveTrick(scen({ ...base, ...at(ROLES.SPROEDBRUCH, 0) }), noCrit);
    const episch = resolveTrick(scen({ ...base, ...at(ROLES.SPROEDBRUCH, 3) }), noCrit);
    expect(episch.crits).toBe(0);
    expect(episch.glacierMass[0]).toBe(normal.glacierMass[0]);
  });
});
