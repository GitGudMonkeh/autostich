import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { NODES, RANKED_ARCHETYPES, rankedUnlocked, emptyProfile, unlockAllProfile } from "../src/game/progression.js";

/* ============================================================
   #394 — zwei Hub-Details, als Quell-/Logik-Guards festgenagelt:

     1. Deck-Werkstatt: das Modal hat eine FESTE Höhe (wie die Bestenliste seit #385) und einen intern
        scrollenden Inhaltsbereich. Ohne das folgt die Karte dem Inhalt → beim Filterwechsel auf eine leere
        Ansicht („Nichts in dieser Ansicht") schrumpft das Fenster. Die Höhen-/Scroll-Struktur ist reines
        Markup, deshalb wird sie hier als Quelltext geprüft (gleiche Technik wie registry-guards.test.js).

     2. Mainscreen: der „Rangliste"-Knopf zeigt das Schloss ZUSTANDSABHÄNGIG (🏆 sobald frei) — plus die
        Logik dahinter (rankedUnlocked = alle Deck-Knoten + je ≥1 abgeschlossener Lauf).
   ============================================================ */

const ui = (f) => readFileSync(new URL(`../src/ui/${f}`, import.meta.url), "utf8");

describe("#394/#385 — Hub-Modals behalten eine konstante Fenstergröße", () => {
  // Beide Modals teilen dieselbe feste Höhe → gleiche Bildsprache, kein Springen zwischen den Panels.
  for (const file of ["CustomizeScreen.jsx", "LeaderboardScreen.jsx"]) {
    it(`${file}: Karte hat eine feste Höhe (min(88vh, 760px))`, () => {
      expect(ui(file)).toContain('height: "min(88vh, 760px)"');
    });

    it(`${file}: der Inhaltsbereich scrollt intern (flex-1 min-h-0 + overflow-y-auto)`, () => {
      const scroller = ui(file)
        .split("\n")
        .some((l) => l.includes("flex-1 min-h-0") && l.includes("overflow-y-auto"));
      expect(scroller, "kein intern scrollender Inhaltsbereich gefunden").toBe(true);
    });
  }

  it("Deck-Werkstatt: die Karte wächst NICHT mehr mit dem Inhalt (flex-col + overflow-hidden)", () => {
    const card = ui("CustomizeScreen.jsx")
      .split("\n")
      .find((l) => l.includes("w-full max-w-xl rounded-2xl"));
    expect(card).toBeTruthy();
    expect(card).toContain("flex flex-col");
    expect(card).toContain("overflow-hidden");
  });
});

describe("#394 — Mainscreen: Rangliste-Schloss verschwindet bei Freischaltung", () => {
  it("StartScreen zeigt 🏆/🔒 zustandsabhängig aus rankedUnlocked", () => {
    const src = ui("StartScreen.jsx");
    expect(src).toContain("const rankedFree = rankedUnlocked(prof);"); // aus dem live gereichten `profile`-Prop
    expect(src).toMatch(/rankedFree \? "🏆"/); // frei → Pokal
    expect(src).toMatch(/rankedFree \? "🏆"[\s\S]{0,80}🔒/); // gesperrt → Schloss (derselbe Ausdruck, kein zweiter Pfad)
  });

  it("rankedUnlocked: erst alle Deck-Knoten UND je ≥1 abgeschlossener Lauf", () => {
    const deckNodes = Object.fromEntries(NODES.filter((n) => n.deckUnlock).map((n) => [n.id, 1]));
    const allRuns = Object.fromEntries(RANKED_ARCHETYPES.map((a) => [a, 1]));
    expect(RANKED_ARCHETYPES).toEqual(expect.arrayContaining(["lightning", "fire", "ice", "plant"]));

    expect(rankedUnlocked(emptyProfile(0))).toBe(false);
    // Decks komplett, aber ein Archetyp ohne abgeschlossenen Lauf → weiterhin gesperrt.
    const { plant, ...missingOne } = allRuns;
    expect(rankedUnlocked({ nodes: deckNodes, archetypeRunsCompleted: missingOne })).toBe(false);
    // Läufe komplett, aber ein Deck-Knoten fehlt → weiterhin gesperrt.
    const { [NODES.find((n) => n.deckUnlock).id]: _drop, ...missingNode } = deckNodes;
    expect(rankedUnlocked({ nodes: missingNode, archetypeRunsCompleted: allRuns })).toBe(false);
    // Beides erfüllt → frei (Schloss weg).
    expect(rankedUnlocked({ nodes: deckNodes, archetypeRunsCompleted: allRuns })).toBe(true);
  });

  it("unlock-Testcode schaltet die Rangliste sofort mit frei", () => {
    expect(rankedUnlocked(unlockAllProfile(emptyProfile(0)))).toBe(true);
  });
});
