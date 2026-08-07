// Gemeinsames Indikator-Vokabular (AP3 #206 — „Gerüst zuerst, dann 4×").
// EINZIGE Quelle für Fraktions-Farben + Karten-Ecken-Belegung. #208/#210/#211 (Blitz/Eis/
// Pflanze) docken hier an, damit die Marker in gemischten Builds kollisionsfrei lesbar bleiben.

import { PLANT_GREEN_THRESHOLD, PLANT_VALUE_CAP } from "../../game/constants.js";

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
export const GLACIER = "#bfe9f7"; // Architekt-Pfeiler / „Masse-Schwelle erreicht" — heller Eis-Akzent

// ---- Pflanze-Unterfarben (#211) ----
// Das Grün (PLANT) ist der Reife-Kern. Die reife Zahl leuchtet heller (PLANT_RIPE = bestehender 🌿-Ton), die
// voll ausgewachsene (Wert = PLANT_VALUE_CAP) am hellsten (PLANT_FULL). Während des Wachstums blendet die Zahl von
// ihrer Suit-Farbe ZUM Grün (plantNumberColor) — die Original-Farbe tritt bei Reife zugunsten des Grüns zurück.
export const PLANT_RIPE = "#86e0a0"; // reife (grüne) Zahl — leuchtet intensiv grün
export const PLANT_FULL = "#c8ffdc"; // voll ausgewachsen (Wert-Deckel) — hellster Grün-Ton (+ 🌿)

// ---- Architekt-Kategorien (#202) ----
// Rahmen/Icon-Vokabular fürs Brett-Overlay. Bewusst NICHT als Vollflächen-Füllung genutzt (kollidiert sonst mit den
// Karten-Suits R/B/G/Y) — nur als Rand/Glow/Badge. EINZIGE Quelle, geteilt von ArchitectScreen (Bauphase) und dem
// Gebäude-Overlay der Aufstellungsphase (FormationPhase/CardGrid). Blau/Grün/Orange = Wert/Punkte/Formation.
export const ARCH_CAT = {
  value:     { color: "#3b7dbe", label: "Wert",      icon: "▛" },
  score:     { color: "#2f9d55", label: "Score",    icon: "◆" },
  formation: { color: "#d1652f", label: "Formation", icon: "✶" },
};

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
  growthRing: "bottom-right", //  🌱 Pflanze-Wachstumsring (#211): füllender Kreis auf der EIGENEN, noch wachsenden Karte (< Reife),
  //                    bei Reife ausgeblendet. Teilt sich die Ecke mit ❄ (frozen, eigene Karte) → bei beidem wird das ❄ nach
  //                    LINKS versetzt (wie 🔥 bei Frostbiss). Kollisionsfrei mit den GEGNER-Ecken (bottom-right dort ❄/🔥).
  colonized: "left-edge", //  🌿 Pflanze-Ausläufer (#211) auf der GEGNERkarte: grüne Ranke am linken Rand + „Ernte +N"-Tag. Grün/
  //                    organisch, klar abgesetzt von Brand (warm, von unten) und Frostbiss (kalt, ❄). Eigene left-edge-Spur →
  //                    kollidiert nicht mit 🌿-reif (top-left), ❖-Schichten (bottom-left) oder der zentrierten Zahl.
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
// - Pflanze (#211): die REIFE-ZAHL ist das Haupt-Signal (Suit-Farbe → Grün, bei Reife voll grün). Der Wachstumsring
//   (bottom-right) ist ein EIGEN-Karten-Marker (nur wachsende, noch nicht reife Karten) und weicht dem ❄ aus. Der
//   Ausläufer (kolonisierte GEGNERkarte) ist ein grüner Kanten-Effekt vom LINKEN Rand + Ranke — organisch/grün,
//   niemals warm (Brand) oder ❄ (Frostbiss). Kein neuer Vollflächen-Tint, kein 2px-Ring (der bleibt Ionisierung).

// ---- Hex-Interpolation (klein, für die Reife-Zahl) ----
function lerpHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const m = (x, y) => Math.round(x + (y - x) * t);
  return "#" + ((1 << 24) | (m(ar, br) << 16) | (m(ag, bg) << 8) | m(ab, bb)).toString(16).slice(1);
}

// Pflanze (#211): Farbe/Glühen der Kartenzahl aus dem Wachstums-/Reife-Zustand.
//   • grün (reif): intensiv grün — voll ausgewachsen (Wert ≥ Deckel) am hellsten (PLANT_FULL).
//   • wachsend (Wachstum > 0, noch nicht reif): blendet von der Suit-Farbe zum Grün (max 0,85 → nie „voll grün" vor Reife).
//   • sonst (kein Pflanzen-Einfluss): null → Aufrufer nutzt die normale Suit-Farbe.
// `glow` ∈ 0..1 = Stärke des Grün-Scheins (der Aufrufer skaliert daraus Blur/Alpha des textShadow).
export function plantNumberColor(suitCol, growth = 0, green = false, value = 0) {
  if (green) {
    const full = value >= PLANT_VALUE_CAP;
    return { color: full ? PLANT_FULL : PLANT_RIPE, glow: full ? 1 : 0.6, full, ripe: true };
  }
  const g = growth || 0;
  if (g <= 0) return null;
  const p = Math.min(1, g / PLANT_GREEN_THRESHOLD);
  return { color: lerpHex(suitCol, PLANT, p * 0.85), glow: 0.2 * p, full: false, ripe: false, progress: p };
}
