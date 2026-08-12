import { useEffect, useRef } from "react";

/* Archetyp-Karteneffekt „Pflanze" als Neon-Moos — realistisches Moos überwächst die eigene Karte mit dem Wachstum.
   Von OBEN & den beiden SEITEN wächst es nach innen/unten zu (Akkretion: bestehendes Moos bleibt, neues kommt dazu).
   Zwei gegenüberliegende Neon-Bühnenlichter (A↔B, Achse = NEON_ANGLE) strahlen das echte Grün an: Kanten-Säume,
   weiche Bloom-Aura, satter Punch. Renderer + TUNE 1:1 aus dem Kombi-Tuning-Board (docs/prototypes/moos-eis-combo.html,
   STYLE "moos"); die Werte sind vom User abgesegnet.

   BEWUSST Canvas-2D (kein Pixi-Custom-Shader): Pixis Mesh/Filter-Shader rendern auf dem Mobile-Setup NICHT (siehe
   AuroraFieldGL/NeonSilk). Nur weiche Fills/Strokes in ein gecachtes Offscreen-Bitmap → auf dem Handy tragbar.

   GRÖSSEN-UNABHÄNGIG: Das Moos-Bitmap wird in der REFERENZGRÖSSE (REF_W×REF_H = Prototyp @ zoom 1.3) gerendert und
   proportional auf die echte (kleinere) Kartenbox heruntergeblittet. So bleibt der abgesegnete Look bei JEDER
   Kartengröße pixel-proportional identisch — die absolut-px Moos-Details (Halm-Länge, Dichte, Überwuchs) skalieren
   automatisch mit. Das Bitmap wird nur neu gerendert, wenn sich die Reifestufe ändert (sonst ist Moos statisch). */

// ── TUNE (abgesegnete Board-Werte aus moos-eis-combo.html, STYLE "moos") ────────
const TUNE = {
  MOSS_DARK: "#20331a", MOSS_MID: "#c251aa", MOSS_TIP: "#9bc255", SPORO_COLOR: "#9a6a34",

  NEON_A: "#ea34d1", NEON_B: "#66b450", NEON_ANGLE: -74, NEON_RIM: 0.72, NEON_TIP: 0.12, NEON_PUNCH: 0.04, NEON_BLOOM: 0.76, NEON_BASE: 1,

  REIF_COV: 0.48, EDGE_BAND: 0.26, TOP_BIAS: 0.52, DENSITY: 1, CLUMP: 1, RAGGED: 1, OVERHANG: 1,

  FILA_PER: 16, FILA_LEN: 3.5, FILA_THICK: 1.35, TILT: 12, SPREAD: 0.94, TIP_LIGHT: 1, SPECK: 0,

  SPOROPHYTE: 0, SHADOW: 0, DEW: 0,
};

const TAU = Math.PI * 2;
const STAGE_MAX = 8;          // PLANT_GREEN_THRESHOLD (constants.js) — Wachstum bis „reif" (grün)
const REF_W = 282, REF_H = 390;  // Referenz-Kartenbox (Prototyp box() @ zoom 1.3: 300*1.3=390, 390*104/144≈282)
const CARD_R = 12;            // Karten-Eckenradius (rounded-xl) — für den Composite-Clip
const M = 20;                 // Rand ums Moos-Bitmap (Überwuchs), in Referenz-px
const LDX = -0.55, LDY = -0.83; // Lichtrichtung (oben-links)

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

export function MossGrow({ growth = 0, panelRef, cardRef, reduced = false }) {
  const hostRef = useRef(null);
  const stateRef = useRef({ growth });
  stateRef.current = { growth };
  const syncRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    // Offscreen: Moos-Bitmap + Neon-Bloom-Aura, beide in Referenzgröße gecacht (nur bei Stufen-Wechsel neu).
    const moss = document.createElement("canvas"), mctx = moss.getContext("2d");
    const glow = document.createElement("canvas"), gctx = glow.getContext("2d");
    let W = 0, H = 0, DPR = 1, RDPR = 1;
    let cardX = 0, cardY = 0, cardW = 0, cardH = 0;
    let field = [], dewPts = [], neonTips = [];
    let _axc = 1, _axs = 0, _cNA = { r: 34, g: 224, b: 255 }, _cNB = { r: 255, g: 62, b: 165 };
    let renderedCov = -1, clockT = 0, last = 0, raf = 0, disposed = false, cleared = false, cardOpacity = 1;

    // ── Moos-Feld (fixe Referenzgröße, deterministisch seeded → einmal gebaut) ──
    (function buildField() {
      RDPR = Math.min(2, window.devicePixelRatio || 1);
      moss.width = Math.round((REF_W + 2 * M) * RDPR); moss.height = Math.round((REF_H + 2 * M) * RDPR);
      glow.width = moss.width; glow.height = moss.height;
      field = [];
      const step = 5 + (1 - TUNE.DENSITY) * 7;
      const maxInward = REF_W * (0.30 + 0.55 * TUNE.EDGE_BAND);
      const maxDown = REF_H * (0.80 + 0.80 * (1 - TUNE.TOP_BIAS));
      const rng = mulberry32(1337); let id = 0;
      for (let gy = step * 0.5; gy < REF_H; gy += step) for (let gx = step * 0.5; gx < REF_W; gx += step) {
        const x = gx + (rng() - 0.5) * step * 0.9, y = gy + (rng() - 0.5) * step * 0.9;
        if (x < 0 || x > REF_W || y < 0 || y > REF_H) continue;
        const dTop = y, dL = x, dR = REF_W - x, fromEdge = Math.min(dTop, dL, dR);
        let bi = Math.max(fromEdge / maxInward, dTop / maxDown);
        bi += TUNE.RAGGED * (fbm(x, y) - 0.5) * 0.7;                 // fransiger Rand
        const birthG = clamp01(bi); if (birthG > 1) continue;
        const wL = 1 / (dL + 6), wR = 1 / (dR + 6), leanX = Math.max(-1, Math.min(1, (wL - wR) * 6));
        const ang = Math.atan2(-1, leanX * 0.9 + (rng() - 0.5) * 0.2);
        const size = 0.6 + rng() * 0.8 + TUNE.CLUMP * (rng() * rng()) * 1.6, hue = rng();
        const wT = 1 / (dTop + 4), wLo = 1 / (dL + 4), wRo = 1 / (dR + 4), outAng = Math.atan2(-wT, wRo - wLo);
        const edgeOut = clamp01(1 - fromEdge / (step * 1.6)), tuftJit = (rng() - 0.5);
        field.push({ x, y, birthG, ang, size, hue, outAng, edgeOut, tuftJit, seed: (id++ * 2654435761) >>> 0 });
      }
    })();

    const cDark0 = { r: 0, g: 0, b: 0 };
    function drawTuftShadow(mx, t, mat, cDark) {
      let cd = cDark;
      if (TUNE.NEON_BASE >= 0.5 && TUNE.NEON_RIM > 0) {                                   // Base-Toggle: Schatten-Matte neon tönen
        const tA = clamp01(0.5 + ((t.x - REF_W / 2) * _axc + (t.y - REF_H / 2) * _axs) / (Math.max(REF_W, REF_H) * 0.62));
        cd = clampRGB(mix(cDark, clampRGB(mix(_cNA, _cNB, tA)), 0.4 * TUNE.NEON_RIM));
      }
      mx.fillStyle = rgba(cd, (0.30 + 0.35 * TUNE.SHADOW) * mat);
      mx.beginPath(); mx.ellipse(t.x, t.y + 1, t.size * 2.0 * mat, t.size * 1.5 * mat, 0, 0, TAU); mx.fill();
    }
    function drawTuftHairs(mx, t, mat, cMid, cTip, cTipHi) {
      const rng = mulberry32(t.seed), k = (t.hue - 0.5);
      const midT = clampRGB({ r: cMid.r + k * 34, g: cMid.g + k * 12 - Math.abs(k) * 10, b: cMid.b - k * 22 });
      const tipT = clampRGB({ r: cTip.r + k * 30, g: cTip.g + k * 8, b: cTip.b - k * 18 });
      const tiltRad = TUNE.TILT * Math.PI / 180, spreadRad = 0.2 + TUNE.SPREAD * 2.1, eo = t.edgeOut * TUNE.OVERHANG;
      const bx = t.x + Math.cos(t.outAng) * eo * 3.5 * mat, by = t.y + Math.sin(t.outAng) * eo * 3.5 * mat;
      const n = Math.max(2, Math.round(TUNE.FILA_PER * (0.45 + 0.55 * mat) * (0.6 + 0.7 * t.size)));
      const tAxis = clamp01(0.5 + ((t.x - REF_W / 2) * _axc + (t.y - REF_H / 2) * _axs) / (Math.max(REF_W, REF_H) * 0.62));
      const neon = clampRGB(mix(_cNA, _cNB, tAxis)), neonP = satBoost(neon, 0.45 + 0.9 * TUNE.NEON_PUNCH);
      const neonHot = clampRGB(mix(neonP, { r: 255, g: 255, b: 255 }, 0.35 + 0.25 * clamp01(TUNE.NEON_PUNCH)));
      for (let i = 0; i < n; i++) {
        const rr = rng();
        const len = TUNE.FILA_LEN * (0.45 + rr * 0.95) * (0.35 + 0.85 * mat) * (0.7 + 0.5 * t.size) * (1 + eo * 0.7);
        const am = t.ang + tiltRad + t.tuftJit * spreadRad * 0.6 + (rng() - 0.5) * spreadRad;
        const dirx = Math.cos(am), diry = Math.sin(am), x2 = bx + dirx * len, y2 = by + diry * len;
        const mpx = (bx + x2) / 2 + (rng() - 0.5) * len * 0.35, mpy = (by + y2) / 2 + (rng() - 0.5) * len * 0.25;
        const lightK = 0.66 + 0.5 * Math.max(0, dirx * LDX + diry * LDY), up = clamp01(Math.hypot(x2 - bx, y2 - by) / 10);
        let col = clampRGB(mix(midT, tipT, (0.25 + 0.7 * rng()) * (0.4 + 0.6 * mat)));
        col = clampRGB({ r: col.r * lightK * (0.85 + 0.3 * up), g: col.g * lightK * (0.85 + 0.3 * up), b: col.b * lightK * (0.85 + 0.3 * up) });
        const washU = TUNE.NEON_BASE >= 0.5 ? (0.70 + 0.20 * up) : (0.26 + 0.36 * up);   // Base-Toggle: Wash zieht auch nach unten
        if (TUNE.NEON_RIM > 0) { col = clampRGB(mix(col, neonP, TUNE.NEON_RIM * washU)); }  // Neon-Wash über den Halm
        mx.strokeStyle = rgba(col, 0.92); mx.lineWidth = TUNE.FILA_THICK * (0.6 + 0.7 * rng()); mx.lineCap = "round";
        mx.beginPath(); mx.moveTo(bx, by); mx.quadraticCurveTo(mpx, mpy, x2, y2); mx.stroke();
        if (TUNE.NEON_TIP > 0) {                                                          // additiver Neon-Saum an Spitze/Rand
          const rimI = clamp01(TUNE.NEON_TIP * (0.18 + 0.82 * up) * (0.5 + 0.7 * eo) * (0.55 + 0.45 * mat));
          if (rimI > 0.03) {
            mx.globalCompositeOperation = "lighter";
            mx.strokeStyle = rgba(neonP, rimI * (0.5 + 0.4 * TUNE.NEON_PUNCH)); mx.lineWidth = TUNE.FILA_THICK * (0.5 + 0.5 * rng());
            mx.beginPath(); mx.moveTo((bx + x2) * 0.5, (by + y2) * 0.5); mx.lineTo(x2, y2); mx.stroke();
            const pr = TUNE.FILA_THICK * (1.4 + 2.8 * TUNE.NEON_PUNCH) * (0.6 + 0.6 * rr);
            mx.fillStyle = rgba(neonP, rimI * 0.30 * (0.4 + TUNE.NEON_PUNCH)); mx.beginPath(); mx.arc(x2, y2, pr, 0, TAU); mx.fill();
            mx.fillStyle = rgba(neonP, rimI * 0.55); mx.beginPath(); mx.arc(x2, y2, pr * 0.5, 0, TAU); mx.fill();
            mx.fillStyle = rgba(neonHot, rimI * (0.7 + 0.3 * TUNE.NEON_PUNCH)); mx.beginPath(); mx.arc(x2, y2, TUNE.FILA_THICK * 0.6, 0, TAU); mx.fill();
            mx.globalCompositeOperation = "source-over";
            if (neonTips.length < 420 && rng() < 0.6) neonTips.push({ x: x2, y: y2, c: neonP, i: rimI });
          }
        }
        if (rng() < TUNE.TIP_LIGHT * 0.55) {
          mx.fillStyle = rgba(cTipHi, 0.6 * TUNE.TIP_LIGHT); mx.beginPath(); mx.arc(x2, y2, TUNE.FILA_THICK * 0.55, 0, TAU); mx.fill();
          if (TUNE.DEW > 0 && rng() < 0.12 && dewPts.length < 160) dewPts.push({ x: x2, y: y2, ph: rng() * TAU });
        }
      }
      if (TUNE.SPECK > 0) {                                                               // Samt-Körnung nahe Basis
        const sp = Math.round(TUNE.SPECK * 3);
        for (let s = 0; s < sp; s++) { const rx = t.x + (rng() - 0.5) * t.size * 3, ry = t.y + (rng() - 0.5) * t.size * 3;
          mx.fillStyle = rgba(clampRGB(mix(midT, cDark0, 0.4)), 0.5 * TUNE.SPECK * mat); mx.fillRect(rx, ry, 1, 1); }
      }
    }
    function drawSporophyte(mx, t, mat, cSpo) {
      const rng = mulberry32(t.seed ^ 0x9e3779b9); if (rng() >= TUNE.SPOROPHYTE * 0.05 * mat) return;
      const h = TUNE.FILA_LEN * (2.2 + rng() * 1.8) * mat, lean = (rng() - 0.5) * 0.5, tx = t.x + lean * h * 0.5, ty = t.y - h;
      mx.strokeStyle = rgba(clampRGB(mix(cSpo, { r: 210, g: 190, b: 120 }, 0.15)), 0.9); mx.lineWidth = Math.max(0.8, TUNE.FILA_THICK * 0.8); mx.lineCap = "round";
      mx.beginPath(); mx.moveTo(t.x, t.y); mx.quadraticCurveTo(t.x + lean * h * 0.3, t.y - h * 0.5, tx, ty); mx.stroke();
      mx.fillStyle = rgba(clampRGB(mix(cSpo, { r: 120, g: 70, b: 30 }, 0.2)), 0.95); mx.beginPath(); mx.ellipse(tx, ty, TUNE.FILA_THICK * 1.1, TUNE.FILA_THICK * 1.7, lean, 0, TAU); mx.fill();
      mx.fillStyle = rgba({ r: 240, g: 225, b: 170 }, 0.5); mx.beginPath(); mx.arc(tx - 0.6, ty - 0.8, TUNE.FILA_THICK * 0.5, 0, TAU); mx.fill();
    }

    // Moos-Bitmap für eine Abdeckung g rendern (in Referenzkoordinaten, um M versetzt). Nur bei Stufen-Wechsel.
    function renderMoss(g) {
      mctx.setTransform(RDPR, 0, 0, RDPR, M * RDPR, M * RDPR);
      mctx.clearRect(-M, -M, REF_W + 2 * M, REF_H + 2 * M);
      dewPts = []; neonTips = [];
      const nang = TUNE.NEON_ANGLE * Math.PI / 180; _axc = Math.cos(nang); _axs = Math.sin(nang);
      _cNA = hexRGB(TUNE.NEON_A); _cNB = hexRGB(TUNE.NEON_B);
      const cDark = hexRGB(TUNE.MOSS_DARK), cMid = hexRGB(TUNE.MOSS_MID), cTip = hexRGB(TUNE.MOSS_TIP), cSpo = hexRGB(TUNE.SPORO_COLOR);
      const cTipHi = clampRGB(mix(cTip, { r: 255, g: 255, b: 230 }, 0.55));
      let i, t, mat;
      for (i = 0; i < field.length; i++) { t = field[i]; mat = clamp01((g - t.birthG) / 0.22); if (mat <= 0) continue; drawTuftShadow(mctx, t, mat, cDark); }
      for (i = 0; i < field.length; i++) { t = field[i]; mat = clamp01((g - t.birthG) / 0.22); if (mat <= 0) continue; drawTuftHairs(mctx, t, mat, cMid, cTip, cTipHi); }
      if (TUNE.SPOROPHYTE > 0) for (i = 0; i < field.length; i++) { t = field[i]; mat = clamp01((g - t.birthG) / 0.22); if (mat < 0.4) continue; drawSporophyte(mctx, t, mat, cSpo); }
      // Bloom-Aura: weiche Neon-Puffs an den gesammelten Spitzen (gecacht, per-Frame nur drawImage)
      gctx.setTransform(RDPR, 0, 0, RDPR, M * RDPR, M * RDPR); gctx.clearRect(-M, -M, REF_W + 2 * M, REF_H + 2 * M);
      if (TUNE.NEON_BLOOM > 0 && neonTips.length) {
        gctx.globalCompositeOperation = "lighter"; const gr = Math.max(6, TUNE.FILA_LEN * 2.4);
        for (i = 0; i < neonTips.length; i++) { const np = neonTips[i], rad = gr * (0.6 + 0.9 * np.i);
          const rgd = gctx.createRadialGradient(np.x, np.y, 0, np.x, np.y, rad);
          rgd.addColorStop(0, rgba(np.c, 0.55 * np.i)); rgd.addColorStop(0.5, rgba(np.c, 0.18 * np.i)); rgd.addColorStop(1, rgba(np.c, 0));
          gctx.fillStyle = rgd; gctx.beginPath(); gctx.arc(np.x, np.y, rad, 0, TAU); gctx.fill();
        }
        gctx.globalCompositeOperation = "source-over";
      }
      renderedCov = g;
    }

    function measure() {
      const pr = panelRef?.current?.getBoundingClientRect();
      const cardEl = cardRef?.current;
      const cr = cardEl?.getBoundingClientRect();
      if (!pr || !cr || pr.width < 2 || cr.width < 8) return false;
      DPR = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(pr.width)), h = Math.max(1, Math.round(pr.height));
      if (w !== W || h !== H) { W = w; H = h; canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); }
      cardX = cr.left - pr.left; cardY = cr.top - pr.top; cardW = cr.width; cardH = cr.height;
      // #pflanze-fix: Deckkraft der Karte mitlesen → das Moos blendet SYNCHRON mit ihr aus (Wegflug bei Niederlage
      // = as-flyaway fadet opacity→0). Ohne das floh das voll-opake Moos als „komischer Rahmen" davon.
      cardOpacity = cardEl ? clamp01(parseFloat(getComputedStyle(cardEl).opacity) || 0) : 1;
      const ccx = cardX + cardW / 2, ccy = cardY + cardH / 2;   // Karte weggeflogen/außerhalb → Effekt nicht hängen lassen
      if (ccx < -cardW || ccx > W + cardW || ccy < -cardH || ccy > H + cardH) return false;
      return true;
    }
    function clear() { if (cleared) return; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); cleared = true; }

    // Composite: Moos-Bitmap proportional auf die Kartenbox blitten, auf leicht erweitertes RoundRect geclippt.
    function compose() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H); cleared = false;
      const sx = cardW / REF_W, sy = cardH / REF_H;                 // Referenz → echte Kartengröße
      const mLeft = M * sx, mTop = M * sy;                          // skalierter Überwuchs-Rand
      const growX = M * TUNE.OVERHANG * sx, growY = M * TUNE.OVERHANG * sy;
      const grow = Math.min(growX, growY);
      const op = cardOpacity;                                      // #pflanze-fix: Moos folgt der Karten-Deckkraft (Wegflug-Fade)
      ctx.save();
      roundRectPath(ctx, cardX - growX, cardY - growY, cardW + 2 * growX, cardH + 2 * growY, CARD_R + grow); ctx.clip();
      ctx.globalAlpha = op;
      ctx.drawImage(moss, 0, 0, moss.width, moss.height, cardX - mLeft, cardY - mTop, cardW + 2 * mLeft, cardH + 2 * mTop);
      if (TUNE.NEON_BLOOM > 0) {
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = clamp01(TUNE.NEON_BLOOM) * op;
        ctx.drawImage(glow, 0, 0, glow.width, glow.height, cardX - mLeft, cardY - mTop, cardW + 2 * mLeft, cardH + 2 * mTop);
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      }
      if (TUNE.DEW > 0 && !reduced) {                               // Tau-Glitzern (live über dem Moos)
        ctx.globalCompositeOperation = "lighter";
        for (let d = 0; d < dewPts.length; d++) { const dp = dewPts[d], tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(clockT * 0.004 + dp.ph));
          ctx.fillStyle = rgba({ r: 225, g: 245, b: 210 }, 0.5 * TUNE.DEW * tw * op); ctx.beginPath(); ctx.arc(cardX + dp.x * sx, cardY + dp.y * sy, 0.9 * sx, 0, TAU); ctx.fill(); }
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Das Moos-BITMAP ist statisch gecacht (nur bei Stufen-Wechsel neu gerendert). Der COMPOSITE-Blit läuft aber
    // per-Frame, damit das Moos der (animierten) Karte folgt — Deal-in, Wegflug bei Sieg/Niederlage. Pro Frame nur
    // measure + clear + 2× drawImage (gecachte Bitmaps) → günstig, analog NeonSilk.
    function frame(now) {
      if (disposed) return;
      clockT += Math.min(50, now - last); last = now;
      const stage = clamp(Math.round(stateRef.current.growth || 0), 0, STAGE_MAX);
      const cov = (stage / STAGE_MAX) * TUNE.REIF_COV;              // Reifestufe × Reife-Abdeckung → tatsächliche Moos-Abdeckung
      if (cov <= 0 || !measure()) { clear(); raf = 0; return; }     // kein Wachstum / Karte weg → rAF anhalten
      if (Math.abs(cov - renderedCov) > 0.004) renderMoss(cov);     // Bitmap nur bei Stufen-Wechsel neu bauen
      compose();
      raf = requestAnimationFrame(frame);
    }

    // Startet/stoppt den rAF anhand Wachstum & Tab-Sichtbarkeit (analog NeonSilk → kein Leerlauf).
    function ensureRun() {
      if (disposed) return;
      const run = (stateRef.current.growth || 0) > 0 && document.visibilityState !== "hidden";
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

  // Wachstums-Wechsel (0 ↔ >0, oder Stufe) startet/rendert neu, ohne die Canvas neu zu bauen.
  useEffect(() => { syncRef.current?.(); }, [growth]);

  // z-11 wie IonStorm, wird aber als SPÄTERER DOM-Knoten gemountet → Moos liegt ÜBER der Karte (z-10) UND über dem
  // IonStorm-Blitzrahmen (gleiches z, späterer Knoten gewinnt). User-Vorgabe: „Blitz unter Moos, Moos oben drüber".
  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11 }} />;
}

export default MossGrow;
