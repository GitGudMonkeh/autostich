import { useEffect, useRef } from "react";

/* #319 Scorch-Sieg-Finisher — organische Karten-Auflösung statt Rechteck-Raster.
   Ein Laser schießt EINMALIG aus zufälliger Richtung in die geschlagene (Gegner-)Karte; danach verglüht sie ORGANISCH
   über ein fbm-Rausch-Burn-Feld: zerklüftete Brennkante, Verkohlungs-Band, glühender Rand — dazu weiche aufsteigende
   Glut-, fallende Asche- und kleine Funken-Partikel. Werte 1:1 aus dem Tuning-Board (Issue #319).

   BEWUSST Canvas-2D (kein Pixi-Custom-Shader): Pixis Mesh/Filter-Shader rendern auf dem Mobile-Setup NICHT (siehe
   AuroraFieldGL). Der Burn ist ein kurzer (~0,85 s) per-Pixel-Effekt über ein klein gehaltenes Burn-Feld (~120 px breit)
   → auf dem Handy tragbar. Eigenständige Komponente (wie IonStorm/FireHead): eigene Canvas, per rAF, absolut über dem
   Panel, positioniert über der Karte via cardRef/panelRef. */

// ── TUNE (Finale Werte aus dem Board, Issue #319) ──────────────────────────────
const TUNE = {
  // Brand (organische Auflösung)
  DUR: 0.85, ORIGIN_X: 0.50, ORIGIN_Y: 0.40, ROUGH: 0.40, NOISE_SCALE: 5.5,
  CHAR: 0.070, RIM: 0.050, EDGE_GLOW: 1.40,
  // Laser (Einmal-Schuss, zufällige Richtung)
  LASER_ON: 1, LASER_W: 2.2, LASER_GLOW: 0.25, LASER_FLASH: 0.35, LASER_DRIFT: 0.65,
  // Glut
  EMB_RATE: 220, EMB_SIZE: 1.4, EMB_RISE: 70, EMB_LIFE: 1.00, EMB_GLOW: 1.55,
  // Fragmente (im Final aus)
  FRAG_RATE: 0, FRAG_SIZE: 2.0, FRAG_DRIFT: 0, FRAG_LIFE: 0.40, FRAG_RIM: 0.00,
  // Asche
  ASH_RATE: 70, ASH_SIZE: 2.5, ASH_FALL: 60,
  // Funken
  SPARK_RATE: 90, SPARK_SIZE: 0.5, SPARK_SPD: 220, SPARK_LIFE: 0.45,
  // Timing (Board-Vorschau-Tempo; im Spiel = 1, Showcase kann schneller)
  TAIL: 0.9,   // Nachlauf (s), in dem die Partikel ausklingen, bevor „fertig"
};
const CHAR_COL = "#666666";        // Kohle/Asche-Ton (Issue-COLORS.char)
const ASH_COL = [36, 22, 17];      // dunkle Asche-Flocke

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// Warme Feuer-Rampe (weiß→gold→orange→rot). Deck-Modus tönt zur Deckfarbe.
const FIRE = [[0, [92, 14, 6]], [0.35, [214, 70, 18]], [0.65, [255, 168, 60]], [0.86, [255, 224, 150]], [1, [255, 248, 232]]];
function emberCol(h, deckMode, deckRGB) {
  h = clamp(h, 0, 1);
  let c = FIRE[FIRE.length - 1][1];
  for (let i = 0; i < FIRE.length - 1; i++) {
    if (h <= FIRE[i + 1][0]) { const t = (h - FIRE[i][0]) / (FIRE[i + 1][0] - FIRE[i][0]); c = mix(FIRE[i][1], FIRE[i + 1][1], t); break; }
  }
  if (deckMode) c = mix(deckRGB, c, 0.45 + 0.55 * h);
  return c;
}
const toHex = (c) => "#" + ((1 << 24) + ((c[0] | 0) << 16) + ((c[1] | 0) << 8) + (c[2] | 0)).toString(16).slice(1);

// Weiche Radial-Sprites (pro Farbe gecacht) — additive Glut/Funken, normale Asche. Kern + weicher Halo, kein Pixel-Look.
const SPRITES = new Map();
function sprite(hex) {
  if (SPRITES.has(hex)) return SPRITES.get(hex);
  const s = 64, c = document.createElement("canvas"); c.width = c.height = s; const x = c.getContext("2d"), [r, g, b] = rgb(hex);
  const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.4, `rgba(${r},${g},${b},0.7)`); gr.addColorStop(0.75, `rgba(${r},${g},${b},0.16)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, s, s); SPRITES.set(hex, c); return c;
}
const esprite = (c) => sprite(toHex(c));

// fbm-Rausch (Value-Noise, 4 Oktaven) für die organische Brennfront.
function makeNoise(seed) {
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7 + seed * 57.13) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); };
  return (x, y) => { let f = 0, a = 0.5, fr = 1; for (let o = 0; o < 4; o++) { f += a * vnoise(x * fr, y * fr); fr *= 2.03; a *= 0.5; } return f; };
}

function roundRect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* Baut die Karten-Textur (frontImage-Skin + große Wert-Zahl) in ein Off-Canvas — Grundlage für den Burn.
   Reicht als „verbrennende Karte": der Deck-Skin füllt die Karte, die Zahl macht sie erkennbar. */
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
  // Große Wert-Zahl mittig (hohl/neon-artig: farbige Kontur), damit die brennende Karte erkennbar bleibt.
  if (opts.value != null) {
    cc.font = `900 ${Math.round(H * 0.34)}px "Helvetica Neue",Arial,sans-serif`; cc.textAlign = "center"; cc.textBaseline = "middle";
    cc.lineWidth = Math.max(2, W * 0.028); cc.strokeStyle = opts.suit; cc.fillStyle = "#0d0d12";
    cc.fillText(String(opts.value), W / 2, H * 0.46); cc.strokeText(String(opts.value), W / 2, H * 0.46);
  }
  cc.restore();
  return cv;
}

export default function ScorchFx({ panelRef, cardRef, trigger = 0, frontImage = null, value = null, suit = "#e0605a",
  deckColor = "#35e0ff", deckTint = false, reduced = false, loop = false, speed = 1, onDone = null }) {
  const hostRef = useRef(null);
  // Live-Props für den rAF-Loop spiegeln.
  const p = useRef({ frontImage, value, suit, deckColor, deckTint, reduced, loop, speed, onDone });
  p.current = { frontImage, value, suit, deckColor, deckTint, reduced, loop, speed, onDone };
  const imgRef = useRef(null);

  // Bild (Deck-Skin) vorladen — im Spiel ist es i. d. R. schon im Cache (die Karte liegt bereits im DOM).
  useEffect(() => {
    if (!frontImage) { imgRef.current = null; return; }
    const img = new Image(); img.src = frontImage; imgRef.current = img;
  }, [frontImage]);

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const burnCv = document.createElement("canvas"); const bctx = burnCv.getContext("2d");
    let W = 0, H = 0, DPR = 1;
    let cardX = 0, cardY = 0, cardW = 0, cardH = 0;
    let cardCv = null, cardData = null, burnmap = null, bw = 0, bh = 0, outImg = null;
    let noise = makeNoise(1), laserAng = 0;
    let embers = [], ash = [], sparks = [];
    let burning = false, bt = 0, clock = 0, done = false;
    let raf = 0, last = 0, disposed = false;

    function measure() {
      const pr = panelRef?.current?.getBoundingClientRect();
      const cr = cardRef?.current?.getBoundingClientRect();
      if (!pr || !cr || pr.width < 2 || cr.width < 2) return false;
      DPR = Math.min(1.5, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(pr.width)); H = Math.max(1, Math.round(pr.height));
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      cardX = cr.left - pr.left; cardY = cr.top - pr.top; cardW = cr.width; cardH = cr.height;
      return true;
    }

    // Burn-Feld: je Pixel eine „Brennzeit" 0..1 = Distanz vom Einschlag + fbm-Rausch → zerklüftete organische Front.
    function buildBurn() {
      bw = clamp(Math.round(cardW), 40, 130); bh = Math.max(2, Math.round(bw * cardH / Math.max(1, cardW)));
      burnCv.width = bw; burnCv.height = bh; outImg = ctx.createImageData(bw, bh);
      const tmp = document.createElement("canvas"); tmp.width = bw; tmp.height = bh; const tc = tmp.getContext("2d");
      tc.drawImage(cardCv, 0, 0, bw, bh); cardData = tc.getImageData(0, 0, bw, bh).data;
      burnmap = new Float32Array(bw * bh);
      const oxn = TUNE.ORIGIN_X, oyn = TUNE.ORIGIN_Y, sc = TUNE.NOISE_SCALE, rough = TUNE.ROUGH, ar = cardH / Math.max(1, cardW);
      let mn = 1e9, mx = -1e9;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const nx = x / bw, ny = y / bh;
        const dist = Math.hypot(nx - oxn, (ny - oyn) * ar);
        const n = noise(nx * sc, ny * sc);
        const b = dist * (1 - rough * 0.55) + (n - 0.5) * rough * 1.4;
        const i = y * bw + x; burnmap[i] = b; if (b < mn) mn = b; if (b > mx) mx = b;
      }
      const inv = 1 / Math.max(1e-4, mx - mn); for (let i = 0; i < burnmap.length; i++) burnmap[i] = (burnmap[i] - mn) * inv;
    }

    function fire() {
      if (!measure()) return;
      noise = makeNoise(1 + Math.floor(Math.random() * 9999)); laserAng = Math.random() * TAU;
      cardCv = buildCardCanvas(Math.round(cardW), Math.round(cardH), { img: imgRef.current, value: p.current.value, suit: p.current.suit });
      buildBurn();
      embers = []; ash = []; sparks = []; burning = true; bt = 0; done = false;
    }

    const inCardIdx = (i) => cardData && cardData[i * 4 + 3] > 12;
    function spawnFront(t) {   // zufälliger Punkt auf der organischen Front (burn ≈ t)
      if (!burnmap) return null;
      for (let k = 0; k < 7; k++) {
        const i = (Math.random() * burnmap.length) | 0;
        if (Math.abs(burnmap[i] - t) < 0.035 && inCardIdx(i)) { const x = i % bw, y = (i / bw) | 0; return { x: cardX + (x / bw) * cardW, y: cardY + (y / bh) * cardH }; }
      }
      return null;
    }

    function update(dt) {
      const d = dt * p.current.speed;
      if (burning) {
        bt += d; const dur = TUNE.DUR, prog = clamp(bt / dur, 0, 1);
        if (bt <= dur && !p.current.reduced) {
          const emit = (k) => Math.round(k * d);
          for (let i = 0; i < emit(TUNE.EMB_RATE); i++) { const q = spawnFront(prog); if (!q) continue;
            embers.push({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 40, vy: -(TUNE.EMB_RISE * (0.5 + Math.random() * 0.7)), age: 0, life: TUNE.EMB_LIFE * (0.6 + Math.random() * 0.6), sz: TUNE.EMB_SIZE * (0.6 + Math.random() * 0.8), seed: Math.random() * TAU }); }
          for (let i = 0; i < emit(TUNE.ASH_RATE); i++) { const q = spawnFront(prog); if (!q) continue;
            ash.push({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 40, vy: TUNE.ASH_FALL * (0.2 + Math.random() * 0.4), age: 0, life: 1.7 * (0.6 + Math.random() * 0.8), sz: TUNE.ASH_SIZE * (0.6 + Math.random() * 0.8), seed: Math.random() * TAU }); }
          for (let i = 0; i < emit(TUNE.SPARK_RATE); i++) { const q = spawnFront(prog); if (!q) continue; const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = TUNE.SPARK_SPD * (0.5 + Math.random() * 0.9);
            sparks.push({ x: q.x, y: q.y, vx: Math.cos(a) * sp + (Math.random() - 0.5) * 60, vy: Math.sin(a) * sp, age: 0, life: TUNE.SPARK_LIFE * (0.6 + Math.random() * 0.7), sz: TUNE.SPARK_SIZE * (0.7 + Math.random() * 0.7) }); }
        } else if (bt > dur + TUNE.TAIL) {   // zeitbasiert (nicht auf letzte Asche warten → kein toter Nachlauf)
          burning = false;
          if (p.current.loop) fire(); else if (!done) { done = true; p.current.onDone && p.current.onDone(); }
        }
      }
      for (let i = embers.length - 1; i >= 0; i--) { const s = embers[i]; s.age += d; if (s.age >= s.life) { embers.splice(i, 1); continue; } s.vy += (-30) * d; s.vx += Math.sin(clock * 3 + s.seed) * 8 * d; s.x += s.vx * d; s.y += s.vy * d; }
      for (let i = ash.length - 1; i >= 0; i--) { const s = ash[i]; s.age += d; if (s.age >= s.life) { ash.splice(i, 1); continue; } s.vy += 130 * d; s.vx = Math.sin(clock * 2 + s.seed) * 30; s.x += s.vx * d; s.y += s.vy * d; }
      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.age += d; if (s.age >= s.life) { sparks.splice(i, 1); continue; } s.vy += 320 * d; s.vx -= s.vx * 0.7 * d; s.x += s.vx * d; s.y += s.vy * d; }
      const cap = (a, n) => { if (a.length > n) a.splice(0, a.length - n); }; cap(embers, 600); cap(ash, 280); cap(sparks, 360);
    }

    function renderBurn(t) {
      const dm = p.current.deckTint, dr = rgb(p.current.deckColor);
      const CHAR = TUNE.CHAR, RIM = TUNE.RIM, glow = TUNE.EDGE_GLOW, ch = rgb(CHAR_COL), ec = emberCol(0.88, dm, dr), out = outImg.data, src = cardData;
      for (let i = 0, q = 0; i < burnmap.length; i++, q += 4) {
        const ca = src[q + 3];
        if (ca === 0) { out[q + 3] = 0; continue; }
        const b = burnmap[i];
        if (b > t + CHAR) { out[q] = src[q]; out[q + 1] = src[q + 1]; out[q + 2] = src[q + 2]; out[q + 3] = ca; }        // intakt
        else if (b > t) { const f = (b - t) / CHAR, k = 1 - f, emb = Math.max(0, 0.4 - f) * glow * 2.2;                  // Verkohlungs-Band
          out[q] = clamp(lerp(src[q], ch[0], k * 0.92) + ec[0] * emb, 0, 255);
          out[q + 1] = clamp(lerp(src[q + 1], ch[1], k * 0.92) + ec[1] * emb, 0, 255);
          out[q + 2] = clamp(lerp(src[q + 2], ch[2], k * 0.92) + ec[2] * emb, 0, 255); out[q + 3] = ca; }
        else if (b > t - RIM) { const f = (b - (t - RIM)) / RIM;                                                        // glühender Rand innen
          out[q] = ec[0]; out[q + 1] = ec[1]; out[q + 2] = ec[2]; out[q + 3] = ca * f * clamp(glow, 0, 1.5); }
        else out[q + 3] = 0;                                                                                            // weg
      }
      bctx.putImageData(outImg, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(burnCv, 0, 0, bw, bh, cardX, cardY, cardW, cardH);
    }

    function drawLaser() {
      if (TUNE.LASER_ON <= 0 || !burning) return;
      const beamTime = 0.2; if (bt > beamTime) return;   // EINMALIGER Schuss am Einschlag
      const ix = cardX + TUNE.ORIGIN_X * cardW, iy = cardY + TUNE.ORIGIN_Y * cardH, reach = Math.hypot(W, H) * 1.1;
      const ang = laserAng + Math.sin(clock * 6.5) * TUNE.LASER_DRIFT * 0.06;
      const sx = ix + Math.cos(ang) * reach, sy = iy + Math.sin(ang) * reach;
      const dm = p.current.deckTint, dr = rgb(p.current.deckColor);
      const col = dm ? dr : [255, 96, 60], ec = emberCol(0.92, dm, dr), g = TUNE.LASER_GLOW, lw = TUNE.LASER_W;
      const a = 1 - bt / beamTime;
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.35 * a * g})`; ctx.lineWidth = lw * 4.5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ix, iy); ctx.stroke();
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.8 * a})`; ctx.lineWidth = lw * 1.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ix, iy); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = lw * 0.55; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ix, iy); ctx.stroke();
      const fr = 24 + TUNE.LASER_FLASH * 70, fg = ctx.createRadialGradient(ix, iy, 0, ix, iy, Math.max(2, fr));
      fg.addColorStop(0, `rgba(255,255,255,${a * TUNE.LASER_FLASH})`); fg.addColorStop(0.4, `rgba(${ec[0]},${ec[1]},${ec[2]},${0.7 * a * TUNE.LASER_FLASH})`); fg.addColorStop(1, `rgba(${ec[0]},${ec[1]},${ec[2]},0)`);
      ctx.fillStyle = fg; ctx.fillRect(ix - fr, iy - fr, fr * 2, fr * 2);
      ctx.globalCompositeOperation = "source-over";
    }

    function drawSprite(spr, x, y, r, a) { ctx.globalAlpha = clamp(a, 0, 1); ctx.drawImage(spr, x - r, y - r, r * 2, r * 2); }

    function render() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
      const dm = p.current.deckTint, dr = rgb(p.current.deckColor);
      if (burning && bt <= TUNE.DUR) renderBurn(clamp(bt / TUNE.DUR, 0, 1));   // die verglühende Karte (danach ganz weg; Partikel klingen aus)
      // Asche (dunkel, normal), dann additive Glut/Funken.
      ctx.globalCompositeOperation = "source-over";
      for (const s of ash) { const lf = 1 - s.age / s.life; drawSprite(sprite(toHex(ASH_COL)), s.x, s.y, s.sz * (0.8 + 0.4 * lf), 0.5 * lf); }
      ctx.globalCompositeOperation = "lighter";
      for (const s of embers) { const lf = 1 - s.age / s.life, heat = clamp(lf, 0, 1), c = emberCol(heat, dm, dr), flick = 0.8 + 0.2 * Math.sin(clock * 28 + s.seed);
        drawSprite(esprite(c), s.x, s.y, s.sz * (0.5 + 0.6 * heat), TUNE.EMB_GLOW * (0.35 + 0.65 * lf) * flick); }
      for (const s of sparks) { const lf = 1 - s.age / s.life, c = emberCol(0.7 + 0.3 * lf, dm, dr); drawSprite(esprite(c), s.x, s.y, s.sz * (0.6 + 0.5 * lf), lf * lf); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      drawLaser();
    }

    function frame(now) {
      if (disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; clock = now / 1000;
      update(dt); render();
      raf = requestAnimationFrame(frame);
    }

    // Erststart leicht verzögert, damit das Layout (und das Karten-Bild) steht.
    const kick = () => { if (!measure()) { setTimeout(kick, 30); return; } fire(); last = performance.now(); raf = requestAnimationFrame(frame); };
    kick();

    return () => { disposed = true; if (raf) cancelAnimationFrame(raf); try { host.removeChild(canvas); } catch { /* ignore */ } };
    // trigger als Dep → jeder neue Sieg baut die Bühne neu. (p/imgRef sind Refs → stabil, nicht als Dep nötig.)
  }, [trigger, panelRef, cardRef]);

  return <div ref={hostRef} aria-hidden="true" className="absolute inset-0 z-[11] pointer-events-none" />;
}
