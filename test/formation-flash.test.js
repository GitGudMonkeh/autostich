/* AUFSTELLUNGSPHASE — Aufleuchten nach einem gewinnbringenden Tausch.

   Die Regel ist bewusst „Faktor JE POSITION gestiegen" und nicht „Gesamtsumme gestiegen": ein Tausch
   verschiebt Karten, und eine Karte, die nur ihren Platz gewechselt hat, soll nicht mitblitzen. Der
   Test hält beide Richtungen fest — was leuchtet UND was bewusst dunkel bleibt. */
import { describe, it, expect } from "vitest";
import { gainedPositions } from "../src/ui/FormationPhase.jsx";

describe("Formations-Aufleuchten · welche Karten blitzen", () => {
  it("nur Positionen, deren Faktor gestiegen ist", () => {
    const prev = [1, 1, 1.25, 1.5, 1];
    const cur  = [1, 1.4, 1.25, 1.2, 1];
    expect([...gainedPositions(prev, cur)]).toEqual([1]);   // 3 ist GEFALLEN, 2 unverändert
  });

  it("eine neu entstandene Formation leuchtet auf allen beteiligten Karten", () => {
    const prev = [1, 1, 1, 1, 1];
    const cur  = [1, 1.25, 1.25, 1.25, 1];
    expect([...gainedPositions(prev, cur)]).toEqual([1, 2, 3]);
  });

  it("ein Tausch ohne Gewinn lässt alles dunkel", () => {
    expect(gainedPositions([1, 1.5, 1], [1, 1.5, 1]).size).toBe(0);
    expect(gainedPositions([1, 1.5, 1], [1, 1.2, 1]).size).toBe(0);  // schwächer → kein Blitz
  });

  it("Fließkomma-Rauschen löst nichts aus", () => {
    // Faktoren entstehen aus Produkten; 1,25 × 1,2 trifft 1,5 nicht exakt.
    const a = 1.25 * 1.2, b = 1.5;
    expect(Math.abs(a - b)).toBeLessThan(0.001);
    expect(gainedPositions([b], [a]).size).toBe(0);
  });

  it("unterschiedliche Längen (Phasenwechsel) geben nichts zurück, statt zu raten", () => {
    expect(gainedPositions([1, 1], [1, 1, 1]).size).toBe(0);
    expect(gainedPositions(null, [1, 1]).size).toBe(0);
    expect(gainedPositions([1, 1], null).size).toBe(0);
  });
});
