// Registry aller Aufgaben-Generatoren und der Rundenaufbau.
// Ein neuer Generator: Datei unter kapitel-N/ anlegen, hier importieren und in die Liste aufnehmen.

import { auswahl } from './zufall.js';
import { RUNDEN_LAENGE, STUFEN_MIX } from '../regeln.js';
import addierenBis1000 from './kapitel-1/addieren-bis-1000.js';
import subtrahierenBis1000 from './kapitel-1/subtrahieren-bis-1000.js';

export const STUFEN = ['leicht', 'mittel', 'schwer'];

export const GENERATOREN = new Map([addierenBis1000, subtrahierenBis1000].map((g) => [g.id, g]));

export function erzeugeAufgabe(generatorId, stufe, rng = Math.random) {
  const generator = GENERATOREN.get(generatorId);
  if (!generator) throw new Error(`Unbekannter Generator: ${generatorId}`);
  if (!generator.stufen[stufe]) throw new Error(`Unbekannte Stufe "${stufe}" für ${generatorId}`);
  return { generator: generatorId, ...generator.erzeuge(rng, stufe) };
}

// Eine Runde: `anzahl` Aufgaben aus dem Stufen-Mix der Unterkapitel-Stufe, ohne Dublette,
// von leicht nach schwer sortiert, damit die Runde sanft anzieht.
export function erzeugeRunde(generatorId, { stufe = 1, anzahl = RUNDEN_LAENGE, rng = Math.random } = {}) {
  const mix = STUFEN_MIX[stufe] || STUFEN_MIX[1];
  const runde = [];
  const gesehen = new Set();
  let versuche = 0;
  while (runde.length < anzahl) {
    versuche += 1;
    const aufgabe = erzeugeAufgabe(generatorId, auswahl(rng, mix), rng);
    const schluessel = `${aufgabe.a}${aufgabe.op}${aufgabe.b}`;
    if (gesehen.has(schluessel) && versuche < anzahl * 20) continue;
    gesehen.add(schluessel);
    runde.push(aufgabe);
  }
  return runde.sort((x, y) => STUFEN.indexOf(x.stufe) - STUFEN.indexOf(y.stufe));
}
