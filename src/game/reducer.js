import { buildDeck, shuffledOrder } from "./deck.js";
import { PERK_DEFS, buildOffer } from "./perks.js";
import { resolveTrick } from "./engine.js";
import { START_LIFE, PREDICTION_MIN, PREDICTION_MAX, PERKS_OFFERED } from "./constants.js";
import * as C from "./constants.js";

/* Reiner Reducer — Determinismus-Invariante: kein Math.random / Date hier drin.
   Zufall kommt als Action-Payload (rng), siehe App.jsx. Phasen:
   play → levelup → play … → gameover. */
export function initialState(rng = Math.random) {
  const deck = buildDeck();
  const oppDeck = buildDeck();
  return {
    phase: "play",
    deck, oppDeck,                                    // deck = Spieler (perk-modifizierbar)
    playerOrder: shuffledOrder(deck.length, rng),     // Ziehreihenfolge dieses Durchlaufs
    oppOrder: shuffledOrder(oppDeck.length, rng),
    pos: 0, cycle: 0, trickNo: 0,
    life: START_LIFE, maxLife: START_LIFE,
    xp: 0, level: 1, score: 0,
    winStreak: 0, bestStreak: 0, wins: 0, losses: 0, ties: 0,
    crits: 0, critBonusScore: 0, bestTrickScore: 0,
    legendaryCritBonus: 0, // L4 „Kritische Masse": akkumulierter, dauerhafter Crit-Chance-Bonus (#33)
    // Ansage-System (#36) — erster Durchlauf ohne Ansage
    cycleWins: 0, cycleBaseScore: 0, prediction: null, lastPrediction: null,
    lastPredictionResult: null, predictionBonusScore: 0, exactPredictions: 0,
    nearPredictions: 0, largestPredictionBonus: 0, predictionDue: false,
    initiative: "player",
    lastResult: null,
    sinceWin: 0, // #71 Durchbruch: aufeinanderfolgende Stiche ohne Sieg
    lossStreak: 0, lastWinValue: null, altLen: 0, // #71 Rares: Revanche / Präzision / Wechselspiel
    critFollowArmed: false, misfireBonus: 0, weaknessArmed: false, // #71 Crit-Historie: Crit-Folge / Fehlzündung / Schwachstellenanalyse
    cleanStreak: 0, notfallUsed: false, // #71 Per-Durchlauf: Sauberer Durchlauf / Notfallration
    ascRun: 0, lastPlayedValue: null, winSuit: null, winSuitStreak: 0, recentResults: [], // #71 Historie: Perfekte Folge / Farbserie / Volles Haus
    overStreak: 0, rampTempo: 0, calmTricks: 0, tempTempo: 0, // #71 Phase 2e: Überzahl / Hochlauf / Ruhe vor dem Sturm
    fateValue: null, bloodStacks: 0, zeitrafferStacks: 0, kingBoosted: [], // #71 Phase 3 Legendaries: Schicksalsmaschine / Blutvertrag / Zeitraffer / Königsmacher
    perks: [], offer: null,
    pendingLevelUps: 0, // #57: noch ausstehende Level-Up-Angebote (Mehrfach-Level-Up-Queue)
    speedPct: 0,
    shield: 0,
    tieArmed: false,
    lastTrick: null,
  };
}

// Menü-/Startbildschirm (#4) — kein laufendes Spiel; App rendert hier nur den StartScreen.
export function menuState() {
  return { phase: "menu" };
}

export function reducer(state, action) {
  switch (action.type) {
    case "START_RUN":   // frischer Lauf aus dem Menü / Neustart
    case "RESET":
      return initialState(action.rng);

    case "TO_MENU":     // laufenden Run verlassen (#5)
      return menuState();

    case "END_RUN":     // Lauf freiwillig beenden → Endscreen (GameOver) statt direkt ins Menü.
      // Highscore/Geist sichert der gameover-Effekt in App.jsx (saveRun). Menü/Gameover ignorieren.
      return (state.phase === "menu" || state.phase === "gameover") ? state : { ...state, phase: "gameover" };

    case "RESOLVE_TRICK":
      return resolveTrick(state, action.rng);

    case "LIFE_DRAIN": {
      // Anti-Infinity (#59): periodischer, quadratisch eskalierender Leben-Abzug. Betrag kommt als
      // Payload aus App.jsx (Determinismus: kein Date im Reducer). Nur im Spiel; ≤0 → Game Over.
      if (state.phase !== "play") return state;
      const life = state.life - (action.amount || 0);
      if (life <= 0) return { ...state, life: 0, phase: "gameover" };
      return { ...state, life };
    }

    case "SUBMIT_PREDICTION": {
      // Ansage bestätigen (#36): erst JETZT neu mischen, pos/Zyklus-Akkus zurücksetzen, nächster Durchlauf.
      if (state.phase !== "prediction") return state;
      const p = action.prediction;
      if (!Number.isInteger(p) || p < PREDICTION_MIN || p > PREDICTION_MAX) return state; // ungültig → nicht übernehmen
      return {
        ...state,
        playerOrder: shuffledOrder(state.deck.length, action.rng),
        oppOrder: shuffledOrder(state.oppDeck.length, action.rng),
        pos: 0, cycleWins: 0, cycleBaseScore: 0,
        prediction: p, predictionDue: false,
        phase: "play",
      };
    }

    case "PICK_PERK": {
      if (state.phase !== "levelup") return state;
      const { perkId, rng } = action;
      if (!state.offer || !state.offer.includes(perkId)) return state;
      const def = PERK_DEFS[perkId];
      const perks = [...state.perks, perkId];
      let deck = def.onPick ? def.onPick(state.deck, rng) : state.deck; // Kat.-A-Mods sofort dauerhaft
      // #71 Königsmacher (L7): erreicht eine Karte (durch DIESE oder eine frühere Aufwertung) erstmals Wert
      // ≥13, erhält sie einmalig dauerhaft +2. Nach jeder Deck-Mod prüfen; je Karte nur einmal (kingBoosted).
      let kingBoosted = state.kingBoosted || [];
      if (perks.some((id) => PERK_DEFS[id].kingmaker)) {
        const boosted = new Set(kingBoosted);
        deck = deck.map((c) => {
          if (c.value >= C.KINGMAKER_THRESHOLD && !boosted.has(c.id)) { boosted.add(c.id); return { ...c, value: c.value + C.KINGMAKER_BONUS }; }
          return c;
        });
        kingBoosted = [...boosted];
      }
      const speedPct = perks.reduce((t, id) => t + (PERK_DEFS[id].speedPct || 0), 0);
      // C5: Schild sofort gewähren (sonst erst beim nächsten Durchlauf-Start)
      const shieldGrant = perks.reduce((m, id) => Math.max(m, PERK_DEFS[id].shieldPerCycle || 0), 0);
      const shield = Math.max(state.shield || 0, shieldGrant);
      // #57: noch ausstehende Level-Ups? → nächstes Angebot mit dem NEUEN Build zeigen (sonst würde
      // ein Mehrfach-Level-Up bei künftigem Tuning ein Angebot still verschlucken).
      let pending = state.pendingLevelUps || 0;
      if (pending > 0) {
        const off = buildOffer(perks, rng, PERKS_OFFERED, state.level);
        if (off.length > 0)
          return { ...state, deck, kingBoosted, perks, speedPct, shield, phase: "levelup", offer: off, pendingLevelUps: pending - 1 };
        // Pool leer → keine weiteren Angebote möglich; restliche Level-Ups verfallen.
      }
      // Nach der Perk-Wahl: war ein Durchlauf-Ende fällig (#36), weiter in die Ansage-Phase, sonst play.
      const phase = state.predictionDue ? "prediction" : "play";
      return { ...state, deck, kingBoosted, perks, speedPct, shield, phase, offer: null, pendingLevelUps: 0 };
    }

    default:
      return state;
  }
}
