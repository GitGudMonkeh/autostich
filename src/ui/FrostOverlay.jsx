/* #136 Eis-Schimmer: Frost-Layer über einer eingefrorenen Karte. Rein kosmetisch, liegt als eigener
   absoluter Layer über der Karte → konfliktfrei mit Ion-Rahmen und Gewinn-/Verlust-Glow (das sind box-shadows
   der Karte selbst). Bausteine:
   - Tint: halbtransparenter, kühler Eisfilm + Innenglanz.
   - Raureif-Körnung: feine eisfarbene Turbulenz (SVG feTurbulence), screen-geblendet, sehr dezent.
   - Sweep-Shine: schmaler, schräger Glanzstreif, der langsam über die Karte wandert (nur `animated`).

   Kontext-Regel (#136): `animated` NUR auf der aktiven Battlefield-Karte einschalten. Das Aufstellungs-Board
   (bis zu 40 eingefrorene Karten gleichzeitig) rendert ohne Sweep = ruhige „Frostglas"-Variante, sonst würden
   40 gleichzeitige Sweeps flackern. `prefers-reduced-motion` schaltet den Sweep global ab (index.css). */
export function FrostOverlay({ animated = false, radius = "0.75rem" }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: radius }} aria-hidden="true">
      {/* Tint — kühler Eisfilm + Innenglanz */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(160deg, rgba(190,232,250,0.22), rgba(120,190,225,0.10) 55%, rgba(210,244,255,0.18))",
        boxShadow: "inset 0 0 18px rgba(159,220,240,0.50), inset 0 2px 9px rgba(255,255,255,0.16)",
      }} />
      {/* Raureif-Körnung */}
      <div className="absolute inset-0 as-frost-grain" style={{ mixBlendMode: "screen", opacity: 0.14 }} />
      {/* Sweep-Shine — nur aktive Karte */}
      {animated && <div className="absolute inset-0 as-frost-sweep" style={{ mixBlendMode: "screen" }} />}
    </div>
  );
}
