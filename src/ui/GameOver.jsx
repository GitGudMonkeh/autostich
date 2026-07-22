import { PERK_DEFS, CATEGORIES } from "../game/perks.js";
import { Sparkline } from "./Sparkline.jsx";

// Highscore-Listen (lokal + global) bewusst NICHT hier — sie stehen auf dem Startbildschirm und
// machten dieses (nicht scrollbare) Overlay zu lang. Der GameOver-Screen zeigt nur den Lauf.
export function GameOver({ state, isRecord, timeStr, onRestart, onMenu, currentTraj = [], recordTraj = [] }) {
  const score = Math.floor(state.score);
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#e0605a" }}>Lauf beendet</div>
          <div className="text-5xl font-bold mt-2" style={{ color: "#d4a63a" }}>{score.toLocaleString("de-DE")}</div>
          <div className="text-sm opacity-60 mt-1">Score{timeStr ? ` · ${timeStr}` : ""}</div>
          {isRecord && <div className="mt-2 text-sm font-bold" style={{ color: "#8a7de0" }}>★ Neuer Rekord!</div>}
        </div>

        <div className="grid grid-cols-5 gap-2 text-center mt-5 text-sm">
          <div><div className="opacity-50 text-xs">Level</div><div className="font-bold">{state.level}</div></div>
          <div><div className="opacity-50 text-xs">Stiche</div><div className="font-bold">{state.trickNo}</div></div>
          <div><div className="opacity-50 text-xs">Durchläufe</div><div className="font-bold">{state.cycle}</div></div>
          <div><div className="opacity-50 text-xs">Beste Serie</div><div className="font-bold">{state.bestStreak}×</div></div>
          <div><div className="opacity-50 text-xs">Perks</div><div className="font-bold">{state.perks.length}</div></div>
        </div>

        {state.bestTrickScore > 0 && (
          <div className="grid grid-cols-4 gap-2 text-center mt-3 text-sm">
            <div><div className="opacity-50 text-xs">Crits</div><div className="font-bold" style={{ color: "#e879f9" }}>{state.crits}</div></div>
            <div><div className="opacity-50 text-xs">Crit-Quote</div><div className="font-bold" style={{ color: "#e879f9" }}>{state.wins > 0 ? Math.round((state.crits / state.wins) * 100) : 0}%</div></div>
            <div><div className="opacity-50 text-xs">Crit-Bonus</div><div className="font-bold" style={{ color: "#e879f9" }}>{Math.floor(state.critBonusScore).toLocaleString("de-DE")}</div></div>
            <div><div className="opacity-50 text-xs">Bester Stich</div><div className="font-bold" style={{ color: "#d4a63a" }}>{Math.floor(state.bestTrickScore).toLocaleString("de-DE")}</div></div>
          </div>
        )}

        {(state.predictionBonusScore > 0 || state.exactPredictions > 0) && (
          <div className="grid grid-cols-4 gap-2 text-center mt-3 text-sm">
            <div><div className="opacity-50 text-xs">Exakt</div><div className="font-bold" style={{ color: "#5ab87a" }}>{state.exactPredictions}</div></div>
            <div><div className="opacity-50 text-xs">Knapp</div><div className="font-bold" style={{ color: "#d4a63a" }}>{state.nearPredictions}</div></div>
            <div><div className="opacity-50 text-xs">Ansage-Bonus</div><div className="font-bold" style={{ color: "#8a7de0" }}>{Math.floor(state.predictionBonusScore).toLocaleString("de-DE")}</div></div>
            <div><div className="opacity-50 text-xs">Größter Bonus</div><div className="font-bold" style={{ color: "#8a7de0" }}>{Math.floor(state.largestPredictionBonus).toLocaleString("de-DE")}</div></div>
          </div>
        )}

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

        {/* Punkteverlauf: aktueller Lauf vs. (vorheriger) Rekord (#35). recordTraj ist der Snapshot
            VOR dem saveRun-Überschreiben → bei neuem Rekord liegt die Lauf-Linie sichtbar darüber. */}
        {currentTraj.length >= 2 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-50 mb-2">
              <span>Punkteverlauf</span>
              <span className="flex gap-2 normal-case tracking-normal">
                <span style={{ color: "#d4a63a" }}>Lauf</span>
                {recordTraj.length >= 2 ? <span style={{ color: "#8a7de0" }}>Rekord</span> : <span className="opacity-40">erster Lauf</span>}
              </span>
            </div>
            <Sparkline current={currentTraj} record={recordTraj} height={110} />
          </div>
        )}

        <div className="flex gap-2 mt-6">
          {onMenu && (
            <button
              onClick={onMenu}
              className="py-2.5 px-4 rounded-lg font-bold transition-all"
              style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}
            >
              Menü
            </button>
          )}
          <button
            onClick={onRestart}
            className="flex-1 py-2.5 rounded-lg font-bold transition-all"
            style={{ background: "#5ab87a", color: "#141419" }}
          >
            Neuer Lauf
          </button>
        </div>
      </div>
    </div>
  );
}
