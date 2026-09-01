// Ten buildings — two in the language we already have, eight leaning on Japanese cyberpunk.
// Deliberately OUTSIDE src/: design exploration, and deliberately not wired into the city.
//
// The cast lives in jpBuildings.js and its parts in refRender.js and jpRender.js; this file is
// only the page.
//
// What separates the eight from the two: the reference street is not made of nicer towers, it is
// made of buildings that are COVERED — signs down the whole facade, a canopy and lanterns at head
// height, service clutter on the roof, cables across the gap. Height is not the variety; the
// amount of stuff on a wall is. So four of the eight are deliberately low or tiny, and one is
// almost unlit — without something plain and something small the neon has nothing to be bright
// against.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { padSlab } from "./jpRender.js";
import { JP_BUILDINGS } from "./jpBuildings.js";

/* ---- page --------------------------------------------------------------------------------------- */

function panel(item) {
  const c = new Container();
  const ground = new Graphics();
  const groundGlow = new Graphics();
  groundGlow.blendMode = "add";
  padSlab(ground, groundGlow, item.foot, item.hue);
  const body = new Graphics();
  const glow = new Graphics();
  glow.blendMode = "add";
  item.draw(body, glow);
  c.addChild(ground, groundGlow, body, glow);
  return { node: c, glow, groundGlow };
}

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);
  // Pixi writes touch-action:none on its canvas; this canvas is far taller than a phone screen,
  // so that would swallow every swipe. Nothing here is interactive.
  app.stage.eventMode = "none";
  app.canvas.style.touchAction = "pan-y";

  const panels = JP_BUILDINGS.map(panel);
  for (const p of panels) app.stage.addChild(p.node);

  // Each panel is fitted on its own bounds: the cast runs from a one-storey noodle bar to an
  // eight-storey tower, and one shared scale would render half of them as specks.
  const layout = () => {
    const narrow = window.innerWidth < 860;
    const cols = narrow ? 1 : 2;
    const rowH = narrow ? 400 : 430;
    const rows = Math.ceil(panels.length / cols);
    host.style.height = `${rows * rowH}px`;
    app.renderer.resize(host.clientWidth, rows * rowH);
    const labels = document.getElementById("labels");
    labels.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    labels.style.gridAutoRows = `${rowH}px`;
    const cw = app.screen.width / cols;
    panels.forEach((p, n) => {
      p.node.scale.set(1);
      p.node.position.set(0, 0);
      const bb = p.node.getLocalBounds();
      const boxH = rowH - 132;                              // what is left under the label
      const s = Math.min(2.4, (cw - 36) / bb.width, boxH / bb.height);
      p.node.scale.set(s);
      p.node.position.set(
        cw * (n % cols) + cw / 2 - (bb.x + bb.width / 2) * s,
        rowH * Math.floor(n / cols) + 122 + boxH / 2 - (bb.y + bb.height / 2) * s);
    });
  };
  layout();
  window.addEventListener("resize", layout);

  app.ticker.add(() => {
    const t = performance.now() / 1000;
    panels.forEach((p, n) => {
      p.glow.alpha = 0.94 + Math.sin(t * 0.9 + n * 0.7) * 0.06;
      p.groundGlow.alpha = 0.9 + Math.sin(t * 0.55 + n) * 0.1;
    });
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
