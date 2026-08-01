import { describe, it, expect } from "vitest";
import { hash32, rngAt, formatSeed, parseSeed } from "../src/game/rng.js";

// Zieht n Werte aus einem Generator (Reihenfolge = Strom).
const draws = (gen, n) => Array.from({ length: n }, () => gen());

describe("hash32 — deterministisch & adress-getrennt", () => {
  it("gleiche Adresse → gleicher Hash", () => {
    expect(hash32(12345, 5, "perk", 0)).toBe(hash32(12345, 5, "perk", 0));
  });
  it("verschiedene Teile → verschiedene Hashes (kind/index/cycle trennen Ströme)", () => {
    const base = hash32(12345, 5, "perk", 0);
    expect(hash32(12345, 5, "skill", 0)).not.toBe(base); // kind
    expect(hash32(12345, 5, "perk", 1)).not.toBe(base);  // index
    expect(hash32(12345, 6, "perk", 0)).not.toBe(base);  // cycle
    expect(hash32(54321, 5, "perk", 0)).not.toBe(base);  // seed
  });
  it("keine Adress-Kollision durch Konkatenation (12,3 ≠ 1,23)", () => {
    expect(hash32(1, 12, 3)).not.toBe(hash32(1, 1, 23));
  });
  it("liefert eine 32-bit-Ganzzahl ≥ 0", () => {
    const h = hash32(999, "deal");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(0x100000000);
  });
});

describe("rngAt — frischer, reproduzierbarer Sub-Strom je Adresse", () => {
  it("gleiche Adresse → identische Strom-Sequenz", () => {
    expect(draws(rngAt(7, 3, "shop"), 10)).toEqual(draws(rngAt(7, 3, "shop"), 10));
  });
  it("verschiedene Adressen → verschiedene Sequenzen (dekorreliert)", () => {
    const a = draws(rngAt(7, 3, "perk", 0), 8);
    const b = draws(rngAt(7, 3, "perk", 1), 8);
    expect(a).not.toEqual(b);
  });
  it("Werte liegen in [0,1)", () => {
    for (const v of draws(rngAt(42, 0, "deal"), 200)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("formatSeed / parseSeed — Base32-Roundtrip", () => {
  it("feste 7 Zeichen aus dem Crockford-Alphabet (kein I/L/O/U)", () => {
    const s = formatSeed(123456789);
    expect(s).toHaveLength(7);
    expect(s).toMatch(/^[0-9A-HJKMNP-TV-Z]{7}$/); // ohne I,L,O,U
  });
  it("roundtrip über repräsentative Werte inkl. Ränder", () => {
    for (const n of [0, 1, 31, 32, 123456789, 0xffffffff, 0xdeadbeef, 0x1337c0de]) {
      expect(parseSeed(formatSeed(n))).toBe(n >>> 0);
    }
  });
  it("tolerant: Kleinschreibung, verwechselbare Zeichen, Fremdzeichen", () => {
    const s = formatSeed(987654321);
    expect(parseSeed(s.toLowerCase())).toBe(987654321);
    expect(parseSeed(` ${s.slice(0, 3)}-${s.slice(3)} `)).toBe(987654321); // Leerzeichen/Bindestrich egal
  });
  it("mappt O→0 und I/L→1 (Tippfehler-Robustheit)", () => {
    expect(parseSeed("O0O0O0O")).toBe(parseSeed("0000000"));
    expect(parseSeed("I1L")).toBe(parseSeed("111"));
  });
  it("leere/ungültige Eingabe → null", () => {
    expect(parseSeed("")).toBe(null);
    expect(parseSeed("   ")).toBe(null);
    expect(parseSeed("!!!")).toBe(null);
    expect(parseSeed(null)).toBe(null);
    expect(parseSeed(1234)).toBe(null);
  });
});
