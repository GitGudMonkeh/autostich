/* Geteilter Rahmen-Stil für Formations-Kacheln (Issue #95, Punkte 4 & 8).
   - Rahmen-FARBE = Anzahl der Formationen, in denen die Karte steckt (Mitgliedschaften):
     1 grün · 2 blau · 3 lila · 4 gold. Gilt für durchgezogene UND gestrichelte Rahmen.
   - Rahmen-STIL: durchgezogen, sobald die Karte einen Multiplikator (Faktor > 1) bekommt;
     gestrichelt, wenn sie zwar Teil von Formation(en) ist, aber (noch) keinen Multiplikator erhält.
   - Keine Formation: kein Sonderrahmen (null → Aufrufer nutzt Fallback, z. B. Farbrand). */
const TIER_COLORS = ["#5ab87a", "#5a8ade", "#8a7de0", "#d4a63a"]; // 1..4 → grün / blau / lila / gold

export function formationBorder(posForm) {
  const forms = (posForm && posForm.formations) || [];
  if (forms.length === 0) return { color: null, dashed: false, active: 0 };
  const count = Math.min(forms.length, 4);           // Anzahl Formations-Mitgliedschaften der Karte
  const hasMult = forms.some((f) => f.factor > 1);   // bekommt die Karte einen Multiplikator?
  return { color: TIER_COLORS[count - 1], dashed: !hasMult, active: count };
}
