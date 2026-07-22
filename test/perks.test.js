import { describe, it, expect } from "vitest";
import { buildDeck, makeRng } from "../src/game/deck.js";
import { PERK_DEFS, PERK_LIST, buildOffer, critChanceFor, comboMultFor, isLegendary, tempoScoreMultFor, baseScoreMultFor } from "../src/game/perks.js";
import { effectivePlayerValue } from "../src/game/engine.js";

describe("Perks — Deck-Modifikationen (Kat. A)", () => {
  it("A1 Starke Fünfen: alle Wert-5 → +6 (Wert 11)", () => {
    const d = PERK_DEFS.A1.onPick(buildDeck());
    expect(d.filter((c) => c.value === 5)).toHaveLength(0);
    expect(d.filter((c) => c.value === 11)).toHaveLength(4); // Deck 1–10 hat keine 11 → nur die 4 beförderten 5er
  });

  it("A2 Gerade Stärke: gerade Werte +1, ungerade unverändert", () => {
    const d = PERK_DEFS.A2.onPick(buildDeck());
    const r2 = d.find((c) => c.id === "R2");
    const r3 = d.find((c) => c.id === "R3");
    expect(r2.value).toBe(3); // gerade → +1
    expect(r3.value).toBe(3); // ungerade → unverändert
  });

  it("A5 Kleine ganz groß: vier unterschiedliche Karten (Wert 1–3) je +6", () => {
    const base = buildDeck();
    const d = PERK_DEFS.A5.onPick(base, makeRng(3));
    const changedIdx = base.map((_, i) => i).filter((i) => d[i].value !== base[i].value);
    expect(changedIdx).toHaveLength(4);            // vier Karten
    expect(new Set(changedIdx).size).toBe(4);      // unterschiedlich
    for (const i of changedIdx) {
      expect(base[i].value).toBeGreaterThanOrEqual(1);
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
    const owned = PERK_LIST.filter((p) => p.id !== "A1" && p.id !== "A2").map((p) => p.id);
    expect(buildOffer(owned, makeRng(1), 3, 9)).toHaveLength(2); // nur A1/A2 übrig (Commons)
  });

  // ---- Legendär / Rarität (#33, Gate ab Level 2 seit #38) ----
  it("bietet unter Level 2 KEINE Legendaries (Level-Gate)", () => {
    for (let s = 0; s < 20; s++) {
      expect(buildOffer([], makeRng(s), 3, 1).some(isLegendary)).toBe(false);
    }
  });
  it("ab Level 2 erscheinen Legendaries — höchstens EINER je Angebot", () => {
    // Nur Legendaries übrig → das Angebot enthält genau 1 (max 1 pro Angebot), und der ist legendär.
    const owned = PERK_LIST.filter((p) => !isLegendary(p.id)).map((p) => p.id);
    const off = buildOffer(owned, makeRng(3), 3, 2);
    expect(off).toHaveLength(1);
    expect(isLegendary(off[0])).toBe(true);
  });
  it("gewichtete Auswahl ist bei festem Seed deterministisch", () => {
    expect(buildOffer([], makeRng(7), 3, 5)).toEqual(buildOffer([], makeRng(7), 3, 5));
  });
  it("bereits gewählte Legendaries werden nicht erneut angeboten", () => {
    expect(buildOffer(["L1"], makeRng(1), 3, 9)).not.toContain("L1");
  });
});

describe("critChanceFor (Crit-Perks D6–D8, L4/L5)", () => {
  it("D6: konstante +12 %", () => {
    expect(critChanceFor(["D6"], {})).toBeCloseTo(0.12);
  });
  it("D7 nur bei Kartenwert ≥ 8 (#34)", () => {
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
  it("L4-Bonus (legendaryCritBonus) wird addiert; Gesamt bei 100 % gedeckelt", () => {
    expect(critChanceFor(["D6"], {}, 0.10)).toBeCloseTo(0.22);
    expect(critChanceFor(["D6", "D7", "D8"], { winValue: 12, winStreak: 20 }, 0.5)).toBe(1); // 0.87+0.5 → Cap 1
  });
  it("L5 Jackpot halbiert die (zufällige) Crit-Chance — inkl. L4-Bonus", () => {
    expect(critChanceFor(["D6", "L5"], {})).toBeCloseTo(0.06);          // 0.12 × 0.5
    expect(critChanceFor(["D6", "L5"], {}, 0.20)).toBeCloseTo(0.16);    // (0.12+0.20) × 0.5
  });
});

describe("Legendäre Perks — reine Hooks (#33)", () => {
  it("alle sechs sind als legendary markiert", () => {
    for (const id of ["L1", "L2", "L3", "L4", "L5", "L6"]) expect(isLegendary(id)).toBe(true);
    expect(isLegendary("D1")).toBe(false);
  });
  it("L1 Überladung: onPick +2 deckweit, +3 Zusatzschaden", () => {
    const d = PERK_DEFS.L1.onPick(buildDeck());
    expect(d.every((c) => c.value === c.baseRank + 2)).toBe(true);
    expect(PERK_DEFS.L1.extraDamageTaken()).toBe(3);
  });
  it("L2 Unaufhaltsam: winTie erst ab Serie ≥ 3", () => {
    expect(PERK_DEFS.L2.winTie({ winStreak: 3 })).toBe(true);
    expect(PERK_DEFS.L2.winTie({ winStreak: 2 })).toBe(false);
  });
  it("L3 Letztes Aufbäumen: +6 bei ≤ 25 % Leben (auch exakt 25 %), sonst 0", () => {
    expect(PERK_DEFS.L3.cardBonus({ life: 500, maxLife: 2000 })).toBe(6); // 25 %
    expect(PERK_DEFS.L3.cardBonus({ life: 400, maxLife: 2000 })).toBe(6); // < 25 %
    expect(PERK_DEFS.L3.cardBonus({ life: 501, maxLife: 2000 })).toBe(0); // > 25 %
  });
  it("L6 Raserei: verdoppelt NUR den Tempo-Faktor (via tempoScoreMultFor)", () => {
    expect(tempoScoreMultFor([], 150)).toBeCloseTo(1.75);       // 1 + 150×0.005
    expect(tempoScoreMultFor(["L6"], 150)).toBeCloseTo(2.5);    // Faktor ×2
    expect(PERK_DEFS.L6.extraDamageTaken()).toBe(2);
  });
});

describe("Hohe-Karte-Schwelle konsolidiert auf 8 — D3/C2/D7 (#34)", () => {
  it("D3, C2 und D7 lösen ab Kartenwert 8 aus (und nicht bei 7)", () => {
    expect(PERK_DEFS.D3.scoreFlat({ winValue: 8 })).toBe(60);
    expect(PERK_DEFS.D3.scoreFlat({ winValue: 7 })).toBe(0);
    expect(PERK_DEFS.C2.healOnWin({ winValue: 8 })).toBe(6);
    expect(PERK_DEFS.C2.healOnWin({ winValue: 7 })).toBe(0);
    expect(critChanceFor(["D7"], { winValue: 8 })).toBeCloseTo(0.35);
    expect(critChanceFor(["D7"], { winValue: 7 })).toBe(0);
  });
});

describe("baseScoreMultFor (Header-Chip #37 / StatusRail #23 — geteilte Quelle)", () => {
  it("neutral 1 ohne Perks/Tempo; D1 = ×1,15", () => {
    expect(baseScoreMultFor([], {})).toBeCloseTo(1);
    expect(baseScoreMultFor(["D1"], {})).toBeCloseTo(1.15);
  });
  it("nutzt die NÄCHSTE Serie (winStreak+1) für D2 und erfasst Tempo/L6", () => {
    expect(baseScoreMultFor(["D2"], { winStreak: 4 })).toBeCloseTo(1.5);   // (4+1)×0,1
    expect(baseScoreMultFor(["L6"], { speedPct: 100 })).toBeCloseTo(2.0);  // Tempo-Faktor ×2
    expect(baseScoreMultFor(["D1", "D2"], { winStreak: 4, speedPct: 100 })).toBeCloseTo(2.5875); // 1,15×1,5×1,5 (Tempo 100 %)
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
