import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { precomputeGlacier, ROLES } from "../src/game/glacier.js";
import { iceSnapshotOpts, iceTuning } from "../src/game/factions/ice.js";
import { N_POS, posOf } from "../src/game/architect.js";

// Eis-Neudesign — Snapshot-Bruch-Mechanik (Kettenbruch/Gletschersturz/Eisbrücke-Kaskade). §5.3: die Zahlen kommen
// aus der Stufe; `iceSnapshotOpts(roles)` ohne Stufenkarte liest Normal.
const zeros = () => new Array(N_POS).fill(0);
const withMass = (pairs) => { const m = zeros(); for (const [p, v] of pairs) m[p] = v; return m; };
const set = (...ps) => new Set(ps);

/* §5.21 (Owner): der Kettenbruch reißt die MASSE mit, statt unreife Gletscher zum Bruch zu zwingen. Vorher brach der
   Nachbar auf Stufe 1 und fiel auf null — gemessen −18 %, weil er damit die Schleife der Fraktion (halten & wachsen,
   dann gewaltig brechen) selbst unterbrach. Jetzt fließt die Masse in den auslösenden Bruch und wird dort auf einer
   höheren Schwelle ausgezahlt. */
describe("Kettenbruch — der Bruch reißt die Masse der Nachbarn mit", () => {
  it("der Nachbar zahlt nicht selbst — seine Masse landet im auslösenden Bruch", () => {
    const mass = withMass([[0, 12], [1, 6]]);
    const ohne = precomputeGlacier(mass, set(0, 1));
    const kette = precomputeGlacier(mass, set(0, 1), iceSnapshotOpts([ROLES.KETTENBRUCH]));
    expect(kette.payout[1]).toBe(0);                        // absorbiert: kein eigener Berst-Score
    expect(kette.payout[0]).toBeGreaterThan(ohne.payout[0]); // die Masse schlägt beim Auslöser mit
    expect(kette.resetMass[1]).toBe(0);                      // leergezogen
  });

  /* Die Bedingung, unter der der Owner zugestimmt hat: „ich verliere den Bruch von einem anderen Gletscher, der
     kompensiert werden muss". Einfrieren, Frostbund und Gletschersturz hängen an der ZAHL der Brüche, nicht an der
     Masse — ein absorbiertes Feld gilt deshalb weiter als gebrochen. */
  it("das absorbierte Feld gilt weiter als gebrochen — Einfrieren, Frostbund und Sturz verlieren nichts", () => {
    const kette = precomputeGlacier(withMass([[0, 12], [1, 6]]), set(0, 1), iceSnapshotOpts([ROLES.KETTENBRUCH]));
    const nachbar = kette.breaks.find((b) => b.pos === 1);
    expect(nachbar).toBeTruthy();
    expect(nachbar.absorbed).toBe(true);
    expect(nachbar.burst).toBe(0);
  });

  it("die gesammelte Masse hebt die Schwelle — das ist der Sinn der Kette", () => {
    // 12 + 3×5 = 27 → vierte Schwelle, die ein Gletscher allein nie erreicht.
    const mass = withMass([[0, 12], [1, 5], [2, 5], [3, 5]]);
    const ganz = iceSnapshotOpts([ROLES.KETTENBRUCH], iceTuning([ROLES.KETTENBRUCH], { [ROLES.KETTENBRUCH]: 3 }));
    const kette = precomputeGlacier(mass, set(0, 1, 2, 3), ganz);
    const ausloeser = kette.breaks.find((b) => !b.absorbed);
    expect(ausloeser.tier).toBe(4);
    expect(kette.payout[0]).toBeGreaterThan(3 * precomputeGlacier(mass, set(0, 1, 2, 3)).payout[0]);
  });

  it("ein Feld wird nur EINMAL abgesaugt, auch zwischen zwei Auslösern", () => {
    const mass = withMass([[0, 12], [1, 6], [2, 12]]);   // pos1 liegt zwischen zwei brechenden Gletschern
    const kette = precomputeGlacier(mass, set(0, 1, 2), iceSnapshotOpts([ROLES.KETTENBRUCH]));
    const gesammelt = kette.breaks.filter((b) => b.absorbed);
    expect(gesammelt).toHaveLength(1);                   // nicht zweimal gezählt
  });
});

describe("Gletschersturz — je mehr brechen, desto stärker jeder Bruch", () => {
  it("zwei gleichzeitig brechende Gletscher verstärken sich mit Gletschersturz", () => {
    const mass = withMass([[0, 12], [1, 12]]);
    const base = precomputeGlacier(mass, set(0, 1));
    const sturz = precomputeGlacier(mass, set(0, 1), iceSnapshotOpts([ROLES.GLETSCHERSTURZ]));
    expect(sturz.payout[0]).toBeGreaterThan(base.payout[0]);
  });
  it("mehr gleichzeitige Brüche → stärkere Amp (3 vs 1)", () => {
    const one = precomputeGlacier(withMass([[0, 12]]), set(0), iceSnapshotOpts([ROLES.GLETSCHERSTURZ]));
    const three = precomputeGlacier(withMass([[0, 12], [1, 12], [2, 12]]), set(0, 1, 2), iceSnapshotOpts([ROLES.GLETSCHERSTURZ]));
    expect(three.payout[0] / 8).toBeGreaterThan(one.payout[0] / 8); // pro Masse-Einheit stärker
  });
});

describe("Eisbrücke — Diagonalen zählen für die Kaskade", () => {
  it("diagonal benachbarte Gletscher verstärken den Burst nur mit Eisbrücke", () => {
    const mass = withMass([[0, 12], [posOf(1, 1), 12]]);  // pos0 und pos(1,1) diagonal
    const base = precomputeGlacier(mass, set(0, posOf(1, 1)));
    const bridge = precomputeGlacier(mass, set(0, posOf(1, 1)), iceSnapshotOpts([ROLES.EISBRUECKE]));
    expect(bridge.payout[0]).toBeGreaterThan(base.payout[0]); // Diagonale zählt → Kaskade greift
  });
});

describe("Engine-Verdrahtung — die Snapshot-Optionen erreichen precompute", () => {
  const identity = () => Array.from({ length: 40 }, (_, i) => i);
  const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
  const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
  const falses = () => new Array(40).fill(false);
  const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };
  const noCrit = () => 0.99;
  it("Kettenbruch über glacierRoles: der ganze Bruch landet auf dem Stich des Auslösers", () => {
    const base = {
      ...initialState(makeRng(1)), deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
      activeArchetypes: ["ice"], glacierMass: withMass([[0, 12], [1, 6]]), glacierLocked: lockAt(0, 1),
    };
    const lauf = (roles) => {
      let s = { ...base, glacierRoles: roles };
      const ausloeser = resolveTrick(s, noCrit).lastTrick.breakdown.glacierDirect;   // pos0
      s = resolveTrick(s, noCrit);
      return { ausloeser, nachbar: resolveTrick(s, noCrit).lastTrick.breakdown?.glacierDirect ?? 0 }; // pos1
    };
    const ohne = lauf([]);
    const mit = lauf([ROLES.KETTENBRUCH]);
    expect(mit.ausloeser).toBeGreaterThan(ohne.ausloeser); // die mitgerissene Masse zahlt beim Auslöser
    expect(mit.nachbar).toBe(0);                           // und nicht mehr am eigenen Stich
  });
});
