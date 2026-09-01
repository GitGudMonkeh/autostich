// Wave study — four ways to put a little more movement into the calm water.
// Deliberately OUTSIDE src/: design exploration.
//
// Each panel shows the same thing: the near corner of the island, its waterline, three building
// reflections, and the same base surface (depth bands plus the fine stroke texture). The only
// difference is the wave treatment on top, so the comparison is about movement and nothing else.
//
// The rule they all have to respect: the water stays the quietest surface in the picture. Every
// variant here adds at most one new kind of mark.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { rng } from "./buildings.js";
import { PAL } from "./refRender.js";

const SEA = { far: 0x39406a, near: 0x141a30, foam: 0xd8e2ff, quay: 0x0b0a12, edge: 0x9aa6d8 };
const W = 320, H = 210;                        // one panel
// The island's near corner points AT the viewer, so the shoreline is a V that dips down in
// the middle — the land is everything above it.
const SHORE = (x) => 104 - Math.abs(x) * 0.42;

/* ---- the parts every panel shares ----------------------------------------------------------- */

function base(g) {
  const N = 18;
  for (let n = 0; n < N; n++) {
    const f = n / (N - 1);
    const ch = (s, a, b) => Math.round(((a >> s) & 255) * (1 - f) + ((b >> s) & 255) * f);
    const col = (ch(16, SEA.far, SEA.near) << 16) | (ch(8, SEA.far, SEA.near) << 8) | ch(0, SEA.far, SEA.near);
    g.rect(-W / 2, (H / N) * n - 1, W, H / N + 2).fill(col);
  }
}

// The fine stroke texture of the calm version: denser and brighter near the shore.
function texture(g, seed) {
  const rand = rng(seed);
  for (let n = 0; n < 320; n++) {
    const x = -W / 2 + rand() * W;
    const y = rand() * H;
    if (y < SHORE(x)) continue;
    const d = Math.min(1, (y - SHORE(x)) / 150);
    if (rand() < d * 0.6) continue;
    const w = 4 + rand() * 20 * (1.1 - d);
    g.rect(x - w / 2, y, w, 1)
      .fill({ color: rand() < 0.16 ? PAL.cyan : SEA.foam, alpha: 0.05 + rand() * 0.09 * (1.3 - d) });
  }
}

function island(g) {
  g.poly([-W / 2, -30, W / 2, -30, W / 2, SHORE(W / 2), 0, SHORE(0), -W / 2, SHORE(-W / 2)])
    .fill(0x1b1a2b);
  g.poly([-W / 2, SHORE(-W / 2) - 9, W / 2, SHORE(W / 2) - 9,
    W / 2, SHORE(W / 2), 0, SHORE(0), -W / 2, SHORE(-W / 2)]).fill(SEA.quay);
  g.moveTo(-W / 2, SHORE(-W / 2)).lineTo(0, SHORE(0)).lineTo(W / 2, SHORE(W / 2))
    .stroke({ width: 1.6, color: SEA.foam, alpha: 0.5 });
  for (let n = 1; n <= 4; n++) {                 // the contact shadow under the quay
    g.moveTo(-W / 2, SHORE(-W / 2) + n * 2.6).lineTo(0, SHORE(0) + n * 2.6)
      .lineTo(W / 2, SHORE(W / 2) + n * 2.6)
      .stroke({ width: 2.4, color: 0x05050c, alpha: 0.16 * (1 - n / 5) });
  }
}

const LIGHTS = [
  { x: -84, w: 42, colour: PAL.pink, h: 96 },
  { x: -6, w: 30, colour: PAL.cyan, h: 74 },
  { x: 74, w: 36, colour: PAL.warm, h: 62 },
];

function reflections(g, t) {
  g.clear();
  for (const L of LIGHTS) {
    const top = SHORE(L.x) + 3;
    const slices = 14;
    for (let n = 0; n < slices; n++) {
      const f = n / slices;
      const y = top + f * L.h;
      const jitter = Math.sin(t * 0.8 + n * 0.55 + L.x * 0.05) * (1.4 + f * 4.5);
      const ww = L.w * (0.85 + f * 0.5);
      const a = 0.42 * Math.pow(1 - f, 1.4);
      g.rect(L.x - ww / 2 + jitter, y, ww, (L.h / slices) * 1.05).fill({ color: L.colour, alpha: a });
      g.rect(L.x - ww * 0.9 + jitter * 0.6, y - 1, ww * 1.8, L.h / slices)
        .fill({ color: L.colour, alpha: a * 0.22 });
    }
    g.rect(L.x - L.w * 0.34, top, L.w * 0.68, 5).fill({ color: PAL.white, alpha: 0.3 });
  }
}

/* ---- the four treatments --------------------------------------------------------------------- */

// W1 · Dünung — the existing stroke texture, but each row rides a long swell. Nothing new is
//      drawn; the texture the calm version already has simply moves. The quietest option.
function swell(g, t) {
  g.clear();
  const rand = rng(0x5f1);
  for (let n = 0; n < 260; n++) {
    const x = -W / 2 + rand() * W;
    const y0 = rand() * H;
    if (y0 < SHORE(x)) continue;
    const d = Math.min(1, (y0 - SHORE(x)) / 150);
    const w = 5 + rand() * 22 * (1.1 - d);
    const y = y0 + Math.sin(y0 * 0.06 + x * 0.012 + t * 0.9) * 2.6 * (1.2 - d);
    g.rect(x - w / 2, y, w, 1.1)
      .fill({ color: rand() < 0.2 ? PAL.cyan : SEA.foam, alpha: 0.06 + rand() * 0.1 * (1.3 - d) });
  }
}

// W2 · Bänder — a few wide, very soft light bands drifting across the water, like long swells
//      catching the sky. Large-scale structure, no extra detail.
function bands(g, t) {
  g.clear();
  for (let n = 0; n < 5; n++) {
    const y = ((t * 7 + n * 46) % (H + 60)) - 20;
    const h = 12 + n * 3;
    for (let k = 0; k < 4; k++) {                 // soft edges from stacked slabs
      const f = k / 4;
      g.rect(-W / 2, y + f * h * 0.5, W, h * (1 - f * 0.5))
        .fill({ color: SEA.foam, alpha: 0.032 * (1 - f * 0.7) });
    }
    g.rect(-W / 2, y + h * 0.5, W, 1.2).fill({ color: SEA.foam, alpha: 0.12 });
    g.rect(-W / 2, y + h * 0.5 + 3, W, 1.6).fill({ color: 0x05050c, alpha: 0.1 });
  }
}

// W3 · Ringe — rings spreading from two points, as if something moved in the water. All the
//      movement sits in one place instead of over the whole surface.
function rings(g, t) {
  g.clear();
  for (const [cx, cy, phase] of [[-58, 150, 0], [88, 118, 1.7]]) {
    for (let n = 0; n < 3; n++) {
      const f = ((t * 0.35 + phase + n / 3) % 1);
      const r = 8 + f * 62;
      g.ellipse(cx, cy, r, r * 0.42)
        .stroke({ width: 1.6 - f, color: SEA.foam, alpha: 0.22 * (1 - f) });
    }
  }
}

// W4 · Kämme — drawn wave edges: a long bright line with a dark one under it, curved, sparse.
//      The most graphic option, and the only one that puts a real line on the water.
function crests(g, t) {
  g.clear();
  for (let n = 0; n < 6; n++) {
    const y = ((t * 5 + n * 40) % (H + 50)) - 10;
    const amp = 3 + (n % 3) * 1.6;
    const step = 14;
    for (const [dy, col, a, wdt] of [[2.4, 0x05050c, 0.22, 2], [0, SEA.foam, 0.3, 1.4]]) {
      let started = false;
      for (let x = -W / 2; x <= W / 2; x += step) {
        const yy = y + Math.sin(x * 0.035 + n * 1.3 + t * 0.8) * amp + dy;
        if (yy < SHORE(x) + 6) { started = false; continue; }
        if (!started) { g.moveTo(x, yy); started = true; } else g.lineTo(x, yy);
      }
      g.stroke({ width: wdt, color: col, alpha: a });
    }
  }
}

const VARIANTS = [
  { key: "swell", draw: swell },
  { key: "bands", draw: bands },
  { key: "rings", draw: rings },
  { key: "crests", draw: crests },
];

/* ---- page ------------------------------------------------------------------------------------ */

function panel(variant, seed) {
  const c = new Container();
  const still = new Graphics();
  base(still);
  texture(still, seed);
  const wave = new Graphics();
  const refl = new Graphics();
  const land = new Graphics();
  island(land);
  c.addChild(still, wave, refl, land);
  const mask = new Graphics();
  mask.rect(-W / 2, 0, W, H).fill(0xffffff);
  c.addChild(mask);
  c.mask = mask;
  return { node: c, wave, refl, draw: variant.draw };
}

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);
  // Pixi puts touch-action:none on its canvas. Here the canvas is taller than a phone screen, so
  // that swallows every swipe and the page cannot be scrolled. Nothing on it is interactive.
  app.stage.eventMode = "none";
  app.canvas.style.touchAction = "pan-y";

  const panels = VARIANTS.map((v, n) => panel(v, n * 977 + 13));
  for (const p of panels) app.stage.addChild(p.node);

  const layout = () => {
    const narrow = window.innerWidth < 820;
    const cols = narrow ? 1 : 2;
    const rowH = narrow ? 330 : 350;
    const rows = Math.ceil(panels.length / cols);
    host.style.height = `${rows * rowH}px`;
    app.renderer.resize(host.clientWidth, rows * rowH);
    const labels = document.getElementById("labels");
    labels.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    labels.style.gridAutoRows = `${rowH}px`;
    const cw = app.screen.width / cols;
    panels.forEach((p, n) => {
      const s = Math.min(1.15, (cw - 28) / W, (rowH - 118) / H);
      p.node.scale.set(s);
      p.node.position.set(cw * (n % cols) + cw / 2, rowH * Math.floor(n / cols) + 106);
    });
  };
  layout();
  window.addEventListener("resize", layout);

  app.ticker.add(() => {
    const t = performance.now() / 1000;
    for (const p of panels) { p.draw(p.wave, t); reflections(p.refl, t); }
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
