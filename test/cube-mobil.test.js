import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================================
   #cube-mobil — das Drahtgitter der Würfel-Matrix ist auf dem Handy leiser gestellt.

   Drei Griffe, alle in dieselbe Richtung, und alle drei fallen STILL zurück: der Effekt sieht danach
   für sich genommen weiter richtig aus, er kostet nur wieder das Doppelte. Genau dafür eine Ratsche.

   Die Zahlen, auf die sich das bezieht — je Render, 48 Würfel auf lite (12 × 4):

     vorher   288 stroke(), alle additiv, 1152 runde Ecken zu tessellieren
     jetzt    144 stroke(), alle additiv,  576 Ecken, als bevel

   Gemeldet wurde das als „gefühlt spürbar weniger fps mit Wire an". Eine erste Gegenrechnung über die
   bemalte FLÄCHE kam auf „Striche und Füllungen nehmen sich nichts" und war irreführend: ein Strich
   kostet mehr als eine Füllung gleicher Fläche, weil aus jedem Strichpfad erst eine Füllgeometrie
   erzeugt werden muss — je Render neu. Zwei Durchgänge sind also nicht doppelte Fläche, sondern
   doppelte Pfad-Expansion. Der Kommentar steht hier, weil die Zahl allein den falschen Schluss trägt.
   ============================================================================ */

const src = readFileSync(new URL("../src/ui/fx/CubeMatrixField.jsx", import.meta.url), "utf8");
/* Kommentarfrei: die Begründungen oben nennen `lineJoin`, `round` und den Halo beim Namen, und ein
   Wächter, den sein eigener Kommentar erfüllt, prüft nichts. */
const bare = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const wire = (() => {
  const at = bare.indexOf("if (propsRef.current.wire) {");
  return at < 0 ? "" : bare.slice(at, bare.indexOf("return;", at));
})();

describe("#cube-mobil — der Wire-Zweig", () => {
  it("der Zweig ist überhaupt noch auffindbar", () => {
    expect(wire, "der Wire-Zweig in CubeMatrixField.jsx wurde umgebaut — die Ratsche zeigt ins Leere").toBeTruthy();
    expect(wire).toContain("drawFaces");
  });

  it("der Halo-Durchgang läuft NUR am Desktop", () => {
    /* Der teuerste der drei Posten. Ohne die Bedingung zeichnet das Handy wieder zwei additive
       Durchgänge statt einem — und zwar unsichtbar, weil der Effekt danach richtig aussieht. */
    const halo = wire.match(/if \(litFull\)[^\n]*drawFaces\(\)/);
    expect(halo, "der Halo ist nicht mehr auf litFull gegattert — das Handy zeichnet wieder doppelt").toBeTruthy();
    expect(halo[0], "der Halo-Durchgang ist nicht der gegatterte").toMatch(/laCore \* 0\.34/);
  });

  it("es bleibt genau EIN ungegatterter drawFaces-Aufruf — der Kern-Strich", () => {
    /* Gegenprobe zur Regel darüber: ein dritter Durchgang, der niemandem auffällt, wäre genau der
       Rückfall, den diese Datei verhindern soll. */
    const calls = wire.match(/drawFaces\(\);/g) || [];
    expect(calls.length, "die Zahl der Zeichen-Durchgänge hat sich geändert").toBe(2);
    /* GEGATTERT heisst `if (litFull)` am Zeilenanfang — nicht "erwaehnt litFull". Die Kern-Zeile traegt
       das Wort in ihrem `Math.max(litFull ? …)` und fiel bei der naiven Pruefung mit heraus; der
       Waechter zaehlte 0 statt 1 und meldete rot, was richtig war. */
    const lines = wire.split("\n").filter((l) => l.includes("drawFaces();"));
    const gated = lines.filter((l) => /^\s*if \(litFull\)/.test(l));
    expect(gated.length, "der Halo ist nicht mehr der gegatterte Durchgang").toBe(1);
    expect(lines.length - gated.length, "mehr als ein Durchgang laeuft auf dem Handy").toBe(1);
  });

  it("runde Ecken kosten nur am Desktop", () => {
    expect(wire, "lineJoin steht wieder fest auf round — 576 Tessellationen je Render umsonst")
      .toMatch(/lineJoin\s*=\s*litFull\s*\?\s*"round"\s*:\s*"bevel"/);
  });

  it("der Kern-Strich hat auf lite den niedrigeren Boden", () => {
    /* 1,0 statt 1,2 px: bei DPR 1.0 ist 1 px schärfer UND schmaler. Der 2-px-Boden des Halos ist mit
       dem Halo entfallen — er war auf einer Handy-Canvas ohnehin wirkungslos, weil `max(2, …)` die
       lite-Verdünnung von 0.0064 auf 0.0050 wegklemmte. */
    expect(wire).toMatch(/Math\.max\(litFull \? 1\.2 : 1(\.0)?,/);
  });

  it("am Desktop ändert sich nichts", () => {
    /* Der Sinn der drei Griffe ist das Handy. Verschwände der Halo ganz, wäre der Neon-Look weg —
       und das ist eine Gestaltungsfrage, keine Perf-Frage. */
    expect(wire, "der Desktop-Halo ist nicht mehr auf voller Breite").toMatch(/H \* 0\.0064/);
    expect(wire, "der Desktop-Halo hat seinen additiven Modus verloren").toMatch(/globalCompositeOperation = "lighter"/);
  });
});
