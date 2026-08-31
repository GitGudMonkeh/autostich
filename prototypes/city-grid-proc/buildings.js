// Shared building definitions for the city-grid style studies.
//
// The three silhouettes live here so the voxel study (voxel.js) and the facade study
// (facades.js) show the SAME buildings — a variant comparison is worthless if the massing
// quietly differs between pages.
//
// Lattice → screen: 2:1 isometry, +i goes right-down, +j left-down, +k up. A cell (i,j,k)
// occupies [i±0.5, j±0.5] and the height band k..k+1, so fractional coordinates address the
// corners and faces of a cell.

export const TILE_W = 132, TILE_H = 66;   // one grid cell in screen px
export const ISO = 0.5;
export const CS = 11;                 // voxel half-width in px
export const P = (i, j, level) => [(i - j) * CS, (i + j) * CS * ISO - level * CS];

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

export function dashLine(g, x1, y1, x2, y2, dash = 4, gap = 5) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  for (let t = 0; t < len; t += dash + gap) {
    const e = Math.min(t + dash, len);
    g.moveTo(x1 + ux * t, y1 + uy * t).lineTo(x1 + ux * e, y1 + uy * e);
  }
}

export function volume() {
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

// Wireframe box over a lattice range — edges only, on purpose.
export function cageBox(g, i0, i1, j0, j1, k0, k1, alpha = 0.45, dashed = false, color = 0xb06bff) {
  const a = i0 - 0.5, b = i1 + 0.5, c = j0 - 0.5, d = j1 + 0.5;
  const corners = (lv) => [P(a, c, lv), P(b, c, lv), P(b, d, lv), P(a, d, lv)];
  const bot = corners(k0), top = corners(k1 + 1);
  const ring = (pts) => {
    for (let n = 0; n < 4; n++) {
      const p = pts[n], q = pts[(n + 1) % 4];
      if (dashed) dashLine(g, p[0], p[1], q[0], q[1], 5, 4);
      else g.moveTo(p[0], p[1]).lineTo(q[0], q[1]);
    }
  };
  ring(bot); ring(top);
  for (let n = 0; n < 4; n++) g.moveTo(bot[n][0], bot[n][1]).lineTo(top[n][0], top[n][1]);
  g.stroke({ width: 1, color, alpha });
}

// 1 · Kragturm — slender shaft, cantilevered block, counterweight. Asymmetric on purpose:
//     the silhouette has to stay recognisable from any of the four iso rotations.
export const KRAGTURM = {
  key: "kragturm",
  name: "Kragturm",
  desc: "Schlanker Schaft, auskragender Block, Gegengewicht.",
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
    cageBox(g, 1, 3, 1, 3, 0, 21, 0.4);
    cageBox(g, 4, 6, 1, 3, 11, 13, 0.6);
    cageBox(g, 0, 4, 0, 4, 0, 2, 0.28, true);
    g.moveTo(...P(3.5, 2, 14)).lineTo(...P(6.5, 2, 11))
      .moveTo(...P(6.5, 2, 14)).lineTo(...P(3.5, 2, 11))
      .stroke({ width: 1, color: 0xb06bff, alpha: 0.5 });
  },
};

// 2 · Torbau — two legs and a bridge; the hole in the middle is the whole point.
export const TORBAU = {
  key: "torbau",
  name: "Torbau",
  desc: "Zwei Beine, Brückenriegel, echtes Loch in der Mitte.",
  build() {
    const v = volume();
    v.add(0, 1, 0, 2, 0, 12);         // leg A — slim, so the opening stays wide
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
    for (let k = 2; k <= 11; k += 3) {
      const l = P(1.5, 1, k), r = P(5.5, 1, k);
      dashLine(g, l[0], l[1], r[0], r[1], 4, 5);
    }
    g.stroke({ width: 1, color: 0xb06bff, alpha: 0.4 });
  },
};

// 3 · Drillingsturm — three shafts of different heights, tied by wireframe sky bridges.
export const DRILLING = {
  key: "drilling",
  name: "Drillingsturm",
  desc: "Drei gestaffelte Schäfte, verbunden durch Brücken.",
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
    g.stroke({ width: 1, color: 0xb06bff, alpha: 0.55 });
  },
};

export const BUILDINGS = [KRAGTURM, TORBAU, DRILLING];
