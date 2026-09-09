/* Münz-Ökonomie (docs/muenz-oekonomie.md) — die laufinterne Währung. Reine, deterministische Kernlogik:
   Einnahme je Durchlauf und die Preistreppen der Ausgabeflächen. Kein State, keine UI, kein Zufall.

   Mentalmodell: die Einnahme hängt an der AUFSTELLUNG — weder am Score noch an der Siegzahl. Der Score
   wächst über einen Lauf um Faktor hundert; die Siegzahl wächst weniger, bevorzugt aber die Fraktionen,
   die leichter Stiche gewinnen. Die Aufstellung tut beides nicht. Die Preistreppen laufen je PHASE und
   werden in der nächsten auf den Grundpreis zurückgesetzt: Sparen bringt Reichweite, nicht Höhe.

   ⚠ Alle Zahlen sind Startwerte der ersten Fassung und über die Sim tunebar (envNum) — gesetzt genug zum
   Bauen, nicht gesetzt genug zum Verteidigen. Ändert sich die Einnahme, müssen die Preise mitwandern.
   Die Preise stehen bewusst noch gegen die ALTE Größenordnung (~130 statt gemessener ~200 je Lauf):
   Owner-Entscheid 2026-09-09, um im Spiel zu sehen, wie sich die höhere Kaufkraft anfühlt. */

import { envNum } from "./constants.js";

/* ---- Zwei Regeln, die nirgends Code brauchen (docs/muenz-oekonomie.md) ---------------------------
   1. MÜNZVERFALL AM LAUFENDE. Übrige Münzen verfallen (Owner 2026-09-09) — kein Score-Umtausch, keine
      Mitnahme. Umgesetzt durch Nichtstun: `coins` liegt im Lauf-State und geht mit ihm. Ein Umtauschkurs
      würde gegen jeden Kauf aufgerechnet und machte den letzten Durchlauf zur Rechenaufgabe.

   2. KAUF-BESTÄTIGUNG NACH BILDSCHIRM, nicht nach Preis (Owner 2026-09-09): Aufwerten und Verkaufen
      fragen IMMER nach, unabhängig vom Betrag; alle übrigen Käufe nie. In einer Liste dicht stehender
      Einträge vertippt man sich, an einem einzelnen Knopf nicht — und eine Preisschwelle wäre nicht
      erklärbar (bei 15 gefragt, bei 14 still). Die Regel sitzt in der UI, nicht hier. */

/* ---- Einnahme (§2) ------------------------------------------------------------------------------- */
/* SOCKEL + AUFSTELLUNG: `BASE + min(CAP, floor(gebaute Formationen / PER))`.

   Die Kopplung an die SIEGZAHL ist gestrichen (Owner 2026-09-09). Sie bevorzugte die Fraktionen, die
   leichter Stiche gewinnen: gemessen 1,76× zwischen Feuer (144 Münzen je Lauf) und Pflanze (82) — Eis
   und Feuer heben den Kartenwert bzw. senken den des Gegners, Blitz zahlt auf Score statt auf Siege.
   Über Formationen gemessen sind es 1,14× (190…216 je Lauf).

   Warum die Aufstellung fair ist: Formationen entstehen in der AUFSTELLPHASE — computeFormations läuft
   einmal je Durchlauf über die Reihenfolge, bevor der erste Stich fällt. Der Stich entscheidet nur, ob
   der Formations-MULTIPLIKATOR ausgezahlt wird; für die Zählung ist er egal.

   Der DECKEL (Owner 2026-09-09) ist kein Feintuning, sondern schließt eine Lücke: ein randvolles Brett
   trägt bis 145 Positions×Formations-Paare, und weil KURZE Formationen mehr distinkte ergeben als lange
   (gemessene mittlere Länge 3,3), zahlte der Extremfall ungedeckelt 8–12 statt 4. Bei 32 Formationen
   bindet er und trifft 1 % der gemessenen Durchläufe. */
export const COIN_CYCLE_BASE = envNum("SIM_COIN_BASE", 2);        // Sockel je Durchlauf, unabhängig von allem
export const COIN_FORM_PER = envNum("SIM_COIN_PER_FORMS", 8);     // so viele gebaute Formationen zahlen eine Münze
export const COIN_FORM_CAP = envNum("SIM_COIN_FORM_CAP", 4);      // höchstens so viele Münzen aus Formationen
export const COIN_START = envNum("SIM_COIN_START", 3);            // Startbetrag beim Laufstart

export const coinsForFormations = (forms) =>
  COIN_CYCLE_BASE + Math.min(COIN_FORM_CAP, Math.floor(Math.max(0, forms || 0) / COIN_FORM_PER));

/* ---- Verzicht zahlt (§2.3) ------------------------------------------------------------------------ */
/* Vier Quellen, ein Gedanke: wer auf etwas verzichtet, tauscht Build-Stärke gegen Kaufkraft. Sie sind die
   ZWEITE Einnahmeart neben dem Durchlauf und die einzige, die der Spieler selbst auslöst.

   Beim Spielen im Auge behalten (§2.3): Ablehnen zahlt mehr, als ein Neuwurf kostet (Perk 6 gegen
   Neuwurf 3). Wer ohnehin ablehnen will, kann vorher mit Gewinn würfeln — selbstbegrenzend, weil es die
   Phase kostet, aber eine Schleife, die ein Spieler findet. */
export const FORFEIT_SKILL = envNum("SIM_COIN_FORFEIT_SKILL", 12);
export const FORFEIT_PERK = envNum("SIM_COIN_FORFEIT_PERK", 6);
export const FORFEIT_ENERGY = envNum("SIM_COIN_FORFEIT_ENERGY", 1);   // je übriger Energie
export const FORFEIT_BUILD = envNum("SIM_COIN_FORFEIT_BUILD", 6);     // Architekt-Phase ohne Hauptaktion

/* Übrige Formations-Energie am Ende der Aufstellphase. GEKAUFTE Energie (§3.2) zählt nicht mit — sonst
   kauft man für 3 und bekommt 1 zurück, und der Kauf wäre Geldvernichtung mit Rabatt. Die Rechnung
   behandelt die gekaufte Energie damit als die zuletzt übrige: erst zahlt sich aus, was über sie
   hinausgeht. */
export const unspentEnergyCoins = (left = 0, bought = 0) =>
  Math.max(0, (left || 0) - (bought || 0)) * FORFEIT_ENERGY;

/* Eine Gutschrift, an EINER Stelle gebaut: Kontostand plus die Spur für die Anzeige (§4 — eine
   Verzichts-Zahlung muss in dem Moment sichtbar werden, in dem sie anfällt, sonst merkt niemand, dass
   Ablehnen zahlt). `seq` zählt hoch, damit zweimal derselbe Betrag als zwei Ereignisse ankommt und die
   Leiste nicht stumm bleibt. Betrag ≤ 0 → null, der Aufrufer schreibt dann nichts. */
export function coinGrant(state = {}, n = 0, source = "") {
  if (!(n > 0)) return null;
  return { coins: (state.coins || 0) + n, coinGain: { n, source, seq: ((state.coinGain && state.coinGain.seq) || 0) + 1 } };
}

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

/* Dieselbe Leiter für PERKS (Owner 2026-09-08: „genauso wie Skills, gleiche Kosten").

   Nur die Zählung geht auseinander, und das ist der ganze Unterschied: ein Skill zählt seine Stufen ab 0
   (0 = die erste gehaltene), eine Familie ab 1 — dort ist 0 reserviert für „nicht besessen" (rarity.js).
   Rang 1 ist also dasselbe wie Skill-Stufe 0, und die Umrechnung ist ein Versatz um eins.

   BEWUSST über `upgradeBuy` statt mit eigenen Preisen: es gibt eine Preisleiter, nicht zwei nebeneinander.
   Wer UPGRADE_PRICES anfasst, verschiebt beide. */
export function familyUpgradeBuy(state = {}, tier = 0) {
  const buy = upgradeBuy(state, (tier || 0) - 1);
  return buy.maxed ? buy : { ...buy, next: buy.next + 1 };
}

export const MAX_FAMILY_TIER = MAX_SKILL_TIER + 1;
