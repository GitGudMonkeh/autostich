import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
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
