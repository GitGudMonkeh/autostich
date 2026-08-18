/* #perf-ansage2 (18.08.2026) — die Groß-Ansagen auf dem Handy.
   -------------------------------------------------------------------------------------------------
   #perf-ansage hatte den EPISCHEN Zweig ausdrücklich ausgelassen, mit der Begründung „sie feuert selten
   statt bei jedem stärkeren Sieg". Das stimmt für den frühen Lauf und ist im späten genau falsch herum:
   Gottgleich hatte den KÜRZESTEN Cooldown der Leiter und den höchsten Rang, wurde also nie unterdrückt,
   unterdrückte aber selbst alle anderen. Sobald der Stich-Score über GOTT_FX_MIN liegt (im späten Lauf der
   Normalzustand), stand die teuerste Ansage auf ~76 % Einschaltdauer — ein Dauer-Effekt, genau dann, wenn
   das Gerät am heißesten ist.

   Die drei Nähte unten sind alle still zerbrechlich: keine davon ändert das Bild sichtbar, wenn man sie
   zurückdreht, und alle drei kosten dann wieder Füllarbeit über die ganze Lebensdauer der Ansage.
   Quelltext-Ratsche, weil das Projekt kein Component-Test-Setup hat. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const bf = readFileSync(new URL("../src/ui/Battlefield.jsx", import.meta.url), "utf8");
const gw = readFileSync(new URL("../src/ui/fx/GottChromeWord.jsx", import.meta.url), "utf8");

// Die Stufenleiter EINMAL aus der Quelle lesen, statt die Zahlen abzutippen.
const stufen = [...bf.matchAll(/\{ min: [^}]*?key: "(bf\.big\.[a-z]+)"[^}]*?rank: (\d+), cool: (\d+)/g)]
  .map((m) => ({ key: m[1], rank: Number(m[2]), cool: Number(m[3]) }));

describe("#perf-ansage2 — die Ansage-Leiter", () => {
  it("der Wächter findet die Leiter überhaupt noch", () => {
    // Sonst wäre er still grün, während die Regeln darunter nichts mehr prüfen.
    expect(stufen.length, "alle vier Stufen müssen gefunden werden").toBe(4);
  });

  it("die höchste Stufe hat nicht den kürzesten Cooldown der Leiter", () => {
    /* Der eigentliche Befund. Gottgleich stand auf 2500 ms gegen Irre 3600 / Brutal 4600 / Stark 5600 —
       die seltenste Stufe feuerte damit am häufigsten. Zusammen mit `rank: 4` (wird nie von der Dominanz-
       Regel unterdrückt, unterdrückt aber selbst) verschwand im späten Lauf die ganze übrige Leiter.

       Bewusst nur DIESE Ungleichung und keine Rangfolge über alle vier: die unteren Stufen haben absichtlich
       längere Cooldowns, weil sie auf viel mehr Stichen auslösen — Stark (10k) trifft fast jeden Sieg, also
       ist 5600 dort kein Widerspruch, sondern der Spam-Schutz. Verboten ist nur, dass ausgerechnet die
       seltenste und teuerste Stufe am dichtesten feuert. */
    const top = stufen.reduce((a, b) => (b.rank > a.rank ? b : a));
    const kuerzester = Math.min(...stufen.map((s) => s.cool));
    expect(top.cool, `${top.key} (${top.cool} ms) darf nicht der dichteste Takt der Leiter sein`)
      .toBeGreaterThan(kuerzester);
  });

  it("die Einschaltdauer der epischen Ansage bleibt unter zwei Dritteln", () => {
    /* Lebensdauer / Cooldown = Anteil der Zeit, in dem die Ansage samt Blur-Lagen auf dem Schirm steht.
       Bei 2500 ms waren das 76 %. Die Grenze ist bewusst grob — sie soll einen Rückfall auf „Dauer-Effekt"
       fangen, nicht eine Feinjustierung verbieten. */
    const ms = Number(bf.match(/BIG_ANNOUNCE_MS = (\d+)/)[1]);
    const top = stufen.reduce((a, b) => (b.rank > a.rank ? b : a));
    expect(ms / top.cool).toBeLessThan(0.67);
  });
});

describe("#perf-ansage2 — was auf `lite` wegfällt", () => {
  it("der Sheen-Sweep hängt an lite, nicht mehr allein an reduced", () => {
    /* Auf dem Handy ist `reduced` false (Default „ausgewogen" → lite) — der Sweep lief dort also mit.
       Er ist der teuerste Posten: eine `<mask>` mit einer zweiten vollen Textinstanz plus ein per SMIL
       bewegtes `<rect>`. Weil die Maske INNERHALB des SVG gemalt wird, rastert der ganze gefilterte
       Teilbaum (drei drop-shadow-Lagen) fast eine Sekunde lang je Frame neu. */
    expect(bf).toMatch(/sheen=\{reduced \|\| lite \? "off" : "once"\}/);
  });

  it("die Vorschau behält ihren Sweep — sie soll zeigen, was der Effekt kann", () => {
    const cz = readFileSync(new URL("../src/ui/CustomizeScreen.jsx", import.meta.url), "utf8");
    expect(cz).toMatch(/sheen="(once|loop)"/);
    // Und die Komponente kann den Sweep überhaupt noch abschalten (sonst liefe das Prop ins Leere).
    expect(gw).toMatch(/sheen !== "off"/);
  });

  it("beide Ansage-Zweige promoten ihre skalierende Hülle", () => {
    /* Außen die `as-bigscore`-Skalierung, innen die gefilterten Wortschichten: ohne `willChange` kann der
       Browser die Blur-Lagen über die 1,9 s je Frame neu rastern, statt die fertige Ebene zu skalieren.
       Der epische Zweig hatte das seit #ios-word, der nicht-epische ohne Grund nicht. */
    expect(gw, "epischer Zweig (GottChromeWord)").toMatch(/willChange: "transform, opacity"/);
    // Vom Zweig-Anfang bis zur ersten Wortschicht — der Wrapper liegt garantiert dazwischen.
    const ab = bf.indexOf("#344/#354: Neon-Synthwave-CHROME");
    const nichtEpisch = bf.slice(ab, bf.indexOf("const ws = {", ab));
    expect(nichtEpisch, "der Wächter muss den Zweig überhaupt finden").toContain("<div key={b.id}");
    expect(nichtEpisch, "nicht-epischer Zweig (Stark/Brutal/Irre)").toMatch(/willChange: "transform, opacity"/);
  });

  it("Animation und Filter liegen weiter auf VERSCHIEDENEN Elementen", () => {
    /* #ios-word Punkt 1: beides am selben Knoten lässt WebKit die Filter-Region unvollständig invalidieren
       (Geister-Kopie auf dem iPhone). Die Promotion oben darf das nicht aufweichen — sie steht deshalb an
       der äußeren Hülle, der Filter bleibt innen. */
    const huelle = gw.slice(gw.indexOf("<div aria-hidden"), gw.indexOf("<svg"));
    expect(huelle, "die Hülle trägt keinen Filter").not.toMatch(/filter:/);
    expect(gw.slice(gw.indexOf("<svg")), "der Filter sitzt am inneren SVG").toMatch(/filter: `drop-shadow/);
  });
});
