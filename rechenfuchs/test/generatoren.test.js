import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erzeugeZufall } from '../aufgaben/zufall.js';
import { GENERATOREN, STUFEN, erzeugeAufgabe, erzeugeRunde } from '../aufgaben/generatoren.js';
import { erzeugeTerm, hatUebertragPlus, hatUebertragMinus, rechenwegSchrittweise, hinweisZurAntwort } from '../aufgaben/kopfrechnen.js';
import { alleUnterkapitel } from '../aufgaben/kapitel.js';
import { RUNDEN_LAENGE, STUFEN_MIX, HOECHSTE_STUFE } from '../regeln.js';

const STICHPROBE = 400;

test('Übertrag wird für Plus und Minus richtig erkannt', () => {
  assert.equal(hatUebertragPlus(320, 450), false);
  assert.equal(hatUebertragPlus(356, 237), true);
  assert.equal(hatUebertragPlus(370, 450), true);
  assert.equal(hatUebertragPlus(600, 400), true);
  assert.equal(hatUebertragMinus(780, 340), false);
  assert.equal(hatUebertragMinus(512, 278), true);
  assert.equal(hatUebertragMinus(705, 213), true);
  assert.equal(hatUebertragMinus(1000, 1), true);
  assert.equal(hatUebertragMinus(456, 200), false);
});

for (const [id, generator] of GENERATOREN) {
  for (const stufe of STUFEN) {
    test(`${id} / ${stufe}: Lösung stimmt, Zahlenraum passt, Rechenweg endet bei der Lösung`, () => {
      const rng = erzeugeZufall(42);
      for (let i = 0; i < STICHPROBE; i++) {
        const aufgabe = erzeugeAufgabe(id, stufe, rng);
        const erwartet = generator.op === '+' ? aufgabe.a + aufgabe.b : aufgabe.a - aufgabe.b;
        assert.equal(aufgabe.loesung, erwartet, aufgabe.anzeige);
        assert.ok(aufgabe.a >= 1 && aufgabe.a <= 1000, aufgabe.anzeige);
        assert.ok(aufgabe.b >= 1 && aufgabe.b <= 1000, aufgabe.anzeige);
        assert.ok(aufgabe.loesung >= 1 && aufgabe.loesung <= 1000, aufgabe.anzeige);
        assert.equal(aufgabe.stufe, stufe);
        assert.equal(aufgabe.generator, id);
        assert.equal(aufgabe.typ, 'zahleneingabe');
        assert.ok(aufgabe.rechenweg.length >= 1);
        assert.equal(aufgabe.rechenweg[0].von, aufgabe.a);
        assert.equal(aufgabe.rechenweg.at(-1).bis, aufgabe.loesung);
      }
    });
  }

  test(`${id} / leicht: nur Zehnerzahlen, nie Übertrag`, () => {
    const rng = erzeugeZufall(7);
    for (let i = 0; i < STICHPROBE; i++) {
      const aufgabe = erzeugeAufgabe(id, 'leicht', rng);
      assert.equal(aufgabe.a % 10, 0, aufgabe.anzeige);
      assert.equal(aufgabe.b % 10, 0, aufgabe.anzeige);
      assert.equal(aufgabe.uebertrag, false, aufgabe.anzeige);
    }
  });

  test(`${id} / schwer: Übertrag-Anteil liegt nahe an der Vorgabe`, () => {
    const rng = erzeugeZufall(99);
    const vorgabe = generator.stufen.schwer.uebertrag;
    let mit = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) if (erzeugeAufgabe(id, 'schwer', rng).uebertrag) mit += 1;
    const anteil = mit / n;
    assert.ok(Math.abs(anteil - vorgabe) < 0.08, `Anteil ${anteil.toFixed(2)} statt ${vorgabe}`);
  });
}

test('Übertrag ist steuerbar: 1 erzwingt ihn, 0 verhindert ihn – auch bei beliebigen Zahlen', () => {
  const rng = erzeugeZufall(3);
  for (const op of ['+', '-']) {
    for (let i = 0; i < STICHPROBE; i++) {
      const immer = erzeugeTerm(rng, { op, formen: [['HZE', 'HZE']], uebertrag: 1 });
      const nie = erzeugeTerm(rng, { op, formen: [['HZE', 'HZE']], uebertrag: 0 });
      assert.equal(immer.uebertrag, true, `${immer.a} ${op} ${immer.b}`);
      assert.equal(nie.uebertrag, false, `${nie.a} ${op} ${nie.b}`);
      if (op === '+') assert.ok(immer.a + immer.b <= 1000 && nie.a + nie.b <= 1000);
      else assert.ok(immer.a > immer.b && nie.a > nie.b);
    }
  }
});

test('Runde: volle Länge, keine Aufgabe doppelt, Stufen nur aus dem Mix, von leicht nach schwer sortiert', () => {
  for (const id of GENERATOREN.keys()) {
    for (let stufe = 1; stufe <= HOECHSTE_STUFE; stufe++) {
      const rng = erzeugeZufall(1000 + stufe);
      for (let wiederholung = 0; wiederholung < 30; wiederholung++) {
        const runde = erzeugeRunde(id, { stufe, rng });
        assert.equal(runde.length, RUNDEN_LAENGE);
        const schluessel = new Set(runde.map((a) => a.anzeige));
        assert.equal(schluessel.size, RUNDEN_LAENGE, 'Dublette in der Runde');
        for (const aufgabe of runde) assert.ok(STUFEN_MIX[stufe].includes(aufgabe.stufe), aufgabe.stufe);
        const raenge = runde.map((a) => STUFEN.indexOf(a.stufe));
        assert.deepEqual(raenge, [...raenge].sort((x, y) => x - y));
      }
    }
  }
});

test('gleicher Seed ergibt dieselbe Runde', () => {
  const eins = erzeugeRunde('addieren-bis-1000', { stufe: 2, rng: erzeugeZufall(5) });
  const zwei = erzeugeRunde('addieren-bis-1000', { stufe: 2, rng: erzeugeZufall(5) });
  assert.deepEqual(eins, zwei);
});

test('unbekannter Generator oder unbekannte Stufe werfen einen Fehler', () => {
  assert.throws(() => erzeugeAufgabe('gibt-es-nicht', 'leicht'));
  assert.throws(() => erzeugeAufgabe('addieren-bis-1000', 'extrem'));
});

test('Rechenweg schrittweise: b wird in Hunderter, Zehner, Einer zerlegt', () => {
  assert.deepEqual(rechenwegSchrittweise(356, '+', 237), [
    { von: 356, teil: 200, bis: 556 },
    { von: 556, teil: 30, bis: 586 },
    { von: 586, teil: 7, bis: 593 },
  ]);
  assert.deepEqual(rechenwegSchrittweise(780, '-', 300), [{ von: 780, teil: 300, bis: 480 }]);
  assert.deepEqual(rechenwegSchrittweise(1000, '-', 347), [
    { von: 1000, teil: 300, bis: 700 },
    { von: 700, teil: 40, bis: 660 },
    { von: 660, teil: 7, bis: 653 },
  ]);
});

test('Hinweise zu typischen Fehlern', () => {
  const minus = { a: 780, op: '-', b: 340, loesung: 440, rechenweg: rechenwegSchrittweise(780, '-', 340) };
  assert.equal(hinweisZurAntwort(minus, 1120), 'rechenzeichen');
  assert.equal(hinweisZurAntwort(minus, 480), 'zwischenschritt');
  assert.equal(hinweisZurAntwort(minus, 540), 'hunderter');
  assert.equal(hinweisZurAntwort(minus, 450), 'zehner');
  assert.equal(hinweisZurAntwort(minus, 441), 'einer');
  assert.equal(hinweisZurAntwort(minus, 999), null);
  assert.equal(hinweisZurAntwort(minus, 440), null);
  const plus = { a: 356, op: '+', b: 237, loesung: 593, rechenweg: rechenwegSchrittweise(356, '+', 237) };
  assert.equal(hinweisZurAntwort(plus, 119), 'rechenzeichen');
  assert.equal(hinweisZurAntwort(plus, 586), 'zwischenschritt');
  assert.equal(hinweisZurAntwort(plus, 583), 'zehner');
  assert.equal(hinweisZurAntwort(plus, NaN), null);
});

test('Kapitelbaum: IDs eindeutig, jeder Generator bekannt, jedes Unterkapitel liefert eine Runde', () => {
  const unterkapitel = alleUnterkapitel();
  assert.ok(unterkapitel.length >= 2);
  assert.equal(new Set(unterkapitel.map((u) => u.id)).size, unterkapitel.length);
  for (const u of unterkapitel) {
    assert.ok(GENERATOREN.has(u.generator), `${u.id} → ${u.generator}`);
    assert.equal(erzeugeRunde(u.generator, { rng: erzeugeZufall(1) }).length, RUNDEN_LAENGE);
  }
});
