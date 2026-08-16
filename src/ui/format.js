// #184: Zentraler Score-Formatierer. Schneidet Nachkommastellen ab (FLOOR, nicht round), damit die Anzeige
// exakt zum persistierten Score passt (App.jsx floort den finalScore ebenfalls → kein Drift). Nur für
// Score-ZAHLEN gedacht — Multiplikatoren (×1,25), Prozente, Stat-Werte und Münzen behalten ihre Nachkommastellen.
// `Number(x) || 0` fängt fehlende/legacy-Werte (null/undefined/NaN, z. B. alte localStorage-/Supabase-Einträge) ab.
// #sprache: Trennzeichen kommen aus `fmtNum` (de „1.234,5" · en „1,234.5"), nicht mehr fest aus `de-DE` —
// sonst zeigt die englische Fassung deutsche Tausenderpunkte. KEIN `toLocaleString` (i18n-Wächter).
import { t, fmtNum } from "../i18n/index.js";

export const fmtScore = (x) => fmtNum(Math.floor(Number(x) || 0));

// #253: Kompakte Score-Abkürzung für enge Kacheln (Victory-/Lauf-Details-Statblock) — skaliert unbegrenzt,
// auch 9-/12-stellig. Ab 1 Mio. abgekürzt (Mio./Mrd./Bio., max. 1 Nachkommastelle), darunter voll mit
// Tausenderpunkten. Der VOLLE Wert (fmtScore) gehört in den Tooltip. Nur für Score-Zahlen.
// Die Einheiten stehen im Katalog, weil sich mit der Sprache nicht nur das Wort ändert, sondern auch der
// Abstand davor: de „1,2 Mio." · en „1.2M".
export const fmtScoreShort = (x) => {
  const n = Math.floor(Number(x) || 0);
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  // Auf eine Nachkommastelle runden, dann erst formatieren (2,0 → „2", nicht „2,0").
  const unit = (v, key) => sign + t(key, { n: fmtNum(Math.round(v * 10) / 10) });
  if (a >= 1e12) return unit(a / 1e12, "format.short.tera");
  if (a >= 1e9)  return unit(a / 1e9,  "format.short.giga");
  if (a >= 1e6)  return unit(a / 1e6,  "format.short.mega");
  return fmtNum(n);
};
