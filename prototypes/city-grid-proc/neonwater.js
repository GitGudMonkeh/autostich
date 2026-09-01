// Water study — the same city, but as an island: everything outside the built plate is water.
// Deliberately OUTSIDE src/: design exploration.
//
// Water in this style is not a blue surface. It is a MIRROR that has been roughened, and it
// follows the same rule as the asphalt and the facades: the surface itself is dark and nearly
// colourless, and everything you see on it is light from somewhere else.
//
//   1. Value first. The water is darker than the sky it sits under and lighter than the island on
//      it, and it gets darker towards the viewer. Without that gradient it reads as a floor.
//   2. The reflection is the subject. Below the island's near edges every lit building smears
//      downwards in its own colour — vertically stretched, cut into ripple slices, never a mirror
//      image. A sharp reflection would look like glass, not water.
//   3. Ripples are horizontal, thin and sparse, and they are brightest where the light hits.
//   4. The waterline is one bright line plus a dark contact shadow under the quay. That single
//      line is what makes the island stand IN the water instead of floating over it.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { CS, P, rng } from "./buildings.js";
import { PAL, drawBlock } from "./refRender.js";
import {
  STREET_BLOCKS, MARGIN, A0, A1, B0, B1, C0, C1, D0, D1, MIDI, MIDJ,
  streetGround, lamp, car, tram, pool,
} from "./refStreet.js";

const SEA = {
  far: 0x2c3358,              // the flat base under the mesh, at the horizon
  near: 0x111731,             // and under the viewer
  deep: 0x16203f,             // open water
  shallow: 0x2f7392,          // the lit band along the shore — the only saturated tone in the sea
  crest: 0x4f89a8,            // a facet turned towards the light
  trough: 0x0d1428,           // and one turned away
  quay: 0x0b0a12,
  quayEdge: 0x9aa6d8,
  foam: 0xcfeaff,
};

// The island, in lattice coordinates.
const I0 = A0 - MARGIN, I1 = B1 + MARGIN, J0 = C0 - MARGIN, J1 = D1 + MARGIN;
const QUAY_H = 1.5;                         // how far the quay wall drops into the water
const CORNER = P(I1, J1, 0);                // the near corner: both waterlines meet here

/* ---- the sea ------------------------------------------------------------------------------- */

const mix = (a, b, f) => {
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - f) + ((b >> s) & 255) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

// The flat ground under the wave mesh: bands from the horizon down to the viewer. It is what
// shows wherever the mesh does not reach, and it carries the depth gradient.
function seaBase(g, x0, x1, y0, y1) {
  const N = 22;
  for (let n = 0; n < N; n++) {
    const f = n / (N - 1);
    g.rect(x0, y0 + (y1 - y0) * (n / N) - 1, x1 - x0, (y1 - y0) / N + 2)
      .fill(mix(SEA.far, SEA.near, Math.pow(f, 0.8)));
  }
}

// The wave field: three long sines crossed. Gentle on purpose — the water has to stay a surface
// the city sits on, not a sea the city is in.
const WAVE = (i, j, t) =>
  0.22 * Math.sin(i * 0.30 + t * 0.75)
  + 0.16 * Math.sin(j * 0.24 - t * 0.62)
  + 0.12 * Math.sin((i + j) * 0.17 + t * 1.05);

// Low-poly water, the way the stylized references do it. Two things matter and the first one is
// what the earlier version got wrong:
//
//   · The mesh must be IRREGULAR. A grid of equal quads reads as a grid, however it is shaded —
//     the eye locks onto the repeat instantly. Every node is therefore pushed off its lattice
//     position by a fixed random offset, and every cell is split into two triangles, so no two
//     facets share a shape.
//   · Water has ZONES, not one colour: bright shallows along the shore, deep dark water further
//     out. That gradient — distance to land, not distance to the viewer — is what makes it read
//     as a body of water with a bottom rather than as a painted plane.
const STEP = 4.0;                            // one facet, in lattice units
const W0 = -34, W1 = 66;                     // far enough that the mesh reaches past the frame
const NODES = Math.ceil((W1 - W0) / STEP) + 1;

// The node offsets are fixed once: the mesh may move up and down, but it must not crawl.
const OFF = (() => {
  const rand = rng(0xc0ffee);
  const a = [];
  for (let gi = 0; gi < NODES; gi++) {
    a.push([]);
    for (let gj = 0; gj < NODES; gj++) {
      a[gi].push([(rand() - 0.5) * STEP * 0.62, (rand() - 0.5) * STEP * 0.62, rand()]);
    }
  }
  return a;
})();

// How far a point is from the island, in lattice units. Zero on the quay, growing outwards.
const toShore = (i, j) => Math.hypot(
  Math.max(I0 - i, 0, i - I1), Math.max(J0 - j, 0, j - J1));

function waveMesh(g, t) {
  g.clear();
  const node = (gi, gj) => {
    const [di, dj, r] = OFF[gi][gj];
    const i = W0 + gi * STEP + di, j = W0 + gj * STEP + dj;
    return { i, j, h: WAVE(i, j, t), r, d: toShore(i, j) };
  };
  let row = [];
  for (let gj = 0; gj < NODES; gj++) row.push(node(0, gj));
  for (let gi = 1; gi < NODES; gi++) {
    const next = [];
    for (let gj = 0; gj < NODES; gj++) next.push(node(gi, gj));
    for (let gj = 0; gj < NODES - 1; gj++) {
      const A = row[gj], B = next[gj], C = next[gj + 1], D = row[gj + 1];
      tri(g, A, B, C, t);
      tri(g, A, C, D, t);
    }
    row = next;
  }
}

// One facet: flat, one tone, taken from its depth, its slope and a little of its own randomness.
function tri(g, A, B, C, t) {
  const d = (A.d + B.d + C.d) / 3;
  const shallow = Math.max(0, 1 - d / 5.5);
  let base = mix(SEA.deep, SEA.shallow, Math.pow(shallow, 1.5));
  if (d < 1.8) base = mix(base, SEA.foam, ((1.8 - d) / 1.8) * 0.55);   // the water breaks on the quay
  // Fake normal: how much the facet rises towards the light, which sits up and to the left.
  const slope = (B.h - A.h) * 0.7 + (C.h - A.h) * 0.5;
  const lit = Math.max(-1, Math.min(1, slope * 2.2));
  const tone = mix(base, lit > 0 ? SEA.crest : SEA.trough, Math.min(0.5, Math.abs(lit) * 0.42 + 0.05));
  g.poly([...P(A.i, A.j, A.h), ...P(B.i, B.j, B.h), ...P(C.i, C.j, C.h)])
    .fill(mix(tone, SEA.crest, A.r * 0.06));                          // a touch of facet variation
  // Sparkle: the steepest facets near the shore catch the city light for a moment.
  if (lit > 0.72 && d < 16 && Math.sin(t * 2.2 + A.i + B.j) > 0.55) {
    g.poly([...P(A.i, A.j, A.h), ...P(B.i, B.j, B.h), ...P(C.i, C.j, C.h)])
      .fill({ color: SEA.foam, alpha: 0.14 });
  }
}

// Foam: an irregular bright band lapping at the quay, and one loose band a little further out.
function foam(g, t) {
  const edge = (from, to, fixed, axis) => {
    for (let s = from; s < to; s += 1.1) {
      const w = 0.55 + Math.sin(s * 1.7 + t * 1.1) * 0.3;
      const off = 0.35 + Math.sin(s * 0.9 - t * 1.4) * 0.28;
      const a = 0.26 + Math.sin(s * 2.3 + t * 1.9) * 0.16;
      const q = axis === "i"
        ? [...P(s, fixed + off, 0), ...P(s + 0.9, fixed + off, 0),
          ...P(s + 0.9, fixed + off + w, 0), ...P(s, fixed + off + w, 0)]
        : [...P(fixed + off, s, 0), ...P(fixed + off, s + 0.9, 0),
          ...P(fixed + off + w, s + 0.9, 0), ...P(fixed + off + w, s, 0)];
      g.poly(q).fill({ color: SEA.foam, alpha: Math.max(0.04, a) });
    }
  };
  edge(I0, I1 + 1, J1, "i");                 // along the two shores that face the viewer
  edge(J0, J1 + 1, I1, "j");
}

// Caustics: a few big soft loops drifting over the surface. In the stylized references these are
// what say "water" before any wave does.
function caustics(g, t) {
  g.clear();
  for (let n = 0; n < 5; n++) {
    const cx = I1 * 0.5 + Math.sin(t * 0.12 + n * 1.7) * 22 + (n - 2) * 12;
    const cy = J1 * 0.7 + Math.cos(t * 0.1 + n * 2.3) * 18 + (n - 2) * 9;
    const r = 7 + n * 2.2 + Math.sin(t * 0.3 + n) * 1.2;
    const [x, y] = P(cx, cy, 0);
    g.ellipse(x, y, r * CS, r * CS * 0.5).stroke({ width: 2.2, color: SEA.shallow, alpha: 0.1 });
    g.ellipse(x, y, r * CS * 0.72, r * CS * 0.36).stroke({ width: 1.4, color: SEA.crest, alpha: 0.08 });
  }
}

/* ---- the shore ------------------------------------------------------------------------------ */

// The quay: the island's two near sides drop into the water, and the waterline is one bright
// line with a dark contact shadow under it.
function quay(g, glow) {
  const face = (a, b, c, d) => g.poly([...a, ...b, ...c, ...d]);
  face(P(I1, J0, 0), P(I1, J1, 0), P(I1, J1, -QUAY_H), P(I1, J0, -QUAY_H)).fill(SEA.quay);
  face(P(I0, J1, 0), P(I1, J1, 0), P(I1, J1, -QUAY_H), P(I0, J1, -QUAY_H)).fill(0x07070d);
  // Waterline: bright on top of the wall, then the shadow the wall casts into the water.
  for (const [a, b] of [[P(I1, J0, -QUAY_H), P(I1, J1, -QUAY_H)], [P(I0, J1, -QUAY_H), P(I1, J1, -QUAY_H)]]) {
    g.moveTo(a[0], a[1]).lineTo(b[0], b[1]);
  }
  g.stroke({ width: 1.6, color: SEA.foam, alpha: 0.5 });
  for (let n = 1; n <= 5; n++) {                          // contact shadow, fading downwards
    const off = n * 2.6;
    for (const [a, b] of [[P(I1, J0, -QUAY_H), P(I1, J1, -QUAY_H)], [P(I0, J1, -QUAY_H), P(I1, J1, -QUAY_H)]]) {
      g.moveTo(a[0], a[1] + off).lineTo(b[0], b[1] + off);
    }
    g.stroke({ width: 2.4, color: 0x05050c, alpha: 0.16 * (1 - n / 6) });
  }
  glow.moveTo(...P(I1, J0, -QUAY_H)).lineTo(...P(I1, J1, -QUAY_H))
    .moveTo(...P(I0, J1, -QUAY_H)).lineTo(...P(I1, J1, -QUAY_H))
    .stroke({ width: 5, color: PAL.cyan, alpha: 0.1 });
}

/* ---- reflections ---------------------------------------------------------------------------- */

// Where the island's near edge sits, in screen y, for a given screen x. Both edges run at the
// 2:1 iso slope away from the near corner, so the edge is a simple V.
const shoreY = (x) => CORNER[1] - Math.abs(x - CORNER[0]) * 0.5 - QUAY_H * CS;

// One building's reflection: a column of slices in the building's own light colour, stretched
// down, jittered sideways, and cut by the ripples. Never a mirrored copy — this is water.
function reflection(g, block, t) {
  const w = ((block.i1 - block.i0 + 1) + (block.j1 - block.j0 + 1)) * CS * 0.5;
  const x = ((block.i0 + block.i1) / 2 - (block.j0 + block.j1) / 2) * CS;
  const top = shoreY(x);
  const colour = block.temp === "hot" ? PAL.pink : block.temp === "warm" ? PAL.warm : PAL.cyan;
  const height = 34 + (block.k1 - block.k0) * 13;
  const slices = 10;
  for (let n = 0; n < slices; n++) {
    const f = n / slices;
    const y = top + 4 + f * height;
    const jitter = Math.sin(t * 1.3 + n * 0.7 + x * 0.01) * (2 + f * 7);
    const ww = w * (0.85 + f * 0.5);
    const a = 0.42 * Math.pow(1 - f, 1.4) * (block.lit ?? 0.8);
    g.rect(x - ww / 2 + jitter, y, ww, (height / slices) * 1.05).fill({ color: colour, alpha: a });
    g.rect(x - ww * 0.9 + jitter * 0.6, y - 1, ww * 1.8, height / slices)
      .fill({ color: colour, alpha: a * 0.22 });             // the halo around the smear
  }
  // The bright core right under the shore, where the reflection is still coherent.
  g.rect(x - w * 0.34, top + 3, w * 0.68, 5)
    .fill({ color: PAL.white, alpha: 0.3 * (block.lit ?? 0.8) });
}

/* ---- what floats on it ----------------------------------------------------------------------- */

// A jetty running out of the island: deck on posts, two lamps, and its own reflection.
function jetty(g, glow) {
  const i = I1 + 3.4, j = MIDJ;                            // straight out from the near-right side
  const deck = { i0: I1 - 0.2, i1: i + 2.6, j0: j - 0.9, j1: j + 0.9 };
  for (let t = 0; t <= 1.001; t += 0.25) {                 // posts down into the water
    const pi = deck.i0 + (deck.i1 - deck.i0) * t;
    for (const pj of [deck.j0 + 0.2, deck.j1 - 0.2]) {
      g.moveTo(...P(pi, pj, 0)).lineTo(...P(pi, pj, -QUAY_H * 0.9))
        .stroke({ width: 2, color: 0x14121f, alpha: 0.9 });
    }
  }
  g.poly([...P(deck.i1, deck.j0, 0), ...P(deck.i1, deck.j1, 0),
    ...P(deck.i1, deck.j1, -0.28), ...P(deck.i1, deck.j0, -0.28)]).fill(0x1b192c);
  g.poly([...P(deck.i0, deck.j1, 0), ...P(deck.i1, deck.j1, 0),
    ...P(deck.i1, deck.j1, -0.28), ...P(deck.i0, deck.j1, -0.28)]).fill(0x141222);
  g.poly([...P(deck.i0, deck.j0, 0), ...P(deck.i1, deck.j0, 0),
    ...P(deck.i1, deck.j1, 0), ...P(deck.i0, deck.j1, 0)]).fill(0x2a2743);
  g.poly([...P(deck.i0, deck.j0, 0), ...P(deck.i1, deck.j0, 0),
    ...P(deck.i1, deck.j1, 0), ...P(deck.i0, deck.j1, 0)])
    .stroke({ width: 1, color: SEA.quayEdge, alpha: 0.35 });
  lamp(g, glow, deck.i1 - 0.4, deck.j0 + 0.3, 2.2);
  lamp(g, glow, deck.i0 + 1.2, deck.j1 - 0.3, 2.2);
}

// A boat: a dark hull, one lit cabin, a mast light. Same idea as the cars — it is recognised by
// its lights, not by its shape.
function boat(g, glow, i, j, t) {
  const bob = Math.sin(t * 0.9 + i) * 1.4;
  const hull = { i0: i - 1.9, i1: i + 1.9, j0: j - 0.8, j1: j + 0.8 };
  const shift = (p) => [p[0], p[1] + bob];
  const quadOf = (a, b, c, d) => [...shift(a), ...shift(b), ...shift(c), ...shift(d)];
  g.poly(quadOf(P(hull.i1, hull.j0, 0), P(hull.i1, hull.j1, 0),
    P(hull.i1, hull.j1, -0.5), P(hull.i1, hull.j0, -0.5))).fill(0x1d1a2e);
  g.poly(quadOf(P(hull.i0, hull.j1, 0), P(hull.i1, hull.j1, 0),
    P(hull.i1, hull.j1, -0.5), P(hull.i0, hull.j1, -0.5))).fill(0x151324);
  g.poly(quadOf(P(hull.i0, hull.j0, 0), P(hull.i1, hull.j0, 0),
    P(hull.i1, hull.j1, 0), P(hull.i0, hull.j1, 0))).fill(0x2c2944);
  const cab = { i0: i - 0.35, i1: i + 0.45, j0: j - 0.42, j1: j + 0.42 };
  const CH = 0.62;
  g.poly(quadOf(P(cab.i1, cab.j0, 0), P(cab.i1, cab.j1, 0),
    P(cab.i1, cab.j1, CH), P(cab.i1, cab.j0, CH))).fill(0x241f38);
  g.poly(quadOf(P(cab.i0, cab.j1, 0), P(cab.i1, cab.j1, 0),
    P(cab.i1, cab.j1, CH), P(cab.i0, cab.j1, CH))).fill(0x1a1730);
  g.poly(quadOf(P(cab.i0, cab.j0, CH), P(cab.i1, cab.j0, CH),
    P(cab.i1, cab.j1, CH), P(cab.i0, cab.j1, CH))).fill(0x2f2b48);
  // only the windows are warm, the cabin itself is as dark as everything else
  g.poly(quadOf(P(cab.i1, cab.j0 + 0.1, CH * 0.35), P(cab.i1, cab.j1 - 0.1, CH * 0.35),
    P(cab.i1, cab.j1 - 0.1, CH * 0.8), P(cab.i1, cab.j0 + 0.1, CH * 0.8)))
    .fill({ color: PAL.warm, alpha: 0.9 });
  g.poly(quadOf(P(cab.i0 + 0.1, cab.j1, CH * 0.35), P(cab.i1 - 0.1, cab.j1, CH * 0.35),
    P(cab.i1 - 0.1, cab.j1, CH * 0.8), P(cab.i0 + 0.1, cab.j1, CH * 0.8)))
    .fill({ color: PAL.warm, alpha: 0.6 });
  const mast = shift(P(i - 1.2, j, 1.9));
  g.moveTo(...shift(P(i - 1.2, j, 0.1))).lineTo(mast[0], mast[1])
    .stroke({ width: 1.2, color: PAL.steel, alpha: 0.7 });
  g.circle(mast[0], mast[1], 1.4).fill({ color: PAL.white, alpha: 0.95 });
  glow.circle(mast[0], mast[1], 5).fill({ color: PAL.warm, alpha: 0.18 });
  const [rx, ry] = shift(P(i, j, -0.5));
  for (let n = 0; n < 6; n++) {                            // its own smear on the water
    glow.rect(rx - 11 + Math.sin(t * 1.4 + n) * 2.5, ry + 3 + n * 3.4, 22, 2)
      .fill({ color: PAL.warm, alpha: 0.12 * (1 - n / 6) });
  }
}

// A buoy: a stick with a blinking light and a small pool of it on the water.
function buoy(g, glow, i, j, colour, t, phase) {
  const bob = Math.sin(t * 1.4 + phase) * 1.2;
  const [x, y] = P(i, j, 0);
  g.moveTo(x, y + bob).lineTo(x, y + bob - 9).stroke({ width: 1.6, color: 0x2a2743 });
  const f = (Math.sin(t * 2.2 + phase) + 1) / 2;
  g.circle(x, y + bob - 10, 1.6).fill({ color: colour, alpha: 0.4 + f * 0.6 });
  glow.circle(x, y + bob - 10, 5.5).fill({ color: colour, alpha: 0.1 + f * 0.18 });
  for (let n = 0; n < 4; n++) {
    glow.rect(x - 7 + Math.sin(t + n) * 2, y + bob + 2 + n * 3, 14, 1.6)
      .fill({ color: colour, alpha: (0.12 + f * 0.1) * (1 - n / 4) });
  }
}

/* ---- page ------------------------------------------------------------------------------------ */

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const world = new Container();
  app.stage.addChild(world);

  // The sea is drawn far beyond the island, because the layout only fits the ISLAND on screen —
  // sizing the view to the water would shrink the city to a dot.
  const X0 = -1500, X1 = 1500, Y0 = -900, Y1 = 1500;
  const water = new Graphics();
  seaBase(water, X0, X1, Y0, Y1);
  const rippleG = new Graphics();                          // the wave mesh itself
  const crestG = new Graphics();                           // foam at the quay
  const causticG = new Graphics();                         // loops drifting over the surface
  causticG.blendMode = "add";
  const seaGlow = new Graphics();
  seaGlow.blendMode = "add";
  // The city throws its colour onto the water long before any reflection is resolved.
  pool(seaGlow, MIDI + 4, J1 + 5, 16, PAL.pink, 0.5);
  pool(seaGlow, I1 + 6, MIDJ, 15, PAL.cyan, 0.5);
  pool(seaGlow, MIDI - 6, J1 + 4, 13, PAL.white, 0.32);
  const reflect = new Graphics();
  reflect.blendMode = "add";
  world.addChild(water, rippleG, causticG, crestG, reflect, seaGlow);

  const shore = new Graphics();
  const shoreGlow = new Graphics();
  shoreGlow.blendMode = "add";
  quay(shore, shoreGlow);
  world.addChild(shore, shoreGlow);

  const road = new Graphics();
  const roadGlow = new Graphics();
  roadGlow.blendMode = "add";
  streetGround(road, roadGlow, { slab: false });
  world.addChild(road, roadGlow);

  const body = new Graphics();
  const glow = new Graphics();
  glow.blendMode = "add";
  const floating = new Graphics();
  const floatGlow = new Graphics();
  floatGlow.blendMode = "add";
  const items = [
    ...STREET_BLOCKS.map((b) => ({
      d: b.i0 + b.j0 + b.k0 * 0.01,
      run: () => drawBlock(body, glow, b, rng(Math.round(b.i0 * 733 + b.j0 * 977 + b.k0 * 31))),
    })),
    { d: MIDJ + 1.5, run: () => tram(body, glow, 1.5, 9.5, MIDJ + 1.5) },
    { d: MIDI - 3, run: () => car(body, glow, MIDI - 3.4, MIDJ - 1.1, "i", PAL.cyan) },
    { d: MIDI + 5, run: () => car(body, glow, MIDI + 5.5, MIDJ - 1.1, "i", PAL.pink) },
    { d: MIDJ + 6, run: () => car(body, glow, MIDI + 1.1, MIDJ + 6.5, "j", PAL.cyan) },
    { d: A1 + C1, run: () => lamp(body, glow, A1 + 0.7, C1 + 0.7) },
    { d: B0 + C1, run: () => lamp(body, glow, B0 - 0.7, C1 + 0.7) },
    { d: A1 + D0, run: () => lamp(body, glow, A1 + 0.7, D0 - 0.7) },
    { d: B0 + D0, run: () => lamp(body, glow, B0 - 0.7, D0 - 0.7) },
  ].sort((a, b) => a.d - b.d);
  for (const it of items) it.run();
  jetty(body, glow);
  world.addChild(body, glow, floating, floatGlow);

  const layout = () => {
    world.scale.set(1);
    world.position.set(0, 0);
    const bb = body.getLocalBounds();                      // the ISLAND decides the framing
    const s = Math.min(2.2, (app.screen.width * 0.78) / bb.width, (app.screen.height * 0.72) / bb.height);
    world.scale.set(s);
    world.position.set(app.screen.width / 2 - (bb.x + bb.width / 2) * s,
      app.screen.height / 2 - (bb.y + bb.height / 2) * s - 20);
  };
  layout();
  app.renderer.on("resize", layout);

  const t0 = performance.now();
  let lastMesh = -1;
  app.ticker.add(() => {
    const t = (performance.now() - t0) / 1000;
    // The mesh is the most expensive thing on the page, so it is rebuilt at about 20 fps. Gentle
    // waves do not need 60 — and on a phone the difference is the whole frame budget.
    if (t - lastMesh > 0.05) {
      lastMesh = t;
      waveMesh(rippleG, t);
      caustics(causticG, t);
      crestG.clear();
      foam(crestG, t);
      reflect.clear();
      for (const b of STREET_BLOCKS) reflection(reflect, b, t);
    }
    floating.clear();
    floatGlow.clear();
    boat(floating, floatGlow, I1 + 9, MIDJ - 5.5, t);
    buoy(floating, floatGlow, I1 + 5.5, J1 + 3.5, PAL.pink, t, 0);
    buoy(floating, floatGlow, I0 + 5, J1 + 7, PAL.cyan, t, 2.1);
    glow.alpha = 0.94 + Math.sin(t * 0.9) * 0.06;
    seaGlow.alpha = 0.9 + Math.sin(t * 0.5) * 0.1;
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
