import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { NODES, RANKED_ARCHETYPES, rankedUnlocked, emptyProfile, unlockAllProfile } from "../src/game/progression.js";
import de from "../src/i18n/de.js";
import en from "../src/i18n/en.js";

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
     Desktop-Pass steht `min-[1400px]:max-w-none` dazwischen (ab 1400 px füllt die Werkstatt den
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

describe("#394 — Mainscreen: Rangliste-Schloss verschwindet bei Freischaltung", () => {
  /* #premium (18.08.2026) hatte den Knopf auf ZWEI Fassungen gestellt: Emoji bis 1399 px, Vektor ab
     1400 px. Seit dem Pokal-Tausch (#pokal) ist es wieder EINE — der Vektor gilt auf allen Breiten,
     die Emoji-Konstanten am Knopf sind entfallen. Der frühere Wortlaut-Test `rankedFree ? "🏆"`
     greift damit endgültig nicht mehr.
     Geprüft wird durch alle drei Fassungen hindurch dieselbe Absicht, und sie ist der Grund, warum
     es diesen Test gibt: das Schloss darf NUR im gesperrten Zustand erscheinen, entschieden von
     genau einem Ausdruck aus `rankedUnlocked`. Ein zweiter Codepfad wäre die Stelle, an der die
     Anzeige und die Freischaltung auseinanderlaufen können, ohne dass etwas rot wird. */
  it("StartScreen zeigt Pokal/Schloss zustandsabhängig aus rankedUnlocked", () => {
    const src = ui("StartScreen.jsx");
    expect(src).toContain("const rankedFree = rankedUnlocked(prof);"); // aus dem live gereichten `profile`-Prop
    // EIN Zeichen am Knopf, und es hängt am Zustand.
    expect(src).toMatch(/<RankIcon free=\{rankedFree\} \/>/);
    // Drinnen wählt derselbe Zustand zwischen genau zwei Formen — kein zweiter Pfad daneben.
    expect(src).toMatch(/free \? RANK_PATHS\.cup : RANK_PATHS\.lock/);
    // Die Emoji-Fassung des Knopfes ist weg und soll nicht zurückkommen.
    expect(src).not.toMatch(/EMO_RANK/);
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
  const storage = readFileSync(new URL("../src/game/storage.js", import.meta.url), "utf8");

  it("beide Seiten entscheiden über `lastRankedWeekSeed`", () => {
    expect(start, "StartScreen liest das Profilfeld nicht mehr").toContain("lastRankedWeekSeed");
    expect(storage, "storage.js schreibt das Profilfeld nicht mehr").toContain("lastRankedWeekSeed");
  });

  it("die Anzeige vergleicht gegen den Seed der LAUFENDEN Woche", () => {
    // Ohne currentWeek() wäre der Vergleich gegen irgendeinen Seed — und der Bonus verschwände nie wieder.
    expect(start).toMatch(/from "\.\.\/game\/weeklySeed\.js"/);
    expect(start).toMatch(/currentWeek\(new Date\(\)\)/);
    expect(start).toMatch(/weekBonusOpen\s*=\s*\(prof\.lastRankedWeekSeed \?\? null\) !== week\.seed/);
  });

  it("die Bonus-Zeile wird an weekBonusOpen gehängt, nicht dauerhaft gerendert", () => {
    expect(start).toMatch(/\{weekBonusOpen && \(/);
    expect(start).toContain('t("start.ranked.bonus"');
  });

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
describe("#370 — Freischalt-Text und Freischalt-Regel bleiben synchron", () => {
  it("es sind genau vier Archetypen — der Text nennt die Zahl ausgeschrieben", () => {
    // Kommt ein fünfter dazu, ist „der vier Archetypen" falsch und dieser Test der Anlass, ihn zu ändern.
    expect(RANKED_ARCHETYPES.length).toBe(4);
  });

  it("kein Text behauptet mehr einen Mono-Lauf je Archetyp", () => {
    for (const key of ["board.locked", "start.ranked.locked"]) {
      expect(de[key], `${key} nennt die Bedingung nicht mehr`).toMatch(/Archetypen/);
      expect(de[key], `${key} verspricht wieder „je ≥1 Lauf"`).not.toMatch(/je ≥1 Lauf/);
      expect(en[key]).toMatch(/archetypes/i);
    }
  });

  it("der Bestenlisten-Hinweis sagt, dass abgebrochene Läufe nicht zählen", () => {
    // `completed` ist state.cycle >= totalCycles — ein Abbruch schreibt den Zähler NICHT hoch.
    expect(de["board.locked"]).toMatch(/Abgebrochene Läufe zählen nicht/);
    expect(en["board.locked"]).toMatch(/Abandoned runs/i);
  });
});
