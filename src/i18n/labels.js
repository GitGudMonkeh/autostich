/* ============================================================
   REGISTER-ETIKETTEN — die Brücke zwischen den Daten-Registern (src/game/*) und dem Katalog.

   Die Register bleiben die Quelle der DEUTSCHEN Texte; `de.js` erzeugt seine Einträge daraus
   (kein abgetippter Zweittext, kein Drift). `en.js` schreibt die Übersetzung. Hier sitzen die
   Leser, die die UI benutzt — sie lösen zur ANZEIGEZEIT auf, damit ein Sprachwechsel greift.

   Warum eine eigene Datei und nicht direkt in rarity.js/constants.js?
   Weil `de.js` genau diese Register importiert. Ein `import { t }` in rarity.js wäre ein Zyklus
   (de.js → rarity.js → i18n/index.js → de.js). Die Register bleiben deshalb Blätter; alles, was
   übersetzt, liegt eine Schicht darüber.

   Migrationsstand: Rarität + Formationstypen. Skills, Perks, Familien, Gebäude und Glossar
   folgen — solange sie fehlen, zeigen sie in beiden Sprachen Deutsch (sichtbar, nicht still).
   ============================================================ */
import { t } from "./index.js";

/* ---- Rarität (TIER_META) ---- */
// Sichtbarer Name einer Raritätsstufe: „Sehr selten" / „Rare".
export const rarityLabel = (tier) => t(`rarity.tier${tier}.label`);

/* ---- Formationstypen (FORMATION_LABELS) ---- */
// Ausgeschriebener Name. Fallback bleibt der rohe Typ — t() gibt bei unbekanntem Schlüssel den
// Schlüssel zurück, deshalb hier explizit auf den Typ zurückfallen (lesbarer als „formation.x.label").
export const formationName = (type) => {
  const key = `formation.${type}.label`;
  const s = t(key);
  return s === key ? type : s;
};

// Badge-Kürzel: HARTE Schranke von genau einem Zeichen, auch in Übersetzungen
// (DE W·F·T·Z·A·N·K·G → EN R·B·S·Z·A·E·C·X). Der Guard prüft Länge und Kollisionsfreiheit.
export const formationAbbr = (type) => {
  const key = `formation.${type}.abbr`;
  const s = t(key);
  return s === key ? "" : s;
};
