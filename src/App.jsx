import { useReducer, useEffect, useRef, useState, useMemo, useCallback, lazy, Suspense } from "react";
import { overlayPortal } from "./ui/overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { reducer, menuState } from "./game/reducer.js";
import { BASE_FLIP_MS, GHOST_STEP, DECISION_SCHEDULE, MAX_CYCLES } from "./game/constants.js";
import { rarityLabel, deckDef, battlefieldDef } from "./i18n/labels.js"; // Raritäts-Namen: EINE Quelle, übersetzt (Sprachprüfung C1)
import { baseScoreMultFor, totalCritChanceRaw, totalCritMult, zinsReadout } from "./game/perks.js";
import { allianceGroups } from "./game/families.js";
import { computeFormations } from "./game/formations.js"; // #201.8 Stufe B: Deck-Snapshot in der Historie
import { formatSeed } from "./game/rng.js"; // #205 Challenger Mode: Seed anzeigen (Base32)
import { randomSeed } from "./ui/seedShare.js"; // #229 N7: Lauf-Seed würfeln (UI-Layer — Math.random raus aus game/)
import { loadGhost, saveGhost, loadHighscores, recordHighscore, recordRun, recordChampionWeeks, loadOptions, saveOptions, loadUsername, saveUsername, loadProfile, saveProfile, wipeProfileStorage, saveActiveRun, loadActiveRun, clearActiveRun, loadRunHistory } from "./game/storage.js";
import { unlockAllProfile, skipOnboardingProfile, ONBOARDING_LINKS, nextOnboardingReward, ownedCount, unlockedArchetypes } from "./game/progression.js"; // Test-Codes: unlock (alles frei) / onboarding (skip +10 SP/+50 DP) / reset (Wipe) · §6 Meilenstein-Balken-Gate · #304 Onboarding-Fortschritt
import { currentWeek } from "./game/weeklySeed.js"; // §7 Meister-Rangliste: Wochen-Seed (für alle gleich)
import { leaderboardConfigured, publishRun } from "./game/leaderboard.js";
import { isAllowedUsername } from "./game/profanity.js"; // #174 gilt auch für Altnamen aus dem localStorage
import { withDecisionLog } from "./game/decisionLog.js"; // #telemetrie: Angebot↔Wahl mitschreiben (reiner Wrapper, reducer.js unberührt)
import * as telemetry from "./game/telemetry.js";        // #telemetrie: anonyme Lauf-Daten (Opt-out in den Optionen)
import { fmtDuration } from "./game/deck.js";
import { setLocale, t } from "./i18n/index.js"; // #sprache: Anzeigesprache aus den Optionen
import { useBackGuard } from "./ui/useBackGuard.js";
import { StatusRail } from "./ui/StatusRail.jsx";
import { useIsWide, DESKTOP_MIN, PHONE_MAX } from "./ui/useIsWide.js"; // #buehne: Musik/Meilenstein ziehen ab 1280 px in die Leiste (DOM-Umzug) · #mobil-emblem: dieselben zwei Schwellen für den Emblem-Vorlader
import { StatusBar } from "./ui/StatusBar.jsx"; // Gameplay-Neu-Aufbau Phase 1: schwebende Kompakt-Leiste (Vitals + Pause/Tempo/Karten)
import { architectCoverFor } from "./ui/architectCover.js"; // Lauf-Details: Gebäude-Overlay in den Snapshot persistieren
import { Battlefield, OPP_SKIN_URLS } from "./ui/Battlefield.jsx";
import { useFxLevel } from "./ui/useReducedFx.js"; // Perf: löst reducedFx dreistufig auf (full/balanced/minimal) → steuert Overlay-Blur + Sweeps
import { PerfOverlay } from "./ui/PerfOverlay.jsx"; // Perf-Recorder-HUD (nur Preview-Build)
import { perfMark, getReport, formatReport } from "./ui/perfRecorder.js"; // Perf-Recorder (No-op außerhalb Preview)
import { GlossaryPanel } from "./ui/Glossary.jsx";
import { Controls } from "./ui/Controls.jsx";
import { BuildPanel } from "./ui/BuildPanel.jsx";
import { WeekModPanel } from "./ui/WeekMods.jsx"; // #381 Ranked-Modifikatoren-Panel (unter den Perks)
import { PerkSelect } from "./ui/PerkSelect.jsx";
import { SkillSelect } from "./ui/SkillSelect.jsx";
import { skillArtUrls } from "./ui/skillArt.js"; // #mobil-emblem: Emblem-URLs je Archetyp für den Leerlauf-Vorlader
import { AbortConfirm, RestartConfirm } from "./ui/RunConfirm.jsx"; // #run-dialoge: Beenden/Neustarten (Desktop-Fassung)
import { LegendarySelect } from "./ui/LegendarySelect.jsx"; // #272 Legendär-Phase (Runde 29)
import { FormationPhase } from "./ui/FormationPhase.jsx";
import { TargetSelect } from "./ui/TargetSelect.jsx";
import { GlacierPick } from "./ui/GlacierPick.jsx";
import { FamilyTargetSelect } from "./ui/FamilyTargetSelect.jsx";
import { ChargeBar } from "./ui/ChargeBar.jsx";
import { HeatBar } from "./ui/HeatBar.jsx";
import { GlacierBar } from "./ui/GlacierBar.jsx";
import { PlantBar } from "./ui/PlantBar.jsx";
import { ScoreMilestoneBar } from "./ui/ScoreMilestoneBar.jsx"; // §6: Score-Meilenstein-Balken (Normal-Lauf nach Onboarding)
import { archetypeOf } from "./game/skills.js";
import { cycleLenFor } from "./game/shop.js";
import { GameOver } from "./ui/GameOver.jsx";
import { StartScreen } from "./ui/StartScreen.jsx";
import { RunLoader } from "./ui/RunLoader.jsx";
import { resolveSkinId, isUnlocked, DECK_DEFS, BATTLEFIELD_DEFS } from "./game/cosmetics.js";
import { THEMES, unlockAllCosmetics, activeBgFx, activeBgFinisher, activeCardAnims, activeGottFx, packOwned,
  isTieredPack, tierByDeckId, highestUnlockedTier, resolvePackByDeckId } from "./game/themes.js";
import { deckAssets, battlefieldAssets } from "./ui/cosmeticAssets.js";
import { audio } from "./ui/audio.js";
import { haptics } from "./ui/haptics.js";
import { music } from "./ui/music.js";
import { MusicBar } from "./ui/MusicBar.jsx";
import { UsernameModal } from "./ui/UsernameModal.jsx";
import { CrtParticles } from "./ui/CrtParticles.jsx";
import { CornerTools } from "./ui/CornerTools.jsx"; // #ecke: Glossar + Ton in jedem Menü, oben links
import { multTierColor, multTierLevel } from "./ui/multTier.js";
import { UpdateBanner } from "./ui/UpdateBanner.jsx"; // #update: „Neue Version verfügbar"-Hinweis (pollt version.json)

// #333: Musik-Ducking in den Auswahlphasen (Perk/Skill/Gebäude/Aufstell + übrige Nicht-„play"-Screens im Lauf) —
// Faktor 0,6 = ~40 % leiser (tunebar); 1 = volle Lautstärke im aktiven Stichspiel.
const MUSIC_DUCK = 0.6;

// #351: harter Boden für den Auto-Play-Takt — selbst bei sehr hoher dynamischer Rundengeschwindigkeit (viele Siege ×
//   MAX-Turbo) nie unter dieses Delay, und ein endlicher Fallback gegen NaN/Infinity. Verhindert 0-ms-Runaway/Nie-Feuern.
const MIN_FLIP_MS = 60;

/* #perf B1: Selten geöffnete, schwere Screens (Menü/Settings/Architekt) werden per code-split lazy geladen — das
   verkleinert den initialen JS-Chunk (schnellere Parse/Eval-Zeit, v. a. auf Mobile). WICHTIG für Desktop-Parität:
   (1) die häufigen Gameplay-Overlays im Stich-Takt (Perk/Skill/Formation/Target/…) bleiben EAGER — kein Fallback-
   Flackern mitten im Lauf; (2) ein Idle-Prefetch (unten) lädt alle Lazy-Module kurz nach dem Start im Hintergrund,
   sodass das erste Öffnen auch auf dem Desktop ohne spürbare Verzögerung ist. Import-Factories extra, damit sie sowohl
   React.lazy als auch der Prefetch nutzen kann. */
const importArchitect   = () => import("./ui/ArchitectScreen.jsx");
const importChronik     = () => import("./ui/ChronikOverview.jsx");
const importStats       = () => import("./ui/StatsScreen.jsx");
const importCustomize   = () => import("./ui/CustomizeScreen.jsx");
const importDevSetup    = () => import("./ui/DevRunSetup.jsx");
const importLeaderboard = () => import("./ui/LeaderboardScreen.jsx");
const importUpgrade     = () => import("./ui/UpgradeScreen.jsx");
const importOptions     = () => import("./ui/OptionsModal.jsx");
const importFeedback    = () => import("./ui/FeedbackModal.jsx");   // #396 Melder — nur im Menü
const importPrivacy     = () => import("./ui/PrivacyModal.jsx");    // #datenschutz — selten geöffnet, deshalb lazy
const ArchitectScreen  = lazy(() => importArchitect().then((m) => ({ default: m.ArchitectScreen })));
const ChronikOverview  = lazy(() => importChronik().then((m) => ({ default: m.ChronikOverview })));
const StatsScreen      = lazy(() => importStats().then((m) => ({ default: m.StatsScreen })));
const CustomizeScreen  = lazy(() => importCustomize().then((m) => ({ default: m.CustomizeScreen })));
const DevRunSetup      = lazy(() => importDevSetup().then((m) => ({ default: m.DevRunSetup })));
const LeaderboardScreen = lazy(() => importLeaderboard().then((m) => ({ default: m.LeaderboardScreen })));
const UpgradeScreen    = lazy(() => importUpgrade().then((m) => ({ default: m.UpgradeScreen })));
const OptionsModal     = lazy(() => importOptions().then((m) => ({ default: m.OptionsModal })));
const FeedbackModal    = lazy(() => importFeedback().then((m) => ({ default: m.FeedbackModal })));
const PrivacyModal     = lazy(() => importPrivacy().then((m) => ({ default: m.PrivacyModal })));
const LAZY_PREFETCH = [importOptions, importStats, importLeaderboard, importUpgrade, importCustomize, importChronik, importDevSetup, importArchitect];

/* #mobil-emblem — die Kachel-Embleme der Skill-Wahl in denselben Leerlauf hängen wie die Module oben.
   Am Telefon standen sie beim ersten Angebot rund eine Sekunde lang nicht da: das <img> entsteht erst,
   wenn die Auswahl aufgeht, und der Lauf ist genau der Moment, in dem NICHTS nachgeladen werden soll
   (der Kommentar am Vorlade-Effekt unten sagt, warum). Vorgeladen wird deshalb im Menü.

   WELCHE Bilder — die Teilmenge ist eine Entscheidung, keine Bequemlichkeit:

     · Nur wo eine Fassung überhaupt rendert. `phone` (< 640 px) und `wide` (≥ 1280 px) sind die zwei
       Gates in SkillSelect.jsx; das Band dazwischen zeigt kein <img> und bekommt deshalb auch keine
       Bytes. Bewusst KEINE Verneinung des Desktop-Gates — dieselbe Falle, die dort beschrieben ist.
     · Nur FREIGESCHALTETE Archetypen. Der Angebots-Pool ist darauf begrenzt (buildSkillOffer), also
       ist alles andere Bytes für Kacheln, die dieser Spieler diesen Lauf gar nicht sehen kann. Früh
       im Baum ist das ein Los statt vier.
     · Nichts bei `saveData`. Alle vier Lose wiegen 1,28 MB (gemessen, s. skillArt.js) — kein Nulltarif
       auf Mobilfunk. Wer Datensparen anhat, bekommt weiter das alte Verhalten (Nachladen beim Öffnen).

   Verworfen: (a) alle vier Lose blind — 1,28 MB, davon meist drei ungenutzt; (b) Vorladen erst beim
   Rundenstart, wenn die Archetypen feststehen — das liegt in `phase:levelup`, also mitten im Lauf, und
   damit genau in dem Idle-Slot, den der Fix unten ausschließt; (c) zusätzlich `img.decode()` wie im
   RunLoader — hält 84 fertige Bitmaps im Speicher, ohne dass die Anzeige spürbar früher käme; der
   Netzweg ist der teure Teil, und den erledigt der HTTP-Cache.

   Der Halter gibt das Bild wieder frei, sobald es da ist: die Bytes leben danach im Cache, nicht in
   einem Objekt, das die App weiter festhält. */
const warmingEmblems = new Set();
function emblemPrefetchTasks(profile) {
  if (typeof window === "undefined" || !window.matchMedia) return [];
  const showsEmblem = window.matchMedia(`(max-width: ${PHONE_MAX}px)`).matches
    || window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`).matches;
  if (!showsEmblem) return [];
  if (navigator.connection && navigator.connection.saveData) return [];
  return skillArtUrls(unlockedArchetypes(profile)).map((url) => () => {
    const im = new Image();
    warmingEmblems.add(im);
    const done = () => warmingEmblems.delete(im);
    im.onload = done;
    im.onerror = done;
    im.src = url;
  });
}

// #372 Prewarm der In-Game-Archetyp-Karteneffekte: Chunk laden UND den teuren Erst-Bitmap-Aufbau im Leerlauf erledigen,
// BEVOR die erste Archetyp-Karte im Stichspiel kommt → kein synchroner Erst-Render-Ruckler auf dem Deal-Frame mehr.
// Nur der Effekt des AKTIVEN Archetyps wird geladen (dynamischer import → kein ungewollter Chunk im Prod-Bundle, wenn
// der Archetyp nicht vorkommt). „lightning" (Ionensturm) rendert per Frame ohne Bitmap-Cache → hier nur Chunk vorladen.
const FX_PREWARM = {
  plant:     (opts) => import("./ui/fx/MossGrow.jsx").then((m) => m.prewarmMoss?.(opts)),
  ice:       (opts) => import("./ui/fx/FrostIce.jsx").then((m) => m.prewarmFrost?.(opts)),
  lightning: () => import("./ui/fx/CardIonStorm.jsx"),
};

// Suspense-Fallback = derselbe abgedunkelte Blur-Grund wie die Overlays selbst → beim (seltenen, weil vorgeladenen)
// Nachladen kein weißer Blitz, sondern ein nahtloser Übergang. pointer-events blockt Klicks während des Ladens.
function OverlayFallback() {
  return overlayPortal(<div className="fixed inset-0 z-40" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }} aria-hidden="true" />);
}

// #telemetrie: der Spiel-Reducer plus Entscheidungs-Mitschrift. Modul-Ebene (nicht im Render) → die
// Reducer-Identität bleibt über Re-Renders stabil, wie bei `reducer` vorher.
const gameReducer = withDecisionLog(reducer);

// #393 Zufalls-Deck je Lauf — alle Deckfarben-Flags auf „an" (Effekte in Deckfarbe des zufällig gezogenen Packs). Wirkt
//   nur auf tatsächlich AKTIVE Effekte: die active…-Ableitungen gaten weiter auf Besitz+Toggle, das …Deck-Flag ist nur der
//   Farbmodus des ohnehin gerenderten Effekts → inaktive Flags sind wirkungslos. archColor:"deck" zieht die Archetyp-FX mit.
const ALL_DECK_TINT = {
  fxScorchDeck: true, fxBlackholeDeck: true, fxKlingeDeck: true, fxHologridDeck: true,
  fxAuroraDeck: true, fxNeonsurfDeck: true, fxStarfieldDeck: true, fxCubeMatrixDeck: true,
  fxSonnenPulsDeck: true, fxLaserFaecherDeck: true, fxPrismaKaskadeDeck: true, fxHoloCubeDeck: true, fxSupernovaDeck: true,
  archColor: "deck",
};
// #393 Zufälligen besessenen FARBIGEN Pack ziehen (Genesis/Standard ausgeschlossen — hätte keine Deckfarbe). Nur Skin/BF/
//   Farben, rein kosmetisch → Math.random unbedenklich (keine Engine-Determinismus-Wirkung). Leerer Pool → null (kein Override).
//   #tiered: Fällt die Wahl auf ein Stufen-Deck, wird die zuletzt manuell gewählte Stufe (options.tierSel[id]) genommen —
//   sofern noch freigeschaltet, sonst die höchste freie Stufe. So bleibt die Auswahl auch im Zufalls-Modus konsistent.
function pickRandomOwnedPack(profile, options = null) {
  const pool = THEMES.filter((t) => t.id !== "genesis" && t.a1 && packOwned(profile, t));
  if (!pool.length) return null;
  const t = pool[Math.floor(Math.random() * pool.length)];
  if (isTieredPack(t)) {
    const selDeck = options && options.tierSel ? options.tierSel[t.id] : null;
    const selTier = tierByDeckId(t, selDeck);
    const tier = (selTier && isUnlocked(DECK_DEFS[selTier.deckId], profile)) ? selTier : highestUnlockedTier(profile, t);
    if (tier) return { deckId: tier.deckId, battlefieldId: tier.bfId };
  }
  return { deckId: t.deckId, battlefieldId: t.bfId };
}

/* #fx-spike: die Shader-Vergleichsseite (`?fxspike=1`) ist entfallen. Sie hatte genau eine Frage zu klären —
   „rendert ein Pixi-Custom-Shader auf dem Mobile-Setup?" — und die ist am echten Gerät beantwortet (ja, 60
   Zeichnungen/s). Ihre Erkenntnisse stehen in docs/decisions/engineering-log-2026-08.md (#fx-spike) und in
   pixiFieldShader.js; die Seite selbst hätte nur eine zweite Fassung derselben Shader am Leben gehalten. */
export function Autostich() {
  return <AutostichGame />;
}

function AutostichGame() {
  const [state, dispatch] = useReducer(gameReducer, null, () => menuState());
  const [paused, setPaused] = useState(false);
  // #buehne: ab 1280 px trägt die Vitalleiste Musik und Meilenstein (statt eigener Reihen darüber und
  // darunter). Das ist ein DOM-Umzug, keine Anordnung — deshalb hier und nicht in CSS.
  const wide = useIsWide();
  // #sprache: Die Sprache MUSS vor dem ersten Rendern stehen, sonst blitzt eine Frame lang die
  // falsche Sprache auf. Deshalb direkt im Initializer (idempotent, StrictMode-fest) statt im Effekt.
  // `lang: null` = noch nie gewählt → DEFAULT_LOCALE (Englisch). Beim ersten Start wählt der Spieler
  // im Namens-Dialog selbst; danach in den Optionen. Die Browsersprache wird bewusst nicht befragt.
  const [options, setOptions] = useState(() => {
    const o = loadOptions();
    setLocale(o.lang || undefined);
    return o;
  });   // Optionen (#41): u. a. CRT-Skin
  // Perf: reducedFx auflösen (Mobile/schwaches Gerät/System-Wunsch) und als data-Attribut ans Root hängen.
  // Eine zentrale CSS-Regel (index.css) schaltet damit den teuren Overlay-Blur (backdrop-filter) ab —
  // der wird hinter Gameplay-Overlays sonst pro Frame neu berechnet (laufende Puls-/Glow-Animationen).
  // Desktop-Look bleibt unverändert; nur dort greift die Reduktion, wo sie Stutter spart.
  // #: Ab „balanced" greift die reine Perf-Reduktion (Overlay-Blur + Rahmen-/Titel-Sweep aus) — das kostet keine
  // sichtbare Optik, spart aber Dauer-Repaints. Der Feel-Good-Layer (Kartenflip/Ambient) hängt NICHT hier, sondern
  // am Level im Battlefield → „ausgewogen" bleibt lebendig, nur die teuren Dauer-Layer fallen weg.
  const fxLevel = useFxLevel(options.reducedFx);
  useEffect(() => {
    const el = document.documentElement;
    if (fxLevel !== "full") el.dataset.reducedFx = "1"; else delete el.dataset.reducedFx;
  }, [fxLevel]);
  // Zahlengröße: skaliert NUR die floating Score-Zahlen (.card-num-Floats) über eine CSS-Variable. Auf 0,75–1,25
  // geklemmt. Die echten Kartenzahlen sind FEST auf 120% (Card.jsx, inline-fontSize überschreibt die CSS-Variable).
  useEffect(() => {
    const s = Math.min(1.25, Math.max(0.75, Number(options.numScale) || 1));
    document.documentElement.style.setProperty("--num-scale", String(s));
  }, [options.numScale]);
  const [showOptions, setShowOptions] = useState(false);          // Optionen-Overlay offen? → pausiert den Run
  const [showStats, setShowStats] = useState(false);              // #172 FB-10: Statistik-Hub (nur im Menü)
  const [showCustomize, setShowCustomize] = useState(false);      // #190: Kollektion (Deck/Battlefield, nur im Menü)
  /* #217: globale Bestenliste zog vom Startbildschirm in einen eigenen Screen.
     #global: Der Zustand trägt jetzt AUCH, in welcher Rolle der Bildschirm geöffnet wurde —
     false = zu · "board" = Nachschlagen (Kachel „Bestenliste", GameOver) · "ranked" = Spiel-Einstieg
     (der große Ranglisten-Knopf). Vorher stand hier `true` gegen `"meister"`, und der Unterschied
     verschwand in einer typeof-Prüfung an der Rendering-Stelle. */
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);        // Progression-Vorschau: Upgrade-Baum-Screen
  const [profile, setProfile] = useState(loadProfile);            // #190: Profil (Freischalt-Status) — nach jedem Lauf aktualisiert
  const [newUnlocks, setNewUnlocks] = useState([]);               // #190: in DIESEM Lauf frisch freigeschaltete Skins → GameOver
  const [progressUnlocks, setProgressUnlocks] = useState([]);     // #299: Onboarding-/Meta-Freischaltungen dieses Laufs → Victory-Banner
  const [runEarn, setRunEarn] = useState(null);                   // #304: Lauf-Ertrag (SP/DP) für den Victory-Rollup
  /* #go-ruhe: die All-Time-Bestmarken, wie sie VOR diesem Lauf standen. Der Endscreen kann sie nicht selbst
     laden — wenn er rendert, hat recordRun das Profil längst überschrieben und jeder Vergleich ergäbe
     „gleich hoch", also nie ein NEU. Der Schnappschuss entsteht deshalb hier, eine Zeile vor der Wertung. */
  const [prevBests, setPrevBests] = useState(null);
  const [onboardingBanner, setOnboardingBanner] = useState(null); // #: Onboarding-Fortschritt/Belohnung fürs Victory-Banner
  const [pendingRun, setPendingRun] = useState(null);             // #190: Vorlade-Gate beim Run-Start (Skin-Bild-URLs)
  const [runVisual, setRunVisual] = useState(null);               // #393: Zufalls-Deck-Override für DIESEN Lauf ({deckId,battlefieldId}) oder null (gewähltes Deck)
  const pendingSeed = useRef(null);                               // #205: Challenge-Seed für den nächsten Lauf (null → frischer Zufalls-Seed)
  const pendingDev = useRef(null);                                // Dev-Run: Config { rounds, schedule, cover, energy } für den nächsten Lauf (null = normaler Lauf)
  const pendingRanked = useRef(null);                             // §7 (Schritt 6): nächster Lauf = Ranglisten-Lauf? ('ranked' = Wochen-Modus)
  const [showFeedback, setShowFeedback] = useState(false);      // #396 Feedback-Melder (nur im Menü, deshalb OHNE Einfrier-Kopplung)
  /* #datenschutz: Der Hinweis wird aus DREI Stellen geöffnet (Optionen · Startbildschirm · Namens-Dialog)
     und liegt deshalb hier an der Wurzel statt in einem der drei. Er pausiert bewusst NICHTS: die Optionen,
     aus denen er meist aufgeht, frieren den Lauf bereits ein — eine zweite Kopplung wäre doppelt gemoppelt. */
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDevSetup, setShowDevSetup] = useState(false);        // Dev-Run-Setup-Overlay (nur Preview-Build)
  const [showChronik, setShowChronik] = useState(false);          // Chronik-Kartenübersicht (§22.11)
  const [glossaryOpen, setGlossaryOpen] = useState(false);        // Glossar-Overlay offen → friert den Lauf ein (wie Optionen/Chronik)
  const [confirmAbort, setConfirmAbort] = useState(false);        // #254: Rückfrage „Lauf wirklich abbrechen?" (Beenden-Button ODER Zurück-Geste im Run)
  const [confirmRestart, setConfirmRestart] = useState(false);    // Komfort: Rückfrage „Wirklich neustarten?" (Neustart-Button) — kein Ein-Tap-Verlust bei Fettfingern
  const [speedMult, setSpeedMult] = useState(1); // Ablaufbeschleunigung intern 1×/2×/4×/5× (Buttons X2/X4/MAX; #27, kein Score-Effekt)
  // #perf A1: Der Timer tickt nicht mehr die ganze App (früher: setClock alle 250 ms → Full-Tree-Re-Render inkl.
  // Battlefield). Die Zeit rechnet ein stabiler Getter aus den Refs; das 250-ms-Ticken lebt jetzt allein im RunTimer-Leaf.
  const getElapsed = useCallback(() => timeBase.current + (segStart.current != null ? Date.now() - segStart.current : 0), []);
  // #perf B1: die lazy Screens im Leerlauf vorladen, damit das erste Öffnen ohne spürbare Verzögerung ist.
  // WICHTIG (Fix „laggt im Spiel"): NUR im Menü/Gameover vorladen — NIE während eines laufenden Stichspiels. Sonst
  // konnte der Chunk-Download/Parse (Main-Thread) in einem Idle-Slot MITTEN in die Animationsframes (Hologrid/Finisher)
  // fallen und mehrere Frames blockieren. Zusätzlich gestaffelt (ein Modul pro Idle-Slot) → kein großer Parse-Burst.
  const prefetchedRef = useRef(false);
  useEffect(() => {
    if (prefetchedRef.current) return undefined;
    if (state.phase !== "menu" && state.phase !== "gameover") return undefined; // im Lauf nichts vorladen
    prefetchedRef.current = true;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    // #mobil-emblem: die Embleme hängen HINTEN dran — ein Modul-Chunk kostet einen Frame, ein Bild
    // kostet einen Request. Die Bildschirme bleiben also so schnell wie bisher, und die Bilder nehmen
    // den Leerlauf danach mit (ein Posten je Idle-Slot wie gehabt, kein Burst).
    const queue = [...LAZY_PREFETCH, ...emblemPrefetchTasks(profile)];
    let i = 0;
    const step = () => { if (i >= queue.length) return; try { queue[i++](); } catch (e) { /* Prefetch nie kritisch */ } idle(step); };
    const id = idle(step);
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, [state.phase, profile]);
  const [highscores, setHighscores] = useState(() => loadHighscores());
  const [isRecord, setIsRecord] = useState(false);
  // Globaler Highscore (#14): lokaler Nickname + Ersteinrichtungs-Modal.
  const [username, setUsername] = useState(loadUsername);
  const [showUsername, setShowUsername] = useState(() => !loadUsername());
  const [myEntry, setMyEntry] = useState(null);  // zuletzt gewerteter Lauf → Hervorhebung im Global-Board
  const [pubToken, setPubToken] = useState(0);    // bumpt nach erfolgreichem Submit → Board lädt neu
  function onSaveUsername(name) { saveUsername(name); setUsername(name); setShowUsername(false); }
  const [multPulse, setMultPulse] = useState(0);      // Zähler: bumpt bei Anstieg des Score-Mults → Puls (#37)

  // GEIST — Rekord-Trajektorie (Score je GHOST_STEP Stiche) + laufende Reihe
  const recordTraj  = useRef([]);
  const recordTotal = useRef(0);
  const currentTraj = useRef([]);
  const runStartRecordTraj = useRef([]); // Rekord gegen den DIESER Lauf antritt — Snapshot vor saveRun (#35)
  const runId       = useRef(Date.now());
  const recorded    = useRef(false);
  // #205: Wurde der Seed dieses Laufs vom Spieler GEWÄHLT (Challenge/Nachspielen/Einfügen) oder gewürfelt?
  // Jeder Lauf bekommt einen Seed (beginRun), also reicht `state.seed != null` als Unterscheidung nicht —
  // „Neustart" muss aber nur den gewählten wiederverwenden und darf casual ein frisches Brett geben.
  // Läuft über die Resume-Meta mit, damit die Unterscheidung ein Fortsetzen überlebt.
  const seedWasChosen = useRef(false);
  // RESUME (Auto-Save) — gespeicherter laufender Run (überlebt Wegtabben/Schließen des Browsers, v. a. Mobile).
  // `resumable` speist den „Fortsetzen"-Knopf im Menü; `stateRef` hält den AKTUELLEN State, damit die
  // Lifecycle-Handler (visibilitychange/pagehide) ohne ständiges Re-Registrieren snapshotten können.
  const [resumable, setResumable] = useState(() => loadActiveRun());
  const stateRef = useRef(state);
  // Sichtbarkeit des Tabs — pausiert Clock-Tick und Auto-Play, solange der Tab im Hintergrund ist
  // (Akku/Hitze: kein Weiterlaufen von Ticks/Re-Renders hinter einem unsichtbaren Tab). SSR-sicher.
  const [visible, setVisible] = useState(() => typeof document === "undefined" || document.visibilityState !== "hidden");

  // RUN-TIMER (#10) — akkumulierte aktive Zeit; friert bei Pause / außerhalb „play" ein (#9)
  const timeBase = useRef(0);
  const segStart = useRef(null);
  const prevMult = useRef(1);     // vorheriger Score-Mult (Puls nur bei Anstieg, #37)
  // Offenes Optionen-Overlay friert den Lauf ein (wie andere Overlays) — ohne den
  // Nutzer-Pause-Toggle zu verändern: beim Schließen läuft es im vorherigen Zustand weiter.
  // #260: Der Lauf-Timer zählt in ALLEN Spielphasen (auch Auswahlen: Skill-/Perk-/Stat-/Ziel-Wahl, Architekt,
  // Aufstellung) — nur Menü/Gameover stehen außerhalb. So schätzt die Zeit die echte Rundendauer, statt nur die
  // reine Stichspiel-Zeit. Echte Unterbrechungen (Pause, Optionen-/Chronik-/Glossar-Overlay) frieren weiterhin ein.
  const inRun = state.phase !== "menu" && state.phase !== "gameover";
  const active = inRun && !paused && !showOptions && !showChronik && !glossaryOpen && !confirmAbort && !confirmRestart;
  // #perf-overlay: „Das Brett ist wirklich zu sehen." `active` deckt nur die Modals ab (Optionen/Chronik/Glossar/
  // Rückfragen/Pause) — die AUSWAHL-PHASEN fehlten: Architekt, Perk/Skill, Aufstellung, Ziel- und Legendär-Wahl
  // rendern ihr Vollbild-Overlay ÜBER das weiterhin gemountete Battlefield (s. `state.phase === "architect"` weiter
  // unten — der Screen ersetzt das Brett nicht, er liegt darauf). Die Effekt-Schleifen liefen dort mit voller Rate
  // für ein unsichtbares Bild weiter; im Perf-Report fielen 99 von 386 Rucklern eines Laufs in nur 4 Architekt-
  // Besuche. Das Brett ist nur in der Spielphase sichtbar → genau dann dürfen die Emitter laufen.
  const boardVisible = active && state.phase === "play";
  stateRef.current = state; // Snapshot-Handler lesen immer den aktuellen State (kein Re-Registrieren je Stich)
  // #telemetrie: gleiche Technik für Profil/Optionen — der pagehide-Handler ist EINMAL registriert und
  // dürfte sonst einen eingefrorenen (stale) Stand von vor Stunden senden.
  const metaRef = useRef({ profile, options });
  metaRef.current = { profile, options };
  // Effektive Lauflänge — spiegelt die Engine-Endbedingung (engine.js): Dev-Run (state.maxCycles) ODER
  // Großmeister IV/V (difficulty.maxCycles 57/54) ODER Basis (MAX_CYCLES 60). HUD-Nenner + Completion-Check lesen DIES.
  const totalCycles = state.maxCycles || state.difficulty?.maxCycles || MAX_CYCLES;
  // Dynamische Rundengeschwindigkeit (#95): jeder Durchlauf startet bei +0 % und beschleunigt
  // +2 % je in DIESEM Durchlauf gewonnenem Stich → sichtbare Eskalation zum Rundenende, Reset je Durchlauf.
  // Rein Anzeige/Ablauf (score-neutral wie der Turbo). cycleWins = Siege seit Durchlauf-Beginn.
  // #351: Basis-Wins des aktuellen Durchlaufs SYNCHRON beim ersten Render mitführen (nicht erst im [state.cycle]-Effekt) —
  //   sonst ist cycleWins beim Durchlauf-/Run-Start einen Render lang stale → die erste flipMs-Berechnung kurz verfälscht.
  const cycleWinBase = useRef({ cycle: state.cycle, wins: state.wins || 0 });
  if (cycleWinBase.current.cycle !== state.cycle) cycleWinBase.current = { cycle: state.cycle, wins: state.wins || 0 };
  const cycleWins = Math.max(0, (state.wins || 0) - cycleWinBase.current.wins);
  const dynamicSpeed = 1 + 0.02 * cycleWins;
  // Effektive Flip-Zeit: Basis / (Turbo intern 1×/2×/4×/5× — Buttons X2/X4/MAX — × dynamische Rundengeschwindigkeit).
  // #351: immer ENDLICH & > 0 halten (gegen NaN/0/Infinity aus transient invaliden Faktoren) — sonst würde der
  //   Auto-Play-setTimeout mit NaN/Infinity nie bzw. sofort feuern → Hänger „vor dem ersten Stich".
  const rawFlipMs = BASE_FLIP_MS / (speedMult * dynamicSpeed);
  const flipMs = Number.isFinite(rawFlipMs) && rawFlipMs > 0 ? rawFlipMs : BASE_FLIP_MS;
  // #188 v2: Hit-Stop/Slow-Mo nach großen Krit-Siegen auf Wunsch ENTFERNT → der nächste Stich läuft immer im
  // normalen Takt (flipMs), keine Verzögerung mehr.
  const hitStopMs = 0;

  useEffect(() => {
    const g = loadGhost();
    recordTraj.current = g.traj;
    recordTotal.current = g.total;
  }, []);

  // CRT-Skin (#41): data-skin am <html> → alle skin-gated CSS-Regeln greifen global (auch das fixed Scanline-
  // Overlay). Der CRT-Look ist jetzt der feste Default des Spiels — IMMER an, nicht mehr abwählbar (Option entfernt).
  useEffect(() => {
    document.documentElement.setAttribute("data-skin", "crt");
  }, []);
  // Sound (#110): SFX-Manager initialisieren + DELEGIERTER Klick-Sound (ein Listener deckt alle <button>
  // ab). data-sfx="none" schließt einzelne Buttons aus (z. B. Kauf-Abschluss → eigener Cashout-Sound).
  // Jeder Klick ist zugleich die User-Geste, die den AudioContext entsperrt (Autoplay-Gate).
  useEffect(() => {
    audio.init();
    const onClick = (e) => {
      audio.unlock(); music.unlock(); // erste User-Geste entsperrt SFX UND Musik
      const btn = e.target.closest && e.target.closest("button");
      if (!btn || btn.dataset.sfx === "none") return;
      audio.play("button", { gain: 0.55 }); // #: Klick-Sound leiser (dezenter, tritt nicht mehr in den Vordergrund)
      haptics.tick(); // #207: dezenter Haptik-Tick auf Mobile — spiegelt exakt den Klick-Sound (gleiches data-sfx="none"-Opt-out)
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  // Optionen → Audio-Manager spiegeln (Mute/Lautstärke). #207: Haptik-Toggle spiegeln (Default an; wirkt nur auf Mobile).
  useEffect(() => { audio.setMuted(!!options.muted); audio.setVolume(options.sfxVol ?? 0.4); }, [options.muted, options.sfxVol]);
  useEffect(() => { haptics.setEnabled(options.haptics !== false); }, [options.haptics]);
  // #sprache: Sprachwechsel in den i18n-Kern spiegeln und `<html lang>` mitziehen (Screenreader, Browser-Übersetzung,
  // Silbentrennung). Der Kern benachrichtigt alle Abonnenten (useLocale) → die UI rendert in der neuen Sprache neu.
  // Der Tab-Titel zieht mit: index.html trägt den deutschen Titel statisch (er steht im HTML, bevor
  // React lädt und die gewählte Sprache kennt) — hier wird er in der Spielsprache nachgesetzt. Die
  // Marke heißt im Englischen „Autotrick": „Autostich" trägt „Stich" sichtbar, englisch liest sich
  // dasselbe Wort als Nähbegriff (stitch). Nicht mitgezogen wird der PWA-Name im
  // manifest.webmanifest — ein Manifest kennt keine Sprachumschaltung, es wird beim Installieren
  // einmal gelesen.
  useEffect(() => {
    const loc = setLocale(options.lang || undefined);
    try { document.documentElement.lang = loc; } catch (e) {}
    try { document.title = t("meta.title"); } catch (e) {}
  }, [options.lang]);
  // Kauf-Sound (#110): am Wachstum des Kauf-Logs (#127) → exakt 1× je ABGESCHLOSSENEM Kauf (immediate & Ziel-Items),
  // nie premature (Ziel-Flow öffnen) und nie bei no-op. Deshalb Cashout-Buttons via data-sfx="none" stummgeschaltet.
  const prevBuys = useRef(0);
  useEffect(() => {
    const n = state.shop?.purchaseLog?.length || 0;
    if (n > prevBuys.current) { audio.play("buy"); haptics.tick(); } // #207: Kauf-Bestätigung buzzt mit (Cashout-Button ist data-sfx="none")
    prevBuys.current = n;
  }, [state.shop?.purchaseLog?.length]);
  // Musik (#111): Titel-Abo für die Anzeige + phasengesteuerte Wiedergabe. musicHome = Menü ODER Gameover
  // → „Midnight Drive"; sonst (im Run) ein zufälliger Track aus dem harmonisierten Pool. Lautstärke/Mute spiegeln.
  const [musicTitle, setMusicTitle] = useState(null);
  useEffect(() => music.subscribe(setMusicTitle), []);
  const musicHome = state.phase === "menu" || state.phase === "gameover";
  // #339: aktuellen Score über einen Ref bereithalten (KEINE Effekt-Dep → die Musik startet nicht bei jedem Score-Tick neu),
  //   damit enterRun beim Run-/Resume-Start die zum gespeicherten Score passende Stufe wählt (statt immer calm).
  const scoreRef = useRef(state.score || 0);
  useEffect(() => { scoreRef.current = state.score || 0; }, [state.score]);
  useEffect(() => { if (musicHome) music.menu(); else music.enterRun(scoreRef.current); }, [musicHome]);
  // Aktueller Score an die Musik: steuert die Intensitäts-Stufe (<1 Mio ruhig → 60 Mio+ Overdrive+).
  useEffect(() => { if (!musicHome) music.setProgress(state.score || 0); }, [state.score, musicHome]);
  useEffect(() => { music.setMuted(!!options.muted); music.setVolume(options.musicVol ?? 0.2); }, [options.muted, options.musicVol]);
  // Ruhiger Modus (Option): kappt die score-abhängige Musik-Eskalation bei „mid" (nur calm/mid-Tracks). Default aus.
  useEffect(() => { music.setCalmMode(!!options.calmMusic); }, [options.calmMusic]);
  // #333: In den Auswahl-/Aufbau-Screens im Lauf (alles außer „play") die Musik ~40 % leiser ziehen (sanft), im
  // aktiven Stichspiel wieder voll. Deckt Perk/Skill/Gebäude/Aufstell und konsistent target/family-target/glacier-target/
  // legendary ab. Duck ist KEIN Mute (Nutzer-Lautstärke/Mute bleiben unberührt).
  useEffect(() => { music.setDuck(inRun && state.phase !== "play" ? MUSIC_DUCK : 1); }, [inRun, state.phase]);
  // Pause-Knopf hält die Musik an (nur im laufenden Stichspiel; in Menü/Gameover spielt sie normal weiter) UND der
  // Hintergrund/geschlossen-Zustand (!visible) hält sie IMMER an — sonst läuft die BGM auf dem Handy hinter dem
  // gesperrten Bildschirm/App-Wechsel weiter. Beim Zurückkehren (visible) wird der Zustand neu berechnet → Musik läuft weiter.
  useEffect(() => { music.setPaused((paused && state.phase === "play") || !visible); }, [paused, state.phase, visible]);
  // #: „Game komplett samt Musik pausieren", wenn die App in den Hintergrund geht/geschlossen wird (Handy sperren,
  // App-Wechsel): zusätzlich zur BGM den GANZEN Sound-Context suspendieren (alle SFX/Finisher-Betten einfrieren,
  // Akku sparen) — und beim Zurückkehren nahtlos fortsetzen. Der Lauf selbst friert bereits über `visible` ein.
  useEffect(() => { audio.setSuspended(!visible); }, [visible]);
  // #: Persistente Finisher-Ton-Betten (Brennstrahl/Schwarzes Loch) dürfen NUR in zwei Zuständen klingen: (1) im aktiv
  // laufenden Stichspiel und (2) in der Werkstatt-Vorschau (dort mounten die Preview-Betten). In JEDEM anderen Zustand
  // — Pause, Auswahl-/Perk-Fenster (Phase ≠ „play"), Overlays, Hintergrund-Tab UND besonders der Victory-/Gameover-Screen
  // (Lauf zu Ende, aber der letzte Sieg-Loop hängt noch) — werden sie verstummt. Positiv-Logik (statt inRun-gated), damit
  // auch der Gameover-Zustand (inRun=false) sicher greift.
  useEffect(() => {
    const inActivePlay = inRun && state.phase === "play" && !paused && !showOptions && !showChronik && !glossaryOpen && !confirmAbort && !confirmRestart && visible;
    const loopsAllowed = inActivePlay || showCustomize; // Werkstatt-Showcase = einziger Nicht-Spiel-Ort mit Loop-Betten
    audio.setLoopsSuspended(!loopsAllowed);
    audio.setFxSuspended(!loopsAllowed); // #329: Effekt-One-Shots (fx_*) exakt wie die Loop-Betten gaten → kein Sound-Schwanz im Victory/Overlay
  }, [inRun, state.phase, paused, showOptions, showChronik, glossaryOpen, confirmAbort, confirmRestart, visible, showCustomize]);
  const changeOptions = (patch) => setOptions((o) => {
    // #telemetrie: Abschalten verwirft auch das, was noch in der Warteschlange liegt (siehe telemetry.purge).
    if (patch.telemetry === false && o.telemetry !== false) telemetry.purge();
    return saveOptions({ ...o, ...patch });
  });

  // #254: Zentrale Zurück-Behandlung (mobil, Swipe/Hardware/Browser). Priorität: oberstes abweisbares Overlay
  // schließen → im aktiven Lauf Abbruch-Rückfrage öffnen (nicht sofort verlassen) → sonst Standard-Zurück zulassen.
  // Rückgabe true = Geste verbraucht (Guard hält die App), false = normale Navigation (z. B. Menü verlassen).
  const handleBack = () => {
    // #datenschutz: ganz oben in der Kette — der Hinweis liegt auf z-50 ÜBER allem anderen und wird aus
    // Optionen/Namens-Dialog heraus geöffnet. Stünde er weiter unten, schlösse die Zurück-Geste das
    // darunterliegende Overlay und ließe den Hinweis über einem leeren Bildschirm stehen.
    if (showPrivacy) { setShowPrivacy(false); return true; }
    if (showUsername) { setShowUsername(false); return true; }
    if (showDevSetup) { setShowDevSetup(false); return true; }    // #350: Dev-Run-Setup → schließen (Preview-Build)
    if (glossaryOpen) { setGlossaryOpen(false); return true; }
    if (showChronik) { setShowChronik(false); return true; }
    if (showOptions) { setShowOptions(false); return true; }
    if (showStats) { setShowStats(false); return true; }
    if (showCustomize) { setShowCustomize(false); return true; }
    if (showLeaderboard) { setShowLeaderboard(false); return true; }
    if (showUpgrades) { setShowUpgrades(false); return true; }
    if (confirmRestart) { setConfirmRestart(false); return true; } // offene Neustart-Rückfrage → schließen
    if (confirmAbort) { setConfirmAbort(false); return true; }   // offene Rückfrage → abbrechen (schließen)
    if (inRun) { setConfirmAbort(true); return true; }            // aktiver Lauf → erst fragen, nichts verlieren
    return false;                                                 // Menü/Gameover, nichts offen → Standard-Zurück
  };
  useBackGuard(handleBack);
  // #254: Harte Reloads/Tab-Schließen im aktiven Lauf absichern (ergänzt den Zurück-Guard).
  useEffect(() => {
    if (!inRun) return;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [inRun]);

  // AUTO-SAVE (Resume) — snapshottet den laufenden Run in localStorage, damit er das Wegtabben/Schließen des
  // Browsers überlebt (Mobile verwirft Background-Tabs; Pause allein speichert nichts). Liest State/Timer aus Refs.
  const persistActiveRun = () => {
    const s = stateRef.current;
    if (!s || s.phase === "menu" || s.phase === "gameover") return;
    const tb = timeBase.current + (segStart.current != null ? Date.now() - segStart.current : 0);
    saveActiveRun(s, { timeBase: tb, runId: runId.current, currentTraj: currentTraj.current, seedWasChosen: seedWasChosen.current });
  };
  // Mobile-zuverlässige Speicherpunkte: Tab in den Hintergrund (visibilitychange→hidden) ODER Seite entladen
  // (pagehide) → sofortiger Snapshot. beforeunload feuert auf Mobile NICHT verlässlich → DAS hier ist der eigentliche Fix.
  useEffect(() => {
    /* #telemetrie: Seite wird entladen, während ein Lauf läuft (Tab zu, harter Reload) → der Lauf gilt als
       abgebrochen und geht als solcher raus. Bewusst NUR an `pagehide`, nicht an `visibilitychange`: Wegtabben
       ist kein Abbruch (man kommt zurück), und ein Abbruch je Tab-Wechsel würde die Daten fluten.
       Ein später fortgesetzter und beendeter Lauf schreibt zusätzlich seine reguläre Zeile — in der Auswertung
       trennt `outcome` die beiden (docs/telemetry.md). `keepalive` hält den Request über das Entladen hinweg.
       Bewusst INNERHALB des Effekts definiert: der Handler liest ausschließlich Refs, hat also keine Deps —
       außerhalb wäre er bei jedem Render eine neue Funktion und der Effekt müsste ihn als Abhängigkeit führen
       (oder die Regel unterdrücken), obwohl sich nie etwas ändert. */
    const onPageHide = () => {
      persistActiveRun();
      const s = stateRef.current;
      if (!s || s.phase === "menu" || s.phase === "gameover" || recorded.current) return;
      const { profile: pf, options: op } = metaRef.current;
      telemetry.recordAbandoned({
        enabled: op.telemetry !== false, state: s, profile: pf, options: op, runId: runId.current,
        durationMs: timeBase.current + (segStart.current != null ? Date.now() - segStart.current : 0),
      });
    };
    const onVis = () => {
      const hidden = document.visibilityState === "hidden";
      if (hidden) persistActiveRun();
      setVisible(!hidden); // pausiert/reaktiviert Clock-Tick + Auto-Play (Akku/Hitze im Hintergrund)
    };
    // #366: `visible` NICHT nur an `visibilitychange` koppeln. Auf iOS Safari wird das „wieder sichtbar"-Event bei
    //   schnellen UI-Übergängen / während des RunLoader-Vorladens gelegentlich verschluckt → `visible` bliebe stale
    //   `false` und der Lauf hinge für immer. `focus`/`pageshow` synchronisieren die Sichtbarkeit spätestens beim
    //   nächsten Fokus/Interaktion aus dem LIVE-Zustand nach → ein stale-false heilt von selbst.
    const onResync = () => setVisible(document.visibilityState !== "hidden");
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("focus", onResync);
    window.addEventListener("pageshow", onResync);
    document.addEventListener("visibilitychange", onVis);
    // #telemetrie: liegengebliebene Läufe aus früheren Sitzungen (offline/Netzfehler) jetzt nachreichen —
    // aber nur bei aktivem Schalter; ist er aus, wird die Warteschlange stattdessen verworfen.
    if (metaRef.current.options.telemetry !== false) telemetry.flush(); else telemetry.purge();
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("focus", onResync);
      window.removeEventListener("pageshow", onResync);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  // Checkpoints im Lauf: bei jedem Durchlauf-Wechsel und jeder Entscheidungsphase (levelup/formation/architect/…)
  // sofort snapshotten — niederfrequent, deckt die üblichen Verlustpunkte ab (die feineren fängt visibilitychange).
  useEffect(() => {
    if (inRun) persistActiveRun();
  }, [state.cycle, state.phase, inRun]);

  // Timer-Segmente: bei Wechsel aktiv <-> inaktiv die verstrichene Zeit verbuchen.
  useEffect(() => {
    if (active && segStart.current == null) segStart.current = Date.now();
    else if (!active && segStart.current != null) {
      timeBase.current += Date.now() - segStart.current;
      segStart.current = null;
    }
  }, [active]);
  // #perf A1: Kein App-weiter 250-ms-Tick mehr — der RunTimer-Leaf tickt sich selbst (nur wenn `active && visible`).

  // Auto-Play: nach jedem Stich (trickNo ändert sich) den nächsten planen. Pause hält alles an.
  useEffect(() => {
    if (state.phase !== "play" || paused || showOptions || showChronik || glossaryOpen || confirmAbort || confirmRestart || !visible) return; // #254: Abbruch-/Neustart-Rückfrage friert den Lauf ein (wie ein Overlay) · !visible: Hintergrund-Tab hält den Lauf an (Akku/Hitze)
    // #188 v2: nach einem großen Krit-Sieg um hitStopMs verzögert (kurzer „Hit-Stop"/Slow-Mo), sonst normaler Takt.
    // #351: Delay hart auf ein endliches Minimum clampen (nie 0/NaN/Infinity → setTimeout feuert zuverlässig).
    const delay = Math.max(MIN_FLIP_MS, Number.isFinite(flipMs + hitStopMs) ? flipMs + hitStopMs : BASE_FLIP_MS);
    const id = setTimeout(() => dispatch({ type: "RESOLVE_TRICK", rng: Math.random }), delay);
    return () => clearTimeout(id);
    // #56: flipMs direkt (statt seiner Einzel-Eingaben speedPct/speedMult) → Deps veralten nicht,
    // falls flipMs künftig von weiteren Variablen abhängt.
    // #148: showChronik friert den Lauf ein (wie showOptions) — Tricks laufen nicht mehr hinter dem Overlay weiter.
  }, [state.phase, state.trickNo, paused, showOptions, showChronik, glossaryOpen, confirmAbort, confirmRestart, visible, flipMs, hitStopMs]);

  // #351/#366 Watchdog (Sicherheitsnetz gegen seltene Start-/Race-Hänger): Läuft der Lauf (phase play, keine Overlays/
  //   Pause), bewegt sich trickNo aber > STUCK_MS nicht UND ist die Seite LIVE sichtbar, den Guard-Zustand EINMAL loggen
  //   (Diagnose) und EINEN RESOLVE_TRICK anstoßen (self-heal). #366: bewusst NICHT auf das `visible`-Flag gaten (ein stale
  //   false soll den Watchdog nicht lahmlegen) — die Sichtbarkeit wird im Intervall live geprüft. Im Normalbetrieb
  //   (trickNo alle ≤ flipMs) triggert es nie (STUCK_MS ≫ flipMs).
  const lastTrickAt = useRef(0);
  const stuckNudged = useRef(false);
  useEffect(() => { lastTrickAt.current = Date.now(); stuckNudged.current = false; }, [state.trickNo, state.phase]);
  useEffect(() => {
    // #366: Der Watchdog darf NICHT auf `visible` gaten — genau der Fall „stale visible===false" (führender Verdacht)
    //   soll ihn nicht mitlahmlegen. Stattdessen prüft er die Sichtbarkeit im Intervall LIVE (document.visibilityState):
    //   echt im Hintergrund → nichts tun (Akku/Hitze bleibt respektiert); sichtbar, aber trickNo hängt → resync + nudge.
    if (state.phase !== "play" || paused || showOptions || showChronik || glossaryOpen || confirmAbort || confirmRestart) return;
    const STUCK_MS = 3000;
    const id = setInterval(() => {
      if (stuckNudged.current || Date.now() - lastTrickAt.current < STUCK_MS) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return; // echte Hintergrund-Pause: nicht im Hintergrund weiterspielen
      stuckNudged.current = true;
      setVisible(true); // #366: ein evtl. stale `visible===false` resynchronisieren → der reguläre Auto-Play-Effekt plant danach selbst wieder
      console.warn("[watchdog #351/#366] Lauf hängt vor dem nächsten Stich — self-heal RESOLVE_TRICK.",
        { paused, visibilityState: typeof document !== "undefined" ? document.visibilityState : "?", confirmAbort, confirmRestart, showOptions, showChronik, glossaryOpen, flipMs, speedMult });
      dispatch({ type: "RESOLVE_TRICK", rng: Math.random });
    }, 1000);
    return () => clearInterval(id);
  }, [state.phase, state.trickNo, paused, showOptions, showChronik, glossaryOpen, confirmAbort, confirmRestart, flipMs, speedMult]);

  // Geist-Trajektorie des laufenden Runs mitschreiben.
  useEffect(() => {
    if (!state.trickNo) return;
    currentTraj.current[Math.floor(state.trickNo / GHOST_STEP)] = Math.floor(state.score);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  }, [state.trickNo]);

  // Aktuellen Lauf werten: Highscore + Geist sichern (idempotent via recorded-Ref).
  // Genutzt von Game-Over UND vom vorzeitigen Beenden (#5), damit nichts verloren geht.
  function saveRun() {
    if (recorded.current || !state.trickNo) return;
    recorded.current = true;
    const finalScore = Math.floor(state.score);
    // #169 FB-8: Run-Rückblick-Stats für die lokale Detailansicht (RunStats). perks/skills als ID-Arrays.
    const localEntry = {
      score: finalScore, level: state.cycle, tricks: state.trickNo, cycles: state.cycle, ts: runId.current,
      bestStreak: state.bestStreak, perks: state.perks || [], skills: state.skills || [],
      maxFormations: state.maxFormations, formationScore: state.formationScore, buildingScore: state.buildingScore,
      crits: state.crits, wins: state.wins, critBonusScore: state.critBonusScore, bestTrickScore: state.bestTrickScore,
      bestGlacierTrickScore: state.bestGlacierTrickScore || 0, // bester Gletscher-Stich (nur wenn Eis gespielt) → separate KPI in Victory/Statistik
      // Victory/Stats-Redesign: Fraktions-Score-Kanäle mitspeichern → die feine Score-Herkunft (Gletscher/Pflanze/
      // Blitz/Feuer + Serie) steht ab jetzt auch in der Statistik (Bestes Build). Alt-Läufe ohne die Felder degradieren
      // sauber aufs grobe Modell (factionShares klemmt fehlende Kanäle auf 0 → „Sonstige").
      glacierYield: state.glacierYield || 0, streakScore: state.streakScore || 0, lightYield: state.lightYield || 0,
      plantRoot: state.plantRoot || 0, plantBloom: state.plantBloom || 0, plantHarvest: state.plantHarvest || 0,
      fireBase: state.fireBase || 0, fireWhite: state.fireWhite || 0,
      // #205: Lauf-Seed lokal mitspeichern (roh + teilbarer Code) → Nachspielen/Kopieren im Challenge-Reiter. Alt-Läufe
      // ohne Seed degradieren sauber (kein Challenge-Knopf). Global (gEntry) folgt mit dem Board-Umzug (Schicht B, #197).
      seed: state.seed ?? null, seedCode: state.seed != null ? formatSeed(state.seed) : null,
    };
    setHighscores(recordHighscore(localEntry));
    // #172 FB-10: denselben Lauf in die Historie (letzte 30) + Profil-Totals schreiben — Basis für den Statistik-Hub.
    // Zusätzlich: Lauf-Dauer (aus dem HUD-Timer) + im Lauf genutzte Archetypen (unique) für die Analyse.
    const durationMs = timeBase.current + (segStart.current != null ? Date.now() - segStart.current : 0);
    const archetypesUsed = [...new Set((state.skills || []).map(archetypeOf).filter(Boolean))];
    const prevProfile = profile;
    // #190 Challenge-Tracking: nur ein natürlich abgeschlossener Lauf (cycle === MAX_CYCLES) zählt; plus die
    // Rohdaten für die Erkennung (Shop-Käufe im ganzen Lauf, gewählte Stats). Erkennung/Flags in storage.recordRun.
    const completed = state.cycle >= totalCycles;
    // #201.8 Stufe B: kompakte finale Aufstellung mitpersistieren (playerOrder ist bereits in Spielreihenfolge aufgelöst).
    // Zusätzlich das Architekt-Gebäude-Overlay + die Gebäude-Liste (Positionen matchen die Snapshot-Karten-Reihenfolge),
    // damit die Lauf-Details (RunDetail) die Gebäude ein-/austoggeln und Name·Stufe zeigen können — wie im Victory-Screen.
    const archBuildingsSnap = ((state.architectEnabled && state.architect && state.architect.buildings) || [])
      .map((b) => ({ id: b.id, familyId: b.familyId, tier: b.tier, footprint: b.footprint }));
    const deckSnapshot = {
      cards: (state.playerOrder || []).map((di) => { const c = state.deck[di]; return { id: c.id, value: c.value, suit: c.suit, green: !!c.green }; }),
      formations: computeFormations(state.playerOrder || [], state.deck || [], state.roles || {}, [], state.skills || [], state.shop?.anchors || [], state.familyTiers || {}),
      architectCover: architectCoverFor(state), // per-Position { name, tier, effects, … } oder null (kein Architekt/keine Gebäude)
      buildings: archBuildingsSnap,
      challengeBlockForm: state.challengeBlockForm || [], // #301 C3: gesperrte Aufstell-Zellen → auch in der Chronik (RunDetail) rot markieren
    };
    /* #rd-verlauf: die zwei Verlaufsreihen des Laufs mit in die Historie — bis hierher existierten sie nur im
       Live-State und der Victory-Screen war der einzige Ort, an dem man sie je zu sehen bekam. Beide sind klein
       (Trajektorie: ein Wert je GHOST_STEP Stiche; Stich-Log: ein Zahlenpaar je Stich) und liegen damit weit
       unter dem deckSnapshot, dem größten Posten der Historie. `won` als 0/1 statt bool spart im JSON die Hälfte.
       Bewusst NICHT in `localEntry`: Highscore-Liste und Telemetrie brauchen sie nicht und bleiben unverändert. */
    const trajSnap = currentTraj.current.filter((v) => typeof v === "number");
    const trickLogSnap = (state.trickLog || []).map((c) => (c || []).map((tk) => ({ gained: Math.round(tk.gained || 0), won: tk.won ? 1 : 0 })));
    const { profile: nextProfile, unlocks: metaUnlocks, earn: runEarn, onboarding: onbInfo } = recordRun({ ...localEntry, durationMs, archetypes: archetypesUsed,
      traj: trajSnap, trickLog: trickLogSnap, // #rd-verlauf: Score-Verlauf + Stich-Score je Durchlauf (Lauf-Details)
      shopPurchases: state.shop?.purchaseLog?.length ?? 0, rerollsUsed: state.rerollsUsed || 0, // #214: Rerolls im Lauf → Sparfuchs (noRerollRun)
      ranked: state.ranked || null, // #303 Sparfuchs: Ranked-Wochen-Seed (Freischalt-Bedingung)
      completed, deckSnapshot }); // #382 Challenge-Modus entfernt
    setProfile(nextProfile);
    setRunEarn(runEarn || null);                  // #304 Lauf-Ertrag (SP/DP-Rollup)
    // #go-ruhe: Vorher-Stand der vier All-Time-Rekorde fürs Bestleistungs-Panel (prevProfile = Profil vor recordRun).
    setPrevBests({ score: prevProfile.bestScore || 0, streak: prevProfile.bestStreak || 0,
      crits: prevProfile.maxCrits || 0, trick: prevProfile.bestTrickScore || 0 });
    // #299 Meta-Freischaltungen dieses Laufs (Onboarding-Glieder → Archetyp/Rarität/Abschluss) fürs Victory-Banner.
    const ARCH_DE = { plant: "Pflanze", ice: "Eis", fire: "Feuer", lightning: "Blitz" };
    // Sprachprüfung C1: EIN Vokabular für die Raritätsstufen — die Namen kommen aus rarity.js (TIER_META),
// nicht aus einer zweiten, hier gepflegten Liste („Seltenheit III (Blau)" u. Ä.).
  const RAR_DE = { 3: `Rarität: ${rarityLabel(3)}`, 4: `Rarität: ${rarityLabel(4)}` };
    const rewardLabel = (r) => r == null ? null
      : r.type === "onboardingDone" ? "Genesis-Pack · Werkstatt · Upgrades"
      : r.type === "archetype" ? `Archetyp: ${ARCH_DE[r.key] || r.key}`
      : r.type === "rarity" ? (RAR_DE[r.tier] || "Neue Raritätsstufe") : "Freischaltung";
    setProgressUnlocks((metaUnlocks || []).map((u) => {
      if (u.type === "onboardingDone") return { id: "onb-done", label: "Onboarding abgeschlossen — Genesis-Pack, Werkstatt & Upgrades frei", target: "workshop" };
      if (u.type === "archetype") return { id: `arch-${u.key}`, label: `Neuer Archetyp: ${ARCH_DE[u.key] || u.key}`, target: null, guide: u.key, guideName: ARCH_DE[u.key] || u.key }; // #: guide → Leitfaden-Button im Onboarding-Banner (öffnet die Fraktions-Seite)
      if (u.type === "rarity") return { id: `rar-${u.tier}`, label: `Neue Rarität freigeschaltet: ${rarityLabel(u.tier)}`.trim(), target: null };
      return { id: `u-${u.link}`, label: "Freischaltung", target: null };
    }));
    // #: Onboarding-Fortschritt fürs Victory-Banner — damit NACH JEDEM Onboarding-Lauf sichtbar ist, wo man steht und was
    // als Nächstes/gerade freigeschaltet wird (golden funkelnder Rahmen). null, sobald das Onboarding durch ist.
    const nextR = onbInfo ? nextOnboardingReward(onbInfo.after) : null;
    setOnboardingBanner(onbInfo && onbInfo.after < onbInfo.links
      ? { step: onbInfo.after, links: onbInfo.links, advanced: onbInfo.after > onbInfo.before, nextLabel: nextR ? rewardLabel(nextR.reward) : null, nextAt: nextR ? nextR.link : null }
      : null);
    // #190: in DIESEM Lauf frisch freigeschaltete Skins (Bedingung vorher NICHT erfüllt, jetzt schon) → Siegesscreen.
    const catalog = [
      ...Object.keys(DECK_DEFS).map((id) => ({ def: deckDef(id), type: "deck" })),
      ...Object.keys(BATTLEFIELD_DEFS).map((id) => ({ def: battlefieldDef(id), type: "battlefield" })),
    ];
    setNewUnlocks(
      catalog
        .filter(({ def }) => def.unlock && isUnlocked(def, nextProfile) && !isUnlocked(def, prevProfile))
        .map(({ def, type }) => ({ id: def.id, name: def.name, type }))
    );
    // #telemetrie: denselben Lauf anonym an die Telemetrie-Tabelle schicken — UNABHÄNGIG vom Leaderboard.
    // Bewusst getrennt: das Board schreibt nur mit gesetztem Namen und nur den Wettbewerbs-Ausschnitt; fürs
    // Balancing brauchen wir JEDEN Lauf (auch namenlose und vorzeitig beendete) samt Entscheidungs-Mitschrift.
    // `nextProfile` (nicht `profile`) → der Baum-/Kosmetik-Stand NACH diesem Lauf. Fehler sind gekapselt.
    telemetry.recordRun({
      enabled: options.telemetry !== false, state, profile: nextProfile, options, durationMs, runId: runId.current,
      localEntry: { ...localEntry, archetypes: archetypesUsed },
      outcome: completed ? "completed" : "ended",
    });
    // Globalen Lauf posten (#14) — additiv, fehlertolerant. myEntry hebt ihn im Board hervor;
    // pubToken lädt das Board nach dem Submit neu (damit der eigene Lauf drin ist).
    const name = (username || "").trim().slice(0, 20);
    // Archetyp je gehaltenem Skill am Laufende (#139): ein Eintrag pro Skill (z. B. "fire,fire,ice"),
    // damit das Board ein Icon PRO Skill zeigt (4 Feuer → 4× 🔥). Leer, wenn keine Skills gehalten wurden.
    // Reihenfolge egal — decodeArchetypes gruppiert/zählt beim Rendern.
    const archetypes = (state.skills || []).map(archetypeOf).filter(Boolean).join(",");
    // `level` bleibt im Payload (= Rundenzahl), damit die bestehende Supabase-Spalte befüllt ist
    // (falls NOT NULL) — kein Schema-Wechsel nötig. Angezeigt wird ohnehin `cycles`.
    const gEntry = { name, score: finalScore, level: state.cycle, tricks: state.trickNo, cycles: state.cycle, archetypes,
      seed: state.seed ?? null, // #205: Lauf-Seed mitposten → Board-Einträge sind nachspielbar + Challenge-Board (Top-3 pro Seed)
      // #169 FB-8: Detailspalten (snake_case = Supabase-Spalten). perks/skills als kompakte ID-Liste (wie archetypes).
      // publishRun stript sie per Fallback-Kaskade, falls die Spalten noch nicht migriert sind.
      best_streak: state.bestStreak, perks: (state.perks || []).join(","), skills: (state.skills || []).join(","),
      max_formations: state.maxFormations, formation_score: state.formationScore,
      crits: state.crits, wins: state.wins, crit_bonus_score: state.critBonusScore, best_trick_score: state.bestTrickScore,
      // #global: Baumstand, mit dem DIESER Lauf gespielt wurde → das Global-Board kann Scores einordnen (x/27).
      // `prevProfile` (Stand VOR der Wertung), nicht `nextProfile`: Knoten kauft man zwar nur zwischen den Läufen,
      // aber der Lauf gehört zu dem Baum, mit dem er lief — nicht zu dem, den die Wertung gerade mitfinanziert hat.
      tree_nodes: ownedCount(prevProfile),
      // #370: Ranglisten-Läufe posten aufs Wochen-Board (Board-String bleibt vorerst "meister" = bestehendes
      //   Wochen-Board + Champions; Seed segmentiert die Woche). Casual-Läufe posten OHNE board (→ NULL).
      ...(state.ranked ? { board: "meister" } : {}) };
    setMyEntry(gEntry);
    // #174 Zweite Verteidigungslinie: das Modal blockt unsaubere Namen schon bei der Eingabe,
    // aber ein VOR dem Filter gespeicherter Altname liegt weiter im localStorage und käme
    // hier ungeprüft aufs globale Board. Lokal bleibt der Lauf sichtbar (myEntry oben) —
    // nur veröffentlicht wird er nicht.
    const nameOk = isAllowedUsername(name).ok;
    if (leaderboardConfigured && name && nameOk) {
      publishRun(gEntry).then((saved) => {
        // #229 N2: die vom Board vergebene id nachtragen → GlobalLeaderboard markiert die Eigen-Zeile eindeutig.
        if (saved && saved.id != null) setMyEntry((e) => (e ? { ...e, id: saved.id } : e));
        setPubToken((t) => t + 1);
      }).catch(() => {});
    }
    if (finalScore > recordTotal.current) {
      recordTraj.current = currentTraj.current.slice();
      recordTotal.current = finalScore;
      saveGhost(recordTraj.current, finalScore);
      setIsRecord(true);
    }
  }
  // Bei Game-Over automatisch werten + den Resume-Snapshot löschen (Lauf ist beendet → kein Fortsetzen mehr).
  useEffect(() => {
    if (state.phase === "gameover") { saveRun(); clearActiveRun(); setResumable(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  }, [state.phase]);

  // #393 Zufalls-Deck je Lauf: im laufenden Lauf (inRun) überschreibt runVisual die Deck-/Battlefield-Wahl + setzt alle
  //   aktiven Effekte auf Deckfarbe — als reiner VISUAL-Override (options bleiben gespeichert unverändert, Ton/UI/etc. weiter
  //   aus options). Im Menü/Gameover greift der Override NICHT → dort zeigt der Shop weiter das echte gewählte Deck.
  const vOpt = (runVisual && inRun)
    ? { ...options, deckId: runVisual.deckId, battlefieldId: runVisual.battlefieldId, ...ALL_DECK_TINT }
    : options;
  // #190: aktive Skins aus den (effektiven) Optionen (defensiver Fallback auf "default", falls (noch) gesperrt/unbekannt).
  const activeDeckId = resolveSkinId(DECK_DEFS, vOpt.deckId, profile);
  const activeBfId   = resolveSkinId(BATTLEFIELD_DEFS, vOpt.battlefieldId, profile);
  const deckSkin = deckAssets(activeDeckId);
  const bfSkin   = battlefieldAssets(activeBfId);
  /* #desktop — jüngster Lauf für die Status-Tafel des Startbildschirms. `recordRun` stellt neue Läufe vorn
     in die Chronik, [0] ist also immer der letzte. Die Phase als einzige Abhängigkeit genügt: In die Chronik
     wird ausschließlich beim Beenden eines Laufs geschrieben, und danach führt der Weg immer über einen
     Phasenwechsel zurück ins Menü — der Eintrag ist beim Betreten also garantiert schon da. */
  const lastRun = useMemo(() => (state.phase === "menu" ? loadRunHistory()[0] || null : null), [state.phase]);

  // Perf-Recorder: Spiel-Events markieren, damit Frame-Ruckler dem zugeordnet werden, WAS gerade
  // passiert (perfMark ist außerhalb des Preview-Builds ein billiger No-op). Deck-Wechsel, laufender
  // Stich-Takt, Overlays (Blur-Verdacht), Phasen/Durchläufe.
  useEffect(() => { perfMark("phase:" + state.phase, { phase: state.phase }); }, [state.phase]);
  useEffect(() => { if (state.trickNo) perfMark("trick", { trick: state.trickNo }); }, [state.trickNo]);
  useEffect(() => { perfMark("cycle", { cycle: state.cycle }); }, [state.cycle]);
  useEffect(() => { perfMark("deck-switch"); }, [deckSkin.front, deckSkin.back]);
  useEffect(() => { if (showOptions) perfMark("overlay:options"); }, [showOptions]);
  useEffect(() => { if (showChronik) perfMark("overlay:chronik"); }, [showChronik]);
  useEffect(() => { if (glossaryOpen) perfMark("overlay:glossar"); }, [glossaryOpen]);
  // Auto-Dump bei Game-Over: jeder Lauf hinterlässt eine Perf-Bilanz in der Konsole (nur Preview).
  useEffect(() => {
    if (import.meta.env.VITE_PREVIEW === "1" && options.perfHud && state.phase === "gameover") {
       
      console.log("%c" + formatReport(getReport()), "font-family:monospace");
    }
  // Bewusst NUR am Phasenwechsel gekeyt: options.perfHud ist eine Bedingung, kein Auslöser. Als Dep würde ein
  // Umschalten des HUD-Schalters im Gameover-Screen den Perf-Report erneut in die Konsole dumpen. (Nur Preview.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);
  // #deckshop: Hauptfarbe (Hologrid-Gitter/Frame-Glow) aus dem aktiven Deck-Pack ableiten.
  // #tiered: resolvePackByDeckId löst bei Stufen-Decks die konkrete Stufe (eigene a1/a2) auf.
  const activePackRes = resolvePackByDeckId(activeDeckId);
  const deckFx = {
    deckA1: activePackRes?.a1 || null,
    deckA2: activePackRes?.a2 || null, // Aurora nutzt beide Deck-Akzentfarben
    // #kategorien: zwei UNABHÄNGIGE Feld-Slots — reiner Hintergrund-Effekt (Aurora) UND Hintergrund-Finisher
    // (Glutfunken) können GLEICHZEITIG aktiv sein. Battlefield rendert beide Layer übereinander.
    // #393: alle Farbmodus/Deckfarben-Ableitungen lesen aus vOpt (= options, im Zufalls-Lauf mit Deck-Override + allen
    //   …Deck-Flags true). bgFx/Finisher/cardAnims/gottEffect hängen an unveränderten Toggles → vOpt ≡ options-Ergebnis.
    bgFx: activeBgFx(profile, vOpt),
    bgFinisher: activeBgFinisher(profile, vOpt),
    cardAnims: activeCardAnims(profile, vOpt), // #318 aktive Karten-Animationen (group "anim", stapelbar)
    // #finisher/#klinge-kaufbar: gewählter Sieg-Finisher (standard=Wegflug|klinge). „klinge" gilt nur bei Besitz
    // (fx:klinge gekauft) — sonst zurück auf den Gratis-Standard, damit eine ungekaufte Auswahl nicht doch rendert.
    finisher: (vOpt.finisher === "klinge" && !!profile?.ownedCosmetics?.["fx:klinge"]) ? "klinge"
            : (vOpt.finisher === "scorch" && !!profile?.ownedCosmetics?.["fx:scorch"]) ? "scorch"
            : (vOpt.finisher === "hologridSlice" && !!profile?.ownedCosmetics?.["fx:hologridSlice"]) ? "hologridSlice"
            : (vOpt.finisher === "blackhole" && !!profile?.ownedCosmetics?.["fx:blackhole"]) ? "blackhole" : "standard",
    scorchDeck: !!vOpt.fxScorchDeck, // #319 Scorch-Farbmodus: false = warmes Feuer, true = Deckfarbe
    blackholeDeck: !!vOpt.fxBlackholeDeck, // #320 Schwarzes-Loch-Farbmodus: false = Standard blau/pink, true = Deckfarbe
    klingeDeck: !!vOpt.fxKlingeDeck, // #klinge-deck: false = kühles Stahlweiß, true = Deckfarbe
    hologridDeck: !!vOpt.fxHologridDeck, // #hologrid-deck: false = Standard Cyan/Magenta, true = Deckfarbe
    // #322–#326 Gottgleich-Prunk (PIXI): aktiver Effekt (besessen + Option an) oder „gottStandard" (kein Prunk), plus
    // dessen Farbmodus-Flag (Standard vs. Deckfarbe). gottFlags in CustomizeScreen hält die Exklusivität (genau einer an).
    gottEffect: activeGottFx(profile, vOpt) || "gottStandard",
    /* #vorschau-deck: „gottStandard" ist hier KEIN Sonderfall mehr, sondern ein Eintrag wie die fünf Prunks.
       Vorher fiel der Rückfall `|| ""` auf `vOpt[""]` = undefined → der Chrome-Schriftzug stand ohne gekauften
       Prunk fest auf dem Synthwave-Zweiton, obwohl daneben jeder Prunk umfärben konnte. */
    gottDeck: !!(vOpt[{ gottStandard: "fxGottStandardDeck", sonnenPuls: "fxSonnenPulsDeck", laserFaecher: "fxLaserFaecherDeck", prismaKaskade: "fxPrismaKaskadeDeck", holoCube: "fxHoloCubeDeck", supernova: "fxSupernovaDeck" }[activeGottFx(profile, vOpt) || "gottStandard"] || ""]),
    archDeckColor: vOpt.archColor === "deck", // #spezial Archetyp-Effekte (Hitze/Moos/Blitz/Eis): Standard-Neon vs. Deckfarbe
    auroraDeck: !!vOpt.fxAuroraDeck, // Aurora-Farbmodus: false = Standard-Palette, true = Deckfarbe
    neonsurfDeck: !!vOpt.fxNeonsurfDeck, // #345 Neon-Brandung-Farbmodus: false = Standard (violett→cyan), true = Deckfarbe
    starfieldDeck: !!vOpt.fxStarfieldDeck, // #311 Sternenfeld-Farbmodus: false = Weiß-Blau, true = Deckfarbe
    cubematrixDeck: !!vOpt.fxCubeMatrixDeck, // #317 Cube-Matrix-Farbmodus: false = Cyan/Magenta, true = Deckfarbe
    cubematrixSun: vOpt.fxCubeMatrixSun !== false, // #317 Cube-Matrix Retro-Sonne an/aus (Default an)
    cubematrixWire: !!vOpt.fxCubeMatrixWire, // #317 Cube-Matrix Optik: false = gefüllt, true = nur leuchtende Rahmen
  };

  // #deckui: --deck-a1/--deck-a2 zusätzlich auf :root spiegeln → Body-Portale (Pack-Detail der Werkstatt, Glossar,
  //   Leitfaden u. a.) hängen AUSSERHALB von .app-root und erbten die Vars sonst nicht (Effekte fielen auf den Violett-
  //   Fallback zurück). Gleicher kontextabhängiger Wert wie am .app-root (Menü-Deck bzw. Run-Deck).
  useEffect(() => {
    const el = document.documentElement;
    if (deckFx.deckA1) el.style.setProperty("--deck-a1", deckFx.deckA1); else el.style.removeProperty("--deck-a1");
    if (deckFx.deckA2) el.style.setProperty("--deck-a2", deckFx.deckA2); else el.style.removeProperty("--deck-a2");
  }, [deckFx.deckA1, deckFx.deckA2]);

  /* #ecke: Der Marker sagt den Menü-Köpfen, dass links oben ein Paar Knöpfe liegt — sie halten dafür
     Platz frei (index.css). Er hängt am <html>, nicht an `.app-root`: Leitfaden und Glossar rendern per
     Portal an `document.body` und lägen sonst außerhalb der Bedingung. Ohne den Marker stünde der Titel
     der Bestenliste auch dann eingerückt da, wenn man sie vom Endscreen aus öffnet — dort gibt es das
     Paar nicht. */
  useEffect(() => {
    const el = document.documentElement;
    if (state.phase === "menu") el.setAttribute("data-corner-tools", "1");
    else el.removeAttribute("data-corner-tools");
  }, [state.phase]);

  /* #desktop — Welche Effekte gerade ausgerüstet sind, für die Status-Tafel des Startbildschirms.
     Hier werden nur die SCHLÜSSEL gesammelt; die Namen löst der Startbildschirm auf, damit ein
     Sprachwechsel sie neu rendert. Zwei Registerquellen: die Katalog-Effekte (GLOBAL_FX → globalFxDef)
     und die synthetischen Sieg-Finisher, die bewusst KEINEN GLOBAL_FX-Eintrag haben und deshalb über
     `fxsyn.<key>.name` laufen — daher das `syn`-Flag. „standard"/„gottStandard" heißt „kein Effekt"
     und wird weggelassen, sonst stünde bei jedem Spieler „Standard" in der Zeile. */
  const activeFx = [];
  if (deckFx.bgFx) activeFx.push({ key: deckFx.bgFx });
  if (deckFx.bgFinisher) activeFx.push({ key: deckFx.bgFinisher });
  for (const k of deckFx.cardAnims || []) activeFx.push({ key: k });
  if (deckFx.gottEffect && deckFx.gottEffect !== "gottStandard") activeFx.push({ key: deckFx.gottEffect });
  if (deckFx.finisher && deckFx.finisher !== "standard") activeFx.push({ key: deckFx.finisher, syn: true });

  // #372 Archetyp-Karten-FX (Neon-Moos/Frost/Ionensturm) im Leerlauf vorwärmen — NUR außerhalb des Stichspiels
  // (Entscheidungs-/Ruhephasen: Skill-/Perk-Wahl, Formation, Architekt, Menü), damit Chunk-Load + Erst-Bitmap-Aufbau
  // nicht selbst mitten in Animationsframes fallen. Je Session einmal pro aktivem Archetyp; gestaffelt (ein Effekt je
  // Idle-Slot). Deckfarben werden nur beim Auslösen gelesen (je Lauf stabil).
  const fxPrewarmedRef = useRef(new Set());
  useEffect(() => {
    const arch = state.activeArchetypes || [];
    if (!arch.length || state.phase === "play") return undefined;   // nie mitten im Stichspiel prewarmen
    const todo = arch.filter((a) => FX_PREWARM[a] && !fxPrewarmedRef.current.has(a));
    if (!todo.length) return undefined;
    const opts = { deckTint: deckFx.archDeckColor, deckColor: deckFx.deckA1, deckColor2: deckFx.deckA2 };
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
    let i = 0;
    const step = () => {
      if (i >= todo.length) return;
      const a = todo[i++];
      fxPrewarmedRef.current.add(a);
      try { Promise.resolve(FX_PREWARM[a](opts)).catch(() => {}); } catch { /* Prewarm nie kritisch */ }
      idle(step);
    };
    const id = idle(step);
    return () => (window.cancelIdleCallback || clearTimeout)(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deckFx bewusst nur beim Trigger gelesen (Deckfarben je Lauf stabil)
  }, [state.activeArchetypes, state.phase]);

  function beginRun() {
    clearActiveRun(); setResumable(null); // frischer Lauf ersetzt einen evtl. gespeicherten Resume-Snapshot
    // #205: Challenge-Seed (falls per Paste/Nachspielen gesetzt) ODER frischer Zufalls-Seed. Der Seed macht
    // den Lauf reproduzierbar & teilbar; jeder Lauf bekommt einen, auch der normale „Neuer Run".
    const seed = pendingSeed.current != null ? (pendingSeed.current >>> 0) : randomSeed();
    seedWasChosen.current = pendingSeed.current != null; // #205: gewählt (Challenge/Ranked) vs. gewürfelt (casual)
    pendingSeed.current = null;
    currentTraj.current = [];
    runStartRecordTraj.current = recordTraj.current.slice(); // Rekord dieses Laufs festhalten, bevor saveRun ihn überschreibt (#35)
    recorded.current = false;
    runId.current = Date.now();
    timeBase.current = 0;
    // Segment SOFORT starten (nicht nullen): bei „Neustart" aus einem bereits aktiven Lauf
    // wechselt `active` true→true, der [active]-Timer-Effekt läuft NICHT erneut → segStart bliebe
    // null → elapsedMs=0 → Timer/Anti-Infinity (#59) fröre ein (#50). Der ==null-Guard im Effekt
    // verhindert Doppel-Setzen bei echten false→true-Einstiegen (Menü→Play, GameOver→Neu).
    segStart.current = Date.now();
    setPaused(false);
    // #366: Sichtbarkeit beim Start FRISCH aus dem Live-Zustand setzen. Sonst kann ein während des RunLoader-Vorladens
    //   verschlucktes „wieder sichtbar"-Event ein stale `visible===false` hinterlassen → Auto-Play-Guard blockt den
    //   frischen Lauf dauerhaft („Bereit — starte den Autobattler" bis Reload). Ein neuer Lauf beginnt immer sichtbar.
    setVisible(typeof document === "undefined" || document.visibilityState !== "hidden");
    // #351: Run-Start-Guards sauber zurücksetzen, BEVOR der erste phase:"play"-Render kommt (im selben Batch wie START_RUN):
    //   - Turbo auf 1× (ein neuer Lauf erbte sonst den MAX-Turbo des vorigen — und nahm ihn als Hänger-Variable mit).
    //   - offene Abbruch-/Neustart-Rückfragen zu, sonst friert der Auto-Play-Guard den frischen Lauf ein.
    setSpeedMult(1);
    setConfirmAbort(false);
    setConfirmRestart(false);
    setIsRecord(false);
    setNewUnlocks([]); // #190: Freischalt-Hinweis des Vorlaufs zurücksetzen
    const dev = pendingDev.current; pendingDev.current = null; // Dev-Run-Config (Test-Layout) für DIESEN Lauf, dann zurücksetzen
    const ranked = pendingRanked.current; pendingRanked.current = null; // §7: Ranglisten-Lauf ('ranked' = Wochen-Modus)
    dispatch({ type: "START_RUN", rng: Math.random, architect: true, seed, dev, ranked, profile }); // #202 Architekt · #205 Seed · Dev-Run · Progression-Baum · §7 Rangliste
  }
  // #190: aktive Skin-Bilder vorladen, DANN starten. Der RunLoader zeigt sich nur bei spürbarer Ladezeit
  // (Cache-Treffer → sofort) und hat ein Timeout-Sicherheitsnetz → Start hängt nie.
  // #205: `seed` (Zahl) startet einen Challenge-Lauf (Nachspielen/Paste); als Event-Handler aufgerufen (Zahl-Guard)
  // ODER ohne Argument → frischer Zufalls-Seed in beginRun.
  // #190: Skins vorladen, dann beginRun. Zentraler Trigger, den alle Lauf-Arten teilen (Normal/Meister/Neustart).
  function launchRun({ seed = null, dev = null, ranked = null } = {}) {
    pendingSeed.current = (typeof seed === "number" && Number.isFinite(seed)) ? (seed >>> 0) : null;
    pendingDev.current = dev; // Dev-Run-Config (null = normaler Lauf)
    pendingRanked.current = ranked; // §7: 'ranked' = Wochen-Modus (tree-unabhängige Baseline)
    // #393 Zufalls-Deck je Lauf: ist der Toggle an UND kein Ranglisten-Lauf (Ranked hat eine feste Baseline und bleibt
    //   unberührt), für DIESEN Lauf einen zufälligen besessenen (farbigen) Pack ziehen. Neu je Lauf (bewusst nicht
    //   persistiert); leerer Pool → null → gewähltes Deck. Sonst immer zurücksetzen, damit kein Alt-Override hängen bleibt.
    const rv = (options.randomDeckEachRun && !ranked) ? pickRandomOwnedPack(profile, options) : null;
    setRunVisual(rv);
    // #perf: den ArchitectScreen-Chunk (erscheint mitten im Lauf in der Architekt-Phase) schon jetzt anstoßen —
    // nicht-blockierend, damit der Phasenübergang später ohne Nachlade-Hitch ist. Fehlschlag unkritisch (Suspense fängt).
    try { importArchitect(); } catch (e) { /* egal */ }
    // #perf: neben dem eigenen Deck/Battlefield jetzt auch die Gegner-Deck-Bilder vorladen → keine Bild-Dekodier-Hitches,
    // wenn im Lauf erstmals eine Gegnerkarte eines neuen Auswahl-Typs erscheint. RunLoader dedupt + hat Timeout-Sicherheitsnetz.
    // #393: bei aktivem Zufalls-Override die Bilder des GEZOGENEN Packs vorladen (nicht die des gewählten Decks).
    const preDeck = rv ? deckAssets(resolveSkinId(DECK_DEFS, rv.deckId, profile)) : deckSkin;
    const preBf   = rv ? battlefieldAssets(resolveSkinId(BATTLEFIELD_DEFS, rv.battlefieldId, profile)) : bfSkin;
    setPendingRun([preDeck.front, preDeck.back, ...(preBf ? [preBf.desktop, preBf.mobile] : []), ...OPP_SKIN_URLS]);
  }
  // Lauf beginnen — auch der Challenge-Seed-Pfad (Nachspielen/Paste) läuft hier.
  function startRun(seed) { launchRun({ seed: (typeof seed === "number" && Number.isFinite(seed)) ? seed : null }); }
  // Test-Codes im Seed-Feld (nur Preview, StartScreen fängt sie ab): `unlock` = Onboarding fertig + alle
  // Upgrades + SP-Polster (Profil-Update, kein Reload). `onboarding` = nur Onboarding überspringen (6/6) +
  // 10 SP / 50 DP. `reset` = ganzes Profil wipen → Reload gibt den sauberen Erstbesuch-Zustand.
  function handleSecretSeed(kind) {
    if (kind === "unlock") { setProfile(saveProfile(unlockAllCosmetics(unlockAllProfile(loadProfile())))); return; }
    if (kind === "onboarding") { setProfile(saveProfile(skipOnboardingProfile(loadProfile()))); return; } // Onboarding skippen + 10 SP / 50 DP
    if (kind === "reset") { wipeProfileStorage(); try { window.location.reload(); } catch (e) {} }
  }
  // #370 EIN Ranglisten-Modus: tree-unabhängige Baseline, alle spielen den Wochen-Seed (für alle gleich).
  function startRankedRun() { launchRun({ ranked: "ranked", seed: currentWeek(new Date()).seed }); }
  // Neustart behält die Lauf-Art UND einen GEWÄHLTEN Seed: Ranked → gleicher Modus + aktueller Wochen-Seed; ein
  // Challenge-/Seed-Lauf (#205 „Nachspielen"/Einfügen) → GENAU derselbe Seed, sonst bekäme man beim Neustart ein
  // anderes Brett als das, das man gerade übt. Casual (Seed nur gewürfelt) → wie gehabt frisches Brett.
  function restartRun() {
    const seed = state.ranked ? currentWeek(new Date()).seed
      : (seedWasChosen.current ? (state.seed ?? null) : null);
    launchRun({ ranked: state.ranked || null, seed });
  }
  // Dev-Run (nur Preview): frei konfigurierter Lauf aus dem DevRunSetup-Overlay.
  function startDevRun(dev) { launchRun({ dev }); }
  // Lauf verlassen (#5).
  const toMenu = () => { saveRun(); clearActiveRun(); setResumable(null); dispatch({ type: "TO_MENU" }); };
  const endRun = () => dispatch({ type: "END_RUN" }); // Beenden → Endscreen; saveRun + clearActiveRun laufen über den gameover-Effekt
  // RESUME (Phase 1): gespeicherten Lauf fortsetzen — Refs (Timer/Geist-Linie/Attribution) aus dem Snapshot
  // wiederherstellen, dann den State laden. Der Timer läuft ab jetzt weiter (segStart neu gesetzt).
  function resumeRun() {
    const r = resumable; if (!r) return;
    const m = r.meta || {};
    timeBase.current = typeof m.timeBase === "number" ? m.timeBase : 0;
    segStart.current = Date.now();
    runId.current = m.runId || Date.now();
    currentTraj.current = Array.isArray(m.currentTraj) ? m.currentTraj.slice() : [];
    seedWasChosen.current = !!m.seedWasChosen; // #205: Challenge-Seed-Eigenschaft übersteht das Fortsetzen (→ Neustart)
    runStartRecordTraj.current = recordTraj.current.slice();
    recorded.current = false;
    setPaused(false); setIsRecord(false); setNewUnlocks([]);
    setResumable(null);
    dispatch({ type: "RESTORE_RUN", state: r.state });
  }
  // „Beenden & speichern" (Phase 2): Lauf pausieren fürs spätere Fortsetzen. Snapshot sichern, aber NICHT als
  // beendeten Lauf werten (kein saveRun) und NICHT löschen (kein clearActiveRun) → zurück ins Menü, wo „Fortsetzen" steht.
  function suspendRun() {
    persistActiveRun();
    setResumable(loadActiveRun());
    setConfirmAbort(false); setPaused(false);
    dispatch({ type: "TO_MENU" });
  }
  // Perk-Auswahl: ein Angebotseintrag ist entweder eine Familie {familyId,tier} (Rarität #167) oder ein flacher perkId-String.
  const pick = (entry) => (entry && typeof entry === "object" && entry.familyId)
    ? dispatch({ type: "PICK_FAMILY", familyId: entry.familyId, tier: entry.tier, rng: Math.random })
    : dispatch({ type: "PICK_PERK", perkId: entry, rng: Math.random });
  // (#267: pickStat entfernt — es gibt keine Stat-Phase mehr; Crit-Perks laufen über den Perk-Fluss (Präzision-Familien).)
  // Formationsphase (§22.8): Tausch / Undo / Zurücksetzen / Bestätigen.
  const swapCards = (i, j) => dispatch({ type: "SWAP_CARDS", i, j });
  const undoSwap = () => dispatch({ type: "UNDO_SWAP" });
  const resetFormation = () => dispatch({ type: "RESET_FORMATION" });
  const confirmFormation = () => dispatch({ type: "CONFIRM_FORMATION" });
  const lockGlacier = (pos) => dispatch({ type: "GLACIER_LOCK", pos }); // Eis-Neudesign: Karte als Gletscher festfrieren (starr)
  const confirmTarget = (cardIds) => dispatch({ type: "CONFIRM_TARGET", cardIds });
  // Familien-Ziel-Auswahl (Rarität #167): Farbe(n) (Kat. A) bzw. Karten (Kat. C Rollen) für pickTarget-Stufen wählen.
  const familyTargetSuit = (suit) => dispatch({ type: "FAMILY_TARGET_SUIT", suit });
  const familyTargetCard = (cardId) => dispatch({ type: "FAMILY_TARGET_CARD", cardId });
  const familyTargetFormationType = (formationType) => dispatch({ type: "FAMILY_TARGET_FORMATION_TYPE", formationType }); // #179 E_CORE
  const familyTargetConfirm = () => dispatch({ type: "FAMILY_TARGET_CONFIRM", rng: Math.random });
  // Skill-Auswahl (zu festen Zeitpunkten laut DECISION_SCHEDULE): wählen (optional einen belegten Slot ersetzen) oder ablehnen → Perk.
  const pickSkill = (skillId, replaceId) => dispatch({ type: "PICK_SKILL", skillId, replaceId, rng: Math.random });
  const declineSkill = () => dispatch({ type: "DECLINE_SKILL", rng: Math.random });
  const pickLegendary = (legendaryId) => dispatch({ type: "PICK_LEGENDARY", legendaryId, rng: Math.random }); // #272 Legendär-Phase
  const declineLegendary = () => dispatch({ type: "DECLINE_LEGENDARY", rng: Math.random });
  const rerollLegendary = () => dispatch({ type: "REROLL_LEGENDARY", rng: Math.random }); // M1: R29-Legendär-Reroll
  const rerollPerk = () => dispatch({ type: "REROLL_PERK", rng: Math.random });
  const declinePerk = () => dispatch({ type: "DECLINE_PERK" }); // #138: Perk-Angebot ablehnen → +Münze
  const rerollSkill = () => dispatch({ type: "REROLL_SKILL", rng: Math.random });
  // Architekt (#202, ersetzt den Shop): Bauplan errichten / Gebäude ausbauen / versetzen / abreißen / Phase bestätigen.
  const architectBuild = ({ familyId, tier, footprint, colorChoice }) => dispatch({ type: "ARCHITECT_BUILD", familyId, tier, footprint, colorChoice });
  const architectUpgrade = (buildingId) => dispatch({ type: "ARCHITECT_UPGRADE", buildingId });
  const architectMove = ({ buildingId, footprint }) => dispatch({ type: "ARCHITECT_MOVE", buildingId, footprint });
  const architectMoveMulti = (moves) => dispatch({ type: "ARCHITECT_MOVE_MULTI", moves });
  const architectDemolish = (buildingId) => dispatch({ type: "ARCHITECT_DEMOLISH", buildingId });
  const architectRecolor = ({ buildingId, colorChoice }) => dispatch({ type: "ARCHITECT_RECOLOR", buildingId, colorChoice });
  const architectDone = () => dispatch({ type: "ARCHITECT_DONE" });
  const architectUndo = () => dispatch({ type: "ARCHITECT_UNDO" });   // #361: letzten Schritt dieser Phase zurück
  const architectReset = () => dispatch({ type: "ARCHITECT_RESET" }); // #361: auf Phasen-Beginn zurück
  const rerollArchitect = () => dispatch({ type: "REROLL_ARCHITECT", rng: Math.random }); // #263: Gebäude-Reroll-Pool

  // Geist-Vergleich „hier"
  const gIdx = Math.floor(state.trickNo / GHOST_STEP);
  const hasGhost = recordTraj.current.length > 0;
  const ghostAt = recordTraj.current[gIdx];
  const ghost = {
    hasGhost,
    passed: hasGhost && state.trickNo > 0 && ghostAt === undefined,
    delta: hasGhost && ghostAt !== undefined ? Math.floor(state.score) - ghostAt : null,
    recordTotal: recordTotal.current,
  };

  const best = Math.max(recordTotal.current, highscores[0]?.score || 0);
  const elapsedMs = timeBase.current + (segStart.current != null ? Date.now() - segStart.current : 0);

  // Prominenter Score-Multiplikator-Chip (#37): geteilte Quelle mit der StatusRail (kein Drift).
  // perks || [] — im Menü (state = { phase:"menu" }) fehlen die Felder; Defaults greifen.
  const baseScoreMult = baseScoreMultFor(state.perks || [], {
    winStreak: state.winStreak, wins: state.wins, trickNo: state.trickNo, pos: state.pos,
  });
  const multHot = baseScoreMult > 1.001; // >1 → farbiges Tier; ×1,00 → gedämpft
  const multColor = multTierColor(baseScoreMult); // #100: grau/grün/blau/lila/gold nach Höhe
  // #106: Idle-Zittern des Chips ab Blau-Tier (Level 2), stärker je höher. grau/grün → kein Zittern.
  const multShakeLevel = Math.max(0, multTierLevel(baseScoreMult) - 1); // 0 | 1 leicht | 2 mittel | 3 stark
  const multShakeClass = multShakeLevel > 0 ? `as-shake-${multShakeLevel}` : "";
  // Dezenter Scale-Puls NUR bei Anstieg (v. a. D2-Kombo). Reduced-motion → global via CSS neutralisiert.
  useEffect(() => {
    if (baseScoreMult > prevMult.current + 1e-9) setMultPulse((n) => n + 1);
    prevMult.current = baseScoreMult;
  }, [baseScoreMult]);

  // (Gameplay-Neu-Aufbau) Die früheren Kopf-Stat-Zellen sind in die schwebende StatusBar gewandert; „Bester Score" steht
  // jetzt in der Analyse-Ecke der Sidebar (StatusRail). Die Rohwerte (elapsedMs, ghost, baseScoreMult & Co.) werden von
  // hier direkt an die StatusBar durchgereicht.
  // Phase 3: Anzahl aktiver Fraktionen → bei mehreren klappen die Fraktions-Headlines standardmäßig ein (schlanker Mix-Run),
  // bei genau einer aktiven Fraktion bleibt sie offen (voller Detail wie bisher im Mono-Run).
  /* #skillheim: Welche Fraktions-Panels stehen gerade? Das sind dieselben vier Bedingungen, mit denen die
     Bars sich selbst ein- und ausblenden — hier EINMAL abgeleitet und zweifach genutzt: für die Panel-Dichte
     (`manyActive` — der Auto-Kollaps bei mehreren Fraktionen ist eine PLATZ-Regel des Handys und ab 1280 px
     aus, weil die Bank ihre Spuren ohnehin nebeneinander stellt) und dafür, welche Archetypen ihre Skills zeigen. Das Build-Panel lässt
     genau die dann weg; ein Skill, dessen Panel gerade nicht steht, bleibt dort sichtbar statt zu verschwinden. */
  const shownSkillArchs = [
    state.lightning?.active && "lightning",
    state.heat?.active && "fire",
    (state.activeArchetypes || []).includes("plant") && "plant",
    (state.activeArchetypes || []).includes("ice") && "ice",
  ].filter(Boolean);
  const manyFac = shownSkillArchs.length > 1;

  // #perf A3: Alliance-Gruppierung + das an Battlefield gereichte `pe`-Objekt memoisieren — vorher wurde die Gruppierung
  // pro Render neu berechnet und ein frisches Objekt erzeugt (bricht jede Memo-Chance darunter). Keine Verhaltensänderung.
  const linkedGroups = useMemo(() => allianceGroups(state.familyTiers, state.roles), [state.familyTiers, state.roles]);
  const bfPe = useMemo(() => ({ linkedGroups }), [linkedGroups]);

  return (
    // #356: Deck-Akzentfarben als CSS-Variablen am Run-Container — die neutralen Struktur-Panel-Rahmen tönen sich darüber
    //   in die Deckfarbe (color-mix, s. panelKit/StatusRail/…). Wechselt das Deck, ziehen die Rahmen mit.
    //   #desktop: seit dem Desktop-Pass AUCH im Menü gesetzt (vorher nur `inRun`) — der Startbildschirm färbt
    //   ab 1280 px Knöpfe, Panel-Rahmen und Streifen aus dem aktiven Deck und braucht die Variablen dort.
    //   Ohne aktives Deck bleiben sie undefined → überall greifen dieselben Violett-Rückfälle wie bisher.
    <div className="app-root relative w-full flex justify-center"
      style={{ "--deck-a1": deckFx.deckA1 || undefined, "--deck-a2": deckFx.deckA2 || undefined }}>
      {/* CRT-Scanline-/Vignette-Overlay (#41) — immer im DOM, nur unter [data-skin="crt"]
          sichtbar (CSS), klick-durchlässig. */}
      <div className="crt-overlay" aria-hidden="true" />
      {/* Preview-Marker — nur im Preview-Build (Balancing-/Test-Zweig unter /autostich/balancing/ bzw. /test/),
          damit man die Preview nie mit der echten Seite verwechselt. Label kommt aus VITE_ENV (vom Deploy-Workflow je
          Branch gesetzt: „balancing" bzw. „test") → identische Quelle auf beiden Branches, kein Merge-Clobbering.
          Klick-durchlässig. */}
      {import.meta.env.VITE_PREVIEW === "1" && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-2 py-1 rounded text-meta-1 font-bold ty-display tracking-wide"
          style={{ background: "#d4a63a", color: "#141419", pointerEvents: "none", boxShadow: "0 0 8px rgba(212,166,58,.6)" }}
          aria-hidden="true"
        >
          {(import.meta.env.VITE_ENV || "preview").toUpperCase()}
        </div>
      )}
      {/* Perf-Recorder-HUD (FPS/p95/Jank + Report) — nur im Preview-Build UND nur wenn der Options-Toggle
          „FPS-Zähler & Report" an ist. Mount startet die Aufzeichnung, Unmount stoppt sie → aus = keine
          Messung und kein Panel. In „main" ist der Toggle ausgeblendet, das Overlay also nie aktiv. */}
      {import.meta.env.VITE_PREVIEW === "1" && options.perfHud && <PerfOverlay />}
      {/* Ambient-Partikel — nur unter Skin und nur auf dem Hauptscreen (Menü): dort gibt es
          offene Fläche, sodass sie ohne durchscheinende Panels sichtbar sind. Im Run bleiben
          die Panels deckend. (reduced-motion-gated in der Komponente.) */}
      {state.phase === "menu" && <CrtParticles />}
      {/* #ecke — Glossar und Ton in JEDEM Menü, oben links (Begründung in CornerTools.jsx).
          Nur im Menü: im Lauf haben beide ihren eigenen Platz (ⓘ im Kopf, Ton in der Steuerzeile). */}
      {state.phase === "menu" && (
        <CornerTools muted={!!options.muted} onToggleMute={() => changeOptions({ muted: !options.muted })}
          onGlossaryOpenChange={setGlossaryOpen} />
      )}
      {/* #desktop: Der Startbildschirm bekommt ab 1280 px mehr Bühne, gedeckelt bei 1520 px: das ist die Breite
          des Spaltenpaars, und der Deckel hält es auf Ultrawide zusammen, statt es an die Ränder zu werfen.
          #buehne (19.08.2026): Der LAUF hat seinen 1024er-Deckel verloren. Er war an das alte Kartenfeld gebunden
          (668 × 347) und ließ auf jedem Desktop-Fenster fast die halbe Breite leer — vom Spielfeldbild (1600 × 640)
          landeten dadurch nur 23 % auf dem Schirm. Ab 1280 px trägt `rn-shell` das Bühnen-Layout (index.css). */}
      <div className={`w-full max-w-5xl grid gap-4 ${state.phase === "menu" ? "dt:max-w-[1520px]" : "rn-shell"}`}>
        {state.phase === "menu" ? (
          <StartScreen onStart={startRun} onPlaySeed={startRun} onSecretSeed={import.meta.env.VITE_PREVIEW === "1" ? handleSecretSeed : null} onRankedBoard={() => setShowLeaderboard("ranked")} highscores={highscores} best={best} onOptions={() => setShowOptions(true)}
            onResume={resumable ? resumeRun : null}
            resume={resumable ? { cycle: resumable.state.cycle, totalCycles: resumable.state.maxCycles || resumable.state.difficulty?.maxCycles || MAX_CYCLES, score: resumable.state.score } : null}
            onStats={() => setShowStats(true)} onCustomize={() => setShowCustomize(true)} onLeaderboard={() => setShowLeaderboard("board")}
            onUpgrades={() => setShowUpgrades(true)} profile={profile}
            onDevRun={import.meta.env.VITE_PREVIEW === "1" ? () => setShowDevSetup(true) : null}
            muted={!!options.muted} onToggleMute={() => changeOptions({ muted: !options.muted })}
            onFeedback={() => setShowFeedback(true)} onPrivacy={() => setShowPrivacy(true)}
            username={username} onEditName={() => setShowUsername(true)}
            deckId={activeDeckId} bfId={activeBfId} deckBack={deckSkin.back} lastRun={lastRun} battlefield={bfSkin}
            musicTitle={musicTitle} onMusicNext={() => music.next()} activeFx={activeFx} />
        ) : (<>
          {/* Gameplay-Neu-Aufbau: schlanker Kopf — Wortmarke/Seed links, das Glossar-ⓘ groß oben rechts.
              Die Sekundär-Controls stehen als eigene, über die Breite verteilte Reihe darunter; die Vitalwerte +
              Pause/Tempo in der schwebenden StatusBar. */}
          {/* #buehne: `rn-head` ist ab 1280 px `display: contents` — Wortmarke und Glossar-ⓘ werden dann direkte
              Felder des Shell-Rasters und stehen in EINER Zeile mit der Steuerung (Marke links, Knöpfe rechts),
              statt drei Reihen zu stapeln. Unterhalb bleibt der Kopf die Box, die er heute ist. */}
          <header className="rn-head flex items-center justify-between gap-2">
            {/* Wortmarke + Seed in EINER Zeile (spart eine Zeile) — Seed ist jederzeit kopierbar zum Teilen/Herausfordern (#205). */}
            <div className="rn-brand flex items-center gap-3 flex-wrap min-w-0">
              {/* #UI: Wortmarke im Run-Kopf, mit Ambient-Glow dahinter wie am Mainscreen. */}
              <div className="relative isolate shrink-0">
                {/* Fläche großzügig größer als die Marke + früher Transparenz-Auslauf + Blur → weicher
                    Übergang, kein harter Rechteck-Rand. Farben in index.css unter `.as-runhead-glow`:
                    bis 1280 px der Logo-Dreiklang, darüber die Deckfarben — dieselbe Regel wie am Hub. */}
                <div aria-hidden="true" className="as-runhead-glow pointer-events-none absolute -z-10"
                  style={{ inset: "-150% -70%", filter: "blur(9px)" }} />
                {/* #logo — dieselbe Text-Wortmarke wie am Mainscreen (index.css `.as-wordmark`), nur klein.
                    Hier im Lauf ist --deck-a1/--deck-a2 immer gesetzt, die Marke trägt also ab 1280 px
                    durchgehend die Farbe des gespielten Decks. */}
                <div className="as-wordmark as-wordmark-sm select-none block" aria-hidden="true">{t("start.logo.alt")}</div>
              </div>
              {/* Seed-Chip entfällt hier — der Seed steht in der Statistik & im Endscreen. */}
            </div>
            <GlossaryPanel onOpenChange={setGlossaryOpen} className="rn-glossary shrink-0" style={{ width: 36, height: 36, fontSize: "1.05rem" }} />
          </header>

          {/* Sekundär-Controls als eigene Reihe, gleichmäßig über die Breite verteilt: Optionen · Neustart · Beenden · Ton. */}
          <Controls className="rn-ctrl"
            onRestart={() => setConfirmRestart(true)} onAbort={() => setConfirmAbort(true)} onOptions={() => setShowOptions(true)}
            muted={!!options.muted} onToggleMute={() => changeOptions({ muted: !options.muted })}
          />

          {/* Phase 1: schwebende Kompakt-Leiste — Vitalwerte (Score+Δ · Mult · Serie · Fortschritt · Zeit) + Pause/Tempo/Karten. */}
          <StatusBar className="rn-bar"
            score={state.score} ghost={ghost}
            mult={{ value: baseScoreMult, color: multColor, hot: multHot, shakeClass: multShakeClass, pulseKey: multPulse }}
            getElapsed={getElapsed} timerTicking={active && visible} paused={paused}
            winStreak={state.winStreak || 0} bestStreak={state.bestStreak || 0}
            cycle={state.cycle} totalCycles={totalCycles} pos={state.pos} cycleLen={cycleLenFor(state.shop)}
            onTogglePause={() => setPaused((p) => !p)}
            speedMult={speedMult} onSpeed={(m) => setSpeedMult((cur) => (cur === m ? 1 : m))}
            onChronik={() => setShowChronik(true)} deckBack={deckSkin.back}
            milestone={wide && (profile?.onboarding || 0) >= ONBOARDING_LINKS
              ? <div className="sb-ms"><ScoreMilestoneBar score={state.score} /></div>
              : null}
            music={wide && state.phase !== "gameover"
              ? <MusicBar className="sb-music" title={musicTitle} onNext={() => music.next()} />
              : null}
          />

          {/* #UI: Mobil-Reihenfolge Battlefield → Bars → Stats → Perks (order-1…4). Bis 1280 px bleibt das
              2-spaltige lg-Raster via expliziter Grid-Platzierung: Battlefield+Bars links, Stats-Sidebar rechts.
              #buehne: Ab 1280 px reichen `rn-body` und `rn-main` ihre Kinder durch (display: contents) und
              `rn-bank` wird die Instrumentenbank unter der Bühne — eine Spur je Archetyp, Analyse links,
              Build rechts. Die vier Blöcke stehen dafür als GESCHWISTER im DOM (vorher steckten die Bars in
              der linken Spalte); die order-/lg-Klassen halten die Reihenfolge darunter unverändert. */}
          <div className="rn-body grid lg:grid-cols-[1fr_340px] gap-4 items-start">
            <div className="rn-main grid gap-4 order-1 lg:col-start-1 lg:row-start-1">
              {/* §6: Score-Meilenstein-Balken — NACH dem Onboarding (dann greifen die SP-Meilensteine).
                  Ab 1280 px steht er IN der Vitalleiste (s. `milestone`-Prop der StatusBar oben). */}
              {!wide && (profile?.onboarding || 0) >= ONBOARDING_LINKS && (
                <div className="rn-milestone">
                  <ScoreMilestoneBar score={state.score} />
                </div>
              )}
              <Battlefield lastTrick={state.lastTrick} remaining={cycleLenFor(state.shop) - state.pos} deckLen={cycleLenFor(state.shop)} flipMs={flipMs} pe={bfPe}
                heat={state.heat} lightning={state.lightning} score={state.score || 0}
                forged={state.forged || {}} brandActive={state.brandActive || {}}
                growth={state.growth || {}} colonized={state.colonized || {}}
                deckFront={deckSkin.front} deckBack={deckSkin.back} battlefield={bfSkin} bfId={activeBfId}
                deckA1={deckFx.deckA1} deckA2={deckFx.deckA2} bgFx={deckFx.bgFx} bgFinisher={deckFx.bgFinisher} auroraDeck={deckFx.auroraDeck} neonsurfDeck={deckFx.neonsurfDeck}
                starfieldDeck={deckFx.starfieldDeck} cubematrixDeck={deckFx.cubematrixDeck} cubematrixSun={deckFx.cubematrixSun} cubematrixWire={deckFx.cubematrixWire} finisher={deckFx.finisher} scorchDeck={deckFx.scorchDeck} blackholeDeck={deckFx.blackholeDeck} klingeDeck={deckFx.klingeDeck} hologridDeck={deckFx.hologridDeck} cardAnims={deckFx.cardAnims}
                gottEffect={deckFx.gottEffect} gottDeck={deckFx.gottDeck} archDeckColor={deckFx.archDeckColor}
                reducedFx={options.reducedFx}
                hideFloatScore={options.hideFloatScore} hideFloatMult={options.hideFloatMult} hideFloatWinLose={options.hideFloatWinLose}
                hideBreakdown={options.hideBreakdown} boardVisible={boardVisible}
                oppDeck={DECISION_SCHEDULE[state.cycle + 1] || DECISION_SCHEDULE[state.cycle] || "perk"} />
            </div>
            {/* #buehne: Bank aus Bars · Analyse · Build · Wochen-Mods. Unter 1280 px ist sie `display: contents`,
                die vier Blöcke sind also weiterhin direkte Felder des lg-Rasters und tragen ihre eigene
                Platzierung. Ab 1280 px wird sie die Flex-Reihe unter der Bühne. */}
            <div className="rn-bank">
              <div className="rn-bars grid gap-4 order-2 lg:col-start-1 lg:row-start-2">
              {/* #skillheim: Ab 1280 px trägt jede Fraktions-Spur ihre eigenen Skills am Fuß — dort erklären sie
                  den Balken darüber. Das Build-Panel zeigt sie dann nicht mehr doppelt (`hideSkillArchs`). */}
              <ChargeBar lightning={state.lightning} skills={state.skills} winStreak={state.winStreak} critChance={totalCritChanceRaw(state)}
                critMult={totalCritMult(state)} deck={state.deck || []} options={options} onOption={changeOptions} manyActive={wide ? false : manyFac} showSkills={wide} />
              <HeatBar heat={state.heat} skills={state.skills} ash={state.ash || 0} forged={state.forged || {}}
                ashBurned={state.ashBurned || 0} brandTotal={state.brandTotal || 0}
                fireBase={state.fireBase || 0} fireWhite={state.fireWhite || 0} options={options} onOption={changeOptions} manyActive={wide ? false : manyFac} showSkills={wide} />
              <PlantBar active={(state.activeArchetypes || []).includes("plant")}
                deck={state.deck || []}
                growth={state.growth || {}}
                colonized={state.colonized || {}}
                skills={state.skills || []}
                growthTotal={state.growthTotal || 0}
                rootScore={state.plantRoot || 0} bloomScore={state.plantBloom || 0} harvestScore={state.plantHarvest || 0}
                trimCount={state.trimCount || 0}
                options={options} onOption={changeOptions} manyActive={wide ? false : manyFac} showSkills={wide} />
              <GlacierBar active={(state.activeArchetypes || []).includes("ice")}
                glacierLocked={state.glacierLocked || []} glacierMass={state.glacierMass || []} firnStack={state.firnStack || []}
                glacierYield={state.glacierYield || 0} glacierRoles={state.glacierRoles || []}
                glacierPre={state.glacierPre} deck={state.deck || []} playerOrder={state.playerOrder || []}
                frozenOppPending={state.frozenOppPending || {}} frozenOppActive={state.frozenOppActive || {}}
                glacierBuffPending={state.glacierBuffPending || {}} glacierBuffActive={state.glacierBuffActive || {}}
                grosseLawineFired={state.grosseLawineFired} options={options} onOption={changeOptions} manyActive={wide ? false : manyFac}
                skills={state.skills || []} showSkills={wide} />
              </div>
              {/* Stats — Mobil nach den Fraktions-Leisten (order-3), bis 1280 px rechte Sidebar, darüber die
                  linke Spur der Bank. */}
              <div className="rn-rail order-3 lg:col-start-2 lg:row-start-1">
                <StatusRail state={state} currentTraj={currentTraj.current} recordTraj={recordTraj.current} options={options} onOption={changeOptions} best={best} />
              </div>
              {/* Perks/Skills — Mobil unter den Stats (order-4), bis 1280 px links unter dem Battlefield. */}
              <div className="rn-build order-4 lg:col-start-1 lg:row-start-3">
                <BuildPanel perks={state.perks} skills={state.skills} familyTiers={state.familyTiers} zins={zinsReadout(state)} heat={state.heat}
                  hideSkillArchs={wide ? shownSkillArchs : null} />
              </div>
              {/* #381 Ranked-Modifikatoren: nur im Ranked-Lauf (state.weekMods gesetzt), unter den Perks — anklickbare Chips. */}
              {state.weekMods?.length > 0 && (
                <div className="rn-week order-5 lg:col-start-1 lg:row-start-4">
                  <WeekModPanel mods={state.weekMods} />
                </div>
              )}
            </div>
          </div>

          {/* #218: Der Kartenübersicht-Einstieg sitzt jetzt als klickbare Kopf-Zelle „Kartenübersicht" (🎴, nach Mult)
              → der untere Panel-Balken entfällt, die UI ist schlanker. */}
          {/* Musik-Panel (#111): aktueller Track + „nächster Track"-Button (rechtsbündig) — ganz unten im Run. */}
          {!wide && state.phase !== "gameover" && <MusicBar title={musicTitle} onNext={() => music.next()} />}
        </>)}
      </div>

      {state.phase === "formation" && (
        <FormationPhase state={state} onSwap={swapCards} onUndo={undoSwap} onReset={resetFormation} onConfirm={confirmFormation} options={options} onOption={changeOptions} />
      )}
      {state.phase === "glacier-target" && (
        <GlacierPick state={state} onConfirm={lockGlacier} />
      )}
      {state.phase === "architect" && (
        <Suspense fallback={<OverlayFallback />}>
          <ArchitectScreen state={state} options={options} onOption={changeOptions} onBuild={architectBuild} onUpgrade={architectUpgrade}
            onMove={architectMove} onMoveMulti={architectMoveMulti} onDemolish={architectDemolish} onRecolor={architectRecolor} onReroll={rerollArchitect} onDone={architectDone}
            onUndo={architectUndo} onReset={architectReset} />
        </Suspense>
      )}
      {state.phase === "target" && (
        <TargetSelect state={state} onConfirm={confirmTarget} />
      )}
      {state.phase === "family-target" && (
        <FamilyTargetSelect state={state} onSuit={familyTargetSuit} onCard={familyTargetCard} onFormationType={familyTargetFormationType} onConfirm={familyTargetConfirm} />
      )}
      {showChronik && <Suspense fallback={<OverlayFallback />}><ChronikOverview state={state} onClose={() => setShowChronik(false)} options={options} onOption={changeOptions} /></Suspense>}
      {state.phase === "levelup" && state.offer && (
        <PerkSelect offer={state.offer} onPick={pick} onReroll={rerollPerk} onDecline={declinePerk} perks={state.perks} deck={state.deck} state={state}
          options={options} onOption={changeOptions} currentTraj={currentTraj.current} recordTraj={recordTraj.current} best={best} />
      )}
      {state.phase === "levelup" && state.skillOffer && (
        <SkillSelect offer={state.skillOffer} onPick={pickSkill} onDecline={declineSkill} onReroll={rerollSkill} skills={state.skills} state={state} options={options} onOption={changeOptions}
          currentTraj={currentTraj.current} recordTraj={recordTraj.current} best={best} />
      )}
      {state.phase === "legendary" && state.legendaryOffer && (
        <LegendarySelect offer={state.legendaryOffer} onPick={pickLegendary} onDecline={declineLegendary} onReroll={rerollLegendary}
          skills={state.skills} state={state} options={options} onOption={changeOptions}
          currentTraj={currentTraj.current} recordTraj={recordTraj.current} best={best} />
      )}
      {/* #update: „Neue Version verfügbar"-Hinweis — pollt version.json, meldet neue Deploys ohne Zwangs-Reload. */}
      <UpdateBanner />

      {state.phase === "gameover" && (
        <GameOver state={{ ...state, runId: runId.current }} highscores={highscores} isRecord={isRecord} timeStr={fmtDuration(elapsedMs)}
          currentTraj={currentTraj.current} recordTraj={runStartRecordTraj.current} onRestart={startRun} onMenu={toMenu}
          myEntry={myEntry} pubToken={pubToken} hasUsername={!!(username || "").trim()} onEditName={() => setShowUsername(true)}
          newUnlocks={newUnlocks} progressUnlocks={progressUnlocks} earn={runEarn} onboarding={onboardingBanner} prevBests={prevBests}
          onCustomize={() => setShowCustomize(true)} onUpgrades={() => setShowUpgrades(true)} onLeaderboard={() => setShowLeaderboard("board")} />
      )}

      {/* #perf B1: gemeinsame Suspense-Grenze für die (sich gegenseitig ausschließenden) Menü-/Settings-Overlays. */}
      <Suspense fallback={<OverlayFallback />}>
        {showOptions && (
          <OptionsModal options={options} onChange={changeOptions} onClose={() => setShowOptions(false)}
            onPrivacy={() => setShowPrivacy(true)} />
        )}

        {showStats && <StatsScreen onClose={() => setShowStats(false)} onPlaySeed={(seed) => { setShowStats(false); startRun(seed); }} />}

        {showCustomize && (
          <CustomizeScreen options={options} profile={profile} onChoose={changeOptions} onProfileChange={(np) => setProfile(saveProfile(np))} onClose={() => setShowCustomize(false)} />
        )}

        {showDevSetup && (
          <DevRunSetup onStart={(cfg) => { setShowDevSetup(false); startDevRun(cfg); }} onClose={() => setShowDevSetup(false)} />
        )}

        {showUpgrades && <UpgradeScreen onClose={() => setShowUpgrades(false)} profile={profile} onProfileChange={(np) => setProfile(saveProfile(np))} />}
        {showLeaderboard && (
          <LeaderboardScreen mine={myEntry} reloadToken={pubToken} profile={profile}
            username={username}
            // Wochensiege aus dem Champions-Archiv ins Profil spiegeln → schaltet die gestuften Ranglisten-Decks frei.
            onChampionWeeks={(wins) => setProfile((prev) => { const np = recordChampionWeeks(wins); return np || prev; })}
            mode={showLeaderboard === "ranked" ? "ranked" : "board"}
            initialTab={showLeaderboard === "ranked" ? "meister" : "global"}
            onPlaySeed={(seed) => { setShowLeaderboard(false); startRun(seed); }}
            onPlayRanked={() => { setShowLeaderboard(false); startRankedRun(); }}
            onClose={() => setShowLeaderboard(false)} />
        )}
        {/* #396 Feedback-Melder. Steht bewusst in dieser Grenze, braucht aber — anders als Optionen
            und Glossar — KEINE Einfrier-Kopplung: er ist nur im Menü erreichbar, wo kein Lauf läuft. */}
        {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      </Suspense>

      {/* #190: Vorlade-Balken beim Run-Start — lädt die aktiven Skins, dann startet der Lauf wirklich. */}
      {pendingRun && (
        <RunLoader images={pendingRun} onReady={() => { setPendingRun(null); beginRun(); }} />
      )}

      {/* #datenschutz: eigene Suspense-Grenze AUSSERHALB der Menü-Overlay-Grenze — er wird ÜBER den Optionen
          und über dem Namens-Dialog geöffnet, gehört also nicht in deren „schließen sich gegenseitig aus"-Gruppe. */}
      <Suspense fallback={null}>
        {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      </Suspense>

      {showUsername && (
        <UsernameModal initial={username} firstTime={!username}
          onLang={(id) => changeOptions({ lang: id })} onPrivacy={() => setShowPrivacy(true)}
          onSave={onSaveUsername} onClose={() => setShowUsername(false)} />
      )}
      {/* #254: Abbruch-Rückfrage — vom „Beenden"-Button ODER von der Zurück-Geste im aktiven Lauf. Kein Ein-Tap-Verlust.
          #run-dialoge: die Desktop-Fassung (Optionszeilen statt Knopfreihe) steckt in RunConfirm.jsx. */}
      {confirmAbort && (
        <AbortConfirm onKeepPlaying={() => setConfirmAbort(false)} onSave={suspendRun}
          onEnd={() => { setConfirmAbort(false); endRun(); }} />
      )}

      {/* Komfort: Neustart-Rückfrage — der laufende Lauf ist noch nicht gewertet; kein Ein-Tap-Verlust bei Fettfingern. */}
      {confirmRestart && (
        <RestartConfirm onKeepPlaying={() => setConfirmRestart(false)}
          onRestart={() => { setConfirmRestart(false); restartRun(); }} />
      )}
    </div>
  );
}
