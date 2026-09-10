import * as C from "../constants.js";
import { SKILL_DEFS, activeLightningCount, isLegendarySkill, boostedTier } from "../skills.js";

/* ============================================================
   BLITZ — Fraktionsmodul (exp skill rework, docs/skill-rework.md §3). Reine Logik: kein React, kein Math.random.

   Passiv (§3.2, §7.30): aktiver Blitz gibt +LIGHTNING_CRIT_SOCKET Crit-Chance, jeder gehaltene Blitz-Skill zusätzlich
   +LIGHTNING_CRIT_PER_SKILL. Jeder Crit gibt +1 Ladung;
   ist die Leiste voll (LIGHTNING_MAX_CHARGE, Reststrom Episch früher), ionisiert sie die NÄCHSTE Karte in der
   Reihenfolge (+1 Stapel) und leert sich auf den Reststrom-Boden. Ein Stapel gibt bei Sieg mit der Karte
   ION_SCORE_PER_STACK Score in die Basis. Stapel sind ohne Deckel und wachsen nie von selbst (Lesart A).

   Die 14 Skills lesen ihre Kennwerte aus den Stufentabellen in SKILL_DEFS (`tiers[0..3]`, Normal … Episch) über
   `lightParam`; Hochspannung (Legendär) hebt jede gehaltene Stufe um eins, Episch bleibt Episch. Legendäre haben keine
   Stufe. Alle Funktionen sind immutabel: sie geben neue Objekte zurück und fassen ihre Eingaben nicht an.
   §7.18 (Blitz-Runde): Statische Aufladung und Dauerstrom sind in Blitzableiter aufgegangen, Ionenfeld (SK_LIGHTNING_02)
   und Vorentladung (SK_LIGHTNING_12) sind neu, Kettenblitz vertieft statt verbreitert, Blitzfänger hat keine Stapel-
   Schwelle mehr. §7.19: Überschlag ist gestrichen. §7.51: Blitz hat KEINEN eigenen Faktor im
   Score-Produkt — der Crit-Multiplikator IST seine Multiplikator-Achse; das Spannungsfeld (SK_LIGHTNING_13) zahlt
   seitdem auf die Crit-CHANCE; §7.56 je FORMATION der Position, ohne Ionisierungs-Bedingung. §7.24:
   Überspannung macht den Überschuss eines Crits über dem Deckel zu Ladung (vorher Dauerwert je Leiste).
   ============================================================ */

// Skill-IDs der Fraktion — lesbare Namen für Modul und Engine. (SK_LIGHTNING_08 Statische Aufladung und SK_LIGHTNING_16
// Dauerstrom: gestrichen, §7.18.)
export const L = Object.freeze({
  ABLEITER: "SK_LIGHTNING_01", IONENFELD: "SK_LIGHTNING_02", KETTENBLITZ: "SK_LIGHTNING_03", LICHTBOGEN: "SK_LIGHTNING_04", // 04: Lichtbogen ersetzt Überspannung (§7.28)
  RESTSTROM: "SK_LIGHTNING_05", GEWITTERFRONT: "SK_LIGHTNING_06", LADUNGSSERIE: "SK_LIGHTNING_07", KURZSCHLUSS: "SK_LIGHTNING_09",
  ENTLADUNG: "SK_LIGHTNING_10", BLITZFAENGER: "SK_LIGHTNING_11", VORENTLADUNG: "SK_LIGHTNING_12", SPANNUNGSFELD: "SK_LIGHTNING_13", // 13: §7.51 auf der Crit-Chance, §7.56 je Formation der Position (Breite)
  BLITZSCHLAG: "SK_LIGHTNING_15", STREUUNG: "SK_LIGHTNING_17", // 17: §7.59 Streuung ersetzt Serienschutz (Breite); SK_LIGHTNING_14 Überschlag: gestrichen (§7.19)
  DOPPELENTLADUNG: "SK_LIGHTNING_L02", HOCHSPANNUNG: "SK_LIGHTNING_L03", RESONANZ: "SK_LIGHTNING_L04", // L04: Resonanz ersetzt Durchschlag (§7.25); L01 Donnergott gestrichen (§6.11, Owner: drei je Fraktion, die stärksten)
});

/* Frischer Blitz-Substate — inaktiv; der erste Blitz-Skill aktiviert ihn (Reducer). Zähler sind Lauf-kumulativ:
   bars = volle Leisten (Kettenblitz Normal zählt jede 2.; Anzeige), critCount = Crits (Blitzableiter Normal jeder 2.,
   Blitzschlag jeder N.). Rampen ohne Deckel: stormCritBonus (Gewitterfront), entladungMult (Entladung).
   fieldLeft = Stiche, die das Ionenfeld noch trägt.
   (§7.59: `serienschutzCount`/`serienschutzRound` sind mit dem Serienschutz gegangen — Blitz hat damit keinen Skill
   mehr, der auf Niederlagen reagiert.) */
export function initLightning() {
  return { active: false, charge: 0, maxCharge: C.LIGHTNING_MAX_CHARGE, bars: 0, critCount: 0,
    stormCritBonus: 0, entladungMult: 0, entladungScore: 0, fieldLeft: 0, stackBank: 0 };
}

const held = (skills, id) => (skills || []).includes(id);
export const hasDoppelentladung = (skills) => held(skills, L.DOPPELENTLADUNG);
export const hasHochspannung    = (skills) => held(skills, L.HOCHSPANNUNG);
export const hasResonanz        = (skills) => held(skills, L.RESONANZ);

/* Resonanz (L, §7.25): die Karten einer Formation teilen ihre Stapel — die gespielte Karte kämpft mit ihren eigenen
   Stapeln plus RESONANZ_SHARE × den Stapeln aller anderen Mitglieder ihrer Formationen (Vereinigung über alle Läufe an
   der Position; Meta-Faktoren wie Anker oder Nachhall haben keine Mitglieder). `cardAt(slot)` liefert die Karte auf
   einer Position der Reihenfolge, `posForm` den Formations-Eintrag der gespielten Position. Ohne Formation die eigenen. */
export function resonantStacks(card, posForm, slot, cardAt) {
  const own = card?.ionStacks || 0;
  const seen = new Set([slot]);
  let partner = 0;
  for (const f of posForm?.formations || []) for (const p of f.members || []) {
    if (seen.has(p)) continue;
    seen.add(p);
    partner += cardAt(p)?.ionStacks || 0;
  }
  return own + Math.floor(partner * C.RESONANZ_SHARE + 1e-9);
}

// Leistenlänge des Builds: Reststrom Episch (§7.22) macht sie schon bei `bar` (9) voll.
export function maxChargeFor(skills, skillTiers = {}) {
  return lightParam(skills, skillTiers, L.RESTSTROM, "bar") || C.LIGHTNING_MAX_CHARGE;
}

// Wirksame Stufe eines gehaltenen Blitz-Skills: gewürfelte Stufe (skillTiers, Normal ohne Eintrag) plus Hochspannung,
// bei Episch durch die Leiter selbst gedeckelt. null für Legendäre und nicht gehaltene Skills.
export function effectiveTier(skills, skillTiers, id) {
  if (!held(skills, id) || isLegendarySkill(id)) return null;
  const base = Number.isInteger(skillTiers?.[id]) ? skillTiers[id] : 0;
  return boostedTier(skills, base); // §7.39: der Hebel liegt jetzt in skills.js und gilt fuer alle Fraktionen
}

// Kennwert eines gehaltenen Skills auf seiner wirksamen Stufe; undefined, wenn der Skill nicht gehalten wird oder die
// Zeile den Schlüssel nicht kennt (die Aufrufer prüfen mit `== null`).
export function lightParam(skills, skillTiers, id, key) {
  const tier = effectiveTier(skills, skillTiers, id);
  if (tier == null) return undefined;
  const row = SKILL_DEFS[id]?.tiers?.[tier];
  return row ? row[key] : undefined;
}

/* Crit-Chance-Beitrag des Blitz-Archetyps (ungeklemmt): Passiv (Sockel, sobald aktiv, plus Satz je Skill — §7.30,
   der Sockel ist die frühe Hälfte, der Satz die späte) + Gewitterfront-Rampe
   + Lichtbogen (§7.28: je wirksamem Stapel der gespielten Karte — die
   Richtung „Ionisierung → Crit-Chance", die es vorher nicht gab; `card` ist die Lesesicht der Karte, also mit
   Resonanz-Summe, und `effectiveStacks` heißt: Kurzschluss verdoppelt hier genauso wie beim Stapel-Score).
   0, solange der Archetyp inaktiv ist. (
   §7.30: die Ladungsserie zahlt jetzt in Ladung, nicht mehr in Chance — damit liest gerade niemand die Serie.
   Der Platz bleibt als `_streak` stehen, weil die Engine sie ohnehin berechnet und weiterreicht: eine künftige
   Serie-zu-Chance-Quelle gehört hierher, und die 15 Aufrufstellen zweimal umzustellen ist der teurere Weg.) */
export function lightningCritChance(lightning, skills, skillTiers, _streak = 0, card = null, forms = 0) {
  if (!lightning || !lightning.active) return 0;
  let c = C.LIGHTNING_CRIT_SOCKET + activeLightningCount(skills) * C.LIGHTNING_CRIT_PER_SKILL + (lightning.stormCritBonus || 0);
  const perStack = lightParam(skills, skillTiers, L.LICHTBOGEN, "critPerStack");
  if (perStack && card) c += perStack * effectiveStacks(card, skills, skillTiers);
  /* Spannungsfeld (§7.56, Owner): je FORMATION dieser Position, ohne Ionisierungs-Bedingung. Es steht damit
     gegen Lichtbogen eine Zeile höher, der die Stapeltiefe EINER Karte belohnt: Breite gegen Tiefe. `forms` ist 0,
     wo die Formationen nicht bekannt sind (Statusleiste), genau wie `card` bei Lichtbogen — die Anzeige zeigt den
     Bau, nicht den Stich. Die 100-%-Klemme deckelt den Beitrag von selbst.
     §7.58 (Owner: „nur mit vollen Formationen zahlen"): `forms` ist jetzt `activeFormationCount(posForm)` — nur
     Formationen mit Faktor > 1. Eine Mitgliedschaft ohne Faktor (Farbblock-Ordinal 1) zahlte vorher mit, stand
     aber nirgends auf dem Schirm. */
  const perForm = lightParam(skills, skillTiers, L.SPANNUNGSFELD, "critPerForm");
  if (perForm && forms) c += perForm * forms;
  return c;
}

/* Crit-Multiplikator-Beitrag des Blitz-Archetyps (additiv auf die Basis): Gewitterfront-Rampe (Episch-Anhang, sie
   speist entladungMult) + Vorentladung (§7.18: ab der Serie der Stufe je Serienpunkt; `streak` = Serie NACH diesem
   Sieg, wie bei der Crit-Chance). Der Überschuss über 100 % zahlt nur noch über die
   Systemregel (overcritMult) — Überschlag ist gestrichen (§7.19). (Der Stapel-Anteil zahlt über die Stapel der
   Siegkarte (ionCritMultFor), nicht mehr flach. 0, solange inaktiv. */
export function lightningCritMult(lightning, skills, skillTiers, streak = 0) {
  if (!lightning || !lightning.active) return 0;
  let m = lightning.entladungMult || 0;
  const vMin = lightParam(skills, skillTiers, L.VORENTLADUNG, "minStreak");
  if (vMin != null && streak >= vMin) m += Math.max(0, streak) * (lightParam(skills, skillTiers, L.VORENTLADUNG, "multPerStreak") || 0);
  return m;
}

/* Entladung (§7.42): die dauerhafte Rampe zahlt BASIS-SCORE je Sieg, nicht mehr Crit-Multiplikator. Episch zählt sie
   bei einem Crit doppelt — dasselbe „der Crit ist besonders" wie im alten Episch-Extra, nur auf der neuen Achse.
   0 ohne den Skill; die Rampe selbst wächst in fillBar. */
export function entladungScoreFor(lightning, skills, skillTiers, isCrit = false) {
  if (!lightning || !lightning.active) return 0;
  const ramp = lightning.entladungScore || 0;
  if (!ramp) return 0;
  return ramp * (isCrit && lightParam(skills, skillTiers, L.ENTLADUNG, "critDouble") ? 2 : 1);
}

// Systemregel (alle Fraktionen, §1): Crit-Chance über 100 % gibt einen sehr kleinen Crit-Mult-Bonus je Prozentpunkt.
export const overcritMult = (rawCrit) => Math.max(0, (rawCrit || 0) - 1) * 100 * C.OVERCRIT_MULT_PER_PP;

// Blitzfänger: Kampfwert-Bonus einer ionisierten Karte (§7.18: ab einem Stapel, der Wert steigt mit der Stufe; §7.22
// Episch-Extra: dazu +perStack je Stapel). Zustand.
export function blitzfaengerValue(skills, skillTiers, card) {
  const min = lightParam(skills, skillTiers, L.BLITZFAENGER, "minStacks");
  const st = card?.ionStacks || 0;
  if (min == null || st < min) return 0;
  return (lightParam(skills, skillTiers, L.BLITZFAENGER, "value") || 0) + (lightParam(skills, skillTiers, L.BLITZFAENGER, "perStack") || 0) * st;
}

// Ionenfeld (§7.18): solange das Feld trägt (fieldLeft > 0, gesetzt von jeder vollen Leiste), kämpfen ALLE Karten mit
// +Wert der Stufe. Zustand vor dem Stich; fieldTick zählt je Stich herunter.
export function ionenfeldValue(lightning, skills, skillTiers) {
  if (!lightning || !lightning.active || !((lightning.fieldLeft || 0) > 0)) return 0;
  return lightParam(skills, skillTiers, L.IONENFELD, "value") || 0;
}
export const fieldTick = (lightning) => ((lightning && (lightning.fieldLeft || 0) > 0) ? { ...lightning, fieldLeft: lightning.fieldLeft - 1 } : lightning);

// Wirksame Stapel der gespielten Karte: Kurzschluss zählt sie ab der Schwelle der Stufe doppelt — dieselbe Zählung für
// den Stapel-Score und den Crit-Multiplikator.
export function effectiveStacks(card, skills = [], skillTiers = {}) {
  const st = card?.ionStacks || 0;
  if (!st) return 0;
  const min = lightParam(skills, skillTiers, L.KURZSCHLUSS, "minStacks");
  const factor = (min != null && st >= min) ? (lightParam(skills, skillTiers, L.KURZSCHLUSS, "factor") || 1) : 1;
  return st * factor;
}

// Stapel-Score der gespielten Karte (in die Basis): wirksame Stapel × ION_SCORE_PER_STACK.
export function ionScoreFor(card, skills = [], skillTiers = {}) {
  return effectiveStacks(card, skills, skillTiers) * C.ION_SCORE_PER_STACK;
}

// Stapel auf dem Crit-Multiplikator der Siegkarte (§7.12: die Ionisierung trägt über den Motor, der ohnehin trägt):
// wirksame Stapel × ION_CRIT_MULT_PER_STACK, additiv auf den Crit-Multiplikator dieses Stichs.
export function ionCritMultFor(card, skills = [], skillTiers = {}) {
  const per = C.ION_CRIT_MULT_PER_STACK;
  return effectiveStacks(card, skills, skillTiers) * per;
}

/* Ladungsgewinn eines gewonnenen Stichs und die fortgeschriebenen Zähler. `streak` = Serie NACH diesem Sieg.
   Crit: +1 Passiv, Blitzableiter (jeder N. Crit +1). Sieg ohne Crit: Blitzableiter Episch (+1). Immer: Ladungsserie
   Episch (ab Serie 8 +1). Deterministisch und ohne Nebenwirkung — die Engine ruft es für die Vorschau (füllt ein Crit
   die Leiste? critFillsBar) und dann für den echten Stich. (§7.28: Überspannung, die den Überschuss über dem Deckel
   und über 100 % Crit-Chance in Ladung wandelte, ist gestrichen — der Überschuss der Chance zahlt jetzt allein über
   die Systemregel auf den Multiplikator, ihr Platz trägt den Lichtbogen.) */
export function chargeGainOnWin(lightning, skills, skillTiers, { isCrit, streak = 0 } = {}) {
  let gain = 0;
  const next = { ...lightning };
  if (isCrit) {
    next.critCount = (lightning.critCount || 0) + 1;
    gain += 1;
    const every = lightParam(skills, skillTiers, L.ABLEITER, "critEvery");
    if (every && next.critCount % every === 0) gain += 1;
  } else {
    gain += lightParam(skills, skillTiers, L.ABLEITER, "noCritCharge") || 0;
  }
  const from = lightParam(skills, skillTiers, L.LADUNGSSERIE, "chargeFromStreak");
  if (from != null && streak >= from) gain += 1;
  return { gain, next };
}

// Vorschau für Entladung Episch: füllt ein Crit auf dieser Karte die Leiste in diesem Stich?
export function critFillsBar(lightning, skills, skillTiers, { streak = 0 } = {}) {
  if (!lightning || !lightning.active) return false;
  const { gain } = chargeGainOnWin(lightning, skills, skillTiers, { isCrit: true, streak });
  return (lightning.charge || 0) + gain >= maxChargeFor(skills, skillTiers);
}

// Blitzschlag: jeder N. Crit ionisiert die Siegkarte (+Stapel der Stufe; Doppelentladung verdoppelt). Liest den Zähler
// NACH dem Crit.
export function blitzschlagStacks(lightning, skills, skillTiers) {
  const every = lightParam(skills, skillTiers, L.BLITZSCHLAG, "critEvery");
  if (!every || (lightning.critCount || 0) % every !== 0) return 0;
  return (lightParam(skills, skillTiers, L.BLITZSCHLAG, "stacks") || 1) * (hasDoppelentladung(skills) ? C.DOPPELENTLADUNG_STACKS : 1);
}

/* Spannungsfeld — die Mitglieder der Formationen an einer Position, jede Karte GENAU EINMAL und die gespielte
   eingeschlossen. Ohne echten Partner leer: Meta-Faktoren (Anker, Nachhall) haben keine Mitglieder. Ohne die
   Vereinigung zahlt eine Karte, die in drei Formationen hängt, dreifach für sich selbst — Resonanz zählt aus
   demselben Grund genauso. */
export function formationStacks(card, posForm, slot, cardAt) {
  const seen = new Set([slot]);
  const out = [{ slot, stacks: card?.ionStacks || 0 }];
  for (const f of posForm?.formations || []) for (const p of f.members || []) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push({ slot: p, stacks: cardAt(p)?.ionStacks || 0 });
  }
  return out.length > 1 ? out : [];
}

/* (§7.58: der Kennwert des Spannungsfelds ist `activeFormationCount` aus formations.js — die Formationen, die an
   dieser Position wirklich einen Faktor zahlen. Die faktionseigene Zählung `positionFormations` (§7.56) ist damit
   raus: sie war eine dritte Lesart von „Formation" neben der, die der Stich anzeigt (Battlefield filtert
   factor > 1) und der, die Brennpunkt und Feuerlinie lesen. Der Aufrufer sitzt in engine.js.) */

/* Episch-Anhang: der Formations-Sieg lädt die Karte mit den wenigsten Stapeln seiner Formation nach (Gleichstand:
   die vordere Position). Läuft NICHT durch Doppelentladung — das ist keine Ionisierung durch die Leiste, sondern
   genau der eine Stapel. Gibt { slot, stacks } in der ZIEHREIHENFOLGE oder null. */
export function feldFeed(lightning, skills, skillTiers, card, posForm, slot, cardAt) {
  if (!lightning || !lightning.active) return null;
  const n = lightParam(skills, skillTiers, L.SPANNUNGSFELD, "feedLowest") || 0;
  if (!n) return null;
  const members = formationStacks(card, posForm, slot, cardAt);
  if (!members.length) return null;
  let best = members[0];
  for (const m of members) if (m.stacks < best.stacks || (m.stacks === best.stacks && m.slot < best.slot)) best = m;
  return { slot: best.slot, stacks: n };
}


/* Niederlage: Kurzschluss Episch (§7.22) — verliert eine Karte ab der Schwelle, wird ihr doppelter Stapel-Score
   vorgemerkt (stackBank) und zahlt mit dem nächsten Sieg in die Basis. Das ist das Einzige, was Blitz auf einer
   Niederlage noch tut: §7.59 hat den Serienschutz gestrichen (Owner-Regel §7.31, keine Skills, die auf Niederlagen
   reagieren), auf seinem Platz steht die Streuung.
   `streakHeld` bleibt im Rückgabewert stehen und ist jetzt immer false — der Aufrufer in engine.js verodert es mit
   dem Serienanker, und die Stelle soll offen bleiben, falls wieder ein Halter dazukommt. */
export function lightningOnLoss(lightning, skills, skillTiers, { card = null } = {}) {
  if (!lightning || !lightning.active) return { lightning, streakHeld: false };
  const next = { ...lightning };
  const ksMin = lightParam(skills, skillTiers, L.KURZSCHLUSS, "minStacks");
  if (lightParam(skills, skillTiers, L.KURZSCHLUSS, "onLoss") && ksMin != null && (card?.ionStacks || 0) >= ksMin)
    next.stackBank = (lightning.stackBank || 0) + ionScoreFor(card, skills, skillTiers);
  return { lightning: next, streakHeld: false };
}

// Karte mit den meisten Stapeln (Gleichstand: der kleinste Deck-Index); −1 ohne ionisierte Karte. `exclude` = ein
// Index, der nicht zählt (Kettenblitz Episch: die zweittiefste Karte).
function deepestIndex(deck, exclude = -1) {
  let best = -1, bestSt = 0;
  deck.forEach((c, i) => { if (i === exclude) return; const st = c.ionStacks || 0; if (st > bestSt) { bestSt = st; best = i; } });
  return best;
}

/* Streuung (§7.59): die `n` DÜNNSTEN Karten des Decks, aufsteigend nach Stapeln, bei Gleichstand der kleinere
   Deck-Index (Determinismus §9). Das Gegenstück zu `deepestIndex` — dort sucht Kettenblitz die Tiefe, hier sucht die
   Streuung die Breite. Ein leeres Deck gibt eine leere Liste; sonst gibt es immer `n` Treffer (auch Karten mit 0
   Stapeln, genau die sind gemeint). */
function thinnestIndices(deck, n) {
  if (n <= 0 || !deck?.length) return [];
  return deck.map((c, i) => [c.ionStacks || 0, i])
    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
    .slice(0, n).map(([, i]) => i);
}

/* Volle Leiste (höchstens EINE je Stich): +1 Leiste, die nächste Karte in der Reihenfolge (Wrap ans Deck-Ende → Anfang)
   wird ionisiert; Kettenblitz (§7.18, Tiefe) gibt danach der Karte mit den meisten Stapeln die Stapel seiner Stufe dazu;
   Streuung (§7.59, Breite) ionisiert die dünnsten Karten der Stufe — beide lesen den Deckstand NACH dem Passiv;
   Ionenfeld lädt das Feld für die Stiche seiner Stufe; Gewitterfront/Entladung rampen; die Ladung fällt auf den
   Reststrom-Boden plus Blitzableiter-Rückgabe. Ladung, die danach über der Leiste liegt (Boden + Rückgabe ≥ Leiste,
   etwa Reststrom Episch × Blitzableiter), zündet beim nächsten Stich — nie in einer Endlosschleife.
   Gibt { lightning, deck, filled, stacks, targets } zurück; ohne volle Leiste unverändert. */
export function fillBar(lightning, skills, skillTiers, deck, playerOrder, actualPos) {
  const max = maxChargeFor(skills, skillTiers);
  if (!lightning || !lightning.active || (lightning.charge || 0) < max) return { lightning, deck, filled: false, stacks: 0, targets: [] };
  const bars = (lightning.bars || 0) + 1;
  const n = (playerOrder || []).length;
  const per = hasDoppelentladung(skills) ? C.DOPPELENTLADUNG_STACKS : 1;
  const targets = [];
  let stacks = 0;
  let newDeck = deck;
  if (n > 0) {
    const di = playerOrder[(actualPos + 1) % n];
    // §7.24 (Owner): der Dauerwert je Leiste ist Blitz-Passiv — die ionisierte Karte erhält dauerhaft +ION_VALUE_PER_BAR
    // (gebacken wie die Schmiede; bis §7.23 war das Überspannung, die jetzt den Überschuss über dem Deckel zu Ladung macht).
    newDeck = newDeck.map((c, i) => (i === di ? { ...c, ionStacks: (c.ionStacks || 0) + per, value: c.value + C.ION_VALUE_PER_BAR } : c));
    stacks += per; targets.push(di);
  }
  const kbEvery = lightParam(skills, skillTiers, L.KETTENBLITZ, "barEvery");
  if (kbEvery && bars % kbEvery === 0) {
    const extra = (lightParam(skills, skillTiers, L.KETTENBLITZ, "extra") || 0) * per;
    const deep = deepestIndex(newDeck);
    if (extra > 0 && deep >= 0) {
      newDeck = newDeck.map((c, i) => (i === deep ? { ...c, ionStacks: (c.ionStacks || 0) + extra } : c));
      stacks += extra; if (!targets.includes(deep)) targets.push(deep);
    }
    // §7.22 Episch-Extra: auch die Karte mit den zweitmeisten Stapeln (ohne die tiefste) bekommt Stapel.
    const second = (lightParam(skills, skillTiers, L.KETTENBLITZ, "second") || 0) * per;
    const deep2 = second > 0 ? deepestIndex(newDeck, deep) : -1;
    if (deep2 >= 0) {
      newDeck = newDeck.map((c, i) => (i === deep2 ? { ...c, ionStacks: (c.ionStacks || 0) + second } : c));
      stacks += second; if (!targets.includes(deep2)) targets.push(deep2);
    }
  }
  /* Streuung (§7.59, Owner): dieselbe Leiste ionisiert zusätzlich die `cards` dünnsten Karten. IONISIERT heißt hier
     genau, was das Passiv darunter versteht — Stapel UND dauerhaft +ION_VALUE_PER_BAR Kartenwert; ohne den Wert
     landeten die Stapel auf Karten, die den Stich nie gewinnen, und das ist die Sättigung, an der Blitzfänger
     gemessen 0 % steht (§7.54 D). Gegenstück zu Kettenblitz eine Ebene höher: der sucht die Tiefe, diese die Breite.
     Episch `freshStacks`: eine Karte ohne Stapel bekommt so viele statt einem — der erste Schlag zündet stärker. */
  const spread = lightParam(skills, skillTiers, L.STREUUNG, "cards") || 0;
  if (spread > 0) {
    const fresh = lightParam(skills, skillTiers, L.STREUUNG, "freshStacks") || 1;
    const thin = new Map(thinnestIndices(newDeck, spread).map((i) => [i, ((newDeck[i].ionStacks || 0) === 0 ? fresh : 1) * per]));
    newDeck = newDeck.map((c, i) => (thin.has(i) ? { ...c, ionStacks: (c.ionStacks || 0) + thin.get(i), value: c.value + C.ION_VALUE_PER_BAR } : c));
    for (const [i, add] of thin) { stacks += add; if (!targets.includes(i)) targets.push(i); }
  }
  const storm = lightParam(skills, skillTiers, L.GEWITTERFRONT, "critPerBar") || 0;
  // §7.22 Gewitterfront Episch-Extra: die Rampe zahlt zusätzlich auf den Crit-Multiplikator. §7.42: Entladung ist von
  // dieser Achse weg, Gewitterfront steht dort jetzt allein — ihr Anhang ist offen (Owner-Entscheid ausstehend).
  const ent = lightParam(skills, skillTiers, L.GEWITTERFRONT, "multPerBar") || 0;
  const entScore = lightParam(skills, skillTiers, L.ENTLADUNG, "scorePerBar") || 0;
  const floor = lightParam(skills, skillTiers, L.RESTSTROM, "floor") || 0;
  const back = lightParam(skills, skillTiers, L.ABLEITER, "back") || 0;
  const field = lightParam(skills, skillTiers, L.IONENFELD, "tricks") || 0;
  const next = { ...lightning, charge: floor + back, bars,
    stormCritBonus: (lightning.stormCritBonus || 0) + storm, entladungMult: (lightning.entladungMult || 0) + ent,
    entladungScore: (lightning.entladungScore || 0) + entScore,
    fieldLeft: field > 0 ? field : (lightning.fieldLeft || 0) };
  return { lightning: next, deck: newDeck, filled: true, stacks, targets };
}

// (§7.59: `lightningCycleEnd` ist raus — es füllte allein den Serienschutz-Deckel je Durchlauf wieder auf. Blitz hat
//  jetzt keinen Zustand mehr, der am Durchlauf-Ende zurückgesetzt werden müsste.)
