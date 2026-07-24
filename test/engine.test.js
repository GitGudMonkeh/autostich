import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState } from "../src/game/reducer.js";
import { resolveTrick, rollCrit } from "../src/game/engine.js";
import { MAX_CYCLES, FORMATION_ENERGY } from "../src/game/constants.js";
import { STAT_IDS } from "../src/game/stats.js";

// --- Test-Helfer: konstante Decks, damit Ausgänge deterministisch erzwingbar sind ---
// Farben zyklisch (R/B/G/Y) → gleicher Wert bildet nur eine Wiederholung (1 Formation), KEINEN Farbblock,
// damit der Überlappungsbonus (#95) die wertbasierten Score-Tests nicht verfälscht.
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
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

// Formationsneutrales Spielerdeck (Werte 12/11 abwechselnd, Farbe R/B abwechselnd): gewinnt immer gegen
// Wert 0, bildet aber über die Positionen KEINE Formation → isoliert Score-Mechaniken in Multi-Stich-Tests.
const flatDeck = () => Array.from({ length: 40 }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));
// Gleiche Farbe (R), aber abwechselnde Werte → Farbserie zählt, ohne Wiederholung/Farbblock (bei ≤2 Karten).
const sameSuitDeck = () => Array.from({ length: 40 }, (_, i) => ({ id: `S${i}`, suit: "R", baseRank: i % 2 ? 11 : 12, value: i % 2 ? 11 : 12 }));

describe("resolveTrick — Grundausgänge (V2: ohne Leben)", () => {
  it("Sieg: +Score, +Sieg, Initiative Spieler", () => {
    const s = resolveTrick(scenario(12, 0), rng);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(0);
    expect(s.score).toBe(102); // 100 × streakBaseMult(1)=1,02 (#39)
    expect(s.winStreak).toBe(1);
    expect(s.lastResult).toBe("win");
    expect(s.initiative).toBe("player");
  });

  it("Niederlage: kein Schaden mehr, Serie reißt, Initiative Gegner", () => {
    const s = resolveTrick(scenario(0, 12, { winStreak: 4 }), rng);
    expect(s.losses).toBe(1);
    expect(s.winStreak).toBe(0);
    expect(s.lastResult).toBe("loss");
    expect(s.initiative).toBe("opp");
    expect(s.score).toBe(0);
  });

  it("Gleichstand: kein Score, Initiative unverändert", () => {
    const s = resolveTrick(scenario(5, 5, { initiative: "player" }), rng);
    expect(s.ties).toBe(1);
    expect(s.score).toBe(0);
    expect(s.initiative).toBe("player");
  });

  it("lastTrick.breakdown: Basis 100 und die Faktoren multiplizieren exakt auf gained (§17)", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1 }), rng); // erzwungener Crit → critMult > 1
    const b = s.lastTrick.breakdown;
    expect(b.base).toBe(100);
    expect(b.critMult).toBeGreaterThan(1);
    expect((b.base + b.flats) * b.streakMult * b.perkMult * b.formMult * b.critMult).toBeCloseTo(b.total);
    expect(b.total).toBeCloseTo(s.lastTrick.gained);
  });
  it("lastTrick.breakdown ist null bei Niederlage/Gleichstand", () => {
    expect(resolveTrick(scenario(0, 12), rng).lastTrick.breakdown).toBe(null);
    expect(resolveTrick(scenario(5, 5), rng).lastTrick.breakdown).toBe(null);
  });

  it("wins + losses + ties == trickNo (nichts geht verloren)", () => {
    let s = initialState(makeRng(42));
    for (let i = 0; i < 60 && s.phase !== "gameover"; i++) {
      if (s.phase === "levelup") { s = { ...s, phase: "play", offer: null, skillOffer: null, statOffer: null }; continue; }
      if (s.phase === "formation") { s = { ...s, phase: "play" }; continue; }
      s = resolveTrick(s, makeRng(100 + i));
    }
    expect(s.wins + s.losses + s.ties).toBe(s.trickNo);
  });

  it("bestStreak hält die längste Serie, auch nach einem Serienabbruch (#8)", () => {
    const deck = [12, 12, 12, 0].map((v, i) => ({ id: `p${i}`, suit: "R", baseRank: v, value: v }));
    const opp  = [0, 0, 0, 12].map((v, i) => ({ id: `o${i}`, suit: "R", baseRank: v, value: v }));
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1, 2, 3], oppOrder: [0, 1, 2, 3] };
    for (let i = 0; i < 4; i++) s = resolveTrick(s, rng); // Sieg, Sieg, Sieg, Niederlage
    expect(s.wins).toBe(3);
    expect(s.winStreak).toBe(0);   // letzter Stich verloren
    expect(s.bestStreak).toBe(3);  // Serie bleibt gemerkt
  });
});

describe("resolveTrick — Score-Perks (V2: Flat)", () => {
  it("D1 Punktebonus: +75 nur bei aktiver Formation", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D1"] }), rng).lastTrick.gained).toBeCloseTo(102); // keine Formation → 0
    const deck = [{ id: "a", suit: "R", baseRank: 12, value: 12 }, { id: "b", suit: "R", baseRank: 12, value: 12 }];
    const opp = [{ id: "o0", suit: "R", baseRank: 0, value: 0 }, { id: "o1", suit: "R", baseRank: 0, value: 0 }];
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1], oppOrder: [0, 1], perks: ["D1"] };
    s = resolveTrick(s, rng); s = resolveTrick(s, rng); // pos1 = Wiederholung (Formation ×1,30)
    expect(s.lastTrick.gained).toBeCloseTo((100 + 75) * 1.04 * 1.30);
  });

  it("D4 Außenseitersieg: +300 Score bei Wert ≤3", () => {
    expect(resolveTrick(scenario(2, 0, { perks: ["D4"] }), rng).score).toBeCloseTo(408); // (100+300)×1,02
    expect(resolveTrick(scenario(12, 0, { perks: ["D4"] }), rng).score).toBeCloseTo(102);
  });

  it("D2 Siegesserie: +25 Flat je Serienpunkt (Serie 1/2/3)", () => {
    let s = scenario(12, 0, { perks: ["D2"], deck: flatDeck() }); // formationsneutral → isoliert D2
    s = resolveTrick(s, rng); // (100+25)×1,02 = 127,5
    s = resolveTrick(s, rng); // (100+50)×1,04 = 156
    s = resolveTrick(s, rng); // (100+75)×1,06 = 185,5
    expect(s.score).toBeCloseTo(469);
  });

  it("D2 Siegesserie: gedeckelt bei +250 (Serie ≥10)", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["D2"], winStreak: 19 }), rng);
    expect(s.winStreak).toBe(20);
    expect(s.lastTrick.gained).toBeCloseTo(455); // (100+250)×streakBaseMult(20)=1,30
  });
});

describe("resolveTrick — Crit & globale Score-Formel (ohne Tempo)", () => {
  it("additive Boni (D5) fließen in die Basis und werden mitmultipliziert", () => {
    // 10. Sieg → D5 +750: (100+750)×streakBaseMult(1)=1,02 = 867
    const s = resolveTrick(scenario(12, 0, { perks: ["D5"], wins: 9 }), rng);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(867);
  });

  it("Crit multipliziert den vollen scoreBeforeCrit mit der Basis 1,5", () => {
    // statCritChance 1 → garantierter Crit (verbraucht rng). scoreBeforeCrit = 100×1,02 = 102, ×1,5 = 153.
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(102);
    expect(s.lastTrick.scoreGain).toBeCloseTo(153);
    expect(s.lastTrick.critBonus).toBeCloseTo(51);
  });

  it("Niederlagen und Gleichstände lösen keinen Crit aus", () => {
    const loss = resolveTrick(scenario(0, 12, { statCritChance: 1 }), rng);
    expect(loss.lastTrick.isCrit).toBe(false);
    expect(loss.crits).toBe(0);
    const tie = resolveTrick(scenario(5, 5, { statCritChance: 1 }), rng);
    expect(tie.lastTrick.isCrit).toBe(false);
  });

  it("statCritChance 1 erzwingt einen Crit bei jedem Sieg; 0 nie", () => {
    expect(resolveTrick(scenario(12, 0, { statCritChance: 1 }), rng).lastTrick.isCrit).toBe(true);
    expect(resolveTrick(scenario(12, 0, { statCritChance: 0 }), () => 0.99).lastTrick.isCrit).toBe(false);
  });

  it("crits, critBonusScore und bestTrickScore werden geführt", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1 }), rng);
    expect(s.crits).toBe(1);
    expect(s.critBonusScore).toBeCloseTo(51); // 102×1,5=153, Bonus 51
    expect(s.bestTrickScore).toBeCloseTo(153);
  });
});

describe("Legendäre Perks — Engine-Integration (V2 §22.6 L)", () => {
  it("L2 Unaufhaltsam: +2 Wert je Serienpunkt (bis Niederlage)", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["L2"], winStreak: 3 }), rng).lastTrick.pValue).toBe(18); // 12 + 2×3
    expect(resolveTrick(scenario(12, 0, { perks: ["L2"] }), rng).lastTrick.pValue).toBe(12); // Serie 0
  });
  it("L6 Raserei: +2 je Serienpunkt, gedeckelt bei +10", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["L6"], winStreak: 3 }), rng).lastTrick.pValue).toBe(18); // 12 + 6
    expect(resolveTrick(scenario(12, 0, { perks: ["L6"], winStreak: 9 }), rng).lastTrick.pValue).toBe(22); // 12 + 10 (Deckel)
  });
  it("L4 Kritische Masse: Crit gibt der Karte dauerhaft +1 (max +4)", () => {
    const deck = [{ id: "a", suit: "R", baseRank: 5, value: 5 }];
    const opp = [{ id: "o", suit: "R", baseRank: 0, value: 0 }];
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0], oppOrder: [0], perks: ["L4"], statCritChance: 1 };
    s = resolveTrick(s, rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.deck[0].value).toBe(6); // 5 +1
    expect(s.l4Boost.a).toBe(1);
    // Deckel: schon +4 → kein weiterer Zuwachs.
    const capped = resolveTrick({ ...s, l4Boost: { a: 4 }, deck: [{ id: "a", suit: "R", baseRank: 9, value: 9 }], playerOrder: [0], pos: 0 }, rng);
    expect(capped.deck[0].value).toBe(9);
  });
  it("L5 Jackpot: erster Crit einer L5-Zufallskarte je Durchlauf → +1000 Score", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1, perks: ["L5"], roles: { L5: ["X0"] } }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo((100 + 1000) * 1.02); // Jackpot-Flat in der Basis
    expect(s.l5Used).toContain("X0");
    // Zweite L5-Karte an pos1 wäre nötig; hier prüfen wir nur, dass die erste verbraucht ist.
  });
});

describe("rollCrit", () => {
  it("0 % (oder ≤0) löst nie aus", () => {
    expect(rollCrit(0, false, () => 0)).toBe(false);
  });
  it("garantiert überschreibt den Wurf", () => {
    expect(rollCrit(0, true, () => 0.99)).toBe(true);
  });
  it("100 % löst immer aus; Chance wird bei 100 % gedeckelt", () => {
    expect(rollCrit(1, false, () => 0.9999)).toBe(true);
    expect(rollCrit(1.5, false, () => 0.99)).toBe(true); // >1 → auf 1 gedeckelt
  });
  it("würfelt gegen die Chance", () => {
    expect(rollCrit(0.3, false, () => 0.2)).toBe(true);
    expect(rollCrit(0.3, false, () => 0.5)).toBe(false);
  });
});

describe("resolveTrick — Durchlauf-Ende & persistente Reihenfolge (V2)", () => {
  it("Durchlauf-Ende (40 Stiche): cycle++, pos 0, Perk-Angebot → levelup", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39 }), rng);
    expect(s.cycle).toBe(1);
    expect(s.pos).toBe(0);            // neu gemischt (Gegner) + pos zurück
    expect(s.phase).toBe("levelup");  // Perk-Auswahl nach der Runde
    expect(s.offer).toHaveLength(3);
  });

  it("Spieler-Reihenfolge bleibt persistent; nur das Gegnerdeck wird neu gemischt (§22.1)", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39 }), makeRng(3));
    expect(s.playerOrder).toEqual(identity());                          // persistent — kein Re-Shuffle
    expect(s.oppOrder).not.toEqual(identity());                        // Gegner neu gemischt
    expect([...s.oppOrder].sort((a, b) => a - b)).toEqual(identity()); // … aber eine Permutation
  });

  it("Run-Ende nach MAX_CYCLES Durchläufen → gameover, kein Angebot (der letzte Sieg zählt noch)", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39, cycle: MAX_CYCLES - 1, score: 5000 }), rng);
    expect(s.cycle).toBe(MAX_CYCLES);
    expect(s.phase).toBe("gameover");
    expect(s.offer).toBeNull();
    expect(s.score).toBeCloseTo(5102); // 5000 + 100 × 1,02
  });

  it("ist deterministisch bei gleichem Seed", () => {
    const run = (seed) => {
      let s = initialState(makeRng(seed));
      for (let i = 0; i < 40; i++) {
        if (s.phase === "levelup") { s = { ...s, phase: "play", offer: null, skillOffer: null, statOffer: null }; continue; }
        if (s.phase === "formation") { s = { ...s, phase: "play" }; continue; }
        if (s.phase === "gameover") break;
        s = resolveTrick(s, makeRng(seed * 1000 + i));
      }
      return s.score;
    };
    expect(run(5)).toBe(run(5));
  });
});

describe("Historie-Rares — Engine (#71 Phase 2b)", () => {
  it("B8 Revanche: nach 2 Niederlagen +7 auf die nächste Karte", () => {
    expect(resolveTrick(scenario(3, 8, { perks: ["B8"], lossStreak: 2 }), rng).lastTrick.pValue).toBe(10);
    expect(resolveTrick(scenario(3, 8, { perks: ["B8"], lossStreak: 1 }), rng).lastTrick.pValue).toBe(3);
  });
  it("D12 Präzision: +400 bei Übereinstimmung mit dem letzten Siegwert; lastWinValue wird gesetzt", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D12"], lastWinValue: 12 }), rng).score).toBeCloseTo(510); // (100+400)×1,02
    expect(resolveTrick(scenario(12, 0, { perks: ["D12"], lastWinValue: 11 }), rng).score).toBeCloseTo(102);
    expect(resolveTrick(scenario(9, 0, { perks: ["D12"] }), rng).lastWinValue).toBe(9);
  });
  it("D13 Wechselspiel: +200 bei Sieg direkt nach einer Niederlage", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D13"], lastResult: "loss" }), rng).lastTrick.gained).toBeCloseTo(306); // (100+200)×1,02
    expect(resolveTrick(scenario(12, 0, { perks: ["D13"], lastResult: "win" }), rng).lastTrick.gained).toBeCloseTo(102);
  });
});

describe("Crit-Historie-Rares — Engine (#71 Phase 2c)", () => {
  const never = () => 0.99; // Crit-Wurf schlägt nie an → Zustandsübergänge isoliert testbar

  it("D14 Crit-Folge: +200 Score bei Sieg mit gesetztem critFollowArmed", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D14"], critFollowArmed: true }), never).lastTrick.gained).toBeCloseTo(306); // (100+200)×1,02
    expect(resolveTrick(scenario(12, 0, { perks: ["D14"], critFollowArmed: false }), never).lastTrick.gained).toBeCloseTo(102);
  });
  it("critFollowArmed: ein Crit rüstet, ein Sieg ohne Crit entrüstet", () => {
    expect(resolveTrick(scenario(12, 0, { statCritChance: 1 }), rng).critFollowArmed).toBe(true);
    expect(resolveTrick(scenario(12, 0, { critFollowArmed: true }), never).critFollowArmed).toBe(false);
  });

  it("D15 Fehlzündung: lädt +30/Sieg-ohne-Crit (max 300); Crit zahlt & setzt zurück", () => {
    expect(resolveTrick(scenario(12, 0, { misfireScore: 0 }), never).misfireScore).toBe(30);
    expect(resolveTrick(scenario(12, 0, { misfireScore: 290 }), never).misfireScore).toBe(300); // Deckel
    const paid = resolveTrick(scenario(12, 0, { perks: ["D15"], statCritChance: 1, misfireScore: 120 }), rng);
    expect(paid.lastTrick.isCrit).toBe(true);
    expect(paid.lastTrick.scoreBeforeCrit).toBeCloseTo((100 + 120) * 1.02); // Ladung in der multiplizierten Basis
    expect(paid.misfireScore).toBe(0); // Crit setzt zurück
  });

  it("D16 Schwachstellenanalyse: klare Niederlage rüstet, Sieg gibt +300", () => {
    expect(resolveTrick(scenario(0, 12, { perks: ["D16"] }), never).weaknessArmed).toBe(true);   // Abstand 12 ≥5
    expect(resolveTrick(scenario(10, 12, { perks: ["D16"] }), never).weaknessArmed).toBe(false); // Abstand 2 <5
    const win = resolveTrick(scenario(12, 0, { perks: ["D16"], weaknessArmed: true }), never);
    expect(win.lastTrick.gained).toBeCloseTo(408); // (100+300)×1,02
    expect(win.weaknessArmed).toBe(false); // Sieg verbraucht
  });
});

describe("Historie-Rares — Engine (#71 Phase 2f)", () => {
  const mk = (arr, suit = "R") => arr.map((v, i) => ({ id: `${suit}${i}`, suit, baseRank: v, value: v }));

  it("B9 Perfekte Folge: Karten einer Treppe erhalten +1/+2/+3 nach Position", () => {
    const deck = mk([1, 5, 9, 4]); // 1<5<9 = Treppe (Schritte +4, Pos 0–2), die 4 liegt außerhalb
    const opp = mk([0, 0, 0, 0]);
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1, 2, 3], oppOrder: [0, 1, 2, 3], perks: ["B9"] };
    const pv = [];
    for (let i = 0; i < 4; i++) { s = resolveTrick(s, rng); pv.push(s.lastTrick.pValue); }
    expect(pv).toEqual([2, 7, 12, 4]); // Treppen-Ordinal 1,2,3 → +1,+2,+3; Pos 3 keine Treppe → +0
  });

  it("D17 Farbserie: gleiche Farbe zählt, Farbwechsel beginnt bei 1, Niederlage bricht", () => {
    const deck = [{ id: "a", suit: "R", baseRank: 12, value: 12 }, { id: "b", suit: "R", baseRank: 12, value: 12 }, { id: "c", suit: "B", baseRank: 12, value: 12 }];
    const opp = mk([0, 0, 0]);
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1, 2], oppOrder: [0, 1, 2], perks: ["D17"] };
    s = resolveTrick(s, rng); expect(s.winSuitStreak).toBe(1); // R
    s = resolveTrick(s, rng); expect(s.winSuitStreak).toBe(2); // R
    s = resolveTrick(s, rng); expect(s.winSuitStreak).toBe(1); expect(s.winSuit).toBe("B"); // Farbwechsel
    expect(resolveTrick(scenario(0, 12, { perks: ["D17"], winSuit: "R", winSuitStreak: 3 }), rng).winSuitStreak).toBe(0); // Niederlage bricht
  });
  it("D17: 2. Sieg gleicher Farbe gibt +100 Flat", () => {
    let s = scenario(12, 0, { perks: ["D17"], deck: sameSuitDeck() }); // Farbe R, wechselnde Werte → keine Formation
    s = resolveTrick(s, rng); // Serie 1 → +0
    s = resolveTrick(s, rng); // Serie 2 → +100
    expect(s.lastTrick.gained).toBeCloseTo((100 + 100) * 1.04);
  });

  it("D18 Volles Haus: 5. Segment-Position mit 4 Vorsiegen → +750", () => {
    // pos 4 = letzte Position im Segment 0; recentResults 4× win → 5 Siege im Segment.
    expect(resolveTrick(scenario(12, 0, { perks: ["D18"], pos: 4, recentResults: ["win", "win", "win", "win"] }), rng).lastTrick.gained).toBeCloseTo((100 + 750) * 1.02);
    expect(resolveTrick(scenario(12, 0, { perks: ["D18"], pos: 3, recentResults: ["win", "win", "win", "win"] }), rng).lastTrick.gained).toBeCloseTo(102); // nicht Segment-Ende
  });
  it("Volles-Haus-Fenster: recentResults hält die letzten 4 Ergebnisse", () => {
    expect(resolveTrick(scenario(12, 0, { recentResults: ["loss", "win", "tie", "win"] }), rng).recentResults).toEqual(["win", "tie", "win", "win"]);
  });
});

describe("Serien-/Crit-Rares — Engine (#71 Phase 2e)", () => {
  it("B10 Überzahl: +3 temp Wert, wenn der Dauerwert höher als der des direkten Vorgängers ist", () => {
    const deck = [
      { id: "a", suit: "R", baseRank: 4, value: 4 },
      { id: "b", suit: "R", baseRank: 9, value: 9 },
      { id: "c", suit: "R", baseRank: 2, value: 2 },
    ];
    const opp = [
      { id: "o0", suit: "R", baseRank: 0, value: 0 },
      { id: "o1", suit: "R", baseRank: 0, value: 0 },
      { id: "o2", suit: "R", baseRank: 0, value: 0 },
    ];
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1, 2], oppOrder: [0, 1, 2], perks: ["B10"] };
    const pv = [];
    for (let i = 0; i < 3; i++) { s = resolveTrick(s, rng); pv.push(s.lastTrick.pValue); }
    expect(pv).toEqual([4, 12, 2]); // Pos0 kein Vorgänger; Pos1 (9>4) +3; Pos2 (2<9) +0
  });

  it("D19 Überschusskrit: +250 Crit-Flat, wenn die Roh-Crit-Chance über 100 % liegt", () => {
    // statCritChance 1,5 → rawCrit 1,5 (>1), Crit garantiert. scoreBase = 100 + 250.
    const s = resolveTrick(scenario(12, 0, { perks: ["D19"], statCritChance: 1.5 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo((100 + 250) * 1.02);
    // rawCrit genau 1 (nicht >1) → kein Bonus.
    expect(resolveTrick(scenario(12, 0, { perks: ["D19"], statCritChance: 1 }), rng).lastTrick.scoreBeforeCrit).toBeCloseTo(102);
  });
});

describe("Neue Legendaries — Engine (V2 §22.6 L)", () => {
  const seq40 = Array.from({ length: 40 }, (_, i) => i);

  it("L8 Schicksalsmaschine: am Durchlauf-Ende tauschen erfolgreichste & erfolgloseste Karte die Werte", () => {
    const deck = Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: "R", baseRank: 1, value: i === 0 ? 20 : i === 1 ? 3 : 12 }));
    const opp = Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: 0, value: 0 }));
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: seq40, oppOrder: seq40, pos: 39, perks: ["L8"], l8Wins: { X0: 5 } };
    s = resolveTrick(s, rng); // letzter Stich → Durchlauf-Ende → Tausch X0 (5 Erfolge) ↔ X1 (0)
    expect(s.cycle).toBe(1);
    expect(s.deck.find((c) => c.id === "X0").value).toBe(3);  // bekommt X1s Wert
    expect(s.deck.find((c) => c.id === "X1").value).toBe(20); // bekommt X0s Wert
  });

  it("L10 Kettenreaktion: chainArmed erzwingt einen Crit beim nächsten Sieg (und armiert erneut)", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["L10"], chainArmed: true }), () => 0.99); // keine Chance, aber armiert
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.chainArmed).toBe(true); // Crit armiert die Kette erneut
    expect(resolveTrick(scenario(12, 0, { perks: ["L10"] }), () => 0.99).lastTrick.isCrit).toBe(false); // ohne Armierung & Chance
  });

  it("L11 Zeitraffer: Position 40 wiederholt den Wertbonus von Position 20", () => {
    const deck = Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: "R", baseRank: 5, value: 5 }));
    const opp = Array.from({ length: 40 }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: 0, value: 0 }));
    // B4 gibt Position 20 (pos 19) +8; L11 wiederholt das an Position 40 (pos 39).
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: seq40, oppOrder: seq40, pos: 19, perks: ["B4", "L11"] };
    s = resolveTrick(s, rng); // pos19: B4 +8 → pValue 13, pos20Bonus = 8
    expect(s.lastTrick.pValue).toBe(13);
    expect(s.pos20Bonus).toBe(8);
    s = resolveTrick({ ...s, pos: 39 }, rng); // pos39: B4 +8 + L11-Wiederholung +8 → 5+8+8 = 21
    expect(s.lastTrick.pValue).toBe(21);
  });
});

describe("Blitz-Archetyp — Engine (Stufe A)", () => {
  const LR = "SK_LIGHTNING_01";
  const lit = (over = {}) => ({ active: true, charge: 0, maxCharge: 10, ...over });

  it("Crit-Basis: aktiver Blitz + 1 Skill → Sockel +5 pp + 5 pp/Skill = 10 % Crit-Chance", () => {
    const s = resolveTrick(scenario(12, 0, { skills: [LR], lightning: lit() }), rng);
    expect(s.lastTrick.critChance).toBeCloseTo(0.10);
  });

  it("Crit mit Blitzableiter: +2 Ladung (Basis 1 + Skill 1) und +50 in der multiplizierten Basis", () => {
    // scoreBase = (100 + 50) × streakBaseMult(1)=1,02 = 153, ×1,5 (Crit-Basis) = 229,5.
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1, skills: [LR], lightning: lit() }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(2);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(153);
    expect(s.lastTrick.scoreGain).toBeCloseTo(229.5);
  });

  it("ohne Crit: keine Ladung, kein Crit-Flat", () => {
    const s = resolveTrick(scenario(12, 0, { skills: [LR], lightning: lit() }), () => 0.99);
    expect(s.lastTrick.isCrit).toBe(false);
    expect(s.lightning.charge).toBe(0);
    expect(s.lastTrick.scoreGain).toBeCloseTo(102); // 100 × 1,02, kein +50
  });

  it("Ladung deckelt bei maxCharge (10)", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1, skills: [LR], lightning: lit({ charge: 9 }) }), rng);
    expect(s.lightning.charge).toBe(10);
  });

  it("inaktiver Archetyp: Crit erzeugt keine Ladung", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1 }), rng); // lightning default inaktiv
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(0); // inaktiv → keine Ladung
  });

  it("Entscheidungszyklus (§22.2): Perk/Formation/Stat/Skill je nach Durchlauf; leerer Skill-Pool → Perk", () => {
    // Nach dem Durchlauf mit cycle C ist die Entscheidung DECISION_CYCLE[(C+1) % 6].
    const ALL = ["SK_LIGHTNING_01", "SK_LIGHTNING_02", "SK_LIGHTNING_03", "SK_LIGHTNING_04", "SK_LIGHTNING_05", "SK_LIGHTNING_06", "SK_LIGHTNING_07"];

    const perkRound = resolveTrick(scenario(12, 0, { pos: 39, cycle: 0 }), rng); // → cycle 1 (%6=1 → perk)
    expect(perkRound.phase).toBe("levelup");
    expect(perkRound.offer).toHaveLength(3);
    expect(perkRound.skillOffer).toBeNull();
    expect(perkRound.statOffer).toBeNull();

    const formationRound = resolveTrick(scenario(12, 0, { pos: 39, cycle: 1 }), rng); // → cycle 2 (formation)
    expect(formationRound.phase).toBe("formation");
    expect(formationRound.formationEnergy).toBe(FORMATION_ENERGY);
    expect(formationRound.offer).toBeNull();
    expect(formationRound.skillOffer).toBeNull();
    expect(formationRound.statOffer).toBeNull();

    const statRound = resolveTrick(scenario(12, 0, { pos: 39, cycle: 2 }), rng); // → cycle 3 (stat)
    expect(statRound.phase).toBe("levelup");
    expect(statRound.statOffer).toEqual(STAT_IDS);
    expect(statRound.offer).toBeNull();
    expect(statRound.skillOffer).toBeNull();

    const skillRound = resolveTrick(scenario(12, 0, { pos: 39, cycle: 4 }), rng); // → cycle 5 (skill)
    expect(skillRound.phase).toBe("levelup");
    expect(skillRound.skillOffer).toHaveLength(3);
    expect(skillRound.offer).toBeNull();
    expect(skillRound.statOffer).toBeNull();

    // Skill-Runde mit vollem Skill-Besitz → Fallback auf Perk-Angebot (Runde nicht verschwendet).
    const owned = resolveTrick(scenario(12, 0, { pos: 39, cycle: 4, skills: ALL }), rng);
    expect(owned.skillOffer).toBeNull();
    expect(owned.offer).toHaveLength(3);
  });
});

describe("Stat-System — Engine (V2 §22.3)", () => {
  it("Crit-Chance-Stat: statCritChance hebt die Crit-Chance additiv", () => {
    // 3 Picks → +6 pp. Ohne Crit-Perk sonst 0 → 6 %.
    expect(resolveTrick(scenario(12, 0, { statCritChance: 0.06 }), () => 0.99).lastTrick.critChance).toBeCloseTo(0.06);
  });
  it("Crit-Mult-Stat: hebt den Crit-Faktor auf 1,5 + Stat; Jackpot-Schwelle wandert mit", () => {
    // statCritMult 0,4 → Basis-Crit 1,9; statCritChance 1 garantiert den Crit. Kein Jackpot (== Basis).
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1, statCritMult: 0.4 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.critMultiplier).toBeCloseTo(1.9);
    expect(s.lastTrick.jackpot).toBe(false);
    expect(s.lastTrick.scoreGain).toBeCloseTo(102 * 1.9); // scoreBeforeCrit 102 × 1,9
  });
  it("Serien-Stat: statStreakMult pro Serienpunkt multipliziert den Stichscore", () => {
    // statStreakMult 0,01 × Serie 1 → Faktor 1,01. 100 × 1,02(#39) × 1,01.
    expect(resolveTrick(scenario(12, 0, { statStreakMult: 0.01 }), rng).lastTrick.gained).toBeCloseTo(100 * 1.02 * 1.01);
    // Serie 4 (winStreak 3 → 4): streakBaseMult(4)=1,08 × Faktor (1 + 0,01×4)=1,04.
    expect(resolveTrick(scenario(12, 0, { statStreakMult: 0.01, winStreak: 3 }), rng).lastTrick.gained)
      .toBeCloseTo(100 * 1.08 * 1.04);
  });
  it("Formations-Stat: greift nur bei aktiver Formation (§22.3)", () => {
    // Ohne Formation (erste Karte) kein Effekt …
    expect(resolveTrick(scenario(12, 0, { statFormMult: 0.15 }), rng).lastTrick.gained).toBeCloseTo(102);
    // … mit Formation (2. Karte eines Wiederholungs-Paars) wirkt +15 % zusätzlich zur Wiederholung ×1,30.
    const deck = [{ id: "a", suit: "R", baseRank: 12, value: 12 }, { id: "b", suit: "R", baseRank: 12, value: 12 }];
    const opp = [{ id: "o0", suit: "R", baseRank: 0, value: 0 }, { id: "o1", suit: "R", baseRank: 0, value: 0 }];
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1], oppOrder: [0, 1], statFormMult: 0.15 };
    s = resolveTrick(s, rng); // pos0: keine Formation
    s = resolveTrick(s, rng); // pos1: Wiederholung ×1,30 + Formations-Stat ×1,15
    expect(s.lastTrick.gained).toBeCloseTo(100 * 1.04 * 1.30 * 1.15);
  });
});

describe("Formations-Engine — Integration (V2 §22.7)", () => {
  const pairDeck = [{ id: "a", suit: "R", baseRank: 12, value: 12 }, { id: "b", suit: "R", baseRank: 12, value: 12 }];
  const zeroOpp = [{ id: "o0", suit: "R", baseRank: 0, value: 0 }, { id: "o1", suit: "R", baseRank: 0, value: 0 }];
  const base = (over = {}) => ({ ...initialState(makeRng(1)), deck: pairDeck, oppDeck: zeroOpp, playerOrder: [0, 1], oppOrder: [0, 1], ...over });

  it("Sieg auf einer Formations-Position bekommt den Multiplikator (Wiederholung 2. Karte ×1,30)", () => {
    let s = base();
    s = resolveTrick(s, rng); expect(s.lastTrick.formationMult).toBe(1);   // pos0 = 1. Karte, kein Bonus
    s = resolveTrick(s, rng);
    expect(s.lastTrick.formationMult).toBeCloseTo(1.30);                    // pos1 = 2. Karte
    expect(s.lastTrick.gained).toBeCloseTo(100 * 1.04 * 1.30);             // 100 × streakBaseMult(2) × 1,30
  });

  it("Crit multipliziert NACH dem Formations-Multiplikator (§7.3)", () => {
    // statCritChance 1 → beide Stiche critten; geprüft wird pos1 (Wiederholung ×1,30).
    let s = base({ statCritChance: 1 });
    s = resolveTrick(s, rng); // pos0
    s = resolveTrick(s, rng); // pos1: Formation ×1,30, dann Crit ×1,5
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(100 * 1.04 * 1.30);    // Formation IN der Basis
    expect(s.lastTrick.scoreGain).toBeCloseTo(100 * 1.04 * 1.30 * 1.5);    // Crit ×1,5 danach
  });

  it("Formationen werden persistent im State gehalten (je Durchlauf berechnet)", () => {
    const s = resolveTrick(base(), rng); // pos0 → berechnet formations für den Durchlauf
    expect(Array.isArray(s.formations)).toBe(true);
    expect(s.formations[1].mult).toBeCloseTo(1.30);
  });
});

describe("Ionisierung — Engine (Stufe B)", () => {
  const I = "SK_LIGHTNING_02", U = "SK_LIGHTNING_04";
  const lit = (over = {}) => ({ active: true, charge: 0, maxCharge: 10, ...over });
  // constDeck mit stabilen ids; die gespielte Karte (pos 0) trägt `stacks` Ionisierungsstapel.
  const ionDeck = (v, stacks) => constDeck(v).map((c, i) => (i === 0 ? { ...c, id: "P0", ionStacks: stacks } : { ...c, id: `P${i}` }));

  it("ionScore der gespielten Karte fließt in die multiplizierte Basis (+25/Stapel)", () => {
    // 2 Stapel → +50: (100+50) × streakBaseMult(1)=1,02 = 153 (kein Crit).
    const s = resolveTrick(scenario(12, 0, { deck: ionDeck(12, 2), playerOrder: identity() }), () => 0.99);
    expect(s.lastTrick.scoreGain).toBeCloseTo(153);
  });

  it("Sieg mit ionisierter Karte erhöht deren Stapel (+1, max 4)", () => {
    expect(resolveTrick(scenario(12, 0, { deck: ionDeck(12, 2), playerOrder: identity() }), () => 0.99)
      .deck.find((c) => c.id === "P0").ionStacks).toBe(3);
    expect(resolveTrick(scenario(12, 0, { deck: ionDeck(12, 4), playerOrder: identity() }), () => 0.99)
      .deck.find((c) => c.id === "P0").ionStacks).toBe(4); // Deckel
  });

  it("Überspannung: Crit mit ionisierter Karte gibt +3 Zusatzladung (1 Basis + 1 Blitzableiter + 3)", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1,deck: ionDeck(12, 1), playerOrder: identity(),
      skills: ["SK_LIGHTNING_01", U], lightning: lit() }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(5);
  });

  it("Volle Ladung + Ionisierung: ungespielte Karten werden ionisiert, Ladung verbraucht", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: ["SK_LIGHTNING_01", I], lightning: lit({ charge: 9 }) }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(0);
    expect(s.deck.filter((c) => (c.ionStacks || 0) > 0)).toHaveLength(2);
  });
});

describe("Reaktoren + Geladene Serie — Engine (Stufe C)", () => {
  const LR = "SK_LIGHTNING_01", I = "SK_LIGHTNING_02", R = "SK_LIGHTNING_05", G = "SK_LIGHTNING_06", S = "SK_LIGHTNING_07";
  const lit = (over = {}) => ({ active: true, charge: 0, maxCharge: 10, armed: false, stormCritBonus: 0, stormScoreWinsRemaining: 0, ...over });

  it("Reststrom: Verbrauch lässt Ladung auf 3 statt 0 fallen", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: [LR, I, R], lightning: lit({ charge: 9 }) }), rng);
    expect(s.lightning.charge).toBe(3);
  });

  it("Gewitterfront: je Verbrauch +2 pp Crit dauerhaft (Cap 20 pp), danach +100 Score für 3 Siege", () => {
    const step = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: [LR, I, G], lightning: lit({ charge: 9 }) }), rng);
    expect(step.lightning.stormCritBonus).toBeCloseTo(0.02);
    const capped = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: [LR, I, G], lightning: lit({ charge: 9, stormCritBonus: 0.20 }) }), rng);
    expect(capped.lightning.stormScoreWinsRemaining).toBe(3);
  });

  it("Gewitterfront-Score: aktiver Stack gibt +100 in die Basis und wird je Sieg abgebaut", () => {
    const s = resolveTrick(scenario(12, 0, { skills: [LR, G], lightning: lit({ stormScoreWinsRemaining: 2 }) }), () => 0.99);
    expect(s.lastTrick.scoreGain).toBeCloseTo(204); // (100+100) × streakBaseMult(1)=1,02
    expect(s.lightning.stormScoreWinsRemaining).toBe(1);
  });

  it("Geladene Serie: volle Ladung setzt den Serien-Rahmen und verbraucht die Ladung", () => {
    const s = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: [LR, S], lightning: lit({ charge: 9 }) }), rng);
    expect(s.lightning.armed).toBe(true);
    expect(s.lightning.charge).toBe(0);
  });

  it("Geladene Serie: eine Niederlage bei gesetztem Rahmen bewahrt die Serie, bleibt sonst normal", () => {
    const s = resolveTrick(scenario(0, 12, { skills: [S], lightning: lit({ armed: true }), winStreak: 5 }), rng);
    expect(s.losses).toBe(1);
    expect(s.winStreak).toBe(5);            // Siegesserie geschützt
    expect(s.lightning.armed).toBe(false);  // Rahmen eingelöst
    expect(s.lastResult).toBe("loss");
  });

  it("Priorität: Geladene Serie setzt den Rahmen VOR Ionisierung; bei gesetztem Rahmen greift Ionisierung", () => {
    const first = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: [LR, S, I], lightning: lit({ charge: 9 }) }), rng);
    expect(first.lightning.armed).toBe(true);
    expect(first.deck.filter((c) => (c.ionStacks || 0) > 0)).toHaveLength(0); // Rahmen zuerst, keine Ionisierung

    const second = resolveTrick(scenario(12, 0, { statCritChance: 1,skills: [LR, S, I], lightning: lit({ charge: 9, armed: true }) }), rng);
    expect(second.deck.filter((c) => (c.ionStacks || 0) > 0)).toHaveLength(2); // Rahmen gesetzt → jetzt ionisieren
  });
});

describe("Kartenrollen — Engine (V2 §22.6 C)", () => {
  const mk = (arr, suit = "R") => arr.map((v, i) => ({ id: `${suit}${i}`, suit, baseRank: v, value: v }));
  const build = (over) => ({ ...initialState(makeRng(1)), oppDeck: mk([0, 0, 0]), oppOrder: [0, 1, 2], ...over });

  it("C1 Vorhut: Rollen-Karte auf Position ≤4 bekommt +3 Wert", () => {
    const s = build({ deck: mk([5, 5, 5]), playerOrder: [0, 1, 2], perks: ["C1"], roles: { C1: ["R0"] } });
    const r = resolveTrick(s, rng); // pos0 = R0 (Rolle), posInCycle 0 → +3
    expect(r.lastTrick.pValue).toBe(8); // 5 + 3
  });

  it("C4 Staffelläufer: nach dem Sieg einer Rollen-Karte bekommt die nächste +2", () => {
    let s = build({ deck: mk([5, 5, 5]), playerOrder: [0, 1, 2], perks: ["C4"], roles: { C4: ["R0"] } });
    s = resolveTrick(s, rng);          // pos0 R0 gewinnt → Nachfolger armiert
    expect(s.lastTrick.pValue).toBe(5); // R0 selbst ohne Bonus
    s = resolveTrick(s, rng);          // pos1 → +2
    expect(s.lastTrick.pValue).toBe(7); // 5 + 2
  });

  it("C2 Triumph: Sieg armiert die Karte; dieser Stich noch ohne Bonus", () => {
    let s = build({ deck: mk([5, 5]), oppDeck: mk([0, 0]), oppOrder: [0, 1], playerOrder: [0, 1], perks: ["C2"], roles: { C2: ["R0"] } });
    s = resolveTrick(s, rng);
    expect(s.triumphArmed).toContain("R0");
    expect(s.lastTrick.pValue).toBe(5);
  });
});

describe("Formationswerkzeuge — Engine (V2 §22.6 E)", () => {
  it("E10 Feinjustierung: die Formationsphase startet mit +1 Energie", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39, cycle: 1, perks: ["E10"] }), rng); // → cycle 2 (Formation)
    expect(s.phase).toBe("formation");
    expect(s.formationEnergy).toBe(FORMATION_ENERGY + 1);
  });
});
