import { describe, it, expect } from "vitest";
import {
  NODES, NODE_BY_ID, NODE_IDS, NONMEISTER_IDS, MEISTER_IDS,
  NONMEISTER_TOTAL, TOTAL_COST, TOTAL_NODES,
  emptyProfile, owns, nonMeisterSpent, gateNeed, gateMet, prereqMet, onboardingDone,
  nodeEffects, treeCoverBonus, treeRerollBonus, treeRareShift,
  nodeState, canBuy, buyNode, respec, treeComplete, ownedCount,
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

describe("Baum-Struktur — Spiegel von UpgradeScreen.jsx", () => {
  it("13 Knoten, 4 Äste, Σ 134 SP, Nicht-Meister Σ 68 SP", () => {
    expect(TOTAL_NODES).toBe(13);
    expect(NODE_IDS).toEqual(["B1", "B2", "B3", "A1", "A2", "R1", "R2", "R3", "M1", "M2", "M3", "M4", "M5"]);
    expect(TOTAL_COST).toBe(134);
    expect(NONMEISTER_TOTAL).toBe(68);
    expect(NONMEISTER_IDS).toEqual(["B1", "B2", "B3", "A1", "A2", "R1", "R2", "R3"]);
    expect(MEISTER_IDS).toEqual(["M1", "M2", "M3", "M4", "M5"]);
  });
  it("Kosten exakt wie festgezurrt", () => {
    const cost = Object.fromEntries(NODES.map((n) => [n.id, n.cost]));
    expect(cost).toEqual({
      B1: 2, B2: 5, B3: 9, A1: 6, A2: 12, R1: 6, R2: 10, R3: 18,
      M1: 4, M2: 9, M3: 13, M4: 18, M5: 22,
    });
  });
  it("Sequenz-Verkettung je Ast (prereq)", () => {
    expect(NODES.filter((n) => !n.prereq).map((n) => n.id)).toEqual(["B1", "A1", "R1", "M1"]);
    expect(NODE_BY_ID.B3.prereq).toBe("B2");
    expect(NODE_BY_ID.M5.prereq).toBe("M4");
  });
});

describe("Kauf-Sequenz-Sperren", () => {
  it("Ast-Vorgänger ist Pflicht: B2 erst nach B1", () => {
    const fresh = emptyProfile(100);
    expect(nodeState(fresh, "B2")).toBe("lock-prev");
    expect(canBuy(fresh, "B2")).toBe(false);
    const afterB1 = buyNode(fresh, "B1");
    expect(nodeState(afterB1, "B2")).toBe("buy");
  });
  it("Äste sind unabhängig — A1 kaufbar ohne Baufeld", () => {
    const fresh = emptyProfile(100);
    expect(canBuy(fresh, "A1")).toBe(true);
    expect(canBuy(fresh, "R1")).toBe(true);
  });
  it("prereqMet direkt", () => {
    expect(prereqMet(emptyProfile(0), NODE_BY_ID.B1)).toBe(true); // erster Knoten
    expect(prereqMet(emptyProfile(0), NODE_BY_ID.A2)).toBe(false);
    expect(prereqMet(build(["A1"]), NODE_BY_ID.A2)).toBe(true);
  });
  it("bereits gekaufter Knoten → owned, nicht erneut kaufbar", () => {
    const p = build(["B1"]);
    expect(nodeState(p, "B1")).toBe("owned");
    expect(canBuy(p, "B1")).toBe(false);
    expect(buyNode(p, "B1")).toBe(p); // No-op, gleiche Referenz
  });
});

describe("SP-Deckung", () => {
  it("zu wenig SP → lock-sp, Kauf ist No-op", () => {
    const p = emptyProfile(1); // B1 kostet 2
    expect(nodeState(p, "B1")).toBe("lock-sp");
    expect(buyNode(p, "B1")).toBe(p);
  });
  it("genau genug SP → buy", () => {
    expect(nodeState(emptyProfile(2), "B1")).toBe("buy");
  });
  it("Kauf zieht SP ab und bucht in stichSpent", () => {
    const p = buyNode(emptyProfile(10), "B1");
    expect(p.stichPoints).toBe(8);
    expect(p.stichSpent).toBe(2);
    expect(owns(p, "B1")).toBe(true);
  });
  it("Kauf mutiert das Eingabe-Profil NICHT (Immutabilität)", () => {
    const fresh = emptyProfile(10);
    buyNode(fresh, "B1");
    expect(fresh.nodes).toEqual({});
    expect(fresh.stichPoints).toBe(10);
    expect(fresh.stichSpent).toBe(0);
  });
});

describe("Meister-Gates — onb / pct 17·34·51 / all", () => {
  it("pct-Schwellen lösen zu 17 / 34 / 51 SP auf", () => {
    expect(gateNeed(NODE_BY_ID.M2)).toBe(17);
    expect(gateNeed(NODE_BY_ID.M3)).toBe(34);
    expect(gateNeed(NODE_BY_ID.M4)).toBe(51);
  });
  it("M1: Onboarding-Gate — in Schritt 1 als erfüllt angenommen", () => {
    expect(onboardingDone(emptyProfile(0))).toBe(true);
    expect(gateMet(emptyProfile(0), NODE_BY_ID.M1)).toBe(true);
    expect(canBuy(emptyProfile(4), "M1")).toBe(true);
  });
  it("M1: unfertiges Onboarding-Feld sperrt (Vorgriff Schritt 2)", () => {
    const p = { ...emptyProfile(4), onboarding: 3 };
    expect(onboardingDone(p)).toBe(false);
    expect(nodeState(p, "M1")).toBe("lock-gate");
    const done = { ...emptyProfile(4), onboarding: 6 };
    expect(onboardingDone(done)).toBe(true);
    expect(nodeState(done, "M1")).toBe("buy");
  });
  it("M2 braucht ≥17 Nicht-Meister-SP (25 %)", () => {
    // B1+B2+B3+A1 = 2+5+9+6 = 22 ≥ 17 ✓ ; nur B1+B2+B3 = 16 < 17 ✗
    const under = build(["M1", "B1", "B2", "B3"]); // 16 SP nicht-Meister
    expect(nonMeisterSpent(under)).toBe(16);
    expect(nodeState(under, "M2")).toBe("lock-gate");
    const over = buyNode(under, "A1"); // +6 → 22
    expect(nonMeisterSpent(over)).toBe(22);
    expect(nodeState(over, "M2")).toBe("buy");
  });
  it("M3 braucht ≥34, M4 braucht ≥51 (Sequenz + Gate zusammen)", () => {
    // Nicht-Meister komplett = 68 SP → beide Gates offen; Meister-Sequenz muss trotzdem stimmen.
    const full = build([...NONMEISTER_IDS, "M1", "M2"]);
    expect(nonMeisterSpent(full)).toBe(68);
    expect(nodeState(full, "M3")).toBe("buy");
    // Mit nur 34 nicht-Meister-SP: M3 offen, M4 (braucht 51) noch gesperrt.
    // B1..B3(16)+A1+A2(18)=34 exakt. (Nicht-Meister ZUERST kaufen — sonst greift das pct-Gate für M2.)
    const at34 = build(["B1", "B2", "B3", "A1", "A2", "M1", "M2"]);
    expect(nonMeisterSpent(at34)).toBe(34);
    expect(nodeState(at34, "M3")).toBe("buy");
    const at34withM3 = buyNode(at34, "M3");
    expect(nodeState(at34withM3, "M4")).toBe("lock-gate"); // 34 < 51
  });
  it("M5 (all-Gate): erst wenn ALLE anderen 12 Knoten gekauft sind", () => {
    const almost = build([...NONMEISTER_IDS, "M1", "M2", "M3", "M4"]);
    expect(gateMet(almost, NODE_BY_ID.M5)).toBe(true);
    expect(nodeState(almost, "M5")).toBe("buy");
    // Fehlt ein einziger Nicht-Meister-Knoten → Gate zu. (A2 weglassen: 68−12 = 56 SP ≥ 51 → M4 noch
    // kaufbar, aber der all-Gate für M5 bleibt zu. R3 ginge nicht: 68−18 = 50 < 51 → schon M4 gesperrt.)
    const missingA2 = build([...NONMEISTER_IDS.filter((id) => id !== "A2"), "M1", "M2", "M3", "M4"]);
    expect(owns(missingA2, "A2")).toBe(false);
    expect(gateMet(missingA2, NODE_BY_ID.M5)).toBe(false);
    expect(nodeState(missingA2, "M5")).toBe("lock-gate");
  });
});

describe("nodeEffects — Ableitungen bei mehreren Ständen", () => {
  it("frisches Profil = beweisbares No-op", () => {
    expect(nodeEffects(emptyProfile(0))).toEqual({
      treeCoverBonus: 0, treeRerollBonus: 0, treeRareShift: 0,
      legSlotReroll: false, legTwoPerArch: false, legDropDouble: false,
      legGuaranteedPerk2: false, legChoose3Perk2: false,
    });
  });
  it("treeCoverBonus summiert Baufeld-Zellen (B1+1, B2+1, B3+2 → 0..4)", () => {
    expect(treeCoverBonus(emptyProfile(0))).toBe(0);
    expect(treeCoverBonus(build(["B1"]))).toBe(1);
    expect(treeCoverBonus(build(["B1", "B2"]))).toBe(2);
    expect(treeCoverBonus(build(["B1", "B2", "B3"]))).toBe(4);
  });
  it("treeRerollBonus zählt Auftakt-Knoten (0..2)", () => {
    expect(treeRerollBonus(emptyProfile(0))).toBe(0);
    expect(treeRerollBonus(build(["A1"]))).toBe(1);
    expect(treeRerollBonus(build(["A1", "A2"]))).toBe(2);
  });
  it("treeRareShift = höchste gekaufte Rarität-Stufe (0..3)", () => {
    expect(treeRareShift(emptyProfile(0))).toBe(0);
    expect(treeRareShift(build(["R1"]))).toBe(1);
    expect(treeRareShift(build(["R1", "R2"]))).toBe(2);
    expect(treeRareShift(build(["R1", "R2", "R3"]))).toBe(3);
  });
  it("Meister-Flags schalten je Knoten (M1..M5)", () => {
    const m1 = build(["M1"]);
    expect(nodeEffects(m1).legSlotReroll).toBe(true);
    expect(nodeEffects(m1).legTwoPerArch).toBe(false);
    const all = build([...NONMEISTER_IDS, "M1", "M2", "M3", "M4", "M5"]);
    const e = nodeEffects(all);
    expect([e.legSlotReroll, e.legTwoPerArch, e.legDropDouble, e.legGuaranteedPerk2, e.legChoose3Perk2])
      .toEqual([true, true, true, true, true]);
  });
  it("kombinierter Zwischenstand", () => {
    const p = build(["B1", "B2", "A1", "R1", "R2", "M1"]);
    expect(nodeEffects(p)).toEqual({
      treeCoverBonus: 2, treeRerollBonus: 1, treeRareShift: 2,
      legSlotReroll: true, legTwoPerArch: false, legDropDouble: false,
      legGuaranteedPerk2: false, legChoose3Perk2: false,
    });
  });
});

describe("respec — erstattet exakt", () => {
  it("volle Rückerstattung der gekauften Kosten, nodes geleert, stichSpent 0", () => {
    const p = build(["B1", "B2", "A1", "R1", "M1"], 100); // Kosten 2+5+6+6+4 = 23
    expect(p.stichPoints).toBe(77);
    expect(p.stichSpent).toBe(23);
    const r = respec(p);
    expect(r.stichPoints).toBe(100); // exakt wiederhergestellt
    expect(r.stichSpent).toBe(0);
    expect(r.nodes).toEqual({});
    expect(ownedCount(r)).toBe(0);
  });
  it("Respec eines leeren Profils ist ein No-op-Wert (keine Erstattung)", () => {
    const r = respec(emptyProfile(14));
    expect(r.stichPoints).toBe(14);
    expect(r.nodes).toEqual({});
  });
  it("Kauf → Respec → identisches Guthaben (Rundreise)", () => {
    const start = emptyProfile(134);
    const bought = build(NODE_IDS, 134); // Vollausbau kostet exakt 134
    expect(bought.stichPoints).toBe(0);
    expect(respec(bought).stichPoints).toBe(start.stichPoints);
  });
});

describe("treeComplete + Meister-Liga", () => {
  it("false bis alle 13 Knoten gekauft sind", () => {
    expect(treeComplete(emptyProfile(0))).toBe(false);
    const almost = build([...NONMEISTER_IDS, "M1", "M2", "M3", "M4"]);
    expect(treeComplete(almost)).toBe(false);
    const full = buyNode(almost, "M5");
    expect(treeComplete(full)).toBe(true);
    expect(ownedCount(full)).toBe(13);
  });
});

describe("Determinismus & Robustheit", () => {
  it("kein RNG/Date im Modul-Quelltext", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("../src/game/progression.js", import.meta.url), "utf8");
    // Aufruf-Formen prüfen (nicht bloße Erwähnung in Kommentaren wie „KEINE localStorage-Zugriffe").
    expect(src).not.toMatch(/Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(|localStorage\s*[.[]/);
  });
  it("gleiche Kaufreihenfolge → gleiches Profil; Reihenfolge innerhalb offener Käufe egal", () => {
    const a = build(["B1", "A1", "R1", "B2"]);
    const b = build(["A1", "R1", "B1", "B2"]);
    expect(nodeEffects(a)).toEqual(nodeEffects(b));
    expect(a.stichPoints).toBe(b.stichPoints);
    expect(a.nodes).toEqual(b.nodes);
  });
  it("nodeEffects/canBuy sind rein — mehrfacher Aufruf identisch", () => {
    const p = build(["B1", "B2", "A1"]);
    expect(nodeEffects(p)).toEqual(nodeEffects(p));
    expect(canBuy(p, "B3")).toBe(canBuy(p, "B3"));
  });
  it("robust gegen leere/kaputte Profile", () => {
    expect(nodeEffects({}).treeCoverBonus).toBe(0);
    expect(nonMeisterSpent(undefined)).toBe(0);
    expect(owns(null, "B1")).toBe(false);
    expect(nodeState({ nodes: {} }, "unknown-id")).toBe("unknown");
  });
});
