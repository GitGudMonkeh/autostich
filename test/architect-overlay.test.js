// #UI: Architekt-Gebäude-Overlay als durchgezogener Rahmen in Gebäude-FORM (CardGrid/CardTile).
// Verifiziert die Perimeter-Logik: benachbarte Zellen desselben Gebäudes (gleiche bid) teilen KEINE innere Kante
// → die Zellen verschmelzen zu einer Kontur. Reiner Render-Smoke via renderToStaticMarkup (node-env, kein DOM).
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { CardGrid } from "../src/ui/CardGrid.jsx";

const card = (id, value) => ({ id, suit: "R", value });
const covCell = (bid) => ({ cat: "score", color: "#5ab87a", icon: "", boost: 0, legendary: false, name: "Bau", bid });

// Zählt (nicht überlappende) Vorkommen eines Substrings.
const count = (hay, needle) => hay.split(needle).length - 1;

describe("Architekt-Overlay — durchgezogener Rahmen in Gebäude-Form", () => {
  it("2-Zellen-Gebäude (horizontal): geteilte Innenkante wird NICHT gezeichnet, Außenkanten schon", () => {
    // Positionen 0 & 1 = dasselbe Gebäude „B1" (nebeneinander in derselben Segment-Zeile).
    const html = renderToStaticMarkup(createElement(CardGrid, {
      cards: [card("a", 5), card("b", 7)],
      formations: [],
      architectCover: { 0: covCell("B1"), 1: covCell("B1") },
      onTilePick: () => {},
    }));
    // Oben/unten: je Zelle eine Kante → 2×. Links: nur die linke Zelle. Rechts: nur die rechte Zelle.
    expect(count(html, "inset 0 2px 0 0")).toBe(2);   // top ×2
    expect(count(html, "inset 0 -2px 0 0")).toBe(2);  // bottom ×2
    expect(count(html, "inset 2px 0 0 0")).toBe(1);   // left (nur Zelle 0)
    expect(count(html, "inset -2px 0 0 0")).toBe(1);  // right (nur Zelle 1)
    // Kein voller Inset-Ring mehr (der alte per-Zelle-Kasten).
    expect(count(html, "inset 0 0 0 2px")).toBe(0);
  });

  it("zwei getrennte 1-Zellen-Gebäude: jede Zelle bekommt alle vier Kanten (voller Rahmen)", () => {
    // Positionen 0 & 1 = VERSCHIEDENE Gebäude → keine geteilte Kante, beide voll umrandet.
    const html = renderToStaticMarkup(createElement(CardGrid, {
      cards: [card("a", 5), card("b", 7)],
      formations: [],
      architectCover: { 0: covCell("B1"), 1: covCell("B2") },
      onTilePick: () => {},
    }));
    expect(count(html, "inset 0 2px 0 0")).toBe(2);   // top: beide
    expect(count(html, "inset 0 -2px 0 0")).toBe(2);  // bottom: beide
    expect(count(html, "inset 2px 0 0 0")).toBe(2);   // left: beide (verschiedene bid)
    expect(count(html, "inset -2px 0 0 0")).toBe(2);  // right: beide
  });
});
