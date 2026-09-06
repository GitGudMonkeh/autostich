import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, BLITZ_TIERS } from "../src/game/skills.js";
import { initLightning, L, maxChargeFor, effectiveTier, lightParam, lightningCritChance, lightningCritMult, overcritMult,
  blitzfaengerValue, ionenfeldValue, fieldTick, ionScoreFor, ionCritMultFor, chargeGainOnWin, critFillsBar, blitzschlagStacks, stauAfterWin,
  lightningOnLoss, fillBar, lightningCycleEnd } from "../src/game/factions/lightning.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";

/* Blitz — exp skill rework (docs/skill-rework.md §3): Passiv, 14 Skills mit vier Stufen (§7.19), 4 Legendäre. Erst die reinen
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
const LIGHTNING_IDS = [ // §7.18: 08 (Statische Aufladung) und 16 (Dauerstrom) in Blitzableiter aufgegangen; 02 Ionenfeld und 12 Vorentladung neu; §7.19: 14 (Überschlag) gestrichen
  "SK_LIGHTNING_01", "SK_LIGHTNING_02", "SK_LIGHTNING_03", "SK_LIGHTNING_04", "SK_LIGHTNING_05", "SK_LIGHTNING_06", "SK_LIGHTNING_07",
  "SK_LIGHTNING_09", "SK_LIGHTNING_10", "SK_LIGHTNING_11", "SK_LIGHTNING_12", "SK_LIGHTNING_13",
  "SK_LIGHTNING_15", "SK_LIGHTNING_17",
  "SK_LIGHTNING_L01", "SK_LIGHTNING_L02", "SK_LIGHTNING_L03", "SK_LIGHTNING_L04",
];

describe("Blitz-Modul — Stufen und Kennwerte", () => {
  it("L nennt genau die 18 registrierten Blitz-Skills (14 + 4 Legendäre)", () => {
    const ids = Object.values(L);
    expect(ids).toHaveLength(18);
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
  it("maxChargeFor: Leiste 10, mit Donnergott 7, mit Reststrom Episch 9 (§7.22 Extra; Donnergott gewinnt)", () => {
    expect(maxChargeFor([])).toBe(C.LIGHTNING_MAX_CHARGE);
    expect(maxChargeFor([L.DONNERGOTT])).toBe(C.DONNERGOTT_MAX_CHARGE);
    expect(C.DONNERGOTT_MAX_CHARGE).toBeLessThan(C.LIGHTNING_MAX_CHARGE);
    expect(maxChargeFor([L.RESTSTROM], { [L.RESTSTROM]: 3 })).toBe(T.reststrom[3].bar);
    expect(T.reststrom[3].bar).toBeLessThan(C.LIGHTNING_MAX_CHARGE);
    expect(maxChargeFor([L.RESTSTROM], { [L.RESTSTROM]: 2 })).toBe(C.LIGHTNING_MAX_CHARGE);
    expect(maxChargeFor([L.RESTSTROM, L.HOCHSPANNUNG], { [L.RESTSTROM]: 2 })).toBe(T.reststrom[3].bar); // Hochspannung hebt auf Episch
    expect(maxChargeFor([L.RESTSTROM, L.DONNERGOTT], { [L.RESTSTROM]: 3 })).toBe(C.DONNERGOTT_MAX_CHARGE);
  });
  it("lightningCritChance: +Crit je Blitz-Skill (auch Legendäre), Gewitterfront-Rampe additiv, Ladungsserie je Serienpunkt; der Stau zählt nicht mehr hier (§7.18)", () => {
    expect(lightningCritChance(initLightning(), [L.ABLEITER], {})).toBe(0); // inaktiv
    expect(lightningCritChance(light(), [L.ABLEITER, L.RESTSTROM], {})).toBeCloseTo(2 * C.LIGHTNING_CRIT_PER_SKILL, 9);
    expect(lightningCritChance(light(), [L.DONNERGOTT], {})).toBeCloseTo(C.LIGHTNING_CRIT_PER_SKILL, 9);
    expect(lightningCritChance(light({ stormCritBonus: 0.2, stauBonus: 0.1 }), [], {})).toBeCloseTo(0.2, 9);
    expect(lightningCritChance(light(), [L.LADUNGSSERIE], {}, 10)).toBeCloseTo(C.LIGHTNING_CRIT_PER_SKILL + 10 * T.serie[0].critPerStreak, 9);
    expect(lightningCritChance(light(), [L.LADUNGSSERIE], { [L.LADUNGSSERIE]: 3 }, 20)).toBeCloseTo(C.LIGHTNING_CRIT_PER_SKILL + 20 * T.serie[3].critPerStreak, 9);
    expect(lightningCritChance(light(), [L.LADUNGSSERIE], {}, 0)).toBeCloseTo(C.LIGHTNING_CRIT_PER_SKILL, 9); // ohne Serie kein Bonus
  });
  it("lightningCritMult: Entladung-Rampe + Spannungsstau + Vorentladung ab der Serie (§7.19: Überschlag gestrichen; §7.20: Donnergott zahlt über die Stapel, nicht flach)", () => {
    expect(lightningCritMult(initLightning(), [L.DONNERGOTT], {})).toBe(0);
    expect(lightningCritMult(light({ entladungMult: 0.3 }), [L.DONNERGOTT], {})).toBeCloseTo(0.3, 9);
    expect(lightningCritMult(light({ stauBonus: 0.25 }), [], {})).toBeCloseTo(0.25, 9); // §7.18: der Spannungsstau zahlt hier
    const vMin = T.vorentladung[0].minStreak;
    expect(lightningCritMult(light(), [L.VORENTLADUNG], {}, vMin)).toBeCloseTo(vMin * T.vorentladung[0].multPerStreak, 9);
    expect(lightningCritMult(light(), [L.VORENTLADUNG], {}, vMin - 1)).toBe(0);
    expect(lightningCritMult(light(), [L.VORENTLADUNG], { [L.VORENTLADUNG]: 3 }, 10)).toBeCloseTo(10 * T.vorentladung[3].multPerStreak, 9);
    expect(lightningCritMult(light(), [], {}, 10)).toBe(0); // ohne Vorentladung zählt die Serie hier nicht
    expect(L.UEBERSCHLAG).toBeUndefined(); expect(T.ueberschlag).toBeUndefined(); // §7.19
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
      expect(blitzfaengerValue([L.BLITZFAENGER], { [L.BLITZFAENGER]: t }, { ionStacks: min })).toBe(T.faenger[t].value + (T.faenger[t].perStack || 0) * min);
      expect(blitzfaengerValue([L.BLITZFAENGER], { [L.BLITZFAENGER]: t }, { ionStacks: min - 1 })).toBe(0);
    }
    expect(blitzfaengerValue([L.BLITZFAENGER], { [L.BLITZFAENGER]: 3 }, { ionStacks: 5 })).toBe(T.faenger[3].value + 5 * T.faenger[3].perStack); // §7.22 Episch-Extra: +1 je Stapel
    expect(blitzfaengerValue([L.BLITZFAENGER], { [L.BLITZFAENGER]: 2 }, { ionStacks: 5 })).toBe(T.faenger[2].value);
    expect(blitzfaengerValue([], {}, { ionStacks: 99 })).toBe(0);
    expect(T.faenger.every((r) => r.minStacks === 1)).toBe(true); // §7.18: ohne Schwelle — jede ionisierte Karte
    expect(ionScoreFor({ ionStacks: 3 })).toBe(3 * C.ION_SCORE_PER_STACK);
    expect(ionScoreFor({})).toBe(0);
    expect(ionScoreFor(null)).toBe(0);
    const min = T.kurzschluss[0].minStacks;
    expect(ionScoreFor({ ionStacks: min }, [L.KURZSCHLUSS], {})).toBe(min * C.ION_SCORE_PER_STACK * T.kurzschluss[0].factor);
    expect(ionScoreFor({ ionStacks: min - 1 }, [L.KURZSCHLUSS], {})).toBe((min - 1) * C.ION_SCORE_PER_STACK);
  });
  it("ionenfeldValue / fieldTick (§7.18): +Wert der Stufe, solange das Feld trägt; der Tick zählt je Stich herunter", () => {
    expect(ionenfeldValue(light({ fieldLeft: 3 }), [L.IONENFELD], {})).toBe(T.ionenfeld[0].value);
    expect(ionenfeldValue(light({ fieldLeft: 3 }), [L.IONENFELD], { [L.IONENFELD]: 3 })).toBe(T.ionenfeld[3].value);
    expect(ionenfeldValue(light({ fieldLeft: 0 }), [L.IONENFELD], {})).toBe(0);
    expect(ionenfeldValue(light({ fieldLeft: 3 }), [], {})).toBe(0);
    expect(ionenfeldValue(initLightning(), [L.IONENFELD], {})).toBe(0);
    expect(fieldTick(light({ fieldLeft: 2 })).fieldLeft).toBe(1);
    const l = light({ fieldLeft: 0 });
    expect(fieldTick(l)).toBe(l);
  });
});

describe("Blitz-Modul — Ladung, Leiste, Niederlage (reine Übergänge)", () => {
  it("chargeGainOnWin: Crit +1 Passiv; Blitzableiter Normal jeder 2. Crit, Sehr selten jeder; Überspannung (§7.24) macht den Überschuss über dem Deckel zu Ladung; immutabel", () => {
    const l = light();
    const a = chargeGainOnWin(l, [], {}, { isCrit: true });
    expect(a.gain).toBe(1); expect(a.next.critCount).toBe(1); expect(l.critCount).toBe(0);
    expect(chargeGainOnWin(light(), [L.ABLEITER], {}, { isCrit: true }).gain).toBe(1);                          // 1. Crit: noch nichts extra
    expect(chargeGainOnWin(light({ critCount: 1 }), [L.ABLEITER], {}, { isCrit: true }).gain).toBe(2);          // 2. Crit: +1
    expect(chargeGainOnWin(light(), [L.ABLEITER], { [L.ABLEITER]: 2 }, { isCrit: true }).gain).toBe(2);        // Sehr selten: jeder Crit
    // §7.24 Überspannung: je perOver× über dem Deckel +1 Ladung, darunter nichts; Episch dazu je chancePer Crit-Chance über 100 %.
    const cap = C.CRIT_MULT_CAP, uv = [L.UEBERSPANNUNG];
    expect(chargeGainOnWin(light(), uv, {}, { isCrit: true, critMultRaw: cap + 2 * T.ueberspannung[0].perOver }).gain).toBe(3);
    expect(chargeGainOnWin(light(), uv, {}, { isCrit: true, critMultRaw: cap + T.ueberspannung[0].perOver - 0.5 }).gain).toBe(1);
    expect(chargeGainOnWin(light(), uv, {}, { isCrit: true, critMultRaw: cap - 1 }).gain).toBe(1);
    expect(chargeGainOnWin(light(), uv, {}, { isCrit: true }).gain).toBe(1); // Vorschau ohne Multiplikator: nur das Passiv
    expect(chargeGainOnWin(light(), uv, { [L.UEBERSPANNUNG]: 3 }, { isCrit: true, critMultRaw: cap + 3, rawCrit: 1.6 }).gain).toBe(1 + 3 + 2);
    expect(chargeGainOnWin(light(), uv, { [L.UEBERSPANNUNG]: 2 }, { isCrit: true, critMultRaw: cap + 3, rawCrit: 1.6 }).gain).toBe(1 + 1); // Sehr selten: je 2×, kein Chance-Extra
    expect(chargeGainOnWin(light(), uv, { [L.UEBERSPANNUNG]: 3 }, { isCrit: false, critMultRaw: cap + 3, rawCrit: 1.6 }).gain).toBe(0); // ohne Crit nichts
    expect(T.ueberspannung.every((r) => r.value == null && r.perOver > 0)).toBe(true);
    expect(T.ueberspannung[3].chancePer).toBe(0.25);
  });
  it("chargeGainOnWin ohne Crit (§7.18): Blitzableiter Episch +1 je Sieg ohne Crit, darunter nichts; Ladungsserie Episch ab Serie 8", () => {
    expect(chargeGainOnWin(light(), [L.ABLEITER], {}, { isCrit: false }).gain).toBe(0);
    expect(chargeGainOnWin(light(), [L.ABLEITER], { [L.ABLEITER]: 2 }, { isCrit: false }).gain).toBe(0);
    expect(chargeGainOnWin(light(), [L.ABLEITER], { [L.ABLEITER]: 3 }, { isCrit: false }).gain).toBe(T.ableiter[3].noCritCharge);
    expect(chargeGainOnWin(light(), [L.ABLEITER], { [L.ABLEITER]: 3 }, { isCrit: true }).gain).toBe(2); // Crit: Passiv + jeder Crit
    expect(chargeGainOnWin(light(), [L.LADUNGSSERIE], { [L.LADUNGSSERIE]: 3 }, { isCrit: false, streak: 8 }).gain).toBe(1);
    expect(chargeGainOnWin(light(), [L.LADUNGSSERIE], { [L.LADUNGSSERIE]: 2 }, { isCrit: false, streak: 8 }).gain).toBe(0); // nur Episch
  });
  it("critFillsBar: Vorschau auf denselben Gewinn wie der echte Crit", () => {
    expect(critFillsBar(light({ charge: 9 }), [], {})).toBe(true);
    expect(critFillsBar(light({ charge: 8 }), [], {})).toBe(false);
    expect(critFillsBar(light({ charge: 8 }), [L.ABLEITER], { [L.ABLEITER]: 2 })).toBe(true); // +1 Passiv +1 Blitzableiter (Sehr selten: jeder Crit)
    expect(critFillsBar(light({ charge: 6 }), [L.DONNERGOTT], {})).toBe(true);                // Leiste 7
    expect(critFillsBar(initLightning(), [], {})).toBe(false);
  });
  it("blitzschlagStacks: jeder N. Crit (Zähler nach dem Crit), Doppelentladung 2 Stapel", () => {
    const n = T.blitzschlag[0].critEvery;
    expect(blitzschlagStacks(light({ critCount: n }), [L.BLITZSCHLAG], {})).toBe(1);
    expect(blitzschlagStacks(light({ critCount: n - 1 }), [L.BLITZSCHLAG], {})).toBe(0);
    expect(blitzschlagStacks(light({ critCount: 2 }), [L.BLITZSCHLAG, L.DOPPELENTLADUNG], { [L.BLITZSCHLAG]: 3 })).toBe(T.blitzschlag[3].stacks * C.DOPPELENTLADUNG_STACKS); // §7.18: Episch zwei Stapel, Doppelentladung verdoppelt
    expect(blitzschlagStacks(light({ critCount: 5 }), [], {})).toBe(0);
  });
  it("stauAfterWin: ohne Crit +Schritt, Crit leert (Episch halbiert); ohne Skill unberührt (der Reducer leert beim Ersetzen)", () => {
    expect(stauAfterWin(light(), [L.SPANNUNGSSTAU], {}, false).stauBonus).toBeCloseTo(T.stau[0].step, 9);
    expect(stauAfterWin(light({ stauBonus: 0.3 }), [L.SPANNUNGSSTAU], {}, true).stauBonus).toBe(0);
    expect(stauAfterWin(light({ stauBonus: 0.3 }), [L.SPANNUNGSSTAU], { [L.SPANNUNGSSTAU]: 3 }, true).stauBonus).toBeCloseTo(0.15, 9);
    const l = light({ stauBonus: 0.3 });
    expect(stauAfterWin(l, [], {}, false)).toBe(l);
  });
  it("lightningOnLoss: Serienschutz ab dem Anteil der Stufe, kostet ihn; Episch einmal je Runde gratis", () => {
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
    expect(lightningOnLoss(light({ charge: 4 }), [L.ABLEITER], { [L.ABLEITER]: 3 }).lightning.charge).toBe(4); // §7.18: keine Niederlagen-Ladung mehr
    expect(lightningOnLoss(initLightning(), [L.SERIENSCHUTZ], {}).streakHeld).toBe(false);
    // §7.22 Kurzschluss Episch-Extra: verliert eine Karte ab der Schwelle, ist ihr doppelter Stapel-Score vorgemerkt; darunter und auf Normal nicht.
    const ksMin = T.kurzschluss[3].minStacks;
    const bank = lightningOnLoss(light(), [L.KURZSCHLUSS], { [L.KURZSCHLUSS]: 3 }, { card: { ionStacks: ksMin } }).lightning.stackBank;
    expect(bank).toBe(ksMin * C.ION_SCORE_PER_STACK * T.kurzschluss[3].factor);
    expect(lightningOnLoss(light({ stackBank: bank }), [L.KURZSCHLUSS], { [L.KURZSCHLUSS]: 3 }, { card: { ionStacks: ksMin } }).lightning.stackBank).toBe(2 * bank); // stapelt sich
    expect(lightningOnLoss(light(), [L.KURZSCHLUSS], { [L.KURZSCHLUSS]: 3 }, { card: { ionStacks: ksMin - 1 } }).lightning.stackBank || 0).toBe(0);
    expect(lightningOnLoss(light(), [L.KURZSCHLUSS], {}, { card: { ionStacks: 9 } }).lightning.stackBank || 0).toBe(0);
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
  it("fillBar: Reststrom-Boden, Blitzableiter-Rückgabe, Überschuss verfällt (§7.18 auch auf Episch); Rampen ohne Deckel", () => {
    const deck = constDeck(5), order = identity();
    expect(fillBar(light({ charge: 10 }), [L.RESTSTROM], { [L.RESTSTROM]: 1 }, deck, order, 0).lightning.charge).toBe(T.reststrom[1].floor);
    expect(fillBar(light({ charge: 10 }), [L.ABLEITER, L.RESTSTROM], { [L.ABLEITER]: 2, [L.RESTSTROM]: 0 }, deck, order, 0).lightning.charge)
      .toBe(T.reststrom[0].floor + T.ableiter[2].back);
    expect(fillBar(light({ charge: 13 }), [L.ABLEITER], { [L.ABLEITER]: 3 }, deck, order, 0).lightning.charge).toBe(T.ableiter[3].back);
    expect(fillBar(light({ charge: 13 }), [L.ABLEITER], { [L.ABLEITER]: 2 }, deck, order, 0).lightning.charge).toBe(T.ableiter[2].back); // Überschuss verfällt
    const ramps = fillBar(light({ charge: 10, stormCritBonus: 0.5, entladungMult: 2 }), [L.GEWITTERFRONT, L.ENTLADUNG], {}, deck, order, 0).lightning;
    expect(ramps.stormCritBonus).toBeCloseTo(0.5 + T.gewitter[0].critPerBar, 9);
    expect(ramps.entladungMult).toBeCloseTo(2 + T.entladung[0].multPerBar, 9);
    // §7.22 Episch-Extras: Gewitterfront Episch rampt auch den Crit-Multiplikator; Reststrom Episch macht die Leiste bei 9 voll.
    expect(fillBar(light({ charge: 10 }), [L.GEWITTERFRONT], { [L.GEWITTERFRONT]: 3 }, deck, order, 0).lightning.entladungMult).toBeCloseTo(T.gewitter[3].multPerBar, 9);
    expect(fillBar(light({ charge: 10 }), [L.GEWITTERFRONT], { [L.GEWITTERFRONT]: 2 }, deck, order, 0).lightning.entladungMult).toBe(0);
    expect(fillBar(light({ charge: T.reststrom[3].bar }), [L.RESTSTROM], { [L.RESTSTROM]: 3 }, deck, order, 0).filled).toBe(true);
    expect(fillBar(light({ charge: T.reststrom[3].bar }), [L.RESTSTROM], { [L.RESTSTROM]: 2 }, deck, order, 0).filled).toBe(false);
  });
  it("fillBar: Kettenblitz vertieft (§7.18 Tiefe, §7.19 jede Leiste: die Karte mit den meisten Stapeln +Stapel der Stufe), Überspannung backt den Dauerwert, Doppelentladung 2 Stapel, Ionenfeld lädt das Feld", () => {
    const deck = constDeck(5), order = identity();
    expect(T.kette.every((r) => r.barEvery === 1)).toBe(true); // §7.19: jede Leiste, auch Normal
    const first = fillBar(light({ charge: 10, bars: 0 }), [L.KETTENBLITZ], {}, deck, order, 0); // schon die 1. Leiste: +Stapel auf die tiefste (die eben ionisierte)
    expect(first.stacks).toBe(1 + T.kette[0].extra); expect(first.deck[1].ionStacks).toBe(1 + T.kette[0].extra); expect(first.targets).toEqual([1]);
    const deepDeck = withStacks(5, 7, 3); // Karte 7 ist die tiefste → sie bekommt die Stapel der Stufe, die nächste Karte nur ihren einen
    const deep = fillBar(light({ charge: 10 }), [L.KETTENBLITZ], { [L.KETTENBLITZ]: 3 }, deepDeck, order, 0); // Episch (§7.22): die zweittiefste — hier die eben ionisierte — bekommt +1
    expect(deep.deck[1].ionStacks).toBe(1 + T.kette[3].second); expect(deep.deck[7].ionStacks).toBe(3 + T.kette[3].extra); expect(deep.stacks).toBe(1 + T.kette[3].extra + T.kette[3].second);
    expect(deep.targets).toEqual([1, 7]);
    const deepX = fillBar(light({ charge: 10 }), [L.KETTENBLITZ], { [L.KETTENBLITZ]: 2 }, deepDeck, order, 0); // Sehr selten: kein zweiter Empfänger
    expect(deepX.deck[1].ionStacks).toBe(1); expect(deepX.stacks).toBe(1 + T.kette[2].extra);
    expect(deepDeck[7].ionStacks).toBe(3); // Original unverändert
    // §7.24 (Owner): der Dauerwert je Leiste ist Passiv (ION_VALUE_PER_BAR), nicht mehr Überspannung — die ionisierte Karte trägt ihn, egal welche Skills.
    const uv = fillBar(light({ charge: 10 }), [L.UEBERSPANNUNG], { [L.UEBERSPANNUNG]: 3 }, deck, order, 0);
    expect(uv.deck[1].value).toBe(5 + C.ION_VALUE_PER_BAR); expect(uv.deck[1].ionStacks).toBe(1); expect(uv.deck[0].value).toBe(5);
    expect(fillBar(light({ charge: 10 }), [], {}, deck, order, 0).deck[1].value).toBe(5 + C.ION_VALUE_PER_BAR); // auch ohne Skill
    expect(C.ION_VALUE_PER_BAR).toBeGreaterThan(0);
    expect(deck[1].value).toBe(5); // Original unverändert
    const dbl = fillBar(light({ charge: 10 }), [L.DOPPELENTLADUNG], {}, deck, order, 0);
    expect(dbl.deck[1].ionStacks).toBe(C.DOPPELENTLADUNG_STACKS);
    expect(fillBar(light({ charge: 10 }), [L.IONENFELD], {}, deck, order, 0).lightning.fieldLeft).toBe(T.ionenfeld[0].tricks);
    expect(fillBar(light({ charge: 10 }), [L.IONENFELD], { [L.IONENFELD]: 3 }, deck, order, 0).lightning.fieldLeft).toBe(T.ionenfeld[3].tricks);
    expect(fillBar(light({ charge: 10, fieldLeft: 2 }), [], {}, deck, order, 0).lightning.fieldLeft).toBe(2); // ohne Ionenfeld unberührt
  });
  it("lightningCycleEnd: Gratis-Serienschutz wird je Runde wieder frei", () => {
    expect(lightningCycleEnd(light({ serienschutzFree: true })).serienschutzFree).toBe(false);
    const l = light();
    expect(lightningCycleEnd(l)).toBe(l);
    expect(lightningCycleEnd(null)).toBeNull();
  });
});

describe("Blitz — Engine-Integration (resolveTrick)", () => {
  it("Blitzfänger (§7.18): eine ionisierte Karte kämpft mit +Wert der Stufe (Selten +2) und gewinnt den knappen Stich; ohne Stapel nicht", () => {
    const win = resolveTrick(scen(10, 11, { deck: withStacks(10, 0, 1), skills: [L.BLITZFAENGER], skillTiers: { [L.BLITZFAENGER]: 1 }, lightning: light() }), noCrit);
    expect(win.lastTrick.result).toBe("win");
    expect(win.lastTrick.pValue).toBe(10 + T.faenger[1].value);
    const loss = resolveTrick(scen(10, 11, { deck: withStacks(10, 0, 0), skills: [L.BLITZFAENGER], skillTiers: { [L.BLITZFAENGER]: 1 }, lightning: light() }), noCrit);
    expect(loss.lastTrick.result).toBe("loss");
  });
  it("Kurzschluss: Stapel der Siegkarte zählen ab Schwelle doppelt — in der Basis", () => {
    const min = T.kurzschluss[0].minStacks;
    const s = resolveTrick(scen(12, 0, { deck: withStacks(12, 0, min), skills: [L.KURZSCHLUSS], lightning: light() }), noCrit);
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + min * C.ION_SCORE_PER_STACK * 2) * 1.02, 6);
    expect(s.lightYield).toBeCloseTo(min * C.ION_SCORE_PER_STACK * 2, 6);
  });
  it("Kurzschluss Episch (§7.22): die verlorene Karte ab Schwelle merkt ihren doppelten Stapel-Score vor, der nächste Sieg zahlt ihn in die Basis", () => {
    const tiers = { [L.KURZSCHLUSS]: 3 }, min = T.kurzschluss[3].minStacks;
    const loss = resolveTrick(scen(0, 12, { deck: withStacks(0, 0, min), skills: [L.KURZSCHLUSS], skillTiers: tiers, lightning: light() }), noCrit);
    expect(loss.lastTrick.result).toBe("loss");
    const bank = min * C.ION_SCORE_PER_STACK * T.kurzschluss[3].factor;
    expect(loss.lightning.stackBank).toBe(bank);
    const win = resolveTrick(scen(12, 0, { skills: [L.KURZSCHLUSS], skillTiers: tiers, lightning: light({ stackBank: bank }) }), noCrit);
    expect(win.lastTrick.scoreGain).toBeCloseTo((B + bank) * 1.02, 6);
    expect(win.lightning.stackBank).toBe(0);
    expect(win.lightYield).toBeCloseTo(bank, 6);
  });
  it("Überspannung (§7.24): der Überschuss des Crits über dem Deckel wird Ladung, Episch auch die Crit-Chance über 100 %; kein Dauerwert mehr", () => {
    // Vorentladung Normal ab Serie 5 +0,1× je Serienpunkt: Serie 100 nach dem Sieg → 2,25 + 10 = 12,25× roh, gedeckelt 8 → Überschuss 4,25.
    const excess = C.CRIT_BASE_MULT + 100 * T.vorentladung[0].multPerStreak - C.CRIT_MULT_CAP;
    expect(excess).toBeGreaterThan(T.ueberspannung[0].perOver);
    const over = resolveTrick(scen(12, 0, { skills: [L.UEBERSPANNUNG, L.VORENTLADUNG], winStreak: 99, lightning: light() }), zero);
    expect(over.lastTrick.isCrit).toBe(true); expect(over.lastTrick.critMultiplier).toBe(C.CRIT_MULT_CAP);
    expect(over.lightning.charge).toBe(1 + Math.floor(excess / T.ueberspannung[0].perOver));
    // Episch: je 1× über dem Deckel und je 25 % Crit-Chance über 100 % (Gewitterfront-Rampe 1,5 im Substate → roh 0,08 + 1,5).
    const epic = resolveTrick(scen(12, 0, { skills: [L.UEBERSPANNUNG, L.VORENTLADUNG], skillTiers: { [L.UEBERSPANNUNG]: 3 }, winStreak: 99, lightning: light({ stormCritBonus: 1.5 }) }), zero);
    const rawCrit = 2 * C.LIGHTNING_CRIT_PER_SKILL + 1.5;
    const excessE = excess + (rawCrit - 1) * 100 * C.OVERCRIT_MULT_PER_PP; // die Systemregel hebt den rohen Multiplikator noch leicht
    expect(epic.lightning.charge).toBe(1 + Math.floor(excessE / T.ueberspannung[3].perOver) + Math.floor((rawCrit - 1) / T.ueberspannung[3].chancePer));
    const under = resolveTrick(scen(12, 0, { skills: [L.UEBERSPANNUNG], lightning: light() }), zero); // Crit unter dem Deckel: nur das Passiv
    expect(under.lastTrick.isCrit).toBe(true); expect(under.lightning.charge).toBe(1);
    const bar = resolveTrick(scen(12, 0, { skills: [L.UEBERSPANNUNG], lightning: light({ charge: 9 }) }), zero);
    expect(bar.lightning.bars).toBe(1); expect(bar.deck[1].ionStacks).toBe(1); expect(bar.deck[1].value).toBe(12 + C.ION_VALUE_PER_BAR); // der Dauerwert ist jetzt Passiv, nicht Überspannung
  });
  it("Reststrom Selten + Blitzableiter Sehr selten: volle Leiste → Boden 3 + 1 zurück", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.ABLEITER, L.RESTSTROM], skillTiers: { [L.ABLEITER]: 2, [L.RESTSTROM]: 1 }, lightning: light({ charge: 8 }) }), zero);
    expect(s.lightning.bars).toBe(1);
    expect(s.lightning.charge).toBe(T.reststrom[1].floor + T.ableiter[2].back);
  });
  it("Blitzableiter Episch (§7.18): jeder Sieg ohne Crit gibt +1 Ladung; Überschuss über der Leiste verfällt", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.ABLEITER], skillTiers: { [L.ABLEITER]: 3 }, lightning: light() }), noCrit);
    expect(s.lightning.charge).toBe(T.ableiter[3].noCritCharge);
    const over = resolveTrick(scen(12, 0, { skills: [L.ABLEITER], skillTiers: { [L.ABLEITER]: 3 }, lightning: light({ charge: 9 }) }), zero); // 9 + 2 = 11 → voll, der Rest verfällt
    expect(over.lightning.bars).toBe(1);
    expect(over.lightning.charge).toBe(T.ableiter[3].back);
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
  it("Ionenfeld (§7.18): die volle Leiste lädt das Feld, die nächsten Stiche kämpfen alle Karten mit +Wert, danach nicht mehr", () => {
    const charged = resolveTrick(scen(12, 0, { skills: [L.IONENFELD], lightning: light({ charge: 9 }) }), zero);
    expect(charged.lightning.bars).toBe(1); expect(charged.lightning.fieldLeft).toBe(T.ionenfeld[0].tricks); // der ladende Stich zählt nicht mit
    const win = resolveTrick(scen(10, 11, { skills: [L.IONENFELD], lightning: light({ fieldLeft: 1 }) }), noCrit);
    expect(win.lastTrick.result).toBe("win"); expect(win.lastTrick.pValue).toBe(10 + T.ionenfeld[0].value); expect(win.lightning.fieldLeft).toBe(0);
    const gone = resolveTrick({ ...win, phase: "play" }, noCrit); // das Feld ist verbraucht
    expect(gone.lastTrick.result).toBe("loss");
  });
  it("Vorentladung (§7.18): ab der Serie der Stufe +Crit-Multiplikator je Serienpunkt (Serie nach dem Sieg)", () => {
    const min = T.vorentladung[0].minStreak;
    const on = resolveTrick(scen(12, 0, { skills: [L.VORENTLADUNG], lightning: light(), winStreak: min - 1 }), zero); // Serie nach dem Sieg = min
    expect(on.lastTrick.isCrit).toBe(true);
    expect(on.lastTrick.critMultiplier).toBeCloseTo(M + min * T.vorentladung[0].multPerStreak, 6);
    const off = resolveTrick(scen(12, 0, { skills: [L.VORENTLADUNG], lightning: light(), winStreak: min - 2 }), zero);
    expect(off.lastTrick.critMultiplier).toBeCloseTo(M, 6);
  });
  it("Kettenblitz Selten (§7.18): jede volle Leiste ionisiert die nächste Karte UND vertieft die tiefste", () => {
    const s = resolveTrick(scen(12, 0, { deck: withStacks(12, 5, 2), skills: [L.KETTENBLITZ], skillTiers: { [L.KETTENBLITZ]: 1 }, lightning: light({ charge: 9 }) }), zero);
    expect(s.deck[1].ionStacks).toBe(1); expect(s.deck[5].ionStacks).toBe(2 + T.kette[1].extra); expect(s.deck[2].ionStacks || 0).toBe(0);
    expect(s.ionTotal).toBe(1 + T.kette[1].extra);
  });
  it("Blitzschlag Episch: jeder 2. Crit ionisiert die Siegkarte (§7.18: zwei Stapel)", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.BLITZSCHLAG], skillTiers: { [L.BLITZSCHLAG]: 3 }, lightning: light({ critCount: 1 }) }), zero);
    expect(s.deck[0].ionStacks).toBe(T.blitzschlag[3].stacks);
    const first = resolveTrick(scen(12, 0, { skills: [L.BLITZSCHLAG], skillTiers: { [L.BLITZSCHLAG]: 3 }, lightning: light() }), zero);
    expect(first.deck[0].ionStacks || 0).toBe(0);
  });
  it("Spannungsstau (§7.18): Sieg ohne Crit rampt den Crit-Multiplikator, der Crit zahlt ihn und leert (Episch halbiert)", () => {
    expect(resolveTrick(scen(12, 0, { skills: [L.SPANNUNGSSTAU], lightning: light() }), noCrit).lightning.stauBonus).toBeCloseTo(T.stau[0].step, 9);
    const paid = resolveTrick(scen(12, 0, { skills: [L.SPANNUNGSSTAU], lightning: light({ stauBonus: 0.3 }) }), zero);
    expect(paid.lastTrick.isCrit).toBe(true);
    expect(paid.lastTrick.critMultiplier).toBeCloseTo(M + 0.3, 6);
    expect(paid.lightning.stauBonus).toBe(0);
    expect(resolveTrick(scen(12, 0, { skills: [L.SPANNUNGSSTAU], skillTiers: { [L.SPANNUNGSSTAU]: 3 }, lightning: light({ stauBonus: 0.3 }) }), zero).lightning.stauBonus).toBeCloseTo(0.15, 9);
  });
  it("Überschuss über 100 %: nur noch die Systemregel (klein) hebt den Crit-Multiplikator — Überschlag ist gestrichen (§7.19)", () => {
    const rule = resolveTrick(scen(12, 0, { lightning: light({ stormCritBonus: 1.5 }) }), zero); // rawCrit 1,5 → 50 Punkte (Gewitterfront-Rampe als synthetische Quelle)
    expect(rule.lastTrick.isCrit).toBe(true);
    expect(rule.lastTrick.critMultiplier).toBeCloseTo(M + 50 * C.OVERCRIT_MULT_PER_PP, 6);
    const pp = Math.round((C.LIGHTNING_CRIT_PER_SKILL + 1.5 - 1) * 100); // ein Blitz-Skill + 1,5 → Punkte über 100 (§7.12: 4 % je Skill → 54)
    const withSkill = resolveTrick(scen(12, 0, { skills: [L.ABLEITER], lightning: light({ stormCritBonus: 1.5 }) }), zero);
    expect(withSkill.lastTrick.critMultiplier).toBeCloseTo(M + pp * C.OVERCRIT_MULT_PER_PP, 6); // kein Skill-Term mehr auf dem Überschuss
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
  it("volle Leiste zündet auch auf einer Niederlage (Ladung, die ein Stich über der Leiste hinterlässt)", () => {
    const s = resolveTrick(scen(0, 12, { skills: [L.ABLEITER], lightning: light({ charge: 10 }) }), noCrit);
    expect(s.lastTrick.result).toBe("loss");
    expect(s.lightning.charge).toBe(0);
    expect(s.lightning.bars).toBe(1);
    expect(s.deck[1].ionStacks).toBe(1);
  });
  it("Donnergott (§7.20): Leiste bei 7 voll, maxCharge folgt dem Build; Stapel der Siegkarte zählen +0,25× statt +0,15×, kein flacher Term", () => {
    const s = resolveTrick(scen(12, 0, { skills: [L.DONNERGOTT], lightning: light({ charge: 6 }) }), zero);
    expect(s.lightning.maxCharge).toBe(C.DONNERGOTT_MAX_CHARGE);
    expect(s.lightning.bars).toBe(1);
    expect(s.lightning.charge).toBe(0);
    expect(s.deck[1].ionStacks).toBe(1);
    expect(s.lastTrick.critMultiplier).toBeCloseTo(M, 6); // ohne Stapel auf der Siegkarte nichts extra
    const deep = resolveTrick(scen(12, 0, { deck: withStacks(12, 0, 3), skills: [L.DONNERGOTT], lightning: light() }), zero);
    expect(deep.lastTrick.critMultiplier).toBeCloseTo(M + 3 * C.DONNERGOTT_ION_CRIT_MULT_PER_STACK, 6);
    expect(C.DONNERGOTT_ION_CRIT_MULT_PER_STACK).toBeGreaterThan(C.ION_CRIT_MULT_PER_STACK);
  });
  it("Doppelentladung: 2 Stapel je Ionisierung; Crit mit ionisierter Karte zählt den Stich doppelt", () => {
    const s = resolveTrick(scen(12, 0, { deck: withStacks(12, 0, 1), skills: [L.DOPPELENTLADUNG], lightning: light({ charge: 9 }) }), zero);
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.lastTrick.breakdown.strikeMult).toBe(C.DOPPELENTLADUNG_STRIKE);
    // §7.12: der eine Stapel der Siegkarte hebt auch den Crit-Multiplikator (+ION_CRIT_MULT_PER_STACK).
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + C.ION_SCORE_PER_STACK) * 1.02 * (M + C.ION_CRIT_MULT_PER_STACK) * C.DOPPELENTLADUNG_STRIKE, 6);
    expect(s.deck[1].ionStacks).toBe(C.DOPPELENTLADUNG_STACKS);
    const plain = resolveTrick(scen(12, 0, { skills: [L.DOPPELENTLADUNG], lightning: light() }), zero); // nicht ionisiert → kein Doppelschlag
    expect(plain.lastTrick.breakdown.strikeMult).toBe(1);
  });
  it("Stapel der Siegkarte heben den Crit-Multiplikator (§7.12): +ION_CRIT_MULT_PER_STACK je Stapel, Kurzschluss zählt ab der Schwelle doppelt", () => {
    // Ein Blitz-Skill, damit die Crit-Chance > 0 ist (rng 0 → Crit); Blitzableiter selbst rührt den Multiplikator nicht an.
    const three = resolveTrick(scen(12, 0, { deck: withStacks(12, 0, 3), skills: [L.ABLEITER], lightning: light() }), zero);
    expect(three.lastTrick.isCrit).toBe(true);
    expect(three.lastTrick.critMultiplier).toBeCloseTo(M + 3 * C.ION_CRIT_MULT_PER_STACK, 6);
    expect(three.lastTrick.scoreGain).toBeCloseTo((B + 3 * C.ION_SCORE_PER_STACK) * 1.02 * (M + 3 * C.ION_CRIT_MULT_PER_STACK), 6);
    const none = resolveTrick(scen(12, 0, { skills: [L.ABLEITER], lightning: light() }), zero);
    expect(none.lastTrick.critMultiplier).toBeCloseTo(M, 6);
    expect(ionCritMultFor({ ionStacks: 3 })).toBeCloseTo(3 * C.ION_CRIT_MULT_PER_STACK, 9);
    expect(ionCritMultFor({ ionStacks: 3 }, [L.DONNERGOTT], {})).toBeCloseTo(3 * C.DONNERGOTT_ION_CRIT_MULT_PER_STACK, 9); // §7.20
    expect(ionCritMultFor({ ionStacks: 0 })).toBe(0);
    const min = T.kurzschluss[0].minStacks;
    expect(ionCritMultFor({ ionStacks: min }, [L.KURZSCHLUSS], {})).toBeCloseTo(min * T.kurzschluss[0].factor * C.ION_CRIT_MULT_PER_STACK, 9);
    expect(ionScoreFor({ ionStacks: min }, [L.KURZSCHLUSS], {})).toBe(min * T.kurzschluss[0].factor * C.ION_SCORE_PER_STACK); // dieselbe Zählung
  });
  it("Hochspannung: gehaltene Blitz-Skills wirken eine Stufe höher (Blitzfänger Normal kämpft mit dem Selten-Wert)", () => {
    const win = resolveTrick(scen(10, 11, { deck: withStacks(10, 0, 1), skills: [L.BLITZFAENGER, L.HOCHSPANNUNG], lightning: light() }), noCrit);
    expect(win.lastTrick.result).toBe("win");
    expect(win.lastTrick.pValue).toBe(10 + T.faenger[1].value);
    const plain = resolveTrick(scen(10, 11, { deck: withStacks(10, 0, 1), skills: [L.BLITZFAENGER], lightning: light() }), noCrit);
    expect(plain.lastTrick.pValue).toBe(10 + T.faenger[0].value);
    expect(plain.lastTrick.result).not.toBe("win");
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
