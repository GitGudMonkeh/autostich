/* Tutorial-Platzhalter, die NICHT aus den Konstanten kommen, sondern aus einem übersetzten Register.

   `tutorialScript.js` liefert die Zahlen-Platzhalter (`vars`) — das geht dort, weil Zahlen keine
   Sprache haben. Die Formationsarten heißen aber je Sprache anders (Wiederholung → Repeat …). Sie
   im Tutorialtext abzutippen wäre eine zweite Wahrheit, die beim nächsten neuen Formationstyp still
   veraltet; sie in `tutorialScript.js` zu holen ginge nicht, weil ein `import { t }` dort die Sprache
   beim Laden einfriert (Modul-Konstante).

   Deshalb diese eigene Datei: sie wird ZUR ANZEIGEZEIT gerufen (TutorialOverlay) und ist zugleich die
   EINE Stelle, an der der Test nachsieht, welche Platzhalter außer `vars` erlaubt sind.

   Zweiter Fall: das Rechenbeispiel im Stichspiel. Seine Zahlen sind ABGELEITET (Serien-Faktor aus
   STREAK_BASE_STEP, Ergebnis aus SCORE_PER_WIN) und müssen je Sprache formatiert werden — „1,2" im
   Deutschen, „1.2" im Englischen. `interpolate` setzt Werte roh ein, deshalb kommen sie hier schon
   fertig formatiert an (fmtNum, nie toLocaleString). */
import { FORMATION_LABELS, SCORE_PER_WIN, STREAK_BASE_STEP } from "../../game/constants.js";
import { formationName } from "../../i18n/labels.js";
import { fmtNum, getLocale } from "../../i18n/index.js";

const FORM_TYPES = Object.keys(FORMATION_LABELS);

/* Serienlänge des Beispiels. Frei gewählt (eine runde Zahl, die im ersten Durchlauf erreichbar ist) —
   der FAKTOR dazu wird gerechnet, nicht abgetippt. */
const EX_STREAK = 10;

export function displayVars() {
  const loc = getLocale();
  const mult = 1 + EX_STREAK * STREAK_BASE_STEP;
  return {
    formTypes: FORM_TYPES.map(formationName).join(" · "),
    formTypeCount: FORM_TYPES.length,
    exStreak: fmtNum(EX_STREAK, loc),
    exStreakMult: fmtNum(Math.round(mult * 100) / 100, loc),
    exTotal: fmtNum(Math.round(SCORE_PER_WIN * mult), loc),
  };
}

// Nur die Namen — der Wächter in test/tutorial.test.js braucht keine Auflösung, nur die Liste.
export const DISPLAY_VAR_KEYS = ["formTypes", "formTypeCount", "exStreak", "exStreakMult", "exTotal"];
