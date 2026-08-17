/* Neon-Brandung / Plasma-See (#345) — NUR die Shader-Quelle. Gerendert wird sie vom Feld-Kompositor (FieldCompositor.jsx).

   Diese Datei war einmal eine eigenständige WebGL-Canvas-Komponente, mit der Begründung „Pixis Custom-Shader-Pfad
   rendert auf dem Mobile-Setup nichts". Das ist am echten Gerät widerlegt (#fx-spike), und die Komponente ist
   entfallen: es gibt jetzt EINEN Renderpfad für alle Feld-Effekte statt einer eigenen Canvas je Effekt. Übrig
   bleibt hier, was den Effekt ausmacht — die Bildrechnung und ihre Begründung.

   Bewusst weiterhin GLSL ES 1.00: `toPixiFragment` (pixiFieldShader.js) hebt den Quelltext mechanisch auf ES 3.00.

   Eine am unteren Rahmen sitzende Plasma-See: domain-warped fbm-Fluss mit hellen Neon-Adern, wabernde Wasserlinie
   (Rim-Glow), Auf-Licht in den Raum. Kontinuierlicher Fluss, KEIN Stich-Bezug → reiner Hintergrund-Effekt.

   #345 Ansage-Puls: im Groß-Ansage-Takt (Stark/Brutal/Irre/Gottgleich/Gönn dir) drückt ein Impact-Puls das Wasser
   mittig ein und lässt es an den beiden Seitenrändern hochsteigen (Gefäß/Rahmen-Seiche), dazu ein sanfter Glow-Puls
   durch die ganze See. Der Shader klingt den Puls über SURGE_DUR selbst ab (gedämpfte Schwingung) — der Aufrufer
   reicht nur `surge={ id, mag }`; eine neue id startet die Welle, mag ist die Magnitude (0.7/1.0/1.4).

   Komposition per ALPHA (transparente, premultiplizierte Canvas, Schwarz = Alpha 0 → das Battlefield-Bild bleibt
   sichtbar). Zwei Modi: Standard (cLow→cHigh violett→cyan) oder Deckfarbe (deckA1→deckA2 via deckColored).
   `animate=false` (reduzierte Effekte) → statisches Standbild ohne Fluss/Puls. */

/* Auflösungsfaktor dieser Ebene: mobil 0,75, am Gerät bestimmt (0,5 war sichtbar zu weich — die harte, helle
   Wasserlinie verzeiht Hochskalieren nicht). Der Wert steht in FieldCompositor.jsx, hier nur der Hinweis darauf. */
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
