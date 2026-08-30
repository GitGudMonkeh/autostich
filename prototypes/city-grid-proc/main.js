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
    diamondPath(g, TILE_W - 2, TILE_H - 1).stroke({ width: 1, color: hover ? CYAN : 0x1c2740, alpha: hover ? 0.9 : 0.8 });
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

  function drawRoad(g, conn) {
    g.clear();
    diamondPath(g, TILE_W, TILE_H).fill(0x11121c); // asphalt
    // curbs on unconnected edges (inset slightly so neighboring curbs don't double up)
    for (const d of Object.keys(EDGE_CORNERS)) {
      if (conn.has(d)) continue;
      const [[x1, y1], [x2, y2]] = EDGE_CORNERS[d];
      g.moveTo(x1 * 0.88, y1 * 0.88).lineTo(x2 * 0.88, y2 * 0.88)
        .stroke({ width: 2.5, color: CURB, alpha: 0.85 });
    }
    // dashed centerlines from center to each connected edge midpoint
    for (const d of conn) {
      const [mx, my] = EDGE_MID[d];
      const SEGS = 4;
      for (let i = 0; i < SEGS; i++) {
        const t0 = 0.18 + (i / SEGS) * 0.78, t1 = t0 + 0.42 / SEGS;
        g.moveTo(mx * t0 * 2 * 0.5, my * t0 * 2 * 0.5); // center(0,0) -> midpoint at t=1
        g.lineTo(mx * t1, my * t1);
      }
      g.stroke({ width: 2, color: MAGENTA, alpha: 0.9 });
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
      drawRoad(g, connectionsOf(r, c));
    }
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
    world.addChild(g);
    roadG.set(kk, g);
  }

  // ---- trees ---------------------------------------------------------------
  // Sparse neon "holo-pines" on free ground cells: stacked diamond canopies over a thin trunk,
  // mint accent so vegetation reads distinct from the cyan/magenta architecture. Deterministic
  // per cell; removed as soon as the cell becomes road or building.
  const MINT = 0x51ffc4;
  const treeG = new Map(); // key -> Graphics
  function drawTree(g, tx, ty, s, rand) {
    const trunkH = 6 * s, tiers = 2 + Math.floor(rand() * 2);
    g.moveTo(tx, ty).lineTo(tx, ty - trunkH).stroke({ width: 1.5, color: 0x2a6f5a, alpha: 0.9 });
    for (let i = 0; i < tiers; i++) {
      const w = (16 - i * 4.5) * s, h = w / 2, cy = ty - trunkH - i * 7 * s;
      g.poly([tx, cy - h / 2, tx + w / 2, cy, tx, cy + h / 2, tx - w / 2, cy]).fill({ color: 0x0c1a16, alpha: 0.9 });
      g.poly([tx, cy - h / 2, tx + w / 2, cy, tx, cy + h / 2, tx - w / 2, cy])
        .stroke({ width: 1.2, color: MINT, alpha: 0.85 - i * 0.15 });
    }
    g.circle(tx, ty - trunkH - tiers * 7 * s - 1, 1.2).fill({ color: MINT, alpha: 0.9 });
  }
  function scatterTrees() {
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      const rand = seededRand(r + 100, c + 100); // separate stream from the building look
      if (rand() > 0.2) continue;
      const g = new Graphics();
      const { x, y } = cellPos(r, c);
      const n = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        // keep trees inside the inner half of the diamond so they never poke into neighbors
        const u = (rand() - 0.5) * 0.55, v = (rand() - 0.5) * 0.55;
        drawTree(g, (u + v) * (TILE_W / 2), (v - u) * (TILE_H / 2) + TILE_H * 0.12, 0.8 + rand() * 0.5, rand);
      }
      g.position.set(x, y);
      g.zIndex = r + c + 0.2;
      g.eventMode = "none"; // clicks fall through to the ground cell below
      world.addChild(g);
      treeG.set(key(r, c), g);
    }
  }
  function clearTrees(kk) {
    const t = treeG.get(kk);
    if (t) { t.destroy(); treeG.delete(kk); }
  }
  scatterTrees();

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
  const cars = [];

  function drawCar(g, dirKey, color) {
    g.clear();
    const u = unit(EDGE_MID[dirKey]), w = unit(EDGE_MID[CW[dirKey]]);
    const L = 15, W2 = 7, H = 5;
    const f = [u[0] * L / 2, u[1] * L / 2], b = [-f[0], -f[1]];
    const wv = [w[0] * W2 / 2, w[1] * W2 / 2];
    const quad = (dy) => [b[0] - wv[0], b[1] - wv[1] + dy, b[0] + wv[0], b[1] + wv[1] + dy,
      f[0] + wv[0], f[1] + wv[1] + dy, f[0] - wv[0], f[1] - wv[1] + dy];
    g.poly(quad(0)).fill(0x05060c);                                     // body base
    g.poly(quad(-H)).fill(0x141827);                                    // roof
    g.poly(quad(-H)).stroke({ width: 1.2, color, alpha: 0.95 });        // neon trim
    g.circle(f[0], f[1] - H / 2, 1.7).fill({ color: 0xfff2b8, alpha: 0.95 }); // headlight
    g.circle(b[0], b[1] - H / 2, 1.3).fill({ color: 0xff4560, alpha: 0.9 });  // taillight
  }

  function spawnCar() {
    const keys = [...roadG.keys()];
    if (!keys.length) return;
    const kk = keys[Math.floor(Math.random() * keys.length)];
    const [r, c] = kk.split(",").map(Number);
    const conn = connectionsOf(r, c);
    if (!conn.size) return;
    const to = [...conn][Math.floor(Math.random() * conn.size)];
    const car = { r, c, from: OPP[to], to, t: 0.5, color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], g: new Graphics(), seg: 2 };
    drawCar(car.g, car.to, car.color);
    world.addChild(car.g);
    cars.push(car);
  }

  function manageCarPopulation() {
    const target = Math.min(8, Math.max(1, Math.floor(roadG.size / 6)));
    while (cars.length < target) spawnCar();
  }

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
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
        drawCar(car.g, OPP[car.from], car.color); // heading toward the center
      }
      // segment 1: entry midpoint -> center; segment 2: center -> exit midpoint
      const local = car.t < 0.5
        ? (() => { const s = car.t * 2, [mx, my] = EDGE_MID[car.from]; return [mx * (1 - s), my * (1 - s)]; })()
        : (() => { const s = (car.t - 0.5) * 2, [mx, my] = EDGE_MID[car.to]; return [mx * s, my * s]; })();
      if (car.t >= 0.5 && car.seg !== 2) { car.seg = 2; drawCar(car.g, car.to, car.color); } // turn at center
      const { x, y } = cellPos(car.r, car.c);
      car.g.position.set(x + local[0], y + local[1]);
      car.g.zIndex = (2 * (y + local[1])) / TILE_H + 0.4; // painter order from screen depth
    }
  });

  // ---- buildings -----------------------------------------------------------
  // An iso box: footprint is the cell diamond scaled by (fw), extruded by `h` pixels.
  // Visible faces: top diamond, left (SW) face, right (SE) face. Neon edges on the silhouette.
  function drawBox(g, cx, cyBase, fw, h, pal, rand, windows) {
    const a = (TILE_W / 2) * fw, b = (TILE_H / 2) * fw;
    const L = [cx - a, cyBase], R = [cx + a, cyBase], B = [cx, cyBase + b];
    const Lt = [L[0], L[1] - h], Rt = [R[0], R[1] - h], Bt = [B[0], B[1] - h], Tt = [cx, cyBase - b - h];
    // faces
    g.poly([...Lt, ...Bt, ...B, ...L]).fill(pal.left);
    g.poly([...Bt, ...Rt, ...R, ...B]).fill(pal.right);
    g.poly([...Tt, ...Rt, ...Bt, ...Lt]).fill(pal.top);
    // neon silhouette
    g.poly([...Lt, ...Bt, ...Rt]).stroke({ width: 1.5, color: pal.edge, alpha: 0.9 });
    g.moveTo(...Lt).lineTo(...Tt).lineTo(...Rt).stroke({ width: 1.5, color: pal.edge, alpha: 0.9 });
    g.moveTo(...Bt).lineTo(...B).stroke({ width: 1.5, color: pal.edge, alpha: 0.75 });
    g.moveTo(...Lt).lineTo(...L).stroke({ width: 1.5, color: pal.edge, alpha: 0.55 });
    g.moveTo(...Rt).lineTo(...R).stroke({ width: 1.5, color: pal.edge, alpha: 0.55 });
    if (!windows || h < 18) return;
    // window grid on both front faces; u runs along the face edge, v runs up
    for (const side of ["L", "R"]) {
      const from = side === "L" ? L : B, to = side === "L" ? B : R;
      const ux = (to[0] - from[0]), uy = (to[1] - from[1]);
      const cols = Math.max(2, Math.round(fw * 4)), rows = Math.max(2, Math.floor(h / 14));
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        if (rand() < 0.25) continue; // some windows stay dark
        const u0 = 0.14 + (i / cols) * 0.74, u1 = u0 + 0.45 / cols;
        const v = 8 + (j / rows) * (h - 16);
        const x0 = from[0] + ux * u0, y0 = from[1] + uy * u0 - v;
        const x1 = from[0] + ux * u1, y1 = from[1] + uy * u1 - v;
        const wh = Math.min(6, h / rows * 0.45);
        g.poly([x0, y0, x1, y1, x1, y1 - wh, x0, y0 - wh])
          .fill({ color: rand() < 0.5 ? pal.winA : pal.winB, alpha: 0.85 });
      }
    }
  }

  // Building types: stacked boxes with per-type footprints/heights. All deterministic per cell.
  function drawBuilding(g, r, c, progress, flash) {
    g.clear();
    const rand = seededRand(r, c);
    const type = Math.floor(rand() * 4);
    const totalH = 60 + rand() * 80;
    const accent = rand() < 0.5 ? CYAN : MAGENTA;
    const pal = flash
      ? { top: 0xffffff, left: 0xdff6ff, right: 0xeafaff, edge: 0xffffff, winA: 0xffffff, winB: 0xffffff }
      : { top: 0x1a2030, left: 0x0c101c, right: 0x121828, edge: accent, winA: CYAN, winB: MAGENTA };
    const cx = 0, cyB = 0;
    // lot plinth (full progress from the start — the "foundation")
    diamondPath(g, TILE_W * 0.96, TILE_H * 0.96).fill(0x0d1120);
    diamondPath(g, TILE_W * 0.96, TILE_H * 0.96).stroke({ width: 1.5, color: accent, alpha: 0.5 });

    const H = totalH * progress;
    if (H < 2) return;
    if (type === 0) {            // tower: three setback stacks + antenna
      drawBox(g, cx, cyB, 0.66, H * 0.5, pal, rand, true);
      drawBox(g, cx, cyB - H * 0.5, 0.5, H * 0.33, pal, rand, true);
      drawBox(g, cx, cyB - H * 0.83, 0.36, H * 0.17, pal, rand, false);
      if (progress > 0.97) g.moveTo(cx, cyB - H - (TILE_H / 2) * 0.36).lineTo(cx, cyB - H - 16 - (TILE_H / 2) * 0.36)
        .stroke({ width: 1.5, color: pal.edge, alpha: 0.9 });
    } else if (type === 1) {     // low slab with roof gear
      drawBox(g, cx, cyB, 0.8, H * 0.45, pal, rand, true);
      drawBox(g, cx - TILE_W * 0.12, cyB - H * 0.45, 0.2, H * 0.12, pal, rand, false);
      drawBox(g, cx + TILE_W * 0.1, cyB - H * 0.45, 0.16, H * 0.18, pal, rand, false);
    } else if (type === 2) {     // ziggurat
      drawBox(g, cx, cyB, 0.8, H * 0.34, pal, rand, true);
      drawBox(g, cx, cyB - H * 0.34, 0.6, H * 0.33, pal, rand, true);
      drawBox(g, cx, cyB - H * 0.67, 0.4, H * 0.33, pal, rand, false);
    } else {                     // twin blocks
      drawBox(g, cx - TILE_W * 0.17, cyB, 0.34, H * 0.8, pal, rand, true);
      drawBox(g, cx + TILE_W * 0.17, cyB, 0.34, H, pal, rand, true);
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

  function placeBuilding(r, c) {
    const kk = key(r, c);
    if (state.get(kk) !== "ground") return;
    state.set(kk, "building");
    const old = groundG.get(kk);
    if (old) { old.destroy(); groundG.delete(kk); }
    clearTrees(kk);

    // road ring around the lot (8 neighbors; skips cells that are outside or already built on)
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      if (inGrid(r + dr, c + dc)) makeRoad(r + dr, c + dc);
    }
    recomputeRoads();

    const { x, y } = cellPos(r, c);
    const g = new Graphics();
    g.position.set(x, y);
    g.zIndex = r + c + 0.5;
    world.addChild(g);

    const t0 = performance.now();
    const grow = () => {
      const t = Math.min(1, (performance.now() - t0) / BUILD_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      drawBuilding(g, r, c, eased, false);
      if (t >= 1) {
        app.ticker.remove(grow);
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
