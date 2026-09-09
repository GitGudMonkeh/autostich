/* Perk-Verkauf (docs/muenz-oekonomie.md §3.6) — TESTFEATURE. Nur Perks; Skills sind nicht verkäuflich.

   Die Leitregel des Owners (2026-09-09): **was man aufbaut, behält man — alles andere wird zurückgebaut.**
   Erspieltes (Pflanzenwachstum, Feuer-Schmieden, Gletschermasse) fasst der Verkauf deshalb nicht an; es
   liegt ohnehin nicht in `card.value`, sondern kommt beim Stich als eigener Summand dazu.

   Rein und deterministisch: nimmt State, gibt ein Patch. Die Naht zum Reducer ist bewusst schmal —
   `formations` rechnet der Reducer danach neu, er allein kennt Anker, Architekt und Pflanzen-Beutel. */

import * as C from "./constants.js";
import { envNum } from "./constants.js";
import { UPGRADE_PRICES, coinGrant } from "./coins.js";
import { FAMILY_DEFS } from "./families.js";
import { PERK_DEFS, isLegendary, rarityTierApprox } from "./perks.js";
import { isLegendarySkill } from "./skills.js";
import { occupiedCells as archOccupied, MAX_COVER as ARCH_MAX_COVER } from "./architect.js";

/* ---- Preise ---------------------------------------------------------------------------------------
   EINE Leiter, nicht zwei: der Erlös ist die Hälfte dessen, was die gehaltene Stufe an Aufwertung
   gekostet hat (`UPGRADE_PRICES` aus coins.js, §3.5). Wer die Leiter anfasst, verschiebt Kauf und
   Verkauf zugleich — genau so ist es gewollt.

   Zwei Zahlen stehen daneben, beide Owner-Entscheide (2026-09-09):
   · SOCKEL 3 für Stufe I. Ohne ihn wäre die Hälfte der Liste ausgegraut — 60 % aller Drops fallen auf
     Grundstufe und haben nach der Formel den Erlös 0.
   · LEGENDÄR 50. Legendäre tragen keine Stufe und wären nach der Formel wertlos; 50 setzt die Leiter
     über Episch fort. Das Argument ist ihr eingebauter Nachteil: bei allen anderen Perks ist Verkaufen
     eine Notlösung, bei Legendären löst es ein Problem, das das Design absichtlich erzeugt hat. */
export const SELL_FLOOR = envNum("SIM_COIN_SELL_FLOOR", 3);
export const SELL_LEGENDARY = envNum("SIM_COIN_SELL_LEG", 50);

// Kumuliert investiert bis zu dieser Stufe = die Summe aller Aufwert-Schritte DARUNTER (I:0 · II:12 · III:37 · IV:77).
export const investedFor = (tier) => UPGRADE_PRICES.slice(1, Math.max(0, tier || 0)).reduce((s, p) => s + p, 0);
export const sellPrice = (tier) => Math.max(SELL_FLOOR, Math.floor(investedFor(tier) / 2));
export const perkSellPrice = (perkId) => (isLegendary(perkId) ? SELL_LEGENDARY : sellPrice(rarityTierApprox((PERK_DEFS[perkId] || {}).rarity)));

/* ---- Deck-Differenzen -----------------------------------------------------------------------------
   Deck-Perks merken sich beim Nehmen je Karte die TATSÄCHLICHE Differenz, und der Verkauf zieht sie ab.
   Nicht die Regel nachspielen: 14 der Deck-Effekte würfeln (A_EVEN, A_ODD, A_SUIT_BOOST, A_SMALL_BIG,
   A_MIDRANGE, A_SUIT_DUEL, A_CONDENSE) — eine zweite Anwendung gäbe andere Werte. Die Differenz trägt
   außerdem die Klemmung: eine Karte, die von 2 auf 1 fiel, hat −1 bekommen, nicht −2.

   BEWUSSTE UNGENAUIGKEIT: hing ein späterer Effekt davon ab, was ein früherer gesetzt hat, kommt beim
   Verkauf nicht exakt das Deck heraus, das ohne den Perk entstanden wäre. Der Effekt des verkauften
   Perks ist sauber weg, die Geschichte wird nicht neu geschrieben — der Perk wird zurückgenommen, nicht
   die Vergangenheit. */
export function deckDeltaOf(before, after) {
  if (!before || !after || before === after) return null;
  const was = new Map(before.map((c) => [c.id, c.value]));
  const diff = {};
  let any = false;
  for (const c of after) {
    const d = c.value - (was.get(c.id) ?? c.value);
    if (d) { diff[c.id] = d; any = true; }
  }
  return any ? diff : null;
}

// Differenzen eines Besitzers aufsummieren — Stufe 2 kommt zu Stufe 1 dazu, sie ersetzt sie nicht.
export function withDeckDelta(deckDeltas, ownerId, diff) {
  if (!diff) return deckDeltas || {};
  const prev = (deckDeltas || {})[ownerId] || {};
  const merged = { ...prev };
  for (const id of Object.keys(diff)) merged[id] = (merged[id] || 0) + diff[id];
  return { ...(deckDeltas || {}), [ownerId]: merged };
}

// Gespeicherte Differenz abziehen. Geklemmt wie beim Auftragen (families.js): kein Kartenwert unter 0.
export function undoDeckDelta(deck, diff) {
  if (!deck || !diff) return deck;
  return deck.map((c) => (diff[c.id] ? { ...c, value: Math.max(0, c.value - diff[c.id]) } : c));
}

/* ---- Was ist verkäuflich, und was steht im Weg -----------------------------------------------------
   Zwei Perks können blockiert sein, und beide aus demselben Grund: sie haben eine GRENZE gehoben, und
   unter der alten Grenze steht jetzt mehr, als hineinpasst. Ein Verkauf müsste dann etwas wegnehmen,
   das der Spieler nicht zum Verkauf gestellt hat. Blockieren ist die ehrlichere Antwort. */
export const BLOCK_COVER = "cover";   // Bauhütte: mehr Zellen belegt als ohne sie erlaubt
export const BLOCK_SLOTS = "slots";   // Meisterhand: mehr Skills gehalten als ohne ihren Slot erlaubt

function blockReason(state, perkId) {
  const def = PERK_DEFS[perkId] || {};
  if (def.bauhuette) {
    const a = state.architect;
    if (!a) return null;                                   // ohne Architekt hat der Deckel keine Wirkung
    const back = (a.maxCover ?? ARCH_MAX_COVER) - C.BAUHUETTE_COVER;
    return archOccupied(a.buildings || []).size > back ? BLOCK_COVER : null;
  }
  if (def.skillSlotBonus) {
    // Der über Meisterhand gewählte Skill geht mit (Owner) — er zählt hier also schon nicht mehr mit.
    // Blieb der Slot leer und wurde später regulär gefüllt, passt der Bestand nicht mehr unter die
    // alte Grenze: dann ist der Verkauf gesperrt, statt einen fremden Skill mitzureißen.
    const meis = state.meisterSkill;
    const rest = (state.skills || []).filter((id) => id !== meis && !isLegendarySkill(id)).length;
    return rest > (state.skillSlots || C.SKILL_SLOTS) - def.skillSlotBonus ? BLOCK_SLOTS : null;
  }
  return null;
}

/* Die Liste für den Verkaufs-Bildschirm: gehaltene Familien (Rang ≥ 1) und gehaltene flache Perks.
   Blockierte stehen MIT Grund drin, nicht weggelassen — ein Perk, der ohne Erklärung fehlt, liest sich
   wie ein Fehler. */
export function sellables(state = {}) {
  const out = [];
  for (const id of Object.keys(state.familyTiers || {})) {
    const tier = state.familyTiers[id] || 0;
    if (tier >= 1 && FAMILY_DEFS[id]) out.push({ kind: "family", id, tier, price: sellPrice(tier), blocked: null });
  }
  for (const id of state.perks || []) {
    if (!PERK_DEFS[id]) continue;
    out.push({ kind: "perk", id, tier: null, price: perkSellPrice(id), blocked: blockReason(state, id) });
  }
  return out;
}

/* ---- Der Verkauf ----------------------------------------------------------------------------------
   Gibt das Patch zurück oder null (nicht gehalten / blockiert). `dropSkill` reicht der Reducer herein:
   einen Skill abzugeben heißt Archetypen deaktivieren, Leisten leeren, Gletscher auftauen — das ist
   Reducer-Wissen und hat in einem Preis-Modul nichts verloren. */
export function sellPatch(state = {}, kind, id, dropSkill = null) {
  const entry = sellables(state).find((e) => e.kind === kind && e.id === id);
  if (!entry || entry.blocked) return null;

  // Über `coinGrant` wie jede andere Gutschrift — der Erlös blitzt damit an derselben Stelle auf wie
  // eine Verzichts-Zahlung, statt den Kontostand still hochzusetzen.
  const patch = { ...coinGrant(state, entry.price, "sell") };
  const deltas = { ...(state.deckDeltas || {}) };
  // Deck-Differenzen zurücknehmen — für Familien wie für flache Perks derselbe Weg (Umverteilung und
  // Opfergang speichern unter ihrer Perk-id, die A-Familien und C_SACRIFICE unter ihrer Familien-id).
  if (deltas[id]) { patch.deck = undoDeckDelta(state.deck, deltas[id]); delete deltas[id]; }
  patch.deckDeltas = deltas;
  // Rollen-Ziele fallen mit ihrem Perk: Farballianz, Formationskern, Farbfokus, die C-Familien. Sonst
  // bliebe die Farbe verbündet und der Kern gesetzt, obwohl die Regel dahinter verkauft ist.
  if ((state.roles || {})[id]) { const roles = { ...state.roles }; delete roles[id]; patch.roles = roles; }

  if (kind === "family") {
    const familyTiers = { ...(state.familyTiers || {}) };
    delete familyTiers[id];                       // 0 wäre „gehalten mit Rang 0" — der Eintrag muss weg
    patch.familyTiers = familyTiers;
    return patch;
  }

  patch.perks = (state.perks || []).filter((p) => p !== id);
  const def = PERK_DEFS[id] || {};
  // Meisterhand: der Slot geht zurück UND der über ihn gewählte Skill mit ihm (Owner). Eine dort
  // investierte Aufwertung ist mit weg — sie hing an dem Skill, nicht am Slot.
  if (def.skillSlotBonus) {
    patch.skillSlots = Math.max(1, (state.skillSlots || C.SKILL_SLOTS) - def.skillSlotBonus);
    if (state.meisterSkill && dropSkill) Object.assign(patch, dropSkill(state, state.meisterSkill));
    patch.meisterSkill = null;
  }
  // Bauhütte: der Deckel geht zurück. Dass darunter noch Platz ist, hat `blockReason` bereits geprüft.
  if (def.bauhuette && state.architect) {
    const a = state.architect;
    patch.architect = { ...a, maxCover: Math.max(ARCH_MAX_COVER, (a.maxCover ?? ARCH_MAX_COVER) - C.BAUHUETTE_COVER) };
  }
  /* Zinseszins: das aufgebaute KAPITAL behält man — es fließt als Score aus (Owner). Es weiter zu
     verzinsen wäre falsch, der Perk ist weg; es einzuziehen wäre es auch, der Spieler hat es erspielt.
     Nebenwirkung, die beim Spielen auffallen wird: der Perk zahlt je Durchlauf nur einen Bruchteil aus
     und nur über einer Siegeshürde, die der gemessene Median verfehlt. Eine Sofortauszahlung von 100 %
     ist damit fast immer besser als Weiterhalten — Zinseszins wird vom Investment zum „aufladen und
     einlösen". Einmalig, also nicht ausbeutbar, aber die Spielweise ändert sich. */
  if (def.zinseszins && (state.zinsCapital || 0) > 0) {
    patch.score = (state.score || 0) + state.zinsCapital;
    patch.zinsCapital = 0;
  }
  return patch;
}
