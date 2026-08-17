/* Portierung eines Vollbild-Fragment-Shaders (raw-WebGL) nach Pixi — EINE Quelle für Spike und Kompositor.

   Die Feld-Effekte (Aurora, Neon-Brandung, Leuchten) sind je eine eigene raw-WebGL-Canvas, weil früher galt
   „Pixi-Custom-Shader rendert auf dem Mobile-Setup NICHT". Das ist widerlegt (#fx-spike, am Gerät gemessen:
   60 Zeichnungen/s, optisch wie die Referenz). Damit können alle Ebenen in EINE Pixi-Bühne — und genau dafür
   ist diese Datei da.

   FÜNF FALLEN, die ersten vier mit demselben Symptom: schwarzes (oder falsches) Bild, KEIN Fehler, Shader läuft.
   Sie haben mich beim ersten Port einen halben Tag gekostet; wer die nächste Ebene holt, findet sie hier statt
   sie neu zu suchen:

     1. Zwei Koordinatenräume. Bühne und Mesh rechnen in CSS-Pixeln (`app.screen`), `gl_FragCoord` läuft über den
        FRAMEBUFFER. In Pixi v8 ist `renderer.width` NICHT die Framebuffer-Breite, sondern gleich `screen.width`
        (gemessen: 300 gegen `canvas.width` 450 bei `resolution` 1,5). Wer beides verwechselt, malt das Quad um
        den resolution-Faktor zu groß.
     2. `gl_FragCoord` ist in einer Pixi-Bühne als Bildschirmkoordinate unbrauchbar → über `vUV` versorgen.
        Für den Kompositor ohnehin zwingend: sobald eine Ebene in eine Render-Textur zeichnet, ist `gl_FragCoord`
        zielrelativ und hat mit dem Bildschirm nichts mehr zu tun. Aurora hat mich das ein zweites Mal gekostet:
        ihr `uv` steht MIT Leerzeichen da (`gl_FragCoord.xy / uRes.xy`), die Brandung ohne — die Ersetzung griff
        nicht, das Bild kam trotzdem, nur y-gespiegelt. Deshalb toleriert die Vorlage jetzt Zwischenraum, und
        ein übrig gebliebenes `gl_FragCoord` bricht laut ab statt still falsch zu rendern.
     3. GLSL ES 3.00 verlangt die Default-Precision VOR den ersten `in`/`out`-Deklarationen.
     4. Uniform-Vorzeichen. Beispiel Brandung: `damp = exp(-uSurgeT/2.3)`; ein negatives `uSurgeT` ergibt Inf,
        dann `0 * Inf = NaN`, und NaN frisst die gesamte Ausgabe. Werte immer so übergeben, wie die
        Ursprungs-Komponente sie hochlädt — nicht „plausibel" raten.
     5. RESERVIERTE WÖRTER. ES 3.00 hat Bezeichner reserviert, die in ES 1.00 frei waren — Aurora hatte eine
        lokale Variable `patch` (jetzt `patchV`) und compilierte deshalb nicht. Diese Falle meldet sich
        immerhin ehrlich: „Illegal use of reserved word" in der Konsole, kein stummes schwarzes Bild.
        Weitere Kandidaten, falls eine Ebene zickt: `sample`, `filter`, `active`, `common`, `partition`,
        `resource`, `superp`, `input`, `output`.
     6. TEXTUR-ORIENTIERUNG (nur Ebenen mit `sampler2D`). Die portierte UV zählt von UNTEN — nachgemessen mit einer
        Wegwerf-Ebene, die `vec4(vUv.x, vUv.y, 0, 1)` ausgibt: Grün ist am OBEREN Rand 1. Die raw-Fassungen laden
        ihr Bild deshalb mit `UNPACK_FLIP_Y_WEBGL = true`; Pixi lädt ungedreht (`GlStateSystem` setzt das Flag hart
        auf false, kein Uploader ändert es). Der Dreher gehört also ins LADEN, sonst sampelt die Ebene das vertikal
        gespiegelte Bild. Prüfen an einer Ebene, die NUR die Textur ausgibt, neben demselben Bild als DOM-`<img>` —
        am fertigen Effekt ist es NICHT zuverlässig zu beurteilen (s. loadFieldTexture in FieldCompositor.jsx).

   Und eine Falle, die keine Shader-Falle ist, mich aber zweimal erwischt hat: ein Vergleichsaufbau OHNE das CSS des
   Spiels lässt die raw-Canvas auf ihrer HTML-Standardgröße 300×150 stehen (`w-full h-full` ist Tailwind). Der
   Kompositor misst dagegen seinen Host. Dann vergleicht man zwei Auflösungen und deutet den Unterschied als
   Portierungsfehler — ich habe daraufhin zwei Änderungen eingebaut, die nichts taten. Erst Canvas-Größen
   gegenprüfen, dann Bilder.

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
export function toPixiFragment(src, { uvExpr = "gl_FragCoord.xy/uRes.xy", varyingUv = null } = {}) {
  const head = ["#version 300 es", "precision highp float;", "in vec2 vUV;", "out vec4 fragColor;"];
  let body0 = String(src)
    .replace(/gl_FragColor/g, "fragColor")
    .replace(/\btexture(2D|Cube)\s*\(/g, "texture(");   // ES 3.00 kennt nur noch `texture(...)`
  /* Manche Ebenen holen die Bildschirm-UV nicht aus `gl_FragCoord`, sondern aus einer eigenen `varying`, die der
     Vertex-Shader füllt (Deck-Glow: `vUv` aus `aPos*0.5+0.5`). Deren Deklaration muss raus — der Kopf bringt
     `vUV` schon mit — und der Name wird auf dieselbe gedrehte UV gelegt wie bei den gl_FragCoord-Ebenen. */
  if (varyingUv) {
    const decl = new RegExp(`^\\s*varying\\s+vec2\\s+${varyingUv}\\s*;\\s*$`, "m");
    if (!decl.test(body0)) throw new Error(`toPixiFragment: varyingUv "${varyingUv}" nicht im Quelltext gefunden.`);
    body0 = body0.replace(decl, "");
    head.push(`#define ${varyingUv} vec2(vUV.x, 1.0 - vUV.y)`);
  }
  const body = body0
    .replace(looseExpr(uvExpr), "vec2(vUV.x, 1.0 - vUV.y)")
    .replace(/^\s*precision\s+\w+\s+float\s*;\s*$/m, "");   // wandert in den Kopf (Falle 3)
  /* Wächter zu Falle 2: bleibt ein `gl_FragCoord` stehen, hat die Ersetzung NICHT gegriffen (Aurora schreibt
     `gl_FragCoord.xy / uRes.xy` mit Leerzeichen, die Brandung ohne). Das Bild kommt dann trotzdem — nur
     y-gespiegelt, weil `gl_FragCoord` in einer Render-Textur zielrelativ zählt. Genau so ein stiller Fehler
     soll hier nicht durchrutschen, darum laut abbrechen statt falsch rendern. */
  if (/gl_FragCoord/.test(body)) {
    throw new Error(`toPixiFragment: uvExpr "${uvExpr}" passt nicht auf den Quelltext — gl_FragCoord blieb stehen.`);
  }
  // Gleiche Logik für ES-1.00-Reste: eine übrig gebliebene `varying` linkt nicht, das meldet sich zwar — aber hier
  // steht der Grund gleich dabei, statt in einer nackten GLSL-Fehlermeldung.
  if (/^\s*(varying|attribute)\s/m.test(body)) {
    throw new Error("toPixiFragment: `varying`/`attribute` übrig — ES 3.00 kennt nur `in`/`out` (varyingUv setzen?).");
  }
  return head.concat(body.split("\n")).join("\n");
}

/* Regex aus einem GLSL-Ausdruck, die Leerzeichen im Quelltext toleriert: die Vorlage wird entleert und an jeder
   Naht, an der ein Nicht-Wortzeichen beteiligt ist (`.`, `/`), darf beliebiger Zwischenraum stehen. Innerhalb von
   Bezeichnern bewusst NICHT — `gl_ FragCoord` gibt es nicht, und die Regex bleibt lesbar. */
function looseExpr(expr) {
  const compact = expr.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i < compact.length; i++) {
    const c = compact[i];
    if (i > 0 && !(/\w/.test(c) && /\w/.test(compact[i - 1]))) out += "\\s*";
    out += c.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  }
  return new RegExp(out, "g");
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
