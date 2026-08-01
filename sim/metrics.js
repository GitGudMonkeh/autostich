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
    tricks: 0, // beobachtete Stiche gesamt (Nenner für Häufigkeiten)
    formationTricks: 0, // Stiche, in denen ≥1 Formation aktiv war
    formationTypes: new Map(), // Formationstyp → Zahl Stiche, in denen der Typ präsent war (je Stich einmal)
  };
}

export function observe(tel, t) {
  if (!t || !t.pCard) return;
  tel.tricks += 1;
  // Formations-Typen dieser Position zählen — PRÄSENZ (unabhängig von Sieg/Niederlage), für die Häufigkeitsanalyse.
  if (t.formations && t.formations.length) {
    tel.formationTricks += 1;
    const seen = new Set();
    for (const f of t.formations) if (!seen.has(f.type)) { seen.add(f.type); tel.formationTypes.set(f.type, (tel.formationTypes.get(f.type) || 0) + 1); }
  }
  const id = t.pCard.id;
  let c = tel.cards.get(id);
  if (!c) {
    c = { id, suit: t.pCard.suit, appearances: 0, wins: 0, losses: 0, ties: 0, crits: 0, score: 0 };
    tel.cards.set(id, c);
  }
  c.appearances += 1;
  // Score fällt regulär nur bei Sieg an (gained = 0 sonst) — Ausnahme: die Durchlauf-Ende-Payoffs (#203 Zinseszins/Echo)
  // schreibt die Engine dem Schluss-Stich gut, der auch eine Niederlage sein kann → ergebnisUNabhängig verbuchen.
  c.score += t.gained || 0;
  if (isWin(t.result)) {
    c.wins += 1;
    if (t.isCrit) c.crits += 1;
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

// Formations-Häufigkeit: Anteil gespielter Positionen mit Formation X (Präsenz). Naives Spiel (kein Solver)
// → natürliche Auftrittsrate = „wie leicht per Zufall". Optimiertes Spiel → „wie oft mit gutem Aufbau baubar".
export function summarizeFormations(tel) {
  const tricks = tel.tricks || 1;
  const types = {};
  for (const [type, n] of tel.formationTypes) types[type] = n / tricks;
  return { anyRate: tel.formationTricks / tricks, types };
}

// Build-Fingerprint als Bucket-Key (docs/sim-harness-plan.md §8): sortierte Perks/Skills/Archetypen + Stat-Vektor.
export function fingerprint(state) {
  const p = [...(state.perks || [])].sort().join(",");
  const s = [...(state.skills || [])].sort().join(",");
  const a = [...(state.activeArchetypes || [])].sort().join(",");
  const st = [state.statCritChance, state.statCritMult, state.statFormMult, state.statStreakMult].join("/");
  return `P:${p}|S:${s}|A:${a}|St:${st}`;
}
