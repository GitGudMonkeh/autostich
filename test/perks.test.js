import { describe, it, expect } from "vitest";
import { buildDeck, makeRng } from "../src/game/deck.js";
import { PERK_DEFS, PERK_LIST, buildOffer, critChanceFor, critChanceRawFor, isLegendary, baseScoreMultFor, streakBaseMult, isLayoutPerk, layoutPerks } from "../src/game/perks.js";
import { effectivePlayerValue } from "../src/game/engine.js";

describe("Perks — Deck-Modifikationen (Kat. A)", () => {
  it("A1 Starke Fünfen: alle Wert-5 → +4 (Wert 9)", () => {
    const d = PERK_DEFS.A1.onPick(buildDeck());
    expect(d.filter((c) => c.value === 5)).toHaveLength(0);
    expect(d.filter((c) => c.value === 9 && c.baseRank === 5)).toHaveLength(4); // die 4 beförderten 5er
  });

  it("A2 Gerade Stärke: gerade Werte +1, ungerade unverändert", () => {
    const d = PERK_DEFS.A2.onPick(buildDeck());
    const r2 = d.find((c) => c.id === "R2");
    const r3 = d.find((c) => c.id === "R3");
    expect(r2.value).toBe(3); // gerade → +1
    expect(r3.value).toBe(3); // ungerade → unverändert
  });

  it("A5 Kleine ganz groß: vier unterschiedliche Karten (ursprünglich 1–3) je +5", () => {
    const base = buildDeck();
    const d = PERK_DEFS.A5.onPick(base, makeRng(3));
    const changedIdx = base.map((_, i) => i).filter((i) => d[i].value !== base[i].value);
    expect(changedIdx).toHaveLength(4);            // vier Karten
    expect(new Set(changedIdx).size).toBe(4);      // unterschiedlich
    for (const i of changedIdx) {
      expect(base[i].baseRank).toBeGreaterThanOrEqual(1); // Auswahl über den ursprünglichen Wert
      expect(base[i].baseRank).toBeLessThanOrEqual(3);
      expect(d[i].value).toBe(base[i].value + 5);
    }
  });

  it("Deck-Mods sind immutabel (Original-Deck unverändert)", () => {
    const base = buildDeck();
    PERK_DEFS.A1.onPick(base);
    expect(base.filter((c) => c.value === 5)).toHaveLength(4);
  });
});

describe("Perks — cardBonus (Kat. B) via effectivePlayerValue", () => {
  it("B1 Gegenangriff: +4 nur nach einer Niederlage", () => {
    expect(effectivePlayerValue(5, ["B1"], { lostLastTrick: true })).toBe(9);
    expect(effectivePlayerValue(5, ["B1"], { lostLastTrick: false })).toBe(5);
  });

  it("B3 Starker Auftakt: +4 in den ersten drei Stichen des Durchlaufs", () => {
    expect(effectivePlayerValue(4, ["B3"], { posInCycle: 0 })).toBe(8);
    expect(effectivePlayerValue(4, ["B3"], { posInCycle: 2 })).toBe(8);
    expect(effectivePlayerValue(4, ["B3"], { posInCycle: 3 })).toBe(4);
  });

  it("B5 Initiative: kein Kartenbonus mehr — nur winTieAfterLoss-Flag (§22.6)", () => {
    expect(effectivePlayerValue(3, ["B5"], { lostLastTrick: true })).toBe(3);
    expect(PERK_DEFS.B5.cardBonus).toBeUndefined();
    expect(PERK_DEFS.B5.winTieAfterLoss).toBe(true);
  });

  it("Boni mehrerer Perks summieren sich", () => {
    const v = effectivePlayerValue(2, ["B1", "B4"], { lostLastTrick: true, posInCycle: 9 });
    expect(v).toBe(2 + 4 + 8); // B1 +4, B4 +8 (Position 10)
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

  // ---- Rarität: kein Level-Gate mehr (Perk nach jeder Runde) — nur gewichtet + Legendary-Cap ----
  it("höchstens EIN Legendary je Angebot", () => {
    // Nur Legendaries übrig → das Angebot enthält genau 1 (max 1 pro Angebot), und der ist legendär.
    const owned = PERK_LIST.filter((p) => !isLegendary(p.id)).map((p) => p.id);
    const off = buildOffer(owned, makeRng(3), 3);
    expect(off).toHaveLength(1);
    expect(isLegendary(off[0])).toBe(true);
  });
  it("gewichtete Auswahl ist bei festem Seed deterministisch", () => {
    expect(buildOffer([], makeRng(7), 3)).toEqual(buildOffer([], makeRng(7), 3));
  });
  it("bereits gewählte Legendaries werden nicht erneut angeboten", () => {
    expect(buildOffer(["L1"], makeRng(1), 3)).not.toContain("L1");
  });
});

describe("critChanceFor / critChanceRawFor (V2: kein Perk trägt Crit-Chance — Stat/Blitz in der Engine)", () => {
  it("kein Perk-Beitrag → Roh-Chance 0 (Stat/Blitz addiert die Engine obendrauf)", () => {
    expect(critChanceRawFor(["L4", "L5", "D14"], {})).toBe(0);
    expect(critChanceFor(["L4", "L5", "D14"], {})).toBe(0);
  });
  it("critChanceFor klemmt auf [0,1]", () => {
    expect(critChanceFor([], {})).toBe(0);
  });
});

describe("Legendäre Perks — Hooks (V2 §22.6 L)", () => {
  it("alle elf L-Perks sind als legendary markiert", () => {
    for (const id of ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11"]) expect(isLegendary(id)).toBe(true);
    expect(isLegendary("D1")).toBe(false);
  });
  it("L1 Überladung: permMod +6 auf die gewählten Karten", () => {
    const deck = buildDeck().slice(0, 3);
    const out = PERK_DEFS.L1.permMod(deck, [0, 1, 2], [deck[0].id, deck[1].id]);
    expect(out[0].value).toBe(deck[0].value + 6);
    expect(out[1].value).toBe(deck[1].value + 6);
    expect(out[2].value).toBe(deck[2].value); // nicht gewählt
  });
  it("L2 Unaufhaltsam: +2 je Serienpunkt", () => {
    expect(PERK_DEFS.L2.cardBonus({ winStreak: 0 })).toBe(0);
    expect(PERK_DEFS.L2.cardBonus({ winStreak: 3 })).toBe(6);
  });
  it("L3 Letztes Aufbäumen: +5 auf Position 36–40", () => {
    expect(PERK_DEFS.L3.cardBonus({ posInCycle: 35 })).toBe(5);
    expect(PERK_DEFS.L3.cardBonus({ posInCycle: 39 })).toBe(5);
    expect(PERK_DEFS.L3.cardBonus({ posInCycle: 34 })).toBe(0);
  });
  it("L6 Raserei: +2 je Serienpunkt, gedeckelt bei +10", () => {
    expect(PERK_DEFS.L6.cardBonus({ winStreak: 3 })).toBe(6);
    expect(PERK_DEFS.L6.cardBonus({ winStreak: 9 })).toBe(10); // Deckel
  });
  it("L7 Königsmacher: +5, wenn Segment-Höchste", () => {
    expect(PERK_DEFS.L7.cardBonus({ isSegmentHigh: true })).toBe(5);
    expect(PERK_DEFS.L7.cardBonus({ isSegmentHigh: false })).toBe(0);
  });
  it("L9 Blutvertrag: permMod −2/gewählt, +6/Nachfolger", () => {
    const deck = buildDeck().slice(0, 3);
    const out = PERK_DEFS.L9.permMod(deck, [0, 1, 2], [deck[0].id]);
    expect(out[0].value).toBe(Math.max(0, deck[0].value - 2));
    expect(out[1].value).toBe(deck[1].value + 6); // direkter Nachfolger
  });
  it("Marker-Legendaries: L4 critValueGain, L5 randomTarget/jackpotScore, L8 swapExtremes, L10 successorCrit, L11 repeatPos", () => {
    expect(PERK_DEFS.L4.critValueGain).toBe(4);
    expect(PERK_DEFS.L5.randomTarget).toBe(4);
    expect(PERK_DEFS.L5.jackpotScore).toBe(1000);
    expect(PERK_DEFS.L8.swapExtremes).toBe(true);
    expect(PERK_DEFS.L10.successorCrit).toBe(true);
    expect(PERK_DEFS.L11.repeatPos).toBe(true);
  });
});

describe("Hohe-Karte-Schwelle konsolidiert auf 8 — D3/D7 (#34)", () => {
  it("D3/D7 lösen ab Kartenwert 8 aus (und nicht bei 7)", () => {
    expect(PERK_DEFS.D3.scoreFlat({ winValue: 8 })).toBe(125);
    expect(PERK_DEFS.D3.scoreFlat({ winValue: 7 })).toBe(0);
    expect(PERK_DEFS.D7.scoreFlatOnCrit({ winValue: 8 })).toBe(300);
    expect(PERK_DEFS.D7.scoreFlatOnCrit({ winValue: 7 })).toBe(0);
  });
});

describe("streakBaseMult (Basis-Siegesserie #39)", () => {
  it("+2 %/Stufe, gedeckelt bei +150 % (Cap ab Serie 75, #100)", () => {
    expect(streakBaseMult(0)).toBeCloseTo(1);
    expect(streakBaseMult(2)).toBeCloseTo(1.04);
    expect(streakBaseMult(15)).toBeCloseTo(1.30);  // +30 % (nicht mehr Cap)
    expect(streakBaseMult(50)).toBeCloseTo(2.00);  // +100 %
    expect(streakBaseMult(75)).toBeCloseTo(2.50);  // Cap +150 % erreicht
    expect(streakBaseMult(100)).toBeCloseTo(2.50); // darüber unverändert
  });
});

describe("baseScoreMultFor (Header-Chip #37 — V2: nur noch Basis-Serie #39)", () => {
  it("Serie 0 → ×1,00; D-Perks multiplizieren nicht mehr (Flat-Score)", () => {
    expect(baseScoreMultFor([], {})).toBeCloseTo(1);
    expect(baseScoreMultFor(["D1", "D2"], {})).toBeCloseTo(1); // D flach → kein Multiplikator
  });
  it("Siegesserie hebt den Mult (#39): +2 %/Stufe bis Cap +150 % (#100)", () => {
    expect(baseScoreMultFor([], { winStreak: 0 })).toBeCloseTo(1);
    expect(baseScoreMultFor([], { winStreak: 5 })).toBeCloseTo(1.10);
    expect(baseScoreMultFor([], { winStreak: 20 })).toBeCloseTo(1.40); // nicht mehr gedeckelt
    expect(baseScoreMultFor([], { winStreak: 80 })).toBeCloseTo(2.50); // Cap +150 %
  });
});

describe("Layout-Perks (#95): Positions-/Formations-relevante Perks", () => {
  it("alle E-Werkzeuge zählen als Layout-Perk", () => {
    PERK_LIST.filter((p) => p.cat === "E").forEach((p) => expect(isLayoutPerk(p.id)).toBe(true));
  });
  it("kuratierte B/C/D/L sind enthalten, layout-fremde Perks nicht", () => {
    ["B4", "B6", "B9", "C1", "C8", "D1", "L3", "L7", "L11"].forEach((id) => expect(isLayoutPerk(id)).toBe(true));
    ["A1", "B1", "B2", "C2", "D2", "D6", "L5"].forEach((id) => expect(isLayoutPerk(id)).toBe(false));
  });
  it("layoutPerks filtert die gehaltenen Perks in Reihenfolge", () => {
    expect(layoutPerks(["A1", "E1", "D2", "C8", "L7"])).toEqual(["E1", "C8", "L7"]);
    expect(layoutPerks([])).toEqual([]);
  });
});

describe("Neue Normal-Perks (#71)", () => {
  const sumV = (d) => d.reduce((s, c) => s + c.value, 0);
  it("A6 Mittelklasse: Werte 4–7 je +1 (Startdeck 16 Karten → +16)", () => {
    expect(sumV(PERK_DEFS.A6.onPick(buildDeck())) - sumV(buildDeck())).toBe(16);
  });
  it("A7 Spitzenförderung: die vier höchsten Karten je +4 (+16; vier 10er → 14)", () => {
    expect(sumV(PERK_DEFS.A7.onPick(buildDeck())) - sumV(buildDeck())).toBe(16);
    expect(PERK_DEFS.A7.onPick(buildDeck()).filter((c) => c.value === 14)).toHaveLength(4);
  });
  it("A8 Nachzügler: die vier niedrigsten Karten je +5 (+20; vier 1er → 6)", () => {
    expect(sumV(PERK_DEFS.A8.onPick(buildDeck())) - sumV(buildDeck())).toBe(20);
    expect(PERK_DEFS.A8.onPick(buildDeck()).filter((c) => c.value === 6 && c.baseRank === 1)).toHaveLength(4);
  });
  it("B6 Knappe Kiste: +2 temp Wert, wenn die Karte in einer Wiederholung liegt", () => {
    const inWied = { posForm: { formations: [{ type: "wiederholung", ordinal: 2, factor: 1.3 }] } };
    expect(PERK_DEFS.B6.cardBonus(inWied)).toBe(2);
    expect(PERK_DEFS.B6.cardBonus({ posForm: { formations: [{ type: "treppe", ordinal: 3 }] } })).toBe(0);
    expect(PERK_DEFS.B6.cardBonus({})).toBe(0);
  });
  it("B7 Durchbruch: +10 ab 5 Stichen ohne Sieg", () => {
    expect(PERK_DEFS.B7.cardBonus({ sinceWin: 4 })).toBe(0);
    expect(PERK_DEFS.B7.cardBonus({ sinceWin: 5 })).toBe(10);
    expect(PERK_DEFS.B7.cardBonus({ sinceWin: 8 })).toBe(10);
  });
  it("C3 Leibwache: +5, wenn Rolle und der Vorgänger verlor", () => {
    expect(PERK_DEFS.C3.cardBonus({ isRole: (id) => id === "C3", lastResult: "loss" })).toBe(5);
    expect(PERK_DEFS.C3.cardBonus({ isRole: (id) => id === "C3", lastResult: "win" })).toBe(0);
    expect(PERK_DEFS.C3.cardBonus({ isRole: () => false, lastResult: "loss" })).toBe(0); // keine Rolle
  });
  it("C6 Finisher: +5 auf der letzten Segment-Position, wenn Rolle", () => {
    expect(PERK_DEFS.C6.cardBonus({ isRole: (id) => id === "C6", posInCycle: 4 })).toBe(5);
    expect(PERK_DEFS.C6.cardBonus({ isRole: (id) => id === "C6", posInCycle: 9 })).toBe(5);
    expect(PERK_DEFS.C6.cardBonus({ isRole: (id) => id === "C6", posInCycle: 3 })).toBe(0);
    expect(PERK_DEFS.C6.cardBonus({ isRole: () => false, posInCycle: 4 })).toBe(0);
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
  it("D10 Übermacht: +350 Score ab 8 Wertpunkten Vorsprung, sonst 0", () => {
    expect(PERK_DEFS.D10.scoreFlat({ margin: 8 })).toBe(350);
    expect(PERK_DEFS.D10.scoreFlat({ margin: 7 })).toBe(0);
  });
  it("D11 Kritische Ernte: +250 Crit-Flat mit aktiver Formation", () => {
    expect(PERK_DEFS.D11.scoreFlatOnCrit({ hasFormation: true })).toBe(250);
    expect(PERK_DEFS.D11.scoreFlatOnCrit({ hasFormation: false })).toBe(0);
  });
  it("E-Werkzeuge sind reine Marker (Wirkung in computeFormations); E10 hat extraSwap", () => {
    for (const id of ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"]) {
      expect(PERK_DEFS[id].cat).toBe("E");
      expect(PERK_DEFS[id].cardBonus).toBeUndefined();
      expect(PERK_DEFS[id].scoreFlat).toBeUndefined();
      expect(PERK_DEFS[id].critChance).toBeUndefined();
    }
    expect(PERK_DEFS.E10.extraSwap).toBe(1);
  });
  it("V2 §22.4: alle A–E sind normal (keine Rares mehr); nur L ist legendär", () => {
    for (const p of PERK_LIST) {
      if (/^L\d/.test(p.id)) expect(p.rarity).toBe("legendary");
      else expect(p.rarity || "common").toBe("common");
    }
  });
});

describe("Seltene Perks (#71, Phase 2b — Historie-Hooks)", () => {
  it("B8 Revanche: +7 ab 2 Niederlagen in Folge", () => {
    expect(PERK_DEFS.B8.cardBonus({ lossStreak: 2 })).toBe(7);
    expect(PERK_DEFS.B8.cardBonus({ lossStreak: 1 })).toBe(0);
  });
  it("D12 Präzision: +400 bei gleichem Wert wie letzter Sieg (erster Sieg 0)", () => {
    expect(PERK_DEFS.D12.scoreFlat({ winValue: 8, lastWinValue: 8 })).toBe(400);
    expect(PERK_DEFS.D12.scoreFlat({ winValue: 8, lastWinValue: 7 })).toBe(0);
    expect(PERK_DEFS.D12.scoreFlat({ winValue: 8, lastWinValue: null })).toBe(0);
  });
  it("D13 Wechselspiel: +200 bei Sieg direkt nach einer Niederlage", () => {
    expect(PERK_DEFS.D13.scoreFlat({ lastResult: "loss" })).toBe(200);
    expect(PERK_DEFS.D13.scoreFlat({ lastResult: "win" })).toBe(0);
  });
});

describe("Seltene Perks (#71, Phase 2c — Crit-Historie-Hooks)", () => {
  it("D14 Crit-Folge: +200 bei Sieg direkt nach einem Crit", () => {
    expect(PERK_DEFS.D14.scoreFlat({ critFollowArmed: true })).toBe(200);
    expect(PERK_DEFS.D14.scoreFlat({ critFollowArmed: false })).toBe(0);
  });
  it("D15 Fehlzündung: zahlt die akkumulierte Score-Ladung bei Crit aus", () => {
    expect(PERK_DEFS.D15.scoreFlatOnCrit({ misfireScore: 120 })).toBe(120);
    expect(PERK_DEFS.D15.scoreFlatOnCrit({})).toBe(0);
  });
  it("D16 Schwachstellenanalyse: +300 nach klarer Niederlage (gerüstet)", () => {
    expect(PERK_DEFS.D16.scoreFlat({ weaknessArmed: true })).toBe(300);
    expect(PERK_DEFS.D16.scoreFlat({ weaknessArmed: false })).toBe(0);
  });
});

describe("Kartenrollen — Hooks (V2 §22.6 C)", () => {
  it("C1 Vorhut: +3 auf Position 1–5, wenn Rolle", () => {
    expect(PERK_DEFS.C1.cardBonus({ isRole: (id) => id === "C1", posInCycle: 0 })).toBe(3);
    expect(PERK_DEFS.C1.cardBonus({ isRole: (id) => id === "C1", posInCycle: 4 })).toBe(3);
    expect(PERK_DEFS.C1.cardBonus({ isRole: (id) => id === "C1", posInCycle: 5 })).toBe(0);
    expect(PERK_DEFS.C1.cardBonus({ isRole: () => false, posInCycle: 0 })).toBe(0);
  });
  it("C2 Triumph: +2 nur wenn armiert (triumphActive)", () => {
    expect(PERK_DEFS.C2.cardBonus({ triumphActive: true })).toBe(2);
    expect(PERK_DEFS.C2.cardBonus({ triumphActive: false })).toBe(0);
  });
  it("C7 Überlebensvorteil: +3, wenn die Karte Segment-Tiefste ist", () => {
    expect(PERK_DEFS.C7.cardBonus({ isSegmentLow: true })).toBe(3);
    expect(PERK_DEFS.C7.cardBonus({ isSegmentLow: false })).toBe(0);
  });
  it("Ziel-Perks tragen needsTarget; C4/C5 relay; C9 sacrificeMod", () => {
    expect(PERK_DEFS.C1.needsTarget).toBe(3);
    expect(PERK_DEFS.C5.needsTarget).toBe(1);
    expect(PERK_DEFS.C4.relay).toBe(1);
    expect(PERK_DEFS.C5.relay).toBe(2);
    expect(PERK_DEFS.C9.needsTarget).toBe(1);
    expect(PERK_DEFS.C9.sacrificeMod).toBe(true);
  });
});

describe("Seltene Perks (#71, Phase 2f — Historie-Hooks)", () => {
  it("B9 Perfekte Folge: temp Wert nach Treppen-Position (1→+1 … 4+→+4)", () => {
    const treppe = (ord) => ({ posForm: { formations: [{ type: "treppe", ordinal: ord, factor: 1.25 }] } });
    expect(PERK_DEFS.B9.cardBonus(treppe(1))).toBe(1);
    expect(PERK_DEFS.B9.cardBonus(treppe(2))).toBe(2);
    expect(PERK_DEFS.B9.cardBonus(treppe(3))).toBe(3);
    expect(PERK_DEFS.B9.cardBonus(treppe(4))).toBe(4);
    expect(PERK_DEFS.B9.cardBonus(treppe(5))).toBe(4); // Deckel
    expect(PERK_DEFS.B9.cardBonus({ posForm: { formations: [{ type: "farbblock", ordinal: 3 }] } })).toBe(0);
  });
  it("D17 Farbserie: +100 je weiterem Sieg gleicher Farbe, gedeckelt bei 400", () => {
    expect(PERK_DEFS.D17.scoreFlat({ suitStreak: 1 })).toBe(0);
    expect(PERK_DEFS.D17.scoreFlat({ suitStreak: 2 })).toBe(100);
    expect(PERK_DEFS.D17.scoreFlat({ suitStreak: 3 })).toBe(200);
    expect(PERK_DEFS.D17.scoreFlat({ suitStreak: 5 })).toBe(400);
    expect(PERK_DEFS.D17.scoreFlat({ suitStreak: 9 })).toBe(400); // Deckel
  });
  it("D18 Volles Haus: +750 auf der letzten Segment-Position mit 4 Vorsiegen", () => {
    expect(PERK_DEFS.D18.scoreFlat({ posInCycle: 4, recentWinCount: 4 })).toBe(750);
    expect(PERK_DEFS.D18.scoreFlat({ posInCycle: 9, recentWinCount: 4 })).toBe(750);
    expect(PERK_DEFS.D18.scoreFlat({ posInCycle: 3, recentWinCount: 4 })).toBe(0); // nicht Segment-Ende
    expect(PERK_DEFS.D18.scoreFlat({ posInCycle: 4, recentWinCount: 3 })).toBe(0); // nur 3 Vorsiege
  });
});
