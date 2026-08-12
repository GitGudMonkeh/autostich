import { useEffect, useRef } from "react";

/* Archetyp-Karteneffekt „Eis" als Neon-Kristall-Frost — Vereisung der eigenen Karte mit der Gletscher-Masse.
   Von UNTEN & den beiden SEITEN wächst kantiger Neon-Frost nach innen/oben zu (Akkretion: bestehende Kristalle bleiben,
   neue kommen dazu). Zwei gegenüberliegende Neon-Bühnenlichter (A↔B, Achse = NEON_ANGLE) strahlen den Frost an:
   glühende Wireframe-Kanten, milchige Glasur, Rime-Körnung, weiche Bloom-Aura. Renderer + TUNE 1:1 aus dem Kombi-
   Tuning-Board (docs/prototypes/moos-eis-combo.html); die Werte sind vom User abgesegnet.

   BEWUSST Canvas-2D (kein Pixi-Custom-Shader): Pixis Mesh/Filter-Shader rendern auf dem Mobile-Setup NICHT (siehe
   AuroraFieldGL/NeonSilk). Weiche Fills/Strokes in ein gecachtes Offscreen-Bitmap → mobiltauglich.

   ANIMIERT (anders als das statische Moos): Funkeln (SPARKLE) + Stufe-3-Puls (SHIMMER) laufen live → der rAF läuft
   durchgehend, während Masse > 0 & Tab sichtbar (analog NeonSilk). Das Frost-BITMAP ist aber gecacht (nur bei
   Stufen-/Front-Wechsel neu); der Composite-Blit + Funkeln laufen per-Frame und folgen der (animierten) Karte.

   GRÖSSEN-UNABHÄNGIG: Frost-Bitmap wird in Referenzgröße (REF_W×REF_H = Prototyp @ zoom 1.3) gerendert und proportional
   auf die echte 104×144-Karte heruntergeblittet → abgesegnete Optik bleibt bei jeder Kartengröße pixel-proportional.
   Composite-Clip = EXAKTES Karten-RoundRect (kein Überstand, anders als Moos) → Eis bleibt strikt im Rahmen. */

// ── TUNE (abgesegnete Board-Werte aus moos-eis-combo.html) ──────────────────────
const TUNE = {
  ICE_DARK: "#141d47", ICE_MID: "#4f78c8", ICE_EDGE: "#cfeeff",

  NEON_A: "#22e0ff", NEON_B: "#a13cff", NEON_ANGLE: 90, NEON_RIM: 0.16, NEON_TIP: 0.58, NEON_PUNCH: 0.2, NEON_BLOOM: 0.36, NEON_BASE: 0,

  COVER: 0.47, SIDE_BAND: 0.44, BOTTOM_BIAS: 0.58, RAGGED: 1, DENSITY: 0.44, CLUMP: 0.64, BASE_FREEZE: 0.06,

  SHARD_LEN: 17, SHARD_WIDTH: 0.76, FACET: 0.64, HEX: 0, GLAZE: 1,

  DENDRITE: 0, DEND_LEN: 0.3, DEND_BRANCH: 0,

  RIME: 0.5, SPARKLE: 0.4, SHIMMER: 0.5,
};

const TAU = Math.PI * 2;
const THRESHOLDS = [4, 8, 12];   // glacier.js — Schwellen; Stufe = #Schwellen ≤ Masse (0..3)
const MASS_MAX = 12;             // glacier.js TOP / BURST_AT
const REF_W = 282, REF_H = 390;  // Referenz-Kartenbox (Prototyp box() @ zoom 1.3), identisch zu MossGrow
const CARD_R = 12;               // Karten-Eckenradius (rounded-xl) — für den strikten Composite-Clip
const M = 20;                    // Rand ums Frost-Bitmap, in Referenz-px (wird beim Clip weggeschnitten → kein Überstand)

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
function hexRGB(h) { let s = String(h || "#4f78c8").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
const rgba = (c, a) => "rgba(" + (c.r | 0) + "," + (c.g | 0) + "," + (c.b | 0) + "," + a + ")";
const mix = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
const clampRGB = (c) => ({ r: Math.max(0, Math.min(255, c.r)), g: Math.max(0, Math.min(255, c.g)), b: Math.max(0, Math.min(255, c.b)) });
const satBoost = (c, s) => { const L = 0.30 * c.r + 0.59 * c.g + 0.11 * c.b; return clampRGB({ r: L + (c.r - L) * (1 + s), g: L + (c.g - L) * (1 + s), b: L + (c.b - L) * (1 + s) }); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function roundRectPath(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function vhash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function fbm(x, y) { return vhash(x * 0.05, y * 0.05) * 0.6 + vhash(x * 0.13, y * 0.13) * 0.28 + vhash(x * 0.31, y * 0.31) * 0.12; }

const stageOf = (m) => { let s = 0; for (let i = 0; i < THRESHOLDS.length; i++) if (m >= THRESHOLDS[i]) s++; return s; };
const frontOf = (m) => { if (m <= 0) return 0; const s = stageOf(m); if (s === 0) return TUNE.COVER * TUNE.BASE_FREEZE; return TUNE.COVER * (THRESHOLDS[s - 1] / MASS_MAX); };

export function FrostIce({ mass = 0, panelRef, cardRef, reduced = false }) {
  const hostRef = useRef(null);
  const stateRef = useRef({ mass });
  stateRef.current = { mass };
  const syncRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    // Offscreen: Frost-Bitmap + Neon-Bloom-Aura, beide in Referenzgröße gecacht (nur bei Front-Wechsel neu).
    const frost = document.createElement("canvas"), fx = frost.getContext("2d");
    const glow = document.createElement("canvas"), gx = glow.getContext("2d");
    let W = 0, H = 0, DPR = 1, RDPR = 1;
    let cardX = 0, cardY = 0, cardW = 0, cardH = 0;
    let field = [], sparks = [], neonTips = [];
    let _axc = 1, _axs = 0, _cNA = { r: 34, g: 224, b: 255 }, _cNB = { r: 161, g: 60, b: 255 };
    let renderedFront = -1, clockT = 0, last = 0, raf = 0, disposed = false, cleared = false;

    // ── Frost-Feld (fixe Referenzgröße, deterministisch seeded → einmal gebaut) ──
    (function buildField() {
      RDPR = Math.min(2, window.devicePixelRatio || 1);
      frost.width = Math.round((REF_W + 2 * M) * RDPR); frost.height = Math.round((REF_H + 2 * M) * RDPR);
      glow.width = frost.width; glow.height = frost.height;
      field = []; sparks = [];
      const step = 9 + (1 - TUNE.DENSITY) * 9;
      const maxUp = REF_H * (0.22 + 0.72 * TUNE.BOTTOM_BIAS), maxIn = REF_W * (0.14 + 0.52 * TUNE.SIDE_BAND);
      const rng = mulberry32(20250812); let id = 0;
      for (let gy = step * 0.5; gy < REF_H; gy += step) for (let gx0 = step * 0.5; gx0 < REF_W; gx0 += step) {
        const x = gx0 + (rng() - 0.5) * step * 0.9, y = gy + (rng() - 0.5) * step * 0.9;
        if (x < 0 || x > REF_W || y < 0 || y > REF_H) continue;
        const dBot = REF_H - y, dL = x, dR = REF_W - x;
        let bi = Math.min(dBot / maxUp, dL / maxIn, dR / maxIn);
        bi += TUNE.RAGGED * (fbm(x, y) - 0.5) * 0.55;
        const birthF = clamp01(bi); if (birthF > 0.999) continue;
        const wBot = 1 / (dBot + 8), wL = 1 / (dL + 8), wR = 1 / (dR + 8);
        let gdx = (wL - wR) * REF_W * 0.5, gdy = -wBot * REF_H * 0.9; const gl = Math.hypot(gdx, gdy) || 1; gdx /= gl; gdy /= gl;
        const size = 0.6 + rng() * 0.7 + TUNE.CLUMP * (rng() * rng()) * 1.7, hue = rng();
        const edgeProx = clamp01(1 - birthF / 0.18);
        field.push({ x, y, birthF, gdx, gdy, size, hue, edgeProx, seed: (id++ * 2654435761) >>> 0 });
        if (TUNE.SPARKLE > 0 && rng() < 0.10) sparks.push({ x, y, birthF, ph: rng() * TAU });
      }
    })();

    function drawShard(g, t, mat, cDark, cMid, cEdge) {
      const rng = mulberry32(t.seed);
      const tAxis = clamp01(0.5 + ((t.x - REF_W / 2) * _axc + (t.y - REF_H / 2) * _axs) / (Math.max(REF_W, REF_H) * 0.62));
      const neon = clampRGB(mix(_cNA, _cNB, tAxis)), neonP = satBoost(neon, 0.45 + 0.9 * TUNE.NEON_PUNCH);
      const neonHot = clampRGB(mix(neonP, { r: 255, g: 255, b: 255 }, 0.4 + 0.3 * clamp01(TUNE.NEON_PUNCH)));
      const len = TUNE.SHARD_LEN * (0.45 + 0.75 * t.size) * (0.4 + 0.6 * mat), wid = len * TUNE.SHARD_WIDTH * (0.42 + 0.5 * rng());
      const ja = (rng() - 0.5) * 1.5, ca = Math.cos(ja), sa = Math.sin(ja);
      const dx = t.gdx * ca - t.gdy * sa, dy = t.gdx * sa + t.gdy * ca, px = -dy, py = dx;
      const tipx = t.x + dx * len, tipy = t.y + dy * len, bx0 = t.x - dx * len * 0.32, by0 = t.y - dy * len * 0.32;
      const lx = t.x + px * wid, ly = t.y + py * wid, rx = t.x - px * wid, ry = t.y - py * wid;
      let bodyBase = clampRGB(mix(cDark, cMid, 0.35 + 0.4 * mat)), bodyTip = clampRGB(mix(cMid, cEdge, 0.4 + 0.5 * mat));
      const washV = TUNE.NEON_BASE >= 0.5 ? TUNE.NEON_RIM * 0.55 : TUNE.NEON_RIM * 0.16;
      bodyBase = clampRGB(mix(bodyBase, neonP, washV)); bodyTip = clampRGB(mix(bodyTip, neonP, washV * 0.7));
      const grd = g.createLinearGradient(bx0, by0, tipx, tipy);
      grd.addColorStop(0, rgba(bodyBase, 0.80 * mat)); grd.addColorStop(1, rgba(bodyTip, 0.9 * mat)); g.fillStyle = grd;
      g.beginPath(); g.moveTo(bx0, by0); g.lineTo(lx, ly); g.lineTo(tipx, tipy); g.lineTo(rx, ry); g.closePath(); g.fill();
      if (TUNE.FACET > 0) {
        g.fillStyle = rgba(clampRGB(mix(bodyBase, { r: 0, g: 0, b: 0 }, 0.35 * TUNE.FACET)), 0.5 * mat * TUNE.FACET);
        g.beginPath(); g.moveTo(bx0, by0); g.lineTo(lx, ly); g.lineTo(tipx, tipy); g.closePath(); g.fill();
        g.fillStyle = rgba(clampRGB(mix(bodyTip, { r: 255, g: 255, b: 255 }, 0.30 * TUNE.FACET)), 0.35 * mat * TUNE.FACET);
        g.beginPath(); g.moveTo(bx0, by0); g.lineTo(rx, ry); g.lineTo(tipx, tipy); g.closePath(); g.fill();
      }
      if (TUNE.NEON_TIP > 0) {
        const rimI = clamp01(TUNE.NEON_TIP * (0.4 + 0.6 * mat) * (0.6 + 0.5 * t.size));
        g.globalCompositeOperation = "lighter"; g.lineJoin = "round"; g.lineCap = "round";
        g.strokeStyle = rgba(neonP, rimI * (0.5 + 0.4 * TUNE.NEON_PUNCH)); g.lineWidth = 1.0 + 1.4 * TUNE.NEON_PUNCH;
        g.beginPath(); g.moveTo(lx, ly); g.lineTo(tipx, tipy); g.lineTo(rx, ry); g.stroke();
        g.strokeStyle = rgba(neonHot, rimI * 0.6); g.lineWidth = 0.8 + 0.8 * TUNE.NEON_PUNCH;
        g.beginPath(); g.moveTo(bx0, by0); g.lineTo(tipx, tipy); g.stroke();
        const pr = 1.2 + 2.6 * TUNE.NEON_PUNCH;
        g.fillStyle = rgba(neonP, rimI * 0.30); g.beginPath(); g.arc(tipx, tipy, pr, 0, TAU); g.fill();
        g.fillStyle = rgba(neonHot, rimI * 0.85); g.beginPath(); g.arc(tipx, tipy, pr * 0.45, 0, TAU); g.fill();
        g.globalCompositeOperation = "source-over";
        if (neonTips.length < 420 && rng() < 0.7) neonTips.push({ x: tipx, y: tipy, c: neonP, i: rimI });
      }
    }
    function drawDendrite(g, x, y, ang, len, depth, col, alpha) {
      if (depth <= 0 || len < 3 || alpha < 0.04) return;
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      const mx = (x + ex) / 2 + Math.cos(ang + Math.PI / 2) * (len * 0.12), my = (y + ey) / 2 + Math.sin(ang + Math.PI / 2) * (len * 0.12);
      g.globalCompositeOperation = "lighter"; g.strokeStyle = rgba(col, alpha); g.lineWidth = 0.6 + depth * 0.35; g.lineCap = "round";
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke(); g.globalCompositeOperation = "source-over";
      if (neonTips.length < 420) neonTips.push({ x: ex, y: ey, c: col, i: alpha * 0.8 });
      const spread = 0.5 + 0.6 * TUNE.DEND_BRANCH, nl = len * (0.62 + 0.12 * TUNE.DEND_BRANCH);
      drawDendrite(g, ex, ey, ang - spread * (0.5 + 0.5 * TUNE.DEND_BRANCH), nl, depth - 1, col, alpha * 0.82);
      if (TUNE.DEND_BRANCH > 0.12) drawDendrite(g, ex, ey, ang + spread * (0.5 + 0.5 * TUNE.DEND_BRANCH), nl, depth - 1, col, alpha * 0.72);
    }
    function drawHex(g, front) {
      if (TUNE.HEX <= 0) return;
      const R = 8.5, hw = R * Math.sqrt(3), vh = R * 1.5;
      const maxUp = REF_H * (0.22 + 0.72 * TUNE.BOTTOM_BIAS), maxIn = REF_W * (0.14 + 0.52 * TUNE.SIDE_BAND);
      g.globalCompositeOperation = "lighter"; g.lineWidth = 0.7; let row = 0;
      for (let cy = vh * 0.5; cy < REF_H + R; cy += vh) {
        const xoff = (row & 1) ? hw * 0.5 : 0;
        for (let cx = xoff + hw * 0.5; cx < REF_W + R; cx += hw) {
          const dBot = REF_H - cy, dL = cx, dR = REF_W - cx, bi = Math.min(dBot / maxUp, dL / maxIn, dR / maxIn);
          const covv = clamp01((front - clamp01(bi)) / 0.16); if (covv <= 0.02) continue;
          const tAxis = clamp01(0.5 + ((cx - REF_W / 2) * _axc + (cy - REF_H / 2) * _axs) / (Math.max(REF_W, REF_H) * 0.62));
          const neon = satBoost(clampRGB(mix(_cNA, _cNB, tAxis)), 0.3 + 0.6 * TUNE.NEON_PUNCH);
          g.strokeStyle = rgba(neon, TUNE.HEX * covv * 0.34); g.beginPath();
          for (let s = 0; s < 6; s++) { const a = Math.PI / 6 + s * Math.PI / 3, hx = cx + Math.cos(a) * R, hy = cy + Math.sin(a) * R; if (s === 0) g.moveTo(hx, hy); else g.lineTo(hx, hy); }
          g.closePath(); g.stroke();
        }
        row++;
      }
      g.globalCompositeOperation = "source-over";
    }

    // Frost-Bitmap für eine Front-Abdeckung rendern (in Referenzkoordinaten, um M versetzt). Nur bei Front-Wechsel.
    function renderFrost(front) {
      fx.setTransform(RDPR, 0, 0, RDPR, M * RDPR, M * RDPR); fx.clearRect(-M, -M, REF_W + 2 * M, REF_H + 2 * M);
      neonTips = [];
      const nang = TUNE.NEON_ANGLE * Math.PI / 180; _axc = Math.cos(nang); _axs = Math.sin(nang);
      _cNA = hexRGB(TUNE.NEON_A); _cNB = hexRGB(TUNE.NEON_B);
      const cDark = hexRGB(TUNE.ICE_DARK), cMid = hexRGB(TUNE.ICE_MID), cEdge = hexRGB(TUNE.ICE_EDGE);
      let i, t, mat;
      if (TUNE.GLAZE > 0) {                                     // milchige Glasur (radiale Puffs)
        for (i = 0; i < field.length; i++) { t = field[i]; mat = clamp01((front - t.birthF) / 0.14); if (mat <= 0) continue;
          const tAxis = clamp01(0.5 + ((t.x - REF_W / 2) * _axc + (t.y - REF_H / 2) * _axs) / (Math.max(REF_W, REF_H) * 0.62));
          const gcol = clampRGB(mix(clampRGB(mix(cDark, cMid, 0.5)), clampRGB(mix(_cNA, _cNB, tAxis)), TUNE.NEON_BASE >= 0.5 ? 0.4 * TUNE.NEON_RIM : 0.12 * TUNE.NEON_RIM));
          const rad = t.size * 7 * (0.6 + 0.6 * mat), rg = fx.createRadialGradient(t.x, t.y, 0, t.x, t.y, rad);
          rg.addColorStop(0, rgba(gcol, 0.22 * TUNE.GLAZE * mat)); rg.addColorStop(1, rgba(gcol, 0)); fx.fillStyle = rg; fx.beginPath(); fx.arc(t.x, t.y, rad, 0, TAU); fx.fill();
        }
      }
      drawHex(fx, front);
      for (i = 0; i < field.length; i++) { t = field[i]; mat = clamp01((front - t.birthF) / 0.14); if (mat <= 0) continue; drawShard(fx, t, mat, cDark, cMid, cEdge); }
      if (TUNE.DENDRITE > 0) {                                  // Vektor-Dendriten (Frost-Farne)
        const dr = mulberry32(777);
        for (i = 0; i < field.length; i++) { t = field[i]; mat = clamp01((front - t.birthF) / 0.14);
          if (mat < 0.6 || t.edgeProx < 0.25) continue; if (dr() > TUNE.DENDRITE * 0.5) continue;
          const ang = Math.atan2(t.gdy, t.gdx) + (dr() - 0.5) * 0.5, dlen = TUNE.SHARD_LEN * 1.1 * TUNE.DEND_LEN * (0.7 + 0.6 * dr());
          const tAxis = clamp01(0.5 + ((t.x - REF_W / 2) * _axc + (t.y - REF_H / 2) * _axs) / (Math.max(REF_W, REF_H) * 0.62));
          const dcol = clampRGB(mix(satBoost(clampRGB(mix(_cNA, _cNB, tAxis)), 0.5), { r: 220, g: 250, b: 255 }, 0.25));
          drawDendrite(fx, t.x, t.y, ang, dlen, 3, dcol, 0.5 * TUNE.DENDRITE * mat);
        }
      }
      if (TUNE.RIME > 0) {                                      // Rime-Körnung am Rand
        const rr = mulberry32(9182);
        for (i = 0; i < field.length; i++) { t = field[i]; mat = clamp01((front - t.birthF) / 0.14); if (mat <= 0 || t.edgeProx < 0.15) continue;
          const np = Math.round(TUNE.RIME * 3 * t.edgeProx);
          for (let q = 0; q < np; q++) { const rx = t.x + (rr() - 0.5) * t.size * 5, ry = t.y + (rr() - 0.5) * t.size * 5;
            fx.fillStyle = rgba(cEdge, 0.5 * TUNE.RIME * mat * t.edgeProx * rr()); fx.fillRect(rx, ry, 1, 1); }
        }
      }
      // Bloom-Aura an den gesammelten Neon-Spitzen (gecacht, per-Frame nur drawImage)
      gx.setTransform(RDPR, 0, 0, RDPR, M * RDPR, M * RDPR); gx.clearRect(-M, -M, REF_W + 2 * M, REF_H + 2 * M);
      if (TUNE.NEON_BLOOM > 0 && neonTips.length) {
        gx.globalCompositeOperation = "lighter"; const gr = Math.max(7, TUNE.SHARD_LEN * 1.6);
        for (i = 0; i < neonTips.length; i++) { const np2 = neonTips[i], rad2 = gr * (0.6 + 0.9 * np2.i);
          const rgd = gx.createRadialGradient(np2.x, np2.y, 0, np2.x, np2.y, rad2);
          rgd.addColorStop(0, rgba(np2.c, 0.5 * np2.i)); rgd.addColorStop(0.5, rgba(np2.c, 0.16 * np2.i)); rgd.addColorStop(1, rgba(np2.c, 0));
          gx.fillStyle = rgd; gx.beginPath(); gx.arc(np2.x, np2.y, rad2, 0, TAU); gx.fill();
        }
        gx.globalCompositeOperation = "source-over";
      }
      renderedFront = front;
    }

    function measure() {
      const pr = panelRef?.current?.getBoundingClientRect();
      const cr = cardRef?.current?.getBoundingClientRect();
      if (!pr || !cr || pr.width < 2 || cr.width < 8) return false;
      DPR = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(pr.width)), h = Math.max(1, Math.round(pr.height));
      if (w !== W || h !== H) { W = w; H = h; canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); }
      cardX = cr.left - pr.left; cardY = cr.top - pr.top; cardW = cr.width; cardH = cr.height;
      const ccx = cardX + cardW / 2, ccy = cardY + cardH / 2;   // Karte weggeflogen/außerhalb → Effekt nicht hängen lassen
      if (ccx < -cardW || ccx > W + cardW || ccy < -cardH || ccy > H + cardH) return false;
      return true;
    }
    function clear() { if (cleared) return; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); cleared = true; }

    // Composite: Frost proportional auf die Kartenbox blitten, STRIKT aufs exakte RoundRect geclippt (kein Überstand).
    function compose(mass) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H); cleared = false;
      const sx = cardW / REF_W, sy = cardH / REF_H;                 // Referenz → echte Kartengröße
      const mLeft = M * sx, mTop = M * sy;                          // skalierter Rand (wird vom Clip weggeschnitten)
      const anim = !reduced;
      const pulse = (anim && TUNE.SHIMMER > 0 && stageOf(mass) >= 3) ? 1 + TUNE.SHIMMER * 0.35 * Math.sin(clockT * 0.004) : 1;
      ctx.save();
      roundRectPath(ctx, cardX, cardY, cardW, cardH, CARD_R); ctx.clip();   // STRIKT: exaktes Karten-RoundRect
      ctx.drawImage(frost, 0, 0, frost.width, frost.height, cardX - mLeft, cardY - mTop, cardW + 2 * mLeft, cardH + 2 * mTop);
      if (TUNE.NEON_BLOOM > 0) {
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = clamp01(TUNE.NEON_BLOOM * pulse);
        ctx.drawImage(glow, 0, 0, glow.width, glow.height, cardX - mLeft, cardY - mTop, cardW + 2 * mLeft, cardH + 2 * mTop);
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      }
      if (anim && TUNE.SPARKLE > 0) {                               // Funkeln (live über dem Frost)
        ctx.globalCompositeOperation = "lighter"; const front2 = frontOf(mass);
        for (let s = 0; s < sparks.length; s++) { const sp = sparks[s]; if (front2 <= sp.birthF) continue;
          const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(clockT * 0.005 + sp.ph));
          ctx.fillStyle = rgba({ r: 210, g: 240, b: 255 }, 0.6 * TUNE.SPARKLE * tw);
          ctx.beginPath(); ctx.arc(cardX + sp.x * sx, cardY + sp.y * sy, (0.9 + 0.7 * tw) * sx, 0, TAU); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();
    }

    // Frost-BITMAP ist gecacht (nur bei Front-Wechsel neu). Der Composite läuft per-Frame — folgt der animierten Karte
    // (Deal-in/Wegflug) UND animiert Funkeln + Stufe-3-Puls. Pro Frame: measure + clear + 2× drawImage + Funkeln.
    function frame(now) {
      if (disposed) return;
      clockT += Math.min(50, now - last); last = now;
      const mass = clamp(stateRef.current.mass || 0, 0, MASS_MAX);
      const front = frontOf(mass);
      if (front <= 0 || !measure()) { clear(); raf = 0; return; }   // keine Masse / Karte weg → rAF anhalten
      if (Math.abs(front - renderedFront) > 0.003) renderFrost(front); // Bitmap nur bei Front-Wechsel neu bauen
      compose(mass);
      raf = requestAnimationFrame(frame);
    }

    // Startet/stoppt den rAF anhand Masse & Tab-Sichtbarkeit (analog NeonSilk → kein Leerlauf).
    function ensureRun() {
      if (disposed) return;
      const run = (stateRef.current.mass || 0) > 0 && document.visibilityState !== "hidden";
      if (run) { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; clear(); }
    }
    syncRef.current = ensureRun;
    const onVis = () => ensureRun();
    document.addEventListener("visibilitychange", onVis);
    ensureRun();

    return () => {
      disposed = true; document.removeEventListener("visibilitychange", onVis);
      if (raf) cancelAnimationFrame(raf); try { host.removeChild(canvas); } catch { /* ignore */ }
    };
  }, [panelRef, cardRef, reduced]);

  // Masse-Wechsel (0 ↔ >0, oder Stufe) startet/rendert neu, ohne die Canvas neu zu bauen.
  useEffect(() => { syncRef.current?.(); }, [mass]);

  // z-10.5-Rolle: Eis liegt AUF der Karte (z-10), aber UNTER dem Moos (MossGrow z-11, später im DOM). Als FRÜHERER
  // DOM-Knoten mit z-11 → über der Karte, aber Moos (späterer z-11-Knoten) bleibt darüber (User-Vorgabe „Moos über Eis").
  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11 }} />;
}

export default FrostIce;
