import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* #un-lang-liste — die Sprachliste im Willkommens-Dialog klappt NACH OBEN auf.

   Gemeldet: „wenn ich den Sprachreiter öffne, sehe ich die Leiste nicht komplett". Gemessen am
   26.08.2026 im laufenden Spiel, vier Sprachen (Liste 154 px hoch):

     375x812   Karte 188-624, Knopf bei 486 → nach unten fehlten 66 px
     1440x900  Karte 238-662, Knopf bei 485 → nach unten fehlten 28 px

   Die Ursache ist nicht die Liste, sondern die Karte: `.un-card` trägt `overflow-hidden`, und die
   Liste ist absolut positioniert — sie endet also an der Kartenkante. Der Schnitt ist NICHT
   dekorativ: gemessen hängt genau ein Kind daran, die 3 px hohe Haarlinie am oberen Rand, die keinen
   eigenen Radius hat und ohne den Schnitt an beiden oberen Ecken überstünde. Der Schnitt bleibt
   deshalb, und die Liste weicht ihm aus — nach oben, wo 297 px (Telefon) bzw. 247 px (Desktop) frei
   sind. Nach der Änderung gemessen: 137 px bzw. 91 px Luft, alle vier Sprachen sichtbar.

   Diese Datei hält die zwei Hälften der Begründung zusammen. Fällt die eine weg, ist die andere
   nicht mehr richtig — und wer sie anfasst, soll das lesen, bevor er sich wundert. */

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const modal = readFileSync(new URL("../src/ui/UsernameModal.jsx", import.meta.url), "utf8");

// Die Regel als Block, damit die Prüfungen nicht versehentlich woanders im Stylesheet fündig werden.
const regel = (css.match(/\.un-lang \.op-dd-list \{[\s\S]*?\n\}/) || [])[0] || "";

describe("#un-lang-liste — die Sprachliste bleibt sichtbar", () => {
  it("die Liste klappt nach oben auf, nicht nach unten", () => {
    expect(regel, ".un-lang .op-dd-list fehlt im Stylesheet").toBeTruthy();
    expect(regel).toMatch(/top:\s*auto/);
    expect(regel).toMatch(/bottom:\s*calc\(100% \+ 6px\)/);
  });

  it("die Höhe ist gedeckelt — die fünfte Sprache darf den Fehler nicht zurückbringen", () => {
    /* Ohne Deckel wäre die Regel nur eine Wette auf die heutige Listenlänge: vier Einträge passen
       nach oben, sieben nicht mehr. Mit Deckel scrollt die Liste in sich, statt wieder abzulaufen. */
    expect(regel).toMatch(/max-height:\s*min\(/);
    expect(regel).toMatch(/overflow-y:\s*auto/);
  });

  it("die Karte schneidet weiterhin ab — das ist die Voraussetzung der Regel", () => {
    /* Verschwindet `overflow-hidden` von der Karte, braucht die Liste nicht mehr auszuweichen und
       sollte wieder nach unten aufklappen (dort ist mehr Platz, und der Knopf bleibt sichtbar).
       Dann gehört diese Regel überprüft — deshalb hängt der Test daran. */
    expect(modal).toMatch(/className=\{`un-card[^`]*overflow-hidden/);
  });
});
