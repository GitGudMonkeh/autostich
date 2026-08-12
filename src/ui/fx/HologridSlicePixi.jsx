import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Sprite, Texture, Rectangle } from "pixi.js";

/* #321 Sieg-Finisher „Hologrid-Slice" — PIXI. Beim Sieg fährt eine schlichte Laserlinie achsen-parallel über die
   geschlagene (Gegner-)Karte und deckt dabei im überfahrenen Bereich ein Nahtraster (COLS×ROWS) auf (Reveal). Danach
   zerfällt die Karte in ein Kachelgitter, dessen Stücke gestaffelt in Sweep-Reihenfolge mit Rotation/Taumeln wegfliegen;
   die Kachel-Füllung (Kartenbild) verblasst früh, sodass man rasch nur noch den leuchtenden Hologrid-Rahmen sieht.
   Fragmente UND abplatzende Mini-Pixel prallen an einer Bodenebene ab (bouncy, mit Reibung → realistisches Ausklingen).
   Farbe = Deckfarbe (Verlauf A→B), analog „Überladung". Werte 1:1 aus Issue #321.

   Technik: Pixi (Sprites aus einer gebackenen Karten-Textur, per-Kachel-Physik, Rahmen als Graphics je Kachel). Läuft —
   wie die Gottgleich-Prunk-Effekte — auch in Produktion (lazy gemountet, sobald der Finisher spielt). */

// ── TUNE (Finale Werte aus Issue #321) ─────────────────────────────────────────
const TUNE = {
  // Laser
  CHARGE: 0.05, CUT: 0.20, BEAM_W: 6.0, BEAM_GLOW: 3.00, CUT_GLOW: 3.50, SPARKS: 0,
  // Raster
  COLS: 12, ROWS: 16, SEAM_W: 1.0, STAGGER: 1.20,
  // Flug — #hologrid: die Wucht war viel zu stark (Teile flogen weit weg; vertikaler Slice schoss sie ganz raus, weil
  //   sweepy·PUSH + LIFT sich nach oben addierten). Deutlich gedrosselt → die Stücke zerbröseln und FALLEN eher runter:
  //   LIFT (universeller Auftrieb) und PUSH (Schub entlang der Sweep-Achse) stark reduziert, FLY_SPEED/SPREAD runter,
  //   GRAVITY bleibt kräftig. Horizontal = sanftes Auseinanderfallen, vertikal nur noch ein kleiner Stups statt Abschuss.
  FLY_SPEED: 115, SPREAD: 0.50, PUSH: 55, LIFT: 45, GRAVITY: 850, DRAG: 0.55,
  SPIN: 2.6, TUMBLE: 10.0, FRAG_LIFE: 2.00, BOUNCE: 0.45, FLOOR: 0.94,
  // Pixel — #hologrid: die abplatzenden Mini-Pixel sind AUS (PIX_SPARK 0). Sonst flogen je Kachel bis zu 5 zusätzliche
  //   2..9px-Stücke weg (≈COLS×ROWS×5 extra) → deutlich MEHR Teile als das Gitter, in das die Karte geschnitten wird.
  //   Jetzt fliegen exakt die COLS×ROWS Kachel-Stücke — genau so viele, wie die Karte zerteilt wird, nicht mehr.
  PIXELATE_AT: 0.15, PIXEL_MIN: 2.0, PIXEL_MAX: 9.0, SHRINK: 0.50,
  FILL_GONE: 0.30, FRAME_FADE: 0.82, PIX_SPARK: 0, PIX_DRIFT: 60,
  // Look
  WIRE: 0.85, HOLO_TINT: 0.28, BRIGHT: 1.00, SCAN: 0.40,
  // Karte (Referenz — die echte Kartengröße kommt aus cardRef)
  CARD_W: 210, CARD_H: 300,
  // #perf Medium-Stufe (lite): gröberes Raster (Faktor auf COLS/ROWS) → ~3× weniger Kacheln/Display-Objekte; zusätzlich
  // Mini-Pixel aus + DPR-Deckel 1.25 + 45 fps. Kern (Reveal/Zerfall/Fly/Bounce/Fill-Fade→Rahmen) bleibt identisch.
  LITE_GRID: 0.58,
};
const STD_A = "#2ff0ff", STD_B = "#ff2d9b"; // COLORS.deck / deck2 (Fallback ohne Deckfarbe)

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const intOf = (c) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);

function roundRect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* Karten-Textur (frontImage-Skin + große Wert-Zahl) in ein Off-Canvas backen — Grundlage für die Kachel-Füllung.
   (Angelehnt an ScorchFx.buildCardCanvas: Deck-Skin füllt die Karte, die Zahl macht sie erkennbar.) */
function buildCardCanvas(w, h, opts) {
  const cv = document.createElement("canvas"); cv.width = Math.max(2, w | 0); cv.height = Math.max(2, h | 0);
  const cc = cv.getContext("2d"); const W = cv.width, H = cv.height, rad = W * 0.11;
  cc.clearRect(0, 0, W, H);
  cc.save(); roundRect(cc, 0, 0, W, H, rad); cc.clip();
  if (opts.img && opts.img.complete && opts.img.naturalWidth) {
    cc.drawImage(opts.img, 0, 0, W, H);
  } else {
    const g = cc.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#20202b"); g.addColorStop(1, "#131318"); cc.fillStyle = g; cc.fillRect(0, 0, W, H);
    cc.strokeStyle = opts.suit + "66"; cc.lineWidth = Math.max(2, W * 0.03); roundRect(cc, cc.lineWidth, cc.lineWidth, W - cc.lineWidth * 2, H - cc.lineWidth * 2, rad * 0.8); cc.stroke();
  }
  if (opts.value != null) {
    cc.font = `900 ${Math.round(H * 0.34)}px "Helvetica Neue",Arial,sans-serif`; cc.textAlign = "center"; cc.textBaseline = "middle";
    cc.lineWidth = Math.max(2, W * 0.028); cc.strokeStyle = opts.suit; cc.fillStyle = "#0d0d12";
    cc.fillText(String(opts.value), W / 2, H * 0.46); cc.strokeText(String(opts.value), W / 2, H * 0.46);
  }
  cc.restore();
  return cv;
}

export default function HologridSlicePixi({ panelRef, cardRef, trigger = 0, frontImage = null, value = null, suit = "#e0605a",
  deckColor = STD_A, deckColor2 = null, deckTint = false, reduced = false, lite = false, loop = false, speed = 1, onDone = null }) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const startRef = useRef(null);
  const firstRef = useRef(true);
  const imgRef = useRef(null);
  const p = useRef({ frontImage, value, suit, deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone });
  p.current = { frontImage, value, suit, deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone };

  // Deck-Skin vorladen (im Spiel meist schon im Cache, da die Karte im DOM liegt).
  useEffect(() => { if (!frontImage) { imgRef.current = null; return; } const img = new Image(); img.src = frontImage; imgRef.current = img; }, [frontImage]);

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    let disposed = false;
    const canvas = document.createElement("canvas");
    const app = new Application();

    const play = { on: false, t: 0 };
    let tiles = [], pix = [], root = null, beamG = null, pixG = null;
    let cardTex = null, tileTexes = [];
    let geo = null;           // { cardX, cardY, cardW, cardH, W, H, floorY, sweepx, sweepy, entry }
    let DUR = 0;

    function clearScene() {
      if (root) { root.destroy({ children: true }); root = null; }
      for (const tx of tileTexes) { try { tx.destroy(false); } catch { /* ignore */ } }
      tileTexes = [];
      if (cardTex) { try { cardTex.destroy(true); } catch { /* ignore */ } cardTex = null; }
      tiles = []; pix = []; beamG = pixG = null;
    }

    function build() {
      const pr = panelRef?.current?.getBoundingClientRect(); if (!pr || pr.width < 2) return false;
      const cr = cardRef?.current?.getBoundingClientRect(); if (!cr || cr.width < 8) return false;
      const s = p.current;
      const cardX = cr.left - pr.left, cardY = cr.top - pr.top, cardW = cr.width, cardH = cr.height;
      const W = pr.width, H = pr.height;
      // Sweep-Richtung: eine der 4 Kardinalrichtungen; die Laserlinie steht senkrecht dazu.
      const dirIdx = Math.floor(rndSeed() * 4);
      const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][dirIdx];   // →/←/↓/↑
      const [sweepx, sweepy] = dir;
      // #perf Medium-Stufe (lite): gröberes Raster → deutlich weniger Kacheln (dominanter Kostenposten).
      const cols = s.lite ? Math.max(4, Math.round(TUNE.COLS * TUNE.LITE_GRID)) : TUNE.COLS;
      const rows = s.lite ? Math.max(5, Math.round(TUNE.ROWS * TUNE.LITE_GRID)) : TUNE.ROWS;

      // Karten-Textur backen (2× für Schärfe, lite 1,25×), in cols×rows Kacheln zerlegen.
      const RES = s.lite ? 1.25 : 2;
      const cardCv = buildCardCanvas(cardW * RES, cardH * RES, { img: imgRef.current, value: s.value, suit: s.suit });
      cardTex = Texture.from(cardCv);
      const src = cardTex.source; src.scaleMode = "linear";
      const twT = cardCv.width / cols, thT = cardCv.height / rows;   // Kachel in Textur-px
      const tw = cardW / cols, th = cardH / rows;                    // Kachel on-screen

      root = new Container(); app.stage.addChild(root);
      beamG = new Graphics(); beamG.blendMode = "add"; pixG = new Graphics(); pixG.blendMode = "add";

      const ca = rgb(s.deckColor || STD_A), cb = rgb(s.deckColor2 || s.deckColor || STD_B);
      const holoAt = (u) => intOf(mix(ca, cb, clamp01(u)));   // Deck-Verlauf entlang der Karte (u = 0..1 quer)

      tiles = [];
      const cx = cardX + cardW / 2, cy = cardY + cardH / 2;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const tex = new Texture({ source: src, frame: new Rectangle(c * twT, r * thT, twT, thT) }); tileTexes.push(tex);
        const cont = new Container();
        const homeX = cardX + (c + 0.5) * tw, homeY = cardY + (r + 0.5) * th;
        cont.position.set(homeX, homeY);
        const fill = new Sprite(tex); fill.anchor.set(0.5); fill.width = tw + 0.6; fill.height = th + 0.6;   // 0.6px Overlap → keine Naht-Ritzen vor Reveal
        // Rahmen (Hologrid): Rechteck-Kontur in Deckfarbe, lokal um die Kachelmitte. Alpha animiert (Reveal → Wire → Fade).
        const holo = holoAt((c + 0.5) / cols);
        const frame = new Graphics(); frame.rect(-tw / 2, -th / 2, tw, th).stroke({ width: TUNE.SEAM_W, color: holo, alpha: 1 });
        frame.blendMode = "add"; frame.alpha = 0;
        cont.addChild(fill, frame); root.addChild(cont);
        // Sweep-Koordinate u ∈ [0,1] (0 = Eintrittskante des Lasers): Projektion der Kachelmitte auf die Sweep-Achse.
        const u = sweepx !== 0 ? (sweepx > 0 ? (homeX - cardX) / cardW : 1 - (homeX - cardX) / cardW)
                               : (sweepy > 0 ? (homeY - cardY) / cardH : 1 - (homeY - cardY) / cardH);
        // Ausricht-Richtung (vom Kartenzentrum nach außen) für den Wegflug.
        const ox = homeX - cx, oy = homeY - cy, ol = Math.hypot(ox, oy) || 1;
        tiles.push({ cont, fill, frame, homeX, homeY, u, holo,
          outx: ox / ol, outy: oy / ol, released: false, dead: false,
          x: homeX, y: homeY, vx: 0, vy: 0, ang: 0, spin: 0, tphase: rndSeed() * TAU, life: 0,
          jx: (rndSeed() - 0.5), jy: (rndSeed() - 0.5) });
      }
      root.addChild(beamG, pixG);   // Beam + Mini-Pixel liegen über den Kacheln (Rahmen sitzt je Kachel als Kind-Graphics)
      pix = [];
      geo = { cardX, cardY, cardW, cardH, W, H, floorY: H * TUNE.FLOOR, sweepx, sweepy, cx, cy, tw, th };
      // Gesamtdauer: Ladung + Sweep-Release (letzte Kachel bei u=1) + Fragment-Leben.
      DUR = TUNE.CHARGE + (TUNE.CUT + TUNE.STAGGER) + TUNE.FRAG_LIFE;
      return true;
    }

    // deterministischer-genug Zufall ohne Math.random-Verbot-Bruch: einfacher LCG, je build neu geseedet über performance.now
    let _seed = (typeof performance !== "undefined" ? (performance.now() * 1000) | 0 : 1) >>> 0;
    function rndSeed() { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; }

    function spawnPix(tx, ty, holo, n) {
      const s = p.current; const cap = s.lite ? 2 : n;
      for (let i = 0; i < cap; i++) {
        const a = rndSeed() * TAU, sp = TUNE.PIX_DRIFT * (0.5 + rndSeed());
        pix.push({ x: tx, y: ty, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - TUNE.LIFT * 0.3, holo, life: 0, ttl: TUNE.FRAG_LIFE * (0.4 + 0.5 * rndSeed()), sz: TUNE.PIXEL_MIN + rndSeed() * (TUNE.PIXEL_MAX - TUNE.PIXEL_MIN) });
      }
    }

    function frame(ticker) {
      if (!play.on || !geo) return;
      const s = p.current;
      // #speed: erst den ROH-dt gegen Stall-Sprünge deckeln (50 ms), DANN mit speed multiplizieren — sonst kappt der
      // Deckel die effektive Geschwindigkeit bei ~3× (0,05 s/Frame) und der Effekt läuft auf MAX-Turbo zu langsam →
      // wird vom nächsten Stich abgeschnitten. So skaliert er voll mit scorchSpeed (bis 8×), analog ScorchFx.
      const dt = Math.min(0.05, ticker.deltaMS / 1000) * s.speed;
      play.t += dt;
      const t = play.t;
      const sweepP = clamp01((t - TUNE.CHARGE) / TUNE.CUT);       // 0..1 Laser-Fortschritt
      const { cardX, cardY, cardW, cardH, floorY, sweepx, sweepy } = geo;
      const bright = TUNE.BRIGHT;

      // ── Laser-Beam (Charge glüht Rand, Cut fährt die Linie) ──
      beamG.clear();
      if (t < TUNE.CHARGE + TUNE.CUT) {
        const holo = intOf(mix(rgb(s.deckColor || STD_A), rgb(s.deckColor2 || s.deckColor || STD_B), 0.5));
        if (t < TUNE.CHARGE) {
          const gp = clamp01(t / TUNE.CHARGE);
          beamG.rect(cardX, cardY, cardW, cardH).stroke({ width: 2 + 3 * gp, color: holo, alpha: 0.5 * gp * bright });
        } else {
          // Kontaktlinie senkrecht zur Sweep-Achse, auf die Karte begrenzt.
          let x0, y0, x1, y1;
          if (sweepx !== 0) { const cxp = sweepx > 0 ? cardX + cardW * sweepP : cardX + cardW * (1 - sweepP); x0 = x1 = cxp; y0 = cardY; y1 = cardY + cardH; }
          else { const cyp = sweepy > 0 ? cardY + cardH * sweepP : cardY + cardH * (1 - sweepP); y0 = y1 = cyp; x0 = cardX; x1 = cardX + cardW; }
          const glow = TUNE.BEAM_GLOW;
          beamG.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: TUNE.BEAM_W * 2.2, color: holo, alpha: 0.18 * glow * bright });
          beamG.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: TUNE.BEAM_W, color: holo, alpha: 0.5 * glow * bright });
          beamG.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: Math.max(1, TUNE.BEAM_W * 0.35), color: 0xffffff, alpha: 0.9 * bright });
        }
      }

      // ── Kacheln ──
      let alive = 0;
      for (const tl of tiles) {
        if (tl.dead) continue;
        // Reveal: sobald der Laser die Kachel passiert hat (u <= sweepP) erscheint der Rahmen (Naht).
        const revealed = sweepP >= tl.u || t >= TUNE.CHARGE + TUNE.CUT;
        // Release gestaffelt in Sweep-Reihenfolge: über CUT+STAGGER verteilt.
        const releaseT = TUNE.CHARGE + (TUNE.CUT + TUNE.STAGGER) * tl.u;
        if (!tl.released && t >= releaseT) {
          tl.released = true;
          // Wegflug-Geschwindigkeit: nach außen + Schub entlang Sweep + Auftrieb + Streuung.
          const spr = TUNE.SPREAD * TUNE.FLY_SPEED;
          tl.vx = tl.outx * TUNE.FLY_SPEED * 0.45 + sweepx * TUNE.PUSH + tl.jx * spr;
          tl.vy = tl.outy * TUNE.FLY_SPEED * 0.45 + sweepy * TUNE.PUSH - TUNE.LIFT + tl.jy * spr;
          tl.spin = (rndSeed() - 0.5) * 2 * TUNE.SPIN;
        }

        if (!tl.released) {
          // Ruhephase: Kachel bildet die Karte; Rahmen blendet beim Reveal ein.
          tl.frame.alpha = revealed ? Math.min(TUNE.WIRE, tl.frame.alpha + dt * 6) : 0;
          tl.fill.alpha = 1;
          alive++;
          continue;
        }

        // Physik
        tl.life += dt;
        tl.vy += TUNE.GRAVITY * dt;
        const drag = Math.exp(-TUNE.DRAG * dt); tl.vx *= drag; tl.vy *= drag;
        tl.x += tl.vx * dt; tl.y += tl.vy * dt;
        if (tl.y > floorY && tl.vy > 0) { tl.y = floorY; tl.vy = -tl.vy * TUNE.BOUNCE; tl.vx *= 0.72; tl.spin *= 0.6; }
        tl.ang += tl.spin * dt; tl.tphase += TUNE.TUMBLE * dt * 0.15;
        const lf = tl.life / TUNE.FRAG_LIFE;   // Lebensfraktion 0..1

        // Füllung verblasst früh (ganz weg bei FILL_GONE); Kachel schrumpelt (SHRINK).
        const fillA = 1 - smooth(0, TUNE.FILL_GONE, lf);
        const shrink = 1 - TUNE.SHRINK * smooth(TUNE.PIXELATE_AT, 1, lf);
        // Rahmen bleibt (WIRE), blendet erst ab FRAME_FADE aus.
        const frameA = TUNE.WIRE * (1 - smooth(TUNE.FRAME_FADE, 1, lf)) * bright;

        // Mini-Pixel beim Ablösen (einmalig kurz nach Release). #perf: unter lite (Medium) komplett aus → der pixG-
        // Per-Frame-Zeichenpfad entfällt; der Kern-Zerfall (Kacheln + Rahmen + Bounce) bleibt.
        if (!s.lite && TUNE.PIX_SPARK > 0 && !tl._sparked && lf > 0.02) { tl._sparked = true; spawnPix(tl.x, tl.y, tl.holo, TUNE.PIX_SPARK); }

        tl.cont.position.set(tl.x, tl.y);
        tl.cont.rotation = tl.ang;
        tl.cont.scale.set(shrink, shrink * Math.cos(tl.tphase));   // Taumeln = y-Stauchung (Fake-3D-Flip)
        tl.fill.alpha = fillA;
        tl.frame.alpha = frameA;

        if (lf >= 1) { tl.dead = true; tl.cont.visible = false; } else alive++;
      }

      // ── Mini-Pixel (fliegen + bouncen) ──
      pixG.clear();
      for (const q of pix) {
        if (q.life >= q.ttl) continue;
        q.life += dt; q.vy += TUNE.GRAVITY * dt;
        const drag = Math.exp(-TUNE.DRAG * dt); q.vx *= drag; q.vy *= drag;
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.y > floorY && q.vy > 0) { q.y = floorY; q.vy = -q.vy * TUNE.BOUNCE; q.vx *= 0.72; }
        const a = (1 - q.life / q.ttl) * bright;
        pixG.rect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz).fill({ color: q.holo, alpha: clamp01(a) });
      }
      pix = pix.filter((q) => q.life < q.ttl);

      // Ende
      if (t > DUR + 0.2 || (t > TUNE.CHARGE + TUNE.CUT && alive === 0 && pix.length === 0)) {
        if (s.loop) { restart(); }
        else { play.on = false; try { app.ticker.stop(); } catch { /* ignore */ } s.onDone && s.onDone(); }
      }
    }

    function restart() {
      play.t = 0; play.on = true;
      for (const tl of tiles) { tl.released = false; tl.dead = false; tl._sparked = false; tl.life = 0; tl.x = tl.homeX; tl.y = tl.homeY; tl.vx = tl.vy = tl.ang = tl.spin = 0; tl.cont.visible = true; tl.cont.position.set(tl.homeX, tl.homeY); tl.cont.rotation = 0; tl.cont.scale.set(1, 1); tl.fill.alpha = 1; tl.frame.alpha = 0; }
      pix = [];
    }

    function startPlay() {
      if (disposed || !appRef.current) return;
      clearScene();
      if (!build()) return;
      play.on = true; play.t = 0;
      if (document.visibilityState !== "hidden") app.ticker.start();
    }
    startRef.current = startPlay;

    app.init({ canvas, preference: "webgl", backgroundAlpha: 0, antialias: true, autoDensity: true,
      resolution: Math.min(p.current.lite ? 1.25 : 2, window.devicePixelRatio || 1), resizeTo: host, powerPreference: "high-performance" })
      .then(() => {
        if (disposed) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } return; }
        appRef.current = app;
        canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block"; host.appendChild(canvas);
        app.ticker.maxFPS = p.current.lite ? 45 : 0;
        app.ticker.add(frame);
        startPlay();
      }).catch(() => { /* WebGL fehlt → leer */ });

    const onVis = () => { const a = appRef.current; if (a && play.on && document.visibilityState !== "hidden") a.ticker.start(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true; document.removeEventListener("visibilitychange", onVis);
      const a = appRef.current; appRef.current = null;
      clearScene();
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
  }, [panelRef, cardRef]);

  // Neuer Sieg (trigger wechselt je Stich) → neu abspielen (Karte neu backen + Kacheln neu).
  useEffect(() => { if (firstRef.current) { firstRef.current = false; return; } startRef.current?.(); }, [trigger]);

  // z-11: Finisher liegt über der (in-place unsichtbar gerenderten) Gegnerkarte.
  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11 }} />;
}
