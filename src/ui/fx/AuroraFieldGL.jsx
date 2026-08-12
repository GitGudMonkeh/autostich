import { useRef, useEffect } from "react";

/* Aurora-Feldeffekt als EIGENSTÄNDIGE WebGL-Canvas (NICHT über Pixi). Grund: Pixis Custom-Shader-Pfad (Mesh & Filter)
   rendert auf dem Mobile-Setup nichts; rohes WebGL läuft dort nachweislich (Tuning-Artifact). Bewusst WebGL1 /
   GLSL ES 1.00 → maximale Kompatibilität auf alten mobilen GPUs.

   Reiner AMBIENT-Hintergrund: perspektivische Bögen zu je eigenem Fluchtpunkt, senkrechte klumpige Ausläufer, harte
   Unterkante, weicher Auslauf. Kein Stich-Bezug, kein Puls. Komposition per ALPHA (transparente Canvas, Schwarz =
   Alpha 0 → das Battlefield-Bild bleibt sichtbar). Bewusst KEIN mix-blend-mode: das würde in einem z-index-Stacking-
   Context nicht mehr mit dem Battlefield blenden und die opake Canvas würde es überdecken. Werte am Tuning-Board eingestellt.

   Zwei Modi: Standard (feste Palette grün→magenta) oder Deckfarbe (deckA1 unten → deckA2 oben, via deckColored).
   `animate=false` (reduzierte Effekte) → statisches Standbild. */

const VERT = "attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }";

const FRAG = [
  "precision highp float;",
  "uniform vec2 uRes; uniform float uTime; uniform float uMode; uniform vec3 uDeck1; uniform vec3 uDeck2;",
  "const float I_=1.16, WISP=4.0, WAVE=0.14, PERSP=0.22, DOME=0.10, CLUMPLO=0.36, RAYF=39.0, RAYC=1.10, SPACING=0.13, BASEY=0.38, DRIFT=0.035;",
  "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }",
  "float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);",
  "  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));",
  "  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }",
  "float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.02; a*=0.5; } return v; }",
  "vec3 auroraCol(float h){",
  "  if(uMode > 0.5){ return mix(uDeck1, uDeck2, smoothstep(0.0, 1.0, h)); }",
  "  vec3 gr=vec3(0.25,1.0,0.55); vec3 cy=vec3(0.28,0.92,0.85); vec3 mg=vec3(0.82,0.34,0.98);",
  "  return mix(mix(gr,cy,smoothstep(0.0,0.45,h)), mg, smoothstep(0.4,1.0,h)); }",
  "void main(){",
  "  vec2 uv = gl_FragCoord.xy / uRes.xy;", // WebGL: y läuft von unten → Bögen sitzen unten
  "  float t = uTime;",
  "  vec3 ac = vec3(0.0);",
  "  for(int i=0;i<3;i++){ float fi=float(i);",
  "    float drift = 0.35 * sin(t * DRIFT * 6.0 * (1.0 + 0.3*fi) + fi*2.1);", // oszillierend → wabert in place, wandert nicht weg
  "    float vanish = 0.5 + 0.10*sin(fi*2.0);",
  "    float depth = fi*0.5;",
  "    float ax = vanish + (uv.x - vanish) * (1.0 - PERSP*depth);",
  "    float dxv = uv.x - vanish;",
  "    float wave = fbm(vec2(ax*1.15 + drift + fi*13.0, 4.0 + fi*3.0));",
  "    float arc  = 0.5 + 0.5*sin(ax*4.7 + fi*2.1 + drift*4.0);",
  "    float base = BASEY + SPACING*fi + WAVE*mix(wave, arc, 0.5) - DOME*depth*dxv*dxv;",
  "    float hAbove = uv.y - base;",
  "    float vshape = smoothstep(-0.018, 0.004, hAbove) * exp(-max(hAbove,0.0)*WISP);",
  "    float clump = smoothstep(CLUMPLO, CLUMPLO+0.42, fbm(vec2(uv.x*3.2 + fi*7.0 + drift*3.0, 1.5)));",
  "    float rays = pow(clamp(fbm(vec2(uv.x*RAYF + drift*7.0 + fi*20.0, uv.y*1.0 - t*0.07)),0.0,1.0), RAYC);",
  "    float v = vshape * clump*(0.15 + 0.85*rays);",   // keine Seitenweiche → bündig bis zum Rahmen (links & rechts)
  "    float hcol = clamp(hAbove*2.1, 0.0, 1.0);",
  "    ac += auroraCol(hcol) * v;",
  "  }",
  "  vec3 rgb = ac * I_ * 1.7;",
  "  float a = clamp(max(rgb.r, max(rgb.g, rgb.b)), 0.0, 1.0) * 0.55;", // Alpha = Helligkeit × Transparenz → Schwarz durchsichtig
  "  gl_FragColor = vec4(rgb * a, a);",   // PREMULTIPLIED (Browser-Default) → korrektes Kompositing auch auf iOS-Safari
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

export default function AuroraFieldGL({ color = null, color2 = null, deckColored = false, animate = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let gl;
    try { gl = canvas.getContext("webgl", { alpha: true, antialias: true, depth: false, powerPreference: "low-power" }) || canvas.getContext("experimental-webgl"); }
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
    const uMode = gl.getUniformLocation(prog, "uMode");
    const uDeck1 = gl.getUniformLocation(prog, "uDeck1");
    const uDeck2 = gl.getUniformLocation(prog, "uDeck2");
    const d1 = hexToRgb(color, [0.33, 0.88, 0.54]);
    const d2 = hexToRgb(color2, [0.69, 0.42, 0.98]);

    // #perf-A1: Mobile drosseln. Der Aurora-Shader läuft vollflächig pro Frame — auf dem Handy der größte GPU-Dauer-
    // Posten. Auf Mobile (coarse) den DPR-Deckel senken (weniger Shader-Aufrufe je Frame; die weiche Aurora braucht
    // kein Retina) UND die Bildrate auf ~30 fps kappen (das Wabern ist langsam → optisch unmerklich). Desktop = voll.
    const coarse = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(pointer: coarse)").matches : false;
    const dprCap = coarse ? 1.4 : 2;
    const dprOf = () => Math.min(dprCap, window.devicePixelRatio || 1);
    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dprOf()));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dprOf()));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    };
    const draw = (tSec) => {
      resize();
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); // transparenter Grund → nichts Opakes hinter der Aurora
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, tSec);
      gl.uniform1f(uMode, deckColored ? 1 : 0);
      gl.uniform3f(uDeck1, d1[0], d1[1], d1[2]);
      gl.uniform3f(uDeck2, d2[0], d2[1], d2[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let raf = null, startT = null, disposed = false, ro = null;
    // #perf-A1: FPS-Cap auf Mobile — rAF läuft weiter (glatte Zeitbasis), es wird aber nur ~alle 33 ms wirklich
    // gezeichnet. Die Zeit fließt echt (ms-startT) → das Wabern bleibt tempo-korrekt, nur eben in ~30 statt 60/120 fps.
    const minMs = coarse ? 1000 / 30 : 0;
    let lastDraw = -1e9;
    const frame = (ms) => {
      if (disposed) return;
      if (startT === null) startT = ms;
      if (ms - lastDraw >= minMs) { lastDraw = ms; draw((ms - startT) / 1000); }
      raf = requestAnimationFrame(frame);
    };
    if (animate) { raf = requestAnimationFrame(frame); }
    else { draw(6.0); if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(() => draw(6.0)); ro.observe(canvas); } }
    window.addEventListener("resize", resize);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", resize);
      const lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
    };
  }, [color, color2, deckColored, animate]);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full"
    style={{ pointerEvents: "none" }} />;
}
