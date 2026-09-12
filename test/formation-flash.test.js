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

/* #aufstell-ruhe (Owner 2026-09-08, erweitert) — das KARTENGITTER trägt keinen Deck-Skin, nirgends.

   Das Artwork ist das Bild EINER Karte; vierzigmal nebeneinander wird es zur unruhigen Fläche, und genau
   darüber liegen die Signale dieser Ansichten (Formationsrahmen, Segmentgrenzen, Architekten-Wash,
   Gletscher, Reife). Ohne Skin trägt die Kachel wieder die Farbe ihrer Karte.

   Zuerst galt das nur für die Aufstellung, und der Wächter prüfte die Abbestellung an DIESER Aufrufstelle.
   Auf Owner-Ansage gilt es überall (Chronik, Skill-/Perk-Ansichten, Zielwahl, GameOver) — damit ist nicht
   mehr die Abbestellung die Naht, sondern das Fehlen der Zutat: kein Bildlayer im Kachel-Hintergrund und
   kein Weg, doch einen hereinzureichen. Das ist schärfer als vorher, nicht weicher — eine neue Aufrufstelle
   kann den Skin jetzt gar nicht mehr versehentlich mitbringen.

   Die Rundenbühne bleibt ausdrücklich außen vor: dort IST eine Karte eine Karte (Card.jsx), und der Test
   hält fest, dass sie ihre Front behält — sonst wäre die Deck-Werkstatt beim Aufräumen mit abgeräumt. */
describe("#aufstell-ruhe · kein Deck-Skin im Kartengitter", () => {
  const grid = readFileSync(new URL("../src/ui/CardGrid.jsx", import.meta.url), "utf8");

  it("die Kachel hat keinen Bild-Layer im Hintergrund", () => {
    const bg = grid.match(/const tileBg = \[[\s\S]*?\]\.filter\(Boolean\)\.join\(", "\);/);
    expect(bg, "tileBg nicht gefunden — der Wächter zeigt ins Leere").toBeTruthy();
    expect(bg[0], "der Kachel-Hintergrund malt wieder ein Bild").not.toMatch(/url\(/);
  });

  it("und es gibt keinen Weg mehr, eine Deck-Front hereinzureichen", () => {
    // Weder Prop noch Context: beides war die Fädelung, die den Skin ins Gitter trug.
    expect(grid, "CardGrid nimmt wieder eine Deck-Front entgegen").not.toMatch(/frontImage\s*[=}),]/);
    expect(grid, "der Deck-Front-Context ist zurück").not.toMatch(/DeckFrontContext/);
    const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
    expect(app, "App reicht wieder eine Deck-Front ans Gitter").not.toMatch(/DeckFrontContext/);
  });

  it("die SPIELKARTEN der Rundenbühne behalten ihre Front — nur das Gitter ist gemeint", () => {
    const card = readFileSync(new URL("../src/ui/Card.jsx", import.meta.url), "utf8");
    expect(card, "Card.jsx zeichnet die Deck-Front nicht mehr").toMatch(/url\(\$\{frontImage\}\)/);
  });
});
