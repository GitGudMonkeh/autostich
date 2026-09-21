import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHLUESSEL, VERSION, arbeitsspeicher, erzeugeSpeicher, ermittleStorage, leererFortschritt,
  normalisiere, unterkapitelStand, verbucheAntwort, verbucheRunde,
} from '../fortschritt/speicher.js';
import { AUFSTIEG_AB, HOECHSTE_STUFE, PUNKTE_PRO_RICHTIG, RUNDEN_LAENGE } from '../regeln.js';

test('leerer Speicher liefert einen frischen Stand', () => {
  const speicher = erzeugeSpeicher(arbeitsspeicher());
  const stand = speicher.laden();
  assert.equal(stand.version, VERSION);
  assert.equal(stand.punkte, 0);
  assert.deepEqual(stand.freigeschaltet, []);
  assert.deepEqual(stand.unterkapitel, {});
});

test('Speichern und Laden sind verlustfrei', () => {
  const ablage = arbeitsspeicher();
  const speicher = erzeugeSpeicher(ablage);
  const stand = leererFortschritt('2026-09-21T10:00:00.000Z');
  verbucheAntwort(stand, 'k1-addieren-bis-1000', true, '2026-09-21T10:01:00.000Z');
  verbucheRunde(stand, 'k1-addieren-bis-1000', { richtig: 8, von: 8 }, '2026-09-21T10:02:00.000Z');
  assert.equal(speicher.speichern(stand), true);
  assert.ok(ablage.getItem(SCHLUESSEL));
  assert.deepEqual(speicher.laden(), stand);
});

test('kaputte, fremde oder zu neue Daten führen zu einem frischen Stand', () => {
  for (const roh of ['{kaputt', '"text"', '[]', 'null', JSON.stringify({ version: VERSION + 1, punkte: 99 }), JSON.stringify({ punkte: 5 })]) {
    const ablage = arbeitsspeicher();
    ablage.setItem(SCHLUESSEL, roh);
    const stand = erzeugeSpeicher(ablage).laden();
    assert.equal(stand.punkte, 0, roh);
    assert.equal(stand.version, VERSION, roh);
  }
});

test('normalisiere repariert einzelne falsche Felder statt alles zu verwerfen', () => {
  const stand = normalisiere({
    version: 1,
    punkte: 'zwölf',
    freigeschaltet: ['halstuch', 3, null],
    unterkapitel: { a: { stufe: 9, runden: -1, richtig: 4, aufgaben: 8, letzteRunde: { richtig: 4, von: 8 } }, b: 'unsinn' },
  });
  assert.equal(stand.punkte, 0);
  assert.deepEqual(stand.freigeschaltet, ['halstuch']);
  assert.equal(stand.unterkapitel.a.stufe, HOECHSTE_STUFE);
  assert.equal(stand.unterkapitel.a.runden, 0);
  assert.equal(stand.unterkapitel.a.richtig, 4);
  assert.equal(typeof stand.unterkapitel.a.letzteRunde.am, 'string');
  assert.equal(stand.unterkapitel.b, undefined);
});

test('ohne funktionierenden Storage läuft die App im Arbeitsspeicher weiter', () => {
  const kaputt = { getItem() { throw new Error('nein'); }, setItem() { throw new Error('nein'); }, removeItem() { throw new Error('nein'); } };
  const speicher = erzeugeSpeicher(kaputt);
  assert.equal(speicher.laden().punkte, 0);
  assert.equal(speicher.speichern(leererFortschritt()), false);
  assert.doesNotThrow(() => speicher.loeschen());
  // In Node gibt es kein localStorage-Objekt mit Web-API → Arbeitsspeicher
  const storage = ermittleStorage();
  storage.setItem('x', '1');
  assert.equal(storage.getItem('x'), '1');
});

test('verbucheAntwort zählt Aufgaben und vergibt Punkte nur für richtige Antworten', () => {
  const stand = leererFortschritt();
  verbucheAntwort(stand, 'u', true);
  verbucheAntwort(stand, 'u', false);
  verbucheAntwort(stand, 'u', true);
  assert.equal(stand.punkte, 2 * PUNKTE_PRO_RICHTIG);
  assert.deepEqual(unterkapitelStand(stand, 'u'), { stufe: 1, runden: 0, aufgaben: 3, richtig: 2, letzteRunde: null });
});

test('verbucheRunde: Aufstieg ab der Schwelle, nie Abstieg, Deckel bei der höchsten Stufe', () => {
  const stand = leererFortschritt();
  const schwach = verbucheRunde(stand, 'u', { richtig: AUFSTIEG_AB - 1, von: RUNDEN_LAENGE });
  assert.deepEqual(schwach, { aufgestiegen: false, stufe: 1 });
  const stark = verbucheRunde(stand, 'u', { richtig: AUFSTIEG_AB, von: RUNDEN_LAENGE });
  assert.deepEqual(stark, { aufgestiegen: true, stufe: 2 });
  verbucheRunde(stand, 'u', { richtig: 0, von: RUNDEN_LAENGE });
  assert.equal(unterkapitelStand(stand, 'u').stufe, 2, 'kein Abstieg');
  for (let i = 0; i < 5; i++) verbucheRunde(stand, 'u', { richtig: RUNDEN_LAENGE, von: RUNDEN_LAENGE });
  assert.equal(unterkapitelStand(stand, 'u').stufe, HOECHSTE_STUFE);
  assert.equal(unterkapitelStand(stand, 'u').runden, 8);
  assert.deepEqual(unterkapitelStand(stand, 'u').letzteRunde.richtig, RUNDEN_LAENGE);
});
