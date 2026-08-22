import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { GLOSSARY_CATEGORIES } from "../src/game/glossary.js";
import de from "../src/i18n/de.js";
import en from "../src/i18n/en.js";
import { DESKTOP_BLOCK_AT } from "./desktopBreakpoint.js";

/* ============================================================
   #glossar-desktop — Glossar als gerahmter Screen ab 1280 px, als Quelltext-Ratsche.

   Geprüft wird die NAHT über drei Dateien, keine Optik. Der Screen hat wie der Leitfaden KEINEN
   eigenen Renderpfad: `Glossary.jsx` setzt dieselben Klammern (`gl-desk` / `gl-page` / `gl-body` /
   `gl-cols`) in JEDER Breite, und `index.css` entscheidet, ob sie Boxen sind oder `display: contents`.
   Vier Sollbruchstellen, die alle STUMM kaputtgehen:

     1. Fällt `display: contents` in der Basis weg, bekommt die HANDY-Fassung vier zusätzliche Boxen
        im Fluss. Nichts wirft einen Fehler, das Layout rutscht nur.
     2. Fehlt umgekehrt im Desktop-Block das `display: block` an `.gl-body`/`.gl-cols`, bleiben beide
        `display: contents` — und ein solches Element erzeugt GAR KEINE Box, an der `overflow` oder
        `columns` greifen könnten. Genau das ist beim Bauen passiert: `column-count` meldete berechnet
        3, die Liste stand einspaltig und ungescrollt da. Der eine Fall, den man dem Quelltext nicht
        ansieht, weil beide Regeln für sich richtig aussehen.
     3. Wird aus dem Spaltenfluss wieder ein Raster, reißt der längste Begriff die Reihe auf — und
        dagegen hilft nur eine Klemme, die mitten im Satz abschneidet (dieselbe Lehre wie #skilltext).
     4. Der Rumpf ist auf dem Desktop `overflow: hidden`; ohne den inneren Scroller an `.gl-body`
        würde Überlauf ABGESCHNITTEN statt zu scrollen.

   Dazu die zwei Verhaltensnähte, die nicht im CSS stehen können: die Kategorie filtert nur auf dem
   Desktop, und Tippen schaltet dort auf „Alle".
   ============================================================ */

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const css = read("index.css");
const jsx = read("ui/Glossary.jsx");

// Der Block `@media (min-width: 1280px) { … }`, in dem der ganze Desktop-Pass steht.
const deskBlock = (() => {
  const at = css.indexOf(DESKTOP_BLOCK_AT);
  if (at < 0) return null;
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return null;
})();

describe("#glossar-desktop — Glossar ab 1280 px", () => {
  it("die vier Klammern sind unterhalb von 1280 px `display: contents`", () => {
    // Die Regel muss AUSSERHALB des Desktop-Blocks stehen, sonst gilt sie dort nicht, wo sie zählt.
    const base = deskBlock ? css.replace(deskBlock, "") : css;
    const rule = base.match(/^\.gl-desk,\s*\.gl-page,\s*\.gl-body,\s*\.gl-cols\s*\{([^}]*)\}/m);
    expect(rule, "Basis-Regel für die gl-Klammern nicht mehr gefunden").toBeTruthy();
    expect(rule[1]).toMatch(/display:\s*contents/);
  });

  it("`.gl-body` und `.gl-cols` bekommen auf dem Desktop wieder eine Box", () => {
    expect(deskBlock, "Desktop-Block nicht mehr gefunden").toBeTruthy();
    // Ohne diese zwei Wörter ist der Rest der Regel wirkungslos — s. Kopfkommentar, Punkt 2.
    expect(deskBlock).toMatch(/\.gl-body \{[^}]*display:\s*block/);
    expect(deskBlock).toMatch(/\.gl-cols \{[^}]*display:\s*block/);
  });

  it("die Begriffe stehen im Spaltenfluss, nicht im Raster", () => {
    // `columns` statt `grid`: im Raster bestimmt die höchste Zelle die Reihenhöhe (#skilltext).
    expect(deskBlock).toMatch(/\.gl-cols \{[^}]*columns:/);
    expect(deskBlock).not.toMatch(/\.gl-cols \{[^}]*display:\s*grid/);
    // Ohne `break-inside` zerreißt eine Begriffskarte am Spaltenende.
    expect(deskBlock).toMatch(/\.gl-cols > \* \{[^}]*break-inside:\s*avoid/);
    // Und keine Klemme: sie war der Grund, warum die Spalten überhaupt kommen.
    expect(deskBlock).not.toMatch(/\.gl-(cols|ttext)[^{]*\{[^}]*line-clamp/);
  });

  it("gescrollt wird innen — Überlauf darf nicht abgeschnitten werden", () => {
    // Der Rumpf klemmt (wie in der Werkstatt), das Ventil sitzt eine Ebene tiefer. Sonst liefe der
    // Ring von `.as-ring` (inset: 0) beim Scrollen mitten durch den Inhalt.
    expect(deskBlock).toMatch(/\.gl-scroll \{[^}]*overflow:\s*hidden/);
    expect(deskBlock).toMatch(/\.gl-body \{[^}]*overflow-y:\s*auto/);
  });

  it("die Navigationsspalte endet an ihrem Inhalt (wie .up-nav / .gd-nav)", () => {
    expect(deskBlock).toMatch(/\.gl-nav \{[^}]*align-self:\s*start/);
  });

  it("der Ring der beiden Panels hat sein Laufband-Kind", () => {
    // #perf-ring: `as-ring` und `as-ring-run` sind ein PAAR — Klasse ohne Kind = kein Rahmen.
    for (const panel of ["gl-nav as-ring", "gl-page as-ring"]) {
      const at = jsx.indexOf(panel);
      expect(at, `${panel} nicht gefunden`).toBeGreaterThan(-1);
      expect(jsx.slice(at, at + 260)).toMatch(/className="as-ring-run"/);
    }
  });

  it("die Spalte erscheint erst oberhalb des Bruchpunkts, die Chip-Leiste verschwindet dort", () => {
    // `useIsWide` ist der einzige Ort, an dem der Bruchpunkt in JS steht — ohne ihn stünde die
    // Spalte auch am Handy im DOM (und die Chip-Leiste daneben).
    expect(jsx).toMatch(/import \{ useIsWide \}/);
    expect(jsx).toMatch(/className="gl-nav as-ring\b/);
    expect(deskBlock).toMatch(/\.gl-tabs \{\s*display:\s*none/);
  });

  it("die Kategorie ist auf BEIDEN Breiten ein Sprungziel, kein Filter (#gl-sprung)", () => {
    // Der Filter nahm dem Glossar, was ein Nachschlagewerk ausmacht: an einer Stelle landen und
    // weiterlesen. Wer wirklich nur eine Kategorie sehen will, hat dafür die Suche.
    expect(jsx).toMatch(/const shown = sections;/);
    expect(jsx).not.toMatch(/sections\.filter\(\(s\) => s\.cat\.id === activeCat\)/);
    // Handy: der Kartenrumpf scrollt über scrollIntoView. Desktop: der EIGENE Panel-Scroller —
    // scrollIntoView würde dort zusätzlich Panel und Rahmen darunter verschieben.
    expect(jsx).toMatch(/scrollIntoView/);
    expect(jsx).toMatch(/scroller\.scrollTo\(\{ top: Math\.max\(0, ziel\), behavior: "smooth" \}\)/);
  });

  it("Tippen schaltet auf „Alle“ (sonst liegt ein Treffer hinter dem eigenen Filter)", () => {
    expect(jsx).toMatch(/const search = \(v\) => \{ setQ\(v\); if \(wide && v\.trim\(\)\) setActiveCat\("all"\); \}/);
    // Und das Feld muss diesen Weg auch nehmen, nicht mehr direkt setQ.
    expect(jsx).toMatch(/onChange=\{\(e\) => search\(e\.target\.value\)\}/);
  });

  it("jede Sektion trägt ihre Überschrift — sie ist die Landemarke des Sprungs (#gl-sprung)", () => {
    // Früher entfiel sie im gefilterten Zustand (der Seitenkopf nannte die Kategorie schon). Seit alle
    // Sektionen untereinander stehen, ist sie das Einzige, woran man nach dem Scrollen erkennt, wo man ist.
    expect(jsx).toMatch(/<div className="gl-sechead flex items-center gap-2 mb-0\.5">/);
    expect(jsx).not.toMatch(/!filtered/);
  });

  it("jede Kategorie hat ihren Einzeiler — in beiden Sprachen", () => {
    // Der Seitenkopf zeigt ihn; fehlt er, steht dort der rohe Schlüssel. Das Register ist die Quelle,
    // de.js ERZEUGT seine Einträge daraus (kein Abtippen), en.js übersetzt.
    for (const c of GLOSSARY_CATEGORIES) {
      expect(c.hint, `Kategorie ${c.id} ohne hint im Register`).toBeTruthy();
      expect(de[`glossary.cathint.${c.id}`], `de: glossary.cathint.${c.id}`).toBe(c.hint);
      expect(en[`glossary.cathint.${c.id}`], `en: glossary.cathint.${c.id}`).toBeTruthy();
    }
  });
});
