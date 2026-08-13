import { useRef, useEffect } from "react";

/* Deck-Glow — Hintergrund-Effekt als EIGENSTÄNDIGE WebGL-Canvas (NICHT über Pixi, analog AuroraFieldGL). Grund: Pixis
   Custom-Shader-Pfad (Mesh & Filter) rendert auf dem Mobile-Setup nichts; rohes WebGL1 / GLSL ES 1.00 läuft dort
   nachweislich. Der Effekt SAMPELT das Battlefield-Bild als Textur, findet dessen helle Linien/Kanten und lässt sie
   in der Deck-/Standardfarbe glühen — zusätzlich ein „Lauflicht", das als wandernde Bande über die Linien läuft.

   Rein ADDITIV (Werte am Tuning-Board eingestellt: Umfärbung = 0): die Canvas gibt NUR die farbige Glut aus
   (Schwarz = Alpha 0), Komposition per PREMULTIPLIED ALPHA über dem darunterliegenden Battlefield-<img> — dieselbe
   mobil-sichere Technik wie AuroraFieldGL (bewusst KEIN mix-blend-mode: bricht im z-index-Stacking-Context).
   Dadurch ist Deck-Glow eine unabhängige Ebene und mit ALLEN anderen Effekten kombinierbar.

   Props: srcDesktop/srcMobile = Battlefield-Bild je Viewport · deckColor = Glutfarbe (Standard-Neon oder Deckfarbe)
          on = an/aus (weiche Überblendung) · animate = laufende Animation (false → statisches Standbild). */

// [TUNING] Werte aus dem Deck-Glow-Regler (Shop-Preset). Umfärbung=0 → rein additive Glut.
const TUNE = { intensity: 2.5, threshold: 0.26, bloom: 2.2, flow: 1.4, flowSpeed: 3.55 };

const VERT = "attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos*0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }";

const FRAG = [
  "precision highp float;",
  "varying vec2 vUv;",
  "uniform vec2 uRes; uniform float uTime; uniform float uMix; uniform float uImgAspect;",
  "uniform vec3 uDeck; uniform sampler2D uTex;",
  "const float I_=" + TUNE.intensity.toFixed(3) + ", TH=" + TUNE.threshold.toFixed(3) + ", BL=" + TUNE.bloom.toFixed(3) + ", FL=" + TUNE.flow.toFixed(3) + ", FS=" + TUNE.flowSpeed.toFixed(3) + ";",
  "float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }",
  "float sat(vec3 c){ float mx=max(c.r,max(c.g,c.b)); float mn=min(c.r,min(c.g,c.b)); return mx-mn; }",
  // „Farbstärke" einer Linie: Helligkeit gewichtet mit Sättigung (kräftige Neonlinien am stärksten)
  "float strength(vec3 c){ float L=luma(c); return smoothstep(TH, 1.0, L*(0.55+0.75*sat(c))); }",
  // Cover-Fit: dasselbe object-fit:cover wie das darunterliegende <img> (mittig), damit die Glut auf den Linien sitzt
  "vec2 coverScale(){ float ca=uRes.x/uRes.y; return (ca>uImgAspect)? vec2(1.0, uImgAspect/ca) : vec2(ca/uImgAspect, 1.0); }",
  "void main(){",
  "  vec2 sc = coverScale();",
  "  vec2 cuv = (vUv - 0.5) * sc + 0.5;",
  "  vec3 base = texture2D(uTex, cuv).rgb;",
  "  float Lc = luma(base);",
  "  vec2 texel = vec2(1.0/uRes.x, 1.0/uRes.y) * sc;",  // Nachbar-Offsets im Bildraum (cover-korrigiert)
  "  float halo = 0.0, avg = 0.0;",
  "  for(int i=0;i<16;i++){",
  "    float a = 6.2831853 * float(i)/16.0;",
  "    vec2 dir = vec2(cos(a), sin(a));",
  "    vec3 s1 = texture2D(uTex, cuv + dir*texel*2.5).rgb;",
  "    vec3 s2 = texture2D(uTex, cuv + dir*texel*5.5).rgb;",
  "    avg += luma(s1);",
  "    halo += strength(s1)*0.65 + strength(s2)*0.35;",
  "  }",
  "  halo /= 16.0; avg /= 16.0;",
  // Linien-Maske w: helle Kante (High-Pass: heller als Umgebung) ODER kräftige gesättigte Fläche
  "  float lineEdge = smoothstep(0.035, 0.22, Lc - avg);",
  "  float w = clamp(max(strength(base)*0.85, lineEdge), 0.0, 1.0);",
  "  float pulse = 0.82 + 0.18*sin(uTime*2.2);",
  // Lauflicht: zwei gegenläufige Wellen, zu scharfen Kämmen geformt, NUR auf den Linien (×w) → wandert an Konturen entlang
  "  float axis  = dot(vUv, normalize(vec2(1.0, 0.55)));",
  "  float axis2 = dot(vUv, normalize(vec2(-0.4, 1.0)));",
  "  float wv  = 0.5 + 0.5*sin(axis*18.0  - uTime*FS);",
  "  float wv2 = 0.5 + 0.5*sin(axis2*11.0 - uTime*FS*0.6);",
  "  float band = pow(wv, 4.0)*0.75 + pow(wv2, 5.0)*0.45;",
  "  vec3 deck = uDeck;",
  "  vec3 glow = deck * ( w*I_*0.5 + halo*BL + w*band*FL*2.4 ) * pulse * (1.0 - 0.3*Lc);",
  "  float alpha = clamp(max(glow.r, max(glow.g, glow.b)), 0.0, 1.0) * uMix;",
  "  gl_FragColor = vec4(glow * alpha, alpha);",  // PREMULTIPLIED → korrektes Kompositing auch auf iOS-Safari
  "}",
].join("\n");

function hexToRgb(h, fb) {
  if (typeof h !== "string") return fb;
  let s = h.replace("#", "");
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  if (s.length !== 6) return fb;
  const n = parseInt(s, 16);
  if (Number.isNaN(n)) return fb;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default function DeckGlowFieldGL({ srcDesktop = null, srcMobile = null, deckColor = "#7fdcff", on = true, animate = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let gl;
    try { gl = canvas.getContext("webgl", { alpha: true, antialias: true, depth: false, premultipliedAlpha: true, powerPreference: "low-power" }) || canvas.getContext("experimental-webgl"); }
    catch { gl = null; }
    if (!gl) return undefined;

    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; } return s; };
    const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return undefined;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return undefined;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMix = gl.getUniformLocation(prog, "uMix");
    const uImgAspect = gl.getUniformLocation(prog, "uImgAspect");
    const uDeck = gl.getUniformLocation(prog, "uDeck");
    const uTex = gl.getUniformLocation(prog, "uTex");
    const dcol = hexToRgb(deckColor, [0.5, 0.86, 1.0]);

    // Textur (Battlefield-Bild). Bis zum Laden 1×1 transparent → nichts rendern.
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // WebGL y läuft von unten → Bild passend orientieren
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(uTex, 0);

    // Composition: transparente Canvas, additive Glut per premultiplied „over".
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Responsives Bild: denselben Breakpoint spiegeln wie das <picture> (max-width:640px → mobile).
    const coarse = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(pointer: coarse)").matches : false;
    const mqMobile = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(max-width: 640px)") : null;
    const pickSrc = () => ((mqMobile && mqMobile.matches && srcMobile) ? srcMobile : (srcDesktop || srcMobile));

    let imgAspect = 1.7778, texReady = false, curSrc = null, imgEl = null, disposed = false;
    const loadTex = () => {
      const src = pickSrc();
      if (!src || src === curSrc) return;
      curSrc = src;
      const img = new Image();
      imgEl = img;
      img.onload = () => {
        if (disposed || imgEl !== img) return;
        imgAspect = (img.naturalWidth || img.width) / Math.max(1, (img.naturalHeight || img.height));
        gl.bindTexture(gl.TEXTURE_2D, tex);
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); texReady = true; }
        catch { texReady = false; }
      };
      img.src = src;
    };
    loadTex();
    const onMq = () => loadTex();
    if (mqMobile) { if (mqMobile.addEventListener) mqMobile.addEventListener("change", onMq); else if (mqMobile.addListener) mqMobile.addListener(onMq); }

    const dprCap = coarse ? 1.4 : 2;
    const dprOf = () => Math.min(dprCap, window.devicePixelRatio || 1);
    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dprOf()));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dprOf()));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    };

    let mix = on ? 1 : 0; // weiche An/Aus-Überblendung (Showcase: ohne → mit)
    const draw = (tSec) => {
      resize();
      const target = on ? 1 : 0;
      mix += (target - mix) * 0.12;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (!texReady) return; // Bild noch nicht da → transparent
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, tSec);
      gl.uniform1f(uMix, mix);
      gl.uniform1f(uImgAspect, imgAspect);
      gl.uniform3f(uDeck, dcol[0], dcol[1], dcol[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let raf = null, startT = null, ro = null;
    const minMs = coarse ? 1000 / 30 : 0; // #perf: Mobile auf ~30 fps kappen (Zeit fließt echt weiter)
    let lastDraw = -1e9;
    const frame = (ms) => {
      if (disposed) return;
      if (startT === null) startT = ms;
      if (ms - lastDraw >= minMs) { lastDraw = ms; draw((ms - startT) / 1000); }
      raf = requestAnimationFrame(frame);
    };
    if (animate) { raf = requestAnimationFrame(frame); }
    else { let ticks = 0; const settle = () => { draw(6.0); if (++ticks < 30 && !disposed) raf = requestAnimationFrame(settle); }; raf = requestAnimationFrame(settle);
      if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(() => draw(6.0)); ro.observe(canvas); } }
    window.addEventListener("resize", resize);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      if (mqMobile) { if (mqMobile.removeEventListener) mqMobile.removeEventListener("change", onMq); else if (mqMobile.removeListener) mqMobile.removeListener(onMq); }
      window.removeEventListener("resize", resize);
      const lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
    };
  }, [srcDesktop, srcMobile, deckColor, on, animate]);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }} />;
}
