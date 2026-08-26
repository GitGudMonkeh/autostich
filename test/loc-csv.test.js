import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { LOCALE_IDS, SOURCE_LOCALE, catalog } from "../src/i18n/index.js";

/* #sprache — Ratsche für die ERZEUGTE Übersetzer-CSV.

   `docs/localization/strings_de_pixi_2026-08-15.csv` ist laut Doku eine erzeugte ANSICHT des
   i18n-Katalogs (`npm run loc:export`), kein zweiter handgepflegter Textbestand. Genau deshalb
   fällt es niemandem auf, wenn der Export nach einer Textänderung nicht mehr läuft: Build, Lint
   und die i18n-Wächter prüfen alle nur Code gegen Code — die CSV steht daneben und veraltet still.
   Beim Health Check am 18.08.2026 lag sie 141 Zeilen hinter dem Katalog zurück (u. a. der komplette
   Block `bf.bd.*` der Stich-Aufschlüsselung und der neu formulierte `board.locked`-Text).

   Dieser Test vergleicht die CSV-Zeilen der Kategorie „i18n" gegen den Katalog — Schlüssel und
   Wortlaut, in beide Richtungen. Wird er rot: `npm run loc:export` laufen lassen und die CSV
   mitcommitten. Nie von Hand nachtragen; die Quelle ist immer der Code.

   #es-locale: seit dem 26.08.2026 gibt es EINE Datei je Zielsprache, und dieser Test läuft über
   alle. Sonst wäre die spanische Lieferung genau das, wovor der Absatz oben warnt: eine Datei, die
   neben dem Katalog steht und still veraltet — und zwar die eine, an der ein externer Übersetzer
   wochenlang arbeitet. Die Zielspalte heißt wie die Sprach-ID; für `en` ergibt das exakt das
   bisherige Schema. */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CAT = Object.fromEntries(LOCALE_IDS.map((id) => [id, catalog(id)]));
const CAT_DE = CAT[SOURCE_LOCALE];
const TARGETS = LOCALE_IDS.filter((id) => id !== SOURCE_LOCALE);
const csvName = (loc) => loc === "en" ? "strings_de_pixi_2026-08-15.csv" : `strings_${loc}.csv`;
const headFor = (loc) => loc === "en"
  ? ["id", "category", "de", "en", "context", "limit", "status", "note"]
  : ["id", "category", "de", loc, "en_ref", "context", "limit", "status", "note"];

/* Minimaler RFC-4180-Leser: alle Felder sind gequotet, `"` steht verdoppelt, Zeilenende ist CRLF.
   Ein Feld darf Kommas und Zeilenumbrüche enthalten — deshalb Zustandsautomat statt split(). */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") { /* CRLF: das \n schließt die Zeile */ }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Der Export überspringt leere Texte — dieselbe Regel hier, sonst meldet der Test Geister.
const catKeys = Object.keys(CAT_DE).filter((k) => String(CAT_DE[k] ?? "").trim());

const gelesen = Object.fromEntries(TARGETS.map((loc) => {
  const raw = parseCsv(readFileSync(resolve(ROOT, "docs/localization", csvName(loc)), "utf8"));
  const head = raw[0];
  const rows = raw.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
  return [loc, { head, i18n: new Map(rows.filter((r) => r.category === "i18n").map((r) => [r.id, r])) }];
}));

describe.each(TARGETS)("Loc-CSV · %s — erzeugte Ansicht deckt sich mit dem Katalog", (loc) => {
  const { head, i18n: csvI18n } = gelesen[loc];

  it("die CSV ist überhaupt lesbar und hat das erwartete Schema", () => {
    expect(head).toEqual(headFor(loc));
    expect(csvI18n.size).toBeGreaterThan(1000);
  });

  it("jeder Katalogschlüssel steht in der CSV", () => {
    const fehlen = catKeys.filter((k) => !csvI18n.has(k));
    expect(fehlen, `${fehlen.length} Schlüssel fehlen in der CSV — \`npm run loc:export\` laufen lassen`).toEqual([]);
  });

  it("die CSV führt keine Schlüssel, die es im Katalog nicht mehr gibt", () => {
    const verwaist = [...csvI18n.keys()].filter((k) => !catKeys.includes(k));
    expect(verwaist, `${verwaist.length} verwaiste CSV-Zeilen — \`npm run loc:export\` laufen lassen`).toEqual([]);
  });

  it("Quell- und Zielspalte geben den Katalogtext wortgleich wieder", () => {
    const drift = [];
    for (const k of catKeys) {
      const r = csvI18n.get(k);
      if (!r) continue; // vom Schlüssel-Test oben abgedeckt
      if (r.de !== String(CAT_DE[k] ?? "").trim()) drift.push(`${k} (${SOURCE_LOCALE})`);
      if (r[loc] !== String(CAT[loc][k] ?? "").trim()) drift.push(`${k} (${loc})`);
    }
    expect(drift.slice(0, 20), `${drift.length} Texte weichen ab — \`npm run loc:export\` laufen lassen`).toEqual([]);
  });

  it("der Status-Marker folgt der Zielspalte", () => {
    const falsch = [...csvI18n.values()].filter((r) => r.status !== (r[loc] ? "done" : "new"));
    expect(falsch.map((r) => r.id).slice(0, 20)).toEqual([]);
  });
});

/* Die Längenschranken (H3). Bis 26.08.2026 war die Spalte in allen 2800 Zeilen leer, während das
   Übersetzerpaket 290 gefüllte versprach — ein Versprechen, das den Übersetzer korrekten Text
   liefern lässt, der abgeschnitten wird. Dieser Test hält fest, dass sie überhaupt gefüllt IST,
   und dass die harte Schranke der Formations-Kürzel darin auftaucht. */
describe("Loc-CSV · Längenschranken", () => {
  it("die Spalte `limit` ist gefüllt, und die harte Schranke steht drin", () => {
    for (const loc of TARGETS) {
      const rows = [...gelesen[loc].i18n.values()];
      const mit = rows.filter((r) => r.limit);
      expect(mit.length, `${loc}: keine einzige Längenschranke in der Lieferung`).toBeGreaterThan(0);
      const abbr = rows.filter((r) => /^formation\..+\.abbr$/.test(r.id));
      expect(abbr.length, "keine Formations-Kürzel in der CSV").toBeGreaterThan(0);
      for (const r of abbr) expect(r.limit, `${r.id} (${loc}) muss die harte Schranke 1 tragen`).toBe("1");
    }
  });

  /* Eine Schranke, die der heutige Bestand selbst verletzt, ist falsch gemessen — und würde einen
     Übersetzer zu etwas zwingen, was nicht einmal das Original einhält. */
  it("keine Schranke ist enger als der bestehende Text, den sie beschreibt", () => {
    const bad = [];
    for (const loc of TARGETS) {
      for (const r of gelesen[loc].i18n.values()) {
        if (!r.limit) continue;
        const n = Number(r.limit);
        for (const spalte of [SOURCE_LOCALE, ...(r[loc] ? [loc] : [])]) {
          const text = spalte === SOURCE_LOCALE ? r.de : r[loc];
          if ([...text].length > n) bad.push(`${r.id} (${spalte}): „${text}" > limit ${n}`);
        }
      }
    }
    expect(bad, `Schranke enger als der vorhandene Text:\n  ${bad.join("\n  ")}`).toEqual([]);
  });
});
