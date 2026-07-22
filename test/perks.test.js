import { describe, it, expect } from "vitest";
import { buildDeck, makeRng } from "../src/game/deck.js";
import { PERK_DEFS, PERK_LIST, buildOffer, critChanceFor } from "../src/game/perks.js";
import { effectivePlayerValue } from "../src/game/engine.js";

describe("Perks — Deck-Modifikationen (Kat. A)", () => {
  it("A1 Starke Fünfen: alle Wert-5 → +2 (nun 8 Karten mit Wert 7)", () => {
    const d = PERK_DEFS.A1.onPick(buildDeck());
    expect(d.filter((c) => c.value === 5)).toHaveLength(0);
    expect(d.filter((c) => c.value === 7)).toHaveLength(8); // 4 alte 7er + 4 beförderte 5er
  });

  it("A2 Gerade Stärke: gerade Werte +1, ungerade unverändert", () => {
    const d = PERK_DEFS.A2.onPick(buildDeck());
    const r0 = d.find((c) => c.id === "R0");
    const r3 = d.find((c) => c.id === "R3");
    expect(r0.value).toBe(1);
    expect(r3.value).toBe(3);
  });

  it("A5 Einzelnes Upgrade: genau eine Karte (Wert 0–3) bekommt +5", () => {
    const base = buildDeck();
    const d = PERK_DEFS.A5.onPick(base, makeRng(3));
    const changed = d.filter((c, i) => c.value !== base[i].value);
    expect(changed).toHaveLength(1);
    const i = d.findIndex((c, idx) => c.value !== base[idx].value);
    expect(base[i].value).toBeGreaterThanOrEqual(0);
    expect(base[i].value).toBeLessThanOrEqual(3);
    expect(d[i].value).toBe(base[i].value + 5);
  });

  it("Deck-Mods sind immutabel (Original-Deck unverändert)", () => {
    const base = buildDeck();
    PERK_DEFS.A1.onPick(base);
    expect(base.filter((c) => c.value === 5)).toHaveLength(4);
  });
});

describe("Perks — cardBonus (Kat. B) via effectivePlayerValue", () => {
  it("B1 Gegenangriff: +3 nur nach einer Niederlage", () => {
    expect(effectivePlayerValue(5, ["B1"], { lostLastTrick: true })).toBe(8);
    expect(effectivePlayerValue(5, ["B1"], { lostLastTrick: false })).toBe(5);
  });

  it("B3 Starker Auftakt: +5 nur im ersten Stich des Durchlaufs", () => {
    expect(effectivePlayerValue(4, ["B3"], { posInCycle: 0 })).toBe(9);
    expect(effectivePlayerValue(4, ["B3"], { posInCycle: 7 })).toBe(4);
  });

  it("Boni mehrerer Perks summieren sich", () => {
    const v = effectivePlayerValue(2, ["B1", "B4"], { lostLastTrick: true, trickNo: 10 });
    expect(v).toBe(2 + 3 + 4);
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
  it("D6: konstante +10 %", () => {
    expect(critChanceFor(["D6"], {})).toBeCloseTo(0.10);
  });
  it("D7 nur bei Kartenwert ≥ 10", () => {
    expect(critChanceFor(["D7"], { winValue: 12 })).toBeCloseTo(0.15);
    expect(critChanceFor(["D7"], { winValue: 5 })).toBe(0);
  });
  it("D8 skaliert mit Serie, gedeckelt bei +30 %", () => {
    expect(critChanceFor(["D8"], { winStreak: 5 })).toBeCloseTo(0.10);
    expect(critChanceFor(["D8"], { winStreak: 20 })).toBeCloseTo(0.30); // 20*0.02 = 0.40 → Cap 0.30
  });
  it("summiert die Chancen mehrerer Crit-Perks", () => {
    expect(critChanceFor(["D6", "D7", "D8"], { winValue: 12, winStreak: 20 })).toBeCloseTo(0.55);
  });
});
