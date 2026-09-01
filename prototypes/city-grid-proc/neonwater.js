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
//   5. Movement: spreading rings (variant W3 of the wave study) and light rain. Rain is the reason
//      the rings are there — every drop that lands leaves one — so the two are drawn as one idea.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { CS, P, rng } from "./buildings.js";
import { PAL, drawBlock } from "./refRender.js";
import {
  STREET_BLOCKS, MARGIN, A0, A1, B0, B1, C0, C1, D0, D1, MIDI, MIDJ,
  streetGround, lamp, car, tram, pool,
} from "./refStreet.js";

const SEA = {
  far: 0x39406a,              // at the horizon, closest to the sky
  near: 0x141a30,             // under the viewer, the deepest value
  quay: 0x0b0a12,
  quayEdge: 0x9aa6d8,
  foam: 0xd8e2ff,
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

// The surface: bands from the horizon down to the viewer. Bands rather than one flat fill,
// because the gradient IS the depth cue — a single colour reads as a tabletop.
//
// This replaced a faceted low-poly mesh. The mesh was livelier and wrong: a surface made of
// visible facets competes with the buildings, and this picture only works while the water is the
// quietest thing in it. What carries the water instead is the reflection.
function sea(g, x0, x1, y0, y1) {
  const N = 26;
  for (let n = 0; n < N; n++) {
    const f = n / (N - 1);
    g.rect(x0, y0 + (y1 - y0) * (n / N) - 1, x1 - x0, (y1 - y0) / N + 2)
      .fill(mix(SEA.far, SEA.near, Math.pow(f, 0.8)));
  }
}

// Ripples: short horizontal strokes, denser and brighter near the island, thinning out towards
// the horizon. They are the only texture the water gets, and they are drawn once — the whole
// field then breathes as one, which is a calmer motion than any per-wave animation.
function ripples(g, x0, x1, y0, y1, seed) {
  const rand = rng(seed);
  const [cx, cy] = CORNER;
  for (let n = 0; n < 1400; n++) {
    const x = x0 + rand() * (x1 - x0);
    const y = y0 + rand() * (y1 - y0);
    const d = Math.hypot((x - cx) / 320, (y - cy) / 190);
    if (rand() < d * 0.55) continue;                      // sparse far away, dense near the shore
    const w = 5 + rand() * 26 * (1.2 - Math.min(1, d));
    const a = 0.05 + rand() * 0.1 * (1.35 - Math.min(1, d));
    g.rect(x - w / 2, y, w, 1).fill({ color: rand() < 0.16 ? PAL.cyan : SEA.foam, alpha: a });
  }
}

// The far water. `ripples` above thins its marks out towards the top, which is a PERSPECTIVE
// convention — and this projection is parallel: there is no horizon and nothing shrinks with
// distance. A surface that loses all its texture up there stops reading as a plane and starts
// reading as a backdrop standing behind the island. So the far field keeps the same mark sizes as
// the near one; only the light falls off, because the city is what lights the water.
const FAR_TOP = -820;
const FAR_BOTTOM = CORNER[1] - 140;                       // where the near field already covers
// Light, not geometry: away from the city and out to the sides the water is simply darker.
const farLight = (x, y) => 1 - 0.28 * Math.min(1, (FAR_BOTTOM - y) / 560)
  - 0.12 * Math.min(1, Math.abs(x) / 1000);

function farRipples(g, seed) {
  const rand = rng(seed);
  for (let n = 0; n < 2100; n++) {
    const x = -1300 + rand() * 2600;
    const y = FAR_TOP + rand() * (FAR_BOTTOM - FAR_TOP);
    const fade = Math.min(1, (FAR_BOTTOM - y) / 170);      // no seam against the near field
    const w = 5 + rand() * 30;
    g.rect(x - w / 2, y, w, 1).fill({
      color: rand() < 0.14 ? PAL.cyan : SEA.foam,
      alpha: (0.05 + rand() * 0.12) * fade * farLight(x, y),
    });
  }
}

/* ---- rain, and the rings it leaves ------------------------------------------------------------ */

// Two slow sources spreading wide rings — the wave treatment itself. They sit in open water,
// away from the quay, so they never compete with the waterline.
const RING_SRC = [[-260, 90, 0], [300, 30, 1.7]];
// Impact rings: one per drop that lands, small and quick. Deterministic, so nothing is allocated
// per frame and the pattern does not drift between reloads.
// Roughly a third of these land where the island covers them, so the count is higher than what
// ends up visible.
const DROPS = 48;

function rings(g, t) {
  g.clear();
  for (const [dx, dy, phase] of RING_SRC) {
    const x = CORNER[0] + dx, y = CORNER[1] + dy;
    for (let n = 0; n < 3; n++) {
      const f = (t * 0.3 + phase + n / 3) % 1;
      const r = 14 + f * 96;
      g.ellipse(x, y, r, r * 0.5)
        .stroke({ width: 1.6 - f, color: SEA.foam, alpha: 0.16 * (1 - f) });
    }
  }
  const rand = rng(0x2b71);
  for (let n = 0; n < DROPS; n++) {
    const x = CORNER[0] - 560 + rand() * 1120;
    const y = CORNER[1] - 60 + rand() * 330;
    const f = ((t / (2.2 + rand() * 2.4)) + rand()) % 1;
    const r = 1.5 + f * 22;
    g.ellipse(x, y, r, r * 0.5)
      .stroke({ width: 0.4 + 1.1 * (1 - f), color: SEA.foam, alpha: 0.26 * (1 - f) * (1 - f) });
  }
  // The same rain falls on the far water, so the same rings are there — same size, dimmer.
  for (let n = 0; n < 34; n++) {
    const x = -1150 + rand() * 2300;
    const y = FAR_TOP + 60 + rand() * (FAR_BOTTOM - FAR_TOP - 60);
    const f = ((t / (2.4 + rand() * 2.6)) + rand()) % 1;
    const r = 1.5 + f * 22;
    g.ellipse(x, y, r, r * 0.5).stroke({
      width: 0.4 + 1.1 * (1 - f), color: SEA.foam,
      alpha: 0.26 * (1 - f) * (1 - f) * farLight(x, y),
    });
  }
}

// Light rain: thin slanted streaks, sparse enough that the city stays the subject. They are
// drawn over everything, because rain is between the viewer and the scene.
const RAIN_N = 300;
const RAIN_SPAN = 1700;                 // the loop height; wide enough to cover a phone framing too
function rain(g, t) {
  g.clear();
  const rand = rng(0x9c31);
  for (let n = 0; n < RAIN_N; n++) {
    const x0 = -1200 + rand() * 2400;
    const speed = 340 + rand() * 240;
    const y = ((rand() * RAIN_SPAN) + t * speed) % RAIN_SPAN - 700;
    const len = 11 + rand() * 17;
    g.moveTo(x0, y).lineTo(x0 + len * 0.3, y + len)
      .stroke({ width: 0.9, color: rand() < 0.18 ? PAL.cyan : SEA.foam, alpha: 0.09 + rand() * 0.13 });
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
  const slices = 14;
  for (let n = 0; n < slices; n++) {
    const f = n / slices;
    const y = top + 4 + f * height;
    const jitter = Math.sin(t * 0.8 + n * 0.55 + x * 0.01) * (1.4 + f * 4.5);
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
  // Pixi writes touch-action:none on its canvas; the canvas covers the scrollable page, so on a
  // phone that swallows every swipe. Nothing here is interactive.
  app.stage.eventMode = "none";
  app.canvas.style.touchAction = "pan-y";

  const world = new Container();
  app.stage.addChild(world);

  // The sea is drawn far beyond the island, because the layout only fits the ISLAND on screen —
  // sizing the view to the water would shrink the city to a dot.
  const X0 = -1500, X1 = 1500, Y0 = -900, Y1 = 1500;
  const water = new Graphics();
  sea(water, X0, X1, Y0, Y1);
  const rippleG = new Graphics();
  ripples(rippleG, X0, X1, Y0, Y1, 0x51a7);
  farRipples(rippleG, 0x7d13);
  const seaGlow = new Graphics();
  seaGlow.blendMode = "add";
  // The city throws its colour onto the water long before any reflection is resolved.
  pool(seaGlow, MIDI + 4, J1 + 5, 16, PAL.pink, 0.5);
  pool(seaGlow, I1 + 6, MIDJ, 15, PAL.cyan, 0.5);
  pool(seaGlow, MIDI - 6, J1 + 4, 13, PAL.white, 0.32);
  // …and behind it too. Colour only in front of the island is what made the far water read as a
  // different surface: a city lights the water on every side of itself.
  pool(seaGlow, MIDI - 2, C0 - 9, 19, PAL.cyan, 0.3);
  pool(seaGlow, MIDI + 9, C0 - 7, 15, PAL.pink, 0.24);
  // The rings sit under the reflections: the reflection is the subject, the rings are weather.
  const ringG = new Graphics();
  const reflect = new Graphics();
  reflect.blendMode = "add";
  world.addChild(water, rippleG, ringG, reflect, seaGlow);

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
  const rainG = new Graphics();
  world.addChild(body, glow, floating, floatGlow, rainG);

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
    // The reflection is the only thing that is redrawn, and at about 20 fps: it is what carries
    // the water, and it is also the only thing here that costs anything.
    if (t - lastMesh > 0.05) {
      lastMesh = t;
      reflect.clear();
      for (const b of STREET_BLOCKS) reflection(reflect, b, t);
    }
    rippleG.y = Math.sin(t * 0.22) * 5;                    // the whole surface breathes, slowly
    rings(ringG, t);
    rain(rainG, t);
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
