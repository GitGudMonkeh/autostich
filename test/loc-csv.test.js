import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import CAT_DE from "../src/i18n/de.js";
import CAT_EN from "../src/i18n/en.js";

/* #sprache — Ratsche für die ERZEUGTE Übersetzer-CSV.

   `docs/localization/strings_de_pixi_2026-08-15.csv` ist laut Doku eine erzeugte ANSICHT des
   i18n-Katalogs (`npm run loc:export`), kein zweiter handgepflegter Textbestand. Genau deshalb
   fällt es niemandem auf, wenn der Export nach einer Textänderung nicht mehr läuft: Build, Lint
   und die i18n-Wächter prüfen alle nur Code gegen Code — die CSV steht daneben und veraltet still.
   Beim Health Check am 18.08.2026 lag sie 141 Zeilen hinter dem Katalog zurück (u. a. der komplette
   Block `bf.bd.*` der Stich-Aufschlüsselung und der neu formulierte `board.locked`-Text).

   Dieser Test vergleicht die CSV-Zeilen der Kategorie „i18n" gegen den Katalog — Schlüssel und
   Wortlaut, in beide Richtungen. Wird er rot: `npm run loc:export` laufen lassen und die CSV
   mitcommitten. Nie von Hand nachtragen; die Quelle ist immer der Code. */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSV = resolve(ROOT, "docs/localization/strings_de_pixi_2026-08-15.csv");

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

const raw = parseCsv(readFileSync(CSV, "utf8"));
const head = raw[0];
const csvRows = raw.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
const csvI18n = new Map(csvRows.filter((r) => r.category === "i18n").map((r) => [r.id, r]));

// Der Export überspringt leere Texte — dieselbe Regel hier, sonst meldet der Test Geister.
const catKeys = Object.keys(CAT_DE).filter((k) => String(CAT_DE[k] ?? "").trim());

describe("Loc-CSV · erzeugte Ansicht deckt sich mit dem Katalog", () => {
  it("die CSV ist überhaupt lesbar und hat das erwartete Schema", () => {
    expect(head).toEqual(["id", "category", "de", "en", "context", "limit", "status", "note"]);
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

  it("deutsche und englische Spalte geben den Katalogtext wortgleich wieder", () => {
    const drift = [];
    for (const k of catKeys) {
      const r = csvI18n.get(k);
      if (!r) continue; // vom Schlüssel-Test oben abgedeckt
      const de = String(CAT_DE[k] ?? "").trim();
      const en = String(CAT_EN[k] ?? "").trim();
      if (r.de !== de) drift.push(`${k} (de)`);
      if (r.en !== en) drift.push(`${k} (en)`);
    }
    expect(drift.slice(0, 20), `${drift.length} Texte weichen ab — \`npm run loc:export\` laufen lassen`).toEqual([]);
  });

  it("der Status-Marker folgt der englischen Spalte", () => {
    const falsch = [...csvI18n.values()].filter((r) => r.status !== (r.en ? "done" : "new"));
    expect(falsch.map((r) => r.id).slice(0, 20)).toEqual([]);
  });
});
