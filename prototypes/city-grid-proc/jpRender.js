// Japanese-cyberpunk parts in the reference language.
// Deliberately OUTSIDE src/: design exploration.
//
// refRender.js gives the building — a dark matte box with huge lit windows. These are the parts
// that make such a box read as Tokyo at night rather than as generic neon:
//
//   1. The facade is COVERED. Signs hang off it, stacked down its whole height, in four hues.
//   2. Everything happens at head height: awnings, lanterns, noren, vending machines. The bottom
//      two metres carry more detail than the twenty above them.
//   3. The roof is a service yard — tanks, ducts, AC boxes, a mast — never a clean cap.
//   4. Cables cross everywhere. They are the one thing that ties separate buildings together.
//   5. Script is never drawn as script. Signs carry abstract bars: at this size real characters
//      would be mush, and invented ones would be wrong.

import { P, CS, rng } from "./buildings.js";
import { PAL, shade, topFace, rp, lp, quad, emitLight, quadLight } from "./refRender.js";

export const JP = {
  screen: 0x120f1f,
  cloth: 0x8f1f3a,
  lantern: 0xff8a52,
  metal: 0x4a4668,
  tank: 0x39354f,
  red: 0xff3d5a,
};

// One free edge of a block, as a strip you can hang things on: `fixed` is the wall, `out` a point
// in front of it, and `pt(distance, along, height)` a point in that strip. Awnings, lanterns,
// noren and vending machines all sit on one of these, so they only differ in what they draw.
export const edgeOf = (b, side) => (side === "left"
  ? { at: b.j1 + 0.5, a: b.i0 - 0.5, z: b.i1 + 0.5, pt: (d, t, k) => P(t, b.j1 + 0.5 + d, k) }
  : { at: b.i1 + 0.5, a: b.j0 - 0.5, z: b.j1 + 0.5, pt: (d, t, k) => P(b.i1 + 0.5 + d, t, k) });

/* ---- the LED wall ----------------------------------------------------------------------------- */

// The giant screen: the whole upper face of the building is a picture. It is the brightest thing
// in any street that has one, so it gets a hard bright frame and a halo well beyond the wall.
export function ledScreen(g, glow, b, side, seed, hue = PAL.cyan) {
  const f = side === "left" ? lp : rp;
  const rand = rng(seed);
  const u0 = 0.04, u1 = 0.96, v0 = 0.14, v1 = 0.97;
  g.poly(quad(f, b, u0, u1, v0, v1)).fill(JP.screen);
  const CXn = 16, CYn = 11;
  const du = (u1 - u0) / CXn, dv = (v1 - v0) / CYn;
  for (let cx = 0; cx < CXn; cx++) {
    for (let cy = 0; cy < CYn; cy++) {
      // Two soft blobs and a little noise. An abstract picture reads as a screen; random static
      // reads as a broken one.
      const px = cx / CXn, py = cy / CYn;
      const s = Math.exp(-((px - 0.4) ** 2 * 11 + (py - 0.55) ** 2 * 7))
        + 0.55 * Math.exp(-((px - 0.8) ** 2 * 30 + (py - 0.45) ** 2 * 9));
      const v = s + rand() * 0.2;
      if (v < 0.24) continue;
      const col = v > 0.9 ? PAL.warm : v > 0.58 ? PAL.pink : hue;
      g.poly(quad(f, b, u0 + cx * du, u0 + (cx + 1) * du, v0 + cy * dv, v0 + (cy + 1) * dv))
        .fill({ color: col, alpha: 0.3 + Math.min(0.62, v * 0.6) });
    }
  }
  for (let cy = 0; cy < CYn; cy += 2) {                     // scan lines, barely there
    g.poly(quad(f, b, u0, u1, v0 + cy * dv, v0 + (cy + 0.4) * dv)).fill({ color: 0x000000, alpha: 0.16 });
  }
  g.poly(quad(f, b, u0, u1, v0, v1)).stroke({ width: 2.6, color: PAL.white, alpha: 0.95 });
  glow.poly(quad(f, b, u0 - 0.06, u1 + 0.06, v0 - 0.05, v1 + 0.04)).fill({ color: hue, alpha: 0.16 });
  glow.poly(quad(f, b, u0 - 0.16, u1 + 0.16, v0 - 0.13, v1 + 0.1)).fill({ color: hue, alpha: 0.07 });
  quadLight(quad(f, b, u0, u1, v0, v1), hue, 4);
}

/* ---- signs ------------------------------------------------------------------------------------ */

// Sign boxes stacked down a facade, each a different width and hue. This is the single part that
// most makes the difference — a bare wall is anywhere, a covered one is Tokyo.
export function signStack(g, glow, b, side, seed) {
  const f = side === "left" ? lp : rp;
  const rand = rng(seed);
  const hues = [PAL.pink, PAL.cyan, PAL.warm, PAL.white];
  let v = 0.1, n = 0;
  while (v < 0.9) {
    const h = 0.06 + rand() * 0.055;
    const u0 = 0.08 + rand() * 0.14;
    const u1 = Math.min(0.93, u0 + 0.36 + rand() * 0.4);
    const hue = hues[(n + (rand() < 0.5 ? 0 : 1)) % hues.length];
    g.poly(quad(f, b, u0, u1, v, v + h)).fill(0x140f24);
    g.poly(quad(f, b, u0, u1, v, v + h)).stroke({ width: 1.5, color: hue, alpha: 0.9 });
    for (let s = 0.12; s < 0.8; s += 0.2) {                // abstract bars, never script
      const bu0 = u0 + (u1 - u0) * s, bu1 = bu0 + (u1 - u0) * 0.12;
      g.poly(quad(f, b, bu0, bu1, v + h * 0.28, v + h * 0.72))
        .fill({ color: hue, alpha: 0.6 + rand() * 0.35 });
    }
    glow.poly(quad(f, b, u0 - 0.05, u1 + 0.05, v - 0.02, v + h + 0.02)).fill({ color: hue, alpha: 0.13 });
    quadLight(quad(f, b, u0, u1, v, v + h), hue, 1.6);
    v += h + 0.025 + rand() * 0.045;
    n++;
  }
}

// A horizontal lit band over a shopfront, with bulbs along it — the cinema/pachinko marquee.
export function marquee(g, glow, b, side, hue = PAL.warm) {
  const f = side === "left" ? lp : rp;
  const v0 = 0.62, v1 = 0.82;
  g.poly(quad(f, b, 0.04, 0.96, v0, v1)).fill(0x1a1430);
  g.poly(quad(f, b, 0.04, 0.96, v0, v1)).stroke({ width: 2, color: hue, alpha: 0.9 });
  for (let u = 0.09; u < 0.93; u += 0.075) {
    g.poly(quad(f, b, u, u + 0.03, v0 + 0.05, v1 - 0.05)).fill({ color: PAL.white, alpha: 0.85 });
  }
  glow.poly(quad(f, b, -0.02, 1.02, v0 - 0.06, v1 + 0.06)).fill({ color: hue, alpha: 0.18 });
  quadLight(quad(f, b, 0.04, 0.96, v0, v1), hue, 2.6);
}

/* ---- head height ------------------------------------------------------------------------------ */

// The canopy over the shopfront: a sloped plane out from the wall with one lit edge under it.
export function awning(g, glow, b, side, k, hue = JP.cloth) {
  const e = edgeOf(b, side);
  const back = k + 0.5, front = k + 0.12;
  g.poly([...e.pt(0, e.a, back), ...e.pt(0, e.z, back), ...e.pt(1.15, e.z, front), ...e.pt(1.15, e.a, front)])
    .fill(shade(hue, 0.5));
  g.poly([...e.pt(1.15, e.a, front), ...e.pt(1.15, e.z, front),
    ...e.pt(1.15, e.z, front - 0.22), ...e.pt(1.15, e.a, front - 0.22)]).fill(shade(hue, 0.75));
  // Light trapped under the canopy: the reason the shopfront glows at all.
  glow.poly([...e.pt(0, e.a, back - 0.1), ...e.pt(0, e.z, back - 0.1),
    ...e.pt(1.15, e.z, front - 0.3), ...e.pt(1.15, e.a, front - 0.3)])
    .fill({ color: PAL.warm, alpha: 0.16 });
}

// Lanterns hanging under the canopy. Small, warm, and the only round thing in the picture.
export function lanterns(g, glow, b, side, k, n = 4) {
  const e = edgeOf(b, side);
  for (let s = 0; s < n; s++) {
    const t = e.a + ((e.z - e.a) * (s + 0.5)) / n;
    const [x, y] = e.pt(0.95, t, k + 0.1);
    g.moveTo(x, y - CS * 0.3).lineTo(x, y).stroke({ width: 1, color: JP.metal, alpha: 0.7 });
    g.ellipse(x, y + CS * 0.2, CS * 0.24, CS * 0.3).fill({ color: JP.lantern, alpha: 0.95 });
    g.ellipse(x, y + CS * 0.2, CS * 0.24, CS * 0.3).stroke({ width: 1, color: JP.red, alpha: 0.6 });
    glow.circle(x, y + CS * 0.2, CS * 0.75).fill({ color: JP.lantern, alpha: 0.16 });
    emitLight(x, y + CS * 0.5, CS * 0.5, JP.lantern, 0.5);
  }
}

// The cloth band over an entrance, slit into panels. Warm light leaks out beneath it.
export function noren(g, glow, b, side, k, hue = JP.cloth) {
  const e = edgeOf(b, side);
  const w = e.z - e.a;
  for (let s = 0; s < 5; s++) {
    const t0 = e.a + w * (0.12 + s * 0.155), t1 = t0 + w * 0.13;
    g.poly([...e.pt(0.06, t0, k + 0.95), ...e.pt(0.06, t1, k + 0.95),
      ...e.pt(0.06, t1, k + 0.45), ...e.pt(0.06, t0, k + 0.45)]).fill(shade(hue, 0.8));
    g.poly([...e.pt(0.06, t0, k + 0.86), ...e.pt(0.06, t1, k + 0.86),
      ...e.pt(0.06, t1, k + 0.7), ...e.pt(0.06, t0, k + 0.7)])
      .fill({ color: PAL.warm, alpha: 0.55 });               // the abstract bar on the cloth
  }
  glow.poly([...e.pt(0.05, e.a + w * 0.1, k + 0.5), ...e.pt(0.05, e.a + w * 0.9, k + 0.5),
    ...e.pt(0.05, e.a + w * 0.9, k), ...e.pt(0.05, e.a + w * 0.1, k)])
    .fill({ color: PAL.warm, alpha: 0.3 });
}

// Vending machines against the base: upright lit boxes, the cheapest light in any Japanese street.
export function vending(g, glow, b, side, k, n = 3, seed = 7) {
  const e = edgeOf(b, side);
  const rand = rng(seed);
  const w = e.z - e.a;
  for (let s = 0; s < n; s++) {
    const t0 = e.a + w * (0.1 + s * (0.8 / n)), t1 = t0 + w * (0.5 / n);
    const hue = rand() < 0.5 ? PAL.cyan : PAL.pink;
    const h = k + 0.9;
    g.poly([...e.pt(0.1, t0, h), ...e.pt(0.1, t1, h), ...e.pt(0.1, t1, k), ...e.pt(0.1, t0, k)])
      .fill(0x211c38);
    g.poly([...e.pt(0.1, t0, h), ...e.pt(0.55, t0, h), ...e.pt(0.55, t0, k), ...e.pt(0.1, t0, k)])
      .fill(0x18142a);
    g.poly([...e.pt(0.1, t0, h - 0.12), ...e.pt(0.1, t1, h - 0.12),
      ...e.pt(0.1, t1, k + 0.34), ...e.pt(0.1, t0, k + 0.34)]).fill({ color: hue, alpha: 0.8 });
    glow.poly([...e.pt(0.08, t0, h + 0.1), ...e.pt(0.08, t1, h + 0.1),
      ...e.pt(0.08, t1, k - 0.1), ...e.pt(0.08, t0, k - 0.1)]).fill({ color: hue, alpha: 0.18 });
  }
}

/* ---- the roof as a service yard ---------------------------------------------------------------- */

// AC boxes, a duct and short pipes. Nothing here is lit; it is the dark clutter that makes the
// lit parts read as lit.
export function ventStack(g, b, k, rand) {
  for (let n = 0; n < 3; n++) {
    const i = b.i0 + rand() * (b.i1 - b.i0 + 0.4), j = b.j0 + rand() * (b.j1 - b.j0 + 0.4);
    const s = 0.3 + rand() * 0.2, h = 0.3 + rand() * 0.3;
    const box = { i0: i - s, i1: i + s, j0: j - s, j1: j + s };
    g.poly([...P(box.i1 + 0.5, box.j0 - 0.5, k), ...P(box.i1 + 0.5, box.j1 + 0.5, k),
      ...P(box.i1 + 0.5, box.j1 + 0.5, k + h), ...P(box.i1 + 0.5, box.j0 - 0.5, k + h)])
      .fill(shade(PAL.bodyR, 0.8));
    g.poly([...P(box.i0 - 0.5, box.j1 + 0.5, k), ...P(box.i1 + 0.5, box.j1 + 0.5, k),
      ...P(box.i1 + 0.5, box.j1 + 0.5, k + h), ...P(box.i0 - 0.5, box.j1 + 0.5, k + h)])
      .fill(shade(PAL.bodyL, 0.8));
    g.poly(topFace(box, k + h)).fill(shade(PAL.bodyTop, 0.86));
    g.poly(topFace(box, k + h)).stroke({ width: 0.8, color: JP.metal, alpha: 0.5 });
  }
  for (let n = 0; n < 2; n++) {                              // pipes running over the roof
    const j = b.j0 + rand() * (b.j1 - b.j0 + 1);
    g.moveTo(...P(b.i0 - 0.4, j, k + 0.16)).lineTo(...P(b.i1 + 0.4, j, k + 0.16))
      .stroke({ width: 1.6, color: JP.metal, alpha: 0.55 });
  }
}

// The water tank on its legs — the one roof object that is visible from the street everywhere.
export function waterTank(g, b, k) {
  const i = (b.i0 + b.i1) / 2, j = (b.j0 + b.j1) / 2;
  const r = 0.62, h = 0.85, legs = 0.42;
  for (const [di, dj] of [[-r, -r], [r, -r], [r, r], [-r, r]]) {
    g.moveTo(...P(i + di, j + dj, k)).lineTo(...P(i + di, j + dj, k + legs))
      .stroke({ width: 1.6, color: JP.metal, alpha: 0.8 });
  }
  const box = { i0: i - r, i1: i + r, j0: j - r, j1: j + r };
  g.poly([...P(box.i1 + 0.2, box.j0 - 0.2, k + legs), ...P(box.i1 + 0.2, box.j1 + 0.2, k + legs),
    ...P(box.i1 + 0.2, box.j1 + 0.2, k + legs + h), ...P(box.i1 + 0.2, box.j0 - 0.2, k + legs + h)])
    .fill(shade(JP.tank, 0.85));
  g.poly([...P(box.i0 - 0.2, box.j1 + 0.2, k + legs), ...P(box.i1 + 0.2, box.j1 + 0.2, k + legs),
    ...P(box.i1 + 0.2, box.j1 + 0.2, k + legs + h), ...P(box.i0 - 0.2, box.j1 + 0.2, k + legs + h)])
    .fill(shade(JP.tank, 0.62));
  const [tx, ty] = P(i, j, k + legs + h);
  g.ellipse(tx, ty, (r + 0.2) * CS * 1.4, (r + 0.2) * CS * 0.72).fill(JP.tank);
  g.ellipse(tx, ty, (r + 0.2) * CS * 1.4, (r + 0.2) * CS * 0.72)
    .stroke({ width: 1, color: JP.metal, alpha: 0.6 });
}

// A mast with a red obstruction light. The only red in the picture, and it blinks in the city.
export function mast(g, glow, b, k, h = 2.2) {
  const i = (b.i0 + b.i1) / 2, j = (b.j0 + b.j1) / 2;
  g.moveTo(...P(i, j, k)).lineTo(...P(i, j, k + h)).stroke({ width: 1.4, color: JP.metal, alpha: 0.85 });
  for (const f of [0.45, 0.7]) {
    const [ax, ay] = P(i - 0.35, j, k + h * f), [bx, by] = P(i + 0.35, j, k + h * f);
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: 1, color: JP.metal, alpha: 0.5 });
  }
  const [hx, hy] = P(i, j, k + h);
  g.circle(hx, hy, 1.6).fill({ color: JP.red, alpha: 0.95 });
  glow.circle(hx, hy, 6).fill({ color: JP.red, alpha: 0.22 });
}

/* ---- what ties it together ---------------------------------------------------------------------- */

// Cables sagging away from a pole. Drawn as sampled curves, because a straight cable reads as a
// wire frame and a sagging one reads as a street.
export function cableRun(g, i, j, k, di, dj, dk = -0.4, n = 4, seed = 3) {
  const rand = rng(seed);
  g.moveTo(...P(i, j, 0)).lineTo(...P(i, j, k)).stroke({ width: 1.8, color: JP.metal, alpha: 0.85 });
  for (let c = 0; c < n; c++) {
    const off = (c - (n - 1) / 2) * 0.16;
    const sag = 0.5 + rand() * 0.5;
    const k0 = k - 0.12 - c * 0.16;
    for (let s = 0; s <= 1.0001; s += 0.1) {
      const x = i + di * s + off, y = j + dj * s + off;
      const h = k0 + dk * s - Math.sin(s * Math.PI) * sag;
      const p = P(x, y, h);
      if (s === 0) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]);
    }
    g.stroke({ width: 1, color: 0x100d1c, alpha: 0.85 });
  }
}

// A neon gate at street level: two posts and two beams, drawn as light rather than as stone.
export function gate(g, glow, i, j, k, span = 1.6, h = 2.2, hue = JP.red) {
  const post = (dj) => {
    const [ax, ay] = P(i, j + dj, k), [bx, by] = P(i, j + dj, k + h);
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: 3.4, color: shade(hue, 0.5) });
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: 1.4, color: hue, alpha: 0.95 });
    glow.moveTo(ax, ay).lineTo(bx, by).stroke({ width: 9, color: hue, alpha: 0.16 });
  };
  post(-span / 2); post(span / 2);
  for (const [hh, over, w] of [[h, 0.5, 3.4], [h * 0.78, 0.15, 2.4]]) {
    const [ax, ay] = P(i, j - span / 2 - over, k + hh), [bx, by] = P(i, j + span / 2 + over, k + hh);
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: w, color: shade(hue, 0.55) });
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: w * 0.45, color: hue, alpha: 0.95 });
    glow.moveTo(ax, ay).lineTo(bx, by).stroke({ width: w * 3, color: hue, alpha: 0.15 });
  }
}

// Capsule pods jutting off a shaft, each with one round lit window. The pods are the building.
export function capsulePods(g, glow, b, seed) {
  const rand = rng(seed);
  const floors = b.k1 - b.k0 + 1;
  for (let k = 0; k < floors; k++) {
    for (const side of ["right", "left"]) {
      if (rand() < 0.3) continue;
      const kk = b.k0 + k + 0.1, h = 0.8;
      const out = 0.5 + rand() * 0.35;
      const pod = side === "right"
        ? { i0: b.i1 + 0.5, i1: b.i1 + 0.5 + out, j0: b.j0 - 0.4, j1: b.j1 + 0.4 }
        : { i0: b.i0 - 0.4, i1: b.i1 + 0.4, j0: b.j1 + 0.5, j1: b.j1 + 0.5 + out };
      g.poly([...P(pod.i1, pod.j0, kk), ...P(pod.i1, pod.j1, kk),
        ...P(pod.i1, pod.j1, kk + h), ...P(pod.i1, pod.j0, kk + h)]).fill(shade(PAL.bodyR, 0.95));
      g.poly([...P(pod.i0, pod.j1, kk), ...P(pod.i1, pod.j1, kk),
        ...P(pod.i1, pod.j1, kk + h), ...P(pod.i0, pod.j1, kk + h)]).fill(shade(PAL.bodyL, 0.95));
      g.poly([...P(pod.i0, pod.j0, kk + h), ...P(pod.i1, pod.j0, kk + h),
        ...P(pod.i1, pod.j1, kk + h), ...P(pod.i0, pod.j1, kk + h)]).fill(shade(PAL.bodyTop, 1));
      const [cx, cy] = side === "right"
        ? P(pod.i1, (pod.j0 + pod.j1) / 2, kk + h * 0.55)
        : P((pod.i0 + pod.i1) / 2, pod.j1, kk + h * 0.55);
      const lit = rand() < 0.72;
      g.circle(cx, cy, CS * 0.3).fill({ color: lit ? PAL.white : PAL.glass, alpha: lit ? 0.9 : 1 });
      g.circle(cx, cy, CS * 0.3).stroke({ width: 1, color: PAL.cyanLo, alpha: lit ? 0.6 : 0.2 });
      if (lit) glow.circle(cx, cy, CS * 0.8).fill({ color: PAL.cyan, alpha: 0.16 });
    }
  }
}

// The small dark plinth every mockup building stands on, so it sits on something instead of
// floating, plus one pool of its own light on the ground.
export function padSlab(g, glow, foot, hue = PAL.pink) {
  const m = 1.1, h = 0.5;
  const b = { i0: foot.i0 - m, i1: foot.i1 + m, j0: foot.j0 - m, j1: foot.j1 + m };
  g.poly([...P(b.i1 + 0.5, b.j0 - 0.5, 0), ...P(b.i1 + 0.5, b.j1 + 0.5, 0),
    ...P(b.i1 + 0.5, b.j1 + 0.5, -h), ...P(b.i1 + 0.5, b.j0 - 0.5, -h)]).fill(PAL.slabR);
  g.poly([...P(b.i0 - 0.5, b.j1 + 0.5, 0), ...P(b.i1 + 0.5, b.j1 + 0.5, 0),
    ...P(b.i1 + 0.5, b.j1 + 0.5, -h), ...P(b.i0 - 0.5, b.j1 + 0.5, -h)]).fill(PAL.slabL);
  g.poly(topFace(b, 0)).fill(PAL.slabTop);
  g.poly(topFace(b, 0)).stroke({ width: 1.2, color: PAL.slabEdge, alpha: 0.4 });
  const [x, y] = P((b.i0 + b.i1) / 2, (b.j0 + b.j1) / 2, 0);
  for (let n = 4; n >= 1; n--) {
    glow.ellipse(x, y, (b.i1 - b.i0) * CS * 0.9 * (n / 4), (b.i1 - b.i0) * CS * 0.45 * (n / 4))
      .fill({ color: hue, alpha: 0.04 });
  }
}
