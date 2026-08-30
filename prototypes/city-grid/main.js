// City-Grid Asset-Technik-Prototyp — Pixi v8, isometrisches Grid, Kauf-Bauanimation (unten→oben),
// Straßen-Auto-Tiling. Bewusst AUSSERHALB von src/: kein App-Screen, keine Produktions-Bundle-Wirkung,
// nur ein technischer Test der gelieferten Assets (Straßen-Set + sechs Gebäude-Renders).

import { Application, Assets, Sprite, Graphics, Container } from "./vendor/pixi.min.mjs";

const GRID = 5;                 // 5x5 Zellen: Grundstücke auf geraden (r,c), Straßen dazwischen
// Alle Kachel-PNGs (Grundstück + die 4 Straßentypen aus dem zweiten, saubereren Sheet) liegen auf
// EXAKT derselben Leinwand-Seitenverhältnis (550:378 bei den Straßen, 242:166 beim Grundstück,
// beide ≈1,455) — nur so landen Kanten benachbarter Kacheln auf derselben Linie. Eine andere Ratio
// pro Kachel ergibt bei „TILE_W / tex.width"-Skalierung eine ANDERE Bildhöhe → sichtbare Lücken.
const TILE_W = 242, TILE_H = 166;
// Kacheln werden geringfügig größer als der Grid-Schritt gerendert (Bleed), damit ihre gerenderten
// Ränder einander leicht überlappen statt mit einer Ein-Pixel-Lücke aneinanderzustoßen — die
// Sheet-Kacheln tragen je eine eigene Leuchtrand-Deko, kein nahtloses Straßenmuster; das Bleed
// kaschiert die doppelte Randlinie an der Naht, ersetzt sie aber nicht durch echte Nahtlosigkeit.
const TILE_BLEED = 1.09;
const BUILD_MS = 750;

const isPlot = (r, c) => r % 2 === 0 && c % 2 === 0;
const key = (r, c) => `${r},${c}`;
const inBounds = (r, c) => r >= 0 && r < GRID && c >= 0 && c < GRID;

const ASSETS = {
  plot: "assets/plot_empty.png",
  buildings: [
    "assets/building_pagoda.png", "assets/building_tower.png",
    "assets/building_tower2.png", "assets/building_lowwide.png",
    "assets/building_pyramid.png", "assets/building_round.png",
  ],
  // Zweites Straßen-Sheet (ersetzt das erste vollständig): alle vier Kacheln haben volle
  // Diamant-Pflasterfläche (keine transparenten Kerben an Kreuzung/Ecke wie im ersten Sheet)
  // — keine Pflaster-Unterlage mehr nötig.
  roadStraight: "assets/road_straight.png",
  roadCorner: "assets/road_corner.png",
  roadT: "assets/road_tjunction.png",
  roadCross: "assets/road_cross.png",
};

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const textures = await Assets.load([
    ASSETS.plot, ...ASSETS.buildings, ASSETS.roadStraight, ASSETS.roadCorner, ASSETS.roadT, ASSETS.roadCross,
  ]);

  const world = new Container();
  world.sortableChildren = true;
  app.stage.addChild(world);
  const recenter = () => world.position.set(app.screen.width / 2, 70);
  recenter();
  app.renderer.on("resize", recenter);

  const cellToScreen = (r, c) => ({ x: (c - r) * (TILE_W / 2), y: (c + r) * (TILE_H / 2) });

  // ---- Zustand -------------------------------------------------------------
  const built = new Map();       // key -> buildingIndex (0|1)
  const plotSprites = new Map(); // key -> leere-Grundstück-Sprite (entfernt sobald gebaut)
  const roadSprites = new Map(); // key -> aktives Straßen-Sprite
  let buildCount = 0;

  // ---- Leeres Grid: nur die Grundstücks-Platzhalter, keine Straße sichtbar --
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (!isPlot(r, c)) continue;
      const { x, y } = cellToScreen(r, c);
      const tex = textures[ASSETS.plot];
      const s = new Sprite(tex);
      s.anchor.set(0.5, 0.5); // Bleed muss symmetrisch um die Kachel-Mitte wachsen, nicht nur nach unten
      s.scale.set((TILE_W * TILE_BLEED) / tex.width);
      s.position.set(x, y + TILE_H / 2);
      s.zIndex = r + c;
      s.eventMode = "static";
      s.cursor = "pointer";
      s.on("pointerdown", () => buildAt(r, c));
      world.addChild(s);
      plotSprites.set(key(r, c), s);
    }
  }

  // ---- Bau-Animation: Sprite via Maske von unten nach oben aufdecken -------
  function animateBuildUp(sprite) {
    const dispW = sprite.width, dispH = sprite.height;
    const mask = new Graphics();
    world.addChild(mask);
    sprite.mask = mask;
    mask.zIndex = sprite.zIndex;

    const t0 = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / BUILD_MS);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const h = dispH * eased;
      mask.clear();
      mask.rect(sprite.x - dispW / 2 - 4, sprite.y - h, dispW + 8, h).fill(0xffffff);
      if (t >= 1) { app.ticker.remove(tick); neonFlash(sprite); }
    };
    app.ticker.add(tick);
  }

  // Fertigstellungs-Blitz: additiv geblendetes Sprite-Aufblitzen + zwei auslaufende Neon-Ringe am
  // Kachel-Fußpunkt. Reine Pixi-Grafik (Graphics + additive Blend-Mode), keine Zusatz-Bibliothek.
  function neonFlash(sprite) {
    const baseX = sprite.x, baseY = sprite.y; // anchor(0.5,1) → sprite.y ist bereits der Bodenpunkt

    // Zwei überlagerte additive Kopien (Weiß + Neon-Cyan) fürs "massige" Aufglühen — eine einzelne
    // weiße additive Kopie blieb zu dezent, die Doppelung liest deutlich stärker als Neon-Blitz.
    const flashWhite = new Sprite(sprite.texture);
    flashWhite.anchor.copyFrom(sprite.anchor);
    flashWhite.scale.copyFrom(sprite.scale);
    flashWhite.position.copyFrom(sprite.position);
    flashWhite.mask = sprite.mask;
    flashWhite.tint = 0xffffff;
    flashWhite.blendMode = "add";
    flashWhite.zIndex = sprite.zIndex + 0.4;
    world.addChild(flashWhite);

    const flashCyan = new Sprite(sprite.texture);
    flashCyan.anchor.copyFrom(sprite.anchor);
    flashCyan.scale.set(sprite.scale.x * 1.015);
    flashCyan.position.copyFrom(sprite.position);
    flashCyan.mask = sprite.mask;
    flashCyan.tint = 0x9fe8ff;
    flashCyan.blendMode = "add";
    flashCyan.zIndex = sprite.zIndex + 0.45;
    world.addChild(flashCyan);

    const ring = new Graphics();
    ring.blendMode = "add";
    ring.zIndex = sprite.zIndex + 0.6;
    world.addChild(ring);

    const t0 = performance.now();
    const FLASH_MS = 1100, RING_MS = 1400;
    const tick = () => {
      const now = performance.now();
      const tFlash = Math.min(1, (now - t0) / FLASH_MS);
      const flashEase = 1 - Math.pow(1 - tFlash, 2);
      flashWhite.alpha = 1 * (1 - flashEase);
      flashCyan.alpha = 0.9 * (1 - flashEase);

      const tRing = Math.min(1, (now - t0) / RING_MS);
      const iso = TILE_H / TILE_W; // Ring flach stauchen, sonst wirkt er wie eine schwebende Kugel statt einer Bodenspur
      ring.clear();
      const rings = [
        { from: 0.15, to: 1.35, w0: 9, color: 0x9fe8ff, a0: 1.0 },
        { from: 0.12, to: 0.95, w0: 7, color: 0xff6fe0, a0: 0.9 },
        { from: 0.10, to: 1.75, w0: 5, color: 0xc9f2ff, a0: 0.7 },
      ];
      for (const rg of rings) {
        const r = TILE_W * rg.from + tRing * TILE_W * (rg.to - rg.from);
        ring.ellipse(baseX, baseY, r, r * iso).stroke({ width: rg.w0 * (1 - tRing) + 1, color: rg.color, alpha: (1 - tRing) * rg.a0 });
      }

      if (tFlash >= 1 && tRing >= 1) { app.ticker.remove(tick); flashWhite.destroy(); flashCyan.destroy(); ring.destroy(); }
    };
    app.ticker.add(tick);
  }

  function buildAt(r, c) {
    const k = key(r, c);
    if (built.has(k)) return;
    const idx = buildCount % ASSETS.buildings.length;
    buildCount += 1;
    built.set(k, idx);

    const old = plotSprites.get(k);
    if (old) { old.destroy(); plotSprites.delete(k); }

    const { x, y } = cellToScreen(r, c);
    const tex = textures[ASSETS.buildings[idx]];
    const s = new Sprite(tex);
    s.anchor.set(0.5, 1);
    const scale = (TILE_W * 1.3) / tex.width; // Gebäude bewusst größer als die Kachel — wie im Referenzbild
    s.scale.set(scale);
    s.position.set(x, y + TILE_H); // Frontpunkt der Kachel = Fußpunkt des Gebäudes
    s.zIndex = r + c + 0.5;
    world.addChild(s);
    animateBuildUp(s);

    recomputeRoads();
  }

  // ---- Straßen-Auto-Tiling: welche Straßenzellen sind aktiv (Flutfüllung ab
  //      gebauten Grundstücken durchs Straßen-Gitter), welche Kachel/Rotation je Zelle? -
  function isRoadCell(r, c) { return inBounds(r, c) && !isPlot(r, c); }
  function isBuiltPlot(r, c) { return inBounds(r, c) && isPlot(r, c) && built.has(key(r, c)); }

  function computeActiveRoads() {
    const active = new Set();
    const queue = [];
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (!isRoadCell(r, c)) continue;
      const touchesBuilt = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].some(([nr, nc]) => isBuiltPlot(nr, nc));
      if (touchesBuilt) { active.add(key(r, c)); queue.push([r, c]); }
    }
    while (queue.length) {
      const [r, c] = queue.pop();
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        if (isRoadCell(nr, nc) && !active.has(key(nr, nc))) { active.add(key(nr, nc)); queue.push([nr, nc]); }
      }
    }
    return active;
  }

  function connectionsFor(r, c, active) {
    const N = isBuiltPlot(r - 1, c) || active.has(key(r - 1, c));
    const E = isBuiltPlot(r, c + 1) || active.has(key(r, c + 1));
    const S = isBuiltPlot(r + 1, c) || active.has(key(r + 1, c));
    const W = isBuiltPlot(r, c - 1) || active.has(key(r, c - 1));
    return { N, E, S, W };
  }

  // Kachel + Rotation aus dem Verbindungsmuster ableiten (generisches Bitmask-Autotiling).
  // Echte 90°/270°-Drehung ist jetzt sicher (siehe applyRoadTransform): keine Rückfall-Klammerung
  // mehr nötig wie bei den ersten, unregelmäßig zugeschnittenen Kacheln.
  function tileFor(conn) {
    const dirs = ["N", "E", "S", "W"];
    const on = dirs.filter((d) => conn[d]);
    if (on.length <= 1) {
      const d = on[0] || "E";
      return { tex: ASSETS.roadStraight, rotation: d === "N" || d === "S" ? Math.PI / 2 : 0 };
    }
    if (on.length === 2) {
      if ((conn.N && conn.S) || (conn.E && conn.W)) {
        return { tex: ASSETS.roadStraight, rotation: conn.N && conn.S ? Math.PI / 2 : 0 };
      }
      const pairs = { NE: 0, ES: 1, SW: 2, WN: 3 };
      const pairKey = dirs.filter((d) => conn[d]).sort((a, b) => dirs.indexOf(a) - dirs.indexOf(b)).join("");
      const rotIdx = pairKey in pairs ? pairs[pairKey] : (conn.W && conn.N ? 3 : 0);
      return { tex: ASSETS.roadCorner, rotation: (rotIdx * Math.PI) / 2 };
    }
    if (on.length === 3) {
      const missing = dirs.find((d) => !conn[d]);
      return { tex: ASSETS.roadT, rotation: (dirs.indexOf(missing) * Math.PI) / 2 };
    }
    return { tex: ASSETS.roadCross, rotation: 0 };
  }

  // 90°/270° tauschen bei einem 2:1-Diamanten Breite/Höhe — eine gleichmäßige Skalierung würde die
  // Kachel-Fläche sprengen (siehe Vorversion mit den ersten Straßen-Assets). Fix: bei getauschter
  // Drehlage die Skalierungsachsen VERTAUSCHT anwenden, damit die gedrehte Bounding-Box wieder exakt
  // TILE_W×TILE_H trifft. Das zerrt die Kachel-Grafik leicht (Kauf des Nutzers, bewusst in Kauf
  // genommen) statt sie schief/zu groß aussehen zu lassen — echte 4-Wege-Rotation ohne neue Artwork.
  function applyRoadTransform(sprite, tex, rotation, x, y) {
    const rotSteps = Math.round(rotation / (Math.PI / 2)) % 4;
    const swapped = rotSteps % 2 !== 0;
    const scaleX = ((swapped ? TILE_H : TILE_W) * TILE_BLEED) / tex.width;
    const scaleY = ((swapped ? TILE_W : TILE_H) * TILE_BLEED) / tex.height;
    sprite.scale.set(scaleX, scaleY);
    sprite.rotation = rotation;
    sprite.position.set(x, y + (TILE_H * TILE_BLEED) / 2); // On-Screen-Höhe ist dank des Tauschs IMMER TILE_H, unabhängig von der Drehung
  }

  function recomputeRoads() {
    const active = computeActiveRoads();
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (!isRoadCell(r, c)) continue;
      const k = key(r, c);
      if (!active.has(k)) {
        const existing = roadSprites.get(k);
        if (existing) { existing.destroy(); roadSprites.delete(k); }
        continue;
      }
      const conn = connectionsFor(r, c, active);
      const { tex: texKey, rotation } = tileFor(conn);
      const tex = textures[texKey];
      const { x, y } = cellToScreen(r, c);

      let s = roadSprites.get(k);
      if (!s) {
        s = new Sprite(tex);
        s.anchor.set(0.5, 0.5); // rotation must pivot around the diamond's true center, not its top edge
        s.zIndex = r + c;
        world.addChild(s);
        roadSprites.set(k, s);
      }
      s.texture = tex;
      applyRoadTransform(s, tex, rotation, x, y);
    }
  }
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
