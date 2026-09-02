import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

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

  /* Gesucht wird nur noch `w-full max-w-xl` statt der ganzen Kette bis `rounded-2xl`: seit dem
     Desktop-Pass steht `min-[1280px]:max-w-none` dazwischen (ab 1280 px füllt die Werkstatt den
     Bildschirm). Die Absicht des Tests ändert das nicht — die Karte soll auf JEDER Breite eine
     feste Größe haben statt mit dem Reiterinhalt zu springen; auf Desktop ist diese feste Größe
     eben der volle Rahmen. Die drei geprüften Eigenschaften gelten unverändert. */
  it("Deck-Werkstatt: die Karte wächst NICHT mehr mit dem Inhalt (flex-col + overflow-hidden)", () => {
    const card = ui("CustomizeScreen.jsx")
      .split("\n")
      .find((l) => l.includes("w-full max-w-xl"));
    expect(card).toBeTruthy();
    expect(card).toContain("flex flex-col");
    expect(card).toContain("overflow-hidden");
  });
});

/* ============================================================
   #370 — Wochen-Ecke an der Ranglisten-Kachel: Wochennummer + offener Wochenbonus.

   Die Anzeige hat bewusst KEINEN eigenen Zähler. Sie leitet „Bonus noch offen?" aus genau der Größe ab,
   die auch die Auszahlung entscheidet: `lastRankedWeekSeed` im Profil gegen den Seed der laufenden Woche
   (storage.js `recordRun` → `firstRankedThisWeek`). Genau deshalb kann die Anzeige nicht behaupten, es gäbe
   noch etwas zu holen, wenn die Bank schon gezahlt hat.

   Das ist eine Naht zwischen UI und Spiellogik, und Nähte reißen still: benennt jemand das Profilfeld um
   oder wechselt die Bonus-Regel auf einen anderen Anker, kompiliert beides weiter und die Anzeige lügt nur.
   ============================================================ */
describe("#370 — Wochenbonus-Anzeige hängt an derselben Größe wie die Auszahlung", () => {
  const start = ui("StartScreen.jsx");

  it("die Wochennummer steht im Badge, der CRT-Glow ist dort abgeschaltet", () => {
    // Press Start 2P + Glow überstrahlt die Ziffern; das Badge hebt den text-shadow lokal auf.
    expect(start).toMatch(/t\("start\.ranked\.badge", \{ n: week\.week \}\)/);
    expect(start).toMatch(/textShadow: "none"/);
  });
});

/* ============================================================
   #370 — die Freischalt-BESCHREIBUNG muss zur Freischalt-REGEL passen.

   Die alte Kurzfassung („je ≥1 Lauf beendet") legte einen Mono-Lauf je Archetyp nahe. Tatsächlich zählt
   recordRun jeden Archetyp, von dem der Spieler mindestens einen Skill hält — alle vier können in einem
   einzigen Lauf zusammenkommen. Solche Texte veralten still: die Regel ändert sich, der Satz bleibt.
   ============================================================ */
/* ============================================================
   #bonus-benennen (19.08.2026) — die Wochen-Kachel nennt den Betrag.

   „Bonus noch offen" sagte nicht, was es zu holen gibt. Die zwei Beträge stehen in storage.js und
   werden interpoliert — stünden sie im Katalog, ließe ein Balancing-Schritt die Tafel still falsch
   werden (dieselbe Naht wie bei der Formations-Legende, s. #formlegend).
   ============================================================ */
/* ============================================================
   #kpi-passt (19.08.2026) — die Zahl der Status-Tafel passt sich der Kachel an.

   Gemeldet mit „Letzter Lauf 179.077.04…": elf Zeichen brauchen bei 27 px rund 175 px, die Kachel hat
   innen 117–141 px — der Rest wurde vom `overflow: hidden` abgeschnitten, mitten in der Zahl.

   Die Regel rechnet statt zu raten, und genau das prüft dieser Wächter nach: der Teiler im CSS muss
   mindestens der gemessene Vorschub von Geist Mono sein (0,59 × Schriftgrad, für JEDES Zeichen gleich),
   sonst läuft die Zahl trotz Regel über. Und `container-type` muss stehen — ohne Container beziehen sich
   `cqw` auf einen Vorfahren weiter oben, die Rechnung wäre STUMM falsch.
   ============================================================ */
describe("#kpi-passt — der Wert bleibt in seiner Kachel", () => {
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  const VORSCHUB = 0.59; // gemessen (Geist Mono, alle Zeichen, headless im Produktionsbuild)

  it("die Kachel ist ein Container — sonst zeigt cqw woandershin", () => {
    expect(css).toMatch(/\.as-kpi \{ container-type: inline-size; \}/);
  });

  it("der Teiler hat Luft gegenüber dem gemessenen Vorschub", () => {
    const m = css.match(/\.as-kpi-v \{[\s\S]*?calc\(100cqw \/ \(var\(--kpi-n[^)]*\) \* ([\d.]+)\)\)/);
    expect(m, "die Fit-Regel ist nicht mehr auffindbar").toBeTruthy();
    expect(Number(m[1]), "der Teiler liegt unter dem Vorschub — die Zahl läuft weiter über")
      .toBeGreaterThanOrEqual(VORSCHUB);
  });

  it("der Deckel ist der bisherige Grad — kurze Werte ändern sich nicht", () => {
    expect(css).toMatch(/\.as-kpi-v \{[\s\S]*?min\(27px,/);
    expect(ui("StartScreen.jsx"), "der Grad steht nicht mehr am Element").toMatch(/as-kpi-v text-figure-1/);
  });

  it("die Zeichenzahl kommt aus dem JSX, nicht aus einer Schwelle", () => {
    expect(ui("StartScreen.jsx")).toMatch(/"--kpi-n": String\(s\.v \?\? ""\)\.length/);
  });

  it("die Wertzeile behält die Höhe des vollen Grades", () => {
    /* Sonst rückt die kleinere Zahl ihre Unterzeile mit nach oben (gemessen 4 px) und die vier
       Kacheln stehen nicht mehr auf einer Linie. */
    expect(css).toMatch(/\.as-kpi-v \{[\s\S]*?min-height: 27px;[\s\S]*?align-items: flex-end;/);
  });
});
