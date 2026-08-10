import { useEffect, useRef, useCallback } from "react";
import { Application, Graphics } from "pixi.js";

/* PixiStage (Pixi-Umbau, Phase 0/1) — eine GPU-Render-Bühne, die NEBEN React lebt und (vorerst) nichts am Look
   ändert: transparenter Hintergrund, `pointer-events: none`, als absolutes Overlay im Battlefield-Panel. Ziel dieser
   Stufe ist reine Infrastruktur — der saubere Lebenszyklus, an den später Effekt für Effekt andockt (Glutfunken →
   GPU-Partikel, echtes Bloom als Filter, Flammen-Shader …). Die Spiel-Logik bleibt komplett unberührt.

   Sauberkeit, die hier zählt:
   - Pixi v8 initialisiert ASYNCHRON (`app.init`). Wird die Komponente vor Fertigstellung unmountet, darf keine
     verwaiste App/Canvas zurückbleiben → `disposed`-Guard + Destroy im Cleanup.
   - Der Ticker läuft NUR, wenn die Bühne aktiv UND der Tab sichtbar ist (spart Akku/CPU im Hintergrund; sonst würde
     eine rAF-Schleife weiterlaufen, obwohl niemand hinschaut).
   - DPR gedeckelt auf 2 (wie der Rest des Spiels, s. Battlefield-Canvas) → scharf, aber nicht 3×-teuer auf Handys.
   - Gerendert wird die Bühne nur im Preview/Test- oder Dev-Build (Gate am Mount-Ort); Produktion (main) bleibt
     Pixel-identisch, bis ein echter Effekt bewusst live geht. */
export function PixiStage({ active = true, debug = false, className }) {
  const hostRef   = useRef(null);
  const appRef    = useRef(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  // Ticker-Lauf-Zustand aus (aktiv && sichtbar) ableiten — an EINER Stelle, damit Init, active-Wechsel und
  // visibilitychange nicht auseinanderlaufen (Race: der active-Effekt feuert evtl. vor dem async init).
  const applyRunState = useCallback(() => {
    const app = appRef.current;
    if (!app) return;
    const run = activeRef.current && document.visibilityState !== "hidden";
    if (run) app.ticker.start(); else app.ticker.stop();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let disposed = false;
    const canvas = document.createElement("canvas");

    const app = new Application();
    app.init({
      canvas,
      backgroundAlpha: 0,                 // transparent → ändert den bestehenden Look nicht
      antialias: true,
      autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      resizeTo: host,                     // Pixi hält die Canvas automatisch auf Container-Größe
      powerPreference: "high-performance",
    }).then(() => {
      if (disposed) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } return; }
      appRef.current = app;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      host.appendChild(canvas);
      if (debug) buildProof(app);
      applyRunState();                    // sofort korrekt starten/stoppen (falls inaktiv/Hintergrund)
    }).catch(() => { /* WebGL nicht verfügbar → Bühne bleibt leer, Spiel läuft normal weiter */ });

    const onVis = () => applyRunState();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVis);
      const a = appRef.current;
      appRef.current = null;
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
  // debug ist statisch pro Mount; active wird separat über applyRunState gespiegelt
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debug]);

  // active-Wechsel → Ticker-Zustand spiegeln (ohne die App neu zu bauen)
  useEffect(() => { applyRunState(); }, [active, applyRunState]);

  return (
    <div ref={hostRef} className={className} aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
  );
}

/* Sichtbarer Lebens-Beweis für Phase 0: ein kleiner, dezent pulsierender Cyan-Ring unten links im Panel — von der
   GPU gezeichnet, ÜBER dem React-DOM. Bestätigt, dass die Bühne koexistiert und rendert, ohne das Gameplay zu stören.
   Fällt weg, sobald echte Effekte hier andocken. */
function buildProof(app) {
  const g = new Graphics();
  app.stage.addChild(g);
  let t = 0;
  app.ticker.add((ticker) => {
    t += ticker.deltaMS / 1000;
    const cy = app.screen.height - 22, cx = 22;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    g.clear();
    g.circle(cx, cy, 9 + pulse * 3).stroke({ width: 1.5, color: 0x35e0ff, alpha: 0.35 + pulse * 0.35 });
    g.circle(cx, cy, 2.5).fill({ color: 0x8a7de0, alpha: 0.9 });
  });
}
