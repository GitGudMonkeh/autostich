import { useReducer, useEffect, useRef, useState } from "react";
import { reducer, initialState } from "./game/reducer.js";
import { BASE_FLIP_MS, GHOST_STEP } from "./game/constants.js";
import { loadGhost, saveGhost, loadHighscores, recordHighscore } from "./game/storage.js";
import { StatusRail } from "./ui/StatusRail.jsx";
import { Battlefield } from "./ui/Battlefield.jsx";
import { Controls } from "./ui/Controls.jsx";
import { BuildPanel } from "./ui/BuildPanel.jsx";
import { PerkSelect } from "./ui/PerkSelect.jsx";
import { GameOver } from "./ui/GameOver.jsx";

export function Autostich() {
  const [state, dispatch] = useReducer(reducer, null, () => initialState(Math.random));
  const [auto, setAuto] = useState(true);
  const [highscores, setHighscores] = useState(() => loadHighscores());
  const [isRecord, setIsRecord] = useState(false);

  // GEIST — Rekord-Trajektorie (Score je GHOST_STEP Stiche) + laufende Reihe
  const recordTraj  = useRef([]);
  const recordTotal = useRef(0);
  const currentTraj = useRef([]);
  const runId       = useRef(Date.now());
  const recorded    = useRef(false);

  useEffect(() => {
    const g = loadGhost();
    recordTraj.current = g.traj;
    recordTotal.current = g.total;
  }, []);

  // Auto-Play: nach jedem Stich (trickNo ändert sich) den nächsten planen.
  useEffect(() => {
    if (state.phase !== "play" || !auto) return;
    const interval = BASE_FLIP_MS / (1 + state.speedPct / 100);
    const id = setTimeout(() => dispatch({ type: "RESOLVE_TRICK", rng: Math.random }), interval);
    return () => clearTimeout(id);
  }, [state.phase, state.trickNo, auto, state.speedPct]);

  // Geist-Trajektorie des laufenden Runs mitschreiben.
  useEffect(() => {
    if (state.trickNo === 0) return;
    currentTraj.current[Math.floor(state.trickNo / GHOST_STEP)] = Math.floor(state.score);
  }, [state.trickNo]);

  // Laufende — Highscore + Geist sichern.
  useEffect(() => {
    if (state.phase !== "gameover" || recorded.current) return;
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
  }, [state.phase]);

  function restart() {
    currentTraj.current = [];
    recorded.current = false;
    runId.current = Date.now();
    setIsRecord(false);
    dispatch({ type: "RESET", rng: Math.random });
  }
  const pick = (id) => dispatch({ type: "PICK_PERK", perkId: id, rng: Math.random });
  const next = () => { if (state.phase === "play") dispatch({ type: "RESOLVE_TRICK", rng: Math.random }); };

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

  return (
    <div className="min-h-screen w-full flex justify-center px-4 py-6">
      <div className="w-full max-w-5xl grid gap-4">
        <header className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              AUTO<span style={{ color: "#8a7de0" }}>STICH</span>
            </h1>
            <p className="text-xs opacity-45">Roguelite-Autobattler-Stechspiel · Prototyp</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide opacity-50">Bester Score</div>
            <div className="text-xl font-bold" style={{ color: "#d4a63a" }}>{best.toLocaleString("de-DE")}</div>
          </div>
        </header>

        <Controls
          auto={auto} onToggleAuto={() => setAuto((a) => !a)}
          onNext={next} onRestart={restart} canNext={state.phase === "play"}
        />

        <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
          <div className="grid gap-4">
            <Battlefield lastTrick={state.lastTrick} />
            <BuildPanel perks={state.perks} deck={state.deck} />
          </div>
          <StatusRail state={state} speedPct={state.speedPct} ghost={ghost} />
        </div>
      </div>

      {state.phase === "levelup" && state.offer && (
        <PerkSelect offer={state.offer} level={state.level} onPick={pick} />
      )}
      {state.phase === "gameover" && (
        <GameOver state={{ ...state, runId: runId.current }} highscores={highscores} isRecord={isRecord} onRestart={restart} />
      )}
    </div>
  );
}
