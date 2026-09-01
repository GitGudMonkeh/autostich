// Reference study — the "Neon City" look rebuilt: design and, above all, colour.
// Deliberately OUTSIDE src/: design exploration, and deliberately NOT wired into the city.
//
// What actually makes that reference, in order of importance:
//   1. The ground is not black. The whole picture sits on a light blue-grey, and the city is the
//      DARK thing on it. Our city inverts that, which is why its palette can never match.
//   2. Windows are huge — two or three per floor, nearly the full storey height — and they are
//      the only bright thing. The wall is flat, matte and almost neutral.
//   3. The colour is in the LIGHT, not in the material: pink and cyan sit inside the glass, spill
//      onto the wall around it and pool on the floor. The walls themselves stay grey-blue.
//   4. Two neon hues, pink and cyan, plus white. Nothing else is saturated.
//
// Everything is drawn on the same iso lattice as the rest of the folder, so a shape that works
// here can move to buildings.js unchanged.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { CS, ISO, P, rng } from "./buildings.js";

/* ---- palette ------------------------------------------------------------------------------ */

const PAL = {
  slabTop: 0x191826, slabR: 0x101019, slabL: 0x0a0a11, slabEdge: 0x9aa6d8,
  bodyTop: 0x413d5c, bodyR: 0x312e49, bodyL: 0x1f1d34,      // matte navy-plum, three values
  glass: 0x14162a,
  white: 0xf2f4ff, warm: 0xffe9d2,
  pink: 0xff4f9b, pinkLo: 0xff9ecb,
  cyan: 0x61dfff, cyanLo: 0xa8f0ff,
  green: 0x3f8f6a, greenLo: 0x63c191,
  steel: 0x8e93b5,
};

// A window is a temperature, not a colour: white with a wash of one neon in it. Three of them
// carry the whole picture.
const TEMPS = {
  cool: { core: PAL.white, wash: PAL.cyan, edge: PAL.cyanLo },
  hot: { core: PAL.white, wash: PAL.pink, edge: PAL.pinkLo },
  warm: { core: PAL.warm, wash: 0xff9a5c, edge: 0xffd0a0 },
};

const shade = (c, f) => {
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (cl(c >> 16) << 16) | (cl((c >> 8) & 255) << 8) | cl(c & 255);
};

/* ---- box geometry -------------------------------------------------------------------------- */

// A block is a plain box on the lattice. The reference has no complicated massing at all — the
// interest is entirely in the light, so the shapes stay simple and stack instead.
const topFace = (b, k) => [
  ...P(b.i0 - 0.5, b.j0 - 0.5, k), ...P(b.i1 + 0.5, b.j0 - 0.5, k),
  ...P(b.i1 + 0.5, b.j1 + 0.5, k), ...P(b.i0 - 0.5, b.j1 + 0.5, k)];
// Face space: u runs along the wall, v upward, both 0..1 over the whole face.
const rp = (b, u, v) => P(b.i1 + 0.5, b.j0 - 0.5 + u * (b.j1 - b.j0 + 1), b.k0 + v * (b.k1 - b.k0 + 1));
const lp = (b, u, v) => P(b.i0 - 0.5 + u * (b.i1 - b.i0 + 1), b.j1 + 0.5, b.k0 + v * (b.k1 - b.k0 + 1));
const quad = (f, b, u0, u1, v0, v1) => [...f(b, u0, v0), ...f(b, u1, v0), ...f(b, u1, v1), ...f(b, u0, v1)];

/* ---- windows ------------------------------------------------------------------------------- */

// One window. Dark glass, a bright core, a wash of neon inside it, and — the part that does the
// work — bloom on the wall around it. In the reference the glow is wider than the window.
function window0(g, glow, f, b, u0, u1, v0, v1, temp, lit, rand) {
  const q = quad(f, b, u0, u1, v0, v1);
  g.poly(q).fill(PAL.glass);
  if (!lit) {
    g.poly(q).stroke({ width: 1, color: PAL.steel, alpha: 0.16 });
    return;
  }
  const t = TEMPS[temp];
  g.poly(q).fill({ color: t.core, alpha: 0.72 + rand() * 0.2 });
  // The wash is per PANE, not per building. In the reference most windows are plain white and
  // only a few carry the neon — a facade where every pane is pink is a pink facade, not a lit one.
  if (rand() < 0.42) {
    const cu = u0 + (u1 - u0) * (0.2 + rand() * 0.6), cv = v0 + (v1 - v0) * (0.25 + rand() * 0.5);
    for (let n = 3; n >= 1; n--) {
      const ru = (u1 - u0) * 0.44 * (n / 3), rv = (v1 - v0) * 0.52 * (n / 3);
      g.poly(quad(f, b, Math.max(u0, cu - ru), Math.min(u1, cu + ru),
        Math.max(v0, cv - rv), Math.min(v1, cv + rv)))
        .fill({ color: t.wash, alpha: 0.15 });
    }
  }
  g.poly(q).stroke({ width: 1, color: t.edge, alpha: 0.5 });
  const du = (u1 - u0) * 0.3, dv = (v1 - v0) * 0.35;
  glow.poly(quad(f, b, u0 - du * 0.4, u1 + du * 0.4, v0 - dv * 0.35, v1 + dv * 0.35))
    .fill({ color: t.wash, alpha: 0.1 });
  glow.poly(quad(f, b, u0 - du, u1 + du, v0 - dv, v1 + dv)).fill({ color: t.wash, alpha: 0.05 });
  glow.poly(q).fill({ color: t.core, alpha: 0.12 });
}

// A wall of windows: one row per storey, two or three tall panes per row, with a slab band
// between the storeys. The band is the only line on the facade.
function windowWall(g, glow, f, b, spec, rand) {
  const floors = b.k1 - b.k0 + 1;
  const cols = spec.cols ?? 2;
  for (let k = 0; k < floors; k++) {
    const v0 = (k + 0.24) / floors, v1 = (k + 0.84) / floors;
    for (let c = 0; c < cols; c++) {
      const pad = 0.13, gap = 0.075;
      const w = (1 - pad * 2 - gap * (cols - 1)) / cols;
      const u0 = pad + c * (w + gap);
      const lit = rand() < (spec.lit ?? 0.62);
      window0(g, glow, f, b, u0, u0 + w, v0, v1, spec.temp, lit, rand);
    }
    if (k > 0) {                                          // storey band
      const v = k / floors;
      g.poly(quad(f, b, 0, 1, v - 0.022, v + 0.022)).fill({ color: shade(PAL.bodyR, 0.62), alpha: 1 });
    }
  }
}

/* ---- roof props ---------------------------------------------------------------------------- */

function railing(g, b, k) {
  const top = k + 0.34;
  const ring = [
    P(b.i0 - 0.5, b.j0 - 0.5, top), P(b.i1 + 0.5, b.j0 - 0.5, top),
    P(b.i1 + 0.5, b.j1 + 0.5, top), P(b.i0 - 0.5, b.j1 + 0.5, top)];
  for (let n = 0; n < 4; n++) {
    const p = ring[n], q = ring[(n + 1) % 4];
    g.moveTo(p[0], p[1]).lineTo(q[0], q[1]);
    for (let s = 0; s <= 1.001; s += 0.25) {                // posts down to the roof slab
      const x = p[0] + (q[0] - p[0]) * s, y = p[1] + (q[1] - p[1]) * s;
      g.moveTo(x, y).lineTo(x, y + CS * 0.34);
    }
  }
  g.stroke({ width: 1, color: PAL.steel, alpha: 0.5 });
}

function planters(g, b, k, rand) {
  for (let n = 0; n < 3 + Math.floor(rand() * 3); n++) {
    const i = b.i0 - 0.3 + rand() * (b.i1 - b.i0 + 1);
    const j = b.j0 - 0.3 + rand() * (b.j1 - b.j0 + 1);
    const [x, y] = P(i, j, k);
    g.ellipse(x, y + 1, CS * 0.5, CS * 0.26).fill(0x241f38);   // planter
    g.moveTo(x, y).lineTo(x, y - CS * 0.5).stroke({ width: 1.4, color: 0x2f5b45 });
    g.circle(x, y - CS * 0.6, CS * 0.36).fill(PAL.green);
    g.circle(x - CS * 0.14, y - CS * 0.72, CS * 0.23).fill(PAL.greenLo);
    g.circle(x + CS * 0.19, y - CS * 0.52, CS * 0.2).fill(PAL.green);
  }
}

function roofBoxProp(g, b, k, rand) {
  const i = (b.i0 + b.i1) / 2 + (rand() - 0.5), j = (b.j0 + b.j1) / 2 + (rand() - 0.5);
  const s = 0.42, h = 0.5;
  const box = { i0: i - s, i1: i + s, j0: j - s, j1: j + s, k0: k, k1: k + h };
  g.poly([...P(box.i1 + 0.5, box.j0 - 0.5, k), ...P(box.i1 + 0.5, box.j1 + 0.5, k),
    ...P(box.i1 + 0.5, box.j1 + 0.5, k + h), ...P(box.i1 + 0.5, box.j0 - 0.5, k + h)])
    .fill(shade(PAL.bodyR, 0.85));
  g.poly([...P(box.i0 - 0.5, box.j1 + 0.5, k), ...P(box.i1 + 0.5, box.j1 + 0.5, k),
    ...P(box.i1 + 0.5, box.j1 + 0.5, k + h), ...P(box.i0 - 0.5, box.j1 + 0.5, k + h)])
    .fill(shade(PAL.bodyL, 0.85));
  g.poly(topFace(box, k + h)).fill(shade(PAL.bodyTop, 0.9));
}

// The pink sign box on the crown — the single loudest object in the reference. A square frame,
// two glyph bars, and a halo twice its size.
function signBox(g, glow, b, k, hue = PAL.pink) {
  const i = (b.i0 + b.i1) / 2, j = (b.j0 + b.j1) / 2;
  const s = Math.min(0.78, (b.i1 - b.i0 + 1) * 0.3);
  const box = { i0: i - s, i1: i + s, j0: j - s, j1: j + s };
  const h = 1.1;
  const face = (fn, shadeF) => {
    g.poly(fn).fill({ color: shadeF, alpha: 1 });
  };
  face([...P(box.i1 + 0.5, box.j0 - 0.5, k), ...P(box.i1 + 0.5, box.j1 + 0.5, k),
    ...P(box.i1 + 0.5, box.j1 + 0.5, k + h), ...P(box.i1 + 0.5, box.j0 - 0.5, k + h)], 0x241f36);
  face([...P(box.i0 - 0.5, box.j1 + 0.5, k), ...P(box.i1 + 0.5, box.j1 + 0.5, k),
    ...P(box.i1 + 0.5, box.j1 + 0.5, k + h), ...P(box.i0 - 0.5, box.j1 + 0.5, k + h)], 0x18142a);
  g.poly(topFace(box, k + h)).fill(0x2c2740);
  // The neon itself: a frame drawn on both visible faces, plus two bars standing for glyphs.
  for (const [fn, inset] of [[(u, v) => P(box.i1 + 0.5, box.j0 - 0.5 + u * (s * 2 + 1), k + v * h), 0],
    [(u, v) => P(box.i0 - 0.5 + u * (s * 2 + 1), box.j1 + 0.5, k + v * h), 1]]) {
    void inset;
    const fr = [...fn(0.12, 0.16), ...fn(0.88, 0.16), ...fn(0.88, 0.84), ...fn(0.12, 0.84)];
    g.poly(fr).stroke({ width: 2, color: hue, alpha: 0.95 });
    for (const [a, bb] of [[0.3, 0.46], [0.56, 0.72]]) {
      g.poly([...fn(a, 0.3), ...fn(bb, 0.3), ...fn(bb, 0.66), ...fn(a, 0.66)])
        .stroke({ width: 1.6, color: hue, alpha: 0.75 });
    }
    glow.poly([...fn(-0.1, -0.05), ...fn(1.1, -0.05), ...fn(1.1, 1.05), ...fn(-0.1, 1.05)])
      .fill({ color: hue, alpha: 0.14 });
  }
}

// The vertical sign pylon hanging off a facade — the second neon object of the reference.
function signPylon(g, glow, b, hue = PAL.pink) {
  // It hangs off the right-hand wall, half a cell proud of it, and runs down most of the facade.
  const at = (v) => {
    const [x, y] = rp(b, 1, v);
    return [x + CS * 0.55, y];
  };
  const w = CS * 0.85;
  const a = at(1.02), z = at(0.3);
  const rect = [a[0] - w, a[1], a[0] + w, a[1], z[0] + w, z[1], z[0] - w, z[1]];
  g.poly(rect).fill(0x1c1830);
  g.poly(rect).stroke({ width: 1.6, color: hue, alpha: 0.9 });
  const rand = rng(Math.round(a[0] * 31 + a[1] * 17) >>> 0);
  for (let s = 0.1; s < 0.9; s += 0.19) {                   // glyph bars down the pylon
    const px = a[0] + (z[0] - a[0]) * s, py = a[1] + (z[1] - a[1]) * s;
    const hh = CS * (0.26 + rand() * 0.14);
    g.rect(px - w * 0.5, py - hh / 2, w, hh).fill({ color: hue, alpha: 0.7 + rand() * 0.3 });
  }
  glow.poly([rect[0] - 6, rect[1] - 7, rect[2] + 6, rect[3] - 7,
    rect[4] + 6, rect[5] + 7, rect[6] - 6, rect[7] + 7]).fill({ color: hue, alpha: 0.16 });
}

// A neon square on the wall itself: frame plus two glyph bars, with a halo the size of the wall.
function facadeSign(g, glow, b, hue = PAL.pink) {
  const f = b.signSide === "left" ? lp : rp;
  const u0 = 0.24, u1 = 0.76;
  const floors = b.k1 - b.k0 + 1;
  const v1 = (floors - 0.25) / floors, v0 = v1 - Math.min(0.4, 1.6 / floors);
  g.poly(quad(f, b, u0, u1, v0, v1)).fill({ color: 0x1a1630, alpha: 0.9 });
  g.poly(quad(f, b, u0, u1, v0, v1)).stroke({ width: 2.4, color: hue, alpha: 0.95 });
  const iu = (u1 - u0) * 0.16, iv = (v1 - v0) * 0.2;
  g.poly(quad(f, b, u0 + iu, u1 - iu, v0 + iv, v1 - iv)).stroke({ width: 1.6, color: hue, alpha: 0.7 });
  glow.poly(quad(f, b, u0 - 0.12, u1 + 0.12, v0 - 0.1, v1 + 0.1)).fill({ color: hue, alpha: 0.16 });
  glow.poly(quad(f, b, u0 - 0.25, u1 + 0.25, v0 - 0.2, v1 + 0.2)).fill({ color: hue, alpha: 0.07 });
}

/* ---- the block ----------------------------------------------------------------------------- */

function drawBlock(g, glow, b, rand) {
  const dark = b.dark ?? 1;
  g.poly([...P(b.i1 + 0.5, b.j0 - 0.5, b.k0), ...P(b.i1 + 0.5, b.j1 + 0.5, b.k0),
    ...P(b.i1 + 0.5, b.j1 + 0.5, b.k1 + 1), ...P(b.i1 + 0.5, b.j0 - 0.5, b.k1 + 1)])
    .fill(shade(PAL.bodyR, dark));
  g.poly([...P(b.i0 - 0.5, b.j1 + 0.5, b.k0), ...P(b.i1 + 0.5, b.j1 + 0.5, b.k0),
    ...P(b.i1 + 0.5, b.j1 + 0.5, b.k1 + 1), ...P(b.i0 - 0.5, b.j1 + 0.5, b.k1 + 1)])
    .fill(shade(PAL.bodyL, dark));
  g.poly(topFace(b, b.k1 + 1)).fill(shade(PAL.bodyTop, dark));
  g.poly(topFace(b, b.k1 + 1)).stroke({ width: 1, color: PAL.slabEdge, alpha: 0.14 });

  windowWall(g, glow, rp, b, b, rand);
  windowWall(g, glow, lp, b, b, rand);

  const k = b.k1 + 1;
  if (b.roof === "garden") { railing(g, b, k); planters(g, b, k, rand); }
  else if (b.roof === "plant") { roofBoxProp(g, b, k, rand); railing(g, b, k); }
  else if (b.roof === "sign") { signBox(g, glow, b, k); }
  else if (b.roof === "signCyan") { signBox(g, glow, b, k, PAL.cyan); }
  else if (b.roof === "rail") railing(g, b, k);
  if (b.pylon) signPylon(g, glow, b);
  if (b.wallSign) facadeSign(g, glow, b, b.wallSign === "cyan" ? PAL.cyan : PAL.pink);
}

/* ---- the scene ----------------------------------------------------------------------------- */

// Nine blocks on a small slab, stacked and stepped the way the reference does it: a tall dark
// stack in the middle, low wide shops at the front, one tower on each flank.
const BLOCKS = [
  // back-left tower
  { i0: 0, i1: 2, j0: 0, j1: 2, k0: 0, k1: 5, temp: "cool", cols: 2, lit: 0.7, roof: "rail" },
  { i0: 0, i1: 1, j0: 0, j1: 1, k0: 6, k1: 7, temp: "cool", cols: 2, lit: 0.85, roof: "plant" },
  // the tall central stack
  { i0: 4, i1: 6, j0: 1, j1: 3, k0: 0, k1: 4, temp: "hot", cols: 2, lit: 0.75, roof: "rail", pylon: true },
  { i0: 4, i1: 6, j0: 1, j1: 3, k0: 5, k1: 7, temp: "cool", cols: 2, lit: 0.8, roof: "sign", dark: 0.92 },
  { i0: 4, i1: 5, j0: 1, j1: 2, k0: 8, k1: 9, temp: "cool", cols: 2, lit: 0.9, roof: "rail" },
  // right-hand block with the sign box
  { i0: 8, i1: 10, j0: 0, j1: 2, k0: 0, k1: 2, temp: "hot", cols: 2, lit: 0.8, roof: "garden" },
  { i0: 8, i1: 10, j0: 0, j1: 2, k0: 3, k1: 4, temp: "hot", cols: 2, lit: 0.85, roof: "sign" },
  // the low warm shops at the left, stepping down to a terrace
  { i0: 0, i1: 2, j0: 5, j1: 7, k0: 0, k1: 2, temp: "warm", cols: 3, lit: 0.85, roof: "plant" },
  { i0: 0, i1: 1, j0: 8, j1: 10, k0: 0, k1: 0, temp: "warm", cols: 2, lit: 1, roof: "garden" },
  // the middle courtyard block with the pylon
  { i0: 4, i1: 6, j0: 5, j1: 7, k0: 0, k1: 2, temp: "cool", cols: 2, lit: 0.8, roof: "garden", wallSign: "pink" },
  { i0: 5, i1: 6, j0: 5, j1: 6, k0: 3, k1: 4, temp: "hot", cols: 2, lit: 0.9, roof: "signCyan" },
  // right-front, the big lit shopfront facing the tram
  { i0: 8, i1: 10, j0: 5, j1: 8, k0: 0, k1: 1, temp: "cool", cols: 3, lit: 0.95, roof: "garden" },
  { i0: 9, i1: 10, j0: 5, j1: 6, k0: 2, k1: 3, temp: "hot", cols: 2, lit: 0.8, roof: "rail", wallSign: "cyan" },
  // front row
  { i0: 3, i1: 5, j0: 9, j1: 10, k0: 0, k1: 1, temp: "cool", cols: 3, lit: 0.9, roof: "garden" },
  { i0: 7, i1: 8, j0: 9, j1: 10, k0: 0, k1: 0, temp: "warm", cols: 2, lit: 1, roof: "rail" },
];

// The slab everything stands on: dark, with one bright rim. In the reference it is what separates
// the city from the empty ground and it is the only true black in the picture.
function slab(g, glow) {
  const i0 = -1.1, i1 = 12.1, j0 = -1.1, j1 = 11.8, h = 0.8;
  const b = { i0, i1, j0, j1 };
  g.poly([...P(i1 + 0.5, j0 - 0.5, 0), ...P(i1 + 0.5, j1 + 0.5, 0),
    ...P(i1 + 0.5, j1 + 0.5, -h), ...P(i1 + 0.5, j0 - 0.5, -h)]).fill(PAL.slabR);
  g.poly([...P(i0 - 0.5, j1 + 0.5, 0), ...P(i1 + 0.5, j1 + 0.5, 0),
    ...P(i1 + 0.5, j1 + 0.5, -h), ...P(i0 - 0.5, j1 + 0.5, -h)]).fill(PAL.slabL);
  g.poly(topFace(b, 0)).fill(PAL.slabTop);
  g.poly(topFace(b, 0)).stroke({ width: 1.4, color: PAL.slabEdge, alpha: 0.5 });
  // Light pooling on the slab, one pool per neon hue — the colour on the floor is half the look.
  for (const [i, j, c, r] of [[2, 6, PAL.pink, 4.5], [9, 3, PAL.cyan, 4], [5, 10.5, PAL.pink, 3.5]]) {
    const [x, y] = P(i, j, 0);
    for (let n = 4; n >= 1; n--) {
      glow.ellipse(x, y, r * CS * (n / 4), r * CS * ISO * (n / 4)).fill({ color: c, alpha: 0.035 });
    }
  }
}

// A tram waiting at the kerb, as in the reference: a long low body, all windows, one lit strip.
function tram(g, glow) {
  const b = { i0: 11.4, i1: 11.4, j0: 1.5, j1: 8.5, k0: 0, k1: 0.9 };
  g.poly([...P(b.i1 + 0.5, b.j0 - 0.5, b.k0), ...P(b.i1 + 0.5, b.j1 + 0.5, b.k0),
    ...P(b.i1 + 0.5, b.j1 + 0.5, b.k1), ...P(b.i1 + 0.5, b.j0 - 0.5, b.k1)]).fill(0x2b2942);
  g.poly(topFace(b, b.k1)).fill(0x3a3856);
  const f = (u, v) => P(b.i1 + 0.5, b.j0 - 0.5 + u * (b.j1 - b.j0 + 1), b.k0 + v * b.k1);
  for (let u = 0.06; u < 0.92; u += 0.115) {
    const q = [...f(u, 0.34), ...f(u + 0.08, 0.34), ...f(u + 0.08, 0.8), ...f(u, 0.8)];
    g.poly(q).fill({ color: PAL.white, alpha: 0.85 });
    glow.poly([...f(u - 0.02, 0.26), ...f(u + 0.1, 0.26), ...f(u + 0.1, 0.88), ...f(u - 0.02, 0.88)])
      .fill({ color: PAL.cyan, alpha: 0.07 });
  }
  g.poly([...f(0, 0.12), ...f(1, 0.12), ...f(1, 0.2), ...f(0, 0.2)])
    .fill({ color: PAL.cyan, alpha: 0.8 });
}

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const world = new Container();
  app.stage.addChild(world);

  const ground = new Graphics();
  const groundGlow = new Graphics();
  groundGlow.blendMode = "add";
  slab(ground, groundGlow);
  world.addChild(ground, groundGlow);

  const body = new Graphics();
  const glow = new Graphics();
  glow.blendMode = "add";
  const sorted = BLOCKS.slice().sort((a, b) => (a.i0 + a.j0 + a.k0 * 0.01) - (b.i0 + b.j0 + b.k0 * 0.01));
  for (const b of sorted) drawBlock(body, glow, b, rng(Math.round(b.i0 * 733 + b.j0 * 977 + b.k0 * 31)));
  tram(body, glow);
  world.addChild(body, glow);

  // Centre on what was actually drawn, rather than on numbers that stop being true the moment a
  // block moves.
  const layout = () => {
    world.scale.set(1);
    world.position.set(0, 0);
    const bb = world.getLocalBounds();
    const s = Math.min(2.2, (app.screen.width * 0.86) / bb.width, (app.screen.height * 0.88) / bb.height);
    world.scale.set(s);
    world.position.set(app.screen.width / 2 - (bb.x + bb.width / 2) * s,
      app.screen.height / 2 - (bb.y + bb.height / 2) * s);
  };
  layout();
  app.renderer.on("resize", layout);

  // The neon breathes very slightly. In a still image it is a colour study; on a screen a
  // completely static glow reads as a print.
  app.ticker.add(() => {
    const t = performance.now() / 1000;
    glow.alpha = 0.94 + Math.sin(t * 0.9) * 0.06;
    groundGlow.alpha = 0.9 + Math.sin(t * 0.6 + 1) * 0.1;
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
