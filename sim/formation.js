// Greedy-Formations-Solver (Sim S4). In der `formation`-Phase sucht er den EINEN Tausch, der die
// Summe der Positions-Formationsmultiplikatoren am stärksten erhöht, und gibt ihn zurück; sonst
// `CONFIRM_FORMATION`. Ein Tausch pro Aufruf → der Treiber ruft wiederholt, bis bestätigt wird.
//
// Der Reducer dient als Orakel: `SWAP_CARDS` ist rng-frei (nur Umsortieren + computeFormations),
// also ist das Durchprobieren determinismus-sicher und verbraucht keinen rng-Strom. Nicht anwendbare
// Tausche (keine Energie) erkennt man daran, dass der Reducer denselben State zurückgibt (=== s).
import { reducer } from "../src/game/reducer.js";

const EPS = 1e-9;
const formScore = (s) => (s.formations || []).reduce((t, f) => t + (f?.mult || 1), 0);

export function greedyFormationStep(s) {
  const n = s.playerOrder.length;
  const cur = formScore(s);
  let best = null, bestGain = EPS; // strikt positiver Zugewinn nötig
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const next = reducer(s, { type: "SWAP_CARDS", i, j });
      if (next === s) continue; // nicht anwendbar (keine Energie / ungültig)
      const gain = formScore(next) - cur;
      if (gain > bestGain) { bestGain = gain; best = { i, j }; }
    }
  }
  return best ? { type: "SWAP_CARDS", i: best.i, j: best.j } : { type: "CONFIRM_FORMATION" };
}
