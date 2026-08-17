import { useEffect, useRef, useState } from "react";
import NeonSurfFieldGL, { NEONSURF_FRAG } from "./NeonSurfFieldGL.jsx";

/* #fx-spike — Phase 0 des Kompositor-Umbaus. EINE Frage, an der die ganze Architektur hängt:
   rendert Pixi einen Custom-Shader auf dem echten Handy?

   Hintergrund: Aurora ist genau deswegen aus Pixi ausgezogen (CLAUDE.md: „Pixi-Custom-Shader rendert auf dem
   Mobile-Setup NICHT"), und im ganzen Projekt ist heute kein einziger Pixi-Custom-Shader im Einsatz — der Befund
   steht also unwiderlegt. Stimmt er weiter, kann nicht alles in EINE Pixi-Bühne wandern und der Kompositor muss
   raw-WebGL sein. Der damalige Grund kann aber behoben sein: `PixiStage` erzwingt inzwischen `preference:"webgl"`,
   und der ursprüngliche Verdacht war WebGPU ohne WGSL-Variante.

   Drei Felder, damit ein schwarzes Rechteck AUSSAGEKRÄFTIG ist:
     1. raw-WebGL, echte Neon-Brandung  → die Referenz. Ist die schwarz, ist das Gerät/der Kontext das Problem.
     2. Pixi, TRIVIALER Custom-Shader   → Kontrollprobe. Rendert die nicht, scheitern Pixi-Custom-Shader generell.
     3. Pixi, derselbe Brandungs-Shader → Portierungs-Probe, KEIN Geräte-Urteil. Stand: compiliert und läuft
        fehlerfrei, trifft aber nichts Sichtbares — auf dem Entwicklungsrechner nicht gelöst. Nachgewiesen ist
        dabei, dass es NICHT an Pixi liegt: Uniforms kommen an (plain und UBO gegengeprüft), das Mesh deckt die
        Box (Feld 2 füllt sie), der Shader compiliert ohne Fehler. Offen bleiben weitere Annahmen im Shader.

   Jedes Feld zeigt seine Zeichnungen/s und — entscheidend — Compile-/Link-Fehler als TEXT. Ein Spike, der nur
   „schwarz" meldet, hätte uns nichts gesagt.

   Nur im Preview-Build erreichbar, über `?fxspike=1`. Kein Teil des Spiels. */

const BOX = { position: "relative", width: "100%", height: 190, background: "#05050a", overflow: "hidden", borderRadius: 8 };
const LABEL = { position: "absolute", left: 6, top: 4, zIndex: 5, fontSize: 10, letterSpacing: "0.08em", color: "#9aa0b4", textTransform: "uppercase", pointerEvents: "none" };
const STAT = { position: "absolute", right: 6, top: 4, zIndex: 5, fontSize: 11, fontWeight: 700, pointerEvents: "none" };
const ERR = { position: "absolute", left: 6, right: 6, bottom: 4, zIndex: 5, fontSize: 9, lineHeight: 1.25, color: "#ff8f8f", whiteSpace: "pre-wrap", maxHeight: 90, overflow: "hidden" };

/* Kontrollprobe: der simpelste denkbare Custom-Shader — animierter Verlauf, keine Schleifen, keine Ableitungen,
   mediump. Rendert DIESER nicht, ist die Frage schon beantwortet und Feld 3 braucht keine Diagnose mehr. */
const TRIVIAL_FRAG = [
  "precision mediump float;",
  "in vec2 vUV;",
  "uniform float uTime;",
  "out vec4 fragColor;",
  "void main(){",
  "  float w = 0.5 + 0.5 * sin(vUV.x * 6.0 + uTime);",
  "  fragColor = vec4(vUV.y * 0.2, w * 0.9, 0.9 - w * 0.4, 1.0);",
  "}",
].join("\n");

// Pixi-Vertex-Shader (v8-Konventionen: aPosition + die drei Standard-Uniform-Blöcke).
const PIXI_VERT = [
  "in vec2 aPosition;",
  "out vec2 vUV;",
  "uniform mat3 uProjectionMatrix; uniform mat3 uWorldTransformMatrix;",
  "uniform mat3 uTransformMatrix; uniform vec4 uColor; uniform float uRound;",
  "void main(){",
  "  vUV = aPosition;",
  "  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;",
  "  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);",
  "}",
].join("\n");

/* Den Brandungs-Shader auf Pixis WebGL2-Konventionen heben, OHNE die BILDLOGIK anzufassen. Drei Eingriffe,
   alle rein mechanisch:
     • `gl_FragColor` → eigenes `out`.
     • Die Koordinatenquelle: `gl_FragCoord.xy/uRes.xy` → `vec2(vUV.x, 1.0 - vUV.y)`. Nachgemessen war
       `gl_FragCoord` in der Pixi-Bühne nicht brauchbar (Shader läuft fehlerfrei, trifft aber nichts Sichtbares),
       während `vUV` sauber ankommt — Kontrollfeld 2 füllt damit die ganze Box. Das ist keine Krücke, sondern
       die Portierung, die ein Kompositor ohnehin braucht: sobald eine Ebene in eine Render-Textur zeichnet, ist
       `gl_FragCoord` zielrelativ und taugt nicht mehr als Bildschirmkoordinate. Das `1.0 -` dreht Y, weil Pixis
       Bühne von oben zählt und die See unten sitzt.
     • `uRes` bleibt als Uniform drin (der Shader nutzt es auch für das Seitenverhältnis).
   Die Wellen-, Fluss- und Farbrechnung bleibt Zeichen für Zeichen dieselbe — daran hängt die Aussagekraft. */
function toPixiFrag(src) {
  const body = src
    .replace(/gl_FragColor/g, "fragColor")
    .replace(/gl_FragCoord\.xy\s*\/\s*uRes\.xy/g, "vec2(vUV.x, 1.0 - vUV.y)");
  return ["#version 300 es", "in vec2 vUV;", "out vec4 fragColor;"].concat(body.split("\n")).join("\n");
}

/* Ein Pixi-Feld mit gegebenem Fragment-Shader. Fängt ALLES ab und meldet den Fehlertext nach außen. */
function PixiShaderBox({ label, fragment, needsSurfUniforms = false }) {
  const hostRef = useRef(null);
  const [draws, setDraws] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    let disposed = false, app = null, raf = 0, n = 0;
    const onGlError = (e) => { if (!disposed) setErr((p) => (p ? p : String(e && e.message ? e.message : e)).slice(0, 700)); };

    (async () => {
      try {
        const { Application, Shader, GlProgram, Mesh, MeshGeometry } = await import("pixi.js");
        const canvas = document.createElement("canvas");
        app = new Application();
        await app.init({ canvas, preference: "webgl", backgroundAlpha: 0, antialias: false,
          autoDensity: true, resolution: Math.min(1.5, window.devicePixelRatio || 1), resizeTo: host });
        if (disposed) { app.destroy(true); return; }
        canvas.style.cssText = "width:100%;height:100%;display:block";
        host.appendChild(canvas);

        const glProgram = GlProgram.from({ vertex: PIXI_VERT, fragment });
        const uniforms = { uTime: { value: 0, type: "f32" } };
        if (needsSurfUniforms) Object.assign(uniforms, {
          // uRes MUSS die Framebuffer-Größe sein (canvas.width), nicht die CSS-Größe — s. Kommentar an `fit()`.
          uRes: { value: [(host.clientWidth || 300) * 1.5, (host.clientHeight || 190) * 1.5], type: "vec2<f32>" },
          uMode: { value: 1, type: "f32" },
          uDeck1: { value: [0.043, 0.227, 0.267], type: "vec3<f32>" },
          uDeck2: { value: [0.2, 1.0, 0.8], type: "vec3<f32>" },
          uSurgeT: { value: -999, type: "f32" },
          uSurgeMag: { value: 0, type: "f32" },
          uFbmOct: { value: 3, type: "f32" },
        });
        const shader = Shader.from({ gl: glProgram, resources: { spikeUniforms: uniforms } });

        // Vollflächiges Quad in lokalen 0..1-Koordinaten → vUV ist direkt die UV.
        const geometry = new MeshGeometry({
          positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
          uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
          indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        });
        const mesh = new Mesh({ geometry, shader });
        app.stage.addChild(mesh);
        /* Zwei Räume, die man leicht verwechselt — beide Verwechslungen machen das Feld schwarz OHNE Fehler,
           also genau ein falsches „Pixi kann das nicht":
             • Stage/Mesh rechnen in CSS-Pixeln → `app.screen` (nachgemessen: renderer.width == screen.width == 300).
             • `gl_FragCoord` läuft über den FRAMEBUFFER → das ist `canvas.width` (nachgemessen 450 bei resolution 1,5).
           In Pixi v8 ist `renderer.width` also NICHT die Framebuffer-Breite. `uRes` muss canvas.width sein, sonst
           erreicht `uv = gl_FragCoord/uRes` den Wert 1,5 und das Wasserband liegt außerhalb des Bildes. */
        const fit = () => { mesh.width = app.screen.width; mesh.height = app.screen.height; };
        fit();

        const t0 = performance.now();
        const loop = () => {
          if (disposed) return;
          const t = (performance.now() - t0) / 1000;
          shader.resources.spikeUniforms.uniforms.uTime = t;
          if (needsSurfUniforms) shader.resources.spikeUniforms.uniforms.uRes = [canvas.width, canvas.height];
          fit();
          app.renderer.render(app.stage);
          n++;
          raf = requestAnimationFrame(loop);
        };
        app.ticker.stop();            // eigener Takt → Zeichnungen sind zählbar
        raf = requestAnimationFrame(loop);
        const iv = setInterval(() => { if (!disposed) { setDraws(n); n = 0; } }, 1000);
        host._iv = iv;
      } catch (e) { onGlError(e); }
    })();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (host._iv) clearInterval(host._iv);
      if (app) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
  }, [fragment, needsSurfUniforms]);

  return (
    <div style={BOX}>
      <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />
      <div style={LABEL}>{label}</div>
      <div style={{ ...STAT, color: draws > 0 && !err ? "#5fce86" : "#ef6f68" }}>{err ? "FEHLER" : `${draws}/s`}</div>
      {err && <div style={ERR}>{err}</div>}
    </div>
  );
}

export default function FxSpike() {
  const [glInfo, setGlInfo] = useState("");
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) { setGlInfo("kein WebGL"); return; }
      const d = gl.getExtension("WEBGL_debug_renderer_info");
      const ver = gl.getParameter(gl.VERSION);
      const ren = d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "(Renderer verborgen)";
      const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      setGlInfo(`${ver} · ${ren} · highp im Fragment: ${hp && hp.precision > 0 ? "ja" : "NEIN"} · DPR ${window.devicePixelRatio}`);
    } catch (e) { setGlInfo("Abfrage fehlgeschlagen: " + e.message); }
  }, []);

  return (
    <div style={{ minHeight: "100dvh", background: "#0c0c10", color: "#e8e8ea", padding: 12,
                  font: "13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace" }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>FX-Spike · Pixi-Custom-Shader auf diesem Gerät</div>
      <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 10, wordBreak: "break-word" }}>{glInfo}</div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={BOX}>
          <NeonSurfFieldGL color="#0b3a44" color2="#33ffcc" />
          <div style={LABEL}>1 · raw-WebGL — echte Neon-Brandung (Referenz)</div>
        </div>
        <PixiShaderBox label="2 · Pixi — trivialer Custom-Shader (Kontrolle)" fragment={"#version 300 es\n" + TRIVIAL_FRAG} />
        <PixiShaderBox label="3 · Pixi — Brandungs-Shader (Portierungs-Probe, hier noch schwarz)" fragment={toPixiFrag(NEONSURF_FRAG)} needsSurfUniforms />
      </div>

      <div style={{ marginTop: 12, fontSize: 11, lineHeight: 1.5, opacity: 0.85 }}>
        <b>So lesen — entscheidend ist Feld 2.</b><br />
        Feld 1 muss leuchten. Tut es das nicht, sagt die Seite nichts über Pixi, sondern etwas über das Gerät.<br />
        <b>Feld 2 leuchtet</b> → Pixi-Custom-Shader laufen auf diesem Gerät. Der alte Befund („rendert auf dem
        Mobile-Setup NICHT") ist damit überholt, ein Pixi-Kompositor ist möglich (Ziel A).<br />
        <b>Feld 2 schwarz oder FEHLER</b> → Pixi-Custom-Shader gehen hier nicht. Kompositor wird raw-WebGL (Ziel C).<br />
        <br />
        <b>Feld 3 ist KEIN Geräte-Urteil.</b> Es ist die Probe, ob sich der fertige Brandungs-Shader unverändert
        durch Pixi schicken lässt — und das ist auf dem Entwicklungsrechner noch nicht gelungen: er compiliert
        fehlerfrei, läuft, trifft aber nichts Sichtbares. Wenn es hier bei dir ebenfalls schwarz ist, ist das der
        erwartete Stand und sagt nur, dass die Portierung Arbeit braucht (vermutlich weitere
        Koordinaten-/Präzisionsannahmen im Shader), nicht dass dein Gerät etwas nicht kann.
      </div>
    </div>
  );
}
