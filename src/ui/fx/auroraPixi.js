import { Filter, GlProgram, UniformGroup, defaultFilterVert, Sprite, Texture } from "pixi.js";

/* Aurora als GPU-Shader (Pixi-Umbau) — reiner AMBIENT-Hintergrund: perspektivische Bögen zu je eigenem Fluchtpunkt,
   senkrechte klumpige Ausläufer, harte Unterkante, weicher Auslauf nach oben. KEIN Stich-Bezug, KEIN Puls (erupt = No-op).
   Werte am Tuning-Board eingestellt und fest eingebacken.

   Umsetzung: ein Fullscreen-Fragment-Shader als Pixi-Filter über einem bildschirmfüllenden Sprite. `vTextureCoord`
   liefert die uv (0..1); y wird gespiegelt, damit die Bögen unten sitzen (WebGL-y-up wie im Tuning). Läuft über der
   transparenten PixiStage-Canvas, die per Alpha übers Battlefield-Bild kompositiert (Schwarz → durchsichtig).

   GLSL 300 es (Pixi v8: `in`/`out`, `texture()`, Version/Precision werden injiziert). Nur WebGL (der Custom-Shader
   ist GLSL-only) → PixiStage pinnt die Bühne auf WebGL. Reduced (minimal) → die Zeit friert ein (statisches Standbild). */

const FRAG = [
  "in vec2 vTextureCoord;",
  "out vec4 finalColor;",
  "uniform float uTime;",
  "const float I_=1.16, WISP=4.0, WAVE=0.14, PERSP=0.22, DOME=0.10, CLUMPLO=0.36, RAYF=39.0, RAYC=1.10, SPACING=0.13, BASEY=0.19, DRIFT=0.035;",
  "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }",
  "float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);",
  "  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));",
  "  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }",
  "float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.02; a*=0.5; } return v; }",
  "vec3 auroraCol(float h){",
  "  vec3 gr=vec3(0.25,1.0,0.55); vec3 cy=vec3(0.28,0.92,0.85); vec3 mg=vec3(0.82,0.34,0.98);",
  "  return mix(mix(gr,cy,smoothstep(0.0,0.45,h)), mg, smoothstep(0.4,1.0,h)); }",
  "void main(){",
  "  vec2 uv = vec2(vTextureCoord.x, 1.0 - vTextureCoord.y);", // y spiegeln → Bögen unten
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
  "    float env = smoothstep(0.0,0.14,uv.x)*smoothstep(1.0,0.86,uv.x);",
  "    float v = vshape * clump*(0.15 + 0.85*rays) * env;",
  "    float hcol = clamp(hAbove*2.1, 0.0, 1.0);",
  "    ac += auroraCol(hcol) * v;",
  "  }",
  "  vec3 rgb = ac * I_ * 1.7;",
  "  float a = clamp(max(rgb.r, max(rgb.g, rgb.b)), 0.0, 1.0);", // Alpha = Helligkeit → Schwarz durchsichtig
  "  finalColor = vec4(rgb, a);",
  "}",
].join("\n");

export function createAuroraField(app) {
  const uniforms = new UniformGroup({ uTime: { value: 0, type: "f32" } });
  const glProgram = GlProgram.from({ vertex: defaultFilterVert, fragment: FRAG, name: "aurora-field" });
  const filter = new Filter({ glProgram, resources: { auroraUniforms: uniforms } });

  const sprite = new Sprite(Texture.WHITE); // bildschirmfüllendes Trägerobjekt; der Filter überschreibt seine Pixel
  sprite.filters = [filter];
  app.stage.addChild(sprite);

  let params = { effect: null, reduced: false };
  let clock = 0;

  function setParams(next) {
    params = { ...params, ...next };
    sprite.visible = params.effect === "aurora";
  }
  function update(ticker) {
    if (params.effect !== "aurora") return;
    if (!params.reduced) clock += Math.min(0.05, ticker.deltaMS / 1000); // minimal → Zeit einfrieren (Standbild)
    else if (clock === 0) clock = 6.0;                                    // hübsches statisches Bild
    sprite.width = app.screen.width;
    sprite.height = app.screen.height;
    uniforms.uniforms.uTime = clock;
  }

  app.ticker.add(update);

  return {
    setParams,
    erupt() { /* Aurora reagiert bewusst NICHT auf Stiche (reiner Hintergrund) */ },
    destroy() {
      try { app.ticker.remove(update); } catch { /* ignore */ }
      try { sprite.destroy(); } catch { /* ignore */ }
      try { filter.destroy(); } catch { /* ignore */ }
    },
  };
}
