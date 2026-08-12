/* #322/#gott Geteilte Synthwave-Chrome-Wortmarke — EINE Wahrheit für die epischen Groß-Ansagen (GOTTGLEICH/Lawine/
   Gönn dir) In-Game UND die Gottgleich-Prunk-Vorschau im Shop. Chrome-Verlauf (Weiß → Akzent oben → dunkle Horizont-
   linie → Weiß → Akzent unten), Neon-Glow (drop-shadow im Akzent) und ein Sheen-Sweep über die Buchstaben. `color`
   null = GOTTGLEICH-Zweiton (Cyan→Magenta); mit Farbe (z. B. „Gönn dir" Gold) erben alle Stops diese Farbe.

   Positionierung/Einflug-Animation kommen vom Aufrufer über `style` (In-Game: as-bigscore-Pop; Showcase: statisch).
   `sheen`: "once" = einmaliger Sweep (In-Game-Event), "loop" = endlos (Shop-Vorschau), "off" = kein Sweep (reduced). */
export function GottChromeWord({ text, color = null, gBig = 32, gMid = 12, reduced = false, sheen = "once", idKey = "x", className = "", style = {} }) {
  const accTop = color || "#8fe0ff", accBot = color || "#ff5db1", glowC = color || "#ff3da1";
  const gid = `gc-${idKey}`, mid = `gm-${idKey}`;
  const T = String(text || "").toUpperCase();
  return (
    <svg aria-hidden="true" className={`pointer-events-none absolute ${className}`} viewBox="0 0 1000 210" preserveAspectRatio="xMidYMid meet"
      style={{ filter: `drop-shadow(0 0 ${gBig}px ${glowC}) drop-shadow(0 0 ${gMid}px ${glowC}) drop-shadow(0 3px 8px rgba(0,0,0,0.6))`, ...style }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.42" stopColor={accTop} />
          <stop offset="0.5" stopColor="#20103a" />
          <stop offset="0.58" stopColor="#ffffff" />
          <stop offset="1" stopColor={accBot} />
        </linearGradient>
        <mask id={mid}>
          <text x="500" y="170" textAnchor="middle" textLength="984" lengthAdjust="spacingAndGlyphs"
            style={{ fontSize: "200px", fontWeight: 900, fill: "#fff", fontStyle: "italic", letterSpacing: "2px" }}>{T}</text>
        </mask>
      </defs>
      <text x="500" y="170" textAnchor="middle" textLength="984" lengthAdjust="spacingAndGlyphs"
        style={{ fontSize: "200px", fontWeight: 900, fill: `url(#${gid})`, stroke: "#0a0820", strokeWidth: "3px", paintOrder: "stroke", fontStyle: "italic", letterSpacing: "2px" }}>{T}</text>
      {sheen !== "off" && !reduced && (
        <g mask={`url(#${mid})`}>
          <rect x="-260" y="0" width="200" height="210" fill="#ffffff" opacity="0.5">
            {sheen === "loop"
              ? <animate attributeName="x" values="-260;1000" dur="2.4s" begin="0.3s" repeatCount="indefinite" />
              : <animate attributeName="x" from="-260" to="1000" dur="0.95s" begin="0.12s" fill="freeze" />}
          </rect>
        </g>
      )}
    </svg>
  );
}
