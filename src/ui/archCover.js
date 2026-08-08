// #UI: Architekt-Gebäude-Overlay für das geteilte Formations-Brett (FormationPanel) — dieselbe Projektion wie in der
// Aufstellungsphase (FormationPhase), hier als reine Helfer aus dem State abgeleitet, damit auch die Perk-/Skill-/Shop-
// Ansichten die Bauten als Rahmen über dem Brett einblenden können (Gebäude-Toggle). Read-only, kein Neuberechnen von Zügen.
import { precomputeArchitect, architectValueBonus, familyDef as archFamilyDef, occupiedCells, structureFactorMap, districtFactorMap } from "../game/architect.js";
import { architectEffectStrings } from "./archEffects.js";
import { ARCH_CAT } from "./indicators/vocab.js";
import { allianceGroups } from "../game/families.js";

// Platzierte Architekt-Gebäude dieses States (oder [] wenn Architekt aus / keine Bauten).
export function architectBuildings(state = {}) {
  const a = state.architect;
  return (state.architectEnabled && a && Array.isArray(a.buildings) && a.buildings) || [];
}

// Abdeckung je Position: { cat, color, icon, boost, legendary, name, tier, badgeSuit, bid, effects } — identisch zur
// Berechnung in FormationPhase. boost = echter Wert-Bonus (nur value-Gebäude, konditional wie in der Engine).
export function architectCoverMap(state = {}) {
  const buildings = architectBuildings(state);
  if (!buildings.length) return null;
  const { architect, playerOrder = [], deck = [] } = state;
  const pre = precomputeArchitect(architect, playerOrder, deck);
  const alliance = allianceGroups(state.familyTiers, state.roles);
  const cover = {};
  for (const b of buildings) {
    const fam = archFamilyDef(b.familyId);
    if (!fam) continue;
    const cat = ARCH_CAT[fam.category];
    for (const pos of b.footprint) {
      const card = deck[playerOrder[pos]];
      const boost = fam.category === "value" && card ? architectValueBonus(pre, pos, card, alliance) : 0;
      const badgeSuit = fam.colorLocked ? (b.colorChoice || null) : null;
      cover[pos] = { cat: fam.category, color: cat.color, icon: cat.icon, boost, legendary: !!fam.legendary, name: fam.name, tier: b.tier, badgeSuit, bid: b.id, effects: architectEffectStrings(pre, pos, card, fam, b.tier, alliance) };
    }
  }
  return cover;
}

// Positionen erfüllter Struktur-Kombis (Zeile/Spalte/Diagonale) → roter Kombi-Wash (arch-struct-lit).
export function structLitPosOf(state = {}) {
  const buildings = architectBuildings(state);
  if (!buildings.length) return null;
  const set = new Set();
  structureFactorMap(occupiedCells(buildings)).forEach((f, pos) => { if (f > 1) set.add(pos); });
  return set;
}

// Distrikt-Positionen (gleiche Kategorie aneinander) → Typ-Farb-Glow.
export function distrLitPosOf(state = {}) {
  const buildings = architectBuildings(state);
  if (!buildings.length) return null;
  const set = new Set();
  districtFactorMap(buildings).forEach((f, pos) => { if (f > 1) set.add(pos); });
  return set;
}
