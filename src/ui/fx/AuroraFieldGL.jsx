import { useRef, useEffect } from "react";

/* Aurora-Feldeffekt als EIGENSTÄNDIGE WebGL-Canvas (NICHT über Pixi). Grund: Pixis Custom-Shader-Pfad (Mesh & Filter)
   rendert auf dem Mobile-Setup nichts; rohes WebGL läuft dort nachweislich (Tuning-Artifact). Bewusst WebGL1 /
   GLSL ES 1.00 → maximale Kompatibilität auf alten mobilen GPUs.

   #342 Aurora-Rework — perspektivische Vorhänge (aus dem „Aurora Tuner"-Artifact 1:1 nach GLSL ES 1.00):
   - Vorhänge hängen vom OBEREN Rahmen (topY) und weichen mit der Tiefe d zum Horizont (botY), fern vertikal gestaucht
     (persp = 1/(1+PERSP·d)) + Tiefen-Nebel (DEPTH_FADE). Falten/Strahlen bleiben vertikal, parallel zu den Seiten.
   - Wölbung PRO BAND unterschiedlich: Grundwölbung DOME ± Streuung (DOME_VAR) + Scheitel-Versatz (DOME_SHIFT), je Band
     deterministisch via hash(fi) → genestete, asymmetrische Bögen (nicht eine gemeinsame Kuppel).
   - Bewegung = Schimmern/Fluss statt seitlichem Wandern: die Zeit treibt nur vertikale/Phasen-Achsen (RAY_S, DRIFT).
   - Sterne (Anzahl STAR_DENS und Größe STAR_SIZE entkoppelt) + prozedurale Sternschnuppen (bis 2 Lanes, „ab und an").

   Reiner AMBIENT-Hintergrund, kein Stich-Bezug, kein Puls. Komposition per ALPHA (transparente Canvas, Schwarz =
   Alpha 0 → das Battlefield-Bild bleibt sichtbar). Bewusst KEIN mix-blend-mode: das würde in einem z-index-Stacking-
   Context nicht mehr mit dem Battlefield blenden und die opake Canvas würde es überdecken. Nur der `else`-Zweig des
   Tuners (In-Game, premultipliziert) wird portiert — Himmel/Bergkamm/Sterne-als-Kulisse nicht.

   Zwei Modi: Standard (feste Palette grün→cyan→violett) oder Deckfarbe (deckA1 unten → deckA2 oben, via deckColored).
   `animate=false` (reduzierte Effekte) → statisches Standbild. */

const VERT = "attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }";

const FRAG = [
  "precision highp float;",
  "uniform vec2 uRes; uniform float uTime; uniform float uMode; uniform vec3 uDeck1; uniform vec3 uDeck2; uniform float uLayers;",
  // #359 Showcase-Platzierung: vertikale Skalierung/Verschiebung NUR des Vorhang-Bandes (nicht der Sterne). Default
  // (uBandScale=1, uBandShift=0) = Identität → In-Game unverändert. Die kurze, breite Showcase-Box setzt das Band tiefer
  // + etwas gestaucht (uBandScale>1, uBandShift>0), damit der volle Bogen (Scheitel inklusive) in die Box passt.
  "uniform float uBandScale; uniform float uBandShift;",
  // #342 finale Tuner-Werte (const-Block aus dem Artifact übernommen)
  "const float I_=1.45, SAT=1.25, ALPHA=0.720;",   // #353 aurora-buff: deutlich sichtbarer (war I_=1.38, ALPHA=0.620 → davor 1.20/0.540)
  "const float NEAR_BOT=0.600, HORIZON=0.900;",    // Bogen-Basis auf 0.60 (Stapel +0.05, Form/Span 0.30 erhalten) · war 0.550/0.850 (#368) · davor 0.360/0.660
  "const float DOME=0.150, DOME_VAR=0.080, DOME_SHIFT=0.200;",
  "const float DEPTH_CURVE=0.400, PERSP=0.350, DEPTH_FADE=0.0;",
  "const float SPACING=0.0, SOFT_T=0.120, SOFT_B=0.050;",
  "const float WAVE_A=0.0, WAVE_F=5.90, DRIFT=0.285;",
  "const float RAY_F=15.0, RAY_VF=0.700, RAY_C=2.90, RAY_S=0.070;",
  "const float PATCH_S=4.40, PATCH_C=0.400, PATCH_FL=0.180;",
  // Sterne + Sternschnuppen (Tuner-Werte); Anzahl (STAR_DENS) und Größe (STAR_SIZE) entkoppelt
  "const float STAR_DENS=36.0, STAR_SIZE=1.1, STAR_BRIGHT=1.2, TWINKLE=3.4;",
  "const float SHOOT_BRIGHT=1.0, SHOOT_EVERY=5.5, SHOOT_CHANCE=0.5, SHOOT_LEN=0.46, SHOOT_SPEED=0.25;",
  // Standard-Palette: low #33ff73 · mid #3ff0d8 · high #b264fa
  "const vec3 CLOW=vec3(0.2000,1.0000,0.4510), CMID=vec3(0.2471,0.9412,0.8471), CHIGH=vec3(0.6980,0.3922,0.9804);",
  "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }",
  "float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);",
  "  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));",
  "  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }",
  "float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.02; a*=0.5; } return v; }",
  "vec3 auroraCol(float h){",
  "  if(uMode > 0.5){ return mix(uDeck1, uDeck2, smoothstep(0.0, 1.0, h)); }",
  "  vec3 c=mix(CLOW,CMID,smoothstep(0.0,0.5,h));",
  "  return mix(c,CHIGH,smoothstep(0.45,1.0,h)); }",
  "vec3 saturate3(vec3 c,float s){ float l=dot(c,vec3(0.299,0.587,0.114)); return mix(vec3(l),c,s); }",
  // Sterne: Radius = STAR_SIZE*0.001 in Bildkoordinaten (die *STAR_DENS hebt die Zell-Skalierung auf) → Anzahl ändert
  // die Größe NICHT mehr.
  "float starField(vec2 p,float t){",
  "  vec2 g=p*STAR_DENS; vec2 id=floor(g),f=fract(g);",
  "  vec2 pos=vec2(hash(id+1.3),hash(id+2.7));",
  "  float d=length(f-pos);",
  "  float on=step(0.62,hash(id+5.1));",
  "  float star=smoothstep(STAR_SIZE*0.001*STAR_DENS,0.0,d)*on;",
  "  float tw=0.55+0.45*sin(t*TWINKLE+hash(id)*6.2831);",
  "  return star*tw; }",
  // Sternschnuppen: prozedural, zeitgesteuert (kein CPU-State); bis 2 Lanes; manche Zyklen leer (SHOOT_CHANCE).
  "float shootingStar(vec2 p,float t,float aspect){",
  "  vec2 ap=vec2(p.x*aspect,p.y);",
  "  float total=0.0;",
  "  for(int k=0;k<2;k++){",
  "    float lane=float(k);",
  "    float tt=t/max(SHOOT_EVERY,0.5)+lane*0.37;",
  "    float idx=floor(tt), f=fract(tt);",
  "    if(hash(vec2(idx,lane*7.0+3.1))>SHOOT_CHANCE) continue;",
  "    float pr=f/max(SHOOT_SPEED,0.02);",
  "    if(pr>1.0) continue;",
  "    float h1=hash(vec2(idx,lane*7.0+1.3)), h2=hash(vec2(idx,lane*7.0+4.7));",
  "    vec2 start=vec2((0.08+0.84*h1)*aspect,1.06);",
  "    vec2 dir=normalize(vec2((h2-0.5)*1.7,-1.0));",
  "    vec2 head=start+dir*(pr*(1.0+SHOOT_LEN*2.0));",
  "    vec2 tail=head-dir*SHOOT_LEN;",
  "    vec2 pa=ap-tail, ba=head-tail;",
  "    float hh=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);",
  "    float dist=length(pa-ba*hh);",
  "    float core=smoothstep(0.006,0.0,dist);",
  "    float taper=hh*hh;",
  "    float life=smoothstep(0.0,0.06,pr)*smoothstep(1.0,0.8,pr);",
  "    total+=core*taper*life;",
  "  }",
  "  return total; }",
  "void main(){",
  "  float aspect = uRes.x/uRes.y;",
  "  vec2 uv = gl_FragCoord.xy / uRes.xy;", // WebGL: y läuft von unten nach oben
  "  float t = uTime;",
  // Sterne (zwei überlagerte Felder)
  "  vec2 sp=vec2(uv.x*aspect,uv.y);",
  "  float starL=starField(sp,t)+0.5*starField(sp*1.9+7.0,t*1.3);",
  "  vec3 starCol=vec3(0.85,0.9,1.0)*starL*STAR_BRIGHT;",
  // Sternschnuppen
  "  float shoot=shootingStar(uv,t,aspect);",
  "  vec3 shootCol=vec3(0.95,0.97,1.0)*shoot*SHOOT_BRIGHT;",
  // Aurora-Vorhänge (perspektivisch, in die Tiefe gestaffelt). #359: das Band rechnet in der verschobenen/skalierten
  // Vertikalen `yy` (Sterne bleiben auf uv.y) → Showcase kann den Bogen tiefer/gestaucht in die kurze Box legen.
  "  float yy = uv.y * uBandScale + uBandShift;",
  "  vec3 aur=vec3(0.0);",
  "  for(int i=0;i<6;i++){",
  "    if(float(i)>=uLayers) break;",
  "    float fi=float(i);",
  "    float d = uLayers>1.5 ? fi/(uLayers-1.0) : 0.0;", // 0 = vorne/nah .. 1 = hinten/fern
  "    d = pow(clamp(d,0.0,1.0), DEPTH_CURVE);",
  "    float persp = 1.0/(1.0+PERSP*d);",
  "    float warp = WAVE_A*persp*(fbm(vec2(yy*WAVE_F + fi*7.0, fi*2.1 + t*DRIFT))-0.5);",
  "    float x = uv.x + warp;",
  // Wölbung je Band unterschiedlich (Basis DOME ± Streuung, Scheitel horizontal versetzt)
  "    float rA = hash(vec2(fi, 1.7));",
  "    float rB = hash(vec2(fi, 9.1));",
  "    float domeI = DOME + DOME_VAR*(rA*2.0-1.0);",
  "    float cx = uv.x - (0.5 + DOME_SHIFT*(rB*2.0-1.0));",
  "    float arch = domeI*(1.0 - 4.0*cx*cx)*persp;", // fern flacher (×persp)
  "    float topY = mix(1.05, HORIZON+0.05, d) + arch;",
  "    float botY = mix(NEAR_BOT, HORIZON, d) + arch + SPACING*(fbm(vec2(x*1.5+fi,0.7))-0.5);",
  "    float env = smoothstep(botY, botY+SOFT_B*persp, yy) * smoothstep(topY, topY-SOFT_T*persp, yy);",
  "    if(env<=0.0) continue;",
  "    float rays = fbm(vec2(x*RAY_F + fi*20.0, yy*RAY_VF/max(persp,0.15) - t*RAY_S));",
  "    rays = pow(clamp(rays,0.0,1.0), RAY_C);",
  "    float patch = smoothstep(PATCH_FL, PATCH_FL+PATCH_C, fbm(vec2(x*PATCH_S + fi*3.0, 1.5 + t*DRIFT*0.5)));",
  "    float haze = mix(1.0, DEPTH_FADE, d);", // atmosphärische Tiefe: fern blasser
  "    float v = env*(0.18+0.82*rays)*patch*haze;",
  "    float h = clamp((yy-botY)/max(topY-botY,0.001),0.0,1.0);",
  "    aur += auroraCol(h)*v;",
  "  }",
  "  aur = saturate3(aur,SAT)*I_;",
  "  vec3 rgb = aur + starCol + shootCol;",
  "  float a = clamp(max(rgb.r, max(rgb.g, rgb.b)), 0.0, 1.0) * ALPHA;", // Alpha = Helligkeit × Transparenz → Schwarz durchsichtig
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

export default function AuroraFieldGL({ color = null, color2 = null, deckColored = false, animate = true, bandScale = 1, bandShift = 0 }) {
  const canvasRef = useRef(null);

  // #313/#342-bugfix: Farbe/Modus als LIVE-Ref, den der Draw-Loop pro Frame liest — NICHT als useEffect-Dep. Sonst riss
  // ein Standard↔Deckfarbe-Toggle (deckColored-Wechsel bei stabilem Key, siehe #perf-shop Plan B) den ganzen WebGL-
  // Kontext ab: Der Cleanup ruft WEBGL_lose_context.loseContext(), und ein erneutes getContext() auf DERSELBEN Canvas
  // liefert danach einen weiterhin „verlorenen" Kontext → die Aurora blieb leer, bis man den Effekt wechselte (frische
  // Canvas) und zurück. Jetzt lebt der Kontext über die ganze Komponenten-Lebensdauer; der Toggle ändert nur Uniforms.
  const stateRef = useRef({});
  stateRef.current.d1 = hexToRgb(color, [0.20, 0.82, 0.53]);   // Deck-Default #33d187
  stateRef.current.d2 = hexToRgb(color2, [0.69, 0.42, 0.98]);  // Deck-Default #b06afa
  stateRef.current.deckColored = deckColored;
  stateRef.current.animate = animate;
  stateRef.current.bandScale = Number.isFinite(bandScale) ? bandScale : 1;   // #359 vertikale Band-Skalierung (Showcase)
  stateRef.current.bandShift = Number.isFinite(bandShift) ? bandShift : 0;   // #359 vertikale Band-Verschiebung (Showcase)
  const dirtyRef = useRef(true);
  // Prop-Änderung → einen Redraw anfordern (nötig fürs Standbild bei animate=false; im Animate-Fall zeichnet der Loop ohnehin).
  useEffect(() => { dirtyRef.current = true; }, [color, color2, deckColored, animate, bandScale, bandShift]);

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
    const uLayers = gl.getUniformLocation(prog, "uLayers");
    const uBandScale = gl.getUniformLocation(prog, "uBandScale");
    const uBandShift = gl.getUniformLocation(prog, "uBandShift");

    // #perf-A1 / #342: Mobile drosseln. Der neue Vorhang-Loop ruft je Band mehrfach fbm → mehr fbm/Fragment als der
    // alte 3-Bögen-Loop; laut Effekt-Audit ohnehin der größte Mobile-GPU-Posten. Auf Mobile (coarse): DPR-Deckel senken
    // + Bildrate auf ~30 fps kappen (das Schimmern ist langsam → optisch unmerklich) UND Vorhang-Anzahl reduzieren
    // (LAYERS 5 → 3). Desktop = voll (5 Vorhänge, DPR 2).
    const coarse = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(pointer: coarse)").matches : false;
    const layers = coarse ? 3 : 5;
    const dprCap = coarse ? 1.4 : 2;
    const dprOf = () => Math.min(dprCap, window.devicePixelRatio || 1);
    const resize = () => {   // aktualisiert die Canvas-Größe, meldet true bei Änderung (→ Standbild neu zeichnen)
      const w = Math.max(1, Math.floor(canvas.clientWidth * dprOf()));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dprOf()));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); return true; }
      return false;
    };
    const draw = (tSec) => {
      const st = stateRef.current;   // Farbe/Modus LIVE aus dem Ref → Standard↔Deckfarbe-Toggle sofort sichtbar
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); // transparenter Grund → nichts Opakes hinter der Aurora
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, tSec);
      gl.uniform1f(uMode, st.deckColored ? 1 : 0);
      gl.uniform3f(uDeck1, st.d1[0], st.d1[1], st.d1[2]);
      gl.uniform3f(uDeck2, st.d2[0], st.d2[1], st.d2[2]);
      gl.uniform1f(uLayers, layers);
      gl.uniform1f(uBandScale, st.bandScale || 1);   // #359 Default 1 → In-Game-Bogen unverändert
      gl.uniform1f(uBandShift, st.bandShift || 0);   // #359 Default 0 → keine Verschiebung
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let raf = null, startT = null, disposed = false;
    // #perf-A1: FPS-Cap auf Mobile — rAF läuft weiter (glatte Zeitbasis), es wird aber nur ~alle 33 ms wirklich
    // gezeichnet. Die Zeit fließt echt (ms-startT) → das Schimmern bleibt tempo-korrekt, nur eben in ~30 statt 60/120 fps.
    const minMs = coarse ? 1000 / 30 : 0;
    let lastDraw = -1e9;
    const frame = (ms) => {
      if (disposed) return;
      if (startT === null) startT = ms;
      const sized = resize();
      if (stateRef.current.animate) {
        if (ms - lastDraw >= minMs) { lastDraw = ms; draw((ms - startT) / 1000); }
      } else if (dirtyRef.current || sized) {   // Standbild: nur bei Prop-/Größen-Änderung neu zeichnen
        dirtyRef.current = false; draw(6.0);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      const lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
    };
  }, []); // einmaliger Aufbau — der WebGL-Kontext lebt über die ganze Lebensdauer; Farbe/Modus kommen live aus stateRef

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full"
    style={{ pointerEvents: "none" }} />;
}
