import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================
   #leg-gleich (19.08.2026) — die Legendär-Wahl läuft in der Bauform der Skill-Wahl.

   Sie war der letzte Auswahl-Screen mit eigener Bildsprache: eigene Kartenbreite, feste Goldschale,
   keine Flügel, keine gehaltenen Skills, keine Embleme. Weil sie direkt zwischen zwei Skill-Runden
   liegt, fiel genau das auf — dieselbe Handlung, zwei verschiedene Bildschirme.

   Angleichung heißt hier: DIESELBEN Bausteine, nicht nachgebaute. Genau daran hängt die Ratsche —
   ein zweiter, handgeschriebener Nachbau sähe am Tag des Baus richtig aus und liefe danach
   auseinander, ohne dass irgendwo etwas fehlt.
   ============================================================ */

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const leg = src("ui/LegendarySelect.jsx");
const skill = src("ui/SkillSelect.jsx");
const app = src("App.jsx");
const de = src("i18n/de.js");
const en = src("i18n/en.js");

describe("#leg-gleich — dieselben Bausteine wie die Skill-Wahl", () => {
  it("Flügel, gehaltene Skills und Embleme kommen aus den GETEILTEN Modulen", () => {
    for (const mod of ["LevelupWings.jsx", "HeldSkills.jsx", "skillArt.js"]) {
      expect(leg, `${mod} wird nicht benutzt`).toContain(mod);
      expect(skill, `${mod} ist in der Skill-Wahl verschwunden`).toContain(mod);
    }
    expect(leg).toMatch(/<LevelupRig accent=\{archAccent\.c\}/);
    expect(leg).toMatch(/<HeldSkills skills=\{skills\} state=\{state\} \/>/);
  });

  it("die Schale trägt die Archetyp-Farbe, nicht mehr das feste Gold", () => {
    /* `phaseCard(PHASE_ACCENTS.gold)` war die alte, feste Fassung. Der Ton kommt jetzt aus der
       gezeigten Fraktion und wechselt beim Blättern mit — wortgleich zur Skill-Wahl. */
    expect(leg).toMatch(/phaseCard\(archAccent, undefined, \{ quiet: wide \}\)/);
    expect(leg).toMatch(/<PhaseHairline accent=\{archAccent\}/);
    expect(leg, "die Schale steht wieder auf festem Gold").not.toMatch(/phaseCard\(PHASE_ACCENTS\.gold\)/);
  });

  it("die Karten behalten ihr Gold — das ist die eine Achse, die NICHT mitzieht", () => {
    /* Der Rahmen sagt „wo bin ich", das Gold der Karten „das hier ist die einmalige Wahl".
       Augenbraue und Titel gehören zu derselben Aussage und bleiben deshalb ebenfalls gold. */
    expect(leg).toMatch(/as-edge-card is-sel as-legendary/);
    expect(leg).toMatch(/style=\{\{ "--c": GOLD \}\}/);
    expect(leg, "der Titel ist nicht mehr gold").toMatch(/<h2[^>]*color: GOLD[^>]*>\{t\("leg\.title"\)\}/);
    expect(leg, "die Augenbraue ist nicht mehr gold").toMatch(/color: GOLD[^>]*>\{t\("leg\.eyebrow"\)\}/);
  });

  it("die Reiterzeile ab 1280 px ist dieselbe wie drüben, der Pager bleibt darunter", () => {
    for (const teil of ['className="sk-tabs mt-2 grid gap-2"', 'className="sk-tab text-left rounded-xl px-3 py-2.5']) {
      expect(leg, `fehlt in der Legendär-Wahl: ${teil}`).toContain(teil);
      expect(skill, `fehlt in der Skill-Wahl: ${teil}`).toContain(teil);
    }
    expect(leg).toMatch(/\{wide && nPages > 0 && curG &&/);
    expect(leg, "der Handy-Pager ist verschwunden").toMatch(/\{!wide && nPages > 1 && curG &&/);
  });

  /* UMGESCHRIEBEN, 23.08.2026 (mobile-tile-build). Die Aussage ist dieselbe geblieben — „die Legendär-
     Wahl macht es wie die Skill-Wahl" —, nur dass „es" jetzt zwei Fassungen sind. Der Wert dieses
     Tests liegt genau in dieser Gleichheit: die beiden Bildschirme teilen sich Reiterzeile, Emblem-Los
     und Kartenbau, und sie dürfen nicht auseinanderlaufen, weil einer von beiden vergessen wurde. */
  it("die Embleme hängen an denselben zwei Gates wie drüben", () => {
    expect(leg).toContain("const art = (wide || phone) ? skillArt(s.id) : null;");
    expect(leg).toContain("const phone = useIsPhone();");
    expect(leg).toContain('${art ? (wide ? " sk-offer-art" : " mc-tile") : ""}');
    expect(leg).toContain('className={wide ? "sk-strip" : "mc-emblem"}');
    expect(leg).toContain('alt="" aria-hidden="true"');
  });

  it("App.jsx reicht die sechs Props durch, ohne die die Flügel leer blieben", () => {
    const ruf = app.slice(app.indexOf("<LegendarySelect"));
    const tag = ruf.slice(0, ruf.indexOf("/>") + 2);
    for (const p of ["skills=", "options=", "onOption=", "currentTraj=", "recordTraj=", "best="])
      expect(tag, `${p} fehlt am Aufruf`).toContain(p);
  });
});

describe("#leg-gleich — der veraltete Hinweistext ist weg", () => {
  it("weder Text noch Schlüssel sind übrig", () => {
    /* Er behauptete, das Angebot komme „nur aus Fraktionen, in denen du schon aktive Skills hast".
       Seit #369 §5a ist der Pool ALLE freigeschalteten Archetypen — der Satz sagte also etwas
       Falsches, und das ist schlimmer als kein Satz. */
    expect(leg, "das Intro steht wieder im Screen").not.toMatch(/leg\.intro/);
    for (const [name, cat] of [["de", de], ["en", en]])
      expect(cat, `leg.intro.* steht noch im ${name}-Katalog`).not.toMatch(/"leg\.intro\./);
  });

  it("die Angebots-Regel im Motor ist als solche beschrieben", () => {
    /* Derselbe Irrtum stand als Kommentar in engine.js — wer ihn liest, baut den Satz wieder ein. */
    const engine = readFileSync(new URL("../src/game/engine.js", import.meta.url), "utf8");
    expect(engine).not.toMatch(/2 Legendäre aus aktiven Fraktionen/);
    expect(engine).toMatch(/ALLE freigeschalteten Archetypen/);
  });
});
