import { useEffect, useRef, useState } from "react";

/* Musik-Panel (#111) — ganz unten im Run: aktueller Track-Titel + „nächster Track".
   Langer Titel läuft durch (Marquee), sobald er nicht komplett in den Rahmen passt. */
export function MusicBar({ title, onNext }) {
  return (
    <div className="rounded-xl p-3 flex items-center justify-between gap-3 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base" aria-hidden>🎵</span>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide opacity-50">Musik</div>
          <MarqueeText text={title || "—"} className="text-sm font-bold" />
        </div>
      </div>
      <button onClick={onNext}
        className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold transition-all hover:brightness-110"
        style={{ background: "#20202a", border: "1px solid #3a3a46" }}>
        Nächster Track ⏭
      </button>
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
    const measure = () => {
      const c = clip.current, i = inner.current;
      if (!c || !i) return;
      setDist(Math.max(0, Math.ceil(i.scrollWidth - c.clientWidth)));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && clip.current) ro.observe(clip.current);
    return () => { if (ro) ro.disconnect(); };
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
