// Street study — three street variants with signage, signals and floating displays.
// Deliberately OUTSIDE src/: design exploration.
//
// Same rules as the facade and prop studies: detail on continuous surfaces, one lead colour per
// object plus a lighter shade, hologrid only as an accent. Everything is drawn at the REAL cell
// size (132 × 66) over a run of three tiles, so the carriageway, the kerb and every sign are at
// the size they would have in the grid — only the panel is scaled up for inspection.
//
// Coordinates: (a, b) are continuous tile coordinates — a runs along +i (down-right), b along +j
// (down-left). Tile n covers a ∈ [n-0.5, n+0.5]. Heights are plain pixels above the ground.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { rng, dashLine, TILE_W, TILE_H } from "./buildings.js";
import { vehicle, VEHICLES } from "./vehicles.js";

const SEAM = 0xb06bff;              // hologrid violet — tile seams only
const ASPHALT = 0x141225;
const KERB = 0x2f2a4a, KERB_TOP = 0x3b3560;
const WHITE = 0xe9e6ff;

const pt = (a, b, h = 0) => [(a - b) * (TILE_W / 2), (a + b) * (TILE_H / 2) - h];
const quad = (p0, p1, p2, p3) => [...p0, ...p1, ...p2, ...p3];
// A patch of ground (optionally raised), and a vertical plane along a or along b.
const slab = (a0, a1, b0, b1, h) => quad(pt(a0, b0, h), pt(a1, b0, h), pt(a1, b1, h), pt(a0, b1, h));
const wallA = (a0, a1, b, h0, h1) => quad(pt(a0, b, h0), pt(a1, b, h0), pt(a1, b, h1), pt(a0, b, h1));
const wallB = (b0, b1, a, h0, h1) => quad(pt(a, b0, h0), pt(a, b1, h0), pt(a, b1, h1), pt(a, b0, h1));

const LANE = 0.32;                  // half width of the carriageway in tile units
const A0 = -0.5, A1 = 2.5;          // the run is three tiles long

/* ---- ground ------------------------------------------------------------------------------ */

// Carriageway, raised kerbs, footways and the dashed hologrid tile seams underneath it all.
function roadBed(g, lead) {
  g.poly(slab(A0, A1, -0.5, 0.5, 0)).fill(0x0d0b1a);                 // plot
  g.poly(slab(A0, A1, -LANE, LANE, 0)).fill(ASPHALT);                // carriageway
  for (const side of [-1, 1]) {                                      // kerb face + footway
    const inner = side * LANE, outer = side * 0.5;
    g.poly(wallA(A0, A1, inner, 0, 3)).fill(KERB);
    g.poly(slab(A0, A1, inner, outer, 3)).fill(KERB_TOP);
    g.poly(slab(A0, A1, inner, side * (LANE + 0.03), 3)).fill({ color: lead, alpha: 0.5 });
    for (let a = A0 + 0.12; a < A1; a += 0.24) {                     // paving joints
      const p = pt(a, inner, 3), q = pt(a, outer, 3);
      g.moveTo(p[0], p[1]).lineTo(q[0], q[1]);
    }
  }
  g.stroke({ width: 0.8, color: 0x241f3d, alpha: 0.9 });
  for (let n = 0; n <= 3; n++) {                                     // hologrid tile seams
    const p = pt(n - 0.5, -0.5), q = pt(n - 0.5, 0.5);
    dashLine(g, p[0], p[1], q[0], q[1], 5, 4);
  }
  g.stroke({ width: 1, color: SEAM, alpha: 0.35 });
}

function centreLine(g, colour, dash = 9, gap = 7) {
  const p = pt(A0, 0), q = pt(A1, 0);
  dashLine(g, p[0], p[1], q[0], q[1], dash, gap);
  g.stroke({ width: 1.6, color: colour, alpha: 0.85 });
}

/* ---- street furniture -------------------------------------------------------------------- */

function mast(g, a, b, h, w = 1.1) {
  g.moveTo(...pt(a, b, 0)).lineTo(...pt(a, b, h)).stroke({ width: w, color: 0x5a5480 });
  g.ellipse(...pt(a, b, 0), 3, 1.5).fill({ color: 0x000000, alpha: 0.45 });
}

// Street lamp: the light itself is small, the pool of light on the road does the work.
function lamp(g, glow, a, b, colour) {
  mast(g, a, b, 26);
  const arm = b > 0 ? -0.16 : 0.16;
  g.moveTo(...pt(a, b, 26)).lineTo(...pt(a, b + arm, 27)).stroke({ width: 1.1, color: 0x5a5480 });
  const head = pt(a, b + arm, 27);
  g.poly([head[0] - 3, head[1], head[0] + 3, head[1], head[0] + 2, head[1] + 2.4, head[0] - 2, head[1] + 2.4])
    .fill({ color: colour, alpha: 0.95 });
  glow.ellipse(...pt(a, b + arm, 0), 26, 13).fill({ color: colour, alpha: 0.09 });
  glow.ellipse(...pt(a, b + arm, 0), 14, 7).fill({ color: colour, alpha: 0.08 });
  glow.circle(head[0], head[1] + 1, 6).fill({ color: colour, alpha: 0.3 });
}

// Traffic signal: mast, boom over the carriageway, three lamps of which one is live.
function signal(g, glow, a, b, phase) {
  mast(g, a, b, 30, 1.3);
  const dir = b > 0 ? -1 : 1;
  g.moveTo(...pt(a, b, 30)).lineTo(...pt(a, b + dir * 0.3, 31)).stroke({ width: 1.1, color: 0x5a5480 });
  const head = pt(a, b + dir * 0.3, 31);
  g.poly([head[0] - 3.4, head[1] - 1, head[0] + 3.4, head[1] - 1,
    head[0] + 3.4, head[1] + 12, head[0] - 3.4, head[1] + 12]).fill(0x191531);
  g.poly([head[0] - 3.4, head[1] - 1, head[0] + 3.4, head[1] - 1,
    head[0] + 3.4, head[1] + 12, head[0] - 3.4, head[1] + 12])
    .stroke({ width: 0.9, color: 0x5a5480, alpha: 0.9 });
  const lamps = [0xff4d5e, 0xffc94a, 0x4dffa1];
  lamps.forEach((c, n) => {
    const on = n === phase;
    const y = head[1] + 1.6 + n * 3.6;
    g.circle(head[0], y, 1.4).fill({ color: c, alpha: on ? 1 : 0.16 });
    if (on) glow.circle(head[0], y, 6).fill({ color: c, alpha: 0.4 });
  });
  if (phase === 2) glow.ellipse(...pt(a, b + dir * 0.3, 0), 16, 8).fill({ color: lamps[2], alpha: 0.08 });
}

// Road sign on a post: a lit panel with abstract glyph bars — never faked lettering.
function signPost(g, glow, a, b, colour, rand) {
  mast(g, a, b, 17);
  const w = 0.17, h0 = 17, h1 = 28;
  const face = wallA(a - w, a + w, b, h0, h1);
  g.poly(face).fill(0x120f26);
  g.poly(face).stroke({ width: 1, color: colour, alpha: 0.95 });
  for (let n = 0; n < 3; n++) {                                      // glyph bars
    const t0 = h0 + 2.5 + n * 3, len = 0.06 + rand() * 0.2;
    g.poly(wallA(a - w + 0.03, a - w + 0.03 + len, b, t0, t0 + 1.6)).fill({ color: colour, alpha: 0.9 });
  }
  glow.poly(wallA(a - w - 0.06, a + w + 0.06, b, h0 - 1.5, h1 + 1.5)).fill({ color: colour, alpha: 0.12 });
}

// Floating holo display: a panel hanging in the air over the street, with scanlines, a soft
// halo, a thin tether beam down to the ground and a light pool underneath.
function holoDisplay(g, glow, a, b, h, w, tall, colour, rand) {
  const face = wallA(a - w, a + w, b, h, h + tall);
  glow.poly(wallA(a - w - 0.12, a + w + 0.12, b, h - 3, h + tall + 3)).fill({ color: colour, alpha: 0.1 });
  g.poly(face).fill({ color: colour, alpha: 0.16 });
  g.poly(face).stroke({ width: 1.1, color: colour, alpha: 0.9 });
  for (let t = h + 2; t < h + tall - 1; t += 2.6) {                  // scanlines
    const p0 = pt(a - w + 0.03, b, t), p1 = pt(a + w - 0.03, b, t);
    g.moveTo(p0[0], p0[1]).lineTo(p1[0], p1[1]);
  }
  g.stroke({ width: 0.8, color: colour, alpha: 0.4 });
  for (let n = 0; n < 2; n++) {                                      // a couple of bright blocks
    const s = a - w + 0.06 + rand() * (2 * w - 0.3);
    const t = h + 3 + rand() * (tall - 8);
    g.poly(wallA(s, s + 0.1 + rand() * 0.12, b, t, t + 2.4)).fill({ color: colour, alpha: 0.85 });
  }
  const foot = pt(a, b, 0), top = pt(a, b, h);
  g.moveTo(foot[0], foot[1]).lineTo(top[0], top[1]).stroke({ width: 1, color: colour, alpha: 0.22 });
  glow.ellipse(foot[0], foot[1], 18, 9).fill({ color: colour, alpha: 0.07 });
}

// Kiosk: a small lit box on the footway with an awning — the shop fronts of the reference.
function kiosk(g, glow, a, b, colour) {
  const w = 0.2, side = Math.sign(b);
  g.poly(slab(a - w, a + w, b - side * 0.13, b + side * 0.06, 3)).fill(0x1d1836);
  g.poly(wallA(a - w, a + w, b - side * 0.13, 3, 16)).fill(0x241d40);
  g.poly(wallA(a - w + 0.04, a + w - 0.04, b - side * 0.13, 6, 13)).fill({ color: colour, alpha: 0.75 });
  g.poly(wallA(a - w, a + w, b - side * 0.13, 16, 17.4)).fill({ color: colour, alpha: 0.5 });
  glow.poly(wallA(a - w - 0.08, a + w + 0.08, b - side * 0.13, 4, 18)).fill({ color: colour, alpha: 0.11 });
  glow.ellipse(...pt(a, b - side * 0.2, 0), 15, 7).fill({ color: colour, alpha: 0.08 });
}

// Gantry: two masts and a beam across the carriageway carrying displays.
function gantry(g, glow, a, colour, rand) {
  mast(g, a, -0.46, 34, 1.4);
  mast(g, a, 0.46, 34, 1.4);
  g.poly(wallB(-0.46, 0.46, a, 34, 36.4)).fill(0x241d40);
  g.poly(wallB(-0.46, 0.46, a, 34, 36.4)).stroke({ width: 1, color: 0x5a5480, alpha: 0.9 });
  for (let n = 0; n < 3; n++) {                                      // display boxes under the beam
    const b0 = -0.34 + n * 0.24;
    g.poly(wallB(b0, b0 + 0.17, a, 28, 33.6)).fill(0x120f26);
    g.poly(wallB(b0, b0 + 0.17, a, 28, 33.6)).stroke({ width: 0.9, color: colour, alpha: 0.9 });
    for (let r = 0; r < 2; r++) {
      const t = 29.4 + r * 2.4;
      g.poly(wallB(b0 + 0.02, b0 + 0.05 + rand() * 0.1, a, t, t + 1.5)).fill({ color: colour, alpha: 0.9 });
    }
    glow.poly(wallB(b0 - 0.04, b0 + 0.21, a, 26.5, 35)).fill({ color: colour, alpha: 0.1 });
  }
}

function bollard(g, a, b, colour) {
  g.moveTo(...pt(a, b, 3)).lineTo(...pt(a, b, 8)).stroke({ width: 1.6, color: 0x3b3560 });
  g.circle(...pt(a, b, 8.6), 1).fill({ color: colour, alpha: 0.95 });
}

// Ground display: an information strip set into the footway, flush with the paving.
function groundPanel(g, glow, a, b, colour) {
  const p = slab(a - 0.14, a + 0.14, b - 0.05, b + 0.05, 3.2);
  g.poly(p).fill({ color: colour, alpha: 0.55 });
  g.poly(p).stroke({ width: 0.8, color: colour, alpha: 0.9 });
  glow.poly(slab(a - 0.2, a + 0.2, b - 0.1, b + 0.1, 3.2)).fill({ color: colour, alpha: 0.12 });
}

/* ---- the three street variants ------------------------------------------------------------ */

// S1 · Boulevard — the ordinary lit street: wide lanes, kerb light, lamps, signage, one signal.
const BOULEVARD = {
  key: "boulevard",
  name: "Boulevard",
  lead: 0x8ceaff,
  draw(g, glow, rand) {
    roadBed(g, 0x35d6ff);
    centreLine(g, 0xffc94a);
    for (const side of [-1, 1]) {                                    // lane edge lines
      const p = pt(A0, side * (LANE - 0.06)), q = pt(A1, side * (LANE - 0.06));
      g.moveTo(p[0], p[1]).lineTo(q[0], q[1]);
    }
    g.stroke({ width: 1, color: WHITE, alpha: 0.3 });
    const items = [];
    items.push([0.54, (gg) => lamp(gg, glow, 0.1, 0.44, 0x9fd8ff)]);
    items.push([0.96, (gg) => lamp(gg, glow, 1.4, -0.44, 0x9fd8ff)]);
    items.push([2.64, (gg) => signal(gg, glow, 2.2, 0.44, 2)]);
    items.push([0.36, (gg) => signPost(gg, glow, 0.8, -0.44, 0x8ceaff, rand)]);
    items.push([1.48, (gg) => groundPanel(gg, glow, 1.9, -0.42, 0x8ceaff)]);
    items.push([1.6, (gg) => holoDisplay(gg, glow, 1.1, 0.52, 32, 0.22, 14, 0x8ceaff, rand)]);
    for (const a of [0.35, 0.6, 1.65]) items.push([a - 0.4, (gg) => bollard(gg, a, -0.4, 0x9fd8ff)]);
    return items;
  },
};

// S2 · Gasse — the dense shopping lane: narrow, signs hung across the street, kiosks, floor
//      strips. This is the variant that makes a block feel inhabited.
const GASSE = {
  key: "gasse",
  name: "Neon-Gasse",
  lead: 0xff8ad8,
  draw(g, glow, rand) {
    roadBed(g, 0xff4fd8);
    centreLine(g, 0xff8ad8, 5, 6);
    const items = [];
    for (const a of [0.4, 1.3, 2.1]) {                               // signs strung over the lane
      const l = pt(a, -0.46, 26), r = pt(a, 0.46, 28);
      items.push([a, (gg) => {
        gg.moveTo(l[0], l[1]).lineTo(r[0], r[1]).stroke({ width: 0.8, color: 0x5a5480, alpha: 0.8 });
        for (let n = 0; n < 3; n++) {
          const t = 0.2 + n * 0.3, b = -0.46 + t * 0.92, top = 26 + t * 2;
          const c = n % 2 ? 0xff8ad8 : 0xffc478;
          gg.poly(wallB(b - 0.07, b + 0.07, a, top - 7, top - 1)).fill({ color: c, alpha: 0.8 });
          gg.poly(wallB(b - 0.07, b + 0.07, a, top - 7, top - 1)).stroke({ width: 0.8, color: c, alpha: 0.95 });
          glow.poly(wallB(b - 0.13, b + 0.13, a, top - 9, top + 1)).fill({ color: c, alpha: 0.11 });
        }
      }]);
    }
    items.push([1.14, (gg) => kiosk(gg, glow, 0.7, 0.44, 0xff8ad8)]);
    items.push([1.36, (gg) => kiosk(gg, glow, 1.8, -0.44, 0xffc478)]);
    items.push([1.59, (gg) => signPost(gg, glow, 1.15, 0.44, 0xff8ad8, rand)]);
    items.push([2.79, (gg) => lamp(gg, glow, 2.35, 0.44, 0xff9fe0)]);
    items.push([-0.24, (gg) => lamp(gg, glow, 0.2, -0.44, 0xff9fe0)]);
    for (const a of [0.5, 1.0, 1.5, 2.0]) items.push([a + 0.42, (gg) => groundPanel(gg, glow, a, 0.42, 0xff8ad8)]);
    items.push([1.05, (gg) => holoDisplay(gg, glow, 1.55, -0.52, 28, 0.18, 12, 0xffc478, rand)]);
    return items;
  },
};

// S3 · Magistrale — the through road: guard rails, chevrons, a signal gantry and the big
//      floating billboard over the carriageway.
const MAGISTRALE = {
  key: "magistrale",
  name: "Magistrale",
  lead: 0xffc478,
  draw(g, glow, rand) {
    roadBed(g, 0xffc478);
    for (const b of [-0.16, 0.16]) {                                 // two lanes each way
      const p = pt(A0, b), q = pt(A1, b);
      dashLine(g, p[0], p[1], q[0], q[1], 11, 9);
    }
    g.stroke({ width: 1.3, color: WHITE, alpha: 0.35 });
    centreLine(g, 0xffc94a, 14, 6);
    for (let a = A0 + 0.2; a < A1; a += 0.4) {                       // chevrons on the hard strip
      const c0 = pt(a, -0.29), c1 = pt(a + 0.12, -0.22), c2 = pt(a, -0.15);
      g.moveTo(c0[0], c0[1]).lineTo(c1[0], c1[1]).lineTo(c2[0], c2[1]);
    }
    g.stroke({ width: 1, color: 0xffc478, alpha: 0.45 });
    const items = [];
    for (const side of [-1, 1]) {                                    // guard rails on both kerbs
      items.push([side < 0 ? -0.9 : 2.9, (gg) => {
        gg.poly(wallA(A0, A1, side * (LANE + 0.02), 3, 4)).fill({ color: 0x4a4370 });
        gg.poly(wallA(A0, A1, side * (LANE + 0.02), 7, 8.2)).fill({ color: 0x5a5480 });
        for (let a = A0 + 0.15; a < A1; a += 0.3) {
          gg.moveTo(...pt(a, side * (LANE + 0.02), 3)).lineTo(...pt(a, side * (LANE + 0.02), 8));
        }
        gg.stroke({ width: 0.9, color: 0x4a4370 });
      }]);
    }
    items.push([1.5, (gg) => gantry(gg, glow, 1.5, 0xffc478, rand)]);
    items.push([1.86, (gg) => signal(gg, glow, 2.3, -0.44, 0)]);
    items.push([1.02, (gg) => holoDisplay(gg, glow, 0.5, 0.54, 38, 0.28, 17, 0xff8ad8, rand)]);
    items.push([1.46, (gg) => holoDisplay(gg, glow, 2.0, -0.56, 42, 0.2, 13, 0x8ceaff, rand)]);
    items.push([0.46, (gg) => lamp(gg, glow, 0.9, -0.44, 0xffd8a0)]);
    items.push([2.89, (gg) => lamp(gg, glow, 2.45, 0.44, 0xffd8a0)]);
    return items;
  },
};

const STREETS = [BOULEVARD, GASSE, MAGISTRALE];

/* ---- page --------------------------------------------------------------------------------- */

function streetPanel(def, seed) {
  const c = new Container();
  const g = new Graphics();          // road bed and markings
  const glow = new Graphics();       // additive light, drawn over everything
  glow.blendMode = "add";
  const rand = rng(seed * 7919 + 17);
  const items = def.draw(g, glow, rand) || [];

  // One vehicle per street, on the carriageway, so every sign has something to be read from.
  const v = VEHICLES[seed % VEHICLES.length];
  items.push([0.99, (gg) => {                                        // one car on the carriageway
    vehicle(gg, "E", { ...v.spec, alt: 4 });
    const cp = pt(1.15, -0.16, 0);
    gg.position.set(cp[0], cp[1]);
  }]);

  // Each prop gets its own Graphics and they are added in depth order, so a lamp on the near
  // kerb covers the car and a lamp on the far kerb does not.
  const layer = new Container();
  items.sort((a, b) => a[0] - b[0]).forEach(([, draw]) => {
    const gg = new Graphics();
    draw(gg);
    layer.addChild(gg);
  });
  c.addChild(g, layer, glow);
  return { node: c, glow, phase: rand() * 6.28 };
}

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const panels = STREETS.map((d, n) => {
    const p = streetPanel(d, n + 1);
    app.stage.addChild(p.node);
    return p;
  });

  const layout = () => {
    const narrow = window.innerWidth < 820;
    const cols = narrow ? 1 : 3;
    const rowH = narrow ? 320 : 400;
    const labelH = narrow ? 104 : 92;
    const rows = Math.ceil(panels.length / cols);
    host.style.height = `${rows * rowH}px`;
    app.renderer.resize(host.clientWidth, rows * rowH);
    const labels = document.getElementById("labels");
    labels.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    labels.style.gridAutoRows = `${rowH}px`;
    // Extent of a three-tile run including the tallest signage, so the panel is fitted and
    // centred instead of nudged by hand.
    const x0 = pt(A0, 0.6)[0], x1 = pt(A1, -0.6)[0];
    const y0 = pt(A0, -0.6, 58)[1], y1 = pt(A1, 0.6, 0)[1];
    const cxc = (x0 + x1) / 2, cyc = (y0 + y1) / 2;
    const cw = app.screen.width / cols;
    panels.forEach((p, n) => {
      const s = Math.min(cw * 0.92 / (x1 - x0), (rowH - labelH) * 0.94 / (y1 - y0), 2.2);
      p.node.scale.set(s);
      p.node.position.set(cw * (n % cols) + cw / 2 - cxc * s,
        rowH * Math.floor(n / cols) + labelH + (rowH - labelH) / 2 - cyc * s);
    });
  };
  layout();
  window.addEventListener("resize", layout);

  app.ticker.add(() => {                                             // holo panels breathe
    const t = performance.now() / 1000;
    for (const p of panels) p.glow.alpha = 0.78 + 0.22 * Math.sin(t * 1.5 + p.phase);
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
