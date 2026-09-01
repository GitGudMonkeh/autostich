// Street study — the reference look with a street system between the buildings.
// Deliberately OUTSIDE src/: design exploration.
//
// The parts live in refStreet.js and refRender.js; this file is only the page.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { rng } from "./buildings.js";
import { PAL, drawBlock } from "./refRender.js";
import { STREET_BLOCKS, MIDI, MIDJ, A1, B0, C1, D0, streetGround, lamp, car, tram } from "./refStreet.js";

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const world = new Container();
  app.stage.addChild(world);

  const road = new Graphics();
  const roadGlow = new Graphics();
  roadGlow.blendMode = "add";
  streetGround(road, roadGlow);
  world.addChild(road, roadGlow);

  // Buildings and traffic share one painter order: whatever is further back is drawn first.
  const body = new Graphics();
  const glow = new Graphics();
  glow.blendMode = "add";
  const items = [
    ...STREET_BLOCKS.map((b) => ({ d: b.i0 + b.j0 + b.k0 * 0.01, run: () => drawBlock(body, glow, b, rng(Math.round(b.i0 * 733 + b.j0 * 977 + b.k0 * 31))) })),
    { d: MIDJ + 1.5, run: () => tram(body, glow, 1.5, 9.5, MIDJ + 1.5) },
    { d: MIDI - 3, run: () => car(body, glow, MIDI - 3.4, MIDJ - 1.1, "i", PAL.cyan) },
    { d: MIDI + 5, run: () => car(body, glow, MIDI + 5.5, MIDJ - 1.1, "i", PAL.pink) },
    { d: MIDJ + 6, run: () => car(body, glow, MIDI + 1.1, MIDJ + 6.5, "j", PAL.cyan) },
    { d: MIDJ - 6, run: () => car(body, glow, MIDI - 1.1, MIDJ - 6.5, "j", PAL.white) },
    { d: A1 + C1, run: () => lamp(body, glow, A1 + 0.7, C1 + 0.7) },
    { d: B0 + C1, run: () => lamp(body, glow, B0 - 0.7, C1 + 0.7) },
    { d: A1 + D0, run: () => lamp(body, glow, A1 + 0.7, D0 - 0.7) },
    { d: B0 + D0, run: () => lamp(body, glow, B0 - 0.7, D0 - 0.7) },
  ].sort((a, b) => a.d - b.d);
  for (const it of items) it.run();
  world.addChild(body, glow);

  const layout = () => {
    world.scale.set(1);
    world.position.set(0, 0);
    const bb = world.getLocalBounds();
    const s = Math.min(2.2, (app.screen.width * 0.9) / bb.width, (app.screen.height * 0.9) / bb.height);
    world.scale.set(s);
    world.position.set(app.screen.width / 2 - (bb.x + bb.width / 2) * s,
      app.screen.height / 2 - (bb.y + bb.height / 2) * s);
  };
  layout();
  app.renderer.on("resize", layout);

  app.ticker.add(() => {
    const t = performance.now() / 1000;
    glow.alpha = 0.94 + Math.sin(t * 0.9) * 0.06;
    roadGlow.alpha = 0.9 + Math.sin(t * 0.55 + 1) * 0.1;
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
