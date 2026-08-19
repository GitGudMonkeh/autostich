/* #shop-skalieren + #shop-luft — die Pack-Vorschau der Deck-Werkstatt ab 1400 px (19.08.2026).
   -------------------------------------------------------------------------------------------------
   Gemessen im Produktionsbuild (Playwright, echte Komponente): der Detail-Scroller braucht 662 px.
   Auf 1920 × 1080 und 1723 × 1030 hat er 662 — dort passte es. Auf 1536 × 791 hat er 558, also
   104 px Überhang: Kartenrückseite, Spielfeld und der Aktivieren-Knopf standen nie zusammen im Bild,
   man musste in einer Spalte scrollen, die selbst schon in einem gedeckelten Panel sitzt.

   Behoben über die normale Flex-Schrumpfung — kein Maßstab-Faktor, keine abgetippte Zahl. Nachgemessen
   nach dem Umbau: Überhang 0 auf allen fünf geprüften Fenstern (1920 × 1080 · 1723 × 1030 · 1536 × 791 ·
   1400 × 760 · 1400 × 700), und die Bilder behalten ihr Verhältnis zueinander (auf 1536 schrumpfen
   Karten und Spielfeld auf 80,4 % bzw. 79,6 %).

   Geprüft wird als Quelltext-Ratsche über CustomizeScreen.jsx + index.css — das Projekt hat kein
   Component-Test-Setup (s. test/fx-panel.test.js, test/guide-desktop.test.js). Jede der Nähte fällt
   lautlos aus, wenn jemand sie kürzt: dann kommt entweder der Scroller zurück, oder es schrumpft der
   KASTEN statt des BILDES (dunkle Balken bzw. ein beschnittenes Spielfeld). */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const jsx = src("ui/CustomizeScreen.jsx");
const css = src("index.css");
// Nur der 1400er-Block — sonst prüfte man Regeln, die am Handy stehen.
const desktop = css.slice(css.indexOf("@media (min-width: 1400px)"));
// Die Regel ohne ihre Begründungen: die Kommentare nennen die alten Werte absichtlich beim Namen
// (dieselbe Falle wie beim `as-ring`-Zähler in #fx-panel und beim `ATTACK:`-Greifer in #cube-takt).
const desktopBlank = desktop.replace(/\/\*[\s\S]*?\*\//g, "");

describe("#shop-skalieren — die Vorschau schrumpft, statt zu scrollen", () => {
  it("die drei Klassenhaken stehen in der INLINE-Fassung (Handy-Overlay bleibt unberührt)", () => {
    // Der Umbau darf die Handy-Fassung nicht mitnehmen: sie ist ein Overlay ohne Katalog daneben und
    // scrollt dort zu Recht. Deshalb hängen alle drei Haken im `inline`-Zweig.
    const inlineZweig = jsx.slice(jsx.indexOf("{inline ? ("), jsx.indexOf("Stufen-Wähler I / II / III"));
    expect(inlineZweig).toContain("cz-shots grid grid-cols-2");
    expect(inlineZweig.match(/cz-shot flex flex-col/g)).toHaveLength(2);   // Kartenpaar + Spielfeld
    expect(inlineZweig.match(/cz-shotimg w-full/g)).toHaveLength(2);       // CardPreview + BfPreview
    // Der Scroller trägt seine Klammer nur, wenn er auch `inline` ist.
    expect(jsx).toMatch(/inline \? "cz-body flex-1 min-h-0 overflow-y-auto" : ""/);
  });

  it("`overflow-y: auto` bleibt als VENTIL stehen — Flexbox schrumpft zuerst, gescrollt wird danach", () => {
    // `overflow: hidden` wäre die Alternative, und die SCHNEIDET AB statt erreichbar zu bleiben.
    expect(jsx).toContain("cz-body flex-1 min-h-0 overflow-y-auto");
    expect(desktopBlank).not.toMatch(/\.cz-body\s*\{[^}]*overflow:\s*hidden/);
  });

  it("der Scroller ist eine Flex-Spalte und darf unter seine Inhaltshöhe", () => {
    // Ohne `min-height: 0` ist die automatische Mindestgröße eines Flex-Kindes seine Inhaltshöhe —
    // dann schrumpft gar nichts und der Scroller kommt zurück.
    expect(desktopBlank).toMatch(/\.cz-body\s*\{[^}]*display:\s*flex/);
    expect(desktopBlank).toMatch(/\.cz-body\s*\{[^}]*flex-direction:\s*column/);
    expect(desktopBlank).toMatch(/\.cz-body\s*\{[^}]*min-height:\s*0/);
  });

  it("die Rasterzeile des Kartenpaars gibt mit — `auto` bliebe auf der Bildhöhe stehen", () => {
    expect(desktopBlank).toMatch(/\.cz-shots\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)/);
    expect(desktopBlank).toMatch(/\.cz-shots\s*\{[^}]*min-height:\s*0/);
    expect(desktopBlank).toMatch(/\.cz-shot\s*\{[^}]*min-height:\s*0/);
    expect(desktopBlank).toMatch(/\.cz-shotimg\s*\{[^}]*min-height:\s*0/);
  });

  it("es schrumpft das BILD, nicht der Kasten — contain + durchsichtige Fläche gehören zusammen", () => {
    // 1. `BfPreview` malt mit `object-cover`: ein schrumpfender Kasten würde das Spielfeld oben und
    //    unten BESCHNEIDEN statt es zu verkleinern.
    expect(desktopBlank).toMatch(/\.cz-shotimg\s*>\s*img\s*\{[^}]*object-fit:\s*contain\s*!important/);
    // 2. Beide Vorschauen setzen ihre Fläche INLINE (#0b0a16) — ohne `!important` bliebe sie stehen und
    //    man sähe sie als dunkle Balken neben dem verkleinerten Bild.
    expect(desktopBlank).toMatch(/\.cz-shotimg\s*\{[^}]*background:\s*transparent\s*!important/);
    expect(jsx).toMatch(/background:\s*"#0b0a16"/);   // die Naht, gegen die das `!important` steht
  });
});

describe("#shop-luft — Reiter und Panels stoßen nicht mehr aufeinander", () => {
  it("der Kopf trägt die Luft unter den Reitern (gemessen 8 → 18 px)", () => {
    // Sie hängt am KOPF und nicht als `margin-top` am Raster: der Kopf ist sticky, sein Polster gehört
    // zu ihm und fährt beim Scrollen mit.
    const kopf = desktopBlank.slice(desktopBlank.indexOf(".cz-head {"));
    const m = kopf.slice(0, kopf.indexOf("}")).match(/padding-bottom:\s*(\d+)px/);
    expect(m, "`.cz-head` hat kein padding-bottom mehr — Naht gefunden?").toBeTruthy();
    expect(Number(m[1])).toBeGreaterThanOrEqual(16);
  });
});
