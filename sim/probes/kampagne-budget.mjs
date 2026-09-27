// How strong does one campaign reward have to be? Reads the cached end-score distribution from
// kampagne-schwelle.mjs and answers the question the threshold ladder itself poses: run N of the
// campaign is played with N-1 rewards in hand, so the ladder fixes the power budget per reward.
//
// Model: a reward is worth a factor K on the end score, and K rewards stack multiplicatively.
// Then the share of runs clearing threshold T with n rewards is share(score >= T / K^n) — an exact
// query on the measured distribution, no replay. It holds for rewards that multiply the score and
// is a first cut for rewards that merely enable (slots, rerolls); those are measured separately.
//
//   node sim/probes/kampagne-budget.mjs                 # ladder 5/10/15/25
//   LADDER=5,12,20,35 node sim/probes/kampagne-budget.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out", "kampagne-schwelle.json");
const LADDER = (process.env.LADDER || "5,10,15,25").split(",").map(Number);
const FACTORS = (process.env.K || "1,1.1,1.25,1.5,2,3").split(",").map(Number);

const data = JSON.parse(readFileSync(OUT, "utf8"));
const styles = Object.keys(data);
const pooled = styles.flatMap((k) => data[k]);
const M = 1e6;
const share = (xs, t) => (100 * xs.filter((x) => x >= t).length) / xs.length;

console.log("Leiter: " + LADDER.join(" / ") + " Mio. Lauf n wird mit n-1 Rewards gespielt.");
console.log("Ein Reward = Faktor K auf den Endscore, Rewards stapeln multiplikativ.");
console.log("Basis: " + pooled.length + " gemessene Laeufe.\n");

const pad = (s, n) => String(s).padStart(n);
console.log(pad("K", 5) + LADDER.map((t, i) => pad("L" + (i + 1) + " (" + t + ")", 12)).join("")
  + pad("Kampagne", 11) + pad("je 12 Laeufe", 14));
for (const K of FACTORS) {
  const rates = LADDER.map((t, i) => share(pooled, (t * M) / Math.pow(K, i)));
  const chain = rates.reduce((a, r) => a * (r / 100), 1);
  console.log(pad("x" + K, 5) + rates.map((r) => pad(r.toFixed(0) + " %", 12)).join("")
    + pad((100 * chain).toFixed(1) + " %", 11)
    + pad(chain > 0 ? (1 / chain).toFixed(1) + " Versuche" : "nie", 14));
}

console.log("\nDasselbe je Spielweise, Kampagnen-Erfolgsquote in %:\n");
console.log(pad("K", 5) + styles.map((s) => pad(s, 11)).join(""));
for (const K of FACTORS) {
  console.log(pad("x" + K, 5) + styles.map((s) => {
    const chain = LADDER.reduce((a, t, i) => a * (share(data[s], (t * M) / Math.pow(K, i)) / 100), 1);
    return pad((100 * chain).toFixed(1), 11);
  }).join(""));
}
