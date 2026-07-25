import { buildDeck, shuffledOrder, shuffle } from "./deck.js";
import { PERK_DEFS, buildOffer } from "./perks.js";
import { archetypeOf, initLightning, initHeat, heatMaxFor, heatConsumerCount, maxChargeFor, chargeConsumerCount,
  frozenTargetFor, frozenCount, freezeCards, hasColdFront, hasFrostTrail, buildSkillOffer } from "./skills.js";
import { STAT_DEFS, STAT_IDS } from "./stats.js";
import { computeFormations, formationPotential, SEGMENT_SIZE, FORMATION_TYPES } from "./formations.js";
import { initialShop, SHOP_ITEM_DEFS, positionOccupied, SEGMENT_BOUNDARIES, perkLegendaryChance, skillLegendaryChance, purchaseLogEntry } from "./shop.js";
import { resolveTrick } from "./engine.js";
import { PERKS_OFFERED } from "./constants.js";
import * as C from "./constants.js";

/* Reiner Reducer — Determinismus-Invariante: kein Math.random / Date hier drin.
   Zufall kommt als Action-Payload (rng), siehe App.jsx. Phasen:
   play → levelup → play … → gameover. */
// Start-playerOrder mit Formations-Potential im Ziel-Band (#Pass6): neu mischen, bis Σ(mult−1) in
// [FORMATION_START_MIN, MAX] liegt, sonst nach TRIES die potential-nächste Anordnung (Fallback → terminiert
// immer). Rein deterministisch (rng injiziert); begrenzt die Start-Varianz des Formations-Potentials.
function startOrderInBand(deck, rng) {
  const distToBand = (p) => (p < C.FORMATION_START_MIN ? C.FORMATION_START_MIN - p
                           : p > C.FORMATION_START_MAX ? p - C.FORMATION_START_MAX : 0);
  let best = shuffledOrder(deck.length, rng);
  let bestD = distToBand(formationPotential(best, deck));
  for (let t = 1; t < C.FORMATION_START_TRIES && bestD > 0; t++) {
    const order = shuffledOrder(deck.length, rng);
    const d = distToBand(formationPotential(order, deck));
    if (d < bestD) { best = order; bestD = d; }
  }
  return best;
}

export function initialState(rng = Math.random) {
  const deck = buildDeck();
  const oppDeck = buildDeck();
  return {
    phase: "play",
    deck, oppDeck,                                    // deck = Spieler (perk-modifizierbar)
    playerOrder: startOrderInBand(deck, rng),         // Ziehreihenfolge, Formations-Potential im Band (#Pass6)
    oppOrder: shuffledOrder(oppDeck.length, rng),
    pos: 0, cycle: 0, trickNo: 0,
    score: 0,
    winStreak: 0, bestStreak: 0, wins: 0, losses: 0, ties: 0,
    crits: 0, critBonusScore: 0, bestTrickScore: 0,
    initiative: "player",
    lastResult: null,
    sinceWin: 0, // #71 Durchbruch: aufeinanderfolgende Stiche ohne Sieg
    lossStreak: 0, lastWinValue: null, // #71 Rares: Revanche / Präzision
    critFollowArmed: false, weaknessArmed: false, // #71 Crit-Historie: Crit-Folge (D14) / Schwachstellenanalyse (D16)
    misfireScore: 0, // V2 §22.6 D15: Score-Ladung (Fehlzündung)
    winSuit: null, winSuitStreak: 0, recentResults: [], // #71 Historie: Farbserie / Volles Haus
    // Stat-System (V2 §22.3): akkumulierte Summen, additiv/ohne Caps.
    statCritChance: 0, statCritMult: 0, statFormMult: 0, statStreakMult: 0, economyStatLevel: 0, statOffer: null,
    formations: [], // Formations-Engine (V2 §22.7): pro-Position-Multiplikatoren, von der Engine je Durchlauf gefüllt
    formationEnergy: 0, formationSwaps: [], // Formationsphase (V2 §22.8): Energie + Undo-Historie der aktuellen Phase
    roles: {}, targetPerk: null, successorQueue: [], triumphArmed: [], // Kartenrollen (V2 §22.6 C): Rollen-ids, aktive Zielauswahl, Nachfolger-/Triumph-State
    l4Boost: {}, l5Used: [], l8Wins: {}, chainArmed: false, pos20Bonus: 0, // Legendaries (V2 §22.6 L)
    perks: [], offer: null,
    // Planung (Shop-Spec §10): gratis Neuwurf je Auswahl aus P-L1 Schicksalskontrolle — beim Anbieten
    // eines Perk-/Skill-Angebots gesetzt (wenn fateControl aktiv), beim Neuwurf zuerst verbraucht (vor Tokens).
    freePerkReroll: false, freeSkillReroll: false,
    // Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md). Inert, solange kein Skill gewählt ist.
    skills: [], skillOffer: null, activeArchetypes: [], lightning: initLightning(),
    heat: null, // Feuer-Archetyp (#93 F1): erst beim ersten Feuer-Skill via initHeat() aktiviert
    iceTemp: {}, frostbitePending: [], frostbiteActive: [], frostSwapsUsed: [], // Eis-Archetyp (#93 F3): temp. Wertboni / Frostbiss-Marken / genutzte Frosttausche
    tieArmed: false,
    shop: initialShop(), // Shop-System (Shop-Spec): Münzen + Angebot (+ später Anker/Regeländerungen)
    shopTarget: null,    // Shop-Ziel-Auswahl (Shop-Spec §12.2): aktive Karten-/Farb-/Segment-Auswahl beim Kauf
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

    case "LEAVE_SHOP":  // Shop-Runde bestätigen/verlassen (Shop-Spec §2.6) → zugehöriger Durchlauf startet.
      // Nicht gekaufte normale Items werden verworfen (§5.4): Angebot leeren. Reservierung (P4) bleibt (S5).
      return state.phase === "shop"
        ? { ...state, phase: "play", shop: { ...state.shop, offers: null, purchasedOfferIds: [] } }
        : state;

    case "BUY_ITEM": {  // Kauf im Shop (Shop-Spec §5.4). Ziel-Items (targetMode) laufen über den Target-Flow (ab S2).
      if (state.phase !== "shop") return state;
      const shop = state.shop || {};
      const offer = (shop.offers || []).find((o) => o.offerId === action.offerId);
      if (!offer) return state;
      if ((shop.purchasedOfferIds || []).includes(offer.offerId)) return state; // dasselbe Angebot nicht zweimal
      if ((shop.coins || 0) < offer.price) return state;                        // nicht bezahlbar
      const def = SHOP_ITEM_DEFS[offer.itemId];
      if (!def) return state;
      if (def.target) { // Ziel-Auswahl nötig (§12.2): in die shop-target-Phase; Münzen erst nach Bestätigung.
        return { ...state, phase: "shop-target",
                 shopTarget: { offerId: offer.offerId, itemId: def.id, cards: [], colors: {}, segment: null, position: null, colorPair: [], boundary: null, formationType: null, category: null, targetOfferId: null } };
      }
      // Sofort-Items (kein Ziel, z. B. Planung ab S5): Effekt anwenden, danach generische Münz-/Kauf-Buchhaltung.
      const patch = def.apply ? def.apply(state, null, action.rng) : {};
      const merged = { ...state, ...patch };
      const newShop = { ...(merged.shop || shop) };
      newShop.coins = (shop.coins || 0) - offer.price;                          // Preis sofort abziehen
      newShop.purchasedOfferIds = [...(shop.purchasedOfferIds || []), offer.offerId];
      if (def.legendary) newShop.boughtLegendaryIds = [...(shop.boughtLegendaryIds || []), def.id]; // §5.7 nie wieder
      if (def.repeatable === false) newShop.boughtNonRepeatableIds = [...(shop.boughtNonRepeatableIds || []), def.id];
      newShop.purchaseLog = [...(shop.purchaseLog || []), purchaseLogEntry(def, offer.price, state.cycle)]; // #127
      // Formationen neu berechnen — F-Items (§9) ändern die Erkennung permanent.
      const deck2 = patch.deck || state.deck;
      const formations2 = computeFormations(state.playerOrder, deck2, state.roles, state.perks, state.skills, newShop.anchors, newShop.permanentEffects);
      return { ...merged, deck: deck2, formations: formations2, shop: newShop };
    }

    // ---- Shop-Ziel-Auswahl (Shop-Spec §12.2) — Karten/Farben/Segment wählen; Münzen erst bei CONFIRM. ----
    case "SHOP_TARGET_CARD": {
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      const def = SHOP_ITEM_DEFS[state.shopTarget.itemId];
      const need = def?.target?.cards || 0;
      if (!need || !state.deck.some((c) => c.id === action.cardId)) return state;
      let cards = state.shopTarget.cards.slice();
      const colors = { ...state.shopTarget.colors };
      if (cards.includes(action.cardId)) { cards = cards.filter((id) => id !== action.cardId); delete colors[action.cardId]; }
      else if (cards.length < need) cards.push(action.cardId);
      else if (need === 1) { delete colors[cards[0]]; cards = [action.cardId]; } // Einzelziel: umschalten
      else return state;                                                          // Limit erreicht → ignorieren
      return { ...state, shopTarget: { ...state.shopTarget, cards, colors } };
    }
    case "SHOP_TARGET_COLOR": {
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      const def = SHOP_ITEM_DEFS[state.shopTarget.itemId];
      if (!def?.target?.color || !state.shopTarget.cards.includes(action.cardId)) return state;
      const card = state.deck.find((c) => c.id === action.cardId);
      if (!card || action.color === card.suit || !C.SUIT_ORDER.includes(action.color)) return state; // andere gültige Farbe
      return { ...state, shopTarget: { ...state.shopTarget, colors: { ...state.shopTarget.colors, [action.cardId]: action.color } } };
    }
    case "SHOP_TARGET_SEGMENT": {
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      const def = SHOP_ITEM_DEFS[state.shopTarget.itemId];
      const nSeg = Math.ceil(state.playerOrder.length / SEGMENT_SIZE);
      if (!def?.target?.segment || !(action.segment >= 0 && action.segment < nSeg)) return state;
      return { ...state, shopTarget: { ...state.shopTarget, segment: action.segment } };
    }
    case "SHOP_TARGET_POSITION": { // Anker-Position wählen (§8): 0..39, nur freie Positionen (max 1 Anker/Position).
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      const def = SHOP_ITEM_DEFS[state.shopTarget.itemId];
      const p = action.position;
      if (!def?.target?.position || !(p >= 0 && p < state.playerOrder.length)) return state;
      if (positionOccupied(state.shop?.anchors, p)) return state; // belegte Position → ablehnen (§8.1)
      return { ...state, shopTarget: { ...state.shopTarget, position: p } };
    }
    case "SHOP_TARGET_COLOR_PAIR": { // Farballianz (F4): zwei unterschiedliche Farben wählen.
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      const def = SHOP_ITEM_DEFS[state.shopTarget.itemId];
      if (!def?.target?.colorPair || !C.SUIT_ORDER.includes(action.color)) return state;
      let pair = state.shopTarget.colorPair || [];
      if (pair.includes(action.color)) pair = pair.filter((s) => s !== action.color);
      else if (pair.length < 2) pair = [...pair, action.color];
      else return state; // schon zwei gewählt
      return { ...state, shopTarget: { ...state.shopTarget, colorPair: pair } };
    }
    case "SHOP_TARGET_BOUNDARY": { // Offene Grenze (F5): eine noch geschlossene Segmentgrenze wählen.
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      const def = SHOP_ITEM_DEFS[state.shopTarget.itemId];
      const b = action.boundary;
      if (!def?.target?.boundary || !SEGMENT_BOUNDARIES.includes(b)) return state;
      if ((state.shop?.permanentEffects?.openSegmentBoundaries || []).includes(b)) return state; // schon offen
      return { ...state, shopTarget: { ...state.shopTarget, boundary: b } };
    }
    case "SHOP_TARGET_FORMATION_TYPE": { // Formationskern (F-L1): einen der vier Basistypen wählen.
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      const def = SHOP_ITEM_DEFS[state.shopTarget.itemId];
      if (!def?.target?.formationType || !FORMATION_TYPES.includes(action.formationType)) return state;
      return { ...state, shopTarget: { ...state.shopTarget, formationType: action.formationType } };
    }
    case "SHOP_TARGET_CATEGORY": { // Warenwechsel (P3): eine der vier Shop-Kategorien wählen.
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      const def = SHOP_ITEM_DEFS[state.shopTarget.itemId];
      if (!def?.target?.category || !C.SHOP_CATEGORIES.includes(action.category)) return state;
      return { ...state, shopTarget: { ...state.shopTarget, category: action.category } };
    }
    case "SHOP_TARGET_OFFER": { // Reservierung (P4): ein anderes, noch nicht gekauftes Angebot wählen (nicht P4 selbst).
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      const def = SHOP_ITEM_DEFS[state.shopTarget.itemId];
      if (!def?.target?.offer) return state;
      const target = (state.shop?.offers || []).find((o) => o.offerId === action.offerId);
      if (!target || action.offerId === state.shopTarget.offerId) return state;      // muss existieren & darf nicht P4 selbst sein
      if ((state.shop?.purchasedOfferIds || []).includes(action.offerId)) return state; // nur nicht gekaufte Items
      const cur = state.shopTarget.targetOfferId === action.offerId ? null : action.offerId; // Antippen schaltet um/ab
      return { ...state, shopTarget: { ...state.shopTarget, targetOfferId: cur } };
    }
    case "SHOP_TARGET_CANCEL": // Abbrechen (§12.2): Angebot & Münzen unverändert → zurück in den Shop.
      return state.phase === "shop-target" ? { ...state, phase: "shop", shopTarget: null } : state;
    case "SHOP_TARGET_CONFIRM": {
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      const st = state.shopTarget;
      const def = SHOP_ITEM_DEFS[st.itemId];
      const shop = state.shop || {};
      const offer = (shop.offers || []).find((o) => o.offerId === st.offerId);
      if (!def || !offer) return state;
      if ((shop.purchasedOfferIds || []).includes(offer.offerId)) return state;   // schon gekauft
      if ((shop.coins || 0) < offer.price) return state;                          // nicht bezahlbar
      const spec = def.target || {};
      if (spec.cards && st.cards.length !== spec.cards) return state;             // genau N Karten
      if (spec.color && st.cards.some((id) => !st.colors[id])) return state;      // je gewählter Karte eine Farbe
      if (spec.segment && st.segment == null) return state;                       // ein Segment
      if (spec.position && (st.position == null || positionOccupied(shop.anchors, st.position))) return state; // freie Position
      if (spec.colorPair && (st.colorPair || []).length !== 2) return state;      // genau zwei Farben (F4)
      if (spec.boundary && st.boundary == null) return state;                     // eine Grenze (F5)
      if (spec.formationType && st.formationType == null) return state;           // ein Formationstyp (F-L1)
      if (spec.category && st.category == null) return state;                      // eine Kategorie (P3)
      if (spec.offer && (st.targetOfferId == null                                 // ein reservierbares Angebot (P4)
        || !(shop.offers || []).some((o) => o.offerId === st.targetOfferId)
        || (shop.purchasedOfferIds || []).includes(st.targetOfferId))) return state;
      const target = { cardIds: st.cards, colors: st.colors, segment: st.segment, position: st.position, colorPair: st.colorPair, boundary: st.boundary, formationType: st.formationType, category: st.category, offerId: st.targetOfferId };
      const patch = def.apply ? def.apply(state, target, action.rng) : {};
      const merged = { ...state, ...patch };
      const deck = patch.deck || state.deck;
      // Buchhaltung auf dem (evtl. durch apply veränderten) Shop — z. B. Anker-Items legen shop.anchors an.
      const newShop = { ...(merged.shop || shop), coins: (shop.coins || 0) - offer.price, // Preis erst jetzt abziehen (§12.2)
        purchasedOfferIds: [...(shop.purchasedOfferIds || []), offer.offerId] };
      if (def.legendary) newShop.boughtLegendaryIds = [...(shop.boughtLegendaryIds || []), def.id];
      if (def.repeatable === false) newShop.boughtNonRepeatableIds = [...(shop.boughtNonRepeatableIds || []), def.id];
      newShop.purchaseLog = [...(shop.purchaseLog || []), purchaseLogEntry(def, offer.price, state.cycle, target)]; // #127
      // Formationen mit den (evtl. neuen) Ankern neu berechnen — A5 Formationsanker wirkt sofort.
      const formations = computeFormations(state.playerOrder, deck, state.roles, state.perks, state.skills, newShop.anchors, newShop.permanentEffects);
      return { ...merged, deck, formations, phase: "shop", shopTarget: null, shop: newShop };
    }

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
      return { ...state, deck, roles, formations: computeFormations(state.playerOrder, deck, roles, state.perks, state.skills, state.shop?.anchors || [], state.shop?.permanentEffects || {}), phase: "play", targetPerk: null };
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
      // Max-2-Archetypen (#93 F0): ein Skill eines dritten (noch nicht aktiven) Archetyps ist nicht wählbar.
      const arch = archetypeOf(skillId);
      const active0 = state.activeArchetypes || [];
      if (arch && !active0.includes(arch) && active0.length >= C.MAX_ARCHETYPES) return state;
      let skills;
      if (replaceId && state.skills.includes(replaceId)) {
        // Gezieltes Ersetzen (volle Slots ODER Konsumenten-Ersatzdialog #93): tauscht genau diesen Slot.
        skills = state.skills.map((id) => (id === replaceId ? skillId : id));
      } else if (state.skills.length < C.SKILL_SLOTS) {
        skills = [...state.skills, skillId];                       // freier Slot → hinzufügen
      } else {
        return state;                                              // volle Slots ohne gültiges Ersetzungsziel
      }
      // Konsumenten-Exklusivität (#93 F1/F2): höchstens EIN Hitze-Konsument UND höchstens EIN Ladungs-Konsument.
      // Ein zweiter desselben Typs ist nur wählbar, wenn er den bestehenden ersetzt (replaceId = der alte Konsument).
      if (heatConsumerCount(skills) > 1 || chargeConsumerCount(skills) > 1) return state;
      let activeArchetypes = state.activeArchetypes || [];
      let lightning = state.lightning;
      let heat = state.heat;
      let deck = state.deck;
      if (arch === "lightning") lightning = { ...lightning, active: true, maxCharge: maxChargeFor(skills) }; // Donnergott → 15 (#93 F2)
      if (arch === "fire" && !(heat && heat.active)) heat = { ...initHeat(), active: true, max: heatMaxFor(skills) };
      // Eis (#93 F3): dieser Pick friert so viele NEUE eigene Karten ein, dass das Ziel (frozenTargetFor) erreicht ist.
      if (arch === "ice") {
        const toFreeze = Math.max(0, frozenTargetFor(skills) - frozenCount(deck));
        if (toFreeze > 0) deck = freezeCards(deck, toFreeze, action.rng);
      }
      if (arch && !activeArchetypes.includes(arch)) activeArchetypes = [...activeArchetypes, arch];
      // Formationen neu berechnen: eingefrorene Karten + Eis-Skills beeinflussen die Erkennung (Wildcards/Anker).
      const formations = computeFormations(state.playerOrder, deck, state.roles, state.perks, skills, state.shop?.anchors || [], state.shop?.permanentEffects || {});
      return { ...state, skills, activeArchetypes, lightning, heat, deck, formations, phase: "play", skillOffer: null };
    }

    // Skill-Angebot ablehnen → stattdessen ein Perk-Angebot für diese Runde (nie „verschwendet").
    case "DECLINE_SKILL": {
      if (state.phase !== "levelup" || !state.skillOffer) return state;
      const off = buildOffer(state.perks, action.rng, PERKS_OFFERED, perkLegendaryChance(state.shop));
      const fate = !!(state.shop && state.shop.fateControl);         // P-L1: gratis Reroll gilt fürs neue Perk-Angebot
      return off.length > 0
        ? { ...state, skillOffer: null, offer: off, freePerkReroll: fate, freeSkillReroll: false } // → Perk-Auswahl
        : { ...state, skillOffer: null, freeSkillReroll: false, phase: "play" };                   // Perk-Pool leer → weiterspielen
    }

    // Perk-Angebot neu würfeln (Shop-Spec §10 P1/P-L1): gratis Reroll (Schicksalskontrolle) zuerst, sonst
    // einen gespeicherten Token verbrauchen. Komplett neues Angebot (Seltenheitsregeln in buildOffer), rng deterministisch.
    case "REROLL_PERK": {
      if (state.phase !== "levelup" || !state.offer) return state;
      const free = !!state.freePerkReroll;
      const tokens = (state.shop && state.shop.perkRerolls) || 0;
      if (!free && tokens <= 0) return state;                        // keine Ressource → wirkungslos
      const offer = buildOffer(state.perks, action.rng, PERKS_OFFERED, perkLegendaryChance(state.shop));
      const shop = free ? state.shop : { ...state.shop, perkRerolls: tokens - 1 };
      return { ...state, offer, shop, freePerkReroll: free ? false : state.freePerkReroll };
    }

    // Skill-Angebot neu würfeln (Shop-Spec §10 P2/P-L1): analog; erfüllt weiterhin Archetyp-/Konsumentenregeln
    // (buildSkillOffer). Leeres neues Angebot (keine Archetypen verfügbar) → Ressource nicht verbrauchen.
    case "REROLL_SKILL": {
      if (state.phase !== "levelup" || !state.skillOffer) return state;
      const free = !!state.freeSkillReroll;
      const tokens = (state.shop && state.shop.skillRerolls) || 0;
      if (!free && tokens <= 0) return state;
      const offer = buildSkillOffer(state.skills, state.activeArchetypes, action.rng, C.SKILLS_OFFERED, skillLegendaryChance(state.shop));
      if (offer.length === 0) return state;                         // nichts Neues verfügbar → Ressource behalten
      const shop = free ? state.shop : { ...state.shop, skillRerolls: tokens - 1 };
      return { ...state, skillOffer: offer, shop, freeSkillReroll: free ? false : state.freeSkillReroll };
    }

    // Formationsphase (V2 §22.8): beliebigen Tausch zweier Karten anwenden (1 Energie), Vorschau neu berechnen.
    // Tausch. Eis (#93 F3): ist eine eingefrorene Karte mit noch freiem Frosttausch beteiligt, ist der Tausch
    // KOSTENLOS (keine Energie) und verbraucht deren Frosttausch; sonst kostet er wie gehabt 1 Energie.
    case "SWAP_CARDS": {
      if (state.phase !== "formation") return state;
      const { i, j } = action;
      if (i === j) return state;
      if (i < 0 || j < 0 || i >= state.playerOrder.length || j >= state.playerOrder.length) return state;
      const cardA = state.deck[state.playerOrder[i]], cardB = state.deck[state.playerOrder[j]];
      const used = state.frostSwapsUsed || [];
      let freeFrozenId = null;
      if (cardA.frozen && !used.includes(cardA.id)) freeFrozenId = cardA.id;
      else if (cardB.frozen && !used.includes(cardB.id)) freeFrozenId = cardB.id;
      const isFree = freeFrozenId !== null;
      if (!isFree && (state.formationEnergy || 0) <= 0) return state; // bezahlter Tausch braucht Energie
      const order = state.playerOrder.slice();
      [order[i], order[j]] = [order[j], order[i]];
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.shop?.permanentEffects || {}),
               formationEnergy: isFree ? state.formationEnergy : state.formationEnergy - 1,
               formationSwaps: [...(state.formationSwaps || []), { i, j, free: isFree, frozenId: freeFrozenId }],
               frostSwapsUsed: isFree ? [...used, freeFrozenId] : used };
    }
    // Letzten Tausch rückgängig machen → bezahlter Tausch erstattet Energie, freier Frosttausch wird zurückgegeben.
    case "UNDO_SWAP": {
      if (state.phase !== "formation" || !(state.formationSwaps || []).length) return state;
      const swaps = state.formationSwaps.slice();
      const last = swaps.pop();
      const order = state.playerOrder.slice();
      [order[last.i], order[last.j]] = [order[last.j], order[last.i]];
      const frostSwapsUsed = last.free ? (state.frostSwapsUsed || []).filter((id) => id !== last.frozenId) : (state.frostSwapsUsed || []);
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.shop?.permanentEffects || {}),
               formationEnergy: last.free ? state.formationEnergy : state.formationEnergy + 1, formationSwaps: swaps, frostSwapsUsed };
    }
    // Alle Tausche der Phase zurücknehmen → Ausgangsreihenfolge + volle Energie + freie Frosttausche zurück.
    case "RESET_FORMATION": {
      if (state.phase !== "formation") return state;
      const order = state.playerOrder.slice();
      const swaps = state.formationSwaps || [];
      for (let k = swaps.length - 1; k >= 0; k--) { const { i, j } = swaps[k]; [order[i], order[j]] = [order[j], order[i]]; }
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.shop?.permanentEffects || {}),
               formationEnergy: C.FORMATION_ENERGY + (state.perks || []).reduce((t, id) => t + (PERK_DEFS[id].extraSwap || 0), 0),
               formationSwaps: [], frostSwapsUsed: [] };
    }
    // Bestätigen → Reihenfolge bleibt persistent. Eis: Kaltfront/Frostspur setzen jetzt (auf der finalen Reihenfolge)
    // ihre temp. Wertboni für den nächsten Durchlauf, für jede eingefrorene Karte, die ihren Frosttausch genutzt hat.
    case "CONFIRM_FORMATION": {
      if (state.phase !== "formation") return state;
      let iceTemp = state.iceTemp || {};
      const usedFrost = state.frostSwapsUsed || [];
      if (usedFrost.length && (hasColdFront(state.skills) || hasFrostTrail(state.skills))) {
        iceTemp = { ...iceTemp };
        for (const fid of usedFrost) {
          const pos = state.playerOrder.findIndex((di) => state.deck[di].id === fid);
          if (pos < 0) continue;
          if (hasColdFront(state.skills)) iceTemp[fid] = C.KALTFRONT_VALUE;                       // Kaltfront: getauschte Frostkarte +3
          if (hasFrostTrail(state.skills) && pos + 1 < state.playerOrder.length)                  // Frostspur: neuer Nachfolger +2
            iceTemp[state.deck[state.playerOrder[pos + 1]].id] = C.FROSTSPUR_VALUE;
        }
      }
      return { ...state, phase: "play", formationEnergy: 0, formationSwaps: [], frostSwapsUsed: [], iceTemp };
    }

    default:
      return state;
  }
}
