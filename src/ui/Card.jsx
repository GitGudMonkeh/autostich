import { suitColor, suitName } from "../game/constants.js";

/* Eine Karte. Die große Zahl = effektiver Kampfwert dieses Stichs (= value + stichBonus),
   damit sie immer zum Stich-Ausgang passt.
     value      = dauerhafter Kartenwert (inkl. Kat.-A-Mods)
     baseRank   = Ursprungswert → dauerhafter Boost = value − baseRank (violett „+X")
     stichBonus = temporärer Bonus dieses Stichs (Kat.-B-Perks, rot) */
export function Card({ suit, value, baseRank = null, stichBonus = 0, dim = false, glow = null, ionStacks = 0 }) {
  const color = suitColor(suit);
  const permBoost = baseRank != null ? value - baseRank : 0;
  const effective = value + stichBonus;
  // Ionisierung (Stufe B): dezenter hellblauer Ring, wenn gerade kein Gewinn-/Verlust-Glow aktiv ist.
  const ionGlow = ionStacks > 0 ? `0 0 0 1.5px #5ec8f055, 0 0 11px #5ec8f033` : null;
  return (
    <div
      className="as-card relative rounded-xl border-2 flex flex-col items-center justify-center select-none transition-all"
      style={{
        borderColor: color,
        width: 104, height: 144, background: "#1c1c22",
        opacity: dim ? 0.35 : 1,
        boxShadow: glow ? `0 0 0 3.45px ${glow}66, 0 0 25.3px ${glow}55` : (ionGlow || "none"), // +15% (#Gewinn-/Verlust-Glow)
      }}
    >
      <div className="absolute top-1.5 left-2 text-[10px] uppercase tracking-wide" style={{ color }}>
        {suitName(suit)}
      </div>
      {permBoost > 0 && (
        <div className="absolute top-1.5 right-2 text-[11px] font-bold px-1 rounded"
          style={{ color: "#8a7de0", background: "#8a7de022" }}
          title={`Dauerhaft +${permBoost} (Basis ${baseRank})`}>
          +{permBoost}
        </div>
      )}
      <div className="text-5xl font-bold card-num" style={{ color }}>{effective}</div>
      {/* Ionisierung (Stufe B): Blitze in der freien unteren linken Ecke, Anzahl = Stapel (max 4). */}
      {ionStacks > 0 && (
        <div className="absolute bottom-1 left-1.5 leading-none tracking-tighter text-[9px]"
          style={{ color: "#5ec8f0", textShadow: "0 0 4px #5ec8f0" }}
          title={`Ionisiert ${ionStacks}/4 — +${ionStacks * 25} Score bei Sieg`}>
          {"⚡".repeat(ionStacks)}
        </div>
      )}
      <div className="absolute bottom-1.5 flex flex-col items-center leading-tight text-[10px]">
        {permBoost > 0 && <span className="opacity-55">Basis {baseRank}</span>}
        {stichBonus > 0 && <span style={{ color: "#e0605a" }}>⚔ +{stichBonus} Stich</span>}
      </div>
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
