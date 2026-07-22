import { PERK_DEFS, CATEGORIES } from "../game/perks.js";

export function GameOver({ state, highscores, isRecord, onRestart }) {
  const score = Math.floor(state.score);
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#e0605a" }}>Lauf beendet</div>
          <div className="text-5xl font-bold mt-2" style={{ color: "#d4a63a" }}>{score.toLocaleString("de-DE")}</div>
          <div className="text-sm opacity-60 mt-1">Score</div>
          {isRecord && <div className="mt-2 text-sm font-bold" style={{ color: "#8a7de0" }}>★ Neuer Rekord!</div>}
        </div>

        <div className="grid grid-cols-4 gap-2 text-center mt-5 text-sm">
          <div><div className="opacity-50 text-xs">Level</div><div className="font-bold">{state.level}</div></div>
          <div><div className="opacity-50 text-xs">Stiche</div><div className="font-bold">{state.trickNo}</div></div>
          <div><div className="opacity-50 text-xs">Durchläufe</div><div className="font-bold">{state.cycle}</div></div>
          <div><div className="opacity-50 text-xs">Perks</div><div className="font-bold">{state.perks.length}</div></div>
        </div>

        {state.perks.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
            {state.perks.map((id) => (
              <span key={id} className="text-[11px] px-2 py-0.5 rounded"
                style={{ background: `${CATEGORIES[PERK_DEFS[id].cat].color}22`, color: CATEGORIES[PERK_DEFS[id].cat].color }}>
                {PERK_DEFS[id].label}
              </span>
            ))}
          </div>
        )}

        {highscores.length > 0 && (
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Beste Läufe</div>
            <div className="grid gap-1">
              {highscores.map((h, i) => (
                <div key={i} className="flex justify-between text-sm px-2 py-1 rounded"
                  style={{ background: h.ts === state.runId ? "#8a7de022" : "#20202a" }}>
                  <span className="opacity-50">#{i + 1}</span>
                  <span className="font-bold" style={{ color: "#d4a63a" }}>{h.score.toLocaleString("de-DE")}</span>
                  <span className="opacity-50 text-xs">Lvl {h.level} · {h.tricks} Stiche</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onRestart}
          className="w-full mt-6 py-2.5 rounded-lg font-bold transition-all"
          style={{ background: "#5ab87a", color: "#141419" }}
        >
          Neuer Lauf
        </button>
      </div>
    </div>
  );
}
