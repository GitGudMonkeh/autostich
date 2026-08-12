import { useEffect, useRef } from "react";

/* Archetyp-Karteneffekt „Blitz" · Ionensturm-Rahmen als KIND der Kartenvorderseite (Canvas-2D).
   Um eine VOLL ionisierte Karte (ionStacks >= ION_MAX_STACKS) zucken Blitze: ein bewegter, gezackter Blitzrahmen um die
   Kartenkante (leises Dauer-Knistern + wandernde Runner-Bögen), dazu ab und an ein Cross-Arc quer über die Karte.

   #flip-fix-Nachzug (2026-08-12): Früher ein Pixi-Panel-Overlay (eigene WebGL-`Application`) auf z-11 ÜBER den Karten.
   Jetzt — wie EdgeGlow/Moos/Eis — als flippendes KIND in der Kartenvorderseite: liegt auf der EdgeGlow-Ebene (z-0), also
   ZWISCHEN Karte und Eis (z-1)/Moos (z-2). Es flippt/dealt/fliegt via CSS-Transform-Vererbung mit der Karte mit (kein
   Positions-Tracking/Opacity-Spiegeln mehr nötig). Renderer (buildPerim/drawBolt/Runner/Cross-Arcs) 1:1 aus IonStorm,
   nur von Pixi-`Graphics` auf Canvas-2D (`lighter`) portiert — spart den WebGL-Kontext (mobiltauglich, analog Moos/Eis). */

const TUNE = {
  N_PERIM: 56,         // Perimeter-Stützpunkte (Auflösung des Rahmens)
  INSET: 0,            // Rahmen leicht in die Karte gezogen (px), Jitter schlägt nach außen aus
  CORNER: 13,          // Eck-Radius der Karte (rounded-xl ≈ 12px)

  RUNNERS: 3,          // wandernde Blitz-Bögen
  RUN_SPAN: 0.4,       // Anteil des Perimeters je Runner
  RUN_SPEED: 0,        // Perimeter-Umläufe pro Sekunde (Wander-Tempo; 0 = stehende Bögen)
  RUN_SUB: 1,          // Teilstücke je Runner (für Kopf/Schwanz-Ausblendung)

  JIT_AMP: 5.5,        // Zacken-Amplitude senkrecht zur Kante (px)
  TAN_JIT: 3,          // Zacken entlang der Kante (px)
  RESEED_MS: 50,       // Neuwürfel-Takt der Zacken (Knister-Frequenz)

  HUM_AMP: 0.5,        // Amplitude des Dauer-Knisterns (ganze Kontur)
  HUM_ALPHA: 0.19,     // Grund-Helligkeit des Knisterns
  HUM_RESEED_MS: 120,

  ARC_MIN_MS: 380,     // Cross-Arc: min/max Pause zwischen zwei Bögen
  ARC_MAX_MS: 1280,
  ARC_LIFE_MS: 210,    // Lebensdauer eines Cross-Arcs
  ARC_SEGS: 15,        // Auflösung des Quer-Bogens
  ARC_AMP: 20,         // seitliche Auslenkung des Quer-Bogens (px)
  ARC_FLICK_MS: 42,    // Neuwürfel-Takt während der Arc-Lebensdauer (2–4 Flacker)
  FORK_CHANCE: 1,      // Chance auf eine Gabelung

  // Strichbreiten (CSS-px).
  W_GLOW: 9.1, W_MID: 0.5, W_CORE: 0.6,
};

// Deterministischer 0..1-Hash und -1..1-Signjitter.
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const sjit = (a, b) => hash(a, b) * 2 - 1;

// Rounded-Rect-Perimeter (0,0)-(w,h) in N Stützpunkte mit Außen-Normale sampeln.
function buildPerim(w, h, cr, N) {
  cr = Math.max(0, Math.min(cr, w / 2, h / 2));
  const HP = Math.PI / 2;
  const line = (x0, y0, x1, y1, nx, ny) => ({ t: "l", x0, y0, x1, y1, nx, ny, len: Math.hypot(x1 - x0, y1 - y0) });
  const arc = (cx, cy, a0, a1) => ({ t: "a", cx, cy, a0, a1, r: cr, len: Math.abs(a1 - a0) * cr });
  const segs = [
    line(cr, 0, w - cr, 0, 0, -1),
    arc(w - cr, cr, -HP, 0),
    line(w, cr, w, h - cr, 1, 0),
    arc(w - cr, h - cr, 0, HP),
    line(w - cr, h, cr, h, 0, 1),
    arc(cr, h - cr, HP, Math.PI),
    line(0, h - cr, 0, cr, -1, 0),
    arc(cr, cr, Math.PI, Math.PI * 1.5),
  ];
  const total = segs.reduce((s, g) => s + g.len, 0) || 1;
  const pts = [];
  for (let i = 0; i < N; i++) {
    let d = (i / N) * total, k = 0;
    while (k < segs.length - 1 && d > segs[k].len) { d -= segs[k].len; k++; }
    const g = segs[k];
    const u = g.len ? d / g.len : 0;
    if (g.t === "l") {
      pts.push({ x: g.x0 + (g.x1 - g.x0) * u, y: g.y0 + (g.y1 - g.y0) * u, nx: g.nx, ny: g.ny });
    } else {
      const a = g.a0 + (g.a1 - g.a0) * u, nx = Math.cos(a), ny = Math.sin(a);
      pts.push({ x: g.cx + nx * g.r, y: g.cy + ny * g.r, nx, ny });
    }
  }
  return pts;
}

export function CardIonStorm({ active = false, color = "#5ec8f0", reduced = false }) {
  const hostRef = useRef(null);
  const stateRef = useRef({ active, reduced, color });
  stateRef.current = { active, reduced, color };
  const syncRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;pointer-events:none;display:block";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const MGN = Math.ceil(TUNE.JIT_AMP + TUNE.W_GLOW * 0.5 + 3);   // Rand für nach AUSSEN blutende Zacken/Glow
    let cw = 0, ch = 0, DPR = 1, clockT = 0, last = 0, raf = 0, disposed = false;
    let perim = { w: 0, h: 0, pts: [] };
    const arcs = [];
    let nextArc = 0;

    function size() {
      const w = host.clientWidth, h = host.clientHeight;
      if (w < 4 || h < 4) return false;
      DPR = Math.min(2, window.devicePixelRatio || 1);
      if (w !== cw || h !== ch) {
        cw = w; ch = h;
        canvas.style.left = (-MGN) + "px"; canvas.style.top = (-MGN) + "px";
        canvas.style.width = (cw + 2 * MGN) + "px"; canvas.style.height = (ch + 2 * MGN) + "px";
        canvas.width = Math.round((cw + 2 * MGN) * DPR); canvas.height = Math.round((ch + 2 * MGN) * DPR);
      }
      return true;
    }

    // Eine Polylinie in drei Pässen (breiter Glow → Mitte → weißer Kern) additiv zeichnen.
    function drawBolt(pts, col, alpha) {
      if (pts.length < 2 || alpha <= 0.003) return;
      const passes = [[TUNE.W_GLOW, col, 0.28 * alpha], [TUNE.W_MID, col, 0.6 * alpha], [TUNE.W_CORE, "#ffffff", 0.95 * alpha]];
      for (const [w, c, a] of passes) {
        ctx.globalAlpha = Math.min(1, a); ctx.lineWidth = w; ctx.strokeStyle = c;
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
    }

    function draw() {
      const st = stateRef.current;
      if (!size()) { canvas.style.display = "none"; return; }
      canvas.style.display = "block";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, cw + 2 * MGN, ch + 2 * MGN);
      if (!st.active) return;                                       // Rahmen nur bei voller Ionisierung
      ctx.globalCompositeOperation = "lighter"; ctx.lineJoin = "round"; ctx.lineCap = "round";

      if (Math.abs(perim.w - cw) > 0.5 || Math.abs(perim.h - ch) > 0.5) {
        const pts = buildPerim(cw - 2 * TUNE.INSET, ch - 2 * TUNE.INSET, TUNE.CORNER, TUNE.N_PERIM);
        for (const p of pts) { p.x += MGN + TUNE.INSET; p.y += MGN + TUNE.INSET; }   // in die Rand-versetzte Canvas
        perim = { w: cw, h: ch, pts };
      }
      const pts = perim.pts, N = pts.length, col = st.color;

      // reduced: EIN statischer, gezackter Glow-Rahmen (kein Flackern)
      if (st.reduced) {
        const outline = pts.map((p, i) => { const nj = sjit(i, 1) * TUNE.HUM_AMP; return { x: p.x + p.nx * nj, y: p.y + p.ny * nj }; });
        outline.push(outline[0]);
        drawBolt(outline, col, 0.5);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; return;
      }

      const t = clockT;
      const bucket = Math.floor(t / TUNE.RESEED_MS), humBucket = Math.floor(t / TUNE.HUM_RESEED_MS);

      // Dauer-Knistern (ganze Kontur, leise)
      const hum = [];
      for (let i = 0; i <= N; i++) {
        const p = pts[i % N];
        const nj = sjit(i, humBucket * 2.3) * TUNE.HUM_AMP;
        const tj = sjit(i, humBucket * 2.3 + 9) * (TUNE.TAN_JIT * 0.5);
        hum.push({ x: p.x + p.nx * nj + -p.ny * tj, y: p.y + p.ny * nj + p.nx * tj });
      }
      drawBolt(hum, col, TUNE.HUM_ALPHA);

      // wandernde Runner (bewegter Blitzrahmen)
      const spanN = Math.max(3, Math.round(TUNE.RUN_SPAN * N));
      for (let r = 0; r < TUNE.RUNNERS; r++) {
        const salt = r * 131 + 17;
        const head = ((t / 1000) * TUNE.RUN_SPEED + r / TUNE.RUNNERS) * N;
        const rp = [];
        for (let s = 0; s <= spanN; s++) {
          const idx = Math.round(head + s) % N;
          const p = pts[(idx + N) % N];
          const nj = sjit(idx, bucket + salt) * TUNE.JIT_AMP;
          const tj = sjit(idx, bucket + salt + 7) * TUNE.TAN_JIT;
          rp.push({ x: p.x + p.nx * nj + -p.ny * tj, y: p.y + p.ny * nj + p.nx * tj });
        }
        const sub = TUNE.RUN_SUB, per = Math.max(1, Math.floor(spanN / sub));
        for (let k = 0; k < sub; k++) {
          const a0 = k * per, a1 = Math.min(spanN, (k + 1) * per + 1);
          const env = Math.sin(Math.PI * ((k + 0.5) / sub));
          drawBolt(rp.slice(a0, a1 + 1), col, 0.9 * env);
        }
      }

      // Cross-Arcs (ab und an quer über die Karte)
      if (t >= nextArc) {
        nextArc = t + TUNE.ARC_MIN_MS + Math.random() * (TUNE.ARC_MAX_MS - TUNE.ARC_MIN_MS);
        const iA = Math.floor(Math.random() * N);
        const iB = (iA + Math.floor(N * (0.4 + Math.random() * 0.2))) % N;   // grob gegenüber
        arcs.push({ born: t, iA, iB, seed: Math.floor(t) & 1023, fork: Math.random() < TUNE.FORK_CHANCE });
      }
      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i], age = t - arc.born;
        if (age > TUNE.ARC_LIFE_MS) { arcs.splice(i, 1); continue; }
        const life = 1 - age / TUNE.ARC_LIFE_MS, alpha = life * life, flick = Math.floor(age / TUNE.ARC_FLICK_MS);
        const A = pts[arc.iA], B = pts[arc.iB];
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, px = -dy / len, py = dx / len;
        const seg = TUNE.ARC_SEGS, lineP = [];
        for (let s = 0; s <= seg; s++) {
          const u = s / seg, env = Math.sin(Math.PI * u);
          const disp = sjit(arc.seed + s * 13, flick) * TUNE.ARC_AMP * env;
          lineP.push({ x: A.x + dx * u + px * disp, y: A.y + dy * u + py * disp });
        }
        drawBolt(lineP, col, alpha);
        if (arc.fork) {
          const fs = Math.floor(seg * (0.4 + 0.2 * hash(arc.seed, 3)));
          const base = lineP[fs];
          const fl = [base];
          const fdx = sjit(arc.seed, 5) * TUNE.ARC_AMP * 1.4, fdy = sjit(arc.seed, 6) * TUNE.ARC_AMP * 1.4;
          for (let s = 1; s <= 4; s++) {
            const u = s / 4;
            fl.push({ x: base.x + fdx * u + px * sjit(arc.seed + s, flick) * 4, y: base.y + fdy * u + py * sjit(arc.seed + s + 2, flick) * 4 });
          }
          drawBolt(fl, col, alpha * 0.7);
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }

    function frame(now) {
      if (disposed) return;
      clockT += Math.min(50, now - last); last = now;
      draw();
      const st = stateRef.current;
      if (!st.active || st.reduced || document.visibilityState === "hidden") { raf = 0; return; }
      raf = requestAnimationFrame(frame);
    }
    function ensureRun() {
      if (disposed) return;
      const run = stateRef.current.active && !stateRef.current.reduced && document.visibilityState !== "hidden";
      if (run) { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
      else { if (raf) { cancelAnimationFrame(raf); raf = 0; } draw(); }   // reduced → statisch, inaktiv → leer
    }
    syncRef.current = ensureRun;
    const onVis = () => ensureRun();
    document.addEventListener("visibilitychange", onVis);
    let ro = null;
    try { ro = new ResizeObserver(() => { if (!raf) draw(); }); ro.observe(host); } catch { /* ignore */ }
    ensureRun();

    return () => {
      disposed = true; document.removeEventListener("visibilitychange", onVis);
      if (ro) ro.disconnect(); if (raf) cancelAnimationFrame(raf); try { host.removeChild(canvas); } catch { /* ignore */ }
    };
  }, []);

  useEffect(() => { syncRef.current?.(); }, [active, color, reduced]);

  // z-0 = auf der EdgeGlow-Ebene: ÜBER dem Karten-Skin, UNTER Eis (z-1) und Moos (z-2) im selben Karten-Wrapper.
  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible", zIndex: 0 }} />;
}

export default CardIonStorm;
