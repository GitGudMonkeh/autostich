// #UI: Architekt-Gebäude-Overlay als durchgezogener Rahmen in Gebäude-FORM (CardGrid/CardTile).
// Verifiziert die Perimeter-Logik: benachbarte Zellen desselben Gebäudes (gleiche bid) teilen KEINE innere Kante
// → die Zellen verschmelzen zu einer Kontur. Reiner Render-Smoke via renderToStaticMarkup (node-env, kein DOM).
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { CardGrid } from "../src/ui/CardGrid.jsx";
import { architectEffectStrings } from "../src/ui/archEffects.js";
import { CardDetail } from "../src/ui/CardDetail.jsx";

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

describe("architectEffectStrings — Gebäude-Effekte an einer Position (CardDetail)", () => {
  it("Wert-Boost + Score-Mult + Struktur-Faktor werden lesbar formatiert", () => {
    const pre = { value: [{ kind: "flat", amount: 2 }], score: [{ kind: "mult", factor: 1.35 }], segFactor: [1.2] };
    const s = architectEffectStrings(pre, 0, { value: 5, suit: "R" });
    expect(s).toContain("+2 Wert");
    expect(s).toContain("×1,35 Punkte");
    expect(s).toContain("Struktur ×1,20");
  });
  it("ohne Effekt an der Position → leere Liste", () => {
    const pre = { value: [null], score: [null], segFactor: [1] };
    expect(architectEffectStrings(pre, 0, { value: 5, suit: "R" })).toEqual([]);
  });
  it("Flat-Punkte + bedingter Farb-Score", () => {
    const pre = { value: [null], score: [{ kind: "color", amount: 40, colorChoice: "B" }], segFactor: [1] };
    expect(architectEffectStrings(pre, 0, { value: 5, suit: "R" })).toEqual(["+40 Punkte bei Blau"]);
  });
  it("CardDetail rendert die 🏗 Gebäude-Sektion mit Name + Effekten, wenn arch übergeben wird", () => {
    const html = renderToStaticMarkup(createElement(CardDetail, {
      card: { id: "a", suit: "R", value: 5 }, pos: 0, posForm: null, roles: {},
      arch: { color: "#5a8ade", legendary: false, name: "Handelsposten", effects: ["+2 Wert", "Struktur ×1,20"] },
    }));
    expect(html).toContain("Gebäude");        // Sektions-Label
    expect(html).toContain("Handelsposten");        // Gebäudename
    expect(html).toContain("+2 Wert");              // Effekt-Chip
    expect(html).toContain("Struktur");             // Struktur-Faktor
  });
});
