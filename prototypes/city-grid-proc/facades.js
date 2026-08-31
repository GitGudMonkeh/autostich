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
import { vehicle, VEHICLES } from "./vehicles.js";

const C1 = 0x35d6ff, C2 = 0xb06bff, HOT = 0xe8fbff;
// Reference palette: walls are plum/navy and clearly lit, not near-black. The contrast that
// carries the picture comes from big glowing panes, not from a black facade.
const FACE_R = 0x2a2446;            // right face — the lit side
const FACE_L = 0x171334;            // left face — in shadow
const FACE_T = 0x342c55;            // roof slab
const BUILD_MS = 2600;

/* ---- face geometry ---------------------------------------------------------------------- */

const topPoly = (i, j, k) => [
  ...P(i - 0.5, j - 0.5, k + 1), ...P(i + 0.5, j - 0.5, k + 1),
  ...P(i + 0.5, j + 0.5, k + 1), ...P(i - 0.5, j + 0.5, k + 1)];
// Face-space points: s runs along the wall, t upward. One cell = one floor module.
const rPt = (i, j, k, s, t) => P(i + 0.5, j - 0.5 + s, k + t);   // +i wall (right)
const lPt = (i, j, k, s, t) => P(i - 0.5 + s, j + 0.5, k + t);   // +j wall (left)
const quad = (pt, i, j, k, s0, s1, t0, t1) => [
  ...pt(i, j, k, s0, t0), ...pt(i, j, k, s1, t0), ...pt(i, j, k, s1, t1), ...pt(i, j, k, s0, t1)];

export function shellFaces(cells) {
  const occ = new Set(cells.map(([i, j, k]) => `${i}|${j}|${k}`));
  const has = (i, j, k) => occ.has(`${i}|${j}|${k}`);
  const faces = [];
  for (const [i, j, k] of cells) {
    if (!has(i, j, k + 1)) faces.push({ kind: "top", i, j, k });
    if (!has(i + 1, j, k)) faces.push({ kind: "right", i, j, k });
    if (!has(i, j + 1, k)) faces.push({ kind: "left", i, j, k });
  }
  return { faces, has };
}

// Stroke only the edges where a face borders nothing — that is what makes merged walls read as
// one volume instead of a grid of tiles.
function outline(g, f, has) {
  const { kind, i, j, k } = f;
  const seg = [];
  if (kind === "top") {
    const vis = (di, dj) => has(i + di, j + dj, k) && !has(i + di, j + dj, k + 1);
    const A = P(i - 0.5, j - 0.5, k + 1), B = P(i + 0.5, j - 0.5, k + 1);
    const C = P(i + 0.5, j + 0.5, k + 1), D = P(i - 0.5, j + 0.5, k + 1);
    if (!vis(1, 0)) seg.push([B, C]);
    if (!vis(-1, 0)) seg.push([A, D]);
    if (!vis(0, 1)) seg.push([D, C]);
    if (!vis(0, -1)) seg.push([A, B]);
  } else if (kind === "right") {
    const vis = (dj, dk) => has(i, j + dj, k + dk) && !has(i + 1, j + dj, k + dk);
    if (!vis(1, 0)) seg.push([rPt(i, j, k, 1, 0), rPt(i, j, k, 1, 1)]);
    if (!vis(-1, 0)) seg.push([rPt(i, j, k, 0, 0), rPt(i, j, k, 0, 1)]);
    if (!vis(0, 1)) seg.push([rPt(i, j, k, 0, 1), rPt(i, j, k, 1, 1)]);
    if (!vis(0, -1)) seg.push([rPt(i, j, k, 0, 0), rPt(i, j, k, 1, 0)]);
  } else {
    const vis = (di, dk) => has(i + di, j, k + dk) && !has(i + di, j + 1, k + dk);
    if (!vis(1, 0)) seg.push([lPt(i, j, k, 1, 0), lPt(i, j, k, 1, 1)]);
    if (!vis(-1, 0)) seg.push([lPt(i, j, k, 0, 0), lPt(i, j, k, 0, 1)]);
    if (!vis(0, 1)) seg.push([lPt(i, j, k, 0, 1), lPt(i, j, k, 1, 1)]);
    if (!vis(0, -1)) seg.push([lPt(i, j, k, 0, 0), lPt(i, j, k, 1, 0)]);
  }
  for (const [a, b] of seg) g.moveTo(a[0], a[1]).lineTo(b[0], b[1]);
  return seg.length;
}

/* ---- facade languages ------------------------------------------------------------------- */

const GLASS = 0x0d0a20;
// One lead colour per BUILDING plus a lighter shade of it — never a mixed set. Drawing every
// window from a four-colour pool turned each tower into a rainbow; a building reads as one
// building only if its lights agree. The palette stays with the building across all variants,
// so the facade comparison is not disturbed by a colour change.
const WIN_SETS = {
  kragturm: [0x8ceaff, 0xd6f2ff],   // ice blue
  torbau: [0xffc478, 0xffe2b0],     // amber
  drilling: [0xff8ad8, 0xffc2ec],   // magenta
};
const STEEL = 0x8a7fc4;   // frames and railings — cool grey-violet, reads on plum

// One window pane. Big, bright and bleeding onto the wall — that light bleed is what makes the
// reference read as a lit city instead of a diagram. `glow` is the additive layer of the same
// height band, so the bloom appears and disappears with its floor during the build.
function pane(g, glow, f, s0, s1, t0, t1) {
  const { pt, i, j, k, rand, win } = f;
  const q = quad(pt, i, j, k, s0, s1, t0, t1);
  g.poly(q).fill(GLASS);
  // Most flats are dark. A facade where everything burns reads as a light box, not a building —
  // the reference keeps plenty of unlit glass so the wall itself stays visible between the lights.
  if (rand() > (f.litP ?? 0.42)) {
    g.poly(q).stroke({ width: 0.8, color: STEEL, alpha: 0.3 });
    return;
  }
  const c = rand() < 0.82 ? win[0] : win[1];
  const hot = rand() < 0.22;                                  // a few panes burn properly
  g.poly(q).fill({ color: c, alpha: hot ? 0.72 : 0.34 + rand() * 0.2 });
  g.poly(q).stroke({ width: 0.8, color: 0xffffff, alpha: hot ? 0.4 : 0.2 });
  if (!glow) return;
  const a1 = hot ? 0.13 : 0.06, a2 = hot ? 0.055 : 0.025;
  glow.poly(quad(pt, i, j, k, s0 - 0.1, s1 + 0.1, t0 - 0.1, t1 + 0.1)).fill({ color: c, alpha: a1 });
  glow.poly(quad(pt, i, j, k, s0 - 0.28, s1 + 0.28, t0 - 0.28, t1 + 0.28)).fill({ color: c, alpha: a2 });
}

// A · Rasterfassade — two windows per module over a floor band. The ordinary office tower,
//     which is exactly why it reads as a building and not as a prop.
function facadeGrid(g, f) {
  const { pt, i, j, k, ground } = f;
  if (ground) {                                                // lobby: one wide lit shopfront
    pane(g, f.glow, { ...f, litP: 0.9 }, 0.07, 0.93, 0.12, 0.76);
    g.moveTo(...pt(i, j, k, 0.02, 0.84)).lineTo(...pt(i, j, k, 0.98, 0.84))
      .stroke({ width: 1.4, color: f.win[1], alpha: 0.7 });    // entrance canopy
    return;
  }
  for (const [s0, s1] of [[0.11, 0.45], [0.55, 0.89]]) pane(g, f.glow, f, s0, s1, 0.2, 0.8);
  g.moveTo(...pt(i, j, k, 0, 0.06)).lineTo(...pt(i, j, k, 1, 0.06))
    .stroke({ width: 1, color: STEEL, alpha: 0.28 });          // floor band
}

// B · Bandfassade — continuous ribbon glazing with spandrels between. Horizontal, calmer,
//     and the lit band carries the neon colour without the whole block glowing.
function facadeRibbon(g, f) {
  const { pt, i, j, k, ground, win } = f;
  const t0 = ground ? 0.12 : 0.24, t1 = ground ? 0.8 : 0.76;
  pane(g, f.glow, { ...f, litP: ground ? 0.9 : 0.58 }, 0.04, 0.96, t0, t1);
  g.moveTo(...pt(i, j, k, 0.03, t1)).lineTo(...pt(i, j, k, 0.97, t1))
    .stroke({ width: 1.2, color: win[1], alpha: 0.6 });        // bright lip of the band
  for (const s of [0.28, 0.52, 0.76]) {
    g.moveTo(...pt(i, j, k, s, t0)).lineTo(...pt(i, j, k, s, t1));
  }
  g.stroke({ width: 1, color: 0x0b0820, alpha: 0.8 });         // mullions
  g.moveTo(...pt(i, j, k, 0, t0 - 0.03)).lineTo(...pt(i, j, k, 1, t0 - 0.03))
    .stroke({ width: 1, color: STEEL, alpha: 0.22 });
}

// C · Exoskelett — the structure sits outside the glass. Every third floor gets a heavier beam,
//     and the diagonal braces are the one place where the hologrid shows through the building.
function facadeExo(g, f) {
  const { pt, i, j, k } = f;
  pane(g, f.glow, { ...f, litP: 0.4 }, 0.16, 0.84, 0.16, 0.84);
  g.poly(quad(pt, i, j, k, 0.15, 0.85, 0.15, 0.85)).stroke({ width: 2, color: STEEL, alpha: 0.7 });
  if (k % 3 === 0) g.poly(quad(pt, i, j, k, 0, 1, 0, 0.11)).fill({ color: 0x3b3366, alpha: 1 });
  if ((i + j + k) % 5 === 0) {
    g.moveTo(...pt(i, j, k, 0.12, 0.12)).lineTo(...pt(i, j, k, 0.88, 0.88))
      .stroke({ width: 1.3, color: C2, alpha: 0.8 });          // holo brace
  }
}

const VARIANTS = [
  { key: "grid", name: "Rasterfassade", desc: "Zwei Fenster je Modul über einem Geschossband. Der gewöhnliche Büroturm — genau deshalb liest er sich als Gebäude.", draw: facadeGrid },
  { key: "ribbon", name: "Bandfassade", desc: "Durchlaufende Fensterbänder mit Brüstungen dazwischen. Ruhiger, horizontal, das Lichtband trägt die Neonfarbe.", draw: facadeRibbon },
  { key: "exo", name: "Exoskelett", desc: "Tragwerk vor dem Glas, schwerer Riegel je drittes Geschoss. Die Diagonalen sind der einzige Ort, an dem das Hologrid durchscheint.", draw: facadeExo },
];

// A small box standing on a roof slab: two visible sides plus the top.
function roofBox(g, i, j, lv, s, h, top, side) {
  const A = P(i - s, j - s, lv + h), B = P(i + s, j - s, lv + h);
  const C = P(i + s, j + s, lv + h), D = P(i - s, j + s, lv + h);
  g.poly([...B, ...C, ...P(i + s, j + s, lv), ...P(i + s, j - s, lv)]).fill(side);
  g.poly([...D, ...C, ...P(i + s, j + s, lv), ...P(i - s, j + s, lv)]).fill(side);
  g.poly([...A, ...B, ...C, ...D]).fill(top);
  return [A, B, C, D];
}

// What the reference actually shows on its roofs: a parapet, planting, plant housings, and a lit
// sign box on the crown. Without this the roofs are the one surface that stays empty.
function roofDetail(g, glow, f, rand, maxK, win) {
  const { i, j, k } = f;
  const lv = k + 1;
  g.poly([...P(i - 0.5, j - 0.5, lv + 0.14), ...P(i + 0.5, j - 0.5, lv + 0.14),
    ...P(i + 0.5, j + 0.5, lv + 0.14), ...P(i - 0.5, j + 0.5, lv + 0.14)])
    .stroke({ width: 1, color: STEEL, alpha: 0.45 });          // parapet rail
  const r = rand();
  if (k === maxK) {                                            // lit sign box on the crown
    roofBox(g, i, j, lv, 0.3, 0.5, 0x2a2247, 0x1d1836);
    const face = [...P(i + 0.3, j - 0.3, lv + 0.44), ...P(i + 0.3, j + 0.3, lv + 0.44),
      ...P(i + 0.3, j + 0.3, lv + 0.1), ...P(i + 0.3, j - 0.3, lv + 0.1)];
    g.poly(face).fill({ color: win[0], alpha: 0.85 });
    g.poly(face).stroke({ width: 1, color: 0xffffff, alpha: 0.5 });
    glow.poly([...P(i + 0.55, j - 0.55, lv + 0.7), ...P(i + 0.55, j + 0.55, lv + 0.7),
      ...P(i + 0.55, j + 0.55, lv - 0.15), ...P(i + 0.55, j - 0.55, lv - 0.15)])
      .fill({ color: win[0], alpha: 0.14 });
    return;
  }
  if (r < 0.34) {                                              // planting boxes
    for (const [du, dv] of [[-0.22, -0.18], [0.2, 0.24], [0.05, -0.26]]) {
      const [x, y] = P(i + du, j + dv, lv);
      g.ellipse(x, y - 1.5, 3.4, 2.4).fill(0x1e5c3c);
      g.ellipse(x - 0.8, y - 2.6, 2.2, 1.5).fill(0x2f8a58);
    }
  } else if (r < 0.62) {                                       // plant housing + vent
    roofBox(g, i - 0.14, j + 0.1, lv, 0.2, 0.32, 0x3b3366, 0x241d40);
    g.moveTo(...P(i + 0.26, j - 0.2, lv)).lineTo(...P(i + 0.26, j - 0.2, lv + 0.7))
      .stroke({ width: 1, color: STEEL, alpha: 0.7 });
  }
}

// A vertical sign standing proud of the wall — the pink pylons of the reference.
function wallSign(g, glow, f, win) {
  const { kind, i, j, k } = f;
  const d = 0.22;
  const q = kind === "right"
    ? (u, t) => P(i + 0.5 + d, j - 0.5 + u, k + t)
    : (u, t) => P(i - 0.5 + u, j + 0.5 + d, k + t);
  const body = [...q(0.28, -0.05), ...q(0.72, -0.05), ...q(0.72, 1.85), ...q(0.28, 1.85)];
  g.poly(body).fill(0x140f2c);
  g.poly(body).stroke({ width: 1, color: win[0], alpha: 0.9 });
  g.poly([...q(0.37, 0.08), ...q(0.63, 0.08), ...q(0.63, 1.72), ...q(0.37, 1.72)])
    .fill({ color: win[0], alpha: 0.75 });
  glow.poly([...q(0.05, -0.35), ...q(0.95, -0.35), ...q(0.95, 2.15), ...q(0.05, 2.15)])
    .fill({ color: win[0], alpha: 0.13 });
}

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
  const { faces, has } = shellFaces(cells);
  let minK = Infinity, maxK = -Infinity, si = 0, sj = 0;
  for (const [i, j, k] of cells) { minK = Math.min(minK, k); maxK = Math.max(maxK, k); si += i; sj += j; }
  const ci = si / cells.length, cj = sj / cells.length;
  const ox = -(ci - cj) * CS, oy = -(ci + cj) * CS * ISO;

  const BANDS = 14;
  const bandOf = (k) => Math.min(BANDS - 1, Math.max(0, Math.floor(((k - minK) / (maxK - minK + 1)) * BANDS)));
  const bands = Array.from({ length: BANDS }, () => new Graphics());
  // Additive twin of every height band: the window bloom has to appear and vanish with its own
  // floor during the build, so it cannot live on one shared layer.
  const glows = Array.from({ length: BANDS }, () => {
    const gg = new Graphics();
    gg.blendMode = "add";
    return gg;
  });
  for (const b of [...bands, ...glows]) b.position.set(ox, oy);

  const sorted = faces.slice().sort((a, b) => (a.i + a.j + a.k) - (b.i + b.j + b.k));
  let minX = -100, maxX = 100, minY = -50, maxY = 50;
  for (const f of sorted) {
    const g = bands[bandOf(f.k)];
    const rand = rng((f.i * 73856093) ^ (f.j * 19349663) ^ (f.k * 83492791) ^ seed);
    const glow = glows[bandOf(f.k)];
    if (f.kind === "top") {
      g.poly(topPoly(f.i, f.j, f.k)).fill(FACE_T);
      roofDetail(g, glow, f, rand, maxK, win);
    } else {
      const pt = f.kind === "right" ? rPt : lPt;
      g.poly(quad(pt, f.i, f.j, f.k, 0, 1, 0, 1)).fill(f.kind === "right" ? FACE_R : FACE_L);
      variant.draw(g, { pt, i: f.i, j: f.j, k: f.k, rand, ground: f.k === minK, win, glow });
      // one sign per few walls, and only where there is wall above it to hang on
      if (f.k > minK && f.k < maxK - 1 && has(f.i, f.j, f.k + 1) && rand() < 0.09) {
        wallSign(g, glow, f, win);
      }
    }
    if (outline(g, f, has)) g.stroke({ width: 1.2, color: STEEL, alpha: 0.75 });
    const [x, y] = P(f.i, f.j, f.k);
    minX = Math.min(minX, x + ox - CS); maxX = Math.max(maxX, x + ox + CS);
    minY = Math.min(minY, y + oy - CS * (1 + ISO)); maxY = Math.max(maxY, y + oy + CS * ISO);
  }

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
