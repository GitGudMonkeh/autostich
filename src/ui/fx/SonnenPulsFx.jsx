import { useEffect, useRef } from "react";

/* #322 Gottgleich-Prunk „Sonnen-Puls" (Standard, freier Default) — die Outrun-Sonne bloomt EINMALIG hinter der
   Gegnerkarte auf: Scheibe mit vertikalem Sunset-Verlauf (oben→unten), horizontale Scanline-Lücken (nach unten dicker
   → klassischer Auflöse-Look), heißer Kern, weiche Korona und langsam drehende Lichtstrahlen. Ein Pop (Überschwingen)
   beim Aufblühen, kurzes Halten, Ausfaden.

   BEWUSST Canvas-2D (kein Pixi-Custom-Shader): Pixis Mesh/Filter-Shader rendern auf dem Mobile-Setup NICHT (siehe
   AuroraFieldGL/ScorchFx). Board-weite Overlay-Canvas (panelRef-Größe, nicht pro Karte); die Sonne wird auf ein
   Offscreen gebaut und die Streifen per `destination-out` ausgestanzt, damit der Board-Hintergrund nicht durchlöchert
   wird. Werte 1:1 aus dem Tuning-Board (Issue #322). */

// ── TUNE (finale Werte, Issue #322) ────────────────────────────────────────────
const TUNE = {
  // Puls
  LIFE: 0.9, RISE: 0.4, FADE: 0.42, POP: 2.95,
  // Sonne
  SIZE: 0.39, POS_Y: 0.5, SIZE_MIN: 0.55,
  // Streifen (Scanline-Lücken)
  STRIPE_START: 0.12, STRIPE_GAP: 0.15, STRIPE_SOLID: 0.13, STRIPE_GROW: 1.24,
  // Glühen
  GLOW: 1.95, GLOWR: 1.7, CORE: 0.8, RAYS: 0.35,
  // Look
  BRIGHT: 1, SCAN: 0.45,
  TAIL: 0.25, // kurzer Nachlauf (s), bevor „fertig"/Re-Fire
};
// Standard-Sunset-Palette (Verlauf oben→unten). Deckfarbe tönt zu den beiden Deck-Akzenten.
const STD_TOP = "#ff3d81", STD_BOT = "#ffb43d";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1)})`;

// Puls-Envelope: Aufblühen (RISE) mit Überschwingen (POP, easeOutBack-artig), Halten, Ausfaden (FADE).
function envelope(prog) {
  const rise = clamp(prog / TUNE.RISE, 0, 1);
  const fadeStart = 1 - TUNE.FADE;
  const fade = prog > fadeStart ? clamp((prog - fadeStart) / TUNE.FADE, 0, 1) : 0;
  const alpha = clamp(rise, 0, 1) * (1 - fade * fade);
  const inv = rise - 1;
  const back = 1 + TUNE.POP * inv * inv * inv + TUNE.POP * 0.6 * inv * inv; // 0→1 mit kurzem Overshoot >1
  const scale = TUNE.SIZE_MIN + (1 - TUNE.SIZE_MIN) * clamp(back, 0, 1.6);
  return { alpha, scale };
}

export default function SonnenPulsFx({ panelRef, cardRef = null, trigger = 0,
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
    const osc = document.createElement("canvas"); const octx = osc.getContext("2d");
    let W = 0, H = 0, DPR = 1, cx = 0, cy = 0;
    let bt = 0, clock = 0, done = false, raf = 0, last = 0, disposed = false;

    function measure() {
      const pr = panelRef?.current?.getBoundingClientRect();
      if (!pr || pr.width < 2) return false;
      DPR = Math.min(p.current.lite ? 1 : 1.25, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(pr.width)); H = Math.max(1, Math.round(pr.height));
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      osc.width = canvas.width; osc.height = canvas.height;
      // Sonne hinter der Karte: X = Kartenmitte (falls bekannt), sonst Board-Mitte; Y = POS_Y des Boards.
      const cr = cardRef?.current?.getBoundingClientRect();
      cx = cr && cr.width > 2 ? (cr.left - pr.left + cr.width / 2) : W / 2;
      cy = H * TUNE.POS_Y;
      return true;
    }

    function fire() { if (!measure()) return; bt = 0; done = false; p.current.onFire && p.current.onFire(); }

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
      const dt2 = p.current.deckTint, dr = rgb(p.current.deckColor), dr2 = rgb(p.current.deckColor2 || p.current.deckColor);
      const top = dt2 ? dr : rgb(STD_TOP), bot = dt2 ? dr2 : rgb(STD_BOT);
      const R = Math.max(4, H * TUNE.SIZE * env.scale);
      const glowScale = p.current.lite ? 0.8 : 1;

      // 1) Weiche Korona HINTER der Sonne (additiv).
      ctx.globalCompositeOperation = "lighter";
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * TUNE.GLOWR);
      const cm = mix(top, bot, 0.5);
      gr.addColorStop(0, rgba(cm, 0.55 * TUNE.GLOW * glowScale * A));
      gr.addColorStop(0.45, rgba(cm, 0.22 * TUNE.GLOW * glowScale * A));
      gr.addColorStop(1, rgba(cm, 0));
      ctx.fillStyle = gr; ctx.fillRect(cx - R * TUNE.GLOWR, cy - R * TUNE.GLOWR, R * TUNE.GLOWR * 2, R * TUNE.GLOWR * 2);

      // 2) Drehende Lichtstrahlen (additiv, langsame Rotation) — unter der Scheibe.
      if (TUNE.RAYS > 0 && !p.current.reduced) {
        const nRays = p.current.lite ? 10 : 16;
        const rot = clock * 0.25;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
        for (let i = 0; i < nRays; i++) {
          const a = (i / nRays) * TAU, len = R * (1.35 + 0.25 * Math.sin(clock * 1.3 + i));
          const rg = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
          rg.addColorStop(0, rgba(mix(top, bot, 0.4), 0.5 * TUNE.RAYS * A));
          rg.addColorStop(1, rgba(mix(top, bot, 0.4), 0));
          ctx.strokeStyle = rg; ctx.lineWidth = Math.max(1, R * 0.05); ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.stroke();
        }
        ctx.restore();
      }

      // 3) Die Sonnenscheibe auf ein Offscreen (Verlauf oben→unten), Streifen per destination-out ausgestanzt.
      octx.setTransform(DPR, 0, 0, DPR, 0, 0);
      octx.globalCompositeOperation = "source-over"; octx.globalAlpha = 1; octx.clearRect(0, 0, W, H);
      octx.save(); octx.beginPath(); octx.arc(cx, cy, R, 0, TAU); octx.clip();
      const vg = octx.createLinearGradient(0, cy - R, 0, cy + R);
      vg.addColorStop(0, rgba(top, 1)); vg.addColorStop(0.5, rgba(mix(top, bot, 0.5), 1)); vg.addColorStop(1, rgba(bot, 1));
      octx.fillStyle = vg; octx.fillRect(cx - R, cy - R, R * 2, R * 2);
      // Streifen: ab STRIPE_START unter der Mitte; solide Bänder bleiben, Lücken werden gestanzt und wachsen nach unten.
      octx.globalCompositeOperation = "destination-out"; octx.fillStyle = "#000";
      let yy = cy + R * TUNE.STRIPE_START; let gapH = R * TUNE.STRIPE_GAP * 0.5; const solidH = R * TUNE.STRIPE_SOLID;
      let guard = 0;
      while (yy < cy + R && guard++ < 64) {
        yy += solidH;
        octx.fillRect(cx - R, yy, R * 2, gapH);
        yy += gapH; gapH *= TUNE.STRIPE_GROW;
      }
      octx.restore();
      // Scheibe additiv ins Board (glüht) + zusätzlicher normaler Pass für Sättigung.
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = A;
      ctx.drawImage(osc, 0, 0, canvas.width, canvas.height, 0, 0, W, H);
      ctx.globalAlpha = A * 0.55; ctx.drawImage(osc, 0, 0, canvas.width, canvas.height, 0, 0, W, H);

      // 4) Heißer weißer Kern (additiv, oben-mittig auf der Scheibe).
      if (TUNE.CORE > 0) {
        const kr = R * 0.5, kx = cx, ky = cy - R * 0.12;
        const kg = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
        kg.addColorStop(0, rgba([255, 250, 240], 0.9 * TUNE.CORE * A));
        kg.addColorStop(0.5, rgba(mix([255, 255, 255], top, 0.5), 0.35 * TUNE.CORE * A));
        kg.addColorStop(1, rgba(top, 0));
        ctx.globalAlpha = 1; ctx.fillStyle = kg; ctx.fillRect(kx - kr, ky - kr, kr * 2, kr * 2);
      }

      // 5) Board-Scanline-Overlay (leichte horizontale Linien übers ganze Feld).
      if (TUNE.SCAN > 0 && !p.current.reduced) {
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.10 * TUNE.SCAN * A;
        ctx.fillStyle = "#000";
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
