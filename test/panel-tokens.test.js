import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================================
   #menu-rework — DIE RATSCHE DES PANEL-VOKABULARS.

   Die Regel, die sie haelt, steht in docs/engineering/conventions.md 2c:

       Ein Menue waehlt ein Token, oder aendert ein Token fuer alle.
       Ein Menue fuehrt keinen Wert ein.

   SIE PRUEFT NUR MIGRIERTE STELLEN. Die Erlaubnisliste unten waechst je Worker um einen Eintrag; was
   noch nicht umgestellt ist, beruehrt sie nicht. So zieht sie mit der Runde zu und blockiert nie
   Arbeit, die noch nicht passiert ist.

   SIE DECKT VIER SCHREIBWEISEN AB, und das ist TYPO-12, einmal bezahlt: der Typografie-Waechter
   prueste nur `text-[Npx]` und nicht die BENANNTE Tailwind-Skala, und ein `text-xs` aus einem anderen
   Branch waere still durchgelaufen. Hier also:

     1. Literale in CSS          — #rrggbb, rgba(, box-shadow:, border-radius: Npx, padding: Npx
     2. Literale in JSX          — dieselben, in einem style={{ }}
     3. willkuerliche Utilities  — rounded-[Npx], p-[Npx], shadow-[...], bg-[...]
     4. die BENANNTE Skala       — rounded-xl, shadow-lg, p-4 … sofern sie den DESKTOP trifft

   WAS SIE BEWUSST NICHT PRUEFT, und beides steht in 2c:

   * Tailwind-Utilities OHNE Breakpoint-Praefix in JSX. Sie sind die Wertetraeger der schmalen
     Fassung — dieselbe Rolle, die die `-N`-Groessenvarianten in 2b spielen. Unter 1280 px darf sich
     nichts bewegen, also darf die Ratsche dort auch nichts verlangen. Mit Praefix (`dt:`) treffen
     sie den Desktop und werden geprueft.
   * TEXTFARBE ALS ACHSE. Die fuenf Achsen sind Flaeche, Kante, Hoehe, Radius und Innenabstand; Tinte
     ist keine davon, und Tripwire 1 nennt sie ebenfalls nicht. Der Waechter verlangt fuer sie also
     KEIN Token — aber er zaehlt sie seit M2a und laesst die Zahl nicht wachsen (s. die Tinten-Ratsche
     weiter unten, Beschluss des Planners beim Freeze). Eine Ratsche, kein Vokabular.
   ============================================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/* ---------------------------------------------------------------- die Erlaubnisliste
   EIN EINTRAG JE WORKER. M1 hat modalStyle.jsx (Commit 1) und den Optionen-Screen (2a/2b)
   umgestellt; M2a bis M11 haengen ihre Datei und ihr Selektor-Praefix hier an.

   M2A HATTE `hooks`, M2B HAT ES NICHT MEHR. Die Werkstatt war auf zwei Worker aufgeteilt und beide
   leben in derselben Datei, also grenzte M2a auf die Klassenhaken der Schale ein — ein Eintrag ueber
   die ganze Datei haette Arbeit blockiert, die noch nicht passiert war. Sie ist jetzt passiert, also
   ist die Region die ganze Datei, und `hooks` ist weg statt erweitert.

   WAS `exemptFns` MEINT, und warum es keine kleinere Region ist. Von den 67 Achsen-Literalen der
   Datei zeichnen 32 NICHT das Menue, sondern das nachgestellte Spielbrett: `#0b0a16` ist der Grund
   UNTER einem Battlefield-Bild, die dreistufigen Verlaeufe sind die Abdunkelung darueber, damit die
   Demo-Karte dagegen liest, und `linear-gradient(180deg,#26304a,#141a28)` mit `0 2px 9px #000a` ist
   eine SPIELKARTE, die auf dem Brett steht. Die fuenf Achsen kleiden Panels; `--sf-ground` (#141419)
   ist die Flaeche der Anwendung und liegt 11/10/3 daneben. Diese Werte auf die Leiter zu ziehen
   hiesse, Spielgrafik an ein Menue-Vokabular anzugleichen.

   Das ist dieselbe Sorte Ausnahme wie `PHASE_ACCENTS` in conventions.md 2c — dauerhaft, mit Grund,
   und EINZELN AUFGEZAEHLT. Eine `hooks`-Region nimmt alles aus, was sie nicht nennt, und zwar
   stillschweigend; fuenfzehn Namen sind enger und lauter, und jeder von ihnen muss unten eine echte
   Funktion treffen, sonst faellt der Waechter.

   `stateLiterals` ist die zweite Haelfte und die Form von MENU-38: was WIRKLICH fehlt, wird gezaehlt
   statt gepraegt. Drei Zustandsfarben-Paare haben keinen Schritt fuer ihre Rolle (s. Befunde
   MENU-46/47/48), das Fenster ist zu, und ein Wert an der Fundstelle waere Tripwire 1 mit Hut. Sie
   stehen deshalb WOERTLICH hier. Neue Literale fallen; diese sind benannt und koennen nicht wachsen,
   ohne dass jemand diese Liste anfasst — und jedes muss unten noch in der Datei stehen. */
const CZ_SCENES = [
  /* Die Buehnen: Brettgrund, Abdunkelung, Deckfarb-Kulisse, und die Karten darauf. */
  "FinisherScene", "ScorchScene", "HologridScene", "BlackholeScene", "GottScene",
  "StandardFinisherScene", "CubeMatrixPreview", "SpezialScene", "GlobalFxScenePreview",
  "FieldFxPreview", "CardAnimPreview",
  /* Bildhalter: eine transparente PNG vor demselben Brettgrund. */
  "CardPreview", "BfPreview", "DeckThumb",
  /* Das Schildchen, das die Buehne UEBER die Grafik legt — seine Flaeche haengt an dem, was
     dahinter liegt, und das ist ein Bild, kein Panel. */
  "PanelChip",
];
const CZ_STATE_LITERALS = [
  /* MENU-46 — die akzentgetoente Zustandsflaeche mit ihrer Kante (Zufalls-Deck-Zeile, Schalter AN). */
  "#1a1330", "#9b82f0aa", "#9b82f0", "#b9a6ff",
  /* MENU-47 — Stufen-Pillen: freigeschaltet gegen gesperrt. */
  "#1a1330e6", "#0a0a12e6", "#6a4fb0", "#33313f",
  /* MENU-48 — das bejahende Gegenstueck zu --ctl-danger / --ctl-danger-wash. Es gibt keins. */
  "#123a25", "#2f7a4f",
];
const MIGRATED_JSX = [
  { path: "src/ui/modalStyle.jsx" },
  { path: "src/ui/OptionsModal.jsx" },
  { path: "src/ui/optionsBits.jsx" },
  { path: "src/ui/CustomizeScreen.jsx", exemptFns: CZ_SCENES, stateLiterals: CZ_STATE_LITERALS,
    /* Die Stufen-Pille (I / II / III) polstert `px-1 py-[3px]` gegen zwei roemische Zeichen. Das ist
       die Sorte Polsterung, die 2c ausdruecklich AUSSERHALB der Leiter laesst — ein Steuerelement
       polstert gegen seine Beschriftung —, und die Leiter hat dafuer auch nichts: `--btn-pad-y`
       (0.625rem) ist das Fuenffache. Die benannte Tailwind-Skala trifft es ebenfalls nicht (py-0.5
       = 2, py-1 = 4). Gemeldet als MENU-51 statt umgeschrieben: 1 px auf einer Pille zu verschieben,
       die auch unter 1280 px steht, ist eine Bewegung, die niemand bestellt hat. */
    utilExempt: ["py-[3px]"] },
];
/* Ein Haken trifft ein Tag, wenn dessen Klassen ihn als GANZES Wort fuehren: `cz-main` darf
   `cz-mainscroll` nicht mitnehmen, sonst haengt der eine Eintrag am anderen. */
const hookRe = (h) => new RegExp(`\\b${h}\\b`);
const anyHook = (hooks) => (hooks ? new RegExp(`\\b(${hooks.join("|")})\\b`) : undefined);
/* Selektor-Praefixe statt Dateien, weil index.css JEDEN Screen enthaelt: geprueft werden nur die
   Regeln, deren Selektor einem migrierten Screen gehoert.
   M2a hat die Schale der Werkstatt einzeln aufgezaehlt, weil ihr Inhalt noch nicht umgestellt war.
   M2b stellt ihn um, und damit faellt die Aufzaehlung weg: `.cz-` MEINT JETZT DEN GANZEN SCREEN.
   Das ist die CSS-Seite derselben Aussage wie der Datei-Eintrag unten — ein Screen ist entweder
   migriert oder nicht, und ab hier ist die Werkstatt es. */
const M2A_SHELL_SELECTORS = [/\.cz-root/, /\.cz-card/, /\.cz-scroll/, /\.cz-head/, /\.cz-topline/,
  /\.cz-headrow/, /\.cz-bal/, /\.cz-readout/, /\.cz-close/, /\.cz-hair/, /\.cz-tabs/, /\.cz-split/,
  /\.cz-main/, /\.cz-side/, /\.cz-stage/, /\.cz-fxside/];
const MIGRATED_SELECTORS = [/\.op-/, /\.as-opt-/, /\.as-panel-sunken/, /\.as-shell/, /\.as-head\b/,
  /\.cz-/];

/* ---------------------------------------------------------------- die vier Achsen */
/* EIN WERT IN EINEM var()-RUECKFALL IST KEIN WERT AN DER FUNDSTELLE. `var(--c, #8a8a95)` holt seine
   Farbe aus der Variablen; der Rueckfall ist die Zusicherung, dass die Regel auch ohne sie nicht
   zerfaellt, und diese Schreibweise steht im ganzen Projekt mit Absicht so. Vor dem Pruefen also die
   Rueckfaelle herausschneiden — sonst meldet der Waechter genau das Muster, das er schuetzen soll. */
const withoutFallbacks = (body) => body.replace(/var\(\s*--[a-zA-Z0-9-]+\s*,[^()]*\)/g, "var(--x)");

/* WAS DIE INNENABSTANDS-ACHSE MEINT, und warum sie eine Ausnahmeliste hat statt einer weicheren Regel.

   Die Leiter hat DREI Sprossen. Drei Sprossen koennen unmoeglich jede Polsterung eines Screens
   abdecken, also war das nie ihr Anspruch: sie regelt den Abstand zwischen der Kante einer
   PANEL-ARTIGEN Box und ihrem Inhalt — Panel, Zeile, innerer Kasten. Drei andere Sorten Polsterung
   gehoeren nicht dazu, und jede hat ihren eigenen Grund:

     STEUERELEMENT — polstert gegen seine BESCHRIFTUNG, nicht gegen eine Panelkante. Genau deshalb
       stehen --btn-pad-* in conventions.md 2c ausserhalb der Leiter.
     LAYOUT — der Rand des Screens im Fenster und die Rasterabstaende. Das ist Anordnung, kein Inset.
     UEBERSCHRIFT — vertikaler Rhythmus einer Textzeile; der gehoert dem Typografie-System.

   Die Liste steht hier offen und nicht als aufgeweichter Ausdruck: eine Ausnahme, die man lesen kann,
   ist ueberpruefbar; ein Ausdruck, der leiser geworden ist, nicht. */
const INSET_EXEMPT = [
  /* Steuerelement */ /\.op-dd-btn/, /\.op-dd-item/, /\.op-dd-list/, /\[role="radio"\]/, /\.op-reset/,
  /* Layout       */ /\.op-root/, /\.op-foot/, /\.op-body/, /\.op-card/, /\.op-cols/, /\.op-col2/, /\.op-headrow/,
  /* Ueberschrift */ /\.op-sec > h3/, /\.op-head/, /\.op-title/, /\.op-readout/, /\.op-rowdesc/,
  /* --- M2a, die Werkstatt-Schale. Dieselben drei Sorten, dieselben drei Gruende. ---
     Steuerelement: der Schliessen-Knopf und die Reiter polstern gegen ihre BESCHRIFTUNG. Der Knopf
       steht auf 11/18, die Reiter auf 8/4/9 — keine Panelkante weit und breit.
     Layout: `.cz-root` ist der Rand des Screens im Fenster, `.cz-readout` setzt die Auskunftsspalte
       vom senkrechten Strich ab (eine Rasterfuge, kein Inset).
     Ueberschrift: `.cz-head` — sein unteres Polster ist die gemessene Luft zwischen der leuchtenden
       Reiterkante und der leuchtenden Panelkante, und sie haengt am Kopf, weil der Kopf sticky ist. */
  /* Steuerelement */ /\.cz-close/, /\.cz-head \[role="tab"\]/,
  /* Layout       */ /\.cz-root/, /\.cz-readout/,
  /* Ueberschrift */ /\.cz-head\b/,
  /* --- M2b, die Werkstatt-Inhalte. Zwei der drei Sorten, dieselben Gruende.
     Steuerelement: die Kategorie-Reiter des rechten Panels stehen auf 6/6, der Aktionsknopf der
       Buehne auf 22 seitlich. Beide polstern gegen ihre BESCHRIFTUNG — der Knopf misst sich sogar
       ausdruecklich am Text (`width: auto`, `min-width: 210px`), nicht an einer Panelkante.
     Layout: `.cz-fxlist` haelt rechts 6 px frei, damit die Rollleiste nicht auf den Zeilen sitzt.
       Eine Rinne ist Anordnung, kein Inset — dieselbe Unterscheidung wie bei `.cz-readout`.
     KEINE Ueberschrift-Zeile hier: die Fusszeilen der Inhalte (`.cz-fxhint`, `.cz-fxfoot`) polstern
       gar nicht, sie setzen `margin-top`. */
  /* Steuerelement */ /\.cz-fxcats button/, /\.cz-actbtn/,
  /* Layout       */ /\.cz-fxlist$/,
];

/* WAS DIE HOEHEN-ACHSE MEINT — und die eine Regel der Werkstatt, die daneben steht.

   Die Achse misst ABHEBEN von der Flaeche. `inset` ist deshalb schon ausgenommen (s. unten): ein
   Innenschatten hebt nichts, er zeichnet eine Kante. `.cz-shown` ist derselbe Gedanke ohne das
   Schluesselwort — `0 0 0 2px` hat weder Weichzeichnung noch Streuung und ist ein RING, also eine
   Kante, die als Schatten geschrieben ist, weil sie die Kachel nicht groesser machen darf.

   Der zweite Teil, `0 0 18px -6px`, ist ein Schein, und dafuer hat das Vokabular `--el-glow-*`.
   Uebernommen wurde er trotzdem nicht, und das ist keine Bequemlichkeit: `#ruhe` sagt „nur der
   primaere CTA leuchtet", und `--el-glow-*` steht in 2c ausdruecklich als „the primary CTA, and
   nothing else". Diesen Schritt an einen Auswahl-Marker zu haengen hiesse, genau die Regel zu
   brechen, fuer die es ihn gibt — der Marker faerbt seinen Schein ausserdem mit `--c`, der Rarity-
   Farbe der Kachel, nicht mit der Signalfarbe eines CTA.

   Gemeldet als MENU-50, nicht gepraegt: ein Auswahl-RING ist eine echte Luecke der fuenf Achsen,
   und das Fenster ist zu. Einzeln aufgezaehlt, damit die Ausnahme keine zweite Regel mitnimmt. */
const ELEV_EXEMPT = [/^\.cz-shown$/];

const CSS_AXES = [
  { axis: "Flaeche", re: /(?:^|[;{\s])background(?:-color|-image)?\s*:[^;}]*(#[0-9a-fA-F]{3,8}|\brgba?\()/g },
  { axis: "Kante",   re: /(?:^|[;{\s])border(?:-top|-right|-bottom|-left)?(?:-color)?\s*:[^;}]*(#[0-9a-fA-F]{3,8}|\brgba?\()/g },
  /* `inset` ist ausgenommen, und das ist eine Unterscheidung, keine Nachsicht: die Hoehenleiter misst
     ABHEBEN von der Flaeche. Ein Innenschatten hebt nichts — er zeichnet eine Kante (die 2-px-
     Unterstreichung der aktiven Auswahl) oder eine Mulde, und beides hat eigene Gruende. */
  /* DAS `\s*` STEHT IM LOOKAHEAD, NICHT DAVOR, und das ist keine Stilfrage. Aussen davor darf der
     Regex-Motor es zurueckgeben: die Pruefung landete dann auf dem LEERZEICHEN vor `inset`, der
     negative Lookahead ging auf, und `box-shadow: inset 0 -2px 0` wurde gemeldet, obwohl er
     ausgenommen sein sollte. Dieselbe Luecke laesst umgekehrt ein echtes Literal durch, sobald die
     Ausnahme etwas weiter gefasst ist — H-b in Regex-Form, an der eigenen Ratsche gefunden.
     Der Lookahead wird jetzt genau einmal ausgewertet, direkt hinter dem Doppelpunkt. */
  { axis: "Hoehe",   re: /(?:^|[;{\s])box-shadow\s*:(?!\s*(?:var\(|none|inset\b))[^;}]*\d/g, exempt: ELEV_EXEMPT },
  { axis: "Radius",  re: /(?:^|[;{\s])border-radius\s*:(?!\s*(?:var\(|0\s*[;}]))[^;}]*[1-9]/g },
  { axis: "Innenabstand", re: /(?:^|[;{\s])padding(?:-top|-right|-bottom|-left)?\s*:(?!\s*(?:var\(|0\s*[;}]))[^;}]*[1-9]/g, exempt: INSET_EXEMPT },
];

/* Jede CSS-Regel als [Selektor, Rumpf]. Kommentare sind vorher raus: eine Begruendung, die eine
   Eigenschaft beim Namen nennt, darf einen Waechter weder erfuellen noch ausloesen. */
function rules(css) {
  const out = [];
  for (const m of strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().split("\n").pop().trim();
    if (sel) out.push([sel, m[2]]);
  }
  return out;
}

describe("#menu-rework — migrierte CSS-Regeln fuehren keine Werte ein", () => {
  const css = read("src/index.css");
  const all = rules(css);
  const mine = all.filter(([sel]) => MIGRATED_SELECTORS.some((re) => re.test(sel)));

  it("JEDE Ausnahme trifft eine migrierte Regel — keine zeigt ins Leere", () => {
    /* Die Gegenprobe zu den Ausnahmelisten, und die zweite Haelfte von „die Erlaubnisliste trifft
       etwas". Eine Ausnahme, deren Selektor es nicht mehr gibt, nimmt nichts mehr aus — harmlos.
       Eine, die umbenannt wurde und jetzt auf etwas ANDERES passt, nimmt still das Falsche aus, und
       genau das faellt hier auf. Beide Achsen mit Ausnahmen werden geprueft, nicht nur die neue.
       Der Anlass ist MENU-37: derselbe Waechter meldete einmal Erfolg fuer eine Liste, von der nur
       ein Teil noch etwas traf. */
    for (const [name, liste] of [["Innenabstand", INSET_EXEMPT], ["Hoehe", ELEV_EXEMPT]]) {
      const tot = liste.filter((re) => !mine.some(([sel]) => re.test(sel)));
      expect(tot, `${name}: Ausnahme trifft keine migrierte Regel:\n  ${tot.map(String).join("\n  ")}`).toEqual([]);
    }
  });

  it("die Erlaubnisliste trifft ueberhaupt etwas", () => {
    /* Gegenprobe gegen die stillste Art, diesen Waechter wirkungslos zu machen: eine Erlaubnisliste,
       die auf nichts mehr passt, weil ein Selektor umbenannt wurde. */
    expect(mine.length, "kein migrierter Selektor gefunden — die Liste zeigt ins Leere").toBeGreaterThan(25);
  });

  for (const { axis, re, exempt } of CSS_AXES) {
    it(`${axis}: kein Literal in einer migrierten Regel`, () => {
      const bad = [];
      for (const [sel, body] of mine) {
        if (exempt && exempt.some((x) => x.test(sel))) continue;
        for (const hit of withoutFallbacks(body).matchAll(new RegExp(re.source, "g"))) {
          bad.push(`${sel}  ->  ${hit[0].trim().slice(0, 72)}`);
        }
      }
      expect(bad, `Wert an der Fundstelle statt aus dem Vokabular:\n  ${bad.join("\n  ")}`).toEqual([]);
    });
  }
});

/* EINEN WERT LIEST MAN BIS ZU SEINEM ENDE, nicht bis zum ersten Komma — H-b, und diesmal an genau
   dieser Datei bezahlt. Die erste Fassung schnitt den Wert mit `[^,`"']*` ab. Bei `background:
   "#0b0a16cc"` geht das gut; bei `background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%)"`
   blieb `linear-gradient(180deg` uebrig — kein Hex, kein `rgba(`, also kein Fund. GEMESSEN an
   CustomizeScreen.jsx: 42 Literale sah der Waechter, 68 sind es, 26 verdeckte das Loch, und jedes
   einzelne davon war ein mehrstufiger Verlauf. Ein Waechter, der die Haelfte der Schreibweisen
   abdeckt, liegt irgendwann falsch — TYPO-12, MENU-15, MENU-29, und das hier.
   Der Leser zaehlt Klammern und haelt erst an einem Komma an, das WIRKLICH die naechste Eigenschaft
   einleitet. Zeichenweise statt Regex, weil genau diese Unterscheidung ein Regex nicht trifft. */
const styleValue = (body, prop) => {
  const m = body.match(new RegExp(`\\b${prop}[A-Za-z]*\\s*:`));
  if (!m) return null;
  let i = m.index + m[0].length, depth = 0, out = "";
  while (i < body.length) {
    const ch = body[i];
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    else if (ch === ")" || ch === "}" || ch === "]") { if (depth === 0) break; depth--; }
    else if (ch === "," && depth === 0) break;
    out += ch; i++;
  }
  return out.trim().replace(/^[`"']|[`"']$/g, "");
};

/* Jedes oeffnende JSX-Tag der Datei, das ein `style={{ }}` traegt — und wo der Eintrag `hooks`
   nennt, nur die Tags, deren Klassen einen davon fuehren. Ueber das TAG und nicht ueber den Abstand
   im Text, damit ein eingeschobener Kommentar die Zuordnung nicht verschiebt. */
/* JEDES OEFFNENDE JSX-TAG, ganz. `/<[A-Za-z][^<>]*>/` waere die naheliegende Fassung und sie ist
   falsch: `onClick={() => setTab(m)}` enthaelt ein `>`, und das Tag bricht dort mitten entzwei.
   Gemessen kostete das an CustomizeScreen.jsx acht von siebenundzwanzig Tinten-Literalen — ein
   Waechter, der die Haelfte nicht sieht, ist keiner (dieselbe Lehre wie in overlay-nesting).
   Deshalb zeichenweise: Anfuehrungszeichen und geschweifte Klammern werden mitgezaehlt, und das Tag
   endet am ersten `>`, das WIRKLICH ausserhalb eines Ausdrucks steht. */
function tags(src) {
  const out = [];
  for (const m of src.matchAll(/<[A-Za-z][A-Za-z0-9.]*/g)) {
    let i = m.index + m[0].length, depth = 0, q = null;
    while (i < src.length) {
      const ch = src[i];
      if (q) { if (ch === q) q = null; }
      else if (ch === '"' || ch === "'" || ch === "`") q = ch;
      else if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) break;
      i++;
    }
    /* Der Versatz haengt am Tag, damit `exemptFns` es seiner Komponente zuordnen kann. Ueber den
       VERSATZ und nicht ueber eine Textsuche: zwei Komponenten duerfen dasselbe Tag schreiben. */
    out.push({ text: src.slice(m.index, i), at: m.index });
  }
  return out;
}

/* Die Anfaenge der Funktionen oberster Ebene, in Quelltext-Reihenfolge. Ein Tag gehoert der letzten
   Funktion, die vor ihm beginnt — top-level-Funktionen liegen hintereinander, also grenzt die
   naechste die vorige ab. */
function fnStarts(src) {
  return [...src.matchAll(/^(?:export\s+)?function\s+([A-Za-z0-9_]+)\s*\(/gm)].map((m) => [m.index, m[1]]);
}
const fnNameAt = (starts, at) => {
  let name = null;
  for (const [i, n] of starts) { if (i <= at) name = n; else break; }
  return name;
};

/* Das Stil-OBJEKT aus einem Tag, ueber Klammerzaehlung statt `[\s\S]*}}`. Gierig gelesen frisst der
   Ausdruck bis zum letzten `}}` des Tags — und das steht bei `onClick={() => {}}` hinter dem Stil.
   Der Waechter zaehlte dann Eigenschaften mit, die gar nicht im Stil stehen. */
function styleObject(tag) {
  const at = tag.indexOf("style={{");
  if (at < 0) return undefined;
  let i = at + "style={".length, depth = 0;
  const start = i;
  do {
    if (tag[i] === "{") depth++;
    else if (tag[i] === "}") depth--;
    i++;
  } while (i < tag.length && depth > 0);
  return tag.slice(start + 1, i - 1);
}

/* Die Tags eines Eintrags: erst die Haken-Region (wo einer sie nennt), dann die ausgenommenen
   Komponenten heraus. Beide Filter sind additiv — ein spaeterer Worker darf beides gleichzeitig
   brauchen, ohne dass hier etwas umgebaut wird. */
function tagsOf(src, entry) {
  const hookRx = anyHook(entry.hooks);
  const ex = new Set(entry.exemptFns || []);
  const starts = ex.size ? fnStarts(src) : null;
  return tags(src)
    .filter((t) => !hookRx || hookRx.test(t.text))
    .filter((t) => !ex.size || !ex.has(fnNameAt(starts, t.at)));
}

function styledTags(src, entry) {
  return tagsOf(src, entry).map((t) => styleObject(t.text)).filter((b) => b !== undefined);
}

/* Fuer die beiden Utility-Pruefungen: der ganze Quelltext, wo der Eintrag weder Haken noch
   Ausnahmen nennt, sonst die Tags der Region. Eine Utility steht im Klassen-Literal, nicht im
   Stil-Objekt. */
function classScopes(src, entry) {
  if (!entry.hooks && !entry.exemptFns) return [src];
  return tagsOf(src, entry).map((t) => t.text);
}

/* Die Literale eines Inline-Werts, NACHDEM die var()-Rueckfaelle heraus sind. Die erste Fassung
   fragte `!/var\(/.test(val)` und liess damit jeden Wert durch, in dem NEBEN einem var() noch ein
   Literal stand: `1px solid ${on ? "var(--deck-a1, #9b82f0)" : "#2a2836"}` war fuer sie sauber.
   Gemessen an CustomizeScreen.jsx verdeckte das drei Fundstellen — H-b zum fuenften Mal in diesem
   Repository (TYPO-12, MENU-15, MENU-29, MENU-33/34, und das hier). Ein Waechter fragt nicht, OB
   ein Token vorkommt, sondern ob noch ein Wert danebensteht. */
const literalsIn = (val) =>
  [...withoutFallbacks(val).matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\([^()]*\)/g)].map((m) => m[0]);

describe("#menu-rework — migriertes JSX fuehrt keine Werte ein", () => {
  const sources = MIGRATED_JSX.map((e) => [e.path, strip(read(e.path)), e]);

  it("JEDER Klassenhaken der Erlaubnisliste trifft ein Tag — nicht nur irgendeiner", () => {
    /* Dieselbe Gegenprobe wie auf der CSS-Seite, und fuer M2a die wichtigere. Die erste Fassung
       verlangte nur EINEN Treffer und war damit blind: umbenannt man `cz-root`, passten die
       uebrigen sechzehn Haken weiter, der Waechter blieb gruen und die Wurzel war unbewacht.
       Gefunden beim Gegenpruefen dieses Waechters — genau dafuer ist das Gegenpruefen da.
       Seit M2b nennt KEIN Eintrag mehr Haken (die Werkstatt ist ganz migriert). Die Pruefung bleibt
       fuer M3–M11 stehen; dass sie gerade auf nichts passt, sagt der Zaehler unten laut. */
    let geprueft = 0;
    for (const [path, src, e] of sources) {
      if (!e.hooks) continue;
      geprueft++;
      const alle = tags(src);
      const tot = e.hooks.filter((h) => !alle.some((t) => hookRe(h).test(t.text)));
      expect(tot, `${path}: Haken zeigt ins Leere:\n  ${tot.join("\n  ")}`).toEqual([]);
    }
    expect(geprueft, "kein Eintrag nennt Haken — das ist derzeit richtig, s. Kopf").toBe(0);
  });

  it("JEDER Name in exemptFns trifft eine echte Funktion — eine Ausnahme zeigt nicht ins Leere", () => {
    /* Die Gegenprobe, die `exemptFns` ueberhaupt erst verantwortbar macht. Eine Ausnahmeliste, deren
       Namen niemand mehr traegt, nimmt still nichts aus — und der Tag, an dem jemand eine Szene
       umbenennt, ist der Tag, an dem sie unbemerkt in die Pruefung faellt ODER, schlimmer, ein neuer
       Name still danebensteht und alles darunter ausnimmt. Beide Richtungen fallen hier auf. */
    for (const [path, src, e] of sources) {
      if (!e.exemptFns) continue;
      const namen = new Set(fnStarts(src).map(([, n]) => n));
      const tot = e.exemptFns.filter((n) => !namen.has(n));
      expect(tot, `${path}: exemptFns zeigt ins Leere:\n  ${tot.join("\n  ")}`).toEqual([]);
    }
  });

  it("die Ausnahme TRAEGT etwas — sonst ist sie Zierrat", () => {
    /* Ohne diese Pruefung koennte `exemptFns` bestehen bleiben, nachdem jemand die Szenen umgestellt
       hat, und dann naehme sie kuenftige Arbeit aus, ohne dass es jemand merkt. Sie muss also
       WIRKEND sein: ohne sie faende der Waechter etwas. Werden die Szenen eines Tages migriert,
       faellt diese Zeile — und die richtige Antwort ist dann, die Namen zu loeschen. */
    for (const [path, src, e] of sources) {
      if (!e.exemptFns) continue;
      const ohne = { ...e, exemptFns: undefined };
      const zahl = styledTags(src, ohne).filter((body) =>
        ["background", "border", "boxShadow", "borderRadius", "padding"].some((p) => {
          const v = styleValue(body, p);
          return v !== null && literalsIn(v).length > 0;
        })).length;
      const mit = styledTags(src, e).filter((body) =>
        ["background", "border", "boxShadow", "borderRadius", "padding"].some((p) => {
          const v = styleValue(body, p);
          return v !== null && literalsIn(v).length > 0;
        })).length;
      expect(zahl - mit, `${path}: exemptFns nimmt nichts aus`).toBeGreaterThan(0);
    }
  });

  it("Inline-Stile tragen keine Literale auf den vier Achsen", () => {
    const bad = [];
    for (const [path, src, e] of sources) {
      const erlaubt = new Set(e.stateLiterals || []);
      for (const body of styledTags(src, e)) {
        for (const prop of ["background", "border", "boxShadow", "borderRadius", "padding"]) {
          const val = styleValue(body, prop);
          if (val === null) continue;
          const fremd = literalsIn(val).filter((l) => !erlaubt.has(l));
          if (fremd.length) bad.push(`${path}: ${prop} -> ${val.slice(0, 60)}   [${fremd.join(" ")}]`);
        }
      }
    }
    expect(bad, `Inline-Wert statt Token:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("JEDE utilExempt-Utility steht noch in der Datei", () => {
    /* Gleiche Begruendung wie bei stateLiterals: eine benannte Ausnahme, die niemand nachzieht,
       deckt irgendwann etwas, das gar nicht mehr gemeint war. */
    for (const [path, src, e] of sources) {
      if (!e.utilExempt) continue;
      const tot = e.utilExempt.filter((u) => !src.includes(u));
      expect(tot, `${path}: utilExempt zeigt ins Leere — streichen:\n  ${tot.join("\n  ")}`).toEqual([]);
    }
  });

  it("JEDES stateLiteral steht noch in der Datei — die Ratsche dreht nur nach unten", () => {
    /* Dieselbe Logik wie bei der Tinten-Ratsche und aus demselben Grund: eine Liste benannter
       Luecken, die niemand nachzieht, wird zur Fiktion und deckt irgendwann etwas, das gar nicht
       mehr gemeint war. Wer eine Zustandsfarbe aufloest, streicht sie hier. */
    for (const [path, src, e] of sources) {
      if (!e.stateLiterals) continue;
      const tot = e.stateLiterals.filter((l) => !src.includes(l));
      expect(tot, `${path}: stateLiteral nicht mehr vorhanden — streichen:\n  ${tot.join("\n  ")}`).toEqual([]);
    }
  });

  it("keine willkuerlichen Utilities (rounded-[…], p-[…], shadow-[…], bg-[…])", () => {
    const bad = [];
    for (const [path, src, e] of sources) {
      const erlaubt = new Set(e.utilExempt || []);
      for (const scope of classScopes(src, e)) {
        for (const m of scope.matchAll(/\b(?:dt:)?(rounded|p|px|py|pt|pb|pl|pr|shadow|bg)-\[[^\]]+\]/g)) {
          if (!erlaubt.has(m[0])) bad.push(`${path}: ${m[0]}`);
        }
      }
    }
    expect(bad, `willkuerliche Utility statt Token:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("keine BENANNTE Tailwind-Skala mit Desktop-Praefix — das ist die Haelfte, um die TYPO-12 danebenlag", () => {
    /* OHNE Praefix sind diese Utilities die Wertetraeger der schmalen Fassung und ausdruecklich
       erlaubt (s. Kopf). MIT `dt:` treffen sie den Desktop, und dort gilt das Vokabular. */
    const bad = [];
    for (const [path, src, e] of sources) {
      for (const scope of classScopes(src, e)) {
        for (const m of scope.matchAll(/\bdt:(rounded|shadow|p|px|py|pt|pb|pl|pr|bg)-[a-z0-9]+/g)) {
          bad.push(`${path}: ${m[0]}`);
        }
      }
    }
    expect(bad, `benannte Skala am Desktop statt Token:\n  ${bad.join("\n  ")}`).toEqual([]);
  });
});

/* ============================================================================
   DIE TINTEN-RATSCHE — der Beschluss des Planners beim Freeze, umgesetzt von M2a.

   TEXTFARBE IST KEINE SECHSTE ACHSE, und sie wird in dieser Runde auch keine. Die fuenf Achsen sind
   Flaeche, Kante, Hoehe, Radius und Innenabstand; Tripwire 1 nennt Tinte nicht, das Vokabular nennt
   sie in „Was das Vokabular nicht beansprucht" ausdruecklich als offene Luecke. Eine Achse mitten in
   der Runde zu oeffnen ist genau das, was der Freeze verhindert.

   ABER: sieben Literale auf einem Screen werden siebzig ueber elf, wenn niemand hinsieht. Genau so
   sind die 43 Schatten entstanden, die diese Runde aufraeumt. Also eine RATSCHE, kein Vokabular —
   sie zaehlt, was da ist, und faellt, sobald es mehr wird. Sie verlangt nichts, sie verbietet nur
   das Wachsen, und sie uebergibt dem Nachfolge-Workstream eine gemessene Zahl statt eines Eindrucks.

   SIE ZAEHLT JE MIGRIERTER EINHEIT. „Je Datei" waere fuer index.css sinnlos: dort steht JEDER Screen
   drin, und die Zahl schwankte bei jeder Aenderung an einem Screen, den diese Runde nicht angefasst
   hat. Eine Einheit ist deshalb das, was die Erlaubnisliste ohnehin schon kennt — eine JSX-Datei
   oder eine Gruppe von Selektor-Praefixen.

   `toBe` UND NICHT `toBeLessThanOrEqual`, mit Absicht: eine Obergrenze, die niemand nachzieht, wird
   zur Fiktion. Wer eine Tinte entfernt, zieht die Zahl mit — dann steht hier immer die gemessene
   Wahrheit und nicht ein Rest von vorgestern. Die Ratsche dreht nur in eine Richtung; sie zu
   ERHOEHEN ist die Bewegung, die sie verhindern soll, und das steht im Diff.
   ============================================================================ */
const INK_CSS = /(?:^|[;{\s])color\s*:[^;}]*(#[0-9a-fA-F]{3,8}|\brgba?\()/g;

/* DIE TINTE ZAEHLT UEBER DIE GANZE DATEI, auch wo die Achsen-Pruefung eine Komponente ausnimmt.
   `exemptFns` sagt „das ist kein Panel", nicht „hier schaut niemand hin": eine Textfarbe in einer
   Vorschau-Szene ist genauso Tinte wie eine in einer Pack-Kachel, und die Ratsche uebergibt dem
   Nachfolge-Workstream eine Zahl fuer die DATEI. Deshalb hier bewusst ein leerer Eintrag. */
function inkOfJsx(path, entry = {}) {
  const src = strip(read(path));
  let n = 0;
  for (const body of styledTags(src, entry)) {
    const v = styleValue(body, "color");
    if (v !== null && literalsIn(v).length > 0) n++;
  }
  /* Die willkuerliche Text-Utility ist die zweite Schreibweise derselben Sache — sie hier zu
     vergessen waere H-b an der Ratsche selbst. */
  for (const scope of classScopes(src, entry)) n += [...scope.matchAll(/\b(?:dt:)?text-\[#[0-9a-fA-F]{3,8}\]/g)].length;
  return n;
}

describe("#menu-rework — die Tinten-Ratsche: Textfarb-Literale wachsen nicht", () => {
  const css = read("src/index.css");
  const all = rules(css);
  const inkOfCss = (res, ausser = []) => all
    .filter(([sel]) => res.some((r) => r.test(sel)) && !ausser.some((r) => r.test(sel)))
    .reduce((n, [, body]) => n + [...withoutFallbacks(body).matchAll(new RegExp(INK_CSS.source, "g"))].length, 0);

  /* Gemessen am Stand von M2a. Wer eine Zeile hinzufuegt, faellt hier — und wer eine entfernt, zieht
     die Zahl nach. Die Werkstatt-Schale steht auf zwei: beide sind die Reiterfarben, und beide
     kodieren einen Zustand (aktiv / inaktiv), nicht eine Flaeche.
     M2b HAT DIE SCHALE NICHT MIT SICH GEZOGEN: `.cz-` meint jetzt den ganzen Screen, also stuende
     M2as gemessene Zwei sonst ploetzlich auf der Summe beider Haelften. Die Schale behaelt darum
     ihre eigene Selektorliste und die Inhalte sind ausdruecklich „alles .cz-, das nicht Schale ist".
     Zusammen decken die beiden Eintraege denselben Bereich ab wie die Achsen-Pruefung. */
  const CAP = [
    ["src/ui/modalStyle.jsx", () => inkOfJsx("src/ui/modalStyle.jsx"), 0],
    ["src/ui/OptionsModal.jsx", () => inkOfJsx("src/ui/OptionsModal.jsx"), 0],
    ["src/ui/optionsBits.jsx", () => inkOfJsx("src/ui/optionsBits.jsx"), 0],
    ["src/ui/CustomizeScreen.jsx (ganze Datei)", () => inkOfJsx("src/ui/CustomizeScreen.jsx"), 27],
    ["index.css — .op-* (M1)", () => inkOfCss([/\.op-/, /\.as-opt-/]), 16],
    ["index.css — .cz-* Schale (M2a)", () => inkOfCss(M2A_SHELL_SELECTORS), 2],
    ["index.css — .cz-* Inhalte (M2b)", () => inkOfCss([/\.cz-/], M2A_SHELL_SELECTORS), 1],
  ];

  for (const [name, count, cap] of CAP) {
    it(`${name}: ${cap} Tinten-Literale, nicht mehr`, () => {
      expect(count(), `Tinten-Literale in ${name} — die Ratsche dreht nur nach unten`).toBe(cap);
    });
  }

  it("die Ratsche zaehlt ueberhaupt etwas — sonst waere sie still gruen", () => {
    /* Dieselbe Gegenprobe wie an der Erlaubnisliste: eine Zaehlung, die auf null Stellen passt,
       weil ein Selektor oder ein Klassenhaken umbenannt wurde, meldet fuer immer „alles gut". */
    expect(CAP.reduce((n, [, c]) => n + c(), 0), "die Ratsche findet nichts mehr").toBeGreaterThan(40);
  });

  it("CustomizeScreen.jsx traegt die Tinte, die M2b erbt — und M2a hat keine hinzugefuegt", () => {
    /* Die Zahl der ganzen Datei steht bewusst neben den migrierten Einheiten: die Schale hat nur
       zwei Literale, aber M2b uebernimmt einen Screen mit siebenundzwanzig. Die Ratsche haelt die
       Zahl fest, BEVOR M2b anfaengt — das ist der ganze Sinn der Reihenfolge. */
    expect(inkOfJsx("src/ui/CustomizeScreen.jsx", undefined)).toBe(27);
  });
});

describe("#menu-rework — das Vokabular selbst bleibt vollstaendig", () => {
  const theme = (() => {
    const css = strip(read("src/index.css"));
    const at = css.indexOf("@theme");
    let depth = 0, start = css.indexOf("{", at), end = -1;
    for (let j = start; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) { end = j; break; }
    }
    return css.slice(start + 1, end);
  })();

  it("alle neunzehn Schritte der fuenf Achsen stehen im @theme-Block", () => {
    const STEPS = [
      "--sf-sunken", "--sf-base", "--sf-head", "--sf-raised",
      "--ed-quiet", "--ed-base", "--ed-strong", "--ed-deck",
      "--el-flat", "--el-rest", "--el-float", "--el-modal", "--el-glow-blur", "--el-glow-spread",
      "--rd-sm", "--rd-md", "--rd-lg",
      "--in-tight", "--in-snug", "--in-base",
    ];
    /* ZWANZIG Eintraege fuer NEUNZEHN Schritte: der CTA-Schein ist EIN Schritt, geschrieben als zwei
       Skalare, weil seine Farbe der Fundstelle gehoert (`--c` am Knopf) und ein Komposit sie an
       :root einfrieren wuerde. Die Zahl steht hier ausgeschrieben, damit der naechste Leser die
       Abweichung findet statt sie fuer einen Zaehlfehler zu halten. */
    expect(STEPS.length, "die Leiter hat nicht mehr neunzehn Sprossen (20 Eintraege, --el-glow-* zaehlt einfach)").toBe(20);
    const missing = STEPS.filter((t) => !new RegExp(`\\n\\s*${t}\\s*:`).test(theme));
    expect(missing, `Schritt fehlt im Vokabular:\n  ${missing.join("\n  ")}`).toEqual([]);
  });

  it("jede Laenge im Vokabular haengt am --ui-scale-Haken", () => {
    /* Der Nachtrag: jede LAENGE nimmt den Multiplikator, Farben und Prozente nicht. Eine neue Laenge,
       die ihn vergisst, faellt beim Skalieren aus der Reihe — und zwar erst dann, also hier. */
    const LENGTHS = ["--rd-sm", "--rd-md", "--rd-lg", "--rd-shell",
      "--in-tight", "--in-snug", "--in-base", "--btn-pad-y", "--btn-pad-x",
      "--sf-cone-w", "--sf-cone-w-phase", "--sf-cone-h", "--el-halo-blur",
      "--el-glow-blur", "--el-glow-spread"];
    const bad = LENGTHS.filter((t) => {
      const m = theme.match(new RegExp(`\\n\\s*${t}\\s*:([^;]*);`));
      return m && !/var\(--ui-scale/.test(m[1]);
    });
    expect(bad, `Laenge ohne --ui-scale:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("--text-* bleibt vom Haken unberuehrt — Typografie ist eingefroren", () => {
    /* Die Ausnahme, die der Nachtrag ausdruecklich verlangt. Ohne sie zoege die wertfoermige Regel
       („jede Laenge") die Typografie mit hinein, und Entscheidung 8 waere still gebrochen. */
    const textTokens = [...theme.matchAll(/\n\s*(--text-[a-z0-9-]+)\s*:([^;]*);/g)];
    expect(textTokens.length, "keine Typografie-Token mehr gefunden").toBeGreaterThan(20);
    const scaled = textTokens.filter((m) => /var\(--ui-scale/.test(m[2])).map((m) => m[1]);
    expect(scaled, `Typografie am Geometrie-Regler:\n  ${scaled.join("\n  ")}`).toEqual([]);
  });
});
