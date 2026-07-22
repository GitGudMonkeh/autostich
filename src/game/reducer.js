import { buildDeck, shuffledOrder } from "./deck.js";
import { PERK_DEFS } from "./perks.js";
import { resolveTrick } from "./engine.js";
import { START_LIFE } from "./constants.js";

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
    winStreak: 0, wins: 0, losses: 0, ties: 0,
    initiative: "player",
    lastResult: null,
    perks: [], offer: null,
    speedPct: 0,
    shieldUsedThisCycle: false,
    tieArmed: false,
    lastTrick: null,
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case "RESET":
      return initialState(action.rng);

    case "RESOLVE_TRICK":
      return resolveTrick(state, action.rng);

    case "PICK_PERK": {
      if (state.phase !== "levelup") return state;
      const { perkId, rng } = action;
      if (!state.offer || !state.offer.includes(perkId)) return state;
      const def = PERK_DEFS[perkId];
      const deck = def.onPick ? def.onPick(state.deck, rng) : state.deck; // Kat.-A-Mods sofort dauerhaft
      const perks = [...state.perks, perkId];
      const speedPct = perks.reduce((t, id) => t + (PERK_DEFS[id].speedPct || 0), 0);
      return { ...state, deck, perks, speedPct, phase: "play", offer: null };
    }

    default:
      return state;
  }
}
