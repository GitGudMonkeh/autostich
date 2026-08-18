import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { readFileSync } from "node:fs";
import { reducer, initialState } from "../src/game/reducer.js";
import { isLegendarySkill } from "../src/game/skills.js";
import { makeRng } from "../src/game/deck.js";
import { PERK_DEFS } from "../src/game/perks.js";
import { precomputeArchitect, structureFactorMap, posOf, ROWS, COLS } from "../src/game/architect.js";
import { SEGMENT_SIZE } from "../src/game/formations.js";
import {
  SKILL_SLOTS, MEISTERHAND_SLOTS, SCHMIEDE_STEP, HOCHSEIL_MULT, OPFERGANG_VALUE, OPFERGANG_MULT,
  TAKTSCHLAG_MULT, BALLAST_ENERGY, BALLAST_FORM_MULT, FUNDAMENT_BONUS, FORMATION_ENERGY,
} from "../src/game/constants.js";

// Deck/Order-Helfer wie in engine.test.js: konstantes Spielerdeck gegen Wert 0 → jeder Stich ist ein Sieg,
// damit die Multiplikatoren isoliert messbar sind.
const N = 40;
const identity = () => Array.from({ length: N }, (_, i) => i);
const constDeck = (v) => Array.from({ length: N }, (_, i) => ({ id: `c${i}`, suit: "R", value: v, rank: v }));
const rng = makeRng(9);
function scenario(pVal, oVal, over = {}) {
  return { ...initialState(makeRng(1)), deck: constDeck(pVal), oppDeck: constDeck(oVal),
           playerOrder: identity(), oppOrder: identity(), ...over };
}
const gainOf = (s) => s.lastTrick.breakdown.total;

describe("Legendäre v0.3 — Ausbau & Deck (Pick-Zeitpunkt)", () => {
  it("L_MEIS Meisterhand: PICK_PERK hebt den Skill-Slot-Deckel dauerhaft", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L_MEIS"] };
    expect(s0.skillSlots ?? SKILL_SLOTS).toBe(SKILL_SLOTS);
    const s1 = reducer(s0, { type: "PICK_PERK", perkId: "L_MEIS", rng });
    expect(s1.perks).toContain("L_MEIS");
    expect(s1.skillSlots).toBe(SKILL_SLOTS + MEISTERHAND_SLOTS);
    expect(PERK_DEFS.L_MEIS.skillSlotBonus).toBe(MEISTERHAND_SLOTS);
  });

  /* Der gewonnene Slot muss SOFORT füllbar sein. Vorher war Meisterhand in der Praxis wirkungslos:
     Skill-Phasen liegen fest im DECISION_SCHEDULE und die Legendär-Phase ist die letzte davon — wer den
     Perk danach zieht (der Normalfall, legendäre Perks häufen sich in der 2. Perk-Phase), bekam einen Slot,
     für den nie wieder ein Angebot kam. */
  it("L_MEIS öffnet SOFORT eine Skill-Wahl (der gewonnene Slot bleibt nicht leer)", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L_MEIS"], seed: 4711,
                 skills: ["SK_FIRE_01"], activeArchetypes: ["fire"] };
    const s1 = reducer(s0, { type: "PICK_PERK", perkId: "L_MEIS", rng });
    expect(s1.phase).toBe("levelup");
    expect(s1.skillOffer.length).toBeGreaterThan(0);
    expect(s1.skillOfferBonus).toBe(true);
    // Kein legendärer SKILL aus diesem Angebot — der hat seine eigene Phase und seinen eigenen Slot (#272).
    expect(s1.skillOffer.some(isLegendarySkill)).toBe(false);
    // Und der Skill landet auch wirklich im Build.
    const s2 = reducer(s1, { type: "PICK_SKILL", skillId: s1.skillOffer[0], rng });
    expect(s2.skills).toContain(s1.skillOffer[0]);
    expect(s2.skillOffer).toBe(null);
    expect(s2.skillOfferBonus).toBe(false);
  });

  /* Das Bonus-Angebot ist ein GESCHENK, kein Rundenplatz: die „nie verschwendet"-Regel (Skill abgelehnt →
     stattdessen ein Perk) darf hier nicht greifen, sonst macht ein Perk zwei. */
  it("L_MEIS: das Bonus-Angebot ablehnen gibt KEIN Perk-Angebot als Ersatz", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L_MEIS"], seed: 4711,
                 skills: ["SK_FIRE_01"], activeArchetypes: ["fire"] };
    const s1 = reducer(s0, { type: "PICK_PERK", perkId: "L_MEIS", rng });
    expect(s1.skillOffer.length).toBeGreaterThan(0); // sonst prüfte der Test unten ins Leere
    const s2 = reducer(s1, { type: "DECLINE_SKILL", rng });
    expect(s2.phase).toBe("play");
    expect(s2.offer).toBe(null);
    expect(s2.skillOffer).toBe(null);
    expect(s2.skillOfferBonus).toBe(false);
    expect(s2.perks).toEqual(["L_MEIS"]);
  });

  /* Der Endzustand, um den es dem Spieler geht: nach der Legendär-Phase hält man 6 normale + 1 legendären
     Skill (= 7). Meisterhand macht daraus 8 — der Legendär zählt NICHT gegen den Deckel (#272). */
  it("L_MEIS nach der Legendär-Phase: aus 7 gehaltenen Skills werden 8", () => {
    const sixFire = ["SK_FIRE_01", "SK_FIRE_02", "SK_FIRE_03", "SK_FIRE_04", "SK_FIRE_05", "SK_FIRE_06"];
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L_MEIS"], seed: 4711,
                 skills: [...sixFire, "SK_FIRE_L01"], activeArchetypes: ["fire"] };
    expect(s0.skills).toHaveLength(7);
    const s1 = reducer(s0, { type: "PICK_PERK", perkId: "L_MEIS", rng });
    expect(s1.skillSlots).toBe(SKILL_SLOTS + MEISTERHAND_SLOTS);
    const s2 = reducer(s1, { type: "PICK_SKILL", skillId: s1.skillOffer[0], rng });
    expect(s2.skills).toHaveLength(8);
  });

  /* Der zweite Teil desselben Bugs lag in der OBERFLÄCHE: `SkillSelect` verglich `skills.length` (inkl. des
     legendären Skills) mit dem Deckel und hielt 6 normale + 1 legendären Skill schon bei 7 Slots für „voll" —
     der gewonnene Slot war über die Oberfläche nicht erreichbar. Das Projekt hat kein Component-Test-Setup;
     die Naht hängt deshalb an einer Quelltext-Ratsche (dieselbe Technik wie in global-board.test.js). */
  it("SkillSelect zählt den legendären Skill NICHT gegen den Slot-Deckel", () => {
    const src = readFileSync(new URL("../src/ui/SkillSelect.jsx", import.meta.url), "utf8");
    expect(src).toMatch(/const\s+full\s*=\s*normalHeld\s*>=\s*slots/);
    expect(src).not.toMatch(/skills\.length\s*>=\s*slots/);      // der alte, falsche Vergleich
    expect(src).toMatch(/isLegendarySkill/);                      // dieselbe Erkennung wie im Reducer
    expect(src).toMatch(/held\.filter\(\(s\) => !s\.legendary\)/); // Legendär steht nicht in der Ersetzen-Liste
    /* Der Ablehnen-Knopf verspricht sonst „Ablehnen → Perk" — beim Bonus-Angebot gibt es aber kein
       Ersatz-Perk (s. DECLINE_SKILL). Ein Knopf, der etwas anderes tut, als er sagt, ist ein Bug für sich. */
    expect(src).toMatch(/bonusOffer \? "skill\.declinePlain" : "skill\.decline"/);
    expect(src).toMatch(/const bonusOffer = !!state\.skillOfferBonus/);
  });

  it("L_OPFER Opfergang: senkt ALLE Kartenwerte dauerhaft, klemmt bei 1 (#34 kennt keine 0)", () => {
    const s0 = { ...initialState(makeRng(1)), phase: "levelup", offer: ["L_OPFER"], deck: constDeck(8) };
    const s1 = reducer(s0, { type: "PICK_PERK", perkId: "L_OPFER", rng });
    expect(s1.deck.every((c) => c.value === 8 - OPFERGANG_VALUE)).toBe(true);
    // Klemmung: ein Deck aus lauter 1ern darf nicht unter 1 fallen (sonst entstehen Werte, die RANKS nicht kennt).
    const low = reducer({ ...s0, deck: constDeck(1) }, { type: "PICK_PERK", perkId: "L_OPFER", rng });
    expect(low.deck.every((c) => c.value === 1)).toBe(true);
    // Gegenleistung hängt als scoreMult am Perk (läuft automatisch über prodHook, kein Engine-Flag).
    expect(PERK_DEFS.L_OPFER.scoreMult()).toBeCloseTo(OPFERGANG_MULT);
  });

  it("L_SCHM Schmiede: hebt am Durchlauf-Ende genau die schwächste Karte, deterministisch bei Gleichstand", () => {
    const deck = constDeck(7).map((c, i) => (i === 12 ? { ...c, value: 2 } : c)); // eine klar schwächste Karte
    const s = resolveTrick(scenario(7, 0, { perks: ["L_SCHM"], deck, pos: N - 1 }), rng);
    expect(s.cycle).toBe(1);                                    // Durchlauf-Ende erreicht
    expect(s.deck[12].value).toBe(2 + SCHMIEDE_STEP);
    expect(s.deck.filter((c) => c.value !== 7).length).toBe(1);  // NUR die eine Karte wurde angefasst
    // Gleichstand (alle gleich): kleinste id gewinnt → reproduzierbar, nicht reihenfolgeabhängig.
    const flat = resolveTrick(scenario(7, 0, { perks: ["L_SCHM"], pos: N - 1 }), rng);
    expect(flat.deck.find((c) => c.value === 7 + SCHMIEDE_STEP).id).toBe("c0");
  });
});

describe("Legendäre v0.3 — Multiplikatoren im Stich", () => {
  it("L_HOCH Hochseil: × solange der Durchlauf niederlagenfrei ist, danach aus", () => {
    const clean = resolveTrick(scenario(12, 0, { perks: ["L_HOCH"], cycleLosses: 0 }), rng);
    const dirty = resolveTrick(scenario(12, 0, { perks: ["L_HOCH"], cycleLosses: 1 }), rng);
    expect(clean.lastTrick.breakdown.perkMult).toBeCloseTo(HOCHSEIL_MULT, 6);
    expect(dirty.lastTrick.breakdown.perkMult).toBeCloseTo(1, 6);
    expect(gainOf(clean)).toBeCloseTo(gainOf(dirty) * HOCHSEIL_MULT, 6);
  });

  it("L_TAKT Taktschlag: nur der Abschluss-Stich eines KOMPLETT gewonnenen Segments zählt ×", () => {
    const closing = { perks: ["L_TAKT"], pos: SEGMENT_SIZE - 1, segmentWins: SEGMENT_SIZE - 1 }; // dieser Sieg macht 5/5
    const full = resolveTrick(scenario(12, 0, closing), rng);
    expect(full.lastTrick.breakdown.perkMult).toBeCloseTo(TAKTSCHLAG_MULT, 6);
    // Segment nicht komplett (eine Niederlage darin) → kein ×.
    const gap = resolveTrick(scenario(12, 0, { ...closing, segmentWins: SEGMENT_SIZE - 2 }), rng);
    expect(gap.lastTrick.breakdown.perkMult).toBeCloseTo(1, 6);
    // Mitten im Segment, selbst bei lupenreiner Serie → kein × (nur der Abschluss zahlt).
    const mid = resolveTrick(scenario(12, 0, { perks: ["L_TAKT"], pos: 1, segmentWins: 1 }), rng);
    expect(mid.lastTrick.breakdown.perkMult).toBeCloseTo(1, 6);
  });

  it("L_BALL Ballast: Formations-× gegen weniger Formationsenergie (negativer extraSwap)", () => {
    expect(PERK_DEFS.L_BALL.extraSwap).toBe(-BALLAST_ENERGY);
    const withB = resolveTrick(scenario(12, 0, { perks: ["L_BALL"] }), rng);
    const without = resolveTrick(scenario(12, 0, {}), rng);
    expect(withB.lastTrick.breakdown.formMult).toBeCloseTo(without.lastTrick.breakdown.formMult * BALLAST_FORM_MULT, 6);
    // Der PREIS läuft über die bestehende Energie-Summe der Aufstellphase (kein eigener Hook).
    const s = reducer({ ...initialState(makeRng(1)), phase: "play", perks: ["L_BALL"] }, { type: "RESET_FORMATION" });
    if (s.formationEnergy !== undefined) expect(s.formationEnergy).toBeLessThanOrEqual(FORMATION_ENERGY);
  });
});

describe("Legendäre v0.3 — Fundament (Strukturfaktoren)", () => {
  const fullRow = Array.from({ length: COLS }, (_, c) => posOf(0, c));

  it("hebt jeden Strukturfaktor additiv; ohne Perk bleibt alles unverändert", () => {
    const cover = new Set(fullRow);
    const base = structureFactorMap(cover);
    const boosted = structureFactorMap(cover, FUNDAMENT_BONUS);
    for (const p of fullRow) expect(boosted[p]).toBeCloseTo(base[p] + FUNDAMENT_BONUS, 6);
    // Default 0 → byte-identisch zum Bestand (alle Alt-Aufrufer/Tests unberührt).
    expect(structureFactorMap(cover, 0)).toEqual(base);
  });

  it("wirkt über precomputeArchitect bis in den segFactor", () => {
    const arch = { buildings: [{ id: "b1", familyId: "A_PRUNKSAAL", tier: "legendary", footprint: fullRow }], winCounters: {} };
    const plain = precomputeArchitect(arch, identity(), constDeck(12));
    const boosted = precomputeArchitect(arch, identity(), constDeck(12), FUNDAMENT_BONUS);
    expect(boosted.segFactor[fullRow[0]]).toBeGreaterThan(plain.segFactor[fullRow[0]]);
    expect(PERK_DEFS.L_FUND.fundament).toBeCloseTo(FUNDAMENT_BONUS);
    expect(PERK_DEFS.L_FUND.needsArchitect).toBe(true);
  });

  it("ROWS/COLS-Geometrie: eine volle Zeile ist eine Struktur, eine Teilzeile nicht", () => {
    expect(structureFactorMap(new Set(fullRow))[fullRow[0]]).toBeGreaterThan(1);
    expect(structureFactorMap(new Set(fullRow.slice(0, COLS - 1)))[fullRow[0]]).toBe(1);
    expect(ROWS * COLS).toBe(N);
  });
});
