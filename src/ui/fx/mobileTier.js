/* MOBILE-STUFE für die Canvas-2D-Effekte — eine Wahrheit für „wie fein und wie oft zeichnen wir auf dem Handy".

   Warum eine eigene Datei: Aurora, Neon-Brandung, Leuchten und das Schwarze Loch haben ihre `pointer:coarse`-Erkennung
   je einzeln im Modul stehen, samt der Judder-Begründung als Kommentarblock. Beim Nachziehen der übrigen Effekte
   (Effekt-Audit, Hebel 02/03) wäre derselbe Block ein fünftes bis achtes Mal entstanden — genau die Doppelung, die
   in diesem Projekt schon einmal Werte auseinanderlaufen ließ. Diese Datei ist bewusst Pixi-frei und ohne React;
   die Pixi-Prunks haben ihre eigenen Knöpfe in pixiGott.js.

   NICHT `lite` (die Effekt-Stufe aus den Optionen), sondern das GERÄT: `lite` ist eine Spieler-Einstellung und
   steht auf „ausgewogen" auch am Desktop. Hier geht es um die Frage „malt eine mobile GPU das noch flüssig",
   und die beantwortet der Zeigertyp. Wer beides braucht, kombiniert sie am Aufrufer. */

// Zeigertyp EINMAL auswerten. Ein Gerätewechsel mitten in der Sitzung ist kein realer Fall; ein `matchMedia`-Listener
// je Effekt wäre teurer als der Nutzen. SSR-sicher (kein window → Desktop annehmen).
let _coarse = null;
export function isCoarse() {
  if (_coarse === null) {
    _coarse = typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)").matches : false;
  }
  return _coarse;
}

/* Auflösungs-Deckel. Die Kosten eines Effekts hängen fast nur an „Canvas-Pixel pro Sekunde" (im Prunk-Messstand
   nachgemessen) und skalieren damit QUADRATISCH mit der Dichte: 2,0 → 1,4 sind gut 51 % weniger Fläche. 1,4 ist der
   Wert, auf dem die drei raw-WebGL-Felder schon stehen — bewusst derselbe, damit das Brett einheitlich aussieht. */
export const DPR_CAP_COARSE = 1.4;
export const DPR_CAP_DESKTOP = 2;
export function dprCap(coarse = isCoarse()) {
  const cap = coarse ? DPR_CAP_COARSE : DPR_CAP_DESKTOP;
  return Math.min(cap, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
}

/* Zeichenrate auf Mobile. Lange stand hier 30 — als Sparmaßnahme aus einer Zeit, in der das Brett vier bis fünf
   eigene Vollbild-Canvas trug und auf dem Handy sichtbar rangierte. Dieser Zustand ist vorbei: am Gerät gemessen
   liegen p50 UND p95 auf 17 ms (ein 60-Hz-Frame), 1 Ruckler in 66 s, keine Long Tasks. Der Deckel halbiert also
   nicht mehr die Last eines überlasteten Bretts, sondern nur noch die Bildrate der Effekte auf einem Brett, das
   Luft hat — und genau dafür war der ganze Umbau da: den Gewinn AUSGEBEN, nicht horten.

   `?hz=<zahl>` überschreibt die Rate am Gerät (Preview/Dev), damit die Entscheidung gemessen statt geglaubt wird:
   `?hz=30` ist der alte Zustand, direkt vergleichbar im selben Build. */
const HZ_DEFAULT_COARSE = 60;
function hzOverride() {
  try {
    const v = parseFloat(new URLSearchParams(window.location.search).get("hz"));
    return Number.isFinite(v) && v >= 10 && v <= 240 ? v : null;
  } catch { return null; }
}
export const DRAW_HZ_COARSE = hzOverride() ?? HZ_DEFAULT_COARSE;

/* Mindestabstand zwischen zwei ZEICHNUNGEN auf Mobile (der rAF-Takt läuft weiter, die Zeitbasis bleibt echt).
   Die −8 ms sind Pflicht, nicht Kosmetik: die glatte 1000/30 = 33,33 ms liegt haargenau auf zwei 60-Hz-Frames
   (2 × 16,667). Kommt der übernächste Frame den Hauch zu früh, fällt die Zeichnung auf den ÜBERnächsten und der
   Abstand springt auf 50 ms. Simuliert ergibt das 33/50/33/50 statt gleichmäßig 33 — also ~26 statt 30 Zeichnungen
   pro Sekunde und vor allem UNGLEICHMÄSSIG. Das ist der Grund, warum Effekte auf dem Handy ruckelig wirken, obwohl
   der FPS-Zähler 60 zeigt: der zählt rAF-Frames, nicht Zeichnungen. Mit der halben Frame-Toleranz passt jeder
   zweite Frame sicher durch, auch bei 90 Hz. (Herkunft: #perf-warm, dort für die WebGL-Felder hergeleitet.) */
export function frameMinMs(coarse = isCoarse()) {
  // Ohne Deckel (Rate ≥ Bildschirmrate) gar nicht erst bremsen — sonst fällt bei 60 Hz jeder zweite Frame durch.
  return coarse && DRAW_HZ_COARSE < 90 ? 1000 / DRAW_HZ_COARSE - 8 : 0;
}
