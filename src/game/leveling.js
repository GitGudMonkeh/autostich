/* XP-Kurve (§6.2): benötigte XP von Level L → L+1 (L ab 1).
   Frühgame unverändert (L1→2 = 100, exponentieller Anlauf bis L10 = 750). Ab dem
   Tabellenende dann LINEAR (+XP_LATE_STEP je Stufe) statt exponentiell — sonst versinken
   die späten Perks/Legendaries in einer XP-Wand (#61). */
export const XP_CURVE = [
  100, 120, 150, 190, 240, 300, 380, 480, 600, 750,
];
export const XP_LATE_STEP = 200; // ab L10: +200 XP je Stufe (linear) [TUNING]

export function xpToNext(level) {
  if (level < 1) level = 1;
  if (level <= XP_CURVE.length) return XP_CURVE[level - 1];
  // Über die Tabelle hinaus: linear fortführen (löst die Lategame-XP-Wand auf, #61).
  const last = XP_CURVE[XP_CURVE.length - 1]; // 750
  return last + (level - XP_CURVE.length) * XP_LATE_STEP;
}
