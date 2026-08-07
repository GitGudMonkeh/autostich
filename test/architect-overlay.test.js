// #UI: Architekt-Gebäude-Overlay als EIN durchgezogener Rahmen in Gebäude-FORM (SVG-Kontur über dem Grid) + die
// Gebäude-Effekte an einer Position im Kartendetail. Geometrie (archFrameLines) rein/unit-getestet; CardGrid- und
// CardDetail-Render als Smoke via renderToStaticMarkup (node-env, kein DOM → useLayoutEffect/Messung läuft nicht,
// daher keine SVG-Linien im SSR — die testen wir direkt über archFrameLines).
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { CardGrid, archFrameLines } from "../src/ui/CardGrid.jsx";
import { architectEffectStrings } from "../src/ui/archEffects.js";
import { CardDetail } from "../src/ui/CardDetail.jsx";

const card = (id, value) => ({ id, suit: "R", value });
const covCell = (bid) => ({ cat: "score", color: "#5ab87a", icon: "", boost: 0, legendary: false, name: "Bau", bid });
const count = (hay, needle) => hay.split(needle).length - 1;
const rect = (left, top, right, bottom) => ({ left, top, right, bottom });
const vert = (l) => l.x1 === l.x2;   // vertikales Segment
const horiz = (l) => l.y1 === l.y2;  // horizontales Segment

describe("archFrameLines — Perimeter-Kontur in Gebäude-Form", () => {
  it("2-Zellen-Gebäude horizontal: geteilte Innenkante fehlt, Kontur läuft über die Lücke durch", () => {
    const cover = { 0: covCell("B1"), 1: covCell("B1") };
    const cells = { 0: rect(0, 0, 100, 100), 1: rect(106, 0, 206, 100) }; // 6px Lücke
    const lines = archFrameLines(cover, cells, 2, 3, 5);
    expect(lines.length).toBe(6);                        // 2×oben + 2×unten + links(Z0) + rechts(Z1)
    expect(lines.filter(vert).length).toBe(2);           // KEINE innere Trennwand (nur Z0-links, Z1-rechts)
    expect(lines.filter(horiz).length).toBe(4);
    // Durchlauf: die beiden Ober-Segmente stoßen in der Lückenmitte (x=103) exakt zusammen.
    const tops = lines.filter((l) => horiz(l) && l.y1 === -5);
    expect(tops.some((l) => l.x2 === 103)).toBe(true);   // Z0 oben endet bei 103
    expect(tops.some((l) => l.x1 === 103)).toBe(true);   // Z1 oben beginnt bei 103
  });
  it("2-Zellen-Gebäude vertikal (über Segment-Zeilen): geteilte Kante fehlt, Kontur durchgehend", () => {
    const cover = { 0: covCell("B1"), 5: covCell("B1") };
    const cells = { 0: rect(0, 0, 100, 100), 5: rect(0, 110, 100, 210) }; // 10px Lücke
    const lines = archFrameLines(cover, cells, 10, 3, 5);
    expect(lines.length).toBe(6);                        // je 3 (oben/unten weg an der geteilten Kante)
    expect(lines.filter(horiz).length).toBe(2);          // nur Z0-oben + Z5-unten
    const lefts = lines.filter((l) => vert(l) && l.x1 === -3);
    expect(lefts.some((l) => l.y2 === 105)).toBe(true);  // Z0 links endet bei 105
    expect(lefts.some((l) => l.y1 === 105)).toBe(true);  // Z5 links beginnt bei 105 → durchgehend
  });
  it("exVOut zieht die AUSSEN-Banden oben/unten näher an die Karten, innere Naht bleibt bei halber Lücke", () => {
    // Vertikales 2-Zellen-Gebäude über eine Zeilengrenze (10px Lücke). Voller exV=5 (Naht), exVOut=2 (Außenkante).
    const cover = { 0: covCell("B1"), 5: covCell("B1") };
    const cells = { 0: rect(0, 0, 100, 100), 5: rect(0, 110, 100, 210) };
    const lines = archFrameLines(cover, cells, 10, 3, 5, 2);
    const tops = lines.filter(horiz);
    // Z0-oben (Außenkante) sitzt jetzt bei -2 statt -5 → näher an der Karte.
    expect(tops.some((l) => l.y1 === -2)).toBe(true);
    // Z5-unten (Außenkante) bei 210+2=212.
    expect(tops.some((l) => l.y1 === 212)).toBe(true);
    // Innere Naht unverändert bei halber gemessener Lücke (105) → Kontur schließt weiter durch.
    const lefts = lines.filter((l) => vert(l) && l.x1 === -3);
    expect(lefts.some((l) => l.y2 === 105)).toBe(true);   // Z0 links endet bei 105
    expect(lefts.some((l) => l.y1 === 105)).toBe(true);   // Z5 links beginnt bei 105
    // Default exVOut = exV bleibt kompatibel (5 Args → Außenkante bei -5 wie zuvor).
    const legacy = archFrameLines(cover, cells, 10, 3, 5);
    expect(legacy.filter(horiz).some((l) => l.y1 === -5)).toBe(true);
  });
  it("zwei getrennte 1-Zellen-Gebäude: jede Zelle voll umrandet (4 Kanten)", () => {
    const cover = { 0: covCell("B1"), 1: covCell("B2") };
    const cells = { 0: rect(0, 0, 100, 100), 1: rect(106, 0, 206, 100) };
    const lines = archFrameLines(cover, cells, 2, 3, 5);
    expect(lines.length).toBe(8);                        // 4 + 4 (keine geteilte Kante)
  });
});

describe("CardGrid — Render-Smoke mit Architekt-Overlay", () => {
  it("rendert ohne Crash; setzt Messmarker (data-pos) + dezenten Kategorie-Wash je abgedeckter Zelle", () => {
    const html = renderToStaticMarkup(createElement(CardGrid, {
      cards: [card("a", 5), card("b", 7)],
      formations: [],
      architectCover: { 0: covCell("B1"), 1: covCell("B1") },
      onTilePick: () => {},
    }));
    expect(html).toContain('data-pos="0"');
    expect(count(html, "inset 0 0 0 9999px")).toBe(2);   // Wash je abgedeckter Zelle (SVG-Kontur erst im Browser)
  });
});

describe("architectEffectStrings — Gebäude-Effekte an einer Position (CardDetail)", () => {
  it("Wert-Boost + Score-Mult + Struktur-Faktor werden lesbar formatiert", () => {
    const pre = { value: [{ kind: "flat", amount: 2 }], score: [{ kind: "mult", factor: 1.35 }], segFactor: [1.2] };
    const s = architectEffectStrings(pre, 0, { value: 5, suit: "R" });
    expect(s).toContain("+2 Stichwert");
    expect(s).toContain("×1,35 Score");
    expect(s).toContain("Struktur ×1,20");
  });
  it("ohne Effekt an der Position → leere Liste", () => {
    const pre = { value: [null], score: [null], segFactor: [1] };
    expect(architectEffectStrings(pre, 0, { value: 5, suit: "R" })).toEqual([]);
  });
  it("Flat-Score + bedingter Farb-Score", () => {
    const pre = { value: [null], score: [{ kind: "color", amount: 40, colorChoice: "B" }], segFactor: [1] };
    expect(architectEffectStrings(pre, 0, { value: 5, suit: "R" })).toEqual(["+40 Score bei Blau"]);
  });
  it("Formations-Gebäude: Rolle wird ausformuliert (Joker / Formations-Multiplikator)", () => {
    const preEmpty = { value: [null], score: [null], segFactor: [1] };
    const joker = { category: "formation", base: { kind: "joker", types: ["farbblock", "wiederholung"] } };
    expect(architectEffectStrings(preEmpty, 0, { value: 5, suit: "R" }, joker)).toEqual(["Formations-Joker (farbblock/wiederholung)"]);
    const kathedrale = { category: "formation", base: { kind: "formMult", factor: 1.4 } };
    expect(architectEffectStrings(preEmpty, 0, { value: 5, suit: "R" }, kathedrale)).toEqual(["Formationen hier ×1,40"]);
  });
  it("CardDetail rendert die 🏗 Gebäude-Sektion mit Name + Effekten, wenn arch übergeben wird", () => {
    const html = renderToStaticMarkup(createElement(CardDetail, {
      card: { id: "a", suit: "R", value: 5 }, pos: 0, posForm: null, roles: {},
      arch: { color: "#5a8ade", legendary: false, name: "Handelsposten", effects: ["+2 Wert", "Struktur ×1,20"] },
    }));
    expect(html).toContain("Gebäude");
    expect(html).toContain("Handelsposten");
    expect(html).toContain("+2 Wert");
    expect(html).toContain("Struktur");
  });
});
