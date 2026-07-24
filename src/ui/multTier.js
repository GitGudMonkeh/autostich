/* Farb-Tier des Serien-/Score-Multiplikators (Issue #100): grau · grün · blau · lila · gold nach Höhe.
   Analog zu den Formations-Rahmenfarben. Schwellen am angezeigten ×-Wert. */
const TIERS = [
  { min: 2.10, color: "#d4a63a" }, // gold
  { min: 1.70, color: "#8a7de0" }, // lila
  { min: 1.30, color: "#5a8ade" }, // blau
  { min: 1.001, color: "#5ab87a" }, // grün
];

// Farbe des Multiplikators nach Höhe; ×1,00 (kein Bonus) → grau.
export function multTierColor(mult) {
  for (const t of TIERS) if ((mult || 1) >= t.min) return t.color;
  return "#8a8a95"; // grau
}
