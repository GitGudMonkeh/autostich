import { describe, it, expect } from "vitest";
import { makeRng, buildDeck } from "../src/game/deck.js";
import { initialState, reducer } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialShop } from "../src/game/shop.js";
import { applyFamilyPick, FAMILY_DEFS } from "../src/game/families.js";
import { computeFormations } from "../src/game/formations.js";
import { precomputeArchitect } from "../src/game/architect.js";
import { buildPerkOffer, isMigratedPerk, PERK_DEFS, PERK_LIST, isLegendary } from "../src/game/perks.js";
import { SCORE_PER_WIN, RICHTFEST_STEP, BAUHUETTE_COVER, CRIT_BASE_MULT, PRECISION_FORCE_MULT } from "../src/game/constants.js";
const B = SCORE_PER_WIN; // Basis-relativ: erwartete Scores skalieren mit der Sieg-Basis (Pacing-Pass 100→400)

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
// Kritwurf ist rng()<chance: 0,999… crittet nie bei realer Chance, aber immer bei erzwungener Chance 1 (litCrit(1)).
const never = () => 0.999999;
// #267: der entfernte Crit-Stat wird als reine Crit-CHANCE-Quelle über den Blitz-Spannungsstau ersetzt. Ein blank
// aktiver Blitz OHNE Skills trägt exakt 0,05 (Sockel) + stauBonus zur rawCrit bei — sonst nichts (kein Score/Mult/Ladung).
// litCrit(V) hebt die rawCrit auf genau V → Drop-in für den alten statCritChance:V (Kritwurf bleibt rng()<V).
const litCrit = (v = 1) => ({ active: true, charge: 0, maxCharge: 10, stauBonus: v - 0.05 });

describe("Familien-Engine-Verdrahtung — Kategorie D über resolveTrick (Schritt 1)", () => {
  it("D_HIGH IV: Stufe zahlt scoreFlat in die multiplizierte Basis (Wert ≥6)", () => {
    // Wert 6 ≥ Schwelle 6 → +350; (Basis+350)×streakBaseMult(1)=1,02
    expect(resolveTrick(scenario(6, 0, { familyTiers: { D_HIGH: 4 } }), rng).score).toBeCloseTo((B + 350) * 1.02);
    // Wert 5 < 6 → nur Basis
    expect(resolveTrick(scenario(5, 0, { familyTiers: { D_HIGH: 4 } }), rng).score).toBeCloseTo(B * 1.02);
  });

  it("nur die gehaltene Stufe zählt — kein Doppel-Trigger über Stufen (Spec §2.3/§9)", () => {
    // D_HIGH auf Rang 2: Schwelle ≥8/+150. Rang 1 (≥9/+100) darf NICHT zusätzlich zählen.
    expect(resolveTrick(scenario(8, 0, { familyTiers: { D_HIGH: 2 } }), rng).score).toBeCloseTo((B + 150) * 1.02); // (Basis+150)×1,02
    expect(resolveTrick(scenario(7, 0, { familyTiers: { D_HIGH: 2 } }), rng).score).toBeCloseTo(B * 1.02);
  });

  it("D_FORMATION_BONUS: Familien-Flat stapelt mit dem Formations-Multiplikator (Wiederholung ×1,25)", () => {
    // Ohne Formation → nur Basis. Mit Formation (Pos 1 = Wiederholung) fließt der Flat in die multiplizierte Basis.
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_FORMATION_BONUS: 1 } }), rng).lastTrick.gained).toBeCloseTo(B * 1.02);
    const deck = [{ id: "a", suit: "R", baseRank: 12, value: 12 }, { id: "b", suit: "R", baseRank: 12, value: 12 }];
    const opp = [{ id: "o0", suit: "R", baseRank: 0, value: 0 }, { id: "o1", suit: "R", baseRank: 0, value: 0 }];
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1], oppOrder: [0, 1], familyTiers: { D_FORMATION_BONUS: 1 } };
    s = resolveTrick(s, rng); s = resolveTrick(s, rng); // Pos 1 = Wiederholung (×1,25)
    expect(s.lastTrick.gained).toBeCloseTo((B +50) * 1.04 * 1.25); // Stufe I: +50
  });

  it("D_STREAK: Familien-Flat wächst über mehrere Stiche mit der Serie (Stufe I: +15/Serienpunkt)", () => {
    let s = scenario(12, 0, { familyTiers: { D_STREAK: 1 }, deck: flatDeck() }); // formationsneutral
    s = resolveTrick(s, rng); // (100+15)×1,02
    s = resolveTrick(s, rng); // (100+30)×1,04
    s = resolveTrick(s, rng); // (100+45)×1,06
    expect(s.score).toBeCloseTo((B +15) * 1.02 + (B +30) * 1.04 + (B +45) * 1.06);
  });

  it("scoreFlatOnCrit-Familie (D_CRIT_SCORE) zahlt nur bei einem Crit", () => {
    // erzwungener Crit via Blitz-Stau (litCrit(1)) → Rang 2 gibt +175 in die Basis, dann Crit-Faktor.
    const s = resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_SCORE: 2 }, lightning: litCrit(1) }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.gained).toBeCloseTo((B +175) * 1.02 * s.lastTrick.critMultiplier);
    // Ohne Crit (keine Crit-Chance) trägt die Familie nichts bei → nur Basis.
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_SCORE: 2 } }), rng).score).toBeCloseTo(B * 1.02);
  });

  it("Zwei Familien gleichzeitig — additiv, kein gegenseitiges Überschreiben", () => {
    // D_HIGH IV (Wert ≥6 → +350) + D_OVERPOWER II (Vorsprung ≥8 → +400) auf einem Sieg mit Wert 8 / Vorsprung 8.
    const s = resolveTrick(scenario(8, 0, { familyTiers: { D_HIGH: 4, D_OVERPOWER: 2 } }), rng);
    expect(s.score).toBeCloseTo((B +350 + 400) * 1.02);
  });

  it("leere familyTiers verändern den Score nicht (reine Additivität)", () => {
    expect(resolveTrick(scenario(12, 0, { familyTiers: {} }), rng).score).toBeCloseTo(B * 1.02);
    expect(resolveTrick(scenario(12, 0), rng).score).toBeCloseTo(B * 1.02); // Feld ganz weggelassen
  });

  it("D_PRECISION #189 Fund B: I zahlt nur EINMAL je Paar (Referenz nach Auszahlung verbraucht)", () => {
    // Drei aufeinanderfolgende wertgleiche Siege (Wert 7). Stufe I: der 2. Sieg zahlt +250 und VERBRAUCHT die
    // Referenz → der 3. Sieg beginnt ein frisches Paar und zahlt nicht. flats = additive Boni (hier nur Präzision).
    let s = scenario(7, 0, { familyTiers: { D_PRECISION: 1 } });
    s = resolveTrick(s, rng); // Sieg 1: kein Vorstich-Sieg → kein Bonus, Referenz = 7
    expect(s.lastWinValue).toBe(7);
    expect(s.lastTrick.breakdown.flats).toBeCloseTo(0);
    s = resolveTrick(s, rng); // Sieg 2: Paar → +250, Referenz verbraucht
    expect(s.lastTrick.breakdown.flats).toBeCloseTo(250);
    expect(s.lastWinValue).toBe(null);
    s = resolveTrick(s, rng); // Sieg 3: frisches Paar → zahlt nicht, Referenz wieder 7
    expect(s.lastTrick.breakdown.flats).toBeCloseTo(0);
    expect(s.lastWinValue).toBe(7);
  });

  it("D_PRECISION IV #189 Fund B: die Kette läuft weiter — jeder wertgleiche Folgesieg zahlt (+800)", () => {
    let s = scenario(7, 0, { familyTiers: { D_PRECISION: 4 } });
    s = resolveTrick(s, rng); // Sieg 1: Referenz = 7
    s = resolveTrick(s, rng); // Sieg 2: +800
    expect(s.lastTrick.breakdown.flats).toBeCloseTo(800);
    s = resolveTrick(s, rng); // Sieg 3: kettet → wieder +800
    expect(s.lastTrick.breakdown.flats).toBeCloseTo(800);
    expect(s.lastWinValue).toBe(7); // Referenz läuft mit (nicht verbraucht)
  });

  // Coverage-Gate (registry-guards.test.js): dedizierte Verhaltenstests für die zuvor nur strukturell erfassten D-Familien.
  it("D_UNDERDOG: zahlt bei niedrigem Kampfwert (Stufe I: Wert ≤2 → +250)", () => {
    expect(resolveTrick(scenario(2, 0, { familyTiers: { D_UNDERDOG: 1 } }), rng).lastTrick.breakdown.flats).toBeCloseTo(250);
    expect(resolveTrick(scenario(3, 0, { familyTiers: { D_UNDERDOG: 1 } }), rng).lastTrick.breakdown.flats).toBeCloseTo(0); // Wert 3 > Schwelle 2
  });
  it("D_RHYTHM: zahlt auf jedem k-ten Sieg (Stufe IV: wins % 3 === 0 → +600)", () => {
    let s = scenario(12, 0, { familyTiers: { D_RHYTHM: 4 }, deck: flatDeck() }); // formationsneutral
    s = resolveTrick(s, rng); expect(s.lastTrick.breakdown.flats).toBeCloseTo(0);   // wins 1
    s = resolveTrick(s, rng); expect(s.lastTrick.breakdown.flats).toBeCloseTo(0);   // wins 2
    s = resolveTrick(s, rng); expect(s.lastTrick.breakdown.flats).toBeCloseTo(600); // wins 3 → 3 % 3 === 0
  });
  it("D_CRIT_HARVEST: scoreFlatOnCrit nur bei Crit MIT aktiver Formation (Stufe I: +175)", () => {
    // 2-Karten-Wiederholung: Pos 0 formationslos, Pos 1 = Wiederholung (hasFormation). Crit über den Blitz-Stau erzwungen.
    const deck = [{ id: "a", suit: "R", baseRank: 12, value: 12 }, { id: "b", suit: "R", baseRank: 12, value: 12 }];
    const opp = [{ id: "o0", suit: "R", baseRank: 0, value: 0 }, { id: "o1", suit: "R", baseRank: 0, value: 0 }];
    const base = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1], oppOrder: [0, 1], familyTiers: { D_CRIT_HARVEST: 1 }, lightning: litCrit(1) };
    let s = resolveTrick(base, rng);          // Pos 0: Crit, aber keine Formation → 0
    expect(s.lastTrick.breakdown.flats).toBeCloseTo(0);
    s = resolveTrick(s, rng);                 // Pos 1: Crit + Wiederholung → +175
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.breakdown.flats).toBeCloseTo(175);
  });
});

describe("Familien-Engine — Kategorie B (Wertboni über resolveTrick)", () => {
  it("B_COUNTER: Familien-cardBonus hebt den Kampfwert der nächsten Karte nach einer Niederlage", () => {
    const s = resolveTrick(scenario(3, 8, { familyTiers: { B_COUNTER: 4 }, lastResult: "loss" }), rng);
    expect(s.lastTrick.pValue).toBe(13); // 3 + 10
    expect(s.wins).toBe(1);              // 13 > 8 → aus der Niederlage wird ein Sieg
  });
  it("B_OPENING: die ersten Karten je Durchlauf erhalten den Wertbonus (Stufe I: Pos 1–2 +2)", () => {
    const s = resolveTrick(scenario(5, 6, { familyTiers: { B_OPENING: 1 } }), rng);
    expect(s.lastTrick.pValue).toBe(7);  // Pos 0 → +2 → 7 > 6 → Sieg
    expect(s.wins).toBe(1);
  });
  it("B_FINALE: die letzten Karten je Durchlauf erhalten den Wertbonus (Stufe I: Pos 39–40 +2)", () => {
    const s = resolveTrick(scenario(5, 6, { familyTiers: { B_FINALE: 1 }, pos: 38 }), rng);
    expect(s.lastTrick.pValue).toBe(7);  // Pos 39 (posInCycle 38 ≥ 38) → +2 → 7 > 6 → Sieg
    expect(s.wins).toBe(1);
    // Position vor dem Fenster (Pos 38, posInCycle 37 < 38) → kein Bonus.
    expect(resolveTrick(scenario(5, 6, { familyTiers: { B_FINALE: 1 }, pos: 37 }), rng).lastTrick.pValue).toBe(5);
  });
  it("B_INITIATIVE: tieArmLosses armiert den Gleichstand-Sieg je Stufe", () => {
    expect(resolveTrick(scenario(3, 8, { familyTiers: { B_INITIATIVE: 1 } }), rng).tieArmed).toBe(false); // 1 Niederlage < Schwelle 2
    expect(resolveTrick(scenario(3, 8, { familyTiers: { B_INITIATIVE: 1 }, lossStreak: 1 }), rng).tieArmed).toBe(true); // 2. Niederlage
    expect(resolveTrick(scenario(3, 8, { familyTiers: { B_INITIATIVE: 2 } }), rng).tieArmed).toBe(true); // Stufe II: schon ab 1
    const win = resolveTrick(scenario(5, 5, { familyTiers: { B_INITIATIVE: 2 }, tieArmed: true }), rng);
    expect(win.wins).toBe(1);
    expect(win.lastTrick.result).toBe("win_tie");
  });
  it("B_INITIATIVE III #189 Fund C: +1 Wert auf die nächste Karte nach Niederlage (differenziert von II)", () => {
    // Nach einer Niederlage (lastResult "loss"): Stufe III hebt den Kampfwert um +1 → aus 5 vs 5 (Gleichstand) wird ein Sieg.
    const s3 = resolveTrick(scenario(5, 5, { familyTiers: { B_INITIATIVE: 3 }, lastResult: "loss" }), rng);
    expect(s3.lastTrick.pValue).toBe(6); // 5 + 1 → 6 > 5 → Sieg
    expect(s3.wins).toBe(1);
    // Stufe II gibt keinen Wertbonus → 5 vs 5 bleibt Gleichstand.
    const s2 = resolveTrick(scenario(5, 5, { familyTiers: { B_INITIATIVE: 2 }, lastResult: "loss" }), rng);
    expect(s2.lastTrick.pValue).toBe(5);
    expect(s2.wins).toBe(0);
  });
  it("B_REVENGE III: bei GENAU 2 Niederlagen +6 auf die nächsten zwei Karten (successorQueue)", () => {
    const s = resolveTrick(scenario(3, 8, { familyTiers: { B_REVENGE: 3 }, lossStreak: 1 }), rng); // 2. Niederlage armiert
    expect(s.successorQueue).toEqual([6, 6]);
    const next = resolveTrick({ ...s, deck: constDeck(4), oppDeck: constDeck(8), playerOrder: identity(), oppOrder: identity(), pos: 0 }, rng);
    expect(next.lastTrick.pValue).toBe(10);   // 4 + 6 (Kopf der Queue)
    expect(next.successorQueue).toEqual([6]); // eine verbraucht
  });
});

describe("Familien-Engine — Kategorie C (Rollen über resolveTrick, Schritt 2b)", () => {
  it("C_VANGUARD: Rollenkarte auf Position 1–5 erhält den Wertbonus (nur mit Rolle)", () => {
    const s = resolveTrick(scenario(5, 6, { familyTiers: { C_VANGUARD: 1 }, roles: { C_VANGUARD: ["X0"] } }), rng);
    expect(s.lastTrick.pValue).toBe(7); // 5 + 2
    expect(s.wins).toBe(1);
    expect(resolveTrick(scenario(5, 6, { familyTiers: { C_VANGUARD: 1 }, roles: {} }), rng).wins).toBe(0); // keine Rolle → 0
  });
  it("C_FINISHER: Rollenkarte auf der letzten Segmentposition erhält den Bonus", () => {
    const s = resolveTrick(scenario(5, 6, { familyTiers: { C_FINISHER: 1 }, roles: { C_FINISHER: ["X4"] }, pos: 4 }), rng);
    expect(s.lastTrick.pValue).toBe(8); // Pos 5 (%5===4) → 5 + 3
  });
  it("C_TRIUMPH: Rollen-Sieg armiert die Karte; beim nächsten Auftauchen +Bonus (Stufe III: +3)", () => {
    let s = resolveTrick(scenario(8, 0, { familyTiers: { C_TRIUMPH: 3 }, roles: { C_TRIUMPH: ["X0"] } }), rng);
    expect(s.triumphArmed).toContain("X0");
    const s2 = resolveTrick({ ...s, deck: constDeck(8), oppDeck: constDeck(0), playerOrder: identity(), oppOrder: identity(), pos: 0 }, rng);
    expect(s2.lastTrick.pValue).toBe(11); // 8 + 3
  });
  it("C_RELAY III: Rollen-Sieg gibt der nächsten Karte +3 (successorQueue)", () => {
    const s = resolveTrick(scenario(8, 0, { familyTiers: { C_RELAY: 3 }, roles: { C_RELAY: ["X0"] } }), rng); // X0 gewinnt
    expect(s.successorQueue[0]).toBe(3);
    expect(resolveTrick(s, rng).lastTrick.pValue).toBe(11); // nächste Karte 8 + 3
  });
  it("C_LEADER IV: Rollen-Sieg armiert die nächsten DREI Karten je +4", () => {
    const s = resolveTrick(scenario(8, 0, { familyTiers: { C_LEADER: 4 }, roles: { C_LEADER: ["X0"] } }), rng);
    expect(s.successorQueue.slice(0, 3)).toEqual([4, 4, 4]);
  });
  it("C_GUARD IV: einer der zwei Vorgänger verlor → +6 (secondLastResult)", () => {
    const armed = scenario(3, 8, { familyTiers: { C_GUARD: 4 }, roles: { C_GUARD: ["X0"] }, lastResult: "win", recentResults: ["loss", "win"] });
    expect(resolveTrick(armed, rng).lastTrick.pValue).toBe(9); // 3 + 6 (zweiter Vorgänger verlor)
    const both = scenario(3, 8, { familyTiers: { C_GUARD: 4 }, roles: { C_GUARD: ["X0"] }, lastResult: "win", recentResults: ["win", "win"] });
    expect(resolveTrick(both, rng).lastTrick.pValue).toBe(3); // beide gewonnen → kein Bonus
  });
  it("C_ECKPFEILER: Rollenkarte in einer Formation erhält den Bonus (nur mit Rolle + Formation)", () => {
    // constDeck(5): identische Werte → Wiederholung je Segment; Pos 3 (posInCycle 2, 3. Karte) liegt in der Formation (mult>1).
    // Formationen werden nur bei pos 0 berechnet und für den Durchlauf gehalten → für pos>0 vorberechnet mitgeben.
    const forms = computeFormations(identity(), constDeck(5), {}, [], [], [], {}, null);
    const eck = (over) => scenario(5, 6, { formations: forms, ...over });
    const s = resolveTrick(eck({ familyTiers: { C_ECKPFEILER: 1 }, roles: { C_ECKPFEILER: ["X2"] }, pos: 2 }), rng);
    expect(s.lastTrick.pValue).toBe(8); // 5 + 3 (in Wiederholung)
    expect(s.wins).toBe(1);
    // ohne Rolle → kein Bonus.
    expect(resolveTrick(eck({ familyTiers: { C_ECKPFEILER: 1 }, roles: {}, pos: 2 }), rng).lastTrick.pValue).toBe(5);
    // Rollenkarte auf Pos 1 (erste Karte der Wiederholung → mult 1, keine Formation) → kein Bonus.
    expect(resolveTrick(eck({ familyTiers: { C_ECKPFEILER: 1 }, roles: { C_ECKPFEILER: ["X0"] }, pos: 0 }), rng).lastTrick.pValue).toBe(5);
    // Stufe IV Basis (eine Formation) → +6.
    expect(resolveTrick(eck({ familyTiers: { C_ECKPFEILER: 4 }, roles: { C_ECKPFEILER: ["X2"] }, pos: 2 }), rng).lastTrick.pValue).toBe(11);
  });
  it("C_ECKSTEIN (Gebäude-Perk): Rollenkarte in einem Gebäude erhält den Bonus", () => {
    // Score-Gebäude (A_ZOLLHAUS) deckt Positionen 2,3 ab OHNE Wertbonus → isoliert den C_ECKSTEIN-Wert.
    const arch = { buildings: [{ id: "b1", familyId: "A_ZOLLHAUS", tier: 1, footprint: [2, 3] }], winCounters: {} };
    const pre = precomputeArchitect(arch, identity(), constDeck(5));
    const eck = (over) => scenario(5, 6, { architectPre: pre, ...over });
    expect(resolveTrick(eck({ familyTiers: { C_ECKSTEIN: 1 }, roles: { C_ECKSTEIN: ["X2"] }, pos: 2 }), rng).lastTrick.pValue).toBe(8); // 5 + 3 (in Gebäude)
    // ohne Rolle → kein Bonus.
    expect(resolveTrick(eck({ familyTiers: { C_ECKSTEIN: 1 }, roles: {}, pos: 2 }), rng).lastTrick.pValue).toBe(5);
    // Rollenkarte auf unbedeckter Position (Pos 1) → kein Bonus.
    expect(resolveTrick(eck({ familyTiers: { C_ECKSTEIN: 1 }, roles: { C_ECKSTEIN: ["X1"] }, pos: 1 }), rng).lastTrick.pValue).toBe(5);
  });
  it("D_BEBAUUNG (Gebäude-Perk): Flat-Score skaliert mit der Abdeckung (coverCount)", () => {
    const arch = { buildings: [{ id: "b1", familyId: "A_ZOLLHAUS", tier: 1, footprint: [2, 3] }], winCounters: {} };
    const pre = precomputeArchitect(arch, identity(), constDeck(8)); // coverCount = 2
    // Sieg (8 > 6) an einer beliebigen Position: D_BEBAUUNG I → +4 je Zelle = +8 Flat (einziger scoreFlat-Leser).
    const s = resolveTrick(scenario(8, 6, { familyTiers: { D_BEBAUUNG: 1 }, architectPre: pre, pos: 10 }), rng);
    expect(s.lastTrick.breakdown.flats).toBeCloseTo(8); // 4 × coverCount(2)
  });
  it("C_SURVIVOR: Segment-Rang (I nur erste 4 Segmente, II nur Tiefste, III zwei Tiefste)", () => {
    // Segment 0 (Pos 0–4) Werte [1,5,2,9,7] → Pos 0 tiefste (Rang 0), Pos 2 zweittiefste (Rang 1).
    const deck = [1, 5, 2, 9, 7, ...Array(35).fill(9)].map((v, i) => ({ id: `Y${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
    const base = (fam, over) => ({ ...initialState(makeRng(1)), deck, oppDeck: constDeck(0), playerOrder: identity(), oppOrder: identity(), familyTiers: fam, ...over });
    expect(resolveTrick(base({ C_SURVIVOR: 1 }), rng).lastTrick.pValue).toBe(3);              // Pos 0 tiefste, Segment 0 <4 → +2
    expect(resolveTrick(base({ C_SURVIVOR: 3 }, { pos: 2 }), rng).lastTrick.pValue).toBe(5);  // Pos 2 Rang 1 → +3
    expect(resolveTrick(base({ C_SURVIVOR: 2 }, { pos: 2 }), rng).lastTrick.pValue).toBe(2);  // II nur Tiefste → Rang 1 kein Bonus
  });
});

describe("Familien-Engine — Kategorie E (E_QUICKSHOT IV Anker-Wert über resolveTrick)", () => {
  it("E_QUICKSHOT IV: jede fünfte Position (Anker) erhält +2 Wert; andere Positionen/Stufen nicht", () => {
    expect(resolveTrick(scenario(5, 0, { familyTiers: { E_QUICKSHOT: 4 }, pos: 4 }), rng).lastTrick.pValue).toBe(7); // Pos 5 → +2
    expect(resolveTrick(scenario(5, 0, { familyTiers: { E_QUICKSHOT: 4 }, pos: 3 }), rng).lastTrick.pValue).toBe(5); // Pos 4 → kein Anker
    expect(resolveTrick(scenario(5, 0, { familyTiers: { E_QUICKSHOT: 3 }, pos: 4 }), rng).lastTrick.pValue).toBe(5); // III: anchor.value 0 → kein Wertbonus
  });
});

describe("Legendär-Engine — L_MONO Monochrom (scoreMult über Farbserie)", () => {
  it("scoreMult greift multiplikativ über resolveTrick (Farbserie 3 → +30 %)", () => {
    // flatDeck: F0 = Farbe R, Wert 12 → Sieg gegen 0, keine Formation. winSuit R + winSuitStreak 2 → suitStreak 3.
    const base = (perks) => ({ ...initialState(makeRng(1)), deck: flatDeck(), oppDeck: constDeck(0),
      playerOrder: identity(), oppOrder: identity(), perks, winSuit: "R", winSuitStreak: 2 });
    const withMono = resolveTrick(base(["L_MONO"]), rng).lastTrick.gained;
    const without  = resolveTrick(base([]), rng).lastTrick.gained;
    expect(withMono / without).toBeCloseTo(1 + 2 * 0.15); // suitStreak 3 → ×1,30
  });
});

describe("Gebäude-Legendäre — Richtfest (Durchlauf-Ende) + Bauhütte (Pick)", () => {
  it("completedStructures/precompute: eine volle Segment-Zeile = 1 Struktur", () => {
    const arch = { buildings: [{ id: "b1", familyId: "A_PRUNKSAAL", tier: "legendary", footprint: [0, 1, 2, 3, 4] }], winCounters: {} };
    expect(precomputeArchitect(arch, identity(), constDeck(12)).structureCount).toBe(1);
  });
  it("L_RICHT (Richtfest): Struktur-Dividende stapelt je Durchlauf-Ende (+Schritt × Strukturen)", () => {
    const arch = { buildings: [{ id: "b1", familyId: "A_PRUNKSAAL", tier: "legendary", footprint: [0, 1, 2, 3, 4] }], winCounters: {} };
    const pre = precomputeArchitect(arch, identity(), constDeck(12));
    const s = resolveTrick(scenario(12, 0, { perks: ["L_RICHT"], pos: 39, architectPre: pre, richtfestBonus: 0 }), rng);
    expect(s.cycle).toBe(1);                                  // Durchlauf-Ende
    expect(s.richtfestBonus).toBe(RICHTFEST_STEP);            // 1 Struktur → +Schritt
    // Folgedurchlauf mit demselben Bau: stapelt weiter.
    const s2 = resolveTrick(scenario(12, 0, { perks: ["L_RICHT"], pos: 39, architectPre: pre, richtfestBonus: RICHTFEST_STEP }), rng);
    expect(s2.richtfestBonus).toBe(2 * RICHTFEST_STEP);
    // ohne vollendete Struktur (kein Bau) → kein Zuwachs.
    const s0 = resolveTrick(scenario(12, 0, { perks: ["L_RICHT"], pos: 39, richtfestBonus: 0 }), rng);
    expect(s0.richtfestBonus).toBe(0);
  });
  it("L_BAUH (Bauhütte): PICK_PERK hebt den Baufeld-Deckel (maxCover) dauerhaft", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L_BAUH"] };
    const before = s0.architect.maxCover;
    const s1 = reducer(s0, { type: "PICK_PERK", perkId: "L_BAUH", rng });
    expect(s1.perks).toContain("L_BAUH");
    expect(s1.architect.maxCover).toBe(before + BAUHUETTE_COVER);
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

describe("Reducer PICK_FAMILY — Kategorie A (kumulativ, Deck-Patch stapelt)", () => {
  const val = (deck, base) => deck.filter((c) => c.baseRank === base).map((c) => c.value);
  it("wendet das Stufen-Deckpaket an und stapelt über Stufen (nur höchster Rang angezeigt)", () => {
    let s = { ...initialState(makeRng(1)), phase: "levelup", offer: [{ familyId: "A_WEAK_STRONG", tier: 1 }] };
    s = reducer(s, { type: "PICK_FAMILY", familyId: "A_WEAK_STRONG", tier: 1, rng });
    expect(s.familyTiers.A_WEAK_STRONG).toBe(1);
    expect(s.phase).toBe("play");
    expect(val(s.deck, 5)).toEqual([6, 6, 6, 6]); // ursprüngliche 5er +1
    // Upgrade auf II: 4er +2 (neues Paket), 5er-Bonus aus I bleibt erhalten (kumulativ).
    s = { ...s, phase: "levelup", offer: [{ familyId: "A_WEAK_STRONG", tier: 2 }] };
    s = reducer(s, { type: "PICK_FAMILY", familyId: "A_WEAK_STRONG", tier: 2, rng });
    expect(s.familyTiers.A_WEAK_STRONG).toBe(2);             // nur der höchste Rang
    expect(Object.keys(s.familyTiers)).toEqual(["A_WEAK_STRONG"]);
    expect(val(s.deck, 5)).toEqual([6, 6, 6, 6]);            // I-Bonus bleibt
    expect(val(s.deck, 4)).toEqual([6, 6, 6, 6]);            // II wendet sein Paket an
  });
});

describe("Familien-Ziel-Fluss — pickTarget-Stufen (Rarität #167, Kat. A)", () => {
  const base = (offerEntry) => ({ ...initialState(makeRng(1)), phase: "levelup", offer: [offerEntry] });

  it("PICK_FAMILY auf eine pickTarget-Stufe öffnet die Ziel-Phase, wendet noch nichts an", () => {
    const s0 = base({ familyId: "A_SUIT_BOOST", tier: 3 });
    const s1 = reducer(s0, { type: "PICK_FAMILY", familyId: "A_SUIT_BOOST", tier: 3, rng });
    expect(s1.phase).toBe("family-target");
    expect(s1.familyTarget).toEqual({ familyId: "A_SUIT_BOOST", tier: 3, kind: "suits", need: 1, suits: [], cards: [], formationType: null });
    expect(s1.offer).toBeNull();
    expect(s1.deck).toBe(s0.deck);       // noch keine Deckmod
    expect(s1.familyTiers).toEqual({});  // Rang erst bei CONFIRM
  });

  it("FAMILY_TARGET_SUIT: Einzelwahl (need 1) schaltet um, ungültige Farbe wird ignoriert", () => {
    let s = reducer(base({ familyId: "A_SUIT_BOOST", tier: 3 }), { type: "PICK_FAMILY", familyId: "A_SUIT_BOOST", tier: 3, rng });
    s = reducer(s, { type: "FAMILY_TARGET_SUIT", suit: "R" });
    expect(s.familyTarget.suits).toEqual(["R"]);
    s = reducer(s, { type: "FAMILY_TARGET_SUIT", suit: "B" }); // Einzelwahl → ersetzt
    expect(s.familyTarget.suits).toEqual(["B"]);
    s = reducer(s, { type: "FAMILY_TARGET_SUIT", suit: "B" }); // erneut → abwählen
    expect(s.familyTarget.suits).toEqual([]);
    expect(reducer(s, { type: "FAMILY_TARGET_SUIT", suit: "Z" }).familyTarget.suits).toEqual([]); // ungültig
  });

  it("FAMILY_TARGET_CONFIRM (A_SUIT_BOOST IV): gewählte Farbe +2, Rang gesetzt, zurück ins Spiel", () => {
    let s = reducer(base({ familyId: "A_SUIT_BOOST", tier: 4 }), { type: "PICK_FAMILY", familyId: "A_SUIT_BOOST", tier: 4, rng });
    s = reducer(s, { type: "FAMILY_TARGET_SUIT", suit: "G" });
    s = reducer(s, { type: "FAMILY_TARGET_CONFIRM", rng });
    expect(s.phase).toBe("play");
    expect(s.familyTarget).toBeNull();
    expect(s.familyTiers).toEqual({ A_SUIT_BOOST: 4 });
    expect(s.deck.filter((c) => c.suit === "G").every((c) => c.value === c.baseRank + 2)).toBe(true);
    expect(s.deck.filter((c) => c.suit !== "G").every((c) => c.value === c.baseRank)).toBe(true);
  });

  it("FAMILY_TARGET_CONFIRM verlangt genau N Farben (unvollständig → No-Op)", () => {
    let s = reducer(base({ familyId: "A_SUIT_DUEL", tier: 4 }), { type: "PICK_FAMILY", familyId: "A_SUIT_DUEL", tier: 4, rng });
    s = reducer(s, { type: "FAMILY_TARGET_SUIT", suit: "R" }); // erst 1 von 2
    const s2 = reducer(s, { type: "FAMILY_TARGET_CONFIRM", rng });
    expect(s2).toBe(s);                    // unverändert
    expect(s2.phase).toBe("family-target");
  });

  it("A_SUIT_DUEL IV: Reihenfolge Gewinner→Verlierer (R +4 / G −1)", () => {
    let s = reducer(base({ familyId: "A_SUIT_DUEL", tier: 4 }), { type: "PICK_FAMILY", familyId: "A_SUIT_DUEL", tier: 4, rng });
    s = reducer(s, { type: "FAMILY_TARGET_SUIT", suit: "R" }); // Gewinner
    s = reducer(s, { type: "FAMILY_TARGET_SUIT", suit: "G" }); // Verlierer
    expect(s.familyTarget.suits).toEqual(["R", "G"]);
    s = reducer(s, { type: "FAMILY_TARGET_CONFIRM", rng });
    expect(s.familyTiers).toEqual({ A_SUIT_DUEL: 4 });
    expect(s.deck.filter((c) => c.suit === "R").every((c) => c.value === c.baseRank + 4)).toBe(true);
    expect(s.deck.filter((c) => c.suit === "G").every((c) => c.value === Math.max(0, c.baseRank - 1))).toBe(true);
    expect(s.deck.filter((c) => c.suit === "B" || c.suit === "Y").every((c) => c.value === c.baseRank)).toBe(true);
  });

  it("zielfreie A-Stufe und REPLACEMENT-Familie (D) gehen direkt ins Spiel (keine Ziel-Phase)", () => {
    const a = reducer(base({ familyId: "A_SUIT_BOOST", tier: 1 }), { type: "PICK_FAMILY", familyId: "A_SUIT_BOOST", tier: 1, rng });
    expect(a.phase).toBe("play"); // I = zufällige Farbe, kein pickTarget
    const d = reducer({ ...initialState(makeRng(1)), phase: "levelup", offer: [{ familyId: "D_HIGH", tier: 3 }] }, { type: "PICK_FAMILY", familyId: "D_HIGH", tier: 3, rng });
    expect(d.phase).toBe("play");
  });

  it("Ziel-Actions in falscher Phase sind No-Ops", () => {
    const play = { ...initialState(makeRng(1)), phase: "play" };
    expect(reducer(play, { type: "FAMILY_TARGET_SUIT", suit: "R" })).toBe(play);
    expect(reducer(play, { type: "FAMILY_TARGET_CONFIRM", rng })).toBe(play);
  });

  it("initialState trägt familyTarget = null", () => {
    expect(initialState(makeRng(1)).familyTarget).toBeNull();
  });
});

describe("Familien-Ziel-Fluss — Karten-Modus (Kat. C Rollen + C_SACRIFICE)", () => {
  const lvl = (offerEntry, over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", offer: [offerEntry], ...over });

  it("ROLE (C_VANGUARD I): PICK_FAMILY öffnet Karten-Ziel (need 1), CONFIRM setzt roles[familyId]", () => {
    let s = reducer(lvl({ familyId: "C_VANGUARD", tier: 1 }), { type: "PICK_FAMILY", familyId: "C_VANGUARD", tier: 1, rng });
    expect(s.phase).toBe("family-target");
    expect(s.familyTarget).toMatchObject({ familyId: "C_VANGUARD", tier: 1, kind: "cards", need: 1, cards: [] });
    s = reducer(s, { type: "FAMILY_TARGET_CARD", cardId: "R5" });
    expect(s.familyTarget.cards).toEqual(["R5"]);
    s = reducer(s, { type: "FAMILY_TARGET_CONFIRM", rng });
    expect(s.phase).toBe("play");
    expect(s.familyTiers).toEqual({ C_VANGUARD: 1 });
    expect(s.roles.C_VANGUARD).toEqual(["R5"]);
    expect(s.familyTarget).toBeNull();
  });

  it("ROLE-Upgrade wählt nur ZUSÄTZLICHE Ziele; bestehende bleiben (Spec §2.3)", () => {
    let s = { ...initialState(makeRng(1)), phase: "levelup", offer: [{ familyId: "C_VANGUARD", tier: 3 }],
              familyTiers: { C_VANGUARD: 1 }, roles: { C_VANGUARD: ["R5"] } };
    s = reducer(s, { type: "PICK_FAMILY", familyId: "C_VANGUARD", tier: 3, rng });
    expect(s.familyTarget.need).toBe(2); // 3 Ziele − 1 bereits gehalten
    s = reducer(s, { type: "FAMILY_TARGET_CARD", cardId: "R6" });
    s = reducer(s, { type: "FAMILY_TARGET_CARD", cardId: "R7" });
    s = reducer(s, { type: "FAMILY_TARGET_CONFIRM", rng });
    expect(s.familyTiers.C_VANGUARD).toBe(3);
    expect(s.roles.C_VANGUARD).toEqual(["R5", "R6", "R7"]); // Bestand + zwei neue
  });

  it("ROLE-Upgrade ohne neue Ziele (need 0) wendet direkt an (C_LEADER I→II, je 1 Ziel)", () => {
    let s = { ...initialState(makeRng(1)), phase: "levelup", offer: [{ familyId: "C_LEADER", tier: 2 }],
              familyTiers: { C_LEADER: 1 }, roles: { C_LEADER: ["R5"] } };
    s = reducer(s, { type: "PICK_FAMILY", familyId: "C_LEADER", tier: 2, rng });
    expect(s.phase).toBe("play");             // keine Ziel-Phase
    expect(s.familyTiers.C_LEADER).toBe(2);
    expect(s.roles.C_LEADER).toEqual(["R5"]); // Rolle unverändert
  });

  it("FAMILY_TARGET_CARD: gehaltene Rollenkarte, unbekannte Karte und Limit werden ignoriert", () => {
    let s = { ...initialState(makeRng(1)), phase: "levelup", offer: [{ familyId: "C_VANGUARD", tier: 3 }],
              familyTiers: { C_VANGUARD: 1 }, roles: { C_VANGUARD: ["R5"] } };
    s = reducer(s, { type: "PICK_FAMILY", familyId: "C_VANGUARD", tier: 3, rng }); // need 2
    expect(reducer(s, { type: "FAMILY_TARGET_CARD", cardId: "R5" }).familyTarget.cards).toEqual([]);   // bereits Rolle
    expect(reducer(s, { type: "FAMILY_TARGET_CARD", cardId: "ZZ9" }).familyTarget.cards).toEqual([]);  // existiert nicht
    s = reducer(s, { type: "FAMILY_TARGET_CARD", cardId: "R6" });
    s = reducer(s, { type: "FAMILY_TARGET_CARD", cardId: "R7" });
    expect(reducer(s, { type: "FAMILY_TARGET_CARD", cardId: "R8" }).familyTarget.cards).toEqual(["R6", "R7"]); // Limit 2
  });

  it("CUMULATIVE (C_SACRIFICE I): Karten-Ziel opfert die Karte (−2) & bufft Nachfolger (+3), keine Rolle", () => {
    const deck = ["a", "b", "c"].map((id) => ({ id, suit: "R", baseRank: 5, value: 5 }));
    let s = { ...initialState(makeRng(1)), phase: "levelup", offer: [{ familyId: "C_SACRIFICE", tier: 1 }], deck, playerOrder: [0, 1, 2] };
    s = reducer(s, { type: "PICK_FAMILY", familyId: "C_SACRIFICE", tier: 1, rng });
    expect(s.familyTarget).toMatchObject({ kind: "cards", need: 1 });
    s = reducer(s, { type: "FAMILY_TARGET_CARD", cardId: "a" });
    s = reducer(s, { type: "FAMILY_TARGET_CONFIRM", rng });
    expect(s.familyTiers).toEqual({ C_SACRIFICE: 1 });
    expect(s.deck.map((c) => c.value)).toEqual([3, 8, 5]); // a −2, direkter Nachfolger b +3
    expect(s.roles.C_SACRIFICE).toBeUndefined();           // Deck-Mod, keine Rolle
  });
});

describe("Engine-Parameter je Stufe (Schritt 2) — engine-gekoppelte D-Familien", () => {
  it("D_MISFIRE: Stufen-Schritt/Cap laden die Ladung (I: +20/200)", () => {
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_MISFIRE: 1 }, misfireScore: 0 }), never).misfireScore).toBe(20);
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_MISFIRE: 1 }, misfireScore: 190 }), never).misfireScore).toBe(200); // Cap
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_MISFIRE: 4 }, misfireScore: 0 }), never).misfireScore).toBe(75); // IV-Schritt
  });
  it("D_MISFIRE IV: Crit zahlt die volle Ladung aus und behält 25 %", () => {
    const paid = resolveTrick(scenario(12, 0, { familyTiers: { D_MISFIRE: 4 }, lightning: litCrit(1), misfireScore: 400 }), never);
    expect(paid.lastTrick.isCrit).toBe(true);
    expect(paid.misfireScore).toBe(100); // round(400 × 0,25)
    expect(paid.lastTrick.gained).toBeCloseTo((B +400) * 1.02 * paid.lastTrick.critMultiplier); // volle 400 in die Basis
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
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_WEAKNESS: 4 }, weaknessArmed: true, weaknessBig: true }), never).score).toBeCloseTo((B +900) * 1.02);
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_WEAKNESS: 4 }, weaknessArmed: true, weaknessBig: false }), never).score).toBeCloseTo((B +600) * 1.02);
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_WEAKNESS: 4 }, weaknessArmed: true, weaknessBig: true }), never).weaknessBig).toBe(false); // Sieg verbraucht
  });

  it("D_SUIT_STREAK IV: Farbwechsel halbiert die Länge (statt Reset auf 1)", () => {
    // Pos 0 ist Farbe R; state-Farbe B → Wechsel. IV: floor(6/2)=3; I: Reset auf 1.
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_SUIT_STREAK: 4 }, winSuit: "B", winSuitStreak: 6 }), never).winSuitStreak).toBe(3);
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_SUIT_STREAK: 1 }, winSuit: "B", winSuitStreak: 6 }), never).winSuitStreak).toBe(1);
  });

  it("D_CRIT_MOMENTUM IV: ein Crit erhöht die Siegesserie zusätzlich um 1", () => {
    const iv = resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_MOMENTUM: 4 }, lightning: litCrit(1) }), never);
    expect(iv.lastTrick.isCrit).toBe(true);
    expect(iv.winStreak).toBe(2); // +1 Sieg, +1 Crit-Bonus
    // Stufe III ohne streakGainOnCrit → nur der Sieg zählt.
    expect(resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_MOMENTUM: 3 }, lightning: litCrit(1) }), never).winStreak).toBe(1);
  });

  it("D_INTERPLAY IV: Niederlage speichert +200, der nächste Sieg zahlt sie als Flat aus (Stufe III speichert nicht)", () => {
    const afterLoss = resolveTrick(scenario(0, 12, { familyTiers: { D_INTERPLAY: 4 } }), never);
    expect(afterLoss.score).toBe(0);              // Niederlage zahlt nicht sofort aus
    expect(afterLoss.interplayStored).toBe(200);  // sondern bankt
    expect(resolveTrick(scenario(0, 12, { familyTiers: { D_INTERPLAY: 3 } }), never).interplayStored).toBe(0);
    // Nächster Sieg nach Niederlage: 700 (Wechselspiel-Basis) + 200 (gespeichert) in die multiplizierte Basis; danach verbraucht.
    const win = resolveTrick(scenario(12, 0, { familyTiers: { D_INTERPLAY: 4 }, interplayStored: 200, lastResult: "loss" }), never);
    expect(win.score).toBeCloseTo((B +700 + 200) * 1.02);
    expect(win.interplayStored).toBe(0);
  });

  it("D_CRIT_FOLLOW IV: Crit-Folgesieg, der selbst Crit ist, gibt zusätzlich +300", () => {
    const cf = resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_FOLLOW: 4 }, critFollowArmed: true, lightning: litCrit(1) }), never);
    expect(cf.lastTrick.isCrit).toBe(true);
    expect(cf.lastTrick.gained).toBeCloseTo((B +700 + 300) * 1.02 * cf.lastTrick.critMultiplier); // 700 (Folge) + 300 (Crit-Bonus)
    // Folgesieg ohne Crit → nur die 700 (kein +300).
    const noCrit = resolveTrick(scenario(12, 0, { familyTiers: { D_CRIT_FOLLOW: 4 }, critFollowArmed: true } ), never);
    expect(noCrit.lastTrick.isCrit).toBe(false);
    expect(noCrit.score).toBeCloseTo((B +700) * 1.02);
  });

  it("D_FULL_HOUSE: löst über den generischen Hook auf (fünfter Segment-Sieg → +500, Stufe I)", () => {
    let s = scenario(0, 0, { familyTiers: { D_FULL_HOUSE: 1 }, deck: flatDeck(), oppDeck: constDeck(0) });
    for (let i = 0; i < 5; i++) s = resolveTrick(s, never); // fünf Siege in Folge, fünfter auf Segmentposition 4
    expect(s.lastTrick.breakdown.flats).toBeCloseTo(500); // isolierter Flat-Anteil der Familie
  });

  it("D_FULL_HOUSE #189: zählt segment-genau — kein Leck über die Segmentgrenze", () => {
    // Spieler 5 überall; Gegner 0 überall AUSSER Position 5 (=9 → Niederlage). D_FULL_HOUSE II triggert an der
    // 4. Segmentkarte (posInCycle%5===3) bei ≥3 Segment-Siegen davor. In Segment 1 (Pos 5–9) siegt der Spieler nur
    // an Pos 6 und 7 (Pos 5 = Niederlage) → an Pos 8 nur 2 Segment-Siege davor → KEIN Bonus. Das alte rollende
    // 4er-Fenster hätte den Sieg an Pos 4 (Segment 0) mitgezählt und fälschlich +650 gegeben.
    const pDeck = Array.from({ length: 40 }, (_, i) => ({ id: `P${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: 5, value: 5 }));
    const oDeck = Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: 0, value: i === 5 ? 9 : 0 }));
    let s = { ...initialState(makeRng(1)), deck: pDeck, oppDeck: oDeck, playerOrder: identity(), oppOrder: identity(), familyTiers: { D_FULL_HOUSE: 2 } };
    for (let i = 0; i < 9; i++) s = resolveTrick(s, never); // bis Pos 8 (4. Karte von Segment 1)
    expect(s.lastTrick.originalPosition).toBe(8);
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.breakdown.flats).toBeCloseTo(0); // nur 2 Segment-Siege davor → kein Full-House (früher: +650 Leck)
  });

});

// #267 Teil 2: die Perk-Familie „Präzision" (Kat. P) ist der ENGINE-Ersatz für den entfernten Crit-Stat — sie speist
// über die critChance-/critMult-Hooks direkt die Crit-Aggregation in resolveTrick (Basis-Crit-Chance 0, Basis-Mult 1,5).
// End-to-End über resolveTrick: rng 0,99 → kein realer Crit (nur critChance ablesbar), rng 0 → Crit erzwungen.
describe("Familien-Engine — Kategorie P (Präzision: Crit-Chance/-Mult über resolveTrick, #267)", () => {
  const zero = () => 0, high = () => 0.99;
  const suitDeck = (suit) => Array.from({ length: 40 }, (_, i) => ({ id: `${suit}${i}`, suit, baseRank: 12, value: 12 }));

  it("P_SHARPNESS: flache Crit-Chance auf ALLE Karten (Stufe I 0,06 / IV 0,15)", () => {
    expect(resolveTrick(scenario(12, 0, { familyTiers: { P_SHARPNESS: 1 } }), high).lastTrick.critChance).toBeCloseTo(0.06);
    expect(resolveTrick(scenario(12, 0, { familyTiers: { P_SHARPNESS: 4 } }), high).lastTrick.critChance).toBeCloseTo(0.15);
  });

  it("P_FORCE: +Crit-Multiplikator auf den Basis-Crit-Mult (Stufe I → +0,25 / IV → +0,90); Crit via P_SHARPNESS + rng 0 erzwungen", () => {
    // P_SHARPNESS IV liefert die Crit-CHANCE (0,15), rng 0 löst den Crit aus; P_FORCE liefert nur den Crit-MULT.
    const trick = (force) => resolveTrick(scenario(12, 0, { familyTiers: { P_FORCE: force, P_SHARPNESS: 4 } }), zero).lastTrick;
    expect(trick(1).isCrit).toBe(true);
    expect(trick(1).critMultiplier).toBeCloseTo(CRIT_BASE_MULT + PRECISION_FORCE_MULT[0]); // Basis + 0,25
    expect(trick(4).critMultiplier).toBeCloseTo(CRIT_BASE_MULT + PRECISION_FORCE_MULT[3]); // Basis + 0,90
  });

  it("P_AIM: Crit-Chance nur auf Karten ab der Stufen-Schwelle (IV: Wert ≥ 6)", () => {
    expect(resolveTrick(scenario(6, 0, { familyTiers: { P_AIM: 4 } }), high).lastTrick.critChance).toBeCloseTo(0.15); // Wert 6 ≥ 6 → +0,15
    expect(resolveTrick(scenario(5, 0, { familyTiers: { P_AIM: 4 } }), high).lastTrick.critChance).toBeCloseTo(0);    // Wert 5 < 6 → nichts
  });

  it("P_COLORFOCUS: Crit-Chance nur auf der gewählten Farbe (roles.P_COLORFOCUS → focusSuits)", () => {
    const focusCrit = (suit) => resolveTrick(scenario(12, 0, { deck: suitDeck(suit), familyTiers: { P_COLORFOCUS: 1 }, roles: { P_COLORFOCUS: ["R"] } }), high).lastTrick.critChance;
    expect(focusCrit("R")).toBeCloseTo(0.10); // R = Fokusfarbe → +0,10
    expect(focusCrit("B")).toBeCloseTo(0);    // B ≠ Fokus → keine Crit-Chance
  });

  it("P_LENS (Variante B): +Crit-Chance je Formation AB DER 2. an der Siegposition, Cap +3 Extra-Formationen", () => {
    // Konditionaler Generator: liest formCount = #aktive Formationen der Siegposition (die Engine speist critFamCtx.formCount).
    // Belohnt TIEFE (Formations-Overlap), nicht bloße Präsenz — die 1. Formation zählt nicht, dann je +0,13 (Stufe IV), gedeckelt.
    const h = FAMILY_DEFS.P_LENS.tiers[4].critChance;
    expect(h({ formCount: 1 })).toBeCloseTo(0);     // nur 1 Formation → nichts (erst ab der 2.)
    expect(h({ formCount: 2 })).toBeCloseTo(0.13);  // 1 Extra-Formation × 0,13
    expect(h({ formCount: 3 })).toBeCloseTo(0.26);  // 2 Extra × 0,13
    expect(h({ formCount: 6 })).toBeCloseTo(0.39);  // Cap +3 → 3 × 0,13 (kein weiterer Zuwachs)
    // Stufe I skaliert schwächer (0,06 je Extra-Formation).
    expect(FAMILY_DEFS.P_LENS.tiers[1].critChance({ formCount: 3 })).toBeCloseTo(0.12);
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

  it("reguläre D-/A-/C-/E-Perks sind vollständig zu Familien migriert — kein flacher regulärer Perk dieser Kat. mehr", () => {
    // Nach der Entfernung existiert kein regulärer (nicht-legendärer) cat-D-/A-/C-/E-Perk mehr im flachen Pool
    // (Ausnahme: E10, cat E, aber offerable:false → nie im Angebot). Legendäre bleiben flach → isMigratedPerk = false.
    for (const cat of ["D", "A", "C"]) expect(PERK_LIST.some((p) => p.cat === cat && !isLegendary(p.id))).toBe(false);
    expect(PERK_LIST.some((p) => p.cat === "E" && !isLegendary(p.id) && p.offerable !== false)).toBe(false); // nur E10 (offerable:false)
    expect(isMigratedPerk(PERK_DEFS.L2)).toBe(false); // Legendär bleibt flach
    expect(isMigratedPerk(PERK_DEFS.L1)).toBe(false); // cat A, aber legendär → bleibt flach
    // Über viele Seeds: das Angebot enthält nie einen flachen regulären D-/A-/C-/E-Perk — sie erscheinen nur als Familie.
    for (let seed = 0; seed < 40; seed++) {
      for (const e of buildPerkOffer([], {}, rngS(seed), 3)) {
        if (!isFam(e)) expect(["D", "A", "C", "E"].includes(PERK_DEFS[e].cat) && !isLegendary(e)).toBe(false);
      }
    }
  });

  it("deterministisch über den rng (gleicher Seed → gleiches Angebot)", () => {
    expect(buildPerkOffer([], {}, rngS(7), 3)).toEqual(buildPerkOffer([], {}, rngS(7), 3));
    // #156: der Seed treibt das Angebot — über mehrere Seeds ist es nicht konstant (kein Stub bestünde das).
    const offers = Array.from({ length: 8 }, (_, s) => JSON.stringify(buildPerkOffer([], {}, rngS(s + 1), 3)));
    expect(new Set(offers).size).toBeGreaterThan(1);
  });

  it("eine Familie erscheint höchstens einmal je Angebot (keine zwei Stufen derselben Familie)", () => {
    for (let seed = 0; seed < 40; seed++) {
      const fams = buildPerkOffer([], {}, rngS(seed), 3).filter(isFam).map((e) => e.familyId);
      expect(new Set(fams).size).toBe(fams.length);
    }
  });

  it("Gebäude-Perks (needsArchitect): nur mit aktivem Architekten im Angebot", () => {
    // count groß → Pool wird komplett gezogen (jede Familie einmal). Vergleich der gezogenen Familien-IDs.
    const drawAllFams = (arch) => buildPerkOffer([], {}, rngS(1), 200, 0, 0, arch).filter(isFam).map((e) => e.familyId);
    const withArch = drawAllFams(true);
    expect(withArch).toContain("C_ECKSTEIN");
    expect(withArch).toContain("D_BEBAUUNG");
    const withoutArch = drawAllFams(false); // Default (Sim/Bestand) → gegatet
    expect(withoutArch).not.toContain("C_ECKSTEIN");
    expect(withoutArch).not.toContain("D_BEBAUUNG");
    expect(withoutArch.length).toBe(withArch.length - 2); // exakt die zwei Gebäude-Familien fehlen
  });

  it("Gebäude-Legendäre (needsArchitect) nur mit Architekt im flachen Pool", () => {
    // Alle Nicht-Gebäude-Legendären besessen + alle Familien auf IV → einzig offerbar: L_RICHT/L_BAUH.
    const ownedLeg = ["L2", "L4", "L6", "L_UMV", "L_ZINS", "L_VAB", "L_HENK", "L_ECHO", "L_SAMM", "L_BRENN", "L_PATT", "L_MONO"];
    const allFamsIV = Object.fromEntries(Object.keys(FAMILY_DEFS).map((id) => [id, 4]));
    let sawBuild = false;
    for (let seed = 0; seed < 20 && !sawBuild; seed++) // mit Architekt: Legendär-Wurf zieht ein Gebäude-Legendäres
      if (buildPerkOffer(ownedLeg, allFamsIV, rngS(seed), 3, 1, 0, true).some((e) => e === "L_RICHT" || e === "L_BAUH")) sawBuild = true;
    expect(sawBuild).toBe(true);
    for (let seed = 0; seed < 20; seed++) { // ohne Architekt: nie ein Gebäude-Legendäres
      const off = buildPerkOffer(ownedLeg, allFamsIV, rngS(seed), 3, 1, 0, false);
      expect(off).not.toContain("L_RICHT");
      expect(off).not.toContain("L_BAUH");
    }
  });

  it("bietet nur Stufen ECHT über dem gehaltenen Rang an; IV schließt die Familie ab", () => {
    const ownedFlat = PERK_LIST.map((p) => p.id); // alle flachen Perks besessen → Angebotspool = nur Familien
    // Alle Familien außer D_HIGH auf IV (abgeschlossen), D_HIGH auf Rang III → einzige anbietbare Stufe ist IV.
    const others = Object.fromEntries(Object.keys(FAMILY_DEFS).filter((id) => id !== "D_HIGH").map((id) => [id, 4]));
    expect(buildPerkOffer(ownedFlat, { ...others, D_HIGH: 3 }, rngS(1), 3)).toEqual([{ familyId: "D_HIGH", tier: 4 }]);
    // Alle Familien auf IV + alle flachen Perks besessen → gar kein Angebot mehr.
    const allIV = Object.fromEntries(Object.keys(FAMILY_DEFS).map((id) => [id, 4]));
    expect(buildPerkOffer(ownedFlat, allIV, rngS(1), 3)).toEqual([]);
  });

  it("besessene flache Perks werden nicht erneut angeboten (Legendäre — alle regulären Perks sind Familien)", () => {
    for (let seed = 0; seed < 30; seed++) {
      const off = buildPerkOffer(["L_UMV", "L2"], {}, rngS(seed), 3, 1); // Legendär-Wurf aktiv, aber L_UMV/L2 besessen
      expect(off).not.toContain("L_UMV");
      expect(off).not.toContain("L2");
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

  it("CUMULATIVE (Kat. A): onPick liefert ein NEUES Deck, familyTiers steigt, Original unberührt", () => {
    const deck = buildDeck();
    const out = applyFamilyPick("A_WEAK_STRONG", 1, { familyTiers: {}, deck, roles: null }, rng);
    expect(out.familyTiers).toEqual({ A_WEAK_STRONG: 1 });
    expect(out.deck).not.toBe(deck); // immutabel: neues Deck
    expect(out.deck.filter((c) => c.baseRank === 5).every((c) => c.value === 6)).toBe(true);
    expect(deck.filter((c) => c.baseRank === 5).every((c) => c.value === 5)).toBe(true); // Original unverändert
  });

  it("CUMULATIVE mit pickTarget aber ohne target → Deck unverändert (Ziel-Flow folgt)", () => {
    const deck = buildDeck();
    const out = applyFamilyPick("A_SUIT_BOOST", 3, { familyTiers: {}, deck, roles: null }, rng); // A_SUIT_BOOST III braucht Farbwahl
    expect(out.familyTiers).toEqual({ A_SUIT_BOOST: 3 });
    expect(out.deck).toBe(deck); // No-Op ohne target
  });
});
