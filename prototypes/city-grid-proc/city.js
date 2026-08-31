// The interactive city — built entirely from the studies in this folder.
//
// Nothing is drawn here that was not designed and approved in a mockup first: buildings come
// from facadeRender.js, parks from parkRender.js, roads and street furniture from
// streetRender.js, traffic from vehicles.js, and the three silhouettes from buildings.js.
// This file is the RULES, not the art.
//
// Rules:
//   · Click a free cell to build. Up to six buildings may stand directly adjacent and form a
//     district; one more is refused with a red flash.
//   · Streets are derived, never placed: every free cell touching a building (8-neighbourhood)
//     becomes road, and each road cell draws itself from its four connections — so junctions,
//     T-pieces, bends and dead ends appear on their own.
//   · Leftover pockets that no street would ever need turn into parks.
//   · Traffic drives the derived road graph.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { TILE_W, TILE_H, CS, rng, dashLine, BUILDINGS } from "./buildings.js";
import { VARIANTS, WIN_SETS, buildFacade } from "./facadeRender.js";
import { PARKS } from "./parkRender.js";
import {
  pt, slab, wallA, wallB, LANE, roadCell, cellMarkings, crossing, junctionBox,
  lamp, signal, signPost, holoDisplay, kiosk, bollard, groundPanel,
} from "./streetRender.js";
import { vehicle, VEHICLES } from "./vehicles.js";

const GRID = 12;
const DISTRICT = 6;             // how many buildings may stand directly adjacent as one district
const BUILD_MS = 2200;
const HOLO = 0xb06bff, HOT = 0xe8fbff, C1 = 0x35d6ff;
// A building does not float on the tile: it stands on a podium level with the street footway,
// which is why PLINTH is the kerb height from streetRender and not a free choice.
const PLINTH = 3;
const PLOT_TOP = 0x2b2648, PLOT_FACE = 0x1a1730, PLOT_JOINT = 0x3a3360;
const LEAD = { kragturm: 0x8ceaff, torbau: 0xffc478, drilling: 0xff8ad8 };

const key = (r, c) => `${r},${c}`;
const inGrid = (r, c) => r >= 0 && r < GRID && c >= 0 && c < GRID;
// (r, c) are tile coordinates: r runs along +a (down-right), c along +b (down-left).
const DIRS = { pa: [1, 0], na: [-1, 0], pb: [0, 1], nb: [0, -1] };
const HEAD = { pa: "E", na: "W", pb: "S", nb: "N" };
const OPP = { pa: "na", na: "pa", pb: "nb", nb: "pb" };
const EDGE = { pa: [0.5, 0], na: [-0.5, 0], pb: [0, 0.5], nb: [0, -0.5] };

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const world = new Container();
  world.sortableChildren = true;
  app.stage.addChild(world);
  const recentre = () => {
    const s = Math.min(1, app.screen.width / (GRID * TILE_W * 0.62), app.screen.height / (GRID * TILE_H * 1.15));
    world.scale.set(s);
    world.position.set(app.screen.width / 2, app.screen.height / 2 - (GRID * TILE_H) / 2 * s + 30 * s);
  };
  recentre();
  app.renderer.on("resize", recentre);

  const state = new Map();        // key -> "ground" | "road" | "building"
  const groundG = new Map();      // key -> Graphics (clickable plate)
  const roadG = new Map();        // key -> Container (surface + furniture)
  const parkG = new Map();        // key -> Graphics (pocket park)
  const builtG = new Map();       // key -> the finished building node
  const foundG = new Map();       // key -> the podium the building stands on
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) state.set(key(r, c), "ground");

  /* ---- empty plot ------------------------------------------------------------------------- */

  // One plate per cell for the life of the city. It keeps its hit shape even once a street runs
  // over it — a road may still be built on, and that is what lets districts grow beyond a single
  // building: every free neighbour of a building is a road, so without this nothing could ever
  // stand next to anything.
  const plate = (r, c, hover) => {
    const g = groundG.get(key(r, c));
    if (!g) return;
    g.clear();
    const [x, y] = pt(r, c);
    const d = [x, y - TILE_H / 2, x + TILE_W / 2, y, x, y + TILE_H / 2, x - TILE_W / 2, y];
    g.poly(d).fill({ color: 0x000000, alpha: 0 });          // invisible, but still clickable
    const st = state.get(key(r, c));
    if (st === "building") return;
    if (st === "road") {                                    // buildable, so it answers the cursor
      g.zIndex = hover ? r + c + 0.45 : r + c;               // over its own street while hovered
      if (!hover) return;
      g.poly(d).stroke({ width: 1.4, color: C1, alpha: 0.75 });
      return;
    }
    g.poly(d).fill({ color: hover ? 0x1b1440 : 0x0a0818, alpha: hover ? 0.9 : 0.75 });
    for (let n = 0; n < 4; n++) {
      dashLine(g, d[n * 2], d[n * 2 + 1], d[((n + 1) % 4) * 2], d[((n + 1) % 4) * 2 + 1], 5, 4);
    }
    g.stroke({ width: 1, color: hover ? C1 : HOLO, alpha: hover ? 0.9 : 0.3 });
  };

  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
    const g = new Graphics();
    g.zIndex = r + c;
    g.eventMode = "static";
    g.cursor = "pointer";
    g.on("pointerover", () => plate(r, c, true));
    g.on("pointerout", () => plate(r, c, false));
    g.on("pointerdown", () => place(r, c));
    world.addChild(g);
    groundG.set(key(r, c), g);
    plate(r, c, false);
  }

  /* ---- streets ---------------------------------------------------------------------------- */

  const connOf = (r, c) => {
    const conn = {};
    for (const [d, [dr, dc]] of Object.entries(DIRS)) {
      conn[d] = inGrid(r + dr, c + dc) && state.get(key(r + dr, c + dc)) === "road";
    }
    return conn;
  };

  // Furniture is deterministic per cell, so a street does not reshuffle itself every time the
  // city grows. Signals only appear where there is actually a junction to control.
  function furnish(node, glow, r, c, conn) {
    const rand = rng((r * 73856093) ^ (c * 19349663) ^ 0x51ed27);
    const open = Object.values(conn).filter(Boolean).length;
    const lead = 0x8ceaff;
    if (open >= 3) {
      junctionBox(node, glow, r, c, lead);
      for (const d of Object.keys(DIRS)) if (conn[d]) crossing(node, r, c, d, 0xe9e6ff);
      if (rand() < 0.75) signal(node, glow, r + 0.44, c + 0.44, rand() < 0.5 ? 2 : 0);
      return;
    }
    const side = rand() < 0.5 ? 0.44 : -0.44;
    const roll = rand();
    if (roll < 0.3) lamp(node, glow, r + side, c + side, 0x9fd8ff);
    else if (roll < 0.44) signPost(node, glow, r + side, c - side, 0xff8ad8, rand);
    else if (roll < 0.56) groundPanel(node, glow, r + side, c + side, 0x8ceaff);
    else if (roll < 0.64) bollard(node, r + side, c - side, 0x9fd8ff);
    else if (roll < 0.72 && touchesBuilding(r, c)) kiosk(node, glow, r + side, c + side, 0xffc478);
    if (rand() < 0.14) {
      holoDisplay(node, glow, r, c + 0.55, 30, 0.2, 13, rand() < 0.5 ? 0x8ceaff : 0xff8ad8, rand);
    }
  }

  const touchesBuilding = (r, c) => {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (inGrid(r + dr, c + dc) && state.get(key(r + dr, c + dc)) === "building") return true;
    }
    return false;
  };

  function drawRoad(r, c) {
    const kk = key(r, c);
    let node = roadG.get(kk);
    if (!node) {
      node = new Container();
      node.zIndex = r + c + 0.1;
      world.addChild(node);
      roadG.set(kk, node);
    }
    node.removeChildren().forEach((ch) => ch.destroy());
    const surface = new Graphics();
    const glow = new Graphics();
    glow.blendMode = "add";
    const conn = connOf(r, c);
    roadCell(surface, r, c, conn, 0x35d6ff);
    cellMarkings(surface, r, c, conn, 0xffc94a);
    const props = new Graphics();
    furnish(props, glow, r, c, conn);
    node.addChild(surface, props, glow);
  }

  function makeRoad(r, c) {
    const kk = key(r, c);
    if (state.get(kk) !== "ground") return;
    state.set(kk, "road");
    plate(r, c, false);
    clearPark(kk);
  }

  /* ---- pocket parks ------------------------------------------------------------------------ */

  const clearPark = (kk) => {
    const p = parkG.get(kk);
    if (p) { p.destroy(); parkG.delete(kk); }
  };

  // A free cell hemmed in on three orthogonal sides is a place no street would ever need — it
  // becomes a park instead of staying an empty plate.
  function updateParks() {
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      const kk = key(r, c);
      if (state.get(kk) !== "ground" || parkG.has(kk)) continue;
      let enclosed = 0;
      for (const [dr, dc] of Object.values(DIRS)) {
        if (!inGrid(r + dr, c + dc)) continue;
        const s = state.get(key(r + dr, c + dc));
        if (s === "road" || s === "building") enclosed++;
      }
      if (enclosed < 3) continue;
      const def = PARKS[Math.floor(rng((r * 31) ^ (c * 17))() * PARKS.length)];
      const g = new Graphics();
      def.draw(g);
      const [x, y] = pt(r, c);
      g.position.set(x, y);
      g.zIndex = r + c + 0.2;
      g.scale.set(0.2);
      world.addChild(g);
      parkG.set(kk, g);
      const t0 = performance.now();
      const grow = () => {
        const t = Math.min(1, (performance.now() - t0) / 500);
        if (g.destroyed) { app.ticker.remove(grow); return; }
        g.scale.set(0.2 + 0.8 * (1 - Math.pow(1 - t, 3)));
        g.alpha = t;
        if (t >= 1) app.ticker.remove(grow);
      };
      app.ticker.add(grow);
    }
  }

  /* ---- building placement ------------------------------------------------------------------ */

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

  function rejectFlash(r, c) {
    const g = new Graphics();
    const [x, y] = pt(r, c);
    g.poly([x, y - TILE_H / 2, x + TILE_W / 2, y, x, y + TILE_H / 2, x - TILE_W / 2, y])
      .stroke({ width: 2.5, color: 0xff3b30, alpha: 1 });
    g.zIndex = r + c + 0.9;
    world.addChild(g);
    const t0 = performance.now();
    const fade = () => {
      const t = Math.min(1, (performance.now() - t0) / 500);
      g.alpha = 1 - t;
      if (t >= 1) { app.ticker.remove(fade); g.destroy(); }
    };
    app.ticker.add(fade);
  }

  // What stands on a cell is fixed by its coordinates: the same plot always yields the same
  // building, so a rebuilt city looks like the same city.
  function pick(r, c) {
    const rand = rng((r * 92837111) ^ (c * 689287499) ^ 0x2f6e2b1);
    const roll = rand();
    if (roll < 0.16) return { park: PARKS[Math.floor(rand() * PARKS.length)] };
    const def = BUILDINGS[Math.floor(rand() * BUILDINGS.length)];
    const variant = VARIANTS[Math.floor(rand() * VARIANTS.length)];
    return { def, variant, win: WIN_SETS[def.key], lead: LEAD[def.key] };
  }

  /* ---- foundations -------------------------------------------------------------------------- */

  // The plot a building stands on, raised to footway height so it continues the pavement instead
  // of leaving a hole. Where two plots touch, the kerb between them is dropped and the podiums
  // merge into one block base.
  function drawFoundation(g, r, c, lead) {
    g.clear();
    const a0 = r - 0.5, a1 = r + 0.5, b0 = c - 0.5, b1 = c + 0.5;
    const merged = (dr, dc) => foundG.has(key(r + dr, c + dc));
    if (!merged(1, 0)) g.poly(wallB(b0, b1, a1, 0, PLINTH)).fill(PLOT_FACE);
    if (!merged(0, 1)) g.poly(wallA(a0, a1, b1, 0, PLINTH)).fill(PLOT_FACE);
    g.poly(slab(a0, a1, b0, b1, PLINTH)).fill(PLOT_TOP);
    for (let n = 1; n < 5; n++) {                                    // paving joints
      const t = -0.5 + n / 5;
      g.moveTo(...pt(r + t, b0, PLINTH)).lineTo(...pt(r + t, b1, PLINTH));
      g.moveTo(...pt(a0, c + t, PLINTH)).lineTo(...pt(a1, c + t, PLINTH));
    }
    g.stroke({ width: 0.8, color: PLOT_JOINT, alpha: 0.55 });
    const inset = 0.44;                                              // lit trim around the plot
    g.poly(slab(r - inset, r + inset, c - inset, c + inset, PLINTH))
      .stroke({ width: 1, color: lead, alpha: 0.35 });
    const d = slab(a0, a1, b0, b1, PLINTH);
    for (let n = 0; n < 4; n++) {
      dashLine(g, d[n * 2], d[n * 2 + 1], d[((n + 1) % 4) * 2], d[((n + 1) % 4) * 2 + 1], 5, 4);
    }
    g.stroke({ width: 1, color: HOLO, alpha: 0.4 });
  }

  function foundation(r, c, lead) {
    const g = new Graphics();
    drawFoundation(g, r, c, lead);
    return g;
  }

  function redrawFoundation(r, c) {
    const g = foundG.get(key(r, c));
    if (g) drawFoundation(g, r, c, pick(r, c).lead);
  }

  function place(r, c) {
    const kk = key(r, c);
    if (state.get(kk) === "building") return;
    if (blockSizeWith(r, c) > DISTRICT) { rejectFlash(r, c); return; }

    state.set(kk, "building");
    plate(r, c, false);
    const oldRoad = roadG.get(kk);
    if (oldRoad) { oldRoad.destroy({ children: true }); roadG.delete(kk); }
    clearPark(kk);

    for (let rr = 0; rr < GRID; rr++) for (let cc = 0; cc < GRID; cc++) {
      if (state.get(key(rr, cc)) === "ground" && touchesBuilding(rr, cc)) makeRoad(rr, cc);
    }
    for (const rk of roadG.keys()) {
      const [rr, cc] = rk.split(",").map(Number);
      drawRoad(rr, cc);
    }
    for (let rr = 0; rr < GRID; rr++) for (let cc = 0; cc < GRID; cc++) {
      if (state.get(key(rr, cc)) === "road" && !roadG.has(key(rr, cc))) drawRoad(rr, cc);
    }
    updateParks();
    retireStrandedTraffic();
    spawnTraffic();

    const [x, y] = pt(r, c);
    const node = new Container();
    node.zIndex = r + c + 0.5;
    world.addChild(node);
    builtG.set(kk, node);

    const choice = pick(r, c);
    if (!choice.park) {
      const f = foundation(r, c, choice.lead);
      f.zIndex = r + c + 0.05;
      world.addChild(f);
      foundG.set(kk, f);
      for (const [dr, dc] of Object.values(DIRS)) {      // neighbours lose their kerb towards us
        const nk = key(r + dr, c + dc);
        if (foundG.has(nk)) redrawFoundation(r + dr, c + dc);
      }
    }
    node.position.set(x, choice.park ? y : y - PLINTH);
    if (choice.park) {                                  // a park plot: no massing, just a garden
      const g = new Graphics();
      choice.park.draw(g);
      node.addChild(g);
      node.scale.set(0.2);
      const t0 = performance.now();
      const grow = () => {
        const t = Math.min(1, (performance.now() - t0) / 700);
        node.scale.set(0.2 + 0.8 * (1 - Math.pow(1 - t, 3)));
        node.alpha = t;
        if (t >= 1) app.ticker.remove(grow);
      };
      app.ticker.add(grow);
      return;
    }
    raise(node, choice, r, c);
  }

  // Projection → matter: the construction cage draws itself, a scan plane rises and the floors
  // materialise underneath it, then the cage fades and leaves the finished building.
  function raise(node, choice, r, c) {
    const cells = choice.def.build();
    const BANDS = 12;
    const { solid, glows, maxK, box } = buildFacade(cells, choice.variant, choice.win, r * 31 + c, BANDS);
    let si = 0, sj = 0;
    for (const [i, j] of cells) { si += i; sj += j; }
    const ox = -(si / cells.length - sj / cells.length) * CS;
    const oy = -(si / cells.length + sj / cells.length) * CS * 0.5;
    // A plot is one cell wide; a silhouette is not. Fit the massing to its plot so a tower does
    // not swallow the street it is supposed to stand on.
    const fit = Math.min(1, (TILE_W * 1.05) / Math.max(1, box.maxX - box.minX));
    const inner = new Container();
    inner.scale.set(fit);
    node.addChild(inner);
    for (let b = 0; b < BANDS; b++) {
      solid[b].position.set(ox, oy);
      glows[b].position.set(ox, oy);
      inner.addChild(solid[b], glows[b]);
    }

    const cage = new Graphics();
    const R = TILE_W * 0.48;
    const top = -(maxK + 2) * CS * fit;
    for (const lv of [0, top]) {
      cage.poly([0, lv - R * 0.5, R, lv, 0, lv + R * 0.5, -R, lv]);
    }
    cage.stroke({ width: 1, color: HOLO, alpha: 0.55 });
    for (const [dx, dy] of [[-R, 0], [R, 0], [0, -R * 0.5], [0, R * 0.5]]) {
      cage.moveTo(dx, dy).lineTo(dx, dy + top);
    }
    cage.stroke({ width: 1, color: HOLO, alpha: 0.4 });
    node.addChild(cage);

    const scan = new Graphics();
    scan.blendMode = "add";
    for (let n = 3; n >= 1; n--) {
      scan.poly([0, -R * 0.5 * n / 3, R * n / 3, 0, 0, R * 0.5 * n / 3, -R * n / 3, 0])
        .fill({ color: C1, alpha: 0.07 });
    }
    scan.poly([0, -R * 0.5, R, 0, 0, R * 0.5, -R, 0]).stroke({ width: 1.5, color: HOT, alpha: 0.9 });
    node.addChild(scan);

    const t0 = performance.now();
    const step = () => {
      const t = (performance.now() - t0) / BUILD_MS;
      cage.alpha = t < 0.2 ? Math.min(1, t / 0.2) : Math.max(0, 1 - (t - 0.55) / 0.45);
      for (let b = 0; b < BANDS; b++) {
        const local = Math.max(0, Math.min(1, (t - (0.16 + (b / BANDS) * 0.7)) / 0.13));
        solid[b].alpha = local;
        glows[b].alpha = local;
        solid[b].y = oy + (1 - local) * 6;
        glows[b].y = solid[b].y;
      }
      const rising = t > 0.12 && t < 0.95;
      scan.visible = rising;
      if (rising) {
        const f = Math.max(0, Math.min(1, (t - 0.12) / 0.74));
        scan.y = -f * (maxK + 1) * CS * fit;
        scan.alpha = 0.35 + 0.65 * Math.sin(f * Math.PI);
      }
      if (t >= 1) { app.ticker.remove(step); cage.destroy(); scan.destroy(); }
    };
    app.ticker.add(step);
  }

  /* ---- traffic ----------------------------------------------------------------------------- */

  const cars = [];
  const SPEED = 26;                                     // px per second along the lane

  function spawnTraffic() {
    const keys = [...roadG.keys()];
    const target = Math.min(5, Math.floor(keys.length / 8));
    while (cars.length < target) {
      const kk = keys[Math.floor(Math.random() * keys.length)];
      const [r, c] = kk.split(",").map(Number);
      const conn = connOf(r, c);
      const open = Object.keys(DIRS).filter((d) => conn[d]);
      if (!open.length) return;
      const to = open[Math.floor(Math.random() * open.length)];
      const spec = VEHICLES[Math.floor(Math.random() * VEHICLES.length)].spec;
      const g = new Graphics();
      vehicle(g, HEAD[to], { ...spec, alt: 3 });
      world.addChild(g);
      cars.push({ r, c, from: OPP[to], to, t: 0.5, spec, g, drawn: to });
    }
  }

  function retireStrandedTraffic() {
    for (let i = cars.length - 1; i >= 0; i--) {
      if (state.get(key(cars[i].r, cars[i].c)) !== "road") {
        cars[i].g.destroy();
        cars.splice(i, 1);
      }
    }
  }

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    for (const car of cars) {
      car.t += (SPEED * dt) / (TILE_W * 0.5);
      if (car.t >= 1) {                                 // hand over to the next cell
        const [dr, dc] = DIRS[car.to];
        car.r += dr; car.c += dc;
        car.from = OPP[car.to];
        const conn = connOf(car.r, car.c);
        const options = Object.keys(DIRS).filter((d) => conn[d] && d !== car.from);
        car.to = options.length ? options[Math.floor(Math.random() * options.length)] : car.from;
        car.t -= 1;
      }
      const heading = car.t < 0.5 ? OPP[car.from] : car.to;
      if (heading !== car.drawn) {
        vehicle(car.g.clear(), HEAD[heading], { ...car.spec, alt: 3 });
        car.drawn = heading;
      }
      // entry midpoint → centre → exit midpoint, offset to the right-hand lane
      const e = car.t < 0.5 ? EDGE[car.from] : EDGE[car.to];
      const s = car.t < 0.5 ? 1 - car.t * 2 : (car.t - 0.5) * 2;
      const lat = LANE * 0.5;
      const [ha, hb] = DIRS[heading];
      const [x, y] = pt(car.r + e[0] * s + hb * lat, car.c + e[1] * s - ha * lat);
      car.g.position.set(x, y);
      car.g.zIndex = car.r + car.c + 0.35;
    }
  });

  /* ---- reset ------------------------------------------------------------------------------- */

  document.getElementById("reset")?.addEventListener("click", () => window.location.reload());
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
