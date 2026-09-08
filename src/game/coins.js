/* Münz-Ökonomie (docs/muenz-oekonomie.md) — die laufinterne Währung. Reine, deterministische Kernlogik:
   Einnahme je Durchlauf und die Preistreppen der Ausgabeflächen. Kein State, keine UI, kein Zufall.

   Mentalmodell: die Einnahme hängt an der SIEGZAHL, nicht am Score. Der Score wächst über einen Lauf um
   Faktor hundert, die Siegzahl ist je Durchlauf hart gedeckelt — die Ökonomie kann deshalb nicht
   explodieren. Die Preistreppen laufen je PHASE und werden in der nächsten auf den Grundpreis
   zurückgesetzt: Sparen bringt Reichweite, nicht Höhe.

   ⚠ Alle Zahlen sind Startwerte der ersten Fassung und über die Sim tunebar (envNum) — gesetzt genug zum
   Bauen, nicht gesetzt genug zum Verteidigen. Ändert sich die Einnahme, müssen die Preise mitwandern. */

import { envNum } from "./constants.js";

/* ---- NICHT ENTSCHIEDEN (docs/muenz-oekonomie.md §8) ----------------------------------------------
   Zwei Punkte des Plans sind ausdrücklich offen. Umgesetzt ist jeweils der EINFACHSTE Weg, damit die
   Ökonomie läuft — beide sind so gebaut, dass die Entscheidung sie an einer Stelle umdreht:

   1. KAUF-BESTÄTIGUNG (§8.1). Kein Kauf fragt nach. Ein Fehltipper kostet Münzen, ein zweiter Tap kostet
      Zeit — dreimal je Phase. Der Mittelweg des Plans wäre, nur die teuren Käufe bestätigen zu lassen
      (Baufeld, Episch-Aufwertung, Legendär-Neuwurf). Nichts hier verhindert das: alle Käufe laufen über
      eine Reducer-Aktion und einen Knopf, ein Bestätigungsschritt sitzt dazwischen.

   2. MÜNZVERFALL AM LAUFENDE (§8.2). Münzen verfallen: `coins` liegt im Lauf-State und geht mit ihm.
      Umgesetzt durch Nichtstun — es gibt keinen Weg, auf dem sie den Lauf verlassen könnten. Soll die
      Mitnahme kommen, ist das eine Regel mehr (im Profil sichern, beim Start laden), keine Umbauten. */

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

   ZWEI Preise, und der Unterschied ist wichtig:
   `price` ist, was DIESER Klick kostet — null, solange Gratis-Neuwürfe übrig sind.
   `nextPrice` ist, was der nächste BEZAHLTE kostet. Der Knopf zeigt ihn IMMER (Owner 2026-09-08): mit zwei
   Gratis-Würfen je Lauf und Pool blieb die Währung sonst die ersten zwei Neuwürfe unsichtbar, und wer den
   Preis nicht sieht, plant nicht mit ihm. Er rechnet mit der Legendär-Basis, wenn das Angebot ein
   Legendäres trägt — sonst verspräche die Vorschau 3, wo gleich 15 fällig werden.

   `legendary` bleibt währenddessen falsch: die Legendär-GARANTIE hängt am Kauf, nicht am Angebot (§3.1) —
   ein Gratis-Wurf verspricht kein Legendäres und trägt deshalb auch nicht den goldenen Rahmen. */
export function rerollOffer(state = {}, freeTokens = 0, legendary = false) {
  const nextPrice = rerollPrice(state.coinRerolls || 0, legendary);
  if (freeTokens > 0) return { free: true, tokens: freeTokens, price: 0, nextPrice, legendary: false, can: true };
  return { free: false, tokens: 0, price: nextPrice, nextPrice, legendary: !!legendary, can: (state.coins || 0) >= nextPrice };
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

/* ---- Fokus rufen (§3.3) --------------------------------------------------------------------------- */
// Fester Preis, einmal je Skill-Phase: der Ruf ist gekaufte AUSWAHL, keine Vormerkung — nichts wird
// aufgehoben, nichts verfällt, also braucht er auch keine Treppe.
export const FOCUS_PRICE = envNum("SIM_COIN_FOCUS", 5);

/* ---- Skill aufwerten (§3.5) ----------------------------------------------------------------------- */
/* Preis nach ZIELSTUFE, nicht nach Reihenfolge: jeder Schritt kostet, was seine Stufe wert ist. Wer von
   Normal auf Episch geht, zahlt 12 + 25 + 40 = 77 — über die Hälfte des Laufeinkommens. Das ist die
   beabsichtigte Wahl: mehrere Skills auf Selten/Sehr selten, oder wenige auf Episch, wenn man spart.
   Ein natürlicher Deckel wirkt ohne eigene Regel: man kann nicht mehr Skills aufwerten, als man hält.
   Index = die interne Stufe (skillTiers 0..3 = Normal … Episch); Stufe 0 ist der Boden, sie kostet nichts.
   §8.5: das ist die EINE Preisleiter der Ökonomie — die alte in `rarity.js` (price 8/12/18/30 aus der
   Shop-Zeit) ist mit ihr gestrichen worden, statt danebenzuliegen. */
export const UPGRADE_PRICES = [0, envNum("SIM_COIN_UP_SELTEN", 12), envNum("SIM_COIN_UP_RAR", 25), envNum("SIM_COIN_UP_EPISCH", 40)];
export const MAX_SKILL_TIER = UPGRADE_PRICES.length - 1;
export const upgradePrice = (targetTier) => UPGRADE_PRICES[targetTier] || 0;
// „ab 12" am Knopf: der billigste Schritt, den es überhaupt gibt — man soll vorher wissen, ob es sich
// lohnt hineinzugehen, ohne dass der Knopf einen Preis nennt, der von der Auswahl abhängt.
export const UPGRADE_FROM = Math.min(...UPGRADE_PRICES.filter((p) => p > 0));

/* Was kostet die nächste Stufe, und ist sie zu haben? Eine Quelle für Liste und Reducer. */
export function upgradeBuy(state = {}, tier = 0) {
  const next = (tier || 0) + 1;
  if (next > MAX_SKILL_TIER) return { maxed: true, next: null, price: 0, can: false };
  const price = upgradePrice(next);
  return { maxed: false, next, price, can: (state.coins || 0) >= price };
}
