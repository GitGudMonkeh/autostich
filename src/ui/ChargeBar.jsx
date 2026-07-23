// ⚡ Ladung (Blitz-Archetyp) — eigener Block zwischen Battlefield und Build-Panel.
// Lädt in maxCharge Segmenten (Stufe A: 10), hellblau. Nur sichtbar, sobald ein
// Blitz-Skill aktiv ist (docs/blitz-archetyp.md, Abschnitt 1).
const LIGHT_BLUE = "#5ec8f0";

export function ChargeBar({ lightning }) {
  if (!lightning || !lightning.active) return null;
  const { charge, maxCharge } = lightning;
  const full = charge >= maxCharge;
  return (
    <div className="rounded-xl p-3 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="opacity-60">⚡ Ladung{full && <span style={{ color: LIGHT_BLUE }}> · VOLL GELADEN</span>}</span>
        <span className="font-bold" style={{ color: LIGHT_BLUE }}>{charge} / {maxCharge}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: maxCharge }, (_, i) => {
          const on = i < charge;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all"
              style={{
                height: 12,
                background: on ? LIGHT_BLUE : "#26262e",
                boxShadow: on && full ? `0 0 7px ${LIGHT_BLUE}` : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
