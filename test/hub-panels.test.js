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

describe("#394 — Mainscreen: Rangliste-Schloss verschwindet bei Freischaltung", () => {
  /* #premium (18.08.2026) hatte den Knopf auf ZWEI Fassungen gestellt: Emoji bis 1279 px, Vektor ab
     1280 px. Seit dem Pokal-Tausch (#pokal) ist es wieder EINE — der Vektor gilt auf allen Breiten,
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
    /* Drinnen wählt derselbe Zustand zwischen genau zwei Formen — kein zweiter Pfad daneben.
       Seit #pokal-eins wohnt das Zeichen in RankIcon.jsx statt im StartScreen: die Bestenliste trägt
       denselben Pokal (Kopf, Challenger-Reiter, Wochensieger-Zeilen), und zweimal abzeichnen hätte
       genau die Doppelpflege ergeben, vor der dieser Test an anderer Stelle warnt. Geprüft wird
       weiterhin die ABSICHT, nur jetzt an ihrer neuen Adresse. */
    expect(ui("RankIcon.jsx")).toMatch(/free \? RANK_PATHS\.cup : RANK_PATHS\.lock/);
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

/* ============================================================
   #bonus-benennen (19.08.2026) — die Wochen-Kachel nennt den Betrag.

   „Bonus noch offen" sagte nicht, was es zu holen gibt. Die zwei Beträge stehen in storage.js und
   werden interpoliert — stünden sie im Katalog, ließe ein Balancing-Schritt die Tafel still falsch
   werden (dieselbe Naht wie bei der Formations-Legende, s. #formlegend).
   ============================================================ */
describe("#bonus-benennen — Betrag aus der Quelle, nicht aus dem Katalog", () => {
  it("die Tafel rechnet mit den exportierten Konstanten", () => {
    const src = ui("StartScreen.jsx");
    expect(src).toMatch(/RANKED_WEEK_SP.*RANKED_WEEK_DP.*RANKED_WEEK_DP_FULL/s);
    expect(src).toMatch(/start\.board\.week\.bonus", \{ sp: RANKED_WEEK_SP, dp: RANKED_WEEK_DP \}/);
    expect(src).toMatch(/start\.board\.week\.bonus\.full", \{ dp: RANKED_WEEK_DP_FULL \}/);
  });

  it("keine der drei Zahlen steht in einem der beiden Kataloge", () => {
    for (const k of ["start.board.week.bonus", "start.board.week.bonus.full"])
      for (const cat of [de, en])
        expect(cat[k], `${k} hat eine feste Zahl`).not.toMatch(/\d/);
  });

  it("die Konstanten sind die, mit denen `recordRun` gutschreibt", async () => {
    /* Gegenprobe gegen ein Auseinanderlaufen von Anzeige und Gutschrift: die Rechnung im Profil
       darf keine eigenen Literale mehr führen. */
    const st = readFileSync(new URL("../src/game/storage.js", import.meta.url), "utf8");
    expect(st).toMatch(/rankedSpBonus = firstRankedThisWeek && !treeDone \? RANKED_WEEK_SP : 0/);
    expect(st).toMatch(/rankedDpBonus = firstRankedThisWeek \? \(treeDone \? RANKED_WEEK_DP_FULL : RANKED_WEEK_DP\) : 0/);
    const { RANKED_WEEK_SP, RANKED_WEEK_DP, RANKED_WEEK_DP_FULL } = await import("../src/game/storage.js");
    // Bei vollem Baum wird der SP-Anteil zu DP — der volle Betrag ist die Summe der beiden.
    expect(RANKED_WEEK_DP_FULL).toBe(RANKED_WEEK_SP + RANKED_WEEK_DP);
  });
});

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
