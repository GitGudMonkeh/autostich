import { fundamentBonus } from "../game/perks.js";
/* #202/#UI: Architekt-Gebäude-Overlay je Deck-Position für das CardGrid — geteilt von den Ziel-Auswahlen
   (FamilyTargetSelect/TargetSelect/ShopTargetSelect), damit man beim Wählen von Farben/Formationen/Karten das
   Deck MIT aktuellen Gebäuden sieht (informierte Wahl). Output IDENTISCH zur Inline-Variante in FormationPhase/
   ChronikOverview (inkl. `bid` + `effects`, die das CardGrid für die Gebäude-Kontur/den Detail-Readout braucht).

   Reine Ableitung aus `state` (nur wenn der Architekt aktiv ist UND Gebäude stehen), sonst null. Pro Position:
   { cat, color, icon, boost, legendary, name, badgeSuit, bid, effects }. `boost` = echter Wert-Bonus der dort
   stehenden Karte (nur value-Gebäude, konditional wie in der Engine); `badgeSuit` = die gebufte Farbe oder null. */
import { precomputeArchitect, architectValueBonus, familyDef, occupiedCells, structureFactorMap, districtFactorMap } from "../game/architect.js";
import { allianceGroups } from "../game/families.js"; // #289: Farballianz für die Badge-Anzeige
import { architectEffectStrings } from "./archEffects.js";
import { ARCH_CAT } from "./indicators/vocab.js";

// Platzierte Architekt-Gebäude dieses States (oder [] wenn Architekt aus / keine Bauten). Eine Quelle für alle Panels.
export function architectBuildings(state = {}) {
  const a = state.architect;
  return (state.architectEnabled && a && Array.isArray(a.buildings) && a.buildings) || [];
}

export function architectCoverFor(state) {
  const architect = state.architect;
  const buildings = architectBuildings(state);
  if (!buildings.length) return null;
  const deck = state.deck || [];
  const order = state.playerOrder || [];
  const pre = precomputeArchitect(architect, order, deck, fundamentBonus(state.perks));
  const alliance = allianceGroups(state.familyTiers, state.roles); // #289
  const cover = {};
  for (const b of buildings) {
    const fam = familyDef(b.familyId);
    if (!fam) continue;
    const cat = ARCH_CAT[fam.category];
    for (const pos of b.footprint) {
      const card = deck[order[pos]];
      const boost = fam.category === "value" && card ? architectValueBonus(pre, pos, card, alliance) : 0;
      const badgeSuit = fam.colorLocked ? (b.colorChoice || null) : null;
      cover[pos] = { cat: fam.category, color: cat.color, icon: cat.icon, boost, legendary: !!fam.legendary, name: fam.name, tier: b.tier, badgeSuit, bid: b.id, effects: architectEffectStrings(pre, pos, card, fam, b.tier, alliance) };
    }
  }
  return cover;
}

// Positionen erfüllter Struktur-Kombis (volle Zeile/Spalte/Diagonale) → roter Kombi-Wash (arch-struct-lit). Null ohne Bauten.
export function structLitPosOf(state = {}) {
  const buildings = architectBuildings(state);
  if (!buildings.length) return null;
  const set = new Set();
  structureFactorMap(occupiedCells(buildings)).forEach((f, pos) => { if (f > 1) set.add(pos); });
  return set;
}

// Distrikt-Positionen (gleiche Kategorie aneinander) → Typ-Farb-Glow. Null ohne Bauten.
export function distrLitPosOf(state = {}) {
  const buildings = architectBuildings(state);
  if (!buildings.length) return null;
  const set = new Set();
  districtFactorMap(buildings).forEach((f, pos) => { if (f > 1) set.add(pos); });
  return set;
}
