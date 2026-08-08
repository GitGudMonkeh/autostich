import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import { tierWeightsForShift } from "../src/game/rarity.js";
import { buildArchitectOffer } from "../src/game/architect.js";
import { emptyProfile, buyNode, unlockAllProfile } from "../src/game/progression.js";

// Skript-RNG: liefert die vorgegebenen Werte, danach 0.5. Erster rng()-Zug in buildArchitectOffer = Legendär-Check.
const seqRng = (vals) => { let i = 0; return () => (i < vals.length ? vals[i++] : 0.5); };
const NONMEI = ["B1", "B2", "B3", "A1", "A2", "R1", "R2", "R3"];

/* Schritt 3a — Progression-Baum an den Reducer-/Engine-Nähten (Baufeld-Cover + Rarität-Shift).
   Prinzip: Effekte NUR im Normal-Lauf (kein Meister/Dev), additiv, No-op für frische Profile & Sim. */

const start = (over = {}) => reducer({}, { type: "START_RUN", rng: Math.random, architect: true, ...over });
const withNodes = (ids, sp = 1000) => ids.reduce((p, id) => buyNode(p, id), emptyProfile(sp));

describe("rarity: neue Shift-3-Stufe (R3)", () => {
  it("existiert und schiebt weiter zu Rar/Legendär als Shift 2", () => {
    const s2 = tierWeightsForShift(2), s3 = tierWeightsForShift(3);
    expect(s3).toBeTruthy();
    expect(Object.values(s3).reduce((a, b) => a + b, 0)).toBe(100); // Gewichte summieren auf 100
    expect(s3[4]).toBeGreaterThan(s2[4]); // mehr Legendär-Gewicht
    expect(s3[1]).toBeLessThan(s2[1]);    // weniger Gewöhnlich
  });
});

describe("START_RUN: Baufeld-Cover aus dem Baum (Normal-Lauf)", () => {
  const baseCover = start().architect.maxCover; // frischer Normal-Lauf ohne Profil

  it("frisches/fehlendes Profil = No-op (Cover unverändert, Shift 0)", () => {
    const s = start();
    expect(s.architect.maxCover).toBe(baseCover);
    expect(s.treeRareShift || 0).toBe(0);
  });
  it("Baufeld B1..B3 → +4 Zellen (24→28-Logik: base+4)", () => {
    expect(start({ profile: withNodes(["B1"]) }).architect.maxCover).toBe(baseCover + 1);
    expect(start({ profile: withNodes(["B1", "B2"]) }).architect.maxCover).toBe(baseCover + 2);
    expect(start({ profile: withNodes(["B1", "B2", "B3"]) }).architect.maxCover).toBe(baseCover + 4);
  });
});

describe("START_RUN: Rarität-Shift aus dem Baum (Normal-Lauf)", () => {
  it("R1/R2/R3 → treeRareShift 1/2/3", () => {
    expect(start({ profile: withNodes(["R1"]) }).treeRareShift).toBe(1);
    expect(start({ profile: withNodes(["R1", "R2"]) }).treeRareShift).toBe(2);
    expect(start({ profile: withNodes(["R1", "R2", "R3"]) }).treeRareShift).toBe(3);
  });
  it("Vollausbau: Cover +4 und Shift 3 zusammen", () => {
    const s = start({ profile: unlockAllProfile(emptyProfile(0)) });
    expect(s.architect.maxCover).toBe(start().architect.maxCover + 4);
    expect(s.treeRareShift).toBe(3);
  });
});

describe("Gating: Meister-Lauf & Dev-Run ignorieren den Baum (kein Doppel-Bonus)", () => {
  it("Meister-Lauf mit Vollausbau-Profil → Baum aus (treeRareShift 0)", () => {
    const full = unlockAllProfile(emptyProfile(0));
    const s = start({ masterRun: true, masteryGrade: 3, profile: full });
    expect(s.treeRareShift || 0).toBe(0); // Baum gegatet → nur der Rang wirkt
  });
  it("Normal-Lauf mit Profil, aber grade 0 → nur der Baum wirkt", () => {
    const s = start({ profile: withNodes(["B1", "B2", "B3", "R1", "R2", "R3"]) });
    expect(s.masteryGrade).toBe(0);
    expect(s.treeRareShift).toBe(3);
    expect(s.architect.maxCover).toBe(start().architect.maxCover + 4);
  });
});

describe("M3 legDropDouble: Legendär-Drop ×2 (Perks & Gebäude)", () => {
  const withM3 = withNodes([...NONMEI, "M1", "M2", "M3"]); // isoliert M3 (kein M4/M5)

  it("treeLegMult = 2 im Normal-Lauf mit M3, sonst 1", () => {
    expect(start({ profile: withM3 }).treeLegMult).toBe(2);
    expect(start().treeLegMult || 1).toBe(1);                                   // frisch
    expect(start({ profile: withNodes([...NONMEI, "M1", "M2"]) }).treeLegMult).toBe(1); // ohne M3
  });
  it("Gating: Meister-Lauf ignoriert M3 (treeLegMult 1)", () => {
    expect(start({ masterRun: true, masteryGrade: 4, profile: unlockAllProfile(emptyProfile(0)) }).treeLegMult || 1).toBe(1);
  });
  it("buildArchitectOffer: legChanceMult verdoppelt die Legendär-Chance (0.03→0.06)", () => {
    const arch = { buildings: [] };
    const legend = (offers) => offers.some((o) => o.legendary);
    // rng-Erstwert 0.05 liegt zwischen 0.03 (×1) und 0.06 (×2): ×1 → kein Legendär, ×2 → Legendär.
    expect(legend(buildArchitectOffer(arch, seqRng([0.05]), 0, 1))).toBe(false);
    expect(legend(buildArchitectOffer(arch, seqRng([0.05]), 0, 2))).toBe(true);
  });
});
