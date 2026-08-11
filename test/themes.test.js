import { describe, it, expect } from "vitest";
import {
  THEME_DEFS, THEMES, PACKS,
  packOwnKey, isBuyPack, hasBattlefield, packCond, packOwned, packState, packPrice, packUnlock,
  canBuyPack, buyPack, unlockAllCosmetics,
  GLOBAL_FX, GLOBAL_FX_BY_KEY, globalFxPrice, globalFxOwned, canBuyGlobalFx, buyGlobalFx,
  auroraActive, embersActive, activeBgFx, activeBgFinisher,
} from "../src/game/themes.js";

// Minimal-Profil (nur was die Logik liest): SP-Guthaben, Besitz-Map, Freischalt-Flags/Zähler.
const prof = (o = {}) => ({ stichPoints: 0, stichSpent: 0, deckPoints: 0, deckSpent: 0, ownedCosmetics: {}, games: 0, bestStreak: 0, bestScore: 0,
  hadNoRerollRun: false, monoArchetypeRuns: {}, hadAllArchetypesRun: false, ...o });

describe("packs — Registry", () => {
  it("Kauf-Packs (Deck + Battlefield) als EIN Kauf — inkl. v0.4-Packs", () => {
    for (const id of ["sunset", "lofi", "beach", "cat", "ramen", "spacedog", "wale"]) {
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
    for (const id of ["endlos", "rekord", "spar", "bund"]) {
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
    expect(packPrice(t)).toBe(10);   // #307: Sunset Rider = 10 DP (je Pack eigener Preis)
  });
  it("#307: jedes Kauf-Pack trägt seinen DP-Preis (packPrice = pack.price)", () => {
    const want = { lofi: 5, cat: 5, spacedog: 5, beach: 10, sunset: 10, ramen: 10, wale: 15 };
    for (const [id, dp] of Object.entries(want)) expect(packPrice(THEME_DEFS[id])).toBe(dp);
  });
  it("#310: die vier DP-Kauf-Packs tragen ihre Einzelpreise", () => {
    expect(packPrice(THEME_DEFS.samurai)).toBe(15);
    expect(packPrice(THEME_DEFS.kosmos)).toBe(10);
    expect(packPrice(THEME_DEFS.oni)).toBe(20);
    expect(packPrice(THEME_DEFS.geometrie)).toBe(5);
  });
  it("#311: Sonnenfinsternis + Goldener Drache sind Kauf-Packs à 10 DP", () => {
    for (const id of ["sonne", "drache"]) {
      const t = THEME_DEFS[id];
      expect(t.kind).toBe("buy");
      expect(isBuyPack(t)).toBe(true);
      expect(t.els).toEqual(["deck", "bf"]);
      expect(packPrice(t)).toBe(10);
    }
    expect(canBuyPack(prof({ deckPoints: 9 }), THEME_DEFS.sonne)).toBe(false);
    expect(canBuyPack(prof({ deckPoints: 10 }), THEME_DEFS.drache)).toBe(true);
  });
  it("#310: canBuyPack/buyPack rechnen mit dem Pack-Preis (Roter Oni = 20 DP)", () => {
    const oni = THEME_DEFS.oni;
    expect(canBuyPack(prof({ deckPoints: 19 }), oni)).toBe(false);
    expect(canBuyPack(prof({ deckPoints: 20 }), oni)).toBe(true);
    const p1 = buyPack(prof({ deckPoints: 25, deckSpent: 3 }), oni);
    expect(p1.deckPoints).toBe(5);
    expect(p1.deckSpent).toBe(23);
    expect(p1.ownedCosmetics["pack:oni"]).toBe(true);
  });
  it("#310: Element-Challenge (cond) — frei erst nach 5 Mono-Läufen; Prisma erst wenn alle vier frei", () => {
    const feuer = THEME_DEFS.feuer;
    expect(packState(prof(), feuer)).toBe("lock");
    expect(packOwned(prof({ monoArchetypeRuns: { fire: 4 } }), feuer)).toBe(false);
    expect(packOwned(prof({ monoArchetypeRuns: { fire: 5 } }), feuer)).toBe(true);
    expect(packUnlock(prof({ monoArchetypeRuns: { fire: 3 } }), feuer)).toMatchObject({ cur: 3, target: 5 });
    const multi = THEME_DEFS.elementar;
    expect(packOwned(prof({ monoArchetypeRuns: { fire: 5, ice: 5, lightning: 5 } }), multi)).toBe(false);
    expect(packOwned(prof({ monoArchetypeRuns: { fire: 5, ice: 5, lightning: 5, plant: 5 } }), multi)).toBe(true);
    expect(packUnlock(prof({ monoArchetypeRuns: { fire: 5, ice: 5 } }), multi)).toMatchObject({ cur: 2, target: 4 });
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
    const challenge = ["gottgleich", "serie300", "serie600", "sparfuchs", "meister",
      "feuer", "eis", "blitz", "pflanze", "elementar", // #310 Element-Challenges + Prisma-Multi
      "genesis"]; // #: Genesis = Onboarding-Freischalt-Pack (cond, nicht kaufbar)
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
  it("canBuyPack: nur Kauf-Pack, genug DP (Pack-Preis), noch nicht im Besitz", () => {
    const t = THEME_DEFS.sunset; // 10 DP
    expect(canBuyPack(prof({ deckPoints: 9 }), t)).toBe(false);
    expect(canBuyPack(prof({ deckPoints: 10 }), t)).toBe(true);
    expect(canBuyPack(prof({ deckPoints: 10, ownedCosmetics: { "pack:sunset": true } }), t)).toBe(false);
    // SP allein reichen nicht (Pack läuft über DP)
    expect(canBuyPack(prof({ stichPoints: 99, deckPoints: 0 }), t)).toBe(false);
    // Nicht-Kauf-Pack (synthetisch) ist niemals kaufbar
    expect(canBuyPack(prof({ deckPoints: 99 }), { kind: "cond", deckId: "x" })).toBe(false);
  });
  it("buyPack zieht den Pack-Preis in DP ab, bucht deckSpent, setzt Besitz (rein)", () => {
    const t = THEME_DEFS.lofi; // 5 DP
    const p0 = prof({ deckPoints: 5 + 2, deckSpent: 2 });
    const p1 = buyPack(p0, t);
    expect(p1.deckPoints).toBe(2);
    expect(p1.deckSpent).toBe(2 + 5);
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

describe("effekte — verbliebene Effekte nach dem #cleanup", () => {
  // #cleanup: Es bleiben: Hintergrund-Effekt „Aurora" (bgfx) und die Hintergrund-Finisher „Glutfunken" + „Sternenfeld"
  // (bgfin; #311 überarbeitet wieder eingeführt). Klinge ist ein synthetischer Sieg-Finisher (NICHT in GLOBAL_FX). Die
  // Gottgleich-Kategorie bleibt im Shop (nur „Standard", ebenfalls synthetisch), enthält aber KEINE GLOBAL_FX-Einträge.
  it("GLOBAL_FX führt aurora, embers und starfield", () => {
    expect(GLOBAL_FX.map((f) => f.key).sort()).toEqual(["aurora", "embers", "starfield"].sort());
  });
  it("entfernte Effekte sind vollständig aus der Registry", () => {
    // #311: starfield ist wieder da → NICHT mehr in dieser Entfernt-Liste.
    for (const k of ["frameGlow", "holoSwipe", "auroraVeil", "glitch", "hologrid", "scanline", "vignette",
                     "laserSlice", "blackhole", "lasergrid", "burnBeam", "overload", "disperse", "klinge",
                     "fireworks", "goldRain", "prismaWave", "gottStandard"]) {
      expect(GLOBAL_FX_BY_KEY[k]).toBeUndefined();
    }
  });
  it("#kategorien: aurora liegt in bgfx (reiner Hintergrund), embers + starfield in bgfin (Hintergrund-Finisher)", () => {
    const GROUP = { aurora: "bgfx", embers: "bgfin", starfield: "bgfin" };
    for (const [key, group] of Object.entries(GROUP)) {
      const fx = GLOBAL_FX_BY_KEY[key];
      expect(fx).toBeTruthy();
      expect(fx.group).toBe(group);
      expect(fx.ownKey).toBe(`fx:${key}`);
      expect(fx.preview).toBe(key);
    }
  });
  it("activeBgFx / activeBgFinisher: je Slot der EINE aktive Effekt (gekauft + Option an), sonst null", () => {
    expect(activeBgFx(prof(), {})).toBe(null);
    expect(activeBgFinisher(prof(), {})).toBe(null);
    // Option an, aber nicht gekauft → nicht aktiv.
    expect(activeBgFx(prof(), { fxAurora: true })).toBe(null);
    const owned = prof({ ownedCosmetics: { "fx:aurora": true, "fx:embers": true } });
    expect(auroraActive(owned, { fxAurora: true })).toBe(true);
    expect(embersActive(owned, { fxEmbers: true })).toBe(true);
    expect(activeBgFx(owned, { fxAurora: true })).toBe("aurora");
    expect(activeBgFinisher(owned, { fxEmbers: true })).toBe("embers");
    // Beide Slots UNABHÄNGIG → können gleichzeitig aktiv sein.
    expect(activeBgFx(owned, { fxAurora: true, fxEmbers: true })).toBe("aurora");
    expect(activeBgFinisher(owned, { fxAurora: true, fxEmbers: true })).toBe("embers");
  });
  it("*Active-Helfer: nur gekauft UND per Option an", () => {
    const cases = [
      ["aurora", auroraActive, "fxAurora"],
      ["embers", embersActive, "fxEmbers"],
    ];
    for (const [key, activeFn, opt] of cases) {
      const owned = prof({ ownedCosmetics: { [`fx:${key}`]: true } });
      expect(activeFn(owned, { [opt]: true })).toBe(true);
      expect(activeFn(owned, { [opt]: false })).toBe(false);
      expect(activeFn(prof(), { [opt]: true })).toBe(false); // nicht gekauft
    }
  });
  it("#307: kaufen zieht DP ab, bucht deckSpent, setzt globalen Besitz (SP unberührt)", () => {
    const embers = GLOBAL_FX_BY_KEY.embers; // 8 DP
    const price = globalFxPrice(embers);
    const p0 = prof({ deckPoints: price + 1, deckSpent: 1, stichPoints: 9 });
    expect(canBuyGlobalFx(p0, embers)).toBe(true);
    const p1 = buyGlobalFx(p0, embers);
    expect(p1.deckPoints).toBe(1);
    expect(p1.deckSpent).toBe(1 + price);
    expect(p1.stichPoints).toBe(9); // SP unberührt
    expect(globalFxOwned(p1, embers)).toBe(true);
    expect(canBuyGlobalFx(p1, embers)).toBe(false);
  });
  it("kaufen bei zu wenig DP = No-op", () => {
    const p0 = prof({ deckPoints: 0, stichPoints: 99 });
    expect(buyGlobalFx(p0, GLOBAL_FX_BY_KEY.aurora)).toBe(p0);
  });
  it("Käufe sind voneinander getrennt", () => {
    const p1 = buyGlobalFx(prof({ deckPoints: 25 }), GLOBAL_FX_BY_KEY.aurora);
    expect(globalFxOwned(p1, GLOBAL_FX_BY_KEY.aurora)).toBe(true);
    expect(globalFxOwned(p1, GLOBAL_FX_BY_KEY.embers)).toBe(false);
  });
  it("#307: jeder verbliebene Effekt trägt seinen DP-Preis (globalFxPrice = fx.price)", () => {
    const want = { aurora: 10, embers: 8 };
    for (const [key, dp] of Object.entries(want)) expect(globalFxPrice(GLOBAL_FX_BY_KEY[key])).toBe(dp);
  });
});
