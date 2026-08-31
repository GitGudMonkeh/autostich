// Park and vehicle study — the two props reworked in the facade language.
// Deliberately OUTSIDE src/: design exploration.
//
// Two rules carried over from the facade study, because they are what made the buildings work:
//   1. Detail sits on continuous surfaces, not on stacked blocks.
//   2. One lead colour per object plus a lighter shade of it. Never a mixed set.
// The hologrid stays an accent: a dashed tile border, a holo pylon, a few violet shards.
//
// Everything is drawn at the REAL footprint of a grid cell (132 × 66) and only the panel is
// scaled up. A park that only works at three times its size is not a park for this game.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { rng, dashLine, TILE_W, TILE_H } from "./buildings.js";
import { vehicle, VEHICLES } from "./vehicles.js";

const C2 = 0xb06bff;                // hologrid violet — accent only
const STONE = 0x39435c, STONE_HI = 0x55607d;

const diamond = (w, h, cx = 0, cy = 0) => [cx, cy - h / 2, cx + w / 2, cy, cx, cy + h / 2, cx - w / 2, cy];

// Ground point from tile coordinates u,v ∈ [-1,1] (u = right-down axis, v = left-down axis).
const gp = (u, v) => [(u - v) * (TILE_W / 4), (u + v) * (TILE_H / 4)];

/* ---- shared props ------------------------------------------------------------------------ */

// Faceted canopy on a real trunk. Three facets instead of two: at tile scale the silhouette is
// what reads, and two facets make a diamond, not a tree.
function tree(g, x, y, s, lead, light) {
  g.ellipse(x, y, 7 * s, 3.2 * s).fill({ color: 0x0b1a14, alpha: 0.9 });
  g.moveTo(x, y).lineTo(x - 0.6 * s, y - 8 * s).stroke({ width: 1.6 * s, color: 0x3a3327 });
  for (let i = 0; i < 3; i++) {
    const w = (13 - i * 3) * s, h = (9 - i * 1.6) * s, cy = y - 8 * s - i * 5 * s;
    const T = [x, cy - h], L = [x - w / 2, cy], R = [x + w / 2, cy], B = [x, cy + h * 0.3];
    g.poly([...T, ...L, ...B]).fill(lead);
    g.poly([...T, ...R, ...B]).fill(light);
    g.poly([...T, ...L, ...B, ...R]).stroke({ width: 0.8, color: light, alpha: 0.5 });
  }
}

function shrub(g, x, y, s, lead, light) {
  g.ellipse(x, y, 5 * s, 2.4 * s).fill(lead);
  g.ellipse(x - 1 * s, y - 1.4 * s, 3.4 * s, 2 * s).fill(light);
}

function bench(g, x, y, s, flip) {
  const d = flip ? -1 : 1;
  g.poly([x - 4 * s, y, x, y + 2 * s, x + 4 * s * d, y - 0.4 * s, x, y - 2.4 * s]).fill(STONE_HI);
  g.moveTo(x - 4 * s, y - 0.4 * s).lineTo(x, y - 2.8 * s).stroke({ width: 0.9, color: STONE });
}

function lamp(g, x, y, s, glow) {
  g.moveTo(x, y).lineTo(x, y - 13 * s).stroke({ width: 1.2, color: STONE_HI });
  g.circle(x, y - 13.5 * s, 4 * s).fill({ color: glow, alpha: 0.16 });
  g.circle(x, y - 13.5 * s, 1.5 * s).fill(glow);
  g.poly([x, y - 12.5 * s, x - 5 * s, y + 1, x + 5 * s, y + 1]).fill({ color: glow, alpha: 0.05 });
}

// The one hologrid element every park carries: a small info pylon.
function pylon(g, x, y, s) {
  g.moveTo(x, y).lineTo(x, y - 9 * s).stroke({ width: 1.1, color: STONE_HI });
  const w = 5 * s, h = 6 * s;
  g.poly([x - w, y - 9 * s, x + w, y - 11 * s, x + w, y - 11 * s - h, x - w, y - 9 * s - h])
    .fill({ color: C2, alpha: 0.18 });
  g.poly([x - w, y - 9 * s, x + w, y - 11 * s, x + w, y - 11 * s - h, x - w, y - 9 * s - h])
    .stroke({ width: 1, color: C2, alpha: 0.9 });
  for (let i = 1; i <= 2; i++) {
    const t = i / 3;
    g.moveTo(x - w * 0.7, y - 9 * s - h * t).lineTo(x + w * 0.7, y - 10.4 * s - h * t)
      .stroke({ width: 0.8, color: C2, alpha: 0.45 });
  }
}

// Dashed tile border — the hologrid footprint every prop stands on.
function tilePlate(g, fill) {
  g.poly(diamond(TILE_W - 4, TILE_H - 2)).fill(fill);
  const d = diamond(TILE_W - 4, TILE_H - 2);
  for (let i = 0; i < 4; i++) {
    const a = [d[i * 2], d[i * 2 + 1]], b = [d[((i + 1) % 4) * 2], d[((i + 1) % 4) * 2 + 1]];
    dashLine(g, a[0], a[1], b[0], b[1], 5, 4);
  }
  g.stroke({ width: 1, color: C2, alpha: 0.5 });
}

/* ---- park variants ----------------------------------------------------------------------- */

// P1 · Stadtgarten — paved cross, planted quarters, a basin in the middle. The ordinary city
//      park, which is exactly why it reads as one.
const LAWN = 0x143a2a, LAWN_HI = 0x1e5c3c;
function parkGarden(g) {
  tilePlate(g, LAWN);
  const path = 0x2b3346;
  for (const [a, b] of [[gp(-0.9, 0), gp(0.9, 0)], [gp(0, -0.9), gp(0, 0.9)]]) {
    const nx = (b[1] - a[1]), ny = -(b[0] - a[0]);
    const l = Math.hypot(nx, ny), w = 4.5;
    g.poly([a[0] + nx / l * w, a[1] + ny / l * w, b[0] + nx / l * w, b[1] + ny / l * w,
      b[0] - nx / l * w, b[1] - ny / l * w, a[0] - nx / l * w, a[1] - ny / l * w]).fill(path);
  }
  g.poly(diamond(34, 17)).fill(path);                       // plaza
  g.ellipse(0, 0, 11, 5.5).fill(0x0d2740);                  // basin
  g.ellipse(0, 0, 11, 5.5).stroke({ width: 1, color: 0x6fd8ff, alpha: 0.8 });
  g.ellipse(0, -0.5, 5, 2.5).stroke({ width: 0.8, color: 0x6fd8ff, alpha: 0.4 });
  g.moveTo(0, -1).lineTo(0, -8).stroke({ width: 1, color: 0xaee9ff, alpha: 0.7 });
  const items = [];
  for (const [u, v] of [[-0.55, -0.5], [0.5, -0.55], [-0.5, 0.5], [0.55, 0.5]]) {
    const [x, y] = gp(u, v);
    items.push([y, (gg) => shrub(gg, x, y, 1.1, LAWN_HI, 0x2b7a52)]);
  }
  for (const [u, v, s] of [[-0.72, 0.15, 1], [0.68, -0.2, 0.85], [0.1, 0.72, 0.9]]) {
    const [x, y] = gp(u, v);
    items.push([y, (gg) => tree(gg, x, y, s, 0x123a28, 0x2a7d52)]);
  }
  items.push([gp(-0.28, 0.28)[1], (gg) => bench(gg, ...gp(-0.28, 0.28), 1, false)]);
  items.push([gp(0.3, -0.3)[1], (gg) => bench(gg, ...gp(0.3, -0.3), 1, true)]);
  items.push([gp(0.42, 0.42)[1], (gg) => lamp(gg, ...gp(0.42, 0.42), 1, 0xffd08a)]);
  items.push([gp(-0.45, -0.4)[1], (gg) => pylon(gg, ...gp(-0.45, -0.4), 1)]);
  items.sort((a, b) => a[0] - b[0]).forEach(([, draw]) => draw(g));
}

// P2 · Wasserterrassen — a stepped water channel with stone edges. Architectural, and the only
//      variant whose height reads from across the board.
function parkWater(g) {
  tilePlate(g, 0x16233a);
  const steps = [[0.0, 26, 0], [0.34, 19, 3], [0.62, 12, 6]];
  for (const [t, w, lift] of steps) {
    const [cx, cy] = gp(t - 0.1, t - 0.1);
    g.poly(diamond(TILE_W * 0.72 - w, TILE_H * 0.72 - w / 2, cx, cy - lift)).fill(STONE);
    g.poly(diamond(TILE_W * 0.72 - w - 8, TILE_H * 0.72 - w / 2 - 4, cx, cy - lift - 1)).fill(0x0d3350);
    g.poly(diamond(TILE_W * 0.72 - w - 8, TILE_H * 0.72 - w / 2 - 4, cx, cy - lift - 1))
      .stroke({ width: 1, color: 0x6fd8ff, alpha: 0.75 });
  }
  for (let i = 0; i < 3; i++) {                             // cascade highlights
    const [x, y] = gp(0.2 + i * 0.16, 0.2 + i * 0.16);
    g.moveTo(x - 4, y - i * 3).lineTo(x + 4, y - i * 3 + 1)
      .stroke({ width: 1.4, color: 0xaee9ff, alpha: 0.7 });
  }
  const items = [];
  const [bx, by] = gp(-0.45, 0.45);                         // footbridge across the lowest basin
  g.poly([bx - 13, by, bx, by + 6, bx + 13, by, bx, by - 6]).fill(STONE_HI);
  g.moveTo(bx - 12, by - 3).lineTo(bx, by - 8).lineTo(bx + 12, by - 3)
    .stroke({ width: 1, color: 0x6fd8ff, alpha: 0.5 });
  for (const [u, v, s] of [[-0.78, -0.2, 0.9], [0.25, -0.78, 0.8]]) {
    const [x, y] = gp(u, v);
    items.push([y, (gg) => tree(gg, x, y, s, 0x123a34, 0x2a7d70)]);
  }
  for (const [u, v] of [[-0.3, -0.62], [0.62, 0.3], [-0.62, -0.62]]) {
    const [x, y] = gp(u, v);
    items.push([y, (gg) => shrub(gg, x, y, 1, 0x14463a, 0x1f6b56)]);
  }
  items.push([gp(0.72, -0.55)[1], (gg) => lamp(gg, ...gp(0.72, -0.55), 0.9, 0x8ceaff)]);
  items.push([gp(-0.68, 0.72)[1], (gg) => pylon(gg, ...gp(-0.68, 0.72), 0.9)]);
  items.sort((a, b) => a[0] - b[0]).forEach(([, draw]) => draw(g));
}

// P3 · Schrein-Garten — raked gravel, set stones, a torii. Ties the park to the pagoda
//      buildings, and it is the one park that stays quiet at night.
const VERM = 0xd2543a, GOLD = 0xffc94a;
function parkShrine(g) {
  tilePlate(g, 0x2a2b33);
  for (let r = 1; r <= 4; r++) {                            // raked gravel rings
    g.poly(diamond(20 + r * 20, 10 + r * 10)).stroke({ width: 0.8, color: 0x3d3f4c, alpha: 0.9 });
  }
  const items = [];
  for (const [u, v, s] of [[-0.2, 0.1, 1.3], [0.12, -0.05, 0.9], [0.02, 0.3, 0.7]]) {
    const [x, y] = gp(u, v);                                // set stones
    items.push([y, (gg) => {
      gg.ellipse(x, y + 1, 6 * s, 2.6 * s).fill({ color: 0x1d1e26, alpha: 0.9 });
      gg.poly([x - 5 * s, y, x - 1 * s, y - 5 * s, x + 4 * s, y - 3 * s, x + 5 * s, y + 1 * s, x, y + 2.4 * s])
        .fill(0x4a4d5c);
      gg.poly([x - 1 * s, y - 5 * s, x + 4 * s, y - 3 * s, x + 1 * s, y - 1.6 * s]).fill(0x646880);
    }]);
  }
  const [tx, ty] = gp(-0.55, -0.55);                        // torii — the shrine gate
  items.push([ty, (gg) => {
    const h = 17, w = 9;
    gg.moveTo(tx - w, ty).lineTo(tx - w, ty - h).moveTo(tx + w, ty).lineTo(tx + w, ty - h)
      .stroke({ width: 2.4, color: VERM });
    gg.moveTo(tx - w * 1.5, ty - h).lineTo(tx + w * 1.5, ty - h - 2).stroke({ width: 3, color: VERM });
    gg.moveTo(tx - w, ty - h * 0.72).lineTo(tx + w, ty - h * 0.76).stroke({ width: 1.8, color: 0xe8735a });
    gg.circle(tx - w * 1.5, ty - h, 1.3).fill(GOLD);
    gg.circle(tx + w * 1.5, ty - h - 2, 1.3).fill(GOLD);
  }]);
  const [px, py] = gp(0.55, 0.5);                           // stone lantern
  items.push([py, (gg) => {
    gg.ellipse(px, py, 5, 2.4).fill(0x24262e);
    gg.poly([px - 3, py - 1, px + 3, py - 1, px + 2, py - 7, px - 2, py - 7]).fill(0x4a4d5c);
    gg.poly([px - 4, py - 7, px + 4, py - 7, px + 3, py - 11, px - 3, py - 11]).fill(0x646880);
    gg.circle(px, py - 9, 1.6).fill(GOLD);
    gg.circle(px, py - 9, 5).fill({ color: GOLD, alpha: 0.16 });
    gg.poly([px - 5, py - 11, px + 5, py - 11, px, py - 14]).fill(0x4a4d5c);
  }]);
  items.push([gp(0.62, -0.42)[1], (gg) => tree(gg, ...gp(0.62, -0.42), 1.05, 0x3a2233, 0x7a3f57)]);
  items.push([gp(-0.75, 0.62)[1], (gg) => pylon(gg, ...gp(-0.75, 0.62), 0.85)]);
  items.sort((a, b) => a[0] - b[0]).forEach(([, draw]) => draw(g));
}

const PARKS = [
  { key: "garden", name: "Stadtgarten", draw: parkGarden },
  { key: "water", name: "Wasserterrassen", draw: parkWater },
  { key: "shrine", name: "Schrein-Garten", draw: parkShrine },
];

/* ---- vehicles ---------------------------------------------------------------------------- */

/* ---- page ------------------------------------------------------------------------------- */

function parkPanel(def) {
  const c = new Container();
  const g = new Graphics();
  def.draw(g);
  c.addChild(g);
  const rand = rng(def.key.length * 7919 + 3);
  const shards = new Graphics();                             // hologrid shards, four per park
  for (let n = 0; n < 4; n++) {
    const a = rand() * Math.PI * 2, d = 40 + rand() * 26, s = 2.5 + rand() * 2;
    const x = Math.cos(a) * d, y = -8 - rand() * 26 + Math.sin(a) * d * 0.5;
    shards.poly([x, y - s, x + s * 0.55, y, x, y + s, x - s * 0.55, y])
      .fill({ color: C2, alpha: 0.18 }).stroke({ width: 0.9, color: C2, alpha: 0.85 });
  }
  c.addChild(shards);
  return { node: c, shards, phase: rand() * 6.28 };
}

function vehiclePanel(def) {
  const c = new Container();
  const big = new Graphics();
  vehicle(big, "E", def.spec);
  big.scale.set(2.2);                                        // zoomed for inspection
  c.addChild(big);
  big.position.set(0, -14);
  const strip = new Container();                             // all four headings at real size
  ["N", "E", "S", "W"].forEach((d, n) => {
    const g = new Graphics();
    vehicle(g, d, def.spec);
    g.position.set(-58 + n * 39, 62);
    strip.addChild(g);
  });
  const rule = new Graphics();
  rule.moveTo(-72, 40).lineTo(72, 40).stroke({ width: 1, color: 0x2b2547 });
  c.addChild(rule, strip);
  return { node: c, strip };
}

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const parks = PARKS.map((d) => parkPanel(d));
  const cars = VEHICLES.map((d) => vehiclePanel(d));
  for (const p of [...parks, ...cars]) app.stage.addChild(p.node);

  const layout = () => {
    const narrow = window.innerWidth < 820;
    const cols = narrow ? 1 : 3;
    const ROW_H = narrow ? 300 : 330;
    const rows = cols === 1 ? 6 : 2;
    host.style.height = `${rows * ROW_H}px`;
    app.renderer.resize(host.clientWidth, rows * ROW_H);
    const labels = document.getElementById("labels");
    labels.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    labels.style.gridAutoRows = `${ROW_H}px`;
    const cw = app.screen.width / cols;
    const place = (p, n, cap, anchor) => {
      const cx = cw * (n % cols) + cw / 2;
      const top = ROW_H * Math.floor(n / cols);
      p.node.position.set(cx, top + ROW_H * anchor);
      p.node.scale.set(Math.min(cap, cw / 215));
    };
    parks.forEach((p, n) => place(p, n, 2.6, 0.62));
    cars.forEach((p, n) => place(p, n + 3, 1.7, 0.56));
  };
  layout();
  window.addEventListener("resize", layout);

  app.ticker.add(() => {
    const t = performance.now() / 1000;
    for (const p of parks) p.shards.y = Math.sin(t * 0.7 + p.phase) * 3;
    for (const p of cars) p.strip.y = Math.sin(t * 1.6) * 1.2;
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
