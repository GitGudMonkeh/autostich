import { useState } from "react";
import { RankIcon } from "./RankIcon.jsx"; // #pokal-eins: Ranglisten-Zeichen, geteilt mit der Bestenliste
import { MuteButton } from "./MuteButton.jsx";
import { parseSeed } from "../game/rng.js"; // #205 Challenger Mode: eingefügten Seed dekodieren
import { currentWeek } from "../game/weeklySeed.js"; // #370: Wochennummer + Wochen-Seed für die Bonus-Anzeige
import { RANKED_WEEK_SP, RANKED_WEEK_DP, RANKED_WEEK_DP_FULL } from "../game/storage.js"; // #bonus-benennen: die Tafel NENNT den Wochenbonus — Zahlen aus der Quelle
import { matchSecretSeed, ownedCount, nodeState, treeComplete, rankedUnlocked, NODES, TOTAL_NODES, ONBOARDING_LINKS, SP_LOYALTY_EVERY } from "../game/progression.js"; // Test-Codes + Hub-Progressionsanzeige
import { GlossaryPanel } from "./Glossary.jsx";
import { battlefieldVeil } from "./cosmeticAssets.js"; // #deck-mobil: Schleier-Deckel fuer zu helle Spielfelder
import { rarityLabel, deckDef, battlefieldDef, globalFxDef } from "../i18n/labels.js"; // Raritäts-/Kosmetik-/Effekt-Namen: EINE Quelle, übersetzt (Sprachprüfung C1)
import { VERSION_FULL } from "./version.js"; // #250: Versions-/Build-Stempel, seit 16.08.2026 direkt unter der Marke
import { PwaInstall } from "./PwaInstall.jsx"; // PWA · „Zum Startbildschirm" (Installieren-Link)
import BrandGrid from "./BrandGrid.jsx"; // #mainscreen-branding: das Zeichen — die Spalte im I und die Bildmarke
import { DISCORD_URL, DISCORD_BLURPLE } from "./links.js"; // #datenschutz: Invite jetzt geteilt (s. u.)
import { fmtNum } from "../i18n/index.js";
import { useT } from "../i18n/useLocale.js"; // #sprache: alle Texte über t()
import { useIsWide } from "./useIsWide.js"; // #mainscreen-branding: die Zellen im I sind eine DOM-Frage, keine Anordnung

/* Der Buchstabe, an dem der Schriftzug geschnitten wird. Als benannte Konstante und nicht als "I" an
   der Fundstelle, damit `test/marke.test.js` dieselbe Stelle prüft, die der Screen benutzt. */
export const WORDMARK_I = "I";

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
const VI = "#9b82f0";   // Logo Mitte (Violett) — nur noch Onboarding-Leiste + Desktop-Status-Tafel
const AM = "#d6ab6b";   // Währung (war #f2a83a) — Upgrades / SP / DP / Bonus-Leiste
const RANK = "#6696a4"; // Rangliste + Tutorial: CY zur Hälfte ins Neutrale gezogen, dann entsättigt
const NEU = "#8a8a95";  // Kachel-Kante ohne Aussage — der Rückfallton der Kanten-Familie (index.css)
const SP = AM;          // Stichpunkte = Upgrade-Währung → Gold

// (Schritt 4e) Onboarding-Kette (docs §4): Reward je Glied — Index i = Belohnung fürs Erreichen von Glied i+1.
// Nur Anzeige (nächste Freischaltung im Hub); die Wirkung sitzt in progression.js / reducer.
// Sprachprüfung C1/E3: Raritäts-Namen aus TIER_META (kein „Blau"/„Violett"), Legendär-Phase mit ausgeschriebenem
// Durchlauf statt der Chiffre „R29" — die Zahl kommt aus dem Entscheidungsplan (constants.js).
// #sprache: als Funktion, damit der Sprachwechsel greift — Name UND Raritätsstufe lösen zur Anzeigezeit auf.
const onbRewards = (t) => [
  t("start.onb.reroll"), t("start.onb.plant"), t("start.onb.rarity", { tier: rarityLabel(3) }),
  t("start.onb.ice"), t("start.onb.rarity", { tier: rarityLabel(4) }), t("start.onb.legendary"),
];

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
  // Upgrades — Pfeil nach oben: der Baum wächst, das Guthaben geht hinein.
  upgrades: { paths: ["M12 20V5", "M5.5 11.5 12 5l6.5 6.5"] },
  // Deck-Werkstatt — vier Bausteine: Deck, Spielfeld, Effekt, Rückseite.
  workshop: { rects: [[4, 4], [13, 4], [4, 13], [13, 13]] },
  /* Bestenliste — Treppchen. Die Grundlinie ist nicht Zierrat: ohne sie sind es drei frei
     schwebende Striche, und die lesen sich bei 9 % Deckkraft als Kratzer statt als Diagramm. */
  board: { paths: ["M4.5 20.5h15", "M7 17.5V12", "M12 17.5V5", "M17 17.5V9"] },
  // Statistiken — Ring mit herausgeschnittenem Stück: die klassische Auswertung.
  stats: { paths: ["M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16", "M12 4v8h8"] },
};

/* #premium (18.08.2026) — das führende Zeichen der Bonus-/Onboarding-Zeile.
   Bis 1279 px steht dort weiter das Emoji, das vorher IM i18n-String stand (💠 bzw. 🎓); die Zeile
   sieht am Handy also unverändert aus, was sie auch soll — Handy ist ein anderer Durchgang.
   Ab 1280 px übernimmt eine schlichte Raute in der Textfarbe. Emoji bringen ihre eigene Farbe und
   ihr eigenes Gewicht mit, und beides steht quer zu einem Screen, der seine Farben aus dem aktiven
   Deck zieht — 💠 ist immer blau, egal ob das Deck grün, rot oder gold ist.
   Die Raute ist bewusst KEIN zweites Symbol je Zustand: sie markiert die Zeile, benannt wird der
   Zustand vom Text dahinter. Zwei Vektoren wären zwei Bedeutungsträger für dieselbe Aussage.
   Als Konstanten und nicht als JSX-Text, aus demselben Grund wie bei GLYPHS oben. */
const EMO_BONUS = "💠";
const EMO_ONB = "🎓";

/* Die Zeichen der drei Fuß-Chips. Wieder Pfaddaten statt JSX (s. GLYPHS), und wieder erst ab 1280 px
   sichtbar: am Handy steht die Reihe eng, dort kostet jedes Zeichen Breite, die die Wörter brauchen. */
const CHIP_PATHS = {
  // Optionen — drei Regler. Die Linien sind unterbrochen, damit die Knöpfe nicht überzeichnet werden.
  options: ["M3 6h3M11 6h10M3 12h9M17 12h4M3 18h5M14 18h7"],
  // Tutorial — aufgeschlagenes Buch.
  tutorial: ["M3 5.5A1.5 1.5 0 0 1 4.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-1.6H4.5A1.5 1.5 0 0 1 3 16z",
    "M21 5.5A1.5 1.5 0 0 0 19.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-1.6h5.5a1.5 1.5 0 0 0 1.5-1.4z"],
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

function Lead({ emoji }) {
  return (
    <>
      <span className="dt:hidden">{emoji}</span>
      <span aria-hidden="true" className="as-lead-gem hidden dt:block" />
    </>
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

export function StartScreen({ onStart, onResume = null, resume = null, onPlaySeed = null, onSecretSeed = null, onRankedBoard = null, onOptions, onStats, onCustomize, onLeaderboard = null, onUpgrades = null, onTutorial = null, onFeedback = null, onPrivacy = null, tutorialDone = false, profile = null, muted, onToggleMute, username = "", onEditName,
  // #desktop — Zutaten für Status-Tafel und Deck-Hintergrund. Beide erscheinen erst ab 1280 px;
  // darunter bleiben die Props ungenutzt.
  deckId = null, bfId = null, deckBack = null, lastRun = null, battlefield = null,
  musicTitle = null, onMusicNext = null, activeFx = null }) {
  const [seedInput, setSeedInput] = useState("");
  const [seedError, setSeedError] = useState(false);
  const [secretMsg, setSecretMsg] = useState("");
  const t = useT();
  const ONB_REWARDS = onbRewards(t);

  /* #mainscreen-branding — der Schnitt im Schriftzug, und er wird GESUCHT statt gezählt.
     `slice(0, 6)` wäre bei einer Umbenennung still falsch; ein `indexOf` ist es laut, und wenn kein I
     da ist, fällt die Marke auf den reinen Text zurück statt einen Buchstaben zu erfinden, den das
     Wort nicht hat. Dass beide Kataloge das I an siebter von neun Stellen tragen — und genau EINMAL —
     prüft `test/marke.test.js`, bevor der Fall je einen Screen erreicht.

     `wide`: ab 1280 px trägt das I die Zellenspalte, darunter den normalen Glyph. Warum das eine
     JS-Weiche ist und keine Media Query, steht am Schriftzug unten — es ist gemessen. */
  const wide = useIsWide();
  const logo = t("start.logo.alt");
  const logoI = logo.indexOf(WORDMARK_I);
  const logoHead = logoI >= 0 ? logo.slice(0, logoI) : logo;
  const logoTail = logoI >= 0 ? logo.slice(logoI + 1) : "";

  /* Die gedämpften Punkte der Tagline. Der Katalogtext wird AN ihnen zerlegt, nicht um sie herum
     zusammengesetzt: enthält eine Übersetzung keinen Punkt, ergibt das genau einen Teil und rendert
     unverändert. Das ist eine Darstellungsregel und keine Annahme über den Text — die Alternative
     wären drei Katalog-Schlüssel je Sprache, und damit stünde die Interpunktion einer Marke in einer
     Datei, die Übersetzer bearbeiten. */
  const taglineParts = t("start.tagline").split(/(\.)/).filter(Boolean).map((part, i) => (
    part === "." ? <span key={i} className="as-tagline-dot">.</span> : <span key={i}>{part}</span>
  ));

  // Echte Progressionsanzeige aus dem Profil (progression.js). Leeres Profil = frischer Spieler.
  const prof = profile || {};
  const progSp = Math.max(0, Math.floor(Number(prof.stichPoints) || 0));
  const progDp = Math.max(0, Math.floor(Number(prof.deckPoints) || 0)); // #299/#301: Deck-Punkte-Guthaben (Werkstatt-Währung)
  const progOwned = ownedCount(prof);
  /* #tutorial-sichtbarkeit: Nur das LAUTE Angebot über „Lauf beginnen" verschwindet, sobald der Spieler seinen
     ersten (Best-)Lauf ABGESCHLOSSEN hat (hadCompletedRun kippt genau beim ersten completed-Lauf, nicht bei
     Abbrüchen) oder das Tutorial gesehen wurde — danach braucht der Einstieg keinen prominenten Platz mehr.
     Der ruhige Tutorial-CHIP unten neben „Optionen" BLEIBT dagegen dauerhaft (jederzeit wiederholbar), solange
     ein Tutorial-Handler existiert. Seit dem Onboarding-Rückbau (#316) ist das Tutorial die EINZIGE Führung. */
  const canTutorial = !!onTutorial;                                            // Chip unten: immer verfügbar
  const firstContact = canTutorial && !prof.hadCompletedRun && !tutorialDone;  // lautes Angebot: bis zum ersten abgeschlossenen Lauf
  const progBuyable = NODES.filter((n) => nodeState(prof, n.id) === "buy").length;
  const progLigaFree = treeComplete(prof);
  const onbStep = Math.max(0, Math.min(ONBOARDING_LINKS, Math.floor(Number(prof.onboarding) || 0)));
  const onbDone = onbStep >= ONBOARDING_LINKS;
  // #299/#369 Hub-Gates: Werkstatt/Upgrades ab 6/6. #370 Rangliste frei, sobald alle Decks freigeschaltet + je ≥1 Lauf beendet.
  const rankedFree = rankedUnlocked(prof);
  /* #370 Wochen-Anzeige an der Ranglisten-Kachel: Nummer der laufenden Woche + ob der Wochenbonus noch offen ist.
     Die Bonus-Regel steht in storage.js (recordRun): die ERSTE abgeschlossene Ranked-Runde je Woche zahlt
     +5 SP & +5 DP (bei vollem Baum +10 DP) und schreibt den Wochen-Seed nach `lastRankedWeekSeed`. Genau dieser
     Vergleich ist deshalb die ganze Wahrheit über „schon geholt oder nicht" — die Anzeige leitet sich davon ab
     und hat KEINEN eigenen Zähler, der auseinanderlaufen könnte.
     Ranked-Läufe starten auf dem Wochen-Seed (App.jsx startRankedRun), darum ist der Vergleich mit currentWeek()
     exakt und nicht nur ungefähr. Bewusst ohne useMemo: currentWeek() ist ein paar Rechenschritte, und so ist die
     Nummer über einen Wochenwechsel hinweg in einer langen Sitzung immer aktuell. */
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
  const weekBonusOpen = (prof.lastRankedWeekSeed ?? null) !== week.seed;
  const spRuns = Math.max(0, Math.floor(Number(prof.spRuns) || 0));
  const dripInto = SP_LOYALTY_EVERY > 0 ? (spRuns % SP_LOYALTY_EVERY) : 0; // Läufe seit letztem Treue-+5
  const tryPlaySeed = () => {
    // Test-Codes „unlock"/„reset" VOR parseSeed abfangen (beide würden sonst als gültiger Seed durchgehen).
    // onSecretSeed ist nur im Preview-Build gesetzt → im Live-Spiel sind die Codes wirkungslos.
    const secret = onSecretSeed && matchSecretSeed(seedInput);
    if (secret) {
      setSeedError(false); setSeedInput("");
      setSecretMsg(secret === "unlock" ? t("start.secret.unlock")
        : secret === "onboarding" ? t("start.secret.onboarding")
        : t("start.secret.reset"));
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
  const chipCls = "as-edge-neutral as-edge-thin dt:inline-flex dt:items-center dt:gap-2 px-3.5 py-1.5 dt:px-5 dt:py-[11px] rounded-xl text-body-lg-5 dt:text-body-lg-3 font-medium transition-all hover:-translate-y-0.5";

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
          <img src={battlefield.desktop} alt="" draggable="false"
            className="absolute inset-0 w-full h-full object-cover select-none"
            style={{ WebkitMaskImage: "linear-gradient(180deg,transparent 0%,#000 30%)", maskImage: "linear-gradient(180deg,transparent 0%,#000 30%)" }} />
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
      {/* #mainscreen-branding — DAS I TRÄGT KEINEN GLYPH MEHR, SONDERN EINE SPALTE AUS ACHT ZELLEN.
          Damit gibt es keine zweite Form, die sich neben dem Schriftzug behaupten muss: Zeichen und
          Name sind dieselbe Sache. Das ist der Kern des Entwurfs (docs/mainscreen-marke.md).

          WARUM DAS I UND KEIN ANDERER BUCHSTABE, und es ist keine Geschmacksfrage: „AUTOSTICH" und
          „AUTOTRICK" haben beide neun Zeichen und tragen das I an siebter Stelle. EINE Fassung deckt
          damit beide Sprachen an derselben Position ab — es braucht keine zweite Zeichnung und keine
          Sonderregel je Locale. Die Annahme steht nicht hier als Hoffnung: `test/marke.test.js`
          prüft für beide Kataloge, dass die Marke neun Zeichen hat, dass das I an siebter Stelle
          steht, und dass es KEIN zweites gibt, an dem der Schnitt genauso gut hinge.

          DER SCHNITT IST GEMESSEN, NICHT GEZÄHLT. `indexOf` statt `slice(0, 6)`: eine feste Zahl
          wäre bei einer Umbenennung still falsch, ein `indexOf` ist es laut — und der Wächter fängt
          den Fall ohnehin ab, bevor er einen Screen erreicht.

          UNTER 1280 PX IST DIE MARKE EIN EINZIGER TEXTKNOTEN, UND ZWAR DERSELBE WIE VORHER. Die
          Zellen fallen unter etwa 40 px Schriftgröße zusammen (Entwurf, „Abgrenzung"), die schmale
          Fassung behält also den normalen Glyph — und diese Runde darf sie nicht bewegen.

          DASS DAS EINE JS-WEICHE IST UND KEINE MEDIA QUERY, IST GEMESSEN UND NICHT GEWÄHLT. Die
          erste Fassung hielt beide Varianten im DOM und blendete eine per Media Query aus. Das ist
          nicht kostenlos: der Glyph braucht dafür ein eigenes Inline-Element, und ein zusätzlicher
          Inline-Kasten verschiebt die Breite des Schriftzugs um 0,02 px — gemessen an zwei von sechs
          Handy-Zellen (`evidence/C2/phone-*.json`). Unsichtbar, und trotzdem eine Bewegung unter
          1280 px, die diese Runde ausschließt.

          `useIsWide` ist dafür das vorgesehene Werkzeug und keine Umgehung: sein eigener Kommentar
          nennt genau diesen Fall — „für die Fälle, in denen der Unterschied NICHT im Layout liegt,
          sondern in der DOM-Struktur selbst — und die kann keine Media Query beantworten". Der
          Bruchpunkt wird dabei nicht ein zweites Mal genannt, sondern aus `DESKTOP_MIN` gelesen.

          Die CSS-Seite bleibt trotzdem stehen (`.as-brandgrid { display: none }` in der Grundregel,
          sichtbar erst in der 1280er Sektion). Zwei Schlösser an einer Tür, mit Absicht: sollte der
          Hook je zu früh `true` melden, trägt die schmale Fassung immer noch keinen Kasten. */}
      <h1 className="as-wordmark select-none">
        {wide && logoI >= 0
          ? <>{logoHead}<BrandGrid cut="column" />{logoTail}</>
          : logo}
      </h1>
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

      {/* Fortschritts-/Bonus-Leiste — ein Element, zwei Leben: Onboarding (bis 6/6), danach SP-Treue-Drip.
          Frosted-Glass: halbtransparenter Grund (das Kopf-Glühen blutet oben ins Panel → weicher Übergang statt
          harter Kante) + Hairline-Border + Backdrop-Blur (Text bleibt scharf). */}
      <div className={`${LANE_LEAD} rounded-xl px-4 py-2.5 dt:px-5 dt:py-3.5 flex flex-col gap-1.5 dt:gap-2`}
        style={{ background: "rgba(23,23,28,0.5)", border: "1px solid rgba(150,150,170,0.10)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
        <div className="flex items-center justify-between gap-3">
          {/* Der Flex-Kontext gilt ERST ab 1280 px. Darunter bleibt die Zeile ein normaler Textfluss —
              Emoji, Leerzeichen, Text — also Zeichen für Zeichen das, was vorher im i18n-String stand.
              Als Flex-Zeile mit `gap` läge dort ein 6-px-Abstand statt der Breite eines Leerzeichens,
              und das wäre eine sichtbare Änderung am Handy (anderer Durchgang, anderer Chat). */}
          {onbDone ? (
            <span className="dt:flex dt:items-center dt:gap-1.5 text-body-3 dt:text-title-1 font-medium opacity-90" style={{ color: SP }}>
              <Lead emoji={EMO_BONUS} />{" "}<span>{t("start.progress.bonus", { cur: t(progLigaFree ? "common.cur.dp" : "common.cur.sp") })}</span>
            </span>
          ) : (
            <span className="dt:flex dt:items-center dt:gap-1.5 text-body-3 dt:text-title-1 font-medium opacity-90" style={{ color: VI }}>
              <Lead emoji={EMO_ONB} />{" "}<span>{t("start.progress.onboarding")}</span>
            </span>
          )}
          <span className="ty-num-sm text-meta-3 dt:text-body-lg-3 opacity-55">
            {onbDone ? t("start.progress.runs", { done: dripInto, total: SP_LOYALTY_EVERY })
                     : t("start.progress.links", { done: onbStep, total: ONBOARDING_LINKS })}
          </span>
        </div>
        {/* #ruhe Glow-Budget: der Balken hatte einen eigenen `boxShadow`. Auf dem Bildschirm leuchteten damit
            gleichzeitig CTA, Balken, beide Guthaben-Zahlen und drei Ambient-Blasen — wenn alles glüht, zeigt
            kein Glow mehr irgendwohin. Ab jetzt leuchtet NUR der Primär-CTA; er ist das eine Ziel der Seite.
            Der Balken behält seine Farbe, er verliert nur den Schein. */}
        {/* #premium: Fläche und Rahmen kommen aus `.as-bonus-track` statt aus einem inline-style — ab
            1280 px wird aus der 7-px-Röhre ein 2-px-Faden, und ein inline gesetzter Grund ließe sich
            davon nicht überschreiben (inline schlägt jedes Stylesheet). Die Klasse liefert unterhalb
            exakt dieselben Werte wie vorher. */}
        <div className="as-bonus-track h-[7px] dt:h-[2px] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={onbDone
            ? { width: `${dripInto / SP_LOYALTY_EVERY * 100}%`, background: `linear-gradient(90deg,#a27f49,${SP})` }
            : { width: `${onbStep / ONBOARDING_LINKS * 100}%`, background: `linear-gradient(90deg,#6a5fb0,${VI})` }} />
        </div>
        {/* (Schritt 4e) Nächste Freischaltung — nur während des Onboardings; danach übernimmt die SP-Drip-Zeile oben. */}
        {!onbDone && ONB_REWARDS[onbStep] && (
          <div className="flex items-center gap-1.5 text-meta-3 -mb-0.5">
            <span className="opacity-50">{t("start.progress.next")}</span>
            <b style={{ color: VI }}>{ONB_REWARDS[onbStep]}</b>
          </div>
        )}
      </div>

      {/* Erstkontakt-Angebot: einmalig laut, solange kein Lauf beendet und das Tutorial nie gesehen wurde.
          Bewusst KEIN dritter Dauer-CTA — es verschwindet nach dem ersten beendeten Lauf bzw. sobald das
          Tutorial gesehen ist, und lebt danach nur noch als Chip neben „Optionen" (Plan §13.4). */}
      {firstContact && (
        <div className={LANE_LEAD}>
          <button onClick={onTutorial}
            className="as-tut-btn w-full px-5 py-3 dt:px-6 dt:py-4 rounded-xl ty-title transition-all hover:-translate-y-0.5 flex flex-col items-center dt:items-start leading-tight">
            <span className="text-title-2 dt:text-head-1">{t("start.tutorial.offer")}</span>
            <span className="text-body-1 dt:text-body-lg-1 font-normal opacity-75">{t("start.tutorial.offer.sub")}</span>
          </button>
        </div>
      )}

      {/* Play-Gruppe — Fortsetzen + Lauf beginnen. Lauf beginnen klappt Normal (+ Dev Run) und das
          Seed-Feld auf → weniger Dauer-sichtbares im Haupt-Stapel. */}
      <div className={`${LANE_LEAD} flex flex-col gap-2.5`}>
        {/* Resume (#Auto-Save): gespeicherter laufender Run → einzige gefüllte Primär-Aktion (hell). */}
        {onResume && resume && (
          <button onClick={onResume}
            className="as-cta-primary w-full px-5 py-3 dt:py-4 rounded-xl ty-title transition-all hover:-translate-y-0.5 flex flex-col items-center leading-tight">
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
          className={`${normalCls} relative w-full px-5 py-3.5 dt:py-5 rounded-xl ty-title text-title-1 dt:text-head-2 transition-all hover:-translate-y-0.5 flex items-center justify-center`}>
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
                className={`as-hub-field ${seedError ? "is-err" : ""} flex-1 min-w-0 px-3 py-2 dt:px-4 dt:py-3 rounded-xl font-mono text-body-lg-5 dt:text-title-2`}
              />
              {/* Fläche und Rahmen kommen aus `.as-seed-play` statt aus einem inline-style — sonst ließe sich
                  der Rahmen ab 1280 px nicht durch den Hover-Schein ersetzen (inline schlägt jedes Stylesheet). */}
              <button type="submit" disabled={!seedInput.trim()}
                className="as-seed-play shrink-0 px-3.5 py-2 dt:px-4 dt:py-3 rounded-xl text-body-lg-5 dt:text-title-2 font-medium transition-all disabled:opacity-40">
                {t("start.seed.play")}
              </button>
            </form>
            {seedError && <div className="text-body-5 mt-1" style={{ color: "#e06a6a" }}>{t("start.seed.error")}</div>}
            {secretMsg && <div className="text-body-5 mt-1" style={{ color: "#6ad39f" }}>{secretMsg}</div>}
          </div>
        )}
      </div>

      {/* #370 Ranglisten-Gruppe — EIN Wochen-Ranked-Modus (ersetzt Standard/Meister): fixe faire Baseline, alle spielen
          den Wochen-Seed. Frei, sobald alle Decks freigeschaltet sind UND mit jedem ≥1 Lauf beendet wurde. */}
      {/* #370: EIN Einstieg „Rangliste" → öffnet die Übersicht (Reiter Diese Woche · Challenger · Regeln). Gespielt wird
          im Reiter „Diese Woche" (▶ Spielen, gegated). Der Einstieg ist IMMER offen (ansehen jederzeit); das Schloss
          signalisiert nur, dass Spielen noch gesperrt ist. */}
      {onRankedBoard && (
        <div className={`${LANE_MID} flex flex-col gap-2.5`}>
          <button onClick={onRankedBoard}
            className="as-ranked-btn relative w-full px-5 py-2.5 dt:px-6 dt:py-4 rounded-xl ty-title text-body-lg-3 dt:text-title-3 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            title={t(rankedFree ? "start.ranked.open" : "start.ranked.locked")}>
            {/* #premium/#pokal: Hier zeichnet auf JEDER Breite ein Vektor in der Knopffarbe — Schloss
                für „Spielen noch gesperrt", Pokal für „frei". Die Emoji-Fassung darunter ist entfallen.
                Das ist der eine Punkt, an dem dieser Knopf weiter geht als der übrige #premium-Pass
                (der hält Emoji bis 1279 px, s. `Lead` oben): Das Argument gegen Emoji — sie bringen
                ihre eigene Farbe mit und stehen damit quer zu einem Screen, der seine Farben aus dem
                aktiven Deck zieht — gilt am Handy seit #deck-mobil genauso. Und der Pokal ist das eine
                Zeichen dieses Screens, für das es eine gezeichnete Vorlage gibt.
                Zwei Zustände, EIN Ausdruck: `rankedFree` wählt die Pfade, nicht zwei Codepfade. */}
            <span className="flex items-center gap-2">
              <RankIcon free={rankedFree} />
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
              <span className="as-week-chip ty-num-sm px-1 dt:px-1.5 dt:py-0.5 rounded text-meta-1 dt:text-body-1 leading-tight">
                {t("start.ranked.badge", { n: week.week })}
              </span>
              {/* #desktop: Auf breiten Bildschirmen entfällt die Bonus-Zeile am Knopf — die Status-Tafel
                  rechts zeigt denselben Stand ausführlicher (Woche · 0/1 · „Bonus noch offen"). Zweimal
                  dieselbe Information nebeneinander ist keine Betonung, nur Rauschen. Unterhalb von
                  1280 px gibt es die Tafel nicht, dort bleibt die Zeile die einzige Quelle. */}
              {weekBonusOpen && (
                <span className="ty-num-sm text-micro-4 dt:hidden leading-tight" style={{ color: `${RANK}c0` }}>
                  {t("start.ranked.bonus", { have: 0, max: 1 })}
                </span>
              )}
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
      <div className="hidden dt:flex as-glass as-ring flex-col gap-[18px] rounded-2xl px-6 py-[22px]">
        <i className="as-ring-run" aria-hidden="true" />
        <div className="ty-screen-title text-meta-3 opacity-45">
          {t("start.board.title")}
        </div>
        <div className="flex items-center gap-4">
          {/* 96 → 112 px (Mockup-Abnahme 18.08.2026): das Deck ist der GEGENSTAND dieser Tafel und war
              kleiner gesetzt als die vier Kennzahlen darunter. */}
          {deckBack && (
            <img src={deckBack} alt="" draggable="false"
              className="w-[112px] h-auto rounded-lg select-none"
              style={{ border: "1px solid rgba(150,150,170,.25)", boxShadow: "0 6px 18px rgba(0,0,0,.55)" }} />
          )}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="ty-title text-head-2 truncate">{deckName}</div>
            {/* Die Spielfeld-Zeile erscheint NUR, wenn das Spielfeld nicht zum Deck gehört. Der Registername
                eines Spielfelds ist der Deckname plus Suffix („Biolumen · Battlefield") — im Normalfall stand
                hier also „Battlefield · Biolumen · Battlefield", dreimal dasselbe Wort für null Information.
                Sind Deck und Feld in der Werkstatt gemischt worden, sagt die Zeile dagegen etwas. */}
            {bfName && !bfName.startsWith(deckName) && (
              <div className="text-body-3 opacity-55 truncate">{t("start.board.field", { name: bfName })}</div>
            )}
            {/* Ausgerüstete Effekte, gleiche Zeilen-Optik wie das Spielfeld darüber. Ohne aktive Effekte
                entfällt die Zeile — „Effekte · —" wäre eine Zeile, die nichts sagt. */}
            {fxNames.length > 0 && (
              <div className="text-body-3 opacity-55 truncate" title={fxNames.join(" + ")}>
                {t("start.board.fx", { list: fxNames.join(" + ") })}
              </div>
            )}
            {/* #musik — Was gerade läuft, plus Weiterschalten. Sitzt hier und nicht als eigener Block, weil
                die Musik zum „Stand" gehört wie Deck und Spielfeld: alles, was der Screen gerade IST. */}
            {/* EIN gemeinsamer Rahmen um Titel und Knopf, und `self-start` statt voller Breite: Als
                gestreckte Zeile stand der Knopf ganz am Panelrand und las sich wie ein eigenes Element
                neben dem Titel. Zusammengefasst sind beide sichtbar EINE Sache — was läuft, und wie man
                weiterschaltet. Der Titel darf wachsen (`max-w`), der Kasten folgt ihm nur so weit. */}
            <div className="inline-flex self-start items-center gap-2 mt-1.5 min-w-0 max-w-full rounded-lg pl-2.5 pr-1 py-1"
              style={{ border: "1px solid rgba(150,150,170,.22)", background: "rgba(20,20,26,.45)" }}>
              {/* Wiedergabe-Dreieck statt der Note: die Zeile sagt, was gerade LÄUFT — ein Zustand,
                  kein Genre. Als Vektor, damit es dieselbe Strichfamilie hat wie die Zeichen daneben. */}
              <svg className="w-[11px] h-[11px] shrink-0 opacity-45" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="text-body-3 opacity-60 truncate max-w-[260px]" title={musicTitle || undefined}>
                {musicTitle || "—"}
              </span>
              {onMusicNext && (
                <button onClick={onMusicNext} aria-label={t("music.next")}
                  title={musicTitle ? t("music.playing", { title: musicTitle }) : t("music.next")}
                  className="shrink-0 rounded px-1.5 py-0.5 text-body-3 leading-none opacity-60 transition-all hover:opacity-100">
                  ⏭
                </button>
              )}
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
        <div className="as-kpis grid grid-cols-4 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(60,58,78,.5)" }}>
          {[
            { k: t("start.board.sp"), v: progSp, c: SP, s: t("start.board.sp.sub", { done: progOwned, total: TOTAL_NODES }) },
            { k: t("start.board.dp"), v: progDp, c: AM, s: t("start.board.dp.sub") },
            /* Nur das Verhältnis als Kennzahl — das Wort „Bonus" stand vorher IN der großen Zahl und
               wiederholte damit, was die Unterzeile ohnehin sagt („Bonus noch offen"). Die Zeile darüber
               nennt die Woche, die darunter den Zustand; in der Mitte gehört die Zahl allein. */
            /* #bonus-benennen: „Bonus noch offen" sagte nicht, was es zu holen gibt. Der Betrag steht
               jetzt darüber — und er hat zwei Gestalten: normal +SP und +DP, bei vollem Baum der
               doppelte DP-Betrag statt beidem (SP sind dann nutzlos). Zahlen aus storage.js, nicht
               abgetippt: ein Balancing-Schritt dort ließe die Tafel sonst still falsch werden.
               EIGENE ZEILE, nicht davorgestellt: gemessen braucht „+5 SP · +5 DP Bonus noch offen"
               131 px, die Kachel hat 118–140 — es bräche also ohnehin um, nur an zufälliger Stelle.
               Der Betrag trägt die Ranglisten-Farbe, der Zustand darunter bleibt die stille Zeile. */
            { k: t("start.board.week", { n: week.week }), v: t("start.board.week.val", { have: weekBonusOpen ? 0 : 1, max: 1 }), c: VI,
              s: weekBonusOpen
                ? (<>
                    <span className="block" style={{ color: `${VI}c0` }}>
                      {progLigaFree
                        ? t("start.board.week.bonus.full", { dp: RANKED_WEEK_DP_FULL })
                        : t("start.board.week.bonus", { sp: RANKED_WEEK_SP, dp: RANKED_WEEK_DP })}
                    </span>
                    {t("start.board.week.open")}
                  </>)
                : t("start.board.week.done") },
            { k: t("start.board.last"), v: lastRun ? fmtNum(Math.round(lastRun.score || 0)) : t("start.board.last.none"),
              c: CY, s: lastRun ? t("start.board.last.sub", { cycle: lastRun.cycles ?? 0 }) : t("start.board.last.none.sub") },
          ].map((s, i) => (
            <div key={i} className="as-kpi flex flex-col gap-0.5 px-4 py-3.5" style={{ background: "rgba(22,22,32,.5)" }}>
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
            + " dt:flex-row dt:items-center dt:gap-3 dt:min-h-0 dt:rounded-none dt:py-4 dt:pl-6 dt:pr-5 dt:hover:translate-y-0";
          /* #kante: Aus dem 3-px-Streifen wird die Kante der Kanten-Familie — 4 px plus der kurze Farbanlauf
             nach rechts, den auch Auswahlkarten und Knöpfe tragen. Bleibt ein absolut liegendes Overlay über
             der ganzen Kachel (nicht deren border-left), weil die Kachel ab 1280 px zur randlosen Listenzeile
             wird und ihren eigenen Rahmen verliert; so überlebt das Farbsignal beide Fassungen unverändert.
             Klickdurchlässig, damit die Kachel darunter der Knopf bleibt. */
          const Stripe = ({ c, dim }) => (<span aria-hidden="true"
            className="as-hub-stripe absolute inset-y-0 left-0 right-0 rounded-xl pointer-events-none dt:rounded-none"
            style={{ borderLeft: `4px solid ${c}`,
                     background: `linear-gradient(90deg, color-mix(in srgb, ${c} 14%, transparent) 0%, transparent 42%)`,
                     opacity: dim ? 0.45 : 1 }} />);
          const head = (t) => (<b className="ty-title text-body-lg-1 dt:text-title-3">{t}</b>);
          const arrow = <span className="text-body-3 opacity-35 dt:hidden">›</span>;
          // Nur Desktop: Untertitel je Eintrag + der Pfeil ganz rechts. `hidden` hält beide aus dem Handy-Flex heraus.
          const sub = (s) => (<span className="hidden dt:block text-body-3 opacity-50 font-normal">{s}</span>);
          const arrowDesk = <span className="hidden dt:block text-title-4 opacity-35">›</span>;
          const headBox = "flex items-center justify-between gap-1 dt:flex-1 dt:flex-col dt:items-start dt:gap-0.5";
          const lockBadge = (bg) => (<span className="ty-badge self-start shrink-0 px-1.5 py-0.5 rounded text-meta-1 leading-tight whitespace-nowrap"
            style={{ background: bg, color: "#c9c9d2" }}>{t("start.tile.lock", { count: ONBOARDING_LINKS - onbStep })}</span>);
          return (<>
            {/* 1 · Upgrades (getauscht mit Deck-Werkstatt) — Stripe AM: hier liegt das SP-Guthaben. „kaufbar"-Hinweis, Onboarding-Gate. */}
            {onbDone ? (
              <button onClick={onUpgrades || undefined} className={tileCls} title={t("start.tile.upgrades.title")}>
                <Stripe c={AM} /><TileGlyph kind="upgrades" />
                <div className={headBox}>
                  {head(t("start.tile.upgrades"))}
                  {/* „kaufbar"-Hinweis. Am Handy steht hier NUR DIE ZAHL im goldenen Ring, der ganze
                      Satz erst ab 1280 px — und das ist eine Fehlerbehebung, keine Verknappung:
                      nachgemessen lief die Kachel in JEDER Kombination über und wurde am Kachelrand
                      abgeschnitten (390 px/DE 11 px, 390 px/EN 18 px, 375 px/EN 25 px, „9 availabl…").
                      „Upgrades" (63 px) plus „9 available" (74 px) brauchen 141 px, die Kachel hat
                      116–123 px Innenbreite — kein Innenabstand und keine Schriftgröße holt das auf,
                      eines von beiden muss weichen. Die Zahl allein trägt hier, weil Gold auf diesem
                      Bildschirm bereits „hier liegt ein Guthaben" heißt (#ruhe) und direkt darunter
                      steht, worum es geht. Der volle Satz bleibt als `title` erreichbar. */}
                  {progBuyable > 0
                    ? <span className="shrink-0 font-semibold text-meta-3 dt:text-body-1 px-1.5 py-0.5 rounded-full whitespace-nowrap"
                        style={{ border: `1px solid ${AM}66`, color: AM }}
                        title={t("start.tile.upgrades.buyable", { n: progBuyable })}>
                        <span className="ty-num-sm dt:hidden">{progBuyable}</span>
                        <span className="hidden dt:inline">{t("start.tile.upgrades.buyable", { n: progBuyable })}</span>
                      </span>
                    : arrow}
                  {sub(t("start.tile.upgrades.sub"))}
                </div>
                {progLigaFree ? (
                  <span className="text-body-3 dt:text-title-2 font-semibold" style={{ color: AM }}>{t("start.tile.upgrades.complete")}</span>
                ) : (
                  <span className="flex items-baseline gap-1">
                    <span className="as-hub-num ty-num text-title-1 dt:text-figure-1">{progSp}</span>
                    <span className="as-hub-cur ty-unit text-meta-1 dt:text-body-1 opacity-75">{t("common.cur.sp")}</span>
                    <span className="ty-num-sm text-meta-1 dt:hidden opacity-45 ml-1">{progOwned}/{TOTAL_NODES}</span>
                  </span>
                )}
                {arrowDesk}
              </button>
            ) : (
              <div className={tileCls + " cursor-default opacity-60"} title={t("start.tile.upgrades.locked")}>
                <Stripe c={AM} dim /><TileGlyph kind="upgrades" />
                {head(t("start.tile.upgrades"))}
                {lockBadge("#20202a")}
              </div>
            )}

            {/* 2 · Deck-Werkstatt (getauscht mit Upgrades) — Stripe AM: hier liegt das DP-Guthaben. Onboarding-Gate. */}
            {onCustomize && (onbDone ? (
              <button onClick={onCustomize} className={tileCls} title={t("start.tile.workshop")}>
                <Stripe c={AM} /><TileGlyph kind="workshop" />
                <div className={headBox}>{head(t("start.tile.workshop"))}{arrow}{sub(t("start.tile.workshop.sub"))}</div>
                <span className="flex items-baseline gap-1">
                  <span className="as-hub-num ty-num text-title-1 dt:text-figure-1">{progDp}</span>
                  <span className="as-hub-cur ty-unit text-meta-1 dt:text-body-1 opacity-75">{t("common.cur.dp")}</span>
                </span>
                {arrowDesk}
              </button>
            ) : (
              <div className={tileCls + " cursor-default opacity-60"} title={t("start.tile.workshop.locked")}>
                <Stripe c={AM} dim /><TileGlyph kind="workshop" />
                {head(t("start.tile.workshop"))}
                {lockBadge("#20202a")}
              </div>
            ))}

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

      {/* Optionen + Tutorial — zwei ruhige Chips unter dem Grid (kein eigener Grid-Platz nötig). Das Tutorial
          steht bewusst hier und nicht als fünfte Kachel: es ist jederzeit wiederholbar, aber kein Dauerziel.
          Feedback bekommt eine EIGENE Zeile darunter: die beiden oberen Chips führen ins Spiel, der
          Melder führt heraus. Nebeneinander lasen sich alle drei wie eine Reihe gleichrangiger Knöpfe. */}
      <div className="grid gap-2 justify-items-center dt:grid-flow-col dt:justify-items-start dt:gap-3">
        <div className="flex items-center gap-2 dt:gap-3">
          {onOptions && (
            <button onClick={onOptions} aria-label={t("start.options")} className={chipCls}><ChipIcon kind="options" />{t("start.options")}</button>
          )}
          {canTutorial && (
            <button onClick={onTutorial} aria-label={t("start.tutorial")} className={chipCls}><ChipIcon kind="tutorial" />{t("start.tutorial")}</button>
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
