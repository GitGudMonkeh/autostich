import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
/* MH4: THE SAME implementation `node scripts/exempt-reach.mjs` prints — not a second one beside it.
   A counter-check that inspects a copy is green while the original fails. */
import { reichweite } from "../scripts/exempt-reach.mjs";

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
/* #menu-rework M9. Drei Listen, alle GEZAEHLT statt gepraegt — die Form, die §2c seit M2b vorgibt.

   PV — der Datenschutz-Hinweis hat KEINEN freigegebenen Entwurf (H-b). Er wurde migriert, wo ein
   Schritt wertgleich vorlag (`--sf-scrim` fuer den Ueberzug, `--ed-quiet` fuer die Kopf-Unterkante)
   und sonst nicht angefasst. Was bleibt, ist M9-G1: `#0f0f14`/`#33333e` der Kennungs-Box, fuer die
   die Leiter nichts hat, plus die Kanten- und Schriftfarben seiner Abschnitts-Aussage.

   UN — der Zeilengrund und die durchscheinende Kante (M8-G2 / MENU-38, beide als Ratsche gefuehrt),
   die Fehlerfarben des Namensfilters, die Rolle „an / gekauft" und der Rang-Chip.

   FB — dieselben zwei Familien plus die drei Farbrollen der Meldungen (MENU-48 steht bei zwei
   unabhaengigen Sichtungen und wird auf der dritten ein Token, nicht vorher). */
const PV_STATE_LITERALS = ["#0f0f14", "#33333e", "#6d6b7a"];
/* #menu-rework MR1 — DER ZEILENGRUND IST AUS BEIDEN LISTEN GESTRICHEN, und das ist die Ratsche, die
   nach unten dreht: `rgba(15, 15, 21, .72)` war das erste Literal beider Listen, es steht seit MR1 als
   `--sf-row` im `@theme`-Block, und was ein Token ist, ist keine gezaehlte Luecke mehr. Was die
   Streichung ERSETZT, steht ganz unten als eigener Waechter: das Literal darf im ganzen Baum nur noch
   EINMAL vorkommen, naemlich in seiner eigenen Deklaration. Das ist strenger als der Eintrag hier —
   der deckte eine Datei, die Invariante deckt den Baum. */
const UN_STATE_LITERALS = ["rgba(150, 150, 170, .12)", "#221114", "#54e08a",
  "#5f6b62", "#d8b25e", "#e2685f", "#f0bdb8"];
const FB_STATE_LITERALS = ["rgba(150, 150, 170, .12)", "#123a25", "#2f7a4f",
  "#3a1518", "#d1462f66", "#3a2a15", "#d0902f", "#54e08a", "#6c6c7e", "#e0a05a"];

/* #menu-rework M4 — DER SIEGESBILDSCHIRM. Neunzehn Literale, alle GEZAEHLT statt gepraegt, und keines
   davon ist eine Bequemlichkeit: der Screen hat KEINEN freigegebenen Entwurf (task-contract-M4 —
   "Migration only. There is no design commission for this screen"), also wird das Vokabular genommen
   und sonst nichts angefasst. Drei Werte WAREN Schritte und stehen deshalb nicht mehr hier — der
   Ueberzug (`--sf-scrim`), die Flaeche der Gebaeudeliste (`--sf-base`) und die ruhende Kante der
   Gebaeude-Zeile (`--ed-quiet`).

   Was bleibt, in fuenf Gruppen:

     DAS GOLD DER FREISCHALTUNG — `#1c1708`/`#14110c` (das Fenster), `#0c0c10` (der Bildhalter
       dahinter), `#d4a63a55` (seine Kante), `#1a1608` (Willkommensbonus, Onboarding, Meta-Fenster),
       `#141019`/`#3a2f12` (die Kacheln darin). Das ist `as-legendary`, eine ROLLENFARBE aus
       design-sprache.md §3, und damit dieselbe Antwort wie `#d4a63a` in RunStats.jsx: Bedeutung, kein
       Chrome. EINE FALLE IST HIER BENANNT: `#141019` ist zeichengleich `--sf-deep` — und `--sf-deep`
       ist in 2c ausdruecklich intern ("No call site names it"), der Schlussanschlag von
       `--sf-raised`. Gleiche Zahl, andere Rolle; sie zu verwechseln waere ein Schritt, den die Leiter
       gar nicht anbietet.
     DER UEBERZUG DES FREISCHALT-FENSTERS — `rgba(8, 8, 12, .82)`. `--sf-scrim` ist
       rgba(12, 12, 16, .8) und damit 4/4/4 plus .02 daneben; das Fenster steht ausserdem in JEDER
       Breite. M3 hat fuer genau diese Sorte eine Ausnahme ERBETEN und bekommen, mit dem Satz, dass es
       dafuer keine stehende Erlaubnis gibt — die naechste wird wieder gefragt. Also gefragt und nicht
       genommen: M4-F03.
     DER WEISSE HAUCH UND SEINE NACHBARN — `#ffffff0d` (Rekord-Abstands-Chip) und `#0e0e13`
       (Meilensteinbalken samt Teilern). Dieselbe Familie wie M3-G2 / M7-G2 / M8-G3: sie liegen UNTER
       dem tiefsten Schritt bzw. UEBER dem Glas, und `--sf-sunken` ist deckend.
     DIE ZUSTANDSFARBEN — `#3a1214`/`#e05555` (der DP-Abzug, rot), `#12313f`/`#191922` (Gebaeude
       angetippt gegen ruhend), `#241b34`/`#6b4fa0` (der Leitfaden-Chip). Fuer ein Zustandspaar hat
       die Leiter keinen Schritt — MENU-46/47/48, seit dem Freeze als Ratsche gefuehrt.
     DIE SIGNALE — `#5a8ade`/`#5ec8f0` (der Architekt) und `#33333e` (die Kante des Chips, dieselbe
       wie M9s Kennungs-Box). #go-ruhe fuehrt den blauen Rahmen ausdruecklich unter "was NICHT
       angefasst ist"; er gehoert dem Architekten, nicht diesem Screen. */
const GO_STATE_LITERALS = [
  /* Gold / as-legendary */ "#1c1708", "#14110c", "#0c0c10", "#d4a63a55", "#1a1608", "#141019", "#3a2f12",
  /* Ueberzug (M4-F03)  */ "rgba(8, 8, 12, .82)",
  /* Hauch / darunter   */ "#ffffff0d", "#0e0e13",
  /* Zustandspaare      */ "#3a1214", "#e05555", "#12313f", "#191922", "#241b34", "#6b4fa0",
  /* Signale            */ "#5a8ade", "#5ec8f0", "#33333e",
];

/* #menu-rework M5 — DER LEITFADEN. Fuenfzehn Literale, alle GEZAEHLT statt gepraegt, und die Grenze
   liegt hier schaerfer als bei jedem Screen davor: `DeckDetail.jsx` rendert `GuideBody` aus dieser
   Datei, und M3 hat `DeckDetail` oberhalb 1280 px als UNERREICHBAR gemessen — null Einstiege bei
   1280 und 1536, vier bei 1100. Jeder Wert, den keine `.gd-*`-Desktop-Regel umzeigt, wird also auch
   unter 1280 px gelesen, und dort gilt Entscheidung 9. Wertgleich umgestellt wurde deshalb genau
   EINES (`#141419` = `--sf-ground`, dreimal); alles andere ist Befund geblieben, kein Diff.

     M5-F02, DIE KANTE, DIE UM EINS DANEBEN LIEGT. `#2a2a33` steht an ACHT Stellen und ist
       `--ed-quiet` (#2a2a34) minus EINE Einheit Blau. Das ist unter M3s gewaehrter Schwelle von
       1,8/255 — und M3s Bewilligung hat ausdruecklich KEINE stehende Erlaubnis geschaffen, M4 hat
       fuer eine groessere gefragt und keine bekommen. Also gefragt, nicht genommen.
     DIE BALKENTEILE — `#0c0c11` (die Spur), `#07070b` (die Teiler darin), `#f4f2ff` und
       `#cfefff` (die Bruchmarke und ihr Schein). Ein Balkengrund liegt UNTER dem tiefsten Schritt
       (`--sf-sunken` ist #141320), und die Marke ist ein Signal. Dieselbe Familie wie M7-G1.
     DIE ZEICHENKACHELN — `#0e0e13` mit `#33333e`. M7 fuehrt `#0e0e13` als G3, M9 `#33333e` als
       Kante seiner Kennungs-Box; beide sind schon gezaehlt, hier zum wiederholten Mal.
     DER KNOPF — `#20202a`/`#3a3a4a` an `GuideButton`. Ein Steuerelement ist kein Panel (2c fuehrt
       `--ctl-*` genau dafuer ausserhalb der Leiter), und dieser Knopf steht in JEDER Breite.
     DIE ZWEI KASTEN-VERLAEUFE — `#1a1826`/`#16161c` (der Kern-Kasten) und `#17151f` (die
       Marke am Prinzip). Kein Schritt trifft sie; `--sf-base` (#17171c) liegt 0/2/3 neben `#17151f`.
     DIE HANDY-FASSUNG — `rgba(6,6,10,.66)` ist der Ueberzug UNTER 1280 px; ab da zeigt `.gd-dim`
       ihn auf `--sf-scrim-desk` um. Dieselbe Lage wie `#0c0c10ee` bei M7 und `#0c0c10cc` bei M4.
     `#131318` ist die gewaehlte Reiterflaeche der Handy-Fassung (`.gd-tabs` ist ab 1280 px
       `display: none`), `#000` der Schlagschatten der Handy-Karte — beide unter 1280 px und damit
       in 2c dauerhaft ausgenommen. */
const GD_STATE_LITERALS = [
  /* M5-F02      */ "#2a2a33",
  /* Balken      */ "#0c0c11", "#07070b", "#f4f2ff", "#cfefff",
  /* Zeichen     */ "#0e0e13", "#33333e",
  /* Steuerelem. */ "#20202a", "#3a3a4a",
  /* Kaesten     */ "#1a1826", "#16161c", "#17151f",
  /* Handy       */ "rgba(6,6,10,.66)", "#131318", "#000",
];

/* #menu-rework M6 — DAS GLOSSAR. Vier Literale, alle GEZAEHLT statt gepraegt, und alle vier stehen
   UNTER 1280 px oder in jeder Breite — die Datei setzt oberhalb des Bruchpunkts gar nichts mehr
   inline, was eine der fuenf Achsen traefe.

     DIE HANDY-WAESCHE — `rgba(6,6,10,.66)` ist der Ueberzug UNTER 1280 px; ab da zeigt `.gl-dim` ihn
       auf `--sf-scrim-desk` um. Zeichengleich derselbe Wert, den M5 fuer den Leitfaden zaehlt, und
       dieselbe Lage wie `#0c0c10ee` bei M7 und `#0c0c10cc` bei M4.
     DER SCHLAGSCHATTEN DER HANDY-KARTE — `#000` in `0 30px 80px -30px #000`. Ab 1280 px setzt
       `.gl-card` `box-shadow: none !important`; wirksam ist er nur darunter, und das ist in 2c
       dauerhaft ausgenommen. Auch das ist M5s Eintrag, ein Screen weiter.
     DAS SUCHFELD — `#0f0f14` mit `#33333e`. Genau M9s Kennungs-Box (PV_STATE_LITERALS), hier zum
       wiederholten Mal: die Leiter hat fuer diese Flaeche nichts (`--sf-sunken` ist `#141320` und
       liegt 5/4/12 daneben), und `#33333e` ist die Kante dazu. Ab 1280 px ueberschreibt
       `.gl-search input` beide — der Grund als `--sf-row` seit MR1, die Kante seit hier als
       `--ed-quiet`. Das Literal ist also die HANDY-Fassung, und `#33333e` traegt zusaetzlich den
       Verlauf der Sektions-Trennlinie, der in JEDER Breite steht.

   WAS HIER NICHT MEHR STEHT: `#2c2a3a`. Es IST `--ed-base`, Zeichen fuer Zeichen, und die zwei
   Fundstellen (die Unterkante des Kopfes und die der Chip-Leiste) lesen jetzt den Schritt. Beide
   werden NUR unter 1280 px gelesen — der Desktop-Block setzt `border-bottom: none` bzw.
   `display: none` —, deshalb ist die Wertgleichheit nicht behauptet, sondern gemessen: ein Token
   mit einer Deklaration und ohne Media-Ueberschreibung hat einen Wert in jeder Breite, abgelesen am
   LEBENDEN Dokument bei 1920 / 1280 / 1100 / 390 px (evidence/M6/*-mounts, `tokenAtWidths`). */
const GL_STATE_LITERALS = [
  /* Handy-Waesche */ "rgba(6,6,10,.66)",
  /* Handy-Schatten */ "#000",
  /* Suchfeld + Trennlinie */ "#0f0f14", "#33333e",
];

/* #menu-rework M11 — DIE LAUF-DIALOGE, die letzte Einheit dieser Runde. Vier Dateien, und nur drei
   von ihnen tragen ueberhaupt einen Wert auf einer der fuenf Achsen.

     `RunConfirm.jsx` steht nach der Umstellung auf NULL. Sein Ueberzug war `#0c0c10cc` und das IST
       `--sf-scrim` — rgba(12, 12, 16, .8), und .8 ist 0xcc genau. Die drei Farben, die bleiben, sind
       GOLD / RED / GREY: die Kantenfarben der drei Wege (primaer / gefaehrlich / Ausstieg). Das ist
       „meaning-coded borders" aus 2c, dieselbe Antwort wie bei `#d4a63a` in RunStats.jsx — und sie
       stehen als MODUL-KONSTANTEN, die kein Waechter dieser Datei sieht (M11-F08).
     `RunLoader.jsx` traegt drei, alle gezaehlt statt gepraegt:
       `#0c0c10f2` — der Ueberzug. `--sf-scrim-desk` ist rgba(12, 12, 16, .94) und damit 0/0/0 in der
         Farbe, aber 2,3/255 in der ALPHA. Die Schwelle des Planners gilt „bei <= 2/255 je Kanal OHNE
         Alpha-Aenderung"; hier bewegt sich genau die Alpha. Gefragt, nicht genommen (M11-F03).
       `#2a2836` — die Kante der Balkenspur. `--ed-quiet` (#2a2a34) liegt 0/2/2 daneben, also GENAU auf
         der Schwelle, und der Balken steht in jeder Breite. Gefragt, nicht genommen (M11-F04).
       `rgba(155,130,240,0.4)` — der Schein am Balken. `--el-glow-*` gehoert nach #ruhe dem primaeren
         CTA, und ein Ladebalken ist keiner: MENU-50s Antwort, zum wiederholten Mal.
     `UpdateBanner.jsx` traegt drei:
       `#1b1b24` — die Flaeche der Leiste. `--sf-head` (#1b1a24) liegt 0/1/0 daneben — EINE Einheit
         Gruen, dieselbe Groessenordnung wie M5-F02, die der Planner gewaehrt hat. Die Leiste steht in
         jeder Breite. Gefragt, nicht genommen (M11-F02).
       `#3a3a48` — ihre Kante. `--ctl-edge` (#3a3a44) liegt 0/0/4 daneben, also ueber der Schwelle.
         M8 fuehrt denselben Wert als GESTRICHELTE Kante seiner Baum-Pille; hier ist er eine
         durchgezogene Kante an einem Hinweis. Gezaehlt.
       `#000` — der Schlagschatten. `--el-float` ist `0 14px 44px rgba(0, 0, 0, .42)`; das hier ist
         `0 6px 24px -8px`, eine andere Geste an einer Leiste, die am Fensterrand klebt. Gezaehlt.
     `PwaInstall.jsx` traegt KEINEN Achsen-Wert — die Datei setzt nur eine Textfarbe, und die steht als
       Modul-Konstante (`AM`). Sie ist damit die einzige migrierte Datei dieser Runde, an der es nichts
       umzustellen gab; sie steht trotzdem in der Liste, weil eine Datei, die niemand beobachtet, die
       naechste ist, in der jemand einen Wert ablegt. */
const RC_STATE_LITERALS = [];
const RL_STATE_LITERALS = ["#0c0c10f2", "#2a2836", "rgba(155,130,240,0.4)"];
const UB_STATE_LITERALS = ["#1b1b24", "#3a3a48", "#000"];

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
  /* #menu-rework M3 — der Upgrade-Baum. Er ist der Screen, von dem die Werte STAMMEN: `index.css`
     sagt an zehn Stellen „Werte 1:1 von `.up-*` uebernommen", und M1 hat die Schritte durch Zaehlen
     von Fundstellen abgeleitet. Ein Token traegt hier also oft den Wert dieses Screens, einen
     Schritt entfernt — was ihn migriert, macht das Vokabular an seiner Quelle wahr statt an einer
     Kopie. */
  { path: "src/ui/UpgradeScreen.jsx" },
  /* #menu-rework M7 — DIE STATISTIK UND DAS LAUF-FENSTER, die zwei Screens, die dieser Auftrag
     GESTALTET. Die drei GETEILTEN Komponenten (`RunStats`, `RunGraphs`, `Sparkline`) kommen einen
     Commit spaeter dazu und sind dort ausdruecklich wertetreu umgestellt, nicht umgestaltet: ihr
     Aussehen gehoert der Laufbuehne und dem Siegesbildschirm. Die Trennung steht hier als zwei
     Eintragsgruppen, weil sie genau der Naht folgt, an der der Auftrag entschieden wird.

     `stateLiterals` traegt zwei Sorten, und beide sind gezaehlt statt gepraegt:

       DIE HANDY-WAESCHE. Der Ueberzug beider Screens steht INLINE, und der Inline-Wert ist der Wert
         der SCHMALEN Fassung: ab 1280 px ueberschreibt ihn `.st-root`/`.rd-root` mit
         `--sf-scrim-desk`. Wirksam ist das Literal also ausschliesslich unter 1280 px — und was dort
         steht, ist in 2c ausdruecklich dauerhaft ausgenommen. Es auf einen Schritt zu ziehen hiesse,
         die Handy-Fassung zu bewegen, um einen Waechter gruen zu bekommen: beim Lauf-Fenster von
         DECKEND auf 94 %, was man sieht.
       M7-G4, DAS ZUSTANDSPAAR DER GEBAEUDELISTE. „angetippt" gegen „ruhend", plus der Schein, der am
         Brett dazu leuchtet. Fuer ein Zustandspaar hat die Leiter keinen Schritt (MENU-46/47/48),
         und `--el-glow-*` ist nach #ruhe dem primaeren CTA vorbehalten (MENU-50). Die RUHENDE Kante
         ist umgestellt — sie war `#2a2a34`, und das IST `--ed-quiet`. */
  { path: "src/ui/StatsScreen.jsx", stateLiterals: ["#0c0c10ee"] },
  { path: "src/ui/RunDetail.jsx",
    stateLiterals: ["#0c0c10", "#12313f", "#191922", "#5ec8f0", "#5ec8f055", "#5a8ade", "#141419", "#2a2a34"] },
  { path: "src/ui/SeedChip.jsx" },
  /* #mainscreen-branding C — DER MAINSCREEN, und er ist der letzte. Er kommt als EIN Eintrag ueber die
     ganze Datei, wie `.cz-` seit M2b und `.up-` seit M3: ein Screen ist entweder migriert oder nicht,
     und eine Aufzaehlung einzelner Bausteine waere eine halbe Migration. */
  { path: "src/ui/StartScreen.jsx", stateLiterals: [
    /* SPIELGRAFIK — die Abdunkelung ueber dem Spielfeld-Bodenband. Sie kleidet kein Panel, sondern
       liegt UEBER einem Bild, damit 40 unterschiedlich helle Spielfelder gemeinsam unter die
       Kontrastforderung kommen. Dieselbe Sorte Ausnahme wie `CZ_SCENES` in M2b, nur ohne eigene
       Funktion, an der man sie aufhaengen koennte. */
    "rgba(20,20,25,0)", "rgba(17,17,22,.55)", "rgba(17,17,22,.82)",
    /* HANDY-WAESCHE — die Bonus-Leiste rendert AUCH unter 1280 px, und ein Inline-Style kennt keine
       Media Query. Der Wert ist damit gleichzeitig der Wertetraeger der schmalen Fassung, und §2c
       nimmt alles unter 1280 px dauerhaft aus. Ihn umzustellen hiesse, das Handy zu bewegen, um einen
       Waechter gruen zu bekommen — dieselbe Lage wie M7s Ueberzug. Gemessen daneben: `--sf-glass` ist
       ein Verlauf ueber zwei Stopps (.93/.95), dies ist eine flache Flaeche bei .5. */
    "rgba(23,23,28,0.5)",
    /* MENU-38, zwei von zwoelf. `.10` an derselben Bonus-Leiste, `.18` an der ruhenden Kante des
       Kachel-Streifens. Beide rendern unter 1280 px mit, beide gehoeren der durchscheinenden
       Kanten-Familie, die diese Runde RATSCHT statt einsammelt — und die Kanten-Ratsche weiter unten
       zaehlt sie. Die anderen zwei dieses Screens (`.22`, `.25`) haben ihn in C3 verlassen. */
    "rgba(150,150,170,0.10)", "rgba(150,150,170,.18)",
  ] },
  { path: "src/ui/BrandGrid.jsx" },
  /* --- Der GETEILTE Teilbaum. Er steht hier als KOMPONENTEN, nicht als Ecken dieses Screens:
     `RunStats` und `RunGraphs` rendert auch der Siegesbildschirm, `Sparkline` zusaetzlich die
     LAUFBUEHNE (`StatusRail.jsx:133`). Wertetreu umgestellt, nicht umgestaltet — der Beweis ist
     `run-stage` bei null Deltas in der Maschinen-Haelfte.

     `stateLiterals` traegt hier drei Familien, alle gezaehlt statt gepraegt:
       M7-G1 — die SPUR eines Balkens (`#0c0d14`, `#1e1e26`). Sie liegt UNTER jedem Panel-Schritt:
         `--sf-sunken` ist `#141320` und damit 8/6/12 heller, wo diese dunkler sein muss als alles,
         was auf ihr liegt. Erste Sichtung.
       M7-G3 — der Grund einer eingeschobenen Erklaerzeile (`#0e0e13`, `#131318`) und ihre
         gestrichelte Kante (`#2f2f3b`). Dieselbe Lage: unter dem tiefsten Schritt, und die
         gestrichelte Kante sagt „hier fehlt etwas absichtlich", ist also Signal, keine Struktur.
       PERMANENT — `#d4a63a` markiert einen legendaeren Skill. Gold ist eine Rollenfarbe
         (design-sprache.md §3) und steht in 2c unter „meaning-coded borders". */
  { path: "src/ui/RunStats.jsx",
    stateLiterals: ["#1e1e26", "#0e0e13", "#131318", "#2f2f3b", "#d4a63a"] },
  { path: "src/ui/RunGraphs.jsx", stateLiterals: ["#0c0d14"],
    /* M7-G5 — `rounded-[2px]` und `rounded-[3px]` auf 9-px-Farbmarken. `--rd-sm` ist 6 px und machte
       aus einer 9-px-Marke fast einen Kreis; Tailwinds benannte Nachbarn sind 2 px und 4 px. Ein
       echter Mikro-Fall mit vier Fundstellen, gemeldet statt umgeschrieben — dieselbe Antwort wie
       MENU-51. Eine Marke um 3 px zu runden, die auch unter 1280 px steht, ist eine Bewegung, die
       niemand bestellt hat. */
    utilExempt: ["rounded-[2px]", "rounded-[3px]"] },
  { path: "src/ui/Sparkline.jsx" },
  /* #menu-rework M8 — DIE BESTENLISTE, beide Einstiege. Drei Dateien, und die dritte ist geteilt:
     `WeekMods.jsx` exportiert die Chips, die dieser Screen unter 1280 px rendert, UND das Panel, das
     nur im Ranglisten-LAUF unter dem Brett steht. Was dort umgestellt wurde, ist wertgleich
     (`--sf-raised` ist der Verlauf Zeichen fuer Zeichen); alles andere steht unten als gezaehltes
     Literal.

     `stateLiterals` traegt hier drei Sorten, alle gezaehlt statt gepraegt:

       DIE HANDY-WAESCHE, wie bei M7 und aus demselben Grund. `#0c0c10ee` ist der Ueberzug, den das
         Overlay INLINE setzt; ab 1280 px ueberschreibt `.lb-root` ihn mit `--sf-scrim-desk`.
         Wirksam ist das Literal also nur unter 1280 px, und das ist in 2c dauerhaft ausgenommen.
         `#141419` daneben ist WEG — es war `--sf-ground` und liest den Schritt jetzt.
       M8-G5, DIE ZWEITE KANTE. `#26262e` steht an `.lb-page` und an der gerahmten Fassung von
         `GlobalLeaderboard` (die im HUB haengt, nicht auf diesem Screen). Die Kanten-Leiter beginnt
         bei `--ed-quiet` (#2a2a34) und liegt 4/4/6 daneben — sichtbar, und beide Fundstellen sind
         auch unter 1280 px sichtbar. Zweite Sichtung der Familie „Kante, die kein Schritt ist".
       M8-G2, DER ZEILENGRUND ALS DECKENDES LITERAL. `#17161f`, `#1c1b24`, `#20202a`, `#15151d`,
         `#131218` und `#2a2833` sind die Flaechen der schmalen Fassung — Mod-Kasten, Seed-Chip,
         Champion-Zeile, Baum-Pille, Seed-Kasten, Trennlinie. Keiner davon hat einen Schritt:
         `--sf-sunken` (#141320) ist der tiefste, und alle sechs liegen darueber. Ab 1280 px
         ueberschreibt index.css die ersten beiden; die uebrigen sind die Handy-Fassung.
       PERMANENT — `#3a3a48` ist die GESTRICHELTE Kante der Baum-Pille: sie sagt „hier fehlt ein
         Wert absichtlich" und ist damit Signal, keine Struktur (dieselbe Antwort wie M7-G3).
         `#d4a63a` ist Gold, eine Rollenfarbe aus design-sprache.md §3. */
  { path: "src/ui/LeaderboardScreen.jsx",
    stateLiterals: ["#0c0c10ee", "#26262e", "#17161f", "#131218", "#1c1b24", "#20202a"] },
  { path: "src/ui/GlobalLeaderboard.jsx",
    stateLiterals: ["#26262e", "#15151d", "#3a3a48"],
    /* M8-G6 — `py-[1px]` polstert die ZWEI ZIFFERN der Baum-Pille gegen ihre eigene Kapsel. Das ist
       MENU-51 noch einmal, eine Sprosse kleiner: `--btn-pad-y` (0.625rem) ist das Zehnfache, und
       Tailwinds benannte Nachbarn sind 2 px (py-0.5) und 4 px (py-1) — es gibt kein 1. Die Pille
       steht in JEDER Breite, also waere „auf 2 px hoch" eine Bewegung der Handy-Fassung fuer einen
       gruenen Waechter. Gemeldet, nicht umgeschrieben — dritte Sichtung dieser Familie. */
    utilExempt: ["py-[1px]"] },
  { path: "src/ui/WeekMods.jsx", stateLiterals: ["#17161f", "#2a2833", "#1a1922"] },
  /* #menu-rework M9 — die drei kleinen Modals. Sie sind die reinsten Verbraucher der Modal-Schale im
     Baum und standen im Auftrag als BESTAETIGUNG, nicht als Entdeckung: haelt das Vokabular
     irgendwo, dann hier. Es haelt — die Zielwerte beider Entwuerfe (`rgba(19,19,26,.9)`,
     `rgba(32,32,44,.95)`, `#3a3a44`, Radius 8, Radius 14, 9/5-%-Toenung, 11/13) liegen ALLE als
     Schritt vor und keiner musste gepraegt werden.
     `modalIcons.jsx` traegt keine Werte — ein Pfad-Satz, `currentColor`, keine Flaeche. */
  { path: "src/ui/modalIcons.jsx" },
  { path: "src/ui/PrivacyModal.jsx", stateLiterals: PV_STATE_LITERALS },
  { path: "src/ui/UsernameModal.jsx", stateLiterals: UN_STATE_LITERALS },
  { path: "src/ui/FeedbackModal.jsx", stateLiterals: FB_STATE_LITERALS },
  /* #menu-rework M4 — der Siegesbildschirm. `UnlockModal` ist in dieser Datei definiert und gehoert
     dazu; die vier Komponenten, die der Screen nur RENDERT (`GuideOverlay`, `CardGrid`,
     `ArchToggle`, `FormIcon`), gehoeren ihm nicht und stehen deshalb weder hier noch im Diff. */
  { path: "src/ui/GameOver.jsx", stateLiterals: GO_STATE_LITERALS },
  /* #menu-rework M5 — der Leitfaden. `GuideBody`, `GuideButton`, `LoopRing`, `SecLabel`, `Bar` und
     `RT` sind in dieser Datei definiert und gehoeren dazu. `DeckDetail`, `SkillSelect`, `CardGrid`
     und `FactionIcon` gehoeren ihr NICHT — dass der Screen sie rendert oder von ihnen gerendert
     wird, macht sie nicht zu seinen. */
  { path: "src/ui/GuideOverlay.jsx", stateLiterals: GD_STATE_LITERALS },
  /* #menu-rework M6 — das Glossar. `GlossaryOverlay`, `GlossaryButton`, `GlossaryPanel`,
     `GlossaryText`, `NavRow`, `TermRow` und das `Chip` dieser Datei sind darin definiert und
     gehoeren dazu. DIE NEUN EINSTIEGE GEHOEREN IHR NICHT: dass `SkillSelect`, `PerkSelect`,
     `LegendarySelect`, `FormationPhase`, `ArchitectScreen`, `HeldSkills`, `StartScreen`,
     `CornerTools` und `App` diese Komponenten MOUNTEN, macht sie nicht zu ihren — dieselbe Grenze,
     die M5 fuer `DeckDetail`/`SkillSelect` und M4 fuer die vier gerenderten Komponenten gezogen hat.
     Und `Chip` gibt es dreimal im Baum (hier, in `CardDetail.jsx`, in `StartScreen.jsx`): drei
     eigenstaendige Komponenten mit demselben Namen, von denen dieser Eintrag genau eine deckt. */
  { path: "src/ui/Glossary.jsx", stateLiterals: GL_STATE_LITERALS },
  /* #menu-rework M11 — die vier Lauf-Dialoge. `RunConfirm.jsx` exportiert `AbortConfirm` und
     `RestartConfirm`; ein `<RunConfirm>` gibt es NICHT, und der Eintrag deckt die Datei, nicht einen
     Namen, den niemand rendert. `ActionBar`, `ActionButton`, `ModalHairline` und `OptionRow` gehoeren
     ihnen nicht — das sind M1s Primitive, und dass diese vier sie rendern, macht sie nicht zu ihren.
     `RC_STATE_LITERALS` ist bewusst LEER und steht trotzdem da: die Datei traegt nach der Umstellung
     keinen Achsen-Wert mehr, und eine leere Liste sagt das, wo ein fehlender Eintrag nichts sagt. */
  { path: "src/ui/RunConfirm.jsx", stateLiterals: RC_STATE_LITERALS },
  { path: "src/ui/RunLoader.jsx", stateLiterals: RL_STATE_LITERALS },
  { path: "src/ui/UpdateBanner.jsx", stateLiterals: UB_STATE_LITERALS },
  { path: "src/ui/PwaInstall.jsx" },
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
/* M6s zwei Praefixe stehen als eigene Konstante, damit die Gegenprobe weiter unten sie EINZELN
   pruefen kann: `.gl-wrap` faellt nur auf, wenn man fragt, was DIESER Eintrag einsammelt — in der
   Gesamtliste deckt M8s `\.lb-` dieselbe Regel voellig zu Recht ab. */
const M3_TREE_SELECTOR = /\.up-(?!banner)/;
const M6_SELECTORS = [/\.gl-(?!wrap)/, /\.gloss-/];
/* M11s Praefixe stehen ebenfalls einzeln, damit die Gegenprobe unten die Naht zu M3 pruefen kann. */
const M11_SELECTORS = [/\.rc-/, /\.up-banner/];
const MIGRATED_SELECTORS = [/\.op-/, /\.as-opt-/, /\.as-panel-sunken/, /\.as-shell/, /\.as-head\b/,
  /* M9: `.un-` und `.fb-` MEINEN DIE ZWEI SCREENS, wie `.cz-`, `.up-`, `.st-` und `.rd-` ihre. Der
     Datenschutz-Hinweis hat keine eigenen Selektoren — er traegt `as-panel`, `as-edge` und Tailwind —,
     seine Migration steht deshalb allein auf der JSX-Seite. */
  /\.un-/, /\.fb-/,
  /\.cz-/,
  /* M3: `.up-` MEINT DEN GANZEN SCREEN, wie `.cz-` seit M2b. Ein Screen ist entweder migriert oder
     nicht; eine Aufzaehlung einzelner Bausteine waere eine halbe Migration, und eine halbe Migration
     ist, wie die 43 Schatten entstanden sind.
     M11: der Ausdruck steht als KONSTANTE, damit die Naht-Gegenprobe ihn pruefen kann statt ihn
     abzuschreiben — eine Gegenprobe, die eine Kopie prueft, ist gruen, waehrend das Original faellt. */
  M3_TREE_SELECTOR,
  /* #mainscreen-branding C: `.hub-` und `.as-hub-` MEINEN DEN GANZEN SCREEN, wie `.cz-`, `.up-`,
     `.st-`, `.rd-`, `.lb-`, `.go-`, `.gd-` und `.gl-` ihre. Dazu die vier Klassenfamilien, die dieser
     Auftrag NEU angelegt hat — die Marke, das Lockup, die Tagline und die Deck-Tafel: sie gehoeren
     demselben Screen und waeren sonst der einzige Teil von ihm, den die Ratsche nicht sieht. */
  /\.hub-/, /\.as-hub-/, /\.as-deck/, /\.as-lockup/, /\.as-tagline/, /\.as-brandgrid/, /\.as-bg-/,
  /\.as-week-chip/,
  /* M7: `.st-` und `.rd-` MEINEN DIE ZWEI SCREENS, wie `.cz-` und `.up-` ihre. `.rs-` und `.rg-`
     gehoeren dazu, aber nur SO WEIT SIE DIESER SCREEN FAERBT: die drei Komponenten teilen sich
     Victory und Chronik, und jede Regel, die sie anfasst, ist deshalb ohnehin auf `.rd-`/`.go-`
     eingegrenzt (Waechter: rd-ruhe). Ein blosser `/\.rs-/` wuerde die Victory-Regeln mit
     einsammeln, die dieser Runde nicht gehoeren — deshalb der Praefix mit Screen davor. */
  /* M8: `.lb-` MEINT DEN GANZEN SCREEN, wie `.cz-`, `.up-`, `.st-` und `.rd-` ihre. Die Regeln des
     Regeln-Reiters (`.rg-pos`, `.rg-neg`, `.rg-root`) sind darin enthalten, ohne dass `/\.rg-/`
     hier stehen muesste: sie sind alle auf `.lb-page` eingegrenzt, weil dieselben Klassennamen im
     Siegesbildschirm und in den Lauf-Details anderen Bauteilen gehoeren. Ein blosses `/\.rg-/`
     wuerde die einsammeln — dieselbe Ueberlegung, mit der M7 `.rs-`/`.rg-` nicht aufgenommen hat. */
  /* M4: `.go-` MEINT DEN GANZEN SCREEN, wie `.cz-`, `.up-`, `.st-`, `.rd-` und `.lb-` ihre. Die
     geteilten Regeln (`.st-root, .lb-root, .go-root`, `.st-card, .lb-card, .go-card`,
     `.st-card::before, .lb-body::before, .go-card::before`) sind darin enthalten und werden von M7s
     und M8s Eintraegen ohnehin schon geprueft — die Achsen-Pruefung zaehlt nicht doppelt, weil sie
     Regeln und keine Treffer sammelt. Die RATSCHEN weiter unten schliessen sie dagegen aus, sonst
     stuende dieselbe Zahl in zwei Messungen. */
  /* M5: `.gd-` MEINT DEN GANZEN SCREEN, wie die sechs davor. Die geteilten Sammelregeln des
     #eckig-Passes (`.up-close, .gd-close, …` und `.up-vnode, …, .gd-navrow, …`) sind darin
     enthalten; sie tragen ohnehin nur Token. Die RATSCHEN unten grenzen auf Regeln ein, deren
     Selektor keinem anderen migrierten Screen gehoert — eine Zahl, die zweimal gezaehlt wird, ist
     keine Messung. */
  /* M6: `.gl-` und `.gloss-` MEINEN DEN GANZEN SCREEN, wie die sieben davor. Die geteilten
     Sammelregeln des #eckig-Passes (`.up-close, .gd-close, .gl-close, …` und
     `.gd-bar, …, .gloss-term-row`) und die #ecke-Bahn (`… .gd-head, … .gl-head`) sind darin
     enthalten; sie tragen ohnehin nur Token. Die RATSCHEN unten grenzen wieder auf Regeln ein, deren
     Selektor keinem anderen migrierten Screen gehoert.

     `.gl-wrap` IST NICHT DIESER SCREEN, und das ist genau der Fehler, den `.up-banner` eine Zeile
     tiefer schon einmal gekostet hat: `.lb-pagescroll:has(.lb-cockpit) > .gl-wrap` gehoert
     `GlobalLeaderboard.jsx` (dort `<div className="gl-wrap mt-5">`) und teilt mit dem Glossar nur
     die zwei Buchstaben des Praefixes. Eine Grenze, die nach dem sichtbarsten Traeger gezogen wird,
     trifft irgendwann etwas, das nur so heisst — MENU-38 in klein, zum dritten Mal. */
  /* M11: `.rc-` MEINT DIE ZWEI RUECKFRAGEN, und `.up-banner` SCHLIESST DIE LUECKE, DIE M3 GELASSEN
     HAT. Die Zeile darueber steht seit M3 als `/\.up-(?!banner)/`, mit der Begruendung: „`.up-banner`
     ist NICHT dieser Screen. Sie gehoert keinem migrierten Screen, also darf die Erlaubnisliste sie
     nicht einsammeln." Sie gehoert jetzt einem — diesem. Die letzte Task der Runde macht aus der
     Ausnahme wieder eine Grenze, und die Gegenprobe weiter unten haelt fest, dass die zwei Ausdruecke
     zusammen jede `.up-`-Regel des Blattes decken und keine doppelt. */
  /\.st-/, /\.rd-/, /\.lb-/, /\.go-/, /\.gd-/, ...M6_SELECTORS, ...M11_SELECTORS];
/* `.up-banner` ist NICHT dieser Screen. Es ist die „Neue Version verfuegbar"-Leiste
   (`UpdateBanner.jsx`) und teilt mit dem Baum nur die zwei Buchstaben des Praefixes. Sie gehoert
   keinem migrierten Screen, also darf die Erlaubnisliste sie nicht einsammeln. Gefunden, weil der
   Waechter sie meldete — und es ist dieselbe Sorte Fehler wie bei MENU-38: eine Grenze, die nach dem
   sichtbarsten Traeger gezogen wird, trifft irgendwann etwas, das nur so heisst. */

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
/* --- M4, der Siegesbildschirm. Die drei bekannten Sorten — und eine VIERTE, die als Befund
   herausfaellt statt als Ausnahme zu verschwinden.

   Steuerelement: der Griff des Stich-Graphen (8/11) polstert gegen seine Beschriftung samt Marke, die
     zwei Aktionen (11/22) gegen ihre — genau der Fall, fuer den 2c `--btn-pad-*` ausserhalb der
     Leiter fuehrt —, und der NEU-Marker (2/6) ist MENU-51 noch einmal: eine Kapsel um drei Zeichen,
     fuer die `--btn-pad-y` das Fuenffache waere.
   Layout: `.go-blist ~ .go-ticks:has(…)` traegt 18 px als `padding-top`, weil `margin-top` in
     derselben Zeile auf `auto` steht und den Graphen an den Fuss der Spalte drueckt. Es IST die
     Fuge, die die Schwesterregel eine Zeile hoeher als `margin-top: 18px` schreibt — Anordnung, kein
     Inset, und dieselbe Unterscheidung wie bei `.up-varrow`.

   M4-F02, UND DAS IST KEINE DER DREI SORTEN. Die PANEL-Polster dieses Screens sind 15/17/17 (und auf
     flachen Fenstern 12/15/14), die Bestleistungs-Zeile 9/13. Das sind echte Panel-Insets, und die
     Leiter hat dafuer Sprossen: `--in-base` ist 18, `--in-tight` 11, `--in-snug` 13. Sie liegen um
     1 bis 3 px daneben.

     DAS IST KEINE LUECKE, SONDERN EIN UNTERSCHIED — und ihn aufzuloesen ist eine
     Gestaltungsentscheidung, keine Migration. Der Screen hat keinen freigegebenen Entwurf; ihn um
     3 px zu verschieben, weil ein Waechter dann gruen wird, ist genau das Umdekorieren, das der
     Vertrag verbietet. Halb umzustellen (`padding: 9px var(--in-snug)`) waere schlimmer: zwei
     Schreibweisen fuer eine Zahl, und die Leiter sieht danach so aus, als traege der Screen sie.
     Gemessen, gezaehlt, und als Entscheidung an den Owner gegeben — measurements/M4.md Teil 3. */
const M4_INSET_EXEMPT = [
  /* Steuerelement */ /^\.go-ticks \.rg-perTrick > summary$/, /^\.go-actions > button$/, /^\.go-bestnew$/,
  /* Layout        */ /^\.go-blist ~ \.go-ticks:has\(\.rg-perTrick\[open\]\)$/,
  /* M4-F02        */ /^\.go-heroblock, \.go-earn, \.go-best, \.go-origin, \.go-build, \.go-stats, \.go-layout$/,
  /^\.go-earn, \.go-best, \.go-origin, \.go-build, \.go-stats, \.go-layout$/, /^\.go-bestrow$/,
];

/* --- M5, der Leitfaden. Die drei bekannten Sorten, und dieselbe vierte, die M4 herausgetrennt hat.

   Steuerelement: `.gd-close` (11/18) polstert gegen seine Beschriftung und traegt darueber sein
     44-px-Klickziel — der Fall, fuer den 2c `--btn-pad-*` ausserhalb der Leiter fuehrt, und derselbe
     Eintrag, den `.up-close` und `.st-close` schon haben.
   Layout: `.gd-frame` ist der Rand des Screens im Fenster (in beiden Hoehenfassungen), `.gd-hint`
     setzt die Auskunft vom senkrechten Strich ab — eine Rasterfuge, kein Inset, dieselbe
     Unterscheidung wie bei `.up-readout` und `.cz-readout`.
   Ueberschrift: `.gd-head` (sein Polster gehoert zum Kopf), `.gd-navhead` und `.gd-navnote` —
     vertikaler Rhythmus einer Textzeile, und der gehoert dem Typografie-System, das dieser Auftrag
     ausdruecklich nicht anfasst.

   M5-F03, UND DAS IST KEINE DER DREI SORTEN. Die Panel- und Zeilenpolster dieses Screens sind
     14/12 (`.gd-nav`), 12/13 (`.gd-navrow`), 16/20/14 (`.gd-page`) und 12/14 bzw. 11/14 an den vier
     Inhaltskacheln; auf flachen Fenstern 12/10 und 12/16/10. Die Leiter hat 11 / 13 / 18. Sie liegen
     um 1 bis 3 px daneben — ein UNTERSCHIED, keine Luecke.
     Der Owner hat genau diese Frage fuer M4 bereits entschieden (`8a858c11`): beide Unterschiede
     bleiben, weil das Vokabular hier nichts vermisst und ihre Aufloesung einen Screen SICHTBAR
     bewegen wuerde, auf dem einzigen Screen-Typ dieser Runde ohne freigegebenen Entwurf. Der
     Leitfaden ist derselbe Fall, also wird er nicht ein zweites Mal gefragt — er wird gezaehlt und
     unter derselben Entscheidung gefuehrt. */
const M5_INSET_EXEMPT = [
  /* Steuerelement */ /^\.gd-close$/,
  /* Layout        */ /^\.gd-frame$/, /^\.gd-hint$/,
  /* Ueberschrift  */ /^\.gd-head$/, /^\.gd-navhead$/, /^\.gd-navnote$/,
  /* M5-F03        */ /^\.gd-nav$/, /^\.gd-navrow$/, /^\.gd-page$/,
  /^\.gd-page \.gd-pillar$/, /^\.gd-page \.gd-valve$/, /^\.gd-page \.gd-bar$/, /^\.gd-page \.gd-princ$/,
];

/* --- M6, das Glossar. Die drei bekannten Sorten, und dieselbe vierte, die M4 herausgetrennt hat.

   Steuerelement: `.gl-close` (11/18) polstert gegen seine Beschriftung und traegt darueber sein
     44-px-Klickziel — derselbe Eintrag, den `.up-close`, `.st-close` und `.gd-close` schon haben.
     `.gl-search input` (11/11) polstert gegen seinen INHALT, nicht gegen eine Panelkante; 2c fuehrt
     genau diese Sorte ausserhalb der Leiter (`--btn-pad-*`).
   Layout: `.gl-frame` ist der Rand des Screens im Fenster (in beiden Hoehenfassungen), `.gl-body`
     haelt rechts 6 px frei, damit die Rollleiste nicht auf den Begriffen sitzt — eine Rinne ist
     Anordnung, dieselbe Unterscheidung wie bei `.cz-fxlist` und `.up-skills` —, und
     `.gl-body > .gl-sec + .gl-sec` ist die Fuge ZWISCHEN zwei Sektionen, keine Panelkante.
   Ueberschrift: `.gl-head` (sein Polster gehoert zum Kopf), `.gl-navhead` und `.gl-navnote` —
     vertikaler Rhythmus einer Textzeile, und der gehoert dem Typografie-System, das dieser Auftrag
     ausdruecklich nicht anfasst.

   M6-F04, UND DAS IST KEINE DER DREI SORTEN. Die Panel- und Zeilenpolster dieses Screens sind
     14/12 (`.gl-nav`), 9/10 (`.gl-navrow`), 16/20/14 (`.gl-page`) und 11/13/12 an der
     Begriffskarte; auf flachen Fenstern 12/10 und 12/16/10. Die Leiter hat 11 / 13 / 18.
     DIE BEGRIFFSKARTE IST DER SCHAERFSTE FALL DER RUNDE und deshalb einzeln benannt: 11 IST
     `--in-tight` und 13 IST `--in-snug`, nur die 12 unten ist keine Sprosse. Sie halb umzustellen
     (`padding: var(--in-tight) var(--in-snug) 12px`) waere schlimmer als sie zu lassen — zwei
     Schreibweisen fuer eine Zahl, und die Leiter saehe danach so aus, als truege der Screen sie.
     Das ist M4s eigener Satz, und der Owner hat die Frage fuer M4 in `8a858c11` entschieden: beide
     Unterschiede bleiben, weil das Vokabular hier nichts vermisst und ihre Aufloesung einen Screen
     SICHTBAR bewegen wuerde. M5 hat sie unter derselben Entscheidung gefuehrt statt sie ein zweites
     Mal zu stellen; das Glossar ist derselbe Fall und wird ein drittes Mal nicht gefragt. */
const M6_INSET_EXEMPT = [
  /* Steuerelement */ /^\.gl-close$/, /^\.gl-search input$/,
  /* Layout        */ /^\.gl-frame$/, /^\.gl-body$/, /^\.gl-body > \.gl-sec \+ \.gl-sec$/,
  /* Ueberschrift  */ /^\.gl-head$/, /^\.gl-navhead$/, /^\.gl-navnote$/,
  /* M6-F04        */ /^\.gl-nav$/, /^\.gl-navrow$/, /^\.gl-page$/, /^\.gl-cols \.gloss-term-row$/,
];

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
  /* --- M3, der Upgrade-Baum. Dieselben drei Sorten, dieselben drei Gruende. ---
     Steuerelement: die Kopf-Werkzeuge (`.up-actions > *`, 11/18) und der Leitfaden-Knopf (9/16)
       polstern gegen ihre BESCHRIFTUNG — beide tragen ihr 44-px-Klickziel ueber diese Polsterung,
       und eine Panelkante ist weit und breit nicht beteiligt.
     Layout: `.up-root` ist der Rand des Screens im Fenster (und seine Straffung auf flachen
       Fenstern), `.up-readout` setzt die Auskunftsspalte vom senkrechten Strich ab — eine Rasterfuge,
       kein Inset —, `.up-varrow` ist der Abstand zwischen zwei Kettengliedern, und `.up-skills` haelt
       rechts 6 px frei, damit die Rollleiste nicht auf den Kacheln sitzt. Eine Rinne ist Anordnung.
     Ueberschrift: `.up-head` (sein Polster gehoert zum sticky Kopf und faehrt mit ihm), `.up-navhead`,
       `.up-vlane-h` und `.up-skills-h.is-leg` — vertikaler Rhythmus einer Textzeile, und der gehoert
       dem Typografie-System, das dieser Auftrag ausdruecklich nicht anfasst. */
  /* Steuerelement */ /^\.up-actions > \*$/, /^\.up-page-guide$/,
  /* Layout       */ /^\.up-root$/, /^\.up-readout$/, /^\.up-varrow$/, /^\.up-skills$/,
  /* Ueberschrift */ /^\.up-head$/, /^\.up-navhead$/, /^\.up-vlane-h$/, /^\.up-skills-h\.is-leg$/,
  /* --- M7, Statistik und Lauf-Fenster. Dieselben drei Sorten, dieselben drei Gruende. ---
     Steuerelement: die zwei Schliessen-Knoepfe (11/18) und die Zaehlfelder des Build-Panels (9/10
       geschlossen, 7/9 als Reiter) polstern gegen ihre BESCHRIFTUNG — genau der Fall, fuer den 2c
       `--btn-pad-*` ausserhalb der Leiter fuehrt. Beide Knoepfe tragen ihr 44-px-Klickziel darueber.
     Layout: `.st-root`/`.rd-root` sind der Rand des Screens im Fenster (und seine Straffung auf
       flachen Fenstern), und `.rd-blist2` setzt die Liste von ihrer Trennlinie ab — das ist eine
       Fuge, keine Panelkante, dieselbe Unterscheidung wie bei `.up-readout`.
     Ueberschrift: `.st-head` (sein Polster gehoert zum Kopf), und die zwei `summary`, die in diesem
       Screen die Panel-Ueberschrift SIND — vertikaler Rhythmus einer Textzeile, und der gehoert dem
       Typografie-System, das dieser Auftrag ausdruecklich nicht anfasst. */
  /* Steuerelement */ /^\.st-close, \.lb-head > button$/, /^\.rd-close$/, /^\.rd-bf$/, /^\.rd-bf-tab$/,
  /* Layout       */ /^\.st-root, \.lb-root, \.go-root$/, /^\.rd-root$/, /^\.rd-blist2$/,
  /* Ueberschrift */ /^\.st-head, \.lb-head$/, /^\.rd-c3 > summary$/, /^\.rd-c4 \.rg-perTrick > summary$/,
  /* --- M8, die Bestenliste. Zwei der drei Sorten, dieselben Gruende. ---
     Steuerelement: der Countdown-Chip (7/13), der Spannenwert am Modifikator (3/8) und der
       Auswahlregel-Chip am Listenkopf (3/10) polstern gegen ihre BESCHRIFTUNG — zwei Ziffern, ein
       Wort. Genau der Fall, fuer den 2c `--btn-pad-*` ausserhalb der Leiter fuehrt, und derselbe
       Mikro-Fall wie MENU-51: `--btn-pad-y` ist das Fuenf- bis Dreifache, Tailwinds Nachbarn sind
       2 px und 4 px.
     Layout: die Listenzeile und ihre Spaltenkoepfe. Die Zeile hat KEINE Box — Flaeche keine, Rahmen
       keiner, Radius 0, nur eine Haarlinie nach oben —, und ihre seitlichen 6 px sind die Spur, in
       der `.lb-page .lb-cols` seine Koepfe haelt. Das ist eine Fluchtlinie zwischen zwei
       Geschwistern, keine Panelkante; dieselbe Unterscheidung wie bei `.up-readout` und
       `.rd-blist2`. Auf `--in-tight` gezogen stuenden Kopf und Zeile nicht mehr uebereinander. */
  /* Steuerelement */ /^\.lb-weekcount$/, /^\.lb-modspan$/, /^\.lb-page \.lb-listsub$/,
  /* Layout       */ /^\.lb-page \.lb-cols$/, /^\.lb-page \.lb-rows > button$/,
  /* --- M9, die drei kleinen Modals. Zwei der drei Sorten, dieselben Gruende wie ueberall. ---
     Steuerelement: das Namensfeld (13/16), der Speichern-Knopf (11/20), ein Segment der Art-Auswahl
       (0/12 plus `min-height`) und der Absenden-Knopf (13/16) polstern gegen ihren INHALT bzw. ihre
       BESCHRIFTUNG — genau der Fall, fuer den 2c `--btn-pad-*` ausserhalb der Leiter fuehrt. Beim
       Segment ist die Polsterung ausserdem bewusst NICHT hoehenbestimmend: die 44 px des Entwurfs
       haengen an `min-height`, damit sie nicht an der Schriftmetrik haengen.
     Layout: `.un-first .un-body` und `.fb-body` sind der Rand des Dialogs im Fenster — Anordnung, wie
       `.up-root`, `.st-root` und `.rd-root`, und keine Panelkante.
     Was hier NICHT steht und deshalb auch nicht ausgenommen ist: die Zeilen selbst. `.fb-run` und
       `.un-first .un-prev` polstern gegen eine Panelkante und tragen `var(--in-tight) var(--in-snug)`,
       und die zwei Panels des Melders tragen `var(--in-base)`. Das ist die Achse, und sie greift. */
  /* Steuerelement */ /^\.un-first \.un-form input$/, /^\.un-first \.un-save$/,
                      /^\.fb-kind$/, /^\.fb-send$/,
  /* Layout       */ /^\.un-first \.un-body$/, /^\.fb-body$/,
  /* M4 — begruendet an `M4_INSET_EXEMPT` weiter oben, wo die vier Sorten einzeln stehen. */
  ...M4_INSET_EXEMPT,
  /* M5 — dito, an `M5_INSET_EXEMPT`. */
  ...M5_INSET_EXEMPT,
  /* M6 — dito, an `M6_INSET_EXEMPT`. */
  ...M6_INSET_EXEMPT,
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
/* #menu-rework M9 — DER EINE SCHEIN des Willkommens-Bildschirms, und er ist eine benannte Ausnahme
   und keine Nachlaessigkeit. `#ruhe` sagt: nur die Hauptaktion leuchtet. Hier leuchtet stattdessen das
   EINGABEFELD, und `erststart-redesign.md` fuehrt das unter „Der eine Schein — benannte Ausnahme"
   ausdruecklich so: der Speichern-Knopf ist beim Oeffnen tot, bis ein Name dasteht; ein Schein am
   toten Knopf waere ein Versprechen, das er nicht einloest. Das Feld IST die Aufgabe des Bildschirms.
   `--el-glow-*` waere der falsche Schritt — er ist per `#ruhe` fuer die Hauptaktion reserviert, und
   ihn hier auszugeben hiesse die Regel zu brechen, die er ausdruecken soll. Dieselbe Ueberlegung, mit
   der MENU-50 richtig abgelehnt wurde. Es bleibt bei EINEM: der Knopf bekommt keinen. */
const M9_ELEV_EXEMPT = [/^\.un-first \.as-guide-glow::after$/];
/* #menu-rework M6 — ZWEI RINGE AN EINEM STEUERELEMENT, und beide sind MENU-50 noch einmal.
   `.gloss-i-btn:hover` traegt `0 0 0 3px #8a7de022` (ein RING — keine Weichzeichnung, keine
   Streuung, also eine Kante, die als Schatten geschrieben ist, damit der Kreis nicht groesser wird)
   plus `0 0 12px -2px #8a7de0` (ein Schein); `.gloss-search:focus` traegt denselben Ring allein.
   Fuer den Schein hat das Vokabular `--el-glow-*` — und `#ruhe` sagt „nur der primaere CTA
   leuchtet", 2c fuehrt den Schritt ausdruecklich als „the primary CTA, and nothing else". Ihn an
   einen Nachschlage-Knopf und an ein Suchfeld zu haengen hiesse, genau die Regel zu brechen, fuer
   die es ihn gibt — dieselbe Ueberlegung, mit der MENU-50 richtig abgelehnt wurde und mit der M9
   seinen einen Schein benannt statt getokent hat. Beide sind ausserdem ZUSTAENDE eines
   Bedienelements, und die sieht der Zustands-Gate ueberhaupt nicht (MENU-56). */
const M6_ELEV_EXEMPT = [/^\.gloss-i-btn:hover$/, /^\.gloss-search:focus$/];
const ELEV_EXEMPT = [/^\.cz-shown$/, ...M9_ELEV_EXEMPT, ...M6_ELEV_EXEMPT];

/* --- M3, die Flaechen- und Kanten-Ausnahmen. Drei Sorten, drei Gruende, einzeln aufgezaehlt. ---

   M3-G1 — DIE ZIEL-HELLIGKEIT DER DECKFARBE. `design-sprache.md` §3 schreibt fuer jede Struktur in
     Deckfarbe eine Mischung auf Weiss vor: 62 % als Schrift, 70 % als Flaeche oder Kante. Ohne sie
     faellt der Kontrast bei drei von 42 Decks unter 4,5 : 1 (dort gemessen). Das `#ffffff` ist der
     MISCHPARTNER einer Farbraum-Rechnung, keine Fuellung — die Leiter hat dafuer keinen Schritt, und
     dieser Screen ist der ERSTE, der ihn braucht. Nach der Schwellenregel (2c: „a gap becomes a
     token on the third independent sighting") wird gezaehlt, nicht gepraegt.
   M3-G2 — DER WEISSE ZUSTANDS-HAUCH. Die Navigationszeile (ruhend / ueberfahren / gewaehlt) und die
     Auswertungskacheln liegen als sehr schwacher weisser Hauch UEBER dem Glas. `--sf-sunken` ist
     deckend und naehme ihnen genau das. Vier Alphas, eine Familie, gemeldet statt gepraegt.
   PERMANENT — BEDEUTUNGSKODIERTE ZUSTANDSFARBEN. `#54e08a` „gekauft/an" und `#d4a63a` „kaufbar" sind
     Rollenfarben aus design-sprache.md §3 und stehen in 2c ausdruecklich unter „Meaning-coded
     borders — rarity, faction, ice, state. They encode information, not depth." Sie sind kein Chrome
     und bekommen keinen Schritt — nicht heute und nicht beim dritten Auftreten. */
const M3_SURFACE_EXEMPT = [
  /* M3-G1 */ /^\.up-rank-b > i$/, /^\.up-chall-bar > i$/,
  /* M3-G2 */ /^\.up-navrow$/, /^\.up-navrow:hover$/, /^\.up-navrow\.is-on$/, /^\.up-stat, \.up-dropbox$/,
  /* permanent */ /^\.up-rank\.is-done \.up-rank-b > i$/, /^\.up-chall\.is-done \.up-chall-bar > i$/,
];
const M3_EDGE_EXEMPT = [
  /* permanent */ /^\.up-leg\.is-buy$/, /^\.up-leg\.is-owned$/,
];

/* --- M7, die Statistik und das Lauf-Fenster. Drei Sorten, drei Gruende. ---

   M7-G1 — DER GRUND EINES GRAPHEN. `#0c0d14` traegt die Spur eines Anteil-Balkens und den Grund des
     gestapelten Herkunft-Balkens; `#26262e` ist seine Kante. Der naechste Schritt ist `--sf-sunken`
     (`#141320`) und liegt 8/6/12 daneben — auf einer Flaeche, die zu grossen Teilen von farbigen
     Segmenten verdeckt ist, waere das trotzdem eine Bewegung, und beide Regeln sind AUCH UNTER
     1280 px sichtbar. Der Grund eines Graphen ist dunkler als jeder Panel-Schritt und hat keinen;
     erste Sichtung, also gezaehlt (Schwellenregel in 2c).
   M7-G2 — DER WEISSE HAUCH UEBER DEM GLAS. `rgba(255, 255, 255, .012)` (ruhend) und `.045`
     (ueberfahren / gewaehlt) sind die flache Kachelform, die #st-ruhe, #go-ruhe und #rd-ruhe seit
     19.08.2026 teilen. `--sf-sunken` ist DECKEND und naehme ihnen genau das, was sie sind. Dieselbe
     Familie wie M3-G2, und dieselbe Antwort.
   PERMANENT — die Haarlinien-Rundung. `border-radius: 2px` auf einer 3 px hohen Linie ist kein
     Panel-Radius: `--rd-sm` (6 px) machte daraus eine Kapsel. Die Regel gehoert ausserdem zu dritt
     mit `.lb-body::before` und `.go-card::before` zusammen, die dieser Runde nicht gehoeren. */
const M7_SURFACE_EXEMPT = [
  /* M7-G1 */ /^\.st-hbar$/, /^\.st-track$/,
  /* M7-G2 */ /^\.st-box$/, /^\.rd-bf$/, /^\.rd-bf:hover$/, /^\.rd-bf-tab\.is-on$/,
  /^\.rd-card \.rs-cell, \.rd-card \.rs-tree, \.rd-card \.rs-note, \.rd-card \.rd-blist$/,
];
const M7_EDGE_EXEMPT = [
  /* M7-G1 */ /^\.st-hbar$/,
];
const M7_RADIUS_EXEMPT = [
  /* permanent */ /^\.st-card::before, \.lb-body::before, \.go-card::before$/, /^\.rd-card::before$/,
];

/* --- M8, die Bestenliste. Drei Sorten, drei Gruende, einzeln aufgezaehlt. ---

   M8-G2 — DER ZEILENGRUND `rgba(15, 15, 21, .72)`. Er steht in design-sprache.md §1 als DIE Flaeche
     einer Zeile („Alles, was IN einem Panel steht, bleibt neutral") und hat keinen Schritt: die
     Leiter ist deckend, und was diese Flaeche ausmacht, ist gerade das Durchscheinen des getoenten
     Panels darunter. `--sf-sunken` (#141320) naehme ihr genau das. Vier Fundstellen auf diesem
     Screen, eine Familie — und dieselbe Antwort wie bei M3-G2 und M7-G2, eine Ebene daneben.
   M8-G3 — DER WEISSE HAUCH UEBER DEM GLAS. `rgba(255, 255, 255, .018 / .028 / .03 / .045 / .07)`:
     die Navigationszeile in drei Zustaenden, die Zeichenkachel und der Zeilen-Hover der Liste. Das
     IST M3-G2 und M7-G2 — dieselbe Familie, hier zum dritten Mal gezaehlt. Die drei Zustandswerte
     sind Zeichen fuer Zeichen die des Baums (`#up-form`), weil die Spalte ihm nachzieht.
   M8-G1 — DIE HELLE KANTE des Countdown-Chips, `rgba(255, 255, 255, .62)`. Die Kanten-Leiter hat
     drei Sprossen und alle drei sind dunkel (#2a2a34 · #2c2a3a · #302d40); eine helle Kante ist
     keine Stufe davon, sondern die Gegenrichtung — und sie ist Absicht: der Countdown ist die
     einzige Zahl des Kopfes, die sich bewegt.
   M8-G4 — DIE PILLE. `border-radius: 999px` am Auswahlregel-Chip ist keine Stufe einer Leiter,
     sondern eine FORM („so rund wie die Box hoch ist"). Auf `--rd-sm` gezogen waere aus der Pille
     ein Kasten; einen Schritt „vollrund" zu praegen hiesse, den Annex zu oeffnen, und der ist beim
     Freeze geschlossen worden.
   PERMANENT — die deck- und bedeutungsgetoenten Kanten (`--c` am Rang-Podest und am
     Modifikator-Zeichen, `--deck-a1` an der Kontext-Kachel) fallen gar nicht erst auf: sie stehen
     als `color-mix()` ueber einer Variablen und tragen kein Literal. Sie stehen hier NICHT in der
     Liste, weil eine Ausnahme, die nichts ausnimmt, den Waechter nur unschaerfer macht. */
const M8_SURFACE_EXEMPT = [
  /* M8-G3 */ /^\.lb-tabs \[role="tab"\]$/, /^\.lb-tabs \[role="tab"\]:hover$/,
  /^\.lb-tabs \[role="tab"\]\[aria-selected="true"\]$/, /^\.lb-ctxicon$/, /^\.lb-modicon$/,
  /^\.lb-page \.lb-rows > button:hover$/,
  /* M8-G2 IST WEG. Die drei Regeln lasen den Zeilengrund als Literal; sie lesen ihn seit MR1 als
     `--sf-row`, also nimmt die Ausnahme nichts mehr aus — und eine Ausnahme, die nichts ausnimmt,
     laesst die NAECHSTE Flaeche an derselben Stelle still durch. Gestrichen statt stehengelassen:
     `.lb-weekcount`, `.lb-ctxtile` und `.lb-mod` werden ab hier auf der Flaechen-Achse voll geprueft.
     Die Kante von `.lb-weekcount` (M8-G1) bleibt ausgenommen — sie ist nicht migriert. */
];
const M8_EDGE_EXEMPT = [
  /* M8-G1 */ /^\.lb-weekcount$/,
];
/* #menu-rework M9 — die drei kleinen Modals, und beide Familien sind ALT und beide sind schon
   gemeldet. Es kommt keine neue Sorte dazu, was fuer eine Bestaetigungs-Task die erwartete Antwort ist.

   M8-G2, DER ZEILENGRUND `rgba(15, 15, 21, .72)`, ERREICHT MIT DIESEM SCREEN DEN VIERTEN
   UNABHAENGIGEN. M8 hat ihn gemeldet, als es nur den eigenen sehen konnte („vier Fundstellen auf
   diesem Screen"); gezaehlt ueber index.css tragen ihn heute das GLOSSAR (`.gl-search input`), der
   MELDER (`.fb-run`), die BESTENLISTE (`.lb-weekcount`, `.lb-ctxtile`) und ab hier der ERSTSTART.
   Die Schwelle des Planners lautet „ein Token auf der DRITTEN unabhaengigen Sichtung, nicht der
   ersten" — sie ist damit ueberschritten. Gemeldet als M9-F09 und NICHT gepraegt: eine Stufe zu
   erfinden ist die Entscheidung des Planners, und §2c sagt ausdruecklich, dass Mengen auf Zaehlung
   schliessen und auf Zaehlung wieder aufgehen.

   MENU-38, die durchscheinende neutrale Kante, ist die zweite und wird seit dem Freeze als Ratsche
   gefuehrt statt als Achse.

   DIE ZWEI EIGENEN sind der Rang-Chip der Vorschau (`#241d10`/`#6a5426`, ein Gold-Paar, das eine
   AUSSAGE traegt — der Rang — und keine Chrome) und die stumme Kachel des gesperrten Lauf-Bezugs
   (`#3a3a48`): der Aus-Zustand des Kanons, dieselbe Sorte wie MENU-47. Beide gezaehlt. */
const M9_SURFACE_EXEMPT = [
  /* M8-G2 IST WEG, aus demselben Grund wie eine Zeile weiter oben bei M8: beide Regeln lesen den
     Zeilengrund seit MR1 als `--sf-row`. `.un-first .un-prev` und `.fb-run` werden ab hier auf der
     Flaechen-Achse voll geprueft; ihre KANTE (MENU-38) bleibt unten ausgenommen. */
  /* Rang   */ /^\.un-first \.un-prevchip$/,
];
const M9_EDGE_EXEMPT = [
  /* MENU-38 */ /^\.un-first \.un-prev$/, /^\.fb-run$/,
  /* Rang    */ /^\.un-first \.un-prevchip$/,
  /* Aus     */ /^\.fb-run\[data-off="1"\] \.fb-runicon$/,
];

/* --- M4, der Siegesbildschirm. Zwei Sorten, beide gezaehlt, beide mit ID. ---

   M7-G2 / M8-G3, DER WEISSE HAUCH UEBER DEM GLAS. `rgba(255, 255, 255, .012)` ruhend und `.045`
     ueberfahren, an der Kachelform (`.go-box`), der Gebaeudeliste, den zwei Aktionen, dem Griff des
     Stich-Graphen und der Bestleistungs-Zeile. Das IST die Familie, die M3, M7 und M8 schon gezaehlt
     haben, und die Antwort ist dieselbe: `--sf-sunken` (#141320) ist DECKEND, und was diese Flaeche
     ausmacht, ist gerade das Durchscheinen des Glases darunter. Der Screen ist ausserdem der Zwilling
     von #st-ruhe — `.st-box` traegt denselben Wert aus demselben Grund.
   PERMANENT — `#d4a63a` am Rekord-Ring. Gold heisst auf diesem Schirm "deine Bestmarke" (#kante), es
     ist eine Rollenfarbe aus design-sprache.md §3 und faellt damit unter "meaning-coded borders" in
     2c. Dieselbe Antwort wie `#d4a63a` in RunStats.jsx. */
const M4_SURFACE_EXEMPT = [
  /* M7-G2 */ /^\.go-card \.go-box$/, /^\.go-blist$/, /^\.go-actions > button$/,
  /^\.go-actions > button:hover$/, /^\.go-ticks \.rg-perTrick > summary$/,
  /^\.go-ticks \.rg-perTrick > summary:hover$/, /^\.go-bestrow$/,
  /* permanent */ /^\.go-heroblock\.is-record > \.as-ring-run::before$/,
];

/* --- M5, der Leitfaden. Zwei Sorten, beide gezaehlt, beide mit ID. ---

   MENU-46, DIE AKZENTGETOENTE ZUSTANDSFLAECHE. Die Navigationszeile traegt einen 90-Grad-Anlauf aus
     `color-mix(… var(--c) 12/20/26% …, #12121a)` — ruhend, ueberfahren, gewaehlt. Der Grundton
     `#12121a` ist kein Schritt, und ein Zustandspaar hat in der Leiter keinen (MENU-46/47/48, seit
     dem Freeze als Ratsche gefuehrt). UND: anders als am Baum ueberschreibt hier nichts diese
     Flaeche — M3 konnte den Anlauf an `.up-navrow` ersatzlos streichen, weil `#up-form` ihn ohnehin
     ueberschrieb; hier malt er. Ihn zu entfernen waere eine Kompositionsaenderung ohne Entwurf.
   PERMANENT — `.gd-hair` traegt `border-radius: 99px` auf einer 2 px hohen Linie. Das ist eine
     FORM ("so rund wie die Box hoch ist"), keine Stufe einer Leiter: auf `--rd-sm` gezogen waere aus
     der Haarlinie ein Kasten. Dieselbe Antwort wie M8-G4 an der Auswahlregel-Pille und wie M7s
     Haarlinien-Rundung. */
const M5_SURFACE_EXEMPT = [
  /* MENU-46 */ /^\.gd-navrow$/, /^\.gd-navrow:hover$/, /^\.gd-navrow\.is-on$/,
];
const M5_RADIUS_EXEMPT = [
  /* permanent */ /^\.gd-hair$/,
];

const M8_RADIUS_EXEMPT = [
  /* M8-G4 */ /^\.lb-page \.lb-listsub$/,
];

/* --- M6, das Glossar. Drei Sorten auf der Flaeche, drei auf der Kante, und eine ganze Familie an
   Radien, die keine Stufen sind. Alle gezaehlt, keine gepraegt.

   M6-G1 — DAS VIOLETTE ⓘ. `#1b1830` (Grund), `#241f42` (ueberfahren), `#3b3563` (Kante) und der
     Fokus-Rahmen `#8a7de0` sind der Knopf, der das Glossar oeffnet, und das Zeichen im Kopf des
     Overlays. Die Flaechen-Leiter ist NEUTRAL — `--sf-head` (#1b1a24) liegt 0/2/12 daneben, und was
     diese Flaeche ausmacht, ist gerade der violette Stich: er ist das Erkennungszeichen des
     Nachschlagewerks, an neun Einstiegen dasselbe. Ein Steuerelement ist ausserdem kein Panel (2c
     fuehrt `--ctl-*` genau dafuer ausserhalb der Leiter, als GESCHLOSSENE Menge von neun), und
     dieser Knopf steht in JEDER Breite.
   M6-G2 — DER GRUND DER UEBERFAHRENEN BEGRIFFSZEILE, `#1a1a22`. Er steht in der Grundregel, gilt
     also auch unter 1280 px, und ist ein ZUSTAND: `--sf-base` (#17171c) liegt 3/3/6 daneben.
   M7-G2 / M8-G3 / M4, DER WEISSE HAUCH UEBER DEM GLAS — `rgba(255, 255, 255, .035)` (Zeile
     ueberfahren), `.014` (Begriffskarte) und `.03` (Zeichenkachel). Das IST die Familie, die M3,
     M7, M8 und M4 schon gezaehlt haben, hier zum fuenften Mal, und die Antwort ist dieselbe:
     `--sf-sunken` (#141320) ist DECKEND und naehme ihnen genau das, was sie sind.
   M6-F03 — `#2a2a33` AN GENAU EINER STELLE, und es ist M5-F02s Wert: `--ed-quiet` (#2a2a34) minus
     eine Einheit Blau. Der Planner hat diesen Wert fuer M5 GEWAEHRT (bb22e237), und trotzdem steht
     er hier ungewandelt — aus einem Grund, der mit der Schwelle nichts zu tun hat: die Deklaration
     ist `border-color` an einem Kaestchen, dessen Rahmenbreite `#gl-ruhe` auf 0 gesetzt hat. Sie
     erreicht die berechnete Formatvorlage (gemessen), aber sie MALT NICHTS. Etwas umzustellen, das
     nichts zeichnet, waere eine Bewegung ohne Wirkung in einer Ratsche, die niemand nachpruefen
     kann. Gezaehlt und benannt; sie faellt mit dem Rest von M6-F01, wenn jemand die Reste des
     `#gl-ruhe`-Passes einsammelt.

   DIE RADIEN, und keiner von ihnen ist eine Stufe:
     FORM statt Stufe — `.gloss-i-btn` und `.gloss-i-mark` tragen `50%` („so rund wie die Box hoch
       ist"), `.gl-hair` `99px` auf einer 2 px hohen Linie, `.gl-navdot` `0 3px 3px 0` auf einem
       3 px breiten Balken. Auf `--rd-sm` gezogen waeren aus Kreis, Haarlinie und Balken drei Kaesten.
       Dieselbe Antwort wie M8-G4 an der Auswahlregel-Pille und M5 an `.gd-hair`.
     NEBEN DER LEITER — `.gl-page-eyebrow .gl-sq` `3px` auf einem 11-px-Quadrat (`--rd-sm` ist 6 und
       machte daraus fast einen Kreis; dieselbe Lage wie M7-G5), `.gl-cols .gloss-term-row` `11px`
       (die Leiter hat 6 / 8 / 14) und `.gl-navcount` `7px` — der einzige Rest der Zaehler-Kapsel,
       die `#gl-ruhe` ihrer Flaeche und ihres Rahmens beraubt hat, also ein Radius ohne etwas zum
       Runden (M6-F05). */
const M6_SURFACE_EXEMPT = [
  /* M6-G1 */ /^\.gloss-i-btn$/, /^\.gloss-i-btn:hover$/, /^\.gloss-i-mark$/,
  /* M6-G2 */ /^\.gloss-term-row:hover$/,
  /* Hauch */ /^\.gl-navrow:hover$/, /^\.gl-cols \.gloss-term-row$/, /^\.gl-ticon$/,
];
const M6_EDGE_EXEMPT = [
  /* M6-G1 */ /^\.gloss-i-btn$/, /^\.gloss-i-mark$/, /^\.gloss-search:focus$/,
  /* M6-F03 */ /^\.gl-navrow\.is-on \.gl-navcount$/,
];
const M6_RADIUS_EXEMPT = [
  /* Form   */ /^\.gloss-i-btn$/, /^\.gloss-i-mark$/, /^\.gl-hair$/, /^\.gl-navdot$/,
  /* daneben*/ /^\.gl-page-eyebrow \.gl-sq$/, /^\.gl-cols \.gloss-term-row$/, /^\.gl-navcount$/,
];


/* ============================================================================
   #mainscreen-branding C4 — DIE AUSNAHMEN DES MAINSCREENS, jede mit ihrem Grund.

   Vier Sorten, und keine davon ist Nachsicht:

     PHONE      — die Regel steht AUSSERHALB der 1280er Sektion und ist damit der Wertetraeger der
                  schmalen Fassung. §2c nimmt alles unter 1280 px dauerhaft aus, und diese Runde darf
                  dort nichts bewegen. Eine Umstellung waere kein Token, sondern eine Bewegung.
     SPIELGRAFIK— der Wert kleidet kein Panel, sondern ein BILD: den Schleier ueber dem Spielfeld und
                  den Schatten unter der Deckkarte. Dieselbe Sorte Ausnahme wie `CZ_SCENES` in M2b.
     STEUERELEMENT / LAYOUT — Polsterung, die kein Kasten-Innenabstand ist. §2c laesst sie
                  ausdruecklich ausserhalb der Leiter: ein Knopf polstert gegen seine BESCHRIFTUNG,
                  Screen-Raender sind Layout.
     GEZAEHLT   — echte Luecken, die diese Runde nicht praegt. Sie stehen in den Ratschen weiter unten
                  und koennen nicht wachsen, ohne dass jemand eine Liste anfasst.
   ============================================================================ */
const C_SURFACE_EXEMPT = [
  /* PHONE — und die Selektoren sind ABSICHTLICH ohne `.hub-play` davor: sie treffen genau die
     Grundregeln, also die der schmalen Fassung. Die Desktop-Regeln derselben Klassen sind seit C4
     auf `.hub-play` eingegrenzt und werden deshalb WEITER geprüft — ohne diese Trennung nähme die
     Handy-Ausnahme die Desktop-Regel still mit, gemessen an C4/CC1 und CC2. */
  /^\.as-hub-tile$/, /^\.as-hub-field$/, /^\.as-week-chip$/,
  /* SPIELGRAFIK: der Schleier ueber dem Spielfeld-Bild, nicht die Flaeche eines Panels. */
  /^\.as-hub-bg-veil$/,
  /* DECK-GETOENT: das Zeichen der Listenzeile mischt die Deckfarbe in seinen Grund. §2c fuehrt
     `--sf-deck` als deck-getoentes Panel, aber mit dem Rezept der Hub-KACHEL bei 9/5 % — dies hier
     ist ein 34-px-Kaestchen bei 14 % gegen den Zeilenton, nicht dasselbe. Gezaehlt. */
  /^\.as-hub-list \.as-hub-glyph$/,
  /* ZUSTAND: die Zeile beim Ueberfahren. Zustandsfarben haben in dieser Runde keinen Schritt
     (MENU-46/47/48) und werden gezaehlt statt gepraegt. */
  /^\.as-hub-list \.as-hub-tile:hover$/,
  /* SKIN-VARIANTE: der CRT-Zweitsatz des Wochen-Chips. Ein Skin ist keine Tiefe. */
  /^\[data-skin="crt"\] \.as-week-chip$/,
  /* GEZAEHLT: der Chip der Attributzeile. `--sf-sunken` ist deckend (#141320), dieser Grund ist
     durchscheinend ueber Glas — eine andere Sorte Flaeche, und die Leiter hat dafuer keinen Schritt.
     Der Wert stand bis C3 inline und ist dort unerreichbar gewesen; jetzt steht er einmal als Regel. */
  /^\.as-deck-attr$/,
];
const C_EDGE_EXEMPT = [
  /* PHONE — s. die Flächenliste: ohne `.hub-play` davor, damit die Desktop-Regeln geprüft bleiben. */
  /^\.as-hub-tile$/, /^\.as-hub-field$/,
  /* MEANING-CODED: der Fehlerrahmen des Seed-Feldes. §2c nimmt bedeutungstragende Kanten dauerhaft
     aus — sie kodieren Information, keine Tiefe. */
  /^\.hub-play \.as-hub-field\.is-err$/, /^\.as-hub-field\.is-err$/,
  /* GEZAEHLT: der Trenner zwischen zwei Listenzeilen. `--ed-quiet` ist deckend (#2a2a34); dieser
     Trenner ist durchscheinend ueber Glas und liegt damit in derselben Lage wie MENU-38 — eine
     Kanten-Sorte, die die Leiter nicht kennt. */
  /^\.as-hub-list \.as-hub-tile$/,
  /* MENU-38, die durchscheinende Kanten-Familie: zwoelf Alphas ueber 64 Literale, in dieser Runde
     GERATSCHT und nicht eingesammelt. Beide standen bis C3 INLINE und waren damit von keiner Regel
     erreichbar; sie sind umgewandelt, nicht kopiert, und die Kanten-Ratsche zaehlt sie jetzt. */
  /^\.as-deck-art$/, /^\.as-deck-attr$/,
];
const C_ELEV_EXEMPT = [
  /* SPIELGRAFIK: der Schatten UNTER der Deckkarte. `--el-float` ist `0 14px 44px rgba(0,0,0,.42)` —
     gemessen 8/26/0,13 daneben, und es ist auch nicht dieselbe Aussage: die Leiter misst, wie weit ein
     Panel von seiner Flaeche abhebt; hier steht ein Spielobjekt auf einem Panel. */
  /^\.as-deck-art$/,
];
const C_RADIUS_EXEMPT = [
  /* GEZAEHLT: die Kachelbank rundet mit 12, `--rd-lg` ist 14. Zwei Pixel an der Aussenkante des
     groessten Panels der rechten Spalte — sichtbar, und deshalb eine benannte Abweichung statt einer
     stillen Anpassung. Steht mit ihrer Zahl in der Abweichungstabelle des Nachweises. */
  /^\.as-hub-list$/,
];
const C_INSET_EXEMPT = [
  /* STEUERELEMENT: acht Knoepfe, Chips und ein Eingabefeld. Sie polstern gegen ihre Beschriftung.
     Gemessen: `--btn-pad-y` ist 10 px und `--btn-pad-x` 16 px, und KEINER der acht polstert so; die
     drei Leiterstufen (11/13/18) treffen ebenfalls keinen. */
  /^\.hub-play \.as-tut-btn$/, /^\.hub-play \.as-hub-resume$/, /^\.hub-play \.as-hub-start$/,
  /^\.hub-play \.as-seed-play$/, /^\.hub-play \.as-ranked-btn$/, /^\.hub-foot \.as-hub-chip$/,
  /^\.hub-play \.as-week-chip$/, /^\.hub-play \.as-hub-field$/, /^\.as-deck-attr$/, /^\.as-deck-attr-music$/,
  /^\.as-deck-attr-next$/, /^\.as-hub-list \.as-hub-glyph$/,
  /* LAYOUT: der senkrechte Rhythmus des Screens. §2c — „screen margins are layout". */
  /^\.hub-root$/,
  /* GEZAEHLT: die zwei echten Panel-Innenabstaende dieses Screens. Die Bonus-Leiste polstert 14/20,
     die Deck-Tafel 22/24, die Kennzahl-Zelle 14/16 — `--in-base` ist 18. Vier bis sechs Pixel an
     Flaechen, die ein freigegebener Entwurf so abgenommen hat; eine Umstellung waere eine Bewegung,
     kein Token. Benannt in der Abweichungstabelle. */
  /^\.hub-play \.as-hub-bonus$/, /^\.as-deck$/, /^\.as-kpi$/,
  /* Die Listenzeile: der linke Innenabstand IST `--in-base` und steht als Token; die drei anderen
     Kanten polstern die Zeile gegen ihr Zeichen und ihren Chevron. */
  /^\.as-hub-list \.as-hub-tile$/,
];

const CSS_AXES = [
  { axis: "Flaeche", re: /(?:^|[;{\s])background(?:-color|-image)?\s*:[^;}]*(#[0-9a-fA-F]{3,8}|\brgba?\()/g,
    exempt: [...M3_SURFACE_EXEMPT, ...M7_SURFACE_EXEMPT, ...M8_SURFACE_EXEMPT, ...M9_SURFACE_EXEMPT,
             ...M4_SURFACE_EXEMPT, ...M5_SURFACE_EXEMPT, ...M6_SURFACE_EXEMPT,
             ...C_SURFACE_EXEMPT] },
  { axis: "Kante",   re: /(?:^|[;{\s])border(?:-top|-right|-bottom|-left)?(?:-color)?\s*:[^;}]*(#[0-9a-fA-F]{3,8}|\brgba?\()/g,
    exempt: [...M3_EDGE_EXEMPT, ...M7_EDGE_EXEMPT, ...M8_EDGE_EXEMPT, ...M9_EDGE_EXEMPT,
             ...M6_EDGE_EXEMPT, ...C_EDGE_EXEMPT] },
  /* `inset` ist ausgenommen, und das ist eine Unterscheidung, keine Nachsicht: die Hoehenleiter misst
     ABHEBEN von der Flaeche. Ein Innenschatten hebt nichts — er zeichnet eine Kante (die 2-px-
     Unterstreichung der aktiven Auswahl) oder eine Mulde, und beides hat eigene Gruende. */
  /* DAS `\s*` STEHT IM LOOKAHEAD, NICHT DAVOR, und das ist keine Stilfrage. Aussen davor darf der
     Regex-Motor es zurueckgeben: die Pruefung landete dann auf dem LEERZEICHEN vor `inset`, der
     negative Lookahead ging auf, und `box-shadow: inset 0 -2px 0` wurde gemeldet, obwohl er
     ausgenommen sein sollte. Dieselbe Luecke laesst umgekehrt ein echtes Literal durch, sobald die
     Ausnahme etwas weiter gefasst ist — H-b in Regex-Form, an der eigenen Ratsche gefunden.
     Der Lookahead wird jetzt genau einmal ausgewertet, direkt hinter dem Doppelpunkt. */
  { axis: "Hoehe",   re: /(?:^|[;{\s])box-shadow\s*:(?!\s*(?:var\(|none|inset\b))[^;}]*\d/g, exempt: [...ELEV_EXEMPT, ...C_ELEV_EXEMPT] },
  { axis: "Radius",  re: /(?:^|[;{\s])border-radius\s*:(?!\s*(?:var\(|0\s*[;}]))[^;}]*[1-9]/g,
    exempt: [...M7_RADIUS_EXEMPT, ...M8_RADIUS_EXEMPT, ...M5_RADIUS_EXEMPT, ...M6_RADIUS_EXEMPT,
             ...C_RADIUS_EXEMPT] },
  { axis: "Innenabstand", re: /(?:^|[;{\s])padding(?:-top|-right|-bottom|-left)?\s*:(?!\s*(?:var\(|0\s*[;}]))[^;}]*[1-9]/g, exempt: [...INSET_EXEMPT, ...C_INSET_EXEMPT] },
];

/* ============================================================================
   #menu-rework MH4 — AN EXEMPTION SAYS WHICH HALF IT MEANS.

   An exemption names a SELECTOR, and a selector stands in both halves of the stylesheet. The entry
   for a phone rule silently took the desktop rule of the same class out with it — measured at C4/CC1
   and CC2, which stayed GREEN with `#141419` and `#2a2a33` at the call site. A guard reporting
   success over a rule it no longer looks at.

   (New material is English per AGENTS.md — Language policy; the older German comments around it stay
   as written.)
   ============================================================================ */

/* The threshold is DERIVED, not transcribed. It stands as `--breakpoint-dt` in the sheet, and a
   guard keeping its own copy eventually measures against a number that reads differently there.
   If the site disappears this is `null` — and the negative probe below fails, instead of the halves
   separation quietly collapsing back to "both". */
const BREAKPOINT_DT = (() => {
  const m = read("src/index.css").match(/--breakpoint-dt:\s*([\d.]+)px/);
  return m ? parseFloat(m[1]) : null;
})();

/* The `@media` blocks with their bounds in the stripped sheet. Nested blocks both appear in the
   list, so a rule collects EVERY header enclosing it. */
function mediaBloecke(css) {
  const out = [];
  for (const m of css.matchAll(/@media([^{]*)\{/g)) {
    let tiefe = 0, ende = css.length;
    for (let j = m.index + m[0].length - 1; j < css.length; j++) {
      if (css[j] === "{") tiefe++;
      else if (css[j] === "}" && --tiefe === 0) { ende = j; break; }
    }
    out.push({ kopf: m[1].trim(), start: m.index, ende });
  }
  return out;
}

/* Which half a rule REACHES — not which block it sits in. A rule without a width condition reaches
   both, and that is the normal case: 31 `@media` blocks face thousands of rules. `min-width: 641px`
   reaches both as well, because 641 is below the threshold — the question is never "does it have a
   media query" but "which widths does it admit". */
function haelften(medien = []) {
  let handy = true, desktop = true;
  for (const kopf of medien) {
    for (const b of kopf.matchAll(/\(\s*(min|max)-width\s*:\s*([\d.]+)px\s*\)/g)) {
      const wert = parseFloat(b[2]);
      if (b[1] === "min") { if (wert >= BREAKPOINT_DT) handy = false; }
      else if (wert < BREAKPOINT_DT) desktop = false;
    }
  }
  return { phone: handy, desktop };
}

/* The qualification is OPTIONAL, and that is the whole caution of this change: a bare regex stays
   what it was and covers both halves. The other way round, this task would change the meaning of 187
   existing entries at once, and five workers' guards would shift under their feet (H-a).

   `function` AND NOT `const`, and that is not style: the exemption lists sit higher up in the file
   than this line. A `const` would still be in its temporal dead zone there, and the first worker to
   scope an entry would get `Cannot access 'nurHandy' before initialization` — an error about the
   file, not about their exemption. Measured: it failed exactly that way on the first attempt to set
   up this task's counter-check. Declarations are hoisted. */
function nurHandy(re) { return { re, haelfte: "phone" }; }
function nurDesktop(re) { return { re, haelfte: "desktop" }; }

const deckt = (eintrag, sel, medien) => {
  const re = eintrag instanceof RegExp ? eintrag : eintrag.re;
  if (!re.test(sel)) return false;
  const haelfte = eintrag instanceof RegExp ? null : eintrag.haelfte;
  return haelfte ? haelften(medien)[haelfte] : true;
};

/* One entry inside a failure message. `String({re, haelfte})` would be "[object Object]" — a message
   that no longer names the dead entry costs exactly the time it is meant to save. */
const zeige = (e) => (e instanceof RegExp ? String(e)
  : `${e.re} (nur ${e.haelfte === "phone" ? "Handy" : "Desktop"})`);

/* Every CSS rule as [selector, body, media headers]. Comments are out first: a rationale naming a
   property must neither satisfy nor trigger a guard.
   THE THIRD FIELD IS APPENDED, NOT INSERTED: the three call sites read `[sel, body]` and stay
   untouched. The selector derivation below is deliberately unchanged, character for character —
   `.pop()` still throws the media header away, and that is precisely why it now sits beside it,
   rather than someone rebuilding the derivation and re-deciding every selector in the sheet. */
function rules(css) {
  const rein = strip(css);
  const bloecke = mediaBloecke(rein);
  const out = [];
  for (const m of rein.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().split("\n").pop().trim();
    if (sel) {
      const medien = bloecke.filter((b) => m.index >= b.start && m.index < b.ende).map((b) => b.kopf);
      out.push([sel, m[2], medien]);
    }
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
    for (const [name, liste] of [["Innenabstand", INSET_EXEMPT], ["Hoehe", ELEV_EXEMPT],
      ["Flaeche", M7_SURFACE_EXEMPT], ["Kante", M7_EDGE_EXEMPT], ["Radius", M7_RADIUS_EXEMPT],
      ["Flaeche M8", M8_SURFACE_EXEMPT], ["Kante M8", M8_EDGE_EXEMPT], ["Radius M8", M8_RADIUS_EXEMPT],
      ["Flaeche M9", M9_SURFACE_EXEMPT], ["Kante M9", M9_EDGE_EXEMPT], ["Hoehe M9", M9_ELEV_EXEMPT],
      ["Innenabstand M6", M6_INSET_EXEMPT], ["Hoehe M6", M6_ELEV_EXEMPT],
      ["Flaeche M6", M6_SURFACE_EXEMPT], ["Kante M6", M6_EDGE_EXEMPT], ["Radius M6", M6_RADIUS_EXEMPT]]) {
      /* MH4: THE SAME INVARIANT, now with the media context in it — "every exemption covers at least
         one migrated rule". Rewriting it to a smaller number would be H-b: a qualified entry that
         covers nothing is as dead as a selector that no longer exists, and that is exactly what has
         to surface here. */
      const tot = liste.filter((e) => !mine.some(([sel, , medien]) => deckt(e, sel, medien)));
      expect(tot, `${name}: Ausnahme trifft keine migrierte Regel:\n  ${tot.map(zeige).join("\n  ")}`).toEqual([]);
    }
  });

  it("die Erlaubnisliste trifft ueberhaupt etwas", () => {
    /* Gegenprobe gegen die stillste Art, diesen Waechter wirkungslos zu machen: eine Erlaubnisliste,
       die auf nichts mehr passt, weil ein Selektor umbenannt wurde. */
    expect(mine.length, "kein migrierter Selektor gefunden — die Liste zeigt ins Leere").toBeGreaterThan(25);
  });

  it("die zwei `.up-`-Ausdruecke treffen sich genau — keine Regel doppelt, keine ungedeckt", () => {
    /* #menu-rework M11 — die Naht zwischen M3 und M11, und sie ist die Sorte, die still schiefgeht.
       M3 hat `.up-banner` mit einem negativen Lookahead ausgeschlossen, weil die Leiste damals keinem
       migrierten Screen gehoerte. Seit dieser Task gehoert sie einer, und die zwei Ausdruecke muessen
       sich jetzt exakt ergaenzen: JEDE `.up-`-Regel des Blattes wird von genau EINEM von beiden
       gedeckt. Faellt der Lookahead weg, deckt M3 die Leiste MIT — dann steht ihre Zahl in zwei
       Ratschen, und eine Zahl, die zweimal gezaehlt wird, ist keine Messung. Wird der Lookahead
       breiter, faellt eine Baum-Regel aus beiden heraus und niemand sieht sie mehr an.
       Als „enthaelt kein X ausser Y" geschrieben: keine Regel in beiden, keine in keinem. */
    const upRules = all.filter(([sel]) => /\.up-/.test(sel));
    expect(upRules.length, "keine `.up-`-Regel mehr gefunden — dann prueft diese Gegenprobe nichts")
      .toBeGreaterThan(10);
    /* DIE AUSDRUECKE SELBST, nicht ihre Schreibweise. Die erste Fassung dieser Gegenprobe schrieb die
       zwei Regexe hier noch einmal hin — und war damit gruen, waehrend man die echten Eintraege oben
       kaputtmachte. Gemessen an genau dieser Sabotage: `(?!banner)` entfernt -> gruen, `.up-banner`
       aus M11 gestrichen -> gruen. Eine Gegenprobe, die eine Kopie prueft, prueft nichts. */
    const tree = M3_TREE_SELECTOR;
    const deckt = (sel) => M11_SELECTORS.some((re) => re.test(sel));
    const beide = upRules.filter(([sel]) => tree.test(sel) && deckt(sel)).map(([sel]) => sel);
    const keiner = upRules.filter(([sel]) => !tree.test(sel) && !deckt(sel)).map(([sel]) => sel);
    expect(beide, `von beiden Ausdruecken gedeckt: ${beide.join(" · ")}`).toEqual([]);
    expect(keiner, `von keinem Ausdruck gedeckt: ${keiner.join(" · ")}`).toEqual([]);
  });

  it("die Erlaubnisliste nimmt KEINE fremde Regel mit — `.gl-wrap` gehoert der Bestenliste", () => {
    /* #menu-rework M6 — die Gegenprobe zum Praefix `\.gl-`, und sie ist die Form, die MENU-38 und
       `.up-banner` beide gekostet haben: eine Grenze, die nach dem sichtbarsten Traeger gezogen wird,
       trifft irgendwann etwas, das nur so heisst. `.gl-wrap` ist `GlobalLeaderboard.jsx`
       (`<div className="gl-wrap mt-5">`), nicht das Glossar.

       GEFRAGT WIRD, WAS DIESER EINTRAG EINSAMMELT, nicht was in der Gesamtliste steht: M8s `\.lb-`
       deckt dieselbe Regel voellig zu Recht ab, und in der Summe faellt der Fehler deshalb nie auf.

       ALS „ENTHAELT KEIN X AUSSER Y" GESCHRIEBEN, nicht als „X ist da": zuerst muss der Fremdkoerper
       im Baum ueberhaupt noch existieren — sonst prueft die zweite Haelfte nichts —, und dann darf
       KEINE Regel, die ueber M6s Praefixe hereinkommt, ihn fuehren. Ein zu weit gefasster Ausdruck
       (`/\.gl-/` ohne den Ausschluss) faellt hier, und NUR hier: die Regel selbst traegt kein
       Literal, also wuerde ihn weder eine Achsen-Pruefung noch eine Ratsche je bemerken. */
    expect(all.some(([sel]) => /\.gl-wrap/.test(sel)),
      "`.gl-wrap` gibt es nicht mehr — dann prueft diese Gegenprobe nichts, streichen oder nachziehen").toBe(true);
    const meins = all.filter(([sel]) => M6_SELECTORS.some((re) => re.test(sel)));
    const fremd = meins.filter(([sel]) => /\.gl-wrap/.test(sel)).map(([sel]) => sel);
    expect(fremd, `fremde Regel ueber M6s Praefix: ${fremd.join(" · ")}`).toEqual([]);
  });

  for (const { axis, re, exempt } of CSS_AXES) {
    it(`${axis}: kein Literal in einer migrierten Regel`, () => {
      const bad = [];
      for (const [sel, body, medien] of mine) {
        if (exempt && exempt.some((x) => deckt(x, sel, medien))) continue;
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

       SEIT M2B NENNT KEIN EINTRAG MEHR HAKEN — die Werkstatt ist ganz migriert, und das ist der
       einzige Grund, aus dem diese Schleife gerade leer laeuft. Sie bleibt fuer M3–M11 stehen.
       Hier steht BEWUSST kein `expect(geprueft).toBe(0)`: das waere eine Ratsche auf den heutigen
       Zustand, und der naechste Worker, der voellig zu Recht `hooks` mitbringt, liefe dagegen. Der
       Kopf dieses Waechters verlangt ausdruecklich das Gegenteil — er darf nie Arbeit blockieren,
       die noch nicht passiert ist. Die lebende Gegenprobe des Mechanismus ist `exemptFns` unten. */
    for (const [path, src, e] of sources) {
      if (!e.hooks) continue;
      const alle = tags(src);
      const tot = e.hooks.filter((h) => !alle.some((t) => hookRe(h).test(t.text)));
      expect(tot, `${path}: Haken zeigt ins Leere:\n  ${tot.join("\n  ")}`).toEqual([]);
    }
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
    /* #menu-rework M4 — der Siegesbildschirm. Tinte ist unveraendert eine benannte Luecke des
       Vokabulars (2c, "What the vocabulary does not claim"), das Fenster ist zu, also gezaehlt statt
       gepraegt. Die Zahl ist hoch, weil dieser Screen der farbigste der Runde ist: jede Waehrung,
       jede Freischaltung und jeder Zustand bringt seine eigene Textfarbe mit — und weil der Screen
       KEINEN Entwurf hat, wird keine davon zusammengefasst.
       DIE CSS-SEITE SCHLIESST `.st-` UND `.lb-` AUS, aus demselben Grund, aus dem M8s Zeile `.st-`
       ausschliesst: die Schale der drei randverankerten Screens ist EINE Regel
       (`.st-root, .lb-root, .go-root`), ihre Literale sind M7s und stehen oben in dessen Zeile. Eine
       Zahl, die zweimal gezaehlt wird, ist keine Messung. */
    ["src/ui/GameOver.jsx (ganze Datei)", () => inkOfJsx("src/ui/GameOver.jsx"), 23],
    ["index.css — .go-* (M4, ohne die geteilten Schalen-Regeln)", () => inkOfCss([/\.go-/], [/\.st-/, /\.lb-/]), 11],
    /* #menu-rework M5 — der Leitfaden. Tinte ist weiterhin eine benannte Luecke des Vokabulars (2c,
       "What the vocabulary does not claim"), das Fenster ist zu, also gezaehlt statt gepraegt. Der
       Screen ist textreich und farbcodiert nach Fraktion — jede der vier bringt ihre eigene mit, und
       ohne Entwurf wird keine davon zusammengefasst.
       DIE CSS-SEITE SCHLIESST DIE ANDEREN MIGRIERTEN PRAEFIXE AUS, aus demselben Grund, aus dem M8
       `.st-` und M4 `.st-`/`.lb-` ausschliessen: die Sammelregeln des #eckig-Passes nennen `.gd-`
       neben `.up-`, `.gl-`, `.cz-`, `.st-` und `.lb-`, und ihre Werte gehoeren dem, der sie
       geschrieben hat. Eine Zahl, die zweimal gezaehlt wird, ist keine Messung. */
    ["src/ui/GuideOverlay.jsx (ganze Datei)", () => inkOfJsx("src/ui/GuideOverlay.jsx"), 19],
    ["index.css — .gd-* (M5, ohne die geteilten Sammelregeln)", () => inkOfCss([/\.gd-/], [/\.up-/, /\.gl-/, /\.cz-/, /\.st-/, /\.lb-/]), 4],
    ["index.css — .op-* (M1)", () => inkOfCss([/\.op-/, /\.as-opt-/]), 16],
    ["index.css — .cz-* Schale (M2a)", () => inkOfCss(M2A_SHELL_SELECTORS), 2],
    ["index.css — .cz-* Inhalte (M2b)", () => inkOfCss([/\.cz-/], M2A_SHELL_SELECTORS), 1],
    /* #menu-rework M3 — der Baum. Seine Zahl ist die hoechste der Runde, und das ist kein Versaeumnis
       dieses Auftrags: Tinte ist eine benannte Luecke des Vokabulars (2c, „What the vocabulary does
       not claim"), das Fenster ist zu, und der Baum ist der textreichste der migrierten Screens.
       Gezaehlt statt gepraegt — der Nachfolger erbt damit eine gemessene Zahl statt eines Eindrucks. */
    ["src/ui/UpgradeScreen.jsx (ganze Datei)", () => inkOfJsx("src/ui/UpgradeScreen.jsx"), 9],
    ["index.css — .up-* (M3)", () => inkOfCss([/\.up-(?!banner)/]), 35],
    /* #menu-rework M3 — DeckDetail.jsx wird GEZAEHLT, NICHT MIGRIERT, und das ist ein Befund (M3-F03),
       keine Bequemlichkeit.
       GEMESSEN im Produktionsbuild: der Screen ist ueber 1280 px GAR NICHT ERREICHBAR. Sein einziger
       Einstieg ist der „Details"-Knopf im Zweig-Pfad, und der rendert dort nicht — bei 1280x720 und
       1536x791 null Einstiege, bei 1100x800 vier. `GuideOverlay` mountet ihn NICHT; die geteilte
       Komponente ist `GuideBody`, und die flieszt in die andere Richtung (DeckDetail importiert sie
       aus GuideOverlay, nicht umgekehrt).
       Damit liegt jeder Wert dieser Datei unter 1280 px — und das ist in 2c „What is permanently
       exempt" und in diesem Auftrag ein ausdrueckliches Nicht-Ziel. Ihn auf die Achsen zu ziehen
       hiesse, die Handy-Fassung zu bewegen, um einen Waechter gruen zu bekommen.
       Die Ratsche kostet dagegen nichts und uebergibt M5 eine GEMESSENE Zahl statt eines Eindrucks —
       dieselbe Antwort, die MENU-38 und die Tinte schon bekommen haben: zaehlen, nicht praegen. */
    ["src/ui/DeckDetail.jsx (ganze Datei, NICHT migriert)", () => inkOfJsx("src/ui/DeckDetail.jsx"), 12],
    /* #menu-rework M7 — die zwei Screens, die dieser Auftrag gestaltet. Tinte ist eine benannte
       Luecke des Vokabulars (2c), das Fenster ist zu, und diese zwei Screens sind zahlen- und
       farbreich: jede Fraktion, jede Kategorie und jede Raritaet bringt ihre eigene mit. Gezaehlt
       statt gepraegt — der Nachfolger erbt eine gemessene Zahl statt eines Eindrucks. */
    ["src/ui/StatsScreen.jsx (ganze Datei)", () => inkOfJsx("src/ui/StatsScreen.jsx"), 4],
    ["src/ui/RunDetail.jsx (ganze Datei)", () => inkOfJsx("src/ui/RunDetail.jsx"), 4],
    ["src/ui/SeedChip.jsx (ganze Datei)", () => inkOfJsx("src/ui/SeedChip.jsx"), 1],
    ["index.css — .st-* (M7)", () => inkOfCss([/\.st-/]), 3],
    ["index.css — .rd-* (M7)", () => inkOfCss([/\.rd-/]), 10],
    /* Der geteilte Teilbaum, gezaehlt als KOMPONENTEN. Ihre Tinte gehoert nicht diesem Screen
       allein — sie steht genauso im Siegesbildschirm und, bei `Sparkline`, auf der Laufbuehne.
       Genau deshalb wird sie gezaehlt und nicht angefasst. */
    ["src/ui/RunStats.jsx (ganze Datei)", () => inkOfJsx("src/ui/RunStats.jsx"), 0],
    ["src/ui/RunGraphs.jsx (ganze Datei)", () => inkOfJsx("src/ui/RunGraphs.jsx"), 0],
    ["src/ui/Sparkline.jsx (ganze Datei)", () => inkOfJsx("src/ui/Sparkline.jsx"), 1],
    /* #menu-rework M8 — die Bestenliste. Tinte ist unveraendert eine benannte Luecke, das Fenster
       ist zu, also gezaehlt statt gepraegt.
       DIE CSS-SEITE SCHLIESST `.st-` AUS, und das ist keine Kosmetik: der Kopf-Kanon steht seit M8
       als EINE Regel fuer beide Screens (`.st-eyebrow, .lb-eyebrow`, `.st-sub, .lb-sub`), und diese
       zwei Literale sind M7s — sie stehen oben in dessen Zeile. Ohne den Ausschluss stuende jedes
       von ihnen in zwei Ratschen, und eine Zahl, die zweimal gezaehlt wird, ist keine Messung. */
    ["src/ui/LeaderboardScreen.jsx (ganze Datei)", () => inkOfJsx("src/ui/LeaderboardScreen.jsx"), 1],
    ["src/ui/GlobalLeaderboard.jsx (ganze Datei)", () => inkOfJsx("src/ui/GlobalLeaderboard.jsx"), 3],
    ["src/ui/WeekMods.jsx (ganze Datei)", () => inkOfJsx("src/ui/WeekMods.jsx"), 0],
    ["index.css — .lb-* (M8, ohne die geteilten Kopf-Regeln)", () => inkOfCss([/\.lb-/], [/\.st-/]), 10],
    /* #mainscreen-branding C — DER MAINSCREEN. Tinte ist weiter eine benannte Luecke des Vokabulars
       (2c, "What the vocabulary does not claim"), das Fenster ist zu, also gezaehlt statt gepraegt.
       Die CSS-Zeile schliesst nichts aus: `.hub-`/`.as-hub-` und die vier neuen Familien gehoeren
       diesem Screen allein — kein anderer migrierter Screen traegt eine Regel darauf. */
    ["src/ui/StartScreen.jsx (ganze Datei)", () => inkOfJsx("src/ui/StartScreen.jsx"), 4],
    ["src/ui/BrandGrid.jsx (ganze Datei)", () => inkOfJsx("src/ui/BrandGrid.jsx"), 0],
    ["index.css — .hub-*/.as-hub-* und die Marke (C)",
      () => inkOfCss([/\.hub-/, /\.as-hub-/, /\.as-deck/, /\.as-lockup/, /\.as-tagline/, /\.as-brandgrid/, /\.as-bg-/, /\.as-week-chip/]), 9],
    /* #menu-rework M9 — die drei kleinen Modals. Tinte ist weiterhin keine Achse; gezaehlt wird, was
       da ist. Die Zahlen sind GEMESSEN, nicht gesetzt: der Melder faellt, weil vier verschiedene
       Meldungs-Kaesten zu einer Form mit drei Rollen geworden sind, und der Erststart faellt, weil
       das Feld seine drei Cyans abgegeben hat. Ein Screen, der Literale zusammenfasst, dreht die
       Ratsche nach unten — genau die Richtung, fuer die sie da ist. */
    ["src/ui/modalIcons.jsx", () => inkOfJsx("src/ui/modalIcons.jsx"), 0],
    ["src/ui/PrivacyModal.jsx (ganze Datei)", () => inkOfJsx("src/ui/PrivacyModal.jsx"), 1],
    ["src/ui/UsernameModal.jsx (ganze Datei)", () => inkOfJsx("src/ui/UsernameModal.jsx"), 3],
    ["src/ui/FeedbackModal.jsx (ganze Datei)", () => inkOfJsx("src/ui/FeedbackModal.jsx"), 8],
    /* #zh-hans: 14 -> 12. Die Sprachwahl im Erststart ist von einer Reiterzeile auf das Dropdown
       der Optionen umgestellt; die vier Regeln fuer `[role="radio"]` sind damit ersatzlos
       entfallen und mit ihnen zwei Farbliterale. Genau die Richtung, fuer die die Ratsche da ist. */
    ["index.css — .un-* / .fb-* (M9)", () => inkOfCss([/\.un-/, /\.fb-/]), 12],
    /* #menu-rework M6 — das Glossar. Tinte ist weiterhin eine benannte Luecke des Vokabulars (2c,
       "What the vocabulary does not claim"), das Fenster ist zu, also gezaehlt statt gepraegt. Der
       Screen ist ein NACHSCHLAGEWERK — acht Kategorien, fuenf Archetypen, rund 110 Begriffe —, und
       jede Kategorie bringt ihre Farbe mit; die Zahl ist deshalb kein Versaeumnis, sondern das, was
       ein farbcodiertes Register kostet.
       DIE CSS-SEITE SCHLIESST DIE ANDEREN MIGRIERTEN PRAEFIXE AUS, aus demselben Grund wie bei M4,
       M5 und M8: die Sammelregeln des #eckig-Passes und die #ecke-Bahn nennen `.gl-`/`.gloss-`
       neben `.up-`, `.gd-`, `.cz-`, `.st-` und `.lb-`, und ihre Werte gehoeren dem, der sie
       geschrieben hat. Eine Zahl, die zweimal gezaehlt wird, ist keine Messung.
       `.gl-wrap` ist ueber den Praefix-Ausdruck selbst schon ausgeschlossen — es gehoert
       `GlobalLeaderboard.jsx`, nicht diesem Screen. */
    ["src/ui/Glossary.jsx (ganze Datei)", () => inkOfJsx("src/ui/Glossary.jsx"), 8],
    ["index.css — .gl-* / .gloss-* (M6, ohne die geteilten Sammelregeln)",
      () => inkOfCss([/\.gl-(?!wrap)/, /\.gloss-/], [/\.up-/, /\.gd-/, /\.cz-/, /\.st-/, /\.lb-/]), 14],
    /* #menu-rework M11 — die Lauf-Dialoge. Die kleinste Zahl der Runde, und sie ist gemessen und nicht
       gesetzt: drei der vier Dateien tragen ueberhaupt keine Tinte, die vierte genau eine (die
       Ueberschrift der Update-Leiste). Die CSS-Seite steht auf null — die fuenf `.rc-*`-Regeln und die
       zwei `.up-banner`-Regeln setzen Groessen, Radien und einen Schatten, keine Schriftfarbe. */
    ["src/ui/RunConfirm.jsx (ganze Datei)", () => inkOfJsx("src/ui/RunConfirm.jsx"), 0],
    ["src/ui/RunLoader.jsx (ganze Datei)", () => inkOfJsx("src/ui/RunLoader.jsx"), 0],
    ["src/ui/UpdateBanner.jsx (ganze Datei)", () => inkOfJsx("src/ui/UpdateBanner.jsx"), 1],
    ["src/ui/PwaInstall.jsx (ganze Datei)", () => inkOfJsx("src/ui/PwaInstall.jsx"), 0],
    ["index.css — .rc-* / .up-banner (M11)", () => inkOfCss([/\.rc-/, /\.up-banner/]), 0],
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

/* ============================================================================
   DIE KANTEN-RATSCHE (MENU-38) — beim Freeze beschlossen, von MH1 gebaut.

   DIE DURCHSICHTIGE NEUTRALE KANTE IST KEIN TOKEN, und sie wird in dieser Runde auch keins. Der
   Beschluss steht in conventions.md 2c: `.as-edge-*` hat 143 Fundstellen und ist in dieser Runde
   nicht migriert. Ein Token, das fuer EINEN Alpha der Familie gepraegt wird, saesse in einem
   eingefrorenen Vokabular auf einem Wert, den kein Screen waehlen durfte — und die spaetere
   Migration muesste ihn entweder ehren oder brechen. Also dieselbe Form wie bei der Tinte: ZAEHLEN,
   NICHT PRAEGEN.

   DIE FAMILIE, FRISCH GEMESSEN (MH1, Stand 631a0b4e). Das Urteil sprach von sieben Alphas, M2b fand
   einen achten (MENU-44). Gemessen sind es ZWOELF, ueber 64 Literale in vier Dateien:

     .07 .08 .10 .12 .13 .14 .16 .18 .22 .25 .30 .35

   Vier davon kannte weder das Urteil noch MENU-44: `.08` (index.css), `.30` (index.css), `.22` und
   `.25` (beide StartScreen.jsx, inline). Die Zahl im Urteil war eine Schaetzung ueber `.as-edge-*`;
   die Familie ist breiter als die Klasse, die sie traegt. Der Startwert unten kommt deshalb aus der
   Messung und nicht aus dem Urteil — genau das ist der Auftrag.

   WARUM JEDE OBERGRENZE UNTEN NULL IST, und warum das kein leerer Waechter ist. Die Kante IST eine
   der fuenf Achsen, anders als die Tinte. In einer migrierten Regel faellt ein Kanten-Literal also
   schon an der Achsen-Pruefung. Diese Ratsche deckt genau das ab, wo jene NICHT hinsieht:

     * `exemptFns` — die Buehnen von CustomizeScreen.jsx sind von der Achsen-Pruefung ausgenommen;
     * `stateLiterals` — namentlich erlaubte Werte;
     * die GANZE Datei statt der Haken-Region, aus demselben Grund wie bei der Tinte.

   Deshalb zaehlt sie, wie die Tinte zaehlt: ueber die ganze migrierte Einheit, ohne Ausnahmen. Die
   Werkstatt stand hier auf EINS — die Haarlinie von `.cz-fxrow` — und M2b hat sie auf `--ed-quiet`
   gezogen (MENU-44, gemessen 3/255 ueber der Panelflaeche). Die Null ist also ein ERREICHTER Zustand
   und keine Annahme, und ab hier ist sie eine Ratsche: wer eine Kante als Literal zurueckbringt,
   faellt.

   EINE RATSCHE, DEREN OBERGRENZEN ALLE NULL SIND, KANN AUS ZWEI GRUENDEN GRUEN SEIN — weil nichts da
   ist, oder weil sie nichts mehr findet. Das ist die stillste Art, diesen Waechter wertlos zu machen,
   und sie ist hier akuter als bei der Tinte, wo die Summe 40 uebersteigt. Die Lebendprobe unten
   zaehlt die Familie deshalb im BAUM und verlangt, dass der Sucher sie dort noch findet. Sie steht
   bewusst als Untergrenze und nicht als `toBe`: was ausserhalb der migrierten Einheiten liegt,
   gehoert dieser Runde nicht, und eine Zahl, die bei jeder fremden Aenderung faellt, blockiert Arbeit,
   die noch nicht passiert ist.
   ============================================================================ */
const EDGE_NEUTRAL = /rgba\(\s*150\s*,\s*150\s*,\s*170\s*,\s*[0-9.]+\s*\)/g;
const edgeIn = (text) => [...withoutFallbacks(text).matchAll(new RegExp(EDGE_NEUTRAL.source, "g"))].length;
/* UEBER DIE GANZE DATEI, wie bei der Tinte und aus demselben Grund: `exemptFns` sagt „das ist kein
   Panel", nicht „hier schaut niemand hin". Eine Kante in einer Vorschau-Szene ist dieselbe Familie. */
const edgeOfJsx = (path) => edgeIn(strip(read(path)));

describe("#menu-rework — die Kanten-Ratsche (MENU-38): durchsichtige neutrale Kanten wachsen nicht", () => {
  const css = read("src/index.css");
  const all = rules(css);
  const edgeOfCss = (res, ausser = []) => all
    .filter(([sel]) => res.some((r) => r.test(sel)) && !ausser.some((r) => r.test(sel)))
    .reduce((n, [, body]) => n + edgeIn(body), 0);

  /* Dieselbe Aufteilung wie bei der Tinte — Schale und Inhalte getrennt, damit M2as gemessene Zahl
     nicht ploetzlich auf der Summe beider Haelften steht. */
  const CAP = [
    ["src/ui/modalStyle.jsx", () => edgeOfJsx("src/ui/modalStyle.jsx"), 0],
    ["src/ui/OptionsModal.jsx", () => edgeOfJsx("src/ui/OptionsModal.jsx"), 0],
    ["src/ui/optionsBits.jsx", () => edgeOfJsx("src/ui/optionsBits.jsx"), 0],
    ["src/ui/CustomizeScreen.jsx (ganze Datei)", () => edgeOfJsx("src/ui/CustomizeScreen.jsx"), 0],
    ["index.css — .op-* (M1)", () => edgeOfCss([/\.op-/, /\.as-opt-/]), 0],
    ["index.css — .cz-* Schale (M2a)", () => edgeOfCss(M2A_SHELL_SELECTORS), 0],
    ["index.css — .cz-* Inhalte (M2b)", () => edgeOfCss([/\.cz-/], M2A_SHELL_SELECTORS), 0],
    /* #menu-rework M3 — der Baum. Die CSS-Seite steht auf 0, und diese Null ist ein ERREICHTER
       Zustand, keine Abwesenheit: M3 hat vierzehn durchsichtige neutrale Kanten auf `--ed-quiet`
       gezogen. Die JSX-Seite steht NICHT auf 0 — `panelStyle()` traegt eine, und die gehoert dem
       Zweig-Pfad unter 1280 px, den dieser Auftrag ausdruecklich nicht anfasst. Sie steht deshalb
       als gemessene Eins da statt als stillschweigende Null. */
    ["src/ui/UpgradeScreen.jsx (ganze Datei)", () => edgeOfJsx("src/ui/UpgradeScreen.jsx"), 1],
    ["index.css — .up-* (M3)", () => edgeOfCss([/\.up-(?!banner)/]), 0],
    /* Dieselbe Lage wie bei der Tinte: gezaehlt, nicht migriert — Begruendung dort. */
    ["src/ui/DeckDetail.jsx (ganze Datei, NICHT migriert)", () => edgeOfJsx("src/ui/DeckDetail.jsx"), 0],
    /* #menu-rework M7. Die CSS-Seite beider Screens steht auf null, und diese Null ist ein
       ERREICHTER Zustand: die durchsichtigen neutralen Kanten von `.st-box`, `.rd-bf`, `.rd-blist2`
       und den geteilten Kacheln sind auf `--ed-quiet` gezogen — dieselbe Umstellung, die M2a
       gemessen (rund 9/255) und der Owner abgenommen hat, und die M3 vierzehnmal gezogen hat. */
    ["src/ui/StatsScreen.jsx (ganze Datei)", () => edgeOfJsx("src/ui/StatsScreen.jsx"), 0],
    ["src/ui/RunDetail.jsx (ganze Datei)", () => edgeOfJsx("src/ui/RunDetail.jsx"), 0],
    ["src/ui/SeedChip.jsx (ganze Datei)", () => edgeOfJsx("src/ui/SeedChip.jsx"), 0],
    ["index.css — .st-* (M7)", () => edgeOfCss([/\.st-/]), 0],
    ["index.css — .rd-* (M7)", () => edgeOfCss([/\.rd-/]), 0],
    /* Der geteilte Teilbaum. `Sparkline` steht NICHT auf null, und das ist kein Versaeumnis: ihre
       eine Fundstelle ist die STRICHFARBE des Gitters, kein Rahmen — der Ausdruck dieser Ratsche
       sucht die Familie im ganzen Text, nicht nur an `border`. Sie als gemessene Eins stehen zu
       lassen ist ehrlicher, als sie ueber eine Sonderregel wegzudefinieren. */
    ["src/ui/RunStats.jsx (ganze Datei)", () => edgeOfJsx("src/ui/RunStats.jsx"), 0],
    ["src/ui/RunGraphs.jsx (ganze Datei)", () => edgeOfJsx("src/ui/RunGraphs.jsx"), 0],
    ["src/ui/Sparkline.jsx (ganze Datei)", () => edgeOfJsx("src/ui/Sparkline.jsx"), 1],
    /* #menu-rework M8. Die drei JSX-Dateien standen von Anfang an auf null — die Bestenliste hat
       ihre Kanten nie inline gesetzt. Die CSS-Seite stand auf SECHS und steht jetzt auf null: die
       Navigationszeile, die Kontext-Kachel, der Modifikator-Kasten, der Spannenwert, der
       Auswahlregel-Chip und die Haarlinie zwischen zwei Listenzeilen sind auf `--ed-quiet` gezogen.
       Diese Null ist ein ERREICHTER Zustand, keine Abwesenheit — dieselbe Umstellung, die M2a
       gemessen, M3 vierzehnmal und M7 viermal gezogen hat. Die gemessenen Deltas stehen in
       measurements/M8.md §3.4. */
    ["src/ui/LeaderboardScreen.jsx (ganze Datei)", () => edgeOfJsx("src/ui/LeaderboardScreen.jsx"), 0],
    ["src/ui/GlobalLeaderboard.jsx (ganze Datei)", () => edgeOfJsx("src/ui/GlobalLeaderboard.jsx"), 0],
    ["src/ui/WeekMods.jsx (ganze Datei)", () => edgeOfJsx("src/ui/WeekMods.jsx"), 0],
    ["index.css — .lb-* (M8)", () => edgeOfCss([/\.lb-/]), 0],
    /* #menu-rework M4. Beide Seiten stehen auf null, und beide Nullen sind ERREICHTE Zustaende:
       `GameOver.jsx` trug eine (die ruhende Kante der Gebaeude-Zeile, jetzt `--ed-quiet`), die
       CSS-Seite trug VIER — die Kachelform, die zwei Aktionen, der Griff des Stich-Graphen und die
       Bestleistungs-Zeile. Dieselbe Umstellung, die M2a gemessen (rund 9/255) und der Owner
       abgenommen hat, die M3 vierzehnmal, M7 viermal und M8 sechsmal gezogen hat; die gemessenen
       Deltas stehen in measurements/M4.md Teil 3.
       Der Ausschluss von `.st-`/`.lb-` ist derselbe wie bei der Tinte und aus demselben Grund. */
    ["src/ui/GameOver.jsx (ganze Datei)", () => edgeOfJsx("src/ui/GameOver.jsx"), 0],
    ["index.css — .go-* (M4, ohne die geteilten Schalen-Regeln)", () => edgeOfCss([/\.go-/], [/\.st-/, /\.lb-/]), 0],
    /* #menu-rework M5. Beide Seiten stehen auf null. Die JSX-Seite stand von Anfang an dort — der
       Leitfaden hat seine durchsichtigen Kanten nie inline gesetzt, seine acht `#2a2a33` sind DECKEND
       und gehoeren einer anderen Familie (M5-F02). Die CSS-Seite trug DREI und steht jetzt auf null:
       die Auskunft im Kopf, die Navigationszeile und die Notiz darunter, alle auf `--ed-quiet`.
       Diese Null ist ein ERREICHTER Zustand — dieselbe Umstellung, die M2a gemessen, M3 vierzehnmal,
       M7 viermal, M8 sechsmal und M4 fuenfmal gezogen hat. */
    ["src/ui/GuideOverlay.jsx (ganze Datei)", () => edgeOfJsx("src/ui/GuideOverlay.jsx"), 0],
    ["index.css — .gd-* (M5, ohne die geteilten Sammelregeln)", () => edgeOfCss([/\.gd-/], [/\.up-/, /\.gl-/, /\.cz-/, /\.st-/, /\.lb-/]), 0],
    /* #menu-rework M6. Beide Seiten stehen auf null. Die JSX-Seite stand von Anfang an dort — das
       Glossar hat seine Kanten nie durchsichtig-neutral inline gesetzt. Die CSS-Seite trug VIER und
       steht jetzt auf null, und diese Null ist zur Haelfte ein ERREICHTER und zur Haelfte ein
       AUFGERAEUMTER Zustand — was hier steht, ist beides, weil ein spaeterer Leser sonst das eine
       fuer das andere haelt:
         DREI WURDEN UMGESTELLT — die Notiz unter der Spalte, die Kante des Suchfelds und die der
           Begriffskarte, alle auf `--ed-quiet`. Dieselbe Umstellung, die M2a gemessen (rund 9/255)
           und der Owner abgenommen hat, und die M3 vierzehnmal, M7 viermal, M8 sechsmal, M4 fuenfmal
           und M5 dreimal gezogen hat. Gemessen: 444 `bc`-Deltas, 111 je Zelle, und NICHTS SONST.
         EINE WAR TOT — die Kante der Navigationszeile. `#gl-ruhe` setzt `border: 0` auf denselben
           Selektor spaeter im Blatt, also malte sie nichts (am lebenden Dokument abgelesen). Sie ist
           geloescht, nicht umgestellt: ein `var(--ed-quiet)` dort haette der Ratsche eine Umstellung
           gemeldet, die kein Auge nachpruefen kann. Steht als M6-F01 im Nachweis. */
    ["src/ui/Glossary.jsx (ganze Datei)", () => edgeOfJsx("src/ui/Glossary.jsx"), 0],
    ["index.css — .gl-* / .gloss-* (M6, ohne die geteilten Sammelregeln)",
      () => edgeOfCss([/\.gl-(?!wrap)/, /\.gloss-/], [/\.up-/, /\.gd-/, /\.cz-/, /\.st-/, /\.lb-/]), 0],
    /* #mainscreen-branding C — DER MAINSCREEN, und er ist der einzige Eintrag dieser Ratsche, der
       NICHT bei null steht. MH1 hat es vorhergesagt: die Familie ist zwoelf Alphas ueber 64 Literale,
       und `.22` und `.25` wohnen hier — „named there as an input rather than migrated from here".
       C3 hat beide vom Inline-Style in je eine Regel geholt (umgewandelt, nicht kopiert); `.10` und
       `.18` stehen weiter inline, weil sie unter 1280 px mitrendern und ein Inline-Style keine Media
       Query kennt. Vier also, gezaehlt und nicht gepraegt — die Familie wird von dem migriert, der
       `.as-edge-*` anfasst, und der bekommt hier eine Zahl statt eines Eindrucks. */
    ["src/ui/StartScreen.jsx (ganze Datei)", () => edgeOfJsx("src/ui/StartScreen.jsx"), 2],
    ["index.css — .hub-*/.as-hub-* und die Marke (C)",
      () => edgeOfCss([/\.hub-/, /\.as-hub-/, /\.as-deck/, /\.as-lockup/, /\.as-tagline/, /\.as-brandgrid/, /\.as-bg-/, /\.as-week-chip/]), 4],
    /* #menu-rework M11. Alle fuenf Einheiten stehen auf null, und DIESE Nullen sind ANWESENHEITEN und
       keine erreichten Zustaende — die vier Dateien haben die durchscheinende neutrale Kante nie
       getragen, und die sieben Regeln setzen ueberhaupt keine Kantenfarbe. Ausgeschrieben, weil MH1s
       eigene Lehre die umgekehrte ist: dort las sich eine erreichte Null wie „hier war nie etwas".
       Hier ist es wirklich „hier war nie etwas", und ein spaeterer Leser soll die zwei Sorten Null
       auseinanderhalten koennen, ohne die Diffs zu lesen. */
    ["src/ui/RunConfirm.jsx (ganze Datei)", () => edgeOfJsx("src/ui/RunConfirm.jsx"), 0],
    ["src/ui/RunLoader.jsx (ganze Datei)", () => edgeOfJsx("src/ui/RunLoader.jsx"), 0],
    ["src/ui/UpdateBanner.jsx (ganze Datei)", () => edgeOfJsx("src/ui/UpdateBanner.jsx"), 0],
    ["src/ui/PwaInstall.jsx (ganze Datei)", () => edgeOfJsx("src/ui/PwaInstall.jsx"), 0],
    ["index.css — .rc-* / .up-banner (M11)", () => edgeOfCss([/\.rc-/, /\.up-banner/]), 0],
  ];

  for (const [name, count, cap] of CAP) {
    it(`${name}: ${cap} Kanten-Literale, nicht mehr`, () => {
      expect(count(), `durchsichtige neutrale Kante in ${name} — die Ratsche dreht nur nach unten`).toBe(cap);
    });
  }

  it("der Sucher erkennt die Familie — als Positivprobe, nicht als Baumzahl", () => {
    /* #menu-rework M5 — DIESE PROBE STAND ALS SCHWELLE AUF EINER ZAHL, DIE MIT JEDER GELUNGENEN
       MIGRATION SINKT, und sie ist genau daran gefallen: gemessen 58, als sie geschrieben wurde,
       dann Untergrenze 30 — und M5 hat drei weitere Kanten auf `--ed-quiet` gezogen, womit der Baum
       auf 29 steht. Der Waechter wurde rot, WEIL DAS VOKABULAR RICHTIG ANGEWENDET WURDE.

       Das ist MR1s H-c, wortwoertlich, und die Antwort ist dieselbe: auf die INVARIANTE umschreiben,
       nicht auf eine niedrigere Zahl. Eine niedrigere Zahl haette dieselbe Falle fuer M6 gestellt,
       und fuer jeden danach, bis irgendwann jemand die Ratsche selbst aufweicht, um sie loszuwerden.

       DIE INVARIANTE IST NICHT "der Baum enthaelt noch N davon". Sie ist: DER AUSDRUCK ERKENNT DIE
       FAMILIE. Das haengt an keinem Migrationsstand, also wird es auch nicht daran gemessen:

         1. Eine POSITIVPROBE an einem festen Text. Sie kann nie veralten und nie durch eine
            Migration fallen — nur dadurch, dass jemand den Ausdruck kaputt macht, wofuer sie da ist.
            Zusaetzlich eine NEGATIVPROBE: ein Nachbarwert, den der Ausdruck NICHT nehmen darf, sonst
            beruhigt ein zu weiter Ausdruck die Ratsche genauso zuverlaessig wie ein zu enger.
         2. Ein ANKER IM BAUM, der dieser Runde nicht gehoert: die drei Deklarationen von
            `.as-edge` / `.as-edge-strong` / `.as-edge-card` / `.as-edge-neutral`. `.as-edge-*` hat
            143 Fundstellen, wird in dieser Runde nicht migriert, und die zwoelf Alphas der Familie
            stehen in JEDEM Auftrag ausdruecklich unter den Nicht-Zielen. Deshalb `toBe` statt
            `toBeGreaterThan`: die Zahl darf hier weder fallen noch wachsen, und beides zu melden ist
            strenger als eine Untergrenze, die nur nach unten schaut. */
    expect(edgeIn("border: 1px solid rgba(150, 150, 170, .14);"),
      "der Ausdruck erkennt die Familie nicht mehr — die Ratsche waere ab jetzt still gruen").toBe(1);
    expect(edgeIn("border: 1px solid rgba(150, 150, 171, .14);"),
      "der Ausdruck ist zu weit: er nimmt einen NACHBARWERT mit, der nicht zur Familie gehoert").toBe(0);

    /* Der Anker. `.as-edge-*` traegt die Familie an ihrer Quelle und ist in jedem Auftrag dieser
       Runde ein Nicht-Ziel — faellt diese Zahl, hat jemand an ihr gearbeitet, und das ist zu melden. */
    const src = strip(css);
    const von = src.indexOf(".as-edge,"), bis = src.indexOf(".as-edge-thin");
    expect(von, ".as-edge-* nicht mehr gefunden — dann prueft der Anker nichts").toBeGreaterThan(-1);
    expect(bis, ".as-edge-thin nicht mehr gefunden — der Anker hat kein Ende mehr").toBeGreaterThan(von);
    expect(edgeIn(src.slice(von, bis)),
      "die drei Kanten der .as-edge-*-Rollenklassen sind nicht mehr genau drei — .as-edge-* ist in "
      + "dieser Runde ein Nicht-Ziel, also ist jede Aenderung daran ein Befund").toBe(3);
  });

  it("die migrierten Einheiten sind zusammen auf null — bis auf die EINE benannte Ausnahme", () => {
    /* Ausdruecklich als eigene Zeile und nicht nur als Einzelzeilen: DAS ist die Zahl, die MENU-38
       dem Nachfolge-Workstream uebergeben soll. Sie ist erreicht, nicht angenommen.

       #menu-rework M3 — SIE IST NICHT MEHR GLATT NULL, und das ist ein Befund, keine Aufweichung.
       MH1 hat diese Zeile geschrieben, als sieben Einheiten migriert waren, und sie „der Startwert,
       den M3 erbt" genannt. M3 misst seine eigene Einheit und findet EINE Kante: `panelStyle()` in
       UpgradeScreen.jsx, und die gehoert dem Zweig-Pfad unter 1280 px, den dieser Auftrag
       ausdruecklich nicht anfasst. Sie auf `--ed-quiet` zu ziehen waere eine Bewegung an der
       Handy-Fassung (durchsichtig -> deckend, rund 9/255), die niemand bestellt hat.
       Die Summe wird deshalb OHNE diese eine gebildet — und die eine wird einzeln nachgewiesen,
       damit sie nicht als „irgendwo eine" stehenbleibt und still auf zwei wachsen kann. */
    /* #mainscreen-branding C — DIE DRITTE UND VIERTE AUSNAHME, und sie sind die groesste. MH1 hat
       vorhergesagt, dass die Familie hier wohnt: „`.22` und `.25` live in `StartScreen.jsx`, which
       belongs to the mainscreen workstream — named there as an input rather than migrated from here."
       Gemessen sind es SECHS und nicht zwei, weil MH1 die Inline-Literale der JSX-Datei gezaehlt hat
       und der Screen die Familie auch im Stylesheet traegt (C4-F02):

         .16  zweimal in index.css   — die deck-getoenten Kanten der SCHMALEN Fassung
         .22  einmal in index.css    — C3, aus dem Inline-Style geholt
         .25  einmal in index.css    — C3, ebenso
         .10  einmal inline          — die Bonus-Leiste, rendert unter 1280 px mit
         .18  einmal inline          — die ruhende Kante des Kachel-Streifens, ebenso

       KEINE davon wird umgestellt, und der Grund ist bei allen sechs derselbe wie bei M3s einer: vier
       rendern unter 1280 px mit, wo diese Runde nichts bewegt, und alle sechs gehoeren einer Familie,
       die MENU-38 ausdruecklich RATSCHT statt einsammelt — sie gehoert dem, der `.as-edge-*` migriert,
       und der bekommt hier eine Zahl statt eines Eindrucks. */
    const AUSNAHMEN = ["src/ui/UpgradeScreen.jsx (ganze Datei)", "src/ui/Sparkline.jsx (ganze Datei)",
      "src/ui/StartScreen.jsx (ganze Datei)", "index.css — .hub-*/.as-hub-* und die Marke (C)"];
    const rest = CAP.filter(([name]) => !AUSNAHMEN.includes(name));
    expect(rest.reduce((n, [, c]) => n + c(), 0), "eine migrierte Einheit traegt wieder eine Kante").toBe(0);

    /* Die Gegenprobe zu jeder Ausnahme: sie ist genau eine, und sie steht genau dort, wo die
       Begruendung sie behauptet. Waechst sie, oder wandert sie an eine andere Stelle, faellt diese
       Zeile — genau dafuer steht sie hier einzeln und nicht als „irgendwo eine". */
    const up = strip(read("src/ui/UpgradeScreen.jsx"));
    expect(edgeIn(up), "die benannte Ausnahme ist nicht mehr genau eine").toBe(1);
    const ps = up.match(/const panelStyle[\s\S]*?\n\}\);/);
    expect(ps, "panelStyle nicht mehr gefunden").toBeTruthy();
    expect(edgeIn(ps[0]), "die eine Kante steht nicht mehr in panelStyle").toBe(1);

    /* #menu-rework M7 — DIE ZWEITE AUSNAHME IST KEINE KANTE, und deshalb steht sie hier statt in
       einer Umschreibung des Suchausdrucks. `Sparkline.jsx` schreibt `rgba(150, 150, 170, .12)`
       genau einmal, als STROKE des Gitters der ausfuehrlichen Fassung — dieselbe Haarlinie, die das
       Haus ueberall benutzt, nur als Linie in einem SVG statt als Rahmen einer Box. Der Ausdruck
       dieser Ratsche sucht die FAMILIE im ganzen Text (aus gutem Grund: `exemptFns` und die
       Inline-Schreibweisen sind genau das, was er abdecken soll), also findet er sie mit.
       Sie auf `--ed-quiet` zu ziehen waere keine Umstellung, sondern eine Umgestaltung: `#2a2a34`
       ist deckend, das Gitter liegt durchsichtig ueber dem Panel, und die Komponente gehoert der
       LAUFBUEHNE. Sie steht deshalb als gemessene Eins da, an genau einer Stelle nachgewiesen. */
    /* Die Gegenprobe zu den beiden Mainscreen-Ausnahmen, in derselben Form wie die beiden darueber:
       jede steht genau dort, wo die Begruendung sie behauptet, und die Alphas sind einzeln genannt.
       Waechst eine, oder taucht ein siebtes Alpha auf, faellt diese Zeile. */
    const ss = strip(read("src/ui/StartScreen.jsx"));
    expect(edgeIn(ss), "der Mainscreen traegt nicht mehr genau zwei Inline-Kanten").toBe(2);
    const ssAlphas = [...ss.matchAll(EDGE_NEUTRAL)].map((m) => m[0].match(/,\s*([0-9.]+)\s*\)/)[1]).sort();
    expect(ssAlphas, "die zwei inline gebliebenen Alphas sind nicht mehr .10 und .18").toEqual([".18", "0.10"].sort());
    const cssAlphas = all
      .filter(([sel]) => [/\.hub-/, /\.as-hub-/, /\.as-deck/, /\.as-lockup/, /\.as-tagline/,
        /\.as-brandgrid/, /\.as-bg-/, /\.as-week-chip/].some((r) => r.test(sel)))
      .flatMap(([, body]) => [...withoutFallbacks(body).matchAll(new RegExp(EDGE_NEUTRAL.source, "g"))])
      .map((m) => m[0].match(/,\s*([0-9.]+)\s*\)/)[1]).sort();
    expect(cssAlphas, "die vier Alphas im Stylesheet des Mainscreens stimmen nicht mehr")
      .toEqual([".16", ".16", ".22", ".25"]);

    const sl = strip(read("src/ui/Sparkline.jsx"));
    expect(edgeIn(sl), "die zweite Ausnahme ist nicht mehr genau eine").toBe(1);
    /* Zeilenweise, damit die Gegenprobe SAGEN kann, wo die eine Fundstelle steht. Ueber `String.raw`
       gebaut statt als Regex-Literal: `no-control-regex` faellt sonst ueber die Steuerzeichen. */
    const gitter = sl.split(new RegExp(String.raw`
?
`)).filter((z) => edgeIn(z) === 1);
    expect(gitter.length, "die eine Kante steht nicht mehr auf genau einer Zeile").toBe(1);
    expect(gitter[0].trim(), "die eine Kante ist keine Gitterlinie mehr — dann ist sie ein Rahmen")
      .toMatch(/^stroke=\{voll \?/);
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

/* ============================================================================
   #menu-rework MR1 — DER ZEILENGRUND STEHT GENAU EINMAL.

   THIS IS WHAT REPLACED TWO RATCHET ENTRIES AND FIVE EXEMPTIONS, AND IT IS STRICTER THAN ALL SEVEN.
   Before MR1, `rgba(15, 15, 21, .72)` was a counted gap: named per file in `stateLiterals`, exempted
   per rule in the surface axis. Those entries covered the sites that HAPPENED to carry it on the day
   they were written. A ninth site arriving in a file nobody had listed was invisible to every one of
   them — which is exactly how eight sites came to exist in the first place.

   The invariant is not "there are eight". It is: THE VALUE IS WRITTEN OUT ONCE, IN ITS OWN
   DECLARATION, AND EVERY CONSUMER READS THE TOKEN. That holds however many consumers there are, so
   consolidating two rules into one cannot break it and adding a tenth screen cannot either — only
   writing the value out again can, which is the defect.

   TWO SPELLINGS, AND THAT IS TYPO-12 PAID FORWARD: `.72` and `0.72` are the same colour, and a guard
   that knows one of them is wrong the first time somebody types the other. Whitespace is normalised
   for the same reason — `rgba(15,15,21,.72)` is the spelling the glossary's own design note uses.

   COMMENTS ARE STRIPPED FIRST. index.css records what the #gl-ruhe pass took, verbatim, value and
   all; a historical note must not be able to trip a guard, and — the other direction, which is the
   expensive one — must not be able to satisfy one either.
   ============================================================================ */
describe("#menu-rework MR1 — der Zeilengrund steht genau einmal", () => {
  /* Every spelling of the row ground, in a source with comments already removed. */
  const ROW_RE = /rgba\(\s*15\s*,\s*15\s*,\s*21\s*,\s*0?\.72\s*\)/g;
  const hits = (src) => [...strip(src).matchAll(ROW_RE)].length;

  const CSS = read("src/index.css");
  /* Every migrated JSX file, plus the two that carry the constant. Read through the allowlist rather
     than named here: a file added there is covered by this guard on the same day. */
  const JSX = MIGRATED_JSX.map((e) => [e.path, read(e.path)]);

  it("das Literal steht im ganzen Baum genau einmal — in seiner eigenen Deklaration", () => {
    const inCss = hits(CSS);
    const inJsx = JSX.filter(([, src]) => hits(src) > 0).map(([p]) => p);
    expect(inJsx, `Zeilengrund als Literal im JSX — \`var(--sf-row)\` schreiben:\n  ${inJsx.join("\n  ")}`)
      .toEqual([]);
    expect(inCss, "der Zeilengrund steht nicht mehr genau einmal in index.css").toBe(1);
    /* ...and that one time is the declaration, not a rule that happens to be the only one left. */
    expect(/\n\s*--sf-row\s*:\s*rgba\(\s*15\s*,\s*15\s*,\s*21\s*,\s*0?\.72\s*\)\s*;/.test(strip(CSS)),
      "die eine Fundstelle ist nicht die Deklaration von --sf-row").toBe(true);
  });

  it("das Token hat lebende Verbraucher auf BEIDEN Seiten — sonst prunet Tailwind es weg", () => {
    /* 2c, „a token you do not use does not ship": Tailwind 4 entfernt eine `@theme`-Variable, die
       nichts referenziert, aus dem gebauten Stylesheet. Ein Token ohne Verbraucher ist deshalb nicht
       nur unbenutzt, es ist ABWESEND — und ein Inline-Stil, der es liest, faellt dann auf nichts
       zurueck. Beide Seiten werden geprueft, weil die JSX-Seite die ist, die Tailwinds Scanner
       finden muss.
       KEINE ZAHL, sondern „mindestens einer": eine Schwelle auf acht wuerde die naechste
       Zusammenfuehrung zweier Regeln bestrafen, und genau das ist der Fehler, den M9 bezahlt hat. */
    const use = (src) => [...strip(src).matchAll(/var\(\s*--sf-row\s*[,)]/g)].length;
    expect(use(CSS), "keine Regel liest --sf-row mehr").toBeGreaterThan(0);
    expect(JSX.reduce((n, [, src]) => n + use(src), 0), "kein JSX liest --sf-row mehr").toBeGreaterThan(0);
  });
});

describe("#menu-rework MH4 — how far an exemption reaches is stated HERE, not in a private probe", () => {
  const { beide, nurOben } = reichweite(read("src/index.css"), read("test/panel-tokens.test.js"));
  const kennung = (e) => `${e.liste} ${e.quelle}`;

  /* ============================================================================
     THE ENTRIES THAT TAKE TWO RULES OUT UNDER ONE REASON — one on each side of the threshold.

     NOTHING IS JUDGED HERE. Where both halves share the reason — a button pads against its label, at
     any width — the reach is harmless, and that is the majority. It is a defect only where the
     reasons differ: untouchable below the threshold, tokenisable above it. Only whoever knows the
     screen can decide that; this list makes them visible and leaves the decision open.

     WHOEVER JUDGES ONE scopes it with `nurHandy(…)` or `nurDesktop(…)` and strikes it from here.
     ============================================================================ */
  const UEBER_DIE_SCHWELLE = [
    "INSET_EXEMPT /\\.op-dd-btn/",
    "INSET_EXEMPT /\\.op-foot/",
    "INSET_EXEMPT /\\.op-col2/",
    "INSET_EXEMPT /\\.cz-root/",
    "INSET_EXEMPT /^\\.up-root$/",
  ];

  it("no entry reaches across the threshold other than those named", () => {
    /* WRITTEN AS "CONTAINS NO X OTHER THAN Y", in both directions. Checking only the one half would
       be asking whether something is THERE — and a list matching nothing at all would pass (H-c). A
       new double grip surfaces above, a vanished one below. */
    const ist = beide.map(kennung);
    const unbenannt = ist.filter((x) => !UEBER_DIE_SCHWELLE.includes(x));
    expect(unbenannt, `new entry reaching across the threshold:\n  ${unbenannt.join("\n  ")}`).toEqual([]);
    const verschwunden = UEBER_DIE_SCHWELLE.filter((x) => !ist.includes(x));
    expect(verschwunden, `named but no longer reaching — update the list:\n  ${verschwunden.join("\n  ")}`)
      .toEqual([]);
  });

  it("the halves separation actually separates — negative probe", () => {
    /* H-b IN ITS QUIETEST FORM: if `haelften()` always returned "both", the whole guard would behave
       exactly as it did before MH4, and EVERY test in this file would stay green — including this
       one, if it merely counted. So it measures the separation itself, on two real rules. */
    expect(BREAKPOINT_DT, "`--breakpoint-dt` is gone from the sheet — the separation falls back to `both`")
      .toBeGreaterThan(0);
    const alle = rules(read("src/index.css"));
    const oben = alle.find(([sel, , medien]) => sel === ".hub-root" && medien.length > 0);
    const offen = alle.find(([sel, , medien]) => sel === ".as-hub-field" && medien.length === 0);
    expect(oben, "`.hub-root` is no longer inside a media block — then this probe measures nothing").toBeTruthy();
    expect(offen, "`.as-hub-field` has no base rule left — then this probe measures nothing").toBeTruthy();
    expect(haelften(oben[2]), "a rule above the threshold does not reach the narrow version")
      .toEqual({ phone: false, desktop: true });
    expect(haelften(offen[2]), "a rule without a width condition reaches both halves")
      .toEqual({ phone: true, desktop: true });
    /* And the effect on an exemption, in both directions: unqualified it still covers the rule above
       (H-a), scoped to the phone half it does not. */
    expect(deckt(/^\.hub-root$/, ".hub-root", oben[2]), "an unqualified entry covers as before").toBe(true);
    expect(deckt(nurHandy(/^\.hub-root$/), ".hub-root", oben[2]), "scoped to phone must not cover above").toBe(false);
    expect(deckt(nurDesktop(/^\.hub-root$/), ".hub-root", oben[2]), "scoped to desktop covers above").toBe(true);
    expect(deckt(nurHandy(/^\.as-hub-field$/), ".as-hub-field", offen[2]), "the base rule carries the narrow version").toBe(true);
  });

  it("the second group is counted apart — a double grip WITHIN one half is not one", () => {
    /* Why the historical measurement counted sixteen and this one five: eleven of those entries cover
       two rules that BOTH sit above the threshold — a width block and its height variant
       (`… and (max-height: 950px)`) for the flat desktop window. The C4 probe knew only the first
       `@media (min-width: 1280px)` block and treated every rule outside it as a phone rule. Measured
       on `.hub-root`: both sites sit above, and there is no base rule at all. 5 + 11 = the sixteen.
       The group is stated here so the difference does not read as a finding that disappeared. */
    expect(nurOben.map(kennung), "the mainscreen's height variants belong in this group")
      .toContain("C_INSET_EXEMPT /^\\.hub-root$/");
    expect(beide.map(kennung), "`.hub-root` does NOT reach across the threshold")
      .not.toContain("C_INSET_EXEMPT /^\\.hub-root$/");
  });
});
