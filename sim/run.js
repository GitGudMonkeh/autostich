// Headless-Treiber (Sim S0). Spielt EINEN vollständigen Run mit einem geseedeten rng
// gegen den aktuellen Build durch und gibt Telemetrie zurück.
//
// Determinismus-Invariante (docs/sim-harness-plan.md §9): EIN makeRng(seed) pro Run,
// dieselbe Referenz für ALLE Dispatches → gleicher Seed + gleiche Policy = gleicher Score.
// Die game/-Schicht bleibt pure; jegliche Adaptivität lebt in der Policy, nicht hier.
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { newTelemetry, observe, summarizeCards, summarizeFormations, fingerprint } from "./metrics.js";
import { summarizeArchitect } from "../src/game/architect.js"; // #202: Architekt-Metriken im Run-Ergebnis

const GUARD_MAX = 1_000_000; // Endlos-Schleifen-Backstop (ein realer Run macht ~1.8k Stiche)

// Telemetrie aus Endzustand (Kennzahlen + Build-Fingerprint) + Per-Karte-Ledger (S1) aus dem lastTrick-Strom.
function finalize(s, seed, tel) {
  return {
    seed,
    score: s.score,
    tricks: s.trickNo,
    cycles: s.cycle,
    wins: s.wins,
    losses: s.losses,
    ties: s.ties,
    crits: s.crits,
    critBonusScore: s.critBonusScore,
    bestStreak: s.bestStreak,
    bestTrickScore: s.bestTrickScore,
    formationWinRate: s.wins ? tel.formationWins / s.wins : 0, // Anteil der Siege mit aktiver Formation (S1)
    fingerprint: fingerprint(s),
    build: {
      perks: [...s.perks].sort(),
      skills: [...s.skills].sort(),
      archetypes: [...(s.activeArchetypes || [])].sort(),
      familyTiers: { ...(s.familyTiers || {}) }, // #267: Familien-Stufen (inkl. Präzision P_*) ersetzen den entfernten Stat-Vektor
    },
    cards: summarizeCards(tel), // Per-Karte-Ledger (S1): Auftritte/Winrate/Crits/Score-Anteil
    formations: summarizeFormations(tel), // Formations-Häufigkeit je Typ (Präsenz-Rate)
    architect: s.architectEnabled ? summarizeArchitect(s.architect) : null, // #202: Architekt-Metriken (Abdeckung/Gebäude/Stufen/Häuserzeilen)
  };
}

// mem (optional): Cross-Run-Banditengedächtnis (S2). Wird an die Policy durchgereicht (adaptive Wahl)
// und am Run-Ende mit dem Run-Score belohnt. Ohne mem verhält sich runOne wie in S0/S1 (Eval-Modus).
// hooks (optional): { onTrick(state) } — nach jedem aufgelösten Stich aufgerufen (Pro-Cycle-Sampling,
// Pacing-Analyse). Rein beobachtend; ändert weder rng noch State → Determinismus-Invariante bleibt.
export function runOne(seed, policy, mem = null, hooks = null, opts = {}) {
  const rng = makeRng(seed);
  // #202/#229: Architekt ist jetzt der Default (der Shop ist entfernt). Nur ein expliziter opts.architect === false
  // fährt noch den (auslaufenden) Shop-Pfad. shopDisabled bleibt für Alt-A/B durchgereicht.
  let s = reducer(null, { type: "START_RUN", rng, architect: opts.architect ?? true, shopDisabled: opts.shopDisabled }); // START_RUN ignoriert den (null-)State
  s = { ...s, trickLog: null }; // #251: Sim braucht den Durchlauf-Graph-Puffer nicht → aus (spart Array-Kopien über Tausende Läufe)
  const tel = newTelemetry();
  let guard = 0;
  while (s.phase !== "gameover") {
    if (++guard > GUARD_MAX) throw new Error(`runOne: Guard bei Phase '${s.phase}' (seed ${seed}) — kein Fortschritt zum gameover`);
    if (s.phase === "play") {
      s = reducer(s, { type: "RESOLVE_TRICK", rng });
      observe(tel, s.lastTrick); // S1: jeden aufgelösten Stich ins Per-Karte-Ledger aufnehmen
      if (hooks && hooks.onTrick) hooks.onTrick(s); // S6: Pro-Stich-Beobachter (Pacing-Kurve)
    } else {
      const action = policy.act(s, rng, mem);
      if (!action) throw new Error(`Policy '${policy.name}' lieferte keine Action für Phase '${s.phase}' (seed ${seed})`);
      const next = reducer(s, action);
      if (next === s) throw new Error(`Policy '${policy.name}' Action '${action.type}' brachte keinen Fortschritt in Phase '${s.phase}' (seed ${seed})`);
      s = next;
    }
  }
  if (mem) mem.reward(s.score); // S2: Run-Score auf alle in diesem Run gezogenen Arme buchen
  return finalize(s, seed, tel);
}
