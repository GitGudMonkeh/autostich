// City-Grid Asset-Technik-Prototyp — Pixi v8, Kauf-Bauanimation (unten→oben), Neon-Blitz,
// Straßenraster. Bewusst AUSSERHALB von src/: kein App-Screen, keine Produktions-Bundle-Wirkung.
//
// WICHTIG — Anschlussmodell (per Composite-Test gegen die echten Kacheln verifiziert, s. README):
// Diese Straßen-Plates verbinden sich über die Diamant-ECKEN (bildschirm-horizontal/-vertikal),
// NICHT über die Kantenmitten. Straßen laufen also als Reihen/Spalten Ecke-an-Ecke; die Lücken
// dazwischen füllt die Plaza-Bodenkachel (versetzte Zwischenreihen, Kante-an-Kante).
// Die "Kurven"-Kachel des Sheets ist real eine GEBOGENE GERADE (unten Pflasterblock, oben
// Pflaster — keine 90°-Abzweigung) und wird deshalb nicht verwendet; das T bleibt ungenutzt,
// weil der Raster-Stadtplan nur Geraden und Kreuzungen braucht.

import { Application, Assets, Sprite, Graphics, Container, Polygon } from "./vendor/pixi.min.mjs";

// Kachelgröße auf dem Schirm. Ratio 371/544 ≈ 0,682 aus dem tight zugeschnittenen Sheet-Artwork —
// alle Bodenkacheln werden per Nicht-uniform-Scale exakt auf W×H gebracht, damit das Raster stimmt.
const TILE_W = 250;
const TILE_H = Math.round(TILE_W * 371 / 544); // 170
const BUILD_MS = 750;

// Stadtplan auf einem 5×5-Funktionsraster (i = Spalte 0..4, k = Reihe 0..4):
// Straßenreihen k=1 und k=3 (horizontal), alles andere = kaufbare Grundstücke; versetzte
// Zwischenreihen sind reine Boden-Deko. BEWUSST NUR horizontale Straßen: die einzige
// Straßenkachel dieses Sheets, deren Anschluss im Composite-Test nachweislich sauber
// durchläuft, ist die horizontale Gerade. Vertikale (90°-gedrehte) Geraden scheitern an der
// eingebackenen Perspektive der KI-Kacheln (Fahrbahn läuft nicht exakt durch die Diamant-
// Ecken → gedreht wird sie zur anschlusslosen Diagonale), und Kreuzung/T/Kurve brauchen
// eine funktionierende Vertikale bzw. sind gar keine Abzweigung (Kurve = gebogene Gerade).
const COLS = 5, KROWS = 5;
const STREET_ROWS = new Set([1, 3]);
const isStreetCell = (i, k) => STREET_ROWS.has(k);
const isPlot = (i, k) => !isStreetCell(i, k);
const key = (i, k) => `${i},${k}`;

const ASSETS = {
  ground: "assets/ground.png",
  roadStraight: "assets/road_straight.png",
  buildings: [
    "assets/building_tower2.png", "assets/building_lowwide.png",
    "assets/building_pyramid.png", "assets/building_round.png",
  ],
};

async function main() {
  const host = document.getElementById("stage-host");
  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
  host.appendChild(app.canvas);

  const textures = await Assets.load([
    ASSETS.ground, ASSETS.roadStraight, ...ASSETS.buildings,
  ]);

  const world = new Container();
  world.sortableChildren = true;
  app.stage.addChild(world);
  const recenter = () => world.position.set(app.screen.width / 2, app.screen.height / 2 - 40);
  recenter();
  app.renderer.on("resize", recenter);

  // Funktionszellen liegen auf geraden Versatzreihen j=2k (Ecke-an-Ecke: Δx=W horizontal, Δy=H
  // vertikal). Ungerade j sind die um W/2 versetzten Füllreihen (Kante-an-Kante zu beiden Nachbarn).
  const cellX = (i, j) => (i - 2 + (j % 2) * 0.5) * TILE_W;
  const cellY = (j) => (j - 4) * (TILE_H / 2);
  const fnX = (i, k) => cellX(i, 2 * k);
  const fnY = (k) => cellY(2 * k);

  // Diamant-Trefferfläche — die rechteckige Standard-Hitbox überlappt bei Ecke-an-Ecke-Kacheln
  // massiv die Nachbarzellen. hitArea rechnet in LOKALEN Sprite-Koordinaten: mit anchor(0.5,0.5)
  // liegt der Ursprung in der Kachelmitte, das Polygon muss also um (0,0) zentriert sein.
  const diamondHit = (tex) => new Polygon([
    0, -tex.height / 2, tex.width / 2, 0, 0, tex.height / 2, -tex.width / 2, 0,
  ]);

  function groundSprite(tex, x, y, z) {
    const s = new Sprite(tex);
    s.anchor.set(0.5, 0.5);
    s.scale.set(TILE_W / tex.width, TILE_H / tex.height); // nicht-uniform → exakt W×H, Raster stimmt
    s.position.set(x, y);
    s.zIndex = z;
    world.addChild(s);
    return s;
  }

  // ---- Zustand ----
  const built = new Map();        // key(i,k) -> buildingIndex
  const plotSprites = new Map();  // key -> klickbare Grundstücks-Kachel
  const roadSprites = new Map();  // key -> Straßen-Sprite (ersetzt die Boden-Kachel der Zelle)
  let buildCount = 0;

  // ---- Statischer Boden ----
  // Füllreihen (ungerade j): gedimmte Plaza-Kacheln, schließen die Lücken zwischen den Ecke-an-
  // Ecke-Funktionszellen. Funktionszellen: Grundstücke hell + klickbar, Straßenzellen zunächst
  // ebenfalls gedimmter Boden (Straße erscheint erst, wenn ein angrenzendes Gebäude sie aktiviert).
  const gtex = textures[ASSETS.ground];
  for (let j = 1; j < 8; j += 2) {
    for (let i = 0; i < COLS - 1; i++) {
      const s = groundSprite(gtex, cellX(i, j), cellY(j), j);
      s.tint = 0x777788;
    }
  }
  const streetGround = new Map(); // key -> gedimmte Bodenkachel unter (noch) inaktiver Straßenzelle
  for (let k = 0; k < KROWS; k++) {
    for (let i = 0; i < COLS; i++) {
      const x = fnX(i, k), y = fnY(k), z = 2 * k;
      if (isPlot(i, k)) {
        const s = groundSprite(gtex, x, y, z);
        s.eventMode = "static";
        s.cursor = "pointer";
        s.hitArea = diamondHit(gtex);
        s.on("pointerdown", () => buildAt(i, k));
        plotSprites.set(key(i, k), s);
      } else {
        const s = groundSprite(gtex, x, y, z);
        s.tint = 0x777788;
        streetGround.set(key(i, k), s);
      }
    }
  }

  // ---- Bau-Animation: Sprite via Maske von unten nach oben aufdecken ----
  function animateBuildUp(sprite) {
    const dispW = sprite.width, dispH = sprite.height;
    const mask = new Graphics();
    world.addChild(mask);
    sprite.mask = mask;
    mask.zIndex = sprite.zIndex;

    const t0 = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / BUILD_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const h = dispH * eased;
      mask.clear();
      mask.rect(sprite.x - dispW / 2 - 4, sprite.y - h, dispW + 8, h).fill(0xffffff);
      if (t >= 1) { app.ticker.remove(tick); neonFlash(sprite); }
    };
    app.ticker.add(tick);
  }

  // Fertigstellungs-Blitz: zwei additive Kopien (Weiß + Cyan) + drei auslaufende Neon-Bodenringe.
  function neonFlash(sprite) {
    const baseX = sprite.x, baseY = sprite.y;

    const flashWhite = new Sprite(sprite.texture);
    flashWhite.anchor.copyFrom(sprite.anchor);
    flashWhite.scale.copyFrom(sprite.scale);
    flashWhite.position.copyFrom(sprite.position);
    flashWhite.mask = sprite.mask;
    flashWhite.blendMode = "add";
    flashWhite.zIndex = sprite.zIndex + 0.01;
    world.addChild(flashWhite);

    const flashCyan = new Sprite(sprite.texture);
    flashCyan.anchor.copyFrom(sprite.anchor);
    flashCyan.scale.set(sprite.scale.x * 1.015, sprite.scale.y * 1.015);
    flashCyan.position.copyFrom(sprite.position);
    flashCyan.mask = sprite.mask;
    flashCyan.tint = 0x9fe8ff;
    flashCyan.blendMode = "add";
    flashCyan.zIndex = sprite.zIndex + 0.02;
    world.addChild(flashCyan);

    const ring = new Graphics();
    ring.blendMode = "add";
    ring.zIndex = sprite.zIndex + 0.03;
    world.addChild(ring);

    const t0 = performance.now();
    const FLASH_MS = 1100, RING_MS = 1400;
    const tick = () => {
      const now = performance.now();
      const tFlash = Math.min(1, (now - t0) / FLASH_MS);
      const flashEase = 1 - Math.pow(1 - tFlash, 2);
      flashWhite.alpha = 1 - flashEase;
      flashCyan.alpha = 0.9 * (1 - flashEase);

      const tRing = Math.min(1, (now - t0) / RING_MS);
      const iso = TILE_H / TILE_W;
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

  function buildAt(i, k) {
    const kk = key(i, k);
    if (built.has(kk)) return;
    const idx = buildCount % ASSETS.buildings.length;
    buildCount += 1;
    built.set(kk, idx);

    const plot = plotSprites.get(kk);
    if (plot) { plot.cursor = "default"; plot.eventMode = "none"; } // Kachel bleibt als Sockel liegen

    const tex = textures[ASSETS.buildings[idx]];
    const s = new Sprite(tex);
    s.anchor.set(0.5, 1);
    // Basis knapp unter Kachelbreite → der Neon-Rand des Grundstücks bleibt rundum sichtbar.
    const scale = (TILE_W * 0.95) / tex.width;
    s.scale.set(scale);
    s.position.set(fnX(i, k), fnY(k) + TILE_H / 2); // Fußpunkt = untere Diamant-Ecke der Zelle
    s.zIndex = 2 * k + 0.5;
    world.addChild(s);
    animateBuildUp(s);

    recomputeRoads();
  }

  // ---- Straßen-Aktivierung ----
  // Eine Straßenzelle wird aktiv, wenn das Grundstück direkt darüber oder darunter (vertikale
  // Ecke-an-Ecke-Nachbarn) bebaut ist — die Straße "erscheint" vor dem gekauften Gebäude.
  const neighbors = (i, k) => [[i, k - 1], [i, k + 1]]
    .filter(([a, b]) => a >= 0 && a < COLS && b >= 0 && b < KROWS);

  function computeActiveStreets() {
    const active = new Set();
    for (let k = 0; k < KROWS; k++) for (let i = 0; i < COLS; i++) {
      if (!isStreetCell(i, k)) continue;
      if (neighbors(i, k).some(([a, b]) => built.has(key(a, b)))) active.add(key(i, k));
    }
    return active;
  }

  function recomputeRoads() {
    const active = computeActiveStreets();
    for (let k = 0; k < KROWS; k++) for (let i = 0; i < COLS; i++) {
      if (!isStreetCell(i, k)) continue;
      const kk = key(i, k);
      if (!active.has(kk) || roadSprites.has(kk)) continue;

      const under = streetGround.get(kk);
      if (under) { under.destroy(); streetGround.delete(kk); }

      const tex = textures[ASSETS.roadStraight];
      const s = new Sprite(tex);
      s.anchor.set(0.5, 0.5);
      s.scale.set(TILE_W / tex.width, TILE_H / tex.height);
      s.position.set(fnX(i, k), fnY(k));
      s.zIndex = 2 * k;
      world.addChild(s);
      roadSprites.set(kk, s);
    }
  }
}

main().catch((err) => {
  document.body.innerHTML += `<pre style="color:#f88;padding:16px">${err.stack || err}</pre>`;
  console.error(err);
});
