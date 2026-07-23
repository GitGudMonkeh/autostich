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
   Legendär-Hooks (#33):
     winTie(ctx)             -> Gleichstand als Sieg werten (L2, ctx.winStreak = Serie VOR dem Stich)
     extraDamageTaken(ctx)   -> Zusatzschaden je Niederlage, summiert (L1/L6)
     critMultiplier(ctx)     -> Crit-Faktor überschreiben statt addieren (L5: 4)
     critChanceMult(ctx)     -> Faktor auf die Gesamt-Crit-Chance (L5: 0,5)
     tempoScoreFactorMult()  -> Faktor auf den Tempo-Score-Faktor (L6: 2)
   Flags (Spezialfälle mit Engine-Zustand):
     shieldPerCycle    -> erster verlorener Stich je Durchlauf: 0 Schaden (C5)
     winTieAfterLoss   -> nach Niederlage nächsten Gleichstand gewinnen (B5)
     legendaryCritGain -> jeder Crit erhöht legendaryCritBonus dauerhaft (L4, Engine-State)
     speedPct          -> Beitrag zur Flip-Geschwindigkeit (Kat. E, nur UI)
   rarity: "legendary" markiert Legendaries (Default "common") — Gewicht/Level-Gate in buildOffer.

   ctx-Felder je Stich: { posInCycle, trickNo, lastResult, lostLastTrick, winStreak }
   ctx-Felder je Sieg (scoreMult/scoreFlat/healOnWin): { winValue, winStreak, wins }
   ============================================================ */

const bumpWhere = (deck, pred, delta) =>
  deck.map((c) => (pred(c) ? { ...c, value: c.value + delta } : c));

// #71: die n Karten mit dem höchsten (dir="desc") bzw. niedrigsten (dir="asc") aktuellen Wert
// um delta anheben. Stabiler Sort (Ties nach ursprünglichem Index) → deterministisch, kein rng.
const bumpTopN = (deck, n, delta, dir) => {
  const order = deck.map((_, i) => i).sort((a, b) =>
    dir === "desc" ? deck[b].value - deck[a].value : deck[a].value - deck[b].value);
  const pick = new Set(order.slice(0, n));
  return deck.map((c, i) => (pick.has(i) ? { ...c, value: c.value + delta } : c));
};

// D2-Kombo: eskalierender Siegesserien-Multiplikator (+D2_STEP je Serienstufe, KEIN Cap, #31).
// EINE Formel als geteilte Quelle für Score-Berechnung (D2-Hook) UND Anzeige (comboMultFor →
// Battlefield-Float) → kein Drift, analog zum Muster von scoreMultFor/critChanceFor (#23/#25).
export const comboMult = (winStreak) => 1 + winStreak * C.D2_STEP;
// Basis-Siegesserie (#39): IMMER aktiver, gedeckelter Serien-Multiplikator (nicht D2-gebunden) —
// jede Serie hebt den Score-Mult leicht; D2 (comboMult) verstärkt zusätzlich. Geteilte Quelle
// für Engine-Score UND Anzeige (baseScoreMultFor → Header-Chip #37 / StatusRail #23).
export const streakBaseMult = (winStreak) => 1 + Math.min(winStreak * C.STREAK_BASE_STEP, C.STREAK_BASE_CAP);

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
        desc: "Vier zufällige Karten mit Wert 1–3 erhalten dauerhaft je +6 Wert.",
        onPick: (d, rng) => {
          const idx = d.map((c, i) => [c, i]).filter(([c]) => c.value >= 0 && c.value <= 3).map(([, i]) => i);
          const chosen = new Set(shuffle(idx, rng).slice(0, 4)); // bis zu 4 unterschiedliche Karten
          return d.map((c, i) => (chosen.has(i) ? { ...c, value: c.value + 6 } : c));
        } },

  // ---- Neue Normal-Perks (#71) — Anzeige-Gruppe über `cat` (A Deck / B Stich / C Leben) ----
  A6: { id: "A6", cat: "A", label: "Mittelklasse",
        desc: "Alle Karten mit aktuellem Wert 4–7 erhalten dauerhaft +2 Wert.",
        onPick: (d) => bumpWhere(d, (c) => c.value >= 4 && c.value <= 7, 2) },
  A7: { id: "A7", cat: "A", label: "Spitzenförderung",
        desc: "Die vier aktuell höchsten Karten erhalten dauerhaft je +6 Wert.",
        onPick: (d) => bumpTopN(d, 4, 6, "desc") },
  A8: { id: "A8", cat: "A", label: "Nachzügler",
        desc: "Die vier aktuell niedrigsten Karten erhalten dauerhaft je +6 Wert.",
        onPick: (d) => bumpTopN(d, 4, 6, "asc") },
  B6: { id: "B6", cat: "B", label: "Knappe Kiste",
        desc: "Gewinnst du mit exakt 1 Wertpunkt Vorsprung, +100 Score.",
        scoreFlat: (ctx) => (ctx.margin === 1 ? 100 : 0) },
  B7: { id: "B7", cat: "B", label: "Durchbruch",
        desc: "Nach fünf Stichen ohne Sieg erhält die nächste Karte +10 Wert (Sieg setzt zurück, Gleichstand zählt weiter).",
        cardBonus: (ctx) => ((ctx.sinceWin || 0) >= 5 ? 10 : 0) },
  C6: { id: "C6", cat: "C", label: "Trotz",
        desc: "Unter 50 % Leben −1 Schaden bei Niederlagen; bei 25 % oder weniger insgesamt −2.",
        dmgReduce: ({ life, maxLife }) => (maxLife > 0 && life / maxLife <= 0.25 ? 2 : maxLife > 0 && life / maxLife < 0.5 ? 1 : 0) },

  // ---- Seltene Perks (#71, Phase 2a) — rarity: "rare"; reine Hooks über bestehende Kontexte ----
  A9: { id: "A9", cat: "A", rarity: "rare", label: "Farbduell",
        desc: "Eine zufällige Farbe erhält dauerhaft +3 Wert, eine andere zufällige Farbe −1 Wert.",
        onPick: (d, rng) => {
          const s = shuffle(SUIT_ORDER, rng); const up = s[0], down = s[1];
          return d.map((c) => (c.suit === up ? { ...c, value: c.value + 3 }
            : c.suit === down ? { ...c, value: Math.max(0, c.value - 1) } : c));
        } },
  A10: { id: "A10", cat: "A", rarity: "rare", label: "Verdichtung",
        desc: "Alle Karten, deren aktueller Wert mehrfach im Deck vorkommt, erhalten dauerhaft +1 Wert.",
        onPick: (d) => {
          const cnt = {}; for (const c of d) cnt[c.value] = (cnt[c.value] || 0) + 1;
          return d.map((c) => (cnt[c.value] > 1 ? { ...c, value: c.value + 1 } : c));
        } },
  D10: { id: "D10", cat: "D", rarity: "rare", label: "Übermacht",
        desc: "Siege mit mindestens 8 Wertpunkten Vorsprung geben ×2 Score.",
        scoreMult: (ctx) => (ctx.margin >= 8 ? 2 : 1) },
  D11: { id: "D11", cat: "D", rarity: "rare", label: "Kritische Heilung",
        desc: "Jeder Crit heilt 5 Leben.",
        healOnCrit: () => 5 },
  E6: { id: "E6", cat: "E", rarity: "rare", label: "Drehzahl",
        desc: "Je 30 % permanentes Tempo +5 % Crit-Chance (150 % → +25 %).",
        critChance: (ctx) => Math.floor((ctx.speedPct || 0) / 30) * 0.05 },
  E7: { id: "E7", cat: "E", rarity: "rare", label: "Kontrollverlust",
        desc: "Ab 100 % Tempo +30 % Score. Niederlagen verursachen +1 Schaden.",
        scoreMult: (ctx) => ((ctx.speedPct || 0) >= 100 ? 1.3 : 1),
        extraDamageTaken: () => 1 },
  E8: { id: "E8", cat: "E", rarity: "rare", label: "Schnellschuss",
        desc: "Jeder zehnte Stich gibt bei einem Sieg +150 Score.",
        scoreFlat: (ctx) => (ctx.trickNo % 10 === 0 ? 150 : 0) },

  // ---- Seltene Perks (#71, Phase 2b) — Ergebnis-/Wert-Historie (neue State-Felder) ----
  B8: { id: "B8", cat: "B", rarity: "rare", label: "Revanche",
        desc: "Nach zwei aufeinanderfolgenden Niederlagen erhält die nächste Karte +7 Wert.",
        cardBonus: (ctx) => ((ctx.lossStreak || 0) >= 2 ? 7 : 0) },
  D12: { id: "D12", cat: "D", rarity: "rare", label: "Präzision",
        desc: "Gewinnst du mit demselben aktuellen Kartenwert wie beim vorherigen Sieg, ×3 Score.",
        scoreMult: (ctx) => (ctx.lastWinValue != null && ctx.winValue === ctx.lastWinValue ? 3 : 1) },
  D13: { id: "D13", cat: "D", rarity: "rare", label: "Wechselspiel",
        desc: "Sobald sich Sieg und Niederlage abwechseln, gibt jeder weitere Sieg im Wechselmuster +100 Score.",
        scoreFlat: (ctx) => ((ctx.altLen || 0) >= 3 ? 100 : 0) },

  // ---- Seltene Perks (#71, Phase 2c) — Crit-Historie (neue Engine-State-Felder) ----
  D14: { id: "D14", cat: "D", rarity: "rare", label: "Crit-Folge",
        desc: "Nach einem Crit erhält der nächste gewonnene Stich +20 % Crit-Chance (beim nächsten Sieg verbraucht).",
        critChance: (ctx) => (ctx.critFollowArmed ? 0.20 : 0) },
  D15: { id: "D15", cat: "D", rarity: "rare", label: "Fehlzündung",
        desc: "Jeder Sieg ohne Crit gibt +3 % Crit-Chance (max +30 %); ein Crit setzt den Bonus zurück.",
        critChance: (ctx) => (ctx.misfireBonus || 0) },
  D16: { id: "D16", cat: "D", rarity: "rare", label: "Schwachstellenanalyse",
        desc: "Verlierst du mit mindestens 5 Wertpunkten Abstand, erhält der nächste gewonnene Stich +40 % Crit-Chance.",
        critChance: (ctx) => (ctx.weaknessArmed ? 0.40 : 0) },

  // ---- Seltene Perks (#71, Phase 2d) — Per-Durchlauf Leben/Score (Engine-Flags + Zyklus-Hooks) ----
  C7: { id: "C7", cat: "C", rarity: "rare", label: "Überlebensvorteil",
        desc: "Nach jedem Durchlauf 4 Leben je eigener Karte mit Wert 13 oder höher (max 60).",
        healOnCycle: ({ deck }) => Math.min(C.SURVIVAL_CAP, C.SURVIVAL_PER_CARD * (deck || []).filter((c) => c.value >= C.SURVIVAL_MIN_VALUE).length) },
  C8: { id: "C8", cat: "C", rarity: "rare", label: "Sauberer Durchlauf",
        desc: "Nach 10 Stichen in Folge ohne echten Lebensverlust +15 Leben (voll vom Schild absorbierter Schaden zählt nicht).",
        cleanRunHeal: true }, // Engine führt cleanStreak
  C9: { id: "C9", cat: "C", rarity: "rare", label: "Opfergabe",
        desc: "Zu Beginn jedes Durchlaufs −30 Leben (kann nicht töten); dafür dauerhaft +20 % Score.",
        sacrificeCycle: true, scoreMult: () => C.SACRIFICE_SCORE_MULT },
  C10: { id: "C10", cat: "C", rarity: "rare", label: "Notfallration",
        desc: "Erstes Mal je Durchlauf bei 25 % Leben oder weniger: sofort +40 Leben.",
        emergencyHeal: true }, // Engine führt notfallUsed

  // ---- Seltene Perks (#71, Phase 2f) — Ergebnis-/Wert-Historie (neue State-Felder) ----
  B9: { id: "B9", cat: "B", rarity: "rare", label: "Perfekte Folge",
        desc: "Bei streng ansteigenden Kartenwerten je weitere Karte der Folge mehr Wert: 2.→+1, 3.→+2 … max +5. Eine gleiche/niedrigere Karte beginnt neu.",
        cardBonus: (ctx) => Math.min((ctx.ascChain || 1) - 1, 5) },
  D17: { id: "D17", cat: "D", rarity: "rare", label: "Farbserie",
        desc: "Mehrere Siege in Folge mit derselben Farbe: 2.→+75, 3.→+100, je weiterer +25 (max +200). Andere Farbe/Niederlage beendet die Serie.",
        scoreFlat: (ctx) => (ctx.suitStreak >= 2 ? Math.min(75 + (ctx.suitStreak - 2) * 25, 200) : 0) },
  D18: { id: "D18", cat: "D", rarity: "rare", label: "Volles Haus",
        desc: "Enthalten die letzten fünf Stiche (inkl. aktuellem) mindestens 4 Siege, gibt der aktuelle Sieg +250 Score.",
        scoreFlat: (ctx) => ((ctx.recentWinCount || 0) >= 3 ? 250 : 0) },

  // ---- Seltene Perks (#71, Phase 2e) — Serien-/Tempo-/Crit-Mechanik (Engine-Flags + State) ----
  B10: { id: "B10", cat: "B", rarity: "rare", label: "Überzahl",
        desc: "Ein Sieg mit mindestens 5 Wertpunkten Vorsprung zählt für Siegesserien-Effekte als zwei Stufen (Statistik/XP/Heilung bleiben ein Sieg).",
        ueberzahl: true }, // Engine führt overStreak
  E9: { id: "E9", cat: "E", rarity: "rare", label: "Hochlauf",
        desc: "Jeder Sieg gibt +2 % temporäres Tempo (max +40 %); eine Niederlage −10 pp. Zählt für Geschwindigkeit und Tempo-Score.",
        hochlauf: true }, // Engine führt rampTempo/tempTempo
  E10: { id: "E10", cat: "E", rarity: "rare", label: "Ruhe vor dem Sturm",
        desc: "Nach einem Gleichstand laufen die nächsten fünf Stiche 50 % schneller; das temporäre Tempo zählt auch für den Tempo-Score.",
        ruheVorDemSturm: true }, // Engine führt calmTricks/tempTempo
  D19: { id: "D19", cat: "D", rarity: "rare", label: "Überschusskrit",
        desc: "Crit-Chance über 100 % kann einen Super-Crit auslösen (z. B. 130 % → +30 % Chance auf ×3 statt ×2; mit Jackpot ×6).",
        superCrit: true }, // Engine wertet die Überschuss-Chance aus

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
        desc: "Ein Sieg mit Kartenwert 8 oder höher heilt 6 Leben.",
        healOnWin: (ctx) => (ctx.winValue >= C.D3_HIGH_MIN ? 6 : 0) },
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
        desc: "Siege mit Kartenwert 8+ geben +60 Score.",
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
        desc: "Siege mit Kartenwert 8+ : +35 % Crit-Chance.",
        critChance: ({ winValue }) => (winValue >= C.D3_HIGH_MIN ? 0.35 : 0) },
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

  // ---- Legendär (#33): mächtig, aber mit Nachteil. rarity "legendary" → Gewicht 8 & Level-Gate ≥5
  //      (buildOffer). Nutzen bestehende Kategorien (A–E) plus die neuen Legendär-Hooks oben. ----
  L1: { id: "L1", cat: "A", rarity: "legendary", label: "Überladung",
        desc: "Alle Karten dauerhaft +2 Wert — dafür verursachen verlorene Stiche +3 Schaden.",
        onPick: (d) => d.map((c) => ({ ...c, value: c.value + 2 })),
        extraDamageTaken: () => 3 },
  L2: { id: "L2", cat: "B", rarity: "legendary", label: "Unaufhaltsam",
        desc: "Ab 3 Siegen in Folge gewinnst du alle Gleichstände, bis die Serie endet.",
        winTie: ({ winStreak }) => winStreak >= 3 },
  L3: { id: "L3", cat: "C", rarity: "legendary", label: "Letztes Aufbäumen",
        desc: "Bei 25 % Leben oder weniger erhalten alle Karten +3 Wert für den aktuellen Stich.",
        cardBonus: ({ life, maxLife }) => (maxLife > 0 && life / maxLife <= 0.25 ? 3 : 0) }, // #71: +6→+3
  L4: { id: "L4", cat: "D", rarity: "legendary", label: "Kritische Masse",
        desc: "Jeder Crit erhöht deine Crit-Chance dauerhaft um 1 Prozentpunkt (max +30 pp).",
        legendaryCritGain: true }, // Engine führt legendaryCritBonus (Erhöhung NACH dem Crit-Wurf)
  L5: { id: "L5", cat: "D", rarity: "legendary", label: "Jackpot",
        desc: "Crits geben ×4 Score statt ×2 — dafür wird deine zufällige Crit-Chance halbiert.",
        critMultiplier: () => 4, critChanceMult: () => 0.5 },
  L6: { id: "L6", cat: "E", rarity: "legendary", label: "Raserei",
        desc: "Der Tempo-Score-Bonus wirkt doppelt — dafür verursachen verlorene Stiche +2 Schaden.",
        tempoScoreFactorMult: () => 2, extraDamageTaken: () => 2 },

  // ---- Neue Legendaries (#71 Phase 3) — regelverändernde Motoren, teils mit eigenem Engine-/Reducer-State ----
  L7: { id: "L7", cat: "A", rarity: "legendary", label: "Königsmacher",
        desc: "Erreicht eine Karte durch Aufwertungen erstmals Wert 13 oder höher, erhält sie dauerhaft weitere +2 (je Karte nur einmal).",
        kingmaker: true }, // Reducer prüft nach jeder Deck-Mod (kingBoosted)
  L8: { id: "L8", cat: "A", rarity: "legendary", label: "Schicksalsmaschine",
        desc: "Zu Beginn jedes Durchlaufs wird ein vorhandener Kartenwert zufällig bestimmt; Karten dieses Werts erhalten +8 Wert und geben bei Sieg ×2 Score (diesen Durchlauf).",
        schicksal: true,
        cardBonus: (ctx) => (ctx.fateValue != null && ctx.pValueBase === ctx.fateValue ? C.FATE_CARD_BONUS : 0),
        scoreMult: (ctx) => (ctx.fateValue != null && ctx.baseValue === ctx.fateValue ? C.FATE_SCORE_MULT : 1) },
  L9: { id: "L9", cat: "C", rarity: "legendary", label: "Blutvertrag",
        desc: "Zu Beginn jedes Durchlaufs 100 Leben opfern → dauerhaft +20 % Score (max 5×, +100 %). Nur bei über 100 Leben; kann nicht töten.",
        bloodPact: true, // Engine führt bloodStacks (Opfer im Durchlauf-Ende-Block)
        scoreMult: (ctx) => 1 + C.BLOOD_SCORE_STEP * (ctx.bloodStacks || 0) },
  L10: { id: "L10", cat: "D", rarity: "legendary", label: "Kettenreaktion",
        desc: "Ein Crit kann erneut critten (Chance = halbe finale Crit-Chance); je Stufe verdoppelt sich der Crit-Faktor, max 3 Zusatzstufen (×2→×4→×8→×16).",
        chainCrit: true }, // Engine würfelt die Kette nach dem Crit
  L11: { id: "L11", cat: "E", rarity: "legendary", label: "Zeitraffer",
        desc: "Alle Tempo-Boni wirken doppelt auf die reale Geschwindigkeit (normal auf den Tempo-Score). Nach jedem vollen Durchlauf dauerhaft +10 % Score (max +50 %).",
        zeitraffer: true, // App verdoppelt die reale Speed; Engine führt zeitrafferStacks
        scoreMult: (ctx) => 1 + C.ZEITRAFFER_SCORE_STEP * (ctx.zeitrafferStacks || 0) },
};

export const PERK_LIST = Object.values(PERK_DEFS);

export const rarityOf    = (id) => PERK_DEFS[id]?.rarity || "common";
export const isLegendary = (id) => rarityOf(id) === "legendary";

// Angebot: bis zu `count` noch nicht besessene Perks, GEWICHTET nach Seltenheit (#33, §10.3).
// Legendaries: erst ab LEGENDARY_MIN_LEVEL, höchstens MAX_LEGENDARIES_PER_OFFER je Angebot.
// Deterministisch über den injizierten rng (ein rng()-Zug je Auswahl). Pool leer → weniger Perks.
export function buildOffer(owned, rng, count, level = 1) {
  const legendaryOK = level >= C.LEGENDARY_MIN_LEVEL;
  const rareOK = level >= C.RARE_MIN_LEVEL; // #71: 3-Stufen-Gate — Seltene ab RARE_MIN_LEVEL
  let pool = PERK_LIST.filter((p) => {
    const r = p.rarity || "common";
    return !owned.includes(p.id) && (r !== "legendary" || legendaryOK) && (r !== "rare" || rareOK);
  });
  const chosen = [];
  let legendaries = 0;
  while (chosen.length < count && pool.length > 0) {
    const weights = pool.map((p) => C.RARITY_WEIGHTS[p.rarity || "common"]);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total, idx = 0;
    while (idx < pool.length - 1 && r >= weights[idx]) { r -= weights[idx]; idx += 1; }
    const pick = pool[idx];
    chosen.push(pick.id);
    if ((pick.rarity || "common") === "legendary") legendaries += 1;
    // Gezogenen raus; ist das Legendary-Limit erreicht, alle weiteren Legendaries aus dem Pool nehmen.
    pool = pool.filter((p) => p.id !== pick.id
      && !(legendaries >= C.MAX_LEGENDARIES_PER_OFFER && (p.rarity || "common") === "legendary"));
  }
  return chosen;
}

// Gesamt-Crit-Chance (0..1) eines Builds: Σ critChance-Perks + legendaryCritBonus (L4), dann
// × Π critChanceMult (L5 halbiert), geklemmt. EINE Quelle für Engine-Wurf UND Anzeige (#25, kein Drift).
// UNGEKLEMMTE Roh-Crit-Chance (kann >1 sein) — Basis für Überschusskrit (#71) und für critChanceFor.
export function critChanceRawFor(perks, ctx, legendaryCritBonus = 0) {
  let raw = 0;
  for (const id of perks) { const f = PERK_DEFS[id].critChance; if (f) raw += f(ctx); }
  raw += legendaryCritBonus || 0;
  let mult = 1;
  for (const id of perks) { const f = PERK_DEFS[id].critChanceMult; if (f) mult *= f(ctx); }
  return raw * mult;
}
export function critChanceFor(perks, ctx, legendaryCritBonus = 0) {
  return Math.min(1, Math.max(0, critChanceRawFor(perks, ctx, legendaryCritBonus)));
}
// Crit-Faktor: L5 (Jackpot) ÜBERSCHREIBT die Basis (×4) statt zu addieren → höchster Hook-Wert gewinnt.
// Geteilte Quelle für Engine-Score UND Anzeige.
export function critMultiplierFor(perks, ctx = {}) {
  let m = C.CRIT_BASE_MULT;
  for (const id of perks) { const f = PERK_DEFS[id].critMultiplier; if (f) m = Math.max(m, f(ctx)); }
  return m;
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
// Tempo-Score-Multiplikator: 1 + speedPct × TEMPO_SCORE_FACTOR × Π tempoScoreFactorMult (L6 ×2).
// Geteilte Quelle für Engine-Score UND #23-Anzeige → kein Drift.
export function tempoScoreMultFor(perks, speedPct) {
  let factorMult = 1;
  for (const id of perks) { const f = PERK_DEFS[id].tempoScoreFactorMult; if (f) factorMult *= f({}); }
  return 1 + (speedPct || 0) * C.TEMPO_SCORE_FACTOR * factorMult;
}
// Anzeige-Score-Multiplikator (#23/#37): immer aktive Faktoren D1 × D2 (NÄCHSTE Serie) × Tempo(L6).
// winValue hoch → das bedingte D4 (×3 bei ≤3) bleibt ausgeblendet. EINE Quelle für Header-Chip (#37)
// UND StatusRail-Detail (#23) → kein Drift.
export function baseScoreMultFor(perks, { winStreak = 0, wins = 0, trickNo = 0, pos = 0, speedPct = 0 } = {}) {
  // AKTUELLE Serie (kein +1): Serie 0 → ×1,00, wächst während die Serie läuft (#39). winValue hoch →
  // bedingtes D4 (×3 bei ≤3) bleibt ausgeblendet. Reine Anzeige — das Scoring nutzt die resultierende Serie.
  const ctx = { winStreak, winValue: 99, wins, trickNo, posInCycle: pos };
  return streakBaseMult(winStreak) * scoreMultFor(perks, ctx) * tempoScoreMultFor(perks, speedPct);
}
// Kombo-Wert eines Builds für die Anzeige (#31): nur wenn D2 gehalten wird — die Kombo IST der
// D2-Effekt. Nutzt dieselbe comboMult-Formel wie der D2-Score-Hook → Anzeige == tatsächlicher Wert.
export function comboMultFor(perks, winStreak) {
  return perks.includes("D2") ? comboMult(winStreak) : 1;
}
