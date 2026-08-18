import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================
   #desktop-screens — Statistik · Bestenliste · Ranked · Victory ab 1400 px, als Quelltext-Ratsche.

   Wie bei den Menü-Overlays gibt es KEINEN zweiten Renderpfad: dasselbe JSX in jeder Breite, index.css
   entscheidet. Festgenagelt sind die Stellen, die stumm kaputtgehen — es kompiliert weiter, es sieht fast
   gleich aus, nur das Layout rutscht:

     1. Die Klammer `lb-cockpit` muss unter 1400 px `display: contents` sein, sonst bekommt die Handy-Fassung
        eine zusätzliche Box im Fluss.
     2. Die Spaltenplätze der Statistik stehen AUSDRÜCKLICH im CSS. Ohne sie entscheidet die Reihenfolge im
        JSX, was wo landet — und die ändert sich, sobald jemand eine Sektion einfügt.
     3. Die letzte Rasterzeile ist `1fr`. Ohne sie verteilt das Raster die Mehrhöhe der spannenden Spalten auf
        die Zeilen der kurzen Spalte und reißt dort eine Lücke auf (derselbe Fall wie im Willkommen-Dialog).
     4. Die ZWEISPALTIGE Bestenliste hängt an `.lb-page`. Dieselbe Komponente (`GlobalLeaderboard`) steht auch
        im Hub und im Victory-Screen in schmalen Spalten — die dürfen NICHT mitgehen.
     5. Victory: die Aufstellung steht offen (`open={wide}`) UND scrollt innen. Ohne den inneren Deckel zieht
        das 30-Karten-Brett den ganzen Bildschirm über den Schirm hinaus.
     6. Die geerbten Fallen des Desktop-Passes: kein `backdrop-filter` (#perf-blur) und die Abräum-Regel der
        Karte mit ALLEN DREI Klassen (#rahmen, Spezifität gegen `[data-skin="crt"]`).
   ============================================================ */

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const css = read("index.css");

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

describe("#desktop-screens — die Klammer ist unterhalb von 1400 px keine Box", () => {
  it("lb-cockpit steht als `display: contents` in der BASIS", () => {
    const rule = base.match(/^\.lb-cockpit\s*\{([^}]*)\}/m);
    expect(rule, "Basis-Regel für lb-cockpit nicht mehr gefunden").toBeTruthy();
    expect(rule[1]).toMatch(/display:\s*contents/);
  });

  it("die desktop-only Zeilen sind am Handy ausgeblendet", () => {
    // Auskunftszeile der Statistik und die Zweitzeilen der Navigationsspalte gibt es nur ab 1400 px.
    expect(read("ui/StatsScreen.jsx")).toMatch(/className="st-readout hidden min-\[1400px\]:block"/);
    expect(read("ui/LeaderboardScreen.jsx")).toMatch(/className="lb-tab-s hidden min-\[1400px\]:block"/);
  });
});

describe("#desktop-screens — Statistik", () => {
  it("die vier Blöcke haben feste Spaltenplätze (nicht auto-flow)", () => {
    for (const [sec, col] of [["overview", "1 / -1"], ["best", "1"], ["works", "1"], ["runs", "2"], ["picked", "3"]]) {
      const rule = deskBlock.match(new RegExp(`\\.st-sec\\[data-sec="${sec}"\\][^{]*\\{([^}]*)\\}`));
      expect(rule, `Platz für data-sec="${sec}" fehlt`).toBeTruthy();
      expect(rule[1], `data-sec="${sec}" soll in Spalte ${col}`).toMatch(new RegExp(`grid-column:\\s*${col.replace(/[/]/g, "\\/")}`));
    }
  });

  it("die letzte Rasterzeile ist 1fr (sonst reißt es die linke Spalte auseinander)", () => {
    const rule = deskBlock.match(/\.st-card\s*\{([^}]*)\}/);
    expect(rule, ".st-card-Regel nicht gefunden").toBeTruthy();
    expect(rule[1]).toMatch(/grid-template-rows:[^;]*1fr\s*;/);
  });

  it("Skills und Perks stehen in der schmalen Spalte untereinander", () => {
    expect(read("ui/StatsScreen.jsx")).toMatch(/className="st-picked2 grid sm:grid-cols-2/);
    expect(deskBlock).toMatch(/\.st-picked2\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  });
});

describe("#desktop-screens — Bestenliste und Ranked", () => {
  it("die zweispaltige Liste ist an .lb-page gebunden", () => {
    for (const m of deskBlock.matchAll(/^\s*([^{}\n]*\.lb-rows[^{}\n]*)\{/gm)) {
      expect(m[1], `Regel ohne .lb-page-Bindung: ${m[1].trim()}`).toMatch(/\.lb-page/);
    }
    // 10 + 10: die Zeilenzahl ist der halbe Umfang der Liste (TOP_N = 20).
    const rule = deskBlock.match(/\.lb-page \.lb-rows\s*\{([^}]*)\}/);
    expect(rule, "Regel für die zweispaltige Liste fehlt").toBeTruthy();
    expect(rule[1]).toMatch(/grid-template-rows:\s*repeat\(10, auto\)/);
    expect(rule[1]).toMatch(/grid-auto-flow:\s*column/);
    expect(read("ui/LeaderboardScreen.jsx")).toMatch(/const TOP_N = 20/);
  });

  it("neben dem Cockpit bleibt die Liste einspaltig", () => {
    // 420 px gehen an das Cockpit — für zwei Spalten Liste bliebe zu wenig.
    expect(deskBlock).toMatch(/\.lb-page:has\(\.lb-cockpit\) \.lb-rows\s*\{[^}]*grid-auto-flow:\s*row/);
  });

  it("die Reiter werden zur Navigationsspalte und der Schließen-Knopf behält seinen Platz", () => {
    expect(deskBlock).toMatch(/\.lb-tabs\s*\{[^}]*flex-direction:\s*column/);
    // Der Kopf hat nur zwei Kinder; ohne festen Platz landet der Knopf in der 1fr-Spalte und zieht sich breit.
    expect(deskBlock).toMatch(/\.lb-head > button\s*\{[^}]*grid-column:\s*3/);
  });
});

describe("#desktop-screens — Victory", () => {
  const jsx = read("ui/GameOver.jsx");

  it("die Aufstellung steht offen und scrollt INNEN", () => {
    expect(jsx).toMatch(/const wide = useIsWide\(\)/);
    expect(jsx).toMatch(/className="go-layout as-ring[^"]*" open=\{wide\}/);
    // Ventil: das Panel bekommt einen Deckel (die Gebäudeliste unter dem Brett kann lang werden).
    expect(deskBlock).toMatch(/\.go-layout > div[^{]*\{[^}]*max-height:\s*\d+px[^}]*overflow-y:\s*auto/);
  });

  it("Freischaltungen und Skins laufen über die volle Breite", () => {
    for (const cls of ["go-unlocks", "go-skins"]) {
      const rule = deskBlock.match(new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`));
      expect(rule, `Platz für .${cls} fehlt`).toBeTruthy();
      expect(rule[1]).toMatch(/grid-column:\s*1 \/ -1/);
    }
  });

  it("die drei Spalten sind entkoppelt — nur die Aufstellung wandert", () => {
    /* Der gemeldete Fehler: eine aufgeklappte Perk-/Skill-Beschreibung im Build (Spalte 3) schob die
       Score-Herkunft in Spalte 1 mit nach unten, weil beide in derselben zweiten Rasterzeile lagen. Seit
       `go-col1` ist die linke Spalte EINE Zelle; wachsen darf nur, was unter dem Build steht. Fällt die
       Klammer weg, ist das Springen zurück — ohne dass etwas kaputtgeht. */
    expect(jsx).toMatch(/<div className="go-col1">/);
    const rule = deskBlock.match(/\.go-col1\s*\{([^}]*)\}/);
    expect(rule, ".go-col1 hat keinen Platz im Raster").toBeTruthy();
    expect(rule[1]).toMatch(/grid-column:\s*1/);
    // Build und Aufstellung teilen sich als EINZIGE eine Spalte (dort ist das Verschieben gewollt).
    expect(deskBlock).toMatch(/\.go-build\s*\{[^}]*grid-column:\s*3/);
    expect(deskBlock).toMatch(/\.go-layout\s*\{[^}]*grid-column:\s*3/);
  });

  it("das Brett steht als Ganzes im Panel (verkleinert, nicht gescrollt)", () => {
    // `zoom` und nicht `max-width`: die Kartenhöhe hängt am Inhalt, ein schmaleres Raster wurde nur schmaler.
    expect(read("ui/CardGrid.jsx")).toMatch(/className="cg-root relative grid gap-2\.5"/);
    expect(deskBlock).toMatch(/\.go-layout \.cg-root[^{]*\{[^}]*zoom:/);
  });

  it("der Screen steht als zentrierter Block, nicht randverankert", () => {
    /* Die Höhe des Victory-Screens schwankt stark mit dem Lauf. Randverankert sammelt sich die Restluft
       unten und der Screen liest sich abgeschnitten; zentriert verteilt sie sich oben UND unten. Die
       Zentrierung kommt aus der Overlay-Wurzel (`items-center`) — sie darf hier NICHT auf `stretch`
       gezogen werden, so wie es die anderen drei Screens tun. */
    expect(jsx).toMatch(/className="go-root fixed inset-0 overlay-root[^"]*items-center/);
    const stretch = deskBlock.match(/^\s*([^{}\n]*)\{[^}]*align-items:\s*stretch\s*!important/gm) || [];
    for (const m of stretch) expect(m, "go-root darf nicht auf stretch").not.toMatch(/\.go-root/);
  });
});

describe("#ueberzug — ein Wert für alle Overlays über dem Hauptschirm", () => {
  it("kein Overlay-Wurzelknoten steht mehr auf den alten 82 %", () => {
    /* Die 82 % waren zusammen mit `blur(10px)` abgenommen; seit #perf-blur gibt es den Blur nicht mehr und
       der Hub las sich durch die Panels. Ein neuer Screen, der wieder 82 % setzt, fällt hier auf. */
    expect(deskBlock, "alter Überzugswert ist zurück").not.toMatch(/rgba\(12, 12, 16, \.82\)/);
    const werte = [...deskBlock.matchAll(/rgba\(12, 12, 16, (\.\d+)\) !important/g)].map((m) => m[1]);
    expect(werte.length, "keine Überzugs-Regel gefunden").toBeGreaterThan(2);
    expect([...new Set(werte)], "die Overlays sollen EINEN Wert teilen").toEqual([".94"]);
  });
});

describe("#desktop-screens — Regeln und Lauf-Details", () => {
  it("die Modifikatoren stehen nebeneinander: links positiv, rechts negativ", () => {
    expect(read("ui/LeaderboardScreen.jsx")).toMatch(/className="rg-pos grid gap-1\.5"/);
    expect(deskBlock).toMatch(/\.lb-page \.rg-pos\s*\{[^}]*grid-column:\s*1/);
    expect(deskBlock).toMatch(/\.lb-page \.rg-neg\s*\{[^}]*grid-column:\s*2/);
  });

  it("die Lauf-Details sind derselbe Screen wie nach einem Lauf", () => {
    const rd = read("ui/RunDetail.jsx");
    // Drei Spalten-Klammern, und die Aufstellung steht offen — wie im Victory-Screen.
    for (const cls of ["rd-c1", "rd-c2", "rd-c3"]) expect(rd).toMatch(new RegExp(`className="${cls}[ "]`));
    expect(rd).toMatch(/open=\{wide\}/);
    // Der Grund für die Klammern: jede Spalte ist EINE Zelle (sonst springt es wie im Victory-Screen).
    for (const cls of ["rd-c1", "rd-c2", "rd-c3"]) {
      const rule = deskBlock.match(new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`));
      expect(rule, `${cls} hat keinen Platz im Raster`).toBeTruthy();
    }
  });
});

describe("#desktop-screens — die geerbten Fallen", () => {
  it("#perf-blur: alle drei Overlay-Wurzeln überstimmen ihren Inline-Blur mit `none`", () => {
    const rule = deskBlock.match(/\.st-root, \.lb-root, \.go-root\s*\{([^}]*)\}/);
    expect(rule, "gemeinsame Wurzel-Regel nicht gefunden").toBeTruthy();
    expect(rule[1]).toMatch(/backdrop-filter:\s*none\s*!important/);
  });

  it("#rahmen: die Abräum-Regel nennt ALLE DREI Klassen", () => {
    for (const cls of ["st-card", "lb-card", "go-card"]) {
      expect(css, `${cls}: die Regel muss beide Panel-Klassen nennen`)
        .toMatch(new RegExp(`\\.${cls}\\.as-panel\\.as-panel-deck`));
      expect(css, `${cls}: die alte, wirkungslose Zwei-Klassen-Fassung ist zurück`)
        .not.toMatch(new RegExp(`\\.${cls}\\.as-panel \\{`));
    }
  });
});
