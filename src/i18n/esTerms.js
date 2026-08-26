/* Shared Spanish core vocabulary for the ES sub-catalogs.

   Why a file of its own: `es.js` bundles the sub-catalogs, so none of them may import `es.js`
   (cycle). Without this file "Rara"/"Épica" would sit typed out in esMeta.js AND esGlossary.js —
   exactly the duplicate upkeep we remove everywhere else. Mirrors enTerms.js key for key.

   Rarity ladder, index 0..3 = tier I..IV (translator package §3.5 — ends on Épica, not Legendaria:
   legendary is a separate axis in this game). Feminine forms throughout, because the noun they
   agree with is `rareza`, and because the ladder words are also inserted into sentences about
   `carta` and `ventaja` — both feminine. */
export const RARITY_ES = ["Común", "Poco común", "Rara", "Épica"];
export const [COMMON, UNCOMMON, RARE, EPIC] = RARITY_ES;
