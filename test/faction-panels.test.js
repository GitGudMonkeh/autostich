import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer } from "../src/game/reducer.js";
import { factionPolicy } from "../sim/policies/faction.js";

// #270 Fraktions-Panels: die Engine akkumuliert je Fraktion ihren ROHEN Eigen-Score in benannten Kanälen je Fantasie
// (Pflanze Wurzel/Blüte/Ernte · Feuer Grund/Weißglut · Eis + Blitz je ein Kanal) sowie fraktions-native Motor-Zähler
// (ionisierte Karten / gewachsenes Wachstum / verbrannte Asche / gebrandmarkte Gegnerkarten). Nur Anzeige, keine Engine-
// Kopplung. Hier: ein Mono-Fraktions-Lauf treibt GENAU die Kennzahlen seiner Fraktion (Isolation) und nichts sonst.

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

function agg(target, keys, seeds = [1, 2, 3, 4]) {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const seed of seeds) { const s = runFaction(target, seed); for (const k of keys) out[k] += s[k] || 0; }
  return out;
}

const YIELD = ["iceYield", "lightYield", "plantRoot", "plantBloom", "plantHarvest", "fireBase", "fireWhite"];
const MOTOR = ["ionTotal", "growthTotal", "ashBurned", "brandTotal"];
const ALL = [...YIELD, ...MOTOR];
const plantYield = (a) => a.plantRoot + a.plantBloom + a.plantHarvest;

describe("#270 Fraktions-Panel-Kennzahlen — Ertrag-Kanäle + Motor-Zähler", () => {
  it("initialState startet alle Kennzahlen bei 0", () => {
    const s = reducer(null, { type: "START_RUN", rng: makeRng(1), architect: true });
    for (const k of ALL) expect(s[k]).toBe(0);
  });

  it("Blitz-Lauf treibt Ionisierungen + Blitz-Ertrag; keine Fremd-Fraktions-Kennzahl", () => {
    const a = agg("lightning", ALL);
    expect(a.ionTotal).toBeGreaterThan(0);
    expect(a.lightYield).toBeGreaterThan(0);
    expect(plantYield(a) + a.fireBase + a.fireWhite + a.iceYield).toBe(0); // Isolation
    expect(a.growthTotal + a.ashBurned + a.brandTotal).toBe(0);
  });

  it("Pflanze-Lauf treibt Gewachsen + Wurzel-Score (mind. Wurzel-Kanal); keine Fremd-Fraktions-Kennzahl", () => {
    const a = agg("plant", ALL);
    expect(a.growthTotal).toBeGreaterThan(0);
    expect(a.plantRoot).toBeGreaterThan(0);      // Wurzeltiefe ist der verlässliche Grund-Kanal
    expect(plantYield(a)).toBeGreaterThan(0);
    expect(a.lightYield + a.fireBase + a.fireWhite + a.iceYield).toBe(0);
    expect(a.ionTotal + a.ashBurned + a.brandTotal).toBe(0);
  });

  it("Feuer-Lauf treibt den Feuer-Grund-Score (Feuers Kern); keine Fremd-Fraktions-Kennzahl", () => {
    const a = agg("fire", ALL);
    expect(a.fireBase).toBeGreaterThan(0);
    expect(a.lightYield + plantYield(a) + a.iceYield).toBe(0);
    expect(a.ionTotal + a.growthTotal).toBe(0);
  });

  it("Eis-Lauf treibt den Frost-Ertrag (Schicht→Score-Motor); keine Fremd-Fraktions-Kennzahl", () => {
    const a = agg("ice", ALL);
    expect(a.iceYield).toBeGreaterThan(0);
    expect(a.lightYield + plantYield(a) + a.fireBase + a.fireWhite).toBe(0);
    expect(a.ionTotal + a.growthTotal + a.ashBurned + a.brandTotal).toBe(0);
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
      expect(s.iceYield).toBeGreaterThanOrEqual(prev);
      prev = s.iceYield;
    }
    expect(prev).toBeGreaterThan(0);
  });
});
