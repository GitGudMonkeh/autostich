// Facade study — the same three buildings, three facade languages each.
// Deliberately OUTSIDE src/: design exploration.
//
// What changed against voxel.js: the voxels still define the MASSING, but they are no longer
// drawn as individual cubes. Only the shell's visible faces are filled, in flat tones, so
// coplanar faces merge into continuous walls; outlines are stroked only where a face actually
// borders empty space. That single change is what turns "stack of blocks" into "building".
//
// The architecture then lives ON those walls: one lattice cell = one floor module, and each
// variant fills that module differently (window grid / ribbon glazing / exposed frame).
//
// The hologrid is an ACCENT now, not the material: a dashed ground plate, a partial cage over
// the crown, a few loose voxels above the roof, corner brackets, and one scan band drifting up
// the facade. The build animation from the voxel study is kept unchanged.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { ISO, CS, P, rng, dashLine, cageBox, BUILDINGS } from "./buildings.js";
import { VARIANTS, WIN_SETS, buildFacade } from "./facadeRender.js";
import { vehicle, VEHICLES } from "./vehicles.js";

const C1 = 0x35d6ff, C2 = 0xb06bff, HOT = 0xe8fbff;
const BUILD_MS = 2600;

/* ---- hologrid accents ------------------------------------------------------------------- */

function floorPlate() {
  const g = new Graphics();
  const S = 16, N = 6;
  const pt = (i, j) => [(i - j) * S, (i + j) * S * ISO];
  for (let j = -N; j <= N; j++) dashLine(g, ...pt(-N, j), ...pt(N, j));
  for (let i = -N; i <= N; i++) dashLine(g, ...pt(i, -N), ...pt(i, N));
  g.stroke({ width: 1, color: C2, alpha: 0.18 });
  return g;
}

function looseVoxels(seed, cells, maxK) {
  const g = new Graphics();
  const rand = rng(seed * 31 + 7);
  for (let n = 0; n < 4; n++) {
    const [i, j] = cells[Math.floor(rand() * cells.length)];
    const k = maxK + 1 + Math.floor(rand() * 4);
    const [x, y] = P(i + Math.round((rand() - 0.5) * 4), j + Math.round((rand() - 0.5) * 4), k);
    const b = CS * ISO;
    g.poly([x - CS, y - CS, x, y + b - CS, x + CS, y - CS, x, y - b - CS])
      .stroke({ width: 1, color: C2, alpha: 0.85 });
    g.moveTo(x, y + b - CS).lineTo(x, y + b).moveTo(x - CS, y - CS).lineTo(x - CS, y)
      .moveTo(x + CS, y - CS).lineTo(x + CS, y).stroke({ width: 1, color: C2, alpha: 0.45 });
  }
  return g;
}

/* ---- panel assembly --------------------------------------------------------------------- */

function makePanel(def, variant, seed) {
  const c = new Container();
  c.addChild(floorPlate());

  const cells = def.build();
  const win = WIN_SETS[def.key] ?? WIN_SETS.kragturm;
  let si = 0, sj = 0;
  for (const [i, j] of cells) { si += i; sj += j; }
  const ci = si / cells.length, cj = sj / cells.length;
  const ox = -(ci - cj) * CS, oy = -(ci + cj) * CS * ISO;

  const BANDS = 14;
  const { solid: bands, glows, minK, maxK, box } = buildFacade(cells, variant, win, seed, BANDS);
  for (const b of [...bands, ...glows]) b.position.set(ox, oy);
  const minX = box.minX + ox, maxX = box.maxX + ox;
  const minY = box.minY + oy, maxY = box.maxY + oy;

  // Hologrid accent: only the crown is caged, dashed. The box is measured from the cells that
  // are actually up there — taken from the centroid it drifts off the building and reads as an
  // unrelated floating rectangle.
  const cage = new Graphics();
  const hiK = Math.round(minK + (maxK - minK) * 0.72);
  const crown = cells.filter(([, , k]) => k >= hiK);
  const ci0 = Math.min(...crown.map((c) => c[0])), ci1 = Math.max(...crown.map((c) => c[0]));
  const cj0 = Math.min(...crown.map((c) => c[1])), cj1 = Math.max(...crown.map((c) => c[1]));
  cageBox(cage, ci0, ci1, cj0, cj1, hiK, maxK + 2, 0.5, true);
  cage.position.set(ox, oy);

  const loose = looseVoxels(seed, cells, maxK);
  loose.position.set(ox, oy);

  const scan = new Graphics();                                 // materialisation plane
  scan.blendMode = "add";
  const R = 7.2 * CS;
  for (let n = 3; n >= 1; n--) {
    scan.poly([0, -R * ISO * n / 3, R * n / 3, 0, 0, R * ISO * n / 3, -R * n / 3, 0])
      .fill({ color: C1, alpha: 0.07 });
  }
  scan.poly([0, -R * ISO, R, 0, 0, R * ISO, -R, 0]).stroke({ width: 1.5, color: HOT, alpha: 0.9 });
  scan.position.set(ox, oy);

  const drift = new Graphics();                                // slow holo band over the facade
  drift.blendMode = "add";
  drift.poly([0, -R * ISO, R, 0, 0, R * ISO, -R, 0]).fill({ color: C1, alpha: 0.05 });
  drift.position.set(ox, oy);

  // Parked vehicles at the kerb — the reference is never an empty model, there is always
  // traffic standing at the base.
  const parked = new Container();
  const prand = rng(seed * 104729 + 11);
  [["E", -1], ["W", 1]].forEach(([dir, side], n) => {
    const v = VEHICLES[(seed + n) % VEHICLES.length];
    const g = new Graphics();
    vehicle(g, dir, { ...v.spec, alt: 2 });
    g.position.set(side * (62 + prand() * 14), 26 + n * 16);
    parked.addChild(g);
  });

  c.addChild(cage);
  for (let b = 0; b < BANDS; b++) { c.addChild(bands[b]); c.addChild(glows[b]); }
  c.addChild(parked, loose, drift, scan);

  return {
    node: c, bands, glows, parked, cage, scan, drift, loose, oy, topLevel: maxK + 1,
    bbox: { w: maxX - minX, h: maxY - minY, cy: (minY + maxY) / 2 }, t0: 0,
  };
}

/* ---- animation -------------------------------------------------------------------------- */

function applyBuild(p, now) {
  const t = (now - p.t0) / BUILD_MS;
  if (t < 0) return;
  p.cage.alpha = t < 0.22 ? Math.min(1, t / 0.22) * 0.95 : 0.95 - Math.min(1, (t - 0.22) / 0.5) * 0.5;
  const B = p.bands.length;
  for (let b = 0; b < B; b++) {
    const local = Math.max(0, Math.min(1, (t - (0.18 + (b / B) * 0.68)) / 0.13));
    p.bands[b].alpha = local;
    p.bands[b].y = p.oy + (1 - local) * 7;
    p.glows[b].alpha = local;
    p.glows[b].y = p.bands[b].y;
  }
  p.parked.alpha = Math.max(0, Math.min(1, (t - 0.82) / 0.22));
  const rising = t > 0.14 && t < 0.95;
  p.scan.visible = rising;
  if (rising) {
    const f = Math.max(0, Math.min(1, (t - 0.14) / 0.72));
    p.scan.y = p.oy - f * p.topLevel * CS;
    p.scan.alpha = 0.35 + 0.65 * Math.sin(f * Math.PI);
  }
  p.loose.alpha = Math.max(0, Math.min(1, (t - 0.78) / 0.28));
}

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  // 3 buildings × 3 facade variants — the matrix is the deliverable, so it is laid out as one.
  const panels = [];
  VARIANTS.forEach((variant, row) => {
    BUILDINGS.forEach((def, col) => {
      const p = makePanel(def, variant, row * 3 + col + 1);
      p.row = row; p.col = col;
      p.t0 = performance.now() + (row * 3 + col) * 320;
      app.stage.addChild(p.node);
      panels.push(p);
    });
  });

  // On a phone the matrix stacks into nine rows. At the desktop row height that is a canvas
  // approaching 4000 px — past the texture limit on some devices — so the row shrinks with the
  // viewport and the label grid is told the same height.
  const layout = () => {
    const narrow = window.innerWidth < 820;
    const cols = narrow ? 1 : 3;
    const rowH = narrow ? 330 : 430;
    const labelH = narrow ? 104 : 96;
    const rows = Math.ceil(panels.length / cols);
    host.style.height = `${rows * rowH}px`;
    app.renderer.resize(host.clientWidth, rows * rowH);
    const labels = document.getElementById("labels");
    labels.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    labels.style.gridAutoRows = `${rowH}px`;
    const cw = app.screen.width / cols;
    panels.forEach((p, n) => {
      const cx = cw * (n % cols) + cw / 2;
      const top = rowH * Math.floor(n / cols);
      const s = Math.min(cw * 0.8 / p.bbox.w, (rowH - labelH) * 0.95 / p.bbox.h, 2.2);
      p.node.scale.set(s);
      p.node.position.set(cx, top + labelH + (rowH - labelH) / 2 - p.bbox.cy * s);
    });
  };
  layout();
  window.addEventListener("resize", layout);

  const replay = () => {
    const now = performance.now();
    panels.forEach((p, n) => { p.t0 = now + n * 220; });
  };
  app.canvas.addEventListener("pointerdown", replay);
  document.getElementById("replay")?.addEventListener("click", replay);

  app.ticker.add(() => {
    const now = performance.now();
    for (const p of panels) {
      applyBuild(p, now);
      if (now - p.t0 > BUILD_MS) {
        const s = (now - p.t0 - BUILD_MS) / 1000;
        p.cage.alpha = 0.45 + 0.12 * Math.sin(s * 1.5);
        const f = (s * 0.12) % 1;                              // holo band drifting up the facade
        p.drift.y = p.oy - f * p.topLevel * CS;
        p.drift.alpha = Math.sin(f * Math.PI) * 0.9;
      } else {
        p.drift.alpha = 0;
      }
    }
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
