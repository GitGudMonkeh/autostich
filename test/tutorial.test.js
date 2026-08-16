/* TUTORIAL (geführter Lauf) — Skript, Schritt-Erkennung und Anker.

   Der teuerste stille Fehler dieses Features wäre ein Coach-Mark, der auf ein `data-tut` zeigt, das
   es im Code nicht (mehr) gibt: das Overlay zeigt dann brav seinen Satz, aber ohne Spotlight — und
   niemand merkt es, weil nichts kaputtgeht. Genau das prüft der letzte Test hier. */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { TUTORIAL_STEPS, TUTORIAL_OUTRO, TUTORIAL_TOTAL, TUTORIAL_MAIN_STEPS, stepMatches } from "../src/ui/tutorial/tutorialScript.js";
import { DISPLAY_VAR_KEYS, displayVars } from "../src/ui/tutorial/tutorialVars.js";
import { cardBox } from "../src/ui/tutorial/TutorialOverlay.jsx";
import { DECISION_SCHEDULE } from "../src/game/constants.js";
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
      // Neben den Zahlen aus `vars` sind die Anzeigezeit-Platzhalter erlaubt (tutorialVars.js) —
      // übersetzte Registernamen, die es in einem puren Skript-Modul nicht geben kann.
      const vars = [...Object.keys(step.vars || {}), ...DISPLAY_VAR_KEYS];
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

  /* Die Liste der Anzeigezeit-Platzhalter ist die Ausnahme im Test darüber — sie darf nicht still
     von dem abweichen, was der Lieferant wirklich füllt, sonst ließe sie einen toten Platzhalter
     durch („{formTypes}" bliebe als Text stehen). */
  it("die Anzeigezeit-Platzhalter werden auch wirklich geliefert", () => {
    const got = displayVars();
    expect(Object.keys(got).sort()).toEqual([...DISPLAY_VAR_KEYS].sort());
    for (const k of DISPLAY_VAR_KEYS) expect(String(got[k]).length, `${k} ist leer`).toBeGreaterThan(0);
  });
});

/* Die Karte darf NIE über den Bildschirmrand hinauslaufen — genau das war der Playtest-Befund
   („Panel abgeschnitten, Knöpfe nicht erreichbar"). Ursache war eine erzwungene Mindesthöhe, die
   größer als der vorhandene Platz sein konnte. */
describe("Tutorial · Karten-Platzierung", () => {
  const VIEW = 800;
  const fits = (box) => {
    if (box.center) return true;
    const top = box.top != null ? box.top : VIEW - box.bottom - box.maxH;
    return top >= 0 && top + box.maxH <= VIEW;
  };

  it("ohne Anker bleibt das Fenster mittig", () => {
    expect(cardBox(null, VIEW).center).toBe(true);
  });

  it("liegt ÜBER dem Spotlight, wenn dort Platz ist", () => {
    const box = cardBox({ top: 500, left: 0, width: 300, height: 200 }, VIEW);
    expect(box.bottom).toBeGreaterThan(0);   // von unten verankert = über dem Panel
    expect(box.top).toBeUndefined();
    expect(fits(box)).toBe(true);
  });

  it("weicht nach unten aus, wenn oben kein Platz ist", () => {
    const box = cardBox({ top: 10, left: 0, width: 300, height: 100 }, VIEW);
    expect(box.top).toBeGreaterThan(100);
    expect(fits(box)).toBe(true);
  });

  it("bleibt bei einem bildschirmfüllenden Panel ganz sichtbar (heftet oben an, füllt Resthöhe)", () => {
    // Aufstellungsbrett/Baufeld: oben wie unten zu wenig Platz → oben anheften und überlagern.
    // `fill` gibt der Karte im Render die volle Resthöhe, damit der Text samt Knöpfen nie unten
    // abgeschnitten (und scrollbar) ist — dafür verdeckt sie mehr vom Brett.
    const box = cardBox({ top: 40, left: 0, width: 300, height: 730 }, VIEW);
    expect(fits(box)).toBe(true);
    expect(box.top).toBeLessThan(50);
    expect(box.fill).toBe(true);
  });

  it("passt in JEDER Anker-Lage vollständig auf den Schirm", () => {
    for (let top = -200; top <= VIEW + 200; top += 25) {
      for (const height of [20, 120, 400, 700, 1200]) {
        const box = cardBox({ top, left: 0, width: 300, height }, VIEW);
        expect(fits(box), `top=${top} height=${height} → ${JSON.stringify(box)}`).toBe(true);
      }
    }
  });
});

/* Warum die Schrittnummer in useTutorial.js beim AUFTRETEN vergeben wird und nicht aus der
   Skript-Reihenfolge kommt: der Plan stellt „play" vor „skill" (Erklärbogen), gespielt wird aber
   zuerst die Skill-Wahl. Wer das Skript umsortiert, um die Nummer zu „reparieren", zerreißt den
   Bogen — dieser Test hält den Grund fest. */
describe("Tutorial · Schrittnummer", () => {
  it("Skript-Reihenfolge ist NICHT die Reihenfolge des Auftretens", () => {
    expect(DECISION_SCHEDULE[0]).toBe("skill");
    const ids = TUTORIAL_MAIN_STEPS.map((s) => s.id);
    expect(ids.indexOf("play")).toBeLessThan(ids.indexOf("skill"));
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
