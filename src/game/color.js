/* ============================================================
   FARB-MATCHING — Single Source (#289). JEDER Farb-Verbraucher (Gebäude/Perks/Skills/Familien) MUSS über diese
   Helfer gehen, statt `card.suit === x` selbst zu vergleichen. So respektieren neue Farb-Skills/-Perks automatisch:
     1) Pflanze-Grün  — `card.green` zählt als Farbe „G".
     2) Farballianz   — verbündete Farben (allianceGroups aus families.js) zählen als eine.
   Reine Funktionen, keine Imports → kein Import-Zyklus; die Allianz-Gruppen werden von außen hereingereicht
   (einmal je Stich/Durchlauf via allianceGroups(familyTiers, roles)).
   ============================================================ */

// Effektive Farbe einer Karte: grün → „G", sonst die rohe Suit. (Allianz wirkt beim VERGLEICH, nicht hier.)
export const effColor = (card) => (card && card.green ? "G" : (card ? card.suit : null));

// Zählen zwei Farben als dieselbe? Gleich ODER in derselben Allianz-Gruppe.
export function colorsAllied(a, b, groups) {
  if (a === b) return true;
  for (const g of (groups || [])) if (g.includes(a) && g.includes(b)) return true;
  return false;
}

// Passt eine Karte auf eine Zielfarbe? (grün-bewusst UND allianz-bewusst) — der EINE Weg, Farb-Gebäude/-Perks zu prüfen.
export const colorMatches = (card, target, groups) => colorsAllied(effColor(card), target, groups);
