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

// Stufen-Index des Tiers (Issue #106): 0 grau · 1 grün · 2 blau · 3 lila · 4 gold. Geteilte Quelle mit
// multTierColor (kein Drift) — App.jsx leitet daraus die Zitter-Intensität des Mult-Chips ab (ab Blau).
export function multTierLevel(mult) {
  const m = mult || 1;
  if (m >= 2.10) return 4; // gold
  if (m >= 1.70) return 3; // lila
  if (m >= 1.30) return 2; // blau
  if (m >= 1.001) return 1; // grün
  return 0;                 // grau
}
