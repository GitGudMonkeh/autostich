// The building system, in the reference language, on the water.
// Deliberately OUTSIDE src/: design exploration.
//
// Same rules as the first interactive city, different assets and a different ground:
//
//   · You build ON THE WATER. There is no island underneath — every plot you place raises its own
//     quay out of the sea, and the city is whatever you have built so far.
//   · Click a free tile to build. Up to FOUR buildings may stand directly adjacent and form a
//     district; the fifth is refused with a red flash.
//   · Streets are derived, never placed: every free tile touching a building becomes road, and
//     each road tile draws itself from its four connections, so junctions, bends and dead ends
//     appear on their own.
//   · Every building stands on a foundation level with the footway, and where two plots touch,
//     the kerb between them drops and the podiums merge into one base.
//
// Nothing is drawn here that was not designed in a mockup first: the buildings come from
// jpBuildings.js, their parts from jpRender.js and refRender.js, the water from waterRender.js.
// This file is the RULES, not the art.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { CS, P, rng, dashLine } from "./buildings.js";
import { PAL } from "./refRender.js";
import { JP_BUILDINGS, TILE } from "./jpBuildings.js";
import { SEA, sea, ripples, farRipples, rings, rain, smear } from "./waterRender.js";

const GRID = 7;
const DISTRICT = 4;               // how many buildings may stand adjacent as one district
// Heights, in lattice units above the water plane. The deck is what lifts the whole city clear of
// the sea; the footway is the extra step a building plot stands on.
const DECK = 1.25;
const WALK = 0.34;
const DROP = 0.42;                // how far the quay wall reaches below the waterline
const ROAD = { asphalt: 0x0f0e19, walk: 0x2a2743, kerb: 0x1b192c, edge: 0x9aa6d8, line: 0xe8ecff };
const HOVER = 0x61dfff, REJECT = 0xff3d5a;

// How often each type turns up. A street is mostly small stuff: the screen house and the sign
// tower are events, not the norm, and the service tower has to be common enough to stay dark.
const MIX = {
  imbiss: 16, gasse: 14, ladenzeile: 14, spielhalle: 11, technikturm: 11,
  wohnturm: 10, kapselturm: 9, torhof: 7, schilderturm: 5, bildschirm: 3,
};

const key = (r, c) => `${r},${c}`;
const inGrid = (r, c) => r >= 0 && r < GRID && c >= 0 && c < GRID;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Tile (r, c) covers lattice cells [r*TILE .. r*TILE+TILE-1] along i and the same along j.
const lo = (t) => t * TILE - 0.5;
const hi = (t) => t * TILE + TILE - 0.5;
const cornerOf = (r, c, k) => P(hi(r), hi(c), k);

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const world = new Container();
  world.sortableChildren = true;
  app.stage.addChild(world);

  const state = new Map();          // key -> "water" | "road" | "building"
  const owner = new Map();          // key -> building id, for counting a district in BUILDINGS
  const hitG = new Map();           // key -> the clickable plate, alive for the life of the tile
  const roadG = new Map();          // key -> road surface
  const foundG = new Map();         // key -> podium
  const builtG = new Map();         // building id -> node
  const lit = new Map();            // building id -> { x, top, w, height, colour, strength }
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) state.set(key(r, c), "water");
  let nextId = 1;

  /* ---- the sea ------------------------------------------------------------------------------- */

  // The falloffs in waterRender are measured from the near corner of the built area. Here that is
  // the near corner of the whole grid, because the grid is where the city can ever be.
  const CORNER = cornerOf(GRID - 1, GRID - 1, 0);
  const X0 = -1600, X1 = 1600, Y0 = -900, Y1 = 1600;
  const water = new Graphics();
  water.zIndex = -200;
  sea(water, X0, X1, Y0, Y1);
  const rippleG = new Graphics();
  rippleG.zIndex = -199;
  ripples(rippleG, X0, X1, Y0, Y1, CORNER, 0x51a7);
  farRipples(rippleG, CORNER, 0x7d13);
  const ringG = new Graphics();
  ringG.zIndex = -198;
  const reflectG = new Graphics();
  reflectG.blendMode = "add";
  reflectG.zIndex = -197;
  const rainG = new Graphics();
  rainG.zIndex = 900;
  world.addChild(water, rippleG, ringG, reflectG, rainG);

  /* ---- the grid ------------------------------------------------------------------------------- */

  const tilePoly = (r, c, k) => [
    ...P(lo(r), lo(c), k), ...P(hi(r), lo(c), k), ...P(hi(r), hi(c), k), ...P(lo(r), hi(c), k)];

  // One plate per tile for the life of the city. It keeps its hit shape even once a street runs
  // over it — a road may still be built on, and that is what lets a district grow at all: every
  // free neighbour of a building becomes road, so without this nothing could stand next to
  // anything.
  function plate(r, c, hover) {
    const g = hitG.get(key(r, c));
    if (!g) return;
    g.clear();
    const st = state.get(key(r, c));
    const k = st === "water" ? 0 : DECK + 0.02;
    const d = tilePoly(r, c, k);
    g.poly(d).fill({ color: 0x000000, alpha: 0 });          // invisible, but still clickable
    if (st === "building") return;
    g.zIndex = hover ? r + c + 0.46 : r + c - 0.5;
    if (!hover) {
      if (st === "water") {                                 // free water reads as buildable
        for (let n = 0; n < 4; n++) {
          dashLine(g, d[n * 2], d[n * 2 + 1], d[((n + 1) % 4) * 2], d[((n + 1) % 4) * 2 + 1], 6, 7);
        }
        g.stroke({ width: 1, color: HOVER, alpha: 0.16 });
      }
      return;
    }
    g.poly(d).fill({ color: HOVER, alpha: st === "water" ? 0.1 : 0.06 });
    g.poly(d).stroke({ width: 1.6, color: HOVER, alpha: 0.8 });
  }

  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
    const g = new Graphics();
    g.eventMode = "static";
    g.cursor = "pointer";
    g.on("pointerover", () => plate(r, c, true));
    g.on("pointerout", () => plate(r, c, false));
    g.on("pointerdown", () => place(r, c));
    world.addChild(g);
    hitG.set(key(r, c), g);
    plate(r, c, false);
  }

  /* ---- the quay ------------------------------------------------------------------------------- */

  // Only the +i and +j faces of a tile can be seen, so only those are drawn — and only where the
  // neighbour on that side is still water. The waterline plus the dark contact shadow under it is
  // what makes the plot stand IN the water instead of floating over it.
  function quayFaces(g, glow, r, c, top) {
    const openI = !inGrid(r + 1, c) || state.get(key(r + 1, c)) === "water";
    const openJ = !inGrid(r, c + 1) || state.get(key(r, c + 1)) === "water";
    const edges = [];
    if (openI) edges.push([P(hi(r), lo(c), top), P(hi(r), hi(c), top), SEA.quay]);
    if (openJ) edges.push([P(lo(r), hi(c), top), P(hi(r), hi(c), top), 0x07070d]);
    for (const [a, b, col] of edges) {
      g.poly([...a, ...b, b[0], b[1] + (top + DROP) * CS, a[0], a[1] + (top + DROP) * CS]).fill(col);
    }
    for (const [a, b] of edges) {
      g.moveTo(a[0], a[1] + (top + DROP) * CS).lineTo(b[0], b[1] + (top + DROP) * CS);
    }
    if (edges.length) g.stroke({ width: 1.6, color: SEA.foam, alpha: 0.5 });
    for (let n = 1; n <= 4; n++) {
      for (const [a, b] of edges) {
        const off = (top + DROP) * CS + n * 2.4;
        g.moveTo(a[0], a[1] + off).lineTo(b[0], b[1] + off);
      }
      if (edges.length) g.stroke({ width: 2.2, color: 0x05050c, alpha: 0.15 * (1 - n / 5) });
    }
    for (const [a, b] of edges) {
      glow.moveTo(a[0], a[1] + (top + DROP) * CS).lineTo(b[0], b[1] + (top + DROP) * CS);
    }
    if (edges.length) glow.stroke({ width: 5, color: PAL.cyan, alpha: 0.1 });
  }

  /* ---- streets --------------------------------------------------------------------------------- */

  function drawRoad(r, c) {
    let node = roadG.get(key(r, c));
    if (!node) {
      node = new Container();
      node.zIndex = r + c;
      world.addChild(node);
      roadG.set(key(r, c), node);
    }
    node.removeChildren().forEach((ch) => ch.destroy());
    const g = new Graphics();
    const glow = new Graphics();
    glow.blendMode = "add";
    node.addChild(g, glow);
    quayFaces(g, glow, r, c, DECK);
    g.poly(tilePoly(r, c, DECK)).fill(ROAD.asphalt);
    g.poly(tilePoly(r, c, DECK)).stroke({ width: 1.2, color: ROAD.edge, alpha: 0.3 });
    // Each road draws itself from its connections: a lane dash where the street runs on, a
    // crossing where it meets a plot. Nothing about junctions is authored.
    const roadAt = (dr, dc) => inGrid(r + dr, c + dc) && state.get(key(r + dr, c + dc)) === "road";
    const buildAt = (dr, dc) => inGrid(r + dr, c + dc) && state.get(key(r + dr, c + dc)) === "building";
    const mid = (t) => t * TILE + (TILE - 1) / 2;
    // A tile carries the centre line of the street that runs THROUGH it, and a junction carries
    // none: drawing both axes on every tile turned the whole deck into a field of crosses.
    const throughI = roadAt(1, 0) && roadAt(-1, 0);
    const throughJ = roadAt(0, 1) && roadAt(0, -1);
    if (throughI !== throughJ) {
      for (let s = 0; s < TILE; s += 1.6) {
        const a = throughI ? P(lo(r) + s, mid(c), DECK + 0.01) : P(mid(r), lo(c) + s, DECK + 0.01);
        const b = throughI
          ? P(lo(r) + Math.min(TILE, s + 0.9), mid(c), DECK + 0.01)
          : P(mid(r), lo(c) + Math.min(TILE, s + 0.9), DECK + 0.01);
        g.moveTo(a[0], a[1]).lineTo(b[0], b[1]);
      }
      g.stroke({ width: 1.5, color: ROAD.line, alpha: 0.45 });
    } else if (throughI && throughJ) {
      g.poly([...P(lo(r) + 1, lo(c) + 1, DECK + 0.01), ...P(hi(r) - 1, lo(c) + 1, DECK + 0.01),
        ...P(hi(r) - 1, hi(c) - 1, DECK + 0.01), ...P(lo(r) + 1, hi(c) - 1, DECK + 0.01)])
        .stroke({ width: 1, color: ROAD.line, alpha: 0.16 });
    }
    for (const [dr, dc] of DIRS) {
      if (!buildAt(dr, dc)) continue;
      const at = dr ? (dr > 0 ? hi(r) - 0.5 : lo(r) + 0.5) : mid(r);
      const along = dc ? (dc > 0 ? hi(c) - 0.5 : lo(c) + 0.5) : mid(c);
      for (let s = -1.3; s <= 1.3; s += 0.62) {
        const q = dr
          ? [...P(at - 0.3, along + s, DECK + 0.01), ...P(at + 0.3, along + s, DECK + 0.01),
            ...P(at + 0.3, along + s + 0.3, DECK + 0.01), ...P(at - 0.3, along + s + 0.3, DECK + 0.01)]
          : [...P(at + s, along - 0.3, DECK + 0.01), ...P(at + s + 0.3, along - 0.3, DECK + 0.01),
            ...P(at + s + 0.3, along + 0.3, DECK + 0.01), ...P(at + s, along + 0.3, DECK + 0.01)];
        g.poly(q).fill({ color: ROAD.line, alpha: 0.4 });
      }
    }
    // Light pools only where a building actually stands next to the road. One on every tile read
    // as a field of grey smudges: light on the ground has to come from something.
    const hue = neighbourHue(r, c);
    if (hue) {
      const rand = rng((r * 73856093) ^ (c * 19349663) ^ 0x51ed27);
      const [px, py] = P(mid(r) + (rand() - 0.5) * 1.6, mid(c) + (rand() - 0.5) * 1.6, DECK);
      for (let n = 5; n >= 1; n--) {
        glow.ellipse(px, py, 2.2 * CS * (n / 5), 2.2 * CS * 0.5 * (n / 5))
          .fill({ color: hue, alpha: 0.03 });
      }
    }
  }

  const neighbourHue = (r, c) => {
    for (const [dr, dc] of DIRS) {
      const id = owner.get(key(r + dr, c + dc));
      if (id && lit.has(id)) return lit.get(id).colour;
    }
    return null;
  };

  /* ---- foundations ------------------------------------------------------------------------------ */

  // The plot a building stands on, raised to footway height so it continues the pavement instead
  // of leaving a hole. Where two plots touch, the kerb between them is dropped and the podiums
  // merge into one base.
  function drawFoundation(g, glow, r, c, hue) {
    g.clear();
    glow.clear();
    const top = DECK + WALK;
    quayFaces(g, glow, r, c, top);
    const kerb = (dr, dc) => {
      const nk = key(r + dr, c + dc);
      if (!inGrid(r + dr, c + dc) || state.get(nk) === "water") return;   // the quay drew it
      if (state.get(nk) === "building") return;                            // podiums merge
      const a = dr ? P(hi(r), lo(c), top) : P(lo(r), hi(c), top);
      const b = dr ? P(hi(r), hi(c), top) : P(hi(r), hi(c), top);
      g.poly([...a, ...b, b[0], b[1] + WALK * CS, a[0], a[1] + WALK * CS]).fill(ROAD.kerb);
    };
    kerb(1, 0); kerb(0, 1);
    g.poly(tilePoly(r, c, top)).fill(ROAD.walk);
    g.poly(tilePoly(r, c, top)).stroke({ width: 1.2, color: ROAD.edge, alpha: 0.4 });
    for (let n = 1; n < TILE; n++) {                                       // paving joints
      g.moveTo(...P(lo(r) + n, lo(c), top)).lineTo(...P(lo(r) + n, hi(c), top));
      g.moveTo(...P(lo(r), lo(c) + n, top)).lineTo(...P(hi(r), lo(c) + n, top));
    }
    g.stroke({ width: 0.7, color: ROAD.edge, alpha: 0.1 });
    const inset = 0.6;                                                     // lit trim, district hue
    g.poly([...P(lo(r) + inset, lo(c) + inset, top), ...P(hi(r) - inset, lo(c) + inset, top),
      ...P(hi(r) - inset, hi(c) - inset, top), ...P(lo(r) + inset, hi(c) - inset, top)])
      .stroke({ width: 1, color: hue, alpha: 0.4 });
  }

  function redrawFoundation(r, c) {
    const f = foundG.get(key(r, c));
    if (f) drawFoundation(f.g, f.glow, r, c, districtHue(r, c));
  }

  /* ---- districts --------------------------------------------------------------------------------- */

  const districtTiles = (r, c) => {
    const seen = new Set([key(r, c)]);
    const queue = [[r, c]];
    while (queue.length) {
      const [qr, qc] = queue.pop();
      for (const [dr, dc] of DIRS) {
        const nr = qr + dr, nc = qc + dc, nk = key(nr, nc);
        if (inGrid(nr, nc) && !seen.has(nk) && state.get(nk) === "building") {
          seen.add(nk); queue.push([nr, nc]);
        }
      }
    }
    return seen;
  };

  // A district is counted in BUILDINGS, not in tiles: a two-tile hall is one building, and
  // counting its tiles would make it worth two.
  const districtCount = (tiles) => new Set([...tiles].map((k) => owner.get(k)).filter(Boolean)).size;

  // What the district would count if these cells joined it, the newcomer included.
  function countWith(cells) {
    const seen = new Set();
    for (const [r, c] of cells) {
      for (const [dr, dc] of DIRS) {
        const nk = key(r + dr, c + dc);
        if (inGrid(r + dr, c + dc) && state.get(nk) === "building") {
          for (const t of districtTiles(r + dr, c + dc)) seen.add(t);
        }
      }
    }
    return districtCount(seen) + 1;
  }

  const districtHue = (r, c) => {
    const tiles = [...districtTiles(r, c)].sort();
    for (const t of tiles) {
      const id = owner.get(t);
      if (id && lit.has(id)) return lit.get(id).colour;
    }
    return PAL.cyan;
  };

  /* ---- placing ------------------------------------------------------------------------------------ */

  function pick(r, c) {
    const rand = rng((r * 92837111) ^ (c * 689287499) ^ 0x2f6e2b1);
    let pool = rand() * JP_BUILDINGS.reduce((s, b) => s + (MIX[b.key] ?? 0), 0);
    return JP_BUILDINGS.find((b) => (pool -= MIX[b.key] ?? 0) < 0) ?? JP_BUILDINGS[0];
  }

  const SMALL = JP_BUILDINGS.filter((b) => b.plot[0] === 1 && b.plot[1] === 1);

  function footprint(r, c, def) {
    const [w, h] = def.plot;
    for (let dr = 0; dr < w; dr++) for (let dc = 0; dc < h; dc++) {
      const cells = [];
      let ok = true;
      for (let a = 0; a < w && ok; a++) for (let b = 0; b < h && ok; b++) {
        const rr = r - dr + a, cc = c - dc + b;
        if (!inGrid(rr, cc) || state.get(key(rr, cc)) === "building") ok = false;
        else cells.push([rr, cc]);
      }
      if (ok) return cells;
    }
    return null;
  }

  function rejectFlash(r, c) {
    const g = new Graphics();
    g.zIndex = r + c + 0.9;
    world.addChild(g);
    const t0 = performance.now();
    const step = () => {
      const t = (performance.now() - t0) / 620;
      if (t >= 1) { app.ticker.remove(step); g.destroy(); return; }
      g.clear();
      const k = state.get(key(r, c)) === "water" ? 0 : DECK + 0.03;
      g.poly(tilePoly(r, c, k)).fill({ color: REJECT, alpha: 0.3 * (1 - t) });
      g.poly(tilePoly(r, c, k)).stroke({ width: 2.4, color: REJECT, alpha: 0.9 * (1 - t) });
    };
    app.ticker.add(step);
  }

  // A plot landing on the water throws a ring, the same one the rain makes — only much bigger.
  function splash(r, c) {
    const g = new Graphics();
    g.zIndex = r + c + 0.95;
    world.addChild(g);
    const [x, y] = P(r * TILE + (TILE - 1) / 2, c * TILE + (TILE - 1) / 2, 0);
    const t0 = performance.now();
    const step = () => {
      const t = (performance.now() - t0) / 900;
      if (t >= 1) { app.ticker.remove(step); g.destroy(); return; }
      g.clear();
      for (const off of [0, 0.22]) {
        const f = t - off;
        if (f <= 0) continue;
        const rr = 10 + f * 130;
        g.ellipse(x, y + 6, rr, rr * 0.5)
          .stroke({ width: 2.6 * (1 - f), color: SEA.foam, alpha: 0.4 * (1 - f) * (1 - f) });
      }
    };
    app.ticker.add(step);
  }

  function place(r, c) {
    if (state.get(key(r, c)) === "building") return;

    // The type decides how much ground it needs. If its plot does not fit here, it falls back to a
    // single tile rather than refusing the click — one large type coming up would otherwise make a
    // tight spot unbuildable.
    let def = pick(r, c);
    let cells = footprint(r, c, def);
    if (!cells || countWith(cells) > DISTRICT) {
      const rand = rng((r * 40499) ^ (c * 86969) ^ 0x51a3);
      def = SMALL[Math.floor(rand() * SMALL.length)];
      cells = [[r, c]];
      if (countWith(cells) > DISTRICT) { rejectFlash(r, c); return; }
    }

    const id = nextId++;
    for (const [rr, cc] of cells) {
      const ck = key(rr, cc);
      state.set(ck, "building");
      owner.set(ck, id);
      plate(rr, cc, false);
      const old = roadG.get(ck);
      if (old) { old.destroy({ children: true }); roadG.delete(ck); }
    }

    // Streets are derived from the whole map every time, so a new plot can also close a gap that
    // was road a moment ago.
    for (let rr = 0; rr < GRID; rr++) for (let cc = 0; cc < GRID; cc++) {
      if (state.get(key(rr, cc)) === "water" && touchesBuilding(rr, cc)) state.set(key(rr, cc), "road");
    }
    for (let rr = 0; rr < GRID; rr++) for (let cc = 0; cc < GRID; cc++) {
      if (state.get(key(rr, cc)) === "road") drawRoad(rr, cc);
    }

    const rs = cells.map(([rr]) => rr), cs = cells.map(([, cc]) => cc);
    const r0 = Math.min(...rs), r1 = Math.max(...rs), c0 = Math.min(...cs), c1 = Math.max(...cs);

    for (const [rr, cc] of cells) {
      const g = new Graphics();
      const glow = new Graphics();
      glow.blendMode = "add";
      const node = new Container();
      node.zIndex = rr + cc + 0.1;
      node.addChild(g, glow);
      world.addChild(node);
      foundG.set(key(rr, cc), { g, glow, node });
      splash(rr, cc);
    }
    // The whole district is redrawn: the neighbours lose their kerb towards the new plot, and a
    // grown district may have moved its anchor and therefore its colour.
    for (const dk of districtTiles(r0, c0)) {
      const [dr, dc] = dk.split(",").map(Number);
      redrawFoundation(dr, dc);
    }

    /* the building itself, centred on the plot it was given */
    const node = new Container();
    node.zIndex = r1 + c1 + 0.5;
    const body = new Graphics();
    const glow = new Graphics();
    glow.blendMode = "add";
    def.draw(body, glow);
    // Two containers: the inner one moves the drawing so that local (0, 0) is the plot's ground
    // point, the outer one puts that point on the tile. The grow animation then collapses toward
    // the ground instead of toward whatever y the authoring happened to land on.
    const inner = new Container();
    inner.addChild(body, glow);
    const fi = (def.foot.i0 + def.foot.i1) / 2, fj = (def.foot.j0 + def.foot.j1) / 2;
    const [bx, by] = P(fi, fj, 0);
    inner.position.set(-bx, -by);
    node.addChild(inner);
    const ti = (lo(r0) + hi(r1)) / 2, tj = (lo(c0) + hi(c1)) / 2;
    const [ox, oy] = P(ti, tj, DECK + WALK);
    node.position.set(ox, oy);
    world.addChild(node);
    builtG.set(id, node);

    // Its light on the water, if it stands on the shore: the smear starts at the plot's near
    // corner and is only drawn while there is open water in front of it.
    lit.set(id, {
      w: 22 + (r1 - r0 + c1 - c0) * 11,
      height: 40 + (def.plot[0] + def.plot[1]) * 11,
      colour: def.hue, strength: 0.5, r: r1, c: c1,
    });

    // Projection → matter: the plot lands, then the building grows out of it.
    node.scale.set(1, 0.08);
    node.alpha = 0.2;
    const t0 = performance.now();
    const grow = () => {
      const t = Math.min(1, (performance.now() - t0) / 620);
      const e = 1 - Math.pow(1 - t, 3);
      node.scale.set(1, 0.08 + 0.92 * e);
      node.alpha = 0.2 + 0.8 * t;
      if (t >= 1) app.ticker.remove(grow);
    };
    app.ticker.add(grow);
  }

  function touchesBuilding(r, c) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      if (inGrid(r + dr, c + dc) && state.get(key(r + dr, c + dc)) === "building") return true;
    }
    return false;
  }

  // Where the water starts straight below a tile, in screen coordinates. Stepping r and c together
  // moves straight down the screen, so the walk finds the plate edge under the building — which is
  // where its light lands. Null once the edge is off the grid or too far to still read.
  function shoreBelow(r, c) {
    let n = 0;
    while (n < GRID && inGrid(r + n + 1, c + n + 1)
      && state.get(key(r + n + 1, c + n + 1)) !== "water") n++;
    if (n > 3) return null;
    const [x, y] = cornerOf(r + n, c + n, DECK);
    return [x, y + (DECK + DROP) * CS + 3];
  }

  /* ---- frame ---------------------------------------------------------------------------------- */

  const recentre = () => {
    const span = GRID * TILE * CS;                 // half the grid's screen width
    const s = Math.min(1.5, (app.screen.width * 0.92) / (span * 2),
      (app.screen.height * 0.84) / (span * 1.15));
    world.scale.set(s);
    world.position.set(app.screen.width / 2, app.screen.height / 2 - span * 0.42 * s);
  };
  recentre();
  app.renderer.on("resize", recentre);

  let lastRefl = -1;
  app.ticker.add(() => {
    const t = performance.now() / 1000;
    rings(ringG, t, CORNER);
    rain(rainG, t);
    if (t - lastRefl > 0.05) {                     // the reflections carry the water, at ~20 fps
      lastRefl = t;
      reflectG.clear();
      for (const l of lit.values()) {
        const shore = shoreBelow(l.r, l.c);
        if (!shore) continue;
        smear(reflectG, shore[0], shore[1], l.w, l.height, l.colour, l.strength, t);
      }
    }
  });

  // A handle on the rules from outside, so the district limit can be checked by a test instead of
  // being read off a screenshot — a two-tile building makes tile counting misleading.
  window.jpcity = {
    state,
    owner,
    districts() {
      const seen = new Set(), out = [];
      for (const [k, st] of state) {
        if (st !== "building" || seen.has(k)) continue;
        const [r, c] = k.split(",").map(Number);
        const tiles = districtTiles(r, c);
        for (const tk of tiles) seen.add(tk);
        out.push(districtCount(tiles));
      }
      return out;
    },
  };

  /* ---- a city to start from --------------------------------------------------------------------- */

  // An empty grid does not show what the rules do. Three plots, placed apart, so the first click
  // already has streets and a shoreline to grow against.
  for (const [r, c] of [[2, 2], [4, 1], [1, 4]]) place(r, c);
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
