import { useLayoutEffect, useRef, useState } from "react";

/* #322/#gott Geteilte Synthwave-Chrome-Wortmarke — EINE Wahrheit für die epischen Groß-Ansagen (GOTTGLEICH/Lawine/
   Gönn dir) In-Game UND die Gottgleich-Prunk-Vorschau im Shop. Chrome-Verlauf (Weiß → Akzent oben → dunkle Horizont-
   linie → Weiß → Akzent unten), Neon-Glow (drop-shadow im Akzent) und ein Sheen-Sweep über die Buchstaben. `color`
   null = GOTTGLEICH-Zweiton (Cyan→Magenta); mit Farbe (z. B. „Gönn dir" Gold) erben alle Stops diese Farbe.

   Positionierung/Einflug-Animation kommen vom Aufrufer über `style` (In-Game: as-bigscore-Pop; Showcase: statisch).
   `sheen`: "once" = einmaliger Sweep (In-Game-Event), "loop" = endlos (Shop-Vorschau), "off" = kein Sweep (reduced).
   #335: `color2` (optional) → Deck-ZWEITON: oben `color`, unten/Glow `color2` (Prunk auf Deckfarbe → Wortmarke verläuft
   wie der Prunk deckA1→deckA2). Ohne `color2` bleibt es einfarbig (`color`) bzw. der Chrome-Zweiton (`color` null).

   ── #ios-word: drei Konstruktionen, die auf WebKit/iOS auseinanderliefen, sind hier bewusst vermieden ──
   1. ANIMATION UND FILTER LAGEN AUF DEMSELBEN ELEMENT. Der Aufrufer legt seine Pop-Animation (`as-bigscore` /
      `ws-gott-word`, beide mit `scale`) über `style` ab; der Neon-Glow ist ein CSS-`filter` mit drei drop-shadows.
      Beides am selben Knoten zwingt WebKit, die Filter-Region pro Animationsframe neu zu bestimmen — es
      invalidiert sie dabei unvollständig und lässt den Glow eines FRÜHEREN, größeren Keyframes (scale 1.1 im
      Überschwinger) stehen, während der Text schon bei scale 1 ist: der doppelte, nach außen versetzte
      Geister-Schriftzug auf dem iPhone. Deshalb trägt jetzt ein äußerer `<div>` Position + Animation und das
      innere `<svg>` (ohne eigene Transformation) den Filter. Genau diese Trennung haben die NICHT-epischen
      Stufen (Stark/Brutal/Irre in Battlefield.jsx) schon immer gehabt — und nur die waren nicht betroffen.
   2. `textLength` + `lengthAdjust="spacingAndGlyphs"`: von WebKit anders behandelt als von Blink, besonders
      zusammen mit `text-anchor="middle"` (dort wird am NATÜRLICHEN statt am angepassten Wortmaß ausgerichtet →
      seitlicher Versatz). Ersetzt durch eine EINMAL GEMESSENE horizontale Skalierung (`getBBox`), die identisch
      auf den sichtbaren Text UND auf den Masken-Text geht — beide können damit nicht mehr auseinanderlaufen.
   3. KEINE `font-family` am SVG-Text: der erbte die Body-Schrift `ui-monospace`, und die löst je Plattform anders
      auf (SF Mono auf iOS, etwas anderes auf Android/Desktop) → andere Glyphenbreiten, anderes Wortbild. Jetzt
      auf das gebündelte, selbst gehostete Orbitron gepinnt (dieselbe Schrift wie die Kartenzahlen). */

const VB_W = 1000, VB_H = 210;   // viewBox der Wortmarke
const TARGET_W = 984;            // Zielbreite des Wortes in viewBox-Einheiten (füllt die Marke randnah aus)
const BASE_X = VB_W / 2, BASE_Y = 170;
// Gepinnte Schrift (s. Punkt 3 oben) — selbst gehostet in index.css, also ohne Netz und überall gleich.
const FONT = '"Orbitron", ui-monospace, monospace';

export function GottChromeWord({ text, color = null, color2 = null, gBig = 32, gMid = 12, reduced = false, sheen = "once", idKey = "x", className = "", style = {} }) {
  const accTop = color || "#8fe0ff", accBot = color2 || color || "#ff5db1", glowC = color2 || color || "#ff3da1";
  const gid = `gc-${idKey}`, mid = `gm-${idKey}`;
  const T = String(text || "").toUpperCase();

  // Wortbreite EINMAL messen und daraus die horizontale Streckung ableiten (Ersatz für textLength/lengthAdjust).
  // `getBBox()` liefert die Box im eigenen Koordinatensystem des <text> — die Skalierung des umgebenden <g>
  // fließt NICHT ein, die Messung kann sich also nicht selbst aufschaukeln.
  const measureRef = useRef(null);
  const [sx, setSx] = useState(1);
  useLayoutEffect(() => {
    let alive = true;
    const measure = () => {
      const el = measureRef.current;
      if (!alive || !el) return;
      let w = 0;
      try { w = el.getBBox().width; } catch { return; } // wirft, solange das SVG nicht gelayoutet ist (z. B. display:none)
      if (w > 0) setSx(TARGET_W / w);
    };
    measure();
    // Orbitron lädt asynchron (`font-display: swap`) → nach dem Laden nachmessen, sonst bliebe die Skalierung
    // auf der Breite der Ersatzschrift stehen (Wort zu schmal oder zu breit im Rahmen).
    const ready = typeof document !== "undefined" && document.fonts && document.fonts.ready;
    if (ready && typeof ready.then === "function") ready.then(measure, () => {});
    return () => { alive = false; };
  }, [T]);

  // Streckung um die Wortmitte (BASE_X) — der text-anchor bleibt damit an Ort und Stelle.
  const fit = `translate(${BASE_X} 0) scale(${sx} 1) translate(${-BASE_X} 0)`;
  const glyph = { fontFamily: FONT, fontSize: "200px", fontWeight: 900, fontStyle: "italic", letterSpacing: "2px" };

  return (
    // Äußere Hülle: Position + Pop-Animation des Aufrufers. Trägt KEINEN Filter (s. Punkt 1 oben).
    <div aria-hidden="true" className={`pointer-events-none absolute ${className}`}
      style={{ willChange: "transform, opacity", ...style }}>
      {/* Innen: der Glow-Filter, auf einem Element ohne eigene Transformation → stabile Filter-Region. */}
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", width: "100%",
                 filter: `drop-shadow(0 0 ${gBig}px ${glowC}) drop-shadow(0 0 ${gMid}px ${glowC}) drop-shadow(0 3px 8px rgba(0,0,0,0.6))` }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.42" stopColor={accTop} />
            <stop offset="0.5" stopColor="#20103a" />
            <stop offset="0.58" stopColor="#ffffff" />
            <stop offset="1" stopColor={accBot} />
          </linearGradient>
          <mask id={mid}>
            {/* Dieselbe `fit`-Transformation wie beim sichtbaren Text → Maske und Schriftzug decken sich exakt. */}
            <g transform={fit}>
              <text x={BASE_X} y={BASE_Y} textAnchor="middle" style={{ ...glyph, fill: "#fff" }}>{T}</text>
            </g>
          </mask>
        </defs>
        <g transform={fit}>
          <text ref={measureRef} x={BASE_X} y={BASE_Y} textAnchor="middle"
            style={{ ...glyph, fill: `url(#${gid})`, stroke: "#0a0820", strokeWidth: "3px", paintOrder: "stroke" }}>{T}</text>
        </g>
        {sheen !== "off" && !reduced && (
          <g mask={`url(#${mid})`}>
            <rect x="-260" y="0" width="200" height={VB_H} fill="#ffffff" opacity="0.5">
              {sheen === "loop"
                ? <animate attributeName="x" values={`-260;${VB_W}`} dur="2.4s" begin="0.3s" repeatCount="indefinite" />
                : <animate attributeName="x" from="-260" to={VB_W} dur="0.95s" begin="0.12s" fill="freeze" />}
            </rect>
          </g>
        )}
      </svg>
    </div>
  );
}
