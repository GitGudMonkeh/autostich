import { buildDeck, shuffledOrder } from "./deck.js";
import { PERK_DEFS, buildPerkOffer } from "./perks.js";
import { familyDef, applyFamilyPick, formationEnergyBonus } from "./families.js";
import { SHOP_FAMILY_DEFS } from "./shopFamilies.js";
import { UPGRADE_TYPES } from "./rarity.js";
import { archetypeOf, initLightning, initHeat, heatMaxFor, heatConsumerCount, maxChargeFor, chargeConsumerCount,
  frozenTargetFor, frozenCount, freezeCards, unfreezeAll, hasFrostwahl, hasKaltfront, hasGlacierPush, hasVerzahnung, hasGleitfrost, hasVerdichtung,
  hasSetzlingsbeet, hasDornenkoenig, buildSkillOffer } from "./skills.js"; // Pflanze (v0): Aktivierungs-Effekte
import { STAT_DEFS, STAT_IDS } from "./stats.js";
import { computeFormations, formationPotential, segmentGainedFormation, baseFormationCount, SEGMENT_SIZE, FORMATION_TYPES } from "./formations.js";
import { initialShop, SHOP_ITEM_DEFS, positionOccupied, perkLegendaryChance, skillLegendaryChance, perkFateReroll, purchaseLogEntry, familyPurchaseLogEntry, rerollCategory } from "./shop.js";
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
    // #131 Rundenscore: Score-Zuwachs je Durchlauf + die letzten zwei abgeschlossenen Rundenscores, damit die
    // Entscheidungs-Panels „Rundenscore" und die %-Differenz zur Vorrunde zeigen können (reines State-Tracking,
    // kein Math.random/Date → Determinismus bleibt). null = noch kein (Vor-)Rundenscore vorhanden.
    scoreAtCycleStart: 0, lastCycleScore: null, prevCycleScore: null,
    winStreak: 0, bestStreak: 0, wins: 0, losses: 0, ties: 0,
    crits: 0, critBonusScore: 0, bestTrickScore: 0,
    maxFormations: 0, formationScore: 0, // #161 FB-2: Run-Rückblick — Peak aktiver Formationen + Score-Anteil aus Formationen
    initiative: "player",
    lastResult: null,
    sinceWin: 0, // #71 Durchbruch: aufeinanderfolgende Stiche ohne Sieg
    lossStreak: 0, lastWinValue: null, // #71 Rares: Revanche / Präzision
    critFollowArmed: false, weaknessArmed: false, // #71 Crit-Historie: Crit-Folge (D14) / Schwachstellenanalyse (D16)
    weaknessBig: false, // Rarität #167: D_WEAKNESS IV — rüstende Niederlage mit großem Abstand (→ +900 statt +600)
    interplayStored: 0, // Rarität #167: D_INTERPLAY IV — in Niederlagen gebankter Score, beim nächsten Sieg als Flat ausgezahlt
    misfireScore: 0, // V2 §22.6 D15: Score-Ladung (Fehlzündung)
    winSuit: null, winSuitStreak: 0, recentResults: [], // #71 Historie: Farbserie / Volles Haus (recentResults → secondLastResult)
    segmentWins: 0, // #189 Volles Haus: segment-genauer Sieg-Zähler (ersetzt das rollende Fenster)
    // Stat-System (V2 §22.3): akkumulierte Summen, additiv/ohne Caps.
    statCritChance: 0, statCritMult: 0, statFormMult: 0, statStreakMult: 0, economyStatLevel: 0, statOffer: null,
    statPicks: [], // #190: Reihenfolge der gewählten Stats dieses Laufs (für die Mono-Stat-Challenge deck_c4)
    formations: [], // Formations-Engine (V2 §22.7): pro-Position-Multiplikatoren, von der Engine je Durchlauf gefüllt
    formationEnergy: 0, formationSwaps: [], // Formationsphase (V2 §22.8): Energie + Undo-Historie der aktuellen Phase
    roles: {}, targetPerk: null, successorQueue: [], triumphArmed: [], // Kartenrollen (V2 §22.6 C): Rollen-ids, aktive Zielauswahl, Nachfolger-/Triumph-State
    l4Boost: {}, // Legendär-Perk L4 Kritische Masse (Crit-Wert-Gewinn je Karte)
    zinsBonus: 0, cycleWins: 0, cycleLosses: 0, cycleBestTrick: 0, sammlerTypes: [], vabanquePaid: 0, // Legendär-Perks-Rework (#203)
    perks: [], offer: null,
    // Raritätssystem (Epic #167, Spec §2.1): Familienrang je Familie { [familyId]: 1|2|3|4 }. Läuft ADDITIV
    // neben `perks` (flache Legendäre) — die Engine löst aktive Familien-Stufen über activeTierDefs auf.
    familyTiers: {},
    // Familien-Ziel-Auswahl (Rarität #167, Kat. A ab #163): aktive Farb-/Ziel-Auswahl beim Pick einer Stufe mit
    // `pickTarget` (z. B. A_SUIT_BOOST III/IV, A_SUIT_DUEL III/IV). null = keine offene Auswahl. Kategorie C nutzt
    // denselben Fluss später für Karten-Ziele (Rollen).
    familyTarget: null,
    // Planung (Shop-Spec §10): gratis Neuwurf je Auswahl aus P-L1 Schicksalskontrolle — beim Anbieten
    // eines Perk-/Skill-Angebots gesetzt (wenn fateControl aktiv), beim Neuwurf zuerst verbraucht (vor Tokens).
    freePerkReroll: false, freeSkillReroll: false,
    // Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md). Inert, solange kein Skill gewählt ist.
    skills: [], skillOffer: null, activeArchetypes: [], lightning: initLightning(),
    heat: null, // Feuer-Archetyp (#93 F1): erst beim ersten Feuer-Skill via initHeat() aktiviert
    iceTemp: {}, frostbitePending: {}, frostbiteActive: {}, frostSwapsUsed: [], // Eis-Rework (v0): temp Wert (Kaltfront) / Vergletscherung-Gegner-Debuff / genutzte Frosttausche
    layers: {}, frostFormPrev: [], // Eis-Rework (v0): Schichten je Frostkarte (permanent) / Beständigkeits-Historie
    growth: {}, colonized: {}, // Pflanze-Fraktion (v0): Wachstum je card.id (nur steigend) / kolonisierte Gegnerkarten (grün = card.green)
    ash: 0, brandPending: {}, brandActive: {}, forged: {}, // Feuer-Rework (v0): Asche-Ressource / Brand-Marker (Gegner, je card.id) / geschmiedete Dauerwerte
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

// Ziel-Bedarf eines Shop-Kaufs (flaches Item ODER Shop-Familie #164) — liefert den Ziel-Deskriptor
// { cards?, color?, segment?, position?, ... }. Familien tragen ihn als `pickTarget` der Zielstufe.
function shopTargetSpec(st) {
  if (!st) return {};
  if (st.familyId) return SHOP_FAMILY_DEFS[st.familyId]?.tiers?.[st.famTier]?.pickTarget || {};
  return SHOP_ITEM_DEFS[st.itemId]?.target || {};
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
      // Shop-Familie (#164): Ziel-Familien (Karten/Anker/…) öffnen die shop-target-Phase; ziel-lose Familien
      // (Planung: Neuwürfe/Legendär-Boni/Schicksalskontrolle) wenden ihren Effekt sofort an (kein Ziel-Schritt).
      if (offer.family) {
        const fam = SHOP_FAMILY_DEFS[offer.familyId];
        const tierDef = fam && fam.tiers[offer.famTier];
        if (!fam || !tierDef) return state;
        if (!tierDef.pickTarget) {
          const newShop = { ...shop, coins: (shop.coins || 0) - offer.price,
            purchasedOfferIds: [...(shop.purchasedOfferIds || []), offer.offerId],
            familyTiers: { ...(shop.familyTiers || {}), [fam.id]: offer.famTier },
            purchaseLog: [...(shop.purchaseLog || []), familyPurchaseLogEntry(fam.id, offer.category, offer.famTier, offer.price, state.cycle, null)] };
          if (tierDef.onBuy) Object.assign(newShop, tierDef.onBuy(shop));                                 // Planungs-Familien: Shop-Felder setzen
          return { ...state, phase: "shop", shop: newShop };
        }
        return { ...state, phase: "shop-target",
                 shopTarget: { offerId: offer.offerId, familyId: offer.familyId, famTier: offer.famTier, cards: [], colors: {}, segment: null, position: null, colorPair: [], boundary: null, formationType: null, category: null, targetOfferId: null } };
      }
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
      const formations2 = computeFormations(state.playerOrder, deck2, state.roles, state.perks, state.skills, newShop.anchors, state.familyTiers);
      return { ...merged, deck: deck2, formations: formations2, shop: newShop };
    }

    // ---- Shop-Ziel-Auswahl (Shop-Spec §12.2) — Karten/Farben/Segment wählen; Münzen erst bei CONFIRM. ----
    case "SHOP_TARGET_CARD": {
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      const need = shopTargetSpec(state.shopTarget).cards || 0;
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
      if (!shopTargetSpec(state.shopTarget).color || !state.shopTarget.cards.includes(action.cardId)) return state;
      const card = state.deck.find((c) => c.id === action.cardId);
      if (!card || action.color === card.suit || !C.SUIT_ORDER.includes(action.color)) return state; // andere gültige Farbe
      return { ...state, shopTarget: { ...state.shopTarget, colors: { ...state.shopTarget.colors, [action.cardId]: action.color } } };
    }
    case "SHOP_TARGET_SEGMENT": {
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      const nSeg = Math.ceil(state.playerOrder.length / SEGMENT_SIZE);
      if (!shopTargetSpec(state.shopTarget).segment || !(action.segment >= 0 && action.segment < nSeg)) return state;
      return { ...state, shopTarget: { ...state.shopTarget, segment: action.segment } };
    }
    case "SHOP_TARGET_POSITION": { // Anker-Position wählen (§8): 0..39, nur freie Positionen (max 1 Anker/Position).
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      const st = state.shopTarget;
      const p = action.position;
      if (!shopTargetSpec(st).position || !(p >= 0 && p < state.playerOrder.length)) return state;
      // #164 Anker-Familie: die eigene (zu ersetzende) Anker-Position ist erlaubt; nur FREMDE Anker blockieren (§8.1).
      const ownType = st.familyId ? SHOP_FAMILY_DEFS[st.familyId]?.anchorType : null;
      if ((state.shop?.anchors || []).some((a) => a.position === p && a.type !== ownType)) return state;
      return { ...state, shopTarget: { ...st, position: p } };
    }
    // (SHOP_TARGET_COLOR_PAIR / _BOUNDARY / _FORMATION_TYPE entfielen #179 — sie bedienten nur die zu Perks migrierten
    //  Formations-Familien Farballianz/Offene Grenze/Formationskern; die Perk-Seite nutzt den family-target-Flow.)
    case "SHOP_TARGET_CATEGORY": { // Warenwechsel (#164): eine der vier Shop-Kategorien wählen.
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      if (!shopTargetSpec(state.shopTarget).category || !C.SHOP_CATEGORIES.includes(action.category)) return state;
      return { ...state, shopTarget: { ...state.shopTarget, category: action.category } };
    }
    case "SHOP_TARGET_OFFER": { // Reservierung (#164): ein anderes, noch nicht gekauftes Angebot wählen (nicht die Reservierung selbst).
      if (state.phase !== "shop-target" || !state.shopTarget) return state;
      if (!shopTargetSpec(state.shopTarget).offer) return state;
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
      const shop = state.shop || {};
      const offer = (shop.offers || []).find((o) => o.offerId === st.offerId);
      if (!offer) return state;
      if ((shop.purchasedOfferIds || []).includes(offer.offerId)) return state;     // schon gekauft
      if ((shop.coins || 0) < offer.price) return state;                            // nicht bezahlbar
      // ---- Shop-Familie (#164): kumulatives Kartenpaket via applyFamilyPick; Rang in shop.familyTiers. ----
      if (st.familyId) {
        const fam = SHOP_FAMILY_DEFS[st.familyId];
        const tierDef = fam && fam.tiers[st.famTier];
        if (!fam || !tierDef) return state;
        const spec = tierDef.pickTarget || {};
        // ---- Anker-Familie (#164): EIN Anker je Typ, Stärke = Stufe; Position (neu) gewählt, fremde Anker blockieren. ----
        if (fam.cat === "anchors") {
          // Zeitsegment (SF_A_TIME): Segment + Stufe (Wiederholungstiefe) setzen — kein Positions-Anker.
          if (fam.anchorType === "time") {
            if (spec.segment && st.segment == null) return state;
            const newShop = { ...shop, timeSegmentIndex: st.segment, timeSegmentTier: st.famTier, coins: (shop.coins || 0) - offer.price,
              purchasedOfferIds: [...(shop.purchasedOfferIds || []), offer.offerId],
              familyTiers: { ...(shop.familyTiers || {}), [fam.id]: st.famTier },
              purchaseLog: [...(shop.purchaseLog || []), familyPurchaseLogEntry(fam.id, offer.category, st.famTier, offer.price, state.cycle, { segment: st.segment })] };
            return { ...state, phase: "shop", shopTarget: null, shop: newShop };
          }
          if (spec.position && (st.position == null || (shop.anchors || []).some((a) => a.position === st.position && a.type !== fam.anchorType))) return state;
          // Stufen-Parameter (power/score/crit/streak/factor/jokerTypes/…) auf den Anker-Eintrag legen → Engine/formations
          // lesen sie direkt (kein Registry-Lookup je Stich, kein Import-Zyklus formations↔shopFamilies).
          const { desc, pickTarget, ...params } = tierDef;
          const anchors = [...(shop.anchors || []).filter((a) => a.type !== fam.anchorType), { type: fam.anchorType, position: st.position, tier: st.famTier, familyId: fam.id, ...params }];
          const newShop = { ...shop, anchors, coins: (shop.coins || 0) - offer.price,
            purchasedOfferIds: [...(shop.purchasedOfferIds || []), offer.offerId],
            familyTiers: { ...(shop.familyTiers || {}), [fam.id]: st.famTier },
            purchaseLog: [...(shop.purchaseLog || []), familyPurchaseLogEntry(fam.id, offer.category, st.famTier, offer.price, state.cycle, { position: st.position })] };
          const formations = computeFormations(state.playerOrder, state.deck, state.roles, state.perks, state.skills, newShop.anchors, state.familyTiers);
          return { ...state, formations, phase: "shop", shopTarget: null, shop: newShop };
        }
        // (Ziel-Formations-Familien Farballianz/Offene Grenze/Formationskern sind #179 zu Perk-Kat.-E migriert — kein Shop-Pfad mehr.)
        // ---- Ziel-Planungs-Familie (#164): Warenwechsel (Sofort-Reroll) / Reservierung (Angebot vormerken). ----
        if (fam.cat === "planning") {
          const base = { ...shop, coins: (shop.coins || 0) - offer.price,
            purchasedOfferIds: [...(shop.purchasedOfferIds || []), offer.offerId],
            familyTiers: { ...(shop.familyTiers || {}), [fam.id]: st.famTier },
            purchaseLog: [...(shop.purchaseLog || []), familyPurchaseLogEntry(fam.id, offer.category, st.famTier, offer.price, state.cycle, { category: st.category, offerId: st.targetOfferId })] };
          if (fam.id === "SF_P_RESTOCK") { // Warenwechsel: `restockScope` Kategorien ab der gewählten neu würfeln (das gekaufte Angebot bleibt).
            if (st.category == null) return state;
            const scope = tierDef.restockScope || 1;
            const i0 = C.SHOP_CATEGORIES.indexOf(st.category);
            const cats = scope === Infinity ? C.SHOP_CATEGORIES
              : Array.from({ length: Math.min(scope, C.SHOP_CATEGORIES.length) }, (_, k) => C.SHOP_CATEGORIES[(i0 + k) % C.SHOP_CATEGORIES.length]);
            let sh = base;
            for (const cat of cats) sh = rerollCategory(sh, cat, SHOP_ITEM_DEFS, action.rng, state.perks, null, SHOP_FAMILY_DEFS);
            return { ...state, phase: "shop", shopTarget: null, shop: sh };
          }
          // Reservierung: gewähltes Angebot merken; `reserveShops` = Persistenz (Anzahl folgender Shops).
          if (st.targetOfferId == null || !(shop.offers || []).some((o) => o.offerId === st.targetOfferId)
            || (shop.purchasedOfferIds || []).includes(st.targetOfferId)) return state;
          const off = (shop.offers || []).find((o) => o.offerId === st.targetOfferId);
          const reservedItem = { ...(off.family ? { family: true, familyId: off.familyId, famTier: off.famTier } : { itemId: off.itemId, tier: off.tier, legendary: !!off.legendary }),
            category: off.category, price: off.price, shopsLeft: tierDef.reserveShops || 1 };
          return { ...state, phase: "shop", shopTarget: null, shop: { ...base, reservedItem } };
        }
        if (spec.cards && st.cards.length !== spec.cards) return state;             // genau N Karten
        if (spec.color && st.cards.some((id) => !st.colors[id])) return state;      // je Karte eine Farbe
        if (spec.segment && st.segment == null) return state;                        // ein Segment
        // #195: Feinschliff-Differenz wird per KARTE in onPick aufgelöst (card.refined), nicht mehr aus dem
        // gehaltenen Familienrang — so bekommt eine frische Karte den vollen Stufenwert (kein +0-Nachkauf).
        const target = { cardIds: st.cards, colors: st.colors, segment: st.segment, order: state.playerOrder };
        const { deck } = applyFamilyPick(st.familyId, st.famTier,
          { familyTiers: {}, deck: state.deck, roles: state.roles, target }, action.rng, SHOP_FAMILY_DEFS);
        const newDeck = deck || state.deck;
        const newShop = { ...shop, coins: (shop.coins || 0) - offer.price,          // Preis erst jetzt abziehen (§12.2)
          purchasedOfferIds: [...(shop.purchasedOfferIds || []), offer.offerId],
          familyTiers: { ...(shop.familyTiers || {}), [st.familyId]: st.famTier },
          purchaseLog: [...(shop.purchaseLog || []), familyPurchaseLogEntry(st.familyId, offer.category, st.famTier, offer.price, state.cycle, target)] };
        const formations = computeFormations(state.playerOrder, newDeck, state.roles, state.perks, state.skills, newShop.anchors, state.familyTiers);
        return { ...state, deck: newDeck, formations, phase: "shop", shopTarget: null, shop: newShop };
      }
      const def = SHOP_ITEM_DEFS[st.itemId];
      if (!def) return state;
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
      const formations = computeFormations(state.playerOrder, deck, state.roles, state.perks, state.skills, newShop.anchors, state.familyTiers);
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
      // Kat. A (Deck-Mods beim Pick) ist zu Familien migriert (#167) → flache Perks verändern das Deck nicht mehr.
      let deck = state.deck;
      // Umverteilung (L_UMV, #203): alle Karten nehmen sofort DAUERHAFT den (gerundeten) Deck-Durchschnittswert an
      // (KEINE Karte wird entfernt) → glättet ein schiefes Deck und macht es uniform (→ Wiederholungs-Formationen).
      // round statt floor: floor senkt jede Karte um ~0,5 → drückt die Winrate; round bleibt neutral um den Ø.
      if (def.redistribute) {
        const avg = Math.round(state.deck.reduce((s, c) => s + c.value, 0) / Math.max(1, state.deck.length));
        deck = state.deck.map((c) => ({ ...c, value: avg }));
      }
      // Perks mit manueller Kartenauswahl öffnen die Zielauswahl (§22.5); sonst weiter.
      const goTarget = !!def.needsTarget;
      const formations = def.redistribute
        ? computeFormations(state.playerOrder, deck, state.roles, perks, state.skills, state.shop?.anchors || [], state.familyTiers)
        : state.formations;
      return { ...state, perks, deck, offer: null, formations,
               phase: goTarget ? "target" : "play",
               targetPerk: goTarget ? perkId : null };
    }

    // Familien-Pick (Rarität-Umbau #167, Spec §2.4): eine Familie auf eine Zielstufe (I–IV) heben/erwerben.
    // Läuft ADDITIV neben PICK_PERK; applyFamilyPick liefert das Patch (familyTiers, deck, roles) — bei
    // REPLACEMENT (Kat. D) nur der Rang, CUMULATIVE führt ihr Deck-Paket aus. Die Angebotsvalidierung
    // (Familie+Stufe im Angebot, Ziel-Flow bei ROLE) folgt mit buildFamilyOffer (#163 Schritt 3).
    case "PICK_FAMILY": {
      if (state.phase !== "levelup") return state;
      const { familyId, tier, rng } = action;
      const fam = familyDef(familyId);
      if (!fam || !tier) return state;
      // Angebotsvalidierung (Spec §2.4): die Familie+Zielstufe muss im aktuellen Angebot stehen (analog PICK_PERK).
      if (!state.offer || !state.offer.some((e) => e && e.familyId === familyId && e.tier === tier)) return state;
      const applyNow = () => {
        const { familyTiers, deck, roles } = applyFamilyPick(
          familyId, tier, { familyTiers: state.familyTiers, deck: state.deck, roles: state.roles }, rng);
        return { ...state, familyTiers, deck, roles, offer: null, phase: "play" };
      };
      const pt = fam.tiers[tier] && fam.tiers[tier].pickTarget;
      if (!pt) return applyNow();                                                          // kein Ziel → direkt anwenden
      // Farb-Ziel (A_SUIT_BOOST/A_SUIT_DUEL; #179 auch Farballianz E_COLOR_ALLIANCE): immer die volle Anzahl frisch wählen.
      if (pt.suits) return { ...state, offer: null, phase: "family-target", familyTarget: { familyId, tier, kind: "suits", need: pt.suits, suits: [], cards: [], formationType: null } };
      // Formationstyp-Ziel (#179, Formationskern E_CORE): genau einen der vier Basistypen wählen.
      if (pt.formationType) return { ...state, offer: null, phase: "family-target", familyTarget: { familyId, tier, kind: "formationType", need: 1, suits: [], cards: [], formationType: null } };
      // Karten-Ziel: ROLE wählt nur die ZUSÄTZLICHEN Ziele (Stufe-Ziel − bereits gehaltene, Spec §2.3);
      // CUMULATIVE (C_SACRIFICE) wählt die volle Anzahl. need 0 (Upgrade ohne neue Ziele) → direkt anwenden.
      const held = fam.upgradeType === UPGRADE_TYPES.ROLE ? ((state.roles || {})[familyId] || []).length : 0;
      const need = Math.max(0, pt.cards - held);
      if (need === 0) return applyNow();
      return { ...state, offer: null, phase: "family-target", familyTarget: { familyId, tier, kind: "cards", need, suits: [], cards: [] } };
    }

    // ---- Familien-Ziel-Auswahl (Rarität #167, Spec §2.3/§2.4) — Farb- ODER Karten-Ziel für pickTarget-Stufen.
    //      `familyTarget = { familyId, tier, kind:"suits"|"cards", need, suits, cards }`. Kategorie C nutzt den
    //      Karten-Modus für Rollen-Ziele; A den Farb-Modus. ----
    case "FAMILY_TARGET_SUIT": {
      if (state.phase !== "family-target" || !state.familyTarget || state.familyTarget.kind !== "suits") return state;
      const ft = state.familyTarget;
      if (!C.SUIT_ORDER.includes(action.suit)) return state;
      let suits = ft.suits.slice();
      if (suits.includes(action.suit)) suits = suits.filter((s) => s !== action.suit);   // abwählen
      else if (suits.length < ft.need) suits.push(action.suit);                           // hinzufügen (Reihenfolge = Gewinner→Verlierer)
      else if (ft.need === 1) suits = [action.suit];                                      // Einzelwahl: umschalten
      else return state;                                                                  // Limit erreicht → ignorieren
      return { ...state, familyTarget: { ...ft, suits } };
    }
    case "FAMILY_TARGET_CARD": {
      if (state.phase !== "family-target" || !state.familyTarget || state.familyTarget.kind !== "cards") return state;
      const ft = state.familyTarget;
      if (!state.deck.some((c) => c.id === action.cardId)) return state;                  // Karte muss existieren
      // Bereits als Rolle DIESER Familie gehaltene Karten sind kein gültiges Zusatz-Ziel (Rollen-Upgrade).
      if (((state.roles || {})[ft.familyId] || []).includes(action.cardId)) return state;
      let cards = ft.cards.slice();
      if (cards.includes(action.cardId)) cards = cards.filter((id) => id !== action.cardId); // abwählen
      else if (cards.length < ft.need) cards.push(action.cardId);                            // hinzufügen
      else return state;                                                                     // Limit erreicht
      return { ...state, familyTarget: { ...ft, cards } };
    }
    case "FAMILY_TARGET_FORMATION_TYPE": {
      if (state.phase !== "family-target" || !state.familyTarget || state.familyTarget.kind !== "formationType") return state;
      if (!FORMATION_TYPES.includes(action.formationType)) return state;
      const cur = state.familyTarget.formationType === action.formationType ? null : action.formationType; // Antippen schaltet um/ab
      return { ...state, familyTarget: { ...state.familyTarget, formationType: cur } };
    }
    case "FAMILY_TARGET_CONFIRM": {
      if (state.phase !== "family-target" || !state.familyTarget) return state;
      const ft = state.familyTarget;
      const sel = ft.kind === "cards" ? ft.cards : ft.kind === "suits" ? ft.suits : (ft.formationType ? [ft.formationType] : []);
      if (sel.length !== ft.need) return state;                                            // genau `need` Ziele nötig
      const target = { suits: ft.suits, cards: ft.cards, formationType: ft.formationType, order: state.playerOrder };
      const { familyTiers, deck, roles } = applyFamilyPick(
        ft.familyId, ft.tier, { familyTiers: state.familyTiers, deck: state.deck, roles: state.roles, target }, action.rng);
      // Rollen/Deck können die Formationserkennung ändern (C_JOKER/C_BRIDGE, C_SACRIFICE-Deckmod) → neu berechnen (wie CONFIRM_TARGET).
      const formations = computeFormations(state.playerOrder, deck, roles, state.perks, state.skills, state.shop?.anchors || [], familyTiers);
      return { ...state, familyTiers, deck, roles, formations, phase: "play", familyTarget: null };
    }

    // Zielauswahl bestätigen (V2 §22.6): genau needsTarget Karten → Rolle setzen bzw. dauerhafte Wertmod (L1/L9).
    // C-Rollen (inkl. C9 Opfergabe) sind zu Familien migriert (#167) → laufen über den Familien-Ziel-Fluss, nicht hier.
    case "CONFIRM_TARGET": {
      if (state.phase !== "target" || !state.targetPerk) return state;
      const def = PERK_DEFS[state.targetPerk];
      const need = def.needsTarget || 0;
      const ids = (action.cardIds || []).slice(0, need);
      if (ids.length !== need || new Set(ids).size !== need) return state; // genau N unterschiedliche Karten
      let deck = state.deck;
      if (def.permMod) { // L1 Überladung / L9 Blutvertrag: dauerhafte Wertmods der gewählten Karten.
        deck = def.permMod(state.deck, state.playerOrder, ids);
      }
      const roles = { ...(state.roles || {}), [state.targetPerk]: ids };
      return { ...state, deck, roles, formations: computeFormations(state.playerOrder, deck, roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers), phase: "play", targetPerk: null };
    }

    // Stat-Auswahl (V2 §22.3): der gewählte Stat addiert seinen Step auf das zugehörige Summenfeld.
    case "PICK_STAT": {
      if (state.phase !== "levelup" || !state.statOffer) return state;
      const def = STAT_DEFS[action.statId];
      if (!def) return state;
      return { ...state, [def.field]: (state[def.field] || 0) + def.step, phase: "play", statOffer: null,
               statPicks: [...(state.statPicks || []), action.statId] }; // #190: Mono-Stat-Challenge-Tracking
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
      // Feuer-Rework (v0): Asche / Brand-Marker / geschmiedete Werte (beim Deaktivieren des Feuer-Archetyps zurückgesetzt).
      let ash = state.ash || 0, brandPending = state.brandPending || {}, brandActive = state.brandActive || {}, forged = state.forged || {};
      // Eis-Zustand (wird beim Deaktivieren des Eis-Archetyps zurückgesetzt, #140).
      let iceTemp = state.iceTemp, frostSwapsUsed = state.frostSwapsUsed;
      let frostbitePending = state.frostbitePending, frostbiteActive = state.frostbiteActive;
      let layers = state.layers || {}, frostFormPrev = state.frostFormPrev || []; // Eis-Rework (v0): Schichten + Beständigkeits-Historie
      let growth = state.growth || {}, colonized = state.colonized || {}; // Pflanze-Fraktion (v0): Wachstum / Kolonisierung
      if (arch === "lightning") lightning = { ...lightning, active: true, maxCharge: maxChargeFor(skills) }; // Donnergott → 15 (#93 F2)
      if (arch === "fire" && !(heat && heat.active)) heat = { ...initHeat(), active: true, max: heatMaxFor(skills) };
      // Eis (#93 F3): dieser Pick friert so viele NEUE eigene Karten ein, dass das Ziel (frozenTargetFor) erreicht ist.
      if (arch === "ice") {
        const toFreeze = Math.max(0, frozenTargetFor(skills) - frozenCount(deck));
        if (toFreeze > 0) deck = freezeCards(deck, toFreeze, action.rng, hasFrostwahl(skills)); // Frostwahl: niedrigste Karten gezielt
      }
      // Pflanze (v0): erster Pflanze-Skill → Alter Anker (1 Karte reif: grün, Wert 11) + Setzlingsbeet/Dornenkönig.
      if (arch === "plant" && !(state.activeArchetypes || []).includes("plant")) {
        deck = deck.map((c, i) => (i === 0 ? { ...c, green: true, value: C.PLANT_ANCHOR_VALUE } : c)); // Alter Anker (Zündfunke ab Durchlauf 1)
        if (hasSetzlingsbeet(skills)) { // niedrigste Karte je Segment +3 Wachstum
          const g = { ...growth };
          for (let seg = 0; seg * SEGMENT_SIZE < state.playerOrder.length; seg++) {
            let lowId = null, lowV = Infinity;
            for (let p = seg * SEGMENT_SIZE; p < (seg + 1) * SEGMENT_SIZE && p < state.playerOrder.length; p++) {
              const c = deck[state.playerOrder[p]];
              if (c.value < lowV) { lowV = c.value; lowId = c.id; }
            }
            if (lowId != null) g[lowId] = (g[lowId] || 0) + C.SETZLINGSBEET_GROWTH;
          }
          growth = g;
        }
        if (hasDornenkoenig(skills)) colonized = Object.fromEntries(state.oppDeck.map((c) => [c.id, true])); // Dornenkönig: ganzes Gegnerdeck kolonisiert
      }
      if (arch && !activeArchetypes.includes(arch)) activeArchetypes = [...activeArchetypes, arch];
      // #140: Verliert man durch Ersetzen den LETZTEN Skill eines Archetyps (0 Skills übrig), wird er deaktiviert
      // und seine Ressourcen/Marker verschwinden — sonst bleiben „Geister"-Leisten/eingefrorene Karten ohne Skill.
      const stillActive = new Set(skills.map(archetypeOf).filter(Boolean));
      activeArchetypes = activeArchetypes.filter((a) => stillActive.has(a));
      if (!stillActive.has("lightning")) lightning = initLightning();               // Ladungsleiste weg
      if (!stillActive.has("fire")) { heat = null; ash = 0; brandPending = {}; brandActive = {}; forged = {}; } // Hitze/Asche/Brand/Schmiede weg (geschmiedete Dauerwerte bleiben gebacken)
      if (!stillActive.has("ice")) {                                                 // Frostkarten auftauen + Schichten/Vergletscherung löschen
        deck = unfreezeAll(deck);
        iceTemp = {}; frostSwapsUsed = [];
        frostbitePending = {}; frostbiteActive = {}; layers = {}; frostFormPrev = [];
      }
      if (!stillActive.has("plant")) { deck = deck.map((c) => (c.green ? { ...c, green: false } : c)); growth = {}; colonized = {}; } // Pflanze weg (Anker-Wert bleibt gebacken)
      // Formationen neu berechnen: eingefrorene Karten + Eis-Skills beeinflussen die Erkennung (Wildcards/Anker).
      const formations = computeFormations(state.playerOrder, deck, state.roles, state.perks, skills, state.shop?.anchors || [], state.familyTiers);
      return { ...state, skills, activeArchetypes, lightning, heat, deck, iceTemp, frostSwapsUsed, frostbitePending, frostbiteActive, layers, frostFormPrev, growth, colonized, ash, brandPending, brandActive, forged, formations, phase: "play", skillOffer: null };
    }

    // Skill-Angebot ablehnen → stattdessen ein Perk-Angebot für diese Runde (nie „verschwendet").
    case "DECLINE_SKILL": {
      if (state.phase !== "levelup" || !state.skillOffer) return state;
      const off = buildPerkOffer(state.perks, state.familyTiers, action.rng, PERKS_OFFERED, perkLegendaryChance(state.shop));
      const fate = perkFateReroll(state.shop);                       // #164: gratis Perk-Reroll gilt fürs neue Perk-Angebot
      return off.length > 0
        ? { ...state, skillOffer: null, offer: off, freePerkReroll: fate, freeSkillReroll: false } // → Perk-Auswahl
        : { ...state, skillOffer: null, freeSkillReroll: false, phase: "play" };                   // Perk-Pool leer → weiterspielen
    }

    // Perk-Angebot komplett ablehnen (#138): +PERK_DECLINE_COINS Münze, Angebot verworfen, weiter im Spiel — so ist
    // eine Perk-Runde nie „verschwendet". Feste Münze (der Einkommen-Stat wirkt nur pro Shop-Besuch, hier nicht).
    case "DECLINE_PERK": {
      if (state.phase !== "levelup" || !state.offer) return state;
      const shop = { ...(state.shop || {}), coins: ((state.shop && state.shop.coins) || 0) + C.PERK_DECLINE_COINS };
      return { ...state, offer: null, shop, freePerkReroll: false, phase: "play" };
    }

    // Perk-Angebot neu würfeln (Shop-Spec §10 P1/P-L1): gratis Reroll (Schicksalskontrolle) zuerst, sonst
    // einen gespeicherten Token verbrauchen. Komplett neues Angebot (Seltenheitsregeln in buildOffer), rng deterministisch.
    case "REROLL_PERK": {
      if (state.phase !== "levelup" || !state.offer) return state;
      const free = !!state.freePerkReroll;
      const tokens = (state.shop && state.shop.perkRerolls) || 0;
      if (!free && tokens <= 0) return state;                        // keine Ressource → wirkungslos
      const offer = buildPerkOffer(state.perks, state.familyTiers, action.rng, PERKS_OFFERED, perkLegendaryChance(state.shop));
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
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers),
               formationEnergy: isFree ? state.formationEnergy : state.formationEnergy - 1,
               formationSwaps: [...(state.formationSwaps || []), { i, j, free: isFree, frozenId: freeFrozenId, idA: cardA.id, idB: cardB.id }],
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
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers),
               formationEnergy: last.free ? state.formationEnergy : state.formationEnergy + 1, formationSwaps: swaps, frostSwapsUsed };
    }
    // Alle Tausche der Phase zurücknehmen → Ausgangsreihenfolge + volle Energie + freie Frosttausche zurück.
    case "RESET_FORMATION": {
      if (state.phase !== "formation") return state;
      const order = state.playerOrder.slice();
      const swaps = state.formationSwaps || [];
      for (let k = swaps.length - 1; k >= 0; k--) { const { i, j } = swaps[k]; [order[i], order[j]] = [order[j], order[i]]; }
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers),
               formationEnergy: C.FORMATION_ENERGY + (state.perks || []).reduce((t, id) => t + (PERK_DEFS[id].extraSwap || 0), 0)
                 + formationEnergyBonus(state.familyTiers, state.cycle), // #179 Feinjustierung (Perk-Familie E_TUNING)
               formationSwaps: [], frostSwapsUsed: [] };
    }
    // Bestätigen → Reihenfolge bleibt persistent. Eis-Rework (v0): Kaltfront (Platzierhilfe temp Wert),
    // Gletscherschub/Verzahnung (Frosttausch schafft/überlappt Formation → Schicht), Ablage B (ungenutzte Tausche banken).
    case "CONFIRM_FORMATION": {
      if (state.phase !== "formation") return state;
      let iceTemp = state.iceTemp || {};
      let layers = state.layers || {};
      const skills = state.skills, usedFrost = state.frostSwapsUsed || [];
      const anchors = state.shop?.anchors || [];
      const posOfFrost = (fid) => state.playerOrder.findIndex((di) => state.deck[di].id === fid);
      // Kaltfront: getauschte Frostkarte + neuer Nachbar +3 temp Wert (Platzierhilfe für den nächsten Durchlauf).
      if (usedFrost.length && hasKaltfront(skills)) {
        iceTemp = { ...iceTemp };
        for (const fid of usedFrost) {
          const pos = posOfFrost(fid);
          if (pos < 0) continue;
          iceTemp[fid] = C.KALTFRONT_VALUE;
          if (pos + 1 < state.playerOrder.length) {
            const nid = state.deck[state.playerOrder[pos + 1]].id;
            iceTemp[nid] = Math.max(iceTemp[nid] || 0, C.KALTFRONT_VALUE);
          }
        }
      }
      // Gletscherschub / Verzahnung: ein Frosttausch, der eine NEUE (bzw. zweite überlappende) Formation schafft, bankt eine Schicht.
      if (usedFrost.length && (hasGlacierPush(skills) || hasVerzahnung(skills))) {
        const finalForms = state.formations || computeFormations(state.playerOrder, state.deck, state.roles, state.perks, skills, anchors, state.familyTiers);
        const origOrder = state.playerOrder.slice(); // Ausgangsreihenfolge = finale ohne alle Tausche dieser Phase
        const swaps = state.formationSwaps || [];
        for (let k = swaps.length - 1; k >= 0; k--) { const { i, j } = swaps[k]; [origOrder[i], origOrder[j]] = [origOrder[j], origOrder[i]]; }
        const baseForms = computeFormations(origOrder, state.deck, state.roles, state.perks, skills, anchors, state.familyTiers);
        layers = { ...layers };
        for (const fid of usedFrost) {
          const pos = posOfFrost(fid);
          if (pos < 0) continue;
          const segStart = Math.floor(pos / SEGMENT_SIZE) * SEGMENT_SIZE;
          let add = 0;
          if (hasGlacierPush(skills) && segmentGainedFormation(baseForms, finalForms, segStart)) add += C.GLACIER_PUSH_LAYER;
          if (hasVerzahnung(skills) && baseFormationCount(finalForms[pos] || {}) >= 2) add += C.VERZAHNUNG_LAYER; // Überlappung
          if (add > 0) layers[fid] = (layers[fid] || 0) + add;
        }
      }
      // Ablage B: jede Frostkarte, die ihren freien Frosttausch NICHT genutzt hat, bankt Schicht-Fortschritt
      // (Gleitfrost: mehr; Verdichtung: ×2). Grundmechanik — ein ungenutzter Tausch ist kein verlorener Zug.
      {
        const used = new Set(usedFrost);
        const bankPer = (C.ICE_UNUSED_SWAP_LAYER + (hasGleitfrost(skills) ? C.GLEITFROST_EXTRA_SWAP * C.ICE_UNUSED_SWAP_LAYER : 0))
                        * (hasVerdichtung(skills) ? C.VERDICHTUNG_FACTOR : 1);
        const frozenUnused = state.deck.filter((c) => c.frozen && !used.has(c.id));
        if (bankPer > 0 && frozenUnused.length) {
          const nl = { ...layers };
          for (const c of frozenUnused) nl[c.id] = (nl[c.id] || 0) + bankPer;
          layers = nl;
        }
      }
      return { ...state, phase: "play", formationEnergy: 0, formationSwaps: [], frostSwapsUsed: [], iceTemp, layers };
    }

    default:
      return state;
  }
}
