import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Sprite, Texture, Rectangle } from "pixi.js";
import { DRAW_HZ_COARSE } from "./mobileTier.js"; // #perf-mobile: EINE Wahrheit für die Zeichenrate
import { mix, clamp01 } from "./fxMath.js"; // #fx-helfer: geteilte Mathe-/Canvas-Helfer

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
  // #perf-mobile: lite-Raster 0.58→0.45→0.28. Jede Kachel ist ein eigener Container samt gebackener Textur, der nach
  // dem Schnitt einzeln fliegt/rotiert/abprallt — die Kachelzahl ist damit der dominante Kostenposten des Effekts.
  // 5×7 = 35 → 4×4 = 16 fallende Teile (gut halbiert). Der Zeilen-Boden ist dafür von 5 auf 4 herunter (s. u.);
  // der Schnitt bleibt lesbar, weil die Karte hochkant ist und 4 Reihen die Bruchkante noch klar zeigen.
  LITE_GRID: 0.28,
};
const STD_A = "#2ff0ff", STD_B = "#ff2d9b"; // COLORS.deck / deck2 (Fallback ohne Deckfarbe)

const TAU = Math.PI * 2;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const intOf = (c) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);

function roundRect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* Karten-Textur (frontImage-Skin + große Wert-Zahl) in ein Off-Canvas backen — Grundlage für die Kachel-Füllung.
   (Angelehnt an ScorchFx.buildCardCanvas: Deck-Skin füllt die Karte, die Zahl macht sie erkennbar.) */
/* #perf-hologrid: malt in ein ÜBERGEBENES Canvas (statt je Aufruf ein neues zu allozieren). Der Slice läuft bei
   JEDEM Sieg — ein frisches Canvas + eine frische GPU-Textur pro Stich waren ein Gutteil der Stich-Spitze. Jetzt
   wird dasselbe Canvas neu bemalt und die EINE Textur aktualisiert. */
function paintCardCanvas(cv, opts) {
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

// Off-Canvas in der gewünschten Größe bereitstellen (wiederverwendet, solange die Größe passt).
function sizedCanvas(cv, w, h) {
  const W = Math.max(2, w | 0), H = Math.max(2, h | 0);
  if (cv && cv.width === W && cv.height === H) return cv;
  const n = cv || document.createElement("canvas");
  n.width = W; n.height = H;
  return n;
}

export default function HologridSlicePixi({ panelRef, cardRef, trigger = 0, frontImage = null, value = null, suit = "#e0605a",
  deckColor = STD_A, deckColor2 = null, deckTint = false, reduced = false, lite = false, loop = false, speed = 1, onDone = null, onFire = null }) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const startRef = useRef(null);
  const recolorRef = useRef(null); // #359: Live-Umfärben der Kachel-Rahmen bei Farbmodus-Wechsel (kein Remount → build() läuft nicht neu)
  const firstRef = useRef(true);
  const imgRef = useRef(null);
  const p = useRef({ frontImage, value, suit, deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire });
  p.current = { frontImage, value, suit, deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire };

  // Deck-Skin vorladen (im Spiel meist schon im Cache, da die Karte im DOM liegt).
  useEffect(() => { if (!frontImage) { imgRef.current = null; return; } const img = new Image(); img.src = frontImage; imgRef.current = img; }, [frontImage]);

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    let disposed = false;
    const canvas = document.createElement("canvas");
    const app = new Application();

    const play = { on: false, t: 0 };
    let tiles = [], pix = [], root = null, beamG = null, pixG = null;
    let cardCv = null, cardTex = null, tileTexes = [];
    let sceneKey = null;      // Raster + Kartengröße der GEBAUTEN Bühne — ändert sie sich nicht, wird nichts neu gebaut
    let geo = null;           // { cardX, cardY, cardW, cardH, W, H, floorY, sweepx, sweepy, entry }
    let DUR = 0;

    function clearScene() {
      if (root) { root.destroy({ children: true }); root = null; }
      for (const tx of tileTexes) { try { tx.destroy(false); } catch { /* ignore */ } }
      tileTexes = [];
      if (cardTex) { try { cardTex.destroy(true); } catch { /* ignore */ } cardTex = null; }
      cardCv = null; sceneKey = null; geo = null;
      tiles = []; pix = []; beamG = pixG = null;
    }

    /* #perf-hologrid: Die Bühne wird EINMAL gebaut und über die Stiche hinweg behalten.
       Vorher lief bei jedem Sieg `clearScene() + build()`: Kartentextur neu backen UND COLS×ROWS Kacheln neu
       allozieren — auf der vollen Stufe 12×16 = 192 Kacheln, jede mit eigener Texture + Container + Sprite +
       Graphics-Stroke, also ~770 frische Pixi-Objekte je gewonnenem Stich (plus Zerstörung der alten). Genau das
       war die gemessene Stich-Spitze (Perf-Report: schlimmste Frames 117–133 ms auf `trick`).
       Neu gebaut wird nur noch, wenn sich RASTER oder KARTENGRÖSSE ändern (Effekt-Stufe/Layout). Je Sieg bleiben:
       dasselbe Canvas neu bemalen + eine Textur-Aktualisierung, Positionen und Sweep-Koordinaten neu rechnen
       (reine Arithmetik, keine Allokation). Der Look ist unverändert. */
    function ensureScene(cardW, cardH) {
      const s = p.current;
      // #perf Medium-Stufe (lite): gröberes Raster → deutlich weniger Kacheln (dominanter Kostenposten).
      const cols = s.lite ? Math.max(4, Math.round(TUNE.COLS * TUNE.LITE_GRID)) : TUNE.COLS;
      const rows = s.lite ? Math.max(4, Math.round(TUNE.ROWS * TUNE.LITE_GRID)) : TUNE.ROWS; // #perf-mobile: Boden 5→4, sonst bremst er die Halbierung aus
      const RES = s.lite ? 1.25 : 2;   // Karten-Textur 2× für Schärfe, lite 1,25×
      const key = `${cols}x${rows}@${Math.round(cardW)}x${Math.round(cardH)}@${RES}`;
      if (key === sceneKey && root && cardTex) return { cols, rows, fresh: false };

      clearScene();
      cardCv = sizedCanvas(null, cardW * RES, cardH * RES);
      paintCardCanvas(cardCv, { img: imgRef.current, value: s.value, suit: s.suit });
      cardTex = Texture.from(cardCv);
      const src = cardTex.source; src.scaleMode = "linear";
      const twT = cardCv.width / cols, thT = cardCv.height / rows;   // Kachel in Textur-px
      const tw = cardW / cols, th = cardH / rows;                    // Kachel on-screen

      root = new Container(); app.stage.addChild(root);
      beamG = new Graphics(); beamG.blendMode = "add"; pixG = new Graphics(); pixG.blendMode = "add";

      const ca = rgb(s.deckColor || STD_A), cb = rgb(s.deckColor2 || s.deckColor || STD_B);
      const holoAt = (u) => intOf(mix(ca, cb, clamp01(u)));   // Deck-Verlauf entlang der Karte (u = 0..1 quer)

      tiles = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const tex = new Texture({ source: src, frame: new Rectangle(c * twT, r * thT, twT, thT) }); tileTexes.push(tex);
        const cont = new Container();
        const fill = new Sprite(tex); fill.anchor.set(0.5); fill.width = tw + 0.6; fill.height = th + 0.6;   // 0.6px Overlap → keine Naht-Ritzen vor Reveal
        // Rahmen (Hologrid): Rechteck-Kontur in Deckfarbe, lokal um die Kachelmitte. Alpha animiert (Reveal → Wire → Fade).
        const hf = (c + 0.5) / cols;           // #359: Verlaufs-Anteil quer über die Karte (für Live-Umfärben gespeichert)
        const holo = holoAt(hf);
        const frame = new Graphics(); frame.rect(-tw / 2, -th / 2, tw, th).stroke({ width: TUNE.SEAM_W, color: holo, alpha: 1 });
        frame.blendMode = "add"; frame.alpha = 0;
        cont.addChild(fill, frame); root.addChild(cont);
        // Position/Sweep/Würfe kommen aus placeTiles()/armSweep() — sie ändern sich je Stich, die Objekte nicht.
        tiles.push({ cont, fill, frame, r, c, hf, holo,
          homeX: 0, homeY: 0, u: 0, outx: 0, outy: 0, released: false, dead: false,
          x: 0, y: 0, vx: 0, vy: 0, ang: 0, spin: 0, tphase: 0, life: 0, jx: 0, jy: 0 });
      }
      root.addChild(beamG, pixG);   // Beam + Mini-Pixel liegen über den Kacheln (Rahmen sitzt je Kachel als Kind-Graphics)
      pix = [];
      sceneKey = key;
      return { cols, rows, fresh: true };
    }

    // Kachel-Ruhelagen an die aktuelle Kartenposition setzen (die Karte kann zwischen Stichen wandern).
    function placeTiles(cardX, cardY, cardW, cardH, cols, rows) {
      const tw = cardW / cols, th = cardH / rows;
      const cx = cardX + cardW / 2, cy = cardY + cardH / 2;
      for (const tl of tiles) {
        tl.homeX = cardX + (tl.c + 0.5) * tw; tl.homeY = cardY + (tl.r + 0.5) * th;
        // Ausricht-Richtung (vom Kartenzentrum nach außen) für den Wegflug.
        const ox = tl.homeX - cx, oy = tl.homeY - cy, ol = Math.hypot(ox, oy) || 1;
        tl.outx = ox / ol; tl.outy = oy / ol;
      }
    }

    // Neue Sweep-Richtung würfeln + die davon abhängigen Kachel-Werte neu rechnen (kein Neubau).
    function armSweep(cardX, cardY, cardW, cardH) {
      // Sweep-Richtung: eine der 4 Kardinalrichtungen; die Laserlinie steht senkrecht dazu.
      const dirIdx = Math.floor(rndSeed() * 4);
      const [sweepx, sweepy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][dirIdx];   // →/←/↓/↑
      for (const tl of tiles) {
        // Sweep-Koordinate u ∈ [0,1] (0 = Eintrittskante des Lasers): Projektion der Kachelmitte auf die Sweep-Achse.
        tl.u = sweepx !== 0 ? (sweepx > 0 ? (tl.homeX - cardX) / cardW : 1 - (tl.homeX - cardX) / cardW)
                            : (sweepy > 0 ? (tl.homeY - cardY) / cardH : 1 - (tl.homeY - cardY) / cardH);
        tl.tphase = rndSeed() * TAU; tl.jx = rndSeed() - 0.5; tl.jy = rndSeed() - 0.5;
      }
      return { sweepx, sweepy };
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
      p.current.onFire && p.current.onFire();   // #378 Showcase-Sound (fx_lasergrid) am Loop-Neustart → synchron zum Slice (kein Drift)
      for (const tl of tiles) { tl.released = false; tl.dead = false; tl._sparked = false; tl.life = 0; tl.x = tl.homeX; tl.y = tl.homeY; tl.vx = tl.vy = tl.ang = tl.spin = 0; tl.cont.visible = true; tl.cont.position.set(tl.homeX, tl.homeY); tl.cont.rotation = 0; tl.cont.scale.set(1, 1); tl.fill.alpha = 1; tl.frame.alpha = 0; }
      pix = [];
    }

    function startPlay() {
      if (disposed || !appRef.current) return;
      const pr = panelRef?.current?.getBoundingClientRect(); if (!pr || pr.width < 2) return;
      const cr = cardRef?.current?.getBoundingClientRect(); if (!cr || cr.width < 8) return;
      const s = p.current;
      const cardX = cr.left - pr.left, cardY = cr.top - pr.top, cardW = cr.width, cardH = cr.height;

      const { cols, rows, fresh } = ensureScene(cardW, cardH);
      if (!root) return;
      // Nur das KARTENBILD wechselt je Stich (anderer Wert/Farbe). Bei wiederverwendeter Bühne dasselbe Canvas neu
      // bemalen und die eine Textur aktualisieren — die Kachel-Ausschnitte zeigen weiter auf dieselbe Quelle.
      if (!fresh) { paintCardCanvas(cardCv, { img: imgRef.current, value: s.value, suit: s.suit }); cardTex.source.update(); }
      placeTiles(cardX, cardY, cardW, cardH, cols, rows);
      const { sweepx, sweepy } = armSweep(cardX, cardY, cardW, cardH);
      geo = { cardX, cardY, cardW, cardH, W: pr.width, H: pr.height, floorY: pr.height * TUNE.FLOOR,
              sweepx, sweepy, cx: cardX + cardW / 2, cy: cardY + cardH / 2, tw: cardW / cols, th: cardH / rows };
      // Gesamtdauer: Ladung + Sweep-Release (letzte Kachel bei u=1) + Fragment-Leben.
      DUR = TUNE.CHARGE + (TUNE.CUT + TUNE.STAGGER) + TUNE.FRAG_LIFE;
      restart();   // Kachel-Zustand zurücksetzen + #378 Sound (fx_lasergrid) + play scharf stellen
      if (document.visibilityState !== "hidden") app.ticker.start();
    }
    startRef.current = startPlay;

    // #359 Live-Umfärben: der Farbmodus-Toggle (Standard↔Deckfarbe) remountet die Bühne NICHT (Key trägt nur den
    //   Effekt, #perf-shop Plan B), und build() läuft im Showcase nur EINMAL (trigger konstant) — der Loop restart()
    //   baut die Kacheln nicht neu. Ohne diesen Sync behielten die Hologrid-Rahmen ihre beim Mount gebackene Farbe →
    //   nach dem Wechsel auf „Standard" leuchteten sie NOCH in der Deckfarbe. Hier die Rahmen (+ gespeicherte holo-Farbe
    //   je Kachel, die auch die Wegflug-Pixel erben) mit der aktuellen Farbe neu strichen. Der Beam liest die Farbe
    //   ohnehin live pro Frame. Nur Rahmen neu strichen (kein Textur-/Geometrie-Neubau) → günstig.
    function recolor() {
      if (disposed || !geo || !tiles.length) return;
      const s = p.current;
      const ca = rgb(s.deckColor || STD_A), cb = rgb(s.deckColor2 || s.deckColor || STD_B);
      const { tw, th } = geo;
      for (const tl of tiles) {
        tl.holo = intOf(mix(ca, cb, clamp01(tl.hf)));
        tl.frame.clear();
        tl.frame.rect(-tw / 2, -th / 2, tw, th).stroke({ width: TUNE.SEAM_W, color: tl.holo, alpha: 1 });
      }
    }
    recolorRef.current = recolor;

    app.init({ canvas, preference: "webgl", backgroundAlpha: 0, antialias: true, autoDensity: true,
      resolution: Math.min(p.current.lite ? 1.25 : 2, window.devicePixelRatio || 1), resizeTo: host, powerPreference: "high-performance" })
      .then(() => {
        if (disposed) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } return; }
        appRef.current = app;
        canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block"; host.appendChild(canvas);
        app.ticker.maxFPS = p.current.lite ? DRAW_HZ_COARSE : 0; // #perf-mobile: Rate aus mobileTier (?hz=)
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

  // Neuer Sieg (trigger wechselt je Stich) → neu abspielen. #perf-hologrid: das backt nur noch das Kartenbild neu,
  // die Kacheln bleiben stehen (s. ensureScene).
  useEffect(() => { if (firstRef.current) { firstRef.current = false; return; } startRef.current?.(); }, [trigger]);

  // #359 Farbmodus-Wechsel (Standard↔Deckfarbe) ohne Remount → Kachel-Rahmen live umfärben (s. recolor()).
  useEffect(() => { recolorRef.current?.(); }, [deckColor, deckColor2]);

  // z-11: Finisher liegt über der (in-place unsichtbar gerenderten) Gegnerkarte.
  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11 }} />;
}
