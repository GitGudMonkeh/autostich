import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState } from "../src/game/reducer.js";
import { resolveTrick, rollCrit } from "../src/game/engine.js";
import { lifeDrainAt, TRICKS_PER_CYCLE } from "../src/game/constants.js";

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

describe("resolveTrick — Grundausgänge", () => {
  it("Sieg: +Score, +Sieg, Initiative Spieler", () => {
    const s = resolveTrick(scenario(12, 0), rng);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(0);
    expect(s.score).toBe(102); // 100 × streakBaseMult(1)=1,02 (#39)
    expect(s.winStreak).toBe(1);
    expect(s.lastResult).toBe("win");
    expect(s.initiative).toBe("player");
  });

  it("Niederlage: -2 Leben (Basis, Durchlauf 0), Serie reißt, Initiative Gegner", () => {
    const s = resolveTrick(scenario(0, 12, { life: 100, winStreak: 4 }), rng);
    expect(s.losses).toBe(1);
    expect(s.life).toBe(98); // DMG_PER_LOSS = 2 (#87)
    expect(s.winStreak).toBe(0);
    expect(s.lastResult).toBe("loss");
    expect(s.initiative).toBe("opp");
  });

  it("Gleichstand: kein Leben, kein Score, Initiative unverändert", () => {
    const s = resolveTrick(scenario(5, 5, { life: 100, initiative: "player" }), rng);
    expect(s.ties).toBe(1);
    expect(s.life).toBe(100);
    expect(s.score).toBe(0);
    expect(s.initiative).toBe("player");
  });

  it("Tod bei ≤0 Leben → phase gameover, Leben auf 0 geklemmt", () => {
    const s = resolveTrick(scenario(0, 12, { life: 2 }), rng); // 2 − DMG_PER_LOSS(2) = 0 ≤ 0
    expect(s.phase).toBe("gameover");
    expect(s.life).toBe(0);
  });

  it("wins + losses + ties == trickNo (nichts geht verloren)", () => {
    let s = initialState(makeRng(42));
    for (let i = 0; i < 60 && s.phase !== "gameover"; i++) {
      if (s.phase === "levelup") { s = { ...s, phase: "play", offer: null }; continue; }
      s = resolveTrick(s, makeRng(100 + i));
    }
    expect(s.wins + s.losses + s.ties).toBe(s.trickNo);
  });

  it("bestStreak hält die längste Serie, auch nach einem Serienabbruch (#8)", () => {
    const deck = [12, 12, 12, 0].map((v, i) => ({ id: `p${i}`, suit: "R", baseRank: v, value: v }));
    const opp  = [0, 0, 0, 12].map((v, i) => ({ id: `o${i}`, suit: "R", baseRank: v, value: v }));
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1, 2, 3], oppOrder: [0, 1, 2, 3], life: 100 };
    for (let i = 0; i < 4; i++) s = resolveTrick(s, rng); // Sieg, Sieg, Sieg, Niederlage
    expect(s.wins).toBe(3);
    expect(s.winStreak).toBe(0);   // letzter Stich verloren
    expect(s.bestStreak).toBe(3);  // Serie bleibt gemerkt
  });
});

describe("resolveTrick — Verteidigungs-Perks", () => {
  it("C3 Panzerung: 25 % Reduktion (Durchlauf 10: 32 → 24 Schaden)", () => {
    const s = resolveTrick(scenario(0, 12, { life: 100, perks: ["C3"], cycle: 10 }), rng); // gross 2+30=32, −25 %=8 → 24
    expect(s.life).toBe(76);
  });

  it("C1 Lebensraub heilt 2 bei Sieg, respektiert maxLife", () => {
    expect(resolveTrick(scenario(12, 0, { life: 100, perks: ["C1"] }), rng).life).toBe(102);
    expect(resolveTrick(scenario(12, 0, { life: 2000, perks: ["C1"] }), rng).life).toBe(2000);
  });

  it("C5 Schutzschild: 50 Schildpunkte absorbieren Schaden vor dem Leben (Durchlauf 5 → 10 Schaden)", () => {
    const s = resolveTrick(scenario(0, 12, { life: 100, perks: ["C5"], shield: 50, cycle: 5 }), rng);
    expect(s.life).toBe(100);   // Verlust 2+8=10 → Schild 50→40
    expect(s.shield).toBe(40);
  });

  it("C5 + Panzerung: erst Schaden prozentual reduzieren, dann Schild absorbieren (Durchlauf 5)", () => {
    const s = resolveTrick(scenario(0, 12, { life: 100, perks: ["C5", "C3"], shield: 50, cycle: 5 }), rng);
    expect(s.shield).toBe(43);  // gross 10, C3 25 % → round(2,5)=3 → 7 abgezogen
    expect(s.life).toBe(100);
  });

  it("C5: Schild wird bei Durchlauf-Ende auf 50 zurückgesetzt", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39, perks: ["C5"], shield: 10, life: 1000 }), rng);
    expect(s.cycle).toBe(1);
    expect(s.shield).toBe(50);
  });

  it("B5 Initiative: nach Niederlage +2 Kartenwert UND nächsten Gleichstand gewinnen", () => {
    // Karte 0 verliert; Karte 3 → mit B5-Bonus +2 = 5, unentschieden gegen Gegner 5
    const deck = [{ id: "p0", suit: "R", baseRank: 0, value: 0 }, { id: "p1", suit: "R", baseRank: 3, value: 3 }];
    const opp = [{ id: "o0", suit: "R", baseRank: 12, value: 12 }, { id: "o1", suit: "R", baseRank: 5, value: 5 }];
    let s = {
      ...initialState(makeRng(1)),
      deck, oppDeck: opp, playerOrder: [0, 1], oppOrder: [0, 1],
      life: 100, perks: ["B5"],
    };
    s = resolveTrick(s, rng); // Verlust → tieArmed
    expect(s.lastResult).toBe("loss");
    expect(s.tieArmed).toBe(true);
    s = resolveTrick(s, rng); // 3+2=5 → Gleichstand → durch B5 zum Sieg
    expect(s.lastTrick.pValue).toBe(5); // Kartenbonus +2 wirkt
    expect(s.wins).toBe(1);
    expect(s.tieArmed).toBe(false);
  });
});

describe("Anti-Infinity — Aufschlag pro Niederlage je Deck-Durchlauf (#87, cycle-basiert)", () => {
  it("lifeDrainAt: gerundetes 0,3·n² (0, 0, 1, 3, 5, 8, …, 30, 120)", () => {
    expect(lifeDrainAt(0)).toBe(0);
    expect(lifeDrainAt(1)).toBe(0);   // round(0,3)
    expect(lifeDrainAt(2)).toBe(1);   // round(1,2)
    expect(lifeDrainAt(3)).toBe(3);   // round(2,7)
    expect(lifeDrainAt(4)).toBe(5);   // round(4,8)
    expect(lifeDrainAt(5)).toBe(8);   // round(7,5)
    expect(lifeDrainAt(10)).toBe(30);
    expect(lifeDrainAt(20)).toBe(120);
  });
  it("Niederlagenschaden eskaliert mit dem Durchlauf (cycle): DMG_PER_LOSS(2) + round(0,3·cycle²)", () => {
    expect(resolveTrick(scenario(0, 12, { life: 100 }), rng).life).toBe(98);              // cycle 0 → 2 + 0
    expect(resolveTrick(scenario(0, 12, { life: 100, cycle: 2 }), rng).life).toBe(97);    // 2 + 1
    expect(resolveTrick(scenario(0, 12, { life: 200, cycle: 5 }), rng).life).toBe(190);   // 2 + 8
  });
  it("Aufschlag stapelt mit Perk-Schaden (L1) und wird von prozentualer Reduktion (C3) gemindert", () => {
    // cycle 4 (+5): 2 + 5 + L1(+3) = 10
    expect(resolveTrick(scenario(0, 12, { life: 100, cycle: 4, perks: ["L1"] }), rng).life).toBe(90);
    // cycle 4: gross 2+5=7, C3 25 % → round(1,75)=2 → nimmt 5
    expect(resolveTrick(scenario(0, 12, { life: 100, cycle: 4, perks: ["C3"] }), rng).life).toBe(95);
  });
  it("hoher Aufschlag in späten Durchläufen kann tödlich sein → Game Over", () => {
    const s = resolveTrick(scenario(0, 12, { life: 30, cycle: 10 }), rng); // 2 + 30 = 32 ≥ 30
    expect(s.phase).toBe("gameover");
    expect(s.life).toBe(0);
  });
});

describe("resolveTrick — Score-Perks", () => {
  it("D1 Punktebonus: +15 %", () => {
    // 100 × streakBaseMult(1)=1,02 × 1,15 = 117,3 (#39)
    expect(resolveTrick(scenario(12, 0, { perks: ["D1"] }), rng).score).toBeCloseTo(117.3);
  });

  it("D4 Außenseitersieg: Sieg mit Wert ≤3 → dreifacher Score", () => {
    // je × streakBaseMult(1)=1,02 (#39): 100×1,02×3 = 306 bzw. 100×1,02×1 = 102
    expect(resolveTrick(scenario(2, 0, { perks: ["D4"] }), rng).score).toBeCloseTo(306);
    expect(resolveTrick(scenario(12, 0, { perks: ["D4"] }), rng).score).toBeCloseTo(102);
  });

  it("D2 Siegesserie: Basis-Serie × D2 eskalierend (Serie 1/2/3)", () => {
    let s = scenario(12, 0, { perks: ["D2"] });
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
    expect(s.lastTrick.comboMult).toBeCloseTo(3.0); // D2-Anteil (nur D2, unverändert)
  });

  it("lastTrick.comboMult == D2-Faktor bei Sieg, 1 ohne D2 (Anzeige-Quelle, kein Drift #31)", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D2"], winStreak: 4 }), rng).lastTrick.comboMult).toBeCloseTo(1.5);
    expect(resolveTrick(scenario(12, 0, { perks: ["D1"], winStreak: 4 }), rng).lastTrick.comboMult).toBe(1);
  });
});

describe("resolveTrick — Tempo-Score & Crit (#19)", () => {
  it("Tempo-Score-Multiplikator bei 0 / 10 / 100 / 150 % Speed", () => {
    // je × streakBaseMult(1)=1,02 (#39): 100×1,02 × (1 + speedPct×0,005)
    expect(resolveTrick(scenario(12, 0, { speedPct: 0 }), rng).score).toBeCloseTo(102);
    expect(resolveTrick(scenario(12, 0, { speedPct: 10 }), rng).score).toBeCloseTo(107.1);
    expect(resolveTrick(scenario(12, 0, { speedPct: 100 }), rng).score).toBeCloseTo(153);
    expect(resolveTrick(scenario(12, 0, { speedPct: 150 }), rng).score).toBeCloseTo(178.5);
  });

  it("additive Boni (D5) werden NACH Multiplikatoren + Tempo addiert", () => {
    // 10. Sieg mit D1(+15%), 100% Tempo, streakBaseMult(1)=1,02: 100×1,02×1,15×1,5 + 300 = 475,95
    const s = resolveTrick(scenario(12, 0, { perks: ["D1", "D5"], speedPct: 100, wins: 9 }), rng);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(475.95);
  });

  it("Crit verdoppelt den vollen scoreBeforeCrit (inkl. Tempo + Boni)", () => {
    // D9 garantiert Crit beim 10. Sieg; D1 + 100% Tempo + streakBaseMult(1): scoreBeforeCrit = 175.95, ×2 = 351.9
    const s = resolveTrick(scenario(12, 0, { perks: ["D1", "D9"], speedPct: 100, wins: 9 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(175.95);
    expect(s.lastTrick.scoreGain).toBeCloseTo(351.9);
    expect(s.lastTrick.critBonus).toBeCloseTo(175.95);
    expect(s.score).toBeCloseTo(351.9);
  });

  it("Niederlagen und Gleichstände lösen keinen Crit aus", () => {
    const loss = resolveTrick(scenario(0, 12, { perks: ["D9"], life: 100, wins: 9 }), rng);
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
    // 10. Sieg, D9 garantiert, 100% Tempo, streakBaseMult(1)=1,02: scoreBeforeCrit = 153, ×2 = 306, Bonus 153
    const s = resolveTrick(scenario(12, 0, { perks: ["D9"], speedPct: 100, wins: 9 }), rng);
    expect(s.crits).toBe(1);
    expect(s.critBonusScore).toBeCloseTo(153);
    expect(s.bestTrickScore).toBeCloseTo(306);
  });
});

describe("Legendäre Perks (#33) — Engine-Integration", () => {
  it("L1 Überladung: +3 Zusatzschaden je Niederlage (auf den flat Grundschaden)", () => {
    expect(resolveTrick(scenario(0, 12, { life: 100, perks: ["L1"] }), rng).life).toBe(95); // 2+3 (#87)
  });
  it("L1+L6: extraDamageTaken summiert korrekt (+5)", () => {
    expect(resolveTrick(scenario(0, 12, { life: 100, perks: ["L1", "L6"] }), rng).life).toBe(93); // 2+3+2 (#87)
  });
  it("C5 Schild verhindert den ersten Verlust je Durchlauf voll — auch mit L1-Zusatzschaden (Durchlauf 5)", () => {
    const s = resolveTrick(scenario(0, 12, { life: 100, perks: ["L1", "C5"], shield: 50, cycle: 5 }), rng);
    expect(s.life).toBe(100);   // 2+8+3 = 13 Schaden komplett vom Schild absorbiert
    expect(s.shield).toBe(37);  // 50 − 13
  });
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
  it("L3 Letztes Aufbäumen: +3 Kartenwert bei ≤25 % Leben kippt den Stich, > 25 % nicht (#71)", () => {
    const low = resolveTrick(scenario(6, 8, { perks: ["L3"], life: 500, maxLife: 2000 }), rng);
    expect(low.lastTrick.pValue).toBe(9); // 6 + 3
    expect(low.wins).toBe(1);
    const high = resolveTrick(scenario(6, 8, { perks: ["L3"], life: 501, maxLife: 2000 }), rng);
    expect(high.lastTrick.pValue).toBe(6);
    expect(high.losses).toBe(1);
  });
  it("L4 Kritische Masse: Bonus erst NACH einem Crit, gedeckelt bei +30 pp", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["D9", "L4"], wins: 9 }), rng); // D9 garantiert Crit
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.legendaryCritBonus).toBeCloseTo(0.01);
    expect(resolveTrick(scenario(12, 0, { perks: ["L4"] }), rng).legendaryCritBonus).toBe(0); // ohne Crit
    expect(resolveTrick(scenario(12, 0, { perks: ["D9", "L4"], wins: 9, legendaryCritBonus: 0.30 }), rng)
      .legendaryCritBonus).toBeCloseTo(0.30); // Deckel
  });
  it("L5 Jackpot: Crit ×4 (überschreibt ×2), garantierte Crits unberührt", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["D9", "L5"], wins: 9 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.critMultiplier).toBe(4);
    expect(s.lastTrick.scoreGain).toBeCloseTo(408); // 100 × streakBaseMult(1)=1,02 × 4 (#39)
    expect(s.lastTrick.jackpot).toBe(true);
  });
  it("L5: die zufällige Crit-Chance wird halbiert (lastTrick.critChance)", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D6", "L5"] }), rng).lastTrick.critChance).toBeCloseTo(0.06);
  });
  it("L6 Raserei: verdoppelt den Tempo-Score (nur der Tempo-Faktor)", () => {
    // 100 × streakBaseMult(1)=1,02 × Tempo(1+100×0,005×2=2,0) = 204 (#39)
    expect(resolveTrick(scenario(12, 0, { perks: ["L6"], speedPct: 100 }), rng).score).toBeCloseTo(204);
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

describe("resolveTrick — Durchlauf-Ende & Perk-Auswahl (Neuer Loop)", () => {
  it("Durchlauf-Ende (40 Stiche): cycle++, C4 heilt, neu gemischt (pos 0), Perk-Angebot → levelup", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39, life: 1000, perks: ["C4"] }), rng);
    expect(s.cycle).toBe(1);
    expect(s.life).toBe(1050);        // C4 healOnCycle
    expect(s.pos).toBe(0);            // neu gemischt + pos zurück (früher bei SUBMIT_PREDICTION)
    expect(s.phase).toBe("levelup");  // Perk-Auswahl nach jeder Runde
    expect(s.offer).toHaveLength(3);
  });

  it("Tod am Durchlauf-Ende → gameover, kein Perk-Angebot", () => {
    const s = resolveTrick(scenario(0, 12, { pos: 39, score: 5000, life: 2 }), rng);
    expect(s.phase).toBe("gameover");
    expect(s.score).toBe(5000);
    expect(s.offer).toBeNull();
  });

  it("ist deterministisch bei gleichem Seed", () => {
    const run = (seed) => {
      let s = initialState(makeRng(seed));
      for (let i = 0; i < 40; i++) {
        if (s.phase === "levelup") { s = { ...s, phase: "play", offer: null }; continue; }
        if (s.phase === "gameover") break;
        s = resolveTrick(s, makeRng(seed * 1000 + i));
      }
      return s.score;
    };
    expect(run(5)).toBe(run(5));
  });
});

describe("Seltene Perks — Engine (#71)", () => {
  it("D11 Kritische Heilung: Crit heilt +5 (via D9-Garantie-Crit beim 10. Sieg)", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["D9", "D11"], wins: 9, life: 100, maxLife: 2000 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.healed).toBe(5);
    expect(s.life).toBe(105);
  });
  it("E7 Kontrollverlust: +1 Zusatzschaden bei Niederlage", () => {
    expect(resolveTrick(scenario(0, 12, { perks: ["E7"], life: 100 }), rng).life).toBe(97); // 2+1 (#87)
  });
});

describe("Historie-Rares — Engine (#71 Phase 2b)", () => {
  it("B8 Revanche: nach 2 Niederlagen +7 auf die nächste Karte", () => {
    expect(resolveTrick(scenario(3, 8, { perks: ["B8"], lossStreak: 2, life: 1000 }), rng).lastTrick.pValue).toBe(10);
    expect(resolveTrick(scenario(3, 8, { perks: ["B8"], lossStreak: 1, life: 1000 }), rng).lastTrick.pValue).toBe(3);
  });
  it("D12 Präzision: ×3 bei Übereinstimmung mit dem letzten Siegwert; lastWinValue wird gesetzt", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D12"], lastWinValue: 12 }), rng).score).toBeCloseTo(306); // 100×1,02×3
    expect(resolveTrick(scenario(12, 0, { perks: ["D12"], lastWinValue: 11 }), rng).score).toBeCloseTo(102);
    expect(resolveTrick(scenario(9, 0, { perks: ["D12"] }), rng).lastWinValue).toBe(9);
  });
  it("D13 Wechselspiel: +100, wenn ein Sieg das W/L-Muster fortsetzt (altLen ≥3)", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D13"], lastResult: "loss", altLen: 2 }), rng).lastTrick.gained).toBeCloseTo(202);
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
    expect(resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9 }), rng).critFollowArmed).toBe(true);  // D9-Garantie-Crit
    expect(resolveTrick(scenario(12, 0, { critFollowArmed: true }), never).critFollowArmed).toBe(false); // Sieg ohne Crit
  });

  it("D15 Fehlzündung: misfireBonus speist die Crit-Chance", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D15"], misfireBonus: 0.09 }), never).lastTrick.critChance).toBeCloseTo(0.09);
  });
  it("D15: +3 pp je Sieg ohne Crit, gedeckelt bei +30 pp, Crit setzt zurück", () => {
    expect(resolveTrick(scenario(12, 0, { misfireBonus: 0 }), never).misfireBonus).toBeCloseTo(0.03);
    expect(resolveTrick(scenario(12, 0, { misfireBonus: 0.29 }), never).misfireBonus).toBeCloseTo(0.30); // Deckel
    expect(resolveTrick(scenario(12, 0, { perks: ["D9"], wins: 9, misfireBonus: 0.20 }), rng).misfireBonus).toBe(0); // Crit → reset
  });

  it("D16 Schwachstellenanalyse: klare Niederlage rüstet, Sieg verbraucht (+40 %)", () => {
    expect(resolveTrick(scenario(0, 12, { perks: ["D16"], life: 100 }), never).weaknessArmed).toBe(true);   // Abstand 12 ≥5
    expect(resolveTrick(scenario(10, 12, { perks: ["D16"], life: 100 }), never).weaknessArmed).toBe(false); // Abstand 2 <5
    const win = resolveTrick(scenario(12, 0, { perks: ["D16"], weaknessArmed: true }), never);
    expect(win.lastTrick.critChance).toBeCloseTo(0.40);
    expect(win.weaknessArmed).toBe(false); // Sieg verbraucht
  });
});

describe("Per-Durchlauf-Rares — Engine (#71 Phase 2d)", () => {
  it("C7 Überlebensvorteil: Durchlauf-Ende heilt 4 je Karte ≥13 (Deck 13er → Deckel 60)", () => {
    const s = resolveTrick(scenario(13, 0, { pos: 39, perks: ["C7"], life: 1000, maxLife: 2000 }), rng);
    expect(s.cycle).toBe(1);
    expect(s.life).toBe(1060); // 40 Karten ≥13 → 160, gedeckelt 60
  });

  it("C8 Sauberer Durchlauf: 10. Stich ohne echten Verlust → +15, Zähler zurück", () => {
    const s = resolveTrick(scenario(12, 0, { perks: ["C8"], cleanStreak: 9, life: 1000, maxLife: 2000 }), rng);
    expect(s.lastTrick.healed).toBe(15);
    expect(s.life).toBe(1015);
    expect(s.cleanStreak).toBe(0);
  });
  it("C8: echter Lebensverlust setzt den Zähler zurück; Schild-Absorption zählt als sauber", () => {
    expect(resolveTrick(scenario(0, 12, { perks: ["C8"], cleanStreak: 9, life: 1000 }), rng).cleanStreak).toBe(0); // Verlust
    const shielded = resolveTrick(scenario(0, 12, { perks: ["C8", "C5"], cleanStreak: 9, shield: 50, life: 1000, maxLife: 2000, cycle: 5 }), rng);
    expect(shielded.life).toBe(1015); // 10 Schaden voll vom Schild → sauber → 10. Stich heilt
    expect(shielded.shield).toBe(40);
  });

  it("C9 Opfergabe: +20 % Score dauerhaft; Durchlauf-Beginn −30 Leben (kann nicht töten)", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["C9"] }), rng).score).toBeCloseTo(122.4); // 100×1,02×1,2
    expect(resolveTrick(scenario(12, 0, { pos: 39, perks: ["C9"], life: 1000, maxLife: 2000 }), rng).life).toBe(970); // −30
    expect(resolveTrick(scenario(12, 0, { pos: 39, perks: ["C9"], life: 20, maxLife: 2000 }), rng).life).toBe(1);     // clamp 1
  });

  it("C10 Notfallration: 1× je Durchlauf bei ≤25 % Leben +40, dann verbraucht", () => {
    const hit = resolveTrick(scenario(0, 12, { perks: ["C10"], life: 400, maxLife: 2000 }), rng);
    expect(hit.life).toBe(438); // 400 −2 Verlust +40 Notfall (#87)
    expect(hit.notfallUsed).toBe(true);
    expect(resolveTrick(scenario(0, 12, { perks: ["C10"], life: 400, maxLife: 2000, notfallUsed: true }), rng).life).toBe(398); // schon genutzt
  });
  it("C10: notfallUsed wird beim Durchlauf-Wechsel zurückgesetzt", () => {
    expect(resolveTrick(scenario(13, 0, { pos: 39, perks: ["C10"], notfallUsed: true, life: 1000, maxLife: 2000 }), rng).notfallUsed).toBe(false);
  });
});

describe("Historie-Rares — Engine (#71 Phase 2f)", () => {
  const mk = (arr, suit = "R") => arr.map((v, i) => ({ id: `${suit}${i}`, suit, baseRank: v, value: v }));

  it("B9 Perfekte Folge: aufsteigende Werte geben 0/+1/+2, Rückschritt beginnt neu", () => {
    const deck = mk([3, 5, 7, 4]);
    const opp = mk([0, 0, 0, 0]);
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1, 2, 3], oppOrder: [0, 1, 2, 3], perks: ["B9"], life: 1000 };
    const pv = [];
    for (let i = 0; i < 4; i++) { s = resolveTrick(s, rng); pv.push(s.lastTrick.pValue); }
    expect(pv).toEqual([3, 6, 9, 4]); // Bonus 0,1,2 dann Reset 0
  });

  it("D17 Farbserie: gleiche Farbe zählt, Farbwechsel beginnt bei 1, Niederlage bricht", () => {
    const deck = [{ id: "a", suit: "R", baseRank: 12, value: 12 }, { id: "b", suit: "R", baseRank: 12, value: 12 }, { id: "c", suit: "B", baseRank: 12, value: 12 }];
    const opp = mk([0, 0, 0]);
    let s = { ...initialState(makeRng(1)), deck, oppDeck: opp, playerOrder: [0, 1, 2], oppOrder: [0, 1, 2], perks: ["D17"], life: 1000 };
    s = resolveTrick(s, rng); expect(s.winSuitStreak).toBe(1); // R
    s = resolveTrick(s, rng); expect(s.winSuitStreak).toBe(2); // R
    s = resolveTrick(s, rng); expect(s.winSuitStreak).toBe(1); expect(s.winSuit).toBe("B"); // Farbwechsel
    expect(resolveTrick(scenario(0, 12, { perks: ["D17"], winSuit: "R", winSuitStreak: 3, life: 1000 }), rng).winSuitStreak).toBe(0); // Niederlage bricht
  });
  it("D17: 2. Sieg gleicher Farbe gibt +75 Flat", () => {
    let s = scenario(12, 0, { perks: ["D17"] }); // constDeck: alles Farbe R
    s = resolveTrick(s, rng); // Serie 1 → +0
    s = resolveTrick(s, rng); // Serie 2 → +75
    expect(s.lastTrick.gained).toBeCloseTo(100 * 1.04 + 75); // 179
  });

  it("D18 Volles Haus: ≥4 Siege im 5er-Fenster → +250", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D18"], recentResults: ["win", "win", "win", "loss"] }), rng).lastTrick.gained).toBeCloseTo(352); // 3 Vorsiege + aktueller = 4
    expect(resolveTrick(scenario(12, 0, { perks: ["D18"], recentResults: ["win", "win", "loss", "loss"] }), rng).lastTrick.gained).toBeCloseTo(102); // nur 3 im Fenster
  });
  it("Volles-Haus-Fenster: recentResults hält die letzten 4 Ergebnisse", () => {
    expect(resolveTrick(scenario(12, 0, { recentResults: ["loss", "win", "tie", "win"] }), rng).recentResults).toEqual(["win", "tie", "win", "win"]);
  });
});

describe("Serien-/Tempo-/Crit-Rares — Engine (#71 Phase 2e)", () => {
  it("B10 Überzahl: klarer Sieg (Vorsprung ≥5) zählt für Serien-Effekte doppelt, Statistik bleibt 1 Sieg", () => {
    const big = resolveTrick(scenario(12, 0, { perks: ["B10"] }), rng);
    expect(big.wins).toBe(1); expect(big.winStreak).toBe(1); // Statistik: 1 Sieg
    expect(big.overStreak).toBe(2);                          // effektive Serie: 2 Stufen
    expect(big.lastTrick.gained).toBeCloseTo(104);          // 100 × streakBaseMult(2)=1,04
    const small = resolveTrick(scenario(5, 3, { perks: ["B10"] }), rng); // Vorsprung 2 <5
    expect(small.overStreak).toBe(1);
  });
  it("B10 + D2: effektive Serie speist Kombo & Anzeige (kein Drift)", () => {
    let s = scenario(12, 0, { perks: ["B10", "D2"] });
    s = resolveTrick(s, rng); expect(s.overStreak).toBe(2); expect(s.lastTrick.comboMult).toBeCloseTo(1.2);
    s = resolveTrick(s, rng); expect(s.overStreak).toBe(4); expect(s.lastTrick.comboMult).toBeCloseTo(1.4);
    expect(resolveTrick(scenario(0, 12, { perks: ["B10"], overStreak: 3, life: 100 }), rng).overStreak).toBe(0); // Niederlage bricht
  });

  it("E9 Hochlauf: +2 % Temp-Tempo je Sieg (Deckel 40), −10 pp je Niederlage; zählt für Tempo-Score", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["E9"], rampTempo: 20, tempTempo: 20 }), rng).lastTrick.gained).toBeCloseTo(112.2); // Score nutzt curTempTempo 20 → ×1,10
    const w = resolveTrick(scenario(12, 0, { perks: ["E9"], rampTempo: 20, tempTempo: 20 }), rng);
    expect(w.rampTempo).toBe(22); expect(w.tempTempo).toBe(22);
    expect(resolveTrick(scenario(12, 0, { perks: ["E9"], rampTempo: 39 }), rng).rampTempo).toBe(40); // Deckel
    expect(resolveTrick(scenario(0, 12, { perks: ["E9"], rampTempo: 30, life: 100 }), rng).rampTempo).toBe(20); // −10
  });

  it("E10 Ruhe vor dem Sturm: Gleichstand startet 5-Stiche-Burst (50 % schneller, zählt für Tempo-Score)", () => {
    const tie = resolveTrick(scenario(5, 5, { perks: ["E10"] }), rng);
    expect(tie.calmTricks).toBe(5); expect(tie.tempTempo).toBe(50);
    const fast = resolveTrick(scenario(12, 0, { perks: ["E10"], calmTricks: 5, tempTempo: 50 }), rng);
    expect(fast.lastTrick.gained).toBeCloseTo(127.5); // ×(1+50×0,005)=1,25
    expect(fast.calmTricks).toBe(4); expect(fast.tempTempo).toBe(50);
    const last = resolveTrick(scenario(12, 0, { perks: ["E10"], calmTricks: 1, tempTempo: 50 }), rng);
    expect(last.calmTricks).toBe(0); expect(last.tempTempo).toBe(0); // Burst endet
  });

  it("D19 Überschusskrit: Roh-Crit über 100 % → Chance auf Super-Crit (×1,5 auf den Faktor)", () => {
    const build = { perks: ["D19", "D9", "D6", "D7", "D8", "D16"], wins: 9, winStreak: 10, weaknessArmed: true };
    const zero = () => 0;   // Überschuss-Wurf trifft
    const half = () => 0.5; // Überschuss-Wurf verfehlt (Überschuss 0,27)
    const sup = resolveTrick(scenario(12, 0, build), zero);
    expect(sup.lastTrick.critChance).toBe(1);      // Anzeige geklemmt
    expect(sup.lastTrick.superCrit).toBe(true);
    expect(sup.lastTrick.critMultiplier).toBe(3);  // ×2 × 1,5
    expect(sup.lastTrick.scoreGain).toBeCloseTo(366); // scoreBeforeCrit 122 × 3
    const noSup = resolveTrick(scenario(12, 0, build), half);
    expect(noSup.lastTrick.superCrit).toBe(false);
    expect(noSup.lastTrick.critMultiplier).toBe(2);
    expect(resolveTrick(scenario(12, 0, { ...build, perks: ["D9", "D6", "D7", "D8", "D16"] }), zero).lastTrick.superCrit).toBe(false); // ohne D19 kein Super-Crit
  });
});

describe("Neue Legendaries — Engine (#71 Phase 3)", () => {
  it("L8 Schicksalsmaschine: Schicksalswert bei Durchlauf-Ende gewählt; +8 Wert & ×2 Score für diese Karten", () => {
    expect(resolveTrick(scenario(12, 0, { pos: 39, perks: ["L8"], life: 1000, maxLife: 2000 }), rng).fateValue).toBe(12); // Deck nur 12er
    expect(resolveTrick(scenario(5, 10, { perks: ["L8"], fateValue: 5, life: 1000 }), rng).lastTrick.pValue).toBe(13); // 5 +8 → kippt den Stich
    expect(resolveTrick(scenario(6, 10, { perks: ["L8"], fateValue: 5, life: 1000 }), rng).losses).toBe(1);            // Nicht-Schicksalswert: kein Bonus
    expect(resolveTrick(scenario(12, 0, { perks: ["L8"], fateValue: 12 }), rng).lastTrick.gained).toBeCloseTo(204);    // 100×1,02 × 2
    expect(resolveTrick(scenario(12, 0, { perks: ["L8"], fateValue: 5 }), rng).lastTrick.gained).toBeCloseTo(102);     // kein Match → ×1
  });

  it("L9 Blutvertrag: Durchlauf-Ende opfert 100 Leben → +Stack (nur >100 Leben, max 5), +20 %/Stack Score", () => {
    const sac = resolveTrick(scenario(12, 0, { pos: 39, perks: ["L9"], life: 1000, maxLife: 2000, bloodStacks: 0 }), rng);
    expect(sac.life).toBe(900); expect(sac.bloodStacks).toBe(1);
    expect(resolveTrick(scenario(12, 0, { pos: 39, perks: ["L9"], life: 100, maxLife: 2000, bloodStacks: 0 }), rng).bloodStacks).toBe(0); // ≤100 → kein Opfer
    expect(resolveTrick(scenario(12, 0, { pos: 39, perks: ["L9"], life: 1000, maxLife: 2000, bloodStacks: 5 }), rng).life).toBe(1000);   // Deckel 5 → kein Opfer
    expect(resolveTrick(scenario(12, 0, { perks: ["L9"], bloodStacks: 3 }), rng).lastTrick.gained).toBeCloseTo(163.2); // 100×1,02×1,6
  });

  it("L10 Kettenreaktion: Crit kettet mit halber finaler Chance, je Stufe ×2 (max 3)", () => {
    const build = { perks: ["L10", "D6", "D9"], wins: 9 }; // D9 garantiert Crit, D6 → 12 % finale Chance → Kette 6 %
    expect(resolveTrick(scenario(12, 0, build), () => 0).lastTrick.critMultiplier).toBe(16);  // 3 Treffer: ×2→4→8→16
    expect(resolveTrick(scenario(12, 0, build), () => 0.5).lastTrick.critMultiplier).toBe(2);  // kein Treffer
    let n = 0; const once = () => (n++ === 0 ? 0 : 0.5);                                        // genau 1 Treffer
    expect(resolveTrick(scenario(12, 0, build), once).lastTrick.critMultiplier).toBe(4);
  });

  it("L11 Zeitraffer: je Durchlauf +Stack (max 5), +10 %/Stack Score", () => {
    expect(resolveTrick(scenario(12, 0, { pos: 39, perks: ["L11"], life: 1000, maxLife: 2000, zeitrafferStacks: 0 }), rng).zeitrafferStacks).toBe(1);
    expect(resolveTrick(scenario(12, 0, { pos: 39, perks: ["L11"], life: 1000, maxLife: 2000, zeitrafferStacks: 5 }), rng).zeitrafferStacks).toBe(5); // Deckel
    expect(resolveTrick(scenario(12, 0, { perks: ["L11"], zeitrafferStacks: 3 }), rng).lastTrick.gained).toBeCloseTo(132.6); // 100×1,02×1,3
  });
});
