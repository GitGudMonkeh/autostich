// Ten buildings — two in the language we already have, eight leaning on Japanese cyberpunk.
// Deliberately OUTSIDE src/: design exploration, and deliberately not wired into the city.
//
// The parts live in refRender.js and jpRender.js; this file is the cast and the page.
//
// What separates the eight from the two: the reference street is not made of nicer towers, it is
// made of buildings that are COVERED — signs down the whole facade, a canopy and lanterns at head
// height, service clutter on the roof, cables across the gap. Height is not the variety; the
// amount of stuff on a wall is. So four of the eight are deliberately low or tiny, and one is
// almost unlit — without something plain and something small the neon has nothing to be bright
// against.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { P, rng } from "./buildings.js";
import { PAL, drawBlock, railing } from "./refRender.js";
import {
  ledScreen, signStack, marquee, awning, lanterns, noren, vending,
  ventStack, waterTank, mast, cableRun, gate, capsulePods, padSlab,
} from "./jpRender.js";

/* ---- the cast ---------------------------------------------------------------------------------- */

const BLOCKS = [
  // 1 — the tower we already have, unchanged, as the yardstick for the other nine.
  {
    key: "wohnturm", name: "Wohnturm", tag: "bekannt", hue: PAL.cyan,
    desc: "Der Turm, den wir schon haben: gestapelte Blöcke, große Fenster, Dachgarten. Steht hier als Maßstab.",
    foot: { i0: 0, i1: 2, j0: 0, j1: 2 },
    draw(g, glow) {
      const r = rng(0x2101);
      drawBlock(g, glow, { i0: 0, i1: 2, j0: 0, j1: 2, k0: 0, k1: 4, temp: "cool", cols: 2, lit: 0.72, roof: "rail" }, r);
      drawBlock(g, glow, { i0: 0, i1: 1, j0: 0, j1: 1, k0: 5, k1: 7, temp: "cool", cols: 2, lit: 0.85, roof: "plant", dark: 0.94 }, r);
    },
  },
  // 2 — the low shop row we already have.
  {
    key: "ladenzeile", name: "Ladenzeile", tag: "bekannt", hue: PAL.warm,
    desc: "Die flache Zeile, die wir schon haben: drei Fensterachsen, Dachgarten, ein Wandschild.",
    foot: { i0: 0, i1: 3, j0: 0, j1: 2 },
    draw(g, glow) {
      const r = rng(0x2102);
      drawBlock(g, glow, {
        i0: 0, i1: 3, j0: 0, j1: 2, k0: 0, k1: 1, temp: "warm", cols: 3, lit: 0.92,
        roof: "garden", wallSign: "pink",
      }, r);
    },
  },
  // 3 — the LED wall. One building in a street may have this; it sets the light for all the rest.
  {
    key: "bildschirm", name: "Bildschirmhaus", tag: "neu", hue: PAL.cyan,
    desc: "Die halbe Fassade ist ein Bildschirm. Hellster Gegenstand der Straße, harter weißer Rahmen, Halo weit über die Wand hinaus. Darunter Markise und Laternen.",
    foot: { i0: 0, i1: 3, j0: 0, j1: 2 },
    draw(g, glow) {
      const r = rng(0x2103);
      // A low shopfront carries the screen block, as in the reference: the screen needs something
      // ordinary underneath it or it reads as a billboard on a pole.
      const base = { i0: 0, i1: 3, j0: 0, j1: 2, k0: 0, k1: 1, temp: "warm", cols: 3, lit: 0.9, roof: "rail" };
      drawBlock(g, glow, base, r);
      const b = { i0: 0, i1: 2, j0: 0, j1: 2, k0: 2, k1: 5, temp: "cool", cols: 2, lit: 0.35, roof: "rail" };
      drawBlock(g, glow, b, r);
      ledScreen(g, glow, b, "right", 0x51, PAL.cyan);
      awning(g, glow, base, "left", 0.7);
      lanterns(g, glow, base, "left", 0.7, 4);
      ventStack(g, b, 6, r);
    },
  },
  // 4 — the sign tower: narrow, and every square metre of it is let to somebody.
  {
    key: "schilderturm", name: "Schilderturm", tag: "neu", hue: PAL.pink,
    desc: "Schmaler Schaft, beide Fassaden voll gestapelter Leuchtkästen in vier Farben. Nicht die Höhe macht die Variation, sondern wie viel an der Wand hängt.",
    foot: { i0: 0, i1: 1, j0: 0, j1: 1 },
    draw(g, glow) {
      const r = rng(0x2104);
      const b = { i0: 0, i1: 1, j0: 0, j1: 1, k0: 0, k1: 7, temp: "cool", cols: 2, lit: 0.5, roof: "rail" };
      drawBlock(g, glow, b, r);
      signStack(g, glow, b, "right", 0x77);
      signStack(g, glow, b, "left", 0xa3);
      mast(g, glow, b, 8, 2);
    },
  },
  // 5 — the amusement hall: wide, low, and lit like a machine.
  {
    key: "spielhalle", name: "Spielhalle", tag: "neu", hue: PAL.pink,
    desc: "Breiter flacher Kasten, Marquee mit Lampenreihe über der ganzen Front, Automatenreihe an der Seite. Innen heller als draußen.",
    foot: { i0: 0, i1: 4, j0: 0, j1: 2 },
    draw(g, glow) {
      const r = rng(0x2105);
      const b = { i0: 0, i1: 4, j0: 0, j1: 2, k0: 0, k1: 1, temp: "hot", cols: 3, lit: 1, roof: "sign" };
      drawBlock(g, glow, b, r);
      marquee(g, glow, b, "right", PAL.warm);
      vending(g, glow, b, "left", 0, 3, 0x19);
      ventStack(g, b, 2, r);
    },
  },
  // 6 — the alley. Two tiny buildings and the gap between them; the gap is the building.
  {
    key: "gasse", name: "Yokocho-Gasse", tag: "neu", hue: PAL.warm,
    desc: "Zwei winzige Häuser und die Lücke dazwischen. Markisen, Laternen, Noren, und Kabel quer über die Gasse — der Zwischenraum trägt das Motiv, nicht die Bauten.",
    foot: { i0: 0, i1: 2, j0: 0, j1: 4 },
    draw(g, glow) {
      const r = rng(0x2106);
      // The alley floor first, and it is the brightest surface here: the light comes from the two
      // shopfronts facing each other across it.
      const al = { i0: -0.5, i1: 2.5, j0: 0.5, j1: 3.5 };
      g.poly([...P(al.i0, al.j0, 0.02), ...P(al.i1, al.j0, 0.02),
        ...P(al.i1, al.j1, 0.02), ...P(al.i0, al.j1, 0.02)]).fill(0x241d3c);
      const [ax, ay] = P((al.i0 + al.i1) / 2, (al.j0 + al.j1) / 2, 0);
      for (let n = 4; n >= 1; n--) {
        glow.ellipse(ax, ay, 52 * (n / 4), 24 * (n / 4)).fill({ color: PAL.warm, alpha: 0.075 });
      }
      // Two tiny houses facing each other across it. The gap is the building.
      const west = { i0: 0, i1: 2, j0: 0, j1: 0, k0: 0, k1: 1, temp: "warm", cols: 3, lit: 0.95, roof: "rail" };
      drawBlock(g, glow, west, r);
      awning(g, glow, west, "left", 0.8);
      lanterns(g, glow, west, "left", 0.8, 4);
      noren(g, glow, west, "left", 0);
      const east = { i0: 0, i1: 2, j0: 4, j1: 4, k0: 0, k1: 2, temp: "hot", cols: 3, lit: 0.9, roof: "rail" };
      drawBlock(g, glow, east, r);
      signStack(g, glow, east, "right", 0x5f);
      cableRun(g, 2.9, 0.6, 2.4, -0.2, 3, 0.3, 4, 0x5b);
    },
  },
  // 7 — the capsule tower: the pods ARE the building, and each one is a lit porthole.
  {
    key: "kapselturm", name: "Kapselturm", tag: "neu", hue: PAL.cyan,
    desc: "Ein dünner Schaft, an den Wohnkapseln gehängt sind — jede mit einem runden Fenster. Die Silhouette ist unregelmäßig, weil manche Kapseln fehlen.",
    foot: { i0: -1, i1: 1, j0: -1, j1: 1 },
    draw(g, glow) {
      const r = rng(0x2107);
      drawBlock(g, glow, { i0: -1, i1: 1, j0: -1, j1: 1, k0: 0, k1: 0, temp: "warm", cols: 3, lit: 0.9, roof: "rail" }, r);
      const b = { i0: 0, i1: 0, j0: 0, j1: 0, k0: 1, k1: 8, temp: "cool", cols: 1, lit: 0.35, roof: "rail" };
      drawBlock(g, glow, b, r);
      capsulePods(g, glow, b, 0xc1);
    },
  },
  // 8 — the shrine corner: a low hall set back behind a neon gate.
  {
    key: "torhof", name: "Torhof", tag: "neu", hue: PAL.pink,
    desc: "Flache Halle, davor ein Tor aus Licht statt aus Stein. Der einzige Bau, bei dem der Vorplatz mehr zählt als das Haus.",
    foot: { i0: 0, i1: 4, j0: 0, j1: 1 },
    draw(g, glow) {
      const r = rng(0x2108);
      const b = { i0: 0, i1: 2, j0: 0, j1: 1, k0: 0, k1: 1, temp: "warm", cols: 3, lit: 0.8, roof: "garden" };
      drawBlock(g, glow, b, r);
      gate(g, glow, 4.4, 0.5, 0, 2.4, 2.6);
      lanterns(g, glow, b, "left", 0.9, 2);
    },
  },
  // 9 — the smallest thing in the set. Without it the towers have nothing to be tall against.
  {
    key: "imbiss", name: "Ramen-Ecke", tag: "neu", hue: PAL.warm,
    desc: "Ein Geschoss, sechs Plätze. Noren über dem Eingang, Automatenwand daneben, warmes Licht das nach draußen fällt. Das kleinste Gebäude im Satz.",
    foot: { i0: 0, i1: 1, j0: 0, j1: 0 },
    draw(g, glow) {
      const r = rng(0x2109);
      const b = { i0: 0, i1: 1, j0: 0, j1: 0, k0: 0, k1: 0, temp: "warm", cols: 2, lit: 1, roof: "rail" };
      drawBlock(g, glow, b, r);
      awning(g, glow, b, "right", 0.75);
      noren(g, glow, b, "right", 0);
      lanterns(g, glow, b, "right", 0.75, 2);
      vending(g, glow, b, "left", 0, 2, 0x31);
    },
  },
  // 10 — the dark one. Every lit building in the set needs this standing next to it.
  {
    key: "technikturm", name: "Technikturm", tag: "neu", hue: PAL.cyan,
    desc: "Fast unbeleuchtet: Wassertank, Lüfterkästen, Rohre, ein rotes Blinklicht, Kabelbündel. Die Fläche, gegen die alles andere hell wirkt.",
    foot: { i0: 0, i1: 2, j0: 0, j1: 2 },
    draw(g, glow) {
      const r = rng(0x210a);
      const b = { i0: 0, i1: 2, j0: 0, j1: 2, k0: 0, k1: 3, temp: "cool", cols: 2, lit: 0.14, dark: 0.84, roof: "rail" };
      drawBlock(g, glow, b, r);
      ventStack(g, { i0: 1.2, i1: 2, j0: 0, j1: 2 }, 4, r);
      waterTank(g, { i0: 0, i1: 0.8, j0: 0.2, j1: 1.4 }, 4);
      mast(g, glow, { i0: 1.6, i1: 2, j0: 1.6, j1: 2 }, 4, 2.4);
      cableRun(g, 2.9, 1, 3.2, 2.6, 0, -0.5, 5, 0x8f);
      railing(g, b, 4);
    },
  },
];

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

  const panels = BLOCKS.map(panel);
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
