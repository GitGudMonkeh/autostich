import { describe, it, expect } from "vitest";
import {
  NODES, NODE_BY_ID, NODE_IDS, BUYABLE_IDS, DECK_IDS, GEN_IDS,
  TOTAL_COST, TOTAL_NODES, LEG_NODES_BY_ARCH,
  emptyProfile, owns, rankedUnlocked, anyLegOwned, gateMet, prereqMet,
  nodeEffects, treeCoverBonus, treeEnergyBonus, treeRareShift,
  unlockedArchetypes, maxRarityTier, legendaryPhaseUnlocked, legCountByArch, rerollBase, legPerk2Force,
  nodeState, canBuy, buyNode, respec, treeComplete, ownedCount,
  SP_PER_RUN, SP_LOYALTY_EVERY, SP_LOYALTY_SP, ONBOARDING_LINKS,
  onboardingAfter, spMilestones, isSpRun, spForRun, milestoneBarState,
  dpForRun, spCreditForRun, onboardingUnlocks, onboardingRewardAt, nextOnboardingReward,
  SECRET_SEEDS, UNLOCK_SP_CUSHION, matchSecretSeed, unlockAllProfile, skipOnboardingProfile,
} from "../src/game/progression.js";

// Kauft eine Liste von Knoten der Reihe nach in ein frisches Profil mit reichlich SP. Wirft, wenn ein
// Kauf nicht griff (deckt Sequenz-/Gate-Fehler in den Test-Fixtures selbst auf).
const build = (ids, sp = 1000) => {
  let p = emptyProfile(sp);
  for (const id of ids) {
    const before = p;
    p = buyNode(p, id);
    if (p === before) throw new Error(`Setup: Kauf von ${id} griff nicht (state=${nodeState(before, id)})`);
  }
  return p;
};
// Voll-Legendär-Schicht + Drop-Kette (Reihenfolge stimmt): Vorbedingung für die Drop/Shift-Tests.
const RARE = ["tier3", "tier4", "legLayer"];

describe("Baum-Struktur — #369 Deck- + Allgemein-Zweig", () => {
  it("25 kaufbare Knoten, Σ 137 SP (Deck 45 / Allgemein 92) + Platzhalter", () => {
    expect(TOTAL_NODES).toBe(25);
    expect(TOTAL_COST).toBe(137);
    expect(DECK_IDS.length).toBe(11);
    expect(GEN_IDS.length).toBe(14);
    const deckCost = NODES.filter((n) => n.branch === "deck" && !n.placeholder).reduce((s, n) => s + n.cost, 0);
    const genCost = NODES.filter((n) => n.branch === "gen").reduce((s, n) => s + n.cost, 0);
    expect(deckCost).toBe(45);
    expect(genCost).toBe(92);
    // Platzhalter „Synergie-Legendäre" zählt NICHT zu den kaufbaren Knoten.
    expect(BUYABLE_IDS).not.toContain("synLeg");
    expect(NODE_BY_ID.synLeg.placeholder).toBe(true);
  });
  it("Kosten exakt wie festgezurrt (#369 §2)", () => {
    const cost = Object.fromEntries(NODES.map((n) => [n.id, n.cost]));
    expect(cost).toMatchObject({
      fireLeg1: 3, fireLeg2: 5, boltLeg1: 3, boltLeg2: 5, iceDeck: 4, iceLeg1: 3, iceLeg2: 5,
      plantDeck: 4, plantLeg1: 3, plantLeg2: 5, deckReroll: 5,
      cover1: 2, cover2: 4, cover3: 6, energy1: 2, energy2: 4, tier3: 2, tier4: 3, legLayer: 4,
      drop1: 5, drop2: 8, drop3: 12, drop4: 24, perk2Leg: 10, perk2Reroll: 6,
    });
  });
  it("Legendär-Ketten je Archetyp (Stufe 1/2)", () => {
    expect(Object.keys(LEG_NODES_BY_ARCH).sort()).toEqual(["fire", "ice", "lightning", "plant"]);
    expect(LEG_NODES_BY_ARCH.fire.map((n) => n.id)).toEqual(["fireLeg1", "fireLeg2"]);
  });
});

describe("Ketten-Sperren & Deck-Gates", () => {
  it("Kettenvorgänger ist Pflicht: fireLeg2 erst nach fireLeg1; iceLeg1 erst nach iceDeck", () => {
    const fresh = emptyProfile(100);
    expect(nodeState(fresh, "fireLeg2")).toBe("lock-prev");
    expect(nodeState(fresh, "iceLeg1")).toBe("lock-prev");
    expect(nodeState(buyNode(fresh, "fireLeg1"), "fireLeg2")).toBe("buy");
    expect(nodeState(build(["iceDeck"]), "iceLeg1")).toBe("buy");
  });
  it("deckReroll: anyLeg-Gate — erst kaufbar, sobald irgendein Leg I gekauft ist", () => {
    const fresh = emptyProfile(100);
    expect(anyLegOwned(fresh)).toBe(false);
    expect(nodeState(fresh, "deckReroll")).toBe("lock-gate");
    const withLeg = build(["boltLeg1"]);
    expect(anyLegOwned(withLeg)).toBe(true);
    expect(nodeState(withLeg, "deckReroll")).toBe("buy");
  });
  it("Feuer/Blitz-Ketten sind unabhängig (kein Deck-Knoten nötig)", () => {
    const fresh = emptyProfile(100);
    expect(canBuy(fresh, "fireLeg1")).toBe(true);
    expect(canBuy(fresh, "boltLeg1")).toBe(true);
  });
  it("Platzhalter synLeg ist nie kaufbar", () => {
    expect(nodeState(emptyProfile(100), "synLeg")).toBe("placeholder");
    expect(canBuy(emptyProfile(100), "synLeg")).toBe(false);
    expect(buyNode(emptyProfile(100), "synLeg")).toEqual(emptyProfile(100));
  });
  it("Allgemein-Ketten: cover/energy/rarität sequenziell, drop/perk2 erst nach Legendär", () => {
    expect(prereqMet(emptyProfile(0), NODE_BY_ID.cover2)).toBe(false);
    expect(prereqMet(build(["cover1"]), NODE_BY_ID.cover2)).toBe(true);
    expect(nodeState(build(["tier3", "tier4"]), "drop1")).toBe("lock-prev"); // braucht legLayer
    expect(nodeState(build(RARE), "drop1")).toBe("buy");
    expect(nodeState(build(RARE), "perk2Leg")).toBe("buy");
  });
});

describe("SP-Deckung & Immutabilität", () => {
  it("zu wenig SP → lock-sp, Kauf ist No-op", () => {
    const p = emptyProfile(1); // cover1 kostet 2
    expect(nodeState(p, "cover1")).toBe("lock-sp");
    expect(buyNode(p, "cover1")).toBe(p);
  });
  it("Kauf zieht SP ab, bucht in stichSpent, mutiert das Eingabe-Profil nicht", () => {
    const fresh = emptyProfile(10);
    const p = buyNode(fresh, "cover1");
    expect(p.stichPoints).toBe(8);
    expect(p.stichSpent).toBe(2);
    expect(owns(p, "cover1")).toBe(true);
    expect(fresh.nodes).toEqual({});
    expect(fresh.stichPoints).toBe(10);
  });
});

describe("nodeEffects — Ableitungen bei mehreren Ständen", () => {
  it("frisches Profil = beweisbares No-op", () => {
    expect(nodeEffects(emptyProfile(0))).toEqual({
      treeCoverBonus: 0, treeEnergyBonus: 0, treeRareShift: 0, maxTier: 2, legendaryLayer: false, legMult: 0,
      unlockedArchetypes: ["lightning", "fire"], legCountByArch: {}, archLegPhaseOn: false,
      legPerkPhaseOn: false, rerollDeckLeg: 0, rerollPerk2: 0,
    });
  });
  it("treeCoverBonus summiert Baufeld (cover1+1, cover2+1, cover3+2 → 0..4)", () => {
    expect(treeCoverBonus(build(["cover1"]))).toBe(1);
    expect(treeCoverBonus(build(["cover1", "cover2"]))).toBe(2);
    expect(treeCoverBonus(build(["cover1", "cover2", "cover3"]))).toBe(4);
  });
  it("treeEnergyBonus summiert Energie (0..2)", () => {
    expect(treeEnergyBonus(build(["energy1"]))).toBe(1);
    expect(treeEnergyBonus(build(["energy1", "energy2"]))).toBe(2);
  });
  it("treeRareShift = höchste Drop-Stufe (0..4), Drop hängt an der Legendär-Schicht", () => {
    expect(treeRareShift(emptyProfile(0))).toBe(0);
    expect(treeRareShift(build([...RARE, "drop1"]))).toBe(1);
    expect(treeRareShift(build([...RARE, "drop1", "drop2"]))).toBe(2);
    expect(treeRareShift(build([...RARE, "drop1", "drop2", "drop3"]))).toBe(3);
    expect(treeRareShift(build([...RARE, "drop1", "drop2", "drop3", "drop4"]))).toBe(4);
  });
  it("maxTier: Start 2 (Normal+Selten), Sehr selten → 3, Rar → 4", () => {
    expect(maxRarityTier(emptyProfile(0))).toBe(2);
    expect(maxRarityTier(build(["tier3"]))).toBe(3);
    expect(maxRarityTier(build(["tier3", "tier4"]))).toBe(4);
  });
  it("Legendär-Schicht + legMult: aus ohne Knoten, ×1 mit Schicht, skaliert mit Drop", () => {
    expect(nodeEffects(emptyProfile(0)).legMult).toBe(0);
    expect(nodeEffects(build(RARE)).legendaryLayer).toBe(true);
    expect(nodeEffects(build(RARE)).legMult).toBe(1);
    expect(nodeEffects(build([...RARE, "drop1", "drop2", "drop3", "drop4"])).legMult).toBeGreaterThan(3); // ~3.3 bei Drop IV
  });
  it("unlockedArchetypes: Blitz+Feuer immer; +Eis mit Eis-Deck; +Pflanze mit Pflanze-Deck", () => {
    expect(unlockedArchetypes(emptyProfile(0))).toEqual(["lightning", "fire"]);
    expect(unlockedArchetypes(build(["iceDeck"])).sort()).toEqual(["fire", "ice", "lightning"]);
    expect(unlockedArchetypes(build(["iceDeck", "plantDeck"])).sort()).toEqual(["fire", "ice", "lightning", "plant"]);
  });
  it("legCountByArch: Leg I → 1, Leg II → 2; Beiträge je Archetyp getrennt", () => {
    expect(legCountByArch(build(["fireLeg1"]))).toEqual({ fire: 1 });
    expect(legCountByArch(build(["fireLeg1", "fireLeg2"]))).toEqual({ fire: 2 });
    expect(legCountByArch(build(["fireLeg1", "fireLeg2", "iceDeck", "iceLeg1"]))).toEqual({ fire: 2, ice: 1 });
  });
  it("archLegPhaseOn: erst mit irgendeinem Leg I; Reroll-/2.-Perk-Flags je Knoten", () => {
    expect(nodeEffects(emptyProfile(0)).archLegPhaseOn).toBe(false);
    expect(nodeEffects(build(["plantDeck", "plantLeg1"])).archLegPhaseOn).toBe(true);
    expect(nodeEffects(build(["fireLeg1", "deckReroll"])).rerollDeckLeg).toBe(1);
    expect(nodeEffects(build([...RARE, "perk2Leg"])).legPerkPhaseOn).toBe(true);
    expect(nodeEffects(build([...RARE, "perk2Leg", "perk2Reroll"])).rerollPerk2).toBe(1);
  });
  it("legPerk2Force: 0 ohne, 3 mit perk2Leg (voller Legendär-Satz); null → 0", () => {
    expect(legPerk2Force(nodeEffects(emptyProfile(0)))).toBe(0);
    expect(legPerk2Force(nodeEffects(build([...RARE, "perk2Leg"])))).toBe(3);
    expect(legPerk2Force(null)).toBe(0);
  });
  it("rerollBase: fest 1 im Normal-Lauf mit Profil", () => {
    expect(rerollBase(emptyProfile(0))).toBe(1);
    expect(rerollBase(build(["fireLeg1"]))).toBe(1);
  });
});

describe("respec — erstattet exakt", () => {
  it("volle Rückerstattung, nodes geleert, stichSpent 0", () => {
    const p = build(["cover1", "cover2", "fireLeg1", "iceDeck"], 100); // 2+4+3+4 = 13
    expect(p.stichPoints).toBe(87);
    expect(p.stichSpent).toBe(13);
    const r = respec(p);
    expect(r.stichPoints).toBe(100);
    expect(r.stichSpent).toBe(0);
    expect(r.nodes).toEqual({});
    expect(ownedCount(r)).toBe(0);
  });
  it("Vollausbau kostet exakt TOTAL_COST; respec stellt es wieder her", () => {
    const bought = build(BUYABLE_IDS, TOTAL_COST);
    expect(bought.stichPoints).toBe(0);
    expect(respec(bought).stichPoints).toBe(TOTAL_COST);
  });
});

describe("treeComplete + #299 letzter Knoten → DP", () => {
  it("false bis alle kaufbaren Knoten gekauft sind (Platzhalter zählt nicht)", () => {
    expect(treeComplete(emptyProfile(0))).toBe(false);
    const full = build(BUYABLE_IDS, TOTAL_COST);
    expect(treeComplete(full)).toBe(true);
    expect(ownedCount(full)).toBe(25);
  });
  it("mit dem LETZTEN Knoten werden Rest-SP zu DP", () => {
    const nodes = Object.fromEntries(BUYABLE_IDS.filter((id) => id !== "drop4").map((id) => [id, 1]));
    const cost = NODE_BY_ID.drop4.cost;
    const p0 = { ...emptyProfile(cost + 7), nodes, deckPoints: 3 };
    expect(treeComplete(p0)).toBe(false);
    const p1 = buyNode(p0, "drop4");
    expect(treeComplete(p1)).toBe(true);
    expect(p1.stichPoints).toBe(0);
    expect(p1.deckPoints).toBe(3 + 7);
  });
});

describe("Determinismus & Robustheit", () => {
  it("kein RNG/Date/localStorage im Modul-Quelltext", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("../src/game/progression.js", import.meta.url), "utf8");
    expect(src).not.toMatch(/Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(|localStorage\s*[.[]/);
  });
  it("Reihenfolge innerhalb offener Käufe egal", () => {
    const a = build(["cover1", "fireLeg1", "energy1", "cover2"]);
    const b = build(["fireLeg1", "energy1", "cover1", "cover2"]);
    expect(nodeEffects(a)).toEqual(nodeEffects(b));
    expect(a.nodes).toEqual(b.nodes);
  });
  it("robust gegen leere/kaputte Profile", () => {
    expect(nodeEffects({}).treeCoverBonus).toBe(0);
    expect(owns(null, "cover1")).toBe(false);
    expect(nodeState({ nodes: {} }, "unknown-id")).toBe("unknown");
  });
});

/* ===== SP-/DP-ÖKONOMIE + ONBOARDING (unverändert #369) ===== */

describe("Onboarding-Fortschritt (inert bei Start 6/6)", () => {
  it("natürlicher Abschluss rückt ein Glied vor, gedeckelt bei 6", () => {
    expect(onboardingAfter(0, { completed: true })).toBe(1);
    expect(onboardingAfter(5, { completed: true })).toBe(6);
    expect(onboardingAfter(6, { completed: true })).toBe(6);
    expect(ONBOARDING_LINKS).toBe(6);
  });
  it("vorzeitiges Beenden zählt nicht", () => {
    expect(onboardingAfter(2, { completed: false })).toBe(2);
    expect(onboardingAfter(2, null)).toBe(2);
  });
});

describe("SP-Meilensteine (kumulativ)", () => {
  it("jede überschrittene Schwelle addiert ihre SP", () => {
    expect(spMilestones(9_999_999)).toBe(0);
    expect(spMilestones(10_000_000)).toBe(1);
    expect(spMilestones(24_999_999)).toBe(1);
    expect(spMilestones(25_000_000)).toBe(2);
    expect(spMilestones(50_000_000)).toBe(3);
    expect(spMilestones(100_000_000)).toBe(6); // 1+1+1+1+2
    expect(spMilestones(500_000_000)).toBe(6);
  });
});

describe("milestoneBarState", () => {
  it("erreichte Meilensteine, nicht-lineare Füllung, nächstes Ziel", () => {
    const s0 = milestoneBarState(0);
    expect(s0.reached).toBe(0); expect(s0.fill).toBe(0); expect(s0.next.at).toBe(10_000_000);
    expect(milestoneBarState(17_500_000).fill).toBeCloseTo(0.3, 5); // ≥10M (1 erreicht), halb bis 25M → (1+0.5)/5
    const s1 = milestoneBarState(25_000_000);
    expect(s1.reached).toBe(2); expect(s1.fill).toBeCloseTo(0.4, 5); expect(s1.spSoFar).toBe(2);
  });
  it("bei/über 100 Mio: Maximum", () => {
    const m = milestoneBarState(250_000_000);
    expect(m.atMax).toBe(true); expect(m.fill).toBe(1); expect(m.spSoFar).toBe(6); expect(m.next).toBe(null);
  });
});

describe("SP-Ernte pro Lauf — nach Onboarding (Start 6/6)", () => {
  it("isSpRun + Grundstock + Meilensteine + Treue-Drip", () => {
    expect(isSpRun({ completed: true }, 6)).toBe(true);
    expect(isSpRun({ completed: false }, 6)).toBe(false);
    expect(spForRun({ completed: true, score: 0 }, 6, 0)).toBe(SP_PER_RUN);
    expect(spForRun({ completed: true, score: 100_000_000 }, 6, 0)).toBe(SP_PER_RUN + 6);
    expect(spForRun({ completed: true, score: 0 }, 6, SP_LOYALTY_EVERY - 1)).toBe(SP_PER_RUN + SP_LOYALTY_SP);
  });
});

describe("DP-Ökonomie — Score-DP folgt den SP-Meilensteinen", () => {
  it("dpForRun = spMilestones(score); bei vollem Baum + restliche SP-Ökonomie; spCreditForRun 0 bei vollem Baum", () => {
    expect(dpForRun({ completed: true, score: 55_000_000 }, 6, false, 0)).toBe(3);   // 10M+25M+50M → 1+1+1
    expect(dpForRun({ completed: true, score: 100_000_000 }, 6, false, 0)).toBe(6);  // alle Meilensteine (1+1+1+1+2)
    // Voller Baum: + restliche SP-Ökonomie (Grundstock; Treue 0 im 1. Lauf) obendrauf, Meilensteine nicht doppelt.
    expect(dpForRun({ completed: true, score: 100_000_000 }, 6, true, 0)).toBe(6 + SP_PER_RUN);
    expect(spCreditForRun({ completed: true, score: 100_000_000 }, 6, true, 0)).toBe(0);
  });
});

describe("onboardingUnlocks / RewardAt / nextReward (inert, Rollup-Rückgabe)", () => {
  it("Diff, Belohnung je Glied, nächste Belohnung", () => {
    expect(onboardingUnlocks(6, 6)).toEqual([]);
    expect(onboardingUnlocks(1, 2)).toEqual([{ link: 2, type: "archetype", key: "plant" }]);
    expect(onboardingRewardAt(4)).toEqual({ type: "archetype", key: "ice" });
    expect(nextOnboardingReward(5)).toEqual({ link: 6, reward: { type: "onboardingDone", target: "workshop" } });
  });
});

describe("Test-Codes", () => {
  it("matchSecretSeed erkennt unlock/reset/onboarding, sonst null", () => {
    expect(matchSecretSeed("  UNLOCK ")).toBe("unlock");
    expect(matchSecretSeed("Reset")).toBe("reset");
    expect(matchSecretSeed("onboarding")).toBe("onboarding");
    expect(matchSecretSeed("etwas anderes")).toBe(null);
    expect(SECRET_SEEDS).toEqual({ unlock: "unlock", reset: "reset", onboarding: "onboarding" });
  });
  it("unlockAllProfile: alle kaufbaren Knoten, stichSpent = TOTAL_COST, SP-Polster, voller Effekt", () => {
    const p = unlockAllProfile(emptyProfile(0));
    expect(ownedCount(p)).toBe(25);
    expect(treeComplete(p)).toBe(true);
    expect(p.stichSpent).toBe(TOTAL_COST);
    expect(p.stichPoints).toBe(UNLOCK_SP_CUSHION);
    expect(rankedUnlocked(p)).toBe(true); // #370: „unlock" schaltet auch die Rangliste frei (je Archetyp ≥1 Lauf)
    expect(nodeEffects(p)).toMatchObject({
      treeCoverBonus: 4, treeEnergyBonus: 2, treeRareShift: 4, maxTier: 4, legendaryLayer: true,
      unlockedArchetypes: ["lightning", "fire", "ice", "plant"], archLegPhaseOn: true, legPerkPhaseOn: true,
      rerollDeckLeg: 1, rerollPerk2: 1, legCountByArch: { fire: 2, lightning: 2, ice: 2, plant: 2 },
    });
  });
  it("skipOnboardingProfile: Onboarding 6, +10 SP / +50 DP additiv", () => {
    const p = skipOnboardingProfile({ ...emptyProfile(3), deckPoints: 5, nodes: { fireLeg1: 1 } });
    expect(p.onboarding).toBe(6);
    expect(p.stichPoints).toBe(13);
    expect(p.deckPoints).toBe(55);
    expect(p.nodes).toEqual({ fireLeg1: 1 });
  });
  it("nach unlock → respec gibt TOTAL_COST + Polster zurück", () => {
    const r = respec(unlockAllProfile(emptyProfile(0)));
    expect(r.stichPoints).toBe(UNLOCK_SP_CUSHION + TOTAL_COST);
    expect(ownedCount(r)).toBe(0);
  });
});

// legendaryPhaseUnlocked liest jetzt das Profil (Baum), nicht mehr die Onboarding-Zahl.
describe("legendaryPhaseUnlocked (Baum)", () => {
  it("false ohne Leg, true sobald irgendein Leg I gekauft ist", () => {
    expect(legendaryPhaseUnlocked(emptyProfile(0))).toBe(false);
    expect(legendaryPhaseUnlocked(build(["fireLeg1"]))).toBe(true);
  });
});

describe("#370 rankedUnlocked — Freischaltung (alle Decks + je ≥1 abgeschlossener Lauf)", () => {
  it("false ohne Deck-Knoten; erst mit iceDeck+plantDeck UND je ≥1 Lauf je Archetyp true", () => {
    const base = emptyProfile();
    expect(rankedUnlocked(base)).toBe(false);                                  // keine Deck-Knoten
    const decks = { ...base, nodes: { iceDeck: 1, plantDeck: 1 } };
    expect(rankedUnlocked(decks)).toBe(false);                                 // Decks frei, aber keine Läufe
    const partial = { ...decks, archetypeRunsCompleted: { lightning: 1, fire: 1, ice: 1 } };
    expect(rankedUnlocked(partial)).toBe(false);                              // plant fehlt
    const missingDeck = { ...base, nodes: { iceDeck: 1 }, archetypeRunsCompleted: { lightning: 1, fire: 1, ice: 1, plant: 1 } };
    expect(rankedUnlocked(missingDeck)).toBe(false);                          // plantDeck-Knoten fehlt
    const full = { ...decks, archetypeRunsCompleted: { lightning: 1, fire: 2, ice: 1, plant: 1 } };
    expect(rankedUnlocked(full)).toBe(true);
  });
});
