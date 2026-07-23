import * as C from "./constants.js";
import { shuffledOrder } from "./deck.js";
import { PERK_DEFS, buildOffer, critChanceRawFor, comboMultFor, tempoScoreMultFor, critMultiplierFor, streakBaseMult } from "./perks.js";
import { skillSum, lightningCritRaw, addCharge, buildSkillOffer } from "./skills.js";

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
    life, maxLife, score, winStreak, bestStreak, wins, losses, ties,
    initiative, lastResult, perks, offer, shield, tieArmed, sinceWin = 0,
    lossStreak = 0, lastWinValue = null, altLen = 0, // #71 Rares: Revanche / Präzision / Wechselspiel
    critFollowArmed = false, misfireBonus = 0, weaknessArmed = false, // #71 Crit-Historie: Crit-Folge / Fehlzündung / Schwachstellenanalyse
    cleanStreak = 0, notfallUsed = false, // #71 Per-Durchlauf: Sauberer Durchlauf (Zähler) / Notfallration (1×/Durchlauf)
    ascRun = 0, lastPlayedValue = null, // #71 Perfekte Folge: aufsteigende Wertfolge
    winSuit = null, winSuitStreak = 0, // #71 Farbserie: gleicher-Farbe-Siegesserie
    recentResults = [], // #71 Volles Haus: die letzten (bis zu 4) Ergebnisse VOR diesem Stich
    overStreak = 0, // #71 Überzahl: effektive Serie für Serien-Effekte (klare Siege zählen doppelt)
    rampTempo = 0, calmTricks = 0, tempTempo = 0, // #71 Tempo: Hochlauf (Rampe) / Ruhe vor dem Sturm (Burst) / effektives Temp-Tempo
    fateValue = null, bloodStacks = 0, zeitrafferStacks = 0, // #71 Legendaries: Schicksalsmaschine / Blutvertrag / Zeitraffer
    crits, critBonusScore, bestTrickScore, legendaryCritBonus = 0,
    skills = [], skillOffer = null, lightning = null, // Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md)
  } = state;

  const pCard = deck[playerOrder[pos]];
  const oCard = oppDeck[oppOrder[pos]];

  trickNo += 1;
  // #71 Perfekte Folge: Länge der aktuell streng ansteigenden Wertfolge INKL. dieser Karte (Basiswert).
  // Gleicher/niedrigerer Wert beginnt die Folge neu. State für den nächsten Stich sofort fortschreiben.
  const ascChain = (lastPlayedValue != null && pCard.value > lastPlayedValue) ? (ascRun || 0) + 1 : 1;
  ascRun = ascChain;
  lastPlayedValue = pCard.value;
  // #71 Volles Haus: Siege in den (bis zu 4) Stichen VOR diesem — inkl. aktuellem Sieg = Fenster 5.
  const recentWinCount = recentResults.filter((r) => r === "win").length;
  // #71 Phase-2e-Flags einmal auflösen (Überzahl / Hochlauf / Ruhe vor dem Sturm).
  const ownsUeberzahl = ownsFlag(perks, "ueberzahl");
  const ownsHochlauf = ownsFlag(perks, "hochlauf");
  const ownsRuhe = ownsFlag(perks, "ruheVorDemSturm");
  // #71 Überzahl: effektive Serie für Serien-Effekte (Stand VOR dem Stich). Ohne Perk == winStreak.
  let serieStreak = ownsUeberzahl ? (overStreak || 0) : winStreak;
  // #71 Temp-Tempo dieses Stichs (Stand aus dem letzten Stich — identisch zu dem Wert, den App für flipMs nutzte).
  const curTempTempo = tempTempo || 0;
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

  // #71 Wechselspiel: Länge der aktuellen strikten Sieg/Niederlage-Alternation (Gleichstand bricht sie).
  const curRes = won ? "win" : lost ? "loss" : "tie";
  altLen = curRes === "tie" ? 0
    : (curRes !== lastResult && (lastResult === "win" || lastResult === "loss")) ? altLen + 1 : 1;

  let gained = 0, dmg = 0, healed = 0;
  let isCrit = false, superCrit = false, critChance = 0, critMultiplier = C.CRIT_BASE_MULT, scoreBeforeCrit = 0, critBonus = 0;

  if (won) {
    winStreak += 1; wins += 1;
    if (winStreak > bestStreak) bestStreak = winStreak; // längste Serie des Runs (#8)
    // #71 Überzahl: klarer Sieg (Vorsprung ≥5) zählt für Serien-Effekte als zwei Stufen (nicht für wins/XP/Heilung).
    overStreak = (overStreak || 0) + (ownsUeberzahl && pValue - oValue >= 5 ? 2 : 1);
    serieStreak = ownsUeberzahl ? overStreak : winStreak; // effektive Serie NACH diesem Sieg
    // winStreak/wins enthalten hier bereits den gerade gewonnenen Stich.
    // #71 Farbserie: Länge der Serie gewonnener Stiche gleicher Farbe INKL. dieses Siegs.
    const suitStreak = pCard.suit === winSuit ? winSuitStreak + 1 : 1;
    const wctx = { winValue: pValue, margin: pValue - oValue, winStreak: serieStreak, wins, trickNo, posInCycle: pos, speedPct: state.speedPct || 0,
                   lastWinValue, altLen, // #71: Präzision (Vergleich mit letztem Siegwert) / Wechselspiel
                   critFollowArmed, misfireBonus, weaknessArmed, // #71 Crit-Historie: Stand VOR diesem Sieg (feed critChance-Hooks)
                   suitStreak, recentWinCount, // #71 Farbserie / Volles Haus
                   baseValue: pCard.value, fateValue, bloodStacks, zeitrafferStacks }; // #71 Legendaries: Schicksalsmaschine / Blutvertrag / Zeitraffer
    winSuit = pCard.suit; winSuitStreak = suitStreak; // Farbserie fortschreiben
    // Crit ZUERST bestimmen — die Blitz-Crit-Flats (scoreFlatOnCrit) müssen in die multiplizierte Basis.
    // Der Crit-Wurf verbraucht rng nur, wenn wirklich gewürfelt wird → rng-Reihenfolge unverändert (kein Drift).
    // Blitz-Crit-Basis (Abschnitt 2a) wird additiv zugerechnet, unabhängig von L5-critChanceMult.
    const rawCrit = critChanceRawFor(perks, wctx, legendaryCritBonus) + lightningCritRaw(lightning, skills); // ungeklemmt (Überschusskrit)
    critChance = Math.min(1, Math.max(0, rawCrit));             // Anzeige/normaler Wurf (geklemmt), inkl. L4/L5 + Blitz-Basis
    critMultiplier = critMultiplierFor(perks, wctx);             // L5 „Jackpot": ×4 überschreibt Basis ×2
    isCrit = rollCrit(critChance, ownsGuaranteedCrit(perks, wctx), rng);
    // #71 Überschusskrit: Crit-Chance über 100 % → Chance (= Überschuss) auf einen Super-Crit (×1,5 auf den Crit-Faktor).
    if (isCrit && ownsFlag(perks, "superCrit") && rawCrit > 1) {
      const excess = Math.min(rawCrit - 1, 1);
      if (rng() < excess) { superCrit = true; critMultiplier *= C.SUPERCRIT_MULT_FACTOR; }
    }
    // #71 Kettenreaktion (L10): nach einem Crit erneute Würfe mit HALBER finaler Crit-Chance; je Treffer
    // verdoppelt sich der Crit-Faktor (×2→×4→×8→×16), max 3 Zusatzstufen. Bricht beim ersten Fehlwurf ab.
    if (isCrit && ownsFlag(perks, "chainCrit")) {
      const chainChance = critChance / 2;
      for (let i = 0; i < C.CHAIN_MAX_STAGES; i++) { if (rng() < chainChance) critMultiplier *= 2; else break; }
    }
    // Score (globale Formel): additive Boni — inkl. Crit-only-Flats (Blitzableiter +50) — fließen in die BASIS
    // und werden mitmultipliziert: (SCORE_PER_WIN + Σ scoreFlat [+ Σ scoreFlatOnCrit bei Crit])
    // × Basis-Serien-Mult (#39, immer) × Perk-scoreMult × Tempo, DANN Crit-Faktor.
    // #71 Hochlauf/Ruhe: temporäres Tempo zählt zusätzlich zum permanenten speedPct für den Tempo-Score.
    const tempoScoreMult = tempoScoreMultFor(perks, (state.speedPct || 0) + curTempTempo); // L6 „Raserei": Tempo-Faktor ×2
    const scoreBase = C.SCORE_PER_WIN + sumHook(perks, "scoreFlat", wctx)
                      + (isCrit ? skillSum(skills, "scoreFlatOnCrit", wctx) : 0);
    scoreBeforeCrit = scoreBase * streakBaseMult(serieStreak) * prodHook(perks, "scoreMult", wctx) * tempoScoreMult;
    gained = scoreBeforeCrit * (isCrit ? critMultiplier : 1);
    critBonus = gained - scoreBeforeCrit;
    score += gained;
    // Blitz: Ladung bei Crit — Basis +1 (solange Archetyp aktiv) plus Skill-Boni (Blitzableiter +1). Gedeckelt (max 10).
    if (lightning && lightning.active && isCrit) {
      lightning = addCharge(lightning, 1 + skillSum(skills, "chargeOnCrit", wctx));
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
    healed = sumHook(perks, "healOnWin", wctx) + (isCrit ? sumHook(perks, "healOnCrit", wctx) : 0); // #71 D11: Crit heilt
    life = Math.min(maxLife, life + healed);
    initiative = "player";
    if (tieConverted) tieArmed = false;
    sinceWin = 0; // #71 Durchbruch: Sieg setzt den Zähler zurück
    lossStreak = 0; // #71 Revanche: Sieg beendet die Niederlagenserie
    lastWinValue = pValue; // #71 Präzision: letzten Siegwert merken (NACH dem Vergleich in wctx)
    lastResult = "win";
  } else if (lost) {
    losses += 1; winStreak = 0;
    // Grundschaden + Durchlauf-Aufschlag (#87): DMG_PER_LOSS + lifeDrainAt(cycle) — je Deck-Durchlauf kostet
    // jede Niederlage mehr (round(0,5·cycle²)). Zeitdruck läuft über den Fortschritt, nicht über Echtzeit
    // → Tempo neutral. Legendär-Zusatzschaden (L1/L6/E7) addiert; dmgReduce (C3/C6) zieht ab, Schild (C5) danach.
    // #89: dmgReduce sieht jetzt den eingehenden Gesamtschaden (`incoming`) → prozentuale Reduktion (C3/C6)
    // skaliert mit der Eskalation, kann aber nie ganz negieren.
    const grossDmg = C.DMG_PER_LOSS + C.lifeDrainAt(cycle) + sumHook(perks, "extraDamageTaken", {});
    dmg = Math.max(0, grossDmg - sumHook(perks, "dmgReduce", { life, maxLife, incoming: grossDmg }));
    // Schild (C5) absorbiert NACH der Schadensberechnung, vor dem Leben.
    if (shield > 0 && dmg > 0) { const absorbed = Math.min(shield, dmg); shield -= absorbed; dmg -= absorbed; }
    life -= dmg;
    initiative = "opp";
    if (ownsFlag(perks, "winTieAfterLoss")) tieArmed = true;
    sinceWin += 1; // #71 Durchbruch: kein Sieg → Zähler hoch
    lossStreak += 1; // #71 Revanche: aufeinanderfolgende Niederlagen
    if (oValue - pValue >= 5) weaknessArmed = true; // #71 Schwachstellenanalyse: klare Niederlage rüstet nächsten Sieg
    winSuit = null; winSuitStreak = 0; // #71 Farbserie: Niederlage beendet die Farbserie
    overStreak = 0; serieStreak = 0; // #71 Überzahl: Niederlage beendet die (effektive) Serie
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

  // #71 Temp-Tempo fortschreiben (Hochlauf-Rampe / Ruhe-Burst) → in tempTempo für App-Flip + nächsten Tempo-Score.
  if (ownsHochlauf) rampTempo = won ? Math.min(rampTempo + C.RAMP_TEMPO_STEP, C.RAMP_TEMPO_CAP)
                                : lost ? Math.max(rampTempo - C.RAMP_TEMPO_LOSS, 0) : rampTempo;
  if (ownsRuhe && curRes === "tie") calmTricks = C.CALM_TRICKS; // Gleichstand startet/erneuert den Burst
  else if (calmTricks > 0) calmTricks -= 1;                     // sonst einen schnellen Stich verbrauchen
  tempTempo = (ownsHochlauf ? rampTempo : 0) + (ownsRuhe && calmTricks > 0 ? C.CALM_TEMPO_PCT : 0);

  // #71 Sauberer Durchlauf (C8): Stiche in Folge OHNE echten Lebensverlust (voll vom Schild absorbiert
  // zählt nicht als Verlust). Erreicht der Zähler die Schwelle → heilen und zurücksetzen.
  const lostLife = dmg > 0;
  cleanStreak = lostLife ? 0 : cleanStreak + 1;
  if (ownsFlag(perks, "cleanRunHeal") && cleanStreak >= C.CLEAN_RUN_TRICKS && life > 0) {
    const add = Math.min(maxLife - life, C.CLEAN_RUN_HEAL);
    life += add; healed += add; cleanStreak = 0;
  }
  // #71 Notfallration (C10): erstes Mal je Durchlauf bei ≤25 % Leben sofort heilen (rettet nicht vor Tod).
  if (ownsFlag(perks, "emergencyHeal") && !notfallUsed && life > 0 && maxLife > 0 && life / maxLife <= 0.25) {
    const add = Math.min(maxLife - life, C.EMERGENCY_HEAL);
    life += add; healed += add; notfallUsed = true;
  }

  const lastTrick = {
    pCard, oCard, pValue, oValue,
    result: tieConverted ? "win_tie" : won ? "win" : lost ? "loss" : "tie",
    gained, dmg, healed, trickNo,
    isCrit, superCrit, critChance, critMultiplier, scoreBeforeCrit, scoreGain: gained, critBonus,
    jackpot: isCrit && critMultiplier > C.CRIT_BASE_MULT, // L5 „Jackpot" / Super-Crit → verstärkter Float
    // D2-Kombo-Wert der resultierenden Serie (geteilte Quelle → kein Drift zur Score-Berechnung, #31).
    // 1 ohne D2; bei Niederlage/Gleichstand irrelevant (Anzeige nur bei Sieg ab ×1,5).
    // Überzahl: die effektive Serie (serieStreak) speist auch die Anzeige → kein Drift zum Score.
    comboMult: comboMultFor(perks, serieStreak),
  };

  // Tod? — sofort beenden (kein Weiterziehen / Level-Up / KEINE Ansage-Auswertung, #36).
  // Eine aktive Ansage gilt als „nicht abgeschlossen", nicht als verfehlt → kein Bonus/Malus.
  if (life <= 0) {
    return {
      ...state, deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
      life: 0, score, winStreak, bestStreak, wins, losses, ties,
      crits, critBonusScore, bestTrickScore, legendaryCritBonus,
      initiative, lastResult, offer, shield, tieArmed, sinceWin, lossStreak, lastWinValue, altLen,
      critFollowArmed, misfireBonus, weaknessArmed, cleanStreak, notfallUsed,
      ascRun, lastPlayedValue, winSuit, winSuitStreak, recentResults,
      overStreak, rampTempo, calmTricks, tempTempo,
      fateValue, bloodStacks, zeitrafferStacks,
      lastTrick, phase: "gameover",
    };
  }

  // Durchlauf-Ende: Heilung/per-Durchlauf-Effekte + Schild, dann NEU MISCHEN (pos→0) und eine
  // Perk-Auswahl anbieten (ersetzt XP-Level-Up + Ansage): nach jeder Runde ein Perk (Neuer Loop).
  pos += 1;
  let phase = "play";
  let newOffer = offer;
  let newSkillOffer = skillOffer;
  if (pos >= C.TRICKS_PER_CYCLE) {
    cycle += 1;
    const ch = sumHook(perks, "healOnCycle", { deck }); // C7 Überlebensvorteil liest das Deck (Karten ≥13)
    if (ch > 0) life = Math.min(maxLife, life + ch);
    // #71 Opfergabe (C9): zu Beginn jedes Durchlaufs −30 Leben (kann nicht töten → min 1); +20 % Score via scoreMult.
    if (ownsFlag(perks, "sacrificeCycle")) life = Math.max(1, life - C.SACRIFICE_LIFE);
    // #71 Blutvertrag (L9): je Durchlauf 100 Leben opfern → dauerhaft +20 % Score (max 5×). Nur bei >100 Leben (kann nicht töten).
    if (ownsFlag(perks, "bloodPact") && life > C.BLOOD_SACRIFICE && bloodStacks < C.BLOOD_MAX_STACKS) {
      life -= C.BLOOD_SACRIFICE; bloodStacks += 1;
    }
    // #71 Zeitraffer (L11): je vollem Durchlauf +10 % Score (max +50 %); reale Speed ×2 läuft in App.jsx.
    if (ownsFlag(perks, "zeitraffer") && zeitrafferStacks < C.ZEITRAFFER_MAX_STACKS) zeitrafferStacks += 1;
    // #71 Schicksalsmaschine (L8): einen aktuell vorhandenen Kartenwert zufällig bestimmen (Deck-Werte).
    // rng-Zug NUR bei gehaltenem Perk → Determinismus/rng-Reihenfolge für andere Builds unberührt.
    if (ownsFlag(perks, "schicksal")) {
      const vals = [...new Set(deck.map((c) => c.value))];
      fateValue = vals.length ? vals[Math.floor(rng() * vals.length)] : null;
    }
    notfallUsed = false; // #71 Notfallration (C10): 1× je Durchlauf → beim Durchlauf-Wechsel zurücksetzen
    shield = perks.reduce((m, id) => Math.max(m, PERK_DEFS[id].shieldPerCycle || 0), 0); // C5: Schild je Durchlauf (kein Stapeln)
    // Neuer Durchlauf: neu mischen + pos zurück (früher bei SUBMIT_PREDICTION).
    playerOrder = shuffledOrder(deck.length, rng);
    oppOrder = shuffledOrder(oppDeck.length, rng);
    pos = 0;
    // Auswahl nach jeder Runde (kein Level-Gate): jede SKILL_EVERY_CYCLES-te Runde eine Skill-Auswahl,
    // sonst ein Perk. Leerer Skill-Pool → auf Perk-Angebot zurückfallen (Runde nie „verschwendet"). Pool leer → keine Pause.
    if (cycle % C.SKILL_EVERY_CYCLES === 0) {
      const soff = buildSkillOffer(skills, rng, C.SKILLS_OFFERED);
      if (soff.length > 0) { phase = "levelup"; newSkillOffer = soff; }
      else { const off = buildOffer(perks, rng, C.PERKS_OFFERED); if (off.length > 0) { phase = "levelup"; newOffer = off; } }
    } else {
      const off = buildOffer(perks, rng, C.PERKS_OFFERED);
      if (off.length > 0) { phase = "levelup"; newOffer = off; }
    }
  }

  return {
    ...state, deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
    life, maxLife, score, winStreak, bestStreak, wins, losses, ties,
    crits, critBonusScore, bestTrickScore, legendaryCritBonus,
    initiative, lastResult, perks, offer: newOffer, shield, tieArmed, sinceWin, lossStreak, lastWinValue, altLen,
    critFollowArmed, misfireBonus, weaknessArmed, cleanStreak, notfallUsed,
    ascRun, lastPlayedValue, winSuit, winSuitStreak, recentResults,
    overStreak, rampTempo, calmTricks, tempTempo,
    fateValue, bloodStacks, zeitrafferStacks,
    skillOffer: newSkillOffer, lightning, // Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md)
    lastTrick, phase,
  };
}
