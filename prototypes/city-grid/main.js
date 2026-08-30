// City-Grid Asset-Technik-Prototyp — Pixi v8, isometrisches Grid, Kauf-Bauanimation (unten→oben),
// Straßen-Auto-Tiling. Bewusst AUSSERHALB von src/: kein App-Screen, keine Produktions-Bundle-Wirkung,
// nur ein technischer Test der gelieferten Assets (Straßen-Set + zwei Gebäude-Renders).

import { Application, Assets, Sprite, Graphics, Container } from "./vendor/pixi.min.mjs";

const GRID = 5;                 // 5x5 Zellen: Grundstücke auf geraden (r,c), Straßen dazwischen
// Alle Kachel-PNGs sind jetzt auf EXAKT dieselbe Leinwand (242×150, aus dem Sheet vermessen und
// zentriert zugeschnitten) gebracht — nur so landen Kanten benachbarter Kacheln auf derselben
// Linie. Vorher hatte jede Kachel eine eigene, leicht andere Größe (Tight-Bbox je Motiv), wodurch
// „TILE_W / tex.width“ pro Kachel eine ANDERE Bildhöhe ergab → sichtbare Versätze/Lücken.
const TILE_W = 242, TILE_H = 150;
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
  buildings: ["assets/building_pagoda.png", "assets/building_tower.png"],
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
  const roadFillSprites = new Map(); // key -> Pflaster-Unterlage (füllt die Kreuz-/Ecken-Kerben)
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
      if (t >= 1) app.ticker.remove(tick);
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

  // Diese gerenderten Tiles sind 2:1-Iso-Diamanten (nicht quadratisch) — eine 90°/270°-Sprite-Rotation
  // dreht Breite und Höhe gegeneinander und sprengt so die Kachel-Fläche (im Test sichtbar: schiefe,
  // spitze Kacheln). 0°/180° behalten das Seitenverhältnis und bleiben sicher; 90°/270° fallen auf 0°
  // zurück (falsch orientiert, aber sauber) statt zu reißen. Echte 90°/270°-Varianten bräuchten eigene
  // Artwork pro Drehlage, keinen Code-seitigen Dreh — siehe Zusammenfassung an den Nutzer.
  function safeRotation(idx) { return idx % 2 === 0 ? (idx * Math.PI) / 2 : 0; }

  // Kachel + Rotation aus dem Verbindungsmuster ableiten (generisches Bitmask-Autotiling).
  function tileFor(conn) {
    const dirs = ["N", "E", "S", "W"];
    const on = dirs.filter((d) => conn[d]);
    // NOTE: the straight tile is a 2:1 iso diamond (not square), so a naive 90° sprite rotation
    // does not fit the same footprint — it comes out as a tilted sliver (confirmed against the
    // actual asset in this prototype). A real vertical-straight asset would need dedicated art,
    // not a rotated horizontal one. Rotation is therefore skipped here for the straight tile —
    // a known, deliberate approximation for this technical test, not a bug in the auto-tile logic.
    if (on.length <= 1) {
      return { tex: ASSETS.roadStraight, rotation: 0 };
    }
    if (on.length === 2) {
      if ((conn.N && conn.S) || (conn.E && conn.W)) {
        return { tex: ASSETS.roadStraight, rotation: 0 };
      }
      const pairs = { NE: 0, ES: 1, SW: 2, WN: 3 };
      const pairKey = dirs.filter((d) => conn[d]).sort((a, b) => dirs.indexOf(a) - dirs.indexOf(b)).join("");
      const rotIdx = pairKey in pairs ? pairs[pairKey] : (conn.W && conn.N ? 3 : 0);
      return { tex: ASSETS.roadCorner, rotation: safeRotation(rotIdx) };
    }
    if (on.length === 3) {
      const missing = dirs.find((d) => !conn[d]);
      return { tex: ASSETS.roadT, rotation: safeRotation(dirs.indexOf(missing)) };
    }
    return { tex: ASSETS.roadCross, rotation: 0 };
  }

  function recomputeRoads() {
    const active = computeActiveRoads();
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (!isRoadCell(r, c)) continue;
      const k = key(r, c);
      if (!active.has(k)) {
        const existing = roadSprites.get(k);
        if (existing) { existing.destroy(); roadSprites.delete(k); }
        const fill = roadFillSprites.get(k);
        if (fill) { fill.destroy(); roadFillSprites.delete(k); }
        continue;
      }
      const conn = connectionsFor(r, c, active);
      const { tex: texKey, rotation } = tileFor(conn);
      const tex = textures[texKey];
      const { x, y } = cellToScreen(r, c);

      // Pflaster-Unterlage: road_cross/road_corner lassen an ihren Diamant-Ecken transparente Kerben
      // frei (eigene Bildkomposition, kein Zuschnittfehler — siehe Konversation). Eine schlichte
      // volle Kachel dahinter verhindert, dass dort der schwarze Canvas-Hintergrund durchscheint.
      let fill = roadFillSprites.get(k);
      if (!fill) {
        fill = new Sprite(textures[ASSETS.roadStraight]);
        fill.anchor.set(0.5, 0.5);
        fill.zIndex = r + c - 0.1;
        world.addChild(fill);
        roadFillSprites.set(k, fill);
      }
      const fillScale = (TILE_W * TILE_BLEED) / textures[ASSETS.roadStraight].width;
      fill.scale.set(fillScale);
      fill.position.set(x, y + (textures[ASSETS.roadStraight].height * fillScale) / 2);

      let s = roadSprites.get(k);
      if (!s) {
        s = new Sprite(tex);
        s.anchor.set(0.5, 0.5); // rotation must pivot around the diamond's true center, not its top edge
        s.zIndex = r + c;
        world.addChild(s);
        roadSprites.set(k, s);
      }
      s.texture = tex;
      const scale = (TILE_W * TILE_BLEED) / tex.width;
      s.scale.set(scale);
      s.rotation = rotation;
      s.position.set(x, y + (tex.height * scale) / 2); // anchor moved to center → recenter on the tile's midpoint
    }
  }
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
