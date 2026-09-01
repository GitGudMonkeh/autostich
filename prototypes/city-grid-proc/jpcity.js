// The building system, in the reference language, on the water.
// Deliberately OUTSIDE src/: design exploration.
//
// Same rules as the first interactive city, different assets and a different ground:
//
//   · You build ON THE WATER, starting from nothing. Every plot raises its own cliff out of the
//     sea, and the coastline is the outline of whatever you have built — so it changes shape with
//     every plot, and it is drawn from that outline rather than face by face.
//   · Click a free tile to build. Up to FOUR buildings may stand directly adjacent and form a
//     district; the fifth is refused with a red flash.
//   · Streets are derived, never placed: every free tile touching a building becomes road, and
//     each road tile draws itself from its four connections, so junctions, bends and dead ends
//     appear on their own.
//   · Every building stands on a foundation level with the footway, and where two plots touch,
//     the kerb between them drops and the podiums merge into one base.
//
// Nothing is drawn here that was not designed in a mockup first: the buildings come from
// jpBuildings.js, their parts from jpRender.js and refRender.js, the water from waterRender.js,
// and the coast is variant U4 of the edge study (jpedge.js) — cliff, shallows, surf. This file is
// the RULES, not the art.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { CS, P, rng, dashLine } from "./buildings.js";
import { PAL, captureLights } from "./refRender.js";
import { JP_BUILDINGS, TILE } from "./jpBuildings.js";
import { SEA, sea, ripples, farRipples, rings, rain, smear, passingBoat } from "./waterRender.js";

const GRID = 11;
const DISTRICT = 4;               // how many buildings may stand adjacent as one district
// Heights, in lattice units above the water plane. The deck is high because the face below it is a
// CLIFF: the visible height of that face is exactly the height of the deck, so a low deck can only
// ever be a kerb. The footway is the extra step a building plot stands on.
const DECK = 4.6;
const WALK = 0.34;
const DROP = 0.42;                // how far the talus reaches below the waterline
const ROCK = { lit: 0x5d5578, deep: 0x140f20, wet: 0x0e0b18, block: 0x2a2540 };
const SHALLOW = 0x4d7fa8;
const ROAD = { asphalt: 0x0f0e19, walk: 0x2a2743, kerb: 0x1b192c, edge: 0x9aa6d8, line: 0xe8ecff };
const HOVER = 0x61dfff, REJECT = 0xff3d5a;

// How often each type turns up. A street is mostly small stuff: the screen house and the sign
// tower are events, not the norm, and the service tower has to be common enough to stay dark.
const MIX = {
  imbiss: 16, gasse: 14, ladenzeile: 14, spielhalle: 11, technikturm: 11,
  wohnturm: 10, kapselturm: 9, torhof: 7, schilderturm: 5, bildschirm: 3,
};


// Where the rock meets the sea, in lattice height, as a function of the WORLD position along the
// coast. A coast that meets the water in a straight line is a wall, not a shore — and because the
// wobble is a function of (i, j) rather than of the tile, two perpendicular faces agree at the
// corner they share and the coastline runs on unbroken from tile to tile.
const coastK = (i, j) => -0.12
  + Math.sin(i * 0.62 + j * 0.29) * 0.34
  + Math.sin(j * 1.13 - i * 0.41 + 1.7) * 0.22
  + Math.sin((i + j) * 2.7) * 0.09;

const mixHex = (a, b, f) => {
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - f) + ((b >> s) & 255) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
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
  const ventG = new Graphics();
  ventG.blendMode = "add";
  ventG.zIndex = 800;
  const boatG = new Graphics();
  const boatGlow = new Graphics();
  boatGlow.blendMode = "add";
  boatG.zIndex = -196; boatGlow.zIndex = -195;
  const rainG = new Graphics();
  rainG.zIndex = 900;
  world.addChild(water, rippleG, ringG, reflectG, boatG, boatGlow, ventG, rainG);

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

  /* ---- the coast --------------------------------------------------------------------------------- */

  // The coast is drawn from the island's OUTLINE, not face by face. Per-tile faces meet at hard
  // right angles, and every corner the builder can produce — an outer corner, an inner notch, a
  // one-tile spit, a diagonal pinch between two districts — would then be its own special case.
  // Chained into loops there are no cases at all: the same strip of rock runs round whatever was
  // built, and a corner is just a place where it turns.
  //
  // Orientation is fixed so that the four sides of a single tile chain head-to-tail into a loop;
  // adjacent tiles then merge into one loop on their own.
  function coastLoops() {
    const segs = new Map();                       // start point -> segments leaving it
    const push = (a, b, out) => {
      const k = `${a[0]},${a[1]}`;
      if (!segs.has(k)) segs.set(k, []);
      segs.get(k).push({ a, b, out });
    };
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (state.get(key(r, c)) === "water") continue;
      const wet = (dr, dc) => !inGrid(r + dr, c + dc) || state.get(key(r + dr, c + dc)) === "water";
      if (wet(1, 0)) push([hi(r), lo(c)], [hi(r), hi(c)], [1, 0]);
      if (wet(0, 1)) push([hi(r), hi(c)], [lo(r), hi(c)], [0, 1]);
      if (wet(-1, 0)) push([lo(r), hi(c)], [lo(r), lo(c)], [-1, 0]);
      if (wet(0, -1)) push([lo(r), lo(c)], [hi(r), lo(c)], [0, -1]);
    }
    const loops = [];
    let left = 0;
    for (const list of segs.values()) left += list.length;
    while (left) {
      let startKey = null;
      for (const [k, list] of segs) if (list.length) { startKey = k; break; }
      const loop = [];
      let k = startKey;
      // A diagonal pinch has two segments leaving the same point; taking them one at a time is
      // what keeps the two shores of the pinch separate instead of welding them together.
      while (segs.has(k) && segs.get(k).length) {
        const s = segs.get(k).pop();
        left--;
        loop.push(s);
        k = `${s.b[0]},${s.b[1]}`;
      }
      if (loop.length >= 3) loops.push(loop);
    }
    return loops;
  }

  // How far the rock leans out from under the deck at the waterline. Varying it along the coast is
  // what turns a vertical extrusion into a mass: a cliff is wider at its foot than at its lip.
  const bulge = (i, j) => 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(i * 0.47 + j * 0.29 + 2.1))
    + 0.25 * (0.5 + 0.5 * Math.sin(j * 0.83 - i * 0.61));

  // One sample of the coast: where the rock leaves the deck, where it enters the water, and which
  // way it faces. A face is only visible when its outward normal points towards the viewer, which
  // in this projection is simply i + j > 0.
  const sample = (i, j, n) => {
    const b = bulge(i, j);
    const bi = i + n[0] * b, bj = j + n[1] * b;
    return { i, j, bi, bj, k: coastK(bi, bj), n, vis: n[0] + n[1] > 0.01 };
  };

  const SAMPLES = 4, CORNER_ARC = 3;

  // Walk one loop into a list of samples: along each edge, then round each corner. Rounding the
  // corner is the whole point — the top stays the square edge the deck sits on, while the foot
  // swings round it on an arc, so the rock twists round the corner instead of meeting itself in a
  // vertical crease.
  function loopSamples(loop) {
    const out = [];
    for (let m = 0; m < loop.length; m++) {
      const s = loop[m], next = loop[(m + 1) % loop.length];
      for (let n = 0; n < SAMPLES; n++) {
        const f = n / SAMPLES;
        out.push(sample(s.a[0] + (s.b[0] - s.a[0]) * f, s.a[1] + (s.b[1] - s.a[1]) * f, s.out));
      }
      if (next.out[0] === s.out[0] && next.out[1] === s.out[1]) continue;   // straight on
      for (let n = 0; n <= CORNER_ARC; n++) {
        const f = n / CORNER_ARC;
        const ni = s.out[0] + (next.out[0] - s.out[0]) * f;
        const nj = s.out[1] + (next.out[1] - s.out[1]) * f;
        const len = Math.hypot(ni, nj) || 1;
        out.push(sample(s.b[0], s.b[1], [ni / len, nj / len]));
      }
    }
    return out;
  }

  const cliffG = new Graphics();
  const cliffGlow = new Graphics();
  cliffGlow.blendMode = "add";
  const coastG = new Graphics();          // the shallows
  const surfG = new Graphics();
  // All four live between the sea and the city: the rock hangs BELOW every tile it belongs to, so
  // one layer under the whole city sorts correctly and no tile can ever cover the wrong piece.
  coastG.zIndex = -198.5;
  cliffG.zIndex = -196.6;
  cliffGlow.zIndex = -196.5;
  surfG.zIndex = -196.4;
  world.addChild(coastG, cliffG, cliffGlow, surfG);

  let coast = [];                          // the sampled loops, kept for the foam
  const BANDS = 5, RINGS = 5, REACH = 2.6;

  function drawCoast() {
    coast = coastLoops().map(loopSamples);
    cliffG.clear();
    cliffGlow.clear();
    coastG.clear();
    const rand = rng(0x2c17);
    for (const pts of coast) {
      const at = (s, f) => P(s.i + (s.bi - s.i) * f, s.j + (s.bj - s.j) * f, DECK + (s.k - DECK) * f);
      for (let n = 0; n < pts.length; n++) {
        const a = pts[n], b = pts[(n + 1) % pts.length];
        // The shallows go all the way round: the far side has no visible rock, but it does have
        // water, and a halo on two sides only reads as a cut-out.
        for (let ring = RINGS; ring >= 1; ring--) {
          const d = REACH * (ring / RINGS);
          coastG.poly([
            ...P(a.bi, a.bj, a.k), ...P(b.bi, b.bj, b.k),
            ...P(b.bi + b.n[0] * d, b.bj + b.n[1] * d, b.k - 0.05),
            ...P(a.bi + a.n[0] * d, a.bj + a.n[1] * d, a.k - 0.05)])
            .fill({ color: SHALLOW, alpha: 0.045 });
        }
        if (!a.vis || !b.vis) continue;
        for (let band = 0; band < BANDS; band++) {
          const f0 = band / BANDS, f1 = (band + 1) / BANDS;
          cliffG.poly([...at(a, f0), ...at(b, f0), ...at(b, f1), ...at(a, f1)])
            .fill(mixHex(ROCK.lit, ROCK.deep, Math.pow(f0, 0.62)));
        }
        // A line at every band boundary. Without them the face is a smooth wall: the strata are
        // what make it read as rock rather than as a taller version of the old quay.
        for (let band = 1; band < BANDS; band++) {
          const f = band / BANDS;
          cliffG.moveTo(...at(a, f)).lineTo(...at(b, f))
            .stroke({ width: 1, color: ROCK.deep, alpha: 0.4 });
        }
        cliffG.poly([...at(a, 0.86), ...at(b, 0.86), ...at(b, 1), ...at(a, 1)])
          .fill({ color: ROCK.wet, alpha: 0.5 });          // the strip the sea keeps washing
        cliffG.moveTo(...P(a.bi, a.bj, a.k)).lineTo(...P(b.bi, b.bj, b.k))
          .stroke({ width: 1.5, color: SEA.foam, alpha: 0.4 });
        for (let s = 1; s <= 4; s++) {                      // the shadow the mass throws down
          const [ax, ay] = P(a.bi, a.bj, a.k), [bx, by] = P(b.bi, b.bj, b.k);
          cliffG.moveTo(ax, ay + s * 2.4).lineTo(bx, by + s * 2.4)
            .stroke({ width: 2.2, color: 0x05050c, alpha: 0.15 * (1 - s / 5) });
        }
        if (rand() < 0.35) {                                // blocks fallen at the foot
          const [x, y] = P(a.bi + a.n[0] * (0.2 + rand() * 0.5),
            a.bj + a.n[1] * (0.2 + rand() * 0.5), a.k - rand() * DROP);
          const sz = 2.5 + rand() * 5;
          cliffG.poly([x, y - sz * 0.6, x + sz, y, x, y + sz * 0.6, x - sz, y])
            .fill({ color: rand() < 0.5 ? ROCK.block : ROCK.wet, alpha: 0.95 });
        }
        if (rand() < 0.16) {                                // a neon strip along the cliff lip
          const hue = rand() < 0.5 ? PAL.pink : PAL.cyan;
          cliffG.moveTo(...P(a.i, a.j, DECK - 0.12)).lineTo(...P(b.i, b.j, DECK - 0.12))
            .stroke({ width: 1.8, color: hue, alpha: 0.85 });
          cliffGlow.moveTo(...P(a.i, a.j, DECK - 0.12)).lineTo(...P(b.i, b.j, DECK - 0.12))
            .stroke({ width: 7, color: hue, alpha: 0.15 });
        }
      }
    }
  }

  // Surf: a broken bright line riding the waterline, all the way round.
  function drawSurf(t) {
    surfG.clear();
    for (const pts of coast) {
      for (const s of pts) {
        const ph = s.bi * 1.7 + s.bj * 2.3;
        const a = 0.12 + 0.4 * Math.pow(Math.max(0, Math.sin(t * 1.1 + ph)), 2);
        const [x, y] = P(s.bi, s.bj, s.k + Math.sin(t * 1.3 + ph) * 0.05);
        const w = 7 + ((Math.round(ph * 7) % 13) + 13) % 13;
        surfG.rect(x - w / 2, y - 1, w, 2.2).fill({ color: SEA.foam, alpha: a });
        surfG.rect(x - w * 0.7, y + 2, w * 1.4, 1.4).fill({ color: SEA.foam, alpha: a * 0.3 });
      }
    }
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
    // A lamp where streets actually cross — and not on every one of those either. In a derived
    // network most tiles have three road neighbours, so "a lamp at every junction" put a pole on
    // nearly every tile and the deck read as a forest. Nothing is placed by hand: the bigger the
    // city, the more crossings it has, so the neon still grows with it.
    const open = DIRS.filter(([dr, dc]) => roadAt(dr, dc)).length;
    if (open === 4 && rng((r * 2749) ^ (c * 9721) ^ 0x1a7)() < 0.55) {
      const [lx, ly] = P(hi(r) - 0.6, hi(c) - 0.6, DECK);
      g.moveTo(lx, ly).lineTo(lx, ly - 2.6 * CS).stroke({ width: 1.3, color: PAL.steel, alpha: 0.75 });
      g.circle(lx, ly - 2.6 * CS, 1.9).fill({ color: PAL.white, alpha: 0.95 });
      glow.circle(lx, ly - 2.6 * CS, 6.5).fill({ color: PAL.white, alpha: 0.16 });
      for (let n = 5; n >= 1; n--) {
        glow.ellipse(lx, ly, 2.6 * CS * (n / 5), 1.3 * CS * (n / 5)).fill({ color: PAL.white, alpha: 0.035 });
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
    const kerb = (dr, dc) => {
      const nk = key(r + dr, c + dc);
      if (inGrid(r + dr, c + dc) && state.get(nk) === "building") return;   // podiums merge
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
    updateVents();
    drawCoast();
    drawHarbour();
    updateBoats();

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
    // The reflection is made of the building's OWN lights: every lit window and every sign reports
    // where it is while it draws, so what lies on the water is this facade and not an average of it.
    const sources = captureLights(() => def.draw(body, glow));
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
    // Only the strongest survive: a facade has dozens of windows and the water cannot carry them
    // all without turning into a stripe pattern. Signs outrank windows because they outshine them.
    const picked = sources
      .map((s) => ({ ...s, x: s.x - bx + ox, y: s.y - by + oy }))
      .sort((a, b) => b.strength * b.w - a.strength * a.w)
      .slice(0, 12);
    // `colour` is the building's lead hue — what the district trim and the road pools ask for.
    // The reflection uses `sources` instead, which is the real light rather than an average.
    lit.set(id, { sources: picked, colour: def.hue, r: r1, c: c1 });

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
    if (n > 2) return null;                        // only what stands at the edge reaches the water
    const i = hi(r + n), j = hi(c + n);
    const [x, y] = P(i, j, coastK(i, j));
    return [x, y + 3, 1 - n * 0.32];
  }

  /* ---- the harbour ------------------------------------------------------------------------------- */

  // One small harbour, on the nearest stretch of open shore: a deck on posts out over the water,
  // two lamps, bollards and moored boats. It is chosen, never placed — the shore moves as the city
  // grows, so the harbour moves with it.
  const harbourG = new Graphics();
  const harbourGlow = new Graphics();
  harbourGlow.blendMode = "add";
  world.addChild(harbourG, harbourGlow);
  let harbour = null;

  function pickHarbour() {
    let best = null;
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (state.get(key(r, c)) === "water") continue;
      if (inGrid(r + 1, c) && state.get(key(r + 1, c)) !== "water") continue;
      if (!best || r + c > best[0] + best[1]) best = [r, c];
    }
    return best;
  }

  function drawHarbour() {
    const spot = pickHarbour();
    harbourG.clear();
    harbourGlow.clear();
    harbour = spot;
    if (!spot) return;
    const [r, c] = spot;
    harbourG.zIndex = harbourGlow.zIndex = r + c + 0.34;
    const i0 = hi(r), i1 = hi(r) + 3.4;
    const j0 = lo(c) + 0.9, j1 = hi(c) - 0.9;
    for (let s = 0; s <= 1.001; s += 0.25) {                    // posts down into the water
      const pi = i0 + (i1 - i0) * s;
      for (const pj of [j0 + 0.2, j1 - 0.2]) {
        harbourG.moveTo(...P(pi, pj, DECK)).lineTo(...P(pi, pj, -DROP))
          .stroke({ width: 2, color: 0x14121f, alpha: 0.9 });
      }
    }
    harbourG.poly([...P(i1, j0, DECK), ...P(i1, j1, DECK),
      ...P(i1, j1, DECK - 0.28), ...P(i1, j0, DECK - 0.28)]).fill(0x1b192c);
    harbourG.poly([...P(i0, j1, DECK), ...P(i1, j1, DECK),
      ...P(i1, j1, DECK - 0.28), ...P(i0, j1, DECK - 0.28)]).fill(0x141222);
    harbourG.poly([...P(i0, j0, DECK), ...P(i1, j0, DECK), ...P(i1, j1, DECK), ...P(i0, j1, DECK)])
      .fill(ROAD.walk);
    harbourG.poly([...P(i0, j0, DECK), ...P(i1, j0, DECK), ...P(i1, j1, DECK), ...P(i0, j1, DECK)])
      .stroke({ width: 1, color: SEA.quayEdge, alpha: 0.35 });
    for (const [pi, pj] of [[i1 - 0.4, j0 + 0.3], [i0 + 1.1, j1 - 0.3]]) {   // two lamps
      const [x, y] = P(pi, pj, DECK);
      harbourG.moveTo(x, y).lineTo(x, y - 2.2 * CS).stroke({ width: 1.2, color: PAL.steel, alpha: 0.75 });
      harbourG.circle(x, y - 2.2 * CS, 1.8).fill({ color: PAL.white, alpha: 0.95 });
      harbourGlow.circle(x, y - 2.2 * CS, 6).fill({ color: PAL.white, alpha: 0.18 });
      for (let n = 4; n >= 1; n--) {
        harbourGlow.ellipse(x, y, 2 * CS * (n / 4), CS * (n / 4)).fill({ color: PAL.white, alpha: 0.04 });
      }
    }
    for (let s = 0.2; s < 1; s += 0.3) {                        // bollards along the deck
      const [x, y] = P(i0 + (i1 - i0) * s, j0 + 0.25, DECK);
      harbourG.rect(x - 1.4, y - 3.4, 2.8, 3.4).fill(0x241f38);
      harbourG.ellipse(x, y - 3.6, 2.1, 1).fill(0x2f2a45);
    }
  }

  /* ---- life ---------------------------------------------------------------------------------- */

  // Everything that moves gets its OWN node, because it also has to sort: a car two tiles further
  // back belongs behind the tower in front of it, and one shared layer would put it on top.
  const agents = [];
  let carBudget = 0, walkBudget = 0;

  function agent(kind) {
    const node = new Container();
    const g = new Graphics();
    const glow = new Graphics();
    glow.blendMode = "add";
    node.addChild(g, glow);
    world.addChild(node);
    const a = { kind, node, g, glow, slot: agents.filter((x) => x.kind === kind).length,
      path: null, u: 0, speed: 0, lane: 0, hue: PAL.cyan, seed: 0 };
    respawn(a);
    agents.push(a);
    return a;
  }

  // A vehicle drives a ROUTE through the street graph, turning at junctions, not one tile and not
  // one straight run. Both earlier versions respawned within a second or two — in a derived
  // network most tiles are the end of something — and the streets read as flickering rather than
  // as traffic. A route of up to sixteen tiles at half a tile per second is a journey of half a
  // minute, which is what "driving" looks like.
  const PATH_MAX = 16;

  function route(startAt) {
    const path = [startAt];
    let prev = null;
    for (let n = 0; n < PATH_MAX; n++) {
      const [r, c] = path[path.length - 1];
      const opts = DIRS
        .map(([dr, dc]) => [r + dr, c + dc])
        .filter(([nr, nc]) => inGrid(nr, nc) && state.get(key(nr, nc)) === "road"
          && !(prev && nr === prev[0] && nc === prev[1]));
      if (!opts.length) break;
      // Straight on is four times as likely as a turn, so traffic runs down streets rather than
      // wandering in circles.
      const straight = prev && opts.find(([nr, nc]) => nr - r === r - prev[0] && nc - c === c - prev[1]);
      const next = straight && Math.random() < 0.8 ? straight : opts[Math.floor(Math.random() * opts.length)];
      prev = [r, c];
      path.push(next);
    }
    return path;
  }

  function respawn(a) {
    const spots = [];
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (state.get(key(r, c)) === "road") spots.push([r, c]);
    }
    if (!spots.length) { a.node.visible = false; a.path = null; return; }
    a.node.visible = true;
    a.path = route(spots[Math.floor(Math.random() * spots.length)]);
    a.seed = Math.floor(Math.random() * 1e6);
    a.u = 0;
    a.speed = a.kind === "car" ? 0.5 + Math.random() * 0.3 : 0.16 + Math.random() * 0.1;
    a.hue = [PAL.cyan, PAL.pink, PAL.white, PAL.warm][Math.floor(Math.random() * 4)];
    // Cars keep to the middle of the carriageway, people to the kerb.
    a.lane = (Math.random() < 0.5 ? -1 : 1) * (a.kind === "car" ? 0.9 : 1.55);
  }

  function stepAgent(a, dt, t) {
    if (a.slot >= (a.kind === "car" ? carBudget : walkBudget)) { a.node.visible = false; return; }
    if (!a.node.visible || !a.path || a.path.length < 2) { respawn(a); return; }
    a.u += a.speed * dt;
    const segs = a.path.length - 1;
    if (a.u >= segs) { respawn(a); return; }
    const n = Math.floor(a.u), f = a.u - n;
    const [r0, c0] = a.path[n], [r1, c1] = a.path[n + 1];
    if (state.get(key(r0, c0)) !== "road" || state.get(key(r1, c1)) !== "road") { respawn(a); return; }
    const mid = (x) => x * TILE + (TILE - 1) / 2;
    const axis = r1 !== r0 ? "i" : "j";
    const back = axis === "i" ? r1 < r0 : c1 < c0;
    // The lane sits to one side of the direction of travel, so the two directions pass each other.
    const off = back ? -a.lane : a.lane;
    const i = mid(r0) + (mid(r1) - mid(r0)) * f + (axis === "i" ? 0 : off);
    const j = mid(c0) + (mid(c1) - mid(c0)) * f + (axis === "i" ? off : 0);
    a.g.clear();
    a.glow.clear();
    a.node.zIndex = (r0 + (r1 - r0) * f) + (c0 + (c1 - c0) * f) + 0.32;
    // Fade in and out at the ends of the route, so nothing pops into existence mid-street.
    a.node.alpha = Math.min(1, Math.min(a.u, segs - a.u) / 0.6);
    if (a.kind === "car") car(a.g, a.glow, i, j, axis, a.hue, DECK, back);
    else walker(a.g, a.glow, i, j, a.hue, t + a.seed);
  }

  // A car: tiny, dark, identified by its lights. At this size a modelled car is mush; two lights
  // and a shadow read instantly.
  function car(g, glow, i, j, dir, hue, k, back) {
    const L = 1.1, W = 0.45, H = 0.42;
    const b = dir === "i"
      ? { i0: i - L, i1: i + L, j0: j - W, j1: j + W }
      : { i0: i - W, i1: i + W, j0: j - L, j1: j + L };
    const [sx, sy] = P(i, j, k);
    g.ellipse(sx, sy + 1, (dir === "i" ? L : W) * CS * 1.2, CS * 0.32).fill({ color: 0x000000, alpha: 0.35 });
    g.poly([...P(b.i1, b.j0, k), ...P(b.i1, b.j1, k), ...P(b.i1, b.j1, k + H), ...P(b.i1, b.j0, k + H)])
      .fill(0x231f38);
    g.poly([...P(b.i0, b.j1, k), ...P(b.i1, b.j1, k), ...P(b.i1, b.j1, k + H), ...P(b.i0, b.j1, k + H)])
      .fill(0x191530);
    g.poly([...P(b.i0, b.j0, k + H), ...P(b.i1, b.j0, k + H),
      ...P(b.i1, b.j1, k + H), ...P(b.i0, b.j1, k + H)]).fill(0x2e2a48);
    const front = back ? b.i0 : b.i1, rear = back ? b.i1 : b.i0;
    const frontJ = back ? b.j0 : b.j1, rearJ = back ? b.j1 : b.j0;
    const head = dir === "i" ? P(front, j, k + H * 0.6) : P(i, frontJ, k + H * 0.6);
    const tail = dir === "i" ? P(rear, j, k + H * 0.6) : P(i, rearJ, k + H * 0.6);
    g.circle(head[0], head[1], 1.2).fill({ color: PAL.white, alpha: 0.95 });
    g.circle(tail[0], tail[1], 1).fill({ color: PAL.pink, alpha: 0.9 });
    glow.circle(head[0], head[1], 5).fill({ color: PAL.white, alpha: 0.16 });
    glow.circle(tail[0], tail[1], 4).fill({ color: PAL.pink, alpha: 0.14 });
    for (let n = 4; n >= 1; n--) {
      glow.ellipse(sx, sy, 1.4 * CS * (n / 4), 0.7 * CS * (n / 4)).fill({ color: hue, alpha: 0.05 });
    }
  }

  // A person: two pixels and a shadow, with the bob that makes them read as walking rather than
  // sliding. Anything more detailed at this scale is a smudge.
  function walker(g, glow, i, j, hue, t) {
    const k = DECK;
    const [x, y] = P(i, j, k);
    const bob = Math.abs(Math.sin(t * 3.4)) * 1.6;
    g.ellipse(x, y + 1, 2.2, 1.1).fill({ color: 0x000000, alpha: 0.4 });
    g.rect(x - 1, y - 6.2 - bob, 2, 5).fill({ color: 0x2a2540, alpha: 0.95 });
    g.rect(x - 1, y - 7.6 - bob, 2, 1.8).fill({ color: hue, alpha: 0.85 });
    glow.circle(x, y - 5.5 - bob, 4).fill({ color: hue, alpha: 0.14 });
  }

  // Steam out of the deck. Cheap, and it is what stops a street reading as a printed board.
  const vents = [];
  function drawVents(t) {
    ventG.clear();
    for (const v of vents) {
      if (state.get(key(v.r, v.c)) !== "road") continue;
      const [x, y] = P(v.i, v.j, DECK);
      for (let n = 0; n < 4; n++) {
        const f = ((t * 0.28 + v.phase + n / 4) % 1);
        ventG.ellipse(x + Math.sin(f * 3 + v.phase) * 5, y - f * 34, 4 + f * 13, (4 + f * 13) * 0.55)
          .fill({ color: 0xbcc6ff, alpha: 0.09 * (1 - f) * (1 - f) });
      }
    }
  }

  function updateVents() {
    vents.length = 0;
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (state.get(key(r, c)) !== "road") continue;
      const rand = rng((r * 6151) ^ (c * 24593) ^ 0x71fe);
      if (rand() > 0.3) continue;
      vents.push({
        r, c, phase: rand() * 6.3,
        i: lo(r) + 0.6 + rand() * (TILE - 1.2), j: lo(c) + 0.6 + rand() * (TILE - 1.2),
      });
    }
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

  let lastRefl = -1, lastT = performance.now() / 1000;
  app.ticker.add(() => {
    const t = performance.now() / 1000;
    const dt = Math.min(0.05, t - lastT);
    lastT = t;
    rings(ringG, t, CORNER);
    rain(rainG, t);
    drawSurf(t);
    for (const a of agents) stepAgent(a, dt, t);
    drawVents(t);
    boatG.clear();
    boatGlow.clear();
    for (const b of BOATS) {
      const x = ((t * b.speed + b.off) % 2400) - 1200;
      passingBoat(boatG, boatGlow, x * b.dir, b.y, t, b.hue);
    }
    if (harbour) {                                   // two moored alongside the pier
      const [hr, hc] = harbour;
      for (const [n, dj] of [[0, -1.3], [1, 1.3]]) {
        const [mx, my] = P(hi(hr) + 1.6, (lo(hc) + hi(hc)) / 2 + dj, 0);
        passingBoat(boatG, boatGlow, mx, my, t + n * 2.1, n ? PAL.cyan : PAL.warm);
      }
    }
    if (t - lastRefl > 0.05) {                     // the reflections carry the water, at ~20 fps
      lastRefl = t;
      reflectG.clear();
      for (const l of lit.values()) {
        const shore = shoreBelow(l.r, l.c);
        if (!shore) continue;
        for (const s of l.sources) {
          // How high the light stands over the waterline decides how far its reflection runs —
          // that is what makes a tower's smear long and a shopfront's short.
          const rise = Math.max(8, shore[1] - s.y);
          smear(reflectG, s.x, shore[1], Math.max(5, s.w * 0.85), rise * 0.75,
            s.colour, Math.min(0.5, 0.2 * s.strength) * shore[2], t);
        }
      }
    }
  });

  // A bigger city is a busier port: the traffic on the water grows with what stands on it.
  const BOATS = [];
  function updateBoats() {
    const town = new Set([...owner.values()]).size;
    carBudget = Math.min(4, Math.floor(town / 4));
    walkBudget = Math.min(14, Math.floor(town * 1.2));
    const want = Math.min(8, 2 + Math.floor(town / 4));
    const rand = rng(0x50a7 + want);
    while (BOATS.length > want) BOATS.pop();
    while (BOATS.length < want) {
      const n = BOATS.length;
      BOATS.push({
        speed: 13 + rand() * 18,
        off: rand() * 2400,
        y: CORNER[1] + (n % 2 ? 150 : -420) + rand() * 420,
        dir: rand() < 0.5 ? 1 : -1,
        hue: rand() < 0.5 ? PAL.warm : PAL.cyan,
      });
    }
  }
  for (let n = 0; n < 5; n++) agent("car");
  for (let n = 0; n < 16; n++) agent("walker");

  // A handle on the rules from outside, so the district limit can be checked by a test instead of
  // being read off a screenshot — a two-tile building makes tile counting misleading.
  window.jpcity = {
    state,
    owner,
    agents,
    boats: BOATS,
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

  drawCoast();
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
