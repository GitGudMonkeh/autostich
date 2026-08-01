// Geteilte Panel-Primitive für die Fraktions-Indikatoren (AP3 #206 — „Gerüst zuerst").
// Vereinheitlicht den bisher überall inline wiederholten Panel-Look (#17171c / #26262e) und
// liefert eine kompakte Zähler-Zelle für Sekundär-Akkus (Asche/Schmieden; später Blitz/Eis/Pflanze).

export const PANEL_STYLE = { background: "#17171c", border: "1px solid #26262e" };

// Gerahmtes Indikator-Panel (wie HeatBar/ChargeBar/CrystalBar es tragen).
export function IndicatorPanel({ children, className = "" }) {
  return (
    <div className={`rounded-xl p-3 as-panel ${className}`} style={PANEL_STYLE}>
      {children}
    </div>
  );
}

// Kompakte Zähler-Zelle: Icon + Zahl (+ optionales Label). Für Sekundär-Ressourcen, die als
// simpler hochzählender Wert dargestellt werden (kein Balken). `glow` = weicher Innen-/Icon-Schein.
export function CounterCell({ icon, value, label, color, glow = false, dim = false, title }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" title={title}
      style={{
        background: `${color}14`,
        border: `1px solid ${color}${dim ? "2a" : "55"}`,
        boxShadow: glow && !dim ? `inset 0 0 10px ${color}40` : undefined,
        opacity: dim ? 0.55 : 1,
      }}>
      <span className="leading-none flex items-center"
        style={{ filter: glow && !dim ? `drop-shadow(0 0 4px ${color})` : undefined }}>
        {icon}
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-bold text-sm tabular-nums" style={{ color }}>{value}</span>
        {label && <span className="text-[9px] opacity-55 mt-0.5 whitespace-nowrap">{label}</span>}
      </span>
    </div>
  );
}
