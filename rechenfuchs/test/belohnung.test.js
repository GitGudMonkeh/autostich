import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCESSOIRES, verdienteAccessoires, neueFreischaltungen, schalteFrei, naechsteFreischaltung } from '../fortschritt/belohnung.js';
import { leererFortschritt } from '../fortschritt/speicher.js';
import { PUNKTE_PRO_ACCESSOIRE } from '../regeln.js';
import { TEXTE } from '../ui/texte.js';

test('Accessoires kommen in fester Reihenfolge, eines je Schwelle', () => {
  assert.deepEqual(ACCESSOIRES.map((a) => a.ab), ACCESSOIRES.map((_, i) => (i + 1) * PUNKTE_PRO_ACCESSOIRE));
  assert.deepEqual(verdienteAccessoires(0), []);
  assert.deepEqual(verdienteAccessoires(PUNKTE_PRO_ACCESSOIRE - 1), []);
  assert.deepEqual(verdienteAccessoires(PUNKTE_PRO_ACCESSOIRE), ['halstuch']);
  assert.deepEqual(verdienteAccessoires(PUNKTE_PRO_ACCESSOIRE * 2 + 5), ['halstuch', 'muetze']);
  assert.deepEqual(verdienteAccessoires(10000), ACCESSOIRES.map((a) => a.id));
});

test('neue Freischaltungen sind verdient, aber noch nicht gespeichert; schalteFrei ist idempotent', () => {
  const stand = leererFortschritt();
  stand.punkte = PUNKTE_PRO_ACCESSOIRE * 2;
  stand.freigeschaltet = ['halstuch'];
  assert.deepEqual(neueFreischaltungen(stand), ['muetze']);
  schalteFrei(stand, ['muetze']);
  schalteFrei(stand, ['muetze']);
  assert.deepEqual(stand.freigeschaltet, ['halstuch', 'muetze']);
  assert.deepEqual(neueFreischaltungen(stand), []);
});

test('nächste Freischaltung nennt das nächste fehlende Accessoire und die fehlenden Punkte', () => {
  const stand = leererFortschritt();
  stand.punkte = 7;
  assert.deepEqual(naechsteFreischaltung(stand), { id: 'halstuch', ab: PUNKTE_PRO_ACCESSOIRE, fehlend: PUNKTE_PRO_ACCESSOIRE - 7 });
  stand.freigeschaltet = ACCESSOIRES.map((a) => a.id);
  assert.equal(naechsteFreischaltung(stand), null);
});

test('jedes Accessoire hat einen Namen für den Ergebnis-Screen', () => {
  for (const { id } of ACCESSOIRES) assert.equal(typeof TEXTE.accessoires[id], 'string', id);
});
