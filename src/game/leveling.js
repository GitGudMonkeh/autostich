/* XP-Kurve (§6.2): benötigte XP von Level L → L+1 (L ab 1).
   Erste Level-Ups schnell, spätere langsam; ~+25 % je Stufe, auf Zehner gerundet. */
export const XP_CURVE = [
  100, 120, 150, 190, 240, 300, 380, 480, 600, 750,
  940, 1180, 1480, 1850, 2310, 2890, 3610, 4510, 5640, 7050,
];

export function xpToNext(level) {
  if (level < 1) level = 1;
  if (level <= XP_CURVE.length) return XP_CURVE[level - 1];
  // Über die Tabelle hinaus: Prinzip fortführen (~×1,25, auf Zehner gerundet).
  let v = XP_CURVE[XP_CURVE.length - 1];
  for (let l = XP_CURVE.length + 1; l <= level; l++) v = Math.round((v * 1.25) / 10) * 10;
  return v;
}
