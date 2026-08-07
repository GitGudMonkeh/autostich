import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { RESET_TO } from "../src/game/glacier.js";

// Eis-Neudesign: Stufen-Verbrauch pro Stich. Die Masse eines Gletschers bleibt VOLL sichtbar, bis SEIN Stich dran ist,
// und fällt erst dann auf den Nachbruch-Wert — nicht mehr für alle Gletscher gleichzeitig zu Durchlauf-Beginn (pos 0).
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const flat = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const oppOf = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const zeros = () => new Array(40).fill(0);
const falses = () => new Array(40).fill(false);
const noCrit = () => 0.99;
const scen = (over = {}) => ({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(99), playerOrder: identity(), oppOrder: identity(), // Gegner 99 → wir verlieren alles (keine Sieg-Masse verfälscht den Test)
  activeArchetypes: ["ice"], glacierMass: zeros(), glacierLocked: falses(), glacierRoles: [], ...over,
});

describe("Gletscher — Stufen-Verbrauch genau beim Stich (nicht zu Durchlauf-Beginn)", () => {
  it("ein späterer Gletscher behält seine volle Masse, bis sein Stich gespielt ist", () => {
    const glacierLocked = falses(); glacierLocked[0] = true; glacierLocked[3] = true;
    const gm = zeros(); gm[0] = 12; gm[3] = 12; // beide brechen (Berst-Schwelle 12)

    // Stich pos 0: NUR der Gletscher an 0 bricht/verbraucht; der an 3 bleibt voll (früher schon bei pos 0 zurückgesetzt).
    let s = resolveTrick(scen({ glacierMass: gm, glacierLocked }), noCrit);
    expect(s.glacierMass[0]).toBe(RESET_TO); // hier gebrochen → 0
    expect(s.glacierMass[3]).toBe(12);       // noch nicht dran → volle Masse sichtbar

    // Stiche pos 1, 2: der Gletscher an 3 bleibt weiterhin voll.
    s = resolveTrick(s, noCrit); // pos 1
    s = resolveTrick(s, noCrit); // pos 2
    expect(s.glacierMass[3]).toBe(12);

    // Stich pos 3: jetzt bricht/verbraucht auch dieser Gletscher.
    s = resolveTrick(s, noCrit); // pos 3
    expect(s.glacierMass[3]).toBe(RESET_TO);
  });

  it("der Bruch-Score wird weiterhin am jeweiligen Stich ausgezahlt (Timing, nicht Score, ändert sich)", () => {
    const glacierLocked = falses(); glacierLocked[0] = true; glacierLocked[3] = true;
    const gm = zeros(); gm[0] = 12; gm[3] = 12;

    let s = resolveTrick(scen({ glacierMass: gm, glacierLocked }), noCrit); // pos 0 zahlt den Bruch von Feld 0
    const yield0 = s.glacierYield;
    expect(yield0).toBeGreaterThan(0);

    s = resolveTrick(s, noCrit); // pos 1 — kein Gletscher, kein Zuwachs
    s = resolveTrick(s, noCrit); // pos 2
    expect(s.glacierYield).toBe(yield0);

    s = resolveTrick(s, noCrit); // pos 3 zahlt den Bruch von Feld 3 → Ertrag steigt
    expect(s.glacierYield).toBeGreaterThan(yield0);
  });
});
