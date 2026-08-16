import { useEffect, useRef } from "react";
import { Application, Graphics, Sprite, Texture } from "pixi.js";
import { gottAppOptions, gottMaxFPS, createPlacer } from "./pixiGott.js"; // #perf-gott geteilte Init + Geometrie-Cache

/* #324 Gottgleich-Prunk „Prisma-Kaskade" (Sehr selten) — PIXI. Mehrere prismatische Schockwellen-Ringe zünden
   zeitversetzt (Kaskade) und laufen nach außen übers Board; jeder Ring aus mehreren radial getrennten Spektralbändern
   (Regenbogen-Split/chromatische Aberration) + Geburts-Blitz beim Zünden.

   Technik = mobil-sicheres Pixi: additive `Graphics`-Kreis-Strokes (Bänder) — der Pixi-nativste der Reihe — plus ein
   Geburts-Blitz als vorgebackene Radial-Sprite-Textur. Standard = volles Regenbogen-Spektrum (hsl2rgb über HUE),
   Deckfarbe = Duoton A→B. Einmal-Effekt, loop für die Vorschau. Werte 1:1 aus #324. */

const TUNE = {
  WAVES: 5, STAGGER: 0.34, LIFE: 0.6,
  R_START: 0.02, R_END: 1.3, THICK: 0.02, ORIGIN_JIT: 0, ORIGIN_Y: 0.55,
  BANDS: 14, SEP: 0.03, SAT: 1, HUE: 300,
  GLOW: 2.2, FLASH: 1.4,
  BRIGHT: 1, SCAN: 0.2,
  TAIL: 0.15,
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const intOf = (c) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
function hsl2rgb(h, s, l) { const a = s * Math.min(l, 1 - l); const f = (n) => { const k = (n + h * 12) % 12; return (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))) * 255; }; return [f(0), f(8), f(4)]; }

const RTX = 128;
function makeRadial(stops) {
  const c = document.createElement("canvas"); c.width = c.height = RTX; const x = c.getContext("2d");
  const g = x.createRadialGradient(RTX / 2, RTX / 2, 0, RTX / 2, RTX / 2, RTX / 2);
  for (const [o, a] of stops) g.addColorStop(o, `rgba(255,255,255,${a})`);
  x.fillStyle = g; x.fillRect(0, 0, RTX, RTX); return Texture.from(c);
}

export default function PrismaKaskadePixi({ panelRef, cardRef = null, trigger = 0,
  deckColor = "#31d0ff", deckColor2 = null, deckTint = false, reduced = false, lite = false, loop = false, speed = 1,
  onDone = null, onFire = null }) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const nodesRef = useRef(null);   // { rings: Graphics, flash: Sprite }
  const playRef = useRef({ playing: false, bt: 0 });
  const startRef = useRef(null);
  const firstRef = useRef(true);
  const st = useRef({ deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire });
  st.current = { deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire };
  const TOTAL = (TUNE.WAVES - 1) * TUNE.STAGGER + TUNE.LIFE;

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    let disposed = false;
    const canvas = document.createElement("canvas");
    const app = new Application();
    const flashTex = makeRadial([[0, 1], [0.5, 0.4], [1, 0]]);

    // #perf-gott: einmal je Abspielvorgang messen (createPlacer) statt zwei erzwungene Layouts pro Frame.
    const placer = createPlacer(() => {
      const pr = panelRef?.current?.getBoundingClientRect(); if (!pr || pr.width < 2) return null;
      const cr = cardRef?.current?.getBoundingClientRect();
      const cx = cr && cr.width > 2 ? (cr.left - pr.left + cr.width / 2) : pr.width / 2;
      return { W: pr.width, H: pr.height, cx, cy: pr.height * TUNE.ORIGIN_Y, halfDiag: Math.hypot(pr.width, pr.height) / 2 };
    });
    function prismColor(bu, dm, ca, cb) { const base = dm ? mix(ca, cb, bu) : hsl2rgb((bu * TUNE.HUE) / 360, 1, 0.55); return mix([255, 255, 255], base, TUNE.SAT); }

    function tick(ticker) {
      const pl = playRef.current, nodes = nodesRef.current; if (!pl.playing || !nodes) return;
      pl.bt += (ticker.deltaMS / 1000) * st.current.speed;
      const geo = placer.get(); if (!geo) return;
      const { cx, cy, halfDiag, H } = geo;
      const s = st.current;
      const dm = s.deckTint, ca = rgb(s.deckColor), cb = rgb(s.deckColor2 || s.deckColor);
      const nBands = s.lite ? 6 : TUNE.BANDS; // #perf: lite 6 statt 14 Kreis-Strokes/Ring → bis 5×6=30 statt 70 Kreise/Frame
      const thick = Math.max(1, TUNE.THICK * H);
      const rings = nodes.rings; rings.clear();
      let flashMax = 0;
      for (let w = 0; w < TUNE.WAVES; w++) {
        const wt = pl.bt - w * TUNE.STAGGER; if (wt < 0 || wt > TUNE.LIFE) continue;
        const wp = wt / TUNE.LIFE;
        const ringA = wp < 0.1 ? wp / 0.1 : Math.pow(1 - (wp - 0.1) / 0.9, 1.1);
        if (ringA <= 0.003) continue;
        const R = halfDiag * lerp(TUNE.R_START, TUNE.R_END, easeOut(wp));
        if (wp < 0.14) flashMax = Math.max(flashMax, (1 - wp / 0.14) * TUNE.FLASH);
        for (let b = 0; b < nBands; b++) {
          const bu = nBands > 1 ? b / (nBands - 1) : 0.5;
          const rb = R + (bu - 0.5) * TUNE.SEP * TUNE.BANDS * H;
          if (rb <= 1) continue;
          rings.circle(cx, cy, rb).stroke({ width: thick, color: intOf(prismColor(bu, dm, ca, cb)), alpha: clamp(0.5 * TUNE.GLOW * ringA, 0, 1) });
        }
      }
      const flash = nodes.flash, fr = halfDiag * 0.56;
      flash.position.set(cx, cy); flash.width = flash.height = fr; flash.tint = intOf(prismColor(0.5, dm, ca, cb)); flash.alpha = clamp(flashMax * 0.85, 0, 1);

      if (pl.bt > TOTAL + TUNE.TAIL) {
        if (s.loop) { pl.bt = 0; s.onFire && s.onFire(); }
        else { pl.playing = false; rings.clear(); flash.alpha = 0; stopIdle(); s.onDone && s.onDone(); }
      }
    }

    function stopIdle() { const a = appRef.current; if (!a) return; try { a.renderer.render(a.stage); a.ticker.stop(); } catch { /* ignore */ } }
    function startPlay() { const a = appRef.current, pl = playRef.current; if (!a || disposed) return; pl.playing = true; pl.bt = 0; placer.invalidate(); st.current.onFire && st.current.onFire(); if (document.visibilityState !== "hidden") a.ticker.start(); }
    startRef.current = startPlay;

    // #perf: lite → DPR-Deckel 1.25 + Ticker-Cap 45 fps.
    app.init(gottAppOptions({ canvas, host, lite: st.current.lite }))
      .then(() => {
        if (disposed) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } return; }
        appRef.current = app;
        canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block"; host.appendChild(canvas);
        const flash = new Sprite(flashTex); flash.anchor.set(0.5); flash.blendMode = "add"; flash.alpha = 0;
        const rings = new Graphics(); rings.blendMode = "add";
        app.stage.addChild(flash, rings);
        nodesRef.current = { rings, flash };
        app.ticker.maxFPS = gottMaxFPS(st.current.lite);
        app.ticker.add(tick); startPlay();
      }).catch(() => { /* WebGL fehlt → leer */ });

    const onVis = () => { const a = appRef.current; if (a && playRef.current.playing && document.visibilityState !== "hidden") a.ticker.start(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true; document.removeEventListener("visibilitychange", onVis);
      const a = appRef.current; appRef.current = null; nodesRef.current = null;
      try { flashTex.destroy(true); } catch { /* ignore */ }
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelRef, cardRef]);

  useEffect(() => { if (firstRef.current) { firstRef.current = false; return; } startRef.current?.(); }, [trigger]);

  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9 }} />;
}
