// Kapitel 1 · Im Kopf rechnen · Addieren bis 1000. Summe ≤ 1000, Übertrag je Stufe steuerbar.

import { erzeugeKopfrechenAufgabe } from '../kopfrechnen.js';

export const STUFEN = {
  // 320 + 450, 340 + 50, 200 + 370 – Zehnerzahlen, ohne Übertrag
  leicht: { formen: [['HZ0', 'HZ0'], ['HZ0', 'Z0'], ['H00', 'HZ0'], ['HZ0', 'H00']], uebertrag: 0 },
  // 370 + 450, 356 + 40, 356 + 8, 356 + 200 – etwa jede zweite Aufgabe mit Übertrag
  mittel: { formen: [['HZ0', 'HZ0'], ['HZE', 'Z0'], ['HZE', 'E'], ['HZE', 'H00'], ['HZE', 'ZE']], uebertrag: 0.5 },
  // 356 + 237, 356 + 47 – beliebige Zahlen, Übertrag überwiegt
  schwer: { formen: [['HZE', 'HZE'], ['HZE', 'ZE'], ['HZ0', 'HZE']], uebertrag: 0.7 },
};

export default {
  id: 'addieren-bis-1000',
  op: '+',
  stufen: STUFEN,
  erzeuge(rng, stufe) {
    return erzeugeKopfrechenAufgabe(rng, { op: '+', max: 1000, stufe, ...STUFEN[stufe] });
  },
};
