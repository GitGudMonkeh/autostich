// Park and vehicle study — the two props reworked in the facade language.
// Deliberately OUTSIDE src/: design exploration.
//
// Two rules carried over from the facade study, because they are what made the buildings work:
//   1. Detail sits on continuous surfaces, not on stacked blocks.
//   2. One lead colour per object plus a lighter shade of it. Never a mixed set.
// The hologrid stays an accent: a dashed tile border, a holo pylon, a few violet shards.
//
// Everything is drawn at the REAL footprint of a grid cell (132 × 66) and only the panel is
// scaled up. A park that only works at three times its size is not a park for this game.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { rng } from "./buildings.js";
import { PARKS } from "./parkRender.js";

const C2 = 0xb06bff;                // hologrid violet — accent only
import { vehicle, VEHICLES } from "./vehicles.js";

/* ---- page ------------------------------------------------------------------------------- */

function parkPanel(def) {
  const c = new Container();
  const g = new Graphics();
  def.draw(g);
  c.addChild(g);
  const rand = rng(def.key.length * 7919 + 3);
  const shards = new Graphics();                             // hologrid shards, four per park
  for (let n = 0; n < 4; n++) {
    const a = rand() * Math.PI * 2, d = 40 + rand() * 26, s = 2.5 + rand() * 2;
    const x = Math.cos(a) * d, y = -8 - rand() * 26 + Math.sin(a) * d * 0.5;
    shards.poly([x, y - s, x + s * 0.55, y, x, y + s, x - s * 0.55, y])
      .fill({ color: C2, alpha: 0.18 }).stroke({ width: 0.9, color: C2, alpha: 0.85 });
  }
  c.addChild(shards);
  return { node: c, shards, phase: rand() * 6.28 };
}

function vehiclePanel(def) {
  const c = new Container();
  const big = new Graphics();
  vehicle(big, "E", def.spec);
  big.scale.set(2.2);                                        // zoomed for inspection
  c.addChild(big);
  big.position.set(0, -14);
  const strip = new Container();                             // all four headings at real size
  ["N", "E", "S", "W"].forEach((d, n) => {
    const g = new Graphics();
    vehicle(g, d, def.spec);
    g.position.set(-58 + n * 39, 62);
    strip.addChild(g);
  });
  const rule = new Graphics();
  rule.moveTo(-72, 40).lineTo(72, 40).stroke({ width: 1, color: 0x2b2547 });
  c.addChild(rule, strip);
  return { node: c, strip };
}

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const parks = PARKS.map((d) => parkPanel(d));
  const cars = VEHICLES.map((d) => vehiclePanel(d));
  for (const p of [...parks, ...cars]) app.stage.addChild(p.node);

  const layout = () => {
    const narrow = window.innerWidth < 820;
    const cols = narrow ? 1 : 3;
    const ROW_H = narrow ? 300 : 330;
    const rows = cols === 1 ? 6 : 2;
    host.style.height = `${rows * ROW_H}px`;
    app.renderer.resize(host.clientWidth, rows * ROW_H);
    const labels = document.getElementById("labels");
    labels.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    labels.style.gridAutoRows = `${ROW_H}px`;
    const cw = app.screen.width / cols;
    const place = (p, n, cap, anchor) => {
      const cx = cw * (n % cols) + cw / 2;
      const top = ROW_H * Math.floor(n / cols);
      p.node.position.set(cx, top + ROW_H * anchor);
      p.node.scale.set(Math.min(cap, cw / 215));
    };
    parks.forEach((p, n) => place(p, n, 2.6, 0.62));
    cars.forEach((p, n) => place(p, n + 3, 1.7, 0.56));
  };
  layout();
  window.addEventListener("resize", layout);

  app.ticker.add(() => {
    const t = performance.now() / 1000;
    for (const p of parks) p.shards.y = Math.sin(t * 0.7 + p.phase) * 3;
    for (const p of cars) p.strip.y = Math.sin(t * 1.6) * 1.2;
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
