import { useEffect, useRef } from "react";

/* #325 Gottgleich-Prunk „Holo-Würfel-Kollaps" (Rar) — ein Holowürfel aus Wireframe-Blöcken baut sich aus der Ferne
   zusammen (mit Pop) → dreht sich frei im Raum → Kern-Blitz → zerspringt nach außen, jeder Splitter mit eigenem
   Taumeln, und fadet. Pseudo-3D-Wireframe-Look (Perspektiv-Projektion, N³ Sub-Würfel, je 6 Glas-Flächen + 12 Kanten
   mit Glow, hinten→vorn sortiert).

   BEWUSST Canvas-2D (kein Pixi-Shader → mobiltauglich, wie ScorchFx). Board-weite Overlay-Canvas (panelRef). Werte 1:1
   aus dem Tuning-Board (Issue #325). */

// ── TUNE (finale Werte, Issue #325) ────────────────────────────────────────────
const TUNE = {
  // Timeline (Anteile von LIFE)
  LIFE: 1.7, BUILD: 0.18, SPIN_T: 0.52, POP: 1.8, IN_DIST: 0.05,
  // Würfel
  N: 2, SIZE: 5, FILL: 0.74, POS_Y: 0.4,
  // Rotation
  SPIN_X: 1.15, SPIN_Y: 1.1, TUMBLE: 1.5,
  // Kollaps
  BURST: 3.6, SPREAD: 0.55,
  // Holo-Look
  EDGE: 2, FACE: 0.6, CORE: 1.3, GLOW: 2,
  // Look
  BRIGHT: 1, SCAN: 0,
  TAIL: 0.1,
};
const STD_A = "#35e0ff", STD_B = "#ff5db1";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1)})`;
const easeOut = (t) => 1 - (1 - t) * (1 - t);
function easeOutBack(t, s) { const inv = t - 1; return 1 + s * inv * inv * inv + s * 0.6 * inv * inv; }

// Würfel-Topologie (Einheits-Ecken ±1, 12 Kanten, 6 Flächen).
const CORNERS = [];
for (let i = 0; i < 8; i++) CORNERS.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1]);
const EDGES = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];
const FACES = [[0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4], [2, 3, 7, 6], [0, 1, 3, 2], [4, 5, 7, 6]];

// Rotation um X/Y/Z (in-place auf [x,y,z]).
function rotX(v, c, s) { const y = v[1] * c - v[2] * s, z = v[1] * s + v[2] * c; v[1] = y; v[2] = z; }
function rotY(v, c, s) { const x = v[0] * c + v[2] * s, z = -v[0] * s + v[2] * c; v[0] = x; v[2] = z; }
function rotZ(v, c, s) { const x = v[0] * c - v[1] * s, y = v[0] * s + v[1] * c; v[0] = x; v[1] = y; }

export default function HoloCubeFx({ panelRef, cardRef = null, trigger = 0,
  deckColor = "#35e0ff", deckColor2 = null, deckTint = false, reduced = false, lite = false,
  loop = false, speed = 1, onDone = null, onFire = null, zClass = "z-[11]" }) {
  const hostRef = useRef(null);
  const p = useRef({ deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire });
  p.current = { deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire };

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, FOV = 1, camZ = 1;
    let bt = 0, clock = 0, done = false, raf = 0, last = 0, disposed = false;
    let blocks = [];

    function buildBlocks() {
      blocks = [];
      const n = TUNE.N, span = 2 / n, half = (span / 2) * TUNE.FILL * TUNE.SIZE;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
        const home = [(-1 + span * (i + 0.5)) * TUNE.SIZE, (-1 + span * (j + 0.5)) * TUNE.SIZE, (-1 + span * (k + 0.5)) * TUNE.SIZE];
        const seed = (i * 7 + j * 13 + k * 29 + trigger * 3);
        const rnd = (o) => { const x = Math.sin(seed * 12.9898 + o * 78.233) * 43758.5453; return x - Math.floor(x); };
        let hd = [home[0], home[1], home[2]]; const hl = Math.hypot(hd[0], hd[1], hd[2]) || 1;
        // Flugrichtung = normierte Blockposition + SPREAD-Jitter (deterministisch je Auslösung).
        const flight = [hd[0] / hl + (rnd(1) - 0.5) * TUNE.SPREAD, hd[1] / hl + (rnd(2) - 0.5) * TUNE.SPREAD, hd[2] / hl + (rnd(3) - 0.5) * TUNE.SPREAD];
        const colU = n > 1 ? (i + j + k) / (3 * (n - 1)) : 0.5;
        const tax = [rnd(4) - 0.5, rnd(5) - 0.5, rnd(6) - 0.5];
        blocks.push({ home, flight, colU, half, tax });
      }
    }

    function measure() {
      const pr = panelRef?.current?.getBoundingClientRect();
      if (!pr || pr.width < 2) return false;
      DPR = Math.min(p.current.lite ? 1 : 1.25, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(pr.width)); H = Math.max(1, Math.round(pr.height));
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const cr = cardRef?.current?.getBoundingClientRect();
      cx = cr && cr.width > 2 ? (cr.left - pr.left + cr.width / 2) : W / 2;
      cy = H * TUNE.POS_Y;
      FOV = Math.min(W, H) * 0.95; camZ = TUNE.SIZE * 3.2;
      return true;
    }

    function fire() { if (!measure()) return; buildBlocks(); bt = 0; done = false; p.current.onFire && p.current.onFire(); }

    function update(dt) {
      bt += dt * p.current.speed;
      if (bt > TUNE.LIFE + TUNE.TAIL) {
        if (p.current.loop) fire();
        else if (!done) { done = true; p.current.onDone && p.current.onDone(); }
      }
    }

    function project(x, y, z) { const zz = z + camZ; const s = FOV / Math.max(0.4, zz); return [cx + x * s, cy + y * s, zz, s]; }

    function render() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
      const prog = clamp(bt / TUNE.LIFE, 0, 1);
      if (prog >= 1 && !p.current.loop) return;
      const dm = p.current.deckTint, ca = dm ? rgb(p.current.deckColor) : rgb(STD_A), cb = dm ? rgb(p.current.deckColor2 || p.current.deckColor) : rgb(STD_B);

      // Timeline: Aufbau (BUILD) → Dreh-Halten (SPIN_T) → Kollaps (Rest).
      const spinEnd = TUNE.BUILD + TUNE.SPIN_T;
      let asm = 1, farScale = 1, burst = 0, tumble = 0, alpha = 1, coreFlash = 0;
      if (prog < TUNE.BUILD) {
        const bp = prog / TUNE.BUILD;
        asm = clamp(easeOutBack(bp, TUNE.POP), 0, 1.4);
        farScale = lerp(0.25, 1, easeOut(bp));
        alpha = clamp(bp / 0.3, 0, 1);
        if (bp > 0.82) coreFlash = (bp - 0.82) / 0.18 * TUNE.CORE; // Kern-Blitz am Aufbau-Ende
      } else if (prog < spinEnd) {
        asm = 1;
      } else {
        const cp = (prog - spinEnd) / Math.max(0.01, 1 - spinEnd);
        burst = easeOut(cp) * TUNE.BURST;
        tumble = cp * TUNE.TUMBLE * 3.2;
        alpha = 1 - cp * cp;
        if (cp < 0.2) coreFlash = (1 - cp / 0.2) * TUNE.CORE; // Kern-Blitz am Kollaps-Start
      }
      const A = alpha * TUNE.BRIGHT;

      // Globale Rotation (Dreh-Tempo SPIN_X/SPIN_Y), läuft kontinuierlich.
      const ax = bt * TUNE.SPIN_X * 1.4, ay = bt * TUNE.SPIN_Y * 1.4;
      const cax = Math.cos(ax), sax = Math.sin(ax), cay = Math.cos(ay), say = Math.sin(ay);

      // Kern-Blitz (Weiß-Flash im Zentrum).
      if (coreFlash > 0.01) {
        const fr = Math.min(W, H) * 0.34, fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, fr);
        ctx.globalCompositeOperation = "lighter";
        fg.addColorStop(0, rgba([255, 255, 255], 0.8 * coreFlash * A));
        fg.addColorStop(0.5, rgba(mix(ca, cb, 0.5), 0.35 * coreFlash * A));
        fg.addColorStop(1, rgba([255, 255, 255], 0));
        ctx.fillStyle = fg; ctx.fillRect(cx - fr, cy - fr, fr * 2, fr * 2);
      }

      // Blöcke transformieren + nach z (hinten→vorn) sortieren.
      const drawn = [];
      for (const bl of blocks) {
        // Block-Zentrum in der Würfel-Frame: Aufbau (aus der Ferne/gestreut) bzw. Kollaps (nach außen).
        const bc = [bl.home[0], bl.home[1], bl.home[2]];
        if (prog < TUNE.BUILD) { const o = TUNE.IN_DIST * 10 * (1 - asm) * TUNE.SIZE; bc[0] += bl.flight[0] * o; bc[1] += bl.flight[1] * o; bc[2] += bl.flight[2] * o; }
        else if (burst > 0) { bc[0] += bl.flight[0] * burst * TUNE.SIZE; bc[1] += bl.flight[1] * burst * TUNE.SIZE; bc[2] += bl.flight[2] * burst * TUNE.SIZE; }
        const tcx = Math.cos(tumble * bl.tax[0] * 6), tsx = Math.sin(tumble * bl.tax[0] * 6);
        const tcy = Math.cos(tumble * bl.tax[1] * 6), tsy = Math.sin(tumble * bl.tax[1] * 6);
        const tcz = Math.cos(tumble * bl.tax[2] * 6), tsz = Math.sin(tumble * bl.tax[2] * 6);
        const pts = new Array(8); let zsum = 0;
        for (let c = 0; c < 8; c++) {
          const v = [CORNERS[c][0] * bl.half, CORNERS[c][1] * bl.half, CORNERS[c][2] * bl.half];
          if (tumble > 0) { rotX(v, tcx, tsx); rotY(v, tcy, tsy); rotZ(v, tcz, tsz); } // Eigen-Taumeln je Splitter
          v[0] += bc[0]; v[1] += bc[1]; v[2] += bc[2];
          rotX(v, cax, sax); rotY(v, cay, say);                                        // globale Würfel-Rotation
          v[0] *= farScale; v[1] *= farScale; v[2] *= farScale;
          pts[c] = project(v[0], v[1], v[2]); zsum += pts[c][2];
        }
        drawn.push({ pts, z: zsum / 8, col: mix(ca, cb, bl.colU) });
      }
      drawn.sort((a, b) => b.z - a.z); // hinten zuerst

      ctx.globalCompositeOperation = "lighter"; ctx.lineJoin = "round";
      const edgeGlow = (p.current.lite ? 1 : 1) * TUNE.EDGE * TUNE.GLOW * (p.current.lite ? 4 : 7);
      for (const b of drawn) {
        // Glas-Flächen (dezente Füllung).
        if (TUNE.FACE > 0 && !p.current.lite) {
          ctx.fillStyle = rgba(b.col, 0.10 * TUNE.FACE * A);
          for (const f of FACES) { ctx.beginPath(); ctx.moveTo(b.pts[f[0]][0], b.pts[f[0]][1]); for (let q = 1; q < 4; q++) ctx.lineTo(b.pts[f[q]][0], b.pts[f[q]][1]); ctx.closePath(); ctx.fill(); }
        }
        // Wireframe-Kanten mit Glow (per-Block shadowBlur → günstiger als per-Kante).
        ctx.shadowColor = rgba(b.col, 1); ctx.shadowBlur = edgeGlow;
        ctx.strokeStyle = rgba(mix(b.col, [255, 255, 255], 0.35), 0.85 * A); ctx.lineWidth = p.current.lite ? 1.3 : 1.7;
        ctx.beginPath();
        for (const e of EDGES) { ctx.moveTo(b.pts[e[0]][0], b.pts[e[0]][1]); ctx.lineTo(b.pts[e[1]][0], b.pts[e[1]][1]); }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      if (TUNE.SCAN > 0 && !p.current.reduced) {
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.10 * TUNE.SCAN * A; ctx.fillStyle = "#000";
        for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }

    function frame(now) {
      if (disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; clock = now / 1000;
      update(dt); render();
      if (!p.current.loop && done) { raf = 0; return; }
      raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!measure()) { setTimeout(kick, 30); return; } fire(); last = performance.now(); raf = requestAnimationFrame(frame); };
    kick();
    return () => { disposed = true; if (raf) cancelAnimationFrame(raf); try { host.removeChild(canvas); } catch { /* ignore */ } };
  }, [trigger, panelRef, cardRef]);

  return <div ref={hostRef} aria-hidden="true" className={`absolute inset-0 ${zClass} pointer-events-none`} />;
}
