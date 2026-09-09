import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { ROLES, WIN_MASS, EWIGER_FROST, dauerfrostTick, FIRN_DRAW } from "../src/game/glacier.js";
import { EIS_TIERS as EIS } from "../src/game/skills.js";

// §5.3: die Zahlen kommen aus der Stufenleiter. Ein Szenario, das nur `glacierRoles` setzt, hält Normal (Stufe 0) —
// die Erwartungen lesen deshalb dieselbe Zeile, statt eine Zahl zu wiederholen.
const NORMAL = 0;

// Eis-Neudesign — Masse-Quellen (Anfrieren / Schneetreiben / Dauerfrost). Getrieben über glacierRoles.
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const rep = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});
const runCycle = (s0) => { let s = s0; for (let i = 0; i < 40; i++) s = resolveTrick(s, noCrit); return s; };

describe("Anfrieren — Sieg → +Masse extra", () => {
  /* §5.31: ANTEIL statt flacher Zahl — Bezugsgröße ist die Masse einschließlich dieses Siegs. Der Wächter hält
     beides fest: den Anteil auf einem gewachsenen Gletscher und die Untergrenze auf einem frisch gefrorenen Feld
     (dort darf der Skill nicht exakt null geben, sonst ist er beim ersten Pick stumm). */
  it("Sieg eines Gletschers addiert einen Anteil seiner Masse über die Baseline", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const glacierMass = zeros(); glacierMass[0] = 10;
    const base = resolveTrick(scen({ glacierLocked, glacierMass }), noCrit);                     // pos 0, Sieg
    const anf = resolveTrick(scen({ glacierLocked, glacierMass, glacierRoles: [ROLES.ANFRIEREN] }), noCrit);
    expect(base.glacierMass[0]).toBe(10 + WIN_MASS);                                             // Baseline: nur +1
    expect(anf.glacierMass[0]).toBeCloseTo(10 + WIN_MASS + (10 + WIN_MASS) * EIS.anfrieren[NORMAL].pct, 6);
  });

  it("auch auf einem leeren Gletscher gibt er etwas — der Sieg zählt zur Bezugsgröße", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const anf = resolveTrick(scen({ glacierLocked, glacierRoles: [ROLES.ANFRIEREN] }), noCrit);
    expect(anf.glacierMass[0]).toBeGreaterThan(WIN_MASS);
  });
  it("der Formations-Zuschlag hängt an der Stufe: Normal hat ihn nicht, Episch schon", () => {
    // pos 0 = erste Wiederholungskarte (factor 1, zählt noch nicht als in-Formation); ab pos 1 greift die Formation.
    const glacierLocked = falses(); glacierLocked[1] = true;
    const run = (tier) => {
      let s = scen({ deck: rep(12), glacierLocked, glacierRoles: [ROLES.ANFRIEREN], glacierRoleTiers: { [ROLES.ANFRIEREN]: tier } });
      s = resolveTrick(s, noCrit); // pos 0 (Snapshot; kein Gletscher hier)
      return resolveTrick(s, noCrit); // pos 1 — Gletscher gewinnt IN Formation
    };
    const normal = run(NORMAL), episch = run(3);
    const anteil = (pct, mal) => WIN_MASS + WIN_MASS * pct * mal;                                  // Gletscher startet leer
    expect(normal.lastTrick.formationMult).toBeGreaterThan(1);
    expect(normal.glacierMass[1]).toBeCloseTo(anteil(EIS.anfrieren[NORMAL].pct, 1), 6);            // Normal: einfach
    expect(episch.glacierMass[1]).toBeCloseTo(anteil(EIS.anfrieren[3].pct, 2), 6);                 // Episch: doppelt
  });
});

describe("Schneetreiben — additive Verwehung in die Boden-Reserve (#386 firnStack)", () => {
  it("auch ein leerer Gletscher sät additiv und behält seine Sieg-Masse (§5.3: kein 0-Masse-Sonderfall mehr)", () => {
    const glacierLocked = falses(); glacierLocked[0] = true; // Nachbarn von pos0: pos5 (unten), pos1 (rechts) — beide frei
    const s = resolveTrick(scen({ glacierLocked, glacierRoles: [ROLES.SCHNEETREIBEN] }), noCrit);
    expect(s.firnStack[5] + s.firnStack[1]).toBe(EIS.schneetreiben[NORMAL].seed); // Nachbar-Reserve bekommt den vollen Satz
    expect(s.glacierMass[0]).toBe(WIN_MASS);                                     // der Gletscher behält seinen Sieg
  });
  it("Gletscher mit Masse sät ADDITIV in die Nachbar-Reserve und behält seine Sieg-Masse", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const gm = zeros(); gm[0] = 5;
    const s = resolveTrick(scen({ glacierMass: gm, glacierLocked, glacierRoles: [ROLES.SCHNEETREIBEN] }), noCrit);
    expect(s.glacierMass[0]).toBe(5 + WIN_MASS);            // Gletscher behält seinen Sieg (Eigenmasse)
    expect(s.firnStack[5] + s.firnStack[1]).toBe(EIS.schneetreiben[NORMAL].seed); // Nachbar-Reserve zusätzlich
  });
});

describe("Dauerfrost — Boden-Reserve nach Abstand zum Gletscher (#386 firnStack)", () => {
  /* §5.18: der Null-Ring um den Gletscher ist gefallen — Abstand 1 und 2 liegen jetzt BEIDE im Nah-Band. Er würgte
     Dauerfrost genau dort ab, wo ein dichtes Cluster steht. Die Bänder am reinen Tick, weil im Durchlauf zusätzlich
     der Zug greift und die Reserve sofort wieder abräumt. */
  it("Bänder: Abstand ≥3 → FAR, Abstand 1 und 2 → NEAR, Gletscher-Feld selbst → nichts", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;            // ein Gletscher an pos0 (0,0)
    const { near, far } = EIS.dauerfrost[NORMAL];
    const f = dauerfrostTick(zeros(), glacierLocked, near, far);
    expect(f[39]).toBe(far);   // pos39 (7,4), Abstand 7
    expect(f[2]).toBe(near);   // pos2 (0,2), Abstand 2
    expect(f[1]).toBe(near);   // pos1 (0,1), Abstand 1 — früher 0
    expect(f[0]).toBe(0);      // das Gletscher-Feld selbst bekommt nie Firn
  });

  it("im Durchlauf zieht der Gletscher die frisch gefrostete Reserve zu sich — Dauerfrost speist ihn ohne Eiszeit", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const s = runCycle(scen({ oppDeck: oppOf(99), glacierLocked, glacierRoles: [ROLES.DAUERFROST] })); // alles verlieren → nur Boden-Frost
    // §5.27: der Zug-Deckel ist gefallen — das Feld wird geladen und im selben Durchlauf KOMPLETT leergezogen.
    const far = EIS.dauerfrost[NORMAL].far;
    expect(s.firnStack[39]).toBe(Number.isFinite(FIRN_DRAW) ? Math.max(0, far - FIRN_DRAW) : 0);
    expect(s.glacierMass[0]).toBeGreaterThan(EWIGER_FROST);               // mehr als der Passiv-Tick: der Zug ist angekommen
  });
  it("ohne Dauerfrost bleiben ungefrorene Felder (Reserve) leer", () => {
    const glacierLocked = falses(); glacierLocked[0] = true;
    const s = runCycle(scen({ oppDeck: oppOf(99), glacierLocked }));
    expect(s.firnStack[39]).toBe(0);
  });
});
