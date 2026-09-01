// Street parts in the reference language — the ground between the buildings.
//
// Shared by the street study (neonstreet.js) and the water study (neonwater.js). The rule is the
// one the facades already follow: the street is DARK and almost colourless, and everything you
// see on it is light that fell there. Asphalt is the darkest surface in the picture, the footway
// one step up in both value and height, the kerb a thin bright line — then pink and cyan pools
// where a shopfront faces the street. Markings stay white and sparse.

import { CS, ISO, P } from "./buildings.js";
import { PAL } from "./refRender.js";

const ROAD = {
  asphalt: 0x0f0e19,          // the darkest surface in the picture
  walk: 0x2a2743,             // footway, one step up in value as well as in height
  kerb: 0x1b192c,
  edge: 0x9aa6d8,             // the thin bright line along every kerb
  line: 0xe8ecff,
  rail: 0x4a4c6b,
};
export const WALK_H = 0.34;          // footway height in lattice units

/* ---- ground -------------------------------------------------------------------------------- */

export const plate = (i0, i1, j0, j1, h) => [
  ...P(i0, j0, h), ...P(i1, j0, h), ...P(i1, j1, h), ...P(i0, j1, h)];

// A raised footway plot: top face, the two visible kerb faces, and the light line along its edge.
export function footway(g, i0, i1, j0, j1) {
  g.poly([...P(i1, j0, WALK_H), ...P(i1, j1, WALK_H), ...P(i1, j1, 0), ...P(i1, j0, 0)]).fill(ROAD.kerb);
  g.poly([...P(i0, j1, WALK_H), ...P(i1, j1, WALK_H), ...P(i1, j1, 0), ...P(i0, j1, 0)]).fill(ROAD.kerb);
  g.poly(plate(i0, i1, j0, j1, WALK_H)).fill(ROAD.walk);
  g.poly(plate(i0, i1, j0, j1, WALK_H)).stroke({ width: 1.2, color: ROAD.edge, alpha: 0.42 });
  for (let i = i0 + 1.6; i < i1; i += 1.6) {                  // paving joints, barely there
    g.moveTo(...P(i, j0, WALK_H)).lineTo(...P(i, j1, WALK_H));
  }
  for (let j = j0 + 1.6; j < j1; j += 1.6) {
    g.moveTo(...P(i0, j, WALK_H)).lineTo(...P(i1, j, WALK_H));
  }
  g.stroke({ width: 0.7, color: ROAD.edge, alpha: 0.09 });
}

// Dashes down the middle of a carriageway. `along` is "i" for a street running along +i.
export function centreLine(g, along, at, from, to) {
  const step = 1.6, dash = 0.9;
  for (let t = from; t < to; t += step) {
    const a = along === "i" ? P(t, at, 0.01) : P(at, t, 0.01);
    const b = along === "i" ? P(Math.min(t + dash, to), at, 0.01) : P(at, Math.min(t + dash, to), 0.01);
    g.moveTo(a[0], a[1]).lineTo(b[0], b[1]);
  }
  g.stroke({ width: 1.6, color: ROAD.line, alpha: 0.5 });
}

// A crossing: bars laid across one arm of a street. `axis` is the direction the street runs,
// `at` where along it the crossing sits, and from/to how far the bars reach across it.
export function crossing(g, axis, at, from, to) {
  const half = 0.62, bar = 0.34;
  for (let s = from; s < to - bar; s += 0.66) {
    const q = axis === "i"
      ? [...P(at - half, s, 0.01), ...P(at + half, s, 0.01),
        ...P(at + half, s + bar, 0.01), ...P(at - half, s + bar, 0.01)]
      : [...P(s, at - half, 0.01), ...P(s + bar, at - half, 0.01),
        ...P(s + bar, at + half, 0.01), ...P(s, at + half, 0.01)];
    g.poly(q).fill({ color: ROAD.line, alpha: 0.45 });
  }
}

// Tram rails: two thin lines and the sleepers between them. The reference has a tram, so the
// street it stands on has to admit that it exists.
export function rails(g, at, from, to) {
  for (const d of [-0.42, 0.42]) {
    g.moveTo(...P(from, at + d, 0.02)).lineTo(...P(to, at + d, 0.02));
  }
  g.stroke({ width: 1.4, color: ROAD.rail, alpha: 0.85 });
  for (let t = from; t < to; t += 0.8) {
    g.moveTo(...P(t, at - 0.6, 0.01)).lineTo(...P(t, at + 0.6, 0.01));
  }
  g.stroke({ width: 1, color: ROAD.rail, alpha: 0.3 });
}

/* ---- light on the ground -------------------------------------------------------------------- */

// The whole point of the street: it is a screen for the light above it. A pool is nested ellipses,
// never one flat blob — a single ellipse reads as paint, not as light.
export function pool(glow, i, j, r, colour, strength = 1) {
  const [x, y] = P(i, j, 0);
  for (let n = 5; n >= 1; n--) {
    glow.ellipse(x, y, r * CS * (n / 5), r * CS * ISO * (n / 5))
      .fill({ color: colour, alpha: 0.045 * strength });
  }
}

// A street lamp: a thin pole, a small white head, and a pool that is much wider than the lamp.
export function lamp(g, glow, i, j, h = 2.6) {
  g.moveTo(...P(i, j, 0)).lineTo(...P(i, j, h)).stroke({ width: 1.2, color: PAL.steel, alpha: 0.7 });
  const [hx, hy] = P(i, j, h);
  g.circle(hx, hy, 1.8).fill({ color: PAL.white, alpha: 0.95 });
  glow.circle(hx, hy, 6).fill({ color: PAL.white, alpha: 0.14 });
  pool(glow, i, j, 2.6, PAL.white, 0.8);
}

/* ---- vehicles ------------------------------------------------------------------------------- */

// Tiny, dark, and identified by their lights: white ahead, pink behind. At this scale a modelled
// car is mush; two lights and a shadow read instantly.
export function car(g, glow, i, j, dir, colour = PAL.cyan) {
  const L = 1.5, W = 0.6, H = 0.55;
  const b = dir === "i"
    ? { i0: i - L, i1: i + L, j0: j - W, j1: j + W }
    : { i0: i - W, i1: i + W, j0: j - L, j1: j + L };
  const [sx, sy] = P(i, j, 0);
  g.ellipse(sx, sy + 1, (dir === "i" ? L : W) * CS * 1.2, CS * 0.4).fill({ color: 0x000000, alpha: 0.35 });
  g.poly([...P(b.i1, b.j0, 0), ...P(b.i1, b.j1, 0), ...P(b.i1, b.j1, H), ...P(b.i1, b.j0, H)])
    .fill(0x231f38);
  g.poly([...P(b.i0, b.j1, 0), ...P(b.i1, b.j1, 0), ...P(b.i1, b.j1, H), ...P(b.i0, b.j1, H)])
    .fill(0x191530);
  g.poly(plate(b.i0, b.i1, b.j0, b.j1, H)).fill(0x2e2a48);
  g.poly(plate(b.i0 + 0.35, b.i1 - 0.35, b.j0 + 0.12, b.j1 - 0.12, H + 0.001))
    .fill({ color: colour, alpha: 0.3 });                      // lit cabin
  const head = dir === "i" ? P(b.i1, j, H * 0.6) : P(i, b.j1, H * 0.6);
  const tail = dir === "i" ? P(b.i0, j, H * 0.6) : P(i, b.j0, H * 0.6);
  g.circle(head[0], head[1], 1.3).fill({ color: PAL.white, alpha: 0.95 });
  g.circle(tail[0], tail[1], 1.1).fill({ color: PAL.pink, alpha: 0.9 });
  glow.circle(head[0], head[1], 5).fill({ color: PAL.white, alpha: 0.16 });
  glow.circle(tail[0], tail[1], 4).fill({ color: PAL.pink, alpha: 0.14 });
  pool(glow, dir === "i" ? i + 2.2 : i, dir === "i" ? j : j + 2.2, 1.5, PAL.white, 0.7);
}

// The tram from the reference, standing on its rails: a long body, all windows, one lit strip.
export function tram(g, glow, i0, i1, j) {
  const b = { i0, i1, j0: j - 0.7, j1: j + 0.7, k0: 0.1, k1: 1.5 };
  g.poly([...P(b.i1, b.j0, b.k0), ...P(b.i1, b.j1, b.k0), ...P(b.i1, b.j1, b.k1), ...P(b.i1, b.j0, b.k1)])
    .fill(0x2b2942);
  g.poly([...P(b.i0, b.j1, b.k0), ...P(b.i1, b.j1, b.k0), ...P(b.i1, b.j1, b.k1), ...P(b.i0, b.j1, b.k1)])
    .fill(0x211f36);
  g.poly(plate(b.i0, b.i1, b.j0, b.j1, b.k1)).fill(0x3a3856);
  const f = (u, v) => P(b.i0 + u * (b.i1 - b.i0), b.j1, b.k0 + v * (b.k1 - b.k0));
  for (let u = 0.04; u < 0.94; u += 0.1) {
    g.poly([...f(u, 0.32), ...f(u + 0.07, 0.32), ...f(u + 0.07, 0.82), ...f(u, 0.82)])
      .fill({ color: PAL.white, alpha: 0.85 });
    glow.poly([...f(u - 0.015, 0.24), ...f(u + 0.085, 0.24), ...f(u + 0.085, 0.9), ...f(u - 0.015, 0.9)])
      .fill({ color: PAL.cyan, alpha: 0.07 });
  }
  g.poly([...f(0, 0.12), ...f(1, 0.12), ...f(1, 0.2), ...f(0, 0.2)]).fill({ color: PAL.cyan, alpha: 0.85 });
  pool(glow, (i0 + i1) / 2, j - 1.6, 3.4, PAL.cyan, 0.8);
}

/* ---- the layout ----------------------------------------------------------------------------- */

// Four blocks around a crossing. The streets are 4.4 lattice cells wide — wide enough for two
// lanes and a tram, narrow enough that the buildings still form a canyon.
export const A0 = -0.5, A1 = 8.5, B0 = 12.9, B1 = 21.9;             // block extents along i
export const C0 = -0.5, C1 = 8.5, D0 = 12.9, D1 = 21.9;             // and along j
export const MIDI = (A1 + B0) / 2, MIDJ = (C1 + D0) / 2;

// Buildings per quadrant. They sit on the footway, so every k0 starts at the footway height.
export const K = WALK_H;
export const STREET_BLOCKS = [
  // north-west: the tall stack with the neon square
  { i0: 1, i1: 3, j0: 1, j1: 3, k0: K, k1: K + 4, temp: "hot", cols: 2, lit: 0.75, roof: "rail", pylon: true },
  { i0: 1, i1: 3, j0: 1, j1: 3, k0: K + 5, k1: K + 7, temp: "cool", cols: 2, lit: 0.8, roof: "sign", dark: 0.92 },
  { i0: 5, i1: 7, j0: 1, j1: 4, k0: K, k1: K + 2, temp: "cool", cols: 3, lit: 0.85, roof: "garden" },
  { i0: 1, i1: 4, j0: 5, j1: 7, k0: K, k1: K + 1, temp: "warm", cols: 3, lit: 0.95, roof: "plant" },

  // north-east: the corporate slab and a low shop row
  { i0: 14, i1: 16, j0: 1, j1: 3, k0: K, k1: K + 5, temp: "cool", cols: 2, lit: 0.7, roof: "rail" },
  { i0: 14, i1: 15, j0: 1, j1: 2, k0: K + 6, k1: K + 7, temp: "cool", cols: 2, lit: 0.9, roof: "plant" },
  { i0: 18, i1: 20, j0: 1, j1: 3, k0: K, k1: K + 2, temp: "hot", cols: 2, lit: 0.85, roof: "sign" },
  { i0: 14, i1: 20, j0: 5, j1: 7, k0: K, k1: K + 1, temp: "hot", cols: 3, lit: 0.92, roof: "garden",
    wallSign: "pink" },

  // south-west: shops along the tram street
  { i0: 1, i1: 3, j0: 14, j1: 16, k0: K, k1: K + 3, temp: "hot", cols: 2, lit: 0.8, roof: "signCyan" },
  { i0: 5, i1: 7, j0: 14, j1: 17, k0: K, k1: K + 1, temp: "cool", cols: 3, lit: 0.95, roof: "garden" },
  { i0: 1, i1: 4, j0: 18, j1: 20, k0: K, k1: K + 2, temp: "warm", cols: 3, lit: 0.85, roof: "rail" },

  // south-east: the corner block with the big lit shopfront
  { i0: 14, i1: 17, j0: 14, j1: 16, k0: K, k1: K + 2, temp: "cool", cols: 3, lit: 0.9, roof: "garden",
    wallSign: "cyan" },
  { i0: 19, i1: 20, j0: 14, j1: 16, k0: K, k1: K + 4, temp: "hot", cols: 2, lit: 0.8, roof: "sign" },
  { i0: 14, i1: 20, j0: 18, j1: 20, k0: K, k1: K + 1, temp: "hot", cols: 3, lit: 0.9, roof: "plant" },
];

export function streetGround(g, glow, { slab = true } = {}) {
  // The slab: everything sits on it, and it is what the light pools onto. The water study draws
  // its own quay instead, so the sides can be switched off.
  const m = 1.6;
  if (slab) {
  g.poly([...P(B1 + m, C0 - m, 0), ...P(B1 + m, D1 + m, 0), ...P(B1 + m, D1 + m, -0.8), ...P(B1 + m, C0 - m, -0.8)])
    .fill(0x0b0a12);
  g.poly([...P(A0 - m, D1 + m, 0), ...P(B1 + m, D1 + m, 0), ...P(B1 + m, D1 + m, -0.8), ...P(A0 - m, D1 + m, -0.8)])
    .fill(0x07070d);
  }
  g.poly(plate(A0 - m, B1 + m, C0 - m, D1 + m, 0)).fill(ROAD.asphalt);
  g.poly(plate(A0 - m, B1 + m, C0 - m, D1 + m, 0)).stroke({ width: 1.4, color: ROAD.edge, alpha: 0.45 });

  footway(g, A0, A1, C0, C1);
  footway(g, B0, B1, C0, C1);
  footway(g, A0, A1, D0, D1);
  footway(g, B0, B1, D0, D1);

  centreLine(g, "i", MIDJ, A0 - m, A1 - 0.6);                 // lanes, stopping short of the junction
  centreLine(g, "i", MIDJ, B0 + 0.6, B1 + m);
  centreLine(g, "j", MIDI, C0 - m, C1 - 0.6);
  centreLine(g, "j", MIDI, D0 + 0.6, D1 + m);

  // The crossings belong on the four APPROACHES, outside the junction box — inside it they read
  // as a chequerboard where the two streets overlap.
  crossing(g, "i", A1 - 1.4, C1 + 0.3, D0 - 0.3);
  crossing(g, "i", B0 + 1.4, C1 + 0.3, D0 - 0.3);
  crossing(g, "j", C1 - 1.4, A1 + 0.3, B0 - 0.3);
  crossing(g, "j", D0 + 1.4, A1 + 0.3, B0 - 0.3);

  rails(g, MIDJ + 1.5, A0 - m, B1 + m);

  // Light on the road: the shopfronts, then the two neon signs, then the lamps.
  pool(glow, A1 + 1.6, 3, 4.2, PAL.pink, 1.1);
  pool(glow, B0 - 1.6, 6, 4.6, PAL.cyan, 1.1);
  pool(glow, 6, C1 + 1.7, 4.4, PAL.white, 0.7);
  pool(glow, 17, C1 + 1.6, 4.6, PAL.pink, 1.2);
  pool(glow, 3, D0 - 1.5, 4, PAL.cyan, 1);
  pool(glow, MIDI, MIDJ, 5.5, PAL.white, 0.5);
}


// The margin between the outermost footway and the edge of the ground.
export const MARGIN = 1.6;
