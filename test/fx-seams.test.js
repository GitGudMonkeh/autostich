import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";

import {
  gottAppOptions, gottMaxFPS, createPlacer, GOTT_RES_FULL, GOTT_RES_LITE, GOTT_FPS_FULL,
} from "../src/ui/fx/pixiGott.js";
import { DRAW_HZ_COARSE } from "../src/ui/fx/mobileTier.js";
import {
  EFFECT_ZONES, MOBILE_MQ, pickEffectZone, FLOOR_FRONT_AT_BOTTOM, floorEffectPlacement,
} from "../src/ui/fx/effectZones.js";

/* #fx-nähte — die beiden geteilten „eine Wahrheit"-Module in src/ui/fx, die bisher gar keinen Test hatten.

   Der Ordner ist fast testfrei, weil das meiste darin Canvas/WebGL ist. Diese zwei sind es NICHT: sie
   sind reine Arithmetik, und sie existieren genau deshalb, weil ihre Werte vorher in fünf bzw. mehreren
   Effektdateien kopiert lagen und auseinanderliefen. Ein Modul gegen Drift zu bauen und es dann nicht
   zu prüfen, lässt genau die Lücke offen, die es schließen sollte.

   Zwei Sorten Prüfung, wie anderswo im Repo (mobile-tier, starfield-budget): das Verhalten der
   Funktionen, plus eine QUELLTEXT-RATSCHE dafür, dass die Effekte sie auch wirklich benutzen — ein
   Effekt, der sich wieder eigene Werte hinschreibt, ist der eigentliche Rückfall. */

const src = (f) => readFileSync(new URL(`../src/ui/fx/${f}`, import.meta.url), "utf8");
const srcUi = (f) => readFileSync(new URL(`../src/ui/${f}`, import.meta.url), "utf8");
// Kommentare raus, bevor auf „steht dieser Schlüssel im Code" geprüft wird — die Effektdateien BEGRÜNDEN
// die Einstellungen ausführlich im Text, und ein Treffer im Fließtext ist kein zurückgeschriebener Wert.
const ohneKommentare = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const PRUNKS = ["SonnenPulsPixi.jsx", "LaserFaecherPixi.jsx", "PrismaKaskadePixi.jsx", "HoloCubePixi.jsx", "SupernovaPixi.jsx"];

// gottAppOptions liest window.devicePixelRatio — die Testumgebung ist `node`, also stellen wir eins hin.
const echtesWindow = globalThis.window;
const mitDPR = (dpr, fn) => {
  globalThis.window = { devicePixelRatio: dpr };
  try { return fn(); } finally { globalThis.window = echtesWindow; }
};
afterEach(() => { globalThis.window = echtesWindow; });

describe("pixiGott · Grundeinstellung der Gottgleich-Prunks", () => {
  it("hält die drei gemessenen Hebel fest: kein MSAA, autoDensity, transparenter Grund", () => {
    const o = mitDPR(3, () => gottAppOptions({ canvas: "c", host: "h", lite: false }));
    // antialias kostet ein Full-Canvas-Resolve pro Frame und glättet an vorgebackenen Texturen nichts.
    expect(o.antialias).toBe(false);
    expect(o.autoDensity).toBe(true);      // resolution bleibt reine Backing-Store-Dichte, kein Layout-Effekt
    expect(o.backgroundAlpha).toBe(0);
    expect(o.resizeTo).toBe("h");
    expect(o.canvas).toBe("c");
  });

  it("wählt die Dichte nach Stufe — und niemals über der echten Gerätedichte", () => {
    // Der Deckel ist der Punkt: auf einem DPR-1-Display wäre 1,5 reine Mehrarbeit ohne jeden Gewinn.
    expect(mitDPR(3, () => gottAppOptions({ lite: false })).resolution).toBe(GOTT_RES_FULL);
    expect(mitDPR(3, () => gottAppOptions({ lite: true })).resolution).toBe(GOTT_RES_LITE);
    expect(mitDPR(1, () => gottAppOptions({ lite: false })).resolution).toBe(1);
    expect(mitDPR(1, () => gottAppOptions({ lite: true })).resolution).toBe(1);
    expect(GOTT_RES_LITE).toBeLessThan(GOTT_RES_FULL);
  });

  it("lässt Effekte mit ZWEI Canvas die lite-Dichte weiter senken (Supernova: Tunnel + Nova)", () => {
    expect(mitDPR(3, () => gottAppOptions({ lite: true, resLite: 1.0 })).resolution).toBe(1.0);
    // resFull bleibt davon unberührt — gesenkt wird nur die Stufe, die es nötig hat.
    expect(mitDPR(3, () => gottAppOptions({ lite: false, resLite: 1.0 })).resolution).toBe(GOTT_RES_FULL);
  });

  it("deckelt die Zeichenrate und holt den lite-Wert aus mobileTier (nicht als zweite Zahl daneben)", () => {
    expect(gottMaxFPS(false)).toBe(GOTT_FPS_FULL);
    expect(gottMaxFPS(true)).toBe(DRAW_HZ_COARSE);
    expect(GOTT_FPS_FULL).toBeGreaterThan(0);   // 0 hieße „ungedeckelt" — genau der behobene Zustand
  });
});

describe("pixiGott · Geometrie-Cache (createPlacer)", () => {
  it("misst einmal und liefert danach aus dem Cache", () => {
    let n = 0;
    const p = createPlacer(() => { n++; return { w: 400 }; });
    expect(p.get()).toEqual({ w: 400 });
    p.get(); p.get();
    expect(n).toBe(1);   // ohne Cache wären das drei erzwungene Layouts
  });

  it("cacht NUR ein brauchbares Ergebnis — ein noch nicht messbares Panel wird erneut versucht", () => {
    let n = 0;
    const p = createPlacer(() => { n++; return n < 3 ? null : { w: 400 }; });
    expect(p.get()).toBe(null);
    expect(p.get()).toBe(null);
    expect(p.get()).toEqual({ w: 400 });
    p.get();
    expect(n).toBe(3);   // ab dem ersten echten Wert steht der Cache
  });

  it("invalidate erzwingt die nächste Messung — das ist der Haken für startPlay()", () => {
    let n = 0;
    const p = createPlacer(() => { n++; return { w: n }; });
    expect(p.get()).toEqual({ w: 1 });
    p.invalidate();
    expect(p.get()).toEqual({ w: 2 });
    expect(p.get()).toEqual({ w: 2 });
  });
});

describe("pixiGott · Verdrahtung (Quelltext-Ratsche)", () => {
  it("alle fünf Prunks holen Init, FPS-Deckel und Geometrie aus pixiGott.js", () => {
    for (const f of PRUNKS) {
      const s = src(f);
      expect(s, `${f} importiert pixiGott.js`).toContain('from "./pixiGott.js"');
      expect(s, `${f} nutzt gottAppOptions`).toContain("gottAppOptions(");
      expect(s, `${f} nutzt gottMaxFPS`).toContain("gottMaxFPS(");
      expect(s, `${f} nutzt createPlacer`).toContain("createPlacer(");
    }
  });

  it("kein Prunk schreibt sich antialias oder eine eigene resolution zurück in den init-Aufruf", () => {
    // Das war der Zustand vorher: derselbe app.init-Block fünfmal, jeder für sich nachjustiert.
    for (const f of PRUNKS) {
      const s = ohneKommentare(src(f));
      expect(s.includes("antialias:"), `${f} setzt antialias selbst`).toBe(false);
      expect(s.includes("resolution:"), `${f} setzt resolution selbst`).toBe(false);
    }
  });
});

describe("effectZones · der gemeinsame Feld-Boden", () => {
  it("beide Zonen sind volle Breite und enden bündig am unteren Rand", () => {
    for (const [name, z] of Object.entries(EFFECT_ZONES)) {
      expect(z.x, name).toBe(0);
      expect(z.w, name).toBe(100);
      expect(z.y + z.h, `${name}: Band endet am Panel-Boden`).toBe(100);
      expect(z.persp, name).toBeGreaterThan(0);
      expect(z.persp, `${name}: Verjüngung unter halber Breite`).toBeLessThan(50);
    }
  });

  it("das Handy-Band ist flacher und sitzt tiefer als das Desktop-Band", () => {
    // Auf dem kleinen Panel bliebe für die Karten sonst zu wenig Höhe übrig.
    expect(EFFECT_ZONES.mobile.h).toBeLessThan(EFFECT_ZONES.desktop.h);
    expect(EFFECT_ZONES.mobile.y).toBeGreaterThan(EFFECT_ZONES.desktop.y);
  });

  it("pickEffectZone wählt nach Viewport, und der Breakpoint deckt sich mit der Bild-Auswahl", () => {
    expect(pickEffectZone(true)).toBe(EFFECT_ZONES.mobile);
    expect(pickEffectZone(false)).toBe(EFFECT_ZONES.desktop);
    expect(MOBILE_MQ).toBe("(max-width: 640px)");
    expect(srcUi("Battlefield.jsx")).toContain("640");   // dieselbe Grenze wie das <picture>
  });

  it("die vorderste Bodenreihe sitzt knapp über dem Rahmen, nicht darüber hinaus", () => {
    expect(FLOOR_FRONT_AT_BOTTOM).toBeGreaterThan(0.9);
    expect(FLOOR_FRONT_AT_BOTTOM).toBeLessThanOrEqual(1);
    expect(floorEffectPlacement()).toEqual({ floorBottom: FLOOR_FRONT_AT_BOTTOM });
  });

  it("die Boden-Effekte konsumieren die Werte, statt sie sich erneut hinzuschreiben", () => {
    // Der Zweck des Moduls: ein neuer Boden-Effekt sitzt automatisch auf demselben Boden.
    const sf = src("starfieldPixi.js");
    expect(sf).toContain('from "./effectZones.js"');
    expect(sf).toContain("FLOOR_FRONT_AT_BOTTOM");
    expect(sf).toContain("EFFECT_ZONES.desktop");
    expect(srcUi("Battlefield.jsx")).toContain("floorEffectPlacement()");
    /* #vorschau-brett: Die Werkstatt-Vorschau ist seit 18.08.2026 ebenfalls Konsument. Sie hatte ihre
       Platzierung mit `yBias: 0.32` selbst hingeschrieben — genau das „Handanlegen pro Effekt", vor dem
       der Kopf von effectZones.js warnt. Aufgefallen ist es erst, als die Vorschau das Brettformat bekam:
       der Boden hängt an der HÖHE, das Spielfeld-Bild darunter wird per `object-cover` beschnitten, und
       bei einer Formatänderung wandern beide unterschiedlich — das Würfelfeld schwebte über dem Horizont. */
    expect(srcUi("CustomizeScreen.jsx")).toContain("floorEffectPlacement()");
  });
});
