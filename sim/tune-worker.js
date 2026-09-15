// Arbeiter des Parameter-Tunings (sim/tune.js). Ein Auftrag = EIN Kandidat auf dem Seed-Satz.
// Rechnet wie survey-worker.js bewusst nichts aus, was der Koordinator zusammenführt: hier laufen nur Läufe.
import { runOne } from "./run.js";
import { randomPolicy } from "./policies/random.js";
import { greedyFormationStep } from "./formation.js";
import { withCoins } from "./coin-policy.js";

// Der gemessene Spieler: greedy Architekt (nach den Kandidaten-Gewichten), greedy Aufstellung, Münzen nach dem
// Kandidaten. Bewusst die random-Baseline beim Draft — ein mitlernender Draft würde den Effekt vermischen.
function policyFor(buys, weights) {
  const base = randomPolicy({ architectGreedy: true, architectWeights: weights || null });
  const play = { name: "base", act: (s, rng, mem) => (s.phase === "formation" ? greedyFormationStep(s) : base.act(s, rng, mem)) };
  return buys ? withCoins(play, buys) : play;
}

/* Still enden, wenn der Koordinator weg ist. Ein Auftrag läuft je nach Seed-Satz sekundenlang; bricht der
   Koordinator in dieser Zeit ab (Strg-C, Fehler, Abschuss), ist der Kanal beim Antworten schon zu und ein
   nacktes `process.send` wirft ein unbehandeltes EPIPE — jeder Arbeiter spuckt dann einen Stacktrace, der
   wie der eigentliche Fehler aussieht und den echten Grund im Log begräbt. */
const reply = (msg) => { try { if (process.connected) process.send(msg); } catch { /* Koordinator ist weg */ } };

process.on("message", (job) => {
  try {
    const policy = policyFor(job.buys, job.weights);
    const scores = [];
    for (let i = 0; i < job.seeds.length; i++) scores.push(runOne(job.seeds[i], policy).score);
    reply({ ok: true, id: job.id, scores });
  } catch (e) {
    reply({ error: `Kandidat ${job.id}: ${e.message}` });
  }
});
process.on("disconnect", () => process.exit(0));
