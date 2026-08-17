import { useRef, useEffect } from "react";

/* Deck-Glow — Hintergrund-Effekt als EIGENSTÄNDIGE WebGL-Canvas (NICHT über Pixi, analog AuroraFieldGL). Grund: Pixis
   Custom-Shader-Pfad (Mesh & Filter) rendert auf dem Mobile-Setup nichts; rohes WebGL1 / GLSL ES 1.00 läuft dort
   nachweislich. Der Effekt SAMPELT das Battlefield-Bild als Textur, findet dessen helle Linien/Kanten und lässt sie
   in der Deck-/Standardfarbe glühen — zusätzlich ein „Lauflicht", das als wandernde Bande über die Linien läuft.

   Rein ADDITIV (Werte am Tuning-Board eingestellt: Umfärbung = 0): die Canvas gibt NUR die farbige Glut aus
   (Schwarz = Alpha 0), Komposition per PREMULTIPLIED ALPHA über dem darunterliegenden Battlefield-<img> — dieselbe
   mobil-sichere Technik wie AuroraFieldGL. Dadurch ist Deck-Glow eine unabhängige Ebene und mit ALLEN anderen
   Effekten kombinierbar.

   WICHTIG (Mobile-Stabilität): der GL-Context wird GENAU EINMAL aufgebaut. `on`, `deckColor` und die Bildquelle
   fließen über Refs in die Zeichenschleife — KEIN Teardown/Neuaufbau bei Prop-Änderungen. (Ein früher Bug baute den
   Context bei jedem An/Aus- und BG-Wechsel neu auf → iOS Safari limitiert WebGL-Contexts hart und rendert dann
   nichts mehr. Deshalb hier stabil, Textur wird in-place nachgeladen.)

   Props: srcDesktop/srcMobile = Battlefield-Bild je Viewport · deckColor = Glutfarbe (Standard-Neon oder Deckfarbe)
          on = an/aus (weiche Überblendung) · animate = laufende Animation (false → statisches Standbild). */

// [TUNING] Werte aus dem Deck-Glow-Regler (Shop-Preset). Glut = Deckfarbe (uMode fest 1, #336).
//   hlk  = Highlight-Rolloff [A]: wie stark die Glut zurückgeht, wo das Bild schon hell ist (schützt Details vor dem Ausbrennen).
//   flat = Flächen-Gewicht [C]: wie stark flache gesättigte Flächen (nicht nur Kanten) glühen — niedriger = enger auf Konturen.
//   edLo/edHi = Kanten-Schwellen [C]: High-Pass-Fenster der Linien-Maske (höher = nur echte Kanten).
const TUNE = { intensity: 2.5, threshold: 0.28, bloom: 2.0, flow: 1.4, flowSpeed: 3.55, hlk: 0.8, flat: 0.55, edLo: 0.05, edHi: 0.24 };

const VERT = "attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos*0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }";

const FRAG = [
  "precision highp float;",
  "varying vec2 vUv;",
  "uniform vec2 uRes; uniform float uTime; uniform float uMix; uniform float uImgAspect;",
  "uniform vec3 uDeck; uniform sampler2D uTex;",  // #336: Glut immer Deckfarbe → uMode entfällt
  "const float I_=" + TUNE.intensity.toFixed(3) + ", TH=" + TUNE.threshold.toFixed(3) + ", BL=" + TUNE.bloom.toFixed(3) + ", FL=" + TUNE.flow.toFixed(3) + ", FS=" + TUNE.flowSpeed.toFixed(3) + ";",
  "const float HLK=" + TUNE.hlk.toFixed(3) + ", FLAT=" + TUNE.flat.toFixed(3) + ", EDLO=" + TUNE.edLo.toFixed(3) + ", EDHI=" + TUNE.edHi.toFixed(3) + ";",
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
  // Ring-Sampling: Kanten-Mittel (avg) + Halo-Stärke (scalar) für die Glut im Konturen-Umfeld.
  "  float halo = 0.0, avg = 0.0;",
  "  for(int i=0;i<16;i++){",
  "    float a = 6.2831853 * float(i)/16.0;",
  "    vec2 dir = vec2(cos(a), sin(a));",
  "    vec3 c1 = texture2D(uTex, cuv + dir*texel*2.5).rgb;",
  "    vec3 c2 = texture2D(uTex, cuv + dir*texel*5.5).rgb;",
  "    avg += luma(c1);",
  "    halo += strength(c1)*0.65 + strength(c2)*0.35;",
  "  }",
  "  halo /= 16.0; avg /= 16.0;",
  // [C] Linien-Maske enger auf ECHTE Kanten: High-Pass (etwas höhere Schwelle EDLO/EDHI) ODER — schwächer gewichtet
  //     (FLAT) — kräftige gesättigte Fläche. Auf detailreichen Decks feuerte die Fläche zu breit → große Bereiche
  //     überstrahlt; FLAT<1 zieht das auf die Konturen zurück.
  "  float lineEdge = smoothstep(EDLO, EDHI, Lc - avg);",
  "  float w = clamp(max(strength(base)*FLAT, lineEdge), 0.0, 1.0);",
  "  float pulse = 0.82 + 0.18*sin(uTime*2.2);",
  // Lauflicht: zwei gegenläufige Wellen, zu scharfen Kämmen geformt, NUR auf den Linien (×w) → wandert an Konturen entlang
  "  float axis  = dot(vUv, normalize(vec2(1.0, 0.55)));",
  "  float axis2 = dot(vUv, normalize(vec2(-0.4, 1.0)));",
  "  float wv  = 0.5 + 0.5*sin(axis*18.0  - uTime*FS);",
  "  float wv2 = 0.5 + 0.5*sin(axis2*11.0 - uTime*FS*0.6);",
  "  float band = pow(wv, 4.0)*0.75 + pow(wv2, 5.0)*0.45;",
  // [B] Deckfarbe „mehr rausbringen ohne Überbelichten": den Deck-Farbton VOLL SÄTTIGEN (Max-Kanal = 1). Die Glut
  //     kompositet als premultiplied-OVER über dem Bild — mit einem hellen uDeck läuft das bei hohem Alpha auf helle,
  //     entsättigte Flächen (=„überbelichtet"). Der gesättigte Farbton zeigt bei jedem Alpha die satte Deckfarbe.
  //     Farbe von Intensität getrennt: die Farbe bleibt satt, die Intensität (Linie + Lauflicht + Halo) läuft übers ALPHA.
  "  float dmx = max(uDeck.r, max(uDeck.g, uDeck.b));",
  "  vec3 deckCol = uDeck / max(dmx, 0.08);",                                 // gesättigter Deck-Farbton (Helligkeit raus)
  "  float amtRaw = w*(I_*0.5) + halo*BL + w*band*(FL*2.4);",                 // Linie + Halo + Lauflicht → Roh-Intensität
  // [A] Highlight-Rolloff: wo das Bild schon hell ist (Laternen, Rim-Light), die Glut gezielt zurücknehmen. Lc² →
  //     nur echte Highlights stark gedämpft (Mitten/Dunkel bleiben voll) → Bilddetails brennen nicht mehr aus.
  "  float hi = 1.0 - HLK*Lc*Lc;",
  "  float amt = amtRaw * pulse * hi;",
  "  float alpha = clamp(amt, 0.0, 1.0) * uMix;",
  "  gl_FragColor = vec4(deckCol * alpha, alpha);",                          // premultiplied: satte Deckfarbe, Alpha = Intensität // korrektes Kompositing auch auf iOS-Safari
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

export default function DeckGlowFieldGL({ srcDesktop = null, srcMobile = null, deckColor = "#7fdcff", on = true, animate = true, active = true }) {
  const canvasRef = useRef(null);
  // Live-Werte über Refs → die Zeichenschleife liest sie, ohne dass der GL-Context neu gebaut wird.
  const onRef = useRef(on);
  const animRef = useRef(animate);
  const colorRef = useRef(hexToRgb(deckColor, [0.5, 0.86, 1.0]));
  // #336: Glow ist IMMER Deckfarbe → uMode fest auf 1 (Tint). Die Eigenfarbe-Variante (uMode 0) + der deckTint-Prop
  //   sind entfallen (Farbauswahl im Shop raus).
  const srcsRef = useRef({ d: srcDesktop, m: srcMobile });
  const reloadRef = useRef(true); // Anforderung: Textur (neu) laden (bei Bildwechsel gesetzt)

  useEffect(() => { onRef.current = on; }, [on]);
  const activeRef = useRef(active); // #perf-overlay-2: false = Brett verdeckt
  useEffect(() => { animRef.current = animate; }, [animate]);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { colorRef.current = hexToRgb(deckColor, [0.5, 0.86, 1.0]); }, [deckColor]);
  useEffect(() => { srcsRef.current = { d: srcDesktop, m: srcMobile }; reloadRef.current = true; }, [srcDesktop, srcMobile]);

  // GL-Setup GENAU EINMAL (mount). Keine Prop-Deps → kein Context-Neuaufbau.
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
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const coarse = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : false;
    const mqMobile = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(max-width: 640px)") : null;
    const pickSrc = () => ((mqMobile && mqMobile.matches && srcsRef.current.m) ? srcsRef.current.m : (srcsRef.current.d || srcsRef.current.m));

    let imgAspect = 1.7778, texReady = false, curSrc = null, imgEl = null, disposed = false;
    // Textur in-place nachladen (SELBER Context, keine Neuerstellung) — nur wenn sich die Quelle geändert hat.
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
    const onMq = () => { curSrc = null; loadTex(); }; // Viewport-Wechsel → passende Auflösung neu wählen
    if (mqMobile) { if (mqMobile.addEventListener) mqMobile.addEventListener("change", onMq); else if (mqMobile.addListener) mqMobile.addListener(onMq); }

    const dprCap = coarse ? 1.4 : 2;
    const dprOf = () => Math.min(dprCap, window.devicePixelRatio || 1);
    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dprOf()));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dprOf()));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    };

    let mix = onRef.current ? 1 : 0; // weiche An/Aus-Überblendung (Showcase: ohne ↔ mit)
    const draw = (tSec) => {
      resize();
      if (reloadRef.current) { reloadRef.current = false; curSrc = null; loadTex(); } // Bild gewechselt → in-place nachladen
      const target = onRef.current ? 1 : 0;
      mix += (target - mix) * 0.12;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (!texReady) return; // Bild noch nicht da → transparent
      const c = colorRef.current;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, tSec);
      gl.uniform1f(uMix, mix);
      gl.uniform1f(uImgAspect, imgAspect);
      gl.uniform3f(uDeck, c[0], c[1], c[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let raf = null, startT = null, tFrozen = 6.0;
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
      /* #perf-overlay-2: Brett verdeckt → NICHTS tun. Der rAF-Takt läuft bewusst weiter (eine leere Callback ist
         praktisch gratis und erspart die Neustart-Logik samt Rennen), aber Zeichnen UND `resize()` entfallen —
         resize liest clientWidth, erzwingt also je Frame ein Layout. Genau dieser Fall war der Befund aus
         #perf-overlay: die Lauf-UI wird für jede Phase außer menu/gameover gerendert, Architekt/Perk-/Skill-Overlays
         liegen als `fixed inset-0` DARÜBER und ersetzen das Brett nicht. Der Architekt allein sind 13 von 50 Runden. */
      if (activeRef.current === false) { raf = requestAnimationFrame(frame); return; }
      if (startT === null) startT = ms;
      if (ms - lastDraw >= minMs) {
        lastDraw = ms;
        // animate=false → Zeit einfrieren (statisches Standbild), aber weiter zeichnen (mix-Fade bleibt möglich)
        draw(animRef.current ? (ms - startT) / 1000 : tFrozen);
      }
      raf = requestAnimationFrame(frame);
    };
    loadTex();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (mqMobile) { if (mqMobile.removeEventListener) mqMobile.removeEventListener("change", onMq); else if (mqMobile.removeListener) mqMobile.removeListener(onMq); }
      window.removeEventListener("resize", resize);
      const lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
    };
  }, []); // GENAU EINMAL — Prop-Änderungen laufen über die Refs oben (kein Context-Neuaufbau)

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }} />;
}
