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
export const REROLL_FACTOR = envNum("SIM_COIN_REROLL_FACTOR", 2); // Verdopplung je weiterem Kauf der Phase

export const rerollPrice = (bought = 0, legendary = false) =>
  Math.round((legendary ? REROLL_LEG_BASE : REROLL_BASE) * REROLL_FACTOR ** Math.max(0, bought || 0));

/* Was der NÄCHSTE Neuwurf kostet — die eine Quelle für Knopf und Reducer. Läuft der Knopf auf einer
   anderen Rechnung als der Reducer, zeigt er einen Preis an, den der Kauf nicht nimmt.
   Solange Gratis-Neuwürfe übrig sind, ist der Neuwurf gratis und NICHT der Legendär-Wurf: die
   Legendär-Garantie hängt am Kauf, nicht am Angebot (§3.1). */
export function rerollOffer(state = {}, freeTokens = 0, legendary = false) {
  if (freeTokens > 0) return { free: true, tokens: freeTokens, price: 0, legendary: false, can: true };
  const price = rerollPrice(state.coinRerolls || 0, legendary);
  return { free: false, tokens: 0, price, legendary: !!legendary, can: (state.coins || 0) >= price };
}
