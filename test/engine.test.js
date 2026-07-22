import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState } from "../src/game/reducer.js";
import { resolveTrick, rollCrit } from "../src/game/engine.js";
import { lossCostFor, lossTierFor } from "../src/game/constants.js";

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
  it("Sieg: +Score, +XP, +Sieg, Initiative Spieler", () => {
    const s = resolveTrick(scenario(12, 0), rng);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(0);
    expect(s.score).toBe(102); // 100 × streakBaseMult(1)=1,02 (#39)
    expect(s.xp).toBe(10);
    expect(s.winStreak).toBe(1);
    expect(s.lastResult).toBe("win");
    expect(s.initiative).toBe("player");
  });

  it("Niederlage: -10 Leben, Serie reißt, Initiative Gegner", () => {
    const s = resolveTrick(scenario(0, 12, { life: 100, winStreak: 4 }), rng);
    expect(s.losses).toBe(1);
    expect(s.life).toBe(90);
    expect(s.winStreak).toBe(0);
    expect(s.lastResult).toBe("loss");
    expect(s.initiative).toBe("opp");
  });

  it("Gleichstand: kein Leben, kein Score, keine XP, Initiative unverändert", () => {
    const s = resolveTrick(scenario(5, 5, { life: 100, initiative: "player" }), rng);
    expect(s.ties).toBe(1);
    expect(s.life).toBe(100);
    expect(s.score).toBe(0);
    expect(s.xp).toBe(0);
    expect(s.initiative).toBe("player");
  });

  it("Tod bei ≤0 Leben → phase gameover, Leben auf 0 geklemmt", () => {
    const s = resolveTrick(scenario(0, 12, { life: 5 }), rng);
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
  it("C3 Panzerung: Schaden 10 → 8", () => {
    const s = resolveTrick(scenario(0, 12, { life: 100, perks: ["C3"] }), rng);
    expect(s.life).toBe(92);
  });

  it("C1 Lebensraub heilt 2 bei Sieg, respektiert maxLife", () => {
    expect(resolveTrick(scenario(12, 0, { life: 100, perks: ["C1"] }), rng).life).toBe(102);
    expect(resolveTrick(scenario(12, 0, { life: 2000, perks: ["C1"] }), rng).life).toBe(2000);
  });

  it("C5 Schutzschild: 50 Schildpunkte absorbieren Schaden vor dem Leben", () => {
    const s = resolveTrick(scenario(0, 12, { life: 100, perks: ["C5"], shield: 50 }), rng);
    expect(s.life).toBe(100);   // Verlust 10 → Schild 50→40
    expect(s.shield).toBe(40);
  });

  it("C5 + Panzerung: erst Schaden reduzieren (−2), dann Schild absorbieren", () => {
    const s = resolveTrick(scenario(0, 12, { life: 100, perks: ["C5", "C3"], shield: 50 }), rng);
    expect(s.shield).toBe(42);  // 10 − 2 = 8 abgezogen
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

describe("Anti-Infinity — zeitbasierte Niederlagenkosten (#32)", () => {
  const MIN = 60 * 1000;
  it("Rampe: Basis 10, +5 je 5 Min aktiver Zeit, ungedeckelt", () => {
    expect(lossCostFor(0)).toBe(10);
    expect(lossCostFor(4.9 * MIN)).toBe(10);   // 0–5 min
    expect(lossCostFor(5 * MIN)).toBe(15);     // Stufe 1 beginnt bei exakt 5:00
    expect(lossCostFor(9.9 * MIN)).toBe(15);
    expect(lossCostFor(10 * MIN)).toBe(20);
    expect(lossCostFor(15 * MIN)).toBe(25);
    expect(lossCostFor(60 * MIN)).toBe(70);    // kein Cap: 10 + 5×12
  });
  it("lossTierFor zählt die 5-Minuten-Stufe; negative/0 Zeit ist sicher", () => {
    expect(lossTierFor(0)).toBe(0);
    expect(lossTierFor(5 * MIN)).toBe(1);
    expect(lossTierFor(12 * MIN)).toBe(2);
    expect(lossCostFor(-100)).toBe(10);
  });
  it("resolveTrick nutzt die injizierte lossCost statt der Konstante", () => {
    expect(resolveTrick(scenario(0, 12, { life: 100 }), rng, 15).life).toBe(85);
    expect(resolveTrick(scenario(0, 12, { life: 100 }), rng).life).toBe(90); // Default = DMG_PER_LOSS
  });
  it("dmgReduce (C3) und Schild (C5) wirken auf den eskalierten Wert", () => {
    expect(resolveTrick(scenario(0, 12, { life: 100, perks: ["C3"] }), rng, 20).life).toBe(82); // 20−2
    const s = resolveTrick(scenario(0, 12, { life: 100, perks: ["C5"], shield: 50 }), rng, 20);
    expect(s.life).toBe(100);   // 20 vom Schild absorbiert
    expect(s.shield).toBe(30);
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
  it("L1 Überladung: +3 Zusatzschaden je Niederlage (auf lossCost)", () => {
    expect(resolveTrick(scenario(0, 12, { life: 100, perks: ["L1"] }), rng, 10).life).toBe(87); // 10+3
  });
  it("L1+L6: extraDamageTaken summiert korrekt (+5)", () => {
    expect(resolveTrick(scenario(0, 12, { life: 100, perks: ["L1", "L6"] }), rng, 10).life).toBe(85); // 10+3+2
  });
  it("C5 Schild verhindert den ersten Verlust je Durchlauf voll — auch mit L1-Zusatzschaden", () => {
    const s = resolveTrick(scenario(0, 12, { life: 100, perks: ["L1", "C5"], shield: 50 }), rng, 10);
    expect(s.life).toBe(100);   // 13 Schaden komplett vom Schild absorbiert
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
  it("L3 Letztes Aufbäumen: +6 Kartenwert bei ≤25 % Leben kippt den Stich, > 25 % nicht", () => {
    const low = resolveTrick(scenario(4, 8, { perks: ["L3"], life: 500, maxLife: 2000 }), rng);
    expect(low.lastTrick.pValue).toBe(10); // 4 + 6
    expect(low.wins).toBe(1);
    const high = resolveTrick(scenario(4, 8, { perks: ["L3"], life: 501, maxLife: 2000 }), rng);
    expect(high.lastTrick.pValue).toBe(4);
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

describe("resolveTrick — Zyklus & Level-Up", () => {
  it("Level-Up bei Schwellenüberschreitung: phase levelup, Angebot mit 3 Perks, XP-Rest bleibt", () => {
    const s = resolveTrick(scenario(12, 0, { xp: 95 }), rng); // 95+10=105 ≥ 100
    expect(s.level).toBe(2);
    expect(s.xp).toBe(5);
    expect(s.phase).toBe("levelup");
    expect(s.offer).toHaveLength(3);
  });

  it("Durchlauf-Ende (40 Stiche): cycle++, pos→0, C4 heilt", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 39, life: 1000, perks: ["C4"] }), rng);
    expect(s.cycle).toBe(1);
    expect(s.pos).toBe(0);
    expect(s.life).toBe(1050);
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
