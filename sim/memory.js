// Cross-Run-Banditengedächtnis (Sim S2). Ein Arm je (kind, id, bucket) hält { n, sum } über
// den NORMALISIERTEN Run-Reward. Bewusst sequenziell: Run K sieht die Statistik aus 1..K-1 —
// deshalb lebt die Adaptivität hier im Harness, NICHT in der puren game/-Schicht (Determinismus-Invariante).
//
// Ablauf pro Run: die Policy ruft `pulled(kind, key)` bei jeder Wahl; am Run-Ende bucht `reward(score)`
// den (normalisierten) Score auf ALLE in diesem Run gezogenen Arme und leert die Pending-Liste.

const SEP = ""; // Trenner im Arm-Key (kollidiert nicht mit ids/Buckets)
export const armKey = (kind, id, bucket = "") => `${kind}${SEP}${id}${SEP}${bucket}`;

export function newMemory({ normalize = (x) => Math.log1p(Math.max(0, x)) } = {}) {
  const arms = new Map(); // key → { n, sum }
  const kindTotals = new Map(); // kind → Σ n (für den UCB-ln(N)-Term)
  let pending = []; // im laufenden Run gezogene Arme

  const getOrCreate = (key) => {
    let a = arms.get(key);
    if (!a) { a = { n: 0, sum: 0 }; arms.set(key, a); }
    return a;
  };

  return {
    normalize,
    // Nicht persistierend: nur Lesen für UCB (ungesehen → {n:0} → explore=∞). Legt KEINEN Arm an,
    // damit `ranking` nur tatsächlich gezogene Arme enthält (kein n=0-Rauschen).
    peek: (key) => arms.get(key) || { n: 0, sum: 0 },
    totalPicks: (kind) => kindTotals.get(kind) || 0,
    pulled(kind, key) { pending.push([kind, key]); },
    reward(score) {
      const r = normalize(score);
      for (const [kind, key] of pending) {
        const a = getOrCreate(key); // erst hier wird der Arm persistiert
        a.n += 1;
        a.sum += r;
        kindTotals.set(kind, (kindTotals.get(kind) || 0) + 1);
      }
      pending = [];
    },
    // Rangliste eines kind, nach Mittelwert (normalisiert) absteigend. Nur für den Report — kein Einfluss auf Läufe.
    ranking(kind) {
      const rows = [];
      for (const [key, a] of arms) {
        const [k, id, bucket] = key.split(SEP);
        if (k !== kind) continue;
        rows.push({ id, bucket, n: a.n, mean: a.n ? a.sum / a.n : 0 });
      }
      return rows.sort((x, y) => y.mean - x.mean || x.id.localeCompare(y.id));
    },
  };
}
