/* TUTORIAL (geführter Lauf) — Skript, Schritt-Erkennung und Anker.

   Der teuerste stille Fehler dieses Features wäre ein Coach-Mark, der auf ein `data-tut` zeigt, das
   es im Code nicht (mehr) gibt: das Overlay zeigt dann brav seinen Satz, aber ohne Spotlight — und
   niemand merkt es, weil nichts kaputtgeht. Genau das prüft der letzte Test hier. */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { TUTORIAL_STEPS, TUTORIAL_OUTRO, TUTORIAL_TOTAL, TUTORIAL_MAIN_STEPS, stepMatches } from "../src/ui/tutorial/tutorialScript.js";
import de from "../src/i18n/de.js";
import en from "../src/i18n/en.js";

/* Alle .jsx unter src/ einsammeln — die Anker dürfen überall sitzen, nicht nur in den heute
   bekannten Panels. */
function allSources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) allSources(p, out);
    else if (name.endsWith(".jsx")) out.push(p);
  }
  return out;
}
/* Das Tutorial selbst bleibt draußen: dort steht `data-tut` als Doku (§ Schema) und als
   Such-Vorlage (`[data-tut="${anchor}"]`) — beides sind keine echten Anker. */
const SRC = allSources("src")
  .filter((p) => !p.includes(join("ui", "tutorial")))
  .map((p) => readFileSync(p, "utf8")).join("\n");
const ANCHORS_IN_CODE = new Set([...SRC.matchAll(/data-tut="([^"]+)"/g)].map((m) => m[1]));

describe("Tutorial · Skript", () => {
  it("jede Schritt-id ist eindeutig (sie ist zugleich der `seen`-Merker)", () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(new Set(ids).size, `doppelte id: ${ids.join(", ")}`).toBe(ids.length);
    expect(ids).not.toContain(TUTORIAL_OUTRO.id); // der Abschluss ist bewusst KEIN Schritt
  });

  it("jeder Schritt hat einen Auslöser — entweder eine Phase oder den Lauf-Start", () => {
    for (const s of TUTORIAL_STEPS) {
      expect(!!(s.match.phase || s.match.atStart), `${s.id} feuert nie`).toBe(true);
    }
  });

  it("stepMatches unterscheidet die drei Auswahlarten von `levelup`", () => {
    const skill = TUTORIAL_STEPS.find((s) => s.id === "skill");
    const perk = TUTORIAL_STEPS.find((s) => s.id === "perk");
    // Skill-Angebot: nur der Skill-Schritt greift.
    expect(stepMatches(skill, "levelup", { skillOffer: [1, 2] })).toBe(true);
    expect(stepMatches(perk, "levelup", { skillOffer: [1, 2] })).toBe(false);
    // Perk-Angebot: umgekehrt.
    expect(stepMatches(perk, "levelup", { offer: [1, 2, 3] })).toBe(true);
    expect(stepMatches(skill, "levelup", { offer: [1, 2, 3] })).toBe(false);
    // Ohne Angebots-Feld greift keiner der beiden — `levelup` allein sagt nichts.
    expect(stepMatches(skill, "levelup", {})).toBe(false);
    expect(stepMatches(perk, "levelup", {})).toBe(false);
  });

  it("der Intro-Schritt wird nie über die Phase gefunden (er wird beim Start gesetzt)", () => {
    const intro = TUTORIAL_STEPS.find((s) => s.id === "intro");
    for (const phase of ["play", "levelup", "formation", "architect", "menu"]) {
      expect(stepMatches(intro, phase, {})).toBe(false);
    }
  });

  it("genau ein Schritt schließt den erklärten Bogen ab", () => {
    expect(TUTORIAL_STEPS.filter((s) => s.closing).length).toBe(1);
  });

  it("die Fortschritts-Zahl kommt aus der Skriptlänge, nicht aus dem Text", () => {
    expect(TUTORIAL_TOTAL).toBe(TUTORIAL_MAIN_STEPS.length);
    expect(TUTORIAL_TOTAL).toBeGreaterThan(0);
    // Kein Text nennt eine Schrittzahl fest — sonst driftet sie beim ersten neuen Schritt.
    for (const [k, v] of Object.entries(de)) {
      if (!k.startsWith("tutorial.") || k === "tutorial.progress") continue;
      expect(String(v), `${k} nennt eine feste Schrittzahl`).not.toMatch(/Schritt \d/);
    }
  });
});

describe("Tutorial · Texte", () => {
  const keysOf = (s) => [s.titleKey, s.bodyKey, ...(s.coachmarks || []).map((c) => c.key)].filter(Boolean);
  const ALL_KEYS = [...TUTORIAL_STEPS.flatMap(keysOf), ...keysOf(TUTORIAL_OUTRO)];

  it("jeder Schlüssel des Skripts steht in BEIDEN Katalogen", () => {
    for (const k of ALL_KEYS) {
      expect(de[k], `${k} fehlt in de.js`).toBeTruthy();
      expect(en[k], `${k} fehlt in en.js`).toBeTruthy();
    }
  });

  it("das Skript trägt keine Anzeigetexte, nur Schlüssel", () => {
    const src = readFileSync("src/ui/tutorial/tutorialScript.js", "utf8");
    // Alles zwischen den Schlüssel-Anführungszeichen muss wie ein Schlüssel aussehen (tutorial.…).
    for (const m of src.matchAll(/(?:titleKey|bodyKey|key):\s*"([^"]+)"/g)) {
      expect(m[1], "kein Schlüssel, sondern Text").toMatch(/^tutorial\./);
    }
  });

  /* Der eigentliche Drift-Schutz. Beim Gegenlesen standen „40 Karten" und „acht Segmente" als
     ausgeschriebene Zahlen im Text — beide wären beim ersten Deck-Umbau still falsch geworden, und
     der Paritäts-Wächter hätte nichts gemerkt: BEIDE Sprachen hätten dieselbe falsche Zahl genannt.
     Deshalb hier hart: im Tutorial steht keine nackte Zahl, nur Platzhalter. */
  it("kein Tutorial-Text nennt eine Zahl direkt — nur Platzhalter", () => {
    const bad = [];
    for (const [lang, cat] of [["de", de], ["en", en]]) {
      for (const k of ALL_KEYS) {
        const ohnePlatzhalter = String(cat[k] || "").replace(/\{\w+\}/g, "");
        if (/\d/.test(ohnePlatzhalter)) bad.push(`${lang} ${k}: „${cat[k]}"`);
      }
    }
    expect(bad, `Zahl im Text statt aus den Konstanten:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("jeder Platzhalter im Text wird vom Schritt auch geliefert (beide Sprachen)", () => {
    const check = (step) => {
      const vars = Object.keys(step.vars || {});
      for (const k of keysOf(step)) {
        for (const cat of [de, en]) {
          for (const m of String(cat[k] || "").matchAll(/\{(\w+)\}/g)) {
            expect(vars, `${k}: {${m[1]}} steht im Text, aber nicht in vars`).toContain(m[1]);
          }
        }
      }
    };
    TUTORIAL_STEPS.forEach(check);
    check(TUTORIAL_OUTRO);
  });
});

describe("Tutorial · Anker", () => {
  it("jeder Coach-Mark zeigt auf ein data-tut, das es im Code wirklich gibt", () => {
    const missing = [];
    for (const s of TUTORIAL_STEPS) {
      for (const c of s.coachmarks || []) {
        if (!ANCHORS_IN_CODE.has(c.anchor)) missing.push(`${s.id} → data-tut="${c.anchor}"`);
      }
    }
    expect(missing, `Coach-Mark ohne Anker (Spotlight zeigt ins Leere):\n  ${missing.join("\n  ")}`).toEqual([]);
  });

  it("jeder data-tut-Anker im Code wird auch von einem Coach-Mark benutzt", () => {
    const used = new Set(TUTORIAL_STEPS.flatMap((s) => (s.coachmarks || []).map((c) => c.anchor)));
    const orphan = [...ANCHORS_IN_CODE].filter((a) => !used.has(a));
    expect(orphan, `verwaister Anker (niemand zeigt darauf):\n  ${orphan.join("\n  ")}`).toEqual([]);
  });
});
