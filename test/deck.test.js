import { describe, it, expect } from "vitest";
import { buildDeck, makeRng, shuffle, shuffledOrder } from "../src/game/deck.js";

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
});
