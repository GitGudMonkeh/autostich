import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { DESKTOP_BLOCK_AT } from "./desktopBreakpoint.js";

/* ============================================================================
   #mainscreen-branding — DIE MARKE: ein Zeichen, zwei Zuschnitte.

   Bewacht wird nicht „sieht gut aus", sondern die vier Annahmen, auf denen der Entwurf steht und die
   still brechen können:

     1. DIE MENGE WIRD ERZEUGT, NICHT ABGETIPPT. `mainscreen-marke.md` sagt es als Satz; ohne Wächter
        ist es eine Bitte. Eine Liste von vierzehn Zahlen im Code ist eine Liste, die beim nächsten
        Blick niemand mehr prüft.
     2. DAS I STEHT AN SIEBTER STELLE — IN BEIDEN SPRACHEN, UND NUR EINMAL. Der ganze Entwurf hängt
        daran: „AUTOSTICH" und „AUTOTRICK" haben beide neun Zeichen und tragen das I an derselben
        Position, deshalb braucht es keine zweite Zeichnung und keine Sonderregel je Locale.
     3. DIE GRÖSSENREGEL DER WORTMARKE BLEIBT EINGEGRENZT. Der Run-Kopf trägt dieselbe Klasse und holt
        seine 22 px aus `.as-wordmark-sm`. Eine uneingegrenzte Regel bewegt die Marke im laufenden
        Spiel — das ist die eine Falle, die dieser Screen ganz allein hat.
     4. DAS ZEICHEN ERREICHT DIE SCHMALE FASSUNG NICHT. Unter 1280 px steht der normale Glyph; jede
        Regel, die das Zeichen sichtbar macht, gehört in die Desktop-Sektion.

   JEDE PRÜFUNG IST ALS *„enthält kein X außer Y"* GESCHRIEBEN. Acht Befunde dieser Runde waren
   Prüfungen, die fragten, ob etwas DA ist, und irgendwann auf dem Falschen bestanden — zwei davon von
   Workern, die genau diesen Satz im Vertrag hatten. Ein `toMatch` auf die eingegrenzte Regel wäre
   grün, während eine uneingegrenzte Regel drei Zeilen darunter steht.
   ============================================================================ */

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const css = read("../src/index.css");
const grid = read("../src/ui/BrandGrid.jsx");
const start = read("../src/ui/StartScreen.jsx");
const arch = read("../src/game/architect.js");

const deskBlock = (() => {
  const at = css.indexOf(DESKTOP_BLOCK_AT);
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return "";
})();

/* Alle Regeln der Datei als { sel, body }. Kommentare vorher raus: ein `/* … *\/` zwischen zwei
   Regeln landet sonst im Selektor, und ein Kommentar mit einer Klammer darin zerlegt den Parser. */
const rules = (src) => {
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  const rx = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = rx.exec(clean))) {
    const sel = m[1].trim().replace(/\s+/g, " ");
    if (!sel || sel.startsWith("@")) continue;
    out.push({ sel, body: m[2] });
  }
  return out;
};
const ALL_RULES = rules(css);

const logoKey = (src) => (src.match(/"start\.logo\.alt":\s*"([^"]*)"/) || [])[1];

describe("#mainscreen-branding — das Zeichen ist das Brett", () => {
  it("liest die Rastermaße aus dem Spiel und nicht aus einer Zahl daneben", () => {
    expect(arch, "COLS ist nicht mehr 5 — dann sagt das Raster der Marke etwas Falsches über das Spiel")
      .toMatch(/COLS\s*=\s*5\b/);
    expect(arch, "ROWS ist nicht mehr 8").toMatch(/ROWS\s*=\s*8\b/);
    expect(grid).toMatch(/export const COLS = 5;/);
    expect(grid).toMatch(/export const ROWS = 8;/);
  });

  it("erzeugt die betonte Menge aus der Regel — und enthält KEINE abgetippte Liste", () => {
    expect(grid, "die Fünferschritt-Regel fehlt").toMatch(/p % 3 === 0/);
    /* Die eigentliche Aussage: kein Zahlen-Array mit mehr als zwei Einträgen. Eine erzeugte Menge
       braucht keins; eine abgetippte besteht aus nichts anderem. */
    const arrays = grid.match(/\[\s*\d+\s*(,\s*\d+\s*){2,}\]/g) || [];
    expect(arrays, `abgetippte Zellenliste gefunden: ${arrays.join(" ")}`).toEqual([]);
  });

  it("färbt KEINE Zelle in der Datei — die drei Zustände stehen im Stylesheet", () => {
    /* Eine Farbe als SVG-Attribut wäre für `panel-tokens.test.js` unsichtbar (der liest style-Objekte)
       UND für die Kaskade unerreichbar, also könnte die Deckfarbe sie nicht einfärben. */
    const colours = grid.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) || [];
    expect(colours, `Farbe im Bauteil statt im Stylesheet: ${colours.join(" ")}`).toEqual([]);
    for (const state of ["quiet", "mid", "hot"]) {
      expect(css, `.as-bg-${state} wird nirgends gefärbt`).toMatch(new RegExp(`\\.as-bg-${state}\\b`));
    }
  });

  it("liest beide Zuschnitte aus EINER Regel — die Spalte ist ein Ausschnitt, keine zweite Zeichnung", () => {
    expect(grid, "cellState kennt den Zuschnitt nicht mehr").toMatch(/cellState = \(p, total, cut\)/);
    expect(grid, "der Zuschnitt wird nicht mehr an cellState gereicht").toMatch(/cellState\(p, total, cut\)/);
  });
});

describe("#mainscreen-branding — das I trägt die Spalte, in beiden Sprachen", () => {
  for (const [lang, file] of [["de", "../src/i18n/de.js"], ["en", "../src/i18n/en.js"]]) {
    it(`${lang}: die Marke hat neun Zeichen und genau EIN I, an siebter Stelle`, () => {
      const word = logoKey(read(file));
      expect(word, `start.logo.alt fehlt in ${lang}.js`).toBeTruthy();
      expect(word.length, `"${word}" hat ${word.length} Zeichen — der Entwurf rechnet mit neun`).toBe(9);
      /* Erste und letzte Fundstelle zusammen sagen „genau eins, und zwar hier". Ohne die zweite
         Hälfte ginge ein Wort mit zwei I still durch, und der Schnitt säße am falschen. */
      expect(word.indexOf("I"), `"${word}": das erste I steht nicht an siebter Stelle`).toBe(6);
      expect(word.lastIndexOf("I"), `"${word}" trägt mehr als ein I — der Schnitt wäre mehrdeutig`).toBe(6);
    });

    it(`${lang}: die Tagline steht im Katalog und trägt ihren Schlusspunkt`, () => {
      const src = read(file);
      const tag = (src.match(/"start\.tagline":\s*"([^"]*)"/) || [])[1];
      expect(tag, `start.tagline fehlt in ${lang}.js`).toBeTruthy();
      /* Q3a, Owner-Entscheidung vom 25.08.2026: der Schlusspunkt steht in BEIDEN Sprachen. Das
         Entwurfsdokument druckt die englische Zeile ohne — genau diese eine Zeile ist der Ausreißer. */
      expect(tag.endsWith("."), `"${tag}" endet ohne Punkt — Q3a sagt: mit`).toBe(true);
      /* Und die Zerlegung im Screen setzt drei Punkte voraus, sonst liest sich die Zeile anders als
         gedacht. Gezählt statt geglaubt. */
      expect((tag.match(/\./g) || []).length, `"${tag}" hat nicht drei Punkte`).toBe(3);
    });
  }

  it("StartScreen schneidet an der GESUCHTEN Stelle und nicht an einer gezählten", () => {
    expect(start, "der Schnittbuchstabe steht nicht als Konstante").toMatch(/export const WORDMARK_I = "I";/);
    expect(start, "der Schnitt haengt an einer festen Zahl statt an indexOf")
      .toMatch(/logo\.indexOf\(WORDMARK_I\)/);
    expect(start, "die Spalte wird nicht als eigener Zuschnitt gerendert")
      .toMatch(/<BrandGrid cut="column"/);
    expect(start, "die eigenstaendige Bildmarke fehlt").toMatch(/<BrandGrid cut="full"/);
    /* Die Gegenprobe zum Rückfall: ohne I bleibt die Marke der reine Text, es wird kein Buchstabe
       erfunden. Und die schmale Fassung nimmt IMMER diesen Zweig. */
    /* Whitespace-unempfindlich verglichen: die Aussage ist die VERZWEIGUNG, nicht ihre Einrückung.
       Ein Ausdruck über den Zeilenumbruch hinweg wäre ein Wächter, den der nächste Formatierer rot
       macht, ohne dass sich etwas geändert hat. */
    const flat = start.replace(/\s+/g, " ");
    expect(flat, "der Rückfall auf den reinen Text fehlt")
      .toContain('{wide && logoI >= 0 ? <>{logoHead}<BrandGrid cut="column" />{logoTail}</> : logo}');
  });

  it("die schmale Fassung bekommt das Zeichen gar nicht erst in den Baum", () => {
    /* GEMESSEN, NICHT GEWÄHLT: eine Fassung, die beide Varianten im DOM hält und eine per Media Query
       ausblendet, braucht für den Glyph ein eigenes Inline-Element — und das verschiebt die Breite des
       Schriftzugs unter 1280 px um 0,02 px (evidence/C2/phone-*.json, zwei von sechs Zellen). Diese
       Runde bewegt unter 1280 px nichts, auch nichts Unsichtbares. Deshalb entscheidet der Hook. */
    expect(start, "der Desktop-Zweig hängt nicht mehr am geteilten Hook").toMatch(/const wide = useIsWide\(\);/);
    expect(start, "useIsWide wird nicht importiert").toMatch(/import \{ useIsWide \} from "\.\/useIsWide\.js"/);
    /* Und die Gegenprobe: es gibt kein per CSS ausgeblendetes Glyph-Element mehr, an dem die alte
       Fassung wieder anwachsen könnte. */
    expect(start, "das ausgeblendete Glyph-Element ist zurück").not.toMatch(/as-wm-i/);
    expect(css, "eine Regel blendet ein Glyph-Element aus, das es nicht mehr gibt").not.toMatch(/as-wm-i/);
  });
});

describe("#mainscreen-branding — die Wortmarken-Falle", () => {
  /* WÖRTLICH DIE FALLE: eine Regel, die `--wm-size` an einem Selektor setzt, den auch der Run-Kopf
     trägt, bewegt die Marke im laufenden Spiel. Geprüft wird deshalb nicht, ob die eingegrenzte Regel
     da ist, sondern dass es KEINE andere gibt als die vier, die es geben muss. */
  /* VIER Fundstellen, und die vierte hat dieser Wächter gefunden statt sie mitgebracht zu bekommen:
     `.un-first .un-wm` ist der Namens-Dialog, der `.as-wordmark` ebenfalls trägt (UsernameModal.jsx:87)
     und seine 42 px scoped setzt. Vertrag, Bericht und Entwurf nennen ihn nur beiläufig — der Entwurf
     als „Betrifft den Run-Kopf und den Namens-Dialog", ohne Selektor. Genau dafür ist die Prüfung als
     *„enthält kein X außer Y"* geschrieben: eine Prüfung auf Anwesenheit der eingegrenzten Regel wäre
     grün gewesen und hätte diese Stelle nie erwähnt.

     Die GRUNDREGEL `.as-wordmark` steht bewusst NICHT auf der Liste: sie LIEST `--wm-size` mit einem
     Rückfall (`font-size: var(--wm-size, clamp(…))`) und setzt es nicht. Wer sie hier einträgt, macht
     die Gegenprobe unten stumpf. */
  const SANCTIONED = new Set([
    ".as-wordmark-sm",        // der Run-Kopf: 22 px
    ".hub-play",              // Desktop: 88 px, damit auch die Bildmarke die Größe lesen kann
    ".hub-play .as-wordmark", // Desktop: erbt von der Spalte statt die Handy-Regel zu behalten
    ".un-first .un-wm",       // der Namens-Dialog: 42 px, eigener Selektor, kein Zeichen darin
  ]);

  it("enthält keine --wm-size-Regel außer den vier eingegrenzten", () => {
    const offenders = ALL_RULES
      .filter((r) => /--wm-size\s*:/.test(r.body))
      .map((r) => r.sel)
      .filter((sel) => !SANCTIONED.has(sel));
    expect(offenders, `uneingegrenzte Größenregel(n) an der Marke: ${offenders.join(" | ")}`).toEqual([]);
  });

  it("die vier sind auch wirklich alle da — sonst prüft die Liste oben nichts", () => {
    const seen = new Set(ALL_RULES.filter((r) => /--wm-size\s*:/.test(r.body)).map((r) => r.sel));
    for (const sel of SANCTIONED) {
      expect(seen.has(sel), `\`${sel}\` setzt --wm-size nicht mehr — die Erlaubnisliste ist veraltet`).toBe(true);
    }
  });

  it("der Run-Kopf behält seine 22 px", () => {
    expect(css).toMatch(/\.as-wordmark-sm\s*\{[^}]*--wm-size:\s*22px/);
  });

  it("kein anderer Träger von .as-wordmark rendert das Zeichen", () => {
    /* Die zweite Hälfte derselben Falle, und sie ist eine Datei-Frage statt einer CSS-Frage: die
       Spalte kommt aus dem JSX, nicht aus dem Stylesheet. Run-Kopf und Namens-Dialog tragen dieselbe
       Klasse; solange nur der Mainscreen `BrandGrid` rendert, können sie es gar nicht bekommen.
       Geschrieben als „kein Importeur außer dem einen", nicht als „der eine importiert es". */
    const files = readdirSync(new URL("../src/ui/", import.meta.url))
      .filter((f) => f.endsWith(".jsx"));
    const importers = files.filter((f) => /from "\.\/BrandGrid\.jsx"/.test(read(`../src/ui/${f}`)));
    expect(importers, `BrandGrid wird ausserhalb des Mainscreens gerendert: ${importers.join(", ")}`)
      .toEqual(["StartScreen.jsx"]);
  });
});

describe("#mainscreen-branding — die schmale Fassung sieht das Zeichen nicht", () => {
  it("enthält außerhalb der Desktop-Sektion keine .as-brandgrid-Regel außer `display: none`", () => {
    const outside = css.split(DESKTOP_BLOCK_AT)[0] + (css.split(DESKTOP_BLOCK_AT)[1] || "").slice(deskBlock.length);
    const offenders = rules(outside)
      .filter((r) => /\.as-brandgrid/.test(r.sel))
      .filter((r) => !/^\s*display:\s*none;?\s*$/.test(r.body.trim()))
      .map((r) => `${r.sel} { ${r.body.trim()} }`);
    expect(offenders, `Regel am Zeichen außerhalb der Desktop-Sektion: ${offenders.join(" | ")}`).toEqual([]);
  });

  it("und die Desktop-Sektion macht es sichtbar — sonst wäre die Prüfung oben still grün", () => {
    expect(deskBlock, "nichts macht .as-brandgrid je sichtbar")
      .toMatch(/\.hub-play \.as-brandgrid \{[^}]*display:\s*inline-block/);
  });

  it("das zweite Schloss steht auch dann noch, wenn der Hook irrt", () => {
    /* Die JS-Weiche hält das Zeichen aus der schmalen Fassung heraus; diese Regel hält es aus dem
       LAYOUT heraus, falls der Hook je zu früh `true` meldet. Zwei Schlösser an einer Tür, und die
       Prüfung sagt, dass beide da sind statt nur eins. */
    expect(css.slice(0, css.indexOf(DESKTOP_BLOCK_AT)), "die Grundregel hält das Zeichen nicht mehr aus dem Layout")
      .toMatch(/\.as-brandgrid \{ display: none; \}/);
  });

  it("die Tagline steht nur oberhalb der Schwelle — im JSX, nicht per Media Query", () => {
    /* Q5: ab DESKTOP_MIN aufwärts, nicht im Handy-Layout. Das Lockup traegt die Weiche selbst, damit
       unter 1280 px kein Knoten dazukommt, den `display: contents` sonst in die Handy-Spalte legt. */
    expect(start).toMatch(/className="as-lockup hidden \w+:flex/);
  });
});
