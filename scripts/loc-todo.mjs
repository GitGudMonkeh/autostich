#!/usr/bin/env node
/* Migrations-Helfer (#sprache): listet für eine UI-Datei genau die Texte, die die RATSCHE in
   test/i18n-guards.test.js später einfordert — nicht mehr und nicht weniger.

   Warum nicht die CSV nehmen? Die entsteht aus einer Heuristik mit Filterlisten und ist bewusst
   kuratiert; die Ratsche ist strenger und kennt keine Ausnahmen. Wer nach der CSV migriert,
   übersieht Stellen (bei GameOver waren es zwei Knöpfe) und macht die Suite hinterher rot.
   Deshalb hier dieselben Regeln wie im Test, an einer Stelle.

   Aufruf: node scripts/loc-todo.mjs src/ui/HeatBar.jsx [weitere …]
*/
import { readFileSync } from "node:fs";

const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const HAS_WORD = /[A-Za-zÄÖÜäöüß]{3,}/;
const CODEISH = /[;=(){}[\]]|=>/;

export function locTodo(file) {
  const src = stripComments(readFileSync(file, "utf8"));
  const found = new Set();
  for (const m of src.matchAll(/>\s*([^<>{}\n][^<>{}]*?)\s*</g)) found.add(m[1]);
  for (const m of src.matchAll(/(?:title|placeholder|aria-label|alt|label)=\{?"([^"]+)"/g)) found.add(m[1]);
  return [...found].filter((s) => HAS_WORD.test(s) && !CODEISH.test(s)).map((s) => s.trim());
}

const files = process.argv.slice(2);
if (!files.length) { console.error("Aufruf: node scripts/loc-todo.mjs <datei> [...]"); process.exit(1); }
let total = 0;
for (const f of files) {
  const list = locTodo(f);
  total += list.length;
  console.log(`\n== ${f} (${list.length})`);
  for (const s of list) console.log(`   ${JSON.stringify(s)}`);
}
console.log(`\nSumme: ${total}`);
