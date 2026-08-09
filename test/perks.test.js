import { describe, it, expect } from "vitest";
import { PERK_DEFS, PERK_LIST, critChanceFor, critChanceRawFor, isLegendary, baseScoreMultFor, streakBaseMult, isLayoutPerk, layoutPerks, buildPerkOffer } from "../src/game/perks.js";
import { makeRng } from "../src/game/deck.js";
import { effectivePlayerValue } from "../src/game/engine.js";
import { UNAUFHALTSAM_VALUE, KRITMASSE_VALUE, MONOCHROM_STEP, MONOCHROM_CAP } from "../src/game/constants.js";

// Kat.-A-Deck-Mods (früher A1–A10 onPick) sind zu KUMULATIVEN Familien migriert (#167) — die
// Deck-Effekte je Stufe sind in test/families.test.js geprüft (onPick direkt), der Reducer-Pick +
// Ziel-Fluss in test/families-engine.test.js.

describe("effectivePlayerValue — cardBonus-Summation", () => {
  // Kat. B und C sind zu Familien migriert (#167) — Engine-Integration in families-engine.test.js.
  // Hier bleibt die generische Summation der flachen cardBonus-Hooks geprüft (jetzt über ein Legendär-Beispiel).
  it("summiert die cardBonus-Hooks der gehaltenen Perks auf den Basiswert", () => {
    expect(effectivePlayerValue(5, ["L2"], { winStreak: 3 })).toBe(5 + UNAUFHALTSAM_VALUE); // L2 Unaufhaltsam +Wert solange die Serie läuft
    expect(effectivePlayerValue(5, ["L2"], { winStreak: 0 })).toBe(5);                       // Bedingung (Serie) nicht erfüllt
  });
});

// Das Angebot läuft jetzt über buildPerkOffer (gemischt Familien + flache Perks) — Tests dort in
// test/families-engine.test.js (inkl. Legendär-Wurf). Das alte flache buildOffer wurde entfernt (#167 Schritt 4).

describe("critChanceFor / critChanceRawFor (V2: kein Perk trägt Crit-Chance — Stat/Blitz in der Engine)", () => {
  it("kein Perk-Beitrag → Roh-Chance 0 (Stat/Blitz addiert die Engine obendrauf)", () => {
    expect(critChanceRawFor(["L4", "L_UMV"], {})).toBe(0);
    expect(critChanceFor(["L4", "L_UMV"], {})).toBe(0);
  });
  it("critChanceFor klemmt auf [0,1]", () => {
    expect(critChanceFor([], {})).toBe(0);
  });
});

describe("Legendäre Perks — Hooks (Legendär-Perks-Rework #203)", () => {
  const KEPT = ["L2", "L4", "L6"];                                                   // behalten (Serie/Crit-Favoriten)
  const NEU  = ["L_UMV", "L_ZINS", "L_VAB", "L_HENK", "L_ECHO", "L_SAMM", "L_BRENN", "L_PATT"]; // 8 neue generische (#203)
  const POOL = ["L_MONO", "L_RICHT", "L_BAUH"];                                      // Pool-Erweiterung: Farb- + Gebäude-Legendäre

  it("die 14 Legendären sind legendär; die Erstgen (L1/L3/L5/L7–L11) ist entfernt", () => {
    for (const id of [...KEPT, ...NEU, ...POOL]) expect(isLegendary(id)).toBe(true);
    for (const id of ["L1", "L3", "L5", "L7", "L8", "L9", "L10", "L11"]) expect(PERK_DEFS[id]).toBeUndefined();
    expect(isLegendary("E10")).toBe(false);
  });
  it("Gebäude-Legendäre tragen ihren Flag + needsArchitect (Richtfest Durchlauf-Ende, Bauhütte Pick)", () => {
    expect(PERK_DEFS.L_RICHT.richtfest).toBe(true);
    expect(PERK_DEFS.L_BAUH.bauhuette).toBe(true);
    expect(PERK_DEFS.L_RICHT.needsArchitect).toBe(true);
    expect(PERK_DEFS.L_BAUH.needsArchitect).toBe(true);
  });
  it("L_MONO Monochrom: scoreMult wächst mit der Farbserie, gedeckelt (Hook, kein Engine-Flag)", () => {
    expect(PERK_DEFS.L_MONO.scoreMult({ suitStreak: 1 })).toBeCloseTo(1);           // erster Farbsieg → ×1
    expect(PERK_DEFS.L_MONO.scoreMult({ suitStreak: 3 })).toBeCloseTo(1 + 2 * MONOCHROM_STEP); // +2 Folgesiege
    expect(PERK_DEFS.L_MONO.scoreMult({ suitStreak: 99 })).toBeCloseTo(1 + MONOCHROM_CAP);     // Deckel
    expect(PERK_DEFS.L_MONO.cardBonus).toBeUndefined();                             // kein Wert-Hook
  });
  it("L2 Unaufhaltsam: flach +UNAUFHALTSAM_VALUE solange die Serie läuft, 0 ohne Serie (#115)", () => {
    expect(PERK_DEFS.L2.cardBonus({ winStreak: 0 })).toBe(0);
    expect(PERK_DEFS.L2.cardBonus({ winStreak: 3 })).toBe(UNAUFHALTSAM_VALUE);
    expect(PERK_DEFS.L2.cardBonus({ winStreak: 9 })).toBe(UNAUFHALTSAM_VALUE); // flach, kein Snowball
  });
  it("L6 Raserei: +5 % Crit-Chance je Serienpunkt + Überschuss→Crit-Schaden (kein cardBonus) (#115)", () => {
    expect(PERK_DEFS.L6.cardBonus).toBeUndefined();
    expect(PERK_DEFS.L6.critChance({ winStreak: 5 })).toBeCloseTo(0.25);
    expect(PERK_DEFS.L6.critMultBonus({ rawCrit: 1.5 })).toBeCloseTo(0.5);
    expect(PERK_DEFS.L6.critMultBonus({ rawCrit: 3 })).toBeCloseTo(1);
    expect(PERK_DEFS.L6.critMultBonus({ rawCrit: 0.8 })).toBe(0);
  });
  it("L4 Kritische Masse: critValueGain-Marker (Deckel des dauerhaften Crit-Wert-Gewinns)", () => {
    expect(PERK_DEFS.L4.critValueGain).toBe(KRITMASSE_VALUE);
  });
  it("die 8 neuen Legendären tragen je ihren Engine-Flag (Marker → in engine.js/reducer.js verdrahtet)", () => {
    expect(PERK_DEFS.L_UMV.redistribute).toBe(true);   // Umverteilung (reducer PICK_PERK)
    expect(PERK_DEFS.L_ZINS.zinseszins).toBe(true);    // Zinseszins (Durchlauf-Ende)
    expect(PERK_DEFS.L_VAB.vabanque).toBe(true);       // Vabanque (Eröffnungs-Serie)
    expect(PERK_DEFS.L_HENK.henker).toBe(true);        // Henker (Segment-Finale)
    expect(PERK_DEFS.L_ECHO.echo).toBe(true);          // Echo (bester Stich)
    expect(PERK_DEFS.L_SAMM.sammler).toBe(true);       // Sammler (Formationsvielfalt)
    expect(PERK_DEFS.L_BRENN.brennpunkt).toBe(true);   // Brennpunkt (Formations-Tiefe)
    expect(PERK_DEFS.L_PATT.patt).toBe(true);          // Patt (knappe Niederlage)
  });
  it("keine Erstgen-Marker mehr im Registry (permMod/randomTarget/jackpotScore/swapExtremes/successorCrit/repeatPos)", () => {
    for (const p of PERK_LIST)
      for (const k of ["permMod", "needsTarget", "randomTarget", "jackpotScore", "swapExtremes", "successorCrit", "repeatPos"])
        expect(p[k]).toBeUndefined();
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
    expect(baseScoreMultFor(["L2", "L4"], {})).toBeCloseTo(1); // flache Perks tragen keinen Score-Multiplikator
  });
  it("Siegesserie hebt den Mult (#39): +2 %/Stufe bis Cap +150 % (#100)", () => {
    expect(baseScoreMultFor([], { winStreak: 0 })).toBeCloseTo(1);
    expect(baseScoreMultFor([], { winStreak: 5 })).toBeCloseTo(1.10);
    expect(baseScoreMultFor([], { winStreak: 20 })).toBeCloseTo(1.40); // nicht mehr gedeckelt
    expect(baseScoreMultFor([], { winStreak: 80 })).toBeCloseTo(2.50); // Cap +150 %
  });
});

describe("Layout-Perks (#95): Positions-/Formations-relevante Perks", () => {
  it("cat-E-Perks (E10 + Gebäude-Legendäre Richtfest/Bauhütte) zählen als Layout-Perk", () => {
    PERK_LIST.filter((p) => p.cat === "E").forEach((p) => expect(isLayoutPerk(p.id)).toBe(true));
  });
  it("positionsgebundene/Formations-/Gebäude-Legendäre sind Layout-Perks, andere nicht (#203)", () => {
    // Henker ist positionsgebunden (Pos 36–40, LAYOUT_EXTRA); Brennpunkt/Sammler/Richtfest/Bauhütte sind cat E (cat-Regel).
    // Der Rest (Umverteilung/Echo/Zinseszins/Vabanque/Patt/Monochrom) ist layout-fremd.
    ["L_HENK", "L_BRENN", "L_SAMM", "L_RICHT", "L_BAUH"].forEach((id) => expect(isLayoutPerk(id)).toBe(true));
    ["L_UMV", "L_ECHO", "L_ZINS", "L_VAB", "L_PATT", "L_MONO"].forEach((id) => expect(isLayoutPerk(id)).toBe(false));
  });
  it("layoutPerks filtert die gehaltenen Perks in Reihenfolge", () => {
    expect(layoutPerks(["L_UMV", "L_HENK", "L_BRENN"])).toEqual(["L_HENK", "L_BRENN"]);
    expect(layoutPerks([])).toEqual([]);
  });
});

// Frühere Normal-Perks A6/A7/A8 (Deck) und C3/C6 (Rollen) sind zu Familien migriert (#167) — Tests in families.test.js.

describe("Seltene Perks (#71, Phase 2a)", () => {
  // A9 Farbduell / A10 Verdichtung sind zu Familien A_SUIT_DUEL/A_CONDENSE migriert (#167) — Tests in families.test.js.
  it("E1–E9 sind zu Familien migriert (#167); E10 bleibt als deaktivierter extraSwap-Perk", () => {
    for (const id of ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"]) expect(PERK_DEFS[id]).toBeUndefined();
    expect(PERK_DEFS.E10.extraSwap).toBe(1);
    expect(PERK_DEFS.E10.offerable).toBe(false); // #162: aus dem Perk-Pool genommen → wird Shop-Familie (#164)
  });
  it("V2 §22.4 / #203 + Pool: genau die 14 Legendären sind legendär, alles andere normal", () => {
    const LEGENDARY = new Set(["L2", "L4", "L6", "L_UMV", "L_ZINS", "L_VAB", "L_HENK", "L_ECHO", "L_SAMM", "L_BRENN", "L_PATT", "L_MONO", "L_RICHT", "L_BAUH"]);
    for (const p of PERK_LIST) {
      if (LEGENDARY.has(p.id)) expect(p.rarity).toBe("legendary");
      else expect(p.rarity || "common").toBe("common");
    }
  });
});

// Kartenrollen (Kat. C: Vorhut/Triumph/Leibwache/Staffelläufer/Anführer/Finisher/Überlebensvorteil/Joker/Opfergabe/
// Bindeglied) sind zu Familien migriert (#167) — Stufeneffekte in families.test.js, Engine/Flow in families-engine.test.js.
// B9 Perfekte Folge → Familie B_PERFECT (#167), Treppen-Ordinal-Tests ebenfalls in families.test.js.

describe("buildPerkOffer — Legendäre koppeln an die Rarität (lila/Stufe IV) (#Onboarding-Fix)", () => {
  const rng = () => 0.5; // deterministisch genug für die Poolzusammensetzung
  it("maxTier < 4 (Onboarding-Deckel): KEIN legendärer Perk im Angebot", () => {
    for (const mt of [2, 3]) {
      for (let s = 0; s < 8; s++) {
        const offer = buildPerkOffer([], {}, makeRng(s + 1), 5, 0, 0, false, 0, mt);
        expect(offer.some((id) => isLegendary(id))).toBe(false);
      }
    }
  });
  it("maxTier = 4 (lila frei): Legendäre können wieder auftauchen (Standard/Post-Onboarding unverändert)", () => {
    let sawLeg = false;
    for (let s = 0; s < 40 && !sawLeg; s++) {
      const offer = buildPerkOffer([], {}, makeRng(s + 1), 5, 0.5, 0, false, 0, 4);
      if (offer.some((id) => isLegendary(id))) sawLeg = true;
    }
    expect(sawLeg).toBe(true);
  });
});
