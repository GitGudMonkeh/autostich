import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DESKTOP_BLOCK_AT } from "./desktopBreakpoint.js";
import { inlineValueOf, overridesInline } from "./inlineOverride.js";

/* ============================================================
   #go-ruhe (19.08.2026) — der Siegesbildschirm im Desktop-Ton.

   Fünfter Screen nach der Liste in docs/engineering/conventions.md („Entscheidungsregeln"), gebaut wie
   #st-ruhe davor. Vier Nähte brauchen eine Ratsche, weil sie alle still reißen — der Screen sieht
   danach für sich genommen weiter richtig aus, nur eben nicht mehr wie seine vier Nachbarn:

   · `as-ring-quiet` an den Panels — verliert eines den Modifikator, holt es sich den laufenden Ring
     zurück (dieselbe Begründung wie in #up-ruhe und #st-ruhe).
   · `.go-box` an den `MENU_PANEL`-Kästen — die Konstante wird INLINE gesetzt; wird sie an der Regel
     nicht neutralisiert, bliebe die flache Fassung wirkungslos, ohne dass im Quelltext etwas fehlt.
     (#menu-rework M1: WIE sie neutralisiert wird, steht nicht mehr hier fest — s. inlineOverride.js.)
   · die Kennzahlenreihe im Kopf ist DESKTOP-ONLY (`wide`) — fällt die Bedingung weg, trägt das Handy
     plötzlich vier beschriftete Werte neben einer 40-px-Zahl.
   · das Bestleistungs-Panel hängt an `prevBests`, dem Schnappschuss VOR `recordRun`. Wird er aus
     App.jsx entfernt oder nach der Wertung genommen, zeigt jede Zeile „Neu" — und zwar plausibel
     genug, dass es niemandem auffällt.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("src/index.css");
const go = read("src/ui/GameOver.jsx");
const app = read("src/App.jsx");
const modal = read("src/ui/modalStyle.jsx");
const storage = read("src/game/storage.js");
// Kommentarfreie Fassung: die Begründungen nennen die alten Werte absichtlich beim Namen.
const cssBare = css.replace(/\/\*[\s\S]*?\*\//g, "");
const goBare = go.replace(/\/\*[\s\S]*?\*\//g, "");
const deskBlock = (src) => {
  const at = src.indexOf(DESKTOP_BLOCK_AT);
  let depth = 0;
  for (let j = src.indexOf("{", at); j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(at, j + 1);
  }
  return "";
};
const desk = deskBlock(cssBare);
const radius = (sel) => {
  const alle = desk.match(new RegExp(`(^|,)\\s*${sel}\\s*(,[^{}]*)?\\{[^}]*border-radius:\\s*[\\d.]+px`, "gm")) || [];
  const m = alle.length ? alle[alle.length - 1].match(/border-radius:\s*([\d.]+)px/) : null;
  return m ? Number(m[1]) : null;
};

describe("#go-ruhe — der Ring steht still", () => {
  it("jedes Panel des Screens trägt den Modifikator", () => {
    /* Verdienst · Bestleistungen · Herkunft · Build · Kennzahlen · Aufstellung. Ein `as-ring` ohne
       `as-ring-quiet` wäre das einzige wandernde Band auf einem sonst stillen Screen. */
    const ringe = goBare.match(/className="go-[a-z]+ as-ring[^"]*"/g) || [];
    expect(ringe.length, "Zahl der Ring-Panels hat sich geändert").toBe(6);
    for (const r of ringe) expect(r, `Panel ohne as-ring-quiet: ${r}`).toMatch(/\bas-ring-quiet\b/);
  });

  it("jedes Ring-Panel bringt sein Maskenkind mit", () => {
    /* #perf-ring: `.as-ring` allein malt nichts — der Rahmen entsteht erst durch `.as-ring-run`.
       SIEBEN, nicht sechs: Das Score-Panel (#go-score-panel) ist das siebte Ring-Panel. In der Zählung
       darüber taucht es nicht auf, weil seine Klasse dynamisch ist (Rekord → Gold) und deshalb aus einer
       Zeichenkette mit Platzhalter kommt statt aus einem festen `className="…"`. */
    expect((go.match(/className="as-ring-run"/g) || []).length).toBe(7);
  });

  it("das Score-Panel trägt denselben stillen Ring wie die anderen", () => {
    /* Eigener Test, weil seine Klasse dynamisch ist (s. oben) und die Zählung darüber sie nicht sieht. */
    expect(goBare).toMatch(/go-heroblock as-ring as-ring-quiet/);
  });
});

describe("#go-ruhe — EINE Kachelform für alles im Panel", () => {
  it("die MENU_PANEL-Kästen tragen die gemeinsame Klasse", () => {
    const kaesten = go.match(/<div[^>]*style=\{\{?\s*\.{0,3}\s*MENU_PANEL/g) || [];
    expect(kaesten.length, "Zahl der MENU_PANEL-Kästen hat sich geändert").toBeGreaterThan(0);
    for (const k of kaesten) expect(k, `Kasten ohne go-box: ${k}`).toMatch(/\bgo-box\b/);
  });

  it("Kästen stehen auf demselben Radius wie die Baum-Kacheln", () => {
    const baum = radius("\\.up-vnode");
    expect(baum, "der Radius der Baum-Kacheln ist nicht mehr auffindbar").toBe(6);
    expect(radius("\\.go-card \\.go-box"), ".go-box läuft mit einem anderen Radius").toBe(baum);
    expect(radius("\\.go-bestrow"), ".go-bestrow läuft mit einem anderen Radius").toBe(baum);
  });

  it("die Panels behalten ihre 14 px — sie sind der Rahmen, nicht der Inhalt", () => {
    expect(radius("\\.go-layout")).toBe(14);
  });

  it("die flache Fassung schlägt das INLINE gesetzte MENU_PANEL", () => {
    /* #menu-rework M1 — geprüft wird die INVARIANTE, nicht der Mechanismus: am Element gewinnt der
       flache Wert, egal ob über `!important` oder darüber, dass die Regel die Variable umdefiniert,
       die der Inline-Wert liest. Der Wert wird dabei aus modalStyle.jsx GEHOLT statt hier noch
       einmal hingeschrieben — steht dort eines Tages etwas anderes, prüft dieser Wächter das
       andere. Begründung ausführlich in test/inlineOverride.js. */
    const box = desk.match(/\.go-card \.go-box\s*\{[^}]*\}/)[0];
    for (const prop of ["background", "border"]) {
      const inline = inlineValueOf(modal, "MENU_PANEL", prop);
      expect(inline, `MENU_PANEL setzt ${prop} nicht mehr inline — dann prüft dieser Test nichts`).toBeTruthy();
      expect(overridesInline(box, prop, inline),
        `${prop} wird an .go-card .go-box nicht neutralisiert — MENU_PANEL steht inline (${inline}) `
        + `und gewänne. Nötig ist entweder !important, oder die Regel definiert die Variable um, `
        + `die der Inline-Wert liest.`).toBeTruthy();
    }
  });

  it("Kästen MIT Farbkante behalten sie (#kante)", () => {
    /* Die Sammelregel setzt `border` mit `!important` und überschriebe damit auch die inline
       gesetzte `borderLeft` der Motor-Kennzahlen. `--gob` holt den Ton zurück. */
    expect(desk).toMatch(/\.go-card \.go-box\.go-box-c\s*\{[^}]*border-left:[^;]*var\(--gob/);
    expect(go, "die Motor-Kachel reicht ihren Kantenton nicht durch").toMatch(/"--gob":\s*m\.color/);
  });
});

describe("#go-ruhe — die zwei Aktionen tragen die Kachelform", () => {
  it("Fläche, Rahmen und Schein der Kanten-Knöpfe fallen", () => {
    const btn = desk.match(/\.go-actions > button\s*\{[^}]*\}/)[0];
    for (const prop of ["background", "border", "box-shadow"])
      expect(btn, `${prop} ohne !important — as-edge-strong steht als Klasse und gewänne`)
        .toMatch(new RegExp(`${prop}:[^;]*!important`));
  });

  it("unterschieden wird allein über die Schriftfarbe", () => {
    /* Gold heißt auf diesem Schirm „deine Bestmarke" (#kante am Rekord-Chip) und trägt das auch
       ohne gefüllte Fläche. „Neuer Lauf" ist immer der LETZTE Knopf — „Menü" hängt an `onMenu`. */
    expect(desk).toMatch(/\.go-actions > button:last-child\s*\{\s*color:\s*#d4a63a/);
  });
});

describe("#go-ruhe — die Kennzahlenreihe im Kopf ist Desktop-only", () => {
  it("die Handy-Fassung steht als eigener Zweig daneben", () => {
    /* Die Reihe ersetzt die 55-%-opake Zeile NUR ab 1280 px; am Handy bleibt die kompakte Zeile.
       Ohne die Verzweigung stünden vier beschriftete Werte neben einer 40-px-Zahl. */
    /* #go-kopf: Die zwei Fassungen stehen seit dem Kopfumbau an VERSCHIEDENEN Stellen im DOM — die
       Kennzahlenreihe oben im Kopf, die kompakte Zeile unten beim Score. Deshalb zwei Bedingungen
       statt eines Ternärs. */
    expect(goBare).toMatch(/\{wide && \(\s*<div className="go-kpi">/);
    expect(goBare, "die kompakte Handy-Zeile ist verschwunden")
      .toMatch(/\{!wide && \(\s*<div className="text-body-5 opacity-55 mt-2 flex items-center justify-center/);
  });

  it("die Reihe steht nur im Desktop-Block", () => {
    expect(desk, ".go-kpi fehlt im Desktop-Block").toMatch(/\.go-kpi\s*\{/);
    expect(cssBare.replace(desk, ""), ".go-kpi steht auch außerhalb — das trifft das Handy").not.toMatch(/\.go-kpi\s*\{/);
  });
});

describe("#go-ruhe — Bestleistungen vergleichen gegen den Stand VOR dem Lauf", () => {
  it("der Schnappschuss entsteht aus prevProfile, nicht aus dem frischen Profil", () => {
    /* `recordRun` überschreibt das Profil, bevor der Endscreen rendert. Käme der Vergleichswert von
       dort, wäre er immer schon gleich hoch wie der Lauf — jede Zeile hieße „Neu". */
    expect(app).toMatch(/setPrevBests\(\{[^}]*prevProfile\.bestScore/);
    expect(app, "prevBests erreicht den Endscreen nicht").toMatch(/prevBests=\{prevBests\}/);
  });

  it("das Panel bleibt ohne Schnappschuss weg statt falsch zu rechnen", () => {
    expect(goBare).toMatch(/\{wide && prevBests &&/);
  });

  it("der beste Einzelstich ist ein PROFIL-Rekord, kein Listenwert", () => {
    /* Er stand bis hierher nur je Lauf in der Highscore-Liste (Top 20). Ohne den Profilwert
       verglichen die Bestleistungen gegen die Liste statt gegen die eigene Bestmarke. */
    expect(storage, "bestTrickScore fehlt im DEFAULT_PROFILE").toMatch(/bestTrickScore:\s*0,/);
    expect(storage, "bestTrickScore wird beim Werten nicht fortgeschrieben")
      .toMatch(/bestTrickScore:\s*Math\.max\(n0\(p\.bestTrickScore\), n0\(record\.bestTrickScore\)\)/);
  });
});

describe("#go-ruhe — der Stich-Graph sitzt am Fuß der Spalte", () => {
  it("die Spalte wird auf die Höhe des Bretts gezogen", () => {
    /* Ohne `stretch` steht die Spalte auf `start` (Raster-Vorgabe) und `margin-top: auto` hat
       nichts zu verteilen — der Graph bliebe, wo er war. */
    expect(desk).toMatch(/\.go-side\s*\{[^}]*align-self:\s*stretch/);
  });

  it("nur MIT Gebäudeliste — sonst wäre das Loch nur oben statt unten", () => {
    /* #stiche-zu: an den Fuß gedrückt wird er nur AUFGEKLAPPT. Zugeklappt ist er eine 35-px-Zeile, die
       dort allein unter einem Loch stünde — dasselbe Problem, nur andersherum. */
    expect(desk).toMatch(/\.go-blist ~ \.go-ticks:has\(\.rg-perTrick\[open\]\)\s*\{[^}]*margin-top:\s*auto/);
  });
});

describe("#go-ruhe — was ausdrücklich NICHT angefasst ist", () => {
  it("die Kanten-Familie behält ihre Kante, nur der Radius zieht mit", () => {
    /* Regel 5: die Linkskante ist ein projektweites Signal (#kante). Der Desktop-Block darf die
       SP-/DP-Kacheln eckiger machen, aber ihre `--c` nicht überschreiben. */
    expect(desk).toMatch(/\.go-earn \.as-edge-card,[\s\S]{0,200}?border-radius:\s*6px/);
    expect(desk, "der Desktop-Block färbt die Kante um").not.toMatch(/\.go-earn[^{]*\{[^}]*--c:/);
  });

  it("der blaue Rahmen der Gebäudeliste bleibt — er gehört dem Architekten", () => {
    const blist = desk.match(/\.go-blist\s*\{[^}]*\}/g) || [];
    for (const r of blist) expect(r, "der Desktop-Block überschreibt den Architekt-Rahmen").not.toMatch(/border(-color)?:/);
  });
});

/* ============================================================
   #go-spalten / #graph-gold (19.08.2026) — Nachtrag zum selben Screen.

   Der Screen hatte nach dem Bestleistungs-Panel drei Panels links und je eines in der Mitte und
   rechts; `align-self: stretch` zog die kurzen auf die Höhe der langen und riss dabei an einem
   echten Lauf gemessen 340 bzw. 555 px Loch. Drei Nähte halten die Lösung zusammen, und alle drei
   reißen still — der Screen sieht danach weiter plausibel aus, nur wieder leer.
   ============================================================ */
const sparkline = read("src/ui/Sparkline.jsx");
const graphs = read("src/ui/RunGraphs.jsx");

/* Findet zu dem `<div` an `von` den Index seines `</div>`. Bewusst ein kleiner Scanner und kein
   Regex: die Tags dieser Datei tragen JSX-Ausdrücke mit `>` darin (`onClick={() => …}`), an denen
   jedes `[^>]*` zerbricht, und es gibt selbstschließende `<div … />` (die Meilenstein-Marken), die
   ein reiner Tag-Zähler als Öffner mitzählen würde. Beides führt zu einem Test, der grün ist, weil
   er falsch zählt. */
function schliesstBei(src, von) {
  let i = von, tiefe = 0;
  while (i < src.length) {
    if (src.startsWith("</div>", i)) { if (--tiefe === 0) return i; i += 6; continue; }
    if (src.startsWith("<div", i)) {
      let j = i + 4, klammern = 0, selbst = false;
      for (; j < src.length; j++) {
        const c = src[j];
        if (c === "{") klammern++;
        else if (c === "}") klammern--;
        else if (c === ">" && klammern === 0) { selbst = src[j - 1] === "/"; break; }
      }
      if (!selbst) tiefe++;
      i = j + 1; continue;
    }
    i++;
  }
  return -1;
}

describe("#go-spalten — je zwei Panels pro Spalte", () => {
  it("die Herkunft steht in Spalte 3 unter dem Build", () => {
    expect(desk).toMatch(/\.go-build\s*\{[^}]*grid-column:\s*3;\s*grid-row:\s*5/);
    expect(desk).toMatch(/\.go-origin\s*\{[^}]*grid-column:\s*3;\s*grid-row:\s*6/);
  });

  it("die zwei linken Spalten spannen beide Zeilen — sonst sitzt die Herkunft in einer eigenen", () => {
    expect(desk).toMatch(/\.go-col1\s*\{[^}]*grid-row:\s*5\s*\/\s*span 2/);
    expect(desk).toMatch(/\.go-stats\s*\{[^}]*grid-row:\s*5\s*\/\s*span 2/);
    // Die Aufstellung rutscht damit eine Rasterzeile tiefer.
    expect(desk).toMatch(/\.go-layout\s*\{[^}]*grid-row:\s*7/);
  });

  it("die Herkunft ist DIREKTES Kind des Rasters, nicht Kind der Klammer", () => {
    /* Ein Rasterkind muss direktes Kind des Rasters sein — läge die Herkunft weiter in `go-col1`,
       wäre `grid-column: 3` wirkungslos und sie stünde still wieder links, ohne dass irgendwo
       etwas fehlt. Geprüft wird deshalb strukturell: die Klammer muss VOR ihr schließen.
       (Tags zählen genügt nicht — die Zahl der `<div` sagt nichts über die Verschachtelung.) */
    const marke = goBare.indexOf('className="go-col1"');
    expect(marke, "go-col1 gibt es nicht mehr").toBeGreaterThan(-1);
    const zu = schliesstBei(goBare, goBare.lastIndexOf("<div", marke));
    expect(zu, "die Klammer go-col1 schließt nirgends").toBeGreaterThan(-1);
    expect(goBare.indexOf('className="go-origin'), "die Herkunft steckt noch in go-col1")
      .toBeGreaterThan(zu);
  });

  it("der Build wird NICHT mehr gezogen", () => {
    /* Als oberes von zwei Panels seiner Spalte schöbe er die Herkunft sonst an den Fuß — dasselbe
       Loch, eine Zeile tiefer. */
    expect(desk).toMatch(/\.go-stats\s*\{[^}]*align-self:\s*stretch/);
    expect(desk).not.toMatch(/\.go-build[^{]*\{[^}]*align-self:\s*stretch/);
  });
});

describe("#graph-gold — die Score-Kurve", () => {
  it("Fläche, Endpunkt und Gitterton hängen ALLE an der Achsen-Fassung", () => {
    /* `voll` ist die Desktop-Fassung. Fällt eine der Bedingungen weg, bekommt die 40 px hohe
       Kachel-Linie am Handy eine Fläche, die sie zudeckt. */
    expect(sparkline).toMatch(/\{voll && \(\s*<defs>/);
    expect(sparkline).toMatch(/\{voll && current\.length >= 2 && \(/);
    expect(sparkline).toMatch(/stroke=\{voll \? "rgba\(150, 150, 170, \.12\)" : "#ffffff"\}/);
  });

  it("nur der LAUF bekommt die Fläche, nicht der Rekord", () => {
    /* Zwei Flächen übereinander wären Matsch, und der Rekord ist ausdrücklich der leisere
       (55 % Deckkraft seit jeher). */
    expect(sparkline).toMatch(/fill=\{`url\(#\$\{gid\}\)`\}/);
    /* Der Rekord bleibt eine reine Linie. Geprüft wird beides ausdrücklich: `fill="none"` steht dran,
       und nirgends im Rekord-Pfad taucht ein Verlauf auf. (Ein blosses „kein fill=" wäre falsch — er
       TRÄGT ein fill, nämlich none.) */
    expect(sparkline).toMatch(/d=\{path\(record\)\} fill="none"/);
    expect(sparkline).not.toMatch(/path\(record\)[^>]*url\(#/);
    expect(sparkline).toMatch(/stroke="#8a7de0" strokeWidth="1\.5" strokeOpacity="0\.55"/);
    /* Eigene Verlaufs-Kennung je Instanz: Endscreen und Lauf-Details können gleichzeitig im DOM stehen
       (die Bestenliste lässt sich aus dem Endscreen öffnen), und bei zwei gleich benannten <defs>
       gewinnt still das erste. Heute sind beide identisch — die Falle schnappt erst zu, wenn einer
       von ihnen die Deckfarbe zieht. */
    expect(sparkline, "feste Verlaufs-ID — zwei Instanzen teilen sie sich").not.toMatch(/id="sl-run"/);
    expect(sparkline).toMatch(/useId\(\)/);
  });
});

describe("#graph-gold — der Durchlauf-Graph", () => {
  it("Sieg und kein Sieg sind KLASSEN, nicht nur Inline-Farben", () => {
    /* Ohne die Klassen ließe sich die Farbe nur an `WIN`/`LOSS` ändern — und die IST die
       Handy-Fassung. */
    expect(graphs).toMatch(/rg-bar \$\{t\.won \? "rg-w" : "rg-l"\}/);
    expect(graphs, "die Inline-Farbe fehlt — dann ist das Handy mit umgefärbt")
      .toMatch(/background: t\.won \? WIN : LOSS/);
  });

  it("die Balkenfarbe schlägt die INLINE gesetzte", () => {
    /* Regex-LITERALE, kein `new RegExp` aus einem Template-String: dort wäre `\s` nur ein `s` und
       `\.` nur ein Punkt — der Test liefe grün, ohne irgendetwas zu prüfen. */
    const w = desk.match(/\.rg-perTrick \.rg-w\s*\{[^}]*\}/);
    const l = desk.match(/\.rg-perTrick \.rg-l\s*\{[^}]*\}/);
    expect(w, "die Sieg-Regel fehlt").not.toBeNull();
    expect(l, "die Kein-Sieg-Regel fehlt").not.toBeNull();
    for (const [sel, rule] of [["rg-w", w[0]], ["rg-l", l[0]]])
      expect(rule, `${sel} ohne !important — die Inline-Farbe gewänne`).toMatch(/background:[^;]*!important/);
  });

  it("die Balken stehen auf einer Grundlinie und sind 40 px hoch", () => {
    expect(desk).toMatch(/\.rg-perTrick \.rg-bars\s*\{[^}]*height:\s*40px/);
    expect(desk).toMatch(/\.rg-perTrick \.rg-bars\s*\{[^}]*border-bottom:\s*1px solid/);
  });

  it("der Anteilsbalken ist am Handy unsichtbar, nicht weggelassen", () => {
    /* Er trägt die zweite Lesart (Gewicht des Durchlaufs im Lauf); unterhalb 1280 px ist die Zahl
       daneben 9 px gesetzt und es gibt keinen Platz dafür. */
    expect(cssBare.replace(desk, ""), "die Grundregel fehlt — der Balken erschiene am Handy")
      .toMatch(/^\.rg-share \{ display: none; \}/m);
    expect(desk).toMatch(/\.rg-perTrick \.rg-share\s*\{[^}]*display:\s*block/);
    expect(graphs).toMatch(/cycleScore \/ runScore/);
  });
});

describe("#stiche-zu — der Durchlauf-Graph startet zugeklappt", () => {
  it("der Endscreen erzwingt das Aufklappen nicht mehr", () => {
    /* Die Annahme davor war, der Graph verlängere „in einer eigenen Spalte nicht mehr den Screen".
       Am echten Lauf stimmt sie nicht: eine Zeile je Durchlauf, ein langer Lauf hat zwölf und mehr,
       mit 40 px Zeilenhöhe sind das über 600 px. */
    const ticks = goBare.slice(goBare.indexOf('className="go-ticks"'));
    const tag = ticks.slice(0, ticks.indexOf("/>") + 2);
    expect(tag, "die Ticks rendern gar kein RunGraphs mehr").toMatch(/<RunGraphs/);
    expect(tag, "`open` erzwingt den offenen Zustand wieder").not.toMatch(/\bopen\b/);
  });

  it("der Griff sieht aus wie einer", () => {
    /* Zugeklappt ist der Griff das EINZIGE, was von dem Panel zu sehen ist — ohne Zeiger und Marke
       wäre er eine Überschrift, die nicht verrät, dass etwas dahinter liegt. */
    const s = desk.match(/\.go-ticks \.rg-perTrick > summary\s*\{[^}]*\}/)[0];
    expect(s).toMatch(/cursor:\s*pointer/);
    expect(s, "der Griff ist keine Kachel mehr").toMatch(/border-radius:\s*6px/);
    expect(desk, "die Marke fehlt").toMatch(/\.go-ticks \.rg-perTrick > summary::before\s*\{[^}]*content:/);
    expect(desk, "die Marke dreht sich beim Aufklappen nicht")
      .toMatch(/\.go-ticks \.rg-perTrick\[open\] > summary::before\s*\{[^}]*rotate\(90deg\)/);
  });
});

describe("#stiche-breite — ein Ein-Stich-Durchlauf ist ein Balken, kein Block", () => {
  it("die Balkenbreite rechnet gegen den LÄNGSTEN Durchlauf", () => {
    /* Mit `flex-1` streckte sich jede Zeile auf die volle Breite: ein Durchlauf mit einem einzigen
       Stich wurde zu einem Block über die ganze Zeile (im Spiel gesehen: C12, 716 Punkte).
       Der Nenner ist bewusst der längste Durchlauf des LAUFS, nicht die Zahl der Balken dieser Zeile —
       nur so sind die Balken über alle Zeilen gleich breit und die Zeilenlänge sagt etwas. */
    expect(graphs, "der Nenner wird nicht mehr berechnet").toMatch(/const maxTricks = Math\.max\(1, \.\.\.log\.map/);
    expect(graphs, "die Bahn reicht den Nenner nicht durch").toMatch(/"--rg-max": maxTricks/);
    expect(desk).toMatch(/\.rg-perTrick \.rg-bar\s*\{[^}]*flex:\s*0 0 calc\(\(100% \+ 1px\) \/ var\(--rg-max/);
  });

  it("am Handy bleibt es bei flex-1", () => {
    expect(cssBare.replace(desk, ""), "die Breitenrechnung steht auch außerhalb — das trifft das Handy")
      .not.toMatch(/--rg-max/);
    expect(graphs, "die Handy-Fassung hat ihr flex-1 verloren").toMatch(/rg-bar \$\{[^}]*\} flex-1/);
  });
});

describe("#go-kopf — die Score-Zahl steht unter der Haarlinie", () => {
  it("sie liegt in der linken KLAMMER, nicht in einer eigenen Rasterzeile", () => {
    /* Rasterzeilen gelten über alle drei Spalten: eine Zeile für den Score allein hätte in Spalte 2
       und 3 dieselbe Höhe leer gelassen und die Panels dort um die Höhe der Zahl nach unten geschoben.
       In der Klammer gehört sie zur Spalte und schiebt nur, was darunter in DIESER Spalte steht. */
    const marke = goBare.indexOf('className="go-col1"');
    const zu = schliesstBei(goBare, goBare.lastIndexOf("<div", marke));
    /* Ohne Anführungszeichen gesucht: Die Klasse steht seit #go-score-panel in einer Zeichenkette mit
       Platzhalter (Rekord → Gold), nicht mehr in einem festen `className="…"`. */
    const block = goBare.indexOf("go-heroblock");
    expect(block, "der Score-Block gibt es nicht mehr").toBeGreaterThan(-1);
    expect(block, "der Score-Block steht außerhalb der linken Klammer").toBeLessThan(zu);
    expect(block, "der Score-Block steht vor der Klammer").toBeGreaterThan(marke);
    expect(desk, "die Klammer streckt sich nicht — dann hat das letzte Panel nichts zu füllen")
      .toMatch(/\.go-col1 \{[^}]*align-self:\s*stretch/);
  });

  it("der Kopf reicht seine Kinder ins Raster durch", () => {
    /* Sonst wären Augenbraue und Kennzahlenreihe Flex-Kinder EINER Hülle und ließen sich nicht auf
       zwei Spalten verteilen. Am Handy bleibt `go-hero` ein normaler Block. */
    expect(desk).toMatch(/\.go-hero \{ display: contents; \}/);
    expect(cssBare.replace(desk, ""), "display:contents steht auch außerhalb — das trifft das Handy")
      .not.toMatch(/\.go-hero \{ display: contents/);
    expect(desk).toMatch(/\.go-eyebrow \{[^}]*grid-column:\s*1/);
  });

  it("die Kennzahlen stehen mittig über ihrem Panel", () => {
    const kpi = desk.match(/\.go-kpi \{[^}]*\}/)[0];
    expect(kpi).toMatch(/justify-self:\s*center/);
    expect(kpi, "zwei Fassungen derselben Regel — die spätere gewinnt still")
      .not.toMatch(/justify-self:\s*start/);
    expect((desk.match(/\.go-kpi \{/g) || []).length, "es gibt mehr als EINE .go-kpi-Regel").toBe(1);
  });

  it("am Handy bleibt der Score zentriert und in derselben Reihenfolge", () => {
    /* `go-col1` ist unterhalb 1280 px `display: contents` — die Kinder des Blocks stehen dort im Fluss
       genau da, wo sie vorher im zentrierten `go-hero` standen. */
    expect(cssBare).toMatch(/\.go-col1 \{ display: contents; \}|, \.go-col1 \{ display: contents; \}/);
    /* `text-center` MUSS bleiben: Es ist die Handy-Fassung des Blocks (ab 1280 px stellt `.go-heroblock`
       auf linksbündig). Die Ring-Klassen dazwischen tragen unter 1280 px keine Darstellung. */
    expect(goBare).toMatch(/go-heroblock[^`"]*text-center/);
    const block = goBare.slice(goBare.indexOf("go-heroblock"));
    const score = block.indexOf("go-score"), rec = block.indexOf("go-rec"), klein = block.indexOf("text-body-5 opacity-55");
    expect(score).toBeLessThan(rec);
    expect(rec, "die Kleinschrift-Zeile steht nicht mehr unter dem Chip").toBeLessThan(klein);
  });
});

describe("#graph-fuellt — der Score-Verlauf nimmt den Rest der Spalte", () => {
  it("gemessen wird der Kasten, nicht geraten", () => {
    /* `preserveAspectRatio` kann den Graphen unten verankern oder verzerren, aber nicht wachsen
       lassen — wachsen kann er nur über eine höhere viewBox, und die steht im Markup. */
    expect(go).toMatch(/function useFuellHoehe/);
    expect(go, "die Umrechnung Breite→viewBox fehlt").toMatch(/Math\.round\(\(620 \* h\) \/ w\)/);
    expect(sparkline, "die Sparkline nimmt die gemessene Höhe nicht an").toMatch(/vh = 0 \}\)/);
    expect(sparkline).toMatch(/Math\.round\(vh\) \|\| 250/);
  });

  it("der Messkasten kann schrumpfen — sonst wächst der Graph bei jedem Frame", () => {
    /* Ohne `min-height: 0` nimmt ein Flex-Kind mindestens seine Inhaltsgröße ein; die Messung bekäme
       dann immer die Inhaltshöhe zurück statt des freien Platzes. */
    /* Regex-LITERALE: in einem Template-String wäre `\.` nur ein Punkt (also ein Platzhalter) und
       `\{` nur eine Klammer — der Test liefe dann grün, ohne die richtige Regel gelesen zu haben. */
    for (const treffer of [desk.match(/\.go-chart \{[^}]*\}/), desk.match(/\.go-chartbox \{[^}]*\}/)]) {
      expect(treffer, "die Regel fehlt ganz").not.toBeNull();
      expect(treffer[0], "ohne min-height: 0 misst der Kasten die Inhaltshöhe").toMatch(/min-height:\s*0/);
    }
  });

  it("die Höhe kommt aus EINER Quelle", () => {
    /* Gestreckt UND gemessen wäre doppelt: beim ersten Frame steht die viewBox noch auf 250, das
       gestreckte SVG stünde dann mit Rand oben und unten. */
    expect(desk).not.toMatch(/\.go-chartbox > svg/);
  });
});

describe("#achsen-luft — Achsenwerte und Achsentitel überlappen nicht mehr", () => {
  it("der linke Rand trägt beide Spalten", () => {
    /* Gemessen: „200.000" ist in 10-px-Mono 42 px breit und endet rechtsbündig bei padL−10 = 66,
       beginnt also bei 24. Der gedrehte Titel belegt die Spalte 4,5–17,5. */
    expect(sparkline).toMatch(/const padL = voll \? 76 : 3/);
    expect(sparkline).toMatch(/<text x=\{padL - 10\}/);
    expect(sparkline).toMatch(/x=\{11\}[\s\S]{0,200}rotate\(-90 11 /);
  });
});

describe("#karten-skala — die Kartenbeschriftung misst sich an der Kachel", () => {
  const grid = read("src/ui/CardGrid.jsx");

  it("Wert, ×-Faktor und Kürzel haben einen Haken", () => {
    /* Ohne Klassen ließe sich die Größe nur über Tailwinds `sm:` steuern — und das misst am
       VIEWPORT, nicht an der Kachel. Genau daher kam die Überlappung. */
    for (const cls of ["cg-val", "cg-mult", "cg-lab"])
      expect(grid, `${cls} fehlt im Markup`).toMatch(new RegExp(`className="${cls}[ "]`));
  });

  /* Regex-LITERALE statt `new RegExp` aus einem Template-String — dort wäre `\s` nur ein `s`. */
  const regeln = {
    "cg-val": desk.match(/\.cg-root \.cg-val\s+\{[^}]*\}/),
    "cg-mult": desk.match(/\.cg-root \.cg-mult\s+\{[^}]*\}/),
    "cg-lab": desk.match(/\.cg-root \.cg-lab\s+\{[^}]*\}/),
  };

  it("die Kachel ist der Bezugsrahmen, die Größen rechnen in cqw", () => {
    expect(desk).toMatch(/\.cg-root \.as-tile \{ container-type: inline-size; \}/);
    for (const [cls, treffer] of Object.entries(regeln)) {
      expect(treffer, `${cls} hat gar keine Regel`).not.toBeNull();
      expect(treffer[0], `${cls} rechnet nicht in cqw`).toMatch(/font-size:\s*clamp\([^)]*cqw[^)]*\)/);
    }
  });

  it("nach oben gedeckelt auf die bisherigen Desktop-Größen — größer wird nichts", () => {
    /* Die Klammer ist der Punkt: die Schrift wird kleiner, wo die Kachel eng ist, aber nie größer als
       das, was vorher stand (24 / 12 / 11). Gemessen bei 67 px Kachelbreite (Brett 360 px auf flachen
       Fenstern, fünf Spalten): alt standen ×-Faktor und Kürzel 0,9 px INEINANDER, jetzt 9 px auseinander. */
    const deckel = { "cg-val": 24, "cg-mult": 12, "cg-lab": 11 };
    for (const [cls, max] of Object.entries(deckel))
      expect(Number(regeln[cls][0].match(/,\s*([\d.]+)px\)/)[1]), `${cls} darf höchstens ${max}px werden`).toBe(max);
  });

  it("am Handy greift nichts davon", () => {
    /* Dort ist die Kachel ~64 px breit und trägt seit jeher die kleinen Tailwind-Werte — die
       Container-Rechnung würde daran nichts verbessern und wäre nur ein zweiter Weg zum selben Ziel. */
    expect(cssBare.replace(desk, ""), "die Skala steht auch außerhalb des Desktop-Blocks")
      .not.toMatch(/container-type: inline-size|\.cg-val|\.cg-mult|\.cg-lab/);
  });
});
