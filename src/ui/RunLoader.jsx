import { useEffect, useState } from "react";

/* #190 — schlanker Vorlade-Balken für die kosmetischen Skins beim Run-Start.
   Lädt die aktiven Deck-/Battlefield-Bilder vor und ruft onReady, sobald alle da sind (Cache → sofort).
   Zeigt den sichtbaren Balken erst nach `showDelay` ms → kein Flackern bei bereits gecachten Skins.
   Sicherheitsnetz: nach `maxWait` ms wird trotzdem gestartet (nie hängen bleiben). */
export function RunLoader({ images = [], onReady, showDelay = 150, maxWait = 3000 }) {
  const [done, setDone] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const urls = [...new Set(images.filter(Boolean))];
    const total = urls.length;
    if (total === 0) { onReady(); return; }

    let count = 0;
    const bump = () => {
      if (cancelled) return;
      count += 1;
      setDone(count);
      if (count >= total) { cancelled = true; onReady(); }
    };
    for (const src of urls) {
      const im = new Image();
      im.onload = bump;
      im.onerror = bump; // Fehler nicht blockieren lassen
      im.src = src;
      if (im.complete) bump(); // bereits im Cache → sofort zählen
    }
    const showTimer = setTimeout(() => { if (!cancelled) setVisible(true); }, showDelay);
    const safety = setTimeout(() => { if (!cancelled) { cancelled = true; onReady(); } }, maxWait);
    return () => { cancelled = true; clearTimeout(showTimer); clearTimeout(safety); };
  }, []);

  if (!visible) return null;
  const total = Math.max(1, [...new Set(images.filter(Boolean))].length);
  const pct = Math.min(100, Math.round((done / total) * 100));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#0c0c10f2", backdropFilter: "blur(2px)" }}>
      <div className="w-full max-w-xs px-6 text-center">
        <div className="text-sm font-pixel mb-3 opacity-70">Lade Deck …</div>
        <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "#20202a", border: "1px solid #30303a" }}>
          <div className="h-full rounded-full transition-all duration-200" style={{ width: `${pct}%`, background: "#5ab87a" }} />
        </div>
      </div>
    </div>
  );
}
