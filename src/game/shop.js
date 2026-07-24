import * as C from "./constants.js";

/* ============================================================
   SHOP-SYSTEM (Shop-Spec) — reine Logik, kein Math.random / Date.
   Phase S0: Run-State + Münzökonomie. Angebot/Items/Rerolls folgen in S1+.
   Trennung (Spec §6): Geld · Angebot · Planungsressourcen · permanente Regeländerungen ·
   Positionsanker · gekaufte Legendäre.
   ============================================================ */

// Frischer Shop-Substate bei Run-Beginn. Felder für spätere Phasen sind schon angelegt (Defaults inert),
// damit das State-Shape stabil bleibt und keine Phase es später umbauen muss.
export function initialShop() {
  return {
    coins: C.STARTING_COINS,        // §3: globaler Run-State, kein Cap, nie negativ
    offers: null,                   // S1: aktuelles Shop-Angebot (2 Items je Kategorie)
    purchasedOfferIds: [],          // S1: in DIESEM Shop gekaufte Angebots-Instanzen
    boughtLegendaryIds: [],         // §5.7: pro Run einmalig gekaufte Legendäre (nie wieder)
    reservedItem: null,             // P4: reserviertes Item fürs nächste Angebot
    perkRerolls: 0, skillRerolls: 0, // P1/P2: gespeicherte Neuwürfe
    fateControl: false,             // P-L1: je Perk-/Skill-Auswahl ein kostenloser Neuwurf
    perkLegendaryBonus: 0, skillLegendaryBonus: 0, // P5/P6: additive Legendär-Chance (Cap in S5)
    permanentEffects: {},           // S4: F-Items (Regeländerungen der Formationserkennung)
    anchors: [],                    // S3: Positionsanker (an Position, nicht card.id)
    timeSegmentIndex: null,         // A-L1: gewähltes Zeitsegment
  };
}

// Münzen je vollständig abgeschlossenem Durchlauf (Spec §3.2): Basis + Einkommen-Level. Nie negativ.
export function coinsPerCycle(economyStatLevel = 0) {
  return C.BASE_COINS_PER_CYCLE + Math.max(0, economyStatLevel || 0);
}
