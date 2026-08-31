// Vehicles for the city studies — one drawing routine for the whole fleet.
//
// Shared by the prop study (props.js) and the facade study (facades.js, parked at the kerb), so
// a change to the fleet cannot leave one page behind.

import { dashLine, TILE_W, TILE_H } from "./buildings.js";

const CAR_HOLO = 0xb06bff;              // hologrid violet — accent only

export const CAR_DIRS = {
  N: [TILE_W / 4, -TILE_H / 4], E: [TILE_W / 4, TILE_H / 4],
  S: [-TILE_W / 4, TILE_H / 4], W: [-TILE_W / 4, -TILE_H / 4],
};
const CW = { N: "E", E: "S", S: "W", W: "N" };
const unit = ([x, y]) => { const l = Math.hypot(x, y); return [x / l, y / l]; };

// A closed iso box in vehicle space. All four side faces are emitted and sorted by whether
// their outward normal points toward the camera — drawing only two of them (the first attempt)
// leaves the body open, and the vehicle reads as a floating plate instead of a hull.
function isoBox(g, at, f0, f1, s0, s1, yTop, yBot, col) {
  const q = (a, b, c, d) => [...a, ...b, ...c, ...d];
  const sides = [
    { n: at(1, 0, 0), q: q(at(f1, s0, yBot), at(f1, s1, yBot), at(f1, s1, yTop), at(f1, s0, yTop)) },
    { n: at(-1, 0, 0), q: q(at(f0, s0, yBot), at(f0, s1, yBot), at(f0, s1, yTop), at(f0, s0, yTop)) },
    { n: at(0, 1, 0), q: q(at(f0, s1, yBot), at(f1, s1, yBot), at(f1, s1, yTop), at(f0, s1, yTop)) },
    { n: at(0, -1, 0), q: q(at(f0, s0, yBot), at(f1, s0, yBot), at(f1, s0, yTop), at(f0, s0, yTop)) },
  ];
  const top = q(at(f0, s0, yTop), at(f1, s0, yTop), at(f1, s1, yTop), at(f0, s1, yTop));
  for (const s of sides) if (s.n[1] <= 0) g.poly(s.q).fill(col.far);
  g.poly(top).fill(col.top);
  for (const s of sides) if (s.n[1] > 0) g.poly(s.q).fill(col.near);
  if (col.edge) g.poly(top).stroke({ width: col.edgeW ?? 1, color: col.edge, alpha: col.edgeA ?? 0.9 });
  return { top, sides };
}

// One vehicle. `spec` carries the proportions and the two-colour palette; every model is drawn
// by the same routine so they stay a fleet instead of three unrelated props.
export function vehicle(g, dir, spec) {
  const u = unit(CAR_DIRS[dir]), w = unit(CAR_DIRS[CW[dir]]);
  const { L, W2, H, cab, lead, light, alt = 5 } = spec;
  const y0 = -alt;
  const at = (fwd, side, lift) => [u[0] * fwd + w[0] * side, u[1] * fwd + w[1] * side + lift];

  g.ellipse(0, 2, L * 0.36, L * 0.13).fill({ color: 0x000000, alpha: 0.5 });   // ground shadow
  g.ellipse(0, y0 + 3, L * 0.32, L * 0.11).fill({ color: lead, alpha: 0.22 }); // hover glow

  // thruster pods under the hull — they give the vehicle a bottom instead of a flat cut
  for (const side of [-1, 1]) {
    isoBox(g, at, -L * 0.26, L * 0.26, side * W2 * 0.5 - 1.6, side * W2 * 0.5 + 1.6, y0 - 2, y0 + 1.5,
      { top: 0x121a2c, near: 0x0d1424, far: 0x080d18 });
    g.ellipse(...at(0, side * W2 * 0.5, y0 + 2), 3.2, 1.3).fill({ color: lead, alpha: 0.5 });
  }

  isoBox(g, at, -L / 2, L / 2, -W2 / 2, W2 / 2, y0 - H, y0,
    { top: 0x27364f, near: 0x1d2942, far: 0x111a2c, edge: lead, edgeA: 0.5 });
  // shoulder line along the flank — the one bright accent that says "vehicle", not "crate"
  for (const side of [-1, 1]) {
    g.moveTo(...at(-L * 0.46, side * W2 / 2, y0 - H * 0.62))
      .lineTo(...at(L * 0.46, side * W2 / 2, y0 - H * 0.62));
  }
  g.stroke({ width: 1.1, color: lead, alpha: 0.85 });

  if (spec.cargo) {                                          // container / load bed
    const [g0, g1] = spec.cargo, GH = spec.cargoH ?? 6;
    isoBox(g, at, g0, g1, -W2 * 0.44, W2 * 0.44, y0 - H - GH, y0 - H,
      { top: 0x36486a, near: 0x2b3a56, far: 0x1b2540, edge: lead, edgeA: 0.6 });
    for (let n = 1; n <= 2; n++) {                            // ribs
      const t = g0 + (g1 - g0) * (n / 3);
      g.moveTo(...at(t, W2 * 0.44, y0 - H)).lineTo(...at(t, W2 * 0.44, y0 - H - GH));
    }
    g.stroke({ width: 0.9, color: 0x16203a });
  }

  const [c0, c1] = cab;                                      // glazed cabin sitting on the deck
  const CH = spec.cabH ?? 5;
  isoBox(g, at, c0, c1, -W2 * 0.34, W2 * 0.34, y0 - H - CH, y0 - H,
    { top: 0x16233c, near: 0x101a2e, far: 0x0b1220, edge: light, edgeA: 0.8 });
  // glazing: a translucent wash over the dark cabin, plus one highlight streak
  g.poly([...at(c0, W2 * 0.34, y0 - H), ...at(c1, W2 * 0.34, y0 - H),
    ...at(c1, W2 * 0.34, y0 - H - CH), ...at(c0, W2 * 0.34, y0 - H - CH)])
    .fill({ color: light, alpha: 0.42 });
  g.poly([...at(c0, -W2 * 0.34, y0 - H - CH), ...at(c1, -W2 * 0.34, y0 - H - CH),
    ...at(c1, W2 * 0.34, y0 - H - CH), ...at(c0, W2 * 0.34, y0 - H - CH)])
    .fill({ color: light, alpha: 0.22 });
  g.moveTo(...at(c0 + (c1 - c0) * 0.2, W2 * 0.34, y0 - H - CH * 0.75))
    .lineTo(...at(c1 - (c1 - c0) * 0.15, W2 * 0.34, y0 - H - CH * 0.75))
    .stroke({ width: 1, color: 0xffffff, alpha: 0.55 });

  // lights
  g.moveTo(...at(L / 2, -W2 * 0.34, y0 - H * 0.55)).lineTo(...at(L / 2, W2 * 0.34, y0 - H * 0.55))
    .stroke({ width: 1.8, color: 0xfff2b8, alpha: 0.95 });
  g.moveTo(...at(-L / 2, -W2 * 0.3, y0 - H * 0.55)).lineTo(...at(-L / 2, W2 * 0.3, y0 - H * 0.55))
    .stroke({ width: 1.5, color: 0xff4560, alpha: 0.9 });
  // hologrid accent: the lane skids projected onto the road below
  for (const side of [-1, 1]) {
    const a = at(-L * 0.3, side * W2 * 0.34, 1.5), b2 = at(L * 0.3, side * W2 * 0.34, 1.5);
    dashLine(g, a[0], a[1], b2[0], b2[1], 3, 3);
  }
  g.stroke({ width: 1, color: CAR_HOLO, alpha: 0.5 });
}

export const VEHICLES = [
  { key: "kurier", name: "Kurier", spec: { L: 21, W2: 10, H: 6, cab: [-2, 6], cargo: [-9, -3], cargoH: 7, lead: 0xffc478, light: 0xffe2b0 } },
  { key: "gleiter", name: "Gleiter", spec: { L: 25, W2: 9, H: 5, cab: [-5, 5], cabH: 4, lead: 0x8ceaff, light: 0xd6f2ff, alt: 9 } },
  { key: "lasttraeger", name: "Lastträger", spec: { L: 27, W2: 12, H: 7, cab: [6, 12], cargo: [-12, 3], cargoH: 9, lead: 0xff8ad8, light: 0xffc2ec, alt: 5 } },
];

