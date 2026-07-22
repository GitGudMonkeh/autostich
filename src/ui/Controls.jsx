const TEMPO_LABELS = { slow: "Langsam", normal: "Normal", fast: "Schnell" };

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

export function Controls({ auto, onToggleAuto, tempo, onTempo, onNext, onRestart, canNext }) {
  return (
    <div className="rounded-xl p-3 flex flex-wrap items-center gap-2" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <Btn active={auto} onClick={onToggleAuto} tone="#5ab87a">
        {auto ? "▶ Auto an" : "⏸ Auto aus"}
      </Btn>

      <div className="w-px h-6 mx-1" style={{ background: "#30303a" }} />

      <span className="text-xs opacity-50 mr-1">Tempo</span>
      {Object.keys(TEMPO_LABELS).map((k) => (
        <Btn key={k} active={tempo === k} onClick={() => onTempo(k)}>{TEMPO_LABELS[k]}</Btn>
      ))}

      <div className="w-px h-6 mx-1" style={{ background: "#30303a" }} />

      <Btn onClick={onNext} disabled={!canNext || auto} tone="#d4a63a">Nächster Stich</Btn>

      <div className="flex-1" />
      <Btn onClick={onRestart} tone="#e0605a">Neustart</Btn>
    </div>
  );
}
