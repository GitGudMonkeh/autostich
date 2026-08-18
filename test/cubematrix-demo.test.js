/* #shop-demo — die Würfel-Matrix muss auch bei stummer Musik zeigen, wie sie aussieht.
   -------------------------------------------------------------------------------------------------
   Zwei Sorten Prüfung, wie bei fx-panel: das SIGNAL wird nachgerechnet (die drei Funktionen sind rein),
   die VERDRAHTUNG als Quelltext-Ratsche. Das Signal ist der Teil, der lautlos kaputtgehen kann — ein
   konstanter Wert sähe im Code völlig harmlos aus und ergäbe ein stehendes Feld, also genau den Zustand,
   gegen den der Schalter gebaut wurde. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { demoKick, demoRaw, DEMO_BPM, DEMO_SILENCE_S, DEMO_PEAK_MIN } from "../src/ui/fx/CubeMatrixField.jsx";

const src = (p) => readFileSync(new URL(`../src/ui/${p}`, import.meta.url), "utf8");
const TC = 108;   // 18 Spalten × 6 Reihen — der Desktop-Fall

describe("#shop-demo — das Ersatzsignal", () => {
  it("bleibt in [0,1] — driveCube rechnet mit einem normierten Rohwert", () => {
    for (let t = 0; t < 12; t += 0.017) {
      for (const i of [0, 1, 7, 40, TC - 2, TC - 1]) {
        const v = demoRaw(i, TC, t);
        expect(Number.isFinite(v), `i=${i} t=${t.toFixed(3)}`).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("bewegt sich wirklich — ein konstantes Signal wäre ein stehendes Feld", () => {
    // Über zwei Takte je Band die Spannweite messen. Ein toter Kanal (Spannweite ~0) hieße: dieser
    // Würfel steht still, und niemand sieht es dem Code an.
    let bewegteBaender = 0;
    for (let i = 0; i < TC; i++) {
      let min = Infinity, max = -Infinity;
      for (let t = 0; t < 4.3; t += 0.02) { const v = demoRaw(i, TC, t); if (v < min) min = v; if (v > max) max = v; }
      if (max - min > 0.02) bewegteBaender++;
    }
    expect(bewegteBaender, "praktisch alle Bänder müssen atmen").toBeGreaterThan(TC * 0.9);
  });

  it("hat einen Takt: die 1 ist der stärkste Schlag, die 3 der zweitstärkste", () => {
    const schlag = 60 / DEMO_BPM;
    // Kurz NACH dem Anschlag messen (bei exakt 0 ist die Hüllkurve auf ihrem Maximum).
    const w = [0, 1, 2, 3].map((k) => demoKick(k * schlag + 1e-4));
    expect(w[0]).toBeGreaterThan(w[2]);          // 1 > 3
    expect(w[2]).toBeGreaterThan(w[1]);          // 3 > 2
    expect(w[2]).toBeGreaterThan(w[3]);          // 3 > 4
    // …und der Takt wiederholt sich, statt davonzulaufen.
    expect(demoKick(4 * schlag + 1e-4)).toBeCloseTo(w[0], 6);
  });

  it("verteilt die Energie wie ein Spektrum: Bass unten, nicht überall gleich", () => {
    // Der Kick darf nur die untersten Bänder treiben — sonst hüpft das ganze Feld im Gleichtakt
    // und sieht aus wie ein Balken, nicht wie ein Spektrum.
    const t = 1e-4;                               // exakt auf der „1"
    expect(demoRaw(0, TC, t)).toBeGreaterThan(0.5);
    expect(demoRaw(TC - 1, TC, t)).toBeLessThan(0.5);
  });

  it("Randfälle kippen nicht", () => {
    expect(demoRaw(0, 1, 0)).toBeGreaterThanOrEqual(0);   // TC = 1 → keine Division durch 0
    expect(Number.isFinite(demoKick(0))).toBe(true);
  });
});

describe("#shop-demo — die Verdrahtung", () => {
  const fx = src("fx/CubeMatrixField.jsx");
  const cz = src("CustomizeScreen.jsx");

  it("umgeschaltet wird über einen PEGEL, nicht über ein Mute-Flag", () => {
    // Der Analyser existiert auch bei stummgeschalteter Wiedergabe und liefert dann konstant 0.
    // Ein Fenster über den Spitzenpegel trifft zusätzlich „pausiert" und „Lautstärke 0".
    expect(fx).toMatch(/stilleS\s*=\s*peak\s*<=\s*DEMO_PEAK_MIN\s*\?\s*stilleS\s*\+\s*dt\s*:\s*0/);
    expect(fx).toMatch(/demoOn\s*=\s*!!p\.demo\s*&&\s*!p\.reduced\s*&&\s*stilleS\s*>=\s*DEMO_SILENCE_S/);
    expect(DEMO_PEAK_MIN).toBeGreaterThan(0);
    expect(DEMO_SILENCE_S).toBeGreaterThan(0);
  });

  it("echte Musik gewinnt: der Demo-Zweig steht VOR dem Audio-Zweig", () => {
    // Andersherum fütterte der Audio-Zweig bei stummer Wiedergabe Nullen und senkte die Türme ab,
    // bevor das Ersatzsignal überhaupt drankäme.
    const cubes = fx.slice(fx.indexOf("function computeCubes"));
    expect(cubes.indexOf("if (demoOn)")).toBeLessThan(cubes.indexOf("else if (hasAudio)"));
  });

  it("das Ersatzsignal läuft durch DIESELBE Pipeline wie echte Musik", () => {
    // Kein zweiter Zeichenpfad — nur eine andere Quelle für driveCube. Sonst driftet die Vorschau
    // vom Spiel weg, und genau das ist die Regel dieses Projekts (#kompositor).
    expect(fx).toMatch(/if \(demoOn\) \{\s*\n\s*for \(let i = 0; i < TC; i\+\+\) driveCube\(/);
  });

  it("im Spiel ist der Schalter aus", () => {
    const bf = readFileSync(new URL("../src/ui/Battlefield.jsx", import.meta.url), "utf8");
    for (const zeile of bf.split("\n").filter((l) => l.includes("<CubeMatrixField"))) {
      expect(zeile, "das Brett darf bei stiller Musik still bleiben").not.toMatch(/\bdemo\b/);
    }
  });

  // Das Element steht über zwei Zeilen — als GANZES lesen, sonst prüft der Wächter die halbe Wahrheit.
  const aufruf = cz.slice(cz.indexOf("<CubeMatrixField")).split("/>")[0];

  it("die Werkstatt-Vorschau schaltet ihn an und benutzt den gemeinsamen Boden", () => {
    expect(aufruf).toContain("<CubeMatrixField");
    expect(aufruf).toMatch(/\bdemo\b/);
    expect(aufruf).toMatch(/floorEffectPlacement\(\)/);
  });

  it("die alten Shop-Sonderwerte sind weg — sie galten für eine Box mit anderem Format", () => {
    // riseBase/riseScale/yBias/depthScale waren „in shop-großer Box abgestimmt" (1,62:1). Seit die
    // Vorschau das Brettformat trägt, hielten sie das Feld über dem Horizont des Bildes schweben.
    for (const tot of ["riseBase", "riseScale", "yBias", "depthScale"]) {
      expect(aufruf, `${tot} gehört nicht mehr in die Vorschau`).not.toContain(tot);
    }
  });
});
