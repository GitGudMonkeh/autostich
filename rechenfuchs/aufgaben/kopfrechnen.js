// Gemeinsame Bausteine für Kopfrechen-Aufgaben mit Plus und Minus:
// Zahlformen, Übertrag-Erkennung, schrittweiser Rechenweg und Hinweise zu typischen Fehlern.
// Kein DOM, keine Texte – die Oberfläche übersetzt Hinweis-Codes in Sätze.

import { ganzzahl, auswahl, chance } from './zufall.js';

// Zahlformen wie im Übungsheft: H = Hunderter (1–9), Z = Zehner, E = Einer, "0" = diese Stelle ist null.
export const ZAHLFORMEN = {
  H00: (rng) => ganzzahl(rng, 1, 9) * 100,
  HZ0: (rng) => ganzzahl(rng, 1, 9) * 100 + ganzzahl(rng, 1, 9) * 10,
  HZE: (rng) => ganzzahl(rng, 1, 9) * 100 + ganzzahl(rng, 0, 9) * 10 + ganzzahl(rng, 1, 9),
  Z0: (rng) => ganzzahl(rng, 1, 9) * 10,
  ZE: (rng) => ganzzahl(rng, 1, 9) * 10 + ganzzahl(rng, 1, 9),
  E: (rng) => ganzzahl(rng, 1, 9),
  1000: () => 1000,
};

export const SYMBOL = { '+': '+', '-': '−' };

export const HINWEISE = ['rechenzeichen', 'zwischenschritt', 'hunderter', 'zehner', 'einer'];

// Addition: Übertrag, sobald eine Stelle zusammen 10 oder mehr ergibt.
export function hatUebertragPlus(a, b) {
  while (a > 0 || b > 0) {
    if ((a % 10) + (b % 10) >= 10) return true;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return false;
}

// Subtraktion (a ≥ b): Übertrag, sobald eine Stelle von a kleiner ist als dieselbe Stelle von b.
export function hatUebertragMinus(a, b) {
  while (b > 0) {
    if (a % 10 < b % 10) return true;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return false;
}

export function loesungFuer(a, op, b) {
  return op === '+' ? a + b : a - b;
}

export function formatiereTerm(a, op, b) {
  return `${a} ${SYMBOL[op]} ${b}`;
}

// Zieht zufällige Zahlen nach den erlaubten Formen, bis der gewünschte Übertrag-Fall eintrifft.
// `uebertrag` ist eine Wahrscheinlichkeit (0 = nie, 1 = immer). Für Minus gilt immer a > b.
export function erzeugeTerm(rng, { op, formen, uebertrag, max = 1000, versuche = 300 }) {
  const soll = chance(rng, uebertrag);
  let notloesung = null;
  for (let i = 0; i < versuche; i++) {
    const [formA, formB] = auswahl(rng, formen);
    const a = ZAHLFORMEN[formA](rng);
    const b = ZAHLFORMEN[formB](rng);
    if (op === '+' ? a + b > max : a <= b) continue;
    const hat = op === '+' ? hatUebertragPlus(a, b) : hatUebertragMinus(a, b);
    if (hat === soll) return { a, b, uebertrag: hat };
    notloesung = notloesung || { a, b, uebertrag: hat };
  }
  if (notloesung) return notloesung;
  throw new Error(`Kein gültiger Term für "${op}" mit den Formen ${JSON.stringify(formen)}`);
}

// Schrittweise rechnen, wie in der Schule: 356 + 237 → 356 + 200 = 556, 556 + 30 = 586, 586 + 7 = 593.
export function rechenwegSchrittweise(a, op, b) {
  const teile = [Math.floor(b / 100) * 100, Math.floor((b % 100) / 10) * 10, b % 10].filter((teil) => teil > 0);
  const schritte = [];
  let zwischen = a;
  for (const teil of teile) {
    const bis = loesungFuer(zwischen, op, teil);
    schritte.push({ von: zwischen, teil, bis });
    zwischen = bis;
  }
  return schritte;
}

// Erkennt typische Fehler und liefert einen Hinweis-Code (oder null).
export function hinweisZurAntwort({ a, op, b, loesung, rechenweg }, antwort) {
  if (!Number.isFinite(antwort) || antwort === loesung) return null;
  const vertauscht = op === '+' ? Math.abs(a - b) : a + b;
  if (antwort === vertauscht) return 'rechenzeichen';
  if (rechenweg.length > 1 && rechenweg.slice(0, -1).some((schritt) => schritt.bis === antwort)) return 'zwischenschritt';
  const abstand = Math.abs(antwort - loesung);
  if (abstand === 100) return 'hunderter';
  if (abstand === 10) return 'zehner';
  if (abstand === 1) return 'einer';
  return null;
}

export function erzeugeKopfrechenAufgabe(rng, { op, stufe, formen, uebertrag, max = 1000 }) {
  const { a, b, uebertrag: hatUebertrag } = erzeugeTerm(rng, { op, formen, uebertrag, max });
  return {
    typ: 'zahleneingabe',
    a,
    op,
    b,
    anzeige: formatiereTerm(a, op, b),
    loesung: loesungFuer(a, op, b),
    stufe,
    uebertrag: hatUebertrag,
    rechenweg: rechenwegSchrittweise(a, op, b),
  };
}
