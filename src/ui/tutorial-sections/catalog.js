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
     label  nur bei kind "block": `true` heißt, der Kasten trägt eine Überschrift. Sie hängt am
            Schlüssel des Takts mit dem Zusatz `.label` — siehe beatLabelKey().

   SEKTIONS-SCHEMA
     id     bildet den Schlüssel und muss eindeutig sein.
     arch   optional: der Archetyp, dessen Farbe die Sektion trägt. Der Katalog nennt nur den
            SCHLÜSSEL ("fire"), die Farbe holt die Schale aus ARCHETYPE_META — dieselbe Arbeitsteilung
            wie bei den Bausteinen, und der Grund, warum hier keine Farbe steht.

   LEKTIONS-SCHEMA
     art    "kurz" (Vorgabe) oder "voll". Zwei Arten, zwei Budgets, siehe unten.
     beats  die Takte in Reihenfolge. Der letzte ist immer der Tipp. */

/* Die Takt-Arten. Die ersten vier trugen den ersten Bau; die vier weiteren kamen mit den
   Proberunden dazu (docs/design-sprache.md §11 — Die zwei Lektionsarten). Der Wächter liest diese
   Liste, damit eine neunte nicht still durchrutscht. */
export const BEAT_KINDS = [
  "satz", "block", "bild", "probierfeld", "tip",
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
    /* SIEBEN Lektionen, nicht mehr acht. Der freigegebene Entwurf zieht „Durchlauf und Lauf" in
       die erste Lektion und „Crit" in „Der Score" — beide waren Textkarten ohne eigene Runde, und
       genau die sollte der Umbau abschaffen. */
    lessons: [
      { id: "wasist", art: "voll", beats: [
        { kind: "block" },
        { kind: "block", label: true },
        { kind: "block", label: true },
        { kind: "regeln" },
        { kind: "tip" }] },
      { id: "stich", art: "voll", beats: [
        { kind: "probierfeld", probe: "duell" },
        { kind: "tip" }] },
      { id: "werte", art: "voll", beats: [
        { kind: "probierfeld", probe: "kampfwert" },
        { kind: "tip" }] },
      { id: "serie", art: "voll", beats: [
        { kind: "probierfeld", probe: "serie" },
        { kind: "tip" }] },
      /* Der Score-Schirm des Entwurfs traegt Formel, Runde und zwei Erklaerkaesten auf einem
         Schirm (1344 px gemessen). Das reisst das volle Budget; der Owner-Entscheid dazu ist
         AUFTEILEN statt kuerzen — die Runde bleibt komplett, die Kaesten ruecken in die
         Folgelektion. */
      { id: "score", art: "voll", beats: [
        { kind: "probierfeld", probe: "score" },
        { kind: "tip" }] },
      { id: "formel", art: "voll", beats: [
        { kind: "block" },
        { kind: "block", label: true },
        { kind: "block", label: true },
        { kind: "tip" }] },
      { id: "anzeigen", art: "voll", beats: [
        { kind: "probierfeld", probe: "laufmock" },
        { kind: "tip" }] },
      { id: "herkunft", art: "voll", beats: [
        { kind: "probierfeld", probe: "herkunft" },
        { kind: "tip" }] },
    ],
  },
  {
    id: "aufstellung",
    /* FÜNF Lektionen statt sechs: der freigegebene Entwurf zieht „tauschen" und „position" in EINE
       Runde am Brett zusammen. Beide erklärten dasselbe aus zwei Blickwinkeln. */
    lessons: [
      { id: "phase", art: "voll", beats: [
        { kind: "block" },
        { kind: "regeln" },
        { kind: "liste" },
        { kind: "tip" }] },
      { id: "brett", art: "voll", beats: [
        { kind: "probierfeld", probe: "aufstellen" },
        { kind: "block", label: true },
        { kind: "tip" }] },
      { id: "karte", art: "voll", beats: [
        { kind: "probierfeld", probe: "kartenteile" },
        { kind: "block", label: true },
        { kind: "tip" }] },
      { id: "formationen", art: "voll", beats: [
        { kind: "probierfeld", probe: "formation" },
        { kind: "regeln" },
        { kind: "tip" }] },
      { id: "stapeln", art: "voll", beats: [
        { kind: "probierfeld", probe: "overlap" },
        { kind: "block", label: true },
        { kind: "tip" }] },
    ],
  },
  {
    id: "wahl",
    /* DREI Lektionen statt sechs. Der freigegebene Entwurf zieht Angebot, Neuwurf, Motor und
       Legendäres in die erste Runde und die Raritäten-Lektion zusammen. */
    lessons: [
      { id: "perks", art: "voll", beats: [
        { kind: "block" },
        { kind: "block", label: true },
        { kind: "block", label: true },
        { kind: "tip" }] },
      { id: "kategorien", art: "kurz", beats: [
        { kind: "probierfeld", probe: "kategorien" },
        { kind: "tip" }] },
      { id: "raritaet", art: "voll", beats: [
        { kind: "probierfeld", probe: "raritaet" },
        { kind: "merk" },
        { kind: "block", label: true },
        { kind: "tip" }] },
    ],
  },
  {
    id: "blitz",
    arch: "lightning",
    lessons: [
      { id: "wasist", art: "voll", beats: [
        { kind: "block" },
        { kind: "block", label: true },
        { kind: "regeln" },
        { kind: "tip" }] },
      { id: "karte", art: "voll", beats: [
        { kind: "probierfeld", probe: "blitzkarte" },
        { kind: "block", label: true },
        { kind: "tip" }] },
      { id: "tipps", art: "kurz", beats: [
        { kind: "liste" },
        { kind: "tip" }] },
    ],
  },
  {
    /* Die alte Sektion „archetypen" mit ihren vier Verweis-Karten ist weg. Der freigegebene
       Entwurf gibt jedem Archetyp eine eigene Sektion mit gespielten Runden; ein Verweis auf
       den Leitfaden war keine Lektion. */
    id: "feuer",
    arch: "fire",
    lessons: [
      { id: "wasist", art: "voll", beats: [
        { kind: "block" },
        { kind: "block", label: true },
        { kind: "regeln" },
        { kind: "tip" }] },
      { id: "karte", art: "voll", beats: [
        { kind: "probierfeld", probe: "feuerkarten" },
        { kind: "block", label: true },
        { kind: "tip" }] },
      { id: "feld", art: "voll", beats: [
        { kind: "probierfeld", probe: "hitze" },
        { kind: "block", label: true },
        { kind: "tip" }] },
      { id: "tipps", art: "kurz", beats: [
        { kind: "liste" },
        { kind: "tip" }] },
    ],
  },
  {
    id: "pflanze",
    arch: "plant",
    lessons: [
      { id: "wasist", art: "voll", beats: [
        { kind: "block" },
        { kind: "block", label: true },
        { kind: "merk" },
        { kind: "regeln" },
        { kind: "tip" }] },
      { id: "karte", art: "voll", beats: [
        { kind: "probierfeld", probe: "pflanzkarte" },
        { kind: "block", label: true },
        { kind: "tip" }] },
      { id: "feld", art: "voll", beats: [
        { kind: "probierfeld", probe: "gruenfeld" },
        { kind: "block", label: true },
        { kind: "tip" }] },
      { id: "tipps", art: "kurz", beats: [
        { kind: "liste" },
        { kind: "tip" }] },
    ],
  },
  {
    id: "eis",
    arch: "ice",
    lessons: [
      { id: "wasist", art: "voll", beats: [
        { kind: "block" },
        { kind: "block", label: true },
        { kind: "merk" },
        { kind: "regeln" },
        { kind: "tip" }] },
      { id: "karte", art: "voll", beats: [
        { kind: "probierfeld", probe: "gletscher" },
        { kind: "block", label: true },
        { kind: "tip" }] },
      { id: "feld", art: "voll", beats: [
        { kind: "probierfeld", probe: "gletscherfeld" },
        { kind: "block", label: true },
        { kind: "tip" }] },
      { id: "tipps", art: "kurz", beats: [
        { kind: "liste" },
        { kind: "tip" }] },
    ],
  },
  {
    id: "architekt",
    /* VIER Lektionen statt sechs. „brett" und „sorten" waren Textkarten; was sie sagten, steht
       jetzt in der ersten Runde und in den Regeln darunter. */
    lessons: [
      { id: "wasist", art: "voll", beats: [
        { kind: "block" },
        { kind: "probierfeld", probe: "archmock" },
        { kind: "liste" },
        { kind: "tip" }] },
      { id: "hauptaktion", art: "voll", beats: [
        { kind: "probierfeld", probe: "bauen" },
        { kind: "tabelle", rows: 5 },
        { kind: "merk" },
        { kind: "tip" }] },
      { id: "wohin", art: "voll", beats: [
        { kind: "block" },
        { kind: "probierfeld", probe: "struktur" },
        { kind: "block", label: true },
        { kind: "tip" }] },
      { id: "tipps", art: "kurz", beats: [
        { kind: "liste" },
        { kind: "tip" }] },
    ],
  },
  {
    id: "danach",
    lessons: [
      { id: "endscreen", art: "voll", beats: [
        { kind: "block" },
        { kind: "probierfeld", probe: "gomock" },
        { kind: "merk" },
        { kind: "tip" }] },
      { id: "punkte", art: "voll", beats: [
        { kind: "block" },
        { kind: "probierfeld", probe: "meilenstein" },
        { kind: "merk" },
        { kind: "tip" }] },
      { id: "baum", art: "voll", beats: [
        { kind: "block" },
        { kind: "probierfeld", probe: "baum" },
        { kind: "tip" }] },
      { id: "rangliste", art: "kurz", beats: [
        { kind: "block" },
        { kind: "block", label: true },
        { kind: "tip" }] },
    ],
  },
  {
    /* Die zehnte Sektion, vom Owner nachgefordert: was man tun kann, wenn die Grundlagen sitzen.
       VIER Lektionen, seit „Zwei Builds" geteilt wurde — die Lektion maß 1.360 px gegen ein
       Budget von 960, und beide Builds waren ausdrücklich gewollt. */
    id: "fortgeschritten",
    lessons: [
      { id: "laenge", art: "voll", beats: [
        { kind: "block" },
        { kind: "probierfeld", probe: "laenge" },
        { kind: "merk" },
        { kind: "tip" }] },
      { id: "segmente", art: "voll", beats: [
        { kind: "block" },
        { kind: "probierfeld", probe: "segmente" },
        { kind: "merk" },
        { kind: "tip" }] },
      { id: "glut", art: "voll", beats: [
        { kind: "block" },
        { kind: "block", label: true },
        { kind: "block", label: true },
        { kind: "tip" }] },
      { id: "klinge", art: "voll", beats: [
        { kind: "block", label: true },
        { kind: "block", label: true },
        { kind: "merk" },
        { kind: "tip" }] },
    ],
  },
];

/* ---- abgeleitete Schlüssel ---- */
export const sectionTitleKey = (s) => `tut.${s.id}.title`;
export const sectionSubKey = (s) => `tut.${s.id}.sub`;
export const lessonTitleKey = (s, l) => `tut.${s.id}.${l.id}.title`;
export const beatKey = (s, l, i) => `tut.${s.id}.${l.id}.${i}`;
/* Die Überschrift eines Kastens hängt am Schlüssel ihres Takts. Eine eigene Schlüsselspalte wäre
   der Ort, an dem Überschrift und Text auseinanderlaufen. */
export const beatLabelKey = (s, l, i) => `${beatKey(s, l, i)}.label`;

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
      // Ein beschrifteter Kasten braucht einen ZWEITEN Schlüssel. Ohne diese Zeile fehlte die
      // Überschrift in beiden Katalogen und kein Wächter hätte es gemerkt.
      l.beats.forEach((b, i) => { if (b.kind === "block" && b.label) out.push(beatLabelKey(s, l, i)); });
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
   99→3, 110→3, 130→3, 140→4). Bei 42 fiele der 130er auf 4 Zeilen und das Modell schätzte zu hoch.

   NACHGEPRÜFT AN DEN SIEBEN GRUNDLAGEN-LEKTIONEN (Produktionsbuild, 390 × 844, Deutsch), Modell
   gegen Messung:
     wasist 897/811 · stich 396/368 · werte 620/609 · serie 639/626 · score 755/706 ·
     anzeigen 604/562 · herkunft 563/539
   Das Modell liegt überall ÜBER der Messung, um 11 bis 86 px (1,4 bis 10,6 %). Das ist die
   Richtung, in die es irren darf.

   Zwei Fehler standen dem im Weg, und beide sind nur gefunden worden, weil nachgemessen und nicht
   bloß „grün" gelesen wurde:
     1. Drei Probierfelder waren zu niedrig angesetzt — 250/305/300 gegen gemessene 271/325/364.
     2. BODY_CHROME fehlte GANZ. Der Rumpf einer Lektion hat 30 px eigene Polsterung, die kein
        Takt trägt; ohne sie rechneten vier der sieben Lektionen kleiner, als sie sind. */
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
const BLOCK_CHROME = 42, BLOCK_LABEL = 22;
/* Der Rumpf der Lektion hat eigene Polsterung, die KEIN Takt trägt. Sie fehlte im Modell ganz und
   war der Grund, warum vier von sieben Grundlagen-Lektionen unter ihrer echten Höhe gerechnet
   wurden. GEMESSEN 30 px, und der Wert trifft alle sieben. */
const BODY_CHROME = 30;
const MERK_LINE = 23, MERK_CHROME = 30;   // gemessen 142 px bei 5 Zeilen
/* `regeln` und `liste` setzen in der KLEINEREN Schrift (text-body-5, nicht text-body-lg-5): mehr
   Zeichen je Zeile, niedrigere Zeile. GEMESSEN an drei Aufzählungen (2, 3 und 4 Einträge, real 150,
   142 und 237 px) trifft 52 Zeichen je Zeile bei 21 px Zeile und 26 px Chrome je Eintrag; mit den
   44 Zeichen des Fließtexts lag das Modell 35 bis 72 px zu hoch. */
const REGEL_CHARS = 52, REGEL_LINE = 21, REGEL_CHROME = 26;
const TAB_ROW = 28, TAB_CHROME = 30;      // gemessen 167 px bei 5 Zeilen
const TAB_ROWS_DEFAULT = 4;

/* JE BAUSTEIN, nicht je Takt-Art. Die erste Fassung setzte jedes Probierfeld auf 215 px und ließ
   damit eine 486-px-Lektion durchs Budget — das Architekt-Brett ist deutlich höher als eine
   Kartenreihe. Ein Wächter, der ein Budget durchwinkt, ist schlimmer als keiner.
   Unbekannter Baustein → der höchste bekannte Wert: raten fällt dann zu Lasten des Budgets, nicht
   zu Lasten des Lesers. */
/* Die Runden der Grundlagen. Alle sind höher als das Formations-Feld, weil sie zwei Kartenreihen
   tragen (Gegner und du) oder mehrere Zeilen untereinander.

   NACHGEMESSEN im Produktionsbuild bei 390 × 844, nicht geschätzt: duell 271 · kampfwert 325 ·
   serie 364 · laufmock 299 · herkunft 277. Die erste Fassung dieser Zeile hatte drei davon ZU
   NIEDRIG angesetzt (250/305/300) — das Modell hätte eine zu lange Lektion durchgewunken, und das
   ist die einzige Richtung, in die ein Budget nicht irren darf. Die Werte hier stehen deshalb
   knapp über der Messung, aufgerundet. */
const PROBE_PX = { formation: 215, streak: 150, board: 215,
  /* Die Grundlagen-Szenen des Entwurfs, nachgemessen im Build (mess-welle1.mjs, 390 x 844):
     duell 494 · kampfwert 773 · serie 414 ungespielt (+5 Logzeilen im gespielten Zustand)
     · score 785 · laufmock 538 (+Tippzeile) · herkunft 601. Eingetragen ist der gespielte
     Zustand, aufgerundet. */
  score: 790, duell: 500, kampfwert: 780, serie: 700, laufmock: 610, herkunft: 610,
  /* Die Aufstellungs-Runden, ebenfalls nachgemessen: aufstellen 243 · kartenteile 186 ·
     overlap 190 (dieselbe Komponente wie formation). Sie fehlten hier zuerst ganz und fielen
     damit auf PROBE_MAX — 375 px für ein 186-px-Feld. Das Modell lag dadurch bis zu 40 % zu hoch,
     und ein Budget, das so weit danebenliegt, misst nichts mehr. */
  aufstellen: 260, kartenteile: 215, overlap: 215,
  /* Die Architekt-Runden. Das Brett ist der teuerste Baustein des ganzen Tutorials: acht Zeilen
     mal fünf Spalten. GEMESSEN archmock 299 · bauen 286 · struktur 438. */
  archmock: 320, bauen: 310, struktur: 460,
  // Wahl und Blitz, gemessen: kategorien 199 · raritaet 157 · blitzkarte 272.
  kategorien: 215, raritaet: 175, blitzkarte: 290,
  /* Feuer, Pflanze, Eis — gemessen: feuerkarten 271 · hitze 152 · pflanzkarte 305 ·
     gruenfeld 315 · gletscher 252 · gletscherfeld 358. Zum VIERTEN Mal in diesem Task war ein
     neues Feld hier zuerst nicht eingetragen und fiel auf PROBE_MAX; wer ein Probierfeld baut,
     trägt es HIER ein, sonst misst das Budget etwas anderes als der Leser sieht. */
  feuerkarten: 290, hitze: 170, pflanzkarte: 325, gruenfeld: 335, gletscher: 270, gletscherfeld: 375,
  // Nach dem Lauf und Fortgeschritten, gemessen: gomock 299 · meilenstein 169 · baum 352 ·
  // laenge 299 · segmente 311.
  gomock: 320, meilenstein: 190, baum: 370, laenge: 320, segmente: 330 };
const PROBE_MAX = Math.max(...Object.values(PROBE_PX));

const lines = (text) => Math.max(1, Math.ceil(String(text || "").length / CHARS_PER_LINE));
const regelLines = (text) => Math.max(1, Math.ceil(String(text || "").trim().length / REGEL_CHARS));

/* Höhe EINES Takts. `text` ist der aufgelöste Anzeigetext — der Katalog kennt ihn nicht, der Aufrufer
   schon (der Wächter liest ihn aus de.js, die Laufzeit aus `t`). */
export function beatHeight(beat, text) {
  switch (beat.kind) {
    case "satz":        return lines(text) * SATZ_LINE + SATZ_MARGIN;
    /* Der beschriftete Kasten. Die Zahlen sind NICHT an den Entwurf angepasst, sondern aus der
       Polsterung der Komponente abgeleitet (beats.jsx, Block): 12 + 12 Polsterung, 2 Rahmen,
       14 Abstand = 40; die Überschrift 15 Zeile + 6 Abstand = 21. Beides aufgerundet, weil das
       Modell eher zu viel schätzen soll. Eine Kurvenanpassung an die `.zeile`-Kästen des Entwurfs
       wäre hier falsch gewesen: die tragen Listen und verschachtelte Teile und streuen um 31 px. */
    case "block":       return lines(text) * SATZ_LINE + BLOCK_CHROME + (beat.label ? BLOCK_LABEL : 0);
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
      return teile.reduce((s, t) => s + regelLines(t) * REGEL_LINE + REGEL_CHROME, 0);
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
    (sum, b, i) => sum + beatHeight(b, resolve(beatKey(section, lesson, i))), BODY_CHROME);
}
