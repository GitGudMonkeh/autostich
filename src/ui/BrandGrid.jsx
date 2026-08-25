/* #mainscreen-branding C2 — die Marke, als Geometrie, die dem Projekt gehört.
   ============================================================================

   EIN ZEICHEN, ZWEI ZUSCHNITTE. `column` sind die acht Zellen, die im Schriftzug das I ersetzen;
   `full` ist das ganze 5 × 8 Brett, also die eigenständige Bildmarke. Es ist dieselbe Tabelle,
   zweimal gelesen — denn genau das ist die Aussage des Entwurfs: der Buchstabe ist ein AUSSCHNITT
   des Zeichens und keine zweite Zeichnung.

   DAS RASTER IST DAS BRETT, und das ist gemessen und nicht dekoriert: `src/game/architect.js` führt
   `COLS = 5`, `ROWS = 8`, `N_POS = 40`, wobei `COLS` dort ausdrücklich `= SEGMENT_SIZE` aus
   `formations.js` ist und `N_POS` deckungsgleich mit `TRICKS_PER_CYCLE`. Also: 5 breit ist die
   Segmentbreite, an deren Grenze jeder Formationslauf endet, 8 hoch sind die acht Segmente eines
   Durchlaufs, 40 Zellen sind ein volles Deck. Das Zeichen sagt drei wahre Dinge ohne ein Wort.

   DIE BETONTE MENGE WIRD ERZEUGT, NICHT ABGETIPPT. Eine Liste von vierzehn Zahlen im Code ist eine
   Liste, die beim nächsten Blick niemand mehr prüft — der Entwurf sagt es, und deshalb steht hier
   eine Regel statt eines Arrays. `test/marke.test.js` prüft die Abwesenheit des Arrays und nicht die
   Anwesenheit der Regel: das ist die Richtung, in der der Fehler passieren würde.

   HIER WIRD KEINE FARBE GESETZT. Jede Zelle trägt eine Klasse und sonst nichts; die drei Zustände
   werden in `index.css` unter `.as-brandgrid` gemalt. Zwei gemessene Gründe, keiner davon Ordnung:
   eine Farbe als SVG-Attribut ist für `panel-tokens.test.js` unsichtbar, weil der Wächter
   style-Objekte liest (M6-F11 und M11-F08 — dieselbe blinde Stelle schon zweimal); und die Marke ist
   deckgetönt, ihr Akzent muss also über die Kaskade von der Aufrufstelle kommen, was ein Attribut
   nicht kann.

   JEDE LÄNGE STEHT IN em — genauer: die viewBox rechnet in TAUSENDSTEL em, damit alle Zahlen darin
   ganze sind, und die Größe des Elements setzt das Stylesheet in em. Damit wächst das Zeichen mit
   `--wm-size` mit, und beim nächsten Größenwechsel ist nichts nachzujustieren. Die `.874em` Höhe,
   die der Entwurf für die Spalte nennt, ist hier kein Eintrag, sondern fällt aus den Teilen:
   8 × 90 + 7 × 22 = 874.

   KEINE NEUE ABHÄNGIGKEIT, KEIN NEUER GLYPH. Das sind `<rect>`-Elemente. Eine Glyphe aus einer
   Schrift wäre eine Hausregel-Frage an den Owner und keine Wahl eines Workers.
   ============================================================================ */

/* Die Maßtabelle des Entwurfs (`docs/mainscreen-marke.md`, „Maße"), in em gegen `--wm-size`. */
export const EM = { cell: 0.09, gutter: 0.022, border: 0.012, radius: 0.014 };

/* Die Rastermaße des Bretts. Sie stehen hier als Konstanten und nicht als Zahlen im Rumpf, damit
   der Wächter sie gegen `architect.js` halten kann statt gegen eine Fundstelle. */
export const COLS = 5;
export const ROWS = 8;

/* Die viewBox-Einheit: ein Tausendstel em. Keine Stellschraube — sie ist genau der Faktor, der die
   Tabelle oben in ganze Zahlen überführt. */
const U = 1000;
const CELL = EM.cell * U;      /*  90 */
const GUT = EM.gutter * U;     /*  22 */
const RAD = EM.radius * U;     /*  14 */
const BORD = EM.border * U;    /*  12 */

const span = (n) => n * CELL + (n - 1) * GUT;

/* DIE FÜNFERSCHRITT-REGEL, in beiden Lesarten — und es ist EINE Regel, nicht zwei.

   Auf dem ganzen Brett trägt jede dritte Position in Lesereihenfolge den Zwischenton, und die beiden
   gegenüberliegenden Ecken leuchten. Auf der einzelnen Spalte im I gibt es keine gegenüberliegende
   Ecke und keinen Platz für einen dritten Ton — dort leuchtet, was auf dem Brett den Zwischenton
   trägt: 1, 4 und 7 von acht. Der Buchstabe ist damit derselbe Rhythmus, eine Stufe lauter, weil er
   allein steht. */
export const cellState = (p, total, cut) => {
  if (cut === "column") return p % 3 === 0 ? "hot" : "quiet";
  if (p === 0 || p === total - 1) return "hot";
  return p % 3 === 0 ? "mid" : "quiet";
};

/**
 * @param {"full"|"column"} cut  das ganze 5 × 8 Zeichen, oder die acht Zellen im I
 */
export default function BrandGrid({ cut = "full", className = "", ...rest }) {
  const cols = cut === "column" ? 1 : COLS;
  const total = cols * ROWS;
  const w = span(cols);
  const h = span(ROWS);

  const cells = [];
  for (let p = 0; p < total; p++) {
    const col = p % cols;
    const row = (p - col) / cols;
    /* Die Kante liegt MITTIG auf dem Pfad, also wird das Rechteck um die halbe Strichstärke
       eingerückt und um die volle verkleinert — sonst stünde die Kante zur Hälfte außerhalb der
       Zelle und die Fugen wären um 12 Einheiten zu eng. */
    cells.push(
      <rect key={p} className={`as-bg-cell as-bg-${cellState(p, total, cut)}`}
        x={col * (CELL + GUT) + BORD / 2} y={row * (CELL + GUT) + BORD / 2}
        width={CELL - BORD} height={CELL - BORD}
        rx={RAD} ry={RAD} strokeWidth={BORD} />,
    );
  }

  /* `aria-hidden`: im Schriftzug steht der Buchstabe daneben als Text (s. StartScreen), und als
     eigenständige Bildmarke ist das Zeichen Schmuck neben einem Wort, das schon dasteht. Ein
     Vorleser soll die Marke einmal sagen und nicht zweimal. */
  return (
    <svg className={`as-brandgrid as-brandgrid-${cut}${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet"
      aria-hidden="true" focusable="false" {...rest}>
      {cells}
    </svg>
  );
}
