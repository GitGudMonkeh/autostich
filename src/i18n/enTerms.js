/* Geteilte englische Kernvokabeln für die EN-Teilkataloge.

   Warum eine eigene Datei: `en.js` bündelt die Teilkataloge, also darf keiner von ihnen `en.js`
   importieren (Zyklus). Ohne diese Datei stünde „Rare"/„Epic" in enMeta.js UND enGlossary.js
   je einmal getippt — genau die Doppelpflege, die wir überall sonst beseitigen. */

// Raritätsleiter, Index 0..3 = Stufe I..IV (Übersetzerpaket §3.5 — endet auf Epic, nicht Legendary).
export const RARITY_EN = ["Common", "Uncommon", "Rare", "Epic"];
export const [COMMON, UNCOMMON, RARE, EPIC] = RARITY_EN;
