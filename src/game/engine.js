import * as C from "./constants.js";
import { shuffledOrder } from "./deck.js";
import { PERK_DEFS, buildOffer, critChanceFor } from "./perks.js";
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
    initiative, lastResult, perks, offer, shield, tieArmed,
    crits, critBonusScore, bestTrickScore,
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
  };
  const pValue = effectivePlayerValue(pCard.value, perks, ctx);
  const oValue = oCard.value; // Gegner bleibt neutral/unverändert (§12)

  let won = false, lost = false, tieConverted = false;
  if (pValue > oValue) won = true;
  else if (pValue < oValue) lost = true;
  else if (tieArmed) { won = true; tieConverted = true; } // B5: Gleichstand → Sieg
  // sonst echter Gleichstand: kein Effekt (§4.1)

  let gained = 0, dmg = 0, healed = 0;
  let isCrit = false, critChance = 0, critMultiplier = C.CRIT_BASE_MULT, scoreBeforeCrit = 0, critBonus = 0;

  if (won) {
    winStreak += 1; wins += 1;
    if (winStreak > bestStreak) bestStreak = winStreak; // längste Serie des Runs (#8)
    // winStreak/wins enthalten hier bereits den gerade gewonnenen Stich.
    const wctx = { winValue: pValue, winStreak, wins, trickNo, posInCycle: pos, speedPct: state.speedPct || 0 };
    // Score: Multiplikatoren × Tempo-Mult, DANN additive Boni (D3/D5), DANN Crit.
    const tempoScoreMult = 1 + (state.speedPct || 0) * C.TEMPO_SCORE_FACTOR;
    scoreBeforeCrit = C.SCORE_PER_WIN * prodHook(perks, "scoreMult", wctx) * tempoScoreMult
                      + sumHook(perks, "scoreFlat", wctx);
    critChance = critChanceFor(perks, wctx);
    critMultiplier = C.CRIT_BASE_MULT + sumHook(perks, "critMultiplier", wctx);
    isCrit = rollCrit(critChance, ownsGuaranteedCrit(perks, wctx), rng);
    gained = scoreBeforeCrit * (isCrit ? critMultiplier : 1);
    critBonus = gained - scoreBeforeCrit;
    score += gained;
    if (isCrit) { crits += 1; critBonusScore += critBonus; }
    bestTrickScore = Math.max(bestTrickScore, gained);
    xp += C.XP_PER_WIN;
    healed = sumHook(perks, "healOnWin", wctx);
    life = Math.min(maxLife, life + healed);
    initiative = "player";
    if (tieConverted) tieArmed = false;
    lastResult = "win";
  } else if (lost) {
    losses += 1; winStreak = 0;
    dmg = Math.max(0, C.DMG_PER_LOSS - sumHook(perks, "dmgReduce", {}));
    // Schild (C5) absorbiert NACH der Schadensberechnung, vor dem Leben.
    if (shield > 0 && dmg > 0) { const absorbed = Math.min(shield, dmg); shield -= absorbed; dmg -= absorbed; }
    life -= dmg;
    initiative = "opp";
    if (ownsFlag(perks, "winTieAfterLoss")) tieArmed = true;
    lastResult = "loss";
  } else {
    ties += 1;
    lastResult = "tie";
    // Serie & Initiative unverändert
  }

  const lastTrick = {
    pCard, oCard, pValue, oValue,
    result: tieConverted ? "win_tie" : won ? "win" : lost ? "loss" : "tie",
    gained, dmg, healed, trickNo,
    isCrit, critChance, critMultiplier, scoreBeforeCrit, scoreGain: gained, critBonus,
  };

  // Tod? — sofort beenden (kein Weiterziehen / Level-Up)
  if (life <= 0) {
    return {
      ...state, deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
      life: 0, xp, level, score, winStreak, bestStreak, wins, losses, ties,
      crits, critBonusScore, bestTrickScore,
      initiative, lastResult, offer, shield, tieArmed,
      lastTrick, phase: "gameover",
    };
  }

  // Nächste Karte / Durchlauf-Ende (§4.3): 52 Stiche → neu mischen, Mods bleiben
  pos += 1;
  if (pos >= C.TRICKS_PER_CYCLE) {
    cycle += 1;
    pos = 0;
    const ch = sumHook(perks, "healOnCycle", {});
    if (ch > 0) life = Math.min(maxLife, life + ch);
    shield = perks.reduce((m, id) => Math.max(m, PERK_DEFS[id].shieldPerCycle || 0), 0); // C5: Schild je Durchlauf (kein Stapeln)
    playerOrder = shuffledOrder(deck.length, rng);
    oppOrder = shuffledOrder(oppDeck.length, rng);
  }

  // Level-Up(s): Restschwelle abziehen, XP-Überschuss bleibt (§6.2)
  let phase = "play";
  let newOffer = offer;
  let leveled = false;
  while (xp >= xpToNext(level)) { xp -= xpToNext(level); level += 1; leveled = true; }
  if (leveled) {
    const off = buildOffer(perks, rng, C.PERKS_OFFERED);
    if (off.length > 0) { phase = "levelup"; newOffer = off; } // Pool leer → keine Pause
  }

  return {
    ...state, deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
    life, maxLife, xp, level, score, winStreak, bestStreak, wins, losses, ties,
    crits, critBonusScore, bestTrickScore,
    initiative, lastResult, perks, offer: newOffer, shield, tieArmed,
    lastTrick, phase,
  };
}
