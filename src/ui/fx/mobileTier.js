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

/* `?dpr=<zahl>` überschreibt den Deckel — das Gegenstück zu `?hz=`, und aus demselben Grund da: die Frage
   „ist 1,0 sichtbar zu weich oder spare ich hier gratis 50 % Füllarbeit?" beantwortet kein Schreibtisch,
   sondern das Display. Ohne so einen Regler kostet jede Antwort einen eigenen Build.
   Nach oben bleibt die Gerätedichte bindend (mehr als `devicePixelRatio` hat schlicht keinen Adressaten). */
function dprOverride() {
  try {
    const v = parseFloat(new URLSearchParams(window.location.search).get("dpr"));
    return Number.isFinite(v) && v >= 0.5 && v <= 3 ? v : null;
  } catch { return null; }
}
const DPR_OVERRIDE = dprOverride();

export function dprCap(coarse = isCoarse()) {
  const cap = DPR_OVERRIDE ?? (coarse ? DPR_CAP_COARSE : DPR_CAP_DESKTOP);
  return Math.min(cap, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
}

/* Zeichenrate auf Mobile. Bleibt bei 30 — AUSPROBIERT UND VERWORFEN, das ist der Punkt dieses Kommentars.

   Die Ausgangslage sprach für mehr: der Deckel stammt aus der Zeit von vier bis fünf eigenen Vollbild-Canvas, und
   nach dem Umbau liegen am Gerät p50 UND p95 auf 17 ms (ein 60-Hz-Frame), 1 Ruckler in 66 s, keine Long Tasks. Es
   war also Luft da, und den Gewinn auszugeben war erklärtes Ziel. Der Standard stand deshalb kurzzeitig auf 60.

   Am Gerät verglichen (derselbe Build, nur `?hz=30` dagegen): **kein sichtbarer Unterschied.** Damit ist die
   Verdopplung ein reiner Verlust — doppelte Füllarbeit für jeden Dauer-Effekt, bezahlt in Akku und Wärme, ohne
   Gegenwert. Entscheidung des Users, und die richtige.

   Wichtig für den nächsten, der hier nachdenkt: das frühere „ruckelt trotz 60 FPS" lag NICHT an der Rate, sondern
   an ihrer Ungleichmäßigkeit (s. `frameMinMs` — die Schwelle lag exakt auf zwei 60-Hz-Frames). Nach der
   Halbframe-Toleranz war das Problem weg, und 60 hatte nichts mehr zu holen. Wer die Rate wieder anheben will,
   braucht dafür einen Effekt, dem man den Unterschied ANSIEHT — die weichen Ambiente-Ebenen sind es nicht.

   `?hz=<zahl>` überschreibt sie am Gerät (Preview/Dev), damit so eine Frage messbar bleibt statt geglaubt. */
const HZ_DEFAULT_COARSE = 30;
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
