import * as C from "./constants.js";

/* ============================================================
   SHOP-RESIDUEN (#229) — reine Logik, kein Math.random / Date.
   Der Shop selbst wurde entfernt (der Architekt #202 ersetzt ihn). Übrig bleiben nur die engine-/UI-
   LEBENDIGEN Helfer, die zufällig in dieser Datei lebten:
     - Positionsanker (an der Deckposition 0–39) — im Architekt-Spiel bleibt shop.anchors immer [] (inert),
       die Helfer werden aber je Stich/Render aufgerufen (Engine/CardGrid) und geben dann sauber null/[] zurück.
     - Legendär-Chance- + Gratis-Neuwurf-Helfer für die Perk-/Skill-Angebote.
     - cycleLenFor — Zykluslänge je Durchlauf (konstant; das Shop-Zeitsegment ist entfernt).
     - initialShop — schlanker Substate (hält nur die inerten Anker).
     - linkedPartnerOf — Farballianz-UI-Helfer (#179), hat nichts mit dem Shop zu tun, lebt nur hier.
   ============================================================ */

/* ---- Positionsanker (Deckposition, nicht card.id). ---- */
export const anchorTypeAt = (anchors, pos) => (anchors || []).find((a) => a.position === pos)?.type || null;
export const anchorAt     = (anchors, pos) => (anchors || []).find((a) => a.position === pos) || null;

// Farballianz (#179): Partner-Farbe (Suit-Key) einer Farbe innerhalb ihrer Allianz-Gruppe — sonst null.
// Rein für die UI (diagonaler Zweifarben-Split); `view` trägt `linkedGroups`; Altfeld `linkedColors` (2er) bleibt kompatibel.
export const linkedPartnerOf = (view, suit) => {
  const groups = (view && view.linkedGroups) || ((view && (view.linkedColors || []).length === 2) ? [view.linkedColors] : []);
  for (const g of groups) { if (g.includes(suit)) return g.find((s) => s !== suit) || null; }
  return null;
};
/* Review-Runde 2026-08-28 (Zeile 32): ALLE Partnerfarben der Allianz-Gruppe — eine 3er/4er-Allianz
   zeigte auf der Karte sonst nur eine der verbündeten Farben. */
export const linkedPartnersOf = (view, suit) => {
  const groups = (view && view.linkedGroups) || ((view && (view.linkedColors || []).length === 2) ? [view.linkedColors] : []);
  for (const g of groups) { if (g.includes(suit)) return g.filter((s) => s !== suit); }
  return [];
};

// Legendär-Chance je Perk-/Skill-Angebot: Basis + additiver Bonus (bis Cap). Ohne Shop = reine Basis.
export const perkLegendaryChance  = (shop = {}) => C.PERK_LEGENDARY_BASE  + Math.min(shop.perkLegendaryBonus  || 0, C.MAX_LEGENDARY_CHANCE_BONUS);
// #247: Der additive „skillLegendaryBonus"-Pity ist totes Feld (Rest vom entfernten Shop, wurde nie hochgezählt) und
// entfällt hier — die Skill-Legendär-Chance ist die reine Basis (je Archetyp gewürfelt in buildSkillOffer).
export const skillLegendaryChance = () => C.SKILL_LEGENDARY_BASE;
// #263: Free-Reroll-/fateControl-Mechanik entfernt — alle Rerolls laufen ausschließlich über die drei Kategorie-Pools.

// Zykluslänge je Durchlauf: konstant TRICKS_PER_CYCLE (#229: das Shop-Zeitsegment ist entfernt).
export const cycleLenFor = () => C.TRICKS_PER_CYCLE;

// Frischer Shop-Substate bei Run-Beginn: nur noch die (inerten) Positionsanker.
export function initialShop() {
  return { anchors: [] };
}
