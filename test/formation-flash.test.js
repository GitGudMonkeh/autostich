/* AUFSTELLUNGSPHASE — Aufleuchten nach einem gewinnbringenden Tausch.

   Die Regel ist bewusst „Faktor JE POSITION gestiegen" und nicht „Gesamtsumme gestiegen": ein Tausch
   verschiebt Karten, und eine Karte, die nur ihren Platz gewechselt hat, soll nicht mitblitzen. Der
   Test hält beide Richtungen fest — was leuchtet UND was bewusst dunkel bleibt. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
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

/* #aufstell-ruhe (Owner 2026-09-08) — die Kacheln der AUFSTELLUNG tragen keinen Deck-Skin.

   Das Artwork ist das Bild EINER Karte; vierzigmal nebeneinander wird es zur unruhigen Fläche, und
   genau darüber liegen die Signale dieser Phase (Formationsrahmen, Segmentgrenzen, Architekten-Wash,
   Gletscher, Reife). Ohne Skin trägt die Kachel wieder die Farbe ihrer Karte.

   Der Wächter hängt an der Naht, nicht am Aussehen: `frontImage` ist der EINZIGE Weg, den Context zu
   überstimmen, und `undefined` (Prop weggeräumt) fiele still auf den Skin zurück — der Fehler wäre erst
   im laufenden Spiel zu sehen. Andere Grids (Rundenbühne, Chronik, Zielauswahl) sind nicht gemeint und
   werden hier auch nicht geprüft. */
describe("#aufstell-ruhe · kein Deck-Skin auf dem Aufstell-Brett", () => {
  const form = readFileSync(new URL("../src/ui/FormationPhase.jsx", import.meta.url), "utf8");

  it("die Aufstellung bestellt den Skin ausdrücklich ab", () => {
    expect(form, "CardGrid der Aufstellung übergibt frontImage nicht mehr als null").toMatch(/<CardGrid frontImage=\{null\}/);
  });

  it("und CardGrid lässt ein ausdrückliches null gewinnen (sonst wäre die Abbestellung wirkungslos)", () => {
    const grid = readFileSync(new URL("../src/ui/CardGrid.jsx", import.meta.url), "utf8");
    expect(grid).toMatch(/frontImage === undefined \? ctxFront : frontImage/);
  });
});
