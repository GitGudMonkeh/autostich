/* #fx-helfer — die Handvoll Mathe-/Canvas-Helfer, die jeder Effekt braucht, an EINER Stelle.

   Vorher stand jede davon in jeder Effektdatei erneut: `lerp` zehnmal wortgleich, `mulberry32`
   dreimal Byte für Byte identisch, `roundRectPath` viermal, `mix`/`vhash`/`fbm`/`clampRGB`/
   `satBoost` je zwei- bis achtmal. Dasselbe Muster hatte schon einmal `pixiGott.js` aufgelöst
   (fünf wortgleiche `app.init`-Blöcke, die auseinandergedriftet waren) — und auch hier war die
   Drift bereits eingetreten: `roundRectPath` in BlackholeFx.jsx fehlte die Radius-Klemme, die
   die drei anderen Fassungen hatten. Aufgefallen ist das niemandem, weil jede Kopie für sich
   plausibel aussieht.

   BEWUSST OHNE PIXI-IMPORT. Sieben der Effektdateien sind reines Canvas/WebGL (BlackholeFx,
   ScorchFx, CardEdgeGlow, MossGrow, FrostIce, CubeMatrixField …). Würde hier `pixi.js`
   importiert, zöge es der Bundler über diese Dateien in den Eager-Graphen und der sorgfältig
   async gehaltene Pixi-Chunk hinge wieder am Entry — genau der Fehler, den der
   `preload-helper`-Zweig in vite.config.js schon einmal beheben musste. Was Pixi braucht
   (Texturen), steht deshalb in `fxTextures.js`. */

/* ── Begrenzen ────────────────────────────────────────────────────
   Zwei Schreibweisen waren im Umlauf — die Ternär-Kette und `Math.max(a, Math.min(b, v))`. Sie
   verhalten sich identisch, auch bei NaN (beide geben NaN zurück), deshalb hier nur noch eine. */

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ── Interpolation ────────────────────────────────────────────── */

export const lerp = (a, b, t) => a + (b - a) * t;

/* Quadratisches Ausklingen. In BlackholeFx stand dieselbe Kurve als `t * (2 - t)` — ausmultipliziert
   ist das identisch (1 − (1−t)² = 2t − t²), nur anders geschrieben. */
export const easeOut = (t) => 1 - (1 - t) * (1 - t);

/* ── Farben ───────────────────────────────────────────────────────
   Zwei Darstellungen im Umlauf, absichtlich getrennt gehalten: die Pixi-Seite rechnet mit
   RGB-TRIPELN ([r, g, b]), die Canvas-Seite (Frost/Moos) mit OBJEKTEN ({ r, g, b }). Ein
   gemeinsames `mix` für beide wäre eine stille Falle — ein Tripel in `mixRGB` liefert
   `{ r: NaN, … }`, ohne dass irgendetwas meckert. */

export const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export const mixRGB = (a, b, t) => ({ r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) });

/* Dritte Farbdarstellung: eine gepackte 24-Bit-Zahl (0xRRGGBB), wie Pixi sie als `tint` erwartet.
   Wird gerundet zurückgegeben — ein Tint muss ganzzahlig sein. */
export const lerpCol = (a, b, t) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t));
};

export const clampRGB = (c) => ({
  r: Math.max(0, Math.min(255, c.r)),
  g: Math.max(0, Math.min(255, c.g)),
  b: Math.max(0, Math.min(255, c.b)),
});

// Sättigung anheben, Helligkeit halten (Luma-erhaltende Spreizung um den Grauwert).
export const satBoost = (c, s) => {
  const L = 0.30 * c.r + 0.59 * c.g + 0.11 * c.b;
  return clampRGB({ r: L + (c.r - L) * (1 + s), g: L + (c.g - L) * (1 + s), b: L + (c.b - L) * (1 + s) });
};

/* ── Zufall ───────────────────────────────────────────────────────
   Seedbarer PRNG. Die Effekte brauchen ihn, damit ein Muster über die Frames hinweg STEHT,
   statt bei jedem Neuzeichnen zu flimmern — nicht für Spiellogik. */
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* Wertrauschen + zweidimensionales fBm über drei Oktaven. Deterministisch aus (x, y) — kein Seed,
   kein Zustand: dieselbe Stelle liefert immer denselben Wert, auch nach einem Resize. */
export function vhash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function fbm(x, y) {
  return vhash(x * 0.05, y * 0.05) * 0.6 + vhash(x * 0.13, y * 0.13) * 0.28 + vhash(x * 0.31, y * 0.31) * 0.12;
}

/* ── Canvas ───────────────────────────────────────────────────────
   Abgerundetes Rechteck als Pfad (kein Zeichnen — der Aufrufer entscheidet fill/stroke/clip).
   Die Radius-Klemme ist Absicht und war der Punkt, an dem die Kopien auseinanderliefen: ohne sie
   erzeugt `arcTo` bei r > w/2/h/2 überschneidende Bögen und damit eine verzerrte Kontur. */
export function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
