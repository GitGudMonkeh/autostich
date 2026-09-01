// Street study — three street variants with signage, signals and floating displays.
// Deliberately OUTSIDE src/: design exploration.
//
// Same rules as the facade and prop studies: detail on continuous surfaces, one lead colour per
// object plus a lighter shade, hologrid only as an accent. Everything is drawn at the REAL cell
// size (132 × 66) over a run of three tiles, so the carriageway, the kerb and every sign are at
// the size they would have in the grid — only the panel is scaled up for inspection.
//
// Coordinates: (a, b) are continuous tile coordinates — a runs along +i (down-right), b along +j
// (down-left). Tile n covers a ∈ [n-0.5, n+0.5]. Heights are plain pixels above the ground.

import { Application, Graphics, Container } from "./vendor/pixi.min.mjs";
import { rng, dashLine, TILE_W, TILE_H } from "./buildings.js";
import {
  pt, slab, wallA, wallB, LANE, WHITE, A0, A1,
  roadBed, centreLine, lamp, signal, signPost, holoDisplay, kiosk, gantry, bollard,
  groundPanel, crossing, drawPiece,
} from "./streetRender.js";
import { vehicle, VEHICLES } from "./vehicles.js";

/* ---- the three street variants ------------------------------------------------------------ */

// S1 · Boulevard — the ordinary lit street: wide lanes, kerb light, lamps, signage, one signal.
const BOULEVARD = {
  key: "boulevard",
  name: "Boulevard",
  lead: 0x8ceaff,
  draw(g, glow, rand) {
    roadBed(g, 0x35d6ff);
    centreLine(g, 0xffc94a);
    for (const side of [-1, 1]) {                                    // lane edge lines
      const p = pt(A0, side * (LANE - 0.06)), q = pt(A1, side * (LANE - 0.06));
      g.moveTo(p[0], p[1]).lineTo(q[0], q[1]);
    }
    g.stroke({ width: 1, color: WHITE, alpha: 0.3 });
    const items = [];
    items.push([0.54, (gg) => lamp(gg, glow, 0.1, 0.44, 0x9fd8ff)]);
    items.push([0.96, (gg) => lamp(gg, glow, 1.4, -0.44, 0x9fd8ff)]);
    items.push([2.64, (gg) => signal(gg, glow, 2.2, 0.44, 2)]);
    items.push([0.36, (gg) => signPost(gg, glow, 0.8, -0.44, 0x8ceaff, rand)]);
    items.push([1.48, (gg) => groundPanel(gg, glow, 1.9, -0.42, 0x8ceaff)]);
    items.push([1.6, (gg) => holoDisplay(gg, glow, 1.1, 0.52, 32, 0.22, 14, 0x8ceaff, rand)]);
    for (const a of [0.35, 0.6, 1.65]) items.push([a - 0.4, (gg) => bollard(gg, a, -0.4, 0x9fd8ff)]);
    return items;
  },
};

// S2 · Gasse — the dense shopping lane: narrow, signs hung across the street, kiosks, floor
//      strips. This is the variant that makes a block feel inhabited.
const GASSE = {
  key: "gasse",
  name: "Neon-Gasse",
  lead: 0xff8ad8,
  draw(g, glow, rand) {
    roadBed(g, 0xff4fd8);
    centreLine(g, 0xff8ad8, 5, 6);
    const items = [];
    for (const a of [0.4, 1.3, 2.1]) {                               // signs strung over the lane
      const l = pt(a, -0.46, 26), r = pt(a, 0.46, 28);
      items.push([a, (gg) => {
        gg.moveTo(l[0], l[1]).lineTo(r[0], r[1]).stroke({ width: 0.8, color: 0x5a5480, alpha: 0.8 });
        for (let n = 0; n < 3; n++) {
          const t = 0.2 + n * 0.3, b = -0.46 + t * 0.92, top = 26 + t * 2;
          const c = n % 2 ? 0xff8ad8 : 0xffc478;
          gg.poly(wallB(b - 0.07, b + 0.07, a, top - 7, top - 1)).fill({ color: c, alpha: 0.8 });
          gg.poly(wallB(b - 0.07, b + 0.07, a, top - 7, top - 1)).stroke({ width: 0.8, color: c, alpha: 0.95 });
          glow.poly(wallB(b - 0.13, b + 0.13, a, top - 9, top + 1)).fill({ color: c, alpha: 0.11 });
        }
      }]);
    }
    items.push([1.14, (gg) => kiosk(gg, glow, 0.7, 0.44, 0xff8ad8)]);
    items.push([1.36, (gg) => kiosk(gg, glow, 1.8, -0.44, 0xffc478)]);
    items.push([1.59, (gg) => signPost(gg, glow, 1.15, 0.44, 0xff8ad8, rand)]);
    items.push([2.79, (gg) => lamp(gg, glow, 2.35, 0.44, 0xff9fe0)]);
    items.push([-0.24, (gg) => lamp(gg, glow, 0.2, -0.44, 0xff9fe0)]);
    for (const a of [0.5, 1.0, 1.5, 2.0]) items.push([a + 0.42, (gg) => groundPanel(gg, glow, a, 0.42, 0xff8ad8)]);
    items.push([1.05, (gg) => holoDisplay(gg, glow, 1.55, -0.52, 28, 0.18, 12, 0xffc478, rand)]);
    return items;
  },
};

// S3 · Magistrale — the through road: guard rails, chevrons, a signal gantry and the big
//      floating billboard over the carriageway.
const MAGISTRALE = {
  key: "magistrale",
  name: "Magistrale",
  lead: 0xffc478,
  draw(g, glow, rand) {
    roadBed(g, 0xffc478);
    for (const b of [-0.16, 0.16]) {                                 // two lanes each way
      const p = pt(A0, b), q = pt(A1, b);
      dashLine(g, p[0], p[1], q[0], q[1], 11, 9);
    }
    g.stroke({ width: 1.3, color: WHITE, alpha: 0.35 });
    centreLine(g, 0xffc94a, 14, 6);
    for (let a = A0 + 0.2; a < A1; a += 0.4) {                       // chevrons on the hard strip
      const c0 = pt(a, -0.29), c1 = pt(a + 0.12, -0.22), c2 = pt(a, -0.15);
      g.moveTo(c0[0], c0[1]).lineTo(c1[0], c1[1]).lineTo(c2[0], c2[1]);
    }
    g.stroke({ width: 1, color: 0xffc478, alpha: 0.45 });
    const items = [];
    for (const side of [-1, 1]) {                                    // guard rails on both kerbs
      items.push([side < 0 ? -0.9 : 2.9, (gg) => {
        gg.poly(wallA(A0, A1, side * (LANE + 0.02), 3, 4)).fill({ color: 0x4a4370 });
        gg.poly(wallA(A0, A1, side * (LANE + 0.02), 7, 8.2)).fill({ color: 0x5a5480 });
        for (let a = A0 + 0.15; a < A1; a += 0.3) {
          gg.moveTo(...pt(a, side * (LANE + 0.02), 3)).lineTo(...pt(a, side * (LANE + 0.02), 8));
        }
        gg.stroke({ width: 0.9, color: 0x4a4370 });
      }]);
    }
    items.push([1.5, (gg) => gantry(gg, glow, 1.5, 0xffc478, rand)]);
    items.push([1.86, (gg) => signal(gg, glow, 2.3, -0.44, 0)]);
    items.push([1.02, (gg) => holoDisplay(gg, glow, 0.5, 0.54, 38, 0.28, 17, 0xff8ad8, rand)]);
    items.push([1.46, (gg) => holoDisplay(gg, glow, 2.0, -0.56, 42, 0.2, 13, 0x8ceaff, rand)]);
    items.push([0.46, (gg) => lamp(gg, glow, 0.9, -0.44, 0xffd8a0)]);
    items.push([2.89, (gg) => lamp(gg, glow, 2.45, 0.44, 0xffd8a0)]);
    return items;
  },
};


/* ---- the four connection pieces ------------------------------------------------------------ */

// K1 · Kreuzung — the controlled crossing: four arms, zebra on each, two signals diagonally
//      opposite and a display hanging over the middle.
const KREUZUNG = {
  key: "kreuzung", name: "Kreuzung", kind: "piece",
  draw(g, glow, rand) {
    drawPiece(g, glow, ["pa", "na", "pb", "nb"], 0x35d6ff, 0xffc94a);
    for (const d of ["pa", "na", "pb", "nb"]) crossing(g, 0, 0, d, WHITE);
    const items = [];
    items.push([0.44 + 0.44, (gg) => signal(gg, glow, 0.44, 0.44, 2)]);
    items.push([-0.88, (gg) => signal(gg, glow, -0.44, -0.44, 0)]);
    items.push([0.0, (gg) => holoDisplay(gg, glow, 0, 0.62, 34, 0.24, 15, 0x8ceaff, rand)]);
    items.push([-0.44 + 0.44, (gg) => lamp(gg, glow, -0.44, 0.44, 0x9fd8ff)]);
    items.push([0.44 - 0.44, (gg) => groundPanel(gg, glow, 0.44, -0.44, 0x8ceaff)]);
    return items;
  },
};

// K2 · T-Stück — the side street meets the through road: one signal, zebra only where the side
//      street crosses, and a sign post that names the turn.
const TSTUECK = {
  key: "tstueck", name: "T-Stück", kind: "piece",
  draw(g, glow, rand) {
    drawPiece(g, glow, ["pa", "na", "pb"], 0xff8ad8, 0xffc94a);
    crossing(g, 0, 0, "pb", WHITE);
    const items = [];
    items.push([0.88, (gg) => signal(gg, glow, 0.44, 0.44, 2)]);
    items.push([-0.88, (gg) => signPost(gg, glow, -0.44, -0.44, 0xff8ad8, rand)]);
    items.push([-0.44 + 0.44, (gg) => lamp(gg, glow, -0.44, 0.44, 0xff9fe0)]);
    items.push([0.0, (gg) => holoDisplay(gg, glow, 0.1, -0.62, 30, 0.2, 13, 0xff8ad8, rand)]);
    items.push([0.44 - 0.44, (gg) => kiosk(gg, glow, 0.44, -0.44, 0xffc478)]);
    return items;
  },
};

// K3 · Kurve — the bend: the kerb light follows it round, bollards guard the outer corner.
const KURVE = {
  key: "kurve", name: "Kurve", kind: "piece",
  draw(g, glow, rand) {
    drawPiece(g, glow, ["pa", "pb"], 0xffc478, 0xffc94a);
    const items = [];
    items.push([-0.88, (gg) => lamp(gg, glow, -0.44, -0.44, 0xffd8a0)]);
    for (const [a, b] of [[0.42, -0.42], [0.2, -0.44], [0.44, -0.2]]) {
      items.push([a + b, (gg) => bollard(gg, a, b, 0xffc478)]);
    }
    items.push([0.0, (gg) => signPost(gg, glow, -0.42, 0.42, 0xffc478, rand)]);
    items.push([0.2, (gg) => holoDisplay(gg, glow, -0.15, 0.6, 28, 0.18, 12, 0xffc478, rand)]);
    return items;
  },
};

// K4 · Sackgasse — the dead end: the road stops, bollards close it off and the sign says so.
const SACKGASSE = {
  key: "sackgasse", name: "Sackgasse", kind: "piece",
  draw(g, glow, rand) {
    drawPiece(g, glow, ["na"], 0x8ceaff, 0xffc94a);
    g.poly(slab(0.2, 0.3, -LANE, LANE, 0.4)).fill({ color: 0xff4d5e, alpha: 0.5 });
    const items = [];
    for (const b of [-0.2, 0, 0.2]) items.push([0.34 + b, (gg) => bollard(gg, 0.34, b, 0x8ceaff)]);
    items.push([-0.88, (gg) => lamp(gg, glow, -0.44, -0.44, 0x9fd8ff)]);
    items.push([0.0, (gg) => signPost(gg, glow, 0.44, 0.3, 0x8ceaff, rand)]);
    items.push([0.1, (gg) => holoDisplay(gg, glow, 0.42, -0.58, 26, 0.16, 11, 0x8ceaff, rand)]);
    return items;
  },
};

const PIECES = [KREUZUNG, TSTUECK, KURVE, SACKGASSE];

const STREETS = [BOULEVARD, GASSE, MAGISTRALE];

/* ---- page --------------------------------------------------------------------------------- */

function streetPanel(def, seed) {
  const c = new Container();
  const g = new Graphics();          // road bed and markings
  const glow = new Graphics();       // additive light, drawn over everything
  glow.blendMode = "add";
  const rand = rng(seed * 7919 + 17);
  const items = def.draw(g, glow, rand) || [];

  // One vehicle per street, on the carriageway, so every sign has something to be read from.
  const v = VEHICLES[seed % VEHICLES.length];
  const carAt = def.kind === "piece" ? [-0.7, -0.16] : [1.15, -0.16];
  items.push([carAt[0] + carAt[1], (gg) => {                         // one car on the carriageway
    vehicle(gg, "E", { ...v.spec, alt: 4 });
    const cp = pt(carAt[0], carAt[1], 0);
    gg.position.set(cp[0], cp[1]);
  }]);

  // Each prop gets its own Graphics and they are added in depth order, so a lamp on the near
  // kerb covers the car and a lamp on the far kerb does not.
  const layer = new Container();
  items.sort((a, b) => a[0] - b[0]).forEach(([, draw]) => {
    const gg = new Graphics();
    draw(gg);
    layer.addChild(gg);
  });
  c.addChild(g, layer, glow);
  // Fit on the ROAD, not on the drawing. getLocalBounds() counts the additive light pools and
  // holo halos, which reach much further on one side than the other and pushed the crossing off
  // centre. The carriageway is what the eye centres on, and its extent is known exactly:
  // a piece is a plus of five cells, a run is three cells long; signage adds headroom above.
  const box = def.kind === "piece"
    ? { x0: -2.3 * TILE_W / 2, x1: 2.3 * TILE_W / 2, y0: -1 * TILE_H / 2 - 58, y1: 1.15 * TILE_H }
    : { x0: pt(A0, 0.55)[0] - 14, x1: pt(A1, -0.55)[0] + 14, y0: pt(A0, -0.55, 58)[1], y1: pt(A1, 0.55)[1] };
  return { node: c, glow, box, phase: rand() * 6.28 };
}

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);
  // Pixi puts touch-action:none on its canvas. The canvas here is taller than a phone screen,
  // so that swallows every swipe and the page cannot be scrolled. Nothing on it is interactive.
  app.stage.eventMode = "none";
  app.canvas.style.touchAction = "pan-y";

  const panels = [...STREETS, ...PIECES].map((d, n) => {
    const p = streetPanel(d, n + 1);
    app.stage.addChild(p.node);
    return p;
  });

  const layout = () => {
    const narrow = window.innerWidth < 820;
    const cols = narrow ? 1 : 3;
    const rowH = narrow ? 320 : 400;
    const labelH = narrow ? 104 : 92;
    const rows = Math.ceil(panels.length / cols);
    host.style.height = `${rows * rowH}px`;
    app.renderer.resize(host.clientWidth, rows * rowH);
    const labels = document.getElementById("labels");
    labels.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    labels.style.gridAutoRows = `${rowH}px`;
    // Every panel is fitted from ITS OWN extent. Runs and junction pieces have different
    // footprints; one shared box centred the crossing on the run's centre and pushed it out
    // of its cell.
    const cw = app.screen.width / cols;
    panels.forEach((p, n) => {
      const { x0, x1, y0, y1 } = p.box;
      const s = Math.min(cw * 0.92 / (x1 - x0), (rowH - labelH) * 0.94 / (y1 - y0), 2.2);
      p.node.scale.set(s);
      p.node.position.set(cw * (n % cols) + cw / 2 - (x0 + x1) / 2 * s,
        rowH * Math.floor(n / cols) + labelH + (rowH - labelH) / 2 - (y0 + y1) / 2 * s);
    });
  };
  layout();
  window.addEventListener("resize", layout);

  app.ticker.add(() => {                                             // holo panels breathe
    const t = performance.now() / 1000;
    for (const p of panels) p.glow.alpha = 0.78 + 0.22 * Math.sin(t * 1.5 + p.phase);
  });
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
