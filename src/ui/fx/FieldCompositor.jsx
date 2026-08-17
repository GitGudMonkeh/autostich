import { useEffect, useRef } from "react";
import { isCoarse, dprCap } from "./mobileTier.js";
import { PIXI_FIELD_VERT, toPixiFragment, fieldQuadGeometry } from "./pixiFieldShader.js";
import { NEONSURF_FRAG } from "./NeonSurfFieldGL.jsx";
import { AURORA_FRAG_SRC } from "./AuroraFieldGL.jsx";
import { DECKGLOW_FRAG_SRC } from "./DeckGlowFieldGL.jsx";

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

   Stand: DREI Ebenen (Neon-Brandung, Aurora, Leuchten). Jede kam einzeln rein, mit eigenem Gate. Leuchten ist die
   erste mit einer Textur und die erste, die GLEICHZEITIG mit einem Hintergrund läuft — Brandung und Aurora sind
   einander ausschließende Hintergründe, es lief also bis dahin trotz „Kompositor" immer nur EINE Ebene.

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
  /* #deckglow — die erste Ebene mit einer TEXTUR: sie sampelt das Battlefield-Bild, sucht dessen helle Linien und
     lässt sie in der Deckfarbe glühen. Und die erste, die GLEICHZEITIG mit einem Hintergrund läuft — erst damit
     ist „ein Composite statt vier bis fünf" überhaupt messbar (Aurora und Brandung schließen einander aus). */
  deckglow: {
    // `vUv` kommt hier aus einer eigenen varying statt aus gl_FragCoord — der Port legt sie auf dieselbe UV.
    frag: () => toPixiFragment(DECKGLOW_FRAG_SRC, { varyingUv: "vUv" }),
    /* KEINE Verkleinerung — als einzige Ebene. Meine erste Schätzung war 0,6 („Halo ist weich"), und sie war
       falsch: der Effekt reitet auf den KONTUREN des Hintergrundbildes, und eine grob gerechnete Glut trifft die
       feinen Linien nicht mehr. Das Urteil am Gerät war „lässt den Hintergrund pixelig wirken, die Details gehen
       verloren", und die Messung gegen die Canvas-Fassung stützt es (mittlere Abweichung von 255, Handy-Viewport):
         0,50 → 5,45 · 0,60 → 4,88 · 0,75 → 3,63 · 0,85 → 3,33 · 1,00 → 0,56
       Kein Knick, an dem man billig davonkäme: von 0,85 auf 1,0 kostet 28 % Füllarbeit und halbiert die Abweichung
       gleich sechsfach. Diese Ebene verdient ihren Platz im Kompositor also über die GETEILTE BÜHNE, nicht über die
       Auflösung. Wer das Verhältnis anders bewerten will: `?fxs=0.75` am Gerät ansehen, es ist eine Zahl. */
    scaleCoarse: 1,
    scaleDesktop: 1,
    blend: "normal",     // premultipliziert: vec4(deckCol*alpha, alpha)
    texture: { name: "uTex", src: (p) => pickBfSrc(p) },
    uniforms: (p, size) => ({
      uRes: { value: [size.w, size.h], type: "vec2<f32>" },
      uTime: { value: 0, type: "f32" },
      uMix: { value: p.on === false ? 0 : 1, type: "f32" },
      uImgAspect: { value: 16 / 9, type: "f32" },   // echter Wert kommt mit dem Bild (s. tick)
      uDeck: { value: p.d1, type: "vec3<f32>" },
    }),
    tick: (u, p, tSec, size, mem) => {
      u.uTime = tSec;
      u.uRes = [size.w, size.h];
      u.uDeck = p.d1;
      if (mem.imgAspect) u.uImgAspect = mem.imgAspect;
      // Weiche An/Aus-Überblendung wie in der Canvas-Fassung (Showcase schaltet damit ohne Sprung um).
      const target = p.on === false ? 0 : 1;
      mem.mix = (mem.mix ?? target) + (target - (mem.mix ?? target)) * 0.12;
      u.uMix = mem.mix;
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

/* Dieselbe Schwelle wie das `<picture media="(max-width: 640px)">` unter dem Effekt — die Glut muss auf DEM Bild
   sitzen, das gerade angezeigt wird. Bewusst ohne Listener: `syncTexture()` läuft je Frame und merkt den Wechsel
   von selbst (ein Stringvergleich pro Frame gegen eine zweite Abo-Verwaltung). */
function pickBfSrc(p) {
  const mobile = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(max-width: 640px)").matches : false;
  return (mobile && p.srcMobile) ? p.srcMobile : (p.srcDesktop || p.srcMobile);
}

/* Schwarzes 1×1 als Sampler-Platzhalter (s. Aufrufer). */
function blankSource(TextureSource) {
  const c = document.createElement("canvas");
  c.width = 1; c.height = 1;
  return new TextureSource({ resource: c, width: 1, height: 1 });
}

/* Bild als Pixi-Textur, MIT gedrehter Y-Achse — Gegenstück zum `UNPACK_FLIP_Y_WEBGL = true` der Canvas-Fassung.

   Der Grund ist derselbe wie dort: die portierte UV zählt von UNTEN (nachgemessen, s. Falle 6 in pixiFieldShader.js),
   Pixi lädt Bilder aber ungedreht hoch (`GlStateSystem` setzt UNPACK_FLIP_Y hart auf false und kein Uploader ändert
   das). Ohne Dreher sampelt die Ebene das vertikal gespiegelte Bild.

   WIE ICH ES GEPRÜFT HABE — und warum das nötig war: Das Hinsehen hat mich hier getäuscht. Die Glut ist additives
   Magenta auf grünen Konturen; „sitzt sie drauf oder daneben" ist bei einem detailreichen Bild nicht zuverlässig zu
   beurteilen, und ich hatte den gespiegelten Zustand zuerst für richtig gehalten. Entschieden hat es erst eine
   Wegwerf-Ebene, die NUR `texture2D(uTex, vUv)` ausgibt, neben dasselbe Bild als DOM-`<img>` gestellt: gespiegelt
   oder nicht, sieht man daran sofort. Wer diese Naht anfasst, prüft sie bitte genauso — nicht am fertigen Effekt. */
async function loadFieldTexture(url, Texture, ImageSource) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const aspect = (img.naturalWidth || img.width) / Math.max(1, img.naturalHeight || img.height);
  const res = typeof createImageBitmap === "function"
    ? await createImageBitmap(img, { imageOrientation: "flipY" })
    : img;   // sehr alte Browser: kein Dreher möglich → gespiegelte Glut statt gar keiner
  return { texture: new Texture({ source: new ImageSource({ resource: res }) }), aspect };
}

export default function FieldCompositor({ layer = "neonsurf", color = null, color2 = null,
  deckColored = false, animate = true, active = true, surge = null, bandScale = 1, bandShift = 0,
  srcDesktop = null, srcMobile = null, on = true }) {
  const hostRef = useRef(null);
  // Live-Props für den Ticker spiegeln — die Bühne wird nur EINMAL gebaut (Muster wie NeonSurfFieldGL/PixiStage:
  // ein Prop-Wechsel darf den WebGL-Kontext nicht abreißen, sonst blitzt der Effekt bei jedem Farbwechsel weg).
  const pRef = useRef({});
  pRef.current = {
    d1: hexToRgb(color, [0.0431, 0.2275, 0.2667]),
    d2: hexToRgb(color2 || color, [0.2, 1.0, 0.8]),
    deckColored, animate, surge, bandScale, bandShift, srcDesktop, srcMobile, on,
  };
  const activeRef = useRef(active);
  activeRef.current = active;
  const applyRunRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const def = LAYERS[layer];
    if (!host || !def) return undefined;

    let disposed = false, app = null, rt = null, mesh = null, sprite = null, shader = null;
    let texUrl = null, texObj = null;   // Bildquelle der Ebene (nur Ebenen mit `sampler2D`, s. syncTexture)
    const canvas = document.createElement("canvas");

    const applyRun = () => {
      if (!app) return;
      const run = activeRef.current && document.visibilityState !== "hidden";
      if (run) app.ticker.start(); else app.ticker.stop();
    };

    (async () => {
      try {
        const { Application, Shader, GlProgram, Mesh, MeshGeometry, RenderTexture, Sprite,
          Texture, ImageSource, TextureSource } = await import("pixi.js");
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

        const scale = scaleOverride() ?? (coarse ? def.scaleCoarse : def.scaleDesktop);
        /* Bei Faktor 1 KEINE Render-Textur, sondern direkt auf die Bühne.
           Der Umweg ist bei voller Auflösung nicht gratis: `Math.round` auf eine krumme CSS-Breite lässt Textur- und
           Bildschirmmaß um Bruchteile auseinanderlaufen, und das Hochskalieren des Sprites resampelt dann die ganze
           Fläche. Gemessen (Handy-Viewport, gegen die Canvas-Fassung): mit Umweg blieb bei Faktor 1 eine mittlere
           Abweichung von 1,81 von 255 stehen — sichtbar genau da, wo dieser Effekt lebt, nämlich auf dünnen hellen
           Konturen. Ohne Umweg ist Faktor 1 wieder exakt der alte Pfad. */
        const direct = scale >= 0.999;
        // Die Render-Textur ist die eigentliche Ersparnis: sie ist um `scale` KLEINER als die Bühne und wird
        // beim Zusammensetzen hochskaliert. Kosten ∝ Fläche → quadratisch in scale.
        const rtSize = () => (direct
          ? { w: Math.max(2, app.screen.width), h: Math.max(2, app.screen.height) }
          : {
            w: Math.max(2, Math.round(app.screen.width * scale)),
            h: Math.max(2, Math.round(app.screen.height * scale)),
          });
        let size = rtSize();
        if (!direct) {
          rt = RenderTexture.create({ width: size.w, height: size.h, resolution: app.renderer.resolution, antialias: false });
        }

        const uniforms = def.uniforms(pRef.current, { w: size.w * app.renderer.resolution, h: size.h * app.renderer.resolution });
        const resources = { fieldUniforms: uniforms };
        /* Ebenen mit `sampler2D` (Deck-Glow) brauchen von Anfang an eine gebundene Textur: der Sampler-Slot wird
           beim Programmaufbau vergeben, ein späteres Nachreichen allein genügt nicht. Platzhalter ist bewusst ein
           SCHWARZES Pixel — der Shader rechnet daraus Alpha 0, die Ebene ist also unsichtbar statt weiß zu blitzen,
           bis das Battlefield-Bild da ist. */
        if (def.texture) resources[def.texture.name] = blankSource(TextureSource);
        shader = Shader.from({
          gl: GlProgram.from({ vertex: PIXI_FIELD_VERT, fragment: def.frag() }),
          resources,
        });
        mesh = new Mesh({ geometry: fieldQuadGeometry(MeshGeometry), shader });

        if (direct) {
          mesh.blendMode = def.blend;
          app.stage.addChild(mesh);          // Pixis eigener Render-Durchgang zeichnet sie mit
        } else {
          sprite = new Sprite(rt);
          sprite.blendMode = def.blend;
          app.stage.addChild(sprite);
        }

        const t0 = performance.now();
        let frozenT = null;
        const mem = { surgeId: null, surgeStart: null, surgeMag: 0 };   // Ebenen-Gedächtnis über Frames (s. tick)
        let tickFails = 0;

        /* Bildquelle in-place nachziehen. Wie in der Canvas-Fassung wird bei einem Bildwechsel NUR die Textur
           getauscht — die Bühne bleibt stehen. Ein Neuaufbau je Deckwechsel kostete sonst einen WebGL-Kontext,
           und davon hat iOS Safari sehr wenige. */
        const syncTexture = () => {
          if (!def.texture) return;
          const url = def.texture.src(pRef.current);
          if (!url || url === texUrl) return;
          texUrl = url;
          loadFieldTexture(url, Texture, ImageSource).then(({ texture, aspect }) => {
            if (disposed || !shader || texUrl !== url) { try { texture.destroy(true); } catch { /* ignore */ } return; }
            const old = texObj; texObj = texture;
            mem.imgAspect = aspect;
            shader.resources[def.texture.name] = texture.source;
            if (old) { try { old.destroy(true); } catch { /* ignore */ } }
          }).catch((e) => console.warn("[fx] Kompositor-Textur nicht geladen:", e));
        };
        syncTexture();
        app.ticker.add(() => {
          if (disposed || !app) return;
          try {
          const p = pRef.current;
          syncTexture();   // Bildwechsel (anderes Deck/Viewport) zieht die Textur nach, ohne die Bühne anzufassen
          const s = rtSize();
          if (s.w !== size.w || s.h !== size.h) {
            size = s;
            if (rt) rt.resize(size.w, size.h);
          }
          // `animate=false` (reduzierte Effekte) → Standbild: Zeit einfrieren statt die Schleife zu stoppen,
          // damit Farb-/Größenwechsel weiterhin sauber durchschlagen.
          const tSec = p.animate ? (performance.now() - t0) / 1000 : (frozenT ??= 6.0);
          if (p.animate) frozenT = null;
          def.tick(shader.resources.fieldUniforms.uniforms, p,
            tSec, { w: size.w * app.renderer.resolution, h: size.h * app.renderer.resolution }, mem);

          // Ebene in ihre Textur (klein), dann skaliert die Bühne sie auf die volle Fläche — EIN Composite.
          // Bei Faktor 1 hängt die Ebene direkt an der Bühne; dann entfällt der Zwischenschritt komplett.
          mesh.width = size.w; mesh.height = size.h;
          if (!direct) {
            app.renderer.render({ container: mesh, target: rt, clear: true });
            sprite.width = app.screen.width; sprite.height = app.screen.height;
          }
          } catch (e) {
            /* Ein Effekt darf nicht in eine Fehlerflut pro Frame laufen. Nach drei Fehlversuchen bleibt die Ebene
               still — das Brett läuft weiter, nur ohne diesen Effekt. */
            if (++tickFails >= 3) { try { app.ticker.stop(); } catch { /* ignore */ } console.warn("[fx] Kompositor-Ebene angehalten:", e); }
          }
        });
        applyRunRef.current = applyRun;
        applyRun();
      } catch (e) {
        /* WebGL fehlt oder eine Ebene ist kaputt → Bühne bleibt leer, das Spiel läuft normal weiter. Der Log ist
           wichtig: ein Port-Fehler (s. pixiFieldShader.js) landet genau hier und wäre sonst spurlos. */
        console.warn(`[fx] Kompositor-Ebene "${layer}" nicht aufgebaut:`, e);
      }
    })();

    const onVis = () => applyRun();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVis);
      const a = app; app = null;
      if (rt) { try { rt.destroy(true); } catch { /* ignore */ } rt = null; }
      if (texObj) { try { texObj.destroy(true); } catch { /* ignore */ } texObj = null; }
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
  }, [layer]);

  /* #perf-overlay: Ticker anhalten, sobald ein Vollbild-Overlay das Brett verdeckt. Bewusst ein EIGENER Effekt
     ohne `layer` in den Deps — der Aufbau-Effekt oben darf bei einem `active`-Wechsel nicht neu laufen, sonst
     kostete jeder Overlay-Wechsel eine komplette Pixi-Init. */
  useEffect(() => { applyRunRef.current?.(); }, [active]);

  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}
