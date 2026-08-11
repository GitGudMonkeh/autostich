import { useEffect, useRef } from "react";
import { Application, Graphics } from "pixi.js";

/* Archetyp-Karteneffekt „Blitz" · Effekt A — Ionensturm-Rahmen (docs/archetyp-karteneffekte.md §5.1).
   Um eine VOLL ionisierte Karte (ionStacks >= ION_MAX_STACKS) zucken Blitze:
     • gezackte „Runner"-Bögen wandern permanent an der Kartenkante entlang (bewegter Blitzrahmen),
     • ein leises Dauer-Knistern der ganzen Kontur hält den Rahmen lebendig,
     • ab und an springt ein Cross-Arc quer über die Karte (kurzer Flash, gelegentliche Gabel).

   Eigener Pixi-`Application`-Layer als transparentes Panel-Overlay ÜBER den Karten (z > 10),
   positioniert auf die Kartenbox (cardRef) relativ zu panelRef. Getrennt von der Feld-`PixiStage`
   (die liegt z-3 HINTER den Karten). Ticker läuft nur bei active && sichtbarem Tab; DPR ≤ 2.

   Look additiv (Kern weiß-heiß, farbiger Glow). Jitter deterministisch per Hash → kein Per-Frame-
   RNG-Sturm, ruhiges Neuwürfeln im Reseed-Takt. reduced → statischer Glow-Rahmen (kein Flackern). */

// ── TUNE ─────────────────────────────────────────────────────────────────────
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

  // Strichbreiten (CSS-px; autoDensity skaliert auf DPR).
  W_GLOW: 9.1, W_MID: 0.5, W_CORE: 0.6,
};

// Deterministischer 0..1-Hash und -1..1-Signjitter (wie fjitter der Render-Schicht, ohne Import).
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

// Eine Polylinie in drei Pässen (breiter Glow → Mitte → weißer Kern) additiv zeichnen.
function drawBolt(g, pts, color, alpha) {
  if (pts.length < 2 || alpha <= 0.003) return;
  const passes = [
    { w: TUNE.W_GLOW, c: color, a: 0.28 * alpha },
    { w: TUNE.W_MID, c: color, a: 0.6 * alpha },
    { w: TUNE.W_CORE, c: 0xffffff, a: 0.95 * alpha },
  ];
  for (const p of passes) {
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke({ width: p.w, color: p.c, alpha: Math.min(1, p.a), cap: "round", join: "round" });
  }
}

export function IonStorm({ active = false, panelRef, cardRef, color = "#5ec8f0", reduced = false }) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const gRef = useRef(null);
  const perimRef = useRef({ w: 0, h: 0, pts: [] });
  const arcsRef = useRef([]);
  const clockRef = useRef({ t: 0, nextArc: 0 });
  const applyRunRef = useRef(null); // Ticker-Lauf-Zustand (active && sichtbar) anwenden — aus dem Prop-Effekt erreichbar
  // Live-Props für den Ticker spiegeln (App wird nur EINMAL gebaut).
  const stateRef = useRef({ active, reduced, color });
  stateRef.current = { active, reduced, color };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let disposed = false;
    const canvas = document.createElement("canvas");
    const app = new Application();

    const colNum = (hex) => { const h = String(hex || "#5ec8f0").replace("#", ""); return parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16) || 0x5ec8f0; };

    const tick = (ticker) => {
      const st = stateRef.current;
      const g = gRef.current;
      if (!g) return;
      const card = cardRef?.current, panel = panelRef?.current;
      if (!st.active || !card || !panel) { g.clear(); return; }
      const cr = card.getBoundingClientRect(), pr = panel.getBoundingClientRect();
      const w = cr.width, h = cr.height;
      if (w < 8 || h < 8) { g.clear(); return; }
      // Overlay-Container auf die Kartenbox (panel-lokal) setzen; Perimeter bei Größenwechsel neu bauen.
      g.position.set(cr.left - pr.left, cr.top - pr.top);
      let P = perimRef.current;
      if (Math.abs(P.w - w) > 0.5 || Math.abs(P.h - h) > 0.5) {
        P = { w, h, pts: buildPerim(w - 2 * TUNE.INSET, h - 2 * TUNE.INSET, TUNE.CORNER, TUNE.N_PERIM) };
        for (const p of P.pts) { p.x += TUNE.INSET; p.y += TUNE.INSET; }
        perimRef.current = P;
      }
      const pts = P.pts, N = pts.length, col = colNum(st.color);
      g.clear();

      // ── reduced: EIN statischer, gezackter Glow-Rahmen (kein Flackern) ──
      if (st.reduced) {
        const outline = pts.map((p, i) => {
          const nj = sjit(i, 1) * TUNE.HUM_AMP;
          return { x: p.x + p.nx * nj, y: p.y + p.ny * nj };
        });
        outline.push(outline[0]);
        drawBolt(g, outline, col, 0.5);
        return;
      }

      const cl = clockRef.current;
      cl.t += ticker.deltaMS;
      const t = cl.t;
      const bucket = Math.floor(t / TUNE.RESEED_MS);
      const humBucket = Math.floor(t / TUNE.HUM_RESEED_MS);

      // ── Dauer-Knistern (ganze Kontur, leise) ──
      const hum = [];
      for (let i = 0; i <= N; i++) {
        const p = pts[i % N];
        const nj = sjit(i, humBucket * 2.3) * TUNE.HUM_AMP;
        const tj = sjit(i, humBucket * 2.3 + 9) * (TUNE.TAN_JIT * 0.5);
        hum.push({ x: p.x + p.nx * nj + -p.ny * tj, y: p.y + p.ny * nj + p.nx * tj });
      }
      drawBolt(g, hum, col, TUNE.HUM_ALPHA);

      // ── wandernde Runner (bewegter Blitzrahmen) ──
      const spanN = Math.max(3, Math.round(TUNE.RUN_SPAN * N));
      for (let r = 0; r < TUNE.RUNNERS; r++) {
        const salt = r * 131 + 17;
        const head = ((t / 1000) * TUNE.RUN_SPEED + r / TUNE.RUNNERS) * N;
        // Runner-Punkte (mit Zacken) einmal bauen …
        const rp = [];
        for (let s = 0; s <= spanN; s++) {
          const idx = Math.round(head + s) % N;
          const p = pts[(idx + N) % N];
          const nj = sjit(idx, bucket + salt) * TUNE.JIT_AMP;
          const tj = sjit(idx, bucket + salt + 7) * TUNE.TAN_JIT;
          rp.push({ x: p.x + p.nx * nj + -p.ny * tj, y: p.y + p.ny * nj + p.nx * tj });
        }
        // … und in Teilstücken mit Kopf/Schwanz-Ausblendung zeichnen (Envelope sin).
        const sub = TUNE.RUN_SUB, per = Math.max(1, Math.floor(spanN / sub));
        for (let k = 0; k < sub; k++) {
          const a0 = k * per, a1 = Math.min(spanN, (k + 1) * per + 1);
          const mid = (k + 0.5) / sub;
          const env = Math.sin(Math.PI * mid);
          drawBolt(g, rp.slice(a0, a1 + 1), col, 0.9 * env);
        }
      }

      // ── Cross-Arcs (ab und an quer über die Karte) ──
      if (t >= cl.nextArc) {
        cl.nextArc = t + TUNE.ARC_MIN_MS + Math.random() * (TUNE.ARC_MAX_MS - TUNE.ARC_MIN_MS);
        const iA = Math.floor(Math.random() * N);
        const iB = (iA + Math.floor(N * (0.4 + Math.random() * 0.2))) % N; // grob gegenüber
        arcsRef.current.push({ born: t, iA, iB, seed: Math.floor(t) & 1023, fork: Math.random() < TUNE.FORK_CHANCE });
      }
      const arcs = arcsRef.current;
      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i], age = t - arc.born;
        if (age > TUNE.ARC_LIFE_MS) { arcs.splice(i, 1); continue; }
        const life = 1 - age / TUNE.ARC_LIFE_MS;
        const alpha = life * life; // schneller Flash → Ausklang
        const flick = Math.floor(age / TUNE.ARC_FLICK_MS);
        const A = pts[arc.iA], B = pts[arc.iB];
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
        const px = -dy / len, py = dx / len;
        const seg = TUNE.ARC_SEGS, line = [];
        for (let s = 0; s <= seg; s++) {
          const u = s / seg, env = Math.sin(Math.PI * u);
          const disp = sjit(arc.seed + s * 13, flick) * TUNE.ARC_AMP * env;
          line.push({ x: A.x + dx * u + px * disp, y: A.y + dy * u + py * disp });
        }
        drawBolt(g, line, col, alpha);
        if (arc.fork) {
          const fs = Math.floor(seg * (0.4 + 0.2 * hash(arc.seed, 3)));
          const base = line[fs];
          const fl = [base];
          const fdx = (sjit(arc.seed, 5)) * TUNE.ARC_AMP * 1.4, fdy = (sjit(arc.seed, 6)) * TUNE.ARC_AMP * 1.4;
          for (let s = 1; s <= 4; s++) {
            const u = s / 4;
            fl.push({ x: base.x + fdx * u + px * sjit(arc.seed + s, flick) * 4, y: base.y + fdy * u + py * sjit(arc.seed + s + 2, flick) * 4 });
          }
          drawBolt(g, fl, col, alpha * 0.7);
        }
      }
    };

    app.init({
      canvas, preference: "webgl", backgroundAlpha: 0, antialias: true, autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1), resizeTo: host, powerPreference: "high-performance",
    }).then(() => {
      if (disposed) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } return; }
      appRef.current = app;
      canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block";
      host.appendChild(canvas);
      const g = new Graphics();
      g.blendMode = "add";
      app.stage.addChild(g);
      gRef.current = g;
      app.ticker.add(tick);
      applyRun();
    }).catch(() => { /* WebGL fehlt → Overlay bleibt leer, Spiel läuft normal weiter */ });

    function applyRun() {
      const a = appRef.current;
      if (!a) return;
      const run = stateRef.current.active && document.visibilityState !== "hidden";
      if (run) a.ticker.start(); else { a.ticker.stop(); gRef.current?.clear(); }
    }
    applyRunRef.current = applyRun;
    const onVis = () => applyRun();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVis);
      const a = appRef.current; appRef.current = null; gRef.current = null;
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
    // App EINMAL bauen; active/reduced/color/Position kommen über Refs bzw. den Prop-Effekt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // active-Wechsel → Ticker starten/stoppen (ohne App-Neubau).
  useEffect(() => { applyRunRef.current?.(); }, [active]);

  return (
    <div ref={hostRef} aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11 }} />
  );
}
