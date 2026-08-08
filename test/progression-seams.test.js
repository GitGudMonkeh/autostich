import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import { tierWeightsForShift } from "../src/game/rarity.js";
import { buildArchitectOffer } from "../src/game/architect.js";
import { buildPerkOffer, isLegendary } from "../src/game/perks.js";
import { buildLegendaryOffer, isLegendarySkill, buildSkillOffer, archetypeOf } from "../src/game/skills.js";
import { unlockedArchetypes } from "../src/game/progression.js";
import { perkPhaseAt, LEG_PERK2_PHASE } from "../src/game/constants.js";
import { emptyProfile, buyNode, unlockAllProfile, nodeEffects, legPerk2Force, rerollBase, REROLL_CAP, maxRarityTier, legendaryPhaseUnlocked } from "../src/game/progression.js";
import { BASE_REROLLS } from "../src/game/constants.js";
import { makeRng } from "../src/game/deck.js";

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

describe("Gating: Normal-Lauf mit Profil zieht den Baum", () => {
  it("Normal-Lauf mit Profil → der Baum wirkt (treeRareShift + Baufeld)", () => {
    const s = start({ profile: withNodes(["B1", "B2", "B3", "R1", "R2", "R3"]) });
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
  it("buildArchitectOffer: legChanceMult verdoppelt die Legendär-Chance (0.03→0.06)", () => {
    const arch = { buildings: [] };
    const legend = (offers) => offers.some((o) => o.legendary);
    // rng-Erstwert 0.05 liegt zwischen 0.03 (×1) und 0.06 (×2): ×1 → kein Legendär, ×2 → Legendär.
    expect(legend(buildArchitectOffer(arch, seqRng([0.05]), 0, 1))).toBe(false);
    expect(legend(buildArchitectOffer(arch, seqRng([0.05]), 0, 2))).toBe(true);
  });
});

describe("M4/M5: garantierte Legendäre in der 2. Perk-Phase", () => {
  const withM4 = withNodes([...NONMEI, "M1", "M2", "M3", "M4"]); // M4, nicht M5
  const legCount = (offer) => offer.filter((o) => typeof o === "string" && isLegendary(o)).length;

  it("legPerk2Force: 0 / M4→1 / M5→3", () => {
    expect(legPerk2Force(nodeEffects(emptyProfile(0)))).toBe(0);
    expect(legPerk2Force(nodeEffects(withM4))).toBe(1);
    expect(legPerk2Force(nodeEffects(unlockAllProfile(emptyProfile(0))))).toBe(3);
    expect(legPerk2Force(null)).toBe(0);
  });
  it("perkPhaseAt erkennt die 2. Perk-Phase; Default LEG_PERK2_PHASE = 2", () => {
    const sched = ["skill", "perk", "formation", "shop", "skill", "perk", "formation"];
    expect(perkPhaseAt(sched, 1)).toBe(1);
    expect(perkPhaseAt(sched, 5)).toBe(2);
    expect(perkPhaseAt(sched, 2)).toBe(0); // formation
    expect(LEG_PERK2_PHASE).toBe(2);
  });
  it("buildPerkOffer legForce: 1 → 1 Legendär + 2 Perks; 3 → 3 Legendäre", () => {
    const off1 = buildPerkOffer([], {}, () => 0.4, 3, 0, 0, false, 1);
    expect(off1.length).toBe(3);
    expect(legCount(off1)).toBe(1);
    const off3 = buildPerkOffer([], {}, () => 0.4, 3, 0, 0, false, 3);
    expect(off3.length).toBe(3);
    expect(legCount(off3)).toBe(3);
  });
  it("legForce liefert VERSCHIEDENE Legendäre (keine Doppel)", () => {
    const off3 = buildPerkOffer([], {}, () => 0.4, 3, 0, 0, false, 3);
    const legs = off3.filter((o) => typeof o === "string" && isLegendary(o));
    expect(new Set(legs).size).toBe(legs.length);
  });
  it("START_RUN: treeLegForce2 = 1 (M4) / 3 (M5) / 0 (frisch)", () => {
    expect(start({ profile: withM4 }).treeLegForce2).toBe(1);
    expect(start({ profile: unlockAllProfile(emptyProfile(0)) }).treeLegForce2).toBe(3);
    expect(start().treeLegForce2 || 0).toBe(0);
  });
});

describe("M1: Reroll fürs R29-Legendär-Angebot", () => {
  it("START_RUN: rerollsLeg = 1 mit M1, sonst 0", () => {
    expect(start({ profile: withNodes(["M1"]) }).rerollsLeg).toBe(1);
    expect(start().rerollsLeg || 0).toBe(0);
  });

  const legState = () => {
    const offer = buildLegendaryOffer(["fire", "ice"], [], () => 0.3);
    return { phase: "legendary", legendaryOffer: offer, activeArchetypes: ["fire", "ice"], skills: [],
      cycle: 28, seed: 12345, offerRerolls: 0, rerollsUsed: 0, rerollsLeg: 1 };
  };

  it("REROLL_LEGENDARY: neues Angebot, Token −1, rerollsUsed +1, offerRerolls +1", () => {
    const s0 = legState();
    expect(s0.legendaryOffer.length).toBeGreaterThan(0);
    const s1 = reducer(s0, { type: "REROLL_LEGENDARY", rng: Math.random });
    expect(s1.rerollsLeg).toBe(0);
    expect(s1.rerollsUsed).toBe(1);
    expect(s1.offerRerolls).toBe(1);
    expect(s1.legendaryOffer.length).toBeGreaterThan(0);
  });
  it("ohne Token → No-op (gleiche Referenz)", () => {
    const s0 = { ...legState(), rerollsLeg: 0 };
    expect(reducer(s0, { type: "REROLL_LEGENDARY", rng: Math.random })).toBe(s0);
  });
  it("außerhalb der Legendär-Phase → No-op", () => {
    const s0 = { ...legState(), phase: "play" };
    expect(reducer(s0, { type: "REROLL_LEGENDARY", rng: Math.random })).toBe(s0);
  });
});

describe("(Schritt 4a) Reroll-Basis: Onboarding-Glied 1 + A1/A2, Cap 3", () => {
  const withOnb = (onb, ids = []) => ({ ...ids.reduce((p, id) => buyNode(p, id), emptyProfile(1000)), onboarding: onb });

  it("rerollBase (rein): erster Lauf 0, ab Glied 1 = 1, + A1/A2, Cap 3", () => {
    expect(rerollBase(withOnb(0))).toBe(0);            // erster Lauf: 0 (bewusst)
    expect(rerollBase(withOnb(1))).toBe(1);            // Onboarding-Basis
    expect(rerollBase(withOnb(6))).toBe(1);            // ohne Auftakt-Knoten bleibt 1
    expect(rerollBase(withOnb(1, ["A1"]))).toBe(2);    // +A1
    expect(rerollBase(withOnb(1, ["A1", "A2"]))).toBe(3); // +A1+A2 = Cap
    expect(rerollBase(withOnb(6, ["A1", "A2"]))).toBe(REROLL_CAP);
    expect(rerollBase(withOnb(0, ["A1", "A2"]))).toBe(2); // Basis 0 + 2 Knoten
  });
  it("START_RUN: profil-los = BASE_REROLLS (Sim/Standard, kein Shift)", () => {
    const s = start(); // kein Profil
    expect(s.rerollsPerk).toBe(BASE_REROLLS);
    expect(s.rerollsArch).toBe(BASE_REROLLS);
    expect(s.rerollsSkill).toBe(BASE_REROLLS);
  });
  it("START_RUN: Normal-Lauf mit Profil folgt rerollBase (alle drei Pools)", () => {
    expect(start({ profile: withOnb(0) }).rerollsPerk).toBe(0);       // erster Lauf
    expect(start({ profile: withOnb(1) }).rerollsSkill).toBe(1);
    const full = start({ profile: withOnb(6, ["A1", "A2"]) });
    expect([full.rerollsPerk, full.rerollsArch, full.rerollsSkill]).toEqual([3, 3, 3]);
  });
});

describe("(Schritt 6) Ranglisten-Standard = tree-unabhängige Baseline (§7/§8)", () => {
  const maxed = unlockAllProfile(emptyProfile(1000)); // alle Knoten + Onboarding 6

  it("Standard-Lauf ignoriert den Baum trotz VOLLEM Profil (fix 2 Rerolls, kein Shift/Deckel/Gate)", () => {
    const s = start({ profile: maxed, ranked: "standard" });
    expect([s.rerollsPerk, s.rerollsArch, s.rerollsSkill]).toEqual([2, 2, 2]); // fix BASE_REROLLS, nicht rerollBase
    expect(s.treeRareShift).toBe(0);          // kein Baum-RareShift
    expect(s.rareCap).toBe(4);                // kein Deckel (alle Stufen)
    expect(s.unlockedArchetypes).toBe(null);  // alle Archetypen, keine Onboarding-Gatung
    expect(s.legPhaseEnabled).toBe(true);     // R29 an
    expect(s.ranked).toBe("standard");
  });
  it("Gegenprobe: derselbe Profil-Stand als NORMAL-Lauf zieht die Baum-Boni", () => {
    const n = start({ profile: maxed }); // kein ranked
    expect(n.rerollsPerk).toBe(3);       // Onboarding-Basis 1 + A1 + A2
    expect(n.treeRareShift).toBe(3);     // R3
    expect(n.ranked).toBe(null);
  });
  it("Meister-Lauf spielt den VOLLEN Baum — unabhängig vom (fehlenden) Profil", () => {
    const s = start({ ranked: "meister" }); // KEIN Profil übergeben
    expect([s.rerollsPerk, s.rerollsArch, s.rerollsSkill]).toEqual([3, 3, 3]); // voller Baum: 1 + A1 + A2
    expect(s.treeRareShift).toBe(3);   // R3
    expect(s.rareCap).toBe(4);
    expect(s.legPhaseEnabled).toBe(true);
    expect(s.treeLegForce2).toBe(3);   // M5: 3 Legendäre zur Wahl in der 2. Perk-Phase
    expect(s.ranked).toBe("meister");
  });
});

describe("(Schritt 4f) R29-Legendär-Capstone (Onboarding-Glied 6)", () => {
  // Treibt einen echten Lauf ab cycle 27 (nächster Runden-Endpunkt → cycle 28 = R29-Decision) bis zum Phasenwechsel.
  const driveToR29 = (legPhaseEnabled) => {
    const base = start();
    let s = { ...base, phase: "play", cycle: 27, pos: 0, skills: [], activeArchetypes: ["fire"], skillOffer: null, offer: null, legendaryOffer: null, legPhaseEnabled };
    const rng = makeRng(9);
    let guard = 0;
    while (s.phase === "play") { if (++guard > 3000) throw new Error("kein R29-Übergang"); s = reducer(s, { type: "RESOLVE_TRICK", rng }); }
    return s;
  };

  it("legendaryPhaseUnlocked (rein): erst ab Glied 6", () => {
    expect([0, 1, 2, 3, 4, 5].map(legendaryPhaseUnlocked)).toEqual([false, false, false, false, false, false]);
    expect(legendaryPhaseUnlocked(6)).toBe(true);
  });
  it("START_RUN: legPhaseEnabled — Normal <6 aus, ≥6 an; Sim/Standard an", () => {
    expect(start({ profile: { ...emptyProfile(0), onboarding: 5 } }).legPhaseEnabled).toBe(false);
    expect(start({ profile: { ...emptyProfile(0), onboarding: 6 } }).legPhaseEnabled).toBe(true);
    expect(start().legPhaseEnabled).toBe(true); // profil-los (Sim/Standard-Rangliste)
  });
  it("R29 MIT Freischaltung → Legendär-Pick-Phase (wie Standard-Rangliste)", () => {
    const s = driveToR29(true);
    expect(s.phase).toBe("legendary");
    expect(s.legendaryOffer.length).toBeGreaterThan(0);
  });
  it("R29 OHNE Freischaltung (Onboarding < 6) → normale Perk-Phase, keine Legendär-Phase", () => {
    const s = driveToR29(false);
    expect(s.phase).toBe("levelup");
    expect(s.legendaryOffer).toBeNull();
    expect(s.offer.length).toBeGreaterThan(0); // Perk-Angebot statt Legendär
  });
});

describe("(Schritt 4c) Onboarding-Rarität-Deckel (grau/grün → +blau → +violett)", () => {
  // mulberry32 — deterministischer Sampler für Angebots-Ziehungen über viele Seeds
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  it("maxRarityTier: Start II (grau/grün); Glied 3 → III (blau); Glied 5 → IV (violett)", () => {
    expect([0, 1, 2].map(maxRarityTier)).toEqual([2, 2, 2]);
    expect([3, 4].map(maxRarityTier)).toEqual([3, 3]);
    expect([5, 6].map(maxRarityTier)).toEqual([4, 4]);
  });
  it("tierWeightsForShift: Deckel nullt höhere Stufen; 4 = Identität (kein Drift)", () => {
    expect(tierWeightsForShift(0, 4)).toBe(tierWeightsForShift(0)); // dieselbe Referenz = byte-identisch
    expect(tierWeightsForShift(3, 2)).toEqual({ 1: 30, 2: 20, 3: 0, 4: 0 });
    expect(tierWeightsForShift(3, 3)).toEqual({ 1: 30, 2: 20, 3: 30, 4: 0 });
  });
  it("buildPerkOffer: Deckel 2 bietet nie Familien-Stufe III/IV (auch bei starkem Shift)", () => {
    for (let s = 1; s <= 40; s++) {
      const offer = buildPerkOffer([], {}, mulberry(s), 6, 0, 3 /*starker Shift zu III/IV*/, true, 0, 2 /*Deckel II*/);
      for (const o of offer) if (o && typeof o === "object" && o.tier) expect(o.tier).toBeLessThanOrEqual(2);
    }
  });
  it("buildPerkOffer: ohne Deckel (4) byte-identisch zum Aufruf ohne Param", () => {
    for (let s = 1; s <= 20; s++) {
      expect(buildPerkOffer([], {}, mulberry(s), 6, 0, 3, true, 0, 4)).toEqual(buildPerkOffer([], {}, mulberry(s), 6, 0, 3, true, 0));
    }
  });
  it("buildArchitectOffer: Deckel 2 bietet nie Gebäude-Stufe III/IV (numerische Stufen)", () => {
    for (let s = 1; s <= 40; s++) {
      const offers = buildArchitectOffer({ buildings: [] }, mulberry(s), 3 /*Shift*/, 1, 2 /*Deckel II*/);
      for (const o of offers) if (typeof o.tier === "number") expect(o.tier).toBeLessThanOrEqual(2);
    }
  });
  it("START_RUN: state.rareCap je Onboarding; 4 (kein Deckel) für Sim/Meister", () => {
    expect(start({ profile: { ...emptyProfile(0), onboarding: 0 } }).rareCap).toBe(2);
    expect(start({ profile: { ...emptyProfile(0), onboarding: 3 } }).rareCap).toBe(3);
    expect(start({ profile: { ...emptyProfile(0), onboarding: 5 } }).rareCap).toBe(4);
    expect(start().rareCap).toBe(4); // profil-los (Sim/Standard)
  });
});

describe("(Schritt 4b) Archetyp-Freischaltung über Onboarding", () => {
  const offerArchs = (offer) => [...new Set(offer.map((id) => archetypeOf(id)).filter(Boolean))];

  it("unlockedArchetypes: Blitz+Feuer ab 0; +Pflanze ab Glied 2; +Eis ab Glied 4", () => {
    expect(unlockedArchetypes(0)).toEqual(["lightning", "fire"]);
    expect(unlockedArchetypes(1)).toEqual(["lightning", "fire"]);
    expect(unlockedArchetypes(2)).toEqual(["lightning", "fire", "plant"]);
    expect(unlockedArchetypes(3)).toEqual(["lightning", "fire", "plant"]);
    expect(unlockedArchetypes(4).sort()).toEqual(["fire", "ice", "lightning", "plant"]);
    expect(unlockedArchetypes(6).sort()).toEqual(["fire", "ice", "lightning", "plant"]);
  });
  it("buildSkillOffer respektiert die Allowlist (kein Eis/Pflanze bei [Blitz,Feuer])", () => {
    const off = buildSkillOffer([], [], () => 0.3, 12, 0, false, ["lightning", "fire"]);
    expect(off.length).toBeGreaterThan(0);
    expect(offerArchs(off).every((a) => ["lightning", "fire"].includes(a))).toBe(true);
    // ohne Allowlist (null) = keine Gatung → Bestand
    expect(buildSkillOffer([], [], () => 0.3, 12, 0, false, null)).toEqual(buildSkillOffer([], [], () => 0.3, 12, 0, false));
  });
  it("START_RUN: state.unlockedArchetypes je Onboarding; null für Sim/Standard", () => {
    expect(start({ profile: { ...emptyProfile(0), onboarding: 0 } }).unlockedArchetypes).toEqual(["lightning", "fire"]);
    expect(start({ profile: { ...emptyProfile(0), onboarding: 6 } }).unlockedArchetypes.sort()).toEqual(["fire", "ice", "lightning", "plant"]);
    expect(start().unlockedArchetypes).toBe(null); // profil-los (Sim/Standard)
  });
  it("Erst-Angebot eines frischen Onboarding-Laufs zeigt nur Blitz/Feuer", () => {
    const s = start({ profile: { ...emptyProfile(0), onboarding: 0 } });
    if (s.skillOffer && s.skillOffer.length) {
      expect(offerArchs(s.skillOffer).every((a) => ["lightning", "fire"].includes(a))).toBe(true);
    }
  });
});

describe("M2: mehr Auswahl im R29-Angebot (Pick bleibt einer)", () => {
  const rng = () => 0.3;
  it("buildLegendaryOffer perArchBonus vergrößert das Angebot je Archetyp", () => {
    const base = buildLegendaryOffer(["fire", "ice"], [], rng);            // Duo: 2/Fraktion
    const boost = buildLegendaryOffer(["fire", "ice"], [], rng, null, 1);  // +1/Fraktion
    expect(boost.length).toBeGreaterThan(base.length);
    expect(new Set(boost).size).toBe(boost.length); // verschiedene
    expect(boost.every((id) => isLegendarySkill(id))).toBe(true);
  });
  it("perArchBonus 0 = Bestand (byte-identisch)", () => {
    expect(buildLegendaryOffer(["fire"], [], rng, null, 0)).toEqual(buildLegendaryOffer(["fire"], [], rng));
  });
  it("START_RUN: legOfferBonus = 1 mit M2, sonst 0", () => {
    expect(start({ profile: withNodes([...NONMEI, "M1", "M2"]) }).legOfferBonus).toBe(1);
    expect(start().legOfferBonus || 0).toBe(0);
  });
});
