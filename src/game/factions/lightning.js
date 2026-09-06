import * as C from "../constants.js";
import { SKILL_DEFS, TIER_EPIC, activeLightningCount, isLegendarySkill } from "../skills.js";

/* ============================================================
   BLITZ — Fraktionsmodul (exp skill rework, docs/skill-rework.md §3). Reine Logik: kein React, kein Math.random.

   Passiv (§3.2): jeder gehaltene Blitz-Skill gibt +LIGHTNING_CRIT_PER_SKILL Crit-Chance. Jeder Crit gibt +1 Ladung;
   ist die Leiste voll (LIGHTNING_MAX_CHARGE, Donnergott DONNERGOTT_MAX_CHARGE), ionisiert sie die NÄCHSTE Karte in der
   Reihenfolge (+1 Stapel) und leert sich auf den Reststrom-Boden. Ein Stapel gibt bei Sieg mit der Karte
   ION_SCORE_PER_STACK Score in die Basis. Stapel sind ohne Deckel und wachsen nie von selbst (Lesart A).

   Die 14 Skills lesen ihre Kennwerte aus den Stufentabellen in SKILL_DEFS (`tiers[0..3]`, Normal … Episch) über
   `lightParam`; Hochspannung (Legendär) hebt jede gehaltene Stufe um eins, Episch bleibt Episch. Legendäre haben keine
   Stufe. Alle Funktionen sind immutabel: sie geben neue Objekte zurück und fassen ihre Eingaben nicht an.
   §7.18 (Blitz-Runde): Statische Aufladung und Dauerstrom sind in Blitzableiter aufgegangen, Ionenfeld (SK_LIGHTNING_02)
   und Vorentladung (SK_LIGHTNING_12) sind neu, Kettenblitz vertieft statt verbreitert, Blitzfänger hat keine Stapel-
   Schwelle mehr, der Spannungsstau geht in den Crit-Multiplikator. §7.19: Überschlag ist gestrichen (14 Skills). §7.24:
   Überspannung macht den Überschuss eines Crits über dem Deckel zu Ladung (vorher Dauerwert je Leiste).
   ============================================================ */

// Skill-IDs der Fraktion — lesbare Namen für Modul und Engine. (SK_LIGHTNING_08 Statische Aufladung und SK_LIGHTNING_16
// Dauerstrom: gestrichen, §7.18.)
export const L = Object.freeze({
  ABLEITER: "SK_LIGHTNING_01", IONENFELD: "SK_LIGHTNING_02", KETTENBLITZ: "SK_LIGHTNING_03", UEBERSPANNUNG: "SK_LIGHTNING_04",
  RESTSTROM: "SK_LIGHTNING_05", GEWITTERFRONT: "SK_LIGHTNING_06", LADUNGSSERIE: "SK_LIGHTNING_07", KURZSCHLUSS: "SK_LIGHTNING_09",
  ENTLADUNG: "SK_LIGHTNING_10", BLITZFAENGER: "SK_LIGHTNING_11", VORENTLADUNG: "SK_LIGHTNING_12", SPANNUNGSSTAU: "SK_LIGHTNING_13",
  BLITZSCHLAG: "SK_LIGHTNING_15", SERIENSCHUTZ: "SK_LIGHTNING_17", // SK_LIGHTNING_14 Überschlag: gestrichen (§7.19)
  DONNERGOTT: "SK_LIGHTNING_L01", DOPPELENTLADUNG: "SK_LIGHTNING_L02", HOCHSPANNUNG: "SK_LIGHTNING_L03", DURCHSCHLAG: "SK_LIGHTNING_L04",
});

/* Frischer Blitz-Substate — inaktiv; der erste Blitz-Skill aktiviert ihn (Reducer). Zähler sind Lauf-kumulativ:
   bars = volle Leisten (Kettenblitz Normal zählt jede 2.; Anzeige), critCount = Crits (Blitzableiter Normal jeder 2.,
   Blitzschlag jeder N.). Rampen ohne Deckel: stormCritBonus (Gewitterfront), entladungMult (Entladung). stauBonus =
   Spannungsstau (Crit-Multiplikator für den nächsten Crit). fieldLeft = Stiche, die das Ionenfeld noch trägt.
   serienschutzFree = Episch-Gratisschutz dieser Runde verbraucht. */
export function initLightning() {
  return { active: false, charge: 0, maxCharge: C.LIGHTNING_MAX_CHARGE, bars: 0, critCount: 0,
    stormCritBonus: 0, entladungMult: 0, stauBonus: 0, fieldLeft: 0, stackBank: 0, serienschutzCount: 0, serienschutzFree: false };
}

const held = (skills, id) => (skills || []).includes(id);
export const hasDonnergott      = (skills) => held(skills, L.DONNERGOTT);
export const hasDoppelentladung = (skills) => held(skills, L.DOPPELENTLADUNG);
export const hasHochspannung    = (skills) => held(skills, L.HOCHSPANNUNG);
export const hasDurchschlag     = (skills) => held(skills, L.DURCHSCHLAG);

// Leistenlänge des Builds: Donnergott (L) macht die Leiste bei 7 voll, Reststrom Episch (§7.22) bei `bar` (9).
export function maxChargeFor(skills, skillTiers = {}) {
  if (hasDonnergott(skills)) return C.DONNERGOTT_MAX_CHARGE;
  return lightParam(skills, skillTiers, L.RESTSTROM, "bar") || C.LIGHTNING_MAX_CHARGE;
}

// Wirksame Stufe eines gehaltenen Blitz-Skills: gewürfelte Stufe (skillTiers, Normal ohne Eintrag) plus Hochspannung,
// bei Episch durch die Leiter selbst gedeckelt. null für Legendäre und nicht gehaltene Skills.
export function effectiveTier(skills, skillTiers, id) {
  if (!held(skills, id) || isLegendarySkill(id)) return null;
  const base = Number.isInteger(skillTiers?.[id]) ? skillTiers[id] : 0;
  return Math.min(TIER_EPIC, base + (hasHochspannung(skills) ? 1 : 0));
}

// Kennwert eines gehaltenen Skills auf seiner wirksamen Stufe; undefined, wenn der Skill nicht gehalten wird oder die
// Zeile den Schlüssel nicht kennt (die Aufrufer prüfen mit `== null`).
export function lightParam(skills, skillTiers, id, key) {
  const tier = effectiveTier(skills, skillTiers, id);
  if (tier == null) return undefined;
  const row = SKILL_DEFS[id]?.tiers?.[tier];
  return row ? row[key] : undefined;
}

// Crit-Chance-Beitrag des Blitz-Archetyps (ungeklemmt): Passiv je Skill + Gewitterfront-Rampe + Ladungsserie (je
// Serienpunkt der Serie NACH diesem Sieg). 0, solange der Archetyp inaktiv ist. (Der Spannungsstau zahlt seit §7.18 auf
// den Crit-Multiplikator, nicht mehr auf die Chance.)
export function lightningCritChance(lightning, skills, skillTiers, streak = 0) {
  if (!lightning || !lightning.active) return 0;
  let c = activeLightningCount(skills) * C.LIGHTNING_CRIT_PER_SKILL + (lightning.stormCritBonus || 0);
  const perStreak = lightParam(skills, skillTiers, L.LADUNGSSERIE, "critPerStreak");
  if (perStreak) c += perStreak * Math.max(0, streak || 0);
  return c;
}

/* Crit-Multiplikator-Beitrag des Blitz-Archetyps (additiv auf die Basis): Entladung-Rampe + Spannungsstau (§7.18: der
   Stau aus Siegen ohne Crit, für den nächsten Crit) + Vorentladung (§7.18: ab der Serie der Stufe je Serienpunkt;
   `streak` = Serie NACH diesem Sieg, wie bei der Crit-Chance). Der Überschuss über 100 % zahlt nur noch über die
   Systemregel (overcritMult) — Überschlag ist gestrichen (§7.19). Donnergott zahlt seit §7.20 über die Stapel der
   Siegkarte (ionCritMultFor), nicht mehr flach. 0, solange inaktiv. */
export function lightningCritMult(lightning, skills, skillTiers, streak = 0) {
  if (!lightning || !lightning.active) return 0;
  let m = (lightning.entladungMult || 0) + (lightning.stauBonus || 0);
  const vMin = lightParam(skills, skillTiers, L.VORENTLADUNG, "minStreak");
  if (vMin != null && streak >= vMin) m += Math.max(0, streak) * (lightParam(skills, skillTiers, L.VORENTLADUNG, "multPerStreak") || 0);
  return m;
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
// wirksame Stapel × ION_CRIT_MULT_PER_STACK, additiv auf den Crit-Multiplikator dieses Stichs. Donnergott (L, §7.20):
// je Stapel DONNERGOTT_ION_CRIT_MULT_PER_STACK statt des Passiv-Satzes.
export function ionCritMultFor(card, skills = [], skillTiers = {}) {
  const per = hasDonnergott(skills) ? C.DONNERGOTT_ION_CRIT_MULT_PER_STACK : C.ION_CRIT_MULT_PER_STACK;
  return effectiveStacks(card, skills, skillTiers) * per;
}

/* Ladungsgewinn eines gewonnenen Stichs und die fortgeschriebenen Zähler. `streak` = Serie NACH diesem Sieg.
   Crit: +1 Passiv, Blitzableiter (jeder N. Crit +1), Überspannung (§7.24: der Überschuss des Crits über dem Deckel
   wird Ladung — je perOver× über CRIT_MULT_CAP +1; Episch dazu je chancePer Crit-Chance über 100 % +1; liest den
   UNGEDECKELTEN Multiplikator `critMultRaw` und die rohe Crit-Chance `rawCrit`). Sieg ohne Crit: Blitzableiter Episch
   (+1). Immer: Ladungsserie Episch (ab Serie 8 +1). Deterministisch und ohne Nebenwirkung — die Engine ruft es für die
   Vorschau (füllt ein Crit die Leiste? critFillsBar, dort ohne Überspannung: der Multiplikator steht erst danach fest)
   und dann für den echten Stich. */
export function chargeGainOnWin(lightning, skills, skillTiers, { isCrit, streak = 0, critMultRaw = 0, rawCrit = 0 } = {}) {
  let gain = 0;
  const next = { ...lightning };
  if (isCrit) {
    next.critCount = (lightning.critCount || 0) + 1;
    gain += 1;
    const every = lightParam(skills, skillTiers, L.ABLEITER, "critEvery");
    if (every && next.critCount % every === 0) gain += 1;
    const perOver = lightParam(skills, skillTiers, L.UEBERSPANNUNG, "perOver");
    if (perOver) gain += Math.floor(Math.max(0, (critMultRaw || 0) - C.CRIT_MULT_CAP) / perOver + 1e-9);
    const chancePer = lightParam(skills, skillTiers, L.UEBERSPANNUNG, "chancePer");
    if (chancePer) gain += Math.floor(Math.max(0, (rawCrit || 0) - 1) / chancePer + 1e-9);
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

// Spannungsstau nach einem Sieg: ohne Crit +Schritt (Crit-Multiplikator, §7.18), mit Crit geleert (Episch: halbiert).
// Ohne den Skill unberührt — wird er ersetzt, leert der Reducer den Stau (PICK_SKILL).
export function stauAfterWin(lightning, skills, skillTiers, isCrit) {
  const step = lightParam(skills, skillTiers, L.SPANNUNGSSTAU, "step");
  if (step == null) return lightning;
  const cur = lightning.stauBonus || 0;
  const keep = lightParam(skills, skillTiers, L.SPANNUNGSSTAU, "critKeep") || 0;
  return { ...lightning, stauBonus: isCrit ? cur * keep : cur + step };
}

/* Niederlage: Serienschutz (Ladung ab dem Anteil der Stufe hält die Serie und wird verbraucht; Episch einmal je Runde
   gratis). Kurzschluss Episch (§7.22): verliert eine Karte ab der Schwelle, wird ihr doppelter Stapel-Score vorgemerkt
   (stackBank) und zahlt mit dem nächsten Sieg in die Basis. Gibt den neuen Substate und ob die Serie gehalten wurde.
   `alreadyHeld` = ein anderer Schutz (Serienanker, Eispanzer) hält die Serie schon — dann wird keine Ladung ausgegeben. */
export function lightningOnLoss(lightning, skills, skillTiers, { alreadyHeld = false, card = null } = {}) {
  if (!lightning || !lightning.active) return { lightning, streakHeld: false };
  let next = { ...lightning };
  let streakHeld = false;
  const frac = lightParam(skills, skillTiers, L.SERIENSCHUTZ, "frac");
  if (frac != null && !alreadyHeld) {
    const free = (lightParam(skills, skillTiers, L.SERIENSCHUTZ, "freePerRound") || 0) > 0 && !lightning.serienschutzFree;
    const cost = Math.ceil(maxChargeFor(skills, skillTiers) * frac);
    if (free) { next.serienschutzFree = true; streakHeld = true; }
    else if ((lightning.charge || 0) >= cost) { next.charge = lightning.charge - cost; streakHeld = true; }
    if (streakHeld) next.serienschutzCount = (lightning.serienschutzCount || 0) + 1;
  }
  const ksMin = lightParam(skills, skillTiers, L.KURZSCHLUSS, "minStacks");
  if (lightParam(skills, skillTiers, L.KURZSCHLUSS, "onLoss") && ksMin != null && (card?.ionStacks || 0) >= ksMin)
    next.stackBank = (lightning.stackBank || 0) + ionScoreFor(card, skills, skillTiers);
  return { lightning: next, streakHeld };
}

// Karte mit den meisten Stapeln (Gleichstand: der kleinste Deck-Index); −1 ohne ionisierte Karte. `exclude` = ein
// Index, der nicht zählt (Kettenblitz Episch: die zweittiefste Karte).
function deepestIndex(deck, exclude = -1) {
  let best = -1, bestSt = 0;
  deck.forEach((c, i) => { if (i === exclude) return; const st = c.ionStacks || 0; if (st > bestSt) { bestSt = st; best = i; } });
  return best;
}

/* Volle Leiste (höchstens EINE je Stich): +1 Leiste, die nächste Karte in der Reihenfolge (Wrap ans Deck-Ende → Anfang)
   wird ionisiert; Kettenblitz (§7.18, Tiefe) gibt danach der Karte mit den meisten Stapeln die Stapel seiner Stufe dazu;
   Ionenfeld lädt das Feld für die Stiche seiner Stufe; Gewitterfront/Entladung rampen; die Ladung fällt auf den
   Reststrom-Boden plus Blitzableiter-Rückgabe. Ladung, die danach über der Leiste liegt (Boden + Rückgabe ≥ Leiste,
   etwa Donnergott × Reststrom Episch × Blitzableiter), zündet beim nächsten Stich — nie in einer Endlosschleife.
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
  const storm = lightParam(skills, skillTiers, L.GEWITTERFRONT, "critPerBar") || 0;
  // §7.22 Gewitterfront Episch-Extra: die Rampe zahlt zusätzlich auf den Crit-Multiplikator (wie Entladung).
  const ent = (lightParam(skills, skillTiers, L.ENTLADUNG, "multPerBar") || 0) + (lightParam(skills, skillTiers, L.GEWITTERFRONT, "multPerBar") || 0);
  const floor = lightParam(skills, skillTiers, L.RESTSTROM, "floor") || 0;
  const back = lightParam(skills, skillTiers, L.ABLEITER, "back") || 0;
  const field = lightParam(skills, skillTiers, L.IONENFELD, "tricks") || 0;
  const next = { ...lightning, charge: floor + back, bars,
    stormCritBonus: (lightning.stormCritBonus || 0) + storm, entladungMult: (lightning.entladungMult || 0) + ent,
    fieldLeft: field > 0 ? field : (lightning.fieldLeft || 0) };
  return { lightning: next, deck: newDeck, filled: true, stacks, targets };
}

// Rundenende: der Gratis-Serienschutz (Episch) steht wieder zur Verfügung.
export const lightningCycleEnd = (lightning) => (lightning && lightning.serienschutzFree ? { ...lightning, serienschutzFree: false } : lightning);
