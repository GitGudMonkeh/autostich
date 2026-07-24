import * as C from "./constants.js";
import { SUIT_ORDER } from "./constants.js";
import { shuffle } from "./deck.js";

/* ============================================================
   PERK-REGISTRY  — datengetrieben (wie clauses.js in TrickLadder).
   Score-/Wert-Hooks (alle optional), ausgewertet in engine.js:
     onPick(deck, rng)    -> neues Deck   einmalige Kartenmod beim Pick (Kat. A)
     cardBonus(ctx)       -> Wert-Bonus auf die Spielerkarte DIESES Stichs (Kat. B/C/L)
     scoreFlat(ctx)       -> additiver Score bei Sieg (Kat. D — fließt in die multiplizierte Basis)
     scoreFlatOnCrit(ctx) -> additiver Score NUR bei Crit (Kat. D)
     scoreMult(ctx)       -> multiplikativer Score-Faktor bei Sieg
   Kat.-C/E/L-Sonderfälle laufen über Marker/Flags am Perk (needsTarget, relay, triumph, permMod,
   sacrificeMod, jokerRole/bridgeRole, segmentLow/segmentHigh, critValueGain, successorCrit,
   swapExtremes, repeatPos, randomTarget, extraSwap, winTieAfterLoss) — je an ihrer Definition erklärt.
   Crit-Chance/-Mult kommen NICHT aus den Perks, sondern aus Stat + Blitz-Skills (Engine).
   rarity: "legendary" markiert Legendaries (Default "common") — Gewicht in buildOffer.

   ctx-Felder je Stich: { posInCycle, trickNo, lastResult, lostLastTrick, winStreak, sinceWin,
     lossStreak, posForm, predValue, pValueBase, isRole, triumphActive, isSegmentLow, isSegmentHigh }
   ctx-Felder je Sieg: { winValue, margin, winStreak, wins, baseValue, hasFormation, lastResult,
     suitStreak, recentWinCount, lastWinValue, critFollowArmed, weaknessArmed, misfireScore, rawCrit }
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

// Basis-Siegesserie (#39): IMMER aktiver, gedeckelter Serien-Multiplikator — jede Serie hebt den
// Score-Mult leicht. Geteilte Quelle für Engine-Score UND Anzeige (baseScoreMultFor → Header-Chip
// #37 / StatusRail #23) → kein Drift, analog zum Muster von scoreMultFor/critChanceFor (#23/#25).
export const streakBaseMult = (winStreak) => 1 + Math.min(winStreak * C.STREAK_BASE_STEP, C.STREAK_BASE_CAP);

export const CATEGORIES = {
  A: { key: "A", name: "Deck",   desc: "Dauerhafte Kartenwerte",   color: "#8a7de0" },
  B: { key: "B", name: "Stich",  desc: "Stich-Effekte",            color: "#e0605a" },
  C: { key: "C", name: "Rolle",  desc: "Kartenrollen",             color: "#5ab87a" },
  D: { key: "D", name: "Score",  desc: "Punkte",                   color: "#d4a63a" },
  E: { key: "E", name: "Form",   desc: "Formationswerkzeuge",      color: "#5a8ade" },
};

export const PERK_DEFS = {
  // ---- A: Deck-Modifikation (einmalig beim Pick) ----
  A1: { id: "A1", cat: "A", label: "Starke Fünfen",
        desc: "Alle Karten mit Wert 5 erhalten dauerhaft +4 Wert.",
        onPick: (d) => bumpWhere(d, (c) => c.value === 5, 4) },
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
        desc: "Vier zufällige Karten mit ursprünglichem Wert 1–3 erhalten dauerhaft je +5 Wert.",
        onPick: (d, rng) => {
          // §22.6: „ursprünglicher Wert" = baseRank (bleibt konstant), nicht der aktuelle Wert.
          const idx = d.map((c, i) => [c, i]).filter(([c]) => c.baseRank >= 1 && c.baseRank <= 3).map(([, i]) => i);
          const chosen = new Set(shuffle(idx, rng).slice(0, 4)); // bis zu 4 unterschiedliche Karten
          return d.map((c, i) => (chosen.has(i) ? { ...c, value: c.value + 5 } : c));
        } },

  // ---- Neue Normal-Perks (#71) — Anzeige-Gruppe über `cat` (A Deck / B Stich / C Leben) ----
  A6: { id: "A6", cat: "A", label: "Mittelklasse",
        desc: "Alle Karten mit aktuellem Wert 4–7 erhalten dauerhaft +1 Wert.",
        onPick: (d) => bumpWhere(d, (c) => c.value >= 4 && c.value <= 7, 1) },
  A7: { id: "A7", cat: "A", label: "Spitzenförderung",
        desc: "Die vier aktuell höchsten Karten erhalten dauerhaft je +4 Wert.",
        onPick: (d) => bumpTopN(d, 4, 4, "desc") },
  A8: { id: "A8", cat: "A", label: "Nachzügler",
        desc: "Die vier aktuell niedrigsten Karten erhalten dauerhaft je +5 Wert.",
        onPick: (d) => bumpTopN(d, 4, 5, "asc") },
  B6: { id: "B6", cat: "B", label: "Knappe Kiste",
        desc: "Liegt die gespielte Karte in einer Wiederholung, erhält sie +2 temporären Wert.",
        cardBonus: (ctx) => (ctx.posForm && ctx.posForm.formations.some((f) => f.type === "wiederholung") ? 2 : 0) },
  B7: { id: "B7", cat: "B", label: "Durchbruch",
        desc: "Nach fünf Stichen ohne Sieg erhält die nächste Karte +10 Wert (Sieg setzt zurück, Gleichstand zählt weiter).",
        cardBonus: (ctx) => ((ctx.sinceWin || 0) >= 5 ? 10 : 0) },
  C6: { id: "C6", cat: "C", label: "Finisher", needsTarget: 2,
        desc: "Wähle zwei Karten. Auf der letzten Position eines Segments erhalten sie +5 Wert.",
        cardBonus: (ctx) => (ctx.isRole && ctx.isRole("C6") && ctx.posInCycle % 5 === 4 ? 5 : 0) },

  // ---- Seltene Perks (#71, Phase 2a) — rarity: "rare"; reine Hooks über bestehende Kontexte ----
  A9: { id: "A9", cat: "A", label: "Farbduell",
        desc: "Eine zufällige Farbe erhält dauerhaft +3 Wert, eine andere zufällige Farbe −1 Wert.",
        onPick: (d, rng) => {
          const s = shuffle(SUIT_ORDER, rng); const up = s[0], down = s[1];
          return d.map((c) => (c.suit === up ? { ...c, value: c.value + 3 }
            : c.suit === down ? { ...c, value: Math.max(0, c.value - 1) } : c));
        } },
  A10: { id: "A10", cat: "A", label: "Verdichtung",
        desc: "Alle Karten, deren aktueller Wert mehrfach im Deck vorkommt, erhalten dauerhaft +1 Wert.",
        onPick: (d) => {
          const cnt = {}; for (const c of d) cnt[c.value] = (cnt[c.value] || 0) + 1;
          return d.map((c) => (cnt[c.value] > 1 ? { ...c, value: c.value + 1 } : c));
        } },
  D10: { id: "D10", cat: "D", label: "Übermacht",
        desc: "Ein Sieg mit mindestens 8 Wertpunkten Vorsprung gibt +350 Score.",
        scoreFlat: (ctx) => (ctx.margin >= 8 ? 350 : 0) },
  D11: { id: "D11", cat: "D", label: "Kritische Ernte",
        desc: "Ein Crit mit einer Karte in mindestens einer aktiven Formation gibt +250 Score.",
        scoreFlatOnCrit: (ctx) => (ctx.hasFormation ? 250 : 0) },
  E6: { id: "E6", cat: "E", label: "Drehzahl",
        desc: "Eine einzelne Karte darf gleichzeitig zu zwei unterschiedlichen Treppen gehören." },
  E7: { id: "E7", cat: "E", label: "Kontrollverlust",
        desc: "Die Positionen 10, 20, 30 und 40 sind Anker (siegreicher Anker ×1,25)." },
  E8: { id: "E8", cat: "E", label: "Schnellschuss",
        desc: "Die Positionen 5, 15, 25 und 35 sind Anker (siegreicher Anker ×1,25)." },

  // ---- Seltene Perks (#71, Phase 2b) — Ergebnis-/Wert-Historie (neue State-Felder) ----
  B8: { id: "B8", cat: "B", label: "Revanche",
        desc: "Nach zwei aufeinanderfolgenden Niederlagen erhält die nächste Karte +7 Wert.",
        cardBonus: (ctx) => ((ctx.lossStreak || 0) >= 2 ? 7 : 0) },
  D12: { id: "D12", cat: "D", label: "Präzision",
        desc: "Zwei aufeinanderfolgende Siege mit demselben Kartenwert geben dem zweiten +400 Score.",
        scoreFlat: (ctx) => (ctx.lastWinValue != null && ctx.winValue === ctx.lastWinValue ? 400 : 0) },
  D13: { id: "D13", cat: "D", label: "Wechselspiel",
        desc: "Ein Sieg direkt nach einer Niederlage gibt +200 Score.",
        scoreFlat: (ctx) => (ctx.lastResult === "loss" ? 200 : 0) },

  // ---- Seltene Perks (#71, Phase 2c) — Crit-Historie (neue Engine-State-Felder) ----
  D14: { id: "D14", cat: "D", label: "Crit-Folge",
        desc: "Ein Sieg direkt nach einem Crit gibt +200 Score.",
        scoreFlat: (ctx) => (ctx.critFollowArmed ? 200 : 0) },
  D15: { id: "D15", cat: "D", label: "Fehlzündung",
        desc: "Jeder Sieg ohne Crit lädt +30 Score für den nächsten Crit auf (max +300).",
        scoreFlatOnCrit: (ctx) => (ctx.misfireScore || 0) },
  D16: { id: "D16", cat: "D", label: "Schwachstellenanalyse",
        desc: "Nach einer Niederlage mit mindestens 5 Wertpunkten Abstand gibt der nächste Sieg +300 Score.",
        scoreFlat: (ctx) => (ctx.weaknessArmed ? 300 : 0) },

  // ---- C-Rollen mit Formations-/Segment-Bezug (V2 §22.6) ----
  C7: { id: "C7", cat: "C", label: "Überlebensvorteil", segmentLow: true,
        desc: "Die niedrigste Karte jedes Segments erhält +3 Wert.",
        cardBonus: (ctx) => (ctx.isSegmentLow ? 3 : 0) }, // Engine markiert die Segment-Tiefsten je Durchlauf
  C8: { id: "C8", cat: "C", label: "Joker", needsTarget: 2, jokerRole: true,
        desc: "Wähle zwei Karten. Für einen Farbblock zählen sie als Farbe ihres direkten Vorgängers." },
  C9: { id: "C9", cat: "C", label: "Opfergabe", needsTarget: 1, sacrificeMod: true,
        desc: "Wähle eine Karte. Sie verliert dauerhaft 3 Wert; ihr direkter Nachfolger erhält dauerhaft +5 Wert." },
  C10: { id: "C10", cat: "C", label: "Bindeglied", needsTarget: 2, bridgeRole: true,
        desc: "Wähle zwei Karten. Für eine Treppe dürfen sie als 1 Wert höher oder niedriger gelten." },

  // ---- Seltene Perks (#71, Phase 2f) — Ergebnis-/Wert-Historie (neue State-Felder) ----
  B9: { id: "B9", cat: "B", label: "Perfekte Folge",
        desc: "Karten einer Treppe erhalten je nach Position +1, +2, +3, danach +4 temporären Wert.",
        cardBonus: (ctx) => { const t = ctx.posForm && ctx.posForm.formations.find((f) => f.type === "treppe"); return t ? Math.min(t.ordinal, 4) : 0; } },
  D17: { id: "D17", cat: "D", label: "Farbserie",
        desc: "Aufeinanderfolgende Siege derselben Farbe geben jeweils +100 mehr Score (2.→+100, 3.→+200 …), maximal +400.",
        scoreFlat: (ctx) => Math.min(Math.max(0, ((ctx.suitStreak || 0) - 1) * 100), 400) },
  D18: { id: "D18", cat: "D", label: "Volles Haus",
        desc: "Fünf Siege innerhalb desselben Segments geben dem fünften Sieg +750 Score.",
        // Position ist die letzte im Segment (posInCycle % 5 == 4) UND die vier davor (recentResults) waren Siege.
        scoreFlat: (ctx) => (ctx.posInCycle % 5 === 4 && (ctx.recentWinCount || 0) >= 4 ? 750 : 0) },

  // ---- Seltene Perks (#71, Phase 2e) — Serien-/Tempo-/Crit-Mechanik (Engine-Flags + State) ----
  B10: { id: "B10", cat: "B", label: "Überzahl",
        desc: "Ist der Dauerwert einer Karte höher als der ihres direkten Vorgängers, erhält sie +3 temporären Wert.",
        cardBonus: (ctx) => (ctx.predValue != null && ctx.pValueBase > ctx.predValue ? 3 : 0) },
  E9: { id: "E9", cat: "E", label: "Segmentarbeit",
        desc: "Formationen dürfen über Segmentgrenzen hinweg fortgesetzt werden." },
  E10: { id: "E10", cat: "E", label: "Feinjustierung", extraSwap: 1,
        desc: "Jede Formationsphase erhält einen zusätzlichen kostenlosen beliebigen Tausch." },
  D19: { id: "D19", cat: "D", label: "Überschusskrit",
        desc: "Ein Crit über 100 % effektiver Crit-Chance gibt +250 Score.",
        scoreFlatOnCrit: (ctx) => ((ctx.rawCrit || 0) > 1 ? 250 : 0) },

  // ---- B: Stich-Effekte (Wert-Bonus auf die aktuelle Karte) ----
  B1: { id: "B1", cat: "B", label: "Gegenangriff",
        desc: "Nach einem verlorenen Stich erhält die nächste Karte +4 Wert.",
        cardBonus: (ctx) => (ctx.lostLastTrick ? 4 : 0) },
  B2: { id: "B2", cat: "B", label: "Momentum",
        desc: "Nach genau drei Siegen in Folge erhält die nächste Karte +5 Wert.",
        cardBonus: (ctx) => (ctx.winStreak === 3 ? 5 : 0) }, // §22.6: einmalig bei Serie 3 (Stand VOR dem Stich)
  B3: { id: "B3", cat: "B", label: "Starker Auftakt",
        desc: "Die ersten drei Karten jedes Durchlaufs erhalten je +4 Wert.",
        cardBonus: (ctx) => (ctx.posInCycle <= 2 ? 4 : 0) },
  B4: { id: "B4", cat: "B", label: "Zehnter Schlag",
        desc: "Karten auf Position 10, 20, 30 und 40 erhalten +8 Wert.",
        cardBonus: (ctx) => ((ctx.posInCycle + 1) % 10 === 0 ? 8 : 0) },
  B5: { id: "B5", cat: "B", label: "Initiative",
        desc: "Nach einer Niederlage gewinnst du den nächsten Gleichstand.",
        winTieAfterLoss: true },

  // ---- C: Kartenrollen (V2 §22.6) — meist mit manueller Kartenauswahl (needsTarget) ----
  //      Rollen liegen als Karten-ids in state.roles[perkId]; ctx.isRole(perkId) prüft die aktuelle Karte.
  C1: { id: "C1", cat: "C", label: "Vorhut", needsTarget: 3,
        desc: "Wähle drei Karten. Auf Position 1–5 erhalten sie +3 Wert.",
        cardBonus: (ctx) => (ctx.isRole && ctx.isRole("C1") && ctx.posInCycle <= 4 ? 3 : 0) },
  C2: { id: "C2", cat: "C", label: "Triumph", needsTarget: 3, triumph: true,
        desc: "Wähle drei Karten. Nach einem Sieg erhalten sie beim nächsten Auftauchen +2 Wert.",
        cardBonus: (ctx) => (ctx.triumphActive ? 2 : 0) }, // Engine armiert die Karte nach ihrem Sieg
  C3: { id: "C3", cat: "C", label: "Leibwache", needsTarget: 2,
        desc: "Wähle zwei Karten. Verliert ihr Vorgänger, erhalten sie +5 Wert.",
        cardBonus: (ctx) => (ctx.isRole && ctx.isRole("C3") && ctx.lastResult === "loss" ? 5 : 0) },
  C4: { id: "C4", cat: "C", label: "Staffelläufer", needsTarget: 3, relay: 1,
        desc: "Wähle drei Karten. Nach ihrem Sieg erhält der direkte Nachfolger +2 Wert." },
  C5: { id: "C5", cat: "C", label: "Anführer", needsTarget: 1, relay: 2,
        desc: "Wähle eine Karte. Nach ihrem Sieg erhalten die nächsten zwei Karten +2 Wert." },

  // ---- D: Flat Score (V2 §22.6 — alle additiv; fließen in die multiplizierte Basis, §15) ----
  //      Crit-Chance/-Mult kommen NICHT mehr aus den Perks, nur noch aus dem Stat + Blitz.
  //      `scoreFlatOnCrit` zahlt nur bei einem Crit (Engine addiert es in die multiplizierte Basis).
  D1: { id: "D1", cat: "D", label: "Punktebonus",
        desc: "Jeder Sieg mit mindestens einer aktiven Formation gibt +75 Score.",
        scoreFlat: (ctx) => (ctx.hasFormation ? 75 : 0) },
  D2: { id: "D2", cat: "D", label: "Siegesserie",
        desc: "Jeder Sieg gibt +25 Score je aktuellem Serienpunkt, maximal +250.",
        scoreFlat: (ctx) => Math.min(25 * (ctx.winStreak || 0), 250) },
  D3: { id: "D3", cat: "D", label: "Hohe Karten, hohe Belohnung",
        desc: "Ein Sieg mit Kartenwert 8 oder höher gibt +125 Score.",
        scoreFlat: (ctx) => (ctx.winValue >= C.D3_HIGH_MIN ? 125 : 0) },
  D4: { id: "D4", cat: "D", label: "Außenseitersieg",
        desc: "Ein Sieg mit Kartenwert 3 oder niedriger gibt +300 Score.",
        scoreFlat: (ctx) => (ctx.winValue <= C.D4_LOW_MAX ? 300 : 0) },
  D5: { id: "D5", cat: "D", label: "Zehnter Sieg",
        desc: "Jeder zehnte gewonnene Stich gibt +750 Score.",
        scoreFlat: (ctx) => (ctx.wins % 10 === 0 ? 750 : 0) },
  D6: { id: "D6", cat: "D", label: "Kritische Chance",
        desc: "Jeder Crit gibt +150 Score.",
        scoreFlatOnCrit: () => 150 },
  D7: { id: "D7", cat: "D", label: "Geschärfter Blick",
        desc: "Ein Crit mit Kartenwert 8 oder höher gibt +300 Score.",
        scoreFlatOnCrit: (ctx) => (ctx.winValue >= C.D3_HIGH_MIN ? 300 : 0) },
  D8: { id: "D8", cat: "D", label: "Kritisches Momentum",
        desc: "Jeder Crit innerhalb einer laufenden Siegesserie (ab Serie 2) gibt +200 Score.",
        scoreFlatOnCrit: (ctx) => ((ctx.winStreak || 0) >= 2 ? 200 : 0) },
  D9: { id: "D9", cat: "D", label: "Perfekter Rhythmus",
        desc: "Jeder fünfte gewonnene Stich gibt +300 Score.",
        scoreFlat: (ctx) => (ctx.wins % 5 === 0 ? 300 : 0) },

  // ---- E: Formationswerkzeuge (V2 §22.6) — reine Marker; die Wirkung steckt in computeFormations(perks). ----
  E1: { id: "E1", cat: "E", label: "Schrittmacher",
        desc: "Eine Wiederholung darf genau eine fremde Karte zwischen zwei gleichen Werten enthalten." },
  E2: { id: "E2", cat: "E", label: "Farbbrücke",
        desc: "Eine einzelne andersfarbige Karte unterbricht einen Farbblock nicht (sie zählt nicht zur Formation)." },
  E3: { id: "E3", cat: "E", label: "Sanfter Anstieg",
        desc: "Eine Treppe darf einmal zwei gleiche Werte hintereinander enthalten." },
  E4: { id: "E4", cat: "E", label: "Großer Schritt",
        desc: "Eine Treppe darf einmal einen Rückschritt enthalten." },
  E5: { id: "E5", cat: "E", label: "Pendelwerk",
        desc: "Ein Wechsel löst bereits ab zwei Karten aus (Differenz weiterhin ≥4)." },

  // ---- Legendär (#33): mächtig, aber mit Nachteil. rarity "legendary" → Gewicht 8 & Level-Gate ≥5
  //      (buildOffer). Nutzen bestehende Kategorien (A–E) plus die neuen Legendär-Hooks oben. ----
  L1: { id: "L1", cat: "A", rarity: "legendary", label: "Überladung", needsTarget: 5,
        desc: "Wähle fünf Karten. Sie erhalten dauerhaft +6 Wert.",
        permMod: (deck, order, ids) => deck.map((c) => (ids.includes(c.id) ? { ...c, value: c.value + 6 } : c)) },
  L2: { id: "L2", cat: "B", rarity: "legendary", label: "Unaufhaltsam",
        desc: "Jeder Sieg gibt der nächsten Karte +2 Wert, bis eine Niederlage eintritt.",
        cardBonus: (ctx) => 2 * (ctx.winStreak || 0) }, // ctx.winStreak = Serie VOR dieser Karte
  L3: { id: "L3", cat: "A", rarity: "legendary", label: "Letztes Aufbäumen",
        desc: "Alle Karten auf den Positionen 36–40 erhalten +5 Wert.",
        cardBonus: (ctx) => (ctx.posInCycle >= 35 ? 5 : 0) },
  L4: { id: "L4", cat: "D", rarity: "legendary", label: "Kritische Masse", critValueGain: 4,
        desc: "Jeder Crit gibt der betreffenden Karte dauerhaft +1 Wert (maximal +4)." },
  L5: { id: "L5", cat: "D", rarity: "legendary", label: "Jackpot", randomTarget: 4, jackpotScore: 1000,
        desc: "Vier zufällige Karten geben bei ihrem ersten Crit pro Durchlauf +1.000 Score." },
  L6: { id: "L6", cat: "B", rarity: "legendary", label: "Raserei",
        desc: "Jeder aufeinanderfolgende Sieg erhöht den Wertbonus der nächsten Karte um +2 (maximal +10).",
        cardBonus: (ctx) => Math.min(2 * (ctx.winStreak || 0), 10) },
  L7: { id: "L7", cat: "A", rarity: "legendary", label: "Königsmacher", segmentHigh: true,
        desc: "Die höchste Karte jedes Segments erhält +5 Wert.",
        cardBonus: (ctx) => (ctx.isSegmentHigh ? 5 : 0) },
  L8: { id: "L8", cat: "A", rarity: "legendary", label: "Schicksalsmaschine", swapExtremes: true,
        desc: "Nach jedem Durchlauf tauschen die erfolgreichste und die erfolgloseste Karte ihre Werte." },
  L9: { id: "L9", cat: "A", rarity: "legendary", label: "Blutvertrag", needsTarget: 4,
        desc: "Wähle vier Karten. Sie verlieren dauerhaft 2 Wert; ihre direkten Nachfolger erhalten dauerhaft +6 Wert.",
        permMod: (deck, order, ids) => {
          const succ = new Set(ids.map((id) => {
            const idx = order.findIndex((di) => deck[di].id === id);
            return idx >= 0 && idx + 1 < order.length ? deck[order[idx + 1]].id : null;
          }).filter(Boolean));
          return deck.map((c) => { let v = c.value; if (ids.includes(c.id)) v -= 2; if (succ.has(c.id)) v += 6; return { ...c, value: Math.max(0, v) }; });
        } },
  L10: { id: "L10", cat: "D", rarity: "legendary", label: "Kettenreaktion", successorCrit: true,
        desc: "Nach einem Crit ist der direkte Nachfolger garantiert kritisch, falls er gewinnt." },
  L11: { id: "L11", cat: "A", rarity: "legendary", label: "Zeitraffer", repeatPos: true,
        desc: "Position 40 wiederholt die temporären Kartenwert-Effekte, die zuvor auf Position 20 ausgelöst wurden." },
};

export const PERK_LIST = Object.values(PERK_DEFS);

export const rarityOf    = (id) => PERK_DEFS[id]?.rarity || "common";
export const isLegendary = (id) => rarityOf(id) === "legendary";

// UI-Metadaten je Seltenheit (#71): grau / grün / gold — geteilte Quelle für PerkSelect,
// BuildSummary und GameOver (analog zu CATEGORIES.color). `badge` leer = keine Marke (Normal).
export const RARITY_META = {
  common:    { key: "common",    label: "Normal",   badge: "",           mark: "",   color: "#8a8a95" }, // grau
  rare:      { key: "rare",      label: "Selten",   badge: "◆ SELTEN",   mark: "◆",  color: "#4ade80" }, // grün
  legendary: { key: "legendary", label: "Legendär", badge: "★ LEGENDÄR", mark: "★",  color: "#d4a63a" }, // gold
};
export const rarityMeta = (id) => RARITY_META[rarityOf(id)];

// Perks, deren Wirkung von Position/Reihenfolge oder Formations-Zugehörigkeit abhängt — für die
// Aufstellungshilfe in Formationsphase & Kartenübersicht (Issue #95). Alle E-Werkzeuge (Kat. E)
// plus kuratierte B/C/D/L, deren Effekt an Position, direkter Nachbarschaft oder Formation hängt.
const LAYOUT_EXTRA = new Set([
  "B3", "B4", "B6", "B9", "B10",          // Auftakt-/Zehner-Positionen · Wiederholung · Treppe · Überzahl (Vorgänger)
  "C1", "C3", "C4", "C5", "C6", "C7", "C8", "C10", // Positions-/Nachbarschafts-/Segment-Rollen · Joker/Bindeglied (Formation)
  "D1", "D11",                            // Formations-Sieg / Crit in Formation
  "L3", "L7", "L11",                      // Positionen 36–40 · Segment-Höchste · Position 20→40
]);
export function isLayoutPerk(id) { return PERK_DEFS[id]?.cat === "E" || LAYOUT_EXTRA.has(id); }
export function layoutPerks(owned) { return (owned || []).filter(isLayoutPerk); }

// Angebot: bis zu `count` noch nicht besessene Perks, GEWICHTET nach Seltenheit (#33, §10.3).
// Perk-Auswahl nach jeder Runde: KEINE Level-Gates mehr — alle Seltenheiten sofort möglich, nur gewichtet;
// höchstens MAX_LEGENDARIES_PER_OFFER Legendaries je Angebot.
// Deterministisch über den injizierten rng (ein rng()-Zug je Auswahl). Pool leer → weniger Perks.
export function buildOffer(owned, rng, count) {
  let pool = PERK_LIST.filter((p) => !owned.includes(p.id));
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

// Perk-Beitrag zur Roh-Crit-Chance (Σ critChance-Perks). V2: kein Perk trägt Crit-Chance → aktuell
// stets 0; Crit-Chance kommt aus Stat + Blitz (in der Engine addiert). Bleibt als Aggregations-/
// Anzeige-Quelle (#25): Engine (rawCrit) und PerkSelect/StatusRail summieren darauf. UNGEKLEMMT (>1 möglich).
export function critChanceRawFor(perks, ctx) {
  let raw = 0;
  for (const id of perks) { const f = PERK_DEFS[id].critChance; if (f) raw += f(ctx); }
  return raw;
}
export function critChanceFor(perks, ctx) {
  return Math.min(1, Math.max(0, critChanceRawFor(perks, ctx)));
}
// Crit-Faktor: Basis (CRIT_BASE_MULT 1,5) + Crit-Mult-Stat (V2 §22.3, baseBonus). V2 trägt kein Perk
// mehr einen Crit-Mult (L5 ist jetzt Flat-Score) → nur Basis + Stat. Signatur (perks, ctx) bleibt für
// die Aufrufer (Engine/StatusRail) stabil. Geteilte Quelle für Engine + Anzeige (kein Drift).
export function critMultiplierFor(perks, ctx = {}, baseBonus = 0) {
  return C.CRIT_BASE_MULT + (baseBonus || 0);
}
// Hat der Build überhaupt ein Crit-Perk? (steuert die UI-Sichtbarkeit der Crit-Anzeigen)
// V2: Crit-Chance kommt aus Stat/Blitz; D-Perks belohnen Crits über scoreFlatOnCrit → die zählen.
export function hasCritPerk(perks) {
  return perks.some((id) => PERK_DEFS[id].scoreFlatOnCrit);
}
// Produkt der scoreMult-Perks für einen Kontext (für Live-Anzeige des Score-Multiplikators, #23).
export function scoreMultFor(perks, ctx) {
  let m = 1;
  for (const id of perks) { const f = PERK_DEFS[id].scoreMult; if (f) m *= f(ctx); }
  return m;
}
// Anzeige-Score-Multiplikator (#23/#37): immer aktive Faktoren — Basis-Serie (#39) × Perk-scoreMult.
// winValue hoch → das bedingte D4 (×3 bei ≤3) bleibt ausgeblendet. EINE Quelle für Header-Chip (#37)
// UND StatusRail-Detail (#23) → kein Drift.
export function baseScoreMultFor(perks, { winStreak = 0, wins = 0, trickNo = 0, pos = 0 } = {}) {
  // AKTUELLE Serie (kein +1): Serie 0 → ×1,00, wächst während die Serie läuft (#39). winValue hoch →
  // bedingtes D4 (×3 bei ≤3) bleibt ausgeblendet. Reine Anzeige — das Scoring nutzt die resultierende Serie.
  const ctx = { winStreak, winValue: 99, wins, trickNo, posInCycle: pos };
  return streakBaseMult(winStreak) * scoreMultFor(perks, ctx);
}
