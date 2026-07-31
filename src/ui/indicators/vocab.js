// Gemeinsames Indikator-Vokabular (AP3 #206 — „Gerüst zuerst, dann 4×").
// EINZIGE Quelle für Fraktions-Farben + Karten-Ecken-Belegung. #208/#210/#211 (Blitz/Eis/
// Pflanze) docken hier an, damit die Marker in gemischten Builds kollisionsfrei lesbar bleiben.

// ---- Fraktions-Grundfarben (aus dem bestehenden Code-Vokabular) ----
export const FIRE = "#e0714a"; // Feuer
export const FIRE_HOT = "#f0a83a"; // heißes Ende des Hitze-Verlaufs
export const LIGHTNING = "#5ec8f0"; // Blitz (= Ionisierung/Ladung)
export const LIGHTNING_ACCENT = "#8a7de0";
export const ICE = "#5ec8f0"; // Eis (Frost)
export const PLANT = "#5ab87a"; // Pflanze (grün/reif)

// ---- Feuer-Unterfarben (#206) ----
export const ASH = "#b3a596"; // entsättigtes Warmgrau — „ausgebrannt", hebt sich von der Hitze ab
export const FORGE = "#f0b74a"; // Schmiede-Gold
export const FORGE_GLOW = "#f0a83a"; // Glut-Glow der geschmiedeten Karte
export const WHITE_HEAT = "#fff2d8"; // Weißglut-Kappe am heißen Ende

// ---- Karten-Ecken-Belegung (Single Source of Truth) ----
// Reserviert je Fraktion, damit sich in gemischten Builds (alle 4 mischbar) nichts überdeckt.
// Werte = grobe Ecke; die exakte Positionierung (Offsets bei Kollision) macht Card.jsx.
export const CORNER = {
  permBoost: "top-right", // generischer violetter +X (Dauerwert, bestehend)
  forge: "top-right", //  ⚒ Feuer — unter dem permBoost gestapelt (Betrag der Schmiede)
  green: "top-left", //  🌿 Pflanze reif (bestehend)
  brandBadge: "top-left", //  −N Feuer-Brand auf GEGNERkarte (versetzt zu 🌿)
  ion: "bottom-left", //  ⚡ Blitz Ionisierung, EIGENE Karte (bestehend)
  frost: "bottom-right", //  ❄ Eis: eingefroren (eigen) / Frostbiss (Gegner) (bestehend)
  brandMark: "bottom-right", //  🔥 Feuer-Brand auf GEGNERkarte — links neben ❄ versetzt
};

// ---- Reserviertes Vokabular (Kollisionsverbote) ----
// - Der farbige 2px-KONTUR-Ring (`0 0 0 2px …`) ist der IONISIERUNG vorbehalten (blau).
//   Geschmiedet = weicher INNEN-Glow (inset), KEIN Ring, KEIN äußerer Halo.
// - Frostbiss = kaltes ❄ (blau/rot-kalt). Brand = warm/orange + Char → „das ist Feuer, nicht Eis".
