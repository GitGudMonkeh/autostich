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
import { TILE_W, TILE_H, CS, rng, dashLine, CITY_BUILDINGS } from "./buildings.js";
import { VARIANTS, WIN_SETS, FACADE_OPTS, buildFacade } from "./facadeRender.js";
import { PARKS } from "./parkRender.js";
import {
  pt, slab, wallA, wallB, LANE, roadCell, cellMarkings, crossing, junctionBox,
  lamp, signal, signPost, holoDisplay, kiosk, bollard, groundPanel,
} from "./streetRender.js";
import { vehicle, VEHICLES } from "./vehicles.js";
import {
  hazeStrip, skyline, drawBeacons, lightCone, wetSmear, pulseBand, shockRing,
  walkerDot, crowdCluster, ventPlume, flyerShadow, flyerLights,
  roofProps, roofBillboard, liftFace, liftCab, plazaTile,
} from "./cityFx.js";

const GRID = 12;
const DISTRICT = 6;             // how many buildings may stand directly adjacent as one district
const BUILD_MS = 2200;
const HOLO = 0xb06bff, HOT = 0xe8fbff, C1 = 0x35d6ff;
// A building does not float on the tile: it stands on a podium level with the street footway,
// which is why PLINTH is the kerb height from streetRender and not a free choice.
const PLINTH = 3;
const PLOT_TOP = 0x2b2648, PLOT_FACE = 0x1a1730, PLOT_JOINT = 0x3a3360;
// How often each type turns up. A city is mostly shops, sheds and housing with a few towers in
// it — an even draw over nine types gives a skyline of nine equal monuments and no street.
const MIX = {
  markt: 17, mall: 12, kapsel: 12, daten: 10, station: 8, konzern: 9,
  kragturm: 11, torbau: 10, drilling: 11,
};
// A district gets one colour and everything on it carries it: podium trim, kerb light, street
// furniture. That is what makes a district readable as a district and not as six houses.
const HUES = [0x35d6ff, 0xff8ad8, 0xffc478, 0x7cf7c4, 0xb06bff, 0xff6f91];

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
    // The extra offset leaves room above the back corner for the horizon.
    world.position.set(app.screen.width / 2, app.screen.height / 2 - (GRID * TILE_H) / 2 * s + 58 * s);
  };
  recentre();
  app.renderer.on("resize", recentre);

  const state = new Map();        // key -> "ground" | "road" | "building"
  const groundG = new Map();      // key -> Graphics (clickable plate)
  const roadG = new Map();        // key -> Container (surface + furniture)
  const parkG = new Map();        // key -> Graphics (pocket park)
  const builtG = new Map();       // key -> the finished building node
  const foundG = new Map();       // key -> the podium the building stands on
  const glowsG = new Map();       // key -> the building's additive window layers
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) state.set(key(r, c), "ground");

  /* ---- atmosphere -------------------------------------------------------------------------- */

  // Horizon first, then the grid, then one haze strip per depth. The strips sit between the
  // depth layers, so each of them veils only what stands further back.
  const sky = skyline(GRID, 20260831);
  sky.glow.zIndex = -102; sky.node.zIndex = -101; sky.beacons.zIndex = -100;
  world.addChild(sky.glow, sky.node, sky.beacons);
  for (let d = 0; d <= GRID * 2; d++) {
    const h = hazeStrip(d, GRID);
    if (!h) continue;
    h.zIndex = d + 0.72;
    world.addChild(h);
  }

  // The net pulse: every few seconds a scan runs down the grid and lights the hologrid seams.
  const pulse = new Graphics();
  pulse.blendMode = "add";
  pulse.visible = false;
  world.addChild(pulse);
  let pulseT = -3;

  /* ---- district colours ---------------------------------------------------------------------- */

  const districtCells = (r, c) => {
    const seen = new Set([key(r, c)]);
    const queue = [[r, c]];
    while (queue.length) {
      const [qr, qc] = queue.pop();
      for (const [dr, dc] of Object.values(DIRS)) {
        const nr = qr + dr, nc = qc + dc, nk = key(nr, nc);
        if (inGrid(nr, nc) && !seen.has(nk) && state.get(nk) === "building") {
          seen.add(nk); queue.push([nr, nc]);
        }
      }
    }
    return seen;
  };

  // The colour follows from the district's lowest cell, so it survives the district growing and
  // does not reshuffle every time a neighbour is added.
  function districtLead(r, c) {
    if (state.get(key(r, c)) !== "building") {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (inGrid(r + dr, c + dc) && state.get(key(r + dr, c + dc)) === "building") {
          return districtLead(r + dr, c + dc);
        }
      }
      return HUES[0];
    }
    const anchor = [...districtCells(r, c)].sort()[0];
    const [ar, ac] = anchor.split(",").map(Number);
    return HUES[Math.floor(rng((ar * 48611) ^ (ac * 96137))() * HUES.length)];
  }

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
  // `wet` is the reflection layer on the carriageway: every light above the road smears down it.
  function furnish(node, glow, wet, r, c, conn, lead) {
    const rand = rng((r * 73856093) ^ (c * 19349663) ^ 0x51ed27);
    const open = Object.values(conn).filter(Boolean).length;
    if (open >= 3) {
      junctionBox(node, glow, r, c, lead);
      for (const d of Object.keys(DIRS)) if (conn[d]) crossing(node, r, c, d, 0xe9e6ff);
      if (rand() < 0.75) {
        signal(node, glow, r + 0.44, c + 0.44, rand() < 0.5 ? 2 : 0);
        wetSmear(wet, r + 0.44, c + 0.3, 0x7cf7c4, 7, 6);
        crowdCluster(node, r + 0.42, c + 0.42, rand, lead);
      }
      return null;
    }
    const side = rand() < 0.5 ? 0.44 : -0.44;
    const roll = rand();
    if (roll < 0.3) {
      lamp(node, glow, r + side, c + side, 0x9fd8ff);
      lightCone(wet, r + side, c + side, 26, 0x9fd8ff, 0.42);
      wetSmear(wet, r + side, c + side * 0.2, 0x9fd8ff, 11, 7);
    } else if (roll < 0.44) {
      signPost(node, glow, r + side, c - side, 0xff8ad8, rand);
      wetSmear(wet, r + side, c - side * 0.3, 0xff8ad8, 9, 7);
    } else if (roll < 0.56) groundPanel(node, glow, r + side, c + side, 0x8ceaff);
    else if (roll < 0.64) bollard(node, r + side, c - side, 0x9fd8ff);
    else if (roll < 0.72 && touchesBuilding(r, c)) {
      kiosk(node, glow, r + side, c + side, 0xffc478);
      wetSmear(wet, r + side, c + side * 0.2, 0xffc478, 12, 6);
      crowdCluster(node, r + side * 0.4, c + side * 0.9, rand, 0xffc478);
    }
    if (rand() < 0.3) crowdCluster(node, r - side * 0.75, c + side * 0.8, rand, lead);
    if (rand() < 0.16) {
      // The display gets its own layers so one of them can stutter like a broken sign.
      const colour = rand() < 0.5 ? 0x8ceaff : 0xff8ad8;
      const sg = new Graphics(), sglow = new Graphics();
      sglow.blendMode = "add";
      holoDisplay(sg, sglow, r, c + 0.55, 30, 0.2, 13, colour, rand);
      node.addChild(sg, sglow);
      lightCone(wet, r, c + 0.55, 26, colour, 0.3);
      wetSmear(wet, r, c + 0.2, colour, 16, 9);
      return { g: sg, glow: sglow, broken: rand() < 0.35, phase: rand() * 6.28 };
    }
    return null;
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
    const wet = new Graphics();                         // reflections, between road and props
    wet.blendMode = "add";
    const glow = new Graphics();
    glow.blendMode = "add";
    const conn = connOf(r, c);
    const lead = districtLead(r, c);
    roadCell(surface, r, c, conn, lead);
    cellMarkings(surface, r, c, conn, 0xffc94a);
    const props = new Graphics();
    node.addChild(surface, wet, props, glow);
    const sign = furnish(props, glow, wet, r, c, conn, lead);
    if (sign?.broken) flickerSign(sign);
  }

  // A broken sign does not fade, it drops out and comes back — the stutter is the whole point.
  function flickerSign(sign) {
    const t0 = performance.now();
    const step = () => {
      if (sign.g.destroyed) { app.ticker.remove(step); return; }
      const t = (performance.now() - t0) / 1000 + sign.phase;
      const cycle = t % 4.2;
      const on = cycle > 0.9 || (cycle > 0.45 && cycle < 0.6);
      const a = on ? 1 : 0.06 + 0.25 * Math.abs(Math.sin(t * 40));
      sign.g.alpha = a;
      sign.glow.alpha = a;
    };
    app.ticker.add(step);
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
      // Half of the pockets become a plaza instead of a park: a second green tile would only
      // add more of the same noise, and the eye needs somewhere flat to rest.
      const rand = rng((r * 31) ^ (c * 17));
      const g = new Graphics();
      if (rand() < 0.5) {
        const glow = new Graphics();
        glow.blendMode = "add";
        plazaTile(g, glow, (r * 131) ^ c, districtLead(r, c));
        g.addChild(glow);
      } else {
        PARKS[Math.floor(rand() * PARKS.length)].draw(g);
      }
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

  // A district is measured in CELLS, not in buildings: a two-tile mall already fills a third of
  // one. Counted over the whole footprint at once, because the new block may join two districts.
  function districtSizeWith(cells) {
    const seen = new Set(cells.map(([r, c]) => key(r, c)));
    const queue = [...cells];
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
  // building, so a rebuilt city looks like the same city. `swap` mirrors the massing across the
  // lattice diagonal, which turns a 2 × 1 plot into a 1 × 2 one — without it every wide building
  // in the city would face the same way.
  function pick(r, c) {
    const rand = rng((r * 92837111) ^ (c * 689287499) ^ 0x2f6e2b1);
    const roll = rand();
    if (roll < 0.14) return { park: PARKS[Math.floor(rand() * PARKS.length)] };
    let pool = rand() * CITY_BUILDINGS.reduce((s, b) => s + (MIX[b.key] ?? 10), 0);
    const def = CITY_BUILDINGS.find((b) => (pool -= MIX[b.key] ?? 10) < 0) ?? CITY_BUILDINGS[0];
    return dressed(def, rand() < 0.5, rand);
  }

  const SMALL = CITY_BUILDINGS.filter((b) => b.plot[0] === 1 && b.plot[1] === 1);

  function dressed(def, swap, rand) {
    const variant = VARIANTS[Math.floor(rand() * VARIANTS.length)];
    const win = WIN_SETS[def.key];
    const [w, h] = def.plot;
    return {
      def, variant, win, swap,
      lead: win[0],
      opts: FACADE_OPTS[def.key] ?? {},
      plot: swap ? [h, w] : [w, h],
    };
  }

  // The cells a building would cover if it were anchored so that (r, c) is inside it. The offsets
  // are tried in a fixed order, so the same click always yields the same block.
  function footprint(r, c, choice) {
    const [w, h] = choice.plot;
    for (let dr = 0; dr < w; dr++) for (let dc = 0; dc < h; dc++) {
      const r0 = r - dr, c0 = c - dc;
      const cells = [];
      let ok = true;
      for (let a = 0; a < w && ok; a++) for (let b = 0; b < h && ok; b++) {
        const rr = r0 + a, cc = c0 + b;
        if (!inGrid(rr, cc) || state.get(key(rr, cc)) === "building") ok = false;
        else cells.push([rr, cc]);
      }
      if (ok) return cells;
    }
    return null;
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
    if (g) drawFoundation(g, r, c, districtLead(r, c));
  }

  /* ---- shockwave ------------------------------------------------------------------------------ */

  // A building landing is a power event: a ring runs across the plot and the neighbourhood's
  // windows brown out for a moment.
  function shockwave(r, c) {
    const g = new Graphics();
    g.blendMode = "add";
    const [x, y] = pt(r, c);
    g.position.set(x, y - PLINTH);
    g.zIndex = r + c + 0.9;              // over its own street, not under it
    world.addChild(g);
    const t0 = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / 720);
      shockRing(g, t);
      if (t >= 1) { app.ticker.remove(step); g.destroy(); }
    };
    app.ticker.add(step);

    for (const [nk, layers] of glowsG) {                // neighbours flicker
      const [nr, nc] = nk.split(",").map(Number);
      if (Math.abs(nr - r) > 2 || Math.abs(nc - c) > 2 || (nr === r && nc === c)) continue;
      const f0 = performance.now() + Math.hypot(nr - r, nc - c) * 45;
      const flick = () => {
        const e = performance.now() - f0;
        if (e < 0) return;
        if (e > 420 || layers.some((l) => l.destroyed)) {
          app.ticker.remove(flick);
          for (const l of layers) if (!l.destroyed) l.alpha = 1;
          return;
        }
        const a = e < 90 ? 0.25 : e < 150 ? 1 : e < 220 ? 0.4 : 1;
        for (const l of layers) l.alpha = a;
      };
      app.ticker.add(flick);
    }
  }

  function place(r, c) {
    if (state.get(key(r, c)) === "building") return;

    // The type decides how much ground it needs. If its plot does not fit here, the plot falls
    // back to a single tile rather than refusing the click — a full district would otherwise be
    // unbuildable the moment one large type came up.
    let choice = pick(r, c);
    let cells = choice.park ? [[r, c]] : footprint(r, c, choice);
    if (!cells || districtSizeWith(cells) > DISTRICT) {
      const rand = rng((r * 40499) ^ (c * 86969) ^ 0x51a3);
      choice = choice.park ? choice : dressed(SMALL[Math.floor(rand() * SMALL.length)], rand() < 0.5, rand);
      cells = [[r, c]];
      if (districtSizeWith(cells) > DISTRICT) { rejectFlash(r, c); return; }
    }

    for (const [rr, cc] of cells) {
      const ck = key(rr, cc);
      state.set(ck, "building");
      plate(rr, cc, false);
      const oldRoad = roadG.get(ck);
      if (oldRoad) { oldRoad.destroy({ children: true }); roadG.delete(ck); }
      clearPark(ck);
    }

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
    retireStrandedWalkers();
    spawnWalkers();
    updateVents();

    // The building sits on the centre of its whole plot and sorts by its NEAREST corner, so it is
    // drawn after everything it stands in front of.
    const rs = cells.map(([rr]) => rr), cs = cells.map(([, cc]) => cc);
    const r0 = Math.min(...rs), r1 = Math.max(...rs), c0 = Math.min(...cs), c1 = Math.max(...cs);
    const [x, y] = pt((r0 + r1) / 2, (c0 + c1) / 2);
    const kk = key(r0, c0);
    const node = new Container();
    node.zIndex = r1 + c1 + 0.5;
    world.addChild(node);
    builtG.set(kk, node);

    if (!choice.park) {
      for (const [rr, cc] of cells) {                    // one podium slab per tile, they merge
        const f = foundation(rr, cc, districtLead(rr, cc));
        f.zIndex = rr + cc + 0.05;
        world.addChild(f);
        foundG.set(key(rr, cc), f);
      }
      // The whole district is redrawn: the neighbours lose their kerb towards the new plot, and
      // a grown district may have moved its anchor and therefore its colour.
      for (const dk of districtCells(cells[0][0], cells[0][1])) {
        const [dr, dc] = dk.split(",").map(Number);
        redrawFoundation(dr, dc);
      }
    }
    for (const [rr, cc] of cells) shockwave(rr, cc);
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
    raise(node, choice, kk, r1 - r0 + 1, c1 - c0 + 1);
  }

  // Projection → matter: the construction cage draws itself, a scan plane rises and the floors
  // materialise underneath it, then the cage fades and leaves the finished building.
  function raise(node, choice, kk, plotW, plotH) {
    // `swap` mirrors the lattice across its diagonal, which turns a building that runs along the
    // a-axis into one that runs along b. It is a mirror, not a rotation — for these masses that
    // reads as the same building seen from the other side, and it is what keeps the wide types
    // from all lying the same way.
    const cells = choice.def.build().map(([i, j, k]) => (choice.swap ? [j, i, k] : [i, j, k]));
    const [ar, ac] = kk.split(",").map(Number);
    const BANDS = 12;
    const { solid, glows, minK, maxK } =
      buildFacade(cells, choice.variant, choice.win, ar * 31 + ac, BANDS, choice.opts);

    // Scale and centring come from the GROUND floor, not from the whole silhouette: the ground
    // floor is what has to match the plot, and the upper floors are meant to overhang it.
    const ground = cells.filter(([, , k]) => k === minK);
    const gi0 = Math.min(...ground.map(([i]) => i)), gi1 = Math.max(...ground.map(([i]) => i));
    const gj0 = Math.min(...ground.map(([, j]) => j)), gj1 = Math.max(...ground.map(([, j]) => j));
    const ci = (gi0 + gi1) / 2, cj = (gj0 + gj1) / 2;
    const ox = -(ci - cj) * CS;
    const oy = -(ci + cj) * CS * 0.5;
    const groundW = ((gi1 - gj0) - (gi0 - gj1) + 1) * CS;
    const fit = Math.min(1, ((plotW + plotH) * (TILE_W / 2) * 1.04) / Math.max(1, groundW));
    const inner = new Container();
    inner.scale.set(fit);
    node.addChild(inner);
    for (let b = 0; b < BANDS; b++) {
      solid[b].position.set(ox, oy);
      glows[b].position.set(ox, oy);
      inner.addChild(solid[b], glows[b]);
    }
    glowsG.set(kk, glows);

    // Roof life and the lift. Both belong to the top band, so they appear with the last floor
    // rather than standing finished over a half-built tower.
    const seed = ar * 31 + ac;
    const crown = new Graphics();
    const crownGlow = new Graphics();
    crownGlow.blendMode = "add";
    crown.position.set(ox, oy);
    crownGlow.position.set(ox, oy);
    if (!roofProps(crown, cells, maxK, seed)) {
      roofBillboard(crown, crownGlow, cells, maxK, seed, choice.lead);
    }
    inner.addChild(crown, crownGlow);
    crown.alpha = 0; crownGlow.alpha = 0;

    const face = liftFace(cells);
    const lift = new Graphics();
    lift.blendMode = "add";
    lift.position.set(ox, oy);
    const hasLift = rng(seed * 7717 + 3)() < 0.55 && face && face.maxK - face.minK > 3;
    if (hasLift) inner.addChild(lift);

    const cage = new Graphics();
    const R = (plotW + plotH) * (TILE_W / 4) * 0.96;
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
      crown.alpha = crownGlow.alpha = Math.max(0, Math.min(1, (t - 0.86) / 0.16));
      if (t >= 1) { app.ticker.remove(step); cage.destroy(); scan.destroy(); }
    };
    app.ticker.add(step);

    if (hasLift) {
      const t0lift = performance.now() + 900;
      const ride = () => {
        if (lift.destroyed) { app.ticker.remove(ride); return; }
        const e = (performance.now() - t0lift) / 5200;
        if (e < 0) return;
        const f = e % 1;
        const up = f < 0.5 ? f * 2 : 1 - (f - 0.5) * 2;   // up, then back down
        liftCab(lift, face, face.minK + up * (face.maxK - face.minK), choice.win[1]);
        lift.alpha = Math.min(1, Math.max(0, 1 - Math.abs(up - 0.5) * 0.4));
      };
      app.ticker.add(ride);
    }
  }

  /* ---- traffic ----------------------------------------------------------------------------- */

  const cars = [];
  const SPEED = 26;                                     // px per second along the lane

  function spawnTraffic() {
    const keys = [...roadG.keys()];
    const target = Math.min(10, Math.floor(keys.length / 4));
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

  /* ---- pedestrians --------------------------------------------------------------------------- */

  // Walkers use the same derived road graph as the traffic, just on the footway and slower.
  const walkers = [];
  const WALK = 12;

  function spawnWalkers() {
    const keys = [...roadG.keys()];
    const target = Math.min(30, Math.floor(keys.length / 1.3));
    let guard = 40;
    while (walkers.length < target && guard-- > 0) {
      const kk = keys[Math.floor(Math.random() * keys.length)];
      const [r, c] = kk.split(",").map(Number);
      const conn = connOf(r, c);
      const open = Object.keys(DIRS).filter((d) => conn[d]);
      if (!open.length) continue;
      const to = open[Math.floor(Math.random() * open.length)];
      const g = new Graphics();
      const colour = [0xffd8a0, 0x9fd8ff, 0xff9fe0][Math.floor(Math.random() * 3)];
      walkerDot(g, colour);
      world.addChild(g);
      walkers.push({ r, c, from: OPP[to], to, t: Math.random(), g,
        side: Math.random() < 0.5 ? 1 : -1, speed: 8 + Math.random() * 9 });
    }
  }

  function retireStrandedWalkers() {
    for (let i = walkers.length - 1; i >= 0; i--) {
      if (state.get(key(walkers[i].r, walkers[i].c)) !== "road") {
        walkers[i].g.destroy();
        walkers.splice(i, 1);
      }
    }
  }

  /* ---- street vents ---------------------------------------------------------------------------- */

  // Steam off the grates. Deterministic per cell, so the same street always breathes in the same
  // places, and retired as soon as the cell stops being a street.
  const vents = [];

  function updateVents() {
    for (let i = vents.length - 1; i >= 0; i--) {
      if (state.get(key(vents[i].r, vents[i].c)) !== "road") {
        vents[i].g.destroy();
        vents.splice(i, 1);
      }
    }
    for (const kk of roadG.keys()) {
      if (vents.some((v) => key(v.r, v.c) === kk)) continue;
      const [r, c] = kk.split(",").map(Number);
      const rand = rng((r * 26699) ^ (c * 55291) ^ 0x7f4a);
      if (rand() > 0.22) continue;
      const g = new Graphics();
      g.blendMode = "add";
      g.zIndex = r + c + 0.3;
      world.addChild(g);
      const side = rand() < 0.5 ? 0.3 : -0.3;
      vents.push({ r, c, g, a: r + side, b: c - side * 0.6, phase: rand() * 8 });
    }
  }

  /* ---- air traffic ----------------------------------------------------------------------------- */

  const flyers = [];
  let nextFlyer = 0;

  function spawnFlyer() {
    if (!roadG.size || flyers.length >= 2) return;
    const dir = Object.keys(DIRS)[Math.floor(Math.random() * 4)];
    const [da, db] = DIRS[dir];
    const lane = Math.random() * GRID;
    const a = da ? (da > 0 ? -3 : GRID + 3) : lane;
    const b = db ? (db > 0 ? -3 : GRID + 3) : lane;
    const spec = VEHICLES[Math.floor(Math.random() * VEHICLES.length)].spec;
    const g = new Graphics();
    vehicle(g, HEAD[dir], { ...spec, alt: 0 });
    const lights = new Graphics();
    lights.blendMode = "add";
    const shadow = new Graphics();
    flyerShadow(shadow);
    world.addChild(shadow, g, lights);
    flyers.push({ a, b, dir, g, lights, shadow, alt: 120 + Math.random() * 70, colour: spec.lead ?? 0x8ceaff });
  }

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    const now = performance.now() / 1000;

    for (const w of walkers) {                          // pedestrians
      w.t += ((w.speed ?? WALK) * dt) / (TILE_W * 0.5);
      if (w.t >= 1) {
        const [dr, dc] = DIRS[w.to];
        w.r += dr; w.c += dc;
        w.from = OPP[w.to];
        const conn = connOf(w.r, w.c);
        const options = Object.keys(DIRS).filter((d) => conn[d] && d !== w.from);
        w.to = options.length ? options[Math.floor(Math.random() * options.length)] : w.from;
        w.t -= 1;
      }
      const heading = w.t < 0.5 ? OPP[w.from] : w.to;
      const e = w.t < 0.5 ? EDGE[w.from] : EDGE[w.to];
      const s = w.t < 0.5 ? 1 - w.t * 2 : (w.t - 0.5) * 2;
      const lat = (LANE + 0.11) * w.side;
      const [ha, hb] = DIRS[heading];
      const [x, y] = pt(w.r + e[0] * s + hb * lat, w.c + e[1] * s - ha * lat, PLINTH);
      w.g.position.set(x, y);
      w.g.zIndex = w.r + w.c + 0.34;
    }

    if (now > nextFlyer) { spawnFlyer(); nextFlyer = now + 6 + Math.random() * 10; }
    for (let i = flyers.length - 1; i >= 0; i--) {       // air traffic
      const f = flyers[i];
      const [da, db] = DIRS[f.dir];
      f.a += da * dt * 1.15; f.b += db * dt * 1.15;
      if (f.a < -5 || f.a > GRID + 5 || f.b < -5 || f.b > GRID + 5) {
        f.g.destroy(); f.lights.destroy(); f.shadow.destroy();
        flyers.splice(i, 1);
        continue;
      }
      const [x, y] = pt(f.a, f.b, f.alt);
      f.g.position.set(x, y);
      f.lights.position.set(x, y);
      flyerLights(f.lights, now, f.colour);
      const [sx, sy] = pt(f.a, f.b, 0);
      f.shadow.position.set(sx, sy);
      f.g.zIndex = f.a + f.b + 0.8;
      f.lights.zIndex = f.a + f.b + 0.81;
      f.shadow.zIndex = f.a + f.b + 0.03;
    }

    for (const v of vents) {                             // steam off the grates
      const [vx, vy] = pt(v.a, v.b, 0);
      ventPlume(v.g, vx, vy, now + v.phase, 0xbfd4ff);
    }

    drawBeacons(sky.beacons, sky.masts, now);            // horizon

    pulseT += dt;                                        // the net pulse
    const span = GRID * 2 + 3;
    if (pulseT > 0 && pulseT < 2.6) {
      const d = -1.5 + (pulseT / 2.6) * span;
      // The band is cut to the grid's own width at that depth, so it stays inside the plate
      // instead of drawing a stray line across the whole page.
      pulseBand(pulse, (Math.min(d, 2 * (GRID - 1) - d, GRID - 1) + 1) * (TILE_W / 2), C1);
      pulse.visible = true;
      pulse.y = d * (TILE_H / 2);
      pulse.zIndex = d + 0.74;
      pulse.alpha = Math.sin((pulseT / 2.6) * Math.PI) * 0.9;
    } else {
      pulse.visible = false;
      if (pulseT >= 2.6) pulseT = -7.5;
    }
  });

  /* ---- reset ------------------------------------------------------------------------------- */

  document.getElementById("reset")?.addEventListener("click", () => window.location.reload());
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
