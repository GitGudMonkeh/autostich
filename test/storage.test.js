import { describe, it, expect } from "vitest";
import { rankHighscores } from "../src/game/storage.js";

describe("rankHighscores", () => {
  it("sortiert nach Score↓ und behält Top 5", () => {
    let list = [];
    for (const sc of [50, 300, 120, 90, 400, 10, 260]) {
      list = rankHighscores(list, { score: sc, level: 1, tricks: 1, cycles: 0, ts: sc });
    }
    expect(list.map((e) => e.score)).toEqual([400, 300, 260, 120, 90]);
  });

  it("bricht Score-Gleichstand über mehr Stiche, dann jünger", () => {
    const list = rankHighscores(
      [{ score: 100, level: 2, tricks: 40, cycles: 0, ts: 1 }],
      { score: 100, level: 2, tricks: 55, cycles: 1, ts: 2 },
    );
    expect(list[0].tricks).toBe(55);
  });
});
