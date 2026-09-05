import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, BLITZ_TIERS } from "../src/game/skills.js";
import { initLightning, L, maxChargeFor, effectiveTier, lightParam, lightningCritChance, lightningCritMult, overcritMult,
  blitzfaengerValue, ionScoreFor, chargeGainOnWin, critFillsBar, blitzschlagStacks, stauAfterWin, lightningOnLoss, fillBar,
  lightningCycleEnd } from "../src/game/factions/lightning.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";

/* Blitz — exp skill rework (docs/skill-rework.md §3): Passiv, 15 Skills mit vier Stufen, 4 Legendäre. Erst die reinen
   Übergänge des Moduls, dann jeder Skill einmal durch resolveTrick. Konstante Decks (Spieler 12 gegen 0 = Sieg,
   0 gegen 12 = Niederlage), rng 0 = Crit sobald Chance > 0, rng 0,99 = nie. playerOrder = Identität: Position 0 spielt
   Deck-Index 0, die „nächste Karte in der Reihenfolge" ist Deck-Index 1. */
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const scen = (pVal, oVal, over = {}) => ({ ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal), playerOrder: identity(), oppOrder: identity(), ...over });
const light = (over = {}) => ({ ...initLightning(), active: true, ...over });
const withStacks = (v, idx, stacks) => constDeck(v).map((c, i) => (i === idx ? { ...c, ionStacks: stacks } : c));
const noCrit = () => 0.99, zero = () => 0;
const B = C.SCORE_PER_WIN;
const T = BLITZ_TIERS;
const M = C.CRIT_BASE_MULT;

/* Roster mit LITERALEN IDs — das Coverage-Gate in registry-guards.test.js sucht jede Skill-ID als Text in den Tests. */
const LIGHTNING_IDS = [
  "SK_LIGHTNING_01", "SK_LIGHTNING_03", "SK_LIGHTNING_04", "SK_LIGHTNING_05", "SK_LIGHTNING_06", "SK_LIGHTNING_07",
  "SK_LIGHTNING_08", "SK_LIGHTNING_09", "SK_LIGHTNING_10", "SK_LIGHTNING_11", "SK_LIGHTNING_13", "SK_LIGHTNING_14",
  "SK_LIGHTNING_15", "SK_LIGHTNING_16", "SK_LIGHTNING_17",
  "SK_LIGHTNING_L01", "SK_LIGHTNING_L02", "SK_LIGHTNING_L03", "SK_LIGHTNING_L04",
];

describe("Blitz-Modul — Stufen und Kennwerte", () => {
  it("L nennt genau die 19 registrierten Blitz-Skills (15 + 4 Legendäre)", () => {
    const ids = Object.values(L);
    expect(ids).toHaveLength(19);
    expect([...ids].sort()).toEqual([...LIGHTNING_IDS].sort());
    for (const id of ids) expect(SKILL_DEFS[id]?.archetype, id).toBe("lightning");
    expect(Object.values(SKILL_DEFS).filter((s) => s.archetype === "lightning").map((s) => s.id).sort()).toEqual([...LIGHTNING_IDS].sort());
  });
  it("effectiveTier: nicht gehalten/Legendär → null; ohne Eintrag Normal; Hochspannung hebt um eins, Episch bleibt", () => {
    expect(effectiveTier([], {}, L.ABLEITER)).toBeNull();
    expect(effectiveTier([L.DONNERGOTT], {}, L.DONNERGOTT)).toBeNull();
    expect(effectiveTier([L.ABLEITER], {}, L.ABLEITER)).toBe(0);
    expect(effectiveTier([L.ABLEITER], { [L.ABLEITER]: 2 }, L.ABLEITER)).toBe(2);
    expect(effectiveTier([L.ABLEITER, L.HOCHSPANNUNG], { [L.ABLEITER]: 2 }, L.ABLEITER)).toBe(3);
    expect(effectiveTier([L.ABLEITER, L.HOCHSPANNUNG], { [L.ABLEITER]: 3 }, L.ABLEITER)).toBe(3);
    expect(effectiveTier([L.ABLEITER, L.HOCHSPANNUNG], {}, L.ABLEITER)).toBe(1);
  });
  it("lightParam liest die Zeile der wirksamen Stufe; unbekannter Schlüssel / nicht gehalten → undefined", () => {
    expect(lightParam([L.RESTSTROM], {}, L.RESTSTROM, "floor")).toBe(T.reststrom[0].floor);
    expect(lightParam([L.RESTSTROM], { [L.RESTSTROM]: 3 }, L.RESTSTROM, "floor")).toBe(T.reststrom[3].floor);
    expect(lightParam([L.RESTSTROM], {}, L.RESTSTROM, "nope")).toBeUndefined();
    expect(lightParam([], {}, L.RESTSTROM, "floor")).toBeUndefined();
  });
  it("maxChargeFor: Leiste 10, mit Donnergott 7", () => {
    expect(maxChargeFor([])).toBe(C.LIGHTNING_MAX_CHARGE);
    expect(maxChargeFor([L.DONNERGOTT])).toBe(C.DONNERGOTT_MAX_CHARGE);
    expect(C.DONNERGOTT_MAX_CHARGE).toBeLessThan(C.LIGHTNING_MAX_CHARGE);
  });
  it("lightningCritChance: +5 % je Blitz-Skill (auch Legendäre), Rampen und Stau additiv, Ladungsserie je Serienpunkt", () => {
    expect(lightningCritChance(initLightning(), [L.ABLEITER], {})).toBe(0); // inaktiv
    expect(lightningCritChance(light(), [L.ABLEITER, L.RESTSTROM], {})).toBeCloseTo(2 * C.LIGHTNING_CRIT_PER_SKILL, 9);
    expect(lightningCritChance(light(), [L.DONNERGOTT], {})).toBeCloseTo(C.LIGHTNING_CRIT_PER_SKILL, 9);
    expect(lightningCritChance(light({ stormCritBonus: 0.2, stauBonus: 0.1 }), [], {})).toBeCloseTo(0.3, 9);
    expect(lightningCritChance(light(), [L.LADUNGSSERIE], {}, 10)).toBeCloseTo(C.LIGHTNING_CRIT_PER_SKILL + 10 * T.serie[0].critPerStreak, 9);
    expect(lightningCritChance(light(), [L.LADUNGSSERIE], { [L.LADUNGSSERIE]: 3 }, 20)).toBeCloseTo(C.LIGHTNING_CRIT_PER_SKILL + 20 * T.serie[3].critPerStreak, 9);
    expect(lightningCritChance(light(), [L.LADUNGSSERIE], {}, 0)).toBeCloseTo(C.LIGHTNING_CRIT_PER_SKILL, 9); // ohne Serie kein Bonus
  });
  it("lightningCritMult: Entladung-Rampe + Donnergott + Überschlag als Zustand je 10 Punkte über 100 %", () => {
    expect(lightningCritMult(initLightning(), [L.DONNERGOTT], {})).toBe(0);
    expect(lightningCritMult(light({ entladungMult: 0.3 }), [L.DONNERGOTT], {})).toBeCloseTo(0.3 + C.THUNDER_CRIT_MULT, 9);
    expect(lightningCritMult(light(), [L.UEBERSCHLAG], {}, 1.55)).toBeCloseTo(5 * T.ueberschlag[0].multPer10, 9);   // 55 Punkte → 5 Schritte
    expect(lightningCritMult(light(), [L.UEBERSCHLAG], { [L.UEBERSCHLAG]: 3 }, 2.5)).toBeCloseTo(15 * T.ueberschlag[3].multPer10, 9);
    expect(lightningCritMult(light(), [L.UEBERSCHLAG], {}, 1.0)).toBe(0);                                          // kein Überschuss
    expect(lightningCritMult(light(), [], {}, 1.55)).toBe(0);                                                       // ohne Überschlag nichts
  });
  it("Systemregel overcritMult: je Prozentpunkt über 100 % OVERCRIT_MULT_PER_PP, darunter 0", () => {
    expect(overcritMult(0.8)).toBe(0);
    expect(overcritMult(1)).toBe(0);
    expect(overcritMult(1.5)).toBeCloseTo(50 * C.OVERCRIT_MULT_PER_PP, 9);
    expect(C.OVERCRIT_MULT_PER_PP).toBeGreaterThan(0);
    expect(C.OVERCRIT_MULT_PER_PP).toBeLessThan(0.01); // „sehr klein"
  });
  it("blitzfaengerValue / ionScoreFor: Schwellen fallen mit der Stufe, Kurzschluss zählt Stapel ab Schwelle doppelt", () => {
    for (let t = 0; t < 4; t++) {
      const min = T.faenger[t].minStacks;
      expect(blitzfaengerValue([L.BLITZFAENGER], { [L.BLITZFAENGER]: t }, { ionStacks: min })).toBe(T.faenger[t].value);
      expect(blitzfaengerValue([L.BLITZFAENGER], { [L.BLITZFAENGER]: t }, { ionStacks: min - 1 })).toBe(0);
    }
    expect(blitzfaengerValue([], {}, { ionStacks: 99 })).toBe(0);
    expect(ionScoreFor({ ionStacks: 3 })).toBe(3 * C.ION_SCORE_PER_STACK);
    expect(ionScoreFor({})).toBe(0);
    expect(ionScoreFor(null)).toBe(0);
    const min = T.kurzschluss[0].minStacks;
    expect(ionScoreFor({ ionStacks: min }, [L.KURZSCHLUSS], {})).toBe(min * C.ION_SCORE_PER_STACK * T.kurzschluss[0].factor);
    expect(ionScoreFor({ ionStacks: min - 1 }, [L.KURZSCHLUSS], {})).toBe((min - 1) * C.ION_SCORE_PER_STACK);
  });
});

describe("Blitz-Modul — Ladung, Leiste, Niederlage (reine Übergänge)", () => {
  it("chargeGainOnWin: Crit +1 Passiv; Blitzableiter Normal jeder 2. Crit, Selten jeder; Überspannung ab Schwelle; immutabel", () => {
    const l = light();
    const a = chargeGainOnWin(l, [], {}, { isCrit: true });
    expect(a.gain).toBe(1); expect(a.next.critCount).toBe(1); expect(l.critCount).toBe(0);
    expect(chargeGainOnWin(light(), [L.ABLEITER], {}, { isCrit: true }).gain).toBe(1);                          // 1. Crit: noch nichts extra
    expect(chargeGainOnWin(light({ critCount: 1 }), [L.ABLEITER], {}, { isCrit: true }).gain).toBe(2);          // 2. Crit: +1
    expect(chargeGainOnWin(light(), [L.ABLEITER], { [L.ABLEITER]: 1 }, { isCrit: true }).gain).toBe(2);        // Selten: jeder Crit
    const min = T.ueberspannung[0].minStacks;
    expect(chargeGainOnWin(light(), [L.UEBERSPANNUNG], {}, { isCrit: true, card: { ionStacks: min } }).gain).toBe(1 + T.ueberspannung[0].charge);
    expect(chargeGainOnWin(light(), [L.UEBERSPANNUNG], {}, { isCrit: true, card: { ionStacks: min - 1 } }).gain).toBe(1);
    expect(chargeGainOnWin(light(), [L.UEBERSPANNUNG], {}, { isCrit: false, card: { ionStacks: 99 } }).gain).toBe(0); // nur bei Crit
  });
  it("chargeGainOnWin ohne Crit: Statische Aufladung (Normal jeder 2., Selten jeder, Episch +2); Dauerstrom / Ladungsserie Episch ab Serie", () => {
    expect(chargeGainOnWin(light(), [L.STATIK], {}, { isCrit: false }).gain).toBe(0);
    expect(chargeGainOnWin(light({ nonCritWins: 1 }), [L.STATIK], {}, { isCrit: false }).gain).toBe(1);
    expect(chargeGainOnWin(light(), [L.STATIK], { [L.STATIK]: 1 }, { isCrit: false }).gain).toBe(1);
    expect(chargeGainOnWin(light(), [L.STATIK], { [L.STATIK]: 3 }, { isCrit: false }).gain).toBe(T.statik[3].charge);
    expect(chargeGainOnWin(light(), [L.STATIK], { [L.STATIK]: 3 }, { isCrit: true }).gain).toBe(1);                 // Crit: nur Passiv
    expect(chargeGainOnWin(light(), [L.DAUERSTROM], {}, { isCrit: false, streak: T.dauerstrom[0].minStreak }).gain).toBe(1);
    expect(chargeGainOnWin(light(), [L.DAUERSTROM], {}, { isCrit: false, streak: T.dauerstrom[0].minStreak - 1 }).gain).toBe(0);
    expect(chargeGainOnWin(light(), [L.LADUNGSSERIE], { [L.LADUNGSSERIE]: 3 }, { isCrit: false, streak: 8 }).gain).toBe(1);
    expect(chargeGainOnWin(light(), [L.LADUNGSSERIE], { [L.LADUNGSSERIE]: 2 }, { isCrit: false, streak: 8 }).gain).toBe(0); // nur Episch
  });
  it("critFillsBar: Vorschau auf denselben Gewinn wie der echte Crit", () => {
    expect(critFillsBar(light({ charge: 9 }), [], {})).toBe(true);
    expect(critFillsBar(light({ charge: 8 }), [], {})).toBe(false);
    expect(critFillsBar(light({ charge: 8 }), [L.ABLEITER], { [L.ABLEITER]: 1 })).toBe(true); // +1 Passiv +1 Blitzableiter
    expect(critFillsBar(light({ charge: 6 }), [L.DONNERGOTT], {})).toBe(true);                // Leiste 7
    expect(critFillsBar(initLightning(), [], {})).toBe(false);
  });
  it("blitzschlagStacks: jeder N. Crit (Zähler nach dem Crit), Doppelentladung 2 Stapel", () => {
    const n = T.blitzschlag[0].critEvery;
    expect(blitzschlagStacks(light({ critCount: n }), [L.BLITZSCHLAG], {})).toBe(1);
    expect(blitzschlagStacks(light({ critCount: n - 1 }), [L.BLITZSCHLAG], {})).toBe(0);
    expect(blitzschlagStacks(light({ critCount: 2 }), [L.BLITZSCHLAG, L.DOPPELENTLADUNG], { [L.BLITZSCHLAG]: 3 })).toBe(C.DOPPELENTLADUNG_STACKS);
    expect(blitzschlagStacks(light({ critCount: 5 }), [], {})).toBe(0);
  });
  it("stauAfterWin: ohne Crit +Schritt, Crit leert (Episch halbiert); ohne Skill unberührt (der Reducer leert beim Ersetzen)", () => {
    expect(stauAfterWin(light(), [L.SPANNUNGSSTAU], {}, false).stauBonus).toBeCloseTo(T.stau[0].step, 9);
    expect(stauAfterWin(light({ stauBonus: 0.3 }), [L.SPANNUNGSSTAU], {}, true).stauBonus).toBe(0);
    expect(stauAfterWin(light({ stauBonus: 0.3 }), [L.SPANNUNGSSTAU], { [L.SPANNUNGSSTAU]: 3 }, true).stauBonus).toBeCloseTo(0.15, 9);
    const l = light({ stauBonus: 0.3 });
    expect(stauAfterWin(l, [], {}, false)).toBe(l);
  });
  it("lightningOnLoss: Serienschutz ab dem Anteil der Stufe, kostet ihn; Episch einmal je Runde gratis; Statik jede 2. Niederlage", () => {
    const cost0 = Math.ceil(C.LIGHTNING_MAX_CHARGE * T.serienschutz[0].frac);
    const held = lightningOnLoss(light({ charge: cost0 + 1 }), [L.SERIENSCHUTZ], {});
    expect(held.streakHeld).toBe(true); expect(held.lightning.charge).toBe(1); expect(held.lightning.serienschutzCount).toBe(1);
    const broke = lightningOnLoss(light({ charge: cost0 - 1 }), [L.SERIENSCHUTZ], {});
    expect(broke.streakHeld).toBe(false); expect(broke.lightning.charge).toBe(cost0 - 1);
    const free = lightningOnLoss(light({ charge: 0 }), [L.SERIENSCHUTZ], { [L.SERIENSCHUTZ]: 3 });
    expect(free.streakHeld).toBe(true); expect(free.lightning.serienschutzFree).toBe(true); expect(free.lightning.charge).toBe(0);
    const again = lightningOnLoss(free.lightning, [L.SERIENSCHUTZ], { [L.SERIENSCHUTZ]: 3 });
    expect(again.streakHeld).toBe(false); // Gratis-Schutz verbraucht, Ladung 0 < 30 %
    expect(lightningOnLoss(light({ charge: 9 }), [L.SERIENSCHUTZ], {}, { alreadyHeld: true }).lightning.charge).toBe(9); // Serienanker hält schon → keine Kosten
    expect(lightningOnLoss(light(), [L.STATIK], { [L.STATIK]: 2 }).lightning.charge).toBe(0);
    expect(lightningOnLoss(light({ lossCount: 1 }), [L.STATIK], { [L.STATIK]: 2 }).lightning.charge).toBe(1);
    expect(lightningOnLoss(light({ lossCount: 1 }), [L.STATIK], {}).lightning.charge).toBe(0); // Normal: keine Niederlagen-Ladung
    expect(lightningOnLoss(initLightning(), [L.SERIENSCHUTZ], {}).streakHeld).toBe(false);
  });
  it("fillBar: nur bei voller Leiste; nächste Karte +1 Stapel, Leiste auf Boden, bars +1, immutabel; Wrap ans Deck-Ende", () => {
    const deck = constDeck(5), order = identity();
    const none = fillBar(light({ charge: 9 }), [], {}, deck, order, 0);
    expect(none.filled).toBe(false); expect(none.deck).toBe(deck);
    const f = fillBar(light({ charge: 10 }), [], {}, deck, order, 0);
    expect(f.filled).toBe(true); expect(f.stacks).toBe(1); expect(f.targets).toEqual([1]);
    expect(f.deck[1].ionStacks).toBe(1); expect(f.deck[0].ionStacks || 0).toBe(0);
    expect(f.lightning.charge).toBe(0); expect(f.lightning.bars).toBe(1);
    expect(deck[1].ionStacks).toBeUndefined(); // Original unverändert
    expect(fillBar(light({ charge: 10 }), [], {}, deck, order, 39).targets).toEqual([0]);
  });
  it("fillBar: Reststrom-Boden, Blitzableiter-Rückgabe, Episch behält den Überschuss; Rampen ohne Deckel", () => {
    const deck = constDeck(5), order = identity();
    expect(fillBar(light({ charge: 10 }), [L.RESTSTROM], { [L.RESTSTROM]: 1 }, deck, order, 0).lightning.charge).toBe(T.reststrom[1].floor);
    expect(fillBar(light({ charge: 10 }), [L.ABLEITER, L.RESTSTROM], { [L.ABLEITER]: 2, [L.RESTSTROM]: 0 }, deck, order, 0).lightning.charge)
      .toBe(T.reststrom[0].floor + T.ableiter[2].back);
    expect(fillBar(light({ charge: 13 }), [L.ABLEITER], { [L.ABLEITER]: 3 }, deck, order, 0).lightning.charge).toBe(T.ableiter[3].back + 3);
    expect(fillBar(light({ charge: 13 }), [L.ABLEITER], { [L.ABLEITER]: 2 }, deck, order, 0).lightning.charge).toBe(T.ableiter[2].back); // Überschuss verfällt
    const ramps = fillBar(light({ charge: 10, stormCritBonus: 0.5, entladungMult: 2 }), [L.GEWITTERFRONT, L.ENTLADUNG], {}, deck, order, 0).lightning;
    expect(ramps.stormCritBonus).toBeCloseTo(0.5 + T.gewitter[0].critPerBar, 9);
    expect(ramps.entladungMult).toBeCloseTo(2 + T.entladung[0].multPerBar, 9);
  });
  it("fillBar: Kettenblitz (Normal jede 2. Leiste, Episch +3 Karten und Zielkarte extra), Doppelentladung 2 Stapel, Statik Episch +1 Wert", () => {
    const deck = constDeck(5), order = identity();
    expect(fillBar(light({ charge: 10, bars: 0 }), [L.KETTENBLITZ], {}, deck, order, 0).stacks).toBe(1); // 1. Leiste: nichts extra
    expect(fillBar(light({ charge: 10, bars: 1 }), [L.KETTENBLITZ], {}, deck, order, 0).stacks).toBe(2); // 2. Leiste: +1 Karte
    const epic = fillBar(light({ charge: 10 }), [L.KETTENBLITZ], { [L.KETTENBLITZ]: 3 }, deck, order, 0);
    expect(epic.targets).toEqual([1, 2, 3, 4]);
    expect(epic.deck[1].ionStacks).toBe(2); expect(epic.deck[4].ionStacks).toBe(1); expect(epic.stacks).toBe(5);
    const dbl = fillBar(light({ charge: 10 }), [L.DOPPELENTLADUNG], {}, deck, order, 0);
    expect(dbl.deck[1].ionStacks).toBe(C.DOPPELENTLADUNG_STACKS);
    const val = fillBar(light({ charge: 10 }), [L.STATIK], { [L.STATIK]: 3 }, deck, order, 0);
    expect(val.deck[1].value).toBe(5 + T.statik[3].targetValue);
    expect(val.deck[2].value).toBe(5);
  });
  it("lightningCycleEnd: Gratis-Serienschutz wird je Runde wieder frei", () => {
    expect(lightningCycleEnd(light({ serienschutzFree: true })).serienschutzFree).toBe(false);
    const l = light();
    expect(lightningCycleEnd(l)).toBe(l);
    expect(lightningCycleEnd(null)).toBeNull();
  });
});

describe("Blitz — Engine-Integration (resolveTrick)", () => {
  it("Blitzfänger: Karte ab Schwelle kämpft mit +2 Wert und gewinnt den knappen Stich", () => {
    const min = T.faenger[0].minStacks;
    const win = resolveTrick(scen(10, 11, { deck: withStacks(10, 0, min), skills: [L.BLITZFAENGER], lightning: light() }), noCrit);
    expect(win.lastTrick.result).toBe("win");
    const loss = resolveTrick(scen(10, 11, { deck: withStacks(10, 0, min - 1), skills: [L.BLITZFAENGER], lightning: light() }), noCrit);
    expect(loss.lastTrick.result).toBe("loss");
  });
  it("Kurzschluss: Stapel der Siegkarte zählen ab Schwelle doppelt — in der Basis", () => {
    const min = T.kurzschluss[0].minStacks;
    const s = resolveTrick(scen(12, 0, { deck: withStacks(12, 0, min), skills: [L.KURZSCHLUSS], lightning: light() }), noCrit);
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + min * C.ION_SCORE_PER_STACK * 2) * 1.02, 6);
    expect(s.lightYield).toBeCloseTo(min * C.ION_SCORE_PER_STACK * 2, 6);
  });
  it("Überspannung: Crit mit Karte ab Schwelle +2 Ladung (plus 1 Passiv)", () => {
    const min = T.ueberspannung[0].minStacks;
    const s = resolveTrick(scen(12, 0, { deck: withStacks(12, 0, min), skills: [L.UEBERSPANNUNG], lightning: light() }), zero);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lightning.charge).toBe(1 + T.ueberspannung[0].charge);
  });
  it("Reststrom Selten + Blitzableiter Sehr selten: volle Leiste → Boden 3 + 1 zurück", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.ABLEITER, L.RESTSTROM], skillTiers: { [L.ABLEITER]: 2, [L.RESTSTROM]: 1 }, lightning: light({ charge: 8 }) }), zero);
    expect(s.lightning.bars).toBe(1);
    expect(s.lightning.charge).toBe(T.reststrom[1].floor + T.ableiter[2].back);
  });
  it("Blitzableiter Episch: Überschuss über der Leiste bleibt für die nächste", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.ABLEITER], skillTiers: { [L.ABLEITER]: 3 }, lightning: light({ charge: 9 }) }), zero); // 9 + 2 = 11
    expect(s.lightning.charge).toBe(T.ableiter[3].back + 1);
  });
  it("Gewitterfront / Entladung: jede volle Leiste rampt dauerhaft, ohne Deckel", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.GEWITTERFRONT, L.ENTLADUNG], lightning: light({ charge: 9, stormCritBonus: 0.9, entladungMult: 3 }) }), zero);
    expect(s.lightning.stormCritBonus).toBeCloseTo(0.9 + T.gewitter[0].critPerBar, 9);
    expect(s.lightning.entladungMult).toBeCloseTo(3 + T.entladung[0].multPerBar, 9);
  });
  it("Entladung Episch: der Crit, der die Leiste füllt, zählt mit doppeltem Crit-Multiplikator", () => {
    const fills = resolveTrick(scen(12, 0, { skills: [L.ENTLADUNG], skillTiers: { [L.ENTLADUNG]: 3 }, lightning: light({ charge: 9 }) }), zero);
    expect(fills.lastTrick.isCrit).toBe(true);
    expect(fills.lastTrick.critMultiplier).toBeCloseTo(M * 2, 6);
    const later = resolveTrick(scen(12, 0, { skills: [L.ENTLADUNG], skillTiers: { [L.ENTLADUNG]: 3 }, lightning: light({ charge: 5 }) }), zero);
    expect(later.lastTrick.critMultiplier).toBeCloseTo(M, 6);
  });
  it("Ladungsserie: Crit-Chance je Serienpunkt; Episch ab Serie 8 jeder Sieg +1 Ladung", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.LADUNGSSERIE], lightning: light(), winStreak: 4 }), noCrit);
    expect(s.lastTrick.critChance).toBeCloseTo(C.LIGHTNING_CRIT_PER_SKILL + 5 * T.serie[0].critPerStreak, 6);
    const epic = resolveTrick(scen(12, 0, { skills: [L.LADUNGSSERIE], skillTiers: { [L.LADUNGSSERIE]: 3 }, lightning: light(), winStreak: 7 }), noCrit);
    expect(epic.lightning.charge).toBe(1);
  });
  it("Dauerstrom / Statische Aufladung: Ladung aus Serie bzw. Siegen ohne Crit, Niederlagen-Ladung ab Sehr selten", () => {
    expect(resolveTrick(scen(12, 0, { skills: [L.DAUERSTROM], lightning: light(), winStreak: T.dauerstrom[0].minStreak - 1 }), noCrit).lightning.charge).toBe(1);
    expect(resolveTrick(scen(12, 0, { skills: [L.DAUERSTROM], lightning: light(), winStreak: T.dauerstrom[0].minStreak - 2 }), noCrit).lightning.charge).toBe(0);
    expect(resolveTrick(scen(12, 0, { skills: [L.STATIK], lightning: light({ nonCritWins: 1 }) }), noCrit).lightning.charge).toBe(1);
    expect(resolveTrick(scen(12, 0, { skills: [L.STATIK], skillTiers: { [L.STATIK]: 3 }, lightning: light() }), noCrit).lightning.charge).toBe(T.statik[3].charge);
    expect(resolveTrick(scen(0, 12, { skills: [L.STATIK], skillTiers: { [L.STATIK]: 2 }, lightning: light({ lossCount: 1 }) }), noCrit).lightning.charge).toBe(1);
  });
  it("Kettenblitz Selten: jede volle Leiste ionisiert die nächste UND eine weitere Karte", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.KETTENBLITZ], skillTiers: { [L.KETTENBLITZ]: 1 }, lightning: light({ charge: 9 }) }), zero);
    expect(s.deck[1].ionStacks).toBe(1); expect(s.deck[2].ionStacks).toBe(1); expect(s.deck[3].ionStacks || 0).toBe(0);
    expect(s.ionTotal).toBe(2);
  });
  it("Blitzschlag Episch: jeder 2. Crit ionisiert die Siegkarte", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.BLITZSCHLAG], skillTiers: { [L.BLITZSCHLAG]: 3 }, lightning: light({ critCount: 1 }) }), zero);
    expect(s.deck[0].ionStacks).toBe(1);
    const first = resolveTrick(scen(12, 0, { skills: [L.BLITZSCHLAG], skillTiers: { [L.BLITZSCHLAG]: 3 }, lightning: light() }), zero);
    expect(first.deck[0].ionStacks || 0).toBe(0);
  });
  it("Spannungsstau: Sieg ohne Crit rampt, Crit leert (Episch halbiert)", () => {
    expect(resolveTrick(scen(12, 0, { skills: [L.SPANNUNGSSTAU], lightning: light() }), noCrit).lightning.stauBonus).toBeCloseTo(T.stau[0].step, 9);
    expect(resolveTrick(scen(12, 0, { skills: [L.SPANNUNGSSTAU], lightning: light({ stauBonus: 0.3 }) }), zero).lightning.stauBonus).toBe(0);
    expect(resolveTrick(scen(12, 0, { skills: [L.SPANNUNGSSTAU], skillTiers: { [L.SPANNUNGSSTAU]: 3 }, lightning: light({ stauBonus: 0.3 }) }), zero).lightning.stauBonus).toBeCloseTo(0.15, 9);
  });
  it("Überschuss über 100 %: Systemregel (klein) plus Überschlag (Zustand) heben den Crit-Multiplikator", () => {
    const rule = resolveTrick(scen(12, 0, { lightning: light({ stauBonus: 1.5 }) }), zero); // rawCrit 1,5 → 50 Punkte
    expect(rule.lastTrick.isCrit).toBe(true);
    expect(rule.lastTrick.critMultiplier).toBeCloseTo(M + 50 * C.OVERCRIT_MULT_PER_PP, 6);
    const arc = resolveTrick(scen(12, 0, { skills: [L.UEBERSCHLAG], lightning: light({ stauBonus: 1.5 }) }), zero); // 0,05 + 1,5 → 55 Punkte
    expect(arc.lastTrick.critMultiplier).toBeCloseTo(M + 55 * C.OVERCRIT_MULT_PER_PP + 5 * T.ueberschlag[0].multPer10, 6);
  });
  it("Serienschutz: Niederlage ab 70 % Ladung hält die Serie und kostet sie; Episch einmal je Runde gratis, Rundenende gibt es frei", () => {
    const cost = Math.ceil(C.LIGHTNING_MAX_CHARGE * T.serienschutz[0].frac);
    const held = resolveTrick(scen(0, 12, { skills: [L.SERIENSCHUTZ], winStreak: 4, lightning: light({ charge: cost + 1 }) }), noCrit);
    expect(held.lastTrick.result).toBe("loss");
    expect(held.winStreak).toBe(4);
    expect(held.lightning.charge).toBe(1);
    const broke = resolveTrick(scen(0, 12, { skills: [L.SERIENSCHUTZ], winStreak: 4, lightning: light({ charge: cost - 1 }) }), noCrit);
    expect(broke.winStreak).toBe(0);
    const free = resolveTrick(scen(0, 12, { skills: [L.SERIENSCHUTZ], skillTiers: { [L.SERIENSCHUTZ]: 3 }, winStreak: 4, lightning: light() }), noCrit);
    expect(free.winStreak).toBe(4);
    expect(free.lightning.serienschutzFree).toBe(true);
    const spent = resolveTrick({ ...free, phase: "play" }, noCrit);
    expect(spent.winStreak).toBe(0);
    const endOfRound = resolveTrick(scen(0, 12, { pos: 39, skills: [L.SERIENSCHUTZ], skillTiers: { [L.SERIENSCHUTZ]: 3 }, winStreak: 4, lightning: light() }), noCrit);
    expect(endOfRound.winStreak).toBe(4);
    expect(endOfRound.lightning.serienschutzFree).toBe(false);
  });
  it("volle Leiste zündet auch auf einer Niederlage (Statische Aufladung Sehr selten)", () => {
    const s = resolveTrick(scen(0, 12, { skills: [L.STATIK], skillTiers: { [L.STATIK]: 2 }, lightning: light({ charge: 9, lossCount: 1 }) }), noCrit);
    expect(s.lightning.charge).toBe(0);
    expect(s.lightning.bars).toBe(1);
    expect(s.deck[1].ionStacks).toBe(1);
  });
  it("Donnergott: Leiste bei 7 voll, dauerhaft +0,4× Crit-Multiplikator; maxCharge folgt dem Build", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.DONNERGOTT], lightning: light({ charge: 6 }) }), zero);
    expect(s.lightning.maxCharge).toBe(C.DONNERGOTT_MAX_CHARGE);
    expect(s.lightning.bars).toBe(1);
    expect(s.lightning.charge).toBe(0);
    expect(s.deck[1].ionStacks).toBe(1);
    expect(s.lastTrick.critMultiplier).toBeCloseTo(M + C.THUNDER_CRIT_MULT, 6);
  });
  it("Doppelentladung: 2 Stapel je Ionisierung; Crit mit ionisierter Karte zählt den Stich doppelt", () => {
    const s = resolveTrick(scen(12, 0, { deck: withStacks(12, 0, 1), skills: [L.DOPPELENTLADUNG], lightning: light({ charge: 9 }) }), zero);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.breakdown.strikeMult).toBe(C.DOPPELENTLADUNG_STRIKE);
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + C.ION_SCORE_PER_STACK) * 1.02 * M * C.DOPPELENTLADUNG_STRIKE, 6);
    expect(s.deck[1].ionStacks).toBe(C.DOPPELENTLADUNG_STACKS);
    const plain = resolveTrick(scen(12, 0, { skills: [L.DOPPELENTLADUNG], lightning: light() }), zero); // nicht ionisiert → kein Doppelschlag
    expect(plain.lastTrick.breakdown.strikeMult).toBe(1);
  });
  it("Hochspannung: gehaltene Blitz-Skills wirken eine Stufe höher (Blitzfänger Normal greift ab der Selten-Schwelle)", () => {
    const min = T.faenger[1].minStacks;
    const win = resolveTrick(scen(10, 11, { deck: withStacks(10, 0, min), skills: [L.BLITZFAENGER, L.HOCHSPANNUNG], lightning: light() }), noCrit);
    expect(win.lastTrick.result).toBe("win");
    const loss = resolveTrick(scen(10, 11, { deck: withStacks(10, 0, min), skills: [L.BLITZFAENGER], lightning: light() }), noCrit);
    expect(loss.lastTrick.result).toBe("loss");
  });
  it("Durchschlag: ein Crit auf einer Niederlage gewinnt den Stich als voller Crit-Sieg", () => {
    const s = resolveTrick(scen(0, 12, { skills: [L.DURCHSCHLAG], lightning: light(), winStreak: 3 }), zero);
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.durchschlag).toBe(true);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.wins).toBe(1); expect(s.losses).toBe(0); expect(s.winStreak).toBe(4);
    expect(s.lightning.charge).toBe(1); // Passiv-Ladung wie bei jedem Crit
    expect(s.lastTrick.scoreGain).toBeGreaterThan(0);
    const miss = resolveTrick(scen(0, 12, { skills: [L.DURCHSCHLAG], lightning: light(), winStreak: 3 }), noCrit);
    expect(miss.lastTrick.result).toBe("loss");
    expect(miss.winStreak).toBe(0);
  });
  it("kein Direkt-Score aus Blitz: lightDirect bleibt 0", () => {
    const s = resolveTrick(scen(12, 0, { deck: withStacks(12, 0, 9), skills: [L.KURZSCHLUSS, L.DOPPELENTLADUNG], lightning: light() }), zero);
    expect(s.lastTrick.breakdown.lightDirect).toBe(0);
  });
});
