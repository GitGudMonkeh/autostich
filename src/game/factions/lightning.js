import * as C from "../constants.js";
import { SKILL_DEFS, TIER_EPIC, activeLightningCount, isLegendarySkill } from "../skills.js";

/* ============================================================
   BLITZ — Fraktionsmodul (exp skill rework, docs/skill-rework.md §3). Reine Logik: kein React, kein Math.random.

   Passiv (§3.2): jeder gehaltene Blitz-Skill gibt +LIGHTNING_CRIT_PER_SKILL Crit-Chance. Jeder Crit gibt +1 Ladung;
   ist die Leiste voll (LIGHTNING_MAX_CHARGE, Donnergott DONNERGOTT_MAX_CHARGE), ionisiert sie die NÄCHSTE Karte in der
   Reihenfolge (+1 Stapel) und leert sich auf den Reststrom-Boden. Ein Stapel gibt bei Sieg mit der Karte
   ION_SCORE_PER_STACK Score in die Basis. Stapel sind ohne Deckel und wachsen nie von selbst (Lesart A).

   Die 15 Skills lesen ihre Kennwerte aus den Stufentabellen in SKILL_DEFS (`tiers[0..3]`, Normal … Episch) über
   `lightParam`; Hochspannung (Legendär) hebt jede gehaltene Stufe um eins, Episch bleibt Episch. Legendäre haben keine
   Stufe. Alle Funktionen sind immutabel: sie geben neue Objekte zurück und fassen ihre Eingaben nicht an.
   ============================================================ */

// Skill-IDs der Fraktion — lesbare Namen für Modul und Engine.
export const L = Object.freeze({
  ABLEITER: "SK_LIGHTNING_01", KETTENBLITZ: "SK_LIGHTNING_03", UEBERSPANNUNG: "SK_LIGHTNING_04", RESTSTROM: "SK_LIGHTNING_05",
  GEWITTERFRONT: "SK_LIGHTNING_06", LADUNGSSERIE: "SK_LIGHTNING_07", STATIK: "SK_LIGHTNING_08", KURZSCHLUSS: "SK_LIGHTNING_09",
  ENTLADUNG: "SK_LIGHTNING_10", BLITZFAENGER: "SK_LIGHTNING_11", SPANNUNGSSTAU: "SK_LIGHTNING_13", UEBERSCHLAG: "SK_LIGHTNING_14",
  BLITZSCHLAG: "SK_LIGHTNING_15", DAUERSTROM: "SK_LIGHTNING_16", SERIENSCHUTZ: "SK_LIGHTNING_17",
  DONNERGOTT: "SK_LIGHTNING_L01", DOPPELENTLADUNG: "SK_LIGHTNING_L02", HOCHSPANNUNG: "SK_LIGHTNING_L03", DURCHSCHLAG: "SK_LIGHTNING_L04",
});

/* Frischer Blitz-Substate — inaktiv; der erste Blitz-Skill aktiviert ihn (Reducer). Zähler sind Lauf-kumulativ:
   bars = volle Leisten (Kettenblitz Normal zählt jede 2.; Anzeige), critCount = Crits (Blitzableiter Normal jeder 2.,
   Blitzschlag jeder N.), nonCritWins / lossCount = Statische Aufladung. Rampen ohne Deckel: stormCritBonus (Gewitterfront),
   entladungMult (Entladung). stauBonus = Spannungsstau. serienschutzFree = Episch-Gratisschutz dieser Runde verbraucht. */
export function initLightning() {
  return { active: false, charge: 0, maxCharge: C.LIGHTNING_MAX_CHARGE, bars: 0, critCount: 0, nonCritWins: 0, lossCount: 0,
    stormCritBonus: 0, entladungMult: 0, stauBonus: 0, serienschutzCount: 0, serienschutzFree: false };
}

const held = (skills, id) => (skills || []).includes(id);
export const hasDonnergott      = (skills) => held(skills, L.DONNERGOTT);
export const hasDoppelentladung = (skills) => held(skills, L.DOPPELENTLADUNG);
export const hasHochspannung    = (skills) => held(skills, L.HOCHSPANNUNG);
export const hasDurchschlag     = (skills) => held(skills, L.DURCHSCHLAG);

// Leistenlänge des Builds: Donnergott (L) macht die Leiste bei 7 voll.
export const maxChargeFor = (skills) => (hasDonnergott(skills) ? C.DONNERGOTT_MAX_CHARGE : C.LIGHTNING_MAX_CHARGE);

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

// Crit-Chance-Beitrag des Blitz-Archetyps (ungeklemmt): Passiv je Skill + Gewitterfront-Rampe + Spannungsstau +
// Ladungsserie (je Serienpunkt der Serie NACH diesem Sieg). 0, solange der Archetyp inaktiv ist.
export function lightningCritChance(lightning, skills, skillTiers, streak = 0) {
  if (!lightning || !lightning.active) return 0;
  let c = activeLightningCount(skills) * C.LIGHTNING_CRIT_PER_SKILL + (lightning.stormCritBonus || 0) + (lightning.stauBonus || 0);
  const perStreak = lightParam(skills, skillTiers, L.LADUNGSSERIE, "critPerStreak");
  if (perStreak) c += perStreak * Math.max(0, streak || 0);
  return c;
}

// Crit-Multiplikator-Beitrag des Blitz-Archetyps (additiv auf die Basis): Entladung-Rampe + Donnergott + Überschlag
// (Zustand: je 10 Punkte Crit-Chance über 100 %, solange der Überschuss besteht). 0, solange inaktiv.
export function lightningCritMult(lightning, skills, skillTiers, rawCrit = 0) {
  if (!lightning || !lightning.active) return 0;
  let m = (lightning.entladungMult || 0) + (hasDonnergott(skills) ? C.THUNDER_CRIT_MULT : 0);
  const per10 = lightParam(skills, skillTiers, L.UEBERSCHLAG, "multPer10");
  if (per10 && rawCrit > 1) m += Math.floor(((rawCrit - 1) * 100 + 1e-9) / 10) * per10;
  return m;
}

// Systemregel (alle Fraktionen, §1): Crit-Chance über 100 % gibt einen sehr kleinen Crit-Mult-Bonus je Prozentpunkt.
export const overcritMult = (rawCrit) => Math.max(0, (rawCrit || 0) - 1) * 100 * C.OVERCRIT_MULT_PER_PP;

// Blitzfänger: Kampfwert-Bonus einer Karte ab der Stapel-Schwelle der Stufe (Zustand, kein Ereignis).
export function blitzfaengerValue(skills, skillTiers, card) {
  const min = lightParam(skills, skillTiers, L.BLITZFAENGER, "minStacks");
  if (min == null || (card?.ionStacks || 0) < min) return 0;
  return lightParam(skills, skillTiers, L.BLITZFAENGER, "value") || 0;
}

// Stapel-Score der gespielten Karte (in die Basis): Stapel × ION_SCORE_PER_STACK; Kurzschluss zählt sie ab der
// Schwelle der Stufe doppelt.
export function ionScoreFor(card, skills = [], skillTiers = {}) {
  const st = card?.ionStacks || 0;
  if (!st) return 0;
  const min = lightParam(skills, skillTiers, L.KURZSCHLUSS, "minStacks");
  const factor = (min != null && st >= min) ? (lightParam(skills, skillTiers, L.KURZSCHLUSS, "factor") || 1) : 1;
  return st * C.ION_SCORE_PER_STACK * factor;
}

/* Ladungsgewinn eines gewonnenen Stichs und die fortgeschriebenen Zähler. `streak` = Serie NACH diesem Sieg.
   Crit: +1 Passiv, Blitzableiter (jeder N. Crit +1), Überspannung (Karte ab Schwelle +2). Sieg ohne Crit: Statische
   Aufladung (jeder N. +Ladung). Immer: Dauerstrom (ab Serie N +1), Ladungsserie Episch (ab Serie 8 +1).
   Deterministisch und ohne Nebenwirkung — die Engine ruft es für die Vorschau (füllt ein Crit die Leiste?) und dann
   für den echten Stich mit denselben Eingaben. */
export function chargeGainOnWin(lightning, skills, skillTiers, { isCrit, streak = 0, card = null } = {}) {
  let gain = 0;
  const next = { ...lightning };
  if (isCrit) {
    next.critCount = (lightning.critCount || 0) + 1;
    gain += 1;
    const every = lightParam(skills, skillTiers, L.ABLEITER, "critEvery");
    if (every && next.critCount % every === 0) gain += 1;
    const min = lightParam(skills, skillTiers, L.UEBERSPANNUNG, "minStacks");
    if (min != null && (card?.ionStacks || 0) >= min) gain += lightParam(skills, skillTiers, L.UEBERSPANNUNG, "charge") || 0;
  } else {
    next.nonCritWins = (lightning.nonCritWins || 0) + 1;
    const every = lightParam(skills, skillTiers, L.STATIK, "winEvery");
    if (every && next.nonCritWins % every === 0) gain += lightParam(skills, skillTiers, L.STATIK, "charge") || 0;
  }
  const minStreak = lightParam(skills, skillTiers, L.DAUERSTROM, "minStreak");
  if (minStreak != null && streak >= minStreak) gain += 1;
  const from = lightParam(skills, skillTiers, L.LADUNGSSERIE, "chargeFromStreak");
  if (from != null && streak >= from) gain += 1;
  return { gain, next };
}

// Vorschau für Entladung Episch: füllt ein Crit auf dieser Karte die Leiste in diesem Stich?
export function critFillsBar(lightning, skills, skillTiers, { streak = 0, card = null } = {}) {
  if (!lightning || !lightning.active) return false;
  const { gain } = chargeGainOnWin(lightning, skills, skillTiers, { isCrit: true, streak, card });
  return (lightning.charge || 0) + gain >= maxChargeFor(skills);
}

// Blitzschlag: jeder N. Crit ionisiert die Siegkarte (Doppelentladung: 2 Stapel). Liest den Zähler NACH dem Crit.
export function blitzschlagStacks(lightning, skills, skillTiers) {
  const every = lightParam(skills, skillTiers, L.BLITZSCHLAG, "critEvery");
  if (!every || (lightning.critCount || 0) % every !== 0) return 0;
  return hasDoppelentladung(skills) ? C.DOPPELENTLADUNG_STACKS : 1;
}

// Spannungsstau nach einem Sieg: ohne Crit +Schritt, mit Crit geleert (Episch: halbiert). Ohne den Skill unberührt —
// wird er ersetzt, leert der Reducer den Stau (PICK_SKILL); Tests nutzen stauBonus als synthetische Crit-Quelle.
export function stauAfterWin(lightning, skills, skillTiers, isCrit) {
  const step = lightParam(skills, skillTiers, L.SPANNUNGSSTAU, "step");
  if (step == null) return lightning;
  const cur = lightning.stauBonus || 0;
  const keep = lightParam(skills, skillTiers, L.SPANNUNGSSTAU, "critKeep") || 0;
  return { ...lightning, stauBonus: isCrit ? cur * keep : cur + step };
}

/* Niederlage: Serienschutz (Ladung ab dem Anteil der Stufe hält die Serie und wird verbraucht; Episch einmal je Runde
   gratis) und Statische Aufladung (jede N. Niederlage +1 Ladung, Sehr selten/Episch). Gibt den neuen Substate und ob
   die Serie gehalten wurde. `alreadyHeld` = ein anderer Schutz (Serienanker, Eispanzer) hält die Serie schon —
   dann wird keine Ladung ausgegeben. */
export function lightningOnLoss(lightning, skills, skillTiers, { alreadyHeld = false } = {}) {
  if (!lightning || !lightning.active) return { lightning, streakHeld: false };
  let next = { ...lightning, lossCount: (lightning.lossCount || 0) + 1 };
  let streakHeld = false;
  const frac = lightParam(skills, skillTiers, L.SERIENSCHUTZ, "frac");
  if (frac != null && !alreadyHeld) {
    const free = (lightParam(skills, skillTiers, L.SERIENSCHUTZ, "freePerRound") || 0) > 0 && !lightning.serienschutzFree;
    const cost = Math.ceil(maxChargeFor(skills) * frac);
    if (free) { next.serienschutzFree = true; streakHeld = true; }
    else if ((lightning.charge || 0) >= cost) { next.charge = lightning.charge - cost; streakHeld = true; }
    if (streakHeld) next.serienschutzCount = (lightning.serienschutzCount || 0) + 1;
  }
  const every = lightParam(skills, skillTiers, L.STATIK, "lossEvery");
  if (every && next.lossCount % every === 0) next.charge = (next.charge || 0) + 1;
  return { lightning: next, streakHeld };
}

/* Volle Leiste (höchstens EINE je Stich): +1 Leiste, die nächste Karte in der Reihenfolge (Wrap ans Deck-Ende → Anfang)
   wird ionisiert, Kettenblitz nimmt die folgenden dazu; Gewitterfront/Entladung rampen; die Ladung fällt auf den
   Reststrom-Boden plus Blitzableiter-Rückgabe (Episch behält den Überschuss). Ladung, die danach immer noch über der
   Leiste liegt, bleibt stehen und zündet beim nächsten Stich — so kann die Kombination Donnergott × Reststrom Episch ×
   Blitzableiter (Boden + Rückgabe ≥ Leiste) nicht in einer Endlosschleife feuern. Gibt { lightning, deck, filled,
   stacks, targets } zurück; ohne volle Leiste unverändert. */
export function fillBar(lightning, skills, skillTiers, deck, playerOrder, actualPos) {
  const max = maxChargeFor(skills);
  if (!lightning || !lightning.active || (lightning.charge || 0) < max) return { lightning, deck, filled: false, stacks: 0, targets: [] };
  const excess = lightning.charge - max;
  const bars = (lightning.bars || 0) + 1;
  const n = (playerOrder || []).length;
  const per = hasDoppelentladung(skills) ? C.DOPPELENTLADUNG_STACKS : 1;
  const kbEvery = lightParam(skills, skillTiers, L.KETTENBLITZ, "barEvery");
  const extraCards = (kbEvery && bars % kbEvery === 0) ? (lightParam(skills, skillTiers, L.KETTENBLITZ, "cards") || 0) : 0;
  const targetExtra = lightParam(skills, skillTiers, L.KETTENBLITZ, "targetExtra") || 0;
  const bumps = {};
  const targets = [];
  let stacks = 0;
  for (let k = 0; k <= extraCards && k < n; k++) {
    const di = playerOrder[(actualPos + 1 + k) % n];
    const add = per * (k === 0 ? 1 + targetExtra : 1);
    bumps[di] = (bumps[di] || 0) + add; stacks += add; targets.push(di);
  }
  let newDeck = deck.map((c, i) => (bumps[i] ? { ...c, ionStacks: (c.ionStacks || 0) + bumps[i] } : c));
  // Statische Aufladung Episch: die Zielkarte der Leiste dauerhaft +1 Kartenwert (gebacken wie die Schmiede).
  const tv = lightParam(skills, skillTiers, L.STATIK, "targetValue");
  if (tv && targets.length) newDeck = newDeck.map((c, i) => (i === targets[0] ? { ...c, value: c.value + tv } : c));
  const storm = lightParam(skills, skillTiers, L.GEWITTERFRONT, "critPerBar") || 0;
  const ent = lightParam(skills, skillTiers, L.ENTLADUNG, "multPerBar") || 0;
  const floor = lightParam(skills, skillTiers, L.RESTSTROM, "floor") || 0;
  const back = lightParam(skills, skillTiers, L.ABLEITER, "back") || 0;
  const keep = lightParam(skills, skillTiers, L.ABLEITER, "overflow") ? excess : 0;
  const next = { ...lightning, charge: floor + back + keep, bars,
    stormCritBonus: (lightning.stormCritBonus || 0) + storm, entladungMult: (lightning.entladungMult || 0) + ent };
  return { lightning: next, deck: newDeck, filled: true, stacks, targets };
}

// Rundenende: der Gratis-Serienschutz (Episch) steht wieder zur Verfügung.
export const lightningCycleEnd = (lightning) => (lightning && lightning.serienschutzFree ? { ...lightning, serienschutzFree: false } : lightning);
