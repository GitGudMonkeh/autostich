import { useEffect, useRef } from "react";

/* #364 Eigenständiger Archetyp-Feld-Effekt „Eis" — ein Neon-KRISTALL-FELD im Battlefield-Hintergrund (UNTERSTE
   Effekt-Ebene, direkt über dem BF-Bild; alle anderen Effekte + Karten liegen darüber). Nur bei aktivem Eis-Deck.

   Zwei Kristall-Cluster wachsen aus der unteren LINKEN und RECHTEN Ecke nach oben & leicht zur Mitte. Wachstum =
   Gletscher-Siege: ein MONOTONER Zähler `count` (pro Lauf, +1 je Gletscher-Sieg). Innerhalb eines 10er-Zyklus wachsen
   die Kristalle (Akkretion, weich hochwachsend statt aufpoppen); überquert `count` eine 10er-Grenze, BERSTEN sie
   (Neon-Splitter fliegen nach außen/oben, verglühen; das statische Feld fadet glatt aus) → danach leer, neuer Zyklus.

   Renderer + TUNE 1:1 aus dem abgesegneten Tuning-Board (docs/prototypes/eis-kristall-feld-tuning.html). Optik = DNA des
   Karten-Frosts (FrostIce.jsx: kantige Neon-Scherben, zwei Bühnenlichter A↔B, Facetten-Schliff) — aber GRÖSSER und mit
   HOLOGRID-Kanten (helle Wireframe-Umrisse + interne Triangulation). BEWUSST Canvas-2D (kein Pixi-Custom-Shader — der
   rendert auf dem Mobile-Setup nicht; wie Aurora/FrostIce).

   PERF: Die abgesegneten TUNE-Werte haben KEINE Dauer-Details (HOLO_FLICK/SPARKLE/SHIMMER/RIME/GLAZE = 0) → das ruhende
   Feld ist vollständig STATISCH. Der rAF läuft daher NUR, solange etwas animiert (Wachs-Übergang bzw. Bersten); danach
   wird einmal statisch gezeichnet und der rAF angehalten (wie FrostIce). Auf `lite` (mobil) wird die Kristall-Dichte
   reduziert (billiger Wachs-Übergang). */

const TAU = Math.PI * 2;
const WINS_MAX = 10;   // Gletscher-Siege je Zyklus bis zum Bersten

// ── Abgesegnete TUNE-Werte (Tuning-Board, „sehr sehr geil") ──────────────────────
const TUNE = {
  ICE_DARK: "#141d47", ICE_MID: "#4f78c8", ICE_EDGE: "#cfeeff",
  NEON_A: "#22e0ff", NEON_B: "#a13cff", NEON_ANGLE: 90, NEON_RIM: 0.16, NEON_TIP: 0.28, NEON_PUNCH: 0.68, NEON_BLOOM: 0.36, NEON_BASE: 1,
  HOLO_EDGE: 0.76, HOLO_GRID: 0.8, HOLO_FLICK: 0,
  ANCHOR_X: 0.01, ANCHOR_Y: 1.09, CENTER_PULL: 0.58, SPREAD: 127, REACH: 0.49, RISE: 1.15, DENSITY: 0.52, CLUMP: 0.9, RAGGED: 0.94, GROW_BAND: 0.04, GROW_MS: 230,
  SHARD_LEN: 32, SHARD_WIDTH: 0.64, FACET: 0.54, GLAZE: 0,
  RIME: 0, SPARKLE: 0, SHIMMER: 0,
  BURST_SPEED: 3.4, BURST_SPREAD: 0.86, BURST_GRAV: 3, BURST_LIFE: 1370, BURST_SPIN: 0.12, BURST_FLASH: 1.5,
};

// ── deterministische Helfer (1:1 aus dem Board) ──────────────────────────────────
function hexRGB(h) { h = String(h || "#4f78c8").replace("#", ""); if (h.length === 3) h = h.replace(/(.)/g, "$1$1"); const n = parseInt(h, 16) || 0; return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
const rgba = (c, a) => "rgba(" + (c.r | 0) + "," + (c.g | 0) + "," + (c.b | 0) + "," + a + ")";
const mix = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
const clampRGB = (c) => ({ r: Math.max(0, Math.min(255, c.r)), g: Math.max(0, Math.min(255, c.g)), b: Math.max(0, Math.min(255, c.b)) });
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const satBoost = (c, s) => { const L = 0.30 * c.r + 0.59 * c.g + 0.11 * c.b; return clampRGB({ r: L + (c.r - L) * (1 + s), g: L + (c.g - L) * (1 + s), b: L + (c.b - L) * (1 + s) }); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng2 = (s) => mulberry32(s ^ 0xabcdef)();
function vhash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function fbm(x, y) { return vhash(x * 0.05, y * 0.05) * 0.6 + vhash(x * 0.13, y * 0.13) * 0.28 + vhash(x * 0.31, y * 0.31) * 0.12; }

// Feld: zwei Cluster-Fächer aus den unteren Ecken. birthF = radiale Distanz/Reichweite (nah = früh, fern = spät).
function buildField(CSSW, CSSH, scale, densityMul) {
  const field = [], anchors = [];
  const reach = Math.min(CSSW, CSSH) * TUNE.REACH * scale;
  const sl = TUNE.SHARD_LEN * scale;
  [-1, +1].forEach((sign) => {
    const ax = sign < 0 ? CSSW * TUNE.ANCHOR_X : CSSW * (1 - TUNE.ANCHOR_X);
    const ay = CSSH * TUNE.ANCHOR_Y;
    anchors.push({ x: ax, y: ay, sign });
    let bdx = -sign * TUNE.CENTER_PULL, bdy = -1;           // nach oben + zur Mitte
    const bl = Math.hypot(bdx, bdy) || 1; bdx /= bl; bdy /= bl;
    const baseAng = Math.atan2(bdy, bdx);
    const spread = TUNE.SPREAD * Math.PI / 180;
    const n = Math.round(TUNE.DENSITY * densityMul * (reach * reach) / (120 * scale * scale));
    const rng = mulberry32(sign < 0 ? 0x51ce01 : 0x51ce02);
    for (let i = 0; i < n; i++) {
      const rr = Math.sqrt(rng()) * reach;
      const ang = baseAng + (rng() - 0.5) * spread;
      const dirx = Math.cos(ang), diry = Math.sin(ang);
      const x = ax + dirx * rr;
      const y = ay + diry * rr * TUNE.RISE;                 // vertikale Streckung
      if (x < -sl || x > CSSW + sl || y < -sl || y > CSSH + sl) continue;
      const birthF = clamp01(rr / reach + TUNE.RAGGED * (fbm(x, y) - 0.5) * 0.4);
      if (birthF > 0.995) continue;
      const gl = Math.hypot(dirx, diry * TUNE.RISE) || 1;
      const size = 0.5 + rng() * 0.9 + TUNE.CLUMP * (rng() * rng()) * 2.0;
      const kr = rng(), kind = kr < 0.5 ? 0 : kr < 0.78 ? 1 : 2;   // 0=Gem, 1=Nadel, 2=Zwilling
      field.push({ x, y, birthF, gdx: dirx / gl, gdy: (diry * TUNE.RISE) / gl, size, kind, seed: (0x9e3779b1 * (i + 1) * (sign + 3)) >>> 0, sign, edgeProx: clamp01(1 - birthF / 0.16) });
    }
  });
  // spät geborene (hoher birthF = neu wachsende) ZUERST → liegen HINTER den früh etablierten.
  field.sort((a, b) => b.birthF - a.birthF);
  return { field, anchors };
}

// Kristall-Geometrie: 7-Punkt-Scherben, Typen 0=Gem/1=Nadel/2=Zwilling. `mat` (0..1) skaliert Länge (Hochwachsen).
function crystalOf(t, mat, scale) {
  const rng = mulberry32(t.seed);
  const len = TUNE.SHARD_LEN * scale * (0.45 + 0.75 * t.size) * (0.4 + 0.6 * mat), wid = len * TUNE.SHARD_WIDTH * (0.42 + 0.5 * rng());
  const ja = (rng() - 0.5) * 1.3, ca = Math.cos(ja), sa = Math.sin(ja);
  const dx = t.gdx * ca - t.gdy * sa, dy = t.gdx * sa + t.gdy * ca;
  function shard(ox, oy, ux, uy, L, W, sh) {
    const vx = -uy, vy = ux;
    const P = (al, aw) => ({ x: ox + ux * al + vx * aw, y: oy + uy * al + vy * aw });
    return {
      base: { x: ox - ux * L * 0.30, y: oy - uy * L * 0.30 }, tip: P(L, 0), ux, uy,
      pts: [P(-L * 0.30, W * 0.42), P(L * 0.08, W * sh), P(L * 0.52, W * 0.55 * sh), P(L, 0), P(L * 0.52, -W * 0.55 * sh), P(L * 0.08, -W * sh), P(-L * 0.30, -W * 0.42)],
    };
  }
  const parts = [];
  if (t.kind === 1) {                                        // Nadel
    parts.push(shard(t.x, t.y, dx, dy, len * 1.15, wid * 0.46, 0.5));
  } else if (t.kind === 2) {                                 // Zwilling
    parts.push(shard(t.x, t.y, dx, dy, len, wid, 0.95 + 0.3 * rng()));
    const a2 = (rng() - 0.5) * 0.7, c2 = Math.cos(a2), s2 = Math.sin(a2);
    const dx2 = dx * c2 - dy * s2, dy2 = dx * s2 + dy * c2, off = wid * (0.7 + 0.6 * rng());
    parts.push(shard(t.x + (-dy) * off, t.y + dx * off, dx2, dy2, len * (0.6 + 0.2 * rng()), wid * 0.8, 0.9));
  } else {                                                   // Gem
    parts.push(shard(t.x, t.y, dx, dy, len, wid, 0.9 + 0.35 * rng()));
  }
  return { dx, dy, len, parts, tip: parts[0].tip };
}

function neonFor(t, CSSW, CSSH, axc, axs, cNA, cNB) {
  const tAxis = clamp01(0.5 + ((t.x - CSSW / 2) * axc + (t.y - CSSH / 2) * axs) / (Math.max(CSSW, CSSH) * 0.62));
  const neon = clampRGB(mix(cNA, cNB, tAxis)), neonP = satBoost(neon, 0.45 + 0.9 * TUNE.NEON_PUNCH);
  const neonHot = clampRGB(mix(neonP, { r: 255, g: 255, b: 255 }, 0.4 + 0.3 * clamp01(TUNE.NEON_PUNCH)));
  return { neon, neonP, neonHot };
}

function polyPath(g, pts) { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.closePath(); }

function drawShard(g, t, mat, neonTips, flick, env) {
  const { CSSW, CSSH, axc, axs, cNA, cNB, scale } = env;
  const cDark = hexRGB(TUNE.ICE_DARK), cMid = hexRGB(TUNE.ICE_MID), cEdge = hexRGB(TUNE.ICE_EDGE);
  const C = crystalOf(t, mat, scale), N = neonFor(t, CSSW, CSSH, axc, axs, cNA, cNB);
  const washV = TUNE.NEON_BASE >= 0.5 ? TUNE.NEON_RIM * 0.55 : TUNE.NEON_RIM * 0.16;
  const bodyBase = clampRGB(mix(clampRGB(mix(cDark, cMid, 0.35 + 0.4 * mat)), N.neonP, washV));
  const bodyTip = clampRGB(mix(clampRGB(mix(cMid, cEdge, 0.4 + 0.5 * mat)), N.neonP, washV * 0.7));
  const edgeI = clamp01(TUNE.HOLO_EDGE * (0.5 + 0.5 * mat)) * flick;
  const rimI = clamp01(TUNE.NEON_TIP * (0.4 + 0.6 * mat) * (0.6 + 0.5 * t.size));
  for (let pi = 0; pi < C.parts.length; pi++) {
    const p = C.parts[pi], P = p.pts, tip = p.tip, base = p.base;
    const grd = g.createLinearGradient(base.x, base.y, tip.x, tip.y);
    grd.addColorStop(0, rgba(bodyBase, 0.80 * mat)); grd.addColorStop(1, rgba(bodyTip, 0.9 * mat)); g.fillStyle = grd;
    polyPath(g, P); g.fill();
    if (TUNE.FACET > 0) {                                    // Facetten (3D-Schliff)
      g.fillStyle = rgba(clampRGB(mix(bodyBase, { r: 0, g: 0, b: 0 }, 0.35 * TUNE.FACET)), 0.5 * mat * TUNE.FACET);
      g.beginPath(); g.moveTo(base.x, base.y); g.lineTo(P[0].x, P[0].y); g.lineTo(P[1].x, P[1].y); g.lineTo(P[2].x, P[2].y); g.lineTo(tip.x, tip.y); g.closePath(); g.fill();
      g.fillStyle = rgba(clampRGB(mix(bodyTip, { r: 255, g: 255, b: 255 }, 0.30 * TUNE.FACET)), 0.35 * mat * TUNE.FACET);
      g.beginPath(); g.moveTo(base.x, base.y); g.lineTo(P[6].x, P[6].y); g.lineTo(P[5].x, P[5].y); g.lineTo(P[4].x, P[4].y); g.lineTo(tip.x, tip.y); g.closePath(); g.fill();
    }
    if (TUNE.HOLO_EDGE > 0 || TUNE.HOLO_GRID > 0) {          // Hologrid: Wireframe-Kanten + interne Triangulation
      g.globalCompositeOperation = "lighter"; g.lineJoin = "round"; g.lineCap = "round";
      if (TUNE.HOLO_EDGE > 0) { g.strokeStyle = rgba(N.neonHot, 0.7 * edgeI); g.lineWidth = 0.7 + 0.9 * clamp01(TUNE.NEON_PUNCH); polyPath(g, P); g.stroke(); }
      if (TUNE.HOLO_GRID > 0) {
        let cx = 0, cy = 0; for (let q = 0; q < P.length; q++) { cx += P[q].x; cy += P[q].y; } cx /= P.length; cy /= P.length;
        g.strokeStyle = rgba(N.neonP, 0.5 * TUNE.HOLO_GRID * mat * flick); g.lineWidth = 0.5; g.beginPath();
        for (let q2 = 0; q2 < P.length; q2++) { g.moveTo(cx, cy); g.lineTo(P[q2].x, P[q2].y); }
        g.moveTo(base.x, base.y); g.lineTo(tip.x, tip.y);
        g.stroke();
      }
      g.globalCompositeOperation = "source-over";
    }
    if (TUNE.NEON_TIP > 0) {                                 // Neon-Spitze (additive Säume + heller Punkt)
      g.globalCompositeOperation = "lighter"; g.lineJoin = "round"; g.lineCap = "round";
      g.strokeStyle = rgba(N.neonP, rimI * (0.5 + 0.4 * TUNE.NEON_PUNCH)); g.lineWidth = 1.0 + 1.4 * TUNE.NEON_PUNCH;
      g.beginPath(); g.moveTo(P[2].x, P[2].y); g.lineTo(tip.x, tip.y); g.lineTo(P[4].x, P[4].y); g.stroke();
      const pr = 1.2 + 2.6 * TUNE.NEON_PUNCH;
      g.fillStyle = rgba(N.neonHot, rimI * 0.85); g.beginPath(); g.arc(tip.x, tip.y, pr * 0.45, 0, TAU); g.fill();
      g.globalCompositeOperation = "source-over";
      if (neonTips.length < 520 && rng2(t.seed + pi) < 0.7) neonTips.push({ x: tip.x, y: tip.y, c: N.neonP, i: rimI });
    }
  }
}

export function IceCrystalField({ count = 0, reduced = false, lite = false }) {
  const hostRef = useRef(null);
  const stateRef = useRef({ count, reduced, lite });
  stateRef.current = { count, reduced, lite };
  const syncRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let CSSW = 0, CSSH = 0, DPR = 1, dispCount = 0, cycleBase = 0, disposed = false, raf = 0;
    let field = [], anchors = [], fieldDirty = true;
    let frontCur = 0, frontTarget = 0, pendingBurst = false;
    let burst = null, burstT = 0;         // {parts:[...]} + verstrichene Berst-Zeit (ms)
    let last = 0;

    const nang = TUNE.NEON_ANGLE * Math.PI / 180, axc = Math.cos(nang), axs = Math.sin(nang);
    const cNA = hexRGB(TUNE.NEON_A), cNB = hexRGB(TUNE.NEON_B);
    const env = { CSSW: 0, CSSH: 0, axc, axs, cNA, cNB, scale: 1 };

    function size() {
      const w = host.clientWidth, h = host.clientHeight;
      if (w < 4 || h < 4) return false;
      DPR = Math.min(2, window.devicePixelRatio || 1);
      if (w !== CSSW || h !== CSSH) { CSSW = w; CSSH = h; canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR); fieldDirty = true; }
      return true;
    }
    function rebuild() {
      const densityMul = stateRef.current.lite ? 0.55 : 1;   // #perf-mobile: weniger Kristalle auf lite (billiger Wachs-Übergang)
      const b = buildField(CSSW, CSSH, 1, densityMul); field = b.field; anchors = b.anchors; env.CSSW = CSSW; env.CSSH = CSSH; env.scale = 1; fieldDirty = false;
    }

    function startBurst() {
      const front = Math.max(frontCur, 0.6), parts = [];
      for (let i = 0; i < field.length; i++) {
        const t = field[i]; const mat = clamp01((front - t.birthF) / TUNE.GROW_BAND); if (mat < 0.35) continue;
        const C = crystalOf(t, mat, env.scale), N = neonFor(t, CSSW, CSSH, axc, axs, cNA, cNB);
        for (let ci = 0; ci < C.parts.length; ci++) {
          const tip = C.parts[ci].tip;
          const sp = TUNE.BURST_SPEED * env.scale * (0.6 + 0.8 * Math.random());
          const jitter = (Math.random() - 0.5) * TUNE.BURST_SPREAD, ca = Math.cos(jitter), sa = Math.sin(jitter);
          const vx = (C.dx * ca - C.dy * sa) * sp, vy = (C.dx * sa + C.dy * ca) * sp;
          parts.push({ x: tip.x, y: tip.y, vx, vy, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * TUNE.BURST_SPIN, len: C.len * (0.4 + 0.5 * mat), c: N.neonP, hot: N.neonHot });
        }
        if (parts.length > 800) break;
      }
      burst = { parts }; burstT = 0;
    }

    function drawBurst(g, frameDt) {
      const life = TUNE.BURST_LIFE, k = burstT / life;
      if (k >= 1) { burst = null; frontCur = 0; frontTarget = 0; pendingBurst = false; return; }  // nach Bersten: Feld LEER
      if (TUNE.BURST_FLASH > 0 && k < 0.5) {                  // Aufblitzen an den Wurzeln
        const fa = (1 - k / 0.5) * TUNE.BURST_FLASH;
        g.globalCompositeOperation = "lighter";
        for (let a = 0; a < anchors.length; a++) {
          const an = anchors[a], rad = Math.min(CSSW, CSSH) * 0.42 * env.scale;
          const rg = g.createRadialGradient(an.x, an.y - rad * 0.35, 0, an.x, an.y - rad * 0.35, rad);
          rg.addColorStop(0, rgba(cNA, 0.4 * fa)); rg.addColorStop(0.5, rgba(cNB, 0.14 * fa)); rg.addColorStop(1, rgba(cNB, 0));
          g.fillStyle = rg; g.beginPath(); g.arc(an.x, an.y - rad * 0.35, rad, 0, TAU); g.fill();
        }
        g.globalCompositeOperation = "source-over";
      }
      const step = Math.min(3, frameDt / 16.67);              // 60fps-normierter Zeitschritt → geräteunabhängig
      g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      for (let i = 0; i < burst.parts.length; i++) {
        const p = burst.parts[i];
        p.vy += TUNE.BURST_GRAV * env.scale * 0.016 * step; p.x += p.vx * env.scale * 0.9 * step; p.y += p.vy * env.scale * 0.9 * step; p.rot += p.vr * step;
        const a = Math.pow(1 - k, 1.05);
        const ex = p.x + Math.cos(p.rot) * p.len, ey = p.y + Math.sin(p.rot) * p.len;
        g.strokeStyle = rgba(p.c, 0.8 * a); g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(ex, ey); g.stroke();
        g.fillStyle = rgba(p.hot, 0.9 * a); g.beginPath(); g.arc(p.x, p.y, 1.5, 0, TAU); g.fill();
      }
      g.globalCompositeOperation = "source-over";
    }

    function render(frameDt) {
      if (fieldDirty) rebuild();
      const front = frontCur;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, CSSW, CSSH);
      // dezenter Boden-Frost-Schimmer (Kontext)
      const floor = ctx.createLinearGradient(0, CSSH, 0, CSSH * 0.55);
      floor.addColorStop(0, rgba(cNA, 0.05 * Math.max(front, 0.15))); floor.addColorStop(1, rgba(cNA, 0));
      ctx.fillStyle = floor; ctx.fillRect(0, CSSH * 0.55, CSSW, CSSH * 0.45);
      // Feld löst sich beim Bersten glatt über die volle Berst-Dauer auf
      const fieldFade = burst ? Math.pow(clamp01(1 - burstT / TUNE.BURST_LIFE), 1.4) : 1;
      ctx.globalAlpha = fieldFade;
      const neonTips = [];
      for (let j = 0; j < field.length; j++) { const t2 = field[j]; const mat2 = clamp01((front - t2.birthF) / TUNE.GROW_BAND); if (mat2 <= 0) continue; drawShard(ctx, t2, mat2, neonTips, 1, env); }
      if (TUNE.NEON_BLOOM > 0 && neonTips.length) {           // Bloom-Aura an Neon-Spitzen
        ctx.globalCompositeOperation = "lighter"; const gr = Math.max(9, TUNE.SHARD_LEN * env.scale * 1.4);
        for (let b0 = 0; b0 < neonTips.length; b0++) {
          const nt = neonTips[b0], rad2 = gr * (0.6 + 0.9 * nt.i);
          const rgd = ctx.createRadialGradient(nt.x, nt.y, 0, nt.x, nt.y, rad2);
          rgd.addColorStop(0, rgba(nt.c, 0.5 * nt.i * TUNE.NEON_BLOOM)); rgd.addColorStop(0.5, rgba(nt.c, 0.16 * nt.i * TUNE.NEON_BLOOM)); rgd.addColorStop(1, rgba(nt.c, 0));
          ctx.fillStyle = rgd; ctx.beginPath(); ctx.arc(nt.x, nt.y, rad2, 0, TAU); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = 1;
      if (burst) drawBurst(ctx, frameDt);
    }

    // Läuft der rAF? Nur solange etwas animiert (frontCur ≠ Ziel, pendingBurst, oder Bersten). Sonst einmal statisch.
    const animating = () => (Math.abs(frontTarget - frontCur) > 0.001) || pendingBurst || !!burst;
    function frame(now) {
      if (disposed) return;
      const dt = Math.min(50, now - last); last = now;
      const k = 1 - Math.exp(-dt / Math.max(1, TUNE.GROW_MS));
      frontCur += (frontTarget - frontCur) * k;              // weiches Hochwachsen
      if (pendingBurst && frontCur >= frontTarget - 0.008) { startBurst(); pendingBurst = false; }
      if (burst) burstT += dt;
      if (!size()) { raf = 0; return; }
      render(dt);
      if (animating()) raf = requestAnimationFrame(frame); else raf = 0;   // ausgewachsen & kein Bersten → anhalten
    }
    function ensureRun() {
      if (disposed) return;
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }

    // Zähler-Änderung: monotoner `count` → Zyklus-Position (0..9) + Bersten beim Überqueren einer 10er-Grenze.
    syncRef.current = () => {
      if (disposed) return;
      const c = Math.max(0, Math.round(stateRef.current.count || 0));
      if (stateRef.current.reduced) {
        // Reduzierte Bewegung: KEIN Wachs-/Berst-Motion → direkt auf die Zyklus-Position schnappen (10er-Grenze = leeres Feld).
        burst = null; pendingBurst = false; burstT = 0;
        cycleBase = Math.floor(c / WINS_MAX) * WINS_MAX; dispCount = c;
        frontCur = frontTarget = clamp01((c - cycleBase) / WINS_MAX);
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        if (size()) render(16);
        return;
      }
      if (c === dispCount) { if (fieldDirty || Math.abs(frontTarget - frontCur) > 0.001) ensureRun(); return; }
      const crossedCycle = Math.floor(c / WINS_MAX) > Math.floor(dispCount / WINS_MAX) && c > dispCount; // neue 10er-Grenze überschritten
      dispCount = c;
      if (crossedCycle && !burst) {
        // Erst voll auswachsen (frontTarget = 1), dann bersten; nach dem Bersten steht frontCur auf 0 (leerer Zyklus).
        cycleBase = Math.floor(c / WINS_MAX) * WINS_MAX;
        frontTarget = 1; pendingBurst = true;
      } else {
        cycleBase = Math.floor(c / WINS_MAX) * WINS_MAX;
        frontTarget = clamp01((c - cycleBase) / WINS_MAX);
        if (frontTarget > 0) pendingBurst = false;
      }
      ensureRun();
    };

    let ro = null;
    try { ro = new ResizeObserver(() => { if (size() && !animating()) render(16); }); ro.observe(host); } catch { /* ignore */ }
    // Erststart: aktuellen Zähler übernehmen (ohne Wachs-Animation von 0 hoch — direkt auf die Zyklus-Position).
    dispCount = Math.max(0, Math.round(stateRef.current.count || 0));
    cycleBase = Math.floor(dispCount / WINS_MAX) * WINS_MAX;
    frontTarget = frontCur = clamp01((dispCount - cycleBase) / WINS_MAX);
    if (size()) render(16);

    return () => {
      disposed = true; if (raf) cancelAnimationFrame(raf); if (ro) ro.disconnect();
      try { host.removeChild(canvas); } catch { /* ignore */ }
      syncRef.current = null;
    };
  }, []);

  useEffect(() => { syncRef.current?.(); }, [count, reduced, lite]);

  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}

export default IceCrystalField;
