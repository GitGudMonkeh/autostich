import { xpToNext } from "../game/leveling.js";
import { TRICKS_PER_CYCLE } from "../game/constants.js";

function Bar({ value, max, color, height = 8 }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ background: "#26262e", height }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="flex flex-col">
      <div className="text-[10px] uppercase tracking-wide opacity-50">{label}</div>
      <div className="text-lg font-bold" style={{ color: tone || "#e8e8ea" }}>{value}</div>
    </div>
  );
}

export function StatusRail({ state, speedPct, ghost }) {
  const { life, maxLife, xp, level, score, wins, losses, ties, cycle, trickNo, winStreak, bestStreak, pos } = state;
  const need = xpToNext(level);
  const remaining = TRICKS_PER_CYCLE - pos; // Karten bis zum nächsten Mischen (#6)
  const decided = wins + losses;            // Gleichstände zählen nicht als entschieden (§4.4)
  const winPct = decided > 0 ? Math.round((wins / decided) * 100) : 0;
  return (
    <div className="rounded-xl p-4 grid gap-3" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      {/* Leben */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="opacity-60">Leben</span>
          <span className="font-bold" style={{ color: "#5ab87a" }}>{life} / {maxLife}</span>
        </div>
        <Bar value={life} max={maxLife} color="#5ab87a" height={10} />
      </div>
      {/* XP / Level */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="opacity-60">Level {level}</span>
          <span className="opacity-60">{xp} / {need} XP</span>
        </div>
        <Bar value={xp} max={need} color="#8a7de0" />
      </div>
      {/* Kennzahlen */}
      <div className="grid grid-cols-4 gap-3 pt-1">
        <Stat label="Score" value={Math.floor(score).toLocaleString("de-DE")} tone="#d4a63a" />
        <Stat label="Serie" tone={winStreak >= 3 ? "#e0605a" : undefined}
          value={<span>{winStreak > 0 ? `${winStreak}×` : "–"}<span className="text-xs opacity-45 ml-1">best {bestStreak}×</span></span>} />
        <Stat label="Stiche" value={trickNo} />
        <Stat label="Durchlauf" value={cycle + 1} />
      </div>
      <div className="grid grid-cols-4 gap-3 text-xs pt-1 border-t" style={{ borderColor: "#26262e" }}>
        <div><span className="opacity-50">Siege </span><span style={{ color: "#5ab87a" }}>{wins}</span></div>
        <div><span className="opacity-50">Verl. </span><span style={{ color: "#e0605a" }}>{losses}</span></div>
        <div><span className="opacity-50">Quote </span><span style={{ color: winPct >= 50 ? "#5ab87a" : "#e0605a" }}>{winPct}%</span></div>
        <div><span className="opacity-50">Tempo </span><span style={{ color: "#5a8ade" }}>+{speedPct}%</span></div>
      </div>
      {/* Rest-Karten des laufenden Deck-Durchlaufs (#6) */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="opacity-60">Deck bis zum Mischen</span>
          <span className="opacity-80">{remaining} / {TRICKS_PER_CYCLE}</span>
        </div>
        <Bar value={remaining} max={TRICKS_PER_CYCLE} color="#5a8ade" height={6} />
      </div>
      {/* Geist */}
      {ghost.hasGhost && (
        <div className="text-xs pt-1 border-t flex items-center justify-between" style={{ borderColor: "#26262e" }}>
          <span className="opacity-50">Geist (Rekord {ghost.recordTotal.toLocaleString("de-DE")})</span>
          {ghost.passed ? (
            <span style={{ color: "#8a7de0" }}>⚑ Rekord-Distanz überholt</span>
          ) : ghost.delta != null ? (
            <span style={{ color: ghost.delta >= 0 ? "#5ab87a" : "#e0605a" }}>
              {ghost.delta >= 0 ? "▲ +" : "▼ "}{ghost.delta.toLocaleString("de-DE")} vs. Rekord
            </span>
          ) : (
            <span className="opacity-40">…</span>
          )}
        </div>
      )}
    </div>
  );
}
