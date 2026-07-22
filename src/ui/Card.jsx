import { suitColor, suitName } from "../game/constants.js";

/* Eine Karte. `value` = effektiver Kampfwert dieses Stichs (kann Boni enthalten);
   `base` = Kartenwert ohne Stich-Boni (klein eingeblendet, wenn abweichend). */
export function Card({ suit, value, base, dim = false, glow = null }) {
  const color = suitColor(suit);
  return (
    <div
      className="relative rounded-xl border-2 flex flex-col items-center justify-center select-none transition-all"
      style={{
        borderColor: color,
        width: 104, height: 144, background: "#1c1c22",
        opacity: dim ? 0.35 : 1,
        boxShadow: glow ? `0 0 0 3px ${glow}66, 0 0 22px ${glow}55` : "none",
      }}
    >
      <div className="absolute top-1.5 left-2 text-[10px] uppercase tracking-wide" style={{ color }}>
        {suitName(suit)}
      </div>
      <div className="text-5xl font-bold" style={{ color }}>{value}</div>
      {base != null && base !== value && (
        <div className="absolute bottom-1.5 text-[11px] opacity-55">
          Basis {base} · <span style={{ color }}>+{value - base}</span>
        </div>
      )}
    </div>
  );
}

export function CardBack({ label = "?" }) {
  return (
    <div
      className="rounded-xl border-2 border-dashed flex items-center justify-center text-2xl opacity-40"
      style={{ width: 104, height: 144, borderColor: "#3a3a44", background: "#17171c" }}
    >
      {label}
    </div>
  );
}
