// Kapitel 1 · Im Kopf rechnen · Subtrahieren bis 1000. Minuend ≤ 1000, Ergebnis ≥ 1, Übertrag je Stufe steuerbar.

import { erzeugeKopfrechenAufgabe } from '../kopfrechnen.js';

export const STUFEN = {
  // 780 − 340, 780 − 50, 780 − 300 – Zehnerzahlen, ohne Übertrag
  leicht: { formen: [['HZ0', 'HZ0'], ['HZ0', 'Z0'], ['HZ0', 'H00']], uebertrag: 0 },
  // 720 − 350, 456 − 70, 456 − 9, 456 − 200, 456 − 38 – etwa jede zweite Aufgabe mit Übertrag
  mittel: { formen: [['HZ0', 'HZ0'], ['HZE', 'Z0'], ['HZE', 'E'], ['HZE', 'H00'], ['HZE', 'ZE']], uebertrag: 0.5 },
  // 512 − 278, 512 − 47, 1000 − 347 – beliebige Zahlen, Übertrag überwiegt
  schwer: { formen: [['HZE', 'HZE'], ['HZE', 'ZE'], ['1000', 'HZE'], ['1000', 'ZE']], uebertrag: 0.7 },
};

export default {
  id: 'subtrahieren-bis-1000',
  op: '-',
  stufen: STUFEN,
  erzeuge(rng, stufe) {
    return erzeugeKopfrechenAufgabe(rng, { op: '-', max: 1000, stufe, ...STUFEN[stufe] });
  },
};
