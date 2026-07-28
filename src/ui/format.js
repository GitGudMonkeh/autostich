// #184: Zentraler Score-Formatierer. Schneidet Nachkommastellen ab (FLOOR, nicht round), damit die Anzeige
// exakt zum persistierten Score passt (App.jsx floort den finalScore ebenfalls → kein Drift). Nur für
// Score-ZAHLEN gedacht — Multiplikatoren (×1,25), Prozente, Stat-Werte und Münzen behalten ihre Nachkommastellen.
// `Number(x) || 0` fängt fehlende/legacy-Werte (null/undefined/NaN, z. B. alte localStorage-/Supabase-Einträge) ab.
export const fmtScore = (x) => Math.floor(Number(x) || 0).toLocaleString("de-DE");
