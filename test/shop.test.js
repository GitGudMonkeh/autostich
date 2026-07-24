import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { reducer, initialState, menuState } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialShop, coinsPerCycle } from "../src/game/shop.js";
import { STAT_IDS } from "../src/game/stats.js";
import { MAX_CYCLES, DECISION_SCHEDULE, STARTING_COINS, BASE_COINS_PER_CYCLE } from "../src/game/constants.js";

const rng = makeRng(9);
// Zustand am Durchlauf-Ende (pos 39 = letzter Stich) — der Stich schließt den Durchlauf ab und vergibt Münzen.
const atCycleEnd = (over = {}) => ({ ...initialState(makeRng(1)), pos: 39, ...over });

describe("Shop-Rhythmus — Entscheidungsplan (Shop-Spec §2)", () => {
  it("Run hat genau 44 Durchläufe und einen 44-Einträge-Plan", () => {
    expect(MAX_CYCLES).toBe(44);
    expect(DECISION_SCHEDULE).toHaveLength(44);
  });
  it("Verteilung ist 11 Stat · 11 Perk · 8 Formation · 8 Shop · 6 Skill (§2.3)", () => {
    const count = (t) => DECISION_SCHEDULE.filter((d) => d === t).length;
    expect(count("stat")).toBe(11);
    expect(count("perk")).toBe(11);
    expect(count("formation")).toBe(8);
    expect(count("shop")).toBe(8);
    expect(count("skill")).toBe(6);
  });
  it("Shop-Zeitpunkte = 5, 11, 16, 22, 27, 33, 38, 42 (§2.4)", () => {
    const at = DECISION_SCHEDULE.map((d, i) => (d === "shop" ? i + 1 : null)).filter(Boolean);
    expect(at).toEqual([5, 11, 16, 22, 27, 33, 38, 42]);
  });
  it("Skill-Zeitpunkte = 6, 12, 19, 28, 34, 41 (§2.5)", () => {
    const at = DECISION_SCHEDULE.map((d, i) => (d === "skill" ? i + 1 : null)).filter(Boolean);
    expect(at).toEqual([6, 12, 19, 28, 34, 41]);
  });
  it("erster Plan-Eintrag ist Stat (Start-Entscheid via START_RUN)", () => {
    expect(DECISION_SCHEDULE[0]).toBe("stat");
  });
});

describe("Münzökonomie (Shop-Spec §3)", () => {
  it("initialShop startet mit 2 Münzen (STARTING_COINS)", () => {
    expect(STARTING_COINS).toBe(2);
    expect(initialShop().coins).toBe(2);
    expect(initialState(makeRng(1)).shop.coins).toBe(2);
  });
  it("coinsPerCycle: Basis + Einkommen-Level, additiv, nie negativ", () => {
    expect(BASE_COINS_PER_CYCLE).toBe(2);
    expect(coinsPerCycle(0)).toBe(2);
    expect(coinsPerCycle(1)).toBe(3);
    expect(coinsPerCycle(3)).toBe(5);
    expect(coinsPerCycle(-5)).toBe(2); // defensiv: negatives Level zählt als 0
  });
  it("+2 Münzen nach abgeschlossenem Durchlauf bei Einkommen 0", () => {
    const s = resolveTrick(atCycleEnd({ cycle: 0 }), rng);
    expect(s.cycle).toBe(1);
    expect(s.shop.coins).toBe(STARTING_COINS + 2); // 2 Start + 2
  });
  it("+3 Münzen bei Einkommen 1 (stackbar/additiv)", () => {
    const s = resolveTrick(atCycleEnd({ cycle: 0, economyStatLevel: 1 }), rng);
    expect(s.shop.coins).toBe(STARTING_COINS + 3); // 2 Start + 3
  });
  it("Münzen werden auch nach dem letzten Durchlauf noch vergeben (§3.5) und der Run endet", () => {
    const s = resolveTrick(atCycleEnd({ cycle: MAX_CYCLES - 1 }), rng);
    expect(s.phase).toBe("gameover");
    expect(s.shop.coins).toBe(STARTING_COINS + 2);
  });
  it("kein Einkommen bei Aufgabe mitten im Durchlauf (END_RUN vergibt nichts)", () => {
    const mid = { ...initialState(makeRng(1)), trickNo: 5, pos: 5, shop: { ...initialShop(), coins: 7 } };
    const r = reducer(mid, { type: "END_RUN" });
    expect(r.phase).toBe("gameover");
    expect(r.shop.coins).toBe(7); // unverändert
  });
});

describe("Einkommens-Stat (Shop-Spec §4)", () => {
  const statState = (over = {}) => ({ ...initialState(makeRng(1)), phase: "levelup", statOffer: STAT_IDS, ...over });
  it("Stat-Angebot enthält fünf Stats inkl. Einkommen (§4.3)", () => {
    expect(STAT_IDS).toHaveLength(5);
    expect(STAT_IDS).toContain("economy");
  });
  it("PICK_STAT economy erhöht economyStatLevel um 1 und kehrt in play zurück", () => {
    const s = reducer(statState(), { type: "PICK_STAT", statId: "economy", rng });
    expect(s.phase).toBe("play");
    expect(s.economyStatLevel).toBe(1);
  });
  it("stapelt additiv über mehrere Picks", () => {
    const s = reducer(statState({ economyStatLevel: 2 }), { type: "PICK_STAT", statId: "economy", rng });
    expect(s.economyStatLevel).toBe(3);
  });
});

describe("Shop-Phase — Reducer (Shop-Spec §2.6)", () => {
  it("LEAVE_SHOP kehrt aus der Shop-Phase in play zurück", () => {
    const shop = { ...initialState(makeRng(1)), phase: "shop" };
    expect(reducer(shop, { type: "LEAVE_SHOP" }).phase).toBe("play");
  });
  it("LEAVE_SHOP ist außerhalb der Shop-Phase wirkungslos", () => {
    const play = initialState(makeRng(1));
    expect(reducer(play, { type: "LEAVE_SHOP" })).toBe(play);
    const menu = menuState();
    expect(reducer(menu, { type: "LEAVE_SHOP" })).toBe(menu);
  });
});
