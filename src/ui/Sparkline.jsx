import { useId } from "react";
import { GHOST_STEP } from "../game/constants.js"; // x-Achse: ein Stützpunkt je GHOST_STEP Stiche
import { fmtScoreShort } from "./format.js";
import { t, fmtNum } from "../i18n/index.js"; // #sprache

/* Geteilter Score-Verlauf-Graph (#30): aktueller Lauf (gold) vs. Rekord/Geist (violett).
   x = Stich-Index (Geist-Stützstellen, Zeit-Proxy), y = kumulativer Score (auto-skaliert auf
   das Max BEIDER Linien, x auf die LÄNGERE Reihe → funktioniert auch, wenn der Lauf über dem
   Rekord liegt). Kompakt in der StatusRail, größer im GameOver (#35) — height parametrisiert.

   #graph-achsen: `axes` hat DREI Stufen, nicht zwei — eine Komponente, damit keine zweite Fassung
   danebenläuft:
     `false`    kompakte Linie (StatusRail).
     `true`     ausführlich: Gitter, beschriftete y-Achse in Score, x-Achse in Stichen (Victory-Screen
                und Lauf-Details ab 1400 px).
     `"knapp"`  nur die Höhenmarken: waagerechte Linien auf runden Werten, ihre Zahlen daneben, KEINE
                x-Beschriftung (Statistik-Trend).

   #graph-knapp (19.08.2026): Der Trend in der Statistik zeigt die letzten Läufe — seine x-Achse zählt
   also LÄUFE, nicht Stiche. Die ausführliche Fassung hier einzuschalten hieße, sie mit „Stiche" zu
   beschriften und damit etwas Falsches zu behaupten; deshalb beschriftet `"knapp"` nur die Höhe. Das
   ist zugleich das, was dort fehlte: ohne einen einzigen Zahlenwert sagt eine steigende Linie nur
   „irgendwie mehr".

   **Die Zahlen der knappen Fassung sind HTML, kein `<text>`** — und das ist der Grund, warum sie
   überhaupt eine eigene Stufe ist: die kompakte Linie streckt sich mit `preserveAspectRatio="none"` auf
   jede Kachelbreite, ein `<text>` darin würde mitverzerrt (genau die Falle, wegen der die ausführliche
   Fassung ihr festes Seitenverhältnis hat). Waagerechte LINIEN verzerren nicht, die bleiben im SVG.
   Weil die Zeichenfläche über `viewBox="0 0 300 H"` und die feste Höhe H 1 : 1 auf Pixel abbildet,
   sitzen die HTML-Marken exakt auf ihren Linien.

   Zwei Dinge unterscheiden die ausführliche Fassung technisch von der kompakten Linie, und beide sind
   der Grund, warum es EIN Schalter und keine zweite Komponente ist:

   · **`preserveAspectRatio` muss weg.** Die kompakte Linie zieht sich mit `none` auf jede Kachelgröße —
     bei Beschriftung verzerrt das die Buchstaben mit (x und y skalieren unabhängig). Die Achsen-Fassung
     rechnet deshalb in einem festen Seitenverhältnis und skaliert gleichmäßig.
   · **Der Rand wird gebraucht.** Ohne Achsen genügen 3 px; mit Beschriftung braucht es links Platz für
     die Score-Werte und unten für die Stichzahlen. */
/* Breite der Zahlenspalte der knappen Fassung (CSS-Pixel, rechtsbündig). Das Stylesheet kennt sie
   nicht — sie steht als Polster am SVG UND als Breite der Marken, damit beide nicht auseinanderlaufen. */
const KNAPP_LAB = 46;

export function Sparkline({ current = [], record = [], height = 40, axes = false, vh = 0 }) {
  /* Eigene Verlaufs-Kennung je Instanz. Der Endscreen und die Lauf-Details koennen gleichzeitig im DOM
     stehen (die Bestenliste laesst sich aus dem Endscreen oeffnen), und zwei gleich benannte <defs> im
     selben Dokument sind eine Falle: heute sind beide Verlaeufe identisch, also faellt nichts auf —
     sobald einer von ihnen die Deckfarbe zieht, gewinnt still der erste im DOM. */
  const gid = `sl-run-${useId().replace(/:/g, "")}`;
  const voll = axes === true;
  const knapp = axes === "knapp";
  const W = voll ? 620 : 300;
  /* #graph-fuellt: Die Zeichenflaeche der ausfuehrlichen Fassung ist nicht mehr fest 250 hoch. Sie
     skaliert mit `width: 100%` und festem Seitenverhaeltnis — in einem Panel, das hoeher ist als das, was
     die Breite hergibt, blieb darunter Luft stehen (im Spiel gemessen: ueber 200 px unter der Kurve).
     Der AUFRUFER misst seinen freien Platz und reicht die passende viewBox-Hoehe durch (`vh`); ohne
     Angabe bleibt es bei 250, also bei genau dem Bild wie vorher. Gedeckelt, damit ein Messfehler oder
     ein extremes Fenster keine absurden Seitenverhaeltnisse erzeugt. */
  const H = voll ? Math.min(900, Math.max(180, Math.round(vh) || 250)) : height;
  const padL = voll ? 76 : 3, padR = voll ? 10 : 3, padT = voll ? 10 : 3, padB = voll ? 38 : 3;
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
  // Drei bis fünf Marken in der ausführlichen Fassung, zwei bis drei in der knappen — sie ist nur
  // 70 px hoch, dort stünden vier Linien als Schraffur.
  if (voll || knapp) { const st = niceStep(maxVal / (voll ? 3 : 2)); for (let v = 0; v <= maxVal * 1.0001; v += st) yTicks.push(v); }
  const xTicks = voll ? [0, Math.floor((maxLen - 1) / 2), maxLen - 1] : [];
  const graph = (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      style={voll ? { height: "auto" } : { height: H, paddingLeft: knapp ? KNAPP_LAB : undefined }}
      preserveAspectRatio={voll ? "xMidYMid meet" : "none"}>
      {/* #graph-gold (19.08.2026) — die AUSFÜHRLICHE Fassung bekommt Fläche, Grundton und Endpunkt.
          Sie steht auf dem Siegesbildschirm in einer rund 500 px breiten Spalte; dort waren zwei
          1,75-px-Linien auf weißem Gitter das Dünnste im ganzen Screen. Die KOMPAKTE Linie (Kachel,
          StatusRail, Handy) bleibt Zeichen für Zeichen, wie sie war — sie ist 40 px hoch und würde von
          einer Fläche zugedeckt. Deshalb hängt jeder Zusatz unten an `voll`. */}
      {voll && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4a63a" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#d4a63a" stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {(voll || knapp) && yTicks.map((v, i) => (
        <g key={`y${i}`}>
          {/* Das Gitter der ausführlichen Fassung zieht die Haarlinie des Hauses (dieselbe wie an jeder
              Kachel, #st-ruhe). Weiß war hier die EINZIGE Stelle im Screen, die Weiß benutzt — und die
              oberste Linie stand mit 18 % kräftiger da als die Rekord-Kurve daneben. */}
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} strokeWidth="1"
            stroke={voll ? "rgba(150, 150, 170, .12)" : "#ffffff"}
            strokeOpacity={voll ? 1 : (i === 0 ? 0.18 : 0.07)} />
          {voll && <text x={padL - 10} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="#8a8a95">{fmtScoreShort(v)}</text>}
        </g>
      ))}
      {voll && xTicks.map((i) => (
        <text key={`x${i}`} x={x(i)} y={H - 21} textAnchor={i === 0 ? "start" : i === maxLen - 1 ? "end" : "middle"}
          fontSize="10" fill="#8a8a95">{fmtNum((i + 1) * GHOST_STEP)}</text>
      ))}
      {/* Die FLÄCHE unter der Lauf-Kurve — sie trägt die Linie über die Breite, ohne sie zu verdicken.
          Nur der LAUF bekommt sie, nicht der Rekord: zwei Flächen übereinander wären Matsch, und der
          Rekord ist ausdrücklich der leisere der beiden (55 % Deckkraft seit jeher). */}
      {voll && current.length >= 2 && (
        <path d={`${path(current)} L${x(current.length - 1).toFixed(1)},${(H - padB).toFixed(1)} L${x(0).toFixed(1)},${(H - padB).toFixed(1)} Z`}
          fill={`url(#${gid})`} stroke="none" />
      )}
      {record.length >= 2 && <path d={path(record)} fill="none" stroke="#8a7de0" strokeWidth="1.5" strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />}
      {current.length >= 2 && <path d={path(current)} fill="none" stroke="#d4a63a" strokeWidth={voll ? "2.25" : "1.75"} strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      {/* Der ENDPUNKT ist die Aussage des Graphen — dort steht der Lauf. Ohne Marke muss man ihn an der
          Achse ablesen; mit Punkt und Halo ist er das, worauf das Auge zuerst landet. */}
      {voll && current.length >= 2 && (
        <g>
          <circle cx={x(current.length - 1)} cy={y(current[current.length - 1])} r="8.5" fill="none" stroke="#d4a63a" strokeWidth="1" opacity="0.38" />
          <circle cx={x(current.length - 1)} cy={y(current[current.length - 1])} r="4" fill="#d4a63a" />
        </g>
      )}
      {/* Achsenbeschriftung: die y-Werte sind Score, die x-Werte Stiche — ohne die Angabe sind es nur Zahlen. */}
      {voll && <text x={(W + padL) / 2} y={H - 4} textAnchor="middle" fontSize="9.5"
        letterSpacing="0.08em" fill="#5f5f70">{t("sparkline.axis.x")}</text>}
      {voll && <text x={11} y={(H - padB + padT) / 2} textAnchor="middle" fontSize="9.5"
        letterSpacing="0.08em" fill="#5f5f70" transform={`rotate(-90 11 ${(H - padB + padT) / 2})`}>{t("sparkline.axis.y")}</text>}
    </svg>
  );
  if (!knapp) return graph;
  /* Die Marken liegen ÜBER der Zeichenfläche, nicht daneben in einer eigenen Spalte: so bleibt der
     Graph selbst unverändert (dieselbe gestreckte Linie wie in der StatusRail) und die Höhe der Kachel
     ändert sich nicht. `y(v)` rechnet in denselben Einheiten wie die feste Pixelhöhe. */
  return (
    <div className="relative" style={{ height: H }}>
      {yTicks.map((v, i) => (
        <span key={`k${i}`} className="absolute text-[9px] tabular-nums pointer-events-none"
          style={{ left: 0, width: KNAPP_LAB - 6, textAlign: "right",
            top: Math.max(0, Math.min(H - 11, y(v) - 5.5)), color: "#65656f" }}>{fmtScoreShort(v)}</span>
      ))}
      {graph}
    </div>
  );
}
