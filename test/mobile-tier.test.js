import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DPR_CAP_COARSE, DPR_CAP_DESKTOP, DRAW_HZ_COARSE, frameMinMs } from "../src/ui/fx/mobileTier.js";

/* Wächter für die Mobile-Stufe (#perf-mobile, Hebel 01–06).

   Zwei Dinge sind hier historisch immer wieder verloren gegangen und beide sind unsichtbar, wenn man sie bricht:
   die −8 ms Judder-Toleranz (die glatte 1000/30 sieht „richtiger" aus und ruckelt) und der Umstand, dass ein
   Effekt seine Deckel am GERÄT festmachen muss und nicht an der Options-Stufe `lite`. Beides wird nicht durch
   Rendering geprüft — die Effekte brauchen Canvas/WebGL, die Testumgebung ist `node`. Also Quelltext-Ratsche:
   sie kann nicht beweisen, dass es richtig gerechnet wird, aber sie merkt, wenn die Naht verschwindet. */

const src = (p) => readFileSync(new URL("../src/ui/fx/" + p, import.meta.url), "utf8");

describe("mobileTier — Rechenwerte", () => {
  it("hält die halbe Frame-Toleranz im Zeichen-Mindestabstand", () => {
    /* Ohne die −8 ms liegt die Schwelle exakt auf einem Vielfachen der 60-Hz-Frames und jede zweite Zeichnung
       rutscht auf den übernächsten Frame → bei 30 Hz z. B. 33/50/33/50 statt gleichmäßig 33. Die Herleitung steht
       in mobileTier.js.
       Formuliert ist das bewusst als VERHÄLTNIS zur eingestellten Rate und nicht mehr gegen die feste 30: die Rate
       ist seit #perf-spend eine Stellschraube (Standard 60, `?hz=` am Gerät). Ein Test, der die alte Zahl festhält,
       hätte hier nur gemeldet, dass sich der Standard geändert hat — und nicht, ob die Toleranz noch stimmt. */
    const period = 1000 / DRAW_HZ_COARSE;
    expect(frameMinMs(true)).toBeCloseTo(period - 8, 10);
    expect(frameMinMs(true)).toBeLessThan(period);          // sonst bremst der Deckel die eigene Rate weg
    expect(frameMinMs(true)).toBeGreaterThan(period - 1000 / 60);  // …aber nicht mehr als eine ganze 60-Hz-Frame-Dauer
  });

  it("bremst gar nicht, wenn die Rate am oder über dem Bildschirmtakt liegt", () => {
    // Bei einem Deckel jenseits der Bildschirmrate ist jedes Bremsen falsch: die Schwelle läge unter der echten
    // Frame-Dauer und würde nur noch Frames verwerfen, die ohnehin rechtzeitig kämen.
    expect(frameMinMs(false)).toBe(0);   // Desktop ist ungedeckelt
  });

  it("deckelt die Auflösung auf dem Handy schärfer als am Desktop", () => {
    expect(DPR_CAP_COARSE).toBeLessThan(DPR_CAP_DESKTOP);
    expect(DPR_CAP_COARSE).toBe(1.4); // derselbe Wert wie in den drei raw-WebGL-Feldern — bewusst einheitlich
  });

  it("nimmt ohne window den Desktop an (SSR-sicher, kein Absturz beim Import)", () => {
    expect(frameMinMs(false)).toBe(0);
  });
});

describe("mobileTier — Verdrahtung (Quelltext-Ratsche)", () => {
  // Dauer-Effekte auf Canvas-2D: ihre Deckel gehören an die eine Wahrheit, nicht je Datei nachgebaut.
  for (const f of ["FrostIce.jsx", "MossGrow.jsx", "CardEdgeGlow.jsx", "CardIonStorm.jsx", "BlackholeFx.jsx", "CubeMatrixField.jsx"]) {
    it(`${f} holt die Mobile-Stufe aus mobileTier.js`, () => {
      expect(src(f)).toMatch(/from "\.\/mobileTier\.js"|from "\.\.\/fx\/mobileTier\.js"/);
    });
  }

  it("CubeMatrixField hängt seinen Sparpfad am Gerät, nicht allein an der Options-Stufe", () => {
    const s = src("CubeMatrixField.jsx");
    // Der Zeigertyp ist die UNTERGRENZE: coarse ⇒ mindestens lite. Sonst läuft ein Handy mit „Effekte voll" im
    // vollen Desktop-Pfad (DPR 1,25 · ~41 fps · 18×6 Würfel · 40 Strahlstreifen · Spot-Bloom).
    expect(s).toMatch(/const liteOn = \(\) => COARSE \|\| !!propsRef\.current\.lite;/);
    // Kein direkter lite-Lesezugriff mehr an den Deckel-Stellen — sonst hätte eine davon den Gerätetyp wieder verloren.
    expect(s).not.toMatch(/propsRef\.current\.lite \?/);
    expect(s).not.toMatch(/\bp\.lite \?/);
  });
});
