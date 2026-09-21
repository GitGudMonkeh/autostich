// Fortschritt im localStorage. Ein Schlüssel, ein JSON-Objekt, versioniert (Schema siehe PLAN.md).
// Kaputte oder unbekannte Daten führen zu einem frischen Stand, nie zu einem Absturz.
// Ohne localStorage (privater Modus) läuft die App im Arbeitsspeicher weiter.

import { PUNKTE_PRO_RICHTIG, AUFSTIEG_AB, HOECHSTE_STUFE } from '../regeln.js';

export const SCHLUESSEL = 'rechenfuchs.fortschritt';
export const VERSION = 1;

const jetztIso = () => new Date().toISOString();

export function leererFortschritt(jetzt = jetztIso()) {
  return { version: VERSION, erstellt: jetzt, aktualisiert: jetzt, punkte: 0, freigeschaltet: [], unterkapitel: {} };
}

export function leererUnterkapitelStand() {
  return { stufe: 1, runden: 0, aufgaben: 0, richtig: 0, letzteRunde: null };
}

// Liefert den Stand eines Unterkapitels und legt ihn bei Bedarf an.
export function unterkapitelStand(fortschritt, id) {
  if (!fortschritt.unterkapitel[id]) fortschritt.unterkapitel[id] = leererUnterkapitelStand();
  return fortschritt.unterkapitel[id];
}

export function verbucheAntwort(fortschritt, id, richtig, jetzt = jetztIso()) {
  const stand = unterkapitelStand(fortschritt, id);
  stand.aufgaben += 1;
  if (richtig) {
    stand.richtig += 1;
    fortschritt.punkte += PUNKTE_PRO_RICHTIG;
  }
  fortschritt.aktualisiert = jetzt;
  return fortschritt;
}

// Am Rundenende: Runde zählen, letztes Ergebnis merken, bei starker Runde eine Stufe aufsteigen. Kein Abstieg.
export function verbucheRunde(fortschritt, id, { richtig, von }, jetzt = jetztIso()) {
  const stand = unterkapitelStand(fortschritt, id);
  stand.runden += 1;
  stand.letzteRunde = { richtig, von, am: jetzt };
  const aufgestiegen = richtig >= AUFSTIEG_AB && stand.stufe < HOECHSTE_STUFE;
  if (aufgestiegen) stand.stufe += 1;
  fortschritt.aktualisiert = jetzt;
  return { aufgestiegen, stufe: stand.stufe };
}

const zahl = (wert, ersatz = 0) => (typeof wert === 'number' && Number.isFinite(wert) && wert >= 0 ? wert : ersatz);

// Künftige Schema-Änderungen werden hier Schritt für Schritt hochgezogen (version 1 → 2 → …).
export function migriere(daten) {
  return daten;
}

// Bringt geladene Daten in eine verlässliche Form. null = unbrauchbar, Aufrufer startet frisch.
export function normalisiere(roh) {
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return null;
  if (typeof roh.version !== 'number' || roh.version > VERSION) return null;
  const daten = migriere(roh);
  const frisch = leererFortschritt();
  const unterkapitel = {};
  if (daten.unterkapitel && typeof daten.unterkapitel === 'object') {
    for (const [id, stand] of Object.entries(daten.unterkapitel)) {
      if (!stand || typeof stand !== 'object') continue;
      const letzte = stand.letzteRunde && typeof stand.letzteRunde === 'object' ? stand.letzteRunde : null;
      unterkapitel[id] = {
        stufe: Math.min(HOECHSTE_STUFE, Math.max(1, zahl(stand.stufe, 1))),
        runden: zahl(stand.runden),
        aufgaben: zahl(stand.aufgaben),
        richtig: zahl(stand.richtig),
        letzteRunde: letzte ? { richtig: zahl(letzte.richtig), von: zahl(letzte.von), am: typeof letzte.am === 'string' ? letzte.am : frisch.aktualisiert } : null,
      };
    }
  }
  return {
    version: VERSION,
    erstellt: typeof daten.erstellt === 'string' ? daten.erstellt : frisch.erstellt,
    aktualisiert: typeof daten.aktualisiert === 'string' ? daten.aktualisiert : frisch.aktualisiert,
    punkte: zahl(daten.punkte),
    freigeschaltet: Array.isArray(daten.freigeschaltet) ? daten.freigeschaltet.filter((id) => typeof id === 'string') : [],
    unterkapitel,
  };
}

export function arbeitsspeicher() {
  const ablage = new Map();
  return {
    getItem: (schluessel) => (ablage.has(schluessel) ? ablage.get(schluessel) : null),
    setItem: (schluessel, wert) => { ablage.set(schluessel, String(wert)); },
    removeItem: (schluessel) => { ablage.delete(schluessel); },
  };
}

// localStorage, wenn er da ist und schreibbar; sonst Arbeitsspeicher.
export function ermittleStorage() {
  try {
    const storage = globalThis.localStorage;
    const probe = '__rechenfuchs_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return arbeitsspeicher();
  }
}

export function erzeugeSpeicher(storage = ermittleStorage(), schluessel = SCHLUESSEL) {
  return {
    laden() {
      try {
        const roh = storage.getItem(schluessel);
        if (!roh) return leererFortschritt();
        return normalisiere(JSON.parse(roh)) || leererFortschritt();
      } catch {
        return leererFortschritt();
      }
    },
    speichern(fortschritt) {
      try {
        storage.setItem(schluessel, JSON.stringify(fortschritt));
        return true;
      } catch {
        return false;
      }
    },
    loeschen() {
      try { storage.removeItem(schluessel); } catch { /* nichts zu tun */ }
    },
  };
}
