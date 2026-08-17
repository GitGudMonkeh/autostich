import { useEffect, useRef, useCallback } from "react";
import { Application } from "pixi.js";
import { createStarfield } from "./starfieldPixi.js"; // #glutfunken-raus: embersPixi entfernt

/* Registry der Feld-Effekt-Emitter: key → Factory(app) → { setParams, erupt?, destroy }. Muss zur pixi-freien
   Key-Liste (fieldFxKeys.js) passen, die Battlefield fürs Gating nutzt. Neue Effekte docken hier an.
   Aurora ist NICHT hier: sie läuft als eigenständige WebGL-Canvas (AuroraFieldGL). Die damalige Begründung war
   „Pixis Custom-Shader rendert auf dem Mobile-Setup nicht" — die ist WIDERLEGT (#fx-spike, 2026-08-17): auf dem
   echten Handy rendern Pixi-Custom-Shader, auch der komplette Brandungs-Shader, mit 60 Zeichnungen/s. Aurora
   bleibt vorerst hier draußen, bis der Kompositor-Umbau sie planmäßig einsammelt. */
const FIELD_FX = {
  starfield: createStarfield,
};

/* PixiStage (Pixi-Umbau) — eine GPU-Render-Bühne, die NEBEN React lebt: transparenter Hintergrund,
   `pointer-events: none`, als absolutes Overlay im Battlefield-Panel. Ab Phase 3 SWAPPABLE: je nach `effect`
   baut die Bühne den passenden Feld-Emitter aus der Registry (embers). Wechselt der Effekt (Deck-
   Wechsel), wird der alte Emitter zerstört und der neue gebaut. Die Spiel-Logik bleibt komplett unberührt.

   Sauberkeit, die hier zählt:
   - Pixi v8 initialisiert ASYNCHRON (`app.init`). Wird die Komponente vor Fertigstellung unmountet, darf keine
     verwaiste App/Canvas zurückbleiben → `disposed`-Guard + Destroy im Cleanup (Emitter zuerst, dann App).
   - Der Ticker läuft NUR, wenn die Bühne aktiv UND der Tab sichtbar ist (spart Akku/CPU im Hintergrund).
   - DPR gedeckelt auf 2 (Desktop/full) bzw. 1.4 auf der lite-Stufe (Mobile), plus 30-fps-Cap auf lite → scharf, aber
     nicht 3×-teuer auf Handys.
   - Gerendert wird die Bühne nur im Preview/Test- oder Dev-Build (Gate am Mount-Ort); Produktion (main) bleibt
     Pixel-identisch — Pixi wird dort nie geladen. */
export function PixiStage({
  active = true, className,
  effect = null, color = "#ffffff", color2 = null, score = 0, reduced = false, lite = false, deckTint = false,
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
  paramsRef.current = { effect, color, color2, score, reduced, lite, deckTint };
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
      preference: "webgl",                // #: WebGL erzwingen — der Aurora-Custom-Shader ist GLSL-only (kein WGSL);
                                          //    auf WebGPU (z. B. Android-Chrome) würde er sonst nicht rendern.
      backgroundAlpha: 0,                 // transparent → ändert den bestehenden Look nicht
      antialias: true,
      autoDensity: true,
      // #perf-mobile: auf der lite-Stufe (Mobile/„balanced") die Feld-Bühne auf DPR 1.4 deckeln (Pixel ∝ DPR² →
      //   ~40 % weniger Fill für die additiven Feld-Emitter). Desktop/full bleibt 2. (maxFPS s. .then + Params-Effekt.)
      resolution: Math.min(paramsRef.current.lite ? 1.4 : 2, window.devicePixelRatio || 1),
      resizeTo: host,                     // Pixi hält die Canvas automatisch auf Container-Größe
      powerPreference: "high-performance",
    }).then(() => {
      if (disposed) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } return; }
      appRef.current = app;
      // #perf-mobile: Feld-Bühne auf lite auf 30 fps deckeln (Aurora macht dasselbe) → halbiert den Render-Takt der
      //   Dauer-Emitter auf dem Handy, ohne Partikel zu entfernen. Desktop/full = 0 (ungedeckelt).
      app.ticker.maxFPS = paramsRef.current.lite ? 30 : 0;
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
    fieldRef.current?.setParams({ color, color2, score, reduced, lite, deckTint });
    // #perf-mobile: FPS-Deckel bei Laufzeit-Wechsel der Stufe nachziehen (DPR bleibt init-fest — Setting ändert sich selten).
    if (appRef.current) appRef.current.ticker.maxFPS = lite ? 30 : 0;
  }, [color, color2, score, reduced, lite, deckTint]);

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
