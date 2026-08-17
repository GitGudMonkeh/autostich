/* Deck-Glow / Leuchten — NUR die Shader-Quelle. Gerendert wird sie vom Feld-Kompositor (FieldCompositor.jsx).

   Diese Datei war einmal eine eigenständige WebGL-Canvas-Komponente, mit der Begründung „Pixis Custom-Shader-Pfad
   rendert auf dem Mobile-Setup nichts". Das ist am echten Gerät widerlegt (#fx-spike), und die Komponente ist
   entfallen: es gibt jetzt EINEN Renderpfad für alle Feld-Effekte statt einer eigenen Canvas je Effekt. Übrig
   bleibt hier, was den Effekt ausmacht — die Bildrechnung und ihre Begründung.

   Bewusst weiterhin GLSL ES 1.00: `toPixiFragment` (pixiFieldShader.js) hebt den Quelltext mechanisch auf ES 3.00.

   Was der Effekt tut: er SAMPELT das Battlefield-Bild als Textur, findet dessen helle Linien/Kanten und lässt sie
   in der Deck-/Standardfarbe glühen — dazu ein „Lauflicht", das als wandernde Bande über die Linien läuft. Weil er
   auf dem Bilddetail reitet, verträgt er als einzige Ebene KEINE verkleinerte Render-Textur (s. FieldCompositor).

   Rein ADDITIV (Werte am Tuning-Board eingestellt: Umfärbung = 0): die Canvas gibt NUR die farbige Glut aus
   (Schwarz = Alpha 0), Komposition per PREMULTIPLIED ALPHA über dem darunterliegenden Battlefield-<img> — dieselbe
   mobil-sichere Technik wie Aurora. Dadurch ist Deck-Glow eine unabhängige Ebene und mit ALLEN anderen
   Effekten kombinierbar.

   WICHTIG (Mobile-Stabilität, gilt weiter im Kompositor): die Bühne wird GENAU EINMAL aufgebaut, ein Bildwechsel
   tauscht nur die Textur. Ein früher Bug baute den Kontext bei jedem An/Aus- und Hintergrund-Wechsel neu auf → iOS
   Safari limitiert WebGL-Kontexte hart und rendert danach gar nichts mehr.

   Props am Aufrufer (FieldLayer, layer="deckglow"): srcDesktop/srcMobile = Battlefield-Bild je Viewport ·
   color = Glutfarbe · on = an/aus (weiche Überblendung) · animate = false → statisches Standbild. */

// [TUNING] Werte aus dem Deck-Glow-Regler (Shop-Preset). Glut = Deckfarbe (uMode fest 1, #336).
//   hlk  = Highlight-Rolloff [A]: wie stark die Glut zurückgeht, wo das Bild schon hell ist (schützt Details vor dem Ausbrennen).
//   flat = Flächen-Gewicht [C]: wie stark flache gesättigte Flächen (nicht nur Kanten) glühen — niedriger = enger auf Konturen.
//   edLo/edHi = Kanten-Schwellen [C]: High-Pass-Fenster der Linien-Maske (höher = nur echte Kanten).
const TUNE = { intensity: 2.5, threshold: 0.28, bloom: 2.0, flow: 1.4, flowSpeed: 3.55, hlk: 0.8, flat: 0.55, edLo: 0.05, edHi: 0.24 };

/* EXPORTIERT für den Feld-Kompositor (#kompositor): dort läuft derselbe Shader als Ebene einer geteilten Pixi-Bühne.
   Die Quelle wird geteilt und NICHT abgetippt — sonst driften alter und neuer Pfad auseinander und ein A/B-Vergleich
   misst zwei verschiedene Effekte. Die ES-1.00→3.00-Anhebung macht `toPixiFragment` (pixiFieldShader.js) mechanisch. */
export const DECKGLOW_FRAG_SRC = [
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
