/* Geteilter Score-Verlauf-Graph (#30): aktueller Lauf (gold) vs. Rekord/Geist (violett).
   x = Stich-Index (Geist-Stützstellen, Zeit-Proxy), y = kumulativer Score (auto-skaliert auf
   das Max BEIDER Linien, x auf die LÄNGERE Reihe → funktioniert auch, wenn der Lauf über dem
   Rekord liegt). Kompakt in der StatusRail, größer im GameOver (#35) — height parametrisiert. */
export function Sparkline({ current = [], record = [], height = 40 }) {
  const W = 300, H = height, pad = 3;
  const maxLen = Math.max(current.length, record.length);
  const maxVal = Math.max(1, ...current, ...record);
  const x = (i) => pad + (maxLen > 1 ? (i / (maxLen - 1)) * (W - 2 * pad) : W / 2);
  const y = (v) => H - pad - (v / maxVal) * (H - 2 * pad);
  const path = (arr) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  if (current.length < 2 && record.length < 2) {
    return <div className="text-[10px] opacity-35 py-2 text-center">Verlauf erscheint nach den ersten Stichen…</div>;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
      {record.length >= 2 && <path d={path(record)} fill="none" stroke="#8a7de0" strokeWidth="1.5" strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />}
      {current.length >= 2 && <path d={path(current)} fill="none" stroke="#d4a63a" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
