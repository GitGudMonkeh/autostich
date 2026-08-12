import { useEffect, useRef } from "react";

/* #326 Gottgleich-Prunk „Supernova" (Legendär) — der Showstopper. Mehrphasig: Kollaps (Sterne + Ring werden in den Kern
   gesogen) → Detonation (Weiß-Flash mit chromatischer Spaltung, Screen-Shake, Zoom-Punch) → Boom-Schockwelle (dicke
   weiße Blast-Front) + chromatische Ringe + rotierender Strahlenkranz + Speed-Line-Streaks → Sternenregen mit langen
   Schweifen → und ein hinten offener Grid-Tunnel aus dem Einschlag, durch den man hindurchfliegt.

   Ebenen (Issue #326): der Grid-Tunnel liegt als EIGENE Canvas HINTER der Gegnerkarte (zClass="z-[9]"), die Explosion
   davor (z-[11]). Screen-Shake + Zoom-Punch werden als Canvas-Transform um beide Effekt-Ebenen gelegt (die Karte wackelt
   optisch mit dem Nova-Zoom mit); die GOTTGLEICH-Ansage (z-30) bleibt ruhig. Reduced-FX: Shake/Zoom/Flash gedämpft bzw.
   aus, Sternenzahl per fxScale runter. BEWUSST Canvas-2D (mobiltauglich, wie ScorchFx). Werte 1:1 aus Issue #326. */

// ── TUNE (finale Werte, Issue #326) ────────────────────────────────────────────
const TUNE = {
  // Timeline
  LIFE: 1.9, CHARGE: 0.16, FLASH: 2.7,
  // Wumms
  SHAKE: 1.4, ZOOM: 0.5, BOOM: 1.75, STREAK: 1.7,
  // Kern
  CORE_R: 0.6, CORE_GLOW: 2.8, POS_Y: 0.5,
  // Schockwelle
  RINGS: 6, RING_R: 2, CHROMA: 12, RING_SEP: 0.05, RING_THICK: 0.5,
  // Strahlen
  RAYS: 48, RAY_LEN: 1.1, RAY_SPIN: 0.8,
  // Sterne
  STARS: 240, STAR_SPEED: 1.55, STAR_SIZE: 2.6, STAR_TRAIL: 4, GRAVITY: 0,
  // Tunnel
  TUNNEL: 1.2, T_RINGS: 14, T_SPOKES: 24, T_SPEED: 3.4, T_GAMMA: 3.3, T_HOLE: 0.06, T_SPIN: -1,
  // Look
  BRIGHT: 1.1, SCAN: 0,
  TAIL: 0.15,
};
const STD_A = "#ffd24a", STD_B = "#ff2d9b";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1)})`;
const easeOut = (t) => 1 - (1 - t) * (1 - t);
function hsl2rgb(h, s, l) { const a = s * Math.min(l, 1 - l); const f = (n) => { const k = (n + h * 12) % 12; return (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))) * 255; }; return [f(0), f(8), f(4)]; }

export default function SupernovaFx({ panelRef, cardRef = null, trigger = 0,
  deckColor = "#ffd24a", deckColor2 = null, deckTint = false, reduced = false, lite = false,
  loop = false, speed = 1, onDone = null, onFire = null }) {
  const tunnelHostRef = useRef(null);
  const novaHostRef = useRef(null);
  const p = useRef({ deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire });
  p.current = { deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire };

  useEffect(() => {
    const th = tunnelHostRef.current, nh = novaHostRef.current; if (!th || !nh) return undefined;
    const mk = (host) => { const c = document.createElement("canvas"); c.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none"; host.appendChild(c); return c; };
    const tcv = mk(th), ncv = mk(nh); const tctx = tcv.getContext("2d"), nctx = ncv.getContext("2d");
    let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, diag = 0, halfDiag = 0;
    let bt = 0, clock = 0, done = false, raf = 0, last = 0, disposed = false;
    let stars = [];

    function buildStars() {
      const dm = p.current;
      const n = Math.round(TUNE.STARS * (dm.lite ? 0.4 : 1) * (dm.reduced ? 0.4 : 1));
      stars = new Array(n);
      for (let i = 0; i < n; i++) {
        const seed = i * 2.3 + trigger * 5;
        const rnd = (o) => { const x = Math.sin(seed * 12.9898 + o * 78.233) * 43758.5453; return x - Math.floor(x); };
        stars[i] = { ang: rnd(1) * TAU, spd: 0.5 + rnd(2) * 0.9, sz: 0.6 + rnd(3) * 0.9, startR: 0.6 + rnd(4) * 0.5, hue: rnd(5) };
      }
    }

    function measure() {
      const pr = panelRef?.current?.getBoundingClientRect();
      if (!pr || pr.width < 2) return false;
      DPR = Math.min(p.current.lite ? 1 : 1.25, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(pr.width)); H = Math.max(1, Math.round(pr.height));
      for (const c of [tcv, ncv]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); c.getContext("2d").setTransform(DPR, 0, 0, DPR, 0, 0); }
      const cr = cardRef?.current?.getBoundingClientRect();
      cx = cr && cr.width > 2 ? (cr.left - pr.left + cr.width / 2) : W / 2;
      cy = H * TUNE.POS_Y; diag = Math.hypot(W, H); halfDiag = diag / 2;
      return true;
    }

    function fire() { if (!measure()) return; buildStars(); bt = 0; done = false; p.current.onFire && p.current.onFire(); }

    function update(dt) {
      bt += dt * p.current.speed;
      if (bt > TUNE.LIFE + TUNE.TAIL) {
        if (p.current.loop) fire();
        else if (!done) { done = true; p.current.onDone && p.current.onDone(); }
      }
    }

    // Shake/Zoom-Transform um Kern (cy). Rumpeln beim Laden → harter Ruck bei Detonation, abklingend. Reduced → aus.
    function applyPunch(ctx, prog, cp, dp, det) {
      if (p.current.reduced) return;
      let shakeAmp = 0, zoom = 1;
      if (!det) { shakeAmp = TUNE.SHAKE * 0.25 * cp; }
      else { const d = dp; shakeAmp = TUNE.SHAKE * Math.exp(-d * 5) * (0.6 + 0.4); zoom = 1 + TUNE.ZOOM * Math.exp(-d * 6); }
      const sx = shakeAmp * diag * 0.012 * Math.sin(clock * 61 + 1), sy = shakeAmp * diag * 0.012 * Math.sin(clock * 53 + 2);
      ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy); ctx.translate(sx, sy);
    }

    // ── Grid-Tunnel (HINTER der Karte): Ringe + Speichen laufen zum offenen fernen Ende (T_HOLE), Sog per T_SPEED. ──
    function drawTunnel(prog) {
      tctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      tctx.globalCompositeOperation = "source-over"; tctx.globalAlpha = 1; tctx.clearRect(0, 0, W, H);
      if (TUNE.TUNNEL <= 0) return;
      const cp = prog / TUNE.CHARGE, det = prog >= TUNE.CHARGE, dp = det ? (prog - TUNE.CHARGE) / (1 - TUNE.CHARGE) : 0;
      const fadeIn = clamp(prog / 0.12, 0, 1), fadeOut = 1 - clamp((prog - 0.75) / 0.25, 0, 1);
      const A = TUNE.TUNNEL * fadeIn * fadeOut * TUNE.BRIGHT;
      if (A <= 0.003) return;
      tctx.save(); applyPunch(tctx, prog, cp, dp, det);
      const edge = halfDiag * 1.25, rIn = edge * TUNE.T_HOLE, spin = clock * TUNE.T_SPIN * 0.5;
      const dm = p.current.deckTint, ca = dm ? rgb(p.current.deckColor) : rgb(STD_A), cb = dm ? rgb(p.current.deckColor2 || p.current.deckColor) : rgb(STD_B);
      const flow = (bt * TUNE.T_SPEED * 0.12) % 1;
      tctx.globalCompositeOperation = "lighter"; tctx.lineWidth = Math.max(1, diag * 0.0025);
      // Ringe (Tiefe): f 0 (fern/klein) → 1 (nah/groß) mit Perspektive f^GAMMA. flow schiebt sie nach außen (Durchflug).
      for (let i = 0; i < TUNE.T_RINGS; i++) {
        let f = ((i + flow) / TUNE.T_RINGS);
        const r = rIn + (edge - rIn) * Math.pow(f, TUNE.T_GAMMA);
        const col = mix(ca, cb, f), a = A * (0.25 + 0.6 * f);
        tctx.strokeStyle = rgba(col, a); tctx.beginPath(); tctx.arc(cx, cy, r, 0, TAU); tctx.stroke();
      }
      // Radiale Speichen (vom offenen Loch nach außen), leicht rotierend.
      for (let s = 0; s < TUNE.T_SPOKES; s++) {
        const a = spin + (s / TUNE.T_SPOKES) * TAU, dx = Math.cos(a), dy = Math.sin(a);
        const g = tctx.createLinearGradient(cx + dx * rIn, cy + dy * rIn, cx + dx * edge, cy + dy * edge);
        g.addColorStop(0, rgba(mix(ca, cb, 0.3), 0)); g.addColorStop(1, rgba(mix(ca, cb, 0.9), A * 0.5));
        tctx.strokeStyle = g; tctx.beginPath(); tctx.moveTo(cx + dx * rIn, cy + dy * rIn); tctx.lineTo(cx + dx * edge, cy + dy * edge); tctx.stroke();
      }
      tctx.restore();
      tctx.globalAlpha = 1; tctx.globalCompositeOperation = "source-over";
    }

    // ── Explosion (VOR der Karte): Kern, Boom, chromatische Ringe, Strahlenkranz, Streaks, Sternenregen, Flash. ──
    function drawNova(prog) {
      const ctx = nctx;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
      const cp = clamp(prog / TUNE.CHARGE, 0, 1), det = prog >= TUNE.CHARGE, dp = det ? (prog - TUNE.CHARGE) / (1 - TUNE.CHARGE) : 0;
      const dm = p.current.deckTint, ca = dm ? rgb(p.current.deckColor) : rgb(STD_A), cb = dm ? rgb(p.current.deckColor2 || p.current.deckColor) : rgb(STD_B);
      const BR = TUNE.BRIGHT;
      ctx.save(); applyPunch(ctx, prog, cp, dp, det);
      ctx.globalCompositeOperation = "lighter";

      // Sternenregen: vor der Detonation einfallend (Kollaps), danach auswerfend mit Schweif.
      for (const st of stars) {
        const dx = Math.cos(st.ang), dy = Math.sin(st.ang);
        let r, a;
        if (!det) { r = st.startR * halfDiag * (1 - easeOut(cp)); a = 0.3 + 0.7 * cp; }
        else { r = dp * halfDiag * TUNE.RING_R * st.spd * TUNE.STAR_SPEED * 0.5; a = (1 - dp) * (1 - dp); }
        if (a <= 0.02) continue;
        const x = cx + dx * r, y = cy + dy * r + (det ? TUNE.GRAVITY * dp * dp * halfDiag : 0);
        const trailLen = (det ? TUNE.STAR_TRAIL : 1.5) * st.sz * (diag * 0.006);
        const col = dm ? mix(ca, cb, st.hue) : hsl2rgb(lerp(0.09, 0.92, st.hue), 0.7, 0.7);
        const g = ctx.createLinearGradient(x, y, x - dx * trailLen, y - dy * trailLen);
        g.addColorStop(0, rgba(mix(col, [255, 255, 255], 0.4), a)); g.addColorStop(1, rgba(col, 0));
        ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, TUNE.STAR_SIZE * st.sz * 0.5); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dx * trailLen, y - dy * trailLen); ctx.stroke();
      }

      if (det) {
        // Rotierender Strahlenkranz (früher Blast).
        const rayA = (1 - dp) * (1 - dp) * BR;
        if (rayA > 0.02) {
          const nRays = p.current.lite ? Math.round(TUNE.RAYS * 0.5) : TUNE.RAYS, rot = clock * TUNE.RAY_SPIN * TAU, len = halfDiag * TUNE.RAY_LEN * (0.4 + 0.6 * easeOut(dp));
          for (let i = 0; i < nRays; i++) {
            const a = rot + (i / nRays) * TAU, dx = Math.cos(a), dy = Math.sin(a);
            const g = ctx.createLinearGradient(cx, cy, cx + dx * len, cy + dy * len);
            g.addColorStop(0, rgba([255, 245, 220], 0.5 * rayA)); g.addColorStop(1, rgba(mix(ca, cb, 0.5), 0));
            ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, diag * 0.004); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * len, cy + dy * len); ctx.stroke();
          }
        }
        // Speed-Line-Streaks im Detonations-Moment (kurz).
        if (dp < 0.35 && TUNE.STREAK > 0) {
          const sa = (1 - dp / 0.35) * TUNE.STREAK, nS = p.current.lite ? 30 : 60;
          for (let i = 0; i < nS; i++) {
            const a = (i / nS) * TAU + trigger, dx = Math.cos(a), dy = Math.sin(a), r0 = halfDiag * 0.3, r1 = halfDiag * (0.7 + 0.5 * dp);
            const g = ctx.createLinearGradient(cx + dx * r0, cy + dy * r0, cx + dx * r1, cy + dy * r1);
            g.addColorStop(0, rgba([255, 255, 255], 0)); g.addColorStop(0.5, rgba([255, 255, 255], 0.5 * sa)); g.addColorStop(1, rgba([255, 255, 255], 0));
            ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, diag * 0.002); ctx.beginPath(); ctx.moveTo(cx + dx * r0, cy + dy * r0); ctx.lineTo(cx + dx * r1, cy + dy * r1); ctx.stroke();
          }
        }
        // Chromatische Schockwellen-Ringe (gestaffelt).
        const nBands = p.current.lite ? Math.max(5, Math.round(TUNE.CHROMA * 0.5)) : TUNE.CHROMA;
        for (let w = 0; w < TUNE.RINGS; w++) {
          const wt = dp - w * 0.06; if (wt < 0 || wt > 0.9) continue;
          const wp = wt / 0.9, R = halfDiag * TUNE.RING_R * easeOut(wp), rA = (wp < 0.1 ? wp / 0.1 : Math.pow(1 - (wp - 0.1) / 0.9, 1.2)) * BR;
          for (let b = 0; b < nBands; b++) {
            const bu = nBands > 1 ? b / (nBands - 1) : 0.5, rb = R + (bu - 0.5) * TUNE.RING_SEP * nBands * H;
            if (rb <= 1) continue;
            const col = dm ? mix(ca, cb, bu) : hsl2rgb(lerp(0.06, 0.95, bu), 1, 0.6);
            ctx.strokeStyle = rgba(col, 0.4 * rA); ctx.lineWidth = Math.max(1, TUNE.RING_THICK * H * 0.04); ctx.beginPath(); ctx.arc(cx, cy, rb, 0, TAU); ctx.stroke();
          }
        }
        // Dicke weiße Boom-Schockwelle (Blast-Front).
        if (TUNE.BOOM > 0) {
          const br = halfDiag * TUNE.RING_R * 0.9 * easeOut(dp), ba = (1 - dp) * (1 - dp) * TUNE.BOOM;
          ctx.strokeStyle = rgba([255, 255, 255], 0.5 * ba); ctx.lineWidth = Math.max(2, diag * 0.02 * (1 - dp)); ctx.beginPath(); ctx.arc(cx, cy, br, 0, TAU); ctx.stroke();
        }
      }

      // Heißer Kern (Feuerball) — lädt beim Kollaps, blitzt bei Detonation, glüht aus.
      const coreR = halfDiag * TUNE.CORE_R * (det ? (0.5 + 0.5 * (1 - dp)) : (0.15 + 0.55 * cp));
      const coreA = det ? (0.5 + 0.5 * (1 - dp)) : (0.4 + 0.6 * cp);
      const kg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(2, coreR));
      kg.addColorStop(0, rgba([255, 255, 255], 0.95 * coreA * TUNE.CORE_GLOW * 0.4));
      kg.addColorStop(0.35, rgba(mix([255, 255, 255], ca, 0.6), 0.6 * coreA));
      kg.addColorStop(0.7, rgba(mix(ca, cb, 0.5), 0.3 * coreA));
      kg.addColorStop(1, rgba(cb, 0));
      ctx.fillStyle = kg; ctx.fillRect(cx - coreR, cy - coreR, coreR * 2, coreR * 2);

      ctx.restore();

      // Detonations-Flash (Vollbild-Weiß + chromatische A/B-Spaltung) — NICHT vom Punch-Transform betroffen. Reduced: stark reduziert.
      if (det && dp < 0.3) {
        const fBase = (1 - dp / 0.3);
        const fa = fBase * (p.current.reduced ? 0.25 : 1) * Math.min(1, TUNE.FLASH * 0.4);
        if (fa > 0.01) {
          ctx.globalCompositeOperation = "lighter";
          if (!p.current.reduced) {
            const off = diag * 0.01 * fBase;
            ctx.globalAlpha = fa * 0.5; ctx.fillStyle = rgba(ca, 1); ctx.fillRect(-off, 0, W, H);
            ctx.fillStyle = rgba(cb, 1); ctx.fillRect(off, 0, W, H);
          }
          ctx.globalAlpha = fa * 0.7; ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
        }
      }
      if (TUNE.SCAN > 0 && !p.current.reduced) { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.10 * TUNE.SCAN; ctx.fillStyle = "#000"; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }

    function render() {
      const prog = clamp(bt / TUNE.LIFE, 0, 1);
      if (prog >= 1 && !p.current.loop) { tctx.clearRect(0, 0, tcv.width, tcv.height); nctx.clearRect(0, 0, ncv.width, ncv.height); return; }
      drawTunnel(prog); drawNova(prog);
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
    return () => { disposed = true; if (raf) cancelAnimationFrame(raf); try { th.removeChild(tcv); nh.removeChild(ncv); } catch { /* ignore */ } };
  }, [trigger, panelRef, cardRef]);

  return (
    <>
      <div ref={tunnelHostRef} aria-hidden="true" className="absolute inset-0 z-[9] pointer-events-none" />
      <div ref={novaHostRef} aria-hidden="true" className="absolute inset-0 z-[11] pointer-events-none" />
    </>
  );
}
