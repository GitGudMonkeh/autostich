/* Horizontaler Swipe zum Reiterwechsel — reine HINTERGRUND-Funktion: keine Optik, kein Indikator, kein
   zusätzliches Markup. Der Hook liefert nur Touch-Handler, die man auf den Screen-/Inhalts-Container
   spreadet ({...useTabSwipe(order, tab, setTab)}).

   Gewechselt wird NUR bei einer klar horizontalen Wischgeste: die zurückgelegte X-Strecke muss über der
   Schwelle liegen UND deutlich größer als die Y-Strecke sein. So bleibt vertikales Scrollen unberührt
   (dort dominiert Y) und ein Tipp (kurze Strecke) löst nichts aus. Es wird nie preventDefault gerufen —
   der native Scroll läuft normal weiter. `dir` ist −1 (nach rechts gewischt → vorheriger Reiter) bzw.
   +1 (nach links → nächster). */
import { useRef } from "react";

export function useSwipeTabs(onSwipe, { threshold = 55, ratio = 1.6 } = {}) {
  const start = useRef(null);
  return {
    onTouchStart: (e) => {
      // Nur Ein-Finger-Gesten (Pinch/Zoom ignorieren).
      if (!e.touches || e.touches.length !== 1) { start.current = null; return; }
      const p = e.touches[0];
      start.current = { x: p.clientX, y: p.clientY };
    },
    onTouchEnd: (e) => {
      const s = start.current;
      start.current = null;
      if (!s || !e.changedTouches || !e.changedTouches.length) return;
      const p = e.changedTouches[0];
      const dx = p.clientX - s.x;
      const dy = p.clientY - s.y;
      if (Math.abs(dx) < threshold) return;               // zu kurz → Tipp
      if (Math.abs(dx) < Math.abs(dy) * ratio) return;    // eher senkrecht → Scrollen, kein Wechsel
      onSwipe(dx < 0 ? 1 : -1);
    },
  };
}

/* Bequemer Wrapper: wechselt innerhalb einer geordneten Reiter-Liste, geklemmt (kein Umlauf über die
   Enden). `guard` (optional) unterdrückt den Wechsel, solange es true liefert — z. B. wenn ein
   Detail-/Unter-Overlay offen ist, das die Geste selbst braucht. */
export function useTabSwipe(order, tab, setTab, { guard = null, ...opts } = {}) {
  return useSwipeTabs((dir) => {
    if (guard && guard()) return;
    const i = order.indexOf(tab);
    if (i < 0) return;
    const ni = i + dir;
    if (ni >= 0 && ni < order.length) setTab(order[ni]);
  }, opts);
}
