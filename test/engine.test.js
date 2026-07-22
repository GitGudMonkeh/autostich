import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";

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
    expect(s.score).toBe(1);
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
    expect(resolveTrick(scenario(12, 0, { perks: ["D1"] }), rng).score).toBeCloseTo(1.2, 5);
  });

  it("D4 Außenseitersieg: Sieg mit Wert ≤3 → doppelter Score", () => {
    expect(resolveTrick(scenario(2, 0, { perks: ["D4"] }), rng).score).toBe(2);
    expect(resolveTrick(scenario(12, 0, { perks: ["D4"] }), rng).score).toBe(1);
  });

  it("D2 Siegesserie: ×1,0 / ×1,1 / ×1,2 …", () => {
    let s = scenario(12, 0, { perks: ["D2"] });
    s = resolveTrick(s, rng); // 1.0
    s = resolveTrick(s, rng); // +1.1
    s = resolveTrick(s, rng); // +1.2
    expect(s.score).toBeCloseTo(3.3, 5);
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
