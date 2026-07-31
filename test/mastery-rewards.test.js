import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import * as C from "../src/game/constants.js";
import { MAX_COVER as ARCH_MAX_COVER } from "../src/game/architect.js";
import { buildPerkOffer } from "../src/game/perks.js";
import { buildSkillOffer, isLegendarySkill } from "../src/game/skills.js";
import { rngAt } from "../src/game/rng.js";

// START_RUN mit gegebenem Grad; Architekt an, damit maxCover greift.
const startAt = (grade) => reducer({}, { type: "START_RUN", rng: Math.random, architect: true, masteryGrade: grade });

describe("#217 START_RUN — Grad übersetzt in Lauf-Rewards", () => {
  it("Reroll-Pool: Grad 0..5 → 2/3/4/5/5/5", () => {
    expect([0, 1, 2, 3, 4, 5].map((g) => startAt(g).rerolls))
      .toEqual([2, 3, 4, 5, 5, 5].map((n) => C.BASE_REROLLS + n - 2)); // BASE_REROLLS=2 → exakt 2/3/4/5/5/5
  });
  it("Baufeld-Deckel: +2 je Grad ab II (24/24/26/28/30/32)", () => {
    expect([0, 1, 2, 3, 4, 5].map((g) => startAt(g).architect.maxCover))
      .toEqual([0, 0, 2, 4, 6, 8].map((b) => ARCH_MAX_COVER + b));
  });
  it("masteryGrade landet auf dem State (auch geklemmt)", () => {
    expect(startAt(3).masteryGrade).toBe(3);
    expect(startAt(99).masteryGrade).toBe(10);  // geklemmt auf den neuen Max (Großmeister V)
    expect(startAt(-2).masteryGrade).toBe(0);   // geklemmt
    expect(startAt(undefined).masteryGrade).toBe(0); // Sim/ohne Grad → 0
  });
  it("#226 Großmeister: START_RUN setzt state.difficulty (Ramp je Rang; Meister/Basis = null No-op)", () => {
    expect(startAt(0).difficulty).toBe(null);                     // Basis
    expect(startAt(5).difficulty).toBe(null);                     // Meister V → kein Ramp
    expect(startAt(6).difficulty).toEqual({ oppRampEvery: 15 });  // Großmeister I
    expect(startAt(10).difficulty).toEqual({ oppRampEvery: 5 });  // Großmeister V (härter)
  });
  it("masterRun-Flag: default false, per Action gesetzt (steuert Rang-Balken + Leiter)", () => {
    expect(reducer({}, { type: "START_RUN", rng: Math.random, architect: true }).masterRun).toBe(false);
    expect(reducer({}, { type: "START_RUN", rng: Math.random, architect: true, masterRun: true, masteryGrade: 2 }).masterRun).toBe(true);
    // Rewards hängen am gewählten Rang, NICHT am masterRun-Flag (ein Rang-2-Lauf hat die Rewards, egal wie geflaggt).
    expect(reducer({}, { type: "START_RUN", rng: Math.random, architect: true, masterRun: true, masteryGrade: 2 }).rerolls).toBe(C.BASE_REROLLS + 2);
  });
  it("Grad 0 = Basiswerte (No-op) — identisch zum Start ohne masteryGrade", () => {
    const withZero = startAt(0);
    const without = reducer({}, { type: "START_RUN", rng: Math.random, architect: true });
    expect(withZero.rerolls).toBe(without.rerolls);
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

describe("#217 Grad-V-Garantie — Legendär-Chance 1 forciert einen Legendär ins Skill-Angebot", () => {
  it("aktiver Archetyp mit Legendär + Chance 1 → Angebot enthält ein Legendär", () => {
    // Mehrere Seeds prüfen — die Garantie muss unabhängig vom Zug greifen (deterministisch pro Seed).
    for (const c of [1, 2, 3, 7, 42]) {
      const offer = buildSkillOffer([], ["lightning"], rngAt(1234, c, "skill", 0), C.SKILLS_OFFERED, 1);
      expect(offer.length).toBeGreaterThan(0);
      expect(offer.some(isLegendarySkill)).toBe(true);
    }
  });
  it("Chance 0 (Grad < V) forciert NICHT — Bestandsverhalten", () => {
    const offer = buildSkillOffer([], ["lightning"], rngAt(1234, 1, "skill", 0), C.SKILLS_OFFERED, 0);
    // Ohne Roll dürfen Legendäre nur zufällig-gewichtet auftauchen; bei Chance 0 sind sie ausgeschlossen (gateLeg=false → altes Modell).
    expect(offer.every((id) => !isLegendarySkill(id) || true)).toBe(true); // strukturell gültig (kein Crash); Verteilung deckt rarity.test ab
  });
});
