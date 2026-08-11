import { useEffect, useRef } from "react";
import { Application, Graphics } from "pixi.js";
import { drawEdgeGlow } from "./cardFx/edgeGlow.js";

/* CardFxStage (#318) — EINE geteilte Pixi-Overlay-Bühne ÜBER den Karten (z>10) für die stapelbaren
   Karten-Dauer-Layer (Edge-Glow · später Holo-Sweep · Glitch) und die Materialize-Reveal-Transition.
   Zeichnet pro Karten-Rechteck (Spieler- UND Gegnerkarte) an deren Bildschirm-Box, relativ zu `panelRef`
   — Vorbild ist der Blitzrahmen (IonStorm) und die Feuer-Glut (FireBurn), NICHT ein Canvas pro Karte.

   Sauberkeit (wie IonStorm):
   - EINE `Application`, additive Blends durchgehend (`Graphics.blendMode="add"`), DPR ≤ 2, KEIN shadowBlur.
   - Ticker läuft NUR, wenn mindestens ein Layer aktiv, mindestens eine Karte sichtbar UND der Tab sichtbar ist.
   - Pixi v8 init ist async → `disposed`-Guard; Cleanup zerstört die App (Graphics hängen als Kinder dran).
   - Gate am Mount-Ort (Preview/Dev) → Produktion lädt kein Pixi (Ziel des Pixi-Umbaus: DOM-Effekte vermeiden).

   Contract (analog Feld-Effekte): Props setzen die Dauer-Layer + Params. `materialize`/`dematerialize`
   (Reveal-Transition, Layer 4) docken später an; der Build-Fortschritt wird dann nach außen gereicht, damit
   der Blitzrahmen (IonStorm) MIT der Karte erscheint statt vor ihr.

   Renderreihenfolge pro Karte (unten→oben): Edge-Glow · Holo-Sweep · Glitch. Aktuell implementiert: Edge-Glow. */

// [TUNING] Tier-Multiplikator (Stufen 0–4, aus fxIntensity) — skaliert die Intensität der Dauer-Layer (#318).
const TIER_MUL = [0.55, 0.72, 0.88, 1.0, 1.18];

// "#rrggbb"/"#rgb" → 0xRRGGBB (Fallback bei Unfug).
const colNum = (hex, fb = 0x5a8ade) => {
  const h = String(hex || "").replace("#", "");
  if (!h) return fb;
  const v = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return Number.isFinite(v) ? v : fb;
};

export function CardFxStage({
  panelRef,
  cards = [],                 // [{ ref, active }] — je Karte ein DOM-Ref (Box) + ob sie gerade Effekte tragen soll
  layers = {},                // { edgeGlow?, holo?, glitch? } — welche Dauer-Layer an sind
  color = "#5a8ade", color2 = null,
  tier = 0, reduced = false, lite = false,
}) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const gListRef = useRef([]);           // eine additive Graphics je Karte (Index-gleich zu `cards`)
  const clockRef = useRef({ t: 0 });
  const applyRunRef = useRef(null);
  // Live-Props für den Ticker spiegeln (App wird nur EINMAL gebaut).
  const stateRef = useRef(null);
  stateRef.current = {
    panelRef, cards, layers,
    colInt: colNum(color),
    col2Int: color2 != null ? colNum(color2, colNum(color)) : null,
    tierMul: TIER_MUL[Math.max(0, Math.min(TIER_MUL.length - 1, tier | 0))],
    reduced, lite,
    anyLayer: !!(layers && (layers.edgeGlow || layers.holo || layers.glitch)),
    anyActive: (cards || []).some((c) => c && c.active),
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let disposed = false;
    const canvas = document.createElement("canvas");
    const app = new Application();

    // Graphics für Karten-Index i sicherstellen (lazy, additiv).
    const ensureG = (i) => {
      let g = gListRef.current[i];
      if (!g && appRef.current) { g = new Graphics(); g.blendMode = "add"; appRef.current.stage.addChild(g); gListRef.current[i] = g; }
      return g;
    };
    const clearAll = () => { for (const g of gListRef.current) if (g) g.clear(); };

    const tick = (ticker) => {
      const st = stateRef.current;
      const panel = st.panelRef?.current;
      if (!panel || !st.anyLayer) { clearAll(); return; }
      const pr = panel.getBoundingClientRect();
      clockRef.current.t += ticker.deltaMS;
      const tSec = clockRef.current.t / 1000;
      const list = st.cards || [];
      for (let i = 0; i < list.length; i++) {
        const g = ensureG(i);
        if (!g) continue;
        const c = list[i], el = c?.ref?.current;
        if (!el || !c.active) { g.clear(); continue; }
        const cr = el.getBoundingClientRect();
        const w = cr.width, h = cr.height;
        if (w < 8 || h < 8) { g.clear(); continue; }
        // Overlay-Graphics panel-lokal auf die Kartenbox setzen; danach in lokalen 0..w/0..h-Koordinaten zeichnen.
        g.position.set(cr.left - pr.left, cr.top - pr.top);
        g.clear();
        const sc = h / 360;   // Board-Raum HREF=360 → echte Kartenhöhe
        const p = { color: st.colInt, color2: st.col2Int, tierMul: st.tierMul, reduced: st.reduced, lite: st.lite };
        if (st.layers.edgeGlow) drawEdgeGlow(g, w, h, sc, p, tSec);
        // TODO(#318): holo (unter der Zahl) · glitch (Karten-Textur) hier in dieser Reihenfolge andocken.
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
      app.ticker.add(tick);
      applyRun();
    }).catch(() => { /* WebGL fehlt → Overlay bleibt leer, Spiel läuft normal weiter */ });

    function applyRun() {
      const a = appRef.current;
      if (!a) return;
      const st = stateRef.current;
      const run = st.anyLayer && st.anyActive && document.visibilityState !== "hidden";
      if (run) a.ticker.start();
      else { a.ticker.stop(); clearAll(); }
    }
    applyRunRef.current = applyRun;
    const onVis = () => applyRun();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVis);
      const a = appRef.current; appRef.current = null; gListRef.current = [];
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
    // App EINMAL bauen; Layer/Params/Position kommen über Refs bzw. den Lauf-Effekt.
  }, []);

  // Lauf-Zustand bei Prop-Wechseln spiegeln (idempotent: start/stop nach anyLayer && anyActive && sichtbar).
  useEffect(() => { applyRunRef.current?.(); });

  return (
    <div ref={hostRef} aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11 }} />
  );
}
