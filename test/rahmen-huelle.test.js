import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================
   #rahmen-huelle + #run-dialoge + #graph-achsen (18.08.2026) — als Quelltext-Ratsche.

   Ein Muster zieht sich durch den ganzen Desktop-Pass: Panels, die die verfügbare FLÄCHE füllen statt
   ihren INHALT zu umschließen. Bei vollen Screens fällt das nicht auf — es fällt genau dann auf, wenn
   wenig drinsteht, und das ist der Zustand, in dem ein neuer Spieler den Screen zuerst sieht:

     · Bestenliste mit drei Einträgen: 760-px-Rahmen um 350 px Inhalt (gemessen 414 px leer).
     · Gebäude-Liste mit EINEM Gebäude: 1220 px breiter Rahmen um eine 300-px-Karte.
     (NICHT dazu gehört `.go-stats`/`.go-build`: die zwei werden bewusst auf die Zeilenhöhe gezogen — ein
     Panel mit Luft am Fuß ist kein Loch, #go-breit. Die Luft dort füllt die Achsen-Fassung des Graphen.)

   Beide sind derselbe Griff — `height: auto` / `align-self: start` / Spuren aus der Anzahl statt aus
   der Breite — und beide gehen still kaputt, weil ein gefüllter Screen weiter richtig aussieht.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("src/index.css");
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

describe("#rahmen-huelle — die Rahmen enden am Inhalt", () => {
  it("Bestenliste/Statistik: die Karte wird nicht mehr auf Fensterhöhe gezogen", () => {
    expect(deskBlock).toMatch(/\.st-root,\s*\.lb-root\s*\{[^}]*align-items:\s*start/);
    const card = deskBlock.match(/\.lb-card\s*\{([^}]*)\}/);
    expect(card, ".lb-card-Regel nicht mehr gefunden").toBeTruthy();
    /* Die Karte setzt ihre Höhe INLINE (`min(88vh, 760px)`) — `max-height` allein überstimmt eine
       explizite `height` nicht. Ohne `auto !important` blieb der Rahmen bei 760 px stehen. */
    expect(card[1], "height: auto !important fehlt — der Inline-Wert gewinnt sonst")
      .toMatch(/height:\s*auto\s*!important/);
    expect(card[1], "ohne max-height wächst die Karte bei langen Listen aus dem Fenster")
      .toMatch(/max-height:\s*100%/);
  });

  it("Bestenliste: der Rumpf endet am letzten Eintrag, nicht am Rahmen", () => {
    const body = deskBlock.match(/\.lb-body\s*\{([^}]*)\}/);
    expect(body, ".lb-body-Regel nicht mehr gefunden").toBeTruthy();
    expect(body[1], "`stretch` war der alte Zustand — genau der, der den leeren Rahmen erzeugt hat")
      .toMatch(/align-self:\s*start/);
  });

  it("Victory: die Gebäude-Spalten kommen aus der ANZAHL, nicht aus der Breite", () => {
    /* `auto-fill` legt leere Spuren an (1220 px Rahmen um ein Gebäude); `auto-fit` klappt zusammen mit
       `fit-content` auf EINE Spalte zusammen und macht aus sieben Gebäuden eine Liste. Beides gemessen. */
    const rule = deskBlock.match(/\.go-blist\s*>\s*\.grid\s*\{([^}]*)\}/);
    expect(rule, ".go-blist-Raster nicht mehr gefunden").toBeTruthy();
    expect(rule[1]).toMatch(/repeat\(var\(--gob-cols/);
    expect(rule[1], "auto-fill/auto-fit sind beide falsch — s. Kommentar").not.toMatch(/auto-fi(ll|t)/);
    expect(deskBlock).toMatch(/\.go-blist\s*\{[^}]*width:\s*fit-content/);
    // Und die Variable muss auch gesetzt werden, sonst greift der Rückfall auf 1 Spalte.
    expect(read("src/ui/GameOver.jsx")).toMatch(/"--gob-cols":\s*Math\.min\(3,\s*archBuildings\.length\)/);
  });
});

describe("#run-dialoge — Beenden und Neustarten", () => {
  const rc = read("src/ui/RunConfirm.jsx");

  it("die Handy-Fassung behält Reihenfolge und Aktionsleiste (#362)", () => {
    /* Am Handy ist „Knöpfe oben, Erklärung darunter" richtig — man soll zum Bestätigen nicht scrollen
       müssen. Der Desktop-Zweig darf diese Fassung nicht ersetzen, nur ergänzen. */
    expect(rc).toMatch(/<ActionBar pad=\{5\} bg=\{STICKY_HEAD_BG\} className="mt-3">/);
    expect(rc).toMatch(/\{t\("app\.abort\.help"\)\}/);
    expect(rc, "beide Dialoge hängen am Breiten-Gate").toMatch(/const wide = useIsWide\(\);[\s\S]*const wide = useIsWide\(\);/);
  });

  it("auf dem Desktop trägt jede Option ihre Folge selbst", () => {
    for (const key of ["app.abort.save.sub", "app.abort.end.sub", "app.keepPlaying.sub"]) {
      expect(rc, `${key} wird nicht gerendert`).toMatch(new RegExp(`t\\("${key.replace(/\./g, "\\.")}"\\)`));
      for (const cat of ["src/i18n/de.js", "src/i18n/en.js"])
        expect(read(cat), `${key} fehlt in ${cat}`).toMatch(new RegExp(`"${key.replace(/\./g, "\\.")}"`));
    }
    // Der gemeinsame Hilfetext gehört NUR in den Handy-Zweig — sonst stünde dieselbe Sache viermal da.
    expect(rc.match(/app\.abort\.help/g) || []).toHaveLength(1);
  });

  it("keine Tastatur-Kürzel im Knopf — und dann auch kein stiller Enter-Handler", () => {
    /* Die zwei Chips („↵" / „Esc") waren die einzigen Zeichen auf dem Dialog und zogen den Blick auf die
       Mechanik statt auf die Wahl (Entscheidung des Users, 19.08.). Mit ihnen MUSS der Enter-Handler
       fallen: ein unangekündigter Tastendruck, der einen laufenden Lauf beendet, ist schlechter als gar
       keiner. Escape schließt weiter über den `useEscape`-Pfad des Aufrufers — Systemverhalten, unbeschriftet. */
    expect(rc, "Kbd-Chip wieder da").not.toMatch(/Kbd|kbd=/);
    expect(rc, "Enter-Handler ohne sichtbares Kürzel").not.toMatch(/useEnter|"Enter"/);
    expect(rc, "useEffect wird ohne den Handler nicht mehr gebraucht").not.toMatch(/useEffect/);
  });

  it("die zwei Breiten stehen in der CSS, nicht als Zahl im JSX", () => {
    expect(deskBlock).toMatch(/\.rc-wide\s*\{[^}]*max-width:\s*\d+px/);
    expect(deskBlock).toMatch(/\.rc-narrow\s*\{[^}]*max-width:\s*\d+px/);
    expect(rc).toMatch(/wide \? "rc-wide" : "max-w-xs"/);
    expect(rc).toMatch(/wide \? "rc-narrow" : "max-w-xs"/);
  });
});

describe("#graph-achsen — der Score-Verlauf mit Achsen", () => {
  const sp = read("src/ui/Sparkline.jsx");

  it("die Achsen-Fassung skaliert GLEICHMÄSSIG (sonst verzerrt die Beschriftung)", () => {
    /* Die kompakte Linie zieht sich mit `preserveAspectRatio="none"` auf jede Kachelgröße. Mit
       Beschriftung geht das nicht: x und y skalieren dann unabhängig und die Buchstaben werden breit. */
    // #graph-knapp (19.08.2026): der Schalter heißt jetzt `voll` — `axes` hat drei Stufen, und die
    // knappe darf dieses feste Seitenverhältnis ausdrücklich NICHT bekommen (s. test/graph-labels.test.js).
    expect(sp).toMatch(/preserveAspectRatio=\{voll \? "xMidYMid meet" : "none"\}/);
  });

  it("die Achsenwerte sind runde Zahlen, nicht Drittel des Maximums", () => {
    expect(sp, "niceStep fehlt — sonst steht „754.978“ an der Achse").toMatch(/const niceStep =/);
    expect(sp).toMatch(/f <= 1 \? 1 : f <= 2 \? 2 : f <= 5 \? 5 : 10/);
  });

  it("die x-Achse rechnet in Stichen (GHOST_STEP), nicht in Stützstellen", () => {
    expect(sp).toMatch(/from "\.\.\/game\/constants\.js"/);
    expect(sp).toMatch(/\(i \+ 1\) \* GHOST_STEP/);
  });

  /* #graph-knapp (19.08.2026): die Lauf-Details schalten die volle Fassung inzwischen ebenfalls ein und
     der Statistik-Trend die knappe — wer das bekommt, steht in test/graph-labels.test.js. Hier bleibt die
     Aussage, die sich NICHT geändert hat: der Victory-Screen erst ab 1400 px, die StatusRail nie. */
  it("Victory nur auf dem Desktop, StatusRail bleibt die kompakte Linie", () => {
    expect(read("src/ui/GameOver.jsx")).toMatch(/<Sparkline current=\{currentTraj\} record=\{recordTraj\} height=\{110\} axes=\{wide\} \/>/);
    // Die StatusRail bleibt die kompakte Linie — dort ist die Kachel ~300 px breit.
    expect(read("src/ui/StatusRail.jsx")).toMatch(/<Sparkline current=\{currentTraj\} record=\{recordTraj\} \/>/);
  });
});
