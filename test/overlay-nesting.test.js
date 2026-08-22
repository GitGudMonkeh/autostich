import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { transform } from "lightningcss";
import { DT } from "./desktopBreakpoint.js";

/* Wächter für #overlay-portal — die Naht, an der derselbe Fehler dreimal aufgetreten ist.

   Der Fehler: `backdrop-filter` (ebenso `filter`, `transform`, `perspective`, `contain`, `will-change` darauf)
   macht ein Element zum CONTAINING BLOCK für `position: fixed`-Nachfahren. Ist so ein Element zugleich der
   Scroll-Container — bei den Vollbild-Bildschirmen hier der Normalfall — hängt ein darin gerendertes Overlay am
   Scroll-Ursprung statt am Viewport: es erscheint exakt `scrollTop` Pixel zu hoch und bleibt dort stehen. Am
   Gerät gemessen (Chromium, echtes Stylesheet): scrollTop 600 → `top` = −600 px; mit Portal → 0 px.

   Warum die Regel AUSNAHMSLOS gilt und nicht nur dort, wo heute ein Vorfahre blurrt: der Auslöser steht nicht im
   Overlay, sondern in einem Vorfahren. Es reicht, dass irgendwann jemand einem Bildschirm einen Blur oder ein
   `transform` gibt — und ein Overlay drei Ebenen tiefer bricht, ohne dass jemand es beim Ändern sehen könnte.
   Dazu kommt: das Symptom braucht eine Scroll-Position. Wer das Overlay einbaut und prüft, sieht es korrekt.

   Geprüft werden ZWEI unabhängige Bedingungen — jede kann den Fehler für sich auslösen bzw. verdecken:
     1. JEDES `fixed inset-0`-Element geht durch ein Portal an `document.body`.
     2. Der zentrale Blur-Deckel (#perf-C) überlebt den Minifier — er war es, der den Fehler auf Mobile überhaupt
        erst auftreten ließ, obwohl der Quelltext ihn abschaltete. */

const srcDir = fileURLToPath(new URL("../src/", import.meta.url));
const cssPath = fileURLToPath(new URL("../src/index.css", import.meta.url));

function jsxFiles(dir = srcDir, prefix = "") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? jsxFiles(dir + e.name + "/", prefix + e.name + "/")
      : e.name.endsWith(".jsx") ? [{ name: prefix + e.name, src: readFileSync(dir + e.name, "utf8") }] : []);
}

/* Die eine begründete Ausnahme. Sie steht als Liste da und nicht als Sonderzweig im Code, damit sie sichtbar
   bleibt — und der Test verlangt unten, dass es sie noch GIBT: eine verwaiste Ausnahme ist genauso ein Fehler
   wie eine fehlende, sie würde die Regel still aufweichen. */
const AUSNAHMEN = [{
  datei: "ui/CustomizeScreen.jsx",
  bei: "fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto",
  grund: "PackDetail rendert dieselbe Komponente ab 1280 px `inline` als Spalte IM Raster der Werkstatt; nur die "
       + "Overlay-Fassung portalt (`return inline ? node : overlayPortal(node)` am Ende der Komponente).",
}, {
  datei: "ui/StartScreen.jsx",
  bei: `as-hub-bg ${DT}hidden pointer-events-none fixed inset-0`,
  grund: "KEIN Overlay, sondern die Deck-Hintergrundebene des Hubs (#deck-mobil): `pointer-events: none`, liegt "
       + "HINTER dem Inhalt und ist nur deshalb `fixed`, weil der Hub in einem gedeckelten Container sitzt. Ein "
       + "Portal an document.body würde sie hinter allem hervor nach VORN holen — genau falsch herum.",
}];

/* Jede Fundstelle + ob unmittelbar davor ein Portal steht. Der Greifer sucht „fixed inset-0" IRGENDWO im
   Klassen-Literal, nicht nur am Anfang: die erste Fassung dieses Tests verlangte den Anfang und übersah dadurch
   die Hub-Hintergrundebene komplett (`class="as-hub-bg … fixed inset-0"`). Aufgefallen ist das nicht am Test,
   sondern erst beim Durchklicken der gebauten App — ein Wächter, der die Hälfte nicht sieht, ist keiner. */
const STELLEN = [];
for (const { name, src } of jsxFiles()) {
  for (const m of src.matchAll(/["`][^"`]*\bfixed inset-0[^"`]*/g)) {
    const fenster = src.slice(Math.max(0, m.index - 260), m.index);
    STELLEN.push({
      datei: name,
      zeile: src.slice(0, m.index).split("\n").length,
      klassen: m[0].slice(1),
      portal: fenster.includes("overlayPortal(") || fenster.includes("createPortal("),
    });
  }
}
const istAusnahme = (s) => AUSNAHMEN.some((a) => a.datei === s.datei && s.klassen.startsWith(a.bei));

describe("#overlay-portal · jedes Vollbild-Overlay hängt an document.body", () => {
  it("findet die Overlays überhaupt — sonst wäre der Test still grün", () => {
    /* Die wichtigste Zusicherung des ganzen Tests. Die Erkennung ist textuell; bricht sie (andere Utility-Klasse,
       anderer Schreibstil), fände sie NULL Stellen und meldete fröhlich „alles in Ordnung". */
    expect(STELLEN.length).toBeGreaterThan(20);
    expect(new Set(STELLEN.map((s) => s.datei)).size).toBeGreaterThan(15);
  });

  it("rendert jedes davon durch ein Portal", () => {
    const fehlt = STELLEN.filter((s) => !s.portal && !istAusnahme(s)).map((s) => `${s.datei}:${s.zeile}`);
    expect(fehlt, `ohne overlayPortal(): ${fehlt.join(", ")}`).toEqual([]);
  });

  it("hält die Ausnahmeliste ehrlich — jede Ausnahme muss es noch geben", () => {
    for (const a of AUSNAHMEN) {
      const treffer = STELLEN.filter((s) => s.datei === a.datei && s.klassen.startsWith(a.bei));
      expect(treffer.length, `verwaiste Ausnahme (${a.datei}) — bitte streichen`).toBe(1);
      expect(treffer[0].portal, `${a.datei} portalt inzwischen doch — Ausnahme streichen`).toBe(false);
    }
  });

  it("benutzt den geteilten Helfer statt überall eigenes createPortal", () => {
    // Eine Quelle für die Begründung: overlayPortal.jsx. Wer direkt createPortal nimmt, umgeht sie.
    const eigene = jsxFiles().filter((f) => f.src.includes("createPortal") && !f.name.endsWith("overlayPortal.jsx"));
    expect(eigene.map((f) => f.name)).toEqual([]);
  });
});

describe("#perf-C · der Blur-Deckel muss den Minifier überleben", () => {
  const css = readFileSync(cssPath, "utf8");
  const coarse = () => css.match(/@media \(pointer: coarse\) \{[\s\S]*?\n\}/);

  it("schreibt in jedem Paar das -webkit-Präfix ZUERST und den Standard zuletzt", () => {
    /* lightningcss behandelt beide als DIESELBE Eigenschaft und behält nur die LETZTE Deklaration. Stand der
       Standard zuerst (so war es bis 18.08.2026), fiel er beim Minifizieren heraus — und ein wichtiges
       `-webkit-backdrop-filter` überschreibt in Blink ein INLINE gesetztes `backdrop-filter` nicht. Ergebnis:
       eine Regel, die im Quelltext korrekt aussieht und im Build nichts tut. */
    const falsch = [...css.matchAll(/backdrop-filter:\s*([^;]+);\s*-webkit-backdrop-filter:/g)];
    expect(falsch.map((m) => m[1].trim()), "Standard steht vor dem Präfix → wird wegminifiziert").toEqual([]);
  });

  it("liefert nach echter Minifizierung die UNPRÄFIXIERTE Form — nur die wirkt gegen den inline-Blur", () => {
    // Kein Textvergleich, sondern der echte Werkzeugweg: die Regel so durch lightningcss schicken wie der Build.
    expect(coarse(), "die (pointer: coarse)-Regel ist nicht mehr auffindbar").not.toBeNull();
    const out = transform({ filename: "t.css", code: Buffer.from(coarse()[0]), minify: true }).code.toString();
    expect(out).toMatch(/(^|[;{])backdrop-filter:\s*none\s*!important/);
  });

  it("deckt alle drei Overlay-Ebenen ab (fixed, absolute, StatusBar)", () => {
    for (const sel of [".fixed.inset-0", ".absolute.inset-0", ".as-statusbar"]) expect(coarse()[0]).toContain(sel);
  });
});
