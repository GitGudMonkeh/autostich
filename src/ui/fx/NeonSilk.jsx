import { useEffect, useRef } from "react";

/* Archetyp-Karteneffekt „Feuer" als Neon-Seide — Hitze-Zustands-Anzeige am eigenen Kartenkopf (ersetzt FireHead).
   Weiche, halbtransparente Neon-„Seiden"-Bänder sitzen am Kartenkopf und laufen nach oben zu (Flammenform, unten breit).
   Sie drehen & überlappen sich; Weiß entsteht NUR dort, wo Flächen additiv überlappen — sonst bleibt alles soft.
   Vertikaler Verlauf: unten blau → Mitte magenta → oben rot glühend. Die HITZE (0..1) steuert die Höhe (kürzt die Bänder,
   staucht NICHT), Helligkeit und das Tempo — bei Hitze 0 ist der Effekt aus. Renderer + TUNE 1:1 aus dem Tuning-Board
   (docs/prototypes/neonseide-tuning.html).

   BEWUSST Canvas-2D (kein Pixi-Custom-Shader): Pixis Mesh/Filter-Shader rendern auf dem Mobile-Setup NICHT (siehe
   AuroraFieldGL). Nur weiche Polygon-Fills (additiv) → auf dem Handy tragbar. Eigene Canvas, per rAF, absolut über dem
   Panel, an der (stabilen) Deck-Karte via cardRef/panelRef verankert. Der rAF läuft nur bei Hitze > 0 & sichtbarem Tab. */

// ── TUNE (Board-DEFAULTS aus neonseide-tuning.html) ────────────────────────────
const TUNE = {
  COL_BOT: "#2f6bff", COL_MID: "#ff2ea0", COL_TOP: "#ff4a2a",

  RIBBONS: 6, WIDTH: 58, TWIST_FREQ: 2.7, TWIST_SPEED: 2.9, MEANDER: 19, MEANDER_FREQ: 3, CONVERGE: 0.72, DRIFT: 0.05, HVAR: 0, FLOW: 3, SPEED: 2.25, HEIGHT: 0.62,

  FLICKER: 0.08, EDGE_LINES: 0, SHEET_ALPHA: 0.4, BRIGHT: 0.8, BLOOM: 1.4, STARS: 0,
};

const TAU = Math.PI * 2;
const HEAT_EPS = 0.0005;
// ── Platzierung am Kartenkopf (nachdrehbar) ──
const PUSH_DOWN_PX = 14;   // Effekt-Basis um N CSS-px NACH UNTEN (tiefer, sitzt besser HINTER der Karte — der untere Teil verschwindet hinter dem Kartenrand).
const SIDE_SCALE = 0.80;   // horizontale Stauchung um die Kartenmitte (Bänder + Seiten-Schwünge schmaler → laufen nicht mehr über den Kartenrand).
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function hexRGB(h) { let s = String(h || "#2f6bff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
const rgba = (c, a) => "rgba(" + (c.r | 0) + "," + (c.g | 0) + "," + (c.b | 0) + "," + a + ")";
const mix = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Vorberechnete Verlaufsfarben (Verlauf ist fix → einmal parsen).
const C_BOT = hexRGB(TUNE.COL_BOT), C_MID = hexRGB(TUNE.COL_MID), C_TOP = hexRGB(TUNE.COL_TOP), WHITE = { r: 255, g: 255, b: 255 };

export function NeonSilk({ heat = 0, panelRef, cardRef }) {
  const hostRef = useRef(null);
  const stateRef = useRef({ heat });
  stateRef.current = { heat };
  const syncRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, DPR = 1;
    let cardX = 0, cardY = 0, cardW = 0, cardH = 0;
    let ribbons = [];
    let time = 0, curSpd = 1, raf = 0, last = 0, disposed = false, cleared = false;

    // Bänder-Layout deterministisch (fixer Seed → ruhiges, gleichbleibendes Muster, keine per-Frame-Random-Sprünge).
    (function buildRibbons() {
      ribbons = []; const rng = mulberry32(20260812);
      for (let i = 0; i < TUNE.RIBBONS; i++) {
        ribbons.push({
          xf: 0.14 + 0.72 * ((i + 0.5) / TUNE.RIBBONS) + (rng() - 0.5) * 0.08,
          mAmp: 0.5 + rng() * 1.1, mFreq: 0.6 + rng() * 1.1, mPhase: rng() * TAU,
          twFreq: 0.6 + rng() * 1.0, twSpd: 0.6 + rng() * 0.9, twPhase: rng() * TAU,
          wScale: 0.7 + rng() * 0.7, speed: 0.55 + rng() * 1.0, hRand: rng(),
          lean: (rng() - 0.5) * 0.20,
          driftFreq: 0.5 + rng() * 1.1, driftSpd: 0.5 + rng() * 1.1, driftPhase: rng() * TAU,
        });
      }
    })();

    function measure() {
      const pr = panelRef?.current?.getBoundingClientRect();
      const cr = cardRef?.current?.getBoundingClientRect();
      if (!pr || !cr || pr.width < 2 || cr.width < 8) return false;
      DPR = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(pr.width)), h = Math.max(1, Math.round(pr.height));
      if (w !== W || h !== H) { W = w; H = h; canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); }
      cardX = cr.left - pr.left; cardY = cr.top - pr.top; cardW = cr.width; cardH = cr.height;
      // Karte weggeflogen/außerhalb → Effekt nicht hängen lassen.
      const ccx = cardX + cardW / 2, ccy = cardY + cardH / 2;
      if (ccx < -cardW || ccx > W + cardW || ccy < -cardH || ccy > H + cardH) return false;
      return true;
    }

    function clear() { if (cleared) return; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); cleared = true; }

    // Ein Band als Polygonzug (unten breit → oben zulaufend, Flammenform). 1:1 aus dem Board.
    function ribbonPts(rb, baseY, Hgt) {
      const segs = 44, raw = []; const cx = cardX + cardW * 0.5, baseXpx = cardX + rb.xf * cardW;
      const Hb = Hgt * (1 - rb.hRand * TUNE.HVAR);
      for (let i = 0; i <= segs; i++) {
        const s = i / segs, d = s * Hb, y = baseY - d;
        const spread = Math.pow(1 - s, 0.75);
        let xEnv = baseXpx + (cx - baseXpx) * TUNE.CONVERGE * s;
        xEnv += rb.lean * d;
        const mAmp = TUNE.MEANDER * rb.mAmp * (0.30 + 0.70 * spread);
        const mk = TUNE.MEANDER_FREQ * 0.011;
        const drift = Math.sin(d * rb.driftFreq * 0.006 + time * 0.0004 * rb.driftSpd * curSpd + rb.driftPhase) * TUNE.DRIFT * 24 * (0.4 + 0.6 * spread);
        const x = xEnv + drift
          + Math.sin(d * mk * rb.mFreq + time * 0.00045 * TUNE.FLOW * rb.speed * curSpd + rb.mPhase) * mAmp
          + Math.sin(d * mk * 1.9 * rb.mFreq - time * 0.0003 * TUNE.FLOW * curSpd + rb.mPhase) * mAmp * 0.35;
        const tw = d * TUNE.TWIST_FREQ * 0.013 * rb.twFreq + time * 0.0006 * TUNE.TWIST_SPEED * rb.twSpd * curSpd + rb.twPhase;
        const ac = Math.abs(Math.cos(tw));
        const et = Math.min(1, s / 0.05) * Math.min(1, (1 - s) / 0.12);
        const xc = cx + (x - cx) * SIDE_SCALE;   // horizontal um die Kartenmitte stauchen (kein Über-den-Rand)
        const w = TUNE.WIDTH * SIDE_SCALE * rb.wScale * (0.5 + 0.5 * ac) * et * (0.28 + 0.72 * spread);
        raw.push({ x: xc, y, w, et: Math.max(0, et) });
      }
      for (let i = 0; i < raw.length; i++) {
        const a = raw[Math.max(0, i - 1)], bb = raw[Math.min(raw.length - 1, i + 1)];
        const dx = bb.x - a.x, dy = bb.y - a.y, L = Math.hypot(dx, dy) || 1; raw[i].nx = -dy / L; raw[i].ny = dx / L;
      }
      return raw;
    }
    function fillStrip(pts, wmul, style, alpha) {
      if (alpha <= 0) return; ctx.globalAlpha = alpha; ctx.fillStyle = style; ctx.beginPath();
      const n = pts.length; let i, pt, w;
      for (i = 0; i < n; i++) { pt = pts[i]; w = pt.w * wmul * 0.5; const X = pt.x + pt.nx * w, Y = pt.y + pt.ny * w; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      for (i = n - 1; i >= 0; i--) { pt = pts[i]; w = pt.w * wmul * 0.5; ctx.lineTo(pt.x - pt.nx * w, pt.y - pt.ny * w); }
      ctx.closePath(); ctx.fill();
    }
    function strokeEdge(pts, sign, style, alpha) {
      if (alpha <= 0) return; ctx.globalAlpha = alpha; ctx.strokeStyle = style; ctx.lineWidth = 1; ctx.lineJoin = "round"; ctx.beginPath();
      for (let i = 0; i < pts.length; i++) { const pt = pts[i], w = pt.w * 0.5 * sign; const X = pt.x + pt.nx * w, Y = pt.y + pt.ny * w; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.stroke();
    }

    function render(heat) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H); cleared = false;

      curSpd = (0.5 + 1.0 * heat) * TUNE.SPEED;
      const tf = time * TUNE.SPEED;
      const flick = Math.max(0.4, 1 + TUNE.FLICKER * heat * (0.5 * Math.sin(tf * 0.019) + 0.3 * Math.sin(tf * 0.033 + 1.7) + 0.22 * Math.sin(tf * 0.071 + 0.4)));
      const hflick = 1 + 0.06 * TUNE.FLICKER * heat * Math.sin(tf * 0.024 + 0.6);
      const baseY = cardY + PUSH_DOWN_PX;               // Flammen-Basis: um PUSH_DOWN_PX unter den Kartenkopf → sitzt tiefer hinter der Karte
      const Hgt = TUNE.HEIGHT * cardH * heat * hflick;   // Hitze kürzt die Bänder (staucht NICHT)
      if (Hgt <= 6) return;

      const topY = baseY - Math.max(1, Hgt);
      const grad = ctx.createLinearGradient(0, baseY, 0, topY);
      grad.addColorStop(0, rgba(C_BOT, 1)); grad.addColorStop(0.5, rgba(C_MID, 1)); grad.addColorStop(1, rgba(C_TOP, 1));
      let gradL = null;
      if (TUNE.EDGE_LINES > 0) {
        gradL = ctx.createLinearGradient(0, baseY, 0, topY);
        gradL.addColorStop(0, rgba(mix(C_BOT, WHITE, 0.55), 1)); gradL.addColorStop(0.5, rgba(mix(C_MID, WHITE, 0.55), 1)); gradL.addColorStop(1, rgba(mix(C_TOP, WHITE, 0.55), 1));
      }

      // Basis-Bloom (blau) — flache Ellipse am Kartenkopf, auf Kartenbreite geclippt (kein Überstand).
      if (TUNE.BLOOM > 0) {
        ctx.globalCompositeOperation = "lighter"; const cx0 = cardX + cardW / 2, rB = cardW * 0.5;
        ctx.save(); ctx.beginPath(); ctx.rect(cardX, 0, cardW, H); ctx.clip();
        ctx.translate(cx0, baseY); ctx.scale(1, 0.42);
        const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, rB);
        bg.addColorStop(0, rgba(C_BOT, 0.5 * TUNE.BLOOM * heat)); bg.addColorStop(1, rgba(C_BOT, 0));
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, rB, 0, TAU); ctx.fill(); ctx.restore();
      }

      // Seiden-Bänder additiv geschichtet — Weiß entsteht NUR aus Überlappung.
      ctx.globalCompositeOperation = "lighter";
      const A = TUNE.SHEET_ALPHA * TUNE.BRIGHT * heat * flick;
      for (let r = 0; r < ribbons.length; r++) {
        const pts = ribbonPts(ribbons[r], baseY, Hgt);
        fillStrip(pts, 3.0, grad, 0.12 * A);
        fillStrip(pts, 1.7, grad, 0.28 * A);
        fillStrip(pts, 0.9, grad, 0.5 * A);
        if (TUNE.EDGE_LINES > 0) { const ea = 0.22 * TUNE.EDGE_LINES * heat * flick; strokeEdge(pts, 1, gradL, ea); strokeEdge(pts, -1, gradL, ea); }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }

    function frame(now) {
      if (disposed) return;
      time += Math.min(50, now - last); last = now;
      const heat = clamp(stateRef.current.heat || 0, 0, 1);
      if (heat <= HEAT_EPS || !measure()) { clear(); raf = 0; return; }   // Hitze aus → rAF anhalten (wird über heat-Effekt neu gestartet)
      render(heat);
      raf = requestAnimationFrame(frame);
    }

    // Startet/stoppt den rAF anhand Hitze & Tab-Sichtbarkeit (wie FireHeads Ticker start/stop → kein Leerlauf).
    function ensureRun() {
      if (disposed) return;
      const run = (stateRef.current.heat || 0) > HEAT_EPS && document.visibilityState !== "hidden";
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
  }, [panelRef, cardRef]);

  // Hitze-Wechsel (0 ↔ >0) startet/stoppt den Loop, ohne die Canvas neu zu bauen.
  useEffect(() => { syncRef.current?.(); }, [heat]);

  // z-9 = UNTER der gespielten Karte (Kartenreihe z-10): das Feuer gehört zum Deck DAHINTER; die Bänder lodern trotzdem
  // sichtbar über die Oberkante hinaus (dort ist nichts, was sie verdeckt), die Kartenfläche selbst bleibt sauber.
  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9 }} />;
}

export default NeonSilk;
