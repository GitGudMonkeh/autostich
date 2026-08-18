import { useEffect, useRef } from "react";
import { Application, Graphics, Sprite } from "pixi.js";
import { gottAppOptions, gottMaxFPS, createPlacer } from "./pixiGott.js"; // #perf-gott geteilte Init + Geometrie-Cache
import { lerp, mix, easeOut, clamp } from "./fxMath.js"; // #fx-helfer: geteilte Mathe-/Canvas-Helfer
import { makeRadial } from "./fxTextures.js"; // #fx-helfer: geteilte Radial-Textur

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
/* Die zwei Kanten-Durchgänge als Kennungen statt als frisch gebaute Array-Literale je Block und Frame:
   0 = breiter Glow-Pass, 1 = heller Kern-Pass. Auf `lite` bleibt nur der Kern. */
const PASS_FULL = [0, 1];
const PASS_LITE = [1];

function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const intOf = (c) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);
function easeOutBack(t, s) { const inv = t - 1; return 1 + s * inv * inv * inv + s * 0.6 * inv * inv; }

const CORNERS = [];
for (let i = 0; i < 8; i++) CORNERS.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1]);
const EDGES = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];
const FACES = [[0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4], [2, 3, 7, 6], [0, 1, 3, 2], [4, 5, 7, 6]];
function rotX(v, c, s) { const y = v[1] * c - v[2] * s, z = v[1] * s + v[2] * c; v[1] = y; v[2] = z; }
function rotY(v, c, s) { const x = v[0] * c + v[2] * s, z = -v[0] * s + v[2] * c; v[0] = x; v[2] = z; }
function rotZ(v, c, s) { const x = v[0] * c - v[1] * s, y = v[0] * s + v[1] * c; v[0] = x; v[1] = y; }

// Kantenlänge der geteilten Radial-Textur (fxTextures.js). 128 statt 64 wie bei den Partikel-Effekten:
// die Prunk-Sprites werden bildschirmfüllend skaliert, bei 64 würde der Halo sichtbar ausfransen.
const RTX = 128;

  /* #perf-warm: `warm` = Bühne aufbauen, aber NICHT abspielen. Der Prunk wurde bisher erst beim ersten
     gottgleichen Sieg gemountet — und weil `startPlay()` direkt in der Init steht, fielen Chunk-Laden und
     `Application.init()` genau in den lautesten Moment des Laufs (gemessen: 362 ms blockierter Hauptthread,
     Supernova zieht dafür ZWEI Pixi-Apps auf). Mit `warm` passiert das, während ein Vollbild-Overlay liegt,
     wo ein Hitch unsichtbar ist. Kommt der Sieg vor dem Ende der (asynchronen) Init, merkt sich `startPlay()`
     das als `pending` und die Init holt das Abspielen nach — sonst würde der erste Gottgleich stumm bleiben. */
export default function HoloCubePixi({ panelRef, cardRef = null, trigger = 0,
  deckColor = "#35e0ff", deckColor2 = null, deckTint = false, reduced = false, lite = false, loop = false, speed = 1,
  loopGap = 0, onDone = null, onFire = null, warm = false }) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const nodesRef = useRef(null);   // { g: Graphics, core: Sprite }
  const playRef = useRef({ playing: false, bt: 0, blocks: [], gapping: false, gapT: 0 });
  const startRef = useRef(null);
  const firstRef = useRef(true);
  // loopGap (nur Vorschau, s): Pause in ECHTZEIT zwischen zwei Loop-Durchläufen — der ~11-s-Swell (fx_holocube) soll
  // durchlaufen können, bevor die nächste Animation (und ihr Ton) startet. In-Game läuft der Effekt mit loop=false → 0.
  const st = useRef({ deckColor, deckColor2, deckTint, reduced, lite, loop, speed, loopGap, onDone, onFire });
  st.current = { deckColor, deckColor2, deckTint, reduced, lite, loop, speed, loopGap, onDone, onFire, warm };

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    let disposed = false;
    const canvas = document.createElement("canvas");
    const app = new Application();
    const coreTex = makeRadial([[0, 1], [0.5, 0.4], [1, 0]], RTX);

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

    /* #perf-holo: Arbeitspuffer, EINMAL je Instanz angelegt und jeden Frame wiederverwendet. Bewusst nicht
       modulweit — der Effekt kann doppelt leben (im Spiel und als Werkstatt-Vorschau) und beide würden sich
       im selben Frame denselben Puffer überschreiben. Die paar KB pro Instanz sind dagegen nichts. */
    const scratch = (() => {
      let P = null, Z = null, ORD = null;
      const v = [0, 0, 0];
      return {
        v,
        pts(n) { if (!P || P.length < n * 16) P = new Float64Array(n * 16); return P; },
        z(n) { if (!Z || Z.length < n) Z = new Float64Array(n); return Z; },
        /* Zeichenreihenfolge. `zs === null` (lite, keine Flächen) → schlichte Reihenfolge, keine Sortierung.
           Sonst hinten→vorn per Einfüge-Sortierung: bei n = 8 ist die billiger als `Array.sort` und braucht
           vor allem keine Vergleichs-Closure und kein Objekt-Array, das jeden Frame neu entsteht. */
        order(n, zs) {
          if (!ORD || ORD.length !== n) ORD = new Int32Array(n);
          for (let i = 0; i < n; i++) ORD[i] = i;
          if (zs) {
            for (let i = 1; i < n; i++) {
              const k = ORD[i], kz = zs[k];
              let j = i - 1;
              while (j >= 0 && zs[ORD[j]] < kz) { ORD[j + 1] = ORD[j]; j--; }
              ORD[j + 1] = k;
            }
          }
          return ORD;
        },
      };
    })();

    // #perf-gott: einmal je Abspielvorgang messen (createPlacer) statt zwei erzwungene Layouts pro Frame.
    const placer = createPlacer(() => {
      const pr = panelRef?.current?.getBoundingClientRect(); if (!pr || pr.width < 2) return null;
      const cr = cardRef?.current?.getBoundingClientRect();
      const cx = cr && cr.width > 2 ? (cr.left - pr.left + cr.width / 2) : pr.width / 2;
      const W = pr.width, H = pr.height;
      return { W, H, cx, cy: H * TUNE.POS_Y, FOV: Math.min(W, H) * 0.95, camZ: TUNE.SIZE * 3.2 };
    });

    function tick(ticker) {
      const pl = playRef.current, nodes = nodesRef.current; if (!pl.playing || !nodes) return;
      // Loop-Pause (Vorschau): leere Bühne, Echtzeit zählen; erst nach Ablauf neu bauen + Ton neu auslösen.
      if (pl.gapping) {
        pl.gapT += ticker.deltaMS / 1000;
        if (pl.gapT >= pl.gapDur) { pl.gapping = false; buildBlocks(); pl.bt = 0; st.current.onFire && st.current.onFire(); }
        return;
      }
      pl.bt += (ticker.deltaMS / 1000) * st.current.speed;
      const geo = placer.get(); if (!geo) return;
      const { cx, cy, FOV, camZ, W, H } = geo;
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

      /* #perf-holo (17.08.2026) — dieselbe Baustelle wie bei der Supernova (#perf-nova): nicht die Füllrate,
         sondern die CPU. Die Schleife hier lief pro Frame durch ~150 frische Arrays (je Ecke ein Vektor, je
         Ecke ein Projektions-Ergebnis, je Block Mittelpunkt/Punktliste/Farbe) — bei 8 Blöcken × 8 Ecken und
         30 fps sind das rund 4500 Wegwerf-Objekte pro Sekunde, allesamt kurzlebig und damit reines Futter
         für die GC. Auf dem Handy fällt genau das als Ruckeln auf, nicht das Zeichnen.
         Jetzt: EIN vorab angelegter Punktpuffer, EIN wiederverwendeter Vektor, Farben als Skalare gerechnet.
         Die Mathematik ist Zeile für Zeile dieselbe, das Bild also identisch. */
      const nb = pl.blocks.length;
      const P = scratch.pts(nb);          // x,y je Ecke — flach, wiederverwendet
      const ZS = scratch.z(nb);           // mittlere Tiefe je Block (nur für die Sortierung gebraucht)
      const v = scratch.v;
      for (let bi = 0; bi < nb; bi++) {
        const bl = pl.blocks[bi];
        let bcx = bl.home[0], bcy = bl.home[1], bcz = bl.home[2];
        if (prog < TUNE.BUILD) { const o = TUNE.IN_DIST * 10 * (1 - asm) * TUNE.SIZE; bcx += bl.flight[0] * o; bcy += bl.flight[1] * o; bcz += bl.flight[2] * o; }
        else if (burst > 0) { bcx += bl.flight[0] * burst * TUNE.SIZE; bcy += bl.flight[1] * burst * TUNE.SIZE; bcz += bl.flight[2] * burst * TUNE.SIZE; }
        const tcx = Math.cos(tumble * bl.tax[0] * 6), tsx = Math.sin(tumble * bl.tax[0] * 6);
        const tcy = Math.cos(tumble * bl.tax[1] * 6), tsy = Math.sin(tumble * bl.tax[1] * 6);
        const tcz = Math.cos(tumble * bl.tax[2] * 6), tsz = Math.sin(tumble * bl.tax[2] * 6);
        let zsum = 0;
        const base = bi * 16;
        for (let c = 0; c < 8; c++) {
          v[0] = CORNERS[c][0] * bl.half; v[1] = CORNERS[c][1] * bl.half; v[2] = CORNERS[c][2] * bl.half;
          if (tumble > 0) { rotX(v, tcx, tsx); rotY(v, tcy, tsy); rotZ(v, tcz, tsz); }
          v[0] += bcx; v[1] += bcy; v[2] += bcz;
          rotX(v, cax, sax); rotY(v, cay, say);
          v[0] *= farScale; v[1] *= farScale; v[2] *= farScale;
          const zz = v[2] + camZ, sc = FOV / Math.max(0.4, zz);
          P[base + c * 2] = cx + v[0] * sc; P[base + c * 2 + 1] = cy + v[1] * sc;
          zsum += zz;
        }
        ZS[bi] = zsum / 8;
      }

      const g = nodes.g; g.clear();
      const doFaces = TUNE.FACE > 0 && !s.lite;
      /* Hinten→vorn sortieren ist der Maler-Algorithmus — er wird NUR für die gefüllten Flächen gebraucht.
         Auf `lite` sind die Flächen aus (`doFaces` false) und es bleiben rein ADDITIVE Kanten übrig, und
         additives Blending ist reihenfolge-unabhängig: dasselbe Bild, egal in welcher Folge gezeichnet wird.
         Die Sortierung war dort also jeden Frame umsonst. */
      const order = scratch.order(nb, doFaces ? ZS : null);
      // Farbmischung als Skalare statt über `mix()`/`intOf()` — pro Block sparte das zwei Arrays je Frame.
      const car = ca[0], cag = ca[1], cab = ca[2], cbr = cb[0], cbg = cb[1], cbb = cb[2];
      for (let oi = 0; oi < nb; oi++) {
        const bi = order[oi], base = bi * 16, u = pl.blocks[bi].colU;
        const r = car + (cbr - car) * u, gg = cag + (cbg - cag) * u, bb = cab + (cbb - cab) * u;
        const cGlow = ((r & 255) << 16) | ((gg & 255) << 8) | (bb & 255);
        const cCore = ((((r + 255) / 2) & 255) << 16) | ((((gg + 255) / 2) & 255) << 8) | (((bb + 255) / 2) & 255);
        if (doFaces) { for (const f of FACES) { g.poly([P[base + f[0] * 2], P[base + f[0] * 2 + 1], P[base + f[1] * 2], P[base + f[1] * 2 + 1], P[base + f[2] * 2], P[base + f[2] * 2 + 1], P[base + f[3] * 2], P[base + f[3] * 2 + 1]]).fill({ color: cGlow, alpha: clamp(0.10 * TUNE.FACE * A, 0, 1) }); } }
        // Kanten: Zwei-Pass (breiter Glow + heller Kern) → Neon-Glow ohne shadowBlur. #perf: auf lite nur der Kern-Pass
        // (halbe Stroke-Zahl) — der Glow-Pass entfällt, dafür der Kern minimal breiter/kräftiger, damit der Look hält.
        /* #perf-holo2: Auf lite 1,9 statt 1,5 CSS-px. Das ist KEINE Look-Änderung, sondern die Gegenrechnung
   zur gesenkten `resolution` (1,25 → 1,0, s. app.init unten): über die Geräte-Pixel gemessen ist die
   Linie danach exakt so breit wie vorher (1,5 × 1,25 = 1,875 gegen 1,9 × 1,0). Genau diese Zahl —
   Breite in GERÄTE-Pixeln — entscheidet darüber, ob eine dünne Linie ohne MSAA treppig wird. */
        const glowW = s.lite ? 3 : 5, coreW = s.lite ? 1.9 : 1.6;
        const passes = s.lite ? PASS_LITE : PASS_FULL;
        for (let pi = 0; pi < passes.length; pi++) {
          const isGlow = passes[pi] === 0;
          for (const e of EDGES) { g.moveTo(P[base + e[0] * 2], P[base + e[0] * 2 + 1]); g.lineTo(P[base + e[1] * 2], P[base + e[1] * 2 + 1]); }
          g.stroke({ width: isGlow ? glowW : coreW, color: isGlow ? cGlow : cCore,
            alpha: clamp((isGlow ? 0.22 * TUNE.EDGE * 0.5 : (s.lite ? 0.95 : 0.9)) * A, 0, 1), cap: "round", join: "round" });
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
    function startPlay() { const a = appRef.current, pl = playRef.current; if (disposed) return; if (!a) { pl.pending = true; return; } pl.pending = false; buildBlocks(); pl.playing = true; pl.bt = 0; placer.invalidate(); pl.gapping = false; pl.gapT = 0; st.current.onFire && st.current.onFire(); if (document.visibilityState !== "hidden") a.ticker.start(); }
    startRef.current = startPlay;

    /* #perf-holo2: `resLite` 1,25 → 1,0. Fill geht QUADRATISCH mit der Auflösung, das ist damit der einzige
       Hebel am Würfel mit zweistelligem Gewinn: gerechnet auf einem 360×340-Panel rund 35 % weniger Füllarbeit
       je Frame — gegenüber 1,6 %, die ein um 20 % kleinerer Würfel gebracht hätte (die Striche decken nur ~9 %
       der Canvas ab, der Rest ist die vollflächige transparente Ebene, die ohnehin jeden Frame komponiert wird).
       Die Kanten verlieren dabei nichts: ihre Breite ist oben gegengerechnet. Was gröber abgetastet wird, ist der
       Kern-Blitz — und der ist eine weiche, vorgebackene Radialtextur, also genau der Fall, in dem Auflösung am
       wenigsten trägt (dieselbe Begründung wie für `antialias: false`, s. pixiGott.js).
       Ticker-Cap kommt aus `mobileTier` (lite = DRAW_HZ_COARSE). */
    app.init(gottAppOptions({ canvas, host, lite: st.current.lite, resLite: 1.0 }))
      .then(() => {
        if (disposed) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } return; }
        appRef.current = app;
        canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block"; host.appendChild(canvas);
        const g = new Graphics(); g.blendMode = "add";
        const core = new Sprite(coreTex); core.anchor.set(0.5); core.blendMode = "add"; core.alpha = 0;
        app.stage.addChild(g, core);
        nodesRef.current = { g, core };
        app.ticker.maxFPS = gottMaxFPS(st.current.lite);
        app.ticker.add(tick); if (!st.current.warm || playRef.current.pending) startPlay();
      // Nur vorgewärmt: Pixi startet seinen Ticker bei der Init von selbst — hier wieder anhalten, sonst
      // renderte die (leere) Bühne den ganzen Lauf über mit. stopIdle() ist derselbe Ruhezustand wie nach dem Abspielen.
      else stopIdle();
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
