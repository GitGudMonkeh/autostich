import { useEffect, useRef, useCallback } from "react";
import { Application } from "pixi.js";
import { createEmberField } from "./embersPixi.js";
import { createStarfield } from "./starfieldPixi.js";

/* Registry der Feld-Effekt-Emitter: key → Factory(app) → { setParams, erupt?, destroy }. Muss zur pixi-freien
   Key-Liste (fieldFxKeys.js) passen, die Battlefield fürs Gating nutzt. Neue Effekte docken hier an. */
const FIELD_FX = {
  embers: createEmberField,
  starfield: createStarfield,
};

/* PixiStage (Pixi-Umbau) — eine GPU-Render-Bühne, die NEBEN React lebt: transparenter Hintergrund,
   `pointer-events: none`, als absolutes Overlay im Battlefield-Panel. Ab Phase 3 SWAPPABLE: je nach `effect`
   baut die Bühne den passenden Feld-Emitter aus der Registry (embers, starfield, …). Wechselt der Effekt (Deck-
   Wechsel), wird der alte Emitter zerstört und der neue gebaut. Die Spiel-Logik bleibt komplett unberührt.

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
  sweepId = 0, sweepDur = 900, win = false, hitTier = 0,
}) {
  const hostRef   = useRef(null);
  const appRef    = useRef(null);
  const fieldRef  = useRef(null);
  const builtRef  = useRef(null);   // welcher Effekt aktuell gebaut ist
  const activeRef = useRef(active);
  activeRef.current = active;

  // Aktuelle Effekt-Parameter für die (async) Init + spätere Rebuilds spiegeln.
  const paramsRef = useRef(null);
  paramsRef.current = { effect, color, score, reduced, lite };
  const lastSweep = useRef(0);

  // Emitter für `eff` (neu) bauen: alten zerstören, neuen aus der Registry holen (oder keinen, wenn nicht portiert).
  const buildFieldFor = useCallback((eff) => {
    const app = appRef.current;
    if (!app) return;
    if (fieldRef.current) { try { fieldRef.current.destroy(); } catch { /* ignore */ } fieldRef.current = null; }
    const make = FIELD_FX[eff];
    if (make) { const f = make(app); f.setParams(paramsRef.current); fieldRef.current = f; }
    builtRef.current = eff;
  }, []);

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
      buildFieldFor(paramsRef.current.effect);   // Emitter für den aktuellen Effekt bauen (Init lief evtl. „hinterher")
      applyRunState();                            // sofort korrekt starten/stoppen (falls inaktiv/Hintergrund)
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
  // Bühne EINMAL bauen; Effekt/Parameter/active werden separat über Refs bzw. Effekte gespiegelt.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effekt-Wechsel → passenden Emitter neu bauen (vor dem Parameter-Effekt definiert, damit dieser auf den NEUEN baut).
  useEffect(() => {
    if (appRef.current && effect !== builtRef.current) buildFieldFor(effect);
  }, [effect, buildFieldFor]);

  // Laufende Parameter (Deckfarbe/Score/Modus) → Emitter spiegeln (effect kommt über den Rebuild, bleibt hier gemerged).
  useEffect(() => {
    fieldRef.current?.setParams({ color, score, reduced, lite });
  }, [color, score, reduced, lite]);

  // Stich-Wechsel (sweepId) → eine Eruption auslösen. Nur bei echtem Wechsel und sweepId>0.
  useEffect(() => {
    if (sweepId === lastSweep.current) return;
    lastSweep.current = sweepId;
    if (sweepId > 0) fieldRef.current?.erupt({ sweepId, sweepDur, win, score, tier: hitTier });
  }, [sweepId, sweepDur, win, score, hitTier]);

  // active-Wechsel → Ticker-Zustand spiegeln (ohne die App neu zu bauen)
  useEffect(() => { applyRunState(); }, [active, applyRunState]);

  return (
    <div ref={hostRef} className={className} aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
  );
}
