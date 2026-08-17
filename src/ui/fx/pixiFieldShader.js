/* Portierung eines Vollbild-Fragment-Shaders (raw-WebGL) nach Pixi — EINE Quelle für Spike und Kompositor.

   Die Feld-Effekte (Aurora, Neon-Brandung, Leuchten) sind je eine eigene raw-WebGL-Canvas, weil früher galt
   „Pixi-Custom-Shader rendert auf dem Mobile-Setup NICHT". Das ist widerlegt (#fx-spike, am Gerät gemessen:
   60 Zeichnungen/s, optisch wie die Referenz). Damit können alle Ebenen in EINE Pixi-Bühne — und genau dafür
   ist diese Datei da.

   VIER FALLEN, jede mit demselben Symptom: schwarzes Bild, KEIN Fehler, Shader läuft. Sie haben mich beim
   ersten Port einen halben Tag gekostet; wer die nächste Ebene holt, findet sie hier statt sie neu zu suchen:

     1. Zwei Koordinatenräume. Bühne und Mesh rechnen in CSS-Pixeln (`app.screen`), `gl_FragCoord` läuft über den
        FRAMEBUFFER. In Pixi v8 ist `renderer.width` NICHT die Framebuffer-Breite, sondern gleich `screen.width`
        (gemessen: 300 gegen `canvas.width` 450 bei `resolution` 1,5). Wer beides verwechselt, malt das Quad um
        den resolution-Faktor zu groß.
     2. `gl_FragCoord` ist in einer Pixi-Bühne als Bildschirmkoordinate unbrauchbar → über `vUV` versorgen.
        Für den Kompositor ohnehin zwingend: sobald eine Ebene in eine Render-Textur zeichnet, ist `gl_FragCoord`
        zielrelativ und hat mit dem Bildschirm nichts mehr zu tun.
     3. GLSL ES 3.00 verlangt die Default-Precision VOR den ersten `in`/`out`-Deklarationen.
     4. Uniform-Vorzeichen. Beispiel Brandung: `damp = exp(-uSurgeT/2.3)`; ein negatives `uSurgeT` ergibt Inf,
        dann `0 * Inf = NaN`, und NaN frisst die gesamte Ausgabe. Werte immer so übergeben, wie die
        Ursprungs-Komponente sie hochlädt — nicht „plausibel" raten.

   Was hier NICHT passiert: die Bildlogik anfassen. Die Ersetzungen sind rein mechanisch, damit der Pixi-Pfad
   Zeichen für Zeichen dieselbe Rechnung macht wie das Original. */

/* Vertex-Shader für ein bildschirmfüllendes Quad in Pixi-v8-Konventionen. `aPosition` läuft 0..1 (die Geometrie
   liefert das so), `vUV` ist damit direkt die UV. Die drei Matrizen sind Pixis Standard-Uniforms. */
export const PIXI_FIELD_VERT = [
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

/* Einen GLSL-ES-1.00-Fragment-Shader (wie ihn die raw-WebGL-Felder benutzen) nach ES 3.00 für Pixi heben.
   `uvExpr` ist der Ausdruck, der im Original die Bildschirm-UV liefert — er wird durch die vUV-Fassung ersetzt.
   Y wird gedreht, weil Pixis Bühne von oben zählt und die Shader von unten rechnen. */
export function toPixiFragment(src, { uvExpr = "gl_FragCoord.xy/uRes.xy" } = {}) {
  const uvPattern = new RegExp(uvExpr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\//g, "\\s*/\\s*"), "g");
  const body = String(src)
    .replace(/gl_FragColor/g, "fragColor")
    .replace(uvPattern, "vec2(vUV.x, 1.0 - vUV.y)")
    .replace(/^\s*precision\s+\w+\s+float\s*;\s*$/m, "");   // wandert in den Kopf (Falle 3)
  return ["#version 300 es", "precision highp float;", "in vec2 vUV;", "out vec4 fragColor;"]
    .concat(body.split("\n")).join("\n");
}

/* Geometrie eines Vollflächen-Quads in lokalen 0..1-Koordinaten. Bewusst hier und nicht beim Aufrufer:
   die Positionen MÜSSEN 0..1 sein, sonst stimmt `vUV` nicht mehr. */
export function fieldQuadGeometry(MeshGeometry) {
  return new MeshGeometry({
    positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  });
}
