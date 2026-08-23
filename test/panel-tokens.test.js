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
   * TEXTFARBE. Die fuenf Achsen sind Flaeche, Kante, Hoehe, Radius und Innenabstand; Tinte ist keine
     davon, und Tripwire 1 nennt sie ebenfalls nicht. Sie ist die naechstliegende Erweiterung und
     gehoert dem Planner, nicht diesem Waechter.
   ============================================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/* ---------------------------------------------------------------- die Erlaubnisliste
   EIN EINTRAG JE WORKER. M1 hat modalStyle.jsx (Commit 1) und den Optionen-Screen (2a/2b)
   umgestellt; M2a bis M11 haengen ihre Datei und ihr Selektor-Praefix hier an. */
const MIGRATED_JSX = [
  "src/ui/modalStyle.jsx",
  "src/ui/OptionsModal.jsx",
  "src/ui/optionsBits.jsx",
];
/* Selektor-Praefixe statt Dateien, weil index.css JEDEN Screen enthaelt: geprueft werden nur die
   Regeln, deren Selektor einem migrierten Screen gehoert. */
const MIGRATED_SELECTORS = [/\.op-/, /\.as-opt-/, /\.as-panel-sunken/, /\.as-shell/, /\.as-head\b/];

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

describe("#menu-rework — migriertes JSX fuehrt keine Werte ein", () => {
  const sources = MIGRATED_JSX.map((p) => [p, strip(read(p))]);

  it("Inline-Stile tragen keine Literale auf den vier Achsen", () => {
    const bad = [];
    for (const [path, src] of sources) {
      for (const m of src.matchAll(/style=\{\{([^}]*(?:\}[^}]*)?)\}\}/g)) {
        const body = m[1];
        for (const prop of ["background", "border", "boxShadow", "borderRadius", "padding"]) {
          const hit = body.match(new RegExp(`\\b${prop}[A-Za-z]*\\s*:\\s*\`?["']?([^,\`"']*)`));
          if (!hit) continue;
          const val = hit[1] || "";
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
    for (const [path, src] of sources) {
      for (const m of src.matchAll(/\b(?:dt:)?(rounded|p|px|py|pt|pb|pl|pr|shadow|bg)-\[[^\]]+\]/g)) {
        bad.push(`${path}: ${m[0]}`);
      }
    }
    expect(bad, `willkuerliche Utility statt Token:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("keine BENANNTE Tailwind-Skala mit Desktop-Praefix — das ist die Haelfte, um die TYPO-12 danebenlag", () => {
    /* OHNE Praefix sind diese Utilities die Wertetraeger der schmalen Fassung und ausdruecklich
       erlaubt (s. Kopf). MIT `dt:` treffen sie den Desktop, und dort gilt das Vokabular. */
    const bad = [];
    for (const [path, src] of sources) {
      for (const m of src.matchAll(/\bdt:(rounded|shadow|p|px|py|pt|pb|pl|pr|bg)-[a-z0-9]+/g)) {
        bad.push(`${path}: ${m[0]}`);
      }
    }
    expect(bad, `benannte Skala am Desktop statt Token:\n  ${bad.join("\n  ")}`).toEqual([]);
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
      "--el-flat", "--el-rest", "--el-float", "--el-modal", "--el-glow",
      "--rd-sm", "--rd-md", "--rd-lg",
      "--in-tight", "--in-snug", "--in-base",
    ];
    expect(STEPS.length, "die Leiter hat nicht mehr neunzehn Sprossen").toBe(19);
    const missing = STEPS.filter((t) => !new RegExp(`\\n\\s*${t}\\s*:`).test(theme));
    expect(missing, `Schritt fehlt im Vokabular:\n  ${missing.join("\n  ")}`).toEqual([]);
  });

  it("jede Laenge im Vokabular haengt am --ui-scale-Haken", () => {
    /* Der Nachtrag: jede LAENGE nimmt den Multiplikator, Farben und Prozente nicht. Eine neue Laenge,
       die ihn vergisst, faellt beim Skalieren aus der Reihe — und zwar erst dann, also hier. */
    const LENGTHS = ["--rd-sm", "--rd-md", "--rd-lg", "--rd-shell",
      "--in-tight", "--in-snug", "--in-base", "--btn-pad-y", "--btn-pad-x",
      "--sf-cone-w", "--sf-cone-w-phase", "--sf-cone-h", "--el-halo-blur"];
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
