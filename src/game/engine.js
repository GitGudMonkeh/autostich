import * as C from "./constants.js";
import { shuffledOrder } from "./deck.js";
import { PERK_DEFS, buildOffer, critChanceRawFor, comboMultFor, critMultiplierFor, streakBaseMult } from "./perks.js";
import { skillSum, lightningCritRaw, addCharge, buildSkillOffer, ionScoreFor, ionizeCountFor, consumeCharge, ionizeCards,
  hasIonize, hasProtect, hasStorm, chargeFloorFor } from "./skills.js";
import { STAT_IDS, statStreakFactor, statFormFactor } from "./stats.js";
import { computeFormations, positionHasFormation } from "./formations.js";

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
    critFollowArmed = false, misfireBonus = 0, weaknessArmed = false, // #71 Crit-Historie: Crit-Folge / Fehlzündung / Schwachstellenanalyse
    ascRun = 0, lastPlayedValue = null, // #71 Perfekte Folge: aufsteigende Wertfolge
    winSuit = null, winSuitStreak = 0, // #71 Farbserie: gleicher-Farbe-Siegesserie
    recentResults = [], // #71 Volles Haus: die letzten (bis zu 4) Ergebnisse VOR diesem Stich
    overStreak = 0, // #71 Überzahl: effektive Serie für Serien-Effekte (klare Siege zählen doppelt)
    fateValue = null, zeitrafferStacks = 0, // #71 Legendaries: Schicksalsmaschine / Zeitraffer (Score-Stapel)
    statCritChance = 0, statCritMult = 0, statFormMult = 0, statStreakMult = 0, statOffer = null, // Stat-System (V2 §22.3)
    crits, critBonusScore, bestTrickScore, legendaryCritBonus = 0,
    skills = [], skillOffer = null, lightning = null, // Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md)
  } = state;

  const pCard = deck[playerOrder[pos]];
  const oCard = oppDeck[oppOrder[pos]];

  // Formationen (V2 §22.7): zu Durchlauf-Beginn (pos 0) aus der persistenten Reihenfolge + Dauerwerten
  // berechnet und für den ganzen Durchlauf stabil gehalten. Greifen bei Sieg der jeweiligen Karte.
  let formations = state.formations || [];
  if (pos === 0) formations = computeFormations(playerOrder, deck);
  const posForm = formations[pos] || { mult: 1, formations: [] };
  const formationMult = posForm.mult || 1;
  const hasFormation = positionHasFormation(posForm);

  trickNo += 1;
  // #71 Perfekte Folge: Länge der aktuell streng ansteigenden Wertfolge INKL. dieser Karte (Basiswert).
  // Gleicher/niedrigerer Wert beginnt die Folge neu. State für den nächsten Stich sofort fortschreiben.
  const ascChain = (lastPlayedValue != null && pCard.value > lastPlayedValue) ? (ascRun || 0) + 1 : 1;
  ascRun = ascChain;
  lastPlayedValue = pCard.value;
  // #71 Volles Haus: Siege in den (bis zu 4) Stichen VOR diesem — inkl. aktuellem Sieg = Fenster 5.
  const recentWinCount = recentResults.filter((r) => r === "win").length;
  // #71 Überzahl einmal auflösen.
  const ownsUeberzahl = ownsFlag(perks, "ueberzahl");
  // #71 Überzahl: effektive Serie für Serien-Effekte (Stand VOR dem Stich). Ohne Perk == winStreak.
  let serieStreak = ownsUeberzahl ? (overStreak || 0) : winStreak;
  const ctx = {
    posInCycle: pos,
    trickNo,
    lastResult,
    lostLastTrick: lastResult === "loss",
    winStreak: serieStreak, // #71 Überzahl: Serien-Effekte (B2 Momentum) sehen die effektive Serie
    sinceWin, // #71 Durchbruch: Stiche ohne Sieg (Stand VOR diesem Stich)
    lossStreak, // #71 Revanche: aufeinanderfolgende Niederlagen (Stand VOR diesem Stich)
    ascChain, // #71 Perfekte Folge
    fateValue, // #71 Schicksalsmaschine: cardBonus vergleicht pValueBase mit dem Schicksalswert
  };
  const pValue = effectivePlayerValue(pCard.value, perks, ctx);
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
  let isCrit = false, superCrit = false, critChance = 0, critMultiplier = C.CRIT_BASE_MULT, scoreBeforeCrit = 0, critBonus = 0;

  if (won) {
    winStreak += 1; wins += 1;
    if (winStreak > bestStreak) bestStreak = winStreak; // längste Serie des Runs (#8)
    // #71 Überzahl: klarer Sieg (Vorsprung ≥5) zählt für Serien-Effekte als zwei Stufen (nicht für wins).
    overStreak = (overStreak || 0) + (ownsUeberzahl && pValue - oValue >= 5 ? 2 : 1);
    serieStreak = ownsUeberzahl ? overStreak : winStreak; // effektive Serie NACH diesem Sieg
    // winStreak/wins enthalten hier bereits den gerade gewonnenen Stich.
    // #71 Farbserie: Länge der Serie gewonnener Stiche gleicher Farbe INKL. dieses Siegs.
    const suitStreak = pCard.suit === winSuit ? winSuitStreak + 1 : 1;
    const wctx = { winValue: pValue, margin: pValue - oValue, winStreak: serieStreak, wins, trickNo, posInCycle: pos,
                   lastWinValue, altLen, // #71: Präzision (Vergleich mit letztem Siegwert) / Wechselspiel
                   critFollowArmed, misfireBonus, weaknessArmed, // #71 Crit-Historie: Stand VOR diesem Sieg (feed critChance-Hooks)
                   suitStreak, recentWinCount, // #71 Farbserie / Volles Haus
                   baseValue: pCard.value, fateValue, zeitrafferStacks }; // #71 Legendaries: Schicksalsmaschine / Zeitraffer
    winSuit = pCard.suit; winSuitStreak = suitStreak; // Farbserie fortschreiben
    // Crit ZUERST bestimmen — die Blitz-Crit-Flats (scoreFlatOnCrit) müssen in die multiplizierte Basis.
    // Der Crit-Wurf verbraucht rng nur, wenn wirklich gewürfelt wird → rng-Reihenfolge unverändert (kein Drift).
    // Blitz-Crit-Basis (Abschnitt 2a) wird additiv zugerechnet, unabhängig von L5-critChanceMult.
    // Crit-Chance-Stat (V2 §22.3) fließt additiv in die Roh-Chance (mit Perk-/Blitz-Basis); ungeklemmt (Überschusskrit).
    const rawCrit = critChanceRawFor(perks, wctx, legendaryCritBonus) + lightningCritRaw(lightning, skills) + statCritChance;
    critChance = Math.min(1, Math.max(0, rawCrit));             // Anzeige/normaler Wurf (geklemmt), inkl. L4/L5 + Blitz-Basis
    critMultiplier = critMultiplierFor(perks, wctx, statCritMult); // Basis 1,5 + Crit-Mult-Stat; L5 „Jackpot": ×4 überschreibt
    isCrit = rollCrit(critChance, ownsGuaranteedCrit(perks, wctx), rng);
    // #71 Überschusskrit: Crit-Chance über 100 % → Chance (= Überschuss) auf einen Super-Crit (×1,5 auf den Crit-Faktor).
    if (isCrit && ownsFlag(perks, "superCrit") && rawCrit > 1) {
      const excess = Math.min(rawCrit - 1, 1);
      if (rng() < excess) { superCrit = true; critMultiplier *= C.SUPERCRIT_MULT_FACTOR; }
    }
    // #71 Kettenreaktion (L10): nach einem Crit erneute Würfe mit HALBER finaler Crit-Chance; je Treffer
    // verdoppelt sich der Crit-Faktor, max 3 Zusatzstufen. Bricht beim ersten Fehlwurf ab.
    if (isCrit && ownsFlag(perks, "chainCrit")) {
      const chainChance = critChance / 2;
      for (let i = 0; i < C.CHAIN_MAX_STAGES; i++) { if (rng() < chainChance) critMultiplier *= 2; else break; }
    }
    // Score (globale Formel): additive Boni — inkl. Crit-only-Flats (Blitzableiter +50) — fließen in die BASIS
    // und werden mitmultipliziert: (SCORE_PER_WIN + Σ scoreFlat [+ Σ scoreFlatOnCrit bei Crit])
    // × Basis-Serien-Mult (#39, immer) × Perk-scoreMult, DANN Crit-Faktor.
    // Ionisierung: Score der gespielten Karte (Stapel VOR dem Zuwachs). Gewitterfront: +100 für die nächsten Siege.
    const stormScore = (lightning && (lightning.stormScoreWinsRemaining || 0) > 0) ? C.STORM_SCORE : 0;
    const scoreBase = C.SCORE_PER_WIN + sumHook(perks, "scoreFlat", wctx)
                      + (isCrit ? skillSum(skills, "scoreFlatOnCrit", wctx) : 0)
                      + ionScoreFor(pCard) + stormScore;
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
    // #71 Crit-Historie: Update NACH dem Wurf (wctx trug den Stand davor).
    critFollowArmed = isCrit;                                        // Crit-Folge: nur ein Crit rüstet den nächsten Sieg
    misfireBonus = isCrit ? 0 : Math.min(misfireBonus + 0.03, 0.30); // Fehlzündung: +3 pp je Sieg ohne Crit, Crit setzt zurück
    weaknessArmed = false;                                           // Schwachstellenanalyse: durch diesen Sieg verbraucht
    if (isCrit) {
      crits += 1; critBonusScore += critBonus;
      // L4 „Kritische Masse": Bonus NACH dem Wurf erhöhen (nicht rückwirkend), dauerhaft gedeckelt.
      if (ownsFlag(perks, "legendaryCritGain")) legendaryCritBonus = Math.min(legendaryCritBonus + C.L4_CRIT_STEP, C.L4_CRIT_CAP);
    }
    bestTrickScore = Math.max(bestTrickScore, gained);
    initiative = "player";
    if (tieConverted) tieArmed = false;
    sinceWin = 0; // #71 Durchbruch: Sieg setzt den Zähler zurück
    lossStreak = 0; // #71 Revanche: Sieg beendet die Niederlagenserie
    lastWinValue = pValue; // #71 Präzision: letzten Siegwert merken (NACH dem Vergleich in wctx)
    lastResult = "win";
  } else if (lost) {
    losses += 1;
    // Geladene Serie (Stufe C): gesetzter Serien-Rahmen fängt DIESE Niederlage ab — winStreak/overStreak
    // bleiben erhalten (Serien-Effekte laufen weiter). Sonst bricht die Serie. Der Rahmen wird danach eingelöst.
    const rahmenRedeemed = !!(lightning && lightning.armed);
    winStreak = rahmenRedeemed ? winStreak : 0;
    initiative = "opp";
    if (ownsFlag(perks, "winTieAfterLoss")) tieArmed = true;
    sinceWin += 1; // #71 Durchbruch: kein Sieg → Zähler hoch
    lossStreak += 1; // #71 Revanche: aufeinanderfolgende Niederlagen
    if (oValue - pValue >= 5) weaknessArmed = true; // #71 Schwachstellenanalyse: klare Niederlage rüstet nächsten Sieg
    winSuit = null; winSuitStreak = 0; // #71 Farbserie: Niederlage beendet die Farbserie (auch mit Rahmen)
    if (!rahmenRedeemed) overStreak = 0; // #71 Überzahl: Niederlage beendet die effektive Serie (außer geschützt)
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
    isCrit, superCrit, critChance, critMultiplier, scoreBeforeCrit, scoreGain: gained, critBonus,
    jackpot: isCrit && critMultiplier > C.CRIT_BASE_MULT + statCritMult, // L5 „Jackpot" / Super-Crit über der Stat-Basis → verstärkter Float
    // Formations-Multiplikator dieses Stichs (§22.7) + die beteiligten Formationen der Position (Anzeige/Float).
    formationMult: won ? formationMult : 1,
    formations: posForm.formations,
    // D2-Kombo-Wert der resultierenden Serie (geteilte Quelle → kein Drift zur Score-Berechnung, #31).
    // Überzahl: die effektive Serie (serieStreak) speist auch die Anzeige → kein Drift zum Score.
    comboMult: comboMultFor(perks, serieStreak),
  };

  // Durchlauf-Ende: Score-Effekte am Durchlauf-Ende, dann NUR das Gegnerdeck NEU MISCHEN (Spieler-Reihenfolge
  // bleibt persistent, §22.1) und eine Auswahl anbieten. Nach MAX_CYCLES Durchläufen endet der Run (§22.1).
  pos += 1;
  let phase = "play";
  let newOffer = offer;
  let newSkillOffer = skillOffer;
  let newStatOffer = statOffer;
  if (pos >= C.TRICKS_PER_CYCLE) {
    cycle += 1;
    // #71 Zeitraffer (L11): je vollem Durchlauf +10 % Score (max +50 %).
    if (ownsFlag(perks, "zeitraffer") && zeitrafferStacks < C.ZEITRAFFER_MAX_STACKS) zeitrafferStacks += 1;
    // #71 Schicksalsmaschine (L8): einen aktuell vorhandenen Kartenwert zufällig bestimmen (Deck-Werte).
    // rng-Zug NUR bei gehaltenem Perk → Determinismus/rng-Reihenfolge für andere Builds unberührt.
    if (ownsFlag(perks, "schicksal")) {
      const vals = [...new Set(deck.map((c) => c.value))];
      fateValue = vals.length ? vals[Math.floor(rng() * vals.length)] : null;
    }

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
      }
      // decision === "formation": die Formations-Phase folgt in Phase 4 — vorerst kein Halt, weiterspielen.
    }
  }

  return {
    ...state, deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
    score, winStreak, bestStreak, wins, losses, ties,
    crits, critBonusScore, bestTrickScore, legendaryCritBonus,
    initiative, lastResult, perks, offer: newOffer, tieArmed, sinceWin, lossStreak, lastWinValue, altLen,
    critFollowArmed, misfireBonus, weaknessArmed,
    ascRun, lastPlayedValue, winSuit, winSuitStreak, recentResults,
    overStreak, fateValue, zeitrafferStacks,
    formations, // Formations-Engine (V2 §22.7): pro-Position-Multiplikatoren, zu Durchlauf-Beginn berechnet
    statOffer: newStatOffer, // Stat-System (V2 §22.3)
    skillOffer: newSkillOffer, lightning, // Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md)
    lastTrick, phase,
  };
}
