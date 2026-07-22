import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState } from "../src/game/reducer.js";
import { resolveTrick, rollCrit } from "../src/game/engine.js";

// --- Test-Helfer: konstante Decks, damit Ausgänge deterministisch erzwingbar sind ---
const constDeck = (v) => Array.from({ length: 52 }, (_, i) => ({ id: `X${i}`, suit: "R", baseRank: v, value: v }));
const identity = () => Array.from({ length: 52 }, (_, i) => i);
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
    expect(s.score).toBe(100);
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
  it("C3 Panzerung: Schaden 10 → 9", () => {
    const s = resolveTrick(scenario(0, 12, { life: 100, perks: ["C3"] }), rng);
    expect(s.life).toBe(91);
  });

  it("C1 Lebensraub heilt bei Sieg, respektiert maxLife", () => {
    expect(resolveTrick(scenario(12, 0, { life: 100, perks: ["C1"] }), rng).life).toBe(101);
    expect(resolveTrick(scenario(12, 0, { life: 2000, perks: ["C1"] }), rng).life).toBe(2000);
  });

  it("C5 Schutzschild: nur der erste Verlust je Durchlauf kostet nichts", () => {
    let s = scenario(0, 12, { life: 100, perks: ["C5"] });
    s = resolveTrick(s, rng);
    expect(s.life).toBe(100);            // erster Verlust abgeschirmt
    expect(s.shieldUsedThisCycle).toBe(true);
    s = resolveTrick(s, rng);
    expect(s.life).toBe(90);             // zweiter Verlust trifft
  });

  it("B5 Initiative: nach Niederlage wird der nächste Gleichstand zum Sieg", () => {
    // Deck: Karte 0 verliert, Karte 5 würde unentschieden — gegen Gegner [12, 5]
    const deck = [{ id: "p0", suit: "R", baseRank: 0, value: 0 }, { id: "p1", suit: "R", baseRank: 5, value: 5 }];
    const opp = [{ id: "o0", suit: "R", baseRank: 12, value: 12 }, { id: "o1", suit: "R", baseRank: 5, value: 5 }];
    let s = {
      ...initialState(makeRng(1)),
      deck, oppDeck: opp, playerOrder: [0, 1], oppOrder: [0, 1],
      life: 100, perks: ["B5"],
    };
    s = resolveTrick(s, rng); // Verlust → tieArmed
    expect(s.lastResult).toBe("loss");
    expect(s.tieArmed).toBe(true);
    s = resolveTrick(s, rng); // Gleichstand → durch B5 zum Sieg
    expect(s.wins).toBe(1);
    expect(s.tieArmed).toBe(false);
  });
});

describe("resolveTrick — Score-Perks", () => {
  it("D1 Punktebonus: +20 %", () => {
    expect(resolveTrick(scenario(12, 0, { perks: ["D1"] }), rng).score).toBeCloseTo(120);
  });

  it("D4 Außenseitersieg: Sieg mit Wert ≤3 → doppelter Score", () => {
    expect(resolveTrick(scenario(2, 0, { perks: ["D4"] }), rng).score).toBe(200);
    expect(resolveTrick(scenario(12, 0, { perks: ["D4"] }), rng).score).toBe(100);
  });

  it("D2 Siegesserie: ×1,0 / ×1,1 / ×1,2 …", () => {
    let s = scenario(12, 0, { perks: ["D2"] });
    s = resolveTrick(s, rng); // ×1.0 → 100
    s = resolveTrick(s, rng); // ×1.1 → 110
    s = resolveTrick(s, rng); // ×1.2 → 120
    expect(s.score).toBeCloseTo(330);
  });
});

describe("resolveTrick — Tempo-Score & Crit (#19)", () => {
  it("Tempo-Score-Multiplikator bei 0 / 10 / 100 / 150 % Speed", () => {
    expect(resolveTrick(scenario(12, 0, { speedPct: 0 }), rng).score).toBe(100);
    expect(resolveTrick(scenario(12, 0, { speedPct: 10 }), rng).score).toBeCloseTo(105);
    expect(resolveTrick(scenario(12, 0, { speedPct: 100 }), rng).score).toBeCloseTo(150);
    expect(resolveTrick(scenario(12, 0, { speedPct: 150 }), rng).score).toBeCloseTo(175);
  });

  it("additive Boni (D5) werden NACH Multiplikatoren + Tempo addiert", () => {
    // 10. Sieg (wins 9→10) mit D1(+20%) und 100% Tempo: 100*1.2*1.5 + 25 = 205
    const s = resolveTrick(scenario(12, 0, { perks: ["D1", "D5"], speedPct: 100, wins: 9 }), rng);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(205);
  });

  it("Crit verdoppelt den vollen scoreBeforeCrit (inkl. Tempo + Boni)", () => {
    // D9 garantiert Crit beim 10. Sieg; D1 + 100% Tempo: scoreBeforeCrit = 180, ×2 = 360
    const s = resolveTrick(scenario(12, 0, { perks: ["D1", "D9"], speedPct: 100, wins: 9 }), rng);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.scoreBeforeCrit).toBeCloseTo(180);
    expect(s.lastTrick.scoreGain).toBeCloseTo(360);
    expect(s.lastTrick.critBonus).toBeCloseTo(180);
    expect(s.score).toBeCloseTo(360);
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
    // 10. Sieg, D9 garantiert, 100% Tempo: scoreBeforeCrit = 150, ×2 = 300, Bonus 150
    const s = resolveTrick(scenario(12, 0, { perks: ["D9"], speedPct: 100, wins: 9 }), rng);
    expect(s.crits).toBe(1);
    expect(s.critBonusScore).toBeCloseTo(150);
    expect(s.bestTrickScore).toBeCloseTo(300);
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

  it("Durchlauf-Ende (52 Stiche): cycle++, pos→0, C4 heilt", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 51, life: 1000, perks: ["C4"] }), rng);
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
