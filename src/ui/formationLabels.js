// #147 / Sprachprüfung A12: EINE Quelle für die Anzeigenamen der Formationstypen.
// Die NAMEN liegen jetzt im game-Layer (`constants.js` → FORMATION_LABELS), damit Engine, Architekt und UI
// denselben Text benutzen — der Architekt gab vorher die rohen Schlüssel aus („Formations-Joker (farbblock)").
// Hier bleiben nur die UI-Zutaten: die Einzelbuchstaben-Kürzel für die Karten-Badges.
//   label = ausgeschriebener Name (Battlefield nutzt ihn in Großbuchstaben, CardDetail direkt)
//   abbr  = Einzelbuchstabe für die Karten-Badges (CardGrid); Buchstaben paarweise verschieden.
//           HARTE Längenschranke: genau 1 Zeichen (auch in Übersetzungen).
import { FORMATION_LABELS, formationLabel as gameFormationLabel } from "../game/constants.js";

const ABBR = {
  wiederholung: "W", farbblock: "F", treppe: "T", wechsel: "Z",
  anker: "A", nachhall: "N", formationskern: "K",
  grenzbonus: "G", // #179 E_SEGMENT IV: segmentüberschreitende Formation
};

// Anzeige-Register (Name + Kürzel) — für Legenden, die beides in einer Schleife brauchen.
export const FORMATION_TYPES = Object.fromEntries(
  Object.entries(FORMATION_LABELS).map(([k, label]) => [k, { label, abbr: ABBR[k] || "" }]),
);

// Ausgeschriebener Name (Fallback: der rohe Typ, falls je ein neuer Typ ohne Eintrag auftaucht).
export const formationLabel = gameFormationLabel;
// Badge-Kürzel (Fallback: leer statt „undefined" im UI).
export const formationAbbr = (type) => ABBR[type] ?? "";
