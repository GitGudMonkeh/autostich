import { MuteButton } from "./MuteButton.jsx";

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

/* Sekundär-Steuerung (Gameplay-Neu-Aufbau): Pause & Tempo sind in die schwebende StatusBar gewandert; hier bleiben
   die selteneren Aktionen als eigene, gleichmäßig über die Breite verteilte Reihe: Optionen · Neustart · Beenden · Ton. */
export function Controls({ onRestart, onAbort, onOptions, muted, onToggleMute }) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      {onOptions && <Btn onClick={onOptions} tone="#8a7de0" aria-label="Optionen">⚙ Optionen</Btn>}
      <Btn onClick={onRestart} tone="#8a7de0">Neustart</Btn>
      {onAbort && <Btn onClick={onAbort} tone="#8a7de0">Beenden</Btn>}
      {onToggleMute && <MuteButton muted={muted} onToggle={onToggleMute} />}
    </div>
  );
}
