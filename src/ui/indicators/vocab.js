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

// ---- Blitz-Unterfarben (#208) ----
// Ladung/Ionisierung teilen sich das Blitz-Cyan (LIGHTNING). Die KASKADE (Serie-Kette, „Sturm, der sich selbst
// nährt") ist bewusst violett-elektrisch abgesetzt vom Ladungs-Cyan → die beiden Ströme bleiben unterscheidbar.
export const CASCADE = "#9b8cff"; // Kaskade-Kettenglied (gefüllt) — violett-elektrisch
export const CASCADE_BRIGHT = "#e7e0ff"; // helles Ende der Kette (voll/aktiv aufglühend)
export const THUNDER = "#8a7de0"; // Donnergott (Legendär) — der bestehende Blitz-Violett-Akzent

// ---- Eis-Unterfarben (#210) ----
// Der Frost teilt sich das ICE-Cyan (❄ + Kanten-Rim). Die SCHICHTEN (der Spine) bekommen einen eigenen, ruhigeren
// Kristallton, damit ein geschichteter Frost von einem bloß „eingefrorenen" unterscheidbar ist; die ÜBERLAUF-Tiefe
// (Schichten über dem wirksamen Deckel 12 — die Nahrung der Legendären) leuchtet heller aus dem Stapel heraus.
export const CRYSTAL = "#8fcfe6"; // Schicht-Kristall (gedämpft, im Deckel-Bereich ≤12)
export const CRYSTAL_OVER = "#e6f7ff"; // Überlauf-Kristall — hell (Tiefe > Deckel = Direkt-Score der Legendären)
export const GLACIER = "#bfe9f7"; // Architekt-Pfeiler / „Masse-Schwelle erreicht" — heller Eis-Akzent

// ---- Karten-Ecken-Belegung (Single Source of Truth) ----
// Reserviert je Fraktion, damit sich in gemischten Builds (alle 4 mischbar) nichts überdeckt.
// Werte = grobe Ecke; die exakte Positionierung (Offsets bei Kollision) macht Card.jsx.
export const CORNER = {
  permBoost: "top-right", // generischer violetter +X (Dauerwert, bestehend)
  forge: "top-right", //  ⚒ Feuer — unter dem permBoost gestapelt (Betrag der Schmiede)
  green: "top-left", //  🌿 Pflanze reif (bestehend)
  brandBadge: "top-left", //  −N Feuer-Brand auf GEGNERkarte (versetzt zu 🌿)
  ion: "top-edge", //  ⚡ Blitz Ionisierung (#208): Pip-Track MITTIG auf der oberen Rahmenkante (max 5) + 2px-Ring; die
  //                    frühere untere linke Ecke ist damit GERÄUMT und für Eis/Pflanze reserviert (siehe unten).
  frost: "bottom-right", //  ❄ Eis: eingefroren (eigen) / Frostbiss (Gegner) (bestehend)
  brandMark: "bottom-right", //  🔥 Feuer-Brand auf GEGNERkarte — links neben ❄ versetzt
  frostLayers: "bottom-left", //  ❖ Eis-Schichten (#210): dezente, gestapelte Eck-Kristalle (grobes „geschichtet"), heller ab
  //                    Überlauf (12). Sitzt in der durch den Ion-Umzug (#208) geräumten unteren linken Ecke.
};

// ---- Reserviertes Vokabular (Kollisionsverbote) ----
// - Der farbige 2px-KONTUR-Ring (`0 0 0 2px …`) ist der IONISIERUNG vorbehalten (blau). Er glüht bei voll (5) auf;
//   den Zählstand trägt zusätzlich der Pip-Track auf der oberen Rahmenkante (#208). Kein anderer Effekt nutzt den Ring.
//   Geschmiedet = weicher INNEN-Glow (inset), KEIN Ring, KEIN äußerer Halo.
// - Frostbiss = kaltes ❄ (blau/rot-kalt). Brand = warm/orange + Char → „das ist Feuer, nicht Eis".
// - KASKADE-Cyan ↔ -Violett getrennt halten: Ladung/Ionisierung = Cyan (LIGHTNING); die selbst-nährende Kette = CASCADE (violett).
// - Frost (#210) ist ein KANTEN-/ECK-Treatment (eisige Ecken + dünner Inset-Rim), KEIN Vollflächen-Tint → die Mitte
//   bleibt frei für die Feuer-Innenglut (koexistenzfähig). Die Schicht-Kristalle (bottom-left) sind NUR eigene
//   Schichten; der rote Gegner-Frostbiss (❄, bottom-right) bleibt davon getrennt.
