import { SUIT_ORDER, RANKS } from "./constants.js";

/* Deck-Bau: 4 Farben × Werte 0..12 = 52 Karten.
   value    = aktueller Kampfwert (durch Perks dauerhaft veränderbar, §4.2)
   baseRank = ursprünglicher Wert (nur Anzeige/Debug). */
export function buildDeck() {
  const d = [];
  for (const s of SUIT_ORDER) for (const r of RANKS)
    d.push({ id: `${s}${r}`, suit: s, baseRank: r, value: r });
  return d;
}

// Seedbarer PRNG (mulberry32) — reproduzierbare Läufe für Tests/Sim.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// rng optional durchreichbar (Default Math.random → Live-Verhalten unverändert).
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Gemischte Index-Reihenfolge 0..n-1 = Ziehreihenfolge eines Deck-Durchlaufs.
export function shuffledOrder(n, rng = Math.random) {
  return shuffle(Array.from({ length: n }, (_, i) => i), rng);
}
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// ms → "m:ss" (Run-Timer, #10).
export function fmtDuration(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
