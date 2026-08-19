import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================
   #desktop-menues — Optionen · Willkommen · Feedback ab 1400 px, als Quelltext-Ratsche.

   Wie beim Leitfaden gibt es KEINEN zweiten Renderpfad: Das JSX setzt in jeder Breite dieselben
   Klammern (`op-col2` / `un-form` / `fb-left` / `fb-right`), und index.css entscheidet, ob daraus
   Spalten werden oder ob sie `display: contents` bleiben. Billig und robust — aber mit vier
   Sollbruchstellen, die alle STUMM kaputtgehen (es kompiliert, es sieht fast gleich aus):

     1. Fällt `display: contents` in der Basis weg, bekommt die HANDY-Fassung vier zusätzliche Boxen
        im Fluss. Die Handy-Fassung ist gegen ein iPhone SE abgestimmt; sie darf sich nicht bewegen.
     2. Die desktop-only Elemente (Auskunftszeile, Wortmarke) müssen `hidden` tragen und erst ab
        1400 px erscheinen — sonst stehen sie plötzlich im 320-px-Dialog.
     3. `.op-card.as-panel` mit ZWEI Klassen wiegt weniger als `[data-skin="crt"] .as-panel.as-panel-deck`
        (0,2,0 gegen 0,3,0). Die Regel stünde da und täte nichts, die Karte malte weiter einen 1-px-Verlauf
        um den ganzen Bildschirm — derselbe Fehler, der schon `.up-card`/`.cz-card`/`.gd-card` getroffen hat.
     4. Der Blur. Er kommt bei allen drei Overlays INLINE aus dem JSX; ihn in der CSS zu löschen genügt
        nicht, er muss mit `none !important` überstimmt werden (#perf-blur: gemessen der teuerste Posten
        des ganzen Desktop-Passes).

   Ebenfalls festgenagelt: die Spaltenaufteilung der Optionen. „Grafik" und „Ton" teilen sich die
   mittlere Spalte und müssen dafür in EINER Klammer liegen — ohne sie sind es zwei Rasterzeilen, deren
   Höhe die längste Spalte daneben bestimmt, und zwischen den beiden klafft deren Restluft.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const css = read("index.css");

// Der Block `@media (min-width: 1400px) { … }`, in dem der ganze Desktop-Pass steht.
const deskBlock = (() => {
  const at = css.indexOf("@media (min-width: 1400px) {");
  if (at < 0) return "";
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return "";
})();
const base = deskBlock ? css.replace(deskBlock, "") : css;

describe("#desktop-menues — die Klammern sind unterhalb von 1400 px keine Boxen", () => {
  it("op-col2 · un-form · fb-left · fb-right stehen als `display: contents` in der BASIS", () => {
    /* Die Regel sammelt inzwischen alle Klammern des Desktop-Passes (auch die der großen Screens) — geprüft
       wird deshalb je Klasse, nicht die ganze Selektorliste am Stück. */
    const rule = base.match(/^[^{}\n]*\.op-col2[^{}\n]*\{([^}]*)\}/m);
    expect(rule, "Basis-Regel für die Menü-Klammern nicht mehr gefunden").toBeTruthy();
    expect(rule[1]).toMatch(/display:\s*contents/);
    const sel = rule[0].split("{")[0];
    for (const cls of ["op-col2", "un-form", "fb-left", "fb-right"])
      expect(sel, `${cls} fehlt in der Klammer-Regel`).toMatch(new RegExp(`\\.${cls}\\b`));
  });

  it("die Optionen legen Grafik UND Ton in dieselbe Klammer", () => {
    const jsx = read("ui/OptionsModal.jsx");
    // Zwischen dem öffnenden op-col2 und seinem Ende dürfen genau die zwei Sektionen liegen.
    const at = jsx.indexOf('className="op-col2"');
    expect(at, "op-col2-Klammer fehlt").toBeGreaterThan(0);
    const rest = jsx.slice(at);
    const bis = rest.indexOf('<Section id="display"');
    expect(bis, "Display-Sektion steht nicht mehr hinter der Klammer").toBeGreaterThan(0);
    const drin = rest.slice(0, bis);
    expect(drin).toMatch(/<Section id="graphics"/);
    expect(drin).toMatch(/<Section id="sound"/);
    expect(drin).not.toMatch(/<Section id="general"/);
  });

  it("die drei Sektions-Spalten haben feste Plätze (nicht auto-flow)", () => {
    expect(deskBlock).toMatch(/\.op-sec\[data-sec="general"\]\s*\{[^}]*grid-column:\s*1/);
    expect(deskBlock).toMatch(/\.op-col2\s*\{[^}]*grid-column:\s*2/);
    expect(deskBlock).toMatch(/\.op-sec\[data-sec="display"\]\s*\{[^}]*grid-column:\s*3/);
  });
});

describe("#desktop-menues — desktop-only Elemente sind auf dem Handy nicht da", () => {
  it("Auskunftszeilen und Wortmarke tragen `hidden` und erscheinen erst ab 1400 px", () => {
    for (const [datei, marke] of [["ui/OptionsModal.jsx", "op-readout"], ["ui/FeedbackModal.jsx", "fb-readout"]]) {
      const zeile = read(datei).match(new RegExp(`className="${marke}[^"]*"`));
      expect(zeile, `${marke} nicht mehr gefunden`).toBeTruthy();
      expect(zeile[0], `${marke} muss unter 1400 px ausgeblendet sein`).toMatch(/hidden min-\[1400px\]:block/);
    }
    // Die Wortmarke im Willkommen-Dialog wird über die CSS eingeblendet (sie braucht dort weitere
    // Eigenschaften) — im JSX steht deshalb nur `hidden`, das Gegenstück MUSS im Desktop-Block liegen.
    expect(read("ui/UsernameModal.jsx")).toMatch(/className="un-wm as-wordmark select-none hidden"/);
    expect(deskBlock).toMatch(/\.un-first \.un-wm\s*\{[^}]*display:\s*block/);
  });

  it("die breite Willkommen-Fassung hängt am Erststart, nicht an der Breite allein", () => {
    // `un-first` ist der einzige Haken, an dem die Desktop-Regeln hängen. Ohne die Bedingung bekäme
    // auch „Name ändern" den 900-px-Auftritt.
    expect(read("ui/UsernameModal.jsx")).toMatch(/firstTime \? "un-first" : ""/);
    for (const m of deskBlock.matchAll(/^\s*(\.un-[^{}\n]*)\{/gm)) {
      if (m[1].includes(".un-root")) continue; // der Überzug gilt für beide Fassungen
      expect(m[1], `Regel ohne un-first-Bindung: ${m[1].trim()}`).toMatch(/\.un-first/);
    }
  });
});

describe("#desktop-menues — die geerbten Fallen des Desktop-Passes", () => {
  it("#rahmen: die Abräum-Regel der Optionen-Karte nennt ALLE DREI Klassen", () => {
    expect(css).toMatch(/\.op-card\.as-panel\.as-panel-deck/);
    expect(css, "die alte, wirkungslose Zwei-Klassen-Fassung ist zurück")
      .not.toMatch(/\.op-card\.as-panel \{/);
  });

  it("#perf-blur: alle drei Overlay-Wurzeln überstimmen ihren Inline-Blur mit `none`", () => {
    // Löschen reicht nicht — der Blur steht inline am Overlay-Root und käme sonst zurück.
    const rule = (sel) => deskBlock.match(new RegExp(`\\${sel}[^{]*\\{([^}]*)\\}`));
    for (const sel of [".op-root", ".un-root"]) {
      const r = rule(sel);
      expect(r, `${sel} nicht mehr gefunden`).toBeTruthy();
      expect(r[1], `${sel} soll den Blur mit none !important überstimmen`)
        .toMatch(/backdrop-filter:\s*none\s*!important/);
    }
    // `.fb-root` teilt sich die Regel mit `.un-root`.
    expect(deskBlock).toMatch(/\.un-root,\s*\.fb-root\s*\{/);
  });

  it("#op-oben: die Optionen ankern oben statt mittig im Fenster", () => {
    /* Das JSX zentriert (`flex items-center`) — richtig für die Handy-Sprechblase, falsch für drei
       Panels, die kürzer sind als jeder Desktop-Schirm: gemessen 1920 x 1080 standen 206 px Leere
       über dem Titel. Baum, Statistik und Bestenliste tragen dieselbe Zeile längst. */
    const r = deskBlock.match(/\.op-root[^{]*\{([^}]*)\}/);
    expect(r, ".op-root nicht mehr gefunden").toBeTruthy();
    expect(r[1], "die Optionen hängen wieder mittig im Fenster")
      .toMatch(/align-items:\s*start\s*!important/);
    /* Gegenprobe: der Deckel muss bleiben. Ohne ihn wächst die oben verankerte Karte auf flachen
       Fenstern aus dem Bild, statt dass ihr Rumpf scrollt. */
    expect(deskBlock.match(/\.op-card \{([^}]*)\}/)[1], "der Höhendeckel der Karte ist weg")
      .toMatch(/max-height:\s*100%/);
  });

  it("die drei Overlays tragen im Desktop-Block keinen eigenen backdrop-filter mit Radius", () => {
    for (const m of deskBlock.matchAll(/^\s*(\.(?:op|un|fb)-[^{}\n]*)\{([^}]*)\}/gm)) {
      expect(m[2], `${m[1].trim()} hat wieder einen Blur`).not.toMatch(/backdrop-filter:\s*blur/);
    }
  });
});
