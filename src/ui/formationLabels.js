// #147 / Sprachprüfung A12 / #sprache: EINE Quelle für die Anzeigenamen der Formationstypen.
// Die deutschen NAMEN liegen im game-Layer (`constants.js` → FORMATION_LABELS); der Katalog erzeugt
// daraus seine deutschen Einträge und trägt die englischen. Aufgelöst wird zur ANZEIGEZEIT, damit
// ein Sprachwechsel greift — deshalb leitet dieses Modul nur noch auf src/i18n/labels.js weiter.
//   label = ausgeschriebener Name (Battlefield zeigt ihn per CSS in Großbuchstaben, CardDetail direkt)
//   abbr  = Einzelbuchstabe für die Karten-Badges (CardGrid); paarweise verschieden.
//           HARTE Längenschranke: genau 1 Zeichen, auch in Übersetzungen (Guard prüft das).
import { FORMATION_LABELS } from "../game/constants.js";
import { formationName, formationAbbr as i18nAbbr } from "../i18n/labels.js";

// Anzeige-Register (Name + Kürzel) — für Legenden, die beides in einer Schleife brauchen.
// Als Funktion, nicht als Konstante: ein Modul-Level-Objekt fröre die Sprache beim Laden ein.
export const formationTypes = () => Object.fromEntries(
  Object.keys(FORMATION_LABELS).map((k) => [k, { label: formationName(k), abbr: i18nAbbr(k) }]),
);

export const formationLabel = formationName;
export const formationAbbr = i18nAbbr;
