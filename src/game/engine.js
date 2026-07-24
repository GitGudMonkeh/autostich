import * as C from "./constants.js";
import { shuffledOrder } from "./deck.js";
import { PERK_DEFS, buildOffer, critChanceRawFor, critMultiplierFor, streakBaseMult } from "./perks.js";
import { skillSum, lightningCritRaw, addCharge, buildSkillOffer, ionScoreFor, ionizeCountFor, consumeCharge, ionizeCards,
  hasIonize, hasProtect, hasStorm, chargeFloorFor } from "./skills.js";
import { STAT_IDS, statStreakFactor, statFormFactor } from "./stats.js";
import { computeFormations, positionHasFormation, SEGMENT_SIZE } from "./formations.js";

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

/* Einen Stich auflösen → neuer State (pure). V2 (§22): KEIN Leben/Schaden/Heilung/Schild/Tempo mehr —
   der Run läuft garantiert über MAX_CYCLES Durchläufe. rng wird nur bei Durchlauf-Ende (Gegner neu
   mischen, Perk-/Skill-Angebot) gebraucht — als Abhängigkeit injiziert, damit die Schicht
   deterministisch/seedbar bleibt (kein Math.random hier drin).
   Spieler-Reihenfolge ist PERSISTENT: nur das Gegnerdeck wird pro Durchlauf neu gemischt. */
export function resolveTrick(state, rng = Math.random) {
  if (state.phase !== "play") return state;

  let {
    deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
    score, winStreak, bestStreak, wins, losses, ties,
    initiative, lastResult, perks, offer, tieArmed, sinceWin = 0,
    lossStreak = 0, lastWinValue = null, altLen = 0, // #71 Rares: Revanche / Präzision / Wechselspiel
    critFollowArmed = false, weaknessArmed = false, // #71 Crit-Historie: Crit-Folge (D14) / Schwachstellenanalyse (D16)
    misfireScore = 0, // V2 §22.6 D15: Score-Ladung, +30 je Sieg ohne Crit (max 300), Auszahlung bei Crit
    ascRun = 0, lastPlayedValue = null, // #71 Perfekte Folge: aufsteigende Wertfolge
    winSuit = null, winSuitStreak = 0, // #71 Farbserie: gleicher-Farbe-Siegesserie
    recentResults = [], // #71 Volles Haus: die letzten (bis zu 4) Ergebnisse VOR diesem Stich
    statCritChance = 0, statCritMult = 0, statFormMult = 0, statStreakMult = 0, statOffer = null, // Stat-System (V2 §22.3)
    formationEnergy = 0, formationSwaps = [], // Formationsphase (V2 §22.8)
    roles = {}, successorQueue = [], triumphArmed = [], // Kartenrollen (V2 §22.6 C): Rollen-ids / Nachfolger-Boni / Triumph-Armierung
    l4Boost = {}, l5Used = [], l8Wins = {}, chainArmed = false, pos20Bonus = 0, // Legendaries (V2 §22.6 L): L4 Wert-Gewinn / L5 Jackpot-Verbrauch / L8 Erfolge / L10 Kette / L11 Wiederholung
    crits, critBonusScore, bestTrickScore,
    skills = [], skillOffer = null, lightning = null, // Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md)
  } = state;

  const pCard = deck[playerOrder[pos]];
  const oCard = oppDeck[oppOrder[pos]];

  // Formationen (V2 §22.7): zu Durchlauf-Beginn (pos 0) aus der persistenten Reihenfolge + Dauerwerten
  // berechnet und für den ganzen Durchlauf stabil gehalten. Greifen bei Sieg der jeweiligen Karte.
  let formations = state.formations || [];
  if (pos === 0) formations = computeFormations(playerOrder, deck, roles, perks);
  const posForm = formations[pos] || { mult: 1, formations: [] };
  const formationMult = posForm.mult || 1;
  const hasFormation = positionHasFormation(posForm);
  // Dauerwert des direkten Vorgängers in der Reihenfolge (B10 Überzahl); an Position 0 keiner.
  const predValue = pos > 0 ? deck[playerOrder[pos - 1]].value : null;

  trickNo += 1;
  // #71 Perfekte Folge: Länge der aktuell streng ansteigenden Wertfolge INKL. dieser Karte (Basiswert).
  // Gleicher/niedrigerer Wert beginnt die Folge neu. State für den nächsten Stich sofort fortschreiben.
  const ascChain = (lastPlayedValue != null && pCard.value > lastPlayedValue) ? (ascRun || 0) + 1 : 1;
  ascRun = ascChain;
  lastPlayedValue = pCard.value;
  // #71 Volles Haus: Siege in den (bis zu 4) Stichen VOR diesem — inkl. aktuellem Sieg = Fenster 5.
  const recentWinCount = recentResults.filter((r) => r === "win").length;
  // Effektive Serie für Serien-Effekte (Stand VOR dem Stich).
  let serieStreak = winStreak;
  // Kartenrollen (V2 §22.6 C): Rolle der aktuellen Karte, Triumph-Armierung, Segment-Tiefste.
  const isRole = (perkId) => (roles[perkId] || []).includes(pCard.id);
  const triumphActive = triumphArmed.includes(pCard.id);
  let isSegmentLow = false, isSegmentHigh = false;
  if (ownsFlag(perks, "segmentLow") || ownsFlag(perks, "segmentHigh")) { // C7 Tiefste / L7 Höchste im Segment (erste bei Gleichstand)
    const segStart = Math.floor(pos / SEGMENT_SIZE) * SEGMENT_SIZE;
    let minVal = Infinity, minPos = -1, maxVal = -Infinity, maxPos = -1;
    for (let k = segStart; k < segStart + SEGMENT_SIZE && k < playerOrder.length; k++) {
      const v = deck[playerOrder[k]].value;
      if (v < minVal) { minVal = v; minPos = k; }
      if (v > maxVal) { maxVal = v; maxPos = k; }
    }
    isSegmentLow = pos === minPos; isSegmentHigh = pos === maxPos;
  }
  // L10 Kettenreaktion: der direkte Nachfolger eines Crits ist garantiert kritisch (falls er gewinnt).
  const forceCrit = chainArmed; chainArmed = false;
  // L11 Zeitraffer: Position 40 wiederholt den temporären Wertbonus von Position 20.
  const l11Bonus = (pos === 39 && ownsFlag(perks, "repeatPos")) ? (pos20Bonus || 0) : 0;
  // C2 Triumph: die Armierung dieser Karte wird durch das Spielen verbraucht (Neu-Armierung nur bei Sieg).
  if (triumphActive) triumphArmed = triumphArmed.filter((id) => id !== pCard.id);
  const ctx = {
    posInCycle: pos,
    trickNo,
    lastResult,
    lostLastTrick: lastResult === "loss",
    winStreak: serieStreak, // Serien-Effekte (B2 Momentum) sehen die effektive Serie
    sinceWin, // #71 Durchbruch: Stiche ohne Sieg (Stand VOR diesem Stich)
    lossStreak, // #71 Revanche: aufeinanderfolgende Niederlagen (Stand VOR diesem Stich)
    ascChain, // #71 Perfekte Folge (Alt-Historie; B9 nutzt jetzt posForm)
    posForm, // V2 §22.6: Formation der gespielten Position (B6 Wiederholung / B9 Treppe)
    predValue, // V2 §22.6: Dauerwert des direkten Vorgängers (B10 Überzahl)
    isRole, triumphActive, isSegmentLow, isSegmentHigh, // V2 §22.6 C/L: Kartenrollen (C1/C2/C3/C6/C7/L7)
  };
  // Nachfolger-Bonus (C4 Staffelläufer / C5 Anführer): der Kopf der Queue gilt für DIESE Karte, dann verbraucht.
  const relayBonus = successorQueue[0] || 0;
  successorQueue = successorQueue.slice(1);
  const pValue = effectivePlayerValue(pCard.value, perks, ctx) + relayBonus + l11Bonus;
  // L11: den temporären Wertbonus dieser Karte an Position 20 für Position 40 merken.
  let newPos20Bonus = pos20Bonus;
  if (pos === 19) newPos20Bonus = pValue - pCard.value;
  const oValue = oCard.value; // Gegner bleibt neutral/unverändert (§12)

  let won = false, lost = false, tieConverted = false;
  if (pValue > oValue) won = true;
  else if (pValue < oValue) lost = true;
  // Gleichstand → Sieg via B5 (tieArmed) ODER L2 „Unaufhaltsam" (winTie, Serie VOR dem Stich ≥3).
  else if (tieArmed || anyHookTrue(perks, "winTie", ctx)) { won = true; tieConverted = true; }
  // sonst echter Gleichstand: kein Effekt (§4.1)

  // #71 Wechselspiel: Länge der aktuellen strikten Sieg/Niederlage-Alternation (Gleichstand bricht sie).
  const curRes = won ? "win" : lost ? "loss" : "tie";
  altLen = curRes === "tie" ? 0
    : (curRes !== lastResult && (lastResult === "win" || lastResult === "loss")) ? altLen + 1 : 1;

  let gained = 0;
  let isCrit = false, critChance = 0, critMultiplier = C.CRIT_BASE_MULT, scoreBeforeCrit = 0, critBonus = 0;

  if (won) {
    winStreak += 1; wins += 1;
    if (winStreak > bestStreak) bestStreak = winStreak; // längste Serie des Runs (#8)
    serieStreak = winStreak; // effektive Serie NACH diesem Sieg
    // winStreak/wins enthalten hier bereits den gerade gewonnenen Stich.
    // #71 Farbserie: Länge der Serie gewonnener Stiche gleicher Farbe INKL. dieses Siegs.
    const suitStreak = pCard.suit === winSuit ? winSuitStreak + 1 : 1;
    const wctx = { winValue: pValue, margin: pValue - oValue, winStreak: serieStreak, wins, trickNo, posInCycle: pos,
                   lastWinValue, altLen, // #71: Präzision (Vergleich mit letztem Siegwert) / Wechselspiel
                   critFollowArmed, weaknessArmed, // Crit-Historie: Stand VOR diesem Sieg (D14/D16)
                   suitStreak, recentWinCount, // Farbserie / Volles Haus
                   baseValue: pCard.value, // Basiswert der gespielten Karte
                   hasFormation, lastResult, misfireScore }; // V2 §22.6 D: Formation-Sieg / Wechselspiel / Fehlzündungs-Ladung (D15)
    winSuit = pCard.suit; winSuitStreak = suitStreak; // Farbserie fortschreiben
    // Crit ZUERST bestimmen — die Blitz-Crit-Flats (scoreFlatOnCrit) müssen in die multiplizierte Basis.
    // Der Crit-Wurf verbraucht rng nur, wenn wirklich gewürfelt wird → rng-Reihenfolge unverändert (kein Drift).
    // Blitz-Crit-Basis (Abschnitt 2a) wird additiv zugerechnet, unabhängig von L5-critChanceMult.
    // Crit-Chance-Stat (V2 §22.3) fließt additiv in die Roh-Chance (mit Perk-/Blitz-Basis); ungeklemmt (Überschusskrit).
    // Roh-Crit-Chance (ungeklemmt): Perk-/Blitz-Basis + Crit-Chance-Stat. D-Crit-Flats sehen rawCrit (critCtx).
    const rawCrit = critChanceRawFor(perks, wctx) + lightningCritRaw(lightning, skills) + statCritChance;
    critChance = Math.min(1, Math.max(0, rawCrit));             // Anzeige/normaler Wurf (geklemmt)
    critMultiplier = critMultiplierFor(perks, wctx, statCritMult); // Basis 1,5 + Crit-Mult-Stat
    isCrit = forceCrit || rollCrit(critChance, ownsGuaranteedCrit(perks, wctx), rng); // L10: garantierter Nachfolger-Crit
    // Score (globale Formel): additive Boni — inkl. Crit-only-Flats (Blitzableiter +50) — fließen in die BASIS
    // und werden mitmultipliziert: (SCORE_PER_WIN + Σ scoreFlat [+ Σ scoreFlatOnCrit bei Crit])
    // × Basis-Serien-Mult (#39, immer) × Perk-scoreMult, DANN Crit-Faktor.
    // Ionisierung: Score der gespielten Karte (Stapel VOR dem Zuwachs). Gewitterfront: +100 für die nächsten Siege.
    const stormScore = (lightning && (lightning.stormScoreWinsRemaining || 0) > 0) ? C.STORM_SCORE : 0;
    // L5 Jackpot: erster Crit einer L5-Zufallskarte je Durchlauf → +1000 flach (in die multiplizierte Basis).
    const l5Hit = isCrit && (roles.L5 || []).includes(pCard.id) && !l5Used.includes(pCard.id);
    if (l5Hit) l5Used = [...l5Used, pCard.id];
    const l5Flat = l5Hit ? (PERK_DEFS.L5.jackpotScore || 0) : 0;
    // Crit-Flats (Perks D6/D7/D8/D11/D15/D19 + Blitzableiter) sehen rawCrit (D19 Überschusskrit) → eigener ctx.
    const critCtx = { ...wctx, rawCrit };
    const scoreBase = C.SCORE_PER_WIN + sumHook(perks, "scoreFlat", wctx)
                      + (isCrit ? sumHook(perks, "scoreFlatOnCrit", critCtx) + skillSum(skills, "scoreFlatOnCrit", critCtx) : 0)
                      + ionScoreFor(pCard) + stormScore + l5Flat;
    // Score-Stapelung (§15/§22.7): Basis × Serie(#39) × Perk-scoreMult × Serien-Stat × Formations-Multiplikator
    // × Formations-Stat, DANN Crit. Der Positions-/Formations-Mult (§22.7) und der Formations-Stat (§22.3,
    // nur bei aktiver Formation) greifen hier — Crit multipliziert das Ergebnis anschließend.
    scoreBeforeCrit = scoreBase * streakBaseMult(serieStreak) * prodHook(perks, "scoreMult", wctx)
                      * statStreakFactor(statStreakMult, serieStreak)
                      * formationMult
                      * statFormFactor(statFormMult, hasFormation);
    gained = scoreBeforeCrit * (isCrit ? critMultiplier : 1);
    critBonus = gained - scoreBeforeCrit;
    score += gained;
    // Gewitterfront: der genutzte Score-Stack ist verbraucht (nur Siege verbrauchen).
    if (stormScore > 0) lightning = { ...lightning, stormScoreWinsRemaining: lightning.stormScoreWinsRemaining - 1 };
    // Blitz: Ladung bei Crit — Basis +1 (aktiv) + Skill-Boni (Blitzableiter +1; Überspannung +3 bei ionisierter Karte).
    const ionizedCard = (pCard.ionStacks || 0) > 0;
    if (lightning && lightning.active && isCrit) {
      const gainedCharge = 1 + skillSum(skills, "chargeOnCrit", wctx)
                             + (ionizedCard ? skillSum(skills, "chargeOnIonizedCrit", wctx) : 0);
      lightning = addCharge(lightning, gainedCharge);
      // Volle Ladung → Verbraucher-Priorität (Abschnitt 6): Geladene Serie (Rahmen setzen) VOR Ionisierung;
      // bei bereits gesetztem Rahmen greift Ionisierung; Rahmen gesetzt + keine Ionisierung → Ladung „parkt".
      // Reaktoren (Reststrom-Boden, Gewitterfront) laufen bei JEDEM tatsächlichen Verbrauch.
      if (lightning.charge >= lightning.maxCharge) {
        let consumed = false;
        if (hasProtect(skills) && !lightning.armed) {
          lightning = { ...lightning, armed: true };            // Geladene Serie: Serien-Rahmen scharf
          consumed = true;
        } else if (hasIonize(skills)) {
          const undrawn = playerOrder.slice(pos + 1);            // Deck-Indizes der noch nicht gezogenen Karten
          deck = ionizeCards(deck, undrawn, ionizeCountFor(skills), rng);
          consumed = true;
        }
        if (consumed) {
          lightning = consumeCharge(lightning, chargeFloorFor(skills)); // Reststrom: Boden 3, sonst 0
          if (hasStorm(skills)) { // Gewitterfront-Reaktor: erst Crit-Chance (Cap), danach Score für die nächsten Siege
            const cur = lightning.stormCritBonus || 0;
            lightning = cur < C.STORM_CRIT_CAP
              ? { ...lightning, stormCritBonus: Math.min(C.STORM_CRIT_CAP, cur + C.STORM_CRIT_STEP) }
              : { ...lightning, stormScoreWinsRemaining: C.STORM_SCORE_WINS };
          }
        }
      }
    }
    // Nach einem Sieg mit einer ionisierten Karte: diese Karte +1 Stapel (max); der Bonus wurde oben VORHER gewertet.
    if (ionizedCard) {
      deck = deck.map((c) => (c.id === pCard.id ? { ...c, ionStacks: Math.min(C.ION_MAX_STACKS, (c.ionStacks || 0) + 1) } : c));
    }
    // Crit-Historie: Update NACH dem Wurf (wctx trug den Stand davor).
    critFollowArmed = isCrit;                                        // D14 Crit-Folge: nur ein Crit rüstet den nächsten Sieg
    misfireScore = isCrit ? 0 : Math.min((misfireScore || 0) + 30, 300); // D15: +30 Score-Ladung je Sieg ohne Crit, Crit zahlt aus & setzt zurück
    weaknessArmed = false;                                           // D16 Schwachstellenanalyse: durch diesen Sieg verbraucht
    if (isCrit) {
      crits += 1; critBonusScore += critBonus;
      // L4 Kritische Masse: die kritisch getroffene Karte dauerhaft +1 (max +4 je Karte).
      if (ownsFlag(perks, "critValueGain") && (l4Boost[pCard.id] || 0) < 4) {
        deck = deck.map((c) => (c.id === pCard.id ? { ...c, value: c.value + 1 } : c));
        l4Boost = { ...l4Boost, [pCard.id]: (l4Boost[pCard.id] || 0) + 1 };
      }
      // L10 Kettenreaktion: nach diesem Crit ist der direkte Nachfolger garantiert kritisch (falls er gewinnt).
      if (ownsFlag(perks, "successorCrit")) chainArmed = true;
    }
    bestTrickScore = Math.max(bestTrickScore, gained);
    initiative = "player";
    if (tieConverted) tieArmed = false;
    sinceWin = 0; // #71 Durchbruch: Sieg setzt den Zähler zurück
    lossStreak = 0; // #71 Revanche: Sieg beendet die Niederlagenserie
    lastWinValue = pValue; // #71 Präzision: letzten Siegwert merken (NACH dem Vergleich in wctx)
    // C4/C5: gewinnt eine Relay-Rolle, bekommen die nächsten `relay` Karten +2 (Queue nach dem Verbrauch → Index 0 = nächste Karte).
    for (const id of perks) {
      const relay = PERK_DEFS[id].relay;
      if (relay && isRole(id)) for (let i = 0; i < relay; i++) successorQueue[i] = (successorQueue[i] || 0) + 2;
    }
    // C2 Triumph: gewinnt eine Triumph-Rolle, wird sie fürs nächste Auftauchen armiert.
    if (isRole("C2")) triumphArmed = [...triumphArmed, pCard.id];
    // L8 Schicksalsmaschine: Erfolge je Karte diesen Durchlauf (für den Wert-Tausch am Durchlauf-Ende).
    if (ownsFlag(perks, "swapExtremes")) l8Wins = { ...l8Wins, [pCard.id]: (l8Wins[pCard.id] || 0) + 1 };
    lastResult = "win";
  } else if (lost) {
    losses += 1;
    // Geladene Serie (Stufe C): gesetzter Serien-Rahmen fängt DIESE Niederlage ab — winStreak
    // bleibt erhalten (Serien-Effekte laufen weiter). Sonst bricht die Serie. Der Rahmen wird danach eingelöst.
    const rahmenRedeemed = !!(lightning && lightning.armed);
    winStreak = rahmenRedeemed ? winStreak : 0;
    initiative = "opp";
    if (ownsFlag(perks, "winTieAfterLoss")) tieArmed = true; // B5: nach Niederlage nächsten Gleichstand gewinnen
    sinceWin += 1; // #71 Durchbruch: kein Sieg → Zähler hoch
    lossStreak += 1; // #71 Revanche: aufeinanderfolgende Niederlagen
    if (oValue - pValue >= 5) weaknessArmed = true; // D16 Schwachstellenanalyse: klare Niederlage rüstet nächsten Sieg
    winSuit = null; winSuitStreak = 0; // #71 Farbserie: Niederlage beendet die Farbserie (auch mit Rahmen)
    serieStreak = 0;
    if (rahmenRedeemed) lightning = { ...lightning, armed: false }; // Rahmen eingelöst → entfernt
    lastResult = "loss";
  } else {
    ties += 1;
    sinceWin += 1; // #71 Durchbruch: Gleichstand zählt als „kein Sieg" weiter
    lossStreak = 0; // #71 Revanche: Gleichstand ist keine Niederlage → Serie bricht
    winSuit = null; winSuitStreak = 0; // #71 Farbserie: Gleichstand ist kein Sieg → Serie bricht
    lastResult = "tie";
    // Serie & Initiative unverändert
  }

  // #71 Volles Haus: Ergebnis-Fenster fortschreiben (letzte 4 Ergebnisse für den nächsten Stich).
  recentResults = [...recentResults, lastResult].slice(-4);

  const lastTrick = {
    pCard, oCard, pValue, oValue,
    result: tieConverted ? "win_tie" : won ? "win" : lost ? "loss" : "tie",
    gained, trickNo,
    isCrit, critChance, critMultiplier, scoreBeforeCrit, scoreGain: gained, critBonus,
    jackpot: isCrit && critMultiplier > C.CRIT_BASE_MULT + statCritMult, // Crit-Faktor über der Stat-Basis → verstärkter Float
    // Formations-Multiplikator dieses Stichs (§22.7) + die beteiligten Formationen der Position (Anzeige/Float).
    formationMult: won ? formationMult : 1,
    formations: posForm.formations,
  };

  // Durchlauf-Ende: Score-Effekte am Durchlauf-Ende, dann NUR das Gegnerdeck NEU MISCHEN (Spieler-Reihenfolge
  // bleibt persistent, §22.1) und eine Auswahl anbieten. Nach MAX_CYCLES Durchläufen endet der Run (§22.1).
  pos += 1;
  let phase = "play";
  let newOffer = offer;
  let newSkillOffer = skillOffer;
  let newStatOffer = statOffer;
  let newFormationEnergy = formationEnergy;
  let newFormationSwaps = formationSwaps;
  if (pos >= C.TRICKS_PER_CYCLE) {
    cycle += 1;
    // L8 Schicksalsmaschine: erfolgreichste und erfolgloseste Karte tauschen ihre Dauerwerte.
    if (ownsFlag(perks, "swapExtremes")) {
      let bestId = null, worstId = null, bestW = -1, worstW = Infinity;
      for (const c of deck) { const w = l8Wins[c.id] || 0; if (w > bestW) { bestW = w; bestId = c.id; } if (w < worstW) { worstW = w; worstId = c.id; } }
      if (bestId && worstId && bestId !== worstId && bestW > worstW) {
        const bv = deck.find((c) => c.id === bestId).value, wv = deck.find((c) => c.id === worstId).value;
        deck = deck.map((c) => (c.id === bestId ? { ...c, value: wv } : c.id === worstId ? { ...c, value: bv } : c));
      }
    }
    l5Used = []; l8Wins = {}; // Pro-Durchlauf-States zurücksetzen (L5-Jackpot-Verbrauch, L8-Erfolge)

    if (cycle >= C.MAX_CYCLES) {
      // Run-Ende nach dem letzten Durchlauf (§22.1): kein Neu-Mischen, keine Auswahl mehr.
      phase = "gameover";
    } else {
      // Neuer Durchlauf: NUR das Gegnerdeck neu mischen; Spieler-Reihenfolge bleibt (persistent). pos zurück.
      oppOrder = shuffledOrder(oppDeck.length, rng);
      pos = 0;
      // Entscheidung VOR dem neuen Durchlauf nach dem festen Zyklus (§22.2): DECISION_CYCLE[cycle % 6].
      const decision = C.DECISION_CYCLE[cycle % C.DECISION_CYCLE.length];
      if (decision === "stat") {
        phase = "levelup"; newStatOffer = STAT_IDS; // immer alle vier Stats
      } else if (decision === "skill") {
        const soff = buildSkillOffer(skills, rng, C.SKILLS_OFFERED);
        if (soff.length > 0) { phase = "levelup"; newSkillOffer = soff; }
        else { const off = buildOffer(perks, rng, C.PERKS_OFFERED); if (off.length > 0) { phase = "levelup"; newOffer = off; } } // leerer Skill-Pool → Perk
      } else if (decision === "perk") {
        const off = buildOffer(perks, rng, C.PERKS_OFFERED);
        if (off.length > 0) { phase = "levelup"; newOffer = off; }
      } else if (decision === "formation") {
        // Formationsphase (§22.8): Deck-Aufstellung öffnen, frische Energie (+ E10 Feinjustierung), Vorschau berechnen.
        phase = "formation";
        newFormationEnergy = C.FORMATION_ENERGY + perks.reduce((t, id) => t + (PERK_DEFS[id].extraSwap || 0), 0);
        newFormationSwaps = [];
        formations = computeFormations(playerOrder, deck, roles, perks);
      }
    }
  }

  return {
    ...state, deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
    score, winStreak, bestStreak, wins, losses, ties,
    crits, critBonusScore, bestTrickScore,
    initiative, lastResult, perks, offer: newOffer, tieArmed, sinceWin, lossStreak, lastWinValue, altLen,
    critFollowArmed, weaknessArmed, misfireScore,
    ascRun, lastPlayedValue, winSuit, winSuitStreak, recentResults,
    formations, // Formations-Engine (V2 §22.7): pro-Position-Multiplikatoren, zu Durchlauf-Beginn berechnet
    formationEnergy: newFormationEnergy, formationSwaps: newFormationSwaps, // Formationsphase (V2 §22.8)
    successorQueue, triumphArmed, // Kartenrollen (V2 §22.6 C): C4/C5-Nachfolger-Boni / C2-Triumph-Armierung
    l4Boost, l5Used, l8Wins, chainArmed, pos20Bonus: newPos20Bonus, // Legendaries (V2 §22.6 L)
    roles, // (unverändert vom Reducer gesetzt, hier durchgereicht)
    statOffer: newStatOffer, // Stat-System (V2 §22.3)
    skillOffer: newSkillOffer, lightning, // Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md)
    lastTrick, phase,
  };
}
