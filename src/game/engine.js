import * as C from "./constants.js";
import { PERK_DEFS, buildOffer, critChanceFor, comboMultFor, tempoScoreMultFor, critMultiplierFor, streakBaseMult } from "./perks.js";
import { xpToNext } from "./leveling.js";

function sumHook(perks, name, ctx) {
  let t = 0;
  for (const id of perks) { const f = PERK_DEFS[id][name]; if (f) t += f(ctx); }
  return t;
}
function prodHook(perks, name, ctx) {
  let t = 1;
  for (const id of perks) { const f = PERK_DEFS[id][name]; if (f) t *= f(ctx); }
  return t;
}
function ownsFlag(perks, flag) {
  return perks.some((id) => PERK_DEFS[id][flag]);
}
function anyHookTrue(perks, name, ctx) {
  return perks.some((id) => { const f = PERK_DEFS[id][name]; return f ? !!f(ctx) : false; });
}
function ownsGuaranteedCrit(perks, ctx) {
  return perks.some((id) => { const f = PERK_DEFS[id].guaranteedCrit; return f ? f(ctx) : false; });
}

// Crit-Wurf (pure, testbar): guaranteed override; sonst rng < gedeckelter Chance.
// Ruft rng() NUR, wenn wirklich gewürfelt wird → minimaler/deterministischer Verbrauch.
export function rollCrit(chance, guaranteed, rng = Math.random) {
  if (guaranteed) return true;
  const c = Math.min(1, Math.max(0, chance));
  if (c <= 0) return false;
  return rng() < c;
}

// Effektiver Kampfwert der Spielerkarte in DIESEM Stich (Basiswert + Kat.-B-Boni).
export function effectivePlayerValue(baseValue, perks, ctx) {
  return baseValue + sumHook(perks, "cardBonus", { ...ctx, pValueBase: baseValue });
}

/* Einen Stich auflösen → neuer State (pure). rng wird nur bei Durchlauf-Ende
   (Neu-Mischen) und Level-Up (Perk-Angebot) gebraucht — als Abhängigkeit injiziert,
   damit die Schicht deterministisch/seedbar bleibt (kein Math.random hier drin). */
export function resolveTrick(state, rng = Math.random) {
  if (state.phase !== "play") return state;

  let {
    deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
    life, maxLife, xp, level, score, winStreak, bestStreak, wins, losses, ties,
    initiative, lastResult, perks, offer, shield, tieArmed, sinceWin = 0,
    crits, critBonusScore, bestTrickScore, legendaryCritBonus = 0,
    // Ansage-System (#36)
    cycleWins = 0, cycleBaseScore = 0, prediction = null, lastPrediction = null,
    lastPredictionResult = null, predictionBonusScore = 0, exactPredictions = 0,
    nearPredictions = 0, largestPredictionBonus = 0,
  } = state;

  const pCard = deck[playerOrder[pos]];
  const oCard = oppDeck[oppOrder[pos]];

  trickNo += 1;
  const ctx = {
    posInCycle: pos,
    trickNo,
    lastResult,
    lostLastTrick: lastResult === "loss",
    winStreak,
    sinceWin, // #71 Durchbruch: Stiche ohne Sieg (Stand VOR diesem Stich)
    life, maxLife, // L3 „Letztes Aufbäumen": cardBonus prüft das Leben-Verhältnis VOR der Auflösung
  };
  const pValue = effectivePlayerValue(pCard.value, perks, ctx);
  const oValue = oCard.value; // Gegner bleibt neutral/unverändert (§12)

  let won = false, lost = false, tieConverted = false;
  if (pValue > oValue) won = true;
  else if (pValue < oValue) lost = true;
  // Gleichstand → Sieg via B5 (tieArmed) ODER L2 „Unaufhaltsam" (winTie, Serie VOR dem Stich ≥3).
  else if (tieArmed || anyHookTrue(perks, "winTie", ctx)) { won = true; tieConverted = true; }
  // sonst echter Gleichstand: kein Effekt (§4.1)

  let gained = 0, dmg = 0, healed = 0;
  let isCrit = false, critChance = 0, critMultiplier = C.CRIT_BASE_MULT, scoreBeforeCrit = 0, critBonus = 0;

  if (won) {
    winStreak += 1; wins += 1; cycleWins += 1; // cycleWins: Siege im laufenden Durchlauf (#36)
    if (winStreak > bestStreak) bestStreak = winStreak; // längste Serie des Runs (#8)
    // winStreak/wins enthalten hier bereits den gerade gewonnenen Stich.
    const wctx = { winValue: pValue, margin: pValue - oValue, winStreak, wins, trickNo, posInCycle: pos, speedPct: state.speedPct || 0 };
    // Score: Basis-Serien-Mult (#39, immer) × Perk-Multiplikatoren × Tempo, DANN additive Boni (D3/D5), DANN Crit.
    const tempoScoreMult = tempoScoreMultFor(perks, state.speedPct); // L6 „Raserei": Tempo-Faktor ×2
    scoreBeforeCrit = C.SCORE_PER_WIN * streakBaseMult(winStreak) * prodHook(perks, "scoreMult", wctx) * tempoScoreMult
                      + sumHook(perks, "scoreFlat", wctx);
    critChance = critChanceFor(perks, wctx, legendaryCritBonus); // inkl. L4-Bonus & L5-Halbierung
    critMultiplier = critMultiplierFor(perks, wctx);             // L5 „Jackpot": ×4 überschreibt Basis ×2
    isCrit = rollCrit(critChance, ownsGuaranteedCrit(perks, wctx), rng);
    gained = scoreBeforeCrit * (isCrit ? critMultiplier : 1);
    critBonus = gained - scoreBeforeCrit;
    score += gained;
    if (isCrit) {
      crits += 1; critBonusScore += critBonus;
      // L4 „Kritische Masse": Bonus NACH dem Wurf erhöhen (nicht rückwirkend), dauerhaft gedeckelt.
      if (ownsFlag(perks, "legendaryCritGain")) legendaryCritBonus = Math.min(legendaryCritBonus + C.L4_CRIT_STEP, C.L4_CRIT_CAP);
    }
    bestTrickScore = Math.max(bestTrickScore, gained);
    cycleBaseScore += gained; // Basis-Score des Durchlaufs (#36): OHNE Ansage-Mult; Bonus kommt am Ende
    xp += C.XP_PER_WIN;
    healed = sumHook(perks, "healOnWin", wctx);
    life = Math.min(maxLife, life + healed);
    initiative = "player";
    if (tieConverted) tieArmed = false;
    sinceWin = 0; // #71 Durchbruch: Sieg setzt den Zähler zurück
    lastResult = "win";
  } else if (lost) {
    losses += 1; winStreak = 0;
    // Flat-Grundschaden (#59: die #32-Zeiteskalation ist raus; Zeit-Pressure läuft jetzt über den
    // periodischen LIFE_DRAIN). Legendär-Zusatzschaden (L1 +3 / L6 +2) addiert; dmgReduce (C3) zieht
    // ab, Schild (C5) absorbiert danach (s. u.).
    dmg = Math.max(0, C.DMG_PER_LOSS + sumHook(perks, "extraDamageTaken", {}) - sumHook(perks, "dmgReduce", { life, maxLife }));
    // Schild (C5) absorbiert NACH der Schadensberechnung, vor dem Leben.
    if (shield > 0 && dmg > 0) { const absorbed = Math.min(shield, dmg); shield -= absorbed; dmg -= absorbed; }
    life -= dmg;
    initiative = "opp";
    if (ownsFlag(perks, "winTieAfterLoss")) tieArmed = true;
    sinceWin += 1; // #71 Durchbruch: kein Sieg → Zähler hoch
    lastResult = "loss";
  } else {
    ties += 1;
    sinceWin += 1; // #71 Durchbruch: Gleichstand zählt als „kein Sieg" weiter
    lastResult = "tie";
    // Serie & Initiative unverändert
  }

  const lastTrick = {
    pCard, oCard, pValue, oValue,
    result: tieConverted ? "win_tie" : won ? "win" : lost ? "loss" : "tie",
    gained, dmg, healed, trickNo,
    isCrit, critChance, critMultiplier, scoreBeforeCrit, scoreGain: gained, critBonus,
    jackpot: isCrit && critMultiplier > C.CRIT_BASE_MULT, // L5 „Jackpot": Crit ×4 → verstärkter Float
    // D2-Kombo-Wert der resultierenden Serie (geteilte Quelle → kein Drift zur Score-Berechnung, #31).
    // 1 ohne D2; bei Niederlage/Gleichstand irrelevant (Anzeige nur bei Sieg ab ×1,5).
    comboMult: comboMultFor(perks, winStreak),
  };

  // Tod? — sofort beenden (kein Weiterziehen / Level-Up / KEINE Ansage-Auswertung, #36).
  // Eine aktive Ansage gilt als „nicht abgeschlossen", nicht als verfehlt → kein Bonus/Malus.
  if (life <= 0) {
    return {
      ...state, deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
      life: 0, xp, level, score, winStreak, bestStreak, wins, losses, ties,
      crits, critBonusScore, bestTrickScore, legendaryCritBonus,
      cycleWins, cycleBaseScore, prediction, lastPrediction, lastPredictionResult,
      predictionBonusScore, exactPredictions, nearPredictions, largestPredictionBonus,
      initiative, lastResult, offer, shield, tieArmed, sinceWin,
      lastTrick, phase: "gameover",
    };
  }

  // Durchlauf-Ende (§4.3, #36-Umbau): NICHT mehr hier mischen. Heilung/Schild + Ansage-Auswertung,
  // dann Phase `prediction` (Mischen/pos-Reset erst bei SUBMIT_PREDICTION). Erster Durchlauf: prediction=null.
  pos += 1;
  let predictionDue = false;
  if (pos >= C.TRICKS_PER_CYCLE) {
    cycle += 1;
    const ch = sumHook(perks, "healOnCycle", {});
    if (ch > 0) life = Math.min(maxLife, life + ch);
    shield = perks.reduce((m, id) => Math.max(m, PERK_DEFS[id].shieldPerCycle || 0), 0); // C5: Schild je Durchlauf (kein Stapeln)
    if (prediction != null) { // ab dem 2. Durchlauf: Ansage auswerten
      const difference = Math.abs(prediction - cycleWins);
      const multiplier = difference === 0 ? C.PREDICTION_EXACT_MULT
                       : difference === 1 ? C.PREDICTION_NEAR_ONE_MULT
                       : difference === 2 ? C.PREDICTION_NEAR_TWO_MULT
                       : C.PREDICTION_MISS_MULT;
      const tier = difference === 0 ? "exact" : difference <= 2 ? "near" : "miss";
      const baseCycleScore = Math.floor(cycleBaseScore);
      const bonusScore = Math.floor(cycleBaseScore * (multiplier - 1)); // nur der Bonus (kein Doppelzählen)
      score += bonusScore;
      predictionBonusScore += bonusScore;
      if (bonusScore > largestPredictionBonus) largestPredictionBonus = bonusScore;
      if (tier === "exact") exactPredictions += 1;
      else if (tier === "near") nearPredictions += 1;
      lastPredictionResult = { prediction, actualWins: cycleWins, difference, tier, multiplier,
        baseCycleScore, bonusScore, finalCycleScore: baseCycleScore + bonusScore };
      lastPrediction = prediction;
    }
    prediction = null;    // aktive Ansage beendet (SUBMIT_PREDICTION setzt die nächste)
    predictionDue = true; // Overlay für den nächsten Durchlauf öffnen
  }

  // Level-Up(s): Restschwelle abziehen, XP-Überschuss bleibt (§6.2). Level-Up hat Vorrang;
  // nach der Perk-Wahl geht PICK_PERK bei predictionDue weiter in die Ansage-Phase (#36).
  let phase = "play";
  let newOffer = offer;
  // #57: mehrere Level-Ups in einem Stich als Queue — für den ERSTEN ein Angebot bauen, die
  // restlichen bleiben als pendingLevelUps und werden nach jedem PICK_PERK nachgezogen (sonst
  // würde bei künftigem Tuning ein übersprungenes Level still verschluckt).
  let pendingLevelUps = 0;
  while (xp >= xpToNext(level)) { xp -= xpToNext(level); level += 1; pendingLevelUps += 1; }
  if (pendingLevelUps > 0) {
    const off = buildOffer(perks, rng, C.PERKS_OFFERED, level); // Level-Gate für Legendaries (#33)
    if (off.length > 0) { phase = "levelup"; newOffer = off; pendingLevelUps -= 1; } // dieses Angebot zeigen
    else pendingLevelUps = 0; // Pool leer → keine Pause; restliche Level-Ups verfallen (kein Angebot möglich)
  }
  if (phase === "play" && predictionDue) phase = "prediction"; // kein Level-Up → direkt Ansage

  return {
    ...state, deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
    cycleWins, cycleBaseScore, prediction, lastPrediction, lastPredictionResult,
    predictionBonusScore, exactPredictions, nearPredictions, largestPredictionBonus, predictionDue,
    life, maxLife, xp, level, score, winStreak, bestStreak, wins, losses, ties,
    crits, critBonusScore, bestTrickScore, legendaryCritBonus,
    initiative, lastResult, perks, offer: newOffer, shield, tieArmed, pendingLevelUps, sinceWin,
    lastTrick, phase,
  };
}
