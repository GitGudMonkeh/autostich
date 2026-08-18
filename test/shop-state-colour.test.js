import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* #deckui-status — Zustand darf nicht wieder in der Deckfarbe stecken.

   Der Aktionsknopf der Deck-Werkstatt trug im Aus-Zustand `var(--deck-a1)`. Bei einem grünen Deck sah
   „Als Hintergrund wählen" damit fast genauso aus wie die grüne Bestätigung „Ausgewählt" — zwei
   gegensätzliche Zustände in derselben Farbe. Der Fehler ist von der Sorte, die nur bei bestimmten Decks
   auffällt und beim Lesen des Codes plausibel wirkt („Angebot in Deckfarbe" klingt ja richtig).

   Deshalb hier festgehalten: Zustand kommt aus EINEM Paar (STATE_ON/STATE_OFF), und keiner der
   Zustands-Knöpfe zieht die Deckfarbe. Die Deckfarbe bleibt für Reiter, Punkte und Umschalter — dort
   sagt sie nichts über an/aus.

   Quelltext-Ratsche statt Import: CustomizeScreen.jsx zieht Battlefield, Bild-Assets und die lazy
   Pixi-Wrapper mit — in der Node-Testumgebung nicht ladbar. Dasselbe Muster wie gott-timing.test.js. */

const SRC = readFileSync(new URL("../src/ui/CustomizeScreen.jsx", import.meta.url), "utf8");
const zeile = (muster) => SRC.split("\n").find((l) => l.includes(muster));

describe("Deck-Werkstatt · Zustandsfarben", () => {
  it("es gibt genau ein Paar, und es ist grün/rot", () => {
    const on = SRC.match(/export const STATE_ON = "(#[0-9a-f]{6})"/i);
    const off = SRC.match(/export const STATE_OFF = "(#[0-9a-f]{6})"/i);
    expect(on, "STATE_ON fehlt").toBeTruthy();
    expect(off, "STATE_OFF fehlt").toBeTruthy();
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [gr, gg] = rgb(on[1]);
    const [rr, rg, rb] = rgb(off[1]);
    expect(gg, "STATE_ON ist nicht grün-dominant").toBeGreaterThan(gr);
    expect(rr, "STATE_OFF ist nicht rot-dominant").toBeGreaterThan(rg);
    expect(rr).toBeGreaterThan(rb);
  });

  it("der Aktions-Helfer der Effekt-Bühne schaltet zwischen genau diesen beiden", () => {
    // `act(on)` ist die EINE Naht: alle acht Aufrufstellen (Hintergrund, Finisher, Prunk, Anim,
    // Leuchten, „Kein Effekt" …) spreizen sie in ihren Knopf.
    const l = zeile("const act = (on) =>");
    expect(l, "der act-Helfer ist weg oder umbenannt").toBeTruthy();
    expect(l).toContain("STATE_ON");
    expect(l).toContain("STATE_OFF");
    expect(l, "Zustand darf nicht an der Deckfarbe hängen").not.toContain("--deck-a1");
  });

  it("die Deck-Auswahl benutzt dasselbe Paar — beide Fassungen, normal und Stufen-Deck", () => {
    const normal = zeile('t("shop.activate")');
    const tiered = zeile('t("shop.tier.activate"');
    expect(normal, "Ausrüsten-Knopf nicht gefunden").toBeTruthy();
    expect(tiered, "Stufen-Ausrüsten-Knopf nicht gefunden").toBeTruthy();
    for (const [name, l] of [["Ausrüsten", normal], ["Stufe ausrüsten", tiered]]) {
      expect(l, `${name}: nicht auf STATE_OFF`).toContain("STATE_OFF");
      expect(l, `${name}: hängt noch an der Deckfarbe`).not.toContain("--deck-a1");
    }
  });

  it("kein Zustands-Signal trägt mehr eine eigene Grün-Nuance", () => {
    // Vorher stand #54e08a siebenmal einzeln da (Bühne, Chip, Kachel, Status-Punkt …). Eine achte
    // Kopie wäre die Stelle, die beim nächsten Nachjustieren zurückbleibt.
    const roh = [...SRC.matchAll(/#54e08a/gi)];
    expect(roh.length, "rohes #54e08a außerhalb der STATE_ON-Definition").toBe(1);
    expect(zeile("export const STATE_ON")).toContain("#54e08a");
  });
});
