import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState, reducer } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { applyFamilyPick, FAMILY_DEFS } from "../src/game/families.js";
import { buildPerkOffer, isMigratedPerk, PERK_DEFS, PERK_LIST, isLegendary } from "../src/game/perks.js";

/* Engine-Verdrahtung des Raritätssystems (Epic #167, Schritt 1): der End-to-End-Nachweis, dass eine
   gehaltene Familien-Stufe (state.familyTiers) über resolveTrick genauso in die multiplizierte Score-Basis
   fließt wie ein flacher D-Perk — additiv, ohne Doppel-Trigger. Teststil analog engine.test.js. */

// Konstantes Deck: gleicher Wert bildet nur eine Wiederholung, KEINEN Farbblock; Pos 0 hat keinen
// Formations-Mult (wie in engine.test.js verankert) → isoliert die Score-Flats.
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
// Formationsneutral (Werte 12/11, Farbe R/B abwechselnd): gewinnt gegen 0, bildet KEINE Formation → isoliert Score-Flats.
const flatDeck = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
function scenario(pVal, oVal, over = {}) {
  return {
    ...initialState(makeRng(1)),
    deck: constDeck(pVal), oppDeck: constDeck(oVal),
    playerOrder: identity(), oppOrder: identity(),
    ...over,
  };
}
const rng = makeRng(9);
// Kritwurf ist rng()<chance: 0,999… crittet nie bei realer Chance, aber immer bei erzwungener Chance 1 (statCritChance:1).
const never = () => 0.999999;

describe("Familien-Engine-Verdrahtung — Kategorie D über resolveTrick (Schritt 1)", () => {
  it("D_HIGH IV: Stufe zahlt scoreFlat in die multiplizierte Basis (Wert ≥6)", () => {
    // Wert 6 ≥ Schwelle 6 → +350; (100+350)×streakBaseMult(1)=1,02
    expect(resolveTrick(scenario(6, 0, { familyTiers: { D_HIGH: 4 } }), rng).score).toBeCloseTo(459);
    // Wert 5 < 6 → nur Basis
    expect(resolveTrick(scenario(5, 0, { familyTiers: { D_HIGH: 4 } }), rng).score).toBeCloseTo(102);
  });

  it("nur die gehaltene Stufe zählt — kein Doppel-Trigger über Stufen (Spec §2.3/§9)", () => {
    // D_HIGH auf Rang 2: Schwelle ≥8/+150. Rang 1 (≥9/+100) darf NICHT zusätzlich zählen.
    expect(resolveTrick(scenario(8, 0, { familyTiers: { D_HIGH: 2 } }), rng).score).toBeCloseTo(255); // (100+150)×1,02
    expect(resolveTrick(scenario(7, 0, { familyTiers: { D_HIGH: 2 } }), rng).score).toBeCloseTo(102);
  });

  it("D_FORMATION_BONUS: Familien-Flat stapelt mit dem Formations-Multiplikator (Wiederholung ×1,25)", () => {
    // Ohne Formation → nur Basis. Mit Formation (Pos 1 = Wiederholung) fließt der Flat in die multiplizierte Basis.
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_FORMATION_BONUS: 1 } }), rng).lastTrick.gained).toBeCloseTo(102);
    const deck = [{ id: "a", suit: "R", baseRank: 12, value: 12 }, { id: "b", suit: "R", baseRank: 12, value: 12 }];
    const opp = [{ id: "o0", suit: "R", baseRank: 0, value: 0 }, { id: "o1", suit: "R", baseRank: 0, value: 0 }];
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1], oppOrder: [0, 1], familyTiers: { D_FORMATION_BONUS: 1 } };
    s = resolveTrick(s, rng); s = resolveTrick(s, rng); // Pos 1 = Wiederholung (×1,25)
    expect(s.lastTrick.gained).toBeCloseTo((100 + 50) * 1.04 * 1.25); // Stufe I: +50
  });

  it("D_STREAK: Familien-Flat wächst über mehrere Stiche mit der Serie (Stufe I: +15/Serienpunkt)", () => {
    let s = scenario(12, 0, { familyTiers: { D_STREAK: 1 }, deck: flatDeck() }); // formationsneutral
    s = resolveTrick(s, rng); // (100+15)×1,02
    s = resolveTrick(s, rng); // (100+30)×1,04
    s = resolveTrick(s, rng); // (100+45)×1,06
    expect(s.score).toBeCloseTo((100 + 15) * 1.02 + (100 + 30) * 1.04 + (100 + 45) * 1.06);
  });

  it("scoreFlatOnCrit-Familie (D_CRIT_SCORE) zahlt nur bei einem Crit", () => {
    // erzwungener Crit via statCritChance:1 → Rang 2 gibt +175 in die Basis, dann Crit-Faktor.
    const s = resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_SCORE: 2 }, statCritChance: 1 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.gained).toBeCloseTo((100 + 175) * 1.02 * s.lastTrick.critMultiplier);
    // Ohne Crit (keine Crit-Chance) trägt die Familie nichts bei → nur Basis.
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_SCORE: 2 } }), rng).score).toBeCloseTo(102);
  });

  it("Zwei Familien gleichzeitig — additiv, kein gegenseitiges Überschreiben", () => {
    // D_HIGH IV (Wert ≥6 → +350) + D_OVERPOWER II (Vorsprung ≥8 → +400) auf einem Sieg mit Wert 8 / Vorsprung 8.
    const s = resolveTrick(scenario(8, 0, { familyTiers: { D_HIGH: 4, D_OVERPOWER: 2 } }), rng);
    expect(s.score).toBeCloseTo((100 + 350 + 400) * 1.02);
  });

  it("leere familyTiers verändern den Score nicht (reine Additivität)", () => {
    expect(resolveTrick(scenario(12, 0, { familyTiers: {} }), rng).score).toBeCloseTo(102);
    expect(resolveTrick(scenario(12, 0), rng).score).toBeCloseTo(102); // Feld ganz weggelassen
  });
});

describe("Reducer PICK_FAMILY (Schritt 1 + Angebotsvalidierung Schritt 3)", () => {
  it("setzt familyTiers[id] auf die Zielstufe und kehrt ins Spiel zurück", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: [{ familyId: "D_HIGH", tier: 3 }] };
    const s1 = reducer(s0, { type: "PICK_FAMILY", familyId: "D_HIGH", tier: 3, rng });
    expect(s1.familyTiers.D_HIGH).toBe(3);
    expect(s1.phase).toBe("play");
    expect(s1.offer).toBeNull();
  });

  it("Upgrade ersetzt die gehaltene Stufe (nur höchste aktiv)", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", familyTiers: { D_HIGH: 1 }, offer: [{ familyId: "D_HIGH", tier: 3 }] };
    const s1 = reducer(s0, { type: "PICK_FAMILY", familyId: "D_HIGH", tier: 3, rng });
    expect(s1.familyTiers.D_HIGH).toBe(3);
    expect(Object.keys(s1.familyTiers)).toEqual(["D_HIGH"]); // kein zweiter Rang derselben Familie
  });

  it("ignoriert Familie/Stufe außerhalb des Angebots, Stufe 0 und die falsche Phase", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: [{ familyId: "D_HIGH", tier: 3 }] };
    expect(reducer(s0, { type: "PICK_FAMILY", familyId: "NOPE", tier: 2, rng })).toBe(s0);       // unbekannte Familie
    expect(reducer(s0, { type: "PICK_FAMILY", familyId: "D_HIGH", tier: 2, rng })).toBe(s0);     // Stufe nicht im Angebot
    expect(reducer(s0, { type: "PICK_FAMILY", familyId: "D_STREAK", tier: 3, rng })).toBe(s0);   // Familie nicht im Angebot
    expect(reducer(s0, { type: "PICK_FAMILY", familyId: "D_HIGH", tier: 0, rng })).toBe(s0);     // Stufe 0
    const play = { ...initialState(makeRng(1)), phase: "play", offer: [{ familyId: "D_HIGH", tier: 3 }] };
    expect(reducer(play, { type: "PICK_FAMILY", familyId: "D_HIGH", tier: 3, rng })).toBe(play); // falsche Phase
  });

  it("initialState trägt ein leeres familyTiers", () => {
    expect(initialState(makeRng(1)).familyTiers).toEqual({});
  });
});

describe("Engine-Parameter je Stufe (Schritt 2) — engine-gekoppelte D-Familien", () => {
  it("D_MISFIRE: Stufen-Schritt/Cap laden die Ladung (I: +20/200)", () => {
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_MISFIRE: 1 }, misfireScore: 0 }), never).misfireScore).toBe(20);
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_MISFIRE: 1 }, misfireScore: 190 }), never).misfireScore).toBe(200); // Cap
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_MISFIRE: 4 }, misfireScore: 0 }), never).misfireScore).toBe(75); // IV-Schritt
  });
  it("D_MISFIRE IV: Crit zahlt die volle Ladung aus und behält 25 %", () => {
    const paid = resolveTrick(scenario(12, 0, { familyTiers: { D_MISFIRE: 4 }, statCritChance: 1, misfireScore: 400 }), never);
    expect(paid.lastTrick.isCrit).toBe(true);
    expect(paid.misfireScore).toBe(100); // round(400 × 0,25)
    expect(paid.lastTrick.gained).toBeCloseTo((100 + 400) * 1.02 * paid.lastTrick.critMultiplier); // volle 400 in die Basis
  });

  it("D_WEAKNESS: Stufen-Schwelle rüstet (I: ≥7)", () => {
    expect(resolveTrick(scenario(0, 12, { familyTiers: { D_WEAKNESS: 1 } }), never).weaknessArmed).toBe(true);  // Abstand 12 ≥7
    expect(resolveTrick(scenario(6, 12, { familyTiers: { D_WEAKNESS: 1 } }), never).weaknessArmed).toBe(false); // Abstand 6 <7
  });
  it("D_WEAKNESS IV: jede Niederlage rüstet, großer Abstand markiert weaknessBig (+900 statt +600)", () => {
    const small = resolveTrick(scenario(11, 12, { familyTiers: { D_WEAKNESS: 4 } }), never); // Abstand 1
    expect(small.weaknessArmed).toBe(true);
    expect(small.weaknessBig).toBe(false);
    const big = resolveTrick(scenario(5, 12, { familyTiers: { D_WEAKNESS: 4 } }), never); // Abstand 7 ≥5
    expect(big.weaknessBig).toBe(true);
    // Auszahlung am nächsten Sieg: big → +900, sonst +600.
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_WEAKNESS: 4 }, weaknessArmed: true, weaknessBig: true }), never).score).toBeCloseTo((100 + 900) * 1.02);
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_WEAKNESS: 4 }, weaknessArmed: true, weaknessBig: false }), never).score).toBeCloseTo((100 + 600) * 1.02);
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_WEAKNESS: 4 }, weaknessArmed: true, weaknessBig: true }), never).weaknessBig).toBe(false); // Sieg verbraucht
  });

  it("D_SUIT_STREAK IV: Farbwechsel halbiert die Länge (statt Reset auf 1)", () => {
    // Pos 0 ist Farbe R; state-Farbe B → Wechsel. IV: floor(6/2)=3; I: Reset auf 1.
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_SUIT_STREAK: 4 }, winSuit: "B", winSuitStreak: 6 }), never).winSuitStreak).toBe(3);
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_SUIT_STREAK: 1 }, winSuit: "B", winSuitStreak: 6 }), never).winSuitStreak).toBe(1);
  });

  it("D_CRIT_MOMENTUM IV: ein Crit erhöht die Siegesserie zusätzlich um 1", () => {
    const iv = resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_MOMENTUM: 4 }, statCritChance: 1 }), never);
    expect(iv.lastTrick.isCrit).toBe(true);
    expect(iv.winStreak).toBe(2); // +1 Sieg, +1 Crit-Bonus
    // Stufe III ohne streakGainOnCrit → nur der Sieg zählt.
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_MOMENTUM: 3 }, statCritChance: 1 }), never).winStreak).toBe(1);
  });

  it("D_INTERPLAY IV: Niederlage speichert +200, der nächste Sieg zahlt sie als Flat aus (Stufe III speichert nicht)", () => {
    const afterLoss = resolveTrick(scenario(0, 12, { familyTiers: { D_INTERPLAY: 4 } }), never);
    expect(afterLoss.score).toBe(0);              // Niederlage zahlt nicht sofort aus
    expect(afterLoss.interplayStored).toBe(200);  // sondern bankt
    expect(resolveTrick(scenario(0, 12, { familyTiers: { D_INTERPLAY: 3 } }), never).interplayStored).toBe(0);
    // Nächster Sieg nach Niederlage: 700 (Wechselspiel-Basis) + 200 (gespeichert) in die multiplizierte Basis; danach verbraucht.
    const win = resolveTrick(scenario(12, 0, { familyTiers: { D_INTERPLAY: 4 }, interplayStored: 200, lastResult: "loss" }), never);
    expect(win.score).toBeCloseTo((100 + 700 + 200) * 1.02);
    expect(win.interplayStored).toBe(0);
  });

  it("D_CRIT_FOLLOW IV: Crit-Folgesieg, der selbst Crit ist, gibt zusätzlich +300", () => {
    const cf = resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_FOLLOW: 4 }, critFollowArmed: true, statCritChance: 1 }), never);
    expect(cf.lastTrick.isCrit).toBe(true);
    expect(cf.lastTrick.gained).toBeCloseTo((100 + 700 + 300) * 1.02 * cf.lastTrick.critMultiplier); // 700 (Folge) + 300 (Crit-Bonus)
    // Folgesieg ohne Crit → nur die 700 (kein +300).
    const noCrit = resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_FOLLOW: 4 }, critFollowArmed: true } ), never);
    expect(noCrit.lastTrick.isCrit).toBe(false);
    expect(noCrit.score).toBeCloseTo((100 + 700) * 1.02);
  });

  it("D_FULL_HOUSE: löst über den generischen Hook auf (fünfter Segment-Sieg → +500, Stufe I)", () => {
    let s = scenario(0, 0, { familyTiers: { D_FULL_HOUSE: 1 }, deck: flatDeck(), oppDeck: constDeck(0) });
    for (let i = 0; i < 5; i++) s = resolveTrick(s, never); // fünf Siege in Folge, fünfter auf Segmentposition 4
    expect(s.lastTrick.breakdown.flats).toBeCloseTo(500); // isolierter Flat-Anteil der Familie
  });
});

describe("buildPerkOffer — gemischtes Angebot Familien + flache Perks (Schritt 3)", () => {
  const isFam = (e) => e && typeof e === "object" && e.familyId != null;
  const rngS = (seed) => makeRng(seed);

  it("liefert count Einträge; jeder ist ein flacher Perk-String ODER {familyId,tier}", () => {
    const off = buildPerkOffer([], {}, rngS(3), 3);
    expect(off).toHaveLength(3);
    for (const e of off) {
      if (isFam(e)) { expect(FAMILY_DEFS[e.familyId]).toBeTruthy(); expect([1, 2, 3, 4]).toContain(e.tier); }
      else { expect(typeof e).toBe("string"); expect(PERK_DEFS[e]).toBeTruthy(); }
    }
  });

  it("reguläre D-Perks (D1–D19) sind vollständig zu Familien migriert — kein flacher D-Score-Perk mehr", () => {
    // Nach der Entfernung existiert kein regulärer (nicht-legendärer) cat-D-Perk mehr im flachen Pool;
    // die D-Legendäre (L4/L5/L6/L10) bleiben flach (isMigratedPerk = false).
    expect(PERK_LIST.some((p) => p.cat === "D" && !isLegendary(p.id))).toBe(false);
    expect(isMigratedPerk(PERK_DEFS.A1)).toBe(false);
    expect(isMigratedPerk(PERK_DEFS.L5)).toBe(false);
    // Über viele Seeds: das Angebot enthält nie einen flachen regulären D-Perk — D erscheint nur als Familie.
    for (let seed = 0; seed < 40; seed++) {
      for (const e of buildPerkOffer([], {}, rngS(seed), 3)) {
        if (!isFam(e)) expect(PERK_DEFS[e].cat === "D" && !isLegendary(e)).toBe(false);
      }
    }
  });

  it("deterministisch über den rng (gleicher Seed → gleiches Angebot)", () => {
    expect(buildPerkOffer([], {}, rngS(7), 3)).toEqual(buildPerkOffer([], {}, rngS(7), 3));
  });

  it("eine Familie erscheint höchstens einmal je Angebot (keine zwei Stufen derselben Familie)", () => {
    for (let seed = 0; seed < 40; seed++) {
      const fams = buildPerkOffer([], {}, rngS(seed), 3).filter(isFam).map((e) => e.familyId);
      expect(new Set(fams).size).toBe(fams.length);
    }
  });

  it("bietet nur Stufen ECHT über dem gehaltenen Rang an; IV schließt die Familie ab", () => {
    // D_HIGH auf Rang 3 → nur noch Stufe IV anbietbar.
    let sawIV = false;
    for (let seed = 0; seed < 60; seed++) {
      for (const e of buildPerkOffer([], { D_HIGH: 3 }, rngS(seed), 3)) {
        if (isFam(e) && e.familyId === "D_HIGH") { expect(e.tier).toBe(4); sawIV = true; }
      }
    }
    expect(sawIV).toBe(true);
    // Alle D-Familien auf IV → keine D-Familie mehr im Angebot (nur noch flache Perks).
    const allIV = Object.fromEntries(Object.keys(FAMILY_DEFS).map((id) => [id, 4]));
    for (let seed = 0; seed < 20; seed++) {
      for (const e of buildPerkOffer([], allIV, rngS(seed), 3)) expect(isFam(e)).toBe(false);
    }
  });

  it("besessene flache Perks werden nicht erneut angeboten", () => {
    for (let seed = 0; seed < 30; seed++) {
      const off = buildPerkOffer(["A1", "A2"], {}, rngS(seed), 3);
      expect(off).not.toContain("A1");
      expect(off).not.toContain("A2");
    }
  });

  it("Legendär-Wurf: mit Chance 1 enthält das Angebot genau ein Legendäres (flach)", () => {
    for (let seed = 0; seed < 10; seed++) {
      const off = buildPerkOffer([], {}, rngS(seed), 3, 1);
      expect(off.filter((e) => !isFam(e) && isLegendary(e))).toHaveLength(1);
    }
  });

  it("bei aktivem Roll (Chance>0) erscheinen NIE zwei Legendäre", () => {
    for (let seed = 1; seed <= 60; seed++)
      expect(buildPerkOffer([], {}, rngS(seed), 3, 0.5).filter((e) => !isFam(e) && isLegendary(e)).length).toBeLessThanOrEqual(1);
  });

  it("ein aktiver Roll kann auch ohne Legendäres ausgehen (Miss)", () => {
    let anyWithout = false;
    for (let seed = 1; seed <= 40 && !anyWithout; seed++)
      if (!buildPerkOffer([], {}, rngS(seed), 3, 0.2).some((e) => !isFam(e) && isLegendary(e))) anyWithout = true;
    expect(anyWithout).toBe(true);
  });
});

describe("applyFamilyPick — reines Patch (Spec §2.4)", () => {
  it("REPLACEMENT: nur familyTiers ändert sich, Deck/Rollen unangetastet", () => {
    const deck = [{ id: "a", value: 3 }];
    const roles = { X: ["a"] };
    const out = applyFamilyPick("D_HIGH", 2, { familyTiers: { D_STREAK: 1 }, deck, roles }, rng);
    expect(out.familyTiers).toEqual({ D_STREAK: 1, D_HIGH: 2 });
    expect(out.deck).toBe(deck);   // identische Referenz → keine Deckmod bei REPLACEMENT
    expect(out.roles).toBe(roles);
  });

  it("No-Op bei unbekannter Familie / Stufe 0", () => {
    expect(applyFamilyPick("NOPE", 2, { familyTiers: { D_HIGH: 1 } }, rng).familyTiers).toEqual({ D_HIGH: 1 });
    expect(applyFamilyPick("D_HIGH", 0, { familyTiers: { D_HIGH: 1 } }, rng).familyTiers).toEqual({ D_HIGH: 1 });
  });
});
