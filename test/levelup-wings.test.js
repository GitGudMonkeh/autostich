import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DESKTOP_BLOCK_AT } from "./desktopBreakpoint.js";

/* ============================================================
   #lv-fluegel — die zwei Seitenleisten der Level-up-Karte (Perk + Skill, ab 1280 px), als Ratsche.

   Das Projekt hat kein Component-Test-Setup; geprüft wird deshalb der Quelltext. Das ist hier mehr
   als Buchhaltung: JEDE der fünf Nähte unten ist eine, die BEIM BAUEN zugeschnappt ist, und alle fünf
   gehen STUMM kaputt — es kompiliert, es sieht auf den ersten Blick richtig aus, und der Fehler zeigt
   sich erst in einem Zustand, den man beim Klicken nicht zwangsläufig erwischt:

     1. Auto-Platzierung. Ohne ausdrückliches `grid-column` rutscht die Karte in Spur 1, sobald der linke
        Flügel zu ist — gemessen von 360 px auf 38 px, also an den Fensterrand. Mit beiden Flügeln offen
        sieht alles korrekt aus; der Fehler erscheint erst beim Zuklappen.
     2. `auto` als Mittelspur. Eine auto-Spur misst sich am INHALT, und der ist je Fraktion verschieden →
        die Karte wurde beim Zuklappen 880 → 784 px schmal. Fest heißt: in allen vier Zuständen dieselben
        Pixel.
     3. Die 22-px-Griffbahn. Der Griff sitzt auf `-22px`, freigehalten wird sie vom Rand der Karte. Wer
        einen der beiden Werte ändert, schiebt den Griff über den Kartentext — genau das, was hier nicht
        passieren darf.
     4. Fehlende Defaults. Ohne Eintrag in `DEFAULT_OPTIONS` schluckt der `{...DEFAULT_OPTIONS, ...o}`-
        Merge in `loadOptions` die zwei Schlüssel — der gemerkte Zustand überlebt den Reload nicht.
     5. Doppelte Deck-Daten. Deck-Stärke, Formationen und Build leben ab 1280 px NUR in den Flügeln; die
        gleichnamigen Klappfelder in der Karte hängen deshalb an der BREITE (`!wide`), nicht am Auf-/Zu-
        Zustand der Flügel. Andersherum wäre der Griff kein Schalter, sondern eine zweite Anordnung.

   Dazu die Regel, die die Handy-Fassung schützt: `.lv-rig` ist unterhalb von 1280 px `display: contents`,
   und Flügel wie Griffe hängen am `wide`-Gate — sie werden dort gar nicht gerendert.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("src/index.css");
const wings = read("src/ui/LevelupWings.jsx");

// Der große `@media (min-width: 1280px) { … }`-Block.
const deskBlock = (() => {
  const at = css.indexOf(DESKTOP_BLOCK_AT);
  if (at < 0) return "";
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return "";
})();
const base = deskBlock ? css.replace(deskBlock, "") : css;

describe("#lv-fluegel — unterhalb von 1280 px gibt es die Flügel nicht", () => {
  it(".lv-rig ist in der BASIS `display: contents` (die Karte bleibt direktes Kind des Overlays)", () => {
    const rule = base.match(/^[^{}\n]*\.lv-rig[^{}\n]*\{([^}]*)\}/m);
    expect(rule, "Basis-Regel für .lv-rig nicht mehr gefunden").toBeTruthy();
    expect(rule[1]).toMatch(/display:\s*contents/);
  });

  it("Flügel UND Griffe hängen am `wide`-Gate, werden am Handy also gar nicht gerendert", () => {
    expect(wings).toMatch(/const wide = useIsWide\(\)/);
    // Beide Flügel-Zustände beginnen mit `wide &&` …
    expect(wings).toMatch(/const deckOpen = wide &&/);
    expect(wings).toMatch(/const statsOpen = wide &&/);
    // … und die zwei Griffe stehen hinter demselben Gate.
    expect(wings.match(/\{wide && <Grip /g) || [], "beide Griffe brauchen das wide-Gate").toHaveLength(2);
  });
});

describe("#lv-fluegel — die Karte steht in allen vier Zuständen auf denselben Pixeln", () => {
  const rig = deskBlock.match(/\.lv-rig\s*\{([^}]*)\}/);

  /* #viewport-1280 / V1280-04 — UMGEDREHT, NICHT GELÖSCHT.

     Diese beiden Zusicherungen sicherten bis 2026-08-22, dass die Mittelspur FEST ist und exakt
     Kartenbreite + zweimal Griffbahn misst. Das war richtig, solange die Karte auf jeder Breite
     880 px behalten sollte. Gemessen hat es die Flügel bei 1280 auf 162 px gedrückt, wo sie 356
     wollen — auf der Perk-Wahl blieben 51 px für 166 px Text. Der Eigentümer hat entschieden, dass
     die Mitte nachgibt (V1280-04).

     Der SCHUTZZWECK bleibt derselbe und ist das Einzige, was zählt: die Karte darf nicht springen,
     wenn ein Flügel auf- oder zugeklappt wird. Der alte Weg dorthin war eine feste Zahl; der neue
     ist, dass keine Spur sich am INHALT misst. Genau das wird jetzt geprüft. */
  it("keine Spur misst sich am Inhalt — sonst springt die Karte beim Zuklappen", () => {
    expect(rig, ".lv-rig-Regel im Desktop-Block nicht mehr gefunden").toBeTruthy();
    const cols = rig[1].match(/grid-template-columns:\s*([^;]+);/);
    expect(cols, "grid-template-columns fehlt").toBeTruthy();

    /* `auto`, `min-content`, `max-content` und `fit-content` messen alle den Inhalt. Genau daran
       ist die erste Fassung gescheitert: die Karte wurde beim Zuklappen 880 → 784 px schmal. */
    expect(cols[1], "eine inhaltsgetriebene Spur holt das Springen zurück")
      .not.toMatch(/\b(auto|min-content|max-content|fit-content)\b/);

    /* Drei Spuren, und die mittlere nach oben gedeckelt — sie darf nachgeben, aber nie wachsen. */
    expect(cols[1], "erwartet drei Spuren mit gedeckelter Mitte").toMatch(/minmax\([^)]*\).*minmax\(0,\s*\d+px\).*minmax\([^)]*\)/);
  });

  it("die Mittelspur ist nach oben genau Kartenbreite + zweimal Griffbahn", () => {
    /* Der Deckel bleibt die alte feste Zahl: bei 1920 sieht die Karte aus wie immer. Nur darunter
       gibt die Spur nach. Gerechnet statt abgeschrieben — driftet die Karte, fällt das hier auf. */
    const cap = Number(rig[1].match(/minmax\(0,\s*(\d+)px\)/)[1]);
    const cardW = Number(deskBlock.match(/\.lv-cardwrap\s*\{[^}]*max-width:\s*(\d+)px/)[1]);
    const lane = Number(deskBlock.match(/\.lv-cardwrap\s*\{[^}]*margin:\s*0\s+(\d+)px/)[1]);
    expect(cap, `Deckel ${cap} ≠ ${cardW} + 2 × ${lane}`).toBe(cardW + 2 * lane);
  });

  it("die Flügelspuren haben einen Boden, und der ist nicht größer als die Wunschbreite", () => {
    /* Der Boden ist der ganze Zweck der Änderung: ohne ihn nimmt die 1fr-Spur, was übrig bleibt,
       und das waren bei 1280 gemessene 162 px. Er darf aber nicht über die Wunschbreite des
       Flügels hinausgehen — sonst wäre bei 1920 plötzlich der Boden die Breite und nicht mehr der
       Wunsch. */
    const boden = Number(rig[1].match(/clamp\(\s*(\d+)px/)[1]);
    const wunsch = Number(deskBlock.match(/\.lv-wing\s*\{[^}]*width:\s*(\d+)px/)[1]);
    expect(boden, "kein clamp-Boden auf den Flügelspuren").toBeGreaterThan(0);
    expect(boden, `Boden ${boden} über der Wunschbreite ${wunsch}`).toBeLessThanOrEqual(wunsch);
  });

  it("alle drei Spuren sind ausdrücklich zugewiesen (sonst greift die Auto-Platzierung)", () => {
    expect(deskBlock).toMatch(/\.lv-wing-l\s*\{[^}]*grid-column:\s*1/);
    expect(deskBlock).toMatch(/\.lv-cardwrap\s*\{[^}]*grid-column:\s*2/);
    expect(deskBlock).toMatch(/\.lv-wing-r\s*\{[^}]*grid-column:\s*3/);
  });

  it("die Griffe sitzen genau in der freigehaltenen Bahn, nicht auf dem Text", () => {
    const lane = Number(deskBlock.match(/\.lv-cardwrap\s*\{[^}]*margin:\s*0\s+(\d+)px/)[1]);
    const width = Number(deskBlock.match(/\.lv-grip\s*\{[^}]*width:\s*(\d+)px/)[1]);
    const l = Number(deskBlock.match(/\.lv-grip-l\s*\{[^}]*left:\s*-(\d+)px/)[1]);
    const r = Number(deskBlock.match(/\.lv-grip-r\s*\{[^}]*right:\s*-(\d+)px/)[1]);
    expect(width, "Griffbreite muss die Bahn genau füllen").toBe(lane);
    expect(l).toBe(lane);
    expect(r).toBe(lane);
  });
});

describe("#lv-fluegel — Zustand wird gemerkt, Daten stehen nicht doppelt", () => {
  it("beide Options-Schlüssel haben einen Eintrag in DEFAULT_OPTIONS", () => {
    const storage = read("src/game/storage.js");
    const defaults = storage.slice(storage.indexOf("const DEFAULT_OPTIONS = {"));
    for (const key of ["lvWingDeck", "lvWingStats"])
      expect(defaults, `${key} fehlt in DEFAULT_OPTIONS → loadOptions verschluckt ihn`)
        .toMatch(new RegExp(`\\b${key}:\\s*(true|false)`));
    // Die Namen im Modul müssen dieselben sein — sonst schreibt die UI an den Defaults vorbei.
    expect(wings).toMatch(/WING_DECK = "lvWingDeck"/);
    expect(wings).toMatch(/WING_STATS = "lvWingStats"/);
  });

  it("der Zustand liegt in den OPTIONEN, nicht in useState (die Karte wird je Level-up neu gemountet)", () => {
    /* Auf den AUFRUF prüfen, nicht auf das Wort — der Dateikopf erklärt genau diese Entscheidung.
       Der EINE erlaubte `useState` ist der Gebäude-Zeiger (#lv-gebaeude): der ist eine flüchtige Frage
       („wo liegt das?") und soll mit der Karte enden. Alles, was eine Gewohnheit ist, gehört in die
       Optionen — ein `useState` dafür wäre bei jeder Wahl wieder auf Default. */
    expect(wings.match(/useState\(/g) || [], "nur der Gebäude-Zeiger darf Komponenten-State sein").toHaveLength(1);
    expect(wings).toMatch(/const \[inspectBid, setInspectBid\] = useState\(null\)/);
    for (const k of ["WING_DECK", "WING_STATS", "WING_BUILDINGS"])
      expect(wings, `${k} liest nicht aus den Optionen`).toMatch(new RegExp(`options\\[${k}\\]`));
    expect(wings).toMatch(/onOption\(\{\s*\[key\]:\s*!on\s*\}\)/);
  });

  it("die Karte zeigt ab 1280 px keine Kontext-Klappfelder mehr — die leben in den Flügeln", () => {
    const perk = read("src/ui/PerkSelect.jsx");
    expect(perk).toMatch(/const inWings = useIsWide\(\);/);
    // Deck-Stärke, Formationen UND Build hängen am Gate.
    expect(perk).toMatch(/!inWings && \(\s*<CollapsibleField title=\{tr\("perk\.deckStrength"\)\}/);
    expect(perk.match(/!inWings &&/g) || [], "Deck-Stärke · Formationen · Build").toHaveLength(3);
    const skill = read("src/ui/SkillSelect.jsx");
    expect(skill).toMatch(/\{showFormations && !wide && \(/);
    // Und der Build steht im rechten Flügel, unter den Multiplikatoren.
    const railAt = wings.indexOf("<StatusRail");
    expect(railAt, "StatusRail nicht mehr im Flügel").toBeGreaterThan(0);
    expect(wings.slice(railAt), "PerkList muss UNTER der StatusRail stehen").toMatch(/<PerkList/);
  });

  it("die Haarlinie trägt die Identitätsfarbe der Phase, nicht mehr den festen Tri-Color-Verlauf", () => {
    /* Rahmen, Überschrift und Balken sagen jetzt dasselbe. `PhaseHairline` behält den alten Verlauf als
       Default — die übrigen Phasen (Legendär, Ziel, Gletscher, Aufstellung, Architekt) tragen ihn noch und
       sollen sich beim Umstellen dieser beiden nicht heimlich mitverändern. */
    expect(read("src/ui/modalStyle.jsx")).toMatch(/PhaseHairline\(\{ className = "", accent = null \}\)/);
    expect(read("src/ui/SkillSelect.jsx")).toMatch(/<PhaseHairline accent=\{archAccent\} \/>/);
    expect(read("src/ui/PerkSelect.jsx")).toMatch(/<PhaseHairline accent=\{PHASE_ACCENTS\.red\} \/>/);
  });

  it("die Karte hat ab 1280 px KEINE feste Höhe mehr — der Rahmen endet am Inhalt", () => {
    /* Am Handy ist die feste Höhe richtig (die zentrierte Karte sprang sonst beim Archetyp-Wechsel in
       Position UND Größe). Ab 1280 px ist die Karte die Mittelspur eines Rasters, dessen Höhe die höheren
       Flügel bestimmen — der Kopf steht also fest, und der Rahmen darf am Angebot enden statt in der ersten
       Skill-Runde einen halben Bildschirm Leere zu zeigen. `max-height` bleibt als Deckel. */
    const skill = read("src/ui/SkillSelect.jsx");
    expect(skill).toMatch(/height: wide \? undefined : "min\(92dvh, 760px\)"/);
    expect(skill).toMatch(/maxHeight: wide \? "min\(92dvh, 760px\)" : undefined/);
  });

  it("die Passiv-Beschreibung merkt sich ihren Zustand und startet zu", () => {
    const skill = read("src/ui/SkillSelect.jsx");
    // Kein Komponenten-State mehr: die Skill-Wahl wird je Phase neu gemountet.
    expect(skill, "openArch war der State, der jede Phase wieder zufiel").not.toMatch(/openArch/);
    expect(skill).toMatch(/const detailOpen = !!curG && !!options\.lvPassive;/);
    expect(skill).toMatch(/onOption\?\.\(\{ lvPassive: !detailOpen \}\)/);
    const storage = read("src/game/storage.js");
    const defaults = storage.slice(storage.indexOf("const DEFAULT_OPTIONS = {"));
    expect(defaults, "Default ZU — und ohne Eintrag verschluckt loadOptions den Schlüssel")
      .toMatch(/\blvPassive:\s*false/);
  });

  /* #held-merken (19.08.2026) — „Deine Skills" merkt sich auf BEIDEN Auswahl-Bildschirmen, ob es offen
     war. Dieselbe Naht wie die Passiv-Beschreibung darüber: die Karte wird je Phase neu gemountet, ein
     `useState` im Klappfeld stünde also bei jeder Wahl wieder auf Default. */
  it("„Deine Skills“ merkt sich seinen Zustand — in Perk- UND Skill-Wahl", () => {
    for (const f of ["src/ui/PerkSelect.jsx", "src/ui/SkillSelect.jsx"]) {
      const src = read(f);
      expect(src, `${f}: die Liste hängt nicht an den Optionen`)
        .toMatch(/open=\{options\.lvHeld \?\? true\} onToggle=\{\(v\) => onOption\?\.\(\{ lvHeld: v \}\)\}/);
    }
    const defaults = read("src/game/storage.js").slice(read("src/game/storage.js").indexOf("const DEFAULT_OPTIONS = {"));
    expect(defaults, "Default AUF — und ohne Eintrag verschluckt loadOptions den Schlüssel")
      .toMatch(/\blvHeld:\s*true/);
  });

  it("das Klappfeld bleibt EINE Fassung — gesteuert nur, wenn der Aufrufer es will", () => {
    /* Chronik, „Deck-Stärke" und „Dein Build" reichen die zwei Props NICHT herein und müssen ihren
       Zustand weiter selbst halten. Ein Feld, das den internen Pfad verliert, fiele dort bei jedem
       Rendern zu (bzw. ließe sich gar nicht mehr klappen). */
    const cf = read("src/ui/CollapsibleField.jsx");
    expect(cf, "der gesteuerte Pfad fehlt").toMatch(/const gesteuert = openProp != null && !!onToggle;/);
    expect(cf, "der interne Pfad ist weg — die ungesteuerten Aufrufer klappen nicht mehr")
      .toMatch(/setInnen\(\(o\) => !o\)/);
    const held = read("src/ui/HeldSkills.jsx");
    expect(held, "HeldSkills reicht die Steuerung nicht durch").toMatch(/open=\{open\} onToggle=\{onToggle\}/);
  });
});

describe("#sk-reiter — die Fraktionsreiter der Skill-Wahl", () => {
  const skill = read("src/ui/SkillSelect.jsx");

  it("der Reiter nennt Fraktion und Anzahl — keine Namensvorschau mehr", () => {
    /* Die Reiter zeigten anfangs die drei Skillnamen. Der längste Fall (Blitz) braucht 58 Zeichen DE /
       60 EN auf ~181 px Textbreite, wäre also zweizeilig — und war vor allem Unruhe. Bewusst entfernt;
       dieser Wächter hält fest, dass er nicht unbemerkt zurückkommt. */
    const skill = read("src/ui/SkillSelect.jsx");
    const tabAt = skill.indexOf('className="sk-tab');
    expect(tabAt).toBeGreaterThan(0);
    const tab = skill.slice(tabAt, tabAt + 900);
    expect(tab, "Namensvorschau ist zurück").not.toMatch(/skillDef\(id\)\?\.name/);
  });

  it("die Spaltenzahl kommt aus dem Angebot, nicht als feste Vier", () => {
    // `groups` filtert leere Fraktionen weg — es können 1 bis 4 sein.
    expect(skill).toMatch(/gridTemplateColumns: `repeat\(\$\{nPages\}/);
  });

  it("Reiter und Pager sind ZWEI Darstellungen desselben Zustands, nicht zwei Zustände", () => {
    // Der Reiter ruft dieselbe Funktion wie die Punkte-Zeile.
    expect(skill).toMatch(/className="sk-tab[^"]*"[\s\S]{0,400}?goTo\(i\)|goTo\(i\)[\s\S]{0,400}?className="sk-tab/);
    expect(skill, "kein zweiter Seiten-State neben pageState").not.toMatch(/useState\([^)]*\)\s*;\s*\/\/\s*tab/);
  });

  /* Die dritte Zusicherung zählte bis zum Rückbau des geführten Laufs die `data-tut="skill-offer"`-Anker
     (zwei Stück, je Zweig einer). Der Anker existiert nicht mehr; die Invariante schon. Sie hängt jetzt
     an den Zweigen selbst — GENAU EINER je Breite. Das ist auf dieser Achse eher strenger als vorher:
     `toMatch` ließ einen zweiten `{wide && …}`-Zweig durchgehen, `toHaveLength(1)` nicht. */
  it("nur EINE Navigation ist gerendert (sonst zwei Tab-Reihenfolgen)", () => {
    expect(skill.match(/\{wide && nPages > 0 && curG && \(/g) || [], "genau eine Desktop-Navigation")
      .toHaveLength(1);
    expect(skill.match(/\{!wide && nPages > 0 && curG && \(/g) || [], "genau eine Handy-Navigation")
      .toHaveLength(1);
  });

  // exp: „der Leitfaden bleibt erreichbar" stand hier — der Archetyp-Leitfaden ist mit dem Onboarding gegangen.

  it("das Angebot steht auf dem Desktop dreispaltig (drei Skills je Fraktion, kein Loch)", () => {
    expect(skill).toMatch(/className="sk-offers grid sm:grid-cols-2/);
    const offers = deskBlock.match(/\.sk-offers\s*\{([^}]*)\}/);
    expect(offers, ".sk-offers-Regel nicht mehr gefunden").toBeTruthy();
    expect(offers[1]).toMatch(/grid-template-columns:\s*repeat\(3/);
    /* Gleiche Kartenhöhen — dasselbe Mittel wie in der Legendär-Auswahl. BEIDE Zeilen sind nötig:
       `1fr` macht die ZEILE gleich hoch, aber das Angebotsraster trägt ein `items-start`, das die KARTE
       darin wieder auf Inhaltshöhe zöge. Wer nur eine der beiden entfernt, bekommt eine Regel, die
       aussieht, als täte sie etwas, und nichts tut. */
    expect(offers[1], "grid-auto-rows: 1fr fehlt (Legendär-Muster)").toMatch(/grid-auto-rows:\s*1fr/);
    expect(offers[1], "align-items: stretch fehlt — items-start gewinnt sonst").toMatch(/align-items:\s*stretch/);
    // exp skill rework: die Legendär-Auswahl, von der das Muster stammt, ist mit der Legendär-Phase gegangen.
  });
});

describe("#lv-fest — die Oberkante der Karte steht fest, sie wächst nur nach unten", () => {
  /* Gemeldet als zwei getrennte Fehler („springt beim Aufklappen links", „springt beim Archetyp-Wechsel"),
     es ist einer: das Overlay zentriert senkrecht, also hängt die OBERKANTE an der HÖHE des Inhalts.
     Gemessen bei 1536×791 (DPR 1,25), Skill-Wahl:
       Karte 540 px hoch, Flügel zu ................. y = 126
       linker Flügel auf (605 px, höher als die Karte) y =  93
       Passiv-Block auf (Karte 671 px) .............. y =  60
     Nach der Regel: y = 32 in ALLEN Kombinationen (4 Fraktionen × 4 Flügel-Zustände × Passiv auf/zu),
     Perk-Wahl ebenso. Der rechte Flügel war nie auffällig — er ist mit ~365 px kürzer als die Karte und
     ändert die Rasterhöhe darum gar nicht. */

  it("das Raster hat eine KONSTANTE Höhe — sonst wandert die Oberkante mit dem Inhalt", () => {
    const rig = deskBlock.match(/\.lv-rig\s*\{([^}]*)\}/);
    expect(rig, ".lv-rig-Regel im Desktop-Block nicht mehr gefunden").toBeTruthy();
    expect(rig[1], "min-height fehlt — die Zentrierung rechnet dann wieder mit der Inhaltshöhe")
      .toMatch(/min-height:\s*var\(--lv-h\)/);
    /* `align-items: start` ist die zweite Hälfte: ohne sie streckt sich die Karte auf die volle
       konstante Höhe, statt oben zu sitzen und nach unten zu wachsen. */
    expect(rig[1]).toMatch(/align-items:\s*start/);
  });

  it("der Höhen-Deckel steht EINMAL da (Karte, Flügel und Anker dürfen nicht auseinanderlaufen)", () => {
    expect(css, "--lv-h ist nicht mehr definiert").toMatch(/\.lv-rig\s*\{[^}]*--lv-h:\s*min\(92dvh,\s*760px\)/);
    const wing = deskBlock.match(/\.lv-wing\s*\{([^}]*)\}/);
    expect(wing, ".lv-wing-Regel nicht mehr gefunden").toBeTruthy();
    expect(wing[1], "der Flügel tippt den Deckel wieder selbst ab").toMatch(/max-height:\s*var\(--lv-h\)/);
  });

  it("die Regel steht im Desktop-Block — am Handy gibt es kein Raster, das sie tragen könnte", () => {
    /* Unterhalb 1280 px ist `.lv-rig` `display: contents`; ein min-height dort wäre wirkungslos und
       gleichzeitig irreführend. Die Handy-Karte hat ihre eigene feste Höhe (`min(92dvh, 760px)` inline). */
    const basis = css.slice(0, css.indexOf(DESKTOP_BLOCK_AT));
    expect(basis.match(/\.lv-rig\s*\{([^}]*)\}/)[1]).not.toMatch(/min-height/);
  });
});

describe("#sk-ablehnen — Reroll/Ablehnen sehen aus wie in der Perk-Wahl", () => {
  const skill = read("src/ui/SkillSelect.jsx");

  it("beide Knöpfe sind derselbe ActionButton wie in der Perk-Wahl, nicht nachgebaut", () => {
    /* `sk-actbtn` ist seit #lv-ruhe nicht mehr die einzige Klasse am Knopf (die flache Desktop-Optik
       kommt über `lv-actbtn` dazu) — deshalb auf den ANFANG des Klassenstrings prüfen, nicht auf ihn ganz. */
    expect(skill).toMatch(/<ActionButton kind="reroll" flex className="sk-actbtn\b/);
    expect(skill).toMatch(/<ActionButton kind="decline" flex className="sk-actbtn\b/);
    // Gegenprobe: keine handgeschriebene Kopie der Kanten-Optik mehr in der Aktionszeile.
    expect(skill, "as-edge-* von Hand — genau das war der sichtbare Unterschied")
      .not.toMatch(/className="as-edge-(strong|neutral) flex-1/);
    expect(read("src/ui/PerkSelect.jsx"), "das Vorbild benutzt die Sorten nicht mehr")
      .toMatch(/<ActionButton kind="decline" flex/);
  });

  it("unterhalb 1280 px sind nur die MASSE kleiner, nicht die Optik", () => {
    /* „Ablehnen → Perk" ist länger als das „Alle ablehnen" der Perk-Wahl: in den Standardmaßen braucht es
       gemessen 158 px, auf 375 px stehen 151 zur Verfügung — mit `whitespace-nowrap` liefe der Text aus
       dem Knopf. Mit dieser Regel: 133/151. Sie darf deshalb nur Größen setzen, keine Farben/Gewichte. */
    const m = css.match(/@media \(max-width: 1279.98px\) \{\s*\.sk-actbtn\s*\{([^}]*)\}/);
    expect(m, ".sk-actbtn-Regel nicht mehr gefunden").toBeTruthy();
    /* #typo-system S1: die Größe steht seit der Token-Migration nicht mehr als Zahl in der Regel,
       sondern als `var(--text-…)`. Der Wächter RECHNET sie deshalb aus dem @theme-Block nach, statt
       eine Schreibweise zu vergleichen — das ist die gemessene 12 px von oben, nur an ihrer neuen
       Quelle abgelesen, und es überlebt den nächsten Umbau der Schreibweise. */
    const tok = m[1].match(/font-size:\s*var\((--text-[a-z0-9-]+)\)/);
    expect(tok, "die Regel setzt keine Schriftgröße mehr").toBeTruthy();
    const theme = css.slice(css.indexOf("@theme"), css.indexOf("\n}", css.indexOf("@theme")));
    const val = theme.match(new RegExp(`${tok[1]}:\\s*([^;]+);`));
    expect(val, `${tok[1]} ist im @theme nicht definiert`).toBeTruthy();
    expect(val[1].trim(), "die 158→133 px Messung hängt an genau dieser Größe").toBe("12px");
    expect(m[1]).toMatch(/padding:/);
    expect(m[1], "Farbe/Gewicht gehören in die Sorte, nicht hierher").not.toMatch(/color|font-weight|background|border/);
  });
});

describe("#lv-gebaeude — die gewählten Gebäude als Ausklapp-Reiter im linken Flügel", () => {
  const wings = read("src/ui/LevelupWings.jsx");
  const panel = read("src/ui/FormationPanel.jsx");
  const arch = read("src/ui/ArchPanels.jsx");

  it("es ist DIESELBE Liste wie in Aufstellung und Chronik, kein Nachbau", () => {
    expect(wings).toMatch(/import \{ ArchBuildingList \} from "\.\/ArchPanels\.jsx"/);
    expect(wings).toMatch(/<ArchBuildingList bare buildings=\{buildings\}/);
    // Und die beiden Vorbilder müssen sie weiter benutzen — sonst hätte der Flügel die einzige Fassung.
    for (const f of ["src/ui/FormationPhase.jsx", "src/ui/ChronikOverview.jsx"])
      expect(read(f), `${f} rendert die geteilte Liste nicht mehr`).toMatch(/<ArchBuildingList /);
  });

  it("`bare` nimmt nur Kasten und Überschrift weg, nicht die EINTRÄGE", () => {
    /* Der Reiter trägt Titel und Zahl bereits — ein eigener Rahmen darin wäre ein Panel im Panel.
       Die Einträge liegen deshalb außerhalb der Schale, sie dürfen sich nicht verzweigen. */
    expect(arch).toMatch(/bare = false/);
    expect(arch.match(/buildings\.map\(/g) || [], "die Einträge sind dupliziert statt geteilt").toHaveLength(1);
  });

  it("Antippen erreicht das Brett — auch wenn der 🏗-Schalter aus ist", () => {
    /* Der Zweck der Liste ist der Zeiger aufs Brett. Läge das Einblenden allein am 🏗-Schalter, täte ein
       Antippen bei ausgeschaltetem Schalter sichtbar nichts — genau das, was der Kommentar an
       `ArchBuildingList` vom Aufrufer verlangt. */
    /* Auf den ZEIGER prüfen, nicht auf den ganzen Aufruf: seit #wing-ruhe steht dort zusätzlich
       `quietFrames`, und weitere Props sind zu erwarten. Wichtig ist, dass `glowBid` gesetzt wird. */
    expect(wings).toMatch(/<FormationPanel state=\{state\} glowBid=\{inspectBid\}/);
    expect(panel).toMatch(/const archOn = hasArch && \(showArch \|\| !!glowBid\)/);
    expect(panel, "das Brett bekommt den Zeiger nicht").toMatch(/glowBid=\{archOn \? glowBid : null\}/);
  });

  it("der REITER merkt sich seinen Zustand, der Zeiger nicht", () => {
    /* Auf/zu ist eine Gewohnheit und muss den Remount je Level-up überleben → Optionen (mit Eintrag in
       DEFAULT_OPTIONS, sonst schluckt der Merge in `loadOptions` den Schlüssel). `inspectBid` ist eine
       flüchtige Frage („wo liegt das?") und endet mit der Karte → useState. */
    expect(wings).toMatch(/export const WING_BUILDINGS = "lvWingBuildings"/);
    expect(wings).toMatch(/const buildOpen = !!options\[WING_BUILDINGS\]/);
    expect(wings).toMatch(/const \[inspectBid, setInspectBid\] = useState\(null\)/);
    expect(read("src/game/storage.js"), "ohne DEFAULT_OPTIONS-Eintrag wird der Schlüssel nie zurückgeschrieben")
      .toMatch(/lvWingBuildings:\s*false/);
  });

  it("ohne Gebäude gibt es den Reiter gar nicht", () => {
    expect(wings).toMatch(/\{buildings\.length > 0 && \(/);
  });

  it("die Beschriftung kommt aus dem Katalog, in beiden Sprachen", () => {
    expect(wings).toMatch(/t\("arch\.buildings"\)/);
    for (const cat of ["src/i18n/de.js", "src/i18n/en.js"])
      expect(read(cat), `arch.buildings fehlt in ${cat}`).toMatch(/"arch\.buildings":/);
  });
});
