import { describe, it, expect, vi, afterEach } from "vitest";
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

/* Die zwei Geräte-Regler (`?hz=`, `?dpr=`) werden BEIM IMPORT einmal ausgewertet — bewusst, ein Listener je Effekt
   wäre teurer als der Nutzen. Genau das macht sie aber schwer prüfbar: das Modul muss mit gesetzter URL frisch
   geladen werden. Der Aufwand lohnt trotzdem, denn ein still nicht greifender Regler ist schlimmer als keiner —
   man misst dann am Gerät zwei Läufe, die in Wahrheit derselbe sind, und glaubt das Ergebnis. */
describe("mobileTier — Geräte-Regler", () => {
  const mitUrl = async (search) => {
    vi.resetModules();
    vi.stubGlobal("window", { location: { search }, devicePixelRatio: 3, matchMedia: () => ({ matches: true }) });
    const m = await import("../src/ui/fx/mobileTier.js");
    return m;
  };
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it("?dpr= überschreibt den Deckel in beide Richtungen", async () => {
    expect((await mitUrl("?dpr=1")).dprCap(true)).toBe(1);
    expect((await mitUrl("?dpr=2")).dprCap(true)).toBe(2);      // über dem Handy-Deckel von 1,4 — der Regler gewinnt
  });

  it("ohne Parameter bleibt es beim Deckel der Stufe", async () => {
    const m = await mitUrl("");
    expect(m.dprCap(true)).toBe(m.DPR_CAP_COARSE);
    expect(m.dprCap(false)).toBe(m.DPR_CAP_DESKTOP);
  });

  it("die Gerätedichte bleibt die Obergrenze — auch mit Regler", async () => {
    vi.resetModules();
    vi.stubGlobal("window", { location: { search: "?dpr=3" }, devicePixelRatio: 1.5, matchMedia: () => ({ matches: true }) });
    const m = await import("../src/ui/fx/mobileTier.js");
    expect(m.dprCap(true)).toBe(1.5);
  });

  it("Unsinn wird ignoriert statt den Effekt zu zerlegen", async () => {
    for (const v of ["?dpr=abc", "?dpr=0", "?dpr=-2", "?dpr=99"]) {
      expect((await mitUrl(v)).dprCap(true)).toBe(1.4);
    }
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

  /* #perf-mobile: Die Zeichenrate stand an fünf Stellen einzeln, bevor mobileTier sie eingesammelt hat — und genau
     so ist sie auch zurückgekommen: `PixiStage` setzte sie im Init aus `DRAW_HZ_COARSE`, im Parameter-Effekt zwei
     Zeilen weiter aber als LITERAL 30. Weil der Parameter-Effekt bei jedem Prop-Wechsel läuft, gewann das Literal,
     und `?hz=` blieb ausgerechnet an der Vollbild-Bühne wirkungslos. Ein Wächter auf „importiert mobileTier"
     hätte das nicht bemerkt: die Datei importierte es ja. Also auf das Muster prüfen. */
  for (const f of ["PixiStage.jsx", "HologridSlicePixi.jsx", "CardFxStage.jsx"]) {
    it(`${f} leitet JEDE maxFPS-Zuweisung aus DRAW_HZ_COARSE ab`, () => {
      const zuweisungen = [...src(f).matchAll(/maxFPS\s*=\s*([^;]+);/g)].map((m) => m[1]);
      expect(zuweisungen.length).toBeGreaterThan(0);   // sonst prüft der Test nichts mehr
      for (const z of zuweisungen) expect(z).toMatch(/DRAW_HZ_COARSE/);
      /* Bewusst NICHT „keine Literalzahl": `CardFxStage` deckelt Desktop-lite legitim auf eigene 40 fps
         (`isCoarse() ? DRAW_HZ_COARSE : (st.lite ? 40 : 0)`). Verboten ist nur, die MOBILE Rate an mobileTier
         vorbei zu setzen — und genau das erkennt man daran, dass die Zuweisung sie gar nicht erst liest. */
    });
  }

  /* #perf-aa: MSAA auf einer vollflächigen Pixi-Bühne kostet ein Full-Canvas-Resolve je Frame und glättet an
     vorgebackenen Weichtexturen nichts (gemessen für die Prunks, s. pixiGott.js). Die drei Bühnen unten standen
     trotzdem jahrelang auf `antialias: true` — nicht als Entscheidung, sondern aus der jeweils ersten Fassung
     mitgeschleppt. CardFxStage ist bewusst NICHT dabei: dort ist es am Gerätetyp gegated (`!isCoarse()`), Desktop
     behält sein MSAA. Wer hier `true` einträgt, braucht eine Messung dazu. */
  for (const f of ["PixiStage.jsx", "HologridSlicePixi.jsx", "FireHead.jsx", "FieldCompositor.jsx"]) {
    it(`${f} fordert kein MSAA an`, () => {
      expect(src(f)).not.toMatch(/antialias:\s*true/);
    });
  }

  it("PixiStage deckelt die Dichte am GERÄT, nicht nur an der Options-Stufe", () => {
    const s = src("PixiStage.jsx");
    // Beide Deckel müssen binden: `dprCap()` (Zeigertyp) UND die Options-Stufe. Hing hier nur `lite`, rendert ein
    // Handy auf „Effekte: aus" die vollflächige Emitter-Bühne in DPR 2 — doppelte Füllarbeit gegenüber dem
    // Feld-Kompositor daneben, der bei 1,4 liegt.
    expect(s).toMatch(/resolution:\s*Math\.min\(dprCap\(\)/);
    expect(s).not.toMatch(/lite \? 1\.4 : 2/);   // die alte, gerätelose Fassung
  });
});
