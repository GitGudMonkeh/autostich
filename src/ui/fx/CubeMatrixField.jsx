import { useEffect, useRef } from "react";
import { getMusicAnalyser } from "../musicAnalyser.js";

/* #317 Cube-Matrix — musik-/bass-reaktives 3D-Würfelfeld auf Synthwave-Boden + Scheinwerfer von oben.
   Reiner Hintergrund-Effekt (bgfx): läuft KONTINUIERLICH zur laufenden Musik (nicht pro Stich). Jeder Würfel = ein
   eigenes log-verteiltes Frequenzband (30..FREQ_MAX Hz); er schlägt als Säule vom Boden nach oben aus. Die Scheinwerfer
   pulsieren über DIESELBE Beat-Pipeline auf einem Sub-Bass-Band (40..150 Hz).

   Rendering: Canvas-2D (die getunten Werte stammen 1:1 aus dem Tuning-Board, das ebenfalls Canvas-2D ist). Transparente
   Bühne ÜBER dem Battlefield-Bild, HINTER den Karten (z-1) → Würfelfeld/Boden/Sonne/Scheinwerfer sind Ambiente. bgFill
   wird bewusst NICHT gezeichnet (das BF-Bild bleibt sichtbar). Perf: DPR ≤ 1.5, rAF stoppt bei verstecktem Tab,
   `reduced` = ein statisches, gedimmtes Standbild (kein Loop). Signal aus dem geteilten Musik-Analyser (musicAnalyser.js);
   ohne Analyser/Stille sinken Würfel & Scheinwerfer in Ruhe.

   Farbe: `deckColored` → Deck-Primär→Sekundär (Spalten links→rechts tief→hoch), sonst Standard Cyan→Magenta. */

// ── Cube-Matrix — TUNE (finale Zielwerte aus #317) ──
const TUNE = {
  // #317: Empfindlichkeit gesenkt (war 1.95×6.2) → ruhige Lieder schlagen nicht mehr über.
  GAIN: 1.55, FREQ_MAX: 16000, TILT: 1.45, CONTRAST: 5.0, BASE_SUB: 0.96, ATTACK: 0.16, RELEASE: 0.20,
  C_COLS: 18, C_ROWS: 6, C_SIZE: 0.120, C_DEPTHGAP: 0.45, C_RISE: 1.25, C_MINGLOW: 0.14, CUBE_ALPHA: 0.80, GLOW: 1.1,
  C_TAPER: 0.30,   // #317: Feld verjüngt sich nach hinten (hinterste Reihe ~70% der Front-Breite) → Trichter/Fluchtpunkt

  SPOT_ON: 1, SPOT_COUNT: 2, SPOT_SPREAD: 0.36, SPOT_INT: 0.35, SPOT_PULSE: 1.00, SPOT_WIDTH: 0.75, SPOT_TILT: 0.68,
  SPOT_SOFT: 0.55, SPOT_BLOOM: 0.30,
  // #perf/#317: C_ROWS 8→6 (~25% weniger Würfel). FELD_TIEFE 1.0→0.72 = Feld nach vorn; FELD_HOEHE 0→0.10 = etwas
  // tiefer → das Feld schließt unten mit dem Panel-Rahmen ab statt in der Mitte zu schweben.
  D_PERSP: 205, NEIGUNG: 0.54, D_TILT: 2.20, FELD_HOEHE: 0.06, FELD_TIEFE: 0.68, D_SPREAD: 3.9, D_FLOOR: 1, FLOOR_ALPHA: 0.55,
};
const BACKSUN = true;
const STD_LO = "#2ff0ff", STD_HI = "#ff2d9b", GRID_COL = "#7a2fff", HOT_COL = "#ffffff";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1)})`;

export default function CubeMatrixField({ color = "#5a8ade", color2 = "#b06bff", deckColored = false, reduced = false, lite = false }) {
  const hostRef = useRef(null);
  // Live-Props für den rAF-Loop spiegeln (Canvas wird nur EINMAL gebaut).
  const propsRef = useRef({ color, color2, deckColored, reduced, lite });
  propsRef.current = { color, color2, deckColored, reduced, lite };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => { try { host.removeChild(canvas); } catch { /* ignore */ } };

    let W = 0, H = 0, DPR = 1, raf = 0, disposed = false;
    const cubeV = new Float32Array(4096), baseB = new Float32Array(4096);
    let spotBass = 0, spotBassBase = 0;
    const audio = getMusicAnalyser(); // { analyser, freqData, ctx } oder null → Idle

    function resize() {
      const r = host.getBoundingClientRect();
      // #perf: DPR gedeckelt (Vollflächen-Effekt) — auf Mobile (lite) auf 1.0 → ~halbe Fill-Kosten ggü. 1.5.
      DPR = Math.min(propsRef.current.lite ? 1.0 : 1.25, window.devicePixelRatio || 1);
      W = Math.max(1, Math.floor(r.width)); H = Math.max(1, Math.floor(r.height));
      canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    const baseY = () => H * TUNE.NEIGUNG + TUNE.FELD_HOEHE * H;
    const proj = (x, y, z) => { const d = z + 3.2, f = TUNE.D_PERSP, hy = baseY(); return { x: W / 2 + f * x / d, y: hy + f * (TUNE.D_TILT - y) / d }; };
    const quad = (a, b, c, d, style) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fillStyle = style; ctx.fill(); };

    // ── Signal: jeder Würfel = eigenes log-Band, Beat-Betonung (Grundpegel-Abzug + Kontrast) + smooth Attack/Release ──
    function driveCube(i, raw, up, dn) {
      baseB[i] += (raw - baseB[i]) * 0.04;
      const target = clamp((raw - baseB[i] * TUNE.BASE_SUB) * TUNE.CONTRAST * TUNE.GAIN, 0, 1);
      cubeV[i] += (target - cubeV[i]) * (target > cubeV[i] ? up : dn);
    }
    function computeCubes(TC) {
      const up = TUNE.ATTACK, dn = TUNE.RELEASE;
      if (audio && audio.analyser) {
        audio.analyser.getByteFrequencyData(audio.freqData);
        const nyq = audio.ctx.sampleRate / 2, bins = audio.freqData.length;
        for (let i = 0; i < TC; i++) {
          const f0 = 30 * Math.pow(TUNE.FREQ_MAX / 30, i / TC), f1 = 30 * Math.pow(TUNE.FREQ_MAX / 30, (i + 1) / TC);
          const b0 = Math.max(1, Math.floor(f0 / nyq * bins)), b1 = Math.max(b0 + 1, Math.ceil(f1 / nyq * bins));
          let s = 0, n = 0; for (let b = b0; b < b1 && b < bins; b++) { s += audio.freqData[b]; n++; }
          driveCube(i, (n ? s / n : 0) / 255 * (1 + TUNE.TILT * (i / TC)), up, dn);
        }
      } else { for (let i = 0; i < TC; i++) cubeV[i] += (0 - cubeV[i]) * dn; } // Idle → in Ruhe sinken
    }
    function computeSpotBass() {
      let raw = 0;
      if (audio && audio.analyser) {
        const nyq = audio.ctx.sampleRate / 2, bins = audio.freqData.length; // freqData in computeCubes bereits gelesen
        const lo = Math.max(1, Math.floor(40 / nyq * bins)), hi = Math.max(lo + 1, Math.ceil(150 / nyq * bins));
        let s = 0, nn = 0; for (let b = lo; b <= hi && b < bins; b++) { s += audio.freqData[b]; nn++; }
        raw = (nn ? s / nn : 0) / 255;
      }
      spotBassBase += (raw - spotBassBase) * 0.04;
      const target = clamp((raw - spotBassBase * TUNE.BASE_SUB) * TUNE.CONTRAST * TUNE.GAIN, 0, 1);
      spotBass += (target - spotBass) * (target > spotBass ? TUNE.ATTACK : TUNE.RELEASE);
    }

    function drawSun(lo, hi) {
      const sr = Math.min(W, H) * 0.16, sx = W / 2, sy = baseY() - sr * 0.1;
      ctx.globalCompositeOperation = "lighter";
      const sg = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
      sg.addColorStop(0, rgba(hi, 0.5)); sg.addColorStop(1, rgba(mix(hi, lo, 0.5), 0.18));
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.clip(); ctx.fillStyle = sg; ctx.fillRect(sx - sr, sy - sr, 2 * sr, 2 * sr); ctx.restore();
    }
    function drawFloor(C, R, spread, z0, rowGap, alpha, taper) {
      if (alpha <= 0) return; const gcol = rgb(GRID_COL);
      const half = C > 1 ? spread / (C - 1) : spread;
      const zF = z0 - rowGap * 0.5, zB = z0 + (R - 0.5) * rowGap;
      const sprAt = (t) => (spread + half) * (1 - taper * t); // Halb-Breite an Tiefe t (0 vorn .. 1 hinten) → Verjüngung
      ctx.globalCompositeOperation = "lighter"; ctx.lineWidth = 1;
      // Vertikale Linien (Spalten) — konvergieren nach hinten (front-breit → hinten schmal).
      for (let c = 0; c <= C; c++) { const u = c / C, xF = lerp(-sprAt(0), sprAt(0), u), xB = lerp(-sprAt(1), sprAt(1), u), p0 = proj(xF, 0, zF), p1 = proj(xB, 0, zB);
        ctx.strokeStyle = rgba(gcol, 0.5 * alpha); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); }
      // Horizontale Linien (Reihen) — schmaler nach hinten.
      for (let r = 0; r <= R; r++) { const t = R > 0 ? r / R : 0, w = sprAt(t), z = z0 + (r - 0.5) * rowGap, a = alpha * lerp(0.6, 0.16, t), p0 = proj(-w, 0, z), p1 = proj(w, 0, z);
        ctx.strokeStyle = rgba(gcol, a); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); }
    }
    function box3d(cx, zf, zb, y0, y1, halfw, colFbot, colFtop, colT, colS, glowA, glowC, alpha, grad) {
      const FBL = proj(cx - halfw, y0, zf), FBR = proj(cx + halfw, y0, zf), FTL = proj(cx - halfw, y1, zf), FTR = proj(cx + halfw, y1, zf),
        BTL = proj(cx - halfw, y1, zb), BTR = proj(cx + halfw, y1, zb), BBL = proj(cx - halfw, y0, zb), BBR = proj(cx + halfw, y0, zb);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = alpha;
      if (cx < 0) quad(FBL, FTL, BTL, BBL, colS); else quad(FBR, FTR, BTR, BBR, colS);
      // #perf: Der Front-Verlauf (heiße Spitze) kostet ein createLinearGradient JE Würfel/Frame. Nur bei erkennbarem
      // Ausschlag (grad=true) zeichnen; ruhende Würfel bekommen einen soliden Fill (colFbot) → spart bei leiser Musik
      // fast alle Gradienten (die meisten Würfel liegen dann in Ruhe).
      ctx.beginPath(); ctx.moveTo(FBL.x, FBL.y); ctx.lineTo(FBR.x, FBR.y); ctx.lineTo(FTR.x, FTR.y); ctx.lineTo(FTL.x, FTL.y); ctx.closePath();
      if (grad) { const fg = ctx.createLinearGradient(0, FBL.y, 0, FTL.y); fg.addColorStop(0, colFbot); fg.addColorStop(1, colFtop); ctx.fillStyle = fg; }
      else ctx.fillStyle = colFbot;
      ctx.fill();
      quad(FTL, FTR, BTR, BTL, colT); ctx.globalAlpha = 1;
      if (glowA > 0) { ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = rgba(glowC, glowA * alpha); const gy = Math.min(FTL.y, FTR.y); ctx.fillRect(Math.min(FTL.x, FTR.x) - 2, gy - 4, Math.abs(FTR.x - FTL.x) + 4, 8); ctx.globalCompositeOperation = "source-over"; }
    }
    // Weicher Lichtstrahl: viele dünne, aneinandergereihte Streifen; Helligkeit quer = Gauß → glatte Kante ohne Layer.
    function drawBeam(ax, ay, bx, by, apexHalf, baseHalf, col, alpha, sigma) {
      const g = ctx.createLinearGradient(0, ay, 0, by); g.addColorStop(0, rgba(col, 1)); g.addColorStop(0.55, rgba(col, 0.4)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; const N = propsRef.current.lite ? 28 : 40, s2 = 2 * sigma * sigma; // #perf: weniger Streifen (war 64)
      for (let k = 0; k < N; k++) { const u0 = (k / N) * 2 - 1, u1 = ((k + 1) / N) * 2 - 1, um = (u0 + u1) * 0.5;
        ctx.globalAlpha = alpha * Math.exp(-(um * um) / s2);
        ctx.beginPath(); ctx.moveTo(ax + u0 * apexHalf, ay); ctx.lineTo(ax + u1 * apexHalf, ay); ctx.lineTo(bx + u1 * baseHalf, by); ctx.lineTo(bx + u0 * baseHalf, by); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    function drawSpotlights(spotCol) {
      if (TUNE.SPOT_ON <= 0) return;
      const n = Math.round(TUNE.SPOT_COUNT), col = spotCol;
      const pulse = clamp(TUNE.SPOT_INT * (0.3 + spotBass * TUNE.SPOT_PULSE * 1.7), 0, 1);
      const apexY = -H * 0.06, baseYY = H * 1.06;
      const span = clamp(TUNE.SPOT_SPREAD * (1 + Math.max(0, n - 3) * 0.06), 0, 1);
      const sigma = 0.30 + 0.45 * TUNE.SPOT_SOFT;
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < n; i++) {
        const ax = W / 2 + (n > 1 ? (i / (n - 1) * 2 - 1) : 0) * span * (W * 0.5), hw = (W / (n + 1)) * TUNE.SPOT_WIDTH, bx = ax - (ax - W / 2) * TUNE.SPOT_TILT;
        drawBeam(ax, apexY, bx, baseYY, hw * 0.14, hw, col, pulse, sigma);
        if (TUNE.SPOT_BLOOM > 0) { const qy = apexY + H * 0.03, qr = H * (0.05 + 0.10 * TUNE.SPOT_BLOOM), sg = ctx.createRadialGradient(ax, qy, 0, ax, qy, qr);
          sg.addColorStop(0, rgba(mix(col, [255, 255, 255], 0.5), pulse * TUNE.SPOT_BLOOM)); sg.addColorStop(1, rgba(col, 0)); ctx.fillStyle = sg; ctx.fillRect(ax - qr, qy - qr, qr * 2, qr * 2); }
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function render() {
      const p = propsRef.current;
      const lo = p.deckColored ? rgb(p.color) : rgb(STD_LO);
      const hi = p.deckColored ? rgb(p.color2) : rgb(STD_HI);
      const spotCol = p.deckColored ? rgb(p.color2) : rgb(STD_HI);
      const hot = rgb(HOT_COL), dark = [9, 5, 18], glow = TUNE.GLOW;
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H); // transparente Bühne (BF-Bild bleibt sichtbar)
      // #perf: auf Mobile (lite) zusätzlich weniger Spalten/Reihen (14×5 statt 18×6) → ~35% weniger Würfel.
      const C = Math.round(TUNE.C_COLS) - (p.lite ? 4 : 0), R = Math.round(TUNE.C_ROWS) - (p.lite ? 1 : 0), TC = C * R;
      if (p.reduced) { for (let i = 0; i < TC; i++) cubeV[i] = 0.12; spotBass = 0; } // Standbild: ruhige, gedimmte Säulen
      else { computeCubes(TC); computeSpotBass(); }
      const spread = TUNE.D_SPREAD, z0 = TUNE.FELD_TIEFE, rowGap = TUNE.C_DEPTHGAP, hw0 = TUNE.C_SIZE, alpha = TUNE.CUBE_ALPHA * (p.reduced ? 0.6 : 1);
      const taper = TUNE.C_TAPER;
      if (BACKSUN) drawSun(lo, hi);
      if (TUNE.D_FLOOR > 0) drawFloor(C, R, spread, z0, rowGap, TUNE.FLOOR_ALPHA * (p.reduced ? 0.6 : 1), taper);
      for (let r = R - 1; r >= 0; r--) { const z = z0 + r * rowGap, spreadR = spread * (1 - taper * (R > 1 ? r / (R - 1) : 0)); // Verjüngung: hintere Reihen schmaler
        for (let c = 0; c < C; c++) { const idx = r * C + c, val = cubeV[idx] || 0, cx = C > 1 ? lerp(-spreadR, spreadR, c / (C - 1)) : 0;
          const base = mix(lo, hi, C > 1 ? c / (C - 1) : 0), emit = TUNE.C_MINGLOW + (1 - TUNE.C_MINGLOW) * val;
          const colFbot = rgba(mix(dark, base, emit), 1);
          const colFtop = rgba(mix(base, hot, clamp(val, 0, 1) * 0.7), 1);
          const colT = rgba(mix(dark, base, emit * 0.85), 1);   // dunkler Deck-Deckel (KEIN weißes Feld)
          const colS = rgba(mix(dark, base, emit * 0.6), 1);
          const s = hw0, h = 2 * s + val * TUNE.C_RISE;
          box3d(cx, z - s, z + s, 0, h, s, colFbot, colFtop, colT, colS, glow > 0 && !p.reduced ? clamp(0.55 * glow * val, 0, 0.9) : 0, mix(base, hot, 0.4), alpha, !p.reduced && val > 0.06);
        }
      }
      if (!p.reduced) drawSpotlights(spotCol); else { spotBass = 0; drawSpotlights(spotCol); }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    }

    // #perf: Ambiente-Effekt auf ~40 fps (Desktop) bzw. ~30 fps (Mobile/lite) drosseln — der rAF-Callback läuft jede
    // Frame (billig), gerendert wird nur alle FRAME_MS. Halbiert die Renderlast ggü. 60 fps, die App bleibt flüssig.
    let lastT = 0;
    function frame(now) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const FRAME_MS = propsRef.current.lite ? 33 : 24;
      if (now - lastT < FRAME_MS) return;
      lastT = now;
      render();
    }
    function start() { if (!raf && !disposed && document.visibilityState !== "hidden") raf = requestAnimationFrame(frame); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    resize();
    const ro = new ResizeObserver(() => { resize(); if (propsRef.current.reduced) render(); });
    ro.observe(host);
    const onVis = () => { if (document.visibilityState === "hidden") stop(); else start(); };
    document.addEventListener("visibilitychange", onVis);

    if (propsRef.current.reduced) render();  // Standbild — kein Loop
    else start();

    return () => {
      disposed = true; stop();
      document.removeEventListener("visibilitychange", onVis);
      try { ro.disconnect(); } catch { /* ignore */ }
      try { host.removeChild(canvas); } catch { /* ignore */ }
    };
    // Canvas EINMAL bauen; Farben/reduced kommen über propsRef in den Loop.
  }, []);

  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}
