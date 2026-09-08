/* Münz-Ökonomie (docs/muenz-oekonomie.md) — die laufinterne Währung. Reine, deterministische Kernlogik:
   Einnahme je Durchlauf und die Preistreppen der Ausgabeflächen. Kein State, keine UI, kein Zufall.

   Mentalmodell: die Einnahme hängt an der SIEGZAHL, nicht am Score. Der Score wächst über einen Lauf um
   Faktor hundert, die Siegzahl ist je Durchlauf hart gedeckelt — die Ökonomie kann deshalb nicht
   explodieren. Die Preistreppen laufen je PHASE und werden in der nächsten auf den Grundpreis
   zurückgesetzt: Sparen bringt Reichweite, nicht Höhe.

   ⚠ Alle Zahlen sind Startwerte der ersten Fassung und über die Sim tunebar (envNum) — gesetzt genug zum
   Bauen, nicht gesetzt genug zum Verteidigen. Ändert sich die Einnahme, müssen die Preise mitwandern. */

import { envNum } from "./constants.js";

/* ---- Einnahme (§2) ------------------------------------------------------------------------------- */
// Schwelle und Schrittweite: floor((Siege − THRESHOLD) / PER). Die Schwelle erzeugt die Spreizung — die
// Siegzahl steigt über den Lauf nur um Faktor ~1,7 (24 → 40), durch die Schwelle werden daraus Faktor 5
// bei den Münzen. Früh knapp, spät reichlich, ohne die Kopplung an den Score.
export const COIN_WIN_THRESHOLD = envNum("SIM_COIN_THRESHOLD", 20);
export const COIN_WIN_PER = envNum("SIM_COIN_PER_WINS", 4);

export const coinsForWins = (wins) => Math.max(0, Math.floor(((wins || 0) - COIN_WIN_THRESHOLD) / COIN_WIN_PER));

/* ---- Neuwurf (§3.1) ------------------------------------------------------------------------------ */
// Zwei Grundpreise, EIN Zähler. Der Zähler sind die GEKAUFTEN Neuwürfe dieser Phase (state.coinRerolls) —
// Gratis-Neuwürfe aus den Pools zählen nicht mit, sonst wäre der erste Kauf nach zwei Freiwürfen schon
// bei 12. Der Grundpreis kommt aus der Art des Angebots: wer erst normal und dann legendär würfelt,
// zahlt beim zweiten Kauf 30 und nicht 15 — sonst wäre Mischen billiger als Durchhalten.
export const REROLL_BASE = envNum("SIM_COIN_REROLL", 3);
export const REROLL_LEG_BASE = envNum("SIM_COIN_REROLL_LEG", 15);

/* Alle drei Treppen verdoppeln — Neuwurf 3→6→12, Energie 3→6, Baufeld 20→40. EIN Faktor, damit „jeder
   weitere teurer" überall dasselbe heißt und ein Tuning-Schritt nicht drei Zahlen anfassen muss. */
export const PRICE_LADDER = envNum("SIM_COIN_LADDER", 2);
const step = (base, bought) => Math.round(base * PRICE_LADDER ** Math.max(0, bought || 0));

export const rerollPrice = (bought = 0, legendary = false) => step(legendary ? REROLL_LEG_BASE : REROLL_BASE, bought);

/* Was der NÄCHSTE Neuwurf kostet — die eine Quelle für Knopf und Reducer. Läuft der Knopf auf einer
   anderen Rechnung als der Reducer, zeigt er einen Preis an, den der Kauf nicht nimmt.
   Solange Gratis-Neuwürfe übrig sind, ist der Neuwurf gratis und NICHT der Legendär-Wurf: die
   Legendär-Garantie hängt am Kauf, nicht am Angebot (§3.1). */
export function rerollOffer(state = {}, freeTokens = 0, legendary = false) {
  if (freeTokens > 0) return { free: true, tokens: freeTokens, price: 0, legendary: false, can: true };
  const price = rerollPrice(state.coinRerolls || 0, legendary);
  return { free: false, tokens: 0, price, legendary: !!legendary, can: (state.coins || 0) >= price };
}

/* ---- Energie in der Aufstellphase (§3.2) ---------------------------------------------------------- */
// Ein zusätzlicher Tausch in der LAUFENDEN Phase. Gekaufte Energie verfällt mit der Phase — sie hebt die
// laufende Energie, nicht die Basis; ansparen für später gibt es hier also nicht.
export const ENERGY_BASE = envNum("SIM_COIN_ENERGY", 3);
export const ENERGY_MAX_BUYS = envNum("SIM_COIN_ENERGY_MAX", 2); // höchstens +2 je Aufstellphase
export const energyPrice = (bought = 0) => step(ENERGY_BASE, bought);

/* ---- Baufeld-Zellen (§3.4) ------------------------------------------------------------------------ */
// Die einzige Ausgabe mit DAUERHAFTER Wirkung und die einzige mit einem Vorrat, der sich leert — deshalb
// zeigt ihr Knopf, wie viel vom Lauf noch übrig ist. Zählt je LAUF, nicht je Phase.
export const COVER_BASE = envNum("SIM_COIN_COVER", 20);
export const COVER_MAX_BUYS = envNum("SIM_COIN_COVER_MAX", 2);   // genau zweimal je Lauf
export const COVER_CELLS = envNum("SIM_COIN_COVER_CELLS", 2);    // so viele Zellen je Kauf
export const coverPrice = (bought = 0) => step(COVER_BASE, bought);

/* Ein Kauf mit Vorrat — eine Quelle für Knopf und Reducer, wie `rerollOffer`. `left` trägt die Anzeige
   (die Punkte am Baufeld-Knopf), `can` die Auslösbarkeit: ausverkauft ODER zu wenig Münzen. */
export function stepBuy(state = {}, bought = 0, max = 0, price = 0) {
  const left = Math.max(0, max - (bought || 0));
  return { left, max, price, soldOut: left <= 0, can: left > 0 && (state.coins || 0) >= price };
}
export const energyBuy = (state = {}) =>
  stepBuy(state, state.coinEnergy || 0, ENERGY_MAX_BUYS, energyPrice(state.coinEnergy || 0));
export const coverBuy = (state = {}) =>
  stepBuy(state, state.coverBuys || 0, COVER_MAX_BUYS, coverPrice(state.coverBuys || 0));
