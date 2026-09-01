// Reference study — the "Neon City" reference rebuilt as one cluster on a slab.
// Deliberately OUTSIDE src/: design exploration, and deliberately not wired into the city.
//
// The look itself lives in refRender.js; this file is only the arrangement.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { CS, ISO, P, rng } from "./buildings.js";
import { PAL, topFace, drawBlock } from "./refRender.js";

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
