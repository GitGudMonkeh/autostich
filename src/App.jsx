import { useReducer, useEffect, useRef, useState } from "react";
import { reducer, menuState } from "./game/reducer.js";
import { BASE_FLIP_MS, GHOST_STEP, DECISION_SCHEDULE, MAX_CYCLES } from "./game/constants.js";
import { baseScoreMultFor, totalCritChanceRaw, totalCritMult } from "./game/perks.js";
import { allianceGroups } from "./game/families.js";
import { computeFormations } from "./game/formations.js"; // #201.8 Stufe B: Deck-Snapshot in der Historie
import { formatSeed } from "./game/rng.js"; // #205 Challenger Mode: Seed anzeigen (Base32)
import { randomSeed } from "./ui/seedShare.js"; // #229 N7: Lauf-Seed würfeln (UI-Layer — Math.random raus aus game/)
import { loadGhost, saveGhost, loadHighscores, recordHighscore, recordRun, loadOptions, saveOptions, loadUsername, saveUsername, loadProfile, saveActiveRun, loadActiveRun, clearActiveRun } from "./game/storage.js";
import { leaderboardConfigured, publishRun } from "./game/leaderboard.js";
import { fmtDuration } from "./game/deck.js";
import { fmtScore } from "./ui/format.js";
import { useBackGuard } from "./ui/useBackGuard.js";
import { StatusRail } from "./ui/StatusRail.jsx";
import { StatusBar } from "./ui/StatusBar.jsx"; // Gameplay-Neu-Aufbau Phase 1: schwebende Kompakt-Leiste (Vitals + Pause/Tempo/Karten)
import { architectCoverFor } from "./ui/architectCover.js"; // Lauf-Details: Gebäude-Overlay in den Snapshot persistieren
import { Battlefield } from "./ui/Battlefield.jsx";
import { GlossaryPanel } from "./ui/Glossary.jsx";
import { Controls } from "./ui/Controls.jsx";
import { BuildPanel } from "./ui/BuildPanel.jsx";
import { PerkSelect } from "./ui/PerkSelect.jsx";
import { SkillSelect } from "./ui/SkillSelect.jsx";
import { LegendarySelect } from "./ui/LegendarySelect.jsx"; // #272 Legendär-Phase (Runde 29)
import { FormationPhase } from "./ui/FormationPhase.jsx";
import { ArchitectScreen } from "./ui/ArchitectScreen.jsx";
import { TargetSelect } from "./ui/TargetSelect.jsx";
import { GlacierPick } from "./ui/GlacierPick.jsx";
import { FamilyTargetSelect } from "./ui/FamilyTargetSelect.jsx";
import { ChronikOverview } from "./ui/ChronikOverview.jsx";
import { ChargeBar } from "./ui/ChargeBar.jsx";
import { HeatBar } from "./ui/HeatBar.jsx";
import { GlacierBar } from "./ui/GlacierBar.jsx";
import { PlantBar } from "./ui/PlantBar.jsx";
import { MasteryBar } from "./ui/MasteryBar.jsx";
import { archetypeOf } from "./game/skills.js";
import { cycleLenFor } from "./game/shop.js";
import { GameOver } from "./ui/GameOver.jsx";
import { StartScreen } from "./ui/StartScreen.jsx";
import { StatsScreen } from "./ui/StatsScreen.jsx";
import { SeedChip } from "./ui/SeedChip.jsx"; // #205 Challenger Mode: Seed im HUD kopierbar
import { CustomizeScreen } from "./ui/CustomizeScreen.jsx";
import { DevRunSetup } from "./ui/DevRunSetup.jsx"; // Dev-Run (nur Preview-Build)
import { LeaderboardScreen } from "./ui/LeaderboardScreen.jsx"; // #217: globale Bestenliste als eigener Screen
import { MasterRunSelect } from "./ui/MasterRunSelect.jsx"; // #217: Rang-Auswahl für den Meister-Lauf
import { RunLoader } from "./ui/RunLoader.jsx";
import { resolveSkinId, isUnlocked, DECK_DEFS, BATTLEFIELD_DEFS } from "./game/cosmetics.js";
import { deckAssets, battlefieldAssets } from "./ui/cosmeticAssets.js";
import { OptionsModal } from "./ui/OptionsModal.jsx";
import { audio } from "./ui/audio.js";
import { haptics } from "./ui/haptics.js";
import { music } from "./ui/music.js";
import { MusicBar } from "./ui/MusicBar.jsx";
import { UsernameModal } from "./ui/UsernameModal.jsx";
import { CrtParticles } from "./ui/CrtParticles.jsx";
import { multTierColor, multTierLevel } from "./ui/multTier.js";

export function Autostich() {
  const [state, dispatch] = useReducer(reducer, null, () => menuState());
  const [paused, setPaused] = useState(false);
  const [options, setOptions] = useState(() => loadOptions());   // Optionen (#41): u. a. CRT-Skin
  const [showOptions, setShowOptions] = useState(false);          // Optionen-Overlay offen? → pausiert den Run
  const [showStats, setShowStats] = useState(false);              // #172 FB-10: Statistik-Hub (nur im Menü)
  const [showCustomize, setShowCustomize] = useState(false);      // #190: Kollektion (Deck/Battlefield, nur im Menü)
  const [showLeaderboard, setShowLeaderboard] = useState(false);  // #217: globale Bestenliste zog vom Startbildschirm in einen eigenen Screen
  const [profile, setProfile] = useState(loadProfile);            // #190: Profil (Freischalt-Status) — nach jedem Lauf aktualisiert
  const [newUnlocks, setNewUnlocks] = useState([]);               // #190: in DIESEM Lauf frisch freigeschaltete Skins → GameOver
  const [pendingRun, setPendingRun] = useState(null);             // #190: Vorlade-Gate beim Run-Start (Skin-Bild-URLs)
  const pendingSeed = useRef(null);                               // #205: Challenge-Seed für den nächsten Lauf (null → frischer Zufalls-Seed)
  const pendingMaster = useRef(false);                            // #217: nächster Lauf = Meister-Lauf? (nur diese zählen für die Rang-Leiter)
  const pendingGrade = useRef(0);                                 // #217: gewählter Rang für den nächsten Meister-Lauf (0 = ranglos)
  const pendingDev = useRef(null);                                // Dev-Run: Config { rounds, schedule, cover, energy } für den nächsten Lauf (null = normaler Lauf)
  const [showDevSetup, setShowDevSetup] = useState(false);        // Dev-Run-Setup-Overlay (nur Preview-Build)
  const [showMasterSelect, setShowMasterSelect] = useState(false); // #217: Rang-Auswahl-Overlay (Meister-Lauf starten)
  const [showChronik, setShowChronik] = useState(false);          // Chronik-Kartenübersicht (§22.11)
  const [glossaryOpen, setGlossaryOpen] = useState(false);        // Glossar-Overlay offen → friert den Lauf ein (wie Optionen/Chronik)
  const [confirmAbort, setConfirmAbort] = useState(false);        // #254: Rückfrage „Lauf wirklich abbrechen?" (Beenden-Button ODER Zurück-Geste im Run)
  const [confirmRestart, setConfirmRestart] = useState(false);    // Komfort: Rückfrage „Wirklich neustarten?" (Neustart-Button) — kein Ein-Tap-Verlust bei Fettfingern
  const [speedMult, setSpeedMult] = useState(1); // Ablaufbeschleunigung intern 1×/2×/4×/6× (Buttons X2/X4/MAX; #27, kein Score-Effekt)
  const [, setClock] = useState(0); // erzwingt Re-Render fürs Ticken des Timers
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
  stateRef.current = state; // Snapshot-Handler lesen immer den aktuellen State (kein Re-Registrieren je Stich)
  // Effektive Lauflänge — spiegelt die Engine-Endbedingung (engine.js): Dev-Run (state.maxCycles) ODER
  // Großmeister IV/V (difficulty.maxCycles 57/54) ODER Basis (MAX_CYCLES 60). HUD-Nenner + Completion-Check lesen DIES.
  const totalCycles = state.maxCycles || state.difficulty?.maxCycles || MAX_CYCLES;
  // Dynamische Rundengeschwindigkeit (#95): jeder Durchlauf startet bei +0 % und beschleunigt
  // +2 % je in DIESEM Durchlauf gewonnenem Stich → sichtbare Eskalation zum Rundenende, Reset je Durchlauf.
  // Rein Anzeige/Ablauf (score-neutral wie der Turbo). cycleWins = Siege seit Durchlauf-Beginn.
  const cycleStartWins = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  useEffect(() => { cycleStartWins.current = state.wins || 0; }, [state.cycle]);
  const cycleWins = Math.max(0, (state.wins || 0) - cycleStartWins.current);
  const dynamicSpeed = 1 + 0.02 * cycleWins;
  // Effektive Flip-Zeit: Basis / (Turbo intern 1×/2×/4×/6× — Buttons X2/X4/MAX — × dynamische Rundengeschwindigkeit).
  const flipMs = BASE_FLIP_MS / (speedMult * dynamicSpeed);
  // #188 v2: Hit-Stop/Slow-Mo — nach einem GROSSEN Krit-Sieg den nächsten Stich kurz verzögern (Micro-Hit-Stop ab
  // IRRE ≥150k, längeres Slow-Mo ab GOTTGLEICH ≥500k). Nur bei nennenswertem Takt (kein Hit-Stop bei hohem Turbo,
  // flipMs ≤ 170). Rein Timing/„Juice", score-neutral (wie Turbo). Basiert auf dem gerade gezeigten Stich (lastTrick).
  const lt = state.lastTrick;
  const hitStopMs = (flipMs > 170 && lt && lt.isCrit && (lt.result === "win" || lt.result === "win_tie"))
    ? (lt.gained >= 500000 ? 220 : lt.gained >= 150000 ? 90 : 0) : 0;

  useEffect(() => {
    const g = loadGhost();
    recordTraj.current = g.traj;
    recordTotal.current = g.total;
  }, []);

  // CRT-Skin (#41): data-skin am <html> spiegelt die Option → alle skin-gated CSS-Regeln
  // greifen global (auch das fixed Scanline-Overlay). Default („off") = Attribut entfernt.
  useEffect(() => {
    const root = document.documentElement;
    if (options.skin === "crt") root.setAttribute("data-skin", "crt");
    else root.removeAttribute("data-skin");
  }, [options.skin]);
  // Sound (#110): SFX-Manager initialisieren + DELEGIERTER Klick-Sound (ein Listener deckt alle <button>
  // ab). data-sfx="none" schließt einzelne Buttons aus (z. B. Kauf-Abschluss → eigener Cashout-Sound).
  // Jeder Klick ist zugleich die User-Geste, die den AudioContext entsperrt (Autoplay-Gate).
  useEffect(() => {
    audio.init();
    const onClick = (e) => {
      audio.unlock(); music.unlock(); // erste User-Geste entsperrt SFX UND Musik
      const btn = e.target.closest && e.target.closest("button");
      if (!btn || btn.dataset.sfx === "none") return;
      audio.play("button");
      haptics.tick(); // #207: dezenter Haptik-Tick auf Mobile — spiegelt exakt den Klick-Sound (gleiches data-sfx="none"-Opt-out)
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  // Optionen → Audio-Manager spiegeln (Mute/Lautstärke). #207: Haptik-Toggle spiegeln (Default an; wirkt nur auf Mobile).
  useEffect(() => { audio.setMuted(!!options.muted); audio.setVolume(options.sfxVol ?? 0.4); }, [options.muted, options.sfxVol]);
  useEffect(() => { haptics.setEnabled(options.haptics !== false); }, [options.haptics]);
  // Kauf-Sound (#110): am Wachstum des Kauf-Logs (#127) → exakt 1× je ABGESCHLOSSENEM Kauf (immediate & Ziel-Items),
  // nie premature (Ziel-Flow öffnen) und nie bei no-op. Deshalb Cashout-Buttons via data-sfx="none" stummgeschaltet.
  const prevBuys = useRef(0);
  useEffect(() => {
    const n = state.shop?.purchaseLog?.length || 0;
    if (n > prevBuys.current) { audio.play("buy"); haptics.tick(); } // #207: Kauf-Bestätigung buzzt mit (Cashout-Button ist data-sfx="none")
    prevBuys.current = n;
  }, [state.shop?.purchaseLog?.length]);
  // Musik (#111): Titel-Abo für die Anzeige + phasengesteuerte Wiedergabe. musicHome = Menü ODER Gameover
  // → „Morning Deck"; sonst (im Run) ein zufälliger Track aus dem harmonisierten Pool. Lautstärke/Mute spiegeln.
  const [musicTitle, setMusicTitle] = useState(null);
  useEffect(() => music.subscribe(setMusicTitle), []);
  const musicHome = state.phase === "menu" || state.phase === "gameover";
  useEffect(() => { if (musicHome) music.menu(); else music.enterRun(); }, [musicHome]);
  useEffect(() => { music.setMuted(!!options.muted); music.setVolume(options.musicVol ?? 0.2); }, [options.muted, options.musicVol]);
  // Pause-Knopf hält auch die Musik an — nur im laufenden Stichspiel; in Menü/Gameover spielt sie normal weiter.
  useEffect(() => { music.setPaused(paused && state.phase === "play"); }, [paused, state.phase]);
  const changeOptions = (patch) => setOptions((o) => saveOptions({ ...o, ...patch }));

  // #254: Zentrale Zurück-Behandlung (mobil, Swipe/Hardware/Browser). Priorität: oberstes abweisbares Overlay
  // schließen → im aktiven Lauf Abbruch-Rückfrage öffnen (nicht sofort verlassen) → sonst Standard-Zurück zulassen.
  // Rückgabe true = Geste verbraucht (Guard hält die App), false = normale Navigation (z. B. Menü verlassen).
  const handleBack = () => {
    if (showUsername) { setShowUsername(false); return true; }
    if (glossaryOpen) { setGlossaryOpen(false); return true; }
    if (showChronik) { setShowChronik(false); return true; }
    if (showOptions) { setShowOptions(false); return true; }
    if (showStats) { setShowStats(false); return true; }
    if (showCustomize) { setShowCustomize(false); return true; }
    if (showLeaderboard) { setShowLeaderboard(false); return true; }
    if (showMasterSelect) { setShowMasterSelect(false); return true; }
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
    saveActiveRun(s, { timeBase: tb, runId: runId.current, currentTraj: currentTraj.current });
  };
  // Mobile-zuverlässige Speicherpunkte: Tab in den Hintergrund (visibilitychange→hidden) ODER Seite entladen
  // (pagehide) → sofortiger Snapshot. beforeunload feuert auf Mobile NICHT verlässlich → DAS hier ist der eigentliche Fix.
  useEffect(() => {
    const onVis = () => {
      const hidden = document.visibilityState === "hidden";
      if (hidden) persistActiveRun();
      setVisible(!hidden); // pausiert/reaktiviert Clock-Tick + Auto-Play (Akku/Hitze im Hintergrund)
    };
    window.addEventListener("pagehide", persistActiveRun);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("pagehide", persistActiveRun); document.removeEventListener("visibilitychange", onVis); };
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
  // Anzeige ticken lassen, solange der Lauf aktiv UND der Tab sichtbar ist (Hintergrund → kein Tick, Akku/Hitze).
  useEffect(() => {
    if (!active || !visible) return;
    const id = setInterval(() => setClock((c) => c + 1), 250);
    return () => clearInterval(id);
  }, [active, visible]);

  // Auto-Play: nach jedem Stich (trickNo ändert sich) den nächsten planen. Pause hält alles an.
  useEffect(() => {
    if (state.phase !== "play" || paused || showOptions || showChronik || glossaryOpen || confirmAbort || confirmRestart || !visible) return; // #254: Abbruch-/Neustart-Rückfrage friert den Lauf ein (wie ein Overlay) · !visible: Hintergrund-Tab hält den Lauf an (Akku/Hitze)
    // #188 v2: nach einem großen Krit-Sieg um hitStopMs verzögert (kurzer „Hit-Stop"/Slow-Mo), sonst normaler Takt.
    const id = setTimeout(() => dispatch({ type: "RESOLVE_TRICK", rng: Math.random }), flipMs + hitStopMs);
    return () => clearTimeout(id);
    // #56: flipMs direkt (statt seiner Einzel-Eingaben speedPct/speedMult) → Deps veralten nicht,
    // falls flipMs künftig von weiteren Variablen abhängt.
    // #148: showChronik friert den Lauf ein (wie showOptions) — Tricks laufen nicht mehr hinter dem Overlay weiter.
  }, [state.phase, state.trickNo, paused, showOptions, showChronik, glossaryOpen, confirmAbort, confirmRestart, visible, flipMs, hitStopMs]);

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
      // Victory/Stats-Redesign: Fraktions-Score-Kanäle mitspeichern → die feine Score-Herkunft (Gletscher/Pflanze/
      // Blitz/Feuer + Serie) steht ab jetzt auch in der Statistik (Bestes Build). Alt-Läufe ohne die Felder degradieren
      // sauber aufs grobe Modell (factionShares klemmt fehlende Kanäle auf 0 → „Sonstige").
      glacierYield: state.glacierYield || 0, streakScore: state.streakScore || 0, lightYield: state.lightYield || 0,
      plantRoot: state.plantRoot || 0, plantBloom: state.plantBloom || 0, plantHarvest: state.plantHarvest || 0,
      fireBase: state.fireBase || 0, fireWhite: state.fireWhite || 0,
      // #205: Lauf-Seed lokal mitspeichern (roh + teilbarer Code) → Nachspielen/Kopieren im Challenge-Reiter. Alt-Läufe
      // ohne Seed degradieren sauber (kein Challenge-Knopf). Global (gEntry) folgt mit dem Board-Umzug (Schicht B, #197).
      seed: state.seed ?? null, seedCode: state.seed != null ? formatSeed(state.seed) : null,
      // #217: Rang, mit dem dieser Lauf gespielt wurde + ob er ein Meister-Lauf war. `masterRun` steuert die Rang-Leiter
      // (nur Meister-Läufe schalten frei, storage.recordRun); `masteryGrade` = gespielte Rewards (Gating/PB-Segmentierung).
      masteryGrade: state.masteryGrade || 0,
      masterRun: !!state.masterRun,
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
    };
    const { profile: nextProfile } = recordRun({ ...localEntry, durationMs, archetypes: archetypesUsed,
      shopPurchases: state.shop?.purchaseLog?.length ?? 0, rerollsUsed: state.rerollsUsed || 0, // #214: Rerolls im Lauf → Sparfuchs (noRerollRun)
      completed, deckSnapshot });
    setProfile(nextProfile);
    // #190: in DIESEM Lauf frisch freigeschaltete Skins (Bedingung vorher NICHT erfüllt, jetzt schon) → Siegesscreen.
    const catalog = [
      ...Object.values(DECK_DEFS).map((d) => ({ def: d, type: "deck" })),
      ...Object.values(BATTLEFIELD_DEFS).map((d) => ({ def: d, type: "battlefield" })),
    ];
    setNewUnlocks(
      catalog
        .filter(({ def }) => def.unlock && isUnlocked(def, nextProfile) && !isUnlocked(def, prevProfile))
        .map(({ def, type }) => ({ id: def.id, name: def.name, type }))
    );
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
      // #217 Master-Board: NUR Meister-Läufe tragen den gespielten Rang (mastery_grade, 0=ranglos..10) + die finale
      // Aufstellung (deck_snapshot, P8-C). So landen sie im Master-Board (je Rang) statt im normalen Board; normale
      // Läufe posten wie bisher (kein mastery_grade → normales Board via mastery_grade is null).
      ...(state.masterRun ? { mastery_grade: state.masteryGrade || 0, deck_snapshot: deckSnapshot } : {}) };
    setMyEntry(gEntry);
    if (leaderboardConfigured && name) {
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

  // #190: aktive Skins aus den Optionen (defensiver Fallback auf "default", falls (noch) gesperrt/unbekannt).
  const activeDeckId = resolveSkinId(DECK_DEFS, options.deckId, profile);
  const activeBfId   = resolveSkinId(BATTLEFIELD_DEFS, options.battlefieldId, profile);
  const deckSkin = deckAssets(activeDeckId);
  const bfSkin   = battlefieldAssets(activeBfId);

  function beginRun() {
    clearActiveRun(); setResumable(null); // frischer Lauf ersetzt einen evtl. gespeicherten Resume-Snapshot
    // #205: Challenge-Seed (falls per Paste/Nachspielen gesetzt) ODER frischer Zufalls-Seed. Der Seed macht
    // den Lauf reproduzierbar & teilbar; jeder Lauf bekommt einen, auch der normale „Neuer Run".
    const seed = pendingSeed.current != null ? (pendingSeed.current >>> 0) : randomSeed();
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
    setIsRecord(false);
    setNewUnlocks([]); // #190: Freischalt-Hinweis des Vorlaufs zurücksetzen
    // #217: Meister-Lauf? Nur dann Rang-Rewards + Rang-Leiter. Gewählter Rang defensiv auf ≤ eigenem Max-Rang geklemmt
    // (der Picker bietet ohnehin nur freigeschaltete an). Normaler Lauf = Rang 0, keine Rewards, zählt nicht.
    const masterRun = pendingMaster.current;
    const grade = masterRun ? Math.max(0, Math.min(profile.masteryGrade || 0, pendingGrade.current | 0)) : 0;
    pendingMaster.current = false; pendingGrade.current = 0;
    const dev = pendingDev.current; pendingDev.current = null; // Dev-Run-Config (Test-Layout) für DIESEN Lauf, dann zurücksetzen
    dispatch({ type: "START_RUN", rng: Math.random, architect: true, seed, masteryGrade: grade, masterRun, dev }); // #202 Architekt · #205 Seed · #217 Meister-Lauf · Dev-Run
  }
  // #190: aktive Skin-Bilder vorladen, DANN starten. Der RunLoader zeigt sich nur bei spürbarer Ladezeit
  // (Cache-Treffer → sofort) und hat ein Timeout-Sicherheitsnetz → Start hängt nie.
  // #205: `seed` (Zahl) startet einen Challenge-Lauf (Nachspielen/Paste); als Event-Handler aufgerufen (Zahl-Guard)
  // ODER ohne Argument → frischer Zufalls-Seed in beginRun.
  // #190: Skins vorladen, dann beginRun. Zentraler Trigger, den alle Lauf-Arten teilen (Normal/Meister/Neustart).
  function launchRun({ seed = null, master = false, grade = 0, dev = null } = {}) {
    pendingSeed.current = (typeof seed === "number" && Number.isFinite(seed)) ? (seed >>> 0) : null;
    pendingMaster.current = !!master;
    pendingGrade.current = grade | 0;
    pendingDev.current = dev; // Dev-Run-Config (null = normaler Lauf)
    setPendingRun([deckSkin.front, deckSkin.back, ...(bfSkin ? [bfSkin.desktop, bfSkin.mobile] : [])]);
  }
  // #217: Normaler Lauf (Rang 0, keine Rewards, zählt nicht) — auch der Challenge-Seed-Pfad (Nachspielen/Paste) läuft hier.
  function startRun(seed) { launchRun({ seed: (typeof seed === "number" && Number.isFinite(seed)) ? seed : null, master: false }); }
  // #217: Meister-Lauf auf gewähltem Rang (0 = ranglos). Nur diese zählen für die Rang-Leiter.
  function startMasterRun(grade = 0) { launchRun({ master: true, grade: grade | 0 }); }
  // #217: Neustart behält die Lauf-Art (ein Meister-Lauf startet als Meister-Lauf auf demselben Rang neu).
  function restartRun() { launchRun({ master: !!state.masterRun, grade: state.masteryGrade || 0 }); }
  // Dev-Run (nur Preview): frei konfigurierter Lauf aus dem DevRunSetup-Overlay.
  function startDevRun(dev) { launchRun({ dev }); }
  const toMenu = () => { saveRun(); clearActiveRun(); setResumable(null); dispatch({ type: "TO_MENU" }); }; // Lauf verlassen (#5)
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
  const manyFac = [state.lightning?.active, state.heat?.active,
    (state.activeArchetypes || []).includes("plant"), (state.activeArchetypes || []).includes("ice")].filter(Boolean).length > 1;

  return (
    <div className="min-h-screen w-full flex justify-center px-4 py-6">
      {/* CRT-Scanline-/Vignette-Overlay (#41) — immer im DOM, nur unter [data-skin="crt"]
          sichtbar (CSS), klick-durchlässig. */}
      <div className="crt-overlay" aria-hidden="true" />
      {/* Preview-Marker — nur im Preview-Build (Balancing-/Test-Zweig unter /autostich/balancing/ bzw. /test/),
          damit man die Preview nie mit der echten Seite verwechselt. Label kommt aus VITE_ENV (vom Deploy-Workflow je
          Branch gesetzt: „balancing" bzw. „test") → identische Quelle auf beiden Branches, kein Merge-Clobbering.
          Klick-durchlässig. */}
      {import.meta.env.VITE_PREVIEW === "1" && (
        <div
          className="fixed top-2 left-2 z-50 px-2 py-1 rounded text-[10px] font-bold font-pixel tracking-wide"
          style={{ background: "#d4a63a", color: "#141419", pointerEvents: "none", boxShadow: "0 0 8px rgba(212,166,58,.6)" }}
          aria-hidden="true"
        >
          {(import.meta.env.VITE_ENV || "preview").toUpperCase()}
        </div>
      )}
      {/* Ambient-Partikel — nur unter Skin und nur auf dem Hauptscreen (Menü): dort gibt es
          offene Fläche, sodass sie ohne durchscheinende Panels sichtbar sind. Im Run bleiben
          die Panels deckend. (reduced-motion-gated in der Komponente.) */}
      {options.skin === "crt" && state.phase === "menu" && <CrtParticles />}
      <div className="w-full max-w-5xl grid gap-4">
        {state.phase === "menu" ? (
          <StartScreen onStart={startRun} onPlaySeed={startRun} onMasterRun={() => setShowMasterSelect(true)} highscores={highscores} best={best} onOptions={() => setShowOptions(true)}
            onResume={resumable ? resumeRun : null}
            resume={resumable ? { cycle: resumable.state.cycle, totalCycles: resumable.state.maxCycles || resumable.state.difficulty?.maxCycles || MAX_CYCLES, score: resumable.state.score, masterRun: !!resumable.state.masterRun, grade: resumable.state.masteryGrade || 0 } : null}
            onStats={() => setShowStats(true)} onCustomize={() => setShowCustomize(true)} onLeaderboard={() => setShowLeaderboard(true)}
            onDevRun={import.meta.env.VITE_PREVIEW === "1" ? () => setShowDevSetup(true) : null}
            muted={!!options.muted} onToggleMute={() => changeOptions({ muted: !options.muted })}
            username={username} onEditName={() => setShowUsername(true)} />
        ) : (<>
          {/* Gameplay-Neu-Aufbau: schlanker Kopf — Wortmarke/Seed links, Glossar-ⓘ + Sekundär-Controls rechts.
              Die Vitalwerte + Pause/Tempo stehen jetzt in der schwebenden StatusBar direkt darunter. */}
          <header className="flex items-end justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-pixel crt-title as-wordmark-header">
                AUTO<span style={{ color: "#8a7de0" }}>STICH</span>
              </h1>
              {/* #205: Seed dieses Laufs — jederzeit kopierbar zum Teilen/Herausfordern. */}
              {state.seed != null && <div className="mt-1"><SeedChip code={formatSeed(state.seed)} /></div>}
            </div>
            <div className="flex items-start gap-3">
              <GlossaryPanel onOpenChange={setGlossaryOpen} />
              <Controls
                onRestart={() => setConfirmRestart(true)} onAbort={() => setConfirmAbort(true)} onOptions={() => setShowOptions(true)}
                muted={!!options.muted} onToggleMute={() => changeOptions({ muted: !options.muted })}
              />
            </div>
          </header>

          {/* Phase 1: schwebende Kompakt-Leiste — Vitalwerte (Score+Δ · Mult · Serie · Fortschritt · Zeit) + Pause/Tempo/Karten. */}
          <StatusBar
            score={state.score} ghost={ghost}
            mult={{ value: baseScoreMult, color: multColor, hot: multHot, shakeClass: multShakeClass, pulseKey: multPulse }}
            timeStr={fmtDuration(elapsedMs)} paused={paused}
            winStreak={state.winStreak || 0} bestStreak={state.bestStreak || 0}
            cycle={state.cycle} totalCycles={totalCycles} pos={state.pos} cycleLen={cycleLenFor(state.shop)}
            winPct={(state.wins + state.losses) > 0 ? Math.round((state.wins / (state.wins + state.losses)) * 100) : null}
            onTogglePause={() => setPaused((p) => !p)}
            speedMult={speedMult} onSpeed={(m) => setSpeedMult((cur) => (cur === m ? 1 : m))}
            onChronik={() => setShowChronik(true)} deckBack={deckSkin.back}
          />

          {/* #UI: Mobil-Reihenfolge Battlefield → Stats → Perks (order-1/2/3). Desktop bleibt 2-spaltig via
              explizite lg-Grid-Platzierung: Battlefield+Bars (links oben) + Perks (links unten), Stats-Sidebar rechts. */}
          <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
            <div className="grid gap-4 order-1 lg:col-start-1 lg:row-start-1">
              {state.masterRun && <MasteryBar grade={profile.masteryGrade || 0} score={state.score} />}
              <Battlefield lastTrick={state.lastTrick} remaining={cycleLenFor(state.shop) - state.pos} deckLen={cycleLenFor(state.shop)} flipMs={flipMs} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
                heat={state.heat} lightning={state.lightning}
                forged={state.forged || {}} brandActive={state.brandActive || {}}
                growth={state.growth || {}} colonized={state.colonized || {}}
                deckFront={deckSkin.front} deckBack={deckSkin.back} battlefield={bfSkin}
                reducedFx={options.reducedFx}
                oppDeck={DECISION_SCHEDULE[state.cycle + 1] || DECISION_SCHEDULE[state.cycle] || "perk"} />
              <ChargeBar lightning={state.lightning} skills={state.skills} winStreak={state.winStreak} critChance={totalCritChanceRaw(state)}
                critMult={totalCritMult(state)} deck={state.deck || []} options={options} onOption={changeOptions} manyActive={manyFac} />
              <HeatBar heat={state.heat} skills={state.skills} ash={state.ash || 0} forged={state.forged || {}}
                ashBurned={state.ashBurned || 0} brandTotal={state.brandTotal || 0}
                fireBase={state.fireBase || 0} fireWhite={state.fireWhite || 0} options={options} onOption={changeOptions} manyActive={manyFac} />
              <PlantBar active={(state.activeArchetypes || []).includes("plant")}
                deck={state.deck || []}
                growth={state.growth || {}}
                colonized={state.colonized || {}}
                skills={state.skills || []}
                growthTotal={state.growthTotal || 0}
                rootScore={state.plantRoot || 0} bloomScore={state.plantBloom || 0} harvestScore={state.plantHarvest || 0}
                trimCount={state.trimCount || 0}
                options={options} onOption={changeOptions} manyActive={manyFac} />
              <GlacierBar active={(state.activeArchetypes || []).includes("ice")}
                glacierLocked={state.glacierLocked || []} glacierMass={state.glacierMass || []}
                glacierYield={state.glacierYield || 0} glacierRoles={state.glacierRoles || []}
                glacierPre={state.glacierPre}
                frozenOppPending={state.frozenOppPending || {}} frozenOppActive={state.frozenOppActive || {}}
                glacierBuffPending={state.glacierBuffPending || {}} glacierBuffActive={state.glacierBuffActive || {}}
                grosseLawineFired={state.grosseLawineFired} options={options} onOption={changeOptions} manyActive={manyFac} />
            </div>
            {/* Stats — Mobil direkt nach dem Battlefield (order-2), Desktop rechte Sidebar. */}
            <div className="order-2 lg:col-start-2 lg:row-start-1">
              <StatusRail state={state} currentTraj={currentTraj.current} recordTraj={recordTraj.current} options={options} onOption={changeOptions} best={best} />
            </div>
            {/* Perks/Skills — Mobil unter den Stats (order-3), Desktop links unter dem Battlefield. */}
            <div className="order-3 lg:col-start-1 lg:row-start-2">
              <BuildPanel perks={state.perks} skills={state.skills} familyTiers={state.familyTiers} zinsBonus={state.zinsBonus} />
            </div>
          </div>

          {/* #218: Der Kartenübersicht-Einstieg sitzt jetzt als klickbare Kopf-Zelle „Kartenübersicht" (🎴, nach Mult)
              → der untere Panel-Balken entfällt, die UI ist schlanker. */}
          {/* Musik-Panel (#111): aktueller Track + „nächster Track"-Button (rechtsbündig) — ganz unten im Run. */}
          {state.phase !== "gameover" && <MusicBar title={musicTitle} onNext={() => music.next()} />}
        </>)}
      </div>

      {state.phase === "formation" && (
        <FormationPhase state={state} onSwap={swapCards} onUndo={undoSwap} onReset={resetFormation} onConfirm={confirmFormation} options={options} onOption={changeOptions} />
      )}
      {state.phase === "glacier-target" && (
        <GlacierPick state={state} onConfirm={lockGlacier} />
      )}
      {state.phase === "architect" && (
        <ArchitectScreen state={state} options={options} onOption={changeOptions} onBuild={architectBuild} onUpgrade={architectUpgrade}
          onMove={architectMove} onMoveMulti={architectMoveMulti} onDemolish={architectDemolish} onRecolor={architectRecolor} onReroll={rerollArchitect} onDone={architectDone} />
      )}
      {state.phase === "target" && (
        <TargetSelect state={state} onConfirm={confirmTarget} />
      )}
      {state.phase === "family-target" && (
        <FamilyTargetSelect state={state} onSuit={familyTargetSuit} onCard={familyTargetCard} onFormationType={familyTargetFormationType} onConfirm={familyTargetConfirm} />
      )}
      {showChronik && <ChronikOverview state={state} onClose={() => setShowChronik(false)} options={options} onOption={changeOptions} />}
      {state.phase === "levelup" && state.offer && (
        <PerkSelect offer={state.offer} onPick={pick} onReroll={rerollPerk} onDecline={declinePerk} perks={state.perks} deck={state.deck} state={state} />
      )}
      {state.phase === "levelup" && state.skillOffer && (
        <SkillSelect offer={state.skillOffer} onPick={pickSkill} onDecline={declineSkill} onReroll={rerollSkill} skills={state.skills} state={state} />
      )}
      {state.phase === "legendary" && state.legendaryOffer && (
        <LegendarySelect offer={state.legendaryOffer} onPick={pickLegendary} onDecline={declineLegendary} state={state} />
      )}
      {state.phase === "gameover" && (
        <GameOver state={{ ...state, runId: runId.current }} highscores={highscores} isRecord={isRecord} timeStr={fmtDuration(elapsedMs)}
          currentTraj={currentTraj.current} recordTraj={runStartRecordTraj.current} onRestart={startRun} onMenu={toMenu}
          myEntry={myEntry} pubToken={pubToken} hasUsername={!!(username || "").trim()} onEditName={() => setShowUsername(true)}
          newUnlocks={newUnlocks} />
      )}

      {showOptions && (
        <OptionsModal options={options} onChange={changeOptions} onClose={() => setShowOptions(false)} />
      )}

      {showStats && <StatsScreen onClose={() => setShowStats(false)} onPlaySeed={(seed) => { setShowStats(false); startRun(seed); }} />}

      {showCustomize && (
        <CustomizeScreen options={options} profile={profile} onChoose={changeOptions} onClose={() => setShowCustomize(false)} />
      )}

      {showDevSetup && (
        <DevRunSetup onStart={(cfg) => { setShowDevSetup(false); startDevRun(cfg); }} onClose={() => setShowDevSetup(false)} />
      )}

      {showLeaderboard && (
        <LeaderboardScreen mine={myEntry} reloadToken={pubToken} highscores={highscores} best={best}
          masteryGrade={profile.masteryGrade || 0}
          onPlaySeed={(seed) => { setShowLeaderboard(false); startRun(seed); }}
          onClose={() => setShowLeaderboard(false)} />
      )}

      {showMasterSelect && (
        <MasterRunSelect profile={profile}
          onPlay={(grade) => { setShowMasterSelect(false); startMasterRun(grade); }}
          onClose={() => setShowMasterSelect(false)} />
      )}

      {/* #190: Vorlade-Balken beim Run-Start — lädt die aktiven Skins, dann startet der Lauf wirklich. */}
      {pendingRun && (
        <RunLoader images={pendingRun} onReady={() => { setPendingRun(null); beginRun(); }} />
      )}

      {showUsername && (
        <UsernameModal initial={username} firstTime={!username}
          onSave={onSaveUsername} onClose={() => setShowUsername(false)} />
      )}
      {/* #254: Abbruch-Rückfrage — vom „Beenden"-Button ODER von der Zurück-Geste im aktiven Lauf. Kein Ein-Tap-Verlust. */}
      {confirmAbort && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}
          onClick={() => setConfirmAbort(false)}>
          <div className="w-full max-w-xs rounded-2xl p-5" style={{ background: "#181820", border: "1px solid #33333e" }} onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-bold">Lauf pausieren oder beenden?</div>
            <div className="text-sm opacity-70 mt-1.5"><b>Beenden &amp; speichern</b> merkt sich den Lauf — du kannst ihn später im Menü fortsetzen. <b>Beenden</b> wertet ihn und zeigt den Endscreen.</div>
            <div className="flex flex-col gap-2 mt-4">
              <button onClick={suspendRun} className="rounded-lg py-2 text-sm font-bold" style={{ background: "#2f6d3a", color: "#fff" }}>Beenden &amp; speichern</button>
              <div className="flex gap-2">
                <button onClick={() => setConfirmAbort(false)} className="flex-1 rounded-lg py-2 text-sm font-bold" style={{ background: "#16161c", border: "1px solid #33333e" }}>Weiterspielen</button>
                <button onClick={() => { setConfirmAbort(false); endRun(); }} className="flex-1 rounded-lg py-2 text-sm font-bold" style={{ background: "#e0605a", color: "#fff" }}>Beenden</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Komfort: Neustart-Rückfrage — der laufende Lauf ist noch nicht gewertet; kein Ein-Tap-Verlust bei Fettfingern. */}
      {confirmRestart && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}
          onClick={() => setConfirmRestart(false)}>
          <div className="w-full max-w-xs rounded-2xl p-5" style={{ background: "#181820", border: "1px solid #33333e" }} onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-bold">Wirklich neustarten?</div>
            <div className="text-sm opacity-70 mt-1.5">Der aktuelle Lauf wird verworfen und ein neuer beginnt sofort. Das lässt sich nicht rückgängig machen.</div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmRestart(false)} className="flex-1 rounded-lg py-2 text-sm font-bold" style={{ background: "#16161c", border: "1px solid #33333e" }}>Weiterspielen</button>
              <button onClick={() => { setConfirmRestart(false); restartRun(); }} className="flex-1 rounded-lg py-2 text-sm font-bold" style={{ background: "#e0605a", color: "#fff" }}>Neustarten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
