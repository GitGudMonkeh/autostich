import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

/* ============================================================
   #perf-ring · #perf-blur · #flach — die drei Desktop-Nähte vom 18.08.2026 als Quelltext-Ratsche.

   Alle drei sind Perf-Entscheidungen mit Messwerten dahinter (Zahlen stehen an den Regeln in
   index.css) und alle drei gehen bei einem Umbau STUMM kaputt — es kompiliert weiter, es sieht
   fast gleich aus, nur die Frames sind wieder weg. Deshalb hier festgenagelt:

     1. `as-ring` und `as-ring-run` sind ein PAAR. Der Ring besteht seit dem Umbau aus zwei Boxen
        (Maske aussen, laufendes Band innen). Wer die Klasse an ein neues Panel haengt und das Kind
        vergisst, bekommt gar keinen Rahmen; wer das Kind ohne Klasse setzt, ein totes Element.
     2. Der Verlauf wandert per `transform`, nicht per `background-position`. Letzteres ist eine
        PAINT-Eigenschaft und kostete 60 Rasterungen des ganzen Panels pro Sekunde.
     3. Auf dem Desktop liegt KEIN `backdrop-filter` mehr an Wurzelknoten und Panels — der war der
        teuerste Posten ueberhaupt und optisch fast nicht messbar (0,10-0,37 von 255).
     4. Der Baum haelt seinen Inhalt im Panel, auch auf flachen Fenstern.
   ============================================================ */

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const css = src("index.css");

// Alle JSX-Dateien, die Klassen vergeben.
const jsxFiles = ["App.jsx", ...readdirSync(new URL("../src/ui", import.meta.url))
  .filter((f) => f.endsWith(".jsx")).map((f) => `ui/${f}`)];

describe("#perf-ring — der Ring ist ein Paar aus zwei Boxen", () => {
  it("jedes `as-ring` hat genau ein `as-ring-run` als Kind", () => {
    const fehlt = [];
    for (const f of jsxFiles) {
      const s = src(f);
      // `as-ring` OHNE Bindestrich dahinter — sonst zaehlt `as-ring-run` doppelt.
      const ringe = (s.match(/as-ring(?![-\w])/g) || []).length;
      const kinder = (s.match(/as-ring-run/g) || []).length;
      if (ringe !== kinder) fehlt.push(`${f}: ${ringe}x as-ring, aber ${kinder}x as-ring-run`);
    }
    expect(fehlt, `Ring ohne Band (oder Band ohne Ring):\n  ${fehlt.join("\n  ")}`).toEqual([]);
  });

  it("das Band wandert per transform, nicht per background-position", () => {
    expect(css).toMatch(/\.as-ring > \.as-ring-run::before\s*\{[^}]*animation:\s*as-ring-slide/);
    const kf = css.match(/@keyframes as-ring-slide \{([\s\S]*?)\}/);
    expect(kf, "@keyframes as-ring-slide fehlt").toBeTruthy();
    expect(kf[1]).toMatch(/transform:\s*translate3d/);
    expect(kf[1]).not.toMatch(/background-position/);
    // Die alte Paint-Fassung ist restlos weg — sonst laeuft irgendwo noch die teure Variante.
    expect(css).not.toMatch(/as-ring-sweep/);
  });

  it("die Werkstatt-Panels teilen die Konstruktion, statt sie zu kopieren", () => {
    // `.cz-main`/`.cz-side` trugen den Ring bis 18.08.2026 als wortgleiches eigenes ::before.
    expect(css).not.toMatch(/\.cz-main::before,\s*\.cz-side::before/);
    expect(src("ui/CustomizeScreen.jsx")).toMatch(/className="cz-main as-ring"/);
    expect(src("ui/CustomizeScreen.jsx")).toMatch(/className="cz-side as-ring"/);
  });
});

describe("#perf-blur — kein backdrop-filter auf dem Desktop", () => {
  const deskBlock = (() => {
    const at = css.indexOf("@media (min-width: 1400px) {");
    let depth = 0;
    for (let j = css.indexOf("{", at); j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
    }
    return "";
  })();

  it("die drei Wurzelknoten ueberstimmen ihren Inline-Blur mit `none`", () => {
    // Loeschen reicht nicht: Overlay-Root und Dim setzen den Blur inline, er kaeme sonst zurueck.
    for (const sel of [".up-root", ".cz-root", ".gd-dim"]) {
      const rule = deskBlock.match(new RegExp(`\\${sel} \\{([^}]*)\\}`));
      expect(rule, `${sel} nicht mehr gefunden`).toBeTruthy();
      expect(rule[1], `${sel} soll den Blur mit none !important ueberstimmen`)
        .toMatch(/backdrop-filter:\s*none\s*!important/);
    }
  });

  it("die vier Panels tragen gar keinen Blur mehr", () => {
    for (const sel of [".up-nav", ".up-page", ".gd-nav", ".gd-page"]) {
      const rule = deskBlock.match(new RegExp(`\\${sel} \\{([^}]*)\\}`));
      expect(rule, `${sel} nicht mehr gefunden`).toBeTruthy();
      expect(rule[1], `${sel} hat wieder einen backdrop-filter`).not.toMatch(/backdrop-filter/);
    }
  });
});

describe("#werkstatt-aktion — Kaufen/Ausruesten steht ausserhalb des Scrollers", () => {
  it("der Aktionsblock ist ein flex-none-Geschwister, die Spalte eine schrumpffaehige Flex-Kette", () => {
    /* Auf flachen Fenstern (1536 x 791) ist die Vorschau hoeher als die Spalte. Lag der Knopf im Fluss
       hinter den Bildern, rutschte er unter die gedeckelte Panelkante und wurde weggeschnitten — man sah
       nicht mehr, dass man das Deck kaufen kann. Beides gehoert zusammen: der Knopf ausserhalb des
       Scrollers UND eine Flex-Kette, die der Bilderliste eine definierte Hoehe gibt (sonst scrollt sie
       gar nicht, sondern waechst einfach weiter). */
    const cz = src("ui/CustomizeScreen.jsx");
    expect(cz).toMatch(/cz-action flex-none/);
    for (const rule of [/\.cz-side \{[^}]*display:\s*flex/, /\.cz-detail \{[^}]*min-height:\s*0/,
                        /\.cz-detailcard \{[^}]*min-height:\s*0/])
      expect(css, `Flex-Kette der Detailspalte unterbrochen: ${rule}`).toMatch(rule);
  });
});

describe("#rahmen — die Karte traegt auf dem Desktop keinen Rahmen mehr", () => {
  it("die Abraeum-Regel nennt beide Panel-Klassen, sonst gewinnt die Deck-Variante", () => {
    /* Der eigentliche Fehler war Spezifitaet, nicht Absicht: `[data-skin="crt"] .as-panel.as-panel-deck`
       wiegt (0,3,0), `.up-card.as-panel` nur (0,2,0). Die Regel stand da, wirkte nie, und die Karte malte
       weiter einen 1-px-Verlauf um den ganzen Bildschirm — seitlich und ueber den Kopf hinweg. Wer die
       Selektoren kuerzt, holt ihn zurueck, ohne dass irgendetwas rot wird. */
    for (const sel of ["up-card", "cz-card", "gd-card"]) {
      expect(css, `${sel}: die Regel muss BEIDE Klassen nennen`)
        .toMatch(new RegExp(`\\.${sel}\\.as-panel\\.as-panel-deck`));
      expect(css, `${sel}: die alte, wirkungslose Zwei-Klassen-Fassung ist zurueck`)
        .not.toMatch(new RegExp(`\\.${sel}\\.as-panel \\{`));
    }
  });
});

describe("#flach — der Baum haelt seinen Inhalt im Rahmen", () => {
  it("Panel klemmt, Knotenspalten scrollen, die Rasterzeile waechst nicht mit dem Bild", () => {
    expect(css).toMatch(/\.up-page \{[^}]*overflow:\s*hidden/);
    expect(css).toMatch(/\.up-vgrid \{[^}]*overflow-y:\s*auto/);
    // Der Kern: ohne die Zeilenangabe zieht die Challenge-Karte das ganze Raster aus dem Panel.
    expect(css).toMatch(/\.up-facbody \{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.up-chall \{[^}]*max-height:\s*100%/);
  });
});
