import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer } from "../src/game/reducer.js";
import { factionPolicy } from "../sim/policies/faction.js";

// #270 Fraktions-Panels: die Engine akkumuliert je Fraktion einen ROHEN Eigen-Score-Ertrag (Flats vor dem
// Multiplikator-Stack + post-stack Direkt-Dividenden) und fraktions-native Motor-Zähler (ionisierte Karten /
// gewachsenes Wachstum / verbrannte Asche). Diese Kennzahlen speisen die HUD-Panels (nur Anzeige, keine Engine-
// Kopplung). Hier: ein Mono-Fraktions-Lauf treibt GENAU die Kennzahlen seiner Fraktion (Isolation) und nichts sonst.

// Ein kompletter Lauf bis gameover mit einer Mono-Fraktions-Policy; liefert den Endstate.
function runFaction(target, seed) {
  const pol = factionPolicy(target, { architectGreedy: true });
  const rng = makeRng(seed);
  let s = reducer(null, { type: "START_RUN", rng, architect: true });
  let guard = 0;
  while (s.phase !== "gameover") {
    if (++guard > 100000) throw new Error(`kein Fortschritt (${target}, seed ${seed}, phase ${s.phase})`);
    if (s.phase === "play") s = reducer(s, { type: "RESOLVE_TRICK", rng });
    else s = reducer(s, pol.act(s, rng));
  }
  return s;
}

// über mehrere Seeds summieren — einzelne Läufe können mal eine Kennzahl verfehlen, die Summe ist robust.
function agg(target, keys, seeds = [1, 2, 3, 4]) {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const seed of seeds) { const s = runFaction(target, seed); for (const k of keys) out[k] += s[k] || 0; }
  return out;
}

const ALL = ["fireYield", "iceYield", "lightYield", "plantYield", "ionTotal", "growthTotal", "ashBurned"];

describe("#270 Fraktions-Panel-Kennzahlen — Ertrag + Motor-Zähler", () => {
  it("initialState startet alle Kennzahlen bei 0", () => {
    const s = reducer(null, { type: "START_RUN", rng: makeRng(1), architect: true });
    for (const k of ALL) expect(s[k]).toBe(0);
  });

  it("Blitz-Lauf treibt Ionisierungen + Blitz-Ertrag; keine Fremd-Fraktions-Kennzahl", () => {
    const a = agg("lightning", ALL);
    expect(a.ionTotal).toBeGreaterThan(0);   // Motor: ionisierte Karten
    expect(a.lightYield).toBeGreaterThan(0); // Ertrag: Ionisierungs-/Sturm-Eigen-Score
    expect(a.plantYield + a.fireYield + a.iceYield).toBe(0); // Isolation
    expect(a.growthTotal + a.ashBurned).toBe(0);
  });

  it("Pflanze-Lauf treibt Gewachsen + Wurzel-Score; keine Fremd-Fraktions-Kennzahl", () => {
    const a = agg("plant", ALL);
    expect(a.growthTotal).toBeGreaterThan(0); // Motor: Lauf-Summe Wachstum
    expect(a.plantYield).toBeGreaterThan(0);  // Ertrag: Wurzel-/Ernte-Eigen-Score
    expect(a.lightYield + a.fireYield + a.iceYield).toBe(0);
    expect(a.ionTotal + a.ashBurned).toBe(0);
  });

  it("Feuer-Lauf treibt den Feuer-Ertrag (Hitze-Dividende, Feuers Kern); keine Fremd-Fraktions-Kennzahl", () => {
    const a = agg("fire", ALL);
    expect(a.fireYield).toBeGreaterThan(0);
    expect(a.lightYield + a.plantYield + a.iceYield).toBe(0);
    expect(a.ionTotal + a.growthTotal).toBe(0);
  });

  it("Eis-Lauf treibt den Frost-Ertrag (Schicht→Score-Motor); keine Fremd-Fraktions-Kennzahl", () => {
    const a = agg("ice", ALL);
    expect(a.iceYield).toBeGreaterThan(0);
    expect(a.lightYield + a.plantYield + a.fireYield).toBe(0);
    expect(a.ionTotal + a.growthTotal + a.ashBurned).toBe(0);
  });

  it("Kennzahlen wachsen monoton über den Lauf (nur steigend, Anzeige-Akkumulatoren)", () => {
    const pol = factionPolicy("ice", { architectGreedy: true });
    const rng = makeRng(2);
    let s = reducer(null, { type: "START_RUN", rng, architect: true });
    let prev = 0, guard = 0;
    while (s.phase !== "gameover") {
      if (++guard > 100000) break;
      if (s.phase === "play") s = reducer(s, { type: "RESOLVE_TRICK", rng });
      else s = reducer(s, pol.act(s, rng));
      expect(s.iceYield).toBeGreaterThanOrEqual(prev); // nie fallend
      prev = s.iceYield;
    }
    expect(prev).toBeGreaterThan(0);
  });
});
