import { useEffect, useRef } from "react";
import { isCoarse, dprCap, DRAW_HZ_COARSE } from "./mobileTier.js";
import { PIXI_FIELD_VERT, toPixiFragment, fieldQuadGeometry } from "./pixiFieldShader.js";
import { NEONSURF_FRAG } from "./neonsurfShader.js";
import { AURORA_FRAG_SRC } from "./auroraShader.js";

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

   Stand: ZWEI Ebenen (Neon-Brandung, Aurora) — und sie schließen einander aus, es läuft also immer höchstens EINE.
   „Leuchten" (deckglow) war die dritte und die einzige, die gleichzeitig mit einem Hintergrund lief; sie ist mit
   #deckglow-raus entfallen (Begründung in themes.js). Damit ist der Kompositor derzeit wieder nur der gemeinsame
   PFAD, nicht die gemeinsame FLÄCHE — das Bündeln (`stack`) ist mit seiner einzigen Aufruferin gegangen.
   Der Wert, der bleibt: EINE Fassung je Shader, Auflösung je Ebene, und ein Ort, an dem die nächste Ebene landet.

   Wie eine portierte Ebene abgenommen wird: Bild gegen Bild, bei EINGEFRORENER Zeit (`animate={false}` friert beide
   Pfade auf dieselbe Sekunde), und der Unterschied wird GERECHNET statt begutachtet. Für Leuchten ist die mittlere
   Abweichung über die Fläche 0,0 von 255 — pixelgleich zur Canvas-Fassung. Ein Blickvergleich hätte das nicht
   hergegeben: bei additivem Magenta auf grünen Konturen habe ich sogar ein vertikal gespiegeltes Bild zuerst für
   richtig gehalten. */

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
    /* Je Frame gepflegte Uniforms (die restlichen stehen fest, bis sich die Props ändern).
       `surge` kommt vom Battlefield als `{ id, mag }` — OHNE Zeitstempel. Der Shader braucht aber die ZEIT SEIT
       der Ansage (`uSurgeT`), und die muss die Ebene selbst führen: neue id → Startzeit merken, danach hochzählen.
       Das war zuerst falsch (ich las ein `p.surge.t`, das es nie gab) → der Impact-Puls der Groß-Ansagen wäre im
       Kompositor stumm geblieben, ohne dass irgendetwas kaputt ausgesehen hätte. Ohne Ansage 999 = „lange her";
       NIE negativ, sonst Inf → NaN (s. pixiFieldShader.js, Falle 4). */
    tick: (u, p, tSec, size, mem) => {
      u.uTime = tSec;
      u.uRes = [size.w, size.h];
      u.uMode = p.deckColored ? 1 : 0;
      u.uDeck1 = p.d1; u.uDeck2 = p.d2;
      const sg = p.surge;
      if (sg && sg.id !== mem.surgeId) { mem.surgeId = sg.id; mem.surgeStart = tSec; mem.surgeMag = +sg.mag || 0; }
      if (mem.surgeStart == null) { u.uSurgeT = 999; u.uSurgeMag = 0; }
      else { u.uSurgeT = tSec - mem.surgeStart; u.uSurgeMag = mem.surgeMag; }
    },
  },

  /* Aurora — rein prozedural, kein Sampler, also derselbe mechanische Port wie die Brandung.
     Auflösungsfaktor bewusst NIEDRIGER als bei der Brandung (0,6 statt 0,75): Aurora sind breite, weiche
     Vorhänge ohne harte Kante — genau der Inhalt, der Hochskalieren verzeiht, während die Wasserlinie der
     Brandung es nicht tat. Das ist eine begründete Schätzung, KEINE Messung: sie gehört am Gerät bestätigt
     wie die 0,75, bevor man sie stehen lässt. Zu weich → hochsetzen, das ist eine Zahl. */
  aurora: {
    frag: () => toPixiFragment(AURORA_FRAG_SRC),
    scaleCoarse: 0.6,
    scaleDesktop: 1,
    blend: "normal",
    uniforms: (p, size) => ({
      uRes: { value: [size.w, size.h], type: "vec2<f32>" },
      uTime: { value: 0, type: "f32" },
      uMode: { value: p.deckColored ? 1 : 0, type: "f32" },
      uDeck1: { value: p.d1, type: "vec3<f32>" },
      uDeck2: { value: p.d2, type: "vec3<f32>" },
      // Vorhang-Anzahl wie in der Originalfassung: mobil 3, sonst 5.
      uLayers: { value: isCoarse() ? 3 : 5, type: "f32" },
      uBandScale: { value: p.bandScale ?? 1, type: "f32" },
      uBandShift: { value: p.bandShift ?? 0, type: "f32" },
    }),
    tick: (u, p, tSec, size) => {
      u.uTime = tSec;
      u.uRes = [size.w, size.h];
      u.uMode = p.deckColored ? 1 : 0;
      u.uDeck1 = p.d1; u.uDeck2 = p.d2;
      u.uBandScale = p.bandScale ?? 1;
      u.uBandShift = p.bandShift ?? 0;
    },
  },
};



export const COMPOSITOR_LAYER_KEYS = Object.keys(LAYERS);

/* Für den Wächter (test/pixi-field-shader.test.js): den portierten Fragment-Shader einer Ebene bauen, ohne WebGL.
   Der Port ist die Stelle, an der zwei stille Fehler saßen (uv-Ersetzung, reserviertes Wort) — beide hätten hier
   angeschlagen, lange bevor ein Gerät sie zeigt. */
export function layerFragment(key) {
  return LAYERS[key].frag();
}

/* Prop-Bag einer Ebene in die Form bringen, die `uniforms`/`tick` erwarten. Die Farbumrechnung passiert hier und
   nicht in den Ebenen-Definitionen, damit jede Ebene dieselben Rückfallfarben sieht. */
function normProps(p = {}) {
  return {
    ...p,
    d1: hexToRgb(p.color, [0.0431, 0.2275, 0.2667]),
    d2: hexToRgb(p.color2 || p.color, [0.2, 1.0, 0.8]),
  };
}

function hexToRgb(h, fb) {
  if (typeof h !== "string") return fb;
  let s = h.replace("#", "");
  if (s.length === 3) s = s.replace(/(.)/g, "$1$1");
  const n = parseInt(s, 16);
  if (!Number.isFinite(n)) return fb;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/* `?fxs=<zahl>` überschreibt den Auflösungsfaktor ALLER Ebenen — der Regler, mit dem am echten Gerät entschieden
   wird, statt am Schreibtisch zu schätzen. Genauso ist die 0,75 der Brandung zustande gekommen. Nur zusammen mit
   `?fx2=1` sinnvoll und hinter demselben Preview/Dev-Gate; ohne den Parameter bleibt es beim Wert der Ebene.
   `?fxs=1` heißt „volle Auflösung" und beantwortet damit die wichtigste Frage überhaupt: liegt ein weiches oder
   grobes Bild an DIESEM Faktor — oder am Effekt selbst? */
function scaleOverride() {
  try {
    const v = parseFloat(new URLSearchParams(window.location.search).get("fxs"));
    return Number.isFinite(v) && v > 0.1 && v <= 2 ? v : null;
  } catch { return null; }
}

export default function FieldCompositor({ layer = "neonsurf", active = true, ...rest }) {
  const hostRef = useRef(null);
  /* EINE Ebene je Bühne. Es gab hier einen `stack`-Prop (`[{ key, props }]`, von unten nach oben) — er existierte
     ausschließlich für „Leuchten läuft gleichzeitig mit Aurora/Brandung". Mit #deckglow-raus hat er keinen Aufrufer
     mehr, und ein ungenutzter zweiter Pfad ist in diesem Projekt schon einmal auseinandergelaufen.
     Die Ebenen-LISTE unten bleibt trotzdem eine Liste: sie ist der Grund, aus dem der Kompositor existiert
     (mehrere Shader in EINEM Kontext, EIN Composite). Eine zweite gleichzeitige Ebene kommt hier wieder rein —
     dann zusammen mit ihrem Aufrufer, nicht auf Vorrat. */
  const entries = [{ key: layer, props: rest }];

  // Live-Props für den Ticker spiegeln — die Bühne wird nur EINMAL gebaut (Muster wie PixiStage:
  // ein Prop-Wechsel darf den WebGL-Kontext nicht abreißen, sonst blitzt der Effekt bei jedem Farbwechsel weg).
  const entriesKey = entries.map((e) => e.key).join(",");

  const pRef = useRef([]);
  pRef.current = entries.map((e) => normProps(e.props));
  const activeRef = useRef(active);
  activeRef.current = active;
  const applyRunRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const keys = entriesKey.split(",");
    if (!host || keys.some((k) => !LAYERS[k])) return undefined;

    let disposed = false, app = null;
    let layers = [];              // je Ebene ein Satz Pixi-Objekte, s. Aufbau unten
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
        // #perf-mobile: Zeichenrate auf dem Handy aus mobileTier (EINE Wahrheit, per `?hz=` am Gerät regelbar).
        // Pixis maxFPS braucht die halbe Frame-Toleranz nicht, weil es intern akkumuliert.
        app.ticker.maxFPS = coarse ? DRAW_HZ_COARSE : 0;

        /* Ebenen in Array-Reihenfolge auf die Bühne — Index 0 liegt UNTEN. Das ist genau die z-Ordnung, die die
           Aufrufer vorher über getrennte DOM-Ebenen hergestellt haben (Leuchten unter dem Hintergrund). */
        layers = keys.map((key, i) => {
          const def = LAYERS[key];
          const scale = scaleOverride() ?? (coarse ? def.scaleCoarse : def.scaleDesktop);
          /* Bei Faktor 1 KEINE Render-Textur, sondern direkt auf die Bühne.
             Der Umweg ist bei voller Auflösung nicht gratis: `Math.round` auf eine krumme CSS-Breite lässt Textur-
             und Bildschirmmaß um Bruchteile auseinanderlaufen, und das Hochskalieren des Sprites resampelt dann die
             ganze Fläche. Gemessen (Handy-Viewport, gegen die Canvas-Fassung): mit Umweg blieb bei Faktor 1 eine
             mittlere Abweichung von 1,81 von 255 stehen — sichtbar genau da, wo ein konturen-naher Effekt lebt.
             Ohne Umweg ist Faktor 1 wieder exakt der alte Pfad. */
          const direct = scale >= 0.999;
          // Die Render-Textur ist die eigentliche Ersparnis: sie ist um `scale` KLEINER als die Bühne und wird
          // beim Zusammensetzen hochskaliert. Kosten ∝ Fläche → quadratisch in scale.
          const rtSize = () => (direct
            ? { w: Math.max(2, app.screen.width), h: Math.max(2, app.screen.height) }
            : {
              w: Math.max(2, Math.round(app.screen.width * scale)),
              h: Math.max(2, Math.round(app.screen.height * scale)),
            });
          const size = rtSize();
          const rt = direct ? null
            : RenderTexture.create({ width: size.w, height: size.h, resolution: app.renderer.resolution, antialias: false });

          const props = pRef.current[i] || {};
          const resources = {
            fieldUniforms: def.uniforms(props, { w: size.w * app.renderer.resolution, h: size.h * app.renderer.resolution }),
          };
          /* Ebenen mit `sampler2D` (Leuchten) brauchen von Anfang an eine gebundene Textur: der Sampler-Slot wird
             beim Programmaufbau vergeben, ein späteres Nachreichen allein genügt nicht. Platzhalter ist bewusst ein
             SCHWARZES Pixel — der Shader rechnet daraus Alpha 0, die Ebene ist also unsichtbar statt weiß zu
             blitzen, bis das Battlefield-Bild da ist. */
          const shader = Shader.from({
            gl: GlProgram.from({ vertex: PIXI_FIELD_VERT, fragment: def.frag() }),
            resources,
          });
          const mesh = new Mesh({ geometry: fieldQuadGeometry(MeshGeometry), shader });
          let sprite = null;
          if (direct) {
            mesh.blendMode = def.blend;
            app.stage.addChild(mesh);        // Pixis eigener Render-Durchgang zeichnet sie mit
          } else {
            sprite = new Sprite(rt);
            sprite.blendMode = def.blend;
            app.stage.addChild(sprite);
          }
          return {
            key, def, direct, rtSize, size, rt, sprite, mesh, shader, i,
            frozenT: null,
            mem: { surgeId: null, surgeStart: null, surgeMag: 0 },   // Ebenen-Gedächtnis über Frames (s. tick)
          };
        });

        const t0 = performance.now();
        let tickFails = 0;

        app.ticker.add(() => {
          if (disposed || !app) return;
          try {
            for (const L of layers) {
              const p = pRef.current[L.i] || {};
              const s = L.rtSize();
              if (s.w !== L.size.w || s.h !== L.size.h) {
                L.size = s;
                if (L.rt) L.rt.resize(s.w, s.h);
              }
              // `animate=false` (reduzierte Effekte) → Standbild: Zeit einfrieren statt die Schleife zu stoppen,
              // damit Farb-/Größenwechsel weiterhin sauber durchschlagen.
              const tSec = p.animate === false ? (L.frozenT ??= 6.0) : (performance.now() - t0) / 1000;
              if (p.animate !== false) L.frozenT = null;
              const res = app.renderer.resolution;
              L.def.tick(L.shader.resources.fieldUniforms.uniforms, p, tSec,
                { w: L.size.w * res, h: L.size.h * res }, L.mem);

              // Ebene in ihre Textur (klein), dann skaliert die Bühne sie auf die volle Fläche — EIN Composite.
              // Bei Faktor 1 hängt die Ebene direkt an der Bühne; dann entfällt der Zwischenschritt komplett.
              L.mesh.width = L.size.w; L.mesh.height = L.size.h;
              if (!L.direct) {
                app.renderer.render({ container: L.mesh, target: L.rt, clear: true });
                L.sprite.width = app.screen.width; L.sprite.height = app.screen.height;
              }
            }
          } catch (e) {
            /* Ein Effekt darf nicht in eine Fehlerflut pro Frame laufen. Nach drei Fehlversuchen bleibt die Bühne
               still — das Brett läuft weiter, nur ohne diese Effekte. */
            if (++tickFails >= 3) { try { app.ticker.stop(); } catch { /* ignore */ } console.warn("[fx] Kompositor angehalten:", e); }
          }
        });
        applyRunRef.current = applyRun;
        applyRun();
      } catch (e) {
        /* WebGL fehlt oder eine Ebene ist kaputt → Bühne bleibt leer, das Spiel läuft normal weiter. Der Log ist
           wichtig: ein Port-Fehler (s. pixiFieldShader.js) landet genau hier und wäre sonst spurlos. */
        console.warn(`[fx] Kompositor "${entriesKey}" nicht aufgebaut:`, e);
      }
    })();

    const onVis = () => applyRun();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVis);
      const a = app; app = null;
      for (const L of layers) {
        if (L.rt) { try { L.rt.destroy(true); } catch { /* ignore */ } }
      }
      layers = [];
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
  }, [entriesKey]);

  /* #perf-overlay: Ticker anhalten, sobald ein Vollbild-Overlay das Brett verdeckt. Bewusst ein EIGENER Effekt
     ohne `entriesKey` in den Deps — der Aufbau-Effekt oben darf bei einem `active`-Wechsel nicht neu laufen, sonst
     kostete jeder Overlay-Wechsel eine komplette Pixi-Init. */
  useEffect(() => { applyRunRef.current?.(); }, [active]);

  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}
