import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { phaseCard, PHASE_ACCENTS } from "../src/ui/modalStyle.jsx";

/* ============================================================
   #lv-ruhe (19.08.2026) — Perk- und Skill-Wahl im Desktop-Ton.

   Dieselbe Kur wie an der Werkstatt (#cz-ruhe), an den zwei Karten, die einen laufenden Stich
   unterbrechen: weniger Kontur, weniger Schein, klarere Rangfolge. Alle Griffe fallen still zurück —
   ein wieder leuchtender Rahmen, ein zurückgekehrter Halo oder eine wieder gefüllte Aktionsleiste sehen
   für sich genommen weiter „richtig" aus. Deshalb diese Ratsche.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("src/index.css");
const perk = read("src/ui/PerkSelect.jsx");
const skill = read("src/ui/SkillSelect.jsx");
const deskBlock = (() => {
  const at = css.indexOf("@media (min-width: 1400px) {");
  let depth = 0;
  for (let j = css.indexOf("{", at); j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(at, j + 1);
  }
  return "";
})();

describe("#lv-ruhe — die Karte ist EINE Fassung mit einem Schalter", () => {
  it("`quiet` nimmt Schein und Rahmenstärke zurück, laut bleibt der Default", () => {
    /* Gerechnet statt verglichen: die zwei Fassungen müssen sich in genau diesen drei Punkten
       unterscheiden — sonst ist der Schalter da und tut nichts. */
    const laut = phaseCard(PHASE_ACCENTS.red);
    const leise = phaseCard(PHASE_ACCENTS.red, undefined, { quiet: true });
    expect(laut.boxShadow, "die laute Fassung hat ihren farbigen Schein verloren").toMatch(/rgba\(224,85,85/);
    expect(leise.boxShadow, "die leise Fassung leuchtet noch").not.toMatch(/224,85,85/);
    expect(leise.boxShadow, "ohne Schlagschatten löst sich die Karte nicht mehr vom Brett").toMatch(/rgba\(0,0,0/);
    expect(laut.border).toMatch(/\.42\)/);
    expect(leise.border).toMatch(/\.18\)/);
    expect(leise.background, "der Lichtkegel am Kopf ist nicht schwächer").toMatch(/,\.06\)/);
  });

  it("beide Karten schalten am BREITEN-Gate, nicht am Flügel-Zustand", () => {
    /* Am Handy bleibt der kräftige Rahmen: dort steht die Karte auf kleinem Schirm über dem Brett und
       braucht die Ablösung. Der Flügel-Zustand darf das nicht mitentscheiden — sonst änderte Aufklappen
       die Optik der Karte. */
    expect(perk).toMatch(/phaseCard\(PHASE_ACCENTS\.red, undefined, \{ quiet: inWings \}\)/);
    expect(perk).toMatch(/const inWings = useIsWide\(\)/);
    expect(skill).toMatch(/phaseCard\(archAccent, undefined, \{ quiet: wide \}\)/);
    expect(skill).toMatch(/const wide = useIsWide\(\)/);
  });
});

describe("#lv-ruhe — Angebotskarten, Aktionsleiste, Score", () => {
  it("der Halo der Angebotskarten fällt weg — die Information bleibt im Badge und an der Kante", () => {
    expect(deskBlock).toMatch(/\.lv-offercard\s*\{[^}]*box-shadow:\s*none\s*!important/);
    /* Und weniger rund als am Handy: drei Karten in einer Reihe unter einem 14-px-Panel lesen sich mit
       12-px-Ecken als Pillen statt als Felder (Entscheidung des Users am Bild). */
    const r = deskBlock.match(/\.lv-offercard\s*\{([^}]*)\}/);
    const rad = (r[1].match(/border-radius:\s*(\d+)px/) || [])[1];
    expect(rad, "border-radius an der Angebotskarte fehlt").toBeTruthy();
    expect(Number(rad), "nicht eckiger als die Handy-Fassung (12 px)").toBeLessThan(12);
    for (const [f, src] of [["PerkSelect", perk], ["SkillSelect", skill]])
      expect(src, `${f}: die Angebotskarte trägt den Haken nicht`).toMatch(/lv-offercard as-edge-card/);
    /* `as-legendary` ist ausdrücklich NICHT stumm geschaltet: der animierte Goldrahmen IST die
       Seltenheits-Ansage und kommt ein-, zweimal je Lauf vor. */
    expect(deskBlock).not.toMatch(/\.as-legendary\s*\{[^}]*box-shadow:\s*none/);
  });

  it("die Trennlinie unter dem Namen zieht keinen Kasten (kurz, in der Kartenfarbe)", () => {
    const r = deskBlock.match(/\.lv-cardname::after\s*\{([^}]*)\}/);
    expect(r, ".lv-cardname::after nicht mehr gefunden").toBeTruthy();
    expect(r[1], "in currentColor, nicht in einem festen Grau").toMatch(/background:\s*currentColor/);
    expect(r[1], "eine Linie über die volle Breite wäre wieder ein Kasten").toMatch(/width:\s*\d\dpx/);
    for (const [f, src] of [["PerkSelect", perk], ["SkillSelect", skill]])
      expect(src, `${f}: der Name trägt den Haken nicht`).toMatch(/lv-cardname font-bold/);
  });

  it("die Aktionsleiste ist flach — AUSSER „Neu würfeln“, das behält seinen Rahmen", () => {
    /* Ausdrücklicher Wunsch des Users, und er hat eine Begründung: Neu würfeln ist die einzige Handlung
       der Leiste, die etwas KOSTET (ein Token) — sie darf sich vom Ausweg daneben abheben. */
    const flach = deskBlock.match(/\.lv-actbtn\s*\{([^}]*)\}/);
    expect(flach, ".lv-actbtn-Regel nicht mehr gefunden").toBeTruthy();
    expect(flach[1]).toMatch(/background:\s*none\s*!important/);
    expect(flach[1]).toMatch(/border:\s*0\s*!important/);
    const rr = deskBlock.match(/\.lv-actbtn-reroll\s*\{([^}]*)\}/);
    expect(rr, "der leichte Rahmen um „Neu würfeln“ ist weg").toBeTruthy();
    expect(rr[1]).toMatch(/border:\s*1px solid[^;]*!important/);
    // Beide Bildschirme müssen beide Haken tragen — sonst ist die Leiste je Phase anders.
    for (const [f, src] of [["PerkSelect", perk], ["SkillSelect", skill]]) {
      expect(src, `${f}: Reroll ohne Haken`).toMatch(/lv-actbtn lv-actbtn-reroll/);
      expect((src.match(/lv-actbtn/g) || []).length, `${f}: nicht beide Knöpfe verdrahtet`).toBeGreaterThanOrEqual(3);
    }
  });

  it("die Durchlauf-Score-Pille verliert ihre Fläche (Auskunft, kein Bedienelement)", () => {
    expect(deskBlock).toMatch(/\.lv-score\s*\{[^}]*background:\s*none\s*!important/);
    expect(perk).toMatch(/<RoundScoreBadge state=\{state\} className="lv-score" \/>/);
  });

  it("alles hängt am 1400er Block — die Handy-Fassung darf sich nicht bewegen", () => {
    const basis = css.slice(0, css.indexOf("@media (min-width: 1400px) {"));
    for (const k of ["lv-offercard", "lv-cardname", "lv-actbtn", "lv-score"])
      expect(basis, `${k} steht in der Basis und trifft damit auch das Handy`).not.toMatch(new RegExp(`\\.${k}\\s*\\{`));
  });
});

describe("#lv-ruhe — die Fraktionsreiter sind flach", () => {
  it("EIN Signal: die Unterstreichung in der Fraktionsfarbe", () => {
    /* Vorher trug jeder Reiter Fläche, Rahmen rundum, Radius und (aktiv) einen Schein — vier gerahmte
       Kästen über einem Angebot aus drei gerahmten Karten. `!important` durchgehend, weil Fläche,
       Rahmenton und Schein INLINE aus dem JSX kommen (`g.meta.color`) und Inline jedes Stylesheet schlägt. */
    const r = deskBlock.match(/\.sk-tab\s*\{([^}]*)\}/);
    expect(r, ".sk-tab-Regel nicht mehr gefunden").toBeTruthy();
    expect(r[1]).toMatch(/background:\s*none\s*!important/);
    expect(r[1]).toMatch(/box-shadow:\s*none\s*!important/);
    expect(r[1]).toMatch(/border-radius:\s*0\s*!important/);
    /* Die Unterkante bleibt ausgenommen — sie IST das Signal und trägt die Farbe der Fraktion.
       ENTSCHEIDEND: nur Breite und Stil, NICHT die Kurzform. `border-bottom: 2px solid !important` setzt
       die Farbe still auf `currentColor` zurück und schlägt damit den inline gesetzten Fraktionston —
       dann tragen alle vier Reiter dieselbe helle Linie und der aktive ist nicht mehr zu erkennen.
       (Genau so ist es beim ersten Anlauf passiert und am Bild aufgefallen.) */
    expect(r[1]).toMatch(/border-bottom-width:\s*2px\s*!important/);
    expect(r[1]).toMatch(/border-bottom-style:\s*solid\s*!important/);
    /* Gegen den KOMMENTARFREIEN Quelltext prüfen: die Begründung darüber nennt die verbotene Kurzform
       absichtlich beim Namen, und ein Greifer, der Kommentare mitliest, schlägt daran an (derselbe
       Fallstrick wie beim `as-ring`-Zähler in #fx-panel und bei der `ATTACK:`-Ratsche in #cube-takt). */
    expect(r[1].replace(/\/\*[\s\S]*?\*\//g, ""), "die Kurzform überschreibt die Fraktionsfarbe")
      .not.toMatch(/border-bottom:\s/);
    expect(read("src/ui/SkillSelect.jsx"), "die Fraktionsfarbe kommt nicht mehr inline")
      .toMatch(/borderBottomColor: on \? g\.meta\.color/);
  });
});

describe("#wing-ruhe — der linke Flügel: dünnere Rahmen, Fokus auf Zustand", () => {
  const grid = read("src/ui/CardGrid.jsx");

  it("der Schalter sitzt am Raster, nicht als zweite Kachel-Fassung", () => {
    /* EINE Kachel mit einem Schalter (Regel 1). Auf dem Brett ändert sich nichts — Default false. */
    expect(grid).toMatch(/quietFrames = false/);
    expect(grid, "der Rahmen hängt nicht am Schalter").toMatch(/border: `\$\{quietFrames \? 1 : 2\}px/);
    expect(read("src/ui/FormationPanel.jsx")).toMatch(/quietFrames=\{quietFrames\}/);
    expect(read("src/ui/LevelupWings.jsx"), "der Flügel setzt den Schalter nicht").toMatch(/<FormationPanel state=\{state\} glowBid=\{inspectBid\} quietFrames \/>/);
  });

  it("nur der FORMATIONS-Schein fällt — die Zustands-Scheine bleiben", () => {
    /* Gewählt · getippt · Gletscher · Gebäude sind selten und genau das, was man im Flügel sucht.
       Fiele der Schein pauschal, wäre die Kachel im Flügel zustandslos. */
    expect(grid).toMatch(/\(fb\.color && !fb\.dashed && !quietFrames\)/);
    // Reine Textsuche statt Regex — die Zeile enthält `?` und `"`; als Muster geschrieben erzeugte das
    // beim ersten Anlauf still den Fragezeichen-Quantifier, statt das Zeichen zu suchen.
    for (const zustand of ['picked ? "0 0 10px', 'selected ? "0 0 10px', 'glacier ? "0 0 8px'])
      expect(grid.includes(zustand), `Zustands-Schein ${zustand} ist mitgefallen`).toBe(true);
  });
});

describe("#lv-ruhe — Punkt 5: Haarlinie, kleinere Knöpfe, Stufung", () => {
  it("die Angebotskarte hat drei Haarlinien und EINE Farbkante", () => {
    const r = deskBlock.match(/\.lv-offercard\s*\{([^}]*border-top-color[^}]*)\}/);
    expect(r, "die Haarlinien-Regel fehlt").toBeTruthy();
    for (const seite of ["top", "right", "bottom"])
      expect(r[1], `border-${seite}-color fehlt`).toMatch(new RegExp(`border-${seite}-color`));
    /* `border-color` als Sammelangabe wäre der Fehler: sie griffe auch links durch und löschte das Signal. */
    expect(r[1], "border-color löscht die Farbkante links mit").not.toMatch(/border-color:/);
  });

  it("die Aktionsknöpfe sind so breit wie ihr Text, nicht halbe Kartenbreite", () => {
    /* Gemessen 1920 px: 113/132 px (Skill) und 113/102 px (Perk) statt zweier ~420-px-Balken. */
    expect(deskBlock).toMatch(/\.lv-actbtn\s*\{[^}]*flex:\s*0 1 auto\s*!important/);
  });

  it("die Stufung kommt aus dem NAMEN, nicht aus gekürztem Text", () => {
    /* Den Beschreibungstext zu kürzen oder zu klemmen wäre der Fehler aus #skilltext (14 von 21 Texten
       mitten im Satz abgeschnitten). Gestuft wird deshalb nach oben. */
    expect(deskBlock).toMatch(/\.lv-cardname\s*\{[^}]*letter-spacing/);
    expect(deskBlock, "die Beschreibung wird geklemmt").not.toMatch(/\.lv-offercard[^{]*\{[^}]*line-clamp/);
  });
});
