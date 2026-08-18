/* #fx-flaeche + #fx-dichte + #fx-grace — drei Nähte des Effekte-Reiters (18.08.2026).
   -------------------------------------------------------------------------------------------------
   Aufgeteilt wie bei #vorschau-brett: was sich RECHNEN lässt, wird nachgerechnet (feldMassstab ist rein,
   ohne React und ohne Canvas), der Rest ist Quelltext-Ratsche. Alle drei Nähte gehen lautlos kaputt —
   eine zurückgedrehte Zeile ergibt kein rotes Bild, sondern nur ein wieder zu kleines Feld, ein wieder
   zu dichtes Feld oder einen Effekt, der beim Antippen sofort losknallt. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FELD_FUELLUNG, feldBasisBreite, feldMassstab } from "../src/ui/fx/CubeMatrixField.jsx";

const src = (p) => readFileSync(new URL(`../src/ui/${p}`, import.meta.url), "utf8");
const fx = src("fx/CubeMatrixField.jsx");
const cz = src("CustomizeScreen.jsx");

describe("#fx-flaeche — der Maßstab, nachgerechnet", () => {
  it("das Feld füllt auf jeder Desktop-Breite denselben Anteil", () => {
    // Das ist die ganze Aussage der Änderung: vorher waren es überall dieselben 437 px (gemessen
    // 35 % / 42 % / 51 % / 65 % je nach Rahmen), jetzt ist der ANTEIL die Konstante.
    for (const w of [668, 860, 1045, 1244, 1600]) {
      const anteil = feldMassstab(w) * feldBasisBreite() / w;
      expect(anteil, `Bühnenbreite ${w}`).toBeCloseTo(FELD_FUELLUNG, 6);
    }
  });

  it("der Maßstab vergrößert nur — das Handy bleibt unangetastet", () => {
    // Gemessene Breiten am Handy: Brett 358 px, Werkstatt-Vorschau 324 px. Beide liegen unter der
    // Schwelle, ab der die Regel überhaupt greift; dort war das Feld schon randvoll (122 %).
    const schwelle = feldBasisBreite() / FELD_FUELLUNG;
    expect(schwelle).toBeGreaterThan(400);
    for (const w of [324, 358, 500, schwelle - 1]) expect(feldMassstab(w), `Breite ${w}`).toBe(1);
    expect(feldMassstab(schwelle + 1)).toBeGreaterThan(1);
  });

  it("unbrauchbare Messwerte fallen auf 1:1 zurück statt die Szene zu zerlegen", () => {
    for (const kaputt of [0, -5, NaN, null, undefined, "breit"]) expect(feldMassstab(kaputt)).toBe(1);
  });

  it("die Basisbreite ist aus der Projektion abgeleitet, nicht abgetippt", () => {
    // Sonst liefe sie beim nächsten Dreh an D_SPREAD/D_PERSP/C_SIZE aus dem Tritt.
    expect(fx).toMatch(/feldBasisBreite\s*=\s*\(\)\s*=>\s*\n?\s*2 \* TUNE\.D_PERSP \* \(TUNE\.D_SPREAD \+ TUNE\.C_SIZE\)/);
    expect(feldBasisBreite()).toBeGreaterThan(300);
  });
});

describe("#fx-flaeche — die Verdrahtung", () => {
  it("der Maßstab geht in die Brennweite UND in den Front-Offset", () => {
    // Beide gehören zu DERSELBEN Projektion. Skaliert man nur die Brennweite, wächst das Feld, aber
    // die vorderste Bodenreihe rutscht unter den Rahmen — der Boden ist dann nicht mehr bündig.
    expect(fx).toMatch(/const proj = \([^)]*\) => \{ const d = z \+ 3\.2, f = TUNE\.D_PERSP \* SC,/);
    expect(fx).toMatch(/p\.floorBottom \* H - NEAR_DY_1 \* SC/);
  });

  it("gemessen wird die Bühnenbreite, einmal je resize", () => {
    // Nicht je Frame: `resize()` läuft am Mount und am ResizeObserver, die Zeichenschleife nicht.
    const rs = fx.slice(fx.indexOf("function resize()"), fx.indexOf("const NEAR_DY_1"));
    expect(rs).toMatch(/SC = feldMassstab\(W\)/);
  });
});

describe("#fx-dichte — halb so viele Würfel", () => {
  it("Desktop steht auf 13 × 4 = 52 (war 18 × 6 = 108)", () => {
    expect(fx).toMatch(/C_COLS:\s*13,\s*C_ROWS:\s*4,/);
  });

  it("die lite-Werte stehen ausgeschrieben daneben, nicht als Abzug", () => {
    // Der alte Abzug (`C - 6` / `R - 2`) ergäbe mit den neuen Desktop-Zahlen 7 × 2 = 14 Würfel —
    // das Handy sollte aber ausdrücklich unangetastet bleiben (12 × 4 = 48).
    expect(fx).toMatch(/C_COLS_LITE:\s*12,\s*C_ROWS_LITE:\s*4/);
    expect(fx).toMatch(/const C = liteOn\(\) \? TUNE\.C_COLS_LITE : TUNE\.C_COLS, R = liteOn\(\) \? TUNE\.C_ROWS_LITE : TUNE\.C_ROWS/);
    expect(fx, "kein Rest des alten Abzugs").not.toMatch(/TUNE\.C_COLS\)\s*-\s*\(liteOn\(\)/);
  });
});

describe("#fx-grace — eine Sekunde Ruhe nach dem Klick", () => {
  // Die Szenen mit echtem Abspiel-Moment. Genau diese sechs, und keine weitere: die Hintergrund-
  // Effekte und die Karten-Animationen sollen weiter sofort laufen (Entscheidung des Users).
  const MIT = ["FinisherScene", "ScorchScene", "HologridScene", "BlackholeScene", "GottScene", "StandardFinisherScene"];
  const OHNE = ["CubeMatrixPreview", "FieldFxPreview", "CardAnimPreview", "SpezialScene"];
  const koerper = (name) => {
    const von = cz.indexOf(`function ${name}(`);
    expect(von, `${name} gibt es nicht mehr`).toBeGreaterThan(-1);
    const naechste = cz.indexOf("\nfunction ", von + 1);
    return cz.slice(von, naechste < 0 ? cz.length : naechste);
  };

  it("dauert eine Sekunde und hängt am Mount der Szene, nicht an einem Prop", () => {
    // Der Szenenwechsel IST der Remount (key={fx.key}) — ein Prop wäre beim Farbmodus-Toggle
    // fälschlich noch einmal angesprungen, denn der remountet bewusst NICHT (#perf-shop).
    expect(cz).toMatch(/FX_GRACE_MS = 1000/);
    expect(cz).toMatch(/function useGrace\(ms = FX_GRACE_MS\) \{[\s\S]*?setTimeout\(\(\) => setBereit\(true\), ms\)/);
  });

  it("die sechs Abspiel-Szenen halten ihren Effekt zurück", () => {
    for (const name of MIT) {
      const k = koerper(name);
      expect(k, `${name} muss useGrace() aufrufen`).toMatch(/const bereit = useGrace\(\)/);
      expect(k, `${name} muss den Effekt AN bereit hängen — sonst ist der Halt folgenlos`).toMatch(/\bbereit\b[\s\S]*\bbereit\b/);
    }
  });

  it("die Dauer-Effekte laufen weiter sofort an", () => {
    for (const name of OHNE) expect(koerper(name), `${name} soll KEINE Grace haben`).not.toContain("useGrace(");
  });

  it("auch der Ton wartet — nicht nur das Bild", () => {
    // Der Knall war der eigentliche Anlass: beim Durchtippen der Liste feuerte jede Zeile sofort
    // ihren Sound. Ein Halt, der nur das Bild zurückhält, hätte das Problem nicht angefasst.
    const gott = koerper("GottScene");
    expect(gott).toMatch(/\{Fx && bereit &&/);          // Prunk-Fx (ruft onFire → audio.play)
    expect(gott).toMatch(/\{bereit && <GottChromeWord/); // Ansage
    expect(koerper("BlackholeScene")).toMatch(/if \(!bereit\) return undefined;[\s\S]*audio\.loop\("fx_blackhole"/);
  });
});
