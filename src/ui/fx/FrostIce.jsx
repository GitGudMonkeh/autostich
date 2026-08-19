import { useEffect, useRef } from "react";
import { dprCap, frameMinMs } from "./mobileTier.js"; // #perf-mobile: Auflösungs-/Zeichenrate-Deckel (eine Wahrheit)
import { mixRGB, clampRGB, satBoost, mulberry32, roundRectPath, fbm, clamp, clamp01 } from "./fxMath.js"; // #fx-helfer: geteilte Mathe-/Canvas-Helfer
import { createStageBlend } from "./stageBlend.js"; // #382 akkretives Stufen-Blenden (eine Wahrheit mit dem Moos)

/* Archetyp-Karteneffekt „Eis" als Neon-Kristall-Frost — Vereisung der eigenen Karte mit der Gletscher-Masse.
   Von UNTEN & den beiden SEITEN wächst kantiger Neon-Frost nach innen/oben zu (Akkretion: bestehende Kristalle bleiben,
   neue kommen dazu). Zwei gegenüberliegende Neon-Bühnenlichter (A↔B, Achse = NEON_ANGLE) strahlen den Frost an:
   glühende Wireframe-Kanten, milchige Glasur, Rime-Körnung, weiche Bloom-Aura. Renderer + TUNE 1:1 aus dem Kombi-
   Tuning-Board (docs/prototypes/moos-eis-combo.html); die Werte sind vom User abgesegnet.

   #flip-fix (2026-08-12): Das Eis hängt jetzt als KIND der Kartenvorderseite (im Flip-Front-Face), NICHT mehr als flache
   Panel-Overlay-Canvas → es flippt/dealt/fliegt mit der Karte mit (CSS-Transform-Vererbung), statt den 3D-Flip flach zu
   verdecken; `backface-visibility` des Front-Face blendet es in der Rückseiten-Hälfte korrekt aus. Es liegt UNTER dem
   Moos (Eis z-1, Moos z-2 im selben Karten-Wrapper). Kein Positions-Tracking/Opacity-Spiegeln/Flip-Verstecken mehr nötig.

   ANIMIERT: Funkeln (SPARKLE) + Stufe-3-Puls (SHIMMER) laufen live → der rAF läuft, während Masse > 0 (außer reduced,
   dann statisch, einmal gezeichnet). Das Frost-BITMAP ist MODUL-WEIT je Front-Stufe gecacht (≤ 1× pro Stufe/Session)
   → kein renderFrost-Hänger mehr auf dem Flip-/Deal-Frame.

   BEWUSST Canvas-2D (kein Pixi-Custom-Shader): Pixis Mesh/Filter-Shader rendern auf dem Mobile-Setup NICHT.
   GRÖSSEN-UNABHÄNGIG: Frost-Bitmap in Referenzgröße (REF_W×REF_H) gerendert, proportional auf die Karte geblittet,
   STRIKT aufs exakte Karten-RoundRect geclippt (kein Überstand, anders als Moos). */

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
// #382: Blenddauer/Kurve wohnen in stageBlend.js (geteilt mit dem Moos) — hier gibt es keinen zweiten Wert mehr.
const REF_W = 282, REF_H = 390;  // Referenz-Kartenbox (Prototyp box() @ zoom 1.3), identisch zu MossGrow
const CARD_R = 12;               // Karten-Eckenradius (rounded-xl) — für den strikten Composite-Clip
const M = 20;                    // Rand ums Frost-Bitmap, in Referenz-px (wird beim Clip weggeschnitten → kein Überstand)

function hexRGB(h) { let s = String(h || "#4f78c8").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
const rgba = (c, a) => "rgba(" + (c.r | 0) + "," + (c.g | 0) + "," + (c.b | 0) + "," + a + ")";

const stageOf = (m) => { let s = 0; for (let i = 0; i < THRESHOLDS.length; i++) if (m >= THRESHOLDS[i]) s++; return s; };
const frontOf = (m) => { if (m <= 0) return 0; const s = stageOf(m); if (s === 0) return TUNE.COVER * TUNE.BASE_FREEZE; return TUNE.COVER * (THRESHOLDS[s - 1] / MASS_MAX); };

// ── Frost-Feld + Funkel-Punkte (fixe Referenzgröße, deterministisch → einmal je Session, RDPR-unabhängig) ──
let _field = null, _sparks = null;
function getField() {
  if (_field) return { field: _field, sparks: _sparks };
  const field = [], sparks = [];
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
  _field = field; _sparks = sparks; return { field, sparks };
}

// ── Frost-Bitmap je Front-Stufe: MODUL-WEIT gecacht (renderFrostBitmap ≤ einmal pro Stufe/Session) ──
const _bmpCache = new Map();  // key `${RDPR}:${frontKey}:${nA}:${nB}` → { frost, glow }
function getFrostBitmap(front, nA, nB) {
  const RDPR = dprCap();
  const key = RDPR + ":" + Math.round(front * 1000) + ":" + nA + ":" + nB;   // Farbmodus (Standard/Deckfarbe) im Key
  let e = _bmpCache.get(key);
  if (e) return e;
  e = renderFrostBitmap(front, getField().field, RDPR, nA, nB);
  _bmpCache.set(key, e);
  return e;
}

/* #372 Prewarm — Frost-Feld + Voll-Stufen-Bitmap im LEERLAUF aufbauen, BEVOR die erste vereiste Karte kommt → das teure
   Erst-Zeichnen hängt dann nicht mehr synchron auf dem Deal-Frame. Wärmt den modul-weiten Cache (getField + getFrostBitmap
   für die volle Frost-Stufe). Standard-Palette immer; Deckfarben zusätzlich im Deckfarbe-Modus. Rein Cache-füllend. */
export function prewarmFrost({ deckTint = false, deckColor = null, deckColor2 = null } = {}) {
  try {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    getField();
    const front = frontOf(MASS_MAX); // volle Vereisung
    getFrostBitmap(front, TUNE.NEON_A, TUNE.NEON_B);                                   // Standard-Palette
    if (deckTint && deckColor) getFrostBitmap(front, deckColor, deckColor2 || deckColor); // Deckfarbe-Modus
  } catch { /* Prewarm ist nie kritisch */ }
}

/* #382 ALLE Front-Stufen vorwärmen — als Liste einzelner Aufgaben (Begründung wie bei mossPrewarmTasks: die
   Skill-Effekt-Bühne der Deck-Werkstatt spielt die Vereisung in Sekunden durch; ein Erst-Aufbau mitten in der
   Blende ist genau der Ruckler, den die Blende beseitigen soll). Der Aufrufer verteilt sie auf Idle-Slots. */
export function frostPrewarmTasks({ deckTint = false, deckColor = null, deckColor2 = null } = {}) {
  // Genau EINE Palette — die gezeigte (Begründung wie beim Moos: jedes Bitmap kostet Speicher).
  const [a, b] = deckTint && deckColor ? [deckColor, deckColor2 || deckColor] : [TUNE.NEON_A, TUNE.NEON_B];
  const fronts = [1, ...THRESHOLDS].map(frontOf);   // Grundvereisung + je Schwelle eine Stufe (0..3)
  const tasks = [() => getField()];
  for (const f of fronts) tasks.push(() => getFrostBitmap(f, a, b));
  return tasks;
}

// nA/nB = Neon-Bühnenlicht-Farben: Standard-Palette (TUNE.NEON_A/B) ODER die Deckfarben (Deckfarbe-Modus).
function renderFrostBitmap(front, field, RDPR, nA, nB) {
  const frost = document.createElement("canvas"), fx = frost.getContext("2d");
  const glow = document.createElement("canvas"), gx = glow.getContext("2d");
  frost.width = Math.round((REF_W + 2 * M) * RDPR); frost.height = Math.round((REF_H + 2 * M) * RDPR);
  glow.width = frost.width; glow.height = frost.height;

  const nang = TUNE.NEON_ANGLE * Math.PI / 180, axc = Math.cos(nang), axs = Math.sin(nang);
  const cNA = hexRGB(nA), cNB = hexRGB(nB);
  const cDark = hexRGB(TUNE.ICE_DARK), cMid = hexRGB(TUNE.ICE_MID), cEdge = hexRGB(TUNE.ICE_EDGE);
  const neonTips = [];

  function drawShard(g, t, mat) {
    const rng = mulberry32(t.seed);
    const tAxis = clamp01(0.5 + ((t.x - REF_W / 2) * axc + (t.y - REF_H / 2) * axs) / (Math.max(REF_W, REF_H) * 0.62));
    const neon = clampRGB(mixRGB(cNA, cNB, tAxis)), neonP = satBoost(neon, 0.45 + 0.9 * TUNE.NEON_PUNCH);
    const neonHot = clampRGB(mixRGB(neonP, { r: 255, g: 255, b: 255 }, 0.4 + 0.3 * clamp01(TUNE.NEON_PUNCH)));
    const len = TUNE.SHARD_LEN * (0.45 + 0.75 * t.size) * (0.4 + 0.6 * mat), wid = len * TUNE.SHARD_WIDTH * (0.42 + 0.5 * rng());
    const ja = (rng() - 0.5) * 1.5, ca = Math.cos(ja), sa = Math.sin(ja);
    const dx = t.gdx * ca - t.gdy * sa, dy = t.gdx * sa + t.gdy * ca, px = -dy, py = dx;
    const tipx = t.x + dx * len, tipy = t.y + dy * len, bx0 = t.x - dx * len * 0.32, by0 = t.y - dy * len * 0.32;
    const lx = t.x + px * wid, ly = t.y + py * wid, rx = t.x - px * wid, ry = t.y - py * wid;
    let bodyBase = clampRGB(mixRGB(cDark, cMid, 0.35 + 0.4 * mat)), bodyTip = clampRGB(mixRGB(cMid, cEdge, 0.4 + 0.5 * mat));
    const washV = TUNE.NEON_BASE >= 0.5 ? TUNE.NEON_RIM * 0.55 : TUNE.NEON_RIM * 0.16;
    bodyBase = clampRGB(mixRGB(bodyBase, neonP, washV)); bodyTip = clampRGB(mixRGB(bodyTip, neonP, washV * 0.7));
    const grd = g.createLinearGradient(bx0, by0, tipx, tipy);
    grd.addColorStop(0, rgba(bodyBase, 0.80 * mat)); grd.addColorStop(1, rgba(bodyTip, 0.9 * mat)); g.fillStyle = grd;
    g.beginPath(); g.moveTo(bx0, by0); g.lineTo(lx, ly); g.lineTo(tipx, tipy); g.lineTo(rx, ry); g.closePath(); g.fill();
    if (TUNE.FACET > 0) {
      g.fillStyle = rgba(clampRGB(mixRGB(bodyBase, { r: 0, g: 0, b: 0 }, 0.35 * TUNE.FACET)), 0.5 * mat * TUNE.FACET);
      g.beginPath(); g.moveTo(bx0, by0); g.lineTo(lx, ly); g.lineTo(tipx, tipy); g.closePath(); g.fill();
      g.fillStyle = rgba(clampRGB(mixRGB(bodyTip, { r: 255, g: 255, b: 255 }, 0.30 * TUNE.FACET)), 0.35 * mat * TUNE.FACET);
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
  function drawHex(g) {
    if (TUNE.HEX <= 0) return;
    const R = 8.5, hw = R * Math.sqrt(3), vh = R * 1.5;
    const maxUp = REF_H * (0.22 + 0.72 * TUNE.BOTTOM_BIAS), maxIn = REF_W * (0.14 + 0.52 * TUNE.SIDE_BAND);
    g.globalCompositeOperation = "lighter"; g.lineWidth = 0.7; let row = 0;
    for (let cy = vh * 0.5; cy < REF_H + R; cy += vh) {
      const xoff = (row & 1) ? hw * 0.5 : 0;
      for (let cx = xoff + hw * 0.5; cx < REF_W + R; cx += hw) {
        const dBot = REF_H - cy, dL = cx, dR = REF_W - cx, bi = Math.min(dBot / maxUp, dL / maxIn, dR / maxIn);
        const covv = clamp01((front - clamp01(bi)) / 0.16); if (covv <= 0.02) continue;
        const tAxis = clamp01(0.5 + ((cx - REF_W / 2) * axc + (cy - REF_H / 2) * axs) / (Math.max(REF_W, REF_H) * 0.62));
        const neon = satBoost(clampRGB(mixRGB(cNA, cNB, tAxis)), 0.3 + 0.6 * TUNE.NEON_PUNCH);
        g.strokeStyle = rgba(neon, TUNE.HEX * covv * 0.34); g.beginPath();
        for (let s = 0; s < 6; s++) { const a = Math.PI / 6 + s * Math.PI / 3, hx = cx + Math.cos(a) * R, hy = cy + Math.sin(a) * R; if (s === 0) g.moveTo(hx, hy); else g.lineTo(hx, hy); }
        g.closePath(); g.stroke();
      }
      row++;
    }
    g.globalCompositeOperation = "source-over";
  }

  fx.setTransform(RDPR, 0, 0, RDPR, M * RDPR, M * RDPR); fx.clearRect(-M, -M, REF_W + 2 * M, REF_H + 2 * M);
  let i, t, mat;
  if (TUNE.GLAZE > 0) {                                     // milchige Glasur (radiale Puffs)
    for (i = 0; i < field.length; i++) { t = field[i]; mat = clamp01((front - t.birthF) / 0.14); if (mat <= 0) continue;
      const tAxis = clamp01(0.5 + ((t.x - REF_W / 2) * axc + (t.y - REF_H / 2) * axs) / (Math.max(REF_W, REF_H) * 0.62));
      const gcol = clampRGB(mixRGB(clampRGB(mixRGB(cDark, cMid, 0.5)), clampRGB(mixRGB(cNA, cNB, tAxis)), TUNE.NEON_BASE >= 0.5 ? 0.4 * TUNE.NEON_RIM : 0.12 * TUNE.NEON_RIM));
      const rad = t.size * 7 * (0.6 + 0.6 * mat), rg = fx.createRadialGradient(t.x, t.y, 0, t.x, t.y, rad);
      rg.addColorStop(0, rgba(gcol, 0.22 * TUNE.GLAZE * mat)); rg.addColorStop(1, rgba(gcol, 0)); fx.fillStyle = rg; fx.beginPath(); fx.arc(t.x, t.y, rad, 0, TAU); fx.fill();
    }
  }
  drawHex(fx);
  for (i = 0; i < field.length; i++) { t = field[i]; mat = clamp01((front - t.birthF) / 0.14); if (mat <= 0) continue; drawShard(fx, t, mat); }
  if (TUNE.DENDRITE > 0) {                                  // Vektor-Dendriten (Frost-Farne)
    const dr = mulberry32(777);
    for (i = 0; i < field.length; i++) { t = field[i]; mat = clamp01((front - t.birthF) / 0.14);
      if (mat < 0.6 || t.edgeProx < 0.25) continue; if (dr() > TUNE.DENDRITE * 0.5) continue;
      const ang = Math.atan2(t.gdy, t.gdx) + (dr() - 0.5) * 0.5, dlen = TUNE.SHARD_LEN * 1.1 * TUNE.DEND_LEN * (0.7 + 0.6 * dr());
      const tAxis = clamp01(0.5 + ((t.x - REF_W / 2) * axc + (t.y - REF_H / 2) * axs) / (Math.max(REF_W, REF_H) * 0.62));
      const dcol = clampRGB(mixRGB(satBoost(clampRGB(mixRGB(cNA, cNB, tAxis)), 0.5), { r: 220, g: 250, b: 255 }, 0.25));
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
  // Bloom-Aura an den gesammelten Neon-Spitzen
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
  return { frost, glow };
}

/* FrostIce — KIND der Kartenvorderseite, UNTER dem Moos (z-1). Blittet das (gecachte) Frost-Bitmap strikt aufs
   Karten-RoundRect; Funkeln/Puls laufen live per rAF (statisch bei reduced). Karten-Bewegungen erledigt CSS. */
export function FrostIce({ mass = 0, reduced = false, deckTint = false, deckColor = null, deckColor2 = null, active = true }) {
  const hostRef = useRef(null);
  // Farbmodus: Standard = feste Neon-Palette; Deckfarbe = deckColor→deckColor2 als Bühnenlicht.
  const nA = deckTint && deckColor ? deckColor : TUNE.NEON_A;
  const nB = deckTint && deckColor ? (deckColor2 || deckColor) : TUNE.NEON_B;
  const stateRef = useRef({ mass, reduced, nA, nB, active });
  stateRef.current = { mass, reduced, nA, nB, active };
  const syncRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let cw = 0, ch = 0, DPR = 1, clockT = 0, last = 0, raf = 0, disposed = false;
    // #382 Stufen-Blende (Front-Anteile als Stufen-Schlüssel) — ersetzt den alten Kreuz-Fade, siehe stageBlend.js.
    const blend = createStageBlend();

    function size() {
      const w = host.clientWidth, h = host.clientHeight;
      if (w < 4 || h < 4) return false;
      DPR = dprCap();
      if (w !== cw || h !== ch) { cw = w; ch = h; canvas.width = Math.round(cw * DPR); canvas.height = Math.round(ch * DPR); }
      return true;
    }

    /* Ein Front-Stufen-Bitmap (Frost + additiver Bloom) mit Gewicht strikt in die geclippte Kartenbox blitten.
       #382: BEIDE Ebenen additiv (`lighter`). Die Fläche ist frisch gelöscht, die Gewichte addieren sich zu 1 →
       das Ergebnis ist die exakte Interpolation der Stufen; bestehender Frost bleibt beim Wechsel konstant
       (mit `source-over` sackte er in der Mitte der Blende sichtbar weg). Einzelne Ebene mit w=1 = wie vorher. */
    function blitFront(front, w, pulse, mLeft, mTop) {
      const { frost, glow } = getFrostBitmap(front, stateRef.current.nA, stateRef.current.nB);
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = w;
      ctx.drawImage(frost, 0, 0, frost.width, frost.height, -mLeft, -mTop, cw + 2 * mLeft, ch + 2 * mTop);
      if (TUNE.NEON_BLOOM > 0) {
        ctx.globalAlpha = w * clamp01(TUNE.NEON_BLOOM * pulse);
        ctx.drawImage(glow, 0, 0, glow.width, glow.height, -mLeft, -mTop, cw + 2 * mLeft, ch + 2 * mTop);
      }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    }

    function compose() {
      const mass = clamp(stateRef.current.mass || 0, 0, MASS_MAX);
      // #382 Die sichtbaren Ebenen kommen aus der Blende, NICHT aus der Masse — sonst schnitte ein Rückfall auf 0
      //   (Gletscher-Ausbruch) die Blende ab und der Frost verschwände schlagartig statt abzuschmelzen.
      const layers = blend.weights(performance.now()).filter((l) => l.stage > 0 && l.w > 0.002);
      if (!layers.length || !size()) { canvas.style.display = "none"; return; }
      canvas.style.display = "block";
      const sx = cw / REF_W, sy = ch / REF_H, mLeft = M * sx, mTop = M * sy;
      const anim = !stateRef.current.reduced;
      const pulse = (anim && TUNE.SHIMMER > 0 && stageOf(mass) >= 3) ? 1 + TUNE.SHIMMER * 0.35 * Math.sin(clockT * 0.004) : 1;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      roundRectPath(ctx, 0, 0, cw, ch, CARD_R); ctx.clip();                     // STRIKT: exaktes Karten-RoundRect
      for (let i = 0; i < layers.length; i++) blitFront(layers[i].stage, layers[i].w, pulse, mLeft, mTop);
      if (anim && TUNE.SPARKLE > 0) {                                           // Funkeln (live über dem Frost)
        ctx.globalCompositeOperation = "lighter"; const { sparks } = getField();
        for (let s = 0; s < sparks.length; s++) { const sp = sparks[s];
          // #382 Ein Funken gehört zu allen Ebenen, deren Front ihn schon geboren hat → er blendet mit ihnen auf/ab.
          let born = 0; for (let i = 0; i < layers.length; i++) if (layers[i].stage > sp.birthF) born += layers[i].w;
          if (born <= 0.002) continue;
          const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(clockT * 0.005 + sp.ph));
          ctx.fillStyle = rgba({ r: 210, g: 240, b: 255 }, 0.6 * TUNE.SPARKLE * tw * born);
          ctx.beginPath(); ctx.arc(sp.x * sx, sp.y * sy, (0.9 + 0.7 * tw) * sx, 0, TAU); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = 1; ctx.restore();
    }

    const MIN_MS = frameMinMs(); let lastDraw = -1e9;
    function frame(now) {
      if (disposed) return;
      clockT += Math.min(50, now - last); last = now;
      // #perf-mobile: auf dem Handy nur ~30 Zeichnungen/s. clockT läuft in Echtzeit weiter → Funkeln/Puls bleiben
      //   tempo-korrekt. Der Ausstieg unten zeichnet bewusst noch einmal (Standbild), darum dort lastDraw zurücksetzen.
      if (now - lastDraw < MIN_MS) { raf = requestAnimationFrame(frame); return; }
      lastDraw = now;
      const mass = clamp(stateRef.current.mass || 0, 0, MASS_MAX);
      // #perf-overlay-2: `active` false = Brett von einem Vollbild-Overlay verdeckt (Architekt/Perk/Skill/Formation).
      //   Wie „reduced": einmal statisch zeichnen, rAF anhalten. Der Architekt allein sind 13 von 50 Runden.
      // #382 Eine laufende Blende hält den rAF am Leben, auch bei Masse 0 (Ausbruch schmilzt aus statt zu poppen).
      if ((mass <= 0 && !blend.active) || stateRef.current.reduced || stateRef.current.active === false || document.visibilityState === "hidden") {
        if (blend.active) blend.set(blend.target);   // verdeckt/reduziert → Blende sofort abschließen, nicht einfrieren
        lastDraw = -1e9; compose(); raf = 0; return; // statisch/aus → rAF anhalten
      }
      compose();
      raf = requestAnimationFrame(frame);
    }

    // Startet den rAF (animiert Funkeln/Puls), solange Masse > 0 & nicht reduced & Tab sichtbar; sonst einmal statisch.
    function ensureRun() {
      if (disposed) return;
      const mass = clamp(stateRef.current.mass || 0, 0, MASS_MAX);
      const front = frontOf(mass);
      const anim = !stateRef.current.reduced && stateRef.current.active !== false && document.visibilityState !== "hidden";
      // #382 Front-Stufen-Wechsel → weich auf die neue Stufe blenden (auch auf 0: der Ausbruch schmilzt ab).
      //   Ohne Animation (reduced/verdeckt/Tab weg) hart setzen — Barrierefreiheit/Mobile bleiben wie bisher.
      if (anim) blend.to(front, performance.now()); else blend.set(front);
      const run = (mass > 0 || blend.active) && anim;
      if (run) { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
      else { if (raf) { cancelAnimationFrame(raf); raf = 0; } compose(); }   // reduced/aus → einmal statisch zeichnen
    }
    syncRef.current = ensureRun;
    const onVis = () => ensureRun();
    document.addEventListener("visibilitychange", onVis);
    let ro = null;
    try { ro = new ResizeObserver(() => { if (!raf) compose(); }); ro.observe(host); } catch { /* ignore */ }
    ensureRun();

    return () => {
      disposed = true; document.removeEventListener("visibilitychange", onVis);
      if (ro) ro.disconnect(); if (raf) cancelAnimationFrame(raf); try { host.removeChild(canvas); } catch { /* ignore */ }
    };
     
  }, []);

  useEffect(() => { syncRef.current?.(); }, [mass, reduced, nA, nB, active]);

  // z-1 = AUF der Karte, aber UNTER dem Moos (z-2) im selben Karten-Wrapper. Blitz (Panel-IonStorm) liegt darüber (ok).
  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }} />;
}

export default FrostIce;
