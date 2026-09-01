// The water, as reusable parts.
//
// Shared by the island study (neonwater.js) and the builder (jpcity.js), so both sit in the same
// sea. Water in this style is not a blue surface. It is a MIRROR that has been roughened, and it
// follows the same rule as the asphalt and the facades: the surface itself is dark and nearly
// colourless, and everything you see on it is light from somewhere else.
//
//   1. Value first. The water is darker than the sky it sits under and gets darker towards the
//      viewer. Without that gradient it reads as a floor.
//   2. The reflection is the subject. Below every lit building the light smears downwards in its
//      own colour — stretched, cut into slices, never a mirror image.
//   3. Ripples are horizontal, thin and sparse.
//   4. Movement is spreading rings and light rain; the rain is the reason the rings are there.
//
// Everything takes the near corner of the built area as `corner` ([x, y] in screen units) — that
// is the one point every falloff is measured from, and it is the only thing the builder and the
// island study disagree about.

import { rng } from "./buildings.js";
import { PAL } from "./refRender.js";

export const SEA = {
  far: 0x39406a,              // at the horizon, closest to the sky
  near: 0x141a30,             // under the viewer, the deepest value
  quay: 0x0b0a12,
  quayEdge: 0x9aa6d8,
  foam: 0xd8e2ff,
};

const mix = (a, b, f) => {
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - f) + ((b >> s) & 255) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

// The surface: bands from the horizon down to the viewer. Bands rather than one flat fill,
// because the gradient IS the depth cue — a single colour reads as a tabletop.
export function sea(g, x0, x1, y0, y1) {
  const N = 26;
  for (let n = 0; n < N; n++) {
    const f = n / (N - 1);
    g.rect(x0, y0 + (y1 - y0) * (n / N) - 1, x1 - x0, (y1 - y0) / N + 2)
      .fill(mix(SEA.far, SEA.near, Math.pow(f, 0.8)));
  }
}

// Ripples near the built area: short horizontal strokes, densest along the shore.
export function ripples(g, x0, x1, y0, y1, corner, seed) {
  const rand = rng(seed);
  const [cx, cy] = corner;
  for (let n = 0; n < 1400; n++) {
    const x = x0 + rand() * (x1 - x0);
    const y = y0 + rand() * (y1 - y0);
    const d = Math.hypot((x - cx) / 320, (y - cy) / 190);
    if (rand() < d * 0.55) continue;                      // sparse far away, dense near the shore
    const w = 5 + rand() * 26 * (1.2 - Math.min(1, d));
    const a = 0.05 + rand() * 0.1 * (1.35 - Math.min(1, d));
    g.rect(x - w / 2, y, w, 1).fill({ color: rand() < 0.16 ? PAL.cyan : SEA.foam, alpha: a });
  }
}

// The far water. `ripples` thins its marks out towards the top, which is a PERSPECTIVE convention
// — and this projection is parallel: there is no horizon and nothing shrinks with distance. A
// surface that loses all its texture up there stops reading as a plane and starts reading as a
// backdrop standing behind the city. So the far field keeps the same mark sizes as the near one;
// only the light falls off, because the city is what lights the water.
export const FAR_TOP = -820;
export const farBottomOf = (corner) => corner[1] - 140;   // where the near field already covers

// Light, not geometry: away from the city and out to the sides the water is simply darker.
export const farLight = (x, y, corner) => 1 - 0.28 * Math.min(1, (farBottomOf(corner) - y) / 560)
  - 0.12 * Math.min(1, Math.abs(x) / 1000);

export function farRipples(g, corner, seed) {
  const rand = rng(seed);
  const bottom = farBottomOf(corner);
  for (let n = 0; n < 2100; n++) {
    const x = -1300 + rand() * 2600;
    const y = FAR_TOP + rand() * (bottom - FAR_TOP);
    const fade = Math.min(1, (bottom - y) / 170);          // no seam against the near field
    const w = 5 + rand() * 30;
    g.rect(x - w / 2, y, w, 1).fill({
      color: rand() < 0.14 ? PAL.cyan : SEA.foam,
      alpha: (0.05 + rand() * 0.12) * fade * farLight(x, y, corner),
    });
  }
}

/* ---- rain, and the rings it leaves ------------------------------------------------------------ */

// Two slow sources spreading wide rings — the wave treatment itself. They sit in open water,
// away from the quay, so they never compete with the waterline.
const RING_SRC = [[-260, 90, 0], [300, 30, 1.7]];
// Impact rings: one per drop that lands, small and quick. Deterministic, so nothing is allocated
// per frame and the pattern does not drift between reloads. Roughly a third of them land where
// the city covers them, so the count is higher than what ends up visible.
const DROPS = 48;

export function rings(g, t, corner) {
  g.clear();
  const bottom = farBottomOf(corner);
  for (const [dx, dy, phase] of RING_SRC) {
    const x = corner[0] + dx, y = corner[1] + dy;
    for (let n = 0; n < 3; n++) {
      const f = (t * 0.3 + phase + n / 3) % 1;
      const r = 14 + f * 96;
      g.ellipse(x, y, r, r * 0.5)
        .stroke({ width: 1.6 - f, color: SEA.foam, alpha: 0.16 * (1 - f) });
    }
  }
  const rand = rng(0x2b71);
  for (let n = 0; n < DROPS; n++) {
    const x = corner[0] - 560 + rand() * 1120;
    const y = corner[1] - 60 + rand() * 330;
    const f = ((t / (2.2 + rand() * 2.4)) + rand()) % 1;
    const r = 1.5 + f * 22;
    g.ellipse(x, y, r, r * 0.5)
      .stroke({ width: 0.4 + 1.1 * (1 - f), color: SEA.foam, alpha: 0.26 * (1 - f) * (1 - f) });
  }
  // The same rain falls on the far water, so the same rings are there — same size, dimmer.
  for (let n = 0; n < 34; n++) {
    const x = -1150 + rand() * 2300;
    const y = FAR_TOP + 60 + rand() * (bottom - FAR_TOP - 60);
    const f = ((t / (2.4 + rand() * 2.6)) + rand()) % 1;
    const r = 1.5 + f * 22;
    g.ellipse(x, y, r, r * 0.5).stroke({
      width: 0.4 + 1.1 * (1 - f), color: SEA.foam,
      alpha: 0.26 * (1 - f) * (1 - f) * farLight(x, y, corner),
    });
  }
}

// Light rain: thin slanted streaks, sparse enough that the city stays the subject. Drawn over
// everything, because rain is between the viewer and the scene.
const RAIN_N = 300;
const RAIN_SPAN = 1700;               // the loop height; wide enough to cover a phone framing too
export function rain(g, t) {
  g.clear();
  const rand = rng(0x9c31);
  for (let n = 0; n < RAIN_N; n++) {
    const x0 = -1200 + rand() * 2400;
    const speed = 340 + rand() * 240;
    const y = ((rand() * RAIN_SPAN) + t * speed) % RAIN_SPAN - 700;
    const len = 11 + rand() * 17;
    g.moveTo(x0, y).lineTo(x0 + len * 0.3, y + len)
      .stroke({ width: 0.9, color: rand() < 0.18 ? PAL.cyan : SEA.foam, alpha: 0.09 + rand() * 0.13 });
  }
}

/* ---- reflections -------------------------------------------------------------------------------- */

// One light's smear on the water: a column of slices in its own colour, stretched down, jittered
// sideways. Never a mirrored copy — a sharp reflection looks like glass, not water.
export function smear(g, x, top, w, height, colour, strength, t) {
  const slices = 14;
  for (let n = 0; n < slices; n++) {
    const f = n / slices;
    const y = top + 4 + f * height;
    const jitter = Math.sin(t * 0.8 + n * 0.55 + x * 0.01) * (1.4 + f * 4.5);
    const ww = w * (0.85 + f * 0.5);
    const a = 0.42 * Math.pow(1 - f, 1.4) * strength;
    g.rect(x - ww / 2 + jitter, y, ww, (height / slices) * 1.05).fill({ color: colour, alpha: a });
    g.rect(x - ww * 0.9 + jitter * 0.6, y - 1, ww * 1.8, height / slices)
      .fill({ color: colour, alpha: a * 0.22 });             // the halo around the smear
  }
  // The bright core right under the shore, where the reflection is still coherent.
  g.rect(x - w * 0.34, top + 3, w * 0.68, 5).fill({ color: PAL.white, alpha: 0.3 * strength });
}

/* ---- what passes by ------------------------------------------------------------------------------ */

// A boat crossing the open water, in screen space — a moored boat belongs to its jetty and is
// drawn in lattice coordinates, but a passing one only ever needs a track across the picture.
// Same idea as the cars: it is recognised by its lights, not by its shape.
export function passingBoat(g, glow, x, y, t, colour = PAL.warm) {
  const bob = Math.sin(t * 0.9 + x * 0.01) * 1.6;
  const yy = y + bob;
  g.poly([x - 17, yy, x + 17, yy, x + 12, yy + 5, x - 12, yy + 5]).fill(0x1d1a2e);
  g.poly([x - 6, yy - 7, x + 7, yy - 7, x + 7, yy, x - 6, yy]).fill(0x241f38);
  g.rect(x - 4, yy - 5.5, 10, 3).fill({ color: colour, alpha: 0.9 });
  g.moveTo(x - 11, yy - 2).lineTo(x - 11, yy - 15).stroke({ width: 1.1, color: PAL.steel, alpha: 0.7 });
  g.circle(x - 11, yy - 15, 1.5).fill({ color: PAL.white, alpha: 0.95 });
  glow.circle(x - 11, yy - 15, 5.5).fill({ color: colour, alpha: 0.18 });
  for (let n = 0; n < 6; n++) {                             // its own smear on the water
    glow.rect(x - 10 + Math.sin(t * 1.4 + n) * 2.4, yy + 6 + n * 3.2, 20, 2)
      .fill({ color: colour, alpha: 0.11 * (1 - n / 6) });
  }
}
