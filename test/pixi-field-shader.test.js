import { describe, it, expect } from "vitest";
import { toPixiFragment } from "../src/ui/fx/pixiFieldShader.js";
import { COMPOSITOR_LAYER_KEYS, layerFragment } from "../src/ui/fx/FieldCompositor.jsx";

/* #kompositor — Wächter für die Shader-Portierung (GLSL ES 1.00 → 3.00, raw-WebGL → Pixi).

   Warum ausgerechnet hier ein Test: an dieser Naht saßen die beiden teuersten Fehler des Umbaus, und BEIDE waren
   still. Die uv-Ersetzung griff bei Aurora nicht (sie schreibt `gl_FragCoord.xy / uRes.xy` MIT Leerzeichen, die
   Brandung ohne) — das Bild kam trotzdem, nur y-gespiegelt. Und `patch` ist in ES 3.00 reserviert, was den Shader
   erst am Gerät auffallen ließ. Ein Gerätetest ist der teuerste Weg, so etwas zu finden; `toPixiFragment` ist
   dagegen eine reine Funktion, die man in Millisekunden befragen kann.

   Es gibt keine WebGL-Testumgebung (vitest läuft in node) — geprüft wird also NICHT das Bild, sondern dass der
   Quelltext, den der Compiler zu sehen bekommt, die mechanischen Regeln erfüllt. Der Bildvergleich bleibt der
   Messstand (Ebene gegen Canvas-Fassung bei eingefrorener Zeit, Abweichung gerechnet statt begutachtet). */

describe("toPixiFragment", () => {
  const es1 = [
    "precision highp float;",
    "uniform vec2 uRes;",
    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / uRes.xy;",
    "  gl_FragColor = vec4(uv, 0.0, 1.0);",
    "}",
  ].join("\n");

  it("hebt einen ES-1.00-Shader vollständig auf ES 3.00", () => {
    const out = toPixiFragment(es1);
    const lines = out.split("\n");
    expect(lines[0]).toBe("#version 300 es");
    // Falle 3: die Default-Precision MUSS vor der ersten in/out-Deklaration stehen.
    expect(lines.indexOf("precision highp float;")).toBeLessThan(lines.indexOf("in vec2 vUV;"));
    expect(out).not.toMatch(/gl_FragColor/);
    expect(out).toMatch(/out vec4 fragColor;/);
    // Die alte Precision-Zeile aus dem Rumpf ist entfallen, nicht verdoppelt.
    expect(out.match(/precision\s+\w+\s+float\s*;/g)).toHaveLength(1);
  });

  it("ersetzt die Bildschirm-UV unabhängig von Leerzeichen (der Aurora-Fehler)", () => {
    for (const src of ["gl_FragCoord.xy/uRes.xy", "gl_FragCoord.xy / uRes.xy", "gl_FragCoord.xy /uRes.xy"]) {
      const out = toPixiFragment(`precision highp float;\nvoid main(){ gl_FragColor = vec4(${src}, 0.0, 1.0); }`);
      expect(out).toContain("vec2(vUV.x, 1.0 - vUV.y)");
      expect(out).not.toMatch(/gl_FragCoord/);
    }
  });

  it("bricht ab, statt still falsch zu rendern, wenn die Ersetzung nicht greift", () => {
    // Genau der Fall, der als y-gespiegeltes Bild durchgegangen wäre.
    expect(() => toPixiFragment("void main(){ gl_FragColor = vec4(gl_FragCoord.xy, 0.0, 1.0); }"))
      .toThrow(/gl_FragCoord/);
  });

  it("bridged eine eigene varying auf dieselbe UV und lässt keine ES-1.00-Reste stehen", () => {
    const src = "precision highp float;\nvarying vec2 vUv;\nuniform sampler2D uTex;\n" +
      "void main(){ gl_FragColor = texture2D(uTex, vUv); }";
    const out = toPixiFragment(src, { varyingUv: "vUv" });
    expect(out).toMatch(/#define vUv vec2\(vUV\.x, 1\.0 - vUV\.y\)/);
    expect(out).not.toMatch(/^\s*varying\s/m);
    expect(out).not.toMatch(/texture2D/);          // ES 3.00 kennt nur noch texture(...)
    expect(out).toMatch(/texture\(uTex, vUv\)/);
  });

  it("meldet eine übrig gebliebene varying, statt sie dem GLSL-Compiler zu überlassen", () => {
    expect(() => toPixiFragment("precision highp float;\nvarying vec2 vFoo;\nvoid main(){ gl_FragColor = vec4(vFoo,0.,1.); }"))
      .toThrow(/varying/);
    // Und ein falsch benannter Bridge-Name fällt sofort auf, statt die Deklaration stehen zu lassen.
    expect(() => toPixiFragment("precision highp float;\nvarying vec2 vUv;\nvoid main(){}", { varyingUv: "vUvs" }))
      .toThrow(/vUvs/);
  });
});

describe("Kompositor-Ebenen", () => {
  it("portieren alle sauber — jede Ebene erfüllt dieselben Regeln", () => {
    // #deckglow-raus: waren DREI Ebenen (Brandung · Aurora · Leuchten), „Leuchten" ist entfallen. Die Untergrenze
    // hält weiterhin fest, dass die Registry nicht unbemerkt leerläuft — mit dem Stand danach.
    expect(COMPOSITOR_LAYER_KEYS.length).toBeGreaterThanOrEqual(2);
    for (const key of COMPOSITOR_LAYER_KEYS) {
      const frag = layerFragment(key);   // wirft, wenn eine Regel verletzt ist
      expect(frag.startsWith("#version 300 es"), key).toBe(true);
      expect(frag, key).not.toMatch(/gl_FragColor|gl_FragCoord|texture2D|^\s*varying\s/m);
      // Falle 5: Bezeichner, die ES 3.00 reserviert hat, ES 1.00 aber erlaubte.
      for (const w of ["patch", "sample", "filter", "active", "partition", "resource", "superp"]) {
        expect(frag.match(new RegExp(`\\b(float|vec[234]|int|bool)\\s+${w}\\b`)), `${key}: ${w}`).toBeNull();
      }
    }
  });
});
