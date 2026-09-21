// Alle Stellschrauben des Prototyps an einem Ort. Änderungen hier brauchen keinen Code-Umbau.

export const RUNDEN_LAENGE = 8;            // Aufgaben pro Übungsrunde
export const PUNKTE_PRO_RICHTIG = 1;       // Wohlfühl-Punkte je richtiger Antwort
export const PUNKTE_PRO_ACCESSOIRE = 10;   // alle N Punkte bekommt der Fuchs etwas Neues
export const AUFSTIEG_AB = 7;              // ab so vielen richtigen (von RUNDEN_LAENGE) steigt die Stufe
export const HOECHSTE_STUFE = 3;
export const STUFEN_MIX = {                // aus welchen Generator-Stufen eine Runde je Unterkapitel-Stufe schöpft
  1: ['leicht'],
  2: ['leicht', 'mittel'],
  3: ['mittel', 'schwer'],
};
export const WEITER_NACH_RICHTIG_MS = 1200; // nach richtiger Antwort geht es automatisch weiter
export const MAX_STELLEN = 4;               // Ziffernblock: höchstens vier Ziffern (Antworten ≤ 1000)
