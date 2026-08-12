import { useEffect, useRef } from "react";

/* #324 Gottgleich-Prunk „Prisma-Kaskade" (Sehr selten) — mehrere prismatische Schockwellen-Ringe zünden zeitversetzt
   (Kaskade) und laufen nach außen übers Board. Jeder Ring ist chromatisch aus mehreren radial getrennten Spektralbändern
   gebaut (Regenbogen-Split / chromatische Aberration), mit einem Geburts-Blitz beim Zünden.

   BEWUSST Canvas-2D (kein Pixi-Shader → mobiltauglich, wie ScorchFx). Board-weite Overlay-Canvas (panelRef). Werte 1:1
   aus dem Tuning-Board (Issue #324). */

// ── TUNE (finale Werte, Issue #324) ────────────────────────────────────────────
const TUNE = {
  // Kaskade
  WAVES: 5, STAGGER: 0.34, LIFE: 0.6,
  // Ring
  R_START: 0.02, R_END: 1.3, THICK: 0.02, ORIGIN_JIT: 0, ORIGIN_Y: 0.55,
  // Prisma
  BANDS: 14, SEP: 0.03, SAT: 1, HUE: 300,
  // Glühen
  GLOW: 2.2, FLASH: 1.4,
  // Look
  BRIGHT: 1, SCAN: 0.2,
  TAIL: 0.15,
};
const STD_A = "#31d0ff", STD_B = "#ff5db1"; // Deck-Duoton-Enden (Standard = Regenbogen)

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1)})`;
const easeOut = (t) => 1 - (1 - t) * (1 - t);
// HSL→RGB (h 0..1). Für das Standard-Regenbogenspektrum.
function hsl2rgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + h * 12) % 12; return (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))) * 255; };
  return [f(0), f(8), f(4)];
}

export default function PrismaKaskadeFx({ panelRef, cardRef = null, trigger = 0,
  deckColor = "#31d0ff", deckColor2 = null, deckTint = false, reduced = false, lite = false,
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
    let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, halfDiag = 0;
    let bt = 0, clock = 0, done = false, raf = 0, last = 0, disposed = false;
    const TOTAL = (TUNE.WAVES - 1) * TUNE.STAGGER + TUNE.LIFE;

    function measure() {
      const pr = panelRef?.current?.getBoundingClientRect();
      if (!pr || pr.width < 2) return false;
      DPR = Math.min(p.current.lite ? 1 : 1.25, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(pr.width)); H = Math.max(1, Math.round(pr.height));
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const cr = cardRef?.current?.getBoundingClientRect();
      cx = cr && cr.width > 2 ? (cr.left - pr.left + cr.width / 2) : W / 2;
      cy = H * TUNE.ORIGIN_Y; halfDiag = Math.hypot(W, H) / 2;
      return true;
    }

    function fire() { if (!measure()) return; bt = 0; done = false; p.current.onFire && p.current.onFire(); }

    function update(dt) {
      bt += dt * p.current.speed;
      if (bt > TOTAL + TUNE.TAIL) {
        if (p.current.loop) fire();
        else if (!done) { done = true; p.current.onDone && p.current.onDone(); }
      }
    }

    // Band-Farbe: Standard = Regenbogen (hsl2rgb über HUE°), Deckfarbe = Duoton A→B. SAT mischt zu Weiß.
    function prismColor(bu, dm, ca, cb) {
      const base = dm ? mix(ca, cb, bu) : hsl2rgb((bu * TUNE.HUE) / 360, 1, 0.55);
      return mix([255, 255, 255], base, TUNE.SAT);
    }

    function render() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
      const prog = clamp(bt / TOTAL, 0, 1);
      if (prog >= 1 && !p.current.loop) return;
      const dm = p.current.deckTint, ca = rgb(p.current.deckColor), cb = rgb(p.current.deckColor2 || p.current.deckColor);
      const nBands = p.current.lite ? Math.max(6, Math.round(TUNE.BANDS * 0.55)) : TUNE.BANDS;
      const thick = Math.max(1, TUNE.THICK * H);

      ctx.globalCompositeOperation = "lighter";
      for (let w = 0; w < TUNE.WAVES; w++) {
        const wt = bt - w * TUNE.STAGGER;
        if (wt < 0 || wt > TUNE.LIFE) continue;
        const wp = wt / TUNE.LIFE;
        const ringA = wp < 0.1 ? wp / 0.1 : Math.pow(1 - (wp - 0.1) / 0.9, 1.1); // Attack 10 % → Fade
        if (ringA <= 0.003) continue;
        const R = halfDiag * lerp(TUNE.R_START, TUNE.R_END, easeOut(wp));
        // Geburts-Blitz (radialer Weiß-Flash in den ersten ~14 %).
        if (wp < 0.14 && TUNE.FLASH > 0) {
          const fa = (1 - wp / 0.14) * TUNE.FLASH, fr = halfDiag * 0.28;
          const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, fr);
          fg.addColorStop(0, rgba([255, 255, 255], 0.85 * fa));
          fg.addColorStop(0.5, rgba(prismColor(0.5, dm, ca, cb), 0.4 * fa));
          fg.addColorStop(1, rgba([255, 255, 255], 0));
          ctx.fillStyle = fg; ctx.fillRect(cx - fr, cy - fr, fr * 2, fr * 2);
        }
        // Chromatische Bänder (konzentrische Strokes, radial getrennt = Aberration).
        for (let b = 0; b < nBands; b++) {
          const bu = nBands > 1 ? b / (nBands - 1) : 0.5;
          const rb = R + (bu - 0.5) * TUNE.SEP * TUNE.BANDS * H;
          if (rb <= 1) continue;
          ctx.strokeStyle = rgba(prismColor(bu, dm, ca, cb), 0.5 * TUNE.GLOW * ringA);
          ctx.lineWidth = thick; ctx.beginPath(); ctx.arc(cx, cy, rb, 0, TAU); ctx.stroke();
        }
      }

      if (TUNE.SCAN > 0 && !p.current.reduced) {
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.10 * TUNE.SCAN; ctx.fillStyle = "#000";
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
