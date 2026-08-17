import { useRef, useEffect } from "react";

/* Karten-/Hintergrund-Effekt „Neon-Brandung / Plasma-See" (#345) als EIGENSTÄNDIGE WebGL-Canvas (NICHT über Pixi,
   analog AuroraFieldGL): Pixis Custom-Shader-Pfad rendert auf dem Mobile-Setup nichts; rohes WebGL1 / GLSL ES 1.00
   läuft dort nachweislich. Port des „Neon-Brandung"-Tuners (Artifact), 1:1 nach GLSL ES 1.00.

   Eine am unteren Rahmen sitzende Plasma-See: domain-warped fbm-Fluss mit hellen Neon-Adern, wabernde Wasserlinie
   (Rim-Glow), Auf-Licht in den Raum. Kontinuierlicher Fluss, KEIN Stich-Bezug → reiner Hintergrund-Effekt.

   #345 Ansage-Puls: im Groß-Ansage-Takt (Stark/Brutal/Irre/Gottgleich/Gönn dir) drückt ein Impact-Puls das Wasser
   mittig ein und lässt es an den beiden Seitenrändern hochsteigen (Gefäß/Rahmen-Seiche), dazu ein sanfter Glow-Puls
   durch die ganze See. Der Shader klingt den Puls über SURGE_DUR selbst ab (gedämpfte Schwingung) — der Aufrufer
   reicht nur `surge={ id, mag }`; eine neue id startet die Welle, mag ist die Magnitude (0.7/1.0/1.4).

   Komposition per ALPHA (transparente, premultiplizierte Canvas, Schwarz = Alpha 0 → das Battlefield-Bild bleibt
   sichtbar). Zwei Modi: Standard (cLow→cHigh violett→cyan) oder Deckfarbe (deckA1→deckA2 via deckColored).
   `animate=false` (reduzierte Effekte) → statisches Standbild ohne Fluss/Puls. */

/* #fx-spike: VERT/FRAG sind exportiert, damit der Architektur-Spike (FxSpike.jsx) EXAKT denselben Shader
   auch durch Pixi schickt. Ein nachgebauter Shader wäre als Vergleich wertlos — die offene Frage ist, ob
   Pixi DIESEN Code auf dem Handy rendert (CLAUDE.md: „Pixi-Custom-Shader rendert auf dem Mobile-Setup NICHT").
   Nur lesen, nicht anfassen: der Spike hängt an der Wortgleichheit. */
export const NEONSURF_VERT = "attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }";
const VERT = NEONSURF_VERT;

export const NEONSURF_FRAG = [
  "precision highp float;",
  "uniform vec2 uRes; uniform float uTime; uniform float uMode; uniform vec3 uDeck1; uniform vec3 uDeck2;",
  "uniform float uSurgeT; uniform float uSurgeMag; uniform float uFbmOct;",
  // #345 finale Tuner-Werte (const-Block aus dem Artifact übernommen)
  "const float SEA_LEVEL=0.23, WAVE_A=0.044, WAVE_F=8.4, WAVE_S=0.8, CHOP=0.88, RIM=0.4;",
  "const float FLOW_S=8.0, FLOW_SP=0.45, FLOW_W=1.75, VEIN=1.34, VEIN_SH=6.4;",
  "const float GLOW_UP=0.52, GLOW_H=0.11, I_=0.9, SAT=1.4, ALPHA=0.7;",
  "const float SURGE_LIFT=0.25, IMPACT_W=0.45, SLOSH_FREQ=0.75, SURGE_RIPPLE=0.75, SURGE_DUR=2.3, GLOW_PULSE=0.78;",
  "const float WALL_W=0.13, WALL_STEEP=4.1, WALL_HOLD=0.02, WALL_DAMP=0.76;",
  // Standard-Palette: tief #4a1a8c → Oberfläche #35f0ff
  "const vec3 CLOW=vec3(0.2902,0.1020,0.5490), CHIGH=vec3(0.2078,0.9412,1.0);",
  "float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }",
  "float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);",
  "  float a=hash(i),b=hash(i+vec2(1.0,0.0)),c=hash(i+vec2(0.0,1.0)),d=hash(i+vec2(1.0,1.0));",
  "  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }",
  // fbm mit Oktaven-Deckel als Uniform (Mobile: 5→3 → billiger, siehe #345 Perf)
  "float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ if(float(i)>=uFbmOct) break; v+=a*noise(p); p=p*2.02; a*=0.5; } return v; }",
  "vec3 seaCol(float h){ if(uMode>0.5) return mix(uDeck1,uDeck2,clamp(h,0.0,1.0)); return mix(CLOW,CHIGH,clamp(h,0.0,1.0)); }",
  "vec3 saturate3(vec3 c,float s){ float l=dot(c,vec3(0.299,0.587,0.114)); return mix(vec3(l),c,s); }",
  "void main(){",
  "  vec2 uv=gl_FragCoord.xy/uRes.xy;", // y nach oben → See sitzt unten
  "  float t=uTime, aspect=uRes.x/uRes.y;",
  // #345 Ansage-Puls: Gefäß/Seiche — Mitte sinkt, Seitenränder steigen; gedämpfte Schwingung; sanfter Glow-Puls.
  "  float tt=uSurgeT, damp=exp(-tt/max(SURGE_DUR,0.05));",
  "  float xc=uv.x-0.5;",
  "  float slosh=damp*cos(6.2831*SLOSH_FREQ*tt);",
  "  float aw=clamp(abs(xc)*2.0,0.0,1.0);",                 // 0 Mitte .. 1 Rahmen/Wand
  "  float wallPile=pow(aw,max(WALL_STEEP,0.2));",          // Aufstieg an der Wand
  "  float centerPush=smoothstep(IMPACT_W,0.0,abs(xc));",   // Druck in der Mitte
  "  float vessel=wallPile-centerPush;",
  "  float ripple=damp*cos(6.2831*(abs(xc)*5.0 - tt*3.0));",
  "  float disp=uSurgeMag*(SURGE_LIFT*vessel*slosh + SURGE_RIPPLE*0.04*ripple);",
  "  float gtau=max(SURGE_DUR*0.35,0.05);",
  "  float glowPulse=uSurgeMag*GLOW_PULSE*clamp((tt/gtau)*exp(1.0-tt/gtau),0.0,1.5);",
  // Oberflächen-Höhe (Wellen + Chop + Ansage-Displacement), am Rahmen gedämpft + leicht angehoben (Meniskus).
  "  float wx=uv.x*aspect;",
  "  float wave = sin(wx*WAVE_F + t*WAVE_S)*1.0 + sin(wx*WAVE_F*1.9 - t*WAVE_S*0.7)*0.5 + sin(wx*WAVE_F*0.5 + t*WAVE_S*0.4)*0.7;",
  "  wave *= WAVE_A;",
  "  wave += CHOP*WAVE_A*(fbm(vec2(wx*WAVE_F*2.0, t*WAVE_S*0.6))-0.5);",
  "  float wallEnv = smoothstep(0.5-max(WALL_W,0.001), 0.5, abs(xc));",
  "  wave *= 1.0 - WALL_DAMP*wallEnv;",
  "  float surfY = SEA_LEVEL + wave + WALL_HOLD*wallEnv + disp;",
  "  float below = surfY - uv.y;",          // >0 unter Wasser
  "  vec3 col=vec3(0.0);",
  "  if(below>0.0){",
  "    float depth=clamp(below/max(surfY,0.001),0.0,1.0);", // 0 Oberfläche .. 1 tief
  "    vec2 fp=vec2(uv.x*aspect,uv.y)*FLOW_S;",
  "    vec2 warp=vec2(fbm(fp+vec2(0.0,t*FLOW_SP)), fbm(fp+vec2(5.2,-t*FLOW_SP)))-0.5;",
  "    float flow=fbm(fp + warp*FLOW_W + vec2(t*FLOW_SP*0.5, -t*FLOW_SP*0.3));",
  "    float vein=pow(clamp(1.0-abs(flow-0.5)*2.0,0.0,1.0), VEIN_SH)*VEIN;", // scharfe Neon-Adern
  "    float lum=(0.30+0.70*flow)+vein;",
  "    lum*=mix(1.0,0.22,depth);",                          // Tiefe dunkelt ab
  "    col+=seaCol(1.0-depth)*lum*(1.0+glowPulse);",        // sanfter Glow-Puls durch die GANZE See
  "    float rim=smoothstep(0.02,0.0,below)*RIM*(1.0+glowPulse*0.6);", // helle Wasserlinie
  "    col+=seaCol(1.0)*rim;",
  "  } else {",
  "    float above=-below;",                                // Auf-Licht über der Oberfläche
  "    float up=exp(-above/max(GLOW_H,0.001))*GLOW_UP*(1.0+glowPulse*1.2);",
  "    col+=seaCol(1.0)*up;",
  "  }",
  "  col=saturate3(col,SAT)*I_;",
  "  float a=clamp(max(col.r,max(col.g,col.b)),0.0,1.0)*ALPHA;", // Alpha = Helligkeit × Transparenz → Schwarz durchsichtig
  "  gl_FragColor=vec4(col*a,a);",   // PREMULTIPLIED → korrektes Kompositing auch auf iOS-Safari
  "}",
].join("\n");
const FRAG = NEONSURF_FRAG;

function hexToRgb(h, fb) {
  if (typeof h !== "string") return fb;
  let s = h.replace("#", "");
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  if (s.length !== 6) return fb;
  const n = parseInt(s, 16);
  if (Number.isNaN(n)) return fb;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default function NeonSurfFieldGL({ color = null, color2 = null, deckColored = false, animate = true, surge = null, active = true }) {
  const canvasRef = useRef(null);

  // #313/#342-bugfix-Muster: Farbe/Modus/Surge als LIVE-Ref, den der Draw-Loop pro Frame liest — NICHT als useEffect-Dep.
  // Sonst würde ein Standard↔Deckfarbe-Toggle (deckColored-Wechsel bei stabilem Key) den WebGL-Kontext abreißen und
  // die Canvas bliebe leer (siehe AuroraFieldGL). Der Kontext lebt über die ganze Komponenten-Lebensdauer.
  const stateRef = useRef({});
  stateRef.current.d1 = hexToRgb(color, [0.0431, 0.2275, 0.2667]);   // Deck-Default #0b3a44
  stateRef.current.d2 = hexToRgb(color2, [0.2000, 1.0, 0.8000]);     // Deck-Default #33ffcc
  stateRef.current.deckColored = deckColored;
  stateRef.current.animate = animate;
  stateRef.current.surge = surge;
  stateRef.current.active = active;   // #perf-overlay-2: false = Brett verdeckt → Schleife tut nichts
  const dirtyRef = useRef(true);
  useEffect(() => { dirtyRef.current = true; }, [color, color2, deckColored, animate]);

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
    const uSurgeT = gl.getUniformLocation(prog, "uSurgeT");
    const uSurgeMag = gl.getUniformLocation(prog, "uSurgeMag");
    const uFbmOct = gl.getUniformLocation(prog, "uFbmOct");

    // #perf-A1 / #345: Mobile drosseln — der fbm-Fluss läuft vollflächig je Frame (größter Mobile-GPU-Posten). Auf
    // coarse: DPR-Deckel senken + ~30-fps-Cap + fbm-Oktaven 5→3. Der Surge-Term ist rein analytisch (kein Extra-Loop).
    const coarse = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(pointer: coarse)").matches : false;
    const fbmOct = coarse ? 3 : 5;
    const dprCap = coarse ? 1.4 : 2;
    const dprOf = () => Math.min(dprCap, window.devicePixelRatio || 1);
    const resize = () => {   // aktualisiert die Canvas-Größe, meldet true bei Änderung (→ Standbild neu zeichnen)
      const w = Math.max(1, Math.floor(canvas.clientWidth * dprOf()));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dprOf()));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); return true; }
      return false;
    };

    // #345 Ansage-Puls-Kanal: eine neue surge.id startet die gedämpfte Welle (surgeStart = aktuelle t); der Shader
    // klingt sie über SURGE_DUR selbst ab. Nur im Animate-Modus (reduced/animate=false → kein Puls, nur Grund-Fluss).
    let lastSurgeId = null, surgeStart = -999, surgeMag = 0;
    const draw = (tSec) => {
      const st = stateRef.current;
      const surgeOn = st.animate;
      if (surgeOn && st.surge && st.surge.id !== lastSurgeId) { lastSurgeId = st.surge.id; surgeStart = tSec; surgeMag = +st.surge.mag || 0; }
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); // transparenter Grund → nichts Opakes hinter der See
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, tSec);
      gl.uniform1f(uMode, st.deckColored ? 1 : 0);
      gl.uniform3f(uDeck1, st.d1[0], st.d1[1], st.d1[2]);
      gl.uniform3f(uDeck2, st.d2[0], st.d2[1], st.d2[2]);
      gl.uniform1f(uFbmOct, fbmOct);
      gl.uniform1f(uSurgeT, surgeOn ? tSec - surgeStart : 999);
      gl.uniform1f(uSurgeMag, surgeOn ? surgeMag : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let raf = null, startT = null, disposed = false;
    // #perf-judder: Die Schwelle braucht eine HALBE Frame-Dauer Toleranz. Mit dem exakten Wert (1000/30 = 33,33 ms)
    // liegt sie haargenau auf zwei 60-Hz-Frames (2 × 16,667 ms) — kommt der übernächste Frame den Hauch zu früh,
    // fällt die Zeichnung auf den ÜBERnächsten und der Abstand springt auf 50 ms. Simuliert (400 Frames): schon ohne
    // jeden Jitter ergibt das 33/50/33/50 statt gleichmäßig 33 → nur ~26 statt 30 Zeichnungen/s, und vor allem
    // UNGLEICHMÄSSIG. Das ist der Grund, warum die Effekte auf dem Handy ruckelig wirken, obwohl der FPS-Zähler 60
    // zeigt: der zählt rAF-Frames, nicht Zeichnungen. Mit −8 ms passt jeder zweite Frame sicher durch (auch bei 90 Hz).
    const minMs = coarse ? 1000 / 30 - 8 : 0;
    let lastDraw = -1e9;
    const frame = (ms) => {
      if (disposed) return;
      // #perf-overlay-2: Brett verdeckt → weder zeichnen noch `resize()` (das liest clientWidth = Layout je Frame).
      //   Der rAF-Takt läuft weiter; eine leere Callback ist praktisch gratis und erspart die Neustart-Logik.
      if (stateRef.current.active === false) { raf = requestAnimationFrame(frame); return; }
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
  }, []); // einmaliger Aufbau — Kontext lebt über die ganze Lebensdauer; Farbe/Modus/Surge kommen live aus stateRef

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full"
    style={{ pointerEvents: "none" }} />;
}
