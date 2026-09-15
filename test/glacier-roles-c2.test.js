import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { precomputeGlacier, ROLES, BURST_AT } from "../src/game/glacier.js";
import { iceSnapshotOpts, iceTuning } from "../src/game/factions/ice.js";
import { EIS_TIERS as EIS } from "../src/game/skills.js";
import { N_POS, posOf } from "../src/game/architect.js";

// Eis-Neudesign — Snapshot-Bruch-Mechanik (Eisbeben/Gletschersturz/Eisbrücke-Kaskade). §5.3: die Zahlen kommen
// aus der Stufe; `iceSnapshotOpts(roles)` ohne Stufenkarte liest Normal.
const zeros = () => new Array(N_POS).fill(0);
const withMass = (pairs) => { const m = zeros(); for (const [p, v] of pairs) m[p] = v; return m; };
const set = (...ps) => new Set(ps);

/* §5.23 (Owner): Eisbeben steht auf dem Platz des gestrichenen Kettenbruchs. Der Kettenbruch fasste fremde Gletscher
   an — erst brachen sie unreif, dann wurden sie leergesaugt — und beides maß schlecht (§5.22), weil dieselben Nachbarn
   jede Runde genullt wurden und nie reiften. Das Eisbeben rührt keinen Nachbarn an: es belohnt allein die Masse ÜBER
   der Berst-Schwelle auf dem Stich, der ohnehin auszahlt. */
describe("Eisbeben — der Bruch bebt nach, je Punkt Masse über der Schwelle", () => {
  const per = EIS.eisbeben[0].per;

  it("bei genau der Berst-Schwelle gibt es kein Nachbeben", () => {
    const mass = withMass([[0, BURST_AT]]);
    const ohne = precomputeGlacier(mass, set(0));
    const beben = precomputeGlacier(mass, set(0), iceSnapshotOpts([ROLES.EISBEBEN]));
    expect(beben.payout[0]).toBeCloseTo(ohne.payout[0], 6);
  });

  it("das Nachbeben wächst linear mit dem Überschuss", () => {
    const ueber = 6;                                    // 18 = vierte Schwelle
    const mass = withMass([[0, BURST_AT + ueber]]);
    const ohne = precomputeGlacier(mass, set(0));
    const beben = precomputeGlacier(mass, set(0), iceSnapshotOpts([ROLES.EISBEBEN]));
    expect(beben.payout[0] / ohne.payout[0]).toBeCloseTo(1 + per * ueber, 6);
  });

  it("die Stufe hebt den Anteil je Punkt", () => {
    const mass = withMass([[0, BURST_AT + 6]]);
    const stufe = (t) => precomputeGlacier(mass, set(0),
      iceSnapshotOpts([ROLES.EISBEBEN], iceTuning([ROLES.EISBEBEN], { [ROLES.EISBEBEN]: t }))).payout[0];
    expect(stufe(3)).toBeGreaterThan(stufe(0));
  });

  /* Der Gegensatz zum Kettenbruch, und der Grund für den Umbau: kein fremdes Feld wird angefasst. Der Nachbar bricht
     weiter selbst, behält seinen eigenen Stich und seinen liegengebliebenen Überschuss. */
  it("die Nachbarn bleiben unberührt — eigener Bruch, eigene Restmasse", () => {
    const mass = withMass([[0, BURST_AT + 6], [1, BURST_AT + 2]]);
    const ohne = precomputeGlacier(mass, set(0, 1));
    const beben = precomputeGlacier(mass, set(0, 1), iceSnapshotOpts([ROLES.EISBEBEN]));
    expect(beben.payout[1]).toBeGreaterThan(0);
    expect(beben.resetMass[1]).toBe(ohne.resetMass[1]);
    expect(beben.breaks).toHaveLength(ohne.breaks.length);
  });

  it("ein erzwungener Bruch (Große Lawine) bebt nicht nach", () => {
    const mass = withMass([[0, 2]]);                    // weit unter der Schwelle, nur die Lawine bricht ihn
    const opts = { ...iceSnapshotOpts([ROLES.EISBEBEN]), grosseLawine: true };
    const ohne = precomputeGlacier(mass, set(0), { grosseLawine: true });
    expect(precomputeGlacier(mass, set(0), opts).payout[0]).toBeCloseTo(ohne.payout[0], 6);
  });

  it("Episch: das Nachbeben zählt dem Gletschersturz als eigener Bruch", () => {
    const mass = withMass([[0, BURST_AT + 6]]);
    const roles = [ROLES.EISBEBEN, ROLES.GLETSCHERSTURZ];
    const opts = iceSnapshotOpts(roles, iceTuning(roles, { [ROLES.EISBEBEN]: 3 }));
    expect(opts.eisbebenSturz).toBe(true);
    // Dieselbe Leiterzahl, nur ohne das Sturz-Zählen — so misst der Vergleich allein den Episch-Zusatz.
    const ohneZaehlung = precomputeGlacier(mass, set(0), { ...opts, eisbebenSturz: false }).payout[0];
    expect(precomputeGlacier(mass, set(0), opts).payout[0]).toBeGreaterThan(ohneZaehlung);
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
  it("Eisbeben über glacierRoles: nur der Gletscher über der Schwelle zahlt mehr", () => {
    const base = {
      ...initialState(makeRng(1)), deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
      activeArchetypes: ["ice"], glacierMass: withMass([[0, BURST_AT + 6], [1, BURST_AT]]), glacierLocked: lockAt(0, 1),
    };
    const lauf = (roles) => {
      let s = { ...base, glacierRoles: roles };
      const ueber = resolveTrick(s, noCrit).lastTrick.breakdown.glacierDirect;    // pos0, sechs Punkte über der Schwelle
      s = resolveTrick(s, noCrit);
      return { ueber, genau: resolveTrick(s, noCrit).lastTrick.breakdown?.glacierDirect ?? 0 }; // pos1, genau auf ihr
    };
    const ohne = lauf([]);
    const mit = lauf([ROLES.EISBEBEN]);
    expect(mit.ueber).toBeGreaterThan(ohne.ueber);   // der Überschuss bebt nach
    expect(mit.genau).toBeCloseTo(ohne.genau, 6);    // genau auf der Schwelle ändert sich nichts
  });
});
