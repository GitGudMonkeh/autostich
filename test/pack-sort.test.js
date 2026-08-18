import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { hexRgb, hexHsl, colorKey, sortByColor, sortPacks, sortLabelKey, nextSort,
  SORT_DEFAULT, SORT_COLOR, NEUTRAL_S } from "../src/ui/packSort.js";
import de from "../src/i18n/de.js";
import en from "../src/i18n/en.js";

/* ============================================================
   #packsort — Kachel-Reihenfolge in der Werkstatt (Reiter Packs & Herausforderungen).

   Die Rechnung liegt in einem REINEN Modul (packSort.js), damit sie hier nachgerechnet werden kann,
   ohne eine Komponente zu rendern — dasselbe Muster wie previewScale.js. Der zweite Teil ist eine
   Quelltext-Ratsche über die Verdrahtung: die Sortierung MUSS im Screen liegen, nicht in der Ansicht,
   sonst zeigt das Detail nach dem Umschalten ein anderes Pack als die angetippte Kachel.
   ============================================================ */

const SRC = readFileSync(new URL("../src/ui/CustomizeScreen.jsx", import.meta.url), "utf8");
const pack = (id, a1) => ({ id, a1 });

describe("#packsort · Farbrechnung", () => {
  it("hexRgb liest Kurz- und Langform, alles andere ist null", () => {
    expect(hexRgb("#ff0000")).toEqual([255, 0, 0]);
    expect(hexRgb("f00")).toEqual([255, 0, 0]);
    expect(hexRgb("#26c6e6")).toEqual([38, 198, 230]);
    for (const bad of ["", null, undefined, "rot", "#12345", "#gggggg"]) expect(hexRgb(bad)).toBeNull();
  });

  it("hexHsl trifft die Grundfarben", () => {
    expect(Math.round(hexHsl("#ff0000").h)).toBe(0);
    expect(Math.round(hexHsl("#00ff00").h)).toBe(120);
    expect(Math.round(hexHsl("#0000ff").h)).toBe(240);
    expect(hexHsl("#808080").s).toBeCloseTo(0, 5);   // unbunt
    expect(hexHsl("#ffffff").l).toBeCloseTo(1, 5);
  });

  it("unbunte Packs stehen hinter allen bunten — auch die ohne lesbare Farbe", () => {
    expect(colorKey(pack("grau", "#8a8a95"))[0]).toBe(1);
    expect(colorKey(pack("ohne", null))[0]).toBe(1);
    expect(colorKey(pack("rot", "#ff0000"))[0]).toBe(0);
    // Die Schwelle ist der Grund, warum ein blasses Deck NICHT hinten landet.
    expect(hexHsl("#8a8a95").s).toBeLessThan(NEUTRAL_S);
    expect(hexHsl("#26c6e6").s).toBeGreaterThan(NEUTRAL_S);
  });

  it("sortByColor läuft den Farbkreis ab Rot ab und hängt Unbuntes hinten an", () => {
    const list = [pack("grau", "#8a8a95"), pack("blau", "#0000ff"), pack("rot", "#ff0000"),
      pack("gruen", "#00ff00"), pack("gelb", "#ffff00")];
    expect(sortByColor(list).map((x) => x.id)).toEqual(["rot", "gelb", "gruen", "blau", "grau"]);
  });

  it("sortByColor lässt die Eingabe unberührt und ist bei gleicher Farbe stabil", () => {
    const list = [pack("b", "#00ff00"), pack("a", "#ff0000"), pack("a2", "#ff0000")];
    const out = sortByColor(list);
    expect(list.map((x) => x.id)).toEqual(["b", "a", "a2"]);        // nicht in-place
    expect(out.map((x) => x.id)).toEqual(["a", "a2", "b"]);          // gleiche Farbe → Ausgangsreihenfolge
  });

  it("sortPacks lässt den Standardmodus BYTE-gleich durch", () => {
    const list = [pack("b", "#00ff00"), pack("a", "#ff0000")];
    expect(sortPacks(list, SORT_DEFAULT)).toBe(list);   // dieselbe Referenz: kein Kopieren, kein Umsortieren
    expect(sortPacks(list, SORT_COLOR)).not.toBe(list);
  });
});

describe("#packsort · Knopf-Beschriftung", () => {
  /* Die Beschriftung ist das, was der NÄCHSTE Klick tut. Und sie unterscheidet die Reiter: eine
     Herausforderung hat keinen Preis (`packPrice` gibt für cond-Packs null), „Preis" wäre dort gelogen. */
  it("nennt den nächsten Schritt, je Reiter richtig", () => {
    expect(sortLabelKey(SORT_DEFAULT, false)).toBe("shop.sort.color");
    expect(sortLabelKey(SORT_DEFAULT, true)).toBe("shop.sort.color");
    expect(sortLabelKey(SORT_COLOR, false)).toBe("shop.sort.price");
    expect(sortLabelKey(SORT_COLOR, true)).toBe("shop.sort.default");
  });

  it("der Knopf pendelt zwischen genau zwei Zuständen", () => {
    expect(nextSort(SORT_DEFAULT)).toBe(SORT_COLOR);
    expect(nextSort(SORT_COLOR)).toBe(SORT_DEFAULT);
  });

  it("jede Beschriftung steht in BEIDEN Katalogen", () => {
    for (const key of ["shop.sort.color", "shop.sort.price", "shop.sort.default", "shop.sort.hint"]) {
      expect(de[key], `${key} fehlt in de.js`).toBeTruthy();
      expect(en[key], `${key} fehlt in en.js`).toBeTruthy();
    }
  });
});

describe("#packsort · Verdrahtung", () => {
  /* Der Kern der Sache: `catList` ist die EINE Quelle für Kacheln, Detail-Index und das Blättern mit ‹ ›.
     Läge die Sortierung in `PacksView`, zeigte das Detail nach dem Umschalten ein anderes Pack. */
  it("die Sortierung sitzt im Screen, nicht in der Kachel-Ansicht", () => {
    expect(SRC).toMatch(/const \[sort, setSort\] = useState\(SORT_DEFAULT\)/);
    expect(SRC, "catList muss durch sortPacks laufen").toMatch(/sortPacks\(orderPacks\(/);
    expect(SRC, "catList darf nur über listFor gehen").toMatch(/const catList = \(cat\) => listFor\(cat, sort\)/);
  });

  it("das offene Detail wird beim Umschalten auf DASSELBE Pack umgerechnet", () => {
    const fn = SRC.match(/const toggleSort = \(\) => \{[\s\S]*?\n {2}\};/);
    expect(fn, "toggleSort nicht gefunden").toBeTruthy();
    expect(fn[0], "das Detail muss über indexOf umgerechnet werden, nicht zugeklappt").toContain("indexOf(cur)");
    expect(fn[0]).toContain("setSort(next)");
  });

  it("beide Reiter bekommen den Knopf", () => {
    for (const cat of ["packs", "challenges"]) {
      const line = SRC.split("\n").find((l) => l.includes(`cat="${cat}"`));
      expect(line, `PacksView für ${cat} nicht gefunden`).toBeTruthy();
      expect(line, `${cat} bekommt keinen Sortier-Knopf`).toMatch(/sort=\{sort\} onSort=\{toggleSort\}/);
    }
  });

  it("der Knopf trägt keine Aktiv-Kante (sie widerspräche der Beschriftung)", () => {
    const btn = SRC.match(/<button type="button" onClick=\{onSort\}[\s\S]*?<\/button>/);
    expect(btn, "Sortier-Knopf nicht gefunden").toBeTruthy();
    expect(btn[0]).toContain("sortLabelKey(sort, challenge)");
    expect(btn[0], "borderLeftColor am Sortier-Knopf: leuchtet neben der Beschriftung des NÄCHSTEN Klicks")
      .not.toContain("borderLeftColor");
  });
});
