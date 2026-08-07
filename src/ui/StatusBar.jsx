import { fmtScore } from "./format.js";
import { fmtDuration } from "../game/deck.js";

/* Gameplay-Neu-Aufbau (docs/gameplay-redesign.md, Phase 1): die schwebende Kompakt-Leiste — die „Vitalwerte" des Laufs
   in EINER glanzbaren, oben klebenden Zeile, samt Ablauf-Steuerung (Pause/Tempo/Karten). Ersetzt die früheren Kopf-
   Stat-Zellen (Desktop-Header + mobiles Sticky-Panel) und übernimmt Pause/Tempo aus der Controls-Leiste.
   Rein präsentational — Score/Mult/Serie/Fortschritt/Zeit werden fertig berechnet hereingereicht (kein Drift). */

function Pill({ active, onClick, tone = "#8a7de0", title, children }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className="font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
      style={{ background: active ? tone : "#20202a", color: active ? "#141419" : "#c8c8d0",
               border: `1px solid ${active ? tone : "#33333e"}` }}>
      {children}
    </button>
  );
}

function Cell({ label, children, align = "left", big = false, className = "" }) {
  return (
    <div className={`flex flex-col justify-center gap-1 px-3.5 py-2 min-w-0 ${className}`} style={{ textAlign: align }}>
      <span className="text-[10px] uppercase tracking-wide font-bold" style={{ color: "#6d7288" }}>{label}</span>
      <span className="font-pixel-dense leading-none whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ fontVariantNumeric: "tabular-nums", fontSize: big ? 25 : 18 }}>{children}</span>
    </div>
  );
}

export function StatusBar({
  score, ghost = {}, mult, timeStr, paused, winStreak = 0, bestStreak = 0,
  cycle = 0, totalCycles = 1, pos = 0, cycleLen = 1,
  onTogglePause, speedMult = 1, onSpeed, onChronik, deckBack,
}) {
  const fmtMult = (x) => x.toFixed(2).replace(".", ",");
  const cyc = Math.min(cycle + 1, totalCycles);
  return (
    <div className="sticky top-0 z-20 -mx-1">
      <div className="flex items-stretch flex-wrap gap-y-1 rounded-xl overflow-hidden as-panel"
        style={{ background: "#1a1a22f2", border: "1px solid #33333e", backdropFilter: "blur(6px)", boxShadow: "0 8px 20px -8px #000" }}>
        {/* Ablauf-Steuerung: Pause · Tempo · Karten */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ borderRight: "1px solid #26262e" }}>
          {/* Pause/Weiter — dauerhaft in der Layout-Akzentfarbe (Violett) getönt, bei Pause gefüllt. Hebt den meistgenutzten
              Knopf ab, ohne mit dem ablenkenden Orange zu schreien; passt zum violetten Panel-Akzent. */}
          <button type="button" onClick={onTogglePause} title={paused ? "Weiter" : "Pause"}
            className="font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
            style={paused
              ? { background: "#8a7de0", color: "#141419", border: "1px solid #8a7de0" }
              : { background: "#8a7de022", color: "#8a7de0", border: "1px solid #8a7de066" }}>
            {paused ? "▶" : "⏸"}
          </button>
          <Pill active={speedMult === 2} onClick={() => onSpeed(2)} title="Tempo ×2">X2</Pill>
          <Pill active={speedMult === 4} onClick={() => onSpeed(4)} title="Tempo ×4">X4</Pill>
          <Pill active={speedMult === 6} onClick={() => onSpeed(6)} title="Tempo maximal">MAX</Pill>
          {onChronik && (
            <button type="button" onClick={onChronik} title="Kartenübersicht öffnen"
              className="flex items-center gap-1 font-mono text-xs font-bold px-2 py-1.5 rounded-lg transition-all hover:brightness-125 whitespace-nowrap"
              style={{ background: "#20202a", color: "#c8c8d0", border: "1px solid #33333e" }}>
              {deckBack
                ? <img src={deckBack} alt="" draggable="false" className="h-4 w-auto rounded-[2px] object-cover" style={{ border: "1px solid #ffffff22" }} />
                : <span>🎴</span>}
              <span className="hidden sm:inline">Karten</span>
            </button>
          )}
        </div>

        {/* Score = wichtigster Wert. Das Rekord-Delta sitzt OBEN RECHTS neben dem Label (eigene Zeile), damit die große
            Score-Zahl die volle Breite hat und beim Wachsen nicht verrutscht. Mindestbreite hält die Zelle stabil. */}
        <div className="flex flex-col justify-center gap-1 px-3.5 py-2 min-w-0" style={{ minWidth: 150 }}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wide font-bold" style={{ color: "#6d7288" }}>Score</span>
            {ghost.hasGhost && (ghost.passed
              ? <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: "#8a7de0" }}>⚑ Rekord</span>
              : ghost.delta != null
                ? <span className="text-[10px] font-bold whitespace-nowrap tabular-nums" style={{ color: ghost.delta >= 0 ? "#5ab87a" : "#e0605a" }}>{ghost.delta >= 0 ? "▲ +" : "▼ "}{fmtScore(ghost.delta)}</span>
                : null)}
          </div>
          <span className="font-pixel-dense leading-none whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontVariantNumeric: "tabular-nums", fontSize: 25, color: "#d4a63a" }}>{fmtScore(score)}</span>
        </div>
        {/* Mult · Serie · Fortschritt · Zeit — gleichmäßig über die restliche Breite verteilt (gleich breite Zellen). */}
        <div className="flex-1 flex items-stretch" style={{ minWidth: 240 }}>
          <Cell label="Mult" className="flex-1 border-l border-[#26262e]">
            <span className={mult?.shakeClass || ""}>
              <span key={mult?.pulseKey} className="inline-block rounded px-1.5 py-0.5 font-pixel-dense"
                style={{ fontVariantNumeric: "tabular-nums", fontSize: 18,
                         background: mult?.hot ? `${mult.color}22` : "#ffffff0f",
                         color: mult?.hot ? mult.color : "#8a8a92",
                         animation: mult?.pulseKey > 0 ? "as-multpulse 420ms ease-out" : undefined }}>
                ×{fmtMult(mult?.value ?? 1)}
              </span>
            </span>
          </Cell>
          {/* Serie bekommt mehr Grundbreite (flex 1.6) — die Siegesserie kann in den Tausenderbereich gehen; die festen
              Flex-Verhältnisse halten Fortschritt/Zeit dabei an ihrer Position (kein Verrutschen). */}
          <Cell label="Serie" className="flex-[1.6] border-l border-[#26262e]">
            <span style={{ color: winStreak >= 3 ? "#e0605a" : "#e8e8ea" }}>{winStreak > 0 ? `${winStreak}×` : "–"}</span>
            <span className="text-[10px] opacity-45 ml-1">best {bestStreak}</span>
          </Cell>
          <Cell label="Fortschritt" className="flex-1 border-l border-[#26262e]">
            <span>{cyc}<span className="text-[11px] opacity-45">/{totalCycles}</span></span>
            <span className="text-[10px] opacity-45 ml-1.5">K{pos}/{cycleLen}</span>
          </Cell>
          <Cell label="Zeit" className="flex-1 border-l border-[#26262e]"><span>{timeStr}{paused ? " ⏸" : ""}</span></Cell>
        </div>
      </div>
    </div>
  );
}
