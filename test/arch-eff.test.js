import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { setLocale, t, READY_LOCALE_IDS } from "../src/i18n/index.js";
// exp: English is inactive on the playground (LOCALES in index.js) — the English render-checks sleep until it is ready again.
const EN_OFF = !READY_LOCALE_IDS.includes("en");
import { architectEffectStrings } from "../src/ui/archEffects.js";

/* ============================================================
   #arch-eff (19.08.2026) — die Effektzeile unter jedem Gebäude, migriert.

   Sie erscheint an VIER Stellen (Aufstellungsphase, Chronik, Endscreen, Level-up-Flügel) und baute ihre
   zehn Sätze bis hierher aus deutschen Vorlagen zusammen. Im englischen Build stand dort also Deutsch —
   und die i18n-Ratsche konnte es nicht sehen: ihr Greifer fischt JSX-Textknoten und Text-Props, keine
   Template-Literale in einer Hilfsdatei (dieselbe Lücke wie bei #formlegend).

   Diese Ratsche prüft deshalb die AUSGABE in beiden Sprachen, nicht nur die Schreibweise im Quelltext.
   ============================================================ */

const src = readFileSync(new URL("../src/ui/archEffects.js", import.meta.url), "utf8");
// Ein Precompute-Stummel: nur die Felder, die die Formatierung liest.
const pre = (score, extra = {}) => ({ value: [], score: { 0: score }, ...extra });

describe("#arch-eff — jede Effektart kommt aus dem Katalog", () => {
  it("die zehn Sätze stehen in BEIDEN Katalogen", () => {
    const keys = ["value", "score", "scoreMult", "streak", "crit", "color", "milestone", "gamble", "relay", "struct"];
    for (const k of keys) {
      expect(src, `arch.eff.${k} wird nicht benutzt`).toMatch(new RegExp(`t\\("arch\\.eff\\.${k}"`));
      for (const cat of ["src/i18n/de.js", "src/i18n/en.js"]) {
        const s = readFileSync(new URL(`../${cat}`, import.meta.url), "utf8");
        expect(s, `arch.eff.${k} fehlt in ${cat}`).toMatch(new RegExp(`"arch\\.eff\\.${k}":`));
      }
    }
  });

  it("keine deutsche Vorlage mehr im Quelltext", () => {
    /* Gegen den KOMMENTARFREIEN Quelltext: der Dateikopf nennt die alten Vorlagen absichtlich beim Namen,
       damit man sieht, was hier einmal stand (derselbe Fallstrick wie beim `as-ring`-Zähler, #fx-panel). */
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const wort of ["Stichwert", "Score", "Serienpunkt", "Struktur", "Staffel", "Siege"])
      expect(code, `„${wort}" steht noch fest verdrahtet im Code`).not.toMatch(new RegExp(wort));
  });

  it.skipIf(EN_OFF)("die Ausgabe wechselt wirklich die Sprache", () => {
    /* Der eigentliche Beweis: dieselbe Rechnung, zwei Sprachen, zwei verschiedene Sätze. */
    const zeile = () => architectEffectStrings(pre({ kind: "streak", amount: 7 }), 0, null)[0];
    setLocale("de");
    const de = zeile();
    setLocale("en");
    const en = zeile();
    expect(de).toBe(t("arch.eff.streak", { n: 7 }, "de"));
    expect(en, "englisch kommt derselbe deutsche Satz zurück").not.toBe(de);
    expect(en).toMatch(/streak point/);
    setLocale("de");
  });

  it.skipIf(EN_OFF)("das Dezimalzeichen folgt der Sprache, die zwei Nachkommastellen bleiben", () => {
    /* `fmt` hing an einem hart gesetzten Komma (`replace(".", ",")`) — im englischen Build also ein
       deutsches Dezimalzeichen. Und `fmtNum` allein kürzt die Null weg: aus ×1,40 würde ×1,4 und die
       Faktoren lesen sich nicht mehr als Reihe. Beides muss zusammen stimmen. */
    const zeile = () => architectEffectStrings(pre({ kind: "mult", factor: 1.4 }), 0, null)[0];
    setLocale("de");
    expect(zeile()).toMatch(/1,40/);
    setLocale("en");
    expect(zeile()).toMatch(/1\.40/);
    setLocale("de");
  });

  it("der Wortlaut ist aus dem bestehenden Block übernommen, nicht neu erfunden", () => {
    /* Derselbe Effekt darf nicht zweimal verschieden heißen: „Stichwert"/„trick value" und
       „Serienpunkt"/„streak point" stehen so schon im `building.eff.*`-Block, „Struktur"/„structure"
       in `arch.cell.struct`. */
    const de = readFileSync(new URL("../src/i18n/de.js", import.meta.url), "utf8");
    const en = readFileSync(new URL("../src/i18n/en.js", import.meta.url), "utf8");
    expect(de).toMatch(/"arch\.eff\.value": "\+\{n\} Stichwert"/);
    expect(en).toMatch(/"arch\.eff\.value": "\+\{n\} trick value"/);
    expect(en).toMatch(/"arch\.eff\.streak": "\+\{n\} score per streak point"/);
    expect(en).toMatch(/"arch\.eff\.struct": "Structure ×\{f\}"/);
  });
});
