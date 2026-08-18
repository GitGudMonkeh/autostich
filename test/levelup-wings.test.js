import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================
   #lv-fluegel — die zwei Seitenleisten der Level-up-Karte (Perk + Skill, ab 1400 px), als Ratsche.

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
     5. Doppelte Deck-Daten. Zeigt der linke Flügel Deck und Formationen, müssen die gleichnamigen
        Klappfelder IN der Karte weg (`deckWingOpen`), sonst steht dasselbe zweimal nebeneinander.

   Dazu die Regel, die die Handy-Fassung schützt: `.lv-rig` ist unterhalb von 1400 px `display: contents`,
   und Flügel wie Griffe hängen am `wide`-Gate — sie werden dort gar nicht gerendert.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("src/index.css");
const wings = read("src/ui/LevelupWings.jsx");

// Der große `@media (min-width: 1400px) { … }`-Block.
const deskBlock = (() => {
  const at = css.indexOf("@media (min-width: 1400px) {");
  if (at < 0) return "";
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return "";
})();
const base = deskBlock ? css.replace(deskBlock, "") : css;

describe("#lv-fluegel — unterhalb von 1400 px gibt es die Flügel nicht", () => {
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

  it("das Raster hat drei Spuren und die MITTLERE ist fest (nicht `auto`)", () => {
    expect(rig, ".lv-rig-Regel im Desktop-Block nicht mehr gefunden").toBeTruthy();
    const cols = rig[1].match(/grid-template-columns:\s*([^;]+);/);
    expect(cols, "grid-template-columns fehlt").toBeTruthy();
    expect(cols[1], "die Mittelspur darf nicht `auto` sein — sonst schrumpft die Karte beim Zuklappen")
      .not.toMatch(/\bauto\b/);
    expect(cols[1], "erwartet: 1fr · feste Breite · 1fr").toMatch(/minmax\(0,\s*1fr\).*\d+px.*minmax\(0,\s*1fr\)/);
  });

  it("die Mittelspur ist genau Kartenbreite + zweimal Griffbahn", () => {
    const track = Number(rig[1].match(/grid-template-columns:[^;]*?(\d+)px/)[1]);
    const cardW = Number(deskBlock.match(/\.lv-cardwrap\s*\{[^}]*max-width:\s*(\d+)px/)[1]);
    const lane = Number(deskBlock.match(/\.lv-cardwrap\s*\{[^}]*margin:\s*0\s+(\d+)px/)[1]);
    expect(track, `Spur ${track} ≠ ${cardW} + 2 × ${lane}`).toBe(cardW + 2 * lane);
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
    // Auf den AUFRUF prüfen, nicht auf das Wort — der Dateikopf erklärt genau diese Entscheidung.
    expect(wings, "ein useState wäre bei jeder Wahl wieder auf Default").not.toMatch(/useState\(/);
    expect(wings).toMatch(/onOption\(\{\s*\[key\]:\s*!on\s*\}\)/);
  });

  it("beide Screens lassen ihre Deck-Klappfelder weg, solange der Flügel sie zeigt", () => {
    expect(wings).toMatch(/export function deckWingOpen/);
    const perk = read("src/ui/PerkSelect.jsx");
    expect(perk).toMatch(/deckWingOpen\(options, useIsWide\(\)\)/);
    // Deck-Stärke UND Formationen hängen am Gate.
    expect(perk).toMatch(/!deckInWing && \(\s*<CollapsibleField title=\{tr\("perk\.deckStrength"\)\}/);
    expect(perk.match(/!deckInWing &&/g) || []).toHaveLength(2);
    const skill = read("src/ui/SkillSelect.jsx");
    expect(skill).toMatch(/deckWingOpen\(options, wide\)/);
    expect(skill).toMatch(/\{showFormations && !deckInWing && \(/);
  });
});

describe("#sk-reiter — die Fraktionsreiter der Skill-Wahl", () => {
  const skill = read("src/ui/SkillSelect.jsx");

  it("die Spaltenzahl kommt aus dem Angebot, nicht als feste Vier", () => {
    // `groups` filtert leere Fraktionen weg — es können 1 bis 4 sein.
    expect(skill).toMatch(/gridTemplateColumns: `repeat\(\$\{nPages\}/);
  });

  it("Reiter und Pager sind ZWEI Darstellungen desselben Zustands, nicht zwei Zustände", () => {
    // Der Reiter ruft dieselbe Funktion wie die Punkte-Zeile.
    expect(skill).toMatch(/className="sk-tab[^"]*"[\s\S]{0,400}?goTo\(i\)|goTo\(i\)[\s\S]{0,400}?className="sk-tab/);
    expect(skill, "kein zweiter Seiten-State neben pageState").not.toMatch(/useState\([^)]*\)\s*;\s*\/\/\s*tab/);
  });

  it("nur EINE Navigation ist gerendert (sonst zwei Tab-Reihenfolgen und zwei Tutorial-Ziele)", () => {
    expect(skill).toMatch(/\{wide && nPages > 0 && curG && \(/);
    expect(skill).toMatch(/\{!wide && nPages > 0 && curG && \(/);
    expect(skill.match(/data-tut="skill-offer"/g) || [], "der Tutorial-Mark darf nur einmal im Bild sein")
      .toHaveLength(2); // je Zweig einer — gerendert wird immer nur einer davon
  });

  it("der Leitfaden bleibt erreichbar (der i-Chip am Pager-Badge fällt auf dem Desktop weg)", () => {
    expect(skill).toMatch(/\{wide && \(\s*<button type="button" onClick=\{\(\) => setGuideArch\(curG\.arch\)\}/);
  });

  it("das Angebot steht auf dem Desktop dreispaltig (drei Skills je Fraktion, kein Loch)", () => {
    expect(skill).toMatch(/className="sk-offers grid sm:grid-cols-2/);
    expect(deskBlock).toMatch(/\.sk-offers\s*\{[^}]*grid-template-columns:\s*repeat\(3/);
  });
});
