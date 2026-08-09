import { describe, it, expect } from "vitest";
import {
  THEME_DEFS, THEMES, ELEMENT_DEFS, FX_KEYS, FX_OPTION_KEY, COST_PER_ELEMENT,
  ownKey, elementCond, elementOwned, elementState, elementPrice, elementUnlock,
  themeState, isBuyTheme, buyAllInfo, sharedUnlock,
  canBuyElement, buyElement, buyAllForTheme,
  GLOBAL_FX, GLOBAL_FX_BY_KEY, GLOBAL_FX_COST, globalFxOwned, canBuyGlobalFx, buyGlobalFx, laserSliceActive,
} from "../src/game/themes.js";

// Minimal-Profil (nur was die Logik liest): SP-Guthaben, Besitz-Map, Freischalt-Flags/Zähler.
const prof = (o = {}) => ({ stichPoints: 0, stichSpent: 0, ownedCosmetics: {}, games: 0, bestStreak: 0, bestScore: 0,
  hadNoRerollRun: false, monoArchetypeRuns: {}, hadAllArchetypesRun: false, ...o });

describe("themes — Registry", () => {
  it("drei kaufbare Starter-Themes mit allen fünf Elementen", () => {
    for (const id of ["sunset", "lofi", "kaiju"]) {
      const t = THEME_DEFS[id];
      expect(t.kind).toBe("buy");
      expect(t.els).toEqual(["deck", "bf", "frameGlow", "holoSwipe", "hologrid"]);
      expect(isBuyTheme(t)).toBe(true);
    }
  });
  it("Element-Katalog deckt genau die fünf Element-Keys ab; drei davon sind Animationen", () => {
    expect(ELEMENT_DEFS.map((e) => e.key)).toEqual(["deck", "bf", "frameGlow", "holoSwipe", "hologrid"]);
    expect(FX_KEYS).toEqual(["frameGlow", "holoSwipe", "hologrid"]);
    expect(FX_OPTION_KEY.frameGlow).toBe("fxFrameGlow");
  });
  it("Kauf-Theme koppelt Deck/BF-Bedingung an die ownedCosmetics-Schlüssel", () => {
    const t = THEME_DEFS.sunset;
    expect(elementCond(t, "deck")).toEqual({ kind: "buy", ownKey: "sunset:deck" });
    expect(elementCond(t, "bf")).toEqual({ kind: "buy", ownKey: "sunset:bf" });
    expect(elementCond(t, "frameGlow")).toEqual({ kind: "buy", ownKey: ownKey("sunset", "frameGlow") });
  });
  it("Challenge-Themes bieten nur ein Deck und leihen die bestehende Bedingung", () => {
    expect(THEME_DEFS.feuer.els).toEqual(["deck"]);
    expect(elementCond(THEME_DEFS.feuer, "deck")).toEqual({ kind: "monoArchetypeRun", archetype: "fire" });
  });
  it("Progressions-Themes koppeln Deck+BF an ihre gestaffelten Läufe-Bedingungen", () => {
    expect(elementCond(THEME_DEFS.neon, "deck")).toEqual({ kind: "games", n: 5 });
    expect(elementCond(THEME_DEFS.neon, "bf")).toEqual({ kind: "games", n: 10 });
  });
});

describe("themes — Zustände & Besitz", () => {
  it("frisches Profil: Kauf-Theme ist komplett 'buy', Zustand des Themes 'buy'", () => {
    const p = prof();
    const t = THEME_DEFS.sunset;
    for (const el of t.els) expect(elementState(p, t, el)).toBe("buy");
    expect(themeState(p, t)).toBe("buy");
  });
  it("gekauftes Deck-Element → 'own'; Theme wird 'mix'", () => {
    const p = prof({ ownedCosmetics: { "sunset:deck": true } });
    const t = THEME_DEFS.sunset;
    expect(elementState(p, t, "deck")).toBe("own");
    expect(elementState(p, t, "bf")).toBe("buy");
    expect(themeState(p, t)).toBe("mix");
    expect(elementOwned(p, t, "deck")).toBe(true);
  });
  it("alle fünf gekauft → Theme 'own'", () => {
    const owned = {}; for (const el of THEME_DEFS.kaiju.els) owned[`kaiju:${el}`] = true;
    expect(themeState(prof({ ownedCosmetics: owned }), THEME_DEFS.kaiju)).toBe("own");
  });
  it("Challenge-Theme gesperrt = 'lock'; erfüllt = 'own'", () => {
    const t = THEME_DEFS.feuer;
    expect(themeState(prof(), t)).toBe("lock");
    expect(elementState(prof(), t, "deck")).toBe("lock");
    const done = prof({ monoArchetypeRuns: { fire: true } });
    expect(themeState(done, t)).toBe("own");
    expect(elementState(done, t, "deck")).toBe("own");
  });
  it("Progressions-Theme staffelt: nach 5 Läufen Deck frei, BF noch gesperrt → 'mix'", () => {
    const p = prof({ games: 5 });
    const t = THEME_DEFS.neon;
    expect(elementState(p, t, "deck")).toBe("own");
    expect(elementState(p, t, "bf")).toBe("lock");
    expect(themeState(p, t)).toBe("mix");
  });
  it("Preise: Kauf-Element = 1 SP, Bedingungs-Element = null", () => {
    expect(elementPrice(THEME_DEFS.sunset, "deck")).toBe(COST_PER_ELEMENT);
    expect(elementPrice(THEME_DEFS.sunset, "frameGlow")).toBe(1);
    expect(elementPrice(THEME_DEFS.neon, "deck")).toBeNull();
    expect(elementPrice(THEME_DEFS.feuer, "deck")).toBeNull();
  });
});

describe("themes — Kauf-Ökonomie", () => {
  it("canBuyElement: nur mit genug SP und noch nicht im Besitz", () => {
    const t = THEME_DEFS.sunset;
    expect(canBuyElement(prof({ stichPoints: 0 }), t, "deck")).toBe(false);
    expect(canBuyElement(prof({ stichPoints: 1 }), t, "deck")).toBe(true);
    expect(canBuyElement(prof({ stichPoints: 5, ownedCosmetics: { "sunset:deck": true } }), t, "deck")).toBe(false);
    // Bedingungs-Element ist niemals SP-kaufbar
    expect(canBuyElement(prof({ stichPoints: 9 }), THEME_DEFS.neon, "deck")).toBe(false);
  });
  it("buyElement zieht 1 SP ab, bucht stichSpent und setzt Besitz", () => {
    const p0 = prof({ stichPoints: 3, stichSpent: 2 });
    const p1 = buyElement(p0, THEME_DEFS.sunset, "bf");
    expect(p1.stichPoints).toBe(2);
    expect(p1.stichSpent).toBe(3);
    expect(p1.ownedCosmetics["sunset:bf"]).toBe(true);
    expect(p0.ownedCosmetics["sunset:bf"]).toBeUndefined(); // Eingabe unverändert (rein)
  });
  it("buyElement bei zu wenig SP = No-op (identische Referenz)", () => {
    const p0 = prof({ stichPoints: 0 });
    expect(buyElement(p0, THEME_DEFS.sunset, "deck")).toBe(p0);
  });
  it("buyAllInfo: Rabatt durch bereits besessene Elemente", () => {
    const p = prof({ stichPoints: 9, ownedCosmetics: { "lofi:deck": true, "lofi:bf": true } });
    const info = buyAllInfo(p, THEME_DEFS.lofi);
    expect(info.total).toBe(5);
    expect(info.ownedCount).toBe(2);
    expect(info.remainingCount).toBe(3);
    expect(info.cost).toBe(3);
  });
  it("buyAllForTheme kauft alle offenen Elemente (alles-oder-nichts bei zu wenig SP)", () => {
    const t = THEME_DEFS.sunset;
    expect(buyAllForTheme(prof({ stichPoints: 4 }), t)).toEqual(expect.objectContaining({ stichPoints: 4 })); // 4 < 5 → No-op
    const done = buyAllForTheme(prof({ stichPoints: 6 }), t);
    expect(done.stichPoints).toBe(1);
    for (const el of t.els) expect(done.ownedCosmetics[`sunset:${el}`]).toBe(true);
  });
});

describe("themes — globale Effekte (Laser-Schnitt)", () => {
  const laser = GLOBAL_FX_BY_KEY.laserSlice;
  it("Registry: Laser-Schnitt mit ownKey + Options-Flagge", () => {
    expect(GLOBAL_FX.map((f) => f.key)).toContain("laserSlice");
    expect(laser.ownKey).toBe("fx:laserSlice");
    expect(laser.option).toBe("fxLaserSlice");
  });
  it("kaufen zieht SP ab, bucht stichSpent, setzt globalen Besitz", () => {
    const p0 = prof({ stichPoints: 2, stichSpent: 1 });
    expect(globalFxOwned(p0, laser)).toBe(false);
    expect(canBuyGlobalFx(p0, laser)).toBe(true);
    const p1 = buyGlobalFx(p0, laser);
    expect(p1.stichPoints).toBe(1);
    expect(p1.stichSpent).toBe(2);
    expect(globalFxOwned(p1, laser)).toBe(true);
    expect(canBuyGlobalFx(p1, laser)).toBe(false); // schon im Besitz
  });
  it("kaufen bei zu wenig SP = No-op", () => {
    const p0 = prof({ stichPoints: 0 });
    expect(buyGlobalFx(p0, laser)).toBe(p0);
  });
  it("laserSliceActive nur wenn gekauft UND per Option an", () => {
    const owned = prof({ ownedCosmetics: { "fx:laserSlice": true } });
    expect(laserSliceActive(owned, { fxLaserSlice: true })).toBe(true);
    expect(laserSliceActive(owned, { fxLaserSlice: false })).toBe(false);
    expect(laserSliceActive(prof(), { fxLaserSlice: true })).toBe(false); // nicht gekauft
  });
  it("Laser-Schnitt kostet GLOBAL_FX_COST SP", () => {
    expect(GLOBAL_FX_COST).toBe(1);
  });
});

describe("themes — Freischalt-Beschreibung (Challenge)", () => {
  it("Challenge-Theme liefert eine gemeinsame Bedingung (statt Einzelpreisen)", () => {
    const u = sharedUnlock(prof(), THEME_DEFS.feuer);
    expect(u).toBeTruthy();
    expect(u.label).toContain("Feuer");
  });
  it("Kauf-Theme hat KEINE gemeinsame Bedingung (Einzelpreise gelten)", () => {
    expect(sharedUnlock(prof(), THEME_DEFS.sunset)).toBeNull();
  });
  it("Progressions-Theme mit gestaffelten Bedingungen → keine gemeinsame Bedingung", () => {
    expect(sharedUnlock(prof(), THEME_DEFS.neon)).toBeNull();
    // aber die Einzel-Labels existieren
    expect(elementUnlock(prof(), THEME_DEFS.neon, "deck").label).toContain("5");
    expect(elementUnlock(prof(), THEME_DEFS.neon, "bf").label).toContain("10");
  });
});
