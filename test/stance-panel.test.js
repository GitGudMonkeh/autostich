import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import de from "../src/i18n/de.js";

/* Prisma-Feldpanel (src/ui/StanceBar.jsx) — die Nähte, an denen das Panel und der Motor dieselbe
   Wahrheit sagen müssen. Ein Panel, das eine feste Zahl zeigt, während der Motor mit einer anderen
   rechnet, ist schlimmer als keins: es sieht richtig aus. Genau das ist hier schon zweimal passiert
   (Spalier/Verwachsung in der Formations-Legende, §6.23/§6.26).

   Geprüft wird der QUELLTEXT OHNE KOMMENTARE. Der Dateikopf von StanceBar.jsx nennt „Verankerung",
   „Beharrlichkeit" und „Grundfarbe" beim Namen — ein Wächter, der auf den rohen Text greift, würde
   sich an der Erklärung festhalten statt am Code und beim Löschen der Zeile grün bleiben. */
const raw = readFileSync(new URL("../src/ui/StanceBar.jsx", import.meta.url), "utf8");
const code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

describe("Prisma-Panel · was der Spieler abliest", () => {
  it("die Zählfelder sind so viele, wie die Schwelle verlangt", () => {
    // Beschleunigung senkt `threshold` im Lauf. Eine feste 5 hier hieße: die Spur zeigt weiter fünf
    // Schritte, während der Wechsel schon nach vier kommt.
    expect(code).toMatch(/length:\s*st\.threshold/);
    expect(code, "die Lücke ist Schwelle minus Zähler").toMatch(/const left = st\.threshold - won/);
  });

  it("die Zeilen kommen aus STANCE_SUITS, nicht aus einer Liste im Panel", () => {
    expect(code).toMatch(/STANCE_SUITS\.map/);
    expect(code, "Reihenfolge und Zahl der Haltungen gehören dem Modul").not.toMatch(/\[\s*"R",\s*"B",\s*"G",\s*"Y"\s*\]/);
  });

  it("die aktive Zeile trägt keine Lücken-Zahl", () => {
    /* Ein Selbst-Auslösen ist kein Wechsel (stance.js, stanceTick): der Zähler der aktiven Haltung
       fällt bei der Schwelle nur zurück. Eine Zahl dort verspräche einen Wechsel, den es nicht gibt. */
    expect(code).toMatch(/\{act \? "" : left\}/);
  });

  it("eine Zeile leuchtet genau dann, wenn ihre Haltung klingt", () => {
    expect(code).toMatch(/const on = ringsNow\(st, s\)/);
    expect(code, "aktiv und Nachklang leuchten gleich — beide wirken voll").toMatch(/background: on \? `\$\{c\}12`/);
  });

  it("Grün zeigt den Satz, mit dem der Motor rechnet (Stufe und Verankerung heben ihn)", () => {
    expect(code).toMatch(/stanceGreenStep\(skills\) \+ \(stanceParam\(skills, skillTiers, S\.VERANKERUNG, "plus"\)/);
  });

  it("Gelb zeigt den Multiplikator, mit dem der Motor rechnet (Stufe, dann Beharrlichkeit je Stich)", () => {
    expect(code).toMatch(/stanceScoreStep\(skills\) \+ \(stanceParam\(skills, skillTiers, S\.BEHARRLICHKEIT, "perTrick"\)/);
    expect(code, "der Hebel ist die Laufzeit der gelben Haltung").toMatch(/st\.ranFor\?\.Y/);
  });

  it("die Stufenwerte kommen aus dem Modul, nicht aus einer zweiten Rechnung", () => {
    // Die drei Leitern gehören dem Fraktionsmodul; das Panel rechnet keine davon nach.
    expect(code).toMatch(/const blueCrit = stanceCritStep\(skills\)/);
    expect(code, "keine eigene Staffel im Panel").not.toMatch(/STANCE_CRIT_STEPS|STANCE_SCALE_MAX \* |\/ STANCE_SCALE_MAX/);
    expect(code, "und die Stufe steht im Panel").toMatch(/t\("bar\.stance\.level", \{ n: stanceLevel\(skills\), max: STANCE_SCALE_MAX \}\)/);
  });

  it("die Skill-Fenster lesen ihre Werte aus dem Fraktions-Modul", () => {
    // Keine zweite Fassung einer Regel im Panel — sonst driftet sie beim nächsten Tarieren weg.
    for (const reader of ["anklangScore(", "uebertragMult(", "genugtuungScore(", "lichtbandCap("]) {
      expect(code, `${reader} fehlt`).toContain(reader);
    }
  });

  it("die Schale trägt die aktive Haltung, der Einklang nimmt ihr die Farbe", () => {
    expect(code).toMatch(/const fac = einklang \? PRISM : suitColor\(st\.stance\)/);
    expect(code, "Einklang heißt: alle vier klingen").toMatch(/ringCount\(st\) === STANCE_SUITS\.length/);
  });

  it("der Kopf-Chip nennt die aktive Haltung und die nächste — die aktive zählt dabei nicht mit", () => {
    // Eingeklappt ist der Chip alles, was bleibt. Eine Haltung kann sich nicht selbst ablösen.
    expect(code).toMatch(/if \(s === st\.stance\) continue;/);
    expect(code).toMatch(/t\("bar\.stance\.state", \{ stance: suitLabel\(st\.stance\), next: suitLabel\(next\.s\), n: next\.gap \}\)/);
  });

  it("App reicht den Substate durch und schaltet das Panel über die Archetypen", () => {
    expect(app).toMatch(/<StanceBar active=\{\(state\.activeArchetypes \|\| \[\]\)\.includes\("stance"\)\}/);
    expect(app).toMatch(/stance=\{state\.stance\}/);
    expect(app, "und die Spur zeigt ihre Skills wie die anderen vier").toMatch(/includes\("stance"\) && "stance"/);
  });
});

describe("Prisma-Panel · Katalog", () => {
  it("die Grundfarbe steht im Panel, nicht nur in der Dokumentation", () => {
    // §2.2: gezählt wird `card.suit`, nie `effColor(card)`. Mit Pflanze im Deck ist das der Unterschied
    // zwischen einer laufenden und einer stehenden Rotation — der Spieler muss es ablesen können.
    expect(de["bar.stance.base"]).toMatch(/Grundfarbe/);
    expect(de["bar.stance.base.threshold"]).toMatch(/Grundfarbe/);
    for (const k of ["bar.stance.row", "bar.stance.row.active"]) {
      expect(de[k], `${k} erklärt die Grundfarbe nicht`).toMatch(/Grundfarbe der Karte, nicht die gefärbte/);
    }
  });

  it("jeder Text, den das Panel zieht, steht im Katalog", () => {
    const keys = [...code.matchAll(/t\("(bar\.stance\.[\w.]+)"/g)].map((m) => m[1]);
    expect(keys.length, "das Panel zieht gar keine Texte mehr").toBeGreaterThan(10);
    for (const k of new Set(keys)) expect(de[k], `${k} fehlt im Katalog`).toBeTruthy();
  });
});
