import { makeRng } from "./deck.js";

/* Seedbare Läufe (#205 Challenger Mode) — adressierte Sub-Ströme.

   Kern-Idee (gelocktes Design „Policy 1, slot-verankert"): NICHT ein einziger,
   sequenziell fortlaufender PRNG-Strom pro Lauf (der wäre BUILD-ABHÄNGIG — ein anderer
   Build zieht unterschiedlich oft und desynchronisiert). Stattdessen bekommt jeder
   Zufalls-Punkt eine build-UNABHÄNGIGE Adresse `(seed, ...parts)` und daraus einen
   FRISCHEN Generator. Weil DECISION_SCHEDULE je Durchlauf genau eine Entscheidung
   liefert, ist `(seed, cycle, kind[, index])` eindeutig; wie viele Draws eine Stelle
   intern verbraucht, bleibt lokal und blutet nicht in die nächste Adresse. → Zwei Läufe
   mit demselben Seed weichen nur dort ab, wo sich ihre (nach Besitz gefilterten) Pools
   unterscheiden. Der einzige neue State ist der `seed` selbst (+ ein Pro-Angebot-Reroll-
   Zähler für die Reroll-Adresse). Kein persistierter „advancing stream". */

// xmur3-String-Hash → gut avalanchierter 32-bit-Seed (kanonisch mit mulberry32 gepaart).
function xmur3Hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

// Adresse (seed + parts) → deterministischer 32-bit-Sub-Seed. parts = strings/ints (z. B.
// cycle, "perk", rerollIndex). Der Doppelpunkt trennt eindeutig — die Adress-Teile enthalten
// nie ":" (fixe Kennungen + Ganzzahlen).
export function hash32(seed, ...parts) {
  return xmur3Hash(`${seed >>> 0}:${parts.join(":")}`);
}

// Frischer Generator () => float ∈ [0,1) für die Adresse (seed, ...parts).
export function rngAt(seed, ...parts) {
  return makeRng(hash32(seed, ...parts));
}

// Frischer 32-bit-Lauf-Seed. EINZIGE Math.random-Nutzung des Features — wird in App.jsx beim
// Start eines Laufs gewürfelt und in den State gelegt; der Reducer bleibt rein (Invariante).
export function randomSeed() {
  return (Math.random() * 0x100000000) >>> 0;
}

/* Anzeige/Teilen: tippfehlerrobuste Base32 (Crockford-Alphabet — ohne I/L/O/U). Ein 32-bit-
   Seed → feste 7 Zeichen (Großbuchstaben). parseSeed ist tolerant: Groß/Klein egal, verwechsel-
   bare Zeichen werden gemappt (O→0, I/L→1), Fremdzeichen (Leerzeichen, Bindestriche) ignoriert. */
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function formatSeed(uint) {
  let n = uint >>> 0;
  const chars = [];
  for (let i = 0; i < 7; i++) { chars.push(B32[n % 32]); n = Math.floor(n / 32); }
  return chars.reverse().join("");
}

export function parseSeed(str) {
  if (typeof str !== "string") return null;
  const cleaned = str.trim().toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1");
  let n = 0, count = 0;
  for (const ch of cleaned) {
    const v = B32.indexOf(ch);
    if (v < 0) continue; // Fremdzeichen (Leerzeichen, U, Bindestrich, …) überspringen
    n = n * 32 + v;
    count++;
  }
  if (count === 0) return null;
  return n >>> 0; // auf 32-bit klemmen (überlange Eingaben wrappen sauber)
}
