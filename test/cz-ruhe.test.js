import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================
   #cz-ruhe (19.08.2026) — ruhigere Deck-Werkstatt ab 1400 px, als Quelltext-Ratsche.

   Vier Griffe, die alle still zurückfallen können, weil der Screen danach weiter „richtig" aussieht:
   ein wieder laufender Ring, wieder gerahmte Reiter, ein wieder vollbreiter Aktionsknopf und ein
   wieder enges Raster. Und einer, der noch stiller kippt: die KLAMMER der Bühnen-Fußzeile — ohne
   `display: contents` unterhalb 1400 px bekäme die Handy-Fassung eine zusätzliche Box.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("src/index.css");
const jsx = read("src/ui/CustomizeScreen.jsx");
const deskBlock = (() => {
  const at = css.indexOf("@media (min-width: 1400px) {");
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return "";
})();

describe("#cz-ruhe — der Ring steht still", () => {
  it("alle vier Werkstatt-Panels tragen den Modifikator", () => {
    for (const k of ["cz-main", "cz-side", "cz-stage", "cz-fxside"])
      expect(jsx, `${k} ohne as-ring-quiet`).toMatch(new RegExp(`${k} as-ring as-ring-quiet`));
    expect((jsx.match(/as-ring-quiet/g) || []).length).toBe(4);
  });

  it("es ist ein MODIFIKATOR, keine gelöschte Regel", () => {
    /* Der laufende Ring bleibt die Grundfassung — Baum, Leitfaden und Glossar benutzen ihn weiter.
       Wer ihn dort auch stilllegen will, hängt die Klasse an; er baut keinen zweiten Rahmen. */
    expect(css, "die Basis-Animation ist weg — dann tragen die anderen Screens gar keinen Ring mehr")
      .toMatch(/\.as-ring > \.as-ring-run::before\s*\{[^}]*animation:\s*as-ring-slide/);
    const q = deskBlock.match(/\.as-ring-quiet > \.as-ring-run::before\s*\{([^}]*)\}/);
    expect(q, "as-ring-quiet-Regel nicht mehr gefunden").toBeTruthy();
    expect(q[1], "ohne animation: none läuft das Band weiter").toMatch(/animation:\s*none/);
    /* `background-image: none` MUSS mit: sonst bliebe der dreifach gekachelte Verlauf stehen — er stünde
       dann nur still, statt einem ruhigen Ton zu weichen. */
    expect(q[1]).toMatch(/background-image:\s*none/);
    expect(q[1], "der Ton kommt nicht mehr aus der Deckfarbe").toMatch(/--deck-a1/);
    expect(deskBlock).toMatch(/\.as-ring-quiet\s*\{[^}]*box-shadow:\s*none/);
  });
});

describe("#cz-ruhe — flache Reiter, luftiges Raster, kompakter Knopf", () => {
  it("die Reiter tragen EIN Signal: die Unterstreichung", () => {
    const base = deskBlock.match(/\.cz-head \[role="tab"\]\s*\{([^}]*)\}/);
    expect(base, "Reiter-Regel nicht mehr gefunden").toBeTruthy();
    expect(base[1], "Fläche zurück").toMatch(/background:\s*none\s*!important/);
    expect(base[1], "Rahmen zurück").toMatch(/border:\s*0\s*!important/);
    expect(base[1], "feste Breite zurück — die Reiter messen sich am Text").not.toMatch(/min-width/);
    const on = deskBlock.match(/\.cz-head \[role="tab"\]\[aria-selected="true"\]\s*\{([^}]*)\}/);
    expect(on, "Aktiv-Regel nicht mehr gefunden").toBeTruthy();
    expect(on[1], "die Unterstreichung IST das Signal").toMatch(/border-bottom:\s*2px solid var\(--deck-a1/);
    // Und nur EINE Fassung: keine zweite Regel, die dieselben drei Knöpfe noch einmal bemaßt.
    expect(deskBlock).not.toMatch(/\.cz-tabs > button\s*\{/);
  });

  it("das Kachelraster ist luftiger als die Handy-Fassung", () => {
    expect(deskBlock).toMatch(/\.cz-mainscroll \.grid\s*\{[^}]*gap:\s*16px/);
  });

  it("der Aktionsknopf der Bühne steht rechts neben der Beschreibung, nicht über der ganzen Breite", () => {
    /* `w-full` steht im JSX (die Handy-Fassung braucht es) — der Desktop hebt es auf. Ohne `!important`
       gewinnt die Utility nicht, aber die Reihenfolge wäre Zufall; die Klasse ist die eine Naht. */
    expect(deskBlock).toMatch(/\.cz-actbtn\s*\{[^}]*width:\s*auto\s*!important/);
    expect(deskBlock).toMatch(/\.cz-fxdesc\s*\{[^}]*flex:\s*1/);
    expect(deskBlock).toMatch(/\.cz-fxfoot\s*\{[^}]*display:\s*flex/);
    expect(jsx).toMatch(/className="cz-fxfoot"/);
    // Beide Fassungen der Aktion (Knopf UND die „im Standard enthalten"-Auskunft) müssen gleich breit sein.
    expect((jsx.match(/cz-actbtn/g) || []).length).toBe(2);
  });

  it("die Fußzeile ist unterhalb 1400 px eine reine KLAMMER", () => {
    /* Ohne `display: contents` in der BASIS bekäme die Handy-Fassung eine zusätzliche Box zwischen
       Bühne und Knopf — nachgemessen ist die Geometrie bei 390 px sonst identisch. */
    const basis = css.slice(0, css.indexOf("@media (min-width: 1400px) {"));
    expect(basis).toMatch(/\.cz-fxfoot\s*\{\s*display:\s*contents/);
  });
});
