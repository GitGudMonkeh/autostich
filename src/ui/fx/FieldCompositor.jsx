import { useEffect, useRef } from "react";
import { isCoarse, dprCap } from "./mobileTier.js";
import { PIXI_FIELD_VERT, toPixiFragment, fieldQuadGeometry } from "./pixiFieldShader.js";
import { NEONSURF_FRAG } from "./NeonSurfFieldGL.jsx";

/* FELD-KOMPOSITOR — eine Bühne, viele Ebenen, Auflösung je Ebene.

   WARUM (gemessen, nicht vermutet):
   Heute bringt jeder Feld-Effekt seine eigene Canvas mit: Hintergrund-Effekt (Aurora/Brandung/Würfel-Matrix),
   Hintergrund-Finisher (PixiStage), Leuchten, Karten-Overlay. Das sind vier bis fünf VOLLBILD-Flächen, jede mit
   eigenem WebGL-Kontext, und jede wird vom Browser einzeln in die Seite komponiert — Arbeit obendrauf, die kein
   Effekt selbst sieht. Aus dem Prunk-Messstand ist bekannt, dass die Kosten fast nur an „Canvas-Pixeln pro
   Sekunde" hängen und QUADRATISCH mit der Auflösung skalieren; eine Messung mit allen Ebenen auf alpha 0 kostete
   bereits den Löwenanteil. Der Inhalt ist also nicht das Problem, die Fläche ist es.

   Was das hier ändert:
     • EIN Kontext, EIN Composite statt vier bis fünf.
     • Jede Ebene rendert in eine eigene Render-Textur mit EIGENEM Auflösungsfaktor und wird beim Zusammensetzen
       hochskaliert. Am Gerät bestimmt (Spike-Block 4, Neon-Brandung): 0,75 ist unauffällig, 0,5 sichtbar zu weich
       → ~44 % weniger Füllarbeit für diese Ebene. Der Faktor gehört PRO EBENE eingestellt: die Brandung hat eine
       harte, helle Wasserlinie, Aurora und Leuchten sind viel weicher und tragen vermutlich weniger.

   Was das NICHT ändert: den Shader selbst. Derselbe Shader durch Pixi ist nicht schneller — im Spike liefen der
   raw-WebGL- und der Pixi-Pfad beide bei 60 Zeichnungen/s. Der Gewinn kommt aus Bündelung und Auflösung.

   Stand: EINE Ebene (Neon-Brandung). Die Struktur ist auf mehrere ausgelegt (LAYERS), damit Aurora und Leuchten
   mechanisch nachziehen können — eine Ebene pro Schritt, jede mit eigenem Gate. */

/* Ebenen-Registry. `scaleCoarse`/`scaleDesktop` sind die Auflösungsfaktoren RELATIV zur Bühnen-Auflösung.
   Desktop steht bewusst auf 1: dort ist Füllrate selten der Engpass, und ein sichtbar weicherer Effekt wäre
   ein Rückschritt ohne Gegenwert. Die Faktoren sind das eigentliche Stellrad dieses Moduls. */
const LAYERS = {
  neonsurf: {
    frag: () => toPixiFragment(NEONSURF_FRAG),
    scaleCoarse: 0.75,   // am Gerät bestimmt: 0,5 war sichtbar zu weich (harte Wasserlinie)
    scaleDesktop: 1,
    blend: "normal",     // der Shader gibt PREMULTIPLIZIERTES Alpha aus (vec4(col*a, a))
    uniforms: (p, size) => ({
      uRes: { value: [size.w, size.h], type: "vec2<f32>" },
      uTime: { value: 0, type: "f32" },
      uMode: { value: p.deckColored ? 1 : 0, type: "f32" },
      uDeck1: { value: p.d1, type: "vec3<f32>" },
      uDeck2: { value: p.d2, type: "vec3<f32>" },
      // 999 = „lange keine Ansage". NIE negativ: exp(-uSurgeT/2.3) ergäbe Inf und über 0*Inf ein NaN,
      // das die ganze Ausgabe frisst (s. pixiFieldShader.js, Falle 4).
      uSurgeT: { value: 999, type: "f32" },
      uSurgeMag: { value: 0, type: "f32" },
      uFbmOct: { value: isCoarse() ? 3 : 5, type: "f32" },
    }),
    // Je Frame gepflegte Uniforms (die restlichen stehen fest, bis sich die Props ändern).
    tick: (u, p, tSec, size) => {
      u.uTime = tSec;
      u.uRes = [size.w, size.h];
      u.uMode = p.deckColored ? 1 : 0;
      u.uDeck1 = p.d1; u.uDeck2 = p.d2;
      if (p.surge && p.surge.t != null) { u.uSurgeT = p.surge.t; u.uSurgeMag = p.surge.mag || 0; }
      else { u.uSurgeT = 999; u.uSurgeMag = 0; }
    },
  },
};

export const COMPOSITOR_LAYER_KEYS = Object.keys(LAYERS);

function hexToRgb(h, fb) {
  if (typeof h !== "string") return fb;
  let s = h.replace("#", "");
  if (s.length === 3) s = s.replace(/(.)/g, "$1$1");
  const n = parseInt(s, 16);
  if (!Number.isFinite(n)) return fb;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default function FieldCompositor({ layer = "neonsurf", color = null, color2 = null,
  deckColored = false, animate = true, active = true, surge = null }) {
  const hostRef = useRef(null);
  // Live-Props für den Ticker spiegeln — die Bühne wird nur EINMAL gebaut (Muster wie NeonSurfFieldGL/PixiStage:
  // ein Prop-Wechsel darf den WebGL-Kontext nicht abreißen, sonst blitzt der Effekt bei jedem Farbwechsel weg).
  const pRef = useRef({});
  pRef.current = {
    d1: hexToRgb(color, [0.0431, 0.2275, 0.2667]),
    d2: hexToRgb(color2 || color, [0.2, 1.0, 0.8]),
    deckColored, animate, surge,
  };
  const activeRef = useRef(active);
  activeRef.current = active;
  const applyRunRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const def = LAYERS[layer];
    if (!host || !def) return undefined;

    let disposed = false, app = null, rt = null, mesh = null, sprite = null, shader = null;
    const canvas = document.createElement("canvas");

    const applyRun = () => {
      if (!app) return;
      const run = activeRef.current && document.visibilityState !== "hidden";
      if (run) app.ticker.start(); else app.ticker.stop();
    };

    (async () => {
      try {
        const { Application, Shader, GlProgram, Mesh, MeshGeometry, RenderTexture, Sprite } = await import("pixi.js");
        const coarse = isCoarse();
        app = new Application();
        await app.init({
          canvas, preference: "webgl", backgroundAlpha: 0, antialias: false,
          autoDensity: true, resolution: dprCap(coarse), resizeTo: host, powerPreference: "high-performance",
        });
        if (disposed) { app.destroy(true, { children: true, texture: true }); return; }
        canvas.style.cssText = "width:100%;height:100%;display:block";
        host.appendChild(canvas);
        // #perf-mobile: gedeckelte Zeichenrate auf dem Handy. Die halbe Frame-Toleranz steckt in mobileTier;
        // Pixis maxFPS macht denselben Fehler nicht, weil es intern akkumuliert.
        app.ticker.maxFPS = coarse ? 30 : 0;

        const scale = coarse ? def.scaleCoarse : def.scaleDesktop;
        // Die Render-Textur ist die eigentliche Ersparnis: sie ist um `scale` KLEINER als die Bühne und wird
        // beim Zusammensetzen hochskaliert. Kosten ∝ Fläche → quadratisch in scale.
        const rtSize = () => ({
          w: Math.max(2, Math.round(app.screen.width * scale)),
          h: Math.max(2, Math.round(app.screen.height * scale)),
        });
        let size = rtSize();
        rt = RenderTexture.create({ width: size.w, height: size.h, resolution: app.renderer.resolution, antialias: false });

        const uniforms = def.uniforms(pRef.current, { w: size.w * app.renderer.resolution, h: size.h * app.renderer.resolution });
        shader = Shader.from({
          gl: GlProgram.from({ vertex: PIXI_FIELD_VERT, fragment: def.frag() }),
          resources: { fieldUniforms: uniforms },
        });
        mesh = new Mesh({ geometry: fieldQuadGeometry(MeshGeometry), shader });

        sprite = new Sprite(rt);
        sprite.blendMode = def.blend;
        app.stage.addChild(sprite);

        const t0 = performance.now();
        let frozenT = null;
        app.ticker.add(() => {
          if (disposed || !app) return;
          const p = pRef.current;
          const s = rtSize();
          if (s.w !== size.w || s.h !== size.h) {
            size = s;
            rt.resize(size.w, size.h);
          }
          // `animate=false` (reduzierte Effekte) → Standbild: Zeit einfrieren statt die Schleife zu stoppen,
          // damit Farb-/Größenwechsel weiterhin sauber durchschlagen.
          const tSec = p.animate ? (performance.now() - t0) / 1000 : (frozenT ??= 6.0);
          if (p.animate) frozenT = null;
          def.tick(shader.resources.fieldUniforms.uniforms, p,
            tSec, { w: size.w * app.renderer.resolution, h: size.h * app.renderer.resolution });

          // Ebene in ihre Textur (klein), dann skaliert die Bühne sie auf die volle Fläche — EIN Composite.
          mesh.width = size.w; mesh.height = size.h;
          app.renderer.render({ container: mesh, target: rt, clear: true });
          sprite.width = app.screen.width; sprite.height = app.screen.height;
        });
        applyRunRef.current = applyRun;
        applyRun();
      } catch { /* WebGL fehlt → Bühne bleibt leer, das Spiel läuft normal weiter */ }
    })();

    const onVis = () => applyRun();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVis);
      const a = app; app = null;
      if (rt) { try { rt.destroy(true); } catch { /* ignore */ } rt = null; }
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
  }, [layer]);

  /* #perf-overlay: Ticker anhalten, sobald ein Vollbild-Overlay das Brett verdeckt. Bewusst ein EIGENER Effekt
     ohne `layer` in den Deps — der Aufbau-Effekt oben darf bei einem `active`-Wechsel nicht neu laufen, sonst
     kostete jeder Overlay-Wechsel eine komplette Pixi-Init. */
  useEffect(() => { applyRunRef.current?.(); }, [active]);

  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}
