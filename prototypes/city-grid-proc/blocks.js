// Building study II — the six types the city needs besides the three towers.
// Deliberately OUTSIDE src/: design exploration.
//
// The three original silhouettes are monuments. A city is mostly what stands between them:
// shops, a mall, cheap sleep, the infrastructure nobody looks at, transit, and one corporate
// slab to be dwarfed by. Each is drawn with its own facade behaviour — how much of it burns
// and how much signage it carries — so the type is readable before the label is.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { TILE_W, TILE_H, ISO, CS, rng, dashLine, MALL, MARKT, KONZERN, DATEN, KAPSEL, STATION } from "./buildings.js";
import { VARIANTS, WIN_SETS, FACADE_OPTS, buildFacade } from "./facadeRender.js";
import { vehicle, VEHICLES } from "./vehicles.js";

const BLOCK_HOLO = 0xb06bff;
const SHOW = [
  { def: MARKT, variant: "ribbon" },
  { def: MALL, variant: "grid" },
  { def: KAPSEL, variant: "grid" },
  { def: DATEN, variant: "exo" },
  { def: STATION, variant: "exo" },
  { def: KONZERN, variant: "ribbon" },
];

// The plate is the real grid cell, so every type is judged at the size it will actually have.
function plate() {
  const g = new Graphics();
  const d = [0, -TILE_H / 2, TILE_W / 2, 0, 0, TILE_H / 2, -TILE_W / 2, 0];
  g.poly(d).fill({ color: 0x0a0818, alpha: 0.8 });
  for (let n = 0; n < 4; n++) {
    dashLine(g, d[n * 2], d[n * 2 + 1], d[((n + 1) % 4) * 2], d[((n + 1) % 4) * 2 + 1], 5, 4);
  }
  g.stroke({ width: 1, color: BLOCK_HOLO, alpha: 0.35 });
  return g;
}

function panel(entry, seed) {
  const c = new Container();
  c.addChild(plate());
  const cells = entry.def.build();
  const win = WIN_SETS[entry.def.key];
  const opts = FACADE_OPTS[entry.def.key] ?? {};
  const variant = VARIANTS.find((v) => v.key === entry.variant) ?? VARIANTS[0];
  const { solid, glows, box } = buildFacade(cells, variant, win, seed, 1, opts);
  let si = 0, sj = 0;
  for (const [i, j] of cells) { si += i; sj += j; }
  const ox = -(si / cells.length - sj / cells.length) * CS;
  const oy = -(si / cells.length + sj / cells.length) * CS * ISO;
  const inner = new Container();
  const fit = Math.min(1, (TILE_W * 1.05) / Math.max(1, box.maxX - box.minX));
  inner.scale.set(fit);
  for (const g of [...solid, ...glows]) { g.position.set(ox, oy); inner.addChild(g); }
  c.addChild(inner);

  const parked = new Graphics();                       // one vehicle for scale, as in the studies
  vehicle(parked, "E", { ...VEHICLES[seed % VEHICLES.length].spec, alt: 2 });
  parked.position.set(-TILE_W * 0.3, TILE_H * 0.22);
  c.addChild(parked);

  const rand = rng(seed * 7717 + 5);
  const shards = new Graphics();                       // the hologrid accent, as everywhere else
  for (let n = 0; n < 3; n++) {
    const a = rand() * Math.PI * 2, dd = 40 + rand() * 26, s = 2.5 + rand() * 2;
    const x = Math.cos(a) * dd, y = -20 - rand() * 30 + Math.sin(a) * dd * 0.5;
    shards.poly([x, y - s, x + s * 0.55, y, x, y + s, x - s * 0.55, y])
      .fill({ color: BLOCK_HOLO, alpha: 0.18 }).stroke({ width: 0.9, color: BLOCK_HOLO, alpha: 0.85 });
  }
  c.addChild(shards);
  return { node: c, shards, phase: rand() * 6.28, h: (box.maxY - box.minY) * fit };
}

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const panels = SHOW.map((entry, n) => panel(entry, n + 3));
  for (const p of panels) app.stage.addChild(p.node);

  const layout = () => {
    const narrow = window.innerWidth < 820;
    const cols = narrow ? 1 : 3;
    const rowH = narrow ? 300 : 340;
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
      // Scaled to fit its own height too, or the tall types run out of their row.
      const s = Math.min(1.5, cw / 260, (rowH - 120) / Math.max(1, p.h));
      p.node.scale.set(s);
      p.node.position.set(cx, top + rowH * 0.84);
    });
  };
  layout();
  window.addEventListener("resize", layout);

  app.ticker.add(() => {
    const t = performance.now() / 1000;
    for (const p of panels) p.shards.y = Math.sin(t * 0.7 + p.phase) * 3;
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
