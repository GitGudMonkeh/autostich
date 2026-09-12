import { useState } from "react";
import { RankIcon } from "./RankIcon.jsx"; // #pokal-eins: Ranglisten-Zeichen, geteilt mit der Bestenliste
import { MuteButton } from "./MuteButton.jsx";
import { parseSeed } from "../game/rng.js"; // #205 Challenger Mode: eingefügten Seed dekodieren
import { currentWeek } from "../game/weeklySeed.js"; // #370: Wochennummer für den Ranglisten-Knopf
import { GlossaryPanel } from "./Glossary.jsx";
import { battlefieldVeil, battlefieldDim } from "./cosmeticAssets.js"; // #deck-mobil: Schleier-Deckel fuer zu helle Spielfelder; #bf-desktop: Bild-Daempfung ab 1280 px
import { deckDef, battlefieldDef, globalFxDef } from "../i18n/labels.js"; // Raritäts-/Kosmetik-/Effekt-Namen: EINE Quelle, übersetzt (Sprachprüfung C1)
import { VERSION_FULL } from "./version.js"; // #250: Versions-/Build-Stempel, seit 16.08.2026 direkt unter der Marke
import { PwaInstall } from "./PwaInstall.jsx"; // PWA · „Zum Startbildschirm" (Installieren-Link)
import BrandGrid from "./BrandGrid.jsx"; // #mainscreen-branding: das Zeichen — die Spalte im I und die Bildmarke
import { DISCORD_URL, DISCORD_BLURPLE, SPOTIFY_URL, SPOTIFY_GREEN } from "./links.js"; // #datenschutz: Invite jetzt geteilt (s. u.)
import { fmtNum } from "../i18n/index.js";
import { useT } from "../i18n/useLocale.js"; // #sprache: alle Texte über t()


/* Startbildschirm — Hub-Redesign (Progression-System, Design-Doc docs/progression-decisions.md).
   Das Farbsystem war aus dem Neon-Logo abgeleitet: der Verlauf Cyan → Blau → Violett → Amber lieferte
   VIER Rollen, und die vier Kachel-Kanten liefen ihn in Lesereihenfolge nach. Seit #ruhe (17.08.2026)
   sind es zwei — Cyan für die Handlung, Gold für die Währung, alles andere neutral. Die vollständige
   Begründung samt Zahlen steht am Konstanten-Block weiter unten; sie ist die Stelle, an der man beim
   Nachdrehen der Palette anfängt.

   HINWEIS: Progression-Backend (SP, Upgrades, Ranglisten-Modi) ist noch NICHT gebaut. Bonus-Leiste,
   Upgrades-Card und Ranglisten-Gabel laufen mit festen Platzhalter-Werten (mit „Vorschau"-Markierung),
   damit Layout/Feel im echten Build sichtbar sind. Nur auf Autostich_Test. */

// Discord-Einladung (Community). Als Konstante — kein Anzeigetext, gehört nicht in den i18n-Katalog.
// #datenschutz: liegt seit dem Hinweis-Overlay in ui/links.js, weil der Invite dort ein zweites Mal
// gebraucht wird (er ist der Kontaktweg). Eine URL an zwei Stellen driftet beim nächsten Wechsel.

/* #ruhe (17.08.2026) — ZWEI Farbrollen statt vier. Der Hub trug den kompletten Logo-Verlauf als
   Palette: Cyan, Blau, Violett, Gold, dazu Discord-Blurple und Grün/Rot für Seed-Meldungen. Sechs
   Farbfamilien auf einem Bildschirm, und keine davon sagte etwas — die vier Kachel-Kanten folgten in
   Lesereihenfolge dem Verlauf, unterschieden also nichts, sondern dekorierten nur. `BLUE` war dabei
   nicht einmal eine eigene Farbe, sondern der ÜBERGANGSWERT zwischen Cyan und Violett; er ist ersatzlos
   entfallen.

   Die Regel jetzt, und sie ist der ganze Umbau:
     CY   Handlung — der Knopf, der den Lauf startet. Die EINZIGE Farbe auf voller Sättigung.
     AM   Währung  — SP/DP, Bonus-Leiste, „kaufbar"-Hinweis. Alles, was ein Guthaben ist.
     RANK Angebot  — Rangliste und Tutorial. Dieselbe Familie wie CY, nur weit zurückgenommen:
                     Rangordnung über Helligkeit statt über einen fünften Farbton.
     NEU  gar nichts zu melden — die zwei Kacheln ohne Guthaben.

   Alle Werte außer CY sind um 42 % entsättigt (sRGB-Sättigungsmatrix, s = 0,58 — dieselbe Rechnung,
   die `filter: saturate()` macht). Bewusst als feste Hexwerte und NICHT als Filter am Wurzelknoten:
   ein `filter` dort erzeugt einen Stacking-Context, bricht das `backdrop-filter` der Bonus-Leiste und
   färbte ab 1280 px auch das Spielfeld-Bodenband und die Deckfarben mit ein.

   Ab 1280 px ziehen Knöpfe, Marke und Glow ohnehin ihren Ton aus dem AKTIVEN DECK (Regeln in der
   1280-px-Sektion von index.css) — dort greift von hier nichts. Diese Palette ist die Handy-Fassung. */
const CY = "#26c6e6";   // Logo links (Cyan) — Start / Lauf beginnen; einzige unangetastete Farbe
const AM = "#d6ab6b";   // Werkstatt-Kachel (war die Währungsfarbe — exp: kein SP/DP mehr, die Kante bleibt)
const NEU = "#8a8a95";  // Kachel-Kante ohne Aussage — der Rückfallton der Kanten-Familie (index.css)

/* #kachel-glyph (17.08.2026) — das Wasserzeichen in der Ecke der vier Verwaltungskacheln.
   Die Kacheln trugen bewusst KEINE Icons: vier gleich aussehende Flächen, deren einziges Farbsignal
   der Streifen links ist (#ruhe — Gold heißt Guthaben, Neutral heißt nachschlagen). Ein Icon in
   Signalstärke hätte genau diese Ordnung wieder aufgeweicht. Als **Wasserzeichen** tut es das nicht:
   bei 10 % Deckkraft ist es Textur, kein Zeichen — man sieht es beim Draufschauen, nicht beim Suchen,
   und es macht die vier Kacheln auf einen Blick unterscheidbar, ohne dass eine lauter würde.

   Deshalb auch alle vier gleich groß, gleich hell, gleiche Ecke: sobald eines heraussticht, ist es
   wieder ein Signal. Farbe und Deckkraft stehen in index.css unter `.as-hub-glyph` (EINE Stellschraube
   für alle 40 Decks); ab 1280 px ist es aus — dort sind die Kacheln Listenzeilen mit Untertitel, und
   die brauchen keine zweite Kennzeichnung.

   Strichzeichnung statt Fläche, weil eine Fläche bei 9 % zu einem Fleck verläuft: die Kontur bleibt
   auch schwach noch lesbar. Die Strichstärke skaliert bewusst MIT (kein `vector-effect`) — 1,6 von
   24 Einheiten werden auf 54 px zu rund 3,6 px. Eine hauchdünne Linie bei 9 % Deckkraft ist auf den
   helleren der 40 Spielfelder schlicht weg; die Form braucht etwas Fleisch, um leise sein zu können. */
/* Die Formen als reine DATEN, nicht als JSX. Das ist kein Stilwunsch: die i18n-Ratsche
   (`test/i18n-guards.test.js`) fischt JSX-Textknoten mit einem `>…<`-Greifer aus dem Quelltext, und
   eine Tabelle aus `<>…</>`-Fragmenten liefert ihm zwischen zwei Einträgen genau so ein Paar — der
   Schlüsselname der nächsten Zeile ging als „fest verdrahteter Anzeigetext" durch. Mit Pfaddaten
   entsteht die Stelle gar nicht erst. */
const GLYPHS = {
  // Deck-Werkstatt — vier Bausteine: Deck, Spielfeld, Effekt, Rückseite.
  workshop: { rects: [[4, 4], [13, 4], [4, 13], [13, 13]] },
  /* Bestenliste — Treppchen. Die Grundlinie ist nicht Zierrat: ohne sie sind es drei frei
     schwebende Striche, und die lesen sich bei 9 % Deckkraft als Kratzer statt als Diagramm. */
  board: { paths: ["M4.5 20.5h15", "M7 17.5V12", "M12 17.5V5", "M17 17.5V9"] },
  // Statistiken — Ring mit herausgeschnittenem Stück: die klassische Auswertung.
  stats: { paths: ["M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16", "M12 4v8h8"] },
};

/* Die Zeichen der Fuß-Chips. Wieder Pfaddaten statt JSX (s. GLYPHS), und wieder erst ab 1280 px
   sichtbar: am Handy steht die Reihe eng, dort kostet jedes Zeichen Breite, die die Wörter brauchen. */
const CHIP_PATHS = {
  // Optionen — drei Regler. Die Linien sind unterbrochen, damit die Knöpfe nicht überzeichnet werden.
  options: ["M3 6h3M11 6h10M3 12h9M17 12h4M3 18h5M14 18h7"],
  // Feedback — Sprechblase.
  feedback: ["M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"],
};
const CHIP_DOTS = { options: [[8.5, 6], [14.5, 12], [11, 18]] };

function ChipIcon({ kind }) {
  return (
    <svg className="as-chip-icon hidden dt:block" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {CHIP_PATHS[kind].map((d) => <path key={d} d={d} />)}
      {(CHIP_DOTS[kind] || []).map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.2" />)}
    </svg>
  );
}

function TileGlyph({ kind }) {
  const g = GLYPHS[kind];
  return (
    <svg className="as-hub-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {(g.paths || []).map((d) => <path key={d} d={d} />)}
      {(g.rects || []).map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="7" height="7" rx="1.6" />)}
    </svg>
  );
}

export function StartScreen({ onStart, onResume = null, resume = null, onPlaySeed = null, onSecretSeed = null, onRankedBoard = null, onOptions, onStats, onCustomize, onLeaderboard = null, onDevRun = null, onFeedback = null, onPrivacy = null, muted, onToggleMute, username = "", onEditName,
  // #desktop — Zutaten für Status-Tafel und Deck-Hintergrund. Beide erscheinen erst ab 1280 px;
  // darunter bleiben die Props ungenutzt.
  deckId = null, bfId = null, deckBack = null, lastRun = null, battlefield = null,
  musicTitle = null, onMusicNext = null, activeFx = null }) {
  const [seedInput, setSeedInput] = useState("");
  const [seedError, setSeedError] = useState(false);
  const [secretMsg, setSecretMsg] = useState("");
  const t = useT();

  /* Die gedämpften Punkte der Tagline. Der Katalogtext wird AN ihnen zerlegt, nicht um sie herum
     zusammengesetzt: enthält eine Übersetzung keinen Punkt, ergibt das genau einen Teil und rendert
     unverändert. Das ist eine Darstellungsregel und keine Annahme über den Text — die Alternative
     wären drei Katalog-Schlüssel je Sprache, und damit stünde die Interpunktion einer Marke in einer
     Datei, die Übersetzer bearbeiten. */
  const taglineParts = t("start.tagline").split(/(\.)/).filter(Boolean).map((part, i) => (
    part === "." ? <span key={i} className="as-tagline-dot">.</span> : <span key={i}>{part}</span>
  ));

  /* exp: kein Profil-Fortschritt mehr im Hub — Baum, SP, DP, Onboarding-Kette und die Ranglisten-Sperre sind
     mit der Meta-Progression gegangen. Die Rangliste ist immer offen; die Wochennummer bleibt am Knopf. */
  // #desktop — Namen für die Status-Tafel, einmal aufgelöst (beide Leser sind übersetzte Register).
  const deckName = deckId ? deckDef(deckId).name : "";
  const bfName = bfId ? battlefieldDef(bfId).name : "";
  /* Namen der ausgerüsteten Effekte. Zwei Register: Katalog-Effekte über `globalFxDef`, synthetische
     Sieg-Finisher über `fxsyn.<key>.name` (die haben bewusst keinen GLOBAL_FX-Eintrag). Aufgelöst wird
     hier und nicht in App.jsx, damit ein Sprachwechsel die Zeile neu rendert. */
  const fxNames = (activeFx || [])
    .map((f) => (f.syn ? t(`fxsyn.${f.key}.name`) : globalFxDef(f.key)?.name))
    .filter(Boolean);
  const week = currentWeek(new Date());
  const tryPlaySeed = () => {
    // Test-Code „reset" VOR parseSeed abfangen (er ginge sonst als Seed durch). onSecretSeed ist nur im
    // Preview-Build gesetzt → im Live-Spiel ist der Code wirkungslos. exp: `unlock`/`onboarding` sind weg.
    const secret = onSecretSeed && seedInput.trim().toLowerCase() === "reset" ? "reset" : null;
    if (secret) {
      setSeedError(false); setSeedInput("");
      setSecretMsg(t("start.secret.reset"));
      onSecretSeed(secret);
      return;
    }
    const s = parseSeed(seedInput);
    if (s == null) { setSeedError(true); return; }
    setSeedError(false); setSecretMsg("");
    onPlaySeed(s);
  };


  /* #kante-bündig (17.08.2026) — EINE Bahn statt drei. Bis hierher trug die BREITE die Rangordnung:
     100 % Bonus-Leiste/Start · 94 % Rangliste · 88 % Kacheln, ein Trichter, der das Auge nach unten
     führen sollte. Aufgegeben, und der Grund ist einfach: drei verschiedene Breiten heißen drei
     verschiedene linke UND rechte Kanten auf einem 358 px schmalen Bildschirm. Was als Rangordnung
     gedacht war, liest sich als schiefer Stapel — die Stufen sind mit 6 Prozentpunkten (rund 21 px,
     also gut 10 px je Seite) zu klein, um als Absicht durchzugehen, und zu groß, um nicht aufzufallen.
     Jetzt fluchten alle Blöcke auf der Kachelbreite. Rangordnung tragen weiterhin Farbe (nur der
     Start-Knopf auf voller Sättigung), Höhe und Reihenfolge — die brauchen keine Kante dafür.

     Warum ausgerechnet 88 %: Das ist die abgemessene Grenze der KACHELN, und die ist die engste im
     Stapel. Sie sind zweispaltig, jede Stufe halbiert sich also im Text; auf 375 px (iPhone SE) bricht
     ab 86 % die Überschrift „Deck workshop" um (+22 px Höhe, liest sich als Fehler). Alle anderen
     Blöcke sind einspaltig und vertragen die Breite mühelos — der Stapel richtet sich deshalb nach dem
     empfindlichsten Glied. Wer enger will, muss zuerst an den Kacheltexten arbeiten, nicht an der Zahl. */
  /* #desktop: Ab 1280 px ist das ohnehin gegenstandslos — dort steht der Stapel in einer eigenen Spalte
     und läuft auf volle Spaltenbreite. Die Konstanten bleiben getrennt benannt, damit eine spätere
     Rangordnung über Breite nicht wieder an drei Stellen einzeln erfunden werden muss. */
  const LANE_DESK = "dt:w-full dt:max-w-none";
  const LANE_LEAD = `w-[88%] max-w-sm ${LANE_DESK}`;
  const LANE_MID  = `w-[88%] max-w-sm ${LANE_DESK}`;
  const LANE_TAIL = `w-[88%] max-w-sm ${LANE_DESK}`;

  /* Sekundär-Navigation als ruhige Chip-Reihe.
     #desktop: 17 px auf 44 px Höhe — damit erfüllen die Chips oberhalb von 1280 px die Mindest-Klickzielgröße.
     #kante: Seit 17.08.2026 in der Kanten-Familie (index.css) — eckig statt Pille, dünne neutrale Kante links,
     Grund und Rahmen exakt die der neutralen Knöpfe. Vorher war ihr Grund (#20202a) heller als der neue
     Standard, dadurch stachen sie hervor, obwohl sie der leiseste Rang der Seite sind. */
  /* #ruhe Radien: `rounded-lg` → `rounded-xl`. Auf dem Bildschirm standen drei Radien nebeneinander
     (16 px CTA · 12 px Kacheln/Seed · 8 px Rangliste/Chips/Ecken) — drei Formsprachen für eine Seite.
     Alles läuft jetzt auf 12 px zusammen; einzige Ausnahme bleibt der Discord-Knopf, der als Kreis ein
     Ziel für sich ist, und der 4-px-Wochen-Chip, der dafür zu klein ist. */
  /* #premium: 17 → 15 px ab 1280 px. Die Chips waren größer gesetzt als die Unterzeilen der
     Verwaltungsliste, obwohl sie der leiseste Rang der Seite sind; die Klickzielgröße hält der
     Innenabstand, nicht die Schrift. Dazu ein Zeichen je Chip — `inline-flex`, damit es neben dem
     Wort sitzt statt darüber. */
  const chipCls = "as-hub-chip as-edge-neutral as-edge-thin dt:inline-flex dt:items-center dt:gap-2 px-3.5 py-1.5 rounded-xl text-body-lg-5 dt:text-body-lg-3 font-medium transition-all hover:-translate-y-0.5";

  // Farb-Hierarchie: nur EINE gefüllte Primär-Aktion, der Rest als Outline (weniger Farbwände, luftiger).
  // Läuft ein Run → „Fortsetzen" ist die helle Primär-Aktion, „Lauf beginnen" wird zum Cyan-Outline.
  const hasResume = !!(onResume && resume);
  /* Cyan-Primär-Optik (hell, mit kräftigem Cyan-Glow) — geteilte Quelle für „Lauf fortsetzen" UND „Normaler
     Lauf", wenn dieser (ohne laufenden Run) selbst die Primär-Aktion ist → beide glühen identisch.
     #knopf-relief (F): war eine flache Fläche (#5fe0f7 + Glow). „Zu breit" war in Wahrheit „zu flach" — ein
     358 px breites Rechteck stört, eine 358 px breite TASTE nicht. Deshalb Licht von oben: Verlauf hell→dunkel,
     eine helle Kante an der Oberseite und ein dunkler Fuß unten. Maße bleiben unangetastet, nur die Form entsteht.
     #desktop: Die Werte sind nach index.css gewandert (`.as-cta-primary` / `.as-cta-ghost`). Grund: ab 1280 px
     ziehen die Knöpfe ihre Farbe aus dem aktiven Deck, und ein inline-style ließe sich davon nicht
     überschreiben. Auf dem Handy liefern die Klassen exakt dieselben Farben wie vorher. */
  const normalCls = hasResume ? "as-cta-ghost" : "as-cta-primary";

  /* #kopf-kompakt (16.08.2026): Der Startbildschirm brauchte auf einem iPhone 14 Pro 865 px bei 664 px
     Sichtfläche — man musste scrollen, um „Lauf beginnen" überhaupt zu sehen. Der Abstand lag über NEUN
     Lücken verteilt, jede für sich unauffällig; erst die Summe tat weh. Alles hier ist gemessen (Playwright
     gegen den Preview-Build), nicht geschätzt.

     Die beiden Schrauben sind bewusst getrennt:
     - `gap` = Luft ZWISCHEN den Knöpfen. Sie ist Gestaltung und wurde auf Wunsch wieder auf 10 px erhöht.
     - `pt/pb` = Polster der SEITE zum Rand. Das ist kein Rhythmus, sondern Rest — hier wurde geholt, was
       zum scrollfreien Bildschirm fehlte (5→2/3→0/1). Wer hier wieder auflockert, verliert genau das.

     Achtung, knappe Kante: mit pt-0/pb-1 landet die Seite auf einem 390×664-Viewport bei GENAU 664 px, also
     ohne Reserve. Kommt eine Zeile dazu, scrollt sie sofort wieder — dann nicht am Polster drehen (da ist
     nichts mehr), sondern an einem Baustein. */
  return (
    /* `hub-root`: der senkrechte Rhythmus der Desktop-Fassung steht in index.css, weil er von ZWEI
       Bedingungen abhängt (Breite ≥ 1280 UND Fensterhöhe) — als Tailwind-Variante wäre das nicht lesbar. */
    <div className="hub-root relative isolate flex flex-col items-center gap-2.5 pt-0 pb-1">
      {/* Ambient-Glow hinter der Wortmarke. Verankert die ganze Kopfzone farblich, ohne laute Flächen.
          #desktop: skaliert mit, sonst bliebe er auf 1920 px ein kleiner Fleck über einer breiten Bühne.
          #logo: Die drei Ellipsen stehen seit 17.08.2026 in index.css unter `.as-wm-glow` — bis 1280 px im
          Logo-Dreiklang (Cyan · Violett · Amber), darüber in den Deckfarben, genau wie die Marke selbst.
          Als Klasse statt inline, weil ein inline-style keine Media Query kennt.
          Der weiche Auslauf (Farbe → halb → 0) plus blur(30px) löst den Glow kantenlos in den Grund auf —
          ohne die Falloff-Kurve zeichnete sich die Rechteckkante der Fläche ab. */}
      {/* #ruhe: 380 → 190 px, also genau die halbe Höhe. Der Glow färbte die obere BILDSCHIRMHÄLFTE ein
          (bis unter die Play-Gruppe) und legte damit drei Farbzonen hinter Marke, Bonus-Leiste und
          Start-Knopf. Jetzt trägt er nur noch die Marke und läuft über der Bonus-Leiste aus.
          Die Desktop-Höhe bleibt bei 620 px: dort steht die Marke in einer eigenen, viel höheren Kopfzone,
          und der Glow läuft ohnehin in Deckfarben (1280-px-Sektion) statt in dieser Palette. */}
      <div aria-hidden="true" className="as-wm-glow pointer-events-none absolute inset-x-0 top-0 h-[190px] dt:h-[620px] -z-10"
        style={{ filter: "blur(30px)" }} />

      {/* Ecken-Buttons als konsistentes Paar: Schnell-Mute oben LINKS, Glossar (Info) oben RECHTS — beide
          gleich gestylte dunkle Rounded-Pills, mit Rahmen-Inset (top-2 / left-2·right-2) statt in die Ecke gedrängt.
          Der Info-Button überschreibt den Kreis-Default (gloss-i-btn) auf denselben Pill-Look wie Mute. */}
      {/* #desktop — Deck-Hintergrund als BODENBAND (erst ab 1280 px).
          Bewusst kein Vollbild: die 40 Spielfelder sind 1600 × 640, also 2,5 : 1 — genau die Proportion
          dieses Fensters. Sie passen ohne Beschnitt hinein und werden nur 1,2× hochskaliert. Ein Vollbild
          bräuchte 1,69× und schnitte 29 % der Breite ab; nachgemessen im Entwurfsdokument, und genau
          deshalb bleiben die Bestandsbilder unangetastet.
          Oben ausgeblendet (Maske) → die Kopfzone bleibt dunkel, die Wortmarke steht frei. Darüber ein nach
          unten dichter werdender Schleier: er bringt 40 unterschiedlich helle Spielfelder gemeinsam unter
          die Kontrastforderung und ist die eine Stellschraube, falls ein Deck zu laut wird.
          `fixed` statt `absolute`: der Startbildschirm sitzt in einem auf 1520 px gedeckelten Container —
          absolut positioniert wäre das Band genauso breit und läge als Rechteck mitten im Bild statt als
          Hintergrund. Ein Hintergrund muss randlos laufen, und scrollen tut hier nichts. */}
      {/* #deck-mobil — Deck-Hintergrund am HANDY (das Gegenstück zum Bodenband darunter, das erst ab 1280 px
          erscheint). Beide sind bewusst getrennte Ebenen und keine gemeinsame mit Media-Query: sie zeigen
          verschiedene BILDER (`mobile` gegen `desktop`), haben verschiedene Zuschnitte und verschiedene
          Verschleierungen. Eine Ebene mit drei Weichen wäre kürzer und in einem halben Jahr unlesbar.

          `battlefield.mobile` gibt es für alle 40 Spielfelder und ist bereits im Bundle — die Datei war
          nur nirgends im Hub gelesen worden, der Desktop-Pass nahm ausschließlich `.desktop`. Es kommt
          also KEIN Byte dazu.

          Zuschnitt, Position und Schleier stehen in index.css unter `.as-hub-bg*`; dort steht auch, warum
          der Ausschnitt bei 20 % und nicht mittig sitzt. */}
      {battlefield && (
        <div aria-hidden="true" className="as-hub-bg dt:hidden pointer-events-none fixed inset-0">
          <div className="as-hub-bg-img absolute inset-0"
            style={{ backgroundImage: `url(${battlefield.mobile})` }} />
          {/* `--vk` skaliert die Schleier-Deckkraft. Standard 1; nur die zwei gemessenen Ausreisser
              bekommen mehr (Liste + Begruendung in cosmeticAssets.js). */}
          <div className="as-hub-bg-veil absolute inset-0" style={{ "--vk": battlefieldVeil(bfId) }} />
        </div>
      )}

      {battlefield && (
        <div aria-hidden="true" className="hidden dt:block pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[768px]">
          {/* #bf-desktop: `--bfdim` dämpft die gemessenen Ausreißer. Anders als am Handy wird hier das
              BILD gedämpft und nicht der Schleier verstärkt — der endet schon bei 82 %, ein Faktor
              darüber klemmt ihn auf deckend und löscht die untere Bildhälfte. Liste + Messung in
              cosmeticAssets.js. */}
          <img src={battlefield.desktop} alt="" draggable="false"
            className="as-bf-dim absolute inset-0 w-full h-full object-cover select-none"
            style={{ "--bfdim": battlefieldDim(bfId, "hub"), WebkitMaskImage: "linear-gradient(180deg,transparent 0%,#000 30%)", maskImage: "linear-gradient(180deg,transparent 0%,#000 30%)" }} />
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(180deg,rgba(20,20,25,0) 0%,rgba(17,17,22,.55) 45%,rgba(17,17,22,.82) 100%)" }} />
        </div>
      )}

      {/* #desktop: die beiden Ecken lösen sich vom 384-px-Stapel und rücken an die Kante der breiten Bühne.
          #ecke: Ab 1280 px ist dieser Knopf ausgeblendet (`as-mute-hub`) — dort trägt ihn das globale
          Ecken-Paar, das in JEDEM Menü an derselben Stelle steht (CornerTools.jsx). Zwei Mute-Knöpfe
          nebeneinander wären zwei Fassungen derselben Handlung. Unterhalb 1280 px bleibt er, wie er war. */}
      {onToggleMute && <MuteButton muted={muted} onToggle={onToggleMute} className="as-mute-hub rounded-xl absolute top-2 left-2 dt:top-0 dt:left-0" />}
      {/* #kante: Der Glossar-Knopf ist ein Angebot, kein Ziel — leise violette Kante (die Textfarbe trägt
          die Klasse nicht, die kommt weiter von hier).
          #desktop: Ab 1280 px steht er nicht mehr in der oberen Ecke, sondern unten im Fußband hinter dem
          Discord-Zeichen (zweite Instanz weiter unten). Ausgeblendet wird hier nur der KNOPF — `className`
          reicht die Komponente allein an ihn durch, das Overlay hängt daran nicht. Ein über den Bruchpunkt
          gezogenes Fenster lässt ein offenes Glossar deshalb offen, statt es wegzureißen.
          Die desktop-seitige Positionierung ist entfallen: Oberhalb des Bruchpunkts gibt es diesen Knopf
          nicht mehr, da braucht auch nichts mehr an die Kante zu rücken. */}
      <GlossaryPanel className="as-edge as-edge-thin as-gloss-corner absolute top-2 right-2"
        style={{ width: "auto", height: "auto", borderRadius: "0.75rem", padding: "0.375rem 0.75rem",
          "--c": "#8a7de0", color: "#b3a8ff",
          fontFamily: "inherit", fontStyle: "normal", fontWeight: 600, fontSize: "0.9rem", lineHeight: 1 }} />

      {/* #desktop — ab hier das Spaltenpaar: links spielen, rechts der Stand. Unterhalb von 1280 px sind
          `hub-pair`/`hub-play`/`hub-stand` per `display: contents` reine Klammern ohne eigene Box, die
          Flex-Spalte darüber ordnet also weiterhin alle Bausteine direkt — Handy-Reihenfolge unverändert. */}
      <div className="hub-pair">
      <div className="hub-play">
      {/* #logo — Wortmarke als Text (Orbitron) statt logo-wordmark.png: das PNG hatte eine feste Palette und
          stand damit quer zu jeder Deckfarbe, seit der Desktop-Pass den Hub aus dem aktiven Deck einfärbt.
          Look, Größe und Verlauf stehen in index.css unter `.as-wordmark`. Der Text kommt weiter aus dem
          i18n-Katalog — der Key hieß zu PNG-Zeiten „alt", trägt jetzt die sichtbare Marke. Die ist
          SPRACHABHÄNGIG: „AUTOSTICH" auf Deutsch, „AUTOTRICK" auf Englisch (der deutsche Name trägt
          „Stich" sichtbar, englisch läse sich dasselbe Wort als Nähbegriff „stitch"). Deshalb steht der
          Schlüssel NICHT mehr in der SAME_OK-Liste der i18n-Guards — dort stehen nur Texte, die in
          beiden Sprachen gleich lauten dürfen. */}
      {/* #mainscreen-branding C6 — DAS I IST WIEDER EIN BUCHSTABE. Owner-Entscheidung vom 26.08.2026:
          die Zellen-Spalte im I entfällt, in jeder Sprache.

          DER GRUND IST SPRACHLICH UND NICHT OPTISCH, und er wiegt schwerer als das Aussehen: die
          Fassung hing daran, dass „AUTOSTICH" und „AUTOTRICK" das I an derselben Stelle tragen. Eine
          dritte Sprache muss das nicht — spanisch hätte an dieser Stelle womöglich gar kein I —, und
          dann trüge die Marke ihr Zeichen in einer Sprache und in der anderen nicht. Der Owner will
          sie in allen gleich.

          WAS BLEIBT: das 5 × 8 Zeichen unter der Tagline. Es ersetzt keinen Buchstaben und hängt
          deshalb an keiner Sprache — der Entwurf führt es ohnehin getrennt als eigenständige
          Bildmarke (App-Icon, Favicon, Avatar, Ladebild).

          Der Schriftzug ist damit wieder EIN Textknoten, derselbe wie vor C2, und die Marke im
          Run-Kopf und im Namens-Dialog war es ohnehin immer. */}
      <h1 className="as-wordmark select-none">{t("start.logo.alt")}</h1>
      {/* #mainscreen-branding — Tagline und Bildmarke, zusammen mit der Wortmarke EIN Lockup.
          Erst ab 1280 px (`hidden dt:flex`), also gar nicht im Handy-Layout — Q5. Deshalb auch KEIN
          Umschließen der Wortmarke: `.hub-play` ist unter 1280 px `display: contents`, ein Wrapper
          um alle drei würde dort zu einer echten Box und die Handy-Reihenfolge verschieben.
          Gemessen (C1-F13): die Kopfzone wird zentriert, indem die SPALTE zentriert wird — von ihren
          fünf Kindern bewegt das genau eines, die Wortmarke, und die vier darunter laufen ohnehin
          auf volle Spaltenbreite. */}
      <div className="as-lockup hidden dt:flex flex-col items-center self-stretch">
        {/* Die Tagline PICKT EINE ROLLE und führt keine Größe ein (conventions.md §2b). Der Entwurf
            nennt 15 px; `text-body-lg` ist 15,5 — die nächste Sprosse liegt einen halben Pixel
            daneben, eine neue Rolle wäre dafür nicht zu rechtfertigen (C1-F11).
            Die Punkte zwischen den Wörtern sind gedämpft: das trennt die drei Verben sichtbar,
            ohne sie mit Trennzeichen auseinanderzuziehen, die niemand vorliest. */}
        <p className="as-tagline text-body-lg">{taglineParts}</p>
        <BrandGrid cut="full" className="as-brandmark" />
      </div>
      {/* #kopf: Der Versions-/Build-Stempel ist von HIER (unter der Marke) in den Fuß gewandert — unter die
          „angemeldet als"-Zeile. Das gibt der Wortmarke die Zeile darunter frei → größere Marke am Handy
          (index.css `.hub-play .as-wordmark`), und der Stempel steht dort, wo die übrigen Fuß-/Meta-Infos sitzen. */}

      {/* exp: die Fortschritts-/Bonus-Leiste (Onboarding-Kette, SP-Treue-Drip) ist mit der Meta-Progression gegangen. */}

      {/* Play-Gruppe — Fortsetzen + Lauf beginnen + das Seed-Feld. */}
      <div className={`${LANE_LEAD} flex flex-col gap-2.5`}>
        {/* Resume (#Auto-Save): gespeicherter laufender Run → einzige gefüllte Primär-Aktion (hell). */}
        {onResume && resume && (
          <button onClick={onResume}
            className="as-cta-primary as-hub-resume w-full px-5 py-3 rounded-xl ty-title transition-all hover:-translate-y-0.5 flex flex-col items-center leading-tight">
            <span className="text-title-4 dt:text-head-2">{t("start.resume")}</span>
            {/* `as-cta-sub`: die Zweitzeile klebte am Titel (`leading-tight` ohne Abstand dazwischen).
                Luft und Fußpolster stehen ab 1280 px in index.css — beides zusammen, sonst rutscht die
                Zeile nur von oben weg und dafür an den unteren Rahmen. */}
            <span className="as-cta-sub ty-num-sm text-meta-3 dt:text-body-lg-1 opacity-80">
              {t("start.resume.sub", {
                cycle: Math.min((resume.cycle || 0) + 1, resume.totalCycles),
                total: resume.totalCycles,
                score: fmtNum(Math.round(resume.score || 0)),
              })}
            </span>
          </button>
        )}

        {/* #382 „Lauf beginnen" startet direkt (kein Aufklapper mehr). Gefüllt ohne Resume (= Held), sonst Cyan-Outline.
            Volle Breite: der Knopf ist die oberste Stufe des Breiten-Trichters (LANE_LEAD, s. o.) — die Rangordnung
            trägt jetzt die Breite der BLÖCKE, der Knopf selbst muss dafür nichts abgeben.
            Das Relief (#knopf-relief) nimmt ihm das Flächenhafte, ohne dass etwas daneben stehen muss. */}
        <button onClick={onStart}
          className={`${normalCls} as-hub-start relative w-full px-5 py-3.5 rounded-xl ty-title text-title-1 dt:text-head-2 transition-all hover:-translate-y-0.5 flex items-center justify-center`}>
          {t("start.normal")}
          {/* #premium: Der Knopf sagt jetzt auch in der Form, dass es weitergeht. Absolut am rechten Rand
              und nicht als Flex-Kind, damit das Label mittig bleibt — mit dem Zeichen im Fluss säße es
              um die halbe Zeichenbreite nach links versetzt. Erst ab 1280 px: am Handy ist der Knopf
              schmaler und die Zeile dort ohnehin randvoll. */}
          <svg className="as-cta-chev hidden dt:block" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
        {/* #382 Seed-Zeile dauerhaft unter „Lauf beginnen": Seed einfügen + „↻ Spielen" (inkl. Test-Code-Pfad
            tryPlaySeed). Zwischenzeitlich hing sie an einem Satelliten-Knopf neben dem CTA — zurückgebaut: der
            Seed gehört unter den Knopf, zu dem er die Variante ist, nicht daneben. Radius eine Stufe unter dem
            CTA (xl statt 2xl), damit die Zeile sichtbar zweite Geige spielt. */}
        {onPlaySeed && (
          <div>
            <form onSubmit={(e) => { e.preventDefault(); tryPlaySeed(); }} className="flex items-center gap-2">
              <input
                value={seedInput}
                onChange={(e) => { setSeedInput(e.target.value); if (seedError) setSeedError(false); }}
                placeholder={t("start.seed.placeholder")}
                aria-label={t("start.seed.aria")}
                /* #deck-mobil: Fläche, Rahmen und Textfarbe kommen aus `.as-hub-field` statt aus einem
                   inline-style — am Handy ist das Feld seit dem Deck-Hintergrund getöntes Glas, und ein
                   inline gesetzter Grund ließe sich davon nicht überschreiben (inline schlägt jedes
                   Stylesheet). Der Fehlerzustand bleibt eine Klasse, damit dasselbe für ihn gilt. */
                className={`as-hub-field ${seedError ? "is-err" : ""} flex-1 min-w-0 px-3 py-2 rounded-xl font-mono text-body-lg-5 dt:text-title-2`}
              />
              {/* Fläche und Rahmen kommen aus `.as-seed-play` statt aus einem inline-style — sonst ließe sich
                  der Rahmen ab 1280 px nicht durch den Hover-Schein ersetzen (inline schlägt jedes Stylesheet). */}
              <button type="submit" disabled={!seedInput.trim()}
                className="as-seed-play shrink-0 px-3.5 py-2 rounded-xl text-body-lg-5 dt:text-title-2 font-medium transition-all disabled:opacity-40">
                {t("start.seed.play")}
              </button>
            </form>
            {seedError && <div className="text-body-5 mt-1" style={{ color: "#e06a6a" }}>{t("start.seed.error")}</div>}
            {secretMsg && <div className="text-body-5 mt-1" style={{ color: "#6ad39f" }}>{secretMsg}</div>}
          </div>
        )}
      </div>

      {/* #370 Ranglisten-Gruppe — EIN Wochen-Ranked-Modus: fixe faire Baseline, alle spielen den Wochen-Seed.
          exp: immer offen (kein Baum, keine Sperre) — der Pokal steht fest. */}
      {onRankedBoard && (
        <div className={`${LANE_MID} flex flex-col gap-2.5`}>
          <button onClick={onRankedBoard}
            className="as-ranked-btn relative w-full px-5 py-2.5 rounded-xl ty-title text-body-lg-3 dt:text-title-3 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            title={t("start.ranked.open")}>
            <span className="flex items-center gap-2">
              <RankIcon free />
              {t("start.ranked")}
            </span>
            {/* #370 Wochen-Ecke: Nummer der laufenden Woche, darunter der offene Wochenbonus.
                - `inset-y-0 justify-center` statt `top-1.5`: der Block ist jetzt zweizeilig und soll mittig zum
                  Knopf-Label stehen. Absolut positioniert → er kann den Knopf nicht höher machen.
                - Ist der Bonus geholt, verschwindet die Zeile ersatzlos (kein „1/1"): eine Belohnung, die es diese
                  Woche nicht mehr gibt, soll nicht weiter Platz und Aufmerksamkeit binden.

                #ruhe: Der Chip lief unter dem CRT-Skin in Press Start 2P und war damit die EINZIGE Stelle des
                Hubs in einer dritten Schrift — neben Mono (überall) und Orbitron (Marke). Der Preis dafür stand
                als Sonderbehandlung direkt daneben: die `.ty-display`-Regel bringt einen Neon-Glow mit, der die
                dünnen Striche bis zur Unlesbarkeit überstrahlte, also musste hier ein `textShadow: "none"`
                dagegenhalten; und die Bonus-Zeile darunter durfte den Font gar nicht erst tragen, weil Press
                Start 2P doppelt so breit baut und in die Knopfmitte geragt wäre. Beide Sonderfälle sind mit dem
                Font entfallen. 9 → 10 px, weil die System-Mono auf 9 px kleiner baut als der Pixel-Font.
                Ab 1280 px stand hier ohnehin schon Orbitron (`.as-week-chip`, s. u.). */}
            <span className="absolute inset-y-0 right-2 dt:right-4 flex flex-col justify-center items-end gap-0.5 pointer-events-none"
              aria-label={t("start.ranked.badge.aria", { n: week.week })}>
              {/* #desktop: Ab 1280 px trägt der Chip Orbitron im Deckton (`.as-week-chip` in index.css) — er war
                  die letzte Stelle am Knopf, die das aktive Deck nicht mitgenommen hat. Orbitron ist im Spiel
                  sonst der Wortmarke und den Kartenzahlen vorbehalten; hier steht eine Zahl, insofern dieselbe
                  Rolle. Darunter läuft er seit #ruhe in der System-Mono wie der ganze Rest des Hubs. */}
              <span className="as-week-chip ty-num-sm px-1 rounded text-meta-1 dt:text-body-1 leading-tight">
                {t("start.ranked.badge", { n: week.week })}
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Variante C — Verwaltungszone als ruhiges, einheitliches 2×2-Kachel-Grid (Werkstatt · Upgrades ·
          Bestenliste · Statistik). Statt vieler unterschiedlich lauter Blöcke: gleich große Kacheln, deren
          EINZIGES Farbsignal ein dünner Stripe an der linken Kachel-Seite ist.
          #ruhe: Die vier Stripes folgten in Lesereihenfolge (TL→TR→BL→BR) dem Logo-Verlauf CY → BLUE → VI → AM.
          Vier Farben an vier gleich aussehenden Kacheln, und keine davon sagte etwas — das Auge sucht dort eine
          Bedeutung und findet keine. Jetzt trägt die Kante genau EINE Aussage: Gold heißt „hier liegt ein
          Guthaben" (Upgrades = SP, Werkstatt = DP), Neutral heißt „hier gibt es nichts zu holen, nur
          nachzuschlagen" (Bestenliste, Statistiken). Währungs-Zahlen (DP/SP) bleiben im Gold der Währung,
          unabhängig vom dekorativen Stripe. Gesperrt (Onboarding < 6/6): Kachel gedimmt + Countdown-Badge
          statt Kennzahl.
          #kachel-glyph: Hier stand „Keine Icons". Seit 17.08.2026 trägt jede Kachel doch eines — aber als
          WASSERZEICHEN bei 9 % Deckkraft (`TileGlyph`, Begründung dort). Der Satz galt einem Icon in
          Signalstärke; ein Zeichen, das die Streifen-Ordnung nicht anfasst, widerspricht ihm nicht. */}
      {/* #desktop — Ende der Spiel-Spalte, Anfang der Stand-Spalte. */}
      </div>
      <div className="hub-stand">

      {/* #desktop — Status-Tafel. Erst ab 1280 px sichtbar (`hidden dt:flex`), auf dem Handy also
          gar nicht im Layout. Sie beantwortet, was man vor dem Start wissen will: welches Deck aktiv ist,
          wie die Guthaben stehen, was die Woche noch hergibt und wie der letzte Lauf lief. Alle Werte
          stammen aus bereits vorhandenen Quellen — nichts davon wird hier neu berechnet. */}
      {/* #mainscreen-branding C3 — DIE TAFEL BEKOMMT EINEN EIGENEN KLASSENHAKEN. Sie hatte keinen:
          C1 musste sie als „das ring-tragende Kind von `.hub-stand`, das nicht die Kachelbank ist"
          greifen, weil ZWEI Kinder `.as-ring` tragen (C1-F10). Ein Screen, den nur eine Negation
          erreicht, ist ein Screen, den der nächste Wächter falsch trifft. */}
      <div className="as-deck hidden dt:flex as-glass as-ring flex-col gap-[18px] rounded-2xl">
        <i className="as-ring-run" aria-hidden="true" />
        <div className="ty-screen-title text-meta-3 opacity-45">
          {t("start.board.title")}
        </div>
        <div className="as-deck-row flex items-center gap-4">
          {/* 96 → 112 px (Mockup-Abnahme 18.08.2026), und ab #mainscreen-branding C3 keine feste Zahl
              mehr: das Bild ist so groß, wie die Seite es trägt, und erreicht die Entwurfsgröße
              196 × 268 ab 1600 px (Owner-Entscheidung Q10, Option A). Die Formel steht in index.css
              unter `.as-deck-art` — sie ist gemessen und nicht geraten, und der Nachweis rechnet sie
              an fünf Viewports nach.
              Rahmen und Schatten sind von hier in die Regel gewandert: der Rahmen war eines der vier
              durchscheinenden Inline-Alphas, die dieser Screen mitbringt, und ein Inline-Literal ist
              von keiner Regel außer `!important` erreichbar. Umgewandelt statt kopiert. */}
          {deckBack && (
            <img src={deckBack} alt="" draggable="false" className="as-deck-art rounded-lg select-none" />
          )}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="ty-title text-head-2 truncate">{deckName}</div>
            {/* #mainscreen-branding C3 — DIE ATTRIBUT-CHIPZEILE. Spielfeld, Effekte und Musik standen
            hier als drei stille Textzeilen untereinander. Als umbrechende Chipzeile sagen dieselben
            drei dasselbe in einer Zeile: WAS gerade eingestellt ist.

            SIE BLEIBT NEBEN DEM BILD, und das ist gemessen. Der Entwurf stapelt die drei UNTER das
            gerahmte Feld. Als eigene Zeile unter beiden gebaut und nachgemessen kostet das 39 px an
            allen drei kleinen Viewports — und die rechte Spalte hat bei 1280 × 720 sieben (C1-F03).
            Neben dem Bild kostet sie nichts: die Tafel ist so hoch wie das Höhere von Bild und
            Namensspalte, und die drei Chips passen in die Spalte, die vorher drei Zeilen trug. Der
            Vertrag sagt ohnehin „die VORHANDENEN Spielfeld- und FX-Zeilen ALS Chipzeile" — umgestellt,
            nicht umgezogen. Die Abweichung vom Entwurf steht mit ihrer Zahl im Nachweis.

            DIE TEXTE SIND DIESELBEN. `start.board.field` und `start.board.fx` tragen ihre Beschriftung
            schon im String („Spielfeld · {name}"), also braucht diese Zeile keinen einzigen neuen
            Katalog-Schlüssel — sie ist eine Umstellung der Darstellung und keine neue Aussage. Genau
            das meint der Vertrag mit „die VORHANDENEN Spielfeld- und FX-Zeilen als Chipzeile".

            DER CHIP-LOOK IST AUCH NICHT NEU: Rahmen, Fläche, Radius und Polster sind die des
            Musik-Kastens, der hier seit dem Musik-Pass steht. Sie sind dabei von einem Inline-Style in
            eine Regel gewandert — der Rahmen ist eines der vier durchscheinenden Inline-Alphas dieses
            Screens (.22), und ein Inline-Literal ist von keiner Regel außer `!important` erreichbar.
            Umgewandelt statt dreimal kopiert.

            WAS FEHLT, FEHLT WEITER. Ohne aktive Effekte entfällt der Effekt-Chip; gehört das Spielfeld
            zum Deck, entfällt der Spielfeld-Chip. „Effekte · —" wäre ein Chip, der nichts sagt. */}
        <div className="as-deck-attrs flex flex-wrap items-center gap-2">
          {/* Die Spielfeld-Zeile erscheint NUR, wenn das Spielfeld nicht zum Deck gehört. Der Registername
              eines Spielfelds ist der Deckname plus Suffix („Biolumen · Battlefield") — im Normalfall stand
              hier also „Battlefield · Biolumen · Battlefield", dreimal dasselbe Wort für null Information.
              Sind Deck und Feld in der Werkstatt gemischt worden, sagt die Zeile dagegen etwas. */}
          {bfName && !bfName.startsWith(deckName) && (
            <span className="as-deck-attr min-w-0" title={bfName}>
              <span className="truncate">{t("start.board.field", { name: bfName })}</span>
            </span>
          )}
          {/* Ausgerüstete Effekte. Ohne aktive Effekte entfällt der Chip. */}
          {fxNames.length > 0 && (
            <span className="as-deck-attr min-w-0" title={fxNames.join(" + ")}>
              <span className="truncate">{t("start.board.fx", { list: fxNames.join(" + ") })}</span>
            </span>
          )}
          {/* #musik — Was gerade läuft, plus Weiterschalten. Steht in derselben Zeile wie Spielfeld und
              Effekte, weil die Musik zum „Stand" gehört wie beide: alles, was der Screen gerade IST.
              Der Knopf bleibt IM Chip — als gestreckte Zeile stand er am Panelrand und las sich wie ein
              eigenes Element neben dem Titel. */}
          <span className="as-deck-attr as-deck-attr-music min-w-0" title={musicTitle || undefined}>
            {/* Wiedergabe-Dreieck statt der Note: die Zeile sagt, was gerade LÄUFT — ein Zustand,
                kein Genre. Als Vektor, damit es dieselbe Strichfamilie hat wie die Zeichen daneben. */}
            <svg className="w-[11px] h-[11px] shrink-0 opacity-45" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="truncate max-w-[260px]">{musicTitle || "—"}</span>
            {onMusicNext && (
              <button onClick={onMusicNext} aria-label={t("music.next")}
                title={musicTitle ? t("music.playing", { title: musicTitle }) : t("music.next")}
                className="as-deck-attr-next shrink-0 rounded leading-none transition-all hover:opacity-100">
                ⏭
              </button>
            )}
          </span>
            </div>
          </div>
        </div>

        {/* Vier Kennzahlen. Die Farben bleiben hier bewusst die BEDEUTUNGS-Farben (Gold = Währung,
            Violett = Rangliste, Cyan = Lauf) — die Tafel ist der Ort, an dem gelesen und nicht navigiert
            wird, und die Deckfarbe trägt hier ohnehin schon Rahmen, Schimmer und Kartenbild. */}
        {/* #premium: Die Fugen waren keine Linien, sondern eine durchscheinende FLÄCHE zwischen vier
            Boxen — `gap-px` legte den Container-Grund in dem einen Pixel frei. Bei vier gleich hellen
            Zellen liest sich das als Raster statt als Trennung. Jetzt eine echte Haarlinie je Zelle
            (`as-kpi`), und der Container trägt nur noch seinen Rahmen. */}
        {/* #mainscreen-branding C3 — DIE KENNZAHLEN TRETEN ZURÜCK. Sie standen als eigener gerahmter
            Kasten mit vier gefüllten Zellen in der Tafel — vier Flächen in einer Fläche, und damit
            optisch schwerer als das Deck darüber, das der GEGENSTAND der Tafel ist. Der Entwurf sagt
            es in einem Halbsatz: „darunter, durch eine Linie getrennt: die vier Kennzahlen."
            Also: keine Füllung je Zelle, kein Rahmen um die vier, stattdessen EINE Linie darüber. Die
            Haarlinien zwischen den Zellen bleiben — sie trennen vier Werte, sie rahmen nichts ein.
            WERTGLEICH umgestellt: die Linie trägt denselben Ton, den der Rahmen trug; sie steht nur
            an einer Kante statt an vieren. Ein Schritt aus dem Vokabular wird sie in C4. */}
        {/* exp: von den vier Kennzahlen bleibt der letzte Lauf — SP, DP und der Wochenbonus sind Meta-Progression. */}
        <div className="as-kpis grid grid-cols-1">
          {[
            { k: t("start.board.last"), v: lastRun ? fmtNum(Math.round(lastRun.score || 0)) : t("start.board.last.none"),
              c: CY, s: lastRun ? t("start.board.last.sub", { cycle: lastRun.cycles ?? 0 }) : t("start.board.last.none.sub") },
          ].map((s, i) => (
            <div key={i} className="as-kpi flex flex-col gap-0.5">
              <span className="text-body-1 font-medium opacity-45">{s.k}</span>
              {/* #kpi-passt: die ZEICHENZAHL ist alles, was die Regel braucht — `ty-num` ist Geist Mono,
                  jedes Zeichen also gleich breit (gemessener Vorschub 0,59 × Schriftgrad, Ziffern wie
                  Trennzeichen). Damit rechnet index.css die Größe selbst aus, ohne dass hier gemessen
                  oder eine Schwelle geraten werden müsste. Nur bei einem Wert, der ohnehin passt,
                  ändert sich nichts. */}
              <span className="ty-num as-kpi-v text-figure-1 leading-none"
                style={{ color: s.c, "--kpi-n": String(s.v ?? "").length }}>{s.v}</span>
              <span className="text-meta-3 opacity-40">{s.s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${LANE_TAIL} as-hub-list as-glass as-ring grid grid-cols-2 gap-2.5 dt:grid-cols-1 dt:gap-0`}>
        <i className="as-ring-run" aria-hidden="true" />
        {/* Kachel-Basis: gleiche Höhe (justify-between), Stripe links absolut, keine Icons.
            #desktop: dieselben vier Ziele werden zur Liste — flex-row statt flex-col, kein eigener Rahmen
            je Kachel (Glas + Ring sitzen am Container), dafür ein Trenner (CSS `.as-hub-list`). Die Fläche
            kommt aus der Klasse `as-hub-tile` statt aus einem inline-style, sonst ließe sie sich oberhalb
            von 1280 px nicht auf Glas umstellen. */}
        {(() => { const tileCls = "as-hub-tile relative overflow-hidden rounded-xl text-left p-3 pl-4 min-h-[76px] flex flex-col justify-between transition-all hover:-translate-y-0.5"
            + " dt:flex-row dt:items-center dt:gap-3 dt:min-h-0 dt:hover:translate-y-0";
          /* #kante: Aus dem 3-px-Streifen wird die Kante der Kanten-Familie — 4 px plus der kurze Farbanlauf
             nach rechts, den auch Auswahlkarten und Knöpfe tragen. Bleibt ein absolut liegendes Overlay über
             der ganzen Kachel (nicht deren border-left), weil die Kachel ab 1280 px zur randlosen Listenzeile
             wird und ihren eigenen Rahmen verliert; so überlebt das Farbsignal beide Fassungen unverändert.
             Klickdurchlässig, damit die Kachel darunter der Knopf bleibt. */
          const Stripe = ({ c, dim }) => (<span aria-hidden="true"
            className="as-hub-stripe absolute inset-y-0 left-0 right-0 rounded-xl pointer-events-none"
            style={{ borderLeft: `4px solid ${c}`,
                     background: `linear-gradient(90deg, color-mix(in srgb, ${c} 14%, transparent) 0%, transparent 42%)`,
                     opacity: dim ? 0.45 : 1 }} />);
          const head = (t) => (<b className="ty-title text-body-lg-1 dt:text-title-3">{t}</b>);
          const arrow = <span className="text-body-3 opacity-35 dt:hidden">›</span>;
          // Nur Desktop: Untertitel je Eintrag + der Pfeil ganz rechts. `hidden` hält beide aus dem Handy-Flex heraus.
          const sub = (s) => (<span className="hidden dt:block text-body-3 opacity-50 font-normal">{s}</span>);
          const arrowDesk = <span className="hidden dt:block text-title-4 opacity-35">›</span>;
          const headBox = "flex items-center justify-between gap-1 dt:flex-1 dt:flex-col dt:items-start dt:gap-0.5";
          return (<>
            {/* exp: die Upgrades-Kachel ist mit dem Baum gegangen; die Werkstatt ist immer offen und zeigt kein Guthaben. */}
            {/* 1 · Deck-Werkstatt — Stripe AM (die alte Währungskante bleibt als Farbsignal der Kachel). */}
            {onCustomize && (
              <button onClick={onCustomize} className={tileCls} title={t("start.tile.workshop")}>
                <Stripe c={AM} /><TileGlyph kind="workshop" />
                <div className={headBox}>{head(t("start.tile.workshop"))}{arrow}{sub(t("start.tile.workshop.sub"))}</div>
                <span className="text-body-1 dt:hidden opacity-50">{t("start.tile.workshop.sub")}</span>
                {arrowDesk}
              </button>
            )}

            {/* 3 · Bestenliste — Stripe NEU: kein Guthaben, nur nachschlagen. */}
            {onLeaderboard && (
              <button onClick={onLeaderboard} className={tileCls} title={t("start.tile.leaderboard")}>
                <Stripe c={NEU} /><TileGlyph kind="board" />
                <div className={headBox}>{head(t("start.tile.leaderboard"))}{arrow}{sub(t("start.tile.leaderboard.sub"))}</div>
                <span className="text-body-1 dt:hidden opacity-50">{t("start.tile.leaderboard.sub")}</span>
                {arrowDesk}
              </button>
            )}

            {/* 4 · Statistiken — Stripe NEU: kein Guthaben, nur nachschlagen. */}
            {onStats && (
              <button onClick={onStats} className={tileCls} title={t("start.tile.stats")}>
                <Stripe c={NEU} /><TileGlyph kind="stats" />
                <div className={headBox}>{head(t("start.tile.stats"))}{arrow}{sub(t("start.tile.stats.sub"))}</div>
                <span className="text-body-1 dt:hidden opacity-50">{t("start.tile.stats.sub")}</span>
                {arrowDesk}
              </button>
            )}
          </>); })()}
      </div>
      {/* #desktop — Ende der Stand-Spalte und damit des Spaltenpaars. */}
      </div>
      </div>

      {/* #desktop — Chips und Fußlinks laufen ab 1280 px als EIN Band über die volle Breite zusammen
          (Chips links, Nachschlage-Links rechts). Darunter bleiben es zwei gestapelte Blöcke wie bisher. */}
      <div className="hub-foot">

      {/* Optionen + Dev-Run — zwei ruhige Chips unter dem Grid (kein eigener Grid-Platz nötig). exp: der Tutorial-Chip
          ist mit dem Onboarding gegangen; an seiner Stelle steht der Dev-Run (frei konfigurierbarer Testlauf), ohne
          eigenes Zeichen — die Chip-Zeichen erscheinen ohnehin erst ab 1280 px, und ein neues Glyph ist eine
          Owner-Entscheidung (House rules).
          Feedback bekommt eine EIGENE Zeile darunter: die beiden oberen Chips führen ins Spiel, der
          Melder führt heraus. Nebeneinander lasen sich alle drei wie eine Reihe gleichrangiger Knöpfe. */}
      <div className="grid gap-2 justify-items-center dt:grid-flow-col dt:justify-items-start dt:gap-3">
        <div className="flex items-center gap-2 dt:gap-3">
          {onOptions && (
            <button onClick={onOptions} aria-label={t("start.options")} className={chipCls}><ChipIcon kind="options" />{t("start.options")}</button>
          )}
          {onDevRun && (
            <button onClick={onDevRun} aria-label={t("start.devrun")} className={chipCls}>{t("start.devrun")}</button>
          )}
        </div>
        {/* #396 Feedback-Melder — bewusst „Feedback" und nicht „Bug melden": sonst kommen nur Bugs
            und keine Ideen. Nur hier im Menü, nie im Lauf. Daneben das Discord-Icon (Community-Invite). */}
        <div className="flex items-center gap-2">
          {onFeedback && (
            <button onClick={onFeedback} aria-label={t("start.feedback")} className={chipCls}><ChipIcon kind="feedback" />{t("start.feedback")}</button>
          )}
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
            aria-label={t("start.discord")} title={t("start.discord")}
            /* #kante: Der Discord-Knopf bleibt rund und behält sein Blurple — er trägt ein Logo, keinen Text,
               und ist damit kein Chip in der Reihe, sondern ein Ziel für sich. */
            className="as-edge-neutral p-2 rounded-full transition-all hover:-translate-y-0.5 inline-flex items-center justify-center"
            style={{ color: DISCORD_BLURPLE, borderLeftColor: "rgba(150,150,170,.18)" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.42c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.086-2.157-2.42c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.419-2.157 2.419z"/>
            </svg>
          </a>
          {/* Album des Projekts auf Spotify — gleiches Muster wie der Discord-Knopf: rund, Markenfarbe, Logo statt Text. */}
          <a href={SPOTIFY_URL} target="_blank" rel="noopener noreferrer"
            aria-label={t("start.spotify")} title={t("start.spotify")}
            className="as-edge-neutral p-2 rounded-full transition-all hover:-translate-y-0.5 inline-flex items-center justify-center"
            style={{ color: SPOTIFY_GREEN, borderLeftColor: "var(--ed-quiet)" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.31c-.22.36-.68.47-1.04.26-2.85-1.75-6.44-2.14-10.67-1.17-.41.09-.82-.16-.91-.57-.1-.41.16-.82.57-.92 4.62-1.05 8.59-.6 11.77 1.35.37.22.48.68.27 1.05zm1.47-3.27c-.28.45-.87.59-1.32.32-3.26-2.01-8.23-2.59-12.08-1.42-.51.16-1.05-.13-1.2-.64-.15-.51.13-1.05.64-1.2 4.41-1.34 9.88-.69 13.63 1.62.45.28.6.86.32 1.31zm.13-3.4C15.24 8.31 8.82 8.09 5.09 9.22c-.6.18-1.23-.16-1.41-.76-.18-.6.16-1.23.76-1.41 4.29-1.3 11.4-1.05 15.9 1.63.54.32.72 1.02.4 1.56-.32.53-1.03.71-1.56.4z"/>
            </svg>
          </a>
          {/* #desktop: Der Glossar-Knopf, hinter dem Discord-Zeichen. Bis 1279 px sitzt er oben rechts in der
              Ecke (Instanz weiter oben) und ist hier ausgeblendet — im schmalen Stapel wäre das Fußband sonst
              eine Zeile länger, und die obere Ecke ist dort der eingeführte Platz dafür.
              Er bleibt der runde ⓘ und wächst nur auf die Größe des Discord-Zeichens daneben: die beiden sind
              hier ein Paar aus zwei Symbolen, kein Chip neben einem Symbol. Sichtbarkeit und Maße stehen in
              index.css — `.gloss-i-btn` setzt `display: grid` und feste 26 px und schlägt jede Tailwind-Utility,
              die man dem Knopf mitgibt. */}
          <GlossaryPanel className="as-gloss-foot" />
        </div>
      </div>

      {/* #kopf-kompakt: Nickname, PWA-Link und Datenschutz standen als DREI eigene Zeilen untereinander —
          drei Textzeilen plus zwei Lücken für zusammen ein paar Wörter. Jetzt eine umbrechende Reihe.
          Inhaltlich ändert sich nichts: Es sind weiter dieselben ruhigen Fuß-Links, nur nebeneinander.
          (#14 Nickname · PWA „Zum Startbildschirm" · #datenschutz — der dauerhafte Einstieg zum Hinweis,
          bewusst im Fuß und nicht als Chip neben Feedback/Discord: die dort sind Angebote, das hier ist
          Nachschlagewerk. Die anderen beiden Einstiege sitzen dort, wo entschieden wird — Telemetrie-Zeile
          der Optionen und Namens-Dialog beim Erststart.) */}
      <div className="flex flex-wrap items-center justify-center dt:justify-end gap-x-3 gap-y-1 dt:gap-x-4">
        {onEditName && (
          <button onClick={onEditName} className="text-body-5 dt:text-body-lg-1 opacity-60 hover:opacity-100 transition-opacity">
            {username
              ? <>{t("start.name.signedIn")} <b style={{ color: CY }}>{username}</b> · {t("start.name.change")}</>
              : <>{t("start.name.set")}</>}
          </button>
        )}
        <PwaInstall />
        {onPrivacy && (
          <button onClick={onPrivacy} className="text-body-5 dt:text-body-lg-1 opacity-60 hover:opacity-100 transition-opacity underline underline-offset-2">
            {t("privacy.link")}
          </button>
        )}
      </div>
      {/* #kopf: Versions-/Build-Stempel — jetzt UNTER der „angemeldet als"-Zeile (aus dem Kopf hierher gezogen).
          Mobil zentriert wie die Fuß-Links darüber, ab 1280 px rechtsbündig zum restlichen Fuß-Band. */}
      <div className="ty-meta text-meta-1 opacity-40 select-text mt-1 text-center dt:text-right" title={t("start.version.title")}>{VERSION_FULL}</div>
      {/* #desktop — Ende des Fuß-Bandes. */}
      </div>
    </div>
  );
}
