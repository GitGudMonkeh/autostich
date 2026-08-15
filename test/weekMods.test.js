import { describe, it, expect } from "vitest";
import { WEEK_MODS, WEEK_MOD_BY_ID, WEEK_MOD_PAIRS, pickWeekMods } from "../src/game/weekMods.js";

describe("#370 weekMods — Katalog", () => {
  it("10 negative + 9 positive, eindeutige ids", () => {
    expect(WEEK_MODS.filter((m) => m.sign === "neg")).toHaveLength(10);
    expect(WEEK_MODS.filter((m) => m.sign === "pos")).toHaveLength(9);
    const ids = WEEK_MODS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("vier Ausschluss-Paare — je genau ein pos + ein neg, beide existieren", () => {
    expect(WEEK_MOD_PAIRS).toHaveLength(4);
    for (const p of WEEK_MOD_PAIRS) {
      const pos = WEEK_MOD_BY_ID[p.pos], neg = WEEK_MOD_BY_ID[p.neg];
      expect(pos.sign).toBe("pos");
      expect(neg.sign).toBe("neg");
      expect(pos.pair).toBe(p.key);
      expect(neg.pair).toBe(p.key);
    }
  });
  it("jeder mod mit range rollt einen mag im Bereich, alle haben einen Text", () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const m of pickWeekMods(seed)) {
        expect(typeof m.text).toBe("string");
        expect(m.text.length).toBeGreaterThan(0);
        const def = WEEK_MOD_BY_ID[m.id];
        if (def.range) {
          expect(m.mag).toBeGreaterThanOrEqual(def.range[0]);
          expect(m.mag).toBeLessThanOrEqual(def.range[1]);
        } else {
          expect(m.mag).toBe(null);
        }
      }
    }
  });
});

describe("#370 weekMods — Auswahl-Invarianten (über viele Seeds)", () => {
  const SEEDS = Array.from({ length: 300 }, (_, i) => i * 7 + 1);
  it("3–5 Mods, ≥2 positiv, ≥1 negativ, keine Dubletten", () => {
    for (const seed of SEEDS) {
      const mods = pickWeekMods(seed);
      expect(mods.length).toBeGreaterThanOrEqual(3);
      expect(mods.length).toBeLessThanOrEqual(5);
      expect(mods.filter((m) => m.sign === "pos").length).toBeGreaterThanOrEqual(2);
      expect(mods.filter((m) => m.sign === "neg").length).toBeGreaterThanOrEqual(1);
      const ids = mods.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
  it("nie beide Hälften eines Ausschluss-Paars zusammen", () => {
    for (const seed of SEEDS) {
      const pairs = pickWeekMods(seed).map((m) => m.pair).filter(Boolean);
      expect(new Set(pairs).size).toBe(pairs.length); // jedes Paar höchstens einmal vertreten
    }
  });
});

describe("#370 weekMods — deterministisch & für alle gleich", () => {
  it("gleicher Seed → identische Auswahl (reproduzierbar bei Neustart)", () => {
    for (const seed of [1, 42, 1000, 999999]) {
      expect(pickWeekMods(seed)).toEqual(pickWeekMods(seed));
    }
  });
  it("verschiedene Seeds liefern (mindestens teils) verschiedene Auswahlen", () => {
    const sets = new Set(Array.from({ length: 50 }, (_, i) => pickWeekMods(i + 1).map((m) => m.id).sort().join(",")));
    expect(sets.size).toBeGreaterThan(5);
  });
});
