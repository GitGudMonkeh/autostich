import { describe, it, expect } from "vitest";
import { resolveTrick } from "../src/game/engine.js";
import { initialState } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import * as C from "../src/game/constants.js";

/* #370 Deck-Shuffle (Wochen-Mod) × Eis — Engine-Naht.

   REGRESSION: Der Mod mischte die komplette playerOrder neu. glacierLocked und challengeBlockForm sind aber
   POSITIONS-indiziert: die Zelle blieb gefroren/gesperrt, bekam aber eine beliebige andere Karte untergeschoben —
   und weil SWAP_CARDS genau diese Zellen zurückweist, konnte der Spieler das nicht korrigieren. Die Eis-Kern-
   entscheidung „Position gegen Wert" (docs §2.1) war unter dem Mod damit ausgehebelt statt erschwert. */

const N = C.TRICKS_PER_CYCLE;
const identity = () => Array.from({ length: N }, (_, i) => i);
const flat = () => Array.from({ length: N }, (_, i) => ({ id: `F${i}`, suit: i % 2 ? "B" : "R", baseRank: 9, value: 9 }));
const oppOf = (v) => Array.from({ length: N }, (_, i) => ({ id: `O${i}`, suit: "R", baseRank: v, value: v }));
const falses = () => new Array(N).fill(false);
const lockAt = (...ps) => { const l = falses(); for (const p of ps) l[p] = true; return l; };
// Echter PRNG: ein konstanter rng (z. B. () => 0.99) macht Fisher-Yates zur Identität und würde den Shuffle
// unbemerkt wegtesten. Crits sind hier egal — geprüft wird nur die playerOrder.

// DECISION_SCHEDULE[2] === "formation" → am Ende von Durchlauf 1 (cycle 1→2) öffnet die Aufstellphase.
const FORMATION_CYCLE = C.DECISION_SCHEDULE.indexOf("formation");
const deckShuffleMod = [{ id: "deckShuffle", effect: "deckShuffle", sign: "neg", mag: null }];

// Letzter Stich vor der Aufstellphase → der Durchlauf-Ende-Block (inkl. Deck-Shuffle) läuft.
const lastTrickBeforeFormation = (over = {}) => resolveTrick({
  ...initialState(makeRng(1)),
  deck: flat(), oppDeck: oppOf(1), playerOrder: identity(), oppOrder: identity(),
  cycle: FORMATION_CYCLE - 1, pos: N - 1,
  seed: null, weekMods: deckShuffleMod,
  ...over,
}, makeRng(5));

describe("#370 Deck-Shuffle respektiert fixierte Brett-Positionen", () => {
  it("Vorbedingung: der Mod mischt überhaupt (ohne fixierte Zellen ändert sich die Reihenfolge)", () => {
    const s = lastTrickBeforeFormation();
    expect(s.phase).toBe("formation");
    expect(s.playerOrder).not.toEqual(identity());
    expect([...s.playerOrder].sort((a, b) => a - b)).toEqual(identity()); // gültige Permutation
  });

  it("gefrorene Gletscher behalten IHRE Karte (starr, docs §2.1)", () => {
    const locked = [3, 11, 27];
    const s = lastTrickBeforeFormation({ activeArchetypes: ["ice"], glacierLocked: lockAt(...locked) });
    for (const p of locked) expect(s.playerOrder[p]).toBe(p); // Ausgangslage war die Identität
    expect([...s.playerOrder].sort((a, b) => a - b)).toEqual(identity());
    // Die freien Zellen wurden trotzdem gemischt — der Mod bleibt wirksam.
    const free = identity().filter((i) => !locked.includes(i));
    expect(free.some((i) => s.playerOrder[i] !== i)).toBe(true);
  });

  it("gesperrte Aufstell-Zellen (blockForm) behalten ebenfalls ihre Karte", () => {
    const blocked = [0, 5, 19, 38];
    const s = lastTrickBeforeFormation({ challengeBlockForm: blocked });
    for (const p of blocked) expect(s.playerOrder[p]).toBe(p);
    expect([...s.playerOrder].sort((a, b) => a - b)).toEqual(identity());
  });

  it("ohne den Mod bleibt die Reihenfolge unangetastet (Nicht-Ranked byte-identisch)", () => {
    const s = lastTrickBeforeFormation({ weekMods: [] });
    expect(s.phase).toBe("formation");
    expect(s.playerOrder).toEqual(identity());
  });
});
