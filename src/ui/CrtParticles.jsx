import { useState, useEffect } from "react";

/* Ambient-Partikel unter dem CRT-Skin (#41-Nachzug): langsam aufsteigende Pixel,
   rein dekorativ (pointer-events:none). Wird nur gerendert, wenn der Skin an ist
   (App entscheidet) UND keine reduzierte Bewegung gewünscht ist. Positionen sind
   index-abgeleitet → kein Math.random, kein Re-Render-Jitter, stabile Keys. */
const COUNT = 42;
const PARTICLES = Array.from({ length: COUNT }, (_, i) => ({
  i,
  left: (i * 37 + 3) % 100,           // über die Breite verteilt
  size: 2 + (i % 3),                  // 2–4 px Pixel
  dur: 10 + (i % 8),                  // 10–17 s Aufstieg
  delay: -((i * 2.3) % 16),           // negativ → schon mitten im Flug (kein Leer-Start)
  drift: (i % 2 ? 1 : -1) * (8 + (i % 4) * 6), // leichte Seitwärts-Drift
  opacity: 0.3 + (i % 4) * 0.12,      // 0,30–0,66 (dahinter durch die Panels gedämpft)
}));

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

export function CrtParticles() {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null; // Bewegung ist der ganze Zweck → bei reduced-motion gar nicht rendern
  return (
    <div className="crt-particles" aria-hidden="true">
      {PARTICLES.map((p) => (
        <span
          key={p.i}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            "--drift": `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
