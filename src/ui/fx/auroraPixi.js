import { Mesh, Geometry, Shader, GlProgram, UniformGroup } from "pixi.js";

/* Aurora als GPU-Shader (Pixi-Umbau) — reiner AMBIENT-Hintergrund: perspektivische Bögen zu je eigenem Fluchtpunkt,
   senkrechte klumpige Ausläufer, harte Unterkante, weicher Auslauf nach oben. KEIN Stich-Bezug, KEIN Puls (erupt = No-op).

   Umsetzung: ein bildschirmfüllendes CLIP-SPACE-Mesh (Quad von -1..1) mit Custom-Shader. Die uv kommt DIREKT aus der
   Geometrie (aUV 0..1) → exakt bildschirmfüllend, zentriert und aspekt-robust (Mobile hochkant wie Desktop breit).
   Kein Pixi-Filter mehr (der hatte Koordinaten-/Padding-Versatz → rechtslastig/zu groß). Der Vertex-Shader gibt die
   Clip-Position direkt aus (ignoriert Transform/Projektion) → das Mesh deckt IMMER das ganze Battlefield ab.

   Läuft über der transparenten PixiStage-Canvas, die per Alpha übers Battlefield-Bild kompositiert (Schwarz → durchsichtig).
   GLSL 300 es (Pixi v8). Nur WebGL (GLSL-only) → PixiStage ist auf WebGL gepinnt. Reduced (minimal) → Zeit friert ein. */

const VERT = [
  "in vec2 aPosition;",
  "in vec2 aUV;",
  "out vec2 vUv;",
  "void main(){ vUv = aUV; gl_Position = vec4(aPosition, 0.0, 1.0); }",
].join("\n");

const FRAG = [
  "in vec2 vUv;",
  "out vec4 finalColor;",
  "uniform float uTime;",
  "uniform float uMode;",   // 0 = Standard-Palette · 1 = Deckfarbe (uDeck1 unten → uDeck2 oben)
  "uniform vec3 uDeck1;",   // Deck-Hauptfarbe (unten, an der Bogenkante)
  "uniform vec3 uDeck2;",   // Deck-Sekundärfarbe (oben, im Auslauf)
  "const float I_=1.16, WISP=4.0, WAVE=0.14, PERSP=0.22, DOME=0.10, CLUMPLO=0.36, RAYF=39.0, RAYC=1.10, SPACING=0.13, BASEY=0.63, DRIFT=0.035;",
  "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }",
  "float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);",
  "  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));",
  "  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }",
  "float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.02; a*=0.5; } return v; }",
  "vec3 auroraCol(float h){",
  "  if(uMode > 0.5){ return mix(uDeck1, uDeck2, smoothstep(0.0, 1.0, h)); }",   // Deckfarbe: deckA1 (unten) → deckA2 (oben)
  "  vec3 gr=vec3(0.25,1.0,0.55); vec3 cy=vec3(0.28,0.92,0.85); vec3 mg=vec3(0.82,0.34,0.98);",
  "  return mix(mix(gr,cy,smoothstep(0.0,0.45,h)), mg, smoothstep(0.4,1.0,h)); }",
  "void main(){",
  "  vec2 uv = vUv;",                                                            // 0..1, y-up (aUV: unten=0) → füllt das ganze Feld
  "  float t = uTime;",
  "  vec3 ac = vec3(0.0);",
  "  for(int i=0;i<3;i++){ float fi=float(i);",
  "    float drift = t*(DRIFT*(1.0 + 0.57*fi));",
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
  "    float env = smoothstep(0.0,0.05,uv.x)*smoothstep(1.0,0.95,uv.x);",         // volle Breite abdecken (nur hauchdünne Randweiche)
  "    float v = vshape * clump*(0.15 + 0.85*rays) * env;",
  "    float hcol = clamp(hAbove*2.1, 0.0, 1.0);",
  "    ac += auroraCol(hcol) * v;",
  "  }",
  "  vec3 rgb = ac * I_ * 1.7;",
  "  float a = clamp(max(rgb.r, max(rgb.g, rgb.b)), 0.0, 1.0) * 0.55;",           // noch etwas transparenter; Schwarz bleibt durchsichtig
  "  finalColor = vec4(rgb, a);",
  "}",
].join("\n");

function hexToVec3(hex, fallback) {
  const h = (hex || "").replace("#", "");
  const full = h.length === 3 ? h.replace(/(.)/g, "$1$1") : h;
  const n = parseInt(full, 16);
  if (full.length !== 6 || !Number.isFinite(n)) return fallback;
  return new Float32Array([((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]);
}
function readAuroraDeckDefault() {
  try {
    const u = new URLSearchParams(window.location.search).get("aurora");
    if (u === "deck") return true;
    if (u === "std" || u === "standard") return false;
    return window.localStorage.getItem("as_aurora_deck") === "1";
  } catch { return false; }
}

export function createAuroraField(app) {
  const uniforms = new UniformGroup({
    uTime:  { value: 0, type: "f32" },
    uMode:  { value: 0, type: "f32" },
    uDeck1: { value: new Float32Array([0.33, 0.88, 0.54]), type: "vec3<f32>" },
    uDeck2: { value: new Float32Array([0.69, 0.42, 0.98]), type: "vec3<f32>" },
  });
  const glProgram = GlProgram.from({ vertex: VERT, fragment: FRAG, name: "aurora-field" });
  const shader = new Shader({ glProgram, resources: { auroraUniforms: uniforms } });

  // Bildschirmfüllendes Clip-Space-Quad (-1..1) mit uv 0..1 (unten-links = 0,0 → y-up).
  const geometry = new Geometry({
    attributes: {
      aPosition: { buffer: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), format: "float32x2" },
      aUV:       { buffer: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),     format: "float32x2" },
    },
    indexBuffer: new Uint32Array([0, 1, 2, 0, 2, 3]),
  });
  const mesh = new Mesh({ geometry, shader });
  mesh.cullable = false;
  app.stage.addChild(mesh);

  let params = {
    effect: null, reduced: false, deckTint: readAuroraDeckDefault(),
    deck1: new Float32Array([0.33, 0.88, 0.54]), deck2: new Float32Array([0.69, 0.42, 0.98]),
  };
  let clock = 0;

  function setParams(next) {
    params = { ...params, ...next,
      deck1: next.color  != null ? hexToVec3(next.color,  params.deck1) : params.deck1,
      deck2: next.color2 != null ? hexToVec3(next.color2, params.deck2) : params.deck2,
      deckTint: next.deckTint != null ? next.deckTint : params.deckTint };
    mesh.visible = params.effect === "aurora";
    uniforms.uniforms.uMode = params.deckTint ? 1 : 0;
    uniforms.uniforms.uDeck1 = params.deck1;
    uniforms.uniforms.uDeck2 = params.deck2;
  }
  function update(ticker) {
    if (params.effect !== "aurora") return;
    if (!params.reduced) clock += Math.min(0.05, ticker.deltaMS / 1000); // minimal → Zeit einfrieren (Standbild)
    else if (clock === 0) clock = 6.0;
    uniforms.uniforms.uTime = clock;
  }

  app.ticker.add(update);

  return {
    setParams,
    erupt() { /* Aurora reagiert bewusst NICHT auf Stiche (reiner Hintergrund) */ },
    destroy() {
      try { app.ticker.remove(update); } catch { /* ignore */ }
      try { mesh.destroy(); } catch { /* ignore */ }
      try { geometry.destroy(); } catch { /* ignore */ }
      try { shader.destroy(); } catch { /* ignore */ }
    },
  };
}
