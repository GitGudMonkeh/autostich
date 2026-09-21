import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuchsSvg } from '../ui/fuchs.js';
import { TEXTE } from '../ui/texte.js';
import { ACCESSOIRES } from '../fortschritt/belohnung.js';
import { HINWEISE } from '../aufgaben/kopfrechnen.js';
import { RUNDEN_LAENGE } from '../regeln.js';

test('Fuchs zeichnet Accessoires nur, wenn sie freigeschaltet sind', () => {
  const ohne = fuchsSvg([]);
  assert.ok(ohne.startsWith('<svg'));
  for (const { id } of ACCESSOIRES) {
    assert.ok(!ohne.includes(`accessoire-${id}`), `${id} ohne Freischaltung sichtbar`);
    assert.ok(fuchsSvg([id]).includes(`accessoire-${id}`), `${id} fehlt trotz Freischaltung`);
  }
  assert.ok(fuchsSvg([], { klasse: 'fuchs jubel' }).includes('class="fuchs jubel"'));
});

test('jeder Hinweis-Code hat einen Text', () => {
  for (const code of HINWEISE) {
    assert.equal(typeof TEXTE.runde.hinweise[code], 'function', code);
    assert.ok(TEXTE.runde.hinweise[code]('+').length > 0);
    assert.ok(TEXTE.runde.hinweise[code]('-').length > 0);
  }
});

test('Ergebnis-Texte gibt es für jede mögliche Trefferzahl, Punkte-Texte beugen richtig', () => {
  for (let richtig = 0; richtig <= RUNDEN_LAENGE; richtig++) {
    assert.ok(TEXTE.ergebnis.nachricht(richtig, RUNDEN_LAENGE).length > 0, String(richtig));
  }
  assert.equal(TEXTE.start.punkte(1), '1 Punkt');
  assert.equal(TEXTE.start.punkte(2), '2 Punkte');
  assert.match(TEXTE.ergebnis.punkteGesammelt(0, 1), /keinen neuen Punkt.*1 Punkt\./);
  assert.match(TEXTE.ergebnis.punkteGesammelt(3, 12), /3 Punkte.*12 Punkte/);
});
