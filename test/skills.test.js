import { describe, it, expect } from "vitest";
import { makeRng } from "../src/game/deck.js";
import { SKILL_DEFS, skillSum, initLightning, lightningCritRaw, addCharge, buildSkillOffer, archetypeOf,
  offerArchetypes, archetypesWithSkills, decodeArchetypes,
  ionScoreFor, consumesCharge, ionizeCountFor, consumeCharge, ionizeCards,
  hasIonize, hasProtect, hasStorm, chargeFloorFor } from "../src/game/skills.js";
import { LIGHTNING_CRIT_BASE, LIGHTNING_CRIT_PER_SKILL, LIGHTNING_MAX_CHARGE } from "../src/game/constants.js";

const LR = "SK_LIGHTNING_01";
const ALL = Object.keys(SKILL_DEFS);
const active = (over = {}) => ({ active: true, charge: 0, maxCharge: LIGHTNING_MAX_CHARGE, ...over });

describe("skills — Blitz-Registry", () => {
  it("Blitzableiter: Hooks (critChance/chargeOnCrit/scoreFlatOnCrit) + archetype", () => {
    expect(SKILL_DEFS[LR].critChance()).toBeCloseTo(LIGHTNING_CRIT_PER_SKILL);
    expect(SKILL_DEFS[LR].chargeOnCrit()).toBe(1);
    expect(SKILL_DEFS[LR].scoreFlatOnCrit()).toBe(50);
    expect(archetypeOf(LR)).toBe("lightning");
  });
  it("skillSum summiert einen Hook über die gehaltenen Skills (fehlender Hook → 0)", () => {
    expect(skillSum([LR], "chargeOnCrit", {})).toBe(1);
    expect(skillSum([], "chargeOnCrit", {})).toBe(0);
    expect(skillSum([LR], "healOnWin", {})).toBe(0);
  });
});

describe("lightningCritRaw — Crit-Basis (Abschnitt 2a)", () => {
  it("0, solange der Archetyp inaktiv ist", () => {
    expect(lightningCritRaw(null, [])).toBe(0);
    expect(lightningCritRaw(initLightning(), [LR])).toBe(0); // active:false
  });
  it("Sockel + je Skill, wenn aktiv", () => {
    expect(lightningCritRaw(active(), [])).toBeCloseTo(LIGHTNING_CRIT_BASE);                              // nur Sockel
    expect(lightningCritRaw(active(), [LR])).toBeCloseTo(LIGHTNING_CRIT_BASE + LIGHTNING_CRIT_PER_SKILL); // Sockel + 1× pro-Skill
  });
});

describe("addCharge — gedeckelt & immutabel", () => {
  it("no-op, solange inaktiv", () => {
    expect(addCharge(initLightning(), 3).charge).toBe(0);
    expect(addCharge(null, 3)).toBe(null);
  });
  it("erhöht und deckelt auf maxCharge", () => {
    expect(addCharge(active({ charge: 5 }), 2).charge).toBe(7);
    expect(addCharge(active({ charge: 9 }), 5).charge).toBe(LIGHTNING_MAX_CHARGE);
  });
  it("lässt das Original unverändert", () => {
    const l = active({ charge: 3 });
    addCharge(l, 2);
    expect(l.charge).toBe(3);
  });
});

describe("archetypesWithSkills / offerArchetypes (Prototyp: alle 3 Archetypen)", () => {
  it("F3: lightning, fire & ice haben Skills; alles owned → keiner", () => {
    expect(archetypesWithSkills([])).toEqual(["lightning", "fire", "ice"]); // Reihenfolge = ARCHETYPE_ORDER
    expect(archetypesWithSkills(ALL)).toEqual([]);
  });
  it("0 aktiv → ALLE verfügbaren Archetypen (Prototyp: Cap 3)", () => {
    expect(offerArchetypes([], ["lightning"], makeRng(3))).toEqual(["lightning"]);           // nur 1 verfügbar
    expect(offerArchetypes([], ["lightning", "fire", "ice"], makeRng(3))).toHaveLength(3);   // alle 3
  });
  it("1 aktiv → aktiver + alle übrigen verfügbaren", () => {
    const r = offerArchetypes(["lightning"], ["lightning", "fire", "ice"], makeRng(3));
    expect(r).toContain("lightning");
    expect(r).toHaveLength(3);
    expect(new Set(r)).toEqual(new Set(["lightning", "fire", "ice"]));
  });
  it("2 aktiv → beide aktiven + der dritte (kein Cap mehr bei 2)", () => {
    expect(new Set(offerArchetypes(["lightning", "fire"], ["lightning", "fire", "ice"], makeRng(3))))
      .toEqual(new Set(["lightning", "fire", "ice"]));
  });
});

describe("buildSkillOffer (Prototyp: 2+2+2 über alle 3 Archetypen)", () => {
  it("liefert count distinkte, nicht-gehaltene Skills, deterministisch bei festem Seed", () => {
    const off = buildSkillOffer([], [], makeRng(1), 6);
    expect(off).toEqual(buildSkillOffer([], [], makeRng(1), 6));
    expect(off).toHaveLength(6);
    expect(new Set(off).size).toBe(6);
    expect(off.every((id) => SKILL_DEFS[id])).toBe(true);
    const archs = new Set(off.map(archetypeOf));
    expect(archs).toEqual(new Set(["lightning", "fire", "ice"])); // alle 3 vertreten (2 je Archetyp)
    // #156: verschiedene Seeds → (meist) verschiedenes Angebot — der Seed treibt die Auswahl wirklich.
    const offers = Array.from({ length: 8 }, (_, s) => buildSkillOffer([], [], makeRng(s + 1), 6).join(","));
    expect(new Set(offers).size).toBeGreaterThan(1);
  });
  it("bereits gehaltene werden nicht erneut angeboten; leerer Pool → []", () => {
    expect(buildSkillOffer([LR], [], makeRng(1), 4)).not.toContain(LR);
    expect(buildSkillOffer(ALL, [], makeRng(1), 4)).toEqual([]);
  });

  // ---- Expliziter Legendär-Roll (Shop #107 S5c) ----
  it("ohne Legendär-Chance (0) bleibt das Verhalten unverändert (kein rng-Drift)", () => {
    expect(buildSkillOffer([], [], makeRng(1), 6, 0)).toEqual(buildSkillOffer([], [], makeRng(1), 6));
  });
  it("legendaryChance=1 erzwingt genau EINEN legendären Skill, Chance>0 nie zwei", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const off = buildSkillOffer([], [], makeRng(seed), 6, 1);
      expect(off).toHaveLength(6);
      expect(off.filter((id) => SKILL_DEFS[id].legendary)).toHaveLength(1);
    }
    for (let seed = 1; seed <= 40; seed++)
      expect(buildSkillOffer([], [], makeRng(seed), 6, 0.5).filter((id) => SKILL_DEFS[id].legendary).length).toBeLessThanOrEqual(1);
  });
  it("Legendär-Roll erhält die 2+2+2-Archetyp-Balance (#129)", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const off = buildSkillOffer([], [], makeRng(seed), 6, 1); // erzwungener Legendär (Chance 1)
      expect(off).toHaveLength(6);
      const byArch = { lightning: 0, fire: 0, ice: 0 };
      for (const id of off) byArch[archetypeOf(id)]++;
      // Jeder Archetyp genau 2 (einer davon legendär) — der Legendär ersetzt einen normalen Skill SEINES Archetyps.
      expect(byArch).toEqual({ lightning: 2, fire: 2, ice: 2 });
    }
  });
  it("bietet NIE einen gehaltenen Skill an und nie ein Duplikat (Invariante, #118)", () => {
    for (const owned of [[], [LR], ALL.slice(0, 5), ALL.slice(0, 20)]) {
      for (let seed = 1; seed <= 30; seed++) {
        const off = buildSkillOffer(owned, ["lightning", "fire"], makeRng(seed), 6, 0.5);
        expect(off.some((id) => owned.includes(id))).toBe(false); // nie ein gehaltener Skill
        expect(new Set(off).size).toBe(off.length);               // nie ein Duplikat
      }
    }
  });
});

describe("Ionisierung — Helfer (Stufe B)", () => {
  const I = "SK_LIGHTNING_02", K = "SK_LIGHTNING_03";
  const mkDeck = (stacks) => stacks.map((s, i) => ({ id: `c${i}`, suit: "R", baseRank: 1, value: 1, ...(s ? { ionStacks: s } : {}) }));

  it("ionScoreFor: +25 je Stapel (0 ohne / null)", () => {
    expect(ionScoreFor({ ionStacks: 3 })).toBe(75);
    expect(ionScoreFor({ ionStacks: 0 })).toBe(0);
    expect(ionScoreFor({})).toBe(0);
    expect(ionScoreFor(null)).toBe(0);
  });
  it("consumesCharge nur mit Ionisierung; ionizeCountFor = 2 (+2 mit Kettenblitz)", () => {
    expect(consumesCharge([I])).toBe(true);
    expect(consumesCharge([K])).toBe(false);   // Kettenblitz allein ist kein Verbraucher
    expect(consumesCharge([])).toBe(false);
    expect(ionizeCountFor([I])).toBe(2);
    expect(ionizeCountFor([I, K])).toBe(4);
  });
  it("consumeCharge setzt auf den Boden (Default 0, Stufe C: Reststrom)", () => {
    expect(consumeCharge(active({ charge: 10 })).charge).toBe(0);
    expect(consumeCharge(active({ charge: 10 }), 3).charge).toBe(3);
  });
  it("ionizeCards: count distinkte ungespielte Karten je +1 (immutabel)", () => {
    const deck = mkDeck([0, 0, 0, 0, 0]);
    const out = ionizeCards(deck, [1, 2, 3, 4], 2, makeRng(1));
    const bumped = out.filter((c) => (c.ionStacks || 0) > 0);
    expect(bumped).toHaveLength(2);
    expect(bumped.every((c) => c.ionStacks === 1)).toBe(true);
    expect(deck.every((c) => !c.ionStacks)).toBe(true); // Original unverändert
  });
  it("ionizeCards Fallback: zu wenige ungespielte Karten → Rest auf bereits ionisierte", () => {
    const deck = mkDeck([2, 0, 0]); // c0 schon ionisiert, nur c1 ungespielt
    const out = ionizeCards(deck, [1], 3, makeRng(1));
    const total = out.reduce((s, c) => s + (c.ionStacks || 0), 0);
    expect(total).toBe(2 + 3); // 3 Stapel verteilt, nichts verloren
  });
});

describe("Reaktoren + Geladene Serie — Helfer (Stufe C)", () => {
  const R = "SK_LIGHTNING_05", G = "SK_LIGHTNING_06", S = "SK_LIGHTNING_07", I = "SK_LIGHTNING_02";
  it("Verbraucher-Prädikate: Ionisierung/Geladene Serie sind Verbraucher, Reststrom nicht", () => {
    expect(hasIonize([I])).toBe(true);
    expect(hasProtect([S])).toBe(true);
    expect(hasProtect([I])).toBe(false);
    expect(consumesCharge([S])).toBe(true);   // Geladene Serie verbraucht ebenfalls
    expect(consumesCharge([R])).toBe(false);  // Reststrom ist Reaktor, kein Verbraucher
  });
  it("chargeFloorFor: Reststrom setzt Boden 3, sonst 0", () => {
    expect(chargeFloorFor([R])).toBe(3);
    expect(chargeFloorFor([])).toBe(0);
  });
  it("hasStorm nur mit Gewitterfront", () => {
    expect(hasStorm([G])).toBe(true);
    expect(hasStorm([R])).toBe(false);
  });
  it("lightningCritRaw addiert den Gewitterfront-Bonus (stormCritBonus)", () => {
    const l = { active: true, charge: 0, maxCharge: 10, stormCritBonus: 0.08 };
    expect(lightningCritRaw(l, [G])).toBeCloseTo(LIGHTNING_CRIT_BASE + LIGHTNING_CRIT_PER_SKILL + 0.08); // Sockel + Skill-critChance + Storm(0,08)
  });
});

describe("decodeArchetypes — Board-Icons (#139)", () => {
  it("leerer/undefinierter Wert → []", () => {
    expect(decodeArchetypes("")).toEqual([]);
    expect(decodeArchetypes(null)).toEqual([]);
    expect(decodeArchetypes(undefined)).toEqual([]);
  });
  it("bekannte Keys immer in fester Reihenfolge Blitz→Feuer→Eis (unabhängig vom Input)", () => {
    expect(decodeArchetypes("ice,fire")).toEqual(["fire", "ice"]);
    expect(decodeArchetypes("fire,lightning")).toEqual(["lightning", "fire"]);
    expect(decodeArchetypes("lightning")).toEqual(["lightning"]);
  });
  it("ein Eintrag pro Skill → Wiederholung bleibt erhalten (ein Icon je Skill)", () => {
    expect(decodeArchetypes("fire,fire,fire,fire")).toEqual(["fire", "fire", "fire", "fire"]); // 4 Feuer
    expect(decodeArchetypes("fire,ice,fire,ice")).toEqual(["fire", "fire", "ice", "ice"]);     // 2 Feuer + 2 Eis, gruppiert
    expect(decodeArchetypes("ice,lightning,fire")).toEqual(["lightning", "fire", "ice"]);       // je 1, feste Reihenfolge
  });
  it("unbekannte Tokens werden ignoriert (Zählung bleibt korrekt)", () => {
    expect(decodeArchetypes("fire,water,fire,ice")).toEqual(["fire", "fire", "ice"]);
    expect(decodeArchetypes("bogus")).toEqual([]);
  });
});
