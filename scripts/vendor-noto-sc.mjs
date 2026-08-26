#!/usr/bin/env node
/* Holt Noto Sans SC als selbstgehostete Scheiben und schreibt den @font-face-Block dazu.
   Contract A4/A4a: keine neue Abhaengigkeit, kein Subsetter. Der Weg ist deshalb: das
   Google-Fonts-Stylesheet mit einem woff2-faehigen User-Agent laden, aus ihm die `src`-URLs UND
   die zugehoerigen `unicode-range`-Werte nehmen, die Dateien ablegen und den Block aus denselben
   Daten erzeugen. Die Bereiche kommen aus dem Stylesheet, nie aus dem Gedaechtnis.

   Aufruf:
     node scripts/vendor-noto-sc.mjs --check     nur pruefen und zaehlen, nichts schreiben
     node scripts/vendor-noto-sc.mjs             Dateien holen und CSS erzeugen

   Gemessen und hier geprueft: die Gewichte 400/500/600 zeigen auf DIESELBEN Dateien, die Schrift
   ist variabel. Drei Gewichte kosten also eines. Der erzeugte Block sagt das aus, indem er je
   Scheibe EINE Regel mit `font-weight: 400 600` schreibt statt dreimal derselben Datei. */
import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const ZIEL = resolve(ROOT, "src/assets/fonts/noto-sans-sc");
const CSS_OUT = resolve(ROOT, "src/assets/fonts/noto-sans-sc/face.css");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const QUELLE = "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600&display=swap";

const css = await (await fetch(QUELLE, { headers: { "User-Agent": UA } })).text();

/* Jeder Block traegt genau ein `font-weight`, eine `src`-URL und eine `unicode-range`. */
const bloecke = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => {
  const b = m[1];
  const feld = (re) => ((b.match(re) || ["", ""])[1] || "").trim();
  return {
    weight: feld(/font-weight:\s*([^;]+);/),
    url: feld(/src:\s*url\(([^)]+)\)/),
    range: feld(/unicode-range:\s*([^;]+);/),
  };
});

const gewichte = [...new Set(bloecke.map((b) => b.weight))].sort();
const proGewicht = Object.fromEntries(gewichte.map((g) => [g, bloecke.filter((b) => b.weight === g)]));

/* Die Kernbehauptung von A4, hier nachgeprueft statt geglaubt: gleiche Reihenfolge, gleiche
   Bereiche, gleiche Dateien. Faellt sie, ist der Block unten falsch und der Lauf bricht ab. */
const basis = proGewicht[gewichte[0]];
for (const g of gewichte.slice(1)) {
  const andere = proGewicht[g];
  const gleich = andere.length === basis.length
    && andere.every((b, i) => b.url === basis[i].url && b.range === basis[i].range);
  if (!gleich) {
    console.log(`FEHLER: Gewicht ${g} zeigt auf andere Dateien als ${gewichte[0]} — die Schrift ist hier nicht variabel.`);
    console.log("Der erzeugte Block waere falsch. Abbruch.");
    process.exit(1);
  }
}

console.log(`Stylesheet: ${bloecke.length} Bloecke, Gewichte ${gewichte.join("/")}`);
console.log(`Scheiben je Gewicht: ${basis.length} — identisch ueber alle Gewichte (variabel)`);

const scheiben = basis.map((b, i) => ({
  datei: `noto-sans-sc-${String(i).padStart(3, "0")}.woff2`,
  url: b.url,
  range: b.range,
}));

/* Kein process.exit() hier: nach einem fetch haengen noch Handles, und Node bricht auf Windows
   beim harten Beenden mit einer libuv-Assertion ab. Der Pruef-Lauf faellt deshalb einfach durch
   den Rest hindurch, statt ihn abzuschiessen. */
const nurPruefen = process.argv.includes("--check");
if (nurPruefen) {
  const da = scheiben.filter((s) => existsSync(join(ZIEL, s.datei))).length;
  console.log(`  lokal vorhanden: ${da} von ${scheiben.length}`);
}

if (!nurPruefen) {
mkdirSync(ZIEL, { recursive: true });
let bytes = 0, geholt = 0;
for (const s of scheiben) {
  const p = join(ZIEL, s.datei);
  if (existsSync(p)) { bytes += statSync(p).size; continue; }
  const buf = Buffer.from(await (await fetch(s.url, { headers: { "User-Agent": UA } })).arrayBuffer());
  writeFileSync(p, buf);
  bytes += buf.length; geholt++;
  if (geholt % 20 === 0) console.log(`  ${geholt} geladen …`);
}
console.log(`Dateien: ${scheiben.length}, davon neu geladen ${geholt}, gesamt ${bytes.toLocaleString("en-US")} B`);

/* Der Block wird ERZEUGT, damit Bereich und Datei nie auseinanderlaufen koennen. Vite loest die
   relativen URLs beim Bauen auf und haengt die Hashes an. */
const kopf = `/* ERZEUGT — nicht von Hand bearbeiten.
   Quelle: ${QUELLE}
   Neu erzeugen: node scripts/vendor-noto-sc.mjs

   ${scheiben.length} Scheiben, ${bytes.toLocaleString("en-US")} B. Die \`unicode-range\`-Angaben stammen aus dem
   Stylesheet und entscheiden, welche Datei ein Browser ueberhaupt anfasst: ein deutscher Spieler
   laedt hiervon nichts. \`font-weight: ${gewichte[0]} ${gewichte[gewichte.length - 1]}\` als Bereich, weil die Schrift variabel ist
   und alle Gewichte auf dieselbe Datei zeigen (im Skript geprueft, nicht geglaubt).

   \`font-display: swap\`: der Text steht sofort in der Ersatzschrift und tauscht nach. Auf einer
   geschnittenen Schrift ist das ein Tausch weniger Glyphen, kein Umbruch der Seite (S3). */
`;

const regeln = scheiben.map((s) => `@font-face {
  font-family: "Noto Sans SC";
  font-style: normal;
  font-weight: ${gewichte[0]} ${gewichte[gewichte.length - 1]};
  font-display: swap;
  src: url("./${s.datei}") format("woff2");
  unicode-range: ${s.range};
}`).join("\n");

writeFileSync(CSS_OUT, kopf + regeln + "\n", "utf8");
console.log(`geschrieben: src/assets/fonts/noto-sans-sc/face.css (${scheiben.length} Regeln)`);
}
