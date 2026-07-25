/* Musik-Panel (#111) — ganz unten im Run: aktueller Track-Titel + „nächster Track". */
export function MusicBar({ title, onNext }) {
  return (
    <div className="rounded-xl p-3 flex items-center justify-between gap-3 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base" aria-hidden>🎵</span>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide opacity-50">Musik</div>
          <div className="text-sm font-bold truncate">{title || "—"}</div>
        </div>
      </div>
      <button onClick={onNext}
        className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold transition-all hover:brightness-110"
        style={{ background: "#20202a", border: "1px solid #3a3a46" }}>
        Nächster Track ⏭
      </button>
    </div>
  );
}
