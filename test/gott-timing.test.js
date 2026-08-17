import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { GOTT_BASE_S, GOTT_INGAME_S, gottSpeedFor } from "../src/ui/fx/gottTiming.js";
import { SUPERNOVA_LIFE, SUPERNOVA_TAIL } from "../src/ui/fx/supernovaTiming.js";

/* QUELLTEXT-RATSCHE (Muster wie test/trick-breakdown.test.js). Die TUNE-Blöcke der Prunk-Effekte lassen sich nicht
   importieren, ohne Pixi in den Test (und in den Haupt-Bundle) zu ziehen — genau darum existieren gottTiming.js und
   supernovaTiming.js überhaupt. Die Basiszeiten stehen damit zwangsläufig an zwei Orten. Dieser Test liest die
   Effektdateien als TEXT und rechnet nach, dass gottTiming.js noch stimmt. Wer an einem TUNE dreht, wird hier rot. */
const src = (f) => readFileSync(new URL(`../src/ui/fx/${f}`, import.meta.url), "utf8");
// Zahl aus dem TUNE-Block holen (nur dort suchen, damit ein gleichnamiger Wert außerhalb nicht mitzählt).
function tune(file, key) {
  const block = src(file).match(/const TUNE = \{[\s\S]*?\n\};/);
  expect(block, `TUNE-Block in ${file}`).toBeTruthy();
  const m = block[0].match(new RegExp(`\\b${key}:\\s*([0-9.]+)`));
  expect(m, `${key} in ${file}`).toBeTruthy();
  return Number(m[1]);
}

describe("Gottgleich-Prunk — Zeitachse (gottTiming.js)", () => {
  it("die Basiszeiten decken sich mit LIFE/TAIL der Effektdateien", () => {
    expect(GOTT_BASE_S.sonnenPuls).toBeCloseTo(tune("SonnenPulsPixi.jsx", "LIFE") + tune("SonnenPulsPixi.jsx", "TAIL"), 6);
    expect(GOTT_BASE_S.laserFaecher).toBeCloseTo(tune("LaserFaecherPixi.jsx", "LIFE") + tune("LaserFaecherPixi.jsx", "TAIL"), 6);
    expect(GOTT_BASE_S.holoCube).toBeCloseTo(tune("HoloCubePixi.jsx", "LIFE") + tune("HoloCubePixi.jsx", "TAIL"), 6);
    // Prisma staffelt seine Wellen → Gesamtdauer = (WAVES−1)·STAGGER + LIFE (+ TAIL), wie im Effekt selbst gerechnet.
    const pw = tune("PrismaKaskadePixi.jsx", "WAVES"), pst = tune("PrismaKaskadePixi.jsx", "STAGGER");
    expect(GOTT_BASE_S.prismaKaskade).toBeCloseTo((pw - 1) * pst + tune("PrismaKaskadePixi.jsx", "LIFE") + tune("PrismaKaskadePixi.jsx", "TAIL"), 6);
    // Supernova hat seine Zeiten schon exportiert (supernovaTiming.js) → direkt vergleichen, kein Textlesen nötig.
    expect(GOTT_BASE_S.supernova).toBeCloseTo(SUPERNOVA_LIFE + SUPERNOVA_TAIL, 6);
  });

  it("alle Prunks spielen in-game gleich lang (das war der Punkt)", () => {
    for (const key of Object.keys(GOTT_BASE_S)) {
      expect(GOTT_BASE_S[key] / gottSpeedFor(key)).toBeCloseTo(GOTT_INGAME_S, 6);
    }
  });

  it("Tempo ist nie schneller als die Eigenzeit und unbekannte Effekte laufen normal", () => {
    for (const key of Object.keys(GOTT_BASE_S)) expect(gottSpeedFor(key)).toBeLessThanOrEqual(1);
    expect(gottSpeedFor("gottStandard")).toBe(1); // synthetisch, kein Pixi-Prunk
    expect(gottSpeedFor(undefined)).toBe(1);
  });

  it("Battlefield reicht das Tempo an ALLE fünf Prunks — und an den Supernova-Swell", () => {
    const bf = readFileSync(new URL("../src/ui/Battlefield.jsx", import.meta.url), "utf8");
    for (const [comp, key] of [["SonnenPulsPixi", "sonnenPuls"], ["LaserFaecherPixi", "laserFaecher"],
      ["PrismaKaskadePixi", "prismaKaskade"], ["HoloCubePixi", "holoCube"], ["SupernovaPixi", "supernova"]]) {
      const m = bf.match(new RegExp(`<${comp}[\\s\\S]{0,400}?/>`));
      expect(m, `${comp} gemountet`).toBeTruthy();
      expect(m[0], `${comp} bekommt speed`).toContain(`gottSpeedFor("${key}")`);
    }
    // Der Supernova-Swell muss MIT dem gestreckten Tempo rechnen, sonst sitzt sein Impuls wieder vor dem Blitz.
    expect(bf).toContain('supernovaSwellDelay(gottSpeedFor("supernova"))');
  });
});
