// #184: Zentraler Score-Formatierer. Schneidet Nachkommastellen ab (FLOOR, nicht round), damit die Anzeige
// exakt zum persistierten Score passt (App.jsx floort den finalScore ebenfalls → kein Drift). Nur für
// Score-ZAHLEN gedacht — Multiplikatoren (×1,25), Prozente, Stat-Werte und Münzen behalten ihre Nachkommastellen.
// `Number(x) || 0` fängt fehlende/legacy-Werte (null/undefined/NaN, z. B. alte localStorage-/Supabase-Einträge) ab.
export const fmtScore = (x) => Math.floor(Number(x) || 0).toLocaleString("de-DE");

// #253: Kompakte Score-Abkürzung für enge Kacheln (Victory-/Lauf-Details-Statblock) — skaliert unbegrenzt,
// auch 9-/12-stellig. Ab 1 Mio. abgekürzt (Mio./Mrd./Bio., max. 1 Nachkommastelle), darunter voll mit
// Tausenderpunkten. Der VOLLE Wert (fmtScore) gehört in den Tooltip. Nur für Score-Zahlen.
export const fmtScoreShort = (x) => {
  const n = Math.floor(Number(x) || 0);
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const unit = (v, suf) => sign + v.toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " " + suf;
  if (a >= 1e12) return unit(a / 1e12, "Bio.");
  if (a >= 1e9)  return unit(a / 1e9,  "Mrd.");
  if (a >= 1e6)  return unit(a / 1e6,  "Mio.");
  return n.toLocaleString("de-DE");
};
