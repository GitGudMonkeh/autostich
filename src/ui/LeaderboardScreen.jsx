// 🏆 Bestenliste (#217) — die globale Bestenliste zog vom Startbildschirm in einen eigenen Screen (aufgeräumter
// Start, bessere Sichtbarkeit). Reine Overlay-Hülle um GlobalLeaderboard; die Datenlogik/Anti-Copy bleibt dort.
import { useEscape } from "./useEscape.js";
import { GlobalLeaderboard } from "./GlobalLeaderboard.jsx";

export function LeaderboardScreen({ onClose, mine = null, reloadToken = 0 }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl p-5 sm:p-6 my-auto overlay-card"
        style={{ background: "#181820", border: "1px solid #33333e" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">🏆 Bestenliste</h2>
          <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
        </div>
        <GlobalLeaderboard framed mine={mine} reloadToken={reloadToken} />
      </div>
    </div>
  );
}
