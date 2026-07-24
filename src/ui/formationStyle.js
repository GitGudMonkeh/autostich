/* Geteilter Rahmen-Stil für Formations-Kacheln (Issue #95, Punkte 4 & 8).
   - Karte MIT Multiplikator: durchgezogener Rahmen, Farbe nach Anzahl der Formationen
     mit Faktor > 1 auf der Position → 1 grün · 2 blau · 3 lila · 4 gold.
   - Karte OHNE Multiplikator, aber Teil einer Formation (z. B. Ordinal 1–2 eines Laufs):
     grün gestrichelter Rahmen (Zugehörigkeit sichtbar).
   - Keine Formation: kein Sonderrahmen (null → Aufrufer nutzt Fallback, z. B. Farbrand). */
const TIER_COLORS = ["#5ab87a", "#5a8ade", "#8a7de0", "#d4a63a"]; // 1..4 → grün / blau / lila / gold

export function formationBorder(posForm) {
  const forms = (posForm && posForm.formations) || [];
  const active = Math.min(forms.filter((f) => f.factor > 1).length, 4);
  if (active >= 1) return { color: TIER_COLORS[active - 1], dashed: false, active };
  if (forms.length > 0) return { color: "#5ab87a", dashed: true, active: 0 }; // Mitglied ohne Multiplikator
  return { color: null, dashed: false, active: 0 };
}
