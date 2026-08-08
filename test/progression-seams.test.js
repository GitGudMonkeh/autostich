import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import { tierWeightsForShift } from "../src/game/rarity.js";
import { emptyProfile, buyNode, unlockAllProfile } from "../src/game/progression.js";

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
