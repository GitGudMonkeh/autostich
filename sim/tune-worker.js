// Arbeiter des Parameter-Tunings (sim/tune.js). Ein Auftrag = EIN Kandidat auf dem Seed-Satz.
// Rechnet wie survey-worker.js bewusst nichts aus, was der Koordinator zusammenführt: hier laufen nur Läufe.
import { runOne } from "./run.js";
import { randomPolicy } from "./policies/random.js";
import { greedyFormationStep } from "./formation.js";
import { withCoins } from "./coin-policy.js";

// Der gemessene Spieler: greedy Architekt, greedy Aufstellung, Münzen nach dem Kandidaten. Bewusst die
// random-Baseline beim Draft — getunt wird die BÖRSE, und ein mitlernender Draft würde den Effekt vermischen.
function policyFor(buys) {
  const base = randomPolicy({ architectGreedy: true });
  const play = { name: "base", act: (s, rng, mem) => (s.phase === "formation" ? greedyFormationStep(s) : base.act(s, rng, mem)) };
  return buys ? withCoins(play, buys) : play;
}

process.on("message", (job) => {
  try {
    const policy = policyFor(job.buys);
    const scores = [];
    for (let i = 0; i < job.seeds.length; i++) scores.push(runOne(job.seeds[i], policy).score);
    process.send({ ok: true, id: job.id, scores });
  } catch (e) {
    process.send({ error: `Kandidat ${job.id}: ${e.message}` });
  }
});
