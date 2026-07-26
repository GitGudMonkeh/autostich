import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { TRICKS_PER_CYCLE } from "../src/game/constants.js";

/* #131 Rundenscore-Tracking: der Score-Zuwachs je Durchlauf + die letzten zwei abgeschlossenen Rundenscores
   (für die %-Differenz zur Vorrunde auf den Entscheidungs-Panels). Reine Game-Ebene → in Node testbar. */

// Konstante Decks: jeder Stich ist erzwingbar Sieg (pVal > oVal) bzw. Niederlage (pVal < oVal).
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const base = (pVal, oVal, over = {}) => ({
  ...initialState(makeRng(1)),
  deck: constDeck(pVal), oppDeck: constDeck(oVal), playerOrder: identity(), oppOrder: identity(), ...over,
});

// Einen vollständigen Durchlauf (TRICKS_PER_CYCLE Stiche) abspielen. Vor jedem Stich Phase auf "play" zwingen,
// damit die zwischengeschalteten Entscheidungs-Phasen (levelup/shop/formation) übersprungen werden.
function playCycle(s, rng) {
  for (let k = 0; k < TRICKS_PER_CYCLE; k++) {
    if (s.phase !== "play") s = { ...s, phase: "play" };
    s = resolveTrick(s, rng);
  }
  return s;
}

describe("#131 Rundenscore-Tracking", () => {
  it("initialState initialisiert die Tracking-Felder", () => {
    const s0 = initialState(makeRng(1));
    expect(s0.scoreAtCycleStart).toBe(0);
    expect(s0.lastCycleScore).toBe(null);
    expect(s0.prevCycleScore).toBe(null);
  });

  it("erster Durchlauf: Rundenscore = ganzer Score, keine Vorrunde", () => {
    const rng = makeRng(7);
    const s = playCycle(base(10, 0), rng);
    expect(s.score).toBeGreaterThan(0);
    expect(s.lastCycleScore).toBe(s.score);   // Zuwachs seit Score 0
    expect(s.prevCycleScore).toBe(null);       // erste Runde → kein Vergleich (UI: „erste Runde")
    expect(s.scoreAtCycleStart).toBe(s.score); // Snapshot für den nächsten Durchlauf
  });

  it("Rollover nach dem 2. Durchlauf: prev = Vorrunde, last = neuer Zuwachs", () => {
    const rng = makeRng(7);
    const s1 = playCycle(base(10, 0), rng);
    const afterC1 = s1.score;
    const s2 = playCycle(s1, rng);
    expect(s2.prevCycleScore).toBe(afterC1);                 // Vorrunde = kompletter 1. Durchlauf
    expect(s2.lastCycleScore).toBeCloseTo(s2.score - afterC1); // aktueller Rundenscore = Zuwachs des 2. Durchlaufs
    expect(s2.scoreAtCycleStart).toBe(s2.score);
  });

  it("Edge-Case prev = 0: zwei punktlose Durchläufe → last und prev sind 0", () => {
    const rng = makeRng(7);
    let s = playCycle(base(0, 10), rng); // verliert jeden Stich → 0 Punkte
    expect(s.lastCycleScore).toBe(0);
    expect(s.prevCycleScore).toBe(null);
    s = playCycle(s, rng);
    expect(s.lastCycleScore).toBe(0);
    expect(s.prevCycleScore).toBe(0);    // Vorrunde 0 → UI zeigt keine %-Angabe (Division vermieden)
  });

  it("Tracking ändert die Score-Summe nicht (rein additives State-Feld)", () => {
    const rng = makeRng(3);
    const s = playCycle(base(10, 0), rng);
    // Summe der zwei jüngsten Rundenscores deckt (bei nur einem Durchlauf) exakt den Gesamtscore.
    expect(s.lastCycleScore + (s.prevCycleScore || 0)).toBe(s.score);
  });
});
