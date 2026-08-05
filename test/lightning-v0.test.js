import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, initLightning, lightningCritRaw, maxChargeFor, lightningCritMult,
  ionizeCountFor, chargeConsumerCount, hasDoubleDischarge, hasDurchschlag,
  ionizeCardsWithCatch } from "../src/game/skills.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";

// Engine-Test-Helfer (konstante Decks; pos 0 → Formations-Mult 1).
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const scen = (pVal, oVal, over = {}) => ({ ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal), playerOrder: identity(), oppOrder: identity(), ...over });
const light = (over = {}) => ({ ...initLightning(), active: true, ...over });
const noCrit = () => 0.99, zero = () => 0;
const ION = "SK_LIGHTNING_02", ARC = "SK_LIGHTNING_12";

/* Blitz-Rework (v0) — Registrierungs- + Smoke-Tests. Nennt ALLE 21 Blitz-Ids (Registry-Coverage-Gate)
   und prüft die reinen Blitz-Helfer. Engine-Verhalten (4 Währungen + Kaskade) folgt im Tuning-Pass. */
const LIGHTNING_IDS = [
  "SK_LIGHTNING_01", "SK_LIGHTNING_02", "SK_LIGHTNING_03", "SK_LIGHTNING_04", "SK_LIGHTNING_05",
  "SK_LIGHTNING_06", "SK_LIGHTNING_07", "SK_LIGHTNING_08", "SK_LIGHTNING_09", "SK_LIGHTNING_10",
  "SK_LIGHTNING_11", "SK_LIGHTNING_12", "SK_LIGHTNING_13", "SK_LIGHTNING_14", "SK_LIGHTNING_15",
  "SK_LIGHTNING_16", "SK_LIGHTNING_17", "SK_LIGHTNING_L01", "SK_LIGHTNING_L02", "SK_LIGHTNING_L03", "SK_LIGHTNING_L04",
];

describe("Blitz-Rework v0 — Roster", () => {
  it("21 Blitz-Skills: 17 normal + 4 legendär, alle archetype=lightning, jeder trägt Crit-Chance bei", () => {
    const light = Object.values(SKILL_DEFS).filter((s) => s.archetype === "lightning");
    expect(light).toHaveLength(21);
    expect(light.filter((s) => s.legendary)).toHaveLength(4);
    for (const id of LIGHTNING_IDS) {
      expect(SKILL_DEFS[id], `${id} fehlt im Registry`).toBeTruthy();
      expect(SKILL_DEFS[id].archetype).toBe("lightning");
      expect(SKILL_DEFS[id].critChance()).toBe(C.LIGHTNING_CRIT_PER_SKILL); // Blitz besitzt die Crit-Erzeugung
    }
  });
  it("nur noch ein Ladungs-Konsument (Ionisierung); Ladungsserie speist die Crit-Maschine", () => {
    expect(SKILL_DEFS.SK_LIGHTNING_02.onFullCharge).toBe("ionize");
    expect(SKILL_DEFS.SK_LIGHTNING_07.onFullCharge).toBeUndefined(); // Rework v0: kein Verbraucher mehr
    expect(SKILL_DEFS.SK_LIGHTNING_07.seriesCrit).toBe(true);
    expect(SKILL_DEFS.SK_LIGHTNING_07.name).toBe("Ladungsserie");
    expect(chargeConsumerCount(["SK_LIGHTNING_02", "SK_LIGHTNING_07"])).toBe(1); // nur Ionisierung zählt
  });
});

describe("Blitz-Rework v0 — reine Helfer", () => {
  it("initLightning: frischer Substate inkl. neuer Kaskade-/Crit-Maschine-Felder", () => {
    expect(initLightning()).toMatchObject({ active: false, charge: 0, entladungMult: 0, stauBonus: 0, durchschlagMult: 0 });
  });
  it("lightningCritRaw: Sockel + je Skill + Sturm + Spannungsstau-Rampe", () => {
    const l = { active: true, stormCritBonus: 0.04, stauBonus: 0.1 };
    expect(lightningCritRaw(l, ["SK_LIGHTNING_01"])).toBeCloseTo(C.LIGHTNING_CRIT_BASE + C.LIGHTNING_CRIT_PER_SKILL + 0.04 + 0.1, 6);
    expect(lightningCritRaw({ active: false }, ["SK_LIGHTNING_01"])).toBe(0); // inaktiv → 0
  });
  it("lightningCritRaw: Ladungsserie skaliert mit der Serie (Cap) + Dauerstrom-Verbrauchsrampe", () => {
    const base = C.LIGHTNING_CRIT_BASE + C.LIGHTNING_CRIT_PER_SKILL;
    // Serie 3 → +3·STEP; ohne Ladungsserie ignoriert der streak-Parameter.
    expect(lightningCritRaw(light(), ["SK_LIGHTNING_01"], 3)).toBeCloseTo(base, 6);
    expect(lightningCritRaw(light(), ["SK_LIGHTNING_07"], 3)).toBeCloseTo(base + 3 * C.SERIESCRIT_STEP, 6);
    // Über dem Cap deckelt es.
    expect(lightningCritRaw(light(), ["SK_LIGHTNING_07"], 999)).toBeCloseTo(base + C.SERIESCRIT_CAP, 6);
    // Dauerstrom-Verbrauchsrampe (persistentes Feld) fließt additiv ein.
    expect(lightningCritRaw(light({ dauerstromCritBonus: 0.06 }), ["SK_LIGHTNING_01"], 0)).toBeCloseTo(base + 0.06, 6);
  });
  it("Donnergott-Turbo (v0.5): hebt das Ladungsdach NICHT mehr, gibt weiter +Crit-Mult", () => {
    expect(maxChargeFor([])).toBe(C.LIGHTNING_MAX_CHARGE);
    expect(maxChargeFor(["SK_LIGHTNING_L01"])).toBe(C.LIGHTNING_MAX_CHARGE); // v0.5: kein Dach-Heben mehr (Turbo = früherer Verbrauch)
    expect(lightningCritMult(["SK_LIGHTNING_L01"])).toBe(C.THUNDER_CRIT_MULT);
    expect(lightningCritMult([])).toBe(0);
  });
  it("ionizeCountFor: Ionisierung 2 + Kettenblitz +2", () => {
    expect(ionizeCountFor(["SK_LIGHTNING_02"])).toBe(C.ION_BASE_COUNT);
    expect(ionizeCountFor(["SK_LIGHTNING_02", "SK_LIGHTNING_03"])).toBe(C.ION_BASE_COUNT + C.KETTENBLITZ_COUNT);
  });
  it("Legendär-Prädikate", () => {
    expect(hasDoubleDischarge(["SK_LIGHTNING_L02"])).toBe(true);
    expect(hasDurchschlag(["SK_LIGHTNING_L04"])).toBe(true);
    expect(hasDoubleDischarge(["SK_LIGHTNING_01"])).toBe(false);
  });
});

describe("Blitz-Rework v0 — Engine-Integration", () => {
  it("Ionis-Cap 5: Sieg mit ionisierter Karte 4→5; volle Karte bleibt 5", () => {
    const d4 = constDeck(12).map((c, i) => (i === 0 ? { ...c, ionStacks: 4 } : c));
    expect(resolveTrick(scen(12, 0, { skills: [ION], deck: d4, lightning: light() }), noCrit).deck[0].ionStacks).toBe(5);
    const d5 = constDeck(12).map((c, i) => (i === 0 ? { ...c, ionStacks: 5 } : c));
    expect(resolveTrick(scen(12, 0, { skills: [ION], deck: d5, lightning: light() }), noCrit).deck[0].ionStacks).toBe(5);
  });
  it("Blitzfänger: ionizeCardsWithCatch fängt eine volle Karte statt sie zu ionisieren", () => {
    const res = ionizeCardsWithCatch([{ id: "A", ionStacks: 5 }, { id: "B", ionStacks: 0 }], [0], 1, makeRng(1));
    expect(res.catchIds).toEqual(["A"]);
    expect(res.deck[0].ionStacks).toBe(5);
  });
  it("Spannungsbogen: Sieg mit ionisierter Karte → direkter Nachfolger +1 Stapel", () => {
    const deck = constDeck(12).map((c, i) => (i === 0 ? { ...c, ionStacks: 1 } : c));
    const s = resolveTrick(scen(12, 0, { skills: [ARC], deck, lightning: light() }), noCrit);
    expect(s.deck[1].ionStacks).toBe(1); // Nachfolger
    expect(s.deck[0].ionStacks).toBe(2); // Siegkarte selbst +1
  });
  it("Spannungsstau: Sieg ohne Crit rampt die Crit-Chance; ein Crit resettet", () => {
    const noC = resolveTrick(scen(12, 0, { skills: ["SK_LIGHTNING_13"], lightning: light() }), noCrit);
    expect(noC.lightning.stauBonus).toBeCloseTo(C.SPANNUNGSSTAU_STEP);
    const crit = resolveTrick(scen(12, 0, { skills: ["SK_LIGHTNING_13"], lightning: light({ stauBonus: 0.3 }) }), zero); // Crit aus den Blitz-Skills (rng 0)
    expect(crit.lastTrick.isCrit).toBe(true);
    expect(crit.lightning.stauBonus).toBe(0);
  });
  it("Kurzschluss (Rework): Sieg mit voller (5) Karte → Score+Ladung-Burst, Stapel bleiben (kein Reset)", () => {
    const deck = constDeck(12).map((c, i) => (i === 0 ? { ...c, ionStacks: 5 } : c));
    const s = resolveTrick(scen(12, 0, { skills: ["SK_LIGHTNING_09"], deck, lightning: light() }), noCrit);
    expect(s.deck[0].ionStacks).toBe(C.ION_MAX_STACKS);                 // voll bleibt voll — kein Opfer
    expect(s.lightning.charge).toBe(C.KURZSCHLUSS_CHARGE);              // Ladungs-Burst
    expect(s.lastTrick.breakdown.lightDirect).toBe(C.KURZSCHLUSS_SCORE); // Direkt-Score-Burst (post-stack)
  });
  it("Blitzschlag: ein Crit ionisiert die gewonnene Karte (+1 Stapel)", () => {
    const s = resolveTrick(scen(12, 0, { skills: ["SK_LIGHTNING_15"], lightning: light() }), zero); // Crit aus den Blitz-Skills (rng 0)
    expect(s.lastTrick.isCrit).toBe(true);
    expect(s.deck[0].ionStacks).toBe(C.BLITZSCHLAG_STACKS);
  });
  it("v0.5-UI: consumeCount zählt volle Verbräuche (Entladungen/Runde)", () => {
    // Statische Aufladung (+1 Ladung je Nicht-Crit-Sieg) hebt 9→10 → Ionisierung-Konsument feuert → consumeCount +1.
    const s = resolveTrick(scen(12, 0, { skills: [ION, "SK_LIGHTNING_08"], lightning: light({ charge: 9 }) }), noCrit);
    expect(s.lightning.consumeCount).toBe(1);
  });
  it("v0.5-UI: serienschutzCount zählt gehaltene Serienbrüche; Serie hält, ½ Ladung weg", () => {
    // Niederlage (0<12) mit Serienschutz + Ladung ≥ ⌈10·0,5⌉=5 → Serie hält, Ladung 6→1, Zähler +1.
    const s = resolveTrick(scen(0, 12, { skills: ["SK_LIGHTNING_17"], lightning: light({ charge: 6 }), winStreak: 3 }), noCrit);
    expect(s.lightning.serienschutzCount).toBe(1);
    expect(s.lightning.charge).toBe(6 - Math.ceil(10 * C.SERIENSCHUTZ_COST_FRAC));
    expect(s.winStreak).toBe(3); // Serie gehalten (kein Reset auf 0)
  });
});

/* Blitz-Legendär-Reshape (2026-07-30) — die Ionisierung FLUTET (blitz-economy.mjs: alle Karten @Deckel 5, ~ganzes Deck ab
   Cycle 20), „mehr Ionis."-Legendäre waren tot (Doppelentl. 1,01× / Flächenion. 0,90×). Sie lesen jetzt den BESTAND des
   gesättigten Feldes und zahlen je IONISIERTEM Sieg DIREKT (post-stack, breakdown.lightDirect), hart gedeckelt,
   bekenntnis-skaliert (activeLightningCount/SKILL_SLOTS). Generisches Blitz bleibt unberührt. */
describe("Blitz-Legendär-Reshape — Feld-Dividende (lightDirect)", () => {
  const commit1 = Math.min(1, 1 / C.SKILL_SLOTS); // 1 Blitz-Skill (nur die Legendäre) gehalten
  const ionDeck = (n, stacks) => constDeck(12).map((c, i) => (i < n ? { ...c, ionStacks: stacks } : c));

  it("generisches Blitz (ohne Legendäre): kein lightDirect trotz voll ionisiertem Feld", () => {
    const s = resolveTrick(scen(12, 0, { skills: [ION], deck: ionDeck(10, 5), lightning: light() }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.breakdown.lightDirect || 0).toBe(0); // Deckel/Generik unberührt → Floor/Ceiling geschützt
  });

  it("Flächenionisation (BREITE): #ionisierte Karten × FLAECHENION_DIRECT je ionisiertem Sieg (gedeckelt, bekenntnis-skaliert)", () => {
    const n = 5;
    const s = resolveTrick(scen(12, 0, { skills: ["SK_LIGHTNING_L03"], deck: ionDeck(n, 1), lightning: light() }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.breakdown.lightDirect).toBeCloseTo(Math.min(n, C.FLAECHENION_FIELD_CAP) * C.FLAECHENION_DIRECT * commit1);
    // Über der Feldbreite plateaut es (kein Runaway).
    const wide = resolveTrick(scen(12, 0, { skills: ["SK_LIGHTNING_L03"], deck: ionDeck(C.FLAECHENION_FIELD_CAP + 6, 1), lightning: light() }), noCrit);
    expect(wide.lastTrick.breakdown.lightDirect).toBeCloseTo(C.FLAECHENION_FIELD_CAP * C.FLAECHENION_DIRECT * commit1);
  });

  it("Doppelentladung (ENERGIE): Σ Stapel × DOPPELENT_DIRECT je ionisiertem Sieg (gedeckelt)", () => {
    const n = 6, stacks = 5; // Σ = 30 < Deckel
    const s = resolveTrick(scen(12, 0, { skills: ["SK_LIGHTNING_L02"], deck: ionDeck(n, stacks), lightning: light() }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.breakdown.lightDirect).toBeCloseTo(Math.min(n * stacks, C.DOPPELENT_FIELD_CAP) * C.DOPPELENT_DIRECT * commit1);
  });

  it("nur bei IONISIERTEM Sieg: gewinnt eine nicht-ionisierte Karte → kein lightDirect (trotz ionisiertem Restfeld)", () => {
    const deck = constDeck(12).map((c, i) => (i > 0 && i <= 5 ? { ...c, ionStacks: 3 } : c)); // deck[0] NICHT ionisiert
    const s = resolveTrick(scen(12, 0, { skills: ["SK_LIGHTNING_L03"], deck, lightning: light() }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    expect(s.deck[0].ionStacks || 0).toBe(0);
    expect(s.lastTrick.breakdown.lightDirect || 0).toBe(0);
  });
});
