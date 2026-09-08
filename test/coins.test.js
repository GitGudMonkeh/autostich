/* Münz-Ökonomie (docs/muenz-oekonomie.md) — Einnahme und Auszahlungs-Naht.

   Die Tabelle in §2 ist der Vertrag, nicht die Formel: sie wird hier Zeile für Zeile geprüft, damit ein
   Tuning-Schritt an Schwelle oder Schrittweite sichtbar wird statt still durchzurutschen. Die zweite
   Gruppe prüft die NAHT — dass die Auszahlung vor dem cycleWins-Reset steht. Genau dort kann sie
   unbemerkt kaputtgehen: eine Zeile zu tief und jeder Durchlauf zahlt null, ohne dass sonst etwas auffällt. */
import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { initialState, reducer } from "../src/game/reducer.js";
import { resolveTrick } from "../src/game/engine.js";
import { coinsForWins, COIN_WIN_THRESHOLD, COIN_WIN_PER, rerollPrice, rerollOffer,
         energyPrice, energyBuy, ENERGY_MAX_BUYS, coverPrice, coverBuy, COVER_CELLS } from "../src/game/coins.js";
import { isLegendarySkill } from "../src/game/skills.js";
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

/* ---- Neuwurf kaufen (§3.1) --------------------------------------------------------------------- */
describe("Neuwurf-Preistreppe (§3.1)", () => {
  it("zwei Grundpreise, EIN Zähler — Verdopplung je Kauf der Phase", () => {
    expect([0, 1, 2, 3].map((n) => rerollPrice(n, false))).toEqual([3, 6, 12, 24]);
    expect([0, 1, 2, 3].map((n) => rerollPrice(n, true))).toEqual([15, 30, 60, 120]);
  });

  it("Mischen ist nicht billiger als Durchhalten: nach einem normalen Kauf kostet der legendäre 30", () => {
    // Der Zähler ist gemeinsam, der Grundpreis kommt aus der Art. Wer erst normal (3) würfelt und dann
    // legendär, zahlt beim zweiten Kauf 30 — nicht wieder den Grundpreis 15.
    expect(rerollPrice(1, true)).toBe(30);
    expect(rerollPrice(1, true)).toBeGreaterThan(rerollPrice(0, true));
  });

  it("solange Gratis-Neuwürfe da sind, ist der Neuwurf gratis und NICHT der Legendär-Wurf", () => {
    // Die Legendär-Garantie hängt am Kauf, nicht am Angebot — sonst zöge der Gratis-Pool sie mit.
    const r = rerollOffer({ coins: 0, coinRerolls: 0 }, 2, true);
    expect(r).toMatchObject({ free: true, tokens: 2, price: 0, legendary: false, can: true });
  });

  it("ohne Münzen ist der Kauf sichtbar, aber nicht auslösbar", () => {
    expect(rerollOffer({ coins: 2, coinRerolls: 0 }, 0, false)).toMatchObject({ free: false, price: 3, can: false });
    expect(rerollOffer({ coins: 3, coinRerolls: 0 }, 0, false)).toMatchObject({ free: false, price: 3, can: true });
  });
});

describe("Neuwurf-Kauf im Reducer (§3.1)", () => {
  // Skill-Phase mit geöffneter Tür und leerem Gratis-Pool: der Neuwurf ist jetzt käuflich.
  const atOffer = (over = {}) => ({
    ...initialState(makeRng(1), 7),
    phase: "levelup", rerollsSkill: 0,
    skillOffer: ["SK_FIRE_01", "SK_LIGHTNING_01", "SK_FIRE_02"],
    skillOfferTiers: { SK_FIRE_01: 0, SK_LIGHTNING_01: 0, SK_FIRE_02: 0 },
    skillOfferArchs: ["fire", "lightning", "fire"],
    ...over,
  });

  it("der Kauf zieht den Preis ab und schiebt die Treppe eine Stufe hoch", () => {
    const s1 = reducer(atOffer({ coins: 30 }), { type: "REROLL_SKILL" });
    expect(s1.coins).toBe(27);          // 30 − 3
    expect(s1.coinRerolls).toBe(1);
    const s2 = reducer(s1, { type: "REROLL_SKILL" });
    expect(s2.coins).toBe(21);          // 27 − 6
    expect(s2.coinRerolls).toBe(2);
  });

  it("die Gratis-Pools bleiben unberührt — der Kauf legt seinen Neuwurf auf denselben Weg", () => {
    const s = reducer(atOffer({ coins: 30 }), { type: "REROLL_SKILL" });
    expect(s.rerollsSkill).toBe(0);
    const free = reducer(atOffer({ coins: 30, rerollsSkill: 2 }), { type: "REROLL_SKILL" });
    expect(free.rerollsSkill).toBe(1);  // erst der Pool …
    expect(free.coins).toBe(30);        // … und der kostet nichts
    expect(free.coinRerolls).toBe(0);
  });

  it("ohne genug Münzen passiert nichts", () => {
    const before = atOffer({ coins: 2 });
    expect(reducer(before, { type: "REROLL_SKILL" })).toBe(before);
  });

  it("der gekaufte Legendär-Neuwurf kostet 15 und bringt wieder ein Legendäres — ein anderes", () => {
    const withLeg = atOffer({ coins: 40, skillOffer: ["SK_FIRE_L01", "SK_LIGHTNING_01", "SK_FIRE_02"],
      skillOfferTiers: { SK_LIGHTNING_01: 0, SK_FIRE_02: 0 } });
    const s = reducer(withLeg, { type: "REROLL_SKILL" });
    expect(s.coins).toBe(25);                                        // 40 − 15, nicht − 3
    expect(s.skillOffer.some(isLegendarySkill)).toBe(true);          // Garantie
    expect(s.skillOffer).not.toContain("SK_FIRE_L01");               // nicht dasselbe wie das gezeigte
  });

  it("die Treppe läuft je Phase — ein neuer Durchlauf setzt sie zurück", () => {
    const spent = reducer(atOffer({ coins: 30 }), { type: "REROLL_SKILL" });
    expect(spent.coinRerolls).toBe(1);
    const nextPhase = resolveTrick({ ...scenario(12, 0, { pos: TRICKS_PER_CYCLE - 1, coinRerolls: spent.coinRerolls }) }, rng);
    expect(nextPhase.coinRerolls).toBe(0);
  });
});

/* ---- Energie (§3.2) und Baufeld (§3.4) ---------------------------------------------------------- */
describe("Energie in der Aufstellphase (§3.2)", () => {
  const inFormation = (over = {}) => ({ ...initialState(makeRng(1), 7), phase: "formation", formationEnergy: 4, ...over });

  it("Preis 3 dann 6, höchstens zwei Käufe je Phase", () => {
    expect([0, 1].map(energyPrice)).toEqual([3, 6]);
    expect(ENERGY_MAX_BUYS).toBe(2);
    expect(energyBuy({ coins: 99, coinEnergy: 2 }).soldOut).toBe(true);
  });

  it("der Kauf hebt die LAUFENDE Energie, nicht die Basis", () => {
    const s = reducer(inFormation({ coins: 20 }), { type: "BUY_ENERGY" });
    expect(s.formationEnergy).toBe(5);
    expect(s.coins).toBe(17);
    expect(s.coinEnergy).toBe(1);
    // Die Basis bleibt unberührt — ein Kauf hier darf die nächste Aufstellphase nicht mitfinanzieren.
    expect(s.formationEnergyBase).toBe(inFormation().formationEnergyBase);
  });

  it("nach zwei Käufen ist Schluss, auch mit vollem Konto", () => {
    let s = reducer(inFormation({ coins: 99 }), { type: "BUY_ENERGY" });
    s = reducer(s, { type: "BUY_ENERGY" });
    expect(s.formationEnergy).toBe(6);
    expect(s.coins).toBe(90);                    // 99 − 3 − 6
    expect(reducer(s, { type: "BUY_ENERGY" })).toBe(s);
  });

  it("gekaufte Energie überlebt das Zurücksetzen — bezahlt ist bezahlt", () => {
    const bought = reducer(inFormation({ coins: 20 }), { type: "BUY_ENERGY" });
    const reset = reducer({ ...bought, formationSwaps: [] }, { type: "RESET_FORMATION" });
    expect(reset.formationEnergy).toBe(5);       // volle Basis 4 + der gekaufte Tausch
  });

  it("sie verfällt aber mit der Phase", () => {
    const next = resolveTrick(scenario(12, 0, { pos: 3, coinEnergy: 2 }), rng);
    expect(next.coinEnergy).toBe(0);
  });
});

describe("Baufeld-Zellen (§3.4)", () => {
  const inArchitect = (over = {}) => {
    const s = initialState(makeRng(1), 7);
    return { ...s, phase: "architect", ...over };
  };

  it("Preis 20 dann 40, genau zweimal je Lauf", () => {
    expect([0, 1].map(coverPrice)).toEqual([20, 40]);
    expect(coverBuy({ coins: 999, coverBuys: 2 }).soldOut).toBe(true);
  });

  it("der Kauf hebt maxCover dauerhaft und leert den Vorrat", () => {
    const start = inArchitect({ coins: 100 });
    const base = start.architect.maxCover;
    const s1 = reducer(start, { type: "BUY_COVER" });
    expect(s1.architect.maxCover).toBe(base + COVER_CELLS);
    expect(s1.coins).toBe(80);
    expect(coverBuy(s1).left).toBe(1);
    const s2 = reducer(s1, { type: "BUY_COVER" });
    expect(s2.architect.maxCover).toBe(base + 2 * COVER_CELLS);
    expect(s2.coins).toBe(40);                   // 80 − 40
    expect(reducer(s2, { type: "BUY_COVER" })).toBe(s2); // ausverkauft
  });

  it("der Vorrat zählt den LAUF, nicht die Phase — ein Durchlauf setzt ihn nicht zurück", () => {
    const after = resolveTrick(scenario(12, 0, { pos: TRICKS_PER_CYCLE - 1, coverBuys: 1 }), rng);
    expect(after.coverBuys).toBe(1);
  });

  it("ohne genug Münzen passiert nichts", () => {
    const poor = inArchitect({ coins: 19 });
    expect(reducer(poor, { type: "BUY_COVER" })).toBe(poor);
  });
});
