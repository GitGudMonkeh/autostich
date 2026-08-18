import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import de from "../src/i18n/de.js";
import en from "../src/i18n/en.js";
import { FORMATION_LABELS } from "../src/game/constants.js";
import { WIED_F2, WIED_F3, WIED_F4, WIED_STEP, ESKALATION_STEP,
  FARBBLOCK_BASE, TREPPE_BASE, WECHSEL_BASE, MAX_TREPPE_STEP, WECHSEL_MIN_DIFF } from "../src/game/formations.js";

/* ============================================================
   FORMATIONS-LEGENDE — die Naht zwischen drei Dateien (18.08.2026, #sprache).

   Die acht Erklärsätze standen bis dahin als deutsche String-Tabelle in ArchPanels.jsx. Englische
   Spieler lasen deshalb MITTEN in einer sonst englischen Legende deutschen Fließtext — gemeldet aus
   dem Spiel, nicht von der Suite. Die i18n-Ratsche konnte es nicht sehen: ihr Greifer fischt
   JSX-Textknoten (>…<) und Text-Props, nicht Literale in einer Konstanten-Tabelle.

   Zweiter Bruch derselben Stelle: die Faktoren waren abgetippt (×1,25 / ×1,35 / …). Ein
   Balancing-Schritt in formations.js hätte die Legende still falsch werden lassen. Jetzt kommen die
   Zahlen als Platzhalter aus den exportierten Konstanten.

   Dieser Wächter hält beides fest — und prüft zuerst, dass er die Naht überhaupt noch findet.
   ============================================================ */

const SRC = readFileSync(new URL("../src/ui/ArchPanels.jsx", import.meta.url), "utf8");

describe("Formations-Legende · Katalog", () => {
  it("jeder Formationstyp hat seinen Erklärsatz in BEIDEN Sprachen", () => {
    const types = Object.keys(FORMATION_LABELS);
    expect(types.length).toBeGreaterThan(0);
    for (const type of types) {
      const key = `formlegend.${type}`;
      expect(de[key], `${key} fehlt in de.js — die Legende zeigt den Typ ohne Regel`).toBeTruthy();
      expect(en[key], `${key} fehlt in en.js — englische Spieler sähen Deutsch`).toBeTruthy();
    }
  });

  /* Die Tuning-Zahlen gehören NICHT in den Katalog. Geprüft werden genau die Werte, die die Sätze
     einsetzen — beide Schreibweisen (1,25 deutsch · 1.25 englisch), damit die Regel in jeder
     Sprache greift. Die Mindestlängen (≥2 / ≥3) sind Satzbestandteil und bleiben erlaubt. */
  it("kein Faktor ist im Katalog abgetippt — die Sätze tragen Platzhalter", () => {
    const values = [WIED_F2, WIED_F3, WIED_F4, WIED_STEP, ESKALATION_STEP,
      FARBBLOCK_BASE, TREPPE_BASE, WECHSEL_BASE];
    const bad = [];
    for (const [name, cat] of [["de", de], ["en", en]]) {
      for (const key of Object.keys(cat).filter((k) => k.startsWith("formlegend."))) {
        for (const v of values) {
          for (const form of [v.toFixed(2), v.toFixed(2).replace(".", ",")]) {
            if (String(cat[key]).includes(form)) bad.push(`${name}:${key} nennt ${form}`);
          }
        }
      }
    }
    expect(bad, `Abgetippte Tuning-Zahl in der Legende:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("die Platzhalter der Sätze werden auch versorgt", () => {
    // Ein {step} ohne Wert bliebe im Spiel als „{step}" stehen — sichtbar, aber leicht zu übersehen.
    const names = new Set();
    for (const key of Object.keys(de).filter((k) => k.startsWith("formlegend."))) {
      for (const m of String(de[key]).matchAll(/\{(\w+)\}/g)) names.add(m[1]);
    }
    expect(names.size, "die Legende hat gar keine Platzhalter mehr").toBeGreaterThan(0);
    for (const n of names) {
      expect(SRC, `ArchPanels.jsx setzt {${n}} nicht`).toMatch(new RegExp(`\\b${n}:`));
    }
  });
});

describe("Formations-Legende · Verdrahtung", () => {
  it("die Regeln kommen aus dem Katalog, nicht als Literal aus der Datei", () => {
    const block = SRC.match(/const formationRules = \(\) => \[([\s\S]*?)\n\];/);
    expect(block, "formationRules() nicht gefunden — baut die Legende ihre Zeilen anders?").toBeTruthy();
    // JEDE Zeile der Tabelle muss ihren Satz über t() holen. Ein zurückgefallenes Literal fällt hier
    // auf, egal in welcher Sprache es geschrieben ist — daran ist die alte Ratsche vorbeigelaufen.
    for (const type of Object.keys(FORMATION_LABELS)) {
      const line = block[1].split("\n").find((l) => l.includes(`["${type}"`));
      expect(line, `${type} fehlt in formationRules()`).toBeTruthy();
      expect(line, `${type} trägt seinen Satz wieder als Literal statt über t()`)
        .toContain(`t("formlegend.${type}"`);
    }
    // Die zwei Zeilen unter der Tabelle (Überlappung · Rahmenfarbe) liegen direkt in der JSX.
    for (const key of ["formlegend.overlap", "formlegend.frame", "formlegend.frame.hint"]) {
      expect(SRC, `${key} wird nicht mehr gerufen`).toContain(`t("${key}"`);
    }
  });

  it("die Zahlen kommen aus formations.js", () => {
    expect(SRC).toMatch(/from "\.\.\/game\/formations\.js"/);
    for (const name of ["WIED_F2", "WIED_F3", "WIED_F4", "WIED_STEP", "ESKALATION_STEP",
      "FARBBLOCK_BASE", "TREPPE_BASE", "WECHSEL_BASE", "MAX_TREPPE_STEP", "WECHSEL_MIN_DIFF"]) {
      expect(SRC, `${name} wird nicht mehr benutzt — steht die Zahl wieder in der Legende?`).toContain(name);
    }
  });

  /* Die Konstanten sind nur dann EINE Quelle, wenn die Erkennung sie auch benutzt. Stünde in
     wiederholungFactor() weiter die 1.25 und daneben ein Export namens WIED_F2, hätte man dieselbe
     Drift wie vorher — nur besser getarnt. Deshalb hier auf die Rechenzeilen geschaut. */
  it("die Erkennung rechnet mit den exportierten Konstanten", () => {
    const eng = readFileSync(new URL("../src/game/formations.js", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    expect(eng).toMatch(/f = WIED_F2 \+ secondBonus/);
    expect(eng).toMatch(/f = WIED_F3 \+ thirdBonus/);
    expect(eng).toMatch(/f = WIED_F4 \+ \(ordinal - 4\) \* WIED_STEP/);
    expect(eng).toMatch(/base \+ \(ordinal - 3\) \* ESKALATION_STEP/);
    // Die Werte selbst — dokumentiert, damit eine Balancing-Änderung hier bewusst quittiert wird.
    expect([WIED_F2, WIED_F3, WIED_F4, WIED_STEP]).toEqual([1.25, 1.5, 1.8, 0.4]);
    expect([FARBBLOCK_BASE, TREPPE_BASE, WECHSEL_BASE, ESKALATION_STEP]).toEqual([1.35, 1.35, 1.4, 0.2]);
    expect([MAX_TREPPE_STEP, WECHSEL_MIN_DIFF]).toEqual([4, 4]);
  });
});
