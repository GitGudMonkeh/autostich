/* Dekoratives Karten-Logo (#45): zwei überlappende, leicht gefächerte Karten im Stil unserer
   echten Spielkarten (Farbe + Wert — keine K/Q/Pips), mit Neon-Glow. Unter dem CRT-Skin (#41)
   verstärkt sich der Glow via [data-skin="crt"] .as-logo-card in index.css.
   Rein dekorativ: aria-hidden, nicht interaktiv, statisch (keine Animation → reduced-motion-neutral). */
function MiniCard({ suit, value, color, style }) {
  return (
    <div
      className="as-logo-card absolute rounded-lg border-2 flex items-center justify-center"
      style={{
        width: 68, height: 96, background: "#1c1c22", borderColor: color,
        // im Default dezent, tasteful; die Vars steuern die verstärkte CRT-Variante.
        "--glow-ring": `${color}88`, "--glow-halo": `${color}55`,
        boxShadow: `0 0 0 1.5px ${color}66, 0 0 14px ${color}44`,
        ...style,
      }}
    >
      <span className="absolute top-1 left-1.5 text-[8px] uppercase tracking-wide" style={{ color }}>{suit}</span>
      <span className="text-3xl font-bold card-num" style={{ color }}>{value}</span>
    </div>
  );
}

export function CardLogo() {
  return (
    <div aria-hidden="true" className="relative pointer-events-none select-none" style={{ width: 132, height: 104 }}>
      {/* hintere Karte (grün), nach links gefächert */}
      <MiniCard suit="Grün" value={9} color="#5ab87a" style={{ left: 6, top: 6, transform: "rotate(-9deg)" }} />
      {/* vordere Karte (rot), nach rechts gefächert, teils über der hinteren */}
      <MiniCard suit="Rot" value={7} color="#e0605a" style={{ left: 58, top: 2, transform: "rotate(9deg)" }} />
    </div>
  );
}
