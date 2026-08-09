import { describe, it, expect } from "vitest";
import {
  THEME_DEFS, THEMES, PACKS, PACK_COST, PACK_DP_COST,
  packOwnKey, isBuyPack, hasBattlefield, packCond, packOwned, packState, packPrice, packUnlock,
  canBuyPack, buyPack,
  GLOBAL_FX, GLOBAL_FX_BY_KEY, GLOBAL_FX_COST, globalFxOwned, canBuyGlobalFx, buyGlobalFx,
  frameGlowActive, holoSwipeActive, hologridActive,
  laserSliceActive, blackholeActive, lasergridActive, burnBeamActive, shatterActive, fireworksActive, goldRainActive, prismaWaveActive,
} from "../src/game/themes.js";

// Minimal-Profil (nur was die Logik liest): SP-Guthaben, Besitz-Map, Freischalt-Flags/Zähler.
const prof = (o = {}) => ({ stichPoints: 0, stichSpent: 0, deckPoints: 0, deckSpent: 0, ownedCosmetics: {}, games: 0, bestStreak: 0, bestScore: 0,
  hadNoRerollRun: false, monoArchetypeRuns: {}, hadAllArchetypesRun: false, ...o });

describe("packs — Registry", () => {
  it("Kauf-Packs (Deck + Battlefield) als EIN Kauf — inkl. v0.4-Packs", () => {
    for (const id of ["sunset", "lofi", "kaiju", "aura", "beach", "cat", "mecha", "ramen", "spacedog", "wale", "genesis"]) {
      const t = THEME_DEFS[id];
      expect(t.kind).toBe("buy");
      expect(t.els).toEqual(["deck", "bf"]);
      expect(isBuyPack(t)).toBe(true);
      expect(hasBattlefield(t)).toBe(true);
    }
  });
  it("PACKS ist ein Alias auf THEMES", () => {
    expect(PACKS).toBe(THEMES);
  });
  it("Kauf-Pack: Bedingung ist der eigene Pack-Besitzschlüssel", () => {
    const t = THEME_DEFS.sunset;
    expect(packOwnKey(t)).toBe("pack:sunset");
    expect(packCond(t)).toEqual({ kind: "buy", ownKey: "pack:sunset" });
  });
  it("v0.4: alte Challenge-Packs sind aus der Registry entfernt", () => {
    for (const id of ["endlos", "rekord", "spar", "feuer", "blitz", "eis", "pflanze", "bund"]) {
      expect(THEME_DEFS[id]).toBeUndefined();
    }
  });
  it("Kauf-Packs bieten Deck + Battlefield; die Pack-Bedingung ist der Besitz-Schlüssel", () => {
    expect(THEME_DEFS.kaiju.els).toEqual(["deck", "bf"]);
    expect(packCond(THEME_DEFS.kaiju)).toEqual({ kind: "buy", ownKey: "pack:kaiju" });
  });
});

describe("packs — Zustände & Besitz", () => {
  it("frisches Profil: Kauf-Pack ist 'buy'", () => {
    const t = THEME_DEFS.sunset;
    expect(packState(prof(), t)).toBe("buy");
    expect(packOwned(prof(), t)).toBe(false);
    expect(packPrice(t)).toBe(PACK_DP_COST);   // #299: Packs kosten DP
  });
  it("gekauftes Pack → 'own'", () => {
    const p = prof({ ownedCosmetics: { "pack:sunset": true } });
    expect(packState(p, THEME_DEFS.sunset)).toBe("own");
    expect(packOwned(p, THEME_DEFS.sunset)).toBe(true);
  });
  it("#299: alte Progressions-/Bedingungs-Packs (neon/tank/mega/mond) sind entfernt", () => {
    for (const id of ["neon", "tank", "mega", "mond"]) expect(THEME_DEFS[id]).toBeUndefined();
    // Alle verbliebenen Packs sind Kauf-Packs (kind "buy") — keine „cond"-Packs mehr.
    expect(THEMES.every((p) => p.kind === "buy")).toBe(true);
  });
});

describe("packs — Kauf-Ökonomie (#299: DP)", () => {
  it("canBuyPack: nur Kauf-Pack, genug DP, noch nicht im Besitz", () => {
    const t = THEME_DEFS.sunset;
    expect(canBuyPack(prof({ deckPoints: PACK_DP_COST - 1 }), t)).toBe(false);
    expect(canBuyPack(prof({ deckPoints: PACK_DP_COST }), t)).toBe(true);
    expect(canBuyPack(prof({ deckPoints: PACK_DP_COST, ownedCosmetics: { "pack:sunset": true } }), t)).toBe(false);
    // SP allein reichen nicht (Pack läuft über DP)
    expect(canBuyPack(prof({ stichPoints: 99, deckPoints: 0 }), t)).toBe(false);
    // Nicht-Kauf-Pack (synthetisch) ist niemals kaufbar
    expect(canBuyPack(prof({ deckPoints: 99 }), { kind: "cond", deckId: "x" })).toBe(false);
  });
  it("buyPack zieht PACK_DP_COST DP ab, bucht deckSpent, setzt Besitz (rein)", () => {
    const p0 = prof({ deckPoints: PACK_DP_COST + 2, deckSpent: 2 });
    const p1 = buyPack(p0, THEME_DEFS.lofi);
    expect(p1.deckPoints).toBe(2);
    expect(p1.deckSpent).toBe(2 + PACK_DP_COST);
    expect(p1.stichPoints).toBe(p0.stichPoints); // SP unberührt
    expect(p1.ownedCosmetics["pack:lofi"]).toBe(true);
    expect(p0.ownedCosmetics["pack:lofi"]).toBeUndefined(); // Eingabe unverändert
  });
  it("buyPack bei zu wenig DP = No-op (identische Referenz)", () => {
    const p0 = prof({ deckPoints: 0 });
    expect(buyPack(p0, THEME_DEFS.sunset)).toBe(p0);
  });
});

describe("effekte — Karten-Animationen sind jetzt GLOBAL", () => {
  it("Registry führt die drei Animationen als group 'anim' mit fx:-Besitz + Options-Flag", () => {
    for (const key of ["frameGlow", "holoSwipe", "hologrid"]) {
      const fx = GLOBAL_FX_BY_KEY[key];
      expect(fx).toBeTruthy();
      expect(fx.group).toBe("anim");
      expect(fx.ownKey).toBe(`fx:${key}`);
      expect(fx.preview).toBe(key);
    }
    expect(GLOBAL_FX_BY_KEY.frameGlow.option).toBe("fxFrameGlow");
    expect(GLOBAL_FX_BY_KEY.holoSwipe.option).toBe("fxHoloSwipe");
    expect(GLOBAL_FX_BY_KEY.hologrid.option).toBe("fxHologrid");
  });
  it("global gekauft + per Option an → aktiv (für alle Packs)", () => {
    const cases = [
      ["frameGlow", frameGlowActive, "fxFrameGlow"],
      ["holoSwipe", holoSwipeActive, "fxHoloSwipe"],
      ["hologrid", hologridActive, "fxHologrid"],
    ];
    for (const [key, activeFn, opt] of cases) {
      const owned = prof({ ownedCosmetics: { [`fx:${key}`]: true } });
      expect(activeFn(owned, { [opt]: true })).toBe(true);
      expect(activeFn(owned, { [opt]: false })).toBe(false);
      expect(activeFn(prof(), { [opt]: true })).toBe(false); // nicht gekauft
    }
  });
  it("kaufen zieht 1 SP ab und setzt den globalen Besitz", () => {
    const p1 = buyGlobalFx(prof({ stichPoints: 1 }), GLOBAL_FX_BY_KEY.frameGlow);
    expect(p1.stichPoints).toBe(0);
    expect(globalFxOwned(p1, GLOBAL_FX_BY_KEY.frameGlow)).toBe(true);
  });
});

describe("effekte — Finisher/Krit/Prunk", () => {
  const laser = GLOBAL_FX_BY_KEY.laserSlice;
  it("Laser-Schnitt: ownKey + Options-Flag + group finisher", () => {
    expect(laser.ownKey).toBe("fx:laserSlice");
    expect(laser.option).toBe("fxLaserSlice");
    expect(laser.group).toBe("finisher");
    expect(GLOBAL_FX_BY_KEY.blackhole.group).toBe("finisher");
  });
  it("kaufen zieht SP ab, bucht stichSpent, setzt globalen Besitz", () => {
    const p0 = prof({ stichPoints: 2, stichSpent: 1 });
    expect(canBuyGlobalFx(p0, laser)).toBe(true);
    const p1 = buyGlobalFx(p0, laser);
    expect(p1.stichPoints).toBe(1);
    expect(p1.stichSpent).toBe(2);
    expect(globalFxOwned(p1, laser)).toBe(true);
    expect(canBuyGlobalFx(p1, laser)).toBe(false);
  });
  it("kaufen bei zu wenig SP = No-op", () => {
    const p0 = prof({ stichPoints: 0 });
    expect(buyGlobalFx(p0, laser)).toBe(p0);
  });
  it("*Active-Helfer: nur gekauft UND per Option an", () => {
    const cases = [
      ["laserSlice", laserSliceActive, "fxLaserSlice"],
      ["blackhole", blackholeActive, "fxBlackhole"],
      ["lasergrid", lasergridActive, "fxLasergrid"],
      ["burnBeam", burnBeamActive, "fxBurnBeam"],
      ["shatter", shatterActive, "fxShatter"],
      ["fireworks", fireworksActive, "fxFireworks"],
      ["goldRain", goldRainActive, "fxGoldRain"],
      ["prismaWave", prismaWaveActive, "fxPrismaWave"],
    ];
    for (const [key, activeFn, opt] of cases) {
      const owned = prof({ ownedCosmetics: { [`fx:${key}`]: true } });
      expect(activeFn(owned, { [opt]: true })).toBe(true);
      expect(activeFn(owned, { [opt]: false })).toBe(false);
      expect(activeFn(prof(), { [opt]: true })).toBe(false);
    }
  });
  it("Registry führt Blackhole (finisher), Shatter (crit) und das Gottgleich-Prunk-Trio (gott)", () => {
    for (const k of ["blackhole", "shatter", "fireworks", "goldRain", "prismaWave"]) {
      expect(GLOBAL_FX_BY_KEY[k]).toBeTruthy();
      expect(GLOBAL_FX_BY_KEY[k].ownKey).toBe(`fx:${k}`);
    }
    expect(GLOBAL_FX_BY_KEY.shatter.group).toBe("crit");
    expect(GLOBAL_FX_BY_KEY.fireworks.group).toBe("gott");
    expect(GLOBAL_FX_BY_KEY.gridTunnel).toBeUndefined(); // Grid-Tunnel bleibt entfernt
  });
  it("Käufe sind voneinander getrennt", () => {
    const p1 = buyGlobalFx(prof({ stichPoints: 1 }), GLOBAL_FX_BY_KEY.blackhole);
    expect(globalFxOwned(p1, GLOBAL_FX_BY_KEY.blackhole)).toBe(true);
    expect(globalFxOwned(p1, GLOBAL_FX_BY_KEY.laserSlice)).toBe(false);
    expect(globalFxOwned(p1, GLOBAL_FX_BY_KEY.shatter)).toBe(false);
  });
  it("GLOBAL_FX_COST = 1", () => {
    expect(GLOBAL_FX_COST).toBe(1);
  });
});
