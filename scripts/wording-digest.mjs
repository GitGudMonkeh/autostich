/* Wortlaut-Basis der Kataloge feststellen (Contract, Teil 0).
   Der Blob-Hash taugt dafuer nicht: er feuert auch auf eine verschobene Klammer. Geprueft wird
   deshalb der GEPARSTE Katalog, also das, was das Modul nach dem Import wirklich enthaelt,
   inklusive der aus Konstanten interpolierten Zahlen.

   Aufruf:
     node scripts/wording-digest.mjs                  Digest des Arbeitsstands
     node scripts/wording-digest.mjs <git-ref>        Vergleich gegen einen Commit
     node scripts/wording-digest.mjs <verzeichnis>    Vergleich gegen einen zweiten Worktree

   Beide Formen legen die Basis als VOLLSTAENDIGEN Baum aus; die Ref-Form macht sich dafuer
   kurzzeitig einen detached worktree und raeumt ihn wieder weg.

   Sie tat das nicht immer. Zuerst hat sie nur `de.js` und `en.js` des Refs neben die echten Module
   geschrieben und importiert — und damit still gelogen, sobald sich ein IMPORT des Katalogs
   geaendert hatte: die deutschen Decknamen kommen aus `src/game/cosmetics.js`, nicht aus dem
   Katalog, also las die Basis sie aus dem Arbeitsstand und meldete null Aenderung, wo sieben
   Namen umgeschrieben worden waren. Ein Pruefwerkzeug, das an genau der Stelle blind ist, an der
   es gebraucht wird, ist schlimmer als keines. Die Prozedur aus dem Briefing war richtig, die
   Abkuerzung war es nicht.

   Gemeldet werden drei Zahlen. Zwei entscheiden:
     WORTLAUT geaendert                        > 0  -> anhalten, Wortlaut-Aenderung
     entfernte Schluessel ohne verbleibenden Text > 0  -> anhalten, Text ist verloren
     entfernt / neu                                 -> informativ, das ist Struktur

   "Verbleibender Text" heisst: der Wert des entfernten Schluessels steht noch woertlich in einem
   Wert des neuen Katalogs. Genau das trifft auf eine Zusammenlegung zu, bei der aus drei
   Fragmenten ein Satz wird. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const I18N = resolve(HERE, "../src/i18n");
const SPRACHEN = ["de", "en"];

/* 16 Hex = 64 Bit. U+0000 als Trennzeichen, damit "a"+"bc" und "ab"+"c" nicht kollidieren. */
const digest = (kat) => createHash("sha256")
  .update(Object.keys(kat).sort().map((k) => `${k}\u0000${kat[k]}`).join("\u0000"))
  .digest("hex").slice(0, 16);

const laden = async (pfad) => (await import(`file://${pfad}?t=${Math.random()}`)).default;

const zeile = (name, kat) => `  ${name}  ${digest(kat)}  ${Object.keys(kat).length} Schluessel`;

const jetzt = {};
for (const s of SPRACHEN) jetzt[s] = await laden(join(I18N, `${s}.js`));

const arg = process.argv[2];
console.log("Arbeitsstand");
for (const s of SPRACHEN) console.log(zeile(s, jetzt[s]));
if (!arg) process.exit(0);

const istVerzeichnis = existsSync(arg) && statSync(arg).isDirectory();
/* Ein Pfad, den es noch nicht gibt: `git worktree add` verweigert einen belegten. */
const tempBaum = istVerzeichnis ? null : resolve(ROOT, `../.wording-basis-${process.pid}`);
const refBaum = istVerzeichnis ? resolve(arg) : tempBaum;
let code = 0;
if (tempBaum) execFileSync("git", ["worktree", "add", "--detach", tempBaum, arg], { cwd: ROOT, stdio: "pipe" });
try {
  const alt = {};
  for (const s of SPRACHEN) {
    if (istVerzeichnis) {
      alt[s] = await laden(resolve(arg, "src/i18n", `${s}.js`));
    } else {
      alt[s] = await laden(resolve(refBaum, "src/i18n", `${s}.js`));
    }
  }

  console.log(`\nBasis  ${arg}`);
  for (const s of SPRACHEN) console.log(zeile(s, alt[s]));

  console.log("\nVergleich");
  for (const s of SPRACHEN) {
    const a = alt[s], b = jetzt[s];
    const werte = new Set(Object.values(b));
    const bleibt = (text) => werte.has(text) || [...werte].some((v) => v.includes(text));

    const geaendert = Object.keys(a).filter((k) => k in b && a[k] !== b[k]);
    const entfernt = Object.keys(a).filter((k) => !(k in b));
    const neu = Object.keys(b).filter((k) => !(k in a));
    const verloren = entfernt.filter((k) => !bleibt(a[k]));

    console.log(`  ${s}`);
    console.log(`    WORTLAUT geaendert                          ${geaendert.length}`);
    console.log(`    entfernte Schluessel ohne verbleibenden Text ${verloren.length}`);
    console.log(`    entfernt ${entfernt.length} / neu ${neu.length}  (Struktur, informativ)`);
    for (const k of geaendert) console.log(`       geaendert: ${k}\n          alt: ${a[k]}\n          neu: ${b[k]}`);
    for (const k of verloren) console.log(`       Text verloren: ${k} — ${a[k]}`);
    for (const k of entfernt) console.log(`       entfernt: ${k}${verloren.includes(k) ? "" : "  (Text bleibt)"}`);
    for (const k of neu) console.log(`       neu     : ${k}`);
    if (geaendert.length || verloren.length) code = 1;
  }

  console.log(code
    ? "\nURTEIL: anhalten und melden — Wortlaut bewegt oder Text verloren."
    : "\nURTEIL: rein strukturell. Neue Basis im Contract unter Task-specific inputs eintragen, mit beiden Digests.");
} finally {
  if (tempBaum) {
    execFileSync("git", ["worktree", "remove", tempBaum], { cwd: ROOT, stdio: "pipe" });
  }
}
process.exit(code);
