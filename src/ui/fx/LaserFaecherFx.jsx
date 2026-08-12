import { useEffect, useRef } from "react";

/* #323 Gottgleich-Prunk „Laser-Fächer" (Selten) — scharfe Neon-Laser fächern aus der Kartenmitte (hinter der Karte)
   auf: abwechselnd lange Haupt- und kurze Nebenstrahlen (Sonnenstrahl-Look), jeder ein Kegel-Dreieck von der Nabe zur
   Spitze mit Verlauf (hell an der Nabe → transparent) + heller Kernlinie, dazu eine aufleuchtende Nabe. Sie öffnen mit
   Pop-Über-Öffnen, DREHEN langsam weiter und faden aus.

   BEWUSST Canvas-2D (kein Pixi-Shader → mobiltauglich, wie ScorchFx). Board-weite Overlay-Canvas (panelRef). Werte 1:1
   aus dem Tuning-Board (Issue #323). */

// ── TUNE (finale Werte, Issue #323) ────────────────────────────────────────────
const TUNE = {
  // Puls
  LIFE: 1, RISE: 0.05, FADE: 0.37, POP: 2.15,
  // Fächer
  SPOKES: 48, SPREAD: 1, RAY_W: 0.11, LEN: 1.6, ALT: 0.55, ORIGIN_Y: 0.59, SIZE_MIN: 0.65,
  // Bewegung
  SPIN: 0.1, OPEN: 1,
  // Glühen
  CORE: 1.7, GLOW: 1, BEAM: 1.4, FLICKER: 0.8,
  // Look
  BRIGHT: 1, SCAN: 0,
  TAIL: 0.2,
};
const STD_A = "#2ff0ff", STD_B = "#ff2d9b";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1)})`;
const wrapPi = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

// Envelope: Auffächern (RISE) mit Überschwingen (POP), Halten, Ausfaden (FADE). openF steuert das Bündel→Fächer.
function envelope(prog) {
  const rise = clamp(prog / TUNE.RISE, 0, 1);
  const fadeStart = 1 - TUNE.FADE;
  const fade = prog > fadeStart ? clamp((prog - fadeStart) / TUNE.FADE, 0, 1) : 0;
  const alpha = clamp(rise, 0, 1) * (1 - fade);
  const inv = rise - 1;
  const back = 1 + TUNE.POP * inv * inv * inv + TUNE.POP * 0.6 * inv * inv;
  const lenScale = TUNE.SIZE_MIN + (1 - TUNE.SIZE_MIN) * clamp(back, 0, 1.5);
  // OPEN: 1 = fächert aus schmalem Bündel auf, 0 = sofort offen. bundle 0..1 (Anteil des vollen Bogens).
  const ease = 1 - (1 - rise) * (1 - rise);
  const bundle = 1 - TUNE.OPEN * (1 - ease);
  return { alpha, lenScale, bundle };
}

export default function LaserFaecherFx({ panelRef, cardRef = null, trigger = 0,
  deckColor = "#2ff0ff", deckColor2 = null, deckTint = false, reduced = false, lite = false,
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
    let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, diag = 0, rotBase = 0;
    let bt = 0, clock = 0, done = false, raf = 0, last = 0, disposed = false;

    function measure() {
      const pr = panelRef?.current?.getBoundingClientRect();
      if (!pr || pr.width < 2) return false;
      DPR = Math.min(p.current.lite ? 1 : 1.25, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(pr.width)); H = Math.max(1, Math.round(pr.height));
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const cr = cardRef?.current?.getBoundingClientRect();
      cx = cr && cr.width > 2 ? (cr.left - pr.left + cr.width / 2) : W / 2;
      cy = H * TUNE.ORIGIN_Y; diag = Math.hypot(W, H);
      return true;
    }

    function fire() { if (!measure()) return; bt = 0; done = false; rotBase = (trigger * 1.3 + 0.7) % TAU; p.current.onFire && p.current.onFire(); }

    function update(dt) {
      bt += dt * p.current.speed;
      if (bt > TUNE.LIFE + TUNE.TAIL) {
        if (p.current.loop) fire();
        else if (!done) { done = true; p.current.onDone && p.current.onDone(); }
      }
    }

    function render() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
      const prog = clamp(bt / TUNE.LIFE, 0, 1);
      if (prog >= 1 && !p.current.loop) return;
      const env = envelope(prog);
      const A = env.alpha * TUNE.BRIGHT;
      if (A <= 0.002) return;
      const dm = p.current.deckTint, dr = rgb(p.current.deckColor), dr2 = rgb(p.current.deckColor2 || p.current.deckColor);
      const ca = dm ? dr : rgb(STD_A), cb = dm ? dr2 : rgb(STD_B);
      const nSpokes = p.current.lite ? Math.round(TUNE.SPOKES * 0.5) : TUNE.SPOKES;
      const rot = rotBase + clock * TUNE.SPIN * TAU;
      const halfW = TUNE.RAY_W; // Kegel-Halbwinkel (rad)

      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < nSpokes; i++) {
        const u = nSpokes > 1 ? i / (nSpokes - 1) : 0;
        // Winkel gleichmäßig über den (öffnenden) Bogen; SPREAD skaliert den Gesamtbogen (1 = rundum).
        const spread = TUNE.SPREAD * env.bundle;
        const ang = rot + wrapPi((i / nSpokes) * TAU) * spread;
        const flick = 1 - TUNE.FLICKER * 0.5 * (0.5 + 0.5 * Math.sin(clock * 22 + i * 1.7));
        const len = diag * TUNE.LEN * env.lenScale * ((i % 2) ? TUNE.ALT : 1) * (0.5 + 0.5 * flick);
        const col = mix(ca, cb, u);
        const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx; // Strahl-Richtung + Normale
        const tipX = cx + dx * len, tipY = cy + dy * len;
        const baseHalf = Math.max(1.5, len * halfW);
        // Kegel-Dreieck (Nabe → Spitze), Verlauf hell an der Nabe → transparent an der Spitze.
        const g = ctx.createLinearGradient(cx, cy, tipX, tipY);
        g.addColorStop(0, rgba(col, 0.9 * TUNE.BEAM * A * flick));
        g.addColorStop(0.6, rgba(col, 0.28 * TUNE.BEAM * A * flick));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g; ctx.beginPath();
        ctx.moveTo(cx + px * 2, cy + py * 2);
        ctx.lineTo(tipX + px * baseHalf, tipY + py * baseHalf);
        ctx.lineTo(tipX - px * baseHalf, tipY - py * baseHalf);
        ctx.closePath(); ctx.fill();
        // Helle Kernlinie mittig auf dem Strahl.
        const lg = ctx.createLinearGradient(cx, cy, tipX, tipY);
        lg.addColorStop(0, rgba(mix(col, [255, 255, 255], 0.7), 0.9 * TUNE.GLOW * A * flick));
        lg.addColorStop(1, rgba(col, 0));
        ctx.strokeStyle = lg; ctx.lineWidth = Math.max(1, diag * 0.0032); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tipX, tipY); ctx.stroke();
      }

      // Aufleuchtende Nabe (Kern-Glow).
      if (TUNE.CORE > 0) {
        const kr = diag * 0.06 * (0.7 + 0.3 * env.lenScale);
        const kg = ctx.createRadialGradient(cx, cy, 0, cx, cy, kr);
        kg.addColorStop(0, rgba([255, 255, 255], 0.9 * TUNE.CORE * A));
        kg.addColorStop(0.4, rgba(mix(ca, cb, 0.5), 0.5 * TUNE.CORE * A));
        kg.addColorStop(1, rgba(mix(ca, cb, 0.5), 0));
        ctx.fillStyle = kg; ctx.fillRect(cx - kr, cy - kr, kr * 2, kr * 2);
      }

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
