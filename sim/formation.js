// Greedy-Formations-Solver (Sim S4). In der `formation`-Phase sucht er den EINEN Tausch, der die
// Summe der Positions-Formationsmultiplikatoren am stärksten erhöht, und gibt ihn zurück; sonst
// `CONFIRM_FORMATION`. Ein Tausch pro Aufruf → der Treiber ruft wiederholt, bis bestätigt wird.
//
// Der Reducer dient als Orakel: `SWAP_CARDS` ist rng-frei (nur Umsortieren + computeFormations),
// also ist das Durchprobieren determinismus-sicher und verbraucht keinen rng-Strom. Nicht anwendbare
// Tausche (keine Energie) erkennt man daran, dass der Reducer denselben State zurückgibt (=== s).
import { reducer } from "../src/game/reducer.js";
import { SEGMENT_SIZE } from "../src/game/formations.js";

const EPS = 1e-9;
const formScore = (s) => (s.formations || []).reduce((t, f) => t + (f?.mult || 1), 0);

// INTRA-SEGMENT-Tausche (immer, ~80 Paare statt 780) PLUS segmentübergreifende Tausche, an denen eine
// EINGEFRORENE Karte beteiligt ist. Grund (Eis-Fairness): eingefrorene Karten geben gratis Frosttausche
// (kostenlos, keine Energie) und wirken als Formations-Joker — ihr Wert liegt gerade darin, segment-
// übergreifend eine Formation zu vervollständigen. Fire-Builds haben keine frozen Karten → keine Cross-
// Segment-Probes → weiterhin schnell. Zielfunktion bleibt der Formations-Mult (Kaltfront/Frostspur-
// Wertboni werden nicht direkt optimiert, aber der Ablations-Score misst sie, wenn Frosttausche fallen).
export function greedyFormationStep(s) {
  const n = s.playerOrder.length;
  const cur = formScore(s);
  const seg = (p) => Math.floor(p / SEGMENT_SIZE);
  const frozen = (p) => !!s.deck[s.playerOrder[p]]?.frozen;
  let best = null, bestGain = EPS; // strikt positiver Zugewinn nötig
  const probe = (i, j) => {
    const next = reducer(s, { type: "SWAP_CARDS", i, j });
    if (next === s) return; // nicht anwendbar (keine Energie / ungültig)
    const gain = formScore(next) - cur;
    if (gain > bestGain) { bestGain = gain; best = { i, j }; }
  };
  // intra-Segment: alle Paare
  for (let a = 0; a < n; a += SEGMENT_SIZE) {
    const b = Math.min(n, a + SEGMENT_SIZE);
    for (let i = a; i < b; i++) for (let j = i + 1; j < b; j++) probe(i, j);
  }
  // cross-Segment: nur Paare mit ≥1 eingefrorener Karte (gratis Frosttausche)
  for (let i = 0; i < n; i++) {
    if (!frozen(i)) continue;
    for (let j = 0; j < n; j++) if (j !== i && seg(i) !== seg(j)) probe(i, j);
  }
  return best ? { type: "SWAP_CARDS", i: best.i, j: best.j } : { type: "CONFIRM_FORMATION" };
}

// FRONT-LOAD-Gegner (Vabanque & künftige Eröffnungs-Perks): arrangiert die stärksten Karten auf die ersten
// `openTricks` Positionen. Das ist der Missbrauchsfall, den der constants.js-Kommentar seit #203 als Grund für
// VABANQUE_MAX_PAYOUTS nennt, den die Sim aber nie modelliert hat — `playerOrder` ist PERSISTENT, ein Spieler
// kann die Eröffnung also über mehrere Formationsphasen hinweg dauerhaft stapeln (4 Energie je Phase, ~13 Phasen
// je Lauf ⇒ die 5 Eröffnungsplätze sind nach 1–2 Phasen sortiert und bleiben es).
//
// Bewusst NICHT formations-optimierend: dieser Gegner maximiert die Eröffnungs-Winrate, nicht den Score. Er ist
// die OBERE Schranke für Eröffnungs-Perks, kein realistischer Spielstil — so gelesen gehören seine Zahlen auch
// interpretiert (Worst Case, nicht Erwartungswert).
//
// Ein Tausch pro Aufruf (wie greedyFormationStep); ohne Energie liefert der Reducer denselben State → CONFIRM.
export function frontLoadFormationStep(s, openTricks = 5) {
  const n = s.playerOrder.length;
  const lim = Math.min(openTricks, n);
  const val = (p) => s.deck[s.playerOrder[p]]?.value ?? -Infinity;
  for (let p = 0; p < lim; p++) {
    // Stärkste Karte AUSSERHALB der Eröffnung suchen, die die hier liegende schlägt.
    let best = -1, bestV = val(p);
    for (let q = lim; q < n; q++) if (val(q) > bestV) { bestV = val(q); best = q; }
    if (best < 0) continue;
    // Nicht anwendbar (Energie leer, Gletscher starr, gesperrte Zelle) → nächste Eröffnungsposition probieren,
    // statt sofort zu bestätigen; sonst blockiert eine einzelne starre Zelle den ganzen Gegner.
    if (reducer(s, { type: "SWAP_CARDS", i: p, j: best }) !== s) return { type: "SWAP_CARDS", i: p, j: best };
  }
  return { type: "CONFIRM_FORMATION" };
}
