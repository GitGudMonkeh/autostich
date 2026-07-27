import { describe, it, expect } from "vitest";
import { buildDeck, makeRng, shuffle, shuffledOrder, clamp, fmtDuration } from "../src/game/deck.js";

describe("Deck", () => {
  it("baut 40 Karten: 4 Farben × Werte 1..10, value = baseRank (#34)", () => {
    const d = buildDeck();
    expect(d).toHaveLength(40);
    expect(new Set(d.map((c) => c.suit)).size).toBe(4);
    expect(d.every((c) => c.value === c.baseRank)).toBe(true);
    expect(d.filter((c) => c.suit === "R")).toHaveLength(10);
    expect(d.filter((c) => c.value === 10)).toHaveLength(4);
    expect(d.filter((c) => c.value === 0)).toHaveLength(0); // keine schwache 0 mehr
    expect(Math.min(...d.map((c) => c.value))).toBe(1);
    expect(Math.max(...d.map((c) => c.value))).toBe(10);
  });

  it("makeRng ist deterministisch (gleicher Seed → gleiche Folge)", () => {
    const a = makeRng(7), b = makeRng(7);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(makeRng(8)()).not.toBe(makeRng(7)());
  });

  it("shuffle erhält Multiset, shuffledOrder ist eine Permutation von 0..n-1", () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src, makeRng(1));
    expect([...out].sort()).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5]); // Original unangetastet
    const ord = shuffledOrder(52, makeRng(2));
    expect([...ord].sort((x, y) => x - y)).toEqual(Array.from({ length: 52 }, (_, i) => i));
  });

  // #156: die Determinismus-Tests prüften bisher nur Gleichheit bei GLEICHEM Seed (eine Konstante bestünde sie
  // ebenfalls). Ergänzung: der Seed treibt die Ausgabe wirklich — verschiedene Seeds → (meist) verschieden.
  it("der Seed treibt die Ausgabe: verschiedene Seeds → nicht konstant (#156)", () => {
    const draws = Array.from({ length: 8 }, (_, s) => makeRng(s + 1)());
    expect(new Set(draws).size).toBeGreaterThan(1);            // nicht alle gleich → keine Stub-Konstante
    expect(shuffledOrder(20, makeRng(1)).join(",")).not.toBe(shuffledOrder(20, makeRng(2)).join(","));
  });
});

describe("clamp & fmtDuration (#158)", () => {
  it("clamp begrenzt auf [lo, hi]", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
    expect(clamp(7, 7, 7)).toBe(7);
  });
  it("fmtDuration → m:ss (Sekunden zweistellig, negativ → 0:00)", () => {
    expect(fmtDuration(0)).toBe("0:00");
    expect(fmtDuration(5000)).toBe("0:05");
    expect(fmtDuration(65000)).toBe("1:05");
    expect(fmtDuration(600000)).toBe("10:00");
    expect(fmtDuration(-1000)).toBe("0:00");
  });
});
