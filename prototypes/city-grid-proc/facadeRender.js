// Facade rendering — the shell of a voxel mass drawn as continuous walls with real windows.
//
// Shared by the facade study (facades.js) and the interactive city (city.js). Only the visible
// faces of the shell are filled, in flat tones, so coplanar faces merge into walls; outlines are
// stroked only where a face borders empty space. The architecture then lives ON those walls —
// one lattice cell is one floor module.

import { Graphics } from "./vendor/pixi.min.mjs";
import { ISO, CS, P, rng } from "./buildings.js";

const FACE_HOLO = 0xb06bff;                // hologrid violet — the one accent on a facade
const FACE_R = 0x2a2446;            // right face — the lit side
const FACE_L = 0x171334;            // left face — in shadow
const FACE_T = 0x342c55;            // roof slab

/* ---- face geometry ---------------------------------------------------------------------- */

export const topPoly = (i, j, k) => [
  ...P(i - 0.5, j - 0.5, k + 1), ...P(i + 0.5, j - 0.5, k + 1),
  ...P(i + 0.5, j + 0.5, k + 1), ...P(i - 0.5, j + 0.5, k + 1)];
// Face-space points: s runs along the wall, t upward. One cell = one floor module.
const rPt = (i, j, k, s, t) => P(i + 0.5, j - 0.5 + s, k + t);   // +i wall (right)
const lPt = (i, j, k, s, t) => P(i - 0.5 + s, j + 0.5, k + t);   // +j wall (left)
const faceQuad = (pt, i, j, k, s0, s1, t0, t1) => [
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
export const WIN_SETS = {
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
  const q = faceQuad(pt, i, j, k, s0, s1, t0, t1);
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
  glow.poly(faceQuad(pt, i, j, k, s0 - 0.1, s1 + 0.1, t0 - 0.1, t1 + 0.1)).fill({ color: c, alpha: a1 });
  glow.poly(faceQuad(pt, i, j, k, s0 - 0.28, s1 + 0.28, t0 - 0.28, t1 + 0.28)).fill({ color: c, alpha: a2 });
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
  g.poly(faceQuad(pt, i, j, k, 0.15, 0.85, 0.15, 0.85)).stroke({ width: 2, color: STEEL, alpha: 0.7 });
  if (k % 3 === 0) g.poly(faceQuad(pt, i, j, k, 0, 1, 0, 0.11)).fill({ color: 0x3b3366, alpha: 1 });
  if ((i + j + k) % 5 === 0) {
    g.moveTo(...pt(i, j, k, 0.12, 0.12)).lineTo(...pt(i, j, k, 0.88, 0.88))
      .stroke({ width: 1.3, color: FACE_HOLO, alpha: 0.8 });          // holo brace
  }
}

export const VARIANTS = [
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


// Build one facade into height bands. Bands exist so the build animation can switch whole
// floors without redrawing geometry; the additive twin carries the window bloom of that floor.
export function buildFacade(cells, variant, win, seed, bands = 14) {
  const { faces, has } = shellFaces(cells);
  let minK = Infinity, maxK = -Infinity;
  for (const [, , k] of cells) { minK = Math.min(minK, k); maxK = Math.max(maxK, k); }
  const bandOf = (k) => Math.min(bands - 1, Math.max(0, Math.floor(((k - minK) / (maxK - minK + 1)) * bands)));
  const solid = Array.from({ length: bands }, () => new Graphics());
  const glows = Array.from({ length: bands }, () => {
    const gg = new Graphics();
    gg.blendMode = "add";
    return gg;
  });
  const sorted = faces.slice().sort((a, b) => (a.i + a.j + a.k) - (b.i + b.j + b.k));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const f of sorted) {
    const g = solid[bandOf(f.k)], glow = glows[bandOf(f.k)];
    const rand = rng((f.i * 73856093) ^ (f.j * 19349663) ^ (f.k * 83492791) ^ seed);
    if (f.kind === "top") {
      g.poly(topPoly(f.i, f.j, f.k)).fill(FACE_T);
      roofDetail(g, glow, f, rand, maxK, win);
    } else {
      const pt = f.kind === "right" ? rPt : lPt;
      g.poly(faceQuad(pt, f.i, f.j, f.k, 0, 1, 0, 1)).fill(f.kind === "right" ? FACE_R : FACE_L);
      variant.draw(g, { pt, i: f.i, j: f.j, k: f.k, rand, ground: f.k === minK, win, glow });
      if (f.k > minK && f.k < maxK - 1 && has(f.i, f.j, f.k + 1) && rand() < 0.09) {
        wallSign(g, glow, f, win);
      }
    }
    if (outline(g, f, has)) g.stroke({ width: 1.2, color: STEEL, alpha: 0.75 });
    const [x, y] = P(f.i, f.j, f.k);
    minX = Math.min(minX, x - CS); maxX = Math.max(maxX, x + CS);
    minY = Math.min(minY, y - CS * (1 + ISO)); maxY = Math.max(maxY, y + CS * ISO);
  }
  return { solid, glows, minK, maxK, box: { minX, maxX, minY, maxY } };
}
