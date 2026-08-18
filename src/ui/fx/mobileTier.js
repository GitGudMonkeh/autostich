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
   nachgemessen) und skalieren damit QUADRATISCH mit der Dichte — das ist der Hebel mit dem besten Verhältnis
   überhaupt, weil das Auge Dichte weit schlechter auflöst als Bildrate.

   AM GERÄT ENTSCHIEDEN (18.08.2026): 1,4 → 1,0. Die 1,4 stammten aus der Zeit der raw-WebGL-Felder; niemand hatte je 1,0 ausprobiert, es war eine Schätzung, kein Messergebnis. Über `?dpr=1` am echten Handy
   nachgesehen: **50–60 fps, unter 10 % Akku über die Sitzung, Gerät nur noch lauwarm** (Urteil des Users), und
   optisch unauffällig. Pixel skalieren quadratisch: 1,4 → 1,0 ist **49 % weniger Füllarbeit** für alles, was
   diesen Deckel liest.
   Was das erfasst: die Pixi-Emitter-Bühne (Komet/Sternenfeld, vollflächig, läuft den ganzen Lauf), den
   Feld-Kompositor und die vier Canvas-2D-Karteneffekte (Kantenglühen, Ionensturm, Frost, Moos).
   Was es NICHT erfasst, weil es eigene `resolution`-Werte führt: CardFxStage und Hologrid-Slice (je 1,25) sowie
   die fünf Gottgleich-Prunks (`pixiGott.js`, 1,25 — dort mit eigener Messung begründet). Offen. */
export const DPR_CAP_COARSE = 1.0;
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

/* #perf-shopdpr — DER DECKEL DER EFFEKT-VORSCHAU, hergeleitet statt geschätzt.
   ---------------------------------------------------------------------------------------------
   Die Werkstatt zeigt das Brett VERGRÖSSERT: die Vorschau ist `sceneScale` mal so breit wie die
   668 px, die das Brett im Spiel hat (auf 1920 px sind das ~1,86). Ein Brett-Pixel belegt in der
   Vorschau also `sceneScale` CSS-Pixel und `sceneScale × resolution` Gerätepixel — im Spiel dagegen
   genau `dprCap()`. Bei voller Auflösung rendert die Vorschau den Effekt damit fast doppelt so fein
   wie ihn irgendein Spieler je zu sehen bekommt, und bezahlt das quadratisch.

   Der Deckel `DPR_CAP_DESKTOP / sceneScale` (= 2 / 1,86 ≈ 1,07) dreht das auf exakt die
   Gerätepixel-Dichte zurück, die das Brett im Spiel hat. Das ist KEINE Look-Entscheidung, die ein
   Bildschirm entscheiden müsste, sondern eine Identität: feiner als das Spiel selbst kann die
   Vorschau nichts zeigen, was es zu beurteilen gäbe. Gemessen ~71 % weniger Füllarbeit.

   Bewusst ein MODUL-Wert und kein Prop: Die zehn Vorschau-Szenen mounten dieselben In-Game-Bühnen
   (Kompositor, PixiStage, die fünf Prunks, CardFxStage, Hologrid, die Canvas-2D-Effekte), und die
   lesen `dprCap()` alle selbst. Ein Prop hätte durch alle zehn durchgereicht werden müssen. Sicher
   ist das, weil die Werkstatt NUR im Menü erreichbar ist (App.jsx #190) — während sie offen ist,
   existiert keine Lauf-Bühne, die den Deckel versehentlich mitnehmen könnte. Wer die Werkstatt je
   im Lauf öffnet, muss das hier zu einem Prop machen.
   Gesetzt wird er in `FxStage` (CustomizeScreen.jsx), zurückgesetzt beim Verlassen. */
let PREVIEW_SCENE_SCALE = 0;
export function setPreviewSceneScale(s) {
  const v = Number(s);
  PREVIEW_SCENE_SCALE = Number.isFinite(v) && v > 1 ? v : 0;
}
/** Der Vorschau-Deckel als reine Funktion — damit der Wächter ihn nachrechnen kann. */
export function previewDprCap(scale = PREVIEW_SCENE_SCALE) {
  const v = Number(scale);
  return Number.isFinite(v) && v > 1 ? DPR_CAP_DESKTOP / v : Infinity;
}

export function dprCap(coarse = isCoarse()) {
  const cap = DPR_OVERRIDE ?? (coarse ? DPR_CAP_COARSE : DPR_CAP_DESKTOP);
  return Math.min(cap, previewDprCap(), (typeof window !== "undefined" && window.devicePixelRatio) || 1);
}

/* Zeichenrate auf Mobile. **60 seit 18.08.2026** — und das ist die zweite Kehrtwende an dieser Zahl, deshalb
   steht die ganze Geschichte hier statt nur der aktuelle Wert.

   Runde 1: der Deckel stammte aus der Zeit von vier bis fünf eigenen Vollbild-Canvas. Nach dem Kompositor-Umbau
   war Luft da, der Standard stand kurz auf 60 — am Gerät gegen `?hz=30` verglichen war **kein Unterschied zu
   sehen**, also zurück auf 30. Diese Entscheidung war richtig: doppelte Füllarbeit ohne Gegenwert ist reiner
   Verlust in Akku und Wärme.

   Runde 2 (jetzt): der Unterschied IST inzwischen zu sehen (Urteil des Users am Gerät), und das ist kein
   Widerspruch, sondern eine Folge des Umbaus dazwischen. Vorher lief das Brett auf einer heißen, gedrosselten
   GPU — ein Deckel von 60 hätte dort ohnehin nie 60 Zeichnungen ergeben, sondern nur unregelmäßige. Nach
   Deckglow-Ausbau, MSAA-Ausbau und `DPR_CAP_COARSE` 1,4 → 1,0 hält das Gerät die Rate tatsächlich durch.

   WAS DAS KOSTET, in einer Zeile: die Füllarbeit pro Sekunde ist wieder da, wo sie vor dem DPR-Schritt war
   (1,0² × 60 = 60 gegen vorher 1,4² × 30 = 58,8). Das gemessene „lauwarm, unter 10 % Akku" stammt aus einem
   Lauf bei 30 Hz. Wenn das Gerät bei 60 wieder warm wird, ist DIESE Zeile die Stelle — nicht die Auflösung,
   denn die trägt jetzt nachweislich mehr Bild pro Watt als die Rate.

   Der Knopf gilt für ALLE, die ihn lesen: Kompositor, PixiStage, CardFxStage, Hologrid-Slice UND die fünf
   Gottgleich-Prunks (`gottMaxFPS`). Die Prunks sind dabei der schwerste Posten — die Supernova zieht zwei
   Vollbild-Canvas auf. Wer die Rate nur für die Ambiente-Ebenen will, braucht dort einen eigenen Wert und
   damit eine zweite Wahrheit; das wäre gegen die Linie dieser Datei und will begründet sein.

   `?hz=<zahl>` überschreibt sie am Gerät (Preview/Dev), damit die Frage messbar bleibt statt geglaubt. */
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
   zweite Frame sicher durch, auch bei 90 Hz. (Herkunft: #perf-warm, dort für die WebGL-Felder hergeleitet.)

   OFFEN seit der Umstellung auf 60 (18.08.2026) — die feste 8-ms-Toleranz ist auf einen 60-Hz-SCHIRM gerechnet,
   und bei einem Deckel von 60 trägt sie nicht mehr überall:
     • 60-Hz-Schirm  → Schwelle 8,67 ms, Frames alle 16,7 ms → jeder passt → 60 Zeichnungen/s. Richtig.
     • 120-Hz-Schirm → Frames alle 8,3 ms → jeder zweite fällt durch → 60/s. Richtig.
     • 90-Hz-Schirm  → Frames alle 11,1 ms → JEDER passt → **90/s statt 60**. Der Deckel leckt um 50 %.
   Bei 30 gab es das Leck nicht (Schwelle 25,3 ms fängt auch 22,2 ms ab). Ein 90-Hz-Handy zieht damit mehr
   Füllarbeit, als hier bestellt ist — und merkt es nur an der Wärme, weil der FPS-Zähler rAF-Frames zählt und
   ohnehin die Schirmrate zeigt. Sauber wäre eine Toleranz als ANTEIL der Zielperiode statt fester 8 ms
   (0,75 × Periode liefert 30/30/30 und 60/45/60 über 60/90/120 Hz, überschreitet also nie das Ziel).
   Bewusst NICHT nebenbei geändert: die 8 ms sind hergeleitet und testgesichert, das gehört in einen eigenen
   Schritt mit eigener Gegenprobe am Gerät. */
/* Die Toleranz-Formel als eigene Funktion — nicht aus Ordnungsliebe, sondern weil sie einen zweiten Aufrufer
   bekommen hat: die Würfel-Matrix ist ein AMBIENTE-Effekt und zeichnet bewusst langsamer als der Geräte-Knopf
   (s. AMBIENT_HZ in CubeMatrixField.jsx). Sie braucht damit dieselbe Rechnung für eine ANDERE Rate. Hätte sie
   `1000 / hz - 8` selbst hingeschrieben, stünde die Herleitung oben und die Zahl unten in einer anderen Datei —
   genau die Trennung, an der die 8 ms in diesem Projekt schon einmal verloren gingen. */
export function hzMinMs(hz) {
  // Ohne Deckel (Rate ≥ Bildschirmrate) gar nicht erst bremsen — sonst fällt bei 60 Hz jeder zweite Frame durch.
  return hz > 0 && hz < 90 ? 1000 / hz - 8 : 0;
}
export function frameMinMs(coarse = isCoarse()) {
  return coarse ? hzMinMs(DRAW_HZ_COARSE) : 0;
}
