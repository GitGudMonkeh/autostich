import { buildDeck, shuffledOrder } from "./deck.js";
import { PERK_DEFS, buildOffer } from "./perks.js";
import { archetypeOf, initLightning } from "./skills.js";
import { STAT_DEFS, STAT_IDS } from "./stats.js";
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
    legendaryCritBonus: 0, // L4 „Kritische Masse": akkumulierter, dauerhafter Crit-Chance-Bonus (#33)
    initiative: "player",
    lastResult: null,
    sinceWin: 0, // #71 Durchbruch: aufeinanderfolgende Stiche ohne Sieg
    lossStreak: 0, lastWinValue: null, altLen: 0, // #71 Rares: Revanche / Präzision / Wechselspiel
    critFollowArmed: false, misfireBonus: 0, weaknessArmed: false, // #71 Crit-Historie: Crit-Folge / Fehlzündung / Schwachstellenanalyse
    ascRun: 0, lastPlayedValue: null, winSuit: null, winSuitStreak: 0, recentResults: [], // #71 Historie: Perfekte Folge / Farbserie / Volles Haus
    overStreak: 0, // #71 Phase 2e: Überzahl
    fateValue: null, zeitrafferStacks: 0, kingBoosted: [], // #71 Phase 3 Legendaries: Schicksalsmaschine / Zeitraffer / Königsmacher
    // Stat-System (V2 §22.3): akkumulierte Summen, additiv/ohne Caps.
    statCritChance: 0, statCritMult: 0, statFormMult: 0, statStreakMult: 0, statOffer: null,
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
      // Nach der Wahl geht es direkt weiter — neu gemischt wurde schon beim Durchlauf-Ende (Engine).
      return { ...state, deck, kingBoosted, perks, phase: "play", offer: null };
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

    default:
      return state;
  }
}
