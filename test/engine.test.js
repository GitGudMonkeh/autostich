import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState } from "../src/game/reducer.js";
import { resolveTrick, rollCrit } from "../src/game/engine.js";
import { MAX_CYCLES, FORMATION_ENERGY } from "../src/game/constants.js";
import { STAT_IDS } from "../src/game/stats.js";

// --- Test-Helfer: konstante Decks, damit Ausgänge deterministisch erzwingbar sind ---
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: "R", baseRank: v, value: v }));
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

describe("resolveTrick — Score-Perks", () => {
  it("D1 Punktebonus: +15 %", () => {
    // 100 × streakBaseMult(1)=1,02 × 1,15 = 117,3 (#39)
    expect(resolveTrick(scenario(12, 0, { perks: ["D1"] }), rng).score).toBeCloseTo(117.3);
  });

  it("D4 Außenseitersieg: Sieg mit Wert ≤3 → dreifacher Score", () => {
    expect(resolveTrick(scenario(2, 0, { perks: ["D4"] }), rng).score).toBeCloseTo(306);
    expect(resolveTrick(scenario(12, 0, { perks: ["D4"] }), rng).score).toBeCloseTo(102);
  });

  it("D2 Siegesserie: Basis-Serie × D2 eskalierend (Serie 1/2/3)", () => {
    let s = scenario(12, 0, { perks: ["D2"], deck: flatDeck() }); // formationsneutral → isoliert D2
    s = resolveTrick(s, rng); // Serie 1 → 1,02 × 1,1 → 112,2
    s = resolveTrick(s, rng); // Serie 2 → 1,04 × 1,2 → 124,8
    s = resolveTrick(s, rng); // Serie 3 → 1,06 × 1,3 → 137,8
    expect(s.score).toBeCloseTo(374.8);
  });

  it("D2 eskaliert ungedeckelt (kein Cap): Serie 20 → ×3,0", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["D2"], winStreak: 19 }), rng);
    expect(s.winStreak).toBe(20);
    // 100 × streakBaseMult(20)=1,30 (Cap) × comboMult(20)=3,0 = 390 (#39)
    expect(s.lastTrick.gained).toBeCloseTo(390);
    expect(s.lastTrick.comboMult).toBeCloseTo(3.0);
  });

  it("lastTrick.comboMult == D2-Faktor bei Sieg, 1 ohne D2 (Anzeige-Quelle, kein Drift #31)", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D2"], winStreak: 4 }), rng).lastTrick.comboMult).toBeCloseTo(1.5);
    expect(resolveTrick(scenario(12, 0, { perks: ["D1"], winStreak: 4 }), rng).lastTrick.comboMult).toBe(1);
  });
});

describe("resolveTrick — Crit & globale Score-Formel (ohne Tempo)", () => {
  it("additive Boni (D5) fließen in die Basis und werden mitmultipliziert", () => {
    // 10. Sieg mit D1(+15%), streakBaseMult(1)=1,02: (100+300)×1,02×1,15 = 469,2
    const s = resolveTrick(scenario(12, 0, { perks: ["D1", "D5"], wins: 9 }), rng);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(469.2);
  });

  it("Crit multipliziert den vollen scoreBeforeCrit mit der Basis 1,5 (inkl. Boni)", () => {
    // D9 garantiert Crit beim 10. Sieg; D1, streakBaseMult(1): scoreBeforeCrit = 117,3, ×1,5 = 175,95
    const s = resolveTrick(scenario(12, 0, { perks: ["D1", "D9"], wins: 9 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(117.3);
    expect(s.lastTrick.scoreGain).toBeCloseTo(175.95);
    expect(s.lastTrick.critBonus).toBeCloseTo(58.65);
    expect(s.score).toBeCloseTo(175.95);
  });

  it("Niederlagen und Gleichstände lösen keinen Crit aus", () => {
    const loss = resolveTrick(scenario(0, 12, { perks: ["D9"], wins: 9 }), rng);
    expect(loss.lastTrick.isCrit).toBe(false);
    expect(loss.crits).toBe(0);
    const tie = resolveTrick(scenario(5, 5, { perks: ["D9"], wins: 9 }), rng);
    expect(tie.lastTrick.isCrit).toBe(false);
  });

  it("D9 garantiert Crit beim 10./20./30. Sieg, sonst nicht", () => {
    for (const w of [10, 20, 30]) {
      expect(resolveTrick(scenario(12, 0, { perks: ["D9"], wins: w - 1 }), rng).lastTrick.isCrit).toBe(true);
    }
    expect(resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 4 }), rng).lastTrick.isCrit).toBe(false);
  });

  it("crits, critBonusScore und bestTrickScore werden geführt", () => {
    // 10. Sieg, D9 garantiert, streakBaseMult(1)=1,02: scoreBeforeCrit = 102, ×1,5 = 153, Bonus 51
    const s = resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9 }), rng);
    expect(s.crits).toBe(1);
    expect(s.critBonusScore).toBeCloseTo(51);
    expect(s.bestTrickScore).toBeCloseTo(153);
  });
});

describe("Legendäre Perks — Engine-Integration", () => {
  it("L2 Unaufhaltsam: Gleichstand ab Serie ≥3 wird Sieg und erhöht die Serie", () => {
    const s = resolveTrick(scenario(5, 5, { perks: ["L2"], winStreak: 3 }), rng);
    expect(s.lastTrick.result).toBe("win_tie");
    expect(s.wins).toBe(1);
    expect(s.winStreak).toBe(4);
  });
  it("L2: Gleichstand unter Serie 3 bleibt Gleichstand", () => {
    const s = resolveTrick(scenario(5, 5, { perks: ["L2"], winStreak: 2 }), rng);
    expect(s.lastTrick.result).toBe("tie");
    expect(s.winStreak).toBe(2);
  });
  it("L4 Kritische Masse: Bonus erst NACH einem Crit, gedeckelt bei +30 pp", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["D9", "L4"], wins: 9 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.legendaryCritBonus).toBeCloseTo(0.01);
    expect(resolveTrick(scenario(12, 0, { perks: ["L4"] }), rng).legendaryCritBonus).toBe(0);
    expect(resolveTrick(scenario(12, 0, { perks: ["D9", "L4"], wins: 9, legendaryCritBonus: 0.30 }), rng)
      .legendaryCritBonus).toBeCloseTo(0.30);
  });
  it("L5 Jackpot: Crit ×4 (überschreibt ×2), garantierte Crits unberührt", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["D9", "L5"], wins: 9 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.critMultiplier).toBe(4);
    expect(s.lastTrick.scoreGain).toBeCloseTo(408); // 100 × streakBaseMult(1)=1,02 × 4
    expect(s.lastTrick.jackpot).toBe(true);
  });
  it("L5: die zufällige Crit-Chance wird halbiert (lastTrick.critChance)", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D6", "L5"] }), rng).lastTrick.critChance).toBeCloseTo(0.06);
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
  it("D12 Präzision: ×3 bei Übereinstimmung mit dem letzten Siegwert; lastWinValue wird gesetzt", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D12"], lastWinValue: 12 }), rng).score).toBeCloseTo(306);
    expect(resolveTrick(scenario(12, 0, { perks: ["D12"], lastWinValue: 11 }), rng).score).toBeCloseTo(102);
    expect(resolveTrick(scenario(9, 0, { perks: ["D12"] }), rng).lastWinValue).toBe(9);
  });
  it("D13 Wechselspiel: +100, wenn ein Sieg das W/L-Muster fortsetzt (altLen ≥3)", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D13"], lastResult: "loss", altLen: 2 }), rng).lastTrick.gained).toBeCloseTo(204);
    expect(resolveTrick(scenario(12, 0, { perks: ["D13"], lastResult: "win", altLen: 5 }), rng).lastTrick.gained).toBeCloseTo(102);
  });
});

describe("Crit-Historie-Rares — Engine (#71 Phase 2c)", () => {
  const never = () => 0.99; // Crit-Wurf schlägt nie an → Zustandsübergänge isoliert testbar

  it("D14 Crit-Folge: +20 % Crit-Chance nur wenn gerüstet", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D14"], critFollowArmed: true }), never).lastTrick.critChance).toBeCloseTo(0.20);
    expect(resolveTrick(scenario(12, 0, { perks: ["D14"], critFollowArmed: false }), never).lastTrick.critChance).toBeCloseTo(0);
  });
  it("D14: ein Crit rüstet, ein Sieg ohne Crit entrüstet", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9 }), rng).critFollowArmed).toBe(true);
    expect(resolveTrick(scenario(12, 0, { critFollowArmed: true }), never).critFollowArmed).toBe(false);
  });

  it("D15 Fehlzündung: misfireBonus speist die Crit-Chance", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D15"], misfireBonus: 0.09 }), never).lastTrick.critChance).toBeCloseTo(0.09);
  });
  it("D15: +3 pp je Sieg ohne Crit, gedeckelt bei +30 pp, Crit setzt zurück", () => {
    expect(resolveTrick(scenario(12, 0, { misfireBonus: 0 }), never).misfireBonus).toBeCloseTo(0.03);
    expect(resolveTrick(scenario(12, 0, { misfireBonus: 0.29 }), never).misfireBonus).toBeCloseTo(0.30);
    expect(resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9, misfireBonus: 0.20 }), rng).misfireBonus).toBe(0);
  });

  it("D16 Schwachstellenanalyse: klare Niederlage rüstet, Sieg verbraucht (+40 %)", () => {
    expect(resolveTrick(scenario(0, 12, { perks: ["D16"] }), never).weaknessArmed).toBe(true);   // Abstand 12 ≥5
    expect(resolveTrick(scenario(10, 12, { perks: ["D16"] }), never).weaknessArmed).toBe(false); // Abstand 2 <5
    const win = resolveTrick(scenario(12, 0, { perks: ["D16"], weaknessArmed: true }), never);
    expect(win.lastTrick.critChance).toBeCloseTo(0.40);
    expect(win.weaknessArmed).toBe(false); // Sieg verbraucht
  });
});

describe("Historie-Rares — Engine (#71 Phase 2f)", () => {
  const mk = (arr, suit = "R") => arr.map((v, i) => ({ id: `${suit}${i}`, suit, baseRank: v, value: v }));

  it("B9 Perfekte Folge: Karten einer Treppe erhalten +1/+2/+3 nach Position", () => {
    const deck = mk([3, 5, 7, 4]); // 3<5<7 = Treppe (Pos 0–2), die 4 liegt außerhalb
    const opp = mk([0, 0, 0, 0]);
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1, 2, 3], oppOrder: [0, 1, 2, 3], perks: ["B9"] };
    const pv = [];
    for (let i = 0; i < 4; i++) { s = resolveTrick(s, rng); pv.push(s.lastTrick.pValue); }
    expect(pv).toEqual([4, 7, 10, 4]); // Treppen-Ordinal 1,2,3 → +1,+2,+3; Pos 3 keine Treppe → +0
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
  it("D17: 2. Sieg gleicher Farbe gibt +75 Flat", () => {
    let s = scenario(12, 0, { perks: ["D17"], deck: sameSuitDeck() }); // Farbe R, wechselnde Werte → keine Formation
    s = resolveTrick(s, rng); // Serie 1 → +0
    s = resolveTrick(s, rng); // Serie 2 → +75
    expect(s.lastTrick.gained).toBeCloseTo((100 + 75) * 1.04);
  });

  it("D18 Volles Haus: ≥4 Siege im 5er-Fenster → +250", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D18"], recentResults: ["win", "win", "win", "loss"] }), rng).lastTrick.gained).toBeCloseTo(357);
    expect(resolveTrick(scenario(12, 0, { perks: ["D18"], recentResults: ["win", "win", "loss", "loss"] }), rng).lastTrick.gained).toBeCloseTo(102);
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

  it("D19 Überschusskrit: Roh-Crit über 100 % → Chance auf Super-Crit (×1,5 auf den Faktor)", () => {
    const build = { perks: ["D19", "D9", "D6", "D7", "D8", "D16"], wins: 9, winStreak: 10, weaknessArmed: true };
    const zero = () => 0;   // Überschuss-Wurf trifft
    const half = () => 0.5; // Überschuss-Wurf verfehlt (Überschuss 0,27)
    const sup = resolveTrick(scenario(12, 0, build), zero);
    expect(sup.lastTrick.critChance).toBe(1);          // Anzeige geklemmt
    expect(sup.lastTrick.superCrit).toBe(true);
    expect(sup.lastTrick.critMultiplier).toBeCloseTo(2.25); // Basis 1,5 × 1,5
    expect(sup.lastTrick.scoreGain).toBeCloseTo(274.5);     // scoreBeforeCrit 122 × 2,25
    const noSup = resolveTrick(scenario(12, 0, build), half);
    expect(noSup.lastTrick.superCrit).toBe(false);
    expect(noSup.lastTrick.critMultiplier).toBeCloseTo(1.5);
    expect(resolveTrick(scenario(12, 0, { ...build, perks: ["D9", "D6", "D7", "D8", "D16"] }), zero).lastTrick.superCrit).toBe(false); // ohne D19 kein Super-Crit
  });
});

describe("Neue Legendaries — Engine (#71 Phase 3)", () => {
  it("L8 Schicksalsmaschine: Schicksalswert bei Durchlauf-Ende gewählt; +8 Wert & ×2 Score für diese Karten", () => {
    expect(resolveTrick(scenario(12, 0, { pos: 39, perks: ["L8"] }), rng).fateValue).toBe(12); // Deck nur 12er
    expect(resolveTrick(scenario(5, 10, { perks: ["L8"], fateValue: 5 }), rng).lastTrick.pValue).toBe(13); // 5 +8 → kippt den Stich
    expect(resolveTrick(scenario(6, 10, { perks: ["L8"], fateValue: 5 }), rng).losses).toBe(1);            // Nicht-Schicksalswert: kein Bonus
    expect(resolveTrick(scenario(12, 0, { perks: ["L8"], fateValue: 12 }), rng).lastTrick.gained).toBeCloseTo(204);    // 100×1,02 × 2
    expect(resolveTrick(scenario(12, 0, { perks: ["L8"], fateValue: 5 }), rng).lastTrick.gained).toBeCloseTo(102);     // kein Match → ×1
  });

  it("L10 Kettenreaktion: Crit kettet mit halber finaler Chance, je Stufe ×2 (max 3)", () => {
    const build = { perks: ["L10", "D6", "D9"], wins: 9 }; // D9 garantiert Crit, D6 → 12 % finale Chance → Kette 6 %
    expect(resolveTrick(scenario(12, 0, build), () => 0).lastTrick.critMultiplier).toBeCloseTo(12);  // Basis 1,5 · 3 Treffer ×2 → 12
    expect(resolveTrick(scenario(12, 0, build), () => 0.5).lastTrick.critMultiplier).toBeCloseTo(1.5); // kein Treffer → Basis
    let n = 0; const once = () => (n++ === 0 ? 0 : 0.5);                                              // genau 1 Treffer
    expect(resolveTrick(scenario(12, 0, build), once).lastTrick.critMultiplier).toBeCloseTo(3);       // 1,5 × 2
  });

  it("L11 Zeitraffer: je Durchlauf +Stack (max 5), +10 %/Stack Score", () => {
    expect(resolveTrick(scenario(12, 0, { pos: 39, perks: ["L11"], zeitrafferStacks: 0 }), rng).zeitrafferStacks).toBe(1);
    expect(resolveTrick(scenario(12, 0, { pos: 39, perks: ["L11"], zeitrafferStacks: 5 }), rng).zeitrafferStacks).toBe(5); // Deckel
    expect(resolveTrick(scenario(12, 0, { perks: ["L11"], zeitrafferStacks: 3 }), rng).lastTrick.gained).toBeCloseTo(132.6); // 100×1,02×1,3
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
    const s = resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9, skills: [LR], lightning: lit() }), rng);
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
    const s = resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9, skills: [LR], lightning: lit({ charge: 9 }) }), rng);
    expect(s.lightning.charge).toBe(10);
  });

  it("inaktiver Archetyp: Crit erzeugt keine Ladung und keine Crit-Basis", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9 }), rng); // lightning default inaktiv
    expect(s.lastTrick.isCrit).toBe(true);         // D9-Garantie greift
    expect(s.lightning.charge).toBe(0);            // inaktiv → keine Ladung
    expect(s.lastTrick.critChance).toBeCloseTo(0); // keine Crit-Basis
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
    // statCritMult 0,4 → Basis-Crit 1,9. D9 garantiert Crit. Kein Jackpot (== Basis).
    const s = resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9, statCritMult: 0.4 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.critMultiplier).toBeCloseTo(1.9);
    expect(s.lastTrick.jackpot).toBe(false);
    expect(s.lastTrick.scoreGain).toBeCloseTo(102 * 1.9); // scoreBeforeCrit 102 × 1,9
  });
  it("Crit-Mult-Stat + L5: ×4 überschreibt weiterhin, solange höher", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["D9", "L5"], wins: 9, statCritMult: 0.4 }), rng);
    expect(s.lastTrick.critMultiplier).toBe(4); // max(1,9, 4)
    expect(s.lastTrick.jackpot).toBe(true);
  });
  it("Serien-Stat: +0,5 %/Pick pro Serienpunkt multipliziert den Stichscore", () => {
    // statStreakMult 0,01 (2 Picks) × Serie 1 → Faktor 1,01. 100 × 1,02(#39) × 1,01.
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
    // wins:8 → pos0 = 9. Sieg (kein Crit), pos1 = 10. Sieg (D9-Crit) UND Wiederholung ×1,30.
    let s = base({ perks: ["D9"], wins: 8 });
    s = resolveTrick(s, rng); expect(s.lastTrick.isCrit).toBe(false);
    s = resolveTrick(s, rng);
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
    const s = resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9, deck: ionDeck(12, 1), playerOrder: identity(),
      skills: ["SK_LIGHTNING_01", U], lightning: lit() }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(5);
  });

  it("Volle Ladung + Ionisierung: ungespielte Karten werden ionisiert, Ladung verbraucht", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9, skills: ["SK_LIGHTNING_01", I], lightning: lit({ charge: 9 }) }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(0);
    expect(s.deck.filter((c) => (c.ionStacks || 0) > 0)).toHaveLength(2);
  });
});

describe("Reaktoren + Geladene Serie — Engine (Stufe C)", () => {
  const LR = "SK_LIGHTNING_01", I = "SK_LIGHTNING_02", R = "SK_LIGHTNING_05", G = "SK_LIGHTNING_06", S = "SK_LIGHTNING_07";
  const lit = (over = {}) => ({ active: true, charge: 0, maxCharge: 10, armed: false, stormCritBonus: 0, stormScoreWinsRemaining: 0, ...over });

  it("Reststrom: Verbrauch lässt Ladung auf 3 statt 0 fallen", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9, skills: [LR, I, R], lightning: lit({ charge: 9 }) }), rng);
    expect(s.lightning.charge).toBe(3);
  });

  it("Gewitterfront: je Verbrauch +2 pp Crit dauerhaft (Cap 20 pp), danach +100 Score für 3 Siege", () => {
    const step = resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9, skills: [LR, I, G], lightning: lit({ charge: 9 }) }), rng);
    expect(step.lightning.stormCritBonus).toBeCloseTo(0.02);
    const capped = resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9, skills: [LR, I, G], lightning: lit({ charge: 9, stormCritBonus: 0.20 }) }), rng);
    expect(capped.lightning.stormScoreWinsRemaining).toBe(3);
  });

  it("Gewitterfront-Score: aktiver Stack gibt +100 in die Basis und wird je Sieg abgebaut", () => {
    const s = resolveTrick(scenario(12, 0, { skills: [LR, G], lightning: lit({ stormScoreWinsRemaining: 2 }) }), () => 0.99);
    expect(s.lastTrick.scoreGain).toBeCloseTo(204); // (100+100) × streakBaseMult(1)=1,02
    expect(s.lightning.stormScoreWinsRemaining).toBe(1);
  });

  it("Geladene Serie: volle Ladung setzt den Serien-Rahmen und verbraucht die Ladung", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9, skills: [LR, S], lightning: lit({ charge: 9 }) }), rng);
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
    const first = resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9, skills: [LR, S, I], lightning: lit({ charge: 9 }) }), rng);
    expect(first.lightning.armed).toBe(true);
    expect(first.deck.filter((c) => (c.ionStacks || 0) > 0)).toHaveLength(0); // Rahmen zuerst, keine Ionisierung

    const second = resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9, skills: [LR, S, I], lightning: lit({ charge: 9, armed: true }) }), rng);
    expect(second.deck.filter((c) => (c.ionStacks || 0) > 0)).toHaveLength(2); // Rahmen gesetzt → jetzt ionisieren
  });
});
