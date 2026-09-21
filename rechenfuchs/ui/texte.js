// Alle Texte der Oberfläche. Deutsch, kindgerecht, ermutigend – Fehler sind ein normaler Teil des Lernens.

const einsMehr = (n, einzahl, mehrzahl) => (n === 1 ? einzahl : mehrzahl.replace('{n}', String(n)));

export const TEXTE = {
  appName: 'Rechenfuchs',

  start: {
    begruessung: 'Hallo! Was möchtest du heute üben?',
    punkte: (n) => einsMehr(n, '1 Punkt', '{n} Punkte'),
    naechsteBelohnung: (fehlend) => einsMehr(fehlend, 'Noch 1 Punkt, dann bekommt dein Fuchs etwas Neues!', 'Noch {n} Punkte, dann bekommt dein Fuchs etwas Neues!'),
    allesFreigeschaltet: 'Dein Fuchs hat schon alles bekommen. Toll gemacht!',
    stufe: (n) => `Stufe ${n}`,
    beispiel: (beispiel) => `zum Beispiel ${beispiel}`,
    letzteRunde: (richtig, von) => `Zuletzt ${richtig} von ${von} richtig`,
    nochNichtGeuebt: 'Noch nicht geübt',
  },

  runde: {
    zurueck: 'Zurück',
    aufgabeVon: (i, n) => `Aufgabe ${i} von ${n}`,
    fortschrittLabel: 'Fortschritt in dieser Runde',
    punktLabel: (i, ergebnis) => `Aufgabe ${i}: ${ergebnis ? (ergebnis.richtig ? 'richtig' : 'nicht richtig') : 'noch offen'}`,
    antwortPruefen: 'OK',
    antwortPruefenLabel: 'Antwort prüfen',
    loeschen: 'Letzte Ziffer löschen',
    weiter: 'Weiter',
    lob: ['Richtig!', 'Super!', 'Genau!', 'Klasse!', 'Stark!', 'Prima!'],
    plusPunkt: '+1 Punkt',
    nichtGanz: 'Nicht ganz.',
    loesungIst: (loesung) => `Die Lösung ist ${loesung}.`,
    soGehts: 'So kannst du rechnen:',
    hinweise: {
      rechenzeichen: (op) => (op === '+' ? 'Schau auf das Rechenzeichen: Hier steht ein Plus.' : 'Schau auf das Rechenzeichen: Hier steht ein Minus.'),
      zwischenschritt: () => 'Du hast schon einen Schritt geschafft. Rechne noch weiter!',
      hunderter: () => 'Ganz nah dran! Schau noch einmal auf die Hunderter.',
      zehner: () => 'Ganz nah dran! Schau noch einmal auf die Zehner.',
      einer: () => 'Ganz nah dran! Schau noch einmal auf die Einer.',
    },
  },

  ergebnis: {
    titel: (richtig, von) => `${richtig} von ${von} richtig`,
    nachricht: (richtig, von) => {
      if (richtig === von) return 'Alle richtig! Das war fantastisch.';
      if (richtig >= von * 0.75) return 'Sehr gut gemacht!';
      if (richtig >= von * 0.5) return 'Gut geübt. Weiter so!';
      if (richtig > 0) return 'Üben lohnt sich. Beim nächsten Mal klappt bestimmt noch mehr.';
      return 'Das war ein schwerer Anfang. Dein Fuchs freut sich trotzdem, dass du geübt hast.';
    },
    punkteGesammelt: (neu, gesamt) => {
      const teil1 = neu === 0 ? 'Diesmal gab es keinen neuen Punkt.' : einsMehr(neu, 'Du hast 1 Punkt gesammelt.', 'Du hast {n} Punkte gesammelt.');
      return `${teil1} ${einsMehr(gesamt, 'Jetzt hast du 1 Punkt.', 'Jetzt hast du {n} Punkte.')}`;
    },
    neuesAccessoire: (name) => `Dein Fuchs hat jetzt ${name}!`,
    aufgestiegen: (stufe) => `Du bist jetzt auf Stufe ${stufe}. Die Aufgaben werden ein bisschen kniffliger.`,
    nochEineRunde: 'Noch eine Runde',
    zurUebersicht: 'Zur Übersicht',
  },

  accessoires: {
    halstuch: 'ein rotes Halstuch',
    muetze: 'eine blaue Mütze',
    brille: 'eine Brille',
    blume: 'eine Blume',
  },

  fuchsLabel: 'Dein Fuchs',
};
