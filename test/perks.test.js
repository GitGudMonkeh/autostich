import { describe, it, expect } from "vitest";
import { buildDeck, makeRng } from "../src/game/deck.js";
import { PERK_DEFS, PERK_LIST, buildOffer, critChanceFor, comboMultFor, isLegendary, tempoScoreMultFor, baseScoreMultFor, streakBaseMult } from "../src/game/perks.js";
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

  // ---- Legendär / Rarität (3-Stufen seit #71: Legendaries ab Level 5) ----
  it("bietet unter Level 5 KEINE Legendaries (Level-Gate)", () => {
    for (let s = 0; s < 20; s++) {
      expect(buildOffer([], makeRng(s), 3, 4).some(isLegendary)).toBe(false);
    }
  });
  it("ab Level 5 erscheinen Legendaries — höchstens EINER je Angebot", () => {
    // Nur Legendaries übrig → das Angebot enthält genau 1 (max 1 pro Angebot), und der ist legendär.
    const owned = PERK_LIST.filter((p) => !isLegendary(p.id)).map((p) => p.id);
    const off = buildOffer(owned, makeRng(3), 3, 5);
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
  it("L3 Letztes Aufbäumen: +3 bei ≤ 25 % Leben (auch exakt 25 %), sonst 0 (#71)", () => {
    expect(PERK_DEFS.L3.cardBonus({ life: 500, maxLife: 2000 })).toBe(3); // 25 %
    expect(PERK_DEFS.L3.cardBonus({ life: 400, maxLife: 2000 })).toBe(3); // < 25 %
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

describe("streakBaseMult (Basis-Siegesserie #39)", () => {
  it("+2 %/Stufe, gedeckelt bei +30 % (Cap ab Serie 15)", () => {
    expect(streakBaseMult(0)).toBeCloseTo(1);
    expect(streakBaseMult(2)).toBeCloseTo(1.04);
    expect(streakBaseMult(12)).toBeCloseTo(1.24);
    expect(streakBaseMult(15)).toBeCloseTo(1.30);  // Cap erreicht
    expect(streakBaseMult(50)).toBeCloseTo(1.30);  // darüber unverändert
  });
});

describe("baseScoreMultFor (Header-Chip #37 / StatusRail #23 — geteilte Quelle)", () => {
  it("Serie 0 → ×1,00 (aktuelle Serie, kein +1); D1 verstärkt streak-unabhängig", () => {
    expect(baseScoreMultFor([], {})).toBeCloseTo(1);                // Serie 0 → keine Serie, kein Bonus
    expect(baseScoreMultFor(["D1"], {})).toBeCloseTo(1.15);         // D1 wirkt immer
  });
  it("nutzt die AKTUELLE Serie; D2 & Tempo/L6 multiplizieren obendrauf", () => {
    expect(baseScoreMultFor(["D2"], { winStreak: 4 })).toBeCloseTo(1.512);  // streakBaseMult(4)=1,08 × comboMult(4)=1,4
    expect(baseScoreMultFor(["L6"], { speedPct: 100 })).toBeCloseTo(2.0);   // 1,00 × Tempo(2,0)
    expect(baseScoreMultFor(["D1", "D2"], { winStreak: 4, speedPct: 100 })).toBeCloseTo(2.6082); // 1,08×1,15×1,4×1,5
  });
  it("Siegesserie hebt den Mult AUCH ohne D2 (#39); D2 verstärkt zusätzlich", () => {
    const s0 = baseScoreMultFor([], { winStreak: 0 });
    const s5 = baseScoreMultFor([], { winStreak: 5 });
    expect(s0).toBeCloseTo(1);                                             // Serie 0 → ×1,00
    expect(s5).toBeGreaterThan(s0);                                        // ohne D2: Serie hebt den Mult
    expect(baseScoreMultFor(["D2"], { winStreak: 5 })).toBeGreaterThan(s5); // D2 verstärkt weiter
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

describe("Neue Normal-Perks (#71)", () => {
  const sumV = (d) => d.reduce((s, c) => s + c.value, 0);
  it("A6 Mittelklasse: Werte 4–7 je +2 (Startdeck 16 Karten → +32)", () => {
    expect(sumV(PERK_DEFS.A6.onPick(buildDeck())) - sumV(buildDeck())).toBe(32);
  });
  it("A7 Spitzenförderung: die vier höchsten Karten je +6 (+24; vier 10er → 16)", () => {
    expect(sumV(PERK_DEFS.A7.onPick(buildDeck())) - sumV(buildDeck())).toBe(24);
    expect(PERK_DEFS.A7.onPick(buildDeck()).filter((c) => c.value === 16)).toHaveLength(4);
  });
  it("A8 Nachzügler: die vier niedrigsten Karten je +6 (+24; vier 1er → 7)", () => {
    expect(sumV(PERK_DEFS.A8.onPick(buildDeck())) - sumV(buildDeck())).toBe(24);
    expect(PERK_DEFS.A8.onPick(buildDeck()).filter((c) => c.value === 7 && c.baseRank === 1)).toHaveLength(4);
  });
  it("B6 Knappe Kiste: +100 nur bei genau 1 Wertpunkt Vorsprung", () => {
    expect(PERK_DEFS.B6.scoreFlat({ margin: 1 })).toBe(100);
    expect(PERK_DEFS.B6.scoreFlat({ margin: 2 })).toBe(0);
    expect(PERK_DEFS.B6.scoreFlat({ margin: 0 })).toBe(0);
  });
  it("B7 Durchbruch: +10 ab 5 Stichen ohne Sieg", () => {
    expect(PERK_DEFS.B7.cardBonus({ sinceWin: 4 })).toBe(0);
    expect(PERK_DEFS.B7.cardBonus({ sinceWin: 5 })).toBe(10);
    expect(PERK_DEFS.B7.cardBonus({ sinceWin: 8 })).toBe(10);
  });
  it("C6 Trotz: −1 unter 50 %, −2 bei ≤ 25 % Leben", () => {
    expect(PERK_DEFS.C6.dmgReduce({ life: 1500, maxLife: 2000 })).toBe(0); // 75 %
    expect(PERK_DEFS.C6.dmgReduce({ life: 900, maxLife: 2000 })).toBe(1);  // 45 %
    expect(PERK_DEFS.C6.dmgReduce({ life: 500, maxLife: 2000 })).toBe(2);  // 25 %
  });
});

describe("Durchbruch (B7) — sinceWin-Zähler in der Engine (#71)", () => {
  it("+10 auf die Karte nach 5 Stichen ohne Sieg", () => {
    // sinceWin=5 im State → Durchbruch-cardBonus greift für DIESEN Stich (Karte 3 → 13).
    expect(effectivePlayerValue(3, ["B7"], { sinceWin: 5 })).toBe(13);
    expect(effectivePlayerValue(3, ["B7"], { sinceWin: 4 })).toBe(3);
  });
});

describe("Seltene Perks (#71, Phase 2a)", () => {
  const sumV = (d) => d.reduce((s, c) => s + c.value, 0);
  it("A9 Farbduell: eine Farbe +3, eine −1 → netto +20", () => {
    expect(sumV(PERK_DEFS.A9.onPick(buildDeck(), makeRng(2))) - sumV(buildDeck())).toBe(20);
  });
  it("A10 Verdichtung: im frischen Deck kommt jeder Wert 4× vor → alle +1 (+40)", () => {
    expect(sumV(PERK_DEFS.A10.onPick(buildDeck())) - sumV(buildDeck())).toBe(40);
  });
  it("D10 Übermacht: ×2 ab 8 Wertpunkten Vorsprung, sonst ×1", () => {
    expect(PERK_DEFS.D10.scoreMult({ margin: 8 })).toBe(2);
    expect(PERK_DEFS.D10.scoreMult({ margin: 7 })).toBe(1);
  });
  it("D11 Kritische Heilung: healOnCrit = 5", () => {
    expect(PERK_DEFS.D11.healOnCrit()).toBe(5);
  });
  it("E6 Drehzahl: +5 % Crit je 30 % permanentes Tempo", () => {
    expect(PERK_DEFS.E6.critChance({ speedPct: 150 })).toBeCloseTo(0.25);
    expect(PERK_DEFS.E6.critChance({ speedPct: 90 })).toBeCloseTo(0.15);
    expect(PERK_DEFS.E6.critChance({ speedPct: 29 })).toBe(0);
  });
  it("E7 Kontrollverlust: ×1,3 ab 100 % Tempo + 1 Zusatzschaden", () => {
    expect(PERK_DEFS.E7.scoreMult({ speedPct: 100 })).toBe(1.3);
    expect(PERK_DEFS.E7.scoreMult({ speedPct: 90 })).toBe(1);
    expect(PERK_DEFS.E7.extraDamageTaken()).toBe(1);
  });
  it("E8 Schnellschuss: +150 auf jeden 10. Stich", () => {
    expect(PERK_DEFS.E8.scoreFlat({ trickNo: 10 })).toBe(150);
    expect(PERK_DEFS.E8.scoreFlat({ trickNo: 11 })).toBe(0);
  });
  it("Rares erscheinen erst ab RARE_MIN_LEVEL (2)", () => {
    const rares = PERK_LIST.filter((p) => p.rarity === "rare").map((p) => p.id);
    const owned = PERK_LIST.filter((p) => !rares.includes(p.id)).map((p) => p.id); // nur Rares übrig
    expect(buildOffer(owned, makeRng(3), 3, 1)).toHaveLength(0);           // Level 1 < 2 → keine Rares
    const off = buildOffer(owned, makeRng(3), 3, 2);                       // ab Level 2 → Rares
    expect(off.length).toBeGreaterThan(0);
    expect(off.every((id) => PERK_DEFS[id].rarity === "rare")).toBe(true);
  });
});
