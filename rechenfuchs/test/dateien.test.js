// Ohne Bundler zeigt sich ein Tippfehler in einem Pfad erst im Browser. Dieser Test findet ihn vorher.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = resolve(fileURLToPath(new URL('..', import.meta.url)));

async function existiert(pfad) {
  try { await stat(pfad); return true; } catch { return false; }
}

async function jsDateien(ordner) {
  const eintraege = await readdir(ordner, { withFileTypes: true });
  const dateien = [];
  for (const eintrag of eintraege) {
    if (eintrag.name === 'node_modules' || eintrag.name.startsWith('.')) continue;
    const pfad = join(ordner, eintrag.name);
    if (eintrag.isDirectory()) dateien.push(...await jsDateien(pfad));
    else if (eintrag.name.endsWith('.js')) dateien.push(pfad);
  }
  return dateien;
}

test('index.html verweist nur auf vorhandene lokale Dateien', async () => {
  const html = await readFile(join(WURZEL, 'index.html'), 'utf8');
  const verweise = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((v) => !/^(https?:|data:|#|mailto:)/.test(v));
  assert.ok(verweise.length >= 3);
  for (const verweis of verweise) assert.ok(await existiert(join(WURZEL, verweis)), verweis);
});

test('alle relativen Importe lösen sich auf', async () => {
  const dateien = await jsDateien(WURZEL);
  assert.ok(dateien.length >= 10);
  for (const datei of dateien) {
    const quelle = await readFile(datei, 'utf8');
    for (const m of quelle.matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)) {
      assert.ok(await existiert(resolve(dirname(datei), m[1])), `${datei}: ${m[1]}`);
    }
  }
});

test('index.html enthält keine externen Skripte oder Stylesheets', async () => {
  const html = await readFile(join(WURZEL, 'index.html'), 'utf8');
  assert.ok(!/<script[^>]+src="https?:/.test(html));
  assert.ok(!/<link[^>]+href="https?:/.test(html));
});
