import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { tintKey, tintedUrl, tintImage } from "../src/ui/deckTint.js";

/* #gegnerdeck-farbe — die Gegner-Phasendecks in der Deckfarbe.

   Zwei Sorten Prüfung, wie überall in dieser Suite getrennt gehalten:

   1. Der RÜCKFALL wird nachgerechnet. Das Einfärben braucht ein Canvas; ohne DOM (hier), ohne
      Deckfarbe oder bei einem kaputten Bild muss IMMER das Originalmotiv herauskommen. Ein Farbmodus
      darf nie dazu führen, dass gar keine Karte mehr da ist — das ist die einzige Zusage des Moduls,
      die man ohne Browser prüfen kann, und zugleich die wichtigste.

   2. Die VERDRAHTUNG als Quelltext-Ratsche über Battlefield.jsx (das Projekt hat kein
      Component-Test-Setup, s. test/fx-panel.test.js). Zwei Nähte fallen dort lautlos aus: nur die
      Rückseite einzufärben und den Rahmen zu vergessen, und die gebackene URL nicht an BEIDE
      Zeichenwege zu geben — DOM-Karte und Pixi-Textur (`backSrc`) lesen dieselbe Variable, genau
      damit sie nicht auseinanderlaufen können. */

const bf = readFileSync(new URL("../src/ui/Battlefield.jsx", import.meta.url), "utf8");

describe("#gegnerdeck-farbe — Rückfall", () => {
  it("der Schlüssel trägt Motiv UND beide Deckfarben", () => {
    // Ohne a2 im Schlüssel lieferte ein Deck mit gleicher Hauptfarbe, aber anderer Zweitfarbe das
    // Bild des vorigen aus dem Cache — der Verlauf ist zweifarbig, der Schlüssel muss es auch sein.
    expect(tintKey("a.webp", "#111111", "#222222")).not.toBe(tintKey("a.webp", "#111111", "#333333"));
    expect(tintKey("a.webp", "#111111", "#222222")).not.toBe(tintKey("b.webp", "#111111", "#222222"));
  });

  it("ohne gebackene Fassung meldet tintedUrl `null` — der Aufrufer zeigt so lange das Original", () => {
    expect(tintedUrl("nie-gebacken.webp", "#ff5a4d", "#ffab3a")).toBe(null);
    expect(tintedUrl("a.webp", null, null)).toBe(null);
  });

  it("ohne Deckfarbe und ohne DOM kommt das ORIGINAL zurück, nie leer", async () => {
    await expect(tintImage("orig.webp", null, null)).resolves.toBe("orig.webp");
    // In dieser Suite gibt es kein `document` → der Canvas-Weg fällt aus, das Motiv bleibt stehen.
    await expect(tintImage("orig.webp", "#ff5a4d", "#ffab3a")).resolves.toBe("orig.webp");
    await expect(tintImage(null, "#ff5a4d", "#ffab3a")).resolves.toBe(null);
  });
});

describe("#gegnerdeck-farbe — Verdrahtung", () => {
  it("Cover UND Rahmen werden eingefärbt, nicht nur das Cover", () => {
    expect(bf).toContain("tintImage(oppSkin.back, deckA1, deckA2)");
    expect(bf).toContain("tintImage(oppSkin.front, deckA1, deckA2)");
  });

  it("beide Zeichenwege lesen dieselbe Variable", () => {
    /* `oppBackImg` geht sowohl an die DOM-Karte (CardBack) als auch als Textur an den Pixi-Effekt
       (`backSrc`). Würde einer der beiden am Rohmotiv hängen, färbte sich das liegende Deck und die
       fliegende Karte nicht — der Fehler wäre nur in der Animation zu sehen und niemand sucht ihn dort. */
    expect(bf).toContain("const oppBackImg = (oppTint && oppTint.back) || oppSkin.back;");
    expect(bf).toContain("const oppFrontImg = (oppTint && oppTint.front) || oppSkin.front;");
    expect(bf).toContain("backSrc={oppBackImg}");
    expect(bf).toContain("backImage={oppBackImg}");
  });

  it("ohne Deckfarbe bleibt es bei den phasen-farbcodierten Motiven", () => {
    // Die Farbe der Gegner-Rückseite ist die Ansage, welche Auswahl die nächste Runde bringt. Ein Deck
    // ohne Farbpaar darf diese Ansage nicht gegen ein einfarbiges Grau tauschen.
    expect(bf).toContain("if (!deckA1) { setOppTint(null); return undefined; }");
  });
});
