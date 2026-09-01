// Edge study — how the city meets the water.
// Deliberately OUTSIDE src/: design exploration.
//
// The builder currently ends in a quay wall about one storey deep, and the whole city therefore
// reads as a board lying on a table rather than as land in water. Three things are missing, and
// each panel here adds one or more of them:
//
//   1. MASS. The plate is a wafer with a flat cut bottom. Land has weight below the waterline and
//      it does not end in a straight line — an irregular silhouette is most of the difference.
//   2. THE SHALLOWS. Around any coast the water is lighter where it is shallow and darkens with
//      depth. Our sea only darkens towards the VIEWER, which says nothing about where land is,
//      and a sea that ignores the land is what makes the land look pasted on.
//   3. THE CONTACT. Surf, a wet band on the rock, and the shadow the mass throws into the water.
//
// Every panel shows the same near corner, the same deck and the same two buildings. Only the edge
// differs, so the comparison is about the edge and nothing else.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { rng } from "./buildings.js";
import { PAL } from "./refRender.js";
import { JP_BUILDINGS } from "./jpBuildings.js";

const W = 360, H = 232;
const DECK_Y = 92;                              // the near corner of the deck, in panel space
const SLOPE = 0.5;                              // 2:1 iso: both shore edges run at this slope
const shore = (x) => DECK_Y - Math.abs(x) * SLOPE;
const DECK_H = 13;                              // the deck slab itself, above whatever holds it up

const SEA = { far: 0x39406a, near: 0x141a30, foam: 0xd8e2ff };
const ROCK = { lit: 0x4c4667, deep: 0x1b1729, wet: 0x120f1e, block: 0x2a2540 };
const SAND = { top: 0x4a4157, face: 0x332c44, wet: 0x241f33 };

const mix = (a, b, f) => {
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - f) + ((b >> s) & 255) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/* ---- the shared parts --------------------------------------------------------------------------- */

function water(g) {
  const N = 20;
  for (let n = 0; n < N; n++) {
    g.rect(-W / 2, (H / N) * n - 1, W, H / N + 2).fill(mix(SEA.far, SEA.near, Math.pow(n / (N - 1), 0.8)));
  }
}

function texture(g, seed) {
  const rand = rng(seed);
  for (let n = 0; n < 260; n++) {
    const x = -W / 2 + rand() * W;
    const y = rand() * H;
    if (y < shore(x) + 6) continue;
    const w = 4 + rand() * 20;
    g.rect(x - w / 2, y, w, 1)
      .fill({ color: rand() < 0.16 ? PAL.cyan : SEA.foam, alpha: 0.05 + rand() * 0.08 });
  }
}

// The deck: the flat top the city stands on, and its own thin slab edge. Everything below this is
// what the variants disagree about.
function deck(g) {
  g.poly([-W / 2, -40, W / 2, -40, W / 2, shore(W / 2), 0, DECK_Y, -W / 2, shore(-W / 2)])
    .fill(0x1b1a2b);
  g.poly([-W / 2, shore(-W / 2), 0, DECK_Y, W / 2, shore(W / 2),
    W / 2, shore(W / 2) + DECK_H, 0, DECK_Y + DECK_H, -W / 2, shore(-W / 2) + DECK_H])
    .fill(0x0f0e19);
  g.moveTo(-W / 2, shore(-W / 2)).lineTo(0, DECK_Y).lineTo(W / 2, shore(W / 2))
    .stroke({ width: 1.2, color: 0x9aa6d8, alpha: 0.4 });
}

// The waterline: one bright line where the mass enters the water, and the shadow it throws down
// into it. Without this a mass just stops; with it, it is IN something.
function waterline(g, drop, foam = 0.5) {
  const at = (x) => shore(x) + drop;
  g.moveTo(-W / 2, at(-W / 2)).lineTo(0, at(0)).lineTo(W / 2, at(W / 2))
    .stroke({ width: 1.6, color: SEA.foam, alpha: foam });
  for (let n = 1; n <= 5; n++) {
    g.moveTo(-W / 2, at(-W / 2) + n * 2.6).lineTo(0, at(0) + n * 2.6).lineTo(W / 2, at(W / 2) + n * 2.6)
      .stroke({ width: 2.4, color: 0x05050c, alpha: 0.17 * (1 - n / 6) });
  }
}

// Two buildings on the deck, from the real cast, so every panel is judged at the size the city is
// actually played at.
function city(node) {
  for (const [k, x, y, s] of [["ladenzeile", -52, 34, 0.85], ["imbiss", 46, 58, 0.85],
    ["schilderturm", 6, 10, 0.8]]) {
    const def = JP_BUILDINGS.find((b) => b.key === k);
    const g = new Graphics(), glow = new Graphics();
    glow.blendMode = "add";
    def.draw(g, glow);
    const c = new Container();
    c.addChild(g, glow);
    c.position.set(x, y);
    c.scale.set(s);
    node.addChild(c);
  }
}

/* ---- the edges ---------------------------------------------------------------------------------- */

// An irregular bottom edge for a mass: a wandering line under the shore, deeper in the middle of
// each stretch. This one function is what stops the island being a wafer.
function ragged(seed, depth, wobble, step = 18) {
  const rand = rng(seed);
  const pts = [];
  for (let x = -W / 2; x <= W / 2 + step; x += step) {
    const xx = Math.min(W / 2, x);
    pts.push([xx, shore(xx) + depth + (rand() - 0.5) * wobble]);
  }
  return pts;
}

// U2 — the cliff: rock under the deck. Drawn as bands from a lit top to a dark foot rather than as
// one fill — a single dark shape sat at the same value as the water and simply disappeared. The
// layering is also what makes it read as rock instead of as a thick slab.
function cliff(g, seed, depth = 62) {
  const N = 5;
  const line = (off) => [[-W / 2, shore(-W / 2) + off], [0, DECK_Y + off], [W / 2, shore(W / 2) + off]];
  for (let n = 0; n < N; n++) {
    const f0 = n / N;
    const top = line(DECK_H + depth * f0);
    const bot = n === N - 1
      ? ragged(seed, DECK_H + depth, 22)
      : line(DECK_H + depth * ((n + 1) / N));
    g.poly([...top.flat(), ...bot.slice().reverse().flat()])
      .fill(mix(ROCK.lit, ROCK.deep, Math.pow(f0, 0.7)));
  }
  // Vertical cracks: a few short strokes down the face, which is all the detail rock needs here.
  const rand = rng(seed ^ 0x77);
  for (let n = 0; n < 26; n++) {
    const x = -W / 2 + rand() * W;
    const y0 = shore(x) + DECK_H + rand() * depth * 0.5;
    g.moveTo(x, y0).lineTo(x + (rand() - 0.5) * 5, y0 + 8 + rand() * 20)
      .stroke({ width: 1, color: ROCK.deep, alpha: 0.5 });
  }
  for (let n = 0; n < 24; n++) {                 // talus: broken blocks at the foot
    const x = -W / 2 + rand() * W;
    const y = shore(x) + DECK_H + depth + (rand() - 0.5) * 16;
    const s = 3 + rand() * 8;
    g.poly([x, y - s * 0.6, x + s, y, x, y + s * 0.6, x - s, y])
      .fill({ color: rand() < 0.5 ? ROCK.block : ROCK.wet, alpha: 0.95 });
  }
}

// U3 — the shallows: the water immediately around the land is lighter, and it darkens outward.
// This is the single cheapest thing that says "island" — the sea has to know where the land is.
function shallows(g, drop, reach = 74) {
  for (let n = 6; n >= 1; n--) {
    const f = n / 6;
    const off = drop + reach * f;
    g.poly([-W / 2, shore(-W / 2) + drop, 0, DECK_Y + drop, W / 2, shore(W / 2) + drop,
      W / 2, shore(W / 2) + off, 0, DECK_Y + off, -W / 2, shore(-W / 2) + off])
      .fill({ color: 0x4d7fa8, alpha: 0.05 });
  }
}

// U4 — surf: a broken bright line riding the waterline, and the wet band it leaves on the rock.
function surf(g, drop, t) {
  const rand = rng(0x5117);
  for (let n = 0; n < 46; n++) {
    const x = -W / 2 + rand() * W;
    const ph = rand() * 6.3;
    const a = 0.15 + 0.45 * Math.pow(Math.max(0, Math.sin(t * 1.1 + ph)), 2);
    const w = 8 + rand() * 22;
    const y = shore(x) + drop + Math.sin(t * 1.3 + ph) * 1.6;
    g.rect(x - w / 2, y - 1, w, 2.2).fill({ color: SEA.foam, alpha: a });
    g.rect(x - w * 0.7, y + 2, w * 1.4, 1.4).fill({ color: SEA.foam, alpha: a * 0.35 });
  }
}

function wetBand(g, drop) {
  g.poly([-W / 2, shore(-W / 2) + drop - 9, 0, DECK_Y + drop - 9, W / 2, shore(W / 2) + drop - 9,
    W / 2, shore(W / 2) + drop, 0, DECK_Y + drop, -W / 2, shore(-W / 2) + drop])
    .fill({ color: ROCK.wet, alpha: 0.55 });
}

// U5 — the shallow shore: gravel sloping into the water instead of a wall. The land runs OUT
// under the water rather than stopping at it.
function beach(g, seed) {
  const lip = ragged(seed, 30, 16);
  const face = [-W / 2, shore(-W / 2) + DECK_H, 0, DECK_Y + DECK_H, W / 2, shore(W / 2) + DECK_H];
  g.poly([...face, ...lip.slice().reverse().flat()]).fill(SAND.face);
  g.poly([...face, ...ragged(seed, 15, 12).slice().reverse().flat()]).fill(SAND.top);
  const rand = rng(seed ^ 0x31);
  for (let n = 0; n < 90; n++) {                 // gravel, thinning towards the water
    const x = -W / 2 + rand() * W;
    const f = rand();
    const y = shore(x) + DECK_H + f * 30;
    g.circle(x, y, 0.7 + rand() * 1.5)
      .fill({ color: f < 0.5 ? SAND.top : SAND.wet, alpha: 0.7 * (1 - f * 0.5) });
  }
}

// U6 — piles: the deck stands over the water on posts, and you can see under the city. Fully
// man-made, and the one variant where the water visibly continues beneath the plate.
function piles(g, seed) {
  const rand = rng(seed);
  for (let x = -W / 2 + 14; x < W / 2; x += 26) {
    const y0 = shore(x) + DECK_H;
    const h = 30 + rand() * 12;
    g.rect(x - 1.6, y0, 3.2, h).fill(0x14121f);
    g.rect(x - 1.6, y0 + h - 5, 3.2, 5).fill({ color: 0x0a0812, alpha: 0.9 });
    for (let n = 0; n < 4; n++) {                // the ripple ring where each post enters
      g.ellipse(x, y0 + h, 5 + n * 3.5, (5 + n * 3.5) * 0.4)
        .stroke({ width: 0.8, color: SEA.foam, alpha: 0.1 - n * 0.02 });
    }
  }
  // Cross-bracing, and the dark underside of the deck.
  for (let x = -W / 2 + 14; x < W / 2 - 26; x += 26) {
    g.moveTo(x, shore(x) + DECK_H + 22).lineTo(x + 26, shore(x + 26) + DECK_H + 10)
      .stroke({ width: 1, color: 0x1b1830, alpha: 0.8 });
  }
}

/* ---- the six panels ------------------------------------------------------------------------------ */

const VARIANTS = [
  { key: "kai", drop: DECK_H + 6, draw(g, seed) { void seed; } },
  { key: "klippe", drop: DECK_H + 54, draw(g, seed) { cliff(g, seed); } },
  {
    key: "klippe-flach", drop: DECK_H + 54, shallow: true,
    draw(g, seed) { cliff(g, seed); },
  },
  {
    key: "brandung", drop: DECK_H + 54, shallow: true, surf: true, wet: true,
    draw(g, seed) { cliff(g, seed); },
  },
  { key: "ufer", drop: DECK_H + 30, shallow: true, surf: true, draw(g, seed) { beach(g, seed); } },
  { key: "stelzen", drop: DECK_H + 2, draw(g, seed) { piles(g, seed); } },
];

function panel(v, seed) {
  const c = new Container();
  const still = new Graphics();
  water(still);
  if (v.shallow) shallows(still, v.drop);
  texture(still, seed);
  const mass = new Graphics();
  v.draw(mass, seed);
  if (v.wet) wetBand(mass, v.drop);
  const line = new Graphics();
  waterline(line, v.drop, v.key === "stelzen" ? 0.25 : 0.5);
  const foam = new Graphics();
  const land = new Graphics();
  deck(land);
  const town = new Container();
  city(town);
  c.addChild(still, mass, line, foam, land, town);
  const m = new Graphics();
  m.rect(-W / 2, 0, W, H).fill(0xffffff);
  c.addChild(m);
  c.mask = m;
  return { node: c, foam, v };
}

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);
  app.stage.eventMode = "none";
  app.canvas.style.touchAction = "pan-y";

  const panels = VARIANTS.map((v, n) => panel(v, 0x2200 + n * 977));
  for (const p of panels) app.stage.addChild(p.node);

  const layout = () => {
    const narrow = window.innerWidth < 860;
    const cols = narrow ? 1 : 2;
    const rowH = narrow ? 392 : 408;
    const rows = Math.ceil(panels.length / cols);
    host.style.height = `${rows * rowH}px`;
    app.renderer.resize(host.clientWidth, rows * rowH);
    const labels = document.getElementById("labels");
    labels.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    labels.style.gridAutoRows = `${rowH}px`;
    const cw = app.screen.width / cols;
    panels.forEach((p, n) => {
      const s = Math.min(1.35, (cw - 26) / W, (rowH - 138) / H);
      p.node.scale.set(s);
      p.node.position.set(cw * (n % cols) + cw / 2, rowH * Math.floor(n / cols) + 126);
    });
  };
  layout();
  window.addEventListener("resize", layout);

  app.ticker.add(() => {
    const t = performance.now() / 1000;
    for (const p of panels) {
      if (!p.v.surf) continue;
      p.foam.clear();
      surf(p.foam, p.v.drop, t);
    }
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
