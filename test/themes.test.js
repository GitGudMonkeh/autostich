import { describe, it, expect } from "vitest";
import {
  THEME_DEFS, THEMES, PACKS, PACK_COST, PACK_DP_COST,
  packOwnKey, isBuyPack, hasBattlefield, packCond, packOwned, packState, packPrice, packUnlock,
  canBuyPack, buyPack, unlockAllCosmetics, packOwnKey,
  GLOBAL_FX, GLOBAL_FX_BY_KEY, GLOBAL_FX_COST, globalFxOwned, canBuyGlobalFx, buyGlobalFx,
  frameGlowActive, holoSwipeActive, hologridActive, activeFieldFx, starfieldActive, vignetteActive,
  laserSliceActive, blackholeActive, lasergridActive, burnBeamActive, overloadActive, disperseActive, fireworksActive, goldRainActive, prismaWaveActive,
} from "../src/game/themes.js";

// Minimal-Profil (nur was die Logik liest): SP-Guthaben, Besitz-Map, Freischalt-Flags/Zähler.
const prof = (o = {}) => ({ stichPoints: 0, stichSpent: 0, deckPoints: 0, deckSpent: 0, ownedCosmetics: {}, games: 0, bestStreak: 0, bestScore: 0,
  hadNoRerollRun: false, monoArchetypeRuns: {}, hadAllArchetypesRun: false, ...o });

describe("packs — Registry", () => {
  it("Kauf-Packs (Deck + Battlefield) als EIN Kauf — inkl. v0.4-Packs", () => {
    for (const id of ["sunset", "lofi", "beach", "cat", "ramen", "spacedog", "wale", "genesis"]) {
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
  it("#IP: Neon Kaiju / Super Aura / Mecha Ronin sind aus der Registry entfernt", () => {
    for (const id of ["kaiju", "aura", "mecha"]) expect(THEME_DEFS[id]).toBeUndefined();
  });
  it("Kauf-Packs bieten Deck + Battlefield; die Pack-Bedingung ist der Besitz-Schlüssel", () => {
    expect(THEME_DEFS.sunset.els).toEqual(["deck", "bf"]);
    expect(packCond(THEME_DEFS.sunset)).toEqual({ kind: "buy", ownKey: "pack:sunset" });
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
  });
  it("#303: die Challenge-Packs sind kind 'cond' (nicht kaufbar); alle übrigen Packs sind 'buy'", () => {
    const challenge = ["gottgleich", "serie300", "serie600", "sparfuchs", "meister"];
    for (const id of challenge) {
      const t = THEME_DEFS[id];
      expect(t.kind).toBe("cond");
      expect(t.els).toEqual(["deck", "bf"]);
      expect(isBuyPack(t)).toBe(false);
      expect(packPrice(t)).toBe(null); // cond-Packs kosten nichts
    }
    for (const pack of THEMES) {
      if (challenge.includes(pack.id)) continue;
      expect(pack.kind).toBe("buy");
    }
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
  it("unlockAllCosmetics schaltet ALLE Kauf-Packs + globalen Effekte frei (additiv)", () => {
    const p = unlockAllCosmetics(prof({ ownedCosmetics: { existing: true } }));
    expect(p.ownedCosmetics.existing).toBe(true); // Bestand bleibt
    for (const pack of THEMES) if (isBuyPack(pack)) expect(p.ownedCosmetics[packOwnKey(pack)]).toBe(true);
    for (const fx of GLOBAL_FX) expect(p.ownedCosmetics[fx.ownKey]).toBe(true);
  });
});

describe("effekte — Karten-Animationen sind jetzt GLOBAL", () => {
  it("Karten-Animationen (frameGlow/holoSwipe) sind group 'anim' mit fx:-Besitz + Options-Flag", () => {
    for (const key of ["frameGlow", "holoSwipe"]) {
      const fx = GLOBAL_FX_BY_KEY[key];
      expect(fx).toBeTruthy();
      expect(fx.group).toBe("anim");
      expect(fx.ownKey).toBe(`fx:${key}`);
      expect(fx.preview).toBe(key);
    }
    expect(GLOBAL_FX_BY_KEY.frameGlow.option).toBe("fxFrameGlow");
    expect(GLOBAL_FX_BY_KEY.holoSwipe.option).toBe("fxHoloSwipe");
  });
  it("#306: Hologrid + die 6 neuen Ambiente-Effekte sind group 'field' (Battlefield-Ambiente)", () => {
    for (const key of ["hologrid", "starfield", "aurora", "embers", "dataRain", "scanline", "vignette"]) {
      const fx = GLOBAL_FX_BY_KEY[key];
      expect(fx).toBeTruthy();
      expect(fx.group).toBe("field");
      expect(fx.ownKey).toBe(`fx:${key}`);
      expect(fx.preview).toBe(key);
    }
    expect(GLOBAL_FX_BY_KEY.hologrid.option).toBe("fxHologrid");
    expect(GLOBAL_FX_BY_KEY.starfield.option).toBe("fxStarfield");
    expect(GLOBAL_FX_BY_KEY.vignette.option).toBe("fxVignette");
  });
  it("#306 activeFieldFx: liefert den EINEN aktiven Feld-Effekt (gekauft + Option an), sonst null", () => {
    expect(activeFieldFx(prof(), {})).toBe(null);
    // Option an, aber nicht gekauft → nicht aktiv.
    expect(activeFieldFx(prof(), { fxStarfield: true })).toBe(null);
    const owned = prof({ ownedCosmetics: { "fx:starfield": true, "fx:vignette": true } });
    expect(starfieldActive(owned, { fxStarfield: true })).toBe(true);
    expect(vignetteActive(owned, { fxVignette: true })).toBe(true);
    expect(activeFieldFx(owned, { fxStarfield: true })).toBe("starfield");
    // Reihenfolge = Priorität (hologrid vor starfield vor …), falls defensiv mehrere Flags an wären.
    const both = prof({ ownedCosmetics: { "fx:hologrid": true, "fx:starfield": true } });
    expect(activeFieldFx(both, { fxHologrid: true, fxStarfield: true })).toBe("hologrid");
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
  it("#300 Überladung + Zerstäubung: ownKey/option + group finisher, je 1 SP kaufbar & exklusiv-fähig", () => {
    for (const [key, own, opt] of [["overload", "fx:overload", "fxOverload"], ["disperse", "fx:disperse", "fxDisperse"]]) {
      const fx = GLOBAL_FX_BY_KEY[key];
      expect(fx).toBeTruthy();
      expect(fx.ownKey).toBe(own);
      expect(fx.option).toBe(opt);
      expect(fx.group).toBe("finisher");
      const p0 = prof({ stichPoints: 1 });
      expect(canBuyGlobalFx(p0, fx)).toBe(true);
      const p1 = buyGlobalFx(p0, fx);
      expect(globalFxOwned(p1, fx)).toBe(true);
      expect(p1.stichPoints).toBe(0);
    }
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
      ["overload", overloadActive, "fxOverload"],
      ["disperse", disperseActive, "fxDisperse"],
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
  it("Registry führt Blackhole (finisher) und das Gottgleich-Prunk-Trio (gott)", () => {
    for (const k of ["blackhole", "fireworks", "goldRain", "prismaWave"]) {
      expect(GLOBAL_FX_BY_KEY[k]).toBeTruthy();
      expect(GLOBAL_FX_BY_KEY[k].ownKey).toBe(`fx:${k}`);
    }
    expect(GLOBAL_FX_BY_KEY.blackhole.group).toBe("finisher");
    expect(GLOBAL_FX_BY_KEY.fireworks.group).toBe("gott");
    expect(GLOBAL_FX_BY_KEY.shatter).toBeUndefined();   // #: Shatter (Krit) entfernt
    expect(GLOBAL_FX_BY_KEY.gridTunnel).toBeUndefined(); // Grid-Tunnel bleibt entfernt
  });
  it("Käufe sind voneinander getrennt", () => {
    const p1 = buyGlobalFx(prof({ stichPoints: 1 }), GLOBAL_FX_BY_KEY.blackhole);
    expect(globalFxOwned(p1, GLOBAL_FX_BY_KEY.blackhole)).toBe(true);
    expect(globalFxOwned(p1, GLOBAL_FX_BY_KEY.laserSlice)).toBe(false);
    expect(globalFxOwned(p1, GLOBAL_FX_BY_KEY.overload)).toBe(false);
  });
  it("GLOBAL_FX_COST = 1", () => {
    expect(GLOBAL_FX_COST).toBe(1);
  });
});
