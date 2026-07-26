import { describe, it, expect } from "vitest";
import { buildDeck } from "../src/game/deck.js";
import { PERK_DEFS, PERK_LIST, critChanceFor, critChanceRawFor, isLegendary, baseScoreMultFor, streakBaseMult, isLayoutPerk, layoutPerks } from "../src/game/perks.js";
import { effectivePlayerValue } from "../src/game/engine.js";

// Kat.-A-Deck-Mods (früher A1–A10 onPick) sind zu KUMULATIVEN Familien migriert (#167) — die
// Deck-Effekte je Stufe sind in test/families.test.js geprüft (onPick direkt), der Reducer-Pick +
// Ziel-Fluss in test/families-engine.test.js.

describe("effectivePlayerValue — cardBonus-Summation", () => {
  // Kat. B und C sind zu Familien migriert (#167) — Engine-Integration in families-engine.test.js.
  // Hier bleibt die generische Summation der flachen cardBonus-Hooks geprüft (jetzt über ein Legendär-Beispiel).
  it("summiert die cardBonus-Hooks der gehaltenen Perks auf den Basiswert", () => {
    expect(effectivePlayerValue(5, ["L3"], { posInCycle: 35 })).toBe(10); // L3 +5 auf Position 36–40
    expect(effectivePlayerValue(5, ["L3"], { posInCycle: 10 })).toBe(5);  // Bedingung nicht erfüllt
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
    expect(isLegendary("E1")).toBe(false);
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
    expect(baseScoreMultFor(["E1", "E2"], {})).toBeCloseTo(1); // flache Perks tragen keinen Score-Multiplikator
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
  it("kuratierte L sind enthalten, layout-fremde Perks nicht", () => {
    // B-Stich, D-Score UND C-Rollen sind zu Familien migriert (#167); ihre layout-relevanten Familien folgen mit #166
    // (layoutPerks kennt nur flache `perks`). Übrig als flache Layout-Perks: E-Werkzeuge + L3/L11.
    ["L3", "L11"].forEach((id) => expect(isLayoutPerk(id)).toBe(true));
    ["L1", "L5"].forEach((id) => expect(isLayoutPerk(id)).toBe(false));
  });
  it("layoutPerks filtert die gehaltenen Perks in Reihenfolge", () => {
    expect(layoutPerks(["L1", "E1", "L3"])).toEqual(["E1", "L3"]);
    expect(layoutPerks([])).toEqual([]);
  });
});

// Frühere Normal-Perks A6/A7/A8 (Deck) und C3/C6 (Rollen) sind zu Familien migriert (#167) — Tests in families.test.js.

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

// Kartenrollen (Kat. C: Vorhut/Triumph/Leibwache/Staffelläufer/Anführer/Finisher/Überlebensvorteil/Joker/Opfergabe/
// Bindeglied) sind zu Familien migriert (#167) — Stufeneffekte in families.test.js, Engine/Flow in families-engine.test.js.
// B9 Perfekte Folge → Familie B_PERFECT (#167), Treppen-Ordinal-Tests ebenfalls in families.test.js.
