/* #357: Geteilte Standard-Palette des Feuer-Archetyps (Neon-Seide) — unten BLAU → Mitte MAGENTA → oben ROT glühend.
   Von FireHead (vertikaler Flammen-Verlauf) UND dem Komet-Standardmodus (Schweif-Rampe: heiß-weißer Kopf → rot →
   magenta → blauer Ausklang) genutzt → EINE Wahrheit, kein Farb-Drift zwischen den beiden Feuer-Effekten. */
const toRGB = (hex) => { const h = String(hex).replace("#", ""); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const FIRE_NEON = { bot: "#2f6bff", mid: "#ff2ea0", top: "#ff4a2a" };
export const FIRE_NEON_BOT = toRGB(FIRE_NEON.bot); // blau — Flammen-Basis / Komet-Schweifende
export const FIRE_NEON_MID = toRGB(FIRE_NEON.mid); // magenta — Mitte
export const FIRE_NEON_TOP = toRGB(FIRE_NEON.top); // rot glühend — Flammen-Spitze / heiß hinter dem Komet-Kopf
