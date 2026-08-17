import { useEffect, useRef } from "react";
import { dprCap, frameMinMs } from "./mobileTier.js"; // #perf-mobile: Auflösungs-/Zeichenrate-Deckel (eine Wahrheit)

/* Karten-Animation „Kantenglühen" (Edge-Glow, #318) als KIND der Kartenvorderseite — additiv gestapelte Rounded-Rect-
   Strokes um die Kartenkante (weicher Halo ohne Blur) + weiß-heiße Kern-Linie; der Deck-Verlauf färbt den Rand diagonal
   color→color2, „Atmen" moduliert die Helligkeit langsam. Renderer + TUNE 1:1 aus dem Edge-Glow-Board (cardFx/edgeGlow.js).

   #flip-fix (2026-08-12): Liegt jetzt IN der Kartenvorderseite (Flip-Front-Face), NICHT mehr als Pixi-Panel-Overlay auf
   den Deck-Slots → der Rahmen flippt/dealt/fliegt mit der Karte mit (CSS-Transform-Vererbung) und liegt UNTER Eis (z-1)
   und Moos (z-2): Karte < Kantenglühen (z-0) < Eis < Moos. Kaufbarer Shop-Effekt → läuft auch in Produktion (nicht
   preview-gegatet); Canvas-2D (kein Pixi-Shader → mobiltauglich, analog Moos/Eis). Animiert (Atmen) → rAF, solange
   sichtbar; bei reduced Standbild. */

// ── TUNE (Board-Raum HREF=360; halo.breite/rand.breite werden mit sc = cardH/360 skaliert) ──
const EDGE_TUNE = {
  rand:  { breite: 0.5, staerke: 0, kern: 0.28, inset: 0 },
  halo:  { breite: 15, staerke: 0.68, lagen: 5, falloff: 1.5 },
  atem:  { amp: 0.35, freq: 0.45, basis: 0.52 },
  farbe: { deckMix: 0, gradient: true },
};
const CARD_CORNER = 12;   // rounded-xl der Karte (echte Geometrie in CSS-px, NICHT sc-skaliert)
const HREF = 360;         // Board-Referenz-Kartenhöhe

function roundRectPath(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/* #perf-overlay: `active` = false, sobald das Brett von einem Vollbild-Overlay verdeckt ist (Auswahl-Phasen) oder
   der Lauf pausiert. Dann hält die rAF-Schleife an — vorher lief sie (zweimal, je Karte) mit voller Rate weiter,
   während z. B. der Architekten-Bildschirm darüber lag. */
export function CardEdgeGlow({ color = "#5a8ade", color2 = null, reduced = false, lite = false, active = true }) {
  const hostRef = useRef(null);
  const stateRef = useRef({ color, color2, reduced, lite, active });
  stateRef.current = { color, color2, reduced, lite, active };
  const syncRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;pointer-events:none;display:block";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let cw = 0, ch = 0, DPR = 1, mgn = 8, clockT = 0, last = 0, raf = 0, disposed = false;
    const MIN_MS = frameMinMs(); let lastDraw = -1e9;

    function size() {
      const w = host.clientWidth, h = host.clientHeight;
      if (w < 4 || h < 4) return false;
      DPR = dprCap();
      const sc = h / HREF;
      const m = Math.max(4, Math.ceil(EDGE_TUNE.halo.breite * sc));   // Rand für den nach AUSSEN blutenden Halo
      if (w !== cw || h !== ch || m !== mgn) {
        cw = w; ch = h; mgn = m;
        canvas.style.left = (-mgn) + "px"; canvas.style.top = (-mgn) + "px";
        canvas.style.width = (cw + 2 * mgn) + "px"; canvas.style.height = (ch + 2 * mgn) + "px";
        canvas.width = Math.round((cw + 2 * mgn) * DPR); canvas.height = Math.round((ch + 2 * mgn) * DPR);
      }
      return true;
    }

    function draw() {
      const p = stateRef.current;
      if (!size()) { canvas.style.display = "none"; return; }
      canvas.style.display = "block";
      const T = EDGE_TUNE, sc = ch / HREF, ox = mgn, oy = mgn;
      const osc = 0.5 + 0.5 * Math.sin(2 * Math.PI * T.atem.freq * (clockT / 1000));
      const I = p.reduced ? Math.max(T.atem.basis, 1 - T.atem.amp * 0.5) : Math.max(T.atem.basis, 1 - T.atem.amp * (1 - osc));
      const lagen = p.lite ? Math.max(3, T.halo.lagen - 2) : T.halo.lagen;
      const gradient = T.farbe.gradient && p.color2 && p.color2 !== p.color;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, cw + 2 * mgn, ch + 2 * mgn);
      ctx.globalCompositeOperation = "lighter"; ctx.lineJoin = "round"; ctx.lineCap = "round";
      let stroke = p.color;
      if (gradient) { const g = ctx.createLinearGradient(ox, oy, ox + cw, oy + ch); g.addColorStop(0, p.color); g.addColorStop(1, p.color2); stroke = g; }
      // Halo: breiteste/dunkelste Lage zuerst → additiv nach innen aufhellen (weicher Falloff ohne Blur).
      for (let i = lagen - 1; i >= 0; i--) {
        const width = (T.halo.breite * sc * (i + 1)) / lagen;
        const alpha = Math.min(1, (T.halo.staerke * I) / Math.pow(i + 1, T.halo.falloff));
        if (alpha < 0.004 || width < 0.05) continue;
        ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.strokeStyle = stroke;
        roundRectPath(ctx, ox, oy, cw, ch, CARD_CORNER); ctx.stroke();
      }
      // Weiß-heiße Kern-Linie direkt auf der Kante.
      if (T.rand.kern > 0) {
        ctx.globalAlpha = Math.min(1, T.rand.kern * I); ctx.lineWidth = Math.max(0.75, T.rand.breite * sc); ctx.strokeStyle = "#ffffff";
        roundRectPath(ctx, ox, oy, cw, ch, CARD_CORNER); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }

    function frame(now) {
      if (disposed) return;
      clockT += Math.min(50, now - last); last = now;
      // #perf-mobile: auf dem Handy nur ~30 Zeichnungen/s. Die Uhr (clockT) läuft in ECHTZEIT weiter → die Animation
      //   bleibt tempo-korrekt, es wird nur seltener gemalt. Schwelle inkl. Judder-Toleranz, s. mobileTier.js.
      if (now - lastDraw >= MIN_MS) { lastDraw = now; draw(); }
      const st = stateRef.current;
      if (st.reduced || !st.active || document.visibilityState === "hidden") { lastDraw = -1e9; draw(); raf = 0; return; } // Standbild/verdeckt → rAF anhalten
      raf = requestAnimationFrame(frame);
    }
    function ensureRun() {
      if (disposed) return;
      const st = stateRef.current;
      const run = !st.reduced && st.active && document.visibilityState !== "hidden";
      if (run) { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
      else { if (raf) { cancelAnimationFrame(raf); raf = 0; } draw(); }   // reduced → einmal statisch
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

  useEffect(() => { syncRef.current?.(); }, [color, color2, reduced, lite, active]);

  // z-0 = ÜBER dem Karten-Skin, aber UNTER Eis (z-1) und Moos (z-2) im selben Karten-Wrapper.
  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible", zIndex: 0 }} />;
}

export default CardEdgeGlow;
