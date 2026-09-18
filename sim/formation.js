// Greedy-Formations-Solver (Sim S4). In der `formation`-Phase sucht er den EINEN Tausch, der die
// Summe der Positions-Formationsmultiplikatoren am stärksten erhöht, und gibt ihn zurück; sonst
// `CONFIRM_FORMATION`. Ein Tausch pro Aufruf → der Treiber ruft wiederholt, bis bestätigt wird.
//
// Der Reducer dient als Orakel: `SWAP_CARDS` ist rng-frei (nur Umsortieren + computeFormations),
// also ist das Durchprobieren determinismus-sicher und verbraucht keinen rng-Strom. Nicht anwendbare
// Tausche (keine Energie) erkennt man daran, dass der Reducer denselben State zurückgibt (=== s).
import { reducer } from "../src/game/reducer.js";
import { SEGMENT_SIZE, openBorderInfo } from "../src/game/formations.js";

const EPS = 1e-9;
const formScore = (s) => (s.formations || []).reduce((t, f) => t + (f?.mult || 1), 0);

/* OPEN REGIONS — the search neighbourhood. A region is a maximal run of consecutive segments joined by
   OPEN boundaries; formations flow freely inside one, so every pair within it is a candidate swap. With no
   boundary open every region is exactly one segment and the neighbourhood is the old intra-segment one.

   Why this is not cosmetic: E_SEGMENT (Segmentarbeit), Spalier and the Pfeiler exist to open boundaries, and
   a solver that only ever probes inside a segment can never construct the formation that spans one. Measured
   on 30 seeds, forcing those families while searching intra-segment only LOST 13 % score — they cost perk
   slots and returned nothing —, while the same draft with a boundary-aware neighbourhood gained 49 %. An
   unconditional bandit therefore learned the wrong sign and dropped them for good. `openBorderInfo` is the
   same single source the engine and the UI read, so the solver cannot drift from what the rules actually do. */
function openRegions(s) {
  const n = s.playerOrder.length;
  const info = openBorderInfo(s.playerOrder, s.deck, s.skills || [], s.skillTiers || {}, s.familyTiers || {},
    s.architectEnabled ? s.architect : null);
  const out = [];
  let start = 0; // first segment of the region being built
  const nSeg = Math.ceil(n / SEGMENT_SIZE);
  for (let g = 0; g < nSeg - 1; g++) {
    if (info.isOpen(g)) continue;                                   // boundary g open → region keeps growing
    out.push([start * SEGMENT_SIZE, Math.min(n, (g + 1) * SEGMENT_SIZE)]);
    start = g + 1;
  }
  out.push([start * SEGMENT_SIZE, n]);
  return out;
}

// Tausche INNERHALB eines offenen Bereichs (ohne offene Grenze: je Segment, ~80 Paare statt 780) PLUS
// bereichsübergreifende Tausche, an denen eine EINGEFRORENE Karte beteiligt ist. Grund (Eis-Fairness):
// eingefrorene Karten geben gratis Frosttausche (kostenlos, keine Energie) und wirken als Formations-Joker —
// ihr Wert liegt gerade darin, übergreifend eine Formation zu vervollständigen. Fire-Builds haben keine
// frozen Karten → keine Cross-Probes → weiterhin schnell. Zielfunktion bleibt der Formations-Mult
// (Kaltfront/Frostspur-Wertboni werden nicht direkt optimiert, aber der Ablations-Score misst sie, wenn
// Frosttausche fallen); die Überlappungs-Boni stecken bereits multiplikativ in `mult`.
export function greedyFormationStep(s) {
  const n = s.playerOrder.length;
  const cur = formScore(s);
  const frozen = (p) => !!s.deck[s.playerOrder[p]]?.frozen;
  const regions = openRegions(s);
  const regionOf = (p) => regions.findIndex(([a, b]) => p >= a && p < b);
  let best = null, bestGain = EPS; // strikt positiver Zugewinn nötig
  const probe = (i, j) => {
    const next = reducer(s, { type: "SWAP_CARDS", i, j });
    if (next === s) return; // nicht anwendbar (keine Energie / ungültig)
    const gain = formScore(next) - cur;
    if (gain > bestGain) { bestGain = gain; best = { i, j }; }
  };
  // innerhalb eines offenen Bereichs: alle Paare
  for (const [a, b] of regions) for (let i = a; i < b; i++) for (let j = i + 1; j < b; j++) probe(i, j);
  // bereichsübergreifend: nur Paare mit ≥1 eingefrorener Karte (gratis Frosttausche)
  for (let i = 0; i < n; i++) {
    if (!frozen(i)) continue;
    for (let j = 0; j < n; j++) if (j !== i && regionOf(i) !== regionOf(j)) probe(i, j);
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
