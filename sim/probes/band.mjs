// Balance-Band des Zufallsspielers (test/sim-balance-guard.test.js): Median, Mean, p90 über feste Seeds 1..N (Default 40).
// Nach einem Balance-Dreh hiermit die Bänder des Guards neu zentrieren (±35 %).
import { runOne } from "../run.js";
import { randomPolicy } from "../policies/random.js";
const N = Number(process.env.N || 40);
const scores = Array.from({ length: N }, (_, i) => runOne(1 + i, randomPolicy()).score).sort((a, b) => a - b);
const median = N % 2 ? scores[(N - 1) / 2] : (scores[N / 2 - 1] + scores[N / 2]) / 2;
const mean = scores.reduce((t, v) => t + v, 0) / N;
console.log(`seeds 1..${N}: median ${Math.round(median).toLocaleString("en-US")}  mean ${Math.round(mean).toLocaleString("en-US")}  p90 ${Math.round(scores[Math.floor(N * 0.9)]).toLocaleString("en-US")}`);
