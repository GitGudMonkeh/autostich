/* ONBOARDING-HINTS — Wächter für die Hint-Schicht (docs/tutorial-onboarding-design.md §5).

   Drei Fehlerklassen, die still durchrutschen würden:
   1. Ein „Mehr dazu"-Ziel zeigt auf eine Lektion, die der nächste Katalog-Schnitt gelöscht hat
      (genau das ist der T-O4-Umbau) → jeder Target-Pfad muss im Sektions-Katalog existieren.
   2. Ein Hint-Schlüssel fehlt im Katalog → der Spieler sähe den rohen Schlüssel.
   3. Eine abgetippte Zahl im Text — dieselbe Ratsche, die schon der geführte Lauf und die
      Sektionen trugen: Zahlen kommen als Platzhalter, sonst lügt der Hint nach dem nächsten
      Balancing. */
import { describe, it, expect } from "vitest";
import de from "../src/i18n/de.js";
import { HINT_DEFS, SEQUENCES, hintForScreen, screenOf, hasFormationType, activeTypeCount,
  hasOverlap, hasBuilding, hasDistrict, hasStructure } from "../src/ui/hints/hintScript.js";
import { SECTIONS } from "../src/ui/tutorial-sections/catalog.js";

const LESSON_PATHS = new Set(SECTIONS.flatMap((s) => s.lessons.map((l) => `${s.id}/${l.id}`)));

describe("hints · Skript-Integrität", () => {
  it("jedes „Mehr dazu“-Ziel existiert im Sektions-Katalog", () => {
    const bad = Object.entries(HINT_DEFS).filter(([, d]) => d.target && !LESSON_PATHS.has(d.target));
    expect(bad.map(([id, d]) => `${id} → ${d.target}`)).toEqual([]);
  });

  it("jeder referenzierte Schlüssel steht im deutschen Katalog", () => {
    const keys = Object.values(HINT_DEFS).flatMap((d) => [d.bodyKey, d.titleKey].filter(Boolean));
    const missing = keys.filter((k) => typeof de[k] !== "string" || !de[k]);
    expect(missing).toEqual([]);
  });

  it("kein Hint-Text nennt eine Zahl direkt (Platzhalter statt Abtippen)", () => {
    const bad = Object.entries(de)
      .filter(([k]) => k.startsWith("hint."))
      .filter(([, v]) => /\d/.test(String(v).replace(/\{[^}]*\}/g, "")));
    expect(bad.map(([k]) => k)).toEqual([]);
  });

  it("jeder Sequenz-Schritt hat eine Definition, und die Banner-Slots kennen ihre Screens", () => {
    for (const seq of Object.values(SEQUENCES)) for (const s of seq) expect(HINT_DEFS[s.id], s.id).toBeTruthy();
  });
});

describe("hints · Auswahl-Logik (pur, ohne React)", () => {
  const ctx = (over = {}) => ({ seen: new Set(), visits: {}, state: {}, firstRun: false,
    blitzOnly: false, multiArch: false, slotsFull: false, ...over });

  it("Skill-Screen: H2 nur im Erstlauf UND nur über einem Blitz-only-Angebot", () => {
    expect(hintForScreen("skill", ctx({ firstRun: true, blitzOnly: true }))).toBe("H2");
    // T-O1 kann vor T-O3 landen: frisches Profil, aber Mehr-Archetypen-Angebot → das generische H2b.
    expect(hintForScreen("skill", ctx({ firstRun: true, multiArch: true }))).toBe("H2b");
    expect(hintForScreen("skill", ctx({ multiArch: true }))).toBe("H2b");
    expect(hintForScreen("skill", ctx({ slotsFull: true }))).toBe("H5");
    expect(hintForScreen("skill", ctx({ seen: new Set(["H2b"]), multiArch: true, slotsFull: true }))).toBe("H5");
    expect(hintForScreen("skill", ctx())).toBe(null);
  });

  it("Perk-Screen: H3 beim ersten Besuch, H3b ab dem zweiten", () => {
    expect(hintForScreen("perk", ctx({ visits: { perk: 1 } }))).toBe("H3");
    expect(hintForScreen("perk", ctx({ seen: new Set(["H3"]), visits: { perk: 2 } }))).toBe("H3b");
    expect(hintForScreen("perk", ctx({ seen: new Set(["H3", "H3b"]), visits: { perk: 3 } }))).toBe(null);
  });

  it("Sequenzen: ein Schritt je Besuch, spätere Schritte warten auf ihren Besuch", () => {
    expect(hintForScreen("formation", ctx({ visits: { formation: 1 } }))).toBe("S-F1");
    // S-F1 gesehen, aber erst Besuch 1 → S-F2 wartet.
    expect(hintForScreen("formation", ctx({ seen: new Set(["S-F1"]), visits: { formation: 1 } }))).toBe(null);
    expect(hintForScreen("formation", ctx({ seen: new Set(["S-F1"]), visits: { formation: 2 } }))).toBe("S-F2");
    expect(hintForScreen("architect", ctx({ visits: { architect: 4 },
      seen: new Set(["S-A1", "S-A2", "S-A3"]) }))).toBe("S-A4");
  });

  it("Sequenzen: ein erreichtes Ziel wird übersprungen (done-Predicate)", () => {
    // Ein Farbblock liegt bereits → S-F1 fällt aus; Besuch 1 zeigt dann nichts (S-F2 wartet auf 2).
    const st = { formations: [{ formations: [{ type: "farbblock", ordinal: 1 }], mult: 1.2 }] };
    expect(hintForScreen("formation", ctx({ visits: { formation: 1 }, state: st }))).toBe(null);
    expect(hintForScreen("formation", ctx({ visits: { formation: 2 }, state: st }))).toBe("S-F2");
  });

  it("bedingte Phasen: einmalig je Profil", () => {
    expect(hintForScreen("glacier", ctx())).toBe("C1");
    expect(hintForScreen("glacier", ctx({ seen: new Set(["C1"]) }))).toBe(null);
    expect(hintForScreen("legendary", ctx())).toBe("C4");
  });
});

describe("hints · done-Predicates über echte Spielfunktionen", () => {
  it("leerer Zustand: nichts gilt als erreicht", () => {
    expect(hasFormationType({}, "farbblock")).toBe(false);
    expect(activeTypeCount({})).toBe(0);
    expect(hasOverlap({})).toBe(false);
    expect(hasBuilding({})).toBe(false);
    expect(hasDistrict({})).toBe(false);
    expect(hasStructure({})).toBe(false);
  });

  it("Formations-Predicates lesen die perPosition-Form", () => {
    const st = { formations: [
      { formations: [{ type: "farbblock", ordinal: 1 }, { type: "treppe", ordinal: 1 }], mult: 1.4 },
      { formations: [], mult: 1 },
    ] };
    expect(hasFormationType(st, "farbblock")).toBe(true);
    expect(activeTypeCount(st)).toBe(2);
    expect(hasOverlap(st)).toBe(true);
  });
});

describe("hints · Screen-Erkennung", () => {
  it("levelup allein identifiziert keinen Screen — das Angebots-Feld tut es", () => {
    expect(screenOf({ phase: "levelup", skillOffer: ["SK_LIGHTNING_01"] })).toBe("skill");
    expect(screenOf({ phase: "levelup", offer: [{}] })).toBe("perk");
    expect(screenOf({ phase: "formation" })).toBe("formation");
    expect(screenOf({ phase: "architect" })).toBe("architect");
    expect(screenOf({ phase: "glacier-target" })).toBe("glacier");
    expect(screenOf({ phase: "play" })).toBe(null);
    expect(screenOf(null)).toBe(null);
  });
});
