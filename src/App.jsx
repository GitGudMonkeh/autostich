import { useReducer, useEffect, useRef, useState } from "react";
import { reducer, initialState, menuState } from "./game/reducer.js";
import { BASE_FLIP_MS, GHOST_STEP, TRICKS_PER_CYCLE, lossCostFor, lossTierFor } from "./game/constants.js";
import { loadGhost, saveGhost, loadHighscores, recordHighscore } from "./game/storage.js";
import { fmtDuration } from "./game/deck.js";
import { StatusRail } from "./ui/StatusRail.jsx";
import { Battlefield } from "./ui/Battlefield.jsx";
import { Controls } from "./ui/Controls.jsx";
import { BuildPanel } from "./ui/BuildPanel.jsx";
import { PerkSelect } from "./ui/PerkSelect.jsx";
import { GameOver } from "./ui/GameOver.jsx";
import { StartScreen } from "./ui/StartScreen.jsx";
import { DeckHistogram } from "./ui/BuildSummary.jsx";

export function Autostich() {
  const [state, dispatch] = useReducer(reducer, null, () => menuState());
  const [paused, setPaused] = useState(false);
  const [speedMult, setSpeedMult] = useState(1); // Ablaufbeschleunigung 1×/2×/3× (#27, kein Score-Effekt)
  const [, setClock] = useState(0); // erzwingt Re-Render fürs Ticken des Timers
  const [highscores, setHighscores] = useState(() => loadHighscores());
  const [isRecord, setIsRecord] = useState(false);
  const [lossNotice, setLossNotice] = useState(null); // kurzer Float beim Stufenwechsel der Niederlagenkosten (#32)

  // GEIST — Rekord-Trajektorie (Score je GHOST_STEP Stiche) + laufende Reihe
  const recordTraj  = useRef([]);
  const recordTotal = useRef(0);
  const currentTraj = useRef([]);
  const runId       = useRef(Date.now());
  const recorded    = useRef(false);

  // RUN-TIMER (#10) — akkumulierte aktive Zeit; friert bei Pause / außerhalb „play" ein (#9)
  const timeBase = useRef(0);
  const segStart = useRef(null);
  const lastLossTier = useRef(0); // zuletzt angezeigte Niederlagenkosten-Stufe (#32)
  const active = state.phase === "play" && !paused;
  // Effektive Flip-Zeit: Basis / (1+Speed) / Turbo (1×/2×/3×). Beschleunigt nur Ablauf + Animation,
  // NICHT den Score (speedPct/tempoScoreMult bleiben unberührt → kein Cheesen).
  const flipMs = (BASE_FLIP_MS / (1 + state.speedPct / 100)) / speedMult;

  useEffect(() => {
    const g = loadGhost();
    recordTraj.current = g.traj;
    recordTotal.current = g.total;
  }, []);

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
  // Beim Auflösen die zeit-eskalierten Niederlagenkosten (#32) aus der LIVE aktiven Zeit berechnen
  // und als Payload injizieren (Determinismus: der reine Layer sieht kein Date).
  useEffect(() => {
    if (state.phase !== "play" || paused) return;
    const id = setTimeout(() => {
      const nowElapsed = timeBase.current + (segStart.current != null ? Date.now() - segStart.current : 0);
      dispatch({ type: "RESOLVE_TRICK", rng: Math.random, lossCost: lossCostFor(nowElapsed) });
    }, flipMs);
    return () => clearTimeout(id);
  }, [state.phase, state.trickNo, paused, state.speedPct, speedMult]);

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
      score: finalScore, level: state.level, tricks: state.trickNo, cycles: state.cycle, ts: runId.current,
    }));
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
    recorded.current = false;
    runId.current = Date.now();
    timeBase.current = 0;
    segStart.current = null;
    lastLossTier.current = 0;
    setLossNotice(null);
    setPaused(false);
    setIsRecord(false);
    dispatch({ type: "START_RUN", rng: Math.random });
  }
  const toMenu = () => { saveRun(); dispatch({ type: "TO_MENU" }); }; // Lauf verlassen (#5)
  const pick = (id) => dispatch({ type: "PICK_PERK", perkId: id, rng: Math.random });

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
  // Zeit-eskalierte Niederlagenkosten (#32) für die Anzeige (StatusRail-Indikator + Stufenwechsel-Float).
  const lossCost = lossCostFor(elapsedMs);
  const lossTier = lossTierFor(elapsedMs);
  // Stufenwechsel → einmaliger, selbst-verschwindender Hinweis-Float (kein Modal, keine Pause).
  // lossTier steigt nur mit aktiver Zeit (Pause friert ein) → kein Spam; Reset via startRun.
  useEffect(() => {
    if (state.phase !== "play" || lossTier <= lastLossTier.current) return;
    lastLossTier.current = lossTier;
    setLossNotice({ tier: lossTier, cost: lossCost });
    const id = setTimeout(() => setLossNotice(null), 2000);
    return () => clearTimeout(id);
  }, [lossTier, state.phase]);

  return (
    <div className="min-h-screen w-full flex justify-center px-4 py-6">
      <div className="w-full max-w-5xl grid gap-4">
        {state.phase === "menu" ? (
          <StartScreen onStart={startRun} highscores={highscores} best={best} />
        ) : (<>
          <header className="flex items-end justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                AUTO<span style={{ color: "#8a7de0" }}>STICH</span>
              </h1>
              <p className="text-xs opacity-45">Roguelite-Autobattler-Stechspiel · Prototyp</p>
            </div>
            <div className="flex items-end gap-5">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide opacity-50">Zeit{paused ? " ⏸" : ""}</div>
                <div className="text-xl font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>{fmtDuration(elapsedMs)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide opacity-50">Score</div>
                <div className="text-xl font-bold" style={{ color: "#d4a63a" }}>
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
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide opacity-50">Bester Score</div>
                <div className="text-xl font-bold" style={{ color: "#d4a63a" }}>{best.toLocaleString("de-DE")}</div>
              </div>
            </div>
          </header>

          <Controls
            paused={paused} onTogglePause={() => setPaused((p) => !p)}
            speedMult={speedMult} onSpeed={(m) => setSpeedMult((cur) => (cur === m ? 1 : m))}
            onRestart={startRun} onAbort={toMenu}
          />

          <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
            <div className="grid gap-4">
              <Battlefield lastTrick={state.lastTrick} remaining={TRICKS_PER_CYCLE - state.pos} flipMs={flipMs} lossNotice={lossNotice} />
              <BuildPanel perks={state.perks} />
            </div>
            <StatusRail state={state} speedPct={state.speedPct} lossCost={lossCost} currentTraj={currentTraj.current} recordTraj={recordTraj.current} />
          </div>

          {/* Chronik — Deck-Werte-Histogramm, volle Breite ganz unten (#28) */}
          <div className="rounded-xl p-4" style={{ background: "#17171c", border: "1px solid #26262e" }}>
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Chronik — Deck-Werte je Farbe</div>
            <DeckHistogram deck={state.deck} />
          </div>
        </>)}
      </div>

      {state.phase === "levelup" && state.offer && (
        <PerkSelect offer={state.offer} level={state.level} onPick={pick} perks={state.perks} deck={state.deck} />
      )}
      {state.phase === "gameover" && (
        <GameOver state={{ ...state, runId: runId.current }} highscores={highscores} isRecord={isRecord} timeStr={fmtDuration(elapsedMs)} onRestart={startRun} onMenu={toMenu} />
      )}
    </div>
  );
}
