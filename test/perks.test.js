import { describe, it, expect } from "vitest";
import { buildDeck } from "../src/game/deck.js";
import { PERK_DEFS, PERK_LIST, critChanceFor, critChanceRawFor, isLegendary, baseScoreMultFor, streakBaseMult, isLayoutPerk, layoutPerks } from "../src/game/perks.js";
import { effectivePlayerValue } from "../src/game/engine.js";

// Kat.-A-Deck-Mods (früher A1–A10 onPick) sind zu KUMULATIVEN Familien migriert (#167) — die
// Deck-Effekte je Stufe sind in test/families.test.js geprüft (onPick direkt), der Reducer-Pick +
// Ziel-Fluss in test/families-engine.test.js.

describe("effectivePlayerValue — cardBonus-Summation", () => {
  // Kat.-B-Wertboni sind zu Familien migriert (#167) — Engine-Integration in families-engine.test.js.
  // Hier bleibt die generische Summation der flachen cardBonus-Hooks (C-Rollen) geprüft.
  it("summiert die cardBonus-Hooks der gehaltenen Perks auf den Basiswert", () => {
    expect(effectivePlayerValue(5, ["C7"], { isSegmentLow: true })).toBe(8);  // C7 +3
    expect(effectivePlayerValue(5, ["C7"], { isSegmentLow: false })).toBe(5); // Bedingung nicht erfüllt
  });
});

// Das Angebot läuft jetzt über buildPerkOffer (gemischt Familien + flache Perks) — Tests dort in
// test/families-engine.test.js (inkl. Legendär-Wurf). Das alte flache buildOffer wurde entfernt (#167 Schritt 4).

describe("critChanceFor / critChanceRawFor (V2: kein Perk trägt Crit-Chance — Stat/Blitz in der Engine)", () => {
  it("kein Perk-Beitrag → Roh-Chance 0 (Stat/Blitz addiert die Engine obendrauf)", () => {
    expect(critChanceRawFor(["L4", "L5"], {})).toBe(0);
    expect(critChanceFor(["L4", "L5"], {})).toBe(0);
  });
  it("critChanceFor klemmt auf [0,1]", () => {
    expect(critChanceFor([], {})).toBe(0);
  });
});

describe("Legendäre Perks — Hooks (V2 §22.6 L)", () => {
  it("die zehn verbliebenen L-Perks sind als legendary markiert (L7 entfernt, #162)", () => {
    for (const id of ["L1", "L2", "L3", "L4", "L5", "L6", "L8", "L9", "L10", "L11"]) expect(isLegendary(id)).toBe(true);
    expect(PERK_DEFS.L7).toBeUndefined(); // Königsmacher ersatzlos entfernt (Spec §9)
    expect(isLegendary("C1")).toBe(false);
  });
  it("L1 Überladung: permMod +6 auf die gewählten Karten", () => {
    const deck = buildDeck().slice(0, 3);
    const out = PERK_DEFS.L1.permMod(deck, [0, 1, 2], [deck[0].id, deck[1].id]);
    expect(out[0].value).toBe(deck[0].value + 6);
    expect(out[1].value).toBe(deck[1].value + 6);
    expect(out[2].value).toBe(deck[2].value); // nicht gewählt
  });
  it("L2 Unaufhaltsam: flach +4 solange die Serie läuft, 0 ohne Serie (#115)", () => {
    expect(PERK_DEFS.L2.cardBonus({ winStreak: 0 })).toBe(0);
    expect(PERK_DEFS.L2.cardBonus({ winStreak: 3 })).toBe(4);
    expect(PERK_DEFS.L2.cardBonus({ winStreak: 9 })).toBe(4); // flach, kein Snowball
  });
  it("L3 Letztes Aufbäumen: +5 auf Position 36–40", () => {
    expect(PERK_DEFS.L3.cardBonus({ posInCycle: 35 })).toBe(5);
    expect(PERK_DEFS.L3.cardBonus({ posInCycle: 39 })).toBe(5);
    expect(PERK_DEFS.L3.cardBonus({ posInCycle: 34 })).toBe(0);
  });
  it("L6 Raserei: +5 % Crit-Chance je Serienpunkt + Überschuss→Crit-Schaden (kein cardBonus mehr) (#115)", () => {
    expect(PERK_DEFS.L6.cardBonus).toBeUndefined();                       // kein Wertbonus mehr
    expect(PERK_DEFS.L6.critChance({ winStreak: 5 })).toBeCloseTo(0.25);  // +5 %/Serienpunkt
    expect(PERK_DEFS.L6.critMultBonus({ rawCrit: 1.5 })).toBeCloseTo(0.5); // Überschuss über 100 %
    expect(PERK_DEFS.L6.critMultBonus({ rawCrit: 3 })).toBeCloseTo(1);     // Cap +100 %
    expect(PERK_DEFS.L6.critMultBonus({ rawCrit: 0.8 })).toBe(0);          // unter 100 % → 0
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

// D-Score-Schwellen (früher D3/D7) sind zu den Familien D_HIGH/D_SHARP_EYE migriert — Tests in families.test.js.

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
    expect(baseScoreMultFor(["C1", "E1"], {})).toBeCloseTo(1); // flache Perks tragen keinen Score-Multiplikator
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
  it("kuratierte C/L sind enthalten, layout-fremde Perks nicht", () => {
    // B-Stich und D-Score sind zu Familien migriert (#167); ihre layout-relevanten Familien folgen mit #166.
    ["C1", "C8", "L3", "L11"].forEach((id) => expect(isLayoutPerk(id)).toBe(true));
    ["C9", "C2", "L5"].forEach((id) => expect(isLayoutPerk(id)).toBe(false));
  });
  it("layoutPerks filtert die gehaltenen Perks in Reihenfolge", () => {
    expect(layoutPerks(["C9", "E1", "C8"])).toEqual(["E1", "C8"]);
    expect(layoutPerks([])).toEqual([]);
  });
});

describe("Neue Normal-Perks (#71)", () => {
  // A6/A7/A8 (Deck-Mods) sind zu Familien A_MIDRANGE/A_TOP/A_BOTTOM migriert (#167) — Tests in families.test.js.
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

describe("Seltene Perks (#71, Phase 2a)", () => {
  // A9 Farbduell / A10 Verdichtung sind zu Familien A_SUIT_DUEL/A_CONDENSE migriert (#167) — Tests in families.test.js.
  it("E-Werkzeuge sind reine Marker; E10 hat extraSwap, ist aber als Perk deaktiviert (#162)", () => {
    for (const id of ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"]) {
      expect(PERK_DEFS[id].cat).toBe("E");
      expect(PERK_DEFS[id].cardBonus).toBeUndefined();
      expect(PERK_DEFS[id].scoreFlat).toBeUndefined();
      expect(PERK_DEFS[id].critChance).toBeUndefined();
    }
    expect(PERK_DEFS.E10.extraSwap).toBe(1);
    expect(PERK_DEFS.E10.offerable).toBe(false); // #162: aus dem Perk-Pool genommen → wird Shop-Familie
  });
  it("V2 §22.4: alle A–E sind normal (keine Rares mehr); nur L ist legendär", () => {
    for (const p of PERK_LIST) {
      if (/^L\d/.test(p.id)) expect(p.rarity).toBe("legendary");
      else expect(p.rarity || "common").toBe("common");
    }
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

// B9 Perfekte Folge ist zu Familie B_PERFECT migriert (#167) — Treppen-Ordinal-Tests in families.test.js.
