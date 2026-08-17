/* #perf-gott Geteilte Pixi-Grundeinstellung + Geometrie-Cache für die Gottgleich-Prunk-Effekte (#322–#326).
   EINE Wahrheit für Sonnen-Puls · Laser-Fächer · Prisma-Kaskade · Holo-Würfel · Supernova — vorher stand derselbe
   `app.init`-Block fünfmal wortgleich in den Dateien und driftete bei jeder Nachjustierung auseinander.

   Hintergrund (gemessen, nicht geraten): die Kosten eines Prunks hängen fast nur an „wie viele Pixel malt diese
   zusätzliche, ganzflächige, transparente Canvas pro Sekunde" — NICHT daran, was darauf zu sehen ist. Eine Messung
   mit allen Ebenen auf alpha 0 (Canvas da, Ticker läuft, nichts gezeichnet) kostete bereits den Löwenanteil; die
   Kosten skalieren linear mit der Canvas-Fläche und quadratisch mit `resolution`. Entsprechend die drei Hebel:

   • `antialias: false` — der Prunk besteht aus weichen, VORGEBACKENEN Radial-/Verlaufstexturen; MSAA hat daran
     nichts zu glätten, kostet aber pro Frame ein Full-Canvas-Resolve. Die additiven Linien (Strahlen/Ringe/Beams)
     laufen mit alpha ≈ 0,15–0,5 über einen hellen Glow — dort ist Aliasing praktisch unsichtbar.
   • `resolution` — voll 2 → 1,5. Bei weichem Bloom optisch nicht unterscheidbar, spart aber ~44 % Fill.
     `lite` (Handy/„ausgewogen") bleibt bei 1,25: tiefer würden die dünnen Linien (bis herunter zu diag×0,0022)
     ohne MSAA sichtbar treppig — Auflösung ist hier das bessere Qualität-pro-Kosten-Geschäft als MSAA.
   • `maxFPS` — voll war `0` (= ungedeckelt): auf einem 120/144-Hz-Display rendert ein 0,9-s-Bloom-Puls doppelt so
     oft wie nötig, ohne dass davon etwas ankommt. 60 reicht; `lite` bleibt bei 30.

   ACHTUNG bei `resolution`: `autoDensity: true` rechnet die CSS-Größe selbst zurück — die Zahl ist reine
   Backing-Store-Dichte, das Layout ändert sich dadurch NICHT. */

import { DRAW_HZ_COARSE } from "./mobileTier.js"; // #perf-mobile: EINE Wahrheit für die Zeichenrate

export const GOTT_RES_FULL = 1.5;
export const GOTT_RES_LITE = 1.25;
export const GOTT_FPS_FULL = 60;

/* `resLite` überschreibt die lite-Dichte für Effekte, die mehr als eine Canvas aufziehen (Supernova: Tunnel + Nova
   → doppelte Fill-Rate, deshalb dort 1.0). */
export function gottAppOptions({ canvas, host, lite, resLite = GOTT_RES_LITE, resFull = GOTT_RES_FULL }) {
  return {
    canvas, preference: "webgl", backgroundAlpha: 0,
    antialias: false,
    autoDensity: true,
    resolution: Math.min(lite ? resLite : resFull, window.devicePixelRatio || 1),
    resizeTo: host,
    powerPreference: "high-performance",
  };
}

/* Zeichenrate der Prunks. `lite` (Handy/„ausgewogen") holt sie aus mobileTier — EINE Wahrheit für alle Effekte,
   und damit auch über `?hz=` am Gerät regelbar. Sie stand hier lange fest auf 30; wenn ein Prunk bei 60 sichtbar
   rangiert, ist genau dieser Knopf die Stelle (und nicht ein neuer, zweiter Wert an dieser Datei vorbei). */
export function gottMaxFPS(lite) { return lite ? DRAW_HZ_COARSE : GOTT_FPS_FULL; }

/* Panel-/Karten-Geometrie EINMAL pro Abspielvorgang messen statt pro Frame.
   `place()` rief in jedem Effekt zwei `getBoundingClientRect()` pro Frame auf — jeder Aufruf erzwingt ein
   synchrones Layout. Im Messstand (winzige DOM) war das harmlos; im echten Battlefield laufen zeitgleich
   Score-Floats, die Groß-Ansage und der Kartenflip, halten das Layout also permanent „dirty" — dort kostet
   derselbe Aufruf ein Vielfaches, und zwar auf der CPU, wo die Frames tatsächlich verloren gehen.
   Das Panel ändert seine Größe während eines 0,9-s-Effekts nicht; Screen-Shake ist ein `translate` und lässt
   Breite/Höhe unberührt. Gemessen wird darum bei jedem `startPlay()` neu (invalidate) und sonst gecacht.
   Nur WAHRE Ergebnisse werden gecacht — solange das Panel noch nicht messbar ist (Breite < 2), misst der
   nächste Frame erneut. */
export function createPlacer(measure) {
  let cache = null;
  return {
    get() {
      if (cache) return cache;
      const v = measure();
      if (v) cache = v;
      return v;
    },
    invalidate() { cache = null; },
  };
}
