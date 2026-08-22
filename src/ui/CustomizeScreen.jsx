import { useState, useRef, useEffect, useLayoutEffect, useContext, createContext, lazy, Suspense, useMemo } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useEscape } from "./useEscape.js";
import { useTabSwipe } from "./useSwipeTabs.js"; // Reiterwechsel per Swipe (nur Funktion, keine Optik)
import { useIsWide } from "./useIsWide.js"; // #desktop: Pack-Detail als Spalte statt als Portal-Overlay
import { sortPacks, sortLabelKey, nextSort, SORT_DEFAULT } from "./packSort.js"; // #packsort: Kachel-Reihenfolge
import { shotFactor } from "./shopScale.js"; // #shop-skalieren: Breitenfaktor der Pack-Vorschau
// #vorschau-brett: gemessene Brettmaße + Szenen-Maßstab der Effekt-Vorschau (rein, ohne React → testbar).
import { CARD_W, CARD_H, BOARD_RATIO_CSS, sceneScale } from "./fx/previewScale.js";
import { setPreviewSceneScale } from "./fx/mobileTier.js"; // #perf-shopdpr: Vorschau-Deckel
import { usePrefersReducedMotion } from "./usePrefersReducedMotion.js"; // #328 Showcase-Loop (Eis/Pflanze) bei Reduced-Motion aussetzen
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, HAIRLINE } from "./modalStyle.jsx";
import { THEMES, THEME_DEFS, showcaseLook, packState, packPrice, packUnlock, canBuyPack, buyPack, hasBattlefield, isTieredPack, coverTier, highestUnlockedTier, tierByDeckId, tierAsPack, packHasTierDeck, globalFxPrice, globalFxOwned, canBuyGlobalFx, buyGlobalFx, activeLook } from "../game/themes.js";
// #tiered: Stufen-Freischaltung je Stufe. Die Bedingung kommt als `kind`/`vars` und wird erst in
// unlockText.js zum Satz — Zahlen darin über fmtNum, nicht über einen eigenen Tausenderpunkt-Helfer.
import { DECK_DEFS, isUnlocked, unlockProgress } from "../game/cosmetics.js";
import { deckAssets, battlefieldAssets } from "./cosmeticAssets.js";
// #vorschau-brett: DER Boden aller Boden-Effekte — die Werkstatt-Vorschau konsumiert ihn jetzt wie das Spiel,
// statt ihre eigene Platzierung zu erfinden (die Datei sagt ausdrücklich: durchreichen, nicht hart kodieren).
import { floorEffectPlacement } from "./fx/effectZones.js";
import { SliceFx, KLINGE_TUNE } from "./Battlefield.jsx";
// Pixi-Umbau: GPU-Emitter für die Feld-Effekt-Vorschau (lazy → Pixi bleibt aus dem main-Bundle; Mount ist env-gegatet).
import { PIXI_FIELD_KEYS } from "./fx/fieldFxKeys.js"; // pixi-frei: welche Feld-Effekte im Showcase auf die GPU-Bühne gehen
import FieldLayer from "./fx/FieldLayer.jsx"; // #kompositor: Vorschau fährt DENSELBEN Renderpfad wie das Spiel
import ScorchFx from "./fx/ScorchFx.jsx"; // #319 Scorch-Sieg-Finisher (Canvas-2D, pixi-frei) — Vorschau + In-Game
import BlackholeFx from "./fx/BlackholeFx.jsx"; // #320 Schwarzes-Loch-Sieg-Finisher (persistentes Panel-Loch) — Vorschau + In-Game
const PixiStage = lazy(() => import("./fx/PixiStage.jsx").then((m) => ({ default: m.PixiStage })));
// #318 Karten-Animationen: geteilte Pixi-Overlay-Bühne über der Vorschau-Karte (Edge-Glow …), lazy wie PixiStage.
const CardFxStage = lazy(() => import("./fx/CardFxStage.jsx").then((m) => ({ default: m.CardFxStage })));
// #322–#326 Gottgleich-Prunk (PIXI) — Vorschau lazy wie die anderen Pixi-Effekte (Pixi lädt erst, wenn der gott-Preview rendert).
import { GottChromeWord } from "./fx/GottChromeWord.jsx"; // #gott geteilte Chrome-Wortmarke (gleicher Stil wie In-Game)
const SonnenPulsPixi = lazy(() => import("./fx/SonnenPulsPixi.jsx"));
const LaserFaecherPixi = lazy(() => import("./fx/LaserFaecherPixi.jsx"));
const PrismaKaskadePixi = lazy(() => import("./fx/PrismaKaskadePixi.jsx"));
const HoloCubePixi = lazy(() => import("./fx/HoloCubePixi.jsx"));
const SupernovaPixi = lazy(() => import("./fx/SupernovaPixi.jsx"));
const HologridSlicePixi = lazy(() => import("./fx/HologridSlicePixi.jsx")); // #321 Sieg-Finisher „Hologrid-Slice" (Pixi)
// #spezial Archetyp-Effekte für den Showcase (Hitze/Moos/Blitz/Eis).
const FireHead = lazy(() => import("./fx/FireHead.jsx").then((m) => ({ default: m.FireHead })));
const MossGrow = lazy(() => import("./fx/MossGrow.jsx"));
const FrostIce = lazy(() => import("./fx/FrostIce.jsx"));
const CardIonStorm = lazy(() => import("./fx/CardIonStorm.jsx"));
// #317 Cube-Matrix — musik-reaktives Würfelfeld für die Showcase (lazy wie die anderen FX).
const CubeMatrixField = lazy(() => import("./fx/CubeMatrixField.jsx"));
import { Card } from "./Card.jsx";

// #perf-shop (Plan A): Alle Effekt-Vorschau-Chunks beim Öffnen der Deck-Werkstatt im Hintergrund vorladen. Sonst muss
//   der erste Blick auf einen Effekt erst dessen Chunk (v. a. den großen gemeinsamen Pixi-Chunk) laden → spürbare
//   Verzögerung. import() nutzt DIESELBEN Specifier wie die lazy()-Wrapper oben → das Modul-Registry dedupt (kein
//   Doppel-Load), das Vorladen wärmt also direkt die lazy-Komponenten. Best-effort: Fehler werden geschluckt, läuft im
//   Idle, nur EINMAL pro Session (fxPrefetched-Guard).
const FX_PREFETCH = [
  () => import("./fx/PixiStage.jsx"), () => import("./fx/CardFxStage.jsx"),
  () => import("./fx/SonnenPulsPixi.jsx"), () => import("./fx/LaserFaecherPixi.jsx"), () => import("./fx/PrismaKaskadePixi.jsx"),
  () => import("./fx/HoloCubePixi.jsx"), () => import("./fx/SupernovaPixi.jsx"), () => import("./fx/HologridSlicePixi.jsx"),
  () => import("./fx/FireHead.jsx"), () => import("./fx/MossGrow.jsx"), () => import("./fx/FrostIce.jsx"),
  () => import("./fx/CardIonStorm.jsx"), () => import("./fx/CubeMatrixField.jsx"),
];
/* #deckui-status: EIN Farbpaar für den Zustand „ausgerüstet/läuft gerade" ↔ „noch nicht aktiv".

   Der Aktionsknopf trug im Aus-Zustand die DECKFARBE („das Angebot"). Das las sich so lange gut, wie
   die Deckfarbe nichts mit Zustand zu tun hatte — bei einem grünen Deck sah der Knopf „Als Hintergrund
   wählen" aber praktisch identisch aus wie die grüne Bestätigung „Ausgewählt". Genau die Verwechslung,
   die ein Zustands-Signal nicht produzieren darf.

   Zustand ist deshalb jetzt deckunabhängig und immer dasselbe Paar: Grün = an, Rot = noch nicht. Rot ist
   der Ton, der im Rest des Spiels ohnehin die Gegenrichtung zu Grün besetzt (Score-Deltas, Zinseszins-
   Hürde, FPS-Anzeige). Die Deckfarbe bleibt, wo sie hingehört — Reiter, Punkte, Umschalter.

   Wer einen neuen Zustands-Knopf baut: diese beiden nehmen, keine dritte Nuance erfinden. */
export const STATE_ON = "#54e08a";   // ausgerüstet / läuft gerade
export const STATE_OFF = "#e0605a";  // vorhanden, aber nicht aktiv

/* #perf-shopwarm — GEMESSEN UND VERWORFEN, bitte nicht nochmal probieren.
   Das Vorladen unten nimmt den MODUL-Anteil des ersten Ruckels (#perf-shop Plan A). Naheliegend wäre,
   zusätzlich den WebGL-Kontext vorzuwärmen (Präzedenz #perf-warm bei den Gottgleich-Prunks): eine
   1×1-Wegwerf-Canvas, `getContext("webgl2")`, ein `clear`, Kontext wieder freigeben — die Treiber-
   Initialisierung fiele dann an, während der Spieler noch den Katalog liest.
   Gebaut, gemessen, wieder ausgebaut. Größter Aufbau-Task beim ERSTEN echten Effekt, je drei Läufe:
     mit Vorwärmen   218 · 232 · 239 ms
     ohne            243 · 247 · 226 ms
   Der Median liegt 11 ms auseinander, die Streuung innerhalb einer Gruppe bei über 20 ms — das ist
   nichts. Der Grund ist plausibel: was den ersten Effekt teuer macht, sind die Shader der EINZELNEN
   Pixi-App, und die hängen an deren Instanz; ein fremder Kontext wärmt sie nicht.
   Ebenfalls nichts zu holen beim ÖFFNEN des Reiters: dort mountet die statische Startszene
   („Keine Animation"), gemessen null Long Tasks. Der erste Ruckler sitzt am ersten echten Effekt.
   Vorbehalt: gemessen im Software-Renderer des Messstands. Wer es auf echter GPU erneut versucht,
   misst zuerst und nimmt eine WARME PIXI-APP, keinen rohen Kontext. */
let fxPrefetched = false;
function prefetchFxChunks(spezialDeckTint = false) {
  if (fxPrefetched || typeof window === "undefined") return;
  fxPrefetched = true;
  const run = () => { for (const imp of FX_PREFETCH) { try { imp().catch(() => {}); } catch { /* ignore */ } } };
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 1500 });
  else setTimeout(run, 300);
  prewarmSpezialStages(spezialDeckTint);
}

/* #382 EINE Warteschlange für alle Vorwärm-Aufgaben, genau eine je Idle-Slot.
   Wichtig, dass es nur eine gibt: zwei parallele Ketten (Standard- und Deckfarbe-Palette) könnten sonst im selben
   Idle-Fenster je ein Bitmap bauen — also doch zwei teure Renderings in einem Frame, genau das, was das Vorwärmen
   verhindern soll. Fertig gecachte Aufgaben sind ein Map-Treffer und kosten nichts. */
const fxWarmQueue = [];
let fxWarmRunning = false;
function enqueueFxWarm(tasks) {
  fxWarmQueue.push(...tasks);
  if (fxWarmRunning || typeof window === "undefined") return;
  fxWarmRunning = true;
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));
  const step = () => {
    const task = fxWarmQueue.shift();
    if (!task) { fxWarmRunning = false; return; }
    try { task(); } catch { /* Vorwärmen ist nie kritisch */ }
    idle(step, { timeout: 1500 });
  };
  idle(step, { timeout: 1500 });
}

/* #382 Stufen-Bitmaps der Skill-Effekt-Bühne im Leerlauf aufbauen.
   Moos und Frost halten je Reifestufe UND je Palette ein gecachtes Bitmap; der ERSTE Aufbau einer Stufe ist teuer.
   Die Bühne spielt Wachstum und Vereisung binnen Sekunden komplett durch — ohne Vorwärmen fällt jeder Erst-Aufbau
   mitten in eine Stufen-Blende und macht genau die Frames kaputt, die weich sein sollen.

   #384: Der Farbmodus gehört zum Cache-Schlüssel, das Vorwärmen deshalb auch. Vorher lief es nur für die Palette,
   die beim Öffnen zu sehen war — der erste Sprung Standard→Deckfarbe baute dann alle zwölf Stufen auf einmal neu
   auf (gemeldet als starker Ruckler, und nur beim ERSTEN Wechsel; danach war der Cache voll). Beide Paletten
   vorwärmen kostet keinen zusätzlichen Speicher-Höchststand: dieselben Bitmaps entstünden beim Umschalten ohnehin,
   nur eben zum falschen Zeitpunkt. Je Farbmodus einmal pro Sitzung (`spezialWarmed`). */
const spezialWarmed = new Set();
function prewarmSpezialStages(deckTint) {
  const key = deckTint ? "deck" : "std";
  if (spezialWarmed.has(key) || typeof window === "undefined") return;
  spezialWarmed.add(key);
  const opts = { deckTint, deckColor: SPEZIAL_DECK_A, deckColor2: SPEZIAL_DECK_B };
  Promise.all([import("./fx/MossGrow.jsx"), import("./fx/FrostIce.jsx")])
    .then(([moss, frost]) => enqueueFxWarm([...moss.mossPrewarmTasks(opts), ...frost.frostPrewarmTasks(opts)]))
    .catch(() => { /* Vorwärmen ist nie kritisch */ });
}
import { suitColor, SUIT_ORDER } from "../game/constants.js";
import { audio } from "./audio.js"; // Showcase-Panel spielt den Klinge-Sound mit
import { holeSound } from "./blackholeSnd.js"; // Bett-Pegel des Schwarzen Lochs: EINE Quelle mit dem Spiel
import { supernovaSwellDelay } from "./fx/supernovaTiming.js"; // Swell-Vorlauf: EINE Quelle mit dem Spiel (Pixi-frei)

// Showcase-Tempo des Supernova-Prunks: gestreckt, damit der ~11-s-Swell in EINEN Loop passt (#379).
// Als Konstante, weil derselbe Wert den Sound-Vorlauf rechnet — zwei Literale liefen sonst auseinander.
const SUPERNOVA_SHOWCASE_SPEED = 0.18;
import { globalFxList, globalFxDef, themeDef } from "../i18n/labels.js"; // #sprache: Kosmetik zur Anzeigezeit
// #sprache: Pack-/Deck-Name zur Anzeigezeit auflösen (roh trägt DE-Namen wie „Feuer"/„Eis"). Objekt bleibt
// unangetastet (STD_PACK.kind etc.) — nur der ANGEZEIGTE Name kommt aus dem i18n-Katalog.
const packLabel = (pk) => (pk ? (themeDef(pk.id)?.name ?? pk.name) : "");
import { t, fmtNum } from "../i18n/index.js";
import { unlockLabel } from "../i18n/unlockText.js"; // #sprache: Freischalt-Bedingung zur Anzeigezeit

// #327 Standard-Backdrop für ALLE Effekt-Showcases: das Genesis-Battlefield (Default-Standard-BG, Single Source of Truth
// = THEME_DEFS.genesis.bfId). Im Standard-Modus zeigt jeder Showcase Genesis; nur der Deckfarbe-Modus zeigt den Pack-BG.
const SHOWCASE_BF = THEME_DEFS.genesis.bfId; // = "bf_onboarding"

/* #deckshop — DECK-WERKSTATT (schlankes Modell): zwei Kategorien.
   • PACKS   = Karte (Front + Back) + Battlefield als EIN Kauf. Tap → Detail-Ansicht mit Vorschau
     (Karte vorne / Karte hinten / Hintergrund umschaltbar, ‹ ›/Swipe zwischen Packs). Kaufen aktiviert das
     Pack direkt (setzt deckId UND battlefieldId zusammen).
   • EFFEKTE = alle globalen Effekte, einzeln kaufbar (Karten-Animationen · Sieg-Finisher · Krit · Gottgleich-
     Prunk). Nicht-gekauft → „Vorschau · Preis"-Zeile öffnet ein Kauffenster mit echter In-Game-Vorschau;
     gekauft wird nur dort. In der Übersicht danach togglen (bzw. Finisher auswählen).
   Kauf spendet SP (onProfileChange); Aktiv-Wahl/Toggles schreiben in die Optionen (onChoose). Reine Kosmetik. */

// Echtes Seitenverhältnis der Deck-Bilder (1066×1476) → object-contain zeigt die Karte vollständig
// (kein Anschnitt oben/unten), der bemalte Neon-Rahmen bleibt intakt und der Frame-Glow sitzt bündig.
const CARD_RATIO = "1066 / 1476";
/* #vorschau-brett: Kartenmaß, Brettmaß und Maßstab liegen in `fx/previewScale.js` — reine Zahlen ohne
   React, damit der Wächter das Verhältnis NACHRECHNEN kann statt Quelltext zu vergleichen. Die volle
   Begründung samt Messung steht dort im Dateikopf. Die vier Zahlen standen bis 18.08.2026 als Literale
   in SECHS Szenen; die Maßstabsfrage wäre damit sechsmal zu beantworten gewesen. */

const SceneScaleCtx = createContext(1);

/* #perf-shopmount — DIE SZENE MOUNTET ERST, WENN DIE AUSWAHL STEHT.
   Jeder Effekt-Wechsel baut eine komplette Bühne auf (WebGL-Kontext, Texturen, Partikel). Beim
   Durchklicken der Liste entstand damit je Klick eine Szene, die sofort wieder abgerissen wurde —
   fünf schnelle Klicks = fünf Auf- und Abbauten, und genau das war das gemeldete „beim Auswählen
   laggy". 150 ms sind unterhalb dessen, was man als Verzögerung liest, aber deutlich über der Zeit
   zwischen zwei Klicks beim Durchblättern.
   WICHTIG: Die ERSTE Szene kommt ohne Verzögerung (vorher stand nichts da, warten wäre eine leere
   Bühne). Verzögert wird nur der WECHSEL. Name, Preis und Aktionsknopf folgen der Auswahl weiter
   sofort — sie hängen an `fx`, nicht am hier zurückgegebenen Wert. */
export const FX_MOUNT_DELAY_MS = 150;
function useSettled(value, ms) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (shown === value) return undefined;
    if (shown == null) { setShown(value); return undefined; }   // erster Aufbau: sofort
    const id = setTimeout(() => setShown(value), ms);
    return () => clearTimeout(id);
  }, [value, ms, shown]);
  return shown;
}

/* #fx-grace — eine Sekunde Ruhe, bevor ein angeklickter Effekt losspielt.
   ---------------------------------------------------------------------------------------------
   Ein Klick in der Effekt-Liste wechselt `sel`, das wechselt den `key` an GlobalFxScenePreview, und
   die neue Szene ist damit im SELBEN Frame gemountet: `GottScene` reicht `trigger={1}` an den Prunk,
   dessen `onFire` spielt sofort `fx_godlike` + Swell. Beim Durchtippen der Liste knallt also jede
   Zeile im Moment des Tippens los — noch bevor der Blick von der Liste auf der Bühne angekommen ist.

   Der Halt hängt am MOUNT der Szene, nicht an einem Prop: der Szenenwechsel IST der Remount, damit
   trifft er genau den gemeinten Fall und keinen anderen. Ein Prop hätte durch alle sechs Szenen
   gefädelt werden müssen und wäre beim Farbmodus-Toggle (der bewusst NICHT remountet, s. #perf-shop)
   fälschlich noch einmal angesprungen.

   Er greift NACH `useSettled` oben (#perf-shopmount): erst wartet der Mount, bis die Auswahl steht
   (150 ms), dann hält die gemountete Szene ihren Effekt zurück. Zusammen rund 1,15 s — die beiden
   lösen verschiedene Probleme (Bühnen-Aufbau beim Durchblättern gegen Knall im Klick-Moment) und
   sind bewusst nicht zu einem Timer zusammengezogen.

   Nur die Szenen mit echtem ABSPIEL-Moment tragen ihn (Sieg-Finisher + Gottgleich-Prunk). Die
   Hintergrund-Effekte (Aurora, Würfel-Matrix, Glutfunken, Komet) und die Karten-Animationen laufen
   weiter sofort an — sie haben keinen Knall, den man abwarten könnte, und eine Sekunde stehendes
   Feldbild wäre dort kein Zugewinn, sondern eine Verzögerung. */
export const FX_GRACE_MS = 1000;
function useGrace(ms = FX_GRACE_MS) {
  const [bereit, setBereit] = useState(false);
  useEffect(() => { const id = setTimeout(() => setBereit(true), ms); return () => clearTimeout(id); }, [ms]);
  return bereit;
}

/* Karten-Anker aller Vorschau-Szenen: der unsichtbare 104×144-Slot, an dem sich die Effekte ausrichten.
   Skaliert wird per `transform`, NICHT über width/height — und das ist die eigentliche Entscheidung hier:
   • Die DOM-Effekte (Klinge/SliceFx, Standard-Wegflug, die Vorschau-Karte selbst) rechnen in absoluten
     Pixeln — SliceFx streut seine Funken auf 46–116 px und schneidet 120 px weit. Ein größerer Slot allein
     ließe die Geometrie stehen und den Schnitt zu kurz aussehen; `transform: scale` zieht sie mit.
   • Die Canvas-/Pixi-Effekte (Scorch, Hologrid, Schwarzes Loch, die fünf Prunks, CardFxStage) lesen den
     Slot per `getBoundingClientRect()` — und das liefert die TRANSFORMIERTE Box. Sie folgen also ohne eine
     einzige Änderung an ihnen. Was NICHT mitskaliert, sind ihre internen Konstanten (Strichbreiten,
     Glow-Radien); die bleiben in Gerätepixeln stehen. Bei einem Neonrand oder einem Funkenkranz ist das
     unauffällig bis richtig — wer hier eine Ebene ergänzt, prüft es am Bild.
   Zur Zentrierung: `translate(-50%,-50%) scale(s)` bleibt korrekt, weil die Prozentwerte sich auf die
   UNskalierte Box beziehen und `transform-origin` in deren Mitte sitzt — der Mittelpunkt bleibt also stehen,
   egal wie groß s ist. */
function CardSlot({ slotRef = null, left = "50%", top = "50%", className = "", style = null, children = null }) {
  const s = useContext(SceneScaleCtx);
  return (
    <div ref={slotRef} className={`absolute ${className}`}
      style={{ left, top, width: CARD_W, height: CARD_H, transform: `translate(-50%,-50%) scale(${s})`, ...style }}>
      {children}
    </div>
  );
}
// Demo-Farbe der Effekt-Vorschauen (in-game = Deck-/Suit-Farbe).
const DEMO_C = "#35e0ff";
/* #327 Showcase-Deckfarbe AUTOMATISCH aus dem Pack des gezeigten Hintergrunds ableiten (kohärente Pack-Einheit wie
   in-game). Pro Effekt nur noch EINE Pack-Angabe (`pack`); Hintergrund (Pack-`bfId`) UND Deckfarben (Pack-`a1/a2`)
   folgen daraus über showcaseLook. Optionaler Per-Effekt-Override (a1/a2/bf) bleibt als Sicherheitsventil — nur setzen,
   wenn die abgeleitete Farbe den Standard↔Deckfarbe-Toggle unsichtbar macht oder schlecht lesbar wird.
   WICHTIG: Der Pack-`bf` wird nur im DECKFARBE-Modus gezeigt; im Standard-Modus kommt einheitlich Genesis (SHOWCASE_BF).
   Karten-Animationen (edgeglow/holo/glitch) laufen IMMER in der Deckfarbe → neutraler Genesis-Backdrop (Pack „genesis"). */
export const LOOK_REFS = { // #327 exportiert für den Drift-Guard-Test (kein Effekt darf still eine Fremdfarbe einführen)
  aurora:        { pack: "wale" },       // Feld IST der Effekt (bgfx) — Deckfarbe = Moonwhale (kühl)
  starfield:     { pack: "arcade" },     // #359 bgfin — Deckfarbe = Beryll (grün/cyan): grünes Neon-Arcade-Feld hebt die Deckfarbe klar vom weiß-blauen Standard-Kometen ab (war Drache gold/warm)
  cubematrix:    { pack: "arcade" },     // bgfx — Deckfarbe = Beryll (grün/cyan)
  neonsurf:      { pack: "polarlicht" }, // #345 bgfx — Deckfarbe = Polarlicht (blau/grün, Tiefsee-Biolumineszenz)
  klinge:        { pack: "drache" },     // Sieg-Finisher — Deckfarbe = Drache (warm-gold)
  scorch:        { pack: "wale" },       // Sieg-Finisher — Deckfarbe = Moonwhale (kühl-cyan)
  hologrid:      { pack: "blitz" },      // Sieg-Finisher (Hologrid-Laser) — Deckfarbe = Blitz (violett)
  blackhole:     { pack: "kosmos" },     // Sieg-Finisher — Deckfarbe = Kosmos (Magenta)
  sonnenPuls:    { pack: "gottgleich" }, // Score-Prunk — Deckfarbe = Gottgleich (gold/grün)
  laserFaecher:  { pack: "blitz" },      // Score-Prunk — Deckfarbe = Blitz (violett)
  prismaKaskade: { pack: "polarlicht" },// Score-Prunk — Deckfarbe = Polarlicht (blau/grün)
  holoCube:      { pack: "geometrie" },  // Score-Prunk — Deckfarbe = Metatron (violett/gold)
  supernova:     { pack: "spacedog" },   // Score-Prunk — Deckfarbe = Kosmospanther (violett/magenta)
  edgeglow:      { pack: "genesis" },    // Karten-Anim — immer Deckfarbe, neutraler Genesis-Backdrop
  holo:          { pack: "genesis" },
  glitch:        { pack: "genesis" },
  // Override: Standard-Prunk zeigt nur die Chrome-Wortmarke (kein Pack-Farbmodus) → Sonnen-Backdrop, Farbe neutral.
  gottStandard:  { pack: "sonne", a1: "#cbd3ff", a2: "#cbd3ff" },
};
/* #vorschau-deck — der Look des AKTIVEN Decks, per Kontext an alle Vorschau-Szenen.

   Bewusst ein Kontext und kein Prop: `look` wird an DREIZEHN Stellen gelesen (neun `look={}`-Aufrufe plus
   vier Szenen, die es sich selbst holen), und die Kette dorthin führt durch Komponenten, die mit dem Deck
   sonst nichts zu tun haben. Dieselbe Bauart wie `SceneScaleCtx` zwei Bildschirme weiter unten.

   `null` heißt „kein aktives Deck bekannt" (kommt in der Werkstatt nicht vor, aber die Szenen werden auch
   in Tests und Messständen gemountet) — dann gilt weiter die feste Tabelle. */
export const DeckLookCtx = createContext(null);

const PREVIEW_LOOK = Object.fromEntries(
  Object.entries(LOOK_REFS).map(([key, ref]) => [key, showcaseLook(ref.pack, ref)])
);
// #318 Preview-Key → CardFxStage-Layer-Flag (welcher Layer in der Showcase gezeigt wird).
const ANIM_LAYER = { edgeglow: "edgeGlow", holo: "holo", glitch: "glitch" };

// Default-Pack (UI-seitig) = GENESIS: das immer-freie Start-/Grund-Deck inkl. Battlefield (ersetzt das frühere
// „Standard"-Deck deck/bf "default"). kind:"std" → immer im Besitz, steht auf der Packs-Seite zuoberst. Genesis bleibt
// in der puren Registry ein cond-Pack; hier wird es nur UI-seitig als Default (std) präsentiert.
const STD_PACK = { ...(THEMES.find((t) => t.id === "genesis") || {}), kind: "std" };
// #307/#Shop-Reorg: eigene Kategorien. „Packs" = Genesis (Default) + Kauf-Packs, nach DP-Preis aufsteigend (billig oben,
// teuer unten; Genesis immer zuoberst). „Challenges" = die freischaltbaren cond-Packs (#303) OHNE Genesis.
const PACKS_TAB = [STD_PACK, ...THEMES.filter((t) => t.kind === "buy").slice().sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))];
const CHALLENGES_TAB = THEMES.filter((t) => t.kind === "cond" && t.id !== "genesis"); // Genesis raus aus Challenges → Packs-Seite (Default)
// #: Aktives (gerade ausgerüstetes) Pack immer nach vorn — direkt hinter „Standard" (falls in der Liste), sonst ganz
// vorn (Challenges haben kein Standard). Reine Umsortierung; Preise/Reihenfolge der übrigen bleiben.
function orderPacks(list, deckId) {
  const active = list.find((pk) => pk.kind !== "std" && (pk.deckId === deckId || packHasTierDeck(pk, deckId)));
  if (!active) return list;
  const rest = list.filter((pk) => pk !== active);
  const stdFirst = rest[0] && rest[0].kind === "std";
  rest.splice(stdFirst ? 1 : 0, 0, active); // hinter Standard bzw. ganz vorn
  return rest;
}

/* Synthetische „Standard"-Kachel: der GRATIS-Standard-Sieg-Finisher (kein Kauf, Default-Auswahl). Schlicht — die
   Verliererkarte fliegt nach dem Stich einfach zur Seite weg (wie die eigene Karte bei einer Niederlage), der Flip-
   Sound wird beim Sieg dezent angehoben. Wird der Sieg-Finisher-Gruppe vorangestellt (analog „Gottgleich · Standard"). */
const FIN_STANDARD = { key: "standard", group: "finisher", preview: "standard", alwaysOwned: true,
  // #sprache: Name/Text zur Anzeigezeit — als Getter, weil sich die Sprache ändern kann.
  get name() { return t("fxsyn.standard.name"); }, get desc() { return t("fxsyn.standard.desc"); } };

/* Synthetische „Klinge"-Kachel: ein KAUFBARER Sieg-Finisher (10 DP, grüne Rarity) mit eigenem Besitz-Schlüssel
   fx:klinge — vorschaubar wie die anderen Finisher. Wird in der Sieg-Finisher-Gruppe hinter „Standard" (Gratis) geführt. */
const KLINGE = { key: "klinge", group: "finisher", preview: "klinge", ownKey: "fx:klinge", price: 10,
  // #sprache: Name/Text zur Anzeigezeit — als Getter, weil sich die Sprache ändern kann.
  get name() { return t("fxsyn.klinge.name"); }, get desc() { return t("fxsyn.klinge.desc"); } };

/* #319 Synthetische „Scorch"-Kachel: kaufbarer Sieg-Finisher (20 DP, blaue Rarity, ownKey fx:scorch). Ein Laser
   schießt einmalig aus zufälliger Richtung, danach verglüht die Gegnerkarte organisch (Rausch-Burn) mit Glut/Asche/Funken. */
const SCORCH = { key: "scorch", group: "finisher", preview: "scorch", ownKey: "fx:scorch", price: 20,
  // #sprache: Name/Text zur Anzeigezeit — als Getter, weil sich die Sprache ändern kann.
  get name() { return t("fxsyn.scorch.name"); }, get desc() { return t("fxsyn.scorch.desc"); } };

/* #321 Synthetische „Hologrid-Slice"-Kachel: kaufbarer Sieg-Finisher (#353: 30 DP, lila/Rar, ownKey fx:hologridSlice). Eine Laserlinie
   fährt achsen-parallel über die Gegnerkarte und deckt ein Nahtraster auf; danach zerfällt die Karte in ein Kachelgitter,
   dessen Stücke wegfliegen & vom Boden abprallen, während die Füllung früh zu einem reinen Hologrid-Rahmen verblasst. */
const HOLOGRID_SLICE = { key: "hologridSlice", group: "finisher", preview: "hologrid", ownKey: "fx:hologridSlice", price: 30,
  // #sprache: Name/Text zur Anzeigezeit — als Getter, weil sich die Sprache ändern kann.
  get name() { return t("fxsyn.hologridSlice.name"); }, get desc() { return t("fxsyn.hologridSlice.desc"); } };

/* #320 Synthetische „Schwarzes Loch"-Kachel: kaufbarer Sieg-Finisher (#353: 40 DP, gold/Legendär, ownKey fx:blackhole). Ein
   PERSISTENTES Serien-Loch — jeder Sieg füttert es (es wächst + saugt die Gegnerkarte ein), eine Niederlage lässt es
   schrumpfen; kollabiert es bei genug Masse, folgt eine Supernova. Standard blau/pink oder in der Deckfarbe. */
const BLACKHOLE = { key: "blackhole", group: "finisher", preview: "blackhole", ownKey: "fx:blackhole", price: 40,
  // #sprache: Name/Text zur Anzeigezeit — als Getter, weil sich die Sprache ändern kann.
  get name() { return t("fxsyn.blackhole.name"); }, get desc() { return t("fxsyn.blackhole.desc"); } };

// Alle KAUFBAREN Sieg-Finisher (ownKey-tragend). Quelle für die Voll-Freischaltung: der Drift-Guard-Test hält diese
// Liste mit themes.BUYABLE_FINISHER_FX synchron, damit „unlock" nie einen neuen Finisher übersieht.
export const BUYABLE_FINISHER_OWNKEYS = [KLINGE, SCORCH, HOLOGRID_SLICE, BLACKHOLE].map((f) => f.ownKey);

/* Synthetische „Gottgleich · Standard"-Kachel (kein Kauf, immer aktiv) — nur zum Vergleichen des Gottgleich-
   Siegs OHNE Prunk. Wird in der Gottgleich-Gruppe als reine Vorschau-Zeile geführt. */
const GOTT_STANDARD = { key: "gottStandard", group: "gott", alwaysOwned: true, preview: "gottStandard",
  // #sprache: Name/Text zur Anzeigezeit — als Getter, weil sich die Sprache ändern kann.
  get name() { return t("fxsyn.gottStandard.name"); }, get desc() { return t("fxsyn.gottStandard.desc"); } };

/* #spezial/#328 Skill-Effekt (Archetyp-Effekte Feuer/Blitz/Eis/Pflanze): IMMER aktiv, kein Kauf, kein An/Aus — es gibt
   nur die Farbwahl Standard ↔ Deckfarbe (options.archColor). EINE synthetische Kachel; der Standard/Deckfarbe-Umschalter
   sitzt als Segmented-Control unter dem Showcase (gleiche UI wie die anderen Effekte, schreibt weiter archColor). */
const SPEZIAL = { key: "spezial", group: "spezial", alwaysOwned: true, preview: "spezial",
  // #sprache: Name/Text zur Anzeigezeit — als Getter, weil sich die Sprache ändern kann.
  get name() { return t("fxsyn.spezial.name"); }, get desc() { return t("fxsyn.spezial.desc"); } };

// #331 Effekt-Reiter des „Effekte"-Tabs — auf 4 Reiter reduziert (Reihenfolge = Anzeige links→rechts):
//   Karten · Stich · Hintergrund · Score. Ein Effekt pro Kategorie aktiv (Einfachauswahl); Ausnahme:
//   • Skill-Effekt (Archetyp, group "spezial") — immer aktiv, nur Farbwahl (zählt nicht in die Einfachauswahl).
// #deckglow-raus: „Leuchten" war der einzige frei kombinierbare Effekt (eigener Toggle neben dem Hintergrund-Set) und
//   ist entfallen → der Hintergrund-Reiter ist jetzt durchgehend einfach-exklusiv, ohne Sonderzweig.
// mode: "cardanim" (Karten-Animationen einfach-exklusiv) | "finisher" (Stich) | "bg" (Hintergrund-Set einfach-exklusiv)
//   | "gott" (Score). Die alten Gruppen (anim/bgfx/bgfin/finisher/gott) bleiben als
//   DATEN-Gruppe (globalFxList().group) erhalten — nur die UI-Reiter werden hier zusammengefasst (fxGroupItems ordnet zu).
const FX_GROUPS = [
  { key: "karten",      mode: "cardanim" },
  { key: "stich",       mode: "finisher" },
  { key: "hintergrund", mode: "bg" },
  { key: "score",       mode: "gott" },
].map((g) => ({ ...g,
  // #sprache: Reiter-Titel/Hinweis zur Anzeigezeit — Getter, damit ein Sprachwechsel greift.
  get title() { return t(`fxgroup.${g.key}.title`); }, get hint() { return t(`fxgroup.${g.key}.hint`); } }));
/* #306 Synthetische „Kein Feld-Effekt"-Kachel (immer verfügbar, kein Kauf): der Aus-Zustand der einfach-exklusiven
   Battlefield-Ambiente-Gruppe — wählbar wie „Klinge" beim Finisher. */
const FIELD_NONE = { key: "none", group: "field", preview: "none", alwaysOwned: true,
  // #sprache: Name/Text zur Anzeigezeit — als Getter, weil sich die Sprache ändern kann.
  get name() { return t("fxsyn.fieldNone.name"); }, get desc() { return t("fxsyn.fieldNone.desc"); } };
/* #318 Synthetische „Keine Animation"-Kachel (grau, immer verfügbar, kein Kauf): der Aus-Zustand der frei
   kombinierbaren Karten-Animationen. Anwählen schaltet ALLE Karten-Animationen ab (wie „Kein Feld-Effekt" beim
   Ambiente, nur dass die anim-Gruppe eine Mehrfachauswahl ist). preview „none" → schlichte Karte ohne Overlay. */
const ANIM_NONE = { key: "none", group: "anim", preview: "none", alwaysOwned: true,
  // #sprache: Name/Text zur Anzeigezeit — als Getter, weil sich die Sprache ändern kann.
  get name() { return t("fxsyn.animNone.name"); }, get desc() { return t("fxsyn.animNone.desc"); } };
// Items einer Gruppe (in Detail-Reihenfolge): globalFxList() der Gruppe nach DP-Preis aufsteigend (billig oben, teuer unten);
// der synthetische „Standard"/„Kein …"/„Klinge"-Default wird vorangestellt (Gratis-Aus-Zustand).
const fxByGroup = (g) => globalFxList().filter((f) => f.group === g && !f.hidden).slice().sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); // #: `hidden` blendet Effekte im Shop aus (bleiben funktional)
const fxKey = (k) => globalFxDef(k); // Kurzzugriff für die feste Reihenfolge im Hintergrund-Reiter
const byFxPrice = (a, b) => globalFxPrice(a) - globalFxPrice(b); // #353 Seltenheit = Preis (aufsteigend)
// #353 Basis-Reihenfolge je Reiter: die festen Führungs-Kacheln (Standard/„Kein …"/Leuchten/Skill) voran, der REST nach
// Seltenheit (= Preis) sortiert. (Vorher stand der Hintergrund-Vierer in fixer Reihenfolge — jetzt ebenfalls nach Preis.)
const fxGroupBase = (group) => {
  if (group === "karten") return [SPEZIAL, ANIM_NONE, ...fxByGroup("anim")]; // #328 Skill-Effekt · Keine · (Neonrahmen/Holo/Glitch nach Preis)
  if (group === "stich")  return [FIN_STANDARD, ...[KLINGE, SCORCH, HOLOGRID_SLICE, BLACKHOLE].sort(byFxPrice)]; // Standard · Rest nach Preis
  if (group === "hintergrund") return [FIELD_NONE, ...[fxKey("aurora"), fxKey("neonsurf"), fxKey("cubematrix"), fxKey("starfield")].filter(Boolean).sort(byFxPrice)]; // Kein · Rest nach Preis
  if (group === "score")  return [GOTT_STANDARD, ...fxByGroup("gott")]; // „Standard" (kein Prunk) voran, dann nach Preis
  return [];
};
// #353 Führungs-Kacheln, die IMMER oben bleiben (Standard/„Kein …"/Skill) — NICHT der aktive Effekt. sonnenPuls
// ist zwar alwaysOwned, aber ein echter (Preis-0-)Effekt → gehört in den nach Seltenheit sortierten Rest, nicht hierher.
const LEADING_FX_KEYS = new Set(["standard", "gottStandard", "none", "spezial"]);
const isLeadingFx = (fx) => LEADING_FX_KEYS.has(fx.key);
const activeFxKeyOf = (mode, options, p) =>
    mode === "finisher" ? finisherSelOf(options, p)
  : mode === "bg"       ? bgSelOf(options, p)
  : mode === "gott"     ? gottSelOf(options)
  : mode === "cardanim" ? cardAnimSelOf(options, p)
  : null;
// #353 Reihenfolge je Reiter: Führungs-Kacheln oben → der aktuell aktive Effekt direkt darunter → Rest nach Seltenheit.
// Ohne Options-Kontext (z. B. useState-Init) nur die Basis-Reihenfolge. Wird auf Liste UND Bühnen-Navigation angewandt.
const fxGroupItems = (group, options = null, p = null) => {
  const base = fxGroupBase(group);
  if (!options) return base;
  const mode = (FX_GROUPS.find((g) => g.key === group) || {}).mode;
  const activeKey = activeFxKeyOf(mode, options, p);
  const idx = activeKey ? base.findIndex((f) => f.key === activeKey && !isLeadingFx(f)) : -1;
  if (idx < 0) return base;                                  // aktiv ist Führungs-Kachel oder nicht in der Liste → Basis
  const active = base[idx];
  const rest = base.filter((f) => f !== active);
  const lead = rest.filter(isLeadingFx).length;             // Anzahl Führungs-Kacheln → aktiven direkt dahinter einfügen
  rest.splice(lead, 0, active);
  return rest;
};

// #373 Default-AUSWAHL je Reiter (statt blind [0]). Karten: „Keine Animation" (key "none") → der Showcase zeigt beim
// Öffnen/Tab-Wechsel die schlichte Karte, die Skill-Effekt-Szene (SpezialScene) läuft NICHT automatisch an. Reihenfolge/
// Namen der Kacheln bleiben unverändert; nur was initial angewählt ist, ändert sich. Fallback = erstes Item.
const DEFAULT_FX_KEY = { karten: "none" };
const defaultSelFor = (gKey) => {
  const its = fxGroupItems(gKey);
  const want = DEFAULT_FX_KEY[gKey];
  return { group: gKey, key: (want && its.some((f) => f.key === want)) ? want : its[0].key };
};

/* Sieg-Finisher einfach-exklusiv (genau EINER aktiv): die Auswahl steckt als einzelner String in options.finisher.
   „standard" (Gratis-Default, Wegflug) und „klinge" (kaufbar, 10 DP) sind wählbar. finisherFlags schreibt die Auswahl;
   „none" (Abwählen des aktiven) fällt auf den Gratis-Standard zurück (es gibt keinen „gar kein Finisher"-Zustand).
   #farbsystem/#klinge-kaufbar: „klinge" gilt nur, wenn Klinge auch im Besitz ist — sonst zurück auf „standard" (die
   Klinge-Auswahl ohne Kauf würde sonst im Spiel trotzdem rendern). Ohne Profil (reine Options-Sicht) ungegated. */
const finisherFlags = (key) => ({ finisher: key === "none" ? "standard" : key });
// #spezial: Farbwahl der Archetyp-Effekte — einfach-exklusiv über options.archColor ("standard" | "deck").
const spezialFlags = (key) => ({ archColor: key === "deck" ? "deck" : "standard" });
const finisherSelOf = (options, profile) => {
  const sel = options?.finisher || "standard";
  if (sel === "klinge" && profile && !globalFxOwned(profile, KLINGE)) return "standard";
  if (sel === "scorch" && profile && !globalFxOwned(profile, SCORCH)) return "standard";
  if (sel === "hologridSlice" && profile && !globalFxOwned(profile, HOLOGRID_SLICE)) return "standard";
  if (sel === "blackhole" && profile && !globalFxOwned(profile, BLACKHOLE)) return "standard";
  return sel;
};
/* #331 Hintergrund einfach-exklusiv (genau EINER aktiv, oder „none"): der frühere bgfx- (Aurora/Würfel-Matrix) UND
   bgfin-Slot (Glutfunken/Komet) sind zu EINEM exklusiven Set verschmolzen — es kann nur noch EIN Hintergrund-Effekt
   laufen (kein Stapeln Aurora + Glutfunken mehr). bgFlags(key) schreibt alle vier Optionen in einem Rutsch (genau eine
   true, „none" = alle false). bgSelOf gated auf Besitz (ungekaufte Auswahl zählt nicht — parallel zu finisherSelOf/in-game globalFxActive). */
const BG_EXCL_KEYS = ["aurora", "cubematrix", "neonsurf", "starfield"]; // feste Priorität (Aurora zuerst) — #glutfunken-raus: embers entfernt · #345 neonsurf
const BG_EXCL_FX = BG_EXCL_KEYS.map((k) => globalFxDef(k)).filter(Boolean);
const bgFlags = (key) => Object.fromEntries(BG_EXCL_FX.map((f) => [f.option, f.key === key]));
const bgSelOf = (options, profile) => {
  for (const f of BG_EXCL_FX) if (options?.[f.option]) { if (profile && !globalFxOwned(profile, f)) continue; return f.key; }
  return "none";
};
/* Gottgleich-Prunk einfach-exklusiv (genau EINER aktiv, oder „gottStandard" = kein Prunk). Datengetrieben aus der
   „gott"-Gruppe: gottFlags(key) schreibt alle Prunk-Optionen in einem Rutsch (genau eine true, „gottStandard" = alle false). */
const GOTT_FX = globalFxList().filter((f) => f.group === "gott");
const gottFlags = (key) => Object.fromEntries(GOTT_FX.map((f) => [f.option, f.key === key]));
const gottSelOf = (options) => { for (const f of GOTT_FX) if (options?.[f.option]) return f.key; return "gottStandard"; };
/* #331 Karten-Animationen (mode "cardanim") sind jetzt EINFACH-EXKLUSIV (früher frei kombinierbar): genau EINE
   Animation aktiv, oder keine (= „Keine Animation"). cardAnimFlags(key) schreibt {fxEdgeGlow,fxHolo,fxGlitch} in einem
   Rutsch (genau eine true, „none" = alle false); animNoneFlags = alle aus (für die „Keine"-Kachel). cardAnimSelOf
   gated auf Besitz (ungekaufte Auswahl zählt nicht). Der Skill-Effekt (Archetyp) läuft getrennt (immer aktiv). */
const ANIM_FX = globalFxList().filter((f) => f.group === "anim");
const cardAnimFlags = (key) => Object.fromEntries(ANIM_FX.map((f) => [f.option, f.key === key]));
const animNoneFlags = () => Object.fromEntries(ANIM_FX.map((f) => [f.option, false]));
const cardAnimSelOf = (options, profile) => {
  for (const f of ANIM_FX) if (options?.[f.option]) { if (profile && !globalFxOwned(profile, f)) continue; return f.key; }
  return "none";
};

// Gleiche Schwelle wie das In-Run-Battlefield (<picture media="(max-width: 640px)">): so zeigt die
// Vorschau exakt die Version (mobile/desktop), mit der gerade auch gespielt wird.
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setM(mq.matches);
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on));
  }, []);
  return m;
}


// Einmalig injizierte Keyframes für die Gottgleich-Standard-Vorschau (Event-Loop).
const FX_CSS = `
/* #gott Showcase: die geteilte Chrome-„GOTTGLEICH"-Ansage poppt SYNCHRON zum Effekt-Loop rein (Pop → Halten → Fade),
   zentriert — wie in-game (großer Stich → Ansage + Prunk gemeinsam). Kein eigener Karten-Pop/Aura mehr, nur der Schriftzug. */
@keyframes ws-gott-word{0%{opacity:0;transform:translate(-50%,-50%) scale(.55)}10%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}20%{transform:translate(-50%,-50%) scale(1)}72%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.04)}}
/* #fx-floater: horizontal wischbare Kategorie-Reihen ohne sichtbaren Scrollbalken. */
.ws-hscroll::-webkit-scrollbar{display:none}
`;

/* Karten-Finisher-Vorschau: die ECHTEN In-Game-Komponenten (SliceFx/ExplosionFx) an einer Demo-Karte
   im Loop — Vorschau = In-Game (keine separate Engine, kein Drift). */
const DEMO_SUIT = "B"; // blau — Effektfarbe = suitColor (wie in-game die Gegner-Suit-Farbe)
// #312: Vorschau spielt die Klinge 3× schneller ab — Animation UND Sound teilen dieselbe (durch 3 geteilte) Zeitbasis,
// laufen also garantiert nicht auseinander. Basiswerte wie in-game, hier nur für die Vorschau beschleunigt.
const FIN_SPEED = 3;
const FIN_DELAY = Math.round(460 / FIN_SPEED), FIN_HALVES = Math.round(950 / FIN_SPEED), FIN_CUT = Math.round(130 / FIN_SPEED), FIN_SPARK = Math.round(950 / FIN_SPEED);
const FIN_TICK_MS = Math.round(2400 / FIN_SPEED); // Loop-Takt ebenfalls 3× schneller
// Showcase-Sound der Klinge (einziger verbliebener Sieg-Finisher).
const FIN_SFX = { klinge: "fx_blade" };
// #klinge-showcase: fester Choreo-Fahrplan der Klinge-Vorschau — je Serienschwelle der VOLLE Richtungs-Zyklus
// (links zuerst) am Stück, danach die nächste Stufe. m = Siegesserie-Multiplikator (bestimmt Wucht/Funken), d = Schnittrichtung.
const KLINGE_SCHEDULE = [
  { m: 1.0,  d: "left" },                                              // ×1,0  → nur LINKS (Grundzug)
  { m: 1.25, d: "left" }, { m: 1.25, d: "right" },                    // ×1,25 → LINKS · RECHTS
  { m: 1.5,  d: "left" }, { m: 1.5,  d: "right" }, { m: 1.5, d: "top" }, // ×1,5  → LINKS · RECHTS · OBEN
  { m: 2.0,  d: "left" }, { m: 2.0,  d: "right" }, { m: 2.0, d: "top" }, { m: 2.0, d: "z" }, // ×2,0 → alle vier inkl. Z-Schnitt
];
// #330: KLINGE_DIR_LABEL/kMultLabel entfernt — die Klinge-Vorschau zeigt kein eigenes Stufen-Label mehr (Chrome zentral).

/* #330 Einheitlicher Panel-Chip für das verbindliche 4-Ecken-Showcase-Template — EIN Stil für ALLE Ecken. Die Bühne
   (FxStage) setzt die vier Ecken zentral (TL Effekt-Name · TR AKTIV/Preis · BR Standard/Deckfarbe wo Farbmodus · BL
   frei = reservierter Ausnahme-Slot, aktuell nur Deck-Glow „mit/ohne"). Die Scene-Komponenten zeichnen KEIN eigenes
   Chrome mehr, nur noch die Visuals. `style` überschreibt Farbe/Rahmen (TR: AKTIV grün bzw. Preis in Rarity-Farbe). */
const PANEL_CHIP_POS = { tl: "left-2 top-2", tr: "right-2 top-2", bl: "left-2 bottom-2", br: "right-2 bottom-2" };
function PanelChip({ corner = "tl", children, style }) {
  return (
    <span className={`absolute ${PANEL_CHIP_POS[corner]} text-[9px] font-extrabold px-2 py-0.5 rounded-md`}
      style={{ background: "#0b0a16cc", border: "1px solid #ffffff1f", color: "#cbd3ff", ...style }}>{children}</span>
  );
}

function FinisherScene({ variant, deckTint = false, look = null }) {
  const [tick, setTick] = useState(0);
  const bereit = useGrace();   // #fx-grace: erst die Karte liegen lassen, dann schneiden
  // #klinge-deck: Standard = kühles Stahlweiß (bladeTint, wie in-game bladeColor=null); Deckfarbe = Deck-Beispielfarbe
  //   auf passendem Backdrop (nur im Deckfarbe-Modus), Standard bleibt auf dem neutralen SHOWCASE_BF.
  const bf = battlefieldAssets(deckTint && look?.bf ? look.bf : SHOWCASE_BF);
  const bladeCol = deckTint ? (look?.a1 || "#35e0ff") : "#bcd6ff";
  const kstep = KLINGE_SCHEDULE[tick % KLINGE_SCHEDULE.length];
  useEffect(() => {
    if (!bereit) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), FIN_TICK_MS); // Loop: Karte erscheint → wird zerteilt → Pause
    return () => clearInterval(id);
  }, [bereit]);
  // #312: Sound synchron zum sichtbaren Schnitt (bei FIN_DELAY). Der Z-Schnitt sind ZWEI Slashes → zwei schnelle Hits,
  // exakt auf die beiden Slash-Zeitpunkte (0 und zSlashStep × cutDur). Alle Zeiten sind bereits 3×-skaliert → Sound
  // zieht mit der Animation mit. Andere Richtungen: EIN Hit. Respektiert Mute/Volume über das audio-System.
  useEffect(() => {
    const sfx = FIN_SFX[variant];
    if (!sfx || !bereit) return undefined;   // #fx-grace: kein Hit-Sound während der Wartezeit
    const timers = [setTimeout(() => audio.play(sfx, { gain: 1.0 }), FIN_DELAY)];
    if (kstep.d === "z") timers.push(setTimeout(() => audio.play(sfx, { gain: 1.0 }), FIN_DELAY + Math.round(KLINGE_TUNE.zSlashStep * FIN_CUT)));
    return () => timers.forEach(clearTimeout);
  }, [tick, variant, kstep.d, bereit]);
  const suitCol = suitColor(DEMO_SUIT);
  const cardEl = <Card suit={DEMO_SUIT} value={8} baseRank={8} ionStacks={2} />;
  const seed = tick * 3 + 1;
  // klinge (einziger Finisher): die Vorschau fährt den Siegesserie-MULTIPLIKATOR stufenweise hoch (×1,0 → ×1,25 →
  // ×1,5 → ×2,0) und zeigt, wie der Richtungs-Zyklus wächst — jede Serienschwelle ihren VOLLEN Zyklus von vorne
  // (links zuerst). Spiegelt exakt die In-Game-Logik (sliceMove).
  const kstreak = Math.round((kstep.m - 1) / 0.02);                       // passende Serie zur Multiplikator-Stufe (Wucht/Funken)
  const fx = <SliceFx cardEl={cardEl} color={suitCol} bladeColor={bladeCol} halvesDur={FIN_HALVES} cutDur={FIN_CUT} sparkDur={FIN_SPARK} seed={seed} delay={FIN_DELAY} intensity={0.5} scale={1} dir={kstep.d} streak={kstreak} /> /* #klinge-deck: Standard = Stahlweiß · Deckfarbe = Deck-Beispielfarbe (in-game = aktive Deckfarbe) */;
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {/* Demo-Karte im echten 104×144-Slot, zentriert; die Finisher-Komponente rendert die Karte + Effekt darin. */}
      <CardSlot>
        {/* #fx-grace: In der Wartezeit steht die blanke Karte im Slot — dasselbe Bild, das SliceFx zwischen
            zwei Schnitten ohnehin zeigt (es rendert `cardEl` selbst). Kein zweiter Look, nur später. */}
        <div key={tick} className="absolute inset-0">{bereit ? fx : cardEl}</div>
      </CardSlot>
      {/* #330 Kein Scene-Chrome mehr — Name/Status/Farbmodus zeichnet zentral die Bühne (FxStage). */}
    </div>
  );
}

/* #319 Scorch-Vorschau: ein unsichtbarer 104×144-Karten-Slot (Positionsanker) im Zentrum; ScorchFx zeichnet die
   verglühende Karte darüber und feuert im Loop (loop=true → eigenes Re-Fire). deckTint schaltet Standard-Feuer ↔ Deckfarbe. */
function ScorchScene({ deckTint = false, look = null }) {
  const panelRef = useRef(null);
  const cardRef = useRef(null);
  const bereit = useGrace();   // #fx-grace
  // #scorch-deck: Standard = warmes Feuer (ScorchFx-intern, deckTint=false); Deckfarbe = Deck-Beispielfarbe auf
  //   passendem Backdrop (nur im Deckfarbe-Modus), Standard bleibt auf dem neutralen SHOWCASE_BF.
  const bf = battlefieldAssets(deckTint && look?.bf ? look.bf : SHOWCASE_BF);
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      <CardSlot slotRef={cardRef} />
      {bereit && <ScorchFx panelRef={panelRef} cardRef={cardRef} trigger={1} loop deckTint={deckTint}
        value={8} suit={suitColor(DEMO_SUIT)} deckColor={look?.a1 || "#35e0ff"} speed={1.15}
        onFire={() => audio.play("fx_scorch", { rate: 1.15, gain: 1.0 })} /* #319 Sound auch im Shop, getimt (rate = Showcase-Speed), Klinge-Pegel */ />}
      {/* #330 Kein Scene-Chrome mehr — die Bühne (FxStage) zeichnet Name/Status/Farbmodus zentral. */}
    </div>
  );
}

/* #321 Hologrid-Slice-Vorschau (PIXI): board-weite Bühne (panelRef) mit Karten-Anker (cardRef) im Zentrum; der Finisher
   backt darüber die Karte (Wert 8, Deck-Skin/Suit) und feuert im Loop (loop=true → eigenes Re-Fire). Farbe = Deckfarbe
   (Verlauf A→B). Lazy (Suspense) → Pixi lädt erst, wenn die Vorschau gerendert wird. Vorschau = In-Game. */
function HologridScene({ deckTint = false, look = null }) {
  const panelRef = useRef(null);
  const cardRef = useRef(null);
  // #hologrid-deck: Standard = Cyan/Magenta (STD_A/STD_B); Deckfarbe = Deck-Beispielfarbe (Verlauf) auf passendem
  //   Backdrop (nur im Deckfarbe-Modus), Standard bleibt auf dem neutralen SHOWCASE_BF.
  const bf = battlefieldAssets(deckTint && look?.bf ? look.bf : SHOWCASE_BF);
  const dc1 = deckTint ? (look?.a1 || "#2ff0ff") : "#2ff0ff";
  const dc2 = deckTint ? (look?.a2 || look?.a1 || "#ff2d9b") : "#ff2d9b";
  const isMobile = useIsMobile();
  const bereit = useGrace();   // #fx-grace
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      <CardSlot slotRef={cardRef} />
      {bereit && <Suspense fallback={null}>
        <HologridSlicePixi panelRef={panelRef} cardRef={cardRef} trigger={1} loop deckTint={deckTint}
          value={8} suit={suitColor(DEMO_SUIT)} deckColor={dc1} deckColor2={dc2} lite={isMobile} speed={1.1}
          onFire={() => audio.play("fx_lasergrid", { rate: 1.1, gain: 1.0 })} /* #378 Sound auch im Shop, getimt (rate = Showcase-Speed), gleicher Key wie in-game (#374) */ />
      </Suspense>}
      {/* #330 Kein Scene-Chrome mehr — die Bühne (FxStage) zeichnet Name/Status/Farbmodus zentral. */}
    </div>
  );
}

/* #320 Schwarzes-Loch-Vorschau: persistentes Panel-Loch (BlackholeFx) mit unsichtbarem Karten-Anker rechts (oppRef →
   Flug-Startpunkt). Ein Timer feuert im Loop Sieg-Pulse (Loch wächst + Karte einsaugen), dann eine Niederlage-Sequenz
   bis zum Kollaps → Supernova, danach von vorn. deckTint schaltet Standard blau/pink ↔ Deckfarbe (deckA1/deckA2). */
function BlackholeScene({ deckTint = false }) {
  const panelRef = useRef(null);
  const oppRef = useRef(null);
  // #blackhole-deck: Standard = neutrales Dunkelfeld; Deckfarbe = passender (dunkel gehaltener) Kosmos-Backdrop, damit
  //   der Toggle auch am Hintergrund sichtbar ist. Der Backdrop bleibt bewusst schwach (opacity 0.35) → Weltraum-Look.
  const bf = battlefieldAssets(deckTint ? (PREVIEW_LOOK.blackhole.bf || SHOWCASE_BF) : SHOWCASE_BF);
  const [pulse, setPulse] = useState(null);
  const bereit = useGrace();   // #fx-grace: Choreografie UND Sog-Bett warten
  useEffect(() => {
    if (!bereit) return undefined;
    // Loop-Choreografie: das Loch wächst sichtbar bis zum MAXIMUM auf und implodiert dann. maxLevel ≈ 23
    //   ((MAX_R−BASE_R)/STEP_R), Siege erhöhen den Level je um 1 → der Wiederaufbau braucht so viele Sieg-Pulse, dass der
    //   Deckel WIRKLICH erreicht wird (die letzten paar Siege halten das Loch am Max — Vorbedingung für die Implosionsbombe).
    //   Sieg-Kadenz bewusst geruhsam (640 ms), damit die eingesogenen Karten NICHT als Pulk übereinander liegen.
    // #338-1: Choreo demonstriert alles — Aufbau, kurzer Niederlagen-Shrink, Wiederaufbau bis GANZ ans Maximum, dann die
    //   Implosionsbombe (gescripteter „collapse"-Puls, da der 2-Min-am-Max-Timer im Showcase nicht greift; er zündet erst,
    //   wenn das Loch am Max steht → Vorbeben-Zucken → schnelles Zusammenziehen → Supernova). Danach dormant → Loop baut neu auf.
    const seq = [
      ...Array.from({ length: 8 }, () => ({ kind: "win" })),   // erster Aufbau
      ...Array.from({ length: 3 }, () => ({ kind: "loss" })),  // Niederlagen schrumpfen das Loch (heat-artig)
      ...Array.from({ length: 24 }, () => ({ kind: "win" })),  // Wiederaufbau bis ans MAXIMUM (≥ maxLevel ≈ 23 → Deckel erreicht + kurz gehalten)
      { kind: "collapse" },                                    // am Max: Vorbeben → schnelles Zusammenziehen → Supernova
    ];
    let id = 0, i = 0, alive = true; const timers = [];
    // #320: eingesogene Karten = wechselnde „verlorene" Karten → echte Werte (1..10) UND wechselnde Suit-Farben, damit die
    //   Vorschau die neue In-Game-Vielfalt zeigt (nicht mehr alle in einer Farbe). SUIT_ORDER-Reihenfolge R/B/G/Y.
    const nums = [10, 7, 4, 9, 2, 8, 5, 6];
    const cols = SUIT_ORDER.map((s) => suitColor(s));
    const tick = () => {
      if (!alive) return;
      const step = seq[i % seq.length]; i++; id++;
      setPulse(step.kind === "win" ? { id, kind: "win", num: nums[id % nums.length], col: cols[id % cols.length] } : { id, kind: step.kind });
      // Nach dem Kollaps eine längere Pause: Vorbeben-Zucken (~1,5 s) + schnelles Zusammenziehen + Nova ausklingen,
      //   bevor der Loop wieder aufbaut. Sonst Sieg 640 ms / Niederlage 340 ms.
      timers.push(setTimeout(tick, step.kind === "collapse" ? 3400 : step.kind === "win" ? 640 : 340));
    };
    timers.push(setTimeout(tick, 400));
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [bereit]);
  // #380 Loop-Bett (Sog/Drone) wie in-game: läuft durchgehend über die ganze Vorschau-Choreografie, Gain/Rate wachsen
  //   via onSize mit der Lochgröße → der Aufbau ist hörbar, nicht nur der Kollaps.
  const holeSndRef = useRef(null);
  // Wie im Spiel: Lochgröße und Vorbeben getrennt merken, Pegel aus beiden rechnen (holeSound).
  const holeFillRef = useRef(0);
  const holeShudRef = useRef(0);
  const applyHoleSnd = () => {
    const h = holeSndRef.current;
    if (!h) return;
    const { gain, rate } = holeSound(holeFillRef.current, holeShudRef.current);
    audio.setLoopGain(h, gain); audio.setLoopRate(h, rate);
  };
  useEffect(() => {
    if (!bereit) return undefined;   // #fx-grace: das Bett ist der erste hörbare Ton der Szene
    holeFillRef.current = 0; holeShudRef.current = 0;
    holeSndRef.current = audio.loop("fx_blackhole", { gain: holeSound(0, 0).gain, loopStart: 1.5, loopEnd: 31.0 });
    return () => { audio.stopLoop(holeSndRef.current, { fade: 0.3 }); holeSndRef.current = null; };
  }, [bereit]);
  // #vorschau-deck: Deckfarbe-Modus → DEIN Deck (Farben + Spielfeld); Standard-Modus → feste Tabelle.
  const deckLook = useContext(DeckLookCtx);
  const look = (deckTint && deckLook) || PREVIEW_LOOK.blackhole;
  const c1 = deckTint ? look.a1 : "#4aa0ff";
  const c2 = deckTint ? (look.a2 || look.a1) : "#ff3ea8";
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#05060d" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.35 }} />}
      <div className="absolute inset-0" style={{ background: "radial-gradient(60% 60% at 72% 50%,#0b0c1866,#05060d)" }} />
      <CardSlot slotRef={oppRef} left="72%" />
      {bereit && <BlackholeFx active pulse={pulse} color={c1} color2={c2} scale={1} panelRef={panelRef} oppRef={oppRef} backSrc={deckAssets("default").back} /* #338-4: Vorschau zeigt die Deck-Rückseite der eingesogenen Karten */
        /* #380 Sound wie in-game: Zusammenzieh-Impact · Nova-Flash → fx_supernova (nur großer Kollaps) · Bett-Pegel via onSize. */
        onImplode={(big, spd) => audio.play("fx_blackhole_implode", { gain: big ? 1.2 : 1.0, bass: big ? 6 : 3, rate: Math.min(spd || 1, 2) })}
        onNova={(big) => { if (big) audio.play("fx_supernova", { gain: 0.9 }); }}
        onSize={(level, maxL) => { holeFillRef.current = maxL > 0 ? level / maxL : 0; applyHoleSnd(); }}
        onShudder={(sh) => { holeShudRef.current = sh; applyHoleSnd(); }} />}
      {/* #330 Kein Scene-Chrome mehr — die Bühne (FxStage) zeichnet Name/Status/Farbmodus zentral. */}
    </div>
  );
}

/* #322–#326 Gottgleich-Prunk-Vorschau (PIXI): board-weite Bühne (panelRef) mit unsichtbarem Karten-Anker (cardRef) im
   Zentrum; die übergebene Pixi-Komponente zeichnet den Prunk darüber und feuert im Loop (loop=true → eigenes Re-Fire).
   deckTint schaltet Standard-Palette ↔ Deckfarbe. Lazy (Suspense) → Pixi lädt erst, wenn ein gott-Preview gerendert wird.
   Die geteilte Chrome-„GOTTGLEICH"-Ansage poppt SYNCHRON zum Effekt-Loop (onFire des Prunks → key-Wechsel → Pop neu),
   zentriert, wie in-game (großer Stich → Ansage + Prunk gemeinsam). Fx=null („Gottgleich · Standard") → NUR die Ansage
   (kein Prunk), per Timer geloopt — mehr Animation hat der Standard bewusst nicht. */
function GottScene({ Fx = null, deckTint = false, cycleMs = 2200, look = null, sfx = null, speed = 1, sfxDelay = 0, loopGap = 0 }) { // #330 label/tint entfallen (Chrome zentral in FxStage) · #379 speed = Showcase-Loop-Tempo · loopGap = Pause zwischen Loops (langer Swell)
  // Board-weite Bühne (panelRef) + unsichtbarer Karten-Anker (cardRef) im Zentrum — der Prunk-Fx zeichnet darüber.
  //   (#379-Regression-Fix: beim Loop-Umbau versehentlich entfernt → GottScene crashte mit „panelRef is not defined".)
  const panelRef = useRef(null);
  const cardRef = useRef(null);
  // #327: Standard-Modus = einheitlich Genesis (SHOWCASE_BF); nur der Deckfarbe-Modus zeigt den Pack-Backdrop (look.bf)
  //   + die Pack-Deckfarbe (look.a1/a2). Vorher zeigte der Prunk-Showcase den Pack-BG auch im Standard (Inkonsistenz).
  const bf = battlefieldAssets(deckTint ? (look?.bf || SHOWCASE_BF) : SHOWCASE_BF);
  const deckColor = look?.a1 || "#35e0ff";
  const deckColor2 = look?.a2 || "#ff5db1";
  // #perf: Auf Mobile die Vorschau im lite-Pfad laufen lassen (weniger DPR/FPS/Partikel) — dieselbe Stufe wie in-game
  // auf pointer:coarse. Ohne das lief der Loop-Showcase auf dem Handy in voller Auflösung → Jank.
  const isMobile = useIsMobile();
  const bereit = useGrace();   // #fx-grace: Prunk, Ansage und Ton setzen gemeinsam eine Sekunde später ein
  const [annKey, setAnnKey] = useState(0);
  const pop = () => setAnnKey((k) => k + 1);
  // Jeder Prunk-„Fire": Ansage poppen + Prunk-Sound spielen. #379: Der Loop ist per `speed` so verlangsamt, dass seine
  // Periode ≥ der Soundlänge ist (≥ ~2 s für fx_godlike, ~11 s für den Supernova-Swell) → Ton bei JEDEM Loop synchron,
  // kein Schlucken durch den Cooldown und keine Drossel mehr nötig.
  const fire = () => {
    pop();
    audio.play("fx_godlike", { gain: 0.9 });            // gemeinsamer Gott-Punch (wie in-game), je Loop — deutlich hörbar (0.55→0.9), damit auch die Prunks ohne eigenen Swell klar klingen
    /* Effekt-spezifischer Swell (Supernova) — voll je Loop. `sfxDelay` legt seinen Impuls auf den
       Detonationsblitz: `onFire` feuert beim Effekt-START, der Blitz kommt erst nach LIFE·CHARGE, und
       im Showcase ist der Effekt zusätzlich gestreckt (speed 0,18 → ~1,7 s statt 0,3 s). Ohne diesen
       Vorlauf lag der Impuls im Showcase weit VOR dem Blitz — und ein Nachtunen der In-Game-Zahl
       änderte hier gar nichts. */
    if (sfx) audio.play(sfx, { gain: 0.9, delay: sfxDelay });
  };
  // Ohne Prunk-Effekt (Standard) treibt ein Timer den Ansage-Loop; mit Prunk kommt der Takt aus dessen onFire.
  useEffect(() => {
    if (Fx || !bereit) return undefined;
    pop();
    const id = setInterval(pop, cycleMs);
    return () => clearInterval(id);
  }, [Fx, cycleMs, bereit]);
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      <CardSlot slotRef={cardRef} />
      {Fx && bereit && (
        <Suspense fallback={null}>
          <Fx panelRef={panelRef} cardRef={cardRef} trigger={1} loop deckTint={deckTint} deckColor={deckColor} deckColor2={deckColor2} lite={isMobile} speed={speed} loopGap={loopGap} onFire={fire} />
        </Suspense>
      )}
      {/* #gott: dieselbe Synthwave-Chrome-GOTTGLEICH-Ansage wie In-Game — mittig, etwas kleiner, poppt je Fire synchron
          rein (key={annKey} → Neustart der Pop-Animation). idKey am Key → eindeutige Gradient-/Mask-IDs je Pop. */}
      {/* #335: Wortmarke folgt dem Prunk-Farbmodus — Deckfarbe-Modus → Deck-Zweiton (deckColor→deckColor2), sonst
          Chrome-Zweiton. Vorschau = In-Game (Battlefield tönt „Gottgleich" analog über gottDeck/deckA1/deckA2). */}
      {bereit && <GottChromeWord key={annKey} text={t("bf.big.godlike")} color={deckTint ? deckColor : null} color2={deckTint ? deckColor2 : null}
        gBig={isMobile ? 9 : 11} gMid={6} sheen="once" idKey={`sc${annKey}`}
        style={{ left: "50%", top: "50%", width: "62%", zIndex: 20, animation: "ws-gott-word 1.5s ease-out both" }} />}
      {/* #330 Kein Scene-Chrome mehr — die Bühne (FxStage) zeichnet Name/Status/Farbmodus zentral. */}
    </div>
  );
}

/* #finisher-standard: Vorschau des Gratis-Standard-Finishers — die geschlagene Karte fliegt nach kurzem Liegen einfach
   zur Seite weg (dieselbe as-flyaway-Choreografie wie in-game), im Loop; beim „Sieg" wird der Aufdeck-Sound (cardflip)
   dezent höher gestimmt (rate > 1), passend zur In-Game-Vertonung. Vorschau = In-Game (kein Schnitt, kein Prunk). */
const STD_FIN_TICK_MS = Math.round(2400 / FIN_SPEED); // gleicher Loop-Takt wie die Klinge-Vorschau
const STD_FIN_REST = Math.round(220 / FIN_SPEED);     // Karte liegt kurz still, bevor sie wegfliegt
const STD_FIN_FLY  = Math.round(760 / FIN_SPEED);     // Wegflug-Dauer (as-flyaway)
const STD_FIN_PITCH = 1.14;                            // Flip-Sound beim Sieg dezent angehoben (wie in-game)
function StandardFinisherScene() {
  const [tick, setTick] = useState(0);
  const bf = battlefieldAssets(SHOWCASE_BF);
  const bereit = useGrace();   // #fx-grace
  useEffect(() => {
    if (!bereit) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), STD_FIN_TICK_MS);
    return () => clearInterval(id);
  }, [bereit]);
  // Angehobener Aufdeck-Sound je Loop-Durchlauf (Sieg-Cue) — synchron zum Erscheinen der Karte.
  useEffect(() => {
    if (!bereit) return undefined;   // #fx-grace: auch der Sieg-Cue wartet
    const to = setTimeout(() => audio.play("cardflip", { rate: STD_FIN_PITCH, gain: 0.95 }), 0);
    return () => clearTimeout(to);
  }, [tick, bereit]);
  const cardEl = <Card suit={DEMO_SUIT} value={8} baseRank={8} ionStacks={2} />;
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      <CardSlot>
        {/* key={tick} startet die Wegflug-Animation je Loop neu; erst REST liegen bleiben, dann as-flyaway-r zur Seite.
            #fx-grace: bis dahin liegt die Karte einfach da (dasselbe Bild wie zwischen zwei Durchläufen). */}
        <div key={tick} className="absolute inset-0"
          style={bereit ? { animation: `as-flyaway-r ${STD_FIN_FLY}ms ease-in ${STD_FIN_REST}ms both` } : null}>
          {cardEl}
        </div>
      </CardSlot>
      {/* #330 Kein Scene-Chrome mehr — die Bühne (FxStage) zeichnet Name/Status zentral. */}
    </div>
  );
}

// #317 Cube-Matrix-Showcase: das ECHTE In-Game-Modul (CubeMatrixField) über dem neutralen BF-Bild. Reagiert live auf
// die laufende (Menü-)Musik. deckTint → Deckfarbe statt Standard-Cyan/Magenta. Nur Preview/Dev (wie die anderen GL-FX).
function CubeMatrixPreview({ deckTint = false, wire = false }) {
  // #vorschau-deck: Deckfarbe-Modus → DEIN Deck (Farben + Spielfeld); Standard-Modus → feste Tabelle.
  const deckLook = useContext(DeckLookCtx);
  const look = (deckTint && deckLook) || PREVIEW_LOOK.cubematrix;
  // #327: Standard-Modus = Genesis (SHOWCASE_BF); nur Deckfarbe-Modus zeigt den Pack-BG (look.bf = bf_arcade).
  const bf = battlefieldAssets(deckTint ? look.bf : SHOWCASE_BF);
  const isMobile = useIsMobile();
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  const on = true; // #346: Würfel-Matrix läuft jetzt auch in Produktion → Showcase muss den Effekt überall zeigen (lazy CubeMatrixField)
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {on && (
        <Suspense fallback={null}>
          {/* #vorschau-brett: Die vier Sonderwerte der Werkstatt sind ENTFALLEN (riseBase 1.2 · riseScale 0.55 ·
              yBias 0.32 · depthScale 0.8). Sie waren „visuell in shop-großer Box abgestimmt" — auf eine Box mit
              1,62 : 1. Seit die Vorschau das Brettformat trägt (1,93 : 1, gemessen 668 × 347), stimmen sie nicht
              mehr: der Boden hängt an der HÖHE (`baseY` = 0,28 · H), das Spielfeld-Bild darunter wird per
              `object-cover` beschnitten — beide wandern bei einer Formatänderung unterschiedlich, und das Feld
              schwebte über dem Horizont des Bildes.
              Statt die vier Zahlen neu abzustimmen, benutzt die Vorschau jetzt DENSELBEN Boden wie das Spiel:
              `floorEffectPlacement()` ist laut effectZones.js genau dafür da („nicht selbst hart kodieren").
              Das ist auch inhaltlich richtig — die Vorschau IST das Brett, nur größer. */}
          <CubeMatrixField color={look.a1} color2={look.a2} deckColored={deckTint} reduced={false}
            sun={false} wire={wire} demo {...floorEffectPlacement()} />
        </Suspense>
      )}
    </div>
  );
}

/* #spezial 4-Karten-Showcase: die vier Archetyp-Effekte (Hitze/Moos/Blitz/Eis) nebeneinander, jeweils im MAXIMALEN
   Status, in der gewählten Farbe (Standard-Neon ODER Deckfarbe-Beispiel-Verlauf). Moos/Eis/Blitz hängen als Kartenkind
   in ihrer Karte; die Hitze (FireHead) liegt als Panel-Overlay über der ersten Karte (Flammen loder in den Freiraum). */
const SPEZIAL_DECK_A = "#ff7a3a", SPEZIAL_DECK_B = "#e01234"; // Deckfarbe-Beispiel (roter Verlauf) — Effekte + Hintergrund rot
// #328 Showcase-Loop-Stufen: Eis läuft durch die FrostIce-Schwellen (MASS_MAX=12: 0→4→8→12), Pflanze durch das
// MossGrow-Wachstum (STAGE_MAX=8: 0→8). Beide Bitmaps sind pro Stufe modulweit gecacht → diskretes Stepping ist billig.
const ICE_MASS_SEQ  = [0, 4, 8, 12, 12]; // Halt auf Max (12 doppelt) vor dem Reset auf 0
// #382 Moos Stufe für Stufe (statt in Zweier-Sprüngen): mit der weichen Stufen-Blende liest sich das als echtes
//   Wachsen statt als Diaschau. Alle Stufen sind ohnehin gecacht (und beim Öffnen vorgewärmt) → kostet nichts extra.
const MOSS_GROW_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8]; // Halt auf „reif" (8 doppelt) vor dem Reset
const ICE_MASS_MAX = 12, MOSS_STAGE_MAX = 8; // Reduced-Motion → statisch auf Max
function SpezialScene({ deckTint = false }) {
  const panelRef = useRef(null);
  const fireCardRef = useRef(null);
  const bf = battlefieldAssets(SHOWCASE_BF);
  const DC = SPEZIAL_DECK_A, DC2 = SPEZIAL_DECK_B;
  // #328 Feuer/Blitz animieren selbst; Eis/Pflanze bekamen bisher einen Fixwert (Max) → jetzt durch die Stufen loopen.
  // Bei Reduced-Motion (usePrefersReducedMotion) keinen Loop → statisch auf Max (Endzustand sichtbar, ohne Bewegung).
  const reducedMotion = usePrefersReducedMotion();
  const [iceMass, setIceMass] = useState(reducedMotion ? ICE_MASS_MAX : ICE_MASS_SEQ[0]);
  const [mossGrowth, setMossGrowth] = useState(reducedMotion ? MOSS_STAGE_MAX : MOSS_GROW_SEQ[0]);
  /* #384 Diese Bühne trägt den Standard/Deckfarbe-Umschalter — also hier BEIDE Paletten vorwärmen, die gezeigte
     zuerst. Der Umschalter ist nur sichtbar, solange die Bühne läuft; früher (beim Öffnen der Werkstatt) wäre die
     zweite Palette oft umsonst gebaut, später (beim Klick) zu spät. Beide Aufrufe sind je Farbmodus ein No-op,
     sobald sie einmal gelaufen sind. */
  useEffect(() => { prewarmSpezialStages(deckTint); prewarmSpezialStages(!deckTint); }, [deckTint]);
  useEffect(() => {
    if (reducedMotion) { setIceMass(ICE_MASS_MAX); setMossGrowth(MOSS_STAGE_MAX); return undefined; }
    // Getrennte, unabhängige Timer (am einfachsten): je Stufe ~0,8 s bzw. ~0,62 s, dann von vorn (Reset auf 0).
    // #382 Beide Takte liegen ÜBER der Stufen-Blende (STAGE_FADE_MS) → jede Stufe ist auch wirklich fertig geblendet.
    let iceI = 0, mossI = 0;
    setIceMass(ICE_MASS_SEQ[0]); setMossGrowth(MOSS_GROW_SEQ[0]);
    const iceT = setInterval(() => { iceI = (iceI + 1) % ICE_MASS_SEQ.length; setIceMass(ICE_MASS_SEQ[iceI]); }, 820);
    const mossT = setInterval(() => { mossI = (mossI + 1) % MOSS_GROW_SEQ.length; setMossGrowth(MOSS_GROW_SEQ[mossI]); }, 620);
    return () => { clearInterval(iceT); clearInterval(mossT); };
  }, [reducedMotion]);
  const CARDS = [
    { key: "feuer", label: "Feuer", ref: fireCardRef, fx: null },
    { key: "blitz", label: "Blitz", ref: null, fx: <CardIonStorm active color={deckTint ? DC : "#5ec8f0"} /> },
    { key: "eis", label: "Eis", ref: null, fx: <FrostIce mass={iceMass} deckTint={deckTint} deckColor={DC} deckColor2={DC2} /> },
    { key: "pflanze", label: "Pflanze", ref: null, fx: <MossGrow growth={mossGrowth} deckTint={deckTint} deckColor={DC} deckColor2={DC2} /> },
  ];
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: deckTint ? "#170509" : "#0b0a16" }}>
      {/* Standard-Modus: neutrales Battlefield-Bild + dunkler Verlauf. Deckfarbe-Modus: KEIN BF-Bild, dafür ein klar zur
          Deckfarbe passender Hintergrund (hier Rot) — dunkelroter Grund + Deck-Verlauf-Glows (oben deckColor, unten deckColor2). */}
      {!deckTint && bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.6 }} />}
      {!deckTint && <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10cc,#0c0c1055 45%,#0c0c10dd)" }} />}
      {deckTint && <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${DC}1f, #180509 42%, ${DC2}33), radial-gradient(140% 95% at 50% 120%, ${DC2}99, transparent 60%), radial-gradient(125% 72% at 50% -12%, ${DC}77, transparent 52%)` }} />}
      <div className="absolute inset-0 flex items-end justify-center gap-1.5 px-2" style={{ paddingBottom: "11%" }}>
        {CARDS.map((c) => (
          <div key={c.key} className="relative flex flex-col items-center gap-1" style={{ height: "60%" }}>
            <div ref={c.ref || undefined} className="relative rounded-md overflow-visible"
              style={{ height: "100%", aspectRatio: CARD_RATIO, background: "linear-gradient(180deg,#26304a,#141a28)", boxShadow: "0 2px 9px #000a" }}>
              {/* #typo: 800 ist hier Absicht — die Zahl steht auf einer Karten-ATTRAPPE und soll wie eine
                  Kartenzahl wirken, nicht wie ein Oberflächen-Wert. Sie liegt damit außerhalb der
                  400/500/600-Leiter (zweite Ausnahme neben der Groß-Ansage in Battlefield.jsx). */}
              <div className="absolute inset-0 flex items-center justify-center" style={{ color: "#dde6f5", fontWeight: 800, fontSize: "clamp(13px,3vw,20px)" }}>7</div>
              {c.fx && <Suspense fallback={null}>{c.fx}</Suspense>}
            </div>
            {/* #330 Archetyp-Kartenlabels entfernt — kein Scene-Chrome mehr (Farbmodus zeigt zentral die Bühne). */}
          </div>
        ))}
      </div>
      {/* Hitze = FireHead (Panel-Overlay über der ersten Karte); Flammen loder nach oben in den Freiraum über den Karten. */}
      <Suspense fallback={null}><FireHead heat={1} panelRef={panelRef} cardRef={fireCardRef} deckTint={deckTint} deckColor={DC} deckColor2={DC2} lite /></Suspense>
    </div>
  );
}

// Große In-Game-Vorschau eines Effekts im Kauffenster. Karten-Animationen → Karte/BF-Demo; Finisher/Krit →
// echte In-Game-Komponente; Gottgleich (inkl. Standard) → das komplette Ereignis nachgespielt.
function GlobalFxScenePreview({ fx, deckTint = false, sun = true, wire = false }) {
  /* #vorschau-deck: Im Deckfarbe-Modus zeigt die Bühne DEIN Deck (Farben + Spielfeld), im Standard-Modus
     weiter die feste Tabelle. Der Kontext wird EINMAL gelesen — die Auswahl unten ist eine if-Kette, ein
     Hook je Zweig wäre ein bedingter Hook-Aufruf. */
  const deckLook = useContext(DeckLookCtx);
  const look = (key) => (deckTint && deckLook ? deckLook : PREVIEW_LOOK[key]);
  // #kategorien: Hintergrund-Effekt (Aurora) / Hintergrund-Finisher (Glutfunken) / „Kein Feld-Effekt": echte
  // In-Game-Komponente (FieldFxLayer bzw. GPU-Emitter) über dem BF-Bild.
  if (fx.preview === "cubematrix") return <CubeMatrixPreview deckTint={deckTint} sun={sun} wire={wire} />; // #317 musik-reaktives Würfelfeld
  if (["aurora", "neonsurf", "starfield", "none"].includes(fx.preview)) return <FieldFxPreview effect={fx.preview} deckTint={deckTint} />; // #glutfunken-raus · #345 neonsurf
  if (ANIM_LAYER[fx.preview]) return <CardAnimPreview anim={fx.preview} />; // #318 Karten-Animation über echter Vorschau-Karte
  if (fx.preview === "gottStandard") return <GottScene Fx={null} deckTint={deckTint} look={look("gottStandard")} />; // #322 „Gottgleich · Standard" = nur der Chrome-Schriftzug (kein Prunk)
  if (fx.preview === "standard") return <StandardFinisherScene />;
  if (fx.preview === "klinge") return <FinisherScene variant={fx.preview} deckTint={deckTint} look={look("klinge")} />;
  if (fx.preview === "scorch") return <ScorchScene deckTint={deckTint} look={look("scorch")} />; // #319 Scorch-Finisher (Laser + organischer Burn)
  if (fx.preview === "hologrid") return <HologridScene deckTint={deckTint} look={look("hologrid")} />; // #321 Hologrid-Slice-Finisher (Pixi)
  if (fx.preview === "spezial") return <SpezialScene deckTint={deckTint} />; // #328 4-Karten-Showcase (Feuer/Blitz/Eis/Pflanze) — Farbmodus aus archColor (deckTint)
  if (fx.preview === "blackhole") return <BlackholeScene deckTint={deckTint} />; // #320 Schwarzes-Loch-Finisher (persistentes Serien-Loch)
  // #gott-showcase: je Effekt eigener Backdrop + eigene Deckfarbe (look) fürs Deckfarbe-Beispiel (Name/Status/Farbmodus
  //   zeichnet zentral die Bühne, #330).
  // #379 Showcase-Loop verlangsamen (speed<1), damit die Loop-Periode ≥ Soundlänge ist → Ton bei JEDEM Loop synchron.
  //   Periode = Basis-Loop-Länge (LIFE/TOTAL + TAIL) / speed. Ziel: ≥ ~2,4 s (fx_godlike 1,8 s); Supernova ≈ Swell (~11 s).
  if (fx.preview === "sonnenPuls") return <GottScene Fx={SonnenPulsPixi} deckTint={deckTint} look={look("sonnenPuls")} speed={0.45} />; // Basis 1,15 s → ~2,6 s
  if (fx.preview === "laserFaecher") return <GottScene Fx={LaserFaecherPixi} deckTint={deckTint} look={look("laserFaecher")} sfx="fx_laserfan" speed={0.48} />; // Basis 1,2 s → ~2,5 s · eigener Swell
  if (fx.preview === "prismaKaskade") return <GottScene Fx={PrismaKaskadePixi} deckTint={deckTint} look={look("prismaKaskade")} sfx="fx_prisma" speed={0.85} />; // Basis 2,11 s → ~2,5 s · eigener Swell
  // #: loopGap 5,5 s → Periode ~8 s: der ~11-s-Swell (fx_holocube) läuft weitgehend durch, bevor die nächste Animation
  //    startet — ohne Gap schluckte der 3-s-Cooldown jeden zweiten Ton. [TUNING: höher = kein Überlappen, niedriger = flotter]
  if (fx.preview === "holoCube") return <GottScene Fx={HoloCubePixi} deckTint={deckTint} look={look("holoCube")} sfx="fx_holocube" speed={0.72} loopGap={5.5} />; // Basis 1,8 s → ~2,5 s · eigener Swell
  if (fx.preview === "supernova") return <GottScene Fx={SupernovaPixi} deckTint={deckTint} look={look("supernova")} sfx="fx_supernova" speed={SUPERNOVA_SHOWCASE_SPEED} sfxDelay={supernovaSwellDelay(SUPERNOVA_SHOWCASE_SPEED)} />; // Basis 2,05 s → ~11 s (voller Swell) · #377/#379
  // Fallback (kein bekannter Vorschautyp): schlichte Battlefield-Szene.
  const bf = battlefieldAssets(SHOWCASE_BF);
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
    </div>
  );
}

// #306 Battlefield-Ambiente-Vorschau: das echte BF-Bild (aktuell gespielte Version) + der ECHTE In-Game-Layer
// (FieldFxLayer) in der Demo-Deckfarbe. Ein Intervall bumpt sweepId → periodische „Stich"-Reaktion wie im Spiel.
// „none" zeigt nur das BF-Bild. Vorschau = In-Game (dieselbe Komponente, kein Drift).
// Hit-Tier-Leiter für die Feld-Finisher-Eskalations-Vorschau (Pixi, Komet/Sternenfeld): Schwach → Gottgleich.
const EMBER_TIER_LABELS = ["Schwach", "Stark", "Brutal", "Irre", "Gottgleich"];
// Aurora/Brandung/Leuchten laufen in der Vorschau über DENSELBEN Kompositor wie im Spiel — es gibt keinen zweiten
// Renderpfad mehr, den die Vorschau versehentlich zeigen könnte. Genau hier saß die Drift-Gefahr am größten: eine
// Vorschau, die etwas anderes zeigt als das Spiel, ist schlimmer als gar keine.
const auroraGLActive = (effect) => effect === "aurora";
function FieldFxPreview({ effect, deckTint = false }) {
  // #vorschau-deck: Deckfarbe-Modus → DEIN Deck (Farben + Spielfeld); Standard-Modus → feste Tabelle.
  const deckLook = useContext(DeckLookCtx);
  const look = (deckTint && deckLook) || PREVIEW_LOOK[effect] || { bf: SHOWCASE_BF, a1: DEMO_C, a2: "#b06bff" };
  // #327: Standard-Modus = einheitlich Genesis (SHOWCASE_BF); nur der Deckfarbe-Modus zeigt den Pack-BG (look.bf).
  //   Die Effektfarbe (look.a1/a2) bleibt davon unberührt — Standard nutzt weiter den festen Standard-Look des Effekts.
  const bf = battlefieldAssets(deckTint ? look.bf : SHOWCASE_BF);
  const isMobile = useIsMobile();
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  const [sweep, setSweep] = useState(1);
  const [tierStep, setTierStep] = useState(0);
  const tierRef = useRef(0); // #komet: spiegelt tierStep (der setTierStep-Updater darf keinen Sound spielen → StrictMode ruft ihn doppelt)
  const [neonSurge, setNeonSurge] = useState(null); // #383 Neon-Brandung: 6-s-Impact-Puls { id, mag } (null = ruhige See)
  const [neonAnn, setNeonAnn] = useState(null);     // #383 Ansage-Pop zum Impact { id, label, color }
  const neonRef = useRef(0);                         // rotiert die Impact-Stufe (Stark/Brutal/Irre)
  const pixiField = PIXI_FIELD_KEYS.includes(effect); // #346: Sternenfeld/Komet → Pixi-Bühne im Showcase, AUCH in Prod (lazy PixiStage) — spiegelt den In-Game-Renderpfad
  const auroraGL = auroraGLActive(effect);                                // Aurora → eigene WebGL-Canvas (auch in Prod; Preview behält den DOM-A/B-Schalter)
  const neonsurfGL = effect === "neonsurf";                                // #345 Neon-Brandung → eigene WebGL-Canvas (auch in Prod, kein Pixi-Gate)
  useEffect(() => {
    if (effect === "none") return undefined;
    // Sweep-Puls je Tick; Pixi-Feldeffekt (Komet) eskaliert zusätzlich durch die Hit-Tier-Leiter (Schwach → Gottgleich).
    const id = setInterval(() => {
      setSweep((s) => s + 1);
      if (pixiField) {
        // #311: den Pixi-Feldeffekt (Sternenfeld/Komet) durch die Tier-Leiter eskalieren. Nächsten Tier über den Ref
        // bestimmen (nicht im Updater Sound spielen — StrictMode ruft ihn doppelt).
        const nextTier = (tierRef.current + 1) % EMBER_TIER_LABELS.length;
        tierRef.current = nextTier; setTierStep(nextTier);
        // #komet: Sternenfeld-Sound auch im Showcase — Datei nach gezeigtem Tier (≥1 Woosh+Impact, sonst kleiner Komet).
        if (effect === "starfield") audio.play(nextTier >= 1 ? "fx_comet_impact" : "fx_comet", { gain: 0.27 });
      }
      // #383: der per-Tick-Splash der Neon-Brandung entfällt hier — sie hat jetzt einen eigenen ruhigen 6-s-Impact (unten).
    }, 1500);
    return () => clearInterval(id);
  }, [effect, pixiField]);

  // #383 Neon-Brandung im Showcase spiegelt In-Game: ruhige Plasma-See als Default (leise Ambience `fx_neonsurf`), und
  //   alle ~6 s EIN angesagter Impact — ein Surge-Puls + `fx_neonsurf_splash` + eine Ansage (Stufe rotiert Stark/Brutal/
  //   Irre → Magnitude 0.7/1.0/1.4, wie die Groß-Ansage in Battlefield). Zwischen den Impacts KEIN Surge → See bleibt ruhig.
  useEffect(() => {
    if (effect !== "neonsurf") return undefined;
    const bed = audio.loop("fx_neonsurf", { gain: 0.55, loopStart: 1.5, loopEnd: 28.4 }); // dezente Dauer-Ambience (wie Battlefield)
    const TIERS = [{ mag: 0.7, label: "Stark", color: "#5fe0f7" }, { mag: 1.0, label: "Brutal", color: "#b3a8f5" }, { mag: 1.4, label: "Irre", color: "#f5c76a" }];
    const impact = () => {
      const t = TIERS[neonRef.current % TIERS.length]; neonRef.current += 1;
      const id = neonRef.current;
      setNeonSurge({ id, mag: t.mag });
      setNeonAnn({ id, label: t.label, color: t.color });
      audio.play("fx_neonsurf_splash", { gain: 0.6 + 0.7 * t.mag, bass: t.mag >= 1.2 ? 3 : 0 }); // Pegel wie in-game
    };
    const first = setTimeout(impact, 900); // erster Impact bald nach dem Öffnen (nicht 6 s warten)
    const iv = setInterval(impact, 6000);
    return () => { clearTimeout(first); clearInterval(iv); audio.stopLoop(bed, { fade: 0.4 }); };
  }, [effect]);
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {/* Feld-Finisher (Komet/Sternenfeld/Glutfunken) auf der Pixi-Emitter-Bühne. */}
      {pixiField && (
        <Suspense fallback={null}>
          <PixiStage className="absolute inset-0 z-[2]" effect={effect} color={look.a1} color2={look.a2} deckTint={deckTint}
            score={250000} reduced={false} lite={false}
            sweepId={sweep} sweepDur={1100} win hitTier={tierStep} />
        </Suspense>
      )}
      {auroraGL && (
        <div className="absolute inset-0 z-[2] pointer-events-none">
          {/* #359: Die Showcase-Box ist niedrig+breit — der In-Game-Bogen (Scheitel bei ~1,2 der Höhe) würde oben
              abgeschnitten. bandScale/bandShift legen NUR im Showcase den Bogen tiefer + leicht gestaucht in die Box
              (voller Bogen sichtbar). In-Game bleibt bei den Defaults (1/0) → unverändert. [TUNING] */}
          <FieldLayer layer="aurora" color={look.a1} color2={look.a2} deckColored={deckTint} animate bandScale={1.12} bandShift={0.2} />
        </div>
      )}
      {/* #383 Neon-Brandung — ruhige See als Default; der Surge kommt NUR beim 6-s-Impact (neonSurge, sonst null). */}
      {neonsurfGL && (
        <div className="absolute inset-0 z-[2] pointer-events-none">
          <FieldLayer layer="neonsurf" color={look.a1} color2={look.a2} deckColored={deckTint} animate surge={neonSurge} />
        </div>
      )}
      {/* #383 Ansage zum Impact (Stark/Brutal/Irre) — poppt synchron zum Surge/Splash; key erzwingt den Neustart der Pop-Animation. */}
      {neonsurfGL && neonAnn && (
        <span key={neonAnn.id} className="absolute font-extrabold tracking-wider pointer-events-none z-[3]"
          style={{ left: "50%", top: "44%", fontSize: 44, color: neonAnn.color, textShadow: `0 0 20px ${neonAnn.color}cc`, animation: "ws-gott-word 1.6s ease-out both" }}>
          {neonAnn.label}
        </span>
      )}
      {/* #330 Tier/Score-Chip entfernt — kein Scene-Chrome mehr (nur noch das 4-Ecken-Template der Bühne). */}
    </div>
  );
}

// #318 Karten-Animations-Vorschau: eine ECHTE Spielkarte (Card.jsx, 104×144) mittig auf neutralem Feld, darüber die
// geteilte CardFxStage mit dem gewählten Dauer-Layer — dieselbe Engine wie in-game (kein Drift). Pixi-only → nur im
// Preview/Dev-Build; sonst zeigt die Vorschau die reine Karte (die Effekte laufen in Produktion ohnehin nicht).
const CARDFX_PREVIEW_ON = (import.meta.env.VITE_PREVIEW === "1" || import.meta.env.DEV);
function CardAnimPreview({ anim }) {
  /* #vorschau-deck: Karten-Animationen haben KEINEN Standard/Deckfarbe-Schalter — sie laufen im Spiel
     immer in der Deckfarbe (docs/decisions/engineering-log-2026-08.md #318). Die Vorschau nimmt deshalb ohne Gate das aktive Deck, samt
     seinem Spielfeld als Grund; die feste Tabelle (neutraler Genesis-Grund) bleibt nur der Rückfall. */
  const deckLook = useContext(DeckLookCtx);
  const look = deckLook || PREVIEW_LOOK[anim] || { bf: SHOWCASE_BF, a1: DEMO_C, a2: "#b06bff" };
  const bf = battlefieldAssets(look.bf);
  const isMobile = useIsMobile();
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  const panelRef = useRef(null);
  const cardRef = useRef(null);
  const scale = useContext(SceneScaleCtx);
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg grid place-items-center" style={{ background: "#0b0a16" }}>
      {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {/* #vorschau-brett: Diese Szene zentriert per Grid statt absolut — der Maßstab kommt deshalb direkt
          als `transform` (kein CardSlot, der die Positionierung mitbrächte). `getBoundingClientRect` der
          CardFxStage liefert die transformierte Box, der Effekt sitzt also weiter bündig auf der Karte. */}
      <div ref={cardRef} className="relative" style={{ zIndex: 1, transform: `scale(${scale})` }}>
        <Card suit="B" value={7} />
      </div>
      {CARDFX_PREVIEW_ON && (
        <Suspense fallback={null}>
          <CardFxStage panelRef={panelRef} cards={[{ ref: cardRef, active: true, num: 7, color: suitColor("B") }]}
            layers={{ [ANIM_LAYER[anim]]: true }} color={look.a1} color2={look.a2} tier={3} />
        </Suspense>
      )}
    </div>
  );
}

// Karten-Vorschau: illustrierte Karte (Front = Rahmen, Back = Cover), vollständig (object-contain) + optionaler
// Effekt. Frame Glow = pulsierender Schein am Kartenrand; Holo Swipe = wandernder Glanz-Streifen.
function CardPreview({ deckId, face = "back", className = "", style }) {
  const img = deckAssets(deckId)[face] || deckAssets(deckId).back;
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}
      style={{ aspectRatio: CARD_RATIO, background: "#0b0a16", ...style }}>
      <img src={img} alt="" className="absolute inset-0 w-full h-full object-contain rounded-lg" />
    </div>
  );
}

// Battlefield-Vorschau: echtes BF-Bild in der AKTUELL gespielten Version (mobile/desktop, gleiche 640px-
// Schwelle wie im Spiel). showVersion blendet ein kleines Label ein, welche Version man gerade sieht.
/* `ratio` ist der Zuschnitt des Rahmens, nicht des Bildes: 16 / 10 ist der Kompromiss der Handy-Fassung,
   in der die Vorschau hoch stehen muss. Die Spielfelder selbst sind 1600 × 640 (2,5 : 1) — wo Platz in
   die Breite ist (Desktop-Vorschau), zeigt „1600 / 640" das ganze Bild statt eines Ausschnitts. */
function BfPreview({ bfId, className = "", showVersion = false, ratio = "16 / 10" }) {
  const bf = battlefieldAssets(bfId);
  const isMobile = useIsMobile();
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ aspectRatio: ratio, background: "#0b0a16" }}>
      {src ? <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 grid place-items-center text-xs opacity-40">{t("shop.noBattlefield")}</div>}
      {showVersion && bf && (
        <span className="absolute top-1.5 left-1.5 text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: "#0b0a16cc", border: "1px solid #34333f", color: "#9a97ab" }}>{isMobile ? "MOBILE" : "DESKTOP"}</span>
      )}
    </div>
  );
}

// Kleine Deck-Rücken-Miniatur (für Pack-Kacheln). object-contain → nie angeschnitten.
function DeckThumb({ deckId, className = "", face = "back", style }) {
  const img = deckAssets(deckId)[face];
  // #perf C3: Der Shop rendert ein Raster aus ~15–20 Deck-Thumbnails. `loading="lazy"` lädt nur die sichtbaren Kacheln
  // (Off-Screen erst beim Scrollen) → deutlich weniger Bytes beim Öffnen der Kollektion auf Mobile; `decoding="async"`
  // hält das Bild-Decoding vom Main-Thread. Rein additive Attribute → kein visueller/Desktop-Unterschied.
  return <img src={img} alt="" loading="lazy" decoding="async" className={`object-contain ${className}`} style={{ aspectRatio: CARD_RATIO, background: "#0b0a16", ...style }} />;
}

const EYEBROW = "flex items-center gap-2 text-[10px] font-extrabold tracking-[0.13em] uppercase mt-4 mb-2";

/* ============================ Haupt-Screen ============================ */
export function CustomizeScreen({ options, profile, onChoose, onClose, onProfileChange }) {
  useEscape(onClose);
  // #perf-shop (Plan A): beim Öffnen der Werkstatt alle Effekt-Chunks idle vorladen → kein Lade-Hitch beim ersten
  //   Anzeigen eines Effekts. Läuft nur einmal pro Session (interner Guard).
  // #382: dabei auch die Stufen-Bitmaps der Skill-Effekt-Bühne im Farbmodus, den sie gerade zeigt (options.archColor).
  //   Der Farbmodus darf ruhig in den Deps stehen — der Guard in prefetchFxChunks macht jeden weiteren Lauf zum No-op.
  const spezialDeckTint = options?.archColor === "deck";
  useEffect(() => { prefetchFxChunks(spezialDeckTint); }, [spezialDeckTint]);
  const p = profile || {};
  const wide = useIsWide();                          // #desktop: ab 1280 px steht das Pack-Detail fest daneben
  const [tab, setTab] = useState("packs");           // "packs" | "challenges" | "fx"
  const [packOv, setPackOv] = useState(null);        // offene Pack-Detailansicht: { cat, idx } | null
  const [packSel, setPackSel] = useState("back");   // "back" | "front" | "bg" — Cover (Rücken) zuerst, dann Front
  const deckId = options?.deckId || "default";
  /* #packsort: Die Sortierung liegt HIER, nicht in `PacksView` — `catList` ist die eine Quelle für die
     Kacheln, den Index im Detail (`packOv.idx`) UND das Blättern mit ‹ ›. Läge sie in der Ansicht, zeigte
     das Detail nach dem Umschalten auf ein anderes Pack als die angetippte Kachel. Ein Zustand für beide
     Reiter: wer nach Farbe sucht, sucht auf beiden so. */
  const [sort, setSort] = useState(SORT_DEFAULT);
  // #Shop-Reorg: Detail navigiert innerhalb seiner Kategorie; aktives Pack steht nach Standard vorn (orderPacks).
  const listFor = (cat, mode) => sortPacks(orderPacks(cat === "challenges" ? CHALLENGES_TAB : PACKS_TAB, deckId), mode);
  const catList = (cat) => listFor(cat, sort);
  /* Beim Umschalten wandert das offene Pack an eine andere Stelle. Statt das Detail zu schließen, wird sein
     Index auf DASSELBE Pack in der neuen Reihenfolge umgerechnet — ab 1280 px steht es dauerhaft daneben,
     ein Zuklappen sähe dort wie ein Fehler aus. */
  const toggleSort = () => {
    const next = nextSort(sort);
    setPackOv((o) => {
      if (!o) return o;
      const cur = listFor(o.cat, sort)[o.idx];
      const i = listFor(o.cat, next).indexOf(cur);
      return i >= 0 ? { ...o, idx: i } : o;
    });
    setSort(next);
  };
  const dpBal = Math.max(0, Math.floor(Number(p.deckPoints) || 0)); // #299 Deckpunkte — Währung der Packs (SP wird in der Werkstatt nicht gezeigt)

  // #fx-floater: Höhe des Sticky-Kopfs messen → die Effekt-Vorschau klebt exakt darunter (mitlaufender Floater, kein Überlappen).
  const headRef = useRef(null);
  const [headH, setHeadH] = useState(116); // Startwert ≈ Kopfhöhe, vermeidet 1-Frame-Sprung vor der Messung
  useEffect(() => {
    const el = headRef.current;
    if (!el) return undefined;
    const measure = () => setHeadH(el.offsetHeight || 0);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [tab]);

  /* #desktop: Das Detail steht ab 1280 px fest neben dem Katalog — also darf es nie leer sein. Beim Öffnen
     und bei jedem Reiterwechsel wird das erste Pack der Kategorie vorgewählt; `orderPacks` stellt das
     ausgerüstete nach vorn, man landet also auf dem eigenen Deck. Bis 1279 px passiert hier nichts: dort ist
     das Detail ein Overlay, das erst auf Tippen aufgeht (`packOv` bleibt null, bis der Spieler wählt). */
  useEffect(() => {
    if (!wide || tab === "fx") return;
    setPackOv((cur) => (cur && cur.cat === tab ? cur : { cat: tab, idx: 0 }));
  }, [wide, tab]);

  const buy = (fn) => { if (onProfileChange) onProfileChange(fn(p)); };
  const activate = (pack) => onChoose(hasBattlefield(pack) ? { deckId: pack.deckId, battlefieldId: pack.bfId } : { deckId: pack.deckId });
  // #tiered: eine bestimmte Stufe aktivieren + als zuletzt gewählte Stufe merken (tierSel[packId]=deckId → Zufalls-Modus).
  const activateTier = (pack, tier) => onChoose({ deckId: tier.deckId, battlefieldId: tier.bfId,
    tierSel: { ...((options && options.tierSel) || {}), [pack.id]: tier.deckId } });

  /* Doppelklick auf eine Kachel = ausrüsten (die Kachel entscheidet, WAS sie anbietet — s. PacksView).
     Bewusst dieselben zwei Wege wie die Knöpfe im Detail, damit „doppelt geklickt" und „im Detail
     ausgerüstet" nicht auseinanderlaufen können; ein Mehrstufen-Pack merkt sich dabei seine Stufe. */
  const equipFromTile = (pack, tier) => (tier ? activateTier(pack, tier) : activate(pack));

  const openPack = (cat, i) => { setPackOv({ cat, idx: i }); setPackSel("back"); };
  const stepPack = (d) => { setPackOv((o) => (o ? { ...o, idx: (o.idx + d + catList(o.cat).length) % catList(o.cat).length } : o)); setPackSel("back"); };

  // Ist ein Kauffenster offen, wird der Shop-Hintergrund NICHT mitgescrollt (kein Scroll-Durchgriff auf iOS).
  /* Sperrt das Scrollen des Katalogs, solange das Detail als Overlay darüber liegt. Ab 1280 px ist das
     Detail KEIN Overlay mehr, sondern die zweite Spalte — dort muss der Katalog weiter scrollen können,
     sonst wäre er auf die sichtbaren zwölf Packs eingefroren. */
  const anyOverlay = !!packOv && !wide;
  // Horizontaler Swipe → Reiterwechsel. Solange das Pack-Detail offen ist (eigene ‹ ›/Swipe-Geste), unterdrückt.
  const tabSwipe = useTabSwipe(["packs", "challenges", "fx"], tab, setTab, { guard: () => anyOverlay });

  /* #vorschau-deck: EIN Provider am Wurzelknoten. Der Look hängt allein an der ausgerüsteten deckId — er
     wird deshalb hier gemerkt statt in jeder Szene neu abgeleitet (dreizehn Lesestellen, s. DeckLookCtx). */
  const deckLook = useMemo(() => activeLook(deckId), [deckId]);
  return overlayPortal((
    <DeckLookCtx.Provider value={deckLook}>
    <div className="fixed inset-0 overlay-root cz-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-hidden"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <style>{FX_CSS}</style>
      {/* #394 FESTE Kartenhöhe (wie Bestenliste #385) → das Fenster bleibt über ALLE Reiter (Packs/Challenges/Effekte)
          UND alle Filter gleich groß; auch eine leere Ansicht („Nichts in dieser Ansicht") lässt es nicht schrumpfen.
          Gescrollt wird nur noch der Inhaltsbereich darunter — der Sticky-Kopf lebt weiter IN diesem Scroll-Container,
          damit die Effekt-Bühne (FxView, `stickyTop`) weiterhin exakt unter dem Kopf klebt. */}
      {/* #deckui: äußerer Modal-Rahmen zieht die aktive Deckfarbe (as-panel-deck) — wie die übrigen Werkstatt-/
          Options-Panels. NUR die Haupt-Shop-Karte; die Effekt-Vorschau-Bühnen (FxStage/Scenes) bleiben unberührt. */}
      <div className="w-full max-w-xl dt:max-w-none rounded-2xl my-auto as-panel as-panel-deck cz-card flex flex-col overflow-hidden"
        style={{ ...MODAL_CARD, height: "min(88vh, 760px)" }} onClick={(e) => e.stopPropagation()}>
        {/* `overlay-card` (iOS-Momentum + overscroll-contain) wandert mit ans jetzt scrollende Element. */}
        <div className={`overlay-card cz-scroll flex-1 min-h-0 px-5 pb-5 sm:px-6 sm:pb-6 ${anyOverlay ? "overflow-hidden" : "overflow-y-auto"}`} {...tabSwipe}>
          {/* Sticky Kopf */}
          <div ref={headRef} className="sticky top-0 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 relative cz-head" style={{ background: STICKY_HEAD_BG }}>
            <TopHairline />
            {/* #werkstatt: Der Kopf trägt ab 1280 px dasselbe Raster wie der Upgrade-Baum — Titel,
                Guthaben, Auskunft, Aktionen in EINER Zeile, darunter die Haarlinie und dann die Reiter.
                `cz-topline` und `cz-headrow` sind dafür oberhalb der Schwelle reine Klammern
                (`display: contents`), damit ihre Kinder direkt im Raster liegen. Unterhalb bleiben sie
                die Flex-Container, die sie immer waren — die Handy-Kopfzeile ändert sich nicht. */}
            <div className="cz-topline flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="text-lg dt:text-2xl font-bold whitespace-nowrap">{t("shop.title")}</h2>
              <div className="cz-headrow flex items-center gap-2.5 shrink-0 ml-auto">
                {/* Nur DP anzeigen — die Werkstatt-Währung (Packs UND Effekte, #307). SP ist hier irrelevant (nur der
                    Upgrade-Baum nutzt SP) und wird deshalb nicht mehr gezeigt. Kompakte Inline-Währung wie im Upgrade-Screen. */}
                <span className="cz-bal flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-lg dt:text-3xl font-extrabold tabular-nums" style={{ color: "#35c6e6" }}>{dpBal}</span>
                  <span className="text-[10px] dt:text-[13px] font-bold tracking-wider" style={{ color: "#35c6e6", opacity: .8 }}>DP</span>
                </span>
                <button onClick={onClose} className="cz-close as-edge-neutral as-edge-thin shrink-0 px-3 py-1.5 rounded-lg text-sm">{t("common.close")}</button>
              </div>
              {/* Auskunft wie im Baum: was der Reiter enthält, und was ein Antippen bewirkt. Erst ab
                  1280 px — am Handy ist die Kopfzeile für eine dritte Spalte zu schmal. */}
              {tab !== "fx" && (
                <div className="cz-readout hidden dt:block">
                  <div className="text-[11px] tabular-nums" style={{ color: "#a6a6b0" }}>
                    {t(tab === "challenges" ? "shop.head.challenges" : "shop.head.packs",
                      { n: catList(tab).length, own: catList(tab).filter((pk) => (pk.kind === "std" ? "own" : packState(p, pk)) === "own").length })}
                  </div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: "#71717c" }}>{t("shop.head.hint")}</div>
                </div>
              )}
            </div>
            {/* Die Haarlinie trennt Kopf und Inhalt — dieselbe Zeile in Deckfarbe wie im Upgrade-Baum. */}
            <div className="cz-hair hidden dt:block h-[2px] w-full rounded-full"
              style={{ background: "linear-gradient(90deg, var(--deck-a1, #9b82f0), var(--deck-a2, #26c6e6), var(--deck-a1, #9b82f0))", opacity: .7 }} />
            {/* Tab-Umschalter: Packs · Challenges · Effekte.
                #kante: Die Reiter tragen das Farbsignal an der UNTERkante, nicht links wie Knöpfe und Karten.
                „Kante statt Fläche" heißt ein Signal an einer Kante — bei einer waagerechten Reiterzeile wären
                drei senkrechte Striche ein Kampf gegen die Leserichtung. Der aktive Reiter bekommt zusätzlich
                einen ganz flachen Anlauf von unten; die inaktiven sind reiner Text, ohne Kasten. */}
            {/* #deckui: Der TAB-Aktiv-Akzent ist reines Chrome → alle drei Reiter ziehen die aktive Deckfarbe
                (var(--deck-a1)); der bisherige Ton je Reiter bleibt als Fallback, falls kein Deck gesetzt ist. */}
            <div className="cz-tabs flex gap-1.5 mt-3">
              {[["packs", "shop.tab.packs", "var(--deck-a1, #9b82f0)"], ["challenges", "shop.tab.challenges", "var(--deck-a1, #e05555)"], ["fx", "shop.tab.fx", "var(--deck-a1, #d4a63a)"]].map(([m, label, col]) => {
                const on = tab === m;
                return (
                  <button key={m} onClick={() => setTab(m)} role="tab" aria-selected={on}
                    className="flex-1 text-[13px] font-semibold tracking-wide px-3 pt-2 pb-1.5 rounded-t-md transition-colors"
                    style={on
                      ? { color: "#fff", borderBottom: `2px solid ${col}`,
                          background: `linear-gradient(180deg, transparent 45%, color-mix(in srgb, ${col} 14%, transparent))` }
                      : { color: "#8a8a95", borderBottom: "2px solid transparent", background: "transparent" }}>
                    {t(label)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* `cz-split` ist bis 1279 px `display: contents` — der Katalog fällt unverändert in den Scroller
              durch. Ab 1280 px wird daraus das Zwei-Spalten-Raster: Katalog links, Pack-Detail rechts. */}
          <div className="cz-split">
            {/* `cz-mainscroll` ist ab 1280 px der Scroller INNERHALB des Katalog-Panels. Der Rahmen sitzt
                am Panel selbst — läge beides am gleichen Element, wanderte die untere Rahmenkante beim
                Scrollen mitten durch die Kacheln. Bis 1279 px ist der Wrapper `display: contents`, dort
                ändert sich also nichts. */}
            <div className="cz-main as-ring as-ring-quiet">
              <i className="as-ring-run" aria-hidden="true" />
              <div className="cz-mainscroll">
                {tab === "packs" ? <PacksView p={p} deckId={deckId} list={catList("packs")} cat="packs" onOpen={openPack} onEquip={equipFromTile} options={options} onOption={onChoose} sel={wide ? packOv?.idx : null} sort={sort} onSort={toggleSort} />
                  : tab === "challenges" ? <PacksView p={p} deckId={deckId} list={catList("challenges")} cat="challenges" onOpen={openPack} onEquip={equipFromTile} sel={wide ? packOv?.idx : null} sort={sort} onSort={toggleSort} />
                  : <FxView p={p} options={options} onChoose={onChoose} onBuyFx={(fx) => buy((pf) => buyGlobalFx(pf, fx))} stickyTop={headH} wide={wide} />}
              </div>
            </div>
            {/* Ab 1280 px steht das Detail hier fest; darunter bleibt es das Portal-Overlay unten. */}
            {wide && packOv && tab !== "fx" && (
              <div className="cz-side as-ring as-ring-quiet">
                <i className="as-ring-run" aria-hidden="true" />
                <PackDetail pack={catList(packOv.cat)[packOv.idx]} idx={packOv.idx} count={catList(packOv.cat).length} p={p} dpBal={dpBal}
                  deckId={deckId} sel={packSel} setSel={setPackSel} onStep={stepPack} onClose={() => setPackOv(null)}
                  options={options} onActivate={activate} onActivateTier={activateTier} inline
                  onBuy={(pack) => { buy((pf) => buyPack(pf, pack)); activate(pack); }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kauffenster: das Portal sitzt seit #overlay-portal IN `PackDetail` (wie bei allen Vollbild-Overlays),
          nicht mehr hier am Aufrufer — sonst stünde dieselbe Begründung an zwei Stellen und die Regel wäre
          wieder eine Einzelfall-Entscheidung. Ab 1280 px entfällt das Overlay; das Detail steht dann oben im
          Raster (s. `cz-side`) und rendert `inline`, also bewusst OHNE Portal. */}
      {!wide && packOv && (
        <PackDetail pack={catList(packOv.cat)[packOv.idx]} idx={packOv.idx} count={catList(packOv.cat).length} p={p} dpBal={dpBal}
          deckId={deckId} sel={packSel} setSel={setPackSel} onStep={stepPack} onClose={() => setPackOv(null)}
          options={options} onActivate={activate} onActivateTier={activateTier}
          onBuy={(pack) => { buy((pf) => buyPack(pf, pack)); activate(pack); }} />)}
    </div>
    </DeckLookCtx.Provider>
  ));
}

/* ============================ Packs- / Challenges-Tab ============================ */
// #Shop-Reorg: geteilte Ansicht für „Packs" (Kauf-Packs, nach DP-Preis sortiert) und „Challenges" (freischaltbare
// cond-Packs). `list` kommt vorsortiert rein; die Reihenfolge bleibt (kein erneutes Sortieren) → billig oben, teuer unten.
/* `sel` = Index des Packs, das ab 1280 px rechts im Detail steht (bis dahin null). Die Kachel bekommt
   dafür einen eigenen Marker: `is-sel` ist schon vergeben — das trägt das AUSGERÜSTETE Deck, und die
   beiden Zustände müssen unterscheidbar bleiben (man betrachtet ja meist ein anderes als das eigene). */
/* `onEquip(pack, tier)` — Doppelklick auf eine Kachel rüstet direkt aus, ohne Umweg über das Detail.
   Nur für Packs im BESITZ, die nicht ohnehin aktiv sind; bei Mehrstufen-Packs die Stufe, die die Kachel
   auch zeigt (das Cover = höchste freigeschaltete). Der einfache Klick bleibt unberührt — er öffnet
   weiter das Detail, und genau deshalb ist der zweite Klick auf dem Handy folgenlos: dort liegt danach
   das Detail-Overlay über der Kachel, die Kachel sieht ihn gar nicht. */
function PacksView({ p, deckId, list, cat, onOpen, onEquip = null, options = null, onOption = null, sel = null,
  sort = SORT_DEFAULT, onSort = null }) {
  const challenge = cat === "challenges";
  const wide = useIsWide();   // ab 1280 px steht die Vorschau dauerhaft daneben (s. Untertitel unten)
  const [filter, setFilter] = useState("alle");
  const chips = challenge ? [["alle", "shop.filter.all"], ["besitz", "shop.filter.free"], ["gesperrt", "shop.filter.locked"]] : [["alle", "shop.filter.all"], ["besitz", "shop.filter.owned"], ["kaufbar", "shop.filter.buyable"]];
  const stateOf = (pack) => (pack.kind === "std" ? "own" : packState(p, pack));
  const shown = list.filter((pack) => {
    const s = stateOf(pack);
    if (filter === "besitz") return s === "own";
    if (filter === "kaufbar") return s === "buy";
    if (filter === "gesperrt") return s === "lock";
    return true;
  });
  // #393 Zufalls-Deck je Lauf (nur Packs-Tab): togglebar; jeder neue Lauf startet mit einem zufälligen deiner besessenen
  //   (farbigen) Decks und rendert alle aktiven Effekte in dessen Deckfarbe. Reine UI-Pref (überlebt Reset).
  const randomOn = !!(options && options.randomDeckEachRun);

  return (
    <>
      {!challenge && options && onOption && (
        <div className="mt-3 rounded-xl p-3 flex items-center gap-3"
          style={{ background: randomOn ? "#1a1330" : "#14131c", border: `1px solid ${randomOn ? "#9b82f0aa" : "#2a2836"}` }}>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-extrabold">{t("shop.randomDeck.title")}</div>
            <div className="text-[11px] leading-snug" style={{ color: "#9a97ab" }}>{t("shop.randomDeck.desc")}</div>
          </div>
          <button type="button" role="switch" aria-checked={randomOn} aria-label={t("shop.randomDeck.aria")}
            onClick={() => onOption({ randomDeckEachRun: !randomOn })}
            className="relative shrink-0 rounded-full transition-colors"
            style={{ width: 46, height: 26, background: randomOn ? "#9b82f0" : "#2a2836", border: `1px solid ${randomOn ? "#b9a6ff" : "#3a3a44"}` }}>
            <span className="absolute top-1/2 rounded-full transition-all"
              style={{ width: 20, height: 20, background: "#fff", transform: "translateY(-50%)", left: randomOn ? 23 : 3 }} />
          </button>
        </div>
      )}
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        {chips.map(([k, label]) => (
          /* #kante: Filter in der Chip-Fassung der Kanten-Familie — der aktive trägt eine schmale Cyan-Kante
             statt einer gefüllten Cyan-Pille, die neben den ruhigen Kacheln als lauteste Fläche dastand. */
          <button key={k} onClick={() => setFilter(k)}
            className={`as-edge-neutral as-edge-thin px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-colors${filter === k ? " text-white" : ""}`}
            style={filter === k ? { borderLeftColor: "#26c6e6" } : undefined}>{t(label)}</button>
        ))}
        {/* #packsort: Der Sortier-Knopf steht in DERSELBEN Zeile (Handy wie Desktop), aber hinter einer
            Haarlinie: in der Chip-Optik der Filter sähe er sonst wie ein vierter Filter aus, und „Farbe"
            neben „Kaufbar" läse sich als „zeige nur farbige". Die Linie ist Layout, kein neues Zeichen —
            ein Icon dafür gäbe es im System nicht (Regel: keins ohne Rückfrage einführen).
            Beschriftung = was der NÄCHSTE Klick tut (sortLabelKey), nicht der aktuelle Zustand. */}
        {onSort && (
          <>
            <span aria-hidden className="self-stretch w-px mx-0.5 rounded" style={{ background: "#2a2a34" }} />
            {/* KEINE Aktiv-Kante wie bei den Filtern: die trüge hier eine Lüge — sie säße neben der
                Beschriftung des NÄCHSTEN Klicks („Preis" leuchtet, sortiert ist aber nach Farbe).
                Die Rückmeldung ist die Umsortierung der Kacheln selbst. */}
            <button type="button" onClick={onSort} title={t("shop.sort.hint")}
              className="as-edge-neutral as-edge-thin px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-colors">
              {t(sortLabelKey(sort, challenge))}
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
        {shown.map((pack) => {
          const gi = list.indexOf(pack);
          const s = stateOf(pack);
          // #tiered: Cover = höchste freigeschaltete Stufe (sonst Stufe I); aktiv, wenn irgendeine Stufe equippt ist.
          const tiered = isTieredPack(pack);
          const cover = tiered ? coverTier(p, pack) : null;
          const coverDeckId = cover ? cover.deckId : pack.deckId;
          const active = tiered ? packHasTierDeck(pack, deckId) : deckId === pack.deckId;
          // Ausgegraut = noch nicht im Besitz (kaufbar ODER gesperrt) — einheitlich wie die Challenges. Nur besessene/aktive Packs bleiben farbig.
          const owned = s === "own";
          const badge = active ? [t("shop.activeChip"), "#123a25", STATE_ON, "#2f7a4f"]
            : s === "buy" ? [`${packPrice(pack)} DP`, "#0e2429", "#35c6e6", "#2b5a68"]
            : s === "lock" ? ["🔒", "#1c1b24", "#9a97ab", "#2e2d38"]
            : null;
          /* #werkstatt: „tippen → Details" führt ab 1280 px zu etwas, das schon im Bild steht — die
             Vorschau liegt dort dauerhaft daneben. Dann sagt die Zeile den Zustand statt der Geste. */
          const sub = active ? [t("shop.tile.sub.active"), STATE_ON]
            : s === "own" ? [tiered
                ? t(wide ? "shop.tile.sub.ownedTier" : "shop.tile.sub.detailsTier", { roman: cover?.roman || "I" })
                : t(wide ? "shop.tile.sub.owned" : "shop.tile.sub.details"), "#9a97ab"]
            : s === "buy" ? [t("shop.tile.sub.buyable"), "#f2c14a"]
            : [unlockLabel(packUnlock(p, pack)), "#6d6a80"];
          return (
            /* #kante: Kachel in der Kanten-Optik (index.css .as-edge-card). Die Kante trägt die Akzentfarbe des
               Packs (a1 aus themes.js) — dieselbe Farbe, in der das Deck später den ganzen Bildschirm tönt.
               `is-sel` = ausgerüstet; das frühere Grün am Rahmen ist damit frei für den Badge, wo es hingehört. */
            <button key={pack.id} type="button" onClick={() => onOpen(cat, gi)}
              onDoubleClick={onEquip && owned && !active ? () => onEquip(pack, tiered ? cover : null) : undefined}
              title={onEquip && owned && !active ? t("shop.tile.dblEquip") : undefined}
              className={`as-edge-card${active ? " is-sel" : ""}${sel === gi ? " cz-shown" : ""} relative rounded-xl overflow-hidden text-left transition-transform hover:-translate-y-0.5`}
              style={{ "--c": pack.a1 || "#8a8a95" }}>
              <div className="relative" style={{ aspectRatio: CARD_RATIO }}>
                <DeckThumb deckId={coverDeckId} className="absolute inset-0 w-full h-full" style={{ filter: owned ? undefined : "grayscale(.7) brightness(.5)" }} />
                {badge && <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: badge[1], color: badge[2], border: `1px solid ${badge[3]}` }}>{badge[0]}</span>}
                {/* #tiered: Mehrstufen-Markierung — Stufen-Pills (I/II/III), freigeschaltete hell, gesperrte gedimmt. Signalisiert „Deck mit mehreren Stufen". */}
                {tiered && (
                  <span className="absolute bottom-1 left-1 flex gap-0.5">
                    {/* `ti` statt `t`: `t` ist in dieser Datei der Übersetzer — eine Stufe darf ihn nicht verdecken. */}
                    {pack.tiers.map((ti) => {
                      const free = isUnlocked(DECK_DEFS[ti.deckId], p);
                      return <span key={ti.deckId} className="text-[8px] font-extrabold leading-none px-1 py-[3px] rounded"
                        style={{ background: free ? "#1a1330e6" : "#0a0a12e6", color: free ? "#c9b6ff" : "#6a6780", border: `1px solid ${free ? "#6a4fb0" : "#33313f"}` }}>{ti.roman}</span>;
                    })}
                  </span>
                )}
              </div>
              <div className="px-2 py-1.5">
                <span className="text-[12px] font-extrabold truncate block">{packLabel(pack)}</span>
                <span className="text-[10px] truncate block" style={{ color: sub[1] }}>{sub[0]}</span>
              </div>
            </button>
          );
        })}
      </div>

      {shown.length === 0 && (
        <div className="text-center text-[12px] py-6" style={{ color: "#6d6a80" }}>{t("shop.emptyView")}</div>
      )}

      <p className="text-[11px] mt-4 leading-snug pt-3" style={{ color: "#9a97ab", borderTop: "1px solid #2a2836" }}>
        {challenge
          ? t("shop.hint.challenge")
          : t("shop.hint.pack")}
      </p>
    </>
  );
}

/* Pack-Detailansicht (Portal): Vorschau (Karte vorne/hinten/Hintergrund), ‹ ›/Swipe zwischen Packs, Kaufen/Aktivieren.
   #tiered: Bei Stufen-Decks steht über der Aktion ein I/II/III-Wähler (nur freigeschaltete Stufen wählbar); Vorschau,
   Farbe und Aktivierung folgen der gewählten Stufe. Ohne tiers verhält sich alles unverändert. */
/* `inline` = die Desktop-Fassung: kein Overlay, sondern die feste zweite Spalte neben dem Katalog.
   Es ändert sich NUR die Hülle — Vorschau, Stufenwahl, Kaufen und alle Zustände bleiben identisch.
   Zwei Dinge entfallen eingebettet: der Dim samt Klick-daneben-schließt (es liegt nichts darüber) und
   der Schließen-Knopf (das Panel ist permanent; ein „Schließen" daran läse sich wie „Shop verlassen"). */
function PackDetail({ pack, idx, count, p, dpBal, deckId, sel, setSel, onStep, onClose, options = null, onActivate, onActivateTier, onBuy, inline = false }) {
  const touch = useRef(0);
  const tiered = isTieredPack(pack);
  const tiers = tiered ? pack.tiers : [];
  const equippedTier = tiered ? tierByDeckId(pack, deckId) : null;
  const tierUnlocked = (t) => isUnlocked(DECK_DEFS[t.deckId], p);
  // Default-Stufe: equippte → gemerkte (tierSel) falls frei → höchste freie → Stufe I. Bei Pack-Wechsel (‹ ›) neu setzen.
  const defaultTierDeck = (pk) => {
    const eq = tierByDeckId(pk, deckId);
    if (eq) return eq.deckId;
    const remembered = tierByDeckId(pk, options && options.tierSel ? options.tierSel[pk.id] : null);
    if (remembered && isUnlocked(DECK_DEFS[remembered.deckId], p)) return remembered.deckId;
    const hi = highestUnlockedTier(p, pk);
    return (hi || pk.tiers[0]).deckId;
  };
  const [selDeck, setSelDeck] = useState(() => (tiered ? defaultTierDeck(pack) : null));
  useEffect(() => { if (isTieredPack(pack)) setSelDeck(defaultTierDeck(pack)); }, [pack.id]); // eslint-disable-line react-hooks/exhaustive-deps -- nur beim Pack-Wechsel; defaultTierDeck ist je Render neu und würde die Wahl überschreiben
  const selTier = tiered ? (tierByDeckId(pack, selDeck) || tiers[0]) : null;
  // „Ansichts-Pack" = Stufen-Sicht (eigene deckId/bfId/a1) oder das Pack selbst.
  const viewPack = tiered ? tierAsPack(pack, selTier) : pack;

  const hasBf = hasBattlefield(pack);
  const segs = hasBf ? [["back", t("shop.packSel.back")], ["front", t("shop.packSel.front")], ["bg", t("shop.packSel.bg")]]
                     : [["back", t("shop.packSel.back")], ["front", t("shop.packSel.front")]];
  const activeSel = (sel === "bg" && !hasBf) ? "back" : sel;

  const s = pack.kind === "std" ? "own" : packState(p, pack);
  // #tiered: „aktiv" bezieht sich auf die GEWÄHLTE Stufe (nicht nur irgendeine equippte).
  const active = tiered ? (!!equippedTier && equippedTier.deckId === selTier.deckId) : deckId === pack.deckId;
  const selTierUnlocked = tiered ? tierUnlocked(selTier) : false;
  const selTierLock = tiered && !selTierUnlocked ? unlockProgress(DECK_DEFS[selTier.deckId], p) : null;
  const price = packPrice(pack);
  const canBuy = pack.kind === "buy" && canBuyPack(p, pack);
  const unlock = pack.kind === "cond" ? packUnlock(p, pack) : null;

  /* #shop-skalieren (19.08.2026) — die Vorschau passt sich der Fensterhöhe an, statt zu scrollen.
     Gemessen im Produktionsbuild: der Inhalt der Detailspalte braucht 662 px. Auf 1920 × 1080 hat er
     sie; auf 1536 × 791 stehen ihm 558 zur Verfügung. Die fehlenden 104 px musste man sich bisher
     herunterscrollen — in einer Spalte, die selbst schon in einem gedeckelten Panel sitzt, und ohne dass
     der Aktivieren-Knopf je gleichzeitig mit den Bildern im Bild stand.

     Geschrumpft wird über die BREITE des ganzen Vorschau-Blocks, nicht über die Höhe der einzelnen
     Kästen. Die Bilder leiten ihre Höhe aus der Breite ab (`aspect-ratio`), also ist die flache Fassung
     damit eine echte VERKLEINERUNG der hohen: alle drei bleiben bündig unter ihren Beschriftungen.
     Der erste Anlauf schrumpfte die Höhen (Flexbox) — dabei bleibt der Kasten breit und das Bild steht
     mittig darin, und genau das kam als „auf der Laptop-Auflösung sind die Bilder nicht mehr
     ausgerichtet" zurück.

     Gemessen wird IMMER an der ungeschrumpften Fassung (Breite 100 %), sonst wäre der Überhang schon
     wegskaliert und der Faktor liefe mit jedem Durchgang weiter nach unten. Zwei Griffe dafür:
       · Der Scroller steht während der Messung auf `overflow-y: hidden` — mit sichtbarer Leiste misst
         man eine um deren Breite schmalere Spalte, und der daraus errechnete Faktor ließe nach dem
         Anwenden wieder ein paar Pixel überstehen (die Leiste käme zurück).
       · Beides passiert in einem `useLayoutEffect`, also VOR dem Zeichnen — zu sehen ist der
         Zwischenzustand nie.
     Das Kartenpaar steht NEBENeinander und zählt deshalb einmal in die Höhe. */
  const shotBodyRef = useRef(null);
  const shotWrapRef = useRef(null);
  const [shotF, setShotF] = useState(1);
  const [shotMess, setShotMess] = useState(0);

  // Anlässe für eine Neumessung, die nicht am Pack hängen: Fenstergröße und das Nachladen der Schrift
  // (die Beschriftungen tragen Höhe bei — dieselbe Falle wie bei der Zellenmessung in `CardGrid`).
  useEffect(() => {
    if (!inline) return undefined;
    const neu = () => setShotMess((n) => n + 1);
    window.addEventListener("resize", neu);
    let lebt = true;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (lebt) neu(); });
    return () => { lebt = false; window.removeEventListener("resize", neu); };
  }, [inline]);

  useLayoutEffect(() => {
    const body = shotBodyRef.current, wrap = shotWrapRef.current;
    if (!inline || !body || !wrap) return;
    const breiteVorher = wrap.style.width, ueberlaufVorher = body.style.overflowY;
    wrap.style.width = "100%";
    body.style.overflowY = "hidden";
    const karte = wrap.querySelector(".cz-shots .cz-shotimg");
    const feld = wrap.querySelector(".cz-shotbg .cz-shotimg");
    const bildHoehe = (karte ? karte.offsetHeight : 0) + (feld ? feld.offsetHeight : 0);
    const ueberhang = body.scrollHeight - body.clientHeight;
    wrap.style.width = breiteVorher;
    body.style.overflowY = ueberlaufVorher;
    setShotF(shotFactor(bildHoehe, ueberhang));
  }, [inline, shotMess, pack.id, viewPack.deckId, viewPack.bfId, hasBf]);

  /* #overlay-portal: NUR die Overlay-Fassung portalt. Ab 1280 px steht dieselbe Komponente `inline` als Spalte
     IM Raster der Werkstatt (`cz-detail`) — die gehört dorthin, wo sie steht, und ein Portal würde sie aus dem
     Layout reißen. Deshalb hier die einzige Ausnahme von der sonst ausnahmslosen Regel, und sie hängt an
     genau dem Schalter, der auch über `position: fixed` entscheidet. */
  const node = (
    <div className={inline ? "cz-detail h-full" : "fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"}
      style={inline ? undefined : { background: "#05050ad0", backdropFilter: "blur(4px)" }} onClick={inline ? undefined : onClose}>
      <div className={`w-full rounded-2xl overflow-hidden as-panel as-panel-deck ${inline ? "cz-detailcard h-full flex flex-col" : "max-w-sm my-auto"}`}
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 45) onStep(dx < 0 ? 1 : -1); }}>
        <div className="h-[3px] w-full shrink-0" style={HAIRLINE} aria-hidden="true" />
        <div ref={shotBodyRef} className={`p-3.5 ${inline ? "flex-1 min-h-0 overflow-y-auto" : ""}`}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[15px] dt:text-[20px] font-extrabold truncate">{packLabel(pack)}{tiered ? <span className="opacity-60 font-bold"> · {selTier.name}</span> : null}</span>
            {!inline && <button onClick={onClose} className="as-edge-neutral as-edge-thin shrink-0 text-[11px] px-2.5 py-1 rounded-lg">{t("common.close")}</button>}
          </div>

          {/* #werkstatt (18.08.2026) — Ab 1280 px liegen alle drei Ansichten NEBENEINANDER statt hinter
              einem Umschalter: Cover und Karte oben als Paar, das Spielfeld quer darunter. Der Grund für
              „quer" ist das Bild selbst — die 40 Spielfelder sind 1600 × 640; in einer halben Panelbreite
              wäre das ein hochkant beschnittener Streifen, in dem man nichts erkennt. Über die volle
              Breite misst es 480 × 192 und bleibt das Bild, das es ist.
              Der Umschalter und die ‹ ›-Blätterpfeile bleiben der Handy-Fassung: dort ist das Detail ein
              Overlay ohne Katalog daneben, da braucht es beides. Hier steht der Katalog links — zwei Wege
              zum selben Ziel wären Rauschen. */}
          {inline ? (
            <>
              {/* #shop-skalieren (19.08.2026): Die drei Bilder sind BREITEN-getrieben (`aspect-ratio`),
                  also schrumpft der ganze Block ueber EINE Breite, wenn er sonst nicht ins Panel passt —
                  gerechnet in `shopScale.js`, gemessen im Layout-Effekt oben. Damit ist die flache
                  Fassung eine echte Verkleinerung der hohen: alle drei Bilder bleiben buendig unter
                  ihren Beschriftungen. Ohne den Faktor (Fallback 1) steht hier exakt das Layout von
                  vorher. */}
              <div ref={shotWrapRef} className="cz-shotwrap"
                style={shotF < 1 ? { width: `${(shotF * 100).toFixed(3)}%` } : undefined}>
                <div className="cz-shots grid grid-cols-2 gap-3">
                  {[["back", t("shop.packSel.back")], ["front", t("shop.packSel.front")]].map(([face, label]) => (
                    <div key={face} className="cz-shot flex flex-col gap-1.5">
                      <span className="cz-shotlab">{label}</span>
                      <CardPreview deckId={viewPack.deckId} a1={viewPack.a1} face={face} className="cz-shotimg w-full" />
                    </div>
                  ))}
                </div>
                {hasBf && (
                  <div className="cz-shot cz-shotbg flex flex-col gap-1.5 mt-3">
                    <span className="cz-shotlab">{t("shop.packSel.bg")}</span>
                    <BfPreview bfId={viewPack.bfId} a1={viewPack.a1} className="cz-shotimg w-full" ratio="1600 / 640" />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Großes Preview mit ‹ › — feste Höhe (Karte↔BF springt nicht) */}
              <div className="flex items-center gap-2" style={{ height: 252 }}>
                <button onClick={() => onStep(-1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>‹</button>
                <div className="flex-1 min-w-0 h-full flex items-center justify-center">
                  {activeSel === "bg"
                    ? <BfPreview bfId={viewPack.bfId} a1={viewPack.a1} className="w-full" showVersion />
                    : <CardPreview deckId={viewPack.deckId} a1={viewPack.a1} face={activeSel} className="h-[248px] max-h-[46vh]" />}
                </div>
                <button onClick={() => onStep(1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>›</button>
              </div>

              {/* Umschalter Karte vorne / hinten / Hintergrund */}
              <div className="flex gap-1.5 justify-center mt-2.5">
                {segs.map(([k, label]) => (
                  <button key={k} onClick={() => setSel(k)} className="flex-1 max-w-[120px] py-1.5 rounded-lg text-[11px] font-extrabold transition-colors"
                    style={{ background: activeSel === k ? "#211f2e" : "#14131c", border: `1px solid ${activeSel === k ? "var(--deck-a1, #9b82f0)" : "#2a2836"}`, color: activeSel === k ? "#e8e6ff" : "#9a97ab" }}>{label}</button>
                ))}
              </div>
            </>
          )}

          {/* #tiered: Stufen-Wähler I / II / III — ALLE Stufen anklickbar (auch gesperrte = Vorschau); gesperrte tragen 🔒
              und zeigen unten die Freischalt-Bedingung. Nur der Aktivieren-Button hängt an der Freischaltung. */}
          {tiered && (
            <div className="flex gap-1.5 justify-center mt-2.5">
              {/* `ti` statt `t`: siehe oben — `t` ist der Übersetzer. */}
              {tiers.map((ti) => {
                const on = ti.deckId === selTier.deckId;
                const free = tierUnlocked(ti);
                const isEq = equippedTier && equippedTier.deckId === ti.deckId;
                return (
                  <button key={ti.deckId} onClick={() => setSelDeck(ti.deckId)}
                    className="flex-1 max-w-[96px] py-1.5 rounded-lg text-[11px] font-extrabold transition-colors"
                    style={{ background: on ? "#211f2e" : "#14131c", border: `1px solid ${on ? "var(--deck-a1, #9b82f0)" : "#2a2836"}`,
                      color: on ? "#e8e6ff" : (free ? "#c9c6dd" : "#8b88a0") }}>
                    {free ? "" : "🔒 "}{ti.roman}{isEq ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
          )}

          {/* Die Positionspunkte gehören zur Wisch-Geste der Handy-Fassung. Neben einem sichtbaren Katalog
              zählen sie eine Liste ab, die vollständig danebensteht. */}
          {!inline && (
            <div className="flex gap-1.5 justify-center my-2.5">
              {Array.from({ length: count }).map((_, i) => <span key={i} className="rounded-full transition-all" style={{ width: i === idx ? 16 : 6, height: 6, background: i === idx ? "var(--deck-a1, #9b82f0)" : "#3a3947" }} />)}
            </div>
          )}
          {inline && <div className="mt-3" />}
        </div>

        {/* Aktion — BEWUSST ausserhalb des Scrollers (`cz-action`, `flex-none`). Auf flachen Fenstern
            ist die Vorschau hoeher als die Spalte; lag der Knopf im Fluss darueber, rutschte er unter die
            gedeckelte Panelkante und wurde von der Karte weggeschnitten — man sah nicht mehr, dass man
            das Deck ueberhaupt kaufen oder ausruesten kann. Jetzt scrollen die Bilder, der Knopf steht.
            Ohne `inline` (Handy-Overlay) ist es eine Klammer mit demselben Innenabstand wie vorher. */}
        <div className={`p-3.5 pt-0 ${inline ? "cz-action flex-none" : ""}`}>
          {tiered ? (
            active ? (
              <div className="w-full rounded-xl font-extrabold text-[13px] py-3 text-center" style={{ background: "#123a25", color: STATE_ON, border: "1px solid #2f7a4f" }}>{t("shop.tier.active", { roman: selTier.roman })}</div>
            ) : selTierUnlocked ? (
              <button onClick={() => { onActivateTier(pack, selTier); if (!inline) onClose(); }} className="w-full rounded-xl font-extrabold text-[13px] py-3"
                /* #deckui: Ausrüsten-Angebot in Deckfarbe (war Violett). */
                style={{ background: "#20202c", border: `1px solid ${STATE_OFF}`, color: "#e8e6ff" }}>{t("shop.tier.activate", { roman: selTier.roman })}</button>
            ) : (
              <div className="w-full rounded-xl font-extrabold text-[12px] py-3 text-center leading-snug" style={{ background: "#1c1b24", color: "#9a97ab", border: "1px solid #2e2d38" }}>
                {t("shop.unlock", { cond: unlockLabel(selTierLock) })}
                {selTierLock.target > 1 && <span className="opacity-70"> · {fmtNum(selTierLock.cur)} / {fmtNum(selTierLock.target)}</span>}
              </div>
            )
          ) : active ? (
            /* #kante: „läuft gerade" ist eine Auskunft, kein Knopf — Kanten-Karte in Grün. */
            <div className="as-edge-card w-full rounded-xl font-extrabold text-[13px] py-3 text-center" style={{ "--c": STATE_ON, color: STATE_ON }}>{t("shop.activeCheck")}</div>
          ) : s === "own" ? (
            /* #kante: Ausrüsten ist das Angebot dieser Ansicht — violette Kante. */
            <button onClick={() => { onActivate(pack); if (!inline) onClose(); }} className="as-edge w-full rounded-xl font-extrabold text-[13px] py-3"
              /* #deckui: Ausrüsten-Angebot in Deckfarbe (war Violett). */
              style={{ "--c": STATE_OFF }}>{t("shop.activate")}</button>
          ) : s === "buy" ? (
            /* #kante: Kaufen — starker Kanten-Knopf in DP-Cyan, gedimmt-neutral wenn das Guthaben nicht
               reicht (gleiche Fassung wie der Kaufen-Knopf der Effekt-Bühne). */
            <button onClick={() => { if (canBuy) { onBuy(pack); if (!inline) onClose(); } }} disabled={!canBuy}
              className={`w-full rounded-xl font-extrabold text-[13px] py-3 transition-opacity ${canBuy ? "as-edge-strong" : "as-edge-neutral"}`}
              style={{ ...(canBuy ? { "--c": "#35c6e6" } : null), opacity: canBuy ? 1 : 0.6, cursor: canBuy ? "pointer" : "not-allowed" }}>
              {t("shop.buy", { price })}{!canBuy && dpBal < price ? t("shop.tooFewDp") : ""}
            </button>
          ) : (
            /* #kante: gesperrt — neutrale Kante, gedimmt: da ist etwas, aber nicht für dich. */
            <div className="as-edge-card is-locked w-full rounded-xl font-extrabold text-[12px] py-3 text-center leading-snug" style={{ "--c": "#8a8a95", color: "#9a97ab" }}>
              {t("shop.unlock", { cond: unlockLabel(unlock) })}
              {unlock.target > 1 && <span className="opacity-70"> · {fmtNum(unlock.cur)} / {fmtNum(unlock.target)}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  return inline ? node : overlayPortal(node);
}

/* ============================ Effekte-Tab (#fx-floater) ============================ */
/* Variante „Bühne + Liste": eine große, ECHTE In-Game-Vorschau klebt als Floater direkt unter dem Sticky-Kopf
   (top = gemessene Kopfhöhe) und läuft beim Scrollen mit — so bleibt sie sichtbar, egal wie viele Kategorien
   darunter kommen. Je Gruppe eine horizontal wischbare Reihe kompakter Chips (kleine Live-Vorschau + Kurzname +
   Status-Marker). Tippen wählt den Effekt → der Floater zeigt ihn groß und bietet die passende Aktion (Kaufen /
   An-Aus / Als Finisher·Ambiente wählen). Kein separates Kauffenster mehr — der Floater IST Vorschau und Kauf. */
// #shopB (Variante B) Kategorie-Tabs statt fünf Wisch-Reihen. Kurzlabel je Slot (Daumen-freundlich).
// #shopB Kurzbeschreibung je Effekt: NUR der funktionale Bezug (was er im Spiel tut / worauf er reagiert — z. B. Klinge
// skaliert mit der Serie), nicht die Marketing-Langfassung. „none"/„standard" hängen an der Kategorie → über shortDesc().
// #sprache: die Kurztexte stehen als `fx.<key>.short` im Katalog (siehe shortDesc unten).
function shortDesc(fx, group) {
  if (fx.key === "none") return t(group.mode === "cardanim" ? "fx.short.noAnim" : "fx.short.noBg");
  if (fx.group === "spezial") return t("fx.short.spezial"); // #328 ein Tile
  if (fx.key === "standard") return t("fx.short.standard");
  if (fx.key === "gottStandard") return t("fx.short.gottStandard");
  const key = `fx.${fx.key}.short`;
  const short = t(key);
  return short === key ? fx.desc : short;   // unbekannter Effekt → Langtext (wie vorher)
}

function FxView({ p, options, onChoose, onBuyFx, stickyTop = 0, wide = false }) {
  const finisherSel = finisherSelOf(options, p); // #klinge-kaufbar: „klinge" nur bei Besitz aktiv, sonst „standard"
  const bgSel = bgSelOf(options, p);   // #331 EIN exklusiver Hintergrund-Effekt (aurora/cubematrix/embers/starfield) oder „none"
  const cardAnimSel = cardAnimSelOf(options, p); // #331 EINE Karten-Animation (edgeglow/holo/glitch) oder „none"
  const gottSel = gottSelOf(options); // #322 aktiver Score-Prunk oder „gottStandard" (kein Prunk)
  const activeKeyOf = (g) => g.mode === "finisher" ? finisherSel : g.mode === "bg" ? bgSel : g.mode === "gott" ? gottSel : g.mode === "cardanim" ? cardAnimSel : null;
  // Auswahl-Status: { group (aktive Kategorie/Tab), key (Effekt in der Bühne) }. Default = erster Effekt der ersten Gruppe.
  const [sel, setSel] = useState(() => defaultSelFor(FX_GROUPS[0].key)); // #373 Karten-Reiter startet auf „Keine Animation" (kein Auto-Showcase)
  const selGroup = FX_GROUPS.find((g) => g.key === sel.group) || FX_GROUPS[0];
  const selItems = fxGroupItems(selGroup.key, options, p); // #353 Standard oben → aktiver darunter → Rest nach Seltenheit
  const selFx = selItems.find((f) => f.key === sel.key) || selItems[0];

  // Ist ein Effekt in seiner Gruppe „aktiv"? (als Finisher/Prunk/Hintergrund/Animation gewählt bzw. Toggle an).
  // Zentrale Wahrheit → Zeilen-Marker + Bühnen-Aktion. Reihenfolge: der Skill-Effekt ist der Sonderfall vor den Modi.
  const isActive = (g, fx) =>
      fx.group === "spezial" ? true                    // #328 Skill-Effekt ist IMMER aktiv (nur Farbwahl) → „AKTIV"-Badge korrekt
    : g.mode === "finisher" ? finisherSel === fx.key
    : g.mode === "gott" ? gottSel === fx.key          // #322 Score-Prunk einfach-exklusiv (gottStandard = kein Prunk)
    : g.mode === "cardanim" ? (fx.key === "none" ? cardAnimSel === "none" : cardAnimSel === fx.key) // #331 einfach-exklusiv
    : g.mode === "bg" ? (fx.key === "none" ? bgSel === "none" : bgSel === fx.key) // #331 EIN Hintergrund-Effekt (oder keiner)
    : false;

  // #shopB Tab-Wechsel: die Bühne springt auf den AKTIVEN Effekt der Kategorie (oder den ersten) → man sieht sofort, was läuft.
  const pickCat = (gKey) => {
    // #373 Karten: bewusst „Keine Animation" als Default (kein Auto-Loslaufen der Skill-Effekt-Showcase), auch beim
    // erneuten Anwählen des Reiters. Übrige Reiter springen wie bisher auf ihren AKTIVEN Effekt (oder das erste Item).
    if (DEFAULT_FX_KEY[gKey]) { setSel(defaultSelFor(gKey)); return; }
    const g = FX_GROUPS.find((x) => x.key === gKey);
    const its = fxGroupItems(gKey, options, p);
    const aKey = activeKeyOf(g);
    setSel({ group: gKey, key: (aKey && its.some((f) => f.key === aKey)) ? aKey : its[0].key });
  };
  // Doppeltippen in der Liste schaltet direkt um (wie zuvor der Chip).
  const toggleFx = (g, fx) => {
    const on = isActive(g, fx);
    if (!on && !(fx.alwaysOwned || globalFxOwned(p, fx))) return; // nicht im Besitz → erst über die Bühne kaufen
    if (fx.group === "spezial") return; // #328 Skill-Effekt: immer aktiv, Farbe NUR über den Toggle (Tile-Klick = no-op)
    else if (g.mode === "finisher") onChoose(finisherFlags(on ? "none" : fx.key));
    else if (g.mode === "gott") onChoose(gottFlags(on ? "gottStandard" : fx.key));
    else if (g.mode === "cardanim") onChoose(fx.key === "none" ? animNoneFlags() : cardAnimFlags(on ? "none" : fx.key)); // #331 einfach-exklusiv
    else if (g.mode === "bg") onChoose(bgFlags(fx.key === "none" ? "none" : (on ? "none" : fx.key))); // #331 EIN Hintergrund-Effekt
  };

  /* #fx-panel: Die Kategorie-Reiter werden EINMAL gebaut und je nach Breite an einer von zwei Stellen
     gerendert — am Handy im Sticky-Kopf über der Bühne (unverändert), ab 1280 px im Kopf des Listen-Panels.
     Das ist DOM, keine Anordnung, also nicht per CSS lösbar; dieselbe Entscheidung wie beim Leitfaden, wo
     die Nav-Spalte am `wide`-Schalter hängt. Ein zweites Rendern (beide Stellen + CSS-Umschalter) wäre die
     Alternative gewesen — dann lägen zwei Reiterzeilen mit zwei Fokus-Reihenfolgen im Baum. */
  const cats = (
    <div className="cz-fxcats flex gap-1.5 mb-2.5">
      {FX_GROUPS.map((g) => {
        const on = g.key === sel.group;
        return (
          /* #kante: Kategorie-Reiter tragen ihr Signal wie die Haupt-Reiter an der Unterkante, inaktive sind
             reiner Text. Vorher waren es fünf umrandete Kästen nebeneinander.
             #deckui: der Aktiv-Akzent ist Chrome → Deckfarbe (var(--deck-a1)), Gold nur noch als Fallback. */
          <button key={g.key} onClick={() => pickCat(g.key)} role="tab" aria-selected={on}
            className="grow basis-auto py-1.5 px-2.5 whitespace-nowrap rounded-t-md text-[11px] font-extrabold transition-colors"
            style={on
              ? { color: "#fff", borderBottom: "2px solid var(--deck-a1, #d4a63a)", background: "linear-gradient(180deg, transparent 45%, color-mix(in srgb, var(--deck-a1, #d4a63a) 14%, transparent))" }
              : { color: "#9a97ab", borderBottom: "2px solid transparent", background: "transparent" }}>
            {t(`fxgroup.${g.key}.title`)}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* #shopB STICKY: Kategorie-Tabs + Bühne + Aktion floaten oben — beim Scrollen der Liste bleibt die Vorschau sichtbar.
          #fx-panel: Ab 1280 px ist das hier das LINKE PANEL (Glas + Ring, endet an seinem Inhalt) und die
          Reiter sind nach rechts gezogen — s. .cz-stage im 1280er Block. */}
      <div className="cz-stage as-ring as-ring-quiet sticky z-[15] -mx-5 sm:-mx-6 px-5 sm:px-6 pt-2 pb-2.5" style={{ top: stickyTop, background: STICKY_HEAD_BG, borderBottom: "1px solid #23222e" }}>
        {/* Rahmenklasse und Laufband sind ein PAAR (#perf-ring) — die Klasse ohne dieses Kind ergäbe
            keinen Rahmen. Beide sind unterhalb 1280 px wirkungslos (das Band steht global auf
            `display: none`), die Handy-Fassung bleibt davon also unberührt.
            Der Wächter in test/desktop-perf.test.js zählt die zwei Namen im Quelltext gegeneinander —
            deshalb stehen sie hier bewusst NICHT ausgeschrieben in der Prosa. */}
        <i className="as-ring-run" aria-hidden="true" />
        {!wide && cats}
        <FxStage fx={selFx} group={selGroup} p={p} active={isActive(selGroup, selFx)} onChoose={onChoose} onBuyFx={onBuyFx} options={options} />
      </div>

      {/* #fx-panel: Ab 1280 px das RECHTE PANEL (Kategorien · Liste · Fußnote), darunter `display: contents` —
          am Handy fällt die Klammer also weg und die Reihenfolge Bühne → Liste → Hinweis bleibt, wie sie war. */}
      <div className="cz-fxside as-ring as-ring-quiet">
        <i className="as-ring-run" aria-hidden="true" />
        {wide && cats}

        {/* #shopB Vertikale Liste der AKTIVEN Kategorie (scrollt unter der Bühne). Tippen → Bühne; Doppeltippen → umschalten.
            #desktop: ab 1280 px rückt sie neben die Bühne (s. .cz-fxlist), statt darunter wegzuscrollen. */}
        <div className="cz-fxlist mt-3">
          <div className={EYEBROW} style={{ color: "#9a97ab" }}>
            {selGroup.title}
            <span className="flex-1 h-px" style={{ background: "#2a2836" }} />
            <span className="normal-case tracking-normal font-semibold text-[10px]" style={{ color: "#6d6a80" }}>{selGroup.hint}</span>
          </div>
          <div className="flex flex-col gap-2">
            {selItems.map((fx) => (
              <FxRow key={fx.key} fx={fx}
                selected={sel.key === fx.key}
                owned={fx.standard || fx.alwaysOwned || globalFxOwned(p, fx)}
                active={isActive(selGroup, fx)}
                onPick={() => setSel({ group: selGroup.key, key: fx.key })}
                onToggle={() => toggleFx(selGroup, fx)} />
            ))}
          </div>
        </div>

        <p className="cz-fxhint text-[11px] mt-4 leading-snug pt-3" style={{ color: "#9a97ab", borderTop: "1px solid #2a2836" }}>
          {t("shop.fx.hint")}
        </p>
      </div>
    </>
  );
}

/* #shopB Bühne: die große Vorschau + kontextabhängige Aktion. Sitzt im STICKY-Kopf von FxView (Tabs + Bühne floaten
   gemeinsam oben), zeigt den gewählten Effekt als ECHTE In-Game-Vorschau (GlobalFxScenePreview, key trägt Farbmodus →
   sauberer Remount beim Wechsel) + Name/Status + Kurzbeschreibung (nur der funktionale Bezug) + Kaufen/Wählen/Toggle. */
function FxStage({ fx, group, p, active, onChoose, onBuyFx, options }) {
  const previewRef = useRef(null);
  const [previewW, setPreviewW] = useState(0);
  /* #vorschau-brett: EIN ResizeObserver auf dem Rahmen — er ist die einzige Quelle des Szenen-Maßstabs.
     Bewusst kein `getBoundingClientRect()` im Render und kein `resize`-Listener: der Rahmen ändert seine
     Breite auch OHNE Fensteränderung (Reiterwechsel Pakete↔Effekte, Pack-Detail auf/zu), und ein Read im
     Render erzwingt ein Layout je Durchlauf. */
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setPreviewW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setPreviewW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  /* #perf-shopdpr: Der Auflösungsdeckel der Vorschau haengt am gemessenen Maßstab (Herleitung in
     mobileTier.js). `useLayoutEffect` statt Render-Seiteneffekt, und die Reihenfolge stimmt trotz
     „Kind-Effekte zuerst": Die Szene mountet erst in dem Commit NACH dem, in dem `previewW` gesetzt
     wird (s. `sceneFx` unten) — der Deckel steht also, bevor eine Bühne ihn liest.
     Ein spaeterer Breitenwechsel (Fenster ziehen) remountet die Szene nicht; sie behaelt dann ihre
     Aufloesung. Das ist bewusst: ein Remount waere teurer als die paar Prozent Abweichung. */
  useLayoutEffect(() => {
    setPreviewSceneScale(previewW > 0 ? sceneScale(previewW) : 0);
    return () => setPreviewSceneScale(0);
  }, [previewW]);
  /* #perf-shopmount: Die Szene wartet auf die Breitenmessung (sonst mountete sie im ersten Frame mit
     Maßstab 1 und behielte die falsche Aufloesung) UND auf eine stehende Auswahl. */
  const sceneFx = useSettled(previewW > 0 ? fx : null, FX_MOUNT_DELAY_MS);
  const owned = fx.standard || fx.alwaysOwned || globalFxOwned(p, fx);
  // #: Effekte mit Farbmodus (Standard/Deckfarbe): Aurora + Glutfunken. deckOpt = das zugehörige Options-Flag.
  const deckOpt = fx.key === "aurora" ? "fxAuroraDeck" : fx.key === "neonsurf" ? "fxNeonsurfDeck" : fx.key === "starfield" ? "fxStarfieldDeck" : fx.key === "cubematrix" ? "fxCubeMatrixDeck" : fx.key === "scorch" ? "fxScorchDeck" : fx.key === "blackhole" ? "fxBlackholeDeck" : fx.key === "klinge" ? "fxKlingeDeck" : fx.key === "hologridSlice" ? "fxHologridDeck"
    // #322–#326 Gottgleich-Prunk-Farbmodus (Standard-Palette ↔ Deckfarbe) je Effekt.
    // #vorschau-deck: „Gottgleich · Standard" hat seit 19.08.2026 einen eigenen Farbmodus — vorher war der
    // Chrome-Schriftzug dort auf den festen Synthwave-Zweiton festgelegt, während jeder Prunk daneben umfärben konnte.
    : fx.key === "gottStandard" ? "fxGottStandardDeck"
    : fx.key === "sonnenPuls" ? "fxSonnenPulsDeck" : fx.key === "laserFaecher" ? "fxLaserFaecherDeck" : fx.key === "prismaKaskade" ? "fxPrismaKaskadeDeck" : fx.key === "holoCube" ? "fxHoloCubeDeck" : fx.key === "supernova" ? "fxSupernovaDeck" : null;
  // #328 Skill-Effekt hat KEIN eigenes …Deck-Flag → Farbmodus kommt aus archColor (spezialSel); sonst aus deckOpt.
  const spezialSel = options?.archColor === "deck" ? "deck" : "standard";
  const deckTintOn = fx.group === "spezial" ? spezialSel === "deck" : (deckOpt ? !!options?.[deckOpt] : false);
  // #330 Farbmodus-Gate: BR-Chip „Standard/Deckfarbe" nur bei Effekten MIT Farbmodus (eigenes …Deck-Flag oder Skill-
  //   Effekt/spezial). Immer-Deckfarbe-Effekte ohne Umschalter (Karten-Anims) bleiben ohne BR-Chip.
  const hasColorMode = !!deckOpt || fx.group === "spezial";
  const canBuy = !fx.standard && !fx.alwaysOwned && canBuyGlobalFx(p, fx);
  const price = globalFxPrice(fx);
  const dpBal = Math.max(0, Math.floor(Number(p?.deckPoints) || 0));
  /* #kante: Der Aktionsknopf der Bühne („Als Hintergrund wählen" / „Ausgewählt" / „Anschalten") in der
     Kanten-Familie. AUS = violette Kante (das Angebot), AN = grüne Kante mit Schein (läuft gerade) — dieselbe
     Zuordnung wie am Status rechts oben in der Bühne. Die Klassen kommen zum `actBtn` dazu, der nur Maße hält. */
  const actBtn = "cz-actbtn w-full rounded-xl font-extrabold text-[12.5px] py-2.5";
  // `act(active)` liefert Klasse UND Farbe in einem Rutsch — die acht Aufrufstellen unten spreizen es
  // einfach in den Knopf (<button {...act(active)}>), statt className und style getrennt zu führen.
  // #deckui: „Angebot" (off) zieht die Deckfarbe (war Violett); „läuft gerade" (on) bleibt Grün (Zustands-Signal).
  const act = (on) => ({ className: `${actBtn} ${on ? "as-edge-strong" : "as-edge"}`, style: { "--c": on ? STATE_ON : STATE_OFF } });

  let action;
  if (fx.standard) {
    // #kante: „im Standard enthalten" ist kein Knopf, sondern eine Auskunft — Kanten-Karte, nicht anklickbar.
    action = <div className="cz-actbtn as-edge-card w-full rounded-xl font-extrabold text-[12px] py-2.5 text-center" style={{ "--c": "#7fb4ff", color: "#7fb4ff" }}>{t("shop.standardFree")}</div>;
  } else if (!owned) {
    /* #kante: Kaufen ist das Ziel der Bühne — starker Kanten-Knopf in DP-Cyan. Reicht das Guthaben nicht,
       bleibt er neutral und gedimmt: kein Farbsignal für etwas, das gerade nicht geht. */
    action = (
      <button onClick={() => { if (canBuy) onBuyFx(fx); }} disabled={!canBuy}
        className={`${actBtn} ${canBuy ? "as-edge-strong" : "as-edge-neutral"} transition-opacity`}
        style={{ ...(canBuy ? { "--c": "#35c6e6" } : null), opacity: canBuy ? 1 : 0.6, cursor: canBuy ? "pointer" : "not-allowed" }}>
        {t("shop.buy", { price })}{!canBuy && dpBal < price ? t("shop.tooFewDp") : ""}
      </button>
    );
  } else if (group.mode === "finisher") {
    const chooseBtn = <button onClick={() => onChoose(finisherFlags(fx.key))} {...act(active)}>{t(active ? "shop.selected" : "shop.chooseFinisher")}</button>;
    // #319 Scorch: Standard-Feuer ↔ Deckfarbe (Farbrampe von Laser/Glut). #320 Schwarzes Loch: Standard blau/pink ↔
    // Deckfarbe. Andere Finisher (Standard/Klinge) haben keinen Farbmodus.
    const finDeckOpt = fx.key === "scorch" ? "fxScorchDeck" : fx.key === "blackhole" ? "fxBlackholeDeck"
      : fx.key === "klinge" ? "fxKlingeDeck" : fx.key === "hologridSlice" ? "fxHologridDeck" : null;
    const finDeckOn = finDeckOpt ? !!options?.[finDeckOpt] : false;
    action = !finDeckOpt ? chooseBtn : (
      <div className="flex flex-col gap-2">
        {chooseBtn}
        <div className="flex rounded-lg overflow-hidden self-center" style={{ border: "1px solid #33324a" }}>
          {[{ v: false, l: t("shop.color.standard") }, { v: true, l: t("shop.color.deck") }].map((o) => {
            const on = finDeckOn === o.v;
            return <button key={o.l} onClick={() => onChoose({ [finDeckOpt]: o.v })} className="px-3.5 py-1.5 text-[11px] font-extrabold"
              style={{ background: on ? "#211f2e" : "#16151f", color: on ? "#e8e6ff" : "#8a879a" }}>{o.l}</button>;
          })}
        </div>
      </div>
    );
    } else if (group.mode === "bg") {
    // #331 Hintergrund: EIN exklusiver Effekt (Aurora/Würfel-Matrix/Glutfunken/Komet) ODER „Kein Effekt". „Als Hintergrund
    // wählen" schreibt bgFlags (genau einer an, „none" = keiner). Effekte mit Farbmodus zeigen zusätzlich Standard/Deckfarbe;
    // Würfel-Matrix zusätzlich Gefüllt/Nur Rahmen.
    if (fx.key === "none") {
      action = <button onClick={() => onChoose(bgFlags("none"))} {...act(active)}>{t(active ? "shop.bg.noneActive" : "shop.bg.none")}</button>;
    } else {
      const chooseBtn = <button onClick={() => onChoose(bgFlags(fx.key))} {...act(active)}>{t(active ? "shop.selected" : "shop.chooseBg")}</button>;
      const wireOn = !!options?.fxCubeMatrixWire;
      action = !deckOpt ? chooseBtn : (
        <div className="flex flex-col gap-2">
          {chooseBtn}
          <div className="flex rounded-lg overflow-hidden self-center" style={{ border: "1px solid #33324a" }}>
            {[{ v: false, l: t("shop.color.standard") }, { v: true, l: t("shop.color.deck") }].map((o) => {
              const on = deckTintOn === o.v;
              return <button key={o.l} onClick={() => onChoose({ [deckOpt]: o.v })} className="px-3.5 py-1.5 text-[11px] font-extrabold"
                style={{ background: on ? "#211f2e" : "#16151f", color: on ? "#e8e6ff" : "#8a879a" }}>{o.l}</button>;
            })}
          </div>
          {fx.key === "cubematrix" && (
            <div className="flex flex-wrap gap-2 justify-center">
              {/* #317 Würfel-Optik: gefüllt (solide) vs. nur leuchtende Neon-Rahmen (Drahtgitter, keine Füllung). */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #33324a" }}>
                {[{ v: false, l: t("shop.cube.filled") }, { v: true, l: t("shop.cube.wire") }].map((o) => {
                  const on = wireOn === o.v;
                  return <button key={o.l} onClick={() => onChoose({ fxCubeMatrixWire: o.v })} className="px-3 py-1.5 text-[11px] font-extrabold"
                    style={{ background: on ? "#211f2e" : "#16151f", color: on ? "#e8e6ff" : "#8a879a" }}>{o.l}</button>;
                })}
              </div>
            </div>
          )}
        </div>
      );
    }
  } else if (group.mode === "gott") {
    // #322–#326 Gottgleich-Prunk (einfach-exklusiv): „Als Prunk wählen" schreibt gottFlags (genau einer an, gottStandard
    // = kein Prunk). Jeder Prunk-Effekt bietet zusätzlich Standard/Deckfarbe (deckOpt); „Gottgleich · Standard" nicht.
    const chooseBtn = <button onClick={() => onChoose(gottFlags(fx.key))} {...act(active)}>{active ? t("shop.selected") : t(fx.key === "gottStandard" ? "shop.chooseGottStandard" : "shop.chooseGott")}</button>;
    action = !deckOpt ? chooseBtn : (
      <div className="flex flex-col gap-2">
        {chooseBtn}
        <div className="flex rounded-lg overflow-hidden self-center" style={{ border: "1px solid #33324a" }}>
          {[{ v: false, l: t("shop.color.standard") }, { v: true, l: t("shop.color.deck") }].map((o) => {
            const on = deckTintOn === o.v;
            return <button key={o.l} onClick={() => onChoose({ [deckOpt]: o.v })} className="px-3.5 py-1.5 text-[11px] font-extrabold"
              style={{ background: on ? "#211f2e" : "#16151f", color: on ? "#e8e6ff" : "#8a879a" }}>{o.l}</button>;
          })}
        </div>
      </div>
    );
  } else if (fx.group === "spezial") {
    // #328 Skill-Effekt (immer aktiv) → KEIN „auswählen"-Button, nur die Farbwahl als Segmented-Control (schreibt archColor).
    action = (
      <div className="flex justify-center">
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #33324a" }}>
          {[{ v: "standard", l: t("shop.color.standard") }, { v: "deck", l: t("shop.color.deck") }].map((o) => {
            const on = spezialSel === o.v;
            return <button key={o.v} onClick={() => onChoose(spezialFlags(o.v))} className="px-3.5 py-1.5 text-[11px] font-extrabold"
              style={{ background: on ? "#211f2e" : "#16151f", color: on ? "#e8e6ff" : "#8a879a" }}>{o.l}</button>;
          })}
        </div>
      </div>
    );
  } else if (group.mode === "cardanim" && fx.key === "none") {
    // #318/#331 „Keine Animation" (Aus-Zustand der einfach-exklusiven Karten-Animationen): schaltet alle ab.
    action = <button onClick={() => onChoose(animNoneFlags())} {...act(active)}>{t(active ? "shop.anim.noneActive" : "shop.anim.none")}</button>;
  } else if (group.mode === "cardanim") {
    // #331 Karten-Animation ist jetzt EINFACH-EXKLUSIV (genau eine): „Als Animation wählen". Läuft immer in der
    //   Deckfarbe (kein Standard/Deckfarbe-Farbmodus). Abwählen über „Keine Animation" bzw. Doppeltippen in der Liste.
    action = <button onClick={() => onChoose(cardAnimFlags(fx.key))} {...act(active)}>{t(active ? "shop.selected" : "shop.chooseAnim")}</button>;
  } else {
    action = <button onClick={() => onChoose({ [fx.option]: !active })} {...act(active)}>{t(active ? "shop.on.tapOff" : "shop.turnOn")}</button>;
  }

  return (
    <>
      {/* #shopB „Bühne für alle gleich skaliert" — feste Höhe, unabhängig vom Effekt. */}
      {/* Die Höhe ist auf dem Handy bewusst gedeckelt (die Liste soll darunter noch sichtbar sein). Ab
          1280 px steht die Liste daneben statt darunter — dort trägt die Vorschau das BRETT-Verhältnis
          (`--bf-ratio`, s. .cz-fxpreview in index.css); der Handy-Deckel hier ist inline und braucht
          deshalb `!important` drüben. */}
      <div ref={previewRef} className="cz-fxpreview relative w-full rounded-xl overflow-hidden"
        style={{ height: "clamp(146px, 22vh, 208px)", border: "1px solid #34324a", "--bf-ratio": BOARD_RATIO_CSS }}>
        {/* #313: Der Key trägt den Farbmodus mit → beim Toggle Standard↔Deckfarbe remountet die Vorschau sofort
            (frische Effekt-Bühne mit der neuen Farbe). Ohne das übernahm der Effekt-Canvas den
            Farbwechsel nicht, man musste erst weg- und zurückwechseln. Für Effekte ohne Farbmodus bleibt deckTintOn
            konstant false → Key stabil, kein unnötiger Remount. */}
        {/* #perf-shop (Plan B): key trägt NUR den Effekt (nicht den Farbmodus) → Standard↔Deckfarbe-Toggle remountet die
            Pixi-Bühne NICHT mehr (kein WebGL-Neuaufbau), sondern reicht deckTint als Live-Prop durch; die Effekte lesen
            ihn zur Laufzeit (gott: st.current · Blackhole: ctrlRef · Feld: setParams · Cube: propsRef). Effekt-Wechsel
            (anderer fx.key) remountet weiterhin, da ein anderer Effekt-Typ.
            #345-perf: Auch der Skill-Effekt („spezial") trägt den Farbmodus NICHT mehr im Key. Alle vier Archetyp-
            Renderer färben live um (FireHead: Palette je Render in stateRef, Ticker liest sie pro Frame · IonStorm/
            FrostIce: stateRef + Sync-Effekt · MossGrow: Effekt-Deps [growth,nA,nB]). Der frühere `spezial:deck/std`-Key
            remountete die GANZE Bühne bei jedem Farb-Toggle → riss FireHeads Pixi/WebGL-Context + 700 Partikel ab und
            baute sie neu auf (spürbarer Ruckler). Jetzt stabiler Key → deckTint fließt als Live-Prop, kein Remount. */}
        {/* #vorschau-brett: Der Maßstab kommt aus der GEMESSENEN Rahmenbreite, nicht aus einer Media-Query —
            der Rahmen hängt an der Panelbreite, und die hängt an Fensterbreite UND Reiterspalte. */}
        <SceneScaleCtx.Provider value={sceneScale(previewW)}>
          {sceneFx && <GlobalFxScenePreview key={sceneFx.key} fx={sceneFx} deckTint={deckTintOn} sun={false} wire={!!options?.fxCubeMatrixWire} />}
        </SceneScaleCtx.Provider>
        {/* #330 Verbindliches 4-Ecken-Template — hier zentral, EINMAL. Scenes bringen KEIN eigenes Chrome mehr mit.
            TL: Effekt-Name · TR: AKTIV (grün) / Preis (Rarity-Farbe) · BR: Standard/Deckfarbe (nur mit Farbmodus) ·
            BL: leer — reservierter Ausnahme-Slot (aktuell nur Deck-Glow zeichnet dort „mit/ohne" im PanelChip-Design). */}
        <PanelChip corner="tl">{fx.name}</PanelChip>
        {/* (Der Zustand wird vorab bestimmt, statt zwei Ternäre über die JSX zu ziehen — sonst liest der
            i18n-Textgreifer das „> … <" zwischen den Zweigen als Anzeigetext.) */}
        {active && <PanelChip corner="tr" style={{ background: "#123a25", color: STATE_ON, border: "1px solid #2f7a4f" }}>{t("shop.activeChip")}</PanelChip>}
        {!active && !owned && <PanelChip corner="tr" style={{ color: rarityTint(fx), border: `1px solid ${rarityTint(fx)}66` }}>{price} DP</PanelChip>}
        {hasColorMode && <PanelChip corner="br">{t(deckTintOn ? "shop.color.deck" : "shop.color.standard")}</PanelChip>}
      </div>
      {/* #cz-ruhe: `cz-fxfoot` ist unterhalb 1280 px eine reine KLAMMER (`display: contents`) — die
          Handy-Fassung bleibt damit Knoten für Knoten dieselbe. Ab 1280 px wird daraus die Fußzeile der
          Bühne: Beschreibung links im Fluss, Aktionsknopf rechts daneben statt über die ganze Breite. */}
      <div className="cz-fxfoot">
        {/* #shopB Kurzbeschreibung: nur der funktionale Bezug (was der Effekt tut / worauf er reagiert). */}
        <div className="cz-fxdesc text-[10.5px] leading-snug mt-1.5 mb-2 text-center" style={{ color: "#9a97ab", minHeight: 20 }}>{shortDesc(fx, group)}</div>
        {action}
      </div>
    </>
  );
}

/* #farbsystem: Rarity-Farbe je Effekt-Chip (linker Farbbalken) NACH PREIS-STUFE — das neue, einheitliche System.
   Grau = Default/„nichts" (Standard/Kein Feld-Effekt/gottStandard, ohne Preis) · Grün 10 · Blau 20 · Lila 30 ·
   Legendär Gelb 40. Der Preis bestimmt die Farbe → die Rarity ist auf einen Blick lesbar, auch vor dem Kauf. */
const RARITY_COLOR = { default: "#6b6880", 10: "#46d17f", 20: "#4a9dff", 30: "#a575ff", 40: "#f5c542" };
const rarityTint = (fx) => RARITY_COLOR[globalFxPrice(fx)] || RARITY_COLOR.default;

/* #fx-floater: Text-Chip einer Kategorie-Reihe (horizontal wischbar) — KEIN Grafik-Icon. Linker Signatur-Farbbalken
   + Name + Status (aktiv = grün · kaufbar = Preis gold · sonst „im Besitz"). Die echte Optik zeigt der Floater oben;
   der Chip ist ein reiner Wähler. Tippen wählt den Effekt. */
/* #shopB Effekt-ZEILE (vertikale Liste, full-width) — Signatur-Farbbalken (Rarity) + Name + Status (aktiv/Preis/Besitz).
   Tippen wählt den Effekt in die Bühne (onPick), Doppeltippen schaltet direkt um (onToggle). */
function FxRow({ fx, selected, owned, active, onPick, onToggle }) {
  const tint = rarityTint(fx); // #farbsystem: Rarity-Farbe nach Preis-Stufe (grau/grün/blau/lila/gelb)
  const status = active ? { c: STATE_ON, label: t("shop.status.active"), dot: STATE_ON }
    : !owned ? { c: tint, label: `${globalFxPrice(fx)} DP`, dot: tint } // Preis in der Rarity-Farbe
    : { c: "#6d6a80", label: t("shop.status.owned"), dot: null };
  // Doppel-TIPP/-Klick SCHALTET UM (Touch-sicher über eigene Zeitmessung: zwei Taps < 320 ms). Einzeltipp wählt.
  const lastTap = useRef(0);
  const handleTap = () => {
    onPick();
    const now = Date.now();
    if (now - lastTap.current < 320) { lastTap.current = 0; onToggle && onToggle(); }
    else lastTap.current = now;
  };
  return (
    /* #kante: Die Zeile IST jetzt die Kanten-Karte (index.css .as-edge-card) — der frühere Aufbau aus
       umlaufendem Rahmen PLUS separatem Farbbalken links ist damit auf ein Element geschrumpft. Die Kante
       trägt die Signaturfarbe des Effekts (Rarity nach Preisstufe: grau/grün/blau/lila/gold), `is-sel`
       markiert den in die Bühne gewählten. Das frühere Violett für „gewählt" entfällt — es hatte mit
       keinem Effekt etwas zu tun. Ob ein Effekt LÄUFT, sagt weiterhin der grüne Status rechts. */
    <button type="button" onClick={handleTap} title={active ? t("shop.dblTap.off") : owned ? t("shop.dblTap.on") : undefined}
      className={`cz-fxrow as-edge-card${selected ? " is-sel" : ""}${owned ? "" : " opacity-75"} relative w-full overflow-hidden rounded-xl text-left transition-transform active:scale-[.99] flex items-center gap-3`}
      style={{ padding: "11px 13px", "--c": tint }}>
      <span className="flex-1 min-w-0 text-[13px] font-extrabold leading-tight truncate" style={{ color: selected ? "#e8e6ff" : owned ? "#e3e1ec" : "#7d7a8b" }}>{fx.name}</span>
      <span className="flex items-center gap-1.5 text-[10px] font-bold shrink-0" style={{ color: status.c }}>
        {status.dot && <span className="rounded-full shrink-0" style={{ width: 7, height: 7, background: status.dot, boxShadow: `0 0 6px ${status.dot}` }} />}
        {status.label}
      </span>
    </button>
  );
}
