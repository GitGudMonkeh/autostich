import { describe, it, expect } from "vitest";
import {
  GLOSSARY, GLOSSARY_CATEGORIES, GLOSSARY_GROUPS,
  glossaryEntries, glossaryKeywords, isGlossaryTerm, tokenizeGlossary,
} from "../src/game/glossary.js";

const CAT_IDS = new Set(GLOSSARY_CATEGORIES.map((c) => c.id));
const GROUP_IDS = new Set(Object.keys(GLOSSARY_GROUPS));

describe("Glossar-Datenmodell", () => {
  it("jeder Eintrag hat vollständige Pflichtfelder + gültige Kategorie", () => {
    for (const e of glossaryEntries()) {
      expect(e.label, `${e.id}.label`).toBeTruthy();
      expect(e.icon, `${e.id}.icon`).toBeTruthy();
      expect(e.color, `${e.id}.color`).toMatch(/^#/);
      expect(e.text, `${e.id}.text`).toBeTruthy();
      expect(CAT_IDS.has(e.category), `${e.id}.category=${e.category}`).toBe(true);
    }
  });

  it("nur Fraktions-Einträge tragen eine (gültige) Gruppe", () => {
    for (const e of glossaryEntries()) {
      if (e.category === "frak") {
        expect(GROUP_IDS.has(e.group), `${e.id}.group=${e.group}`).toBe(true);
      } else {
        expect(e.group, `${e.id} darf keine Gruppe haben`).toBeUndefined();
      }
    }
  });

  it("Interpolation ist aufgelöst — keine rohen ${…}-Platzhalter im Text", () => {
    for (const e of glossaryEntries()) {
      expect(e.text.includes("${"), `${e.id} hat rohes Template`).toBe(false);
      expect(e.text.includes("undefined"), `${e.id} interpoliert undefined`).toBe(false);
    }
  });
});

describe("Backcompat: glossaryKeywords / GLOSSARY[token]", () => {
  it("die 14 Fraktions-Tokens bleiben als Keys erhalten", () => {
    for (const tok of ["crit", "charge", "ionize", "streak", "heat", "consume",
      "brand", "ash", "forge", "freeze", "formation", "growth", "green",
      "colonize", "overgrowth", "eternalSpring"]) {
      expect(isGlossaryTerm(tok), tok).toBe(true);
      expect(GLOSSARY[tok].label).toBeTruthy();
    }
  });

  it("glossaryKeywords filtert generische Tokens und dedupliziert", () => {
    const defs = { A: { keywords: ["heat", "value", "charge"] }, B: { keywords: ["heat", "score"] } };
    expect(glossaryKeywords(["A", "B"], defs)).toEqual(["heat", "charge"]);
  });
});

describe("tokenizeGlossary (Auto-Fett)", () => {
  const bolds = (s) => tokenizeGlossary(s).filter((p) => p.bold).map((p) => p.text);

  it("markiert bekannte Begriffe", () => {
    expect(bolds("Ein Crit erzeugt Ladung.")).toEqual(["Crit", "Ladung"]);
  });

  it("rekonstruiert den Originaltext verlustfrei", () => {
    const s = "Schichten geben Kartenwert, Frostkarten biegen Formationen.";
    expect(tokenizeGlossary(s).map((p) => p.text).join("")).toBe(s);
  });

  it("greift NICHT innerhalb eines Wortes (Wortgrenzen)", () => {
    // „Serie" darf nicht in „Serientäter" markiert werden.
    expect(bolds("Serientäter")).toEqual([]);
  });

  it("bevorzugt die längste Form (Crit-Multiplikator statt Crit)", () => {
    expect(bolds("Der Crit-Multiplikator steigt.")).toEqual(["Crit-Multiplikator"]);
  });

  it("Alt-Bezeichnung Dauerwert wird auf den Glossar-Begriff markiert", () => {
    expect(bolds("Der Dauerwert bleibt.")).toEqual(["Dauerwert"]);
  });

  it("leerer/fehlender Text → []", () => {
    expect(tokenizeGlossary("")).toEqual([]);
    expect(tokenizeGlossary(undefined)).toEqual([]);
  });
});
