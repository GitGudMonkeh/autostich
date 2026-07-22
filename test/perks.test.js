import { describe, it, expect } from "vitest";
import { buildDeck, makeRng } from "../src/game/deck.js";
import { PERK_DEFS, PERK_LIST, buildOffer, critChanceFor, comboMultFor } from "../src/game/perks.js";
import { effectivePlayerValue } from "../src/game/engine.js";

describe("Perks — Deck-Modifikationen (Kat. A)", () => {
  it("A1 Starke Fünfen: alle Wert-5 → +6 (Wert 11)", () => {
    const d = PERK_DEFS.A1.onPick(buildDeck());
    expect(d.filter((c) => c.value === 5)).toHaveLength(0);
    expect(d.filter((c) => c.value === 11)).toHaveLength(8); // 4 alte 11er + 4 beförderte 5er
  });

  it("A2 Gerade Stärke: gerade Werte +1, ungerade unverändert", () => {
    const d = PERK_DEFS.A2.onPick(buildDeck());
    const r0 = d.find((c) => c.id === "R0");
    const r3 = d.find((c) => c.id === "R3");
    expect(r0.value).toBe(1);
    expect(r3.value).toBe(3);
  });

  it("A5 Kleine ganz groß: vier unterschiedliche Karten (Wert 0–3) je +6", () => {
    const base = buildDeck();
    const d = PERK_DEFS.A5.onPick(base, makeRng(3));
    const changedIdx = base.map((_, i) => i).filter((i) => d[i].value !== base[i].value);
    expect(changedIdx).toHaveLength(4);            // vier Karten
    expect(new Set(changedIdx).size).toBe(4);      // unterschiedlich
    for (const i of changedIdx) {
      expect(base[i].value).toBeGreaterThanOrEqual(0);
      expect(base[i].value).toBeLessThanOrEqual(3);
      expect(d[i].value).toBe(base[i].value + 6);
    }
  });

  it("Deck-Mods sind immutabel (Original-Deck unverändert)", () => {
    const base = buildDeck();
    PERK_DEFS.A1.onPick(base);
    expect(base.filter((c) => c.value === 5)).toHaveLength(4);
  });
});

describe("Perks — cardBonus (Kat. B) via effectivePlayerValue", () => {
  it("B1 Gegenangriff: +2 nur nach einer Niederlage", () => {
    expect(effectivePlayerValue(5, ["B1"], { lostLastTrick: true })).toBe(7);
    expect(effectivePlayerValue(5, ["B1"], { lostLastTrick: false })).toBe(5);
  });

  it("B3 Starker Auftakt: +4 in den ersten drei Stichen des Durchlaufs", () => {
    expect(effectivePlayerValue(4, ["B3"], { posInCycle: 0 })).toBe(8);
    expect(effectivePlayerValue(4, ["B3"], { posInCycle: 2 })).toBe(8);
    expect(effectivePlayerValue(4, ["B3"], { posInCycle: 3 })).toBe(4);
  });

  it("B5 gewährt +2 nach einer Niederlage (Kartenbonus)", () => {
    expect(effectivePlayerValue(3, ["B5"], { lostLastTrick: true })).toBe(5);
    expect(effectivePlayerValue(3, ["B5"], { lostLastTrick: false })).toBe(3);
  });

  it("Boni mehrerer Perks summieren sich", () => {
    const v = effectivePlayerValue(2, ["B1", "B4"], { lostLastTrick: true, trickNo: 10 });
    expect(v).toBe(2 + 2 + 8);
  });
});

describe("buildOffer", () => {
  it("liefert count Perks, ohne bereits besessene, ohne Duplikate", () => {
    const offer = buildOffer(["A1", "A2"], makeRng(1), 3);
    expect(offer).toHaveLength(3);
    expect(offer).not.toContain("A1");
    expect(new Set(offer).size).toBe(3);
  });

  it("gibt bei fast leerem Pool nur die Restmenge", () => {
    const owned = PERK_LIST.map((p) => p.id).slice(0, PERK_LIST.length - 2);
    expect(buildOffer(owned, makeRng(1), 3)).toHaveLength(2);
  });
});

describe("critChanceFor (Crit-Perks D6–D8)", () => {
  it("D6: konstante +12 %", () => {
    expect(critChanceFor(["D6"], {})).toBeCloseTo(0.12);
  });
  it("D7 nur bei Kartenwert ≥ 10", () => {
    expect(critChanceFor(["D7"], { winValue: 12 })).toBeCloseTo(0.35);
    expect(critChanceFor(["D7"], { winValue: 5 })).toBe(0);
  });
  it("D8 skaliert mit Serie, gedeckelt bei +40 %", () => {
    expect(critChanceFor(["D8"], { winStreak: 5 })).toBeCloseTo(0.20);
    expect(critChanceFor(["D8"], { winStreak: 20 })).toBeCloseTo(0.40); // 20*0.04 = 0.80 → Cap 0.40
  });
  it("summiert die Chancen mehrerer Crit-Perks", () => {
    expect(critChanceFor(["D6", "D7", "D8"], { winValue: 12, winStreak: 20 })).toBeCloseTo(0.87);
  });
});

describe("comboMultFor (D2-Kombo, geteilte Anzeige-Quelle #31)", () => {
  it("1 + Serie × 0,1 wenn D2 gehalten, eskalierend ohne Cap", () => {
    expect(comboMultFor(["D2"], 1)).toBeCloseTo(1.1);
    expect(comboMultFor(["D2"], 5)).toBeCloseTo(1.5);   // Anzeige-Schwelle
    expect(comboMultFor(["D2"], 20)).toBeCloseTo(3.0);  // kein Cap (alt: max +50 %)
  });
  it("neutral (1) ohne D2 — die Kombo IST der D2-Effekt", () => {
    expect(comboMultFor(["D1", "D4"], 20)).toBe(1);
    expect(comboMultFor([], 20)).toBe(1);
  });
});
