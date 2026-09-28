import { useMemo } from "react";

/* The in-run action creators of App.jsx, one thin closure per reducer action. Moved out of the 1,300-line
   AutostichGame body on 2026-09-28; nothing here reads component state — `dispatch` is stable, so the object
   is built once. The `rng: Math.random` payloads are the unseeded draw the reducer expects from the UI
   (seeded runs derive their streams from state.seed inside the reducer, see rngFor). */
export function useRunActions(dispatch) {
  return useMemo(() => ({
    // Perk-Auswahl: ein Angebotseintrag ist entweder eine Familie {familyId,tier} (Rarität #167) oder ein flacher perkId-String.
    pick: (entry) => (entry && typeof entry === "object" && entry.familyId)
      ? dispatch({ type: "PICK_FAMILY", familyId: entry.familyId, tier: entry.tier, rng: Math.random })
      : dispatch({ type: "PICK_PERK", perkId: entry, rng: Math.random }),
    // Formationsphase (§22.8): Tausch / Undo / Zurücksetzen / Bestätigen.
    swapCards: (i, j) => dispatch({ type: "SWAP_CARDS", i, j }),
    undoSwap: () => dispatch({ type: "UNDO_SWAP" }),
    resetFormation: () => dispatch({ type: "RESET_FORMATION" }),
    buyEnergy: () => dispatch({ type: "BUY_ENERGY" }),        // Münz-Ökonomie §3.2
    callFocus: (arch) => dispatch({ type: "CALL_FOCUS", arch, rng: Math.random }),   // Münz-Ökonomie §3.3
    upgradeSkill: (skillId) => dispatch({ type: "UPGRADE_SKILL", skillId }),          // Münz-Ökonomie §3.5
    upgradeFamily: (familyId) => dispatch({ type: "UPGRADE_FAMILY", familyId }),      // dieselbe Leiter für Perks
    confirmFormation: () => dispatch({ type: "CONFIRM_FORMATION" }),
    lockGlacier: (pos) => dispatch({ type: "GLACIER_LOCK", pos }), // Eis-Neudesign: Karte als Gletscher festfrieren (starr)
    confirmTarget: (cardIds) => dispatch({ type: "CONFIRM_TARGET", cardIds }),
    // Familien-Ziel-Auswahl (Rarität #167): Farbe(n) (Kat. A) bzw. Karten (Kat. C Rollen) für pickTarget-Stufen wählen.
    familyTargetSuit: (suit) => dispatch({ type: "FAMILY_TARGET_SUIT", suit }),
    familyTargetCard: (cardId) => dispatch({ type: "FAMILY_TARGET_CARD", cardId }),
    familyTargetFormationType: (formationType) => dispatch({ type: "FAMILY_TARGET_FORMATION_TYPE", formationType }), // #179 E_CORE
    familyTargetConfirm: () => dispatch({ type: "FAMILY_TARGET_CONFIRM", rng: Math.random }),
    // Skill-Auswahl (zu festen Zeitpunkten laut DECISION_SCHEDULE): wählen (optional einen belegten Slot ersetzen) oder ablehnen → Perk.
    pickSkill: (skillId, replaceId) => dispatch({ type: "PICK_SKILL", skillId, replaceId, rng: Math.random }),
    declineSkill: () => dispatch({ type: "DECLINE_SKILL", rng: Math.random }),
    chooseDoor: (index) => dispatch({ type: "CHOOSE_DOOR", index }), // exp skill rework: eine der zwei Türen öffnen
    rerollPerk: () => dispatch({ type: "REROLL_PERK", rng: Math.random }),
    declinePerk: () => dispatch({ type: "DECLINE_PERK" }), // #138 + §2.3: Perk-Angebot ablehnen → +Münzen
    sellPerk: (kind, id) => dispatch({ type: "SELL_PERK", kind, id }), // §3.6: gehaltenen Perk abgeben → +Münzen
    rerollSkill: () => dispatch({ type: "REROLL_SKILL", rng: Math.random }),
    // Architekt (#202, ersetzt den Shop): Bauplan errichten / Gebäude ausbauen / versetzen / abreißen / Phase bestätigen.
    architectBuild: ({ familyId, tier, footprint, colorChoice }) => dispatch({ type: "ARCHITECT_BUILD", familyId, tier, footprint, colorChoice }),
    architectUpgrade: (buildingId) => dispatch({ type: "ARCHITECT_UPGRADE", buildingId }),
    architectMove: ({ buildingId, footprint }) => dispatch({ type: "ARCHITECT_MOVE", buildingId, footprint }),
    architectMoveMulti: (moves) => dispatch({ type: "ARCHITECT_MOVE_MULTI", moves }),
    architectDemolish: (buildingId) => dispatch({ type: "ARCHITECT_DEMOLISH", buildingId }),
    architectRecolor: ({ buildingId, colorChoice }) => dispatch({ type: "ARCHITECT_RECOLOR", buildingId, colorChoice }),
    architectDone: () => dispatch({ type: "ARCHITECT_DONE" }),
    architectUndo: () => dispatch({ type: "ARCHITECT_UNDO" }),   // #361: letzten Schritt dieser Phase zurück
    architectReset: () => dispatch({ type: "ARCHITECT_RESET" }), // #361: auf Phasen-Beginn zurück
    rerollArchitect: () => dispatch({ type: "REROLL_ARCHITECT", rng: Math.random }), // #263: Gebäude-Reroll-Pool
    buyCover: () => dispatch({ type: "BUY_COVER" }),          // Münz-Ökonomie §3.4
  }), [dispatch]);
}
