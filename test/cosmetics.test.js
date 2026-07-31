import { describe, it, expect } from "vitest";
import {
  DECK_DEFS, BATTLEFIELD_DEFS, isUnlocked, unlockProgress, resolveSkinId,
  DECK_GAME_UNLOCKS, BATTLEFIELD_GAME_UNLOCKS,
} from "../src/game/cosmetics.js";

// Minimal-Profil-Helfer (nur die Felder, die die Freischalt-Logik liest).
const prof = (o = {}) => ({ games: 0, bestStreak: 0, bestScore: 0, hadNoBuyRun: false, hadMonoStatRun: false, ...o });

describe("cosmetics — Katalog", () => {
  it("Default-Decks/Battlefields sind ohne unlock (immer frei)", () => {
    expect(DECK_DEFS.default.unlock).toBeNull();
    expect(BATTLEFIELD_DEFS.default.unlock).toBeNull();
  });
  it("deck_p1 schaltet bei 5 Läufen frei (erste Progressionsstufe)", () => {
    expect(DECK_DEFS.deck_p1.unlock).toEqual({ kind: "games", n: 5 });
    expect(DECK_GAME_UNLOCKS[0]).toBe(5);
    expect(BATTLEFIELD_GAME_UNLOCKS[0]).toBe(10);
  });
  it("deck_p2 schaltet bei 15 Läufen frei", () => {
    expect(DECK_DEFS.deck_p2.unlock).toEqual({ kind: "games", n: 15 });
    expect(isUnlocked(DECK_DEFS.deck_p2, prof({ games: 14 }))).toBe(false);
    expect(isUnlocked(DECK_DEFS.deck_p2, prof({ games: 15 }))).toBe(true);
  });
  it("bf_1 schaltet bei 10 Läufen frei (erste Battlefield-Progression)", () => {
    expect(BATTLEFIELD_DEFS.bf_1.unlock).toEqual({ kind: "games", n: 10 });
    expect(isUnlocked(BATTLEFIELD_DEFS.bf_1, prof({ games: 9 }))).toBe(false);
    expect(isUnlocked(BATTLEFIELD_DEFS.bf_1, prof({ games: 10 }))).toBe(true);
  });
  it("bf_2 schaltet bei 20 Läufen frei", () => {
    expect(BATTLEFIELD_DEFS.bf_2.unlock).toEqual({ kind: "games", n: 20 });
    expect(isUnlocked(BATTLEFIELD_DEFS.bf_2, prof({ games: 19 }))).toBe(false);
    expect(isUnlocked(BATTLEFIELD_DEFS.bf_2, prof({ games: 20 }))).toBe(true);
  });
  it("deck_p3 (25) & bf_3 (30) schalten an ihren Schwellen frei", () => {
    expect(DECK_DEFS.deck_p3.unlock).toEqual({ kind: "games", n: 25 });
    expect(BATTLEFIELD_DEFS.bf_3.unlock).toEqual({ kind: "games", n: 30 });
    expect(isUnlocked(DECK_DEFS.deck_p3, prof({ games: 24 }))).toBe(false);
    expect(isUnlocked(DECK_DEFS.deck_p3, prof({ games: 25 }))).toBe(true);
    expect(isUnlocked(BATTLEFIELD_DEFS.bf_3, prof({ games: 30 }))).toBe(true);
  });
  it("deck_p4 (35) & bf_4 (40) schließen die Progression ab", () => {
    expect(DECK_DEFS.deck_p4.unlock).toEqual({ kind: "games", n: 35 });
    expect(BATTLEFIELD_DEFS.bf_4.unlock).toEqual({ kind: "games", n: 40 });
    expect(isUnlocked(DECK_DEFS.deck_p4, prof({ games: 34 }))).toBe(false);
    expect(isUnlocked(DECK_DEFS.deck_p4, prof({ games: 35 }))).toBe(true);
    expect(isUnlocked(BATTLEFIELD_DEFS.bf_4, prof({ games: 40 }))).toBe(true);
  });
  it("Challenge-Decks c1/c2/c3 haben die richtigen Bedingungen", () => {
    expect(DECK_DEFS.deck_c1.unlock).toEqual({ kind: "streak", n: 100 });
    expect(DECK_DEFS.deck_c2.unlock).toEqual({ kind: "score", n: 10_000_000 });
    expect(DECK_DEFS.deck_c3.unlock).toEqual({ kind: "noBuyRun" });
    expect(isUnlocked(DECK_DEFS.deck_c1, prof({ bestStreak: 100 }))).toBe(true);
    expect(isUnlocked(DECK_DEFS.deck_c2, prof({ bestScore: 10_000_000 }))).toBe(true);
    expect(isUnlocked(DECK_DEFS.deck_c3, prof({ hadNoBuyRun: true }))).toBe(true);
    expect(isUnlocked(DECK_DEFS.deck_c3, prof())).toBe(false);
  });
  it("Archetyp-Decks c5-c9 (#215): Mono-Archetyp je Fraktion + Element-Bund", () => {
    expect(DECK_DEFS.deck_c5.unlock).toEqual({ kind: "monoArchetypeRun", archetype: "fire" });
    expect(DECK_DEFS.deck_c6.unlock).toEqual({ kind: "monoArchetypeRun", archetype: "lightning" });
    expect(DECK_DEFS.deck_c7.unlock).toEqual({ kind: "monoArchetypeRun", archetype: "ice" });
    expect(DECK_DEFS.deck_c8.unlock).toEqual({ kind: "monoArchetypeRun", archetype: "plant" });
    expect(DECK_DEFS.deck_c9.unlock).toEqual({ kind: "allArchetypesRun" });
    // Mono: nur die passende Fraktion schaltet ihr Deck frei
    expect(isUnlocked(DECK_DEFS.deck_c5, prof({ monoArchetypeRuns: { fire: true } }))).toBe(true);
    expect(isUnlocked(DECK_DEFS.deck_c5, prof({ monoArchetypeRuns: { ice: true } }))).toBe(false);
    expect(isUnlocked(DECK_DEFS.deck_c7, prof({ monoArchetypeRuns: { ice: true } }))).toBe(true);
    expect(isUnlocked(DECK_DEFS.deck_c5, prof())).toBe(false); // ohne Flag gesperrt
    // Bund: nur mit dem all-Flag
    expect(isUnlocked(DECK_DEFS.deck_c9, prof({ hadAllArchetypesRun: true }))).toBe(true);
    expect(isUnlocked(DECK_DEFS.deck_c9, prof())).toBe(false);
    // unlockProgress liefert sprechende Labels
    expect(unlockProgress(DECK_DEFS.deck_c8, prof()).label).toMatch(/Pflanze/);
    expect(unlockProgress(DECK_DEFS.deck_c9, prof({ hadAllArchetypesRun: true })).done).toBe(true);
  });
  it("alle Progressions-Schwellen sind vollständig abgedeckt (Decks 5/15/25/35, BF 10/20/30/40)", () => {
    const deckGames = Object.values(DECK_DEFS).filter(d => d.unlock?.kind === "games").map(d => d.unlock.n).sort((a,b)=>a-b);
    const bfGames   = Object.values(BATTLEFIELD_DEFS).filter(d => d.unlock?.kind === "games").map(d => d.unlock.n).sort((a,b)=>a-b);
    expect(deckGames).toEqual([5, 15, 25, 35]);
    expect(bfGames).toEqual([10, 20, 30, 40]);
  });
});

describe("cosmetics — isUnlocked", () => {
  it("null-unlock ist immer frei (auch ohne Profil)", () => {
    expect(isUnlocked(DECK_DEFS.default, undefined)).toBe(true);
    expect(isUnlocked(DECK_DEFS.default, prof())).toBe(true);
  });

  it("games: erst ab der Schwelle frei", () => {
    const d = DECK_DEFS.deck_p1; // n=5
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

  it("noBuyRun/monoStatRun: an Profil-Flags gebunden", () => {
    const noBuy = { unlock: { kind: "noBuyRun" } };
    const mono  = { unlock: { kind: "monoStatRun" } };
    expect(isUnlocked(noBuy, prof())).toBe(false);
    expect(isUnlocked(noBuy, prof({ hadNoBuyRun: true }))).toBe(true);
    expect(isUnlocked(mono, prof())).toBe(false);
    expect(isUnlocked(mono, prof({ hadMonoStatRun: true }))).toBe(true);
  });

  it("unbekannter kind blockiert nicht (defensiv)", () => {
    expect(isUnlocked({ unlock: { kind: "zukunft", n: 3 } }, prof())).toBe(true);
  });
});

describe("cosmetics — unlockProgress", () => {
  it("null-unlock: done, immer verfügbar", () => {
    const p = unlockProgress(DECK_DEFS.default, prof());
    expect(p.done).toBe(true);
    expect(p.label).toMatch(/verfügbar/i);
  });

  it("games: cur auf target gedeckelt, Klartext-Label", () => {
    const d = DECK_DEFS.deck_p1;
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
    const noBuyLocked = unlockProgress({ unlock: { kind: "noBuyRun" } }, prof());
    expect(noBuyLocked).toEqual({ done: false, cur: 0, target: 1, label: "Schließe einen Lauf ohne einen einzigen Shop-Kauf ab" });
    const monoDone = unlockProgress({ unlock: { kind: "monoStatRun" } }, prof({ hadMonoStatRun: true }));
    expect(monoDone).toEqual({ done: true, cur: 1, target: 1, label: "Wähle in einem Lauf immer nur denselben Stat" });
  });
});

describe("cosmetics — resolveSkinId (defensiver Fallback)", () => {
  it("gibt die id zurück, wenn sie existiert UND frei ist", () => {
    expect(resolveSkinId(DECK_DEFS, "deck_p1", prof({ games: 5 }))).toBe("deck_p1");
    expect(resolveSkinId(DECK_DEFS, "default", prof())).toBe("default");
  });
  it("fällt auf default zurück bei unbekannter id", () => {
    expect(resolveSkinId(DECK_DEFS, "gibtsnicht", prof({ games: 99 }))).toBe("default");
  });
  it("fällt auf default zurück, wenn die id (noch) gesperrt ist", () => {
    expect(resolveSkinId(DECK_DEFS, "deck_p1", prof({ games: 2 }))).toBe("default");
  });
});
