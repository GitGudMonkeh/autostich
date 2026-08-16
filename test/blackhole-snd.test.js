/* SCHWARZES LOCH — Pegel des Loop-Betts aus Lochgröße UND Vorbeben.

   Der eigentliche Fallstrick sitzt nicht in der Formel, sondern in ihrer Existenz: vorher rief jeder
   Callback direkt `setLoopGain`, also überschrieb der Größen-Callback den Vorbeben-Callback und
   umgekehrt. Genau deshalb rechnet EINE reine Funktion aus BEIDEN Eingängen — und genau das prüft
   dieser Test: dass der Shudder den Fill nicht verdrängt und umgekehrt. */
import { describe, it, expect } from "vitest";
import { holeSound, HOLE_SND } from "../src/ui/blackholeSnd.js";

describe("Schwarzes Loch · Bett-Pegel", () => {
  it("ohne alles = Grundpegel (derselbe, mit dem der Loop startet)", () => {
    expect(holeSound(0, 0)).toEqual({ gain: HOLE_SND.gain0, rate: HOLE_SND.rate0 });
  });

  it("wächst mit der Lochgröße", () => {
    expect(holeSound(1, 0).gain).toBeCloseTo(HOLE_SND.gain0 + HOLE_SND.gainFill, 6);
    expect(holeSound(0.5, 0).gain).toBeGreaterThan(holeSound(0, 0).gain);
    expect(holeSound(1, 0).rate).toBeGreaterThan(holeSound(0, 0).rate);
  });

  it("das Vorbeben hebt ZUSÄTZLICH an — es ersetzt die Größe nicht", () => {
    const voll = holeSound(1, 0);
    const vollBebend = holeSound(1, 1);
    expect(vollBebend.gain).toBeGreaterThan(voll.gain);
    expect(vollBebend.gain).toBeCloseTo(HOLE_SND.gain0 + HOLE_SND.gainFill + HOLE_SND.gainShudder, 6);
    // Und ein Beben bei kleinem Loch bleibt leiser als ein volles Loch ohne Beben.
    expect(holeSound(0, 1).gain).toBeLessThan(voll.gain);
  });

  it("setzt weich ein (quadratisch, wie die sichtbare Zuck-Amplitude)", () => {
    const halb = holeSound(1, 0.5).gain - holeSound(1, 0).gain;
    const ganz = holeSound(1, 1).gain - holeSound(1, 0).gain;
    expect(halb).toBeCloseTo(ganz * 0.25, 6);   // 0,5² = ¼, nicht ½
  });

  it("bleibt dezent: der Aufschlag ist kleiner als der Größen-Anteil", () => {
    expect(HOLE_SND.gainShudder).toBeLessThan(HOLE_SND.gainFill);
    expect(holeSound(1, 1).gain).toBeLessThanOrEqual(1.15);
  });

  it("klemmt Ausreißer, statt den Pegel zu sprengen", () => {
    expect(holeSound(9, 9)).toEqual(holeSound(1, 1));
    expect(holeSound(-3, -3)).toEqual(holeSound(0, 0));
    expect(holeSound(undefined, null)).toEqual(holeSound(0, 0));
  });
});
