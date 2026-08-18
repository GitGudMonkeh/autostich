import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { transform } from "lightningcss";

/* Wächter für #overlay-portal — die Naht, an der derselbe Fehler jetzt dreimal aufgetreten ist.

   Der Fehler: `backdrop-filter` macht ein Element zum CONTAINING BLOCK für `position: fixed`-Nachfahren. Ist so
   ein Element zugleich der Scroll-Container (was bei den Vollbild-Bildschirmen dieses Projekts der Normalfall
   ist), dann hängt ein darin gerendertes Overlay nicht mehr am Viewport, sondern am Scroll-Ursprung: es erscheint
   exakt `scrollTop` Pixel zu hoch und bleibt dort stehen. Am Gerät gemessen (Chromium, echtes Stylesheet):
   scrollTop 600 → Overlay `top` = −600 px; mit Portal an `document.body` → 0 px.

   Warum ein Test und nicht „einmal aufräumen": das Symptom ist NICHT sichtbar, solange niemand vorher scrollt.
   Ein neues Overlay in einem scrollenden Bildschirm sieht in jeder Entwickler-Prüfung richtig aus und bricht
   erst beim Spieler, der weit genug nach unten gewischt hat. Genau so ist es hier gelaufen.

   Der Test prüft ZWEI unabhängige Bedingungen, weil beide je für sich den Fehler auslösen bzw. verdecken:
     1. Verschachtelte Vollbild-Overlays gehen durch ein Portal.
     2. Der zentrale Blur-Deckel (#perf-C) überlebt den Minifier — er war es, der den Fehler auf Mobile überhaupt
        erst hat auftreten lassen, obwohl der Quelltext ihn abschaltete. */

const uiDir = fileURLToPath(new URL("../src/ui/", import.meta.url));
const cssPath = fileURLToPath(new URL("../src/index.css", import.meta.url));

// Alle .jsx unter src/ui (eine Ebene Unterordner reicht — tiefer liegt heute nichts).
function uiFiles(dir = uiDir, prefix = "") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? uiFiles(dir + e.name + "/", prefix + e.name + "/")
      : e.name.endsWith(".jsx") ? [{ name: prefix + e.name, src: readFileSync(dir + e.name, "utf8") }] : []);
}
const FILES = uiFiles();

/* Vollbild-Overlay = exportierte Komponente, deren Rumpf ein className-Literal mit „fixed inset-0" enthält.
   Bewusst dateiweit/textuell statt über eine JSX-Analyse: die Wurzeln stehen mal als String, mal als Template
   mit `${…}`-Zweig (StatsScreen) — ein Parser dafür wäre spröder als das, was er absichern soll. */
const OVERLAYS = new Map();
for (const { name, src } of FILES) {
  for (const m of src.matchAll(/export function ([A-Z]\w+)/g)) {
    const next = src.indexOf("\nexport ", m.index + 1);
    const body = src.slice(m.index, next > 0 ? next : src.length);
    if (/["`]fixed inset-0/.test(body)) OVERLAYS.set(m[1], { file: name, body });
  }
}

/* „Gefährlicher Wirt" = Datei, die ein Vollbild-Overlay rendert UND einen eigenen Scroller UND einen Blur trägt.
   Konservativ dateiweit geprüft: es kann ein Wirt dabei sein, dessen Scroller gar nicht die Wurzel ist. Das ist
   die richtige Richtung des Irrtums — ein Portal ist für ein verschachteltes Vollbild-Overlay immer korrekt. */
const HOSTS = FILES.filter((f) => f.src.includes("fixed inset-0")
  && /overflow-(y-)?auto/.test(f.src) && f.src.includes("backdropFilter"));

// Kanten Wirt → verschachteltes Overlay. `return <X …>` ist ERSATZ des eigenen Baums, keine Verschachtelung.
const EDGES = [];
for (const host of HOSTS) {
  for (const [name, ov] of OVERLAYS) {
    if (ov.file === host.name) continue;
    for (const m of host.src.matchAll(new RegExp(`<${name}[\\s/>]`, "g"))) {
      if (/return\s*$/.test(host.src.slice(Math.max(0, m.index - 10), m.index))) continue;
      EDGES.push({ host: host.name, child: name, portals: ov.body.includes("createPortal") });
      break;
    }
  }
}

describe("#overlay-portal · verschachtelte Vollbild-Overlays", () => {
  it("findet die Naht überhaupt — sonst wäre der Test still grün", () => {
    /* Die wichtigste Zusicherung des ganzen Tests. Die Erkennung oben ist textuell; bricht sie (umbenannte
       Klasse, anderer Export-Stil), fände sie NULL Kanten und meldete fröhlich „alles in Ordnung". Deshalb hier
       die bekannten Kanten namentlich: verschwindet eine, ist entweder der Aufrufer weg oder die Erkennung kaputt
       — beides will man sehen. */
    expect(OVERLAYS.size).toBeGreaterThan(10);
    const paare = EDGES.map((e) => `${e.host} -> ${e.child}`);
    expect(paare).toContain("StatsScreen.jsx -> RunDetail");
    expect(paare).toContain("UpgradeScreen.jsx -> GuideOverlay");
  });

  it("rendert JEDES verschachtelte Overlay durch ein Portal", () => {
    const fehlt = EDGES.filter((e) => !e.portals).map((e) => `${e.host} -> ${e.child}`);
    expect(fehlt, `ohne createPortal: ${fehlt.join(", ")}`).toEqual([]);
  });

  it("portalt an document.body — nicht in einen anderen Teilbaum", () => {
    // `.app-root` wäre naheliegend, ist aber unnötig: --deck-a1/a2 werden für genau diesen Fall zusätzlich auf
    // `:root` gespiegelt (App.jsx). Ein Portal in einen anderen Screen-Teilbaum brächte das Problem zurück.
    for (const name of new Set(EDGES.map((e) => e.child))) {
      expect(OVERLAYS.get(name).body, `${name} portalt nicht an document.body`).toMatch(/createPortal\([\s\S]*document\.body\)/);
    }
  });
});

describe("#perf-C · der Blur-Deckel muss den Minifier überleben", () => {
  const css = readFileSync(cssPath, "utf8");

  it("schreibt in jedem Paar das -webkit-Präfix ZUERST und den Standard zuletzt", () => {
    /* lightningcss behandelt beide als DIESELBE Eigenschaft und behält nur die LETZTE Deklaration. Stand der
       Standard zuerst (so war es bis 18.08.2026), fiel er beim Minifizieren heraus — und ein wichtiges
       `-webkit-backdrop-filter` überschreibt in Blink ein INLINE gesetztes `backdrop-filter` nicht. Ergebnis:
       eine Regel, die im Quelltext korrekt aussieht und im Build nichts tut. */
    const falsch = [...css.matchAll(/backdrop-filter:\s*([^;]+);\s*-webkit-backdrop-filter:/g)];
    expect(falsch.map((m) => m[1].trim()), "Standard steht vor dem Präfix → wird wegminifiziert").toEqual([]);
  });

  it("liefert nach echter Minifizierung die UNPRÄFIXIERTE Form — nur die wirkt gegen den inline-Blur", () => {
    /* Kein Textvergleich, sondern der echte Werkzeugweg: die Regel so durch lightningcss schicken, wie der Build
       es tut. Damit hängt der Test an der Wirkung, nicht an der Schreibweise. */
    const regel = css.match(/@media \(pointer: coarse\) \{[\s\S]*?\n\}/);
    expect(regel, "die (pointer: coarse)-Regel ist nicht mehr auffindbar").not.toBeNull();
    const out = transform({ filename: "t.css", code: Buffer.from(regel[0]), minify: true }).code.toString();
    expect(out).toMatch(/(^|[;{])backdrop-filter:\s*none\s*!important/);
  });

  it("deckt alle drei Overlay-Ebenen ab (fixed, absolute, StatusBar)", () => {
    const regel = css.match(/@media \(pointer: coarse\) \{[\s\S]*?\n\}/)[0];
    for (const sel of [".fixed.inset-0", ".absolute.inset-0", ".as-statusbar"]) expect(regel).toContain(sel);
  });
});
