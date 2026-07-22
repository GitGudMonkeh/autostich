import * as C from "./constants.js";
import { shuffledOrder } from "./deck.js";
import { PERK_DEFS, buildOffer } from "./perks.js";
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
    initiative, lastResult, perks, offer, shieldUsedThisCycle, tieArmed,
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

  if (won) {
    winStreak += 1; wins += 1;
    if (winStreak > bestStreak) bestStreak = winStreak; // längste Serie des Runs (#8)
    const wctx = { winValue: pValue, winStreak, wins };
    gained = C.SCORE_PER_WIN * prodHook(perks, "scoreMult", wctx) + sumHook(perks, "scoreFlat", wctx);
    score += gained;
    xp += C.XP_PER_WIN;
    healed = sumHook(perks, "healOnWin", wctx);
    life = Math.min(maxLife, life + healed);
    initiative = "player";
    if (tieConverted) tieArmed = false;
    lastResult = "win";
  } else if (lost) {
    losses += 1; winStreak = 0;
    dmg = Math.max(0, C.DMG_PER_LOSS - sumHook(perks, "dmgReduce", {}));
    if (ownsFlag(perks, "shieldPerCycle") && !shieldUsedThisCycle) { dmg = 0; shieldUsedThisCycle = true; }
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
  };

  // Tod? — sofort beenden (kein Weiterziehen / Level-Up)
  if (life <= 0) {
    return {
      ...state, deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
      life: 0, xp, level, score, winStreak, bestStreak, wins, losses, ties,
      initiative, lastResult, offer, shieldUsedThisCycle, tieArmed,
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
    shieldUsedThisCycle = false;
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
    initiative, lastResult, perks, offer: newOffer, shieldUsedThisCycle, tieArmed,
    lastTrick, phase,
  };
}
