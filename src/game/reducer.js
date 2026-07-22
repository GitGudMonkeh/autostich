import { buildDeck, shuffledOrder } from "./deck.js";
import { PERK_DEFS } from "./perks.js";
import { resolveTrick } from "./engine.js";
import { START_LIFE, PREDICTION_MIN, PREDICTION_MAX } from "./constants.js";

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
    perks: [], offer: null,
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
      const deck = def.onPick ? def.onPick(state.deck, rng) : state.deck; // Kat.-A-Mods sofort dauerhaft
      const perks = [...state.perks, perkId];
      const speedPct = perks.reduce((t, id) => t + (PERK_DEFS[id].speedPct || 0), 0);
      // C5: Schild sofort gewähren (sonst erst beim nächsten Durchlauf-Start)
      const shieldGrant = perks.reduce((m, id) => Math.max(m, PERK_DEFS[id].shieldPerCycle || 0), 0);
      const shield = Math.max(state.shield || 0, shieldGrant);
      // Nach der Perk-Wahl: war ein Durchlauf-Ende fällig (#36), weiter in die Ansage-Phase, sonst play.
      const phase = state.predictionDue ? "prediction" : "play";
      return { ...state, deck, perks, speedPct, shield, phase, offer: null };
    }

    default:
      return state;
  }
}
