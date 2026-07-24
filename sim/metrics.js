// Telemetrie-Ledger (Sim S1). Beobachtet den lastTrick-Strom eines Runs und baut ein
// Per-Karte-/Effekt-Ledger auf — die Rohdaten für die spätere Karten-/Perk-Balance-Analyse.
//
// Bewusst pure: `observe` mutiert nur den übergebenen Akkumulator, kein Zufall, kein I/O →
// deterministisch (gleicher lastTrick-Strom → gleiches Ledger).
//
// lastTrick-Shape (engine.js): { pCard{ id, suit, value }, result: "win"|"win_tie"|"loss"|"tie",
//   gained, isCrit, formationMult, formations:[…], … }. Crit/Score fallen nur bei Sieg an.

const isWin = (result) => result === "win" || result === "win_tie";

export function newTelemetry() {
  return {
    cards: new Map(), // cardId → { id, suit, appearances, wins, losses, ties, crits, score }
    wins: 0,
    formationWins: 0, // Siege auf einer Position mit ≥1 aktiver Formation
  };
}

export function observe(tel, t) {
  if (!t || !t.pCard) return;
  const id = t.pCard.id;
  let c = tel.cards.get(id);
  if (!c) {
    c = { id, suit: t.pCard.suit, appearances: 0, wins: 0, losses: 0, ties: 0, crits: 0, score: 0 };
    tel.cards.set(id, c);
  }
  c.appearances += 1;
  if (isWin(t.result)) {
    c.wins += 1;
    if (t.isCrit) c.crits += 1;
    c.score += t.gained || 0;
    tel.wins += 1;
    if ((t.formations && t.formations.length) || (t.formationMult || 1) > 1) tel.formationWins += 1;
  } else if (t.result === "loss") {
    c.losses += 1;
  } else {
    c.ties += 1;
  }
}

// Ledger → stabil (nach id) sortiertes Array mit abgeleiteten Raten. Für die Aggregation über Runs.
export function summarizeCards(tel) {
  const totalScore = [...tel.cards.values()].reduce((s, c) => s + c.score, 0) || 1;
  return [...tel.cards.values()]
    .map((c) => ({
      ...c,
      winrate: c.appearances ? c.wins / c.appearances : 0,
      critRate: c.wins ? c.crits / c.wins : 0,
      avgScorePerWin: c.wins ? c.score / c.wins : 0,
      scoreShare: c.score / totalScore,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// Build-Fingerprint als Bucket-Key (docs/sim-harness-plan.md §8): sortierte Perks/Skills/Archetypen + Stat-Vektor.
export function fingerprint(state) {
  const p = [...(state.perks || [])].sort().join(",");
  const s = [...(state.skills || [])].sort().join(",");
  const a = [...(state.activeArchetypes || [])].sort().join(",");
  const st = [state.statCritChance, state.statCritMult, state.statFormMult, state.statStreakMult, state.economyStatLevel].join("/");
  return `P:${p}|S:${s}|A:${a}|St:${st}`;
}
