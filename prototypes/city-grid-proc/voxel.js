// Voxel/wireframe hybrid — three buildings, each with its own silhouette, and the
// projection-to-matter build animation. Deliberately OUTSIDE src/: design exploration.
//
// The hybrid: the MASS is solid voxels (opaque faces, bright edges) so the building has real
// presence; the CAGE around and above it is wireframe only. Transparency is spent on the cage,
// never on the mass — a fully see-through building reads as a diagram, not as architecture.
//
// The build animation is the "Projektion" direction turned into a verb: the wireframe cage
// draws itself first, then a scan plane rises and the voxels materialise underneath it.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";

const C1 = 0x35d6ff;                // primary tone (voxel edges, scan)
const C2 = 0xb06bff;                // secondary tone (cage, plate, shards)
const HOT = 0xe8fbff;
const ISO = 0.5;
const CS = 11;                      // voxel half-width in px
const BUILD_MS = 2600;

const P = (i, j, level) => [(i - j) * CS, (i + j) * CS * ISO - level * CS];

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

function dashLine(g, x1, y1, x2, y2, dash = 4, gap = 5) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  for (let t = 0; t < len; t += dash + gap) {
    const e = Math.min(t + dash, len);
    g.moveTo(x1 + ux * t, y1 + uy * t).lineTo(x1 + ux * e, y1 + uy * e);
  }
}

/* ---- voxel volumes ---------------------------------------------------------------------- */

function volume() {
  const set = new Set();
  return {
    add(i0, i1, j0, j1, k0, k1) {
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) set.add(`${i}|${j}|${k}`);
      return this;
    },
    cut(i0, i1, j0, j1, k0, k1) {
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) set.delete(`${i}|${j}|${k}`);
      return this;
    },
    list() { return [...set].map((s) => s.split("|").map(Number)); },
  };
}

// One solid voxel; (x,y) is its bottom centre. Opaque faces — this is what carries the mass.
function voxel(g, x, y, edge, edgeAlpha, lit) {
  const b = CS * ISO;
  g.poly([x - CS, y, x, y + b, x, y + b - CS, x - CS, y - CS]).fill(0x0d1524);
  g.poly([x, y + b, x + CS, y, x + CS, y - CS, x, y + b - CS]).fill(0x142238);
  g.poly([x, y - b - CS, x + CS, y - CS, x, y + b - CS, x - CS, y - CS]).fill(lit ? 0x24507a : 0x1d3352);
  const top = [x - CS, y - CS, x, y + b - CS, x + CS, y - CS, x, y - b - CS];
  g.poly(top).stroke({ width: 5, color: edge, alpha: 0.16 * edgeAlpha });
  g.poly(top).stroke({ width: 1.1, color: edge, alpha: 0.95 * edgeAlpha });
  g.moveTo(x, y + b - CS).lineTo(x, y + b).stroke({ width: 1.1, color: edge, alpha: 0.6 * edgeAlpha });
  g.moveTo(x - CS, y - CS).lineTo(x - CS, y).stroke({ width: 1, color: edge, alpha: 0.32 * edgeAlpha });
  g.moveTo(x + CS, y - CS).lineTo(x + CS, y).stroke({ width: 1, color: edge, alpha: 0.32 * edgeAlpha });
}

// Wireframe box over a lattice range — the cage. Edges only, on purpose.
function cageBox(g, i0, i1, j0, j1, k0, k1, alpha = 0.45, dashed = false) {
  const a = i0 - 0.5, b = i1 + 0.5, c = j0 - 0.5, d = j1 + 0.5;
  const lo = k0, hi = k1 + 1;
  const corners = (lv) => [P(a, c, lv), P(b, c, lv), P(b, d, lv), P(a, d, lv)];
  const bot = corners(lo), top = corners(hi);
  const ring = (pts) => {
    for (let i = 0; i < 4; i++) {
      const p = pts[i], q = pts[(i + 1) % 4];
      if (dashed) dashLine(g, p[0], p[1], q[0], q[1], 5, 4);
      else g.moveTo(p[0], p[1]).lineTo(q[0], q[1]);
    }
  };
  ring(bot); ring(top);
  for (let i = 0; i < 4; i++) g.moveTo(bot[i][0], bot[i][1]).lineTo(top[i][0], top[i][1]);
  g.stroke({ width: 1, color: C2, alpha });
}

/* ---- the three buildings ---------------------------------------------------------------- */

// 1 · Kragturm — a slender shaft with a cantilevered block and a counterweight. Asymmetric on
//     purpose: the silhouette has to be recognisable from any of the four iso rotations.
const KRAGTURM = {
  key: "kragturm",
  name: "Kragturm",
  desc: "Schlanker Schaft, auskragender Block, Gegengewicht. Der Käfig trägt die Auskragung sichtbar.",
  build() {
    const v = volume();
    v.add(0, 4, 0, 4, 0, 2);          // podium
    v.add(1, 3, 1, 3, 3, 15);         // shaft
    v.add(4, 7, 1, 3, 11, 13);        // cantilever, four cells clear of the shaft
    v.add(-2, 0, 2, 2, 12, 13);       // counterweight on the opposite side
    v.add(1, 3, 1, 3, 16, 17);        // crown
    v.add(2, 2, 2, 2, 18, 21);        // mast
    v.cut(2, 2, 2, 2, 6, 9);          // service shaft cut into the core
    return v.list();
  },
  cage(g) {
    cageBox(g, 1, 3, 1, 3, 0, 21, 0.4);          // full-height cage over the shaft
    cageBox(g, 4, 6, 1, 3, 11, 13, 0.6);         // braces the cantilever
    cageBox(g, 0, 4, 0, 4, 0, 2, 0.28, true);    // dashed podium outline
    const A = P(3.5, 2, 14), B = P(6.5, 2, 14), C = P(6.5, 2, 11);
    g.moveTo(...A).lineTo(...C).moveTo(...B).lineTo(...P(3.5, 2, 11))
      .stroke({ width: 1, color: C2, alpha: 0.5 });   // diagonal ties
  },
};

// 2 · Torbau — two legs and a bridge; the hole in the middle is the whole point.
const TORBAU = {
  key: "torbau",
  name: "Torbau",
  desc: "Zwei Beine, ein Brückenriegel, ein echtes Loch in der Mitte — im Grid sofort erkennbar.",
  build() {
    const v = volume();
    v.add(0, 1, 0, 2, 0, 12);         // leg A — kept slim so the opening stays wide
    v.add(6, 7, 0, 2, 0, 12);         // leg B
    v.add(0, 7, 0, 2, 13, 15);        // bridge
    v.add(2, 5, 0, 2, 16, 18);        // penthouse on the bridge
    v.cut(3, 4, 1, 1, 16, 18);        // light well through the penthouse
    return v.list();
  },
  cage(g) {
    cageBox(g, 0, 7, 0, 2, 13, 18, 0.45);
    cageBox(g, 0, 1, 0, 2, 0, 12, 0.35);
    cageBox(g, 6, 7, 0, 2, 0, 12, 0.35);
    for (let k = 2; k <= 11; k += 3) {            // tie bars drawn across the opening
      const l = P(1.5, 1, k), r = P(5.5, 1, k);
      dashLine(g, l[0], l[1], r[0], r[1], 4, 5);
    }
    g.stroke({ width: 1, color: C2, alpha: 0.4 });
  },
};

// 3 · Drillingsturm — three shafts of different heights, tied by wireframe sky bridges.
const DRILLING = {
  key: "drilling",
  name: "Drillingsturm",
  desc: "Drei Schäfte auf einer Parzelle, verbunden durch Drahtgitter-Brücken. Vertikal gestaffelt.",
  build() {
    const v = volume();
    v.add(0, 1, 0, 1, 0, 18);         // tall shaft
    v.add(4, 5, 1, 2, 0, 12);         // medium shaft
    v.add(1, 2, 4, 5, 0, 8);          // short shaft
    v.add(0, 5, 0, 5, 0, 0);          // shared plinth level
    v.add(0, 1, 0, 1, 19, 20);        // cap on the tall one
    return v.list();
  },
  cage(g) {
    cageBox(g, 0, 1, 0, 1, 0, 23, 0.4);
    cageBox(g, 4, 5, 1, 2, 0, 15, 0.34);
    cageBox(g, 1, 2, 4, 5, 0, 11, 0.34);
    const bridge = (ax, aj, bx, bj, k) => {       // sky bridges: wireframe, never solid
      const a = P(ax, aj, k), b = P(bx, bj, k), a2 = P(ax, aj, k + 1), b2 = P(bx, bj, k + 1);
      g.moveTo(...a).lineTo(...b).moveTo(...a2).lineTo(...b2)
        .moveTo(...a).lineTo(...a2).moveTo(...b).lineTo(...b2);
    };
    bridge(1.5, 1, 4, 1.5, 9);
    bridge(1, 1.5, 1.5, 4, 6);
    bridge(1.5, 1, 4, 1.5, 13);
    g.stroke({ width: 1, color: C2, alpha: 0.55 });
  },
};

const BUILDINGS = [KRAGTURM, TORBAU, DRILLING];

/* ---- plate, shards ---------------------------------------------------------------------- */

function floorPlate(seed) {
  const g = new Graphics();
  const S = 16, N = 6;
  const pt = (i, j) => [(i - j) * S, (i + j) * S * ISO];
  for (let j = -N; j <= N; j++) dashLine(g, ...pt(-N, j), ...pt(N, j));
  for (let i = -N; i <= N; i++) dashLine(g, ...pt(i, -N), ...pt(i, N));
  g.stroke({ width: 1, color: C2, alpha: 0.2 });
  const rand = rng(seed * 977 + 13);
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2, d = 1.05 + rand() * 0.5;
    const x = Math.cos(a) * N * S * d, y = Math.sin(a) * N * S * d * ISO;
    const s = 3 + rand() * 4;
    const b = s * ISO;
    g.poly([x - s, y - s, x, y + b - s, x + s, y - s, x, y - b - s])
      .stroke({ width: 1, color: rand() < 0.4 ? C1 : C2, alpha: 0.55 });
  }
  return g;
}

function shardField(seed, height) {
  const g = new Graphics();
  const rand = rng(seed * 31 + 7);
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2, d = 55 + rand() * 45, s = 3 + rand() * 4;
    const x = Math.cos(a) * d, y = -12 - rand() * height + Math.sin(a) * d * ISO;
    const rot = rand() * 3, c = Math.cos(rot), sn = Math.sin(rot);
    const p = [[0, -s], [s * 0.55, 0], [0, s], [-s * 0.55, 0]]
      .flatMap(([px, py]) => [x + px * c - py * sn, y + (px * sn + py * c) * ISO * 1.6]);
    g.poly(p).fill({ color: rand() < 0.45 ? C2 : C1, alpha: 0.14 });
    g.poly(p).stroke({ width: 1, color: rand() < 0.45 ? C2 : C1, alpha: 0.8 });
  }
  return g;
}

/* ---- panel assembly --------------------------------------------------------------------- */

function makePanel(def, seed) {
  const c = new Container();
  c.addChild(floorPlate(seed));

  const raw = def.build();
  const rand = rng(seed * 6151 + 3);
  const occ = new Set(raw.map(([i, j, k]) => `${i}|${j}|${k}`));
  const has = (i, j, k) => occ.has(`${i}|${j}|${k}`);
  let minK = Infinity, maxK = -Infinity, si = 0, sj = 0;
  for (const [i, j, k] of raw) { minK = Math.min(minK, k); maxK = Math.max(maxK, k); si += i; sj += j; }
  const ci = si / raw.length, cj = sj / raw.length;         // centre the footprint on the plate
  const ox = -(ci - cj) * CS, oy = -(ci + cj) * CS * ISO;

  // Only the shell is drawn — a fully enclosed voxel is invisible and would just cost geometry.
  // The upper edges are eroded and a few voxels come loose above the mass, so the building reads
  // as stacked cubes instead of as a block with a grid texture on it.
  const cells = [];
  for (const [i, j, k] of raw) {
    if (has(i + 1, j, k) && has(i - 1, j, k) && has(i, j + 1, k)
      && has(i, j - 1, k) && has(i, j, k + 1) && has(i, j, k - 1)) continue;
    const rel = (k - minK) / Math.max(1, maxK - minK);
    if (!has(i, j, k + 1) && rel > 0.6 && rand() < (rel - 0.6) * 0.9) continue;
    cells.push([i, j, k, false]);
  }
  for (let n = 0; n < 5; n++) {                             // detached voxels drifting over the top
    const [i, j] = raw[Math.floor(rand() * raw.length)];
    cells.push([i + Math.round((rand() - 0.5) * 4), j + Math.round((rand() - 0.5) * 4),
      maxK + 1 + Math.floor(rand() * 4), true]);
  }

  // Voxels grouped into height bands: the build animation switches whole bands, so nothing is
  // redrawn per frame — a few hundred cubes would be far too much geometry to rebuild at 60 fps.
  const BANDS = 14;
  const bandOf = (k) => Math.min(BANDS - 1, Math.max(0, Math.floor(((k - minK) / (maxK - minK + 1)) * BANDS)));
  const bands = Array.from({ length: BANDS }, () => new Graphics());
  const sorted = cells.slice().sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  let minX = -100, maxX = 100, minY = -50, maxY = 50;       // starts as the plate's own extent
  for (const [i, j, k, loose] of sorted) {
    const [x, y] = P(i, j, k);
    const lit = !loose && (i * 7 + j * 3 + k) % 9 === 0;    // a few voxels read as lit windows
    voxel(bands[bandOf(k)], x + ox, y + oy, loose ? C2 : C1, loose ? 0.8 : lit ? 1 : 0.66, lit);
    minX = Math.min(minX, x + ox - CS); maxX = Math.max(maxX, x + ox + CS);
    minY = Math.min(minY, y + oy - CS * (1 + ISO)); maxY = Math.max(maxY, y + oy + CS * ISO);
  }

  const cage = new Graphics();
  def.cage(cage);
  cage.position.set(ox, oy);

  const scan = new Graphics();                              // the materialisation plane
  scan.blendMode = "add";
  const R = 7.2 * CS;
  for (let i = 3; i >= 1; i--) {
    scan.poly([0, -R * ISO * i / 3, R * i / 3, 0, 0, R * ISO * i / 3, -R * i / 3, 0])
      .fill({ color: C1, alpha: 0.07 });
  }
  scan.poly([0, -R * ISO, R, 0, 0, R * ISO, -R, 0]).stroke({ width: 1.5, color: HOT, alpha: 0.9 });
  scan.position.set(ox, oy);

  const flare = new Graphics();
  flare.blendMode = "add";
  for (let i = 5; i >= 1; i--) flare.ellipse(0, 0, 44 * i / 5, 44 * ISO * i / 5).fill({ color: C1, alpha: 0.05 });
  flare.position.set(ox, oy);

  const shards = shardField(seed, (maxK - minK) * CS);
  shards.position.set(ox, oy);

  c.addChild(flare, cage);
  for (const b of bands) c.addChild(b);
  c.addChild(scan, shards);

  const topLevel = maxK + 1;
  const bbox = { w: maxX - minX, h: maxY - minY, cy: (minY + maxY) / 2 };
  return { node: c, bands, cage, scan, shards, oy, topLevel, bbox, t0: 0 };
}

/* ---- animation -------------------------------------------------------------------------- */

function applyBuild(p, now) {
  const t = (now - p.t0) / BUILD_MS;
  const B = p.bands.length;
  if (t < 0) return;
  // Phase 1 (0–0.22): the cage draws itself. Phase 2 (0.18–0.95): voxels materialise upward.
  p.cage.alpha = t < 0.22 ? Math.min(1, t / 0.22) * 0.9 : 0.9 - Math.min(1, (t - 0.22) / 0.5) * 0.42;
  for (let b = 0; b < B; b++) {
    const start = 0.18 + (b / B) * 0.68;
    const local = Math.max(0, Math.min(1, (t - start) / 0.13));
    p.bands[b].alpha = local;
    p.bands[b].y = (1 - local) * 7;
  }
  const rising = t > 0.14 && t < 0.95;
  p.scan.visible = rising;
  if (rising) {
    const f = Math.max(0, Math.min(1, (t - 0.14) / 0.72));
    p.scan.y = p.oy - f * p.topLevel * CS;
    p.scan.alpha = 0.35 + 0.65 * Math.sin(Math.min(1, f) * Math.PI);
  }
  p.shards.alpha = Math.max(0, Math.min(1, (t - 0.75) / 0.3));
}

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const panels = BUILDINGS.map((def, i) => {
    const p = makePanel(def, i + 1);
    p.t0 = performance.now() + i * 700;      // staggered, so the eye can follow each build
    app.stage.addChild(p.node);
    return p;
  });

  // Each panel is fitted to its cell from its own bounding box, so a tall building and a wide
  // one both fill the space instead of floating in it.
  const layout = () => {
    const cols = app.screen.width < 820 ? 1 : 3;
    const rows = Math.ceil(panels.length / cols);
    const cw = app.screen.width / cols, ch = app.screen.height / rows;
    const labelH = Math.min(96, ch * 0.22);
    panels.forEach((p, i) => {
      const availH = ch - labelH;
      const s = Math.min(cw * 0.82 / p.bbox.w, availH * 0.92 / p.bbox.h, 2.6);
      p.node.scale.set(s);
      const cx = cw * (i % cols) + cw / 2;
      const cy = ch * Math.floor(i / cols) + labelH + availH / 2;
      p.node.position.set(cx, cy - p.bbox.cy * s);
    });
  };
  layout();
  app.renderer.on("resize", layout);

  // Click anywhere to rebuild everything — the animation is the point of this page.
  const replay = () => {
    const now = performance.now();
    panels.forEach((p, i) => { p.t0 = now + i * 700; });
  };
  app.canvas.addEventListener("pointerdown", replay);
  document.getElementById("replay")?.addEventListener("click", replay);

  app.ticker.add(() => {
    const now = performance.now();
    for (const p of panels) {
      applyBuild(p, now);
      const done = now - p.t0 > BUILD_MS;
      if (done) {
        const s = (now - p.t0 - BUILD_MS) / 1000;
        p.cage.alpha = 0.4 + 0.12 * Math.sin(s * 1.6);       // the cage keeps breathing
        p.shards.y = Math.sin(s * 0.8) * 3;
      }
      // No auto-loop: the build plays once, as it would when the building is placed in the
      // game. "Neu bauen" (or a click on the stage) replays it.
    }
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
