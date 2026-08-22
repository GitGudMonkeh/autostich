#!/usr/bin/env node
/* Shared pixel comparison — the text-mask / noise-threshold method.
   ============================================================================

   EXTRACTED, NOT COPIED (22.08.2026, #viewport-1280). This lived inside scripts/viewport-proof.mjs
   and was needed by scripts/phone-proof.mjs as well. Importing it from there is impossible: that
   file executes on import — it runs a whole comparison and calls process.exit — so a second copy
   was the only alternative, and two copies of a subtle thresholding algorithm drift.

   The body below is the original, moved verbatim. Its behaviour is unchanged; only the `export`
   keyword and this header are new.

   WHY A THRESHOLD AT ALL. Raw pixel equality is the wrong question. Font rasterisation, sub-pixel
   positioning and compositing legitimately vary between two runs of the same build, so a byte
   comparison of two screenshots reports differences that mean nothing. An unaided human eye has the
   opposite failure: it cannot resolve a sub-pixel difference at all, so it reports "identical" for
   everything below its own threshold. This method sits between the two — it splits deltas at 8/255
   and then attributes the ones above it to text glyphs or to something genuinely drawn differently.
   That attribution is the number worth reading. */

import { goto, evaluate } from "./cdp.mjs";

/* The pixel diff runs IN the browser: the images are already there as base64, a canvas decodes PNG
   for free, and Node needs no image dependency. Deltas are split at 8/255 — below that is
   rasterisation noise, above it is something actually drawn differently. */
export async function comparePixels(c, aB64, bB64, textBoxes = [], dpr = 1, zoomScopes = []) {
  /* Navigate to a blank page ONLY if we are not already on one, and that guard is load-bearing.

     cdp.mjs `goto` awaits Page.loadEventFired with no timeout. Chrome fires no load event for a
     navigation from about:blank to about:blank, so calling it unconditionally hangs FOREVER the
     moment two comparisons run back to back with no real navigation in between.

     viewport-proof.mjs never hit this: it captures the application between comparisons, so every
     about:blank navigation there is a genuine cross-document one. phone-proof.mjs compares ten pairs
     in a row from a freshly launched browser — whose starting page is already about:blank — and hung
     on the first call. Measured, 22.08.2026. */
  if (await evaluate(c, "location.href") !== "about:blank") {
    await goto(c, "about:blank", { settleMs: 50 });
  }
  await evaluate(c, `window.__a = ${JSON.stringify(aB64)}; true`);
  await evaluate(c, `window.__b = ${JSON.stringify(bB64)}; true`);
  await evaluate(c, `window.__tb = ${JSON.stringify(textBoxes)}; window.__dpr = ${dpr};
    window.__zs = ${JSON.stringify(zoomScopes)}; true`);
  return evaluate(c, `(async () => {
    const load = (b64) => new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = "data:image/png;base64," + b64;
    });
    const [A, B] = await Promise.all([load(window.__a), load(window.__b)]);
    if (A.width !== B.width || A.height !== B.height) {
      return { sizeMismatch: true, a: [A.width, A.height], b: [B.width, B.height] };
    }
    const cv = (im) => { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
      c.getContext("2d").drawImage(im, 0, 0); return c.getContext("2d").getImageData(0, 0, im.width, im.height).data; };
    const da = cv(A), db = cv(B);

    // Visual record: black = identical, blue = sub-threshold noise, red = beyond noise.
    const out = document.createElement("canvas"); out.width = A.width; out.height = A.height;
    const octx = out.getContext("2d");
    const img = octx.createImageData(A.width, A.height);
    const o = img.data;

    /* Text mask, rasterised once from the boxes. A structural pixel that lands on it is glyph
       rasterisation; one that does not is something genuinely drawn differently, and THAT is what
       "structural difference" is supposed to mean. The 2 px dilation covers glyph overhang, text
       shadow and the neon glow this UI puts on its labels. */
    const MARGIN = 2;
    const mask = new Uint8Array(A.width * A.height);
    for (const [l, t, r, b] of window.__tb) {
      const x0 = Math.max(0, Math.floor((l - MARGIN) * window.__dpr));
      const x1 = Math.min(A.width - 1, Math.ceil((r + MARGIN) * window.__dpr));
      const y0 = Math.max(0, Math.floor((t - MARGIN) * window.__dpr));
      const y1 = Math.min(A.height - 1, Math.ceil((b + MARGIN) * window.__dpr));
      for (let y = y0; y <= y1; y++) { const row = y * A.width; for (let x = x0; x <= x1; x++) mask[row + x] = 1; }
    }
    let maskedPx = 0; for (let i = 0; i < mask.length; i++) maskedPx += mask[i];

    // Same rasterisation for the CSS zoom scopes, purely as a diagnostic. (No backticks in here —
    // this whole block is a template literal and a stray one truncates the probe.)
    const zmask = new Uint8Array(A.width * A.height);
    for (const [l, t, r, b] of window.__zs) {
      const x0 = Math.max(0, Math.floor(l * window.__dpr)), x1 = Math.min(A.width - 1, Math.ceil(r * window.__dpr));
      const y0 = Math.max(0, Math.floor(t * window.__dpr)), y1 = Math.min(A.height - 1, Math.ceil(b * window.__dpr));
      for (let y = y0; y <= y1; y++) { const row = y * A.width; for (let x = x0; x <= x1; x++) zmask[row + x] = 1; }
    }
    let inZoom = 0;

    let differing = 0, structural = 0, maxDelta = 0;
    let offText = 0, offTextMaxDelta = 0;
    const offTextSamples = [];
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    // Row histogram of structural differences — turns "a 429×565 bounding box" into "which bands".
    const rows = new Int32Array(A.height);
    for (let i = 0, p = 0; i < da.length; i += 4, p++) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i+1] - db[i+1]), Math.abs(da[i+2] - db[i+2]), Math.abs(da[i+3] - db[i+3]));
      o[i + 3] = 255;
      if (!d) continue;
      differing++;
      if (d > maxDelta) maxDelta = d;
      const x = p % A.width, y = (p / A.width) | 0;
      if (d > 8) {
        structural++; rows[y]++;
        if (zmask[p]) inZoom++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (mask[p]) {
          o[i] = 255; o[i + 1] = 150; o[i + 2] = 0;      // orange — on a text box
        } else {
          offText++;                                     // white — NOT on any text box
          if (d > offTextMaxDelta) offTextMaxDelta = d;
          if (offTextSamples.length < 25) offTextSamples.push({ x, y, delta: d });
          o[i] = 255; o[i + 1] = 255; o[i + 2] = 255;
        }
      } else {
        o[i] = 30; o[i + 1] = 60; o[i + 2] = 200;
      }
    }
    octx.putImageData(img, 0, 0);

    // Contiguous row bands carrying structural differences, largest first.
    const bands = [];
    for (let y = 0; y < A.height; y++) {
      if (!rows[y]) continue;
      let end = y, count = 0;
      while (end < A.height && (rows[end] || (end + 3 < A.height && (rows[end+1] || rows[end+2] || rows[end+3])))) { count += rows[end]; end++; }
      bands.push({ yFrom: y, yTo: end - 1, pixels: count });
      y = end;
    }
    bands.sort((p, q) => q.pixels - p.pixels);

    const total = A.width * A.height;
    return { sizeMismatch: false, width: A.width, height: A.height, total, differing, structural, maxDelta,
      differingPct: +(differing / total * 100).toFixed(4), structuralPct: +(structural / total * 100).toFixed(4),
      structuralBox: maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
      structuralBands: bands.slice(0, 8),
      // The decisive numbers: how much of the difference is NOT on a glyph.
      textMaskCoveragePct: +(maskedPx / total * 100).toFixed(2),
      structuralOnText: structural - offText,
      structuralOffText: offText,
      structuralOffTextMaxDelta: offTextMaxDelta,
      structuralOffTextSamples: offTextSamples,
      structuralInsideZoomScope: inZoom,
      zoomScopeCount: window.__zs.length,
      diffPng: out.toDataURL("image/png").split(",")[1] };
  })()`);
}
