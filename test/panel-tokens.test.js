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

   EIN EINTRAG DARF EINEN TEIL EINER DATEI MEINEN, und das ist M2as Beitrag zu dieser Liste. Die
   Werkstatt ist auf ZWEI Worker aufgeteilt — M2a die Schale, M2b die Inhalte —, und beide leben in
   derselben Datei. Gemessen: `CustomizeScreen.jsx` traegt 68 Literale auf den vier Achsen, und
   66 davon gehoeren den Vorschau-Szenen, den Pack-Kacheln und den Effekt-Zeilen. Ein Eintrag ueber
   die ganze Datei wuerde also Arbeit blockieren, die noch nicht passiert ist — genau das, was der
   Kopf dieses Waechters ausschliesst. `hooks` grenzt deshalb auf die Klassenhaken der Schale ein;
   M2b haengt seine an und die Einschraenkung faellt von selbst weg, sobald beide Haelften stehen. */
const MIGRATED_JSX = [
  { path: "src/ui/modalStyle.jsx" },
  { path: "src/ui/OptionsModal.jsx" },
  { path: "src/ui/optionsBits.jsx" },
  { path: "src/ui/CustomizeScreen.jsx",
    /* Einzeln aufgezaehlt und nicht als eine Alternative geschrieben, damit der Waechter JEDEN Haken
       einzeln nachweisen kann. Eine Sammel-Regex weist nur nach, dass IRGENDEINER passt — dann faellt
       ein umbenannter Haken still aus der Pruefung, und die Box, an der er hing, ist unbewacht. */
    hooks: ["cz-root", "cz-card", "cz-scroll", "cz-head", "cz-topline", "cz-headrow", "cz-bal",
            "cz-readout", "cz-close", "cz-hair", "cz-tabs", "cz-split", "cz-main", "cz-mainscroll",
            "cz-side", "cz-stage", "cz-fxside"] },
];
/* Ein Haken trifft ein Tag, wenn dessen Klassen ihn als GANZES Wort fuehren: `cz-main` darf
   `cz-mainscroll` nicht mitnehmen, sonst haengt der eine Eintrag am anderen. */
const hookRe = (h) => new RegExp(`\\b${h}\\b`);
const anyHook = (hooks) => (hooks ? new RegExp(`\\b(${hooks.join("|")})\\b`) : undefined);
/* Selektor-Praefixe statt Dateien, weil index.css JEDEN Screen enthaelt: geprueft werden nur die
   Regeln, deren Selektor einem migrierten Screen gehoert.
   M2a haengt die Schale der Werkstatt an — die Boxen, nicht ihren Inhalt. `.cz-detailcard`,
   `.cz-fxrow`, `.cz-shot*` und `.cz-actbtn` stehen bewusst NICHT hier: sie sind M2bs. */
const MIGRATED_SELECTORS = [/\.op-/, /\.as-opt-/, /\.as-panel-sunken/, /\.as-shell/, /\.as-head\b/,
  /\.cz-root/, /\.cz-card/, /\.cz-scroll/, /\.cz-head/, /\.cz-topline/, /\.cz-headrow/, /\.cz-bal/,
  /\.cz-readout/, /\.cz-close/, /\.cz-hair/, /\.cz-tabs/, /\.cz-split/, /\.cz-main/, /\.cz-side/,
  /\.cz-stage/, /\.cz-fxside/];

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
];

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
  { axis: "Hoehe",   re: /(?:^|[;{\s])box-shadow\s*:(?!\s*(?:var\(|none|inset\b))[^;}]*\d/g },
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
    out.push(src.slice(m.index, i));
  }
  return out;
}

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

function styledTags(src, hookRx) {
  return tags(src).filter((t) => !hookRx || hookRx.test(t))
    .map(styleObject).filter((b) => b !== undefined);
}

/* Fuer die beiden Utility-Pruefungen: der ganze Quelltext, wo der Eintrag keine Haken nennt, sonst
   die Tags, die einen fuehren. Eine Utility steht im Klassen-Literal, nicht im Stil-Objekt. */
function classScopes(src, hookRx) {
  if (!hookRx) return [src];
  return tags(src).filter((t) => hookRx.test(t));
}

describe("#menu-rework — migriertes JSX fuehrt keine Werte ein", () => {
  const sources = MIGRATED_JSX.map((e) => [e.path, strip(read(e.path)), anyHook(e.hooks), e.hooks]);

  it("JEDER Klassenhaken der Erlaubnisliste trifft ein Tag — nicht nur irgendeiner", () => {
    /* Dieselbe Gegenprobe wie auf der CSS-Seite, und fuer M2a die wichtigere. Die erste Fassung
       verlangte nur EINEN Treffer und war damit blind: umbenannt man `cz-root`, passten die
       uebrigen sechzehn Haken weiter, der Waechter blieb gruen und die Wurzel war unbewacht.
       Gefunden beim Gegenpruefen dieses Waechters — genau dafuer ist das Gegenpruefen da. */
    for (const [path, src, , hooks] of sources) {
      if (!hooks) continue;
      const alle = tags(src);
      const tot = hooks.filter((h) => !alle.some((t) => hookRe(h).test(t)));
      expect(tot, `${path}: Haken zeigt ins Leere:\n  ${tot.join("\n  ")}`).toEqual([]);
    }
  });

  it("Inline-Stile tragen keine Literale auf den vier Achsen", () => {
    const bad = [];
    for (const [path, src, hookRx] of sources) {
      for (const body of styledTags(src, hookRx)) {
        for (const prop of ["background", "border", "boxShadow", "borderRadius", "padding"]) {
          const val = styleValue(body, prop);
          if (val === null) continue;
          if (/#[0-9a-fA-F]{3,8}|\brgba?\(/.test(val) && !/var\(/.test(val)) {
            bad.push(`${path}: ${prop} -> ${val.slice(0, 60)}`);
          }
        }
      }
    }
    expect(bad, `Inline-Wert statt Token:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("keine willkuerlichen Utilities (rounded-[…], p-[…], shadow-[…], bg-[…])", () => {
    const bad = [];
    for (const [path, src, hookRx] of sources) {
      for (const scope of classScopes(src, hookRx)) {
        for (const m of scope.matchAll(/\b(?:dt:)?(rounded|p|px|py|pt|pb|pl|pr|shadow|bg)-\[[^\]]+\]/g)) {
          bad.push(`${path}: ${m[0]}`);
        }
      }
    }
    expect(bad, `willkuerliche Utility statt Token:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("keine BENANNTE Tailwind-Skala mit Desktop-Praefix — das ist die Haelfte, um die TYPO-12 danebenlag", () => {
    /* OHNE Praefix sind diese Utilities die Wertetraeger der schmalen Fassung und ausdruecklich
       erlaubt (s. Kopf). MIT `dt:` treffen sie den Desktop, und dort gilt das Vokabular. */
    const bad = [];
    for (const [path, src, hookRx] of sources) {
      for (const scope of classScopes(src, hookRx)) {
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

function inkOfJsx(path, hookRx) {
  const src = strip(read(path));
  let n = 0;
  for (const body of styledTags(src, hookRx)) {
    const v = styleValue(body, "color");
    if (v !== null && /#[0-9a-fA-F]{3,8}|\brgba?\(/.test(v) && !/var\(/.test(v)) n++;
  }
  /* Die willkuerliche Text-Utility ist die zweite Schreibweise derselben Sache — sie hier zu
     vergessen waere H-b an der Ratsche selbst. */
  for (const scope of classScopes(src, hookRx)) n += [...scope.matchAll(/\b(?:dt:)?text-\[#[0-9a-fA-F]{3,8}\]/g)].length;
  return n;
}

describe("#menu-rework — die Tinten-Ratsche: Textfarb-Literale wachsen nicht", () => {
  const css = read("src/index.css");
  const all = rules(css);
  const inkOfCss = (res) => all.filter(([sel]) => res.some((r) => r.test(sel)))
    .reduce((n, [, body]) => n + [...withoutFallbacks(body).matchAll(new RegExp(INK_CSS.source, "g"))].length, 0);

  /* Gemessen am Stand von M2a. Wer eine Zeile hinzufuegt, faellt hier — und wer eine entfernt, zieht
     die Zahl nach. Die Werkstatt-Schale steht auf zwei: beide sind die Reiterfarben, und beide
     kodieren einen Zustand (aktiv / inaktiv), nicht eine Flaeche. */
  const CAP = [
    ["src/ui/modalStyle.jsx", () => inkOfJsx("src/ui/modalStyle.jsx", undefined), 0],
    ["src/ui/OptionsModal.jsx", () => inkOfJsx("src/ui/OptionsModal.jsx", undefined), 0],
    ["src/ui/optionsBits.jsx", () => inkOfJsx("src/ui/optionsBits.jsx", undefined), 0],
    ["src/ui/CustomizeScreen.jsx (ganze Datei)", () => inkOfJsx("src/ui/CustomizeScreen.jsx", undefined), 27],
    ["index.css — .op-* (M1)", () => inkOfCss([/\.op-/, /\.as-opt-/]), 16],
    ["index.css — .cz-* Schale (M2a)", () => inkOfCss(MIGRATED_SELECTORS.filter((r) => /cz-/.test(r.source))), 2],
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
