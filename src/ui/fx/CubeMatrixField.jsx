import { useEffect, useRef } from "react";
import { getMusicAnalyser } from "../musicAnalyser.js";
import { isCoarse } from "./mobileTier.js";

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
  // #317 Adaptive Geschwindigkeit: aus der Song-Aktivität (Spektral-Fluss = Onset-Dichte, tracks sind alle −14 LUFS →
  // Lautstärke taugt nicht als Maß) → Attack/Release skalieren. live=0 (ruhig) → ×SLOW (träger), live=1 (schnell) →
  // volle Werte. SPEED_LO/HI = Fluss-Schwellen des Mappings (blind gesetzt → nach Gehör justieren).
  SLOW: 0.5, SPEED_LO: 0.006, SPEED_HI: 0.020,
  C_COLS: 18, C_ROWS: 6, C_SIZE: 0.120, C_DEPTHGAP: 0.45, C_RISE: 1.25, C_MINGLOW: 0.14, CUBE_ALPHA: 0.80, GLOW: 1.1, // #343: gefüllte Würfel weniger transparent (0.65→0.80)
  C_TAPER: 0.30,   // #317: Feld verjüngt sich nach hinten (hinterste Reihe ~70% der Front-Breite) → Trichter/Fluchtpunkt

  // #317: Scheinwerfer kreuzen von den oberen Ecken über die Karten (X-Form): Apex weit außen (SPREAD 0.78) + stark
  // einwärts gedreht (TILT 0.72 → Strahlen kreuzen mittig). Heller (SPOT_INT 0.55), breit (WIDTH 0.98).
  SPOT_ON: 1, SPOT_COUNT: 2, SPOT_SPREAD: 0.78, SPOT_INT: 0.55, SPOT_PULSE: 1.00, SPOT_WIDTH: 0.98, SPOT_TILT: 0.72,
  SPOT_SOFT: 0.55, SPOT_BLOOM: 0.30,
  // #perf/#317: C_ROWS 8→6 (~25% weniger Würfel). FELD_TIEFE 1.0→0.72 = Feld nach vorn; FELD_HOEHE 0→0.10 = etwas
  // tiefer → das Feld schließt unten mit dem Panel-Rahmen ab statt in der Mitte zu schweben.
  D_PERSP: 205, NEIGUNG: 0.54, D_TILT: 2.20, FELD_HOEHE: 0.06, FELD_TIEFE: 0.68, D_SPREAD: 3.9, D_FLOOR: 1, FLOOR_ALPHA: 0.55,
};
const STD_LO = "#2ff0ff", STD_HI = "#ff2d9b", GRID_COL = "#7a2fff", HOT_COL = "#ffffff";
// #343: weniger Weiß, mehr Deckfarbe. WIRE_HOT_MIX = Weiß-Anteil der Wireframe-Striche + Top-Glow (war 0.4 → zu weiß);
//   FILL_HOT_MIX = Weiß-Anteil der gefüllten Würfel bei Musik-Ausschlag (war 0.5). Beide gelten für Standard UND Deckfarbe.
const WIRE_HOT_MIX = 0.15, FILL_HOT_MIX = 0.30;

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1)})`;

/* mode: "all" (Feld + Scheinwerfer auf einer Bühne — für die Showcase) | "field" (nur Würfel/Boden/Sonne, z-2 hinter
   den Karten) | "spots" (nur Scheinwerfer, additive Overlay-Bühne z-11 ÜBER den Karten → leuchtet sie von oben an). */
export default function CubeMatrixField({ color = "#5a8ade", color2 = "#b06bff", deckColored = false, reduced = false, lite = false, mode = "all", riseScale = 1, riseBase = 1, yBias = 0, depthScale = 1, floorBottom = null, sun = true, wire = false, active = true }) {
  const hostRef = useRef(null);
  // Live-Props für den rAF-Loop spiegeln (Canvas wird nur EINMAL gebaut). riseScale = Musik-Ausschlag (Höhen-Delta je
  // Ausschlag). riseBase = RUHE-Höhe der Türme (unabhängig vom Ausschlag). yBias = Feld nach OBEN schieben (0..1 × H),
  // damit der Showcase das Feld höher/mittiger setzen kann als das In-Game-Panel (dort yBias=0 → unverändert).
  // depthScale = Reihen-Abstand-Faktor (< 1 = flacheres Feld, zieht die hinteren Reihen nach vorn; Showcase < 1,
  // In-Game = 1 → unverändert).
  const syncRef = useRef(null); // #perf-overlay-2: start/stop aus dem Mount-Effekt nach außen (Muster wie FrostIce)
  const propsRef = useRef({ color, color2, deckColored, reduced, lite, mode, riseScale, riseBase, yBias, depthScale, floorBottom, sun, wire, active });
  propsRef.current = { color, color2, deckColored, reduced, lite, mode, riseScale, riseBase, yBias, depthScale, floorBottom, sun, wire, active };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => { try { host.removeChild(canvas); } catch { /* ignore */ } };

    /* #perf-mobile: Der Sparpfad hing bisher allein an der OPTION `lite`. Ein Handy mit „Effekte voll" lief damit im
       kompletten Desktop-Pfad — DPR 1,25 · ~41 fps · 18×6 Würfel · 40 Strahlstreifen · Spot-Bloom an. Genau die
       Geräteblindheit, gegen die mobileTier.js existiert. Der Zeigertyp ist jetzt ein UNTERGRENZE: coarse ⇒ mindestens
       lite, die Option kann nur noch weiter drosseln, nicht mehr aufdrehen. Gemessen (fx-bench, 4× Drossel, isoliert):
       Haupt-Thread-JS 12,3 % → 5,3 % der Kernzeit, also gut die Hälfte weg — und das ist die eine Datei, in der nach
       den Hebeln 01–05 überhaupt noch nennenswert Skriptlast steckt (alle übrigen Effekt-Schleifen messen ~0). */
    const COARSE = isCoarse();
    const liteOn = () => COARSE || !!propsRef.current.lite;

    let W = 0, H = 0, DPR = 1, raf = 0, disposed = false;
    const cubeV = new Float32Array(4096), baseB = new Float32Array(4096);
    let spotBass = 0, spotBassBase = 0;
    const audio = getMusicAnalyser(); // { analyser, freqData, ctx } oder null → Idle
    // #317 adaptive Geschwindigkeit: Song-Aktivität (Spektral-Fluss) → liveUp/liveDn (Attack/Release je Frame).
    const prevFreq = audio ? new Uint8Array(audio.freqData.length) : null;
    let songAct = 0, fluxInit = false, liveUp = TUNE.ATTACK, liveDn = TUNE.RELEASE;

    function resize() {
      const r = host.getBoundingClientRect();
      // #perf: DPR gedeckelt (Vollflächen-Effekt) — auf Mobile (lite) auf 1.0 → ~halbe Fill-Kosten ggü. 1.5.
      DPR = Math.min(liteOn() ? 1.0 : 1.25, window.devicePixelRatio || 1);
      W = Math.max(1, Math.floor(r.width)); H = Math.max(1, Math.floor(r.height));
      canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    // #zone: `floorBottom` (0..1) dockt die VORDERSTE Bodenreihe fix an floorBottom·H an (1 = Panel-Unterkante,
    // bündig mit dem Rahmen) — HÖHENUNABHÄNGIG, weil der px-Abstand der Frontreihe unter baseY konstant ist. Ohne
    // floorBottom klassisch: NEIGUNG/FELD_HOEHE − yBias·H (Showcase/Default unverändert).
    const NEAR_DY = TUNE.D_PERSP * TUNE.D_TILT / (TUNE.FELD_TIEFE + 3.2); // px: Frontreihe liegt so weit UNTER baseY
    const baseY = () => {
      const p = propsRef.current;
      if (p.floorBottom != null) return p.floorBottom * H - NEAR_DY;
      return H * TUNE.NEIGUNG + TUNE.FELD_HOEHE * H - (p.yBias || 0) * H; // yBias hebt das Feld an
    };
    const proj = (x, y, z) => { const d = z + 3.2, f = TUNE.D_PERSP, hy = baseY(); return { x: W / 2 + f * x / d, y: hy + f * (TUNE.D_TILT - y) / d }; };
    const quad = (a, b, c, d, style) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fillStyle = style; ctx.fill(); };

    // ── Signal: jeder Würfel = eigenes log-Band, Beat-Betonung (Grundpegel-Abzug + Kontrast) + smooth Attack/Release ──
    function driveCube(i, raw, up, dn) {
      baseB[i] += (raw - baseB[i]) * 0.04;
      const target = clamp((raw - baseB[i] * TUNE.BASE_SUB) * TUNE.CONTRAST * TUNE.GAIN, 0, 1);
      cubeV[i] += (target - cubeV[i]) * (target > cubeV[i] ? up : dn);
    }
    // Liest den Analyser EINMAL/Frame + leitet die adaptive Geschwindigkeit (liveUp/liveDn) aus dem Spektral-Fluss ab.
    // Beide Bühnen (field/spots) rufen das auf; freqData steht danach für computeCubes/computeSpotBass bereit.
    function computeSpeed() {
      liveUp = TUNE.ATTACK; liveDn = TUNE.RELEASE;
      if (!(audio && audio.analyser)) return false;
      audio.analyser.getByteFrequencyData(audio.freqData);
      const bins = audio.freqData.length;
      if (!fluxInit) { prevFreq.set(audio.freqData); fluxInit = true; }
      let flux = 0; for (let b = 0; b < bins; b++) { const d = audio.freqData[b] - prevFreq[b]; if (d > 0) flux += d; prevFreq[b] = audio.freqData[b]; }
      songAct += (flux / (bins * 255) - songAct) * 0.01;
      const live = clamp((songAct - TUNE.SPEED_LO) / Math.max(1e-4, TUNE.SPEED_HI - TUNE.SPEED_LO), 0, 1);
      liveUp = lerp(TUNE.ATTACK * TUNE.SLOW, TUNE.ATTACK, live);   // ruhig → träger, schnell → knackig
      liveDn = lerp(TUNE.RELEASE * TUNE.SLOW, TUNE.RELEASE, live);
      return true;
    }
    function computeCubes(TC, hasAudio) {
      if (hasAudio) {
        const nyq = audio.ctx.sampleRate / 2, bins = audio.freqData.length;
        for (let i = 0; i < TC; i++) {
          const f0 = 30 * Math.pow(TUNE.FREQ_MAX / 30, i / TC), f1 = 30 * Math.pow(TUNE.FREQ_MAX / 30, (i + 1) / TC);
          const b0 = Math.max(1, Math.floor(f0 / nyq * bins)), b1 = Math.max(b0 + 1, Math.ceil(f1 / nyq * bins));
          let s = 0, n = 0; for (let b = b0; b < b1 && b < bins; b++) { s += audio.freqData[b]; n++; }
          driveCube(i, (n ? s / n : 0) / 255 * (1 + TUNE.TILT * (i / TC)), liveUp, liveDn);
        }
      } else { for (let i = 0; i < TC; i++) cubeV[i] += (0 - cubeV[i]) * liveDn; } // Idle → in Ruhe sinken
    }
    function computeSpotBass(hasAudio) {
      let raw = 0;
      if (hasAudio) {
        const nyq = audio.ctx.sampleRate / 2, bins = audio.freqData.length; // freqData in computeSpeed bereits gelesen
        const lo = Math.max(1, Math.floor(40 / nyq * bins)), hi = Math.max(lo + 1, Math.ceil(150 / nyq * bins));
        let s = 0, nn = 0; for (let b = lo; b <= hi && b < bins; b++) { s += audio.freqData[b]; nn++; }
        raw = (nn ? s / nn : 0) / 255;
      }
      spotBassBase += (raw - spotBassBase) * 0.04;
      const target = clamp((raw - spotBassBase * TUNE.BASE_SUB) * TUNE.CONTRAST * TUNE.GAIN, 0, 1);
      spotBass += (target - spotBass) * (target > spotBass ? liveUp : liveDn); // dieselbe adaptive Geschwindigkeit wie die Würfel
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
    function box3d(cx, zf, zb, y0, y1, halfw, colF, colT, colS, glowA, glowC, alpha) {
      const FBL = proj(cx - halfw, y0, zf), FBR = proj(cx + halfw, y0, zf), FTL = proj(cx - halfw, y1, zf), FTR = proj(cx + halfw, y1, zf),
        BTL = proj(cx - halfw, y1, zb), BTR = proj(cx + halfw, y1, zb), BBL = proj(cx - halfw, y0, zb), BBR = proj(cx + halfw, y0, zb);
      // #317 Drahtgitter: nur die Kanten der sichtbaren Flächen additiv strichen → Würfel als LEUCHTENDE NEON-RAHMEN
      // (keine Füllung). Intensität ramped mit dem Ausschlag (glowA): Ruhe = zart, Bass = kräftig.
      if (propsRef.current.wire) {
        // #glow: LEUCHTENDER Neon-Look statt blasser Striche — heller Kern-Strich + ein breiterer, dimmerer additiver
        //   Glow-Halo (Bloom um die Kanten). Beide in glowC (Deckfarbe, #343) → satter Neon-Rahmen ohne Weiß-Wäsche.
        const laCore = clamp(0.78 + glowA * 1.2, 0.55, 1) * (0.55 + 0.45 * alpha);   // heller als vorher (war 0.5-Basis)
        const litFull = !liteOn();
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1; ctx.lineJoin = "round";
        const face = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.stroke(); };
        const drawFaces = () => {
          face(FBL, FBR, FTR, FTL);                                          // Front
          face(FTL, FTR, BTR, BTL);                                          // Deckel
          if (cx < 0) face(FBL, FTL, BTL, BBL); else face(FBR, FTR, BTR, BBR); // sichtbare Seite
        };
        // 1) Glow-Halo: breit + dim → weicher Neon-Schein (auf lite etwas schmaler = billiger).
        ctx.strokeStyle = rgba(glowC, laCore * 0.34); ctx.lineWidth = Math.max(2, H * (litFull ? 0.0064 : 0.0050)); drawFaces();
        // 2) Heller, etwas dickerer Kern-Strich obendrauf.
        ctx.strokeStyle = rgba(glowC, laCore); ctx.lineWidth = Math.max(1.2, H * 0.0026); drawFaces();
        ctx.globalCompositeOperation = "source-over";
        return;
      }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = alpha;
      if (cx < 0) quad(FBL, FTL, BTL, BBL, colS); else quad(FBR, FTR, BTR, BBR, colS);
      // #perf: Front-Verlauf (createLinearGradient JE Würfel/Frame) komplett raus → SOLIDER Front-Fill (colF).
      quad(FBL, FBR, FTR, FTL, colF);
      quad(FTL, FTR, BTR, BTL, colT); ctx.globalAlpha = 1;
      if (glowA > 0) { ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = rgba(glowC, glowA * alpha); const gy = Math.min(FTL.y, FTR.y); ctx.fillRect(Math.min(FTL.x, FTR.x) - 2, gy - 4, Math.abs(FTR.x - FTL.x) + 4, 8); ctx.globalCompositeOperation = "source-over"; }
    }
    // Weicher Lichtstrahl: viele dünne, aneinandergereihte Streifen; Helligkeit quer = Gauß → glatte Kante ohne Layer.
    function drawBeam(ax, ay, bx, by, apexHalf, baseHalf, col, alpha, sigma) {
      const g = ctx.createLinearGradient(0, ay, 0, by); g.addColorStop(0, rgba(col, 1)); g.addColorStop(0.55, rgba(col, 0.4)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; const N = liteOn() ? 18 : 40, s2 = 2 * sigma * sigma; // #perf: weniger Streifen (war 64) — #perf-mobile: lite 28→18
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
        if (TUNE.SPOT_BLOOM > 0 && !liteOn()) { const qy = apexY + H * 0.03, qr = H * (0.05 + 0.10 * TUNE.SPOT_BLOOM), sg = ctx.createRadialGradient(ax, qy, 0, ax, qy, qr); // #perf-mobile: Spot-Bloom (Radial-Gradient/Frame) auf lite aus
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
      const drawField = p.mode !== "spots", drawSpots = p.mode !== "field";
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H); // transparente Bühne (BF-Bild/Karten bleiben sichtbar)
      const hasAudio = !p.reduced && computeSpeed();
      if (drawField) {
        // #perf: auf Mobile (lite) zusätzlich weniger Spalten/Reihen (14×5 statt 18×6) → ~35% weniger Würfel.
        const C = Math.round(TUNE.C_COLS) - (liteOn() ? 6 : 0), R = Math.round(TUNE.C_ROWS) - (liteOn() ? 2 : 0), TC = C * R; // #perf-mobile: lite 14×5=70 → 12×4=48 Würfel
        if (p.reduced) { for (let i = 0; i < TC; i++) cubeV[i] = 0.12; } else computeCubes(TC, hasAudio);
        const spread = TUNE.D_SPREAD, z0 = TUNE.FELD_TIEFE, rowGap = TUNE.C_DEPTHGAP * (p.depthScale || 1), hw0 = TUNE.C_SIZE, alpha = TUNE.CUBE_ALPHA * (p.reduced ? 0.6 : 1);
        const taper = TUNE.C_TAPER;
        if (p.sun) drawSun(lo, hi);
        if (TUNE.D_FLOOR > 0) drawFloor(C, R, spread, z0, rowGap, TUNE.FLOOR_ALPHA * (p.reduced ? 0.6 : 1), taper);
        for (let r = R - 1; r >= 0; r--) { const z = z0 + r * rowGap, spreadR = spread * (1 - taper * (R > 1 ? r / (R - 1) : 0)); // Verjüngung: hintere Reihen schmaler
          // #317 Feld umgedreht: Reihe im Band-Index gespiegelt (R-1-r) → tiefe Bass-Bänder liegen HINTEN (große Türme in
          // der Ferne), die Höhen vorne. computeCubes bleibt unverändert (Bänder 0..TC-1 log-verteilt).
          for (let c = 0; c < C; c++) { const idx = (R - 1 - r) * C + c, val = cubeV[idx] || 0, cx = C > 1 ? lerp(-spreadR, spreadR, c / (C - 1)) : 0;
            const base = mix(lo, hi, C > 1 ? c / (C - 1) : 0), emit = TUNE.C_MINGLOW + (1 - TUNE.C_MINGLOW) * val;
            // Solider Front-Fill: dunkel-Deck bei Ruhe → heller + heiß-getönt bei Ausschlag (kein Gradient mehr).
            const colF = rgba(mix(mix(dark, base, emit), hot, clamp(val, 0, 1) * FILL_HOT_MIX), 1); // #343: weniger Weiß-Blowout bei Beats
            const colT = rgba(mix(dark, base, emit * 0.85), 1);   // dunkler Deck-Deckel (KEIN weißes Feld)
            const colS = rgba(mix(dark, base, emit * 0.6), 1);
            // Turm-Höhe = RUHE-Sockel (2·s + C_RISE·(riseBase−1)·0.55, unabhängig vom Ausschlag) + Musik-Ausschlag
            // (val·C_RISE·riseScale). So kann der Showcase hohe, ruhige Türme zeigen (riseBase hoch, riseScale niedrig),
            // während das Spiel bei riseBase=1/riseScale=1 unverändert bleibt.
            const s = hw0, h = 2 * s + TUNE.C_RISE * (p.riseBase - 1) * 0.55 + val * TUNE.C_RISE * p.riseScale;
            box3d(cx, z - s, z + s, 0, h, s, colF, colT, colS, glow > 0 && !p.reduced ? clamp(0.55 * glow * val, 0, 0.9) : 0, mix(base, hot, WIRE_HOT_MIX), alpha); // #343: Wireframe/Top-Glow mehr Deckfarbe (war 0.4)
          }
        }
      }
      if (drawSpots) {
        if (p.reduced) spotBass = 0; else computeSpotBass(hasAudio);
        drawSpotlights(spotCol);
      }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    }

    // #perf: Ambiente-Effekt auf ~40 fps (Desktop) bzw. ~30 fps (Mobile/lite) drosseln — der rAF-Callback läuft jede
    // Frame (billig), gerendert wird nur alle FRAME_MS. Halbiert die Renderlast ggü. 60 fps, die App bleibt flüssig.
    let lastT = 0;
    function frame(now) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const FRAME_MS = liteOn() ? 40 : 24; // #perf-mobile: lite ~25fps (war ~30) — Ambiente verträgt das
      if (now - lastT < FRAME_MS) return;
      lastT = now;
      render();
    }
    // #perf-overlay-2: `active` false = Brett von einem Vollbild-Overlay verdeckt → Loop gar nicht erst starten.
    function start() { if (!raf && !disposed && propsRef.current.active !== false && document.visibilityState !== "hidden") raf = requestAnimationFrame(frame); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    resize();
    const ro = new ResizeObserver(() => { resize(); if (propsRef.current.reduced) render(); });
    ro.observe(host);
    const onVis = () => { if (document.visibilityState === "hidden") stop(); else start(); };
    // #perf-overlay-2: derselbe Schalter für „Brett verdeckt". Der Mount-Effekt hat keine Prop-Deps, also muss der
    //   Wechsel von außen angestoßen werden (Effekt unten) — sonst liefe der Loop bis zum Unmount weiter.
    syncRef.current = () => { if (propsRef.current.active === false) stop(); else start(); };
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

  useEffect(() => { syncRef.current?.(); }, [active]);

  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}
