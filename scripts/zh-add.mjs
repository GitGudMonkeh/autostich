#!/usr/bin/env node
/* Traegt uebersetzte Strings in src/i18n/zhHans.js ein und prueft sie dabei.
   EIN Schreiber fuer diese Datei, damit die Pruefungen nicht bei jeder Etappe neu von Hand
   nachgehalten werden muessen.

   Aufruf:
     node scripts/zh-add.mjs <datei.json>     Paare {schluessel: text} eintragen
     node scripts/zh-add.mjs --check          nur pruefen, nichts schreiben

   Geprueft wird gegen den deutschen Katalog und gegen die Satzregeln aus §5 der Order:
     - der Schluessel existiert im deutschen Katalog
     - gleiche Platzhaltermenge, gleiche Anzahl **-Marker
     - keine fremde Marke im chinesischen Text
     - keine halbbreiten Satzzeichen zwischen Han-Zeichen
     - kein Leerzeichen zwischen Han und Latein oder Ziffern
     - kein Leerzeichen vor dem Prozentzeichen
     - kein deutsches Dezimalkomma zwischen Ziffern
     - keine fuehrenden oder folgenden Leerzeichen, keine Zeilenumbrueche

   Geschrieben wird in der Reihenfolge von de.js: so liest sich der Diff wie der Quellkatalog,
   und eine neue Etappe landet dort, wo ihre deutschen Nachbarn stehen. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import de from "../src/i18n/de.js";
import zh from "../src/i18n/zhHans.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = resolve(ROOT, "src/i18n/zhHans.js");

const FREMDE_MARKEN = ["Autostich", "Autotrick", "Autobaza"];
const PH = /\{(\w+)\}/g;
const HAN = "\\u4e00-\\u9fff\\u3400-\\u4dbf";

const mengen = (s) => [...String(s).matchAll(PH)].map((m) => m[0]).sort().join(",");

function pruefe(k, text) {
  const f = [];
  if (!(k in de)) return [`${k}: im deutschen Katalog nicht vorhanden`];
  if (typeof text !== "string" || !text) return [`${k}: leerer Text`];
  if (/\n/.test(text)) f.push(`${k}: Zeilenumbruch`);
  /* Randleerzeichen sind nur dann falsch, wenn die deutsche Zeile keines hat. Einige Strings
     werden angehaengt (" · noch {n} Energie") und tragen ihren Abstand selbst; ihn zu trimmen
     klebte die Teile im gerenderten Satz aneinander. */
  const randDe = [de[k].startsWith(" "), de[k].endsWith(" ")];
  const randZh = [text.startsWith(" "), text.endsWith(" ")];
  if (randDe[0] !== randZh[0] || randDe[1] !== randZh[1]) {
    f.push(`${k}: Randleerzeichen weicht ab — de [${randDe}] vs zh [${randZh}]`);
  }
  if (mengen(de[k]) !== mengen(text)) f.push(`${k}: Platzhalter — de [${mengen(de[k])}] vs zh [${mengen(text)}]`);
  const nDe = (String(de[k]).match(/\*\*/g) || []).length;
  const nZh = (text.match(/\*\*/g) || []).length;
  if (nDe !== nZh) f.push(`${k}: **-Marker — de ${nDe} vs zh ${nZh}`);
  for (const m of FREMDE_MARKEN) if (text.includes(m)) f.push(`${k}: fremde Marke „${m}"`);
  if (new RegExp(`[${HAN}][,;:?!]|[,;:?!][${HAN}]`).test(text)) f.push(`${k}: halbbreites Satzzeichen am Han-Zeichen`);
  if (new RegExp(`[${HAN}]\\s[A-Za-z0-9{]|[A-Za-z0-9}%]\\s[${HAN}]`).test(text)) f.push(`${k}: Leerzeichen zwischen Han und Latein`);
  if (/\d\s%/.test(text)) f.push(`${k}: Leerzeichen vor dem Prozentzeichen`);
  if (/\d,\d/.test(text)) f.push(`${k}: deutsches Dezimalkomma — Zahlen bleiben westlich (§5)`);
  return f;
}

const arg = process.argv[2];
const neu = arg && arg !== "--check" ? JSON.parse(readFileSync(resolve(ROOT, arg), "utf8")) : {};

const alle = { ...zh, ...neu };
const fehler = Object.entries(alle).flatMap(([k, v]) => pruefe(k, v));
const schonDa = Object.keys(neu).filter((k) => k in zh);

for (const f of fehler) console.log("FEHLER " + f);
for (const k of schonDa) console.log("HINWEIS bereits vorhanden, wird ersetzt: " + k);
if (fehler.length) process.exit(1);

const sortiert = Object.keys(de).filter((k) => k in alle);
console.log(`zhHans.js: ${Object.keys(zh).length} + ${Object.keys(neu).length - schonDa.length} neu = ${sortiert.length} von ${Object.keys(de).length}`);
console.log(`  fehlen noch: ${Object.keys(de).length - sortiert.length}`);
if (arg === "--check") process.exit(0);

const esc = (s) => JSON.stringify(s);
const kopf = `/* ============================================================
   KATALOG VEREINFACHTES CHINESISCH — angemeldet, noch nicht vollstaendig (\`ready: false\`).

   AUS DEM DEUTSCHEN uebersetzt, nicht ueber das Englische: eine Uebersetzung der Uebersetzung
   erbt deren Entscheidungen. Die ersten 111 Schluessel kamen aus der Muster-Lieferung
   (docs/workstreams/zh-hans/zh-hans-sample/sample-order.csv, erzeugt von
   scripts/zh-sample-fixture.mjs); alles Weitere wird hier gepflegt. Der Katalog ist ab dann die
   Quelle, die CSV die erzeugte Ansicht — wie bei de, en und es.

   Satzregeln: Vollbreiten-Satzzeichen, kein Leerzeichen zwischen Han und Latein oder Ziffern,
   westliche Ziffern, Prozent ohne Leerzeichen, Ecken-Anfuehrungszeichen. Geprueft von
   scripts/zh-add.mjs, das auch der einzige Schreiber dieser Datei ist.

   Terminologie: docs/workstreams/zh-hans/zh-hans-sample/lieferung.md §2. Arbeitsstand, noch
   nicht extern gegengelesen. Ein deutscher Begriff bildet auf genau einen chinesischen ab.
   ============================================================ */
export default {
`;
writeFileSync(ZIEL, kopf + sortiert.map((k) => `  ${esc(k)}: ${esc(alle[k])},`).join("\n") + "\n};\n", "utf8");
console.log("  geschrieben: src/i18n/zhHans.js");
