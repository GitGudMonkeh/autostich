/* Münz-Ökonomie (docs/muenz-oekonomie.md) — Einnahme und Auszahlungs-Naht.

   Die Tabelle in §2 ist der Vertrag, nicht die Formel: sie wird hier Zeile für Zeile geprüft, damit ein
   Tuning-Schritt an Schwelle oder Schrittweite sichtbar wird statt still durchzurutschen. Die zweite
   Gruppe prüft die NAHT — dass die Auszahlung vor dem cycleWins-Reset steht. Genau dort kann sie
   unbemerkt kaputtgehen: eine Zeile zu tief und jeder Durchlauf zahlt null, ohne dass sonst etwas auffällt. */
import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { coinsForWins, COIN_WIN_THRESHOLD, COIN_WIN_PER } from "../src/game/coins.js";
import { TRICKS_PER_CYCLE } from "../src/game/constants.js";

const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const scenario = (pVal, oVal, over = {}) => ({
  ...initialState(makeRng(1)),
  deck: constDeck(pVal), oppDeck: constDeck(oVal),
  playerOrder: identity(), oppOrder: identity(),
  ...over,
});
const rng = makeRng(9);

describe("Münz-Einnahme (§2)", () => {
  it("die Tabelle aus §2 — unter der Schwelle nichts, danach je vier Siege eine Münze", () => {
    // Genau die Zeilen des Plans. Ändert jemand Schwelle oder Schritt, fällt DIESER Test, nicht erst der Playtest.
    expect([0, 12, 20, 24, 28, 32, 36, 40].map(coinsForWins)).toEqual([0, 0, 0, 1, 2, 3, 4, 5]);
  });

  it("nie negativ, und die Schwelle selbst zahlt noch nichts", () => {
    expect(coinsForWins(COIN_WIN_THRESHOLD)).toBe(0);
    expect(coinsForWins(COIN_WIN_THRESHOLD + COIN_WIN_PER - 1)).toBe(0); // erst der volle Schritt zahlt
    expect(coinsForWins(COIN_WIN_THRESHOLD + COIN_WIN_PER)).toBe(1);
    expect(coinsForWins(-5)).toBe(0);
  });
});

describe("Auszahlung am Durchlaufende (§2, Naht)", () => {
  // Schlussstich eines Durchlaufs (pos = TRICKS_PER_CYCLE − 1) als Sieg; cycleWins zählt diesen Sieg mit.
  const endOfCycle = (winsBefore, over = {}) =>
    resolveTrick(scenario(12, 0, { pos: TRICKS_PER_CYCLE - 1, cycleWins: winsBefore, ...over }), rng);

  it("zahlt aus den Siegen DIESES Durchlaufs, vor dem Reset", () => {
    const s = endOfCycle(31); // +1 durch den Schlussstich = 32 Siege → 3 Münzen
    expect(s.lastCycleWins).toBe(32);
    expect(s.lastCycleCoins).toBe(3);
    expect(s.coins).toBe(3);
    expect(s.cycleWins).toBe(0); // Bilanz für den nächsten Durchlauf zurückgesetzt
  });

  it("der Kontostand summiert über die Durchläufe", () => {
    const first = endOfCycle(31);
    const second = resolveTrick(scenario(12, 0, { pos: TRICKS_PER_CYCLE - 1, cycleWins: 39, coins: first.coins }), rng);
    expect(second.lastCycleCoins).toBe(5); // 40 Siege
    expect(second.coins).toBe(8);          // 3 aus dem ersten Durchlauf + 5
  });

  it("ein schwacher Durchlauf zahlt null, ohne den Kontostand anzutasten", () => {
    const s = endOfCycle(11, { coins: 7 }); // 12 Siege → unter der Schwelle
    expect(s.lastCycleCoins).toBe(0);
    expect(s.coins).toBe(7);
  });

  it("mitten im Durchlauf wird nicht ausgezahlt", () => {
    const s = resolveTrick(scenario(12, 0, { pos: 5, cycleWins: 30 }), rng);
    expect(s.coins).toBe(0);
    expect(s.lastCycleCoins).toBe(null);
  });

  it("kein Startbetrag (§2): ein frischer Lauf beginnt bei null", () => {
    expect(initialState(makeRng(1)).coins).toBe(0);
  });
});
