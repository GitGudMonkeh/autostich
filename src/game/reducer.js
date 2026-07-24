import { buildDeck, shuffledOrder, shuffle } from "./deck.js";
import { PERK_DEFS, buildOffer } from "./perks.js";
import { archetypeOf, initLightning } from "./skills.js";
import { STAT_DEFS, STAT_IDS } from "./stats.js";
import { computeFormations } from "./formations.js";
import { resolveTrick } from "./engine.js";
import { PERKS_OFFERED } from "./constants.js";
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
    score: 0,
    winStreak: 0, bestStreak: 0, wins: 0, losses: 0, ties: 0,
    crits: 0, critBonusScore: 0, bestTrickScore: 0,
    initiative: "player",
    lastResult: null,
    sinceWin: 0, // #71 Durchbruch: aufeinanderfolgende Stiche ohne Sieg
    lossStreak: 0, lastWinValue: null, altLen: 0, // #71 Rares: Revanche / Präzision / Wechselspiel
    critFollowArmed: false, weaknessArmed: false, // #71 Crit-Historie: Crit-Folge (D14) / Schwachstellenanalyse (D16)
    misfireScore: 0, // V2 §22.6 D15: Score-Ladung (Fehlzündung)
    ascRun: 0, lastPlayedValue: null, winSuit: null, winSuitStreak: 0, recentResults: [], // #71 Historie: Perfekte Folge / Farbserie / Volles Haus
    // Stat-System (V2 §22.3): akkumulierte Summen, additiv/ohne Caps.
    statCritChance: 0, statCritMult: 0, statFormMult: 0, statStreakMult: 0, statOffer: null,
    formations: [], // Formations-Engine (V2 §22.7): pro-Position-Multiplikatoren, von der Engine je Durchlauf gefüllt
    formationEnergy: 0, formationSwaps: [], // Formationsphase (V2 §22.8): Energie + Undo-Historie der aktuellen Phase
    roles: {}, targetPerk: null, successorQueue: [], triumphArmed: [], // Kartenrollen (V2 §22.6 C): Rollen-ids, aktive Zielauswahl, Nachfolger-/Triumph-State
    l4Boost: {}, l5Used: [], l8Wins: {}, chainArmed: false, pos20Bonus: 0, // Legendaries (V2 §22.6 L)
    perks: [], offer: null,
    // Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md). Inert, solange kein Skill gewählt ist.
    skills: [], skillOffer: null, activeArchetypes: [], lightning: initLightning(),
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
    case "RESET": {
      // Start-Entscheidung vor Durchlauf 0 = Stat (DECISION_CYCLE[0], §22.2). Immer alle vier Stats.
      const s = initialState(action.rng);
      return { ...s, phase: "levelup", statOffer: STAT_IDS };
    }

    case "TO_MENU":     // laufenden Run verlassen (#5)
      return menuState();

    case "END_RUN":     // Lauf freiwillig beenden → Endscreen (GameOver) statt direkt ins Menü.
      // Highscore/Geist sichert der gameover-Effekt in App.jsx (saveRun). Menü/Gameover ignorieren.
      return (state.phase === "menu" || state.phase === "gameover") ? state : { ...state, phase: "gameover" };

    case "RESOLVE_TRICK":
      return resolveTrick(state, action.rng);

    case "PICK_PERK": {
      if (state.phase !== "levelup") return state;
      const { perkId, rng } = action;
      if (!state.offer || !state.offer.includes(perkId)) return state;
      const def = PERK_DEFS[perkId];
      const perks = [...state.perks, perkId];
      let deck = def.onPick ? def.onPick(state.deck, rng) : state.deck; // Kat.-A-Mods sofort dauerhaft
      // L5 Jackpot & Co.: zufällige Kartenrolle sofort setzen (kein manueller Ziel-Schritt).
      let roles = state.roles;
      if (def.randomTarget) roles = { ...(state.roles || {}), [perkId]: shuffle(state.deck.map((c) => c.id), rng).slice(0, def.randomTarget) };
      // Perks mit manueller Kartenauswahl öffnen die Zielauswahl (§22.5); sonst weiter.
      const goTarget = !!def.needsTarget;
      return { ...state, deck, perks, roles, offer: null,
               phase: goTarget ? "target" : "play",
               targetPerk: goTarget ? perkId : null };
    }

    // Zielauswahl bestätigen (V2 §22.6 C): genau needsTarget Karten → Rolle setzen (C9 = dauerhafte Wertmod).
    case "CONFIRM_TARGET": {
      if (state.phase !== "target" || !state.targetPerk) return state;
      const def = PERK_DEFS[state.targetPerk];
      const need = def.needsTarget || 0;
      const ids = (action.cardIds || []).slice(0, need);
      if (ids.length !== need || new Set(ids).size !== need) return state; // genau N unterschiedliche Karten
      let deck = state.deck;
      if (def.sacrificeMod) { // C9 Opfergabe: gewählte Karte −3, ihr direkter Nachfolger (aktuelle Reihenfolge) +5 — dauerhaft.
        const idx = state.playerOrder.findIndex((di) => state.deck[di].id === ids[0]);
        const succId = idx >= 0 && idx + 1 < state.playerOrder.length ? state.deck[state.playerOrder[idx + 1]].id : null;
        deck = state.deck.map((c) =>
          c.id === ids[0] ? { ...c, value: Math.max(0, c.value - 3) }
          : c.id === succId ? { ...c, value: c.value + 5 } : c);
      } else if (def.permMod) { // L1 Überladung / L9 Blutvertrag: dauerhafte Wertmods der gewählten Karten.
        deck = def.permMod(state.deck, state.playerOrder, ids);
      }
      const roles = { ...(state.roles || {}), [state.targetPerk]: ids };
      return { ...state, deck, roles, formations: computeFormations(state.playerOrder, deck, roles, state.perks), phase: "play", targetPerk: null };
    }

    // Stat-Auswahl (V2 §22.3): der gewählte Stat addiert seinen Step auf das zugehörige Summenfeld.
    case "PICK_STAT": {
      if (state.phase !== "levelup" || !state.statOffer) return state;
      const def = STAT_DEFS[action.statId];
      if (!def) return state;
      return { ...state, [def.field]: (state[def.field] || 0) + def.step, phase: "play", statOffer: null };
    }

    // Skill-Auswahl (jede SKILL_EVERY_CYCLES-te Runde). Hinzufügen oder — bei vollen Slots — ersetzen.
    // Der erste Skill eines Archetyps schaltet dessen System frei (lightning.active).
    case "PICK_SKILL": {
      if (state.phase !== "levelup" || !state.skillOffer) return state;
      const { skillId, replaceId } = action;
      if (!state.skillOffer.includes(skillId) || state.skills.includes(skillId)) return state;
      let skills;
      if (state.skills.length < C.SKILL_SLOTS) {
        skills = [...state.skills, skillId];                       // freier Slot → hinzufügen
      } else {
        if (!replaceId || !state.skills.includes(replaceId)) return state; // volle Slots → gültiges Ersetzungsziel nötig
        skills = state.skills.map((id) => (id === replaceId ? skillId : id));
      }
      const arch = archetypeOf(skillId);
      let activeArchetypes = state.activeArchetypes || [];
      let lightning = state.lightning;
      if (arch === "lightning" && !lightning.active) lightning = { ...lightning, active: true };
      if (arch && !activeArchetypes.includes(arch)) activeArchetypes = [...activeArchetypes, arch];
      return { ...state, skills, activeArchetypes, lightning, phase: "play", skillOffer: null };
    }

    // Skill-Angebot ablehnen → stattdessen ein Perk-Angebot für diese Runde (nie „verschwendet").
    case "DECLINE_SKILL": {
      if (state.phase !== "levelup" || !state.skillOffer) return state;
      const off = buildOffer(state.perks, action.rng, PERKS_OFFERED);
      return off.length > 0
        ? { ...state, skillOffer: null, offer: off }        // → Perk-Auswahl
        : { ...state, skillOffer: null, phase: "play" };    // Perk-Pool leer → weiterspielen
    }

    // Formationsphase (V2 §22.8): beliebigen Tausch zweier Karten anwenden (1 Energie), Vorschau neu berechnen.
    case "SWAP_CARDS": {
      if (state.phase !== "formation") return state;
      const { i, j } = action;
      if (i === j || (state.formationEnergy || 0) <= 0) return state;
      if (i < 0 || j < 0 || i >= state.playerOrder.length || j >= state.playerOrder.length) return state;
      const order = state.playerOrder.slice();
      [order[i], order[j]] = [order[j], order[i]];
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks),
               formationEnergy: state.formationEnergy - 1,
               formationSwaps: [...(state.formationSwaps || []), { i, j }] };
    }
    // Letzten Tausch rückgängig machen → Energie erstattet (Tausch ist seine eigene Umkehrung).
    case "UNDO_SWAP": {
      if (state.phase !== "formation" || !(state.formationSwaps || []).length) return state;
      const swaps = state.formationSwaps.slice();
      const { i, j } = swaps.pop();
      const order = state.playerOrder.slice();
      [order[i], order[j]] = [order[j], order[i]];
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks),
               formationEnergy: state.formationEnergy + 1, formationSwaps: swaps };
    }
    // Alle Tausche der Phase zurücknehmen → Ausgangsreihenfolge + volle Energie.
    case "RESET_FORMATION": {
      if (state.phase !== "formation") return state;
      const order = state.playerOrder.slice();
      const swaps = state.formationSwaps || [];
      for (let k = swaps.length - 1; k >= 0; k--) { const { i, j } = swaps[k]; [order[i], order[j]] = [order[j], order[i]]; }
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks),
               formationEnergy: C.FORMATION_ENERGY + (state.perks || []).reduce((t, id) => t + (PERK_DEFS[id].extraSwap || 0), 0), formationSwaps: [] };
    }
    // Bestätigen → die aufgestellte Reihenfolge bleibt persistent; nächster Durchlauf startet.
    case "CONFIRM_FORMATION": {
      if (state.phase !== "formation") return state;
      return { ...state, phase: "play", formationEnergy: 0, formationSwaps: [] };
    }

    default:
      return state;
  }
}
