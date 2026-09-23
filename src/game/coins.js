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
import * as CP from "./campaign.js"; // Handelsbrief: derselbe Nachlass auf jeden Preis (kein Zyklus — campaign.js kennt nur rarity.js)

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

   KEIN DECKEL mehr (Owner 2026-09-16). Der alte lag bei 4 Münzen. Er schloss ursprünglich eine Lücke:
   ein randvolles Brett trägt bis 145 Positions×Formations-Paare, und weil KURZE Formationen mehr
   distinkte ergeben als lange (gemessene mittlere Länge 3,3), zahlte der Extremfall ungedeckelt 8–12
   statt 4. Mit dem Schritt 8 band er ab 32 Formationen und traf 1 % der Durchläufe. Seit dem Schritt 10
   (Owner 2026-09-14) hätte er erst ab 50 gebunden, und gemessen (2026-09-16, 150 Läufe) liegt der beste
   Durchlauf bei 32 Formationen — er hat also seit zwei Tagen nichts mehr getan. Die Einnahme steigt
   damit linear weiter, und wer über 50 Formationen baut, wird dafür auch bezahlt. */
export const COIN_CYCLE_BASE = envNum("SIM_COIN_BASE", 2);        // Sockel je Durchlauf, unabhängig von allem
// Owner 2026-09-14: 8 → 10. Der gemessene Median von 18 Formationen zahlt damit 1 statt 2 Münzen, die
// Durchlauf-Einnahme fällt von 4 auf 3.
export const COIN_FORM_PER = envNum("SIM_COIN_PER_FORMS", 10);    // so viele gebaute Formationen zahlen eine Münze
export const COIN_START = envNum("SIM_COIN_START", 3);            // Startbetrag beim Laufstart

export const coinsForFormations = (forms) =>
  COIN_CYCLE_BASE + Math.floor(Math.max(0, forms || 0) / COIN_FORM_PER);

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

/* Gibt es in DIESEM Lauf überhaupt Münzen? Die WIRKUNG sperrt `coinGrant` unten; diese Frage stellt
   die OBERFLÄCHE, damit sie keine Preise und keine Gutschriften für eine Ökonomie zeigt, die es nicht
   gibt. Beides braucht es, und das ist im Playtest auf `exp` aufgefallen: Neuwurf-Preise, „Fokus
   rufen" und ein „Ablehnen → Perk (+12)" standen in einem Lauf ohne freigeschaltete Münzen
   vollständig auf dem Schirm — mechanisch war alles längst tot. Ein Lauf ohne Kampagne trägt das
   Feld nicht und ist damit an. */
export const coinsOn = (state = {}) => state.coinsEnabled !== false;

/* Eine Gutschrift, an EINER Stelle gebaut: Kontostand plus die Spur für die Anzeige (§4 — eine
   Verzichts-Zahlung muss in dem Moment sichtbar werden, in dem sie anfällt, sonst merkt niemand, dass
   Ablehnen zahlt). `seq` zählt hoch, damit zweimal derselbe Betrag als zwei Ereignisse ankommt und die
   Leiste nicht stumm bleibt. Betrag ≤ 0 → null, der Aufrufer schreibt dann nichts. */
export function coinGrant(state = {}, n = 0, source = "") {
  if (!(n > 0)) return null;
  /* Kampagne, Ebene 1 (docs/kampagne.md §11): ohne freigeschaltete Ökonomie gibt es keine Münzen —
     auch keine aus dem Verzicht. Die Sperre sitzt hier und nicht an den vier Aufrufern, weil dies
     der einzige Weg ist, auf dem eine Münze entsteht; eine vergessene Stelle wäre sonst ein
     stiller Kanal. */
  if (!coinsOn(state)) return null;
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
/* EXPORTIERT, damit die Kaufflächen unten die Treppe mit einem anderen Faktor rechnen können, ohne
   dass `energyPrice`/`coverPrice` einen zweiten Parameter bekommen. Genau der wäre eine Falle: beide
   werden idiomatisch an `.map()` gereicht, und `.map` schiebt den INDEX als zweites Argument nach —
   aus `[0,1].map(energyPrice)` würde dann still „Leiter 0" und „Leiter 1". */
export const priceStep = (base, bought, ladder = PRICE_LADDER) => Math.round(base * ladder ** Math.max(0, bought || 0));
const step = priceStep;

/* Der Kampagnen-Boss Wucherer verdreifacht die Treppe, statt sie zu verdoppeln (3 → 9 → 27): der
   Grundpreis bleibt, nur jede weitere Stufe wird teurer. Er kommt als schlichte Zahl auf dem State
   (`state.priceLadder`, vom Lauf-Start gesetzt) — coins.js soll die Kampagne nicht kennen müssen,
   und es ist dasselbe Muster wie `coinsEnabled`.
   Bewusst an der TREPPE und nicht als Nachrechnung am fertigen Preis: der legendäre Neuwurf hat eine
   eigene Basis (15), aus dem Preis allein ließe sich die Stufenzahl nicht zurückrechnen. */
export const ladderOf = (state = {}) => state.priceLadder || PRICE_LADDER;
export const rerollPrice = (bought = 0, legendary = false, ladder = PRICE_LADDER) =>
  step(legendary ? REROLL_LEG_BASE : REROLL_BASE, bought, ladder);

/* DECKEL je Phase (Owner 2026-09-15). Bis hierher war der Preis der einzige Regler: „beliebig oft je
   Phase, jeder weitere teurer", und beim legendären Neuwurf ausdrücklich „kein Deckel". Das hielt,
   solange jeder Wurf etwas kostete. Die Beute-Familie Nachlass IV macht Neuwürfe GRATIS, und kostenlos
   heißt ohne Deckel unbegrenzt — der Spieler könnte jedes Angebot durchwürfeln, bis das Gewünschte
   steht. Der Deckel schließt genau das, und zwar für ALLE Neuwürfe, nicht nur die gekauften:
   gezählt wird `offerRerolls`, der Index des laufenden Angebots, den Token- und Münzwürfe gleichermaßen
   hochzählen und den jedes frische Angebot auf 0 setzt. */
export const REROLL_CAP = envNum("SIM_COIN_REROLL_CAP", 3);
export const rerollsLeft = (state = {}) => Math.max(0, REROLL_CAP - (state.offerRerolls || 0));

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
  const nextPrice = rerollPrice(state.coinRerolls || 0, legendary, ladderOf(state));
  const left = rerollsLeft(state);
  // Der Deckel steht VOR dem Preis: ist er erreicht, ist auch ein Gratis-Wurf keiner mehr.
  /* `offered` = gibt es diesen Knopf überhaupt. Die beiden KAUF-Wege hängen daran, ob es in diesem
     Lauf Münzen gibt (Kampagne Ebene 1); der Gratis-Wurf darunter nicht, den hat man sich verdient.
     Auch der Deckel-Hinweis geht mit: er deckelt den Kauf, und ohne Ökonomie gibt es nichts zu
     deckeln. */
  const kauf = coinsOn(state);
  if (left <= 0) return { free: false, tokens: freeTokens, price: nextPrice, nextPrice, legendary: false, can: false, left: 0, capped: true, offered: kauf };
  if (freeTokens > 0) return { free: true, tokens: freeTokens, price: 0, nextPrice, legendary: false, can: true, left, capped: false, offered: true };
  return { free: false, tokens: 0, price: nextPrice, nextPrice, legendary: !!legendary, can: (state.coins || 0) >= nextPrice, left, capped: false, offered: kauf };
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
/* `netto` ist die eine Stelle, an der ein fertiger Preis zum ZAHLBAREN wird: Handelsbrief nimmt
   seine Prozente, nachdem die Treppe (und damit der Wucherer) gerechnet hat. Sie sitzt in den
   PREIS-Funktionen und nicht im Reducer, weil Knopf und Reducer dieselbe Zahl lesen muessen — die
   Lehre aus dem Beute-Audit 2026-09-17, als ein Nachlass im Reducer wirkte und am Knopf nicht. */
const netto = (state, price) => CP.discountWith(state, price);

export function stepBuy(state = {}, bought = 0, max = 0, price = 0) {
  const left = Math.max(0, max - (bought || 0));
  const p = netto(state, price);
  return { left, max, price: p, soldOut: left <= 0, can: left > 0 && (state.coins || 0) >= p };
}
/* Wucherer gilt fuer JEDE Kaufart, jede mit ihrem eigenen Zaehler (Owner 2026-09-22) — deshalb
   reicht jede Kaufflaeche die Leiter des Laufs durch. */
export const energyBuy = (state = {}) =>
  stepBuy(state, state.coinEnergy || 0, ENERGY_MAX_BUYS, priceStep(ENERGY_BASE, state.coinEnergy || 0, ladderOf(state)));
export const coverBuy = (state = {}) =>
  stepBuy(state, state.coverBuys || 0, COVER_MAX_BUYS, priceStep(COVER_BASE, state.coverBuys || 0, ladderOf(state)));

/* ---- Fokus rufen (§3.3) --------------------------------------------------------------------------- */
// Fester Preis, einmal je Skill-Phase: der Ruf ist gekaufte AUSWAHL, keine Vormerkung — nichts wird
// aufgehoben, nichts verfällt, also braucht er auch keine Treppe.
// Owner 2026-09-14: 5 → 10. Zusammen mit COIN_FORM_PER 8 → 10 kostet der Ruf damit über drei
// Durchlauf-Einnahmen statt einer knappen — er ist eine Entscheidung, kein Beiläufiges mehr.
export const FOCUS_PRICE = envNum("SIM_COIN_FOCUS", 10);
// Derselbe Preis, nur mit dem Nachlass — der Ruf ist ein Kauf wie jeder andere.
export const focusPrice = (state = {}) => netto(state, FOCUS_PRICE);

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
  const price = netto(state, upgradePrice(next));
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

/* Reihenfolge der Aufwert-Listen (Owner 2026-09-14): aufsteigend nach dem Preis der nächsten Stufe — oben das
   Bezahlbare, unten das (noch) zu Teure, „höchste Stufe" ganz ans Ende. Weil der Preis allein an der gehaltenen
   Stufe hängt, ist das zugleich die Sortierung nach Rarität. Als Funktion, damit Skill- und Perk-Bildschirm
   dieselbe Regel lesen, statt sie zweimal in JSX zu führen. `buy` ist upgradeBuy bzw. familyUpgradeBuy. */
export const upgradeSortKey = (buy) => (buy && buy.maxed ? Infinity : (buy && buy.price) || 0);
