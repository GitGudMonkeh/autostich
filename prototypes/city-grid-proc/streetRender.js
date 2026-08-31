// Street rendering — road cells, markings and street furniture.
//
// Shared by the street study (streets.js) and the interactive city (city.js). A road cell is
// drawn from its CONNECTIONS: the carriageway is the centre square plus an arm toward every
// connected side, and the rest of the cell is raised footway. Junction, T, bend and dead end
// are therefore not four separate assets — they are one cell asked four different questions.
//
// Coordinates: (a, b) are continuous tile coordinates — a runs along +i (down-right), b along
// +j (down-left). Tile n covers a ∈ [n-0.5, n+0.5]. Heights are plain pixels above the ground.

import { dashLine, TILE_W, TILE_H } from "./buildings.js";

export const SEAM = 0xb06bff;              // hologrid violet — tile seams only
export const ASPHALT = 0x141225;
const KERB = 0x2f2a4a, KERB_TOP = 0x3b3560;
export const WHITE = 0xe9e6ff;

export const pt = (a, b, h = 0) => [(a - b) * (TILE_W / 2), (a + b) * (TILE_H / 2) - h];
export const quad = (p0, p1, p2, p3) => [...p0, ...p1, ...p2, ...p3];
// A patch of ground (optionally raised), and a vertical plane along a or along b.
export const slab = (a0, a1, b0, b1, h) => quad(pt(a0, b0, h), pt(a1, b0, h), pt(a1, b1, h), pt(a0, b1, h));
export const wallA = (a0, a1, b, h0, h1) => quad(pt(a0, b, h0), pt(a1, b, h0), pt(a1, b, h1), pt(a0, b, h1));
export const wallB = (b0, b1, a, h0, h1) => quad(pt(a, b0, h0), pt(a, b1, h0), pt(a, b1, h1), pt(a, b0, h1));

export const LANE = 0.32;                  // half width of the carriageway in tile units
export const A0 = -0.5, A1 = 2.5;          // the run is three tiles long

/* ---- ground ------------------------------------------------------------------------------ */

// Carriageway, raised kerbs, footways and the dashed hologrid tile seams underneath it all.
export function roadBed(g, lead) {
  g.poly(slab(A0, A1, -0.5, 0.5, 0)).fill(0x0d0b1a);                 // plot
  g.poly(slab(A0, A1, -LANE, LANE, 0)).fill(ASPHALT);                // carriageway
  for (const side of [-1, 1]) {                                      // kerb face + footway
    const inner = side * LANE, outer = side * 0.5;
    g.poly(wallA(A0, A1, inner, 0, 3)).fill(KERB);
    g.poly(slab(A0, A1, inner, outer, 3)).fill(KERB_TOP);
    g.poly(slab(A0, A1, inner, side * (LANE + 0.03), 3)).fill({ color: lead, alpha: 0.5 });
    for (let a = A0 + 0.12; a < A1; a += 0.24) {                     // paving joints
      const p = pt(a, inner, 3), q = pt(a, outer, 3);
      g.moveTo(p[0], p[1]).lineTo(q[0], q[1]);
    }
  }
  g.stroke({ width: 0.8, color: 0x241f3d, alpha: 0.9 });
  for (let n = 0; n <= 3; n++) {                                     // hologrid tile seams
    const p = pt(n - 0.5, -0.5), q = pt(n - 0.5, 0.5);
    dashLine(g, p[0], p[1], q[0], q[1], 5, 4);
  }
  g.stroke({ width: 1, color: SEAM, alpha: 0.35 });
}

export function centreLine(g, colour, dash = 9, gap = 7) {
  const p = pt(A0, 0), q = pt(A1, 0);
  dashLine(g, p[0], p[1], q[0], q[1], dash, gap);
  g.stroke({ width: 1.6, color: colour, alpha: 0.85 });
}

/* ---- street furniture -------------------------------------------------------------------- */

export function mast(g, a, b, h, w = 1.1) {
  g.moveTo(...pt(a, b, 0)).lineTo(...pt(a, b, h)).stroke({ width: w, color: 0x5a5480 });
  g.ellipse(...pt(a, b, 0), 3, 1.5).fill({ color: 0x000000, alpha: 0.45 });
}

// Street lamp: the light itself is small, the pool of light on the road does the work.
export function lamp(g, glow, a, b, colour) {
  mast(g, a, b, 26);
  const arm = b > 0 ? -0.16 : 0.16;
  g.moveTo(...pt(a, b, 26)).lineTo(...pt(a, b + arm, 27)).stroke({ width: 1.1, color: 0x5a5480 });
  const head = pt(a, b + arm, 27);
  g.poly([head[0] - 3, head[1], head[0] + 3, head[1], head[0] + 2, head[1] + 2.4, head[0] - 2, head[1] + 2.4])
    .fill({ color: colour, alpha: 0.95 });
  glow.ellipse(...pt(a, b + arm, 0), 26, 13).fill({ color: colour, alpha: 0.09 });
  glow.ellipse(...pt(a, b + arm, 0), 14, 7).fill({ color: colour, alpha: 0.08 });
  glow.circle(head[0], head[1] + 1, 6).fill({ color: colour, alpha: 0.3 });
}

// Traffic signal: mast, boom over the carriageway, three lamps of which one is live.
export function signal(g, glow, a, b, phase) {
  mast(g, a, b, 30, 1.3);
  const dir = b > 0 ? -1 : 1;
  g.moveTo(...pt(a, b, 30)).lineTo(...pt(a, b + dir * 0.3, 31)).stroke({ width: 1.1, color: 0x5a5480 });
  const head = pt(a, b + dir * 0.3, 31);
  g.poly([head[0] - 3.4, head[1] - 1, head[0] + 3.4, head[1] - 1,
    head[0] + 3.4, head[1] + 12, head[0] - 3.4, head[1] + 12]).fill(0x191531);
  g.poly([head[0] - 3.4, head[1] - 1, head[0] + 3.4, head[1] - 1,
    head[0] + 3.4, head[1] + 12, head[0] - 3.4, head[1] + 12])
    .stroke({ width: 0.9, color: 0x5a5480, alpha: 0.9 });
  const lamps = [0xff4d5e, 0xffc94a, 0x4dffa1];
  lamps.forEach((c, n) => {
    const on = n === phase;
    const y = head[1] + 1.6 + n * 3.6;
    g.circle(head[0], y, 1.4).fill({ color: c, alpha: on ? 1 : 0.16 });
    if (on) glow.circle(head[0], y, 6).fill({ color: c, alpha: 0.4 });
  });
  if (phase === 2) glow.ellipse(...pt(a, b + dir * 0.3, 0), 16, 8).fill({ color: lamps[2], alpha: 0.08 });
}

// Road sign on a post: a lit panel with abstract glyph bars — never faked lettering.
export function signPost(g, glow, a, b, colour, rand) {
  mast(g, a, b, 17);
  const w = 0.17, h0 = 17, h1 = 28;
  const face = wallA(a - w, a + w, b, h0, h1);
  g.poly(face).fill(0x120f26);
  g.poly(face).stroke({ width: 1, color: colour, alpha: 0.95 });
  for (let n = 0; n < 3; n++) {                                      // glyph bars
    const t0 = h0 + 2.5 + n * 3, len = 0.06 + rand() * 0.2;
    g.poly(wallA(a - w + 0.03, a - w + 0.03 + len, b, t0, t0 + 1.6)).fill({ color: colour, alpha: 0.9 });
  }
  glow.poly(wallA(a - w - 0.06, a + w + 0.06, b, h0 - 1.5, h1 + 1.5)).fill({ color: colour, alpha: 0.12 });
}

// Floating holo display: a panel hanging in the air over the street, with scanlines, a soft
// halo, a thin tether beam down to the ground and a light pool underneath.
export function holoDisplay(g, glow, a, b, h, w, tall, colour, rand) {
  const face = wallA(a - w, a + w, b, h, h + tall);
  glow.poly(wallA(a - w - 0.12, a + w + 0.12, b, h - 3, h + tall + 3)).fill({ color: colour, alpha: 0.1 });
  g.poly(face).fill({ color: colour, alpha: 0.16 });
  g.poly(face).stroke({ width: 1.1, color: colour, alpha: 0.9 });
  for (let t = h + 2; t < h + tall - 1; t += 2.6) {                  // scanlines
    const p0 = pt(a - w + 0.03, b, t), p1 = pt(a + w - 0.03, b, t);
    g.moveTo(p0[0], p0[1]).lineTo(p1[0], p1[1]);
  }
  g.stroke({ width: 0.8, color: colour, alpha: 0.4 });
  for (let n = 0; n < 2; n++) {                                      // a couple of bright blocks
    const s = a - w + 0.06 + rand() * (2 * w - 0.3);
    const t = h + 3 + rand() * (tall - 8);
    g.poly(wallA(s, s + 0.1 + rand() * 0.12, b, t, t + 2.4)).fill({ color: colour, alpha: 0.85 });
  }
  const foot = pt(a, b, 0), top = pt(a, b, h);
  g.moveTo(foot[0], foot[1]).lineTo(top[0], top[1]).stroke({ width: 1, color: colour, alpha: 0.22 });
  glow.ellipse(foot[0], foot[1], 18, 9).fill({ color: colour, alpha: 0.07 });
}

// Kiosk: a small lit box on the footway with an awning — the shop fronts of the reference.
export function kiosk(g, glow, a, b, colour) {
  const w = 0.2, side = Math.sign(b);
  g.poly(slab(a - w, a + w, b - side * 0.13, b + side * 0.06, 3)).fill(0x1d1836);
  g.poly(wallA(a - w, a + w, b - side * 0.13, 3, 16)).fill(0x241d40);
  g.poly(wallA(a - w + 0.04, a + w - 0.04, b - side * 0.13, 6, 13)).fill({ color: colour, alpha: 0.75 });
  g.poly(wallA(a - w, a + w, b - side * 0.13, 16, 17.4)).fill({ color: colour, alpha: 0.5 });
  glow.poly(wallA(a - w - 0.08, a + w + 0.08, b - side * 0.13, 4, 18)).fill({ color: colour, alpha: 0.11 });
  glow.ellipse(...pt(a, b - side * 0.2, 0), 15, 7).fill({ color: colour, alpha: 0.08 });
}

// Gantry: two masts and a beam across the carriageway carrying displays.
export function gantry(g, glow, a, colour, rand) {
  mast(g, a, -0.46, 34, 1.4);
  mast(g, a, 0.46, 34, 1.4);
  g.poly(wallB(-0.46, 0.46, a, 34, 36.4)).fill(0x241d40);
  g.poly(wallB(-0.46, 0.46, a, 34, 36.4)).stroke({ width: 1, color: 0x5a5480, alpha: 0.9 });
  for (let n = 0; n < 3; n++) {                                      // display boxes under the beam
    const b0 = -0.34 + n * 0.24;
    g.poly(wallB(b0, b0 + 0.17, a, 28, 33.6)).fill(0x120f26);
    g.poly(wallB(b0, b0 + 0.17, a, 28, 33.6)).stroke({ width: 0.9, color: colour, alpha: 0.9 });
    for (let r = 0; r < 2; r++) {
      const t = 29.4 + r * 2.4;
      g.poly(wallB(b0 + 0.02, b0 + 0.05 + rand() * 0.1, a, t, t + 1.5)).fill({ color: colour, alpha: 0.9 });
    }
    glow.poly(wallB(b0 - 0.04, b0 + 0.21, a, 26.5, 35)).fill({ color: colour, alpha: 0.1 });
  }
}

export function bollard(g, a, b, colour) {
  g.moveTo(...pt(a, b, 3)).lineTo(...pt(a, b, 8)).stroke({ width: 1.6, color: 0x3b3560 });
  g.circle(...pt(a, b, 8.6), 1).fill({ color: colour, alpha: 0.95 });
}

// Ground display: an information strip set into the footway, flush with the paving.
export function groundPanel(g, glow, a, b, colour) {
  const p = slab(a - 0.14, a + 0.14, b - 0.05, b + 0.05, 3.2);
  g.poly(p).fill({ color: colour, alpha: 0.55 });
  g.poly(p).stroke({ width: 0.8, color: colour, alpha: 0.9 });
  glow.poly(slab(a - 0.2, a + 0.2, b - 0.1, b + 0.1, 3.2)).fill({ color: colour, alpha: 0.12 });
}


/* ---- connection pieces --------------------------------------------------------------------- */

// One road cell driven by its connections. The carriageway is the centre square plus an arm
// toward every connected side; everything else on the cell is raised footway. That is the same
// model the city grid uses, so a piece drawn here is the piece the grid would place.
export function roadCell(g, ca, cb, conn, lead) {
  const L = LANE, H = 0.5;
  const A = (x) => ca + x, B = (y) => cb + y;
  g.poly(slab(A(-H), A(H), B(-H), B(H), 0)).fill(0x0d0b1a);
  g.poly(slab(A(-L), A(L), B(-L), B(L), 0)).fill(ASPHALT);
  if (conn.pa) g.poly(slab(A(L), A(H), B(-L), B(L), 0)).fill(ASPHALT);
  if (conn.na) g.poly(slab(A(-H), A(-L), B(-L), B(L), 0)).fill(ASPHALT);
  if (conn.pb) g.poly(slab(A(-L), A(L), B(L), B(H), 0)).fill(ASPHALT);
  if (conn.nb) g.poly(slab(A(-L), A(L), B(-H), B(-L), 0)).fill(ASPHALT);

  // footway = the tile minus the arms: four corner blocks plus the stub of every closed side
  const blocks = [];
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
    blocks.push([Math.min(sa * L, sa * H), Math.max(sa * L, sa * H),
      Math.min(sb * L, sb * H), Math.max(sb * L, sb * H)]);
  }
  if (!conn.pa) blocks.push([L, H, -L, L]);
  if (!conn.na) blocks.push([-H, -L, -L, L]);
  if (!conn.pb) blocks.push([-L, L, L, H]);
  if (!conn.nb) blocks.push([-L, L, -H, -L]);
  blocks.sort((x, y) => (x[1] + y[3]) - (y[1] + x[3]));
  for (const [a0, a1, b0, b1] of blocks) {
    g.poly(wallA(A(a0), A(a1), B(b1), 0, 3)).fill(KERB);        // kerb faces toward the camera
    g.poly(wallB(B(b0), B(b1), A(a1), 0, 3)).fill(KERB);
    g.poly(slab(A(a0), A(a1), B(b0), B(b1), 3)).fill(KERB_TOP);
    for (let a = a0 + 0.06; a < a1; a += 0.16) {                // paving joints
      g.moveTo(...pt(A(a), B(b0), 3)).lineTo(...pt(A(a), B(b1), 3));
    }
  }
  g.stroke({ width: 0.8, color: 0x241f3d, alpha: 0.9 });
  for (const [a0, a1, b0, b1] of blocks) {                      // kerb light along the road edge
    g.poly(slab(A(a0), A(a1), B(b0), B(b0 + 0.03), 3)).fill({ color: lead, alpha: 0.45 });
    g.poly(slab(A(a0), A(a0 + 0.03), B(b0), B(b1), 3)).fill({ color: lead, alpha: 0.45 });
  }
  const seam = [[A(-H), B(-H)], [A(H), B(-H)], [A(H), B(H)], [A(-H), B(H)]];
  for (let n = 0; n < 4; n++) {                                 // hologrid tile seam
    const p = pt(...seam[n]), q = pt(...seam[(n + 1) % 4]);
    dashLine(g, p[0], p[1], q[0], q[1], 5, 4);
  }
  g.stroke({ width: 1, color: SEAM, alpha: 0.3 });
}

// Lane dashes from the cell centre out to every connected edge.
export function cellMarkings(g, ca, cb, conn, colour) {
  const ends = [];
  if (conn.pa) ends.push([ca + 0.5, cb]);
  if (conn.na) ends.push([ca - 0.5, cb]);
  if (conn.pb) ends.push([ca, cb + 0.5]);
  if (conn.nb) ends.push([ca, cb - 0.5]);
  for (const [ea, eb] of ends) {
    const p = pt(ca + (ea - ca) * 0.42, cb + (eb - cb) * 0.42), q = pt(ea, eb);
    dashLine(g, p[0], p[1], q[0], q[1], 7, 6);
  }
  g.stroke({ width: 1.5, color: colour, alpha: 0.8 });
}

// Zebra crossing across one arm, just outside the junction box.
export function crossing(g, ca, cb, dir, colour) {
  const along = dir === "pa" || dir === "na";
  const sgn = dir === "pa" || dir === "pb" ? 1 : -1;
  for (let n = 0; n < 5; n++) {
    const t = -LANE + 0.03 + n * 0.14;
    const off = sgn * (LANE + 0.06);
    const q = along
      ? slab(ca + off - sgn * 0.05, ca + off + sgn * 0.05, cb + t, cb + t + 0.08, 0.4)
      : slab(ca + t, ca + t + 0.08, cb + off - sgn * 0.05, cb + off + sgn * 0.05, 0.4);
    g.poly(q).fill({ color: colour, alpha: 0.55 });
  }
}

// Stop bar and a lit junction box — what tells the eye this is a controlled crossing.
export function junctionBox(g, glow, ca, cb, colour) {
  g.poly(slab(ca - LANE, ca + LANE, cb - LANE, cb + LANE, 0.3))
    .stroke({ width: 1, color: colour, alpha: 0.35 });
  glow.poly(slab(ca - LANE, ca + LANE, cb - LANE, cb + LANE, 0.3))
    .fill({ color: colour, alpha: 0.05 });
}

const ROAD_OPP = { pa: "na", na: "pa", pb: "nb", nb: "pb" };
const OFF = { pa: [1, 0], na: [-1, 0], pb: [0, 1], nb: [0, -1] };

// A piece = the centre cell plus one straight neighbour on every connected side, so the streets
// run off the edge instead of stopping in mid-air.
export function drawPiece(g, glow, dirs, lead, marking) {
  const conn = { pa: false, na: false, pb: false, nb: false };
  for (const d of dirs) conn[d] = true;
  const cells = [[0, 0, conn]];
  for (const d of dirs) {
    const [da, db] = OFF[d];
    const through = { pa: false, na: false, pb: false, nb: false };
    through[d] = true;
    through[ROAD_OPP[d]] = true;
    cells.push([da, db, through]);
  }
  cells.sort((x, y) => (x[0] + x[1]) - (y[0] + y[1]));
  for (const [ca, cb, cn] of cells) roadCell(g, ca, cb, cn, lead);
  for (const [ca, cb, cn] of cells) cellMarkings(g, ca, cb, cn, marking);
  if (dirs.length >= 3) junctionBox(g, glow, 0, 0, lead);
  return conn;
}

