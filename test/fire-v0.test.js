import { describe, it, expect } from "vitest";
import * as C from "../src/game/constants.js";
import { SKILL_DEFS, heatGainFor, heatLossFor, fireScoreFor, verbrennungMult,
  glowingValueFor, glowMarginFor, forgeCostFor, initHeat,
  overheatGain, overheatDecay, overheatMult, conflagRateFor, meltRateFor, sparkBankFor } from "../src/game/skills.js";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { SEGMENT_SIZE } from "../src/game/formations.js";

// Engine-Test-Helfer (konstante Decks; pos 0 → Formations-Mult 1, wie in den Bestandstests).
const constDeck = (v) => Array.from({ length: 40 }, (_, i) => ({ id: `X${i}`, suit: ["R", "B", "G", "Y"][i % 4], baseRank: v, value: v }));
const identity = () => Array.from({ length: 40 }, (_, i) => i);
const scen = (pVal, oVal, over = {}) => ({ ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal), playerOrder: identity(), oppOrder: identity(), ...over });
const heat = (over = {}) => ({ ...initHeat(), active: true, ...over });
const noCrit = () => 0.99;
const B = C.SCORE_PER_WIN;

/* Feuer-Rework (v0) — Registrierungs- + Smoke-Tests. Nennt ALLE 21 Feuer-Ids (Registry-Coverage-Gate)
   und prüft die reinen Feuer-Helfer auf plausible v0-Zahlen. Behavioral-Vollabdeckung (Engine/Reducer)
   folgt im gesammelten cross-archetype Tuning-Pass — hier bewusst nur Roster + reine Helfer. */
const FIRE_IDS = [
  "SK_FIRE_01", "SK_FIRE_02", "SK_FIRE_03", "SK_FIRE_04", "SK_FIRE_05", "SK_FIRE_06", "SK_FIRE_07",
  "SK_FIRE_08", "SK_FIRE_09", "SK_FIRE_10", "SK_FIRE_11", "SK_FIRE_12", "SK_FIRE_13", "SK_FIRE_14",
  "SK_FIRE_15", "SK_FIRE_16", "SK_FIRE_17", "SK_FIRE_L01", "SK_FIRE_L02", "SK_FIRE_L03", "SK_FIRE_L04",
];

describe("Feuer-Rework v0 — Roster", () => {
  it("21 Feuer-Skills: 17 normal + 4 legendär, alle archetype=fire, alle registriert", () => {
    const fire = Object.values(SKILL_DEFS).filter((s) => s.archetype === "fire");
    expect(fire).toHaveLength(21);
    expect(fire.filter((s) => s.legendary)).toHaveLength(4);
    for (const id of FIRE_IDS) {
      expect(SKILL_DEFS[id], `${id} fehlt im Registry`).toBeTruthy();
      expect(SKILL_DEFS[id].archetype).toBe("fire");
      expect(typeof SKILL_DEFS[id].desc).toBe("string");
    }
  });
  it("genau ein Konsument-Paar (Flächenbrand Burst / Schmelzpunkt Drip)", () => {
    expect(SKILL_DEFS.SK_FIRE_11.heatConsumer).toBe("conflagration");
    expect(SKILL_DEFS.SK_FIRE_12.heatConsumer).toBe("melt");
  });
});

describe("Feuer-Rework v0 — reine Helfer", () => {
  it("heatGainFor: Marge×Glut + Zunder + Feuersturm(Serie) + Rückzündung(Rückstand)", () => {
    expect(heatGainFor(6, [], {})).toBe(4);                              // (min(6,8)−2)×1
    expect(heatGainFor(6, ["SK_FIRE_01"], {})).toBe(6);                  // Glut ×1,5 → round(4×1,5)
    expect(heatGainFor(1, ["SK_FIRE_02"], {})).toBe(C.ZUNDER_HEAT);      // Zunder auch bei knappem Sieg (Marge<3)
    expect(heatGainFor(3, ["SK_FIRE_03"], { winStreak: 3 })).toBe(1 + 3);        // Basis 1 + Feuersturm 3
    expect(heatGainFor(3, ["SK_FIRE_03"], { winStreak: 99 })).toBe(1 + C.FEUERSTURM_CAP); // Cap
    expect(heatGainFor(3, ["SK_FIRE_05"], { lostLast: true, deficit: 4 })).toBe(1 + 4);    // Rückzündung
    expect(heatGainFor(3, ["SK_FIRE_05"], { lostLast: false, deficit: 4 })).toBe(1);       // nur nach Niederlage
  });
  it("heatGainFor: über dem Knie √-Schwanz statt hartem Deckel (uncapped, diminishing)", () => {
    const knee = C.HEAT_MARGIN_CAP;
    expect(heatGainFor(knee, [], {})).toBe(knee - 2);                         // am Knie noch linear
    // über dem Knie: (Knie−2) + round(K·√(Marge−Knie)) — mehr als der alte harte Deckel, aber abnehmend.
    const tail = (m) => Math.round((knee - 2) + C.HEAT_MARGIN_TAIL_K * Math.sqrt(m - knee));
    expect(heatGainFor(knee + 4, [], {})).toBe(tail(knee + 4));
    expect(heatGainFor(knee + 8, [], {})).toBe(tail(knee + 8));
    expect(heatGainFor(knee + 8, [], {})).toBeGreaterThan(heatGainFor(knee, [], {})); // hoher Vorsprung generiert weiter Hitze
  });
  it("heatLossFor: Glutbett halbiert / unter 30 % gratis / Deckel", () => {
    expect(heatLossFor(8, [])).toBe(8);
    expect(heatLossFor(8, ["SK_FIRE_04"], 50)).toBe(Math.floor((Math.min(8, C.HEAT_LOSS_MAX) + 50 * C.HEAT_LOSS_PCT) * C.GLUTBETT_MULT)); // (Basis + %-Kühlung) × Glutbett 0,5
    expect(heatLossFor(8, ["SK_FIRE_04"], 20)).toBe(0);   // unter 30 % → kein Verlust
    expect(heatLossFor(20, [])).toBe(C.HEAT_LOSS_MAX);    // Deckel
  });
  it("fireScoreFor: lineare Linie + additiver √-Bonus (Wurzeltiefe-Muster) + Verbrennung(≥8/≥12)", () => {
    // roher Feuer-Score (vor Verbrennung): (Marge−OFFSET)·Basis + Basis·K·√(Marge−OFFSET), uncapped.
    const rawFire = (m, base) => {
      const over = m - C.FIRE_MARGIN_OFFSET;
      return over * base + base * C.FIRE_SCORE_SQRT_K * Math.sqrt(over);
    };
    expect(fireScoreFor(6, ["SK_FIRE_09"], 0)).toBe(Math.round(rawFire(6, 25)));                       // Marge<8 → Verbrennung ×1
    expect(fireScoreFor(10, ["SK_FIRE_09"], 0)).toBe(Math.round(rawFire(10, 25) * C.VERBRENNUNG_T1_MULT));
    expect(fireScoreFor(12, ["SK_FIRE_09"], 0)).toBe(Math.round(rawFire(12, 25) * C.VERBRENNUNG_T2_MULT));
    expect(fireScoreFor(6, ["SK_FIRE_L03"], 100)).toBe(Math.round(rawFire(6, 25)));                    // Sonnenzorn verstärkt den Helfer NICHT mehr
    // √-Bonus hebt den Score strikt über die alte lineare Linie (kein Deckel).
    expect(fireScoreFor(12, ["SK_FIRE_09"], 0)).toBeGreaterThan(Math.round((12 - 2) * 25 * C.VERBRENNUNG_T2_MULT));
    expect(verbrennungMult(7)).toBe(1);
    expect(verbrennungMult(8)).toBe(C.VERBRENNUNG_T1_MULT);
    expect(verbrennungMult(12)).toBe(C.VERBRENNUNG_T2_MULT);
  });
  it("glowingValueFor: Stufen 40/70/100 (reiner Nicht-Legendär-Skill, kein Sonnenzorn-Bonus mehr)", () => {
    expect(glowingValueFor(39, ["SK_FIRE_06"])).toBe(0);
    expect(glowingValueFor(40, ["SK_FIRE_06"])).toBe(1);
    expect(glowingValueFor(70, ["SK_FIRE_06"])).toBe(2);
    expect(glowingValueFor(100, ["SK_FIRE_06"])).toBe(3);
    expect(glowingValueFor(100, ["SK_FIRE_06", "SK_FIRE_L03"])).toBe(3); // Sonnenzorn hebt die Stufe nicht mehr
  });
  // #fire-balance: die OBEREN Stufen hängen zusätzlich am Segment-Fenster — sonst lag mit Feuerwalze dauerhaft
  // +6 Wert auf jeder Karte und blies genau die Margen auf, aus denen die Hitze kommt (Rückkopplung).
  it("glowingValueFor: obere Stufen verlangen den Wertvorsprung aus dem Segment-Fenster", () => {
    expect(glowingValueFor(100, ["SK_FIRE_06"], 0)).toBe(C.GLOWING_T1_VALUE);
    expect(glowingValueFor(100, ["SK_FIRE_06"], C.GLOWING_T2_MARGIN - 1)).toBe(C.GLOWING_T1_VALUE);
    expect(glowingValueFor(100, ["SK_FIRE_06"], C.GLOWING_T2_MARGIN)).toBe(C.GLOWING_T2_VALUE);
    expect(glowingValueFor(100, ["SK_FIRE_06"], C.GLOWING_T3_MARGIN)).toBe(C.GLOWING_T3_VALUE);
    expect(glowingValueFor(70, ["SK_FIRE_06"], C.GLOWING_T3_MARGIN)).toBe(C.GLOWING_T2_VALUE); // Hitze deckelt weiter
  });
  it("glowMarginFor: Fenster = größter Sieg des LAUFENDEN oder des vorigen Segments", () => {
    expect(glowMarginFor({ glowSegBest: 3, glowPrevBest: 12 })).toBe(12);
    expect(glowMarginFor({ glowSegBest: 12, glowPrevBest: 0 })).toBe(12);
    expect(glowMarginFor({})).toBe(0);
    expect(glowMarginFor(null)).toBe(0);
  });
  // #fire-balance: Weißglut ist kein Flat mehr, sondern die ÜBERHITZUNG — ein eigener Akku mit steigenden
  // Zuflusskosten, kontinuierlichem Abbau und einem Multiplikator auf den gesamten Feuer-Score.
  it("overheatGain: Zufluss wird mit steigender Überhitzung teurer, Deckel bei OVERHEAT_MAX", () => {
    expect(overheatGain(0, 10, ["SK_FIRE_07"])).toBeCloseTo(10);                                  // Faktor 1
    expect(overheatGain(C.OVERHEAT_COST_K, 10, ["SK_FIRE_07"])).toBeCloseTo(C.OVERHEAT_COST_K + 5); // Faktor 1/2
    expect(overheatGain(3 * C.OVERHEAT_COST_K, 10, ["SK_FIRE_07"])).toBeCloseTo(3 * C.OVERHEAT_COST_K + 2.5); // Faktor 1/4
    expect(overheatGain(0, 10, [])).toBe(0);                       // ohne Weißglut kein Zufluss
    expect(overheatGain(C.OVERHEAT_MAX, 99, ["SK_FIRE_07"])).toBe(C.OVERHEAT_MAX); // Deckel
  });
  it("overheatDecay / overheatMult: Abbau bis 0, +Feuer-Score je Punkt (bei MAX ×2)", () => {
    expect(overheatDecay(10, C.OVERHEAT_DECAY)).toBe(10 - C.OVERHEAT_DECAY);
    expect(overheatDecay(1, C.OVERHEAT_DECAY_LOSS)).toBe(0);       // nie negativ
    expect(overheatMult(0, ["SK_FIRE_07"])).toBe(1);
    expect(overheatMult(10, ["SK_FIRE_07"])).toBeCloseTo(1 + 10 * C.OVERHEAT_SCORE_STEP);
    expect(overheatMult(C.OVERHEAT_MAX, ["SK_FIRE_07"])).toBeCloseTo(1 + C.OVERHEAT_MAX * C.OVERHEAT_SCORE_STEP);
    expect(overheatMult(30, [])).toBe(1);                          // ohne Weißglut kein Hebel
  });
  it("conflagRateFor / meltRateFor / sparkBankFor: die drei neu skalierten Sätze", () => {
    expect(conflagRateFor(["SK_FIRE_11"])).toBe(C.CONFLAG_PER_HEAT);                                  // ein Feuer-Skill
    expect(conflagRateFor(["SK_FIRE_11", "SK_FIRE_01", "SK_FIRE_02"])).toBe(C.CONFLAG_PER_HEAT + 2 * C.CONFLAG_PER_SKILL);
    expect(meltRateFor(0)).toBe(C.MELT_SCORE_BASE);                                                   // Satz ∝ gehaltener Hitze
    expect(meltRateFor(C.HEAT_MAX)).toBeCloseTo(C.MELT_SCORE_BASE + C.MELT_SCORE_PER_HEAT * C.HEAT_MAX);
    // #fire-consumer: … und ∝ der Siegesserie (eigene Auflade-Kurve statt Fixbetrag je Sieg), mit Deckel.
    const full = C.MELT_SCORE_BASE + C.MELT_SCORE_PER_HEAT * C.HEAT_MAX;
    expect(meltRateFor(C.HEAT_MAX, 0)).toBeCloseTo(full);
    expect(meltRateFor(C.HEAT_MAX, 4)).toBeCloseTo(full * (1 + 4 * C.MELT_STREAK_STEP));
    expect(meltRateFor(C.HEAT_MAX, C.MELT_STREAK_CAP + 50)).toBeCloseTo(full * (1 + C.MELT_STREAK_CAP * C.MELT_STREAK_STEP));
    // Der Sockel ist der Punkt: ein Sieg unter HEAT_MIN_MARGIN hat Feuer-Score 0 und legte damit früher NICHTS ein.
    expect(fireScoreFor(2, ["SK_FIRE_10"], 0)).toBe(0);
    expect(sparkBankFor(0, ["SK_FIRE_10"])).toBe(C.SPARKFLIGHT_FLOOR_BASE);
    expect(sparkBankFor(100, ["SK_FIRE_10"])).toBe(100 * C.SPARKFLIGHT_BANK_MULT + C.SPARKFLIGHT_FLOOR_BASE);
  });
  it("forgeCostFor: FORGE_COST, Schmelzofen-Rabatt als Faktor ab 50 % (#268)", () => {
    expect(forgeCostFor(["SK_FIRE_15"], 0)).toBe(C.FORGE_COST);
    // #268: Rabatt ist ein FAKTOR (−25 %), skaliert mit den Kosten (20 → 15), ganzzahlig gerundet.
    expect(forgeCostFor(["SK_FIRE_15", "SK_FIRE_17"], 60)).toBe(Math.round(C.FORGE_COST * (1 - C.SCHMELZOFEN_FORGE_DISCOUNT)));
    expect(forgeCostFor(["SK_FIRE_15", "SK_FIRE_17"], 20)).toBe(C.FORGE_COST); // unter 50 % kein Rabatt
  });
  it("initHeat: frischer Substate", () => {
    expect(initHeat()).toMatchObject({ active: false, value: 0, fireRoll: 0, sparkStore: 0, phoenixUsed: false,
      over: 0, glowSegBest: 0, glowPrevBest: 0 });
  });
});

describe("Feuer-Rework v0 — Engine-Integration", () => {
  it("Feuer-Score bei Sieg fließt in die multiplizierte Basis (Grund-Payoff)", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_01"], heat: heat() }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    // Feuer-Score (lineare Linie + √-Bonus) in der multiplizierten Basis + Glutdividende (direkt, Hitze × Satz × Feuer-Bekenntnis 1/6).
    const fs1 = Math.round((6 - 2) * 25 + 25 * C.FIRE_SCORE_SQRT_K * Math.sqrt(6 - 2));
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + fs1) * 1.02 + Math.min(s.heat.value, C.FIRE_DIVIDEND_HEAT_CAP) * C.FIRE_HEAT_DIVIDEND * Math.min(1, 1 / C.SKILL_SLOTS));
  });
  it("Hitzegewinn: Glut ×1,5 auf die Marge (Vorsprung 6 → +6 %)", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_01"], heat: heat({ value: 0 }) }), noCrit);
    expect(s.heat.value).toBe(6); // round((min(6,8)−2)×1 × 1,5)
  });
  it("Glühende Klinge: +3 Wert bei 100 % Hitze macht einen Rückstand zum Sieg (Segment-Fenster erfüllt)", () => {
    const s = resolveTrick(scen(8, 10, { skills: ["SK_FIRE_06"], heat: heat({ value: 100, glowSegBest: C.GLOWING_T3_MARGIN }) }), noCrit);
    // glowSegBest, nicht glowPrevBest: der erste Stich eines Segments (hier actualPos 0) rückt das Fenster ZUERST
    // nach — ein direkt gesetztes glowPrevBest würde dabei überschrieben.
    expect(s.lastTrick.result).toBe("win");
    expect(s.lastTrick.pValue).toBe(11); // 8 + 3
  });
  // #fire-balance: die Stufe wird JE SEGMENT einmal verdient und hält dann durch — erst ein Segment ohne passenden
  // Stich lässt sie fallen. Ein einzelner knapper Sieg stuft NICHT sofort zurück (im Spielfluss nicht lesbar).
  it("Glühende Klinge: obere Stufe hält ein Segment nach und fällt erst im übernächsten", () => {
    // Start mit einem erfüllten Fenster; danach nur noch Siege mit Vorsprung 1 (unter beiden Schwellen).
    let s = scen(3, 2, { skills: ["SK_FIRE_06"], heat: heat({ value: 100, glowSegBest: C.GLOWING_T3_MARGIN }) });
    const val = [];
    for (let i = 0; i < 8; i++) { s = resolveTrick(s, noCrit); val.push(s.lastTrick.pValue); }
    expect(val[0]).toBe(3 + C.GLOWING_T3_VALUE);          // Segment 1: Fenster aus dem Vorsegment trägt
    expect(val[SEGMENT_SIZE - 1]).toBe(3 + C.GLOWING_T3_VALUE);
    expect(val[SEGMENT_SIZE]).toBe(3 + C.GLOWING_T1_VALUE); // Segment 2: kein passender Stich mehr im Fenster
  });
  it("Weißglut: Hitze über 100 % staut sich als Überhitzung und hebt den GESAMTEN Feuer-Score", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_01", "SK_FIRE_07"], heat: heat({ value: 98 }) }), noCrit);
    expect(s.heat.value).toBe(100);
    expect(s.heat.over).toBeCloseTo(4); // Gewinn 6 → Überlauf 4; Abbau greift auf 0 nicht, Zufluss bei over 0 voll
    // Feuer-Score (2 Skills, Basis 30) × Überhitzungs-Hebel; + Glutdividende (direkt, Hitze × Satz × Bekenntnis 2/6).
    const fs2 = Math.round((6 - 2) * 30 + 30 * C.FIRE_SCORE_SQRT_K * Math.sqrt(6 - 2));
    const extra = Math.round(fs2 * (overheatMult(s.heat.over, ["SK_FIRE_07"]) - 1));
    expect(extra).toBeGreaterThan(0);
    expect(s.lastTrick.scoreGain).toBeCloseTo((B + fs2 + extra) * 1.02 + Math.min(s.heat.value, C.FIRE_DIVIDEND_HEAT_CAP) * C.FIRE_HEAT_DIVIDEND * Math.min(1, 2 / C.SKILL_SLOTS));
  });
  // Die Zone ist bewusst ein ZWEITES Feld statt heat.max = 150: alles, was heat.value liest, bleibt bei 100 gedeckelt.
  it("Weißglut: die Überhitzung ist ISOLIERT — Sonnenzorn-Peak bleibt bei HEAT_MAX", () => {
    const s = resolveTrick(scen(30, 0, { skills: ["SK_FIRE_01", "SK_FIRE_07"], heat: heat({ value: 100, over: 20 }) }), noCrit);
    expect(s.heat.value).toBe(C.HEAT_MAX);
    expect(s.heat.over).toBeGreaterThan(20);       // gefüttert
    expect(s.heat.peak).toBe(C.HEAT_MAX);          // NICHT 100 + Überhitzung
  });
  it("Weißglut: die Überhitzung baut sich je Stich ab — auch ohne Niederlage", () => {
    const won = resolveTrick(scen(3, 2, { skills: ["SK_FIRE_07"], heat: heat({ value: 100, over: 20 }) }), noCrit);
    expect(won.lastTrick.result).toBe("win");      // Vorsprung 1 → kein Hitzegewinn, also kein Zufluss
    expect(won.heat.over).toBeCloseTo(20 - C.OVERHEAT_DECAY);
    const lost = resolveTrick(scen(2, 9, { skills: ["SK_FIRE_07"], heat: heat({ value: 100, over: 20 }) }), noCrit);
    expect(lost.lastTrick.result).toBe("loss");
    expect(lost.heat.over).toBeCloseTo(20 - C.OVERHEAT_DECAY_LOSS); // Niederlage kühlt schneller aus
  });
  it("Schmelzpunkt: kostet MELT_COST NUR bei Sieg und zahlt nach GEHALTENER Hitze", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_12"], heat: heat({ value: 50 }) }), noCrit);
    expect(s.heat.value).toBe(50 + heatGainFor(6, ["SK_FIRE_12"], {}) - C.MELT_COST);
    // #fire-balance: eine NIEDERLAGE verbrennt nichts mehr — der bedingungslose Abzug war der ganze Fehler.
    const lost = resolveTrick(scen(2, 9, { skills: ["SK_FIRE_12"], heat: heat({ value: 50 }) }), noCrit);
    expect(lost.lastTrick.result).toBe("loss");
    expect(lost.heat.value).toBe(50 - heatLossFor(7, ["SK_FIRE_12"], 50)); // nur der normale Niederlage-Verlust
    // Und er unterläuft den Flächenbrand-Boden nicht (er verbrennt VOR ihm, nicht nach ihm).
    const both = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_11", "SK_FIRE_12"], heat: heat({ value: 90 }) }), noCrit);
    expect(both.heat.value).toBe(C.CONFLAG_KEEP);
    expect(both.heat.value).toBeGreaterThanOrEqual(C.FIREROLL_MIN_HEAT);
    // Isoliert gegen einen gleich großen Nicht-Konsumenten-Build bei identischer Hitze: die Differenz IST der Tropf.
    const withMelt = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_12"], heat: heat({ value: 100 }) }), noCrit);
    const without  = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_09"], heat: heat({ value: 100 }) }), noCrit);
    expect(withMelt.lastTrick.scoreGain - without.lastTrick.scoreGain)
      .toBeGreaterThan(C.MELT_COST * C.MELT_SCORE_PER_HEAT * C.HEAT_MAX); // ≫ die alten 50 Score
  });
  it("Funkenflug: auch ein Sieg unter HEAT_MIN_MARGIN zahlt in den Speicher ein", () => {
    const s = resolveTrick(scen(8, 6, { skills: ["SK_FIRE_10"], heat: heat({ value: 0 }) }), noCrit);
    expect(s.lastTrick.result).toBe("win");
    expect(s.heat.sparkStore).toBe(sparkBankFor(0, ["SK_FIRE_10"])); // Feuer-Score wäre hier 0 → nur der Sockel
  });
  it("Brandmal: Sieg brandmarkt die geschlagene Gegnerkarte (nächster Durchlauf) + Asche", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_13"], heat: heat() }), noCrit);
    expect(s.brandPending[s.lastTrick.oCard.id]).toBe(C.BRAND_VALUE);
    expect(s.ash).toBe(C.BRAND_ASH);
  });
  it("Flächenbrand (Konsument): Sieg ab 80 % Hitze brennt bis auf den BODEN herunter, Satz bekenntnis-skaliert", () => {
    const s = resolveTrick(scen(12, 6, { skills: ["SK_FIRE_01", "SK_FIRE_11"], heat: heat({ value: 90 }) }), noCrit);
    expect(s.heat.value).toBe(C.CONFLAG_KEEP);           // #fire-balance: nicht mehr 0 — Feuerwalze/Klingen-Sockel überleben
    expect(s.heat.value).toBeGreaterThanOrEqual(C.FIREROLL_MIN_HEAT);
    expect(s.lastTrick.scoreGain).toBeGreaterThan(B + 1000);
  });
  // #268 Asche-Ökonomie: einen vollen Durchlauf (40 Stiche) spielen → am Durchlauf-Ende greift die Ascheschmiede.
  const playCycle = (s) => { let g = 0; while (s.cycle === 0 && g++ < 100) s = resolveTrick(s, noCrit); return s; };
  it("#268 Ascheschmiede: Kosten 20 / Value 3 — floor(Asche/Kosten) Schmiedungen je Durchlauf-Ende, Rest-Asche bleibt", () => {
    // 45 gebankte Asche, leere Schmiede, kein Brand (Asche wächst im Durchlauf nicht) → 45/20 = 2 Schmiedungen, Rest 5.
    const s = playCycle(scen(12, 0, { skills: ["SK_FIRE_15"], heat: heat({ value: 0 }), ash: 45 }));
    expect(s.ash).toBe(45 - 2 * C.FORGE_COST);                 // 5 < Kosten → bleibt liegen (banken)
    expect(Object.keys(s.forged)).toHaveLength(2);             // zwei verschiedene (die je aktuell niedrigsten) Karten
    expect(Object.values(s.forged).every((v) => v === C.FORGE_VALUE)).toBe(true); // je +3 Dauerwert
    expect(s.deck.find((c) => c.id === "X0").value).toBe(12 + C.FORGE_VALUE);
  });
  it("#268 Weißglut-Überlauf: bei voller Schmiede-Kapazität wird Rest-Asche in Score-Häppchen verbrannt (Asche < Kosten)", () => {
    // Kapazität voll: alle FORGE_MAX_CARDS Karten am Per-Karte-Deckel → keine Schmiedung mehr → Stufe 2 (Weißglut).
    const forged = {}; for (let i = 0; i < C.FORGE_MAX_CARDS; i++) forged[`X${i}`] = C.FORGE_MAX_PER_CARD;
    const s = playCycle(scen(12, 0, { skills: ["SK_FIRE_15"], heat: heat({ value: 0 }), ash: 50, forged: { ...forged } }));
    expect(s.ash).toBe(50 - 2 * C.FORGE_COST);                 // 2 Portionen à 20 verbrannt → 10 < Kosten
    expect(Object.keys(s.forged)).toHaveLength(C.FORGE_MAX_CARDS); // keine NEUE Karte geschmiedet (Kapazität voll)
    // Der Weißglut-Burst (2 × FORGE_OVERFLOW_SCORE) steckt im Durchlauf-Score des letzten Stichs.
    expect(s.lastCycleScore).toBeGreaterThanOrEqual(2 * C.FORGE_OVERFLOW_SCORE);
  });
});
