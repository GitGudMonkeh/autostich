#!/usr/bin/env node
/* #menu-rework M8 — read RENDERED colours out of a capture, so a colour delta is measured.
   ============================================================================

   WHY THIS EXISTS. The vocabulary commit replaces translucent neutral edges — `rgba(150, 150, 170, α)`
   at four alphas — with the opaque step `--ed-quiet` (#2a2a34). That is a real colour change, and
   M2a's and M3's records state theirs as a number ("rund 9/255 über der Panelfläche", "3/255"). A
   translucent colour has no number of its own: it depends on what is behind it. So the ground has to
   be read off the actual rendered screen rather than reasoned about.

   `scripts/pixel-diff.mjs` decodes PNGs IN THE BROWSER, which is the right trade there — it compares
   whole images and needs no Node dependency. It is the wrong trade here: sampling one pixel would
   cost a navigation per sample, and the app's own page cannot decode a data: URL under its CSP
   anyway. So this decodes in Node, with `node:zlib` and nothing else.

   SCOPE, deliberately small: 8-bit truecolour, non-interlaced — which is exactly what
   `Page.captureScreenshot` produces (verified with `file` on the captures this task wrote). Anything
   else throws rather than returning a plausible wrong number.

     node docs/workstreams/desktop-menus/evidence/M8/pixels.mjs <file.png> <x>,<y> [<x>,<y> …]
     node docs/workstreams/desktop-menus/evidence/M8/pixels.mjs --over rgba(150,150,170,.14) <r,g,b>
*/

import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIG)) throw new Error("not a PNG");
  let at = 8, w = 0, h = 0, depth = 0, colour = 0, interlace = 0;
  const idat = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString("ascii", at + 4, at + 8);
    const body = buf.subarray(at + 8, at + 8 + len);
    if (type === "IHDR") {
      w = body.readUInt32BE(0); h = body.readUInt32BE(4);
      depth = body[8]; colour = body[9]; interlace = body[12];
    } else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    at += 12 + len;
  }
  if (depth !== 8 || interlace !== 0 || (colour !== 2 && colour !== 6)) {
    throw new Error(`unsupported PNG: depth ${depth}, colour type ${colour}, interlace ${interlace}`);
  }
  const bpp = colour === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  /* The five PNG filters, undone row by row. `prev` is the already-reconstructed row above — which is
     why this cannot be done per pixel without keeping the whole image. */
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      } else if (f !== 0) throw new Error(`unknown PNG filter ${f} on row ${y}`);
      cur[i] = v & 0xff;
    }
  }
  return { w, h, bpp, data: out, at: (x, y) => {
    const i = y * stride + x * bpp;
    return [out[i], out[i + 1], out[i + 2]];
  } };
}

/* A translucent colour over a known ground. This is the whole reason the ground has to be sampled:
   `rgba(150, 150, 170, .14)` is not a colour until something is behind it. */
export const over = ([r, g, b], a, ground) =>
  ground.map((c, i) => Math.round(a * [r, g, b][i] + (1 - a) * c));
export const dist = (x, y) => x.map((c, i) => Math.abs(c - y[i]));

if (process.argv[1] && process.argv[1].endsWith("pixels.mjs")) {
  const args = process.argv.slice(2);
  const png = decodePng(readFileSync(args[0]));
  console.log(`${args[0]}: ${png.w}x${png.h}`);
  for (const spot of args.slice(1)) {
    const [x, y] = spot.split(",").map(Number);
    const [r, g, b] = png.at(x, y);
    console.log(`  ${x},${y}  rgb(${r}, ${g}, ${b})  #${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
  }
}
