/* SUPERNOVA — der Swell-Impuls muss auf dem Detonationsblitz sitzen, in BEIDEN Ansichten.

   Der Playtest-Befund war nicht „die Zahl ist falsch", sondern „Showcase und Spiel lösen den Ton
   völlig verschieden aus": der Showcase beim Effekt-Start ohne Vorlauf (bei 5,5-fach gestrecktem
   Effekt), das Spiel an der epischen Ansage mit handgetuntem Vorlauf. Nachtunen der einen Zahl
   änderte an der anderen Stelle nichts — man tunt gegen ein Phantom.

   Deshalb prüft dieser Test nicht einen Wert, sondern die GLEICHHEIT der Regel über die Tempi. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { supernovaDetonationS, supernovaSwellDelay, SUPERNOVA_IMPACT_S,
  SUPERNOVA_LIFE, SUPERNOVA_CHARGE } from "../src/ui/fx/supernovaTiming.js";

const SHOWCASE_SPEED = 0.18;

describe("Supernova · Ton auf dem Blitz", () => {
  it("der Blitz kommt bei Tempo 1 nach LIFE·CHARGE", () => {
    expect(supernovaDetonationS(1)).toBeCloseTo(SUPERNOVA_LIFE * SUPERNOVA_CHARGE, 6);
  });

  it("langsameres Showcase-Tempo streckt den Blitz genau um den Faktor", () => {
    expect(supernovaDetonationS(SHOWCASE_SPEED)).toBeCloseTo(supernovaDetonationS(1) / SHOWCASE_SPEED, 6);
    // Konkret: ~0,3 s in-game, ~1,7 s im Showcase — der Grund, warum EINE feste Zahl nie beides trifft.
    expect(supernovaDetonationS(SHOWCASE_SPEED)).toBeGreaterThan(supernovaDetonationS(1) * 5);
  });

  it("der Vorlauf legt den Impuls auf den Blitz — solange der Vorlauf dafür reicht", () => {
    for (const speed of [1, SHOWCASE_SPEED, 0.5, 2]) {
      const delay = supernovaSwellDelay(speed);
      const treffer = delay + SUPERNOVA_IMPACT_S;
      const blitz = supernovaDetonationS(speed);
      if (delay > 0) expect(treffer, `Tempo ${speed} trifft den Blitz nicht`).toBeCloseTo(blitz, 6);
      /* Vorlauf am Boden: der Blitz kommt früher, als der Ton seinen Impuls liefern kann (in-game sind
         es nur ~0,3 s bis zur Detonation). Dann ist „so früh wie möglich" das Beste, was geht — der
         Impuls sitzt zwangsläufig NACH dem Blitz. Kein Fehler, aber die Grenze des Zahlendrehens:
         weiter nach vorn ginge nur, wenn der Ton vor der Ansage ausgelöst würde. */
      else expect(treffer, `Tempo ${speed}: Impuls müsste vor dem Blitz liegen`).toBeGreaterThanOrEqual(blitz);
    }
  });

  it("die Grenze ist bekannt: ab Impuls-Offset ≥ Blitzzeit wirkt Nachdrehen nur noch im Showcase", () => {
    const blitzIngame = supernovaDetonationS(1);
    if (SUPERNOVA_IMPACT_S >= blitzIngame) {
      expect(supernovaSwellDelay(1)).toBe(0);                       // in-game am Boden …
      expect(supernovaSwellDelay(SHOWCASE_SPEED)).toBeGreaterThan(0); // … im Showcase bleibt Luft
    }
  });

  it("kein negativer Vorlauf — in die Vergangenheit lässt sich nichts planen", () => {
    // Sähe der Impuls sehr spät in der Datei, wäre die Rechnung negativ; dann startet der Ton sofort.
    expect(supernovaSwellDelay(1)).toBeGreaterThanOrEqual(0);
    expect(supernovaSwellDelay(1000)).toBe(Math.max(0, supernovaDetonationS(1000) - SUPERNOVA_IMPACT_S));
  });

  it("unsinniges Tempo sprengt die Rechnung nicht", () => {
    expect(Number.isFinite(supernovaDetonationS(0))).toBe(true);
    expect(Number.isFinite(supernovaDetonationS(-5))).toBe(true);
    expect(supernovaDetonationS(undefined)).toBeCloseTo(supernovaDetonationS(1), 6);
  });

  it("beide Aufrufer rechnen, statt eine Zahl abzutippen", () => {
    const bf = readFileSync(new URL("../src/ui/Battlefield.jsx", import.meta.url), "utf8");
    const cs = readFileSync(new URL("../src/ui/CustomizeScreen.jsx", import.meta.url), "utf8");
    expect(bf).toMatch(/delay:\s*supernovaSwellDelay\(/);
    expect(cs).toMatch(/sfxDelay=\{supernovaSwellDelay\(/);
    // Das Showcase-Tempo darf nicht zweimal dastehen (Effekt vs. Ton) — sonst driften sie wieder.
    expect(cs).toMatch(/SUPERNOVA_SHOWCASE_SPEED/);
    expect((cs.match(/speed=\{0\.18\}/g) || [])).toHaveLength(0);
  });

  it("SupernovaPixi und die Ton-Rechnung teilen die Zeitachse", () => {
    const fx = readFileSync(new URL("../src/ui/fx/SupernovaPixi.jsx", import.meta.url), "utf8");
    expect(fx).toMatch(/LIFE:\s*SUPERNOVA_LIFE/);
    expect(fx).toMatch(/CHARGE:\s*SUPERNOVA_CHARGE/);
  });
});
