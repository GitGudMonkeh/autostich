import { useEffect, useRef, useCallback } from "react";
import { Application } from "pixi.js";
import { createEmberField } from "./embersPixi.js";

/* PixiStage (Pixi-Umbau) — eine GPU-Render-Bühne, die NEBEN React lebt: transparenter Hintergrund,
   `pointer-events: none`, als absolutes Overlay im Battlefield-Panel. Phase 0/1 war reine Infrastruktur
   (sauberer Lebenszyklus + Debug-Ring als Lebens-Beweis). Phase 2: der erste echte Effekt dockt an — die
   Glutfunken (`effect="embers"`) laufen jetzt als GPU-Partikel-Emitter (embersPixi.js) statt als DOM-Nodes.
   Der Debug-Ring ist damit weg. Die Spiel-Logik bleibt komplett unberührt.

   Sauberkeit, die hier zählt:
   - Pixi v8 initialisiert ASYNCHRON (`app.init`). Wird die Komponente vor Fertigstellung unmountet, darf keine
     verwaiste App/Canvas zurückbleiben → `disposed`-Guard + Destroy im Cleanup (Emitter zuerst, dann App).
   - Der Ticker läuft NUR, wenn die Bühne aktiv UND der Tab sichtbar ist (spart Akku/CPU im Hintergrund).
   - DPR gedeckelt auf 2 (wie der Rest des Spiels) → scharf, aber nicht 3×-teuer auf Handys.
   - Gerendert wird die Bühne nur im Preview/Test- oder Dev-Build (Gate am Mount-Ort); Produktion (main) bleibt
     Pixel-identisch — Pixi wird dort nie geladen. */
export function PixiStage({
  active = true, className,
  effect = null, color = "#ffffff", score = 0, reduced = false, lite = false,
  sweepId = 0, sweepDur = 900, win = false,
}) {
  const hostRef   = useRef(null);
  const appRef    = useRef(null);
  const fieldRef  = useRef(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  // Aktuelle Effekt-Parameter für die (async) Init spiegeln — beim Fertigstellen des Init sofort korrekt setzen,
  // falls sich zwischen Mount und init-Auflösung schon etwas geändert hat.
  const paramsRef = useRef(null);
  paramsRef.current = { effect, color, score, reduced, lite };
  const lastSweep = useRef(0);

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
      const field = createEmberField(app);
      fieldRef.current = field;
      field.setParams(paramsRef.current);  // Start-Parameter sofort setzen (Init lief evtl. „hinterher")
      applyRunState();                      // sofort korrekt starten/stoppen (falls inaktiv/Hintergrund)
    }).catch(() => { /* WebGL nicht verfügbar → Bühne bleibt leer, Spiel läuft normal weiter */ });

    const onVis = () => applyRunState();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVis);
      const f = fieldRef.current;
      fieldRef.current = null;
      if (f) { try { f.destroy(); } catch { /* ignore */ } }
      const a = appRef.current;
      appRef.current = null;
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
  // Bühne EINMAL bauen; Parameter/active werden separat über Refs bzw. Effekte gespiegelt.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Laufende Parameter (Effekt/Deckfarbe/Score/Modus) → Emitter spiegeln (ohne die App neu zu bauen).
  useEffect(() => {
    fieldRef.current?.setParams({ effect, color, score, reduced, lite });
  }, [effect, color, score, reduced, lite]);

  // Stich-Wechsel (sweepId) → eine Eruption auslösen. Nur bei echtem Wechsel und sweepId>0.
  useEffect(() => {
    if (sweepId === lastSweep.current) return;
    lastSweep.current = sweepId;
    if (sweepId > 0) fieldRef.current?.erupt({ sweepId, sweepDur, win, score });
  }, [sweepId, sweepDur, win, score]);

  // active-Wechsel → Ticker-Zustand spiegeln (ohne die App neu zu bauen)
  useEffect(() => { applyRunState(); }, [active, applyRunState]);

  return (
    <div ref={hostRef} className={className} aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
  );
}
