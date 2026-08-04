// Mini-Form-Icon: zeichnet die Basis-Lage der Gebäude-Form (Polyomino) als winziges SVG-Raster in der Kategorie-Farbe.
// Damit sieht man in jedem Panel (Chronik, Abriss, Angebot …) sofort, WELCHES Gebäude gemeint ist — Form + Farbe.
import { shapeRotations } from "../game/architect.js";

export default function FormIcon({ form, color = "#8a8a92", cell = 3, gap = 1, title }) {
  const cells = (shapeRotations(form) || [])[0] || [];
  if (!cells.length) return null;
  const maxR = Math.max(...cells.map((c) => c[0]));
  const maxC = Math.max(...cells.map((c) => c[1]));
  const w = (maxC + 1) * cell + maxC * gap;
  const h = (maxR + 1) * cell + maxR * gap;
  const step = cell + gap;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title || `Form ${form}`}
      style={{ display: "inline-block", verticalAlign: "middle", flex: "none" }}>
      {title && <title>{title}</title>}
      {cells.map(([r, c], i) => (
        <rect key={i} x={c * step} y={r * step} width={cell} height={cell} rx={0.7} fill={color} />
      ))}
    </svg>
  );
}
