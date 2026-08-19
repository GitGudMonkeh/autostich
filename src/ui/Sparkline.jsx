import { GHOST_STEP } from "../game/constants.js"; // x-Achse: ein Stützpunkt je GHOST_STEP Stiche
import { fmtScoreShort } from "./format.js";
import { t, fmtNum } from "../i18n/index.js"; // #sprache

/* Geteilter Score-Verlauf-Graph (#30): aktueller Lauf (gold) vs. Rekord/Geist (violett).
   x = Stich-Index (Geist-Stützstellen, Zeit-Proxy), y = kumulativer Score (auto-skaliert auf
   das Max BEIDER Linien, x auf die LÄNGERE Reihe → funktioniert auch, wenn der Lauf über dem
   Rekord liegt). Kompakt in der StatusRail, größer im GameOver (#35) — height parametrisiert.

   #graph-achsen: `axes` schaltet die ausführliche Fassung ein (Gitter, beschriftete y-Achse in Score,
   x-Achse in Stichen). Zwei Dinge unterscheiden sie technisch von der kompakten Linie, und beide sind
   der Grund, warum es EIN Schalter und keine zweite Komponente ist:

   · **`preserveAspectRatio` muss weg.** Die kompakte Linie zieht sich mit `none` auf jede Kachelgröße —
     bei Beschriftung verzerrt das die Buchstaben mit (x und y skalieren unabhängig). Die Achsen-Fassung
     rechnet deshalb in einem festen Seitenverhältnis und skaliert gleichmäßig.
   · **Der Rand wird gebraucht.** Ohne Achsen genügen 3 px; mit Beschriftung braucht es links Platz für
     die Score-Werte und unten für die Stichzahlen. */
export function Sparkline({ current = [], record = [], height = 40, axes = false }) {
  const W = axes ? 620 : 300;
  const H = axes ? 250 : height;
  const padL = axes ? 56 : 3, padR = axes ? 10 : 3, padT = axes ? 10 : 3, padB = axes ? 38 : 3;
  const maxLen = Math.max(current.length, record.length);
  const maxVal = Math.max(1, ...current, ...record);
  const x = (i) => padL + (maxLen > 1 ? (i / (maxLen - 1)) * (W - padL - padR) : (W - padL - padR) / 2 + padL);
  const y = (v) => H - padB - (v / maxVal) * (H - padT - padB);
  const path = (arr) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  if (current.length < 2 && record.length < 2) {
    return <div className="text-[10px] opacity-35 py-2 text-center">{t("sparkline.empty")}</div>;
  }
  /* Waagerechte Marken auf RUNDEN Werten (1 · 2 · 5 × 10^k), nicht auf Dritteln des Maximums: „754.978"
     als Achsenwert liest niemand, „500.000" schon. Der Schritt ist die nächstgrößere runde Zahl unter
     einem Drittel — das ergibt drei bis fünf Marken, egal wie hoch der Lauf ausgeht. */
  const niceStep = (v) => {
    const e = 10 ** Math.floor(Math.log10(Math.max(1, v))), f = v / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
  };
  const yTicks = [];
  if (axes) { const st = niceStep(maxVal / 3); for (let v = 0; v <= maxVal * 1.0001; v += st) yTicks.push(v); }
  const xTicks = axes ? [0, Math.floor((maxLen - 1) / 2), maxLen - 1] : [];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      style={axes ? { height: "auto" } : { height: H }}
      preserveAspectRatio={axes ? "xMidYMid meet" : "none"}>
      {axes && yTicks.map((v, i) => (
        <g key={`y${i}`}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#ffffff" strokeOpacity={i === 0 ? 0.18 : 0.07} strokeWidth="1" />
          <text x={padL - 8} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="#8a8a95">{fmtScoreShort(v)}</text>
        </g>
      ))}
      {axes && xTicks.map((i) => (
        <text key={`x${i}`} x={x(i)} y={H - 21} textAnchor={i === 0 ? "start" : i === maxLen - 1 ? "end" : "middle"}
          fontSize="10" fill="#8a8a95">{fmtNum((i + 1) * GHOST_STEP)}</text>
      ))}
      {record.length >= 2 && <path d={path(record)} fill="none" stroke="#8a7de0" strokeWidth="1.5" strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />}
      {current.length >= 2 && <path d={path(current)} fill="none" stroke="#d4a63a" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />}
      {/* Achsenbeschriftung: die y-Werte sind Score, die x-Werte Stiche — ohne die Angabe sind es nur Zahlen. */}
      {axes && <text x={(W + padL) / 2} y={H - 4} textAnchor="middle" fontSize="9.5"
        letterSpacing="0.08em" fill="#5f5f70">{t("sparkline.axis.x")}</text>}
      {axes && <text x={13} y={(H - padB + padT) / 2} textAnchor="middle" fontSize="9.5"
        letterSpacing="0.08em" fill="#5f5f70" transform={`rotate(-90 13 ${(H - padB + padT) / 2})`}>{t("sparkline.axis.y")}</text>}
    </svg>
  );
}
