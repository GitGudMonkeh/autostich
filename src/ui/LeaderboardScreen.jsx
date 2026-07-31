// 🏆 Bestenliste (#217/#227) — eigener Screen für ALLE Scores: oben deine lokalen Läufe (klickbar → RunDetail),
// darunter die globale Bestenliste. Vom Startbildschirm hierher gezogen (#217) → aufgeräumter Start (#227).
import { useState } from "react";
import { useEscape } from "./useEscape.js";
import { GlobalLeaderboard } from "./GlobalLeaderboard.jsx";
import { RunDetail } from "./RunDetail.jsx";
import { fmtScore } from "./format.js";

export function LeaderboardScreen({ onClose, mine = null, reloadToken = 0, highscores = [], best = 0, onPlaySeed = null }) {
  useEscape(onClose);
  const [detail, setDetail] = useState(null); // #169 FB-8: gewählter lokaler Lauf → RunDetail-Overlay

  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl p-5 sm:p-6 my-auto overlay-card"
        style={{ background: "#181820", border: "1px solid #33333e" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">🏆 Bestenliste</h2>
          <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
        </div>

        {/* Deine Läufe (lokal, klickbar) — vom Startbildschirm hierher verlegt (#227). */}
        <div className="rounded-xl p-4 as-panel mb-4" style={{ background: "#17171c", border: "1px solid #26262e" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wide opacity-50">Deine Läufe</span>
            <span className="text-sm font-bold" style={{ color: "#d4a63a" }}>Rekord {fmtScore(best)}</span>
          </div>
          {highscores.length === 0 ? (
            <div className="text-sm opacity-40 text-center py-3">Noch keine Läufe — leg los.</div>
          ) : (
            <div className="grid gap-1">
              {highscores.map((h, i) => (
                <button key={i} onClick={() => setDetail({ entry: h, rank: i + 1 })} title="Details anzeigen"
                  className="flex justify-between items-center text-sm px-2 py-1 rounded text-left transition-all hover:brightness-125"
                  style={{ background: "#20202a" }}>
                  <span className="opacity-50">#{i + 1}</span>
                  <span className="font-bold" style={{ color: "#d4a63a" }}>{fmtScore(h.score)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Globale Bestenliste — blendet sich ohne Config/offline lautlos aus. */}
        <GlobalLeaderboard framed mine={mine} reloadToken={reloadToken} />

        {detail && <RunDetail entry={detail.entry} rank={detail.rank} onClose={() => setDetail(null)} onPlaySeed={onPlaySeed} />}
      </div>
    </div>
  );
}
