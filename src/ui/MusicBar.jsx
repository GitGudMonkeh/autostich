import { useEffect, useRef, useState } from "react";

/* Musik-Panel (#111) — ganz unten im Run: nur noch der aktuelle Track-Titel (der „Nächster Track"-Button
   sitzt seit #133 im Header). Langer Titel läuft durch (Marquee), sobald er nicht in den Rahmen passt. */
export function MusicBar({ title }) {
  return (
    <div className="rounded-xl p-3 flex items-center gap-2 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <span className="text-base" aria-hidden>🎵</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide opacity-50">Musik</div>
        <MarqueeText text={title || "—"} className="text-sm font-bold" />
      </div>
    </div>
  );
}

/* Läuft nur, wenn der Text breiter ist als sein Rahmen (Ping-Pong mit Pausen an den Enden
   → man kann Anfang und Ende lesen). Passt er, bleibt er statisch. title-Attribut = Volltext
   als Tooltip (auch der Fallback bei reduzierter Bewegung, wo die Animation aus ist). */
function MarqueeText({ text, className = "" }) {
  const clip = useRef(null);
  const inner = useRef(null);
  const [dist, setDist] = useState(0); // >0 → Überlauf in px; aktiviert das Durchlaufen

  useEffect(() => {
    let alive = true;
    const measure = () => {
      const c = clip.current, i = inner.current;
      if (!c || !i || !alive) return;
      setDist(Math.max(0, Math.ceil(i.scrollWidth - c.clientWidth)));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    // #159: Clip UND Inneres beobachten — ein spät geladener Pixel-Font ändert nur die Textbreite (nicht die
    // Clip-Breite), sonst bliebe die Überlauf-Entscheidung mit der Fallback-Metrik hängen.
    if (ro) { if (clip.current) ro.observe(clip.current); if (inner.current) ro.observe(inner.current); }
    // Zusätzlich einmal nachmessen, sobald der (spät ladende) Pixel-Font bereit ist.
    if (typeof document !== "undefined" && document.fonts?.ready) document.fonts.ready.then(measure);
    return () => { alive = false; if (ro) ro.disconnect(); };
  }, [text]);

  const rolling = dist > 0;
  const dur = rolling ? Math.round(dist / 15 + 4) : 0; // ~ konstante Lesegeschwindigkeit + Endpausen

  return (
    <div ref={clip} className={`overflow-hidden ${className}`} title={text}>
      <span
        ref={inner}
        className="inline-block whitespace-nowrap will-change-transform"
        style={rolling ? { animation: `as-marquee ${dur}s ease-in-out infinite`, "--marquee-dist": `-${dist}px` } : undefined}
      >
        {text}
      </span>
    </div>
  );
}
