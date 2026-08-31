// City-grid prototype, fully procedural — no image assets. Pixi v8 Graphics only.
// Deliberately OUTSIDE src/: no app screen, no production-bundle impact, no new dependency.
//
// Geometry model: classic 2:1 isometric diamonds, edge-to-edge. Because every tile is drawn
// in code, road connections are correct BY CONSTRUCTION: lane lines run from a tile's center
// to the midpoint of a connected edge, and adjacent tiles share that midpoint exactly.
//
// Mechanic: clicking a free cell erects a building (bottom-up growth + neon flash) and lays a
// road ring around its lot. Rings of neighboring buildings merge; each road tile re-tiles from
// the 4-neighbor bitmask, so straights, corners, T-junctions and crossings emerge logically.

import { Application, Graphics, Container, Polygon } from "./vendor/pixi.min.mjs";

const TILE_W = 132, TILE_H = 66;
const GRID = 12;                 // 12x12 cells
const BUILD_MS = 900;

const CYAN = 0x35d6ff, MAGENTA = 0xff4fd8, CURB = 0x2a9fd8;
// Full sign-district spectrum. Two accent colours read too tame — every lot now picks its own
// tube colour, and a second one for its windows, so a block never looks monochrome.
const NEON = [0x35d6ff, 0xff4fd8, 0x9d5cff, 0x2bff88, 0xff8a3d, 0xffc94a, 0xff3b5c, 0x66f0ff];
const key = (r, c) => `${r},${c}`;
const inGrid = (r, c) => r >= 0 && r < GRID && c >= 0 && c < GRID;

// Deterministic per-cell randomness so a rebuild of the same cell looks identical.
function seededRand(r, c) {
  let s = (r * 73856093) ^ (c * 19349663) ^ 0x9e3779b9;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const world = new Container();
  world.sortableChildren = true;
  app.stage.addChild(world);
  const recenter = () => world.position.set(app.screen.width / 2, app.screen.height / 2 - (GRID * TILE_H) / 2 + 40);
  recenter();
  app.renderer.on("resize", recenter);

  const cellPos = (r, c) => ({ x: (c - r) * (TILE_W / 2), y: (c + r) * (TILE_H / 2) });

  // ---- cell state ----------------------------------------------------------
  const state = new Map();     // key -> 'ground' | 'road' | 'building'
  const groundG = new Map();   // key -> Graphics (clickable ground diamond)
  const roadG = new Map();     // key -> Graphics (road tile)
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) state.set(key(r, c), "ground");

  // Diamond hit area in LOCAL coordinates around the Graphics origin (lesson learned from the
  // asset prototype: rectangular bounds massively overlap neighbors in an iso grid).
  const diamondHit = new Polygon([0, -TILE_H / 2, TILE_W / 2, 0, 0, TILE_H / 2, -TILE_W / 2, 0]);

  function diamondPath(g, w, h) {
    return g.poly([0, -h / 2, w / 2, 0, 0, h / 2, -w / 2, 0]);
  }

  function drawGround(g, hover) {
    g.clear();
    diamondPath(g, TILE_W - 2, TILE_H - 1).fill(hover ? 0x141d30 : 0x0a0e18);
    diamondPath(g, TILE_W - 2, TILE_H - 1).stroke({ width: 1, color: hover ? CYAN : 0x24204a, alpha: hover ? 0.9 : 0.85 });
  }

  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
    const { x, y } = cellPos(r, c);
    const g = new Graphics();
    drawGround(g, false);
    g.position.set(x, y);
    g.zIndex = r + c;
    g.eventMode = "static";
    g.cursor = "pointer";
    g.hitArea = diamondHit;
    g.on("pointerover", () => drawGround(g, true));
    g.on("pointerout", () => drawGround(g, false));
    g.on("pointerdown", () => placeBuilding(r, c));
    world.addChild(g);
    groundG.set(key(r, c), g);
  }

  // ---- roads ---------------------------------------------------------------
  // Edge midpoints toward each neighbor: N=(r-1,c) top-right edge, E=(r,c+1) bottom-right,
  // S=(r+1,c) bottom-left, W=(r,c-1) top-left. Shared exactly with the adjacent tile.
  const EDGE_MID = {
    N: [TILE_W / 4, -TILE_H / 4],
    E: [TILE_W / 4, TILE_H / 4],
    S: [-TILE_W / 4, TILE_H / 4],
    W: [-TILE_W / 4, -TILE_H / 4],
  };
  const EDGE_CORNERS = { // full edge for curb drawing: [fromCorner, toCorner]
    N: [[0, -TILE_H / 2], [TILE_W / 2, 0]],
    E: [[TILE_W / 2, 0], [0, TILE_H / 2]],
    S: [[0, TILE_H / 2], [-TILE_W / 2, 0]],
    W: [[-TILE_W / 2, 0], [0, -TILE_H / 2]],
  };
  const DIRS = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };

  const AMBER = 0xffa347;
  function drawRoad(g, conn, lane) {
    g.clear();
    diamondPath(g, TILE_W, TILE_H).fill(0x11121c); // asphalt
    // curbs on unconnected edges (inset slightly so neighboring curbs don't double up)
    for (const d of Object.keys(EDGE_CORNERS)) {
      if (conn.has(d)) continue;
      const [[x1, y1], [x2, y2]] = EDGE_CORNERS[d];
      // wide faint pass first: a cheap halo, so the curb reads as a lit tube on dark asphalt
      g.moveTo(x1 * 0.88, y1 * 0.88).lineTo(x2 * 0.88, y2 * 0.88)
        .stroke({ width: 7, color: CURB, alpha: 0.13 });
      g.moveTo(x1 * 0.88, y1 * 0.88).lineTo(x2 * 0.88, y2 * 0.88)
        .stroke({ width: 2.5, color: CURB, alpha: 0.9 });
    }
    // dashed centerlines from center to each connected edge midpoint
    for (const d of conn) {
      const [mx, my] = EDGE_MID[d];
      const SEGS = 4;
      for (const [w, a] of [[6, 0.14], [2, 0.95]]) {
        for (let i = 0; i < SEGS; i++) {
          const t0 = 0.18 + (i / SEGS) * 0.78, t1 = t0 + 0.42 / SEGS;
          g.moveTo(mx * t0 * 2 * 0.5, my * t0 * 2 * 0.5); // center(0,0) -> midpoint at t=1
          g.lineTo(mx * t1, my * t1);
        }
        g.stroke({ width: w, color: lane, alpha: a });
      }
    }
    // junction pad at 3+ connections
    if (conn.size >= 3) {
      diamondPath(g, TILE_W * 0.16, TILE_H * 0.16).fill({ color: CYAN, alpha: 0.25 });
      diamondPath(g, TILE_W * 0.16, TILE_H * 0.16).stroke({ width: 1.5, color: CYAN, alpha: 0.8 });
    }
  }

  function connectionsOf(r, c) {
    const conn = new Set();
    for (const [d, [dr, dc]] of Object.entries(DIRS)) {
      if (inGrid(r + dr, c + dc) && state.get(key(r + dr, c + dc)) === "road") conn.add(d);
    }
    return conn;
  }

  function recomputeRoads() {
    for (const [kk, g] of roadG) {
      const [r, c] = kk.split(",").map(Number);
      // lane colour alternates across the grid so the street net is not one flat magenta
      drawRoad(g, connectionsOf(r, c), (r + c) % 2 ? AMBER : MAGENTA);
    }
    updateParks();
    manageCarPopulation();
  }

  function makeRoad(r, c) {
    const kk = key(r, c);
    if (state.get(kk) !== "ground") return;
    state.set(kk, "road");
    const old = groundG.get(kk);
    if (old) { old.destroy(); groundG.delete(kk); }
    clearTrees(kk);
    const g = new Graphics();
    const { x, y } = cellPos(r, c);
    g.position.set(x, y);
    g.zIndex = r + c;
    // Roads are buildable too (that is how blocks grow into their own ring): clicking one
    // attempts a placement, which the block-size rule below may reject.
    g.eventMode = "static";
    g.cursor = "pointer";
    g.hitArea = diamondHit;
    g.on("pointerdown", () => placeBuilding(r, c));
    world.addChild(g);
    roadG.set(kk, g);
  }

  // Brief red pulse on a cell whose placement was rejected (block would exceed 4 buildings).
  function rejectFlash(r, c) {
    const g = new Graphics();
    diamondPath(g, TILE_W - 4, TILE_H - 2).stroke({ width: 2.5, color: 0xff3b30, alpha: 1 });
    const { x, y } = cellPos(r, c);
    g.position.set(x, y);
    g.zIndex = r + c + 0.9;
    world.addChild(g);
    const t0 = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / 500);
      g.alpha = 1 - t;
      if (t >= 1) { app.ticker.remove(tick); g.destroy(); }
    };
    app.ticker.add(tick);
  }

  // ---- parks (trees) -------------------------------------------------------
  // Trees do NOT pre-populate the field. They grow into the leftover pockets of the road
  // network: a ground cell hemmed in by roads/buildings on 3+ orthogonal sides is a spot no
  // street would ever need — it turns into a small neon park (with a grow-in animation).
  // Faceted low-poly canopies (dark left face, lighter right face, mint rim) match the
  // building style; deterministic per cell.
  const MINT = 0x51ffc4;
  const treeG = new Map(); // key -> Graphics
  function drawTree(g, tx, ty, s, rand) {
    g.ellipse(tx, ty + 1, 8 * s, 4 * s).stroke({ width: 1, color: MINT, alpha: 0.3 }); // landing ring
    const trunkH = 9 * s;
    g.moveTo(tx - 1, ty).lineTo(tx, ty - trunkH).stroke({ width: 2, color: 0x2a6f5a, alpha: 0.95 });
    const tiers = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < tiers; i++) {
      const w = (22 - i * 6) * s, h = (13 - i * 2) * s;
      const cy = ty - trunkH - i * 8.5 * s;
      const T = [tx, cy - h], B = [tx, cy + h * 0.25], L = [tx - w / 2, cy], R = [tx + w / 2, cy];
      g.poly([...T, ...L, ...B]).fill(0x0b241d);        // left facet (dark)
      g.poly([...T, ...R, ...B]).fill(0x14453a);        // right facet (lit)
      g.poly([...T, ...L, ...B, ...R]).stroke({ width: 1.2, color: MINT, alpha: 0.9 - i * 0.15 });
      g.moveTo(...T).lineTo(...B).stroke({ width: 1, color: MINT, alpha: 0.35 }); // facet ridge
    }
    const tipY = ty - trunkH - (tiers - 1) * 8.5 * s - (13 - (tiers - 1) * 2) * s;
    g.circle(tx, tipY, 1.6).fill({ color: MINT, alpha: 1 });
    g.circle(tx, tipY, 4).fill({ color: MINT, alpha: 0.18 });
  }
  // Additional pocket decorations beyond trees: lamp post, holo billboard, plaza fountain,
  // and a vermilion torii gate for the Japanese quarter feel.
  function drawLamp(g, x, y, s, color) {
    g.moveTo(x, y).lineTo(x, y - 18 * s).stroke({ width: 1.6, color: 0x3a4260, alpha: 0.95 });
    g.poly([x, y - 18 * s, x - 6 * s, y + 1, x + 6 * s, y + 1]).fill({ color, alpha: 0.06 }); // light cone
    g.circle(x, y - 18 * s, 2.2 * s).fill({ color, alpha: 1 });
    g.circle(x, y - 18 * s, 5 * s).fill({ color, alpha: 0.2 });
  }
  function drawBillboard(g, x, y, s, color) {
    g.moveTo(x, y).lineTo(x, y - 10 * s).stroke({ width: 1.6, color: 0x3a4260, alpha: 0.95 });
    const q = [x - 8 * s, y - 14 * s, x + 8 * s, y - 22 * s, x + 8 * s, y - 12 * s, x - 8 * s, y - 4 * s - 0.001];
    // panel leans like an iso wall; scanlines give it the holo-screen look
    g.poly([q[0], q[1], q[2], q[3], q[4], q[5], q[6], y - 4 * s]).fill({ color: 0x0a0f1c, alpha: 0.95 });
    g.poly([q[0], q[1], q[2], q[3], q[4], q[5], q[6], y - 4 * s]).stroke({ width: 1.3, color, alpha: 0.95 });
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      g.moveTo(x - 8 * s, y - 14 * s + 10 * s * t).lineTo(x + 8 * s, y - 22 * s + 10 * s * t)
        .stroke({ width: 1, color, alpha: 0.45 });
    }
  }
  function drawFountain(g, x, y, s) {
    g.ellipse(x, y, 16 * s, 8 * s).stroke({ width: 1.6, color: CYAN, alpha: 0.8 });
    g.ellipse(x, y, 9 * s, 4.5 * s).stroke({ width: 1.2, color: CYAN, alpha: 0.5 });
    for (const dx of [-3, 0, 3]) {
      g.moveTo(x, y - 1).lineTo(x + dx * s, y - 10 * s).stroke({ width: 1, color: 0x9feaff, alpha: 0.7 });
    }
    g.circle(x, y - 10 * s, 1.4).fill({ color: 0x9feaff, alpha: 0.9 });
  }
  function drawTorii(g, x, y, s) {
    const h = 17 * s, w = 9 * s;
    g.moveTo(x - w, y).lineTo(x - w, y - h).stroke({ width: 2.5, color: VERMILION, alpha: 0.95 });
    g.moveTo(x + w, y).lineTo(x + w, y - h).stroke({ width: 2.5, color: VERMILION, alpha: 0.95 });
    g.moveTo(x - w * 1.45, y - h).lineTo(x + w * 1.45, y - h - 2 * s).stroke({ width: 3, color: VERMILION, alpha: 0.95 });
    g.moveTo(x - w, y - h * 0.72).lineTo(x + w, y - h * 0.78).stroke({ width: 2, color: VERMILION, alpha: 0.9 });
    g.circle(x - w * 1.45, y - h, 1.5).fill({ color: GOLD, alpha: 0.95 });
    g.circle(x + w * 1.45, y - h - 2 * s, 1.5).fill({ color: GOLD, alpha: 0.95 });
  }

  function makePark(r, c) {
    const kk = key(r, c);
    if (treeG.has(kk)) return;
    const rand = seededRand(r + 100, c + 100);
    const g = new Graphics();
    const off = (fu, fv, dy) => {
      const u = (rand() - 0.5) * fu, v = (rand() - 0.5) * fv;
      return [(u + v) * (TILE_W / 2), (v - u) * (TILE_H / 2) + dy];
    };
    // deterministic decoration mix per pocket — not only trees
    const kind = rand();
    if (kind < 0.34) {                 // grove
      drawTree(g, 0, TILE_H * 0.1, 0.95 + rand() * 0.35, rand);
      const extras = 1 + Math.floor(rand() * 2);
      for (let i = 0; i < extras; i++) {
        const [ox, oy] = off(0.5, 0.5, TILE_H * 0.16);
        drawTree(g, ox, oy, 0.55 + rand() * 0.3, rand);
      }
    } else if (kind < 0.53) {          // lamp + tree
      drawLamp(g, -TILE_W * 0.14, TILE_H * 0.16, 1, rand() < 0.5 ? CYAN : MAGENTA);
      drawTree(g, TILE_W * 0.12, TILE_H * 0.08, 0.8 + rand() * 0.3, rand);
    } else if (kind < 0.72) {          // holo billboard + small tree
      drawBillboard(g, TILE_W * 0.08, TILE_H * 0.14, 1, rand() < 0.5 ? CYAN : MAGENTA);
      drawTree(g, -TILE_W * 0.18, TILE_H * 0.12, 0.6 + rand() * 0.25, rand);
    } else if (kind < 0.88) {          // fountain plaza
      drawFountain(g, 0, TILE_H * 0.08, 1);
      drawTree(g, -TILE_W * 0.22, TILE_H * 0.05, 0.55, rand);
      drawTree(g, TILE_W * 0.2, TILE_H * 0.14, 0.5, rand);
    } else {                           // torii shrine garden
      drawTorii(g, 0, TILE_H * 0.12, 1);
      drawTree(g, -TILE_W * 0.22, TILE_H * 0.06, 0.6, rand);
      drawLamp(g, TILE_W * 0.2, TILE_H * 0.1, 0.8, GOLD);
    }
    const { x, y } = cellPos(r, c);
    g.position.set(x, y);
    g.zIndex = r + c + 0.2;
    g.eventMode = "none"; // clicks fall through to the ground cell below
    g.scale.set(0.01);
    world.addChild(g);
    treeG.set(kk, g);
    const t0 = performance.now();
    const grow = () => {
      const t = Math.min(1, (performance.now() - t0) / 450);
      if (g.destroyed) { app.ticker.remove(grow); return; }
      const e = 1 - Math.pow(1 - t, 3);
      g.scale.set(0.3 + 0.7 * e);
      g.alpha = e;
      if (t >= 1) app.ticker.remove(grow);
    };
    app.ticker.add(grow);
  }
  function updateParks() {
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (state.get(key(r, c)) !== "ground") continue;
      let enclosed = 0;
      for (const [dr, dc] of Object.values(DIRS)) {
        if (!inGrid(r + dr, c + dc)) continue;
        const s = state.get(key(r + dr, c + dc));
        if (s === "road" || s === "building") enclosed++;
      }
      if (enclosed >= 3) makePark(r, c);
    }
  }
  function clearTrees(kk) {
    const t = treeG.get(kk);
    if (t) { t.destroy(); treeG.delete(kk); }
  }

  // ---- cars ----------------------------------------------------------------
  // Cars drive exactly on the drawn lanes: edge midpoint -> cell center -> next edge midpoint.
  // At each cell center they pick a random onward connection (no U-turn unless dead end), so
  // they follow the merged road network wherever it grows.
  const OPP = { N: "S", S: "N", E: "W", W: "E" };
  const CW = { N: "E", E: "S", S: "W", W: "N" };  // width axis for the iso car body
  const unit = ([x, y]) => { const l = Math.hypot(x, y); return [x / l, y / l]; };
  const SEG_LEN = Math.hypot(TILE_W / 4, TILE_H / 4);
  const CAR_SPEED = 55; // px/s
  const CAR_COLORS = [0x35d6ff, 0xff4fd8, 0xf3f6ff, 0x51ffc4];
  // Hover altitude slots: each car flies on its own level (plus a gentle bob), so two cars
  // meeting at a junction pass above/below each other instead of clipping.
  const ALT_SLOTS = [8, 13, 18, 23, 28];
  const cars = [];
  let carSpawnCount = 0;

  // Hover car: faceted 3D hull (top + two shaded skirt halves), glowing cabin canopy, light
  // bar front/rear, additive anti-grav underglow. Drawn hovering at (0,-alt); the ground
  // shadow lives in a separate Graphics pinned to the road surface.
  function drawCar(g, dirKey, color, alt) {
    g.clear();
    const u = unit(EDGE_MID[dirKey]), w = unit(EDGE_MID[CW[dirKey]]);
    const L = 21, W2 = 10, H = 8; // chunkier hull — the first pass read too flat
    const f = [u[0] * L / 2, u[1] * L / 2], b = [-f[0], -f[1]];
    const wv = [w[0] * W2 / 2, w[1] * W2 / 2];
    const y0 = -alt;
    const quad = (dy) => [b[0] - wv[0], b[1] - wv[1] + dy, b[0] + wv[0], b[1] + wv[1] + dy,
      f[0] + wv[0], f[1] + wv[1] + dy, f[0] - wv[0], f[1] - wv[1] + dy];
    // anti-grav underglow (between hull and ground)
    g.ellipse(0, y0 + 3, L * 0.42, L * 0.16).fill({ color, alpha: 0.22 });
    // hull: lower rim, then two shaded skirt halves (port darker, starboard lighter), then deck
    g.poly(quad(y0)).fill(0x07080f);
    g.poly([b[0] - wv[0], b[1] - wv[1] + y0, f[0] - wv[0], f[1] - wv[1] + y0,
      f[0] - wv[0], f[1] - wv[1] + y0 - H, b[0] - wv[0], b[1] - wv[1] + y0 - H]).fill(0x0b0e1a);
    g.poly([b[0] + wv[0], b[1] + wv[1] + y0, f[0] + wv[0], f[1] + wv[1] + y0,
      f[0] + wv[0], f[1] + wv[1] + y0 - H, b[0] + wv[0], b[1] + wv[1] + y0 - H]).fill(0x161c30);
    g.poly(quad(y0 - H)).fill(0x1a2138);                                  // deck
    g.poly(quad(y0 - H)).stroke({ width: 1.2, color, alpha: 0.95 });      // neon rim
    // cabin canopy: a raised glowing pod (roof plate + visible glass walls), not a flat sticker
    const CH = 5;
    const cf = [u[0] * L * 0.14, u[1] * L * 0.14], cb = [-u[0] * L * 0.34, -u[1] * L * 0.34];
    const cw = [w[0] * W2 * 0.34, w[1] * W2 * 0.34];
    const cq = (dy) => [cb[0] - cw[0], cb[1] - cw[1] + dy, cb[0] + cw[0], cb[1] + cw[1] + dy,
      cf[0] + cw[0], cf[1] + cw[1] + dy, cf[0] - cw[0], cf[1] - cw[1] + dy];
    g.poly([cb[0] - cw[0], cb[1] - cw[1] + y0 - H, cf[0] - cw[0], cf[1] - cw[1] + y0 - H,
      cf[0] - cw[0], cf[1] - cw[1] + y0 - H - CH, cb[0] - cw[0], cb[1] - cw[1] + y0 - H - CH])
      .fill({ color, alpha: 0.28 });
    g.poly([cb[0] + cw[0], cb[1] + cw[1] + y0 - H, cf[0] + cw[0], cf[1] + cw[1] + y0 - H,
      cf[0] + cw[0], cf[1] + cw[1] + y0 - H - CH, cb[0] + cw[0], cb[1] + cw[1] + y0 - H - CH])
      .fill({ color, alpha: 0.42 });
    g.poly(cq(y0 - H - CH)).fill({ color, alpha: 0.55 });
    g.poly(cq(y0 - H - CH)).stroke({ width: 1, color: 0xffffff, alpha: 0.5 });
    // light bars across the front and rear deck edges
    g.moveTo(f[0] - wv[0] * 0.7, f[1] - wv[1] * 0.7 + y0 - H).lineTo(f[0] + wv[0] * 0.7, f[1] + wv[1] * 0.7 + y0 - H)
      .stroke({ width: 2, color: 0xfff2b8, alpha: 0.95 });
    g.moveTo(b[0] - wv[0] * 0.7, b[1] - wv[1] * 0.7 + y0 - H).lineTo(b[0] + wv[0] * 0.7, b[1] + wv[1] * 0.7 + y0 - H)
      .stroke({ width: 2, color: 0xff4560, alpha: 0.9 });
  }

  function spawnCar() {
    const keys = [...roadG.keys()];
    if (!keys.length) return;
    const kk = keys[Math.floor(Math.random() * keys.length)];
    const [r, c] = kk.split(",").map(Number);
    const conn = connectionsOf(r, c);
    if (!conn.size) return;
    const to = [...conn][Math.floor(Math.random() * conn.size)];
    const alt = ALT_SLOTS[carSpawnCount++ % ALT_SLOTS.length];
    const car = {
      r, c, from: OPP[to], to, t: 0.5, seg: 2, alt,
      phase: Math.random() * Math.PI * 2,
      color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
      g: new Graphics(), shadow: new Graphics(),
    };
    car.shadow.ellipse(0, 0, 8, 3.5).fill({ color: 0x000000, alpha: 0.5 });
    car.shadow.ellipse(0, 0, 5, 2.2).fill({ color: car.color, alpha: 0.12 });
    drawCar(car.g, car.to, car.color, car.alt);
    world.addChild(car.shadow);
    world.addChild(car.g);
    cars.push(car);
  }

  function manageCarPopulation() {
    // deliberately sparse traffic — a handful of craft, not a swarm
    const target = Math.min(4, Math.max(1, Math.floor(roadG.size / 14)));
    while (cars.length < target) spawnCar();
    managePedPopulation();
  }

  // ---- pedestrians ---------------------------------------------------------
  // Tiny glowing figures strolling the sidewalks: they follow the same road graph as the
  // cars but laterally offset toward the curb (right-hand side of their walking direction),
  // much slower, with a little walk bob. Grounded — no altitude, just a soft shadow.
  const PED_COLORS = [0xf3f6ff, 0x35d6ff, 0xff4fd8, 0xffc94a];
  const PED_OFFSET = 21; // px from lane center toward the curb
  const peds = [];
  function drawPed(g, color) {
    g.clear();
    g.ellipse(0, 0.8, 2.6, 1.2).fill({ color: 0x000000, alpha: 0.4 });
    g.moveTo(0, 0).lineTo(0, -4.6).stroke({ width: 1.5, color, alpha: 0.95 });
    g.circle(0, -6.2, 1.6).fill({ color, alpha: 1 });
  }
  function spawnPed() {
    const keys = [...roadG.keys()];
    if (!keys.length) return;
    const kk = keys[Math.floor(Math.random() * keys.length)];
    const [r, c] = kk.split(",").map(Number);
    const conn = connectionsOf(r, c);
    if (!conn.size) return;
    const to = [...conn][Math.floor(Math.random() * conn.size)];
    const ped = {
      r, c, from: OPP[to], to, t: 0.5,
      speed: 11 + Math.random() * 7,
      phase: Math.random() * Math.PI * 2,
      color: PED_COLORS[Math.floor(Math.random() * PED_COLORS.length)],
      g: new Graphics(),
    };
    drawPed(ped.g, ped.color);
    world.addChild(ped.g);
    peds.push(ped);
  }
  function managePedPopulation() {
    const target = Math.min(10, Math.floor(roadG.size / 4));
    while (peds.length < target) spawnPed();
  }

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    const now = performance.now() / 1000;
    for (const ped of peds) {
      ped.t += (ped.speed * dt) / (2 * SEG_LEN);
      if (ped.t >= 1) {
        const [dr, dc] = DIRS[ped.to];
        ped.r += dr; ped.c += dc;
        ped.from = OPP[ped.to];
        const conn = connectionsOf(ped.r, ped.c);
        const options = [...conn].filter((d) => d !== ped.from);
        ped.to = options.length ? options[Math.floor(Math.random() * options.length)] : ped.from;
        ped.t -= 1;
      }
      const heading = ped.t < 0.5 ? OPP[ped.from] : ped.to;
      const local = ped.t < 0.5
        ? (() => { const s = ped.t * 2, [mx, my] = EDGE_MID[ped.from]; return [mx * (1 - s), my * (1 - s)]; })()
        : (() => { const s = (ped.t - 0.5) * 2, [mx, my] = EDGE_MID[ped.to]; return [mx * s, my * s]; })();
      const side = unit(EDGE_MID[CW[heading]]);
      const { x, y } = cellPos(ped.r, ped.c);
      const px = x + local[0] + side[0] * PED_OFFSET;
      const py = y + local[1] + side[1] * PED_OFFSET;
      const bob = Math.sin(now * 9 + ped.phase) * 0.5;
      ped.g.position.set(px, py + bob);
      ped.g.zIndex = (2 * py) / TILE_H + 0.36;
    }
  });

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    const now = performance.now() / 1000;
    for (const car of cars) {
      car.t += (CAR_SPEED * dt) / (2 * SEG_LEN);
      if (car.t >= 1) {  // reached the exit edge midpoint -> hand over to the next cell
        const [dr, dc] = DIRS[car.to];
        car.r += dr; car.c += dc;
        car.from = OPP[car.to];
        const conn = connectionsOf(car.r, car.c);
        const options = [...conn].filter((d) => d !== car.from);
        car.to = options.length ? options[Math.floor(Math.random() * options.length)] : car.from;
        car.t -= 1;
        car.seg = 0;
        drawCar(car.g, OPP[car.from], car.color, car.alt); // heading toward the center
      }
      // segment 1: entry midpoint -> center; segment 2: center -> exit midpoint
      const local = car.t < 0.5
        ? (() => { const s = car.t * 2, [mx, my] = EDGE_MID[car.from]; return [mx * (1 - s), my * (1 - s)]; })()
        : (() => { const s = (car.t - 0.5) * 2, [mx, my] = EDGE_MID[car.to]; return [mx * s, my * s]; })();
      if (car.t >= 0.5 && car.seg !== 2) { car.seg = 2; drawCar(car.g, car.to, car.color, car.alt); } // turn at center
      const { x, y } = cellPos(car.r, car.c);
      const gx = x + local[0], gy = y + local[1];
      const bob = Math.sin(now * 2.2 + car.phase) * 1.6;
      car.g.position.set(gx, gy + bob);           // hull hovers at -alt inside the Graphics
      car.shadow.position.set(gx, gy);
      const z = (2 * gy) / TILE_H;                // painter order from ground position
      car.shadow.zIndex = z + 0.32;
      car.g.zIndex = z + 0.4;
    }
  });

  // ---- buildings -----------------------------------------------------------
  // An iso box: footprint is the cell diamond scaled by (fw), extruded by `h` pixels.
  // Visible faces: top diamond, left (SW) face, right (SE) face. Neon edges on the silhouette.
  function drawBox(g, cx, cyBase, fw, h, pal, rand, windows) {
    const a = (TILE_W / 2) * fw, b = (TILE_H / 2) * fw;
    const L = [cx - a, cyBase], R = [cx + a, cyBase], B = [cx, cyBase + b];
    const Lt = [L[0], L[1] - h], Rt = [R[0], R[1] - h], Bt = [B[0], B[1] - h], Tt = [cx, cyBase - b - h];
    // pal.glow marks the bloom pass: same silhouette on an additive layer, no solid faces,
    // fat and faint — that halo is what makes the tubes read as light instead of line art.
    const gl = pal.glow;
    if (!gl) {
      g.poly([...Lt, ...Bt, ...B, ...L]).fill(pal.left);
      g.poly([...Bt, ...Rt, ...R, ...B]).fill(pal.right);
      g.poly([...Tt, ...Rt, ...Bt, ...Lt]).fill(pal.top);
    }
    const sw = gl ? gl.w : 1.6, sa = gl ? gl.a : 1;
    g.poly([...Lt, ...Bt, ...Rt]).stroke({ width: sw, color: pal.edge, alpha: 0.95 * sa });
    g.moveTo(...Lt).lineTo(...Tt).lineTo(...Rt).stroke({ width: sw, color: pal.edge, alpha: 0.95 * sa });
    g.moveTo(...Bt).lineTo(...B).stroke({ width: sw, color: pal.edge, alpha: 0.8 * sa });
    g.moveTo(...Lt).lineTo(...L).stroke({ width: sw, color: pal.edge, alpha: 0.6 * sa });
    g.moveTo(...Rt).lineTo(...R).stroke({ width: sw, color: pal.edge, alpha: 0.6 * sa });
    if (!windows || h < 18) return;
    // window grid on both front faces; u runs along the face edge, v runs up
    for (const side of ["L", "R"]) {
      const from = side === "L" ? L : B, to = side === "L" ? B : R;
      const ux = (to[0] - from[0]), uy = (to[1] - from[1]);
      const cols = Math.max(2, Math.round(fw * 4)), rows = Math.max(2, Math.floor(h / 14));
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        // fixed number of draws from the stream, so every pass sees the same window pattern
        const dark = rand() < 0.22, blink = rand() < 0.26;
        const col = rand() < 0.5 ? pal.winA : pal.winB;
        const ph = rand() * 6.283, rate = 1.3 + rand() * 5;
        if (dark) continue;
        const u0 = 0.14 + (i / cols) * 0.74, u1 = u0 + 0.45 / cols;
        const v = 8 + (j / rows) * (h - 16);
        const x0 = from[0] + ux * u0, y0 = from[1] + uy * u0 - v;
        const x1 = from[0] + ux * u1, y1 = from[1] + uy * u1 - v;
        const wh = Math.min(6, h / rows * 0.45);
        const quad = [x0, y0, x1, y1, x1, y1 - wh, x0, y0 - wh];
        if (gl) { g.poly(quad).fill({ color: col, alpha: 3.2 * sa }); continue; }
        // blinkers idle dim here; the blink layer switches them bright on its own clock
        g.poly(quad).fill({ color: col, alpha: blink ? 0.32 : 0.9 });
        if (blink && pal.sink) pal.sink.push({ q: quad, color: col, ph, rate });
      }
    }
  }

  // Flared pagoda roof slab: a thin box overhanging its tier, with glow dots on the three
  // visible eave corners to suggest the upturned edges of Japanese roofs.
  function drawRoof(g, cx, cyBase, fw, pal) {
    drawBox(g, cx, cyBase, fw, 3.5, pal, () => 1, false);
    const a = (TILE_W / 2) * fw, b = (TILE_H / 2) * fw;
    const gl = pal.glow;
    for (const [px, py] of [[cx - a, cyBase - 3.5], [cx + a, cyBase - 3.5], [cx, cyBase + b - 3.5]]) {
      g.circle(px, py, gl ? 5.5 : 1.6).fill({ color: pal.edge, alpha: gl ? 5 * gl.a : 0.95 });
    }
  }

  // Building types: stacked boxes with per-type footprints/heights. All deterministic per cell.
  // Weighted mix: real high-rises and Japanese pagodas appear often, the low fillers less so.
  const VERMILION = 0xff6a4d, GOLD = 0xffc94a;
  // Fake radial falloff: nested additive ellipses accumulate toward the centre, so a light pool
  // fades out instead of ending in the hard rim a single filled ellipse leaves behind.
  function softPool(g, x, y, rx, ry, color, a) {
    for (let i = 4; i >= 1; i--) g.ellipse(x, y, rx * i / 4, ry * i / 4).fill({ color, alpha: a });
  }
  // fx (optional): { glow } draws the additive bloom pass instead of the solid building,
  // { sink } collects blinking windows, { meta } reports type/accent/rooftop apex to the caller.
  function drawBuilding(g, r, c, progress, flash, fx = {}) {
    g.clear();
    const rand = seededRand(r, c);
    const tr = rand();
    let type;
    if (tr < 0.13) type = 0;        // setback tower
    else if (tr < 0.26) type = 1;   // low slab
    else if (tr < 0.39) type = 2;   // ziggurat
    else if (tr < 0.51) type = 3;   // twin blocks
    else if (tr < 0.68) type = 4;   // super skyscraper
    else if (tr < 0.82) type = 5;   // Japanese pagoda
    else if (tr < 0.92) type = 6;   // neon park lot
    else type = 7;                  // arena
    const totalH = type === 4 ? 150 + rand() * 90 : type === 5 ? 95 + rand() * 40
      : type === 6 ? 30 : type === 7 ? 55 + rand() * 25 : 60 + rand() * 80;
    const accent = NEON[Math.floor(rand() * NEON.length)];
    const accent2 = NEON[Math.floor(rand() * NEON.length)];
    const jp = type === 5;
    const gl = fx.glow;
    const pal = flash
      ? { top: 0xffffff, left: 0xdff6ff, right: 0xeafaff, edge: 0xffffff, winA: 0xffffff, winB: 0xffffff }
      : jp
        ? { top: 0x2a1a20, left: 0x170f14, right: 0x231620, edge: VERMILION, winA: GOLD, winB: MAGENTA }
        : { top: 0x1a2030, left: 0x0c101c, right: 0x121828, edge: accent, winA: accent, winB: accent2 };
    pal.glow = gl;
    pal.sink = fx.sink;
    if (fx.meta) Object.assign(fx.meta, { type, accent, accent2, totalH });
    const cx = 0, cyB = 0;
    if (gl) {
      // colour pool on the lot — it spills onto the surrounding streets and lifts the whole block
      softPool(g, 0, 0, TILE_W * 0.62, TILE_H * 0.62, accent, 0.16 * gl.a);
      softPool(g, 0, 0, TILE_W * 0.3, TILE_H * 0.3, jp ? VERMILION : accent2, 0.14 * gl.a);
    } else {
      // lot plinth (full progress from the start — the "foundation")
      diamondPath(g, TILE_W * 0.96, TILE_H * 0.96).fill(0x0d1120);
      diamondPath(g, TILE_W * 0.96, TILE_H * 0.96).stroke({ width: 1.5, color: pal.edge, alpha: 0.6 });
    }

    const H = totalH * progress;
    if (H < 2) return;
    if (type === 0) {            // tower: three setback stacks + antenna
      drawBox(g, cx, cyB, 0.66, H * 0.5, pal, rand, true);
      drawBox(g, cx, cyB - H * 0.5, 0.5, H * 0.33, pal, rand, true);
      drawBox(g, cx, cyB - H * 0.83, 0.36, H * 0.17, pal, rand, false);
      if (progress > 0.97) {
        const topY = cyB - H - (TILE_H / 2) * 0.36;
        g.moveTo(cx, topY).lineTo(cx, topY - 16).stroke({ width: 1.5, color: pal.edge, alpha: 0.9 });
        if (fx.meta) fx.meta.apex = [cx, topY - 16];
      }
    } else if (type === 1) {     // low slab with roof gear
      drawBox(g, cx, cyB, 0.8, H * 0.45, pal, rand, true);
      drawBox(g, cx - TILE_W * 0.12, cyB - H * 0.45, 0.2, H * 0.12, pal, rand, false);
      drawBox(g, cx + TILE_W * 0.1, cyB - H * 0.45, 0.16, H * 0.18, pal, rand, false);
    } else if (type === 2) {     // ziggurat
      drawBox(g, cx, cyB, 0.8, H * 0.34, pal, rand, true);
      drawBox(g, cx, cyB - H * 0.34, 0.6, H * 0.33, pal, rand, true);
      drawBox(g, cx, cyB - H * 0.67, 0.4, H * 0.33, pal, rand, false);
      if (fx.meta) fx.meta.apex = [cx, cyB - H - (TILE_H / 2) * 0.4];
    } else if (type === 3) {     // twin blocks
      drawBox(g, cx - TILE_W * 0.17, cyB, 0.34, H * 0.8, pal, rand, true);
      drawBox(g, cx + TILE_W * 0.17, cyB, 0.34, H, pal, rand, true);
      if (fx.meta) fx.meta.apex = [cx + TILE_W * 0.17, cyB - H - (TILE_H / 2) * 0.34];
    } else if (type === 4) {     // super skyscraper: five setbacks, spire, beacon
      drawBox(g, cx, cyB, 0.62, H * 0.3, pal, rand, true);
      drawBox(g, cx, cyB - H * 0.3, 0.52, H * 0.25, pal, rand, true);
      drawBox(g, cx, cyB - H * 0.55, 0.43, H * 0.2, pal, rand, true);
      drawBox(g, cx, cyB - H * 0.75, 0.34, H * 0.15, pal, rand, false);
      drawBox(g, cx, cyB - H * 0.9, 0.24, H * 0.1, pal, rand, false);
      if (progress > 0.97) {
        const topY = cyB - H - (TILE_H / 2) * 0.24;
        g.moveTo(cx, topY).lineTo(cx, topY - 26).stroke({ width: 1.5, color: pal.edge, alpha: 0.95 });
        g.circle(cx, topY - 26, 2).fill({ color: MAGENTA, alpha: 1 });
        g.circle(cx, topY - 26, 5).fill({ color: MAGENTA, alpha: 0.22 });
        if (fx.meta) fx.meta.apex = [cx, topY - 26];
      }
    } else if (type === 5) {     // Japanese pagoda: tiers with flared, glowing roof slabs
      const tiers = 3;
      let base = cyB, fw = 0.72;
      for (let i = 0; i < tiers; i++) {
        const th = H * (0.3 - i * 0.045);
        drawBox(g, cx, base, fw * 0.82, th, pal, rand, i < 2);
        drawRoof(g, cx, base - th, fw, pal);
        base -= th + 3.5;
        fw -= 0.16;
      }
      if (progress > 0.97) { // finial spire
        g.moveTo(cx, base - 2).lineTo(cx, base - 14).stroke({ width: 1.5, color: GOLD, alpha: 0.95 });
        g.circle(cx, base - 14, 1.8).fill({ color: GOLD, alpha: 1 });
        if (fx.meta) fx.meta.apex = [cx, base - 14];
      }
    } else if (type === 6) {     // neon park lot: lawn plate, fountain, grove, lamp
      if (flash) { diamondPath(g, TILE_W * 0.9, TILE_H * 0.9).fill({ color: 0xffffff, alpha: 0.85 }); return; }
      if (gl) {
        diamondPath(g, TILE_W * 0.9, TILE_H * 0.9).stroke({ width: gl.w, color: MINT, alpha: 3 * gl.a });
        softPool(g, 0, 0, TILE_W * 0.34, TILE_H * 0.34, MINT, 0.16 * gl.a);
        return;
      }
      diamondPath(g, TILE_W * 0.9, TILE_H * 0.9).fill(0x0b1a16);
      diamondPath(g, TILE_W * 0.9, TILE_H * 0.9).stroke({ width: 1.5, color: MINT, alpha: 0.7 });
      const s = 0.25 + 0.75 * progress; // the garden grows in with the build animation
      drawFountain(g, TILE_W * 0.1, TILE_H * 0.12, 0.8 * s);
      drawTree(g, -TILE_W * 0.2, TILE_H * 0.02, (0.9 + rand() * 0.3) * s, rand);
      drawTree(g, -TILE_W * 0.02, -TILE_H * 0.16, (0.6 + rand() * 0.25) * s, rand);
      drawTree(g, TILE_W * 0.26, -TILE_H * 0.05, (0.55 + rand() * 0.25) * s, rand);
      drawLamp(g, -TILE_W * 0.3, TILE_H * 0.18, 0.8 * s, CYAN);
    } else {                     // arena: elliptical bowl, glowing pitch, floodlights
      if (flash) { diamondPath(g, TILE_W * 0.95, TILE_H * 0.95).fill({ color: 0xffffff, alpha: 0.85 }); return; }
      const rx = TILE_W * 0.44, ry = rx * 0.5, h = H * 0.55 + 6;
      const ep = (rxx, ryy, y0, a0, a1, n = 26) => {
        const pts = [];
        for (let i = 0; i <= n; i++) { const t = a0 + (a1 - a0) * i / n; pts.push(rxx * Math.cos(t), y0 + ryy * Math.sin(t)); }
        return pts;
      };
      const wall = [...ep(rx, ry, 0, 0, Math.PI), ...ep(rx, ry, -h, Math.PI, 0)]; // visible outer wall band
      if (gl) { // rim tube + the pitch lighting the bowl from inside
        g.ellipse(0, -h, rx, ry).stroke({ width: gl.w, color: accent, alpha: 4 * gl.a });
        softPool(g, 0, -h + 3, rx * 0.6, ry * 0.6, MINT, 0.2 * gl.a);
        return;
      }
      g.poly(wall).fill(0x10142a);
      g.poly(wall).stroke({ width: 1, color: accent, alpha: 0.35 });
      g.ellipse(0, -h, rx, ry).fill(0x1a2138);
      g.ellipse(0, -h, rx, ry).stroke({ width: 1.6, color: accent, alpha: 0.95 });
      g.ellipse(0, -h + 2, rx * 0.78, ry * 0.78).fill(0x0a0e18);           // seating bowl
      g.ellipse(0, -h + 3, rx * 0.52, ry * 0.52).fill(0x0d2a22);           // pitch
      g.ellipse(0, -h + 3, rx * 0.52, ry * 0.52).stroke({ width: 1.2, color: MINT, alpha: 0.85 });
      g.moveTo(0, -h + 3 - ry * 0.52).lineTo(0, -h + 3 + ry * 0.52).stroke({ width: 1, color: MINT, alpha: 0.4 });
      g.circle(0, -h + 3, 1.6).fill({ color: MINT, alpha: 0.9 });
      if (progress > 0.9) { // floodlight masts on the rim
        const masts = [];
        for (const th of [0.3 * Math.PI, 0.7 * Math.PI, -0.3 * Math.PI, -0.7 * Math.PI]) {
          const mx = rx * Math.cos(th) * 0.92, my = -h + ry * Math.sin(th) * 0.92;
          g.moveTo(mx, my).lineTo(mx, my - 13).stroke({ width: 1.3, color: 0x3a4260, alpha: 0.95 });
          g.circle(mx, my - 14, 1.8).fill({ color: 0xfff2b8, alpha: 0.95 });
          g.circle(mx, my - 14, 4).fill({ color: 0xfff2b8, alpha: 0.2 });
          masts.push([mx, my - 14]);
        }
        if (fx.meta) fx.meta.masts = masts;
      }
    }
  }

  function neonRings(x, y, z) {
    const ring = new Graphics();
    ring.blendMode = "add";
    ring.zIndex = z + 0.03;
    world.addChild(ring);
    const t0 = performance.now(), RING_MS = 1200;
    const iso = TILE_H / TILE_W;
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / RING_MS);
      ring.clear();
      for (const rg of [
        { from: 0.2, to: 1.6, w0: 6, color: CYAN, a0: 0.9 },
        { from: 0.15, to: 1.1, w0: 4, color: MAGENTA, a0: 0.8 },
      ]) {
        const rad = TILE_W * (rg.from + t * (rg.to - rg.from));
        ring.ellipse(x, y, rad, rad * iso).stroke({ width: rg.w0 * (1 - t) + 1, color: rg.color, alpha: (1 - t) * rg.a0 });
      }
      if (t >= 1) { app.ticker.remove(tick); ring.destroy(); }
    };
    app.ticker.add(tick);
  }

  // ---- neon effect layers --------------------------------------------------
  // A finished building carries three additive layers over its solid body: a breathing bloom,
  // a blink layer that switches a subset of its windows, and rooftop searchlights. One shared
  // ticker drives all of them; the beams are drawn once and only rotated/faded afterwards.
  const GLOW = { w: 7, a: 0.17 };
  const fxList = [];

  function makeShaft(color, len, wide) {
    const g = new Graphics();
    g.blendMode = "add";
    for (let i = 0; i < 4; i++) {  // stacked quads fade the light shaft out toward the sky
      const y0 = -len * (i / 4), y1 = -len * ((i + 1) / 4);
      const w0 = wide * (0.55 + i * 0.3), w1 = wide * (0.55 + (i + 1) * 0.3);
      g.poly([-w0, y0, w0, y0, w1, y1, -w1, y1]).fill({ color, alpha: 0.24 * (1 - i / 4.6) });
    }
    g.circle(0, 0, 2.4).fill({ color: 0xffffff, alpha: 0.9 });
    g.circle(0, 0, 7).fill({ color, alpha: 0.45 });
    g.circle(0, 0, 13).fill({ color, alpha: 0.16 });
    return g;
  }

  function makeCone(color, len) {
    const g = new Graphics();
    g.blendMode = "add";
    g.poly([0, 0, -len * 0.14, -len, len * 0.14, -len]).fill({ color, alpha: 0.13 });
    g.poly([0, 0, -len * 0.05, -len * 0.9, len * 0.05, -len * 0.9]).fill({ color, alpha: 0.2 });
    return g;
  }

  function registerFx(r, c, x, y, z, glowG, sink, meta) {
    const rand = seededRand(r + 7, c + 13);
    const blinkG = new Graphics();
    blinkG.blendMode = "add";
    blinkG.position.set(x, y);
    blinkG.zIndex = z + 0.03;
    world.addChild(blinkG);

    const beamG = new Container();
    beamG.position.set(x, y);
    beamG.zIndex = z + 0.04;
    world.addChild(beamG);

    let sweep = null;
    const apex = meta.apex || null;
    if (apex && meta.totalH >= 115) {   // searchlights only on genuinely tall towers
      const shaft = makeShaft(meta.type === 5 ? GOLD : meta.accent, 120 + rand() * 90, 5);
      shaft.position.set(apex[0], apex[1]);
      beamG.addChild(shaft);
      if (meta.type === 4 || rand() < 0.45) {
        sweep = makeCone(meta.accent2, 110 + rand() * 70);
        sweep.position.set(apex[0], apex[1]);
        beamG.addChild(sweep);
      }
    }
    for (const [mx, my] of meta.masts || []) {   // stadium floodlight cones
      const cone = makeCone(0xfff2b8, 46);
      cone.position.set(mx, my);
      cone.rotation = (mx > 0 ? 1 : -1) * 0.5;
      beamG.addChild(cone);
    }

    fxList.push({
      glowG, blinkG, beamG, sweep, sink, apex,
      beacon: meta.type === 0 || meta.type === 4,
      phase: rand() * 6.283,
      pulse: 0.8 + rand() * 1.5,
      sweepRate: 0.25 + rand() * 0.3,
    });
  }

  let blinkAcc = 0;
  app.ticker.add((ticker) => {
    const now = performance.now() / 1000;
    blinkAcc += ticker.deltaMS;
    const step = blinkAcc >= 110;   // the blink layer runs on its own ~9 Hz clock
    if (step) blinkAcc = 0;
    for (const fx of fxList) {
      fx.glowG.alpha = 0.7 + 0.3 * Math.sin(now * fx.pulse + fx.phase);
      fx.beamG.alpha = 0.72 + 0.28 * Math.sin(now * 1.6 + fx.phase);
      if (fx.sweep) fx.sweep.rotation = Math.sin(now * fx.sweepRate + fx.phase) * 0.9;
      if (!step) continue;
      const b = fx.blinkG;
      b.clear();
      for (const w of fx.sink) {
        if (Math.sin(now * w.rate + w.ph) < 0.15) continue;
        b.poly(w.q).fill({ color: w.color, alpha: 0.9 });
      }
      if (fx.beacon && fx.apex && Math.sin(now * 2.4 + fx.phase) > 0) {
        b.circle(fx.apex[0], fx.apex[1], 2.6).fill({ color: 0xff3b5c, alpha: 0.95 });
        b.circle(fx.apex[0], fx.apex[1], 8).fill({ color: 0xff3b5c, alpha: 0.25 });
      }
    }
  });

  // Size of the 4-connected building block that would exist if (r,c) were built on.
  function blockSizeWith(r, c) {
    const seen = new Set([key(r, c)]);
    const queue = [[r, c]];
    while (queue.length) {
      const [qr, qc] = queue.pop();
      for (const [dr, dc] of Object.values(DIRS)) {
        const nr = qr + dr, nc = qc + dc, nk = key(nr, nc);
        if (inGrid(nr, nc) && !seen.has(nk) && state.get(nk) === "building") {
          seen.add(nk);
          queue.push([nr, nc]);
        }
      }
    }
    return seen.size;
  }

  function placeBuilding(r, c) {
    const kk = key(r, c);
    const st = state.get(kk);
    if (st === "building") return;
    // Blocks: buildings may stand directly adjacent, but a connected block is capped at 4 —
    // the street ring then wraps the whole block instead of the single lot.
    if (blockSizeWith(r, c) > 4) { rejectFlash(r, c); return; }

    state.set(kk, "building");
    const oldGround = groundG.get(kk);
    if (oldGround) { oldGround.destroy(); groundG.delete(kk); }
    const oldRoad = roadG.get(kk);
    if (oldRoad) { oldRoad.destroy(); roadG.delete(kk); }
    clearTrees(kk);

    // Streets are DERIVED: every non-building cell touching a building (8-neighborhood)
    // becomes road. Growing a block absorbs its inner road cells and the ring re-wraps.
    for (let rr = 0; rr < GRID; rr++) for (let cc = 0; cc < GRID; cc++) {
      if (state.get(key(rr, cc)) !== "ground") continue;
      let touches = false;
      for (let dr = -1; dr <= 1 && !touches; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        if (inGrid(rr + dr, cc + dc) && state.get(key(rr + dr, cc + dc)) === "building") { touches = true; break; }
      }
      if (touches) makeRoad(rr, cc);
    }
    // Cars/pedestrians whose cell just got built over are respawned elsewhere.
    for (const list of [cars, peds]) {
      for (let i = list.length - 1; i >= 0; i--) {
        const a = list[i];
        if (state.get(key(a.r, a.c)) !== "road") {
          a.g.destroy();
          if (a.shadow) a.shadow.destroy();
          list.splice(i, 1);
        }
      }
    }
    recomputeRoads();

    const { x, y } = cellPos(r, c);
    const g = new Graphics();
    g.position.set(x, y);
    g.zIndex = r + c + 0.5;
    world.addChild(g);
    const glowG = new Graphics();   // additive bloom pass, painted over its own building
    glowG.blendMode = "add";
    glowG.position.set(x, y);
    glowG.zIndex = g.zIndex + 0.02;
    world.addChild(glowG);

    const t0 = performance.now();
    const grow = () => {
      const t = Math.min(1, (performance.now() - t0) / BUILD_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      drawBuilding(g, r, c, eased, false);
      drawBuilding(glowG, r, c, eased, false, { glow: GLOW });
      if (t >= 1) {
        app.ticker.remove(grow);
        const sink = [], meta = {};
        drawBuilding(g, r, c, 1, false, { sink, meta }); // final pass collects blinkers + apex
        registerFx(r, c, x, y, g.zIndex, glowG, sink, meta);
        // completion flash: white additive copy fading out over the finished building
        const f = new Graphics();
        f.position.set(x, y);
        f.zIndex = g.zIndex + 0.01;
        f.blendMode = "add";
        drawBuilding(f, r, c, 1, true);
        world.addChild(f);
        const f0 = performance.now(), FLASH_MS = 700;
        const fade = () => {
          const ft = Math.min(1, (performance.now() - f0) / FLASH_MS);
          f.alpha = 0.9 * (1 - ft);
          if (ft >= 1) { app.ticker.remove(fade); f.destroy(); }
        };
        app.ticker.add(fade);
        neonRings(x, y, g.zIndex);
      }
    };
    app.ticker.add(grow);
  }
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
