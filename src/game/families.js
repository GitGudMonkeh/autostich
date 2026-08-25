import { UPGRADE_TYPES, withFamilyTier } from "./rarity.js";
import { shuffle } from "./deck.js";
import { SUIT_ORDER } from "./constants.js";
import * as C from "./constants.js";
import { colorsAllied } from "./color.js"; // #289: Farbfokus grün-/allianz-bewusst

/* ============================================================
   FAMILIEN-REGISTRY (Rarität-Umbau #163, Spec docs/rarity-system.md §3.2).
   Reguläre Perks als aufwertbare FAMILIEN mit vier Stufen (I–IV). Legendäre (L1–L11) bleiben
   im flachen PERK_DEFS und außerhalb dieses Systems.

   Schema:
     FAMILY_DEFS[familyId] = {
       id, cat ∈ A/B/C/D/E, name, upgradeType ∈ UPGRADE_TYPES,
       tiers: { 1: TierDef, 2: TierDef, 3: TierDef, 4: TierDef },
     }
   TierDef trägt `desc` + je nach Effektart Hooks/Marker (gleiche Shape wie die Perk-Hooks):
     - replacement: nur der Hook der HÖCHSTEN gehaltenen Stufe ist aktiv (resolveActiveTier).
       Score-Hooks: scoreFlat(ctx) / scoreFlatOnCrit(ctx) / scoreMult(ctx); Wert-Hook: cardBonus(ctx).
       Engine-gekoppelte Stufen führen zusätzlich Daten-Parameter (z. B. misfireStep/misfireCap), die die
       Engine bei der Umstellung liest — der Hook liefert den Primäreffekt.
     - cumulative / role: folgen mit den A-/C-Familien (#163 Fortsetzung).

   Diese Datei ist ADDITIV: sie wird von der Engine erst mit der schrittweisen Umstellung konsumiert
   (Resolver unten). Reine Logik — kein Math.random / Date.
   ============================================================ */

const { REPLACEMENT, CUMULATIVE, ROLE } = UPGRADE_TYPES;

// ---- D · Score (Spec §3.2 D) — allesamt Regelersetzung (nur die höchste Stufe ist aktiv). ----
// Kontextfelder je Sieg (aus der Engine): winValue, margin, winStreak, wins, hasFormation, lastResult,
// suitStreak, recentWinCount, lastWinValue, critFollowArmed, weaknessArmed, misfireScore, rawCrit.
const D_FAMILIES = {
  D_FORMATION_BONUS: {
    id: "D_FORMATION_BONUS", cat: "D", name: "Score-Bonus", upgradeType: REPLACEMENT,
    tiers: {
      1: { scoreFlat: (c) => (c.hasFormation ? 50 : 0) },
      2: { scoreFlat: (c) => (c.hasFormation ? 100 : 0) },
      3: { scoreFlat: (c) => (c.hasFormation ? 175 : 0) },
      4: { scoreFlat: (c) => (c.hasFormation ? 300 : 0) },
    },
  },
  D_STREAK: {
    id: "D_STREAK", cat: "D", name: "Siegesserie", upgradeType: REPLACEMENT,
    tiers: {
      1: { scoreFlat: (c) => Math.min(15 * (c.winStreak || 0), 150) },
      2: { scoreFlat: (c) => Math.min(25 * (c.winStreak || 0), 250) },
      3: { scoreFlat: (c) => Math.min(35 * (c.winStreak || 0), 420) },
      4: { scoreFlat: (c) => Math.min(50 * (c.winStreak || 0), 750) },
    },
  },
  D_HIGH: {
    id: "D_HIGH", cat: "D", name: "Hohe Karten, hohe Belohnung", upgradeType: REPLACEMENT,
    tiers: {
      1: { scoreFlat: (c) => (c.winValue >= 9 ? 100 : 0) },
      2: { scoreFlat: (c) => (c.winValue >= 8 ? 150 : 0) },
      3: { scoreFlat: (c) => (c.winValue >= 7 ? 225 : 0) },
      4: { scoreFlat: (c) => (c.winValue >= 6 ? 350 : 0) },
    },
  },
  D_UNDERDOG: {
    id: "D_UNDERDOG", cat: "D", name: "Außenseitersieg", upgradeType: REPLACEMENT,
    tiers: {
      1: { scoreFlat: (c) => (c.winValue <= 2 ? 250 : 0) },
      2: { scoreFlat: (c) => (c.winValue <= 3 ? 350 : 0) },
      3: { scoreFlat: (c) => (c.winValue <= 4 ? 500 : 0) },
      4: { scoreFlat: (c) => (c.winValue <= 5 ? 750 : 0) },
    },
  },
  D_TENTH_WIN: {
    id: "D_TENTH_WIN", cat: "D", name: "Beutezug", upgradeType: REPLACEMENT,   // (Sprachprüfung G1) hieß „Zehnter Sieg" — kein Stufenwert lag bei 10
    tiers: {
      1: { scoreFlat: (c) => (c.wins % 12 === 0 ? 600 : 0) },
      2: { scoreFlat: (c) => (c.wins % 10 === 0 ? 800 : 0) },
      3: { scoreFlat: (c) => (c.wins % 8 === 0 ? 900 : 0) },
      4: { scoreFlat: (c) => (c.wins % 5 === 0 ? 1000 : 0) },
    },
  },
  D_CRIT_SCORE: {
    id: "D_CRIT_SCORE", cat: "D", name: "Kritische Chance", upgradeType: REPLACEMENT,
    tiers: {
      1: { scoreFlatOnCrit: () => 100 },
      2: { scoreFlatOnCrit: () => 175 },
      3: { scoreFlatOnCrit: () => 275 },
      4: { scoreFlatOnCrit: () => 450 },
    },
  },
  D_SHARP_EYE: {
    id: "D_SHARP_EYE", cat: "D", name: "Geschärfter Blick", upgradeType: REPLACEMENT,
    tiers: {
      1: { scoreFlatOnCrit: (c) => (c.winValue >= 9 ? 225 : 0) },
      2: { scoreFlatOnCrit: (c) => (c.winValue >= 8 ? 350 : 0) },
      3: { scoreFlatOnCrit: (c) => (c.winValue >= 7 ? 500 : 0) },
      4: { scoreFlatOnCrit: (c) => (c.winValue >= 6 ? 750 : 0) },
    },
  },
  D_CRIT_MOMENTUM: {
    id: "D_CRIT_MOMENTUM", cat: "D", name: "Kritisches Momentum", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Jeder Crit in einer Serie ab 3: +150 Score.",       scoreFlatOnCrit: (c) => ((c.winStreak || 0) >= 3 ? 150 : 0) },
      2: { desc: "Jeder Crit in einer Serie ab 2: +250 Score.",       scoreFlatOnCrit: (c) => ((c.winStreak || 0) >= 2 ? 250 : 0) },
      3: { desc: "Jeder Crit in einer Serie: +350 Score.",     scoreFlatOnCrit: (c) => ((c.winStreak || 0) >= 1 ? 350 : 0) },
      // IV: zusätzlich steigt die Serie um 1 (Engine-Extra, liest streakGainOnCrit bei der Umstellung).
      4: { desc: "Jeder Crit in einer Serie: +500 Score; die Serie steigt zusätzlich um 1.", scoreFlatOnCrit: (c) => ((c.winStreak || 0) >= 1 ? 500 : 0), streakGainOnCrit: 1 },
    },
  },
  D_RHYTHM: {
    id: "D_RHYTHM", cat: "D", name: "Perfekter Rhythmus", upgradeType: REPLACEMENT,
    tiers: {
      1: { scoreFlat: (c) => (c.wins % 7 === 0 ? 250 : 0) },
      2: { scoreFlat: (c) => (c.wins % 5 === 0 ? 350 : 0) },
      3: { scoreFlat: (c) => (c.wins % 4 === 0 ? 450 : 0) },
      4: { scoreFlat: (c) => (c.wins % 3 === 0 ? 600 : 0) },
    },
  },
  D_OVERPOWER: {
    id: "D_OVERPOWER", cat: "D", name: "Übermacht", upgradeType: REPLACEMENT,
    tiers: {
      1: { scoreFlat: (c) => (c.margin >= 10 ? 300 : 0) },
      2: { scoreFlat: (c) => (c.margin >= 8 ? 400 : 0) },
      3: { scoreFlat: (c) => (c.margin >= 6 ? 550 : 0) },
      4: { scoreFlat: (c) => (c.margin >= 4 ? 750 : 0) },
    },
  },
  D_CRIT_HARVEST: {
    id: "D_CRIT_HARVEST", cat: "D", name: "Kritische Ernte", upgradeType: REPLACEMENT,
    tiers: {
      1: { scoreFlatOnCrit: (c) => (c.hasFormation ? 175 : 0) },
      2: { scoreFlatOnCrit: (c) => (c.hasFormation ? 300 : 0) },
      3: { scoreFlatOnCrit: (c) => (c.hasFormation ? 475 : 0) },
      4: { scoreFlatOnCrit: (c) => (c.hasFormation ? 750 : 0) },
    },
  },
  D_PRECISION: {
    id: "D_PRECISION", cat: "D", name: "Gleichklang", upgradeType: REPLACEMENT, // (#267: von „Präzision" umbenannt — die Crit-Perk-Kategorie heißt jetzt Präzision)
    // I/II: exakt gleicher Wert wie der letzte Sieg. III/IV: gleicher oder ±1 Wert.
    // #189 Fund B: I–III zahlen nur EINMAL je Paar — die Engine verbraucht lastWinValue (Referenz) nach einer
    // Auszahlung (precisionTol = Toleranz der Stufe: I/II 0, III/IV 1); nur IV (chain) kettet weiter (Referenz läuft mit).
    // #146: „aufeinanderfolgend" heißt: der VORIGE Stich war auch ein Sieg (lastResult === "win", inkl. Gleichstand-
    // Sieg → in der Engine ebenfalls "win"). Sonst würde ein alter lastWinValue Niederlagen/Gleichstände überdauern
    // und z. B. Sieg(7) → Niederlage → Sieg(7) fälschlich zahlen. lastWinValue selbst wird nur bei Sieg gesetzt.
    tiers: {
      1: { desc: "Zwei Siege in Folge mit gleichem Kartenwert: +250 Score auf den zweiten.",        scoreFlat: (c) => (c.lastResult === "win" && c.lastWinValue != null && c.winValue === c.lastWinValue ? 250 : 0), precisionTol: 0 },
      2: { desc: "Zwei Siege in Folge mit gleichem Kartenwert: +450 Score auf den zweiten.",        scoreFlat: (c) => (c.lastResult === "win" && c.lastWinValue != null && c.winValue === c.lastWinValue ? 450 : 0), precisionTol: 0 },
      3: { desc: "Zwei Siege in Folge mit gleichem oder um 1 abweichendem Wert: +550 Score auf den zweiten.",    scoreFlat: (c) => (c.lastResult === "win" && c.lastWinValue != null && Math.abs(c.winValue - c.lastWinValue) <= 1 ? 550 : 0), precisionTol: 1 },
      4: { desc: "Zwei Siege in Folge mit gleichem oder um 1 abweichendem Wert: +800 Score; die Kette läuft weiter (jeder wertgleiche Folgesieg zahlt).", scoreFlat: (c) => (c.lastResult === "win" && c.lastWinValue != null && Math.abs(c.winValue - c.lastWinValue) <= 1 ? 800 : 0), precisionTol: 1, chain: true },
    },
  },
  D_INTERPLAY: {
    id: "D_INTERPLAY", cat: "D", name: "Wechselspiel", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Sieg direkt nach einer Niederlage: +150 Score.", scoreFlat: (c) => (c.lastResult === "loss" ? 150 : 0) },
      2: { desc: "Sieg direkt nach einer Niederlage: +275 Score.", scoreFlat: (c) => (c.lastResult === "loss" ? 275 : 0) },
      3: { desc: "Sieg direkt nach einer Niederlage: +450 Score.", scoreFlat: (c) => (c.lastResult === "loss" ? 450 : 0) },
      // IV: zusätzlich gibt die nächste Niederlage +200 gespeicherten Score (Engine-Extra storeOnLoss).
      4: { desc: "Sieg direkt nach einer Niederlage: +700 Score; die nächste Niederlage gibt +200 gespeicherten Score.", scoreFlat: (c) => (c.lastResult === "loss" ? 700 : 0), storeOnLoss: 200 },
    },
  },
  D_CRIT_FOLLOW: {
    id: "D_CRIT_FOLLOW", cat: "D", name: "Crit-Folge", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Sieg direkt nach einem Crit: +150 Score.", scoreFlat: (c) => (c.critFollowArmed ? 150 : 0) },
      2: { desc: "Sieg direkt nach einem Crit: +275 Score.", scoreFlat: (c) => (c.critFollowArmed ? 275 : 0) },
      3: { desc: "Sieg direkt nach einem Crit: +450 Score.", scoreFlat: (c) => (c.critFollowArmed ? 450 : 0) },
      // IV: ist der Folgesieg selbst ein Crit, zusätzlich +300 (Engine-Extra critFollowCritBonus).
      4: { desc: "Sieg direkt nach einem Crit: +700 Score; ist der Folgesieg selbst ein Crit, zusätzlich +300.", scoreFlat: (c) => (c.critFollowArmed ? 700 : 0), critFollowCritBonus: 300 },
    },
  },
  D_MISFIRE: {
    id: "D_MISFIRE", cat: "D", name: "Fehlzündung", upgradeType: REPLACEMENT,
    // Ladung wird in der Engine geführt (misfireScore); Stufe legt Schritt & Cap fest (Engine liest misfireStep/misfireCap).
    tiers: {
      1: { desc: "Jeder Sieg ohne Crit lädt +20 Score für den nächsten Crit (max +200).", scoreFlatOnCrit: (c) => (c.misfireScore || 0), misfireStep: 20, misfireCap: 200 },
      2: { desc: "Jeder Sieg ohne Crit lädt +35 Score für den nächsten Crit (max +350).", scoreFlatOnCrit: (c) => (c.misfireScore || 0), misfireStep: 35, misfireCap: 350 },
      3: { desc: "Jeder Sieg ohne Crit lädt +50 Score für den nächsten Crit (max +500).", scoreFlatOnCrit: (c) => (c.misfireScore || 0), misfireStep: 50, misfireCap: 500 },
      4: { desc: "Jeder Sieg ohne Crit lädt +75 Score (max +750); nach einem Crit bleiben 25 % der Ladung.", scoreFlatOnCrit: (c) => (c.misfireScore || 0), misfireStep: 75, misfireCap: 750, misfireRetain: 0.25 },
    },
  },
  D_WEAKNESS: {
    id: "D_WEAKNESS", cat: "D", name: "Schwachstellenanalyse", upgradeType: REPLACEMENT,
    // Armierung läuft in der Engine (weaknessArmed) über die Abstand-Schwelle (Engine liest weaknessDeficit).
    tiers: {
      1: { desc: "Nach einer Niederlage mit ≥7 Wertabstand: nächster Sieg +250 Score.", scoreFlat: (c) => (c.weaknessArmed ? 250 : 0), weaknessDeficit: 7 },
      2: { desc: "Nach einer Niederlage mit ≥5 Wertabstand: nächster Sieg +350 Score.", scoreFlat: (c) => (c.weaknessArmed ? 350 : 0), weaknessDeficit: 5 },
      3: { desc: "Nach einer Niederlage mit ≥4 Wertabstand: nächster Sieg +500 Score.", scoreFlat: (c) => (c.weaknessArmed ? 500 : 0), weaknessDeficit: 4 },
      4: { desc: "Nach jeder Niederlage: nächster Sieg +600 Score; bei ≥5 Wertabstand +900.", scoreFlat: (c) => (c.weaknessArmed ? (c.weaknessBig ? 900 : 600) : 0), weaknessDeficit: 0, weaknessBigDeficit: 5 },
    },
  },
  D_SUIT_STREAK: {
    id: "D_SUIT_STREAK", cat: "D", name: "Farbrausch", upgradeType: REPLACEMENT,
    // suitStreak wird in der Engine geführt; Schritt & Cap stecken direkt im scoreFlat-Hook (einzige Quelle).
    // Die Engine liest hier nur suitHalveOnSwitch (Stufe IV: Farbwechsel halbiert die Stufe statt Reset).
    tiers: {
      1: { desc: "Siege in Folge derselben Farbe: je +75 mehr Score (max +300).",  scoreFlat: (c) => Math.min(Math.max(0, ((c.suitStreak || 0) - 1) * 75), 300) },
      2: { desc: "Siege in Folge derselben Farbe: je +100 mehr Score (max +500).", scoreFlat: (c) => Math.min(Math.max(0, ((c.suitStreak || 0) - 1) * 100), 500) },
      3: { desc: "Siege in Folge derselben Farbe: je +150 mehr Score (max +750).", scoreFlat: (c) => Math.min(Math.max(0, ((c.suitStreak || 0) - 1) * 150), 750) },
      4: { desc: "Siege in Folge derselben Farbe: je +200 mehr Score (max +1.200); ein Farbwechsel halbiert die Farbserie, statt sie zurückzusetzen.", scoreFlat: (c) => Math.min(Math.max(0, ((c.suitStreak || 0) - 1) * 200), 1200), suitHalveOnSwitch: true },
    },
  },
  D_FULL_HOUSE: {
    id: "D_FULL_HOUSE", cat: "D", name: "Volles Haus", upgradeType: REPLACEMENT,
    // Zählt eine Segmentposition (posInCycle%5) + recentWinCount = Siege DIESES Segments davor (#189: segment-genau,
    // die Engine setzt den Zähler an jeder Segmentgrenze zurück → kein Leck über Segment-/Durchlaufgrenzen).
    tiers: {
      1: { desc: "Fünf Siege in einem Segment: +500 Score auf den fünften.",  scoreFlat: (c) => (c.posInCycle % 5 === 4 && (c.recentWinCount || 0) >= 4 ? 500 : 0) },
      2: { desc: "Vier Siege in einem Segment: +650 Score auf den vierten.",  scoreFlat: (c) => (c.posInCycle % 5 === 3 && (c.recentWinCount || 0) >= 3 ? 650 : 0) },
      3: { desc: "Vier Siege in einem Segment: +900 Score auf den vierten.",  scoreFlat: (c) => (c.posInCycle % 5 === 3 && (c.recentWinCount || 0) >= 3 ? 900 : 0) },
      4: { desc: "Drei Siege in einem Segment: +1.000 Score auf den dritten; der fünfte Sieg zusätzlich +1.000 Score.", scoreFlat: (c) => ((c.posInCycle % 5 === 2 && (c.recentWinCount || 0) >= 2 ? 1000 : 0) + (c.posInCycle % 5 === 4 && (c.recentWinCount || 0) >= 4 ? 1000 : 0)) },
    },
  },
  D_OVERCRIT: {
    id: "D_OVERCRIT", cat: "D", name: "Überschusskrit", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Crit über 110 % effektiver Crit-Chance: +200 Score.", scoreFlatOnCrit: (c) => ((c.rawCrit || 0) > 1.1 ? 200 : 0) },
      2: { desc: "Crit über 100 % effektiver Crit-Chance: +300 Score.", scoreFlatOnCrit: (c) => ((c.rawCrit || 0) > 1 ? 300 : 0) },
      3: { desc: "Jeder Überschuss-Crit (über 100 %): +500 Score.",         scoreFlatOnCrit: (c) => ((c.rawCrit || 0) > 1 ? 500 : 0) },
      // Crit-Bändigung 2026-08-15: der Zuschlag je Prozentpunkt war UNGEDECKELT und las dieselbe unbegrenzte Roh-Crit-
      // Chance wie Überschlag — bei +1.800 pp waren das ~9.500 Flat je Crit, und der Flat läuft durch den ganzen
      // Multiplikator-Stack. Jetzt zählen höchstens OVERCRIT_EXCESS_PP_CAP Prozentpunkte Überschuss.
      4: { desc: `Jeder Überschuss-Crit: +500 Score plus 5 je Prozentpunkt über 100 % (höchstens ${C.OVERCRIT_EXCESS_PP_CAP} Prozentpunkte gezählt).`,
           scoreFlatOnCrit: (c) => ((c.rawCrit || 0) > 1 ? 500 + Math.min(Math.round(((c.rawCrit || 0) - 1) * 100), C.OVERCRIT_EXCESS_PP_CAP) * 5 : 0) },
    },
  },
  D_BEBAUUNG: {
    id: "D_BEBAUUNG", cat: "D", name: "Dichte Bebauung", upgradeType: REPLACEMENT, needsArchitect: true,
    // Gebäude-Perk (Architekt): jeder Sieg zahlt Flat-Score je vom Gebäude-Overlay abgedeckter Zelle
    // (ctx.coverCount, 0–MAX_COVER). Belohnt Bauen in die Breite; Schritt & Deckel steigen je Stufe.
    tiers: {
      1: { desc: "Jeder Sieg: +4 Score je abgedeckter Zelle (max +100).",  scoreFlat: (c) => Math.min(4 * (c.coverCount || 0), 100) },
      2: { desc: "Jeder Sieg: +6 Score je abgedeckter Zelle (max +160).",  scoreFlat: (c) => Math.min(6 * (c.coverCount || 0), 160) },
      3: { desc: "Jeder Sieg: +9 Score je abgedeckter Zelle (max +240).",  scoreFlat: (c) => Math.min(9 * (c.coverCount || 0), 240) },
      4: { desc: "Jeder Sieg: +12 Score je abgedeckter Zelle (max +360).", scoreFlat: (c) => Math.min(12 * (c.coverCount || 0), 360) },
    },
  },
};

// ---- B · Stich (Spec §3.2 B) — temporäre Wertboni auf die gespielte Karte, allesamt Regelersetzung. ----
// Kontextfelder (aus effectivePlayerValue): lostLastTrick, winStreak (effektive Serie), posInCycle, sinceWin,
// lossStreak, posForm (Formationen + `mult` der Position), predValue (Dauerwert des Vorgängers), pValueBase.
const inRepeat = (c) => !!(c.posForm && c.posForm.formations && c.posForm.formations.some((f) => f.type === "wiederholung"));
const inAnyFormation = (c) => !!(c.posForm && c.posForm.mult > 1); // = positionHasFormation (mult > 1)
// Treppen-Ordinal (1,2,3,…) → Bonus: die ersten drei Stufen aus `firstThree`, ab der vierten konstant `cap`.
const stairBonus = (c, firstThree, cap) => {
  const t = c.posForm && c.posForm.formations && c.posForm.formations.find((f) => f.type === "treppe");
  if (!t) return 0;
  return t.ordinal <= 3 ? firstThree[t.ordinal - 1] : cap;
};

const B_FAMILIES = {
  B_COUNTER: {
    id: "B_COUNTER", cat: "B", name: "Gegenangriff", upgradeType: REPLACEMENT,
    tiers: {
      1: { cardBonus: (c) => (c.lostLastTrick ? 3 : 0) },
      2: { cardBonus: (c) => (c.lostLastTrick ? 5 : 0) },
      3: { cardBonus: (c) => (c.lostLastTrick ? 7 : 0) },
      4: { cardBonus: (c) => (c.lostLastTrick ? 10 : 0) },
    },
  },
  B_MOMENTUM: {
    id: "B_MOMENTUM", cat: "B", name: "Momentum", upgradeType: REPLACEMENT,
    // Spec §3.3: verstärkt IMMER nur die direkt nächste Karte; kein Trigger nach nur 2 Siegen (I braucht 4, sonst 3).
    tiers: {
      1: { cardBonus: (c) => (c.winStreak === 4 ? 4 : 0) },
      2: { cardBonus: (c) => (c.winStreak === 3 ? 5 : 0) },
      3: { cardBonus: (c) => (c.winStreak === 3 ? 7 : 0) },
      4: { cardBonus: (c) => (c.winStreak === 3 ? 10 : 0) },
    },
  },
  B_OPENING: {
    id: "B_OPENING", cat: "B", name: "Starker Auftakt", upgradeType: REPLACEMENT,
    tiers: {
      1: { cardBonus: (c) => (c.posInCycle <= 1 ? 2 : 0) },
      2: { cardBonus: (c) => (c.posInCycle <= 2 ? 3 : 0) },
      3: { cardBonus: (c) => (c.posInCycle <= 3 ? 4 : 0) },
      4: { cardBonus: (c) => (c.posInCycle <= 4 ? 5 : 0) },
    },
  },
  B_FINALE: {
    id: "B_FINALE", cat: "B", name: "Starkes Finale", upgradeType: REPLACEMENT,
    // Spiegel zu B_OPENING: verstärkt die LETZTEN Karten jedes Durchlaufs (posInCycle 0-basiert → Pos 40 = 39).
    // Fenster wächst je Stufe ans Durchlauf-Ende (letzte 2/3/4/5 Positionen), Bonus 2/3/4/5 wie beim Auftakt.
    tiers: {
      1: { cardBonus: (c) => (c.posInCycle >= 38 ? 2 : 0) },
      2: { cardBonus: (c) => (c.posInCycle >= 37 ? 3 : 0) },
      3: { cardBonus: (c) => (c.posInCycle >= 36 ? 4 : 0) },
      4: { cardBonus: (c) => (c.posInCycle >= 35 ? 5 : 0) },
    },
  },
  B_TENTH_STRIKE: {
    id: "B_TENTH_STRIKE", cat: "B", name: "Markstein", upgradeType: REPLACEMENT, // (Sprachprüfung G1) hieß „Zehnter Schlag" — wirkt auf POSITIONEN, nicht auf Siege
    // posInCycle ist 0-basiert → Position n = posInCycle n-1; „(pos+1) % k === 0" trifft jede k-te Position.
    tiers: {
      1: { desc: "Karten auf Position 20 und 40: +6 Stichwert.",               cardBonus: (c) => ((c.posInCycle + 1) % 20 === 0 ? 6 : 0) },
      2: { desc: "Karten auf Position 10, 20, 30 und 40: +6 Stichwert.",       cardBonus: (c) => ((c.posInCycle + 1) % 10 === 0 ? 6 : 0) },
      3: { desc: "Jede fünfte Position (5, 10 … 40): +6 Stichwert.",            cardBonus: (c) => ((c.posInCycle + 1) % 5 === 0 ? 6 : 0) },
      4: { desc: "Jede fünfte Position: +8 Stichwert.",                          cardBonus: (c) => ((c.posInCycle + 1) % 5 === 0 ? 8 : 0) },
    },
  },
  B_INITIATIVE: {
    id: "B_INITIATIVE", cat: "B", name: "Initiative", upgradeType: REPLACEMENT,
    // Engine armiert den Gleichstands-Sieg über tieArmLosses (Niederlagen bis zur Armierung). III/IV geben zusätzlich
    // der nächsten Karte nach einer Niederlage +1 bzw. +2 Wert (cardBonus über lostLastTrick) — #189 Fund C: III war
    // zuvor mechanisch identisch zu II (Phantom-Klausel), bekommt jetzt einen echten Wertbonus als Differenzierung.
    tiers: {
      1: { desc: "Nach zwei Niederlagen gewinnst du den nächsten Gleichstand.", tieArmLosses: 2 },
      2: { desc: "Nach einer Niederlage gewinnst du den nächsten Gleichstand.", tieArmLosses: 1 },
      3: { desc: "Nach einer Niederlage: nächste Karte +1 Stichwert und gewinnt den nächsten Gleichstand.", tieArmLosses: 1, cardBonus: (c) => (c.lostLastTrick ? 1 : 0) },
      4: { desc: "Nach einer Niederlage: nächste Karte +2 Stichwert und gewinnt den nächsten Gleichstand.", tieArmLosses: 1, cardBonus: (c) => (c.lostLastTrick ? 2 : 0) },
    },
  },
  B_TIGHT: {
    id: "B_TIGHT", cat: "B", name: "Knappe Kiste", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Liegt die Karte in einer Wiederholung: +1 Stichwert.",          cardBonus: (c) => (inRepeat(c) ? 1 : 0) },
      2: { desc: "Liegt die Karte in einer Wiederholung: +2 Stichwert.",          cardBonus: (c) => (inRepeat(c) ? 2 : 0) },
      3: { desc: "Liegt die Karte in ≥1 Formation: +2 Stichwert.",  cardBonus: (c) => (inAnyFormation(c) ? 2 : 0) },
      4: { desc: "Liegt die Karte in ≥1 Formation: +3 Stichwert.",  cardBonus: (c) => (inAnyFormation(c) ? 3 : 0) },
    },
  },
  B_BREAKTHROUGH: {
    id: "B_BREAKTHROUGH", cat: "B", name: "Durchbruch", upgradeType: REPLACEMENT,
    tiers: {
      1: { cardBonus: (c) => ((c.sinceWin || 0) >= 6 ? 7 : 0) },
      2: { cardBonus: (c) => ((c.sinceWin || 0) >= 5 ? 10 : 0) },
      3: { cardBonus: (c) => ((c.sinceWin || 0) >= 4 ? 12 : 0) },
      4: { cardBonus: (c) => ((c.sinceWin || 0) >= 3 ? 15 : 0) },
    },
  },
  B_REVENGE: {
    id: "B_REVENGE", cat: "B", name: "Revanche", upgradeType: REPLACEMENT,
    // I/II/IV: einfacher cardBonus über lossStreak. III: die nächsten ZWEI Karten je +6 (Engine armiert die
    // successorQueue, wenn lossStreak GENAU die Schwelle erreicht — revengeTwoCard {losses, bonus, count}).
    tiers: {
      1: { desc: "Nach drei Niederlagen in Folge: nächste Karte +6 Stichwert.", cardBonus: (c) => ((c.lossStreak || 0) >= 3 ? 6 : 0) },
      2: { desc: "Nach zwei Niederlagen in Folge: nächste Karte +7 Stichwert.", cardBonus: (c) => ((c.lossStreak || 0) >= 2 ? 7 : 0) },
      3: { desc: "Nach zwei Niederlagen in Folge: die nächsten zwei Karten je +6 Stichwert.", revengeTwoCard: { losses: 2, bonus: 6, count: 2 } },
      4: { desc: "Nach jeder Niederlage: nächste Karte +8 Stichwert.", cardBonus: (c) => ((c.lossStreak || 0) >= 1 ? 8 : 0) },
    },
  },
  B_PERFECT: {
    id: "B_PERFECT", cat: "B", name: "Perfekte Folge", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Treppenkarten: +0/+0/+1, danach +2 Stichwert.", cardBonus: (c) => stairBonus(c, [0, 0, 1], 2) },
      2: { desc: "Treppenkarten: +1/+2/+3, danach +4 Stichwert.",                cardBonus: (c) => stairBonus(c, [1, 2, 3], 4) },
      3: { desc: "Treppenkarten: +2/+3/+4, danach +5 Stichwert.",                cardBonus: (c) => stairBonus(c, [2, 3, 4], 5) },
      4: { desc: "Treppenkarten: +3/+4/+5, danach +6 Stichwert.",                cardBonus: (c) => stairBonus(c, [3, 4, 5], 6) },
    },
  },
  B_SUPERIOR: {
    id: "B_SUPERIOR", cat: "B", name: "Überzahl", upgradeType: REPLACEMENT,
    // Vergleich des DAUERWERTS (pValueBase) mit dem des direkten Vorgängers (predValue). Pos 0 (kein Vorgänger) → 0.
    tiers: {
      1: { desc: "Kartenwert ≥2 höher als der Vorgänger: +2 Stichwert.", cardBonus: (c) => (c.predValue != null && c.pValueBase - c.predValue >= 2 ? 2 : 0) },
      2: { desc: "Kartenwert höher als der Vorgänger: +3 Stichwert.",              cardBonus: (c) => (c.predValue != null && c.pValueBase > c.predValue ? 3 : 0) },
      3: { desc: "Kartenwert nicht niedriger als der Vorgänger: +3 Stichwert.",    cardBonus: (c) => (c.predValue != null && c.pValueBase >= c.predValue ? 3 : 0) },
      4: { desc: "Kartenwert höher als der Vorgänger: +5 Stichwert; genau gleich: +2.",                   cardBonus: (c) => (c.predValue == null ? 0 : c.pValueBase > c.predValue ? 5 : c.pValueBase === c.predValue ? 2 : 0) },
    },
  },
};

// ---- A · Deck (Spec §3.2 A) — KUMULATIVER Pick-Effekt: jede gewählte Stufe führt EINMALIG ihr Deck-Paket
//      aus (tierDef.onPick, angewandt in applyFamilyPick), frühere Boni bleiben; im Build wird nur der höchste
//      Rang angezeigt. Reine Deck-Mods (kein per-Stich-Hook) — Werte werden dauerhaft angehoben/gesenkt.
//      onPick(deck, rng, target) → neues Deck. `pickTarget` markiert Stufen mit Spieler-Auswahl (Farbe(n));
//      der Familien-Ziel-Flow (PICK_FAMILY → Ziel-Phase → CONFIRM) folgt mit Kategorie C. Ohne `target`
//      lassen diese Stufen das Deck unverändert (defensiv — solange der Flow noch nicht existiert).
const bumpWhere = (deck, pred, delta) =>
  deck.map((c) => (pred(c) ? { ...c, value: Math.max(0, c.value + delta) } : c));
// #71-Muster: die n Karten mit höchstem (dir="desc") bzw. niedrigstem (dir="asc") AKTUELLEN Wert je +delta.
// Stabiler Sort (Ties nach Index) → deterministisch, kein rng.
const bumpTopN = (deck, n, delta, dir) => {
  const order = deck.map((_, i) => i).sort((a, b) =>
    dir === "desc" ? deck[b].value - deck[a].value : deck[a].value - deck[b].value);
  const pick = new Set(order.slice(0, n));
  return deck.map((c, i) => (pick.has(i) ? { ...c, value: c.value + delta } : c));
};
// n zufällige Karten, die pred erfüllen, je +delta (deterministisch über injizierten rng).
const bumpRandomWhere = (deck, pred, n, delta, rng) => {
  const idx = deck.map((c, i) => [c, i]).filter(([c]) => pred(c)).map(([, i]) => i);
  const chosen = new Set(shuffle(idx, rng).slice(0, n));
  return deck.map((c, i) => (chosen.has(i) ? { ...c, value: Math.max(0, c.value + delta) } : c));
};
// Häufigkeit je AKTUELLEM Wert (A_CONDENSE — mehrfach vorkommende Wertgruppen).
const valueCounts = (deck) => { const cnt = {}; for (const c of deck) cnt[c.value] = (cnt[c.value] || 0) + 1; return cnt; };
// Farbduell: Gewinnerfarbe +up, Verliererfarbe +down (down negativ), alles auf >= 0 geklemmt.
// #291: grün-bewusst über suitMatch (wie A_SUIT_BOOST) — pflanzen-grüne Karten zählen als „G" (sonst greift ein
// grüner Gewinner nicht auf begrünte Karten). up gewinnt bei up===down (Reihenfolge im Ternär).
const suitDuel = (deck, up, down, upDelta, downDelta) =>
  deck.map((c) => (suitMatch(c, up) ? { ...c, value: Math.max(0, c.value + upDelta) }
    : suitMatch(c, down) ? { ...c, value: Math.max(0, c.value + downDelta) } : c));
const randomSuit = (rng) => SUIT_ORDER[Math.floor(rng() * SUIT_ORDER.length)];
// Farb-Prädikat für farbbasierte Wert-Boosts: „Grün" (Suit „G") umfasst auch pflanzen-grüne Karten (card.green) —
// auf dem Board werden sie als grün angezeigt, also zählen sie auch als Grün. Alle anderen Farben: nur die Originalfarbe.
const suitMatch = (c, s) => c.suit === s || (s === "G" && !!c.green);

const A_FAMILIES = {
  A_WEAK_STRONG: {
    id: "A_WEAK_STRONG", cat: "A", name: "Schwache Karten sind stark", upgradeType: CUMULATIVE,
    // Stufen gehen vom ursprünglichen Wert 5 abwärts; je schwächer die Karten, desto höher der Bonus (Spec §3.3).
    tiers: {
      1: { onPick: (d) => bumpWhere(d, (c) => c.baseRank === 5, 1) },
      2: { onPick: (d) => bumpWhere(d, (c) => c.baseRank === 4, 2) },
      3: { onPick: (d) => bumpWhere(d, (c) => c.baseRank === 3, 3) },
      4: { onPick: (d) => bumpWhere(d, (c) => c.baseRank <= 2, 4) },
    },
  },
  A_HIGH_STRONG: {
    id: "A_HIGH_STRONG", cat: "A", name: "Starke Karten werden stärker", upgradeType: CUMULATIVE,
    // Spiegel zu A_WEAK_STRONG: von der Spitze abwärts. Hebt hohe Karten sicher über die Gegner-10
    // (garantierte Siege) und speist Hoch-Karten-/Crit-Wert-Builds. Zahlenkurve gespiegelt (1/2/3/4).
    tiers: {
      1: { onPick: (d) => bumpWhere(d, (c) => c.baseRank === 6, 1) },
      2: { onPick: (d) => bumpWhere(d, (c) => c.baseRank === 7, 2) },
      3: { onPick: (d) => bumpWhere(d, (c) => c.baseRank === 8, 3) },
      4: { onPick: (d) => bumpWhere(d, (c) => c.baseRank >= 9, 4) },
    },
  },
  A_EVEN: {
    id: "A_EVEN", cat: "A", name: "Gerade Stärke", upgradeType: CUMULATIVE,
    tiers: {
      1: { desc: "Vier zufällige gerade Karten: dauerhaft +1 Kartenwert.", onPick: (d, rng) => bumpRandomWhere(d, (c) => c.value % 2 === 0, 4, 1, rng) },
      2: { desc: "Alle ursprünglichen 2er und 8er: dauerhaft +1 Kartenwert.", onPick: (d) => bumpWhere(d, (c) => c.baseRank === 2 || c.baseRank === 8, 1) },
      3: { desc: "Alle ursprünglichen 4er und 6er: dauerhaft +1 Kartenwert.", onPick: (d) => bumpWhere(d, (c) => c.baseRank === 4 || c.baseRank === 6, 1) },
      4: { desc: "Alle geraden Karten: dauerhaft +1 Kartenwert (zusätzlich zu den Stufen davor).", onPick: (d) => bumpWhere(d, (c) => c.value % 2 === 0, 1) },
    },
  },
  A_ODD: {
    id: "A_ODD", cat: "A", name: "Ungerade Stärke", upgradeType: CUMULATIVE,
    tiers: {
      1: { desc: "Vier zufällige ungerade Karten: dauerhaft +1 Kartenwert.", onPick: (d, rng) => bumpRandomWhere(d, (c) => c.value % 2 === 1, 4, 1, rng) },
      2: { desc: "Alle ursprünglichen 3er und 7er: dauerhaft +1 Kartenwert.", onPick: (d) => bumpWhere(d, (c) => c.baseRank === 3 || c.baseRank === 7, 1) },
      3: { desc: "Alle ursprünglichen 1er und 9er: dauerhaft +1 Kartenwert.", onPick: (d) => bumpWhere(d, (c) => c.baseRank === 1 || c.baseRank === 9, 1) },
      4: { desc: "Alle ungeraden Karten: dauerhaft +1 Kartenwert (zusätzlich zu den Stufen davor).", onPick: (d) => bumpWhere(d, (c) => c.value % 2 === 1, 1) },
    },
  },
  A_SUIT_BOOST: {
    id: "A_SUIT_BOOST", cat: "A", name: "Farbverstärkung", upgradeType: CUMULATIVE,
    // III/IV: Spieler wählt die Farbe (pickTarget). I/II: zufällige Farbe.
    tiers: {
      1: { desc: "Eine zufällige Farbe: vier zufällige Karten dauerhaft +1 Kartenwert.", onPick: (d, rng) => { const s = randomSuit(rng); return bumpRandomWhere(d, (c) => suitMatch(c, s), 4, 1, rng); } },
      2: { desc: "Eine zufällige Farbe: alle Karten dauerhaft +1 Kartenwert.", onPick: (d, rng) => { const s = randomSuit(rng); return bumpWhere(d, (c) => suitMatch(c, s), 1); } },
      3: { desc: "Wähle eine Farbe: alle ihre Karten dauerhaft +1 Kartenwert.", pickTarget: { suits: 1 }, onPick: (d, _rng, target) => (target?.suits?.[0] ? bumpWhere(d, (c) => suitMatch(c, target.suits[0]), 1) : d) },
      4: { desc: "Wähle eine Farbe: alle ihre Karten dauerhaft +2 Kartenwert.", pickTarget: { suits: 1 }, onPick: (d, _rng, target) => (target?.suits?.[0] ? bumpWhere(d, (c) => suitMatch(c, target.suits[0]), 2) : d) },
    },
  },
  A_SMALL_BIG: {
    id: "A_SMALL_BIG", cat: "A", name: "Kleine ganz groß", upgradeType: CUMULATIVE,
    // „1–3er" = ursprünglicher Wert (baseRank), bleibt über spätere Boni hinweg konstant.
    tiers: {
      1: { desc: "Zwei zufällige ursprüngliche 1–3er: dauerhaft je +3 Kartenwert.", onPick: (d, rng) => bumpRandomWhere(d, (c) => c.baseRank >= 1 && c.baseRank <= 3, 2, 3, rng) },
      2: { desc: "Drei zufällige ursprüngliche 1–3er: dauerhaft je +4 Kartenwert.", onPick: (d, rng) => bumpRandomWhere(d, (c) => c.baseRank >= 1 && c.baseRank <= 3, 3, 4, rng) },
      3: { desc: "Vier zufällige ursprüngliche 1–3er: dauerhaft je +5 Kartenwert.", onPick: (d, rng) => bumpRandomWhere(d, (c) => c.baseRank >= 1 && c.baseRank <= 3, 4, 5, rng) },
      4: { desc: "Alle ursprünglichen 1–3er: dauerhaft je +3 Kartenwert.", onPick: (d) => bumpWhere(d, (c) => c.baseRank >= 1 && c.baseRank <= 3, 3) },
    },
  },
  A_MIDRANGE: {
    id: "A_MIDRANGE", cat: "A", name: "Mittelklasse", upgradeType: CUMULATIVE,
    // Prüfung des AKTUELLEN Werts erfolgt jeweils beim Pick.
    tiers: {
      1: { desc: "Drei zufällige Karten mit aktuellem Wert 4–7: dauerhaft +1 Kartenwert.", onPick: (d, rng) => bumpRandomWhere(d, (c) => c.value >= 4 && c.value <= 7, 3, 1, rng) },
      2: { desc: "Fünf zufällige Karten mit aktuellem Wert 4–7: dauerhaft +1 Kartenwert.", onPick: (d, rng) => bumpRandomWhere(d, (c) => c.value >= 4 && c.value <= 7, 5, 1, rng) },
      3: { desc: "Alle Karten mit aktuellem Wert 4–7: dauerhaft +1 Kartenwert.", onPick: (d) => bumpWhere(d, (c) => c.value >= 4 && c.value <= 7, 1) },
      4: { desc: "Alle Karten mit aktuellem Wert 3–8: dauerhaft +1 Kartenwert.", onPick: (d) => bumpWhere(d, (c) => c.value >= 3 && c.value <= 8, 1) },
    },
  },
  A_TOP: {
    id: "A_TOP", cat: "A", name: "Spitzenförderung", upgradeType: CUMULATIVE,
    // Rangliste wird bei jedem Pick neu über den aktuellen Wert bestimmt.
    tiers: {
      1: { onPick: (d) => bumpTopN(d, 2, 2, "desc") },
      2: { onPick: (d) => bumpTopN(d, 3, 3, "desc") },
      3: { onPick: (d) => bumpTopN(d, 4, 4, "desc") },
      4: { onPick: (d) => bumpTopN(d, 5, 5, "desc") },
    },
  },
  A_BOTTOM: {
    id: "A_BOTTOM", cat: "A", name: "Nachzügler", upgradeType: CUMULATIVE,
    tiers: {
      1: { onPick: (d) => bumpTopN(d, 2, 3, "asc") },
      2: { onPick: (d) => bumpTopN(d, 3, 4, "asc") },
      3: { onPick: (d) => bumpTopN(d, 4, 5, "asc") },
      4: { onPick: (d) => bumpTopN(d, 5, 6, "asc") },
    },
  },
  A_SUIT_DUEL: {
    id: "A_SUIT_DUEL", cat: "A", name: "Farbduell", upgradeType: CUMULATIVE,
    // Jede Stufe führt ihren Tausch dauerhaft aus (Gewinnerfarbe hoch, Verliererfarbe −1). III/IV: Spieler wählt.
    tiers: {
      1: { desc: "Eine zufällige Farbe +1 Kartenwert dauerhaft, eine andere −1 Kartenwert.", onPick: (d, rng) => { const s = shuffle(SUIT_ORDER, rng); return suitDuel(d, s[0], s[1], 1, -1); } },
      2: { desc: "Eine zufällige Farbe +2 Kartenwert dauerhaft, eine andere −1 Kartenwert.", onPick: (d, rng) => { const s = shuffle(SUIT_ORDER, rng); return suitDuel(d, s[0], s[1], 2, -1); } },
      3: { desc: "Wähle die Gewinnerfarbe (+3 Kartenwert); eine zufällige andere Farbe verliert 1 Kartenwert.", pickTarget: { suits: 1 }, onPick: (d, rng, target) => { const up = target?.suits?.[0]; if (!up) return d; const down = shuffle(SUIT_ORDER.filter((s) => s !== up), rng)[0]; return suitDuel(d, up, down, 3, -1); } },
      4: { desc: "Wähle Gewinner- und Verliererfarbe: +4 / −1 Kartenwert.", pickTarget: { suits: 2 }, onPick: (d, _rng, target) => { const [up, down] = target?.suits || []; return up && down ? suitDuel(d, up, down, 4, -1) : d; } },
    },
  },
  A_CONDENSE: {
    id: "A_CONDENSE", cat: "A", name: "Verdichtung", upgradeType: CUMULATIVE,
    // Deckzustand (Häufigkeit je aktuellem Wert) wird beim Pick geprüft.
    tiers: {
      1: { desc: "Zwei zufällige Karten aus mehrfach vorkommenden Wertgruppen: dauerhaft +1 Kartenwert.", onPick: (d, rng) => { const cnt = valueCounts(d); return bumpRandomWhere(d, (c) => cnt[c.value] > 1, 2, 1, rng); } },
      2: { desc: "Vier zufällige Karten aus mehrfach vorkommenden Wertgruppen: dauerhaft +1 Kartenwert.", onPick: (d, rng) => { const cnt = valueCounts(d); return bumpRandomWhere(d, (c) => cnt[c.value] > 1, 4, 1, rng); } },
      3: { desc: "Alle Karten aus Wertgruppen mit ≥3 Vorkommen: dauerhaft +1 Kartenwert.", onPick: (d) => { const cnt = valueCounts(d); return bumpWhere(d, (c) => cnt[c.value] >= 3, 1); } },
      4: { desc: "Alle Karten aus mehrfach vorkommenden Wertgruppen: dauerhaft +1 Kartenwert.", onPick: (d) => { const cnt = valueCounts(d); return bumpWhere(d, (c) => cnt[c.value] >= 2, 1); } },
    },
  },
};

// ---- C · Rolle (Spec §3.2 C) — GEMISCHTE Upgrade-Typen: ROLE (Kartenrollen mit Ziel-Auswahl),
//      REPLACEMENT (C_SURVIVOR, kein Ziel) und CUMULATIVE (C_SACRIFICE, dauerhafte Deck-Mod).
//      Rollen speichern ihre Ziel-Karten in state.roles[familyId]; die cardBonus-Hooks lesen ctx.isRole(familyId).
//      Engine-gekoppelte Marker (relay/relayBonus, triumph, segmentLow, jokerRole/jokerMode, bridgeRole/bridgeSpan)
//      werden in Engine/formations familyTiers-bewusst ausgewertet (Kategorie-C-Wiring, Schritt 2). Ziel-Anzahl je
//      Stufe über pickTarget.cards; Upgrade behält bestehende Ziele, nur zusätzliche werden neu gewählt (§2.3).
//      Zusätzliche ctx-Felder (Schritt 2 in der Engine): secondLastResult (C_GUARD IV), segmentLowRank/segmentIndex
//      (C_SURVIVOR). Reine Daten/Hooks — additiv, bis Kategorie C in MIGRATED_CATS wandert.

// C_SACRIFICE: jede gewählte Karte −loss, ihr direkter Nachfolger (aus target.order = playerOrder) +gain, dauerhaft (>=0).
const sacrifice = (deck, target, loss, gain) => {
  const cards = (target && target.cards) || [];
  const order = target && target.order;
  if (!cards.length || !order) return deck;
  const succIds = new Set();
  for (const id of cards) {
    const idx = order.findIndex((di) => deck[di] && deck[di].id === id);
    if (idx >= 0 && idx + 1 < order.length) succIds.add(deck[order[idx + 1]].id);
  }
  return deck.map((c) => {
    let v = c.value;
    if (cards.includes(c.id)) v -= loss;
    if (succIds.has(c.id)) v += gain;
    return { ...c, value: Math.max(0, v) };
  });
};

const C_FAMILIES = {
  C_VANGUARD: {
    id: "C_VANGUARD", cat: "C", name: "Vorhut", upgradeType: ROLE,
    tiers: {
      1: { pickTarget: { cards: 1 }, cardBonus: (c) => (c.isRole && c.isRole("C_VANGUARD") && c.posInCycle <= 4 ? 2 : 0) },
      2: { pickTarget: { cards: 2 }, cardBonus: (c) => (c.isRole && c.isRole("C_VANGUARD") && c.posInCycle <= 4 ? 3 : 0) },
      3: { pickTarget: { cards: 3 }, cardBonus: (c) => (c.isRole && c.isRole("C_VANGUARD") && c.posInCycle <= 4 ? 4 : 0) },
      4: { pickTarget: { cards: 4 }, cardBonus: (c) => (c.isRole && c.isRole("C_VANGUARD") && c.posInCycle <= 9 ? 4 : 0) },
    },
  },
  C_TRIUMPH: {
    id: "C_TRIUMPH", cat: "C", name: "Triumph", upgradeType: ROLE,
    // triumph: nach einem Sieg der Rollenkarte wird sie armiert; beim nächsten Auftauchen +Bonus (ctx.triumphActive).
    tiers: {
      1: { pickTarget: { cards: 1 }, triumph: true, cardBonus: (c) => (c.triumphActive ? 2 : 0) },
      2: { pickTarget: { cards: 2 }, triumph: true, cardBonus: (c) => (c.triumphActive ? 2 : 0) },
      3: { pickTarget: { cards: 3 }, triumph: true, cardBonus: (c) => (c.triumphActive ? 3 : 0) },
      4: { pickTarget: { cards: 4 }, triumph: true, cardBonus: (c) => (c.triumphActive ? 4 : 0) },
    },
  },
  C_GUARD: {
    id: "C_GUARD", cat: "C", name: "Leibwache", upgradeType: ROLE,
    // I–III: verliert der direkte Vorgänger (lastResult="loss"). IV: verliert einer der ZWEI Vorgänger (secondLastResult).
    tiers: {
      1: { desc: "Wähle 1 Karte: verliert ihr Vorgänger, +3 Stichwert.",  pickTarget: { cards: 1 }, cardBonus: (c) => (c.isRole && c.isRole("C_GUARD") && c.lastResult === "loss" ? 3 : 0) },
      2: { desc: "Wähle 2 Karten: verliert ihr Vorgänger, +4 Stichwert.", pickTarget: { cards: 2 }, cardBonus: (c) => (c.isRole && c.isRole("C_GUARD") && c.lastResult === "loss" ? 4 : 0) },
      3: { desc: "Wähle 3 Karten: verliert ihr Vorgänger, +5 Stichwert.", pickTarget: { cards: 3 }, cardBonus: (c) => (c.isRole && c.isRole("C_GUARD") && c.lastResult === "loss" ? 5 : 0) },
      4: { desc: "Wähle 4 Karten: verliert einer ihrer zwei Vorgänger, +6 Stichwert.", pickTarget: { cards: 4 }, cardBonus: (c) => (c.isRole && c.isRole("C_GUARD") && (c.lastResult === "loss" || c.secondLastResult === "loss") ? 6 : 0) },
    },
  },
  C_RELAY: {
    id: "C_RELAY", cat: "C", name: "Staffelläufer", upgradeType: ROLE,
    // relay: nach einem Sieg der Rollenkarte erhalten die nächsten `relay` Karten je +relayBonus Wert (successorQueue).
    tiers: {
      1: { desc: "Wähle 1 Karte: nach ihrem Sieg direkter Nachfolger +2 Stichwert.",  pickTarget: { cards: 1 }, relay: 1, relayBonus: 2 },
      2: { desc: "Wähle 2 Karten: nach ihrem Sieg direkter Nachfolger +2 Stichwert.", pickTarget: { cards: 2 }, relay: 1, relayBonus: 2 },
      3: { desc: "Wähle 3 Karten: nach ihrem Sieg direkter Nachfolger +3 Stichwert.", pickTarget: { cards: 3 }, relay: 1, relayBonus: 3 },
      4: { desc: "Wähle 4 Karten: nach ihrem Sieg die nächsten zwei Karten je +3 Stichwert.", pickTarget: { cards: 4 }, relay: 2, relayBonus: 3 },
    },
  },
  C_LEADER: {
    id: "C_LEADER", cat: "C", name: "Anführer", upgradeType: ROLE,
    tiers: {
      1: { desc: "Wähle 1 Karte: nach ihrem Sieg nächste Karte +2 Stichwert.",  pickTarget: { cards: 1 }, relay: 1, relayBonus: 2 },
      2: { desc: "Wähle 1 Karte: nach ihrem Sieg die nächsten zwei Karten je +2 Stichwert.", pickTarget: { cards: 1 }, relay: 2, relayBonus: 2 },
      3: { desc: "Wähle 2 Karten: nach ihrem Sieg die nächsten zwei Karten je +3 Stichwert.", pickTarget: { cards: 2 }, relay: 2, relayBonus: 3 },
      4: { desc: "Wähle 2 Karten: nach ihrem Sieg die nächsten drei Karten je +4 Stichwert.", pickTarget: { cards: 2 }, relay: 3, relayBonus: 4 },
    },
  },
  C_FINISHER: {
    id: "C_FINISHER", cat: "C", name: "Finisher", upgradeType: ROLE,
    tiers: {
      1: { desc: "Wähle 1 Karte: auf der letzten Segmentposition +3 Stichwert.",  pickTarget: { cards: 1 }, cardBonus: (c) => (c.isRole && c.isRole("C_FINISHER") && c.posInCycle % 5 === 4 ? 3 : 0) },
      2: { desc: "Wähle 2 Karten: auf der letzten Segmentposition +4 Stichwert.", pickTarget: { cards: 2 }, cardBonus: (c) => (c.isRole && c.isRole("C_FINISHER") && c.posInCycle % 5 === 4 ? 4 : 0) },
      3: { desc: "Wähle 3 Karten: auf der letzten Segmentposition +5 Stichwert.", pickTarget: { cards: 3 }, cardBonus: (c) => (c.isRole && c.isRole("C_FINISHER") && c.posInCycle % 5 === 4 ? 5 : 0) },
      4: { desc: "Wähle 4 Karten: auf den letzten zwei Segmentpositionen +5 Stichwert.", pickTarget: { cards: 4 }, cardBonus: (c) => (c.isRole && c.isRole("C_FINISHER") && (c.posInCycle % 5 === 4 || c.posInCycle % 5 === 3) ? 5 : 0) },
    },
  },
  C_ECKPFEILER: {
    id: "C_ECKPFEILER", cat: "C", name: "Eckpfeiler", upgradeType: ROLE,
    // Belohnt AUFSTELLUNG: die Rollenkarte erhält ihren Bonus, solange sie in ≥1 Formation liegt (posForm.mult>1).
    // Distinct von B_TIGHT (alle Karten) und den E-Werkzeugen (nur Erkennung). IV-Kicker über die Überlappung
    // (≥2 gleichzeitige Formationen), analog zu den übrigen IV-Sonderregeln. Nutzt nur bestehende ctx-Felder.
    tiers: {
      1: { desc: "Wähle 1 Karte: liegt sie in ≥1 Formation, +3 Stichwert.",  pickTarget: { cards: 1 }, cardBonus: (c) => (c.isRole && c.isRole("C_ECKPFEILER") && inAnyFormation(c) ? 3 : 0) },
      2: { desc: "Wähle 2 Karten: in ≥1 Formation, +4 Stichwert.",           pickTarget: { cards: 2 }, cardBonus: (c) => (c.isRole && c.isRole("C_ECKPFEILER") && inAnyFormation(c) ? 4 : 0) },
      3: { desc: "Wähle 3 Karten: in ≥1 Formation, +5 Stichwert.",           pickTarget: { cards: 3 }, cardBonus: (c) => (c.isRole && c.isRole("C_ECKPFEILER") && inAnyFormation(c) ? 5 : 0) },
      4: { desc: "Wähle 4 Karten: in ≥1 Formation +6; liegt die Karte in ≥2 Formationen, +9 Stichwert.", pickTarget: { cards: 4 }, cardBonus: (c) => (c.isRole && c.isRole("C_ECKPFEILER") && inAnyFormation(c) ? ((c.posForm && (c.posForm.formations || []).length >= 2) ? 9 : 6) : 0) },
    },
  },
  C_ECKSTEIN: {
    id: "C_ECKSTEIN", cat: "C", name: "Eckstein", upgradeType: ROLE, needsArchitect: true,
    // Gebäude-Perk (Architekt): die Rollenkarte erhält ihren Bonus, solange sie IN einem Gebäude liegt
    // (ctx.underBuilding = Position vom Gebäude-Overlay abgedeckt). Pendant zu C_ECKPFEILER (Formation), nur
    // fürs Gebäude-Overlay. IV-Kicker, wenn die Position IN einer VOLLENDETEN Struktur liegt (Zeile/Spalte/Diagonale).
    tiers: {
      1: { desc: "Wähle 1 Karte: liegt sie in einem Gebäude, +3 Stichwert.",  pickTarget: { cards: 1 }, cardBonus: (c) => (c.isRole && c.isRole("C_ECKSTEIN") && c.underBuilding ? 3 : 0) },
      2: { desc: "Wähle 2 Karten: in einem Gebäude, +4 Stichwert.",           pickTarget: { cards: 2 }, cardBonus: (c) => (c.isRole && c.isRole("C_ECKSTEIN") && c.underBuilding ? 4 : 0) },
      3: { desc: "Wähle 3 Karten: in einem Gebäude, +5 Stichwert.",           pickTarget: { cards: 3 }, cardBonus: (c) => (c.isRole && c.isRole("C_ECKSTEIN") && c.underBuilding ? 5 : 0) },
      4: { desc: "Wähle 4 Karten: in einem Gebäude +6; in einer vollendeten Struktur +9 Stichwert.", pickTarget: { cards: 4 }, cardBonus: (c) => (c.isRole && c.isRole("C_ECKSTEIN") && c.underBuilding ? (c.underStructure ? 9 : 6) : 0) },
    },
  },
  C_SURVIVOR: {
    id: "C_SURVIVOR", cat: "C", name: "Überlebensvorteil", upgradeType: REPLACEMENT,
    // Kein Ziel. Engine liefert je Karte segmentLowRank (0=tiefste, 1=zweittiefste im Segment) + segmentIndex.
    // §10-Default: „vier zufällige Segmente" (I) → deterministisch die ersten vier Segmente (Pos 1–20), damit kein
    // per-Run-Zufallszustand nötig ist; II+ deckt alle Segmente ab. `segmentLow`-Marker triggert das Engine-Gate.
    tiers: {
      1: { desc: "Die niedrigste Karte der ersten vier Segmente: +2 Stichwert.", segmentLow: true, cardBonus: (c) => (c.segmentIndex < 4 && c.segmentLowRank === 0 ? 2 : 0) },
      2: { desc: "Die niedrigste Karte jedes Segments: +2 Stichwert.",           segmentLow: true, cardBonus: (c) => (c.segmentLowRank === 0 ? 2 : 0) },
      3: { desc: "Die zwei niedrigsten Karten jedes Segments: +3 Stichwert.",  segmentLow: true, cardBonus: (c) => (c.segmentLowRank <= 1 ? 3 : 0) },
      4: { desc: "Die zwei niedrigsten Karten jedes Segments: +5 Stichwert.",  segmentLow: true, cardBonus: (c) => (c.segmentLowRank <= 1 ? 5 : 0) },
    },
  },
  C_JOKER: {
    id: "C_JOKER", cat: "C", name: "Joker", upgradeType: ROLE,
    // jokerRole: die Rollenkarte darf für einen Farbblock eine andere Farbe annehmen. jokerMode je Stufe:
    // "pred" = Vorgängerfarbe (I/II), "predOrSucc" = Vorgänger- ODER Nachfolgerfarbe (III), "free" = beliebig (IV).
    // Auswertung in computeFormations (familyTiers-bewusst, Schritt 2).
    tiers: {
      1: { desc: "Wähle 1 Karte: zählt für einen Farbblock als Farbe ihres Vorgängers.",  pickTarget: { cards: 1 }, jokerRole: true, jokerMode: "pred" },
      2: { desc: "Wähle 2 Karten: zählen für einen Farbblock als Farbe ihres Vorgängers.", pickTarget: { cards: 2 }, jokerRole: true, jokerMode: "pred" },
      3: { desc: "Wähle 3 Karten: zählen für einen Farbblock als Vorgänger- oder Nachfolgerfarbe.", pickTarget: { cards: 3 }, jokerRole: true, jokerMode: "predOrSucc" },
      4: { desc: "Wähle 4 Karten: zählen für einen Farbblock als beliebige Farbe.", pickTarget: { cards: 4 }, jokerRole: true, jokerMode: "free" },
    },
  },
  C_SACRIFICE: {
    id: "C_SACRIFICE", cat: "C", name: "Opfergabe", upgradeType: CUMULATIVE,
    // Kumulativer Pick-Effekt: je gewählter Karte −loss Wert, ihr direkter Nachfolger (in playerOrder) +gain — dauerhaft.
    // onPick(deck, rng, target) mit target={cards, order} (order = playerOrder, aus dem Reducer). Frühere Opfer bleiben.
    tiers: {
      1: { desc: "Wähle 1 Karte: −2 Kartenwert dauerhaft, direkter Nachfolger +3 Kartenwert.", pickTarget: { cards: 1 }, onPick: (d, _rng, t) => sacrifice(d, t, 2, 3) },
      2: { desc: "Wähle 1 Karte: −2 Kartenwert dauerhaft, direkter Nachfolger +4 Kartenwert.", pickTarget: { cards: 1 }, onPick: (d, _rng, t) => sacrifice(d, t, 2, 4) },
      3: { desc: "Wähle 1 Karte: −3 Kartenwert dauerhaft, direkter Nachfolger +6 Kartenwert.", pickTarget: { cards: 1 }, onPick: (d, _rng, t) => sacrifice(d, t, 3, 6) },
      4: { desc: "Wähle 2 Karten: je −3 Kartenwert dauerhaft, direkter Nachfolger je +7 Kartenwert.", pickTarget: { cards: 2 }, onPick: (d, _rng, t) => sacrifice(d, t, 3, 7) },
    },
  },
  C_BRIDGE: {
    id: "C_BRIDGE", cat: "C", name: "Bindeglied", upgradeType: ROLE,
    // bridgeRole: die Rollenkarte darf für eine Treppe abweichen. bridgeSpan je Stufe: 1 (±1, I/II), 2 (±2, III),
    // 99 (frei zwischen den Nachbarn, IV). Auswertung in computeFormations (familyTiers-bewusst, Schritt 2).
    tiers: {
      1: { desc: "Wähle 1 Karte: darf für eine Treppe ±1 Wert gelten.",  pickTarget: { cards: 1 }, bridgeRole: true, bridgeSpan: 1 },
      2: { desc: "Wähle 2 Karten: dürfen für eine Treppe ±1 Wert gelten.", pickTarget: { cards: 2 }, bridgeRole: true, bridgeSpan: 1 },
      3: { desc: "Wähle 3 Karten: dürfen für eine Treppe um 1 oder 2 abweichen.",           pickTarget: { cards: 3 }, bridgeRole: true, bridgeSpan: 2 },
      4: { desc: "Wähle 4 Karten: dürfen für eine Treppe jeden Wert zwischen ihren Nachbarn annehmen.", pickTarget: { cards: 4 }, bridgeRole: true, bridgeSpan: 99 },
    },
  },
};

// ---- E · Form (Spec §3.2 E) — Formationswerkzeuge, allesamt REGELERSETZUNG (nur die höchste Stufe aktiv).
//      Reine Erkennungsregeln: kein per-Stich/-Sieg-Hook, sondern PARAMETER, die computeFormations je gehaltener
//      E-Familie ausliest (familyTiers-bewusst, Schritt 2 — analog jokerRole/bridgeRole). Marker je Stufe:
//        gapRun/gapSeg  → erlaubte fremde Karten je Lauf / je Segment (E_PACE Wiederholung, E_COLORBRIDGE Farbblock)
//        eqRun/eqSeg    → erlaubte Gleichstände in Treppen (E_GENTLE); revRun/revSeg → Rückschritte (E_BIGSTEP)
//        wMinLen/wMinDiff/wFactorStart → Wechsel-Schwellen/-Faktor (E_PENDULUM)
//        drehSeg        → Karten, die je Segment zu zwei Treppen zählen dürfen (E_RPM)
//        anchor {at(pos,n),factor,value} → Anker-Positionen/-Faktor/+Wert (E_LOSS, E_QUICKSHOT)
//        openBoundaries → Anzahl offener Segmentgrenzen (E_SEGMENT; Infinity = alle)
//      §10-Näherungen (der paarweise/laufbasierte Scanner kann einige IV-Sonderregeln nicht exakt abbilden):
//        E_GENTLE IV „gleich = +1 Schritt" ≈ unbegrenzte Gleichstände; E_BIGSTEP IV „Richtung einmal wechseln"
//        ≈ unbegrenzte Rückschritte; E_SEGMENT I/II öffnen
//        die ersten 1/2 Grenzen deterministisch (statt Auswahl → kein zusätzlicher Ziel-Fluss), III/IV alle.
const INF = Infinity;
const ANKER = 1.25; // Standard-Anker-Faktor (= ANCHOR_FORM_FACTOR/ANKER_FACTOR in constants/formations); IV hebt auf 1,35.
const E_FAMILIES = {
  E_PACE: {
    id: "E_PACE", cat: "E", name: "Schrittmacher", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Einmal pro Segment darf eine Wiederholung eine fremde Karte überbrücken.", gapRun: 1, gapSeg: 1 },
      2: { desc: "Jede Wiederholung darf eine fremde Karte überbrücken.",                      gapRun: 1, gapSeg: INF },
      3: { desc: "Jede Wiederholung darf bis zu zwei fremde Karten überbrücken.",              gapRun: 2, gapSeg: INF },
      4: { desc: "Fremde Karten unterbrechen Wiederholungen nicht (zählen nicht mit).",   gapRun: INF, gapSeg: INF },
    },
  },
  E_COLORBRIDGE: {
    id: "E_COLORBRIDGE", cat: "E", name: "Farbbrücke", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Einmal pro Segment darf ein Farbblock eine Fremdfarbe überbrücken.", suitGapRun: 1, suitGapSeg: 1 },
      2: { desc: "Jeder Farbblock darf eine Fremdfarbe enthalten.",                    suitGapRun: 1, suitGapSeg: INF },
      3: { desc: "Jeder Farbblock darf zwei Fremdfarben enthalten.",                   suitGapRun: 2, suitGapSeg: INF },
      4: { desc: "Fremdfarben unterbrechen Farbblöcke nicht (zählen nicht mit).", suitGapRun: INF, suitGapSeg: INF },
    },
  },
  E_GENTLE: {
    id: "E_GENTLE", cat: "E", name: "Sanfter Anstieg", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Einmal pro Segment darf eine Treppe einen Gleichstand enthalten.", eqRun: 1, eqSeg: 1 },
      2: { desc: "Jede Treppe darf einen Gleichstand enthalten.",                     eqRun: 1, eqSeg: INF },
      3: { desc: "Jede Treppe darf zwei Gleichstände enthalten.",                     eqRun: 2, eqSeg: INF },
      4: { desc: "Gleiche Werte gelten in Treppen als ein Schritt, wenn nötig.",      eqRun: INF, eqSeg: INF },
    },
  },
  E_BIGSTEP: {
    id: "E_BIGSTEP", cat: "E", name: "Großer Schritt", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Einmal pro Segment darf eine Treppe einen Rückschritt enthalten.", revRun: 1, revSeg: 1 },
      2: { desc: "Jede Treppe darf einen Rückschritt enthalten.",                     revRun: 1, revSeg: INF },
      3: { desc: "Jede Treppe darf zwei Rückschritte enthalten.",                     revRun: 2, revSeg: INF },
      4: { desc: "Treppen dürfen die Richtung wechseln.",                             revRun: INF, revSeg: INF },
    },
  },
  E_PENDULUM: {
    id: "E_PENDULUM", cat: "E", name: "Pendelwerk", upgradeType: REPLACEMENT,
    // #285: „von → nach" gegenüber dem Standard-Wechsel (ab 3 Karten, Differenz ≥4) → die Erleichterung ist sofort sichtbar.
    tiers: {
      1: { desc: "Für einen Wechsel genügt eine Nachbardifferenz von 3 (statt 4); weiterhin ab 3 Karten.",                 wMinLen: 3, wMinDiff: 3 },
      2: { desc: "Ein Wechsel braucht nur noch 2 Karten (Nachbardifferenz weiterhin ≥4).",                             wMinLen: 2, wMinDiff: 4 },
      3: { desc: "Ein Wechsel braucht nur noch 2 Karten, und eine Nachbardifferenz von 3 genügt.",                        wMinLen: 2, wMinDiff: 3 },
      4: { desc: "Ein Wechsel braucht nur noch 2 Karten, und eine Nachbardifferenz von 2 genügt; Zweier-Wechsel zählen ab ×1,35.",  wMinLen: 2, wMinDiff: 2, wFactorStart: 1.35 },
    },
  },
  E_RPM: {
    id: "E_RPM", cat: "E", name: "Drehzahl", upgradeType: REPLACEMENT,
    // #189: monotoner Stufen-Ladder auf EINER Achse (Doppel-Treppen je Segment). Zuvor trugen I und II beide
    // drehSeg:1 (mechanisch identisch), II versprach im Text aber „je Treppe" mehr → jetzt 1/2/3/∞ pro Segment.
    tiers: {
      1: { desc: "Einmal pro Segment darf eine Karte zu zwei Treppen gehören.",   drehSeg: 1 },
      2: { desc: "Bis zu zwei Karten pro Segment dürfen zu zwei Treppen gehören.", drehSeg: 2 },
      3: { desc: "Bis zu drei Karten pro Segment dürfen zu zwei Treppen gehören.", drehSeg: 3 },
      4: { desc: "Jede Karte darf gleichzeitig zu zwei Treppen gehören.",          drehSeg: INF },
    },
  },
  E_LOSS: {
    id: "E_LOSS", cat: "E", name: "Kontrollverlust", upgradeType: REPLACEMENT,
    // Anker auf „geraden" Positionen (10er-Raster). III/IV: jede Segment-Endposition; IV zusätzlich ×1,35.
    tiers: {
      1: { desc: "Positionen 20 und 40 zählen als Anker (×1,25).",       anchor: { at: (p) => (p + 1) % 20 === 0, factor: ANKER, value: 0 } },
      2: { desc: "Positionen 10, 20, 30 und 40 zählen als Anker (×1,25).",                          anchor: { at: (p) => (p + 1) % 10 === 0, factor: ANKER, value: 0 } },
      3: { desc: "Jede Segment-Endposition zählt als Anker (×1,25).",                               anchor: { at: (p) => (p + 1) % 5 === 0, factor: ANKER, value: 0 } },
      4: { desc: "Jede Segment-Endposition zählt als Anker (×1,35).",                         anchor: { at: (p) => (p + 1) % 5 === 0, factor: 1.35, value: 0 } },
    },
  },
  E_QUICKSHOT: {
    id: "E_QUICKSHOT", cat: "E", name: "Schnellschuss", upgradeType: REPLACEMENT,
    // Anker auf „ungeraden" Positionen (5er-Versatz). IV: jede fünfte Position ×1,35 und +2 Wert.
    tiers: {
      1: { desc: "Positionen 5 und 25 zählen als Anker (×1,25).", anchor: { at: (p) => (p - 4) % 20 === 0, factor: ANKER, value: 0 } },
      2: { desc: "Positionen 5, 15, 25 und 35 zählen als Anker (×1,25).",                    anchor: { at: (p) => (p - 4) % 10 === 0, factor: ANKER, value: 0 } },
      3: { desc: "Jede fünfte Position (5, 10 … 40) zählt als Anker (×1,25).",              anchor: { at: (p) => (p + 1) % 5 === 0, factor: ANKER, value: 0 } },
      4: { desc: "Jede fünfte Position zählt als Anker (×1,35) und erhält +2 Stichwert.",   anchor: { at: (p) => (p + 1) % 5 === 0, factor: 1.35, value: 2 } },
    },
  },
  E_SEGMENT: {
    id: "E_SEGMENT", cat: "E", name: "Segmentarbeit", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Eine Segmentgrenze ist offen; Formationen dürfen sie überschreiten.", openBoundaries: 1 },
      2: { desc: "Zwei Segmentgrenzen sind offen.",                                      openBoundaries: 2 },
      3: { desc: "Alle Segmentgrenzen sind offen.",                                      openBoundaries: INF },
      // #179: IV war zuvor mechanisch identisch zu III (beide „alle Grenzen offen"). Jetzt eigener Effekt (Grenz-Bonus):
      // Karten in einer Formation, die eine (frühere) Segmentgrenze überschreitet, geben zusätzlich ×1,25 Score.
      4: { desc: "Alle Segmentgrenzen sind offen; Karten einer segmentüberschreitenden Formation geben zusätzlich ×1,25 Score.", openBoundaries: INF, crossBonus: 1.25 },
    },
  },
  // ---- Aus dem Shop migrierte Formations-Familien (#179): ehemals Shop-Kategorie „Formationen" (SHOP_FORMATION_FAMILIES).
  //      Identität = reine Formations-Erkennungsregeln → gehören zu den Perks (Kat. E). REGELERSETZUNG. Die Effekt-Parameter
  //      der GEHALTENEN Stufe liest computeFormations (familyTierParam), analog zu den übrigen E-Werkzeugen; kein
  //      shop.permanentEffects-Pfad mehr. Nutzer-Entscheid #179: die 3 Duplikate (Offene Grenze/Enger Wechsel/Abstieg)
  //      entfielen ersatzlos, da E_SEGMENT/E_PENDULUM/E_BIGSTEP sie abdecken. ----
  E_STRONG_REP: {
    id: "E_STRONG_REP", cat: "E", name: "Verstärkte Wiederholung", upgradeType: REPLACEMENT,
    // repSecond = Bonus auf die 2. Karte, repThird = Bonus auf die 3. Karte, repAllMult = Faktor auf ALLE Wiederholungsfaktoren.
    tiers: {
      1: { desc: "Zweite Karte einer Wiederholung: ×1,30 (statt ×1,25).", repSecond: 0.05, repThird: 0, repAllMult: 1 },
      2: { desc: "Zweite Karte einer Wiederholung: ×1,35.",               repSecond: 0.10, repThird: 0, repAllMult: 1 },
      3: { desc: "Zweite und dritte Wiederholungskarte: je +0,10 auf ihren Formations-Faktor.",  repSecond: 0.10, repThird: 0.10, repAllMult: 1 },
      4: { desc: "Alle Wiederholungsfaktoren: zusätzlich ×1,20.",           repSecond: 0.10, repThird: 0.10, repAllMult: 1.20 },
    },
  },
  E_AFTERGLOW: {
    id: "E_AFTERGLOW", cat: "E", name: "Nachhall", upgradeType: REPLACEMENT,
    // afterglow = aktiv; afterglowMaxFactor kappt (null = kein Cap); afterglowRepsOnly = nur Wiederholungen; afterglowHold = Karten.
    tiers: {
      1: { desc: "Der Formations-Faktor deiner Wiederholung überträgt sich auf die nächste Karte (höchstens ×1,20), auch wenn sie selbst nicht Teil der Formation ist.", afterglow: true, afterglowMaxFactor: 1.20, afterglowRepsOnly: true,  afterglowHold: 1 },
      2: { desc: "Wirkt bei allen Formationen; Faktor höchstens ×1,25.",                    afterglow: true, afterglowMaxFactor: 1.25, afterglowRepsOnly: false, afterglowHold: 1 },
      3: { desc: "Übernimmt den stärksten Einzelfaktor vollständig.",                 afterglow: true, afterglowMaxFactor: null, afterglowRepsOnly: false, afterglowHold: 1 },
      4: { desc: "Übernimmt den stärksten Einzelfaktor und hält für die nächsten zwei Karten.", afterglow: true, afterglowMaxFactor: null, afterglowRepsOnly: false, afterglowHold: 2 },
    },
  },
  E_COLOR_ALLIANCE: {
    id: "E_COLOR_ALLIANCE", cat: "E", name: "Farballianz", upgradeType: REPLACEMENT,
    // Farb-Ziel (pickTarget.suits): die gewählten Farben werden in roles["E_COLOR_ALLIANCE"] persistiert und über
    // allianceGroups zu Gruppen aufgelöst. Wirkbereich (#289): Farbblock-Formationen, Buntglas/Zunfthaus, Farbserie/
    // Monochrom, Farbfokus — alle über colorsAllied/colorMatches. AUSNAHME: die Pick-Zeit-Deck-Perks Farbverstärkung/
    // Farbduell (onPick) editieren das Deck dauerhaft und kennen die Allianz NICHT (nur rohe/grüne Farbe).
    // #292: III = alle 4 als EINE Farbe (normaler Farbblock). IV = ebenfalls alle 4 als eine + `farbblockBonus`
    // (Farbblock-Startfaktor +0,20, in formations.js gestapelt) → IV ist eindeutig stärker als III (früher „zwei
    // Paare", was mechanisch SCHWÄCHER war: kürzere Blöcke, oft unter der ≥3-Schwelle). Kickt auch Pflanze (grün→Farbblock).
    // #195: monotone Leiter auf EINER Achse (Breite der Allianz) — I und II trugen zuvor beide suits:2 (mechanisch
    // identische Phantom-Stufe, wie E_RPM/E_SEGMENT/B_INITIATIVE). Jetzt 2 → 3 → 4 (alle als eine) → 4 (zwei Allianzen).
    tiers: {
      1: { desc: "Wähle 2 Farben: sie zählen in allen Farb-Wertungen als dieselbe Farbe, außer bei Farbverstärkung/Farbduell.", pickTarget: { suits: 2 } },
      2: { desc: "Wähle 3 Farben: sie zählen in allen Farb-Wertungen als dieselbe Farbe, außer bei Farbverstärkung/Farbduell.", pickTarget: { suits: 3 } },
      3: { desc: "Alle vier zählen in allen Farb-Wertungen als dieselbe Farbe, außer bei Farbverstärkung/Farbduell.", pickTarget: { suits: 4 } },
      4: { desc: "Alle vier zählen als dieselbe Farbe, Farbblöcke starten bei ×1,55 (statt ×1,35), außer bei Farbverstärkung/Farbduell.", pickTarget: { suits: 4 }, farbblockBonus: 0.20 },
    },
  },
  E_CORE: {
    id: "E_CORE", cat: "E", name: "Formationskern", upgradeType: REPLACEMENT,
    // Formationstyp-Ziel (pickTarget.formationType): der gewählte Typ wird in roles["E_CORE"] persistiert; jede Position,
    // die Teil einer aktiven Formation dieses Typs (inkl. Nachhall) ist, erhält zusätzlich ×coreFactor.
    tiers: {
      1: { desc: "Wähle 1 Formationstyp: seine aktiven Formationen zusätzlich ×1,15.", pickTarget: { formationType: true }, coreFactor: 1.15 },
      2: { desc: "Wähle 1 Formationstyp: seine aktiven Formationen zusätzlich ×1,25.", pickTarget: { formationType: true }, coreFactor: 1.25 },
      3: { desc: "Wähle 1 Formationstyp: seine aktiven Formationen zusätzlich ×1,40.", pickTarget: { formationType: true }, coreFactor: 1.40 },
      4: { desc: "Wähle 1 Formationstyp: seine aktiven Formationen zusätzlich ×1,50 (inkl. Nachhall).", pickTarget: { formationType: true }, coreFactor: 1.50 },
    },
  },
  E_TUNING: {
    id: "E_TUNING", cat: "E", name: "Feinjustierung", upgradeType: REPLACEMENT,
    // Kein Erkennungs-Effekt: liefert Formationsenergie für die Formationsphase (formationEnergyBonus). everySecond (I §10)
    // ≈ nur jede zweite Formationsphase über die Durchlauf-Parität. Ehemals Perk E10 / Shop-Feinjustierung (#179).
    tiers: {
      1: { energyBonus: 1, everySecond: true },
      2: { energyBonus: 1 },
      3: { energyBonus: 2 },
      4: { energyBonus: 3 },
    },
  },
};

// ---- P · Präzision (#267 Teil 2) — Crit-Chance/-Mult als RNG-gegatete Perk-Familien (Ersatz für den entfernten
//      Crit-Stat). Basis-Crit 0. Allesamt REGELERSETZUNG (nur die höchste gehaltene Stufe aktiv). KEIN Legendär.
//      Hooks (von der Engine in der Crit-Aggregation je Stich gelesen):
//        critChance(ctx) → +Roh-Crit-Chance (ungeklemmt, additiv zu Perk-/Blitz-Crit)
//        critMult()      → +Crit-Multiplikator (auf Basis 1,5)
//      Karten-Kontext ctx: { winValue, suit, formCount, focusSuits } (Kartenwert / Kartenfarbe / #aktive Formationen
//      an der Siegposition / gewählte Farben bei Farbfokus). Zwei gerade Motoren (Schärfe/Wucht) + drei konditionale
//      Generatoren (Zielsicherheit/Brennglas/Farbfokus). pp/×-Werte + Skalen aus den Konstanten (drift-frei). ----
const ppP = (x) => Math.round(x * 100);            // pp als ganze Zahl
const deP = (x) => String(x).replace(".", ",");    // deutsche Dezimalschreibweise
const cSc = (x) => x * C.PRECISION_CHANCE_SCALE;   // Crit-Chance-Skala
const mSc = (x) => x * C.PRECISION_MULT_SCALE;     // Crit-Mult-Skala
const P_FAMILIES = {
  P_SHARPNESS: {
    id: "P_SHARPNESS", cat: "P", name: "Schärfe", upgradeType: REPLACEMENT,
    // Grund-Crit-Motor (Stat-Ersatz): flat +Crit-Chance auf ALLE Karten.
    tiers: {
      1: { desc: `Alle Karten: +${ppP(C.PRECISION_SHARP_PP[0])} % Crit-Chance.`, critChance: () => cSc(C.PRECISION_SHARP_PP[0]) },
      2: { desc: `Alle Karten: +${ppP(C.PRECISION_SHARP_PP[1])} % Crit-Chance.`, critChance: () => cSc(C.PRECISION_SHARP_PP[1]) },
      3: { desc: `Alle Karten: +${ppP(C.PRECISION_SHARP_PP[2])} % Crit-Chance.`, critChance: () => cSc(C.PRECISION_SHARP_PP[2]) },
      4: { desc: `Alle Karten: +${ppP(C.PRECISION_SHARP_PP[3])} % Crit-Chance.`, critChance: () => cSc(C.PRECISION_SHARP_PP[3]) },
    },
  },
  P_FORCE: {
    id: "P_FORCE", cat: "P", name: "Wucht", upgradeType: REPLACEMENT,
    // Mult-Stat-Ersatz: +Crit-Multiplikator auf Basis 1,5.
    tiers: {
      1: { desc: `+${deP(C.PRECISION_FORCE_MULT[0])}× Crit-Multiplikator (auf Basis ${deP(C.CRIT_BASE_MULT)}×).`, critMult: () => mSc(C.PRECISION_FORCE_MULT[0]) },
      2: { desc: `+${deP(C.PRECISION_FORCE_MULT[1])}× Crit-Multiplikator (auf Basis ${deP(C.CRIT_BASE_MULT)}×).`, critMult: () => mSc(C.PRECISION_FORCE_MULT[1]) },
      3: { desc: `+${deP(C.PRECISION_FORCE_MULT[2])}× Crit-Multiplikator (auf Basis ${deP(C.CRIT_BASE_MULT)}×).`, critMult: () => mSc(C.PRECISION_FORCE_MULT[2]) },
      4: { desc: `+${deP(C.PRECISION_FORCE_MULT[3])}× Crit-Multiplikator (auf Basis ${deP(C.CRIT_BASE_MULT)}×).`, critMult: () => mSc(C.PRECISION_FORCE_MULT[3]) },
    },
  },
  P_AIM: {
    id: "P_AIM", cat: "P", name: "Zielsicherheit", upgradeType: REPLACEMENT,
    // Konditional (Hochwert-/Überlegenheits-Builds): +Crit-Chance nur auf hohe Karten; die Schwelle weitet sich je Stufe.
    tiers: {
      1: { desc: `Karten mit Wert ≥ ${C.PRECISION_AIM_THRESH[0]}: +${ppP(C.PRECISION_AIM_PP)} % Crit-Chance.`, critChance: (c) => ((c.winValue || 0) >= C.PRECISION_AIM_THRESH[0] ? cSc(C.PRECISION_AIM_PP) : 0) },
      2: { desc: `Karten mit Wert ≥ ${C.PRECISION_AIM_THRESH[1]}: +${ppP(C.PRECISION_AIM_PP)} % Crit-Chance.`, critChance: (c) => ((c.winValue || 0) >= C.PRECISION_AIM_THRESH[1] ? cSc(C.PRECISION_AIM_PP) : 0) },
      3: { desc: `Karten mit Wert ≥ ${C.PRECISION_AIM_THRESH[2]}: +${ppP(C.PRECISION_AIM_PP)} % Crit-Chance.`, critChance: (c) => ((c.winValue || 0) >= C.PRECISION_AIM_THRESH[2] ? cSc(C.PRECISION_AIM_PP) : 0) },
      4: { desc: `Karten mit Wert ≥ ${C.PRECISION_AIM_THRESH[3]}: +${ppP(C.PRECISION_AIM_PP)} % Crit-Chance.`, critChance: (c) => ((c.winValue || 0) >= C.PRECISION_AIM_THRESH[3] ? cSc(C.PRECISION_AIM_PP) : 0) },
    },
  },
  P_LENS: {
    id: "P_LENS", cat: "P", name: "Brennglas", upgradeType: REPLACEMENT,
    // Konditional (Formations-Overlap · Variante B): +Crit-Chance JE Formation ab der 2. an der Siegposition, Cap +3
    // Extra-Formationen. Belohnt Tiefe (der Chase), nicht bloße Präsenz. formCount = #aktive Formationen der Siegposition.
    tiers: {
      1: { desc: `+${ppP(C.PRECISION_LENS_PP[0])} % Crit-Chance je gleichzeitiger Formation ab der zweiten an der Siegposition (max ${C.PRECISION_LENS_CAP} extra).`, critChance: (c) => cSc(C.PRECISION_LENS_PP[0] * Math.min(Math.max((c.formCount || 0) - 1, 0), C.PRECISION_LENS_CAP)) },
      2: { desc: `+${ppP(C.PRECISION_LENS_PP[1])} % Crit-Chance je gleichzeitiger Formation ab der zweiten an der Siegposition (max ${C.PRECISION_LENS_CAP} extra).`, critChance: (c) => cSc(C.PRECISION_LENS_PP[1] * Math.min(Math.max((c.formCount || 0) - 1, 0), C.PRECISION_LENS_CAP)) },
      3: { desc: `+${ppP(C.PRECISION_LENS_PP[2])} % Crit-Chance je gleichzeitiger Formation ab der zweiten an der Siegposition (max ${C.PRECISION_LENS_CAP} extra).`, critChance: (c) => cSc(C.PRECISION_LENS_PP[2] * Math.min(Math.max((c.formCount || 0) - 1, 0), C.PRECISION_LENS_CAP)) },
      4: { desc: `+${ppP(C.PRECISION_LENS_PP[3])} % Crit-Chance je gleichzeitiger Formation ab der zweiten an der Siegposition (max ${C.PRECISION_LENS_CAP} extra).`, critChance: (c) => cSc(C.PRECISION_LENS_PP[3] * Math.min(Math.max((c.formCount || 0) - 1, 0), C.PRECISION_LENS_CAP)) },
    },
  },
  P_COLORFOCUS: {
    id: "P_COLORFOCUS", cat: "P", name: "Farbfokus", upgradeType: REPLACEMENT,
    // Konditional (Farbblock / Pflanze-Grün): Farbe(n) wählen → +Crit-Chance nur auf Karten dieser Farbe. IV-Twist:
    // statt höherer pp eine ZWEITE wählbare Farbe (beide auf Stufe-III-Wert). Ziel-Fluss über pickTarget.suits
    // (REPLACEMENT mit Ziel → applyFamilyPick persistiert roles["P_COLORFOCUS"]); die Engine gibt focusSuits durch.
    tiers: {
      1: { desc: `Wähle eine Farbe: Karten dieser Farbe +${ppP(C.PRECISION_COLOR_PP[0])} % Crit-Chance.`, pickTarget: { suits: 1 }, critChance: (c) => ((c.focusSuits || []).some((fs) => colorsAllied(c.suit, fs, c.alliance)) ? cSc(C.PRECISION_COLOR_PP[0]) : 0) },
      2: { desc: `Wähle eine Farbe: Karten dieser Farbe +${ppP(C.PRECISION_COLOR_PP[1])} % Crit-Chance.`, pickTarget: { suits: 1 }, critChance: (c) => ((c.focusSuits || []).some((fs) => colorsAllied(c.suit, fs, c.alliance)) ? cSc(C.PRECISION_COLOR_PP[1]) : 0) },
      3: { desc: `Wähle eine Farbe: Karten dieser Farbe +${ppP(C.PRECISION_COLOR_PP[2])} % Crit-Chance.`, pickTarget: { suits: 1 }, critChance: (c) => ((c.focusSuits || []).some((fs) => colorsAllied(c.suit, fs, c.alliance)) ? cSc(C.PRECISION_COLOR_PP[2]) : 0) },
      4: { desc: `Wähle ZWEI Farben: Karten dieser Farben je +${ppP(C.PRECISION_COLOR_PP[3])} % Crit-Chance.`, pickTarget: { suits: 2 }, critChance: (c) => ((c.focusSuits || []).some((fs) => colorsAllied(c.suit, fs, c.alliance)) ? cSc(C.PRECISION_COLOR_PP[3]) : 0) },
    },
  },
};

/* ---- Muster-Beschreibungen (Text-Vereinfachung): 20 Familien teilen je EINEN Satz. Statt viermal fast
   identischer desc-Strings steht der Satz hier einmal als Template ($0,$1… = Werte je Stufe); die vier
   Stufen-descs werden nach dem Zusammenbau von FAMILY_DEFS erzeugt (applyMusterDescs). Die Effekt-Hooks der
   Stufen bleiben unberührt — nur die Anzeige-Texte kommen aus dieser einen Quelle. ---- */
const MUSTER_DESC = {
  A_WEAK_STRONG: { tpl: "Alle ursprünglichen $0: dauerhaft +$1 Kartenwert.", vals: [["5er","1"],["4er","2"],["3er","3"],["1er und 2er","4"]] },
  A_HIGH_STRONG: { tpl: "Alle ursprünglichen $0: dauerhaft +$1 Kartenwert.", vals: [["6er","1"],["7er","2"],["8er","3"],["9er und 10er","4"]] },
  A_TOP: { tpl: "Die $0 aktuell höchsten Karten: dauerhaft je +$1 Kartenwert.", vals: [["zwei","2"],["drei","3"],["vier","4"],["fünf","5"]] },
  A_BOTTOM: { tpl: "Die $0 aktuell niedrigsten Karten: dauerhaft je +$1 Kartenwert.", vals: [["zwei","3"],["drei","4"],["vier","5"],["fünf","6"]] },
  B_COUNTER: { tpl: "Nach einer Niederlage: nächste Karte +$0 Stichwert.", vals: [["3"],["5"],["7"],["10"]] },
  B_MOMENTUM: { tpl: "Nach genau $0 Siegen in Folge: nächste Karte +$1 Stichwert.", vals: [["4","4"],["3","5"],["3","7"],["3","10"]] },
  B_OPENING: { tpl: "Die ersten $0 Karten jedes Durchlaufs: je +$1 Stichwert.", vals: [["2","2"],["3","3"],["4","4"],["5","5"]] },
  B_FINALE: { tpl: "Die letzten $0 Karten jedes Durchlaufs: je +$1 Stichwert.", vals: [["2","2"],["3","3"],["4","4"],["5","5"]] },
  B_BREAKTHROUGH: { tpl: "Nach $0 Stichen ohne Sieg: nächste Karte +$1 Stichwert.", vals: [["6","7"],["5","10"],["4","12"],["3","15"]] },
  C_VANGUARD: { tpl: "Wähle $0: auf Position $1 +$2 Stichwert.", vals: [["1 Karte","1–5","2"],["2 Karten","1–5","3"],["3 Karten","1–5","4"],["4 Karten","1–10","4"]] },
  C_TRIUMPH: { tpl: "Wähle $0: nach einem Sieg beim nächsten Auftauchen +$1 Stichwert.", vals: [["1 Karte","2"],["2 Karten","2"],["3 Karten","3"],["4 Karten","4"]] },
  D_FORMATION_BONUS: { tpl: "Sieg mit ≥1 aktiver Formation: +$0 Score.", vals: [["50"],["100"],["175"],["300"]] },
  D_STREAK: { tpl: "Jeder Sieg: +$0 Score je Serienpunkt (max +$1).", vals: [["15","150"],["25","250"],["35","420"],["50","750"]] },
  D_HIGH: { tpl: "Sieg mit Kartenwert ≥$0: +$1 Score.", vals: [["9","100"],["8","150"],["7","225"],["6","350"]] },
  D_UNDERDOG: { tpl: "Sieg mit Kartenwert ≤$0: +$1 Score.", vals: [["2","250"],["3","350"],["4","500"],["5","750"]] },
  D_TENTH_WIN: { tpl: "Jeder $0. Sieg des Laufs: +$1 Score.", vals: [["12","600"],["10","800"],["8","900"],["5","1.000"]] },
  D_CRIT_SCORE: { tpl: "Jeder Crit: +$0 Score.", vals: [["100"],["175"],["275"],["450"]] },
  D_SHARP_EYE: { tpl: "Crit mit Kartenwert ≥$0: +$1 Score.", vals: [["9","225"],["8","350"],["7","500"],["6","750"]] },
  D_RHYTHM: { tpl: "Im Takt: jeder $0. Sieg gibt +$1 Score.", vals: [["7","250"],["5","350"],["4","450"],["3","600"]] },
  D_OVERPOWER: { tpl: "Sieg mit ≥$0 Kampfwert-Vorsprung: +$1 Score.", vals: [["10","300"],["8","400"],["6","550"],["4","750"]] },
  D_CRIT_HARVEST: { tpl: "Crit in ≥1 aktiver Formation: +$0 Score.", vals: [["175"],["300"],["475"],["750"]] },
  // Sprachprüfung: „Aufstellungsphase" ist der EINE Name der Phase (so auch im Glossar) — „Formationsphase"
  // war hier das einzige Vorkommen in einem Spielertext und wurde vom Glossar deshalb nicht mal gefettet.
  E_TUNING: { tpl: "$0: +$1 Energie.", vals: [["Jede zweite Aufstellungsphase","1"],["Jede Aufstellungsphase","1"],["Jede Aufstellungsphase","2"],["Jede Aufstellungsphase","3"]] },
};
const applyMusterDescs = (defs) => {
  for (const [id, m] of Object.entries(MUSTER_DESC)) {
    const tiers = defs[id].tiers;
    for (let t = 1; t <= 4; t++) tiers[t].desc = m.tpl.replace(/\$(\d)/g, (_, i) => m.vals[t - 1][+i]);
  }
};

export const FAMILY_DEFS = {
  ...D_FAMILIES,
  ...B_FAMILIES,
  ...A_FAMILIES,
  ...C_FAMILIES,
  ...E_FAMILIES,
  ...P_FAMILIES,
};

applyMusterDescs(FAMILY_DEFS); // Stufen-descs der Muster-Familien aus MUSTER_DESC erzeugen

export const FAMILY_LIST = Object.values(FAMILY_DEFS);
export const familyDef = (id) => FAMILY_DEFS[id] || null;
// #195: familyCategory (id → cat) entfernt — kein Prod-Aufrufer (nur ein toter Test-Import).

/* ---- Resolver (Engine-Brücke) ---- */

// Aktive Stufen-Definition einer gehaltenen Familie. Bei `replacement` ist NUR die höchste gehaltene
// Stufe aktiv (Spec §2.3). `familyTiers` = { [familyId]: currentTier }. Null, wenn nicht gehalten.
export function activeTierDef(familyId, tier) {
  const fam = FAMILY_DEFS[familyId];
  if (!fam || !tier) return null;
  return fam.tiers[tier] || null;
}

// Alle aktiven Stufen-Defs (eine je gehaltener Familie) — die Liste, über die die Engine ihre Hooks summiert.
export function activeTierDefs(familyTiers = {}) {
  const out = [];
  for (const [id, tier] of Object.entries(familyTiers)) {
    const def = activeTierDef(id, tier);
    if (def) out.push(def);
  }
  return out;
}

// Wie activeTierDefs, aber mit familyId je Eintrag — für engine-/formationsseitige Marker, die die Familie
// KENNEN müssen (relay/triumph über isRole(familyId), segmentLow-Gate, jokerRole/bridgeRole in computeFormations).
export function activeFamilyEntries(familyTiers = {}) {
  const out = [];
  for (const [id, tier] of Object.entries(familyTiers || {})) {
    const def = activeTierDef(id, tier);
    if (def) out.push({ familyId: id, def });
  }
  return out;
}

// Engine-Parameter der aktiven Stufe einer Familie (z. B. misfireStep/weaknessDeficit/suitHalveOnSwitch).
// undefined, wenn die Familie nicht gehalten wird oder die Stufe den Parameter nicht führt → der Aufrufer
// (Engine) fällt dann auf seinen Default zurück (Rückwärtskompatibilität zu den flachen D-Perks).
export function familyTierParam(familyTiers, familyId, key) {
  const def = activeTierDef(familyId, (familyTiers || {})[familyId]);
  return def ? def[key] : undefined;
}

// Summe eines additiven Hooks (cardBonus/scoreFlat/scoreFlatOnCrit) über die aktiven Stufen-Defs.
export function familySumHook(familyTiers, name, ctx) {
  let t = 0;
  for (const def of activeTierDefs(familyTiers)) { const f = def[name]; if (f) t += f(ctx); }
  return t;
}

// Produkt eines multiplikativen Hooks (scoreMult) über die aktiven Stufen-Defs.
export function familyProdHook(familyTiers, name, ctx) {
  let m = 1;
  for (const def of activeTierDefs(familyTiers)) { const f = def[name]; if (f) m *= f(ctx); }
  return m;
}

// Präzision (#267): Summe der Roh-Crit-Chance über die aktiven Familien-Stufen (critChance-Hook). UNGEKLEMMT —
// additiv zu Perk-/Blitz-Crit; die Engine klemmt die Gesamtsumme. ctx trägt den Karten-Kontext { winValue, suit,
// formCount, focusSuits } für die konditionalen Generatoren (Zielsicherheit/Brennglas/Farbfokus).
export function familyCritChanceRaw(familyTiers, ctx = {}) {
  return familySumHook(familyTiers, "critChance", ctx);
}
// Präzision (#267): Summe des additiven Crit-Multiplikators über die aktiven Familien-Stufen (critMult-Hook, Wucht).
export function familyCritMult(familyTiers) {
  return familySumHook(familyTiers, "critMult", {});
}

// Feinjustierung (E_TUNING, #179 — ehem. Shop-Feinjustierung / Perk E10): Formationsenergie-Bonus aus dem gehaltenen
// Rang. `everySecond` (Stufe I §10) nur jede zweite Formationsphase — über die Durchlauf-Parität genähert. cycle = state.cycle.
export function formationEnergyBonus(familyTiers = {}, cycle = 0) {
  const tier = (familyTiers || {}).E_TUNING || 0;
  const def = tier ? E_FAMILIES.E_TUNING.tiers[tier] : null;
  if (!def) return 0;
  if (def.everySecond && (cycle % 2 !== 0)) return 0; // §10: „jede zweite Phase" ≈ gerade Durchläufe
  return def.energyBonus || 0;
}

// Farballianz (#179, E_COLOR_ALLIANCE): die verlinkten Farbgruppen aus roles.
// Eine gemeinsame Quelle für computeFormations (Farbblock-Verschmelzung) UND die UI.
// [] = keine Allianz; [[a,b,…]] = EINE Gruppe aus allen verlinkten Farben (#292: alle als eine Farbe, kein Paar-Split mehr).
export function allianceGroups(_familyTiers = {}, roles = {}) {
  const suits = (roles || {}).E_COLOR_ALLIANCE || [];
  if (suits.length < 2) return [];
  return [suits.slice()];
}

// Belohnt eine gehaltene Familie Crits? (steuert die UI-Sichtbarkeit der Crit-Anzeigen, analog perks.hasCritPerk — #166).
// Die crit-belohnenden D-Familien (D_CRIT_SCORE/D_SHARP_EYE/…) tragen scoreFlatOnCrit auf ihrer aktiven Stufe.
export function hasCritFamily(familyTiers) {
  return activeTierDefs(familyTiers).some((def) => !!def.scoreFlatOnCrit || !!def.critChance || !!def.critMult);
}

// Familien, deren Wirkung von Position/Reihenfolge/Nachbarschaft/Formation abhängt — für die Aufstellungshilfe (#166,
// analog perks.LAYOUT_EXTRA). Kuratiert: die positions-/nachbarschafts-/segment-/formationsbezogenen C-/B-/D-Familien;
// ALLE E-Formationswerkzeuge kommen über cat==="E" dazu.
const LAYOUT_FAMILY_IDS = new Set([
  "C_VANGUARD", "C_GUARD", "C_RELAY", "C_LEADER", "C_FINISHER", "C_SURVIVOR", "C_JOKER", "C_BRIDGE", "C_ECKPFEILER", "C_ECKSTEIN", // Rollen an Position/Nachbar/Segment/Formation/Gebäude
  "B_OPENING", "B_FINALE", "B_TENTH_STRIKE", "B_TIGHT", "B_PERFECT", "B_SUPERIOR",                    // positions-/formationsbezogene Stich-Familien
  "D_FORMATION_BONUS", "D_CRIT_HARVEST", "D_FULL_HOUSE",                                              // formations-/segmentbezogene Score-Familien
]);
export const isLayoutFamily = (id) => LAYOUT_FAMILY_IDS.has(id) || FAMILY_DEFS[id]?.cat === "E";
// Gehaltene Layout-Familien mit Anzeige-Daten (Name + römische Stufe + Beschreibung der aktiven Stufe).
export function layoutFamilies(familyTiers) {
  const out = [];
  for (const [id, tier] of Object.entries(familyTiers || {})) {
    const fam = FAMILY_DEFS[id];
    if (fam && tier && isLayoutFamily(id)) out.push({ id, name: fam.name, tier, desc: (fam.tiers[tier] || {}).desc || "" });
  }
  return out;
}

/* Familien-Pick anwenden (Spec §2.4 applyFamilyPick). Reine Funktion: nimmt den relevanten Run-State-
   Ausschnitt und liefert das Patch { familyTiers, deck, roles }.
   - REPLACEMENT (Kat. B/C-Regel/D/E): NUR der Familienrang ändert sich; die aktive Regel löst die Engine
     live über activeTierDefs auf — kein separates „install/removeRuntimeRule" nötig (Spec §2.3).
   - CUMULATIVE (Kat. A / Shop-Karten, #163/#164): jede gewählte Stufe führt ihr Paket EINMALIG aus
     (tierDef.onPick auf dem Deck); frühere Deckänderungen bleiben. Deterministisch über injizierten rng.
   - ROLE (Kat. C-Rollen, #163): Rollenziele/-regel steigen; der Ziel-Flow folgt mit den C-Familien.
   Der aufrufende Reducer bleibt frei von Registry-Wissen.
   `defs` erlaubt die Wiederverwendung durch die Shop-Familien (#164, SHOP_FAMILY_DEFS): dieselbe CUMULATIVE-
   onPick-/ROLE-Logik, nur ein anderer Familien-Katalog. Default = die Perk-Familien (FAMILY_DEFS). */
export function applyFamilyPick(familyId, targetTier, ctx = {}, rng = Math.random, defs = FAMILY_DEFS) {
  const { familyTiers = {}, deck = null, roles = null, target = null } = ctx;
  const fam = defs[familyId];
  if (!fam || !targetTier) return { familyTiers, deck, roles }; // ungültige Familie/Stufe → No-Op
  const tierDef = fam.tiers[targetTier] || null;
  let nextDeck = deck, nextRoles = roles;
  if (fam.upgradeType === UPGRADE_TYPES.CUMULATIVE && tierDef && tierDef.onPick && deck) {
    // Stufen-Paket einmalig aufs Deck (A-/Shop-Karten-Familien, C_SACRIFICE). `target` trägt die Spieler-Auswahl
    // (Farbe(n) bzw. Karten + order=playerOrder); ohne Ziel-Flow ist es null → diese Stufen sind No-Ops.
    nextDeck = tierDef.onPick(deck, rng, target);
  } else if (fam.upgradeType === UPGRADE_TYPES.ROLE) {
    // Rolle (Kat. C): gewählte Ziel-Karten in roles[familyId]. Upgrade BEHÄLT bestehende Ziele, nur die
    // zusätzlich gewählten kommen dazu (Spec §2.3 Rollen-Upgrade); die aktive Regel/Werte löst die Engine
    // live über die gehaltene Stufe auf. Ohne target (Upgrade ohne neue Ziele) bleiben die Rollen unverändert.
    const chosen = (target && target.cards) || [];
    const prev = (roles && roles[familyId]) || [];
    const merged = prev.slice();
    for (const id of chosen) if (!merged.includes(id)) merged.push(id);
    nextRoles = { ...(roles || {}), [familyId]: merged };
  } else if (fam.upgradeType === UPGRADE_TYPES.REPLACEMENT && tierDef && tierDef.pickTarget && target) {
    // REGELERSETZUNG mit Ziel (#179): E_COLOR_ALLIANCE (Farben) / E_CORE (Formationstyp). Das gewählte Ziel wird als
    // „Rolle" der Familie persistiert — voller Ersatz je Stufe (kein Merge, REPLACEMENT). computeFormations liest roles[familyId].
    if (tierDef.pickTarget.suits && target.suits) nextRoles = { ...(roles || {}), [familyId]: target.suits.slice() };
    else if (tierDef.pickTarget.formationType && target.formationType) nextRoles = { ...(roles || {}), [familyId]: [target.formationType] };
  }
  return { familyTiers: withFamilyTier(familyTiers, familyId, targetTier), deck: nextDeck, roles: nextRoles };
}
