import { useEffect, useRef } from "react";
import { Application, Graphics, Sprite, Texture } from "pixi.js";

/* #325 Gottgleich-Prunk „Holo-Würfel-Kollaps" (Rar) — PIXI. Ein Holowürfel aus N³ Wireframe-Blöcken baut sich aus der
   Ferne zusammen (Pop) → dreht sich frei → Kern-Blitz → zerspringt taumelnd nach außen und fadet. Pseudo-3D:
   Perspektiv-Projektion in JS, hinten→vorn sortiert, je Block 6 Glas-Flächen + 12 Kanten.

   Technik = mobil-sicheres Pixi: `Graphics` (Kanten als additive Zwei-Pass-Strokes für den Neon-Glow OHNE shadowBlur,
   Flächen als dezente Poly-Füllung) + Kern-Blitz als Radial-Sprite. Einmal-Effekt, loop für die Vorschau. Werte 1:1 #325. */

const TUNE = {
  LIFE: 1.7, BUILD: 0.18, SPIN_T: 0.52, POP: 1.8, IN_DIST: 0.05,
  N: 2, SIZE: 5, FILL: 0.74, POS_Y: 0.4,
  SPIN_X: 1.15, SPIN_Y: 1.1, TUMBLE: 1.5,
  BURST: 3.6, SPREAD: 0.55,
  EDGE: 2, FACE: 0.6, CORE: 1.3, GLOW: 2,
  BRIGHT: 1, SCAN: 0,
  TAIL: 0.1,
};
const STD_A = "#35e0ff", STD_B = "#ff5db1";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const intOf = (c) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
function easeOutBack(t, s) { const inv = t - 1; return 1 + s * inv * inv * inv + s * 0.6 * inv * inv; }

const CORNERS = [];
for (let i = 0; i < 8; i++) CORNERS.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1]);
const EDGES = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];
const FACES = [[0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4], [2, 3, 7, 6], [0, 1, 3, 2], [4, 5, 7, 6]];
function rotX(v, c, s) { const y = v[1] * c - v[2] * s, z = v[1] * s + v[2] * c; v[1] = y; v[2] = z; }
function rotY(v, c, s) { const x = v[0] * c + v[2] * s, z = -v[0] * s + v[2] * c; v[0] = x; v[2] = z; }
function rotZ(v, c, s) { const x = v[0] * c - v[1] * s, y = v[0] * s + v[1] * c; v[0] = x; v[1] = y; }

const RTX = 128;
function makeRadial(stops) {
  const c = document.createElement("canvas"); c.width = c.height = RTX; const x = c.getContext("2d");
  const g = x.createRadialGradient(RTX / 2, RTX / 2, 0, RTX / 2, RTX / 2, RTX / 2);
  for (const [o, a] of stops) g.addColorStop(o, `rgba(255,255,255,${a})`);
  x.fillStyle = g; x.fillRect(0, 0, RTX, RTX); return Texture.from(c);
}

export default function HoloCubePixi({ panelRef, cardRef = null, trigger = 0,
  deckColor = "#35e0ff", deckColor2 = null, deckTint = false, reduced = false, lite = false, loop = false, speed = 1,
  loopGap = 0, onDone = null, onFire = null }) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const nodesRef = useRef(null);   // { g: Graphics, core: Sprite }
  const playRef = useRef({ playing: false, bt: 0, blocks: [], gapping: false, gapT: 0 });
  const startRef = useRef(null);
  const firstRef = useRef(true);
  // loopGap (nur Vorschau, s): Pause in ECHTZEIT zwischen zwei Loop-Durchläufen — der ~11-s-Swell (fx_holocube) soll
  // durchlaufen können, bevor die nächste Animation (und ihr Ton) startet. In-Game läuft der Effekt mit loop=false → 0.
  const st = useRef({ deckColor, deckColor2, deckTint, reduced, lite, loop, speed, loopGap, onDone, onFire });
  st.current = { deckColor, deckColor2, deckTint, reduced, lite, loop, speed, loopGap, onDone, onFire };

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    let disposed = false;
    const canvas = document.createElement("canvas");
    const app = new Application();
    const coreTex = makeRadial([[0, 1], [0.5, 0.4], [1, 0]]);

    function buildBlocks() {
      const blocks = [], n = TUNE.N, span = 2 / n, half = (span / 2) * TUNE.FILL * TUNE.SIZE;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
        const home = [(-1 + span * (i + 0.5)) * TUNE.SIZE, (-1 + span * (j + 0.5)) * TUNE.SIZE, (-1 + span * (k + 0.5)) * TUNE.SIZE];
        const seed = (i * 7 + j * 13 + k * 29 + (trigger + 1) * 3);
        const rnd = (o) => { const x = Math.sin(seed * 12.9898 + o * 78.233) * 43758.5453; return x - Math.floor(x); };
        const hl = Math.hypot(home[0], home[1], home[2]) || 1;
        const flight = [home[0] / hl + (rnd(1) - 0.5) * TUNE.SPREAD, home[1] / hl + (rnd(2) - 0.5) * TUNE.SPREAD, home[2] / hl + (rnd(3) - 0.5) * TUNE.SPREAD];
        const colU = n > 1 ? (i + j + k) / (3 * (n - 1)) : 0.5;
        blocks.push({ home, flight, colU, half, tax: [rnd(4) - 0.5, rnd(5) - 0.5, rnd(6) - 0.5] });
      }
      playRef.current.blocks = blocks;
    }

    function place() {
      const pr = panelRef?.current?.getBoundingClientRect(); if (!pr || pr.width < 2) return null;
      const cr = cardRef?.current?.getBoundingClientRect();
      const cx = cr && cr.width > 2 ? (cr.left - pr.left + cr.width / 2) : pr.width / 2;
      const W = pr.width, H = pr.height;
      return { W, H, cx, cy: H * TUNE.POS_Y, FOV: Math.min(W, H) * 0.95, camZ: TUNE.SIZE * 3.2 };
    }

    function tick(ticker) {
      const pl = playRef.current, nodes = nodesRef.current; if (!pl.playing || !nodes) return;
      // Loop-Pause (Vorschau): leere Bühne, Echtzeit zählen; erst nach Ablauf neu bauen + Ton neu auslösen.
      if (pl.gapping) {
        pl.gapT += ticker.deltaMS / 1000;
        if (pl.gapT >= pl.gapDur) { pl.gapping = false; buildBlocks(); pl.bt = 0; st.current.onFire && st.current.onFire(); }
        return;
      }
      pl.bt += (ticker.deltaMS / 1000) * st.current.speed;
      const geo = place(); if (!geo) return;
      const { cx, cy, FOV, camZ, W, H } = geo;
      const project = (x, y, z) => { const zz = z + camZ; const s = FOV / Math.max(0.4, zz); return [cx + x * s, cy + y * s, zz]; };
      const s = st.current;
      const prog = clamp(pl.bt / TUNE.LIFE, 0, 1);
      const ca = s.deckTint ? rgb(s.deckColor) : rgb(STD_A), cb = s.deckTint ? rgb(s.deckColor2 || s.deckColor) : rgb(STD_B);
      const spinEnd = TUNE.BUILD + TUNE.SPIN_T;
      let asm = 1, farScale = 1, burst = 0, tumble = 0, alpha = 1, coreFlash = 0;
      if (prog < TUNE.BUILD) { const bp = prog / TUNE.BUILD; asm = clamp(easeOutBack(bp, TUNE.POP), 0, 1.4); farScale = lerp(0.25, 1, easeOut(bp)); alpha = clamp(bp / 0.3, 0, 1); if (bp > 0.82) coreFlash = (bp - 0.82) / 0.18 * TUNE.CORE; }
      else if (prog < spinEnd) { asm = 1; }
      else { const cp = (prog - spinEnd) / Math.max(0.01, 1 - spinEnd); burst = easeOut(cp) * TUNE.BURST; tumble = cp * TUNE.TUMBLE * 3.2; alpha = 1 - cp * cp; if (cp < 0.2) coreFlash = (1 - cp / 0.2) * TUNE.CORE; }
      const A = alpha * TUNE.BRIGHT;
      const ax = pl.bt * TUNE.SPIN_X * 1.4, ay = pl.bt * TUNE.SPIN_Y * 1.4;
      const cax = Math.cos(ax), sax = Math.sin(ax), cay = Math.cos(ay), say = Math.sin(ay);

      const drawn = [];
      for (const bl of pl.blocks) {
        const bc = [bl.home[0], bl.home[1], bl.home[2]];
        if (prog < TUNE.BUILD) { const o = TUNE.IN_DIST * 10 * (1 - asm) * TUNE.SIZE; bc[0] += bl.flight[0] * o; bc[1] += bl.flight[1] * o; bc[2] += bl.flight[2] * o; }
        else if (burst > 0) { bc[0] += bl.flight[0] * burst * TUNE.SIZE; bc[1] += bl.flight[1] * burst * TUNE.SIZE; bc[2] += bl.flight[2] * burst * TUNE.SIZE; }
        const tcx = Math.cos(tumble * bl.tax[0] * 6), tsx = Math.sin(tumble * bl.tax[0] * 6);
        const tcy = Math.cos(tumble * bl.tax[1] * 6), tsy = Math.sin(tumble * bl.tax[1] * 6);
        const tcz = Math.cos(tumble * bl.tax[2] * 6), tsz = Math.sin(tumble * bl.tax[2] * 6);
        const pts = new Array(8); let zsum = 0;
        for (let c = 0; c < 8; c++) {
          const v = [CORNERS[c][0] * bl.half, CORNERS[c][1] * bl.half, CORNERS[c][2] * bl.half];
          if (tumble > 0) { rotX(v, tcx, tsx); rotY(v, tcy, tsy); rotZ(v, tcz, tsz); }
          v[0] += bc[0]; v[1] += bc[1]; v[2] += bc[2];
          rotX(v, cax, sax); rotY(v, cay, say);
          v[0] *= farScale; v[1] *= farScale; v[2] *= farScale;
          pts[c] = project(v[0], v[1], v[2]); zsum += pts[c][2];
        }
        drawn.push({ pts, z: zsum / 8, col: mix(ca, cb, bl.colU) });
      }
      drawn.sort((a, b) => b.z - a.z);

      const g = nodes.g; g.clear();
      const doFaces = TUNE.FACE > 0 && !s.lite;
      for (const b of drawn) {
        if (doFaces) { const ci = intOf(b.col); for (const f of FACES) { g.poly([b.pts[f[0]][0], b.pts[f[0]][1], b.pts[f[1]][0], b.pts[f[1]][1], b.pts[f[2]][0], b.pts[f[2]][1], b.pts[f[3]][0], b.pts[f[3]][1]]).fill({ color: ci, alpha: clamp(0.10 * TUNE.FACE * A, 0, 1) }); } }
        // Kanten: Zwei-Pass (breiter Glow + heller Kern) → Neon-Glow ohne shadowBlur. #perf: auf lite nur der Kern-Pass
        // (halbe Stroke-Zahl) — der Glow-Pass entfällt, dafür der Kern minimal breiter/kräftiger, damit der Look hält.
        const glowW = s.lite ? 3 : 5, coreW = s.lite ? 1.5 : 1.6, cGlow = intOf(b.col), cCore = intOf(mix(b.col, [255, 255, 255], 0.5));
        const passes = s.lite ? [[coreW, cCore, 0.95]] : [[glowW, cGlow, 0.22 * TUNE.EDGE * 0.5], [coreW, cCore, 0.9]];
        for (const pass of passes) {
          for (const e of EDGES) { g.moveTo(b.pts[e[0]][0], b.pts[e[0]][1]); g.lineTo(b.pts[e[1]][0], b.pts[e[1]][1]); }
          g.stroke({ width: pass[0], color: pass[1], alpha: clamp(pass[2] * A, 0, 1), cap: "round", join: "round" });
        }
      }

      const core = nodes.core, fr = Math.min(W, H) * 0.34;
      core.position.set(cx, cy); core.width = core.height = fr; core.tint = intOf(mix([255, 255, 255], mix(ca, cb, 0.5), 0.5)); core.alpha = clamp(coreFlash * 0.85 * A + coreFlash * 0.15, 0, 1);

      if (pl.bt > TUNE.LIFE + TUNE.TAIL) {
        if (s.loop) {
          const gap = Math.max(0, Number(s.loopGap) || 0);
          if (gap > 0) { pl.gapping = true; pl.gapT = 0; pl.gapDur = gap; g.clear(); core.alpha = 0; } // Pause, dann Neustart im Gap-Zweig
          else { buildBlocks(); pl.bt = 0; s.onFire && s.onFire(); }
        }
        else { pl.playing = false; g.clear(); core.alpha = 0; stopIdle(); s.onDone && s.onDone(); }
      }
    }

    function stopIdle() { const a = appRef.current; if (!a) return; try { a.renderer.render(a.stage); a.ticker.stop(); } catch { /* ignore */ } }
    function startPlay() { const a = appRef.current, pl = playRef.current; if (!a || disposed) return; buildBlocks(); pl.playing = true; pl.bt = 0; pl.gapping = false; pl.gapT = 0; st.current.onFire && st.current.onFire(); if (document.visibilityState !== "hidden") a.ticker.start(); }
    startRef.current = startPlay;

    // #perf: lite → DPR-Deckel 1.25 + Ticker-Cap 45 fps.
    app.init({ canvas, preference: "webgl", backgroundAlpha: 0, antialias: true, autoDensity: true,
      resolution: Math.min(st.current.lite ? 1.25 : 2, window.devicePixelRatio || 1), resizeTo: host, powerPreference: "high-performance" })
      .then(() => {
        if (disposed) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } return; }
        appRef.current = app;
        canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block"; host.appendChild(canvas);
        const g = new Graphics(); g.blendMode = "add";
        const core = new Sprite(coreTex); core.anchor.set(0.5); core.blendMode = "add"; core.alpha = 0;
        app.stage.addChild(g, core);
        nodesRef.current = { g, core };
        app.ticker.maxFPS = st.current.lite ? 30 : 0; // #perf-mobile: lite 45→30
        app.ticker.add(tick); startPlay();
      }).catch(() => { /* WebGL fehlt → leer */ });

    const onVis = () => { const a = appRef.current; if (a && playRef.current.playing && document.visibilityState !== "hidden") a.ticker.start(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true; document.removeEventListener("visibilitychange", onVis);
      const a = appRef.current; appRef.current = null; nodesRef.current = null;
      try { coreTex.destroy(true); } catch { /* ignore */ }
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelRef, cardRef]);

  useEffect(() => { if (firstRef.current) { firstRef.current = false; return; } startRef.current?.(); }, [trigger]);

  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11 }} />;
}
