// Weather study — six atmospheres over the same corner of the city.
// Deliberately OUTSIDE src/: design exploration.
//
// Weather in this style is not particles. Particles are the cheapest and least of it; what
// actually changes the picture is three things, and every panel here sets all three:
//
//   1. THE AIR. A tint multiplied over the whole scene. It decides the value and the hue of
//      everything that is not a light — rock, asphalt, water — and it is what makes a night look
//      cold, close or poisonous.
//   2. THE LIGHT. Haze scatters what the city emits back into the air, so the neon spreads and the
//      whole frame drifts towards the colour of the strongest source. This is the lever that gives
//      a red night: not redder signs, but red AIR with the signs shining through it.
//   3. THE WATER. It answers the sky. A sea that stays the same colour under every weather is what
//      makes weather look like a filter laid over the picture.
//
// The precipitation comes last and is the least important of the four.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { rng } from "./buildings.js";
import { JP_BUILDINGS } from "./jpBuildings.js";

const W = 340, H = 236;
const DECK_Y = 96;
const shore = (x) => DECK_Y - Math.abs(x) * 0.5;
const DECK_H = 46;                              // the cliff face, as tall as the deck is high

const mix = (a, b, f) => {
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - f) + ((b >> s) & 255) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/* ---- the six ------------------------------------------------------------------------------------ */

// `air` is multiplied over the scene, `bloom` added back over it, `sea` is the water under that sky.
const WEATHER = [
  {
    key: "niesel", sea: [0x39406a, 0x141a30], air: 0xffffff, bloom: 0x6a7ad0, bloomA: 0.05,
    rain: { n: 110, len: 15, slant: 0.3, a: 0.13, colour: 0xd8e2ff, speed: 300 },
  },
  {
    key: "gewitter", sea: [0x2b3154, 0x0c1020], air: 0xb9c2e8, bloom: 0x4a5ec0, bloomA: 0.06,
    rain: { n: 380, len: 27, slant: 0.55, a: 0.2, colour: 0xd8e2ff, speed: 620 }, flash: true,
  },
  {
    key: "nebel", sea: [0x555d7e, 0x2b3149], air: 0xc9cee0, bloom: 0x9aa6d8, bloomA: 0.16,
    rain: { n: 40, len: 10, slant: 0.2, a: 0.08, colour: 0xd8e2ff, speed: 180 }, fog: true,
  },
  {
    // The one the darker, redder setting is asking for. Nothing about the buildings changes.
    key: "smog", sea: [0x4a2a2e, 0x140a10], air: 0xffa08c, bloom: 0xff3a2a, bloomA: 0.13,
    rain: { n: 70, len: 13, slant: 0.35, a: 0.1, colour: 0xffb9a0, speed: 240 }, ash: true,
  },
  {
    key: "schnee", sea: [0x3f4560, 0x181d30], air: 0xe4e9ff, bloom: 0x7f93d8, bloomA: 0.08,
    snow: true,
  },
  {
    key: "klar", sea: [0x2b3355, 0x0b0f1c], air: 0xf2f4ff, bloom: 0x3a4a90, bloomA: 0.03,
    stars: true,
  },
];

/* ---- the scene every panel shares ---------------------------------------------------------------- */

function sky(g, w) {
  const N = 16;
  for (let n = 0; n < N; n++) {
    g.rect(-W / 2, -60 + (DECK_Y + 60) * (n / N) - 1, W, (DECK_Y + 60) / N + 2)
      .fill(mix(w.sea[0], mix(w.sea[0], w.sea[1], 0.35), n / (N - 1)));
  }
}

function sea(g, w) {
  const N = 16;
  for (let n = 0; n < N; n++) {
    g.rect(-W / 2, DECK_Y - 40 + (H - DECK_Y + 40) * (n / N) - 1, W, (H - DECK_Y + 40) / N + 2)
      .fill(mix(w.sea[0], w.sea[1], Math.pow(n / (N - 1), 0.8)));
  }
  const rand = rng(0x4411);
  for (let n = 0; n < 200; n++) {                 // the same stroke texture as the builder's sea
    const x = -W / 2 + rand() * W, y = rand() * H;
    if (y < shore(x) + DECK_H) continue;
    const ww = 4 + rand() * 18;
    g.rect(x - ww / 2, y, ww, 1).fill({ color: 0xd8e2ff, alpha: 0.04 + rand() * 0.07 });
  }
  // The shallows: the water knows where the land is.
  for (let n = 5; n >= 1; n--) {
    const d = 46 * (n / 5);
    g.poly([-W / 2, shore(-W / 2) + DECK_H, 0, DECK_Y + DECK_H, W / 2, shore(W / 2) + DECK_H,
      W / 2, shore(W / 2) + DECK_H + d, 0, DECK_Y + DECK_H + d, -W / 2, shore(-W / 2) + DECK_H + d])
      .fill({ color: 0x4d7fa8, alpha: 0.045 });
  }
}

function land(g) {
  const line = (off) => [[-W / 2, shore(-W / 2) + off], [0, DECK_Y + off], [W / 2, shore(W / 2) + off]];
  const rand = rng(0x9182);
  const foot = line(DECK_H).map(([x, y]) => [x, y + (rand() - 0.5) * 6]);
  for (let n = 0; n < 5; n++) {                   // the cliff, in bands from a lit top to a dark foot
    const f0 = n / 5;
    const top = line(DECK_H * f0);
    const bot = n === 4 ? foot : line(DECK_H * ((n + 1) / 5));
    g.poly([...top.flat(), ...bot.slice().reverse().flat()])
      .fill(mix(0x5d5578, 0x140f20, Math.pow(f0, 0.62)));
    if (n) {
      top.forEach(([x, y], m) => (m ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke({ width: 1, color: 0x140f20, alpha: 0.45 });
    }
  }
  g.poly([-W / 2, -60, W / 2, -60, W / 2, shore(W / 2), 0, DECK_Y, -W / 2, shore(-W / 2)])
    .fill(0x0f0e19);
  g.moveTo(-W / 2, shore(-W / 2)).lineTo(0, DECK_Y).lineTo(W / 2, shore(W / 2))
    .stroke({ width: 1.2, color: 0x9aa6d8, alpha: 0.35 });
  foot.forEach(([x, y], m) => (m ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke({ width: 1.4, color: 0xd8e2ff, alpha: 0.35 });
}

function city(node) {
  for (const [k, x, y, s] of [["ladenzeile", -74, 30, 0.8], ["schilderturm", -8, 4, 0.8],
    ["imbiss", 54, 44, 0.8], ["torhof", 8, 62, 0.62]]) {
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

/* ---- what falls, and what the air does ------------------------------------------------------------ */

function precipitation(g, w, t) {
  g.clear();
  if (w.snow) {
    const rand = rng(0x7c11);
    for (let n = 0; n < 150; n++) {
      const x0 = -W / 2 + rand() * W, sp = 22 + rand() * 26, sway = 6 + rand() * 12;
      const y = ((rand() * H + t * sp) % (H + 40)) - 20;
      const x = x0 + Math.sin(t * 0.6 + n) * sway;
      const r = 0.7 + rand() * 1.3;
      g.circle(x, y, r).fill({ color: 0xf2f4ff, alpha: 0.35 + rand() * 0.4 });
    }
    return;
  }
  if (!w.rain) return;
  const { n: N, len, slant, a, colour, speed } = w.rain;
  const rand = rng(0x9c31);
  for (let n = 0; n < N; n++) {
    const x0 = -W / 2 - 40 + rand() * (W + 80);
    const sp = speed * (0.8 + rand() * 0.4);
    const y = ((rand() * (H + 120)) + t * sp) % (H + 120) - 60;
    const l = len * (0.7 + rand() * 0.6);
    g.moveTo(x0, y).lineTo(x0 + l * slant, y + l)
      .stroke({ width: 0.9, color: colour, alpha: a * (0.6 + rand() * 0.7) });
  }
}

// Ash on the updraught: the one thing that only the red night has, and the thing that says the air
// itself is dirty rather than merely tinted.
function ash(g, t) {
  const rand = rng(0x3a71);
  for (let n = 0; n < 70; n++) {
    const x0 = -W / 2 + rand() * W, sp = 12 + rand() * 22;
    const y = H - ((rand() * H + t * sp) % (H + 40));
    const x = x0 + Math.sin(t * 0.7 + n * 1.3) * (5 + rand() * 10);
    const f = 1 - y / H;
    g.circle(x, y, 0.6 + rand() * 1.1)
      .fill({ color: rand() < 0.4 ? 0xffd0a0 : 0xff6a4a, alpha: (0.2 + rand() * 0.5) * (1 - f * 0.6) });
  }
}

function fogBank(g, t) {
  for (let n = 0; n < 5; n++) {
    const y = shore(0) + DECK_H - 34 + n * 22 + Math.sin(t * 0.25 + n) * 5;
    for (let k = 0; k < 4; k++) {
      const f = k / 4;
      g.rect(-W / 2, y + f * 9, W, 20 * (1 - f * 0.4))
        .fill({ color: 0xc9cee0, alpha: 0.035 * (1 - f) * (1 + n * 0.15) });
    }
  }
}

function stars(g) {
  const rand = rng(0x5150);
  for (let n = 0; n < 70; n++) {
    const x = -W / 2 + rand() * W, y = -55 + rand() * (DECK_Y + 30);
    if (y > shore(x) - 6) continue;
    g.circle(x, y, 0.5 + rand() * 0.7).fill({ color: 0xf2f4ff, alpha: 0.15 + rand() * 0.45 });
  }
}

/* ---- a panel -------------------------------------------------------------------------------------- */

function panel(w) {
  const c = new Container();
  const back = new Graphics();
  sky(back, w);
  sea(back, w);
  if (w.stars) stars(back);
  const ground = new Graphics();
  land(ground);
  const town = new Container();
  city(town);
  // The air, multiplied over everything that is not a light, and the light it scatters back.
  const scene = new Container();
  scene.addChild(back, ground, town);
  scene.tint = w.air;
  const haze = new Graphics();
  haze.blendMode = "add";
  haze.rect(-W / 2, -60, W, H + 60).fill({ color: w.bloom, alpha: w.bloomA });
  const fall = new Graphics();
  const extra = new Graphics();
  const flash = new Graphics();
  flash.blendMode = "add";
  c.addChild(scene, haze, extra, fall, flash);
  const m = new Graphics();
  m.rect(-W / 2, 0, W, H).fill(0xffffff);
  c.addChild(m);
  c.mask = m;
  return { node: c, w, fall, extra, flash };
}

function step(p, t) {
  precipitation(p.fall, p.w, t);
  p.extra.clear();
  if (p.w.ash) ash(p.extra, t);
  if (p.w.fog) fogBank(p.extra, t);
  p.flash.clear();
  if (!p.w.flash) return;
  // Lightning: rare, two strokes, and gone. What sells it is that the whole frame goes pale for
  // four frames, not the bolt.
  const period = 4.7;
  const f = (t % period) / period;
  const a = f < 0.02 ? 1 : f < 0.05 ? 0.35 : f < 0.075 ? 0.75 : 0;
  if (a) p.flash.rect(-W / 2, -60, W, H + 60).fill({ color: 0xbcd0ff, alpha: 0.3 * a });
}

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);
  app.stage.eventMode = "none";
  app.canvas.style.touchAction = "pan-y";

  const panels = WEATHER.map(panel);
  for (const p of panels) app.stage.addChild(p.node);

  const layout = () => {
    const narrow = window.innerWidth < 860;
    const cols = narrow ? 1 : 2;
    const rowH = narrow ? 390 : 404;
    const rows = Math.ceil(panels.length / cols);
    host.style.height = `${rows * rowH}px`;
    app.renderer.resize(host.clientWidth, rows * rowH);
    const labels = document.getElementById("labels");
    labels.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    labels.style.gridAutoRows = `${rowH}px`;
    const cw = app.screen.width / cols;
    panels.forEach((p, n) => {
      const s = Math.min(1.35, (cw - 26) / W, (rowH - 136) / H);
      p.node.scale.set(s);
      p.node.position.set(cw * (n % cols) + cw / 2, rowH * Math.floor(n / cols) + 124);
    });
  };
  layout();
  window.addEventListener("resize", layout);

  app.ticker.add(() => {
    const t = performance.now() / 1000;
    for (const p of panels) step(p, t);
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
