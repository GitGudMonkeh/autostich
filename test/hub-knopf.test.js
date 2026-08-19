import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================
   #hub-knopf (19.08.2026) — EIN Ziel, der Rest sind Angebote.

   Bis hierher trugen alle vier Hub-Knöpfe dieselbe Bauform (90°-Farbanlauf + 4-px-Kante links), nur in
   verschiedenen Helligkeiten. Auf dem Handy trägt das; auf einem 1920er Schirm stehen sie übereinander
   und vier Varianten derselben Geste ergeben eine Leiter, auf der keine Stufe heraussticht.
   Ab 1400 px: EINE Taste (`as-cta-primary`) und drei ruhige Zeilen.

   Der Zustandswechsel braucht dafür keine zweite Regel — welcher Knopf `as-cta-primary` trägt, entscheidet
   `normalCls` in StartScreen.jsx. Läuft ein Lauf, ist die Taste „Lauf fortsetzen"; sonst „Lauf beginnen".
   Genau diese Bindung hält der Wächter fest: sie ist die Stelle, an der die Hierarchie hängt.
   ============================================================ */

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const start = readFileSync(new URL("../src/ui/StartScreen.jsx", import.meta.url), "utf8");
const deskBlock = (() => {
  const at = css.indexOf("@media (min-width: 1400px) {");
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return "";
})();

describe("#hub-knopf — eine Taste, drei Zeilen", () => {
  it("die Primär-Taste hat einen Rahmen RUNDUM und einen Schein", () => {
    const m = [...deskBlock.matchAll(/\.as-cta-primary\s*\{([^}]*)\}/g)];
    expect(m.length, "die Desktop-Fassung der Primär-Taste fehlt").toBeGreaterThan(0);
    const r = m[m.length - 1][1];
    expect(r, "ohne Fläche in der Deckfarbe ist es keine Taste").toMatch(/--deck-a1/);
    expect(r, "der Rahmen rundum fehlt").toMatch(/border:\s*1px solid/);
    /* Das Licht von oben (inset) bleibt und macht die Fläche zur Taste. Ein Schein NACH AUSSEN ist
       ausdrücklich raus (Nachjustierung 19.08.): der Halo legte sich als Wolke um den Knopf und war
       dasselbe Mittel, das an Ring, Knoten und Angebotskarten gerade gefallen ist. */
    expect(r, "das Licht von oben fehlt").toMatch(/box-shadow:\s*inset[^;]*--deck-a1/);
    expect(r, "der Halo nach außen ist zurück").not.toMatch(/box-shadow:[^;]*\n?[^;]*0 0 \d+px/);
  });

  it("die drei Angebote sind flach — kein Farbanlauf, kein Schein", () => {
    const m = deskBlock.match(/\.as-tut-btn,\s*\.as-ranked-btn,\s*\.as-cta-ghost\s*\{([^}]*)\}/);
    expect(m, "die Sammelregel der ruhigen Zeilen fehlt").toBeTruthy();
    expect(m[1]).toMatch(/box-shadow:\s*none/);
    expect(m[1], "ein Farbanlauf macht daraus wieder eine Leiter").not.toMatch(/linear-gradient/);
    /* Und das TUTORIAL muss dabei sein: es soll sichtbar bleiben, aber nie mit dem Start konkurrieren. */
    expect(m[0]).toMatch(/as-tut-btn/);
  });

  it("die Taste wandert mit der Absicht mit (Fortsetzen ↔ Beginnen)", () => {
    /* Ohne diese Bindung klebte die Optik an einem bestimmten Knopf: läuft ein Lauf, wäre „Lauf beginnen"
       weiter die lauteste Fläche, obwohl „Fortsetzen" darüber die Primär-Aktion ist. */
    expect(start).toMatch(/const normalCls = hasResume \? "as-cta-ghost" : "as-cta-primary"/);
    expect(start, "die Fortsetzen-Taste trägt die Primär-Klasse nicht").toMatch(/onClick=\{onResume\}\s*\n?\s*className="as-cta-primary/);
  });

  it("die Hub-Knöpfe sind ab 1400 px eckiger (6 px, wie alles andere)", () => {
    expect(deskBlock).toMatch(/\.as-cta-primary,\s*\.as-cta-ghost,\s*\.as-tut-btn,\s*\.as-ranked-btn,\s*\.as-seed-play\s*\{[^}]*border-radius:\s*6px/);
  });

  it("die Zweitzeile der Fortsetzen-Taste hat Luft — oben UND unten", () => {
    /* Sie klebte am Titel (`flex-col` + `leading-tight`, kein Abstand dazwischen). Beide Werte gehören
       zusammen: nur die Luft zu erhöhen schöbe die Zeile an den unteren Rahmen, nur das Polster ließe sie
       oben kleben. Gemessen 1920×1080: 17 px über dem Titel · 5 px Titel→Zeile · 19 px Zeile→Rahmen. */
    expect(deskBlock).toMatch(/\.as-cta-sub\s*\{[^}]*margin-top:\s*\d+px/);
    expect(deskBlock, "ohne mehr Fußpolster rutscht die Zeile an den Rahmen")
      .toMatch(/\.as-cta-primary:has\(\.as-cta-sub\)\s*\{[^}]*padding-bottom:\s*\d+px/);
    expect(start, "die Zweitzeile trägt den Haken nicht").toMatch(/className="as-cta-sub /);
  });

  it("die Handy-Fassung bleibt unberührt", () => {
    /* Die Basis-Regeln der vier Knöpfe stehen weiter oben und dürfen die Desktop-Werte nicht kennen —
       nachgemessen ist der Hub bei 390 px vorher/nachher bitidentisch (0,0000 von 255). */
    const basis = css.slice(0, css.indexOf("@media (min-width: 1400px) {"));
    const prim = basis.match(/\.as-cta-primary\s*\{([^}]*)\}/);
    expect(prim, "die Handy-Fassung der Taste ist verschwunden").toBeTruthy();
    expect(prim[1], "der 90°-Anlauf der Handy-Fassung ist weg").toMatch(/linear-gradient\(90deg/);
    expect(prim[1], "die 4-px-Kante der Handy-Fassung ist weg").toMatch(/border-left:\s*4px solid/);
  });
});
