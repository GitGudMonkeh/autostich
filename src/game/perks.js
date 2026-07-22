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
        desc: "Alle Karten mit Wert 5 erhalten dauerhaft +2 Wert.",
        onPick: (d) => bumpWhere(d, (c) => c.value === 5, 2) },
  A2: { id: "A2", cat: "A", label: "Gerade Stärke",
        desc: "Alle Karten mit geradem Wert erhalten dauerhaft +1 Wert.",
        onPick: (d) => bumpWhere(d, (c) => c.value % 2 === 0, 1) },
  A3: { id: "A3", cat: "A", label: "Ungerade Stärke",
        desc: "Alle Karten mit ungeradem Wert erhalten dauerhaft +1 Wert.",
        onPick: (d) => bumpWhere(d, (c) => c.value % 2 === 1, 1) },
  A4: { id: "A4", cat: "A", label: "Farbverstärkung",
        desc: "Alle Karten einer zufälligen Farbe erhalten dauerhaft +1 Wert.",
        onPick: (d, rng) => {
          const s = SUIT_ORDER[Math.floor(rng() * SUIT_ORDER.length)];
          return bumpWhere(d, (c) => c.suit === s, 1);
        } },
  A5: { id: "A5", cat: "A", label: "Einzelnes Upgrade",
        desc: "Eine zufällige Karte mit Wert 0–3 erhält dauerhaft +5 Wert.",
        onPick: (d, rng) => {
          const idx = d.map((c, i) => [c, i]).filter(([c]) => c.value >= 0 && c.value <= 3).map(([, i]) => i);
          if (!idx.length) return d;
          const pick = idx[Math.floor(rng() * idx.length)];
          return d.map((c, i) => (i === pick ? { ...c, value: c.value + 5 } : c));
        } },

  // ---- B: Stich-Effekte (Wert-Bonus auf die aktuelle Karte) ----
  B1: { id: "B1", cat: "B", label: "Gegenangriff",
        desc: "Nach einem verlorenen Stich erhält die nächste Karte +3 Wert.",
        cardBonus: (ctx) => (ctx.lostLastTrick ? 3 : 0) },
  B2: { id: "B2", cat: "B", label: "Momentum",
        desc: "Nach drei Siegen in Folge erhält die nächste Karte +5 Wert.",
        cardBonus: (ctx) => (ctx.winStreak > 0 && ctx.winStreak % 3 === 0 ? 5 : 0) },
  B3: { id: "B3", cat: "B", label: "Starker Auftakt",
        desc: "Der erste Stich jedes Deck-Durchlaufs erhält +5 Wert.",
        cardBonus: (ctx) => (ctx.posInCycle === 0 ? 5 : 0) },
  B4: { id: "B4", cat: "B", label: "Zehnter Schlag",
        desc: "Jeder zehnte Stich erhält +4 Wert.",
        cardBonus: (ctx) => (ctx.trickNo % 10 === 0 ? 4 : 0) },
  B5: { id: "B5", cat: "B", label: "Initiative",
        desc: "Nach einer Niederlage gewinnst du den nächsten Gleichstand.",
        winTieAfterLoss: true },

  // ---- C: Leben & Verteidigung ----
  C1: { id: "C1", cat: "C", label: "Lebensraub",
        desc: "Jeder gewonnene Stich heilt 1 Leben.",
        healOnWin: () => 1 },
  C2: { id: "C2", cat: "C", label: "Verbesserter Lebensraub",
        desc: "Jeder gewonnene Stich heilt zusätzlich 2 Leben.",
        healOnWin: () => 2 },
  C3: { id: "C3", cat: "C", label: "Panzerung",
        desc: "Verlorene Stiche verursachen 1 weniger Schaden.",
        dmgReduce: () => 1 },
  C4: { id: "C4", cat: "C", label: "Zweite Luft",
        desc: "Nach jedem vollen Deck-Durchlauf heilst du 50 Leben.",
        healOnCycle: () => 50 },
  C5: { id: "C5", cat: "C", label: "Schutzschild",
        desc: "Der erste verlorene Stich jedes Deck-Durchlaufs verursacht keinen Schaden.",
        shieldPerCycle: true },

  // ---- D: Score ----
  D1: { id: "D1", cat: "D", label: "Punktebonus",
        desc: "Alle gewonnenen Stiche geben +20 % Score.",
        scoreMult: () => 1 + C.D1_BONUS_PCT / 100 },
  D2: { id: "D2", cat: "D", label: "Siegesserie",
        desc: "Jeder aufeinanderfolgende Sieg erhöht den Score der Serie (×1,0, ×1,1, ×1,2 …).",
        scoreMult: (ctx) => 1 + C.D2_STEP * (ctx.winStreak - 1) },
  D3: { id: "D3", cat: "D", label: "Hohe Karten, hohe Belohnung",
        desc: "Siege mit Kartenwert 10+ geben +3 Score.",
        scoreFlat: (ctx) => (ctx.winValue >= C.D3_HIGH_MIN ? C.D3_BONUS : 0) },
  D4: { id: "D4", cat: "D", label: "Außenseitersieg",
        desc: "Siege mit Kartenwert 3 oder niedriger geben doppelten Score.",
        scoreMult: (ctx) => (ctx.winValue <= C.D4_LOW_MAX ? C.D4_MULT : 1) },
  D5: { id: "D5", cat: "D", label: "Zehnter Sieg",
        desc: "Jeder zehnte gewonnene Stich gibt +25 Score.",
        scoreFlat: (ctx) => (ctx.wins % 10 === 0 ? C.D5_BONUS : 0) },

  // ---- E: Tempo (nur Geschwindigkeit) ----
  E1: { id: "E1", cat: "E", label: "Tempo I",   desc: "Flip-Geschwindigkeit +10 %.", speedPct: 10 },
  E2: { id: "E2", cat: "E", label: "Tempo II",  desc: "Flip-Geschwindigkeit +20 %.", speedPct: 20 },
  E3: { id: "E3", cat: "E", label: "Tempo III", desc: "Flip-Geschwindigkeit +30 %.", speedPct: 30 },
  E4: { id: "E4", cat: "E", label: "Tempo IV",  desc: "Flip-Geschwindigkeit +40 %.", speedPct: 40 },
  E5: { id: "E5", cat: "E", label: "Tempo V",   desc: "Flip-Geschwindigkeit +50 %.", speedPct: 50 },
};

export const PERK_LIST = Object.values(PERK_DEFS);

// Angebot: `count` zufällige, noch nicht besessene Perks (bereits gewählte sind raus, §10.3).
export function buildOffer(owned, rng, count) {
  const avail = PERK_LIST.filter((p) => !owned.includes(p.id)).map((p) => p.id);
  return shuffle(avail, rng).slice(0, count);
}
