/* TUTORIAL-SEKTIONEN — Ablauf als DATEN, kein Anzeigetext.

   Dieselbe Trennung, die `src/ui/tutorial/tutorialScript.js` bis zu seinem Rückbau getragen hat und
   die `docs/tutorial-guided-run-plan.md` §6/§14 begründet: hier stehen Sektionen, Lektionen und die
   Takte; die Sätze liegen als Schlüssel in src/i18n/de.js und src/i18n/en.js. Ein deutscher Satz in
   dieser Datei wäre ein einsprachiges Tutorial.

   Bewusst pur — kein React, kein `t`, kein Zustand. Ein `import { t }` wäre hier kein Zyklus, würde
   die Sprache aber beim Laden einfrieren (Modul-Konstante); die Auflösung gehört an die Anzeigezeit.

   SCHLÜSSEL WERDEN ABGELEITET, NICHT GESPEICHERT. `tut.<sektion>.<lektion>.<n>` — siehe beatKey().
   Eine zweite, von Hand gepflegte Schlüsselspalte wäre genau der Ort, an dem Katalog und Text
   auseinanderlaufen.

   TAKT-SCHEMA
     kind   siehe BEAT_KINDS. Eine neue Art braucht erst einen Eintrag in
            docs/design-sprache.md §11 — der Wächter liest die Liste unten.
     probe  nur bei kind "probierfeld"/"bild": der Name des Bausteins, den beats.jsx auflöst.
            Der Katalog kennt keine Komponenten — sonst wäre er nicht mehr React-frei.

   LEKTIONS-SCHEMA
     art    "kurz" (Vorgabe) oder "voll". Zwei Arten, zwei Budgets, siehe unten.
     beats  die Takte in Reihenfolge. Der letzte ist immer der Tipp. */

/* Die Takt-Arten. Die ersten vier trugen den ersten Bau; die vier weiteren kamen mit den
   Proberunden dazu (docs/design-sprache.md §11 — Die zwei Lektionsarten). Der Wächter liest diese
   Liste, damit eine neunte nicht still durchrutscht. */
export const BEAT_KINDS = [
  "satz", "bild", "probierfeld", "tip",
  "merk", "regeln", "tabelle", "liste",
];

/* ============================================================
   DIE ZWEI LEKTIONSARTEN — Owner-Entscheidung, diese Runde.

   Der erste Bau kannte nur eine Art und ein Budget von 400 px („kurz und knackig"). Der
   freigegebene Entwurf passt da nicht hinein. GEMESSEN bei 390 × 844: Median 645 px, 31 von 41
   Lektionen über 400, Maximum 1.360. Drei Auflösungen standen zur Wahl (Budget fällt · Entwurf
   zerlegen · zwei Arten); der Owner hat die zwei Arten gewählt.

     kurz  400 px — eine Sache, ein Blick, kein Scrollen.
     voll  960 px — die ganze Lektion. Das sind EINEINHALB Schalenhöhen (638 × 1,5 = 957,
           aufgerundet): einmal weiterschieben ist zumutbar, dreimal ist eine Seite ohne Ende.

   WARUM NICHT „karte"/„runde", UND WARUM DIE ARTEN NICHT AN DER BEWEGLICHKEIT HÄNGEN.
   Die erste Fassung dieser Datei nannte sie so und band das höhere Budget an einen beweglichen
   Teil: wer etwas TUT, darf länger sein. Das klingt richtig und ist GEMESSEN falsch. Beweglichkeit
   und Höhe sind im Entwurf unkorreliert — die mit Auftrag spannen 193 bis 1.010 px, die reinen
   Lesetexte 193 bis 1.360. Die LÄNGSTE Lektion im ganzen Entwurf hat gar keinen beweglichen Teil,
   und rund zehn stille Schirme liegen zwischen 539 und 774 px. Die Regel hätte diese zehn ins
   400er Budget gezwungen, das sie um 140 bis 960 px verfehlen. Ein Name, der etwas verspricht,
   was die Daten nicht hergeben, ist schlimmer als ein farbloser: „kurz" und „voll" sagen genau
   das, was gemessen wurde.

   WAS „voll" DAVON ABHÄLT, EIN FREIBRIEF ZU WERDEN — nicht die Beweglichkeit, sondern zweierlei:
   die 960er Decke, die GEMESSEN zwei der 41 Lektionen fängt, und die Umkehrregel unten. Wer eine
   Lektion auf „voll" setzt, die auch in 400 px passt, wird vom Wächter zurückgewiesen. „kurz" ist
   damit keine Bitte, sondern ein Versprechen, das geprüft wird, und ein Wechsel der Art steht als
   geändertes Feld im Diff statt still in einer Zeile Text. */
export const LESSON_KINDS = ["kurz", "voll"];
export const lessonKind = (lesson) => lesson.art || "kurz";

export const SECTIONS = [
  {
    id: "grundlagen",
    lessons: [
      { id: "wasist",    beats: [{ kind: "satz" }, { kind: "bild", probe: "deckstrip" }, { kind: "tip" }] },
      { id: "stich",     beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "werte",     beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "durchlauf", beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "serie",     beats: [{ kind: "satz" }, { kind: "probierfeld", probe: "streak" }, { kind: "tip" }] },
      { id: "crit",      beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "score",     beats: [{ kind: "satz" }, { kind: "probierfeld", probe: "score" }, { kind: "tip" }] },
      { id: "anzeigen",  beats: [{ kind: "satz" }, { kind: "tip" }] },
    ],
  },
  {
    id: "aufstellung",
    lessons: [
      { id: "phase",       beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "tauschen",    beats: [{ kind: "satz" }, { kind: "probierfeld", probe: "formation" }, { kind: "tip" }] },
      { id: "position",    beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "karte",       beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "formationen", beats: [{ kind: "satz" }, { kind: "probierfeld", probe: "formation" }, { kind: "tip" }] },
      { id: "stapeln",     beats: [{ kind: "satz" }, { kind: "probierfeld", probe: "formation" }, { kind: "tip" }] },
    ],
  },
  {
    id: "wahl",
    lessons: [
      { id: "perks",     beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "raritaet",  beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "neuwurf",   beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "skills",    beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "motor",     beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "legendaer", beats: [{ kind: "satz" }, { kind: "tip" }] },
    ],
  },
  {
    id: "archetypen",
    lessons: [
      { id: "feuer",   beats: [{ kind: "satz" }, { kind: "bild", probe: "guideFire" },      { kind: "tip" }] },
      { id: "blitz",   beats: [{ kind: "satz" }, { kind: "bild", probe: "guideLightning" }, { kind: "tip" }] },
      { id: "eis",     beats: [{ kind: "satz" }, { kind: "bild", probe: "guideIce" },       { kind: "tip" }] },
      { id: "pflanze", beats: [{ kind: "satz" }, { kind: "bild", probe: "guidePlant" },     { kind: "tip" }] },
    ],
  },
  {
    id: "architekt",
    lessons: [
      { id: "bauphase",  beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "brett",     beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "bauen",     beats: [{ kind: "satz" }, { kind: "probierfeld", probe: "board" }, { kind: "tip" }] },
      { id: "sorten",    beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "boni",      beats: [{ kind: "satz" }, { kind: "probierfeld", probe: "board" }, { kind: "tip" }] },
      { id: "aufwerten", beats: [{ kind: "satz" }, { kind: "tip" }] },
    ],
  },
  {
    id: "danach",
    lessons: [
      { id: "endscreen", beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "punkte",    beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "baum",      beats: [{ kind: "satz" }, { kind: "tip" }] },
      { id: "rangliste", beats: [{ kind: "satz" }, { kind: "tip" }] },
    ],
  },
];

/* ---- abgeleitete Schlüssel ---- */
export const sectionTitleKey = (s) => `tut.${s.id}.title`;
export const sectionSubKey = (s) => `tut.${s.id}.sub`;
export const lessonTitleKey = (s, l) => `tut.${s.id}.${l.id}.title`;
export const beatKey = (s, l, i) => `tut.${s.id}.${l.id}.${i}`;

/* Jeder Schlüssel, den der Katalog verlangt — die Grundlage der Paritäts- und Vollständigkeitstests. */
export function allKeys() {
  const out = [];
  for (const s of SECTIONS) {
    out.push(sectionTitleKey(s), sectionSubKey(s));
    for (const l of s.lessons) {
      out.push(lessonTitleKey(s, l));
      l.beats.forEach((b, i) => { if (b.kind !== "bild") out.push(beatKey(s, l, i)); });
      // Das Bild trägt eine Bildunterschrift; sie hängt am selben Index.
      l.beats.forEach((b, i) => { if (b.kind === "bild") out.push(beatKey(s, l, i)); });
    }
  }
  return out;
}

export const lessonCount = (s) => s.lessons.length;
export const totalLessons = () => SECTIONS.reduce((n, s) => n + s.lessons.length, 0);

/* ============================================================
   DAS HÖHENBUDGET — planning-report.md §1.4a.

   Gemessen im Produktionsbuild bei 390 × 844: die Karte deckelt bei 92dvh = 776,5 px, Kopf 70 und
   Fuß 66 gehen ab, es bleiben 638 px Scroller. Das ist die DECKE der Schale. Das BUDGET liegt bei
   400 px — die Entscheidung „kurz und knackig" (Owner, diese Runde). Eine Lektion, die darüber
   liegt, ist zwei Lektionen.

   WAS DIESE RECHNUNG IST UND WAS NICHT. Sie ist ein MODELL, kein Messwert: eine Unit-Test-Umgebung
   hat keinen Browser und kann keine Pixel messen. Die Konstanten unten sind an echten Messungen
   KALIBRIERT (siehe Tabelle), und das Modell ist bewusst so gebaut, dass es eher zu viel als zu
   wenig schätzt. Der echte Nachweis bleibt die V1–V4-Messung je Task mit
   docs/workstreams/tutorial-sections/tutorial-plan/evidence/measure.mjs.

   Kalibrierung (gemessen, Deutsch, 390 × 844, Inhaltsbreite 332 px):
     Satz   58 Zeichen → 56 px · 99 → 77 · 110 → 77 · 130 → 77 · 140 → 98
     Bild                      → 121–123 px
     Probierfeld               → 204–215 px
     Tipp  69 Zeichen      → 90 px
   44 Zeichen je Zeile ist der einzige Wert, der alle fünf Satz-Messungen trifft (58/44→2 Zeilen,
   99→3, 110→3, 130→3, 140→4). Bei 42 fiele der 130er auf 4 Zeilen und das Modell schätzte zu hoch. */
export const LESSON_BUDGET_PX = 400;   // Art „kurz"
export const VOLL_BUDGET_PX = 960;     // Art „voll" — 1,5 Schalenhöhen, siehe oben
export const SHELL_CEILING_PX = 638;   // gemessen; was die Schale ohne Scrollen zeigen kann

/* Das Budget EINER Lektion. Der Wächter fragt hier, damit die Zuordnung an einer Stelle steht. */
export const lessonBudget = (lesson) =>
  lessonKind(lesson) === "voll" ? VOLL_BUDGET_PX : LESSON_BUDGET_PX;

const CHARS_PER_LINE = 44;
const SATZ_LINE = 21;      // 0.875rem × line-height 1.5
const SATZ_MARGIN = 14;
const TIP_LINE = 20;      // line-height 1.45
const TIP_CHROME = 46;    // Trennlinie + Label + Abstände (gemessen 90 bei 2 Zeilen)
const BILD_PX = 123;       // obere Messung

/* Die vier hinzugekommenen Arten. KALIBRIERT am Entwurf bei 390 × 844 (lineare Anpassung über 20
   Merk-, 11 Regel- und 20 Tipp-Kästen), dann aufgerundet — das Modell soll eher zu viel schätzen
   als zu wenig. Der Entwurf ist NICHT der Produktionsbuild; diese Werte sind eine Näherung, und
   der Nachweis bleibt die V1–V4-Messung je Task.
     merk    gemessen 22 px/Zeile + 23 Chrome
     regeln  gemessen 31 px/Zeile, je Eintrag ein eigener Kasten
     liste   wie regeln, mit Nummer statt Aufzählung
     tabelle Kopfzeile plus Datenzeilen; die Zeilenzahl steht am Takt (`rows`) */
const MERK_LINE = 22, MERK_CHROME = 26;
const REGEL_LINE = 26, REGEL_CHROME = 20;
const TAB_ROW = 26, TAB_CHROME = 30;
const TAB_ROWS_DEFAULT = 4;

/* JE BAUSTEIN, nicht je Takt-Art. Die erste Fassung setzte jedes Probierfeld auf 215 px und ließ
   damit eine 486-px-Lektion durchs Budget — das Architekt-Brett ist deutlich höher als eine
   Kartenreihe. Ein Wächter, der ein Budget durchwinkt, ist schlimmer als keiner.
   Unbekannter Baustein → der höchste bekannte Wert: raten fällt dann zu Lasten des Budgets, nicht
   zu Lasten des Lesers. */
const PROBE_PX = { formation: 215, streak: 150, score: 195, board: 215 };
const PROBE_MAX = Math.max(...Object.values(PROBE_PX));

const lines = (text) => Math.max(1, Math.ceil(String(text || "").length / CHARS_PER_LINE));

/* Höhe EINES Takts. `text` ist der aufgelöste Anzeigetext — der Katalog kennt ihn nicht, der Aufrufer
   schon (der Wächter liest ihn aus de.js, die Laufzeit aus `t`). */
export function beatHeight(beat, text) {
  switch (beat.kind) {
    case "satz":        return lines(text) * SATZ_LINE + SATZ_MARGIN;
    case "tip":         return lines(text) * TIP_LINE + TIP_CHROME;
    case "bild":        return BILD_PX;
    case "probierfeld": return PROBE_PX[beat.probe] ?? PROBE_MAX;
    case "merk":        return lines(text) * MERK_LINE + MERK_CHROME;
    /* regeln und liste sind mehrere Kästen unter einem Schlüssel: der Text trägt die Einträge
       durch `·` getrennt. Ein Eintrag weniger zu zählen wäre der Fehler, der ein Budget
       durchwinkt, also zählt jeder Eintrag sein eigenes Chrome. */
    case "regeln":
    case "liste": {
      const teile = String(text || "").split("·");
      return teile.reduce((s, t) => s + lines(t) * REGEL_LINE + REGEL_CHROME, 0);
    }
    /* Eine Tabelle hängt an ihrer Zeilenzahl, nicht an ihrer Textlänge. Sie steht am Takt, weil
       der Katalog den Text nicht kennt. Fehlt sie, wird der häufigste Fall angenommen. */
    case "tabelle":     return (beat.rows ?? TAB_ROWS_DEFAULT) * TAB_ROW + TAB_CHROME;
    default:            return 0;
  }
}

/* Höhe einer ganzen Lektion. `resolve(key)` liefert den Text zu einem Schlüssel. */
export function lessonHeight(section, lesson, resolve) {
  return lesson.beats.reduce(
    (sum, b, i) => sum + beatHeight(b, resolve(beatKey(section, lesson, i))), 0);
}
