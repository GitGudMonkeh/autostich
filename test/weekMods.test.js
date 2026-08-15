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

  /* REGRESSION: Die Vorgängerfassung füllte auf `count` in EINER Schleife `[...POS, ...NEG]` auf. Weil immer genug
     eligible Positive übrig waren, kam die Negativ-Hälfte nie dran — jede Woche hatte genau EINEN Negativen und die
     vier GEPAARTEN Negativen waren über 200k Seeds unerreichbar (21 % des Katalogs tot). Die Invarianten-Tests oben
     prüfen nur untere Schranken (≥2 pos / ≥1 neg) und blieben deshalb grün. Diese beiden Tests schließen die Lücke. */
  const WIDE_SEEDS = Array.from({ length: 4000 }, (_, i) => i + 1);

  it("jeder Mod im Katalog ist erreichbar (kein toter Eintrag)", () => {
    const seen = new Set();
    for (const seed of WIDE_SEEDS) for (const m of pickWeekMods(seed)) seen.add(m.id);
    const missing = WEEK_MODS.map((m) => m.id).filter((id) => !seen.has(id));
    expect(missing).toEqual([]);
  });

  it("die Negativ-Quote variiert und ist nach oben durch die Positiv-Quote begrenzt", () => {
    const negCounts = new Set();
    for (const seed of WIDE_SEEDS) {
      const mods = pickWeekMods(seed);
      const neg = mods.filter((m) => m.sign === "neg").length;
      const pos = mods.length - neg;
      expect(pos).toBeGreaterThanOrEqual(2);   // Untergrenze Positive (§5)
      expect(neg).toBeGreaterThanOrEqual(1);   // Untergrenze Negative (§5)
      expect(neg).toBeLessThanOrEqual(mods.length - 2); // Obergrenze folgt aus der Positiv-Quote
      negCounts.add(neg);
    }
    // Nicht mehr konstant 1: bei 5 Mods sind 1–3 Negative möglich, bei 4 Mods 1–2.
    expect([...negCounts].sort()).toEqual([1, 2, 3]);
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
