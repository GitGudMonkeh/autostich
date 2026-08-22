/* #graph-knapp — beschriftete Score-Verläufe in Statistik und Lauf-Details (19.08.2026).
   -------------------------------------------------------------------------------------------------
   Gemeldet: „das in der Statistik ohne Beschriftung aussagelos" (Lauf-Details, zwei Linien ohne einen
   einzigen Zahlenwert) und „same here, hier aber nur minimal Beschriftung" (Trend-Kachel der Statistik).
   #graph-achsen hatte die beschriftete Fassung 2026-08-19 nur im Victory-Screen eingeschaltet; die zwei
   anderen Fundstellen desselben Graphen blieben bei der kompakten Linie.

   `axes` hat deshalb jetzt DREI Stufen statt zwei — und die dritte ist keine Bequemlichkeit, sondern
   eine Aussage: der Trend in der Statistik zählt auf der x-Achse LÄUFE, nicht Stiche. Die ausführliche
   Fassung dort einzuschalten hiesse, sie mit „Stiche" zu beschriften und etwas Falsches zu behaupten.

   Quelltext-Ratsche (kein Component-Test-Setup, s. test/fx-panel.test.js). */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DESKTOP_AT } from "./desktopBreakpoint.js";

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const spark = src("ui/Sparkline.jsx");
const runDetail = src("ui/RunDetail.jsx");
const stats = src("ui/StatsScreen.jsx");
const rail = src("ui/StatusRail.jsx");
const gameOver = src("ui/GameOver.jsx");
const css = src("index.css");
const desktopBlank = css.slice(css.indexOf(DESKTOP_AT)).replace(/\/\*[\s\S]*?\*\//g, "");

describe("#graph-knapp — die drei Stufen von `axes`", () => {
  it("EINE Komponente, drei Stufen — keine zweite Fassung daneben", () => {
    expect(spark).toContain("const voll = axes === true;");
    expect(spark).toContain('const knapp = axes === "knapp";');
    // Gegenprobe: nirgends mehr ein nacktes `axes ?`, das beide Stufen über einen Kamm schert (die
    // knappe Fassung darf NICHT das feste Seitenverhältnis und die 620 × 250 der vollen bekommen).
    expect(spark).not.toMatch(/\baxes \?/);
    expect(spark).not.toMatch(/\{axes &&/);
  });

  it("die knappe Fassung beschriftet die HÖHE, aber nicht die x-Achse", () => {
    // x wäre dort „Läufe", die Komponente rechnet aber in Stichen (GHOST_STEP).
    expect(spark).toContain("const xTicks = voll ?");
    expect(spark).toMatch(/\{voll && xTicks\.map/);
    expect(spark).toMatch(/\{\(voll \|\| knapp\) && yTicks\.map/);
    // Die Achsen-Titel („Stiche" / „Score") hängen ebenfalls allein an der vollen Fassung.
    expect(spark).toContain('{t("sparkline.axis.x")}');
    expect(spark).toContain('{t("sparkline.axis.y")}');
    expect(spark.match(/\{voll && <text/g)).toHaveLength(3);   // 2 Achsen-Titel + die y-Werte
  });

  it("die Zahlen der knappen Fassung sind HTML, kein <text> im gestreckten SVG", () => {
    // Die kompakte Linie streckt sich mit `preserveAspectRatio="none"` auf jede Kachelbreite — ein
    // `<text>` darin würde mitverzerrt. Waagerechte LINIEN verzerren nicht, die bleiben im SVG.
    expect(spark).toMatch(/preserveAspectRatio=\{voll \? "xMidYMid meet" : "none"\}/);
    /* y-Werte als <text> NUR in der vollen Fassung. Der Abstand zur Achse ist seit #achsen-luft 10 px
       statt 8 und `padL` 76 statt 56: die Zahlen sind bei sechsstelligen Scores rund 48 px breit und
       liefen damit bis x = 0 — mitten durch die gedrehte Achsenbeschriftung bei x = 13. */
    expect(spark).toMatch(/\{voll && <text x=\{padL - 10\}/);
    expect(spark, "die Achsenbeschriftung steht wieder im Weg der Zahlen")
      .toMatch(/const padL = voll \? 76 : 3/);
    expect(spark).toMatch(/if \(!knapp\) return graph;/);               // Overlay nur für die knappe
    expect(spark).toMatch(/<span key=\{`k\$\{i\}`\}/);
  });

  it("die Marken sitzen auf ihren Linien — dieselbe Rechnung, dieselben Einheiten", () => {
    // `viewBox="0 0 300 H"` + feste Höhe H bilden 1 : 1 auf Pixel ab; die Marke nimmt deshalb `y(v)`
    // unverändert. Eine zweite Formel daneben würde beim nächsten Polster-Umbau auseinanderlaufen.
    expect(spark).toMatch(/top: Math\.max\(0, Math\.min\(H - 11, y\(v\) - 5\.5\)\)/);
    expect(spark).toMatch(/paddingLeft: knapp \? KNAPP_LAB : undefined/);
    expect(spark).toMatch(/width: KNAPP_LAB - 6/);
  });
});

describe("#graph-knapp — wer welche Stufe bekommt", () => {
  it("Lauf-Details: ab 1400 px dieselbe beschriftete Fassung wie der Victory-Screen", () => {
    expect(runDetail).toMatch(/<Sparkline current=\{traj\} record=\{recordTraj\} height=\{110\} axes=\{wide\} \/>/);
    expect(gameOver).toMatch(/axes=\{wide\}/);   // die Vorlage, an der es abgemessen ist
  });

  it("Statistik-Trend: knapp", () => {
    expect(stats).toMatch(/<Sparkline current=\{trend\} record=\{\[\]\} height=\{70\} axes="knapp" \/>/);
  });

  it("StatusRail bleibt die kompakte Linie", () => {
    // Sie steht neben dem laufenden Brett; dort ist die Linie eine Tendenz, keine Auswertung.
    expect(rail).toMatch(/<Sparkline current=\{currentTraj\} record=\{recordTraj\} \/>/);
  });

  it("die Lauf-Details deckeln die Höhe des Graphen NICHT mehr", () => {
    // 170 px stammten aus der Zeit der kompakten Linie (die streckt sich). Die beschriftete Fassung
    // bringt ihr Seitenverhältnis mit und stünde unter einem Deckel mittig mit leeren Rändern —
    // gemessen 917 × 170 statt 917 × 370, Beschriftung halb so groß.
    expect(desktopBlank).toMatch(/\.rd-c4 > \.rd-spark > svg \{ height: auto !important; \}/);
    expect(desktopBlank).not.toMatch(/\.rd-c4 > \.rd-spark > svg \{ height: \d+px/);
  });
});
