/* Karten-Effekt „Holo-Sweep" (Prisma-Band) · Layer 1 aus #318 — ein prismatisches Lichtband wandert diagonal
   über die Karte, additiv, auf die Kartenform maskiert (die Maske setzt die CardFxStage). Der Regenbogen ist auf
   der Karte „gemalt" (Hue = hueBasis + u·hueSpanne entlang der Sweep-Achse); das wandernde Band ist ein
   Helligkeits-Fenster, das die Hues enthüllt → echte Holo-Optik. `prismatik` mischt Regenbogen ↔ Deckfarbe
   (0 = color→color2, 1 = neutraler Regenbogen). `bloom` = zweiter, breiterer + schwächerer additiver Pass.

   KEIN Pixi-Custom-Shader: das Band wird aus additiven Graphics-STREIFEN (Quads senkrecht zur Sweep-Achse)
   gebaut — der Custom-Shader-Pfad rendert auf dem Mobile-Setup nicht (wie bei Aurora). Nur nahe dem Band werden
   Streifen gezeichnet (Helligkeits-Fenster), das hält die Draw-Zahl klein.

   Skalierung: Band-Maße sind RELATIV zur projizierten Kartenlänge → unabhängig von sc (Issue: „Relative Maße …
   übertragen unabhängig von sc"). Tilt (Pointer/Gyro) versetzt das Band (`reakt`) und schiebt die Hue-Phase
   (`parallax`). Der Karten-Kipp (`tilt.karte`) neigt die echte Karte — das geht nur über das DOM und ist hier
   (Overlay) bewusst NICHT umgesetzt; siehe CardFxStage-Kommentar.

   [TUNING] Alle Werte 1:1 aus dem Holo-Sweep-Board (#318). */

export const HOLO_TUNE = {
  band:    { breite: 0.35, weich: 0.85, winkel: 22, tempo: 0.57, n: 1 }, // breite/weich RELATIV; winkel °; tempo Zyklen/s
  farbe:   { prismatik: 0.5, hueSpanne: 120, hueBasis: 200, saett: 70, hell: 58 },
  glanz:   { breite: 0.05, staerke: 1, an: false },                       // harter Glanz-Streifen — final AUS
  additiv: { intens: 0.62, bloom: 0.35, bloomBreite: 1.7 },
  tilt:    { reakt: 0.63, karte: 5, glanz: 0.5, parallax: 0.25 },         // karte (°) = DOM-Kartenkipp, hier nicht umgesetzt
};

const frac = (x) => x - Math.floor(x);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// 24-bit-Farb-Interpolation a→b.
const lerpCol = (a, b, t) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t));
};

// HSL (h° / s% / l%) → 0xRRGGBB.
function hslInt(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
  return ((Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255));
}

// Ein Streifen (Quad senkrecht zur Sweep-Achse, von s0 bis s1 entlang dir, volle Perp-Breite) additiv füllen.
function strip(g, cx, cy, dx, dy, px, py, s0, s1, halfP, color, alpha) {
  const ax = cx + dx * s0, ay = cy + dy * s0, bx = cx + dx * s1, by = cy + dy * s1;
  g.poly([
    ax - px * halfP, ay - py * halfP,
    ax + px * halfP, ay + py * halfP,
    bx + px * halfP, by + py * halfP,
    bx - px * halfP, by - py * halfP,
  ]);
  g.fill({ color, alpha });
}

/* Holo-Sweep für EINE Karte in die (positionierte, additive, maskierte) Graphics `g` zeichnen.
   w,h = Kartenbox px · t = Zeit (s) · p = { color, color2, tierMul, reduced, lite } · tilt = { x, y } (−1..1). */
export function drawHolo(g, w, h, sc, p, t, tilt) {
  const T = HOLO_TUNE;
  const tierMul = p.tierMul != null ? p.tierMul : 1;
  const tx = tilt ? tilt.x : 0, ty = tilt ? tilt.y : 0;
  const th = (T.band.winkel * Math.PI) / 180;
  const dx = Math.cos(th), dy = Math.sin(th);   // Sweep-Richtung
  const px = -dy, py = dx;                       // senkrecht dazu
  const cx = w / 2, cy = h / 2;
  // Projektions-Länge L der Kartenbox auf die Sweep-Achse (aus den vier Ecken).
  const corners = [[-cx, -cy], [cx, -cy], [cx, cy], [-cx, cy]];
  let sMin = Infinity, sMax = -Infinity;
  for (const [ox, oy] of corners) { const s = ox * dx + oy * dy; if (s < sMin) sMin = s; if (s > sMax) sMax = s; }
  const L = (sMax - sMin) || 1;
  const halfP = 0.5 * Math.hypot(w, h) + 2; // Streifen decken die ganze Karte quer ab (Maske schneidet außen weg)

  const nBands = Math.max(1, T.band.n | 0);
  const steps = p.lite ? 22 : 38;                // Streifen je Pass
  const passes = [
    { sig: T.band.breite * L * (0.35 + 0.5 * T.band.weich), a: T.additiv.intens },                          // Kern
    { sig: T.band.breite * L * (0.35 + 0.5 * T.band.weich) * T.additiv.bloomBreite, a: T.additiv.intens * T.additiv.bloom }, // Bloom
  ];

  for (let bi = 0; bi < nBands; bi++) {
    const phase = bi / nBands;
    // Band-Position 0..1 (reduced → Standbild, kein Tilt). Tilt.reakt versetzt das Band.
    let pos = p.reduced ? 0.32 : frac(t * T.band.tempo + phase);
    if (!p.reduced) pos = clamp(pos + T.tilt.reakt * tx * 0.5, -0.5, 1.5);
    const centerS = sMin + pos * L;
    // Bloom zuerst (unter dem Kern), dann Kern — additiv, Reihenfolge egal, aber so ist es lesbar.
    for (let pi = passes.length - 1; pi >= 0; pi--) {
      const sig = Math.max(0.5, passes[pi].sig);
      const baseA = passes[pi].a * tierMul;
      const halfWin = sig * 3;
      const ds = (2 * halfWin) / steps;
      for (let k = 0; k < steps; k++) {
        const s0 = centerS - halfWin + k * ds, s1 = s0 + ds, sm = (s0 + s1) / 2;
        const dd = sm - centerS;
        const env = Math.exp(-(dd * dd) / (2 * sig * sig));
        const alpha = baseA * env;
        if (alpha < 0.004) continue;
        const u = clamp((sm - sMin) / L, 0, 1);
        // Hue entlang der Achse (+ leichter Parallax-Schub durch Tilt), gemischt mit der Deckfarbe.
        const hue = T.farbe.hueBasis + u * T.farbe.hueSpanne + (p.reduced ? 0 : T.tilt.parallax * ty * T.farbe.hueSpanne * 0.4);
        const rainbow = hslInt(hue, T.farbe.saett, T.farbe.hell);
        const deckCol = p.color2 != null ? lerpCol(p.color, p.color2, u) : p.color;
        const col = lerpCol(deckCol, rainbow, T.farbe.prismatik);
        strip(g, cx, cy, dx, dy, px, py, s0, s1, halfP, col, Math.min(1, alpha));
      }
    }
    // Optionaler harter Glanz-Streifen (glanz.an) — im Sign-off AUS.
    if (T.glanz.an) {
      const gw = T.glanz.breite * L;
      strip(g, cx, cy, dx, dy, px, py, centerS - gw / 2, centerS + gw / 2, halfP, 0xffffff, Math.min(1, T.glanz.staerke * tierMul));
    }
  }
}
