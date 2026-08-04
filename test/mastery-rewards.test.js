import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import * as C from "../src/game/constants.js";
import { MAX_COVER as ARCH_MAX_COVER } from "../src/game/architect.js";
import { buildPerkOffer } from "../src/game/perks.js";
import { buildSkillOffer, isLegendarySkill } from "../src/game/skills.js";
import { rngAt } from "../src/game/rng.js";
import { masteryRerollBonus } from "../src/game/mastery.js";

// START_RUN mit gegebenem Grad; Architekt an, damit maxCover greift.
// startAt = normaler Lauf (masterRun false); startMaster = Meister-Lauf (masterRun true → der Rang zieht den Neuwurf-Pool).
const startAt = (grade) => reducer({}, { type: "START_RUN", rng: Math.random, architect: true, masteryGrade: grade });
const startMaster = (grade) => reducer({}, { type: "START_RUN", rng: Math.random, architect: true, masterRun: true, masteryGrade: grade });

describe("#217 START_RUN — Grad übersetzt in Lauf-Rewards", () => {
  it("#263 Reroll-Pools im MEISTER-Lauf: je Pool (Perk/Gebäude/Skill) aus dem Rang 0..5 → 0/1/2/3/3/3", () => {
    expect([0, 1, 2, 3, 4, 5].map((g) => startMaster(g).rerollsPerk)).toEqual([0, 1, 2, 3, 3, 3]);
    expect([0, 1, 2, 3, 4, 5].map((g) => startMaster(g).rerollsArch)).toEqual([0, 1, 2, 3, 3, 3]);
    expect([0, 1, 2, 3, 4, 5].map((g) => startMaster(g).rerollsSkill)).toEqual([0, 1, 2, 3, 3, 3]);
  });
  it("#263 Reroll-Pools im NORMALEN Lauf: drei getrennte Pools je feste Basis (2), unabhängig vom Grad", () => {
    for (const g of [0, 1, 2, 3, 4, 5]) {
      const s = startAt(g);
      expect([s.rerollsPerk, s.rerollsArch, s.rerollsSkill]).toEqual([C.BASE_REROLLS, C.BASE_REROLLS, C.BASE_REROLLS]);
    }
  });
  it("Baufeld-Deckel: +2 je Rang ab II (24/24/26/28/30/32)", () => {
    expect([0, 1, 2, 3, 4, 5].map((g) => startMaster(g).architect.maxCover))
      .toEqual([0, 0, 2, 4, 6, 8].map((b) => ARCH_MAX_COVER + b));
  });
  it("masteryGrade landet auf dem State (auch geklemmt)", () => {
    expect(startAt(3).masteryGrade).toBe(3);
    expect(startAt(99).masteryGrade).toBe(10);  // geklemmt auf den neuen Max (Großmeister V)
    expect(startAt(-2).masteryGrade).toBe(0);   // geklemmt
    expect(startAt(undefined).masteryGrade).toBe(0); // Sim/ohne Grad → 0
  });
  it("#226 Großmeister: START_RUN setzt state.difficulty (validierte Leiter je Rang; Meister/Basis = null No-op)", () => {
    expect(startAt(0).difficulty).toBe(null);                                                    // Basis
    expect(startAt(5).difficulty).toBe(null);                                                    // Meister V → kein Modifikator
    expect(startAt(6).difficulty).toEqual({ oppValue: 1 });                                      // Großmeister I
    expect(startAt(10).difficulty).toEqual({ oppValue: 3, oppRampEvery: 12, maxCycles: 54 });    // Großmeister V (härtester)
  });
  it("masterRun-Flag: default false, per Action gesetzt (steuert Rang-Balken + Leiter)", () => {
    expect(reducer({}, { type: "START_RUN", rng: Math.random, architect: true }).masterRun).toBe(false);
    expect(reducer({}, { type: "START_RUN", rng: Math.random, architect: true, masterRun: true, masteryGrade: 2 }).masterRun).toBe(true);
    // #263: Die Reroll-Pools hängen am masterRun-Flag: nur der Meister-Lauf zieht sie aus dem Rang (Rang 2 → masteryRerollBonus(2) = 2), je Kategorie.
    expect(reducer({}, { type: "START_RUN", rng: Math.random, architect: true, masterRun: true, masteryGrade: 2 }).rerollsPerk).toBe(masteryRerollBonus(2));
  });
  it("Grad 0 = Basiswerte (No-op) — identisch zum Start ohne masteryGrade", () => {
    const withZero = startAt(0);
    const without = reducer({}, { type: "START_RUN", rng: Math.random, architect: true });
    expect(withZero.rerollsPerk).toBe(without.rerollsPerk);
    expect(withZero.architect.maxCover).toBe(without.architect.maxCover);
    expect(without.masteryGrade).toBe(0);
    expect(without.masteryLegGranted).toBe(false);
  });
});

describe("#217 Rarität-Shift — buildPerkOffer(rareShift) verschiebt zu höheren Stufen", () => {
  // Über viele deterministische Angebote die Anteile hoher Familien-Stufen (III/IV) vergleichen.
  const highTierShare = (rareShift) => {
    let high = 0, total = 0;
    for (let c = 0; c < 400; c++) {
      const offer = buildPerkOffer([], {}, rngAt(777, c, "perk", 0), 3, 0, rareShift);
      for (const e of offer) if (e && e.familyId) { total++; if (e.tier >= 3) high++; }
    }
    return total ? high / total : 0;
  };
  it("shift 2 bietet spürbar mehr Selten/Rar als shift 0", () => {
    const base = highTierShare(0), shifted = highTierShare(2);
    expect(shifted).toBeGreaterThan(base * 1.3); // deutlicher Anstieg (Gewichte III 12→25, IV 3→12)
  });
  it("shift 0 = Basisverhalten (kein Drift): identisch zum Aufruf ohne rareShift-Param", () => {
    const a = buildPerkOffer([], {}, rngAt(5, 1, "perk", 0), 3, 0);      // alter 5-Arg-Aufruf
    const b = buildPerkOffer([], {}, rngAt(5, 1, "perk", 0), 3, 0, 0);   // neuer Param = 0
    expect(b).toEqual(a);
  });
});

describe("#272 — Legendäre kommen NICHT mehr ins Skill-Angebot (auch nicht per Meister-Garantie)", () => {
  it("guaranteeOne + Basis-Chance forciert KEINEN Legendär mehr — Legendäre laufen nur über die Legendär-Phase (Runde 29)", () => {
    // #272 löst den #217/#247-Legendär-im-Skill-Angebot ab: der guaranteeOne-Flag (Meisterrang) hat keine Wirkung mehr,
    // da buildSkillOffer Legendäre grundsätzlich ausschließt. Der Meisterrang-Code bleibt unangetastet (nur inert).
    for (const c of [1, 2, 3, 7, 42]) {
      const offer = buildSkillOffer([], ["lightning"], rngAt(1234, c, "skill", 0), C.SKILLS_OFFERED, C.SKILL_LEGENDARY_BASE, true);
      expect(offer.length).toBeGreaterThan(0);
      expect(offer.some(isLegendarySkill)).toBe(false);
    }
  });
  it("weder Chance noch Garantie → ebenfalls kein Legendär", () => {
    const offer = buildSkillOffer([], ["lightning"], rngAt(1234, 1, "skill", 0), C.SKILLS_OFFERED, 0);
    expect(offer.some(isLegendarySkill)).toBe(false);
  });
});
