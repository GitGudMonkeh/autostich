// Zufallsquelle. Ohne Seed Math.random; mit Seed (mulberry32) reproduzierbar, damit Tests stabil bleiben.

export function erzeugeZufall(seed) {
  if (seed === undefined) return Math.random;
  let zustand = seed >>> 0;
  return function zufall() {
    zustand = (zustand + 0x6d2b79f5) >>> 0;
    let t = zustand;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ganze Zufallszahl von min bis max, beide einschließlich.
export function ganzzahl(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function auswahl(rng, liste) {
  return liste[Math.floor(rng() * liste.length)];
}

export function chance(rng, wahrscheinlichkeit) {
  return rng() < wahrscheinlichkeit;
}
