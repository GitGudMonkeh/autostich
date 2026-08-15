/* Tutorial-Platzhalter, die NICHT aus den Konstanten kommen, sondern aus einem übersetzten Register.

   `tutorialScript.js` liefert die Zahlen-Platzhalter (`vars`) — das geht dort, weil Zahlen keine
   Sprache haben. Die Formationsarten heißen aber je Sprache anders (Wiederholung → Repeat …). Sie
   im Tutorialtext abzutippen wäre eine zweite Wahrheit, die beim nächsten neuen Formationstyp still
   veraltet; sie in `tutorialScript.js` zu holen ginge nicht, weil ein `import { t }` dort die Sprache
   beim Laden einfriert (Modul-Konstante).

   Deshalb diese eigene Datei: sie wird ZUR ANZEIGEZEIT gerufen (TutorialOverlay) und ist zugleich die
   EINE Stelle, an der der Test nachsieht, welche Platzhalter außer `vars` erlaubt sind. */
import { FORMATION_LABELS } from "../../game/constants.js";
import { formationName } from "../../i18n/labels.js";

const FORM_TYPES = Object.keys(FORMATION_LABELS);

export function displayVars() {
  return {
    formTypes: FORM_TYPES.map(formationName).join(" · "),
    formTypeCount: FORM_TYPES.length,
  };
}

// Nur die Namen — der Wächter in test/tutorial.test.js braucht keine Auflösung, nur die Liste.
export const DISPLAY_VAR_KEYS = ["formTypes", "formTypeCount"];
