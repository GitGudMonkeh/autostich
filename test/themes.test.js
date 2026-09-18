import { describe, it, expect } from "vitest";
// exp: ALL_UNLOCKED (cosmetics.js) short-circuits every unlock and ownership gate on the playground. The tests of
// those gates sleep while the switch is on and return with it — they are not deleted, and not weakened.
import { ALL_UNLOCKED } from "../src/game/cosmetics.js";
import {
  THEME_DEFS, THEMES, PACKS,
  packOwnKey, isBuyPack, hasBattlefield, packCond, packOwned, packState, packPrice, packUnlock,
  canBuyPack, buyPack, unlockAllCosmetics, BUYABLE_FINISHER_FX,
  GLOBAL_FX, GLOBAL_FX_BY_KEY, globalFxPrice, globalFxOwned, canBuyGlobalFx, buyGlobalFx,
  auroraActive, activeBgFx, activeBgFinisher, BG_FX_KEYS, BG_FIN_KEYS,
  GOTT_FX_KEYS, gottFxOwned, activeGottFx,
  isTieredPack, unlockedTiers, highestUnlockedTier, coverTier, tierByDeckId, tierAsPack, packHasTierDeck, resolvePackByDeckId,
} from "../src/game/themes.js";
import { DECK_DEFS, BATTLEFIELD_DEFS, isUnlocked } from "../src/game/cosmetics.js";
import { BUYABLE_FINISHER_OWNKEYS, PACKS_TAB, CHALLENGES_TAB } from "../src/ui/CustomizeScreen.jsx";
import { BG_EXCL_OPTS, normalizeFxOptions } from "../src/game/storage.js";
import { BOARD_POSITIONS } from "../src/game/constants.js";
import { N_POS } from "../src/game/architect.js";
import { buildDeck, makeRng } from "../src/game/deck.js";
import { initialState } from "../src/game/reducer.js";

// Minimal-Profil (nur was die Logik liest): SP-Guthaben, Besitz-Map, Freischalt-Flags/Zähler.
const prof = (o = {}) => ({ stichPoints: 0, stichSpent: 0, deckPoints: 0, deckSpent: 0, ownedCosmetics: {}, games: 0, bestStreak: 0, bestScore: 0,
  hadNoRerollRun: false, monoArchetypeRuns: {}, hadAllArchetypesRun: false, ...o });

describe("packs — Registry", () => {
  it("Kauf-Packs (Deck + Battlefield) als EIN Kauf — inkl. v0.4-Packs", () => {
    for (const id of ["sunset", "lofi", "beach", "cat", "spacedog", "wale"]) {
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
  it.skipIf(ALL_UNLOCKED)("frisches Profil: Kauf-Pack ist 'buy'", () => {
    const t = THEME_DEFS.sunset;
    expect(packState(prof(), t)).toBe("buy");
    expect(packOwned(prof(), t)).toBe(false);
    expect(packPrice(t)).toBe(20);   // #307: Sunset Rider = 20 DP (je Pack eigener Preis)
  });
  it("#307: jedes Kauf-Pack trägt seinen DP-Preis (packPrice = pack.price)", () => {
    const want = { lofi: 10, cat: 10, spacedog: 10, beach: 20, sunset: 20, wale: 30 };
    for (const [id, dp] of Object.entries(want)) expect(packPrice(THEME_DEFS[id])).toBe(dp);
  });
  it("#310: die vier DP-Kauf-Packs tragen ihre Einzelpreise", () => {
    expect(packPrice(THEME_DEFS.ronin)).toBe(30);
    expect(packPrice(THEME_DEFS.kosmos)).toBe(20);
    expect(packPrice(THEME_DEFS.oni)).toBe(20);
    expect(packPrice(THEME_DEFS.geometrie)).toBe(10);
  });
  it.skipIf(ALL_UNLOCKED)("#311: Kolossus + Laternenfest (sonne/drache) sind Kauf-Packs à 20 DP", () => {
    for (const id of ["sonne", "drache"]) {
      const t = THEME_DEFS[id];
      expect(t.kind).toBe("buy");
      expect(isBuyPack(t)).toBe(true);
      expect(t.els).toEqual(["deck", "bf"]);
      expect(packPrice(t)).toBe(20);
    }
    expect(canBuyPack(prof({ deckPoints: 19 }), THEME_DEFS.sonne)).toBe(false);
    expect(canBuyPack(prof({ deckPoints: 20 }), THEME_DEFS.drache)).toBe(true);
  });
  it.skipIf(ALL_UNLOCKED)("#310: canBuyPack/buyPack rechnen mit dem Pack-Preis (Roter Oni = 20 DP)", () => {
    const oni = THEME_DEFS.oni;
    expect(canBuyPack(prof({ deckPoints: 19 }), oni)).toBe(false);
    expect(canBuyPack(prof({ deckPoints: 20 }), oni)).toBe(true);
    const p1 = buyPack(prof({ deckPoints: 25, deckSpent: 3 }), oni);
    expect(p1.deckPoints).toBe(5);
    expect(p1.deckSpent).toBe(23);
    expect(p1.ownedCosmetics["pack:oni"]).toBe(true);
  });
  it.skipIf(ALL_UNLOCKED)("#310: Element-Challenge (cond) — frei erst nach 5 Mono-Läufen; Prisma erst wenn alle vier frei", () => {
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
    const challenge = ["gottgleich", "peacock", "titan", "hirsch", "thron", "sparfuchs",
      "feuer", "eis", "blitz", "pflanze", "elementar", // #310 Element-Challenges + Prisma-Multi
      "genesis", // #: Genesis = Onboarding-Freischalt-Pack (cond, nicht kaufbar)
      "kataklysmus", // #tiered: zweites Score-Stufen-Deck (150/250/400 Mio), oberhalb von Titan
      "insertcoin"]; // #deck-insertcoin: GESCHENK-Pack, kein erspieltes — cond nur, weil es an einem
                     // abgeschlossenen Lauf hängt statt an einem Preis. Steht hier, damit die „alles Übrige ist buy“-Klammer
                     // unten hält; im Hub läuft es über die Packs-Seite (siehe CHALLENGES_TAB).
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

/* SHOP-VOLLSTÄNDIGKEIT — der Wächter, der bei Insert Coin gefehlt hat.

   Die beiden Reiter der Deck-Werkstatt teilen THEMES vollständig unter sich auf: „Packs“ nimmt die
   Kauf-Packs plus die Geschenke, „Challenges“ die erspielten cond-Packs. Ein neues cond-Pack, das nur aus
   dem Challenges-Filter ausgenommen wird, landet in KEINEM der beiden und ist im Shop unsichtbar — der
   Fehler fiel erst im Spiel auf, weil beide Filter für sich genommen richtig aussahen. Deshalb wird hier
   nicht der einzelne Filter geprüft, sondern die Summe: jedes Pack genau einmal. */
describe("Deck-Werkstatt — jedes Pack erscheint in genau einem Reiter", () => {
  const inTabs = (id) => PACKS_TAB.filter((p) => p.id === id).length + CHALLENGES_TAB.filter((p) => p.id === id).length;

  it("kein Pack faellt durch beide Raster, keines steht doppelt", () => {
    const fehlen = THEMES.filter((t) => inTabs(t.id) === 0).map((t) => t.id);
    const doppelt = THEMES.filter((t) => inTabs(t.id) > 1).map((t) => t.id);
    expect(fehlen, `nicht im Shop sichtbar: ${fehlen.join(", ")}`).toEqual([]);
    expect(doppelt, `in beiden Reitern: ${doppelt.join(", ")}`).toEqual([]);
  });

  it("die Geschenk-Packs stehen auf der Packs-Seite, nicht bei den Challenges", () => {
    for (const id of ["genesis", "insertcoin"]) {
      expect(PACKS_TAB.some((p) => p.id === id), `${id} fehlt auf der Packs-Seite`).toBe(true);
      expect(CHALLENGES_TAB.some((p) => p.id === id), `${id} steht faelschlich bei den Challenges`).toBe(false);
    }
  });

  it("die erspielten cond-Packs stehen bei den Challenges", () => {
    for (const id of ["gottgleich", "titan", "hirsch", "sparfuchs"]) {
      expect(CHALLENGES_TAB.some((p) => p.id === id), `${id} fehlt im Challenges-Reiter`).toBe(true);
    }
  });
});

/* #deck-insertcoin „Insert Coin“ — das Willkommensgeschenk. Gewacht wird die Schwelle selbst, und dass
   Deck und Battlefield DIESELBE Bedingung tragen — ginge nur eins von beiden auf, stuende im Hub ein
   halbes Pack.

   NACHGEZOGEN: Der Satz „ab dem ersten ABGESCHLOSSENEN Lauf offen" stand hier von Anfang an, geprüft
   wurde aber `games` — und das zählt jeden BEGONNENEN Lauf, Abbrüche eingeschlossen. Das Deck ging
   deshalb auch nach einem Abbruch auf (gemeldet). Der Test prüft jetzt, was sein Kommentar immer sagte. */
describe("#deck-insertcoin — Willkommens-Deck „Insert Coin“ (abgeschlossener Lauf)", () => {
  const DECK = DECK_DEFS.deck_insertcoin;
  const BF = BATTLEFIELD_DEFS.bf_insertcoin;

  it.skipIf(ALL_UNLOCKED)("ein ABGEBROCHENER Lauf reicht nicht — erst ein abgeschlossener macht es frei", () => {
    expect(isUnlocked(DECK, prof({ games: 0 }))).toBe(false);
    expect(isUnlocked(DECK, prof({ games: 1, hadCompletedRun: false })), "Abbruch zählt nicht").toBe(false);
    expect(isUnlocked(DECK, prof({ games: 7, hadCompletedRun: false })), "auch sieben Abbrüche nicht").toBe(false);
    expect(isUnlocked(DECK, prof({ games: 1, hadCompletedRun: true }))).toBe(true);
  });

  it.skipIf(ALL_UNLOCKED)("das Battlefield traegt dieselbe Bedingung wie sein Deck", () => {
    expect(BF.unlock).toEqual(DECK.unlock);
    expect(isUnlocked(BF, prof({ games: 1, hadCompletedRun: false }))).toBe(false);
    expect(isUnlocked(BF, prof({ games: 1, hadCompletedRun: true }))).toBe(true);
  });

  it("das Pack zeigt auf genau dieses Paar und kostet nichts", () => {
    const t = THEME_DEFS.insertcoin;
    expect(t.kind).toBe("cond");
    expect(t.deckId).toBe("deck_insertcoin");
    expect(t.bfId).toBe("bf_insertcoin");
    expect(packPrice(t)).toBe(null);
  });
});

/* #tiered Kataklysmus — das ZWEITE Score-Stufen-Deck. Gewacht wird hier vor allem die Naht zu Titan: beide
   hängen am selben Profilwert (`bestScore`), und wer an einer der zwei Leitern dreht, muss die andere im Blick
   behalten. Rutschte Kataklysmus unter Titans 100 Mio, gäbe es eine Score-Schwelle, an der zwei Stufen-Decks
   gleichzeitig aufgehen — die Freischalt-Meldung zeigt aber nur eine. Deshalb steht die Reihenfolge im Test. */
describe("#tiered — Stufen-Deck Kataklysmus (Score 150/250/400 Mio)", () => {
  const KAT = THEME_DEFS.kataklysmus;
  const TITAN = THEME_DEFS.titan;
  it("ist ein Stufen-Pack aus genau den drei Kataklysmus-Decks", () => {
    expect(isTieredPack(KAT)).toBe(true);
    expect(KAT.kind).toBe("cond");
    expect(packPrice(KAT)).toBe(null);
    expect(KAT.tiers.map((t) => t.deckId)).toEqual(["deck_kataklysmus1", "deck_kataklysmus2", "deck_kataklysmus3"]);
    expect(KAT.tiers.map((t) => t.bfId)).toEqual(["bf_kataklysmus1", "bf_kataklysmus2", "bf_kataklysmus3"]);
    expect(KAT.tiers.map((t) => t.roman)).toEqual(["I", "II", "III"]);
  });
  it.skipIf(ALL_UNLOCKED)("Stufen schalten einzeln an 150/250/400 Mio Score frei", () => {
    expect(unlockedTiers(prof({ bestScore: 149999999 }), KAT)).toEqual([]);
    expect(unlockedTiers(prof({ bestScore: 150000000 }), KAT).map((t) => t.roman)).toEqual(["I"]);
    expect(unlockedTiers(prof({ bestScore: 250000000 }), KAT).map((t) => t.roman)).toEqual(["I", "II"]);
    expect(unlockedTiers(prof({ bestScore: 400000000 }), KAT).map((t) => t.roman)).toEqual(["I", "II", "III"]);
    expect(coverTier(prof({ bestScore: 400000000 }), KAT).deckId).toBe("deck_kataklysmus3");
  });
  it("liegt vollständig ÜBER Titan — keine Score-Schwelle schaltet zwei Stufen-Decks gleichzeitig frei", () => {
    const schwelle = (pack) => pack.tiers.map((t) => packUnlock(prof(), tierAsPack(pack, t)).target);
    const titan = schwelle(TITAN), kat = schwelle(KAT);
    expect(titan).toEqual([25000000, 50000000, 100000000]);
    expect(kat).toEqual([150000000, 250000000, 400000000]);
    expect(Math.min(...kat)).toBeGreaterThan(Math.max(...titan));
    expect(new Set([...titan, ...kat]).size).toBe(6); // keine doppelte Schwelle
  });
  it("die Stufenfarben laufen ins Weiße aus — der Marker, der Kataklysmus von den vier Silber-Decks trennt", () => {
    // Begründung steht in themes.js: das Motiv ist unbunt, unterscheidbar macht es die LEITER, nicht der Farbton.
    expect(KAT.tiers.map((t) => t.a2)).toEqual(["#b9c6de", "#d5deef", "#ffffff"]);
    expect(KAT.a1).toBe(KAT.tiers[0].a1); // Packfarbe = Stufe I (wie bei Titan/Hirsch/Thron)
    const weiss = THEMES.filter((p) => (p.tiers || []).some((t) => t.a2 === "#ffffff") || p.a2 === "#ffffff");
    expect(weiss.map((p) => p.id)).toEqual(["kataklysmus"]); // einziger Verlauf auf reines Weiß
  });
});

describe("#tiered — Stufen-Deck Peacock (serie300/600/1500 zusammengefasst)", () => {
  const PEACOCK = THEME_DEFS.peacock;
  it("die drei Einzel-Challenges sind aus der Registry entfernt; Peacock ist EIN Stufen-Pack", () => {
    for (const id of ["serie300", "serie600", "serie1500"]) expect(THEME_DEFS[id]).toBeUndefined();
    expect(PEACOCK).toBeDefined();
    expect(isTieredPack(PEACOCK)).toBe(true);
    expect(PEACOCK.tiers.map((t) => t.deckId)).toEqual(["deck_serie300", "deck_serie600", "deck_serie1500"]);
    expect(PEACOCK.tiers.map((t) => t.roman)).toEqual(["I", "II", "III"]);
    expect(isTieredPack(THEME_DEFS.gottgleich)).toBe(false);
  });
  it.skipIf(ALL_UNLOCKED)("Stufen schalten einzeln an ihren Streak-Schwellen frei (300/600/1500)", () => {
    expect(unlockedTiers(prof({ bestStreak: 0 }), PEACOCK)).toEqual([]);
    expect(unlockedTiers(prof({ bestStreak: 300 }), PEACOCK).map((t) => t.roman)).toEqual(["I"]);
    expect(unlockedTiers(prof({ bestStreak: 600 }), PEACOCK).map((t) => t.roman)).toEqual(["I", "II"]);
    expect(unlockedTiers(prof({ bestStreak: 1500 }), PEACOCK).map((t) => t.roman)).toEqual(["I", "II", "III"]);
  });
  it.skipIf(ALL_UNLOCKED)("highestUnlockedTier / coverTier: Cover = höchste freie Stufe (gesperrt → Stufe I)", () => {
    expect(highestUnlockedTier(prof({ bestStreak: 0 }), PEACOCK)).toBe(null);
    expect(coverTier(prof({ bestStreak: 0 }), PEACOCK).roman).toBe("I");         // gesperrt zeigt Stufe I
    expect(coverTier(prof({ bestStreak: 600 }), PEACOCK).roman).toBe("II");
    expect(coverTier(prof({ bestStreak: 1500 }), PEACOCK).roman).toBe("III");
    expect(highestUnlockedTier(prof({ bestStreak: 1500 }), PEACOCK).deckId).toBe("deck_serie1500");
  });
  it.skipIf(ALL_UNLOCKED)("packOwned = Stufe I frei; packState/packUnlock hängen an Stufe I (Streak 300)", () => {
    expect(packOwned(prof({ bestStreak: 299 }), PEACOCK)).toBe(false);
    expect(packOwned(prof({ bestStreak: 300 }), PEACOCK)).toBe(true);
    expect(packState(prof({ bestStreak: 0 }), PEACOCK)).toBe("lock");
    expect(packState(prof({ bestStreak: 300 }), PEACOCK)).toBe("own");
    expect(packUnlock(prof(), PEACOCK)).toMatchObject({ target: 300 });
    expect(packPrice(PEACOCK)).toBe(null);
  });
  it("tierByDeckId / packHasTierDeck / tierAsPack", () => {
    expect(tierByDeckId(PEACOCK, "deck_serie600").roman).toBe("II");
    expect(tierByDeckId(PEACOCK, "deck_nope")).toBe(null);
    expect(packHasTierDeck(PEACOCK, "deck_serie1500")).toBe(true);
    expect(packHasTierDeck(PEACOCK, "deck_obsidian")).toBe(false);
    const view = tierAsPack(PEACOCK, PEACOCK.tiers[1]);
    expect(view.deckId).toBe("deck_serie600");
    expect(view.bfId).toBe("bf_serie600");
    expect(view.a1).toBe("#ff1f7a");
  });
  it("resolvePackByDeckId: jede Stufe → Peacock + Stufen-eigene Farben", () => {
    expect(resolvePackByDeckId("deck_serie300")).toMatchObject({ a1: "#ff2d9b" });
    expect(resolvePackByDeckId("deck_serie600")).toMatchObject({ a1: "#ff1f7a" });
    expect(resolvePackByDeckId("deck_serie1500")).toMatchObject({ a1: "#8a4dff" });
    expect(resolvePackByDeckId("deck_serie600").pack.id).toBe("peacock");
    expect(resolvePackByDeckId("deck_obsidian").pack.id).toBe("obsidian"); // Nicht-Stufen-Pack unverändert
    expect(resolvePackByDeckId("default")).toBe(null);                    // Standard-Deck → kein Pack, keine Deckfarbe
  });
});

describe("#tiered — Titan (Score 25/50/100 Mio) & Hirsch (10/20/30 Läufe)", () => {
  it.skipIf(ALL_UNLOCKED)("Titan: drei Score-Stufen, Cover = höchste freie Stufe", () => {
    const T = THEME_DEFS.titan;
    expect(isTieredPack(T)).toBe(true);
    expect(T.tiers.map((t) => t.deckId)).toEqual(["deck_titan1", "deck_titan2", "deck_titan3"]);
    expect(unlockedTiers(prof({ bestScore: 24999999 }), T)).toEqual([]);
    expect(unlockedTiers(prof({ bestScore: 25000000 }), T).map((t) => t.roman)).toEqual(["I"]);
    expect(unlockedTiers(prof({ bestScore: 50000000 }), T).map((t) => t.roman)).toEqual(["I", "II"]);
    expect(coverTier(prof({ bestScore: 100000000 }), T).roman).toBe("III");
    expect(packUnlock(prof(), T)).toMatchObject({ target: 25000000 });
    expect(resolvePackByDeckId("deck_titan2").a1).toBe("#9b3fff");
  });
  /* NACHGEZOGEN: die Leiter zählt ABGESCHLOSSENE Läufe (`runsCompleted`), nicht `games` — das zählte
     jeden begonnenen mit, Abbrüche eingeschlossen, und der Kommentar dieser Gruppe sagte schon immer
     „Läufe". Die letzte Zeile hält den Fehler in seiner allgemeinen Form fest. */
  it.skipIf(ALL_UNLOCKED)("Hirsch: drei Stufen über ABGESCHLOSSENE Läufe, Cover = höchste freie Stufe", () => {
    const H = THEME_DEFS.hirsch;
    expect(isTieredPack(H)).toBe(true);
    expect(H.tiers.map((t) => t.deckId)).toEqual(["deck_hirsch1", "deck_hirsch2", "deck_hirsch3"]);
    expect(unlockedTiers(prof({ runsCompleted: 9 }), H)).toEqual([]);
    expect(unlockedTiers(prof({ runsCompleted: 20 }), H).map((t) => t.roman)).toEqual(["I", "II"]);
    expect(coverTier(prof({ runsCompleted: 30 }), H).roman).toBe("III");
    expect(packOwned(prof({ runsCompleted: 10 }), H)).toBe(true);
    expect(packOwned(prof({ runsCompleted: 9 }), H)).toBe(false);
    expect(resolvePackByDeckId("deck_hirsch3").pack.id).toBe("hirsch");
    // 30 begonnene, keiner abgeschlossen → die Leiter bleibt zu.
    expect(packOwned(prof({ games: 30, runsCompleted: 0 }), H)).toBe(false);
  });
});

describe("packs — Kauf-Ökonomie (#299: DP)", () => {
  it.skipIf(ALL_UNLOCKED)("canBuyPack: nur Kauf-Pack, genug DP (Pack-Preis), noch nicht im Besitz", () => {
    const t = THEME_DEFS.sunset; // 20 DP
    expect(canBuyPack(prof({ deckPoints: 19 }), t)).toBe(false);
    expect(canBuyPack(prof({ deckPoints: 20 }), t)).toBe(true);
    expect(canBuyPack(prof({ deckPoints: 20, ownedCosmetics: { "pack:sunset": true } }), t)).toBe(false);
    // SP allein reichen nicht (Pack läuft über DP)
    expect(canBuyPack(prof({ stichPoints: 99, deckPoints: 0 }), t)).toBe(false);
    // Nicht-Kauf-Pack (synthetisch) ist niemals kaufbar
    expect(canBuyPack(prof({ deckPoints: 99 }), { kind: "cond", deckId: "x" })).toBe(false);
  });
  it.skipIf(ALL_UNLOCKED)("buyPack zieht den Pack-Preis in DP ab, bucht deckSpent, setzt Besitz (rein)", () => {
    const t = THEME_DEFS.lofi; // 10 DP
    const p0 = prof({ deckPoints: 10 + 2, deckSpent: 2 });
    const p1 = buyPack(p0, t);
    expect(p1.deckPoints).toBe(2);
    expect(p1.deckSpent).toBe(2 + 10);
    expect(p1.stichPoints).toBe(p0.stichPoints); // SP unberührt
    expect(p1.ownedCosmetics["pack:lofi"]).toBe(true);
    expect(p0.ownedCosmetics["pack:lofi"]).toBeUndefined(); // Eingabe unverändert
  });
  it("buyPack bei zu wenig DP = No-op (identische Referenz)", () => {
    const p0 = prof({ deckPoints: 0 });
    expect(buyPack(p0, THEME_DEFS.sunset)).toBe(p0);
  });
  it("unlockAllCosmetics schaltet ALLE Kauf-Packs + globalen Effekte + Finisher frei (additiv)", () => {
    const p = unlockAllCosmetics(prof({ ownedCosmetics: { existing: true } }));
    expect(p.ownedCosmetics.existing).toBe(true); // Bestand bleibt
    for (const pack of THEMES) if (isBuyPack(pack)) expect(p.ownedCosmetics[packOwnKey(pack)]).toBe(true);
    for (const fx of GLOBAL_FX) expect(p.ownedCosmetics[fx.ownKey]).toBe(true);
    for (const key of BUYABLE_FINISHER_FX) expect(p.ownedCosmetics[key]).toBe(true); // synthetische Sieg-Finisher
  });
  it("Drift-Guard: BUYABLE_FINISHER_FX deckt exakt die kaufbaren Finisher-Kacheln (CustomizeScreen)", () => {
    expect([...BUYABLE_FINISHER_FX].sort()).toEqual([...BUYABLE_FINISHER_OWNKEYS].sort());
  });
});

describe("effekte — verbliebene Effekte nach dem #cleanup", () => {
  // #cleanup: Es bleiben: Hintergrund-Effekt „Aurora" (bgfx) und die Hintergrund-Finisher „Glutfunken" + „Sternenfeld"
  // (bgfin; #311 überarbeitet wieder eingeführt). Klinge ist ein synthetischer Sieg-Finisher (NICHT in GLOBAL_FX). Die
  // Gottgleich-Kategorie bleibt im Shop (nur „Standard", ebenfalls synthetisch), enthält aber KEINE GLOBAL_FX-Einträge.
  it("GLOBAL_FX führt aurora, neonsurf, cubematrix, starfield, die Karten-Animationen edgeglow + holo + glitch (#318/#317) UND die 5 Gottgleich-Prunk-Effekte (#322–#326) — #glutfunken-raus: embers entfernt · #345 neonsurf", () => {
    expect(GLOBAL_FX.map((f) => f.key).sort()).toEqual(
      ["aurora", "neonsurf", "cubematrix", "starfield", "edgeglow", "holo", "glitch",
       "sonnenPuls", "laserFaecher", "prismaKaskade", "holoCube", "supernova"].sort());
  });
  /* #deckglow-raus: „Leuchten“ (fx:deckglow) ist ersatzlos entfernt. Der Wächter steht auf dem Kopf des alten:
     er prüft nicht mehr die Naht des Effekts, sondern dass NICHTS von ihm zurückbleibt — Registereintrag, Gruppe
     und Options-Schlüssel. Ein versehentliches Wiedereinsetzen (z. B. beim Merge eines älteren Branches) fällt
     damit hier auf und nicht erst am Gerät als wieder heiße Ebene. */
  it("#deckglow-raus: „Leuchten“ ist vollständig aus dem Register verschwunden", () => {
    expect(GLOBAL_FX_BY_KEY.deckglow).toBeUndefined();
    expect(GLOBAL_FX.some((f) => f.group === "bgglow")).toBe(false);
    expect(GLOBAL_FX.some((f) => f.option === "fxDeckGlow" || f.ownKey === "fx:deckglow")).toBe(false);
  });
  it("#318: Karten-Animationen liegen in der anim-Gruppe (stapelbar) mit korrekter Naht", () => {
    for (const [key, option] of [["edgeglow", "fxEdgeGlow"], ["holo", "fxHolo"], ["glitch", "fxGlitch"]]) {
      const fx = GLOBAL_FX_BY_KEY[key];
      expect(fx).toBeTruthy();
      expect(fx.group).toBe("anim");
      expect(fx.ownKey).toBe(`fx:${key}`);
      expect(fx.option).toBe(option);
      expect(fx.preview).toBe(key);
    }
  });
  it("entfernte Effekte sind vollständig aus der Registry", () => {
    // #311: starfield ist wieder da → NICHT mehr in dieser Entfernt-Liste. #318: glitch ist als Karten-Animation neu (raus).
    for (const k of ["frameGlow", "holoSwipe", "auroraVeil", "hologrid", "scanline", "vignette",
                     "laserSlice", "blackhole", "lasergrid", "burnBeam", "overload", "disperse", "klinge",
                     "fireworks", "goldRain", "prismaWave", "gottStandard"]) {
      expect(GLOBAL_FX_BY_KEY[k]).toBeUndefined();
    }
  });
  it("#kategorien: aurora liegt in bgfx (reiner Hintergrund), starfield in bgfin (Hintergrund-Finisher)", () => {
    const GROUP = { aurora: "bgfx", cubematrix: "bgfx", starfield: "bgfin" };
    for (const [key, group] of Object.entries(GROUP)) {
      const fx = GLOBAL_FX_BY_KEY[key];
      expect(fx).toBeTruthy();
      expect(fx.group).toBe(group);
      expect(fx.ownKey).toBe(`fx:${key}`);
      expect(fx.preview).toBe(key);
    }
  });
  it.skipIf(ALL_UNLOCKED)("activeBgFx / activeBgFinisher: je Slot der EINE aktive Effekt (gekauft + Option an), sonst null", () => {
    expect(activeBgFx(prof(), {})).toBe(null);
    expect(activeBgFinisher(prof(), {})).toBe(null);
    // Option an, aber nicht gekauft → nicht aktiv.
    expect(activeBgFx(prof(), { fxAurora: true })).toBe(null);
    const owned = prof({ ownedCosmetics: { "fx:aurora": true, "fx:starfield": true } });
    expect(auroraActive(owned, { fxAurora: true })).toBe(true);
    expect(activeBgFx(owned, { fxAurora: true })).toBe("aurora");
    expect(activeBgFinisher(owned, { fxStarfield: true })).toBe("starfield");
    // Beide Slots UNABHÄNGIG → können gleichzeitig aktiv sein.
    expect(activeBgFx(owned, { fxAurora: true, fxStarfield: true })).toBe("aurora");
    expect(activeBgFinisher(owned, { fxAurora: true, fxStarfield: true })).toBe("starfield");
  });
  it.skipIf(ALL_UNLOCKED)("*Active-Helfer: nur gekauft UND per Option an", () => {
    const cases = [
      ["aurora", auroraActive, "fxAurora"],
    ];
    for (const [key, activeFn, opt] of cases) {
      const owned = prof({ ownedCosmetics: { [`fx:${key}`]: true } });
      expect(activeFn(owned, { [opt]: true })).toBe(true);
      expect(activeFn(owned, { [opt]: false })).toBe(false);
      expect(activeFn(prof(), { [opt]: true })).toBe(false); // nicht gekauft
    }
  });
  it.skipIf(ALL_UNLOCKED)("#307: kaufen zieht DP ab, bucht deckSpent, setzt globalen Besitz (SP unberührt)", () => {
    const starfield = GLOBAL_FX_BY_KEY.starfield;
    const price = globalFxPrice(starfield);
    const p0 = prof({ deckPoints: price + 1, deckSpent: 1, stichPoints: 9 });
    expect(canBuyGlobalFx(p0, starfield)).toBe(true);
    const p1 = buyGlobalFx(p0, starfield);
    expect(p1.deckPoints).toBe(1);
    expect(p1.deckSpent).toBe(1 + price);
    expect(p1.stichPoints).toBe(9); // SP unberührt
    expect(globalFxOwned(p1, starfield)).toBe(true);
    expect(canBuyGlobalFx(p1, starfield)).toBe(false);
  });
  it("kaufen bei zu wenig DP = No-op", () => {
    const p0 = prof({ deckPoints: 0, stichPoints: 99 });
    expect(buyGlobalFx(p0, GLOBAL_FX_BY_KEY.aurora)).toBe(p0);
  });
  it.skipIf(ALL_UNLOCKED)("Käufe sind voneinander getrennt", () => {
    const p1 = buyGlobalFx(prof({ deckPoints: 25 }), GLOBAL_FX_BY_KEY.aurora);
    expect(globalFxOwned(p1, GLOBAL_FX_BY_KEY.aurora)).toBe(true);
    expect(globalFxOwned(p1, GLOBAL_FX_BY_KEY.starfield)).toBe(false);
  });
  it("#353/#farbsystem: jeder verbliebene Effekt trägt seinen DP-Preis nach Rarity-Stufe (grün 10 · blau 20 · lila 30 · gold 40)", () => {
    const want = { aurora: 10, starfield: 20, glitch: 30, cubematrix: 40 }; // #353: aurora 20→10, cubematrix 30→40, glitch 20→30
    for (const [key, dp] of Object.entries(want)) expect(globalFxPrice(GLOBAL_FX_BY_KEY[key])).toBe(dp);
  });
});

describe("gottgleich-prunk (#322-#326) — group gott, einfach-exklusiv (PIXI)", () => {
  // Alle 5 Prunk-Effekte liegen in group „gott", tragen die korrekte Naht (ownKey/option/preview) und Rarity-Preise.
  it("Reihenfolge/Naht/Preis je Prunk-Effekt (Standard 0 · Selten 10 · Sehr selten 20 · Rar 30 · Legendär 40)", () => {
    const want = [
      ["sonnenPuls", "fxSonnenPuls", 0],
      ["laserFaecher", "fxLaserFaecher", 10],
      ["prismaKaskade", "fxPrismaKaskade", 20],
      ["holoCube", "fxHoloCube", 30],
      ["supernova", "fxSupernova", 40],
    ];
    expect(GOTT_FX_KEYS).toEqual(want.map((w) => w[0]));
    for (const [key, option, price] of want) {
      const fx = GLOBAL_FX_BY_KEY[key];
      expect(fx).toBeTruthy();
      expect(fx.group).toBe("gott");
      expect(fx.ownKey).toBe(`fx:${key}`);
      expect(fx.option).toBe(option);
      expect(fx.preview).toBe(key);
      expect(globalFxPrice(fx)).toBe(price);
    }
  });
  it.skipIf(ALL_UNLOCKED)("Sonnen-Puls ist der FREIE Default (alwaysOwned) → ohne Kauf besessen; die anderen erst nach Kauf", () => {
    const sp = GLOBAL_FX_BY_KEY.sonnenPuls, lf = GLOBAL_FX_BY_KEY.laserFaecher;
    expect(sp.alwaysOwned).toBe(true);
    expect(gottFxOwned(prof(), sp)).toBe(true);            // frei, auch ohne ownedCosmetics
    expect(gottFxOwned(prof(), lf)).toBe(false);           // kaufbar → erst bei Besitz
    expect(gottFxOwned(prof({ ownedCosmetics: { "fx:laserFaecher": true } }), lf)).toBe(true);
  });
  it.skipIf(ALL_UNLOCKED)("activeGottFx: der EINE aktive Prunk (besessen + Option an), sonst null; kaufbar nur bei Besitz", () => {
    expect(activeGottFx(prof(), {})).toBe(null);                                  // nichts an
    expect(activeGottFx(prof(), { fxSonnenPuls: true })).toBe("sonnenPuls");      // frei + an
    expect(activeGottFx(prof(), { fxLaserFaecher: true })).toBe(null);            // an, aber nicht gekauft
    const owned = prof({ ownedCosmetics: { "fx:laserFaecher": true } });
    expect(activeGottFx(owned, { fxLaserFaecher: true })).toBe("laserFaecher");
  });
});

/* #331 Hintergrund = EIN einfach-exklusiver Slot über zwei Kategorien (bgfx + bgfin).
   Die Exklusivität wird in storage.normalizeFxOptions über BG_EXCL_OPTS durchgesetzt, die Kategorien stehen aber
   in themes.js (BG_FX_KEYS/BG_FIN_KEYS). Zwei getrennte Listen, die zusammenpassen MÜSSEN — wer hier einen Effekt
   ergänzt und den Eintrag in BG_EXCL_OPTS vergisst, bricht die Exklusivität still. Dieser Test bindet sie aneinander. */
describe("#331 Hintergrund-Exklusivität deckt alle Hintergrund-Effekte ab", () => {
  const optionOf = (key) => GLOBAL_FX_BY_KEY[key].option;

  it("jeder bgfx- UND bgfin-Effekt steht in der Exklusiv-Gruppe", () => {
    const shouldBeExclusive = [...BG_FX_KEYS, ...BG_FIN_KEYS].map(optionOf);
    for (const opt of shouldBeExclusive) expect(BG_EXCL_OPTS).toContain(opt);
  });

  it("die Exklusiv-Gruppe enthält nichts Fremdes (kein Karten-/Gott-/Leuchten-Effekt)", () => {
    const allowed = new Set([...BG_FX_KEYS, ...BG_FIN_KEYS].map(optionOf));
    for (const opt of BG_EXCL_OPTS) expect(allowed).toContain(opt);
  });

  it("normalizeFxOptions lässt genau EINEN Hintergrund-Effekt stehen (Priorität = Listenreihenfolge)", () => {
    const o = {};
    for (const opt of BG_EXCL_OPTS) o[opt] = true;
    normalizeFxOptions(o);
    expect(BG_EXCL_OPTS.filter((opt) => o[opt])).toEqual([BG_EXCL_OPTS[0]]);
  });
});

/* Brettgröße: positions-indizierte Zustände hängen an BOARD_POSITIONS. Früher stand die 40 als Literal im
   Reducer, während N_POS (Gebäude-Overlay) und die Deckgröße dieselbe Zahl anders schrieben. */
describe("Brettgröße hat eine Quelle", () => {
  it("BOARD_POSITIONS == Deckgröße == Gebäude-Overlay-Positionen", () => {
    expect(BOARD_POSITIONS).toBe(buildDeck().length);
    expect(BOARD_POSITIONS).toBe(N_POS);
  });

  it("initialState legt die Gletscher-Arrays in Brettgröße an", () => {
    const s = initialState(makeRng(1));
    expect(s.glacierMass).toHaveLength(BOARD_POSITIONS);
    expect(s.firnStack).toHaveLength(BOARD_POSITIONS);
    expect(s.glacierLocked).toHaveLength(BOARD_POSITIONS);
    expect(s.playerOrder).toHaveLength(BOARD_POSITIONS);
  });
});
