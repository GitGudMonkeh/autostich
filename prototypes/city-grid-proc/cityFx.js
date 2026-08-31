// City effects — atmosphere, life and city-scale signals for the interactive city.
//
// Everything here is drawing only; the animation lives in city.js, which owns the tickers and
// the grid state. The rules are the same as for the other renderers: real grid coordinates
// (a, b are tile units, h is pixels above the ground) and one lead colour per object.

import { Graphics } from "./vendor/pixi.min.mjs";
import { TILE_W, TILE_H, CS, P, rng } from "./buildings.js";
import { pt } from "./streetRender.js";

const FX_HAZE = 0x2e2456;          // the colour the far field fades towards
const FX_GLASS = 0x0d0a20;

/* ---- atmosphere -------------------------------------------------------------------------- */

// Depth haze. Cells with the same (r + c) sit on the same screen line, so one horizontal strip
// per depth is an exact atmospheric slice: it veils everything further away and nothing nearer.
export function hazeStrip(depth, grid) {
  const g = new Graphics();
  const y = depth * (TILE_H / 2), half = TILE_H * 0.62, w = grid * TILE_W * 0.62;
  const a = 0.075 * Math.max(0, 1 - depth / (grid * 0.8));
  if (a <= 0.002) return null;
  g.rect(-w, y - half, w * 2, half * 2).fill({ color: FX_HAZE, alpha: a });
  return g;
}

// The horizon: a dark skyline with a few lit windows and blinking masts, plus the glow the city
// throws onto the sky. Without it the grid floats in nothing.
export function skyline(grid, seed) {
  const node = new Graphics();
  const masts = [];
  const rand = rng(seed);
  const w = grid * TILE_W * 0.58, base = -TILE_H * 0.75;
  const glow = new Graphics();
  glow.blendMode = "add";
  for (let n = 5; n >= 1; n--) {                       // the glow the city throws on the sky
    glow.ellipse(0, base, w * (0.4 + n * 0.14), 26 + n * 12).fill({ color: 0x2e1a55, alpha: 0.045 });
  }
  let x = -w;
  while (x < w) {
    const bw = 14 + rand() * 30;
    const far = 0.4 + rand() * 0.6;                    // further towers are darker and shorter
    const bh = (12 + rand() * 34) * far;
    node.rect(x, base - bh, bw, bh).fill(far > 0.75 ? 0x151030 : 0x100c22);
    node.rect(x, base - bh, bw, 1).fill({ color: 0x241c47, alpha: 0.9 });
    for (let i = 0; i < Math.max(1, Math.floor(bw / 7)); i++) {
      for (let k = 0; k < Math.floor(bh / 9); k++) {   // sparse lit windows
        if (rand() > 0.1) continue;
        node.rect(x + 2 + i * 7, base - bh + 4 + k * 9, 2, 2.6)
          .fill({ color: 0xffce8a, alpha: 0.2 + rand() * 0.3 });
      }
    }
    if (bw > 26 && rand() < 0.45) {                    // mast with a beacon
      const mx = x + bw / 2, my = base - bh, top = my - 9 - rand() * 9;
      node.moveTo(mx, my).lineTo(mx, top).stroke({ width: 1, color: 0x241c47 });
      masts.push({ x: mx, y: top, phase: rand() * 6.28 });
    }
    x += bw + 3 + rand() * 11;
  }
  // The same haze that veils the far cells is laid over the horizon, or the skyline reads as a
  // cardboard cutout standing in front of the city instead of behind it. It is stacked in bands
  // that thin out upwards — one flat rectangle leaves a hard edge across the sky.
  for (let n = 0; n < 9; n++) {
    node.rect(-w, base - (n + 1) * 15, w * 2, 16).fill({ color: FX_HAZE, alpha: 0.055 * (1 - n / 9) });
  }
  for (let n = 0; n < 4; n++) {                       // and thin out downwards into the grid
    node.rect(-w, base - 8 + n * 9, w * 2, 10).fill({ color: FX_HAZE, alpha: 0.1 * (1 - n / 4) });
  }
  const beacons = new Graphics();
  beacons.blendMode = "add";
  return { node, glow, beacons, masts };
}

export function drawBeacons(g, masts, t) {
  g.clear();
  for (const m of masts) {
    const f = (Math.sin(t * 1.6 + m.phase) + 1) / 2;
    if (f < 0.55) continue;
    const a = (f - 0.55) / 0.45;
    g.circle(m.x, m.y, 1.6).fill({ color: 0xff7a6a, alpha: a });
    g.circle(m.x, m.y, 4.5).fill({ color: 0xff7a6a, alpha: a * 0.18 });
  }
}

/* ---- light ------------------------------------------------------------------------------- */

// A volumetric cone under a lamp or a floating display. Three nested fans do the falloff; a
// single flat triangle reads as a paper cutout.
export function lightCone(g, a, b, h, colour, spread = 0.34) {
  const [hx, hy] = pt(a, b, h);
  const [gx, gy] = pt(a, b, 0);
  for (let n = 3; n >= 1; n--) {
    const rx = TILE_W * 0.5 * spread * (n / 3), ry = rx * 0.5;
    g.poly([hx - 1.5, hy, gx - rx, gy, gx, gy + ry, gx + rx, gy, hx + 1.5, hy])
      .fill({ color: colour, alpha: 0.042 });
  }
}

// Wet asphalt. The sign itself is not mirrored pixel for pixel — a smear that keeps the colour
// and loses the shape is what a wet road actually does, and it costs one polygon per band.
export function wetSmear(g, a, b, colour, width = 13, bands = 11) {
  const [x, y] = pt(a, b, 0);
  const rand = rng(Math.round((a * 733 + b * 977) * 100));
  for (let n = 0; n < bands; n++) {
    const t = n / bands;
    const w0 = width * (1 - t * 0.35), w1 = width * (1 - (t + 1 / bands) * 0.35);
    const j = (rand() - 0.5) * width * 0.5 * t;
    g.poly([x - w0 + j, y + n * 3.4, x + w0 + j, y + n * 3.4,
      x + w1 + j, y + (n + 1) * 3.4, x - w1 + j, y + (n + 1) * 3.4])
      .fill({ color: colour, alpha: 0.16 * (1 - t) * (1 - t) });
  }
}

/* ---- city-scale signals ------------------------------------------------------------------ */

// The net pulse: one bright line running down the hologrid, plus a soft body behind it.
export function pulseBand(g, w, colour) {
  g.clear();
  for (let n = 3; n >= 1; n--) {
    g.rect(-w, -n * 7, w * 2, n * 14).fill({ color: colour, alpha: 0.02 });
  }
  // Tapered ends: a hard line running edge to edge reads as a UI artefact, not as a scan.
  g.rect(-w * 0.62, -0.7, w * 1.24, 1.4).fill({ color: 0xd8f4ff, alpha: 0.3 });
  g.rect(-w, -0.7, w * 0.38, 1.4).fill({ color: 0xd8f4ff, alpha: 0.12 });
  g.rect(w * 0.62, -0.7, w * 0.38, 1.4).fill({ color: 0xd8f4ff, alpha: 0.12 });
}

// The shock ring a finished building throws across its plot.
export function shockRing(g, f) {
  g.clear();
  const s = 0.35 + f * 2.2, a = Math.pow(1 - f, 1.7);
  const rx = TILE_W * 0.5 * s, ry = TILE_H * 0.5 * s;
  g.poly([0, -ry, rx, 0, 0, ry, -rx, 0]).stroke({ width: 2.4, color: 0xbfeaff, alpha: a * 0.85 });
  g.poly([0, -ry * 0.82, rx * 0.82, 0, 0, ry * 0.82, -rx * 0.82, 0])
    .stroke({ width: 1.2, color: 0x8ceaff, alpha: a * 0.4 });
}

/* ---- life -------------------------------------------------------------------------------- */

// A pedestrian is a light, not a figure: at this scale a drawn person is mush, a moving point
// with a halo and a short body reads instantly.
export function walkerDot(g, colour) {
  g.clear();
  g.ellipse(0, 1.5, 4.6, 2.3).fill({ color: 0x000000, alpha: 0.45 });
  g.ellipse(0, 1.5, 7, 3.5).fill({ color: colour, alpha: 0.12 });      // light pooling at the feet
  g.moveTo(0, 1).lineTo(0, -6).stroke({ width: 2.2, color: colour, alpha: 0.95 });
  g.circle(0, -7, 2).fill({ color: 0xffffff, alpha: 0.95 });
  g.circle(0, -6, 5.5).fill({ color: colour, alpha: 0.2 });
}

// People standing still: a shop queue, a knot at the crossing. Movement alone is not life —
// a city where everyone is walking and nobody is waiting reads as a conveyor belt.
export function crowdCluster(g, a, b, rand, colour) {
  for (let n = 0; n < 3 + Math.floor(rand() * 3); n++) {
    const [x, y] = pt(a + (rand() - 0.5) * 0.34, b + (rand() - 0.5) * 0.34, 3);
    const c = rand() < 0.5 ? colour : 0xffd8a0;
    g.ellipse(x, y + 1.5, 4, 2).fill({ color: 0x000000, alpha: 0.4 });
    g.moveTo(x, y + 1).lineTo(x, y - 5).stroke({ width: 2, color: c, alpha: 0.85 });
    g.circle(x, y - 6, 1.7).fill({ color: 0xffffff, alpha: 0.85 });
    g.circle(x, y - 5, 4.5).fill({ color: c, alpha: 0.14 });
  }
}

// Steam off a street vent. Nothing says "this street is warm and lived in" as cheaply.
export function ventPlume(g, x, y, t, colour) {
  g.clear();
  for (let n = 0; n < 5; n++) {
    const f = ((t * 0.4 + n / 5) % 1);
    const rise = f * 26;
    g.ellipse(x + Math.sin((f + n) * 3.1) * 4, y - rise, 5 + f * 11, (5 + f * 11) * 0.5)
      .fill({ color: colour, alpha: 0.11 * (1 - f) });
  }
  g.ellipse(x, y, 7, 3.5).fill({ color: colour, alpha: 0.1 });
}

// The shadow an aircraft drops on the ground — the thing that actually sells the altitude.
export function flyerShadow(g) {
  g.clear();
  g.ellipse(0, 0, 13, 6.5).fill({ color: 0x000000, alpha: 0.4 });
  g.ellipse(0, 0, 20, 10).fill({ color: 0x000000, alpha: 0.16 });
}

export function flyerLights(g, t, colour) {
  g.clear();
  const f = (Math.sin(t * 5) + 1) / 2;
  g.circle(-11, 1, 1.5).fill({ color: 0xff6a5a, alpha: 0.35 + f * 0.65 });
  g.circle(11, 1, 1.5).fill({ color: 0x7cffc4, alpha: 0.35 + (1 - f) * 0.65 });
  g.circle(0, -6, 4.5).fill({ color: colour, alpha: 0.1 + f * 0.1 });
}

/* ---- rooftops ---------------------------------------------------------------------------- */

// Roof life. One prop per building, at the centre of whatever cells are actually on top —
// taken from the silhouette's centroid it ends up hanging in the air beside the roof.
export function roofProps(g, cells, maxK, seed) {
  const rand = rng(seed * 2654435761 + 17);
  const top = cells.filter(([, , k]) => k === maxK);
  if (!top.length) return null;
  let si = 0, sj = 0;
  for (const [i, j] of top) { si += i; sj += j; }
  const ci = si / top.length, cj = sj / top.length;
  const [x, y] = P(ci, cj, maxK + 1);
  const roll = rand();
  if (roll < 0.3) {                                    // helipad
    g.ellipse(x, y, CS * 1.5, CS * 0.75).fill({ color: 0x1b1636 });
    g.ellipse(x, y, CS * 1.5, CS * 0.75).stroke({ width: 1, color: 0xe9e6ff, alpha: 0.5 });
    g.ellipse(x, y, CS * 0.9, CS * 0.45).stroke({ width: 1, color: 0xe9e6ff, alpha: 0.35 });
    for (let n = 0; n < 6; n++) {
      const a = (n / 6) * Math.PI * 2;
      g.circle(x + Math.cos(a) * CS * 1.5, y + Math.sin(a) * CS * 0.75, 0.9)
        .fill({ color: 0xffd08a, alpha: 0.85 });
    }
    return { kind: "pad", x, y };
  }
  if (roll < 0.58) {                                   // water tank on a frame
    const w = CS * 0.9, h = CS * 1.5;
    g.ellipse(x, y - h, w, w * 0.5).fill(0x2f2a52);
    g.poly([x - w, y - h, x - w, y - h * 0.35, x, y - h * 0.35 + w * 0.5, x + w, y - h * 0.35,
      x + w, y - h]).fill(0x211c40);
    g.ellipse(x, y - h, w, w * 0.5).stroke({ width: 1, color: 0x5a5480, alpha: 0.8 });
    for (const dx of [-w, w]) {
      g.moveTo(x + dx, y - h * 0.35).lineTo(x + dx * 0.7, y).stroke({ width: 1, color: 0x5a5480, alpha: 0.7 });
    }
    return { kind: "tank", x, y };
  }
  if (roll < 0.8) {                                    // roof garden
    g.ellipse(x, y, CS * 1.6, CS * 0.8).fill({ color: 0x143a2a });
    g.ellipse(x, y, CS * 1.6, CS * 0.8).stroke({ width: 1, color: 0x1e5c3c, alpha: 0.8 });
    for (let n = 0; n < 5; n++) {
      const px = x + (rand() - 0.5) * CS * 2.4, py = y + (rand() - 0.5) * CS * 1.0;
      g.moveTo(px, py).lineTo(px, py - CS * 0.7).stroke({ width: 1, color: 0x2a5c3a });
      g.circle(px, py - CS * 0.9, CS * 0.36).fill({ color: 0x2f7a4e, alpha: 0.95 });
    }
    return { kind: "garden", x, y };
  }
  return null;                                         // the tallest get a billboard instead
}

// A holo billboard for the crown of a tower: panel, scanlines, halo and the mast holding it.
export function roofBillboard(g, glow, cells, maxK, seed, colour) {
  const rand = rng(seed * 40503 + 91);
  const top = cells.filter(([, , k]) => k === maxK);
  if (!top.length) return null;
  let si = 0, sj = 0;
  for (const [i, j] of top) { si += i; sj += j; }
  const [x, y0] = P(si / top.length, sj / top.length, maxK + 1);
  const h = CS * 2.6, w = CS * 2.2, y = y0 - h;
  g.moveTo(x, y0).lineTo(x, y + CS * 0.9).stroke({ width: 1.2, color: 0x5a5480, alpha: 0.9 });
  g.poly([x - w, y - CS * 0.9, x + w, y - CS * 0.9, x + w, y + CS * 0.9, x - w, y + CS * 0.9])
    .fill({ color: FX_GLASS, alpha: 0.85 })
    .stroke({ width: 1.2, color: colour, alpha: 0.9 });
  for (let n = 0; n < 5; n++) {                        // content: bars, not letters
    const bw = w * (0.3 + rand() * 1.4);
    g.rect(x - w + 2, y - CS * 0.7 + n * CS * 0.34, bw, CS * 0.16)
      .fill({ color: colour, alpha: 0.35 + rand() * 0.4 });
  }
  glow.poly([x - w - 2, y - CS - 1, x + w + 2, y - CS - 1, x + w + 2, y + CS + 1, x - w - 2, y + CS + 1])
    .fill({ color: colour, alpha: 0.1 });
  return { x, y, w, h };
}

// The lift: one lit cabin running up the right-hand face of the building.
export function liftFace(cells) {
  let best = null;
  for (const [i, j, k] of cells) {
    if (!best || i > best.i || (i === best.i && j < best.j)) best = { i, j, k };
  }
  if (!best) return null;
  const col = cells.filter(([i, j]) => i === best.i && j === best.j).map(([, , k]) => k);
  return { i: best.i, j: best.j, minK: Math.min(...col), maxK: Math.max(...col) };
}

export function liftCab(g, face, k, colour) {
  g.clear();
  if (!face) return;
  const { i, j } = face;
  const q = [
    ...P(i + 0.5, j - 0.42, k), ...P(i + 0.5, j + 0.42, k),
    ...P(i + 0.5, j + 0.42, k + 0.85), ...P(i + 0.5, j - 0.42, k + 0.85)];
  g.poly(q).fill({ color: colour, alpha: 0.8 });
  g.poly(q).stroke({ width: 1, color: 0xffffff, alpha: 0.5 });
  const halo = [                                       // spill onto the floors above and below
    ...P(i + 0.5, j - 0.5, k - 0.6), ...P(i + 0.5, j + 0.5, k - 0.6),
    ...P(i + 0.5, j + 0.5, k + 1.45), ...P(i + 0.5, j - 0.5, k + 1.45)];
  g.poly(halo).fill({ color: colour, alpha: 0.13 });
}
