import { describe, it, expect } from "vitest";
import {
  DECK_DEFS, BATTLEFIELD_DEFS, isUnlocked, unlockProgress, resolveSkinId,
} from "../src/game/cosmetics.js";

// Minimal-Profil-Helfer (nur die Felder, die die Freischalt-Logik liest).
const prof = (o = {}) => ({ games: 0, bestStreak: 0, bestScore: 0, hadNoRerollRun: false, ...o });

describe("cosmetics — Katalog", () => {
  it("Default-Decks/Battlefields sind ohne unlock (immer frei)", () => {
    expect(DECK_DEFS.default.unlock).toBeNull();
    expect(BATTLEFIELD_DEFS.default.unlock).toBeNull();
  });
  it("#299: alte Progressions-Decks/-Battlefields (deck_p*/bf_*) sind entfernt", () => {
    for (const id of ["deck_p1", "deck_p2", "deck_p3", "deck_p4"]) expect(DECK_DEFS[id]).toBeUndefined();
    for (const id of ["bf_1", "bf_2", "bf_3", "bf_4"]) expect(BATTLEFIELD_DEFS[id]).toBeUndefined();
  });
  it("isUnlocked/unlockProgress verarbeiten die games-Bedingung weiterhin generisch", () => {
    const def = { unlock: { kind: "games", n: 10 } };
    expect(isUnlocked(def, prof({ games: 9 }))).toBe(false);
    expect(isUnlocked(def, prof({ games: 10 }))).toBe(true);
    expect(unlockProgress(def, prof({ games: 4 })).cur).toBe(4);
  });
  it("v0.4 Kauf-Pack-Decks haben eine buy-Bedingung; alte Challenge-Decks sind entfernt", () => {
    for (const id of ["deck_beach", "deck_cat", "deck_spacedog", "deck_wale"]) {
      const d = DECK_DEFS[id];
      expect(d).toBeTruthy();
      expect(d.unlock.kind).toBe("buy");
      expect(isUnlocked(d, prof({ ownedCosmetics: { [d.unlock.ownKey]: true } }))).toBe(true);
      expect(isUnlocked(d, prof())).toBe(false); // ohne Kauf gesperrt
    }
    // alte Challenge-/Archetyp-Decks sind raus (v0.4)
    for (const id of ["deck_c1", "deck_c2", "deck_c3", "deck_c5", "deck_c6", "deck_c7", "deck_c8", "deck_c9"]) {
      expect(DECK_DEFS[id]).toBeUndefined();
    }
  });
  it("Genesis (deck_onboarding/bf_onboarding) ist über abgeschlossenes Onboarding frei — nicht kaufbar", () => {
    for (const def of [DECK_DEFS.deck_onboarding, BATTLEFIELD_DEFS.bf_onboarding]) {
      expect(def.unlock).toEqual({ kind: "onboardingDone" });
      expect(isUnlocked(def, prof({ onboarding: 5 }))).toBe(false);
      expect(isUnlocked(def, prof({ onboarding: 6 }))).toBe(true);
      expect(unlockProgress(def, prof({ onboarding: 6 })).done).toBe(true);
    }
  });
  it("#299: keine games-Progressions-Decks/-Battlefields mehr (nur Default + Kauf-Packs)", () => {
    const deckGames = Object.values(DECK_DEFS).filter((d) => d.unlock?.kind === "games");
    const bfGames   = Object.values(BATTLEFIELD_DEFS).filter((d) => d.unlock?.kind === "games");
    expect(deckGames).toEqual([]);
    expect(bfGames).toEqual([]);
  });
});

describe("cosmetics — isUnlocked", () => {
  it("null-unlock ist immer frei (auch ohne Profil)", () => {
    expect(isUnlocked(DECK_DEFS.default, undefined)).toBe(true);
    expect(isUnlocked(DECK_DEFS.default, prof())).toBe(true);
  });

  it("games: erst ab der Schwelle frei", () => {
    const d = { unlock: { kind: "games", n: 5 } };
    expect(isUnlocked(d, prof({ games: 4 }))).toBe(false);
    expect(isUnlocked(d, prof({ games: 5 }))).toBe(true);
    expect(isUnlocked(d, prof({ games: 99 }))).toBe(true);
  });

  it("streak/score: Schwellen greifen exakt", () => {
    const streak = { unlock: { kind: "streak", n: 100 } };
    const score  = { unlock: { kind: "score",  n: 10_000_000 } };
    expect(isUnlocked(streak, prof({ bestStreak: 99 }))).toBe(false);
    expect(isUnlocked(streak, prof({ bestStreak: 100 }))).toBe(true);
    expect(isUnlocked(score, prof({ bestScore: 9_999_999 }))).toBe(false);
    expect(isUnlocked(score, prof({ bestScore: 10_000_000 }))).toBe(true);
  });

  // (#267: monoStatRun-Test entfernt — die Stat-Phase/Mono-Stat-Challenge ist weg.)

  it("noRerollRun (#214 Sparfuchs): an hadNoRerollRun gebunden + Klartext-Fortschritt", () => {
    const noReroll = { unlock: { kind: "noRerollRun" } };
    expect(isUnlocked(noReroll, prof())).toBe(false);
    expect(isUnlocked(noReroll, prof({ hadNoRerollRun: true }))).toBe(true);
    expect(unlockProgress(noReroll, prof())).toEqual({ done: false, cur: 0, target: 1, label: "Schließe einen Lauf ab, ohne einen Reroll zu benutzen" });
    expect(unlockProgress(noReroll, prof({ hadNoRerollRun: true }))).toEqual({ done: true, cur: 1, target: 1, label: "Schließe einen Lauf ab, ohne einen Reroll zu benutzen" });
  });

  it("unbekannter kind blockiert nicht (defensiv)", () => {
    expect(isUnlocked({ unlock: { kind: "zukunft", n: 3 } }, prof())).toBe(true);
  });

  it("#303 Challenge-Decks: Katalog-Einträge + Freischalt-Bindung", () => {
    // Serie 300 / 600 hängen an bestStreak (bestehende streak-Bedingung).
    expect(DECK_DEFS.deck_serie300.unlock).toEqual({ kind: "streak", n: 300 });
    expect(DECK_DEFS.deck_serie600.unlock).toEqual({ kind: "streak", n: 600 });
    expect(isUnlocked(DECK_DEFS.deck_serie300, prof({ bestStreak: 299 }))).toBe(false);
    expect(isUnlocked(DECK_DEFS.deck_serie300, prof({ bestStreak: 300 }))).toBe(true);
    expect(isUnlocked(DECK_DEFS.deck_serie600, prof({ bestStreak: 600 }))).toBe(true);
    // Gottgleich / Sparfuchs hängen an eigenen sticky Flags.
    expect(isUnlocked(DECK_DEFS.deck_gottgleich, prof())).toBe(false);
    expect(isUnlocked(DECK_DEFS.deck_gottgleich, prof({ hadGottgleichRun: true }))).toBe(true);
    expect(isUnlocked(DECK_DEFS.deck_sparfuchs, prof())).toBe(false);
    expect(isUnlocked(DECK_DEFS.deck_sparfuchs, prof({ hadMeisterNoRerollRun: true }))).toBe(true);
    // Battlefields tragen dieselbe Bedingung wie ihr Deck.
    expect(isUnlocked(BATTLEFIELD_DEFS.bf_gottgleich, prof({ hadGottgleichRun: true }))).toBe(true);
    expect(isUnlocked(BATTLEFIELD_DEFS.bf_sparfuchs, prof({ hadMeisterNoRerollRun: true }))).toBe(true);
  });

  it("#303: neue Flag-Bedingungen liefern Klartext-Fortschritt", () => {
    expect(unlockProgress(DECK_DEFS.deck_gottgleich, prof()).done).toBe(false);
    expect(unlockProgress(DECK_DEFS.deck_gottgleich, prof({ hadGottgleichRun: true })).done).toBe(true);
    expect(unlockProgress(DECK_DEFS.deck_gottgleich, prof()).label).toMatch(/Gottgleich/i);
    expect(unlockProgress(DECK_DEFS.deck_sparfuchs, prof()).label).toMatch(/Meisterrang.*Reroll/i);
  });
});

describe("cosmetics — unlockProgress", () => {
  it("null-unlock: done, immer verfügbar", () => {
    const p = unlockProgress(DECK_DEFS.default, prof());
    expect(p.done).toBe(true);
    expect(p.label).toMatch(/verfügbar/i);
  });

  it("games: cur auf target gedeckelt, Klartext-Label", () => {
    const d = { unlock: { kind: "games", n: 5 } };
    expect(unlockProgress(d, prof({ games: 3 }))).toEqual({ done: false, cur: 3, target: 5, label: "Spiele 5 Läufe" });
    expect(unlockProgress(d, prof({ games: 8 }))).toEqual({ done: true, cur: 5, target: 5, label: "Spiele 5 Läufe" });
  });

  it("streak: Label nennt die Serie, cur = beste bisher (gedeckelt)", () => {
    const p = unlockProgress({ unlock: { kind: "streak", n: 100 } }, prof({ bestStreak: 63 }));
    expect(p).toEqual({ done: false, cur: 63, target: 100, label: "Erreiche eine Serie von 100" });
  });

  it("score: Label mit Tausenderpunkten (keine ICU-Abhängigkeit)", () => {
    const p = unlockProgress({ unlock: { kind: "score", n: 10_000_000 } }, prof({ bestScore: 5_000_000 }));
    expect(p.done).toBe(false);
    expect(p.cur).toBe(5_000_000);
    expect(p.target).toBe(10_000_000);
    expect(p.label).toBe("Erreiche Score 10.000.000");
  });

  it("Flag-Challenges: target 1, cur 0/1, Klartext-Bedingung", () => {
    const locked = unlockProgress({ unlock: { kind: "noRerollRun" } }, prof());
    expect(locked).toEqual({ done: false, cur: 0, target: 1, label: "Schließe einen Lauf ab, ohne einen Reroll zu benutzen" });
    const done = unlockProgress({ unlock: { kind: "noRerollRun" } }, prof({ hadNoRerollRun: true }));
    expect(done).toEqual({ done: true, cur: 1, target: 1, label: "Schließe einen Lauf ab, ohne einen Reroll zu benutzen" });
  });
});

describe("cosmetics — #310 Element-Challenges & Prisma-Multi", () => {
  const decks = { fire: "deck_feuer", ice: "deck_eis", lightning: "deck_blitz", plant: "deck_pflanze" };
  it("Element-Decks: monoArchetypeRun mit n=5, frei erst ab 5 Mono-Läufen (Zähler)", () => {
    for (const [arch, id] of Object.entries(decks)) {
      const d = DECK_DEFS[id];
      expect(d.unlock).toEqual({ kind: "monoArchetypeRun", archetype: arch, n: 5 });
      expect(isUnlocked(d, prof({ monoArchetypeRuns: { [arch]: 4 } }))).toBe(false);
      expect(isUnlocked(d, prof({ monoArchetypeRuns: { [arch]: 5 } }))).toBe(true);
      expect(unlockProgress(d, prof({ monoArchetypeRuns: { [arch]: 2 } }))).toMatchObject({ cur: 2, target: 5, done: false });
    }
  });
  it("Alt-Wert Boolean true zählt als 0 (nicht als 5 erfüllt)", () => {
    expect(isUnlocked(DECK_DEFS.deck_feuer, prof({ monoArchetypeRuns: { fire: true } }))).toBe(false);
  });
  it("Prisma (deck_elementar): allMonoArchetypes — frei erst wenn alle vier ≥ 5", () => {
    const d = DECK_DEFS.deck_elementar;
    expect(d.unlock).toEqual({ kind: "allMonoArchetypes", n: 5 });
    expect(isUnlocked(d, prof({ monoArchetypeRuns: { fire: 5, ice: 5, lightning: 5 } }))).toBe(false);
    expect(isUnlocked(d, prof({ monoArchetypeRuns: { fire: 5, ice: 5, lightning: 5, plant: 5 } }))).toBe(true);
    expect(unlockProgress(d, prof({ monoArchetypeRuns: { fire: 5, ice: 5 } }))).toMatchObject({ cur: 2, target: 4, done: false });
  });
  it("BF spiegeln die Deck-Bedingung; DP-Kauf-Decks tragen ihren ownKey", () => {
    expect(BATTLEFIELD_DEFS.bf_eis.unlock).toEqual({ kind: "monoArchetypeRun", archetype: "ice", n: 5 });
    expect(BATTLEFIELD_DEFS.bf_elementar.unlock).toEqual({ kind: "allMonoArchetypes", n: 5 });
    for (const [id, key] of [["deck_ronin", "pack:ronin"], ["deck_kosmos", "pack:kosmos"], ["deck_oni", "pack:oni"], ["deck_geometrie", "pack:geometrie"],
      ["deck_sonne", "pack:sonne"], ["deck_drache", "pack:drache"]]) { // #311
      expect(DECK_DEFS[id].unlock).toEqual({ kind: "buy", ownKey: key });
    }
  });
});

describe("cosmetics — resolveSkinId (defensiver Fallback)", () => {
  it("gibt die id zurück, wenn sie existiert UND frei ist", () => {
    expect(resolveSkinId(DECK_DEFS, "deck_sunset", prof({ ownedCosmetics: { "pack:sunset": true } }))).toBe("deck_sunset");
    expect(resolveSkinId(DECK_DEFS, "default", prof())).toBe("default");
  });
  it("fällt auf default zurück bei unbekannter id", () => {
    expect(resolveSkinId(DECK_DEFS, "gibtsnicht", prof({ games: 99 }))).toBe("default");
  });
  it("fällt auf default zurück, wenn die id (noch) gesperrt ist", () => {
    expect(resolveSkinId(DECK_DEFS, "deck_sunset", prof())).toBe("default"); // Kauf-Pack nicht im Besitz → gesperrt
  });
});
