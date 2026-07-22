import * as C from "./constants.js";
import { SUIT_ORDER } from "./constants.js";
import { shuffle } from "./deck.js";

/* ============================================================
   PERK-REGISTRY  — datengetrieben (wie clauses.js in TrickLadder).
   Hooks (alle optional), ausgewertet in engine.js:
     onPick(deck, rng) -> neues Deck   einmalige Kartenmod beim Pick (Kat. A)
     cardBonus(ctx)    -> Wert-Bonus auf die Spielerkarte DIESES Stichs (Kat. B)
     healOnWin(ctx)    -> Leben je gewonnenem Stich (Kat. C)
     dmgReduce(ctx)    -> Schadensreduktion je verlorenem Stich
     healOnCycle()     -> Leben nach vollem Deck-Durchlauf
     scoreMult(ctx)    -> multiplikativer Score-Faktor bei Sieg (Kat. D)
     scoreFlat(ctx)    -> additiver Score bei Sieg
   Flags (Spezialfälle mit Engine-Zustand):
     shieldPerCycle    -> erster verlorener Stich je Durchlauf: 0 Schaden (C5)
     winTieAfterLoss   -> nach Niederlage nächsten Gleichstand gewinnen (B5)
     speedPct          -> Beitrag zur Flip-Geschwindigkeit (Kat. E, nur UI)

   ctx-Felder je Stich: { posInCycle, trickNo, lastResult, lostLastTrick, winStreak }
   ctx-Felder je Sieg (scoreMult/scoreFlat/healOnWin): { winValue, winStreak, wins }
   ============================================================ */

const bumpWhere = (deck, pred, delta) =>
  deck.map((c) => (pred(c) ? { ...c, value: c.value + delta } : c));

// D2-Kombo: eskalierender Siegesserien-Multiplikator (+D2_STEP je Serienstufe, KEIN Cap, #31).
// EINE Formel als geteilte Quelle für Score-Berechnung (D2-Hook) UND Anzeige (comboMultFor →
// Battlefield-Float) → kein Drift, analog zum Muster von scoreMultFor/critChanceFor (#23/#25).
export const comboMult = (winStreak) => 1 + winStreak * C.D2_STEP;

export const CATEGORIES = {
  A: { key: "A", name: "Deck",  desc: "Dauerhafte Kartenwerte",    color: "#8a7de0" },
  B: { key: "B", name: "Stich", desc: "Stich-Effekte",            color: "#e0605a" },
  C: { key: "C", name: "Leben", desc: "Überleben & Verteidigung", color: "#5ab87a" },
  D: { key: "D", name: "Score", desc: "Punkte",                   color: "#d4a63a" },
  E: { key: "E", name: "Tempo", desc: "Geschwindigkeit",          color: "#5a8ade" },
};

export const PERK_DEFS = {
  // ---- A: Deck-Modifikation (einmalig beim Pick) ----
  A1: { id: "A1", cat: "A", label: "Starke Fünfen",
        desc: "Alle Karten mit Wert 5 erhalten dauerhaft +6 Wert.",
        onPick: (d) => bumpWhere(d, (c) => c.value === 5, 6) },
  A2: { id: "A2", cat: "A", label: "Gerade Stärke",
        desc: "Alle Karten mit geradem Wert erhalten dauerhaft +1 Wert.",
        onPick: (d) => bumpWhere(d, (c) => c.value % 2 === 0, 1) },
  A3: { id: "A3", cat: "A", label: "Ungerade Stärke",
        desc: "Alle Karten mit ungeradem Wert erhalten dauerhaft +1 Wert.",
        onPick: (d) => bumpWhere(d, (c) => c.value % 2 === 1, 1) },
  A4: { id: "A4", cat: "A", label: "Farbverstärkung",
        desc: "Alle Karten einer zufälligen Farbe erhalten dauerhaft +2 Wert.",
        onPick: (d, rng) => {
          const s = SUIT_ORDER[Math.floor(rng() * SUIT_ORDER.length)];
          return bumpWhere(d, (c) => c.suit === s, 2);
        } },
  A5: { id: "A5", cat: "A", label: "Kleine ganz groß",
        desc: "Vier zufällige Karten mit Wert 0–3 erhalten dauerhaft je +6 Wert.",
        onPick: (d, rng) => {
          const idx = d.map((c, i) => [c, i]).filter(([c]) => c.value >= 0 && c.value <= 3).map(([, i]) => i);
          const chosen = new Set(shuffle(idx, rng).slice(0, 4)); // bis zu 4 unterschiedliche Karten
          return d.map((c, i) => (chosen.has(i) ? { ...c, value: c.value + 6 } : c));
        } },

  // ---- B: Stich-Effekte (Wert-Bonus auf die aktuelle Karte) ----
  B1: { id: "B1", cat: "B", label: "Gegenangriff",
        desc: "Nach einem verlorenen Stich erhält die nächste Karte +2 Wert.",
        cardBonus: (ctx) => (ctx.lostLastTrick ? 2 : 0) },
  B2: { id: "B2", cat: "B", label: "Momentum",
        desc: "Jeder dritte Sieg der laufenden Serie (3., 6., 9. …) erhält +6 Wert.",
        cardBonus: (ctx) => ((ctx.winStreak + 1) % 3 === 0 ? 6 : 0) },
  B3: { id: "B3", cat: "B", label: "Starker Auftakt",
        desc: "Die ersten drei Stiche jedes Deck-Durchlaufs erhalten je +4 Wert.",
        cardBonus: (ctx) => (ctx.posInCycle <= 2 ? 4 : 0) },
  B4: { id: "B4", cat: "B", label: "Zehnter Schlag",
        desc: "Jeder zehnte Stich erhält +8 Wert.",
        cardBonus: (ctx) => (ctx.trickNo % 10 === 0 ? 8 : 0) },
  B5: { id: "B5", cat: "B", label: "Initiative",
        desc: "Nach einer Niederlage erhält die nächste Karte +2 Wert und du gewinnst den nächsten Gleichstand.",
        cardBonus: (ctx) => (ctx.lostLastTrick ? 2 : 0), winTieAfterLoss: true },

  // ---- C: Leben & Verteidigung ----
  C1: { id: "C1", cat: "C", label: "Lebensraub",
        desc: "Jeder gewonnene Stich heilt 2 Leben.",
        healOnWin: () => 2 },
  C2: { id: "C2", cat: "C", label: "Triumph",
        desc: "Ein Sieg mit Kartenwert 10 oder höher heilt 6 Leben.",
        healOnWin: (ctx) => (ctx.winValue >= 10 ? 6 : 0) },
  C3: { id: "C3", cat: "C", label: "Panzerung",
        desc: "Verlorene Stiche verursachen 2 weniger Schaden.",
        dmgReduce: () => 2 },
  C4: { id: "C4", cat: "C", label: "Zweite Luft",
        desc: "Nach jedem vollen Deck-Durchlauf heilst du 50 Leben.",
        healOnCycle: () => 50 },
  C5: { id: "C5", cat: "C", label: "Schutzschild",
        desc: "Zu Beginn jedes Deck-Durchlaufs erhältst du 50 Schildpunkte, die Schaden vor dem Leben absorbieren.",
        shieldPerCycle: 50 },

  // ---- D: Score ----
  D1: { id: "D1", cat: "D", label: "Punktebonus",
        desc: "Alle gewonnenen Stiche geben +15 % Score.",
        scoreMult: () => 1 + C.D1_BONUS_PCT / 100 },
  D2: { id: "D2", cat: "D", label: "Siegesserie",
        desc: "Jeder aufeinanderfolgende Sieg gibt +10 % Score — eskalierende Kombo, ohne Obergrenze.",
        scoreMult: (ctx) => comboMult(ctx.winStreak) },
  D3: { id: "D3", cat: "D", label: "Hohe Karten, hohe Belohnung",
        desc: "Siege mit Kartenwert 10+ geben +60 Score.",
        scoreFlat: (ctx) => (ctx.winValue >= C.D3_HIGH_MIN ? C.D3_BONUS : 0) },
  D4: { id: "D4", cat: "D", label: "Außenseitersieg",
        desc: "Siege mit Kartenwert 3 oder niedriger geben dreifachen Score.",
        scoreMult: (ctx) => (ctx.winValue <= C.D4_LOW_MAX ? C.D4_MULT : 1) },
  D5: { id: "D5", cat: "D", label: "Zehnter Sieg",
        desc: "Jeder zehnte gewonnene Stich gibt +300 Score.",
        scoreFlat: (ctx) => (ctx.wins % 10 === 0 ? C.D5_BONUS : 0) },
  // Crit: kritische Treffer verdoppeln den gesamten Stichscore. ctx = { winValue, winStreak, wins, ... }.
  // winStreak/wins enthalten bereits den gerade gewonnenen Stich (resultierende Serie).
  D6: { id: "D6", cat: "D", label: "Kritische Chance",
        desc: "+12 % Crit-Chance. Ein Crit verdoppelt den Score des Stichs.",
        critChance: () => 0.12 },
  D7: { id: "D7", cat: "D", label: "Geschärfter Blick",
        desc: "Siege mit Kartenwert 10+ : +35 % Crit-Chance.",
        critChance: ({ winValue }) => (winValue >= 10 ? 0.35 : 0) },
  D8: { id: "D8", cat: "D", label: "Kritisches Momentum",
        desc: "Jede Stufe der aktuellen Siegesserie: +4 % Crit-Chance (max +40 %).",
        critChance: ({ winStreak }) => Math.min(winStreak * 0.04, 0.40) },
  D9: { id: "D9", cat: "D", label: "Perfekter Rhythmus",
        desc: "Jeder zehnte Sieg (10., 20., 30. …) ist garantiert kritisch.",
        guaranteedCrit: ({ wins }) => wins % 10 === 0 },

  // ---- E: Tempo (Geschwindigkeit — steigert zusätzlich den Score) ----
  E1: { id: "E1", cat: "E", label: "Tempo I",   desc: "Flip-Geschwindigkeit +30 %. Tempo erhöht auch den Score.", speedPct: 30 },
  E2: { id: "E2", cat: "E", label: "Tempo II",  desc: "Flip-Geschwindigkeit +30 %. Tempo erhöht auch den Score.", speedPct: 30 },
  E3: { id: "E3", cat: "E", label: "Tempo III", desc: "Flip-Geschwindigkeit +30 %. Tempo erhöht auch den Score.", speedPct: 30 },
  E4: { id: "E4", cat: "E", label: "Tempo IV",  desc: "Flip-Geschwindigkeit +30 %. Tempo erhöht auch den Score.", speedPct: 30 },
  E5: { id: "E5", cat: "E", label: "Tempo V",   desc: "Flip-Geschwindigkeit +30 %. Tempo erhöht auch den Score.", speedPct: 30 },
};

export const PERK_LIST = Object.values(PERK_DEFS);

// Angebot: `count` zufällige, noch nicht besessene Perks (bereits gewählte sind raus, §10.3).
export function buildOffer(owned, rng, count) {
  const avail = PERK_LIST.filter((p) => !owned.includes(p.id)).map((p) => p.id);
  return shuffle(avail, rng).slice(0, count);
}

// Summierte, auf 0..1 gedeckelte Crit-Chance der besessenen Perks für einen Kontext.
export function critChanceFor(perks, ctx) {
  let t = 0;
  for (const id of perks) { const f = PERK_DEFS[id].critChance; if (f) t += f(ctx); }
  return Math.min(1, Math.max(0, t));
}
// Hat der Build überhaupt ein Crit-Perk? (steuert die UI-Sichtbarkeit der Crit-Anzeigen)
export function hasCritPerk(perks) {
  return perks.some((id) => PERK_DEFS[id].critChance || PERK_DEFS[id].guaranteedCrit);
}
// Produkt der scoreMult-Perks für einen Kontext (für Live-Anzeige des Score-Multiplikators, #23).
export function scoreMultFor(perks, ctx) {
  let m = 1;
  for (const id of perks) { const f = PERK_DEFS[id].scoreMult; if (f) m *= f(ctx); }
  return m;
}
// Kombo-Wert eines Builds für die Anzeige (#31): nur wenn D2 gehalten wird — die Kombo IST der
// D2-Effekt. Nutzt dieselbe comboMult-Formel wie der D2-Score-Hook → Anzeige == tatsächlicher Wert.
export function comboMultFor(perks, winStreak) {
  return perks.includes("D2") ? comboMult(winStreak) : 1;
}
