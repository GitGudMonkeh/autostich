import { describe, it, expect } from "vitest";
import {
  FAMILY_DEFS, FAMILY_LIST, familyDef, familyCategory,
  activeTierDef, activeTierDefs, familySumHook, familyProdHook,
} from "../src/game/families.js";
import { UPGRADE_TYPES } from "../src/game/rarity.js";

describe("Familien-Registry — Struktur", () => {
  it("jede Familie hat id/cat/name/upgradeType und vier Stufen mit Beschreibung", () => {
    for (const fam of FAMILY_LIST) {
      expect(fam.id).toBeTruthy();
      expect(["A", "B", "C", "D", "E"]).toContain(fam.cat);
      expect(fam.name).toBeTruthy();
      expect(Object.values(UPGRADE_TYPES)).toContain(fam.upgradeType);
      for (const t of [1, 2, 3, 4]) {
        expect(fam.tiers[t]).toBeTruthy();
        expect(typeof fam.tiers[t].desc).toBe("string");
        expect(fam.tiers[t].desc.length).toBeGreaterThan(0);
      }
    }
  });
  it("Kategorie D vollständig (19 Familien, alle Regelersetzung)", () => {
    const d = FAMILY_LIST.filter((f) => f.cat === "D");
    expect(d).toHaveLength(19);
    for (const f of d) expect(f.upgradeType).toBe(UPGRADE_TYPES.REPLACEMENT);
  });
});

describe("Kategorie D — Stufeneffekte (Spec §3.2 D)", () => {
  it("Punktebonus: Formation-Sieg 50/100/175/300", () => {
    const f = FAMILY_DEFS.D_FORMATION_BONUS.tiers;
    expect([1, 2, 3, 4].map((t) => f[t].scoreFlat({ hasFormation: true }))).toEqual([50, 100, 175, 300]);
    expect(f[4].scoreFlat({ hasFormation: false })).toBe(0);
  });
  it("Hohe Karten: Schwelle sinkt 9→6, Auszahlung steigt", () => {
    const f = FAMILY_DEFS.D_HIGH.tiers;
    expect(f[1].scoreFlat({ winValue: 9 })).toBe(100);
    expect(f[1].scoreFlat({ winValue: 8 })).toBe(0);
    expect(f[4].scoreFlat({ winValue: 6 })).toBe(350);
    expect(f[4].scoreFlat({ winValue: 5 })).toBe(0);
  });
  it("Siegesserie: Schritt × Serienpunkt, gedeckelt", () => {
    const f = FAMILY_DEFS.D_STREAK.tiers;
    expect(f[1].scoreFlat({ winStreak: 3 })).toBe(45);   // 15×3
    expect(f[1].scoreFlat({ winStreak: 20 })).toBe(150); // Cap
    expect(f[4].scoreFlat({ winStreak: 4 })).toBe(200);  // 50×4
  });
  it("Übermacht: Vorsprung-Schwelle sinkt 10→4", () => {
    const f = FAMILY_DEFS.D_OVERPOWER.tiers;
    expect(f[1].scoreFlat({ margin: 10 })).toBe(300);
    expect(f[1].scoreFlat({ margin: 9 })).toBe(0);
    expect(f[4].scoreFlat({ margin: 4 })).toBe(750);
  });
  it("Präzision: I/II exakt gleich, III/IV auch ±1", () => {
    const f = FAMILY_DEFS.D_PRECISION.tiers;
    expect(f[1].scoreFlat({ winValue: 5, lastWinValue: 5 })).toBe(250);
    expect(f[1].scoreFlat({ winValue: 5, lastWinValue: 6 })).toBe(0);   // ±1 zählt noch nicht
    expect(f[3].scoreFlat({ winValue: 5, lastWinValue: 6 })).toBe(550); // ±1 zählt
    expect(f[4].scoreFlat({ winValue: 5, lastWinValue: 7 })).toBe(0);   // ±2 nicht
  });
  it("Zehnter Sieg: Zähler-Intervall sinkt 12→5", () => {
    const f = FAMILY_DEFS.D_TENTH_WIN.tiers;
    expect(f[1].scoreFlat({ wins: 12 })).toBe(600);
    expect(f[1].scoreFlat({ wins: 11 })).toBe(0);
    expect(f[4].scoreFlat({ wins: 5 })).toBe(1000);
  });
  it("Crit-Familien nutzen scoreFlatOnCrit (nicht scoreFlat)", () => {
    expect(FAMILY_DEFS.D_CRIT_SCORE.tiers[2].scoreFlatOnCrit()).toBe(175);
    expect(FAMILY_DEFS.D_CRIT_SCORE.tiers[2].scoreFlat).toBeUndefined();
    expect(FAMILY_DEFS.D_OVERCRIT.tiers[2].scoreFlatOnCrit({ rawCrit: 1.2 })).toBe(300);
  });
});

describe("Resolver — Regelersetzung (nur höchste Stufe aktiv)", () => {
  it("activeTierDef liefert die Def der gehaltenen Stufe", () => {
    expect(activeTierDef("D_HIGH", 3)).toBe(FAMILY_DEFS.D_HIGH.tiers[3]);
    expect(activeTierDef("D_HIGH", 0)).toBeNull();
    expect(activeTierDef("UNBEKANNT", 2)).toBeNull();
  });
  it("familySumHook summiert genau die aktive Stufe je Familie (kein Doppel-Trigger)", () => {
    // D_HIGH auf Rang 2 (Schwelle ≥8/+150) — Rang 1 darf NICHT zusätzlich zählen.
    expect(familySumHook({ D_HIGH: 2 }, "scoreFlat", { winValue: 8 })).toBe(150);
    expect(familySumHook({ D_HIGH: 2 }, "scoreFlat", { winValue: 7 })).toBe(0);
    // Zwei Familien gleichzeitig: additive Summe ihrer aktiven Stufen.
    expect(familySumHook({ D_HIGH: 4, D_OVERPOWER: 2 }, "scoreFlat", { winValue: 6, margin: 8 })).toBe(350 + 400);
  });
  it("activeTierDefs liefert eine Def je gehaltener Familie", () => {
    expect(activeTierDefs({ D_HIGH: 1, D_STREAK: 4 })).toHaveLength(2);
    expect(activeTierDefs({})).toHaveLength(0);
  });
  it("familyProdHook default 1 ohne scoreMult-Familien", () => {
    expect(familyProdHook({ D_HIGH: 2 }, "scoreMult", {})).toBe(1);
  });
});
