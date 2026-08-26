import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DESKTOP_BLOCK_AT } from "./desktopBreakpoint.js";

/* ============================================================================
   #mainscreen-branding C3 — DIE DECK-TAFEL.

   Fünf Aussagen, und jede von ihnen kann still brechen:

     1. DIE TAFEL HAT EINEN EIGENEN HAKEN. Bis C3 hatte sie keinen: sie war nur als „das
        ring-tragende Kind von `.hub-stand`, das nicht die Kachelbank ist" zu greifen, weil ZWEI
        Kinder `.as-ring` tragen (C1-F10). Ein Screen, den nur eine Negation erreicht, ist ein
        Screen, den der nächste Wächter falsch trifft.
     2. DAS BILD IST EINE FORMEL, KEINE ZAHL. Owner-Entscheidung Q10, Option A: so groß, wie die
        Seite es trägt, gedeckelt auf die Entwurfsgröße. Eine feste Höhe an der Fundstelle wäre
        genau die Entscheidung, die der Owner NICHT getroffen hat.
     3. DIE VIER DURCHSCHEINENDEN INLINE-ALPHAS SIND UMGEWANDELT, NICHT KOPIERT. Der Vertrag
        verlangt es wörtlich: ein Inline-Literal ist von keiner Regel außer `!important`
        erreichbar. `.22` und `.25` haben diesen Screen als Inline-Style verlassen.
     4. DIE KENNZAHLEN TRETEN ZURÜCK. Keine Füllung je Zelle, kein Rahmen um die vier, EINE Linie.
     5. „BUILD DNA" BLEIBT DRAUSSEN. Q4, und die Daten existieren nicht — `computeFormations` ist
        lauf-gebunden. Eine Zeile, die dem Deck eine feste Build-Identität zuschreibt, führt den
        Spieler in die Irre.

   JEDE PRÜFUNG IST ALS *„enthält kein X außer Y"* GESCHRIEBEN, aus dem Grund, den diese Runde
   achtmal bezahlt hat: eine Prüfung auf Anwesenheit besteht irgendwann auf dem Falschen.
   ============================================================================ */

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const css = read("../src/index.css");
const start = read("../src/ui/StartScreen.jsx");
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const code = stripComments(start);

const deskBlock = (() => {
  const at = css.indexOf(DESKTOP_BLOCK_AT);
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return "";
})();

describe("#mainscreen-branding — die Tafel ist greifbar", () => {
  it("trägt genau EINEN eigenen Haken, und keine zweite Stelle vergibt ihn", () => {
    /* `as-deck` OHNE Bindestrich dahinter — sonst zaehlen `as-deck-art` und `as-deck-attr` mit.
       Dieselbe Klammer, die der Ring-Waechter seit jeher braucht. */
    const hits = code.match(/as-deck(?![-\w])/g) || [];
    expect(hits.length, `\`as-deck\` steht ${hits.length}× im JSX — erwartet: genau einmal`).toBe(1);
    /* Die Gegenprobe: er sitzt an dem Element, das auch Glas und Ring trägt — sonst zeigte der Haken
       auf irgendeine Hülle daneben und jede Regel darunter träfe das Falsche. */
    expect(code, "`as-deck` sitzt nicht am Panel selbst").toMatch(/className="as-deck hidden \w+:flex as-glass as-ring/);
  });

  it("und die Tafel bleibt oberhalb der Schwelle — unter 1280 px gibt es sie nicht", () => {
    expect(code).toMatch(/className="as-deck hidden \w+:flex/);
    /* Jede Regel, die die Tafel kleidet, steht in der Desktop-Sektion. Geprüft als „keine außerhalb". */
    const outside = css.slice(0, css.indexOf(DESKTOP_BLOCK_AT))
      + css.slice(css.indexOf(DESKTOP_BLOCK_AT) + deskBlock.length);
    const stray = (stripComments(outside).match(/\.as-deck[-\w]*\s*[,{]/g) || []);
    expect(stray, `Regel an der Tafel außerhalb der Desktop-Sektion: ${stray.join(" ")}`).toEqual([]);
  });
});

describe("#mainscreen-branding — das Bild folgt dem Viewport (Q10, Option A)", () => {
  it("bekommt seine Höhe aus einer Formel und nicht aus einer Zahl an der Fundstelle", () => {
    expect(code, "das Bild trägt wieder eine feste Breite im JSX").not.toMatch(/w-\[\d+px\][^"]*as-deck-art|as-deck-art[^"]*w-\[\d+px\]/);
    const rule = deskBlock.match(/\.as-deck-art\s*\{([^}]*)\}/);
    expect(rule, ".as-deck-art fehlt").toBeTruthy();
    expect(rule[1], "die Höhe ist keine Formel mehr").toMatch(/height:\s*clamp\([^)]*100vh/);
  });

  it("ist auf die Entwurfsgröße gedeckelt — 268 px, und nicht mehr", () => {
    const rule = deskBlock.match(/\.as-deck-art\s*\{([^}]*)\}/)[1];
    /* Der Deckel ist das LETZTE Argument der clamp(), und danach zu suchen ist nicht dasselbe wie
       „das dritte Komma". Die Mitte enthaelt selbst eines (`var(--hub-zoom, 0.85)`), woran die erste
       Fassung dieser Zeile zerbrach — sie las bis zum naechsten Komma statt bis zur schliessenden
       Klammer und meldete dann, der Deckel sei nicht mehr zu lesen. */
    const cap = rule.match(/clamp\([^;]*,\s*(\d+)px\s*\)/);
    expect(cap, "der Deckel der clamp() ist nicht mehr zu lesen").toBeTruthy();
    expect(Number(cap[1]), "der Deckel ist nicht die Entwurfsgröße 268 px").toBe(268);
  });

  it("die Breite folgt dem Bild und wird nicht gesetzt — sonst verzerrt die Karte", () => {
    /* Gemessen: die Deck-Karte hat das Seitenverhältnis 194 : 268. Der Entwurf nennt 196 × 268, also
       dieselbe Karte auf zwei Pixel gerundet. Eine gesetzte Breite von 196 würde sie um 1 % ziehen. */
    const rule = deskBlock.match(/\.as-deck-art\s*\{([^}]*)\}/)[1];
    expect(rule, "die Breite wird gesetzt statt vom Bild übernommen").toMatch(/width:\s*auto/);
  });
});

describe("#mainscreen-branding — umgewandelt, nicht kopiert", () => {
  /* DER VERTRAG WÖRTLICH: „fasst du eine dieser Zeilen an, wandle sie in ein `var()` um statt sie zu
     kopieren". Zwei der vier durchscheinenden Inline-Alphas dieses Screens wohnen in der Tafel —
     `.25` am Bildrahmen, `.22` am Musik-Kasten. C3 fasst beide an, also verlassen beide das JSX.
     Geprüft wird die ABWESENHEIT im Inline-Style und die ANWESENHEIT in genau einer Regel: eine
     Prüfung nur auf die Regel wäre grün, während das Literal drei Zeilen weiter inline stünde. */
  for (const alpha of [".22", ".25"]) {
    it(`rgba(150,150,170,${alpha}) steht nicht mehr inline im Screen`, () => {
      const inline = (code.match(new RegExp(`rgba\\(150, ?150, ?170, ?\\${alpha}\\)`, "g")) || []);
      expect(inline, `noch ${inline.length}× inline: ${inline.join(" ")}`).toEqual([]);
    });
  }

  it("und beide stehen jetzt je genau einmal als Regel", () => {
    for (const [alpha, sel] of [[".22", ".as-deck-attr"], [".25", ".as-deck-art"]]) {
      const rule = deskBlock.match(new RegExp(`\\${sel}\\s*\\{([^}]*)\\}`));
      expect(rule, `${sel} fehlt`).toBeTruthy();
      expect(rule[1], `${sel} trägt das umgewandelte Alpha ${alpha} nicht`)
        .toMatch(new RegExp(`rgba\\(150, ?150, ?170, ?\\${alpha}\\)`));
    }
  });

  it("die beiden anderen sind NICHT angefasst worden — sie gehören C4", () => {
    /* Die Gegenprobe zur Umwandlung: `.10` und `.18` stehen unverändert inline. Wer sie mitnimmt,
       ohne es zu sagen, hat die Familie halb migriert — und eine halb migrierte Familie ist, wie die
       43 Schatten entstanden sind (conventions.md §2c, MENU-38). */
    expect(code, "das .10-Alpha der Bonus-Leiste ist verschwunden").toMatch(/rgba\(150,150,170,0\.10\)/);
    expect(code, "das .18-Alpha des Streifens ist verschwunden").toMatch(/rgba\(150,150,170,\.18\)/);
  });
});

describe("#mainscreen-branding — die Kennzahlen treten zurück", () => {
  it("enthält keine Füllung je Zelle und keinen Rahmen um die vier", () => {
    expect(code, "die Kennzahl-Zellen tragen wieder eine eigene Fläche")
      .not.toMatch(/as-kpi [^"]*"\s+style=\{\{\s*background/);
    expect(code, "das Kennzahl-Raster trägt wieder einen Rahmen an der Fundstelle")
      .not.toMatch(/as-kpis[^"]*"\s+style=\{\{[^}]*border/);
  });

  it("und trägt stattdessen genau eine Linie — die Haarlinien zwischen den Zellen bleiben", () => {
    expect(deskBlock, "die trennende Linie über den Kennzahlen fehlt")
      .toMatch(/\.as-kpis\s*\{[^}]*border-top:\s*1px solid/);
    expect(deskBlock, "die Haarlinie zwischen den Zellen ist verschwunden")
      .toMatch(/\.as-kpi \+ \.as-kpi\s*\{[^}]*border-left:\s*1px solid/);
  });
});

describe("#mainscreen-branding — was die Tafel NICHT zeigt", () => {
  it("enthält keine Build-DNA — Q4, und die Daten gibt es nicht", () => {
    /* `computeFormations` ist lauf-gebunden (App.jsx:616); für den Hub wird keine Formations-,
       Engine-, Element- oder Effekt-Zusammenfassung berechnet. Eine solche Zeile müsste erfunden
       werden, und eine erfundene Build-Identität führt den Spieler in die Irre. */
    for (const word of ["computeFormations", "buildDna", "build-dna", "BUILD DNA"]) {
      expect(code, `„${word}" ist in der Tafel aufgetaucht`).not.toContain(word);
    }
  });

  it("die Chipzeile bringt keinen neuen Katalog-Schlüssel mit", () => {
    /* Sie ist eine UMSTELLUNG der vorhandenen Zeilen, keine neue Aussage: `start.board.field` und
       `start.board.fx` tragen ihre Beschriftung schon im String. Ein neuer Schlüssel hier wäre eine
       Erweiterung des Auftrags, die niemand bestellt hat. */
    const attrs = code.slice(code.indexOf("as-deck-attrs"), code.indexOf("as-kpis"));
    /* Als MENGE, nicht als Liste: `music.next` steht zweimal da (aria-label und Titel-Rückfall),
       und das ist kein Schlüssel mehr, sondern derselbe zweimal. Gezählt wird, WELCHE Schlüssel die
       Zeile liest, nicht wie oft. */
    const keys = [...new Set([...attrs.matchAll(/t\("([\w.]+)"/g)].map((m) => m[1]))].sort();
    expect(keys, `Schlüssel in der Chipzeile: ${keys.join(", ")}`)
      .toEqual(["music.next", "music.playing", "start.board.field", "start.board.fx"]);
  });
});
