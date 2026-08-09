import { describe, it, expect } from "vitest";
import {
  CHALLENGES, CHALLENGE_IDS, CHALLENGE_BY_ID,
  normalizeActive, challengeStakes, challengeResults, challengeRaw, settleChallenges,
} from "../src/game/challenges.js";

describe("Challenge-Modus (#301)", () => {
  it("Registry: 3 Modifikatoren in fester Reihenfolge mit den festgelegten Werten", () => {
    expect(CHALLENGE_IDS).toEqual(["c1", "c2", "c3"]);
    expect(CHALLENGE_BY_ID.c1).toMatchObject({ target: 50_000_000, gain: 3, loss: 2, effect: "noRerolls" });
    expect(CHALLENGE_BY_ID.c2).toMatchObject({ target: 75_000_000, gain: 4, loss: 4, effect: "archLock", lockCells: 10 });
    expect(CHALLENGE_BY_ID.c3).toMatchObject({ target: 100_000_000, gain: 10, loss: 5, effect: "formLock", lockCells: 10 });
    expect(CHALLENGES.map((c) => c.order)).toEqual([1, 2, 3]);
  });

  it("normalizeActive: Zahl → Präfix", () => {
    expect(normalizeActive(0)).toEqual([]);
    expect(normalizeActive(1).map((c) => c.id)).toEqual(["c1"]);
    expect(normalizeActive(2).map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(normalizeActive(3).map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
    expect(normalizeActive(9).map((c) => c.id)).toEqual(["c1", "c2", "c3"]); // gedeckelt
  });

  it("normalizeActive: Array/Set von ids → längstes lückenloses Präfix (C2 ohne C1 = leer)", () => {
    expect(normalizeActive(["c1", "c2"]).map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(normalizeActive(new Set(["c1", "c2", "c3"])).map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
    expect(normalizeActive(["c2", "c3"])).toEqual([]);                 // C1 fehlt → kein gültiges Präfix
    expect(normalizeActive(["c1", "c3"]).map((c) => c.id)).toEqual(["c1"]); // Lücke bei C2 → beschnitten auf c1
    expect(normalizeActive([CHALLENGE_BY_ID.c1]).map((c) => c.id)).toEqual(["c1"]); // Objekte erlaubt
  });

  it("challengeStakes: max. Gewinn/Verlust als laufende Summe", () => {
    expect(challengeStakes(0)).toEqual({ maxGain: 0, maxLoss: 0 });
    expect(challengeStakes(1)).toEqual({ maxGain: 3, maxLoss: 2 });
    expect(challengeStakes(2)).toEqual({ maxGain: 7, maxLoss: 6 });
    expect(challengeStakes(3)).toEqual({ maxGain: 17, maxLoss: 11 }); // 3+4+10 / 2+4+5
  });

  it("Ziele sind strikt > (genau auf der Schwelle = verfehlt)", () => {
    expect(challengeResults(1, 50_000_000)[0].met).toBe(false);       // == 50M → nicht erfüllt
    expect(challengeResults(1, 50_000_001)[0].met).toBe(true);
    expect(challengeResults(1, 50_000_000)[0].delta).toBe(-2);
    expect(challengeResults(1, 50_000_001)[0].delta).toBe(3);
  });

  it("challengeRaw: Summe der Deltas (kann negativ sein)", () => {
    // Alle drei aktiv, Score 80M: C1 (>50) erfüllt +3, C2 (>75) erfüllt +4, C3 (>100) verfehlt −5 → +2
    expect(challengeRaw(3, 80_000_000)).toBe(2);
    // Alle verfehlt (Score 10M): −2 −4 −5 = −11
    expect(challengeRaw(3, 10_000_000)).toBe(-11);
    // Alle erfüllt (Score 120M): +3 +4 +10 = +17
    expect(challengeRaw(3, 120_000_000)).toBe(17);
  });

  it("settleChallenges: Lauf-Netto = max(0, native + raw) — Abzüge fressen native DP, nie unter 0", () => {
    // native 8 DP (80M), alle drei: raw +2 → runDp 10
    const s1 = settleChallenges(3, 80_000_000, 8);
    expect(s1.raw).toBe(2);
    expect(s1.native).toBe(8);
    expect(s1.runDp).toBe(10);

    // native 1 DP (10M), alle drei verfehlt: raw −11 → 1−11 = −10 → gedeckelt auf 0
    const s2 = settleChallenges(3, 10_000_000, 1);
    expect(s2.raw).toBe(-11);
    expect(s2.runDp).toBe(0);

    // Abzüge fressen die native DP: native 5, raw −3 → 2
    const s3 = settleChallenges(3, 60_000_000, 5); // 60M: C1 +3, C2 −4, C3 −5 → raw −6
    expect(s3.raw).toBe(-6);
    expect(s3.runDp).toBe(0); // 5 − 6 = −1 → 0

    // keine Modifikatoren → reine native DP
    const s4 = settleChallenges(0, 999_000_000, 7);
    expect(s4.raw).toBe(0);
    expect(s4.runDp).toBe(7);
  });

  it("settleChallenges: results tragen met/delta je Modifikator (für den Victory-Screen)", () => {
    const { results } = settleChallenges(3, 80_000_000, 8);
    expect(results.map((r) => r.met)).toEqual([true, true, false]);
    expect(results.map((r) => r.delta)).toEqual([3, 4, -5]);
    expect(results.map((r) => r.id)).toEqual(["c1", "c2", "c3"]);
  });
});
