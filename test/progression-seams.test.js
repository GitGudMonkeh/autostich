import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import { tierWeightsForShift } from "../src/game/rarity.js";
import { buildLegendaryOffer, isLegendarySkill, buildSkillOffer, archetypeOf } from "../src/game/skills.js";
import { emptyProfile, buyNode, unlockAllProfile, nodeEffects, legPerk2Force, rerollBase,
  maxRarityTier, legendaryPhaseUnlocked, unlockedArchetypes, COVER_FLOOR, ENERGY_FLOOR } from "../src/game/progression.js";
import { BASE_REROLLS, FORMATION_ENERGY, perkPhaseAt, LEG_PERK2_PHASE, DECISION_SCHEDULE } from "../src/game/constants.js";
import { makeRng } from "../src/game/deck.js";

/* #369 — Progression-Baum an den Reducer-/Engine-Nähten. Prinzip (wie bisher): Effekte NUR im Normal-Lauf
   (mit Profil) bzw. Meister (voller Baum); Sim/Standard/Dev bleiben byte-identisch (kein Baum). */

const start = (over = {}) => reducer({}, { type: "START_RUN", rng: Math.random, architect: true, ...over });
const withNodes = (ids, sp = 1000) => ids.reduce((p, id) => buyNode(p, id), emptyProfile(sp));
const RARE = ["tier3", "tier4", "legLayer"];

describe("rarity: neue Drop-IV-Stufe (shift 4)", () => {
  it("existiert, summiert auf 100 und schiebt weiter zu Sehr selten/Rar als shift 3", () => {
    const s3 = tierWeightsForShift(3), s4 = tierWeightsForShift(4);
    expect(Object.values(s4).reduce((a, b) => a + b, 0)).toBe(100);
    expect(s4).toEqual({ 1: 22, 2: 18, 3: 32, 4: 28 });
    expect(s4[4]).toBeGreaterThan(s3[4]);
    expect(s4[1]).toBeLessThan(s3[1]);
  });
});

describe("START_RUN: Baufeld & Energie aus dem Baum (Normal-Lauf, Boden 20/3)", () => {
  it("frisches Profil = Boden 20 Zellen / 3 Energie; Sim (profil-los) = Engine-Basis", () => {
    const fresh = start({ profile: emptyProfile(0) });
    expect(fresh.architect.maxCover).toBe(COVER_FLOOR);
    expect(fresh.formationEnergyBase).toBe(ENERGY_FLOOR);
    const sim = start();
    expect(sim.formationEnergyBase).toBe(FORMATION_ENERGY);
  });
  it("Baufeld cover1..cover3 → 20→21→22→24; Energie energy1/2 → 3→4→5", () => {
    expect(start({ profile: withNodes(["cover1"]) }).architect.maxCover).toBe(COVER_FLOOR + 1);
    expect(start({ profile: withNodes(["cover1", "cover2"]) }).architect.maxCover).toBe(COVER_FLOOR + 2);
    expect(start({ profile: withNodes(["cover1", "cover2", "cover3"]) }).architect.maxCover).toBe(COVER_FLOOR + 4);
    expect(start({ profile: withNodes(["energy1"]) }).formationEnergyBase).toBe(ENERGY_FLOOR + 1);
    expect(start({ profile: withNodes(["energy1", "energy2"]) }).formationEnergyBase).toBe(ENERGY_FLOOR + 2);
  });
});

describe("START_RUN: Drop-Shift & Rarität-Deckel aus dem Baum", () => {
  it("Drop-Kette → treeRareShift 1..4 (hängt an der Legendär-Schicht)", () => {
    expect(start({ profile: emptyProfile(0) }).treeRareShift).toBe(0);
    expect(start({ profile: withNodes([...RARE, "drop1"]) }).treeRareShift).toBe(1);
    expect(start({ profile: withNodes([...RARE, "drop1", "drop2", "drop3", "drop4"]) }).treeRareShift).toBe(4);
  });
  it("rareCap: Start 2, tier3 → 3, tier4 → 4; profil-los = 4 (kein Deckel)", () => {
    expect(start({ profile: emptyProfile(0) }).rareCap).toBe(2);
    expect(start({ profile: withNodes(["tier3"]) }).rareCap).toBe(3);
    expect(start({ profile: withNodes(["tier3", "tier4"]) }).rareCap).toBe(4);
    expect(start().rareCap).toBe(4);
  });
});

describe("Legendär-PERK-Schicht: 0 ohne Knoten, skaliert mit Drop", () => {
  it("treeLegMult: 0 (frisch profiliert) / 1 (Legendär) / >3 (Drop IV); Sim = 1", () => {
    expect(start({ profile: emptyProfile(0) }).treeLegMult).toBe(0);
    expect(start({ profile: withNodes(RARE) }).treeLegMult).toBe(1);
    expect(start({ profile: withNodes([...RARE, "drop1", "drop2", "drop3", "drop4"]) }).treeLegMult).toBeGreaterThan(3);
    expect(start().treeLegMult).toBe(1); // profil-los (Sim/Standard) unverändert
  });
});

describe("Generelle Legendär-Phase (2. Perk-Phase, perk2Leg)", () => {
  it("legPerk2Force / START_RUN treeLegForce2: 0 ohne, 3 mit perk2Leg", () => {
    expect(legPerk2Force(nodeEffects(emptyProfile(0)))).toBe(0);
    expect(legPerk2Force(nodeEffects(withNodes([...RARE, "perk2Leg"])))).toBe(3);
    expect(start({ profile: withNodes([...RARE, "perk2Leg"]) }).treeLegForce2).toBe(3);
    expect(start({ profile: emptyProfile(0) }).treeLegForce2).toBe(0);
  });
  it("perkPhaseAt erkennt die 2. Perk-Phase; Default LEG_PERK2_PHASE = 2", () => {
    const sched = ["skill", "perk", "formation", "shop", "skill", "perk", "formation"];
    expect(perkPhaseAt(sched, 5)).toBe(2);
    expect(LEG_PERK2_PHASE).toBe(2);
  });
});

describe("Reroll-Pools (#369 §6)", () => {
  it("Basis fest 1 im Normal-Lauf; profil-los = BASE_REROLLS", () => {
    expect(rerollBase(emptyProfile(0))).toBe(1);
    const p = start({ profile: emptyProfile(0) });
    expect([p.rerollsPerk, p.rerollsArch, p.rerollsSkill]).toEqual([1, 1, 1]);
    const sim = start();
    expect([sim.rerollsPerk, sim.rerollsArch, sim.rerollsSkill]).toEqual([BASE_REROLLS, BASE_REROLLS, BASE_REROLLS]);
  });
  it("deckReroll → rerollsLeg = 1 (Archetyp-Legendär-Phase); sonst 0", () => {
    expect(start({ profile: withNodes(["fireLeg1", "deckReroll"]) }).rerollsLeg).toBe(1);
    expect(start({ profile: emptyProfile(0) }).rerollsLeg).toBe(0);
  });
  it("perk2Reroll → rerollsPerk2 = 1 (nur 2. Perk-Phase)", () => {
    expect(start({ profile: withNodes([...RARE, "perk2Leg", "perk2Reroll"]) }).rerollsPerk2).toBe(1);
    expect(start({ profile: emptyProfile(0) }).rerollsPerk2).toBe(0);
  });
  it("REROLL_PERK: in der 2. Perk-Phase zieht zuerst rerollsPerk2, danach der Perk-Pool", () => {
    // cycle so wählen, dass perkPhaseAt(DECISION_SCHEDULE, cycle) === LEG_PERK2_PHASE.
    const base = start({ profile: withNodes([...RARE, "perk2Leg", "perk2Reroll"]) });
    // Suche einen cycle mit der 2. Perk-Phase im Standard-Plan.
    let cyc = -1;
    for (let c = 0; c < DECISION_SCHEDULE.length; c++) { if (perkPhaseAt(DECISION_SCHEDULE, c) === LEG_PERK2_PHASE) { cyc = c; break; } }
    expect(cyc).toBeGreaterThanOrEqual(0);
    const s0 = { ...base, phase: "levelup", cycle: cyc, offer: [{ tier: 1, familyId: "X" }], offerRerolls: 0, rerollsUsed: 0, rerollsPerk: 2, rerollsPerk2: 1, seed: 7 };
    const s1 = reducer(s0, { type: "REROLL_PERK", rng: Math.random });
    expect(s1.rerollsPerk2).toBe(0);   // Phasen-Token zuerst
    expect(s1.rerollsPerk).toBe(2);    // Perk-Pool unangetastet
    const s2 = reducer(s1, { type: "REROLL_PERK", rng: Math.random });
    expect(s2.rerollsPerk).toBe(1);    // jetzt der Perk-Pool
  });
});

describe("Archetyp-Legendär-Phase: Pool aus dem Baum (Zähl-Map)", () => {
  const rng = () => 0.3;
  it("buildLegendaryOffer(countMap): je Archetyp N verschiedene, unabhängig vom Build", () => {
    const offer = buildLegendaryOffer([], [], rng, null, 0, { fire: 2, ice: 1 });
    expect(offer.length).toBe(3);
    expect(new Set(offer).size).toBe(3);
    expect(offer.filter((id) => archetypeOf(id) === "fire").length).toBe(2);
    expect(offer.filter((id) => archetypeOf(id) === "ice").length).toBe(1);
    expect(offer.every(isLegendarySkill)).toBe(true);
  });
  it("countMap ignoriert activeArchetypes (Splash: Feuer-Build kann Eis-Legendäre bekommen)", () => {
    const offer = buildLegendaryOffer(["fire"], [], rng, null, 0, { ice: 1 });
    expect(offer.length).toBe(1);
    expect(archetypeOf(offer[0])).toBe("ice");
  });
  it("countMap null → Bestand (Build-Breite bestimmt die Größe)", () => {
    expect(buildLegendaryOffer(["fire"], [], rng, null, 0, null)).toEqual(buildLegendaryOffer(["fire"], [], rng));
  });
  it("START_RUN: state.legCountByArch aus dem Baum; null für Sim/Standard", () => {
    expect(start({ profile: withNodes(["fireLeg1", "fireLeg2", "iceDeck", "iceLeg1"]) }).legCountByArch).toEqual({ fire: 2, ice: 1 });
    expect(start().legCountByArch).toBe(null);
  });
});

describe("Archetyp-Legendär-Phase existiert (legPhaseEnabled)", () => {
  const driveToR29 = (legPhaseEnabled) => {
    const base = start();
    let s = { ...base, phase: "play", cycle: 27, pos: 0, skills: [], activeArchetypes: ["fire"], skillOffer: null, offer: null, legendaryOffer: null, legPhaseEnabled, legCountByArch: null };
    const rng = makeRng(9);
    let guard = 0;
    while (s.phase === "play") { if (++guard > 3000) throw new Error("kein R29-Übergang"); s = reducer(s, { type: "RESOLVE_TRICK", rng }); }
    return s;
  };
  it("legendaryPhaseUnlocked (Baum): false ohne Leg, true mit Leg I", () => {
    expect(legendaryPhaseUnlocked(emptyProfile(0))).toBe(false);
    expect(legendaryPhaseUnlocked(withNodes(["fireLeg1"]))).toBe(true);
  });
  it("START_RUN: legPhaseEnabled — Normal ohne Leg aus, mit Leg an; Sim/Standard an", () => {
    expect(start({ profile: emptyProfile(0) }).legPhaseEnabled).toBe(false);
    expect(start({ profile: withNodes(["fireLeg1"]) }).legPhaseEnabled).toBe(true);
    expect(start().legPhaseEnabled).toBe(true);
  });
  it("R29 MIT Freischaltung → Legendär-Pick-Phase; OHNE → normale Perk-Phase", () => {
    const on = driveToR29(true);
    expect(on.phase).toBe("legendary");
    expect(on.legendaryOffer.length).toBeGreaterThan(0);
    const off = driveToR29(false);
    expect(off.phase).toBe("levelup");
    expect(off.legendaryOffer).toBeNull();
    expect(off.offer.length).toBeGreaterThan(0);
  });
});

describe("Archetyp-Allowlist aus dem Baum", () => {
  const offerArchs = (offer) => [...new Set(offer.map((id) => archetypeOf(id)).filter(Boolean))];
  it("unlockedArchetypes: Blitz+Feuer; +Eis/Pflanze über Deck-Knoten", () => {
    expect(unlockedArchetypes(emptyProfile(0))).toEqual(["lightning", "fire"]);
    expect(unlockedArchetypes(withNodes(["iceDeck", "plantDeck"])).sort()).toEqual(["fire", "ice", "lightning", "plant"]);
  });
  it("buildSkillOffer respektiert die Allowlist", () => {
    const off = buildSkillOffer([], [], () => 0.3, 12, 0, false, ["lightning", "fire"]);
    expect(offerArchs(off).every((a) => ["lightning", "fire"].includes(a))).toBe(true);
    expect(buildSkillOffer([], [], () => 0.3, 12, 0, false, null)).toEqual(buildSkillOffer([], [], () => 0.3, 12, 0, false));
  });
  it("START_RUN: state.unlockedArchetypes aus dem Baum; null für Sim/Standard", () => {
    expect(start({ profile: emptyProfile(0) }).unlockedArchetypes).toEqual(["lightning", "fire"]);
    expect(start({ profile: withNodes(["iceDeck", "plantDeck"]) }).unlockedArchetypes.sort()).toEqual(["fire", "ice", "lightning", "plant"]);
    expect(start().unlockedArchetypes).toBe(null);
  });
});

describe("Ranglisten: Standard = tree-unabhängig, Meister = voller Baum", () => {
  const maxed = unlockAllProfile(emptyProfile(1000));
  it("Standard ignoriert den Baum trotz vollem Profil", () => {
    const s = start({ profile: maxed, ranked: "standard" });
    expect([s.rerollsPerk, s.rerollsArch, s.rerollsSkill]).toEqual([BASE_REROLLS, BASE_REROLLS, BASE_REROLLS]);
    expect(s.treeRareShift).toBe(0);
    expect(s.rareCap).toBe(4);
    expect(s.unlockedArchetypes).toBe(null);
    expect(s.legPhaseEnabled).toBe(true);
    expect(s.legCountByArch).toBe(null);
    expect(s.ranked).toBe("standard");
  });
  it("Normal-Lauf mit demselben Profil zieht den vollen Baum", () => {
    const n = start({ profile: maxed });
    expect([n.rerollsPerk, n.rerollsArch, n.rerollsSkill]).toEqual([1, 1, 1]);
    expect(n.treeRareShift).toBe(4);
    expect(n.rareCap).toBe(4);
    expect(n.legCountByArch).toEqual({ fire: 2, lightning: 2, ice: 2, plant: 2 });
    expect(n.ranked).toBe(null);
  });
  it("Meister spielt den vollen Baum ohne Profil", () => {
    const s = start({ ranked: "meister" });
    expect([s.rerollsPerk, s.rerollsArch, s.rerollsSkill]).toEqual([1, 1, 1]);
    expect(s.treeRareShift).toBe(4);
    expect(s.rareCap).toBe(4);
    expect(s.treeLegForce2).toBe(3);
    expect(s.rerollsLeg).toBe(1);
    expect(s.ranked).toBe("meister");
  });
});
