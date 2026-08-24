import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DESKTOP_BLOCK_AT, DT_RX } from "./desktopBreakpoint.js";

/* ============================================================
   #desktop-screens — Statistik · Bestenliste · Ranked · Victory ab 1280 px, als Quelltext-Ratsche.

   Wie bei den Menü-Overlays gibt es KEINEN zweiten Renderpfad: dasselbe JSX in jeder Breite, index.css
   entscheidet. Festgenagelt sind die Stellen, die stumm kaputtgehen — es kompiliert weiter, es sieht fast
   gleich aus, nur das Layout rutscht:

     1. Die Klammer `lb-cockpit` muss unter 1280 px `display: contents` sein, sonst bekommt die Handy-Fassung
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
  const at = css.indexOf(DESKTOP_BLOCK_AT);
  if (at < 0) return "";
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return "";
})();
const base = deskBlock ? css.replace(deskBlock, "") : css;

describe("#desktop-screens — die Klammer ist unterhalb von 1280 px keine Box", () => {
  it("lb-cockpit steht als `display: contents` in der BASIS", () => {
    const rule = base.match(/^\.lb-cockpit\s*\{([^}]*)\}/m);
    expect(rule, "Basis-Regel für lb-cockpit nicht mehr gefunden").toBeTruthy();
    expect(rule[1]).toMatch(/display:\s*contents/);
  });

  it("die desktop-only Zeilen sind am Handy ausgeblendet", () => {
    /* Die Zweitzeilen der Navigationsspalte gibt es nur ab 1280 px.

       #menu-rework M7 — DIE STATISTIK HAT KEINE AUSKUNFTSZEILE MEHR. Sie stand in der Aktionszone,
       wo der Kopf-Kanon nur Aktionen zulaesst, und ist die Unterzeile geworden. An ihre Stelle
       treten Eyebrow und Unterzeile — dieselbe Zusicherung („was es nur ab 1280 px gibt, ist darunter
       AUS DEM LAYOUT"), anderer Mechanismus: `display: none` in der Basis statt `hidden dt:block` im
       Klassen-Literal. Das ist die Bauart, die M3 fuer denselben Fall am Baum gewaehlt hat, und
       geprueft wird sie hier genauso: beide Teile stehen im JSX UND sind in der BASIS aus. */
    const stats = read("ui/StatsScreen.jsx");
    for (const hook of ["st-eyebrow", "st-sub"]) {
      expect(stats, `${hook} steht nicht im JSX — der Kopf-Kanon fehlt`).toMatch(new RegExp(`className="${hook}"`));
    }
    const versteckt = base.match(/^\.st-eyebrow[^{]*\{([^}]*)\}/m);
    expect(versteckt, "Basis-Regel fuer den Statistik-Kopf nicht gefunden").toBeTruthy();
    expect(versteckt[0], "st-sub faehrt nicht mit — eine Haelfte des Kopfs stuende am Handy").toContain("st-sub");
    expect(versteckt[1]).toMatch(/display:\s*none/);
    expect(read("ui/LeaderboardScreen.jsx")).toMatch(new RegExp(`className="lb-tab-s hidden ${DT_RX}block"`));
  });
});

describe("#desktop-screens — Statistik", () => {
  it("jeder Block hat einen festen Platz (nicht auto-flow)", () => {
    /* #menu-rework M7 — DREI Bloecke stehen selbst im Raster, ZWEI stehen in einem Stapel, der
       selbst im Raster steht. Die Zusicherung ist unveraendert: kein Block findet seinen Platz ueber
       die Reihenfolge im JSX, sonst entscheidet die naechste eingefuegte Sektion neu, was wo landet.
       Was sich geaendert hat, ist wo der Platz von „Bestes Build" und „Was am besten laeuft" steht —
       an ihrer Spalte, weil eine Spalte jetzt ein Stapel ist und keine zwei Rasterzeilen
       (Restluft gehoert an den Fuss einer Spalte, nie zwischen zwei Panels). */
    for (const [sec, col] of [["overview", "1 / -1"], ["runs", "2"], ["picked", "3"]]) {
      const rule = deskBlock.match(new RegExp(`\\.st-sec\\[data-sec="${sec}"\\][^{]*\\{([^}]*)\\}`));
      expect(rule, `Platz für data-sec="${sec}" fehlt`).toBeTruthy();
      expect(rule[1], `data-sec="${sec}" soll in Spalte ${col}`).toMatch(new RegExp(`grid-column:\\s*${col.replace(/[/]/g, "\\/")}`));
    }
    const stapel = deskBlock.match(/\.st-col1\s*\{([^}]*)\}/);
    expect(stapel, "der Stapel der ersten Spalte fehlt").toBeTruthy();
    expect(stapel[1], ".st-col1 hat keinen festen Platz — dann entscheidet die JSX-Reihenfolge").toMatch(/grid-column:\s*1/);
    /* Und die zwei Bloecke stehen wirklich DARIN: ein `.st-col1` mit festem Platz, das die zwei
       Sektionen nicht enthaelt, ist eine leere Klammer und nagelt nichts fest. */
    const jsx = read("ui/StatsScreen.jsx");
    const stapelAt = jsx.indexOf('className="st-col1"');
    expect(stapelAt, "st-col1 steht nicht im JSX").toBeGreaterThan(-1);
    for (const sec of ["best", "works"]) {
      expect(jsx.indexOf(`id="${sec}"`), `data-sec="${sec}" steht nicht mehr im Stapel der ersten Spalte`)
        .toBeGreaterThan(stapelAt);
    }
  });

  it("die Restluft sammelt sich am FUSS der ersten Spalte, nicht zwischen ihren Panels", () => {
    /* Der alte Wortlaut war „die letzte Rasterzeile ist 1fr", und die Begruendung dahinter war:
       ohne sie verteilt das Raster die Mehrhoehe der spannenden Spalten auf BEIDE Zeilen der kurzen
       Spalte und reisst dort eine Luecke auf.

       #menu-rework M7 — DIESE FEHLERART GIBT ES NICHT MEHR, weil die kurze Spalte keine zwei
       Rasterzeilen mehr hat: sie ist ein Flex-Stapel, und ein Stapel kann seine Kinder gar nicht
       auseinanderziehen — die Restluft landet an seinem Fuss. Das ist die staerkere Zusicherung, und
       sie wird hier gepruef statt der Rasterzeile, die sie ersetzt hat. Die `1fr`-Zeile bleibt
       zusaetzlich verlangt: sie ist das, was dem Rumpf ueberhaupt eine bestimmte Hoehe gibt, ohne
       die die Lauf-Liste ihre Spalte nicht messen kann. */
    const stapel = deskBlock.match(/\.st-col1\s*\{([^}]*)\}/);
    expect(stapel, ".st-col1-Regel nicht gefunden").toBeTruthy();
    expect(stapel[1], "die erste Spalte ist wieder ein Raster — dann zieht es ihre Panels auseinander")
      .toMatch(/display:\s*flex/);
    expect(stapel[1]).toMatch(/flex-direction:\s*column/);
    for (const [sel, name] of [[/\.st-card\s*\{([^}]*)\}/, ".st-card"], [/\.st-body\s*\{([^}]*)\}/, ".st-body"]]) {
      const rule = deskBlock.match(sel);
      expect(rule, `${name}-Regel nicht gefunden`).toBeTruthy();
      const rows = rule[1].match(/grid-template-rows:([^;]*);/);
      expect(rows, `${name} ohne feste Zeilen`).toBeTruthy();
      expect(rows[1].trim().split(/\s+(?![^(]*\))/).pop(), `${name}: die letzte Zeile nimmt die Restluft nicht auf`)
        .toMatch(/1fr/);
    }
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
    // #lb-rahmen: das Cockpit-Raster hängt seit dem Rahmen-Umbau am SCROLLER, nicht mehr am Panel.
    expect(deskBlock).toMatch(/\.lb-pagescroll:has\(\.lb-cockpit\) \.lb-rows\s*\{[^}]*grid-auto-flow:\s*row/);
  });

  it("die Reiter werden zur Navigationsspalte", () => {
    expect(deskBlock).toMatch(/\.lb-tabs\s*\{[^}]*flex-direction:\s*column/);
  });

  /* #menu-rework M8 — UMGESCHRIEBEN AUF DIE INVARIANTE, und der alte Wortlaut sagt, warum das nötig
     war: „Der Kopf hat nur zwei Kinder; ohne festen Platz landet der Knopf in der 1fr-Spalte" —
     geprüft wurde `grid-column: 3`. Das ist eine SCHREIBWEISE, kein Verhalten. Der Kopf hat jetzt
     vier Kinder und zwei Spuren, der Knopf steht in Spur 2, und die Zusicherung des Kanons ist
     dieselbe geblieben: SCHLIESSEN IST DAS LETZTE ELEMENT, UND NICHTS STEHT JE RECHTS DAVON
     (design-sprache.md §2). Die 3 hätte den Kanon gebrochen und wäre grün geblieben.

     Deshalb RECHNET dieser Wächter jetzt: er zählt die Spuren des Kopf-Rasters und verlangt, dass
     Schließen in der LETZTEN steht — und dass keine andere Kopf-Regel eine Spur nennt, die weiter
     rechts liegt. Ohne die zweite Hälfte hieße „letzte Spur" nur „irgendeine Spur mit der höchsten
     Nummer, die jemand hingeschrieben hat".

     Und er verlangt, dass es EINE Regel für beide Screens ist. Der Kanon gilt laut §2 für alle
     Overlays; zwei Regelsätze für dieselbe Zusicherung sind die Doppelpflege, vor der conventions.md
     §1 Regel 2 warnt — und genau daraus war die alte 3 entstanden. */
  it("Schließen ist das letzte Element des Kopfes — in EINER Regel für beide Screens", () => {
    /* Spuren zählen, nicht Leerzeichen zählen: `minmax(0, 1fr)` trägt selbst ein Komma und ein
       Leerzeichen. Zeichenweise mit Klammertiefe, wie der Wertleser in panel-tokens. */
    const trackCount = (value) => {
      let depth = 0, n = 0, inTrack = false;
      for (const ch of value.trim()) {
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        if (depth === 0 && /\s/.test(ch)) { inTrack = false; continue; }
        if (!inTrack) { n++; inTrack = true; }
      }
      return n;
    };
    const head = deskBlock.match(/^\s*\.st-head, \.lb-head \{([^}]*)\}/m);
    expect(head, "das Kopf-Raster steht nicht mehr als EINE Regel für beide Screens").toBeTruthy();
    expect(head[1], "der Kern des Kanons fehlt: die Aktionszone hängt an der Oberkante").toMatch(/align-items:\s*start/);
    const cols = /grid-template-columns:\s*([^;]+);/.exec(head[1]);
    expect(cols, "das Kopf-Raster nennt keine Spuren mehr").toBeTruthy();
    const spuren = trackCount(cols[1]);
    expect(spuren).toBeGreaterThan(1);

    const close = deskBlock.match(/^\s*\.st-close, \.lb-head > button \{([^}]*grid-column[^}]*)\}/m);
    expect(close, "Schließen steht nicht mehr als EINE Regel für beide Screens").toBeTruthy();
    const at = /grid-column:\s*(\d+)/.exec(close[1]);
    expect(at, "Schließen hat keinen festen Platz mehr — es landet in der 1fr-Spalte").toBeTruthy();
    expect(Number(at[1]), `Schließen steht in Spur ${at && at[1]} von ${spuren} — es ist nicht das letzte Element`).toBe(spuren);
    expect(close[1], "Schließen spannt den Titelblock nicht mehr").toMatch(/grid-row:\s*1 \/ span/);

    /* Nichts rechts von Schließen: jede andere Regel des Kopfes muss weiter links liegen. */
    const rechtsDavon = [];
    for (const m of deskBlock.matchAll(/^\s*([^{}\n]*(?:st-head|lb-head|st-eyebrow|lb-eyebrow|st-sub|lb-sub)[^{}\n]*)\{([^}]*)\}/gm)) {
      if (/st-close/.test(m[1])) continue;
      const c = /grid-column:\s*(\d+)/.exec(m[2]);
      if (c && Number(c[1]) >= spuren) rechtsDavon.push(`${m[1].trim()} -> grid-column: ${c[1]}`);
    }
    expect(rechtsDavon, `steht in Schließens Spur oder rechts davon:\n  ${rechtsDavon.join("\n  ")}`).toEqual([]);
  });
});

describe("#desktop-screens — Victory", () => {
  const jsx = read("ui/GameOver.jsx");

  it("die Aufstellung steht offen — Brett und Gebäudeliste NEBENEINANDER", () => {
    expect(jsx).toMatch(/const wide = useIsWide\(\)/);
    expect(jsx).toMatch(/className="go-layout as-ring[^"]*" open=\{wide\}/);
    /* #go-breit: Der Deckel mit innerem Scroller ist weg — das Panel ist nicht mehr die Summe aus Brett UND
       Liste, seit die Liste daneben steht. Die zwei Klammern im JSX sind dafür die Voraussetzung. */
    expect(jsx).toMatch(/className="go-board"/);
    expect(jsx).toMatch(/className="go-blist/);
    expect(deskBlock).toMatch(/\.go-layout > div \{[^}]*grid-template-columns:\s*var\(--go-board-w/);
  });

  it("Meta-Freischaltungen laufen über die volle Breite", () => {
    // `go-skins` steht hier nicht mehr: frisch freigeschaltete Skins sind seit #unlock-fenster ein
    // eigenes Fenster in jeder Breite, keine Bahn im Screen.
    for (const cls of ["go-unlocks"]) {
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
    // #go-breit: die Aufstellung liegt seit 18.08.2026 UNTER allen dreien, über die volle Breite.
    expect(deskBlock).toMatch(/\.go-layout \{[^}]*grid-column:\s*1\s*\/\s*-1/);
  });

  it("das Brett steht als Ganzes im Panel — über die SPALTENBREITE, nicht über zoom", () => {
    /* Die alte Fassung nahm `zoom`, weil „die Kartenhöhe am Inhalt hängt". Das stimmt für diese Kacheln
       nicht: sie sind ab 640 px quadratisch, die Höhe folgt der Breite (nachgemessen 646/440 = 1,47).
       Und `zoom` kostete die Gebäude-Kontur: `getBoundingClientRect()` liefert gezoomte Maße, gezeichnet
       wird im unskalierten System — der Rahmen lag um exakt den Faktor daneben. */
    expect(read("ui/CardGrid.jsx")).toMatch(/className="cg-root relative grid gap-2\.5"/);
    expect(deskBlock).not.toMatch(/\.go-layout \.cg-root[^{]*\{[^}]*zoom:/);
    expect(deskBlock).toMatch(/\.go-layout \.cg-root \{[^}]*width:\s*100%/);
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
