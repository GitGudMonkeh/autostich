function Btn({ active, onClick, disabled, children, tone = "#5a8ade" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        background: active ? tone : "#20202a",
        color: active ? "#141419" : "#e8e8ea",
        border: `1px solid ${active ? tone : "#30303a"}`,
      }}
    >
      {children}
    </button>
  );
}

/* Ablauf-Steuerung. Das Spiel läuft immer automatisch — nur Pause hält an (#29). */
export function Controls({ paused, onTogglePause, speedMult, onSpeed, onRestart, onAbort, onOptions }) {
  return (
    <div className="rounded-xl p-3 flex flex-wrap items-center gap-2 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <Btn active={paused} onClick={onTogglePause} tone="#d4a63a">
        {paused ? "▶ Weiter" : "⏸ Pause"}
      </Btn>

      <span className="text-xs opacity-50 ml-1">Tempo</span>
      <Btn active={speedMult === 2} onClick={() => onSpeed(2)} tone="#8a7de0">2×</Btn>
      <Btn active={speedMult === 3} onClick={() => onSpeed(3)} tone="#8a7de0">3×</Btn>

      <div className="flex-1" />
      {onOptions && <Btn onClick={onOptions} tone="#8a7de0" aria-label="Optionen">⚙ Optionen</Btn>}
      {onAbort && <Btn onClick={onAbort} tone="#8a8a92">Beenden</Btn>}
      <Btn onClick={onRestart} tone="#e0605a">Neustart</Btn>
    </div>
  );
}
