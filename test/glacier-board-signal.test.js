import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* #eis-arch — Gletscher und Schnee müssen sich auf JEDEM Brett unterscheiden lassen.

   Der Befund, der dazu führte: auf dem Architekten trugen beide Zustände dasselbe Eis-Icon, eine
   Nummer kleiner und etwas blasser — auf einer Bau-Zelle ist das kein Unterschied, den jemand sieht.
   Die Aufstellungsphase trennt sie über die FLÄCHE, nicht über den Marker.

   Geprüft wird deshalb die BEZIEHUNG zwischen den beiden Brettern, nicht ein abgeschriebener Farbwert:
   der Schnee-Ton wird aus CardGrid.jsx GELESEN und muss im Architekten wieder auftauchen. Wer den Ton
   an einer Stelle nachzieht und an der anderen vergisst, macht den Test rot — und genau das Auseinander-
   laufen ist der Fehler, den es hier zu verhindern gibt (Quelltext-Ratsche: das Projekt hat kein
   Component-Test-Setup, s. test/fx-panel.test.js). */

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const cardGrid = src("ui/CardGrid.jsx");
const arch = src("ui/ArchitectScreen.jsx");

// Der Schnee-Wash der Aufstellungsphase — aus der Quelle gelesen, nicht hier hineingeschrieben.
const snowWash = (cardGrid.match(/firn \? "(#[0-9a-fA-F]{6,8})"/) || [])[1];
// Die Eis-Ebene der Architekt-Zelle, als Block ausgeschnitten.
const iceLayer = (arch.match(/\{\(isGlacier \|\| isFirn\) &&[\s\S]{0,400}?\)\}/) || [])[0];

describe("#eis-arch — die zwei Eis-Zustände am Architekt-Brett", () => {
  it("die Aufstellungsphase nennt einen Schnee-Ton, und der Architekt benutzt denselben", () => {
    expect(snowWash, "CardGrid.jsx führt den Schnee-Wash nicht mehr als `firn ? \"#…\"`").toBeTruthy();
    expect(iceLayer, "ArchitectScreen.jsx hat keine Eis-Ebene mehr").toBeTruthy();
    expect(iceLayer).toContain(snowWash);
  });

  it("Gletscher und Schnee tragen NICHT dieselbe Fläche — sonst ist die Ebene sinnlos", () => {
    /* Gegengeprüft, und beim ersten Anlauf FALSCH: „irgendwo zwei Töne in der Ebene" war grün, auch
       nachdem beide Zustände auf denselben Wash gelegt waren — der Gletscher-RAHMEN lieferte den
       zweiten Ton. Geprüft wird deshalb ausdrücklich die `background`-Angabe, denn sie ist die Fläche,
       an der man die zwei Zustände auseinanderhält. */
    const bg = (iceLayer.match(/background:[^,]*/) || [""])[0];
    const tones = [...bg.matchAll(/#[0-9a-fA-F]{6,8}/g)].map((m) => m[0]);
    expect(tones, `die Eis-Fläche nennt keine zwei Töne: ${bg}`).toHaveLength(2);
    expect(new Set(tones).size, `Gletscher und Schnee sähen gleich aus: ${tones.join(", ")}`).toBe(2);
    expect(tones, "der Schnee-Ton der Aufstellungsphase fehlt in der Fläche").toContain(snowWash);
  });

  it("der Gletscher-Rahmen ist nicht der Inspiziert-Rahmen", () => {
    /* Cyan ist auf diesem Bildschirm schon vergeben: `isInspected` malt das inspizierte Gebäude mit
       `inset 0 0 0 2px #5ec8f0` plus kräftigem Außenschein. Nähme der Gletscher dieselbe Fassung,
       hieße „inspiziert" und „Gletscher" dasselbe — ein schlimmerer Fehler als der behobene. */
    expect(arch, "der Inspiziert-Rahmen ist weg — dann gehört dieser Wächter überprüft")
      .toContain("inset 0 0 0 2px #5ec8f0");
    expect(iceLayer).not.toContain("inset 0 0 0 2px #5ec8f0");
  });
});
