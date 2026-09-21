// Punkte → Accessoires für den Fuchs. Reihenfolge ist fest, Schwellen kommen aus regeln.js.
// Freischaltungen werden im Fortschritt gespeichert und nie wieder entzogen.

import { PUNKTE_PRO_ACCESSOIRE } from '../regeln.js';

export const ACCESSOIRES = ['halstuch', 'muetze', 'brille', 'blume'].map((id, i) => ({ id, ab: (i + 1) * PUNKTE_PRO_ACCESSOIRE }));

export function verdienteAccessoires(punkte) {
  return ACCESSOIRES.filter((accessoire) => punkte >= accessoire.ab).map((accessoire) => accessoire.id);
}

// Verdient, aber noch nicht freigeschaltet – das wird am Rundenende gefeiert.
export function neueFreischaltungen(fortschritt) {
  return verdienteAccessoires(fortschritt.punkte).filter((id) => !fortschritt.freigeschaltet.includes(id));
}

export function schalteFrei(fortschritt, ids) {
  for (const id of ids) {
    if (!fortschritt.freigeschaltet.includes(id)) fortschritt.freigeschaltet.push(id);
  }
  return fortschritt;
}

// Das nächste noch nicht freigeschaltete Accessoire und wie viele Punkte dafür fehlen; null, wenn alles da ist.
export function naechsteFreischaltung(fortschritt) {
  const naechstes = ACCESSOIRES.find((accessoire) => !fortschritt.freigeschaltet.includes(accessoire.id));
  if (!naechstes) return null;
  return { id: naechstes.id, ab: naechstes.ab, fehlend: Math.max(0, naechstes.ab - fortschritt.punkte) };
}
