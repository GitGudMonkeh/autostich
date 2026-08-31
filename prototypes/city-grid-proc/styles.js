// Building-style mockups for the city grid — six directions on ONE silhouette.
// Deliberately OUTSIDE src/: a design exploration, not app code.
//
// Method: every panel draws the same three-setback mass at the same iso projection as the
// city grid. Only the surface language changes, so the comparison is about style and not
// about the shape underneath.
//
// Shared holo language (from the reference art): a dashed iso grid plate, wireframe blocks
// scattered on it, angular shards floating around the mass, and a two-tone neon gradient.
// The two tones are uniform across all six panels on purpose — in the game they become the
// faction colours (fire orange/magenta, ice cyan/violet, plant green/violet, lightning violet/white).

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";

const C1 = 0x35d6ff;                // primary tone (tubes, edges)
const C2 = 0xb06bff;                // secondary tone (plate, shards, rim)
const HOT = 0xdffaff;               // near-white core
const ISO = 0.5;                    // 2:1 projection, same as the city grid
const A0 = 54;                      // half width of the ground footprint (px)
const TIERS = [{ fw: 1, h: 86 }, { fw: 0.72, h: 54 }, { fw: 0.46, h: 30 }];
const TOTAL_H = TIERS.reduce((s, t) => s + t.h, 0);

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

function dashLine(g, x1, y1, x2, y2, dash = 4, gap = 5) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  for (let t = 0; t < len; t += dash + gap) {
    const e = Math.min(t + dash, len);
    g.moveTo(x1 + ux * t, y1 + uy * t).lineTo(x1 + ux * e, y1 + uy * e);
  }
}

// One iso box: footprint half-width a (half-depth follows the 2:1 projection), extruded by h.
function box(g, cx, cyB, a, h, opt = {}) {
  const b = a * ISO;
  const L = [cx - a, cyB], R = [cx + a, cyB], B = [cx, cyB + b];
  const Lt = [L[0], L[1] - h], Rt = [R[0], R[1] - h], Bt = [B[0], B[1] - h], Tt = [cx, cyB - b - h];
  const face = opt.face ?? [0x0a1120, 0x060a14, 0x122038];   // [left, right, top]
  const edge = opt.edge ?? C1;
  const fa = opt.faceAlpha ?? 1;
  if (fa > 0) {
    g.poly([...Lt, ...Bt, ...B, ...L]).fill({ color: face[0], alpha: fa });
    g.poly([...Bt, ...Rt, ...R, ...B]).fill({ color: face[1], alpha: fa });
    g.poly([...Tt, ...Rt, ...Bt, ...Lt]).fill({ color: face[2], alpha: fa });
  }
  if (opt.noEdges) return { L, R, B, Lt, Rt, Bt, Tt };
  const w = opt.edgeWidth ?? 1.4, ea = opt.edgeAlpha ?? 1;
  g.poly([...Lt, ...Bt, ...Rt]).stroke({ width: w * 9, color: edge, alpha: 0.07 * ea });
  g.poly([...Lt, ...Bt, ...Rt]).stroke({ width: w * 4, color: edge, alpha: 0.16 * ea });
  g.poly([...Lt, ...Bt, ...Rt]).stroke({ width: w, color: edge, alpha: 0.95 * ea });
  g.moveTo(...Lt).lineTo(...Tt).lineTo(...Rt).stroke({ width: w, color: opt.rim ?? edge, alpha: 0.95 * ea });
  g.moveTo(...Bt).lineTo(...B).stroke({ width: w, color: edge, alpha: 0.7 * ea });
  g.moveTo(...Lt).lineTo(...L).stroke({ width: w, color: edge, alpha: 0.45 * ea });
  g.moveTo(...Rt).lineTo(...R).stroke({ width: w, color: edge, alpha: 0.45 * ea });
  return { L, R, B, Lt, Rt, Bt, Tt };
}

// Small iso cube; (x,y) is its bottom centre. wire = edges only, as on the reference plates.
function cube(g, x, y, s, alpha = 1, wire = false, color = C1) {
  const b = s * ISO;
  if (!wire) {
    g.poly([x - s, y, x, y + b, x, y + b - s, x - s, y - s]).fill(0x070c16);
    g.poly([x, y + b, x + s, y, x + s, y - s, x, y + b - s]).fill(0x0a1220);
    g.poly([x, y - b - s, x + s, y - s, x, y + b - s, x - s, y - s]).fill(0x101d33);
  }
  g.poly([x - s, y - s, x, y + b - s, x + s, y - s, x, y - b - s]).stroke({ width: 4, color, alpha: 0.1 * alpha });
  g.poly([x - s, y - s, x, y + b - s, x + s, y - s, x, y - b - s]).stroke({ width: 1, color, alpha: 0.95 * alpha });
  g.moveTo(x, y + b - s).lineTo(x, y + b).stroke({ width: 1, color, alpha: 0.6 * alpha });
  g.moveTo(x - s, y - s).lineTo(x - s, y).stroke({ width: 1, color, alpha: 0.4 * alpha });
  g.moveTo(x + s, y - s).lineTo(x + s, y).stroke({ width: 1, color, alpha: 0.4 * alpha });
  if (wire) g.poly([x - s, y, x, y + b, x + s, y]).stroke({ width: 1, color, alpha: 0.4 * alpha });
}

// Angular shard — the floating debris that gives the reference art its energy.
function shard(g, x, y, s, rot, alpha, color) {
  const c = Math.cos(rot), sn = Math.sin(rot);
  const p = [[0, -s], [s * 0.55, 0], [0, s], [-s * 0.55, 0]]
    .flatMap(([px, py]) => [x + px * c - py * sn, y + (px * sn + py * c) * ISO * 1.6]);
  g.poly(p).fill({ color, alpha: 0.16 * alpha });
  g.poly(p).stroke({ width: 1, color, alpha: 0.95 * alpha });
}

// The shared holo floor: dashed iso grid plate + wireframe blocks scattered on it.
function floorPlate(seed) {
  const g = new Graphics();
  const S = 17, N = 5;
  const pt = (i, j) => [(i - j) * S, (i + j) * S * ISO];
  for (let j = -N; j <= N; j++) dashLine(g, ...pt(-N, j), ...pt(N, j));
  for (let i = -N; i <= N; i++) dashLine(g, ...pt(i, -N), ...pt(i, N));
  g.stroke({ width: 1, color: C2, alpha: 0.22 });
  const R = N * S;
  g.poly([0, -R * ISO * 2, R * 2, 0, 0, R * ISO * 2, -R * 2, 0]).stroke({ width: 1, color: C2, alpha: 0.12 });
  const rand = rng(seed * 977 + 13);
  for (let i = 0; i < 11; i++) {
    const a = rand() * Math.PI * 2, d = 0.6 + rand() * 0.55;
    const x = Math.cos(a) * R * 1.7 * d, y = Math.sin(a) * R * 1.7 * d * ISO;
    if (Math.abs(x) < A0 * 1.25) continue;               // keep the lot itself clear
    cube(g, x, y, 4 + rand() * 6, 0.75, rand() < 0.55, rand() < 0.4 ? C2 : C1);
  }
  return g;
}

// The blazing origin where the mass meets the plate — the one element every reference shares.
function baseFlare() {
  const g = new Graphics();
  g.blendMode = "add";
  for (let i = 6; i >= 1; i--) g.ellipse(0, 0, 52 * i / 6, 52 * ISO * i / 6).fill({ color: C1, alpha: 0.05 });
  for (let i = 3; i >= 1; i--) g.ellipse(0, 0, 18 * i / 3, 18 * ISO * i / 3).fill({ color: HOT, alpha: 0.09 });
  for (let i = 0; i < 6; i++) {   // light running out along the plate
    const a = (i / 6) * Math.PI * 2 + 0.4, r = 60 + (i % 3) * 22;
    g.moveTo(0, 0).lineTo(Math.cos(a) * r, Math.sin(a) * r * ISO).stroke({ width: 1.2, color: C1, alpha: 0.3 });
  }
  return g;
}

// Shards orbiting the mass, registered for a slow drift.
function shardField(seed) {
  const g = new Graphics();
  const rand = rng(seed * 31 + 7);
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2, d = 60 + rand() * 60;
    shard(g, Math.cos(a) * d, -20 - rand() * TOTAL_H + Math.sin(a) * d * ISO,
      4 + rand() * 6, rand() * 3, 0.5 + rand() * 0.5, rand() < 0.45 ? C2 : C1);
  }
  return g;
}

/* ---- the six style directions ---------------------------------------------------------- */

// A · Voxel-Cluster — the mass dissolves into cubes with gaps; a core burns between them.
function styleVoxel(g, add, seed) {
  const rand = rng(seed);
  const CS = 11;
  let base = 0;
  const cells = [];
  for (const t of TIERS) {
    const a = A0 * t.fw;
    const n = Math.max(2, Math.round(a / CS));
    const layers = Math.max(1, Math.round(t.h / CS));
    for (let k = 0; k < layers; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (rand() < 0.15) continue;                        // gaps let the core shine through
      cells.push({
        x: (i - j) * CS,
        y: (i + j) * CS * ISO - (n - 1) * CS * ISO + base - k * CS,
        o: i + j + k,
        edge: k === layers - 1 ? 1 : 0.62,
        col: rand() < 0.18 ? C2 : C1,
      });
    }
    base -= t.h;
  }
  cells.sort((p, q) => p.o - q.o);
  for (const c of cells) cube(g, c.x, c.y, CS, c.edge, false, c.col);
  const core = new Graphics();
  core.blendMode = "add";
  for (let i = 6; i >= 1; i--) core.ellipse(0, -40, 46 * i / 6, 46 * ISO * i / 6).fill({ color: C1, alpha: 0.1 });
  for (let i = 4; i >= 1; i--) core.rect(-4 * i, -TOTAL_H * 0.72, 8 * i, TOTAL_H * 0.72).fill({ color: C1, alpha: 0.05 });
  core.circle(0, -40, 7).fill({ color: HOT, alpha: 0.95 });
  core.circle(0, -40, 16).fill({ color: HOT, alpha: 0.3 });
  for (let i = 0; i < 8; i++) {                           // arcs escaping the seams
    const a = rand() * Math.PI * 2, r = 24 + rand() * 26;
    core.moveTo(0, -40)
      .lineTo(Math.cos(a) * r * 0.45, -40 + Math.sin(a) * r * 0.3)
      .lineTo(Math.cos(a) * r, -40 + Math.sin(a) * r * 0.5)
      .stroke({ width: 1.2, color: HOT, alpha: 0.5 });
  }
  add(core, { pulse: 1.9 });
}

// B · Riss-Kern — solid dark mass, light bleeding out of glowing fractures.
function styleFracture(g, add, seed) {
  const rand = rng(seed);
  let base = 0;
  const glow = new Graphics();
  glow.blendMode = "add";
  for (const t of TIERS) {
    const a = A0 * t.fw;
    box(g, 0, base, a, t.h, { edgeAlpha: 0.8, rim: C2 });
    for (let f = 0; f < 3; f++) {                         // fractures running down the faces
      const right = f % 2 === 0;
      const from = right ? [0, base + a * ISO] : [-a, base];
      const to = right ? [a, base] : [0, base + a * ISO];
      const u = 0.25 + rand() * 0.5;
      let px = from[0] + (to[0] - from[0]) * u, py = from[1] + (to[1] - from[1]) * u - t.h * 0.92;
      const pts = [px, py];
      for (let s = 0; s < 5; s++) { px += (rand() - 0.5) * 12; py += t.h * 0.92 / 5; pts.push(px, py); }
      glow.poly(pts, false).stroke({ width: 7, color: C2, alpha: 0.09 });
      glow.poly(pts, false).stroke({ width: 1.6, color: HOT, alpha: 0.95 });
    }
    base -= t.h;
  }
  const seam = new Graphics();                            // the core seen through a seam
  seam.blendMode = "add";
  for (let i = 4; i >= 1; i--) seam.ellipse(0, -TIERS[0].h, 32 * i / 4, 10 * i / 4).fill({ color: C1, alpha: 0.1 });
  add(glow, { pulse: 2.4 });
  add(seam, { pulse: 1.3 });
}

// C · Draht-Skelett — no solid volume at all: edges, a breath of holo fill, scanlines.
function styleWire(g, add, _seed) {   // fully deterministic shape — no seeded variation needed
  let base = 0;
  const scan = new Graphics();
  for (const t of TIERS) {
    const a = A0 * t.fw, b = a * ISO;
    box(g, 0, base, a, t.h, { faceAlpha: 0.07, face: [C1, C1, C2], edgeWidth: 1.2, rim: C2 });
    for (let v = 6; v < t.h; v += 7) {
      scan.moveTo(-a, base - v).lineTo(0, base + b - v).stroke({ width: 1, color: HOT, alpha: 0.16 });
      scan.moveTo(0, base + b - v).lineTo(a, base - v).stroke({ width: 1, color: HOT, alpha: 0.16 });
    }
    base -= t.h;
  }
  add(scan, { scan: 7 });
  const proj = new Graphics();                            // ground projection of the footprint
  proj.blendMode = "add";
  for (let i = 3; i >= 1; i--) {
    const a = A0 * (1 + i * 0.13);
    proj.poly([0, -a * ISO, a, 0, 0, a * ISO, -a, 0]).stroke({ width: 1, color: C2, alpha: 0.14 });
  }
  add(proj, { pulse: 1.1 });
}

// D · Datenschichten — the mass as stacked plates with light in the gaps.
function styleStrata(g, add, seed) {
  const rand = rng(seed);
  let base = 0;
  const lit = new Graphics();
  lit.blendMode = "add";
  for (const t of TIERS) {
    const a = A0 * t.fw, SL = 6, GAP = 4;
    for (let y = 0; y < t.h - SL; y += SL + GAP) {
      const hot = rand() < 0.3;
      box(g, 0, base - y, a, SL, { edgeAlpha: hot ? 1 : 0.5, edgeWidth: hot ? 1.5 : 1, edge: hot ? C2 : C1 });
      if (hot) {
        lit.poly([-a, base - y - SL, 0, base - y - SL + a * ISO, a, base - y - SL, 0, base - y - SL - a * ISO])
          .fill({ color: C2, alpha: 0.18 });
      }
    }
    base -= t.h;
  }
  const spine = new Graphics();                           // light column visible through the gaps
  spine.blendMode = "add";
  for (let i = 3; i >= 1; i--) spine.rect(-3 * i, -TOTAL_H, 6 * i, TOTAL_H + 6).fill({ color: C1, alpha: 0.07 });
  add(spine, { pulse: 2.1 });
  add(lit, { pulse: 3.2 });
}

// E · Kristall — tapered prisms instead of boxes, lit from inside.
function styleCrystal(g, add, seed) {
  const rand = rng(seed);
  let base = 0;
  for (const t of TIERS) {
    const a = A0 * t.fw, a2 = a * (0.58 + rand() * 0.16), b = a * ISO, b2 = a2 * ISO;
    const dx = (rand() - 0.5) * 10;
    const L = [-a, base], R = [a, base], B = [0, base + b];
    const Lt = [dx - a2, base - t.h], Rt = [dx + a2, base - t.h];
    const Bt = [dx, base - t.h + b2], Tt = [dx, base - t.h - b2];
    g.poly([...L, ...B, ...Bt, ...Lt]).fill(0x08152a);
    g.poly([...B, ...R, ...Rt, ...Bt]).fill(0x0d1f3c);
    g.poly([...Lt, ...Tt, ...Rt, ...Bt]).fill(0x18355c);
    g.poly([...L, ...B, ...Bt, ...Lt]).stroke({ width: 1.3, color: C1, alpha: 0.9 });
    g.poly([...B, ...R, ...Rt, ...Bt]).stroke({ width: 1.3, color: C1, alpha: 0.9 });
    g.poly([...Lt, ...Tt, ...Rt, ...Bt]).stroke({ width: 1.4, color: C2, alpha: 0.95 });
    g.moveTo(...B).lineTo(...Tt).stroke({ width: 1, color: HOT, alpha: 0.28 });   // refraction
    g.moveTo(...L).lineTo(...Rt).stroke({ width: 1, color: HOT, alpha: 0.14 });
    base -= t.h;
  }
  const inner = new Graphics();                           // beam trapped inside the crystal
  inner.blendMode = "add";
  for (let i = 4; i >= 1; i--) inner.poly([-5 * i, 4, 5 * i, 4, 2.5 * i, -TOTAL_H - 8, -2.5 * i, -TOTAL_H - 8]).fill({ color: C1, alpha: 0.12 });
  inner.circle(0, -TOTAL_H - 10, 4).fill({ color: HOT, alpha: 0.95 });
  inner.circle(0, -TOTAL_H - 10, 16).fill({ color: C2, alpha: 0.3 });
  for (let i = 5; i >= 1; i--) inner.ellipse(0, 2, 40 * i / 5, 40 * ISO * i / 5).fill({ color: C1, alpha: 0.07 });
  add(inner, { pulse: 1.5 });
}

// F · Projektion — the upper floors are still a hologram; ties into the build-up animation.
function styleProjection(g, add, _seed) {   // fully deterministic shape — no seeded variation
  let base = 0;
  const ghost = new Graphics();
  ghost.blendMode = "add";
  TIERS.forEach((t, idx) => {
    const a = A0 * t.fw, b = a * ISO;
    if (idx === 0) {
      box(g, 0, base, a, t.h, { edgeAlpha: 1, rim: C2 });
    } else {
      box(ghost, 0, base, a, t.h, { faceAlpha: 0.05, face: [C1, C1, C1], edgeAlpha: 0.3, edgeWidth: 1, edge: C2 });
      for (let v = 0; v <= t.h; v += 5) {                 // dashed build-up rings
        ghost.poly([0, base - v - b, a, base - v, 0, base - v + b, -a, base - v])
          .stroke({ width: 0.8, color: C1, alpha: v % 15 === 0 ? 0.3 : 0.1 });
      }
    }
    for (const [cx, cy] of [[-a, base], [a, base], [0, base + b], [0, base - b]]) {
      ghost.moveTo(cx - 5, cy).lineTo(cx + 5, cy).stroke({ width: 1, color: C2, alpha: 0.55 });
      ghost.moveTo(cx, cy - 4).lineTo(cx, cy + 4).stroke({ width: 1, color: C2, alpha: 0.55 });
    }
    base -= t.h;
  });
  const axis = new Graphics();
  axis.blendMode = "add";
  axis.moveTo(0, 10).lineTo(0, -TOTAL_H - 24).stroke({ width: 1, color: C1, alpha: 0.35 });
  add(ghost, { pulse: 2.6 });
  add(axis, { pulse: 1.8 });
  const sweep = new Graphics();                           // scan sweep riding up the projection
  sweep.blendMode = "add";
  sweep.poly([-A0, 0, 0, A0 * ISO, A0, 0, 0, -A0 * ISO]).fill({ color: C1, alpha: 0.22 });
  add(sweep, { sweep: TOTAL_H });
}

const STYLES = [styleVoxel, styleFracture, styleWire, styleStrata, styleCrystal, styleProjection];

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const anim = [];
  const panels = STYLES.map((draw, i) => {
    const c = new Container();
    c.addChild(floorPlate(i + 1));
    const flare = baseFlare();
    c.addChild(flare);
    anim.push({ node: flare, pulse: 1.4, phase: i * 0.9 });
    const shards = shardField(i + 1);
    const g = new Graphics();
    // Effect layers belong ON TOP of the mass — registered here, added after the building below.
    const overlays = [];
    const reg = (child, spec) => { overlays.push(child); anim.push({ node: child, ...spec, phase: i * 1.7 }); };
    draw(g, reg, (i + 1) * 7919);
    c.addChild(g);
    for (const o of overlays) c.addChild(o);
    c.addChild(shards);
    anim.push({ node: shards, bob: 4, phase: i * 1.1 });
    app.stage.addChild(c);
    return c;
  });

  const layout = () => {
    const cols = app.screen.width < 900 ? 2 : 3;
    const rows = Math.ceil(panels.length / cols);
    const cw = app.screen.width / cols, ch = app.screen.height / rows;
    panels.forEach((p, i) => {
      // narrow cells put the label above a shorter panel, so the mass sits lower there
      p.position.set(cw * (i % cols) + cw / 2, ch * Math.floor(i / cols) + ch * (cols === 2 ? 0.92 : 0.78));
      p.scale.set(Math.min(1, cw / 360, ch / 300));
    });
  };
  layout();
  app.renderer.on("resize", layout);

  app.ticker.add(() => {
    const now = performance.now() / 1000;
    for (const a of anim) {
      if (a.pulse) a.node.alpha = 0.6 + 0.4 * Math.sin(now * a.pulse + a.phase);
      if (a.bob) a.node.y = Math.sin(now * 0.7 + a.phase) * a.bob;
      if (a.scan) a.node.y = (now * 9 + a.phase * 3) % a.scan;
      if (a.sweep) {
        const t = (now * 0.32 + a.phase * 0.2) % 1;
        a.node.y = -t * a.sweep;
        a.node.alpha = Math.sin(t * Math.PI) * 0.8;
      }
    }
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
