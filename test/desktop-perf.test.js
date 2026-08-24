import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { DESKTOP_BLOCK_AT } from "./desktopBreakpoint.js";

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
    /* Seit #cz-ruhe tragen die Werkstatt-Panels zusätzlich `as-ring-quiet` (stehender, angedeuteter Ring).
       Das ist ein MODIFIKATOR derselben Konstruktion — die zwei Boxen bleiben, nur die Animation fällt.
       Deshalb hier auf „beginnt mit cz-main as-ring" prüfen statt auf den exakten Klassenstring. */
    expect(src("ui/CustomizeScreen.jsx")).toMatch(/className="cz-main as-ring\b/);
    expect(src("ui/CustomizeScreen.jsx")).toMatch(/className="cz-side as-ring\b/);
  });
});

describe("#perf-blur — kein backdrop-filter auf dem Desktop", () => {
  const deskBlock = (() => {
    const at = css.indexOf(DESKTOP_BLOCK_AT);
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

describe("#skilltext — die Skill-Beschreibungen stehen ganz da", () => {
  it("Spaltenfluss statt Raster, keine Zeilen-Klemme", () => {
    /* Die Klemme auf drei Zeilen kuerzte 5-6 von 21 Texten auf 1920x1080 und 14 von 21 auf 1536x791,
       mitten im Satz. Sie war da, weil im RASTER die hoechste Zelle die Reihenhoehe bestimmt — im
       Spaltenfluss gibt es keine Reihe mehr, also auch keinen Grund zu klemmen. Wer auf `grid`
       zurueckstellt, MUSS die Klemme mitbringen, sonst reisst ein langer Skill die Reihe auf. */
    expect(css).toMatch(/\.up-skillgrid \{[^}]*columns:\s*320px/);
    expect(css).toMatch(/\.up-skillgrid > \* \{[^}]*break-inside:\s*avoid/);
    expect(css).not.toMatch(/\.up-skill-d \{[^}]*-webkit-line-clamp/);
  });
});

describe("#flach — der Baum haelt seinen Inhalt im Rahmen", () => {
  it("Panel klemmt, Knotenspalten scrollen, die Rasterzeile waechst nicht mit dem Bild", () => {
    expect(css).toMatch(/\.up-page \{[^}]*overflow:\s*hidden/);
    expect(css).toMatch(/\.up-vgrid \{[^}]*overflow-y:\s*auto/);
    // Der Kern: ohne die Zeilenangabe waechst die einzige Rasterzeile nach ihrem hoechsten Kind.
    expect(css).toMatch(/\.up-facbody \{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)/);
    /* #menu-rework M3 — hier stand `.up-chall { max-height: 100% }`, und das war der MECHANISMUS,
       nicht die Zusicherung: die Challenge war eine Karte IM Rasterkoerper, mit einem Deckbild, das
       auf flachen Fenstern hoeher war als der ganze Platz — der Deckel hielt sie im Rahmen.
       Die Karte ist gefallen (sie verbarg gemessen 151 px ihres eigenen Inhalts bei 1280 x 720); die
       Challenge ist jetzt eine Zeile am FUSS des Panels und steht gar nicht mehr im Raster.
       Damit haengt die Zusicherung an zwei anderen Stellen, und beide werden hier geprueft statt der
       alten Zeile: der Scroller, der die Resthoehe jetzt allein traegt, und die Gegenprobe, dass in
       den Rasterkoerper NICHTS ausser der Skill-Liste zurueckwandert. Die zweite ist die wichtigere —
       ein zweites Kind mit Bild waere genau der alte Fehler in neuem Gewand. */
    expect(css).toMatch(/\.up-skills \{[^}]*min-height:\s*0[^}]*overflow-y:\s*auto/);
    const jsx = src("ui/UpgradeScreen.jsx");
    const body = jsx.match(/className="up-facbody">([\s\S]*?)<\/div>/);
    expect(body, ".up-facbody nicht mehr gefunden").toBeTruthy();
    const kinder = [...body[1].matchAll(/<([A-Z][A-Za-z0-9]*)/g)].map((m) => m[1]);
    expect(kinder, "im Rasterkoerper steht etwas anderes als die Skill-Liste").toEqual(["SkillGrid"]);
  });
});

/* ============================================================
   #breite · #rd-scroll — die zwei Nähte vom 18.08.2026, die beide STUMM kaputtgehen.
   ============================================================ */
describe("#breite — alle gerahmten Screens stehen gleich breit im Bild", () => {
  it("Baum, Werkstatt, Leitfaden und Glossar tragen denselben Deckel wie Statistik/Bestenliste/Sieg", () => {
    /* Ohne den Deckel nehmen diese Screens die volle Fensterbreite und lesen sich als Vollbild,
       während Statistik, Bestenliste und Siegesbildschirm daneben als Block in der Mitte stehen.
       Auffallen würde das erst auf einem Schirm über 1816 px (1720 + 2 × 48 Rand) — also auf keinem
       der Messanker, die dieser Pass sonst benutzt. Genau so sind Leitfaden und Glossar beim Pass vom
       18.08.2026 durchgerutscht und erst am echten Gerät aufgefallen; deshalb stehen sie hier jetzt mit drin. */
    for (const sel of ["\\.st-card, \\.lb-card, \\.go-card", "\\.up-card", "\\.cz-card", "\\.gd-card", "\\.gl-card"]) {
      expect(css, `${sel} ohne Breiten-Deckel`).toMatch(
        new RegExp(`${sel} \\{[^}]*width:\\s*min\\(1720px,\\s*100%\\)`),
      );
    }
  });
});

describe("#rd-scroll — die Lauf-Details müssen scrollen können", () => {
  it("EIN Element trägt den Scroller, und die Karte klemmt nur, wenn es ein anderes tut", () => {
    /* Der Fehler, wie er ausgeliefert war: die Karte gab auf dem Desktop ihren eigenen Scroller ab
       (`overflow: visible`, sonst klippte sie die Kopfzeile) — und der Wurzelknoten hatte nie einen.
       Inhalt über der Fensterhöhe war damit unerreichbar.

       #menu-rework M7 — DIE ZUSICHERUNG IST DIE ERREICHBARKEIT, NICHT DER MECHANISMUS, und die alte
       Fassung nagelte den Mechanismus fest: „die Karte darf sich NICHT auf die Fensterhöhe klemmen".
       Seit der Kopf den Scroller verlassen hat, KLEMMT sie — und genau deshalb ist der Inhalt
       erreichbar: `.rd-body` scrollt darunter. Beide Bauarten sind richtig, und die falsche ist die
       dritte: geklemmte Karte OHNE inneren Scroller. Genau die schließt dieser Test jetzt aus.

       `align-items: flex-start` gehört weiter dazu: ein zentriertes Flex-Kind, das höher ist als sein
       Container, ragt nach OBEN heraus, und dorthin kommt kein Scrollbalken. */
    const rdRoot = css.match(/\.rd-root \{([^}]*)\}/);
    expect(rdRoot, ".rd-root-Regel fehlt").toBeTruthy();
    expect(rdRoot[1]).toMatch(/overflow-y:\s*auto/);
    expect(rdRoot[1]).toMatch(/align-items:\s*flex-start/);
    const cardRule = css.match(/\.rd-card \{([^}]*)\}/);
    expect(cardRule, ".rd-card-Regel fehlt").toBeTruthy();
    const geklemmt = /max-height:\s*(?!none)[^;]*;/.test(cardRule[1]);
    if (geklemmt) {
      const body = css.match(/\.rd-body \{([^}]*)\}/);
      expect(body, "die Karte klemmt, aber es gibt keinen .rd-body — der Inhalt wäre unerreichbar").toBeTruthy();
      expect(body[1], ".rd-body scrollt nicht — geklemmte Karte ohne inneren Scroller schneidet ab")
        .toMatch(/overflow-y:\s*auto/);
      expect(body[1], ".rd-body kann ohne `min-height: 0` nicht unter seine Inhaltshöhe schrumpfen")
        .toMatch(/min-height:\s*0/);
    }
  });

  it("die vier Panels tragen den Ring wie die Statistik-Sektionen", () => {
    const jsx = src("ui/RunDetail.jsx");
    for (const k of ["rd-c1", "rd-c2", "rd-c3", "rd-c4"]) {
      expect(jsx, `${k} ohne as-ring`).toMatch(new RegExp(`${k}[^"]*as-ring|as-ring[^"]*${k}`));
    }
    // Vier Panels, vier Bänder (das Paar prüft der Test ganz oben für alle Dateien zusammen).
    expect(jsx.match(/as-ring-run/g) || []).toHaveLength(4);
  });
});

describe("#kpi-kacheln — die Kennzahlen der Statistik", () => {
  /* Die Kacheln trugen bis #st-ruhe (19.08.2026) ihre eigene Panel-Fassung (Glasverlauf, Radius 14,
     Lichtkante). Sie teilen sie sich jetzt mit den übrigen sieben Kästen des Screens über `.st-box`;
     diese Regel darf deshalb NUR noch KPI-Eigenes setzen — die Form prüft `test/st-ruhe.test.js`.
     Was unverändert gilt, ist die Farbregel, und die steht bewusst weiter hier. */
  it("Polster und Ausrichtung bleiben, die Fläche liegt woanders", () => {
    const kpi = css.match(/\.st-kpis > div \{([^}]*)\}/);
    expect(kpi, ".st-kpis-Kachelregel fehlt").toBeTruthy();
    expect(kpi[1]).toMatch(/padding:/);
    expect(kpi[1]).toMatch(/text-align:\s*left/);
    expect(kpi[1], "zweite Fassung der Kachel — Fläche gehört an .st-box")
      .not.toMatch(/background|border|box-shadow/);
  });

  it("KEINE zusätzliche Farbe an den fünf Kennzahlen", () => {
    /* Auf diesem Schirm heißt Gold „deine Bestmarke" (s. #kante am Rekord-Lauf). Eine Kante in
       Deckfarbe oder fünf farbige Ränder nähmen dem Gold genau diese Aussage. */
    const kpi = css.match(/\.st-kpis > div \{([^}]*)\}/)[1];
    const box = css.match(/\.st-box \{([^}]*)\}/)[1];
    expect(kpi + box).not.toMatch(/--deck-a[12]|--c\b/);
  });
});

describe("#go-breit — der Siegesbildschirm hat kein Loch mehr, und das Brett keinen Zoom", () => {
  it("die Aufstellung läuft über alle drei Spalten, Brett und Liste nebeneinander", () => {
    /* Gemessen (2048 x 1071, echter Produktionspfad): die Aufstellung war 597 px hoch, ihre beiden Nachbarn
       317 und 329 — links daneben klaffte ein Loch von rund 620 px, durch das der Hauptschirm schien. */
    expect(css).toMatch(/\.go-layout \{[^}]*grid-column:\s*1\s*\/\s*-1/);
    expect(css).toMatch(/\.go-layout > div \{[^}]*grid-template-columns:\s*var\(--go-board-w/);
    expect(css).toMatch(/\.go-board \{[^}]*grid-column:\s*1/);
    /* Gebäudeliste UND Durchlauf-Graph liegen in EINEM Rasterfeld daneben. Als zwei Felder müsste das Brett
       zwei Zeilen überspannen — und ein überspannendes Element verteilt seine Mehrhöhe auf beide, was
       zwischen Liste und Graph eine 119-px-Lücke riss (gemessen). */
    expect(css).toMatch(/\.go-side\s+\{[^}]*grid-column:\s*2/);
    // Ohne Inhalt daneben gibt es keine zweite Spur — sonst steht das Brett an einem 1200-px-Nichts.
    expect(css).toMatch(/\.go-layout > div:not\(:has\(\.go-side > \*\)\)/);
    /* Die MITTLERE Spalte wird gezogen: ein Panel mit Luft am Fuß ist kein Loch.
       #go-spalten (19.08.2026): der BUILD wird ausdrücklich NICHT mehr mitgezogen. Er war das untere Ende
       einer Ein-Panel-Spalte und ist jetzt das OBERE von zweien (darunter die Score-Herkunft) — gezogen
       schöbe er sie an den Fuß und risse dasselbe Loch eine Zeile tiefer wieder auf. */
    expect(css).toMatch(/\.go-stats \{[^}]*align-self:\s*stretch/);
    expect(css, "der Build wird wieder mitgezogen — das Loch kommt zurück")
      .not.toMatch(/\.go-build[^{]*\{[^}]*align-self:\s*stretch/);
  });

  it("KEIN zoom am Brett — in keinem der beiden Screens", () => {
    /* Der Zoom skaliert das Koordinatensystem, `getBoundingClientRect()` liefert die gezoomten Masse, und
       die Gebaeude-Kontur wird im UNskalierten System gezeichnet: sie sass um exakt den Faktor daneben
       (gemessen 310x454 gegen 223x327 = 0,72). Der Hebel fuer die Groesse ist die BREITE. */
    expect(css).not.toMatch(/\.go-layout \.cg-root \{[^}]*zoom/);
    expect(css).not.toMatch(/\.rd-c3 \.cg-root \{[^}]*zoom:\s*\.\d/);
  });
});

describe("#lb-rahmen — die Bestenliste steht wie die anderen Screens im Bild", () => {
  it("beide Panels tragen den Ring und setzen sich von der Haarlinie ab", () => {
    expect(css).toMatch(/\.lb-tabs, \.lb-page \{[^}]*margin-top:\s*22px/);
    const jsx = src("ui/LeaderboardScreen.jsx");
    expect(jsx).toMatch(/lb-tabs as-ring/);
    expect(jsx).toMatch(/lb-page as-ring/);
  });

  it("Rahmen aussen, Scroller innen — sonst laeuft die Ringkante durch die Liste", () => {
    expect(css).toMatch(/\.lb-page \{[^}]*overflow:\s*hidden/);
    expect(css).toMatch(/\.lb-pagescroll \{[^}]*overflow-y:\s*auto/);
    // Unter 1280 px ist der Wrapper keine Box — dort scrollt weiter das Panel selbst.
    expect(css).toMatch(/^\.lb-pagescroll \{ display: contents; \}/m);
  });
});

describe("#ueberzug — alle Overlays liegen gleich stark auf dem Hauptschirm", () => {
  it("auch die Lauf-Details, sie waren als einzige deckend", () => {
    expect(css).toMatch(/\.rd-root \{[^}]*background:\s*rgba\(12,\s*12,\s*16,\s*\.94\)/);
  });
});

describe("#go-stiche — der Durchlauf-Graph steht unten, an EINER Stelle", () => {
  const jsx = src("ui/GameOver.jsx");
  it("oben nur schmal, unten nur breit — nie beides", () => {
    /* Als zugeklappter Balken über die halbe Screenbreite sagte er im Stats-Panel nichts, während rechts
       neben dem Brett über 400 px Panel leer standen. Gerendert wird immer genau einer der zwei Orte. */
    expect(jsx).toMatch(/\{!wide && <RunGraphs state=\{state\} sourceBar=\{false\} \/>\}/);
    expect(jsx).toMatch(/\{wide && hasTicks && \(/);
  });

  it("und er startet ZUGEKLAPPT (#stiche-zu)", () => {
    /* Bis 19.08.2026 stand hier `open` — mit der Begründung, der Graph verlängere „in einer eigenen
       Spalte nicht mehr den Screen". Am echten Lauf stimmt das nicht: eine Zeile je Durchlauf, ein
       langer Lauf hat zwölf und mehr, und seit #graph-gold ist eine Zeile 40 px hoch. Das sind über
       600 px, die den ganzen Screen nach unten ziehen. Die genaue Prüfung steht in go-ruhe.test.js. */
    const ticks = jsx.slice(jsx.indexOf('className="go-ticks"'));
    expect(ticks.slice(0, ticks.indexOf("/>") + 2)).not.toMatch(/\bopen\b/);
  });
});

describe("#leerlauf — ein sofort beendeter Lauf sieht aus wie ein langer, nur mit Nullen", () => {
  it("Verdienst und Score-Herkunft bleiben stehen", () => {
    const go = src("ui/GameOver.jsx");
    const rg = src("ui/RunGraphs.jsx");
    // Der Verdienst-Block hing an „irgendein Wert > 0" — bei 0 SP / 0 DP / 0 Score fiel er ganz weg.
    expect(go).toMatch(/\{!onboarding && earn && \(/);
    expect(go).not.toMatch(/earn\.sp > 0 \|\| earn\.dpGross > 0/);
    /* ScoreHerkunft gab bei Score 0 `null` zurück — sein Panel im Victory-Screen wird trotzdem gerendert,
       dort stand also ein leerer Kasten mit Rahmen. Jetzt zeigt es die Null. */
    expect(rg).toMatch(/if \(!score \|\| !rows\.length\) \{\s*\n\s*return \(/);
  });
});

describe("#unlock-fenster — Freischaltungen als eigenes Fenster, in jeder Breite", () => {
  const jsx = src("ui/GameOver.jsx");
  it("EIN Fenster in jeder Breite, und der Griff ist ein Bestätigen-Knopf", () => {
    /* Die alte Bahn lief über die volle Breite (1720 px) und trug darin zwei 74-px-Kacheln — auf dem
       Desktop ein leeres Band mit einem Fleck in der Mitte. Sie ist ersatzlos weg, auch am Handy: dort
       war sie eine Karte, die man beim Scrollen überliest. Kein zweiter Renderpfad. */
    expect(jsx).toMatch(/\{newUnlocks\.length > 0 && !unlockSeen && \(/);
    expect(jsx).not.toMatch(/go-skins/);
    expect(jsx).toMatch(/t\("common\.confirm"\)/);
    // Goldener Funkel-Rahmen wie an den Meta-Freischaltungen — kein zweiter Rahmen-Look.
    expect(jsx).toMatch(/ul-card as-legendary/);
  });
});

describe("#schriftdicke — Ausweg-Knopf und Ziel-Knopf tragen dieselbe Strichstärke", () => {
  it("die neutrale Beschriftung ist hell genug, dass sie nicht dünner AUSSIEHT", () => {
    /* Gemeldet als „andere Schriftdicke oder Font". Nachgemessen sind beide Knöpfe Geist 600 / 14 px mit
       identischen Glyphenbreiten — der Unterschied war allein die Helligkeit (0,49 gegen 0,72 relative
       Luminanz). Heller Text auf dunklem Grund wirkt fetter; der Ausweg sah dadurch dünner GESETZT aus
       statt nur leiser. Der Wächter rechnet die Luminanz nach, statt einen Hexwert festzunageln — die
       genaue Farbe darf sich ändern, die Lesbarkeit als „gleich dick" nicht. */
    const regel = css.match(/\.as-edge-neutral \{([^}]*)\}/);
    expect(regel, ".as-edge-neutral fehlt").toBeTruthy();
    const hex = (regel[1].match(/color:\s*#([0-9a-f]{6})/i) || [])[1];
    expect(hex, "keine Textfarbe an .as-edge-neutral").toBeTruthy();
    const kanal = (i) => { const s = parseInt(hex.slice(i * 2, i * 2 + 2), 16) / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    const lum = 0.2126 * kanal(0) + 0.7152 * kanal(1) + 0.0722 * kanal(2);
    expect(lum, `#${hex} ist zu dunkel (${lum.toFixed(3)})`).toBeGreaterThan(0.6);
  });
});
