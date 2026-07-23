import { useReducer, useEffect, useRef, useState } from "react";
import { reducer, initialState, menuState } from "./game/reducer.js";
import { BASE_FLIP_MS, GHOST_STEP, TRICKS_PER_CYCLE, lifeDrainAt } from "./game/constants.js";
import { baseScoreMultFor } from "./game/perks.js";
import { loadGhost, saveGhost, loadHighscores, recordHighscore, loadOptions, saveOptions, loadUsername, saveUsername } from "./game/storage.js";
import { leaderboardConfigured, publishRun } from "./game/leaderboard.js";
import { fmtDuration } from "./game/deck.js";
import { StatusRail } from "./ui/StatusRail.jsx";
import { Battlefield } from "./ui/Battlefield.jsx";
import { Controls } from "./ui/Controls.jsx";
import { BuildPanel } from "./ui/BuildPanel.jsx";
import { PerkSelect } from "./ui/PerkSelect.jsx";
import { SkillSelect } from "./ui/SkillSelect.jsx";
import { GameOver } from "./ui/GameOver.jsx";
import { StartScreen } from "./ui/StartScreen.jsx";
import { OptionsModal } from "./ui/OptionsModal.jsx";
import { UsernameModal } from "./ui/UsernameModal.jsx";
import { CrtParticles } from "./ui/CrtParticles.jsx";
import { DeckHistogram } from "./ui/BuildSummary.jsx";

export function Autostich() {
  const [state, dispatch] = useReducer(reducer, null, () => menuState());
  const [paused, setPaused] = useState(false);
  const [options, setOptions] = useState(() => loadOptions());   // Optionen (#41): u. a. CRT-Skin
  const [showOptions, setShowOptions] = useState(false);          // Optionen-Overlay offen? → pausiert den Run
  const [speedMult, setSpeedMult] = useState(1); // Ablaufbeschleunigung 1×/2×/3× (#27, kein Score-Effekt)
  const [, setClock] = useState(0); // erzwingt Re-Render fürs Ticken des Timers
  const [highscores, setHighscores] = useState(() => loadHighscores());
  const [isRecord, setIsRecord] = useState(false);
  // Globaler Highscore (#14): lokaler Nickname + Ersteinrichtungs-Modal.
  const [username, setUsername] = useState(loadUsername);
  const [showUsername, setShowUsername] = useState(() => !loadUsername());
  const [myEntry, setMyEntry] = useState(null);  // zuletzt gewerteter Lauf → Hervorhebung im Global-Board
  const [pubToken, setPubToken] = useState(0);    // bumpt nach erfolgreichem Submit → Board lädt neu
  function onSaveUsername(name) { saveUsername(name); setUsername(name); setShowUsername(false); }
  const [drainNotice, setDrainNotice] = useState(null); // kurzer Float beim periodischen Zeit-Abzug (#59)
  const [multPulse, setMultPulse] = useState(0);      // Zähler: bumpt bei Anstieg des Score-Mults → Puls (#37)

  // GEIST — Rekord-Trajektorie (Score je GHOST_STEP Stiche) + laufende Reihe
  const recordTraj  = useRef([]);
  const recordTotal = useRef(0);
  const currentTraj = useRef([]);
  const runStartRecordTraj = useRef([]); // Rekord gegen den DIESER Lauf antritt — Snapshot vor saveRun (#35)
  const runId       = useRef(Date.now());
  const recorded    = useRef(false);

  // RUN-TIMER (#10) — akkumulierte aktive Zeit; friert bei Pause / außerhalb „play" ein (#9)
  const timeBase = useRef(0);
  const segStart = useRef(null);
  const lastDrainCycle = useRef(0); // zuletzt gemeldeter Durchlauf für den Aufschlag-Hinweis (#87)
  const prevMult = useRef(1);     // vorheriger Score-Mult (Puls nur bei Anstieg, #37)
  // Offenes Optionen-Overlay friert den Lauf ein (wie andere Overlays) — ohne den
  // Nutzer-Pause-Toggle zu verändern: beim Schließen läuft es im vorherigen Zustand weiter.
  const active = state.phase === "play" && !paused && !showOptions;
  // Effektive Flip-Zeit: Basis / (1+Speed) / Turbo (1×/2×/3×). Beschleunigt nur Ablauf + Animation,
  // NICHT den Basis-Score (permanenter speedPct → Tempo-Score bleibt separat). #71: temporäres Tempo
  // (Hochlauf/Ruhe, state.tempTempo) beschleunigt hier zusätzlich; L11 Zeitraffer verdoppelt die Tempo-Boni
  // NUR für die reale Geschwindigkeit (der Tempo-Score bleibt einfach — Engine).
  const zeitraffer = (state.perks || []).includes("L11");
  const effSpeedPct = ((state.speedPct || 0) + (state.tempTempo || 0)) * (zeitraffer ? 2 : 1);
  const flipMs = (BASE_FLIP_MS / (1 + effSpeedPct / 100)) / speedMult; // #55: speedPct fehlt im Menü → NaN vermeiden

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
  const changeOptions = (patch) => setOptions((o) => saveOptions({ ...o, ...patch }));

  // Timer-Segmente: bei Wechsel aktiv <-> inaktiv die verstrichene Zeit verbuchen.
  useEffect(() => {
    if (active && segStart.current == null) segStart.current = Date.now();
    else if (!active && segStart.current != null) {
      timeBase.current += Date.now() - segStart.current;
      segStart.current = null;
    }
  }, [active]);
  // Anzeige ticken lassen, solange der Lauf aktiv ist.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setClock((c) => c + 1), 250);
    return () => clearInterval(id);
  }, [active]);

  // Auto-Play: nach jedem Stich (trickNo ändert sich) den nächsten planen. Pause hält alles an.
  useEffect(() => {
    if (state.phase !== "play" || paused || showOptions) return;
    const id = setTimeout(() => dispatch({ type: "RESOLVE_TRICK", rng: Math.random }), flipMs);
    return () => clearTimeout(id);
    // #56: flipMs direkt (statt seiner Einzel-Eingaben speedPct/speedMult) → Deps veralten nicht,
    // falls flipMs künftig von weiteren Variablen abhängt.
  }, [state.phase, state.trickNo, paused, showOptions, flipMs]);

  // Geist-Trajektorie des laufenden Runs mitschreiben.
  useEffect(() => {
    if (!state.trickNo) return;
    currentTraj.current[Math.floor(state.trickNo / GHOST_STEP)] = Math.floor(state.score);
  }, [state.trickNo]);

  // Aktuellen Lauf werten: Highscore + Geist sichern (idempotent via recorded-Ref).
  // Genutzt von Game-Over UND vom vorzeitigen Beenden (#5), damit nichts verloren geht.
  function saveRun() {
    if (recorded.current || !state.trickNo) return;
    recorded.current = true;
    const finalScore = Math.floor(state.score);
    setHighscores(recordHighscore({
      score: finalScore, tricks: state.trickNo, cycles: state.cycle, ts: runId.current,
    }));
    // Globalen Lauf posten (#14) — additiv, fehlertolerant. myEntry hebt ihn im Board hervor;
    // pubToken lädt das Board nach dem Submit neu (damit der eigene Lauf drin ist).
    const name = (username || "").trim().slice(0, 20);
    // `level` bleibt im Payload (= Rundenzahl), damit die bestehende Supabase-Spalte befüllt ist
    // (falls NOT NULL) — kein Schema-Wechsel nötig. Angezeigt wird ohnehin `cycles`.
    const gEntry = { name, score: finalScore, level: state.cycle, tricks: state.trickNo, cycles: state.cycle };
    setMyEntry(gEntry);
    if (leaderboardConfigured && name) {
      publishRun(gEntry).then(() => setPubToken((t) => t + 1)).catch(() => {});
    }
    if (finalScore > recordTotal.current) {
      recordTraj.current = currentTraj.current.slice();
      recordTotal.current = finalScore;
      saveGhost(recordTraj.current, finalScore);
      setIsRecord(true);
    }
  }
  // Bei Game-Over automatisch werten.
  useEffect(() => {
    if (state.phase === "gameover") saveRun();
  }, [state.phase]);

  function startRun() {
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
    lastDrainCycle.current = 0;
    setDrainNotice(null);
    setPaused(false);
    setIsRecord(false);
    dispatch({ type: "START_RUN", rng: Math.random });
  }
  const toMenu = () => { saveRun(); dispatch({ type: "TO_MENU" }); }; // Lauf verlassen (#5)
  const endRun = () => dispatch({ type: "END_RUN" }); // Beenden → Endscreen; saveRun läuft über den gameover-Effekt
  const pick = (id) => dispatch({ type: "PICK_PERK", perkId: id, rng: Math.random });
  // Skill-Auswahl (jede 3. Runde): wählen (optional einen belegten Slot ersetzen) oder ablehnen → Perk.
  const pickSkill = (skillId, replaceId) => dispatch({ type: "PICK_SKILL", skillId, replaceId, rng: Math.random });
  const declineSkill = () => dispatch({ type: "DECLINE_SKILL", rng: Math.random });

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
  // Anti-Infinity (#87): der Aufschlag pro Niederlage hängt am Deck-Durchlauf (cycle), NICHT an der Echtzeit
  // → Tempo/Turbo ändert die Score-Ausbeute nicht mehr. Die Engine rechnet lifeDrainAt(cycle) selbst; hier nur
  // die Anzeige + ein kurzer Hinweis-Float, wenn der Aufschlag beim Durchlauf-Wechsel steigt.
  const lossSurcharge = lifeDrainAt(state.cycle || 0);
  useEffect(() => {
    const cyc = state.cycle || 0;
    if (state.phase !== "play" || cyc <= lastDrainCycle.current) return;
    lastDrainCycle.current = cyc;
    if (lifeDrainAt(cyc) > lifeDrainAt(cyc - 1)) { // nur melden, wenn der Aufschlag tatsächlich hochgeht
      setDrainNotice({ cycle: cyc, surcharge: lifeDrainAt(cyc) });
      const id = setTimeout(() => setDrainNotice(null), 2000);
      return () => clearTimeout(id);
    }
  }, [state.cycle, state.phase]);

  // Prominenter Score-Multiplikator-Chip (#37): geteilte Quelle mit der StatusRail (kein Drift).
  // perks || [] — im Menü (state = { phase:"menu" }) fehlen die Felder; Defaults greifen.
  const baseScoreMult = baseScoreMultFor(state.perks || [], {
    winStreak: state.winStreak, wins: state.wins, trickNo: state.trickNo, pos: state.pos,
    speedPct: (state.speedPct || 0) + (state.tempTempo || 0), // #83: temporäres Tempo (Hochlauf/Ruhe) mitzählen
  });
  const multHot = baseScoreMult > 1.001; // >1 → Gold; ×1,00 → gedämpft
  const fmtMult = (x) => x.toFixed(2).replace(".", ",");
  // Dezenter Scale-Puls NUR bei Anstieg (v. a. D2-Kombo). Reduced-motion → global via CSS neutralisiert.
  useEffect(() => {
    if (baseScoreMult > prevMult.current + 1e-9) setMultPulse((n) => n + 1);
    prevMult.current = baseScoreMult;
  }, [baseScoreMult]);

  return (
    <div className="min-h-screen w-full flex justify-center px-4 py-6">
      {/* CRT-Scanline-/Vignette-Overlay (#41) — immer im DOM, nur unter [data-skin="crt"]
          sichtbar (CSS), klick-durchlässig. */}
      <div className="crt-overlay" aria-hidden="true" />
      {/* Preview-Marker — nur im Testbranch-Build (/autostich/test/), damit man die
          Test-Page nie mit der echten Seite verwechselt. Klick-durchlässig. */}
      {import.meta.env.VITE_PREVIEW === "1" && (
        <div
          className="fixed top-2 left-2 z-50 px-2 py-1 rounded text-[10px] font-bold font-pixel tracking-wide"
          style={{ background: "#d4a63a", color: "#141419", pointerEvents: "none", boxShadow: "0 0 8px rgba(212,166,58,.6)" }}
          aria-hidden="true"
        >
          TESTBRANCH
        </div>
      )}
      {/* Ambient-Partikel — nur unter Skin und nur auf dem Hauptscreen (Menü): dort gibt es
          offene Fläche, sodass sie ohne durchscheinende Panels sichtbar sind. Im Run bleiben
          die Panels deckend. (reduced-motion-gated in der Komponente.) */}
      {options.skin === "crt" && state.phase === "menu" && <CrtParticles />}
      <div className="w-full max-w-5xl grid gap-4">
        {state.phase === "menu" ? (
          <StartScreen onStart={startRun} highscores={highscores} best={best} onOptions={() => setShowOptions(true)}
            username={username} onEditName={() => setShowUsername(true)} myEntry={myEntry} pubToken={pubToken} />
        ) : (<>
          <header className="flex items-end justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-pixel crt-title as-wordmark-header">
                AUTO<span style={{ color: "#8a7de0" }}>STICH</span>
              </h1>
              <p className="text-xs opacity-45">Roguelite-Autobattler-Stechspiel · Prototyp</p>
            </div>
            <div className="flex items-end gap-5">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide opacity-50">Zeit{paused ? " ⏸" : ""}</div>
                <div className="text-xl font-bold font-pixel-dense" style={{ fontVariantNumeric: "tabular-nums" }}>{fmtDuration(elapsedMs)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide opacity-50">Score</div>
                <div className="text-xl font-bold font-pixel-dense" style={{ color: "#d4a63a" }}>
                  {Math.floor(state.score).toLocaleString("de-DE")}
                  {ghost.hasGhost && (ghost.passed ? (
                    <span className="text-xs font-normal ml-2" style={{ color: "#8a7de0" }}>⚑ Rekord</span>
                  ) : ghost.delta != null ? (
                    <span className="text-xs font-normal ml-2" style={{ color: ghost.delta >= 0 ? "#5ab87a" : "#e0605a" }}>
                      {ghost.delta >= 0 ? "▲ +" : "▼ "}{ghost.delta.toLocaleString("de-DE")}
                    </span>
                  ) : null)}
                </div>
              </div>
              {/* Score-Multiplikator-Chip (#37): immer sichtbar, ×1,00 gedämpft, ab >1 Gold; Puls bei Anstieg. */}
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide opacity-50">Mult</div>
                <div className="text-xl font-bold leading-none pt-0.5">
                  <span key={multPulse} className="inline-block rounded px-1.5 py-0.5 text-base font-pixel-dense"
                    title="Score-Multiplikator: Siegesserie (Basis, immer +2 %/Stufe bis +30 %) × D1 × Tempo — D2 verstärkt die Serie zusätzlich"
                    style={{ fontVariantNumeric: "tabular-nums",
                             background: multHot ? "#d4a63a22" : "#ffffff0f",
                             color: multHot ? "#d4a63a" : "#8a8a92",
                             animation: multPulse > 0 ? "as-multpulse 420ms ease-out" : undefined }}>
                    ×{fmtMult(baseScoreMult)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide opacity-50">Bester Score</div>
                <div className="text-xl font-bold font-pixel-dense" style={{ color: "#d4a63a" }}>{best.toLocaleString("de-DE")}</div>
              </div>
            </div>
          </header>

          <Controls
            paused={paused} onTogglePause={() => setPaused((p) => !p)}
            speedMult={speedMult} onSpeed={(m) => setSpeedMult((cur) => (cur === m ? 1 : m))}
            onRestart={startRun} onAbort={endRun} onOptions={() => setShowOptions(true)}
          />

          <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
            <div className="grid gap-4">
              <Battlefield lastTrick={state.lastTrick} remaining={TRICKS_PER_CYCLE - state.pos} flipMs={flipMs} drainNotice={drainNotice} />
              <BuildPanel perks={state.perks} />
            </div>
            <StatusRail state={state} speedPct={state.speedPct} lossSurcharge={lossSurcharge} currentTraj={currentTraj.current} recordTraj={recordTraj.current} />
          </div>

          {/* Chronik — Deck-Werte-Histogramm, volle Breite ganz unten (#28) */}
          <div className="rounded-xl p-4 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Chronik — Deck-Werte je Farbe</div>
            <DeckHistogram deck={state.deck} />
          </div>
        </>)}
      </div>

      {state.phase === "levelup" && state.offer && (
        <PerkSelect offer={state.offer} onPick={pick} perks={state.perks} deck={state.deck} state={state} />
      )}
      {state.phase === "levelup" && state.skillOffer && (
        <SkillSelect offer={state.skillOffer} onPick={pickSkill} onDecline={declineSkill} skills={state.skills} state={state} />
      )}
      {state.phase === "gameover" && (
        <GameOver state={{ ...state, runId: runId.current }} highscores={highscores} isRecord={isRecord} timeStr={fmtDuration(elapsedMs)}
          currentTraj={currentTraj.current} recordTraj={runStartRecordTraj.current} onRestart={startRun} onMenu={toMenu}
          myEntry={myEntry} pubToken={pubToken} hasUsername={!!(username || "").trim()} onEditName={() => setShowUsername(true)} />
      )}

      {showOptions && (
        <OptionsModal options={options} onChange={changeOptions} onClose={() => setShowOptions(false)} />
      )}

      {showUsername && (
        <UsernameModal initial={username} firstTime={!username}
          onSave={onSaveUsername} onClose={() => setShowUsername(false)} />
      )}
    </div>
  );
}
