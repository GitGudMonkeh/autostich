import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* Ratsche für die gemeinsame Aktionsleiste (src/ui/modalStyle.jsx).

   Die Buttons tragen `whitespace-nowrap`, ihre Mindestbreite ist also die volle Textbreite — und Flex-Kinder
   schrumpfen per Default nicht unter min-content. Ohne `flex-wrap` passten „↻ Neu würfeln (1)" und
   „Keinen Legendär — Skill wählen" auf einem 412-px-Handy nicht mehr nebeneinander (gemessen: 405 px Inhalt
   in einer 378 px breiten Karte). Weil die Panel-Karten `overflow-y-auto` haben, wird ihr overflow-x nach
   CSS-Regel automatisch zu `auto`: der zweite Button war am Kartenrand ABGESCHNITTEN und die Karte plötzlich
   horizontal scrollbar. Auf Desktop bleibt alles in einer Zeile — `flex-wrap` ist dort ein No-op.

   Das ist die Art Klasse, die beim Aufräumen still wieder verschwindet („zwei Buttons, das passt doch"),
   und der Schaden zeigt sich nur auf schmalen Geräten. Deshalb hier festgenagelt.

   Es gibt keine DOM-Testumgebung (vitest läuft `environment: "node"`), also prüft das den Quelltext. */

const src = readFileSync(new URL("../src/ui/modalStyle.jsx", import.meta.url), "utf8");

describe("ActionBar · Aktionsleiste bricht auf schmalen Geräten um", () => {
  it("die Leiste ist ein umbrechender Flex-Container", () => {
    const bar = src.match(/export function ActionBar[\s\S]*?<div className=\{`([^`]+)`\}/);
    expect(bar, "ActionBar-Container nicht gefunden — Test an den Umbau anpassen").toBeTruthy();
    expect(bar[1], "ohne flex-wrap wird der zweite Button auf dem Handy abgeschnitten").toMatch(/\bflex-wrap\b/);
  });

  it("die Buttons behalten ihre einzeilige Beschriftung", () => {
    // Gegenprobe: der Umbruch ersetzt das Umbrechen INNERHALB eines Buttons, nicht umgekehrt.
    expect(src).toMatch(/ACTIONBTN_BASE = "[^"]*whitespace-nowrap/);
  });
});
