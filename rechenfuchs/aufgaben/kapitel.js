// Lehrplan-Baum: Kapitel → Abschnitt → Unterkapitel → Generator. Die Oberfläche liest nur diesen Baum.
// Ein neues Unterkapitel ist ein Eintrag hier plus ein Generator in generatoren.js.

export const KAPITEL = [
  {
    id: 'k1',
    titel: 'Addieren & Subtrahieren',
    untertitel: 'Zahlenraum bis 1000',
    abschnitte: [
      {
        titel: 'Im Kopf rechnen',
        unterkapitel: [
          { id: 'k1-addieren-bis-1000', titel: 'Addieren bis 1000', beispiel: '320 + 450', generator: 'addieren-bis-1000' },
          { id: 'k1-subtrahieren-bis-1000', titel: 'Subtrahieren bis 1000', beispiel: '780 − 340', generator: 'subtrahieren-bis-1000' },
        ],
      },
    ],
  },
];

export function alleUnterkapitel() {
  return KAPITEL.flatMap((kapitel) =>
    kapitel.abschnitte.flatMap((abschnitt) =>
      abschnitt.unterkapitel.map((unterkapitel) => ({ ...unterkapitel, kapitel, abschnitt })),
    ),
  );
}

export function findeUnterkapitel(id) {
  return alleUnterkapitel().find((unterkapitel) => unterkapitel.id === id) || null;
}
