import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PIXI_DEPS } from "../vite.config.js";

/* #chunks — Wächter für die Pixi-Chunk-Grenze.

   `manualChunks` in vite.config.js leitet Pixi in einen EIGENEN, asynchronen Chunk, damit er nicht auf
   jedem Seitenaufruf mitgeladen wird. Der Zweig dafür war `id.includes("pixi")` — und der fängt nur
   Pixis EIGENE Dateien. Seine Abhängigkeiten heißen nicht „pixi" (@xmldom/xmldom, earcut, tiny-lru …)
   und fielen deshalb in den eager geladenen `vendor`-Chunk: ~78 KB minifiziert lagen auf dem kritischen
   Pfad, obwohl Pixi selbst sauber async war. Aufgefallen ist das erst beim Durchzählen der Chunk-Module,
   weil an der Chunk-GRÖSSE nichts falsch aussah — vendor war halt „React & Co.".

   Die Liste `PIXI_DEPS` ist damit eine Kopie von etwas, das woanders die Wahrheit ist: den `dependencies`
   in pixi.js/package.json. Ein Pixi-Update mit einer neuen Abhängigkeit würde sie still veralten lassen
   und die Bytes wandern wortlos zurück in den kritischen Pfad. Dieser Test hält beide Seiten zusammen.

   Typ-Pakete (@types/*, @webgpu/types) sind ausgenommen: sie stehen zwar in den dependencies, tauchen
   aber in keinem Bundle auf. */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pixiPkg = JSON.parse(readFileSync(resolve(ROOT, "node_modules/pixi.js/package.json"), "utf8"));
const istTypPaket = (name) => name.startsWith("@types/") || name === "@webgpu/types";
const echteDeps = Object.keys(pixiPkg.dependencies || {}).filter((n) => !istTypPaket(n));

describe("Bundle-Splitting · Pixi-Chunk", () => {
  it("PIXI_DEPS kennt jede Laufzeit-Abhängigkeit von pixi.js", () => {
    expect(echteDeps.length).toBeGreaterThan(0);
    const fehlen = echteDeps.filter((n) => !PIXI_DEPS.includes(n));
    expect(
      fehlen,
      `Neue Pixi-Abhängigkeit(en) — ohne Eintrag in PIXI_DEPS (vite.config.js) landen sie im EAGER `
      + `geladenen vendor-Chunk: ${fehlen.join(", ")}`,
    ).toEqual([]);
  });

  it("PIXI_DEPS führt keine Pakete mehr, die pixi.js gar nicht mehr braucht", () => {
    const verwaist = PIXI_DEPS.filter((n) => !echteDeps.includes(n));
    expect(verwaist, `veraltete Einträge in PIXI_DEPS: ${verwaist.join(", ")}`).toEqual([]);
  });

  it("die Einträge sind Paketnamen, keine Pfade oder Muster", () => {
    for (const n of PIXI_DEPS) {
      expect(n).not.toContain("/node_modules");
      expect(n.startsWith("@") ? n.split("/").length : 1).toBeLessThanOrEqual(2);
      expect(n.trim()).toBe(n);
    }
    expect(new Set(PIXI_DEPS).size).toBe(PIXI_DEPS.length); // keine Doppelten
  });

  it("`pixi.js` selbst braucht keinen Eintrag — den fängt der Namens-Zweig", () => {
    // Doku im Test: wer „pixi.js" hier einträgt, hat den Zweig darüber missverstanden.
    expect(PIXI_DEPS).not.toContain("pixi.js");
  });
});

/* #quellen — welche Dateien Tailwind nach Klassennamen durchsucht.

   Ohne Angabe sucht Tailwind 4 im GANZEN Projekt, `docs/` eingeschlossen. Dort stehen Klassennamen
   als Prosa — der historische Log zitiert sie, Berichte führen sie in Tabellen — und daraus wurden
   echte Regeln im ausgelieferten Stylesheet (gemessen 22.08.2026: zwölf Selektoren, zwei davon mit
   ungültigen Werten aus Platzhaltern). `source(none)` schaltet die automatische Suche ab, die
   `@source`-Zeilen nennen die zwei Orte, die die Anwendung ausmachen.

   Der Wächter RECHNET, statt Schreibweisen zu vergleichen: er löst jeden genannten Pfad auf und
   prüft, ob es ihn gibt. Ein Tippfehler in einer `@source`-Zeile ist die teuerste Art, das kaputt
   zu machen — Tailwind durchsucht dann nichts, das Stylesheet kommt fast leer heraus, und das fällt
   ohne diesen Test erst am fertigen Build auf. */
describe("#quellen · Tailwind durchsucht nur die Anwendung", () => {
  const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), "../src/index.css");
  const css = readFileSync(cssPath, "utf8");

  it("die automatische Projektsuche ist abgeschaltet", () => {
    expect(css, "ohne `source(none)` durchsucht Tailwind wieder docs/ und kompiliert Prosa mit")
      .toMatch(/@import\s+"tailwindcss"\s+source\(none\)\s*;/);
  });

  it("jeder genannte Pfad existiert", () => {
    const paths = [...css.matchAll(/@source\s+"([^"]+)"\s*;/g)].map((m) => m[1]);
    expect(paths.length, "keine @source-Zeile — mit source(none) bliebe das Stylesheet leer")
      .toBeGreaterThan(0);
    for (const p of paths) {
      const abs = resolve(dirname(cssPath), p);
      expect(existsSync(abs), `@source "${p}" zeigt auf nichts (${abs})`).toBe(true);
    }
  });

  it("die Anwendung ist vollständig erfasst: Einstiegsseite UND Quelltext", () => {
    const roots = [...css.matchAll(/@source\s+"([^"]+)"\s*;/g)]
      .map((m) => resolve(dirname(cssPath), m[1]));
    const repo = resolve(dirname(cssPath), "..");
    for (const must of ["index.html", "src"]) {
      expect(roots, `${must} wird nicht durchsucht — dort stehende Klassen fehlten im CSS`)
        .toContain(resolve(repo, must));
    }
  });
});
