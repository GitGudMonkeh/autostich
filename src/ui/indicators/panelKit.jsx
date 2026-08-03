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

// #270.2 Ertrag-Meter: der Eigen-Score eines Archetyps, aufgeschlüsselt nach seinen NAMENTLICHEN Fantasien (Kanälen).
// „Auf einen Blick, wie mein Motor läuft": ein gestapelter Anteils-Balken zeigt, WELCHE Fantasie gerade trägt, die
// Summe die Größenordnung. NUR aktive Kanäle (value > 0) erscheinen — leere Fantasien bleiben aus (kein überfülltes
// Panel). Gibt null zurück, solange der Archetyp noch nichts eingespielt hat. `channels`: [{ label, value, color }].
const nfmt = (n) => Math.round(n).toLocaleString("de-DE");
export function YieldMeter({ title, channels = [], accent = "#e8e8ea" }) {
  const active = channels.filter((c) => c.value > 0);
  const total = active.reduce((t, c) => t + c.value, 0);
  if (total <= 0) return null;
  const single = active.length === 1;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs mb-1.5">
        <span className="opacity-60">{title}</span>
        <span className="font-bold tabular-nums" style={{ color: accent }}>~{nfmt(total)}</span>
      </div>
      {/* Gestapelter Anteils-Balken — Segmentbreite = Anteil des Kanals am Eigen-Score (nur bei ≥2 Kanälen aussagekräftig). */}
      {!single && (
        <div className="flex w-full rounded-sm overflow-hidden" style={{ height: 10, background: "#26262e" }}>
          {active.map((c) => (
            <div key={c.label} title={`${c.label}: ${nfmt(c.value)} (${Math.round((100 * c.value) / total)} %)`}
              style={{ width: `${(100 * c.value) / total}%`, background: c.color }} />
          ))}
        </div>
      )}
      {/* Legende: nur aktive Kanäle, Punkt + Name + Zahl. */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px]">
        {active.map((c) => (
          <span key={c.label} className="inline-flex items-center gap-1">
            <span className="w-[8px] h-[8px] rounded-[2px] shrink-0" style={{ background: c.color }} />
            <span className="opacity-65">{c.label}</span>
            <b className="tabular-nums" style={{ color: c.color }}>{nfmt(c.value)}</b>
          </span>
        ))}
      </div>
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
