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
import { ISO, CS, P, rng, dashLine, BUILDINGS } from "./buildings.js";

const C1 = 0x35d6ff;                // primary tone (voxel edges, scan)
const C2 = 0xb06bff;                // secondary tone (cage, plate, shards)
const HOT = 0xe8fbff;
const BUILD_MS = 2600;

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
