#!/usr/bin/env node
/* Leitet aus der gelieferten Muster-CSV das zh-Hans-Fixture ab.
   115 von 2.639 Schluesseln, also KEIN Katalog. Das Fixture existiert, damit die
   Gestaltungsrunde an echtem chinesischem Text entworfen werden kann (Contract, Teil 2).

   Warum erzeugt statt abgetippt: die CSV ist hier die Lieferung und damit die Quelle. Ein von
   Hand gepflegtes Zweitexemplar driftet still von ihr weg — dieselbe Begruendung, aus der im
   Repo sonst umgekehrt der Katalog die Quelle und die CSV die erzeugte Ansicht ist.

   Aufruf:
     node scripts/zh-sample-fixture.mjs                 pruefen und Zusammenfassung ausgeben
     node scripts/zh-sample-fixture.mjs --out <pfad>    Modul schreiben

   Geprueft wird bei jedem Lauf:
     - jeder Fixture-Schluessel existiert im deutschen Katalog
     - die Platzhaltermenge stimmt mit der deutschen Zeile ueberein
     - die Anzahl der **-Marker stimmt mit der deutschen Zeile ueberein */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import de from "../src/i18n/de.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSV = resolve(ROOT, "docs/workstreams/zh-hans/zh-hans-sample/sample-order.csv");

/* Die CSV ist auf d9763883 eingefroren und kennt die Zusammenlegung aus 84c16954 noch nicht.
   Vier ihrer Zeilen sind damit ueberholt; die beiden Nachfolger stehen in lieferung.md §5 und
   werden hier eingesetzt. Bewusst als Tabelle und nicht als Sonderfall im Code: wer die Liste
   liest, sieht sofort, welche vier Zeilen der CSV nicht mehr gelten. */
const UEBERHOLT = new Set([
  "form.hint.pre", "form.hint.within", "form.hint.post",
  "glacierpick.intro.a", "glacierpick.intro.rigid", "glacierpick.intro.b",
]);

/* Seit dem Einfrieren auf d9763883 ersatzlos entfallen. Gemessen: beide wurden in 5c95868d
   („M7 — the statistics screen and the run window, restructured") entfernt, und ihr deutscher
   Text steht in keinem Katalog mehr, ist also nicht umbenannt worden. Ihre Uebersetzung ist
   damit hinfaellig. Bewusst als benannte Liste und nicht als stilles Ueberspringen: genau
   dafuer nennt die Order einen eingefrorenen Quell-Commit. */
const ENTFALLEN = new Set(["stats.desk.readout", "stats.noSkills"]);

/* #zh-hans: die Marke wechselt mit der Sprache (test/i18n-guards.test.js, BRAND). Die Order
   zum Muster sagte noch „Autostich nicht uebersetzen" — das war vor dieser Entscheidung und
   ist damit ueberholt. Ersetzt wird ueber ALLE Werte statt fuer einen Schluessel, damit ein
   spaeter dazukommender String nicht durchrutscht. */
const MARKE_DE = "Autostich";
const MARKE_ZH = "自动墩";
const FREMDE_MARKEN = [MARKE_DE, "Autotrick", "Autobaza"];

const NACHFOLGER = {
  "form.hint": "点击两张卡牌交换位置（1能量） · 阵型只能**在段内**形成（每段{size}张）",
  "glacierpick.intro": "它会冻结在所在的格子上，从此**僵固**（无法再移动），并每轮积累质量，直到碎裂。请在位置和数值之间做出取舍。",
};

/* RFC-4180, alle Felder gequotet, "" als Escape. */
function parseCsv(text) {
  const zeilen = [];
  let feld = "", zeile = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQ = false;
      else feld += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { zeile.push(feld); feld = ""; }
    else if (c === "\n") { zeile.push(feld); zeilen.push(zeile); zeile = []; feld = ""; }
    else if (c !== "\r") feld += c;
  }
  if (feld || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
  return zeilen;
}

const rows = parseCsv(readFileSync(CSV, "utf8"));
const head = rows[0];
const iId = head.indexOf("id"), iDe = head.indexOf("de"), iZh = head.indexOf("zh-Hans");

const fixture = {};
const quelle = {};
for (const r of rows.slice(1)) {
  if (!r[iId] || UEBERHOLT.has(r[iId]) || ENTFALLEN.has(r[iId])) continue;
  if (!r[iZh]) continue;
  fixture[r[iId]] = r[iZh];
  quelle[r[iId]] = r[iDe];
}
for (const [k, v] of Object.entries(NACHFOLGER)) {
  fixture[k] = v;
  quelle[k] = de[k];
}

const mitMarke = [];
for (const [k, v] of Object.entries(fixture)) {
  if (!v.includes(MARKE_DE)) continue;
  fixture[k] = v.replaceAll(MARKE_DE, MARKE_ZH);
  mitMarke.push(k);
}

const PH = /\{(\w+)\}/g;
const mengen = (s) => [...String(s).matchAll(PH)].map((m) => m[0]).sort().join(",");
const fehler = [];
for (const [k, zh] of Object.entries(fixture)) {
  if (!(k in de)) { fehler.push(`${k}: im deutschen Katalog nicht vorhanden`); continue; }
  if (mengen(de[k]) !== mengen(zh)) fehler.push(`${k}: Platzhalter — de [${mengen(de[k])}] vs zh [${mengen(zh)}]`);
  const nDe = (String(de[k]).match(/\*\*/g) || []).length;
  const nZh = (zh.match(/\*\*/g) || []).length;
  if (nDe !== nZh) fehler.push(`${k}: **-Marker — de ${nDe} vs zh ${nZh}`);
  if (zh !== zh.trim()) fehler.push(`${k}: fuehrende oder folgende Leerzeichen`);
  for (const m of FREMDE_MARKEN) {
    if (zh.includes(m)) fehler.push(`${k}: fremder Markenname „${m}" im chinesischen Text`);
  }
}

const keys = Object.keys(fixture);
console.log(`Fixture: ${keys.length} Schluessel`);
console.log(`  aus der CSV uebernommen : ${keys.length - Object.keys(NACHFOLGER).length}`);
console.log(`  ueberholte CSV-Zeilen   : ${UEBERHOLT.size} (ersetzt durch ${Object.keys(NACHFOLGER).length})`);
console.log(`  seit d9763883 entfallen : ${ENTFALLEN.size} — ${[...ENTFALLEN].join(", ")}`);
console.log(`  Marke eingesetzt        : ${mitMarke.length} — ${mitMarke.join(", ") || "keiner"}`);
console.log(`  deutscher Katalog       : ${Object.keys(de).length} Schluessel`);
for (const f of fehler) console.log(`  FEHLER ${f}`);
if (fehler.length) process.exit(1);
console.log("  alle Schluessel vorhanden, Platzhalter und **-Marker stimmen");

const out = process.argv.indexOf("--out");
if (out === -1) process.exit(0);

const ziel = process.argv[out + 1];
if (!ziel) { console.log("  --out braucht einen Pfad"); process.exit(1); }

const esc = (s) => JSON.stringify(s);
const modul = `/* ERZEUGT — nicht von Hand bearbeiten.
   Quelle: docs/workstreams/zh-hans/zh-hans-sample/sample-order.csv
   Neu erzeugen: node scripts/zh-sample-fixture.mjs --out ${ziel.replace(/\\\\/g, "/")}

   ${keys.length} von ${Object.keys(de).length} Schluesseln. Das ist ein FIXTURE, kein Katalog:
   es traegt genau die Strings, an denen die CJK-Typografie entworfen wird. */
export default {
${keys.map((k) => `  ${esc(k)}: ${esc(fixture[k])},`).join("\n")}
};
`;
writeFileSync(resolve(ROOT, ziel), modul, "utf8");
console.log(`  geschrieben: ${ziel}`);
